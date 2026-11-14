/* 立繪局部晃動：不用重畫圖，把立繪貼在網格上，標好的區域用彈簧物理位移（WebGL）
   新增武將：在 SG.JIGGLE 加一筆 art id → 兩個橢圓 [中心x, 中心y, 半徑x, 半徑y]（都是佔 _full 圖寬高的比例） */
(function (SG) {
  SG.JIGGLE = {
    zhurong: [[0.683, 0.500, 0.170, 0.105], [0.845, 0.432, 0.150, 0.098]],   // 範圍往下收，避開項鍊和領口
  };
  // ★ 手感參數（Jay 2026-11-13：要明顯、要像軟的在晃，不是肌肉在抖）
  //   K 越小晃得越慢越沉；C 越小餘波越久；UPK 往上回彈時變硬的倍數（下墜大、回彈小，才有重量感）
  var CFG = { K: 46, C: 3.0, UPK: 1.3, MAX: 0.045, BREATH: 0.014, BREATH_T: 3.6, LIFT: 0.015, SPREAD: 0.003, SWAY: 0.006, G: 2, TAP_V: 0.36, GRAB: 0.55, AUTO: 1e9, HOP: 0, HOP_T: 0.7 };
  SG.JIGGLE_CFG = CFG; var CFG_OWN = CFG;
  // 通用：所有武將都有的含蓄呼吸起伏（✅ Jay 2026-11-14）。不用逐張標範圍：整個上半身一條寬帶輕輕起伏，幅度很小所以不會拉歪
  // 胸口位置：用臉部偵測加膚色重心自動估的 [中心x, 中心y, 半徑x, 半徑y]；偵測不到臉的武將和男將不做胸口起伏，只有全身呼吸
  SG.JIGGLE_AUTO = {"zhaoyun":[0.567,0.844,0.672,0.228],"lubu":[0.529,0.582,0.361,0.122],"guanyu":[0.539,0.577,0.415,0.141],"zhangfei":[0.462,0.617,0.53,0.18],"sunshangxiang":[0.495,0.878,0.832,0.282],"xiaoqiao":[0.525,0.912,0.888,0.301],"diaochan":[0.477,0.649,0.541,0.184],"caocao":[0.304,0.614,0.454,0.154],"zhugeliang":[0.426,0.569,0.362,0.123],"zhouyu":[0.463,0.611,0.455,0.154],"liubei":[0.51,0.598,0.476,0.162],"machao":[0.514,0.847,0.545,0.185],"sunce":[0.487,0.668,0.533,0.181],"zhangliao":[0.461,0.674,0.562,0.191],"jiangwei":[0.475,0.837,0.702,0.238],"guanyinping":[0.42,0.77,0.666,0.226],"dianwei":[0.55,0.747,0.397,0.135],"xuchu":[0.539,0.821,0.655,0.222],"huangzhong":[0.575,0.623,0.473,0.161],"daqiao":[0.547,0.841,0.802,0.272],"zhurong":[0.621,0.525,0.379,0.128],"yuanshao":[0.515,0.802,0.643,0.218],"xiahouyuan":[0.587,0.741,0.666,0.226],"ganning":[0.587,0.819,0.608,0.206],"lumeng":[0.564,0.674,0.523,0.177],"jiaxu":[0.513,0.708,0.598,0.203],"guojia":[0.469,0.804,0.574,0.195],"xushu":[0.627,0.822,0.559,0.19],"simayi":[0.512,0.845,0.721,0.245],"zhenji":[0.429,0.571,0.407,0.138],"pangtong":[0.511,0.819,0.795,0.27],"huangyueying":[0.588,0.838,0.63,0.214],"luxun":[0.575,0.838,0.687,0.233],"zhangjiao":[0.531,0.852,0.781,0.265],"zhangbao":[0.542,0.86,0.718,0.244],"peiyuanshao":[0.417,0.903,0.699,0.237],"mayuanyi":[0.5,0.81,0.517,0.175],"bocai":[0.52,0.895,0.849,0.288],"zhanghe":[0.346,0.494,0.403,0.137],"dengai":[0.592,0.831,0.648,0.22],"sunjian":[0.621,0.834,0.795,0.27],"dongzhuo":[0.472,0.559,0.466,0.158],"zuoci":[0.622,0.755,0.595,0.202],"caoren":[0.543,0.826,0.787,0.267],"xunyu":[0.659,0.857,0.865,0.294],"xunyou":[0.468,0.833,0.724,0.246],"chengyu":[0.496,0.933,0.868,0.295],"caopi":[0.476,0.898,0.822,0.279],"caozhi":[0.486,0.615,0.41,0.139],"yuejin":[0.526,0.859,0.643,0.218],"yujin":[0.549,0.783,0.627,0.213],"lidian":[0.484,0.87,0.747,0.253],"pangde":[0.582,0.557,0.361,0.122],"zhonghui":[0.536,0.846,0.814,0.276],"wangjun":[0.611,0.856,0.676,0.229],"caozhang":[0.515,0.863,0.688,0.234],"caohong":[0.717,0.314,0.263,0.089],"caozhen":[0.451,0.504,0.446,0.151],"caiwenji":[0.537,0.9,0.673,0.228],"haozhao":[0.595,0.808,0.798,0.271],"simazhao":[0.476,0.928,0.879,0.298],"simashi":[0.592,0.805,0.684,0.232],"yuanshu":[0.532,0.874,0.816,0.277],"yanliang":[0.54,0.799,0.529,0.179],"wenchou":[0.611,0.843,0.661,0.224],"gongsunzan":[0.49,0.921,0.835,0.283],"liubiao":[0.542,0.84,0.724,0.246],"mateng":[0.509,0.771,0.587,0.199],"zhangxiu":[0.532,0.911,0.852,0.289],"huatuo":[0.488,0.562,0.406,0.138],"yuji":[0.639,0.6,0.37,0.125],"chengong":[0.623,0.467,0.326,0.111],"gaoshun":[0.484,0.9,0.807,0.274],"liru":[0.439,0.607,0.508,0.172],"lijue":[0.482,0.612,0.481,0.163],"liuzhang":[0.503,0.832,0.72,0.244],"tianfeng":[0.518,0.686,0.458,0.156],"jushou":[0.537,0.738,0.494,0.168],"shenpei":[0.724,0.517,0.391,0.133],"jiling":[0.474,0.812,0.738,0.25],"lulingqi":[0.597,0.606,0.379,0.128],"dongbai":[0.491,0.877,0.811,0.275],"wutugu":[0.584,0.808,0.634,0.215],"muludawang":[0.531,0.794,0.596,0.202],"taoqian":[0.503,0.933,0.939,0.319],"hansui":[0.472,0.513,0.425,0.144],"huaxiong":[0.603,0.787,0.696,0.236],"zhanglu":[0.303,0.567,0.225,0.076],"fazheng":[0.421,0.658,0.499,0.169],"liushan":[0.49,0.855,0.823,0.279],"zhangbao2":[0.47,0.649,0.457,0.155],"baosanniang":[0.472,0.85,0.79,0.268],"maxiuying":[0.482,0.784,0.706,0.24],"xingcai":[0.486,0.78,0.672,0.228],"madai":[0.475,0.861,0.736,0.25],"wangping":[0.481,0.871,0.667,0.226],"liaohua":[0.515,0.855,0.666,0.226],"yanyan":[0.467,0.789,0.649,0.22],"liyan":[0.436,0.586,0.446,0.151],"jiangwan":[0.573,0.808,0.765,0.26],"feiyi":[0.496,0.835,0.611,0.208],"jianyong":[0.542,0.785,0.75,0.254],"masu":[0.486,0.632,0.52,0.176],"mayunlu":[0.5,0.547,0.454,0.154],"huanggai":[0.461,0.638,0.509,0.173],"zhugejin":[0.487,0.818,0.754,0.256],"dingfeng":[0.446,0.594,0.443,0.15],"zhoutai":[0.604,0.811,0.769,0.261],"chengpu":[0.556,0.751,0.475,0.161],"lusu":[0.466,0.638,0.451,0.153],"handang":[0.473,0.642,0.532,0.18],"xusheng":[0.584,0.56,0.353,0.12],"zhuran":[0.511,0.737,0.463,0.157],"zhuhuan":[0.488,0.869,0.844,0.287],"panzhang":[0.497,0.931,0.871,0.296],"chenwu":[0.515,0.848,0.766,0.26],"zhangzhao":[0.457,0.749,0.566,0.192],"guyong":[0.54,0.74,0.64,0.217],"lukang":[0.51,0.829,0.732,0.248],"wangkong":[0.491,0.777,0.66,0.224],"mizhu":[0.508,0.596,0.479,0.163],"sunqian":[0.542,0.841,0.658,0.223],"jiangqin":[0.474,1.052,0.795,0.27],"bulianshi":[0.574,0.717,0.529,0.179],"sunluban":[0.539,0.591,0.46,0.156],"kanze":[0.556,0.544,0.412,0.14],"lvdai":[0.513,0.881,0.748,0.254],"gongdu":[0.51,0.837,0.763,0.259],"huangshao":[0.549,0.561,0.437,0.148],"yanzheng":[0.512,0.818,0.608,0.206],"zhuangsun":[0.457,0.838,0.678,0.23],"liheng":[0.487,0.837,0.724,0.246],"nongfu":[0.455,0.528,0.374,0.127],"zhuanghan":[0.528,0.515,0.374,0.127],"cungu":[0.458,0.846,0.763,0.259],"xinbing":[0.481,0.527,0.374,0.127],"nvduizhang":[0.493,0.858,0.69,0.234],"mazei":[0.505,0.516,0.374,0.127],"nvqishou":[0.479,0.807,0.637,0.216],"pangqibing":[0.521,0.522,0.374,0.127],"laolie":[0.501,0.508,0.374,0.127],"nvlieshou":[0.464,1.011,0.913,0.31],"changgong":[0.565,0.384,0.153,0.052],"yexing":[0.486,0.519,0.374,0.127],"douli":[0.501,0.505,0.374,0.127],"duniangzi":[0.519,0.985,0.829,0.281],"fushui":[0.486,0.521,0.374,0.127],"huojisi":[0.501,0.78,0.608,0.206],"bingdaogu":[0.474,0.844,0.763,0.259],"pangdaoshi":[0.471,0.529,0.374,0.127]};
  var NONE = [[0.5, 0.5, 0.001, 0.001], [0.5, 0.5, 0.001, 0.001]];
  var CFG_ALL = { K: 46, C: 3.2, UPK: 1.2, MAX: 0.015, BREATH: 0.011, BREATH_T: 3.8, LIFT: 0.006, SPREAD: 0, SWAY: 0.003, G: 1, TAP_V: 0.1, GRAB: 0.15, AUTO: 1e9, HOP: 0, HOP_T: 0.7 };
  SG.JIGGLE_ALL = CFG_ALL;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 頂點位移：整張圖以底部為支點做身體起伏（s）；胸部區域上緣固定、越往下動越多，並依上下位移做擠壓／拉長
  var VS = "attribute vec2 p;uniform vec4 b0;uniform vec4 b1;uniform vec2 o0;uniform vec2 o1;uniform float s;uniform float sx;varying vec2 uv;" +
    "vec2 f(vec2 q,vec4 b,vec2 o){vec2 d=(q-b.xy)/b.zw;float k=max(0.,1.-dot(d,d));float w=k*sqrt(k);" +
    "float a=smoothstep(-.7,.55,d.y);return w*a*(o+vec2(d.x*b.z*(-o.y)*1.,0.));}" +
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
    if (still || img._jg) return; img._jg = true;
    var own = SG.JIGGLE[id], au = SG.JIGGLE_AUTO[id], cfg = own || (au ? [au, NONE[1]] : NONE), CFG = own ? CFG_OWN : CFG_ALL;   // 沒有專屬範圍的武將用通用的含蓄呼吸
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
      cv.className = img.className + " jg"; cv.style.cssText = img.style.cssText; cv.setAttribute("aria-label", img.alt || ""); cv.setAttribute("role", "img");
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
        gl.uniform2f(u0, B[0].x + B[0].side * Math.max(0, B[0].y) * 0.08, B[0].y);
        gl.uniform2f(u1, B[1].x + B[1].side * Math.max(0, B[1].y) * 0.08, B[1].y);
        gl.uniform1f(us, body); gl.uniform1f(usx, sway);
        gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
  }
  var males = null;
  function isMale(id) { if (!males) { males = {}; (SG.CARDS || []).forEach(function (c) { if (c.male) males[c.art] = 1; }); } return !!males[id]; }   // 男將不做（✅ Jay 2026-11-14）
  function scan(root) {
    if (!root.querySelectorAll) return;
    var list = root.matches && root.matches("img") ? [root] : root.querySelectorAll("img");
    Array.prototype.forEach.call(list, function (im) {
      var mt = /img\/([a-z0-9_]+)_full\.webp/.exec(im.getAttribute("src") || ""); if (mt && !isMale(mt[1])) attach(im, mt[1]);
    });
  }
  SG.Jiggle = { attach: attach, scan: scan };
  if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, scan); }); }).observe(document.documentElement, { childList: true, subtree: true });
})(window.SG);
