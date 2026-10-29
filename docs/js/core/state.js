(function (Game) {
  const D = Game.D;

  Game.createDefaultPlayer = function createDefaultPlayer() {
    const generators = {};
    Game.CONFIG.GENERATORS.forEach(function (gen) {
      generators[gen.id] = { purchased: D(0), added: D(0), burstElapsed: D(0), burstTimers: [] };
    });

    const collapsed = { upgrades: 0, generators: 0, clickPower: 0 };
    Game.CONFIG.GENERATORS.forEach(function (gen) { collapsed[gen.id] = 0; });
    const skills = {};
    Object.keys(Game.CONFIG.PRESTIGE.skills).forEach(function (id) { skills[id] = 0; });
    const achievements = { firstSparks:0, firstGenerator:0, growingEngine:0, coherentBeginning:0, condense:0 };
    Game.CONFIG.DISCOVERY_ACHIEVEMENTS.forEach(function (definition) { achievements[definition.id]=0; });
    const lore={ introductionSeen:0,clickSeen:0,generatorSeen:0,coherenceSeen:0,fieldFirstSeen:0,fieldSecondSeen:0,condenseSeen:0,symmetrySeen:0,stabilizationSeen:0 };
    Game.CONFIG.STORY.forEach(function (entry) {lore[entry.id]=0;lore[entry.id+'Read']=0;});
    const buyers={}, autoBuyers={};
    Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
      buyers[buyer.id]={level:0,elapsed:0};autoBuyers[buyer.id]=Number(buyer.id!=='condense');
    });
    buyers.stabilize={level:0,elapsed:0};autoBuyers.stabilize=0;
    const asymmetryUpgrades={};Object.keys(Game.CONFIG.ASYMMETRY.upgrades).forEach(function (id) { asymmetryUpgrades[id]=0; });
    const attention={};['prestige','perfect','automation','challenges','symmetry','unified','breaking','asymmetry','achievements','lore','stabilize'].concat(Object.keys(skills).map(function (id) { return 'skill:'+id; }),Game.CONFIG.GENERATORS.map(function (gen) { return 'gen:'+gen.id; }),Object.keys(Game.CONFIG.SYMMETRY.upgrades).map(function (id) { return 'unified:'+id; })).forEach(function (key) { attention[key]=0; });
    Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) { attention['auto:'+buyer.id]=0;attention['track:'+buyer.id]=0; });attention['auto:stabilize']=0;
    Object.keys(Game.CONFIG.ASYMMETRY.upgrades).forEach(function (id) { attention['asym:'+id]=0; });
    return {
      automation: {buyers:buyers},
      flow:{seedElapsed:D(0),growthElapsed:D(0),pulses:D(0)},
      structure: {economyVersion:1,stabilizations:D(0),bestEnergy:D(0),recoveryTarget:D(0),elapsed:0,recovered:0,recoverySeconds:0,migrated:0},
      symmetry:{amount:D(0),best:D(0),alignment:D(0),alignmentAdded:D(0),pulseElapsed:D(0),upgrades:{unifiedField1:0,unifiedField2:0,quantumCoupling:0,fieldResonance:0,perfectInteraction:0}},
      asymmetry:{amount:D(0),total:D(0),times:D(0),upgrades:asymmetryUpgrades},
      lateEnergy:{highest:D(0)},
      challenges: {active:0,bestEnergy:D(0),highestEnergy:D(0),rulesVersion:3,elapsed:0,purchases:0,failed:0,qualified:0,resetArmed:0,resetAt:0,resets:0,lastPurchase:0,latestGenerator:0},
      unlocks: { fluctOdds: 0, fieldExcitation: 0 },
      ui: { collapsed: collapsed, skillTree2D: 1, generatorLayer:0, attention:attention },
      version: Game.CONFIG.VERSION,
      generatorSchema: 2,
      fluctuation: { positive: 1, elapsed: D(0), negativeStreak: 0, negativeStreakAchievement: 0, negativeStreakLevel:0, positiveChanceMastery:0, rollReductionStacks: D(0) },
      achievements: achievements,
      prestige: { quanta: D(0), totalQuanta: D(0), times: D(0), skills: skills, history: [], symmetry:0 },
      generatorFocus: { elapsed: D(0) },
      autoClick: { elapsed: D(0) },
      disturbanceReplication: { elapsed: D(0), doubles: D(0) },
      resources: {
        energy: D(Game.CONFIG.IDLE_FLOW.startingEnergy),
        quantumResonance: D(0),
        energyResonance: D(0)
      },
      generators: generators,
      coherence: { quantumElapsed: D(0), energyElapsed: D(0), quantumCarry: D(0), energyCarry: D(0) },
      fieldExcitation: { elapsed: D(0), baseRateBonus: D(0) },
      fieldDynamics: { elapsed: D(0), held: 0 },
      upgrades: { clickPower: D(0) },
      settings: { audioTheme:0, visualTheme:0, resetVisuals:1, confirmBreak:1, confirmCondense:1, confirmStabilize:1,
        animations:{production:1,positiveFluct:1,negativeFluct:1,quantumResonance:1,energyResonance:1,fieldExcitation:1,fieldOscillation:1,fieldResonance:1,fieldCoupling:1,alignment:1,symmetry:1,stabilize:1,break:1,discovery:1,background:1,pattern:1},
        autoBuyers:autoBuyers, autoCondenseTarget:D(1), sound: 1, muteUnfocused: 1, clickSound: 1, autoClickSound: 1, bubbleSound: 1, perkSound: 1, perkVisuals: 1, generatorSound: 1, fluctuationSound: 1, coherentSound: 1, fieldSound: 1, condenseSound: 1, condenseVisuals: 1, volume: 0.3, visuals: 1, autoDismiss: 0, oscillationFreeze: 0 },
      lore: lore,
      meta: {
        gameSpeedMultiplier: D(1)
      },
      time: {
        lastActiveAt: 0,
        realPlayed: 0,
        currentEnergyRunReal: 0,
        currentEnergyRunPartial: 0,
        gamePlayed: D(0),
        currentEnergyRun: D(0)
      },
      stats: {
        totalEnergy: D(0),
        totalQuantumResonance: D(0),
        manualClicks: D(0),
        autoClicks: D(0),
        generatorsBought: D(0)
      }
    };
  };

  Game.player = Game.createDefaultPlayer();

  Game.resetPlayer = function resetPlayer() {
    Game.player = Game.createDefaultPlayer();
    if(Game.Save) Game.Save.beginNewSession();
  };
})(window.CosmicIdle);
