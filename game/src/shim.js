// 讓瀏覽器用的遊戲規則檔（public/js/*.js）也能在伺服器上跑
globalThis.window = globalThis;
globalThis.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
