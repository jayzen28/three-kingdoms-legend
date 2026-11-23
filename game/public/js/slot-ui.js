/* 拉霸守城（測試版 2）：大廳（#s-slot）與對戰畫面（#s-slotb） */
(function (SG) {
  var UI = SG.UI, M = SG.Slot;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var FV = { "魏": "wei", "蜀": "shu", "吳": "wu", "群雄": "qun", "黃巾": "yt" };
  var FC = { wei: "#6aaeed", shu: "#4ec87a", wu: "#e05858", qun: "#b07cd8", yt: "#c8a830" };
  var SYMC = { "火": "#e8742c", "雷": "#8f7bff", "風": "#4ec87a", "石": "#9a8a74", "武": "#d4a853", "令": "#c0392b" };
  var SYMD = { "火": "弓兵射火箭", "雷": "法師落雷", "風": "全軍攻速", "石": "槍兵落石", "令": "萬用・三令請名將" };
  function S() { return SG._state; }
  var IMG = {};
  function img(src) { if (!IMG[src]) { var i = new Image(); i.src = src; IMG[src] = i; } return IMG[src]; }
  var G = null;
  M.cur = function () { return G; };   // 測試用

  // ===== 大廳：選出征名單 =====
  var pick = null;
  UI.r_slot = function () {
    var st = S(), d = M.data(st), own = M.owned(st);
    if (!pick) pick = M.defaultList(st).map(function (c) { return c.gen; });
    var cnt = {}; pick.forEach(function (n) { var c = SG.GEN[n]; if (c) cnt[c.typ] = (cnt[c.typ] || 0) + 1; });
    var tips = [["弓", "火"], ["法", "雷"], ["槍", "石"]].map(function (x) { return '<span class="' + (cnt[x[0]] ? "" : "off") + '">「' + x[1] + '」要有' + SG.TYPES[x[0]].name + '</span>'; }).join("");
    $("#s-slot").innerHTML = UI.strip("st-slot", "拉霸守城", "測試版・佈陣守城，拉霸用計") +
      '<div class="paper sl-lobby">' +
      '<div class="sl-how"><b>玩法</b><p>黃巾軍分 ' + M.WAVES.length + ' 大波、從五個入口殺來，目標是城門；城門被打到三次就失守。開戰前先把 ' + M.START_DEPLOY + ' 位武將放到營寨（金框「要衝」每條路都打得到）。出征的 ' + M.ROSTER_MAX + ' 位武將會出現在拉霸上，連成一線就上陣，已上陣的就升星。殺敵得軍糧，拉一次 ' + M.SPIN_COST + ' 軍糧。</p>' +
      '<div class="sl-syms">' + M.SYM.map(function (s) { return '<span><i style="background:' + SYMC[s] + '">' + s + '</i>' + SYMD[s] + '</span>'; }).join("") + '<span><i style="background:#8a96aa">將</i>武將頭像：上陣／升星</span></div></div>' +
      '<div class="sl-sec">出征名單 <small>' + pick.length + ' / ' + M.ROSTER_MAX + '・點武將加入或移出</small></div>' +
      '<div class="sl-tips">' + tips + '</div>' +
      '<div class="sl-own">' + own.map(function (c) {
        var i = pick.indexOf(c.gen), b = SG.best(st, c.id);
        return '<button class="sl-oc' + (i >= 0 ? ' on' : '') + '" data-g="' + c.gen + '"><span class="hd" style="--fc:' + FC[FV[c.fac]] + '"><img src="img/' + c.art + '_head.webp" alt="">' + (i >= 0 ? '<em>' + (i + 1) + '</em>' : '') + '</span><b>' + c.gen + '</b><small>' + SG.TYPES[c.typ].name + (b ? '・' + b.rar : '') + '</small></button>';
      }).join("") + '</div>' +
      '<div class="sl-rec dim">最佳紀錄：第 ' + (d.best || 0) + ' 波・出征 ' + (d.runs || 0) + ' 次・勝利 ' + (d.wins || 0) + ' 次</div>' +
      '<button class="plaq sl-start" id="sl-start"' + (pick.length ? '' : ' disabled') + '><span>出征</span></button></div>';
    $$(".sl-oc").forEach(function (b) {
      b.onclick = function () {
        var n = b.dataset.g, i = pick.indexOf(n);
        if (i >= 0) pick.splice(i, 1); else if (pick.length < M.ROSTER_MAX) pick.push(n); else return;
        UI.r_slot();
      };
    });
    $("#sl-start").onclick = function () {
      if (!pick.length) return;
      d.list = pick.map(function (n) { return SG.GEN[n].id; }); SG.Store.save(st);
      start(pick.map(function (n) { return SG.GEN[n]; }));
    };
  };

  // ===== 對戰 =====
  var raf = 0, last = 0, cv, cx, W = 0, H = 0, dpr = 1, view = { s: 1, ox: 0, oy: 0 }, anim = null, auto = false, sel = null, shake = 0, list0 = null, lastFx = 0;
  function start(list) {
    list0 = list;
    G = M.newGame(list, S());
    sel = null; anim = null; lastFx = 0;
    UI.go("slotb");
    var cells = ""; for (var i = 0; i < 9; i++) cells += '<div class="sl-cell" data-i="' + i + '"></div>';
    $("#s-slotb").innerHTML =
      '<div class="sl-hud"><button class="sm plain" id="sl-quit">撤退</button><div class="sl-wv">第 <b id="sl-w">0</b>/' + M.WAVES.length + ' 大波</div>' +
      '<div class="sl-lives" id="sl-lives"></div><div class="sl-food">糧 <b id="sl-food"></b></div></div>' +
      '<div class="sl-field"><canvas id="sl-cv"></canvas><div class="sl-ban" id="sl-ban"></div><div class="sl-buff" id="sl-buff"></div><div class="sl-tip" id="sl-tip"></div></div>' +
      '<div class="sl-bot"><div class="sl-res" id="sl-res"></div>' +
      '<div class="sl-mac"><div class="sl-grid">' + cells + '</div>' +
      '<div class="sl-ctl"><button class="sl-spin" id="sl-spin"><span>開戰</span><small id="sl-cost"></small></button>' +
      '<div class="sl-row2"><button class="sm" id="sl-rep">修城門 ' + M.REPAIR_COST + '</button><label class="sl-auto"><input type="checkbox" id="sl-autob"' + (auto ? ' checked' : '') + '> 自動</label></div></div></div></div>';
    cv = $("#sl-cv"); cx = cv.getContext("2d"); fit();
    drawGrid(G.grid); renderRes(); tip("佈陣：點下方武將，再點地圖上的營寨（可先放 " + M.START_DEPLOY + " 位；金框「要衝」每條路都打得到），然後按「開戰」");
    $("#sl-spin").onclick = function () { if (G.phase === "deploy") { if (!M.startBattle(G)) tip("至少要放一位武將"); else { tip(""); renderRes(); } } else doSpin(); };
    $("#sl-autob").onchange = function () { auto = this.checked; };
    $("#sl-rep").onclick = function () { if (!M.repair(G)) tip(G.lives >= M.LIVES ? "城門完好" : "軍糧不足"); };
    $("#sl-quit").onclick = function () {
      UI.modal('<h2>撤退</h2><p>現在撤退，這局就結束。</p><div class="row end"><button onclick="SG.UI.close()">繼續守城</button><button class="pri" id="sl-q2">撤退</button></div>');
      $("#sl-q2").onclick = function () { UI.close(); G.over = true; G.quit = true; finish(); };
    };
    cv.addEventListener("click", onTap);
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function fit() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(10, r.width); H = Math.max(10, r.height); cv.width = W * dpr; cv.height = H * dpr;
    view.s = Math.min(W / M.W, H / M.H); view.ox = (W - M.W * view.s) / 2; view.oy = (H - M.H * view.s) / 2;
  }
  window.addEventListener("resize", function () { if (G && cv && document.body.dataset.scr === "slotb") fit(); });
  function tip(t) { var e = $("#sl-tip"); if (e) { e.textContent = t; e.style.display = t ? "" : "none"; } }

  // 下方武將列：待命（可佈陣／已增援）與尚未增援
  function renderRes() {
    var box = $("#sl-res"); if (!box || !G) return;
    var h = G.reserve.map(function (r, i) {
      var ok = G.phase === "deploy" ? G.deployLeft > 0 : r.ready;
      return '<button class="sl-rc' + (ok ? ' ok' : '') + (sel && sel.res === i ? ' sel' : '') + (r.guest ? ' guest' : '') + '" data-r="' + i + '"><img src="img/' + r.c.art + '_head.webp" alt="">' + (r.notOwn ? '<em>未擁有</em>' : '') + '<small>' + (ok ? SG.TYPES[r.c.typ].name + (r.star > 1 ? r.star + '★' : '') : '待拉霸') + '</small></button>';
    }).join("");
    box.innerHTML = h || '<span class="dim">名單上的武將都已上陣</span>';
    $$(".sl-rc", box).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.r, r = G.reserve[i], ok = G.phase === "deploy" ? G.deployLeft > 0 : r.ready;
        if (!ok) { tip(G.phase === "deploy" ? "開局只能先放 " + M.START_DEPLOY + " 位" : "拉霸連出" + r.c.gen + "才會上陣"); return; }
        sel = sel && sel.res === i ? null : { res: i }; renderRes(); tip(sel ? "點地圖上的空營寨放下" + r.c.gen : "");
      };
    });
  }
  function onTap(ev) {
    if (!G || G.over) return;
    var r = cv.getBoundingClientRect(), wx = (ev.clientX - r.left - view.ox) / view.s, wy = (ev.clientY - r.top - view.oy) / view.s;
    var si = -1, bd = 30;
    M.SLOTS.forEach(function (p, i) { var d = Math.hypot(p[0] - wx, p[1] - wy); if (d < bd) { bd = d; si = i; } });
    if (si < 0) { sel = null; renderRes(); tip(""); return; }
    var here = G.gens.find(function (g) { return g.slot === si; });
    if (sel && sel.res !== undefined) {
      if (here) { tip("這個營寨已經有人"); return; }
      if (M.place(G, sel.res, si)) { sel = null; renderRes(); tip(G.phase === "deploy" ? (G.deployLeft ? "還可以再放 " + G.deployLeft + " 位" : "佈陣完成，按「開戰」") : ""); }
      return;
    }
    if (sel && sel.gen) {
      if (here && here.id === sel.gen) { sel = null; tip(""); return; }
      if (!here) { M.move(G, sel.gen, si); sel = null; tip(""); return; }
    }
    if (here) { sel = { gen: here.id }; tip(here.c.gen + "：點空營寨換位置"); }
  }

  function symHtml(s) {
    if (s >= M.GEN0) { var c = G.list[s - M.GEN0]; return '<span class="sl-sym gen"><img src="img/' + c.art + '_head.webp" alt=""></span>'; }
    var n = M.SYM[s]; return '<span class="sl-sym" style="--sc:' + SYMC[n] + '">' + n + '</span>';
  }
  function drawGrid(g) { $$(".sl-cell").forEach(function (el, i) { el.innerHTML = symHtml(g[i]); el.className = "sl-cell"; }); }

  function doSpin() {
    if (!G || anim) return;
    if (!M.canSpin(G)) { if (G.phase === "fight") tip("軍糧不足，殺敵可以得到軍糧"); return; }
    var hits = M.spin(G);
    if (SG.Audio) SG.Audio.sfx("flip", 1.3);
    anim = { t0: performance.now(), fin: G.grid.slice(), hits: hits, stop: [360, 500, 640] };
  }
  function stepAnim(now) {
    if (!anim) return;
    var el = $$(".sl-cell"), dt = now - anim.t0, done = 0;
    for (var i = 0; i < 9; i++) {
      if (dt < anim.stop[i % 3]) { if (Math.random() < 0.5) el[i].innerHTML = symHtml(Math.floor(Math.random() * G.nsym)); el[i].classList.add("roll"); }
      else { if (el[i].classList.contains("roll")) { el[i].classList.remove("roll"); el[i].innerHTML = symHtml(anim.fin[i]); } done++; }
    }
    if (done < 9) return;
    var hits = anim.hits; anim = null;
    if (!hits.length) return;
    hits.forEach(function (h) { h.ln.forEach(function (i) { el[i].classList.add("hit"); }); });
    var res = M.applyHits(G, hits), msg = [];
    res.forEach(function (r) {
      if (r.jackpot) msg.push(r.guests && r.guests.length ? "三令齊發！" + r.guests.join("、") + " 前來助陣" : "三令齊發！");
      else if (r.none) msg.push("「" + r.sym + "」" + r.none);
      else if (r.sym === "火") msg.push("火箭！");
      else if (r.sym === "雷") msg.push("落雷！");
      else if (r.sym === "石") msg.push("落石！");
      else if (r.sym === "風") msg.push("疾風！攻速 ×" + M.WIND);
      else if (r.up) msg.push(r.up + " 升到 " + r.star + "★");
      else if (r.ready) msg.push(r.ready + (r.star ? " 上陣時 " + r.star + "★" : " 可以上陣"));
    });
    showBan(msg.join("　"));
    if (SG.Audio) SG.Audio.sfx(hits.length > 1 ? "sr" : "burst_n");
    renderRes();
  }
  function showBan(t, boss) { var b = $("#sl-ban"); if (!b) return; b.textContent = t; b.className = "sl-ban" + (boss ? " boss" : ""); void b.offsetWidth; b.classList.add("on"); }

  function loop(now) {
    if (!G || document.body.dataset.scr !== "slotb") return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$("#modal").classList.contains("show")) {
      M.step(G, dt);
      stepAnim(now);
      if (auto && !anim && G.phase === "fight" && M.canSpin(G)) doSpin();
      if (G.phase === "tactic" && !G.offerShown) showTactics();
    }
    if (lastFx > G.fx.length) lastFx = 0;
    for (; lastFx < G.fx.length; lastFx++) {
      var f = G.fx[lastFx];
      if (f.seen) continue; f.seen = 1;
      if (f.kind === "wave") showBan("第 " + f.wave + " 大波" + (M.WAVES[f.wave - 1].some(function (e) { return e[2] === "boss"; }) ? "・張角親征！" : ""));
      else if (f.kind === "boss") { showBan("頭目 " + f.name + " 出現！", true); if (SG.Audio) SG.Audio.sfx("shake"); }
      else if (f.kind === "gate") { shake = 1; if (SG.Audio) SG.Audio.sfx("shake"); }
      else if (f.kind === "ready" || f.kind === "jackpot") renderRes();
    }
    hud(); draw();
    if (G.over && !anim) { finish(); return; }
    raf = requestAnimationFrame(loop);
  }
  function hud() {
    $("#sl-w").textContent = G.wave;
    var le = $("#sl-lives");
    if (le.dataset.v !== String(G.lives)) { var lv = ""; for (var i = 0; i < M.LIVES; i++) lv += '<i class="' + (i < G.lives ? "on" : "") + '"></i>'; le.innerHTML = lv; le.dataset.v = G.lives; }
    $("#sl-food").textContent = G.food;
    var sp = $("#sl-spin");
    if (G.phase === "deploy") { sp.querySelector("span").textContent = "開戰"; $("#sl-cost").textContent = ""; sp.classList.toggle("ready", G.gens.length > 0); }
    else { sp.querySelector("span").textContent = "拉"; $("#sl-cost").textContent = M.spinCost(G) + " 糧"; sp.classList.toggle("ready", M.canSpin(G) && !anim); sp.classList.toggle("poor", !M.canSpin(G)); }
    $("#sl-rep").disabled = G.lives >= M.LIVES || G.food < M.REPAIR_COST;
    var bf = []; if (G.fireT > 0) bf.push('<span class="f">火箭 ' + Math.ceil(G.fireT) + '</span>'); if (G.windT > 0) bf.push('<span class="w">疾風 ' + Math.ceil(G.windT) + '</span>');
    $("#sl-buff").innerHTML = bf.join("");
  }
  function showTactics() {
    G.offerShown = true;
    UI.modal('<h2>第 ' + G.wave + ' 大波守住了！</h2><p class="dim">選一張軍略（軍糧 +30）</p><div class="sl-tacs">' +
      G.offer.map(function (t) { return '<button class="sl-tac" data-t="' + t.id + '"><b>' + t.name + '</b><span>' + t.desc + '</span></button>'; }).join("") + '</div>');
    UI.back = function () { };   // 一定要選
    $$(".sl-tac").forEach(function (b) { b.onclick = function () { UI.back = null; UI.close(); G.offerShown = false; M.chooseTactic(G, b.dataset.t); renderRes(); }; });
  }

  // ===== 畫面 =====
  function W2(x) { return view.ox + x * view.s; } function H2(y) { return view.oy + y * view.s; }
  function draw() {
    var c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#1a2416"; c.fillRect(0, 0, W, H);
    var sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - 0.5) * 8 * shake; sy = (Math.random() - 0.5) * 8 * shake; shake = Math.max(0, shake - 0.06); }
    c.save(); c.translate(sx, sy);
    var s = view.s;
    var gr = img("img/bf/ground_grass.webp");
    c.save();
    if (gr.complete && gr.naturalWidth) { var ts = 150 * s; for (var y = H2(0) - Math.ceil(H2(0) / ts) * ts; y < H; y += ts) for (var x = W2(0) - Math.ceil(W2(0) / ts) * ts; x < W; x += ts) c.drawImage(gr, x, y, ts, ts); }
    c.fillStyle = "rgba(7,6,10,.35)"; c.fillRect(0, 0, W, H);
    var dirt = img("img/bf/ground_dirt.webp"), pat = dirt.complete && dirt.naturalWidth ? c.createPattern(dirt, "repeat") : "#7a6448";
    [30, 22].forEach(function (w, k) {
      c.strokeStyle = k ? pat : "rgba(40,28,18,.85)"; c.lineWidth = w * s; c.lineCap = "round"; c.lineJoin = "round";
      M.PATHS.forEach(function (p) { c.beginPath(); p.forEach(function (q, i) { if (i) c.lineTo(W2(q[0]), H2(q[1])); else c.moveTo(W2(q[0]), H2(q[1])); }); c.stroke(); });
    });
    [[20, 30], [380, 30], [20, 330], [380, 330], [130, 30], [270, 30], [30, 430], [370, 430], [105, 395]].forEach(function (t, i) {
      var tr = img("img/bf/obj_tree_" + (i % 4 + 1) + ".webp"); if (tr.complete && tr.naturalWidth) { var h = 46 * s, w = h * tr.naturalWidth / tr.naturalHeight; c.drawImage(tr, W2(t[0]) - w / 2, H2(t[1]) - h * 0.8, w, h); }
    });
    var fl = img("img/bf/flag_e.webp");
    M.PATHS.forEach(function (p, i) {
      var q = p[0], x = Math.min(M.W - 14, Math.max(14, q[0])), y = Math.min(M.H - 14, Math.max(14, q[1]));
      if (fl.complete && fl.naturalWidth) c.drawImage(fl, W2(x) - 14 * s, H2(y) - 16 * s, 28 * s, 28 * s);
      var soon = G.queue.some(function (e) { return e.gate === i && e.at - G.waveT < 3; });
      if (soon && G.phase === "fight") { c.strokeStyle = "rgba(224,88,88," + (0.5 + 0.5 * Math.sin(G.t * 8)) + ")"; c.lineWidth = 3; c.beginPath(); c.arc(W2(x), H2(y), 18 * s, 0, Math.PI * 2); c.stroke(); }
    });
    c.restore();
    c.fillStyle = "#2a211a"; c.fillRect(W2(0), H2(474), M.W * s, 26 * s);
    c.fillStyle = "#3b2f24"; for (var b = 0; b < M.W; b += 16) c.fillRect(W2(b), H2(468), 10 * s, 8 * s);
    var gt = img(G.lives >= 2 ? "img/gate.webp" : "img/gate_broken.webp");
    if (gt.complete && gt.naturalWidth) { var gw = 92 * s, gh = gw * 684 / 752; c.drawImage(gt, W2(200) - gw / 2, H2(500) - gh, gw, gh); }
    var rk = img("img/bf/obj_mtn_s.webp");
    G.rocks.forEach(function (k) {
      var w = 34 * s, h = rk.naturalWidth ? w * rk.naturalHeight / rk.naturalWidth : w;
      if (rk.complete && rk.naturalWidth) c.drawImage(rk, W2(k.x) - w / 2, H2(k.y) - h * 0.7, w, h); else { c.fillStyle = "#777"; c.beginPath(); c.arc(W2(k.x), H2(k.y), 14 * s, 0, 7); c.fill(); }
      bar(c, W2(k.x), H2(k.y) - h * 0.75, 30 * s, k.hp / k.max, "#c9b38a");
    });
    M.SLOTS.forEach(function (p, i) {
      var g = G.gens.find(function (x) { return x.slot === i; });
      if (!g) {
        var hint = sel && (sel.res !== undefined || sel.gen);
        c.fillStyle = hint ? "rgba(236,211,145,.28)" : "rgba(28,21,18,.55)"; c.strokeStyle = hint ? "#ecd391" : "rgba(212,168,83,.55)"; c.lineWidth = hint ? 2 : 1.2;
        c.beginPath(); c.arc(W2(p[0]), H2(p[1]), 15 * s, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      if (M.KEY.indexOf(i) >= 0) {
        c.strokeStyle = "#ecd391"; c.lineWidth = 2; c.beginPath(); c.arc(W2(p[0]), H2(p[1]), 19 * s, 0, Math.PI * 2); c.stroke();
        c.font = "700 " + Math.round(6 * s + 5) + "px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; if (!g) c.fillText("要衝", W2(p[0]), H2(p[1]) + 4);
      }
    });
    G.enemies.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (e) { drawEnemy(c, e); });
    G.gens.forEach(function (g) { drawGen(c, g); });
    drawFx(c);
    c.restore();
  }
  function bar(c, x, y, w, p, col) { c.fillStyle = "rgba(0,0,0,.7)"; c.fillRect(x - w / 2, y, w, 4); c.fillStyle = col; c.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, p)), 2); }
  function token(c, art, x, y, r, ring, dim) {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = "#1c1512"; c.fill(); c.clip();
    var im = img("img/" + art + "_head.webp"); if (im.complete && im.naturalWidth) { if (dim) c.globalAlpha = 0.35; c.drawImage(im, x - r, y - r, r * 2, r * 2); }
    c.restore();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = 2.5; c.strokeStyle = ring; c.stroke();
  }
  function drawEnemy(c, e) {
    var s = view.s, x = W2(e.x), y = H2(e.y);
    if (e.boss) {
      var r = 24 * s; token(c, e.art, x, y, r, "#c0392b");
      c.font = "700 " + Math.round(12 * s + 4) + "px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("頭目・" + e.name, x, y - r - 9);
      bar(c, x, y - r - 7, 56 * s, e.hp / e.max, "#e05858");
    } else {
      var im = img("img/bf/" + e.img + ".webp"), h = (e.k === "cav" ? 38 : 32) * s, w = im.naturalWidth ? h * im.naturalWidth / im.naturalHeight : h / 2;
      if (im.complete && im.naturalWidth) c.drawImage(im, x - w / 2, y - h * 0.85, w, h);
      bar(c, x, y - h * 0.9, Math.max(18 * s, w), e.hp / e.max, "#e05858");
    }
    if (e.burn > 0) { c.fillStyle = "rgba(232,116,44," + (0.5 + 0.4 * Math.sin(G.t * 12 + e.id)) + ")"; c.beginPath(); c.arc(x, y - 6 * s, 5 * s, 0, 7); c.fill(); }
    if (e.stun > 0) { c.font = "700 " + Math.round(10 * s + 3) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#c9c0ff"; c.fillText("暈", x, y - 26 * s); }
  }
  function drawGen(c, g) {
    var s = view.s, p = M.SLOTS[g.slot], x = W2(p[0]), y = H2(p[1]), r = 16 * s;
    var isSel = sel && sel.gen === g.id;
    if (isSel) { c.fillStyle = "rgba(236,211,145,.08)"; c.strokeStyle = "rgba(236,211,145,.6)"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, M.genRng(G, g) * s, 0, Math.PI * 2); c.fill(); c.stroke(); }
    if (G.windT > 0 && g.down <= 0) { c.strokeStyle = "rgba(78,200,122,.8)"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 5 * s, G.t * 8, G.t * 8 + 4); c.stroke(); }
    if (G.fireT > 0 && g.c.typ === "弓" && g.down <= 0) { c.strokeStyle = "rgba(232,116,44,.9)"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 3 * s, 0, Math.PI * 2); c.stroke(); }
    token(c, g.c.art, x, y, r, g.guest ? "#ecd391" : (FC[FV[g.c.fac]] || "#d4a853"), g.down > 0);
    if (g.down > 0) { c.font = "700 " + Math.round(9 * s + 4) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#f0e8d8"; c.fillText(Math.ceil(g.down), x, y + 4); }
    else bar(c, x, y - r - 6, r * 2, g.hp / g.max, "#4ec87a");
    c.font = "700 " + Math.round(6 * s + 4) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("★".repeat(g.star), x, y + r + 9 * s);
    c.font = "700 " + Math.round(6 * s + 4) + "px 'LXGW WenKai TC', serif"; c.fillStyle = "#f0e8d8"; c.fillText(g.c.typ, x + r * 0.9, y - r * 0.6);
  }
  function drawFx(c) {
    var t = G.t, s = view.s;
    G.fx.forEach(function (f) {
      var age = t - f.t, a = 1 - age;
      if (age > 1) return;
      if (f.kind === "dmg" && age < 0.7) {
        c.globalAlpha = Math.max(0, 1 - age / 0.7); c.font = (f.c === "crit" || f.c === "thunder" || f.c === "rock" ? "800 " + Math.round(9 * s + 6) : "700 " + Math.round(7 * s + 4)) + "px ui-monospace, monospace"; c.textAlign = "center";
        c.fillStyle = f.c === "fire" || f.c === "burn" ? "#ff9a4a" : f.c === "thunder" ? "#c9c0ff" : f.c === "crit" || f.c === "rock" ? "#ffd36b" : "#f0e8d8";
        c.fillText(f.v >= 10000 ? (f.v / 1000).toFixed(1) + "k" : f.v, W2(f.x), H2(f.y) - 22 * s - age * 30); c.globalAlpha = 1;
      } else if (f.kind === "shot" && age < 0.16) {
        var k = age / 0.16; c.strokeStyle = f.fire ? "rgba(255,140,50,.95)" : f.typ === "法" ? "rgba(176,124,216,.95)" : "rgba(236,211,145,.95)"; c.lineWidth = f.fire || f.typ === "法" ? 3 : 2;
        c.beginPath(); c.moveTo(W2(f.x0), H2(f.y0)); c.lineTo(W2(f.x0 + (f.x1 - f.x0) * k), H2(f.y0 + (f.y1 - f.y0) * k)); c.stroke();
      } else if (f.kind === "slash" && age < 0.2) {
        c.strokeStyle = "rgba(255,240,200," + (1 - age / 0.2) + ")"; c.lineWidth = 3; c.beginPath(); c.arc(W2(f.x1), H2(f.y1) - 10 * s, 12 * s, -2.4, -0.6); c.stroke();
      } else if (f.kind === "thunder" && age < 0.5) {
        c.globalAlpha = 1 - age / 0.5; c.fillStyle = "rgba(143,123,255,.18)"; c.beginPath(); c.arc(W2(f.x), H2(f.y), f.r * s, 0, 7); c.fill();
        c.strokeStyle = "#e6e0ff"; c.lineWidth = 3;
        for (var b = 0; b < 4; b++) { var ang = b * 1.57 + f.t, ex = f.x + Math.cos(ang) * f.r * 0.7, ey = f.y + Math.sin(ang) * f.r * 0.7; c.beginPath(); c.moveTo(W2(ex), H2(ey) - 60 * s); for (var z = 1; z <= 4; z++) c.lineTo(W2(ex + (z % 2 ? 8 : -8)), H2(ey) - 60 * s + z * 15 * s); c.stroke(); }
        c.globalAlpha = 1;
      } else if (f.kind === "rock" && age < 0.35) {
        var k2 = age / 0.35; c.fillStyle = "#8a7a64"; c.beginPath(); c.arc(W2(f.x), H2(f.y) - (1 - k2) * 80 * s, 10 * s, 0, 7); c.fill();
      } else if ((f.kind === "in" || f.kind === "up") && age < 0.8) {
        c.globalAlpha = a; c.strokeStyle = "#ecd391"; c.lineWidth = 3; c.beginPath(); c.arc(W2(f.x), H2(f.y), (16 + age * 40) * s, 0, 7); c.stroke();
        if (f.kind === "up") { c.font = "700 " + Math.round(8 * s + 6) + "px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("升星 " + f.star + "★", W2(f.x), H2(f.y) - 30 * s - age * 20); }
        c.globalAlpha = 1;
      } else if (f.kind === "bosshit" && age < 0.45) {
        c.globalAlpha = 1 - age / 0.45; c.strokeStyle = "#ff5a4a"; c.lineWidth = 5; c.beginPath(); c.arc(W2(f.x), H2(f.y), (12 + age * 70) * s, 0, 7); c.stroke(); c.globalAlpha = 1;
      } else if (f.kind === "die" && age < 0.4) {
        c.globalAlpha = 1 - age / 0.4; c.fillStyle = "#d4a853"; c.font = "700 " + Math.round(6 * s + 5) + "px sans-serif"; c.textAlign = "center"; c.fillText("+糧", W2(f.x), H2(f.y) - 36 * s - age * 30); c.globalAlpha = 1;
      }
    });
  }

  function finish() {
    cancelAnimationFrame(raf);
    var st = S(), d = M.data(st), cleared = G.won ? G.wave : G.wave - 1;
    if (!G.quit) { d.runs++; if (G.won) d.wins++; d.best = Math.max(d.best, Math.max(0, cleared)); SG.Store.save(st); }
    var g = G; G = null;
    UI.modal('<h2>' + (g.won ? '守城成功！' : g.quit ? '撤退' : '城門失守') + '</h2>' +
      '<p>守住 <b>' + Math.max(0, cleared) + '</b> / ' + M.WAVES.length + ' 大波・殺敵 ' + g.kills + '・拉霸 ' + g.spins + ' 次</p>' +
      '<div class="row end"><button id="sl-back">返回大廳</button><button class="pri" id="sl-again">再來一局</button></div>');
    UI.back = function () { $("#modal").classList.remove("show"); UI.go("slot"); };
    $("#sl-back").onclick = function () { UI.close(); };
    $("#sl-again").onclick = function () { UI.back = null; UI.close(); start(list0); };
  }
})(window.SG);
