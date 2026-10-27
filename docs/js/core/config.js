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
        "1-5-2": { name: "Fleeting potential", cost: "25", requires: "1-4-1", spawnSeconds: 10, growSeconds: 2, graceSeconds: 0.25, description: "Every 10 seconds spent viewing the Energy field, a small potential bubble forms. Click it during its green-ring window to gain 1 added unit of every available generator. The window lasts 0.25 real seconds, unaffected by game speed. Added units do not count as purchases. Missed bubbles fade without a penalty." },
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
        "3-2-1": { name: "Held in anticipation", cost: "5", requires: "3-2", freezeBeforePeak: "0.25", description: "Unlock a toggle on Gen 5 (Field Oscillation). When enabled, its cycle freezes 0.25 game seconds before peak. Click the Energy field or Release peak to apply the peak when you choose. Other generators and game time continue normally." },
        "2-2": { name: "Quickening potential", cost: "5", requires: "2-1", rollInterval: "6.66666", description: "Gen 2 (Quantum Fluctuation) rolls every 6.66666 game seconds instead of 10. Keeps the current cycle's progress when unlocked." },
        "3-1": { name: "Lasting oscillation", cost: "1", peakSeconds: "10", description: "Gen 5 (Field Oscillation) rises for 50 seconds and holds its peak for 10 seconds. Total cycle: 60 seconds." },
        "3-2": { name: "First rhythm", cost: "10", requires: "3-1", startingOscillations: "1", description: "Begin each run with 1 free Gen 5 (Field Oscillation). Unlocking this skill also grants it to your current run. Free units count as added, not purchased." },
        "1-3-1": { name: "Accumulated disturbance", cost: "20", requires: "1-2", baseMultiplierPerPurchased: "1.005", description: "Multiply Gen 1 (Energy Disturbance)'s entire base output, including accumulated Field Excitation growth, by ×1.005 for each manually purchased Gen 1. Added units benefit from the multiplier without increasing its exponent. Applies immediately to past purchases and future output." },
        "1-2-2": { name: "Self-sustaining impulse", cost: "50", requires: "1-2-1", interval: "9", description: "Once Disturb reaches its maximum level, generate a full click every 9 game seconds. Includes click bonuses, Echo of creation, peak release, and A step through time's 0.33-second advance. That advance also progresses this timer. Progress is saved; a fresh run begins with no timer progress." },
        "1-3-2": { name: "Gathering potential", cost: "20", requires: "1-2", countPower: "1.1", description: "Raise Gen 1 (Energy Disturbance)'s total purchased + added count to the power of 1.1 for production. Purchase costs, achievements, and timer smoothing still use the actual count." },
        "2-3-1": { name: "Gentler resistance", cost: "20", requires: "2-2", quantumSlowdownSeconds: "0.9", description: "The Quantum Resonance production interval grows by 0.9 seconds per slowdown milestone instead of 1 second." },
        "2-3-2": { name: "Returning resonance", cost: "20", requires: "2-2", energyInterval: "25", description: "Gen 3 (Coherent Energy) produces Energy Resonance every 25 game seconds instead of 30. Keeps the current cycle's progress when unlocked." },
        "2-3-3": { name: "Wider cadence", cost: "10", requires: "2-2", quantumSlowdownEvery: "11", description: "The Quantum Resonance interval increases every 11 Quantum Resonance produced instead of every 10. Combines with the 0.9-second slowdown upgrade." },
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

    FLUCTUATION: { positiveChance: 0.54, base: "1.05", growth: "1.001", rollInterval: "10", negativePenaltyScale: "0.95" },
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
})(window.CosmicIdle);
