/* 鬥將：特技觸發的全身立繪大演出（✅ Jay 2026-11-21：先做大演出看看；卡等越高越華麗；對手也播；語音之後再做）
   DU.cutin(鬥將卡, { side: 0 我方｜1 對手, rar: "N"|"R"|"SR"|"SSR"|"UR" }) → Promise，演完或點一下跳過就結束
   試看：網址加 ?fx=關羽 */
(function (SG) {
  var DU = SG.DuelUI, D = SG.DUEL;
  // 國家色：光帶、速度線、殘影
  var COLOR = { "魏": ["#7cc0ff", "#173a6b"], "蜀": ["#5ee08e", "#14492e"], "吳": ["#ff6b5e", "#6b1610"], "群雄": ["#c49bff", "#38215a"], "黃巾": ["#ffd45e", "#6b4f0f"] };
  // ★ 專屬元素（開發先配的）：個人特技看武將，其他看特技
  var ELEM_P = { "曹操": "rays", "司馬懿": "smoke", "張遼": "slash", "劉備": "petals", "關羽": "slash", "張飛": "rings", "諸葛亮": "stars", "孫權": "rays", "周瑜": "fire", "呂蒙": "waves", "貂蟬": "petals", "董卓": "smoke", "張角": "bolt", "呂布": "slash" };
  var ELEM_S = { "遠射": "arrows", "破門": "rings", "護主": "shield", "幻術": "mist", "計謀": "mist", "號召": "rays", "軍師": "stars", "突擊": "arrows", "連戰": "slash", "陣前換將": "waves", "結義": "rays", "鐵壁": "shield" };
  var ECOL = { "呂布": "#ff4a3a", "董卓": "#ff5a3a", "司馬懿": "#b07cff", "張遼": "#8fd0ff", "周瑜": "#ff8a2a", "張角": "#ffe066", "貂蟬": "#ff9ec8", "劉備": "#ffb3d1", "曹操": "#d9a8ff", "孫權": "#ffd27a" };
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
    if (!fontReady && document.fonts && document.fonts.load) fontReady = document.fonts.load('48px "Ma Shan Zheng"', D.LIST.map(function (x) { return x.skillName || ""; }).join("") + "技敵").catch(function () {});
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
      var done = false, timers = [];
      var finish = function () { if (done) return; done = true; timers.forEach(clearTimeout); el.classList.add("out"); setTimeout(function () { el.remove(); res(); }, 320); };
      timers.push(setTimeout(function () { document.body.classList.add("ci-shake"); setTimeout(function () { document.body.classList.remove("ci-shake"); }, 360); }, T.seal));
      timers.push(setTimeout(finish, T.out));
      el.addEventListener("click", finish);
    }); });
  };

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
