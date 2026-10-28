(function (Game) {
  const D = Game.D;
  Game.Progression = {
    keepDisturbMaxed: function (player) {
      const p = player || Game.player;
      if (p.achievements.allChallenges) p.upgrades.clickPower = D(Game.Modifiers.getClickUpgradeRules().maxLevel);
    },
    // Latch run-based achievements before saving or replacing the current run.
    // Getters remain read-only so the Stats screen never changes player state.
    captureAchievements: function (player) {
      const p = player || Game.player, a = p.achievements;
      Game.Symmetry.captureUpgradePricing(p);
      a.firstSparks = Number(Boolean(a.firstSparks || p.stats.generatorsBought.gte(1)));
      a.firstGenerator = Number(Boolean(a.firstGenerator || p.stats.generatorsBought.gte(10)));
      a.growingEngine = Number(Boolean(a.growingEngine || p.generators.energyDisturbance.purchased.gte(25)));
      a.coherentBeginning = Number(Boolean(a.coherentBeginning || p.generators.coherentEnergy.purchased.gte(1)));
      a.condense = Number(Boolean(a.condense || p.prestige.times.gt(0)));
      Game.Achievements.capture(p, false);
      const state=p.fluctuation;
      state.negativeStreakLevel=Math.max(Game.Achievements.fluctLevel(p), Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.tiers.filter(function (tier) { return state.negativeStreak>=tier.rolls; }).length);
      if (state.positiveChanceMastery) state.negativeStreakLevel=Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.tiers.length;
      state.negativeStreakAchievement=Number(state.negativeStreakLevel>0);
      if (p.stats.manualClicks.gt(0)) p.lore.clickSeen = 1;
      if (p.stats.generatorsBought.gt(0)) p.lore.generatorSeen = 1;
    },
    firstGeneratorAchievementUnlocked: function () {
      return Boolean(Game.player.achievements.firstGenerator || Game.player.stats.generatorsBought.gte(1));
    },
    growingEngineAchievementUnlocked: function () {
      return Boolean(Game.player.achievements.growingEngine || Game.player.generators.energyDisturbance.purchased.gte(25));
    },
    condenseAchievementUnlocked: function () {
      return Boolean(Game.player.achievements.condense || Game.player.prestige.times.gt(0));
    },
    condenseMultiplier: function () {
      return D(this.condenseAchievementUnlocked() ? Game.CONFIG.PRESTIGE.achievementMultiplier : 1);
    },
    quantaMultiplier: function (amount) {
      return this.quantaBonusState(amount).multiplier;
    },
    quantaBonusState: function (amount) {
      const rules=Game.CONFIG.PRESTIGE, key=rules.quantaEnergyBase+"|"+rules.quantaSoftcapMultiplier;
      if (!this._quantaCap || this._quantaCap.key!==key) {
        const base=D(rules.quantaEnergyBase), cap=D(rules.quantaSoftcapMultiplier);
        this._quantaCap={key:key,base:base,cap:cap,threshold:D(cap.log10()).div(base.log10())};
      }
      const cached=this._quantaCap, basis=amount===undefined ? this.bonusQuanta() : D(amount), active=basis.gte(cached.threshold);
      // Match the exponential at the boundary, then grow linearly in Quanta:
      // ten times the bonus basis gives ten times the capped multiplier.
      // Avoid evaluating the uncapped exponential for enormous balances.
      if (Game.Challenges.permanentBonusesDisabled()) return {basis:basis,threshold:cached.threshold,cap:cached.cap,active:false,suppressed:true,multiplier:D(1)};
      return { basis:basis, threshold:cached.threshold, cap:cached.cap, active:active, multiplier:active ? cached.cap.mul(basis.div(cached.threshold)) : cached.base.pow(basis) };
    },
    bonusQuanta: function () { return Decimal.max(Game.player.prestige.quanta, this.hasSkill("4-4-2") ? Game.player.prestige.totalQuanta.div(2) : 0); },
    hasSkill: function (id) { return Game.player.prestige.skills[id] === 1; },
    energySkillMultiplier: function () {
      return D(this.hasSkill("4-2") ? Game.CONFIG.PRESTIGE.skills["4-2"].energyMultiplier : 1);
    },
    condenseMemoryMultiplier: function () {
      return this.hasSkill("0-0") && !Game.Challenges.permanentBonusesDisabled() ? D(Game.CONFIG.PRESTIGE.skills["0-0"].energyPerCondense).pow(this.effectiveCondenses()) : D(1);
    },
    effectiveCondenses: function () { return Game.player.prestige.times.mul(this.hasSkill("4-3-1") ? Game.CONFIG.PRESTIGE.skills["4-3-1"].condenseCountMultiplier : 1); },
    productionInterval: function (base) { return Decimal.max(1, D(base).sub(this.hasSkill("4-3-2") ? Game.CONFIG.PRESTIGE.skills["4-3-2"].intervalReduction : 0)); },
    generatorFocus: function () {
      const active = this.hasSkill("3-3"), rules = Game.CONFIG.PRESTIGE.skills["3-3"];
      const index = active ? Math.floor(Game.player.generatorFocus.elapsed.div(rules.focusSeconds).toNumber()) % Game.CONFIG.GENERATORS.length : 0;
      const count = active && this.hasSkill("3-4-3") ? Game.CONFIG.PRESTIGE.skills["3-4-3"].focusCount : 1;
      const generators = Array.from({length: count}, function (_, offset) { return Game.CONFIG.GENERATORS[(index + offset) % Game.CONFIG.GENERATORS.length]; });
      return { active: active, index: index, generator: generators[0], generators: generators, multiplier: D(active ? this.hasSkill("3-4-3") ? Game.CONFIG.PRESTIGE.skills["3-4-3"].generatorMultiplier : rules.generatorMultiplier : 1), remaining: active ? D(rules.focusSeconds).sub(Game.player.generatorFocus.elapsed.sub(D(rules.focusSeconds).mul(index))) : D(Infinity) };
    },
    generatorFocusMultiplier: function (id) {
      const focus = this.generatorFocus();
      return focus.active && focus.generators.some(function (gen) { return gen.id === id; }) ? focus.multiplier : D(1);
    },
    advanceGeneratorFocus: function (delta) {
      if (!this.hasSkill("3-3")) return;
      const cycle = D(Game.CONFIG.PRESTIGE.skills["3-3"].focusSeconds).mul(Game.CONFIG.GENERATORS.length);
      const state = Game.player.generatorFocus;
      const boundary = D(Math.floor(state.elapsed.div(Game.CONFIG.PRESTIGE.skills["3-3"].focusSeconds).toNumber()) + 1).mul(Game.CONFIG.PRESTIGE.skills["3-3"].focusSeconds);
      state.elapsed = state.elapsed.add(delta);
      if (state.elapsed.add(1e-12).gte(boundary)) state.elapsed = boundary;
      if (state.elapsed.add(1e-12).gte(cycle)) state.elapsed = D(0);
    },
    fluctOddsVisible: function () { return this.hasSkill("2-1") || Game.player.unlocks.fluctOdds === 1; },
    clickSkillMultiplier: function () {
      return D(this.hasSkill("1-1") ? Game.CONFIG.PRESTIGE.skills["1-1"].clickMultiplier : 1);
    },
    fluctStreakAchievementUnlocked: function () {
      return Game.Achievements.fluctLevel()>0;
    },
    achievementUnlocked: function () {
      return Boolean(Game.player.achievements.firstSparks || Game.player.stats.manualClicks.gte(Game.CONFIG.CLICK_ACHIEVEMENT.requiredClicks));
    },
    clickMultiplier: function () {
      return D(this.achievementUnlocked() ? Game.CONFIG.CLICK_ACHIEVEMENT.multiplier : 1)
        .mul(this.firstGeneratorAchievementUnlocked() ? Game.CONFIG.GENERATOR_ACHIEVEMENTS.firstClickMultiplier : 1).mul(Game.Achievements.multiplier("clicks"));
    },
    generatorMultiplier: function () {
      return D(this.growingEngineAchievementUnlocked() ? Game.CONFIG.GENERATOR_ACHIEVEMENTS.twentyFiveGeneratorMultiplier : 1)
        .mul(this.coherentAchievementUnlocked() ? Game.CONFIG.GENERATOR_ACHIEVEMENTS.firstCoherentMultiplier : 1).mul(Game.Achievements.multiplier("generators"));
    },
    coherentAchievementUnlocked: function () {
      return Boolean(Game.player.achievements.coherentBeginning || Game.player.generators.coherentEnergy.purchased.gte(1));
    },
    energyMultiplier: function () {
      return Game.Playtime.state().multiplier.mul(this.condenseMultiplier()).mul(this.quantaMultiplier()).mul(this.energySkillMultiplier()).mul(this.condenseMemoryMultiplier()).mul(Game.Achievements.multiplier("energy"));
    },
    playtimeAchievementUnlocked: function () {
      return Game.Playtime.state().level > 0;
    },
    clickBaseGain: function () {
      const rules = Game.Modifiers.getClickUpgradeRules();
      return D(Game.CONFIG.ENERGY.manualGain).add(Game.player.upgrades.clickPower.mul(rules.gainPerLevel));
    },
    upgradePricing: function () {
      const rules = Game.Modifiers.getClickUpgradeRules();
      const key = JSON.stringify(rules);
      if (this._pricing && this._pricing.key === key) return this._pricing;
      const costs = [D(rules.baseCost)];
      for (let level = 0; level < rules.maxLevel; level++) {
        const tier = Math.floor(level / rules.scalingStepLevels);
        const scale = D(rules.initialScaling).add(D(rules.scalingStepIncrease).mul(tier));
        costs.push(costs[level].mul(scale));
      }
      this._pricing = { key: key, costs: costs, rules: rules };
      return this._pricing;
    },
    upgradeCost: function () {
      const pricing = this.upgradePricing();
      const level = Game.player.upgrades.clickPower.toNumber();
      return pricing.costs[Math.min(level, pricing.rules.maxLevel)].mul(Game.Challenges.priceMultiplier());
    },
    affordableClickLevels: function () {
      return this.quoteClickUpgrade("max").gain.toNumber();
    },
    quoteClickUpgrade: function (amount) {
      const pricing = this.upgradePricing();
      const start = Game.player.upgrades.clickPower.toNumber();
      const limit = amount === "max" ? pricing.rules.maxLevel : Math.min(pricing.rules.maxLevel, Number(amount));
      const quantity=Game.Challenges.purchaseQuantity().toNumber(),price=Game.Challenges.priceMultiplier();
      let cost = D(0), count = 0, gain=0;
      while (count<limit && start+gain<pricing.rules.maxLevel) {
        const nextCost = cost.add(pricing.costs[start+gain].mul(price));
        if (Game.player.resources.energy.lt(nextCost)) break;
        cost = nextCost;
        count++;
        gain+=Math.min(quantity,pricing.rules.maxLevel-start-gain);
      }
      return { count: D(count), gain:D(gain), cost: cost };
    },
    buyClickUpgrade: function (amount) {
      const quote = this.quoteClickUpgrade(amount || 1);
      if (quote.count.lte(0)) return false;
      Game.player.resources.energy = Game.player.resources.energy.sub(quote.cost);
      Game.player.upgrades.clickPower = Game.player.upgrades.clickPower.add(quote.gain);
      Game.Challenges.afterPurchase("clickPower");
      Game.Achievements.capture(Game.player, true);
      if (Game.Energy.getOwned("fieldCoupling").gt(0) && Game.UI) Game.UI.dynamicsFeedback("fieldCoupling");
      return true;
    },
    // Work in exponent space, without converting enormous resources to native numbers.
    milestoneProgress: function () {
      const goal = D(Game.CONFIG.PROGRESSION.prestigeEnergy);
      const total = Game.player.resources.energy;
      if (total.gte(goal)) return 1;
      return Math.max(0, Math.min(1, total.add(1).log10() / goal.add(1).log10()));
    },
    sparkAppearance: function () {
      const strength=Math.log10(1+Math.max(0,Game.Energy.getProductionPerSecond().add(1).log10()));
      return {size:Math.min(180,28+strength*50),opacity:Math.min(.7,.3+strength*.12)};
    }
  };
  Game.Achievements = {
    matches: function (definition, player) {
      const p=player||Game.player;
      if(definition.kind==='patterns') return Game.Patterns.total(p)>=Number(definition.amount);
      if(definition.kind==='stabilizations') return p.structure.stabilizations.gte(definition.amount);
      if(definition.kind==='challenge') return p.automation.buyers[Game.CONFIG.AUTOMATION.buyers[definition.track-1].id].level>=1;
      if(definition.kind==='allChallenges') return Game.CONFIG.AUTOMATION.buyers.every(function (b) { return p.automation.buyers[b.id].level>=1; });
      const amount=definition.kind==="purchased" ? p.generators[definition.generator].purchased : definition.kind==="clicks" ? p.stats.manualClicks : definition.kind==="autoClicks" ? p.stats.autoClicks : p.upgrades.clickPower;
      const required=definition.amount==="max" ? Game.Modifiers.getClickUpgradeRules().maxLevel : definition.amount;
      return definition.exact ? amount.eq(required) : amount.gte(required);
    },
    rewardText: function (definition) { if(definition.reward==='none') return 'Milestone only · no production reward';if(definition.reward==='power') return 'All Energy gains raised to '+definition.multiplier+' (generator rate per game second)';return "×"+definition.multiplier+" "+({clicks:"click Energy",generators:"generator production",energy:"all Energy"}[definition.reward]); },
    capture: function (player, notify) {
      const p=player||Game.player;
      Game.CONFIG.DISCOVERY_ACHIEVEMENTS.forEach(function (definition) {
        if (!p.achievements[definition.id] && Game.Achievements.matches(definition,p)) {
          p.achievements[definition.id]=1;
          if (notify && Game.UI) Game.UI.notifyAchievement(definition.name,Game.Achievements.rewardText(definition));
        }
      });
      Game.Progression.keepDisturbMaxed(p);
    },
    multiplier: function (kind) {
      return Game.CONFIG.DISCOVERY_ACHIEVEMENTS.reduce(function (product, definition) { return product.mul(definition.reward===kind && Game.player.achievements[definition.id] ? definition.multiplier : 1); },D(1));
    },
    entries: function (kind) { return Game.CONFIG.DISCOVERY_ACHIEVEMENTS.filter(function (definition) { return definition.reward==="energy" || definition.reward===kind; }).map(function (definition) { return {id:definition.id,label:definition.name,factor:D(Game.player.achievements[definition.id]?definition.multiplier:1)}; }); },
    fluctLevel: function (player) { const state=(player||Game.player).fluctuation;return Math.max(state.negativeStreakLevel||0,state.negativeStreakAchievement?1:0); },
    fluctBonus: function (player) { const level=this.fluctLevel(player);return Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.tiers.slice(0,level).reduce(function (sum,tier) { return sum+tier.bonus; },0); },
    grantFluctLevel: function (level, notify) {
      const old=this.fluctLevel(), state=Game.player.fluctuation;
      state.negativeStreakLevel=Math.max(old,level);state.negativeStreakAchievement=Number(state.negativeStreakLevel>0);
      if (level>old && notify && Game.UI) Game.UI.notifyAchievement("Against the current · Level "+level,"+"+Math.round(this.fluctBonus()*100)+" percentage points positive Fluct chance in total.");
    },
    checkFluctMastery: function () {
      const state=Game.player.fluctuation, rules=Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT;
      if (!state.positiveChanceMastery && Game.Modifiers.getFluctuationRules().positiveChance>rules.masteryThreshold+1e-12) {
        state.positiveChanceMastery=1;this.grantFluctLevel(rules.tiers.length,false);
        if (Game.UI) Game.UI.notifyAchievement("Against the current · Complete","All levels unlocked · +10 percentage points positive chance. Positive Fluct chance is now at least 80%.");
      }
    }
  };
})(window.CosmicIdle);
