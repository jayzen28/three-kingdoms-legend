/* 拉霸守城：大廳（#s-slot）與對戰畫面（#s-slotb） */
(function (SG) {
  var UI = SG.UI, M = SG.Slot;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var FV = { "魏": "wei", "蜀": "shu", "吳": "wu", "群雄": "qun", "黃巾": "yt" };
  var FC = { wei: "#6aaeed", shu: "#4ec87a", wu: "#e05858", qun: "#b07cd8", yt: "#c8a830" };
  function S() { return SG._state; }
  M.cur = function () { return G; };   // 測試用
  var IMG = {};
  function img(src) { if (!IMG[src]) { var i = new Image(); i.src = src; IMG[src] = i; } return IMG[src]; }

  // ===== 大廳 =====
  UI.r_slot = function () {
    var st = S(), d = M.data(st), ro = M.roster(st);
    var ups = M.UPS.map(function (u) {
      var lv = d.up[u.id] || 0, max = lv >= u.max, cost = M.upCost(u, lv);
      return '<div class="sl-up"><div class="grow"><b>' + u.name + '</b> <small>Lv ' + lv + '/' + u.max + '</small><div class="dim">' + u.desc + '</div></div>' +
        (max ? '<span class="tag">已滿</span>' : '<button class="sm' + (d.pts >= cost ? ' gold' : '') + '" data-up="' + u.id + '"' + (d.pts >= cost ? '' : ' disabled') + '>' + cost + ' 軍功</button>') + '</div>';
    }).join("");
    $("#s-slot").innerHTML = UI.strip("st-slot", "拉霸守城", "測試版・拉霸召喚武將，守住城門") +
      '<div class="paper sl-lobby">' +
      '<div class="sl-how"><b>玩法</b><p>下方 3×3 拉霸每轉一次，橫、直、斜任一條三格相同，就召喚那位武將到城門前守城；同一位再連到就升星（最高 5★）。「令」可以當任何武將。黃巾軍一波一波來，每 5 波有頭目，守滿 ' + M.WAVES + ' 波算勝利。城門被打破就結束，依守住的波數拿軍功，用來永久強化。</p></div>' +
      '<div class="sl-sec">拉霸上的武將 <small>（隊伍前 5 位，不同名）</small></div><div class="sl-ro">' +
      ro.map(function (c) { return '<div class="sl-roc"><span class="hd f-' + FV[c.fac] + '"><img src="img/' + c.art + '_head.webp" alt=""></span><b>' + c.gen + '</b><small>' + SG.TYPES[c.typ].name + '</small></div>'; }).join("") + '</div>' +
      '<div class="sl-sec">永久強化 <small>軍功 <b id="sl-pts">' + d.pts + '</b></small></div>' + ups +
      '<div class="sl-rec dim">最佳紀錄：第 ' + (d.best || 0) + ' 波・出征 ' + (d.runs || 0) + ' 次・勝利 ' + (d.wins || 0) + ' 次</div>' +
      '<button class="plaq sl-start" id="sl-start"><span>開始守城</span></button></div>';
    $$("[data-up]").forEach(function (b) {
      b.onclick = function () {
        var u = M.UPS.find(function (x) { return x.id === b.dataset.up; }), lv = d.up[u.id] || 0, cost = M.upCost(u, lv);
        if (d.pts < cost || lv >= u.max) return;
        d.pts -= cost; d.up[u.id] = lv + 1; SG.Store.save(st); UI.r_slot();
      };
    });
    $("#sl-start").onclick = function () { start(); };
  };

  // ===== 對戰 =====
  var G = null, raf = 0, last = 0, cv, cx, W = 0, H = 0, dpr = 1, anim = null, auto = false, shake = 0, banner = null;
  function start() {
    var st = S(), d = M.data(st);
    G = M.newGame(M.roster(st), d.up, st);
    UI.go("slotb");
    var cells = ""; for (var i = 0; i < 9; i++) cells += '<div class="sl-cell" data-i="' + i + '"></div>';
    $("#s-slotb").innerHTML =
      '<div class="sl-hud"><button class="sm plain" id="sl-quit">撤退</button><div class="sl-wv">第 <b id="sl-w">1</b>/' + M.WAVES + ' 波</div>' +
      '<div class="sl-gate"><span>城門</span><i><em id="sl-gbar"></em></i><b id="sl-g"></b></div></div>' +
      '<div class="sl-field"><canvas id="sl-cv"></canvas><div class="sl-ban" id="sl-ban"></div></div>' +
      '<div class="sl-mac"><div class="sl-grid">' + cells + '</div>' +
      '<div class="sl-ctl"><button class="sl-spin" id="sl-spin"><i id="sl-cd"></i><span>拉</span></button>' +
      '<label class="sl-auto"><input type="checkbox" id="sl-autob"' + (auto ? ' checked' : '') + '> 自動</label></div></div>';
    cv = $("#sl-cv"); cx = cv.getContext("2d"); fit();
    drawGrid(G.grid);
    $("#sl-spin").onclick = doSpin;
    $("#sl-autob").onchange = function () { auto = this.checked; };
    $("#sl-quit").onclick = function () {
      UI.modal('<h2>撤退</h2><p>現在撤退，依已守住的 ' + G.cleared + ' 波結算軍功。</p><div class="row end"><button onclick="SG.UI.close()">繼續守城</button><button class="pri" id="sl-q2">撤退</button></div>');
      $("#sl-q2").onclick = function () { UI.close(); G.over = true; G.won = false; G.quit = true; finish(); };
    };
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function fit() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(10, r.width); H = Math.max(10, r.height); cv.width = W * dpr; cv.height = H * dpr;
  }
  window.addEventListener("resize", function () { if (G && cv && document.body.dataset.scr === "slotb") fit(); });

  function symHtml(s) {
    if (s === M.WILD) return '<span class="sl-wild">令</span>';
    var c = G.roster[s].c; return '<img src="img/' + c.art + '_head.webp" alt="">';
  }
  function drawGrid(g) { $$(".sl-cell").forEach(function (el, i) { el.innerHTML = symHtml(g[i]); el.className = "sl-cell"; }); }

  function doSpin() {
    if (!G || anim || !M.canSpin(G)) return;
    var hits = M.spin(G), fin = G.grid.slice(), t0 = performance.now();
    if (SG.Audio) SG.Audio.sfx("flip", 1.3);
    anim = { t0: t0, fin: fin, hits: hits, stop: [380, 520, 660] };
  }
  function stepAnim(now) {
    if (!anim) return;
    var el = $$(".sl-cell"), dt = now - anim.t0, done = 0;
    for (var i = 0; i < 9; i++) {
      var col = i % 3;
      if (dt < anim.stop[col]) { if (Math.random() < 0.5) el[i].innerHTML = symHtml(Math.random() < M.WILD_P ? M.WILD : Math.floor(Math.random() * G.roster.length)); el[i].classList.add("roll"); }
      else { if (el[i].classList.contains("roll")) { el[i].classList.remove("roll"); el[i].innerHTML = symHtml(anim.fin[i]); } done++; }
    }
    if (done === 9) {
      var hits = anim.hits; anim = null;
      if (hits.length) {
        hits.forEach(function (h) { h.ln.forEach(function (i) { el[i].classList.add("hit"); }); });
        var names = {}; hits.forEach(function (h) { names[G.roster[h.ri].c.gen] = (names[G.roster[h.ri].c.gen] || 0) + 1; });
        showBan(Object.keys(names).map(function (n) { return n + (names[n] > 1 ? "×" + names[n] : ""); }).join("、") + "　出陣！");
        if (SG.Audio) SG.Audio.sfx(hits.length > 1 ? "sr" : "burst_n");
        M.applyHits(G, hits);
      }
    }
  }
  function showBan(t) { var b = $("#sl-ban"); if (!b) return; b.textContent = t; b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); }

  function loop(now) {
    if (!G || document.body.dataset.scr !== "slotb") return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$("#modal").classList.contains("show")) {
      var wv = G.wave;
      M.step(G, dt);
      if (G.wave !== wv) showBan(M.BOSS[G.wave] ? "第 " + G.wave + " 波・頭目 " + M.BOSS[G.wave] + "！" : "第 " + G.wave + " 波");
      stepAnim(now);
      if (auto && !anim && M.canSpin(G)) doSpin();
    }
    hud(); draw();
    if (G.over && !anim) { finish(); return; }
    raf = requestAnimationFrame(loop);
  }
  function hud() {
    $("#sl-w").textContent = G.wave;
    $("#sl-g").textContent = Math.ceil(G.gate);
    $("#sl-gbar").style.width = (100 * G.gate / G.gateMax) + "%";
    var cd = $("#sl-cd"); if (cd) cd.style.height = (100 * G.spinCd / M.SPIN_CD) + "%";
    var sp = $("#sl-spin"); if (sp) sp.classList.toggle("ready", M.canSpin(G) && !anim);
  }

  // ===== 畫面 =====
  function draw() {
    var c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * 6 * shake; sy = (Math.random() - 0.5) * 6 * shake; shake = Math.max(0, shake - 0.08); }
    c.save(); c.translate(sx, sy);
    // 地面
    var gr = img("img/bf/ground_dirt.webp");
    if (gr.complete && gr.naturalWidth) { var ts = 160; for (var y = 0; y < H; y += ts) for (var x = 0; x < W; x += ts) c.drawImage(gr, x, y, ts, ts); }
    else { c.fillStyle = "#5a4a36"; c.fillRect(0, 0, W, H); }
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(7,6,10,.72)"); g.addColorStop(0.5, "rgba(7,6,10,.5)"); g.addColorStop(1, "rgba(7,6,10,.4)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 路線
    c.strokeStyle = "rgba(240,232,216,.06)"; c.lineWidth = 1;
    for (var k = 1; k < M.COLS; k++) { c.beginPath(); c.moveTo(W * k / M.COLS, 0); c.lineTo(W * k / M.COLS, H * M.DEF); c.stroke(); }
    // 城牆＋城門
    var wy = H * (M.GATE - 0.02);
    c.fillStyle = "#2a211a"; c.fillRect(0, wy, W, H - wy);
    c.fillStyle = "#3b2f24"; for (var b = 0; b < W; b += 22) c.fillRect(b, wy - 8, 14, 10);
    var gt = img(G.gate > G.gateMax * 0.35 ? "img/gate.webp" : "img/gate_broken.webp");
    if (gt.complete && gt.naturalWidth) { var gw = Math.min(W * 0.34, (H - wy + 30) * 752 / 684 * 1.0), gh = gw * 684 / 752; c.drawImage(gt, W / 2 - gw / 2, H - gh, gw, gh); }
    // 敵人
    G.enemies.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (e) { drawEnemy(c, e); });
    // 武將
    G.units.forEach(function (u) { drawUnit(c, u); });
    // 特效
    drawFx(c);
    c.restore();
  }
  function bar(c, x, y, w, p, col) {
    c.fillStyle = "rgba(0,0,0,.65)"; c.fillRect(x - w / 2, y, w, 5);
    c.fillStyle = col; c.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, p), 3);
  }
  function headToken(c, art, x, y, r, ring) {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = "#1c1512"; c.fill(); c.clip();
    var im = img("img/" + art + "_head.webp"); if (im.complete && im.naturalWidth) c.drawImage(im, x - r, y - r, r * 2, r * 2);
    c.restore();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = 3; c.strokeStyle = ring; c.stroke();
    c.beginPath(); c.arc(x, y, r + 3, 0, Math.PI * 2); c.lineWidth = 1; c.strokeStyle = "#d4a853"; c.stroke();
  }
  function drawEnemy(c, e) {
    var x = e.x * W, y = e.y * H;
    if (e.boss) {
      var r = Math.min(W, H) * 0.09;
      if (e.art) headToken(c, e.art, x, y, r, "#c0392b");
      c.font = "700 13px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("頭目・" + e.gen, x, y - r - 12);
      bar(c, x, y - r - 9, r * 2.2, e.hp / e.max, "#e05858");
      return;
    }
    var im = img("img/bf/" + e.img + ".webp"), h = H * 0.11, w = im.naturalWidth ? h * im.naturalWidth / im.naturalHeight : h * 0.5;
    if (im.complete && im.naturalWidth) c.drawImage(im, x - w / 2, y - h * 0.85, w, h);
    bar(c, x, y - h * 0.9, Math.max(26, w * 0.9), e.hp / e.max, "#e05858");
  }
  function drawUnit(c, u) {
    var x = (u.col + 0.5) / M.COLS * W, y = M.DEF * H, r = Math.min(W / M.COLS * 0.36, H * 0.07);
    headToken(c, u.c.art, x, y, r, FC[FV[u.c.fac]] || "#d4a853");
    bar(c, x, y - r - 10, r * 2, u.hp / u.max, "#4ec87a");
    c.font = "700 11px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("★".repeat(u.star), x, y + r + 13);
  }
  function drawFx(c) {
    var t = G.t;
    G.fx = G.fx.filter(function (f) { return t - f.t < 0.8; });
    G.fx.forEach(function (f) {
      var a = 1 - (t - f.t) / 0.8;
      if (f.kind === "dmg") {
        c.globalAlpha = a; c.font = (f.crit ? "800 16px" : "700 12px") + " ui-monospace, monospace"; c.textAlign = "center";
        c.fillStyle = f.crit ? "#ffd36b" : "#f0e8d8"; c.fillText(f.v >= 10000 ? (f.v / 1000).toFixed(1) + "k" : f.v, f.x * W, f.y * H - 40 - (t - f.t) * 40); c.globalAlpha = 1;
      } else if (f.kind === "shot" && t - f.t < 0.18) {
        c.strokeStyle = f.foe ? "rgba(224,88,88,.9)" : (f.typ === "法" ? "rgba(176,124,216,.95)" : "rgba(236,211,145,.95)"); c.lineWidth = f.typ === "法" ? 3 : 2;
        var k = (t - f.t) / 0.18; c.beginPath(); c.moveTo(f.x0 * W, f.y0 * H); c.lineTo((f.x0 + (f.x1 - f.x0) * k) * W, (f.y0 + (f.y1 - f.y0) * k) * H); c.stroke();
      } else if (f.kind === "slash" && t - f.t < 0.2) {
        c.strokeStyle = "rgba(255,240,200," + (1 - (t - f.t) / 0.2) + ")"; c.lineWidth = 3; c.beginPath(); c.arc(f.x1 * W, f.y1 * H - 20, 18, -2.4, -0.6); c.stroke();
      } else if (f.kind === "up" || f.kind === "in") {
        var x = (f.col + 0.5) / M.COLS * W, y = M.DEF * H;
        c.globalAlpha = a; c.strokeStyle = "#ecd391"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 20 + (1 - a) * 40, 0, Math.PI * 2); c.stroke();
        c.font = "700 14px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText(f.kind === "up" ? "升星 " + f.star + "★" : "出陣", x, y - 52 - (1 - a) * 16); c.globalAlpha = 1;
      } else if (f.kind === "heal") {
        c.globalAlpha = a * 0.5; c.fillStyle = "#4ec87a"; c.fillRect(0, M.DEF * H - 50, W, 100); c.globalAlpha = 1;
      } else if (f.kind === "gate" && t - f.t < 0.05) { shake = Math.min(1, shake + 0.3); }
    });
  }

  function finish() {
    cancelAnimationFrame(raf);
    var st = S(), d = M.data(st), pts = M.reward(G);
    d.pts += pts; d.runs = (d.runs || 0) + 1; if (G.won) d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, G.cleared);
    SG.Store.save(st);
    var g = G; G = null;
    UI.modal('<h2>' + (g.won ? '守城成功！' : g.quit ? '撤退' : '城門失守') + '</h2>' +
      '<p>守住 <b>' + g.cleared + '</b> 波・召喚 ' + g.summons + ' 次</p><p>軍功 <b class="r">+' + pts + '</b>（現有 ' + d.pts + '）</p>' +
      '<div class="row end"><button id="sl-back">返回大廳</button><button class="pri" id="sl-again">再來一局</button></div>');
    UI.back = function () { $("#modal").classList.remove("show"); UI.go("slot"); };
    $("#sl-back").onclick = function () { UI.close(); };
    $("#sl-again").onclick = function () { UI.back = null; UI.close(); start(); };
  }
})(window.SG);
