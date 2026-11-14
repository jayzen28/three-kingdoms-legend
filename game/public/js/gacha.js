/* 招募（茶館／酒館）、自動合成、出售、戰力計算 */
(function (SG) {
  var RAR = SG.RAR;
  var key = function (r, s) { return r + "-" + s; };
  var rIdx = function (r) { return RAR.indexOf(r); };

  function pickWeighted(rates) {
    var x = Math.random(), acc = 0, last;
    for (var k in rates) { acc += rates[k]; if (x < acc) return k; }
    return Object.keys(rates)[0];   // 機率加總不到 1 的零頭算最低階（原本誤算成最高階）
  }
  function poolFor(filter) {
    return SG.CARDS.filter(function (c) {
      if (!filter) return true;
      for (var k in filter) if (c[k] !== filter[k]) return false;
      return true;
    });
  }
  function pickCard(pool, rar, strongShare) {
    var has = pool.filter(function (c) { return c.vers.indexOf(rar) >= 0; });
    if (!has.length) return null;
    if (strongShare != null && (rar === "N" || rar === "R" || rar === "SR")) {
      var st = has.filter(function (c) { return c.strong && !c.ur; }), nm = has.filter(function (c) { return !c.strong; });
      if (st.length && nm.length) has = Math.random() < strongShare ? st : nm;
    }
    return has[Math.floor(Math.random() * has.length)];
  }

  // 加入一張卡（不自動合成；合成由玩家按「合成／一鍵合成」，✅ Jay 2026-11-13）
  function addCard(S, card, rar) {
    var res = { merges: 0, toSurplus: false };
    if (S.capped[card.id]) { S.surplus[rar]++; res.toSurplus = true; return res; }
    var inv = S.inv[card.id] || (S.inv[card.id] = {});
    var k = key(rar, card.ur ? 6 : 1);
    inv[k] = (inv[k] || 0) + 1;
    return res;
  }
  // 這位武將現在能不能合成（有兩張同稀有度同星，且還沒到頂）
  SG.canMerge = function (S, cardId) {
    var card = SG.CARD_BY_ID[cardId], inv = S.inv[cardId]; if (!inv || S.capped[cardId]) return false;
    return Object.keys(inv).some(function (k) { return inv[k] >= 2 && k !== key(card.cap[0], card.cap[1]); });
  };
  // 合成一位武將：兩張同稀有度同星 → 下一星；兩張 6★ → 下一稀有度 1★；一路合到不能再合
  SG.mergeCard = function (S, cardId) {
    var card = SG.CARD_BY_ID[cardId], inv = S.inv[cardId], cap = card.cap, n = 0;
    if (!inv || S.capped[cardId]) return null;
    var from = SG.best(S, cardId), again = true;
    while (again) {
      again = false;
      RAR.forEach(function (r) {
        for (var s = 1; s <= 6; s++) {
          var k = key(r, s);
          while (inv[k] >= 2 && !(r === cap[0] && s === cap[1])) {
            inv[k] -= 2; if (!inv[k]) delete inv[k];
            var nr = s === 6 ? RAR[rIdx(r) + 1] : r, ns = s === 6 ? 1 : s + 1, nk = key(nr, ns);
            inv[nk] = (inv[nk] || 0) + 1; n++; again = true;
          }
        }
      });
    }
    if (!n) return null;
    if (inv[key(cap[0], cap[1])] >= 1) {
      S.capped[cardId] = true;
      Object.keys(inv).forEach(function (k) {       // 到頂：其餘殘卡轉出售區
        var c = inv[k], rr = k.split("-")[0];
        if (k === key(cap[0], cap[1])) { if (c > 1) S.surplus[rr] += c - 1; inv[k] = 1; }
        else { S.surplus[rr] += c; delete inv[k]; }
      });
    }
    SG.Daily.bump(S, "merges", n);
    return { card: card, merges: n, from: from, to: SG.best(S, cardId), capped: !!S.capped[cardId] };
  };
  // 一鍵合成：隊伍裡的武將不合（includeTeam 為真才合），回傳合成結果與被擋下的武將
  SG.mergeAll = function (S, includeTeam) {
    var out = { merges: 0, list: [], blocked: [] };
    SG.CARDS.forEach(function (c) {
      if (!SG.canMerge(S, c.id)) return;
      if (!includeTeam && S.team.indexOf(c.id) >= 0) { out.blocked.push(c); return; }
      var r = SG.mergeCard(S, c.id); if (r) { out.merges += r.merges; out.list.push(r); }
    });
    return out;
  };

  // 武將目前最佳卡
  SG.best = function (S, cardId) {
    var inv = S.inv[cardId]; if (!inv) return null;
    var best = null;
    Object.keys(inv).forEach(function (k) {
      if (!inv[k]) return;
      var p = k.split("-"), r = p[0], s = +p[1];
      if (!best || rIdx(r) > rIdx(best.rar) || (r === best.rar && s > best.star)) best = { rar: r, star: s };
    });
    return best;
  };
  // 招募
  SG.Gacha = {
    tea: function (S, house, n, useTickets) {
      var cost = useTickets ? 0 : n * SG.TEA_COST;
      if (useTickets) { if (S.tickets < n) return { err: "抽券不足" }; S.tickets -= n; }
      else { if (S.copper < cost) return { err: "銅錢不足" }; S.copper -= cost; }
      var pool = poolFor(house.filter);
      var rates = Object.assign({}, SG.TEA_RATES);
      if (house.series) { rates.N += rates.SR - SG.SERIES_SR; rates.SR = SG.SERIES_SR; }
      return roll(S, pool, rates, n, SG.TEA_STRONG_SHARE, "teaPulls");
    },
    tavern: function (S, n) {
      var cost = SG.TAVERN_COST[n];
      if (S.yuanbao < cost) return { err: "元寶不足" };
      S.yuanbao -= cost;
      return roll(S, SG.CARDS, SG.TAVERN_RATES, n, 0.15, "tavernPulls");
    },
    sellSurplus: function (S) {
      var total = 0, cnt = 0;
      RAR.forEach(function (r) { total += S.surplus[r] * SG.SELL[r]; cnt += S.surplus[r]; S.surplus[r] = 0; });
      S.copper += total;
      if (cnt) SG.Daily.bump(S, "sells", 1);
      return { total: total, cnt: cnt };
    },
  };

  function roll(S, pool, rates, n, strongShare, counterKey) {
    var out = { n: n, byRar: { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 }, hits: [], all: [], merges: 0, newCards: 0, surplus: 0 };
    for (var i = 0; i < n; i++) {
      var rar = pickWeighted(rates);
      var card = pickCard(pool, rar, strongShare);
      if (!card) { rar = "N"; card = pickCard(pool, "N", strongShare) || pickCard(pool, "R", strongShare); if (!card) continue; rar = card.vers[0]; }
      var isNew = !S.inv[card.id] && !S.capped[card.id];
      var r = addCard(S, card, rar);
      out.byRar[rar]++; out.merges += r.merges; if (r.toSurplus) out.surplus++;
      if (isNew) out.newCards++;
      out.all.push({ card: card, rar: rar, isNew: isNew });
      if (rIdx(rar) >= 2) out.hits.push({ card: card, rar: rar });
    }
    SG.Daily.bump(S, counterKey, n);
    return out;
  }

  // 新手：送 10 名 1★
  // 新手禮：一般茶館免費抽 100 次（不算進每日任務），再用抽到的武將自動編隊
  SG.giveStarter = function (S) {
    if (S.starter) return null;
    var keep = JSON.stringify(S.daily.counts);
    var r = roll(S, poolFor(null), SG.TEA_RATES, SG.STARTER_PULLS, SG.TEA_STRONG_SHARE, "teaPulls");
    r.merges = SG.mergeAll(S, true).merges;      // 新手禮直接幫玩家合好
    S.daily.counts = JSON.parse(keep);
    S.starter = true;
    SG.autoTeam(S);
    return r;
  };
  // 存檔搬遷：改成只有 UR 的武將，舊的一般版卡退回賣價（★）
  SG.migrate = function (S) {
    var back = 0;
    SG.CARDS.forEach(function (c) {
      if (!c.urOnly || !S.inv[c.id]) return;
      var inv = S.inv[c.id];
      Object.keys(inv).forEach(function (k) { var r = k.split("-")[0]; if (r !== "UR") { back += SG.SELL[r] * inv[k]; delete inv[k]; } });
      if (!Object.keys(inv).length) { delete S.inv[c.id]; delete S.capped[c.id]; S.team = S.team.filter(function (id) { return id !== c.id; }); }
    });
    S.copper += back; return back;
  };
  // ★ 測試期：每個存檔送一張孫權·碧眼 UR，讓大家看得到分層立繪（開發加的，Jay 可拿掉）
  SG.giftOnce = function (S) {
    if (S.giftSQ) return false; var c = SG.CARDS.filter(function (x) { return x.art === "sunquan_ur"; })[0]; if (!c) return false;
    addCard(S, c, "UR"); S.giftSQ = 1; return true;
  };
  // 教學卡：五種兵種各一張 N 卡，直接編成隊伍
  SG.giveTutorial = function (S) {
    if (S.tut || S.starter) return false;
    SG.TUTORIAL_CARDS.forEach(function (n) { addCard(S, SG.GEN[n], "N"); });
    S.team = SG.TUTORIAL_CARDS.map(function (n) { return SG.GEN[n].id; });
    S.tut = true; return true;
  };
  // 一鍵最強編隊（不可同名）
  SG.autoTeam = function (S) {
    var list = SG.CARDS.map(function (c) { var b = SG.best(S, c.id); return b ? { c: c, p: SG.power(c, b) } : null; })
      .filter(Boolean).sort(function (a, b) { return b.p - a.p; });
    var team = [], used = {};
    list.forEach(function (x) { if (team.length < 10 && !used[x.c.gen]) { team.push(x.c.id); used[x.c.gen] = 1; } });
    S.team = team;
  };

  // 出戰隊伍 → 戰場單位
  SG.teamUnits = function (S) {
    return S.team.map(function (id) {
      var c = SG.CARD_BY_ID[id], b = SG.best(S, id), u = SG.unitStats(c, b.rar, b.star);
      return { name: c.gen, typ: c.typ, elem: c.elem, rar: b.rar, star: b.star, hp: u.hp, w: u.w, z: u.z, m: u.m, am: u.am, asp: u.asp, cardId: id, art: c.art, named: true };
    });
  };
  // 隊伍平均魅力與招降率
  SG.teamCharm = function (S) {
    if (!S.team.length) return 0;
    var sum = 0; S.team.forEach(function (id) { var c = SG.CARD_BY_ID[id], b = SG.best(S, id); sum += SG.unitStats(c, b.rar, b.star).m; });
    return sum / S.team.length;
  };
  // 戰後招降：每名被擊敗的有名敵將各擲一次，成功得到她的 N 卡
  SG.recruit = function (S, fallenNames) {
    var p = SG.teamCharm(S) * SG.F.REC, got = [];
    fallenNames.forEach(function (nm) {
      var c = SG.GEN[nm]; if (!c || c.ur) return;   // UR 只能招募取得
      if (Math.random() < p) { addCard(S, c, "N"); got.push(c); }
    });
    S.recruited = (S.recruited || 0) + got.length;
    return { p: p, got: got };
  };

  // 每日任務
  SG.Daily = {
    bump: function (S, k, n) { SG.Store.rollDaily(S); S.daily.counts[k] = (S.daily.counts[k] || 0) + n; },
    status: function (S) {
      SG.Store.rollDaily(S);
      var done = 0;
      var list = SG.DAILY.map(function (t) {
        var cur = S.daily.counts[t.key] || 0, ok = cur >= t.need, cl = !!S.daily.claimed[t.id];
        if (cl) done++;
        return { t: t, cur: Math.min(cur, t.need), ok: ok, claimed: cl };
      });
      return { list: list, done: done };
    },
    claim: function (S, id) {
      var st = SG.Daily.status(S).list.find(function (x) { return x.t.id === id; });
      if (!st || !st.ok || st.claimed) return 0;
      S.daily.claimed[id] = true; S.copper += st.t.reward; return st.t.reward;
    },
    claimChest: function (S, i) {
      var c = SG.ACTIVITY_CHESTS[i], done = SG.Daily.status(S).done;
      if (done < c.need || S.daily.chests[i]) return 0;
      S.daily.chests[i] = true; S.copper += c.reward; return c.reward;
    },
  };
})(window.SG);
