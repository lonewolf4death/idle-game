// Plays Cosmic Idle with a goal-driven bot and prints when milestones are reached.
// It Condenses once the reward pays for the next skill, Breaks Symmetry once the
// reward pays for the next perk, clicks for the first minutes of each run, then idles.
// Usage: node tools/balance.js [hours] [seed] [scenario]
//   scenario "tree" starts with the full skill tree, to measure the Symmetry layer.
"use strict";
const { createGame, mulberry32 } = require("./harness.js");

const hours = Number(process.argv[2] || 72);
const seed = Number(process.argv[3] || 1);
const scenario = process.argv[4] || "fresh";
const { Game } = createGame({ random: mulberry32(seed) });
const D = Game.D;
// PATCH='{"SYMMETRY.structures.2.baseCost":"1e300"}' overrides config values for tuning experiments.
if (process.env.PATCH) Object.entries(JSON.parse(process.env.PATCH)).forEach(function (entry) {
  const keys = entry[0].split("."), last = keys.pop();
  keys.reduce(function (node, key) { return node[key]; }, Game.CONFIG)[last] = entry[1];
});
const STEP = 10, CLICK_SECONDS = 600, CLICKS_PER_SECOND = 4, REPORT_HOURS = Number(process.env.REPORT_HOURS || 6);
// NOBREAK=1 measures the Energy curve without ever Breaking Symmetry.
const allowBreak = process.env.NOBREAK !== "1";
const RUN_HOURS = Number(process.env.RUN_HOURS || 6);

const milestones = [];
const seen = new Set();
function mark(key, label) {
  if (seen.has(key)) return;
  seen.add(key);
  milestones.push([Game.player.time.realPlayed, label]);
  console.log(fmt(Game.player.time.realPlayed).padStart(11), " ", label);
}
function fmt(seconds) {
  const d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600), m = Math.floor(seconds % 3600 / 60);
  return (d ? d + "d " : "") + (h ? h + "h " : "") + m + "m";
}
function log(text) { console.log(fmt(Game.player.time.realPlayed).padStart(11), " ", text); }
const skillIds = Object.keys(Game.CONFIG.PRESTIGE.skills);
const ownedSkills = function () { return skillIds.filter(function (id) { return Game.Progression.hasSkill(id); }).length; };

function buyEverything() {
  Game.Progression.buyClickUpgrade("max");
  Game.Structure.buyAll();
  Game.CONFIG.GENERATORS.slice().reverse().forEach(function (gen) { Game.Energy.buyGenerator(gen.id, "max"); });
}
function nextSkillCost() {
  const options = skillIds.filter(function (id) {
    const skill = Game.CONFIG.PRESTIGE.skills[id];
    return !Game.Progression.hasSkill(id) && (!skill.requires || Game.Progression.hasSkill(skill.requires));
  }).map(function (id) { return D(Game.CONFIG.PRESTIGE.skills[id].cost); }).sort(function (a, b) { return a.cmp(b); });
  return options.length ? options[0] : null;
}
function buySkills() {
  let bought = true;
  while (bought) {
    bought = false;
    const options = skillIds.filter(function (id) { return Game.Prestige.canBuySkill(id); })
      .sort(function (a, b) { return D(Game.CONFIG.PRESTIGE.skills[a].cost).cmp(Game.CONFIG.PRESTIGE.skills[b].cost); });
    if (options.length) bought = Game.Prestige.buySkill(options[0]);
  }
  Game.Automation.setAll(true);
  // The bot chooses when to Condense itself.
  Game.Automation.setEnabled("condense", false);
}
function nextPerkCost() {
  const perks = Game.CONFIG.SYMMETRY.perks.filter(function (perk) { return !Game.Symmetry.has(perk.id); }).map(function (perk) { return D(perk.cost); });
  return perks.concat([Game.Symmetry.deeperCost()]).sort(function (a, b) { return a.cmp(b); })[0];
}

if (scenario === "tree") {
  skillIds.forEach(function (id) { Game.player.prestige.skills[id] = 1; });
  Game.player.prestige.times = D(30);
  Game.player.prestige.totalQuanta = D(813);
  Game.Automation.setAll(true);
  Game.Automation.setEnabled("condense", false);
}

const end = hours * 3600;
let lastReport = 0;
while (Game.player.time.realPlayed < end) {
  if (Game.player.time.currentEnergyRunReal < CLICK_SECONDS) for (let i = 0; i < STEP * CLICKS_PER_SECOND; i++) Game.Energy.generateManual();
  Game.Loop.simulateBatch(STEP);
  buyEverything();
  const e = Game.player.resources.energy;
  [1e10, 1e30, 1e50, 1e100, 1e200, 1e500, 1e1000].forEach(function (v) { if (e.gte(v)) mark("e" + v, "Energy " + D(v).toExponential(0)); });

  const skillCost = nextSkillCost(), reward = Game.Prestige.reward();
  // Condense after a long run (Energy growth accelerates, so long runs pay far more),
  // or as soon as the reward completes the tree.
  const remaining = skillIds.filter(function (id) { return !Game.Progression.hasSkill(id); }).reduce(function (sum, id) { return sum.add(Game.CONFIG.PRESTIGE.skills[id].cost); }, D(0));
  const longRun = Game.player.time.currentEnergyRunReal >= RUN_HOURS * 3600;
  if (skillCost && reward.gte(1) && Game.player.prestige.quanta.add(reward).gte(skillCost) && (longRun || Game.player.prestige.quanta.add(reward).gte(remaining))) {
    const n = Game.player.prestige.times.toNumber() + 1;
    mark("c" + n, "Condense #" + n + " (+" + reward.toString() + " Quanta at " + e.toExponential(1) + " after " + fmt(Game.player.time.currentEnergyRunReal) + ")");
    const before = skillIds.filter(function (id) { return Game.Progression.hasSkill(id); });
    Game.Prestige.condense(true);
    buySkills();
    const bought = skillIds.filter(function (id) { return Game.Progression.hasSkill(id) && !before.includes(id); });
    if (bought.length) log("    bought " + bought.join(" "));
  }
  const owned = ownedSkills();
  [10, 20, 30, skillIds.length].forEach(function (n) { if (owned >= n) mark("s" + n, n + " skills owned"); });

  const shards = Game.Symmetry.reward();
  // Break whenever the reward buys the next perk; once every perk is owned,
  // run long cycles so Mass can build toward the atom.
  const perksDone = Game.CONFIG.SYMMETRY.perks.every(function (perk) { return Game.Symmetry.has(perk.id); });
  const breakNow = perksDone ? Game.player.time.currentEnergyRunReal >= RUN_HOURS * 3600 : Game.player.symmetry.shards.add(shards).gte(nextPerkCost());
  if (allowBreak && Game.Symmetry.canBreak() && breakNow) {
    const n = Game.player.symmetry.times.toNumber() + 1;
    mark("b" + n, "Break #" + n + " (+" + shards.toString() + " BS at " + e.toExponential(1) + ", cycle mass " + Game.player.symmetry.mass.toExponential(1) + ")");
    Game.Symmetry.breakSymmetry(true);
    Game.Symmetry.buyAffordable();
    buySkills();
  }
  if (Game.Symmetry.ended()) mark("atom", "First atom formed");
  if (Game.player.time.realPlayed - lastReport >= REPORT_HOURS * 3600) {
    lastReport = Game.player.time.realPlayed;
    log("  status: E " + e.toExponential(1) + " · run " + fmt(Game.player.time.currentEnergyRunReal) + " · skills " + owned + " · Q " + Game.player.prestige.quanta.toString() + " · BS " + Game.player.symmetry.shards.toString() + " · mass " + Game.player.symmetry.mass.toExponential(1) + " · deeper " + Game.player.symmetry.deeper);
  }
}

console.log("Final: Energy", Game.player.resources.energy.toExponential(2), "| Quanta", Game.player.prestige.quanta.toString(), "| condenses", Game.player.prestige.times.toString(), "| skills", ownedSkills() + "/" + skillIds.length, "| breaks", Game.player.symmetry.times.toString(), "| perks", Object.values(Game.player.symmetry.perks).filter(Boolean).length, "| mass", Game.player.symmetry.mass.toExponential(2));
