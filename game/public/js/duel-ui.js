/* 鬥將模式：畫面（大廳、組牌、對戰、卡牌版卡面） */
(function (SG) {
  var D = SG.DUEL, UI = SG.UI, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return document.querySelectorAll(s); };
  var FV = UI.FV, S = function () { return SG._state; };
  var DU = SG.DuelUI = {};
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms * (SG.DuelUI.speed || 1)); }); };   // speed：測試時加速
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // ===== 卡牌版卡面 =====
  // size：s＝場上／手牌小卡、m＝組牌與收集冊、l＝大卡（看得到標籤、特技、急報）
  DU.face = function (d, size, opt) {
    opt = opt || {};
    var art = opt.art || d.art, bp = opt.bp !== undefined ? opt.bp : d.bp;
    var h = '<div class="dc s-' + size + ' f-' + FV[d.fac] + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.attr || '') + '>' +
      (art ? '<img class="pic" src="img/' + art + '_card.webp" alt="" loading="lazy">' : '<span class="txt">' + d.name + '</span>') +
      '<span class="cost" title="軍餉">' + d.cost + '</span>' + (d.ap > 1 ? '<span class="ap" title="軍令">令' + d.ap + '</span>' : '') +
      '<span class="gen' + (d.gen > 1 ? ' two' : '') + '" title="放後陣產生的軍餉">' + (d.gen > 1 ? '餉2' : '餉') + '</span>' +
      (d.trig ? '<span class="trg">' + d.trig + '</span>' : '') +
      '<span class="bp' + (bp > d.bp ? ' up' : bp < d.bp ? ' dn' : '') + '">' + bp + '</span>' +
      '<span class="nm">' + d.name + '</span>' + (d.skill ? '<span class="sk1">' + (d.personal ? '★' : '') + d.skillName + '</span>' : '');
    if (size === "l") {
      h += '<div class="tx"><div class="tg">' + d.tags.map(function (t) { return '<i class="' + (D.NATIONS.indexOf(t) >= 0 ? 'nat' : D.SET_TAGS[t] ? 'set' : '') + '">' + t + '</i>'; }).join("") + '</div>' +
        (d.skill ? '<p><b>' + (d.personal ? '個人特技・' : '') + d.skillName + '</b><br>' + UI.clauses(d.skillText) + '</p>' : '<p class="dim">沒有特技（兵力 +' + D.VANILLA + '）</p>') +
        (d.trig ? '<p><b class="r">急報・' + d.trig + '</b><br>' + UI.clauses(D.TRIGS[d.trig]) + '</p>' : '') + '</div>';
    }
    return h + '</div>';
  };
  DU.bigCard = function (d, opt) {
    opt = opt || {};
    var n = D.copiesOf(S(), d.name);
    UI.modal('<div class="dbig">' + DU.face(d, "l", { art: opt.art }) + '</div>' +
      '<div class="dmeta"><span>軍餉 <b>' + d.cost + '</b></span><span>軍令 <b>' + d.ap + '</b></span><span>兵力 <b>' + d.bp + '</b></span><span>產餉 <b>' + d.gen + '</b></span><span>' + SG.TYPES[d.typ].name + '</span></div>' +
      '<p class="dim" style="text-align:center">' + (n ? '你最多可以放 ' + n + ' 張（看擁有的最高卡別：N1・R2・SR3・SSR4）' : '還沒擁有這位武將') + '</p>' +
      '<div class="row end"><button onclick="SG.UI.close()">收起</button></div>');
  };
  // 收集冊用：某張卡（含男版）的卡牌版
  DU.forCard = function (card) { return card.ur ? null : D.CARD[card.gen] || null; };

  // ===== 大廳 =====
  UI.r_duel = function () {
    var st = S(); st.duel = st.duel || { deck: {} };
    var deck = st.duel.deck, n = D.deckCount(deck), okDeck = n === D.DECK && DU.deckValid(deck);
    var rec = st.duel.rec || { w: 0, l: 0 };
    $("#s-duel").innerHTML = UI.strip("st-duel", "鬥將", "卡牌對戰・試玩版") +
      '<div class="paper"><div class="row"><div class="grow"><b class="kai" style="font-size:19px">我的牌組</b><div class="dim">' + n + ' / ' + D.DECK + ' 張・' + (okDeck ? '可以出戰' : '要剛好 ' + D.DECK + ' 張才能出戰') + '</div></div>' +
      '<button class="gold" id="du-deck">組牌</button></div>' + (n ? '<div class="curve">' + DU.curve(deck) + '</div>' : '') + '</div>' +
      '<h2>挑戰 <small>戰績 ' + rec.w + ' 勝 ' + rec.l + ' 敗</small></h2><div class="paper flush">' +
      D.OPPONENTS.map(function (o) {
        return '<div class="li"><span class="hd f-' + FV[o.tags[0]] + '"><b style="font-size:16px">' + o.tags[0][0] + '</b></span><div class="grow"><b>' + o.name + '</b><div class="sub">' + o.desc + '・電腦對手</div></div>' +
          '<button class="pri" data-opp="' + o.id + '" ' + (okDeck ? '' : 'disabled') + '>出戰</button></div>';
      }).join("") + '</div>' +
      '<div class="row end"><button class="sm" id="du-rule">規則</button></div>';
    SG.Scene.banner($("#st-duel"), 77);
    $("#du-deck").onclick = function () { DU.bf.inDeck = false; DU.builder(); };   // 從大廳打開時一律顯示全部武將
    $("#du-rule").onclick = DU.rules;
    $$("[data-opp]").forEach(function (b) { b.onclick = function () { DU.start(D.OPPONENTS.find(function (o) { return o.id === b.dataset.opp; })); }; });
    if (!st.duel.seenRule) { st.duel.seenRule = 1; UI.save(); DU.rules(); }
  };
  DU.curve = function (deck) {
    var c = [0, 0, 0, 0, 0, 0, 0]; Object.keys(deck).forEach(function (k) { var d = D.CARD[k]; if (d) c[d.cost] += deck[k]; });
    var mx = Math.max.apply(null, c.concat([1]));
    return c.map(function (v, i) { return '<div><i style="height:' + Math.round(v / mx * 100) + '%"></i><b>' + v + '</b><span>' + i + '</span></div>'; }).join("");
  };
  DU.deckValid = function (deck) { var st = S(); return Object.keys(deck).every(function (k) { return D.CARD[k] && deck[k] <= D.copiesOf(st, k); }); };
  DU.rules = function () {
    UI.modal('<h2>鬥將規則</h2><div class="rules">' +
      '<p><b>目標</b>：打破對方 ' + D.LIFE + ' 道城門。牌組 ' + D.DECK + ' 張，可以混國；每位武將能放幾張，看你擁有她的最高卡別（N1・R2・SR3・SSR4，UR 暫時不能用）。</p>' +
      '<p><b>軍令</b>：出一張卡用 1 道（少數用 2 道）。先攻第 1 回合 1 道、之後 2 道、第 3 回合起 3 道；後攻前兩回合 2 道、之後 3 道。也可以花 1 道多抽 1 張。</p>' +
      '<p><b>軍餉</b>：卡片左上的數字。後陣每位武將產 1 份軍餉（內政產 2 份），後陣的軍餉夠才能出這張卡；軍餉不會用掉。</p>' +
      '<p><b>後陣與前陣</b>：各 4 格。剛出陣的武將休整中（變灰），下回合才能行動。後陣的武將可以移上前陣，但前陣的不產軍餉。</p>' +
      '<p><b>進攻</b>：點前陣可行動的武將進攻對方城門。對方可以用前陣可行動的武將格擋：兵力高的贏，一樣高比武力；格擋輸的被擊退，進攻方輸了不會死。沒人擋就破 1 道城門。</p>' +
      '<p><b>急報</b>：城門被破時會翻開一張卡，帶「援軍、伏兵、反擊」的卡會立刻生效。</p>' +
      '<p><b>標籤</b>：國家、五虎將、謀士…。5 人以下的標籤全員都在場上（前陣＋後陣）時，成員兵力各 +' + D.SET_BONUS + '。</p>' +
      '<p class="dim">試玩版：數值、牌組張數、城門道數都是暫定，之後會調。</p></div>' +
      '<div class="row end"><button onclick="SG.UI.close()">知道了</button></div>');
  };

  // ===== 組牌 =====
  DU.bf = { nat: "全部", cost: "全部" };
  DU.builder = function () {
    var st = S(), deck = st.duel.deck, avail = D.owned(st);
    // 拿掉已經不夠的張數（例如合成後卡別變了不會變少，但賣掉或重置時）
    Object.keys(deck).forEach(function (k) { var mx = D.copiesOf(st, k); if (deck[k] > mx) deck[k] = mx; if (!deck[k]) delete deck[k]; });
    var n = D.deckCount(deck);
    var list = avail.filter(function (x) { return (DU.bf.nat === "全部" || x.d.fac === DU.bf.nat) && (DU.bf.cost === "全部" || x.d.cost === +DU.bf.cost) && (!DU.bf.inDeck || deck[x.d.name]); })
      .sort(function (a, b) { return a.d.cost - b.d.cost || b.d.bp - a.d.bp; });
    var chips = function (key, cur, arr) { return arr.map(function (v) { return '<button class="chip' + (String(v) === String(cur) ? ' on' : '') + '" data-bf="' + key + '" data-v="' + v + '">' + v + '</button>'; }).join(""); };
    UI.modal('<div class="dbuild"><div class="dbtop"><b class="kai">組牌</b><span class="cnt' + (n === D.DECK ? ' ok' : n > D.DECK ? ' over' : '') + '">' + n + ' / ' + D.DECK + '</span>' +
      '<span class="grow"></span><button class="sm" id="db-auto">一鍵組牌</button><button class="sm plain" id="db-clr">清空</button><button class="sm pri" id="db-ok">完成</button></div>' +
      '<div class="curve sm">' + DU.curve(deck) + '</div>' +
      '<div class="filters"><div><span>國家</span>' + chips("nat", DU.bf.nat, ["全部"].concat(D.NATIONS)) + '</div><div><span>軍餉</span>' + chips("cost", DU.bf.cost, ["全部", 0, 1, 2, 3, 4, 5, 6]) +
      '<button class="chip' + (DU.bf.inDeck ? ' on' : '') + '" id="db-in">只看牌組</button></div></div>' +
      (function () { var z = Object.keys(deck).reduce(function (a, k) { return a + (D.CARD[k] && D.CARD[k].cost === 0 ? deck[k] : 0); }, 0); return z < 6 && n ? '<p class="warn">0 費卡只有 ' + z + ' 張，建議至少 6 張，不然常常第一回合出不了卡。</p>' : ''; })() +
      '<p class="dim">擁有 ' + avail.length + ' 位武將可用。點卡片看詳情，按 ＋／－ 調整張數。</p>' +
      '<div class="dgrid">' + list.map(function (x) {
        var k = deck[x.d.name] || 0;
        return '<div class="dcell' + (k ? ' in' : '') + '">' + DU.face(x.d, "m", { attr: ' data-big="' + esc(x.d.name) + '"' }) +
          '<div class="pm"><button class="sm" data-pm="-1" data-n="' + esc(x.d.name) + '" ' + (k ? '' : 'disabled') + '>－</button><b>' + k + '/' + x.n + '</b><button class="sm" data-pm="1" data-n="' + esc(x.d.name) + '" ' + (k < x.n && n < D.DECK ? '' : 'disabled') + '>＋</button></div></div>';
      }).join("") + (list.length ? '' : '<p class="dim" style="grid-column:1/-1;text-align:center">' + (DU.bf.inDeck && !n ? '牌組還是空的。按「一鍵組牌」，或再按一次「只看牌組」看全部武將。' : '沒有符合的武將') + '</p>') + '</div></div>');
    var keep = $("#modal-body").scrollTop;
    var redo = function () { var y = $("#modal-body").scrollTop; UI.save(); DU.builder(); $("#modal-body").scrollTop = y; };
    $$("[data-bf]").forEach(function (b) { b.onclick = function () { DU.bf[b.dataset.bf] = b.dataset.v; redo(); }; });
    $("#db-in").onclick = function () { DU.bf.inDeck = !DU.bf.inDeck; redo(); };
    $$("[data-pm]").forEach(function (b) { b.onclick = function () { var k = b.dataset.n; deck[k] = Math.max(0, (deck[k] || 0) + +b.dataset.pm); if (!deck[k]) delete deck[k]; redo(); }; });
    $$("[data-big]").forEach(function (c) { c.onclick = function () { DU.bigCard(D.CARD[c.dataset.big]); }; });
    $("#db-auto").onclick = function () { st.duel.deck = deck = D.autoDeck(avail, D.DECK); redo(); if (D.deckCount(deck) < D.DECK) UI.flash("武將不夠湊滿 " + D.DECK + " 張"); };
    $("#db-clr").onclick = function () { st.duel.deck = deck = {}; redo(); };
    $("#db-ok").onclick = function () { UI.save(); UI.close(); UI.r_duel(); };
    $("#modal-body").scrollTop = keep;
  };

  // ===== 對戰 =====
  var G = null, sel = null, busy = false, opp = null;
  DU.start = function (o) {
    var st = S(); opp = o;
    G = D.newGame(Object.assign({}, st.duel.deck), D.oppDeck(o), { human: 0 });
    if (D.noZero(G.p[1])) D.mulligan(G, 1);
    sel = null; busy = false;
    UI.go("duelb");
    DU.render();
    var hand = G.p[0].hand.map(function (d) { return DU.face(d, "s"); }).join("");
    UI.modal('<h2>' + o.name + '</h2><p>' + (G.first === 0 ? '你<b>先攻</b>（第 1 回合 1 道軍令、不抽牌）。' : '你<b>後攻</b>（前兩回合各 2 道軍令）。') + '</p>' +
      '<p class="dim">起手 ' + D.HAND + ' 張，可以換一次。</p><p class="warn" id="mul-w"' + (D.noZero(G.p[0]) ? '' : ' hidden') + '>起手沒有 0 費卡，第一回合會出不了卡，建議換手牌。</p><div class="dhandpv" id="mul-pv">' + hand + '</div>' +
      '<div class="row end"><button id="mul-re">換一次手牌</button><button class="pri" id="mul-go">開戰</button></div>');
    $("#mul-re").onclick = function () { D.mulligan(G, 0); $("#mul-pv").innerHTML = G.p[0].hand.map(function (d) { return DU.face(d, "s"); }).join(""); $("#mul-w").hidden = !D.noZero(G.p[0]); this.disabled = true; };
    $("#mul-go").onclick = function () { UI.close(); D.startTurn(G); DU.render(); if (G.cur === 1) DU.aiTurn(); };
  };
  function sideHtml(P, who) {
    var row = function (zone, label) {
      var arr = P[zone], cells = "";
      for (var i = 0; i < (zone === "front" ? D.FRONT : D.BACK); i++) {
        var u = arr[i];
        if (!u) { cells += '<div class="slot"></div>'; continue; }
        var bp = D.bp(P, u), can = who === 0 && G.cur === 0 && !busy;
        var hint = can && zone === "front" && D.canAttack(G, 0, u) ? ' can' : can && zone === "back" && G.phase === "main" && P.front.length < D.FRONT ? ' mv' : '';
        cells += '<div class="slot">' + DU.face(u.d, "s", { bp: bp, cls: (u.act ? '' : 'rest') + (u.frozen ? ' frz' : '') + (sel && sel.u === u.id ? ' sel' : '') + hint, attr: ' data-u="' + u.id + '" data-w="' + who + '"' }) + '</div>';
      }
      return '<div class="drow ' + zone + '"><span class="lab">' + label + '</span>' + cells + '</div>';
    };
    var life = ''; for (var i = 0; i < D.LIFE; i++) life += '<i class="' + (i < P.life.length ? 'on' : '') + '"></i>';
    var ap = ''; for (var j = 0; j < Math.max(P.apMax, 1); j++) ap += '<i class="' + (j < P.ap && G.cur === who ? 'on' : '') + '"></i>';
    var bar = '<div class="dbar' + (G.cur === who ? ' now' : '') + '"><b class="kai">' + (who === 0 ? '我方' : opp.name) + '</b><span class="gate" title="城門">城門 ' + life + '</span>' +
      '<span>餉 <b>' + D.energy(P) + '</b></span><span class="aps">令 ' + ap + '</span><span class="dim">手 ' + P.hand.length + '・庫 ' + P.deck.length + '</span></div>';
    return who === 1 ? bar + row("back", "後陣") + row("front", "前陣") : row("front", "前陣") + row("back", "後陣") + bar;
  }
  DU.render = function () {
    if (!G) return;
    var me = G.p[0];
    var hand = me.hand.map(function (d, i) {
      var ok = G.cur === 0 && !busy && D.canPlay(G, 0, d);
      return DU.face(d, "s", { cls: (ok ? 'ok' : 'no') + (sel && sel.h === i ? ' sel' : ''), attr: ' data-h="' + i + '"' });
    }).join("");
    var turnTxt = G.winner >= 0 ? (G.winner === 0 ? '勝利' : '敗北') : (G.cur === 0 ? '我方回合' : '敵方回合') + '・第 ' + G.p[G.cur].t + ' 回合' + (G.cur === 0 ? (G.phase === "attack" ? '・進攻中（不能再出牌）' : '') : '');
    var logs = G.logs.slice(-3).map(function (t) { return '<div>' + esc(t) + '</div>'; }).join("");
    $("#s-duelb").innerHTML = '<div class="dfield">' + sideHtml(G.p[1], 1) + '<div class="dmid"><b>' + turnTxt + '</b><div class="dlog">' + logs + '</div></div>' + sideHtml(me, 0) + '</div>' +
      '<div class="dhand">' + (hand || '<span class="dim">沒有手牌</span>') + '</div>' +
      '<div class="dact" id="dact">' + actHtml() + '</div>';
    $$("#s-duelb [data-h]").forEach(function (c) { c.onclick = function () { if (busy || G.cur !== 0) return DU.bigCard(me.hand[+c.dataset.h]); sel = sel && sel.h === +c.dataset.h ? null : { h: +c.dataset.h }; DU.render(); }; });
    $$("#s-duelb [data-u]").forEach(function (c) {
      c.onclick = function () {
        var w = +c.dataset.w, id = +c.dataset.u, P = G.p[w], u = D.field(P).find(function (x) { return x.id === id; });
        if (w === 1 || busy || G.cur !== 0) return DU.bigCard(u.d);
        sel = sel && sel.u === id ? null : { u: id }; DU.render();
      };
    });
    bindAct();
  };
  function actHtml() {
    if (!G || G.winner >= 0) return '<button class="pri" id="da-leave">離開</button>';
    if (G.cur !== 0 || busy) return '<span class="dim">敵方行動中…</span><span class="grow"></span><button class="sm plain" id="da-quit">投降</button>';
    var me = G.p[0], h = '';
    if (sel && sel.h !== undefined) {
      var d = me.hand[sel.h], ok = d && D.canPlay(G, 0, d);
      var why = !d ? '' : G.phase !== "main" ? '進攻後不能再出牌' : me.ap < d.ap ? '軍令不夠' : D.energy(me) < d.cost ? '軍餉不夠（要 ' + d.cost + '，後陣有 ' + D.energy(me) + '）' : '';
      h = '<b class="kai">' + d.name + '</b>' + (ok ? (d.name === "張遼" ? '' : '<button id="da-back" ' + (me.back.length < D.BACK ? '' : 'disabled') + '>放後陣</button>') + '<button class="pri" id="da-front" ' + (me.front.length < D.FRONT ? '' : 'disabled') + '>放前陣</button>' : '<span class="dim">' + why + '</span>') + '<button class="sm plain" id="da-see">看卡</button>';
    } else if (sel && sel.u !== undefined) {
      var u = D.field(me).find(function (x) { return x.id === sel.u; });
      if (u) {
        var inBack = me.back.indexOf(u) >= 0;
        h = '<b class="kai">' + u.d.name + '</b>' + (inBack ? '<button id="da-move" ' + (G.phase === "main" && me.front.length < D.FRONT ? '' : 'disabled') + '>移上前陣</button>'
          : '<button class="pri" id="da-atk" ' + (D.canAttack(G, 0, u) ? '' : 'disabled') + '>進攻</button>' + (u.act ? '' : '<span class="dim">休整中</span>')) + '<button class="sm plain" id="da-see">看卡</button>';
      }
    } else {
      var stuck = G.phase === "main" && !me.hand.some(function (c) { return D.canPlay(G, 0, c); }) && D.energy(me) === 0;
      h = '<span class="dim">' + (stuck ? '沒有能出的卡：後陣沒軍餉時只能出 0 費卡，可以花軍令多抽' : '點手牌出陣・點前陣武將進攻') + '</span>';
    }
    return h + '<span class="grow"></span><button class="sm" id="da-draw" ' + (G.phase === "main" && me.ap >= 1 && me.deck.length ? '' : 'disabled') + '>多抽（1令）</button><button class="gold" id="da-end">結束回合</button><button class="sm plain" id="da-menu">⋯</button>';
  }
  function bindAct() {
    var on = function (id, fn) { var b = document.getElementById(id); if (b) b.onclick = fn; };
    on("da-leave", DU.leave);
    on("da-quit", function () { DU.confirmQuit(); });
    on("da-menu", function () {
      UI.modal('<h2>選單</h2><div class="row"><button id="dm-rule">規則</button><button class="plain" id="dm-quit">投降</button><span class="grow"></span><button onclick="SG.UI.close()">繼續</button></div>');
      $("#dm-rule").onclick = DU.rules; $("#dm-quit").onclick = DU.confirmQuit;
    });
    on("da-see", function () { var me = G.p[0]; var d = sel.h !== undefined ? me.hand[sel.h] : D.field(me).find(function (x) { return x.id === sel.u; }).d; DU.bigCard(d); });
    on("da-back", function () { play("back"); });
    on("da-front", function () { play("front"); });
    on("da-move", function () { D.move(G, 0, sel.u); sel = null; DU.render(); });
    on("da-atk", function () { var id = sel.u; sel = null; doAttack(id); });
    on("da-draw", function () { D.extraDraw(G, 0); sel = null; DU.render(); });
    on("da-end", function () {
      var me = G.p[0], idle = me.front.filter(function (u) { return u.act; }).length;
      var go = function () { UI.close(); sel = null; D.endTurn(G); DU.render(); if (G.winner < 0) DU.aiTurn(); else DU.over(); };
      if (idle) { UI.modal('<h2>結束回合？</h2><p>前陣還有 ' + idle + ' 位可以進攻。</p><div class="row end"><button onclick="SG.UI.close()">回去</button><button class="pri" id="de-go">結束</button></div>'); $("#de-go").onclick = go; }
      else go();
    });
  }
  function play(zone) {
    var i = sel.h; sel = null;
    D.play(G, 0, i, zone);
    afterAction();
  }
  function afterAction() {
    DU.render(); flipPop();
    if (G.pending && G.pending.type === "discard") return DU.discardPick();
    if (G.winner >= 0) return DU.over();
  }
  async function doAttack(id) {
    busy = true; DU.render();
    D.attack(G, 0, id);
    await fightFx();
    busy = false; afterAction();
  }
  // 戰鬥演出：格擋結果、城門被破翻開的卡
  async function fightFx() {
    var f = G.lastFight; G.lastFight = null;
    if (!f) return;
    if (f.b) UI.banner(f.win ? f.b.d.name + " 被擊退" : "擋下了！", f.win ? "#ff9c7a" : "#cfe6ff");
    DU.render(); flipPop();
    await wait(f.b ? 900 : 700);
  }
  function flipPop() {
    var f = G.lastFlip; if (!f) return; G.lastFlip = null;
    var el = document.createElement("div"); el.className = "dflip " + (f.who === 0 ? "mine" : "theirs");
    el.innerHTML = '<div class="t">' + (f.who === 0 ? '我方' : '敵方') + '城門被破</div>' + DU.face(f.d, "m") + (f.d.trig ? '<div class="g">急報・' + f.d.trig + '</div>' : '');
    document.body.appendChild(el); setTimeout(function () { el.classList.add("out"); setTimeout(function () { el.remove(); }, 400); }, 1100);
  }
  DU.discardPick = function () {
    var O = G.p[1];
    UI.modal('<h2>臥龍</h2><p>挑一張對方的手牌丟掉。</p><div class="dhandpv">' + O.hand.map(function (d, i) { return DU.face(d, "s", { attr: ' data-dis="' + i + '"' }); }).join("") + '</div>');
    $$("[data-dis]").forEach(function (c) { c.onclick = function () { D.chooseDiscard(G, +c.dataset.dis); UI.close(); afterAction(); }; });
  };
  // 敵方回合
  DU.aiTurn = async function () {
    busy = true; DU.render();
    await wait(600);
    for (var guard = 0; guard < 80 && G && G.winner < 0 && G.cur === 1; guard++) {
      var act = D.aiNext(G);
      if (!act) break;
      D.aiDo(G, act);
      if (G.pending && G.pending.type === "block") { DU.render(); await askBlock(); }
      DU.render(); flipPop();
      await wait(act.t === "attack" ? 700 : 650);
      if (G.lastFight) await fightFx();
    }
    if (!G || G.winner >= 0) { busy = false; DU.render(); return DU.over(); }
    D.endTurn(G); busy = false; DU.render();
    if (G.winner >= 0) DU.over(); else UI.banner("我方回合", "#ecd391");
  };
  function askBlock() {
    return new Promise(function (res) {
      var pd = G.pending, a = pd.a, abp = D.bp(G.p[1], a), me = G.p[0];
      var rows = pd.list.map(function (v) {
        var b = D.bp(me, v, true), win = b > abp || (b === abp && v.d.w > a.d.w);
        return '<div class="li">' + DU.face(v.d, "s", { bp: b }) + '<div class="grow"><b>' + v.d.name + '</b><div class="sub">兵力 ' + b + '・' + (win ? '擋得住' : '會被擊退') + '</div></div><button class="' + (win ? 'pri' : '') + '" data-blk="' + v.id + '">格擋</button></div>';
      }).join("");
      UI.modal('<h2>敵軍來攻</h2><div class="li">' + DU.face(a.d, "s", { bp: abp }) + '<div class="grow"><b>' + a.d.name + '</b><div class="sub">兵力 ' + abp + (a.d.name === "趙雲" ? '・只能用兵力比她高的格擋' : '') + '</div></div></div>' +
        '<p>要派誰格擋？不擋的話城門會被破 1 道（剩 ' + (me.life.length - 1) + ' 道）。</p><div>' + rows + '</div>' +
        '<div class="row end"><button class="plain" id="blk-no">不擋</button></div>');
      var done = function (id) { UI.close(); D.block(G, id); res(); };
      $$("[data-blk]").forEach(function (b) { b.onclick = function () { done(+b.dataset.blk); }; });
      $("#blk-no").onclick = function () { done(null); };
    });
  }
  DU.confirmQuit = function () {
    UI.modal('<h2>投降？</h2><p>這場算敗北。</p><div class="row end"><button onclick="SG.UI.close()">繼續打</button><button class="pri" id="dq-ok">投降</button></div>');
    $("#dq-ok").onclick = function () { UI.close(); G.winner = 1; DU.render(); DU.over(); };
  };
  DU.over = function () {
    if (!G || G.recorded) return; G.recorded = true;
    var st = S(), win = G.winner === 0; st.duel.rec = st.duel.rec || { w: 0, l: 0 }; st.duel.rec[win ? "w" : "l"]++; UI.save();
    setTimeout(function () {
      UI.modal('<h2>' + (win ? '勝利' : '敗北') + '</h2><p>' + (win ? '攻破了' + opp.name + '的城門。' : '我方城門被攻破了。') + '</p>' +
        '<p class="dim">共 ' + G.turn + ' 回合。試玩版暫時沒有獎勵。</p><div class="row end"><button id="do-again">再戰一場</button><button class="pri" id="do-back">返回</button></div>');
      $("#do-again").onclick = function () { UI.close(); DU.start(opp); };
      $("#do-back").onclick = function () { UI.close(); DU.leave(); };
    }, 700);
  };
  DU.leave = function () { G = null; UI.go("duel"); };
  DU._game = function () { return G; };   // 測試用
})(window.SG);
