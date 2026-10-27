(function (Game) {
  const D = Game.D;
  Game.Prestige = {
    canUnlockSymmetry: function () { return !Game.Challenges.active() && !Game.player.prestige.symmetry && Game.player.prestige.quanta.gte(Game.CONFIG.SYMMETRY.cost); },
    unlockSymmetry: function () {
      if(!this.canUnlockSymmetry()) return false;
      Game.player.prestige.quanta=Game.player.prestige.quanta.sub(Game.CONFIG.SYMMETRY.cost);Game.player.prestige.symmetry=1;
      Game.Save.save();if(Game.Audio) Game.Audio.play('perk');if(Game.UI) Game.UI.render();return true;
    },
    canBuySkill: function (id) {
      const definition = Game.CONFIG.PRESTIGE.skills[id];
      if (Game.Challenges.active() || !definition || Game.Progression.hasSkill(id)) return false;
      if (definition.requires && !Game.Progression.hasSkill(definition.requires)) return false;
      return Game.player.prestige.quanta.gte(definition.cost);
    },
    buySkill: function (id) {
      if (!this.canBuySkill(id)) return false;
      const definition = Game.CONFIG.PRESTIGE.skills[id];
      const oldInterval = D(Game.Modifiers.getFluctuationRules().rollInterval);
      const oldQuantumInterval = Game.Coherence.quantumInterval(), oldEnergyInterval = Game.Coherence.energyInterval();
      const oldDynamics=Game.FieldDynamics.rules();
      const burstGen = Game.Energy.getGenerator("energyDisturbance"), oldBurstInterval = Game.Energy.burstInterval(burstGen), oldFieldInterval = Game.FieldExcitation.interval();
      Game.player.prestige.quanta = Game.player.prestige.quanta.sub(definition.cost);
      Game.player.prestige.skills[id] = 1;
      if (id === "1-4-2") Game.Energy.rescaleBurstTimers(oldBurstInterval);
      if (id === "3-2-3") {
        const state=Game.player.fieldDynamics, rules=Game.FieldDynamics.rules();
        state.elapsed=state.elapsed.lt(oldDynamics.rise) ? state.elapsed.mul(rules.rise).div(oldDynamics.rise) : D(rules.rise).add(state.elapsed.sub(oldDynamics.rise));
        if (state.held) state.elapsed=Game.FieldDynamics.freezeAt();
      }
      if (id === "2-2") Game.player.fluctuation.elapsed = Game.player.fluctuation.elapsed.mul(Game.Modifiers.getFluctuationRules().rollInterval).div(oldInterval);
      if (id === "3-2") Game.Energy.addGenerators("fieldOscillation", definition.startingOscillations);
      if (["2-3-1", "2-3-3"].includes(id)) Game.player.coherence.quantumElapsed = Game.player.coherence.quantumElapsed.mul(Game.Coherence.quantumInterval()).div(oldQuantumInterval);
      if (id === "2-3-2") Game.player.coherence.energyElapsed = Game.player.coherence.energyElapsed.mul(Game.Coherence.energyInterval()).div(oldEnergyInterval);
      if (id === "4-3-2") {
        const timers = Game.player.generators.energyDisturbance;
        timers.burstTimers = timers.burstTimers.map(function (elapsed) { return elapsed.mul(Game.Energy.burstInterval(burstGen)).div(oldBurstInterval); });
        timers.burstElapsed = timers.burstElapsed.mul(Game.Energy.burstInterval(burstGen)).div(oldBurstInterval);
        Game.player.coherence.quantumElapsed = Game.player.coherence.quantumElapsed.mul(Game.Coherence.quantumInterval()).div(oldQuantumInterval);
        Game.player.coherence.energyElapsed = Game.player.coherence.energyElapsed.mul(Game.Coherence.energyInterval()).div(oldEnergyInterval);
        Game.player.fieldExcitation.elapsed = Game.player.fieldExcitation.elapsed.mul(Game.FieldExcitation.interval()).div(oldFieldInterval);
      }
      if (id === "3-3") Game.player.generatorFocus.elapsed = D(0);
      if (id === "3-4-2") Game.Energy.addGenerators("fieldCoupling", definition.startingCouplings);
      Game.Achievements.checkFluctMastery();
      Game.Save.save();
      if (Game.UI) Game.UI.render();
      if (Game.PerkFX) Game.PerkFX.play(id);
      return true;
    },
    respecRefund: function () {
      return Object.keys(Game.CONFIG.PRESTIGE.skills).reduce(function (sum, id) {
        return sum.add(Game.Progression.hasSkill(id) ? Game.CONFIG.PRESTIGE.skills[id].cost : 0);
      }, D(0));
    },
    canRespec: function () { return !Game.Challenges.active() && Object.keys(Game.player.prestige.skills).some(function (id) { return Game.Progression.hasSkill(id); }); },
    respec: function () {
      if (!this.canRespec()) return false;
      const old = Game.player, refund = this.respecRefund();
      Game.Progression.captureAchievements(old);
      if (Game.Coherence.discovered()) old.lore.coherenceSeen = 1;
      if (Game.FieldExcitation.discovered()) old.lore.fieldFirstSeen = old.lore.fieldSecondSeen = 1;
      const fresh = Game.createDefaultPlayer();
      fresh.achievements = old.achievements;fresh.lore = old.lore;
      fresh.time.realPlayed = old.time.realPlayed;fresh.time.gamePlayed = old.time.gamePlayed;
      fresh.fluctuation.negativeStreakAchievement = old.fluctuation.negativeStreakAchievement;
      fresh.fluctuation.negativeStreakLevel = old.fluctuation.negativeStreakLevel;
      fresh.fluctuation.positiveChanceMastery = old.fluctuation.positiveChanceMastery;
      fresh.prestige.quanta = old.prestige.quanta.add(refund);
      fresh.prestige.totalQuanta = old.prestige.totalQuanta;fresh.prestige.times = old.prestige.times;
      fresh.prestige.history = old.prestige.history;fresh.prestige.symmetry=old.prestige.symmetry;
      Game.Automation.preserve(old,fresh);Game.Symmetry.preserve(old,fresh);
      fresh.settings = old.settings;fresh.ui = old.ui;
      Game.Symmetry.startRun(fresh);
      Game.player = fresh;
      if (Game.Loop) { Game.Loop.accumulator = 0;Game.Loop.lastTime = performance.now(); }
      if (Game.UI) Game.UI.generatorSparkBudget = 0;
      if (Game.Experience) Game.Experience.syncPlayer();
      Game.Save.save();if (Game.UI) Game.UI.render();return true;
    },
    reward: function () {
      if (Game.Challenges.active()) return D(0);
      const energy = Game.player.resources.energy, minimum = D(Game.CONFIG.PROGRESSION.prestigeEnergy);
      if (energy.lt(minimum)) return D(0);
      // Decimal's normalized exponent is floor(log10(E)), including exact powers of ten.
      return D(energy.exponent - minimum.exponent + 1).mul(Game.Symmetry.quantaMultiplier());
    },
    nextRewardEnergy: function () {
      return D(10).pow(D(Game.CONFIG.PROGRESSION.prestigeEnergy).exponent + this.reward().div(Game.Symmetry.quantaMultiplier()).toNumber());
    },
    quantaRate: function (quanta, realSeconds, unitSeconds) {
      if (D(quanta).eq(0)) return D(0);
      return realSeconds>0 ? D(quanta).mul(unitSeconds).div(realSeconds) : null;
    },
    currentRun: function () {
      const quanta=this.reward(), seconds=Game.player.time.currentEnergyRunReal;
      return { quanta:quanta, realSeconds:seconds, partial:Game.player.time.currentEnergyRunPartial, perMinute:this.quantaRate(quanta,seconds,60), perHour:this.quantaRate(quanta,seconds,3600) };
    },
    condense: function (automated) {
      const reward = this.reward();
      if (reward.lte(0)) return false;
      const old = Game.player, first = !Game.Progression.condenseAchievementUnlocked();
      Game.Progression.captureAchievements(old);
      // Preserve every discovered lore entry, including an undismissed lesson.
      if (Game.Coherence.discovered()) old.lore.coherenceSeen = 1;
      if (Game.FieldExcitation.discovered()) old.lore.fieldFirstSeen = old.lore.fieldSecondSeen = 1;
      const fresh = Game.createDefaultPlayer();
      fresh.achievements = old.achievements;
      fresh.achievements.condense = 1;
      fresh.lore = old.lore;
      fresh.time.realPlayed = old.time.realPlayed;
      fresh.time.gamePlayed = old.time.gamePlayed;
      fresh.fluctuation.negativeStreakAchievement = old.fluctuation.negativeStreakAchievement;
      fresh.fluctuation.negativeStreakLevel = old.fluctuation.negativeStreakLevel;
      fresh.fluctuation.positiveChanceMastery = old.fluctuation.positiveChanceMastery;
      fresh.prestige = old.prestige;
      fresh.prestige.quanta = fresh.prestige.quanta.add(reward);
      fresh.prestige.totalQuanta = fresh.prestige.totalQuanta.add(reward);
      fresh.prestige.times = fresh.prestige.times.add(1);
      fresh.prestige.history = [{ condense:fresh.prestige.times, quanta:reward, realSeconds:old.time.currentEnergyRunReal, partial:old.time.currentEnergyRunPartial }].concat(old.prestige.history).slice(0,10);
      if (fresh.prestige.skills["3-2"]) fresh.generators.fieldOscillation.added = D(Game.CONFIG.PRESTIGE.skills["3-2"].startingOscillations);
      if (fresh.prestige.skills["3-4-2"]) fresh.generators.fieldCoupling.added = D(Game.CONFIG.PRESTIGE.skills["3-4-2"].startingCouplings);
      Game.Automation.preserve(old,fresh);Game.Symmetry.preserve(old,fresh);
      fresh.settings = old.settings;
      fresh.ui = old.ui;
      Game.Symmetry.startRun(fresh);
      Game.player = fresh;
      if (Game.Loop && !automated) { Game.Loop.accumulator = 0; Game.Loop.lastTime = performance.now(); }
      if (Game.UI) Game.UI.generatorSparkBudget = 0;
      const finish = function () {
        if (Game.player !== fresh) return;
        if (Game.Experience) Game.Experience.resumeMessages();
        if (first && Game.UI) Game.UI.notifyAchievement("First condensation", "×1.05 all Energy production");
      };
      if (Game.Experience) Game.Experience.syncPlayer(true);
      Game.Save.save();
      if (Game.UI) Game.UI.render();
      if (Game.CondenseFX && !automated) Game.CondenseFX.play(reward, finish);
      else finish();
      return true;
    }
  };
})(window.CosmicIdle);
