// Logic tests for Cosmic Idle. Usage: node tools/test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { createGame, mulberry32 } = require("./harness.js");

const KEY = "cosmicIdleEnergyV2";

function playFor(Game, seconds, clicksPerSecond) {
  for (let t = 0; t < seconds; t++) {
    for (let i = 0; i < (clicksPerSecond || 0); i++) Game.Energy.generateManual();
    Game.Loop.simulate(1);
    Game.Progression.buyClickUpgrade("max");
    Game.CONFIG.GENERATORS.slice().reverse().forEach(function (gen) { Game.Energy.buyGenerator(gen.id, "max"); });
  }
}

function reload(storage, wallClock) {
  const next = createGame({ storage: storage, wallClock: wallClock, random: mulberry32(7) });
  next.loaded = next.Game.Save.load();
  return next;
}

test("save round-trips through load", function () {
  const a = createGame({ random: mulberry32(1) });
  playFor(a.Game, 600, 4);
  assert.ok(a.Game.Save.save());
  const b = reload(a.storage, a.clock.wall);
  assert.ok(b.loaded);
  assert.strictEqual(b.Game.player.resources.energy.toString(), a.Game.player.resources.energy.toString());
  assert.strictEqual(b.Game.player.generators.energyDisturbance.purchased.toString(), a.Game.player.generators.energyDisturbance.purchased.toString());
});

test("timer drift is repaired instead of rejecting the save", function () {
  const a = createGame();
  playFor(a.Game, 30, 4);
  a.Game.Save.save();
  const data = JSON.parse(a.storage.get(KEY));
  data.fieldExcitation.elapsed = "30";
  data.fieldDynamics.elapsed = "60";
  data.coherence.quantumCarry = "1.0000001";
  data.automation.buyers.energyDisturbance.elapsed = 5;
  a.storage.set(KEY, JSON.stringify(data));
  const b = reload(a.storage, a.clock.wall);
  assert.ok(b.loaded);
  assert.ok(b.Game.player.fieldExcitation.elapsed.lt(30));
  assert.ok(b.Game.player.coherence.quantumCarry.lt(1));
});

test("an unreadable save is kept aside for recovery", function () {
  const storage = new Map([[KEY, "{not json"]]);
  const b = reload(storage);
  assert.strictEqual(b.loaded, false);
  assert.strictEqual(storage.get(KEY + ":recovery"), "{not json");
  b.Game.Save.save();
  assert.strictEqual(storage.get(KEY + ":recovery"), "{not json");
  assert.ok(b.Game.Save.hasRecovery());
});

test("a successful load keeps a session backup", function () {
  const a = createGame();
  playFor(a.Game, 10, 4);
  a.Game.Save.save();
  const saved = a.storage.get(KEY);
  const b = reload(a.storage, a.clock.wall);
  assert.strictEqual(b.storage.get(KEY + ":backup"), saved);
});

test("export and import round-trip and keep a backup", function () {
  const a = createGame({ random: mulberry32(3) });
  playFor(a.Game, 300, 4);
  const text = a.Game.Save.exportText();
  const b = createGame();
  assert.ok(b.Game.Save.importText(text));
  assert.strictEqual(b.Game.player.resources.energy.toString(), a.Game.player.resources.energy.toString());
  assert.ok(b.storage.has(KEY + ":backup"));
  assert.strictEqual(b.Game.Save.importText("definitely not a save"), false);
});

test("offline progress simulates time away", function () {
  const a = createGame({ random: mulberry32(5) });
  playFor(a.Game, 900, 4);
  a.Game.Save.save();
  const energyBefore = a.Game.player.resources.energy;
  const realBefore = a.Game.player.time.realPlayed;
  const b = reload(a.storage, a.clock.wall + 3600 * 1000);
  assert.ok(b.Game.Offline.resumeFromSave());
  b.Game.Offline.runAll();
  assert.ok(b.Game.player.resources.energy.gt(b.Game.D(energyBefore.toString())), "energy should grow while away");
  assert.ok(Math.abs(b.Game.player.time.realPlayed - realBefore - 3600) < 1e-6);
  assert.match(b.Game.Offline.lastSummary, /away for 1h 0m/);
});

test("offline progress is capped and can be disabled", function () {
  const a = createGame();
  playFor(a.Game, 120, 4);
  a.Game.Save.save();
  const b = reload(a.storage, a.clock.wall + 72 * 3600 * 1000);
  assert.ok(b.Game.Offline.resumeFromSave());
  assert.strictEqual(b.Game.Offline.total, 86400);
  b.Game.Offline.runAll();
  assert.match(b.Game.Offline.lastSummary, /limited to/);

  a.Game.player.settings.offlineProgress = 0;
  a.Game.Save.save();
  const c = reload(a.storage, a.clock.wall + 3600 * 1000);
  assert.strictEqual(c.Game.Offline.resumeFromSave(), false);
});

test("short absences do not trigger offline simulation", function () {
  const a = createGame();
  a.Game.Save.save();
  const b = reload(a.storage, a.clock.wall + 5 * 1000);
  assert.strictEqual(b.Game.Offline.resumeFromSave(), false);
});

test("Condense resets the run and grants Quanta", function () {
  const a = createGame();
  a.Game.player.resources.energy = a.Game.D("1e55");
  assert.strictEqual(a.Game.Prestige.reward().toString(), "6");
  assert.ok(a.Game.Prestige.condense(true));
  assert.strictEqual(a.Game.player.prestige.quanta.toString(), "6");
  assert.ok(a.Game.player.resources.energy.eq(0));
});

test("threshold achievements unlock from held Energy and counts", function () {
  const a = createGame();
  const G = a.Game, D = G.D;
  G.player.resources.energy = D("1e31");
  G.Loop.pump(1);
  assert.strictEqual(G.player.achievements.billionEnergy, 1);
  assert.strictEqual(G.player.achievements.thirtyOrders, 1);
  assert.strictEqual(G.player.achievements.googolEnergy, 0);
  G.player.automation.buyers.energyDisturbance.level = 1;
  G.Achievements.capture(G.player, false);
  assert.strictEqual(G.player.achievements.firstTrial, 1);
});

function fullTree(G) {
  Object.keys(G.CONFIG.PRESTIGE.skills).forEach(function (id) { G.player.prestige.skills[id] = 1; });
}

test("first Break needs the full tree and 1e100 Energy", function () {
  const { Game: G } = createGame();
  G.player.resources.energy = G.D("1e450");
  assert.ok(G.Symmetry.reward().eq(0), "no reward without the full tree");
  fullTree(G);
  assert.strictEqual(G.Symmetry.reward().toString(), "3", "one more each time the exponent doubles");
  assert.ok(G.Symmetry.breakSymmetry(true));
  assert.strictEqual(G.player.symmetry.shards.toString(), "3");
  assert.strictEqual(G.player.prestige.quanta.toString(), "0");
  assert.ok(G.Progression.hasSkill("1-1") && G.Progression.hasSkill("4-5-2"), "the skill tree stays");
  assert.ok(G.player.prestige.times.eq(0), "Condense count resets");
  assert.strictEqual(G.player.achievements.firstBreak, 1);
  G.player.resources.energy = G.D("1e100");
  assert.strictEqual(G.Symmetry.reward().toString(), "1", "later Breaks need only Energy");
});

test("perks: head start, heavy start, memory, echo and swift buyers", function () {
  const { Game: G } = createGame();
  fullTree(G);
  G.player.prestige.times = G.D(20);
  ["headStart", "heavyStart", "memory", "echo", "swift"].forEach(function (id) { G.player.symmetry.perks[id] = 1; });
  G.player.symmetry.times = G.D(1);
  G.player.symmetry.mass = G.D(1000);
  G.player.resources.energy = G.D("1e100");
  G.Symmetry.breakSymmetry(true);
  assert.ok(G.player.resources.energy.eq(1e30));
  assert.strictEqual(G.player.structures.symmetryBreaking.added.toString(), "10");
  assert.strictEqual(G.player.prestige.times.toString(), "20", "Lasting memory keeps Condenses");
  assert.strictEqual(G.player.symmetry.mass.toString(), "500", "Echoing mass halves Mass");
  assert.strictEqual(G.Automation.interval("energyDisturbance"), 2.5);
  G.player.resources.energy = G.D("1e60");
  G.Prestige.condense(true);
  assert.ok(G.player.resources.energy.gte(1e30), "head start applies after Condense");
});

test("Mass grows from Gen 8–10 and forms the atom", function () {
  const { Game: G } = createGame();
  fullTree(G);
  G.player.resources.energy = G.D("1e100");
  G.Symmetry.breakSymmetry(true);
  G.player.symmetry.perks.particles = 1;
  G.player.symmetry.perks.binding = 1;
  G.player.resources.energy = G.D("1e1500");
  assert.ok(G.Structure.buy("symmetryBreaking", 3));
  assert.ok(G.Structure.buy("massiveParticles", 1));
  assert.ok(G.Structure.buy("bindingForce", 1));
  G.Loop.simulate(10);
  assert.ok(G.player.structures.symmetryBreaking.added.gte(1), "Gen 9 creates Gen 8");
  assert.ok(G.player.symmetry.mass.gt(250), "Gen 10 multiplies Mass by 10");
  assert.ok(G.Symmetry.energyMultiplier().gt(1));
  G.player.resources.energy = G.D("1e100");
  assert.strictEqual(G.Symmetry.reward().toString(), "1");
  G.player.symmetry.mass = G.D(1e10);
  assert.strictEqual(G.Symmetry.reward().toString(), "2", "Mass adds 10% per order of magnitude");
  G.player.symmetry.mass = G.D(G.CONFIG.SYMMETRY.atomMass);
  G.Loop.simulate(1);
  assert.strictEqual(G.player.symmetry.atom, 1);
  assert.strictEqual(G.player.achievements.firstAtom, 1);
  G.Save.save();
  assert.ok(G.Save.load());
  assert.strictEqual(G.player.symmetry.atom, 1);
});

test("Gen 8–10 and Mass are disabled inside challenges", function () {
  const { Game: G } = createGame();
  fullTree(G);
  G.player.resources.energy = G.D("1e100");
  G.Symmetry.breakSymmetry(true);
  G.player.symmetry.mass = G.D(1e6);
  assert.ok(G.Challenges.enter(1));
  assert.strictEqual(G.Structure.quote("symmetryBreaking", 1).count.toString(), "0");
  assert.ok(G.Symmetry.massRate().eq(0));
  G.Challenges.exit();
  assert.ok(G.player.symmetry.mass.eq(1e6), "Mass survives a challenge");
});

module.exports = { playFor: playFor, reload: reload };
