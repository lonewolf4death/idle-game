(function (Game) {
  Game.CONFIG = {
    VERSION: 2,
    SAVE_KEY: "cosmicIdleEnergyV2",
    SIMULATION_TPS: 20,
    AUTOSAVE_MS: 10000,
    MAX_REAL_DELTA: 0.25,

    ENERGY: {
      manualGain: "1"
    },

    CLICK_UPGRADE: {
      name: "Disturb",
      unlockEnergy: "5",
      baseCost: "5",
      gainPerLevel: "1",
      maxLevel: 1000,
      scalingStepLevels: 25,
      initialScaling: "1.15",
      scalingStepIncrease: "0"
    },
    PLAYTIME_ACHIEVEMENT: {
      monthSeconds: 2592000, yearSeconds: 31536000,
      earlyTiers: [
        { seconds: 300, label: "5 minutes", multiplier: "1.025" },
        { seconds: 1800, label: "30 minutes", multiplier: "1.025" },
        { seconds: 3600, label: "1 hour", multiplier: "1.025" },
        { seconds: 7200, label: "2 hours", multiplier: "1.025" },
        { seconds: 21600, label: "6 hours", multiplier: "1.025" },
        { seconds: 43200, label: "12 hours", multiplier: "1.025" },
        { seconds: 86400, label: "24 hours", multiplier: "1.025" },
        { seconds: 172800, label: "2 days", multiplier: "1.05" },
        { seconds: 604800, label: "7 days", multiplier: "1.1" },
        { seconds: 1209600, label: "2 weeks", multiplier: "1.1" }
      ],
      monthlyMultiplier: "1.1",
      yearTiers: [5, 10, 25, 50, 100], yearMultiplier: "1.5",
      repeatingStartYears: "1000", repeatingTimeFactor: "10", repeatingMultiplier: "2"
    },
    CLICK_ACHIEVEMENT: { requiredClicks: "10", multiplier: "1.05" },
    FLUCT_STREAK_ACHIEVEMENT: { name: "Against the current", requiredRolls: 7, masteryThreshold: .75, masteryFloor: .8,
      tiers: [{rolls:3, bonus:.01}, {rolls:4, bonus:.01}, {rolls:5, bonus:.02}, {rolls:6, bonus:.02}, {rolls:7, bonus:.04}] },
    DISCOVERY_ACHIEVEMENTS: [
      { id:"hundredDisturbances", name:"Exactly one hundred", kind:"purchased", generator:"energyDisturbance", amount:"100", exact:true, reward:"generators", multiplier:"1.02", icon:"engine", requirement:"Finish a purchase with exactly 100 purchased Gen 1 (Energy Disturbance)." },
      { id:"tenCoherent", name:"A measured chorus", kind:"purchased", generator:"coherentEnergy", amount:"10", exact:true, reward:"generators", multiplier:"1.02", icon:"coherent", requirement:"Finish a purchase with exactly 10 purchased Gen 3 (Coherent Energy)." },
      { id:"thousandClicks", name:"A thousand echoes", kind:"clicks", amount:"1000", reward:"clicks", multiplier:"1.02", icon:"spark", requirement:"Generate 1,000 clicks in one run, including automatic impulses." },
      { id:"perfectDisturb", name:"Disturbance perfected", kind:"disturb", amount:"max", reward:"energy", multiplier:"1.01", icon:"growing", requirement:"Reach Disturb's maximum level." },
      { id:"firstImpulse", name:"An impulse of its own", kind:"autoClicks", amount:"1", reward:"energy", multiplier:"1.01", icon:"time", requirement:"Trigger your first automatic impulse." }
    ],
    PROGRESSION: { prestigeEnergy: "1e50" },
    PRESTIGE: {
      name: "Condense Energy", quantaEnergyBase: "1.03", quantaSoftcapMultiplier: "1e25", achievementMultiplier: "1.05",
      lore: "Persistent excitations emerge from the primordial field. For the first time, energy can exist in discrete states.",
      branches: [
        { id: 0, name: "Origin", nodes: ["0-0"] },
        { id: 1, name: "Impulse", nodes: ["1-1", "1-2", "1-2-1", "1-2-2", "1-3-1", "1-3-2", "1-4-1", "1-4-2", "1-5-1", "1-5-2"] },
        { id: 2, name: "Probability", nodes: ["2-1", "2-1-2", "2-2", "2-3-1", "2-3-2", "2-3-3", "2-4-1", "2-4-2"] },
        { id: 3, name: "Rhythm", nodes: ["3-1", "3-2", "3-2-1", "3-2-2", "3-2-3", "3-3", "3-4-1", "3-4-2", "3-4-3", "3-5-1", "3-5-2"] },
        { id: 4, name: "Continuum", nodes: ["4-1", "4-2", "4-3-1", "4-3-2", "4-3-3", "4-4-1", "4-4-2"] }
      ],
      skills: {
        "1-4-2": { name: "Quickening disturbance", cost: "15", requires: "1-3-2", secondsPerPurchased: "0.025", description: "Each purchased Gen 1 (Energy Disturbance) shortens its production cycle by 0.025 game seconds, including past purchases. Minimum cycle: 1 second. Added units benefit without shortening the cycle further. Combines with Shorter intervals; keeps current cycle progress." },
        "1-5-1": { name: "Self-replicating potential", cost: "100", requires: "1-4-2", firstInterval: "60", intervalGrowth: "30", description: "Double Gen 1's purchased + added count after 60 game seconds, then after 90, 120, 150 seconds, and so on. Copies are added units and do not raise costs or purchased counts. Begins timing when Gen 1 is owned; starts fresh each run. Gathering potential applies after the doubling." },
        "1-5-2": { name: "Fleeting potential", cost: "25", requires: "1-4-1", spawnSeconds: 10, growSeconds: 2, graceSeconds: 0.25, description: "Every 10 seconds spent viewing the Energy field, a small potential bubble forms. Click it during its green-ring window to gain 1 added unit of every available Primordial generator. The window lasts 0.25 real seconds, unaffected by game speed. Added units do not count as purchases. Missed bubbles fade without a penalty." },
        "2-4-1": { name: "Resonant echoes", cost: "15", requires: "2-3-1", description: "Every Quantum Resonance production cycle also grants the same amount of Energy Resonance as the whole Quantum Resonance produced. The normal Energy Resonance cycle continues separately. Each Energy Resonance adds one Gen 1. Click-granted Quantum Resonance does not trigger an extra cycle." },
        "2-4-2": { name: "Excitation cascade", cost: "25", requires: "2-3-2", fieldSeconds: "15", description: "Each Quantum Resonance production cycle advances Gen 4 (Field Excitation)'s current cycle by 15 game seconds. Any excess carries into following cycles, including immediate payouts. Requires an owned Gen 4; does not advance other clocks or trigger from click-granted Resonance." },
        "3-2-3": { name: "Compressed rhythm", cost: "25", requires: "3-2-2", cycle: "45", description: "Shorten Gen 5 (Field Oscillation)'s total cycle to 45 game seconds. Its peak duration stays unchanged, shortening only the rise. Keeps the current rise or peak progress when unlocked. Combines with held and positive-only peaks." },
        "3-5-1": { name: "Logarithmic harmony", cost: "50", requires: "3-4-1", description: "Multiply Gen 6 (Field Resonance)'s effective count by log₂ of held Quantum Resonance, with a minimum multiplier of ×1. Uses the actual resource amount, before Fluct soft caps. Also strengthens units supplied by Shared harmonics; does not raise purchase costs." },
        "3-5-2": { name: "Shared harmonics", cost: "50", requires: "3-4-2", description: "Every purchased Gen 7 (Field Coupling) also contributes one effective Gen 6 (Field Resonance). Includes past and future purchases. Added Gen 7 units do not contribute. Gen 6 costs and purchase achievements remain based on its own purchases." },
        "4-4-1": { name: "Deferred resistance", cost: "50", requires: "4-3-2", softcapStart: "150", description: "Quantum Resonance's first Fluct soft cap starts at 150 held Resonance instead of 100. All later thresholds shift with it, keeping the current ×3 or ×3.3 spacing. Production slowdown milestones are unchanged." },
        "4-4-2": { name: "Lasting potential", cost: "25", requires: "4-3-1", description: "The Quanta Energy bonus uses whichever is higher: current unspent Quanta or half of all lifetime Quanta earned. These amounts are compared, not added. Fractional halves count toward the bonus, following the same Quanta soft cap. Applies immediately, including past Quanta." },
        "0-0": { name: "Memory of condensation", cost: "0", energyPerCondense: "1.05", description: "Multiply all Energy by ×1.05 for each lifetime Condense, including Condenses completed before this skill was unlocked. Each Condense multiplies this skill's bonus again. Free to unlock; survives Condensing." },
        "1-1": { name: "Focused disturbance", cost: "1", clickMultiplier: "2", description: "Multiply your ordinary click payout by ×2. Captured production is added separately using the current generator rate." },
        "1-2": { name: "Captured instant", cost: "5", requires: "1-1", productionSeconds: "0.25", description: "Each click also grants 0.25 seconds of your current generator Energy production. Uses the displayed Energy/sec rate without advancing any timers." },
        "2-1": { name: "Biased potential", cost: "1", positiveChanceBonus: 0.05, description: "Add +5 percentage points to positive Fluct chance and reduce negative chance by 5 percentage points. Stacks additively with other chance bonuses. Unlocking also reveals your current Fluct probabilities." },
        "1-2-1": { name: "A step through time", cost: "5", requires: "1-2", gameSeconds: "0.33", description: "Replace Captured instant's Energy-only payout. Each manual click now advances game time by 0.33 seconds for all generators, including Resonance, Fluct rolls, field growth, and Oscillation. Timed Energy is produced through the simulation; ordinary click Energy is still granted separately." },
        "2-1-2": { name: "Rebounding potential", cost: "10", requires: "2-1", secondsPerNegative: "1", minimumInterval: "1", description: "Each consecutive negative Fluct roll shortens the next roll interval by 1 game second. Two negatives shorten it by 2 seconds, three by 3, and so on. A positive roll resets the reduction. The interval cannot fall below 1 game second. Combines with Quickening potential." },
        "3-2-1": { name: "Held in anticipation", cost: "5", requires: "3-2", freezeBeforePeak: "0.25", description: "Unlock a toggle on Gen 5 (Field Oscillation). When enabled, its cycle freezes 0.25 game seconds before peak. Use Release peak to apply the peak when you choose. Other generators and game time continue normally." },
        "2-2": { name: "Quickening potential", cost: "5", requires: "2-1", rollInterval: "6.66666", description: "Gen 2 (Quantum Fluctuation) rolls every 6.66666 game seconds instead of 10. Keeps the current cycle's progress when unlocked." },
        "3-1": { name: "Lasting oscillation", cost: "1", peakSeconds: "10", description: "Gen 5 (Field Oscillation) rises for 50 seconds and holds its peak for 10 seconds. Total cycle: 60 seconds." },
        "3-2": { name: "First rhythm", cost: "10", requires: "3-1", startingOscillations: "1", description: "Begin each run with 1 free Gen 5 (Field Oscillation). Unlocking this skill also grants it to your current run. Free units count as added, not purchased." },
        "1-3-1": { name: "Accumulated disturbance", cost: "20", requires: "1-2", baseMultiplierPerPurchased: "1.005", description: "Multiply Gen 1 (Energy Disturbance)'s entire base output, including accumulated Field Excitation growth, by ×1.005 for each manually purchased Gen 1. Added units benefit from the multiplier without increasing its exponent. Applies immediately to past purchases and future output." },
        "1-2-2": { name: "Self-sustaining impulse", cost: "50", requires: "1-2-1", interval: "9", description: "Once Disturb reaches its maximum level, generate a full click every 9 game seconds. Includes click bonuses, Echo of creation, peak release, and A step through time's 0.33-second advance. That advance also progresses this timer. Progress is saved; a fresh run begins with no timer progress." },
        "1-3-2": { name: "Gathering potential", cost: "20", requires: "1-2", countPower: "1.1", description: "Raise Gen 1 (Energy Disturbance)'s total purchased + added count to the power of 1.1 for production. Purchase costs, achievements, and timer smoothing still use the actual count." },
        "2-3-1": { name: "Gentler resistance", cost: "20", requires: "2-2", quantumSlowdownSeconds: "0.1", description: "The Quantum Resonance production interval grows by 0.1 seconds per slowdown milestone instead of 1 second." },
        "2-3-2": { name: "Returning resonance", cost: "20", requires: "2-2", energyInterval: "25", description: "Gen 3 (Coherent Energy) produces Energy Resonance every 25 game seconds instead of 30. Keeps the current cycle's progress when unlocked." },
        "2-3-3": { name: "Wider cadence", cost: "10", requires: "2-2", quantumSlowdownEvery: "11", description: "The Quantum Resonance interval increases every 11 Quantum Resonance produced instead of every 10. Combines with Gentler resistance's 0.1-second slowdown." },
        "3-3": { name: "Wandering rhythm", cost: "15", requires: "3-2", generatorMultiplier: "1.15", focusSeconds: "30", description: "A ×1.15 bonus moves from Gen 1 through Gen 7 every 30 game seconds, then loops. It boosts Gen 1 Energy, Gen 2 Fluct magnitude, both Gen 3 Resonance outputs, Gen 4 base increases, Gen 5 peak strength, Gen 6 combined reinforcement, or Gen 7 coupling. Visits every generator, including unowned ones." },
        "3-4-1": { name: "Deep resonance", cost: "10", requires: "3-3", resonancePerUnit: "1.033", description: "Each Gen 6 (Field Resonance) multiplies Gen 5 (Field Oscillation)'s peak by ×1.033 instead of ×1.025." },
        "3-4-2": { name: "First connection", cost: "50", requires: "3-3", startingCouplings: "1", description: "Begin each run with 1 free Gen 7 (Field Coupling). Unlocking this skill also grants it to your current run. Free units count as added, not purchased." },
        "4-1": { name: "Widening continuum", cost: "5", softcapStepFactor: "3.3", description: "Quantum Resonance soft-cap thresholds are spaced ×3.3 apart instead of ×3. The first threshold remains at 100 Resonance." },
        "1-4-1": { name: "Echo of creation", cost: "20", requires: "1-3-1", outputSeconds: "0.01", description: "Each manual click additionally grants 1% of current per-game-second output: Energy, Quantum Resonance, Energy Resonance, and Field Excitation base growth. Fractional Resonance is retained toward whole resources. Passive generators contribute through these rates. Does not advance clocks; stacks with A step through time." },
        "3-2-2": { name: "Sympathetic peak", cost: "50", requires: "3-2-1", description: "Gen 5's peak bonus and its peak countdown are active only while Fluct is positive. Negative Fluct switches the peak bonus off and pauses the remaining peak time. The rise continues normally, and positive Fluct resumes the peak." },
        "3-4-3": { name: "Interwoven rhythm", cost: "20", requires: "3-3", generatorMultiplier: "1.2", focusCount: 2, description: "Wandering rhythm strengthens two adjacent generators at once by ×1.2 each instead of one by ×1.15. Both move forward every 30 game seconds, wrapping from Gen 7 to Gen 1." },
        "4-3-1": { name: "Doubled memory", cost: "15", requires: "4-2", condenseCountMultiplier: "2", description: "Every lifetime Condense counts twice for Memory of condensation, including all past and future Condenses. Actual resets and Quanta rewards are unchanged." },
        "4-3-2": { name: "Shorter intervals", cost: "25", requires: "4-2", intervalReduction: "1", description: "Timed output arrives 1 game second sooner: Gen 1's bursts, both Gen 3 Resonance cycles, and Gen 4's base growth. Gen 1's smooth rate also increases to match the shorter burst cycle. Current cycle progress is preserved. Fluct rolls and Oscillation are unchanged." },
        "4-3-3": { name: "Excited foundation", cost: "25", requires: "4-2", fieldMultiplierPerPurchased: "1.01", description: "Multiply Gen 4 (Field Excitation)'s base-growth output by ×1.01^n, where n is manually purchased Field Excitations. Added and coupled units benefit without increasing n. Applies to future growth cycles and click-granted growth, including units purchased before this skill." },
        "4-2": { name: "Boundless potential", cost: "15", requires: "4-1", energyMultiplier: "1.2", description: "Multiply all Energy gained by ×1.2. Applies to ordinary clicks and generator Energy; captured production includes it once through the generator rate." }
      }
    },

    FLUCTUATION: { positiveChance: 0.54, base: "1.05", growth: "1.001", rollInterval: "10", negativePenaltyScale: "0.20" },
    COHERENCE: {
      quantumInterval: "15", quantumSlowdownEvery: "10", quantumSlowdownSeconds: "1",
      quantumFluctGrowth: "0.000025", energyInterval: "30",
      quantumSoftcap: { start: "100", stepFactor: "3", powers: ["0.95", "0.90", "0.85", "0.80", "0.75", "0.70", "0.65", "0.60", "0.55", "0.50"] },
      lore: "Independent fluctuations begin reinforcing one another, allowing energy patterns to persist."
    },
    FIELD_EXCITATION: {
      interval: "30", baseRateIncrease: "0.01",
      waveDuration: 5, waveIntensity: 0.32,
      wavesPerCycle: 5, waveSmoothAt: 25, maxWaves: 24, maxWaveRate: 6,
      lore: ["Energy is not the foundation.", "Fields are."]
    },
    FIELD_DYNAMICS: { cycle: "60", rise: "55", peakPerOscillation: "1.25", resonancePerUnit: "1.025", fieldsPerDisturb: "1" },
    MUSIC: { firstMilestone: "10", secondMilestone: "25", scale: [0, 2, 5, 7, 9], rootHz: 110 },
    AUDIO: {
      palette: "Eventide", waveform: "triangle", filterHz: 880,
      attack: 0.07, release: 1.4, peakGain: 0.12,
      echoSeconds: 0.38, echoGain: 0.17, maxVoices: 10,
      negativeFluctRate: 0.8
    },
    GENERATOR_SCALING: { stepLevels: 25, stepIncrease: "0.075" },
    GENERATOR_ACHIEVEMENTS: { firstClickMultiplier: "1.05", firstCoherentMultiplier: "1.05", twentyFiveGeneratorMultiplier: "1.1" },

    GENERATORS: [
      {
        id: "energyDisturbance",
        name: "Energy Disturbance",
        unlockEnergy: "100",
        baseCost: "100",
        costScaling: "1.10",
        burstInterval: "30",
        smoothAt: 25,
        sparksPerBurst: 5,
        burstProduction: "30",
        production: "1"
      },
      {
        id: "quantumFluctuation",
        name: "Quantum Fluctuation",
        type: "fluctuation",
        unlockEnergy: "250",
        baseCost: "250",
        costScaling: "1.025",
        scalingStepLevels: 10,
        scalingStepIncrease: "0.00125",
        lateScalingStart: 6000,
        lateScalingStepIncrease: "0.5",
        production: "0"
      },
      {
        id: "coherentEnergy",
        name: "Coherent Energy",
        type: "coherent",
        unlockEnergy: "1e4",
        baseCost: "1e4",
        costScaling: "1.35",
        scalingStepLevels: 5,
        scalingStepIncrease: "0.15",
        production: "0"
      },
      {
        id: "fieldExcitation",
        name: "Field Excitation",
        type: "field",
        unlockEnergy: "1e7",
        baseCost: "1e7",
        costScaling: "1.10",
        scalingStepLevels: 30,
        scalingStepIncrease: "0.3",
        production: "0"
      },
      { id: "fieldOscillation", name: "Field Oscillation", type: "oscillation", unlockEnergy: "1e10", baseCost: "1e10", costScaling: "2", scalingStepLevels: 5, scalingStepIncrease: "0.25", production: "0" },
      { id: "fieldResonance", name: "Field Resonance", type: "resonance", unlockEnergy: "1e15", baseCost: "1e15", costScaling: "1.5", scalingStepLevels: 5, scalingStepIncrease: "0.125", production: "0" },
      { id: "fieldCoupling", name: "Field Coupling", type: "coupling", unlockEnergy: "1e30", baseCost: "1e30", costScaling: "2", scalingStepLevels: 5, scalingStepIncrease: "0.5", production: "0" }
    ]
  };
  Game.CONFIG.AUTOMATION = {
    stabilizer: {id:"stabilize",name:"Stabilize the Field"},
    buyers: [
      {id:"energyDisturbance",skill:"1-6-1",name:"Gen 1 (Energy Disturbance)",title:"Disturbance lattice"},
      {id:"quantumFluctuation",skill:"2-5-1",name:"Gen 2 (Quantum Fluctuation)",title:"Uncertain signals"},
      {id:"coherentEnergy",skill:"2-5-2",name:"Gen 3 (Coherent Energy)",title:"Coherent network"},
      {id:"fieldExcitation",skill:"4-5-1",name:"Gen 4 (Field Excitation)",title:"Excitation array"},
      {id:"fieldOscillation",skill:"3-6-1",name:"Gen 5 (Field Oscillation)",title:"Oscillating phases"},
      {id:"fieldResonance",skill:"3-6-2",name:"Gen 6 (Field Resonance)",title:"Resonant interference"},
      {id:"fieldCoupling",skill:"3-6-3",name:"Gen 7 (Field Coupling)",title:"Coupled pathways"},
      {id:"condense",skill:"4-5-2",name:"Condense Energy",title:"Condensation matrix"}
    ]
  };
  Game.CONFIG.CHALLENGES = [
    {name:"Brief window",unlockEnergy:"1e55",startExponent:8,exponentStep:3,deadline:30,deadlineStep:1,requiredPurchases:3,description:"The run has a real-time deadline. Progress after the deadline cannot complete the attempt."},
    {name:"Diminishing reality",unlockEnergy:"1e65",startExponent:20,exponentStep:20,description:"All Energy gains are raised to a reduced power, falling from 0.95 at level one to 0.50 at level ten. Generator Energy is transformed per game second; click payouts are transformed once."},
    {name:"Slow awakening",unlockEnergy:"1e75",startExponent:25,exponentStep:10,wallOrders:100,wallStep:15,description:"Energy production begins heavily suppressed. Suppression weakens by one order of magnitude per real second, eventually disappearing."},
    {name:"Unstable origin",unlockEnergy:"1e85",startExponent:25,exponentStep:10,resetSeconds:60,resetStep:3,description:"After the first Gen 2 purchase, Energy, generators, Disturb, Resonance and field growth reset periodically. The reset timer continues after each collapse."},
    {name:"Costly potential",startExponent:30,exponentStep:4,purchasePriceMultiplier:"1e6",maxPurchaseQuantity:"1000",startingEnergy:"1.1e10",startingOscillations:"1",description:"Generator and Disturb purchase prices are multiplied by ×1e6.",devDescription:"Starts with 1.1e10 Energy and one added Gen 5. Quantity = 1 + floor(999 × (current Oscillation multiplier − 1) / (peak multiplier − 1)), bounded from 1 to 1000. A paused negative-Fluct peak gives quantity 1. Snapshot before purchase; bonus generators are added units, so only paid purchases raise generator costs. Disturb grants extra levels up to its normal cap."},
    {name:"Single voice",unlockEnergy:"1e105",startExponent:12,exponentStep:6,description:"Only the most recently purchased Primordial generator has an active effect. All other Primordial generator effects and production clocks are paused. Existing resources and accumulated field growth remain."},
    {name:"Silent fluctuations",unlockEnergy:"1e115",startExponent:18,exponentStep:8,blocked:["quantumFluctuation"],description:"Gen 2 (Quantum Fluctuation) is unavailable and Fluct has no effect."},
    {name:"Fading momentum",unlockEnergy:"1e125",startExponent:15,exponentStep:6,description:"Energy production falls continuously to 85% of its previous strength each real second. Any successful generator or Disturb purchase resets this suppression."}
  ];
  Game.CONFIG.CHALLENGES[4].unlockEnergy="1e95";
  Game.CONFIG.SYMMETRY={cost:"10000",baseCost:"1e1000",costScaling:"1e10",costExponentGrowth:"2",starterPurchases:8,starterCostScaling:"1.1",production:"0.0003",unitProductionLimit:"0.00015",totalProductionLimit:"0.000635",upgradeCostAnchorFloor:1200,alignmentEnergyBase:"1e3",
    lore:"The laws of physics are still indistinguishable from one another.",
    milestones:[
      {at:.1,type:'Aligned fields',reward:'Double raw Field Alignment generation. Alignment resistance still applies.'},
      {at:.25,type:'Quantized symmetry',reward:'Condense grants twice as many Primordial Quanta while Symmetry is at least 25%.'},
      {at:.5,type:'Unified interaction',reward:'Unified Interaction upgrades are available. These Energy purchases survive Condense.'},
      {at:.75,type:'Coupled fields',reward:'Each Primordial generator strengthens the other generators using their owned counts.'},
      {at:.9,type:'Near-perfect alignment',reward:'The Perfect Alignment section of the perk tree has been revealed.'},
      {at:.95,type:'Symmetry breaking',reward:'Break Symmetry to gain Asymmetry. Resets Field Alignment, current Symmetry and Unified Interaction purchases.'},
      {at:1,type:'Perfect Symmetry',reward:'Perfect Symmetry reached. Condense gains an additional ×100 Quanta while at 100%. Perfect Interaction is available.'}
    ],
    upgrades:{
      unifiedField1:{name:'Unified Field I',costOffset:25,energyMultiplier:'1e40',description:'Multiply all Energy by ×1e40. Applies after late Energy resistance.'},
      unifiedField2:{name:'Unified Field II',costOffset:175,unitLimitMultiplier:'2',description:'Double raw Symmetry generation and each Field Alignment level’s alignment capacity. Shared field resistance still applies.'},
      quantumCoupling:{name:'Quantum Coupling',costOffset:350,description:'Unspent Primordial Quanta strengthen Symmetry generation with diminishing returns. Hover the name for details.'},
      fieldResonance:{name:'Field Resonance',costOffset:550,description:'Every owned Field Alignment multiplies Energy by ×1e3. Applies after late Energy resistance.'},
      perfectInteraction:{name:'Perfect Interaction',costOffset:850,perfect:true,description:'Raise the Symmetry Energy multiplier to the power of 1.15. Unlocked by reaching Perfect Symmetry once.'}
    }
  };
  Game.CONFIG.CHALLENGES.forEach(function (rule,index) {
    Game.CONFIG.DISCOVERY_ACHIEVEMENTS.push({id:"challenge"+(index+1),name:rule.name+" · Challenge",kind:"challenge",track:index+1,amount:"1",reward:"none",icon:"condense",requirement:"Complete level one of "+rule.name+". Further milestones: levels 5 and 10."});
  });
  Game.CONFIG.DISCOVERY_ACHIEVEMENTS.push({id:"allChallenges",name:"Eight facets of existence",kind:"allChallenges",amount:"1",reward:"power",multiplier:"1.02",icon:"coherent",requirement:"Complete at least one level of all eight challenges."});
  const automationParents=["1-5-1","2-4-1","2-4-2","4-4-1","3-2-3","3-5-1","3-5-2","4-4-2"];
  Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer,index) {
    buyer.title=Game.CONFIG.CHALLENGES[index].name;
    Game.CONFIG.PRESTIGE.skills[buyer.skill]={name:index===7 ? "Automatic condensation" : "Automatic "+Game.CONFIG.GENERATORS[index].name.toLowerCase(),cost:"100",requires:automationParents[index],
      description:(index===7 ? "Automatically Condense once the available reward reaches the Quanta target chosen in the Automation tab (default: 1). The normal 1e50 Energy minimum applies; each reset claims the full available reward. Resets the run as normal. Repeat automatic Condenses skip the cinematic." : "Automatically buy Max "+buyer.name+" using available Energy per activation. Respects unlock conditions and current costs; ignores the manual buy quantity.")+" Starts at one attempt every 5 real seconds. Its ten-level restricted-run challenge reduces the interval by 0.4 seconds per level, reaching 1 second. Configure individual buyers or all buyers in the Automation tab. Basic buyers start enabled when unlocked; advanced skills use your saved toggle. Timers continue while unfocused, do not bank failed purchases, and restart each run. Challenge progress is permanent."};
    Game.CONFIG.PRESTIGE.branches.find(function (branch) { return branch.id===Number(buyer.skill[0]); }).nodes.push(buyer.skill);
  });
  Game.CONFIG.STRUCTURE = {
    economyVersion: 1, patterns: [4, 6, 8, 12], echoStrength: "1.10", pricePower:1.436, latePatternStart:32, latePatternResistance:.35, clickStrength:"1.15", clickPriceGrowth:4,
    strengthPerStabilization: "12", maxStabilizations: 12,
    lore: "The field releases its accumulated energy. A pattern survives. What once emerged by chance can now be formed again.",
    basicBuyerInterval: 15
  };
  Game.CONFIG.GENERATORS.forEach(function (gen,index) {
    gen.patternCostGrowth=gen.patternCostGrowth || ["4","6","10","15","25","40","100"][index] || "100";
    gen.patternStrength=gen.patternStrength || ["2","1.5","2","2","1.5","1.5","2"][index] || "2";
  });
  // Energy begins flowing with the very first unit. Its audiovisual pulse is
  // still streamed separately, without scheduling one timer per owned unit.
  Game.CONFIG.GENERATORS[0].smoothAt=1;
  Game.CONFIG.DISCOVERY_ACHIEVEMENTS.push(
    {id:"firstPattern",name:"A phrase completed",kind:"patterns",amount:"1",reward:"energy",multiplier:"1.02",icon:"coherent",requirement:"Complete your first purchased resonance pattern."},
    {id:"firstStabilization",name:"Something remains",kind:"stabilizations",amount:"1",reward:"energy",multiplier:"1.02",icon:"condense",requirement:"Stabilize the Field once."},
    {id:"fourStabilizations",name:"A field with memory",kind:"stabilizations",amount:"4",reward:"energy",multiplier:"1.05",icon:"fieldExcitation",requirement:"Establish all four Stabilizations in one Condense run."}
  );
  Game.CONFIG.PRESTIGE.skills["1-1"].foundationMultiplier="4";
  Game.CONFIG.PRESTIGE.skills["1-1"].description="Double click Energy and multiply all Energy by ×4. A stronger foundation makes the next run noticeably faster. Both effects combine.";
  Game.CONFIG.PRESTIGE.skills["2-1"].foundationMultiplier="3";
  Game.CONFIG.PRESTIGE.skills["2-1"].description="Add 5 percentage points to positive Fluct chance and multiply all Energy by ×3. Reveals positive and negative probabilities. Other chance bonuses combine normally.";
  Game.CONFIG.PRESTIGE.skills["3-1"].description="Hold Field Oscillation's peak for 10 seconds in its 60-second cycle. Applies immediately when unlocked.";
  // Early routes match the pattern-and-Stabilization economy.
  const newCosts={"1-2":3,"1-2-2":25,"1-3-1":8,"1-3-2":8,"1-4-1":10,"1-4-2":8,
    "2-1-2":5,"2-2":2,"2-3-1":5,"2-3-2":5,"2-3-3":3,"2-4-1":10,"2-4-2":10,
    "3-2":5,"3-2-1":3,"3-2-2":15,"3-3":5,"3-4-1":5,"3-4-2":25,"3-4-3":10,"3-2-3":10,
    "4-1":1,"4-2":3,"4-3-1":8,"4-3-2":5,"4-3-3":10,"4-4-1":10};
  Object.entries(newCosts).forEach(function (entry) {
    const skill=Game.CONFIG.PRESTIGE.skills[entry[0]];
    skill.cost=String(entry[1]);
  });
  const skills=Game.CONFIG.PRESTIGE.skills;
  skills["2-3-1"].requires="2-1";
  skills["2-3-2"].requires="2-1";
  skills["2-3-3"].requires="2-3-1";
  skills["3-3"].requires="3-1";
  skills["4-3-2"].requires="4-1";
  skills["4-4-1"].requires="4-3-2";
  skills["4-1"].foundationMultiplier="2";skills["4-1"].coherenceMultiplier="2";
  skills["4-1"].description="Multiply all Energy by ×2 and both Coherent Energy Resonance outputs by ×2. Space Quantum Resonance soft-cap thresholds ×3.3 apart instead of ×3; the first remains at 100. A stronger foundation for rebuilding and Stabilizing.";
  skills["4-2"].energyMultiplier="2";
  skills["4-2"].description="Multiply all Energy gained by ×2. Combines multiplicatively with other Energy bonuses.";
  Game.CONFIG.IDLE_FLOW={startingEnergy:"100",seedInterval:10,seedAmount:"1",growthInterval:60};
  delete Game.CONFIG.STRUCTURE.maxStabilizations;
  Game.CONFIG.GENERATORS[0].smoothAt=0;
  Game.CONFIG.CLICK_ACHIEVEMENT.multiplier="1.03";Game.CONFIG.CLICK_ACHIEVEMENT.requiredClicks="1";
  const idleSkills={
    "1-1":{name:"Focused production",cost:"1",description:"Multiply all Energy production by ×4. Applies immediately and to every future run."},
    "1-2":{name:"Gathered momentum",cost:"2",generatorEnergyMultiplier:"2",description:"Double Energy Disturbance output, including all accumulated Field Excitation growth."},
    "1-2-1":{name:"Living field",cost:"4",generatorEnergyMultiplier:"1.25",description:"Multiply Energy Disturbance output by ×1.25. While it is producing, gain one added Energy Disturbance every 10 game seconds. Added units benefit from patterns without raising purchase prices."},
    "1-2-2":{name:"Perpetual formation",cost:"12",interval:"10",productionMultiplier:"1.5",description:"Multiply Energy Disturbance production and both Coherent Energy and Field Excitation outputs by ×1.5. Applies continuously."},
    "1-4-2":{cost:"3",description:"Purchased Energy Disturbances improve their production efficiency: multiply output by 30 / max(1, 30 − 0.025 × purchased). Added units receive the same efficiency bonus."},"1-3-1":{cost:"6"},"1-3-2":{cost:"8"},
    "1-4-1":{name:"Shared foundation",cost:"10",supportPerPattern:"1.03",description:"Each completed purchased Energy Disturbance pattern multiplies both Resonance outputs and Field Excitation growth by ×1.03. Applies to past and future patterns."},
    "1-5-1":{cost:"40"},
    "1-5-2":{name:"Patient formation",cost:"8",description:"Every 60 game seconds, add one unit of each Primordial generator that is already owned and producing. These are added units; prices and purchased patterns are unchanged."},
    "2-1-2":{cost:"1"},"2-2":{cost:"1",positiveStrengthMultiplier:"1.1",description:"Fluct rolls every 6.66666 game seconds instead of 10. Positive Fluct reinforcement is 10% stronger, applying ×1.32 around stable strength instead of ×1.20."},
    "2-3-1":{cost:"4",resonanceOutputMultiplier:"1.5",quantumSlowdownSeconds:"0.5",description:"Multiply both Resonance outputs by ×1.5 and halve the rate at which Quantum Resonance production resistance grows. Payouts still arrive every second."},
    "2-3-2":{cost:"4",description:"Energy Resonance output is calculated from 25 seconds of reference work instead of 30, increasing its production by 20%. Payouts still arrive every second."},
    "2-3-3":{cost:"3",resonanceEffectMultiplier:"1.5",quantumSlowdownEvery:"20",description:"Quantum Resonance production resistance increases every 20 produced instead of every 10. Strengthen its contribution to Fluct by 50%. Combines with Gentler resistance."},
    "2-4-1":{cost:"6",energyResonanceMultiplier:"1.25",description:"Normal Energy Resonance production is ×1.25 stronger. Every second, Quantum Resonance production also creates an equal amount of extra Energy Resonance."},
    "2-4-2":{cost:"3",fieldOutputMultiplier:"1.25",description:"Multiply Field Excitation output by ×1.25. Quantum Resonance production also accelerates it. Each second contributes 15 divided by the current Quantum Resonance reference-work duration as extra seconds of field growth. Excess work carries forward."},
    "3-1":{foundationMultiplier:"2",description:"Multiply all Energy by ×2. Field Oscillation holds its peak for 10 seconds in its 60-second cycle. Applies immediately and in every future run."},"3-2-2":{cost:"3",peakMultiplier:"1.5",description:"Strengthen the Field Oscillation peak by ×1.5. At peak, its multiplier and countdown are active only during positive Fluct. Negative Fluct returns output to the baseline and pauses the remaining peak time."},"3-2-3":{cost:"5"},"3-2":{cost:"5"},"3-3":{cost:"3",generatorMultiplier:"1.3",description:"A ×1.3 output-strength bonus moves through the seven Primordial generators, advancing every 30 game seconds. It strengthens the current generator's production or effect."},
    "3-4-1":{cost:"8"},"3-4-2":{cost:"15"},"3-4-3":{cost:"10",generatorMultiplier:"1.5",description:"Wandering rhythm now strengthens two adjacent Primordial generators by ×1.5 each. The pair advances every 30 game seconds."},
    "3-5-1":{cost:"100"},"3-5-2":{cost:"6"},
    "4-3-1":{cost:"6",description:"Lifetime Condenses count twice for both Memory of condensation and the remembered Energy bonus. Applies retroactively. Stabilizations reset after Condense."},"4-3-2":{name:"Efficient formation",cost:"4",intervalReduction:"0",productionMultiplier:"1.25",description:"Multiply Energy Disturbance production, both Resonance outputs and Field Excitation growth by ×1.25. Payouts keep their current cadence."},
    "4-3-3":{cost:"10",description:"Each purchased Field Excitation multiplies its base-growth output by ×1.01. Added and coupled units benefit without increasing the exponent."},
    "4-4-1":{cost:"4",fluctStrengthMultiplier:"1.25",description:"Multiply stable Fluct strength by ×1.25. Quantum Resonance effect resistance starts at 150 instead of 100; later thresholds shift with it."},"4-4-2":{cost:"15"}
  };
  Object.entries(idleSkills).forEach(function (entry) { Object.assign(Game.CONFIG.PRESTIGE.skills[entry[0]],entry[1]); });
  delete Game.CONFIG.PRESTIGE.skills["1-1"].clickMultiplier;
  ["1-2","1-2-1","1-4-1"].forEach(function (id) { delete Game.CONFIG.PRESTIGE.skills[id].productionSeconds;delete Game.CONFIG.PRESTIGE.skills[id].gameSeconds;delete Game.CONFIG.PRESTIGE.skills[id].outputSeconds; });
  Game.CONFIG.PRESTIGE.branches[1].name="Foundation";
  const idleAutomationParents=["1-2","2-2","2-3-2","4-3-3","3-2-1","3-4-1","3-4-2","4-3-1"],idleAutomationCosts=[10,15,20,25,30,40,50,50];
  Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer,index) {
    const skill=Game.CONFIG.PRESTIGE.skills[buyer.skill];skill.cost=String(idleAutomationCosts[index]);skill.requires=idleAutomationParents[index];
    skill.description=(index===7?"Automatically Condense when the available reward reaches your chosen Quanta target.":"Buy the maximum affordable "+Game.CONFIG.GENERATORS[index].name+" each activation.")+" Starts at one attempt every 5 real seconds. Its restricted-run challenge improves this to 1 second at level ten. Configure buyers in Automation. Requires at least one completed Condense.";
  });
  const replaceAchievement=function (id,changes) { Object.assign(Game.CONFIG.DISCOVERY_ACHIEVEMENTS.find(function (a) { return a.id===id; }),changes); };
  replaceAchievement("thousandClicks",{name:"An assembled field",kind:"purchases",amount:"1000",reward:"generators",requirement:"Purchase 1,000 Primordial generators in one run."});
  replaceAchievement("perfectDisturb",{name:"Resonant architecture",kind:"patterns",amount:"25",multiplier:"1.02",requirement:"Complete 25 purchased resonance patterns in one run."});
  replaceAchievement("firstImpulse",{name:"A field that persists",kind:"passive",reward:"energy",multiplier:"1.02",requirement:"Receive the first added generator from Living field or Patient formation."});
  Object.values(Game.CONFIG.PRESTIGE.skills).forEach(function (skill) { skill.description=skill.description.replace(/manually purchased/gi,"purchased"); });
  Game.CONFIG.CHALLENGES.forEach(function (rule) { rule.description=rule.description.replace(/; click payouts are transformed once\./,".").replace(/, Disturb/g,"").replace(/ and Disturb/g,"").replace(/ or Disturb/g,"");if(rule.devDescription)rule.devDescription=rule.devDescription.replace(/ Disturb grants extra levels up to its normal cap\./,""); });
  // 95→96 through 99.9→99.99 double in duration. The finite final
  // approach closes the curve at exactly 30 minutes of work at capacity.
  Game.CONFIG.SYMMETRY.convergence={seconds:1800,bounds:[.94,.95,.96,.97,.98,.99,.999,.9999,1],durations:[20,20,40,80,160,320,640,520]};
  const perfectSkills=[
    ['5-1','Clear harmonics','1e5','3-5-2',{symmetrySpeed:1.5},'Symmetry forms ×1.5 faster, including the final convergence.'],
    ['5-2','Remembered order','3e5','5-1',{startingSymmetry:.10},'Future resets begin with +10 percentage points of Symmetry. Adds to other starting Symmetry bonuses. Applies on the next reset.'],
    ['5-3','Gentle convergence','1e6','5-2',{lateSymmetrySpeed:2},'Symmetry forms ×2 faster from 94% onward.'],
    ['5-4','Persistent geometry','3e6','5-3',{startingSymmetry:.25},'Future resets begin with +25 percentage points of Symmetry. With Remembered order, start at 35% before Asymmetry bonuses. Applies on the next reset.'],
    ['5-5','Perfect cadence','1e7','5-4',{symmetrySpeed:3},'Multiply all Symmetry formation speed by ×3.'],
    ['5-6','Quantized geometry','1e5','4-4-2',{quantaMultiplier:2},'Multiply all Condense Quanta rewards by ×2.'],
    ['5-7','Unbound geometry','5e5','5-6',{energyMultiplier:'1e20'},'Multiply all Energy by ×1e20, after late Energy resistance.'],
    ['5-8','Discrete abundance','2e6','5-7',{perfectQuantaMultiplier:2},'Double Quanta gained while at Perfect Symmetry. Combines with the ×100 Perfect Symmetry bonus.'],
    ['5-9','Fault potential','5e6','5-8',{asymmetryMultiplier:1.5},'Gain ×1.5 Asymmetry when breaking Symmetry. The final reward rounds down to a whole amount.'],
    ['5-10','A richer vacuum','2e7','5-9',{quantaMultiplier:5},'Multiply all Condense Quanta rewards by ×5.']
  ];
  perfectSkills.forEach(function (entry) { Game.CONFIG.PRESTIGE.skills[entry[0]]=Object.assign({name:entry[1],cost:entry[2],requires:entry[3],perfect:true,description:entry[5]},entry[4]); });
  Game.CONFIG.PRESTIGE.branches.push({id:5,name:'Perfect alignment',nodes:perfectSkills.map(function (entry) { return entry[0]; })});
  Game.CONFIG.ASYMMETRY={upgrades:{
    brokenHarmonics:{name:'Broken harmonics',cost:1,scaling:3,max:10,effect:1.2,description:'Each level makes Symmetry form ×1.2 faster, including convergence.'},
    faultMemory:{name:'Fault memory',cost:2,scaling:4,max:8,effect:1.5,description:'Each level multiplies all Condense Quanta rewards by ×1.5.'},
    unboundPotential:{name:'Unbound potential',cost:3,scaling:5,max:10,effect:'1e5',description:'Each level multiplies Energy by ×1e5, after late Energy resistance.'},
    alignedRemnants:{name:'Aligned remnants',cost:5,scaling:5,max:6,effect:.85,description:'Each level reduces accelerating Field Alignment price exponents by 15%. Its opening prices are unchanged.'},
    fracturedPerfection:{name:'Fractured perfection',cost:10,scaling:6,max:5,effect:1.25,description:'Each level multiplies Asymmetry gained by ×1.25. Rewards round down after all bonuses.'},
    residualOrder:{name:'Residual order',cost:5,scaling:4,max:5,startingSymmetry:.02,description:'Each level adds 2 percentage points of starting Symmetry, up to +10 points. Adds to Perfect Alignment starting bonuses. Applies on the next reset.'}
  }};
})(window.CosmicIdle);
