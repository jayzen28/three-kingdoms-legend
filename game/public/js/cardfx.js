/* 卡面特效（✅ Jay 2026-11-18）：1 閃卡反光、2 飄動（在 jiggle.js）、3 景深、4 粒子、稀有度邊線。
   大卡詳情和抽卡揭曉用全部效果；右上角「特效」鈕可以關掉閃光和粒子，設定會記住。 */
(function (SG) {
  SG.JIGGLE_WIND = 0.011;   // 髮尾、袖子、披風的飄動幅度（佔圖寬的比例）。0 = 關
  var KEY = "sg_cardfx", on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  var R = Math.random, PW = 410, PH = 600, hosts = [], running = false;
  var T = { x: 0, y: 0 }, G = { x: 0, y: 0 }, src = "idle", touchAt = 0, base = null, asked = false;
  // ★ 粒子怎麼分配是開發先填的：火法師火星、冰法師冰晶、UR 和男將金粉、其他花瓣
  function kindOf(c) { return !c ? "gold" : c.elem === "火" ? "fire" : c.elem === "冰" ? "ice" : (c.male || c.ur) ? "gold" : "petal"; }
  var K = {
    gold: { n: 46, add: 1, mk: function () { return { x: R() * PW, y: PH + 10, vx: (R() - .5) * 8, vy: -(10 + R() * 26), r: .8 + R() * 2.2, life: 5 + R() * 5, h: 38 + R() * 14, tw: R() * 6 }; } },
    fire: { n: 60, add: 1, mk: function () { return { x: R() * PW, y: PH + 10, vx: (R() - .5) * 22, vy: -(50 + R() * 110), r: .8 + R() * 2.4, life: 2 + R() * 3, h: 14 + R() * 26, tw: R() * 6 }; } },
    ice: { n: 40, add: 1, mk: function () { return { x: R() * PW, y: -10, vx: (R() - .5) * 10, vy: 12 + R() * 26, r: 1.5 + R() * 3.5, life: 9 + R() * 6, h: 195 + R() * 20, tw: R() * 6, rot: R() * 6, vr: (R() - .5) * 1.2 }; } },
    petal: { n: 30, add: 0, mk: function () { return { x: R() * PW * 1.2 - PW * .1, y: -12, vx: -8 + R() * 30, vy: 22 + R() * 34, r: 3.5 + R() * 4.5, life: 12, h: 338 + R() * 16, tw: R() * 6, rot: R() * 6, vr: (R() - .5) * 3 }; } },
    leaf: { n: 24, add: 0, mk: function () { return { x: R() * PW * 1.2 - PW * .1, y: -12, vx: -6 + R() * 34, vy: 26 + R() * 36, r: 4 + R() * 5, life: 12, h: 85 + R() * 45, tw: R() * 6, rot: R() * 6, vr: (R() - .5) * 3 }; } },
    water: { n: 38, add: 1, mk: function () { return { x: R() * PW, y: PH + 10, vx: (R() - .5) * 6, vy: -(18 + R() * 40), r: 1.5 + R() * 4.5, life: 8, h: 200 + R() * 15, tw: R() * 6 }; } },
    poison: { n: 26, add: 1, mk: function () { return { x: R() * PW, y: PH * (.55 + R() * .5), vx: (R() - .5) * 10, vy: -(6 + R() * 16), r: 16 + R() * 34, life: 5 + R() * 5, h: 280 + R() * 30, tw: R() * 6 }; } },
    wind: { n: 16, add: 1, mk: function () { return { x: -80, y: R() * PH, vx: 260 + R() * 260, vy: (R() - .5) * 30, r: 30 + R() * 70, life: 3, h: 0, tw: R() * 6 }; } }
  };
  function draw(x, p, k, t) {
    var a = Math.min(1, p.age / .6) * Math.min(1, (p.life - p.age) / 1.2), tw = .55 + .45 * Math.sin(t * 5 + p.tw); if (a <= 0) return;
    if (k === "gold" || k === "fire") { var rr = p.r * (k === "fire" ? 1 : tw + .3), g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 4); g.addColorStop(0, "hsla(" + p.h + ",100%,85%," + a * tw + ")"); g.addColorStop(.3, "hsla(" + p.h + ",100%,60%," + a * .55 * tw + ")"); g.addColorStop(1, "hsla(" + p.h + ",100%,50%,0)"); x.fillStyle = g; x.fillRect(p.x - rr * 4, p.y - rr * 4, rr * 8, rr * 8); }
    else if (k === "ice") { x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.strokeStyle = "hsla(" + p.h + ",100%,88%," + a * tw + ")"; x.lineWidth = .9; x.shadowColor = "#9fe4ff"; x.shadowBlur = 6; x.beginPath(); for (var i = 0; i < 3; i++) { x.rotate(Math.PI / 3); x.moveTo(-p.r, 0); x.lineTo(p.r, 0); } x.stroke(); x.restore(); }
    else if (k === "petal" || k === "leaf") { x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(1, .35 + .55 * Math.abs(Math.sin(t * 1.7 + p.tw))); x.fillStyle = "hsla(" + p.h + "," + (k === "leaf" ? 55 : 90) + "%," + (k === "leaf" ? 48 : 84) + "%," + a * .92 + ")"; x.beginPath(); x.moveTo(-p.r, 0); x.quadraticCurveTo(0, -p.r * .8, p.r, 0); x.quadraticCurveTo(0, p.r * .8, -p.r, 0); x.fill(); x.restore(); }
    else if (k === "water") { x.strokeStyle = "hsla(" + p.h + ",100%,85%," + a * .8 + ")"; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.3); x.stroke(); x.fillStyle = "hsla(" + p.h + ",100%,95%," + a * .7 + ")"; x.beginPath(); x.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 6.3); x.fill(); }
    else if (k === "poison") { var g2 = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g2.addColorStop(0, "hsla(" + p.h + ",80%,55%," + a * .22 + ")"); g2.addColorStop(1, "hsla(" + p.h + ",80%,40%,0)"); x.fillStyle = g2; x.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
    else if (k === "wind") { var g3 = x.createLinearGradient(p.x - p.r, 0, p.x, 0); g3.addColorStop(0, "rgba(255,255,255,0)"); g3.addColorStop(1, "rgba(235,250,255," + a * .5 + ")"); x.strokeStyle = g3; x.lineWidth = 1.2; x.beginPath(); x.moveTo(p.x - p.r, p.y); x.quadraticCurveTo(p.x - p.r * .5, p.y + Math.sin(p.tw) * 6, p.x, p.y); x.stroke(); }
  }
  var glit = null;
  function glitter() {   // 亮片圖案（只畫一次）
    if (glit) return glit; var c = document.createElement("canvas"); c.width = c.height = 220; var x = c.getContext("2d"), s = 7;
    var rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (var i = 0; i < 150; i++) { var px = rnd() * 220, py = rnd() * 220, r = 0.6 + rnd() * rnd() * 2.6, h = rnd() * 360;
      var g = x.createRadialGradient(px, py, 0, px, py, r * 2.2); g.addColorStop(0, "hsla(" + h + ",100%,92%,1)"); g.addColorStop(0.4, "hsla(" + h + ",100%,70%,.6)"); g.addColorStop(1, "hsla(" + h + ",100%,60%,0)");
      x.fillStyle = g; x.fillRect(px - 8, py - 8, 16, 16);
      if (r > 2) { x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 0.6; x.beginPath(); x.moveTo(px - r * 3, py); x.lineTo(px + r * 3, py); x.moveTo(px, py - r * 3); x.lineTo(px, py + r * 3); x.stroke(); } }
    glit = "url(" + c.toDataURL() + ")"; document.documentElement.style.setProperty("--glit", glit); return glit;
  }
  function onOri(e) { if (e.gamma == null) return; if (!base) base = { b: e.beta, g: e.gamma }; if (performance.now() - touchAt < 600) return;
    G.x = Math.max(-1, Math.min(1, (e.gamma - base.g) / 22)); G.y = Math.max(-1, Math.min(1, (e.beta - base.b) / 22)); src = "gyro"; }
  function gyro(fromTap) {
    var D = window.DeviceOrientationEvent; if (!D || asked) return;
    if (D.requestPermission) { if (!fromTap) return; asked = true; D.requestPermission().then(function (s) { if (s === "granted") window.addEventListener("deviceorientation", onOri); }).catch(function () {}); }
    else { asked = true; window.addEventListener("deviceorientation", onOri); }
  }
  var last = 0;
  function frame(now) {
    hosts = hosts.filter(function (h) { return h.el.isConnected; });
    if (!hosts.length) { running = false; src = "idle"; base = null; return; }
    var dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
    if (src === "idle") { G.x = Math.sin(t * .7) * .55; G.y = Math.cos(t * .53) * .4; }   // 沒人碰的時候自己慢慢擺
    T.x += (G.x - T.x) * Math.min(1, dt * 7); T.y += (G.y - T.y) * Math.min(1, dt * 7);
    hosts.forEach(function (h) {
      var st = h.el.style; st.setProperty("--tx", T.x.toFixed(3)); st.setProperty("--ty", T.y.toFixed(3)); st.setProperty("--px", (50 + T.x * 50).toFixed(1) + "%"); st.setProperty("--py", (50 + T.y * 50).toFixed(1) + "%");
      if (!h.el.classList.contains("p-on")) return;
      var cfg = K[h.kind], xb = h.xb, xf = h.xf, ps = h.parts; xb.clearRect(0, 0, PW, PH); xf.clearRect(0, 0, PW, PH);
      xb.globalCompositeOperation = xf.globalCompositeOperation = cfg.add ? "lighter" : "source-over";
      if (!ps.length) for (var w = 0; w < cfg.n * .7; w++) { var pw = cfg.mk(); pw.age = R() * pw.life * .7; pw.front = R() < .4; pw.x += pw.vx * pw.age; pw.y += pw.vy * pw.age; ps.push(pw); }
      if (ps.length < cfg.n && R() < dt * cfg.n / 2.5) { var p = cfg.mk(); p.age = 0; p.front = R() < .4; ps.push(p); }
      for (var i = ps.length - 1; i >= 0; i--) { var q = ps[i]; q.age += dt; q.x += (q.vx + T.x * 30 + Math.sin(t * 1.3 + q.tw) * 8) * dt; q.y += q.vy * dt; if (q.rot != null) q.rot += q.vr * dt;
        if (q.age > q.life || q.y < -40 || q.y > PH + 40 || q.x > PW + 120) { ps.splice(i, 1); continue; }
        draw(q.front ? xf : xb, q, h.kind, t); }
    });
    requestAnimationFrame(frame);
  }
  function setOn(v) { on = v; try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {}
    hosts.forEach(function (h) { h.el.classList.toggle("h-on", on && h.holo); h.el.classList.toggle("p-on", on && h.fx); if (h.btn) { h.btn.classList.toggle("off", !on); h.btn.textContent = on ? "特效 開" : "特效 關"; } }); }
  // o：{ rar, kind, holo, d3, fx, toggle }（holo／d3／fx 預設都開）
  function mount(el, o) {
    if (el._cfx) return el._cfx; o = o || {};
    var mk = function (tag, cls, first) { var n = document.createElement(tag); n.className = cls; if (first) el.insertBefore(n, el.firstChild); else el.appendChild(n); return n; };
    var pb = mk("canvas", "cfx-pb", true), pf = mk("canvas", "cfx-pf"); pb.width = pf.width = PW; pb.height = pf.height = PH;
    mk("div", "cfx-l cfx-holo"); var foil = mk("div", "cfx-l cfx-foil"); mk("div", "cfx-l cfx-glit"); mk("div", "cfx-l cfx-glare");
    if (o.art) foil.style.setProperty("--art", "url(" + new URL("img/" + o.art + "_full.webp", document.baseURI).href + ")");
    glitter();
    var h = { el: el, kind: K[o.kind] ? o.kind : "gold", parts: [], xb: pb.getContext("2d"), xf: pf.getContext("2d"), holo: o.holo !== false, fx: o.fx !== false };
    el.classList.add("cfx"); if (o.rar) el.classList.add(o.rar); if (o.d3 !== false) el.classList.add("d3");
    if (o.toggle) { h.btn = mk("button", "cfx-tg"); h.btn.type = "button"; h.btn.addEventListener("click", function (e) { e.stopPropagation(); gyro(true); setOn(!on); }); h.btn.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); }
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); G.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)); G.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)); src = "ptr"; touchAt = performance.now(); });
    var leave = function () { if (src === "ptr") src = "idle"; }; el.addEventListener("pointerleave", leave); el.addEventListener("pointercancel", leave);
    el.addEventListener("pointerup", function (e) { gyro(true); if (e.pointerType !== "mouse") leave(); });
    hosts.push(h); el._cfx = h; gyro(false); setOn(on);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    return h;
  }
  // 自動掛上：大卡詳情（.bigart）和抽卡揭曉（.rv-spot .pic）
  var byArt = null;
  function cardOf(art) { if (!byArt) { byArt = {}; (SG.CARDS || []).forEach(function (c) { if (c.art && !byArt[c.art]) byArt[c.art] = c; }); } return byArt[art]; }
  function auto(el, toggle) {
    if (el._cfx || el.classList.contains("none") || el.classList.contains("txt")) return;
    var im = el.querySelector("img"), m = im && /img\/([a-z0-9_]+)_full\.webp/.exec(im.getAttribute("src") || ""), rar = el.getAttribute("data-rar");
    if (!rar) ["N", "R", "SR", "SSR", "UR"].forEach(function (r) { if (el.classList.contains(r)) rar = r; });
    var c = m && cardOf(m[1]), hi = rar === "SR" || rar === "SSR" || rar === "UR";
    mount(el, { art: m && m[1], rar: rar, kind: kindOf(c), toggle: toggle && hi, holo: hi, fx: hi, d3: !!m });
  }
  function scan(root) {
    if (!root.querySelectorAll) return;
    if (root.matches && root.matches(".bigart")) auto(root, true);
    Array.prototype.forEach.call(root.querySelectorAll(".bigart"), function (e) { auto(e, true); });
    Array.prototype.forEach.call(root.querySelectorAll(".rv-spot .pic"), function (e) { auto(e, false); });
    if (root.matches && root.matches(".rv-spot")) { var p = root.querySelector(".pic"); if (p) auto(p, false); }
  }
  SG.CardFX = { mount: mount, setOn: setOn, isOn: function () { return on; }, K: K, tilt: function (x, y) { G.x = x; G.y = y; src = "ptr"; } };
  if (window.MutationObserver && !window.CARDFX_MANUAL) new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, scan); }); }).observe(document.documentElement, { childList: true, subtree: true });
})(window.SG);
