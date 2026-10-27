(function (Game) {
  const D = Game.D;
  Game.Coherence = {
    rules: function () { return Game.Modifiers.getCoherenceRules(); },
    energyInterval: function () { return Game.Progression.productionInterval(this.rules().energyInterval); },
    quantumSoftcapState: function (amount) {
      const raw = amount === undefined ? Game.player.resources.quantumResonance : D(amount);
      const rules = this.rules().quantumSoftcap;
      const start = D(rules.start);
      let threshold = start, effectiveAtThreshold = threshold;
      if (raw.lt(threshold)) return { effective: raw, power: D(1), active: false, threshold: threshold, next: threshold };
      const factor = D(rules.stepFactor);
      for (let i = 0; i < rules.powers.length; i++) {
        // Derive thresholds from one anchor so repeated multiplication does not
        // delay a tier at exact values such as 8,100 with ×3 spacing.
        const power = D(rules.powers[i]), next = start.mul(factor.pow(i + 1));
        const last = i === rules.powers.length - 1;
        if (last || raw.lt(next)) {
          // Anchor each interval to the previous one, preserving continuity.
          return { effective: effectiveAtThreshold.mul(raw.div(threshold).pow(power.toNumber())), power: power, active: true, threshold: threshold, next: last ? null : next };
        }
        effectiveAtThreshold = effectiveAtThreshold.mul(factor.pow(power.toNumber()));
        threshold = next;
      }
    },
    discovered: function () {
      return Game.Energy.getOwned("coherentEnergy").gt(0) || Game.player.lore.coherenceSeen === 1 ||
        Game.player.resources.quantumResonance.gt(0) || Game.player.resources.energyResonance.gt(0);
    },
    quantumInterval: function () {
      const config = this.rules();
      return Game.Progression.productionInterval(D(config.quantumInterval).add(Game.player.stats.totalQuantumResonance.div(config.quantumSlowdownEvery).floor().mul(config.quantumSlowdownSeconds)));
    },
    outputPerCycle: function () { return Game.Energy.getOwned("coherentEnergy").mul(Game.Progression.generatorMultiplier()).mul(Game.Progression.generatorFocusMultiplier("coherentEnergy")); },
    energyPerSecond: function () { return this.outputPerCycle().mul(D(1).div(this.energyInterval()).add(Game.Progression.hasSkill("2-4-1") ? D(1).div(this.quantumInterval()) : 0)); },
    grantOutput: function (kind, amount) {
      const state = Game.player.coherence, carryKey = kind === "quantumResonance" ? "quantumCarry" : "energyCarry";
      const total = D(amount).add(state[carryKey]), produced = total.add(1e-12).floor();
      state[carryKey] = Decimal.max(0, total.sub(produced));
      Game.player.resources[kind] = Game.player.resources[kind].add(produced);
      if (kind === "quantumResonance") Game.player.stats.totalQuantumResonance = Game.player.stats.totalQuantumResonance.add(produced);
      else Game.Energy.addGenerators("energyDisturbance", produced);
      return produced;
    },
    quantumRemaining: function () {
      return Decimal.max(0, this.quantumInterval().sub(Game.player.coherence.quantumElapsed));
    },
    energyRemaining: function () {
      return Decimal.max(0, this.energyInterval().sub(Game.player.coherence.energyElapsed));
    },
    nextEventIn: function () {
      if (Game.Energy.getOwned("coherentEnergy").lte(0)) return D(Infinity);
      return Decimal.min(this.quantumRemaining(), this.energyRemaining());
    },
    advance: function (gameDelta) {
      if (Game.Energy.getOwned("coherentEnergy").lte(0)) return;
      Game.player.coherence.quantumElapsed = Game.player.coherence.quantumElapsed.add(gameDelta);
      Game.player.coherence.energyElapsed = Game.player.coherence.energyElapsed.add(gameDelta);
    },
    resolveEvents: function () {
      const owned = Game.Energy.getOwned("coherentEnergy");
      if (owned.lte(0)) return;
      const state = Game.player.coherence;
      const interval = this.quantumInterval();
      if (state.quantumElapsed.add(1e-12).gte(interval)) {
        state.quantumElapsed = Decimal.max(0, state.quantumElapsed.sub(interval));
        const produced = this.grantOutput("quantumResonance", this.outputPerCycle());
        if (Game.Progression.hasSkill("2-4-1")) this.grantOutput("energyResonance", produced);
        if (Game.Progression.hasSkill("2-4-2") && Game.Energy.getOwned("fieldExcitation").gt(0)) Game.player.fieldExcitation.elapsed = Game.player.fieldExcitation.elapsed.add(Game.CONFIG.PRESTIGE.skills["2-4-2"].fieldSeconds);
        if (Game.UI) Game.UI.resonanceFeedback("quantumResonance");
      }
      if (state.energyElapsed.add(1e-12).gte(this.energyInterval())) {
        state.energyElapsed = Decimal.max(0, state.energyElapsed.sub(this.energyInterval()));
        this.grantOutput("energyResonance", this.outputPerCycle());
        if (Game.UI) Game.UI.resonanceFeedback("energyResonance");
      }
    },
    showLore: function () {
      if (Game.player.lore.coherenceSeen || Game.Experience.coherenceQueued) return;
      Game.Experience.coherenceQueued = true;
      Game.Experience.enqueue({ kind: "Lore · 04", title: "Coherent Energy", text: Game.CONFIG.COHERENCE.lore, coherence: true });
    }
  };
})(window.CosmicIdle);
