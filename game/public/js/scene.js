/* 水墨場景：用程式畫山水、城樓、古地圖（不靠外部圖檔） */
(function (SG) {
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function noise1(seed) {
    var r = rng(seed), g = []; for (var i = 0; i < 256; i++) g.push(r());
    return function (x) { var i = Math.floor(x), f = x - i, a = g[i & 255], b = g[(i + 1) & 255], t = f * f * (3 - 2 * f); return a + (b - a) * t; };
  }
  function ridged(n, x) { var v = 0, amp = 1, fr = 1, sum = 0; for (var o = 0; o < 4; o++) { v += (1 - Math.abs(2 * n(x * fr + o * 37.1) - 1)) * amp; sum += amp; amp *= 0.5; fr *= 2.1; } return v / sum; }
  var INK = "26,30,34";

  function fit(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 360, h = cv.clientHeight || 400;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, W: w, H: h };
  }
  function paper(ctx, W, H, R, aged) {
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#f1e8d2"); g.addColorStop(1, aged ? "#dccba3" : "#e6d9ba");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 7; i++) {            // 水漬
      var x = R() * W, y = R() * H, r = 40 + R() * 120, s = ctx.createRadialGradient(x, y, 0, x, y, r);
      s.addColorStop(0, "rgba(150,120,70," + (aged ? 0.10 : 0.05) + ")"); s.addColorStop(1, "rgba(150,120,70,0)");
      ctx.fillStyle = s; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = "rgba(110,90,55,0.07)"; ctx.lineWidth = 0.6;   // 紙纖維
    for (var k = 0; k < W * H / 900; k++) { var fx = R() * W, fy = R() * H, a = R() * 6.28, l = 4 + R() * 10; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); ctx.stroke(); }
  }
  function mountains(ctx, W, H, seed, o) {
    var R = rng(seed + 9), layers = o.layers || 5;
    for (var i = 0; i < layers; i++) {
      var n = noise1(seed + i * 101), t = i / (layers - 1 || 1);
      var base = H * (o.top + (o.bottom - o.top) * t), hgt = H * (o.height * (1 - 0.35 * t)), a = 0.10 + 0.5 * t * t + 0.08 * t, fr = (1.6 + i * 0.5) / W;
      var pts = [], minY = H;
      for (var x = -4; x <= W + 4; x += 3) { var y = base - hgt * Math.pow(ridged(n, x * fr + i * 5.3), 1.7); pts.push([x, y]); if (y < minY) minY = y; }
      var bot = base + H * 0.16, g = ctx.createLinearGradient(0, minY, 0, bot);
      g.addColorStop(0, "rgba(" + INK + "," + a + ")"); g.addColorStop(0.55, "rgba(" + INK + "," + a * 0.42 + ")"); g.addColorStop(1, "rgba(" + INK + ",0)");
      ctx.beginPath(); ctx.moveTo(-4, bot); pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.lineTo(W + 4, bot); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); pts.forEach(function (p, j) { j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      ctx.strokeStyle = "rgba(" + INK + "," + Math.min(0.8, a + 0.12) + ")"; ctx.lineWidth = 0.8 + t; ctx.stroke();
      ctx.strokeStyle = "rgba(" + INK + "," + a * 0.55 + ")"; ctx.lineWidth = 0.7;      // 皴筆
      for (var c = 0; c < pts.length; c += 2 + (R() * 3 | 0)) { var p = pts[c], l = 5 + R() * (10 + 16 * t); ctx.beginPath(); ctx.moveTo(p[0], p[1] + 1); ctx.lineTo(p[0] + (R() - 0.3) * 6, p[1] + l); ctx.stroke(); }
      if (i === layers - 1 && o.pines) for (var q = 0; q < 7; q++) { var pp = pts[(R() * pts.length) | 0]; pine(ctx, pp[0], pp[1] + 2, 9 + R() * 9); }
      var my = base + H * 0.05, m = ctx.createLinearGradient(0, my - H * 0.06, 0, my + H * 0.08);          // 雲霧留白
      m.addColorStop(0, "rgba(241,232,210,0)"); m.addColorStop(0.5, "rgba(241,232,210," + (0.75 - 0.35 * t) + ")"); m.addColorStop(1, "rgba(241,232,210,0)");
      ctx.fillStyle = m; ctx.fillRect(0, my - H * 0.06, W, H * 0.14);
    }
  }
  function pine(ctx, x, y, s) {
    ctx.strokeStyle = "rgba(" + INK + ",0.85)"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.1, y - s); ctx.stroke();
    ctx.fillStyle = "rgba(" + INK + ",0.75)";
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + s * 0.1 + (i % 2 ? 1 : -1) * s * 0.18, y - s * (0.45 + i * 0.17), s * (0.42 - i * 0.07), s * 0.09, 0, 0, 6.3); ctx.fill(); }
  }
  function sun(ctx, x, y, r) {
    var h = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.6); h.addColorStop(0, "rgba(179,38,30,0.22)"); h.addColorStop(1, "rgba(179,38,30,0)");
    ctx.fillStyle = h; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.fillStyle = "rgba(179,38,30,0.9)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
  }
  function birds(ctx, x, y, R) {
    ctx.strokeStyle = "rgba(" + INK + ",0.7)"; ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) { var bx = x + i * 13 + R() * 6, by = y + (i % 2 ? 7 : 0) + R() * 5, s = 3 + R() * 2; ctx.beginPath(); ctx.moveTo(bx - s, by - s * 0.5); ctx.quadraticCurveTo(bx - s * 0.3, by - s * 0.6, bx, by); ctx.quadraticCurveTo(bx + s * 0.3, by - s * 0.6, bx + s, by - s * 0.5); ctx.stroke(); }
  }
  function roof(ctx, cx, y, w, h) {       // 飛簷屋頂
    ctx.beginPath(); ctx.moveTo(cx - w * 0.2, y);
    ctx.quadraticCurveTo(cx - w * 0.3, y + h * 0.85, cx - w * 0.56, y + h * 0.62);
    ctx.quadraticCurveTo(cx - w * 0.5, y + h * 0.95, cx - w * 0.42, y + h);
    ctx.quadraticCurveTo(cx, y + h * 1.12, cx + w * 0.42, y + h);
    ctx.quadraticCurveTo(cx + w * 0.5, y + h * 0.95, cx + w * 0.56, y + h * 0.62);
    ctx.quadraticCurveTo(cx + w * 0.3, y + h * 0.85, cx + w * 0.2, y); ctx.closePath();
    ctx.fillStyle = "#23262b"; ctx.fill();
    ctx.strokeStyle = "#c9a45c"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - w * 0.2, y + 0.5); ctx.lineTo(cx + w * 0.2, y + 0.5); ctx.stroke();
  }
  function tower(ctx, cx, ground, w, H) {   // 城牆＋兩層城樓
    var wallH = H - ground, g = ctx.createLinearGradient(0, ground, 0, H); g.addColorStop(0, "#4a4038"); g.addColorStop(1, "#2a2420");
    ctx.fillStyle = g; ctx.fillRect(-2, ground, 9999, wallH + 2);
    ctx.fillStyle = "#4a4038"; for (var x = -2; x < 2000; x += 14) ctx.fillRect(x, ground - 6, 8, 7);     // 女牆
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1; for (var y = ground + 10; y < H; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2000, y); ctx.stroke(); }
    var b1 = w * 0.62, h1 = w * 0.26, y1 = ground - 6 - h1;
    ctx.fillStyle = "#8c2a21"; ctx.fillRect(cx - b1 / 2, y1, b1, h1);
    ctx.fillStyle = "#2a1512"; for (var k = 0; k < 5; k++) ctx.fillRect(cx - b1 / 2 + b1 * (0.06 + k * 0.19), y1 + h1 * 0.28, b1 * 0.12, h1 * 0.72);
    roof(ctx, cx, y1 - w * 0.2, w, w * 0.22);
    var b2 = w * 0.42, h2 = w * 0.17, y2 = y1 - w * 0.2 - h2 + 2;
    ctx.fillStyle = "#8c2a21"; ctx.fillRect(cx - b2 / 2, y2, b2, h2);
    ctx.fillStyle = "#2a1512"; for (var j = 0; j < 3; j++) ctx.fillRect(cx - b2 / 2 + b2 * (0.1 + j * 0.3), y2 + h2 * 0.3, b2 * 0.2, h2 * 0.7);
    roof(ctx, cx, y2 - w * 0.2, w * 0.74, w * 0.22);
    ctx.fillStyle = "#1a1512"; ctx.beginPath(); ctx.moveTo(cx - w * 0.09, H); ctx.lineTo(cx - w * 0.09, ground + wallH * 0.45); ctx.quadraticCurveTo(cx, ground + wallH * 0.12, cx + w * 0.09, ground + wallH * 0.45); ctx.lineTo(cx + w * 0.09, H); ctx.fill();   // 城門
  }

  SG.Scene = {
    // 主城：遠山、紅日、飛鳥、城樓
    home: function (cv, seed) {
      var f = fit(cv), ctx = f.ctx, W = f.W, H = f.H, R = rng(seed || 7);
      paper(ctx, W, H, R);
      sun(ctx, W * 0.5, H * 0.13, W * 0.06);
      birds(ctx, W * 0.3, H * 0.2, R);
      mountains(ctx, W, H, seed || 7, { layers: 5, top: 0.36, bottom: 0.74, height: 0.34, pines: true });
      tower(ctx, W * 0.24, H * 0.86, W * 0.42, H);
    },
    // 一般橫幅：只有山水
    banner: function (cv, seed) {
      var f = fit(cv), ctx = f.ctx, W = f.W, H = f.H, R = rng(seed || 3);
      paper(ctx, W, H, R); sun(ctx, W * 0.86, H * 0.3, H * 0.15); birds(ctx, W * 0.6, H * 0.24, R);
      mountains(ctx, W, H, seed || 3, { layers: 4, top: 0.74, bottom: 1.02, height: 0.4, pines: true });
    },
    // 戰場：舊地圖紙
    map: function (cv, seed) {
      var f = fit(cv), ctx = f.ctx, W = f.W, H = f.H, R = rng(seed || 11), n = noise1(seed || 11);
      paper(ctx, W, H, R, true);
      ctx.strokeStyle = "rgba(70,95,110,0.28)"; ctx.lineWidth = 5; ctx.lineCap = "round";            // 河
      ctx.beginPath(); for (var y = -10; y <= H + 10; y += 8) { var x = W * (0.5 + 0.38 * (n(y * 0.011) - 0.5) * 2); y < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      ctx.strokeStyle = "rgba(" + INK + ",0.07)"; ctx.lineWidth = 1;                                  // 淡墨等高線
      for (var i = 0; i < 9; i++) { ctx.beginPath(); for (var xx = 0; xx <= W; xx += 6) { var yy = H * (0.08 + i * 0.11) + 22 * (n(xx * 0.02 + i * 9) - 0.5); xx ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, "rgba(90,60,25,0)"); v.addColorStop(1, "rgba(90,60,25,0.28)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    // 落花：輕量粒子，畫面不在時自動停
    petals: function (cv) {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var f = fit(cv), ctx = f.ctx, W = f.W, H = f.H, R = rng(5), ps = [];
      for (var i = 0; i < 16; i++) ps.push({ x: R() * W, y: R() * H, s: 2 + R() * 3, v: 0.25 + R() * 0.5, p: R() * 6.28, w: 0.6 + R() });
      var id = (cv._pid = (cv._pid || 0) + 1);
      (function tick(t) {
        if (cv._pid !== id || !cv.isConnected) return;
        if (cv.offsetParent !== null) {
          ctx.clearRect(0, 0, W, H);
          ps.forEach(function (p) {
            p.y += p.v; p.x += Math.sin(t / 900 * p.w + p.p) * 0.5 + 0.18; if (p.y > H + 6) { p.y = -6; p.x = R() * W; } if (p.x > W + 6) p.x = -6;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t / 700 * p.w + p.p); ctx.fillStyle = "rgba(196,72,62,0.75)";
            ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.3); ctx.fill(); ctx.restore();
          });
        }
        requestAnimationFrame(tick);
      })(0);
    },
  };
})(window.SG);
