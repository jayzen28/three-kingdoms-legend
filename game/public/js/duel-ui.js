/* 鬥將模式：畫面（大廳、組牌、對戰、卡牌版卡面） */
(function (SG) {
  var D = SG.DUEL, UI = SG.UI, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return document.querySelectorAll(s); };
  var FV = UI.FV, S = function () { return SG._state; };
  var DU = SG.DuelUI = {};
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms * (SG.DuelUI.speed || 1)); }); };   // speed：測試時加速
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var CLOSE = '<button class="dx" onclick="SG.UI.close()">收起</button>';   // ✅ Jay：收起放上面，不用滑

  // ===== 卡面 =====
  // size：s＝場上／手牌小卡、m＝組牌與收集冊、l＝大卡（簡潔版）、u＝大卡（完整版，參考 UA 卡的排法）
  DU.face = function (d, size, opt) {
    opt = opt || {};
    if (d.item) return DU.itemFace(d, size, opt);
    if (size === "u") return DU.faceU(d, opt);
    var art = opt.art || d.art, bp = opt.bp !== undefined ? opt.bp : d.bp, full = opt.full !== undefined ? opt.full : d.bp;
    var h = '<div class="dc s-' + size + ' f-' + FV[d.fac] + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.attr || '') + '>' +
      (art ? '<img class="pic" src="img/' + art + '_card.webp" alt="" loading="lazy">' : '<span class="txt">' + d.name + '</span>') +
      '<span class="cost" title="軍餉">' + d.cost + '</span>' + (d.ap > 1 ? '<span class="ap" title="軍令">令' + d.ap + '</span>' : '') +
      (d.gen > 1 ? '<span class="gen two" title="放後陣產 2 份軍餉">餉2</span>' : '') +
      (d.trig ? '<span class="trg t-' + d.trig + '" title="急報・' + d.trig + '">急</span>' : '') +
      '<span class="bp' + (bp > full ? ' up' : bp < full ? ' dn' : '') + '">' + bp + '</span>' +
      '<span class="nm">' + d.name + '</span>' + (d.skill ? '<span class="sk1">' + (d.personal ? '★' : '') + d.skillName + '</span>' : '');
    if (size === "l") {
      h += '<div class="tx"><div class="tg">' + d.tags.map(function (t) { return '<i class="' + (D.NATIONS.indexOf(t) >= 0 ? 'nat' : D.SET_TAGS[t] ? 'set' : '') + '">' + t + '</i>'; }).join("") + '</div>' +
        '<p><b>' + (d.personal ? '個人特技・' : '') + d.skillName + '</b><br>' + UI.clauses(d.skillText) + '</p>' +
        (d.trig ? '<p><b class="r">急報・' + d.trig + '</b><br>' + UI.clauses(D.TRIGS[d.trig]) + '</p>' : '') + '</div>';
    }
    return h + '</div>';
  };
  // 完整版大卡（✅ Jay 2026-11-20：多做一個類似 UA 卡的版本，立繪不變）
  DU.faceU = function (d, opt) {
    var art = (opt && opt.art) || d.art, orbs = '';
    for (var i = 0; i < d.gen; i++) orbs += '<i></i>';
    var tags = d.tags.filter(function (t) { return D.NATIONS.indexOf(t) < 0; });
    return '<div class="dcu f-' + FV[d.fac] + '">' + (art ? '<img class="pic" src="img/' + art + '_card.webp" alt="">' : '') +
      '<div class="dhd"><div class="cst"><small>軍餉</small><b>' + d.cost + '</b></div><div class="apl">軍令<b>' + d.ap + '</b></div>' +
      '<div class="ttl"><b>' + d.name + '</b><small>' + d.fac + (tags.length ? '・' + tags.join("・") : '') + '</small></div></div>' +
      '<div class="box"><span class="kind">武將・' + SG.TYPES[d.typ].name + '</span>' +
      '<div class="eff">' + (d.personal ? '<span class="tm">個人特技</span>' : '<span class="tm g">特技</span>') + '<b>' + d.skillName + '</b>' + d.skillText + '</div>' +
      (d.trig ? '<div class="trg"><span>' + d.trig + '</span>' + D.TRIGS[d.trig].replace(/^城門被破、翻到這張時，?/, '') + '</div><em class="trt">急報</em>' : '') + '</div>' +
      '<div class="ft"><span class="bp">' + d.bp + '<small>兵力</small></span><span class="orbs" title="放後陣產生的軍餉">' + orbs + '<small>餉</small></span></div></div>';
  };
  DU.itemFace = function (it, size, opt) {
    opt = opt || {};
    var art = '<img class="pic" src="img/item_' + it.id + '.webp" alt="" onerror="this.remove()">';
    if (size === "u" || size === "l") {
      return '<div class="dcu item">' + art + '<div class="dhd"><div class="cst"><small>軍令</small><b>' + it.ap + '</b></div><div class="ttl"><b>' + it.name + '</b><small>道具・每副牌組限 1 張</small></div></div>' +
        '<div class="box"><span class="kind">道具</span><div class="eff">' + it.text + '</div></div></div>';
    }
    return '<div class="dc s-' + size + ' item' + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.attr || '') + '>' + art +
      '<span class="cost ap0" title="軍令">' + it.ap + '</span><span class="ikind">道具</span><span class="nm">' + it.name + '</span></div>';
  };
  DU.bigStyle = function () { try { return localStorage.getItem("sgl_duel_face") || "u"; } catch (e) { return "u"; } };
  DU.bigCard = function (d, opt) {
    opt = opt || {};
    var st = DU.bigStyle(), body;
    if (d.item) body = '<div class="dbig">' + DU.itemFace(d, "u") + '</div><p class="dim" style="text-align:center">道具卡：每種一副牌組只能放 1 張。</p>';
    else {
      var n = D.copiesOf(S(), d.name);
      body = '<div class="dbig">' + DU.face(d, st, { art: opt.art }) + '</div>' +
        (st === "l" ? '<div class="dmeta"><span>軍餉 <b>' + d.cost + '</b></span><span>軍令 <b>' + d.ap + '</b></span><span>兵力 <b>' + d.bp + '</b></span><span>產餉 <b>' + d.gen + '</b></span><span>' + SG.TYPES[d.typ].name + '</span></div>' : '') +
        '<p class="dim" style="text-align:center">' + (D.NO_LIMIT.indexOf(d.name) >= 0 ? (n ? '擁有她就能放，張數不限' : '還沒擁有這位武將') : n ? '你最多可以放 ' + n + ' 張（看擁有的最高卡別：N1・R2・SR3・SSR4）' : '還沒擁有這位武將') + '</p>';
    }
    UI.modal('<div class="dtop">' + (d.item ? '' : '<span class="seg"><button class="chip' + (st === "u" ? ' on' : '') + '" data-fs="u">完整版</button><button class="chip' + (st === "l" ? ' on' : '') + '" data-fs="l">簡潔版</button></span>') + '<span class="grow"></span>' + CLOSE + '</div>' + body);
    $$("[data-fs]").forEach(function (b) { b.onclick = function () { try { localStorage.setItem("sgl_duel_face", b.dataset.fs); } catch (e) {} DU.bigCard(d, opt); }; });
  };
  DU.forCard = function (card) { return card.ur && !(card.urOnly && D.UR_OK.indexOf(card.gen) >= 0) ? null : D.CARD[card.gen] || null; };

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
    if (!st.duel.seenRule2) { st.duel.seenRule2 = 1; UI.save(); DU.rules(); }
  };
  DU.curve = function (deck) {
    var c = [0, 0, 0, 0, 0, 0, 0], items = 0;
    Object.keys(deck).forEach(function (k) { var d = D.CARD[k]; if (d) c[d.cost] += deck[k]; else if (D.ITEM[k]) items += deck[k]; });
    var mx = Math.max.apply(null, c.concat([1, items]));
    return c.map(function (v, i) { return '<div><i style="height:' + Math.round(v / mx * 100) + '%"></i><b>' + v + '</b><span>' + i + '</span></div>'; }).join("") +
      '<div class="it"><i style="height:' + Math.round(items / mx * 100) + '%"></i><b>' + items + '</b><span>道具</span></div>';
  };
  DU.deckValid = function (deck) { var st = S(); return Object.keys(deck).every(function (k) { return D.CARD[k] ? deck[k] <= D.copiesOf(st, k) : D.ITEM[k] ? deck[k] <= 1 : false; }); };
  DU.rules = function () {
    UI.modal('<div class="dtop"><b class="kai" style="font-size:20px">鬥將規則</b><span class="grow"></span>' + CLOSE + '</div><div class="rules">' +
      '<p><b>目標</b>：打破對方 ' + D.LIFE + ' 道城門。牌組 ' + D.DECK + ' 張，可以混國；每位武將能放幾張，看你擁有她的最高卡別（N1・R2・SR3・SSR4，UR 暫時不能用，呂布例外）。道具卡每種只能放 1 張。</p>' +
      '<p><b>軍令</b>：出一張卡用 1 道（少數用 2 道）。先攻第 1 回合 1 道、之後 2 道、第 3 回合起 3 道；後攻前兩回合 2 道、之後 3 道。也可以花 1 道多抽 1 張。</p>' +
      '<p><b>軍餉</b>：卡片左上的數字。後陣每位武將產 1 份軍餉（內政產 2 份），後陣的軍餉夠才能出這張卡；軍餉不會用掉。</p>' +
      '<p><b>後陣與前陣</b>：各 4 格。剛出陣的武將休整中（變灰），下回合才能行動。後陣的武將可以移上前陣，但前陣的不產軍餉。</p>' +
      '<p><b>進攻與格擋</b>：點前陣可行動的武將進攻對方城門。對方可以用前陣的武將格擋：兩邊互扣兵力，扣光的被擊退（一樣多就同歸於盡）。受的傷留到這回合結束，結束後補滿；受傷的武將還能繼續格擋。沒人擋就破 1 道城門。</p>' +
      '<p><b>急報</b>：卡片右上有「急」的卡，城門被破翻到時會生效（援軍、伏兵、反擊）。</p>' +
      '<p><b>標籤</b>：國家、五虎將、謀士…。5 人以下的標籤全員都在場上時，成員兵力各 +' + D.SET_BONUS + '。</p>' +
      '<p class="dim">試玩版：數值、牌組張數、城門道數都是暫定，之後會調。</p></div>');
  };

  // ===== 組牌 =====
  DU.bf = { nat: "全部", cost: "全部" };
  DU.builder = function () {
    var st = S(), deck = st.duel.deck, avail = D.owned(st);
    Object.keys(deck).forEach(function (k) { if (D.ITEM[k]) { if (deck[k] > 1) deck[k] = 1; return; } var mx = D.copiesOf(st, k); if (deck[k] > mx) deck[k] = mx; if (!deck[k]) delete deck[k]; });
    var n = D.deckCount(deck);
    var list = avail.filter(function (x) { return (DU.bf.nat === "全部" || x.d.fac === DU.bf.nat) && (DU.bf.cost === "全部" || x.d.cost === +DU.bf.cost) && (!DU.bf.inDeck || deck[x.d.name]); })
      .sort(function (a, b) { return a.d.cost - b.d.cost || b.d.bp - a.d.bp; });
    var chips = function (key, cur, arr) { return arr.map(function (v) { return '<button class="chip' + (String(v) === String(cur) ? ' on' : '') + '" data-bf="' + key + '" data-v="' + v + '">' + v + '</button>'; }).join(""); };
    var cell = function (d, k, mx, key) {
      return '<div class="dcell' + (k ? ' in' : '') + '">' + DU.face(d, "m", { attr: ' data-big="' + esc(key) + '"' }) +
        '<div class="pm"><button class="sm" data-pm="-1" data-n="' + esc(key) + '" ' + (k ? '' : 'disabled') + '>－</button><b>' + k + '/' + (mx >= D.DECK ? '∞' : mx) + '</b><button class="sm" data-pm="1" data-n="' + esc(key) + '" ' + (k < mx && n < D.DECK ? '' : 'disabled') + '>＋</button></div></div>';
    };
    var items = D.ITEMS.filter(function () { return !DU.bf.inDeck; }).map(function (it) { var key = D.itemKey(it.id); return (!DU.bf.inDeck || deck[key]) ? cell(it, deck[key] || 0, 1, key) : ''; }).join("");
    var z = Object.keys(deck).reduce(function (a, k) { return a + (D.CARD[k] && D.CARD[k].cost === 0 ? deck[k] : 0); }, 0);
    UI.modal('<div class="dbuild"><div class="dbtop"><b class="kai">組牌</b><span class="cnt' + (n === D.DECK ? ' ok' : n > D.DECK ? ' over' : '') + '">' + n + ' / ' + D.DECK + '</span>' +
      '<span class="grow"></span><button class="sm" id="db-auto">一鍵組牌</button><button class="sm plain" id="db-clr">清空</button><button class="sm pri" id="db-ok">完成</button></div>' +
      '<div class="curve sm">' + DU.curve(deck) + '</div>' +
      '<div class="filters"><div><span>國家</span>' + chips("nat", DU.bf.nat, ["全部"].concat(D.NATIONS)) + '</div><div><span>軍餉</span>' + chips("cost", DU.bf.cost, ["全部", 0, 1, 2, 3, 4, 5, 6]) +
      '<button class="chip' + (DU.bf.inDeck ? ' on' : '') + '" id="db-in">只看牌組</button></div></div>' +
      (z < 6 && n ? '<p class="warn">0 費卡只有 ' + z + ' 張，建議至少 6 張，不然常常第一回合出不了卡。</p>' : '') +
      (items && DU.bf.nat === "全部" && DU.bf.cost === "全部" ? '<h3 class="dsub">道具卡 <small>每種限 1 張・試玩期大家都有</small></h3><div class="dgrid">' + items + '</div><h3 class="dsub">武將</h3>' : '') +
      '<p class="dim">擁有 ' + avail.length + ' 位武將可用。點卡片看詳情，按 ＋／－ 調整張數。</p>' +
      '<div class="dgrid">' + list.map(function (x) { return cell(x.d, deck[x.d.name] || 0, x.n, x.d.name); }).join("") +
      (list.length ? '' : '<p class="dim" style="grid-column:1/-1;text-align:center">' + (DU.bf.inDeck && !n ? '牌組還是空的。按「一鍵組牌」，或再按一次「只看牌組」看全部武將。' : '沒有符合的武將') + '</p>') + '</div></div>');
    var keep = $("#modal-body").scrollTop;
    var redo = function () { var y = $("#modal-body").scrollTop; UI.save(); DU.builder(); $("#modal-body").scrollTop = y; };
    $$("[data-bf]").forEach(function (b) { b.onclick = function () { DU.bf[b.dataset.bf] = b.dataset.v; redo(); }; });
    $("#db-in").onclick = function () { DU.bf.inDeck = !DU.bf.inDeck; redo(); };
    $$("[data-pm]").forEach(function (b) { b.onclick = function () { var k = b.dataset.n; deck[k] = Math.max(0, (deck[k] || 0) + +b.dataset.pm); if (!deck[k]) delete deck[k]; redo(); }; });
    $$("[data-big]").forEach(function (c) { c.onclick = function () { var k = c.dataset.big; DU.bigCard(D.CARD[k] || D.ITEM[k]); }; });
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
    var hand = function () { return G.p[0].hand.map(function (d) { return DU.face(d, "s"); }).join(""); };
    UI.modal('<h2>' + o.name + '</h2><p>' + (G.first === 0 ? '你<b>先攻</b>（第 1 回合 1 道軍令、不抽牌）。' : '你<b>後攻</b>（前兩回合各 2 道軍令）。') + '</p>' +
      '<p class="dim">起手 ' + D.HAND + ' 張，可以換一次。</p><p class="warn" id="mul-w"' + (D.noZero(G.p[0]) ? '' : ' hidden') + '>起手沒有 0 費卡，第一回合會出不了卡，建議換手牌。</p><div class="dhandpv" id="mul-pv">' + hand() + '</div>' +
      '<div class="row end"><button id="mul-re">換一次手牌</button><button class="pri" id="mul-go">開戰</button></div>');
    $("#mul-re").onclick = function () { D.mulligan(G, 0); $("#mul-pv").innerHTML = hand(); $("#mul-w").hidden = !D.noZero(G.p[0]); this.disabled = true; };
    $("#mul-go").onclick = function () { UI.close(); D.startTurn(G); afterAction(); if (G.cur === 1) DU.aiTurn(); };
  };
  // 指定目標的時候，哪些格子可以點
  function isTarget(u, who) {
    if (!sel || sel.mode !== "tgt") return false;
    var me = G.p[0], O = G.p[1];
    if (sel.kind === "swap") return who === 0 && me.front.indexOf(u) >= 0;
    if (sel.kind === "snipe") return who === 1 && O.back.indexOf(u) >= 0;
    if (sel.kind === "lubu") return who === 1 && O.front.indexOf(u) >= 0;
    if (sel.kind === "item") return who === 0;
    return false;
  }
  function sideHtml(P, who) {
    var row = function (zone, label) {
      var arr = P[zone], cells = "";
      for (var i = 0; i < (zone === "front" ? D.FRONT : D.BACK); i++) {
        var u = arr[i];
        if (!u) { cells += '<div class="slot"></div>'; continue; }
        var can = who === 0 && G.cur === 0 && !busy && !(sel && sel.mode === "tgt");
        var hint = can && zone === "front" && D.canAttack(G, 0, u) ? ' can' : can && zone === "back" && G.phase === "main" && P.front.length < D.FRONT ? ' mv' : '';
        var cls = (u.act ? '' : 'rest') + (u.frozen ? ' frz' : '') + (sel && sel.u === u.id ? ' sel' : '') + hint + (isTarget(u, who) ? ' tgt' : '') + (u.dmg ? ' hurt' : '');
        cells += '<div class="slot">' + DU.face(u.d, "s", { bp: D.hp(P, u), full: u.d.bp, cls: cls, attr: ' data-u="' + u.id + '" data-w="' + who + '"' }) + '</div>';
      }
      return '<div class="drow ' + zone + '"><span class="lab">' + label + '</span>' + cells + '</div>';
    };
    var life = ''; for (var i = 0; i < D.LIFE; i++) life += '<i class="' + (i < P.life.length ? 'on' : '') + '"></i>';
    var ap = ''; for (var j = 0; j < Math.max(P.apMax, P.ap, 1); j++) ap += '<i class="' + (j < P.ap && G.cur === who ? 'on' : '') + '"></i>';
    var bar = '<div class="dbar' + (G.cur === who ? ' now' : '') + '"><b class="kai">' + (who === 0 ? '我方' : opp.name) + '</b><span class="gate" title="城門">城門 ' + life + '</span>' +
      '<span>餉 <b>' + D.energy(P) + '</b></span><span class="aps">令 ' + ap + '</span><span class="dim">手 ' + P.hand.length + '・庫 ' + P.deck.length + '</span></div>';
    return who === 1 ? bar + row("back", "後陣") + row("front", "前陣") : row("front", "前陣") + row("back", "後陣") + bar;
  }
  DU.render = function () {
    if (!G) return;
    var me = G.p[0];
    var hand = me.hand.map(function (d, i) {
      var ok = G.cur === 0 && !busy && (D.canPlay(G, 0, d) || D.canSwap(G, 0, d));
      return DU.face(d, "s", { cls: (ok ? 'ok' : 'no') + (sel && sel.h === i ? ' sel' : ''), attr: ' data-h="' + i + '"' });
    }).join("");
    var turnTxt = G.winner >= 0 ? (G.winner === 0 ? '勝利' : '敗北') : (G.cur === 0 ? '我方回合' : '敵方回合') + '・第 ' + G.p[G.cur].t + ' 回合' + (G.cur === 0 && G.phase === "attack" ? '・進攻中（不能再出武將）' : '');
    var logs = G.logs.slice(-3).map(function (t) { return '<div>' + esc(t) + '</div>'; }).join("");
    $("#s-duelb").innerHTML = '<div class="dfield' + (sel && sel.mode === "tgt" ? ' picking' : '') + '">' + sideHtml(G.p[1], 1) + '<div class="dmid"><b>' + turnTxt + '</b><div class="dlog">' + logs + '</div></div>' + sideHtml(me, 0) + '</div>' +
      '<div class="dhand">' + (hand || '<span class="dim">沒有手牌</span>') + '</div>' +
      '<div class="dact" id="dact">' + actHtml() + '</div>';
    $$("#s-duelb [data-h]").forEach(function (c) {
      c.onclick = function () {
        var i = +c.dataset.h;
        if (busy || G.cur !== 0 || (sel && sel.mode === "tgt")) return DU.bigCard(me.hand[i]);
        sel = sel && sel.h === i ? null : { h: i }; DU.render();
      };
    });
    $$("#s-duelb [data-u]").forEach(function (c) {
      c.onclick = function () {
        var w = +c.dataset.w, id = +c.dataset.u, P = G.p[w], u = D.field(P).find(function (x) { return x.id === id; });
        if (sel && sel.mode === "tgt") { if (isTarget(u, w)) return doTarget(u); return; }
        if (w === 1 || busy || G.cur !== 0) return DU.bigCard(u.d);
        sel = sel && sel.u === id ? null : { u: id }; DU.render();
      };
    });
    bindAct();
  };
  var TGT_TIP = { swap: "點己方前陣要換下的武將", snipe: "點敵方後陣要遠射的武將", lubu: "點敵方前陣要擊退的武將", item: "點己方要使用的武將" };
  function actHtml() {
    if (!G || G.winner >= 0) return '<button class="pri" id="da-leave">離開</button>';
    if (G.cur !== 0 || busy) return '<span class="dim">敵方行動中…</span><span class="grow"></span><button class="sm plain" id="da-quit">投降</button>';
    var me = G.p[0], h = '';
    if (sel && sel.mode === "tgt") return '<b class="kai">' + TGT_TIP[sel.kind] + '</b><span class="grow"></span><button class="plain" id="da-cancel">取消</button>';
    if (sel && sel.h !== undefined) {
      var d = me.hand[sel.h];
      if (d && d.item) {
        var okI = D.canItem(G, 0, d);
        var whyI = d.react ? '武將被擊退時自動使用' : me.ap < d.ap ? '軍令不夠（要 ' + d.ap + ' 道）' : '現在不能用';
        h = '<b class="kai">' + d.name + '</b>' + (okI ? '<button class="pri" id="da-item">' + (d.tgt ? '選擇武將' : '使用') + '</button>' : '<span class="dim">' + whyI + '</span>');
      } else if (d) {
        var ok = D.canPlay(G, 0, d), sw = D.canSwap(G, 0, d);
        var why = G.phase !== "main" ? '進攻後不能再出武將' : me.ap < d.ap ? '軍令不夠' : D.energy(me) < d.cost ? '軍餉不夠（要 ' + d.cost + '，後陣有 ' + D.energy(me) + '）' : '';
        h = '<b class="kai">' + d.name + '</b>' + (ok ? (d.name === "張遼" ? '' : '<button id="da-back" ' + (me.back.length < D.BACK ? '' : 'disabled') + '>放後陣</button>') + '<button class="pri" id="da-front" ' + (me.front.length < D.FRONT ? '' : 'disabled') + '>放前陣</button>' : '') +
          (sw ? '<button class="gold" id="da-swap">陣前換將</button>' : '') + (!ok && !sw ? '<span class="dim">' + why + '</span>' : '');
      }
      h += '<button class="sm plain" id="da-see">看卡</button>';
    } else if (sel && sel.u !== undefined) {
      var u = D.field(me).find(function (x) { return x.id === sel.u; });
      if (u) {
        var inBack = me.back.indexOf(u) >= 0;
        h = '<b class="kai">' + u.d.name + '</b>' + (inBack ? '<button id="da-move" ' + (G.phase === "main" && me.front.length < D.FRONT ? '' : 'disabled') + '>移上前陣</button>'
          : '<button class="pri" id="da-atk" ' + (D.canAttack(G, 0, u) ? '' : 'disabled') + '>進攻</button>' +
            (u.d.skill === "遠射" ? '<button id="da-snipe" ' + (D.canSnipe(G, 0, u) ? '' : 'disabled') + '>遠射後陣</button>' : '') +
            (u.d.skill === "破門" ? '<button id="da-break" ' + (D.canBreak(G, 0, u) ? '' : 'disabled') + ' title="兵力要 5000 以上">破門</button>' : '') +
            (u.d.name === "呂布" ? '<button class="gold" id="da-lubu" ' + (D.canLubu(G, 0, u) ? '' : 'disabled') + '>神擋殺神（3令）</button>' : '') +
            (u.act ? '' : '<span class="dim">休整中</span>')) + '<button class="sm plain" id="da-see">看卡</button>';
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
    on("da-cancel", function () { sel = null; DU.render(); });
    on("da-menu", function () {
      UI.modal('<div class="dtop"><b class="kai" style="font-size:20px">選單</b><span class="grow"></span>' + CLOSE + '</div><div class="row"><button id="dm-rule">規則</button><button class="plain" id="dm-quit">投降</button></div>');
      $("#dm-rule").onclick = DU.rules; $("#dm-quit").onclick = DU.confirmQuit;
    });
    on("da-see", function () { var me = G.p[0]; var d = sel.h !== undefined ? me.hand[sel.h] : D.field(me).find(function (x) { return x.id === sel.u; }).d; DU.bigCard(d); });
    on("da-back", function () { play("back"); });
    on("da-front", function () { play("front"); });
    on("da-swap", function () { sel = { mode: "tgt", kind: "swap", h: sel.h }; DU.render(); });
    on("da-item", function () {
      var it = G.p[0].hand[sel.h];
      if (it.tgt) { sel = { mode: "tgt", kind: "item", h: sel.h }; DU.render(); return; }
      var i = sel.h; sel = null; D.useItem(G, 0, i); afterAction();
    });
    on("da-move", function () { D.move(G, 0, sel.u); sel = null; DU.render(); });
    on("da-atk", function () { var id = sel.u; sel = null; doAttack(function () { D.attack(G, 0, id); }); });
    on("da-snipe", function () { sel = { mode: "tgt", kind: "snipe", u: sel.u }; DU.render(); });
    on("da-lubu", function () { sel = { mode: "tgt", kind: "lubu", u: sel.u }; DU.render(); });
    on("da-break", function () { var id = sel.u; sel = null; doAttack(function () { D.breakGate(G, 0, id); }); });
    on("da-draw", function () { D.extraDraw(G, 0); sel = null; afterAction(); });
    on("da-end", function () {
      var me = G.p[0], idle = me.front.filter(function (u) { return u.act; }).length;
      var go = function () { UI.close(); sel = null; D.endTurn(G); DU.render(); if (G.winner < 0) DU.aiTurn(); else DU.over(); };
      if (idle) { UI.modal('<h2>結束回合？</h2><p>前陣還有 ' + idle + ' 位可以進攻。</p><div class="row end"><button onclick="SG.UI.close()">回去</button><button class="pri" id="de-go">結束</button></div>'); $("#de-go").onclick = go; }
      else go();
    });
  }
  function doTarget(u) {
    var s = sel; sel = null;
    if (s.kind === "swap") { D.swap(G, 0, s.h, u.id); afterAction(); }
    else if (s.kind === "item") { D.useItem(G, 0, s.h, u.id); afterAction(); }
    else if (s.kind === "snipe") doAttack(function () { D.snipe(G, 0, s.u, u.id); });
    else if (s.kind === "lubu") doAttack(function () { D.lubu(G, 0, s.u, u.id); });
  }
  function play(zone) { var i = sel.h; sel = null; D.play(G, 0, i, zone); afterAction(); }
  function afterAction() {
    DU.render(); flipPop();
    if (G.pending && G.pending.type === "discard") return DU.discardPick();
    if (G.pending && G.pending.type === "illusion") return DU.illusionPick();
    if (G.winner >= 0) return DU.over();
  }
  async function doAttack(fn) {
    busy = true; DU.render();
    fn();
    await fightFx();
    busy = false; afterAction();
  }
  // 戰鬥演出
  async function fightFx() {
    var f = G.lastFight; G.lastFight = null;
    if (G.lastGuard) { UI.banner("護主！擋下了", "#cfe6ff"); G.lastGuard = null; }
    else if (G.lastSave) { UI.banner("小籠包！留住了", "#ecd391"); G.lastSave = null; }
    else if (f && f.lubu) UI.banner("神擋殺神", "#ff9c7a");
    else if (f && f.f) {
      var t = f.f.deadA && f.f.deadB ? "同歸於盡" : f.f.deadB ? f.b.d.name + " 被擊退" : f.f.deadA ? f.a.d.name + " 被擊退" : "擋下了";
      UI.banner(t, f.f.deadB ? "#ff9c7a" : "#cfe6ff");
    }
    DU.render(); flipPop();
    await wait(f && (f.f || f.lubu) ? 900 : 700);
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
  DU.illusionPick = function () {
    var me = G.p[0], pick = [];
    var draw = function () {
      UI.modal('<h2>幻術</h2><p>挑 2 張手牌放回牌組底（已選 ' + pick.length + ' / 2）。</p><div class="dhandpv">' +
        me.hand.map(function (d, i) { return DU.face(d, "s", { cls: pick.indexOf(i) >= 0 ? 'sel' : '', attr: ' data-ret="' + i + '"' }); }).join("") + '</div>' +
        '<div class="row end"><button class="pri" id="ret-ok" ' + (pick.length === Math.min(2, me.hand.length) ? '' : 'disabled') + '>放回</button></div>');
      $$("[data-ret]").forEach(function (c) { c.onclick = function () { var i = +c.dataset.ret, k = pick.indexOf(i); if (k >= 0) pick.splice(k, 1); else if (pick.length < 2) pick.push(i); draw(); }; });
      $("#ret-ok").onclick = function () { D.chooseReturn(G, pick); UI.close(); afterAction(); };
    };
    draw();
  };
  // 敵方回合
  DU.aiTurn = async function () {
    busy = true; DU.render();
    await wait(600);
    for (var guard = 0; guard < 120 && G && G.winner < 0 && G.cur === 1; guard++) {
      var act = D.aiNext(G);
      if (!act) break;
      if (D.aiDo(G, act) === false) break;
      if (G.pending && G.pending.type === "block") { DU.render(); await askBlock(); }
      DU.render(); flipPop();
      await wait(/attack|snipe|lubu|break/.test(act.t) ? 700 : 650);
      if (G.lastFight || G.lastGuard || G.lastSave) await fightFx();
    }
    if (!G || G.winner >= 0) { busy = false; DU.render(); return DU.over(); }
    D.endTurn(G); busy = false; afterAction();
    if (G.winner < 0) UI.banner("我方回合", "#ecd391");
  };
  function askBlock() {
    return new Promise(function (res) {
      var pd = G.pending, a = pd.a, pa = D.hp(G.p[1], a), me = G.p[0];
      var rows = pd.list.map(function (v) {
        var hb = D.hp(me, v, true);
        var out = hb > pa ? '擋下並擊退對方（她剩 ' + (hb - pa) + '）' : hb === pa ? '同歸於盡' : '她會被擊退（對方剩 ' + (pa - hb) + '）';
        return '<div class="li">' + DU.face(v.d, "s", { bp: hb, full: v.d.bp }) + '<div class="grow"><b>' + v.d.name + '</b><div class="sub">兵力 ' + hb + '・' + out + '</div></div><button class="' + (hb > pa ? 'pri' : '') + '" data-blk="' + v.id + '">格擋</button></div>';
      }).join("");
      UI.modal('<h2>敵軍來攻</h2><div class="li">' + DU.face(a.d, "s", { bp: pa, full: a.d.bp }) + '<div class="grow"><b>' + a.d.name + '</b><div class="sub">兵力 ' + pa + '</div></div></div>' +
        '<p>要派誰格擋？兩邊會互扣兵力。不擋的話城門會被破 1 道（剩 ' + (me.life.length - 1) + ' 道）。</p><div>' + rows + '</div>' +
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
