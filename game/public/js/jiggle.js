/* 立繪局部晃動：不用重畫圖，把立繪貼在網格上，標好的區域用彈簧物理位移（WebGL）
   新增武將：在 SG.JIGGLE 加一筆 art id → 兩個橢圓 [中心x, 中心y, 半徑x, 半徑y]（都是佔 _full 圖寬高的比例） */
(function (SG) {
  SG.JIGGLE = {
    zhurong: [[0.683, 0.478, 0.185, 0.125], [0.845, 0.411, 0.165, 0.115]],
  };
  // ★ 手感參數（Jay 2026-11-13：要明顯、要像軟的在晃，不是肌肉在抖）
  //   K 越小晃得越慢越沉；C 越小餘波越久；UPK 往上回彈時變硬的倍數（下墜大、回彈小，才有重量感）
  var CFG = { K: 46, C: 3.0, UPK: 1.3, MAX: 0.085, BREATH: 0.014, BREATH_T: 3.6, LIFT: 0.03, SPREAD: 0.008, SWAY: 0.006, G: 2, TAP_V: 0.6, GRAB: 0.9, AUTO: 1e9, HOP: 0, HOP_T: 0.7 };
  SG.JIGGLE_CFG = CFG;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 頂點位移：整張圖以底部為支點做身體起伏（s）；胸部區域上緣固定、越往下動越多，並依上下位移做擠壓／拉長
  var VS = "attribute vec2 p;uniform vec4 b0;uniform vec4 b1;uniform vec2 o0;uniform vec2 o1;uniform float s;uniform float sx;varying vec2 uv;" +
    "vec2 f(vec2 q,vec4 b,vec2 o){vec2 d=(q-b.xy)/b.zw;float k=max(0.,1.-dot(d,d));float w=k*sqrt(k);" +
    "float a=smoothstep(-1.,.25,d.y);return w*a*(o+vec2(d.x*b.z*(-o.y)*4.5,0.));}" +
    "void main(){uv=p;vec2 q=p+f(p,b0,o0)+f(p,b1,o1);q.x+=sx*(1.-q.y);q.y=1.-(1.-q.y)*(1.+s);gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0.,1.);}";
  var FS = "precision mediump float;uniform sampler2D t;varying vec2 uv;void main(){gl_FragColor=texture2D(t,uv);}";
  function build(gl) {
    var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    var NX = 56, NY = 80, v = [], idx = [];
    for (var y = 0; y <= NY; y++) for (var x = 0; x <= NX; x++) v.push(x / NX, y / NY);
    for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) { var a = y * (NX + 1) + x, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    gl.useProgram(pr); var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return { pr: pr, n: idx.length };
  }
  function attach(img, id) {
    var cfg = SG.JIGGLE[id]; if (!cfg || still || img._jg) return; img._jg = true;
    var go = function () {
      if (!img.isConnected) return;
      var cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      var gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true }); if (!gl) return;
      var m = build(gl); if (!m) return;
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      var tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); } catch (e) { return; }   // 本機檔案開啟時瀏覽器不給讀圖
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var U = function (n) { return gl.getUniformLocation(m.pr, n); };
      gl.uniform4fv(U("b0"), cfg[0]); gl.uniform4fv(U("b1"), cfg[1]);
      var u0 = U("o0"), u1 = U("o1"), us = U("s"), usx = U("sx");
      cv.className = img.className + " jg"; cv.setAttribute("aria-label", img.alt || ""); cv.setAttribute("role", "img");
      img.replaceWith(cv);
      // 兩邊各一個彈簧，軟硬略不同，才不會同步
      var B = [{ x: 0, y: 0, vx: 0, vy: 0, k: 1, side: -1 }, { x: 0, y: 0, vx: 0, vy: 0, k: 1.13, side: 1 }];
      var last = performance.now(), t0 = last, hopAt = last + 700, nextHop = hopAt, bodyPrev = 0, bodyVel = 0, swPrev = 0, swVel = 0, dir = 1, grab = null, q = [];
      var kick = function (vx, vy) { B[0].vx += vx; B[0].vy += vy; q.push({ at: performance.now() + 90, vx: vx * 0.85, vy: vy * 0.85 }); };
      cv._kick = kick;
      cv.addEventListener("pointerdown", function (e) { grab = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
      cv.addEventListener("pointermove", function (e) {
        if (!grab) return; var r = cv.getBoundingClientRect();
        grab.dx = (e.clientX - grab.x) / r.width * CFG.GRAB; grab.dy = (e.clientY - grab.y) / r.height * CFG.GRAB;
        if (Math.abs(grab.dx) + Math.abs(grab.dy) > 0.012) grab.moved = true;
      });
      var up = function () { if (grab && !grab.moved) kick((Math.random() < 0.5 ? -1 : 1) * CFG.TAP_V, CFG.TAP_V * 0.15); grab = null; nextHop = performance.now() + CFG.AUTO * 1000; };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      var frame = function (now) {
        if (!cv.isConnected) { var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); return; }
        var dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000)); last = now;
        // 身體：呼吸 + 每隔幾秒輕輕一頓。胸部是掛在身體上的重物，身體一動它才跟著晃（慣性）
        if (now > nextHop) { hopAt = now; dir = -dir; nextHop = now + CFG.AUTO * 1000 * (0.8 + Math.random() * 0.5); }
        var u = (now - hopAt) / 1000 / CFG.HOP_T, hop = u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) * CFG.HOP : 0;
        // 呼吸：吸氣較快、吐氣較慢，胸口跟著身體起伏；胸部只靠這個節奏帶動，慢半拍跟上（✅ Jay：要跟呼吸合）
        var ph = ((now - t0) / 1000 / CFG.BREATH_T) % 1, br = ph < 0.4 ? 0.5 - 0.5 * Math.cos(Math.PI * ph / 0.4) : 0.5 + 0.5 * Math.cos(Math.PI * (ph - 0.4) / 0.6);
        var body = br * CFG.BREATH + hop, ty0 = -CFG.LIFT * (br - 0.5), sp = CFG.SPREAD * (br - 0.5);
        var chest = -0.55 * body, v = (chest - bodyPrev) / dt, acc = (v - bodyVel) / dt; bodyPrev = chest; bodyVel = v;
        acc = Math.max(-40, Math.min(40, acc));
        // 左右：身體往一邊擺再回來（每次換邊），胸部慢半拍跟著甩
        var sway = Math.sin(2 * Math.PI * (now - t0) / 1000 / (CFG.BREATH_T * 2)) * CFG.SWAY;   // 左右：兩次呼吸一個來回，跟呼吸同拍
        var cx = 0.55 * sway, vx2 = (cx - swPrev) / dt, accx = Math.max(-40, Math.min(40, (vx2 - swVel) / dt)); swPrev = cx; swVel = vx2;
        while (q.length && q[0].at <= now) { var kk = q.shift(); B[1].vx += kk.vx; B[1].vy += kk.vy; }
        for (var st = 0; st < 3; st++) for (var i = 0; i < 2; i++) {
          var b = B[i], h = dt / 3, K = CFG.K * b.k;
          if (grab && grab.moved) {      // 抓著拖：跟著手指走，另一邊跟得少一點
            var f = i === 0 ? 1 : 0.7, tx = Math.max(-CFG.MAX, Math.min(CFG.MAX, grab.dx * f)), ty = Math.max(-CFG.MAX, Math.min(CFG.MAX, grab.dy * f));
            b.vx += ((tx - b.x) * 260 - b.vx * 22) * h; b.vy += ((ty - b.y) * 260 - b.vy * 22) * h;
          } else {
            var ky = b.y < 0 ? K * CFG.UPK : K;
            b.vx += (-K * (b.x - b.side * sp) - CFG.C * b.vx - accx * CFG.G) * h; b.vy += (-ky * (b.y - ty0) - CFG.C * b.vy - acc * CFG.G) * h;
          }
          b.x = Math.max(-CFG.MAX, Math.min(CFG.MAX, b.x + b.vx * h)); b.y = Math.max(-CFG.MAX, Math.min(CFG.MAX, b.y + b.vy * h));
        }
        // 往下墜時兩邊微微外擴
        gl.uniform2f(u0, B[0].x + B[0].side * Math.max(0, B[0].y) * 0.22, B[0].y);
        gl.uniform2f(u1, B[1].x + B[1].side * Math.max(0, B[1].y) * 0.22, B[1].y);
        gl.uniform1f(us, body); gl.uniform1f(usx, sway);
        gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
  }
  function scan(root) {
    if (!root.querySelectorAll) return;
    var list = root.matches && root.matches("img") ? [root] : root.querySelectorAll("img");
    Array.prototype.forEach.call(list, function (im) {
      var mt = /img\/([a-z0-9_]+)_full\.webp/.exec(im.getAttribute("src") || ""); if (mt && SG.JIGGLE[mt[1]]) attach(im, mt[1]);
    });
  }
  SG.Jiggle = { attach: attach, scan: scan };
  if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, scan); }); }).observe(document.documentElement, { childList: true, subtree: true });
})(window.SG);
