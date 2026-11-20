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
      (art ? '<img class="pic" src="img/' + art + (size === "l" ? '_full' : '_card') + '.webp" alt=""' + (size === "l" ? '' : ' loading="lazy"') + '>' : '<span class="txt">' + d.name + '</span>') +   // 大卡用全身圖（有呼吸效果）
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
    return '<div class="dcu f-' + FV[d.fac] + '">' + (art ? '<img class="pic" src="img/' + art + '_full.webp" alt="">' : '') +
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
        (st === "u" ? '<p class="dim" style="text-align:center;margin:2px 0 0">點卡片可以收起文字，看整張圖</p>' : '') +
        '<p class="dim" style="text-align:center">' + (D.NO_LIMIT.indexOf(d.name) >= 0 ? (n ? '擁有她就能放，張數不限' : '還沒擁有這位武將') : n ? '你最多可以放 ' + n + ' 張（看擁有的最高卡別：N1・R2・SR3・SSR4）' : '還沒擁有這位武將') + '</p>';
    }
    UI.modal('<div class="dtop">' + (d.item ? '' : '<span class="seg">' + (opt.card ? '<button class="chip" id="bc-gen">一般版</button>' : '') + '<button class="chip' + (st === "u" ? ' on' : '') + '" data-fs="u">完整版</button><button class="chip' + (st === "l" ? ' on' : '') + '" data-fs="l">簡潔版</button></span>') + '<span class="grow"></span>' + CLOSE + '</div>' + body);
    UI.back = opt.back || null;   // ✅ Jay：組牌裡看大卡按「收起」要回到組牌
    // ✅ Jay 2026-11-20：完整版點卡片可以把文字收起來，看整張全身圖
    var big = $("#modal .dbig .dcu"); if (big) big.onclick = function () { big.classList.toggle("bare"); };
    if (opt.card && $("#bc-gen")) $("#bc-gen").onclick = function () { UI.setBookDuel(false); UI.cardDetail(opt.card); };   // 切回一般版，收集冊一起換
    $$("[data-fs]").forEach(function (b) { b.onclick = function () { try { localStorage.setItem("sgl_duel_face", b.dataset.fs); } catch (e) {} DU.bigCard(d, opt); }; });
  };
  DU.forCard = function (card) { return card.ur && !(card.urOnly && D.UR_OK.indexOf(card.gen) >= 0) ? null : D.CARD[card.gen] || null; };

  // ===== 大廳 =====
  // 多組牌組（✅ Jay 2026-11-20：免費 2 組，第 3 組起每組 68 元寶解鎖）。★ 最多 10 組是開發先定的
  DU.UNLOCK = 68; DU.MAX_DECKS = 10;
  DU.decks = function (st) {
    var du = st.duel = st.duel || {};
    if (!du.decks) { du.decks = [{ name: "牌組 1", deck: du.deck || {} }, { name: "牌組 2", deck: {} }]; du.cur = 0; delete du.deck; }
    if (!(du.cur >= 0 && du.cur < du.decks.length)) du.cur = 0;
    return du;
  };
  DU.deck = function (st) { var du = DU.decks(st); return du.decks[du.cur].deck; };
  DU.setDeck = function (st, d) { var du = DU.decks(st); du.decks[du.cur].deck = d; return d; };
  UI.r_duel = function () {
    var st = S(), du = DU.decks(st);
    var deck = DU.deck(st), n = D.deckCount(deck), okDeck = n === D.DECK && DU.deckValid(deck);
    var rec = st.duel.rec || { w: 0, l: 0 };
    $("#s-duel").innerHTML = UI.strip("st-duel", "鬥將", "卡牌對戰・試玩版") +
      '<div class="paper"><div class="dslots">' + du.decks.map(function (x, i) { var c = D.deckCount(x.deck); return '<button class="chip' + (i === du.cur ? ' on' : '') + '" data-slot="' + i + '">' + esc(x.name) + ' <small>' + c + '/' + D.DECK + '</small></button>'; }).join("") +
      (du.decks.length < DU.MAX_DECKS ? '<button class="chip add" id="du-add">＋ 第 ' + (du.decks.length + 1) + ' 組・' + DU.UNLOCK + ' 元寶</button>' : '') + '</div>' +
      '<div class="row"><div class="grow"><b class="kai" style="font-size:19px">' + esc(du.decks[du.cur].name) + '</b><div class="dim">' + n + ' / ' + D.DECK + ' 張・' + (okDeck ? '可以出戰' : '要剛好 ' + D.DECK + ' 張才能出戰') + '</div></div>' +
      '<button class="gold" id="du-deck">組牌</button></div>' + (n ? '<div class="curve">' + DU.curve(deck) + '</div>' : '') + '</div>' +
      '<h2>挑戰 <small>戰績 ' + rec.w + ' 勝 ' + rec.l + ' 敗</small></h2><div class="paper flush">' +
      D.OPPONENTS.map(function (o) {
        return '<div class="li"><span class="hd f-' + FV[o.tags[0]] + '"><b style="font-size:16px">' + o.tags[0][0] + '</b></span><div class="grow"><b>' + o.name + '</b><div class="sub">' + o.desc + '・電腦對手</div></div>' +
          '<button class="pri" data-opp="' + o.id + '" ' + (okDeck ? '' : 'disabled') + '>出戰</button></div>';
      }).join("") + '</div>' + DU.netLobby() +
      '<div class="row end"><button class="sm" id="du-rule">規則</button></div>';
    SG.Scene.banner($("#st-duel"), 77);
    $("#du-deck").onclick = function () { DU.bf.inDeck = false; DU.builder(); };   // 從大廳打開時一律顯示全部武將
    $("#du-rule").onclick = DU.rules;
    $$("[data-slot]").forEach(function (b) { b.onclick = function () { du.cur = +b.dataset.slot; UI.save(); UI.r_duel(); }; });
    var add = $("#du-add");
    if (add) add.onclick = function () {
      var no = du.decks.length + 1;
      UI.modal('<h2>解鎖第 ' + no + ' 組牌組</h2><p>花 <b>' + DU.UNLOCK + ' 元寶</b>解鎖一個新的牌組欄位（你有 ' + st.yuanbao + ' 元寶）。</p><div class="row end"><button class="plain" onclick="SG.UI.close()">取消</button><button class="pri" id="du-buy">解鎖</button></div>');
      $("#du-buy").onclick = function () {
        if (st.yuanbao < DU.UNLOCK) return UI.flash("元寶不夠");
        st.yuanbao -= DU.UNLOCK; du.decks.push({ name: "牌組 " + no, deck: {} }); du.cur = du.decks.length - 1;
        UI.save(); UI.res(); UI.close(); UI.r_duel(); UI.flash("已解鎖第 " + no + " 組");
      };
    };
    DU.bindNetLobby(okDeck);
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
  DU.bf = { nat: "全部", cost: "全部", bp: "全部" };
  // ✅ Jay 2026-11-20：加兵力篩選；道具卡放在「國家」那一列。★ 兵力分段是開發先分的
  var BP_RANGE = { "1500 以下": [0, 1500], "2000–3000": [2000, 3000], "3500–4500": [3500, 4500], "5000 以上": [5000, 99999] };
  DU.builder = function () {
    var st = S(), deck = DU.deck(st), avail = D.owned(st);
    Object.keys(deck).forEach(function (k) { if (D.ITEM[k]) { if (deck[k] > 1) deck[k] = 1; return; } var mx = D.copiesOf(st, k); if (deck[k] > mx) deck[k] = mx; if (!deck[k]) delete deck[k]; });
    var n = D.deckCount(deck);
    var onlyItem = DU.bf.nat === "道具", rg = BP_RANGE[DU.bf.bp];
    var list = onlyItem ? [] : avail.filter(function (x) { return (DU.bf.nat === "全部" || x.d.fac === DU.bf.nat) && (DU.bf.cost === "全部" || x.d.cost === +DU.bf.cost) && (!rg || (x.d.bp >= rg[0] && x.d.bp <= rg[1])) && (!DU.bf.inDeck || deck[x.d.name]); })
      .sort(function (a, b) { return a.d.cost - b.d.cost || b.d.bp - a.d.bp; });
    var chips = function (key, cur, arr) { return arr.map(function (v) { return '<button class="chip' + (String(v) === String(cur) ? ' on' : '') + '" data-bf="' + key + '" data-v="' + v + '">' + v + '</button>'; }).join(""); };
    var cell = function (d, k, mx, key) {
      return '<div class="dcell' + (k ? ' in' : '') + '">' + DU.face(d, "m", { attr: ' data-big="' + esc(key) + '"' }) +
        '<div class="pm"><button class="sm" data-pm="-1" data-n="' + esc(key) + '" ' + (k ? '' : 'disabled') + '>－</button><b>' + k + '/' + (mx >= D.DECK ? '∞' : mx) + '</b><button class="sm" data-pm="1" data-n="' + esc(key) + '" ' + (k < mx && n < D.DECK ? '' : 'disabled') + '>＋</button></div></div>';
    };
    var items = D.ITEMS.map(function (it) { var key = D.itemKey(it.id); return (!DU.bf.inDeck || deck[key]) ? cell(it, deck[key] || 0, 1, key) : ''; }).join("");
    var showItems = onlyItem || (DU.bf.nat === "全部" && DU.bf.cost === "全部" && DU.bf.bp === "全部");
    var z = Object.keys(deck).reduce(function (a, k) { return a + (D.CARD[k] && D.CARD[k].cost === 0 ? deck[k] : 0); }, 0);
    UI.modal('<div class="dbuild"><div class="dbtop"><b class="kai">組牌</b><span class="cnt' + (n === D.DECK ? ' ok' : n > D.DECK ? ' over' : '') + '">' + n + ' / ' + D.DECK + '</span>' +
      '<span class="grow"></span><button class="sm" id="db-auto">一鍵組牌</button><button class="sm plain" id="db-clr">清空</button><button class="sm pri" id="db-ok">完成</button></div>' +
      '<div class="curve sm">' + DU.curve(deck) + '</div>' +
      '<div class="filters"><div><span>國家</span>' + chips("nat", DU.bf.nat, ["全部"].concat(D.NATIONS, ["道具"])) + '</div>' +
      (onlyItem ? '' : '<div><span>軍餉</span>' + chips("cost", DU.bf.cost, ["全部", 0, 1, 2, 3, 4, 5, 6]) + '</div><div><span>兵力</span>' + chips("bp", DU.bf.bp, ["全部"].concat(Object.keys(BP_RANGE))) + '</div>') +
      '<div><span></span><button class="chip' + (DU.bf.inDeck ? ' on' : '') + '" id="db-in">只看牌組</button></div></div>' +
      (z < Math.round(D.DECK * 0.2) && n ? '<p class="warn">0 費卡只有 ' + z + ' 張，建議至少 ' + Math.round(D.DECK * 0.2) + ' 張，不然常常第一回合出不了卡。</p>' : '') +
      (showItems ? '<h3 class="dsub">道具卡 <small>每種限 1 張・試玩期大家都有</small></h3><div class="dgrid">' + (items || '<p class="dim" style="grid-column:1/-1;text-align:center">牌組裡沒有道具卡</p>') + '</div>' : '') +
      (onlyItem ? '' : (showItems ? '<h3 class="dsub">武將</h3>' : '') + '<p class="dim">擁有 ' + avail.length + ' 位武將可用，符合篩選 ' + list.length + ' 位。點卡片看詳情，按 ＋／－ 調整張數。</p>' +
      '<div class="dgrid">' + list.map(function (x) { return cell(x.d, deck[x.d.name] || 0, x.n, x.d.name); }).join("") +
      (list.length ? '' : '<p class="dim" style="grid-column:1/-1;text-align:center">' + (DU.bf.inDeck && !n ? '牌組還是空的。按「一鍵組牌」，或再按一次「只看牌組」看全部武將。' : '沒有符合的武將') + '</p>') + '</div>') + '</div>');
    var keep = $("#modal-body").scrollTop;
    var redo = function () { var y = $("#modal-body").scrollTop; UI.save(); DU.builder(); $("#modal-body").scrollTop = y; };
    $$("[data-bf]").forEach(function (b) { b.onclick = function () { DU.bf[b.dataset.bf] = b.dataset.v; redo(); }; });
    $("#db-in").onclick = function () { DU.bf.inDeck = !DU.bf.inDeck; redo(); };
    $$("[data-pm]").forEach(function (b) { b.onclick = function () { var k = b.dataset.n; deck[k] = Math.max(0, (deck[k] || 0) + +b.dataset.pm); if (!deck[k]) delete deck[k]; redo(); }; });
    $$("[data-big]").forEach(function (c) { c.onclick = function () { var k = c.dataset.big, y = $("#modal-body").scrollTop; DU.bigCard(D.CARD[k] || D.ITEM[k], { back: function () { DU.builder(); $("#modal-body").scrollTop = y; } }); }; });
    $("#db-auto").onclick = function () { deck = DU.setDeck(st, D.autoDeck(avail, D.DECK)); redo(); if (D.deckCount(deck) < D.DECK) UI.flash("武將不夠湊滿 " + D.DECK + " 張"); };
    $("#db-clr").onclick = function () { deck = DU.setDeck(st, {}); redo(); };
    $("#db-ok").onclick = function () { UI.save(); UI.close(); UI.r_duel(); };
    $("#modal-body").scrollTop = keep;
  };

  // ===== 對戰 =====
  // NET：線上對戰時的連線（null＝打電腦）。線上時規則由伺服器跑，這裡只送出動作、收到局面再畫。
  var G = null, sel = null, busy = false, opp = null, NET = null, pickRes = null;
  // GHOST：隨機配對 60 秒沒人時改跟電腦打，對外顯示成一般玩家（✅ Jay 2026-11-20：假裝是真人、記在線上戰績、換成電腦後就退出排隊）
  var GHOST = null;
  var GHOST_NAMES = ["主公", "主公", "江東小霸王", "子龍迷妹", "孟德吃瓜中", "臥龍不睡", "阿斗加油", "赤壁烤肉", "關二爺", "奉先無雙", "貂蟬護衛隊", "周郎顧我", "黃巾小兵", "許都打工人", "荊州借我", "常山趙子龍", "司馬家", "小喬不哭"];   // ★ 名單開發先填的
  var ghostWait = function (ms) { return wait(GHOST ? ms * (1.6 + Math.random() * 2.2) : ms); };
  DU.start = function (o, ghost) {
    var st = S(); NET = null;
    if (GHOST) clearInterval(GHOST.timer);
    GHOST = ghost ? { dl: 0, off: 0, pdl: 0 } : null;
    opp = ghost ? Object.assign({}, o, { name: GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)] }) : o;
    if (GHOST) GHOST.timer = setInterval(ghostTick, 500);
    G = D.newGame(Object.assign({}, DU.deck(st)), D.oppDeck(o), { human: 0 });
    if (D.noZero(G.p[1])) D.mulligan(G, 1);
    sel = null; busy = false;
    UI.go("duelb");
    DU.render();
    var hand = function () { return G.p[0].hand.map(function (d) { return DU.face(d, "s"); }).join(""); };
    UI.modal('<h2>' + (GHOST ? '對手：' + esc(opp.name) : o.name) + '</h2><p>' + (G.first === 0 ? '你<b>先攻</b>（第 1 回合 1 道軍令、不抽牌）。' : '你<b>後攻</b>（前兩回合各 2 道軍令）。') + '</p>' +
      '<p class="dim">起手 ' + D.HAND + ' 張，可以換一次。</p><p class="warn" id="mul-w"' + (D.noZero(G.p[0]) ? '' : ' hidden') + '>起手沒有 0 費卡，第一回合會出不了卡，建議換手牌。</p><div class="dhandpv" id="mul-pv">' + hand() + '</div>' +
      '<div class="row end"><button id="mul-re">換一次手牌</button><button class="pri" id="mul-go">開戰</button></div>');
    $("#mul-re").onclick = function () { D.mulligan(G, 0); $("#mul-pv").innerHTML = hand(); $("#mul-w").hidden = !D.noZero(G.p[0]); this.disabled = true; };
    $("#mul-go").onclick = function () { UI.close(); D.startTurn(G); ghostClock(); afterAction(); if (G.cur === 1) DU.aiTurn(); };
  };
  function ghostClock() { if (GHOST) GHOST.dl = Date.now() + 90000; }
  // 時間到自動結束回合（跟線上一樣）
  function ghostTick() {
    if (!GHOST || !G || G.winner >= 0) return;
    tick();
    if (G.cur === 0 && !busy && Date.now() > GHOST.dl) {
      if (G.pending && G.pending.type === "discard") D.chooseDiscard(G, 0);
      if (G.pending && G.pending.type === "illusion") D.chooseReturn(G, [0, 1]);
      UI.close(); sel = null; G.log("我方時間到，自動結束回合");
      D.endTurn(G); DU.render(); if (G.winner < 0) DU.aiTurn(); else DU.over();
    }
  }
  // 所有出手都走這裡：打電腦就直接跑規則，線上就送給伺服器
  var ACT = { play: D.play, move: D.move, extraDraw: D.extraDraw, swap: D.swap, useItem: D.useItem, attack: D.attack, snipe: D.snipe, breakGate: D.breakGate, lubu: D.lubu };
  var FX = { attack: 1, snipe: 1, breakGate: 1, lubu: 1 };
  function act(a, args) {
    sel = null; args = args || [];
    if (NET) { busy = true; NET.send({ t: "act", a: a, args: args }); DU.render(); return; }
    var run = function () { ACT[a].apply(null, [G, 0].concat(args)); };
    if (FX[a]) return doAttack(run);
    run(); afterAction();
  }
  // 現在有沒有輪到我做選擇（格擋、臥龍、幻術）
  function myPick() { var pd = G && G.pending; return !!pd && (pd.type === "block" ? pd.who === 1 : pd.who === 0); }
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
    var nmTxt = who === 0 ? '我方' : esc(opp.name) + (NET && !NET.oppOnline ? '<small class="off">斷線中</small>' : '');
    var bar = '<div class="dbar' + (G.cur === who ? ' now' : '') + '"><b class="kai">' + nmTxt + '</b><span class="gate" title="城門">城門 ' + life + '</span>' +
      '<span>餉 <b>' + D.energy(P) + '</b></span><span class="aps">令 ' + ap + '</span><span class="dim">手 ' + P.hand.length + '・庫 ' + P.deck.length + '</span></div>';
    return who === 1 ? bar + row("back", "後陣") + row("front", "前陣") : row("front", "前陣") + row("back", "後陣") + bar;
  }
  DU.render = function () {
    if (!G) { $("#s-duelb").innerHTML = '<div class="dfield"><div class="dmid"><b>準備中…</b></div></div>'; return; }
    var me = G.p[0];
    var hand = me.hand.map(function (d, i) {
      var ok = G.cur === 0 && !busy && (D.canPlay(G, 0, d) || D.canSwap(G, 0, d));
      return DU.face(d, "s", { cls: (ok ? 'ok' : 'no') + (sel && sel.h === i ? ' sel' : ''), attr: ' data-h="' + i + '"' });
    }).join("");
    var turnTxt = G.winner >= 0 ? (G.winner === 0 ? '勝利' : '敗北') : (G.cur === 0 ? '我方回合' : '敵方回合') + '・第 ' + G.p[G.cur].t + ' 回合' + (G.cur === 0 && G.phase === "attack" ? '・進攻中（不能再出武將）' : '');
    var logs = G.logs.slice(-3).map(function (t) { return '<div>' + esc(t) + '</div>'; }).join("");
    $("#s-duelb").innerHTML = '<div class="dfield' + (sel && sel.mode === "tgt" ? ' picking' : '') + '">' + sideHtml(G.p[1], 1) + '<div class="dmid"><b>' + turnTxt + '</b>' + (NET || GHOST ? '<span class="dtime" id="dtime"></span>' : '') + '<div class="dlog">' + logs + '</div></div>' + sideHtml(me, 0) + '</div>' +
      '<div class="dhand">' + (hand || '<span class="dim">沒有手牌</span>') + '</div>' +
      '<div class="dact" id="dact">' + actHtml() + '</div>';
    tick();
    $$("#s-duelb [data-h]").forEach(function (c) {
      c.onclick = function () {
        var i = +c.dataset.h;
        if (busy || G.cur !== 0 || G.winner >= 0 || (sel && sel.mode === "tgt")) return DU.bigCard(me.hand[i]);
        sel = sel && sel.h === i ? null : { h: i }; DU.render();
      };
    });
    $$("#s-duelb [data-u]").forEach(function (c) {
      c.onclick = function () {
        var w = +c.dataset.w, id = +c.dataset.u, P = G.p[w], u = D.field(P).find(function (x) { return x.id === id; });
        if (sel && sel.mode === "tgt") { if (isTarget(u, w)) return doTarget(u); return; }
        if (w === 1 || busy || G.cur !== 0 || G.winner >= 0) return DU.bigCard(u.d);
        sel = sel && sel.u === id ? null : { u: id }; DU.render();
      };
    });
    bindAct();
  };
  var TGT_TIP = { swap: "點己方前陣要換下的武將", snipe: "點敵方後陣要遠射的武將", lubu: "點敵方前陣要擊退的武將", item: "點己方要使用的武將" };
  var PICK_TXT = { block: "選擇格擋", discard: "臥龍：選對方手牌", illusion: "幻術：選要放回的牌" };
  function actHtml() {
    if (!G || G.winner >= 0) return '<button class="pri" id="da-leave">離開</button>';
    if (myPick()) return '<b class="kai">輪到你決定</b><span class="grow"></span><button class="pri" id="da-pick">' + PICK_TXT[G.pending.type] + '</button>';
    if (G.cur !== 0 || busy) return '<span class="dim">' + (G.cur === 0 ? '處理中…' : '敵方行動中…') + '</span><span class="grow"></span><button class="sm plain" id="da-quit">投降</button>';
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
    on("da-pick", DU.reopen);
    on("da-cancel", function () { sel = null; DU.render(); });
    on("da-menu", function () {
      UI.modal('<div class="dtop"><b class="kai" style="font-size:20px">選單</b><span class="grow"></span>' + CLOSE + '</div><div class="row"><button id="dm-rule">規則</button><button class="plain" id="dm-quit">投降</button></div>');
      $("#dm-rule").onclick = DU.rules; $("#dm-quit").onclick = DU.confirmQuit;
    });
    on("da-see", function () { var me = G.p[0]; var d = sel.h !== undefined ? me.hand[sel.h] : D.field(me).find(function (x) { return x.id === sel.u; }).d; DU.bigCard(d); });
    on("da-back", function () { act("play", [sel.h, "back"]); });
    on("da-front", function () { act("play", [sel.h, "front"]); });
    on("da-swap", function () { sel = { mode: "tgt", kind: "swap", h: sel.h }; DU.render(); });
    on("da-item", function () {
      var it = G.p[0].hand[sel.h];
      if (it.tgt) { sel = { mode: "tgt", kind: "item", h: sel.h }; DU.render(); return; }
      act("useItem", [sel.h]);
    });
    on("da-move", function () { act("move", [sel.u]); });
    on("da-atk", function () { act("attack", [sel.u]); });
    on("da-snipe", function () { sel = { mode: "tgt", kind: "snipe", u: sel.u }; DU.render(); });
    on("da-lubu", function () { sel = { mode: "tgt", kind: "lubu", u: sel.u }; DU.render(); });
    on("da-break", function () { act("breakGate", [sel.u]); });
    on("da-draw", function () { act("extraDraw", []); });
    on("da-end", function () {
      var me = G.p[0], idle = me.front.filter(function (u) { return u.act; }).length;
      var go = function () {
        UI.close(); sel = null;
        if (NET) { busy = true; NET.send({ t: "act", a: "end" }); DU.render(); return; }
        D.endTurn(G); DU.render(); if (G.winner < 0) DU.aiTurn(); else DU.over();
      };
      if (idle) { UI.modal('<h2>結束回合？</h2><p>前陣還有 ' + idle + ' 位可以進攻。</p><div class="row end"><button onclick="SG.UI.close()">回去</button><button class="pri" id="de-go">結束</button></div>'); $("#de-go").onclick = go; }
      else go();
    });
  }
  function doTarget(u) {
    var s = sel; sel = null;
    if (s.kind === "swap") act("swap", [s.h, u.id]);
    else if (s.kind === "item") act("useItem", [s.h, u.id]);
    else if (s.kind === "snipe") act("snipe", [s.u, u.id]);
    else if (s.kind === "lubu") act("lubu", [s.u, u.id]);
  }
  function afterAction() {
    DU.render(); flipPop();
    var pd = G.pending;
    if (pd && pd.who === 0 && pd.type === "discard") return DU.discardPick();
    if (pd && pd.who === 0 && pd.type === "illusion") return DU.illusionPick();
    if (G.winner >= 0 && !NET) return DU.over();
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
    UI.modal('<h2>臥龍</h2><p>挑一張對方的手牌丟掉。</p><div class="dhandpv">' + O.hand.map(function (d, i) { return d ? DU.face(d, "s", { attr: ' data-dis="' + i + '"' }) : ''; }).join("") + '</div>');
    $$("[data-dis]").forEach(function (c) {
      c.onclick = function () {
        UI.close();
        if (NET) { busy = true; NET.send({ t: "act", a: "discard", args: [+c.dataset.dis] }); DU.render(); return; }
        D.chooseDiscard(G, +c.dataset.dis); afterAction();
      };
    });
  };
  DU.illusionPick = function () {
    var me = G.p[0], pick = [];
    var draw = function () {
      UI.modal('<h2>幻術</h2><p>挑 2 張手牌放回牌組底（已選 ' + pick.length + ' / 2）。</p><div class="dhandpv">' +
        me.hand.map(function (d, i) { return DU.face(d, "s", { cls: pick.indexOf(i) >= 0 ? 'sel' : '', attr: ' data-ret="' + i + '"' }); }).join("") + '</div>' +
        '<div class="row end"><button class="pri" id="ret-ok" ' + (pick.length === Math.min(2, me.hand.length) ? '' : 'disabled') + '>放回</button></div>');
      $$("[data-ret]").forEach(function (c) { c.onclick = function () { var i = +c.dataset.ret, k = pick.indexOf(i); if (k >= 0) pick.splice(k, 1); else if (pick.length < 2) pick.push(i); draw(); }; });
      $("#ret-ok").onclick = function () {
        UI.close();
        if (NET) { busy = true; NET.send({ t: "act", a: "return", args: [pick] }); DU.render(); return; }
        D.chooseReturn(G, pick); afterAction();
      };
    };
    draw();
  };
  // 不小心把選擇視窗關掉時，用下方按鈕叫回來
  DU.reopen = function () {
    var pd = G && G.pending; if (!myPick()) return;
    if (pd.type === "block") return showBlock();
    if (pd.type === "discard") return DU.discardPick();
    if (pd.type === "illusion") return DU.illusionPick();
  };
  // 敵方回合（電腦）
  DU.aiTurn = async function () {
    busy = true; ghostClock(); DU.render();
    await ghostWait(600);
    for (var guard = 0; guard < 120 && G && G.winner < 0 && G.cur === 1; guard++) {
      var act = D.aiNext(G);
      if (!act) break;
      if (D.aiDo(G, act) === false) break;
      if (G.pending && G.pending.type === "block") { DU.render(); D.block(G, await askBlock()); }
      DU.render(); flipPop();
      await ghostWait(/attack|snipe|lubu|break/.test(act.t) ? 700 : 650);
      if (G.lastFight || G.lastGuard || G.lastSave) await fightFx();
    }
    if (!G || G.winner >= 0) { busy = false; DU.render(); return DU.over(); }
    D.endTurn(G); busy = false; ghostClock(); afterAction();
    if (G.winner < 0) UI.banner("我方回合", "#ecd391");
  };
  function askBlock() { return new Promise(function (res) { pickRes = res; showBlock(); }); }
  function showBlock() {
    var pd = G.pending, a = pd.a, pa = D.hp(G.p[1], a), me = G.p[0];
    var rows = pd.list.map(function (v) {
      var hb = D.hp(me, v, true);
      var out = hb > pa ? '擋下並擊退對方（她剩 ' + (hb - pa) + '）' : hb === pa ? '同歸於盡' : '她會被擊退（對方剩 ' + (pa - hb) + '）';
      return '<div class="li">' + DU.face(v.d, "s", { bp: hb, full: v.d.bp }) + '<div class="grow"><b>' + v.d.name + '</b><div class="sub">兵力 ' + hb + '・' + out + '</div></div><button class="' + (hb > pa ? 'pri' : '') + '" data-blk="' + v.id + '">格擋</button></div>';
    }).join("");
    UI.modal('<h2>敵軍來攻' + (NET ? ' <small class="dtime" id="dtime2"></small>' : '') + '</h2><div class="li">' + DU.face(a.d, "s", { bp: pa, full: a.d.bp }) + '<div class="grow"><b>' + a.d.name + '</b><div class="sub">兵力 ' + pa + '</div></div></div>' +
      '<p>要派誰格擋？兩邊會互扣兵力。不擋的話城門會被破 1 道（剩 ' + (me.life.length - 1) + ' 道）。</p><div>' + rows + '</div>' +
      '<div class="row end"><button class="plain" id="blk-no">不擋</button></div>');
    var done = function (id) { UI.close(); var r = pickRes; pickRes = null; if (r) r(id); };
    $$("[data-blk]").forEach(function (b) { b.onclick = function () { done(+b.dataset.blk); }; });
    $("#blk-no").onclick = function () { done(null); };
    tick();
  }
  DU.confirmQuit = function () {
    UI.modal('<h2>投降？</h2><p>這場算敗北。</p><div class="row end"><button onclick="SG.UI.close()">繼續打</button><button class="pri" id="dq-ok">投降</button></div>');
    $("#dq-ok").onclick = function () {
      UI.close();
      if (NET) { NET.send({ t: "quit" }); return; }
      G.winner = 1; DU.render(); DU.over();
    };
  };
  DU.over = function () {
    if (!G || G.recorded) return; G.recorded = true;
    if (GHOST) { clearInterval(GHOST.timer); return netOver({ win: G.winner === 0 }); }
    var st = S(), win = G.winner === 0; st.duel.rec = st.duel.rec || { w: 0, l: 0 }; st.duel.rec[win ? "w" : "l"]++; UI.save();
    setTimeout(function () {
      UI.modal('<h2>' + (win ? '勝利' : '敗北') + '</h2><p>' + (win ? '攻破了' + opp.name + '的城門。' : '我方城門被攻破了。') + '</p>' +
        '<p class="dim">共 ' + G.turn + ' 回合。試玩版暫時沒有獎勵。</p><div class="row end"><button id="do-again">再戰一場</button><button class="pri" id="do-back">返回</button></div>');
      $("#do-again").onclick = function () { UI.close(); DU.start(opp); };
      $("#do-back").onclick = function () { UI.close(); DU.leave(); };
    }, 700);
  };
  DU.leave = function () { if (NET) NET.close(); NET = null; if (GHOST) clearInterval(GHOST.timer); GHOST = null; G = null; UI.go("duel"); };

  // ===== 線上對戰 =====
  // ✅ Jay 2026-11-20：房間代碼和隨機配對兩種都要；帳號先不管（伺服器只檢查牌組張數規則）
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  DU.pid = function () { var p = LS("sgl_pid"); if (!p) { p = Math.random().toString(36).slice(2) + Date.now().toString(36); LS("sgl_pid", p); } return p; };
  DU.nick = function () { return LS("sgl_nick") || "主公"; };
  var wsBase = function () { return (location.protocol === "https:" ? "wss://" : "ws://") + location.host; };
  DU.netLobby = function () {
    var st = S(), r = st.duel.net || { w: 0, l: 0 }, back = null;
    try { back = JSON.parse(LS("sgl_room")); } catch (e) {}
    if (back && Date.now() - back.at > 15 * 60000) { back = null; LS("sgl_room", null); }
    return '<h2>線上對戰 <small>戰績 ' + r.w + ' 勝 ' + r.l + ' 敗</small></h2><div class="paper">' +
      '<div class="row"><span class="dim">暱稱</span><input id="du-nick" class="dnick" maxlength="8" value="' + esc(DU.nick()) + '"><span class="grow"></span></div>' +
      (back ? '<div class="row"><button class="gold" id="du-back">回到對戰（房間 ' + back.room + '）</button></div>' : '') +
      '<div class="row"><button class="pri" data-net="rand">隨機配對</button><button data-net="host">開房間</button><button data-net="join">輸入代碼</button></div>' +
      '<p class="dim">開房間會拿到 4 位數代碼，給朋友輸入就能對戰。每回合 90 秒。</p></div>';
  };
  DU.bindNetLobby = function (okDeck) {
    var nick = $("#du-nick"); if (nick) nick.onchange = function () { LS("sgl_nick", nick.value.trim().slice(0, 8) || "主公"); };
    var need = function () { if (!okDeck) { UI.flash("牌組要剛好 " + D.DECK + " 張才能出戰"); return false; } return true; };
    $$("[data-net]").forEach(function (b) {
      b.onclick = function () {
        if (nick) LS("sgl_nick", nick.value.trim().slice(0, 8) || "主公");
        if (!need()) return;
        if (b.dataset.net === "rand") DU.match();
        else if (b.dataset.net === "host") DU.host();
        else DU.askCode();
      };
    });
    var bk = $("#du-back"); if (bk) bk.onclick = function () { var x = JSON.parse(LS("sgl_room")); DU.connect(x.room); };
  };
  function waitBox(title, body) {
    UI.modal('<h2>' + title + '</h2>' + body + '<div class="row end"><button class="plain" id="nw-cancel">取消</button></div>');
    $("#nw-cancel").onclick = function () { if (NET) NET.close(); NET = null; UI.close(); };
  }
  DU.host = function () {
    waitBox("開房間", '<p class="dim">建立中…</p>');
    fetch("/api/new").then(function (r) { return r.json(); }).then(function (j) {
      if (!j.room) throw new Error(j.error || "建立失敗");
      DU.connect(j.room, true);
    }).catch(function (e) { UI.modal('<h2>連不上伺服器</h2><p>' + esc(e.message) + '</p><div class="row end"><button onclick="SG.UI.close()">好</button></div>'); });
  };
  DU.askCode = function () {
    UI.modal('<h2>輸入房間代碼</h2><p><input id="nc-code" class="dcode" inputmode="numeric" maxlength="4" placeholder="1234"></p><div class="row end"><button class="plain" onclick="SG.UI.close()">取消</button><button class="pri" id="nc-go">加入</button></div>');
    var inp = $("#nc-code"); inp.focus();
    $("#nc-go").onclick = function () { var c = inp.value.replace(/\D/g, ""); if (c.length !== 4) return UI.flash("代碼是 4 位數字"); DU.connect(c); };
  };
  DU.match = function () {
    waitBox("隨機配對", '<p>正在找對手…</p><p class="dim">找到就會自動開始。</p>');
    var ws, gone = false;
    try { ws = new WebSocket(wsBase() + "/api/match?pid=" + encodeURIComponent(DU.pid())); } catch (e) { return UI.flash("連不上伺服器"); }
    var me = NET = { close: function () { gone = true; clearTimeout(me.ai); try { ws.close(); } catch (e) {} }, send: function () {} };
    me.ai = setTimeout(function () {   // ✅ Jay：等 60 秒沒人就改跟電腦打
      if (NET !== me || gone) return;
      me.close(); NET = null; UI.close();
      DU.start(D.OPPONENTS[Math.floor(Math.random() * D.OPPONENTS.length)], true);
    }, DU.MATCH_WAIT || 60000);
    ws.onmessage = function (e) { var m = JSON.parse(e.data); if (m.t === "matched") { gone = true; clearTimeout(me.ai); ws.close(); DU.connect(m.room); } else if (m.t === "err") UI.flash(m.msg); };
    ws.onclose = function () { if (!gone) { NET = null; UI.modal('<h2>配對中斷</h2><p>連線中斷了，請再試一次。</p><div class="row end"><button onclick="SG.UI.close()">好</button></div>'); } };
  };
  // 連進房間（斷線會自動重連）
  DU.connect = function (room, hosting) {
    if (NET) NET.close();
    var me = { room: room, closed: false, oppOnline: true, off: 0, q: Promise.resolve(), tries: 0, started: false };
    NET = me;
    LS("sgl_room", JSON.stringify({ room: room, at: Date.now() }));
    var open = function () {
      var ws = me.ws = new WebSocket(wsBase() + "/api/room/" + room);
      ws.onopen = function () { me.tries = 0; ws.send(JSON.stringify({ t: "join", pid: DU.pid(), name: DU.nick(), deck: DU.deck(S()) })); };
      ws.onmessage = function (e) { var m = JSON.parse(e.data); me.q = me.q.then(function () { if (NET === me) return onNet(m, hosting); }); };
      ws.onclose = function () {
        if (me.closed || NET !== me) return;
        if (!me.started || me.tries++ > 30) { NET = null; LS("sgl_room", null); if (me.started) UI.modal('<h2>連線中斷</h2><p>重新連線失敗。</p><div class="row end"><button id="nx-ok">返回</button></div>'), $("#nx-ok").onclick = function () { UI.close(); DU.leave(); }; else UI.flash("連不上房間"); return; }
        UI.banner("連線中斷，重新連線中…", "#ffb0a0");
        setTimeout(function () { if (NET === me && !me.closed) open(); }, 2000);
      };
    };
    me.send = function (o) { if (me.ws && me.ws.readyState === 1) me.ws.send(JSON.stringify(o)); else UI.flash("連線中，請稍候"); };
    me.close = function () { me.closed = true; clearInterval(me.timer); try { me.ws.close(); } catch (e) {} };
    open();
  };
  async function onNet(m, hosting) {
    var me = NET;
    if (m.now) me.off = m.now - Date.now();
    if (m.opp !== undefined) { opp = { name: m.opp || "對手" }; }
    if (m.oppOnline !== undefined) me.oppOnline = m.oppOnline;
    if (m.t === "err") {
      if (m.fatal) { me.close(); NET = null; LS("sgl_room", null); UI.modal('<h2>無法加入</h2><p>' + esc(m.msg) + '</p><div class="row end"><button onclick="SG.UI.close()">好</button></div>'); if (G === null && $("#s-duelb").offsetParent) DU.leave(); return; }
      busy = false; UI.flash(m.msg); return;
    }
    if (m.t === "wait") {
      return waitBox("等待對手", '<p>房間代碼</p><div class="droom">' + me.room + '</div><p class="dim">把代碼給朋友，對方在「輸入代碼」加入就開始。</p>');
    }
    if (m.t === "opp") { me.oppOnline = m.online; UI.banner(m.online ? "對手回來了" : "對手斷線了（60 秒沒回來算你贏）", "#ecd391"); if (G) DU.render(); return; }
    if (m.t === "oppReady") { var w = $("#mul-st"); if (w) w.textContent = "對手已準備好"; return; }
    if (m.t === "mull") { me.started = true; return netMull(m); }
    if (m.t === "state") { me.started = true; return netState(m); }
    if (m.t === "over") return netOver(m);
  }
  function startClock() { var me = NET; clearInterval(me.timer); me.timer = setInterval(tick, 500); }
  function tick() {
    var T = NET || GHOST; if (!T || !T.dl) return;
    var now = Date.now() + T.off, pick = G && G.pending && T.pdl;
    var left = Math.max(0, Math.ceil(((pick ? T.pdl : T.dl) - now) / 1000));
    var t = (pick ? (myPick() ? '你的選擇' : '對手選擇中') : (G && G.cur === 0 ? '你的回合' : '對手回合')) + '・剩 ' + left + ' 秒';
    ["dtime", "dtime2", "mul-time"].forEach(function (id) { var e = document.getElementById(id); if (e) { e.textContent = id === "dtime" ? t : '剩 ' + left + ' 秒'; e.classList.toggle("low", left <= 10); } });
  }
  function netMull(m) {
    if (!$("#s-duelb").offsetParent || G) { G = null; UI.go("duelb"); DU.render(); }
    NET.dl = m.deadline; NET.pdl = 0; startClock();
    var cards = m.hand.map(function (k) { return D.CARD[k] || D.ITEM[k]; });
    var zero = !cards.some(function (c) { return !c.item && c.cost === 0; });
    UI.modal('<h2>對手：' + esc(opp.name) + ' <small class="dtime" id="mul-time"></small></h2><p>' + (m.first ? '你<b>先攻</b>（第 1 回合 1 道軍令、不抽牌）。' : '你<b>後攻</b>（前兩回合各 2 道軍令）。') + '</p>' +
      '<p class="dim">起手 ' + D.HAND + ' 張，可以換一次。</p>' + (zero ? '<p class="warn">起手沒有 0 費卡，第一回合會出不了卡，建議換手牌。</p>' : '') +
      '<div class="dhandpv">' + cards.map(function (d) { return DU.face(d, "s"); }).join("") + '</div>' +
      '<p class="dim" id="mul-st">' + (m.ready ? '等對手準備…' : '') + '</p>' +
      '<div class="row end"><button id="mul-re" ' + (m.mulled || m.ready ? 'disabled' : '') + '>換一次手牌</button><button class="pri" id="mul-go" ' + (m.ready ? 'disabled' : '') + '>開戰</button></div>');
    var modal = $("#modal");
    $("#mul-re").onclick = function () { this.disabled = true; NET.send({ t: "mull" }); };
    $("#mul-go").onclick = function () { this.disabled = true; $("#mul-re").disabled = true; $("#mul-st").textContent = "等對手準備…"; NET.send({ t: "ready" }); };
    tick();
  }
  async function netState(m) {
    var me = NET, prev = G ? G.cur : -1, wasPick = myPick();
    if (!$("#s-duelb").offsetParent) UI.go("duelb");
    if (!me.timer) startClock();
    me.dl = m.deadline; me.pdl = m.pickDeadline;
    G = D.hydrate(m.view); busy = false; sel = null;
    if (wasPick && !myPick()) { pickRes = null; UI.close(); }
    else if (prev < 0 || (!wasPick && $("#mul-time"))) UI.close();
    if (G.lastFight || G.lastGuard || G.lastSave) { busy = true; DU.render(); flipPop(); await fightFx(); busy = false; }
    afterAction();
    if (G.winner < 0 && G.cur === 0 && prev === 1) UI.banner("我方回合", "#ecd391");
    if (G.pending && G.pending.type === "block" && G.pending.who === 1 && !pickRes) askBlock().then(function (id) { if (NET === me) { busy = true; me.send({ t: "act", a: "block", args: [id] }); DU.render(); } });
  }
  function netOver(m) {
    var st = S(); st.duel.net = st.duel.net || { w: 0, l: 0 }; st.duel.net[m.win ? "w" : "l"]++; UI.save();
    LS("sgl_room", null);
    if (NET) NET.close();
    NET = null; busy = false; if (G) { G.winner = m.win ? 0 : 1; DU.render(); }
    setTimeout(function () {
      UI.modal('<h2>' + (m.win ? '勝利' : '敗北') + '</h2><p>' + (m.why ? esc(m.why) + '。' : m.win ? '攻破了' + esc(opp ? opp.name : '對手') + '的城門。' : '我方城門被攻破了。') + '</p>' +
        '<p class="dim">' + (G ? '共 ' + G.turn + ' 回合。' : '') + '線上對戰試玩版暫時沒有獎勵。</p><div class="row end"><button class="pri" id="do-back">返回</button></div>');
      $("#do-back").onclick = function () { UI.close(); DU.leave(); };
    }, 800);
  }
  DU._game = function () { return G; };   // 測試用
})(window.SG);
