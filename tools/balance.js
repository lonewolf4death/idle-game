// Plays Cosmic Idle with a simple greedy bot and prints when each milestone
// is reached. Usage: node tools/balance.js [hours] [clicksPerSecond] [seed]
"use strict";
const { createGame, mulberry32 } = require("./harness.js");

const hours = Number(process.argv[2] || 72);
const cps = Number(process.argv[3] || 4);
const seed = Number(process.argv[4] || 1);
const { Game } = createGame({ random: mulberry32(seed) });
const D = Game.D;

const milestones = [];
const seen = new Set();
function mark(key, label) {
  if (seen.has(key)) return;
  seen.add(key);
  milestones.push([Game.player.time.realPlayed, label]);
}
function fmt(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60);
  return (h ? h + "h " : "") + m + "m";
}

function buyEverything() {
  Game.Progression.buyClickUpgrade("max");
  const gens = Game.CONFIG.GENERATORS.slice().reverse();
  gens.forEach(function (gen) {
    if (Game.player.resources.energy.gte(gen.unlockEnergy) || Game.player.generators[gen.id].purchased.gt(0)) Game.Energy.buyGenerator(gen.id, "max");
  });
  if (Game.Structure) Game.Structure.buyAll && Game.Structure.buyAll();
}

function buySkills() {
  let bought = true;
  while (bought) {
    bought = false;
    const options = Object.keys(Game.CONFIG.PRESTIGE.skills).filter(function (id) { return Game.Prestige.canBuySkill(id); })
      .sort(function (a, b) { return D(Game.CONFIG.PRESTIGE.skills[a].cost).cmp(Game.CONFIG.PRESTIGE.skills[b].cost); });
    if (options.length) { Game.Prestige.buySkill(options[0]); bought = true; }
  }
  Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) { if (Game.Automation.unlocked(buyer.id)) Game.Automation.setEnabled(buyer.id, true); });
}

function ownedSkills() { return Object.keys(Game.CONFIG.PRESTIGE.skills).filter(function (id) { return Game.Progression.hasSkill(id); }).length; }
const totalSkills = Object.keys(Game.CONFIG.PRESTIGE.skills).length;

let bestReward = D(0);
let step = 0, bestRate = 0, t0, tSim = 0n, tBuy = 0n;
const end = hours * 3600;
while (Game.player.time.realPlayed < end) {
  for (let i = 0; i < cps; i++) Game.Energy.generateManual();
  t0 = process.hrtime.bigint(); Game.Loop.simulate(1); tSim += process.hrtime.bigint() - t0;
  t0 = process.hrtime.bigint(); if (step % 2 === 0) buyEverything(); tBuy += process.hrtime.bigint() - t0;
  const e = Game.player.resources.energy;
  [1e2, 1e4, 1e7, 1e10, 1e15, 1e30].forEach(function (v) { if (e.gte(v)) mark("e" + v, "Energy " + v.toExponential(0)); });
  const reward = Game.Prestige.reward();
  // Condense once Quanta per hour for this run passes its peak. Use the best
  // reward seen this run, since buying generators dips Energy below thresholds.
  if (reward.gt(bestReward)) bestReward = reward;
  const rate = bestReward.toNumber() / Math.max(1, Game.player.time.currentEnergyRunReal);
  if (rate > bestRate) bestRate = rate;
  if (reward.gte(1) && reward.gte(bestReward.mul(0.9).floor()) && rate < bestRate * 0.97) {
    const n = Game.player.prestige.times.toNumber() + 1;
    if ([1, 2, 5, 10, 25, 50, 100].includes(n)) mark("c" + n, "Condense #" + n + " (+" + reward.toString() + " Quanta, run " + fmt(Game.player.time.currentEnergyRunReal) + ")");
    Game.Prestige.condense(true);
    bestRate = 0;
    bestReward = D(0);
    buySkills();
  }
  const owned = ownedSkills();
  [10, 20, 30, totalSkills].forEach(function (n) { if (owned >= n) mark("s" + n, n + " skills owned"); });
  if (Game.Symmetry) {
    if (Game.Symmetry.canBreak && Game.Symmetry.canBreak()) { mark("sym" + Game.player.symmetry.times, "Symmetry break #" + (Number(Game.player.symmetry.times) + 1)); Game.Symmetry.breakSymmetry(true); buySkills(); }
    if (Game.Symmetry.buyAffordable) Game.Symmetry.buyAffordable();
    if (Game.Symmetry.ended && Game.Symmetry.ended()) mark("end", "Ending reached");
  }
  step++;
}

function Decimal_max(a, b) { return D(a).gt(b) ? D(a) : D(b); }

milestones.forEach(function (m) { console.log(fmt(m[0]).padStart(9), " ", m[1]); });
console.log("Final: Energy", Game.player.resources.energy.toExponential(2), "| Quanta", Game.player.prestige.quanta.toString(), "| total", Game.player.prestige.totalQuanta.toString(), "| condenses", Game.player.prestige.times.toString(), "| skills", ownedSkills() + "/" + totalSkills);
console.log("ms sim", Number(tSim/1000000n), "ms buy", Number(tBuy/1000000n));
