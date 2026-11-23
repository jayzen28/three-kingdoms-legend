/* 拉霸守城：大廳（#s-slot）與對戰畫面（#s-slotb）；轉輪特效在 slot-fx.js */
(function (SG) {
  var UI = SG.UI, M = SG.Slot, F = SG.SlotFX, P = SG.Profile;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var FV = { "魏": "wei", "蜀": "shu", "吳": "wu", "群雄": "qun", "黃巾": "yt" };
  var FC = { wei: "#6aaeed", shu: "#4ec87a", wu: "#e05858", qun: "#b07cd8", yt: "#c8a830" };
  var SYMC = { "火": "#e8742c", "雷": "#8f7bff", "風": "#4ec87a", "石": "#9a8a74", "令": "#c0392b" };
  var SYMD = { "火": "弓兵射火箭", "雷": "法師落雷", "風": "全軍攻速", "石": "槍兵落石", "令": "萬用・三令請名將" };
  var SPL = { "火": "fire", "雷": "thunder", "風": "wind", "石": "rock" };
  var SYMF = { "火": "fire", "雷": "thunder", "風": "wind", "石": "rock", "令": "ling" };   // ✅ Jay 2026-11-23：符號改用圖片（Gemini 生成），每格都有雕龍金框
  function S() { return SG._state; }
  var IMG = {};
  function img(src) { if (!IMG[src]) { var i = new Image(); i.src = src; IMG[src] = i; } return IMG[src]; }
  var G = null;
  M.cur = function () { return G; };   // 測試用

  // ===== 大廳：關卡、出征名單（可篩選）、守城榜 =====
  // ✅ Jay 2026-11-23：選武將要有篩選器；出征按鈕放最上面，不用滑到底
  var pick = null, lbData = null, flt = { ff: "全部", ft: "全部" };
  UI.r_slot = function () {
    var st = S(), d = M.data(st), own = M.owned(st);
    if (!pick) pick = M.defaultList(st).map(function (c) { return c.gen; });
    var cnt = {}; pick.forEach(function (n) { var c = SG.GEN[n]; if (c) cnt[c.typ] = (cnt[c.typ] || 0) + 1; });
    var tips = [["弓", "火"], ["法", "雷"], ["槍", "石"]].map(function (x) { return '<span class="' + (cnt[x[0]] ? "" : "off") + '">「' + x[1] + '」要有' + SG.TYPES[x[0]].name + '</span>'; }).join("");
    var rk = function (c) { var b = SG.best(st, c.id); return b ? SG.RAR.indexOf(b.rar) * 10 + (b.star || 1) : -1; };
    var shown = own.filter(function (c) { return (flt.ff === "全部" || c.fac === flt.ff) && (flt.ft === "全部" || c.typ === flt.ft); }).sort(function (a, b) { return rk(b) - rk(a); });
    var chips = function (attr, cur, arr) { return arr.map(function (v) { return '<button class="chip' + (v === cur ? ' on' : '') + '" data-' + attr + '="' + v + '">' + v + '</button>'; }).join(""); };
    var slots = ""; for (var k = 0; k < M.ROSTER_MAX; k++) { var pc = pick[k] && SG.GEN[pick[k]]; slots += pc ? '<button class="sl-pk" data-g="' + pc.gen + '"><span class="hd" style="--fc:' + FC[FV[pc.fac]] + '"><img src="img/' + pc.art + '_head.webp" alt=""></span><b>' + pc.gen + '</b><small>' + SG.TYPES[pc.typ].name + '</small></button>' : '<span class="sl-pk empty"><span class="hd"></span><b>空位</b><small>&nbsp;</small></span>'; }
    $("#s-slot").innerHTML = UI.strip("st-slot", "拉霸守城", "測試版・一關一關守下去") +
      '<div class="paper sl-lobby">' +
      '<div class="sl-stage"><div><small>目前關卡</small><b>第 ' + d.stage + ' 關</b><small>最高紀錄：第 ' + (d.top || 0) + ' 關</small></div>' +
      '<button class="plaq sl-start" id="sl-start"' + (pick.length ? '' : ' disabled') + '><span>出征</span></button></div>' +
      '<div class="sl-sec">出征名單 <small>' + pick.length + ' / ' + M.ROSTER_MAX + '・點頭像移出</small></div>' +
      '<div class="sl-picks">' + slots + '</div><div class="sl-tips">' + tips + '</div>' +
      '<div class="filters sl-flt"><div><span>陣營</span>' + chips("ff", flt.ff, ["全部"].concat(SG.FACS)) + '</div><div><span>兵種</span>' + chips("ft", flt.ft, ["全部", "槍", "騎", "弓", "刺", "法"]) + '</div></div>' +
      '<div class="sl-own" id="sl-own">' + (shown.map(function (c) {
        var i = pick.indexOf(c.gen), b = SG.best(st, c.id);
        return '<button class="sl-oc' + (i >= 0 ? ' on' : '') + '" data-g="' + c.gen + '"><span class="hd" style="--fc:' + FC[FV[c.fac]] + '"><img loading="lazy" src="img/' + c.art + '_head.webp" alt="">' + (i >= 0 ? '<em>' + (i + 1) + '</em>' : '') + '</span><b>' + c.gen + '</b><small>' + SG.TYPES[c.typ].name + (b ? '・' + b.rar : '') + '</small></button>';
      }).join("") || '<div class="dim">沒有符合的武將</div>') + '</div>' +
      '<details class="sl-how"><summary>玩法說明</summary><p>黃巾軍分「敵軍先鋒」（張寶領軍）與「敵軍本陣」（張角親征），從五個入口殺向城門；有敵軍走到城門就算被打一次，三次就失守。守住就過關，下一關敵軍更強。開戰前先把 ' + M.START_DEPLOY + ' 位武將放到營寨（金框「要衝」每條路都打得到）。出征的 ' + M.ROSTER_MAX + ' 位武將會出現在拉霸上，連成一線就上陣，已上陣的就升星。殺敵得軍糧，拉一次 ' + M.SPIN_COST + ' 軍糧。</p>' +
      '<p>兵種：槍兵擋路、連出「石」在自己前面落石；弓兵連出「火」射火箭；法師連出「雷」落雷；騎兵打小兵傷害 ×' + M.CAV_MINION + '；刺客出手快一倍、先打敵將，打敵將傷害 ×' + M.SIN_BOSS + '。</p>' +
      '<p>每一關的地形都不一樣；一局大約 3 分鐘，地圖右下角的「×2」可以加速。</p>' +
      '<p>每一局必定有一位 UR／SSR 名將會在「三令齊發」時前來助陣（50% 再來第二位，1% 第三位），沒擁有的武將優先。</p><div class="sl-syms">' + M.SYM.map(function (s) { return '<span><img src="img/slot/sym_' + SYMF[s] + '.webp?v=2" alt="' + s + '">' + SYMD[s] + '</span>'; }).join("") + '<span><img src="img/slot/sym_frame.webp?v=2" alt="">武將頭像：上陣／升星</span></div></details>' +
      '<div class="sl-sec">守城榜 <small>前 20 名・' + P.esc(P.name()) + ' <button class="sm plain" id="sl-rename">改名</button></small></div><div id="sl-lb">' + P.boardHtml("slot", lbData) + '</div></div>';
    var keep = function (fn) { var box = $("#sl-own"), y = box ? box.scrollTop : 0; fn(); UI.r_slot(); var nb = $("#sl-own"); if (nb) nb.scrollTop = y; };
    $$(".sl-oc").forEach(function (b) {
      b.onclick = function () {
        var n = b.dataset.g, i = pick.indexOf(n);
        if (i < 0 && pick.length >= M.ROSTER_MAX) { UI.flash("名單已滿，先點上面的頭像移出一位"); return; }
        keep(function () { if (i >= 0) pick.splice(i, 1); else pick.push(n); });
      };
    });
    $$(".sl-pk[data-g]").forEach(function (b) { b.onclick = function () { keep(function () { pick.splice(pick.indexOf(b.dataset.g), 1); }); }; });
    $$(".sl-flt [data-ff]").forEach(function (b) { b.onclick = function () { flt.ff = b.dataset.ff; UI.r_slot(); }; });
    $$(".sl-flt [data-ft]").forEach(function (b) { b.onclick = function () { flt.ft = b.dataset.ft; UI.r_slot(); }; });
    $("#sl-start").onclick = function () {
      if (!pick.length) return;
      d.list = pick.map(function (n) { return SG.GEN[n].id; }); SG.Store.save(st);
      start(pick.map(function (n) { return SG.GEN[n]; }));
    };
    $("#sl-rename").onclick = function () {
      P.ask(function () { if (d.top) P.lb("slot", { stage: d.top }).then(function (x) { x.at = Date.now(); lbData = x; UI.r_slot(); }).catch(function () { UI.r_slot(); }); else UI.r_slot(); }, true);
    };
    if (!lbData || Date.now() - (lbData.at || 0) > 20000) P.lb("slot").then(function (x) { x.at = Date.now(); lbData = x; var b = $("#sl-lb"); if (b) b.innerHTML = P.boardHtml("slot", x); })
      .catch(function () { var b = $("#sl-lb"); if (b) b.innerHTML = P.boardHtml("slot", { err: 1 }); });
  };

  // ===== 對戰 =====
  var raf = 0, last = 0, cv, cx, W = 0, H = 0, dpr = 1, view = { s: 1, ox: 0, oy: 0 }, spinning = false, paused = false, auto = false, fast = false, sel = null, shake = 0, list0 = null, bg = null, tipT = "";
  var SV = "?v=2";   // 圖片版本（換圖時加一）
  function start(list) {
    list0 = list;
    var d = M.data(S());
    G = M.newGame(list, S(), null, d.stage);
    sel = null; spinning = false; paused = false; bg = null;
    UI.go("slotb");
    if (SG.Audio && SG.Audio.preloadSlot) SG.Audio.preloadSlot();
    $("#s-slotb").innerHTML =
      '<div class="sl-hud"><button class="sm plain" id="sl-quit">撤退</button><div class="sl-wv"><small>第 ' + G.stage + ' 關</small><span id="sl-w">佈陣中</span></div>' +
      '<div class="sl-lives" id="sl-lives"></div><div class="sl-food">糧 <b id="sl-food"></b></div></div>' +
      '<div class="sl-field" id="sl-field"><canvas id="sl-cv"></canvas><div class="sl-ban" id="sl-ban"></div><div class="sl-buff" id="sl-buff"></div>' +
      '<button class="sl-x2' + (fast ? ' on' : '') + '" id="sl-x2">×2</button></div>' +
      '<div class="sl-bot"><div class="sl-res" id="sl-res"></div>' +
      '<div class="sl-mac"><div class="sl-say" id="sl-tip"></div><div class="sl-adv"><img src="img/zhugeliang_card.webp" alt=""><b>軍師</b></div>' +
      '<div class="sl-grid" id="sl-grid"></div>' +
      '<div class="sl-ctl"><button class="sl-spin" id="sl-spin"><span>開戰</span><small id="sl-cost"></small></button>' +
      '<div class="sl-row2"><button class="sm" id="sl-rep">修城門 ' + M.REPAIR_COST + '</button><label class="sl-auto"><input type="checkbox" id="sl-autob"' + (auto ? ' checked' : '') + '> 自動</label></div></div></div></div>';
    cv = $("#sl-cv"); cx = cv.getContext("2d"); fit();
    F.preload(); F.build($("#sl-grid"), G.grid, symHtml);
    renderRes(); tip("主公，先佈陣：點上面的武將，再點地圖上的營寨。金框「要衝」每條路都打得到。放好就按「開戰」。");
    $("#sl-spin").onclick = function () {
      if (G.phase === "deploy") {
        if (!M.startBattle(G)) { tip("至少要放一位武將"); return; }
        tip(""); renderRes();
        if (SG.Audio && SG.Audio.play) SG.Audio.play(G.stage % 2 ? "slot1" : "slot2", true);   // ★ 單數關〈先鋒來襲〉、雙數關〈黃天當立〉
      } else doSpin();
    };
    $("#sl-autob").onchange = function () { auto = this.checked; };
    $("#sl-x2").onclick = function () { fast = !fast; this.classList.toggle("on", fast); };   // ✅ Jay 2026-11-23：一般速度是原本的一半，「×2」切回兩倍速
    $("#sl-rep").onclick = function () { if (!M.repair(G)) tip(G.lives >= M.LIVES ? "城門完好" : "軍糧不足"); };
    $("#sl-quit").onclick = function () {
      UI.modal('<h2>撤退</h2><p>現在撤退，這局就結束（不算過關）。</p><div class="row end"><button onclick="SG.UI.close()">繼續守城</button><button class="pri" id="sl-q2">撤退</button></div>');
      $("#sl-q2").onclick = function () { UI.close(); G.over = true; G.quit = true; finish(); };
    };
    cv.addEventListener("click", onTap);
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function fit() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(10, r.width); H = Math.max(10, r.height); cv.width = W * dpr; cv.height = H * dpr;
    view.s = Math.min(W / M.W, H / M.H); view.ox = (W - M.W * view.s) / 2; view.oy = (H - M.H * view.s) / 2; bg = null;
  }
  window.addEventListener("resize", function () { if (G && cv && document.body.dataset.scr === "slotb") fit(); });
  // ✅ Jay 2026-11-23：提示改由下方的軍師（諸葛亮）說，不蓋在地圖上
  var IDLE = { deploy: "佈陣完成就按「開戰」。", fight: "殺敵得軍糧，糧夠了就拉霸。連出武將頭像可以上陣或升星。", tactic: "先鋒已退，選一張軍略。" };
  function tip(t) { tipT = t || ""; var e = $("#sl-tip"); if (e) e.textContent = tipT || (G ? IDLE[G.phase] || "" : ""); }

  // 上方武將列：待命（可佈陣／已增援）與尚未增援
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
    var si = -1, bd = 46;   // ✅ Jay 2026-11-23：營寨的點擊範圍放大
    M.SLOTS.forEach(function (p, i) { var d = Math.hypot(p[0] - wx, p[1] - 6 - wy); if (d < bd) { bd = d; si = i; } });
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
    if (s >= M.GEN0) { var c = G.list[s - M.GEN0]; return '<span class="sl-sym gen"><img class="hd" src="img/' + c.art + '_head.webp" alt=""><img class="fr" src="img/slot/sym_frame.webp' + SV + '" alt=""></span>'; }
    var n = M.SYM[s]; return '<span class="sl-sym pic' + (s === M.WILD ? ' wild' : '') + '"><img src="img/slot/sym_' + SYMF[n] + '.webp' + SV + '" alt="' + n + '"></span>';
  }

  function doSpin() {
    if (!G || spinning || paused) return;
    if (!M.canSpin(G)) { if (G.phase === "fight") tip("軍糧不足，殺敵可以得到軍糧"); return; }
    var old = G.grid.slice(), hits = M.spin(G), g0 = G;
    spinning = true;
    F.spin($("#sl-grid"), old, G.grid, symHtml, function () { return Math.floor(Math.random() * g0.nsym); }, M.WILD).then(function () {
      spinning = false;
      if (G !== g0 || !hits.length) return;
      onHits(hits);
    });
  }
  function onHits(hits) {
    var res = M.applyHits(G, hits), msg = [], splash = [], cut = [], guests = [];
    res.forEach(function (r) {
      if (r.jackpot) { guests = guests.concat(r.guests || []); return; }
      if (r.none) { msg.push("「" + r.sym + "」" + r.none); return; }
      if (SPL[r.sym]) { if (splash.indexOf(SPL[r.sym]) < 0) splash.push(SPL[r.sym]); msg.push({ "火": "火箭！", "雷": "落雷！", "風": "疾風！攻速 ×" + M.WIND, "石": "落石！" }[r.sym]); return; }
      var c = SG.GEN[r.up || r.ready]; if (!c) return;
      cut.push({ art: c.art, name: c.gen, msg: r.up ? "升星 " + r.star + "★！" : r.star ? "待命・" + r.star + "★" : "出陣！" });
    });
    F.win($("#sl-grid"), $("#sl-field"), hits, { splash: splash, cut: cut });
    if (msg.length) showBan(msg.join("　"));
    renderRes();
    if (guests.length) {
      paused = true;
      var info = guests.map(function (n) { var r = G.reserve.find(function (x) { return x.c.gen === n; }), c = SG.GEN[n]; return { name: n, art: c.art, rar: r ? r.base.rar : "SSR", notOwn: r && r.notOwn }; });
      setTimeout(function () { F.jackpot(info).then(function () { paused = false; last = performance.now(); renderRes(); tip("名將已在上面待命：點她，再點空營寨上陣"); }); }, 500);
    }
  }
  function showBan(t, boss) { var b = $("#sl-ban"); if (!b) return; b.textContent = t; b.className = "sl-ban" + (boss ? " boss" : ""); void b.offsetWidth; b.classList.add("on"); }

  function loop(now) {
    if (!G || document.body.dataset.scr !== "slotb") return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$("#modal").classList.contains("show") && !paused) {
      M.step(G, dt * (fast ? 1 : M.SPEED));
      if (auto && !spinning && G.phase === "fight" && M.canSpin(G)) doSpin();
      if (G.phase === "tactic" && !G.offerShown) showTactics();
    }
    G.fx.forEach(function (f) {
      if (f.seen) return; f.seen = 1;
      if (f.kind === "wave") showBan(M.WAVE_NAMES[f.wave - 1] + "來襲！");
      else if (f.kind === "boss") { showBan((f.big ? "大將 " : "先鋒大將 ") + f.name + " 出陣！", true); F.snd.gong(); }
      else if (f.kind === "gate") { shake = 1; F.snd.gate(); }
      else if (f.kind === "ready") renderRes();
    });
    if (G.fx.length > 400) G.fx.splice(0, G.fx.length - 300);
    hud(); draw();
    if (G.over && !spinning && !paused) { finish(); return; }
    raf = requestAnimationFrame(loop);
  }
  function hud() {
    $("#sl-w").textContent = G.wave ? M.WAVE_NAMES[G.wave - 1] : "佈陣中";
    var le = $("#sl-lives");
    if (le.dataset.v !== String(G.lives)) { var lv = ""; for (var i = 0; i < M.LIVES; i++) lv += '<i class="' + (i < G.lives ? "on" : "") + '"></i>'; le.innerHTML = lv; le.dataset.v = G.lives; }
    $("#sl-food").textContent = G.food;
    var sp = $("#sl-spin");
    if (G.phase === "deploy") { sp.querySelector("span").textContent = "開戰"; $("#sl-cost").textContent = ""; sp.classList.toggle("ready", G.gens.length > 0); }
    else { sp.querySelector("span").textContent = "拉"; $("#sl-cost").textContent = M.spinCost(G) + " 糧"; sp.classList.toggle("ready", M.canSpin(G) && !spinning); sp.classList.toggle("poor", !M.canSpin(G)); }
    $("#sl-rep").disabled = G.lives >= M.LIVES || G.food < M.REPAIR_COST;
    var k = fast ? 1 : M.SPEED, bf = [];   // 倒數顯示實際秒數
    if (G.fireT > 0) bf.push('<span class="f">火箭 ' + Math.ceil(G.fireT / k) + '</span>'); if (G.windT > 0) bf.push('<span class="w">疾風 ' + Math.ceil(G.windT / k) + '</span>');
    var bfh = bf.join(""), be = $("#sl-buff"); if (be.dataset.h !== bfh) { be.innerHTML = bfh; be.dataset.h = bfh; }
    if (!tipT) { var te = $("#sl-tip"), idle = IDLE[G.phase] || ""; if (te.textContent !== idle) te.textContent = idle; }
  }
  function showTactics() {
    G.offerShown = true;
    UI.modal('<h2>擊退' + M.WAVE_NAMES[G.wave - 1] + '！</h2><p class="dim">選一張軍略（軍糧 +30）</p><div class="sl-tacs">' +
      G.offer.map(function (t) { return '<button class="sl-tac" data-t="' + t.id + '"><b>' + t.name + '</b><span>' + t.desc + '</span></button>'; }).join("") + '</div>');
    UI.back = function () { };   // 一定要選
    $$(".sl-tac").forEach(function (b) { b.onclick = function () { UI.back = null; UI.close(); G.offerShown = false; M.chooseTactic(G, b.dataset.t); renderRes(); last = performance.now(); }; });
  }

  // ===== 畫面 =====
  function W2(x) { return view.ox + x * view.s; } function H2(y) { return view.oy + y * view.s; }
  // 地圖底圖（地面、路、樹、城牆）先畫到一張離屏畫布，每一幀直接貼上
  // ✅ Jay 2026-11-23：地圖弄好看一點、每關配置不同 → 四種地貌輪流（草原／秋原／雪地／夜襲），路線與營寨每關重排
  var THEME = [
    { name: "草原", ground: "ground_grass", tint: "rgba(7,6,10,.30)", road: "#8a6e4a", edge: "#3a2a18" },
    { name: "秋原", ground: "ground_plain", tint: "rgba(120,60,10,.28)", road: "#9a7a52", edge: "#40280f" },
    { name: "雪地", ground: "ground_snow", tint: "rgba(20,40,70,.22)", road: "#8c8478", edge: "#3c3a3a" },
    { name: "夜襲", ground: "ground_grass", tint: "rgba(6,10,40,.58)", road: "#6e5e50", edge: "#1c1620" }
  ];
  function buildBg() {
    var map = M.MAP, th = THEME[map.theme], need = [img("img/bf/" + th.ground + ".webp"), img("img/bf/ground_dirt.webp"), img("img/bf/obj_tree_1.webp"), img("img/bf/obj_tree_2.webp"), img("img/bf/obj_tree_3.webp"), img("img/bf/obj_tree_4.webp"), img("img/bf/obj_mtn_s.webp"), img("img/bf/obj_mtn_s_snow.webp")];
    var ready = need.every(function (i) { return i.complete && i.naturalWidth; });
    var c0 = document.createElement("canvas"); c0.width = W * dpr; c0.height = H * dpr;
    var c = c0.getContext("2d"), s = view.s; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#1a2416"; c.fillRect(0, 0, W, H);
    var gr = need[0];
    if (gr.complete && gr.naturalWidth) { var ts = 150 * s; for (var y = H2(0) - Math.ceil(H2(0) / ts) * ts; y < H; y += ts) for (var x = W2(0) - Math.ceil(W2(0) / ts) * ts; x < W; x += ts) c.drawImage(gr, x, y, ts, ts); }
    c.fillStyle = th.tint; c.fillRect(0, 0, W, H);
    // 路：外緣陰影 → 邊 → 泥土貼圖 → 中間亮帶
    var dirt = need[1], pat = dirt.complete && dirt.naturalWidth ? c.createPattern(dirt, "repeat") : th.road;
    var stroke = function (w, st, alpha) {
      c.globalAlpha = alpha || 1; c.strokeStyle = st; c.lineWidth = w * s; c.lineCap = "round"; c.lineJoin = "round";
      map.paths.forEach(function (p) { c.beginPath(); p.forEach(function (q, i) { if (i) c.lineTo(W2(q[0]), H2(q[1])); else c.moveTo(W2(q[0]), H2(q[1])); }); c.stroke(); });
      c.globalAlpha = 1;
    };
    stroke(40, "rgba(0,0,0,.28)"); stroke(32, th.edge); stroke(25, pat); stroke(25, th.road, 0.35); stroke(9, "rgba(255,240,200,.10)");
    if (map.theme === 3) stroke(25, "rgba(10,14,50,.35)");
    // 樹與山石（由上到下畫，下面的蓋住上面的）
    map.deco.forEach(function (t) {
      var im = t.k === "rock" ? (map.theme === 2 ? need[7] : need[6]) : need[1 + (+t.k.slice(4))];
      if (!im.complete || !im.naturalWidth) return;
      var h = (t.k === "rock" ? 30 : 46) * t.s * s, w = h * im.naturalWidth / im.naturalHeight;
      c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(W2(t.x), H2(t.y) + 1, w * 0.36, h * 0.09, 0, 0, 7); c.fill();
      c.drawImage(im, W2(t.x) - w / 2, H2(t.y) - h * 0.92, w, h);
    });
    if (map.theme === 3) { c.fillStyle = "rgba(6,10,40,.28)"; c.fillRect(0, 0, W, H); }
    // 四周壓暗，中間比較亮
    var vg = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.45)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // 城牆
    c.fillStyle = "#2a211a"; c.fillRect(W2(0), H2(474), M.W * s, 26 * s + 40);
    c.fillStyle = "#3b2f24"; for (var b = 0; b < M.W; b += 16) c.fillRect(W2(b), H2(468), 10 * s, 8 * s);
    c.fillStyle = "rgba(255,225,160,.12)"; c.fillRect(W2(0), H2(474), M.W * s, 2);
    return { cv: c0, ready: ready };
  }
  function draw() {
    var c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!bg || !bg.ready) bg = buildBg();
    var sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - 0.5) * 8 * shake; sy = (Math.random() - 0.5) * 8 * shake; shake = Math.max(0, shake - 0.06); }
    c.fillStyle = "#07060a"; c.fillRect(0, 0, W, H);
    c.save(); c.translate(sx, sy);
    c.drawImage(bg.cv, 0, 0, W, H);
    var s = view.s;
    // 敵軍入口：黃巾營寨門（快出兵時閃紅光）
    var camp = img("img/slot/u_camp.webp");
    M.PATHS.forEach(function (p, i) {
      var q = p[0], top = q[1] < 0, x = Math.min(M.W - 20, Math.max(20, q[0])), y = top ? 22 : q[1] + 6;
      var soon = G.phase === "fight" && G.queue.some(function (e) { return e.gate === i && e.at - G.waveT < 1.5; });
      if (soon) { c.fillStyle = "rgba(224,60,50," + (0.25 + 0.2 * Math.sin(performance.now() / 110)) + ")"; c.beginPath(); c.arc(W2(x), H2(y) - 6 * s, 26 * s, 0, 7); c.fill(); }
      if (camp.complete && camp.naturalWidth) { var ch = 40 * s, cw = ch * camp.naturalWidth / camp.naturalHeight; c.drawImage(camp, W2(x) - cw / 2, H2(y) - ch * 0.78, cw, ch); }
    });
    var gt = img(G.lives >= 2 ? "img/gate.webp" : "img/gate_broken.webp");
    if (gt.complete && gt.naturalWidth) { var gw = 92 * s, gh = gw * 684 / 752; c.drawImage(gt, W2(200) - gw / 2, H2(500) - gh, gw, gh); }
    // 營寨（空的才畫底座）
    M.SLOTS.forEach(function (p, i) {
      var g = G.gens.find(function (x) { return x.slot === i; }), key = M.KEY.indexOf(i) >= 0;
      if (g) return;
      var hint = sel && (sel.res !== undefined || sel.gen), x = W2(p[0]), y = H2(p[1]), pulse = hint ? 1 + 0.08 * Math.sin(performance.now() / 160) : 1;
      c.fillStyle = hint ? "rgba(236,211,145,.30)" : "rgba(20,15,12,.55)"; c.strokeStyle = key || hint ? "#ecd391" : "rgba(212,168,83,.6)"; c.lineWidth = key || hint ? 2.4 : 1.4;
      c.beginPath(); c.ellipse(x, y, 19 * s * pulse, 12 * s * pulse, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (key) { c.beginPath(); c.ellipse(x, y, 24 * s, 15.5 * s, 0, 0, Math.PI * 2); c.lineWidth = 1.2; c.stroke(); c.font = "700 " + Math.round(6 * s + 5) + "px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("要衝", x, y + 4); }
      else if (hint) { c.font = "700 " + Math.round(10 * s + 4) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("＋", x, y + 5 * s); }
    });
    // 落石：同一點有兩顆就錯開疊著
    var rk = img("img/bf/obj_mtn_s.webp"), seenR = {};
    G.rocks.forEach(function (k) {
      var key = Math.round(k.x) + "," + Math.round(k.y), n = seenR[key] = (seenR[key] || 0) + 1;
      var ox = (n - 1) % 2 ? 9 * s : (n > 1 ? -9 * s : 0), oy = -(n - 1) * 4 * s;
      var w = 34 * s, h = rk.naturalWidth ? w * rk.naturalHeight / rk.naturalWidth : w;
      if (rk.complete && rk.naturalWidth) c.drawImage(rk, W2(k.x) - w / 2 + ox, H2(k.y) - h * 0.7 + oy, w, h); else { c.fillStyle = "#777"; c.beginPath(); c.arc(W2(k.x) + ox, H2(k.y) + oy, 14 * s, 0, 7); c.fill(); }
      bar(c, W2(k.x) + ox, H2(k.y) - h * 0.75 + oy, 30 * s, k.hp / k.max, "#c9b38a");
    });
    // 敵軍與我方依上下位置排序，下面的蓋住上面的
    var list = G.enemies.map(function (e) { return { y: e.y, e: e }; }).concat(G.gens.map(function (g) { return { y: M.SLOTS[g.slot][1], g: g }; }));
    list.sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { if (o.e) drawEnemy(c, o.e); else drawGen(c, o.g); });
    G.gens.forEach(function (g) { drawGenHud(c, g); });
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
    var bob = e.stun > 0 ? 0 : Math.abs(Math.sin(G.t * 9 + e.id * 1.7)) * 2 * s;
    if (e.boss) {
      // ✅ Jay 2026-11-23：敵方 Boss 用符合角色的 3D 風角色
      var bi = img("img/slot/u_" + (e.big ? "boss2" : "boss1") + ".webp"), bh = (e.big ? 74 : 62) * s, bw = bi.naturalWidth ? bh * bi.naturalWidth / bi.naturalHeight : bh * 0.8;
      c.fillStyle = "rgba(192,57,43,.35)"; c.strokeStyle = "#ff5a4a"; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + 2 * s, bw * 0.34, 7 * s, 0, 0, 7); c.fill(); c.stroke();
      if (bi.complete && bi.naturalWidth) c.drawImage(bi, x - bw / 2, y - bh * 0.9 - bob * 0.6, bw, bh); else token(c, e.art, x, y - 20 * s, 20 * s, "#c0392b");
      c.font = "700 " + Math.round(11 * s + 4) + "px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.85)"; c.fillStyle = "#ffd76a";
      var nm = (e.big ? "大將・" : "先鋒・") + e.name; c.strokeText(nm, x, y - bh * 0.9 - 9); c.fillText(nm, x, y - bh * 0.9 - 9);
      bar(c, x, y - bh * 0.9 - 6, 60 * s, e.hp / e.max, "#e05858");
    } else {
      var im = img("img/slot/u_e_" + e.k + ".webp"), h = (e.k === "cav" ? 44 : e.k === "shield" ? 40 : 36) * s, w = im.naturalWidth ? h * im.naturalWidth / im.naturalHeight : h / 2;
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + 2 * s, w * 0.32, 4 * s, 0, 0, 7); c.fill();
      if (im.complete && im.naturalWidth) c.drawImage(im, x - w / 2, y - h * 0.88 - bob, w, h);
      if (e.hp < e.max) bar(c, x, y - h * 0.9 - bob, Math.max(18 * s, w * 0.8), e.hp / e.max, "#e05858");
    }
    if (e.burn > 0) { c.fillStyle = "rgba(232,116,44," + (0.5 + 0.4 * Math.sin(G.t * 12 + e.id)) + ")"; c.beginPath(); c.arc(x, y - 6 * s, 5 * s, 0, 7); c.fill(); }
    if (e.stun > 0) { c.font = "700 " + Math.round(10 * s + 3) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#c9c0ff"; c.fillText("暈", x, y - 26 * s); }
  }
  // ✅ Jay 2026-11-23：我方用將軍／軍師造型的 3D 風角色，四張圖輪播成出手動作（待機→蓄力→出手→收招），頭上的頭像放大
  var UA = { "槍": "spear", "騎": "cav", "弓": "bow", "刺": "sin", "法": "mage" };
  var GM = { spear: { w: 143, h: 151, ax: 75, ay: 148.2, body: 129.6 }, cav: { w: 149, h: 185, ax: 107.3, ay: 182.9, body: 179.8 }, sin: { w: 123, h: 151, ax: 90.2, ay: 148.8, body: 140.7 }, bow: { w: 140, h: 156, ax: 77.2, ay: 153.1, body: 130.8 }, mage: { w: 130, h: 142, ax: 57.7, ay: 138.9, body: 127.1 } };
  function genTop(g) { return (g.c.typ === "騎" ? 58 : 46) * view.s; }
  function drawGen(c, g) {
    var s = view.s, p = M.SLOTS[g.slot], x = W2(p[0]), y = H2(p[1]) + 5 * s, k = UA[g.c.typ], m = GM[k];
    var isSel = sel && sel.gen === g.id, ring = g.guest ? "#ecd391" : (FC[FV[g.c.fac]] || "#d4a853");
    if (isSel) { c.fillStyle = "rgba(236,211,145,.08)"; c.strokeStyle = "rgba(236,211,145,.6)"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y - 5 * s, M.genRng(G, g) * s, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.fillStyle = "rgba(0,0,0,.42)"; c.strokeStyle = ring; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 17 * s, 8 * s, 0, 0, 7); c.fill(); c.stroke();
    if (G.windT > 0 && g.down <= 0) { c.strokeStyle = "rgba(78,200,122,.85)"; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 21 * s, 10 * s, 0, G.t * 8, G.t * 8 + 4); c.stroke(); }
    if (G.fireT > 0 && g.c.typ === "弓" && g.down <= 0) { c.strokeStyle = "rgba(232,116,44,.9)"; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 19 * s, 9 * s, 0, 0, 7); c.stroke(); }
    var im = img("img/slot/g_" + k + ".webp"), sc = genTop(g) / m.body, f = 0;
    if (g.down <= 0 && g.atkT !== undefined) { var A = Math.min(0.3, M.TYPE[g.c.typ].cd * 0.9), ph = (G.t - g.atkT) / A; if (ph >= 0 && ph < 1) f = ph < 0.25 ? 1 : ph < 0.7 ? 2 : 3; }
    var breathe = f ? 0 : Math.sin(performance.now() / 420 + g.id) * 0.8 * s;
    if (im.complete && im.naturalWidth) { c.save(); if (g.down > 0) c.globalAlpha = 0.35; c.drawImage(im, f * m.w, 0, m.w, m.h, x - m.ax * sc, y - m.ay * sc + breathe, m.w * sc, m.h * sc); c.restore(); }
  }
  function drawGenHud(c, g) {
    var s = view.s, p = M.SLOTS[g.slot], x = W2(p[0]), y = H2(p[1]) + 5 * s, r = 14 * s, ring = g.guest ? "#ecd391" : (FC[FV[g.c.fac]] || "#d4a853");
    var hy = y - genTop(g) - r + 2 * s;
    token(c, g.c.art, x, hy, r, ring, g.down > 0);
    if (g.down > 0) { c.font = "700 " + Math.round(9 * s + 4) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#f0e8d8"; c.fillText(Math.ceil(g.down / (fast ? 1 : M.SPEED)), x, hy + 4); }
    else bar(c, x, hy - r - 6, 30 * s, g.hp / g.max, "#4ec87a");
    c.font = "700 " + Math.round(6 * s + 4) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.strokeStyle = "rgba(0,0,0,.8)"; c.lineWidth = 3;
    c.strokeText("★".repeat(g.star), x, y + 17 * s); c.fillText("★".repeat(g.star), x, y + 17 * s);
  }
  function drawFx(c) {
    var t = G.t, s = view.s, K = M.SPEED * 2;   // 特效長度跟著引擎時間，一般速度下看起來跟以前差不多
    G.fx.forEach(function (f) {
      var age = (t - f.t) / K, a = 1 - age;
      if (age > 1 || age < 0) return;
      if (f.kind === "dmg" && age < 0.7) {
        if (f.c === "hit" || f.c === "splash" || f.c === "burn") return;   // 小兵多，普通傷害數字不顯示，免得畫面太亂
        c.globalAlpha = Math.max(0, 1 - age / 0.7); c.font = "800 " + Math.round(9 * s + 6) + "px ui-monospace, monospace"; c.textAlign = "center";
        c.fillStyle = f.c === "fire" ? "#ff9a4a" : f.c === "thunder" ? "#c9c0ff" : "#ffd36b";
        c.fillText(f.v >= 10000 ? (f.v / 1000).toFixed(1) + "k" : f.v, W2(f.x), H2(f.y) - 22 * s - age * 30); c.globalAlpha = 1;
      } else if (f.kind === "shot" && age < 0.16) {
        var k = age / 0.16; c.strokeStyle = f.fire ? "rgba(255,140,50,.95)" : f.typ === "法" ? "rgba(120,220,255,.95)" : "rgba(236,211,145,.95)"; c.lineWidth = f.fire || f.typ === "法" ? 3 : 2;
        var y0 = f.y0 - 22;
        c.beginPath(); c.moveTo(W2(f.x0 + (f.x1 - f.x0) * Math.max(0, k - 0.35)), H2(y0 + (f.y1 - 8 - y0) * Math.max(0, k - 0.35))); c.lineTo(W2(f.x0 + (f.x1 - f.x0) * k), H2(y0 + (f.y1 - 8 - y0) * k)); c.stroke();
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
        if (f.kind === "up") { c.font = "700 " + Math.round(8 * s + 6) + "px 'LXGW WenKai TC', serif"; c.textAlign = "center"; c.fillStyle = "#ecd391"; c.fillText("升星 " + f.star + "★", W2(f.x), H2(f.y) - 70 * s - age * 20); }
        c.globalAlpha = 1;
      } else if (f.kind === "bosshit" && age < 0.45) {
        c.globalAlpha = 1 - age / 0.45; c.strokeStyle = "#ff5a4a"; c.lineWidth = 5; c.beginPath(); c.arc(W2(f.x), H2(f.y), (12 + age * 70) * s, 0, 7); c.stroke(); c.globalAlpha = 1;
      } else if (f.kind === "die" && age < 0.4) {
        c.globalAlpha = (1 - age / 0.4) * 0.8; c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(W2(f.x), H2(f.y) - 12 * s, (4 + age * 26) * s, 0, 7); c.fill(); c.globalAlpha = 1;
      }
    });
  }

  function finish() {
    cancelAnimationFrame(raf);
    var st = S(), d = M.data(st), g = G, played = g.stage;
    if (!g.quit) {
      d.runs++;
      if (g.won) { d.wins++; d.top = Math.max(d.top || 0, played); d.stage = played + 1; }
      SG.Store.save(st);
      if (g.won) P.lb("slot", { stage: d.top }).then(function (x) { x.at = Date.now(); lbData = x; }).catch(function () { });
    }
    G = null;
    if (SG.Audio) SG.Audio.scene("slot");
    if (g.won) F.snd.win(true);
    // ✅ Jay 2026-11-23：過關後到下一關可以重新選武將 → 回大廳選將再出征
    UI.modal('<h2>' + (g.won ? '第 ' + played + ' 關 守城成功！' : g.quit ? '撤退' : '第 ' + played + ' 關 城門失守') + '</h2>' +
      '<p>' + (g.won ? '先鋒、本陣全數擊退' : g.quit ? '這一關重新再來' : g.wave >= 2 ? '擊退先鋒，敗於本陣' : '敗於先鋒') + '・殺敵 ' + g.kills + '・拉霸 ' + g.spins + ' 次</p>' +
      (g.won ? '<p>下一關：第 ' + d.stage + ' 關（敵軍更強、地形不同），可以重新選武將。</p><div class="row end"><button class="pri" id="sl-back">選將，前往第 ' + d.stage + ' 關</button></div>'
        : '<div class="row end"><button id="sl-back">重新選將</button><button class="pri" id="sl-again">原班人馬再戰</button></div>'));
    UI.back = function () { $("#modal").classList.remove("show"); UI.go("slot"); };
    $("#sl-back").onclick = function () { UI.close(); };
    var ag = $("#sl-again"); if (ag) ag.onclick = function () { UI.back = null; UI.close(); start(list0); };
  }
})(window.SG);
