/* 三國LEGEND 伺服器：鬥將線上對戰
   - 網頁本身還是靜態檔（public/），只有 /api/ 開頭的網址走這裡
   - 每個房間是一個 Durable Object（Room），由伺服器跑規則引擎、判定結果
   - 隨機配對用一個共用的 Lobby
   ✅ Jay 2026-11-20：房間代碼＋隨機配對兩種都要；帳號先不管
   ★ 開發先定：每回合 90 秒、格擋等選擇 25 秒、換手牌 30 秒、斷線 60 秒沒回來判負 */
import "./shim.js";
import "../public/js/data.js";
import "../public/js/duel-data.js";
import "../public/js/duel.js";
import "../public/js/duel-net.js";

const D = globalThis.SG.DUEL;
const TURN_MS = 90000, PICK_MS = 25000, MULL_MS = 30000, GONE_MS = 60000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/new") {
      for (let i = 0; i < 8; i++) {
        const code = String(1000 + Math.floor(Math.random() * 9000));
        const r = await env.ROOM.get(env.ROOM.idFromName(code)).fetch("https://room/claim");
        if (r.ok) return Response.json({ room: code });
      }
      return Response.json({ error: "房間太多，請稍後再試" }, { status: 503 });
    }
    const m = url.pathname.match(/^\/api\/room\/(\d{4})$/);
    if (m) return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
    if (url.pathname === "/api/match") return env.LOBBY.get(env.LOBBY.idFromName("main")).fetch(req);
    if (url.pathname.startsWith("/api/")) return new Response("not found", { status: 404 });
    return env.ASSETS.fetch(req);
  }
};

function wsPair() { const p = new WebSocketPair(); return [p[0], p[1]]; }
const send = (ws, o) => { try { ws && ws.send(JSON.stringify(o)); } catch (e) {} };

// ===== 隨機配對 =====
export class Lobby {
  constructor(ctx, env) { this.env = env; this.waiting = null; }
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("ws only", { status: 426 });
    const [client, ws] = wsPair(); ws.accept();
    const pid = new URL(req.url).searchParams.get("pid") || "";
    const w = this.waiting;
    if (w && w.pid !== pid && w.ws.readyState === 1) {
      this.waiting = null;
      let code = null;
      for (let i = 0; i < 8 && !code; i++) {
        const c = String(1000 + Math.floor(Math.random() * 9000));
        const r = await this.env.ROOM.get(this.env.ROOM.idFromName(c)).fetch("https://room/claim");
        if (r.ok) code = c;
      }
      if (!code) { send(ws, { t: "err", msg: "配對失敗，請再試一次" }); ws.close(); this.waiting = w; return new Response(null, { status: 101, webSocket: client }); }
      send(w.ws, { t: "matched", room: code }); send(ws, { t: "matched", room: code });
      setTimeout(() => { try { w.ws.close(); } catch (e) {} try { ws.close(); } catch (e) {} }, 500);
    } else {
      if (w && w.ws !== ws) { try { w.ws.close(); } catch (e) {} }
      this.waiting = { pid, ws };
      send(ws, { t: "queued" });
      ws.addEventListener("close", () => { if (this.waiting && this.waiting.ws === ws) this.waiting = null; });
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}

// ===== 一個對戰房間 =====
export class Room {
  constructor(ctx, env) { this.reset(); }
  reset() {
    this.claimedAt = 0; this.seats = []; this.G = null; this.stage = "empty"; this.timers = {}; this.deadline = 0; this.pickDeadline = 0;
  }
  busy() { return this.stage !== "empty" && this.stage !== "over" && !(this.stage === "claimed" && Date.now() - this.claimedAt > 10 * 60000); }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/claim") {
      if (this.busy()) return new Response("busy", { status: 409 });
      this.clearTimers(); this.reset(); this.stage = "claimed"; this.claimedAt = Date.now();
      return new Response("ok");
    }
    if (req.headers.get("Upgrade") !== "websocket") return new Response("ws only", { status: 426 });
    const [client, ws] = wsPair(); ws.accept();
    ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } try { this.onMsg(ws, m); } catch (x) { console.log("room error", x && x.stack); send(ws, { t: "err", msg: "伺服器錯誤：" + (x && x.message) }); } });
    ws.addEventListener("close", () => this.onClose(ws));
    return new Response(null, { status: 101, webSocket: client });
  }
  seatOf(ws) { return this.seats.findIndex((s) => s && s.ws === ws); }
  onMsg(ws, m) {
    if (m.t === "join") return this.join(ws, m);
    const seat = this.seatOf(ws); if (seat < 0) return;
    if (m.t === "ping") return send(ws, { t: "pong" });
    if (m.t === "quit") return this.finish(1 - seat, "對方投降");
    if (this.stage === "mull") return this.onMull(seat, m);
    if (this.stage === "play" && m.t === "act") return this.onAct(seat, m.a, m.args || []);
  }
  join(ws, m) {
    const pid = String(m.pid || "").slice(0, 40), name = String(m.name || "玩家").slice(0, 12);
    const old = this.seats.findIndex((s) => s && s.pid === pid);
    if (old >= 0) {   // 斷線重連
      const s = this.seats[old]; if (s.ws && s.ws !== ws) { try { s.ws.close(); } catch (e) {} }
      s.ws = ws; s.gone = 0; clearTimeout(this.timers["gone" + old]);
      this.toOpp(old, { t: "opp", online: true });
      return this.sync(old);
    }
    if (this.stage === "over" || this.stage === "empty") return send(ws, { t: "err", msg: "找不到這個房間（可能已經結束）", fatal: true });
    if (this.seats.length >= 2) return send(ws, { t: "err", msg: "房間已經滿了", fatal: true });
    const bad = D.checkDeck(m.deck);
    if (bad) return send(ws, { t: "err", msg: bad, fatal: true });
    this.seats.push({ pid, name, ws, deck: m.deck, ready: false, mull: false });
    if (this.seats.length === 1) { this.stage = "wait"; return send(ws, { t: "wait" }); }
    this.begin();
  }
  begin() {
    const G = this.G = D.newGame(this.seats[0].deck, this.seats[1].deck, { human: 0 });
    G.both = true;
    this.stage = "mull"; this.deadline = Date.now() + MULL_MS;
    this.timer("turn", MULL_MS, () => { this.seats.forEach((s) => (s.ready = true)); this.startPlay(); });
    [0, 1].forEach((k) => this.sync(k));
  }
  onMull(seat, m) {
    const s = this.seats[seat];
    if (m.t === "mull" && !s.mull && !s.ready) { D.mulligan(this.G, seat); s.mull = true; return this.sync(seat); }
    if (m.t === "ready") { s.ready = true; this.toOpp(seat, { t: "oppReady" }); if (this.seats.every((x) => x.ready)) this.startPlay(); }
  }
  startPlay() {
    if (this.stage !== "mull") return;
    this.stage = "play"; D.startTurn(this.G); this.afterAct(true);
  }
  onAct(seat, a, args) {
    const G = this.G, pd = G.pending;
    const num = (x) => (typeof x === "number" ? x : -1);
    // 輪到誰決定
    if (pd) {
      const decider = pd.type === "block" ? 1 - pd.who : pd.who;
      if (seat !== decider) return;
      if (a === "block" && pd.type === "block") D.block(G, args[0] == null ? null : num(args[0]));
      else if (a === "discard" && pd.type === "discard") D.chooseDiscard(G, num(args[0]));
      else if (a === "return" && pd.type === "illusion") D.chooseReturn(G, (Array.isArray(args[0]) ? args[0] : []).map(num).slice(0, 2));
      else return;
      return this.afterAct(false);
    }
    if (seat !== G.cur || G.winner >= 0) return;
    const P = G.p[seat];
    if (a === "end") { D.endTurn(G); return this.afterAct(true); }
    let ok = true;
    if (a === "play") ok = P.hand[num(args[0])] && D.canPlay(G, seat, P.hand[num(args[0])]) && (args[1] === "front" || args[1] === "back") && D.play(G, seat, num(args[0]), args[1]);
    else if (a === "move") ok = D.move(G, seat, num(args[0]));
    else if (a === "extraDraw") ok = D.extraDraw(G, seat);
    else if (a === "swap") ok = P.hand[num(args[0])] && D.canSwap(G, seat, P.hand[num(args[0])]) && D.swap(G, seat, num(args[0]), num(args[1]));
    else if (a === "useItem") ok = P.hand[num(args[0])] && D.canItem(G, seat, P.hand[num(args[0])]) && D.useItem(G, seat, num(args[0]), args[1] == null ? undefined : num(args[1]));
    else if (a === "attack") ok = D.attack(G, seat, num(args[0]));
    else if (a === "snipe") ok = D.snipe(G, seat, num(args[0]), num(args[1]));
    else if (a === "breakGate") ok = D.breakGate(G, seat, num(args[0]));
    else if (a === "lubu") ok = D.lubu(G, seat, num(args[0]), num(args[1]));
    else return;
    if (ok === false) { send(this.seats[seat].ws, { t: "err", msg: "現在不能這樣做" }); return this.sync(seat); }
    this.afterAct(false);
  }
  afterAct(newTurn) {
    const G = this.G;
    if (G.winner >= 0) return this.finish(G.winner, "");
    if (newTurn) this.deadline = Date.now() + TURN_MS;
    this.timer("turn", this.deadline - Date.now(), () => this.timeUp());
    clearTimeout(this.timers.pick); this.pickDeadline = 0;
    if (G.pending) { this.pickDeadline = Date.now() + PICK_MS; this.timer("pick", PICK_MS, () => this.pickUp()); }
    [0, 1].forEach((k) => this.sync(k));
    D.clearEvents(G);
  }
  // 選擇超時：不擋／丟第一張／放回前兩張
  pickUp() {
    const G = this.G, pd = G && G.pending; if (!pd || this.stage !== "play") return;
    if (pd.type === "block") D.block(G, null);
    else if (pd.type === "discard") D.chooseDiscard(G, 0);
    else if (pd.type === "illusion") D.chooseReturn(G, [0, 1]);
    this.afterAct(false);
  }
  timeUp() {
    const G = this.G; if (!G || this.stage !== "play") return;
    for (let i = 0; i < 5 && G.pending; i++) { this.pickUp(); if (this.stage !== "play") return; }
    G.log((G.cur === 0 ? "我方" : "敵方") + "時間到，自動結束回合");
    D.endTurn(G); this.afterAct(true);
  }
  finish(winner, why) {
    if (this.stage === "over") return;
    if (this.G) this.G.winner = winner;
    this.stage = "over"; this.clearTimers();
    [0, 1].forEach((k) => { this.sync(k); send(this.seats[k] && this.seats[k].ws, { t: "over", win: winner === k, why }); });
  }
  sync(seat) {
    const s = this.seats[seat]; if (!s || !s.ws) return;
    const opp = this.seats[1 - seat], now = Date.now();
    if (this.stage === "wait") return send(s.ws, { t: "wait" });
    if (!this.G) return;
    const base = { now, opp: opp ? opp.name : "", oppOnline: !!(opp && opp.ws && !opp.gone) };
    if (this.stage === "mull") return send(s.ws, Object.assign(base, { t: "mull", hand: this.G.p[seat].hand.map((c) => (c.item ? D.itemKey(c.id) : c.name)), first: this.G.first === seat, mulled: s.mull, ready: s.ready, deadline: this.deadline }));
    send(s.ws, Object.assign(base, { t: "state", view: D.view(this.G, seat), deadline: this.deadline, pickDeadline: this.pickDeadline, over: this.stage === "over" }));
  }
  toOpp(seat, o) { const s = this.seats[1 - seat]; if (s) send(s.ws, o); }
  onClose(ws) {
    const seat = this.seatOf(ws); if (seat < 0) return;
    const s = this.seats[seat]; s.ws = null; s.gone = Date.now();
    if (this.stage === "wait") { this.reset(); return; }
    if (this.stage === "over") return;
    this.toOpp(seat, { t: "opp", online: false });
    this.timer("gone" + seat, GONE_MS, () => { if (this.seats[seat] && !this.seats[seat].ws) this.finish(1 - seat, "對方斷線"); });
  }
  timer(k, ms, fn) { clearTimeout(this.timers[k]); this.timers[k] = setTimeout(fn, Math.max(0, ms)); }
  clearTimers() { Object.keys(this.timers).forEach((k) => clearTimeout(this.timers[k])); this.timers = {}; }
}
