(function (Game) {
  // Future mechanics can register transformations here without rewriting pricing or UI.
  Game.Modifiers = {
    fluctuationRules: [],
    // Chance transforms run after rule modifiers and permanent achievement
    // bonuses. Each receives (chance, rules, player); clamp only the final sum.
    fluctuationChanceModifiers: [],
    getFluctuationRules: function () {
      const baseRules = Object.assign({}, Game.CONFIG.FLUCTUATION);
      if (Game.Progression.hasSkill("2-2")) baseRules.rollInterval = Game.CONFIG.PRESTIGE.skills["2-2"].rollInterval;
      const rules = this.fluctuationRules.reduce(function (rules, modify) { return modify(Object.assign({}, rules)); }, baseRules);
      rules.baseRollInterval = rules.rollInterval;
      if (Game.Progression.hasSkill("2-1-2")) {
        const rebound = Game.CONFIG.PRESTIGE.skills["2-1-2"];
        rules.rollInterval = Decimal.max(rebound.minimumInterval, Game.D(rules.rollInterval).sub(Game.player.fluctuation.rollReductionStacks.mul(rebound.secondsPerNegative))).toString();
      }
      let chance = Number(rules.positiveChance);
      if (Number.isNaN(chance)) chance = Game.CONFIG.FLUCTUATION.positiveChance;
      chance += Game.Achievements.fluctBonus();
      if (Game.Progression.hasSkill("2-1")) chance += Game.CONFIG.PRESTIGE.skills["2-1"].positiveChanceBonus;
      chance = this.fluctuationChanceModifiers.reduce(function (value, modify) {
        const next = Number(modify(value, Object.assign({}, rules), Game.player));
        return Number.isNaN(next) ? value : next;
      }, chance);
      rules.positiveChance = Math.max(0, Math.min(1, chance));
      if (Game.player.fluctuation.positiveChanceMastery) rules.positiveChance = Math.max(rules.positiveChance,Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.masteryFloor);

      return rules;
    },
    clickUpgradeRules: [],
    fieldDynamicsRules: [],
    // Rules depend only on owned skills unless extension modifiers are present,
    // so reuse the last result while those skills are unchanged.
    memo: function (name, skills, build) {
      if (this[name + "Rules"].length) return build();
      const key = skills.map(function (id) { return Game.Progression.hasSkill(id) ? 1 : 0; }).join("");
      const cached = this["_" + name];
      if (cached && cached.key === key) return Object.assign({}, cached.rules);
      const rules = build();
      this["_" + name] = { key: key, rules: rules };
      return Object.assign({}, rules);
    },
    getFieldDynamicsRules: function () {
      return this.memo("fieldDynamics", ["3-2-3", "3-1", "3-4-1"], this.buildFieldDynamicsRules.bind(this));
    },
    buildFieldDynamicsRules: function () {
      const rules = Object.assign({}, Game.CONFIG.FIELD_DYNAMICS);
      if (Game.Progression.hasSkill("3-2-3")) { rules.cycle = Game.CONFIG.PRESTIGE.skills["3-2-3"].cycle; rules.rise = Game.D(rules.cycle).sub(Game.D(Game.CONFIG.FIELD_DYNAMICS.cycle).sub(Game.CONFIG.FIELD_DYNAMICS.rise)).toString(); }
      if (Game.Progression.hasSkill("3-1")) rules.rise = Game.D(rules.cycle).sub(Game.CONFIG.PRESTIGE.skills["3-1"].peakSeconds).toString();
      if (Game.Progression.hasSkill("3-4-1")) rules.resonancePerUnit = Game.CONFIG.PRESTIGE.skills["3-4-1"].resonancePerUnit;
      return this.fieldDynamicsRules.reduce(function (value, modify) { return modify(Object.assign({}, value)); }, rules);
    },
    coherenceRules: [],
    getCoherenceRules: function () {
      const rules = this.memo("coherence", ["4-4-1", "4-1", "2-3-1", "2-3-2", "2-3-3"], this.buildCoherenceRules.bind(this));
      rules.quantumSoftcap = Object.assign({}, rules.quantumSoftcap);
      return rules;
    },
    buildCoherenceRules: function () {
      const rules = Object.assign({}, Game.CONFIG.COHERENCE);
      rules.quantumSoftcap = Object.assign({}, rules.quantumSoftcap);
      if (Game.Progression.hasSkill("4-4-1")) rules.quantumSoftcap.start = Game.CONFIG.PRESTIGE.skills["4-4-1"].softcapStart;
      if (Game.Progression.hasSkill("4-1")) rules.quantumSoftcap.stepFactor = Game.CONFIG.PRESTIGE.skills["4-1"].softcapStepFactor;
      if (Game.Progression.hasSkill("2-3-1")) rules.quantumSlowdownSeconds = Game.CONFIG.PRESTIGE.skills["2-3-1"].quantumSlowdownSeconds;
      if (Game.Progression.hasSkill("2-3-2")) rules.energyInterval = Game.CONFIG.PRESTIGE.skills["2-3-2"].energyInterval;
      if (Game.Progression.hasSkill("2-3-3")) rules.quantumSlowdownEvery = Game.CONFIG.PRESTIGE.skills["2-3-3"].quantumSlowdownEvery;
      return this.coherenceRules.reduce(function (value, modify) { return modify(Object.assign({}, value)); }, rules);
    },
    getClickUpgradeRules: function () {
      return this.clickUpgradeRules.reduce(function (rules, modify) {
        return modify(Object.assign({}, rules));
      }, Object.assign({}, Game.CONFIG.CLICK_UPGRADE));
    }
  };
})(window.CosmicIdle);
