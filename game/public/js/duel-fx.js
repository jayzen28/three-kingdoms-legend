/* 鬥將：特技觸發的全身立繪大演出（✅ Jay 2026-11-21：先做大演出看看；卡等越高越華麗；對手也播；語音之後再做）
   DU.cutin(鬥將卡, { side: 0 我方｜1 對手, rar: "N"|"R"|"SR"|"SSR"|"UR" }) → Promise，演完或點一下跳過就結束
   試看：網址加 ?fx=關羽 */
(function (SG) {
  var DU = SG.DuelUI, D = SG.DUEL;
  // 國家色：光帶、速度線、殘影
  var COLOR = { "魏": ["#7cc0ff", "#173a6b"], "蜀": ["#5ee08e", "#14492e"], "吳": ["#ff6b5e", "#6b1610"], "群雄": ["#c49bff", "#38215a"], "黃巾": ["#ffd45e", "#6b4f0f"] };
  // ★ 專屬元素（開發先配的）：個人特技看武將，其他看特技
  var ELEM_P = { "曹操": "rays", "司馬懿": "smoke", "張遼": "slash", "劉備": "petals", "關羽": "slash", "張飛": "rings", "諸葛亮": "stars", "孫權": "rays", "周瑜": "fire", "呂蒙": "waves", "貂蟬": "petals", "董卓": "smoke", "張角": "bolt", "呂布": "slash" };
  var ELEM_S = { "遠射": "arrows", "破門": "rings", "護主": "shield", "幻術": "mist", "計謀": "mist", "號召": "rays", "軍師": "stars", "突擊": "arrows", "連擊": "slash", "單挑": "slash", "屯糧": "rays", "策反": "mist", "結義": "rays", "鐵壁": "shield" };
  var ECOL = { "呂布": "#ff4a3a", "董卓": "#ff5a3a", "司馬懿": "#b07cff", "張遼": "#8fd0ff", "周瑜": "#ff8a2a", "張角": "#ffe066", "貂蟬": "#ff9ec8", "劉備": "#ffb3d1", "曹操": "#d9a8ff", "孫權": "#ffd27a" };
  // 依臉的位置取景：圖等比縮放（cover 再乘 zoom），把臉放到框內 (tx, ty)
  function frame(el, art, zoom, tx, ty) {
    var f = (SG.FACEY && SG.FACEY[art]) || [0.5, 0.24, 0.22], W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    var sc = Math.max(W / 832, H / 1216) * (zoom || 1), iw = 832 * sc, ih = 1216 * sc;
    var x = Math.min(0, Math.max(W - iw, W * tx - f[0] * iw)), y = Math.min(0, Math.max(H - ih, H * ty - f[1] * ih));
    el.style.backgroundSize = iw.toFixed(0) + "px " + ih.toFixed(0) + "px"; el.style.backgroundPosition = x.toFixed(0) + "px " + y.toFixed(0) + "px";
  }
  // ===== 閃電（canvas）：主幹粗、會分岔，每道形狀粗細都不同，會閃爍、留殘光 =====
  function Lightning(cv, col) {
    var k = devicePixelRatio > 1 ? 1.5 : 1, g = cv.getContext("2d"), W = cv.width = innerWidth * k, H = cv.height = innerHeight * k, live = [], raf = 0, dead = false;
    function bolt(x0, y0, x1, y1, w, depth) {
      var pts = [[x0, y0], [x1, y1]], dis = Math.hypot(x1 - x0, y1 - y0) * 0.28;
      for (var it = 0; it < 7; it++) {
        var np = [pts[0]];
        for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[1] - a[1], dy = a[0] - b[0], L = Math.hypot(dx, dy) || 1, o = (Math.random() - .5) * dis; np.push([mx + dx / L * o, my + dy / L * o], b); }
        pts = np; dis *= 0.55;
      }
      var segs = [{ p: pts, w: w }];
      if (depth < 2) for (var n = 0; n < 2 + Math.floor(Math.random() * 3); n++) {
        var s0 = pts[Math.floor(pts.length * (0.15 + Math.random() * 0.6))], ang = Math.atan2(y1 - y0, x1 - x0) + (Math.random() - .5) * 1.6, len = Math.hypot(x1 - x0, y1 - y0) * (0.18 + Math.random() * 0.32);
        segs = segs.concat(bolt(s0[0], s0[1], s0[0] + Math.cos(ang) * len, s0[1] + Math.sin(ang) * len, w * (0.35 + Math.random() * 0.25), depth + 1));
      }
      return segs;
    }
    function draw() {
      if (dead) return; g.clearRect(0, 0, W, H); var now = performance.now();
      g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
      live = live.filter(function (b) { return now - b.t < b.life; });
      live.forEach(function (b) {
        var age = (now - b.t) / b.life, fl = age < 0.12 ? 1 : age < 0.2 ? 0.25 : age < 0.32 ? 0.95 : Math.max(0, 1 - age) * (Math.random() < 0.15 ? 0.3 : 1);
        b.segs.forEach(function (sg) {
          [[sg.w * 5, col, 0.22], [sg.w * 2.2, col, 0.55], [sg.w, "#ffffff", 1]].forEach(function (L) {
            g.strokeStyle = L[1]; g.globalAlpha = fl * L[2]; g.lineWidth = L[0]; g.shadowColor = col; g.shadowBlur = L[0] * 1.5;
            g.beginPath(); sg.p.forEach(function (q, i) { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
          });
        });
      });
      g.globalAlpha = 1;
      if (live.length) raf = requestAnimationFrame(draw); else raf = 0;
    }
    return {
      strike: function (tx, ty, w) {
        var x0 = (Math.random() * 1.2 - .1) * W, x1 = tx * W + (Math.random() - .5) * W * .1, y1 = ty * H;
        live.push({ segs: bolt(x0, -20, x1, y1, (w || 7) * (W / 600), 0), t: performance.now(), life: 420 + Math.random() * 260 });
        if (!raf) raf = requestAnimationFrame(draw);
      },
      stop: function () { dead = true; cancelAnimationFrame(raf); }
    };
  }
  function rnd(a, b) { return (a + Math.random() * (b - a)).toFixed(1); }
  function many(n, f) { var h = ""; for (var i = 0; i < n; i++) h += f(i); return h; }
  function elem(type) {
    if (type === "slash") return slashSvg();
    if (type === "bolt") return bolts("e");
    if (type === "fire") return '<div class="ce ce-fire">' + many(28, function () { return '<i style="left:' + rnd(0, 100) + '%;--d:' + rnd(.2, .9) + 's;--s:' + rnd(.6, 1.6) + ';--x:' + rnd(-40, 40) + 'px"></i>'; }) + '</div>';
    if (type === "petals") return '<div class="ce ce-petals">' + many(26, function () { return '<i style="left:' + rnd(-10, 100) + '%;--d:' + rnd(.2, 1) + 's;--r:' + rnd(-360, 360) + 'deg;--x:' + rnd(20, 120) + 'px;--s:' + rnd(.6, 1.3) + '"></i>'; }) + '</div>';
    if (type === "rings") return '<div class="ce ce-rings"><i></i><i></i><i></i></div>';
    if (type === "rays") return '<div class="ce ce-rays"></div>';
    if (type === "smoke" || type === "mist") return '<div class="ce ce-' + type + '">' + many(9, function () { return '<i style="left:' + rnd(-20, 80) + '%;top:' + rnd(10, 80) + '%;--d:' + rnd(.3, .8) + 's;--s:' + rnd(.8, 1.6) + '"></i>'; }) + '</div>';
    if (type === "waves") return '<div class="ce ce-waves">' + many(7, function (i) { return '<i style="top:' + (14 + i * 11) + '%;--d:' + (0.4 + i * .05).toFixed(2) + 's"></i>'; }) + '</div>';
    if (type === "arrows") return '<div class="ce ce-arrows">' + many(14, function () { return '<i style="top:' + rnd(5, 90) + '%;--d:' + rnd(.45, .9) + 's;--w:' + rnd(70, 160) + 'px"></i>'; }) + '</div>';
    if (type === "stars") return '<svg class="ce ce-stars" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline pathLength="1" points="58,14 66,24 74,22 80,34 76,46 86,56 92,52" />' + [[58, 14], [66, 24], [74, 22], [80, 34], [76, 46], [86, 56], [92, 52]].map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.4" style="animation-delay:' + (0.45 + i * 0.07).toFixed(2) + 's"/>'; }).join("") + '</svg>';
    if (type === "shield") return '<div class="ce ce-shield"><i></i></div>';
    return "";
  }
  var T = { band: 60, art: 200, elem: 520, name: 640, seal: 1050, out: 1850, end: 2200 };   // 時間軸（毫秒）

  function dust(n) {
    var h = "";
    for (var i = 0; i < n; i++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:' + (Math.random() * 900).toFixed(0) + 'ms;--dx:' + ((Math.random() - .5) * 120).toFixed(0) + 'px;--dy:' + (-40 - Math.random() * 120).toFixed(0) + 'px;--s:' + (0.5 + Math.random() * 1.2).toFixed(2) + '"></i>';
    return h;
  }
  function slashSvg() {
    return '<svg class="ci-slash" viewBox="0 0 400 400" preserveAspectRatio="none"><defs><linearGradient id="cisg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eafff0" stop-opacity="0"/><stop offset=".45" stop-color="#ffffff"/><stop offset=".7" style="stop-color:var(--ec)"/><stop offset="1" stop-color="#f5d98a" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M30 330 Q 160 40 380 60" pathLength="1" /><path class="b" d="M60 360 Q 210 110 395 120" pathLength="1" /></svg>';
  }
  function bolts(e) {
    return '<svg class="ci-bolt' + (e ? ' e' : '') + '" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M62 0 L48 30 L58 32 L40 62 L52 64 L30 100" /><path class="b2" d="M18 0 L28 24 L20 26 L34 52 L26 54 L40 80" /></svg>';
  }

  // 預先載入：卡片一到手牌或場上，就先把全身圖下載並解碼好；書法字也先載入（✅ Jay：試跑時角色出現比較慢）
  var cache = {}, fontReady = null;
  DU.preloadFx = function (names) {
    (names || []).forEach(function (n) {
      var d = D.CARD[n], art = d && d.art; if (!art || cache[art]) return;
      var im = new Image(); im.src = "img/" + art + "_full.webp"; cache[art] = im.decode ? im.decode().then(function () { return im; }, function () { return im; }) : Promise.resolve(im);
    });
    if (!fontReady && document.fonts && document.fonts.load) fontReady = document.fonts.load('48px "SGLBrush"', "技敵組合").catch(function () {});
  };
  DU.cutin = function (d, o) {
    o = o || {};
    DU.preloadFx([d.name]);
    var art0 = o.art || d.art, wait = function (p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); };
    // 圖還沒好就最多等 0.6 秒、字最多等 0.3 秒，不讓斜框空著滑進來
    return wait(cache[art0] || Promise.resolve(), 600).then(function () { return wait(fontReady || Promise.resolve(), 300); }).then(function () { return new Promise(function (res) {
      var side = o.side || 0, rar = o.rar || "R", c = COLOR[d.fac] || COLOR["蜀"], art = o.art || d.art;
      var big = rar === "SSR" || rar === "UR";
      var el = document.createElement("div");
      el.className = "cutin s" + side + " r-" + rar + (d.personal ? " personal" : "");
      el.style.setProperty("--c1", c[0]); el.style.setProperty("--c2", c[1]); el.style.setProperty("--ec", ECOL[d.name] || c[0]);
      var name = d.skillName, vert = name.length <= 7;
      el.innerHTML = '<div class="ci-dim"></div>' +
        (rar === "UR" ? '<div class="ci-flash"></div>' + bolts() : '') +
        '<div class="ci-band"><i class="ci-lines"></i><i class="ci-edge a"></i><i class="ci-edge b"></i></div>' +
        (big ? '<div class="ci-ring"></div>' : '') +
        '<div class="ci-art"><div class="ci-ghost g1"></div><div class="ci-ghost g2"></div><div class="ci-panel"><div class="ci-main" style="background-image:url(img/' + art + '_full.webp)"></div><i class="ci-sheen"></i></div></div>' +
        elem(d.personal ? ELEM_P[d.name] : ELEM_S[d.skill]) + (d.name === "呂布" ? bolts("e") : '') +
        '<div class="ci-dust">' + dust({ N: 14, R: 18, SR: 34, SSR: 46, UR: 60 }[rar] || 18) + '</div>' +
        '<div class="ci-txt' + (vert ? ' v' : '') + '"><div class="ci-name">' + name.split("").map(function (ch, i) { return '<span style="animation-delay:' + (T.name + i * 70) + 'ms">' + ch + '</span>'; }).join("") + '</div>' +
        '<div class="ci-who">' + (side ? '敵方・' : '') + d.name + '<em>' + (d.personal ? '個人特技' : '特技') + '</em></div></div>' +
        '<div class="ci-seal">' + (side ? '敵' : '技') + '</div>' +
        '<div class="ci-skip">點一下跳過</div>';
      document.body.appendChild(el);
      var pm = el.querySelector(".ci-main"); if (pm) frame(pm, art, 1.05, side ? 0.42 : 0.5, 0.3);
      var done = false, timers = [];
      var finish = function () { if (done) return; done = true; timers.forEach(clearTimeout); el.classList.add("out"); setTimeout(function () { el.remove(); res(); }, 320); };
      timers.push(setTimeout(function () { document.body.classList.add("ci-shake"); setTimeout(function () { document.body.classList.remove("ci-shake"); }, 360); }, T.seal));
      timers.push(setTimeout(finish, T.out));
      el.addEventListener("click", finish);
    }); });
  };

  // ===== 組合（湊齊）演出：電光火石（✅ Jay 2026-11-21：照開發提的做，加強電光火石） =====
  // ★ 各組顏色與專屬元素是開發配的
  var SETFX = { "五虎將": ["#ffd45e", "rays"], "五子良將": ["#7cc0ff", "slash"], "河北四庭柱": ["#c49bff", "rings"], "桃園結義": ["#ff9ec8", "petals"],
    "水鏡門下": ["#8ff0ff", "stars"], "司馬一族": ["#b07cff", "smoke"], "南蠻": ["#9be05e", "fire"], "大都督": ["#ff6b3a", "fire"],
    "託孤重臣": ["#fff1c4", "rays"], "荊州": ["#5ee0c8", "waves"], "益州": ["#7be07a", "mist"], "護主": ["#f5d98a", "shield"] };
  var NUM = ["", "一", "二", "三", "四", "五"];
  function zig(x0, y0, x1, y1, n, j) {   // 鋸齒閃電
    var p = [[x0, y0]];
    for (var i = 1; i < n; i++) { var t = i / n; p.push([x0 + (x1 - x0) * t + (Math.random() - .5) * j, y0 + (y1 - y0) * t + (Math.random() - .5) * j]); }
    p.push([x1, y1]); return p.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  }
  DU.setin = function (st, side) {
    var full = st.n >= st.size, fx = SETFX[st.tag] || ["#f5d98a", "rays"], col = fx[0];
    var arts = st.names.map(function (n) { var d = D.CARD[n]; return { n: n, art: d && d.art, on: st.got.indexOf(n) >= 0 }; });
    var imgs = arts.filter(function (a) { return a.art; }).map(function (a) { DU.preloadFx([a.n]); return cache[a.art]; });
    var wait = function (p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); };
    return wait(Promise.all(imgs), 700).then(function () { return new Promise(function (res) {
      var el = document.createElement("div");
      el.className = "setin s" + (side || 0) + (full ? " full" : "");
      el.style.setProperty("--c1", col); el.style.setProperty("--ec", col); el.style.setProperty("--k", arts.length);
      var strips = arts.map(function (a, i) {
        return '<div class="si-strip' + (a.on ? '' : ' off') + '" style="--i:' + i + ';animation-delay:' + (120 + i * 90) + 'ms"><div class="si-pic" style="' + (a.art ? 'background-image:url(img/' + a.art + '_full.webp)' : '') + '"></div><b>' + a.n + '</b></div>';
      }).join("");

      var sparks = ""; for (var k = 0; k < (full ? 46 : 28); k++) {
        var ang = Math.random() * 360, len = 30 + Math.random() * 60;
        sparks += '<i style="--a:' + ang.toFixed(0) + 'deg;--l:' + len.toFixed(0) + 'vmin;animation-delay:' + (560 + Math.random() * 160).toFixed(0) + 'ms"></i>';
      }
      var pips = ""; for (var q = 1; q <= st.size; q++) pips += '<i class="' + (q <= st.n ? 'on' : '') + '"></i>';
      el.innerHTML = '<div class="ci-dim"></div><div class="si-strips">' + strips + '</div>' + elem(fx[1]) +
        '<canvas class="si-bolts"></canvas><div class="si-crack"></div>' +
        '<div class="si-flash"></div><div class="si-sparks">' + sparks + '</div>' +
        '<div class="si-txt"><div class="si-tag">' + (side ? '敵方・' : '') + '組合' + (full ? '・全員集結' : '') + '</div>' +
        '<div class="si-name">' + st.tag.split("").map(function (ch, i) { return '<span style="animation-delay:' + (700 + i * 80) + 'ms">' + ch + '</span>'; }).join("") + '</div>' +
        '<div class="si-pips">' + pips + '</div><div class="si-bonus">' + NUM[st.n] + '人陣・兵力 <b>+' + st.bonus + '</b></div></div>' +
        '<div class="ci-skip">點一下跳過</div>';
      document.body.appendChild(el);
      el.querySelectorAll(".si-pic").forEach(function (pc, i) { if (arts[i].art) frame(pc, arts[i].art, 1.15, 0.5, 0.3); });
      var LG = Lightning(el.querySelector(".si-bolts"), col);
      var done = false, timers = [];
      var finish = function () { if (done) return; done = true; LG.stop(); timers.forEach(clearTimeout); el.classList.add("out"); setTimeout(function () { el.remove(); res(); }, 320); };
      var at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
      // 每條立繪落下各劈一道，接著重擊中央、再連發；全員再補一輪
      arts.forEach(function (a, i) { at(200 + i * 90, function () { LG.strike((i + 0.5) / arts.length, 0.35 + Math.random() * 0.4, 5 + Math.random() * 3); }); });
      at(540, function () { LG.strike(0.5, 0.5, 12); LG.strike(0.3 + Math.random() * 0.4, 0.5, 8); el.classList.add("hit"); });
      for (var z = 0; z < (full ? 9 : 5); z++) at(700 + z * (full ? 120 : 150) + Math.random() * 60, function () { LG.strike(Math.random(), 0.2 + Math.random() * 0.75, 3 + Math.random() * 9); });
      if (full) at(1150, function () { LG.strike(0.5, 0.5, 16); LG.strike(0.2, 0.55, 10); LG.strike(0.8, 0.45, 10); el.classList.add("hit2"); });
      timers.push(setTimeout(function () { document.body.classList.add("ci-shake"); setTimeout(function () { document.body.classList.remove("ci-shake"); }, 380); }, 560));
      if (full) timers.push(setTimeout(function () { document.body.classList.add("ci-shake"); setTimeout(function () { document.body.classList.remove("ci-shake"); }, 380); }, 1150));
      timers.push(setTimeout(finish, full ? 2900 : 2400));
      el.addEventListener("click", finish);
    }); });
  };

  // ===== 開局拋銅錢決定先後手（✅ Jay 2026-11-21） =====
  // first：0＝我方先攻（字面朝上）、1＝對手先攻（背面朝上）
  DU.coinToss = function (first, oppName) {
    return new Promise(function (res) {
      var el = document.createElement("div"); el.className = "toss";
      el.innerHTML = '<div class="ts-title kai">拋銅錢・定先後</div><div class="ts-rule"><span><b>字面</b> 你先攻</span><span><b>背面</b> ' + (oppName ? esc(oppName) : '對手') + '先攻</span></div>' +
        '<div class="ts-stage"><div class="ts-shadow"></div><div class="ts-coin ' + (first === 0 ? 'head' : 'tail') + '"><div class="ts-face f"></div><div class="ts-face b"></div></div></div>' +
        '<div class="ts-res kai">' + (first === 0 ? '字面！<br><strong>你先攻</strong>' : '背面！<br><strong>你後攻</strong>') + '</div><div class="ts-sub">' + (first === 0 ? '先攻第 1 回合 1 道軍令、不抽牌' : '後攻前兩回合各 2 道軍令') + '</div><div class="ci-skip">點一下繼續</div>';
      document.body.appendChild(el);
      var done = false, end = function () { if (done) return; done = true; el.classList.add("out"); setTimeout(function () { el.remove(); res(); }, 300); };
      setTimeout(function () { el.classList.add("show"); }, 1750);
      var auto = setTimeout(end, 3300);
      el.addEventListener("click", function () { if (el.classList.contains("show")) { clearTimeout(auto); end(); } });
    });
  };
  // ===== 交戰大卡、城門翻牌、道具使用（✅ Jay 2026-11-22：進攻防守要有夠大的卡片示意、翻出來的卡要說明、道具要有演出、不要太快帶過） =====
  // ★ 版面、時間長度是開發定的：左邊固定是我方、右邊是敵方
  function overlay(cls, html, ms, steps) {
    return new Promise(function (res) {
      var el = document.createElement("div"); el.className = "fxo " + cls;
      el.innerHTML = '<div class="fxo-dim"></div>' + html + '<div class="ci-skip">點一下跳過</div>';
      document.body.appendChild(el);
      var done = false, timers = [];
      var finish = function () { if (done) return; done = true; timers.forEach(clearTimeout); el.classList.add("out"); setTimeout(function () { el.remove(); res(); }, 280); };
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("go"); }); });
      (steps || []).forEach(function (st) { timers.push(setTimeout(function () { if (!done) st[1](el); }, st[0])); });
      timers.push(setTimeout(finish, ms));
      el.addEventListener("click", finish);
    });
  }
  function shake() { document.body.classList.add("ci-shake"); setTimeout(function () { document.body.classList.remove("ci-shake"); }, 360); }
  var KIND = { block: "進攻", gate: "進攻", snipe: "遠射", duel: "單挑", lubu: "神擋殺神" };
  DU.clashin = function (c, side) {
    var W = ["我方", "敵方"], atkW = W[side], defW = W[1 - side];
    var A = { d: c.a, p: c.pa, dead: c.deadA, left: c.leftA, role: "進攻", atk: true };
    var B = c.kind === "gate" ? { gate: true } : { d: c.b, p: c.pb, dead: c.deadB, left: c.leftB, role: c.kind === "snipe" ? "後陣" : c.kind === "lubu" ? "目標" : "格擋" };
    var col = function (x, w) {
      if (x.gate) return '<div class="cl-col def gate' + (c.gates ? ' broke' : '') + '"><div class="cl-tag">' + w + '・城門</div>' +
        '<div class="cl-gate"><img class="g0" src="img/gate.webp" alt=""><img class="g1" src="img/gate_broken.webp" alt=""></div>' +   // ✅ Jay 2026-11-22：城門改用 Gemini 畫的圖
        '<div class="cl-num"><small>城門</small><b>' + (c.gates ? '−' + c.gates : '0') + '</b></div><div class="cl-left">' + (c.gates ? '剩 ' + c.left + ' 道' : '護主擋下') + '</div></div>';
      var res = x.dead ? '被擊退' : (x.left !== undefined && x.left < x.p ? '剩兵力 ' + x.left : (x.atk ? '' : c.kind === "snipe" ? '' : '擋下了'));
      if (x.atk && c.noCounter && !x.dead) res = '不會被反扣';
      return '<div class="cl-col ' + (x.atk ? 'atk' : 'def') + (x.dead ? ' dead' : '') + '"><div class="cl-tag">' + w + '・' + x.role + '</div>' +
        '<div class="cl-card">' + DU.face(x.d, "m", { bp: x.p }) + '<i class="cl-seal kai">擊退</i></div>' +
        '<div class="cl-num"><small>兵力</small><b>' + x.p + '</b></div><div class="cl-left">' + res + '</div></div>';
    };
    var L = side === 0 ? col(A, atkW) : col(B, defW), R = side === 0 ? col(B, defW) : col(A, atkW);
    var sub = c.kind === "gate" ? '沒人格擋，直取城門' : c.kind === "snipe" ? '打' + defW + '後陣・對方不能格擋' : c.kind === "duel" ? '指定 ' + c.b.name + ' 交戰' : c.kind === "lubu" ? '直接擊退 ' + c.b.name : defW + ' ' + c.b.name + ' 出來格擋';
    var resT = c.kind === "gate" ? (c.gates ? defW + '城門被破！' : '護主擋下了這次進攻') : c.deadA && c.deadB ? '同歸於盡' : c.deadB ? c.b.name + ' 被擊退' : c.deadA ? c.a.name + ' 被擊退' : c.kind === "snipe" ? '沒能擊退' : '擋下了';
    var hurtD = c.kind === "gate" ? c.gates > 0 : c.deadB, hurtA = c.deadA;   // 對我方好就金色、不好就藍灰
    var good = side === 0 ? hurtD && !hurtA : hurtA && !hurtD, bad = side === 0 ? hurtA && !hurtD : hurtD && !hurtA;
    var resCls = good ? "win" : bad ? "lose" : "even";
    var html = '<div class="cl-head"><div class="cl-title kai">' + atkW + ' ' + c.a.name + '・' + KIND[c.kind] + '</div><div class="cl-sub">' + sub + '</div></div>' +
      '<div class="cl-stage s' + side + '">' + L + '<div class="cl-vs kai">VS</div>' + R + '<i class="cl-flash"></i><i class="cl-slash"></i></div>' +
      '<div class="cl-res kai ' + resCls + '">' + resT + '</div>';
    return overlay("clash", html, 2500, [[650, function (el) { el.classList.add("hit"); shake(); }], [950, function (el) { el.classList.add("res"); }]]);
  };
  DU.flipin = function (x, side) {
    var c = x.flip, w = side ? "敵方" : "我方";
    var R = { hand: ["急報・援軍", "加入" + w + "手牌"], back: ["急報・伏兵", "直接進入" + w + "後陣"], counter: ["急報・反擊", (x.u ? x.u.name : "前陣武將") + " 重新可行動、兵力 +1000"] };
    var r = R[x.res] || [c.trig === "伏兵" ? "急報・伏兵（後陣滿了）" : c.trig === "反擊" ? "急報・反擊（沒人能用）" : "沒有急報", "放進" + w + "棄牌區"];
    var html = '<div class="gf-head"><div class="gf-title kai">' + w + '城門被破</div><div class="gf-sub">剩 ' + x.left + ' 道城門・翻開被破的城門牌</div></div>' +
      '<div class="gf-card"><div class="gf-inner"><div class="gf-back"><img src="img/gate_broken.webp" alt=""></div><div class="gf-front">' + DU.face(c, "m") + '</div></div></div>' +
      '<div class="gf-res"><b class="kai">' + r[0] + '</b><span>' + c.name + ' → ' + r[1] + '</span></div>';
    return overlay("gflip " + (side ? "theirs" : "mine"), html, 2600, [[450, function (el) { el.classList.add("flip"); }], [900, function (el) { el.classList.add("res"); }]]);
  };
  DU.itemin = function (x, side) {
    var it = x.item, name = it.name || "";
    var html = '<div class="it-rays"></div><div class="it-who">' + (side ? '敵方' : '我方') + '使用道具</div>' +
      '<div class="it-row"><div class="it-card">' + DU.face(it, "m") + '</div>' + (x.tgt ? '<div class="it-arrow">➜</div><div class="it-tgt">' + DU.face(x.tgt, "m") + '</div>' : '') + '</div>' +
      '<div class="it-name kai">' + name.split("").map(function (ch, i) { return '<span style="animation-delay:' + (350 + i * 90) + 'ms">' + ch + '</span>'; }).join("") + '</div>' +
      '<div class="it-msg">' + esc(x.msg || it.text || "") + '</div><div class="it-spark">' + many(16, function () { return '<i style="left:' + rnd(10, 90) + '%;top:' + rnd(20, 75) + '%;animation-delay:' + rnd(.2, 1.2) + 's"></i>'; }) + '</div>';
    return overlay("itemin s" + side, html, 2400, [[300, shake]]);
  };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ===== 試看頁：?fx=關羽 =====
  var q = /[?&]fx=([^&]+)/.exec(location.search);
  if (q) window.addEventListener("load", function () {
    setTimeout(function () {
      var name = decodeURIComponent(q[1]), d = D.CARD[name] || D.CARD["關羽"], st = { side: 0, rar: "SSR" };
      try { var S0 = SG._state; S0.duel = S0.duel || {}; S0.duel.seenRule2 = 1; SG.UI.close(); } catch (e) {}
      var p = document.createElement("div"); p.id = "ci-demo";
      var draw = function () {
        var opts = D.LIST.filter(function (x) { return x.skill && x.art; }).sort(function (a, b) { return (b.personal ? 1 : 0) - (a.personal ? 1 : 0); });
        p.innerHTML = '<b>特技演出試看</b><select id="ci-pick">' + opts.map(function (x) { return '<option' + (x === d ? ' selected' : '') + ' value="' + x.name + '">' + (x.personal ? '★' : '') + x.name + '・' + x.skillName + '</option>'; }).join("") + '</select>' +
          '<div>' + ["我方", "對手"].map(function (t, i) { return '<button class="chip' + (st.side === i ? ' on' : '') + '" data-sd="' + i + '">' + t + '</button>'; }).join("") + '</div>' +
          '<div>' + ["N", "R", "SR", "SSR", "UR"].map(function (r) { return '<button class="chip' + (st.rar === r ? ' on' : '') + '" data-rr="' + r + '">' + r + '</button>'; }).join("") + '</div>' +
          '<button class="pri" id="ci-play">播放</button>';
        p.querySelectorAll("[data-sd]").forEach(function (b) { b.onclick = function () { st.side = +b.dataset.sd; draw(); play(); }; });
        p.querySelectorAll("[data-rr]").forEach(function (b) { b.onclick = function () { st.rar = b.dataset.rr; draw(); play(); }; });
        p.querySelector("#ci-play").onclick = play;
        var sp = document.createElement("div"); sp.innerHTML = '<select id="ci-set">' + Object.keys(D.SET_TAGS).map(function (t) { return '<option>' + t + '</option>'; }).join("") + '</select><button class="chip" data-sn="part">湊到門檻</button><button class="chip" data-sn="full">全員</button>';
        p.appendChild(sp);
        var dp = document.createElement("div"); dp.innerHTML = '<button class="chip" data-dm="clash">交戰</button><button class="chip" data-dm="gate">破城門</button><button class="chip" data-dm="flip">翻牌</button><button class="chip" data-dm="item">道具</button><button class="chip" data-dm="bao">小籠包</button>';
        p.appendChild(dp);
        dp.querySelectorAll("[data-dm]").forEach(function (b) { b.onclick = function () {
          if (busy) return; busy = true; var k = b.dataset.dm, e = D.CARD["張郃"], pr;
          if (k === "clash") pr = DU.clashin({ a: d, pa: d.bp + 500, b: e, pb: e.bp, kind: "block", deadB: true, leftA: 500, leftB: 0 }, st.side);
          else if (k === "gate") pr = DU.clashin({ a: d, pa: d.bp, b: null, kind: "gate", gates: 1, left: 5 }, st.side);
          else if (k === "flip") pr = DU.flipin({ flip: D.CARD["王異"], left: 4, res: "hand" }, st.side);
          else if (k === "item") pr = DU.itemin({ item: D.ITEMS.find(function (x) { return x.id === "dao"; }), msg: d.name + " 兵力 +1500", tgt: d }, st.side);
          else pr = DU.itemin({ item: D.ITEMS.find(function (x) { return x.id === "bao"; }), msg: d.name + " 免於擊退，留在場上（兵力剩 1000）", tgt: d }, st.side);
          pr.then(function () { busy = false; });
        }; });
        sp.querySelectorAll("[data-sn]").forEach(function (b) { b.onclick = function () {
          var t = p.querySelector("#ci-set").value, names = D.SET_TAGS[t].split(" ").filter(function (n) { return D.CARD[n]; }), tier = D.SET_TIER[names.length];
          var n = b.dataset.sn === "full" ? names.length : +Object.keys(tier)[0];
          if (!busy) { busy = true; DU.setin({ tag: t, size: names.length, n: n, bonus: tier[n], names: names, got: names.slice(0, n) }, st.side).then(function () { busy = false; }); }
        }; });
        p.querySelector("#ci-pick").onchange = function () { d = D.CARD[this.value]; draw(); play(); };
      };
      var busy = false;
      var play = function () { if (busy) return; busy = true; DU.cutin(d, st).then(function () { busy = false; }); };
      document.body.appendChild(p); draw();
      SG.UI.go("duel"); SG.UI.close();
      setTimeout(play, 400);
    }, 600);
  });
})(window.SG);
["gate", "gate_broken"].forEach(function (n) { var i = new Image(); i.src = "img/" + n + ".webp"; });   // 城門圖先載
