(function (Game) {
  const D = Game.D;

  // Read the same rules and totals used by production; never advance timers or rolls.
  Game.ProductionStats = {
    // Compare multiplicative strength in log space. Signed absolute shares sum
    // to 100%, so a slowdown remains legible even when it cancels other boosts.
    withShares: function (entries, active, baselineId) {
      const logs = entries.map(function (entry) { return entry.factor.gt(0) ? entry.factor.log10() : 0; });
      const infinite = logs.filter(function (value) { return Math.abs(value) === Infinity; }).length;
      const scale = logs.reduce(function (largest, value) { return Math.max(largest, Math.abs(value)); }, 0);
      const weights = logs.map(function (value) {
        return infinite ? (Math.abs(value) === Infinity ? Math.sign(value) / infinite : 0) : scale > 0 ? value / scale : 0;
      });
      const total = weights.reduce(function (sum, value) { return sum + Math.abs(value); }, 0);
      return entries.map(function (entry, index) {
        return Object.assign({}, entry, {
          share: !active ? 0 : total > 0 ? weights[index] / total : entry.id === baselineId ? 1 : 0
        });
      });
    },

    fluctBreakdown: function (s) {
      const enabled = s.fluct.owned.gt(0), rules = s.fluct.rules;
      const growth = D(rules.growth), increment = D(Game.CONFIG.COHERENCE.quantumFluctGrowth);
      const rawGrowth = growth.add(s.coherence.quantum.mul(increment));
      const effectiveGrowth = growth.add(s.coherence.softcap.effective.mul(increment));
      const resonance = [
        { id: "raw-resonance", label: "Raw Resonance potential", factor: enabled ? rawGrowth.div(growth).pow(s.fluct.owned) : D(1) },
        { id: "resonance-softcap", label: "Soft-cap reduction", factor: enabled ? effectiveGrowth.div(rawGrowth).pow(s.fluct.owned) : D(1), tip: "quantumSoftcap" }
      ];
      const entries = [
        { id: "fluct-base", label: "Starting Fluct strength", factor: enabled ? D(rules.base) : D(1) },
        { id: "fluct-units", label: "Gen 2 · Quantum Fluctuation", factor: enabled ? growth.pow(s.fluct.owned) : D(1), owned: s.fluct.owned },
        {
          id: "fluct-resonance", label: "Quantum Resonance", tip: "quantumResonance",
          factor: enabled ? effectiveGrowth.div(growth).pow(s.fluct.owned) : D(1),
          children: this.withShares(resonance, enabled), childBasis: "resonance-growth"
        }
      ];
      entries.push({ id: "fluct-focus", label: "3-3 · Wandering rhythm", factor: enabled ? s.fluct.focus : D(1) });
      // These factors build M. A negative roll transforms the combined M using
      // the softened penalty; the individual strength sources are not penalties.
      return { enabled: enabled, magnitude: enabled ? s.fluct.magnitude : D(1), entries: this.withShares(entries, enabled) };
    },

    contributions: function (s, kind) {
      const generator = kind === "generators", a = s.achievements;
      const amount = generator ? s.generators : s.clicks;
      const output = generator ? amount.perRealSecond : amount.total;
      const active = output.gt(0);
      const achievements = generator ? [
        { id: "growing", label: "A growing engine", factor: a.growingEngine },
        { id: "coherent", label: "A coherent beginning", factor: a.coherentBeginning }
      ] : [
        { id: "sparks", label: "First sparks", factor: a.firstSparks },
        { id: "first", label: "First generator", factor: a.firstGenerator }
      ];
      achievements.push({ id: "time", label: "A moment in the void · tier " + s.time.level, factor: s.time.multiplier });
      achievements.push({ id: "condense", label: "First condensation", factor: a.condense });
      Game.Achievements.entries(generator?"generators":"clicks").forEach(function (entry) { achievements.push(entry); });
      const achievementFactor = achievements.reduce(function (product, entry) { return product.mul(entry.factor); }, D(1));
      let base, children;
      if (generator) {
        base = amount.owned.mul(amount.baseRate);
        children = [
          { id: "purchased", label: "Purchased units", factor: amount.purchased, output: amount.purchased.mul(amount.perUnit).mul(amount.bonus).mul(s.speed) },
          { id: "added", label: "Added units", factor: amount.added, output: amount.added.mul(amount.perUnit).mul(amount.bonus).mul(s.speed) }
        ];
        children.forEach(function (child) { child.share = active && amount.owned.gt(0) ? child.factor.div(amount.owned).toNumber() : 0; });
      } else {
        base = amount.baseTotal;
        children = [
          { id: "potential", label: "Base potential", factor: amount.base, output: amount.base.mul(amount.bonus) },
          { id: "disturb", label: "Disturb", factor: amount.disturb, output: amount.disturb.mul(amount.bonus) }
        ];
        children.forEach(function (child) { child.share = active && base.gt(0) ? child.factor.div(base).toNumber() : 0; });
      }
      const entries = [{
        id: "base", label: generator ? "Gen 1 · Energy Disturbance" : "Base click Energy", factor: base,
        color: "base", base: true, children: children, childBasis: "output"
      }];
      if (generator) {
        entries.push({ id: "purchased-base", label: "1-3-1 · Accumulated disturbance", factor: amount.purchasedMultiplier, color: "quanta" });
        entries.push({ id: "field", label: "Gen 4 · Field Excitation", factor: amount.baseRate.add(amount.fieldBonus).div(amount.baseRate), color: "field" });
        entries.push({ id: "shorter-intervals", label: "Production cycle bonuses · 4-3-2 / 1-4-2", factor: amount.cadence, color: "quanta" });
        entries.push({ id: "count-power", label: "1-3-2 · Gathering potential", factor: amount.countMultiplier, color: "quanta" });
        entries.push({ id: "generator-focus", label: "3-3 · Wandering rhythm", factor: amount.focus, color: "quanta" });
      }
      entries.push({ id: "achievements", label: "Achievements", factor: achievementFactor, color: "achievements", children: this.withShares(achievements, active), childBasis: "growth" });
      entries.push({ id: "quanta", label: Game.Progression.hasSkill("4-4-2") ? "Quanta · higher of unspent or half lifetime" : "Unspent Primordial Quanta", factor: s.prestige.multiplier, color: "quanta" });
      entries.push({ id: "continuum", label: "4-2 · Boundless potential", factor: s.prestige.energyMultiplier, color: "quanta" });
      entries.push({ id: "condense-memory", label: "0-0 · Memory of condensation", factor: s.prestige.condenseMemory, color: "quanta" });
      if (!generator) entries.push({ id: "skills", label: "1-1 · Focused disturbance", factor: s.prestige.clickMultiplier, color: "quanta" });
      const strength = this.fluctBreakdown(s);
      entries.push({ id: "fluct", label: "Fluct", tip: "fluctFormula", factor: s.fluct.multiplier, color: "fluct", children: strength.entries, childBasis: "fluct-strength", strength: strength });
      entries.push({ id: "oscillation", label: "Field Oscillation", tip: "fieldOscillation", factor: s.dynamics.multiplier, color: "field", children: this.withShares([
        { id: "oscillation-base", label: "Gen 5 · Field Oscillation", factor: s.dynamics.baseCurrent },
        { id: "oscillation-resonance", label: "Gen 6 · Field Resonance", factor: s.dynamics.resonanceCurrent }
      ], active), childBasis: "oscillation" });
      if (generator) entries.push({ id: "speed", label: "Game speed", factor: s.speed, color: "speed" });
      if (!generator && (amount.captured.gt(0) || Game.Progression.hasSkill("1-4-1"))) entries.push({
        id: "captured-production", label: "Click production bonuses", factor: amount.total.div(amount.ordinary), color: "quanta", childBasis: "captured-production",
        children: [
          { id: "ordinary-click", label: "Ordinary click Energy", factor: amount.ordinary, output: amount.ordinary, share: amount.ordinary.div(amount.total).toNumber() },
          { id: "captured-energy", label: "1-2 · 0.25 seconds of generator Energy", factor: amount.captured, output: amount.captured, share: amount.captured.div(amount.total).toNumber() },
          { id: "echo-energy", label: "1-4-1 · 1% of per-second Energy", factor: amount.echo.energy, output: amount.echo.energy, share: amount.echo.energy.div(amount.total).toNumber() }
        ]
      });
      return { kind: kind, output: output, active: active, entries: this.withShares(entries, active, "base") };
    },

    snapshot: function () {
      const p = Game.player, rules = Game.Modifiers.getClickUpgradeRules();
      const firstSparks = D(Game.Progression.achievementUnlocked() ? Game.CONFIG.CLICK_ACHIEVEMENT.multiplier : 1);
      const firstGenerator = D(Game.Progression.firstGeneratorAchievementUnlocked() ? Game.CONFIG.GENERATOR_ACHIEVEMENTS.firstClickMultiplier : 1);
      const growingEngine = D(Game.Progression.growingEngineAchievementUnlocked() ? Game.CONFIG.GENERATOR_ACHIEVEMENTS.twentyFiveGeneratorMultiplier : 1);
      const coherentBeginning = D(Game.Progression.coherentAchievementUnlocked() ? Game.CONFIG.GENERATOR_ACHIEVEMENTS.firstCoherentMultiplier : 1);
      const time = Game.Playtime.state(), fluct = Game.Energy.fluctMultiplier(), speed = Game.Time.getGameSpeed();
      const generatorAchievements = Game.Progression.generatorMultiplier();
      const disturbance = Game.CONFIG.GENERATORS.find(function (gen) { return gen.id === "energyDisturbance"; });
      const baseRate = D(disturbance.burstProduction).div(disturbance.burstInterval);
      const owned = Game.Energy.getOwned(disturbance.id), coherenceOwned = Game.Energy.getOwned("coherentEnergy");
      const oscillation = Game.FieldDynamics.multiplier();
      const clickBonus = Game.Progression.clickMultiplier().mul(Game.Progression.clickSkillMultiplier()).mul(fluct).mul(Game.Progression.energyMultiplier()).mul(oscillation);
      const focus = Game.Progression.generatorFocusMultiplier(disturbance.id), countMultiplier = Game.Energy.getCountMultiplier(disturbance.id);
      const generatorBonus = generatorAchievements.mul(fluct).mul(Game.Progression.energyMultiplier()).mul(oscillation).mul(focus).mul(countMultiplier);
      const generatorRate = Game.Energy.getProductionPerSecond();
      return {
        dynamics: {
          rules: Game.FieldDynamics.rules(),
          owned5: Game.Energy.getOwned("fieldOscillation"), owned6: Game.Energy.getOwned("fieldResonance"), owned7: Game.Energy.getOwned("fieldCoupling"),
          multiplier: oscillation, peak: Game.FieldDynamics.peak(), phase: p.fieldDynamics.elapsed,
          baseCurrent: Game.FieldDynamics.active() && !Game.FieldDynamics.peakPaused() ? Game.FieldDynamics.basePeak().pow(Game.FieldDynamics.progress()) : D(1),
          resonanceCurrent: Game.FieldDynamics.active() && !Game.FieldDynamics.peakPaused() ? Game.FieldDynamics.resonance().pow(Game.FieldDynamics.progress()) : D(1),
          resonance: Game.FieldDynamics.resonance(), coupled: Game.Energy.getCoupledFields()
        },
        time: time, speed: speed,
        prestige: { quanta: p.prestige.quanta, multiplier: Game.Progression.quantaMultiplier(), clickMultiplier: Game.Progression.clickSkillMultiplier(), energyMultiplier: Game.Progression.energySkillMultiplier(), condenseMemory: Game.Progression.condenseMemoryMultiplier() },
        focus: Game.Progression.generatorFocus(),
        timeRelevant: !speed.eq(1) || p.time.gamePlayed.sub(p.time.realPlayed).abs().gt(.01),
        achievements: { firstSparks: firstSparks, firstGenerator: firstGenerator, growingEngine: growingEngine, coherentBeginning: coherentBeginning, condense: Game.Progression.condenseMultiplier(), discoveryClicks:Game.Achievements.multiplier("clicks"), discoveryGenerators:Game.Achievements.multiplier("generators"), discoveryEnergy:Game.Achievements.multiplier("energy") },
        clicks: {
          base: D(Game.CONFIG.ENERGY.manualGain), disturb: p.upgrades.clickPower.mul(rules.gainPerLevel),
          baseTotal: Game.Progression.clickBaseGain(), bonus: clickBonus,
          ordinary: Game.Energy.baseManualGain(), captured: Game.Energy.capturedProductionGain(), echo: Game.Energy.clickOutputBonus(),
          total: Game.Energy.manualGain()
        },
        generators: {
          purchased: p.generators.energyDisturbance.purchased, added: p.generators.energyDisturbance.added, owned: owned,
          baseRate: baseRate, fieldBonus: p.fieldExcitation.baseRateBonus, purchasedMultiplier: Game.Energy.purchasedBaseMultiplier(), effective: Game.Energy.getProductionCount(disturbance.id), countMultiplier: countMultiplier, focus: focus,
          perUnit: Game.Energy.getBaseRate(disturbance),
          baseTotal: owned.mul(Game.Energy.getBaseRate(disturbance)),
          bonus: generatorBonus,
          perGameSecond: generatorRate, perRealSecond: generatorRate.mul(speed),
          cadence: D(disturbance.burstInterval).div(Game.Energy.burstInterval(disturbance)),
          burstInterval: Game.Energy.burstInterval(disturbance), smooth: owned.gte(disturbance.smoothAt),
          burstPerUnit: Game.Energy.getBaseRate(disturbance).mul(Game.Energy.burstInterval(disturbance)).mul(generatorBonus)
        },
        fluct: {
          owned: Game.Energy.getOwned("quantumFluctuation"), positive: Boolean(p.fluctuation.positive),
          multiplier: fluct, magnitude: Game.Energy.fluctMagnitude(),
          remaining: D(Game.Modifiers.getFluctuationRules().rollInterval).sub(p.fluctuation.elapsed),
          rules: Game.Modifiers.getFluctuationRules(),
          focus: Game.Progression.generatorFocusMultiplier("quantumFluctuation")
        },
        coherence: {
          owned: coherenceOwned, bonus: generatorAchievements,
          perCycle: coherenceOwned.mul(generatorAchievements).mul(Game.Progression.generatorFocusMultiplier("coherentEnergy")),
          quantum: p.resources.quantumResonance, energy: p.resources.energyResonance,
          quantumInterval: Game.Coherence.quantumInterval(), energyInterval: Game.Coherence.energyInterval(),
          softcap: Game.Coherence.quantumSoftcapState()
        },
        field: {
          owned: Game.Energy.getOwned("fieldExcitation"), bonus: generatorAchievements,
          purchasedMultiplier: Game.FieldExcitation.purchasedMultiplier(), focus: Game.Progression.generatorFocusMultiplier("fieldExcitation"),
          baseIncrease: Game.Energy.getOwned("fieldExcitation").mul(Game.CONFIG.FIELD_EXCITATION.baseRateIncrease),
          perCycle: Game.FieldExcitation.boostPerCycle(), interval: Game.FieldExcitation.interval(),
          accumulated: p.fieldExcitation.baseRateBonus
        }
      };
    }
  };
})(window.CosmicIdle);
