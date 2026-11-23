/* 拉霸守城（測試版 2）：地圖塔防＋3×3 計策拉霸
   ✅ Jay 2026-11-23：
   - 直式：上方地圖、下方拉霸；測試版 1 張地圖、5 個入口、10 波、最後一波 Boss
   - 敵軍從多個入口、不同時間出不同兵種，目標都是城門；城門被打到三次就輸
   - 武將要自己安排守在哪個營寨
   - 拉霸要花軍糧（殺敵賺）；拉霸符號：火 雷 風 石 武 令
     火：弓兵射火箭，攻擊 +20%，每 1.5 秒再造成 10% 傷害，持續 9 秒
     雷：法師落雷，周圍敵軍受傷並停頓 2 秒
     石：槍兵落石擋路，敵軍要打破才能前進；落下時範圍內敵軍受 200% 攻擊
     風：全兵種攻擊加速 200%
     令：萬用
   ✅ Jay 2026-11-23 第二輪：改成 3 大波；一定要有 2 個營寨打得到 75% 以上入口的兵（要衝）；出征只選 5 位，5 位武將直接放進拉霸；
     三個「令」100% 請一位 UR/SSR 助陣（玩家沒有的優先）、50% 第二位、1% 第三位；Boss 每 3 秒攻擊一次，到城門每次攻擊扣一次；
     拉霸費用減半；中獎機率 33%
   ✅ Jay 2026-11-23 第三輪：改成兩大波「敵軍先鋒」「敵軍本陣」，先鋒有小 Boss、本陣有大 Boss；
     助陣是「每一局」100% 出一位 UR/SSR，第二位機率 50%、第三位 1%（每次三令請一位）
   ✅ Jay 2026-11-23 第四輪：關卡一關一關往上打（排行榜比誰打到最後面的關卡）
   ★ 開發暫定：每過一關敵軍兵力 ×1.03、攻擊 ×1.015，第 1 關兵力 ×0.85；先鋒小 Boss 用張寶、助陣在第幾轉出現、開局可佈陣 3 位、武將連線＝增援（已上陣就升星）、各數值、火箭與風的持續時間、落石血量、軍略三選一 */
(function (SG) {
  var M = SG.Slot = {};

  // ===== 地圖（世界座標 400×500，城門在下方中央） =====
  M.W = 400; M.H = 500;
  M.GATE = { x: 200, y: 486 };
  var TRUNK = [[200, 330], [200, 486]];
  M.PATHS = [
    [[40, -12], [40, 110], [118, 165], [118, 262]].concat(TRUNK),      // 0 左上
    [[200, -12], [200, 120], [168, 185], [200, 250]].concat(TRUNK),    // 1 正上
    [[360, -12], [360, 110], [282, 165], [282, 262]].concat(TRUNK),    // 2 右上
    [[-12, 212], [62, 212], [118, 262]].concat(TRUNK),                 // 3 左
    [[412, 212], [338, 212], [282, 262]].concat(TRUNK)                 // 4 右
  ];
  M.GATE_NAMES = ["左上", "正上", "右上", "左側", "右側"];
  M.SLOTS = [[78, 58], [322, 58], [150, 128], [240, 128], [80, 180], [320, 180], [72, 282], [328, 282], [165, 352], [235, 352], [140, 430], [260, 430]];
  M.KEY = [8, 9];   // 要衝：所有路線最後都會經過，任何兵種都打得到

  // 預先把路線切成等距點，方便移動與找落石位置
  M.PTS = M.PATHS.map(function (p) {
    var out = [], acc = 0;
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i], b = p[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 4));
      for (var k = 0; k < n; k++) out.push({ x: a[0] + (b[0] - a[0]) * k / n, y: a[1] + (b[1] - a[1]) * k / n, s: acc + L * k / n });
      acc += L;
    }
    out.push({ x: p[p.length - 1][0], y: p[p.length - 1][1], s: acc });
    out.len = acc; return out;
  });
  function posAt(pi, s) {
    var P = M.PTS[pi], i = Math.max(0, Math.min(P.length - 1, Math.floor(s / P.len * (P.length - 1))));
    while (i < P.length - 1 && P[i + 1].s < s) i++;
    while (i > 0 && P[i].s > s) i--;
    var a = P[i], b = P[Math.min(P.length - 1, i + 1)], f = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  M.posAt = posAt;

  // ===== 數值（★ 全部暫定） =====
  M.LIVES = 3;
  M.STAGE_HP = 1.03; M.STAGE_ATK = 1.015; M.STAGE1 = 0.85;
  M.stageMul = function (n) { return { hp: M.STAGE1 * Math.pow(M.STAGE_HP, n - 1), atk: Math.pow(M.STAGE_ATK, n - 1) }; };
  M.SPIN_COST = 10;
  M.FOOD0 = 80;
  M.REPAIR_COST = 150;
  M.START_DEPLOY = 3;
  M.ROSTER_MAX = 5;
  M.STAR_ATK = [1, 1.5, 2.1, 2.8, 3.6];
  M.STAR_HP = [1, 1.4, 1.9, 2.5, 3.2];
  M.REVIVE = 8;
  M.TYPE = {   // 射程、攻擊間隔、可擋幾個敵人
    "槍": { rng: 60, cd: 1.0, block: 3 },
    "騎": { rng: 75, cd: 0.8, block: 1 },
    "刺": { rng: 60, cd: 0.8, crit: 0.3 },
    "弓": { rng: 125, cd: 1.0 },
    "法": { rng: 105, cd: 1.5, splash: 34 }
  };
  M.ENEMY = {
    spear: { name: "黃巾槍兵", img: "sol_e_spear", hp: 819, atk: 62, spd: 30, food: 4 },
    cav: { name: "黃巾騎兵", img: "sol_e_cav", hp: 655, atk: 83, spd: 58, food: 5 },
    shield: { name: "黃巾力士", img: "sol_e_assassin", hp: 2457, atk: 114, spd: 18, food: 9 },
    bow: { name: "黃巾弓兵", img: "sol_e_bow", hp: 608, atk: 52, spd: 32, food: 4 },
    mage: { name: "黃巾道士", img: "sol_e_mage", hp: 760, atk: 73, spd: 26, food: 6 }
  };
  M.HP_GROW = 1.2;
  M.BOSSES = { boss1: { gen: "張寶", hp: 28600, atk: 260, spd: 13, food: 80 }, boss2: { gen: "張角", hp: 93600, atk: 400, spd: 11, food: 120 } };
  M.BOSS = M.BOSSES.boss2;
  M.WAVE_NAMES = ["敵軍先鋒", "敵軍本陣"];
  M.SYM = ["火", "雷", "風", "石", "令"];   // 5 以後是出征名單上的武將
  M.HIT_P = 0.33;          // 每轉一次中獎機率
  M.HIT2_P = 0.12;         // 中獎時同時連出兩條
  M.HIT_W = { "火": 1, "雷": 1, "風": 1, "石": 1, gen: 2.4 };   // 中獎時連出哪一種
  M.JACK2 = 0.5; M.JACK3 = 0.01;   // 每一局：第一位必出，第二位 50%，第三位 1%
  M.JACK_AT = [5, 15]; M.JACK_GAP = [10, 30];   // ★ 第一次三令出現在第 5～15 轉之間，之後每次再隔 10～30 轉
  M.BOSS_CD = 3;
  M.SIN_BOSS = 2; M.CAV_MINION = 1.5;   // ✅ Jay 2026-11-23：刺客打 Boss 攻擊 2 倍、騎兵打小兵 1.5 倍（★ 刺客原本的 30% 暴擊先保留，等 Jay 決定）
  M.WILD = 4; M.GEN0 = 5;
  M.FIRE_T = 10; M.FIRE_ATK = 1.2; M.BURN_P = 0.10; M.BURN_TICK = 1.5; M.BURN_T = 9;
  M.THUNDER_MUL = 3; M.STUN = 2;
  M.ROCK_MUL = 2; M.ROCK_HP = 5; M.ROCK_R = 26;
  M.WIND_T = 6; M.WIND = 3;

  // 兩大波的出兵表：[秒, 入口, 兵種, 數量, 間隔, 強度等級]
  M.WAVES = [
    [[0, 1, "spear", 6, 1.6, 1], [6, 0, "spear", 5, 1.6, 2], [12, 2, "spear", 5, 1.6, 2], [20, 3, "cav", 4, 1.2, 3], [24, 4, "cav", 4, 1.2, 3],
     [32, 0, "spear", 5, 1.4, 4], [36, 2, "bow", 5, 1.4, 4], [44, 1, "shield", 3, 3, 5], [50, 3, "spear", 6, 1.2, 5], [54, 4, "spear", 6, 1.2, 5], [62, 1, "boss1", 1, 1, 5]],
    [[0, 0, "mage", 4, 2, 6], [0, 2, "mage", 4, 2, 6], [10, 1, "cav", 8, 0.8, 6], [18, 3, "spear", 8, 1, 7], [22, 4, "spear", 8, 1, 7], [30, 1, "shield", 4, 2.5, 7],
     [40, 0, "cav", 6, 0.8, 8], [43, 2, "cav", 6, 0.8, 8], [50, 1, "bow", 8, 1, 8], [58, 3, "shield", 3, 2, 9], [64, 0, "mage", 6, 1.2, 9], [64, 2, "mage", 6, 1.2, 9],
     [74, 4, "cav", 8, 0.7, 10], [82, 0, "spear", 8, 1, 10], [82, 2, "spear", 8, 1, 10], [90, 1, "shield", 4, 2, 10], [96, 1, "boss2", 1, 1, 10]]
  ];
  M.TACTICS = [
    { id: "bowrng", name: "強弓", desc: "弓兵射程 +20%" },
    { id: "spearhp", name: "堅陣", desc: "槍兵兵力 +40%" },
    { id: "cavatk", name: "鐵騎", desc: "騎兵攻擊 +30%" },
    { id: "magerng", name: "奇門", desc: "法師範圍 +20%" },
    { id: "allatk", name: "勵軍", desc: "全體攻擊 +12%" },
    { id: "food", name: "屯田", desc: "殺敵軍糧 +40%" },
    { id: "cheap", name: "節用", desc: "拉霸費用 -25%" },
    { id: "repair", name: "修城", desc: "城門回復一次（最多 3）" },
    { id: "sinspd", name: "影襲", desc: "刺客攻速 +40%" },
    { id: "firelong", name: "火攻", desc: "火箭與燃燒時間 +50%" }
  ];

  M.LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  // ===== 存檔 =====
  M.data = function (S) { S.slotm = S.slotm || {}; var d = S.slotm; d.best = d.best || 0; d.stage = d.stage || 1; d.top = d.top || 0; d.runs = d.runs || 0; d.wins = d.wins || 0; d.list = d.list || null; return d; };
  M.owned = function (S) {
    var out = [], seen = {};
    function add(c) { if (c && c.art && !seen[c.gen]) { seen[c.gen] = 1; out.push(c); } }
    (S.team || []).forEach(function (id) { add(SG.CARD_BY_ID[id]); });
    Object.keys(S.inv || {}).forEach(function (id) { add(SG.CARD_BY_ID[id]); });
    return out;
  };
  M.defaultList = function (S) {
    var own = M.owned(S), d = M.data(S);
    var keep = (d.list || []).map(function (id) { return SG.CARD_BY_ID[id]; }).filter(function (c) { return c && own.indexOf(c) >= 0; });
    own.forEach(function (c) { if (keep.length < M.ROSTER_MAX && keep.indexOf(c) < 0) keep.push(c); });
    ["關羽", "黃忠", "諸葛亮", "周泰", "張遼", "甄姬", "孫尚香", "趙雲"].forEach(function (n) { var c = SG.GEN[n]; if (keep.length < M.ROSTER_MAX && c && keep.indexOf(c) < 0) keep.push(c); });
    return keep.slice(0, M.ROSTER_MAX);
  };

  // ===== 引擎 =====
  function genStats(c, S) {
    var b = (S && SG.best(S, c.id)) || { rar: c.vers[0], star: 1 }, u = SG.unitStats(c, b.rar, 1);
    return { hp: u.hp, atk: u.atk, rar: b.rar };
  }
  M.newGame = function (list, S, rnd, stage) {
    rnd = rnd || Math.random; stage = stage || 1;
    var G = {
      t: 0, rnd: rnd, lives: M.LIVES, food: M.FOOD0, wave: 0, phase: "deploy", waveT: 0, queue: [], over: false, won: false,
      gens: [], reserve: [], enemies: [], rocks: [], fx: [], tac: {}, fireT: 0, windT: 0, nid: 1, kills: 0, spins: 0, grid: [], hits: [], S: S,
      list: list, stage: stage, sm: M.stageMul(stage)
    };
    list.forEach(function (c) { var s = genStats(c, S); G.reserve.push({ c: c, base: s }); });
    G.deployLeft = M.START_DEPLOY;
    G.nsym = M.GEN0 + list.length;
    G.jackN = 1 + (rnd() < M.JACK2 ? 1 : 0) + (rnd() < M.JACK3 ? 1 : 0); G.jackDone = 0;
    G.jackAt = M.JACK_AT[0] + Math.floor(rnd() * (M.JACK_AT[1] - M.JACK_AT[0] + 1));
    for (var i = 0; i < 9; i++) G.grid.push(0);
    G.grid = missGrid(G);
    return G;
  };
  function anySym(G, noWild) { var k; do { k = Math.floor(G.rnd() * G.nsym); } while (noWild && k === M.WILD); return k; }
  function evalGrid(G, g) {
    var hits = [];
    M.LINES.forEach(function (ln) {
      var s = ln.map(function (i) { return g[i]; }), base = s.filter(function (x) { return x !== M.WILD; });
      if (!base.length) hits.push({ ln: ln, sym: M.WILD, jackpot: true });
      else if (base.every(function (x) { return x === base[0]; })) hits.push({ ln: ln, sym: base[0] });
    });
    return hits;
  }
  M.evalGrid = evalGrid;
  function missGrid(G) {
    for (var k = 0; k < 200; k++) { var g = []; for (var i = 0; i < 9; i++) g.push(anySym(G, G.rnd() > 0.06)); if (!evalGrid(G, g).length) return g; }
    return [0, 1, 2, 3, 0, 1, 2, 3, 0];
  }
  function pickHitSym(G) {
    var W = M.HIT_W, tot = W["火"] + W["雷"] + W["風"] + W["石"] + W.gen, r = G.rnd() * tot;
    var order = [["火", 0], ["雷", 1], ["風", 2], ["石", 3]];
    for (var i = 0; i < order.length; i++) { r -= W[order[i][0]]; if (r < 0) return order[i][1]; }
    return M.GEN0 + Math.floor(G.rnd() * (G.nsym - M.GEN0));
  }
  function hitGrid(G, n, force) {
    for (var k = 0; k < 400; k++) {
      var g = [], want = [], used = {};
      for (var i = 0; i < 9; i++) g.push(-1);
      var ok = true;
      for (var j = 0; j < n && ok; j++) {
        var lns = M.LINES.filter(function (ln, li) { return !used[li]; }), li2 = Math.floor(G.rnd() * lns.length), ln = lns[li2], sym = j === 0 && force !== undefined ? force : pickHitSym(G);
        used[M.LINES.indexOf(ln)] = 1;
        ln.forEach(function (c, q) {
          var v = sym === M.WILD ? M.WILD : (q === 1 && G.rnd() < 0.25 ? M.WILD : sym);
          if (g[c] >= 0 && g[c] !== v && g[c] !== M.WILD && v !== M.WILD) ok = false; else if (g[c] < 0 || g[c] === M.WILD) g[c] = v;
        });
        want.push(sym);
      }
      if (!ok) continue;
      for (var c2 = 0; c2 < 9; c2++) if (g[c2] < 0) g[c2] = anySym(G, true);
      var h = evalGrid(G, g);
      if (h.length === n && (force === undefined || h.some(function (x) { return x.sym === force; }))) return g;
    }
    return missGrid(G);
  }

  function genAtk(G, g) {
    var a = g.base.atk * M.STAR_ATK[g.star - 1] * (1 + 0.12 * (G.tac.allatk || 0));
    if (g.c.typ === "騎") a *= 1 + 0.3 * (G.tac.cavatk || 0);
    return a;
  }
  function genMax(G, g) { var h = g.base.hp * M.STAR_HP[g.star - 1]; if (g.c.typ === "槍") h *= 1 + 0.4 * (G.tac.spearhp || 0); return h; }
  function genRng(G, g) {
    var r = M.TYPE[g.c.typ].rng;
    if (g.c.typ === "弓") r *= 1 + 0.2 * (G.tac.bowrng || 0);
    if (g.c.typ === "法") r *= 1 + 0.2 * (G.tac.magerng || 0);
    return r;
  }
  M.genRng = genRng;
  function genCd(G, g) {
    var cd = M.TYPE[g.c.typ].cd;
    if (g.c.typ === "刺") cd /= 1 + 0.4 * (G.tac.sinspd || 0);
    if (G.windT > 0) cd /= M.WIND;
    return cd;
  }

  // 佈陣／換位：把待命武將（reserve 索引）放到營寨；或把場上武將移到另一個空營寨
  M.slotFree = function (G, si) { return !G.gens.some(function (g) { return g.slot === si; }); };
  M.place = function (G, ri, si) {
    if (!M.slotFree(G, si) || !G.reserve[ri]) return false;
    if (G.phase === "deploy" && G.deployLeft <= 0) return false;
    if (G.phase !== "deploy" && !G.reserve[ri].ready) return false;
    var r = G.reserve.splice(ri, 1)[0];
    var g = { id: G.nid++, c: r.c, base: r.base, slot: si, star: r.star || 1, cd: 0, down: 0, guest: !!r.guest, notOwn: !!r.notOwn };
    g.max = genMax(G, g); g.hp = g.max;
    G.gens.push(g);
    if (G.phase === "deploy") G.deployLeft--;
    G.fx.push({ t: G.t, kind: "in", x: M.SLOTS[si][0], y: M.SLOTS[si][1] });
    return true;
  };
  M.move = function (G, gid, si) {
    var g = G.gens.find(function (x) { return x.id === gid; });
    if (!g || !M.slotFree(G, si)) return false;
    g.slot = si; g.cd = Math.max(g.cd, 0.6);
    return true;
  };

  M.startBattle = function (G) { if (G.phase !== "deploy" || !G.gens.length) return false; G.phase = "fight"; nextWave(G); return true; };
  function nextWave(G) {
    G.wave++; G.waveT = 0; G.queue = [];
    M.WAVES[G.wave - 1].forEach(function (e) { for (var i = 0; i < e[3]; i++) G.queue.push({ at: e[0] + i * e[4], gate: e[1], k: e[2], lvl: e[5] }); });
    G.queue.sort(function (a, b) { return a.at - b.at; });
    G.fx.push({ t: G.t, kind: "wave", wave: G.wave });
  }
  function spawn(G, q) {
    var e, lvl = q.lvl || G.wave, mul = Math.pow(M.HP_GROW, lvl - 1);
    if (M.BOSSES[q.k]) {
      var B = M.BOSSES[q.k], bc = SG.GEN[B.gen];
      e = { boss: true, big: q.k === "boss2", name: B.gen, art: bc && bc.art, hp: B.hp * G.sm.hp, atk: B.atk * G.sm.atk, spd: B.spd, food: B.food };
      G.fx.push({ t: G.t, kind: "boss", name: B.gen, art: e.art, big: e.big });
    } else {
      var d = M.ENEMY[q.k];
      e = { k: q.k, img: d.img, name: d.name, hp: d.hp * mul * G.sm.hp, atk: d.atk * Math.pow(1.1, lvl - 1) * G.sm.atk, spd: d.spd * (0.92 + G.rnd() * 0.16), food: d.food };
    }
    e.id = G.nid++; e.max = e.hp; e.path = q.gate; e.s = 0; e.cd = 0; e.stun = 0; e.burn = 0; e.burnD = 0; e.burnTick = 0; e.block = null;
    var p = posAt(e.path, 0); e.x = p.x; e.y = p.y;
    G.enemies.push(e);
  }

  // ===== 拉霸 =====
  M.spinCost = function (G) { return Math.round(M.SPIN_COST * (1 - 0.25 * (G.tac.cheap || 0))); };
  M.canSpin = function (G) { return !G.over && G.phase === "fight" && G.food >= M.spinCost(G); };
  M.spin = function (G) {
    if (!M.canSpin(G)) return null;
    G.food -= M.spinCost(G); G.spins++;
    var r = G.rnd(), forceJack = G.jackDone < G.jackN && (G.spins >= G.jackAt || (G.wave >= 2 && G.jackDone === 0));
    if (forceJack) { G.jackDone++; G.jackAt = G.spins + M.JACK_GAP[0] + Math.floor(G.rnd() * (M.JACK_GAP[1] - M.JACK_GAP[0] + 1)); }
    G.grid = forceJack ? hitGrid(G, 1, M.WILD) : r < M.HIT_P ? hitGrid(G, G.rnd() < M.HIT2_P ? 2 : 1) : missGrid(G);
    G.hits = evalGrid(G, G.grid);
    return G.hits;
  };
  M.applyHits = function (G, hits) {
    var out = [];
    (hits || []).forEach(function (h) { out.push(trigger(G, h)); });
    return out;
  };
  function ofType(G, t) { return G.gens.filter(function (g) { return g.c.typ === t && g.down <= 0; }); }
  function trigger(G, h) {
    var sym = M.SYM[h.sym] || "";
    if (h.jackpot) return jackpot(G);
    if (sym === "火") {
      var a = ofType(G, "弓"); if (!a.length) return { sym: sym, none: "場上沒有弓兵" };
      G.fireT = Math.max(G.fireT, M.FIRE_T * (1 + 0.5 * (G.tac.firelong || 0)));
      G.fx.push({ t: G.t, kind: "fire" }); return { sym: sym, n: a.length };
    }
    if (sym === "雷") {
      var m = ofType(G, "法"); if (!m.length) return { sym: sym, none: "場上沒有法師" };
      m.forEach(function (g) {
        var sp = M.SLOTS[g.slot], r = genRng(G, g), d = genAtk(G, g) * M.THUNDER_MUL;
        G.fx.push({ t: G.t, kind: "thunder", x: sp[0], y: sp[1], r: r }); G._src = "法";
        G.enemies.forEach(function (e) { if (Math.hypot(e.x - sp[0], e.y - sp[1]) <= r) { hurt(G, e, d, "thunder"); e.stun = Math.max(e.stun, M.STUN); } });
      });
      return { sym: sym, n: m.length };
    }
    if (sym === "石") {
      var sp2 = ofType(G, "槍"); if (!sp2.length) return { sym: sym, none: "場上沒有槍兵" };
      sp2.forEach(function (g) { dropRock(G, g); });
      return { sym: sym, n: sp2.length };
    }
    if (sym === "風") { G.windT = Math.max(G.windT, M.WIND_T); G.fx.push({ t: G.t, kind: "wind" }); return { sym: sym }; }
    if (h.sym >= M.GEN0) {   // 武將連線：還沒上陣的可以上陣；已上陣的升星
      var c = G.list[h.sym - M.GEN0], f = G.gens.find(function (g) { return g.c === c; }), r = G.reserve.find(function (x) { return x.c === c; });
      if (f) {
        if (f.star < 5) { f.star++; f.max = genMax(G, f); } f.hp = f.max; f.down = 0;
        var p = M.SLOTS[f.slot]; G.fx.push({ t: G.t, kind: "up", x: p[0], y: p[1], star: f.star }); return { sym: c.gen, up: c.gen, star: f.star };
      }
      if (r) { if (r.ready) { r.star = Math.min(5, (r.star || 1) + 1); return { sym: c.gen, ready: c.gen, star: r.star }; } r.ready = true; G.fx.push({ t: G.t, kind: "ready", name: c.gen }); return { sym: c.gen, ready: c.gen }; }
      return { sym: c.gen };
    }
    return { sym: sym };
  }
  // 三個「令」：100% 一位 UR/SSR 助陣（玩家沒有的優先），50% 第二位，1% 第三位
  function jackpot(G) {
    var S = G.S, taken = {};
    G.list.forEach(function (c) { taken[c.gen] = 1; }); G.gens.forEach(function (g) { taken[g.c.gen] = 1; }); G.reserve.forEach(function (r) { taken[r.c.gen] = 1; });
    var pool = SG.CARDS.filter(function (c) { return c.art && !taken[c.gen] && (c.vers.indexOf("UR") >= 0 || c.vers.indexOf("SSR") >= 0); });
    var seen = {}; pool = pool.filter(function (c) { if (seen[c.gen]) return false; seen[c.gen] = 1; return true; });
    var n = 1, got = [];
    for (var k = 0; k < n && pool.length; k++) {
      var notOwn = pool.filter(function (c) { return !(S && SG.best(S, c.id)); }), from = notOwn.length ? notOwn : pool;
      var c = from[Math.floor(G.rnd() * from.length)];
      pool.splice(pool.indexOf(c), 1);
      var rar = c.vers.indexOf("UR") >= 0 ? "UR" : "SSR", u = SG.unitStats(c, rar, 1);
      G.reserve.push({ c: c, base: { hp: u.hp, atk: u.atk, rar: rar }, ready: true, guest: true, notOwn: !(S && SG.best(S, c.id)) });
      got.push(c.gen);
    }
    G.fx.push({ t: G.t, kind: "jackpot", names: got });
    return { sym: "令", jackpot: true, guests: got };
  }
  function dropRock(G, g) {
    var sp = M.SLOTS[g.slot], r = genRng(G, g) + 20, best = null;
    // 落在範圍內、最靠近敵軍（沒有敵軍就靠近城門）的路線點
    M.PTS.forEach(function (P) {
      for (var i = 0; i < P.length; i += 3) {
        var q = P[i]; if (Math.hypot(q.x - sp[0], q.y - sp[1]) > r) continue;
        var near = 0; G.enemies.forEach(function (e) { var d = Math.hypot(e.x - q.x, e.y - q.y); if (d < 60) near += 60 - d; });
        var sc = near * 10 + q.y * 0.01;
        if (!best || sc > best.sc) best = { x: q.x, y: q.y, sc: sc };
      }
    });
    if (!best) return;
    var d = genAtk(G, g) * M.ROCK_MUL, hp = genAtk(G, g) * M.ROCK_HP;
    G.rocks.push({ id: G.nid++, x: best.x, y: best.y, hp: hp, max: hp });
    G.fx.push({ t: G.t, kind: "rock", x: best.x, y: best.y, x0: sp[0], y0: sp[1] });
    G._src = "槍"; G.enemies.forEach(function (e) { if (Math.hypot(e.x - best.x, e.y - best.y) <= M.ROCK_R) hurt(G, e, d, "rock"); });
  }

  M.repair = function (G) { if (G.over || G.lives >= M.LIVES || G.food < M.REPAIR_COST) return false; G.food -= M.REPAIR_COST; G.lives++; G.fx.push({ t: G.t, kind: "repair" }); return true; };
  M.chooseTactic = function (G, id) {
    if (G.phase !== "tactic") return false;
    G.tac[id] = (G.tac[id] || 0) + 1;
    if (id === "repair") G.lives = Math.min(M.LIVES, G.lives + 1);
    G.gens.forEach(function (g) { var old = g.max; g.max = genMax(G, g); g.hp = Math.min(g.max, g.hp + (g.max - old)); });
    G.phase = "fight"; G.offer = null; nextWave(G); return true;
  };

  function hurt(G, e, d, kind) {
    if (e.hp <= 0) return;
    if (G.stat && G._src) { var k0 = G._src + (e.boss ? "B" : "M"); G.stat[k0] = (G.stat[k0] || 0) + Math.min(d, e.hp); }
    e.hp -= d; G.fx.push({ t: G.t, kind: "dmg", x: e.x, y: e.y, v: Math.round(d), c: kind });
    if (e.hp <= 0) { G.kills++; G.food += Math.round(e.food * (1 + 0.4 * (G.tac.food || 0))); G.fx.push({ t: G.t, kind: "die", x: e.x, y: e.y }); }
  }

  // ===== 每一幀 =====
  M.step = function (G, dt) {
    if (G.over || G.phase !== "fight") return;
    G.t += dt; G.waveT += dt;
    G.fireT = Math.max(0, G.fireT - dt); G.windT = Math.max(0, G.windT - dt);
    while (G.queue.length && G.queue[0].at <= G.waveT) spawn(G, G.queue.shift());

    // 武將：倒下的回復、攔截名額
    var blocks = {};
    G.gens.forEach(function (g) { if (g.down > 0) { g.down -= dt; if (g.down <= 0) { g.hp = g.max; } } blocks[g.id] = 0; });
    G.enemies.forEach(function (e) { if (e.block) { var b = G.gens.find(function (g) { return g.id === e.block; }); if (!b || b.down > 0 || e.hp <= 0) e.block = null; else blocks[b.id]++; } });

    // 敵軍移動
    G.enemies.forEach(function (e) {
      if (e.hp <= 0) return;
      if (e.burn > 0) { e.burn -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick += M.BURN_TICK; G._src = "弓"; hurt(G, e, e.burnD, "burn"); } }
      if (e.hp <= 0) return;
      if (e.stun > 0) { e.stun -= dt; return; }
      // 被槍兵／騎兵攔下
      if (!e.block && !e.boss) {
        G.gens.forEach(function (g) {
          if (e.block || g.down > 0) return; var T = M.TYPE[g.c.typ]; if (!T.block || blocks[g.id] >= T.block) return;
          var sp = M.SLOTS[g.slot]; if (Math.hypot(e.x - sp[0], e.y - sp[1]) <= genRng(G, g) * 0.8) { e.block = g.id; blocks[g.id]++; }
        });
      }
      e.cd -= dt;
      if (e.block) {
        var b = G.gens.find(function (g) { return g.id === e.block; });
        if (e.cd <= 0) { e.cd = 1; b.hp -= e.atk; G.fx.push({ t: G.t, kind: "hurt", gid: b.id }); if (b.hp <= 0) { b.hp = 0; b.down = M.REVIVE; G.fx.push({ t: G.t, kind: "down", x: M.SLOTS[b.slot][0], y: M.SLOTS[b.slot][1] }); } }
        return;
      }
      if (e.boss) {   // Boss：每 3 秒攻擊一次；到城門前每次攻擊扣一次城門
        var atGate = e.s >= M.PTS[e.path].len - 6;
        if (e.cd <= 0) {
          var near = null; G.gens.forEach(function (g) { if (g.down > 0) return; var sp = M.SLOTS[g.slot]; if (Math.hypot(sp[0] - e.x, sp[1] - e.y) < 70 && !near) near = g; });
          var rk = G.rocks.find(function (k) { return Math.hypot(k.x - e.x, k.y - e.y) < 22; });
          if (atGate) { e.cd = M.BOSS_CD; G.lives -= 1; G.fx.push({ t: G.t, kind: "gate" }); G.fx.push({ t: G.t, kind: "bosshit", x: e.x, y: e.y }); return; }
          if (rk) { e.cd = M.BOSS_CD; rk.hp -= e.atk; G.fx.push({ t: G.t, kind: "bosshit", x: rk.x, y: rk.y }); if (rk.hp <= 0) G.fx.push({ t: G.t, kind: "rockbreak", x: rk.x, y: rk.y }); return; }
          if (near) { e.cd = M.BOSS_CD; near.hp -= e.atk; var np0 = M.SLOTS[near.slot]; G.fx.push({ t: G.t, kind: "bosshit", x: np0[0], y: np0[1] }); if (near.hp <= 0) { near.hp = 0; near.down = M.REVIVE; } }
        }
        if (atGate) return;
        if (G.rocks.some(function (k) { return Math.hypot(k.x - e.x, k.y - e.y) < 22; })) return;
        var bs = Math.min(M.PTS[e.path].len - 5, e.s + e.spd * dt), bp = posAt(e.path, bs); e.s = bs; e.x = bp.x; e.y = bp.y;
        return;
      }
      // 落石擋路
      var ns = e.s + e.spd * dt, np = posAt(e.path, ns), rock = null;
      G.rocks.forEach(function (k) { if (!rock && k.hp > 0 && Math.hypot(np.x - k.x, np.y - k.y) < 14 && Math.hypot(np.x - k.x, np.y - k.y) < Math.hypot(e.x - k.x, e.y - k.y)) rock = k; });
      if (rock) { if (e.cd <= 0) { e.cd = 1; rock.hp -= e.atk; if (rock.hp <= 0) G.fx.push({ t: G.t, kind: "rockbreak", x: rock.x, y: rock.y }); } return; }
      e.s = ns; e.x = np.x; e.y = np.y;
      if (e.s >= M.PTS[e.path].len - 2) {   // 到城門
        e.hp = 0; e.gone = true;
        G.lives -= 1; G.fx.push({ t: G.t, kind: "gate" });
      }
    });
    G.rocks = G.rocks.filter(function (k) { return k.hp > 0; });

    // 武將攻擊
    G.gens.forEach(function (g) {
      if (g.down > 0) return;
      g.cd -= dt; if (g.cd > 0) return;
      var sp = M.SLOTS[g.slot], r = genRng(G, g), T = M.TYPE[g.c.typ], tgt = null, best = -1;
      G.enemies.forEach(function (e) {
        if (e.hp <= 0 || e.y < 0) return;
        if (Math.hypot(e.x - sp[0], e.y - sp[1]) > r) return;
        var prog = e.s / M.PTS[e.path].len + (e.block === g.id ? 1 : 0);   // 優先打自己擋住的、再來是最接近城門的
        if (prog > best) { best = prog; tgt = e; }
      });
      if (!tgt) return;
      g.cd = genCd(G, g);
      var d = genAtk(G, g), kind = "hit"; G._src = g.c.typ;
      if (g.c.typ === "刺" && tgt.boss) d *= M.SIN_BOSS;
      if (g.c.typ === "騎" && !tgt.boss) d *= M.CAV_MINION;
      if (T.crit && G.rnd() < T.crit) { d *= 2; kind = "crit"; }
      if (g.c.typ === "弓" && G.fireT > 0) {
        d *= M.FIRE_ATK; kind = "fire";
        tgt.burn = M.BURN_T * (1 + 0.5 * (G.tac.firelong || 0)); tgt.burnD = Math.max(tgt.burnD, d * M.BURN_P); tgt.burnTick = M.BURN_TICK;
      }
      hurt(G, tgt, d, kind);
      G.fx.push({ t: G.t, kind: T.rng > 90 ? "shot" : "slash", x0: sp[0], y0: sp[1], x1: tgt.x, y1: tgt.y, typ: g.c.typ, fire: kind === "fire" });
      if (T.splash) G.enemies.forEach(function (e) { if (e !== tgt && e.hp > 0 && Math.hypot(e.x - tgt.x, e.y - tgt.y) < T.splash) hurt(G, e, d * 0.6, "splash"); });
    });
    G.enemies = G.enemies.filter(function (e) { return e.hp > 0; });

    if (G.lives <= 0) { G.lives = 0; G.over = true; G.won = false; return; }
    if (!G.queue.length && !G.enemies.length) {
      if (G.wave >= M.WAVES.length) { G.over = true; G.won = true; return; }
      G.food += 30;
      G.phase = "tactic"; G.offer = offer(G);
    }
    if (G.fx.length > 500) G.fx = G.fx.slice(-250);
  };
  function offer(G) {
    var pool = M.TACTICS.filter(function (t) { return !(t.id === "repair" && G.lives >= M.LIVES); }), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(G.rnd() * pool.length), 1)[0]);
    return out;
  }
})(window.SG);
