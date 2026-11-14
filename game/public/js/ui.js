/* 畫面：主城、戰役、招募（茶館／酒館）、收集冊、編隊、任務 */
(function (SG) {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return document.querySelectorAll(s); };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var pct = function (x) { return (Math.round(x * 1000) / 10) + "%"; };
  var RAR = SG.RAR;
  var FV = { "魏": "wei", "蜀": "shu", "吳": "wu", "群雄": "qun", "黃巾": "yt" };
  var UI = SG.UI = {};
  var S = null;
  UI.fmt = fmt; UI.pct = pct; UI.FV = FV;
  UI.init = function (state) { S = state; };
  UI.save = function () { SG.Store.save(S); UI.res(); };
  UI.res = function () { $("#r-copper").textContent = fmt(S.copper); $("#r-yb").textContent = fmt(S.yuanbao); $("#r-tk").textContent = fmt(S.tickets); };
  UI.modal = function (html) { $("#modal-body").innerHTML = html; $("#modal").classList.add("show"); $("#modal-body").scrollTop = 0; };
  UI.close = function () { $("#modal").classList.remove("show"); };
  $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal") UI.close(); });
  UI.banner = function (t, color) {
    var b = $("#banner"); b.textContent = t; b.style.color = color || "#f6ecd6"; b.style.display = "block";
    clearTimeout(UI._bt); UI._bt = setTimeout(function () { b.style.display = "none"; }, 1000);
  };
  UI.flash = function (t) { UI.banner(t, "#ecd391"); };

  UI.go = function (name) {
    $$(".screen").forEach(function (s) { s.classList.toggle("show", s.id === "s-" + name); });
    $$("#nav button").forEach(function (b) { b.classList.toggle("act", b.dataset.go === name); });
    $("#nav").style.display = name === "battle" ? "none" : "";
    $("#top").style.display = name === "battle" ? "none" : "";
    document.body.classList.toggle("on-home", name === "home");
    if (UI["r_" + name]) UI["r_" + name]();
    if (SG.Audio) SG.Audio.scene(name);
    window.scrollTo(0, 0);
  };
  $$("#nav button").forEach(function (b) { b.onclick = function () { UI.go(b.dataset.go); }; });

  // ===== 共用零件 =====
  UI.head = function (name, fac, art) {
    return '<span class="hd' + (art ? ' pic' : '') + ' f-' + (FV[fac] || "yt") + (art ? ' v' + SG.bgv(art) : '') + '">' + (art ? '<img src="img/' + art + '_head.webp" alt="">' : name[0]) + '</span>';
  };
  // 每頁頂端的山水橫幅
  UI.strip = function (id, title, sub) {
    return '<div class="strip"><canvas id="' + id + '"></canvas><div class="cap">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
  };
  // 名帖：有圖用圖，沒圖用直書人名
  UI.cardHtml = function (card, b, opt) {
    opt = opt || {};
    var rar = b ? b.rar : (card.ur ? "UR" : card.vers[0]);
    return '<div class="cc ' + rar + (b ? "" : " none") + (card.art ? " art v" + SG.bgv(card.art) : "") + ' f-' + FV[card.fac] + '" ' + (opt.attr || "") + '>' +
      (card.art ? '<img class="pic" src="img/' + card.art + '_card.webp" alt="">' : '') +
      '<span class="nm n' + Math.min(4, card.gen.length) + '">' + card.gen + '</span>' +
      (card.ver && (card.ur || card.male) && card.ver !== "一般" ? '<span class="ver">' + card.ver + '</span>' : '') +
      '<span class="ty">' + card.typ + '</span><span class="rb">' + rar + '</span>' +
      '<span class="stars">' + (b ? "★".repeat(b.star) : "") + '</span></div>';
  };
  UI.statBars = function (card, u) {
    var row = function (cls, label, base, now) {
      var extra = now - base;
      return '<div class="stat ' + cls + '"><span>' + label + '</span><b>' + now + '</b><div class="bar"><i style="width:' + base + '%"></i>' +
        (extra ? '<u style="left:' + base + '%;width:' + extra + '%"></u>' : '') + '</div></div>';
    };
    return '<div class="stats">' + row("w", "武力", card.w, u.w) + row("z", "智力", card.z, u.z) + row("m", "魅力", card.m, u.m) + '</div>';
  };
  UI.tags = function (card) {
    return '<span class="tag fill f-' + FV[card.fac] + '">' + card.fac + '</span><span class="tag">' + SG.TYPES[card.typ].name + '</span>' +
      (card.elem ? '<span class="tag">' + card.elem + '</span>' : '') + (card.strong ? '<span class="tag red">' + (card.ur ? 'UR' : '強將') + '</span>' : '');
  };
  UI.cardDetail = function (card) {
    var b = SG.best(S, card.id), inv = S.inv[card.id] || {};
    var show = b || { rar: card.ur ? "UR" : card.vers[0], star: card.ur ? 6 : 1 };
    var u = SG.unitStats(card, show.rar, show.star), t = SG.TYPES[card.typ];
    var held = Object.keys(inv).filter(function (k) { return inv[k]; }).map(function (k) { return k.replace("-", " ") + "★ ×" + inv[k]; }).join("、") || "尚未取得";
    var bonus = { "武": "武力", "智": "智力", "魅": "魅力" }[card.bk] + " +" + card.bv;
    var inTeam = S.team.indexOf(card.id) >= 0, can = SG.canMerge(S, card.id);
    var art = card.art
      ? '<div class="bigart ' + show.rar + (b ? '' : ' none') + (card.artBg ? '' : ' f-' + FV[card.fac] + ' v' + SG.bgv(card.art)) + '"' + (card.artBg ? ' style="background-image:url(img/' + card.art + '_full.webp)"' : '') + '>' +
        (card.artBg ? '' : '<img src="img/' + card.art + '_full.webp" alt="' + card.name + '">') +
        '<span class="nm">' + card.gen + '</span>' + (card.ver && (card.ur || card.male) && card.ver !== "一般" ? '<span class="ver">' + card.ver + '</span>' : '') +
        '<span class="rk">' + show.rar + '<i>' + "★".repeat(show.star) + '</i></span></div>'
      : '';
    UI.modal(art + '<div class="detail' + (art ? ' noart' : '') + '">' + (art ? '' : UI.cardHtml(card, b)) +
      '<div class="grow" style="display:flex;flex-direction:column;gap:8px"><div class="name">' + card.name + '</div>' +
      '<div>' + UI.tags(card) + '<span class="tag">' + show.rar + ' ' + show.star + '★</span></div>' + UI.statBars(card, u) +
      '<div class="stat hpl"><span>兵力</span><b>' + fmt(u.hp) + '</b></div></div></div>' +
      '<div class="skill"><b>特技</b><span>尚未開放</span></div>' +
      (can && inTeam ? '<p class="dim">她在出戰隊伍裡，要先到「編隊」移出才能合成。</p>' : '') +
      '<div class="row end">' + (can ? '<button class="gold" id="cd-merge" ' + (inTeam ? 'disabled' : '') + '>合成</button>' : '') + '<button onclick="SG.UI.close()">收起</button></div>');
    if (can && !inTeam) $("#cd-merge").onclick = function () {
      var r = SG.mergeCard(S, card.id); if (!r) return;
      UI.save(); UI.close();
      UI.mergeFx([r], function () { if ($("#s-book").classList.contains("show")) UI.r_book(); if ($("#s-team").classList.contains("show")) UI.r_team(); UI.cardDetail(card); });
    };
  };

  // ===== 特效層：抽卡翻牌、合成 =====
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var sfx = function (k) { if (SG.Audio && SG.Audio.sfx) SG.Audio.sfx(k); };
  function fxLayer(cls) {
    var old = $("#fxl"); if (old) old.remove();
    var el = document.createElement("div"); el.id = "fxl"; el.className = cls; document.body.appendChild(el); return el;
  }
  // 抽卡（✅ Jay 2026-11-13）：拆錦囊 → 噴光 → 卡片帶金光從畫面前滑過 → 蓋牌排好 → 一張一張開
  // N、R 直接翻；SR 稍停；SSR 金光加震動加特寫；UR 全螢幕特寫
  UI.reveal = function (title, r, done) {
    var list = r.all || [], n = list.length, many = n > 11;
    if (still || !n) { done(); return; }
    var top = list.reduce(function (a, x) { return Math.max(a, RAR.indexOf(x.rar)); }, 0), glow = ["n", "n", "sr", "ssr", "ur"][top];
    var el = fxLayer("rv" + (many ? " many" : ""));
    el.innerHTML = '<div class="rv-top"><b>' + title + '</b><span>' + n + ' 抽</span></div>' +
      '<div class="pouch g-' + glow + '"><div class="aura"></div><img src="img/pouch.webp" alt=""><div class="hint">點一下拆開錦囊</div></div>' +
      (many ? '<div class="rv-show" style="visibility:hidden"><div class="slot"></div><div class="cnt"></div></div>' : '') +
      '<div class="rv-grid" style="visibility:hidden">' +
      list.map(function (x, i) {
        return '<div class="rvc b-' + x.rar + '" data-i="' + i + '"><div class="in"><div class="bk"></div><div class="ft">' +
          UI.cardHtml(x.card, { rar: x.rar, star: x.card.ur ? 6 : 1 }) + '</div></div></div>';
      }).join("") + '</div><div class="rv-bot" style="visibility:hidden"><button id="rv-skip">' + (many ? '跳過' : '全部翻開') + '</button><button class="pri" id="rv-ok" style="display:none">收下</button></div>';
    var cards = el.querySelectorAll(".rvc"), grid = el.querySelector(".rv-grid"), closed = false, busy = false, left = n, fast = false;
    var slot = el.querySelector(".rv-show .slot"), cnt = el.querySelector(".rv-show .cnt");
    var finish = function () { if (closed) return; closed = true; el.remove(); done(); };
    var spot = function (x, cls, ms) {
      return new Promise(function (res) {
        var sp = document.createElement("div"); sp.className = "rv-spot " + cls;
        sp.innerHTML = '<div class="rays"></div><div class="lab">' + x.rar + '</div>' +
          (x.card.art ? '<div class="pic' + (x.card.artBg ? '' : ' f-' + FV[x.card.fac] + ' v' + SG.bgv(x.card.art)) + '"><img src="img/' + x.card.art + '_full.webp" alt=""></div>' : '<div class="pic txt">' + x.card.gen + '</div>') +
          '<div class="who">' + x.card.name + '</div><div class="tip">點一下繼續</div>';
        el.appendChild(sp);
        var t = setTimeout(end, ms); function end() { clearTimeout(t); sp.remove(); res(); }
        sp.onclick = end;
      });
    };
    var allDone = function () { if (!closed && $("#rv-skip")) { $("#rv-skip").style.display = "none"; $("#rv-ok").style.display = ""; } };
    var flip = async function (i, quiet) {
      var c = cards[i], x = list[i]; if (!c || c.classList.contains("on")) return;
      var hi = RAR.indexOf(x.rar);
      c.classList.add("on", "r-" + x.rar); left--;
      if (!quiet || hi >= 2) sfx(hi === 2 ? "sr" : hi === 3 ? "ssr" : hi === 4 ? "ur" : "flip", hi < 2 ? 0.92 + (i % 5) * 0.045 : 1);
      if (slot && !(quiet && hi < 2)) {
        slot.className = "slot pop r-" + x.rar; slot.innerHTML = UI.cardHtml(x.card, { rar: x.rar, star: x.card.ur ? 6 : 1 }); void slot.offsetWidth; slot.classList.add("go");
        cnt.textContent = (n - left) + " / " + n;
        if (c.offsetTop < grid.scrollTop || c.offsetTop + c.offsetHeight > grid.scrollTop + grid.clientHeight - 80) grid.scrollTop = Math.max(0, c.offsetTop - grid.clientHeight / 2);
      }
      if (hi === 2) await wait(quiet ? 500 : 900);
      else if (hi === 3) { el.classList.add("shake"); await wait(380); el.classList.remove("shake"); await spot(x, "ssr", 2200); }
      else if (hi === 4) { el.classList.add("shake", "hard"); await wait(700); el.classList.remove("shake", "hard"); await spot(x, "ur", 4200); }
      if (left <= 0) allDone();
    };
    // 依序一張一張開；fast＝按了跳過（普通卡一次翻完，SR 以上照樣停）
    var runAll = async function (gap) {
      if (busy) return; busy = true;
      for (var i = 0; i < n && !closed; i++) {
        if (cards[i].classList.contains("on")) continue;
        var hi = RAR.indexOf(list[i].rar);
        if (fast && hi < 2) { flip(i, true); continue; }
        await flip(i, fast); if (!fast) await wait(gap);
      }
      busy = false; if (cnt) cnt.textContent = n + " / " + n;
    };
    cards.forEach(function (c, i) { c.onclick = async function () { if (busy || many) return; busy = true; await flip(i, false); busy = false; }; });
    $("#rv-ok").onclick = finish;
    $("#rv-skip").onclick = function () { if (many) { fast = true; if (!busy) runAll(0); } else runAll(480); };
    // 卡片帶金光從畫面前滑過
    var stream = async function () {
      var gap = many ? 44 : 170, dur = 1150, total = (n - 1) * gap + dur;
      var st = document.createElement("div"); st.className = "rv-stream";
      var h = '<div class="beam"></div>';
      for (var p = 0; p < 36; p++) h += '<i class="sp" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (20 + Math.random() * 60).toFixed(1) + '%;animation-delay:' + (Math.random() * total / 1000).toFixed(2) + 's;--s:' + (0.5 + Math.random()).toFixed(2) + '"></i>';
      for (var i = 0; i < n; i++) h += '<div class="sc b-' + list[i].rar + '" style="animation-delay:' + (i * gap) + 'ms;--y:' + (((i * 37) % 11) - 5) * (many ? 9 : 5) + 'px;--r:' + ((((i * 53) % 9) - 4) * 2) + 'deg"></div>';
      st.innerHTML = h; el.appendChild(st);
      sfx(many ? "stream_l" : "stream_s");
      await wait(total + 150);
      st.classList.add("out"); await wait(350); st.remove();
    };
    var pouch = el.querySelector(".pouch"), opened = false;
    pouch.onclick = async function () {
      if (opened) return; opened = true;
      sfx("shake"); pouch.classList.add("shaking"); await wait(900);
      pouch.classList.remove("shaking"); pouch.classList.add("burst"); el.classList.add("flash-" + glow); sfx("burst_" + glow);
      await wait(750);
      if (closed) return;
      pouch.remove(); el.classList.remove("flash-" + glow);
      await stream();
      if (closed) return;
      grid.style.visibility = ""; el.querySelector(".rv-bot").style.visibility = "";
      if (many) el.querySelector(".rv-show").style.visibility = "";
      cards.forEach(function (c, i) { c.style.animationDelay = Math.min(i * (many ? 6 : 50), 700) + "ms"; c.classList.add("fly"); });
      if (many) { await wait(900); runAll(260); }
    };
  };
  // 合成：兩張卡飛到中間合在一起，閃光後出現升星的卡
  UI.mergeFx = function (list, done) {
    if (still || !list.length) { done(); return; }
    var show = list.slice().sort(function (a, b) { return RAR.indexOf(b.to.rar) * 10 + b.to.star - RAR.indexOf(a.to.rar) * 10 - a.to.star; }).slice(0, 6);
    var el = fxLayer("mg"), skip = false, closed = false;
    el.innerHTML = '<div class="mg-stage"></div><div class="mg-cap"></div><div class="rv-bot"><button id="mg-skip">' + (list.length > 1 ? '跳過' : '收下') + '</button></div>';
    var finish = function () { if (closed) return; closed = true; el.remove(); done(); };
    $("#mg-skip").onclick = function () { skip = true; finish(); };
    (async function () {
      for (var i = 0; i < show.length && !skip; i++) {
        var r = show[i], st = el.querySelector(".mg-stage");
        st.innerHTML = '<div class="mgc l">' + UI.cardHtml(r.card, r.from) + '</div><div class="mgc r">' + UI.cardHtml(r.card, r.from) + '</div><div class="mg-flash"></div>' +
          '<div class="mgc res">' + UI.cardHtml(r.card, r.to) + '</div>';
        el.querySelector(".mg-cap").innerHTML = '<b>' + r.card.name + '</b>　' + r.from.rar + ' ' + r.from.star + '★ → <em>' + r.to.rar + ' ' + r.to.star + '★</em>' + (r.capped ? '（到頂）' : '') +
          (list.length > 1 ? '<small>' + (i + 1) + ' / ' + show.length + (list.length > show.length ? '・其餘 ' + (list.length - show.length) + ' 位直接合好' : '') + '</small>' : '');
        await wait(list.length > 1 ? 1500 : 1900);
      }
      if (list.length > 1) finish(); else if ($("#mg-skip")) $("#mg-skip").textContent = "收下";
    })();
  };
  // 一鍵合成：隊伍裡的武將不合，先問要不要移出
  UI.mergeAllFlow = function (after) {
    var run = function () {
      var r = SG.mergeAll(S, false); UI.save();
      if (!r.merges) { UI.flash("沒有可以合成的卡"); after(); return; }
      UI.mergeFx(r.list, function () {
        UI.modal('<h2>合成完成</h2><p>合成 ' + r.merges + ' 次，' + r.list.length + ' 位武將升星。</p><div class="cards">' +
          r.list.slice(0, 40).map(function (x) { return UI.cardHtml(x.card, x.to); }).join("") + '</div>' +
          (r.blocked.length ? '<p class="dim">隊伍裡還有 ' + r.blocked.length + ' 位沒合：' + r.blocked.map(function (c) { return c.gen; }).join("、") + '。</p>' : '') +
          '<div class="row end"><button onclick="SG.UI.close()">收下</button></div>');
        after();
      });
    };
    var blocked = SG.CARDS.filter(function (c) { return S.team.indexOf(c.id) >= 0 && SG.canMerge(S, c.id); });
    if (!blocked.length) return run();
    UI.modal('<h2>隊伍裡的卡不能合成</h2><p>' + blocked.map(function (c) { return c.gen; }).join("、") + ' 有卡可以合成，但她們在出戰隊伍裡。要先移出隊伍嗎？</p>' +
      '<div class="row end"><button id="ma-team">去編隊移出</button><button class="pri" id="ma-go">不用，合其他的</button></div>');
    $("#ma-team").onclick = function () { UI.close(); UI.go("team"); };
    $("#ma-go").onclick = function () { UI.close(); run(); };
  };
  // 開局：送五種兵種各一張
  UI.TYPE_TIPS = [
    ["槍", "槍兵", "兵力最多，被打會全額反擊。站前排擋住敵人。剋騎兵。"],
    ["騎", "騎兵", "一次走 3 格。走 2 格以上再打是衝鋒 ×1.5。剋弓兵。"],
    ["弓", "弓兵", "射程 2～4，可以隔著人射。被貼身就不能打，要躲在後面。剋槍兵。"],
    ["刺", "刺客", "走 2 格，打人不會被反擊。兵力少。繞到敵人正後方打是背襲 ×2。"],
    ["法", "法師", "法術射程 1～3，會波及旁邊，扣 2 體力，要比智力。也能補血。"],
  ];
  UI.typeGuide = function () {
    return '<div class="tguide">' + UI.TYPE_TIPS.map(function (t, i) {
      var c = SG.GEN[SG.TUTORIAL_CARDS[i]];
      return '<div class="li">' + UI.head(c.gen, c.fac, c.art) + '<div class="grow"><b>' + t[1] + '</b> <span class="tag">' + c.gen + '</span><div class="sub">' + t[2] + '</div></div></div>';
    }).join("") + '</div>';
  };
  UI.welcome = function () {
    UI.modal('<h2>初入亂世</h2><p>送你五位武將，五種兵種各一位。先打第一戰「涿郡義兵」學會怎麼用她們，打贏再送你 ' + SG.STARTER_PULLS + ' 抽。</p>' + UI.typeGuide() +
      '<div class="row end"><button class="pri" id="wl-go">前往第一戰</button></div>');
    $("#wl-go").onclick = function () { UI.close(); SG.BattleUI.start(SG.STAGES[0]); };
  };
  // 小兵沒有卡，簡單顯示
  UI.unitDetail = function (u) {
    var card = u.cardId ? SG.CARD_BY_ID[u.cardId] : SG.GEN[u.name];
    if (card) return UI.cardDetail(card);
    UI.modal('<div class="detail"><span class="bighead">' + (u.art ? '<img src="img/' + u.art + '_head.webp" alt="">' : u.name[0]) + '</span>' +
      '<div class="grow" style="display:flex;flex-direction:column;gap:8px"><div class="name">' + u.name + '</div><div><span class="tag fill f-yt">黃巾</span><span class="tag">' + SG.TYPES[u.typ].name + '</span>' + (u.elem ? '<span class="tag">' + u.elem + '</span>' : '') + '<span class="tag">小兵</span></div>' +
      UI.statBars({ w: u.w, z: u.z, m: u.m }, u) + '<div class="stat hpl"><span>兵力</span><b>' + fmt(u.hp) + ' / ' + fmt(u.maxhp) + '</b></div></div></div>' +
      '<div class="row end"><button onclick="SG.UI.close()">收起</button></div>');
  };
  UI.mergeCount = function () { return SG.CARDS.filter(function (c) { return SG.canMerge(S, c.id); }).length; };

  // ===== 主城 =====
  function figStyle(art) {     // 主城取景：臉對到中間（偏移限 30%～70%）；一定要露到胸口下緣，胸口位置低或臉很大的特寫立繪就整張縮小
    var f = SG.FACE[art] || [0.5, 0.44], c = SG.CHEST[art], fx = Math.max(0.3, Math.min(0.7, c ? (f[0] + c[0]) / 2 : f[0]));
    var fr = c ? Math.max(0.72, Math.min(1, c[1] + c[3] + 0.06)) : Math.min(1, 0.72 / Math.max(0.68, Math.min(1.08, 0.44 / f[1])));
    return "--fx:" + fx.toFixed(2) + ";--fr:" + fr.toFixed(2);
  }
  UI.r_home = function () {
    var tc = S.team.map(function (id) { return SG.CARD_BY_ID[id]; });
    var lead = SG.GEN[SG.HOME_LEAD] || tc.find(function (c) { return c.art; }) || tc[0] || null;   // ★ 目前主城固定站預設武將
    var ds = SG.Daily.status(S), canClaim = ds.list.some(function (x) { return x.ok && !x.claimed; });
    var next = SG.STAGES.find(function (st) { return !S.cleared[st.id]; });
    var h = '<div class="stage">', stat = '';
    if (lead) {
      var b = SG.best(S, lead.id) || { rar: lead.vers[0], star: lead.ur ? 6 : 1 }, u = SG.unitStats(lead, b.rar, b.star);
      h += (lead.artBg ? '<div class="bg" style="background-image:url(img/' + lead.art + '_full.webp)"></div>' : '<div class="bg f-' + FV[lead.fac] + ' v' + SG.bgv(lead.art) + '"></div><div class="mist a"></div>') +
        (lead.artBg ? '' : lead.art ? '<img class="fig" style="' + figStyle(lead.art) + '" src="img/' + lead.art + '_full.webp" alt="' + lead.name + '">' : '<div class="brush">' + lead.gen + '</div>') +
        '<canvas id="hero-petal" class="petal"></canvas><div class="shade"></div>' +
        '<div class="plaque"><span class="nm">' + lead.gen + '</span><span class="rk r-' + b.rar + '">' + b.rar + '</span><span class="st">' + "★".repeat(b.star) + '</span></div>' +
        '<div class="seals"><span class="fs f-' + FV[lead.fac] + '">' + lead.fac[0] + '</span>' + (lead.ur && lead.ver ? '<span class="note">' + lead.ver + '</span>' : '') + '</div>' +
        '';
      var stat = '<div class="stat"><span class="who">' + b.rar + ' ' + b.star + '★・' + SG.TYPES[lead.typ].name + ' ' + fmt(u.hp) + '</span>' +
        '<span class="trio">武<b>' + u.w + '</b>智<b>' + u.z + '</b>魅<b>' + u.m + '</b></span></div>';
    } else {
      h += '<canvas id="hero-bg"></canvas><div class="shade"></div>';
    }
    h += '<div class="side">' +
      '<button class="orb" id="h-task"><img src="img/ui_ic_task.webp" alt=""><span>每日任務</span>' + (canClaim ? '<i class="badge"></i>' : '') + '</button>' +
      '<button class="orb" id="h-rec"><img src="img/ui_ic_tea.webp" alt=""><span>茶館招募</span></button>' +
      '<button class="orb" id="h-book"><img src="img/ui_ic_book.webp" alt=""><span>收集冊</span></button>' +
      '<button class="orb gear" id="h-set"><b>設</b><span>設定</span></button></div>' +
      '<div class="go">' + stat + '<button class="plaq" id="h-go"><span>出戰</span></button>' +
      '<div class="nxt">' + (next ? '下一戰　' + next.id + '　' + next.name : '第一章已全數通關') + '</div></div>' +
      '</div>';
    $("#s-home").innerHTML = h;
    if ($("#hero-bg")) SG.Scene.home($("#hero-bg"), 7);
    if ($("#hero-petal")) SG.Scene.petals($("#hero-petal"));
    $("#h-go").onclick = function () { UI.go("camp"); };
    $("#h-task").onclick = UI.tasks;
    $("#h-rec").onclick = function () { UI.go("recruit"); };
    $("#h-book").onclick = function () { UI.go("book"); };
    $("#h-set").onclick = function () {
      UI.modal('<h2>設定</h2><p class="dim">第一期試玩版：單機，進度存在這台裝置的瀏覽器。主城顯示的是隊伍第一位武將；元寶為測試用，到酒館可領。</p>' +
        '<div class="row end"><button class="sm plain" id="h-reset">重置進度</button><button onclick="SG.UI.close()">收起</button></div>');
      $("#h-reset").onclick = function () {
        UI.modal('<h2>重置進度</h2><p>所有武將、銅錢與通關紀錄都會清空，無法復原。</p><div class="row end"><button onclick="SG.UI.close()">取消</button><button class="pri" id="rs-ok">清空重來</button></div>');
        $("#rs-ok").onclick = function () { SG.Store.reset(); location.reload(); };
      };
    };
  };

  // ===== 每日任務 =====
  UI.tasks = function () {
    var ds = SG.Daily.status(S);
    var rows = ds.list.map(function (x) {
      return '<div class="li"><div class="grow"><b>' + x.t.name + '</b><div class="sub">' + x.cur + ' / ' + x.t.need + '・銅錢 ' + fmt(x.t.reward) + '</div></div>' +
        (x.claimed ? '<span class="dim">已領</span>' : '<button class="gold" data-claim="' + x.t.id + '" ' + (x.ok ? '' : 'disabled') + '>領取</button>') + '</div>';
    }).join("");
    var chests = SG.ACTIVITY_CHESTS.map(function (c, i) {
      var got = S.daily.chests[i];
      return '<button class="sm" data-chest="' + i + '" ' + (got || ds.done < c.need ? 'disabled' : '') + '>完成 ' + c.need + ' 項：' + fmt(c.reward) + (got ? '（已領）' : '') + '</button>';
    }).join("");
    UI.modal('<h2>每日任務</h2><div>' + rows + '</div><div class="row">' + chests + '</div>' +
      '<p class="dim">另外，戰役每勝一場得銅錢 ' + fmt(SG.WIN_COPPER) + '；首次通關再得 ' + fmt(SG.STAGE_FIRST.copper) + ' 與茶館抽券 ' + SG.STAGE_FIRST.tickets + ' 張。</p>' +
      '<div class="row end"><button onclick="SG.UI.close()">收起</button></div>');
    $$("[data-claim]").forEach(function (b) { b.onclick = function () { var v = SG.Daily.claim(S, b.dataset.claim); if (v) UI.flash("銅錢 +" + fmt(v)); UI.save(); UI.tasks(); }; });
    $$("[data-chest]").forEach(function (b) { b.onclick = function () { var v = SG.Daily.claimChest(S, +b.dataset.chest); if (v) UI.flash("銅錢 +" + fmt(v)); UI.save(); UI.tasks(); }; });
  };

  // ===== 戰役 =====
  UI.r_camp = function () {
    var charm = SG.teamCharm(S);
    var html = UI.strip("st-camp", "黃巾之亂", "第一章・教學章節，首次通關送銅錢與茶館抽券") +
      '<div class="paper"><div class="trio"><span>隊伍平均魅力<b>' + Math.round(charm) + '</b></span><span>招降率<b>' + pct(charm * SG.F.REC) + '</b></span><span>已招降<b>' + (S.recruited || 0) + '</b></span></div>' +
      '<div class="dim" style="margin-top:4px">每打倒一名有名字的敵將，照招降率擲一次；成功就得到她的 N 卡。</div></div><div class="paper flush">';
    var unlocked = true;
    SG.STAGES.forEach(function (st) {
      var done = !!S.cleared[st.id], can = unlocked;
      var named = st.enemy.filter(function (e) { return SG.GEN[e.name]; }).map(function (e) { return e.name; });
      html += '<div class="li"><span class="no ' + (done ? 'done' : can ? '' : 'lock') + '">' + st.id + '</span><div class="grow"><b>' + st.name + '</b> <span class="tag">' + ({ annihilate: "殲滅", siege: "攻城", defend: "守城" })[st.mode] + '</span>' +
        (done ? '<span class="tag red">已通關</span>' : '') +
        '<div class="sub">' + st.tip + (named.length ? '<br>敵將：' + named.join("、") : '') + '</div></div>' +
        '<button class="' + (can ? 'pri' : '') + '" data-stage="' + st.id + '" ' + (can ? '' : 'disabled') + '>' + (can ? '出戰' : '未開') + '</button></div>';
      if (!done) unlocked = false;
    });
    $("#s-camp").innerHTML = html + '</div>';
    SG.Scene.banner($("#st-camp"), 21);
    $$("[data-stage]").forEach(function (b) {
      b.onclick = function () {
        if (!S.team.length) return UI.flash("先到編隊選武將");
        SG.BattleUI.start(SG.STAGES.find(function (x) { return x.id === b.dataset.stage; }));
      };
    });
  };

  // ===== 招募 =====
  UI.r_recruit = function () {
    var sur = RAR.reduce(function (a, r) { return a + S.surplus[r]; }, 0);
    var surVal = RAR.reduce(function (a, r) { return a + S.surplus[r] * SG.SELL[r]; }, 0);
    var html = UI.strip("st-rec", "招賢納士", "茶館用銅錢、酒館用元寶") + '<h2>茶館 <small>銅錢招募・一抽 ' + fmt(SG.TEA_COST) + '</small></h2>' +
      '<p class="lead">兩張同星可以合成下一星，兩張 6★ 合成下一稀有度的 1★。抽完到這裡或收集冊按「一鍵合成」。</p>' +
      '<div class="row"><button class="gold" id="rc-merge" ' + (UI.mergeCount() ? '' : 'disabled') + '>一鍵合成（' + UI.mergeCount() + ' 位可合）</button></div>';
    SG.TEAHOUSES.forEach(function (h) {
      html += '<div class="paper house"><span class="sign">茶</span><div class="grow"><b class="t">' + h.name + '</b> <span class="dim">' + h.desc + (h.series ? '・池子小，同名卡多' : '') + '</span>' +
        '<div class="row" style="margin-top:6px"><button data-tea="' + h.id + '" data-n="1">1 抽</button><button data-tea="' + h.id + '" data-n="10">10 抽</button><button class="gold" data-tea="' + h.id + '" data-n="100">100 抽</button>' +
        (h.id === "tea_all" ? '<button data-tea="tea_all" data-n="10" data-tk="1" ' + (S.tickets >= 10 ? '' : 'disabled') + '>用抽券 10 抽</button>' : '') + '</div></div></div>';
    });
    html += '<p class="dim">茶館機率：N 79%・R 20%・SR 0.95%（系列茶館 0.4%）・SSR 1/6,000・UR 1/6,000（測試期）</p>' +
      '<h2>酒館 <small>元寶招募・沒有 N 卡</small></h2>' +
      '<div class="paper house tavern"><span class="sign">酒</span><div class="grow"><b class="t">一般酒館</b> <span class="dim">R 60%・SR 37%・SSR 2%・UR 1%</span>' +
      '<div class="row" style="margin-top:6px"><button data-tav="1">單抽・1 元寶</button><button class="pri" data-tav="11">11 連・10 元寶</button><button class="sm" id="yb-test">測試用：領 100 元寶</button></div>' +
      '<div class="dim" style="margin-top:4px">隱藏酒館之後開放。</div></div></div>' +
      '<div class="paper"><b class="kai" style="font-size:17px">多餘卡片</b><div class="dim">武將到頂後再抽到的卡：' +
      RAR.map(function (r) { return r + " " + S.surplus[r]; }).join("・") + '</div><div class="row" style="margin-top:6px"><button class="gold" id="sell" ' + (sur ? '' : 'disabled') + '>全部出售，換銅錢 ' + fmt(surVal) + '</button></div></div>';
    $("#s-recruit").innerHTML = html;
    SG.Scene.banner($("#st-rec"), 34);
    $$("[data-tea]").forEach(function (b) {
      b.onclick = function () {
        var h = SG.TEAHOUSES.find(function (x) { return x.id === b.dataset.tea; });
        var r = SG.Gacha.tea(S, h, +b.dataset.n, !!b.dataset.tk);
        if (r.err) return UI.flash(r.err);
        UI.save(); UI.reveal(h.name, r, function () { UI.result(h.name, r); UI.r_recruit(); });
      };
    });
    $$("[data-tav]").forEach(function (b) {
      b.onclick = function () { var r = SG.Gacha.tavern(S, +b.dataset.tav); if (r.err) return UI.flash(r.err); UI.save(); UI.reveal("一般酒館", r, function () { UI.result("一般酒館", r); UI.r_recruit(); }); };
    });
    $("#rc-merge").onclick = function () { UI.mergeAllFlow(function () { if ($("#s-recruit").classList.contains("show")) UI.r_recruit(); }); };
    $("#yb-test").onclick = function () { S.yuanbao += 100; UI.save(); UI.r_recruit(); };
    $("#sell").onclick = function () { var r = SG.Gacha.sellSurplus(S); UI.save(); UI.flash("售出 " + r.cnt + " 張，銅錢 +" + fmt(r.total)); UI.r_recruit(); };
  };
  UI.result = function (title, r, note) {
    var top = r.hits.filter(function (h) { return h.rar === "SSR" || h.rar === "UR"; });
    var hits = r.hits.slice(0, 24).map(function (h) { return UI.cardHtml(h.card, { rar: h.rar, star: h.card.ur ? 6 : 1 }); }).join("");
    UI.modal('<h2>' + title + '　' + r.n + ' 抽</h2>' +
      '<div>' + RAR.map(function (x) { return '<span class="tag">' + x + ' ' + r.byRar[x] + '</span>'; }).join("") + '</div>' +
      '<p>' + (r.merges ? '已合成 ' + r.merges + ' 次・' : '') + '新武將 ' + r.newCards + ' 名' + (r.surplus ? '・到頂轉出售 ' + r.surplus + ' 張' : '') + '</p>' +
      (hits ? '<p class="dim">這次的 SR 以上：</p><div class="cards">' + hits + '</div>' : '<p class="dim">這次沒有 SR 以上。</p>') +
      (note ? '<p>' + note + '</p><div class="cards">' + S.team.map(function (id) { return UI.cardHtml(SG.CARD_BY_ID[id], SG.best(S, id)); }).join("") + '</div>' : '') +
      '<div class="row end">' + (note ? '<button class="plain" onclick="SG.UI.close();SG.UI.go(\'team\')">去編隊</button>' : '') + '<button onclick="SG.UI.close()">收下</button></div>');
  };

  // ===== 收集冊 =====
  UI.bookFac = "蜀";
  UI.r_book = function () {
    if (!S.daily.counts.book) { SG.Daily.bump(S, "book", 1); UI.save(); }
    var own = function (c) { return !!SG.best(S, c.id); };
    var total = SG.CARDS.filter(own).length;
    var list = SG.CARDS.filter(function (c) { return c.fac === UI.bookFac; });
    $("#s-book").innerHTML = UI.strip("st-book", "群英名冊", "已收 " + total + " / " + SG.CARDS.length + "・點名帖看大圖與數值") +
      '<div class="tabs">' + SG.FACS.map(function (f) {
        var all = SG.CARDS.filter(function (c) { return c.fac === f; });
        return '<button class="' + (f === UI.bookFac ? 'on' : '') + '" data-fac="' + f + '">' + f + '<small>' + all.filter(own).length + '/' + all.length + '</small></button>';
      }).join("") + '</div>' +
      '<div class="row"><span class="dim grow">兩張同星合成下一星。隊伍裡的卡要先移出才能合。</span><button class="gold" id="bk-merge" ' + (UI.mergeCount() ? '' : 'disabled') + '>一鍵合成（' + UI.mergeCount() + '）</button></div>' +
      '<div class="cards">' + list.map(function (c) { return UI.cardHtml(c, SG.best(S, c.id), { attr: 'data-card="' + c.id + '"' + (SG.canMerge(S, c.id) ? ' data-mg="1"' : '') }); }).join("") + '</div>';
    SG.Scene.banner($("#st-book"), 52);
    $("#bk-merge").onclick = function () { UI.mergeAllFlow(function () { if ($("#s-book").classList.contains("show")) UI.r_book(); }); };
    $$("[data-fac]").forEach(function (b) { b.onclick = function () { UI.bookFac = b.dataset.fac; UI.r_book(); }; });
    $$("[data-card]").forEach(function (b) { b.onclick = function () { UI.cardDetail(SG.CARD_BY_ID[b.dataset.card]); }; });
  };

  // ===== 編隊 =====
  UI.r_team = function () {
    var used = {}; S.team.forEach(function (id) { used[SG.CARD_BY_ID[id].gen] = id; });
    var line = function (c, b) {
      var u = SG.unitStats(c, b.rar, b.star);
      return '<b>' + c.name + '</b> <span class="tag">' + b.rar + ' ' + b.star + '★</span><span class="tag">' + c.typ + '</span>' +
        '<div class="sub">武 ' + u.w + '・智 ' + u.z + '・魅 ' + u.m + '｜兵 ' + fmt(u.hp) + '・' + (c.typ === "法" ? '法術 ' + u.asp : '普攻 ' + u.am) + '</div>';
    };
    var teamHtml = S.team.map(function (id, i) {
      var c = SG.CARD_BY_ID[id], b = SG.best(S, id);
      return '<div class="li" data-card="' + id + '">' + UI.head(c.gen, c.fac, c.art) + '<div class="grow">' + line(c, b) + '</div>' +
        (i ? '<button class="sm" data-lead="' + id + '">任主將</button>' : '<span class="tag red">主將</span>') + '<button class="sm" data-rm="' + id + '">移出</button></div>';
    }).join("");
    var so = UI.tSort || "戰力", ff = UI.tFac || "全部", ft = UI.tTyp || "全部";
    var keyOf = function (x) { var u = SG.unitStats(x.c, x.b.rar, x.b.star); return so === "武力" ? u.w : so === "智力" ? u.z : so === "魅力" ? u.m : so === "卡別" ? RAR.indexOf(x.b.rar) * 10 + x.b.star : x.p; };
    var pool = SG.CARDS.map(function (c) { var b = SG.best(S, c.id); return b ? { c: c, b: b, p: SG.power(c, b) } : null; })
      .filter(function (x) { return x && S.team.indexOf(x.c.id) < 0 && (ff === "全部" || x.c.fac === ff) && (ft === "全部" || x.c.typ === ft); })
      .sort(function (a, b) { return keyOf(b) - keyOf(a) || b.p - a.p; });
    var chips = function (attr, cur, arr) { return arr.map(function (v) { return '<button class="chip' + (v === cur ? ' on' : '') + '" data-' + attr + '="' + v + '">' + v + '</button>'; }).join(""); };
    var poolHtml = pool.slice(0, 80).map(function (x) {
      var dup = used[x.c.gen];
      return '<div class="li" data-card="' + x.c.id + '">' + UI.head(x.c.gen, x.c.fac, x.c.art) + '<div class="grow">' + line(x.c, x.b) + '</div>' +
        '<button class="sm" data-add="' + x.c.id + '" ' + (S.team.length >= 10 && !dup ? 'disabled' : '') + '>' + (dup ? '替換' : '加入') + '</button></div>';
    }).join("");
    var charm = SG.teamCharm(S);
    $("#s-team").innerHTML = UI.strip("st-team", "點將布陣", "出戰 " + S.team.length + " / 10・同名武將只能一名") +
      '<div class="row"><span class="dim grow">平均魅力 ' + Math.round(charm) + '，招降率 ' + pct(charm * SG.F.REC) + '</span><button class="gold" id="t-auto">一鍵最強</button></div>' +
      '<div class="paper flush">' + (teamHtml || '<div class="li dim">還沒有武將</div>') + '</div>' +
      '<h2>可選武將 <small>' + pool.length + ' 位</small></h2>' +
      '<div class="filters"><div><span>排序</span>' + chips("so", so, ["戰力", "武力", "智力", "魅力", "卡別"]) + '</div>' +
      '<div><span>陣營</span>' + chips("ff", ff, ["全部"].concat(SG.FACS)) + '</div>' +
      '<div><span>兵種</span>' + chips("ft", ft, ["全部", "槍", "騎", "弓", "刺", "法"]) + '</div></div><div class="paper flush">' + (poolHtml || '<div class="li dim">沒有符合的武將</div>') + '</div>';
    SG.Scene.banner($("#st-team"), 68);
    $$("[data-so]").forEach(function (b) { b.onclick = function () { UI.tSort = b.dataset.so; UI.r_team(); }; });
    $$("[data-ff]").forEach(function (b) { b.onclick = function () { UI.tFac = b.dataset.ff; UI.r_team(); }; });
    $$("[data-ft]").forEach(function (b) { b.onclick = function () { UI.tTyp = b.dataset.ft; UI.r_team(); }; });
    $("#t-auto").onclick = function () { SG.autoTeam(S); UI.save(); UI.r_team(); };
    $$("#s-team [data-card]").forEach(function (row) {
      row.onclick = function (e) { if (e.target.tagName === "BUTTON") return; UI.cardDetail(SG.CARD_BY_ID[row.dataset.card]); };
    });
    $$("[data-rm]").forEach(function (b) { b.onclick = function () { S.team = S.team.filter(function (x) { return x !== b.dataset.rm; }); UI.save(); UI.r_team(); }; });
    $$("[data-lead]").forEach(function (b) { b.onclick = function () { S.team = [b.dataset.lead].concat(S.team.filter(function (x) { return x !== b.dataset.lead; })); UI.save(); UI.r_team(); }; });
    $$("[data-add]").forEach(function (b) {
      b.onclick = function () {
        var c = SG.CARD_BY_ID[b.dataset.add], dup = used[c.gen];
        if (dup) S.team[S.team.indexOf(dup)] = c.id; else if (S.team.length < 10) S.team.push(c.id);
        UI.save(); UI.r_team();
      };
    });
  };
})(window.SG);
