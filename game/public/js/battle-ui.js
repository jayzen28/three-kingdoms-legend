/* 戰鬥畫面：棋盤、小人、選取面板、戰後招降 */
(function (SG) {
  var $ = function (s) { return document.querySelector(s); };
  var B = SG.BATTLE, W = B.W, H = B.H;
  var BU = SG.BattleUI = {};
  var G = null, view = null, tut = null, sel = null, rush = false, mode = null, melee = false, logs = [], stage = null, autoT = null;
  BU.game = function () { return G; };   // 測試用
  var fxq = [], prev = {};          // 待播放的動作、上一幀各單位位置
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var S = function () { return SG._state; };
  var dist = function (a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };

  var HELP = '<h2>規則速覽</h2>' +
    '<p><b>體力</b>：全隊每回合 10 點，走一格扣 1，最多留 3 點到下回合。攻擊不扣體力（法術扣 2）。每名武將每回合可移動一次、攻擊一次。</p>' +
    '<p><b>武力</b>：決定普攻傷害，也決定減傷（武力 100 少受 20% 傷害）。</p>' +
    '<p><b>智力</b>：決定法術傷害與成功率。成功率＝50%＋（我方智力−目標智力）%，最低 10%、最高 95%；失敗整招落空。補血、索敵一定成功。</p>' +
    '<p><b>魅力</b>：戰後招降。每打倒一名有名字的敵將，照隊伍平均魅力擲一次（平均 70 就是 7%），成功得到她的 N 卡。</p>' +
    '<p><b>猛攻</b>：攻擊前開啟，多扣 3 體力，這一擊 ×1.5。</p>' +
    '<p><b>背襲</b>：每名武將有面向（棋子邊上的金色箭頭），等於她最後一次移動或攻擊的方向。近戰從她正後方那一格打，傷害 ×2；弓箭和法術不算。</p>' +
    '<p><b>相剋</b>：槍剋騎、騎剋弓、弓剋槍；刺客與法師互剋（×1.5，被剋 ×0.75）。</p>' +
    '<p><b>兵種</b>：槍兵反擊全額；騎兵移動 3，走 2 格以上衝鋒 ×1.5；弓兵射程 2～4，被貼身不能打；刺客移動 2、兵力較少、不會被反擊、可隱身（2 體力），最適合繞背；法師法術射程 1～3 會波及旁邊、火燃燒冰凍結，近身也能用武力普攻，另有補血 1、群療 3、索敵 5×5。</p>' +
    '<p><b>據點</b>：站上敵方據點並撐到你下回合開始就佔領。守城受傷 −30%、守營 −15%。</p>' +
    '<p><b>小人</b>：每 1000 兵力一個人（最多 9）。</p>' +
    '<div class="row end"><button onclick="SG.UI.close()">知道了</button></div>';

  BU.start = function (st) {
    stage = st; logs = []; sel = null; view = null;
    tut = st.tutorial && !S().cleared[st.id] ? { 槍: 0, 騎: 0, 弓: 0, 刺: 0, 法: 0 } : null; rush = false; mode = null; melee = false;
    fxq = []; prev = {};
    G = new SG.Battle(st, SG.teamUnits(S()), { render: render, log: logMsg, banner: SG.UI.banner, float: floatTxt, finish: finish });
    // 攔下攻擊與補血，記下要播的動作（衝刺、法術、刀光）
    var atk0 = G.doAttack, heal0 = G.heal;
    G.doAttack = function (a, d, r, m) {
      var sp = a.typ === "法" && !m;
      if (tut && a.side === "P") tut[a.typ] = 1;
      fxq.push({ k: "lunge", uid: a.uid, dx: Math.sign(d.c - a.c), dy: Math.sign(d.r - a.r), far: sp || a.typ === "弓" });
      fxq.push({ k: sp ? (a.elem === "火" ? "fire" : "ice") : "slash", r: d.r, c: d.c });
      return atk0.apply(G, arguments);
    };
    G.heal = function (m, list) { if (tut && m.side === "P") tut["法"] = 1; list.forEach(function (t) { fxq.push({ k: "heal", r: t.r, c: t.c }); }); return heal0.apply(G, arguments); };
    $("#b-tip").textContent = st.id + "　" + st.name + "：" + st.tip;
    $("#blog").innerHTML = "";
    SG.UI.go("battle");
    $("#b-wrap").classList.toggle("flip", SG.STAGES.indexOf(st) % 2 === 1);
    var bw = $("#b-wrap"); bw.classList.toggle("shaped", !!st.shape);
    if (st.shape) {
      var rects = ""; st.shape.forEach(function (row, r) { for (var c = 0; c < row.length; c++) if (row.charAt(c) !== ".") rects += "<rect x='" + c + "' y='" + r + "' width='1.03' height='1.03'/>"; });
      bw.style.setProperty("--mask", 'url("data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10' preserveAspectRatio='none'>" + rects + "</svg>") + '")');
    } bw.className = bw.className.replace(/\benv-\S+/g, "").trim(); bw.classList.add("env-" + SG.WEATHERS[Math.floor(Math.random() * SG.WEATHERS.length)]);
    G.start();
    if (tut) SG.UI.modal('<h2>作戰說明</h2><p>把敵人全部打倒就贏。點我方武將，<b>藍格</b>可以走，<b>紅框</b>可以打。全隊每回合共 10 點體力，走一格扣 1 點。</p>' +
      '<p>五種兵種用法不同。棋盤下方有教學清單，每種兵種出手一次就會打勾。</p>' + SG.UI.typeGuide() + '<div class="row end"><button class="pri" onclick="SG.UI.close()">開始</button></div>');
  };
  $("#b-help").onclick = function () { SG.UI.modal(HELP); };
  $("#b-quit").onclick = function () { if (G && !G.over) G.finish(false, "撤退"); };

  function finish(win, why) {
    render();
    var st = S(), first = win && !st.cleared[stage.id], gain = 0, rec = null;
    if (win) {
      gain = SG.WIN_COPPER; st.copper += gain; SG.Daily.bump(st, "wins", 1);
      if (first) { st.cleared[stage.id] = true; st.copper += SG.STAGE_FIRST.copper; st.tickets += SG.STAGE_FIRST.tickets; }
      rec = SG.recruit(st, G.fallen);
    }
    var gift = win && stage.tutorial && !st.starter ? SG.giveStarter(st) : null;
    SG.UI.save();
    var recHtml = "";
    if (rec) {
      if (!G.fallen.length) recHtml = '<p class="dim">這一戰沒有可招降的敵將。</p>';
      else if (rec.got.length) recHtml = '<p><b>招降成功：</b>' + rec.got.map(function (c) { return c.name; }).join("、") + ' 歸順（N 卡）</p><div class="cards">' +
        rec.got.map(function (c) { return SG.UI.cardHtml(c, { rar: "N", star: 1 }); }).join("") + '</div>';
      else recHtml = '<p class="dim">招降：' + G.fallen.join("、") + ' 不肯歸順（每人 ' + SG.UI.pct(rec.p) + '）。</p>';
    }
    SG.UI.modal('<div class="verdict ' + (win ? 'win' : 'lose') + '">' + (win ? '大捷' : '敗退') + '</div>' +
      '<p style="text-align:center">' + why + '・第 ' + Math.min(G.round, G.maxT) + ' 回合</p>' +
      (win ? '<p style="text-align:center">銅錢 +' + fmt(gain) + (first ? '<br>首次通關：銅錢 +' + fmt(SG.STAGE_FIRST.copper) + '、茶館抽券 ×' + SG.STAGE_FIRST.tickets : '') + '</p>' + recHtml
        : '<p class="dim" style="text-align:center">到茶館多招募幾輪，合成升星再來。</p>') +
      (gift ? '<p style="text-align:center"><b>新手禮：一般茶館 ' + SG.STARTER_PULLS + ' 抽</b></p><div class="row mid"><button class="pri" id="f-gift">拆開新手禮</button></div>'
        : '<div class="row mid"><button class="pri" id="f-again">再戰一次</button><button id="f-back">回戰役</button></div>'));
    if (gift) { $("#f-gift").onclick = function () { SG.UI.close(); SG.UI.go("home"); SG.UI.reveal("新手禮・一般茶館", gift, function () { SG.UI.result("新手禮・一般茶館", gift, "這 " + SG.STARTER_PULLS + " 抽已經幫你合成好，並自動編好隊伍，可以到「編隊」調整。"); SG.UI.go("home"); }); }; return; }
    $("#f-again").onclick = function () { SG.UI.close(); BU.start(stage); };
    $("#f-back").onclick = function () { SG.UI.close(); SG.UI.go("camp"); };
  }

  function clickCell(r, c) {
    if (!G || G.over || G.busy || G.turnSide !== "P") return;
    var u = G.at(r, c), cur = sel && G.units.find(function (x) { return x.uid === sel && x.hp > 0; });
    var err = null;
    if (cur && mode === "heal") {
      if (u && u.side === "P") err = G.act("heal", cur, { t: u });
      mode = null; if (err) SG.UI.flash(err); render(); return;
    }
    if (u && u.side === "E" && G.visible(u, "P")) {
      var canHit = cur && !cur.acted && !cur.stun && !cur.sneak && (cur.typ === "法" && melee ? G.meleeTargets(cur, "P") : G.targets(cur, "P")).indexOf(u) >= 0;
      if (canHit) { view = null; err = G.act("attack", cur, { t: u, rush: rush, melee: melee }); if (err) SG.UI.flash(err); else { rush = false; melee = false; } render(); return; }
      view = u.uid; render(); return;       // 打不到（或沒選人）：看她的資料
    }
    view = null;
    if (u && u.side === "P") { sel = u.uid; mode = null; rush = false; melee = false; render(); return; }
    if (cur && !u && G.free(r, c)) { err = G.act("move", cur, { r: r, c: c }); if (!err) { render(); return; } }
    sel = null; mode = null; melee = false; render();
  }

  function unitHtml(u) {
    var fx = (u.burn ? "火" : "") + (u.frozen ? "冰" : "") + (u.stun ? "懾" : "") + (u.stealth ? "隱" : "");
    var men = Math.min(9, Math.ceil(u.hp / 1000)), g = '<svg><use href="#' + (u.typ === "騎" ? "i-horse" : "i-foot") + '"/></svg>';
    var done = u.side === "P" && G.turnSide === "P" && G.unitDone(u);
    return '<div class="u ' + u.side + (u.uid === sel ? " sel" : "") + (done ? " done" : "") + (u.stealth ? " hid" : "") + '" data-uid="' + u.uid + '">' +
      '<div class="men">' + Array(men + 1).join(g) + '</div>' +
      '<span class="head' + (u.art ? ' f-' + SG.FAC_KEY[SG.GEN[u.name] ? SG.GEN[u.name].fac : "黃巾"] : '') + '">' + (u.art ? '<img src="img/' + u.art + '_head.webp" alt="">' : u.name[0]) + '</span><span class="ty">' + u.typ + '</span>' +
      (fx ? '<span class="fx">' + fx + '</span>' : '') +
      '<i class="fa" style="transform:rotate(' + (u.fr === -1 ? 0 : u.fc === 1 ? 90 : u.fr === 1 ? 180 : 270) + 'deg)"></i>' +
      '<div class="hp"><i style="width:' + Math.max(0, u.hp / u.maxhp * 100) + '%"></i></div></div>';
  }
  // 動作：移動滑行、攻擊衝刺、受擊震動、法術與刀光
  function playFx(board) {
    var cs = board.clientWidth / W, fxl = $("#b-fx");
    var find = function (uid) { return board.querySelector('[data-uid="' + uid + '"]'); };
    var now = {};
    G.units.forEach(function (u) {
      if (u.hp <= 0) return; now[u.uid] = { r: u.r, c: u.c };
      var p = prev[u.uid], el = find(u.uid);
      if (!still && p && el && el.animate && (p.r !== u.r || p.c !== u.c))
        el.animate([{ transform: "translate(" + (p.c - u.c) * cs + "px," + (p.r - u.r) * cs + "px)" }, { transform: "none" }], { duration: 240, easing: "ease-out" });
    });
    prev = now;
    var q = fxq; fxq = [];
    q.forEach(function (f) {
      if (f.k === "lunge" || f.k === "hit") {
        var el = find(f.uid); if (!el || !el.animate || still) return;
        if (f.k === "lunge") { var d = f.far ? 0.18 : 0.5; el.animate([{ transform: "none" }, { transform: "translate(" + f.dx * cs * d + "px," + f.dy * cs * d + "px) scale(1.08)" }, { transform: "none" }], { duration: 300, easing: "ease-in-out" }); }
        else el.animate([{ transform: "translateX(0)", filter: "brightness(2.2)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)", filter: "brightness(1)" }, { transform: "translateX(-3px)" }, { transform: "none" }], { duration: 320, delay: 120 });
        return;
      }
      var b = document.createElement("div"); b.className = (f.k === "slash" ? "slash" : "burst " + f.k);
      b.style.left = (f.c / W * 100) + "%"; b.style.top = (f.r / H * 100) + "%"; if (f.k !== "ink") b.style.animationDelay = ".1s";
      fxl.appendChild(b); setTimeout(function () { b.remove(); }, 800);
    });
  }
  function render() {
    if (!G) return;
    var cur = sel && G.units.find(function (x) { return x.uid === sel && x.hp > 0; });
    var my = G.turnSide === "P" && !G.busy;
    var canAct = cur && my && !cur.acted && !cur.sneak && !cur.stun;
    var spell = cur && cur.typ === "法" && !melee;
    var mv = cur && my ? G.moveCells(cur) : [];
    var tg = canAct ? (cur.typ === "法" && melee ? G.meleeTargets(cur, "P") : G.targets(cur, "P")) : [];
    var hl = cur && mode === "heal" ? G.alive("P").filter(function (a) { return dist(a, cur) <= 3; }) : [];
    var b = document.createElement("div"); b.className = "board"; var shaped = !!stage.shape;
    for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) {
      var d = document.createElement("div"), k = r * W + c;
      var isBase = G.base && ((r === G.base.P.r && c === G.base.P.c) || (r === G.base.E.r && c === G.base.E.c));
      if (G.voidc[k]) { d.className = "cell void"; b.appendChild(d); continue; }
      d.className = "cell" + (G.block[k] ? " blk" : "") + (isBase ? " base " + G.kind[r === G.base.P.r ? "P" : "E"] : "");
      if (isBase || G.block[k]) d.innerHTML = '<div class="bi"></div>';
      if (shaped) {      // 戰場外緣描邊
        var out = function (rr, cc) { return rr < 0 || rr >= H || cc < 0 || cc >= W || G.voidc[rr * W + cc]; };
        var bw4 = [out(r - 1, c), out(r, c + 1), out(r + 1, c), out(r, c - 1)];
        if (bw4[0] || bw4[1] || bw4[2] || bw4[3]) d.innerHTML += '<i class="eg" style="border-width:' + bw4.map(function (x) { return x ? "3px" : "0"; }).join(" ") + '"></i>';
      }
      var u = G.at(r, c); if (u && (u.side === "P" || G.visible(u, "P"))) d.innerHTML += unitHtml(u);
      var inL = function (arr) { return arr.some(function (x) { return x.r === r && x.c === c; }); };
      if (inL(hl)) d.classList.add("hl");
      else if (inL(tg)) {
        d.classList.add("tg");
        if (spell && u) d.innerHTML += '<span class="pc">' + Math.round(G.chance(cur, u) * 100) + '%</span>';
        else if (u && G.canBack(cur, melee) && G.isBack(cur, u)) { d.classList.add("back"); d.innerHTML += '<span class="pc bk">背襲×2</span>'; }
      }
      else if (inL(mv)) d.classList.add("mv");
      (function (rr, cc) { d.onclick = function () { clickCell(rr, cc); }; })(r, c);
      b.appendChild(d);
    }
    var box = $("#b-board"); box.innerHTML = ""; box.appendChild(b);
    playFx(b);
    $("#b-round").textContent = "第 " + Math.min(G.round, G.maxT) + " / " + G.maxT + " 回合";
    $("#b-side").textContent = G.turnSide === "P" ? "我方行動" : "敵軍行動中…";
    var st = G.turnSide === "P" ? G.st : 0, pips = "";
    for (var i = 0; i < Math.max(B.STAM + B.CARRY, st); i++) pips += '<i class="' + (i < st ? "on" : "") + (i < Math.min(B.CARRY, st) ? " keep" : "") + '"></i>';
    $("#b-st").textContent = G.turnSide === "P" ? G.st : "—";
    $("#b-pips").innerHTML = pips;
    var vu = view && G.units.find(function (x) { return x.uid === view && x.hp > 0; });
    if (vu) enemyPanel(vu); else panel(cur);
    tutBar();
    if (my && !G.over) { clearTimeout(autoT); autoT = setTimeout(checkAuto, 0); }
  }
  function checkAuto() {
    if (!G || G.over || G.busy || G.turnSide !== "P") return;
    if (G.allDone()) {
      G.busy = true; sel = null; render(); SG.UI.banner("全軍行動完畢", "#cfe0f3");
      setTimeout(function () { G.busy = false; if (!G.over) G.endSide("P"); }, 700);
    }
  }
  function headBtn(u, fac) { return '<span class="hbtn" id="p-head" title="看大卡">' + SG.UI.head(u.name, fac, u.art) + '</span>'; }
  function bindHead(u) { var e = document.getElementById("p-head"); if (e) e.onclick = function () { SG.UI.unitDetail(u); }; }
  function enemyPanel(e) {
    var p = $("#bpanel"), t = SG.TYPES[e.typ], card = SG.GEN[e.name], st = [];
    if (e.stun) st.push("震懾中"); if (e.frozen) st.push("凍結"); if (e.burn) st.push("燃燒 " + e.burn + " 回合");
    var m = sel && G.units.find(function (x) { return x.uid === sel && x.hp > 0; }), rel = "";
    if (m) { var k = SG.mult(m.typ, e.typ); rel = k > 1 ? "我方 " + m.name + " 剋她（×1.5）" : k < 1 ? "她剋我方 " + m.name + "（×0.75）" : ""; }
    p.innerHTML = '<div class="top enemy">' + headBtn(e, card ? card.fac : "黃巾") +
      '<div class="grow"><b class="n">' + e.name + '</b><span class="tag red">敵軍</span><span class="tag">' + t.name + '</span>' + (e.elem ? '<span class="tag">' + e.elem + '</span>' : '') + '<span class="tag">' + e.rar + ' ' + e.star + '★</span>' +
      '<div class="sub">武 ' + e.w + '・智 ' + e.z + '・魅 ' + e.m + '｜兵力 ' + fmt(e.hp) + ' / ' + fmt(e.maxhp) + '</div>' +
      '<div class="sub">普攻 ' + e.am + (e.typ === "法" ? '・法術 ' + e.asp : '') + '・受傷 −' + SG.UI.pct(e.dr) + '・移動 ' + t.mv + '・射程 ' + (t.r[0] === t.r[1] ? t.r[0] : t.r[0] + '～' + t.r[1]) + '</div>' +
      (st.length || rel ? '<div class="sub" style="color:var(--red)">' + st.concat(rel ? [rel] : []).join('；') + '</div>' : '') +
      '</div></div><div class="dim">點頭像看大卡。要打她，先選我方武將，她在紅框裡才打得到。</div>';
    bindHead(e);
  }
  var TUT = { 槍: "槍兵：站前面，讓敵人來打她，她會全額反擊", 騎: "騎兵：走 2 格以上再打弓兵，衝鋒加相剋", 弓: "弓兵：隔 2～4 格射槍兵，別讓敵人貼身", 刺: "刺客：繞到敵人正後方打，背襲 ×2", 法: "法師：對 1～3 格內的敵人放法術，或幫隊友補血" };
  function tutBar() {
    var el = document.getElementById("b-tut");
    if (!tut) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "b-tut"; el.className = "paper"; $("#bpanel").parentNode.insertBefore(el, $("#bpanel")); }
    var cur = sel && G.units.find(function (x) { return x.uid === sel && x.hp > 0; });
    var left = Object.keys(tut).filter(function (k) { return !tut[k]; });
    el.innerHTML = '<b>教學清單</b>' + Object.keys(TUT).map(function (k) { return '<span class="tk' + (tut[k] ? ' ok' : '') + (cur && cur.typ === k ? ' cur' : '') + '">' + (tut[k] ? '✓' : '□') + SG.TYPES[k].name + '</span>'; }).join("") +
      '<div class="sub">' + (cur ? TUT[cur.typ] : left.length ? "還沒出手：" + left.map(function (k) { return SG.TYPES[k].name; }).join("、") + "。點一位試試看。" : "五種兵種都用過了，把敵人打倒吧。") + '</div>';
  }
  function panel(cur) {
    var p = $("#bpanel");
    if (!cur) { p.innerHTML = '<div class="dim">點選我方武將：藍格可移動、紅框可攻擊、綠框可補血。<br>金色箭頭是面向，近戰從正後方打 ×2（背襲）。<br>法術目標上的數字是成功率。每名武將行動完或按「待命」，全軍完成就換敵軍。<br>金圈的體力點可以留到下回合。</div>'; return; }
    var card = cur.cardId ? SG.CARD_BY_ID[cur.cardId] : null, t = SG.TYPES[cur.typ], isMage = cur.typ === "法";
    var my = G.turnSide === "P" && !G.busy, can = my && !cur.acted && !cur.stun && !cur.sneak;
    var st = [];
    if (cur.stun) st.push("震懾中，本回合不能行動"); if (cur.frozen) st.push("凍結：不能移動、不能反擊");
    if (cur.burn) st.push("燃燒 " + cur.burn + " 回合"); if (cur.stealth) st.push("隱身中"); if (cur.sneak) st.push("剛隱身，下回合才能移動");
    var base = isMage && !melee ? 2 : 0;
    var btn = '<button id="p-wait" ' + (my && !G.unitDone(cur) ? '' : 'disabled') + '>待命</button>' +
      '<button id="p-rush" class="' + (rush ? 'on' : '') + '" ' + (can && G.st >= B.RUSH + base ? '' : 'disabled') + '>猛攻' + (rush ? '：開' : '') + '（3）</button>';
    if (cur.typ === "刺") btn += '<button id="p-hide" ' + (can && !cur.moved && !cur.stealth && G.st >= 2 ? '' : 'disabled') + '>隱身（2）</button>';
    if (isMage) btn += '<button id="p-melee" class="' + (melee ? 'on' : '') + '" ' + (can && G.meleeTargets(cur, "P").length ? '' : 'disabled') + '>' + (melee ? '普攻：開' : '改用普攻') + '（0）</button>' +
      '<button id="p-heal" class="' + (mode === "heal" ? 'on' : '') + '" ' + (can && G.st >= 1 ? '' : 'disabled') + '>補血（1）</button>' +
      '<button id="p-aoe" ' + (can && G.st >= 3 ? '' : 'disabled') + '>群療（3）</button><button id="p-scout" ' + (can ? '' : 'disabled') + '>索敵（0）</button>';
    p.innerHTML = '<div class="top">' + headBtn(cur, card ? card.fac : "黃巾") +
      '<div class="grow"><b class="n">' + cur.name + '</b><span class="tag">' + t.name + '</span>' + (cur.elem ? '<span class="tag">' + cur.elem + '</span>' : '') + '<span class="tag">' + cur.rar + ' ' + cur.star + '★</span>' +
      '<div class="sub">武 ' + cur.w + '・智 ' + cur.z + '・魅 ' + cur.m + '｜兵力 ' + fmt(cur.hp) + ' / ' + fmt(cur.maxhp) + '</div>' +
      '<div class="sub">普攻 ' + cur.am + (isMage ? '・法術 ' + cur.asp + '（扣 2 體力）' : '') + '・受傷 −' + SG.UI.pct(cur.dr) + '・移動 ' + t.mv + '</div>' +
      (st.length ? '<div class="sub" style="color:var(--cinnabar)">' + st.join('；') + '</div>' : '') + '</div></div><div class="row">' + btn + '</div>';
    bindHead(cur);
    var on = function (id, f) { var e = document.getElementById(id); if (e) e.onclick = f; };
    var run = function (a) { var e = G.act(a, cur); if (e) SG.UI.flash(e); if (a === "wait") sel = null; render(); };
    on("p-wait", function () { run("wait"); });
    on("p-rush", function () { rush = !rush; render(); });
    on("p-hide", function () { run("stealth"); });
    on("p-melee", function () { melee = !melee; mode = null; render(); });
    on("p-heal", function () { mode = mode === "heal" ? null : "heal"; render(); });
    on("p-aoe", function () { run("aoe"); });
    on("p-scout", function () { run("scout"); });
  }
  function floatTxt(u, txt, cls) {
    var fx = $("#b-fx"); if (!fx) return;
    if (u.side === "E" && !G.visible(u, "P")) return;
    if (txt.charAt(0) === "-") { if (u.hp <= 0) fxq.push({ k: "ink", r: u.r, c: u.c }); else fxq.push({ k: "hit", uid: u.uid }); }
    var f = document.createElement("div"); f.className = "float " + (cls || ""); f.textContent = txt;
    f.style.left = ((u.c + 0.5) / W * 100) + "%"; f.style.top = (u.r / H * 100) + "%";
    fx.appendChild(f);
    setTimeout(function () { f.remove(); }, 900);
  }
  function logMsg(m) { logs.unshift(m); logs = logs.slice(0, 4); $("#blog").innerHTML = logs.join("<br>"); }
})(window.SG);
