/* 鬥將線上對戰：伺服器和畫面共用的「局面轉換」
   伺服器握有完整局面 G；送給每位玩家的是轉成「自己是 p[0]」的版本，對方手牌、雙方牌庫和城門底牌都蓋起來。 */
(function (SG) {
  var D = SG.DUEL;
  var EVENTS = ["lastFight", "lastFlip", "lastGuard", "lastSave"];
  function cardKey(c) { return c.item ? D.itemKey(c.id) : c.name; }
  function isCard(x) { return x && (x.item ? D.ITEM[D.itemKey(x.id)] === x : D.CARD[x.name] === x); }
  function ser(x) {
    if (x === null || x === undefined) return x;
    if (typeof x === "function") return undefined;
    if (typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(ser);
    if (isCard(x)) return { $c: cardKey(x) };
    var o = {};
    Object.keys(x).forEach(function (k) { var v = ser(x[k]); if (v !== undefined) o[k] = v; });
    return o;
  }
  var hide = function (arr) { return arr.map(function () { return null; }); };
  var flip = function (t) { return t.replace(/我方|敵方/g, function (w) { return w === "我方" ? "敵方" : "我方"; }); };

  // 伺服器 → 玩家 seat：自己永遠是 p[0]
  D.view = function (G, seat) {
    var r = function (w) { return w < 0 || w === undefined ? w : (w === seat ? 0 : 1); };
    var side = function (P, mine) {
      var o = ser({ who: r(P.who), front: P.front, back: P.back, side: P.side, ap: P.ap, apMax: P.apMax, t: P.t, seal: P.seal, eb: P.eb || 0 });
      o.hand = mine || (G.pending && G.pending.type === "discard" && G.pending.who === seat) ? ser(P.hand) : hide(P.hand);
      o.deck = hide(P.deck); o.life = hide(P.life);
      return o;
    };
    var v = { p: [side(G.p[seat], true), side(G.p[1 - seat], false)], turn: G.turn, cur: r(G.cur), first: r(G.first), phase: G.phase, winner: r(G.winner), live: G.live,
      logs: G.logs.slice(-6).map(function (t) { return seat === 0 ? t : flip(t); }) };
    if (G.pending) { v.pending = ser(G.pending); v.pending.who = r(G.pending.who); }
    EVENTS.forEach(function (k) { if (G[k]) { v[k] = ser(G[k]); if (v[k].who !== undefined) v[k].who = r(G[k].who); } });
    if (G.fxq && G.fxq.length) v.fxq = G.fxq.map(function (x) { return { who: r(x.who), d: ser(x.d) }; });   // 特技演出
    return v;
  };

  // 玩家收到後還原成畫面能直接用的局面（卡片換回卡片物件、同一位武將指向同一個物件）
  D.hydrate = function (v) {
    var units = {};
    var back = function (x) {
      if (x === null || typeof x !== "object") return x;
      if (Array.isArray(x)) return x.map(back);
      if (x.$c) return D.CARD[x.$c] || D.ITEM[x.$c] || null;
      var o = {}; Object.keys(x).forEach(function (k) { o[k] = back(x[k]); });
      return o;
    };
    var G = back(v);
    G.p.forEach(function (P) { P.front.concat(P.back).forEach(function (u) { units[u.id] = u; }); });
    var link = function (u) { return u && units[u.id] ? units[u.id] : u; };
    if (G.pending) { if (G.pending.a) G.pending.a = link(G.pending.a); if (G.pending.list) G.pending.list = G.pending.list.map(link); }
    if (G.lastFight) { G.lastFight.a = link(G.lastFight.a); G.lastFight.b = link(G.lastFight.b); }
    if (G.lastGuard) G.lastGuard = link(G.lastGuard);
    G.human = 0; G.queue = []; G.online = true; G.fxq = G.fxq || [];
    G.log = function () {};
    return G;
  };
  D.clearEvents = function (G) { EVENTS.forEach(function (k) { G[k] = null; }); G.fxq = []; };

  // 牌組檢查（伺服器用；線上對戰先不檢查收藏，✅ Jay 2026-11-20：帳號先不管）
  D.checkDeck = function (deck) {
    if (!deck || typeof deck !== "object") return "沒有牌組";
    var n = 0, bad = null;
    Object.keys(deck).forEach(function (k) {
      var c = deck[k] | 0; if (c <= 0) return; n += c;
      if (D.ITEM[k]) { if (c > 1) bad = "道具每種只能放 1 張"; }
      else if (D.CARD[k]) { if (c > 4 && D.NO_LIMIT.indexOf(k) < 0) bad = k + " 放太多張"; }
      else bad = "牌組裡有不認得的卡";
    });
    if (bad) return bad;
    if (n !== D.DECK) return "牌組要剛好 " + D.DECK + " 張";
    return null;
  };
})(window.SG);
