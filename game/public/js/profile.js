/* 玩家名字與排行榜
   ✅ Jay 2026-11-23：玩家第一次玩時取名字；做兩個排行榜（拉霸守城最高關卡前 20 名、鬥將排位）
   ★ 名字最多 8 個字；排行榜資料存在伺服器（/api/lb/slot、/api/lb/duel） */
(function (SG) {
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var P = SG.Profile = {};
  P.pid = function () { var p = LS("sgl_pid"); if (!p) { p = Math.random().toString(36).slice(2) + Date.now().toString(36); LS("sgl_pid", p); } return p; };
  P.name = function () { return LS("sgl_nick") || "主公"; };
  P.named = function () { return !!LS("sgl_named"); };
  P.setName = function (n) { n = String(n || "").replace(/[<>&"']/g, "").trim().slice(0, 8); if (!n) return false; LS("sgl_nick", n); LS("sgl_named", "1"); return true; };
  P.esc = esc;

  // 第一次玩：取名字（不能跳過）
  P.ask = function (done, again) {
    var UI = SG.UI;
    UI.modal('<h2>' + (again ? '更改名號' : '主公，請留下名號') + '</h2><p class="dim">這個名字會出現在排行榜和線上對戰（最多 8 個字）。</p>' +
      '<div class="row"><input id="pf-name" class="dnick" maxlength="8" placeholder="輸入名號" value="' + esc(again || LS("sgl_nick") ? P.name() : '') + '" style="flex:1"></div>' +
      '<div class="row end">' + (again ? '<button id="pf-cancel">取消</button>' : '') + '<button class="pri" id="pf-ok">確定</button></div>');
    UI.back = again ? null : function () { };
    var inp = document.getElementById("pf-name"); setTimeout(function () { try { inp.focus(); } catch (e) { } }, 100);
    var ok = function () { if (!P.setName(inp.value)) { inp.placeholder = "請輸入名號"; inp.focus(); return; } UI.back = null; UI.close(); if (done) done(P.name()); };
    document.getElementById("pf-ok").onclick = ok;
    inp.onkeydown = function (e) { if (e.key === "Enter") ok(); };
    var c = document.getElementById("pf-cancel"); if (c) c.onclick = function () { UI.close(); };
  };

  // ===== 排行榜 =====
  P.lb = function (kind, body) {
    var opt = body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ pid: P.pid(), name: P.name() }, body)) } : undefined;
    return fetch("/api/lb/" + kind + (body ? "" : "?pid=" + encodeURIComponent(P.pid())), opt).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  };
  P.rankTxt = function (r) { return r.tier + (r.div ? " " + r.div : "") + "・" + r.star + "★"; };
  P.boardHtml = function (kind, d) {
    if (!d) return '<div class="lb-box dim">讀取中…</div>';
    if (d.err) return '<div class="lb-box dim">排行榜暫時連不上</div>';
    var row = function (r, mine) {
      return '<div class="lb-row' + (mine ? ' me' : '') + (r.n <= 3 ? ' top' + r.n : '') + '"><b class="lb-n">' + r.n + '</b><span class="lb-name">' + esc(r.name) + '</span>' +
        (kind === "slot" ? '<span class="lb-v">第 ' + r.stage + ' 關</span>' : '<span class="lb-v">' + P.rankTxt(r) + '<small>' + r.w + ' 勝 ' + r.l + ' 敗</small></span>') + '</div>';
    };
    var myIn = d.me && d.me.n <= 20;
    return '<div class="lb-box">' + (d.top.length ? d.top.map(function (r) { return row(r, d.me && r.n === d.me.n); }).join("") : '<div class="dim">還沒有人上榜，搶第一吧！</div>') +
      (d.me && !myIn ? '<div class="lb-gap">⋯</div>' + row(d.me, true) : '') + '</div>';
  };
})(window.SG);
