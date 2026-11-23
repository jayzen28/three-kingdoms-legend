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
    if (/^\/api\/lb\/(slot|duel)$/.test(url.pathname)) return env.BOARD.get(env.BOARD.idFromName("main")).fetch(req);
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
        const r = await this.env.ROOM.get(this.env.ROOM.idFromName(c)).fetch("https://room/claim?ranked=1");
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
  constructor(ctx, env) { this.env = env; this.reset(); }
  reset() {
    this.ranked = false; this.claimedAt = 0; this.seats = []; this.G = null; this.stage = "empty"; this.timers = {}; this.deadline = 0; this.pickDeadline = 0;
  }
  busy() { return this.stage !== "empty" && this.stage !== "over" && !(this.stage === "claimed" && Date.now() - this.claimedAt > 10 * 60000); }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/claim") {
      if (this.busy()) return new Response("busy", { status: 409 });
      this.clearTimers(); this.reset(); this.stage = "claimed"; this.claimedAt = Date.now(); this.ranked = url.searchParams.get("ranked") === "1";
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
    const rar = {}; if (m.rar && typeof m.rar === "object") Object.keys(m.rar).slice(0, 80).forEach((k) => { if (["N", "R", "SR", "SSR", "UR"].indexOf(m.rar[k]) >= 0) rar[String(k).slice(0, 8)] = m.rar[k]; });
    this.seats.push({ pid, name, ws, deck: m.deck, rar, ready: false, mull: false });
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
    if (a === "play") ok = P.hand[num(args[0])] && D.canPlay(G, seat, P.hand[num(args[0])]) && (args[1] === "front" || args[1] === "back") && D.play(G, seat, num(args[0]), args[1], args[2] == null ? undefined : num(args[2]));
    else if (a === "move") ok = D.move(G, seat, num(args[0]));
    else if (a === "extraDraw") ok = D.extraDraw(G, seat);
    else if (a === "swap") ok = P.hand[num(args[0])] && D.canSwap(G, seat, P.hand[num(args[0])]) && D.swap(G, seat, num(args[0]), num(args[1]));
    else if (a === "useItem") ok = P.hand[num(args[0])] && D.canItem(G, seat, P.hand[num(args[0])]) && D.useItem(G, seat, num(args[0]), args[1] == null ? undefined : num(args[1]));
    else if (a === "attack") ok = D.attack(G, seat, num(args[0]));
    else if (a === "snipe") ok = D.snipe(G, seat, num(args[0]), num(args[1]));
    else if (a === "breakGate") ok = D.breakGate(G, seat, num(args[0]));
    else if (a === "lubu") ok = D.lubu(G, seat, num(args[0]), num(args[1]));
    else if (a === "duel") ok = D.duel(G, seat, num(args[0]), num(args[1]));
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
    // 隨機配對＝排位：由伺服器記錄雙方勝負（房間代碼的朋友對戰不算）
    if (this.ranked && this.env && this.env.BOARD && this.seats[0] && this.seats[1] && winner >= 0) {
      const rows = [0, 1].map((k) => ({ pid: this.seats[k].pid, name: this.seats[k].name, win: winner === k }));
      this.env.BOARD.get(this.env.BOARD.idFromName("main")).fetch("https://board/api/lb/duel", { method: "POST", headers: { "x-room": "1" }, body: JSON.stringify({ rows }) }).catch(() => {});
    }
  }
  sync(seat) {
    const s = this.seats[seat]; if (!s || !s.ws) return;
    const opp = this.seats[1 - seat], now = Date.now();
    if (this.stage === "wait") return send(s.ws, { t: "wait" });
    if (!this.G) return;
    const base = { now, opp: opp ? opp.name : "", oppOnline: !!(opp && opp.ws && !opp.gone), oppRar: opp ? opp.rar : {} };
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

// ===== 排行榜（拉霸守城：最高關卡；鬥將：排位） =====
// ✅ Jay 2026-11-23：拉霸守城排「玩到最後面的關卡」前 20 名；鬥將做排位（勝場或傳說對決式段位）
// ★ 開發先定：鬥將排位用軍階段位（7 階，每階 3 段，每段 3 星；贏 +1 星、輸 -1 星，不會掉出目前這一階），
//   只有「隨機配對」（含等不到人改跟電腦打）算排位；成績由玩家端回報（拉霸、電腦對手）或伺服器回報（真人對戰）
const TIERS = ["伍長", "什長", "百夫長", "校尉", "中郎將", "將軍", "大將軍"];
function cleanName(n) { return String(n || "主公").replace(/[<>&"'\u0000-\u001f]/g, "").trim().slice(0, 8) || "主公"; }
function cleanPid(p) { return String(p || "").replace(/[^a-z0-9]/gi, "").slice(0, 40); }
function rankOf(pts) {
  const t = Math.min(TIERS.length - 1, Math.floor(pts / 9));
  if (t === TIERS.length - 1) return { tier: TIERS[t], div: "", star: pts - t * 9 };
  const inT = pts - t * 9; return { tier: TIERS[t], div: ["III", "II", "I"][Math.floor(inT / 3)], star: inT % 3 };
}
export class Board {
  constructor(ctx, env) { this.st = ctx.storage; this.mem = {}; }
  async all(kind) {
    if (!this.mem[kind]) { const m = await this.st.list({ prefix: kind + ":" }); this.mem[kind] = new Map(); m.forEach((v, k) => this.mem[kind].set(k.slice(kind.length + 1), v)); }
    return this.mem[kind];
  }
  async put(kind, pid, row) { (await this.all(kind)).set(pid, row); await this.st.put(kind + ":" + pid, row); }
  sorted(kind, map) {
    const arr = Array.from(map.entries()).map(([pid, r]) => Object.assign({ pid }, r));
    if (kind === "slot") arr.sort((a, b) => b.stage - a.stage || a.t - b.t);
    else arr.sort((a, b) => b.pts - a.pts || b.w - a.w || a.t - b.t);
    return arr;
  }
  view(kind, arr, pid) {
    const pub = (r, i) => kind === "slot" ? { n: i + 1, name: r.name, stage: r.stage } : Object.assign({ n: i + 1, name: r.name, w: r.w, l: r.l, pts: r.pts }, rankOf(r.pts));
    const me = arr.findIndex((r) => r.pid === pid);
    return { top: arr.slice(0, 20).map(pub), me: me >= 0 ? pub(arr[me], me) : null, total: arr.length };
  }
  async fetch(req) {
    const url = new URL(req.url), kind = url.pathname.endsWith("/slot") ? "slot" : "duel";
    const map = await this.all(kind);
    if (req.method === "POST") {
      let b; try { b = await req.json(); } catch (e) { return new Response("bad", { status: 400 }); }
      const now = Date.now();
      if (kind === "slot") {
        const pid = cleanPid(b.pid), stage = Math.floor(Number(b.stage)); if (!pid || !(stage >= 0 && stage < 1e6)) return new Response("bad", { status: 400 });
        const old = map.get(pid);
        if (!old || stage > old.stage || cleanName(b.name) !== old.name) await this.put(kind, pid, { name: cleanName(b.name), stage: Math.max(stage, old ? old.stage : 0), t: old && old.stage >= stage ? old.t : now });
        return json(this.view(kind, this.sorted(kind, map), pid));
      }
      const rows = req.headers.get("x-room") === "1" && Array.isArray(b.rows) ? b.rows : [{ pid: b.pid, name: b.name, win: !!b.win }];
      for (const r0 of rows.slice(0, 2)) {
        const pid = cleanPid(r0.pid); if (!pid) continue;
        const r = map.get(pid) || { name: "主公", pts: 0, w: 0, l: 0, t: now };
        r.name = cleanName(r0.name); r.t = now;
        if (r0.win) { r.w++; r.pts++; } else { r.l++; const floor = Math.min(TIERS.length - 1, Math.floor(r.pts / 9)) * 9; r.pts = Math.max(floor, r.pts - 1); }
        await this.put(kind, pid, r);
      }
      return json(this.view(kind, this.sorted(kind, map), cleanPid(rows[0] && rows[0].pid)));
    }
    return json(this.view(kind, this.sorted(kind, map), cleanPid(url.searchParams.get("pid"))));
  }
}
function json(o) { return new Response(JSON.stringify(o), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
