(function (Game) {
  const D = Game.D;
  // A repeating musical phrase, not a fixed buy-N threshold. Only paid units
  // complete a pattern; generated units receive its strength without its cost.
  Game.Patterns = {
    state: function (purchased) {
      const n=D(purchased).toNumber(), lengths=Game.CONFIG.STRUCTURE.patterns;
      const cycle=lengths.reduce(function (a,b) { return a+b; },0);
      const rounds=Math.floor(n/cycle);let offset=n-rounds*cycle,index=0;
      while(index<lengths.length-1 && offset>=lengths[index]) { offset-=lengths[index];index++; }
      return {index:rounds*lengths.length+index,position:offset,size:lengths[index],remaining:lengths[index]-offset};
    },
    forGenerator: function (id) { return this.state(Game.player.generators[id].purchased); },
    ownMultiplier: function (id) { return D(Game.Energy.getGenerator(id).patternStrength).pow(this.forGenerator(id).index); },
    echoMultiplier: function (id) {
      const index=Game.CONFIG.GENERATORS.findIndex(function (gen) { return gen.id===id; }),next=Game.CONFIG.GENERATORS[index+1];
      return next ? D(Game.CONFIG.STRUCTURE.echoStrength).pow(this.forGenerator(next.id).index) : D(1);
    },
    multiplier: function (id) { return this.ownMultiplier(id).mul(this.echoMultiplier(id)); },
    total: function (player) { const p=player||Game.player;return Game.CONFIG.GENERATORS.reduce(function (n,g) { return n+Game.Patterns.state(p.generators[g.id].purchased).index; },0); },
    price: function (gen,purchased) {
      const pattern=this.state(purchased===undefined?Game.player.generators[gen.id].purchased:purchased);
      const late=Math.max(0,pattern.index-(Game.CONFIG.STRUCTURE.latePatternStart||32));
      return D(gen.baseCost).mul(D(gen.patternCostGrowth).pow(Math.pow(pattern.index,Game.CONFIG.STRUCTURE.pricePower||1))).mul(D(10).pow(late*late*(Game.CONFIG.STRUCTURE.latePatternResistance||0))).mul(Game.Challenges.priceMultiplier());
    },
    quote: function (id,amount) {
      const gen=Game.Energy.getGenerator(id),zero={count:D(0),cost:D(0),gain:D(0)};
      if(!Game.Energy.generatorEnabled(gen)) return zero;
      let n=Game.player.generators[id].purchased.toNumber(),count=0,cost=D(0),pattern=this.state(n);
      const max=amount==='max',requested=max?Infinity:amount==='pattern'?pattern.remaining:Number(amount===undefined?1:amount);
      if(!max && (!Number.isSafeInteger(requested) || requested<=0 || requested>1000)) return zero;
      const allowed=Game.Challenges.purchaseLimit(id),limit=max?allowed:requested;
      if(!(limit>0)) return zero;
      const budget=Game.player.resources.energy;
      if(!max) {
        while(count<limit) {
          pattern=this.state(n);
          const take=Math.min(pattern.remaining,limit-count);
          cost=cost.add(this.price(gen,n).mul(take));count+=take;n+=take;
        }
        const affordable=requested<=allowed && cost.lte(budget);
        return {count:D(affordable?requested:0),requested:D(requested),cost:cost,gain:D(affordable?requested:0).mul(Game.Challenges.purchaseQuantity())};
      }
      while(count<limit) {
        pattern=this.state(n);
        const price=this.price(gen,n),space=Math.min(pattern.remaining,limit-count);
        if(!price.gt(0) || !Number.isFinite(price.exponent) || !Number.isFinite(price.mantissa)) break;
        let take=Math.min(space,Math.max(0,budget.sub(cost).div(price).floor().toNumber()));
        if(take>0 && cost.add(price.mul(take)).gt(budget)) take--;
        if(take<space && cost.add(price.mul(take+1)).lte(budget)) take++;
        if(take<=0) break;
        cost=cost.add(price.mul(take));count+=take;n+=take;
        if(take<space) break;
      }
      return {count:D(count),requested:D(count || 1),cost:count?cost:this.price(gen),gain:D(count).mul(Game.Challenges.purchaseQuantity())};
    },
    completed: function (gen,before) {
      const crossed=this.forGenerator(gen.id).index-before;
      if(crossed<=0) return;
      Game.Achievements.capture(Game.player,true);
      if(Game.StructureUI && !(Game.Loop && Game.Loop.catchingUp)) Game.StructureUI.patternFeedback(gen,crossed);
    }
  };

  Game.Structure = {
    unlocked: function (gen,player) {
      const p=player||Game.player,index=Game.CONFIG.GENERATORS.indexOf(gen);
      return index<3 || index>=7 || p.structure.stabilizations.gte(index-2) || p.generators[gen.id].purchased.add(p.generators[gen.id].added).gt(0);
    },
    multiplier: function () { return D(Game.CONFIG.STRUCTURE.strengthPerStabilization).pow(Game.player.structure.stabilizations); },
    condenseMemory: function () { return D(2).pow(Decimal.min(8,Game.Progression.effectiveCondenses())); },
    goal: function () { const n=Game.player.structure.stabilizations.toNumber();return {energy:D(10).pow(n<4?6+4*n+n*n:100*Math.pow(4,n-4)),patterns:8+4*n,quantum:D(25).mul(D(3).pow(n))}; },
    canStabilize: function () {
      if(Game.Challenges.active()) return false;
      const goal=this.goal();return Game.player.resources.energy.gte(goal.energy) && Game.Patterns.total()>=goal.patterns && Game.player.resources.quantumResonance.gte(goal.quantum);
    },
    seed: function (fresh) {
      // Normal runs rebuild Stabilization from zero. Challenge runs retain
      // their structural access because Stabilization is unavailable there.
      fresh.structure.stabilizations=D(fresh.challenges.active?4:0);
      fresh.resources.energy=Decimal.max(fresh.resources.energy,Game.CONFIG.IDLE_FLOW.startingEnergy);
    },
    advance: function (realSeconds) {
      const state=Game.player.structure;state.elapsed+=realSeconds;
      state.bestEnergy=Decimal.max(state.bestEnergy,Game.player.resources.energy);
      if(state.recoveryTarget.gt(0) && !state.recovered && Game.player.resources.energy.gte(state.recoveryTarget)) { state.recovered=1;state.recoverySeconds=state.elapsed; }
    },
    stabilize: function () {
      if(!this.canStabilize()) return false;
      const old=Game.player,next=old.structure.stabilizations.add(1),high=Decimal.max(old.structure.bestEnergy,old.resources.energy);
      Game.Progression.captureAchievements(old);
      if(Game.Coherence.discovered()) old.lore.coherenceSeen=1;
      if(Game.FieldExcitation.discovered()) old.lore.fieldFirstSeen=old.lore.fieldSecondSeen=1;
      const fresh=Game.createDefaultPlayer();
      fresh.achievements=old.achievements;fresh.lore=old.lore;fresh.prestige=old.prestige;
      fresh.settings=old.settings;fresh.ui=old.ui;
      fresh.time=old.time; // This is still the same Condense run and real-time rate.
      ['negativeStreakAchievement','negativeStreakLevel','positiveChanceMastery'].forEach(function (key) { fresh.fluctuation[key]=old.fluctuation[key]; });
      Game.Automation.preserve(old,fresh);
      fresh.structure.stabilizations=next;fresh.structure.bestEnergy=high;fresh.structure.recoveryTarget=high;
      fresh.resources.energy=D(Game.CONFIG.IDLE_FLOW.startingEnergy);
      if(fresh.prestige.skills['3-2']) fresh.generators.fieldOscillation.added=D(Game.CONFIG.PRESTIGE.skills['3-2'].startingOscillations);
      if(fresh.prestige.skills['3-4-2']) fresh.generators.fieldCoupling.added=D(Game.CONFIG.PRESTIGE.skills['3-4-2'].startingCouplings);
      Game.player=fresh;
      Game.Achievements.capture(fresh,true);
      if(Game.Loop) { Game.Loop.accumulator=0;Game.Loop.lastTime=performance.now(); }
      if(Game.Experience) Game.Experience.syncPlayer();
      const first=!fresh.lore.stabilizationSeen;fresh.lore.stabilizationSeen=1;
      if(first && Game.Experience) Game.Experience.enqueue({kind:'Lore · Stabilization',title:'A pattern remembered',text:Game.CONFIG.STRUCTURE.lore});
      Game.Save.save();
      if(Game.StructureUI) Game.StructureUI.stabilizationFeedback();
      if(Game.UI) Game.UI.render();
      return true;
    }
  };
  // Keep the roles of the existing generators, with one shared investment
  // multiplier for each role. All production paths call these same functions.
  const E=Game.Energy,P=Game.Progression,F=Game.FieldDynamics;
  const enabled=E.generatorEnabled,baseRate=E.getBaseRate,coupled=E.getCoupledFields,buy=E.buyGenerator;
  E.generatorEnabled=function (gen) { return enabled.call(this,gen) && (Game.UI && false || Game.Challenges.active() || Game.Structure.unlocked(gen)); };
  E.getGeneratorCost=function (gen) { return Game.Patterns.price(gen); };
  E.getGeneratorScaling=function (gen) { const state=Game.Patterns.forGenerator(gen.id),n=Game.player.generators[gen.id].purchased.toNumber();return Game.Patterns.price(gen,n+state.remaining).div(Game.Patterns.price(gen,n)); };
  E.quoteGenerator=function (id,amount) { return Game.Patterns.quote(id,amount); };
  E.getBaseRate=function (gen) { return baseRate.call(this,gen).mul(gen.id==='energyDisturbance'?Game.Patterns.multiplier(gen.id):1); };
  E.getCoupledFields=function () { return coupled.call(this).mul(Game.Patterns.multiplier('fieldCoupling')); };
  E.fluctGrowth=function () { return D(1).add(D(1).add(Game.Coherence.quantumSoftcapState().effective).log10()*.1); };
  E.fluctMagnitude=function () {
    return D(1.25).add(this.getOwned('quantumFluctuation').mul(.02)).mul(Game.Patterns.multiplier('quantumFluctuation')).mul(this.fluctGrowth()).mul(P.generatorFocusMultiplier('quantumFluctuation')).mul(Game.Symmetry.crossMultiplier('quantumFluctuation'));
  };
  E.fluctRollFactor=function () { return D(Game.player.fluctuation.positive?1.2:.8); };
  E.fluctMultiplier=function () { return Game.Challenges.produces('quantumFluctuation') && this.getOwned('quantumFluctuation').gt(0)?this.fluctMagnitude().mul(this.fluctRollFactor()):D(1); };
  E.fluctFormulaText=function () { return 'Stable strength = (1.25 + 0.02 × owned Gen 2) × purchased-pattern strength × echoes × (1 + 0.1 × log10(1 + effective QR)) × rhythm × Symmetry coupling. Positive Fluct applies ×1.20 to this strength; negative Fluct applies ×0.80. Both signs benefit from every purchase. QR is outside the Gen 2 exponent.'; };
  E.buyGenerator=function (id,amount) {
    const gen=this.getGenerator(id);if(!gen) return false;
    const pattern=Game.Patterns.forGenerator(id).index,field=id==='fieldExcitation'?Game.FieldExcitation.purchaseBoost():D(0);
    if(!buy.call(this,id,amount)) return false;
    if(id==='fieldExcitation') Game.player.fieldExcitation.baseRateBonus=Game.player.fieldExcitation.baseRateBonus.add(Decimal.max(0,Game.FieldExcitation.purchaseBoost().sub(field)));
    Game.Patterns.completed(gen,pattern);return true;
  };
  const output=Game.Coherence.outputPerCycle,fieldOutput=Game.FieldExcitation.boostPerCycle,resonance=F.resonance;
  Game.Coherence.outputPerCycle=function () { return output.call(this).mul(Game.Patterns.multiplier('coherentEnergy')).mul(P.hasSkill('4-1')?Game.CONFIG.PRESTIGE.skills['4-1'].coherenceMultiplier:1); };
  Game.FieldExcitation.boostPerCycle=function () { return fieldOutput.call(this).mul(Game.Patterns.multiplier('fieldExcitation')); };
  F.resonance=function () { return resonance.call(this).mul(Game.Patterns.multiplier('fieldResonance')); };
  const basePeak=F.basePeak;
  F.basePeak=function () { return basePeak.call(this).mul(Game.Patterns.multiplier('fieldOscillation')); };
  F.baseline=function () { return this.active()?D(1.03).pow(E.getOwned('fieldOscillation')).mul(Game.Patterns.multiplier('fieldOscillation')).mul(this.resonance().pow(.25)):D(1); };
  F.multiplierAt=function (offset) { return this.peakPaused()?this.baseline():this.baseline().mul(this.peak().div(this.baseline()).pow(this.progress(offset))); };
  F.riseLogSlope=function () { return this.peak().div(this.baseline()).log10()/Number(this.rules().rise); };
  F.averageMultiplier=function (delta,power,extraSlope) {
    power=power===undefined?1:power;
    const rising=this.active() && !this.peakPaused() && !this.held() && Game.player.fieldDynamics.elapsed.lt(this.rules().rise);
    const slope=(rising?this.riseLogSlope()*power:0)+(extraSlope||0),x=slope*Math.LN10*D(delta).toNumber();
    return this.multiplier().pow(power).mul(Math.abs(x)<1e-7?(x===0?1:Math.expm1(x)/x):D(10).pow(x/Math.LN10).sub(1).div(x));
  };
  const energyMultiplier=P.energyMultiplier,clickBase=P.clickBaseGain;
  P.energyMultiplier=function () {
    return energyMultiplier.call(this).mul(Game.Structure.multiplier()).mul(Game.Structure.condenseMemory()).mul(this.hasSkill('1-1')?Game.CONFIG.PRESTIGE.skills['1-1'].foundationMultiplier:1).mul(this.hasSkill('2-1')?Game.CONFIG.PRESTIGE.skills['2-1'].foundationMultiplier:1).mul(this.hasSkill('4-1')?Game.CONFIG.PRESTIGE.skills['4-1'].foundationMultiplier:1);
  };
  P.clickBaseGain=function () { return clickBase.call(this).mul(D(Game.CONFIG.STRUCTURE.clickStrength||1.5).pow(Game.Patterns.state(Game.player.upgrades.clickPower).index)); };
  P.upgradePricing=function () {
    const rules=Game.Modifiers.getClickUpgradeRules(),growth=Game.CONFIG.STRUCTURE.clickPriceGrowth||2.2,key='patterns:'+growth+':'+JSON.stringify(rules);
    if(this._pricing && this._pricing.key===key) return this._pricing;
    const costs=Array.from({length:rules.maxLevel+1},function (_,n) { return D(rules.baseCost).mul(D(growth).pow(Game.Patterns.state(n).index)); });
    return (this._pricing={key:key,costs:costs,rules:rules});
  };
  const clickQuote=P.quoteClickUpgrade;
  P.quoteClickUpgrade=function (amount) { return clickQuote.call(this,amount==='pattern'?Game.Patterns.state(Game.player.upgrades.clickPower).remaining:amount); };
})(window.CosmicIdle);
