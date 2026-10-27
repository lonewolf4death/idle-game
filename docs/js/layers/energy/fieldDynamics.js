(function (Game) {
  const D = Game.D;
  Game.FieldDynamics = {
    rules: function () { return Game.Modifiers.getFieldDynamicsRules(); },
    active: function () { return Game.Challenges.produces("fieldOscillation") && Game.Energy.getOwned("fieldOscillation").gt(0); },
    freezeEnabled: function () { return Game.Progression.hasSkill("3-2-1") && Game.player.settings.oscillationFreeze === 1; },
    freezeAt: function () { return D(this.rules().rise).sub(Game.CONFIG.PRESTIGE.skills["3-2-1"].freezeBeforePeak); },
    held: function () { return this.active() && this.freezeEnabled() && Game.player.fieldDynamics.held === 1; },
    peakPaused: function () { return this.active() && Game.Progression.hasSkill("3-2-2") && !Game.player.fluctuation.positive && Game.player.fieldDynamics.elapsed.gte(this.rules().rise); },
    toggleFreeze: function () {
      if (!Game.Progression.hasSkill("3-2-1")) return false;
      Game.player.settings.oscillationFreeze = Number(!Game.player.settings.oscillationFreeze);
      if (!this.freezeEnabled()) Game.player.fieldDynamics.held = 0;
      this.resolveEvents();Game.Save.save();if (Game.UI) Game.UI.render();return true;
    },
    releasePeak: function () {
      if (!this.held()) return false;
      Game.player.fieldDynamics.held = 0;
      Game.player.fieldDynamics.elapsed = D(this.rules().rise);
      if (Game.UI) {
        Game.UI.dynamicsFeedback("fieldOscillation");
        if (Game.Energy.getOwned("fieldResonance").gt(0)) Game.UI.dynamicsFeedback("fieldResonance");
      }
      return true;
    },
    resonance: function () { return D(this.rules().resonancePerUnit).pow(Game.Energy.getProductionCount("fieldResonance")).mul(Game.Challenges.produces("fieldResonance") && Game.Energy.getOwned("fieldResonance").gt(0) ? Game.Progression.generatorFocusMultiplier("fieldResonance") : 1); },
    basePeak: function () { return D(this.rules().peakPerOscillation).pow(Game.Energy.getOwned("fieldOscillation")).mul(Game.Progression.generatorFocusMultiplier("fieldOscillation")); },
    peak: function () { return this.active() ? this.basePeak().mul(this.resonance()) : D(1); },
    progress: function (offset) { return Math.min(1, Game.player.fieldDynamics.elapsed.add(this.held() ? 0 : offset || 0).div(this.rules().rise).toNumber()); },
    multiplierAt: function (offset) { return this.peakPaused() ? D(1) : this.peak().pow(this.progress(offset)); },
    multiplier: function () { return this.multiplierAt(0); },
    averageMultiplier: function (delta, power, extraSlope) {
      // Energy.tick splits at peak/reset boundaries. Integrate the exponential
      // exactly inside each segment instead of sampling its start or endpoint.
      power=power===undefined?1:power;
      const rising=this.active() && !this.peakPaused() && !this.held() && Game.player.fieldDynamics.elapsed.lt(this.rules().rise);
      const slope=(rising ? this.peak().log10()*power/Number(this.rules().rise) : 0)+(extraSlope||0);
      const x=slope*Math.LN10*D(delta).toNumber();
      if (Math.abs(x) < 1e-7) return this.multiplier().pow(power).mul(x === 0 ? 1 : Math.expm1(x) / x);
      return this.multiplier().pow(power).mul(D(10).pow(x / Math.LN10).sub(1).div(x));
    },
    nextEventIn: function () {
      if (!this.active()) return D(Infinity);
      if (this.held() || this.peakPaused()) return D(Infinity);
      const elapsed = Game.player.fieldDynamics.elapsed, rules = this.rules();
      if (this.freezeEnabled() && elapsed.lt(rules.rise)) return Decimal.max(0, this.freezeAt().sub(elapsed));
      return D(elapsed.lt(rules.rise) ? rules.rise : rules.cycle).sub(elapsed);
    },
    advance: function (delta) { if (this.active() && !this.held() && !this.peakPaused()) Game.player.fieldDynamics.elapsed = Game.player.fieldDynamics.elapsed.add(delta); },
    resolveEvents: function () {
      if (!this.active() && Game.Challenges.active(6)) return;
      if (!this.active()) { Game.player.fieldDynamics.elapsed = D(0);Game.player.fieldDynamics.held = 0;return; }
      const elapsed = Game.player.fieldDynamics.elapsed, rules = this.rules();
      if (!this.freezeEnabled()) Game.player.fieldDynamics.held = 0;
      if (this.freezeEnabled() && elapsed.lt(rules.rise) && elapsed.add(1e-12).gte(this.freezeAt())) {
        Game.player.fieldDynamics.elapsed = this.freezeAt();Game.player.fieldDynamics.held = 1;return;
      }
      if (this.peakPaused()) return;
      if (elapsed.add(1e-12).gte(rules.cycle)) { Game.player.fieldDynamics.elapsed = D(0);Game.player.fieldDynamics.held = 0; }
      else if (elapsed.eq(rules.rise) && Game.UI) {
        Game.UI.dynamicsFeedback("fieldOscillation");
        if (Game.Energy.getOwned("fieldResonance").gt(0)) Game.UI.dynamicsFeedback("fieldResonance");
      }
    }
  };
})(window.CosmicIdle);
