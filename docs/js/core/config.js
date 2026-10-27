(function (Game) {
  Game.CONFIG = {
    VERSION: 2,
    SAVE_KEY: "cosmicIdleEnergyV2",
    SIMULATION_TPS: 20,
    AUTOSAVE_MS: 10000,
    OFFLINE: { maxSeconds: 86400, minSeconds: 30, frameBudgetMs: 40 },

    ENERGY: {
      manualGain: "1"
    },

    CLICK_UPGRADE: {
      name: "Disturb",
      unlockEnergy: "5",
      baseCost: "5",
      gainPerLevel: "2",
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
      { id:"firstImpulse", name:"An impulse of its own", kind:"autoClicks", amount:"1", reward:"energy", multiplier:"1.01", icon:"time", requirement:"Trigger your first automatic impulse." },
      { id:"billionEnergy", name:"A billion sparks", kind:"energy", amount:"1e9", reward:"clicks", multiplier:"1.05", icon:"spark", requirement:"Hold 1e9 Energy at once." },
      { id:"thirtyOrders", name:"Thirty orders deep", kind:"energy", amount:"1e30", reward:"generators", multiplier:"1.02", icon:"growing", requirement:"Hold 1e30 Energy at once." },
      { id:"googolEnergy", name:"A googol of potential", kind:"energy", amount:"1e100", reward:"energy", multiplier:"1.03", icon:"growing", requirement:"Hold 1e100 Energy at once." },
      { id:"thousandFlucts", name:"A thousand uncertainties", kind:"owned", generator:"quantumFluctuation", amount:"1000", reward:"generators", multiplier:"1.02", icon:"quantumFluctuation", requirement:"Own 1,000 purchased Gen 2 (Quantum Fluctuation) in one run." },
      { id:"crowdedField", name:"A crowded field", kind:"owned", generator:"fieldExcitation", amount:"100", reward:"generators", multiplier:"1.02", icon:"fieldExcitation", requirement:"Own 100 purchased Gen 4 (Field Excitation) in one run." },
      { id:"coupledUniverse", name:"A coupled universe", kind:"owned", generator:"fieldCoupling", amount:"50", reward:"generators", multiplier:"1.02", icon:"fieldCoupling", requirement:"Own 50 purchased Gen 7 (Field Coupling) in one run." },
      { id:"fiveCondenses", name:"A habit of condensing", kind:"condenses", amount:"5", reward:"energy", multiplier:"1.02", icon:"condense", requirement:"Condense Energy 5 times." },
      { id:"fiftyCondenses", name:"Familiar states", kind:"condenses", amount:"50", reward:"energy", multiplier:"1.03", icon:"condense", requirement:"Condense Energy 50 times." },
      { id:"hundredQuanta", name:"A hundred quanta", kind:"quanta", amount:"100", reward:"energy", multiplier:"1.02", icon:"quanta", requirement:"Earn 100 lifetime Primordial Quanta." },
      { id:"thousandQuanta", name:"A thousand quanta", kind:"quanta", amount:"1000", reward:"energy", multiplier:"1.03", icon:"quanta", requirement:"Earn 1,000 lifetime Primordial Quanta." },
      { id:"halfConstellation", name:"Half a constellation", kind:"skills", amount:"23", reward:"generators", multiplier:"1.03", icon:"achievements", requirement:"Own 23 skills in the Condense skill tree." },
      { id:"fullConstellation", name:"The full constellation", kind:"skills", amount:"all", reward:"energy", multiplier:"1.05", icon:"achievements", requirement:"Own every skill in the Condense skill tree." },
      { id:"firstTrial", name:"Altered rules", kind:"challenges", amount:"1", reward:"energy", multiplier:"1.01", icon:"negative", requirement:"Complete any challenge level." },
      { id:"fortyTrials", name:"Seasoned in strange physics", kind:"challenges", amount:"40", reward:"energy", multiplier:"1.03", icon:"negative", requirement:"Complete 40 challenge levels in total." },
      { id:"allTrials", name:"Every rule bent", kind:"challenges", amount:"80", reward:"energy", multiplier:"1.05", icon:"negative", requirement:"Complete all 80 challenge levels." },
      { id:"firstBreak", name:"The mirror cracks", kind:"symmetry", amount:"1", reward:"energy", multiplier:"1.05", icon:"symmetry", requirement:"Break Symmetry for the first time." },
      { id:"firstAtom", name:"Something that holds", kind:"atom", amount:"1", reward:"energy", multiplier:"1.1", icon:"symmetry", requirement:"Form the first stable atom." }
    ],
    // First Condense at 1e10 for 1 Quanta; +1 per ×1e10 up to 1e50 (5 Quanta),
    // then +1 per order of magnitude, so late runs pay as before.
    PROGRESSION: { prestigeEnergy: "1e10", earlyStep: 10, fullRateEnergy: "1e50" },
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
        unlockEnergy: "50",
        baseCost: "50",
        costScaling: "1.10",
        burstInterval: "30",
        smoothAt: 25,
        sparksPerBurst: 5,
        burstProduction: "60",
        production: "1"
      },
      {
        id: "quantumFluctuation",
        name: "Quantum Fluctuation",
        type: "fluctuation",
        unlockEnergy: "150",
        baseCost: "150",
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
        unlockEnergy: "1e3",
        baseCost: "1e3",
        costScaling: "1.35",
        scalingStepLevels: 5,
        scalingStepIncrease: "0.15",
        production: "0"
      },
      {
        id: "fieldExcitation",
        name: "Field Excitation",
        type: "field",
        unlockEnergy: "1e5",
        baseCost: "1e5",
        costScaling: "1.10",
        scalingStepLevels: 30,
        scalingStepIncrease: "0.3",
        production: "0"
      },
      { id: "fieldOscillation", name: "Field Oscillation", type: "oscillation", unlockEnergy: "1e7", baseCost: "1e7", costScaling: "2", scalingStepLevels: 5, scalingStepIncrease: "0.25", production: "0" },
      { id: "fieldResonance", name: "Field Resonance", type: "resonance", unlockEnergy: "1e11", baseCost: "1e11", costScaling: "1.5", scalingStepLevels: 5, scalingStepIncrease: "0.125", production: "0" },
      { id: "fieldCoupling", name: "Field Coupling", type: "coupling", unlockEnergy: "1e18", baseCost: "1e18", costScaling: "2", scalingStepLevels: 5, scalingStepIncrease: "0.5", production: "0" }
    ]
  };
  // Second layer. Breaking Symmetry resets the run, Quanta, Condenses and Mass
  // (the skill tree stays) for Broken Symmetries, which buy permanent perks
  // and open Gen 8–10.
  Game.CONFIG.SYMMETRY = {
    name: "Break Symmetry",
    // Late runs reach thousands of orders of magnitude, so rewards and costs
    // scale with Energy's exponent: one more Broken Symmetry each time the
    // exponent doubles past 100, and each Gen 8–10 unit costs a fixed number
    // of extra orders of magnitude.
    unlockEnergy: "1e100",
    atomMass: "1e20",
    massEnergyPower: 0.2,
    massRewardStep: 0.1,
    lore: "The field was perfectly balanced, and balance cannot build. Something tips. The mirror cracks, and what falls out of it has weight.",
    atomLore: "Mass gathers, binds and holds. For the first time, something exists that does not fade back into the field: a stable atom. Existence has structure.",
    structures: [
      { id: "symmetryBreaking", name: "Symmetry Breaking", baseCost: "1e100", costScaling: "1e50", description: "Produces 1 Mass per game second. Mass strengthens all Energy and adds Broken Symmetries." },
      { id: "massiveParticles", name: "Massive Particles", baseCost: "1e300", costScaling: "1e150", interval: "10", perk: "particles", description: "Every 10 game seconds, each unit creates one added Gen 8 (Symmetry Breaking)." },
      { id: "bindingForce", name: "Binding Force", baseCost: "1e500", costScaling: "1e200", massMultiplier: "10", perk: "binding", description: "Each unit multiplies Mass production by ×10." }
    ],
    perks: [
      { id: "headStart", name: "Head start", cost: "1", startingEnergy: "1e30", description: "Begin every run with 1e30 Energy." },
      { id: "particles", name: "Massive particles", cost: "2", description: "Unlock Gen 9 (Massive Particles), which creates Gen 8 units over time." },
      { id: "quanta", name: "Asymmetric quanta", cost: "2", quantaMultiplier: "2", description: "Condensing grants ×2 Primordial Quanta." },
      { id: "memory", name: "Lasting memory", cost: "3", description: "Breaking Symmetry keeps your lifetime Condense count for Memory of condensation." },
      { id: "swift", name: "Swift buyers", cost: "3", intervalMultiplier: 0.5, description: "Automation buyers attempt purchases twice as often." },
      { id: "heavyStart", name: "Heavy start", cost: "4", startingSymmetryBreaking: "10", description: "Begin every run with 10 added Gen 8 (Symmetry Breaking)." },
      { id: "binding", name: "Binding force", cost: "5", description: "Unlock Gen 10 (Binding Force), which multiplies Mass production by ×10 per unit." },
      { id: "echo", name: "Echoing mass", cost: "8", description: "Breaking Symmetry halves Mass instead of resetting it." }
    ],
    deeper: { name: "Deeper asymmetry", baseCost: "1", costStep: "1", massMultiplier: "2", description: "Each level doubles Mass production. Each level costs 1 Broken Symmetry more than the last." }
  };
  Game.CONFIG.AUTOMATION = {
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
    {name:"Single voice",unlockEnergy:"1e105",startExponent:12,exponentStep:6,description:"Only the most recently purchased generator has an active effect. All other generator effects and production clocks are paused. Existing resources and accumulated field growth remain."},
    {name:"Silent fluctuations",unlockEnergy:"1e115",startExponent:18,exponentStep:8,blocked:["quantumFluctuation"],description:"Gen 2 (Quantum Fluctuation) is unavailable and Fluct has no effect."},
    {name:"Fading momentum",unlockEnergy:"1e125",startExponent:15,exponentStep:6,description:"Energy production falls continuously to 85% of its previous strength each real second. Any successful generator or Disturb purchase resets this suppression."}
  ];
  Game.CONFIG.CHALLENGES[4].unlockEnergy="1e95";
  Game.CONFIG.SYMMETRY.cost="10000";
  Game.CONFIG.CHALLENGES.forEach(function (rule,index) {
    Game.CONFIG.DISCOVERY_ACHIEVEMENTS.push({id:"challenge"+(index+1),name:rule.name+" · Challenge",kind:"challenge",track:index+1,amount:"1",reward:"none",icon:"condense",requirement:"Complete level one of "+rule.name+". Further milestones: levels 5 and 10."});
  });
  Game.CONFIG.DISCOVERY_ACHIEVEMENTS.push({id:"allChallenges",name:"Eight facets of existence",kind:"allChallenges",amount:"1",reward:"power",multiplier:"1.02",icon:"coherent",requirement:"Complete at least one level of all eight challenges."});
  const automationParents=["1-5-1","2-4-1","2-4-2","4-4-1","3-2-3","3-5-1","3-5-2","4-4-2"];
  // One-line summaries shown first in the skill panel; full rules sit behind a toggle.
  const summaries = {
    "0-0": "×1.05 all Energy for every lifetime Condense. Free.",
    "1-1": "×2 click Energy.",
    "1-2": "Each click also grants 0.25s of generator production.",
    "1-2-1": "Each click advances all generators by 0.33 game seconds instead.",
    "1-2-2": "At max Disturb, an automatic click every 9 seconds.",
    "1-3-1": "Gen 1 output ×1.005 per Gen 1 you bought.",
    "1-3-2": "Gen 1 counts as (owned)^1.1 for production.",
    "1-4-1": "Each click grants 1% of a second of all output.",
    "1-4-2": "Each Gen 1 bought shortens its cycle by 0.025s (min 1s).",
    "1-5-1": "Gen 1 doubles itself after 60s, then 90s, 120s, …",
    "1-5-2": "A bubble appears every 10s; click it for +1 of every generator.",
    "2-1": "+5 points positive Fluct chance, and shows the odds.",
    "2-1-2": "Each negative Fluct in a row makes the next roll 1s sooner.",
    "2-2": "Fluct rolls every 6.7s instead of 10s.",
    "2-3-1": "Quantum Resonance slows down less (0.9s per step).",
    "2-3-2": "Energy Resonance every 25s instead of 30s.",
    "2-3-3": "Quantum Resonance slows every 11 instead of every 10.",
    "2-4-1": "Each Quantum Resonance cycle also grants Energy Resonance.",
    "2-4-2": "Each Quantum Resonance cycle advances Gen 4 by 15s.",
    "3-1": "Oscillation holds its peak for 10s instead of 5s.",
    "3-2": "Start every run with 1 free Gen 5.",
    "3-2-1": "Toggle: freeze Oscillation just before its peak, release with a click.",
    "3-2-2": "Oscillation peak pauses (not lost) while Fluct is negative.",
    "3-2-3": "Oscillation cycle shortened to 45s.",
    "3-3": "A ×1.15 bonus visits each generator for 30s in turn.",
    "3-4-1": "Each Gen 6 strengthens the peak by ×1.033 instead of ×1.025.",
    "3-4-2": "Start every run with 1 free Gen 7.",
    "3-4-3": "The wandering bonus hits two generators at ×1.2.",
    "3-5-1": "Gen 6 counts ×log₂(Quantum Resonance).",
    "3-5-2": "Each Gen 7 bought also counts as a Gen 6.",
    "4-1": "Resonance soft caps spaced ×3.3 apart instead of ×3.",
    "4-2": "×1.2 all Energy.",
    "4-3-1": "Each Condense counts twice for Memory of condensation.",
    "4-3-2": "Timed output arrives 1 second sooner.",
    "4-3-3": "Gen 4 growth ×1.01 per Gen 4 you bought.",
    "4-4-1": "Resonance soft cap starts at 150 instead of 100.",
    "4-4-2": "Quanta bonus uses the higher of unspent or half of lifetime Quanta."
  };
  Object.keys(summaries).forEach(function (id) { Game.CONFIG.PRESTIGE.skills[id].summary = summaries[id]; });
  Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer,index) {
    buyer.title=Game.CONFIG.CHALLENGES[index].name;
    Game.CONFIG.PRESTIGE.skills[buyer.skill]={name:index===7 ? "Automatic condensation" : "Automatic "+Game.CONFIG.GENERATORS[index].name.toLowerCase(),cost:"100",requires:automationParents[index],summary:index===7 ? "Condense automatically at your chosen Quanta target." : "Automatically buy as many "+buyer.name+" as you can afford, every few seconds.",
      description:(index===7 ? "Automatically Condense once the available reward reaches the Quanta target chosen in the Automation tab (default: 1). The normal 1e10 Energy minimum applies; each reset claims the full available reward. Resets the run as normal. Repeat automatic Condenses skip the cinematic." : "Automatically buy Max "+buyer.name+" using available Energy per activation. Respects unlock conditions and current costs; ignores the manual buy quantity.")+" Starts at one attempt every 5 real seconds. Its ten-level restricted-run challenge reduces the interval by 0.4 seconds per level, reaching 1 second. Configure individual buyers or all buyers in the Automation tab. Unlocked automation starts OFF. Timers continue while unfocused, do not bank failed purchases, and restart each run. Challenge progress is permanent."};
    Game.CONFIG.PRESTIGE.branches.find(function (branch) { return branch.id===Number(buyer.skill[0]); }).nodes.push(buyer.skill);
  });
})(window.CosmicIdle);
