/* 鬥將模式：規則引擎＋電腦對手（畫面在 duel-ui.js）
   規則骨架參考 UNION ARENA：後陣產軍餉（不消耗，只比數量）、出牌付軍令（每回合重置，最多 3 道）、
   後陣的武將可以移上前陣（多一個打手＝少一份軍餉）、前陣進攻對方城門、對方可以格擋、城門被破時翻開看急報。
   ✅ Jay 2026-11-20：格擋會扣兵力（扣到回合結束，結束後補滿）；受傷的武將還能繼續格擋；進攻方也會被反扣。 */
(function (SG) {
  var D = SG.DUEL;
  var uid = 0;
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function expand(deck) { var out = []; Object.keys(deck).forEach(function (k) { var d = D.CARD[k] || D.ITEM[k]; if (d) for (var i = 0; i < deck[k]; i++) out.push(d); }); return out; }
  function nonNation(t) { return D.NATIONS.indexOf(t) < 0; }
  function shareTag(a, b, nation) { return !b.item && a.tags.some(function (t) { return (nation || nonNation(t)) && b.tags.indexOf(t) >= 0; }); }
  function unit(d) { return { id: ++uid, d: d, act: false, fresh: true, buf: 0, dmg: 0, atk: 0, extra: 0 }; }

  D.newGame = function (deckA, deckB, opt) {
    opt = opt || {};
    var rnd = opt.rnd || Math.random;
    var mk = function (deck, who) { return { who: who, deck: shuffle(expand(deck), rnd), hand: [], life: [], front: [], back: [], side: [], ap: 0, apMax: 0, t: 0 }; };
    var G = { p: [mk(deckA, 0), mk(deckB, 1)], rnd: rnd, turn: 0, cur: 0, phase: "main", winner: -1, logs: [], pending: null, queue: [], human: opt.human === undefined ? 0 : opt.human, stats: { kills: 0, hits: 0 } };
    G.first = opt.first !== undefined ? opt.first : (rnd() < 0.5 ? 0 : 1);
    G.cur = G.first;
    G.p.forEach(function (P) { P.hand = P.deck.splice(0, D.HAND); P.life = P.deck.splice(0, D.LIFE); });
    G.log = function (t) { G.logs.push(t); if (G.logs.length > 80) G.logs.shift(); if (G.onLog) G.onLog(t); };
    return G;
  };
  D.mulligan = function (G, who) { var P = G.p[who]; P.deck = shuffle(P.deck.concat(P.hand), G.rnd); P.hand = P.deck.splice(0, D.HAND); P.mull = true; };
  D.noZero = function (P) { return !P.hand.some(function (c) { return !c.item && c.cost === 0; }); };
  var nm = function (G, who) { return who === G.human ? "我方" : "敵方"; };

  // ===== 數值 =====
  D.energy = function (P) {   // eb：軍糧這回合多的軍餉；屯糧：在場上每位 +2（✅ Jay 2026-11-21，不累積）
    return P.back.reduce(function (a, u) { return a + u.d.gen; }, 0) + (P.eb || 0) + 2 * D.field(P).filter(function (u) { return u.d.skill === "屯糧"; }).length;
  };
  D.field = function (P) { return P.front.concat(P.back); };
  D.setDone = function (P, tag) { var s = D.setInfo(P, tag); return s.n === s.size; };
  // 湊齊：場上（前後陣都算）有幾位不同的成員、現在的加成
  D.setInfo = function (P, tag) {
    var names = D.SET_TAGS[tag].split(" ").filter(function (n) { return D.CARD[n]; });
    var on = D.field(P).map(function (u) { return u.d.name; });
    var got = names.filter(function (n) { return on.indexOf(n) >= 0; });
    var tier = D.SET_TIER[names.length] || {}, bonus = 0;
    Object.keys(tier).forEach(function (k) { if (got.length >= +k) bonus = Math.max(bonus, tier[k]); });
    return { tag: tag, size: names.length, n: got.length, bonus: bonus, names: names, got: got };
  };
  D.setBonus = function (P, d) {   // 一位武將屬於好幾組時，取最高那組（不疊加）★
    var b = 0; d.tags.forEach(function (t) { if (D.SET_TAGS[t]) b = Math.max(b, D.setInfo(P, t).bonus); }); return b;
  };
  // 滿血兵力（含加成）
  D.bp = function (P, u, blocking) {
    var bp = u.d.bp + (u.buf || 0), all = D.field(P);
    if (u.d.skill === "結義") bp += 500 * Math.min(3, all.filter(function (v) { return v !== u && shareTag(u.d, v.d); }).length);
    if (u.d.tags.indexOf("吳") >= 0 && all.some(function (v) { return v.d.name === "孫權"; })) bp += 500 * Math.min(3, all.filter(function (v) { return v.d.tags.indexOf("吳") >= 0; }).length);
    bp += D.setBonus(P, u.d);
    if (blocking && u.d.skill === "鐵壁") bp += 1000;
    return bp;
  };
  // 目前兵力（扣掉這回合受的傷）
  D.hp = function (P, u, blocking) { return Math.max(0, D.bp(P, u, blocking) - (u.dmg || 0)); };
  D.canPlay = function (G, who, d) {
    var P = G.p[who];
    if (G.winner >= 0 || G.cur !== who || G.pending) return false;
    if (d.item) return D.canItem(G, who, d);
    if (G.phase !== "main") return false;
    if (P.ap < d.ap || D.energy(P) < d.cost) return false;
    if (d.name === "張遼") return P.front.length < D.FRONT;
    return P.front.length < D.FRONT || P.back.length < D.BACK;
  };
  D.canSwap = function (G, who, d) {   // 陣前換將：付費、前陣要有人；進攻後也可以
    var P = G.p[who];
    return !d.item && d.skill === "陣前換將" && G.cur === who && !G.pending && G.winner < 0 && P.front.length > 0 && P.ap >= d.ap && D.energy(P) >= d.cost;
  };

  // ===== 抽牌（幻術在這裡觸發） =====
  function draw(G, P, quiet) {
    if (!P.deck.length) { G.winner = 1 - P.who; G.log(nm(G, P.who) + "牌組抽光了"); return false; }
    var c = P.deck.shift(); P.hand.push(c);
    if (!quiet && !c.item && c.skill === "幻術" && G.live) {
      fx(G, P.who, c); G.log("　幻術：" + nm(G, P.who) + "抽到 " + c.name + "，再抽 2 張、放回 2 張");
      draw(G, P, true); draw(G, P, true);
      if (P.who === G.human || G.both) G.queue.push({ type: "illusion", who: P.who });
      else aiReturn(G, P, 2);
      settle(G);
    }
    return true;
  }
  function aiReturn(G, P, n) {
    for (var i = 0; i < n && P.hand.length; i++) {
      var e = D.energy(P), k = P.hand.map(function (c, j) { return [(c.item ? 0 : c.cost > e + 1 ? 100 + c.cost : -c.bp / 1000), j]; }).sort(function (a, b) { return b[0] - a[0]; })[0][1];
      P.deck.push(P.hand.splice(k, 1)[0]);
    }
  }
  D.chooseReturn = function (G, idxs) {
    var pd = G.pending; if (!pd || pd.type !== "illusion") return;
    var P = G.p[pd.who];
    idxs.slice().sort(function (a, b) { return b - a; }).forEach(function (i) { if (P.hand[i]) P.deck.push(P.hand.splice(i, 1)[0]); });
    G.pending = null; settle(G);
  };
  // 把排隊中要玩家決定的事放進 pending
  function settle(G) { if (!G.pending && G.queue.length) G.pending = G.queue.shift(); }

  // ===== 回合 =====
  D.startTurn = function (G) {
    var P = G.p[G.cur]; P.t++; G.turn++; G.phase = "main"; G.live = true; G.p[0].eb = 0; G.p[1].eb = 0; P.nplay = 0;
    D.field(P).forEach(function (u) { if (u.frozen) u.frozen = false; else u.act = true; u.atk = 0; u.extra = 0; u.moved = false; u.fresh = false; });
    D.field(G.p[1 - G.cur]).forEach(function (u) { u.guard = false; });
    P.apMax = G.cur === G.first ? Math.min(3, P.t) : (P.t <= 2 ? 2 : 3);
    if (P.seal) { P.apMax = Math.min(P.apMax, 2); P.seal = false; G.log("　玉璽：" + nm(G, P.who) + "這回合只有 2 道軍令"); }
    P.ap = P.apMax;
    if (!(G.cur === G.first && P.t === 1)) { if (!draw(G, P)) return; }
    if (D.field(P).some(function (u) { return u.d.name === "董卓"; }) && P.hand.length) {
      fx(G, P.who, D.CARD["董卓"]); var k = Math.floor(G.rnd() * P.hand.length); G.log("董卓「暴政」：" + nm(G, P.who) + "丟掉 " + P.hand[k].name); P.side.push(P.hand.splice(k, 1)[0]);
    }
  };
  D.endTurn = function (G) {
    if (G.winner >= 0 || G.pending) return;
    var P = G.p[G.cur];
    D.field(P).forEach(function (u) { if (!u.frozen) u.act = true; });
    G.p.forEach(function (Q) { D.field(Q).forEach(function (u) { u.dmg = 0; u.buf = 0; u.saved = false; }); });   // 回合結束：補滿兵力、這回合的加成消失
    while (P.hand.length > D.HAND_MAX) P.side.push(P.hand.pop());
    G.cur = 1 - G.cur;
    D.startTurn(G);
  };

  // ===== 出牌、移動、多抽、陣前換將 =====
  D.play = function (G, who, handIdx, zone, tid) {   // tid：策反指定的敵方前陣武將（沒給就自動挑兵力最高的）
    var P = G.p[who], d = P.hand[handIdx];
    if (!d || d.item || !D.canPlay(G, who, d)) return false;
    if (d.name === "張遼") zone = "front";
    if (zone === "front" && P.front.length >= D.FRONT) zone = "back";
    if (zone === "back" && P.back.length >= D.BACK) zone = "front";
    P.hand.splice(handIdx, 1); P.ap -= d.ap; P.nplay = (P.nplay || 0) + 1;
    var u = unit(d);
    if (zone === "front" && (d.skill === "突擊" || d.name === "張遼")) { u.act = true; fx(G, who, d); }
    if (d.name === "張遼") u.noblock = G.turn;
    P[zone].push(u);
    G.log(nm(G, who) + "出陣 " + d.name + "（" + (zone === "front" ? "前陣" : "後陣") + "）");
    onPlay(G, who, u, tid); settle(G);
    return true;
  };
  D.swap = function (G, who, handIdx, frontId) {
    var P = G.p[who], d = P.hand[handIdx], old = P.front.find(function (x) { return x.id === frontId; });
    if (!d || !old || !D.canSwap(G, who, d)) return false;
    P.hand.splice(handIdx, 1); P.ap -= d.ap;
    var u = unit(d), i = P.front.indexOf(old);
    u.act = old.act && !old.atk && !old.frozen;
    P.front[i] = u; P.hand.push(old.d);
    fx(G, who, d); G.log(nm(G, who) + "陣前換將：" + d.name + " 換下 " + old.d.name + (u.act ? "（可以馬上進攻）" : ""));
    onPlay(G, who, u); settle(G);
    return true;
  };
  D.move = function (G, who, unitId) {
    var P = G.p[who], u = P.back.find(function (x) { return x.id === unitId; });
    if (!u || G.cur !== who || G.phase !== "main" || P.front.length >= D.FRONT || G.pending) return false;
    P.back.splice(P.back.indexOf(u), 1); P.front.push(u); u.moved = true;
    if (u.d.name === "呂蒙") { u.noblock = G.turn; fx(G, who, u.d); }
    G.log(nm(G, who) + " " + u.d.name + " 移上前陣");
    return true;
  };
  D.extraDraw = function (G, who) {
    var P = G.p[who]; if (G.cur !== who || P.ap < 1 || G.phase !== "main" || !P.deck.length || G.pending) return false;
    P.ap--; G.log(nm(G, who) + "花 1 道軍令多抽 1 張"); draw(G, P); return true;
  };

  // ===== 道具 =====
  D.canItem = function (G, who, it) {
    var P = G.p[who];
    if (it.react || G.cur !== who || G.pending || G.winner >= 0) return false;
    if (P.ap < it.ap) return false;
    if (it.tgt === "mine" && !D.field(P).length) return false;
    if ((it.id === "dou" || it.id === "xi") && !P.front.length) return false;
    return true;
  };
  D.useItem = function (G, who, handIdx, targetId) {
    var P = G.p[who], it = P.hand[handIdx];
    if (!it || !it.item || !D.canItem(G, who, it)) return false;
    var t = targetId ? D.field(P).find(function (u) { return u.id === targetId; }) : null;
    if (it.tgt === "mine" && !t) return false;
    P.hand.splice(handIdx, 1); P.ap -= it.ap; P.side.push(it);
    var say = function (s) { G.log(nm(G, who) + "使用道具「" + it.name + "」：" + s); ev(G, { who: who, item: it, msg: s, tgt: t ? t.d : null }); };
    if (it.id === "ling") { P.ap += 2; say("軍令 +2（剩 " + P.ap + " 道）"); }
    else if (it.id === "liang") { P.eb = (P.eb || 0) + 2; say("這回合軍餉 +2（現在 " + D.energy(P) + "）"); }
    else if (it.id === "chitu") { var z = P.front.indexOf(t) >= 0 ? P.front : P.back; z.splice(z.indexOf(t), 1); P.hand.push(t.d); say(t.d.name + " 回到手牌"); }
    else if (it.id === "dao") { t.buf += 1500; say(t.d.name + " 兵力 +1500"); }
    else if (it.id === "wushen") { t.buf += 3000; say(t.d.name + " 兵力 +3000"); }
    else if (it.id === "dou") { P.front.forEach(function (u) { u.buf += 1000; }); say("前陣兵力各 +1000"); }
    else if (it.id === "xi") { P.front.forEach(function (u) { u.buf += 3000; }); P.seal = true; say("前陣兵力各 +3000，下回合只有 2 道軍令"); }
    return true;
  };

  // ===== 出陣效果 =====
  function search(P, fn, n) {
    var got = [];
    for (var i = 0; i < P.deck.length && got.length < (n || 1); i++) if (!P.deck[i].item && fn(P.deck[i])) { got.push(P.deck.splice(i, 1)[0]); i--; }
    return got;
  }
  // 特技發動 → 記到 G.fxq，畫面依序播全身大演出（✅ Jay 2026-11-21：所有特技都播、雙方都播）
  function fx(G, who, d) { if (G.human < 0 && !G.both) return; (G.fxq = G.fxq || []).push({ who: who, d: d }); }
  D.fx = fx;
  // 其他演出事件（✅ Jay 2026-11-22）：交戰大卡、城門翻牌、道具使用。跟特技演出同一條佇列，照發生順序播
  function ev(G, o) { if (G.human < 0 && !G.both) return o; (G.fxq = G.fxq || []).push(o); return o; }
  function onPlay(G, who, u, tid) {
    var P = G.p[who], O = G.p[1 - who], d = u.d, s = d.skill, shown = false;
    var say = function (t) { if (!shown) { shown = true; fx(G, who, d); } G.log("　" + (d.personal ? d.skillName : s) + "：" + t); };
    if (s === "軍師") { say("抽 1 張"); draw(G, P); }
    else if (s === "屯糧") say("她在場上時軍餉 +2（現在 " + D.energy(P) + "）");
    else if (s === "策反") {
      var tg = O.front.find(function (v) { return v.id === tid; }) || O.front.slice().sort(function (a, b) { return D.hp(O, b) - D.hp(O, a); })[0];
      if (tg) {
        O.front.splice(O.front.indexOf(tg), 1); O.deck.push(tg.d);
        var z = P.front.indexOf(u) >= 0 ? P.front : P.back; z.splice(z.indexOf(u), 1); P.deck.push(u.d);
        say(tg.d.name + " 回到對方牌組底，" + d.name + " 也回到己方牌組底");
      }
    }
    // ✅ Jay 2026-11-20：號召改成「三軍用命」效果（不再看魅力）
    else if (s === "號召") { var n = 0; P.front.forEach(function (v) { if (v === u) return; v.buf = (v.buf || 0) + 1000 + (v.d.fac === d.fac ? 500 : 0); n++; }); if (n) say("前陣 " + n + " 位兵力提升"); }
    // ✅ Jay 2026-11-20：計謀不看智力，改比兵力（雙方當下兵力）
    else if (s === "計謀") { var my = D.hp(P, u), t = O.front.filter(function (v) { return D.hp(O, v) < my; }).sort(function (a, b) { return D.hp(O, b) - D.hp(O, a); })[0]; if (t) { t.act = false; t.frozen = true; say(t.d.name + " 休整，下回合不能行動"); } }
    else if (s === "曹操") { if (O.hand.length) { var k = Math.floor(G.rnd() * O.hand.length); O.side.push(O.hand.splice(k, 1)[0]); } say("對方丟 1 張手牌，我方抽 1 張"); draw(G, P); }
    else if (s === "劉備") { var b = search(P, function (c) { return c.name === "關羽" || c.name === "張飛"; }); if (b.length) { P.hand.push(b[0]); shuffle(P.deck, G.rnd); say("找來 " + b[0].name); } }
    else if (s === "張飛") { var n = 0; O.front.forEach(function (v) { if (D.hp(O, v) < D.hp(P, u) && v.act) { v.act = false; n++; } }); say("敵方前陣 " + n + " 位休整，這回合不能格擋"); }
    else if (s === "諸葛亮") {
      if (!O.hand.length) return;
      if (who === G.human || G.both) { fx(G, who, d); G.queue.push({ type: "discard", who: who }); }
      else { var best = O.hand.map(function (c, i) { return [(c.item ? 3 : c.cost) * 10000 + (c.bp || 0), i]; }).sort(function (a, b) { return b[0] - a[0]; })[0][1]; say("丟掉我方手牌 " + O.hand[best].name); O.side.push(O.hand.splice(best, 1)[0]); }
    }
    else if (s === "周瑜") { var hit = O.front.filter(function (v) { return D.hp(O, v) <= 2500; }); say("擊退 " + hit.length + " 位"); hit.forEach(function (v) { kill(G, 1 - who, v); }); }
    else if (s === "貂蟬") {
      var two = O.front.slice().sort(function (a, b) { return D.hp(O, b) - D.hp(O, a); }).slice(0, 2);
      if (two.length === 2) { say(two[0].d.name + " 與 " + two[1].d.name + " 互鬥"); fight(G, 1 - who, two[0], 1 - who, two[1]); }
    }
    else if (s === "張角") { var y = search(P, function (c) { return c.fac === "黃巾"; }, Math.max(0, Math.min(2, D.BACK - P.back.length))); y.forEach(function (c) { P.back.push(unit(c)); }); if (y.length) { shuffle(P.deck, G.rnd); say("召來 " + y.map(function (c) { return c.name; }).join("、")); } }
  }
  D.chooseDiscard = function (G, idx) {
    var pd = G.pending; if (!pd || pd.type !== "discard") return;
    var O = G.p[1 - pd.who]; if (O.hand[idx]) { G.log("　臥龍：丟掉敵方手牌 " + O.hand[idx].name); O.side.push(O.hand.splice(idx, 1)[0]); }
    G.pending = null; settle(G);
  };

  // ===== 擊退（小籠包、隱忍在這裡） =====
  function kill(G, who, u, noSave) {
    var P = G.p[who], inF = P.front.indexOf(u), inB = P.back.indexOf(u);
    if (inF < 0 && inB < 0) return false;
    if (!noSave) {
      var bi = P.hand.findIndex(function (c) { return c.item && c.id === "bao"; });
      if (bi >= 0 && P.ap >= 1) {   // ★ 小籠包自動使用
        var bao = P.hand.splice(bi, 1)[0]; P.ap--; P.side.push(bao);
        u.dmg = Math.max(0, D.bp(P, u) - 1000); u.saved = true;
        ev(G, { who: who, item: bao, msg: u.d.name + " 免於擊退，留在場上（兵力剩 1000）", tgt: u.d });
        G.log("　小籠包：" + nm(G, who) + " " + u.d.name + " 留在場上，兵力剩 1000"); G.lastSave = { who: who, u: u };
        return false;
      }
      if (u.d.name === "司馬懿" && !u.hid && P.back.length < D.BACK) {
        if (inF >= 0) P.front.splice(inF, 1); else P.back.splice(inB, 1);
        u.hid = true; u.act = false; u.dmg = 0; P.back.push(u); fx(G, who, u.d); G.log("　隱忍：司馬懿退回後陣"); return false;
      }
    }
    if (inF >= 0) P.front.splice(inF, 1); else P.back.splice(inB, 1);
    P.side.push(u.d); G.stats.kills++;
    G.log((who === G.human ? "我方 " : "敵方 ") + u.d.name + " 被擊退");
    return true;
  }
  // 兩位武將交戰：互扣兵力，扣光的被擊退（★ 兵力一樣就同歸於盡）
  function fight(G, wa, a, wb, b, opt) {
    opt = opt || {};
    var A = G.p[wa], B = G.p[wb];
    var pa = D.hp(A, a), pb = D.hp(B, b, opt.blocking);
    var e = ev(G, { who: wa, clash: { a: a.d, pa: pa, b: b.d, pb: pb, kind: opt.kind || "block", noCounter: !!opt.noCounter } });
    b.dmg = (b.dmg || 0) + pa;
    if (!opt.noCounter) a.dmg = (a.dmg || 0) + pb;
    var deadB = D.hp(B, b, opt.blocking) <= 0, deadA = !opt.noCounter && D.hp(A, a) <= 0;
    var kb = deadB && kill(G, wb, b), ka = deadA && kill(G, wa, a);
    e.clash.deadA = !!ka; e.clash.deadB = !!kb; e.clash.leftA = ka ? 0 : Math.max(0, D.hp(A, a)); e.clash.leftB = kb ? 0 : Math.max(0, D.hp(B, b));
    return { pa: pa, pb: pb, deadA: ka, deadB: kb, a: a, b: b };
  }

  // ===== 進攻 =====
  D.blockers = function (G, atkWho, a) {
    var O = G.p[1 - atkWho];
    if (a.noblock === G.turn) return [];
    return O.front.filter(function (v) { return v.act && !v.frozen; });   // ✅ 受傷的還能繼續格擋（格擋不會休整）
  };
  D.canAttack = function (G, who, u) { return G.cur === who && !G.pending && G.winner < 0 && u && u.act && G.p[who].front.indexOf(u) >= 0; };
  D.attack = function (G, who, unitId) {
    var P = G.p[who], a = P.front.find(function (x) { return x.id === unitId; });
    if (!D.canAttack(G, who, a)) return false;
    G.phase = "attack"; a.act = false; a.atk++; a.fought = true;
    G.log(nm(G, who) + " " + a.d.name + " 進攻（兵力 " + D.hp(P, a) + "）");
    var bl = D.blockers(G, who, a);
    G.pending = { type: "block", who: who, a: a, list: bl };
    if (!bl.length) { D.block(G, null); return true; }
    if (1 - who !== G.human && !G.both) D.block(G, D.aiBlock(G, who, a, bl));   // 線上對戰（G.both）兩邊都由真人決定
    return true;
  };
  D.block = function (G, blockerId) {
    var pd = G.pending; if (!pd || pd.type !== "block") return;
    var who = pd.who, a = pd.a, P = G.p[who];
    var b = blockerId ? pd.list.find(function (v) { return v.id === blockerId; }) : null;
    G.pending = null;
    var res = { a: a, b: b };
    if (b) {
      G.log((1 - who === G.human ? "我方 " : "敵方 ") + b.d.name + " 格擋（兵力 " + D.hp(G.p[1 - who], b, true) + "）");
      var f = fight(G, who, a, 1 - who, b, { blocking: true });
      res.f = f;
      if (!f.deadB && D.field(G.p[1 - who]).indexOf(b) >= 0) G.log("　" + b.d.name + " 擋下，剩兵力 " + D.hp(G.p[1 - who], b));
      if (!f.deadA && P.front.indexOf(a) >= 0) G.log("　" + a.d.name + " 剩兵力 " + D.hp(P, a));
      if (f.deadB && !f.deadA && a.d.name === "關羽" && a.extra < 2 && P.front.indexOf(a) >= 0) { a.extra++; a.act = true; fx(G, who, a.d); G.log("　過五關斬六將：關羽再戰"); }
    } else {
      var L0 = G.p[1 - who].life.length, eg = ev(G, { who: who, clash: { a: a.d, pa: D.hp(P, a), b: null, kind: "gate" } });
      damage(G, 1 - who, 1, a); eg.clash.gates = L0 - G.p[1 - who].life.length; eg.clash.left = G.p[1 - who].life.length;
    }
    if (a.d.skill === "連擊" && a.atk === 1 && P.front.indexOf(a) >= 0 && G.winner < 0) { a.act = true; fx(G, who, a.d); G.log("　連擊：" + a.d.name + " 可以再進攻"); }
    G.lastFight = res; settle(G);
    return res;
  };
  // 遠射：打後陣，對方不能格擋，不會被反扣
  D.canSnipe = function (G, who, u) { return D.canAttack(G, who, u) && u.d.skill === "遠射" && G.p[1 - who].back.length > 0; };
  D.snipe = function (G, who, unitId, targetId) {
    var P = G.p[who], O = G.p[1 - who], a = P.front.find(function (x) { return x.id === unitId; }), t = O.back.find(function (x) { return x.id === targetId; });
    if (!t || !D.canSnipe(G, who, a)) return false;
    G.phase = "attack"; a.act = false; a.atk++; a.fought = true;
    fx(G, who, a.d); G.log(nm(G, who) + " " + a.d.name + " 遠射後陣 " + t.d.name);
    var f = fight(G, who, a, 1 - who, t, { noCounter: true, kind: "snipe" });
    if (!f.deadB && D.field(O).indexOf(t) >= 0) G.log("　" + t.d.name + " 剩兵力 " + D.hp(O, t));
    G.lastFight = { a: a, b: t, f: f }; return true;
  };
  // 單挑：✅ Jay 2026-11-21 每場限用一次（★ 同名武將共用一次）；指定敵方前陣一位（休整中的也可以）交戰，算格擋
  D.canDuel = function (G, who, u) { var P = G.p[who]; return D.canAttack(G, who, u) && u.d.skill === "單挑" && !(P.duels && P.duels[u.d.name]) && G.p[1 - who].front.length > 0; };
  D.duel = function (G, who, unitId, targetId) {
    var P = G.p[who], O = G.p[1 - who], a = P.front.find(function (x) { return x.id === unitId; }), t = O.front.find(function (x) { return x.id === targetId; });
    if (!t || !D.canDuel(G, who, a)) return false;
    G.phase = "attack"; a.act = false; a.atk++; a.fought = true; (P.duels = P.duels || {})[a.d.name] = 1;
    fx(G, who, a.d); G.log(nm(G, who) + " " + a.d.name + " 單挑 " + t.d.name + "（兵力 " + D.hp(P, a) + " 對 " + D.hp(O, t, true) + "）");
    var f = fight(G, who, a, 1 - who, t, { blocking: true, kind: "duel" });
    if (!f.deadB && D.field(O).indexOf(t) >= 0) G.log("　" + t.d.name + " 剩兵力 " + D.hp(O, t));
    if (!f.deadA && P.front.indexOf(a) >= 0) G.log("　" + a.d.name + " 剩兵力 " + D.hp(P, a));
    G.lastFight = { a: a, b: t, f: f }; settle(G); return true;
  };
  // 破門：犧牲自己破 1 道門
  D.canBreak = function (G, who, u) { return D.canAttack(G, who, u) && u.d.skill === "破門" && D.hp(G.p[who], u) >= 5000; };
  D.breakGate = function (G, who, unitId) {
    var P = G.p[who], a = P.front.find(function (x) { return x.id === unitId; });
    if (!D.canBreak(G, who, a)) return false;
    G.phase = "attack"; fx(G, who, a.d); G.log(nm(G, who) + " " + a.d.name + " 破門！犧牲自己");
    kill(G, who, a, true); damage(G, 1 - who, 1, null); return true;   // ✅ Jay：護主也擋得住破門
  };
  // 呂布・神擋殺神
  D.canLubu = function (G, who, u) { return D.canAttack(G, who, u) && u.d.name === "呂布" && G.p[who].ap >= 3 && G.p[1 - who].front.length > 0; };
  D.lubu = function (G, who, unitId, targetId) {
    var P = G.p[who], O = G.p[1 - who], a = P.front.find(function (x) { return x.id === unitId; }), t = O.front.find(function (x) { return x.id === targetId; });
    if (!t || !D.canLubu(G, who, a)) return false;
    P.ap -= 3; a.act = false; a.fought = true; G.phase = "attack";
    fx(G, who, a.d); G.log(nm(G, who) + " 呂布「神擋殺神」：直取 " + t.d.name);
    var el = ev(G, { who: who, clash: { a: a.d, pa: D.hp(P, a), b: t.d, pb: D.hp(O, t), kind: "lubu" } });
    el.clash.deadB = !!kill(G, 1 - who, t); el.clash.leftA = D.hp(P, a); el.clash.leftB = el.clash.deadB ? 0 : D.hp(O, t); G.lastFight = { a: a, b: t, lubu: true }; return true;
  };
  function damage(G, who, n, attacker, noGuard) {
    var P = G.p[who];
    for (var i = 0; i < n; i++) {
      if (!P.life.length) return;
      if (!noGuard && P.life.length === 1) {   // 護主：最後 1 道門
        var g = D.field(P).find(function (u) { return u.d.skill === "護主" && !u.guard; });
        if (g) { g.guard = true; fx(G, who, g.d); G.log("　護主：" + g.d.name + " 擋下了這次進攻"); G.lastGuard = g; continue; }
      }
      var c = P.life.shift(); G.stats.hits++;
      G.log(nm(G, who) + "城門被破，剩 " + P.life.length + " 道（翻出 " + c.name + (c.trig ? "・" + c.trig : "") + "）");
      G.lastFlip = { who: who, d: c };
      var fe = ev(G, { who: who, flip: c, left: P.life.length, res: "side" });
      if (c.trig === "援軍") { P.hand.push(c); fe.res = "hand"; G.log("　援軍：" + c.name + " 加入手牌"); }
      else if (c.trig === "伏兵" && P.back.length < D.BACK) { P.back.push(unit(c)); fe.res = "back"; G.log("　伏兵：" + c.name + " 進入後陣"); }
      else {
        if (c.trig === "反擊") { var u = P.front.find(function (v) { return !v.act && !v.frozen; }); if (u) { u.act = true; u.buf += 1000; fe.res = "counter"; fe.u = u.d; G.log("　反擊：" + u.d.name + " 重新可行動，兵力 +1000"); } }
        P.side.push(c);
      }
      if (!P.life.length) { G.winner = 1 - who; G.log(nm(G, who) + "城門全破"); return; }
    }
  }

  // ===== 電腦對手 =====
  D.aiBlock = function (G, atkWho, a, list) {
    var P = G.p[atkWho], O = G.p[1 - atkWho], pa = D.hp(P, a);
    if (O.easy && O.life.length > D.EASY.blockAt) return null;   // 初級電腦：城門還多時不格擋
    var opts = list.map(function (v) { return { v: v, hp: D.hp(O, v, true) }; });
    var good = opts.filter(function (x) { return x.hp > pa; }).sort(function (x, y) { return x.hp - y.hp; })[0];   // 擋得住又不會死
    if (good) return good.v.id;
    var trade = opts.filter(function (x) { return x.hp === pa && x.v.d.cost <= a.d.cost; })[0];   // 同歸於盡划算
    if (trade) return trade.v.id;
    if (O.life.length <= 2 && opts.length) return opts.sort(function (x, y) { return x.v.d.cost - y.v.d.cost || x.hp - y.hp; })[0].v.id;
    return null;
  };
  // 初級電腦的放水程度（★ 開發先定，用模擬調）：城門剩幾道以下才格擋、每回合最多出幾位武將
  D.EASY = { blockAt: 3, plays: 1 };
  D.aiNext = function (G) {
    var who = G.cur, P = G.p[who], O = G.p[1 - who];
    if (G.winner >= 0 || G.pending) return null;
    var maxCost = Math.max.apply(null, [0].concat(P.hand.filter(function (c) { return !c.item; }).map(function (c) { return c.cost; })));
    var need = Math.min(4, Math.max(maxCost, Math.min(4, P.t + 1)));
    var idx = function (id) { return P.hand.findIndex(function (c) { return c.item && c.id === id; }); };
    // 呂布：對方有大將就直接殺
    var lb = P.front.find(function (u) { return D.canLubu(G, who, u); });
    if (lb) { var big = O.front.slice().sort(function (a, b) { return D.hp(O, b) - D.hp(O, a); })[0]; if (big && D.hp(O, big) >= 3500) return { t: "lubu", id: lb.id, tid: big.id }; }
    if (G.phase === "main") {
      var mv = P.back.slice().sort(function (a, b) { return D.hp(P, b) - D.hp(P, a); }).find(function (u) { return P.front.length < D.FRONT && P.back.length > 1 && D.energy(P) - u.d.gen >= need; });
      if (mv) return { t: "move", id: mv.id };
      var opts = P.hand.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return !x.c.item && D.canPlay(G, who, x.c); })
        .sort(function (a, b) { return b.c.cost - a.c.cost || b.c.bp - a.c.bp; });
      if (opts.length && !(P.easy && P.nplay >= D.EASY.plays)) {
        var c = opts[0].c, zone, wantE = D.energy(P) < need || D.energy(P) < 4;
        if ((c.skill === "突擊" || c.name === "張遼") && P.front.length < D.FRONT) zone = "front";
        else if (P.back.length < D.BACK && wantE) zone = "back";
        else if (P.front.length < D.FRONT) zone = "front"; else zone = "back";
        return { t: "play", i: opts[0].i, zone: zone };
      }
      // 軍糧：多 2 軍餉能出手上更強的卡時用（還要留軍令出卡）
      var lg = idx("liang");
      if (lg >= 0 && P.ap >= 2 && G.phase === "main" && P.hand.some(function (x) { return !x.item && x.cost > D.energy(P) && x.cost <= D.energy(P) + 2 && x.ap <= P.ap - 1 && (P.front.length < D.FRONT || P.back.length < D.BACK); })) return { t: "item", i: lg };
      // 軍令道具：多 2 道能多出一張卡時用
      var li = idx("ling");
      if (li >= 0 && P.hand.some(function (x) { return !x.item && D.energy(P) >= x.cost && x.ap <= P.ap + 2 && x.ap > P.ap; })) return { t: "item", i: li };
      var dry = D.energy(P) === 0 && D.noZero(P);
      if (P.ap > 0 && P.deck.length > 3 && (P.hand.length <= 3 || dry)) return { t: "draw" };
    }
    var ready = P.front.filter(function (u) { return u.act; });
    if (ready.length) {
      // 加兵力道具：進攻前用
      var xi = idx("xi"); if (xi >= 0 && P.ap >= 5 && ready.length >= 2) return { t: "item", i: xi };
      var di = idx("dou"); if (di >= 0 && P.ap >= 1 && ready.length >= 2) return { t: "item", i: di };
      var top = ready.slice().sort(function (a, b) { return D.hp(P, b) - D.hp(P, a); })[0];
      var bestBlk = Math.max.apply(null, [0].concat(O.front.filter(function (v) { return v.act && !v.frozen; }).map(function (v) { return D.hp(O, v, true); })));
      var ws = idx("wushen"), dq = idx("dao");
      if (P.ap >= 1 && bestBlk >= D.hp(P, top)) {
        if (dq >= 0 && D.hp(P, top) + 1500 > bestBlk) return { t: "item", i: dq, tid: top.id };
        if (ws >= 0 && D.hp(P, top) + 3000 > bestBlk) return { t: "item", i: ws, tid: top.id };
      }
      // 破門：快贏的時候，用道具把破門武將補到 5000
      if (O.life.length <= 2 && P.ap >= 1) {
        var pb = ready.find(function (u) { return u.d.skill === "破門" && D.hp(P, u) < 5000; });
        if (pb && dq >= 0 && D.hp(P, pb) + 1500 >= 5000) return { t: "item", i: dq, tid: pb.id };
        if (pb && ws >= 0 && D.hp(P, pb) + 3000 >= 5000) return { t: "item", i: ws, tid: pb.id };
      }
      var br = ready.find(function (u) { return D.canBreak(G, who, u); });
      if (br && O.life.length <= 2) return { t: "break", id: br.id };
      // 單挑：挑一位打得贏的（兵力最高的優先）
      var dl = ready.find(function (u) { return D.canDuel(G, who, u); });
      if (dl) { var dt = O.front.filter(function (v) { return D.hp(O, v, true) < D.hp(P, dl); }).sort(function (a, b) { return D.hp(O, b) - D.hp(O, a); })[0]; if (dt) return { t: "duel", id: dl.id, tid: dt.id }; }
      var sn = ready.find(function (u) { return D.canSnipe(G, who, u); });
      if (sn) { var tg = O.back.filter(function (v) { return D.hp(O, v) <= D.hp(P, sn); }).sort(function (a, b) { return b.d.gen - a.d.gen || D.hp(O, b) - D.hp(O, a); })[0]; if (tg) return { t: "snipe", id: sn.id, tid: tg.id }; }
      return { t: "attack", id: top.id };
    }
    return null;
  };
  D.aiDo = function (G, act) {
    var who = G.cur;
    if (act.t === "move") return D.move(G, who, act.id);
    if (act.t === "play") return D.play(G, who, act.i, act.zone);
    if (act.t === "draw") return D.extraDraw(G, who);
    if (act.t === "attack") return D.attack(G, who, act.id);
    if (act.t === "item") return D.useItem(G, who, act.i, act.tid);
    if (act.t === "snipe") return D.snipe(G, who, act.id, act.tid);
    if (act.t === "break") return D.breakGate(G, who, act.id);
    if (act.t === "lubu") return D.lubu(G, who, act.id, act.tid);
    if (act.t === "duel") return D.duel(G, who, act.id, act.tid);
  };
  // 湊齊升級時記一筆演出（人數變多、加成變高才播；人被擊退降級後再湊回來會再播）
  function checkSets(G) {
    if (!G || (G.human < 0 && !G.both)) return;
    G.p.forEach(function (P) {
      P.sets = P.sets || {};
      Object.keys(D.SET_TAGS).forEach(function (t) {
        var s = D.setInfo(P, t), was = P.sets[t] || 0;
        if (s.bonus > was) (G.fxq = G.fxq || []).push({ who: P.who, set: s });
        P.sets[t] = s.bonus;
      });
    });
  }
  D.checkSets = checkSets;
  ["play", "swap", "move", "useItem", "attack", "block", "snipe", "duel", "breakGate", "lubu", "endTurn", "chooseReturn", "chooseDiscard"].forEach(function (k) {
    var f = D[k]; D[k] = function (G) { var r = f.apply(this, arguments); checkSets(G); return r; };
  });
  // 不需要畫面的整局自動對打（測試用）
  D.autoplay = function (G, maxTurns) {
    G.human = -1;
    [0, 1].forEach(function (k) { if (D.noZero(G.p[k])) D.mulligan(G, k); });
    D.startTurn(G);
    for (var guard = 0; guard < 6000 && G.winner < 0 && G.turn < (maxTurns || 80); guard++) {
      var act = D.aiNext(G);
      if (act) { if (D.aiDo(G, act) === false) { D.endTurn(G); } continue; }
      D.endTurn(G);
    }
    return G;
  };
})(window.SG);
