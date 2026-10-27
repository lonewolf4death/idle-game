// Headless loader for Cosmic Idle's game logic. Runs the browser scripts in a
// Node vm context with no-op UI stubs so tests and balance runs share the
// exact code the page uses.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "docs", "js");
const CORE = [
  "numbers/break_infinity.min.js",
  "core/namespace.js",
  "core/config.js",
  "numbers/decimal.js",
  "core/state.js",
  "core/automation.js",
  "time/gameTime.js",
  "core/modifiers.js",
  "core/playtime.js",
  "core/progression.js",
  "core/prestige.js",
  "core/symmetry.js",
  "layers/energy/energy.js",
  "layers/energy/coherence.js",
  "layers/energy/fieldExcitation.js",
  "layers/energy/fieldDynamics.js",
  "layers/energy/structure.js",
  "core/productionStats.js",
  "save/saveManager.js",
  "core/offline.js",
  "ui/format.js",
  "core/gameLoop.js"
];

// Any property read returns a callable no-op that also tolerates property reads.
function noop() {
  const fn = function () { return undefined; };
  return new Proxy(fn, { get: function (target, key) { return key === Symbol.toPrimitive ? undefined : noop(); } });
}

function createGame(options) {
  const opts = options || {};
  const storage = opts.storage instanceof Map ? opts.storage : new Map(opts.storage || []);
  const clock = { now: 0, wall: opts.wallClock || 1.7e12 };
  const context = {
    console: console,
    Math: Object.create(Math),
    Intl: Intl,
    performance: { now: function () { return clock.now; } },
    Date: { now: function () { return clock.wall; } },
    localStorage: {
      getItem: function (key) { return storage.has(key) ? storage.get(key) : null; },
      setItem: function (key, value) { storage.set(key, String(value)); },
      removeItem: function (key) { storage.delete(key); }
    },
    document: { readyState: "loading", hidden: false, addEventListener: function () {}, getElementById: function () { return null; } },
    requestAnimationFrame: function () {},
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: function () { return 0; },
    btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); },
    atob: function (s) { return Buffer.from(s, "base64").toString("binary"); }
  };
  if (opts.random) context.Math.random = opts.random;
  context.window = context;
  vm.createContext(context);
  CORE.forEach(function (file) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) return;
    vm.runInContext(fs.readFileSync(full, "utf8"), context, { filename: file });
  });
  const Game = context.CosmicIdle;
  Game.UI = noop();
  Game.Experience = noop();
  Game.Audio = noop();
  return { Game: Game, context: context, storage: storage, clock: clock };
}

// Deterministic PRNG so balance runs are repeatable.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { createGame: createGame, mulberry32: mulberry32 };
