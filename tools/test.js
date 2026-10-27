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

module.exports = { playFor: playFor, reload: reload };
