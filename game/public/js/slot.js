/* 拉霸守城（測試版）：上面守城、下面 3×3 拉霸。連成一線就召喚那位武將下場，同一位再連到就升星。
   ✅ Jay 2026-11-23：照「轉運軍團」縫合思路新增一個模式（老虎機＋塔防），先做測試版。
   以下數值、名稱、獎勵全部是開發暫定 ★，等 Jay 試玩後再調。 */
(function (SG) {
  var M = SG.Slot = {};
  var FV = { "魏": "wei", "蜀": "shu", "吳": "wu", "群雄": "qun", "黃巾": "yt" };

  // ===== 數值（★ 全部暫定） =====
  M.WAVES = 20;                    // 守滿 20 波算勝利
  M.COLS = 5;                      // 城門前 5 個守位
  M.SPIN_CD = 1.8;                 // 拉一次的冷卻（秒）
  M.WILD_P = 0.08;                 // 「令」（萬用）出現機率
  M.STAR_ATK = [1, 1.6, 2.3, 3.1, 4.0];
  M.STAR_HP = [1, 1.8, 2.8, 4.0, 5.5];
  M.GATE_HP = 3000;
  M.TYPE = {                       // 攻擊間隔、射程（0 = 近戰）、濺射
    "槍": { cd: 1.0, rng: 0 }, "騎": { cd: 0.8, rng: 0 }, "刺": { cd: 0.9, rng: 0, crit: 0.25 },
    "弓": { cd: 1.1, rng: 1 }, "法": { cd: 1.6, rng: 1, splash: 0.6 }
  };
  M.ENEMY = {                      // hp／atk 倍率、速度（場地高度／秒）、遠程
    spear: { img: "sol_e_spear", hp: 1, atk: 1, spd: 0.07 },
    bow: { img: "sol_e_bow", hp: 0.8, atk: 0.8, spd: 0.065, ranged: true },
    cav: { img: "sol_e_cav", hp: 1.3, atk: 1.2, spd: 0.14 },
    mage: { img: "sol_e_mage", hp: 0.9, atk: 1.6, spd: 0.06, ranged: true },
    sin: { img: "sol_e_assassin", hp: 0.9, atk: 1.4, spd: 0.12 }
  };
  M.BOSS = { 5: "程志遠", 10: "張寶", 15: "張梁", 20: "張角" };
  M.UPS = [
    { id: "wall", name: "城牆加固", desc: "城門兵力 +10%", max: 10 },
    { id: "arm", name: "軍械精良", desc: "武將攻擊 +8%", max: 10 },
    { id: "van", name: "先鋒", desc: "開局先有一位 1★ 武將守城", max: 1 }
  ];
  M.upCost = function (u, lv) { return u.id === "van" ? 30 : 5 * (lv + 1); };
  M.reward = function (G) { return G.cleared * 2 + (G.won ? 20 : 0); };   // 軍功

  function eHp(w) { return 600 * Math.pow(1.13, w - 1); }
  function eAtk(w) { return 45 * Math.pow(1.09, w - 1); }

  // ===== 存檔 =====
  M.data = function (S) { S.slotm = S.slotm || { pts: 0, up: {}, best: 0, runs: 0, wins: 0 }; S.slotm.up = S.slotm.up || {}; return S.slotm; };

  // 拉霸上的 5 位武將：隊伍裡有立繪的前 5 位（不同名），不夠就從已擁有的補，再不夠用預設
  M.roster = function (S) {
    var out = [], seen = {};
    function add(c) { if (c && c.art && !seen[c.gen] && out.length < 5) { seen[c.gen] = 1; out.push(c); } }
    (S.team || []).forEach(function (id) { add(SG.CARD_BY_ID[id]); });
    Object.keys(S.inv || {}).forEach(function (id) { add(SG.CARD_BY_ID[id]); });
    ["關羽", "張遼", "黃忠", "諸葛亮", "周泰"].forEach(function (n) { add(SG.GEN[n]); });
    return out;
  };

  // ===== 引擎（純資料，可在 node 模擬） =====
  M.newGame = function (roster, ups, S, rnd) {
    rnd = rnd || Math.random;
    var arm = 1 + 0.08 * (ups.arm || 0);
    var G = {
      t: 0, wave: 0, cleared: 0, gate: M.GATE_HP * (1 + 0.1 * (ups.wall || 0)), units: [], enemies: [], fx: [], log: [],
      spinCd: 0, grid: [], hits: [], roster: roster.map(function (c) {
        var b = (S && SG.best(S, c.id)) || { rar: c.vers[0], star: 1 }, u = SG.unitStats(c, b.rar, 1);
        return { c: c, rar: b.rar, hp: u.hp, atk: u.atk * arm };
      }), spawnQ: [], spawnT: 0, gap: 1.5, over: false, won: false, rnd: rnd, nid: 1, summons: 0
    };
    G.gateMax = G.gate;
    for (var i = 0; i < 9; i++) G.grid.push(Math.floor(rnd() * 5));
    if (ups.van) summon(G, Math.floor(rnd() * G.roster.length));
    nextWave(G);
    return G;
  };

  function nextWave(G) {
    G.wave++;
    var w = G.wave, n = 4 + Math.floor(w * 1.6), kinds = ["spear"];
    if (w >= 3) kinds.push("bow"); if (w >= 5) kinds.push("cav"); if (w >= 8) kinds.push("mage"); if (w >= 11) kinds.push("sin");
    for (var i = 0; i < n; i++) G.spawnQ.push({ k: kinds[Math.floor(G.rnd() * kinds.length)] });
    if (M.BOSS[w]) G.spawnQ.push({ k: "boss", gen: M.BOSS[w] });
    G.spawnT = 0.5; G.log.push({ t: G.t, wave: w, boss: M.BOSS[w] || null });
  }

  function spawn(G, q) {
    var w = G.wave, col = Math.floor(G.rnd() * M.COLS), e;
    if (q.k === "boss") {
      var bc = SG.GEN[q.gen];
      e = { boss: true, gen: q.gen, art: bc && bc.art, hp: eHp(w) * 14, atk: eAtk(w) * 3, spd: 0.035, ranged: false, r: 0.075 };
      col = 2;
    } else {
      var d = M.ENEMY[q.k];
      e = { k: q.k, img: d.img, hp: eHp(w) * d.hp, atk: eAtk(w) * d.atk, spd: d.spd * (0.9 + G.rnd() * 0.2), ranged: !!d.ranged, r: q.k === "cav" ? 0.05 : 0.04 };
    }
    e.id = G.nid++; e.max = e.hp; e.col = col; e.x = (col + 0.5) / M.COLS + (G.rnd() - 0.5) * 0.08; e.y = -0.04; e.cd = 0;
    G.enemies.push(e);
  }

  // 場地座標：x 0～1，y 0（上）～1（下）。守位在 DEF，城門在 GATE
  M.DEF = 0.80; M.GATE = 0.93;

  function summon(G, ri) {
    var r = G.roster[ri]; if (!r) return;
    G.summons++;
    var u = G.units.find(function (x) { return x.ri === ri; });
    if (u) {   // 同一位：升星＋補滿
      if (u.star < 5) u.star++;
      u.max = r.hp * M.STAR_HP[u.star - 1]; u.hp = u.max; u.atk = r.atk * M.STAR_ATK[u.star - 1];
      G.fx.push({ t: G.t, kind: "up", col: u.col, star: u.star });
      return;
    }
    var free = [];
    for (var c = 0; c < M.COLS; c++) if (!G.units.some(function (x) { return x.col === c; })) free.push(c);
    if (!free.length) {   // 守位滿了：援軍＝全員回 25%
      G.units.forEach(function (x) { x.hp = Math.min(x.max, x.hp + x.max * 0.25); });
      G.fx.push({ t: G.t, kind: "heal" });
      return;
    }
    // 優先放到敵人最多的那一路
    free.sort(function (a, b) { return load(G, b) - load(G, a); });
    var col = free[0];
    G.units.push({ ri: ri, c: r.c, typ: r.c.typ, col: col, star: 1, max: r.hp, hp: r.hp, atk: r.atk, cd: 0 });
    G.fx.push({ t: G.t, kind: "in", col: col });
  }
  function load(G, col) { return G.enemies.filter(function (e) { return e.col === col; }).length; }

  // 8 條線：3 橫、3 直、2 斜
  M.LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  M.WILD = 5;
  M.canSpin = function (G) { return !G.over && G.spinCd <= 0; };
  M.spin = function (G) {
    if (!M.canSpin(G)) return null;
    G.spinCd = M.SPIN_CD;
    for (var i = 0; i < 9; i++) G.grid[i] = G.rnd() < M.WILD_P ? M.WILD : Math.floor(G.rnd() * G.roster.length);
    var hits = [];
    M.LINES.forEach(function (ln) {
      var s = ln.map(function (i) { return G.grid[i]; }), base = s.filter(function (x) { return x !== M.WILD; });
      if (!base.length) hits.push({ ln: ln, ri: Math.floor(G.rnd() * G.roster.length) });
      else if (base.every(function (x) { return x === base[0]; })) hits.push({ ln: ln, ri: base[0] });
    });
    G.hits = hits;
    return hits;
  };
  M.applyHits = function (G, hits) { (hits || G.hits).forEach(function (h) { summon(G, h.ri); }); };

  function dmgEnemy(G, e, d, kind) {
    e.hp -= d; G.fx.push({ t: G.t, kind: "dmg", x: e.x, y: e.y, v: Math.round(d), crit: kind === "crit" });
  }

  M.step = function (G, dt) {
    if (G.over) return;
    G.t += dt; G.spinCd = Math.max(0, G.spinCd - dt);
    // 出兵
    if (G.spawnQ.length) { G.spawnT -= dt; if (G.spawnT <= 0) { spawn(G, G.spawnQ.shift()); G.spawnT = 0.7; } }
    // 敵人移動／攻擊
    G.enemies.forEach(function (e) {
      var u = G.units.find(function (x) { return x.col === e.col; });
      var stopY = e.ranged ? M.DEF - 0.24 : (u ? M.DEF - 0.06 : M.GATE - 0.03);
      if (e.y < stopY) { e.y = Math.min(stopY, e.y + e.spd * dt); return; }
      e.cd -= dt; if (e.cd > 0) return; e.cd = 1;
      if (u) { u.hp -= e.atk; G.fx.push({ t: G.t, kind: "hurt", col: u.col }); if (e.ranged) G.fx.push({ t: G.t, kind: "shot", x0: e.x, y0: e.y, x1: (u.col + 0.5) / M.COLS, y1: M.DEF, foe: true }); }
      else { G.gate -= e.atk; G.fx.push({ t: G.t, kind: "gate" }); if (e.ranged) G.fx.push({ t: G.t, kind: "shot", x0: e.x, y0: e.y, x1: e.x, y1: M.GATE, foe: true }); }
    });
    G.units = G.units.filter(function (u) { if (u.hp <= 0) { G.fx.push({ t: G.t, kind: "die", col: u.col }); return false; } return true; });
    // 武將攻擊
    G.units.forEach(function (u) {
      u.cd -= dt; if (u.cd > 0) return;
      var T = M.TYPE[u.typ] || M.TYPE["槍"], ux = (u.col + 0.5) / M.COLS, tgt = null;
      G.enemies.forEach(function (e) {
        if (e.hp <= 0 || e.y < 0) return;
        var ok = T.rng ? e.y > 0.08 : (e.y > M.DEF - 0.2 && Math.abs(e.x - ux) < 1.6 / M.COLS);
        if (ok && (!tgt || e.y > tgt.y)) tgt = e;
      });
      if (!tgt) return;
      u.cd = T.cd;
      var d = u.atk, kind = "hit";
      if (T.crit && G.rnd() < T.crit) { d *= 2; kind = "crit"; }
      dmgEnemy(G, tgt, d, kind);
      G.fx.push({ t: G.t, kind: T.rng ? "shot" : "slash", x0: ux, y0: M.DEF, x1: tgt.x, y1: tgt.y, typ: u.typ });
      if (T.splash) G.enemies.forEach(function (e) { if (e !== tgt && e.hp > 0 && Math.hypot(e.x - tgt.x, (e.y - tgt.y) * 1.6) < 0.12) dmgEnemy(G, e, d * T.splash, "splash"); });
    });
    G.enemies = G.enemies.filter(function (e) { return e.hp > 0; });
    if (G.gate <= 0) { G.gate = 0; G.over = true; G.won = false; return; }
    if (!G.spawnQ.length && !G.enemies.length) {
      G.cleared = G.wave;
      if (G.wave >= M.WAVES) { G.over = true; G.won = true; return; }
      G.gap -= dt; if (G.gap <= 0) { G.gap = 2; nextWave(G); }
    }
    if (G.fx.length > 400) G.fx = G.fx.slice(-200);
  };
})(window.SG);
