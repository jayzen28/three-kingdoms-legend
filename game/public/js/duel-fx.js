/* 鬥將：特技觸發的全身立繪大演出（✅ Jay 2026-11-21：先做大演出看看；卡等越高越華麗；對手也播；語音之後再做）
   DU.cutin(鬥將卡, { side: 0 我方｜1 對手, rar: "N"|"R"|"SR"|"SSR"|"UR" }) → Promise，演完或點一下跳過就結束
   試看：網址加 ?fx=關羽 */
(function (SG) {
  var DU = SG.DuelUI, D = SG.DUEL;
  // 國家色：光帶、速度線、殘影
  var COLOR = { "魏": ["#7cc0ff", "#173a6b"], "蜀": ["#5ee08e", "#14492e"], "吳": ["#ff6b5e", "#6b1610"], "群雄": ["#c49bff", "#38215a"], "黃巾": ["#ffd45e", "#6b4f0f"] };
  // ★ 個人特技專屬元素（先做關羽：青龍偃月刀的弧形斬擊）
  var ELEM = { "關羽": "slash" };
  var T = { band: 60, art: 200, elem: 520, name: 640, seal: 1050, out: 1850, end: 2200 };   // 時間軸（毫秒）

  function dust(n) {
    var h = "";
    for (var i = 0; i < n; i++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:' + (Math.random() * 900).toFixed(0) + 'ms;--dx:' + ((Math.random() - .5) * 120).toFixed(0) + 'px;--dy:' + (-40 - Math.random() * 120).toFixed(0) + 'px;--s:' + (0.5 + Math.random() * 1.2).toFixed(2) + '"></i>';
    return h;
  }
  function slashSvg() {
    return '<svg class="ci-slash" viewBox="0 0 400 400" preserveAspectRatio="none"><defs><linearGradient id="cisg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eafff0" stop-opacity="0"/><stop offset=".45" stop-color="#ffffff"/><stop offset=".7" style="stop-color:var(--c1)"/><stop offset="1" stop-color="#f5d98a" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M30 330 Q 160 40 380 60" pathLength="1" /><path class="b" d="M60 360 Q 210 110 395 120" pathLength="1" /></svg>';
  }
  function bolts() {
    return '<svg class="ci-bolt" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M62 0 L48 30 L58 32 L40 62 L52 64 L30 100" /><path class="b2" d="M18 0 L28 24 L20 26 L34 52 L26 54 L40 80" /></svg>';
  }

  DU.cutin = function (d, o) {
    o = o || {};
    return new Promise(function (res) {
      var side = o.side || 0, rar = o.rar || "R", c = COLOR[d.fac] || COLOR["蜀"], art = o.art || d.art;
      var big = rar === "SSR" || rar === "UR";
      var el = document.createElement("div");
      el.className = "cutin s" + side + " r-" + rar + (d.personal ? " personal" : "");
      el.style.setProperty("--c1", c[0]); el.style.setProperty("--c2", c[1]);
      var name = d.skillName, vert = name.length <= 7;
      el.innerHTML = '<div class="ci-dim"></div>' +
        (rar === "UR" ? '<div class="ci-flash"></div>' + bolts() : '') +
        '<div class="ci-band"><i class="ci-lines"></i><i class="ci-edge a"></i><i class="ci-edge b"></i></div>' +
        (big ? '<div class="ci-ring"></div>' : '') +
        '<div class="ci-art"><div class="ci-ghost g1"></div><div class="ci-ghost g2"></div><div class="ci-panel"><img class="ci-main" src="img/' + art + '_full.webp" alt=""><i class="ci-sheen"></i></div></div>' +
        (ELEM[d.name] === "slash" ? slashSvg() : '') +
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
    });
  };

  // ===== 試看頁：?fx=關羽 =====
  var q = /[?&]fx=([^&]+)/.exec(location.search);
  if (q) window.addEventListener("load", function () {
    setTimeout(function () {
      var name = decodeURIComponent(q[1]), d = D.CARD[name] || D.CARD["關羽"], st = { side: 0, rar: "SSR" };
      try { var S0 = SG._state; S0.duel = S0.duel || {}; S0.duel.seenRule2 = 1; SG.UI.close(); } catch (e) {}
      var p = document.createElement("div"); p.id = "ci-demo";
      var draw = function () {
        p.innerHTML = '<b>特技演出試看・' + d.name + '「' + d.skillName + '」</b>' +
          '<div>' + ["我方", "對手"].map(function (t, i) { return '<button class="chip' + (st.side === i ? ' on' : '') + '" data-sd="' + i + '">' + t + '</button>'; }).join("") + '</div>' +
          '<div>' + ["N", "R", "SR", "SSR", "UR"].map(function (r) { return '<button class="chip' + (st.rar === r ? ' on' : '') + '" data-rr="' + r + '">' + r + '</button>'; }).join("") + '</div>' +
          '<button class="pri" id="ci-play">播放</button>';
        p.querySelectorAll("[data-sd]").forEach(function (b) { b.onclick = function () { st.side = +b.dataset.sd; draw(); play(); }; });
        p.querySelectorAll("[data-rr]").forEach(function (b) { b.onclick = function () { st.rar = b.dataset.rr; draw(); play(); }; });
        p.querySelector("#ci-play").onclick = play;
      };
      var busy = false;
      var play = function () { if (busy) return; busy = true; DU.cutin(d, st).then(function () { busy = false; }); };
      document.body.appendChild(p); draw();
      SG.UI.go("duel"); SG.UI.close();
      setTimeout(play, 400);
    }, 600);
  });
})(window.SG);
