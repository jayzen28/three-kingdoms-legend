/* 存檔層：目前用 localStorage；之後換 Firebase 只改這支 */
(function (SG) {
  var KEY = "sgl_save_v3";
  var mem = null;
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  SG.Store = {
    fresh: function () {
      return {
        v: 2, copper: SG.START_COPPER, yuanbao: 0, tickets: 0,
        inv: {},          // cardId -> { "R-3": 數量, ... }
        capped: {},       // cardId -> true（到頂）
        surplus: { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 },   // 到頂後多出的卡
        team: [],         // cardId[]（最多 10，不可同名）
        cleared: {},      // stageId -> true
        seen: {},         // 收集冊看過
        daily: { date: "", counts: {}, claimed: {}, chests: {} },
        starter: false, tut: false, recruited: 0,
      };
    },
    load: function () {
      var s = null;
      try { var raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = mem; }
      if (!s) s = mem || SG.Store.fresh();
      SG.Store.rollDaily(s);
      return s;
    },
    save: function (s) {
      mem = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 沒有儲存空間時只留在記憶體 */ }
    },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} mem = null; },
    rollDaily: function (s) {
      var t = today();
      if (s.daily.date !== t) { s.daily = { date: t, counts: { login: 1 }, claimed: {}, chests: {} }; }
    },
  };
})(window.SG);
