/* 烽火（拉霸守城，試玩版）：地圖塔防＋3×3 計策拉霸
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
  // ✅ Jay 2026-11-23 第五輪：每一關的地圖配置都不一樣（用關卡數當亂數種子，同一關每次都一樣）
  //   五個入口（上方 2～3 個、左右兩側 2～3 個）→ 左右各一個分匯點 → 總匯點 → 主幹 → 城門
  //   營寨沿路兩側自動擺；主幹兩側固定兩個「要衝」，所有路線都會經過（✅ 至少打得到 75% 入口）
  function mrnd(seed) { var a = (seed * 2654435761) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function cut(p) {
    var out = [], acc = 0;
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i], b = p[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 4));
      for (var k = 0; k < n; k++) out.push({ x: a[0] + (b[0] - a[0]) * k / n, y: a[1] + (b[1] - a[1]) * k / n, s: acc + L * k / n });
      acc += L;
    }
    out.push({ x: p[p.length - 1][0], y: p[p.length - 1][1], s: acc });
    out.len = acc; return out;
  }
  // ✅ Jay 2026-11-23 第六輪：路線不要每次都像樹枝 → 六種路型輪流（蛇行、繞湖、之字山道、雙翼、三路並進、分進合擊），打完一輪再左右鏡射
  var G0 = [200, 486];
  var LAYOUTS = [
    // ✅ 手繪地圖：路線與營寨位置照 img/slot/map_0.webp 對過（圖以 artK 倍畫在世界座標上，城牆頂約在 y=450）
    { name: "蛇行道", art: "map_0", artK: 1.11, key: [[198, 374], [200, 452]], paths: [
      [[308, -12], [306, 96], [90, 176], [90, 316], [142, 346], [198, 374], [200, 452], G0],
      [[90, -12], [90, 176], [90, 316], [142, 346], [198, 374], [200, 452], G0],
      [[412, 276], [304, 278], [198, 374], [200, 452], G0],
      [[-12, 316], [90, 316], [142, 346], [198, 374], [200, 452], G0],
      [[-12, 176], [90, 176], [90, 316], [142, 346], [198, 374], [200, 452], G0]], names: ["右上", "左上", "右側", "左側", "左上側"],
      slots: [[162, 405], [236, 405], [45, 139], [47, 87], [47, 270], [133, 231], [142, 138], [353, 67], [318, 247], [264, 353], [145, 309], [203, 302]] },
    { name: "繞湖道", art: "map_1", key: [[199, 356], [200, 452]], paths: [
      [[120, -12], [120, 185], [120, 290], [199, 356], [200, 452], G0],
      [[300, -12], [300, 185], [300, 292], [199, 356], [200, 452], G0],
      [[412, 65], [300, 65], [300, 185], [300, 292], [199, 356], [200, 452], G0],
      [[-12, 185], [120, 185], [120, 290], [199, 356], [200, 452], G0],
      [[120, -12], [120, 185], [300, 185], [300, 292], [199, 356], [200, 452], G0]], names: ["左上", "右上", "右上側", "左側", "左上"],
      slots: [[160, 391], [240, 391], [80, 49], [179, 105], [252, 142], [342, 125], [56, 222], [344, 266], [313, 344], [104, 350]] },
    { name: "之字山道", art: "map_2", key: [[200, 322], [200, 452]], paths: [
      [[412, 73], [80, 73], [80, 195], [322, 195], [322, 318], [200, 322], [200, 452], G0],
      [[80, -12], [80, 73], [80, 195], [322, 195], [322, 318], [200, 322], [200, 452], G0],
      [[-12, 195], [80, 195], [322, 195], [322, 318], [200, 322], [200, 452], G0],
      [[412, 73], [322, 73], [322, 195], [322, 318], [200, 322], [200, 452], G0],
      [[322, -12], [322, 195], [322, 318], [200, 322], [200, 452], G0]], names: ["右上側", "左上", "左側", "右上側", "右上"],
      slots: [[162, 378], [233, 378], [41, 56], [41, 149], [184, 156], [286, 151], [356, 122], [53, 234], [146, 239], [264, 239], [361, 293], [322, 373]] },
    { name: "城內街市", art: "map_3", key: [[201, 386], [200, 452]], paths: [
      [[112, -12], [112, 342], [201, 386], [200, 452], G0],
      [[291, -12], [291, 342], [201, 386], [200, 452], G0],
      [[-12, 120], [291, 120], [291, 342], [201, 386], [200, 452], G0],
      [[412, 244], [112, 244], [112, 342], [201, 386], [200, 452], G0],
      [[412, 120], [291, 120], [291, 244], [112, 244], [112, 342], [201, 386], [200, 452], G0]], names: ["左上", "右上", "左側", "右側", "右上側"],
      slots: [[164, 415], [238, 415], [70, 52], [330, 155], [70, 244], [205, 210], [330, 312], [250, 52], [150, 316], [236, 282], [171, 80], [89, 374]] },
    { name: "邊塞關隘", art: "map_4", artK: 1.1, key: [[196, 397], [200, 452]], paths: [
      [[86, -12], [86, 340], [196, 397], [200, 452], G0],
      [[196, -12], [196, 397], [200, 452], G0],
      [[315, -12], [315, 340], [196, 397], [200, 452], G0],
      [[-12, 157], [86, 157], [86, 340], [196, 397], [200, 452], G0],
      [[412, 157], [315, 157], [315, 340], [196, 397], [200, 452], G0]], names: ["左上", "正上", "右上", "左側", "右側"],
      slots: [[161, 412], [235, 412], [36, 56], [244, 56], [156, 136], [364, 121], [276, 175], [364, 242], [34, 279], [244, 268], [141, 322], [349, 367]] },
    { name: "雪原關山", art: "map_5", dim: 0.16, ez: 0.75,   // ez：這張圖左右兩路離城門很近，敵軍兵力打折（★）
      key: [[199, 386], [200, 452]], paths: [
      [[44, -12], [63, 49], [196, 203], [104, 312], [199, 386], [200, 452], G0],
      [[361, -12], [339, 54], [196, 203], [291, 312], [199, 386], [200, 452], G0],
      [[199, -12], [196, 203], [291, 312], [199, 386], [200, 452], G0],
      [[-12, 312], [104, 312], [199, 386], [200, 452], G0],
      [[412, 312], [291, 312], [199, 386], [200, 452], G0]], names: ["左上", "右上", "正上", "左側", "右側"],
      slots: [[160, 420], [238, 420], [240, 51], [39, 95], [276, 237], [53, 281], [361, 95], [349, 361], [119, 185], [131, 76], [92, 364]] }
  ];
  M.LAYOUTS = LAYOUTS;
  M.genMap = function (stage) {
    stage = stage || 1;
    var r = mrnd(stage + 1000), R = function (a, b) { return Math.round(a + (b - a) * r()); };
    var n = LAYOUTS.length, idx = (stage - 1) % n, mir = Math.floor((stage - 1) / n) % 2 === 1, L = LAYOUTS[idx], src = L;
    var fx = function (q) { return [mir ? M.W - q[0] : q[0], q[1]]; };
    var rot = Math.floor((stage - 1) / (2 * n)) % 5, rotA = function (a) { return a.slice(rot).concat(a.slice(0, rot)); };   // ★ 六張圖輪完、鏡像再輪完之後（第 13 關起）同一張圖再輪，但各入口出的兵換位置
    var paths = rotA(src.paths).map(function (p) { return p.map(fx); }), key = src.key.map(fx), lake = L.lake ? [mir ? M.W - L.lake[0] : L.lake[0], L.lake[1], L.lake[2], L.lake[3]] : null;
    var names = rotA(src.names).map(function (s) { return mir ? s.replace(/[左右]/g, function (c) { return c === "左" ? "右" : "左"; }) : s; });
    var pts = paths.map(cut), all = []; pts.forEach(function (P) { for (var i = 0; i < P.length; i += 2) all.push(P[i]); });
    var near = function (x, y) { var m = 1e9; all.forEach(function (q) { var d = Math.hypot(q.x - x, q.y - y); if (d < m) m = d; }); return m; };
    var inLake = function (x, y, pad) { return lake && Math.pow((x - lake[0]) / (lake[2] + pad), 2) + Math.pow((y - lake[1]) / (lake[3] + pad), 2) < 1; };
    // 要衝：所有路線最後共用的那一段，兩側各一
    var K0 = key[0], K1 = key[1], kx = K0[0] + (K1[0] - K0[0]) * 0.4, ky = K0[1] + (K1[1] - K0[1]) * 0.4, tl = Math.hypot(K1[0] - K0[0], K1[1] - K0[1]), nx = (K1[1] - K0[1]) / tl, ny = -(K1[0] - K0[0]) / tl;
    var slots = [[Math.round(kx - nx * 37), Math.round(ky - ny * 37)], [Math.round(kx + nx * 37), Math.round(ky + ny * 37)]];
    if (L.slots) slots = L.slots.map(fx);   // 手繪地圖：營寨位置是對著圖擺的，前兩個是要衝
    // 其他營寨：沿每條路兩側 40 的位置取候選，再挑分散的 10 個
    var cand = [];
    pts.forEach(function (P) {
      for (var i = 10; i < P.length - 2; i += 6) {
        var a = P[i], b = P[i + 1]; if (a.y > 420) break;
        var dx = b.x - a.x, dy = b.y - a.y, L2 = Math.hypot(dx, dy) || 1;
        [1, -1].forEach(function (sd) {
          var x = a.x - dy / L2 * 40 * sd, y = a.y + dx / L2 * 40 * sd;
          if (x < 30 || x > M.W - 30 || y < 46 || y > 430 || inLake(x, y, 14)) return;
          var d = near(x, y); if (d < 31 || d > 43) return;
          cand.push([Math.round(x), Math.round(y)]);
        });
      }
    });
    var far = function (c) { var m = 1e9; slots.forEach(function (q) { var d = Math.hypot(q[0] - c[0], q[1] - c[1]); if (d < m) m = d; }); return m; };
    while (!L.slots && slots.length < 12 && cand.length) {
      var bi = -1, bd = 50; cand.forEach(function (c, i) { var d = far(c) + r() * 6; if (d > bd) { bd = d; bi = i; } });
      if (bi < 0) break; slots.push(cand[bi]); cand.splice(bi, 1);
    }
    // 裝飾：樹、山石，離路、營寨、湖遠一點
    var deco = [], tries = 0;
    while (deco.length < 24 && tries++ < 500) {
      var x = R(8, M.W - 8), y = R(14, 452); if (near(x, y) < 30 || inLake(x, y, 10)) continue;
      if (slots.some(function (q) { return Math.hypot(q[0] - x, q[1] - y) < 26; })) continue;
      if (deco.some(function (q) { return Math.hypot(q.x - x, q.y - y) < 20; })) continue;
      deco.push({ x: x, y: y, k: r() < 0.82 ? "tree" + (1 + Math.floor(r() * 4)) : "rock", s: 0.8 + r() * 0.5 });
    }
    deco.sort(function (a, b) { return a.y - b.y; });
    return { stage: stage, name: L.name, layout: idx, mirror: mir, paths: paths, pts: pts, slots: slots, key: [0, 1], names: names, deco: deco, lake: lake, theme: (stage - 1) % 4, art: L.art || null, artK: L.artK || 1, dim: L.dim || 0, ez: L.ez || 1 };
  };
  M.useMap = function (map) { M.MAP = map; M.PATHS = map.paths; M.PTS = map.pts; M.SLOTS = map.slots; M.KEY = map.key; M.GATE_NAMES = map.names; };
  M.useMap(M.genMap(1));
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
  M.STAGE_HP = 1.04; M.STAGE_ATK = 1.015; M.STAGE1 = 1;   // ★ 武將不會死之後重新抓的難度：每關敵軍兵力 ×1.04
  M.stageMul = function (n) { return { hp: M.STAGE1 * Math.pow(M.STAGE_HP, n - 1), atk: Math.pow(M.STAGE_ATK, n - 1) }; };
  M.SPIN_COST = 10;
  M.FOOD0 = 80;
  M.REPAIR_COST = 150;
  M.START_DEPLOY = 3;
  M.ROSTER_MAX = 5;
  M.STAR_ATK = [1, 1.5, 2.1, 2.8, 3.6];
  // ✅ Jay 2026-11-23：不看卡片三圍。同兵種的武將基礎一樣強，差別只在招式；強弱靠拉霸（升星、符號）跟特技
  // ✅ 正式規則：SR 以上武將才能上場，要有 5 名 SR 以上才開放這個模式。★ 試玩版先不擋
  M.BASE_ATK = { "槍": 540, "騎": 670, "刺": 615, "弓": 430, "法": 385 };
  M.NEED_SR = 5;
  // ✅ 試玩版：只有這 10 位可以選，不管有沒有卡
  M.TRIAL = ["曹操", "張飛", "關羽", "呂布", "甘寧", "賈詡", "黃忠", "孫尚香", "周瑜", "司馬懿"];
  // ✅ 特技：出手累積集氣，集滿就放（自動或手動）。★ 招式內容與數值是開發先配的；時間是引擎秒（一般速度下實際是 2 倍）
  M.SKILL = {
    "曹操": { id: "caocao", name: "挾天子", need: 10, kind: "團隊", desc: "全軍攻擊 +30%，持續 8 秒" },
    "張飛": { id: "zhangfei", name: "當陽怒吼", need: 10, kind: "攻擊", desc: "周圍敵軍受 150% 傷害並嚇停 3 秒" },
    "關羽": { id: "guanyu", name: "斬六將", need: 12, kind: "攻擊", desc: "連斬 6 刀，每刀 200%" },
    "呂布": { id: "lvbu", name: "無雙", need: 12, kind: "個人", desc: "自己攻擊、攻速都變 2 倍，持續 6 秒" },
    "甘寧": { id: "ganning", name: "百騎劫營", need: 20, kind: "攻擊", desc: "突襲全場最強的敵人（敵將優先），800% 傷害" },
    "賈詡": { id: "jiaxu", name: "毒計", need: 20, kind: "攻擊", desc: "大範圍敵軍中毒 8 秒：持續掉血、走路變慢" },
    "黃忠": { id: "huangzhong", name: "百步穿楊", need: 10, kind: "攻擊", desc: "一箭貫穿整條路上的敵軍，300% 傷害" },
    "孫尚香": { id: "sunshangxiang", name: "弓腰姬", need: 10, kind: "團隊", desc: "全軍攻速 +50%，持續 8 秒" },
    "周瑜": { id: "zhouyu", name: "火燒赤壁", need: 8, kind: "攻擊", desc: "在敵軍最多的地方放火海，燒 5 秒" },
    "司馬懿": { id: "simayi", name: "鬼謀", need: 8, kind: "團隊", desc: "全場敵軍走路變慢一半，持續 6 秒" }
  };
  M.SK_ATK = 1.3; M.SK_ATK_T = 4; M.SK_SPD = 1.5; M.SK_SPD_T = 4; M.SK_RAGE_T = 3; M.SK_PSN_T = 4; M.SK_PSN_D = 0.3; M.SK_PSN_SLOW = 0.7; M.SK_FIRE_T = 2.5; M.SK_FIRE_D = 0.8; M.SK_FIRE_R = 48; M.SK_SLOW = 0.5; M.SK_SLOW_T = 3;
  // ✅ Jay 2026-11-23：武將不會死；敵將的招式是上 DEBUFF（遲緩＝攻速減半、麻痹＝不能出手）
  // ★ 小招每隔 cd 秒對最近的武將放；大招在血量掉到一半時放一次，之後每 BOSS_ULT_CD 秒再放一次
  M.BOSS_SK = {
    "張寶": { cd: 4, sk: "妖術", deb: "slow", t: 2, ult: "妖術迷陣", ultDesc: "全軍麻痹 3 秒，並召來黃巾兵" },
    "張角": { cd: 4, sk: "落雷", deb: "stun", t: 1.5, ult: "黃天當立", ultDesc: "全軍遲緩 8 秒，黃巾兵全部加速" }
  };
  M.BOSS_ULT_HP = 0.5; M.BOSS_ULT_CD = 10; M.BOSS_RNG = 140; M.ULT_STUN = 1.5; M.ULT_SLOW = 4; M.ULT_HASTE = 1.5; M.ULT_SUMMON = 6;
  // 射程、攻擊間隔（引擎秒；一般速度下實際秒數是 2 倍）、可擋幾個敵人
  // ★ 節奏調慢後武將的出手頻率維持原本的實際秒數（槍兵每秒 1 下），慢下來的是敵軍行軍
  M.TYPE = {
    "槍": { rng: 60, cd: 0.5, block: 3 },
    "騎": { rng: 75, cd: 0.4, block: 1 },
    "刺": { rng: 60, cd: 0.25 },            // ✅ Jay 2026-11-23：刺客不暴擊，攻速是一般的 200%
    "弓": { rng: 125, cd: 0.5 },
    "法": { rng: 105, cd: 0.75, splash: 34 }
  };

  // ✅ Jay 2026-11-23：敵兵不同兵種要有不同數值、種類更多變；第 1 關只有一種兵、第 2 關兩種……（★ 每過一關多開一種，數值與特性是開發配的）
  // cnt＝同一批出兵時的數量倍率（血厚的少一點）；noblock＝擋不住；armor＝弓兵、法師對他的傷害倍率；heal＝幫周圍補血；gate＝到城門扣幾次；solo＝數量不乘倍率
  M.ENEMY = {
    spear: { name: "黃巾槍兵", hp: 819, atk: 62, spd: 30, food: 4, cnt: 1, tip: "最普通的黃巾兵，人多。" },
    cav: { name: "黃巾騎兵", hp: 620, atk: 83, spd: 58, food: 5, cnt: 0.8, tip: "跑得快、血少。我方騎兵打小兵傷害 ×1.5，最適合對付。" },
    bow: { name: "黃巾弓兵", hp: 520, atk: 52, spd: 34, food: 3, cnt: 1.3, tip: "血最少，但一來就是一大群。法師的濺射、「雷」最好清。" },
    shield: { name: "黃巾盾兵", hp: 1300, atk: 70, spd: 26, food: 7, cnt: 0.7, armor: 0.5, tip: "盾牌擋箭：弓兵、法師打他只有一半傷害，要靠槍兵、騎兵、刺客。" },
    mage: { name: "黃巾道士", hp: 760, atk: 73, spd: 26, food: 6, cnt: 0.6, heal: 0.06, tip: "每隔幾秒幫周圍的黃巾兵補血，越早打掉越好。" },
    dash: { name: "黃巾死士", hp: 480, atk: 60, spd: 66, food: 5, cnt: 0.7, noblock: true, tip: "衝得很快，槍兵、騎兵擋不住。用「石」的落石擋，或靠火力打掉。" },
    brute: { name: "黃巾力士", hp: 2600, atk: 180, spd: 22, food: 9, cnt: 0.5, tip: "走得慢、血很厚，砸落石也特別快。" },
    ram: { name: "衝車", hp: 6500, atk: 300, spd: 16, food: 20, cnt: 1, solo: true, noblock: true, gate: 2, tip: "非常慢、非常硬，擋不住；撞到城門一次扣 2。落石可以拖住它。" }
  };
  M.UNLOCK = ["spear", "cav", "bow", "shield", "mage", "dash", "brute", "ram"];
  M.kinds = function (stage) { return M.UNLOCK.slice(0, Math.max(1, Math.min(M.UNLOCK.length, stage || 1))); };
  M.HEAL_CD = 1.5; M.HEAL_R = 50;
  M.HP_GROW = 1.12;
  M.MINION_HP = 0.43; M.MINION_N = 3; M.MINION_FOOD = 1 / 3;   // ✅ Jay 2026-11-23：小兵血量減 2/3、數量加一倍。★ 武將不會死之後再調：數量再多一半、血量 ×1.3、軍糧總量不變
  M.BOSSES = { boss1: { gen: "張寶", hp: 35000, atk: 260, walk: 28, food: 80 }, boss2: { gen: "張角", hp: 112000, atk: 400, walk: 40, food: 120 } };
  M.BOSS = M.BOSSES.boss2;
  M.WAVE_NAMES = ["敵軍先鋒", "敵軍本陣"];
  M.SYM = ["火", "雷", "風", "石", "令"];   // 5 以後是出征名單上的武將
  M.HIT_P = 0.33;          // 每轉一次中獎機率
  M.HIT2_P = 0.12;         // 中獎時同時連出兩條
  M.HIT_W = { "火": 1, "雷": 1, "風": 1, "石": 1, gen: 2.4 };   // 中獎時連出哪一種
  M.JACK2 = 0.5; M.JACK3 = 0.01;   // 每一局：第一位必出，第二位 50%，第三位 1%
  M.JACK_EARLY = 0.15; M.JACK_T = [15, 42]; M.JACK_GAP = [18, 40];   // ✅ Jay 2026-11-23：助陣太早出來 → 開戰 30 秒內出現的機率降到 15%（★），其餘落在 30～84 秒；下一位再隔 36～80 秒（引擎秒＝一半）
  M.BOSS_CD = 1.5;   // ✅ Boss 每 3 秒攻擊一次（一般速度下；引擎時間是它的一半，見 M.SPEED）
  M.SPEED = 0.5;     // ✅ Jay 2026-11-23：節奏調慢一倍；地圖上的「×2」鍵切回兩倍速
  M.SIN_BOSS = 2; M.CAV_MINION = 1.5;   // ✅ Jay 2026-11-23：刺客打 Boss 攻擊 2 倍、騎兵打小兵 1.5 倍
  M.WILD = 4; M.GEN0 = 5;
  M.FIRE_T = 5; M.FIRE_ATK = 1.2; M.BURN_P = 0.10; M.BURN_TICK = 0.75; M.BURN_T = 4.5;   // 一般速度下：火箭 10 秒、每 1.5 秒燒一次、燒 9 秒
  M.THUNDER_MUL = 3; M.STUN = 1;   // 一般速度下停頓 2 秒
  M.ROCK_MUL = 2; M.ROCK_HP = 5; M.ROCK_R = 26;
  M.WIND_T = 5; M.WIND = 3;   // ✅ Jay 2026-11-23：風＝攻速 300%、10 秒（一般速度）；攻速不累加、時間累加

  // 兩大波的出兵表：[秒, 入口, 兵種, 數量, 間隔, 強度等級]
  M.WAVES = [
    [[0, 1, "spear", 6, 1.6, 1], [6, 0, "spear", 5, 1.6, 2], [12, 2, "spear", 5, 1.6, 2], [20, 3, "cav", 4, 1.2, 3], [24, 4, "cav", 4, 1.2, 3],
     [32, 0, "spear", 5, 1.4, 4], [36, 2, "bow", 5, 1.4, 4], [44, 1, "shield", 3, 3, 5], [50, 3, "spear", 6, 1.2, 5], [54, 4, "spear", 6, 1.2, 5], [39, 1, "boss1", 1, 1, 5],
     [16, 2, "dash", 4, 1, 3], [46, 0, "brute", 3, 2, 5]],
    [[0, 0, "mage", 4, 2, 6], [0, 2, "mage", 4, 2, 6], [10, 1, "cav", 8, 0.8, 6], [18, 3, "spear", 8, 1, 7], [22, 4, "spear", 8, 1, 7], [30, 1, "shield", 4, 2.5, 7],
     [40, 0, "cav", 6, 0.8, 8], [43, 2, "cav", 6, 0.8, 8], [50, 1, "bow", 8, 1, 8], [58, 3, "shield", 3, 2, 9], [64, 0, "mage", 6, 1.2, 9], [64, 2, "mage", 6, 1.2, 9],
     [74, 4, "cav", 8, 0.7, 10], [82, 0, "spear", 8, 1, 10], [82, 2, "spear", 8, 1, 10], [90, 1, "shield", 4, 2, 10], [60, 1, "boss2", 1, 1, 10],
     [26, 0, "dash", 6, 0.8, 7], [34, 3, "brute", 4, 1.5, 8], [48, 2, "ram", 1, 1, 9], [70, 1, "brute", 4, 1.5, 9], [78, 3, "ram", 1, 1, 10]]
  ];
  M.WAVE_K = [22 / 62, 38 / 96];   // ★ 出兵時間壓縮：整局（一般速度）約 3 分鐘，配合 BGM 長度
  M.TACTICS = [
    { id: "bowrng", name: "強弓", desc: "弓兵射程 +20%" },
    { id: "spearhp", name: "堅陣", desc: "槍兵多擋 1 個敵人" },
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
  M.owned = function () { return M.TRIAL.map(function (n) { return SG.GEN[n]; }).filter(function (c) { return c && c.art; }); };
  M.defaultList = function (S) {
    var own = M.owned(), d = M.data(S);
    var keep = (d.list || []).map(function (id) { return SG.CARD_BY_ID[id]; }).filter(function (c) { return c && own.indexOf(c) >= 0; });
    ["關羽", "黃忠", "周瑜", "張飛", "甘寧"].forEach(function (n) { var c = SG.GEN[n]; if (keep.length < M.ROSTER_MAX && c && keep.indexOf(c) < 0) keep.push(c); });
    return keep.slice(0, M.ROSTER_MAX);
  };

  // ===== 引擎 =====
  function genStats(c, S) {
    return { atk: M.BASE_ATK[c.typ] };
  }
  M.newGame = function (list, S, rnd, stage) {
    rnd = rnd || Math.random; stage = stage || 1;
    M.useMap(M.genMap(stage));
    var G = {
      t: 0, rnd: rnd, lives: M.LIVES, food: M.FOOD0, wave: 0, phase: "deploy", waveT: 0, queue: [], over: false, won: false,
      gens: [], reserve: [], enemies: [], rocks: [], zones: [], fx: [], tac: {}, fireT: 0, windT: 0, atkBuffT: 0, spdBuffT: 0, eSlowT: 0, hasteT: 0, autoSkill: true, nid: 1, kills: 0, spins: 0, grid: [], hits: [], S: S,
      list: list, stage: stage, sm: M.stageMul(stage)
    };
    G.sm.hp *= M.MAP.ez;
    list.forEach(function (c) { var s = genStats(c, S); G.reserve.push({ c: c, base: s }); });
    G.deployLeft = M.START_DEPLOY;
    G.nsym = M.GEN0 + list.length;
    G.jackN = 1 + (rnd() < M.JACK2 ? 1 : 0) + (rnd() < M.JACK3 ? 1 : 0); G.jackDone = 0;
    G.jackAt = rnd() < M.JACK_EARLY ? 6 + rnd() * 9 : M.JACK_T[0] + rnd() * (M.JACK_T[1] - M.JACK_T[0]);
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
    if (G.atkBuffT > 0) a *= M.SK_ATK;
    if (g.rageT > 0) a *= 2;
    return a;
  }
  M.genAtk = genAtk;
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
    if (G.spdBuffT > 0) cd /= M.SK_SPD;
    if (g.rageT > 0) cd /= 2;
    if (g.slowT > 0) cd *= 2;
    return cd;
  }

  // 佈陣／換位：把待命武將（reserve 索引）放到營寨；或把場上武將移到另一個空營寨
  M.slotFree = function (G, si) { return !G.gens.some(function (g) { return g.slot === si; }); };
  M.place = function (G, ri, si) {
    if (!M.slotFree(G, si) || !G.reserve[ri]) return false;
    if (G.phase === "deploy" && G.deployLeft <= 0) return false;
    if (G.phase !== "deploy" && !G.reserve[ri].ready) return false;
    var r = G.reserve.splice(ri, 1)[0];
    var g = { id: G.nid++, c: r.c, base: r.base, slot: si, star: r.star || 1, cd: 0, ch: 0, slowT: 0, stunT: 0, rageT: 0, guest: !!r.guest };
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
    var K = M.WAVE_K[G.wave - 1];
    var ok = M.kinds(G.stage);
    M.WAVES[G.wave - 1].forEach(function (e, ei) {
      if (M.BOSSES[e[2]]) { G.queue.push({ at: e[0] * K, gate: e[1], k: e[2], lvl: e[5] }); return; }
      var k = e[2], D0 = M.ENEMY[k];
      if (ok.indexOf(k) < 0) { if (M.UNLOCK.indexOf(k) >= 5) return; k = ok[ei % ok.length]; }   // 還沒開放：新兵種整批不出；原本五種換成已開放的
      var D = M.ENEMY[k], n = D.solo ? e[3] : Math.max(1, Math.round(e[3] / D0.cnt * M.MINION_N * D.cnt)), gap = Math.max(0.25, e[3] * e[4] * K / n);
      for (var i = 0; i < n; i++) G.queue.push({ at: e[0] * K + i * gap, gate: e[1], k: k, lvl: e[5] });
    });
    G.queue.sort(function (a, b) { return a.at - b.at; });
    G.fx.push({ t: G.t, kind: "wave", wave: G.wave });
  }
  function spawn(G, q) {
    var e, lvl = q.lvl || G.wave, mul = Math.pow(M.HP_GROW, lvl - 1);
    if (M.BOSSES[q.k]) {
      var B = M.BOSSES[q.k], bc = SG.GEN[B.gen];
      e = { boss: true, big: q.k === "boss2", name: B.gen, art: bc && bc.art, hp: B.hp * G.sm.hp, atk: B.atk * G.sm.atk, spd: M.PTS[q.gate].len / B.walk, food: B.food };   // 不管路多長，Boss 都走一樣久
      G.fx.push({ t: G.t, kind: "boss", name: B.gen, art: e.art, big: e.big });
    } else {
      var d = M.ENEMY[q.k];
      e = { k: q.k, name: d.name, noblock: d.noblock, armor: d.armor, heal: d.heal, gate: d.gate, healT: M.HEAL_CD * G.rnd(), hp: d.hp * M.MINION_HP * mul * G.sm.hp, atk: d.atk * Math.pow(1.1, lvl - 1) * G.sm.atk, spd: d.spd * (0.92 + G.rnd() * 0.16) * Math.max(0.85, Math.min(1.9, M.PTS[q.gate].len / 520)), food: d.food * M.MINION_FOOD };
    }
    e.id = G.nid++; e.max = e.hp; e.path = q.gate; e.s = q.s0 || 0; e.cd = 0; e.stun = 0; e.burn = 0; e.burnD = 0; e.burnTick = 0; e.psn = 0; e.psnD = 0; e.psnTick = 0; e.block = null;
    if (e.boss) { e.skT = M.BOSS_SK[e.name].cd; e.castT = 0; e.ultDone = false; e.ultT = 0; }
    var p = posAt(e.path, e.s); e.x = p.x; e.y = p.y;
    if (!e.boss) { G.seenK = G.seenK || {}; if (!G.seenK[e.k]) { G.seenK[e.k] = 1; G.fx.push({ t: G.t, kind: "newenemy", k: e.k }); } }
    G.enemies.push(e);
  }

  // ===== 拉霸 =====
  M.spinCost = function (G) { return Math.round(M.SPIN_COST * (1 - 0.25 * (G.tac.cheap || 0))); };
  M.canSpin = function (G) { return !G.over && G.phase === "fight" && G.food >= M.spinCost(G); };
  M.spin = function (G) {
    if (!M.canSpin(G)) return null;
    G.food -= M.spinCost(G); G.spins++;
    var r = G.rnd(), forceJack = G.jackDone < G.jackN && G.t >= G.jackAt;
    if (forceJack) { G.jackDone++; G.jackAt = G.t + M.JACK_GAP[0] + G.rnd() * (M.JACK_GAP[1] - M.JACK_GAP[0]); }
    G.grid = forceJack ? hitGrid(G, 1, M.WILD) : r < M.HIT_P ? hitGrid(G, G.rnd() < M.HIT2_P ? 2 : 1) : missGrid(G);
    G.hits = evalGrid(G, G.grid);
    return G.hits;
  };
  M.applyHits = function (G, hits) {
    var out = [];
    (hits || []).forEach(function (h) { out.push(trigger(G, h)); });
    return out;
  };
  function ofType(G, t) { return G.gens.filter(function (g) { return g.c.typ === t; }); }
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
    if (sym === "風") { G.windT += M.WIND_T; G.fx.push({ t: G.t, kind: "wind" }); return { sym: sym }; }
    if (h.sym >= M.GEN0) {   // 武將連線：還沒上陣的可以上陣；已上陣的升星
      var c = G.list[h.sym - M.GEN0], f = G.gens.find(function (g) { return g.c === c; }), r = G.reserve.find(function (x) { return x.c === c; });
      if (f) {
        if (f.star < 5) f.star++;
        var p = M.SLOTS[f.slot]; G.fx.push({ t: G.t, kind: "up", x: p[0], y: p[1], star: f.star }); return { sym: c.gen, up: c.gen, star: f.star };
      }
      if (r) { if (r.ready) { r.star = Math.min(5, (r.star || 1) + 1); return { sym: c.gen, ready: c.gen, star: r.star }; } r.ready = true; G.fx.push({ t: G.t, kind: "ready", name: c.gen }); return { sym: c.gen, ready: c.gen }; }
      return { sym: c.gen };
    }
    return { sym: sym };
  }
  // 三個「令」＝名將助陣。✅ 試玩版只有 10 位武將，所以助陣的是沒被選去出征的那幾位（★）
  function jackpot(G) {
    var taken = {};
    G.list.forEach(function (c) { taken[c.gen] = 1; }); G.gens.forEach(function (g) { taken[g.c.gen] = 1; }); G.reserve.forEach(function (r) { taken[r.c.gen] = 1; });
    var pool = M.owned().filter(function (c) { return !taken[c.gen]; }), got = [];
    if (pool.length) {
      var c = pool[Math.floor(G.rnd() * pool.length)];
      G.reserve.push({ c: c, base: genStats(c), ready: true, guest: true });
      got.push(c.gen);
    }
    G.fx.push({ t: G.t, kind: "jackpot", names: got });
    return { sym: "令", jackpot: true, guests: got };
  }
  function dropRock(G, g) {
    // ✅ Jay 2026-11-23：石頭放在那位武將的前面（離他最近的路上，往敵軍來的方向一點），同時兩條「石」就在同一點丟兩顆
    var sp = M.SLOTS[g.slot], best = null, bd = genRng(G, g) + 20;
    M.PTS.forEach(function (P) {
      for (var i = 0; i < P.length; i++) { var q = P[i], d = Math.hypot(q.x - sp[0], q.y - sp[1]); if (d < bd) { bd = d; best = { P: P, i: i }; } }
    });
    if (best) { var fi = Math.max(0, best.i - 4), fq = best.P[fi]; best = { x: fq.x, y: fq.y }; }
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
    G.phase = "fight"; G.offer = null; nextWave(G); return true;
  };

  function hurt(G, e, d, kind) {
    if (e.hp <= 0) return;
    if (e.armor && (G._src === "弓" || G._src === "法")) d *= e.armor;   // 盾兵擋箭
    if (G.stat && G._src) { var k0 = G._src + (e.boss ? "B" : "M"); G.stat[k0] = (G.stat[k0] || 0) + Math.min(d, e.hp); }
    e.hp -= d; G.fx.push({ t: G.t, kind: "dmg", x: e.x, y: e.y, v: Math.round(d), c: kind });
    if (e.hp <= 0) { G.kills++; G.foodF = (G.foodF || 0) + e.food * (1 + 0.4 * (G.tac.food || 0)); var fi = Math.floor(G.foodF); G.foodF -= fi; G.food += fi; G.fx.push({ t: G.t, kind: "die", x: e.x, y: e.y }); }
  }

  // ===== 特技與敵將招式 =====
  function debuff(G, g, kind, t) {
    if (kind === "slow") g.slowT = Math.max(g.slowT, t); else g.stunT = Math.max(g.stunT, t);
    var p = M.SLOTS[g.slot]; G.fx.push({ t: G.t, kind: "debuff", d: kind, x: p[0], y: p[1], gid: g.id });
  }
  function bossSkill(G, e) {   // 小招：最近的一位武將
    var B = M.BOSS_SK[e.name], near = null, nd = M.BOSS_RNG;
    G.gens.forEach(function (g) { var sp = M.SLOTS[g.slot], d = Math.hypot(sp[0] - e.x, sp[1] - e.y); if (d < nd) { nd = d; near = g; } });
    if (!near) return false;
    var np = M.SLOTS[near.slot];
    debuff(G, near, B.deb, B.t); e.castT = 0.35; e.castAt = G.t;
    G.fx.push({ t: G.t, kind: "bosscast", name: e.name, sk: B.sk, d: B.deb, x: e.x, y: e.y, x1: np[0], y1: np[1] });
    return true;
  }
  function bossUlt(G, e) {     // 大招：全軍
    var B = M.BOSS_SK[e.name];
    e.castT = 0.9; e.castAt = G.t; e.ultN = (e.ultN || 0) + 1;
    if (e.name === "張寶") {
      G.gens.forEach(function (g) { debuff(G, g, "stun", M.ULT_STUN); });
      for (var i = 0; i < M.ULT_SUMMON; i++) spawn(G, { gate: e.path, k: "spear", lvl: 5, s0: Math.max(0, e.s - 8 - i * 9) });
    } else {
      G.gens.forEach(function (g) { debuff(G, g, "slow", M.ULT_SLOW); });
      G.hasteT = Math.max(G.hasteT, M.ULT_SLOW);
    }
    G.fx.push({ t: G.t, kind: "bossult", name: e.name, sk: B.ult, x: e.x, y: e.y });
  }
  function typeMul(g, e) { return g.c.typ === "刺" && e.boss ? M.SIN_BOSS : g.c.typ === "騎" && !e.boss ? M.CAV_MINION : 1; }
  function prog(e) { return e.s / M.PTS[e.path].len; }
  // 放特技；沒有對象就先不放（集氣留著）
  function castSkill(G, g) {
    var K = M.SKILL[g.c.gen]; if (!K) return false;
    var sp = M.SLOTS[g.slot], a = genAtk(G, g), r = genRng(G, g), live = G.enemies.filter(function (e) { return e.hp > 0 && e.y >= 0; });
    if (!live.length) return false;
    var near = function (m) { return live.filter(function (e) { return Math.hypot(e.x - sp[0], e.y - sp[1]) <= r * m; }); };
    var fx = { t: G.t, kind: "skill", gid: g.id, gen: g.c.gen, id: K.id, name: K.name, x: sp[0], y: sp[1], r: r }, L, tg;
    G._src = g.c.typ;
    if (K.id === "caocao") { if (!near(1.5).length) return false; G.atkBuffT = Math.max(G.atkBuffT, M.SK_ATK_T); }
    else if (K.id === "sunshangxiang") { if (!near(1.2).length) return false; G.spdBuffT = Math.max(G.spdBuffT, M.SK_SPD_T); }
    else if (K.id === "simayi") { G.eSlowT = Math.max(G.eSlowT, M.SK_SLOW_T); }
    else if (K.id === "lvbu") { if (!near(1.1).length) return false; g.rageT = Math.max(g.rageT, M.SK_RAGE_T); }
    else if (K.id === "zhangfei") {
      L = near(1.6); if (!L.length) return false; fx.r = r * 1.6;
      L.forEach(function (e) { hurt(G, e, a * 1.5, "skill"); e.stun = Math.max(e.stun, e.boss ? 0.5 : 1.5); });
    } else if (K.id === "guanyu") {
      if (!near(1.3).length) return false; fx.hits = [];
      for (var k = 0; k < 6; k++) {
        tg = null; near(1.3).forEach(function (e) { if (e.hp > 0 && (!tg || prog(e) > prog(tg))) tg = e; });
        if (!tg) break; fx.hits.push([tg.x, tg.y]); hurt(G, tg, a * 2 * typeMul(g, tg), "skill");
      }
    } else if (K.id === "ganning") {
      tg = null; live.forEach(function (e) { if (!tg || (e.boss ? 1e9 : 0) + e.hp > (tg.boss ? 1e9 : 0) + tg.hp) tg = e; });
      fx.x1 = tg.x; fx.y1 = tg.y; hurt(G, tg, a * 8 * typeMul(g, tg), "skill");
    } else if (K.id === "jiaxu") {
      L = near(2); if (!L.length) return false; fx.r = r * 2;
      L.forEach(function (e) { e.psn = M.SK_PSN_T; e.psnD = Math.max(e.psnD, a * M.SK_PSN_D); });
    } else if (K.id === "huangzhong") {
      L = near(1.6); if (!L.length) return false;
      tg = L[0]; L.forEach(function (e) { if (prog(e) > prog(tg)) tg = e; });
      var far = tg; L.forEach(function (e) { if (e.path === tg.path) { hurt(G, e, a * 3, "skill"); if (prog(e) < prog(far)) far = e; } });
      fx.x1 = tg.x; fx.y1 = tg.y; fx.x2 = far.x; fx.y2 = far.y;
    } else if (K.id === "zhouyu") {
      L = near(1.5); if (!L.length) return false;
      var bn = -1; L.forEach(function (e) { var n = 0; live.forEach(function (o) { if (Math.hypot(o.x - e.x, o.y - e.y) < M.SK_FIRE_R) n++; }); if (n > bn || (n === bn && prog(e) > prog(tg))) { bn = n; tg = e; } });
      G.zones.push({ x: tg.x, y: tg.y, r: M.SK_FIRE_R, t: M.SK_FIRE_T, d: a * M.SK_FIRE_D, tick: 0 }); fx.x1 = tg.x; fx.y1 = tg.y;
    }
    G.fx.push(fx);
    return true;
  }
  // 手動放特技（集滿才有用；沒有對象時會等到有對象再放）
  M.skillReady = function (g) { var K = M.SKILL[g.c.gen]; return !!K && g.ch >= K.need; };
  M.cast = function (G, gid) { var g = G.gens.find(function (x) { return x.id === gid; }); if (!g || !M.skillReady(g)) return false; g.want = true; return true; };

  // ===== 每一幀 =====
  M.step = function (G, dt) {
    if (G.over || G.phase !== "fight") return;
    G.t += dt; G.waveT += dt;
    ["fireT", "windT", "atkBuffT", "spdBuffT", "eSlowT", "hasteT"].forEach(function (k) { G[k] = Math.max(0, G[k] - dt); });
    while (G.queue.length && G.queue[0].at <= G.waveT) spawn(G, G.queue.shift());

    // 攔截名額
    var blocks = {};
    G.gens.forEach(function (g) { blocks[g.id] = 0; g.slowT = Math.max(0, g.slowT - dt); g.stunT = Math.max(0, g.stunT - dt); g.rageT = Math.max(0, g.rageT - dt); });
    G.enemies.forEach(function (e) { if (e.block) { var b = G.gens.find(function (g) { return g.id === e.block; }); if (!b || e.hp <= 0) e.block = null; else blocks[b.id]++; } });

    // 火海
    G.zones.forEach(function (z) {
      z.t -= dt; z.tick -= dt;
      if (z.tick <= 0) { z.tick += 0.5; G._src = "法"; G.enemies.forEach(function (e) { if (e.hp > 0 && Math.hypot(e.x - z.x, e.y - z.y) <= z.r) hurt(G, e, z.d, "burn"); }); }
    });
    G.zones = G.zones.filter(function (z) { return z.t > 0; });

    // 敵軍移動
    G.enemies.forEach(function (e) {
      if (e.hp <= 0) return;
      if (e.burn > 0) { e.burn -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick += M.BURN_TICK; G._src = "弓"; hurt(G, e, e.burnD, "burn"); } }
      if (e.psn > 0) { e.psn -= dt; e.psnTick -= dt; if (e.psnTick <= 0) { e.psnTick += 0.5; G._src = "刺"; hurt(G, e, e.psnD, "psn"); } }
      if (e.hp <= 0) return;
      if (e.stun > 0) { e.stun -= dt; return; }
      var sf = (G.eSlowT > 0 ? M.SK_SLOW : 1) * (e.psn > 0 ? M.SK_PSN_SLOW : 1) * (!e.boss && G.hasteT > 0 ? M.ULT_HASTE : 1);
      // 被槍兵／騎兵攔下（武將不會受傷，攔住的敵人就停在原地）
      if (e.heal) {   // 道士：幫周圍補血
        e.healT -= dt;
        if (e.healT <= 0) { e.healT = M.HEAL_CD; var hn = 0; G.enemies.forEach(function (o) { if (o !== e && !o.boss && o.hp > 0 && o.hp < o.max && Math.hypot(o.x - e.x, o.y - e.y) <= M.HEAL_R) { o.hp = Math.min(o.max, o.hp + o.max * e.heal); hn++; } }); if (hn) G.fx.push({ t: G.t, kind: "heal", x: e.x, y: e.y }); }
      }
      if (!e.block && !e.boss && !e.noblock) {
        G.gens.forEach(function (g) {
          if (e.block) return; var T = M.TYPE[g.c.typ]; if (!T.block) return;
          var cap = T.block + (g.c.typ === "槍" ? (G.tac.spearhp || 0) : 0); if (blocks[g.id] >= cap) return;
          var sp = M.SLOTS[g.slot]; if (Math.hypot(e.x - sp[0], e.y - sp[1]) <= genRng(G, g) * 0.8) { e.block = g.id; blocks[g.id]++; }
        });
      }
      e.cd -= dt;
      if (e.block) return;
      if (e.boss) {
        if (e.castT > 0) { e.castT -= dt; return; }      // 施法中站著不動
        var atGate = e.s >= M.PTS[e.path].len - 6;
        // 大招：血量掉到一半放一次，之後每隔一段時間再放
        if (!e.ultDone && e.hp <= e.max * M.BOSS_ULT_HP) { e.ultDone = true; e.ultT = M.BOSS_ULT_CD; bossUlt(G, e); return; }
        if (e.ultDone) { e.ultT -= dt; if (e.ultT <= 0) { e.ultT = M.BOSS_ULT_CD; bossUlt(G, e); return; } }
        e.skT -= dt; if (e.skT <= 0) { if (bossSkill(G, e)) { e.skT = M.BOSS_SK[e.name].cd; return; } e.skT = 0.5; }
        if (e.cd <= 0) {   // 每 3 秒攻擊一次：到城門前扣城門，被落石擋住就打落石
          var rk = G.rocks.find(function (k) { return Math.hypot(k.x - e.x, k.y - e.y) < 22; });
          if (atGate) { e.cd = M.BOSS_CD; e.hitAt = G.t; G.lives -= 1; G.fx.push({ t: G.t, kind: "gate" }); G.fx.push({ t: G.t, kind: "bosshit", x: e.x, y: e.y }); return; }
          if (rk) { e.cd = M.BOSS_CD; e.hitAt = G.t; rk.hp -= e.atk; G.fx.push({ t: G.t, kind: "bosshit", x: rk.x, y: rk.y }); if (rk.hp <= 0) G.fx.push({ t: G.t, kind: "rockbreak", x: rk.x, y: rk.y }); return; }
        }
        if (atGate) return;
        if (G.rocks.some(function (k) { return Math.hypot(k.x - e.x, k.y - e.y) < 22; })) return;
        var bs = Math.min(M.PTS[e.path].len - 5, e.s + e.spd * sf * dt), bp = posAt(e.path, bs); e.s = bs; e.x = bp.x; e.y = bp.y;
        return;
      }
      // 落石擋路
      var ns = e.s + e.spd * sf * dt, np = posAt(e.path, ns), rock = null;
      G.rocks.forEach(function (k) { if (!rock && k.hp > 0 && Math.hypot(np.x - k.x, np.y - k.y) < 14 && Math.hypot(np.x - k.x, np.y - k.y) < Math.hypot(e.x - k.x, e.y - k.y)) rock = k; });
      if (rock) { if (e.cd <= 0) { e.cd = 0.5; rock.hp -= e.atk; if (rock.hp <= 0) G.fx.push({ t: G.t, kind: "rockbreak", x: rock.x, y: rock.y }); } return; }
      e.s = ns; e.x = np.x; e.y = np.y;
      if (e.s >= M.PTS[e.path].len - 2) {   // 到城門
        e.hp = 0; e.gone = true;
        G.lives -= e.gate || 1; G.fx.push({ t: G.t, kind: "gate" });
      }
    });
    G.rocks = G.rocks.filter(function (k) { return k.hp > 0; });

    // 武將：放特技、出手
    G.gens.forEach(function (g) {
      if (g.stunT > 0) return;                      // 麻痹：不能出手也不能放招
      var K = M.SKILL[g.c.gen];
      if (K && g.ch >= K.need && (G.autoSkill || g.want) && castSkill(G, g)) { g.ch = 0; g.want = false; g.skAt = G.t; }
      g.cd -= dt; if (g.cd > 0) return;
      var sp = M.SLOTS[g.slot], r = genRng(G, g), T = M.TYPE[g.c.typ], tgt = null, best = -1;
      G.enemies.forEach(function (e) {
        if (e.hp <= 0 || e.y < 0) return;
        if (Math.hypot(e.x - sp[0], e.y - sp[1]) > r) return;
        var pr = prog(e) + (e.block === g.id ? 1 : 0);   // 優先打自己擋住的、再來是最接近城門的
        if (e.boss && g.c.typ === "刺") pr += 2;          // ★ 刺客看到敵將就先打敵將（配合「打敵將 ×2」）
        if (pr > best) { best = pr; tgt = e; }
      });
      if (!tgt) return;
      g.cd = genCd(G, g); g.atkT = G.t; if (K) g.ch = Math.min(K.need, g.ch + 1);
      var d = genAtk(G, g) * typeMul(g, tgt), kind = "hit"; G._src = g.c.typ;
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
