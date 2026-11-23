/* 配樂：依畫面換曲，第一次點擊畫面後才開始播（瀏覽器規定） */
(function (SG) {
  var TRACKS = { theme: "audio/theme.mp3", council: "audio/council.mp3", slot1: "audio/slot_bgm1.mp3", slot2: "audio/slot_bgm2.mp3" };   // 定鼎中原／燭下謀略／先鋒來襲／黃天當立
  var SCENE = { home: "theme", recruit: "theme", book: "theme", camp: "council", team: "council", battle: "council", duel: "council", duelb: "council", slot: "council", slotb: "council" };
  var els = {}, cur = null, want = "theme", on = true, armed = false;
  try { on = localStorage.getItem("sgl_snd") !== "0"; } catch (e) {}
  function el(k) { if (!els[k]) { var a = new Audio(TRACKS[k]); a.loop = true; a.preload = "none"; a.volume = 0; els[k] = a; } return els[k]; }
  function fade(a, to, done) {
    clearInterval(a._f); a._f = setInterval(function () {
      var v = a.volume + (to > a.volume ? 0.06 : -0.06);
      if ((to > a.volume && v >= to) || (to <= a.volume && v <= to)) { a.volume = to; clearInterval(a._f); if (done) done(); } else a.volume = Math.max(0, Math.min(1, v));
    }, 50);
  }
  function apply() {
    if (!armed) return;
    if (!on) { if (cur) { var o = els[cur]; fade(o, 0, function () { o.pause(); }); } return; }
    if (cur && cur !== want) { var old = els[cur]; fade(old, 0, function () { old.pause(); }); }
    cur = want; var a = el(cur);
    var p = a.play(); if (p && p.catch) p.catch(function () {});
    fade(a, 0.6);
  }
  function paint() { document.querySelectorAll(".snd").forEach(function (b) { b.classList.toggle("off", !on); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
  // 音效：國樂音色（古箏刮奏、堂鼓、大鑼、梆子、編鐘），檔案在 audio/sfx_*.mp3
  var SFX = ["flip", "shake", "burst_n", "burst_sr", "burst_ssr", "burst_ur", "stream_s", "stream_l", "sr", "ssr", "ur"];
  // 拉霸守城的音效（Suno 生成，Jay 2026-11-23 提供）：檔案是 audio/sl_*.mp3，進拉霸守城才載入
  var SLOT_SFX = ["sl_stop", "sl_drum", "sl_win", "sl_big", "sl_jack", "sl_coin", "sl_fire", "sl_thunder", "sl_wind", "sl_rock", "sl_cut", "sl_gate"];
  var pool = {}, VOL = { flip: 0.55, shake: 0.8, stream_s: 0.75, stream_l: 0.75 };
  function sfxEl(k) {
    var p = pool[k] || (pool[k] = { list: [], i: 0 }), size = k === "flip" ? 5 : 2;
    if (p.list.length < size) { var e = new Audio(k.indexOf("sl_") === 0 ? "audio/" + k + ".mp3" : "audio/sfx_" + k + ".mp3"); e.preload = "auto"; p.list.push(e); return e; }
    p.i = (p.i + 1) % size; return p.list[p.i];
  }
  function preload() { SFX.forEach(function (k) { if (!pool[k]) { var e = sfxEl(k); try { e.load(); } catch (x) {} } }); }
  SG.Audio = {
    sfx: function (k, rate, from, vol) {
      if (!on || (SFX.indexOf(k) < 0 && SLOT_SFX.indexOf(k) < 0)) return;
      try { var e = sfxEl(k); e.pause(); e.currentTime = from || 0; e.volume = vol || VOL[k] || 0.9; e.playbackRate = rate || 1; var p = e.play(); if (p && p.catch) p.catch(function () {}); } catch (x) {}
    },
    // 角色語音：檔案不存在就安靜略過（目前還沒有語音檔）
    voice: function (art, zone, n) {
      if (!on) return;
      try { var e = new Audio("audio/voice/" + art + "_" + zone + "_" + n + ".mp3"); e.volume = 1; var p = e.play(); if (p && p.catch) p.catch(function () {}); } catch (x) {}
    },
    stopSfx: function (k) { var p = pool[k]; if (p) p.list.forEach(function (e) { try { e.pause(); } catch (x) {} }); },
    scene: function (name) { want = SCENE[name] || "theme"; apply(); },
    // 指定播某一首（拉霸守城開戰時用）；restart＝從頭播
    play: function (k, restart) { if (!TRACKS[k]) return; want = k; if (restart) { try { el(k).currentTime = 0; } catch (e) {} } apply(); },
    isOn: function () { return on; },
    preloadSlot: function () { SLOT_SFX.forEach(function (k) { if (!pool[k]) { var e = sfxEl(k); try { e.load(); } catch (x) {} } }); ["slot1", "slot2"].forEach(function (k) { el(k).preload = "auto"; }); },
    toggle: function () { on = !on; try { localStorage.setItem("sgl_snd", on ? "1" : "0"); } catch (e) {} armed = true; paint(); apply(); },
    init: function () {
      paint();
      document.querySelectorAll(".snd").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); SG.Audio.toggle(); }); });
      document.addEventListener("pointerdown", function () { if (!armed) { armed = true; apply(); preload(); } }, { once: false });
    },
  };
})(window.SG);
