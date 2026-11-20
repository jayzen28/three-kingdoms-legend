/* 鬥將模式（卡牌對戰）：卡牌版數值
   ✅ Jay 2026-11-20：獨立模式；不分卡等級；張數看擁有的最高卡別（N1 R2 SR3 SSR4，UR 先不能放）；軍餉不分國家；國家改成標籤；
   標籤 30 種（國家 5＋其他 25）；15 位個人特技，其他用通用特技；擺設用的特技拿掉；每人一個特技；戰力用兵力。
   ★ 下面的數字（軍餉等級、兵力、急報、湊齊獎勵、牌組 30 張／城門 5 道）都是試玩用的暫定值，Jay 還沒定。改數值只改這支。 */
(function (SG) {
  var D = SG.DUEL = {};
  D.DECK = 30;          // ★ 牌組張數（另一個選項 50）
  D.LIFE = 5;           // ★ 城門道數（另一個選項 7）
  D.HAND = 7;           // 起手張數
  D.HAND_MAX = 8;       // 回合結束時手牌上限
  D.FRONT = 4; D.BACK = 4;
  D.COPIES = { N: 1, R: 2, SR: 3, SSR: 4 };   // ✅ 看擁有的最高卡別
  D.BASE = [1000, 1500, 2500, 3500, 4500, 5500, 6500];   // ★ 各軍餉等級的兵力基準
  D.COEF = { "槍": 1.1, "騎": 1.0, "弓": 0.9, "刺": 0.9, "法": 0.85 };   // ★ 兵種係數（比戰棋版拉近）
  D.VANILLA = 500;      // ★ 沒有特技的卡兵力 +500
  D.SET_BONUS = 1000;   // ★ 湊齊獎勵：成員兵力各 +1000

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
    "連戰": "每回合第一次進攻後，可以再進攻一次。",
    "鐵壁": "格擋時兵力 +1000。",
    "軍師": "出陣時抽 1 張。",
    "計謀": "出陣時，敵方前陣一位智力比她低的武將休整，下回合不能行動。",
    "號召": "出陣時，從牌組找一位同標籤、魅力比她低的武將加入手牌（國家標籤也算）。",
    "結義": "場上每有一位同標籤的友軍（不算國家標籤），兵力 +500，最多 +1500。",
  };
  // ★ 15 位個人特技（草案，Jay 2026-11-20「先用這樣」）
  D.PERSONAL = {
    "曹操": ["挾天子令諸侯", "出陣時，對方隨機丟 1 張手牌，自己抽 1 張。"],
    "司馬懿": ["隱忍", "第一次被擊退時，改成回到後陣休整（後陣要有空位）。"],
    "張遼": ["威震逍遙津", "出陣當回合就能進攻，這回合她進攻時對方不能格擋。只能出在前陣。"],
    "典韋": ["捨命護主", "己方場上有君主時，典韋休整中也能格擋，每回合 1 次。"],
    "劉備": ["桃園之誓", "出陣時，從牌組找 1 張關羽或張飛加入手牌。"],
    "關羽": ["過五關斬六將", "打贏格擋後重新可行動，每回合最多 2 次。"],
    "張飛": ["長坂一喝", "出陣時，敵方前陣兵力比她低的武將全部休整，這回合不能格擋。"],
    "趙雲": ["七進七出", "進攻時，對方只能用兵力比她高的武將格擋。"],
    "諸葛亮": ["臥龍", "出陣時，看對方手牌，挑 1 張丟掉。"],
    "孫權": ["江東基業", "己方場上每有一位吳國武將，所有吳國武將兵力 +500，最多 +1500。"],
    "周瑜": ["火燒赤壁", "出陣時，擊退敵方前陣所有兵力 2500 以下的武將。"],
    "呂蒙": ["白衣渡江", "從後陣移上前陣的那一回合，她進攻時對方不能格擋。"],
    "貂蟬": ["連環計", "出陣時，敵方前陣兵力最高的兩位武將互相交戰，兵力低的被擊退。"],
    "董卓": ["暴政", "兵力特別高（+1500），但每回合開始要隨機丟 1 張手牌。"],
    "張角": ["蒼天已死", "出陣時，從牌組找最多 2 張黃巾武將，直接放進後陣（休整中）。"],
  };
  D.TRIGS = {
    "援軍": "城門被破、翻到這張時，把它加入手牌。",
    "伏兵": "城門被破、翻到這張時，直接放進後陣（休整中）。",
    "反擊": "城門被破、翻到這張時，前陣一位休整中的武將重新可行動，這回合兵力 +1000。",
  };

  // ===== 算出每位武將的卡牌版 =====
  D.CARD = {};     // 武將名 → 卡牌版
  D.LIST = [];
  var ok = function (c) { return !c.ur; };
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
    var s = null;
    if (D.PERSONAL[d.name]) s = d.name;
    else if (d.tags.indexOf("君主") >= 0 || (d.m >= 94 && d.typ !== "法")) s = "號召";
    else if (d.typ === "法") s = d.z >= 90 ? "計謀" : "軍師";
    else if (hasSet(d)) s = "結義";
    else if (d.typ === "騎") s = d.w >= 93 ? "連戰" : "突擊";
    else if (d.typ === "槍" && d.w < 93) s = "鐵壁";
    d.skill = s; d.personal = !!D.PERSONAL[d.name];
    d.skillName = d.personal ? D.PERSONAL[d.name][0] : s;
    d.skillText = d.personal ? D.PERSONAL[d.name][1] : s ? D.SKILLS[s] : "";
    d.bp = Math.max(500, Math.round(D.BASE[d.cost] * D.COEF[d.typ] / 500) * 500) + (s ? 0 : D.VANILLA) + (d.name === "董卓" ? 1500 : 0);
    d.trig = d.cost <= 1 ? "援軍" : (d.cost === 3 && d.typ !== "法") ? "伏兵" : (d.cost === 2 && d.typ === "槍") ? "反擊" : null;
  });

  // 玩家能放幾張：看所有版本（女版、男版）擁有的最高卡別，UR 不算
  D.copiesOf = function (S, name) {
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
  D.QUOTA = { 30: [7, 6, 6, 5, 3, 2, 1], 50: [11, 9, 9, 8, 6, 4, 3] };   // ★ 0 費建議至少 6 張
  D.autoDeck = function (avail, size, rnd) {
    size = size || D.DECK; rnd = rnd || Math.random;
    var q = (D.QUOTA[size] || D.QUOTA[30]).slice(), deck = {}, total = 0;
    var list = avail.slice().sort(function (a, b) { return (b.n - a.n) || (b.d.score - a.d.score) || (rnd() - 0.5); });
    for (var cost = 0; cost <= 6; cost++) list.filter(function (x) { return x.d.cost === cost; }).forEach(function (x) {
      if (q[cost] <= 0 || total >= size) return; var k = Math.min(x.n, q[cost]); deck[x.d.name] = k; q[cost] -= k; total += k;
    });
    list.slice().sort(function (a, b) { return a.d.cost - b.d.cost; }).forEach(function (x) {
      while (total < size && (deck[x.d.name] || 0) < x.n) { deck[x.d.name] = (deck[x.d.name] || 0) + 1; total++; }
    });
    return deck;
  };
  D.deckCount = function (deck) { return Object.keys(deck || {}).reduce(function (a, k) { return a + deck[k]; }, 0); };
  // 電腦對手：用全部武將、每位最多張數組牌（★ 試玩用）
  D.OPPONENTS = [
    { id: "shu", name: "桃園義軍", tags: ["蜀"], desc: "蜀國・五虎將" },
    { id: "wei", name: "魏武之師", tags: ["魏"], desc: "魏國・五子良將" },
    { id: "wu", name: "江東水師", tags: ["吳"], desc: "吳國・大都督" },
    { id: "qun", name: "群雄割據", tags: ["群雄", "黃巾"], desc: "群雄＋黃巾" },
  ];
  D.oppDeck = function (opp, rnd) {
    var avail = D.LIST.filter(function (d) { return d.tags.some(function (t) { return opp.tags.indexOf(t) >= 0; }); })
      .map(function (d) { return { d: d, n: d.strong ? 4 : 3 }; });
    return D.autoDeck(avail, D.DECK, rnd);
  };
})(window.SG);
