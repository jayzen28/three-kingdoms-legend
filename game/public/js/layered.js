// 分層立繪原型（孫權 UR）。每個部位一張圖、各自動：身體呼吸、胸部彈簧、前髮擺動、耳環擺動、眨眼。
// 用法：SG.Layered.mount(容器, "sunquan_ur")。之後 SSR／UR 照同一套圖層規格就能套用。
(function (SG) {
  var RIG = {
    sunquan_ur: {
      w: 832, h: 1216,
      chest: [[0.365, 0.565, 0.150, 0.118], [0.605, 0.565, 0.150, 0.118]],   // 左、右：[中心x, 中心y, 半徑x, 半徑y]
      acc: [[0.395, 0.282], [0.617, 0.262]],                                 // 耳環掛點：左、右
      hairTop: 0.24,
    },
  };
  var VS = "attribute vec2 a;varying vec2 v;uniform int m;uniform float br,hs,t;uniform vec4 e0,e1;uniform vec2 o0,o1,p0,p1;uniform vec2 ang;uniform float asp;" +
    "vec2 ch(vec2 p,vec4 e,vec2 o){vec2 d=(a-e.xy)/e.zw;float w=(1.-smoothstep(.55,1.2,length(d)))*smoothstep(-1.15,.1,d.y);return o*w;}" +
    "vec2 rot(vec2 p,vec2 c,float g){vec2 d=(p-c)*vec2(1.,asp);float s=sin(g),k=cos(g);d=vec2(d.x*k-d.y*s,d.x*s+d.y*k);return c+d/vec2(1.,asp);}" +
    "void main(){v=a;vec2 p=a;" +
    "if(m==1){p+=ch(p,e0,o0)+ch(p,e1,o1);}" +
    "if(m==2){float k=clamp((a.y-hs)/.5,0.,1.);p.x+=(o0.x+sign(a.x-.5)*o0.y)*k*k+.0035*sin(t*1.3+a.y*9.)*k;}" +
    "if(m==3){p=a.x<.5?rot(p,p0,ang.x):rot(p,p1,ang.y);}" +
    "p.y-=br*smoothstep(.95,.5,a.y);p.x+=(p.x-.5)*br*.6*smoothstep(.8,.5,a.y)*smoothstep(.2,.5,a.y);" +
    "gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);}";
  var FS = "precision mediump float;varying vec2 v;uniform sampler2D s;uniform float al;void main(){vec4 c=texture2D(s,v);gl_FragColor=vec4(c.rgb*c.a,c.a)*al;}";
  var NAMES = ["base", "chest", "hair", "acc", "blink"];

  function mount(box, id, opt) {
    var R = RIG[id]; if (!R) return null; opt = opt || {};
    var cv = document.createElement("canvas"); cv.className = "fig layered"; cv.width = R.w; cv.height = R.h;
    cv.style.cssText = "height:100%;width:auto;display:block;margin:0 auto;touch-action:none"; box.appendChild(cv);
    var gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true }); if (!gl) { var im = new Image(); im.src = "img/" + id + "_base.webp"; box.replaceChild(im, cv); return null; }
    function sh(t, src) { var x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); return x; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    var NX = 40, NY = 60, vs = [], ix = [];
    for (var y = 0; y <= NY; y++) for (var x = 0; x <= NX; x++) vs.push(x / NX, y / NY);
    for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) { var i = y * (NX + 1) + x; ix.push(i, i + 1, i + NX + 1, i + 1, i + NX + 2, i + NX + 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vs), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ix), gl.STATIC_DRAW);
    var la = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ["m", "br", "hs", "t", "e0", "e1", "o0", "o1", "p0", "p1", "ang", "asp", "al"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var tex = {}, left = NAMES.length;
    NAMES.forEach(function (n) {
      var im = new Image(); im.onload = function () {
        var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        tex[n] = t; left--;
      }; im.src = "img/" + id + "_" + n + ".webp";
    });

    // 動態狀態
    var P = { K: 42, C: 3.4, BREATH: 0.0035, BT: 3.8, LIFT: 0.010, MAX: 0.05, amp: opt.amp == null ? 1 : opt.amp };
    var c = [{ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0, vx: 0, vy: 0 }], hair = { x: 0, v: 0 }, ear = [{ a: 0, v: 0 }, { a: 0, v: 0 }];
    var grab = -1, gx = 0, gy = 0, lastX = 0, lastT = 0, blink = 0, nextBlink = 2 + Math.random() * 3, t0 = performance.now(), prev = t0, run = true;
    function uv(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
    function hit(p) { for (var i = 0; i < 2; i++) { var e = R.chest[i], dx = (p[0] - e[0]) / e[2], dy = (p[1] - e[1]) / e[3]; if (dx * dx + dy * dy < 1) return i; } return -1; }
    cv.addEventListener("pointerdown", function (e) {
      var p = uv(e); grab = hit(p); gx = p[0]; gy = p[1]; lastX = p[0]; lastT = performance.now();
      if (grab < 0) { hair.v += (p[0] < .5 ? 1 : -1) * 0.05; ear[0].v += 2; ear[1].v -= 2; c[0].vy -= 0.12 * P.amp; c[1].vy -= 0.1 * P.amp; }
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      if (opt.onTouch) opt.onTouch(grab >= 0 ? "chest" : p[1] < 0.3 ? "head" : "body", e);
    });
    cv.addEventListener("pointermove", function (e) {
      var p = uv(e), now = performance.now(), vx = (p[0] - lastX) / Math.max(8, now - lastT) * 1000; lastX = p[0]; lastT = now;
      if (grab >= 0) { var s = c[grab], lim = P.MAX * P.amp; s.x = Math.max(-lim, Math.min(lim, (p[0] - gx) * 0.6)); s.y = Math.max(-lim, Math.min(lim, (p[1] - gy) * 0.6)); s.vx = s.vy = 0; var o = c[1 - grab]; o.vx += (s.x - o.x) * 0.6; }
      else if (e.buttons || e.pointerType === "touch") { hair.v += vx * 0.004; ear[0].v += vx * 0.25; ear[1].v += vx * 0.25; c[0].vx += vx * 0.01 * P.amp; c[1].vx += vx * 0.01 * P.amp; }
    });
    function up() { grab = -1; } cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

    function frame(now) {
      if (!run) return; requestAnimationFrame(frame);
      if (!cv.isConnected) { run = false; return; } if (left > 0) return;
      var dt = Math.min(0.033, (now - prev) / 1000); prev = now; var t = (now - t0) / 1000;
      var ph = Math.sin(t * 2 * Math.PI / P.BT), br = P.BREATH * (0.5 + 0.5 * ph);
      for (var i = 0; i < 2; i++) {
        var s = c[i]; if (i === grab) continue;
        var ty = -P.LIFT * P.amp * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / P.BT - 0.5 - i * 0.12)), tx = 0.0025 * P.amp * Math.sin(t * 0.9 + i * 0.7) * (i ? 1 : -1);
        s.vx += (-P.K * (s.x - tx) - P.C * s.vx) * dt; s.vy += (-P.K * (s.y - ty) - P.C * s.vy) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      }
      hair.v += (-9 * (hair.x - 0.006 * Math.sin(t * 0.7)) - 1.6 * hair.v) * dt; hair.x += hair.v * dt;
      for (i = 0; i < 2; i++) { var a = ear[i]; a.v += (-30 * (a.a - 0.07 * Math.sin(t * 1.1 + i * 2)) - 1.2 * a.v) * dt; a.a += a.v * dt; a.a = Math.max(-0.7, Math.min(0.7, a.a)); }
      nextBlink -= dt; if (nextBlink < 0) { blink = 0.16; nextBlink = 2.5 + Math.random() * 4; } var bl = 0; if (blink > 0) { blink -= dt; bl = Math.sin(Math.max(0, blink) / 0.16 * Math.PI); bl = Math.min(1, bl * 1.6); }

      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.br, br); gl.uniform1f(U.hs, R.hairTop); gl.uniform1f(U.t, t); gl.uniform1f(U.asp, R.h / R.w);
      gl.uniform4fv(U.e0, R.chest[0]); gl.uniform4fv(U.e1, R.chest[1]); gl.uniform2fv(U.p0, R.acc[0]); gl.uniform2fv(U.p1, R.acc[1]);
      function draw(n, m, al) { gl.bindTexture(gl.TEXTURE_2D, tex[n]); gl.uniform1i(U.m, m); gl.uniform1f(U.al, al); gl.drawElements(gl.TRIANGLES, ix.length, gl.UNSIGNED_SHORT, 0); }
      gl.uniform2f(U.o0, c[0].x, c[0].y); gl.uniform2f(U.o1, c[1].x, c[1].y);
      draw("base", 0, 1); if (bl > 0.02) draw("blink", 0, bl);
      draw("chest", 1, 1);
      gl.uniform2f(U.o0, hair.x, 0.004 * Math.sin(t * 0.8)); draw("hair", 2, 1);
      gl.uniform2f(U.ang, ear[0].a, ear[1].a); draw("acc", 3, 1);
    }
    requestAnimationFrame(frame);
    return { canvas: cv, params: P, stop: function () { run = false; }, poke: function () { c[0].vy -= 0.3; c[1].vy -= 0.26; hair.v += 0.08; ear[0].v += 3; ear[1].v -= 3; }, state: function () { return { c: c, hair: hair, ear: ear }; } };
  }
  SG.Layered = { mount: mount, RIG: RIG };
})(window.SG = window.SG || {});
