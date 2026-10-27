(function (Game) {
  const D = Game.D;
  const rules = function () { return Game.CONFIG.SYMMETRY; };

  Game.Symmetry = {
    has: function (perk) { return Game.player.symmetry.perks[perk] === 1; },
    perk: function (id) { return rules().perks.find(function (perk) { return perk.id === id; }); },
    discovered: function () { const s = Game.player.symmetry;return s.times.gt(0) || s.seen === 1; },
    // Reveal the layer the first time a normal run holds enough Energy.
    observe: function () {
      const s = Game.player.symmetry;
      if (s.seen || Game.Challenges.active() || !this.gateOpen() || Game.player.resources.energy.lt(rules().unlockEnergy)) return;
      s.seen = 1;
      if (Game.Experience && Game.Experience.enqueue) Game.Experience.enqueue({ kind: "Symmetry", title: "A crack in the mirror", text: "The field has grown so dense that its perfect balance strains. The Symmetry tab is open: Break Symmetry to trade Quanta and your constellation for something with weight." });
    },
    // The first Break needs the whole Condense tree; later Breaks only need Energy.
    treeComplete: function () { return Object.keys(Game.CONFIG.PRESTIGE.skills).every(function (id) { return Game.Progression.hasSkill(id); }); },
    gateOpen: function () { return Game.player.symmetry.times.gt(0) || this.treeComplete(); },
    // One Broken Symmetry at 1e100, then one more each time the exponent doubles.
    baseReward: function () {
      if (Game.Challenges.active() || !this.gateOpen()) return 0;
      const exponent = Game.player.resources.energy.exponent, minimum = D(rules().unlockEnergy).exponent;
      if (Game.player.resources.energy.lt(rules().unlockEnergy)) return 0;
      return Math.floor(Math.log2(exponent / minimum) + 1e-9) + 1;
    },
    // Each order of magnitude of Mass adds 10% to the reward.
    massRewardMultiplier: function () {
      const mass = Game.player.symmetry.mass;
      return 1 + (mass.gt(0) ? Math.floor(mass.add(1).log10()) : 0) * rules().massRewardStep;
    },
    reward: function () {
      const base = this.baseReward();
      return D(base ? Math.floor(base * this.massRewardMultiplier() + 1e-9) : 0);
    },
    nextRewardEnergy: function () {
      return D(10).pow(D(rules().unlockEnergy).exponent * Math.pow(2, this.baseReward()));
    },
    canBreak: function () { return this.reward().gt(0); },
    // Applied to every fresh normal run: Condense, respec, challenge exit and Break.
    startRun: function (fresh) {
      if (fresh.challenges.active) return;
      if (fresh.symmetry.perks.headStart === 1) fresh.resources.energy = Decimal.max(fresh.resources.energy, D(this.perk("headStart").startingEnergy));
      if (fresh.symmetry.perks.heavyStart === 1) fresh.structures.symmetryBreaking.added = D(this.perk("heavyStart").startingSymmetryBreaking);
    },
    preserve: function (old, fresh) { fresh.symmetry = old.symmetry; },
    breakSymmetry: function (automated) {
      const reward = this.reward();
      if (reward.lte(0)) return false;
      const old = Game.player, first = old.symmetry.times.eq(0);
      Game.Progression.captureAchievements(old);
      if (Game.Coherence.discovered()) old.lore.coherenceSeen = 1;
      if (Game.FieldExcitation.discovered()) old.lore.fieldFirstSeen = old.lore.fieldSecondSeen = 1;
      const fresh = Game.createDefaultPlayer();
      fresh.achievements = old.achievements;fresh.lore = old.lore;
      fresh.time.realPlayed = old.time.realPlayed;fresh.time.gamePlayed = old.time.gamePlayed;
      fresh.fluctuation.negativeStreakAchievement = old.fluctuation.negativeStreakAchievement;
      fresh.fluctuation.negativeStreakLevel = old.fluctuation.negativeStreakLevel;
      fresh.fluctuation.positiveChanceMastery = old.fluctuation.positiveChanceMastery;
      Game.Automation.preserve(old, fresh);
      fresh.settings = old.settings;fresh.ui = old.ui;
      // The constellation survives; Quanta and the Condense count do not.
      fresh.prestige.skills = old.prestige.skills;
      if (old.symmetry.perks.memory === 1) fresh.prestige.times = old.prestige.times;
      fresh.symmetry = old.symmetry;
      fresh.symmetry.times = fresh.symmetry.times.add(1);
      fresh.symmetry.shards = fresh.symmetry.shards.add(reward);
      fresh.symmetry.total = fresh.symmetry.total.add(reward);
      fresh.symmetry.mass = old.symmetry.perks.echo === 1 ? old.symmetry.mass.div(2) : D(0);
      if (fresh.prestige.skills["3-2"]) fresh.generators.fieldOscillation.added = D(Game.CONFIG.PRESTIGE.skills["3-2"].startingOscillations);
      if (fresh.prestige.skills["3-4-2"]) fresh.generators.fieldCoupling.added = D(Game.CONFIG.PRESTIGE.skills["3-4-2"].startingCouplings);
      this.startRun(fresh);
      Game.player = fresh;
      if (Game.Loop && !automated) { Game.Loop.accumulator = 0;Game.Loop.lastTime = performance.now(); }
      if (Game.UI) Game.UI.generatorSparkBudget = 0;
      if (Game.Experience && Game.Experience.syncPlayer) Game.Experience.syncPlayer(true);
      Game.Achievements.capture(fresh, true);
      Game.Save.save();
      if (Game.UI) Game.UI.render();
      if (first && Game.Experience && Game.Experience.enqueue) Game.Experience.enqueue({ kind: "Lore · 08", title: "Broken symmetry", text: rules().lore });
      if (Game.Experience && Game.Experience.resumeMessages) Game.Experience.resumeMessages();
      if (Game.Audio) Game.Audio.play("perk");
      return true;
    },
    canBuyPerk: function (id) {
      const perk = this.perk(id);
      return !!perk && !this.has(id) && Game.player.symmetry.shards.gte(perk.cost);
    },
    buyPerk: function (id) {
      if (!this.canBuyPerk(id)) return false;
      const s = Game.player.symmetry;
      s.shards = s.shards.sub(this.perk(id).cost);
      s.perks[id] = 1;
      Game.Save.save();
      if (Game.Audio) Game.Audio.play("perk");
      if (Game.UI) Game.UI.render();
      return true;
    },
    deeperCost: function () { const d = rules().deeper;return D(d.baseCost).add(D(d.costStep).mul(Game.player.symmetry.deeper)); },
    buyDeeper: function () {
      const s = Game.player.symmetry, cost = this.deeperCost();
      if (s.shards.lt(cost) || s.deeper >= 60) return false;
      s.shards = s.shards.sub(cost);s.deeper++;
      Game.Save.save();
      if (Game.Audio) Game.Audio.play("perk");
      if (Game.UI) Game.UI.render();
      return true;
    },
    // Spend Broken Symmetries cheapest-first. Used by the balance bot.
    buyAffordable: function () {
      let bought = true;
      while (bought) {
        bought = false;
        const self = this, options = rules().perks.filter(function (perk) { return self.canBuyPerk(perk.id); });
        options.sort(function (a, b) { return D(a.cost).cmp(b.cost); });
        if (options.length && D(options[0].cost).lte(this.deeperCost())) bought = this.buyPerk(options[0].id);
        else if (Game.player.symmetry.shards.gte(this.deeperCost())) bought = this.buyDeeper();
      }
    },
    massRate: function () {
      if (Game.Challenges.active()) return D(0);
      const base = Game.Structure.owned("symmetryBreaking");
      if (base.lte(0)) return D(0);
      const binding = rules().structures[2];
      return base.mul(D(binding.massMultiplier).pow(Game.Structure.owned("bindingForce"))).mul(D(rules().deeper.massMultiplier).pow(Game.player.symmetry.deeper));
    },
    energyMultiplier: function () {
      if (Game.Challenges.permanentBonusesDisabled()) return D(1);
      const mass = Game.player.symmetry.mass;
      return mass.gt(0) ? mass.add(1).pow(rules().massEnergyPower) : D(1);
    },
    quantaMultiplier: function () { return D(this.has("quanta") ? this.perk("quanta").quantaMultiplier : 1); },
    intervalMultiplier: function () { return this.has("swift") ? this.perk("swift").intervalMultiplier : 1; },
    atomProgress: function () {
      const mass = Game.player.symmetry.mass, goal = D(rules().atomMass);
      if (Game.player.symmetry.atom || mass.gte(goal)) return 1;
      return Math.max(0, Math.min(1, mass.add(1).log10() / goal.log10()));
    },
    ended: function () { return Game.player.symmetry.atom === 1; },
    checkAtom: function () {
      const s = Game.player.symmetry;
      if (s.atom || s.mass.lt(rules().atomMass)) return;
      s.atom = 1;
      Game.Achievements.capture(Game.player, true);
      if (Game.Experience && Game.Experience.enqueue) {
        Game.Experience.enqueue({ kind: "Lore · 09", title: "The first atom", text: rules().atomLore });
        Game.Experience.enqueue({ kind: "The end", title: "Thank you for playing", text: "You carried existence from a single disturbance to the first stable atom. The universe keeps going: keep breaking symmetry, deepen your asymmetry, and finish every challenge." });
      }
      if (Game.Save) Game.Save.save();
    }
  };

  Game.Structure = {
    definitions: function () { return rules().structures; },
    definition: function (id) { return rules().structures.find(function (structure) { return structure.id === id; }); },
    index: function (id) { return rules().structures.findIndex(function (structure) { return structure.id === id; }); },
    unlocked: function (id) {
      const definition = this.definition(id);
      if (!definition || Game.player.symmetry.times.lte(0)) return false;
      return !definition.perk || Game.Symmetry.has(definition.perk);
    },
    enabled: function (id) { return this.unlocked(id) && !Game.Challenges.active(); },
    owned: function (id) {
      if (!this.enabled(id)) return D(0);
      const state = Game.player.structures[id];
      return state.purchased.add(state.added);
    },
    cost: function (id) {
      const definition = this.definition(id);
      return D(definition.baseCost).mul(D(definition.costScaling).pow(Game.player.structures[id].purchased));
    },
    quote: function (id, amount) {
      if (!this.enabled(id)) return { count: D(0), cost: D(0) };
      const definition = this.definition(id), next = this.cost(id), scale = D(definition.costScaling), budget = Game.player.resources.energy;
      const limit = amount === "max" ? Infinity : Number(amount || 1);
      let count = Math.min(limit, Math.max(0, Decimal.affordGeometricSeries(budget, next, scale, 0).toNumber()));
      let cost = count > 0 ? Decimal.sumGeometricSeries(count, next, scale, 0) : D(0);
      if (cost.gt(budget)) { count--;cost = count > 0 ? Decimal.sumGeometricSeries(count, next, scale, 0) : D(0); }
      return { count: D(count), cost: cost };
    },
    buy: function (id, amount) {
      const quote = this.quote(id, amount || 1);
      if (quote.count.lte(0)) return false;
      const state = Game.player.structures[id];
      Game.player.resources.energy = Game.player.resources.energy.sub(quote.cost);
      state.purchased = state.purchased.add(quote.count);
      return true;
    },
    buyAll: function () {
      for (let index = rules().structures.length - 1; index >= 0; index--) this.buy(rules().structures[index].id, "max");
    },
    // Called for every simulation segment from Energy.tick.
    advance: function (delta) {
      const s = Game.player.symmetry, rate = Game.Symmetry.massRate();
      if (rate.gt(0)) s.mass = s.mass.add(rate.mul(delta));
      const particles = this.owned("massiveParticles");
      if (particles.gt(0)) {
        const timer = Game.player.structureTimer, interval = D(this.definition("massiveParticles").interval);
        timer.elapsed = timer.elapsed.add(delta);
        const cycles = timer.elapsed.div(interval).add(1e-12).floor();
        if (cycles.gt(0)) {
          timer.elapsed = Decimal.max(0, timer.elapsed.sub(cycles.mul(interval)));
          Game.player.structures.symmetryBreaking.added = Game.player.structures.symmetryBreaking.added.add(particles.mul(cycles));
        }
      } else Game.player.structureTimer.elapsed = D(0);
      Game.Symmetry.observe();
      Game.Symmetry.checkAtom();
    }
  };
})(window.CosmicIdle);
