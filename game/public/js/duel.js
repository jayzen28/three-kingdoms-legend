/* 鬥將模式：規則引擎＋電腦對手（畫面在 duel-ui.js）
   規則骨架參考 UNION ARENA：後陣產軍餉（不消耗，只比數量）、出牌付軍令（每回合重置，最多 3 道）、
   後陣的武將可以移上前陣（多一個打手＝少一份軍餉）、前陣進攻對方城門、對方可以格擋、城門被破時翻開看急報。 */
(function (SG) {
  var D = SG.DUEL;
  var uid = 0;
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function expand(deck) { var out = []; Object.keys(deck).forEach(function (k) { var d = D.CARD[k]; if (d) for (var i = 0; i < deck[k]; i++) out.push(d); }); return out; }
  function nonNation(t) { return D.NATIONS.indexOf(t) < 0; }
  function shareTag(a, b, nation) { return a.tags.some(function (t) { return (nation || nonNation(t)) && b.tags.indexOf(t) >= 0; }); }

  D.newGame = function (deckA, deckB, opt) {
    opt = opt || {};
    var rnd = opt.rnd || Math.random;
    var mk = function (deck, who) { return { who: who, deck: shuffle(expand(deck), rnd), hand: [], life: [], front: [], back: [], side: [], ap: 0, apMax: 0, t: 0 }; };
    var G = { p: [mk(deckA, 0), mk(deckB, 1)], rnd: rnd, turn: 0, cur: 0, phase: "main", winner: -1, logs: [], pending: null, human: opt.human === undefined ? 0 : opt.human, stats: { kills: 0, hits: 0 } };
    G.first = opt.first !== undefined ? opt.first : (rnd() < 0.5 ? 0 : 1);
    G.cur = G.first;
    G.p.forEach(function (P) { P.hand = P.deck.splice(0, D.HAND); P.life = P.deck.splice(0, D.LIFE); });
    G.log = function (t) { G.logs.push(t); if (G.logs.length > 60) G.logs.shift(); if (G.onLog) G.onLog(t); };
    return G;
  };
  // 換一次手牌（只在開局、第一回合開始前）
  D.mulligan = function (G, who) {
    var P = G.p[who]; P.deck = shuffle(P.deck.concat(P.hand), G.rnd); P.hand = P.deck.splice(0, D.HAND); P.mull = true;
  };

  // ===== 數值 =====
  D.energy = function (P) { return P.back.reduce(function (a, u) { return a + u.d.gen; }, 0); };
  D.field = function (P) { return P.front.concat(P.back); };
  D.setDone = function (P, tag) {
    var names = D.SET_TAGS[tag].split(" ").filter(function (n) { return D.CARD[n]; });
    var on = D.field(P).map(function (u) { return u.d.name; });
    return names.every(function (n) { return on.indexOf(n) >= 0; });
  };
  D.bp = function (P, u, blocking) {
    var bp = u.d.bp + (u.buf || 0), all = D.field(P);
    if (u.d.skill === "結義") bp += 500 * Math.min(3, all.filter(function (v) { return v !== u && shareTag(u.d, v.d); }).length);
    if (u.d.tags.indexOf("吳") >= 0 && all.some(function (v) { return v.d.name === "孫權"; })) bp += 500 * Math.min(3, all.filter(function (v) { return v.d.tags.indexOf("吳") >= 0; }).length);
    if (u.d.tags.some(function (t) { return D.SET_TAGS[t] && D.setDone(P, t); })) bp += D.SET_BONUS;
    if (blocking && u.d.skill === "鐵壁") bp += 1000;
    return bp;
  };
  D.canPlay = function (G, who, d) {
    var P = G.p[who];
    if (G.winner >= 0 || G.cur !== who || G.phase !== "main" || G.pending) return false;
    if (P.ap < d.ap || D.energy(P) < d.cost) return false;
    if (d.name === "張遼") return P.front.length < D.FRONT;
    return P.front.length < D.FRONT || P.back.length < D.BACK;
  };

  // ===== 回合 =====
  function draw(G, P) { if (!P.deck.length) { G.winner = 1 - P.who; G.log((P.who === G.human ? "我方" : "敵方") + "牌組抽光了"); return false; } P.hand.push(P.deck.shift()); return true; }
  var nm = function (G, who) { return who === G.human ? "我方" : "敵方"; };
  D.startTurn = function (G) {
    var P = G.p[G.cur]; P.t++; G.turn++; G.phase = "main";
    D.field(P).forEach(function (u) { if (u.frozen) u.frozen = false; else u.act = true; u.buf = 0; u.atk = 0; u.extra = 0; u.moved = false; u.fresh = false; u.guard = false; });
    P.apMax = G.cur === G.first ? Math.min(3, P.t) : (P.t <= 2 ? 2 : 3);
    P.ap = P.apMax;
    if (!(G.cur === G.first && P.t === 1)) { if (!draw(G, P)) return; }
    if (D.field(P).some(function (u) { return u.d.name === "董卓"; }) && P.hand.length) {
      var k = Math.floor(G.rnd() * P.hand.length); G.log("董卓「暴政」：" + nm(G, P.who) + "丟掉 " + P.hand[k].name); P.side.push(P.hand.splice(k, 1)[0]);
    }
  };
  D.endTurn = function (G) {
    if (G.winner >= 0 || G.pending) return;
    var P = G.p[G.cur];
    D.field(P).forEach(function (u) { if (!u.frozen) u.act = true; });
    while (P.hand.length > D.HAND_MAX) { var c = P.hand.pop(); P.side.push(c); }
    G.cur = 1 - G.cur;
    D.startTurn(G);
  };

  // ===== 出牌、移動、多抽 =====
  D.play = function (G, who, handIdx, zone) {
    var P = G.p[who], O = G.p[1 - who], d = P.hand[handIdx];
    if (!d || !D.canPlay(G, who, d)) return false;
    if (d.name === "張遼") zone = "front";
    if (zone === "front" && P.front.length >= D.FRONT) zone = "back";
    if (zone === "back" && P.back.length >= D.BACK) zone = "front";
    P.hand.splice(handIdx, 1); P.ap -= d.ap;
    var u = { id: ++uid, d: d, act: false, fresh: true, buf: 0, atk: 0, extra: 0 };
    if (zone === "front" && (d.skill === "突擊" || d.name === "張遼")) u.act = true;
    if (d.name === "張遼") u.noblock = G.turn;
    P[zone].push(u);
    G.log(nm(G, who) + "出陣 " + d.name + "（" + (zone === "front" ? "前陣" : "後陣") + "）");
    onPlay(G, who, u);
    return true;
  };
  D.move = function (G, who, unitId) {
    var P = G.p[who], u = P.back.find(function (x) { return x.id === unitId; });
    if (!u || G.cur !== who || G.phase !== "main" || P.front.length >= D.FRONT || G.pending) return false;
    P.back.splice(P.back.indexOf(u), 1); P.front.push(u); u.moved = true;
    if (u.d.name === "呂蒙") u.noblock = G.turn;
    G.log(nm(G, who) + " " + u.d.name + " 移上前陣");
    return true;
  };
  D.extraDraw = function (G, who) {
    var P = G.p[who]; if (G.cur !== who || P.ap < 1 || G.phase !== "main" || !P.deck.length) return false;
    P.ap--; draw(G, P); G.log(nm(G, who) + "花 1 道軍令多抽 1 張"); return true;
  };

  // ===== 出陣效果 =====
  function search(P, fn, n) {
    var got = [];
    for (var i = 0; i < P.deck.length && got.length < (n || 1); i++) if (fn(P.deck[i])) { got.push(P.deck.splice(i, 1)[0]); i--; }
    return got;
  }
  function onPlay(G, who, u) {
    var P = G.p[who], O = G.p[1 - who], d = u.d, s = d.skill;
    var say = function (t) { G.log("　" + (d.personal ? d.skillName : s) + "：" + t); };
    if (s === "軍師") { draw(G, P); say("抽 1 張"); }
    else if (s === "號召") { var g = search(P, function (c) { return c.m < d.m && shareTag(d, c, true); }); if (g.length) { P.hand.push(g[0]); shuffle(P.deck, G.rnd); say("找來 " + g[0].name); } }
    else if (s === "計謀") { var t = O.front.filter(function (v) { return v.d.z < d.z; }).sort(function (a, b) { return D.bp(O, b) - D.bp(O, a); })[0]; if (t) { t.act = false; t.frozen = true; say(t.d.name + " 休整，下回合不能行動"); } }
    else if (s === "曹操") { if (O.hand.length) { var k = Math.floor(G.rnd() * O.hand.length); O.side.push(O.hand.splice(k, 1)[0]); } draw(G, P); say("對方丟 1 張手牌，我方抽 1 張"); }
    else if (s === "劉備") { var b = search(P, function (c) { return c.name === "關羽" || c.name === "張飛"; }); if (b.length) { P.hand.push(b[0]); shuffle(P.deck, G.rnd); say("找來 " + b[0].name); } }
    else if (s === "張飛") { var n = 0; O.front.forEach(function (v) { if (D.bp(O, v) < D.bp(P, u) && v.act) { v.act = false; n++; } }); say("敵方前陣 " + n + " 位休整"); }
    else if (s === "諸葛亮") {
      if (!O.hand.length) return;
      if (who === G.human) G.pending = { type: "discard", who: who };
      else { var best = O.hand.map(function (c, i) { return [c.cost * 10000 + c.bp, i]; }).sort(function (a, b) { return b[0] - a[0]; })[0][1]; say("丟掉我方手牌 " + O.hand[best].name); O.side.push(O.hand.splice(best, 1)[0]); }
    }
    else if (s === "周瑜") { var hit = O.front.filter(function (v) { return D.bp(O, v) <= 2500; }); hit.forEach(function (v) { kill(G, 1 - who, v); }); say("擊退 " + hit.length + " 位"); }
    else if (s === "貂蟬") {
      var two = O.front.slice().sort(function (a, b) { return D.bp(O, b) - D.bp(O, a); }).slice(0, 2);
      if (two.length === 2) { var a = D.bp(O, two[0]), c2 = D.bp(O, two[1]); var lose = a > c2 ? two[1] : c2 > a ? two[0] : (two[0].d.w >= two[1].d.w ? two[1] : two[0]); say(two[0].d.name + " 與 " + two[1].d.name + " 互鬥，" + lose.d.name + " 被擊退"); kill(G, 1 - who, lose); }
    }
    else if (s === "張角") { var y = search(P, function (c) { return c.fac === "黃巾"; }, Math.max(0, Math.min(2, D.BACK - P.back.length))); y.forEach(function (c) { P.back.push({ id: ++uid, d: c, act: false, fresh: true, buf: 0, atk: 0, extra: 0 }); }); if (y.length) { shuffle(P.deck, G.rnd); say("召來 " + y.map(function (c) { return c.name; }).join("、")); } }
  }
  D.chooseDiscard = function (G, idx) {
    var pd = G.pending; if (!pd || pd.type !== "discard") return;
    var O = G.p[1 - pd.who]; if (O.hand[idx]) { G.log("　臥龍：丟掉敵方手牌 " + O.hand[idx].name); O.side.push(O.hand.splice(idx, 1)[0]); }
    G.pending = null;
  };

  // ===== 擊退 =====
  function kill(G, who, u) {
    var P = G.p[who], inF = P.front.indexOf(u), inB = P.back.indexOf(u);
    if (inF < 0 && inB < 0) return;
    if (inF >= 0) P.front.splice(inF, 1); else P.back.splice(inB, 1);
    if (u.d.name === "司馬懿" && !u.saved && P.back.length < D.BACK) { u.saved = true; u.act = false; P.back.push(u); G.log("　隱忍：司馬懿退回後陣"); return; }
    P.side.push(u.d); G.stats.kills++;
    G.log((who === G.human ? "我方 " : "敵方 ") + u.d.name + " 被擊退");
  }

  // ===== 進攻與格擋 =====
  D.blockers = function (G, atkWho, a) {
    var O = G.p[1 - atkWho], P = G.p[atkWho];
    if (a.noblock === G.turn) return [];
    var abp = D.bp(P, a), king = D.field(O).some(function (v) { return v.d.tags.indexOf("君主") >= 0; });
    return O.front.filter(function (v) {
      var can = v.act || (v.d.name === "典韋" && king && !v.guard);
      if (!can) return false;
      if (a.d.name === "趙雲" && D.bp(O, v, true) <= abp) return false;
      return true;
    });
  };
  D.canAttack = function (G, who, u) { return G.cur === who && !G.pending && G.winner < 0 && u && u.act && G.p[who].front.indexOf(u) >= 0; };
  D.attack = function (G, who, unitId) {
    var P = G.p[who], a = P.front.find(function (x) { return x.id === unitId; });
    if (!D.canAttack(G, who, a)) return false;
    G.phase = "attack"; a.act = false; a.atk++;
    G.log(nm(G, who) + " " + a.d.name + " 進攻（兵力 " + D.bp(P, a) + "）");
    var bl = D.blockers(G, who, a);
    G.pending = { type: "block", who: who, a: a, list: bl };
    if (!bl.length) { D.block(G, null); return true; }
    if (1 - who !== G.human) D.block(G, D.aiBlock(G, who, a, bl));
    return true;
  };
  D.block = function (G, blockerId) {
    var pd = G.pending; if (!pd || pd.type !== "block") return;
    var who = pd.who, a = pd.a, P = G.p[who], O = G.p[1 - who];
    var b = blockerId ? pd.list.find(function (v) { return v.id === blockerId; }) : null;
    G.pending = null;
    var res = { a: a, b: b, win: false };
    if (b) {
      if (!b.act && b.d.name === "典韋") { b.guard = true; G.log("　捨命護主：典韋挺身格擋"); }
      b.act = false;
      var abp = D.bp(P, a), bbp = D.bp(O, b, true);
      res.win = abp > bbp || (abp === bbp && a.d.w >= b.d.w);
      G.log((1 - who === G.human ? "我方 " : "敵方 ") + b.d.name + " 格擋（兵力 " + bbp + "）");
      if (res.win) {
        kill(G, 1 - who, b);
        if (a.d.name === "關羽" && a.extra < 2 && P.front.indexOf(a) >= 0) { a.extra++; a.act = true; G.log("　過五關斬六將：關羽再戰"); }
      } else G.log("　擋下了");
    } else {
      damage(G, 1 - who);
    }
    if (a.d.skill === "連戰" && a.atk === 1 && P.front.indexOf(a) >= 0 && G.winner < 0) { a.act = true; G.log("　連戰：" + a.d.name + " 可以再進攻"); }
    G.lastFight = res;
    return res;
  };
  function damage(G, who) {
    var P = G.p[who]; if (!P.life.length) return;
    var c = P.life.shift(); G.stats.hits++;
    G.log((who === G.human ? "我方" : "敵方") + "城門被破，剩 " + P.life.length + " 道（翻出 " + c.name + (c.trig ? "・" + c.trig : "") + "）");
    G.lastFlip = { who: who, d: c };
    if (c.trig === "援軍") { P.hand.push(c); G.log("　援軍：" + c.name + " 加入手牌"); }
    else if (c.trig === "伏兵" && P.back.length < D.BACK) { P.back.push({ id: ++uid, d: c, act: false, fresh: true, buf: 0, atk: 0, extra: 0 }); G.log("　伏兵：" + c.name + " 進入後陣"); }
    else {
      if (c.trig === "反擊") { var u = P.front.find(function (v) { return !v.act && !v.frozen; }); if (u) { u.act = true; u.buf = (u.buf || 0) + 1000; G.log("　反擊：" + u.d.name + " 重新可行動，兵力 +1000"); } }
      P.side.push(c);
    }
    if (!P.life.length) { G.winner = 1 - who; G.log((who === G.human ? "我方" : "敵方") + "城門全破"); }
  }

  // ===== 電腦對手 =====
  D.aiBlock = function (G, atkWho, a, list) {
    var P = G.p[atkWho], O = G.p[1 - atkWho], abp = D.bp(P, a);
    var opts = list.map(function (v) { return { v: v, bp: D.bp(O, v, true) }; });
    var win = opts.filter(function (x) { return x.bp > abp || (x.bp === abp && x.v.d.w > a.d.w); }).sort(function (x, y) { return x.bp - y.bp; })[0];
    if (win) return win.v.id;
    if (O.life.length <= 2 && opts.length) return opts.sort(function (x, y) { return x.bp - y.bp; })[0].v.id;
    return null;
  };
  // 回傳下一個動作（UI 一步一步播）；沒有動作就回 null（該結束回合）
  D.aiNext = function (G) {
    var who = G.cur, P = G.p[who];
    if (G.winner >= 0 || G.pending) return null;
    if (G.phase === "main") {
      var maxCost = Math.max.apply(null, [0].concat(P.hand.map(function (c) { return c.cost; })));
      var need = Math.min(4, Math.max(maxCost, Math.min(4, P.t + 1)));
      // 後陣多出來的軍餉移上前陣
      var mv = P.back.slice().sort(function (a, b) { return D.bp(P, b) - D.bp(P, a); }).find(function (u) { return P.front.length < D.FRONT && P.back.length > 1 && D.energy(P) - u.d.gen >= need; });
      if (mv) return { t: "move", id: mv.id };
      var opts = P.hand.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return D.canPlay(G, who, x.c); })
        .sort(function (a, b) { return b.c.cost - a.c.cost || b.c.bp - a.c.bp; });
      if (opts.length) {
        var c = opts[0].c, zone;
        var wantE = D.energy(P) < need || D.energy(P) < 4;
        if ((c.skill === "突擊" || c.name === "張遼") && P.front.length < D.FRONT) zone = "front";
        else if (P.back.length < D.BACK && wantE) zone = "back";
        else if (P.front.length < D.FRONT) zone = "front"; else zone = "back";
        return { t: "play", i: opts[0].i, zone: zone };
      }
      var dry = D.energy(P) === 0 && !P.hand.some(function (c) { return c.cost === 0; });   // 沒有 0 費卡又沒軍餉：多抽找起手卡
      if (P.ap > 0 && P.deck.length > 3 && (P.hand.length <= 3 || dry)) return { t: "draw" };
    }
    var att = P.front.filter(function (u) { return u.act; }).sort(function (a, b) { return D.bp(P, b) - D.bp(P, a); })[0];
    if (att) return { t: "attack", id: att.id };
    return null;
  };
  D.aiDo = function (G, act) {
    var who = G.cur;
    if (act.t === "move") return D.move(G, who, act.id);
    if (act.t === "play") return D.play(G, who, act.i, act.zone);
    if (act.t === "draw") return D.extraDraw(G, who);
    if (act.t === "attack") return D.attack(G, who, act.id);
  };
  // 不需要畫面的整局自動對打（測試用）
  D.noZero = function (P) { return !P.hand.some(function (c) { return c.cost === 0; }); };
  D.autoplay = function (G, maxTurns) {
    G.human = -1;
    [0, 1].forEach(function (k) { if (D.noZero(G.p[k])) D.mulligan(G, k); });
    D.startTurn(G);
    for (var guard = 0; guard < 4000 && G.winner < 0 && G.turn < (maxTurns || 80); guard++) {
      var act = D.aiNext(G);
      if (act) { D.aiDo(G, act); continue; }
      D.endTurn(G);
    }
    return G;
  };
})(window.SG);
