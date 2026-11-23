/* 拉霸守城：轉輪、聽牌、中獎、名將助陣的特效與合成音效
   ✅ Jay 2026-11-23：轉輪一格一格捲、三排依序停；直接按鈕（不做拉桿）；聽牌（前兩排「令令」時第三排特別演出）；
     中獎金光＋金幣＋各符號爆發；武將立繪衝出；兩條線「大勝」；三令「名將助陣」書法字＋大圖；音效先用程式合成 */
(function (SG) {
  var F = SG.SlotFX = {};
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ===== 合成音效 =====
  var AC = null;
  function ac() {
    try { if (localStorage.getItem("sgl_snd") === "0") return null; } catch (e) { }
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(f, t0, dur, type, vol, f2) {
    var c = ac(); if (!c) return; var t = c.currentTime + (t0 || 0);
    var o = c.createOscillator(), g = c.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t0, dur, vol, hp) {
    var c = ac(); if (!c) return; var t = c.currentTime + (t0 || 0), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 800;
    s.buffer = b; g.gain.value = vol || 0.2; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  F.snd = {
    tick: function () { tone(1800 + Math.random() * 400, 0, 0.03, "square", 0.025); },
    thunk: function () { tone(140, 0, 0.18, "sine", 0.5, 60); noise(0, 0.06, 0.15, 400); },
    drum: function (k) { noise(0, 0.07, 0.08 + 0.12 * k, 200); tone(90 + 40 * k, 0, 0.08, "triangle", 0.15); },
    win: function (big) { var n = big ? [523, 659, 784, 1047, 1319] : [659, 784, 1047]; n.forEach(function (f, i) { tone(f, i * 0.09, 0.25, "triangle", 0.18); tone(f * 2, i * 0.09, 0.15, "sine", 0.05); }); },
    coins: function (n) { for (var i = 0; i < (n || 8); i++) tone(2200 + Math.random() * 1600, i * 0.05 + Math.random() * 0.03, 0.12, "sine", 0.06); },
    whoosh: function () { noise(0, 0.35, 0.18, 1200); },
    gong: function () { [98, 147, 196, 294].forEach(function (f, i) { tone(f, 0, 2.2, "sine", 0.22 - i * 0.04); }); noise(0, 0.5, 0.15, 300); },
    rise: function () { tone(220, 0, 1.2, "sawtooth", 0.05, 880); },
    fire: function () { noise(0, 0.6, 0.2, 300); },
    thunder: function () { noise(0, 0.9, 0.35, 60); tone(60, 0, 0.6, "sine", 0.4, 30); },
    wind: function () { noise(0, 0.8, 0.12, 2000); },
    rock: function () { tone(70, 0, 0.4, "sine", 0.6, 35); noise(0.05, 0.4, 0.25, 150); }
  };

  F.preload = function () { ["sym_fire", "sym_thunder", "sym_wind", "sym_rock", "sym_ling", "sym_frame", "fx_fire", "fx_thunder", "fx_wind", "fx_rock", "title_mjzz", "u_e_spear", "u_e_cav", "u_e_shield", "u_e_bow", "u_e_mage", "u_a_spear", "u_a_cav", "u_a_bow", "u_a_sin", "u_a_mage"].forEach(function (n) { var i = new Image(); i.src = "img/slot/" + n + ".webp" + (n === "title_mjzz" ? "?v=1" : ""); }); };

  // ===== 轉輪 =====
  // 盤面 9 格：索引 i 在第 i%3 排（直的）、第 floor(i/3) 列
  F.build = function (box, grid, symHtml) {
    box.innerHTML = [0, 1, 2].map(function (c) { return '<div class="sl-reel"><div class="sl-strip">' + [0, 1, 2].map(function (r) { return '<div class="sl-cell">' + symHtml(grid[r * 3 + c]) + '</div>'; }).join("") + '</div></div>'; }).join("") +
      '<svg class="sl-beams" viewBox="0 0 300 300" preserveAspectRatio="none"></svg>';
  };
  F.cells = function (box) { var out = []; $$(".sl-reel", box).forEach(function (reel, c) { $$(".sl-strip .sl-cell", reel).slice(-3).forEach(function (el, r) { out[r * 3 + c] = el; }); }); return out; };

  // 前兩排停下時，有沒有可能連線（聽牌）；兩格都是「令」＝大獎聽牌
  var CROSS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [6, 4, 2]];
  F.tease = function (g, WILD) {
    var lvl = 0;
    CROSS.forEach(function (ln) { var a = g[ln[0]], b = g[ln[1]]; if (a === WILD && b === WILD) lvl = 2; else if (lvl < 1 && (a === b || a === WILD || b === WILD)) lvl = 1; });
    return lvl;
  };

  F.spin = function (box, oldGrid, fin, symHtml, randSym, WILD) {
    return new Promise(function (done) {
      var tease = F.tease(fin, WILD), H = box.querySelector(".sl-cell").getBoundingClientRect().height + 4;
      box.classList.remove("tease", "tease2"); $$(".sl-cell", box).forEach(function (e) { e.classList.remove("hit"); });
      box.querySelector(".sl-beams").innerHTML = "";
      var stops = [620, 900, tease === 2 ? 2600 : tease ? 1900 : 1180], ticking = setInterval(F.snd.tick, 70), stopped = 0;
      $$(".sl-reel", box).forEach(function (reel, c) {
        var n = Math.round(stops[c] / 55), items = [];
        for (var r = 0; r < 3; r++) items.push(symHtml(fin[r * 3 + c]));
        for (var k = 0; k < n; k++) items.push(symHtml(randSym()));
        for (var r2 = 0; r2 < 3; r2++) items.push(symHtml(oldGrid[r2 * 3 + c]));
        var strip = reel.querySelector(".sl-strip");
        strip.style.transition = "none";
        strip.innerHTML = items.map(function (h) { return '<div class="sl-cell">' + h + '</div>'; }).join("");
        strip.style.transform = "translateY(" + (-(items.length - 3) * H) + "px)";
        strip.classList.add("blur");
        void strip.offsetHeight;
        strip.style.transition = "transform " + stops[c] + "ms " + (c === 2 && tease ? "cubic-bezier(.12,.7,.18,1)" : "cubic-bezier(.25,.75,.3,1.08)");
        strip.style.transform = "translateY(0)";
        setTimeout(function () {
          strip.classList.remove("blur"); strip.style.transition = "none";
          strip.innerHTML = items.slice(0, 3).map(function (h) { return '<div class="sl-cell">' + h + '</div>'; }).join(""); strip.style.transform = "translateY(0)";
          reel.classList.remove("land"); void reel.offsetWidth; reel.classList.add("land");
          F.snd.thunk(); stopped++;
          if (c === 1 && tease) { box.classList.add(tease === 2 ? "tease2" : "tease"); drumroll(stops[2] - stops[1], tease); }
          if (stopped === 3) { clearInterval(ticking); box.classList.remove("tease", "tease2"); done(); }
        }, stops[c]);
      });
    });
  };
  function drumroll(ms, lvl) {
    var t0 = Date.now(); (function beat() { var k = Math.min(1, (Date.now() - t0) / ms); F.snd.drum(k * (lvl === 2 ? 1 : 0.6)); if (Date.now() - t0 < ms - 80) setTimeout(beat, 160 - 110 * k); })();
    if (lvl === 2) F.snd.rise();
  }

  // ===== 中獎 =====
  F.win = function (box, field, hits, opts) {
    var cells = F.cells(box), svg = box.querySelector(".sl-beams"), big = hits.length > 1;
    var cen = function (i) { return [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50]; };
    svg.innerHTML = hits.map(function (h) {
      var a = cen(h.ln[0]), b = cen(h.ln[2]);
      return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" class="beam"/>';
    }).join("");
    hits.forEach(function (h) { h.ln.forEach(function (i) { cells[i].classList.add("hit"); }); });
    coins(box, big ? 26 : 12);
    F.snd.win(big); F.snd.coins(big ? 16 : 8);
    if (big) bigWin(field);
    var syms = {}; hits.forEach(function (h) { syms[h.sym] = 1; });
    (opts.splash || []).forEach(function (k, i) { setTimeout(function () { splash(field, k); }, 150 + i * 260); });
    (opts.cut || []).forEach(function (c, i) { setTimeout(function () { cutIn(field, c); }, 350 + i * 900); });
  };
  function coins(box, n) {
    var r = box.getBoundingClientRect(), layer = document.body;
    for (var i = 0; i < n; i++) {
      var c = document.createElement("i"); c.className = "sl-coin"; layer.appendChild(c);
      var x = r.left + r.width / 2, y = r.top + r.height / 2, ang = Math.random() * Math.PI * 2, d = 80 + Math.random() * 140;
      c.style.left = x + "px"; c.style.top = y + "px";
      c.animate([{ transform: "translate(-50%,-50%) scale(.4) rotateY(0deg)", opacity: 1 },
        { transform: "translate(calc(-50% + " + Math.cos(ang) * d + "px), calc(-50% + " + (Math.sin(ang) * d - 120) + "px)) scale(1) rotateY(540deg)", opacity: 1, offset: 0.55 },
        { transform: "translate(calc(-50% + " + Math.cos(ang) * d * 1.2 + "px), calc(-50% + " + (Math.sin(ang) * d + 160) + "px)) scale(.8) rotateY(900deg)", opacity: 0 }],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = (function (el) { return function () { el.remove(); }; })(c);
    }
  }
  function bigWin(field) {
    var e = document.createElement("div"); e.className = "sl-big"; e.innerHTML = "<b>大勝！</b>"; field.appendChild(e);
    field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake");
    setTimeout(function () { e.remove(); }, 1500);
  }
  function splash(field, k) {
    var e = document.createElement("div"); e.className = "sl-sp sp-" + k; field.appendChild(e);
    var im = document.createElement("img"); im.src = "img/slot/fx_" + k + ".webp"; im.alt = ""; e.appendChild(im);   // ✅ Jay 2026-11-23：效果圖用 Gemini 生成
    if (k === "fire") F.snd.fire(); else if (k === "thunder") F.snd.thunder(); else if (k === "wind") F.snd.wind(); else if (k === "rock") { F.snd.rock(); field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake"); }
    setTimeout(function () { e.remove(); }, 1500);
  }
  // ✅ Jay 2026-11-23：升星／出陣的圖不能被壓扁 → 用半身卡圖（一定有臉），等比例裁切
  function cutIn(field, c) {
    var e = document.createElement("div"); e.className = "sl-cut";
    e.innerHTML = '<div class="art"><img src="img/' + c.art + '_card.webp" alt=""></div><div class="txt"><b>' + c.name + '</b><span>' + c.msg + '</span></div>';
    field.appendChild(e); F.snd.whoosh();
    setTimeout(function () { e.classList.add("out"); }, 1100); setTimeout(function () { e.remove(); }, 1500);
  }

  // ===== 名將助陣 =====
  // ✅ Jay 2026-11-23：「名將助陣」四個字放下面，不能擋到臉；一定要看得到武將的臉 → 整張立繪完整顯示（不裁切）
  F.jackpot = function (guests) {
    return new Promise(function (done) {
      var g = guests[0], o = document.createElement("div"); o.className = "sl-jack";
      o.innerHTML = '<div class="sl-jk-rays"></div><div class="sl-jk-art"><img src="img/' + g.art + '_full.webp" alt=""></div><div class="sl-jk-pillar"></div>' +
        '<div class="sl-jk-name"><em class="r-' + g.rar + '">' + g.rar + '</em><b>' + g.name + '</b>' + (g.notOwn ? '<small>未擁有</small>' : '') + '</div>' +
        '<div class="sl-jk-title"><img src="img/slot/title_mjzz.webp?v=1" alt="名將助陣" onerror="this.parentNode.classList.add(\'txt\');this.parentNode.textContent=\'名將助陣\'"></div>' +
        '<div class="sl-jk-tap">點一下繼續</div>';
      document.body.appendChild(o);
      F.snd.gong(); setTimeout(F.snd.rise, 700); setTimeout(function () { F.snd.win(true); F.snd.coins(20); }, 1500);
      var ok = false, closed = false; setTimeout(function () { ok = true; o.classList.add("tap"); }, 1800);
      var close = function () { if (closed) return; closed = true; o.classList.add("out"); setTimeout(function () { o.remove(); done(); }, 300); };
      o.onclick = function () { if (ok) close(); };
      setTimeout(close, 6000);
    });
  };
})(window.SG);
