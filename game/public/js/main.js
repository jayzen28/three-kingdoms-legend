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
  if (tut) SG.UI.welcome();
})(window.SG);
