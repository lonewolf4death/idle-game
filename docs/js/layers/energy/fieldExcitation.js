(function (Game) {
  const D = Game.D;
  Game.FieldExcitation = {
    discovered: function () { return Game.player.unlocks.fieldExcitation === 1; },
    interval: function () { return Game.Progression.productionInterval(Game.CONFIG.FIELD_EXCITATION.interval); },
    remaining: function () {
      return Decimal.max(0, this.interval().sub(Game.player.fieldExcitation.elapsed));
    },
    nextEventIn: function () {
      return Game.Challenges.produces("fieldExcitation") && Game.Energy.getOwned("fieldExcitation").gt(0) ? this.remaining() : D(Infinity);
    },
    boostPerCycle: function () {
      if (!Game.Challenges.produces("fieldExcitation")) return D(0);
      return Game.Energy.getOwned("fieldExcitation").mul(Game.CONFIG.FIELD_EXCITATION.baseRateIncrease).mul(Game.Progression.generatorMultiplier()).mul(Game.Progression.generatorFocusMultiplier("fieldExcitation")).mul(Game.Symmetry.crossMultiplier("fieldExcitation")).mul(this.purchasedMultiplier());
    },
    purchasedMultiplier: function () { return Game.Progression.hasSkill("4-3-3") ? D(Game.CONFIG.PRESTIGE.skills["4-3-3"].fieldMultiplierPerPurchased).pow(Game.player.generators.fieldExcitation.purchased) : D(1); },
    growthPerSecond: function () { if (!Game.Challenges.produces("fieldExcitation")) return D(0);return this.boostPerCycle().div(this.interval()).mul(D(1).add(Game.Progression.hasSkill("2-4-2") && Game.Challenges.produces("coherentEnergy") && Game.Energy.getOwned("coherentEnergy").gt(0) ? D(Game.CONFIG.PRESTIGE.skills["2-4-2"].fieldSeconds).div(Game.Coherence.quantumInterval()) : 0)); },
    advance: function (gameDelta) {
      if (Game.Challenges.produces("fieldExcitation") && Game.Energy.getOwned("fieldExcitation").gt(0)) {
        Game.player.fieldExcitation.elapsed = Game.player.fieldExcitation.elapsed.add(gameDelta);
        if (Game.UI) Game.UI.streamFieldWaves(gameDelta);
      }
    },
    resolveEvents: function () {
      if (!Game.Challenges.produces("fieldExcitation") || Game.Energy.getOwned("fieldExcitation").lte(0) || this.remaining().gt(1e-12)) return;
      const state = Game.player.fieldExcitation;
      const cycles=state.elapsed.div(this.interval()).add(1e-12).floor();
      state.elapsed = Decimal.max(0, state.elapsed.sub(this.interval().mul(cycles)));
      state.baseRateBonus = state.baseRateBonus.add(this.boostPerCycle().mul(cycles));
      if (Game.UI) Game.UI.fieldFeedback();
    },
    checkUnlock: function () {
      const owned = Game.Energy.getOwned("fieldExcitation").gt(0);
      if (!this.discovered() && (owned || Game.player.fieldExcitation.baseRateBonus.gt(0) || Game.player.resources.energy.gte(Game.Energy.getGenerator("fieldExcitation").unlockEnergy))) {
        Game.player.unlocks.fieldExcitation = 1;
        Game.Save.save();
      }
      if (this.discovered()) this.showLore();
    },
    showLore: function () {
      const experience = Game.Experience;
      if (!experience || experience.fieldQueued) return;
      experience.fieldQueued = true;
      Game.CONFIG.FIELD_EXCITATION.lore.forEach(function (text, index) {
        if (!Game.player.lore[index ? "fieldSecondSeen" : "fieldFirstSeen"]) {
          experience.enqueue({ kind: "Lore · " + (index + 5).toString().padStart(2, "0"), title: "Field Excitation", text: text, fieldLesson: index + 1 });
        }
      });
    }
  };
})(window.CosmicIdle);
