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
    const buyers={}, autoBuyers={};
    Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
      buyers[buyer.id]={level:0,elapsed:0};autoBuyers[buyer.id]=0;
    });
    return {
      automation: {buyers:buyers},
      challenges: {active:0,bestEnergy:D(0)},
      unlocks: { fluctOdds: 0, fieldExcitation: 0 },
      ui: { collapsed: collapsed, skillTree2D: 0 },
      version: Game.CONFIG.VERSION,
      generatorSchema: 2,
      fluctuation: { positive: 1, elapsed: D(0), negativeStreak: 0, negativeStreakAchievement: 0, negativeStreakLevel:0, positiveChanceMastery:0, rollReductionStacks: D(0) },
      achievements: achievements,
      prestige: { quanta: D(0), totalQuanta: D(0), times: D(0), skills: skills, history: [] },
      generatorFocus: { elapsed: D(0) },
      autoClick: { elapsed: D(0) },
      disturbanceReplication: { elapsed: D(0), doubles: D(0) },
      resources: {
        energy: D(0),
        quantumResonance: D(0),
        energyResonance: D(0)
      },
      generators: generators,
      coherence: { quantumElapsed: D(0), energyElapsed: D(0), quantumCarry: D(0), energyCarry: D(0) },
      fieldExcitation: { elapsed: D(0), baseRateBonus: D(0) },
      fieldDynamics: { elapsed: D(0), held: 0 },
      upgrades: { clickPower: D(0) },
      settings: { autoBuyers:autoBuyers, autoCondenseTarget:D(1), sound: 1, muteUnfocused: 1, clickSound: 1, autoClickSound: 1, bubbleSound: 1, perkSound: 1, perkVisuals: 1, generatorSound: 1, fluctuationSound: 1, coherentSound: 1, fieldSound: 1, condenseSound: 1, condenseVisuals: 1, volume: 0.3, visuals: 1, autoDismiss: 0, oscillationFreeze: 0 },
      lore: { introductionSeen: 0, clickSeen: 0, generatorSeen: 0, coherenceSeen: 0, fieldFirstSeen: 0, fieldSecondSeen: 0, condenseSeen: 0 },
      meta: {
        gameSpeedMultiplier: D(1)
      },
      time: {
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
  };
})(window.CosmicIdle);
