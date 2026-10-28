(function (Game) {
  const D = Game.D;

  Game.Energy = {
    baseManualGain: function () {
      if (!Game.Challenges.clicksAllowed()) return D(0);
      return Game.LateEnergy.payout(this.preProductionRate(Game.Progression.clickBaseGain().mul(Game.Progression.clickMultiplier()).mul(Game.Progression.clickSkillMultiplier()).mul(this.fluctMultiplier()).mul(Game.Progression.energyMultiplier()).mul(Game.FieldDynamics.multiplier())),.05);
    },
    capturedProductionGain: function () {
      return Game.Challenges.clicksAllowed() && Game.Progression.hasSkill("1-2") && !Game.Progression.hasSkill("1-2-1") ? this.productionPayout(D(Game.CONFIG.PRESTIGE.skills["1-2"].productionSeconds).mul(Game.Time.getGameSpeed())) : D(0);
    },
    manualGain: function () { return this.baseManualGain().add(this.capturedProductionGain()).add(Game.Progression.hasSkill("1-4-1") ? this.clickOutputBonus().energy : 0); },
    clickOutputBonus: function () {
      const seconds = D(Game.Challenges.clicksAllowed() && Game.Progression.hasSkill("1-4-1") ? Game.CONFIG.PRESTIGE.skills["1-4-1"].outputSeconds : 0);
      // Capture every rate before granting resources, so this click cannot feed itself.
      const coherent = Game.Coherence.outputPerCycle();
      return { energy: this.productionPayout(seconds), symmetry:Game.Symmetry.perSecond().mul(seconds), quantumResonance: coherent.div(Game.Coherence.quantumInterval()).mul(seconds), energyResonance: Game.Coherence.energyPerSecond().mul(seconds), baseGrowth: Game.FieldExcitation.growthPerSecond().mul(seconds) };
    },
    burstInterval: function (gen) {
      const reduction = gen.id === "energyDisturbance" && Game.Progression.hasSkill("1-4-2") ? Game.player.generators[gen.id].purchased.mul(Game.CONFIG.PRESTIGE.skills["1-4-2"].secondsPerPurchased) : D(0);
      return Game.Progression.productionInterval(D(gen.burstInterval).sub(reduction));
    },
    rescaleBurstTimers: function (oldInterval) {
      const gen=this.getGenerator("energyDisturbance"), state=Game.player.generators[gen.id], ratio=this.burstInterval(gen).div(oldInterval);
      state.burstTimers=state.burstTimers.map(function (elapsed) { return elapsed.mul(ratio); });state.burstElapsed=state.burstElapsed.mul(ratio);
    },

    getOwned: function (id) {
      if (!Game.Challenges.allowedGenerator(id)) return D(0);
      const state = Game.player.generators[id];
      return state.purchased.add(state.added).add(id === "fieldExcitation" ? this.getCoupledFields() : id === "fieldResonance" ? this.getSharedResonance() : 0);
    },
    getSharedResonance: function () { return Game.Challenges.produces("fieldCoupling") && Game.Progression.hasSkill("3-5-2") ? Game.player.generators.fieldCoupling.purchased : D(0); },
    resonanceCountMultiplier: function () { return Game.Progression.hasSkill("3-5-1") ? D(Math.max(1, Game.player.resources.quantumResonance.gt(0) ? Game.player.resources.quantumResonance.log10() / Math.log10(2) : 1)) : D(1); },
    getCoupledFields: function () {
      if(!Game.Challenges.produces("fieldCoupling")) return D(0);
      const state = Game.player.generators.fieldCoupling;
      return state ? state.purchased.add(state.added).mul(Game.player.upgrades.clickPower).mul(Game.CONFIG.FIELD_DYNAMICS.fieldsPerDisturb).mul(Game.Progression.generatorFocusMultiplier("fieldCoupling")).mul(Game.Symmetry.crossMultiplier("fieldCoupling")) : D(0);
    },
    getProductionCount: function (id) {
      const owned = Game.Challenges.produces(id) ? this.getOwned(id) : D(0);
      if (id === "fieldResonance") return owned.mul(this.resonanceCountMultiplier());
      return id === "energyDisturbance" && Game.Progression.hasSkill("1-3-2") ? owned.pow(Game.CONFIG.PRESTIGE.skills["1-3-2"].countPower) : owned;
    },
    getCountMultiplier: function (id) {
      const owned = this.getOwned(id);
      return owned.gt(0) ? this.getProductionCount(id).div(owned) : D(1);
    },
    purchasedBaseMultiplier: function () {
      return Game.Progression.hasSkill("1-3-1") ? D(Game.CONFIG.PRESTIGE.skills["1-3-1"].baseMultiplierPerPurchased).pow(Game.player.generators.energyDisturbance.purchased) : D(1);
    },
    autoClickEligible: function () { return !Game.Challenges.active() && Game.Progression.hasSkill("1-2-2") && Game.player.upgrades.clickPower.gte(Game.Modifiers.getClickUpgradeRules().maxLevel); },
    autoClickRemaining: function () { return this.autoClickEligible() ? Decimal.max(0, D(Game.CONFIG.PRESTIGE.skills["1-2-2"].interval).sub(Game.player.autoClick.elapsed)) : D(Infinity); },
    replicationInterval: function () { const rules=Game.CONFIG.PRESTIGE.skills["1-5-1"];return D(rules.firstInterval).add(Game.player.disturbanceReplication.doubles.mul(rules.intervalGrowth)); },
    replicationActive: function () { return Game.Challenges.produces("energyDisturbance") && Game.Progression.hasSkill("1-5-1") && this.getOwned("energyDisturbance").gt(0); },
    replicationRemaining: function () { return this.replicationActive() ? Decimal.max(0,this.replicationInterval().sub(Game.player.disturbanceReplication.elapsed)) : D(Infinity); },
    resolveReplication: function () {
      if (!this.replicationActive() || this.replicationRemaining().gt(1e-12)) return;
      const state=Game.player.disturbanceReplication;
      state.elapsed=Decimal.max(0,state.elapsed.sub(this.replicationInterval()));state.doubles=state.doubles.add(1);
      this.addGenerators("energyDisturbance",this.getOwned("energyDisturbance"));
      if (Game.UI) Game.UI.dynamicsFeedback("energyDisturbance");
    },
    fluctGrowth: function () {
      return D(Game.Modifiers.getFluctuationRules().growth).add(Game.Coherence.quantumSoftcapState().effective.mul(Game.CONFIG.COHERENCE.quantumFluctGrowth));
    },
    fluctFormulaText: function () {
      const rules = Game.Modifiers.getFluctuationRules();
      return "M = " + rules.base + " × ((" + rules.growth + " + " + Game.CONFIG.COHERENCE.quantumFluctGrowth + " × Qeff)^n) × the current Wandering rhythm bonus, where n is total Quantum Fluctuations and Qeff is Quantum Resonance after soft caps. Positive: ×M. Negative: ×[1 − " + rules.negativePenaltyScale + " × (1 − 1/M)].";
    },
    fluctMagnitude: function () {
      const rules = Game.Modifiers.getFluctuationRules();
      return D(rules.base).mul(this.fluctGrowth().pow(this.getOwned("quantumFluctuation"))).mul(Game.Progression.generatorFocusMultiplier("quantumFluctuation")).mul(Game.Symmetry.crossMultiplier("quantumFluctuation"));
    },
    fluctMultiplier: function () {
      if (!Game.Challenges.produces("quantumFluctuation") || this.getOwned("quantumFluctuation").lte(0)) return D(1);
      const magnitude = this.fluctMagnitude();
      if (Game.player.fluctuation.positive) return magnitude;
      const penalty = D(1).sub(D(1).div(magnitude));
      return D(1).sub(penalty.mul(Game.Modifiers.getFluctuationRules().negativePenaltyScale));
    },
    rollFluctuation: function () {
      if (this.getOwned("quantumFluctuation").lte(0)) return;
      Game.Achievements.checkFluctMastery();
      const chance = Math.max(0, Math.min(1, Game.Modifiers.getFluctuationRules().positiveChance));
      const state = Game.player.fluctuation, achievement = Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT;
      state.positive = Math.random() < chance ? 1 : 0;
      state.negativeStreak = state.positive ? 0 : Math.min(achievement.requiredRolls, state.negativeStreak + 1);
      state.rollReductionStacks = !state.positive && Game.Progression.hasSkill("2-1-2") ? state.rollReductionStacks.add(1) : D(0);
      Game.Achievements.grantFluctLevel(achievement.tiers.filter(function (tier) { return state.negativeStreak>=tier.rolls; }).length,true);
      Game.Achievements.checkFluctMastery();
      if (Game.UI) Game.UI.fluctuationFeedback();
    },
    addGenerators: function (id, amount) {
      if (!Game.Challenges.addedAllowed(id)) return false;
      const state = Game.player.generators[id], gen = this.getGenerator(id), value = D(amount);
      if (!state || !Number.isFinite(value.exponent) || !Number.isFinite(value.mantissa) || value.lt(0)) return false;
      const beforeCredit = this.syncGeneratorTimers(gen, state);
      state.added = state.added.add(value);
      const afterCredit = this.syncGeneratorTimers(gen, state);
      this.addEnergyCredit(beforeCredit.add(afterCredit).mul(this.getCountMultiplier(id)).mul(Game.Progression.generatorFocusMultiplier(id)).mul(Game.Symmetry.crossMultiplier(id)).mul(Game.Progression.generatorMultiplier()).mul(this.fluctMultiplier()).mul(Game.Progression.energyMultiplier()).mul(Game.FieldDynamics.multiplier()));
      if (id === "coherentEnergy" && value.gt(0) && Game.UI) Game.Coherence.showLore();
      return true;
    },
    getGenerator: function (id) {
      return Game.CONFIG.GENERATORS.find(function (gen) { return gen.id === id; });
    },
    // Future stage generators can supply a non-Energy unlock requirement.
    generatorEnabled: function (gen) { return Boolean(gen) && Game.Challenges.allowedGenerator(gen.id) && (!gen.unlockRequirement || gen.unlockRequirement(Game.player)); },

    getGeneratorScaling: function (generator, owned) {
      const tier = Math.floor((owned === undefined ? Game.player.generators[generator.id].purchased.toNumber() : owned) / (generator.scalingStepLevels || Game.CONFIG.GENERATOR_SCALING.stepLevels));
      const level=owned===undefined ? Game.player.generators[generator.id].purchased.toNumber() : owned;
      const late=generator.lateScalingStart===undefined ? 0 : Math.max(0,Math.floor((level-generator.lateScalingStart)/(generator.scalingStepLevels || Game.CONFIG.GENERATOR_SCALING.stepLevels)));
      return D(generator.costScaling).add(D(generator.scalingStepIncrease || Game.CONFIG.GENERATOR_SCALING.stepIncrease).mul(tier)).add(D(generator.lateScalingStepIncrease || 0).mul(late));
    },
    getGeneratorCost: function (generator) {
      const owned = Game.player.generators[generator.id].purchased.toNumber();
      const step = (generator.scalingStepLevels || Game.CONFIG.GENERATOR_SCALING.stepLevels);
      const key = [owned, generator.lateScalingStart,generator.lateScalingStepIncrease,generator.baseCost, generator.costScaling, step, generator.scalingStepIncrease || Game.CONFIG.GENERATOR_SCALING.stepIncrease,Game.Challenges.priceMultiplier().toString()].join("|");
      const cache = this._costCache || (this._costCache = Object.create(null)), previous = cache[generator.id];
      const cacheable = this.getGeneratorScaling === originalScalingRule;
      if (cacheable && previous && previous.key === key) return previous.cost;
      let cost = D(generator.baseCost).mul(Game.Challenges.priceMultiplier());
      for (let start = 0; start < owned; start += step) {
        cost = cost.mul(this.getGeneratorScaling(generator, start).pow(Math.min(step, owned - start)));
      }
      if (cacheable) cache[generator.id] = { key: key, cost: cost };
      return cost;
    },

    preProductionRate: function (raw, offset) { return D(raw).pow(Game.Challenges.gainPower()).mul(Game.Challenges.energyFactor(offset)); },
    energyRate: function (raw, offset) { return Game.LateEnergy.compressedRate(this.preProductionRate(raw,offset)).mul(Game.Symmetry.energyMultiplier()); },
    productionPayout: function (seconds) {
      if(D(seconds).lte(0)) return D(0);
      const raw=this.preProductionRate(this.rawGeneratorProduction(this.getGenerator('energyDisturbance')));
      return Game.LateEnergy.preview(raw,seconds).gain;
    },
    getGeneratorProduction: function (generator, oscillation) { return this.energyRate(this.rawGeneratorProduction(generator,oscillation)); },
    rawGeneratorProduction: function (generator, oscillation) {
      if (generator.type) return D(0);
      const owned = this.getProductionCount(generator.id);
      const rate = this.getBaseRate(generator);
      return rate.mul(owned).mul(Game.Progression.generatorFocusMultiplier(generator.id)).mul(Game.Symmetry.crossMultiplier(generator.id)).mul(Game.Progression.generatorMultiplier()).mul(this.fluctMultiplier()).mul(Game.Progression.energyMultiplier()).mul(oscillation === undefined ? Game.FieldDynamics.multiplier() : oscillation);
    },

    getProductionPerSecond: function () {
      let total = D(0);
      Game.CONFIG.GENERATORS.forEach(function (generator) {
        total = total.add(Game.Energy.getGeneratorProduction(generator));
      });
      return total;
    },
    getBaseRate: function (generator) {
      const rate = generator.burstInterval ? D(generator.burstProduction).div(generator.burstInterval) : D(generator.production);
      const base = generator.id === "energyDisturbance" ? rate.add(Game.player.fieldExcitation.baseRateBonus).mul(this.purchasedBaseMultiplier()) : rate;
      return generator.burstInterval ? base.mul(generator.burstInterval).div(this.burstInterval(generator)) : base;
    },

    generateManual: function (deferTime) {
      if (!Game.Challenges.clicksAllowed()) return D(0);
      const previouslyUnlocked = Game.Progression.achievementUnlocked();
      Game.FieldDynamics.releasePeak();
      Game.player.stats.manualClicks = Game.player.stats.manualClicks.add(1);
      Game.Achievements.capture(Game.player,true);
      const bonus = this.clickOutputBonus();
      const gain = this.baseManualGain().add(this.capturedProductionGain()).add(bonus.energy);
      this.addEnergy(gain);
      if (Game.Progression.hasSkill("1-4-1")) {
        Game.Symmetry.add(bonus.symmetry);
        Game.Coherence.grantOutput("quantumResonance", bonus.quantumResonance);
        Game.Coherence.grantOutput("energyResonance", bonus.energyResonance);
        Game.player.fieldExcitation.baseRateBonus = Game.player.fieldExcitation.baseRateBonus.add(bonus.baseGrowth);
      }
      if (!previouslyUnlocked && Game.Progression.achievementUnlocked() && Game.UI) Game.UI.notifyAchievement();
      const time = D(Game.Progression.hasSkill("1-2-1") ? Game.CONFIG.PRESTIGE.skills["1-2-1"].gameSeconds : 0);
      if (!deferTime && time.gt(0)) Game.Loop.advanceGameTime(time);
      return time;
    },

    quoteGenerator: function (id, amount) {
      const gen = this.getGenerator(id);
      if (!this.generatorEnabled(gen)) return { count: D(0), cost: D(0) };
      let level = Game.player.generators[id].purchased.toNumber();
      let next = this.getGeneratorCost(gen), cost = D(0), count = 0;
      const limit = Math.min(Game.Challenges.purchaseLimit(id),amount === "max" ? Infinity : Number(amount || 1));
      const budget = Game.player.resources.energy;
      // Sum each 25-level geometric block, preserving tier transitions for bulk buying.
      while (count < limit) {
        const scale = this.getGeneratorScaling(gen, level);
        const step = gen.scalingStepLevels || Game.CONFIG.GENERATOR_SCALING.stepLevels;
        const block = Math.min(step - level % step, limit - count);
        let take = Math.min(block, Math.max(0, Decimal.affordGeometricSeries(budget.sub(cost), next, scale, 0).toNumber()));
        let blockCost = take > 0 ? Decimal.sumGeometricSeries(take, next, scale, 0) : D(0);
        if (cost.add(blockCost).gt(budget)) { take--; blockCost = take > 0 ? Decimal.sumGeometricSeries(take, next, scale, 0) : D(0); }
        // Repair a log rounding underestimate at an exact price boundary.
        if (take < block && cost.add(blockCost).add(next.mul(scale.pow(take))).lte(budget)) { blockCost = blockCost.add(next.mul(scale.pow(take))); take++; }
        if (take <= 0) break;
        cost = cost.add(blockCost); count += take; level += take;
        next = next.mul(scale.pow(take));
        if (take < block) break;
      }
      return { count: D(count), gain:D(count).mul(Game.Challenges.purchaseQuantity()), cost: cost };
    },
    buyGenerator: function (id, amount) {
      if (!this.generatorEnabled(this.getGenerator(id))) return false;
      const quote = this.quoteGenerator(id, amount || 1);
      if (quote.count.lte(0)) return false;
      const before = Game.player.stats.generatorsBought;
      const hadFirstAchievement = Game.Progression.firstGeneratorAchievementUnlocked();
      const hadGrowingAchievement = Game.Progression.growingEngineAchievementUnlocked();
      const hadCoherentAchievement = Game.Progression.coherentAchievementUnlocked();
      const gen = this.getGenerator(id);
      const state = Game.player.generators[id];
      // Initialize old timers before adding new generators so purchases start fresh cycles.
      const oldCredit = this.syncGeneratorTimers(gen, state);
      const oldBurstInterval = gen.burstInterval ? this.burstInterval(gen) : null;
      Game.player.resources.energy = Game.player.resources.energy.sub(quote.cost);
      state.purchased = state.purchased.add(quote.count);
      if(quote.gain) state.added=state.added.add(quote.gain.sub(quote.count));
      if (id === "energyDisturbance" && Game.Progression.hasSkill("1-4-2")) this.rescaleBurstTimers(oldBurstInterval);
      Game.player.stats.generatorsBought = before.add(quote.count);
      Game.Achievements.capture(Game.player,true);
      Game.Challenges.afterPurchase(id);
      const transitionCredit = this.syncGeneratorTimers(gen, state);
      this.addEnergyCredit(oldCredit.add(transitionCredit).mul(this.getCountMultiplier(id)).mul(Game.Progression.generatorFocusMultiplier(id)).mul(Game.Symmetry.crossMultiplier(id)).mul(Game.Progression.generatorMultiplier()).mul(this.fluctMultiplier()).mul(Game.Progression.energyMultiplier()).mul(Game.FieldDynamics.multiplier()));
      if (Game.UI) {
        if (!hadFirstAchievement && Game.Progression.firstGeneratorAchievementUnlocked()) Game.UI.notifyAchievement("An emerging chorus", "×1.05 generator production");
        if (!hadGrowingAchievement && Game.Progression.growingEngineAchievementUnlocked()) Game.UI.notifyAchievement("A growing engine", "×1.1 generator production");
        if (!hadCoherentAchievement && Game.Progression.coherentAchievementUnlocked()) Game.UI.notifyAchievement("A coherent beginning", "×1.05 all generator production");
      }
      if (gen.type === "coherent" && Game.UI) Game.Coherence.showLore();
      if (["oscillation", "resonance", "coupling"].includes(gen.type) && Game.UI) Game.UI.dynamicsFeedback(gen.id);
      return true;
    },

    // At most 24 timers per burst generator; larger populations use a rate formula.
    syncGeneratorTimers: function (gen, state) {
      if (!gen.burstInterval) return D(0);
      state.burstTimers = state.burstTimers || [];
      if (Game.Energy.getOwned(gen.id).gte(gen.smoothAt)) {
        const elapsed = state.burstTimers.reduce(function (sum, timer) { return sum.add(timer); }, D(0))
          .add(state.burstElapsed.mul(Game.Energy.getOwned(gen.id)));
        state.burstTimers = [];
        state.burstElapsed = D(0);
        return elapsed.mul(this.getBaseRate(gen));
      }
      const owned = this.getOwned(gen.id).toNumber();
      const legacyElapsed = state.burstElapsed;
      while (state.burstTimers.length < owned) state.burstTimers.push(legacyElapsed);
      state.burstTimers.length = owned;
      state.burstElapsed = D(0);
      return D(0);
    },
    addEnergyCredit: function (gain) {
      if(!Game.Challenges.produces('energyDisturbance')) return;
      const raw=this.rawGeneratorProduction(this.getGenerator('energyDisturbance'));
      if(raw.gt(0) && gain.gt(0)) Game.LateEnergy.grant(this.preProductionRate(raw),gain.div(raw));
    },
    addEnergy: function (gain) {
      if (gain.lte(0)) return;
      Game.player.resources.energy = Game.player.resources.energy.add(gain);
      Game.player.stats.totalEnergy = Game.player.stats.totalEnergy.add(gain);
      Game.player.lateEnergy.highest=Decimal.max(Game.player.lateEnergy.highest,Game.player.resources.energy);
      Game.Challenges.observe();
    },
    tick: function (gameDelta) {
      const state = Game.player.fluctuation;
      let remaining = D(gameDelta);
      // Timed resources resolve after their production segment. Newly created
      // generators and stronger Fluct growth therefore never apply retroactively.
      while (remaining.gt(0)) {
        const hasFluctuation = Game.Challenges.produces("quantumFluctuation") && this.getOwned("quantumFluctuation").gt(0);
        if (!hasFluctuation && !Game.Challenges.active(6)) { state.elapsed = D(0);state.negativeStreak = 0;state.rollReductionStacks = D(0); }
        const interval = D(Game.Modifiers.getFluctuationRules().rollInterval);
        const untilRoll = hasFluctuation ? Decimal.max(0, interval.sub(state.elapsed)) : D(Infinity);
        const gen = this.getGenerator("energyDisturbance"), timers = Game.player.generators.energyDisturbance;
        const untilBurst = Game.Challenges.produces(gen.id) && this.getOwned(gen.id).gt(0) && this.getOwned(gen.id).lt(gen.smoothAt) ? this.burstInterval(gen).sub(timers.burstTimers.reduce(function (latest, timer) { return Decimal.max(latest, timer); }, timers.burstElapsed)) : D(Infinity);
        const segment = Decimal.min(Game.Flow.nextEventIn(),Decimal.min(Game.Symmetry.nextEventIn(),Decimal.min(this.replicationRemaining(), Decimal.min(Game.Progression.generatorFocus().remaining, Decimal.min(remaining, Decimal.min(untilBurst, Decimal.min(Game.FieldDynamics.nextEventIn(), Decimal.min(untilRoll, Decimal.min(Game.Coherence.nextEventIn(), Game.FieldExcitation.nextEventIn())))))))));
        if (segment.gt(0)) {
          this.tickProduction(segment);
          Game.Symmetry.advance(segment);
          Game.Challenges.advanceClock(segment.toNumber()*(Game.Challenges.realRate||0));
          Game.Coherence.advance(segment);
          Game.Flow.advance(segment);
          Game.FieldExcitation.advance(segment);
          Game.FieldDynamics.advance(segment);
          if (this.replicationActive()) Game.player.disturbanceReplication.elapsed = Game.player.disturbanceReplication.elapsed.add(segment);
          if (hasFluctuation) state.elapsed = state.elapsed.add(segment);
          remaining = remaining.sub(segment);
        } else this.tickProduction(D(0));
        Game.Coherence.resolveEvents();
        Game.Flow.resolve();
        Game.FieldExcitation.resolveEvents();
        Game.FieldDynamics.resolveEvents();
        this.resolveReplication();
        if (hasFluctuation && state.elapsed.add(1e-12).gte(interval)) {
          state.elapsed = D(0);
          this.rollFluctuation();
        }
        // Resolve the ending generator's resource events before moving the bonus.
        Game.Progression.advanceGeneratorFocus(segment);
        Game.Achievements.capture(Game.player,true);
      }
    },
    tickProduction: function (gameDelta) {
      let gain = D(0);
      const power=Game.Challenges.gainPower(),oscillation=Game.FieldDynamics.averageMultiplier(gameDelta,power,Game.Challenges.energySlope()*(Game.Challenges.realRate||0));
      const factor=Game.Challenges.energyFactor();
      Game.CONFIG.GENERATORS.forEach(function (gen) {
        const state = Game.player.generators[gen.id];
        if (!Game.Challenges.produces(gen.id) || Game.Energy.getOwned(gen.id).lte(0)) return;
        if (gen.type) return;
        if (!gen.burstInterval) {
          gain = gain.add(Game.Energy.rawGeneratorProduction(gen, D(1)).pow(power).mul(factor).mul(oscillation).mul(gameDelta));
          if(Game.UI && gameDelta.gt(0))Game.UI.streamGeneratorSparks(gen,Game.Energy.getOwned(gen.id),gameDelta);
          return;
        }
        const multiplier = Game.D(1).mul(Game.Progression.generatorMultiplier()).mul(Game.Energy.fluctMultiplier()).mul(Game.Progression.energyMultiplier()).mul(Game.Energy.getCountMultiplier(gen.id)).mul(Game.Progression.generatorFocusMultiplier(gen.id)).mul(Game.Symmetry.crossMultiplier(gen.id));
        const credit=Game.Energy.syncGeneratorTimers(gen,state).mul(multiplier).mul(Game.FieldDynamics.multiplier());
        const raw=Game.Energy.rawGeneratorProduction(gen);
        gain=gain.add(raw.gt(0)?credit.mul(Game.Energy.preProductionRate(raw).div(raw)):0);
        if (Game.Energy.getOwned(gen.id).gte(gen.smoothAt)) {
          gain = gain.add(Game.Energy.rawGeneratorProduction(gen, D(1)).pow(power).mul(factor).mul(oscillation).mul(gameDelta));
          if (Game.UI) Game.UI.streamGeneratorSparks(gen, Game.Energy.getOwned(gen.id), gameDelta);
          return;
        }
        let bursts = D(0);
        const interval = Game.Energy.burstInterval(gen);
        state.burstTimers = state.burstTimers.map(function (elapsed) {
          elapsed = elapsed.add(gameDelta);
          const cycles = elapsed.div(interval).add(1e-12).floor();
          bursts = bursts.add(cycles);
          return Decimal.max(0, elapsed.sub(cycles.mul(interval)));
        });
        if (bursts.lte(0)) return;
        gain = gain.add(Game.Energy.preProductionRate(Game.Energy.rawGeneratorProduction(gen,Game.FieldDynamics.multiplierAt(gameDelta)),gameDelta.toNumber()*(Game.Challenges.realRate||0)).mul(interval).mul(bursts).div(Game.Energy.getOwned(gen.id)));
        if (Game.UI) Game.UI.flashGeneratorBurst(Decimal.min(120, bursts.mul(gen.sparksPerBurst)).toNumber());
      });
      if(gameDelta.gt(0)) {
        const late=Decimal.max(Game.player.lateEnergy.highest,Game.player.resources.energy).gte('1e1000');
        const gen=Game.CONFIG.GENERATORS[0],smooth=this.getOwned(gen.id).gte(gen.smoothAt);
        const raw=late && smooth?this.preProductionRate(this.rawGeneratorProduction(gen)):gain.div(gameDelta);
        const rising=Game.FieldDynamics.active() && !Game.FieldDynamics.held() && !Game.FieldDynamics.peakPaused() && Game.player.fieldDynamics.elapsed.lt(Game.FieldDynamics.rules().rise);
        const slope=late && smooth ? (rising?Game.FieldDynamics.riseLogSlope()*power:0)+Game.Challenges.energySlope()*(Game.Challenges.realRate||0) : 0;
        Game.LateEnergy.grantProduction(raw,gameDelta,slope);
      }
      else this.addEnergy(gain);
    },

    resetLayer: function () {
      Game.FieldWaves.clear();
      Game.player.resources.energy = D(0);
      Game.player.resources.quantumResonance = D(0);
      Game.player.resources.energyResonance = D(0);
      Game.player.stats.totalQuantumResonance = D(0);
      Game.player.coherence.quantumElapsed = D(0);
      Game.player.coherence.energyElapsed = D(0);
      Game.player.coherence.quantumCarry = D(0);
      Game.player.coherence.energyCarry = D(0);
      Game.player.fieldExcitation.elapsed = D(0);
      Game.player.fieldExcitation.baseRateBonus = D(0);
      Game.player.fieldDynamics.elapsed = D(0);
      Game.player.fieldDynamics.held = 0;
      Game.player.generatorFocus.elapsed = D(0);
      Game.player.autoClick.elapsed = D(0);
      Game.player.disturbanceReplication.elapsed = D(0);
      Game.player.disturbanceReplication.doubles = D(0);
      Game.player.time.currentEnergyRun = D(0);
      Game.player.time.currentEnergyRunReal = 0;
      Game.player.time.currentEnergyRunPartial = 0;
      Game.player.fluctuation.elapsed = D(0);
      Game.player.fluctuation.positive = 1;
      Game.player.fluctuation.negativeStreak = 0;
      Game.player.fluctuation.rollReductionStacks = D(0);
      Game.CONFIG.GENERATORS.forEach(function (gen) {
        Game.player.generators[gen.id].purchased = D(0);
        Game.player.generators[gen.id].added = D(0);
        Game.player.generators[gen.id].burstElapsed = D(0);
        Game.player.generators[gen.id].burstTimers = [];
      });
    }
  };
  // Custom rule functions can depend on arbitrary state, so bypass price caching.
  const originalScalingRule = Game.Energy.getGeneratorScaling;
})(window.CosmicIdle);
