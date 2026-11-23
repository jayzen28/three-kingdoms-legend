/* 進入點 */
(function (SG) {
  var S = SG.Store.load();
  SG._state = S;
  SG.migrate(S);
  var tut = SG.giveTutorial(S);
  SG.giftOnce(S);
  SG.Store.save(S);
  SG.UI.init(S);
  SG.UI.res();
  SG.Audio.init();
  SG.UI.go("home");
  if (!SG.Profile.named()) setTimeout(function () { SG.Profile.ask(); }, 1900);   // ✅ Jay 2026-11-23：第一次玩先取名字
  if (tut) { S.welcomePending = true; SG.Store.save(S); }   // ✅ Jay 2026-11-20：第一次點「戰役」才跳教學（現在主測鬥將）
  var play = /[?&]play=([\w-]+)/.exec(location.search);     // 從關卡編輯器按「在正式版試玩」過來
  if (play) { var st = SG.STAGES.find(function (x) { return x.id === play[1]; }); if (st) setTimeout(function () { SG.UI.close(); SG.BattleUI.fromEditor = true; SG.BattleUI.start(st); }, 400); }
  // ✅ Jay 2026-11-23：手機常停在舊版 → 開啟、切回來時檢查有沒有新版（index.html 的 build 標記），有就在主城自動重新載入（★ 其他畫面先不打斷）
  (function () {
    var bm = document.querySelector('meta[name="build"]'), cur = bm ? bm.content : "", busy = false, newer = "";
    function apply() {
      if (!newer || location.search.indexOf("v=" + newer) >= 0) return;
      if (document.body.dataset.scr !== "home" || document.querySelector("#modal.show")) return;
      location.replace(location.pathname + "?v=" + encodeURIComponent(newer));
    }
    function check() {
      if (busy || !cur) return; busy = true;
      fetch("index.html?_=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
        var m = /<meta name="build" content="([^"]+)"/.exec(t); if (m && m[1] !== cur) newer = m[1]; apply();
      }).catch(function () { }).then(function () { busy = false; });
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) check(); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) check(); });
    setInterval(function () { if (!document.hidden) { if (newer) apply(); else check(); } }, 120000);
    setTimeout(check, 3500);
  })();
})(window.SG);
