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
  if (tut) { S.welcomePending = true; SG.Store.save(S); }   // ✅ Jay 2026-11-20：第一次點「戰役」才跳教學（現在主測鬥將）
  var play = /[?&]play=([\w-]+)/.exec(location.search);     // 從關卡編輯器按「在正式版試玩」過來
  if (play) { var st = SG.STAGES.find(function (x) { return x.id === play[1]; }); if (st) setTimeout(function () { SG.UI.close(); SG.BattleUI.fromEditor = true; SG.BattleUI.start(st); }, 400); }
})(window.SG);
