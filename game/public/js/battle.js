/* 戰棋引擎（無畫面）：UI 透過 hooks 接收事件 */
(function (SG) {
  var B = SG.BATTLE, W = B.W, H = B.H;
  var BOT = { r: H - 1, c: 4 }, TOP = { r: 0, c: 3 };
  var dist = function (a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); };
  var cheb = function (a, b) { return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)); };
  var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function mult(a, d) {
    var tri = { "槍騎": 1, "騎弓": 1, "弓槍": 1 };
    if (tri[a + d]) return 1.5; if (tri[d + a]) return 0.75;
    if ((a === "刺" && d === "法") || (a === "法" && d === "刺")) return 1.5;
    return 1;
  }
  SG.mult = mult;
  var uid = 0;
  function mkUnit(o, side) {
    var t = SG.TYPES[o.typ];
    return {
      uid: "u" + (uid++), side: side, name: o.name, typ: o.typ, elem: o.elem || null, rar: o.rar, star: o.star,
      cardId: o.cardId || null, maxhp: o.hp, hp: o.hp, mv: t.mv, rmin: t.r[0], rmax: t.r[1],
      w: o.w, z: o.z, m: o.m, am: o.am, asp: o.asp, atk: o.typ === "法" ? o.asp : o.am, dr: o.w * SG.F.DR, art: o.art || null, named: !!o.named,
      r: 0, c: 0, fr: side === "P" ? -1 : 1, fc: 0, stealth: false, stun: 0, frozen: 0, burn: 0, bdmg: 0, moved: 0, acted: false, sneak: false, wait: false, guard: false,
    };
  }

  function Battle(stage, team, hooks) {
    var G = this;
    G.stage = stage; G.hooks = hooks || {};
    G.block = {}; (stage.block || []).forEach(function (p) { G.block[p[0] * W + p[1]] = 1; });
    G.mode = stage.mode;
    // 據點：siege＝我方軍營(下)/敵城堡(上)；defend＝我方城堡(下)/敵軍營(上)；annihilate 沒有據點
    G.base = G.mode === "annihilate" ? null : { P: BOT, E: TOP };
    G.kind = G.mode === "siege" ? { P: "camp", E: "castle" } : G.mode === "defend" ? { P: "castle", E: "camp" } : null;
    G.first = G.mode === "defend" ? "E" : "P";
    G.maxT = stage.turns || B.MAXT;
    G.round = 1; G.turnSide = null; G.st = 0; G.carry = { P: 0, E: 0 }; G.over = false; G.busy = false;
    G.units = []; G.fallen = [];
    var P = team.map(function (o) { return mkUnit(o, "P"); });
    G.seen = {};      // 這場已經上場過的敵人名字（小兵頭像不重複、召喚只召沒上場的）
    stage.enemy.forEach(function (e) { G.seen[e.name] = 1; });
    var E = stage.enemy.map(function (e) {
      if (!SG.GEN[e.name]) e = G.pickGrunt(e);
      return mkUnit(SG.enemyUnit(e), "E");
    });
    G.deploy(P, "P"); G.deploy(E, "E");
    G.units = P.concat(E);
  }
  var BP = Battle.prototype;

  BP.free = function (r, c) { return r >= 0 && r < H && c >= 0 && c < W && !this.block[r * W + c]; };
  BP.deploy = function (units, side) {
    var G = this, rows = side === "P" ? [H - 1, H - 2] : [0, 1];
    var base = G.base ? G.base[side] : null;
    var cells = [];
    rows.forEach(function (r) { for (var c = 0; c < W; c++) if (G.free(r, c) && !(base && base.r === r && base.c === c)) cells.push({ r: r, c: c }); });
    var front = shuffle(cells.filter(function (p) { return p.r === rows[1]; })), back = shuffle(cells.filter(function (p) { return p.r === rows[0]; }));
    var list = units.slice();
    if (base) {
      var g = list.slice().sort(function (a, b) { return (a.typ === "槍" ? 0 : 1) - (b.typ === "槍" ? 0 : 1) || a.maxhp - b.maxhp; })[0];
      g.r = base.r; g.c = base.c; g.guard = true; list.splice(list.indexOf(g), 1);
    }
    list.sort(function (a, b) { return ("弓法".indexOf(a.typ) >= 0 ? 1 : 0) - ("弓法".indexOf(b.typ) >= 0 ? 1 : 0); });
    list.forEach(function (u) {
      var melee = "槍騎刺".indexOf(u.typ) >= 0;
      var pool = (melee && front.length) ? front : (back.length ? back : front);
      var p = pool.pop() || (front.pop() || back.pop());
      if (p) { u.r = p.r; u.c = p.c; } else { u.r = -1; u.c = -1; u.hp = 0; }
    });
  };
  BP.at = function (r, c) { for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.hp > 0 && u.r === r && u.c === c) return u; } return null; };
  BP.alive = function (s) { return this.units.filter(function (u) { return u.side === s && u.hp > 0; }); };
  BP.other = function (s) { return s === "P" ? "E" : "P"; };
  BP.visible = function (u, viewer) { return !(u.stealth && u.side !== viewer); };
  BP.onOwnBase = function (u) { var b = this.base && this.base[u.side]; return b && u.r === b.r && u.c === b.c; };
  BP.reduction = function (u) { if (!this.onOwnBase(u)) return 1; return this.kind[u.side] === "castle" ? B.CASTLE : B.CAMP; };

  BP.bfs = function (u, maxd) {
    var G = this, seen = {}, q = [[u.r, u.c]];
    seen[u.r * W + u.c] = { d: 0, p: null, r: u.r, c: u.c };
    while (q.length) {
      var cur = q.shift(), d = seen[cur[0] * W + cur[1]].d;
      if (d >= maxd) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) {
        var r = cur[0] + dd[0], c = cur[1] + dd[1], k = r * W + c;
        if (!G.free(r, c) || seen[k]) return;
        var o = G.at(r, c); if (o && o.side !== u.side) return;
        seen[k] = { d: d + 1, p: cur[0] * W + cur[1], r: r, c: c }; q.push([r, c]);
      });
    }
    return seen;
  };
  BP.moveCells = function (u) {
    var G = this;
    if (u.moved || u.acted || u.frozen || u.stun || u.sneak) return [];
    var lim = Math.min(u.mv, G.st); if (lim <= 0) return [];
    var s = G.bfs(u, lim);
    return Object.keys(s).map(function (k) { return s[k]; }).filter(function (n) { return n.d > 0 && !G.at(n.r, n.c); });
  };
  BP.targets = function (u, viewer) {
    var G = this; viewer = viewer || u.side;
    return G.alive(G.other(u.side)).filter(function (e) { var d = dist(u, e); return G.visible(e, viewer) && d >= u.rmin && d <= u.rmax; });
  };
  // 法師有兩種攻擊：法術（射程 1～3、扣 2 體力、比智力）與近身普攻（相鄰、不扣體力、用武力）
  BP.meleeTargets = function (u, viewer) {
    var G = this; viewer = viewer || u.side;
    return G.alive(G.other(u.side)).filter(function (e) { return G.visible(e, viewer) && dist(u, e) === 1; });
  };
  // 面向：最後一次移動或攻擊的方向。背襲＝近戰站在目標正後方那一格
  BP.face = function (u, dr, dc) { if (!dr && !dc) return; if (Math.abs(dr) >= Math.abs(dc)) { u.fr = Math.sign(dr); u.fc = 0; } else { u.fr = 0; u.fc = Math.sign(dc); } };
  BP.backCell = function (d) { return { r: d.r - d.fr, c: d.c - d.fc }; };
  BP.isBack = function (a, d, pos) { pos = pos || a; return pos.r === d.r - d.fr && pos.c === d.c - d.fc; };
  BP.canBack = function (a, melee) { return a.typ !== "弓" && (a.typ !== "法" || !!melee); };
  BP.stepTo = function (u, n) { var pr = n.p === null ? u.r : Math.floor(n.p / W), pc = n.p === null ? u.c : n.p % W; this.face(u, n.r - pr, n.c - pc); u.r = n.r; u.c = n.c; };
  BP.attackCost = function (u, rush, melee) { return (u.typ === "法" && !melee ? B.MAGE_ATK : 0) + (rush ? B.RUSH : 0); };
  BP.chance = function (a, d) { return SG.spellChance(a.z, d.z); };

  // ===== 結算 =====
  BP.deal = function (t, amt, cls) {
    var real = Math.round(amt * this.reduction(t) * (1 - t.dr));
    t.hp -= real; this.hook("float", t, "-" + real, cls);
    if (t.hp <= 0) { t.hp = 0; this.hook("log", t.name + " 陣亡"); if (t.side === "E" && t.named) this.fallen.push(t.name); }
    return real;
  };
  BP.hook = function (name) { var f = this.hooks[name]; if (f) f.apply(null, Array.prototype.slice.call(arguments, 1)); };
  BP.doAttack = function (a, d, rush, melee) {
    var G = this, m = mult(a.typ, d.typ), spell = a.typ === "法" && !melee, note = [];
    if (spell && Math.random() > G.chance(a, d)) {      // 智力對比失敗：整招落空
      G.hook("float", d, "落空", "miss"); G.hook("log", a.name + " 的法術被 " + d.name + " 識破，落空");
      a.acted = true; return;
    }
    var back = !spell && G.canBack(a, melee) && G.isBack(a, d);
    G.face(a, d.r - a.r, d.c - a.c);
    var dmg = (spell ? a.asp : a.am) * m * (rush ? B.RUSHX : 1) * (back ? B.BACK : 1);
    if (back) note.push("背襲");
    if (m > 1) note.push("剋制"); if (rush) note.push("猛攻");
    if (a.typ === "騎" && a.moved >= 2) { dmg *= B.CHARGE; note.push("衝鋒"); }
    var big = rush || m > 1 || back ? "big" : "";
    if (spell) {
      if (a.elem === "火" && d.frozen) { dmg *= B.MELT; d.frozen = 0; note.push("融化"); }
      G.deal(d, dmg, big);
      G.alive(d.side).forEach(function (e) { if (e !== d && dist(e, d) === 1 && G.visible(e, a.side)) G.deal(e, a.asp * mult(a.typ, e.typ) * B.SPLASH); });
      if (d.hp > 0) { if (a.elem === "火") { d.burn = 2; d.bdmg = a.asp * B.BURN; note.push("燃燒"); } else { d.frozen = 1; note.push("凍結"); } }
    } else G.deal(d, dmg, big);
    if (a.stealth) { a.stealth = false; note.push("現身"); }
    if (a.typ === "法" && melee) note.push("近身");
    G.hook("log", a.name + " → " + d.name + (note.length ? "（" + note.join("、") + "）" : ""));
    if (d.hp > 0 && a.typ !== "刺" && !d.frozen && !d.stun) {
      var dd = dist(d, a);
      var canC = d.typ === "法" ? dd === 1 : (dd >= d.rmin && dd <= d.rmax);   // 法師只能近身反擊（武力）
      if (canC) { G.deal(a, d.am * mult(d.typ, a.typ) * (d.typ === "槍" ? 1 : 0.5)); G.hook("log", d.name + " 反擊"); }
    }
    a.acted = true;
  };
  BP.heal = function (m, list, mul) {
    var G = this;
    list.forEach(function (t) { var v = Math.round(Math.min(t.maxhp - t.hp, m.asp * mul)); t.hp += v; G.hook("float", t, "+" + v, "heal"); });
    m.acted = true;
  };
  BP.scout = function (m) {
    var G = this;
    var hid = G.alive(G.other(m.side)).filter(function (e) { return e.stealth && cheb(e, m) <= 2; });
    hid.forEach(function (e) { e.stealth = false; e.stun = 1; G.hook("log", m.name + " 索敵：" + e.name + " 被震懾現身！"); });
    if (!hid.length) G.hook("log", m.name + " 索敵：附近沒有伏兵");
    m.acted = true; return hid.length;
  };

  // ===== 玩家動作（UI 呼叫） =====
  BP.act = function (action, u, arg) {
    var G = this;
    if (G.over || G.busy || G.turnSide !== "P" || !u || u.side !== "P") return "不能操作";
    if (action === "move") {
      var n = G.moveCells(u).find(function (n) { return n.r === arg.r && n.c === arg.c; });
      if (!n) return "不能走到那裡";
      G.st -= n.d; G.stepTo(u, n); u.moved = n.d; return null;
    }
    if (u.acted || u.stun || u.sneak) return "這名武將本回合已行動";
    if (action === "attack") {
      var melee = u.typ === "法" && !!arg.melee;
      if ((melee ? G.meleeTargets(u, "P") : G.targets(u, "P")).indexOf(arg.t) < 0) return melee ? "普攻只能打相鄰的敵人" : "不在攻擊範圍";
      var cost = G.attackCost(u, arg.rush, melee); if (G.st < cost) return "體力不夠（需要 " + cost + "）";
      G.st -= cost; G.doAttack(u, arg.t, arg.rush, melee); G.checkEnd(); return null;
    }
    if (action === "heal") {
      if (G.st < B.HEAL) return "體力不夠"; if (dist(u, arg.t) > 3 || arg.t.side !== "P") return "太遠了";
      G.st -= B.HEAL; G.heal(u, [arg.t], 1.5); G.hook("log", u.name + " 補血 " + arg.t.name); return null;
    }
    if (action === "aoe") {
      if (G.st < B.AOE_HEAL) return "體力不夠";
      G.st -= B.AOE_HEAL; var l = G.alive("P").filter(function (a) { return cheb(a, u) <= 1; }); G.heal(u, l, 1.0);
      G.hook("log", u.name + " 群療 " + l.length + " 人"); return null;
    }
    if (action === "scout") { G.scout(u); return null; }
    if (action === "stealth") {
      if (u.moved || u.stealth || G.st < B.STEALTH) return "現在不能隱身";
      G.st -= B.STEALTH; u.stealth = true; u.sneak = true; u.acted = true; G.hook("log", u.name + " 隱身"); return null;
    }
    if (action === "wait") { u.wait = true; return null; }
    return "未知動作";
  };
  BP.unitDone = function (u) {
    var G = this;
    if (u.wait || u.acted || u.stun || u.sneak) return true;
    if (!u.moved && !u.frozen && G.moveCells(u).length) return false;
    if (G.st >= (u.typ === "法" ? B.MAGE_ATK : 0) && G.targets(u, "P").length) return false;
    if (u.typ === "法" && G.meleeTargets(u, "P").length) return false;
    if (u.typ === "法" && G.st >= 1 && G.alive("P").some(function (a) { return a.hp < a.maxhp && dist(a, u) <= 3; })) return false;
    return true;
  };
  BP.allDone = function () { var G = this; return G.alive("P").every(function (u) { return G.unitDone(u); }); };

  // ===== 回合 =====
  BP.occupiedBy = function (s) {
    if (!this.base) return false; var b = this.base[this.other(s)], u = this.at(b.r, b.c); return u && u.side === s;
  };
  BP.checkEnd = function () {
    var G = this;
    if (!G.alive("E").length) { G.finish(true, "殲滅敵軍"); return true; }
    if (!G.alive("P").length) { G.finish(false, "我軍全滅"); return true; }
    return false;
  };
  BP.finish = function (win, why) { if (this.over) return; this.over = true; this.hook("finish", win, why); };
  BP.start = function () { this.startSide(this.first); };
  BP.startSide = async function (s) {
    var G = this; if (G.over) return;
    G.turnSide = s;
    if (G.occupiedBy(s)) { G.finish(s === "P", s === "P" ? "佔領敵方" + (G.kind.E === "castle" ? "城堡" : "軍營") : "敵軍佔領了我方" + (G.kind.P === "castle" ? "城堡" : "軍營")); return; }
    G.st = B.STAM + G.carry[s];
    G.alive(s).forEach(function (u) { u.moved = 0; u.acted = false; u.sneak = false; u.wait = false; if (u.burn) { G.deal(u, u.bdmg); u.burn--; } });
    if (G.checkEnd()) return;
    if (s === "E" && G.stage.summon && G.round % 3 === 0) G.summon();
    G.hook("render");
    if (s === "E") { G.busy = true; G.hook("render"); await G.aiTurn("E"); G.busy = false; if (!G.over) G.endSide("E"); }
    else { if (G.occupiedBy("E")) G.hook("banner", "⚠️ 敵軍站上我方據點！這回合要趕走她", "#ff8a7a"); else G.hook("banner", "我方回合", "#9fd0ff"); }
  };
  BP.endSide = function (s) {
    var G = this; if (G.over) return;
    G.alive(s).forEach(function (u) { if (u.stun) u.stun--; if (u.frozen) u.frozen--; });
    G.carry[s] = Math.min(B.CARRY, Math.max(0, G.st));
    if (s !== G.first) {
      G.round++;
      if (G.round > G.maxT) {
        if (G.mode === "defend") G.finish(true, "守住 " + G.maxT + " 回合");
        else G.finish(false, "回合用完");
        return;
      }
    }
    G.startSide(G.other(s));
  };
  // 小兵：從 18 位裡挑同兵種（法師同屬性）、這場還沒上場的
  BP.pickGrunt = function (e) {
    var G = this, pool = shuffle(SG.GRUNTS.filter(function (g) { return !G.seen[g.name] && g.typ === e.typ && (e.typ !== "法" || !e.elem || g.elem === e.elem); }));
    var g = pool[0]; if (!g) return e;
    G.seen[g.name] = 1;
    return { name: g.name, typ: g.typ, rar: e.rar, star: e.star, atkx: e.atkx, elem: g.elem || e.elem };
  };
  // 張角召喚：從還沒上場的黃巾小兵＋黃巾武將裡隨機挑 2 位（✅ Jay 2026-11-13）
  BP.summon = function () {
    var G = this, boss = G.alive("E").find(function (u) { return u.name === "張角"; }); if (!boss) return;
    var pool = SG.GRUNTS.filter(function (g) { return !G.seen[g.name]; }).map(function (g) { return { name: g.name, typ: g.typ, elem: g.elem }; })
      .concat(Object.keys(SG.GEN).map(function (k) { return SG.GEN[k]; }).filter(function (c) { return c.fac === "黃巾" && c.ver === "一般" && !G.seen[c.name]; })
        .map(function (c) { return { name: c.name, typ: c.typ, elem: c.elem || (c.typ === "法" ? "火" : null) }; }));
    var spots = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < W; c++) if (G.free(r, c) && !G.at(r, c)) spots.push({ r: r, c: c });
    spots = shuffle(spots); pool = shuffle(pool);
    var n = Math.min(2, spots.length, pool.length); if (!n) return;
    var names = [];
    for (var k = 0; k < n; k++) {
      var p = pool[k]; G.seen[p.name] = 1; names.push(p.name);
      var u = mkUnit(SG.enemyUnit({ name: p.name, typ: p.typ, rar: "SR", star: 1, elem: p.elem }), "E");
      u.r = spots[k].r; u.c = spots[k].c; G.units.push(u);
    }
    G.hook("log", "張角：「蒼天已死，黃天當立！」召來 " + names.join("、"));
    G.hook("banner", "黃天當立！", "#e0c050");
  };

  // ===== 電腦 AI =====
  BP.aiTurn = async function (s) {
    var G = this, o = G.other(s);
    var en = function () { return G.alive(o).filter(function (e) { return G.visible(e, s); }); };
    var myB = G.base && G.base[s], enB = G.base && G.base[o];
    var us = G.alive(s); if (!us.length) return;
    if (myB) {
      var threat = en().filter(function (e) { return dist(e, myB) <= 3; });
      if (threat.length && !G.at(myB.r, myB.c)) us.reduce(function (a, b) { return dist(a, myB) <= dist(b, myB) ? a : b; }).guard = true;
    }
    var reserve = us.some(function (u) { return G.targets(u, s).length; }) ? B.RUSH : 0;
    var near = function (u) { return Math.min.apply(null, [99].concat(en().map(function (e) { return dist(u, e); }))); };
    var order = us.slice().sort(function (a, b) { return (a.guard - b.guard) || near(a) - near(b); });
    for (var i = 0; i < order.length; i++) {
      var u = order[i];
      if (G.over) return; if (u.hp <= 0 || u.stun || u.frozen) continue;
      if (u.typ === "刺" && !u.stealth && !G.targets(u, s).length && G.st - reserve >= B.STEALTH) { u.stealth = true; u.sneak = true; u.acted = true; G.st -= B.STEALTH; continue; }
      if (u.guard && myB) {
        if (!(u.r === myB.r && u.c === myB.c) && !G.at(myB.r, myB.c)) {
          var seenG = G.bfs(u, Math.min(u.mv, G.st)), ng = seenG[myB.r * W + myB.c];
          if (ng) { G.st -= ng.d; G.stepTo(u, ng); u.moved = ng.d; G.hook("render"); await sleep(200); }
        }
        continue;
      }
      if (G.targets(u, s).length && !(u.typ === "弓" && en().some(function (e) { return dist(u, e) === 1; }))) {
        if (!G.canBack(u, false) || G.targets(u, s).some(function (e) { return G.isBack(u, e); })) continue;
        var lim0 = Math.min(u.mv, G.st - reserve), sb = lim0 > 0 ? G.bfs(u, lim0) : {}, bn = null;
        en().forEach(function (e) { var bc = G.backCell(e), nb = G.free(bc.r, bc.c) && !G.at(bc.r, bc.c) ? sb[bc.r * W + bc.c] : null; if (nb && (!bn || nb.d < bn.d)) bn = nb; });
        if (bn) { var pth = []; for (var q = bn; q && q.p !== null; q = sb[q.p]) pth.unshift(q); pth.forEach(function (q) { G.stepTo(u, q); }); G.st -= bn.d; u.moved = bn.d; G.hook("render"); await sleep(200); }
        continue;
      }
      var budget = Math.min(u.mv, G.st - reserve); if (budget <= 0) continue;
      var seen = G.bfs(u, 99), best = null;
      Object.keys(seen).forEach(function (k) {
        var n = seen[k], oc = G.at(n.r, n.c); if (oc && oc !== u) return;
        var sc;
        if (enB && n.r === enB.r && n.c === enB.c && !G.at(enB.r, enB.c)) sc = [n.d - 3, 0];
        else {
          var hits = en().filter(function (e) { var d = Math.abs(n.r - e.r) + Math.abs(n.c - e.c); return d >= u.rmin && d <= u.rmax; });
          if (!hits.length) return;
          var bk = G.canBack(u, false) && hits.some(function (e) { return G.isBack(u, e, n); });
          sc = [n.d - (bk ? 1.5 : 0), Math.min.apply(null, hits.map(function (e) { return u.typ === "刺" && "法弓".indexOf(e.typ) >= 0 ? 0 : 1; }))];
        }
        if (!best || sc[0] < best.sc[0] || (sc[0] === best.sc[0] && sc[1] < best.sc[1])) best = { sc: sc, n: n };
      });
      if (!best || best.n.d === 0) continue;
      var path = []; for (var k = best.n; k && k.p !== null; k = seen[k.p]) path.unshift(k);
      var step = null; path.slice(0, budget).forEach(function (kk, idx) { if (!G.at(kk.r, kk.c)) step = { d: idx + 1, k: kk }; });
      if (step) { G.st -= step.d; G.stepTo(u, step.k); u.moved = step.d; G.hook("render"); await sleep(200); }
    }
    var att = G.alive(s).sort(function (a, b) { return b.atk - a.atk; });
    for (var j = 0; j < att.length; j++) {
      var a = att[j];
      if (G.over) return; if (a.hp <= 0 || a.stun || a.acted) continue;
      if (a.typ === "法") {
        var hid = G.alive(o).filter(function (e) { return e.stealth && cheb(e, a) <= 2; });
        if (hid.length && Math.random() < 0.5) { G.scout(a); G.hook("render"); await sleep(350); continue; }
        var tg0 = G.targets(a, s);
        var hurt = G.alive(s).filter(function (x) { return x.hp < x.maxhp * 0.5 && dist(x, a) <= 3; });
        if (hurt.length && (!tg0.length || G.st < 2) && G.st >= 1) {
          var h = hurt.sort(function (x, y) { return x.hp / x.maxhp - y.hp / y.maxhp; })[0];
          G.st -= 1; G.heal(a, [h], 1.5); G.hook("log", a.name + " 補血 " + h.name); G.hook("render"); await sleep(350); continue;
        }
      }
      var mel = a.typ === "法" && G.st < 2;             // 體力不夠放法術就近身普攻
      var tg = mel ? G.meleeTargets(a, s) : G.targets(a, s); if (!tg.length) continue;
      var pw = mel ? a.am : a.atk;
      var bx = function (e) { return (a.typ !== "法" || mel) && G.canBack(a, mel) && G.isBack(a, e) ? B.BACK : 1; };
      var score = function (e) { var m = mult(a.typ, e.typ) * bx(e); return [(e.hp <= pw * m * G.reduction(e) * (1 - e.dr)) ? 1 : 0, m, a.typ === "法" && !mel ? -e.z : 0, -e.hp]; };
      var t = tg.sort(function (x, y) { var p = score(x), q = score(y); for (var ii = 0; ii < 4; ii++) if (p[ii] !== q[ii]) return q[ii] - p[ii]; return 0; })[0];
      var base = a.typ === "法" && !mel ? 2 : 0, rush = false;
      if (G.st >= base + B.RUSH && t.hp > pw * mult(a.typ, t.typ) * bx(t) * G.reduction(t) * (1 - t.dr)) rush = true;
      G.st -= base + (rush ? B.RUSH : 0);
      G.doAttack(a, t, rush, mel); G.hook("render"); await sleep(380);
      if (G.checkEnd()) return;
    }
  };

  // 關卡敵軍 → 單位：有名字的敵將用數值表三圍，雜兵用預設三圍
  SG.enemyUnit = function (e) {
    var t = SG.TYPES[e.typ], g = SG.GEN[e.name], st = g || SG.GRUNT[e.typ] || SG.GRUNT.other, x = e.atkx || 1;
    return { name: e.name, typ: e.typ, elem: e.elem || (e.typ === "法" ? "火" : null), rar: e.rar, star: e.star,
      hp: Math.round(SG.hpOf(e.rar, e.star) * t.hp), w: st.w, z: st.z, m: st.m,
      am: SG.atkOf(e.typ, st.w, x), asp: SG.atkOf(e.typ, st.z, x), art: g ? g.art : SG.gruntArt(e.name), named: !!g };
  };
  SG.Battle = Battle;
  SG.BASES = { BOT: BOT, TOP: TOP };
})(window.SG);
