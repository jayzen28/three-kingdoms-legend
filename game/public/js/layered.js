// 分層立繪（孫權 UR 試作）。原料：body（完成圖）、under（平胸版）、acc（耳環）、blink（閉眼）＋ 胸部輪廓（Jay 在 tool/outline.html 圈的）。
// 載入時用輪廓把 body 切成「胸部層」，輪廓內的底圖換成 under。之後各層分開動：呼吸、胸部彈簧、耳環擺動、眨眼。
// 用法：SG.Layered.mount(容器, "sunquan_ur", { outline: {L:[[x,y]…], R:[[x,y]…]} })；outline 不給就用 RIG 裡存的。
(function (SG) {
  var RIG = {
    sunquan_ur: {
      w: 832, h: 1216, acc: [[0.395, 0.282], [0.617, 0.262]],
      // ★ 預設輪廓是開發估的，等 Jay 圈好後換掉
      outline: {
        L: [[0.361,0.461],[0.258,0.493],[0.214,0.543],[0.228,0.600],[0.288,0.641],[0.367,0.658],[0.445,0.650],[0.487,0.633],[0.487,0.526],[0.469,0.473]],
        R: [[0.601,0.461],[0.493,0.473],[0.477,0.526],[0.477,0.633],[0.517,0.651],[0.595,0.660],[0.673,0.646],[0.733,0.604],[0.751,0.547],[0.709,0.493]],
      },
    },
  };
  // 封閉的平滑曲線（Catmull-Rom），回傳細分後的點
  function smooth(pts, n) {
    var out = [], N = pts.length; if (N < 3) return pts.slice(); n = n || 10;
    for (var i = 0; i < N; i++) {
      var p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    } return out;
  }
  function bbox(p) { var a = 1, b = 1, c = 0, d = 0; p.forEach(function (q) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); }); return [(a + c) / 2, (b + d) / 2, Math.max(0.02, (c - a) / 2), Math.max(0.02, (d - b) / 2)]; }
  var VS = "attribute vec2 a;varying vec2 v;uniform int m;uniform float br;uniform vec4 e0,e1;uniform vec2 o0,o1,p0,p1;uniform vec2 ang;uniform float asp;" +
    "vec2 ch(){vec2 dl=(a-e0.xy)/e0.zw,dr=(a-e1.xy)/e1.zw;float sd=smoothstep(e0.x+e0.z*.35,e1.x-e1.z*.35,a.x);vec2 o=mix(o0,o1,sd);float top=smoothstep(-1.05,-.15,mix(dl.y,dr.y,sd));float sf=(1.-smoothstep(1.,1.5,-dl.x))*(1.-smoothstep(1.,1.5,dr.x));return o*top*sf;}" +
    "vec2 rot(vec2 p,vec2 c,float g){vec2 d=(p-c)*vec2(1.,asp);float s=sin(g),k=cos(g);d=vec2(d.x*k-d.y*s,d.x*s+d.y*k);return c+d/vec2(1.,asp);}" +
    "void main(){v=a;vec2 p=a;" +
    "if(m==1){p+=ch();}" +
    "if(m==3){p=a.x<.5?rot(p,p0,ang.x):rot(p,p1,ang.y);}" +
    "p.y-=br*smoothstep(.95,.5,a.y);p.x+=(p.x-.5)*br*.6*smoothstep(.8,.5,a.y)*smoothstep(.2,.5,a.y);" +
    "gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);}";
  var FS = "precision mediump float;varying vec2 v;uniform sampler2D s;uniform float al;void main(){vec4 c=texture2D(s,v);gl_FragColor=vec4(c.rgb*c.a,c.a)*al;}";

  function mount(box, id, opt) {
    var R = RIG[id]; if (!R) return null; opt = opt || {};
    var base = opt.base || "img/", OL = opt.outline || R.outline;
    var polys = [OL.L, OL.R].filter(function (p) { return p && p.length >= 3; }).map(function (p) { return smooth(p, 10); });
    if (!polys.length) polys = [smooth(R.outline.L, 10), smooth(R.outline.R, 10)];
    var E = polys.map(bbox).sort(function (a, b) { return a[0] - b[0]; }); if (E.length < 2) E.push(E[0]);
    var cv = document.createElement("canvas"); cv.className = "fig layered"; cv.width = R.w; cv.height = R.h;
    cv.style.cssText = "height:100%;width:auto;display:block;margin:0 auto;touch-action:none"; box.appendChild(cv);
    var gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true }); if (!gl) return null;
    function sh(t, src) { var x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); return x; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    var NX = 48, NY = 72, vs = [], ix = [];
    for (var y = 0; y <= NY; y++) for (var x = 0; x <= NX; x++) vs.push(x / NX, y / NY);
    for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) { var i = y * (NX + 1) + x; ix.push(i, i + 1, i + NX + 1, i + 1, i + NX + 2, i + NX + 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vs), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ix), gl.STATIC_DRAW);
    var la = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ["m", "br", "e0", "e1", "o0", "o1", "p0", "p1", "ang", "asp", "al"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    function mkTex(src) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t;
    }
    var tex = null, imgs = {}, left = 4;
    function path(c) { c.beginPath(); polys.forEach(function (p) { p.forEach(function (q, i) { c[i ? "lineTo" : "moveTo"](q[0] * R.w, q[1] * R.h); }); c.closePath(); }); }
    function compose() {
      function cvs() { var c = document.createElement("canvas"); c.width = R.w; c.height = R.h; return c; }
      var b = cvs(), bc = b.getContext("2d"); bc.drawImage(imgs.body, 0, 0);                       // 底圖：完成圖，輪廓內換成平胸版
      bc.save(); path(bc); bc.clip(); bc.clearRect(0, 0, R.w, R.h); bc.drawImage(imgs.under, 0, 0); bc.restore();
      var c = cvs(), cc = c.getContext("2d"); cc.save(); path(cc); cc.clip(); cc.drawImage(imgs.body, 0, 0); cc.restore();   // 胸部層：完成圖只留輪廓內
      tex = { base: mkTex(b), chest: mkTex(c), acc: mkTex(imgs.acc), blink: mkTex(imgs.blink) };
    }
    ["body", "under", "acc", "blink"].forEach(function (n) { var im = new Image(); im.onload = function () { imgs[n] = im; if (--left === 0) compose(); }; im.src = base + id + "_" + n + ".webp"; });

    var P = { K: 42, C: 3.4, BREATH: 0.0035, BT: 3.8, LIFT: 0.010, MAX: 0.032, amp: opt.amp == null ? 1 : opt.amp };
    var c = [{ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0, vx: 0, vy: 0 }], ear = [{ a: 0, v: 0 }, { a: 0, v: 0 }];
    var grab = -1, gx = 0, gy = 0, lastX = 0, lastT = 0, blink = 0, nextBlink = 2 + Math.random() * 3, t0 = performance.now(), prev = t0, run = true;
    function uv(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
    function hit(p) { for (var i = 0; i < 2; i++) { var e = E[i], dx = (p[0] - e[0]) / e[2], dy = (p[1] - e[1]) / e[3]; if (dx * dx + dy * dy < 1) return i; } return -1; }
    cv.addEventListener("pointerdown", function (e) {
      var p = uv(e); grab = hit(p); gx = p[0]; gy = p[1]; lastX = p[0]; lastT = performance.now();
      if (grab < 0) { ear[0].v += 2; ear[1].v -= 2; c[0].vy -= 0.12 * P.amp; c[1].vy -= 0.1 * P.amp; }
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      if (opt.onTouch) opt.onTouch(grab >= 0 ? "chest" : p[1] < 0.3 ? "head" : "body", e);
    });
    cv.addEventListener("pointermove", function (e) {
      var p = uv(e), now = performance.now(), vx = (p[0] - lastX) / Math.max(8, now - lastT) * 1000; lastX = p[0]; lastT = now;
      if (grab >= 0) { var s = c[grab], lim = P.MAX * P.amp; s.x = Math.max(-lim, Math.min(lim, (p[0] - gx) * 0.6)); s.y = Math.max(-lim * 0.8, Math.min(lim, (p[1] - gy) * 0.6)); s.vx = s.vy = 0; var o = c[1 - grab]; o.vx += (s.x - o.x) * 0.6; }
      else if (e.buttons || e.pointerType === "touch") { ear[0].v += vx * 0.25; ear[1].v += vx * 0.25; c[0].vx += vx * 0.01 * P.amp; c[1].vx += vx * 0.01 * P.amp; }
    });
    function up() { grab = -1; } cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

    function frame(now) {
      if (!run) return; requestAnimationFrame(frame);
      if (!cv.isConnected) { run = false; return; } if (!tex) return;
      var dt = Math.min(0.033, (now - prev) / 1000); prev = now; var t = (now - t0) / 1000;
      var br = P.BREATH * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / P.BT));
      for (var i = 0; i < 2; i++) {
        var s = c[i]; if (i === grab) continue;
        var ty = -P.LIFT * P.amp * (0.5 * Math.sin(t * 2 * Math.PI / P.BT - 0.5 - i * 0.12)), tx = 0.0025 * P.amp * Math.sin(t * 0.9 + i * 0.7) * (i ? 1 : -1);
        s.vx += (-P.K * (s.x - tx) - P.C * s.vx) * dt; s.vy += (-P.K * (s.y - ty) - P.C * s.vy) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      }
      for (i = 0; i < 2; i++) { var a = ear[i]; a.v += (-30 * (a.a - 0.07 * Math.sin(t * 1.1 + i * 2)) - 1.2 * a.v) * dt; a.a += a.v * dt; a.a = Math.max(-0.7, Math.min(0.7, a.a)); }
      nextBlink -= dt; if (nextBlink < 0) { blink = 0.16; nextBlink = 2.5 + Math.random() * 4; } var bl = 0; if (blink > 0) { blink -= dt; bl = Math.min(1, Math.sin(Math.max(0, blink) / 0.16 * Math.PI) * 1.6); }
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.br, br); gl.uniform1f(U.asp, R.h / R.w);
      gl.uniform4fv(U.e0, E[0]); gl.uniform4fv(U.e1, E[1]); gl.uniform2fv(U.p0, R.acc[0]); gl.uniform2fv(U.p1, R.acc[1]);
      gl.uniform2f(U.o0, c[0].x, c[0].y); gl.uniform2f(U.o1, c[1].x, c[1].y); gl.uniform2f(U.ang, ear[0].a, ear[1].a);
      function draw(n, m, al) { gl.bindTexture(gl.TEXTURE_2D, tex[n]); gl.uniform1i(U.m, m); gl.uniform1f(U.al, al); gl.drawElements(gl.TRIANGLES, ix.length, gl.UNSIGNED_SHORT, 0); }
      draw("base", 0, 1); if (bl > 0.02) draw("blink", 0, bl); draw("chest", 1, 1); draw("acc", 3, 1);
    }
    requestAnimationFrame(frame);
    return { canvas: cv, params: P, stop: function () { run = false; }, poke: function () { c[0].vy -= 0.3; c[1].vy -= 0.26; ear[0].v += 3; ear[1].v -= 3; } };
  }
  SG.Layered = { mount: mount, RIG: RIG, smooth: smooth };
})(window.SG = window.SG || {});
