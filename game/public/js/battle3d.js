/* 斜視戰場畫面（✅ Jay 2026-11-15：正式版改用斜視戰場）。只管畫，不管規則：battle-ui 給它狀態，它回報點了哪一格 */
(function (SG) {
  var C = 56, TILT = 56, UP = "rotateZ(calc(var(--rot) * -1)) rotateX(-" + TILT + "deg)";
  var S3 = SG.B3D = {};
  var G = null, view = null, pan = null, board = null, cells = {}, UE = {}, SE = {}, labels = [], onTap = null;
  var ROT = 45, zoom = 1, px = 0, py = 0, snow = "", offs = [], menu = null, KT = Math.cos(TILT * Math.PI / 180);
  var SN = { "槍": "spear", "騎": "cav", "弓": "bow", "法": "mage", "刺": "assassin" };
  var SLOT = [[0, 6], [-15, -8], [15, -8], [-15, 18], [15, 18], [0, -21], [0, 26], [-24, 5], [24, 5]];
  var RING = [[20, 20], [-4, 26], [26, -4], [30, 12], [12, 30], [-18, 22], [22, -18], [34, 30], [0, 36]];
  var TWO = ["諸葛", "司馬", "夏侯", "公孫", "太史", "皇甫"];
  function el(cls, html) { var d = document.createElement("div"); d.className = cls; if (html) d.innerHTML = html; return d; }
  function depth(x, y) { var a = ROT * Math.PI / 180; return Math.round(x * Math.sin(a) + y * Math.cos(a)) + 3000; }
  function place() {
    board.style.setProperty("--rot", ROT + "deg"); pan.style.transform = "translate(" + px + "px," + py + "px) scale(" + zoom + ") rotateX(" + TILT + "deg) rotateZ(" + ROT + "deg)";
    // 圖的地基中心不在圖的最下緣：把立牌的落點往鏡頭方向挪，地基才會壓在它那一格上（不能把圖往下推，推到地面下會被地面吃掉）
    var a = ROT * Math.PI / 180, sx = Math.sin(a), cy = Math.cos(a);
    offs.forEach(function (o) { o.g.style.transform = "translate(" + (o.d * sx).toFixed(1) + "px," + (o.d * cy).toFixed(1) + "px)"; });
    posMenu();
  }
  function off(g, px2) { offs.push({ g: g, d: px2 / KT }); }
  function posMenu() {
    if (!menu || !menu.el) return; var e = UE[menu.uid]; if (!e) return;
    var f = e.flag.querySelector(".b3-face").getBoundingClientRect(), v = view.getBoundingClientRect(), w = menu.el.offsetWidth, h = menu.el.offsetHeight;
    var x = f.right - v.left + 10; if (x + w > v.width - 4) x = f.left - v.left - w - 10; x = Math.max(4, Math.min(v.width - w - 4, x));
    var y = Math.max(50, Math.min(v.height - h - 6, f.top - v.top - 6));
    menu.el.style.left = x + "px"; menu.el.style.top = y + "px";
  }
  // 頭像旁的指令選單（✅ Jay 2026-11-15：移動／攻擊／待機／個人情報，不要放在畫面下面）
  S3.setMenu = function (uid, html, cb) {
    if (menu && menu.el) menu.el.remove(); menu = null;
    if (!uid || !html || !view) return;
    var m = el("b3-menu", html); view.appendChild(m);
    m.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b && !b.disabled && cb) cb(b.dataset.a); });
    menu = { uid: uid, el: m }; posMenu();
  };
  function resort() { board.querySelectorAll(".b3-g").forEach(function (g) { if (g.dataset.top) return; g.style.zIndex = depth(parseFloat(g.style.left), parseFloat(g.style.top)) + (+g.dataset.z || 0); }); }
  function gAt(r, c, z) { var g = el("b3-g"); g.style.left = (c + .5) * C + "px"; g.style.top = (r + .5) * C + "px"; g.dataset.z = z || 0; g.style.zIndex = depth((c + .5) * C, (r + .5) * C) + (z || 0); return g; }
  function upimg(n, w, h, ox, oy, cls, dl) {
    return '<div class="b3-up ' + (cls || "") + '" style="transform:' + UP + ';left:' + ox + 'px;top:' + oy + 'px;width:' + w + 'px;height:' + h + 'px;margin:-' + (h - 6) + 'px 0 0 -' + w / 2 + 'px"><img src="img/bf/' + n + '.webp" alt="" draggable="false" style="bottom:0;animation-delay:-' + (dl || 0) + 's"></div>';
  }
  function prop(r, c, ch) {
    var g = gAt(r, c, 0), k = c * 7 + r * 13, h;
    if (ch === "f") { var o = [[-13, -14], [14, -10], [-11, 12], [13, 15]]; if (k % 3 === 0) o.splice(k % 4, 1); h = o.map(function (q, i) { return upimg("obj_tree_" + ((k + i * 3) % 4 + 1), 36, 46 + ((k + i) % 3) * 7, q[0], q[1], "b3-sway", ((k + i * 5) % 7) * .45); }).join(""); }
    else if (ch === "#") h = upimg("obj_fence", 70, 46, 0, 0);
    else { var m = ch === "M" ? ["obj_mtn_l", 64, 116] : ch === "n" ? ["obj_mtn_s", 54, 46] : ["obj_mtn_m", 66, 80]; h = upimg(m[0] + snow, m[1], m[2], 0, 0); off(g, m[2] * .14); }
    g.innerHTML = h; board.appendChild(g);
  }
  function sur(u) { if (!u.named && u.side === "E") return u.typ; var t = u.name.slice(0, 2); return TWO.indexOf(t) >= 0 ? t : u.name.charAt(0); }
  function bimg(s) { return "img/bf/bld_" + (s.kind === "castle" ? (s.hp > 0 ? "castle" : "castle_broken") : (s.hp > 0 ? "granary" : "granary_burnt")) + ".webp"; }

  S3.mount = function (box, game, stage, tap) {
    G = game; onTap = tap; cells = {}; UE = {}; SE = {}; labels = []; offs = []; menu = null; ROT = 45; snow = stage.map.bg === "snow" ? "_snow" : "";
    var W = G.W, H = G.H;
    box.innerHTML = '<div class="b3-view"><div class="b3-pan"><div class="b3-board"></div></div><div class="b3-ctl"><button type="button" data-a="rl" title="向左轉">⟲</button><button type="button" data-a="rr" title="向右轉">⟳</button><button type="button" data-a="zo" title="縮小">－</button><button type="button" data-a="zi" title="放大">＋</button></div></div>';
    view = box.querySelector(".b3-view"); pan = box.querySelector(".b3-pan"); board = box.querySelector(".b3-board");
    board.style.width = W * C + "px"; board.style.height = H * C + "px"; board.style.left = -W * C / 2 + "px"; board.style.top = -H * C / 2 + "px";
    var m = 9, gd = el("b3-ground"), tex = { grass: "ground_plain", dirt: "ground_dirt", snow: "ground_snow" }[stage.map.bg] || "ground_plain";
    gd.style.cssText = "left:" + (-m * C) + "px;top:" + (-m * C) + "px;width:" + (W + 2 * m) * C + "px;height:" + (H + 2 * m) * C + "px;background-image:url(img/bf/" + tex + ".webp);background-size:" + (tex === "ground_plain" ? "840px 840px" : "384px 384px");
    board.appendChild(gd);
    var T = function (r, c) { return r < 0 || c < 0 || r >= H || c >= W ? "^" : G.terr[r * W + c]; };
    for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) {
      var t = T(r, c), d = el("b3-c");
      d.dataset.t = t; d.dataset.k = "c"; d.dataset.r = r; d.dataset.c = c;
      if (t === "=" && !(T(r, c - 1) === "~" || T(r, c + 1) === "~" || T(r, c - 1) === "=" || T(r, c + 1) === "=")) d.dataset.h = "1";   // 河是直的，橋就轉 90 度
      d.style.cssText = "left:" + c * C + "px;top:" + r * C + "px;width:" + C + "px;height:" + C + "px";
      board.appendChild(d); cells[r + "," + c] = d;
      if ("^Mnf#".indexOf(t) >= 0) prop(r, c, t);
    }
    ["P", "E"].forEach(function (side) {
      var s = G.struct[side], g = gAt(s.r, s.c, 2), u = el("b3-up b3-bld " + side);
      u.style.cssText = "width:86px;height:82px;margin-left:-43px;margin-top:-74px;transform:" + UP;
      u.innerHTML = '<span class="b3-bi"><img src="' + bimg(s) + '" alt="" draggable="false" style="bottom:0"></span><div class="b3-tag"><span></span><u><b></b></u></div>';
      g.appendChild(u); board.appendChild(g); off(g, 82 * (s.kind === "castle" ? .23 : .36));
      var hot = el("b3-hot " + side); hot.dataset.k = "c"; hot.dataset.r = s.r; hot.dataset.c = s.c;
      hot.style.cssText = "left:" + s.c * C + "px;top:" + s.r * C + "px;width:" + C + "px;height:" + C + "px"; board.appendChild(hot);
      SE[side] = { el: u, hot: hot, dead: false };
    });
    bind();
    zoom = Math.max(0.55, Math.min(1.05, view.clientWidth / (W * C * 1.414) * 1.9)); px = 0; py = 0; place();
    S3.focus(G.H - 3, Math.floor(G.W / 2));
  };
  S3.focus = function (r, c) {
    r = Math.max(0, Math.min(G.H - 1, r)); c = Math.max(0, Math.min(G.W - 1, c));
    var a = cells[r + "," + c].getBoundingClientRect(), v = view.getBoundingClientRect();
    px += v.left + v.width / 2 - (a.left + a.width / 2); py += v.top + v.height / 2 - (a.top + a.height / 2); place();
  };

  function mkU(u) {
    var g = el("b3-g b3-unit " + u.side); g.dataset.k = "u"; g.dataset.uid = u.uid;
    var f = el("b3-up b3-flag"); f.style.transform = UP;
    var s2 = sur(u);
    f.innerHTML = '<div class="b3-ban ' + u.side + '" style="animation-delay:-' + (Object.keys(UE).length % 4 * .2) + 's"><span' + (s2.length > 1 ? ' class="two"' : '') + '>' + s2 + '</span></div>' +
      '<div class="b3-face"' + (u.art ? ' style="background-image:url(img/' + u.art + '_head.webp)"' : '') + '>' + (u.art ? '' : '<span>' + u.name.charAt(0) + '</span>') + '</div><span class="b3-ty">' + u.typ + '</span><span class="b3-fx"></span><div class="b3-hp"></div><div class="b3-bar"><b></b></div>';
    var fa = el("b3-fa"); g.appendChild(fa); g.appendChild(f); board.appendChild(g);
    return UE[u.uid] = { g: g, flag: f, fa: fa, men: [], on: null };
  }
  function upU(u, st) {
    var e = UE[u.uid] || mkU(u), on = G.onOwnBase(u) && G.struct[u.side].hp > 0;
    var shown = u.hp > 0 && (u.side === "P" || G.visible(u, "P"));
    e.g.style.display = shown ? "" : "none"; if (!shown) return;
    var x = (u.c + .5) * C, y = (u.r + .5) * C;
    e.g.style.left = x + "px"; e.g.style.top = y + "px"; e.g.dataset.z = on ? 3 : 1; e.g.style.zIndex = depth(x, y) + (on ? 3 : 1);
    e.flag.style.transform = UP + (on ? " translateY(-88px)" : "");
    e.g.classList.toggle("sel", u.uid === st.sel); e.g.classList.toggle("done", !!st.done(u)); e.g.classList.toggle("hid", !!u.stealth);
    var n = Math.max(1, Math.min(9, Math.ceil(u.hp / 1000)));
    if (e.on !== on) { e.men.forEach(function (m) { m.remove(); }); e.men = []; e.on = on; }
    while (e.men.length < n) { var i = e.men.length, m = el("b3-up b3-sol"), q = (on ? RING : SLOT)[i]; m.style.transform = UP; m.style.left = q[0] + "px"; m.style.top = q[1] + "px"; m.innerHTML = "<i style='animation-delay:-" + (Math.random() * 1.1).toFixed(2) + "s'><img src='img/bf/sol_" + (u.side === "P" ? "p" : "e") + "_" + SN[u.typ] + ".webp' alt='' draggable='false'></i>"; e.g.appendChild(m); e.men.push(m); }
    while (e.men.length > n) { var d = e.men.pop(); d.classList.add("dead"); (function (d) { setTimeout(function () { d.remove(); }, 520); })(d); }
    e.flag.querySelector(".b3-hp").textContent = Math.max(0, Math.round(u.hp));
    e.flag.querySelector(".b3-bar b").style.width = Math.max(0, u.hp / u.maxhp * 100) + "%";
    e.flag.querySelector(".b3-fx").textContent = (u.burn ? "火" : "") + (u.frozen ? "冰" : "") + (u.stun ? "懾" : "") + (u.stealth ? "隱" : "");
    e.fa.style.transform = "rotate(" + (u.fr === -1 ? 0 : u.fc === 1 ? 90 : u.fr === 1 ? 180 : 270) + "deg)";
  }
  // st：{ sel, mv[], tg[], hl[], label{ "r,c": [字, class] }, siege, done(u) }
  S3.sync = function (st) {
    if (!G || !board) return;
    var k;
    for (k in cells) cells[k].className = "b3-c";
    labels.forEach(function (l) { l.remove(); }); labels = [];
    var mark = function (arr, cls) { (arr || []).forEach(function (p) { var d = cells[p.r + "," + p.c]; if (d) d.classList.add(cls); }); };
    mark(st.mv, "mv"); mark(st.hl, "hl"); mark(st.tg, "at");
    for (k in (st.label || {})) { var rc = k.split(","), g = gAt(+rc[0], +rc[1], 5), p = el("b3-up b3-pc " + (st.label[k][1] || ""), st.label[k][0]); p.style.transform = UP; g.appendChild(p); board.appendChild(g); labels.push(g); }
    G.units.forEach(function (u) {
      var e = UE[u.uid];
      if (u.hp <= 0) { if (e && !e.gone) { e.gone = true; e.men.forEach(function (m) { m.classList.add("dead"); }); (function (e) { setTimeout(function () { e.g.remove(); }, 520); })(e); } return; }
      upU(u, st);
    });
    ["P", "E"].forEach(function (side) {
      var s = G.struct[side], e = SE[side];
      if (s.hp <= 0 && !e.dead) { e.dead = true; e.el.querySelector("img").src = bimg(s); e.el.querySelector(".b3-bi").classList.add("fire"); }
      e.el.querySelector(".b3-tag span").textContent = s.name + " " + Math.max(0, Math.round(s.hp));
      e.el.querySelector(".b3-tag b").style.width = Math.max(0, s.hp / s.max * 100) + "%";
      e.hot.classList.toggle("at", side === "E" && !!st.siege);
    });
  };
  function pop(r, c, txt, cls) { var g = gAt(r, c, 0); g.dataset.top = "1"; g.style.zIndex = 9999; var p = el("b3-up b3-pop " + (cls || ""), txt); p.style.transform = UP; g.appendChild(p); board.appendChild(g); setTimeout(function () { g.remove(); }, 950); }
  S3.float = function (r, c, txt, cls) { if (board) pop(r, c, txt, cls); };
  S3.fx = function (kind, r, c) { if (!board) return; var g = gAt(r, c, 6), b = el("b3-up b3-burst " + kind); b.style.transform = UP; g.appendChild(b); board.appendChild(g); setTimeout(function () { g.remove(); }, 650); };
  S3.jab = function (uid) { var e = UE[uid]; if (!e) return; e.men.forEach(function (m) { m.classList.add("jab"); }); setTimeout(function () { e.men.forEach(function (m) { m.classList.remove("jab"); }); }, 700); };
  S3.hit = function (uid) { var e = UE[uid]; if (!e) return; e.g.classList.add("hit"); setTimeout(function () { e.g.classList.remove("hit"); }, 650); };
  S3.hitBase = function (side) { var e = SE[side]; if (!e) return; e.el.classList.add("hit"); setTimeout(function () { e.el.classList.remove("hit"); }, 650); };
  S3.spin = function (d) { var t0 = ROT, t1 = ROT + d, n = 0; (function f() { n++; ROT = t0 + (t1 - t0) * n / 8; place(); resort(); if (n < 8) requestAnimationFrame(f); })(); };

  // 單指拖動、雙指旋轉＋縮放、點一下（✅ Jay：雙指 360 度旋轉；點頭像或旗子也算點那一隊）
  function bind() {
    var PT = {}, dn = null, g2 = null;
    function two() { var k = Object.keys(PT); if (k.length < 2) return null; var a = PT[k[0]], b = PT[k[1]]; return { ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, dist: Math.hypot(b.x - a.x, b.y - a.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
    view.addEventListener("pointerdown", function (e) {
      if (e.target.closest && (e.target.closest(".b3-ctl") || e.target.closest(".b3-menu"))) return;
      PT[e.pointerId] = { x: e.clientX, y: e.clientY }; try { view.setPointerCapture(e.pointerId); } catch (x) { }
      if (Object.keys(PT).length === 1) dn = { x: e.clientX, y: e.clientY, px: px, py: py, mv: false };
      else { var t = two(); g2 = { ang: t.ang, dist: t.dist, rot: ROT, zoom: zoom, mx: t.mx, my: t.my, px: px, py: py }; if (dn) dn.mv = true; }
    });
    view.addEventListener("pointermove", function (e) {
      if (!PT[e.pointerId]) return; PT[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (g2) { var t = two(); if (!t) return; ROT = g2.rot + (t.ang - g2.ang); zoom = Math.max(0.4, Math.min(2, g2.zoom * t.dist / g2.dist)); px = g2.px + t.mx - g2.mx; py = g2.py + t.my - g2.my; place(); resort(); return; }
      if (!dn) return; var dx = e.clientX - dn.x, dy = e.clientY - dn.y; if (Math.abs(dx) + Math.abs(dy) > 8) dn.mv = true; if (dn.mv) { px = dn.px + dx; py = dn.py + dy; place(); }
    });
    function up(e) {
      if (!PT[e.pointerId]) return;
      var was = !!g2; delete PT[e.pointerId]; if (Object.keys(PT).length < 2) g2 = null; if (Object.keys(PT).length > 0 || !dn) return;
      var d = dn; dn = null; if (d.mv || was || e.type === "pointercancel") return;
      // 先看手指底下有沒有亮著的格子（可走、可打、可補）：有就算點那一格，就算上面蓋著別人的頭像或旗子（✅ Jay：槍兵往前走一格很難按）
      var st = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [document.elementFromPoint(e.clientX, e.clientY)], t = null, i;
      for (i = 0; i < st.length && !t; i++) { var c = st[i].classList; if (c && ((c.contains("b3-c") && (c.contains("mv") || c.contains("at") || c.contains("hl"))) || (c.contains("b3-hot") && c.contains("at")))) t = st[i]; }
      if (!t) { t = st[0]; while (t && t !== view && !(t.dataset && t.dataset.k)) t = t.parentElement; }
      if (!t || t === view || !onTap) return;
      if (t.dataset.k === "u") { var u = G.units.find(function (x) { return x.uid === t.dataset.uid; }); if (u) onTap(u.r, u.c); }
      else onTap(+t.dataset.r, +t.dataset.c);
    }
    view.addEventListener("pointerup", up); view.addEventListener("pointercancel", up);
    view.querySelector(".b3-ctl").addEventListener("click", function (e) {
      var a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === "rl") S3.spin(-45); else if (a === "rr") S3.spin(45);
      else { zoom = a === "zi" ? Math.min(1.8, zoom + 0.15) : Math.max(0.45, zoom - 0.15); place(); }
    });
  }
})(window.SG);
