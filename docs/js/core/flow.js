(function (Game) {
  const D=Game.D,E=Game.Energy,P=Game.Progression,C=Game.Coherence,F=Game.FieldExcitation;
  Game.Flow={
    supportMultiplier:function () { return P.hasSkill('1-4-1')?D(Game.CONFIG.PRESTIGE.skills['1-4-1'].supportPerPattern).pow(Game.Patterns.forGenerator('energyDisturbance').index):D(1); },
    seedActive:function () { return !Game.Challenges.active() && P.hasSkill('1-2-1') && Game.Challenges.produces('energyDisturbance') && E.getOwned('energyDisturbance').gt(0); },
    growthActive:function () { return !Game.Challenges.active() && P.hasSkill('1-5-2'); },
    nextEventIn:function () {
      return Decimal.min(this.seedActive()?Decimal.max(0,D(Game.CONFIG.IDLE_FLOW.seedInterval).sub(Game.player.flow.seedElapsed)):D(Infinity),this.growthActive()?Decimal.max(0,D(Game.CONFIG.IDLE_FLOW.growthInterval).sub(Game.player.flow.growthElapsed)):D(Infinity));
    },
    advance:function (seconds) { const s=Game.player.flow;if(this.seedActive())s.seedElapsed=s.seedElapsed.add(seconds);if(this.growthActive())s.growthElapsed=s.growthElapsed.add(seconds); },
    resolve:function () {
      const s=Game.player.flow;let produced=false;
      if(this.seedActive() && s.seedElapsed.add(1e-12).gte(Game.CONFIG.IDLE_FLOW.seedInterval)) {
        s.seedElapsed=Decimal.max(0,s.seedElapsed.sub(Game.CONFIG.IDLE_FLOW.seedInterval));E.addGenerators('energyDisturbance',Game.CONFIG.IDLE_FLOW.seedAmount);produced=true;
      }
      if(this.growthActive() && s.growthElapsed.add(1e-12).gte(Game.CONFIG.IDLE_FLOW.growthInterval)) {
        s.growthElapsed=Decimal.max(0,s.growthElapsed.sub(Game.CONFIG.IDLE_FLOW.growthInterval));
        const eligible=Game.CONFIG.GENERATORS.filter(function (gen) { return Game.Challenges.produces(gen.id)&&E.getOwned(gen.id).gt(0); });
        eligible.forEach(function (gen) { E.addGenerators(gen.id,1); });produced=produced||eligible.length>0;
      }
      if(produced) { s.pulses=s.pulses.add(1);Game.Achievements.capture(Game.player,true);if(Game.UI && !(Game.Loop&&Game.Loop.catchingUp))Game.UI.dynamicsFeedback('energyDisturbance'); }
    }
  };
  // Input never creates Energy. Generator clocks remain the sole production path.
  E.baseManualGain=E.capturedProductionGain=E.manualGain=function () { return D(0); };
  E.generateManual=function () { return D(0); };
  E.clickOutputBonus=function () { return {energy:D(0),symmetry:D(0),quantumResonance:D(0),energyResonance:D(0),baseGrowth:D(0)}; };
  E.autoClickEligible=function () { return false; };E.autoClickRemaining=function () { return D(Infinity); };
  P.clickBaseGain=function () { return D(0); };P.clickMultiplier=P.clickSkillMultiplier=function () { return D(1); };
  P.buyClickUpgrade=function () { return false; };P.keepDisturbMaxed=function () {};
  const baseRate=E.getBaseRate,generatorMultiplier=P.generatorMultiplier,energyMultiplier=P.energyMultiplier,coherentOutput=C.outputPerCycle,fieldOutput=F.boostPerCycle;
  E.getBaseRate=function (gen) { return baseRate.call(this,gen).mul(gen.id==='energyDisturbance'&&P.hasSkill('1-2')?Game.CONFIG.PRESTIGE.skills['1-2'].generatorEnergyMultiplier:1).mul(gen.id==='energyDisturbance'&&P.hasSkill('1-2-1')?Game.CONFIG.PRESTIGE.skills['1-2-1'].generatorEnergyMultiplier:1); };
  P.achievementUnlocked=function () { return Boolean(Game.player.achievements.firstSparks || Game.player.stats.generatorsBought.gte(1)); };
  P.firstGeneratorAchievementUnlocked=function () { return Boolean(Game.player.achievements.firstGenerator || Game.player.stats.generatorsBought.gte(10)); };
  P.generatorMultiplier=function () { return generatorMultiplier.call(this).mul(P.firstGeneratorAchievementUnlocked()?Game.CONFIG.GENERATOR_ACHIEVEMENTS.firstClickMultiplier:1).mul(P.hasSkill('1-2-2')?Game.CONFIG.PRESTIGE.skills['1-2-2'].productionMultiplier:1).mul(P.hasSkill('4-3-2')?Game.CONFIG.PRESTIGE.skills['4-3-2'].productionMultiplier:1); };
  P.energyMultiplier=function () { return energyMultiplier.call(this).mul(P.achievementUnlocked()?Game.CONFIG.CLICK_ACHIEVEMENT.multiplier:1).mul(P.hasSkill('3-1')?Game.CONFIG.PRESTIGE.skills['3-1'].foundationMultiplier:1); };
  const buy=E.buyGenerator;
  E.buyGenerator=function (id,amount) { const earned=P.achievementUnlocked(),result=buy.call(this,id,amount);if(result&&!earned&&P.achievementUnlocked()&&Game.UI)Game.UI.notifyAchievement('First signal','×1.03 all Energy');return result; };
  // Field Coupling uses deliberate generator purchases rather than removed Disturb levels.
  E.getCoupledFields=function () {
    if(!Game.Challenges.produces('fieldCoupling'))return D(0);
    const s=Game.player.generators.fieldCoupling;
    return s.purchased.add(s.added).mul(Game.player.generators.energyDisturbance.purchased).mul(Game.Progression.generatorFocusMultiplier('fieldCoupling')).mul(Game.Symmetry.crossMultiplier('fieldCoupling')).mul(Game.Patterns.multiplier('fieldCoupling'));
  };
  C.outputPerCycle=function () { return coherentOutput.call(this).mul(Game.Flow.supportMultiplier()).mul(P.hasSkill('2-3-1')?Game.CONFIG.PRESTIGE.skills['2-3-1'].resonanceOutputMultiplier:1); };
  E.fluctGrowth=function () { return D(1).add(D(1).add(C.quantumSoftcapState().effective).log10()*.1*(P.hasSkill('2-3-3')?Number(Game.CONFIG.PRESTIGE.skills['2-3-3'].resonanceEffectMultiplier):1)); };
  E.fluctRollFactor=function () { return D(Game.player.fluctuation.positive?1.2*(P.hasSkill('2-2')?Number(Game.CONFIG.PRESTIGE.skills['2-2'].positiveStrengthMultiplier):1):.8); };
  const magnitude=E.fluctMagnitude;
  E.fluctMagnitude=function () { return magnitude.call(this).mul(P.hasSkill('4-4-1')?Game.CONFIG.PRESTIGE.skills['4-4-1'].fluctStrengthMultiplier:1); };
  E.fluctFormulaText=function () { return 'Stable strength = (1.25 + 0.02 × owned) × purchased patterns × echoes'+(knownCoherence()?' × Quantum Resonance strength':'')+' × current rhythm'+(Game.Symmetry.unlocked()?' × Symmetry coupling':'')+(P.hasSkill('4-4-1')?' × 1.25 from Deferred resistance':'')+'. Positive rolls apply ×'+(P.hasSkill('2-2')?'1.32':'1.20')+'; negative rolls apply ×0.80.'; };
  function knownCoherence() { return C.discovered() || Game.UI && false; }
  C.quantumWorkInterval=function () { const rules=this.rules();return P.productionInterval(D(rules.quantumInterval).add(Game.player.stats.totalQuantumResonance.div(rules.quantumSlowdownEvery).floor().mul(rules.quantumSlowdownSeconds))); };
  C.energyWorkInterval=function () { return P.productionInterval(this.rules().energyInterval); };
  C.quantumInterval=C.energyInterval=function () { return D(1); };
  C.quantumPerSecond=function () { return this.outputPerCycle().div(this.quantumWorkInterval()); };
  C.baseEnergyPerSecond=function () { return this.outputPerCycle().div(this.energyWorkInterval()).mul(P.hasSkill("2-4-1")?Game.CONFIG.PRESTIGE.skills["2-4-1"].energyResonanceMultiplier:1); };
  C.energyPerSecond=function () { return this.baseEnergyPerSecond().add(P.hasSkill('2-4-1')?this.quantumPerSecond():0); };
  C.grantOutput=function (kind,amount) {
    if(!Game.Challenges.produces('coherentEnergy'))return D(0);
    const value=Decimal.max(0,D(amount));Game.player.resources[kind]=Game.player.resources[kind].add(value);
    if(kind==='quantumResonance')Game.player.stats.totalQuantumResonance=Game.player.stats.totalQuantumResonance.add(value);
    else E.addGenerators('energyDisturbance',value);
    return value;
  };
  C.resolveEvents=function () {
    if(!Game.Challenges.produces('coherentEnergy')||E.getOwned('coherentEnergy').lte(0))return;
    const s=Game.player.coherence;
    // Snapshot both rates before granting QR; a payout never strengthens itself.
    const qr=this.quantumPerSecond(),er=this.baseEnergyPerSecond(),work=this.quantumWorkInterval();
    if(s.quantumElapsed.add(1e-12).gte(1)) {
      s.quantumElapsed=Decimal.max(0,s.quantumElapsed.sub(1));this.grantOutput('quantumResonance',qr);
      if(P.hasSkill('2-4-1'))this.grantOutput('energyResonance',qr);
      if(P.hasSkill('2-4-2')&&Game.Challenges.produces('fieldExcitation')&&E.getOwned('fieldExcitation').gt(0))Game.player.fieldExcitation.elapsed=Game.player.fieldExcitation.elapsed.add(D(Game.CONFIG.PRESTIGE.skills['2-4-2'].fieldSeconds).div(work));
      if(Game.UI)Game.UI.resonanceFeedback('quantumResonance');
    }
    if(s.energyElapsed.add(1e-12).gte(1)) {
      s.energyElapsed=Decimal.max(0,s.energyElapsed.sub(1));this.grantOutput('energyResonance',er);
      if(Game.UI)Game.UI.resonanceFeedback('energyResonance');
    }
  };
  F.referenceInterval=function () { return P.productionInterval(Game.CONFIG.FIELD_EXCITATION.interval); };
  F.interval=function () { return D(1); };
  F.purchaseBoost=function () { return fieldOutput.call(this).mul(Game.Flow.supportMultiplier()).mul(P.hasSkill("2-4-2")?Game.CONFIG.PRESTIGE.skills["2-4-2"].fieldOutputMultiplier:1); };
  F.boostPerCycle=function () { return this.purchaseBoost().div(this.referenceInterval()); };
  F.growthPerSecond=function () { return this.boostPerCycle().mul(D(1).add(P.hasSkill('2-4-2')&&Game.Challenges.produces('coherentEnergy')&&E.getOwned('coherentEnergy').gt(0)?D(Game.CONFIG.PRESTIGE.skills['2-4-2'].fieldSeconds).div(C.quantumWorkInterval()):0)); };
  const peak=Game.FieldDynamics.basePeak;
  Game.FieldDynamics.basePeak=function () { return peak.call(this).mul(P.hasSkill('3-2-2')?Game.CONFIG.PRESTIGE.skills['3-2-2'].peakMultiplier:1); };
  const matches=Game.Achievements.matches;
  Game.Achievements.matches=function (definition,player) { const p=player||Game.player;if(definition.kind==='purchases')return p.stats.generatorsBought.gte(definition.amount);if(definition.kind==='passive')return p.flow.pulses.gte(definition.amount);return matches.call(this,definition,p); };
})(window.CosmicIdle);
