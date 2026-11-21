/* 鬥將模式（卡牌對戰）：卡牌版數值
   ✅ Jay 2026-11-20：獨立模式；不分卡等級；張數看擁有的最高卡別（N1 R2 SR3 SSR4，UR 先不能放）；軍餉不分國家；國家改成標籤；
   標籤 30 種（國家 5＋其他 25）；15 位個人特技，其他用通用特技；擺設用的特技拿掉；每人一個特技；戰力用兵力。
   ★ 下面的數字（軍餉等級、兵力、急報、湊齊獎勵、牌組 30 張／城門 5 道）都是試玩用的暫定值，Jay 還沒定。改數值只改這支。 */
(function (SG) {
  var D = SG.DUEL = {};
  D.DECK = 40;          // ✅ Jay 2026-11-20：牌組 40 張（原本 30）
  D.LIFE = 7;           // ✅ Jay 2026-11-20：城門 7 道（原本 5）
  D.HAND = 7;           // 起手張數
  D.HAND_MAX = 8;       // 回合結束時手牌上限
  D.FRONT = 4; D.BACK = 4;
  D.COPIES = { N: 1, R: 2, SR: 3, SSR: 4 };   // ✅ 看擁有的最高卡別
  D.BASE = [1000, 1500, 2500, 3500, 4500, 5500, 6500];   // ★ 各軍餉等級的兵力基準
  D.COEF = { "槍": 1.1, "騎": 1.0, "弓": 0.9, "刺": 0.9, "法": 0.85 };   // ★ 兵種係數（比戰棋版拉近）
  D.VANILLA = 500;      // ★ 沒有特技的卡兵力 +500
  D.SET_BONUS = 1000;   // （舊）湊齊獎勵，現在改用 D.SET_TIER
  // ✅ Jay 2026-11-21：湊齊不用全員，3／4／5 人組各自分段，人越多越強。★ 人數門檻和加成數字是開發先定的
  D.SET_TIER = { 3: { 2: 500, 3: 1500 }, 4: { 3: 1000, 4: 2000 }, 5: { 3: 1000, 4: 1500, 5: 2500 } };

  // ===== 標籤（✅ 國家 5＋其他 25；★ 成員是開發排的） =====
  D.SET_TAGS = {      // 5 人以下，可以湊齊
    "五虎將": "關羽 張飛 趙雲 馬超 黃忠", "五子良將": "張遼 樂進 于禁 張郃 徐晃", "河北四庭柱": "顏良 文醜 張郃 高覽",
    "桃園結義": "劉備 關羽 張飛", "水鏡門下": "諸葛亮 龐統 徐庶", "司馬一族": "司馬懿 司馬師 司馬昭", "南蠻": "孟獲 祝融 兀突骨 木鹿大王",
    "大都督": "周瑜 魯肅 呂蒙 陸遜 陸抗", "託孤重臣": "諸葛亮 蔣琬 費禕 李嚴", "荊州": "劉表 文聘 黃忠 魏延 龐統",
    "益州": "劉璋 張任 法正 嚴顏 李嚴", "護主": "典韋 許褚 周泰 趙雲",
  };
  D.BIG_TAGS = {      // 超過 5 人，只給特技點名
    "君主": "曹操 劉備 孫權 孫堅 孫策 袁術 董卓 劉表 劉璋 張角 公孫瓚 陶謙 馬騰 張魯 孟獲 曹丕 劉禪",
    "謀士": "司馬懿 郭嘉 賈詡 荀彧 荀攸 程昱 諸葛亮 龐統 法正 徐庶 周瑜 陸遜 魯肅 陳宮 田豐 沮授 李儒 鍾會 馬謖 諸葛瑾 諸葛恪 黃月英",
    "猛將": "*", "巾幗": "甄姬 蔡文姬 王異 關銀屏 星彩 鮑三娘 黃月英 孫尚香 大喬 小喬 步練師 孫魯班 貂蟬 祝融 呂玲綺 董白",
    "西涼": "馬騰 馬超 馬岱 龐德 韓遂 董卓 李傕 郭汜 華雄 王異", "方士": "左慈 于吉 張角 張寶 張梁 華佗",
    "袁氏": "袁術 顏良 文醜 田豐 沮授 審配 紀靈 高覽", "呂布軍": "陳宮 高順 張遼 臧霸 呂玲綺 貂蟬",
    "將門之後": "關興 張苞 關銀屏 星彩 關平 關索 陸抗 呂玲綺 董白 曹彰 曹植 司馬師 司馬昭 諸葛恪",
    "守城名將": "曹仁 郝昭 滿寵 文聘 朱桓 審配 嚴顏 夏侯惇 于禁", "老將": "黃忠 嚴顏 黃蓋 程普 廖化 韓當 呂岱",
    "北伐": "姜維 王平 馬岱 廖化 馬謖 魏延 關興 張苞 郭淮", "內政": "荀彧 張昭 顧雍 糜竺 蔣琬 費禕 孫乾 簡雍",
  };
  D.NATIONS = ["魏", "蜀", "吳", "群雄", "黃巾"];

  // ===== 特技 =====
  D.SKILLS = {
    "突擊": "出陣當回合就能進攻。",
    "連擊": "每回合第一次進攻後，可以再進攻一次。",   // ✅ Jay 2026-11-21：原本的「連戰」改名連擊，只給兵力 1000、1500 的武將
    "鐵壁": "格擋時兵力 +1000。",
    "軍師": "出陣時抽 1 張。",
    "計謀": "出陣時，敵方前陣一位兵力比她低的武將休整，下回合不能行動。",
    "號召": "出陣時，己方前陣其他武將這回合兵力 +1000；跟她同國家的再多 +500。",
    "結義": "場上每有一位同標籤的友軍（不算國家標籤），兵力 +500，最多 +1500。",
    // ✅ Jay 2026-11-20 新增（讓每位武將都有特技）
    "遠射": "可以改打敵方後陣的武將，對方不能格擋；打贏就把她擊退（遠射不會被反扣）。",
    "破門": "可行動、兵力 5000 以上（算加成）時，可以犧牲自己破對方 1 道城門，對方不能格擋。",
    "護主": "己方只剩最後 1 道城門時，每回合可以擋下 1 次會破門的攻擊（破門特技也擋得住），自己不受傷。",
    "幻術": "被抽到時，再抽 2 張，然後挑 2 張手牌放回牌組底。",
    "陣前換將": "在手牌時，可以付軍餉和軍令，跟己方前陣一位武將交換（換下來的回手牌）；換下來的武將這回合沒進攻過的話，換上去的可以馬上進攻。",
    // ✅ Jay 2026-11-21：新特技
    "單挑": "每場限用一次：進攻時指定敵方前陣一位武將跟她交戰（變暗、不能格擋的也可以指定），對方不能換人、也不能不擋；被指定的算格擋。",
    "屯糧": "她在場上（前陣或後陣）時，軍餉 +1。",
    "策反": "出陣時，指定敵方前陣一位武將，放回對方牌組最底下；她自己也放回己方牌組最底下。敵方前陣沒人時不發動、她留在場上。",
  };
  // ★ 新特技人選（Jay 交給開發挑）
  D.ASSIGN = {
    "遠射": "夏侯淵 王平 太史慈 皇甫嵩 程志遠",
    "破門": "甘寧 姜維 龐德 顏良 呂玲綺 馬元義",   // ✅ Jay：2 位 4000 兵力＋4 位 3500 兵力，每國都有
    "幻術": "甄姬 孫乾 小喬 木鹿大王 張寶",
    "護主": "典韋 許褚 周泰 趙雲",
    "突擊": "王濬 董白 李儒 關索 關銀屏 鄧艾",   // ✅ Jay 2026-11-21：陣前換將效果不大，6 位改突擊（1000×2、1500、2500、3000、4000）
    // ✅ Jay 2026-11-21：原本 20 位陣前換將改成新特技（人選開發排、Jay 同意）
    "連擊": "鮑三娘 徐盛 潘璋 裴元紹 嚴政 滿寵 孫魯班 唐周",
    "屯糧": "李典 糜竺 呂岱 李恆",
    "策反": "賈詡 法正 魯肅 陳宮",   // ✅ Jay：裝在智力或魅力高的武將（★ 人選開發挑：智 92～96）
    "單挑": "孫尚香 朱然 賀齊 馬秀英",
    "陣前換將": "馬謖 凌統 鍾會 馬騰",   // ✅ Jay：陣前換將保留，兵力 1500、2500、3000、3500 各一位（★ 人選開發挑）
  };
  // ★ 15 位個人特技（草案，Jay 2026-11-20「先用這樣」）
  D.PERSONAL = {
    "曹操": ["挾天子令諸侯", "出陣時，對方隨機丟 1 張手牌，自己抽 1 張。"],
    "司馬懿": ["隱忍", "第一次被擊退時，改成回到後陣休整（後陣要有空位）。"],
    "張遼": ["威震逍遙津", "出陣當回合就能進攻，這回合她進攻時對方不能格擋。只能出在前陣。"],
    "劉備": ["桃園之誓", "出陣時，從牌組找 1 張關羽或張飛加入手牌。"],
    "關羽": ["過五關斬六將", "打贏格擋後重新可行動，每回合最多 2 次。"],
    "張飛": ["長坂一喝", "出陣時，敵方前陣兵力比她低的武將全部休整，這回合不能格擋。"],
    "諸葛亮": ["臥龍", "出陣時，看對方手牌，挑 1 張丟掉。"],
    "孫權": ["江東基業", "己方場上每有一位吳國武將，所有吳國武將兵力 +500，最多 +1500。"],
    "周瑜": ["火燒赤壁", "出陣時，擊退敵方前陣所有兵力 2500 以下的武將。"],
    "呂蒙": ["白衣渡江", "從後陣移上前陣的那一回合，她進攻時對方不能格擋。"],
    "貂蟬": ["連環計", "出陣時，敵方前陣兵力最高的兩位武將互相交戰，兵力低的被擊退。"],
    "董卓": ["暴政", "兵力特別高（+1500），但每回合開始要隨機丟 1 張手牌。"],
    "張角": ["蒼天已死", "出陣時，從牌組找最多 2 張黃巾武將，直接放進後陣（休整中）。"],
    "呂布": ["神擋殺神", "在前陣可行動時，花 3 道軍令，直接擊退敵方前陣一位武將（不比兵力）。"],   // ✅ Jay：讓呂布可以編進牌組
  };
  D.UR_OK = ["呂布"];          // ✅ 只有 UR 的武將裡，破例可以用的
  D.NO_LIMIT = ["呂布"];       // ✅ 張數不限（要擁有她）
  D.TRIGS = {
    "援軍": "城門被破、翻到這張時，把它加入手牌。",
    "伏兵": "城門被破、翻到這張時，直接放進後陣（休整中）。",
    "反擊": "城門被破、翻到這張時，前陣一位休整中的武將重新可行動，這回合兵力 +1000。",
  };

  // ===== 算出每位武將的卡牌版 =====
  D.CARD = {};     // 武將名 → 卡牌版
  D.LIST = [];
  var ok = function (c) { return !c.ur || (c.urOnly && D.UR_OK.indexOf(c.gen) >= 0); };
  var pool = SG.CARDS.filter(function (c) { return ok(c) && SG.GEN[c.gen] === c; });   // 每位武將取一張（男版共用同名）
  var split = function (s) { return s.split(" "); };
  pool.forEach(function (c) {
    var tags = [c.fac];
    Object.keys(D.SET_TAGS).forEach(function (t) { if (split(D.SET_TAGS[t]).indexOf(c.gen) >= 0) tags.push(t); });
    Object.keys(D.BIG_TAGS).forEach(function (t) { var v = D.BIG_TAGS[t]; if (v === "*" ? c.w >= 93 : split(v).indexOf(c.gen) >= 0) tags.push(t); });
    var d = { name: c.gen, card: c, fac: c.fac, typ: c.typ, w: c.w, z: c.z, m: c.m, strong: c.strong, tags: tags, art: c.art };
    d.score = Math.max(c.w, c.z) + 0.35 * c.m + (c.strong ? 12 : 0);
    D.LIST.push(d); D.CARD[c.gen] = d;
  });
  var cut = [0.20, 0.36, 0.56, 0.75, 0.89, 0.96, 1.0];   // ★ 0 費約 20%（試玩發現 0 費太少時，四場有一場到第 3 回合還出不了卡）
  // 各國自己排費用（試算發現：全體一起排的話魏、吳幾乎沒有便宜的卡，單國牌組起不了手）
  D.NATIONS.forEach(function (f) {
    D.LIST.filter(function (d) { return d.fac === f; }).sort(function (a, b) { return a.score - b.score || a.name.localeCompare(b.name); })
      .forEach(function (d, i, arr) { var p = (i + 0.5) / arr.length; d.cost = cut.findIndex(function (x) { return p <= x; }); });
  });
  var hasSet = function (d) { return d.tags.some(function (t) { return D.SET_TAGS[t] || t === "西涼"; }); };
  D.LIST.forEach(function (d) {
    d.ap = d.cost >= 6 ? 2 : 1;
    d.gen = d.tags.indexOf("內政") >= 0 ? 2 : 1;
    var s = null, asg = Object.keys(D.ASSIGN).find(function (k) { return split(D.ASSIGN[k]).indexOf(d.name) >= 0; });
    if (asg) s = asg;
    else if (D.PERSONAL[d.name]) s = d.name;
    else if (d.tags.indexOf("君主") >= 0 || (d.m >= 94 && d.typ !== "法")) s = "號召";
    else if (d.typ === "法") s = d.z >= 90 ? "計謀" : "軍師";
    else if (hasSet(d)) s = "結義";
    else if (d.typ === "騎") s = "突擊";   // 連擊只給 1000、1500 的武將，騎兵一律突擊
    else if (d.typ === "槍" && d.w < 93) s = "鐵壁";
    else s = "突擊";   // （目前沒有人走到這行；原本是陣前換將）
    d.skill = s; d.personal = !!D.PERSONAL[d.name];
    d.skillName = d.personal ? D.PERSONAL[d.name][0] : s;
    d.skillText = d.personal ? D.PERSONAL[d.name][1] : s ? D.SKILLS[s] : "";
    d.bp = Math.max(500, Math.round(D.BASE[d.cost] * D.COEF[d.typ] / 500) * 500) + (s ? 0 : D.VANILLA) + (d.name === "董卓" ? 1500 : 0);
    d.trig = d.cost <= 1 ? "援軍" : (d.cost === 3 && d.typ !== "法") ? "伏兵" : (d.cost === 2 && d.typ === "槍") ? "反擊" : null;
  });

  // 玩家能放幾張：看所有版本（女版、男版）擁有的最高卡別，UR 不算
  D.copiesOf = function (S, name) {
    if (D.NO_LIMIT.indexOf(name) >= 0) return SG.CARDS.some(function (c) { return c.gen === name && S.inv[c.id] && Object.keys(S.inv[c.id]).some(function (k) { return S.inv[c.id][k]; }); }) ? D.DECK : 0;
    var best = -1;
    SG.CARDS.forEach(function (c) {
      if (c.gen !== name || c.ur) return;
      var inv = S.inv[c.id]; if (!inv) return;
      Object.keys(inv).forEach(function (k) { if (inv[k]) best = Math.max(best, SG.RAR.indexOf(k.split("-")[0])); });
    });
    return best < 0 || best > 3 ? 0 : D.COPIES[SG.RAR[best]];
  };
  D.owned = function (S) {
    return D.LIST.map(function (d) { return { d: d, n: D.copiesOf(S, d.name) }; }).filter(function (x) { return x.n > 0; });
  };
  // 一鍵組牌：照費用曲線挑，先挑自己最多張的
  D.QUOTA = { 30: [7, 6, 6, 5, 3, 2, 1], 37: [8, 7, 7, 6, 4, 3, 2], 40: [9, 8, 7, 7, 4, 3, 2], 50: [11, 9, 9, 8, 6, 4, 3] };   // ★ 0 費建議至少 6 張
  D.autoDeck = function (avail, size, rnd) {
    size = size || D.DECK; rnd = rnd || Math.random;
    var q = (D.QUOTA[size] || D.QUOTA[40]).slice(), deck = {}, total = 0;
    var list = avail.slice().sort(function (a, b) { return (b.n - a.n) || (b.d.score - a.d.score) || (rnd() - 0.5); });
    for (var cost = 0; cost <= 6; cost++) list.filter(function (x) { return x.d.cost === cost; }).forEach(function (x) {
      if (q[cost] <= 0 || total >= size) return; var k = Math.min(x.n, q[cost]); deck[x.d.name] = k; q[cost] -= k; total += k;
    });
    list.slice().sort(function (a, b) { return a.d.cost - b.d.cost; }).forEach(function (x) {
      while (total < size && (deck[x.d.name] || 0) < x.n) { deck[x.d.name] = (deck[x.d.name] || 0) + 1; total++; }
    });
    return deck;
  };
  // ===== 道具卡（✅ Jay 2026-11-20）：每種一副牌組只能放 1 張；除了「軍令」都要 1 道軍令 =====
  // ★ 取得方式：Jay 要「牌組抽得到＋茶館酒館抽得到」，掉落機率還沒定 → 試玩期大家都能放
  D.ITEMS = [
    { id: "ling", name: "軍令", ap: 0, tgt: null, text: "不用軍令，這回合軍令 +2（可以超過 3 道）。" },
    { id: "liang", name: "軍糧", ap: 1, tgt: null, text: "這回合軍餉 +2（可以出費用高 2 的武將），回合結束消失。" },   // ✅ Jay 2026-11-21
    { id: "chitu", name: "赤兔馬", ap: 1, tgt: "mine", text: "讓己方前陣或後陣一位武將離開戰場、回到手牌。" },
    { id: "bao", name: "小籠包", ap: 1, tgt: null, react: true, text: "己方武將被擊退時（手上有這張、還有 1 道軍令就自動使用），改成留在場上、兵力剩 1000。" },
    { id: "dao", name: "青龍偃月刀", ap: 1, tgt: "mine", text: "這回合，己方一位武將兵力 +1500。" },
    { id: "wushen", name: "武神上身", ap: 1, tgt: "mine", text: "這回合，己方一位武將兵力 +3000。" },
    { id: "dou", name: "撒豆成兵", ap: 1, tgt: null, text: "這回合，己方前陣所有武將兵力 +1000。" },
    { id: "xi", name: "玉璽", ap: 5, tgt: null, text: "要 5 道軍令（先用「軍令」湊到 5 道）。這回合己方前陣所有武將兵力 +3000；下回合只有 2 道軍令。" },
  ];
  D.ITEM = {}; D.ITEMS.forEach(function (it) { it.item = true; it.cost = 0; D.ITEM[it.id] = it; D.ITEM["道具:" + it.id] = it; });
  D.itemKey = function (id) { return "道具:" + id; };
  D.ownsItem = function (S, id) { return true; };   // ★ 試玩期：大家都有
  D.deckCount = function (deck) { return Object.keys(deck || {}).reduce(function (a, k) { return a + deck[k]; }, 0); };
  // ===== 電腦對手（✅ Jay 2026-11-21：各國分初級／高級，另加 3 關混合陣營） =====
  // 初級：每位最多 2 張、不放個人特技武將、不放道具（不夠 40 張才補第 3 張）
  //       另外電腦會放水（duel.js 的 D.EASY）：每回合只出 1 位武將、城門剩 3 道以上不格擋
  // 高級：該國全部武將每位 3～4 張＋3 張道具（＝原本的強度）
  // 混合：用標籤組牌、強度同高級。★ 主題（謀士／巾幗／猛將）是開發提的，Jay「照你改」
  var NAT = [["wei", "魏", "魏武之師"], ["shu", "蜀", "桃園義軍"], ["wu", "吳", "江東水師"], ["qun", "群雄", "群雄割據"], ["hj", "黃巾", "黃天太平道"]];
  D.OPPONENTS = [];
  NAT.forEach(function (x) {
    D.OPPONENTS.push({ id: x[0] + "1", nat: x[0], name: x[2], tags: [x[1]], lv: 1, desc: x[1] + "・初級" });
    D.OPPONENTS.push({ id: x[0] + "2", nat: x[0], name: x[2], tags: [x[1]], lv: 2, desc: x[1] + "・高級" });
  });
  D.OPPONENTS.push({ id: "mix1", name: "運籌帷幄", tags: ["謀士"], lv: 2, mix: true, desc: "混合陣營・謀士" });
  D.OPPONENTS.push({ id: "mix2", name: "巾幗英雌", tags: ["巾幗"], lv: 2, mix: true, desc: "混合陣營・巾幗" });
  D.OPPONENTS.push({ id: "mix3", name: "萬夫莫敵", tags: ["猛將"], lv: 2, mix: true, desc: "混合陣營・猛將" });
  D.oppDeck = function (opp, rnd) {
    rnd = rnd || Math.random;
    var pool = D.LIST.filter(function (d) { return d.tags.some(function (t) { return opp.tags.indexOf(t) >= 0; }); });
    if (opp.lv === 1) {
      pool = pool.filter(function (d) { return !d.personal; });
      var deck = D.autoDeck(pool.map(function (d) { return { d: d, n: 2 }; }), D.DECK, rnd);
      if (D.deckCount(deck) < D.DECK) deck = D.autoDeck(pool.map(function (d) { return { d: d, n: 3 }; }), D.DECK, rnd);
      return deck;
    }
    var deck2 = D.autoDeck(pool.map(function (d) { return { d: d, n: d.strong ? 4 : 3 }; }), D.DECK - 3, rnd);
    ["ling", "liang", "dao", "dou", "bao", "wushen"].sort(function () { return rnd() - 0.5; }).slice(0, 3).forEach(function (id) { deck2[D.itemKey(id)] = 1; });
    return deck2;
  };
})(window.SG);
