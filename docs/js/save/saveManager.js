(function (Game) {
  function encode() {
    return JSON.stringify(Game.player);
  }
  function restore(raw) {
    const data = JSON.parse(raw);
    if (!data || data.version !== Game.CONFIG.VERSION) throw new Error('Unsupported save version');
    // Renumbered children keep ownership without a refund or another starting unit.
    if (data.prestige && data.prestige.skills) {
      [["3-3-1", "3-4-1"], ["3-3-2", "3-4-2"]].forEach(function (pair) {
        const skills = data.prestige.skills;
        if (skills[pair[0]] !== undefined && skills[pair[1]] === undefined) skills[pair[1]] = skills[pair[0]];
        delete skills[pair[0]];
      });
    }
    // Prior saves used the Quantum name/id for what is now Energy Disturbance.
    if (!data.generatorSchema && data.generators) {
      if (data.generators.quantumFluctuation) data.generators.energyDisturbance = data.generators.quantumFluctuation;
      delete data.generators.quantumFluctuation;
      Object.keys(data.generators).forEach(function (id) {
        const state = data.generators[id];
        state.purchased = state.owned === undefined ? "0" : state.owned;
        state.added = "0";
      });
      data.generatorSchema = 2;
    }
    // Preserve ownership from the former fourth-generator placeholder.
    if (data.generators && data.generators.energyField && !data.generators.fieldExcitation) {
      data.generators.fieldExcitation = data.generators.energyField;
      delete data.generators.energyField;
      if (data.ui && data.ui.collapsed && data.ui.collapsed.energyField !== undefined) {
        data.ui.collapsed.fieldExcitation = data.ui.collapsed.energyField;
        delete data.ui.collapsed.energyField;
      }
    }
    const fresh = Game.createDefaultPlayer();
    function merge(source, defaults, path) {
      if (Array.isArray(defaults)) {
        if (path==="prestige.history") {
          if (!Array.isArray(source) || source.length>10) throw new Error('Invalid Condense history');
          return source.map(function (entry) { return merge(entry,{condense:Game.D(0),quanta:Game.D(0),realSeconds:0,partial:0},path+"[]"); });
        }
        if (!Array.isArray(source) || source.length > 24) throw new Error('Invalid generator timers');
        return source.map(function (value) { return merge(value, Game.D(0)); });
      }
      if (defaults instanceof Decimal) {
        if(path==='settings.autoCondenseTarget' && !Game.Automation.parseCondenseTarget(source)) throw new Error('Invalid auto-Condense target');
        if (typeof source !== 'string' && typeof source !== 'number') throw new Error('Invalid number');
        const value = Game.D(source);
        if (!(Number.isFinite(value.mantissa) && Number.isFinite(value.exponent)) || value.lt(0)) throw new Error('Invalid number');
        return value;
      }
      if (typeof defaults === 'number') {
        if (typeof source !== 'number' || !Number.isFinite(source) || source < 0) throw new Error('Invalid value');
        return source;
      }
      if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid save');
      Object.keys(defaults).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(source, key)) defaults[key] = merge(source[key], defaults[key],path ? path+"."+key : key);
      });
      return defaults;
    }
    const player = merge(data, fresh);
    const challengeVersion=data.challenges && data.challenges.rulesVersion;
    if (challengeVersion!==undefined && ![1,2,3].includes(challengeVersion)) throw new Error('Unsupported challenge rules');
    if(player.challenges.active===5 && (challengeVersion===undefined || challengeVersion<2)) {
      const rule=Game.CONFIG.CHALLENGES[4];
      player.resources.energy=Decimal.max(player.resources.energy,rule.startingEnergy);
      player.challenges.bestEnergy=Decimal.max(player.challenges.bestEnergy,player.resources.energy);
      player.generators.fieldOscillation.added=Decimal.max(player.generators.fieldOscillation.added,rule.startingOscillations);
    }
    player.challenges.highestEnergy=Decimal.max(player.challenges.highestEnergy,player.resources.energy,player.challenges.bestEnergy);
    // Changed challenge rules must not trap an older active run. Keep that run
    // and every earned level; only clear its obsolete challenge restriction.
    if(challengeVersion!==3 && player.challenges.active && player.challenges.active!==5) {
      player.challenges.active=0;player.challenges.bestEnergy=Game.D(0);
    }
    if(player.challenges.active) player.challenges.highestEnergy=Decimal.max(player.challenges.highestEnergy,Game.CONFIG.CHALLENGES[player.challenges.active-1].unlockEnergy);
    player.challenges.rulesVersion=3;
    // Older saves have no real duration for the ongoing run. Track from load
    // and label it partial instead of inferring real time from accelerated time.
    if (data.time && data.time.currentEnergyRunReal===undefined) player.time.currentEnergyRunPartial=Number(player.time.realPlayed>0 || player.time.currentEnergyRun.gt(0));
    if(![0,1].includes(player.prestige.symmetry)) throw new Error('Invalid Symmetry progress');
    if (![0,1].includes(player.time.currentEnergyRunPartial) || player.time.currentEnergyRunReal>player.time.realPlayed+1e-6) throw new Error('Invalid real run duration');
    player.prestige.history.forEach(function (entry,index,history) {
      if (!entry.condense.eq(entry.condense.floor()) || entry.condense.lt(1) || entry.condense.gt(player.prestige.times) || !entry.quanta.eq(entry.quanta.floor()) || entry.quanta.lt(1) || entry.quanta.gt(player.prestige.totalQuanta) || entry.realSeconds>player.time.realPlayed+1e-6 || ![0,1].includes(entry.partial) || index>0 && entry.condense.gte(history[index-1].condense)) throw new Error('Invalid Condense record');
    });
    Game.CONFIG.GENERATORS.forEach(function (gen) {
      const state = player.generators[gen.id];
      if (!state.purchased.eq(state.purchased.floor()) || !state.added.eq(state.added.floor())) throw new Error('Invalid generator count');
    });
    if (!player.stats.manualClicks.eq(player.stats.manualClicks.floor()) || !player.upgrades.clickPower.eq(player.upgrades.clickPower.floor())) throw new Error('Invalid click progression');
    if (!player.stats.autoClicks.eq(player.stats.autoClicks.floor()) || player.stats.autoClicks.gt(player.stats.manualClicks)) throw new Error('Invalid automatic click progress');
    // Timers can drift past their bound through float rounding. Restart the
    // affected cycle instead of rejecting an otherwise valid save.
    if (player.autoClick.elapsed.gte(Game.CONFIG.PRESTIGE.skills["1-2-2"].interval)) player.autoClick.elapsed = Game.D(0);
    const replication=player.disturbanceReplication, replicationRules=Game.CONFIG.PRESTIGE.skills["1-5-1"];
    if (!replication.doubles.eq(replication.doubles.floor())) throw new Error('Invalid replication progress');
    if (replication.elapsed.gte(Game.D(replicationRules.firstInterval).add(replication.doubles.mul(replicationRules.intervalGrowth)))) replication.elapsed = Game.D(0);
    if (!data.stats || data.stats.generatorsBought === undefined) {
      player.stats.generatorsBought = Game.CONFIG.GENERATORS.reduce(function (sum, gen) { return sum.add(player.generators[gen.id].purchased); }, Game.D(0));
    }
    if (![0, 1].includes(player.fluctuation.positive) || player.generatorSchema !== 2) throw new Error('Invalid fluctuation state');
    if (!Number.isInteger(player.fluctuation.negativeStreak) || ![0, 1].includes(player.fluctuation.negativeStreakAchievement)) throw new Error('Invalid Fluct achievement');
    if (!Number.isInteger(player.fluctuation.negativeStreakLevel) || player.fluctuation.negativeStreakLevel>Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.tiers.length || ![0,1].includes(player.fluctuation.positiveChanceMastery)) throw new Error('Invalid Fluct achievement levels');
    player.fluctuation.negativeStreak = Math.min(player.fluctuation.negativeStreak, Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.requiredRolls);
    if (!player.resources.quantumResonance.eq(player.resources.quantumResonance.floor()) || !player.resources.energyResonance.eq(player.resources.energyResonance.floor()) || !player.stats.totalQuantumResonance.eq(player.stats.totalQuantumResonance.floor()) || player.stats.totalQuantumResonance.lt(player.resources.quantumResonance)) throw new Error('Invalid resonance resources');
    if (![0, 1].includes(player.unlocks.fluctOdds) || ![0, 1].includes(player.unlocks.fieldExcitation) || !Object.values(player.ui.collapsed).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid interface settings');
    if (![0, 1].includes(player.ui.skillTree2D)) throw new Error('Invalid tree view');
    ["quantumCarry", "energyCarry"].forEach(function (key) { if (player.coherence[key].gte(1)) player.coherence[key] = player.coherence[key].sub(player.coherence[key].floor()); });
    if (player.fieldExcitation.elapsed.gte(Game.CONFIG.FIELD_EXCITATION.interval)) player.fieldExcitation.elapsed = Game.D(0);
    if (player.fieldDynamics.elapsed.gte(player.prestige.skills["3-2-3"] ? Game.CONFIG.PRESTIGE.skills["3-2-3"].cycle : Game.CONFIG.FIELD_DYNAMICS.cycle)) { player.fieldDynamics.elapsed = Game.D(0);player.fieldDynamics.held = 0; }
    if (![0, 1].includes(player.fieldDynamics.held) || ![0, 1].includes(player.settings.oscillationFreeze)) throw new Error('Invalid Oscillation freeze state');
    if (!player.fluctuation.rollReductionStacks.eq(player.fluctuation.rollReductionStacks.floor())) throw new Error('Invalid Fluct reduction stack');
    if (player.generatorFocus.elapsed.gte(Game.D(Game.CONFIG.PRESTIGE.skills["3-3"].focusSeconds).mul(Game.CONFIG.GENERATORS.length))) player.generatorFocus.elapsed = Game.D(0);
    const settings = player.settings;
    if (settings.autoCondenseTarget.lt(1) || !settings.autoCondenseTarget.eq(settings.autoCondenseTarget.floor())) throw new Error('Invalid auto-Condense target');
    if (!Object.values(player.achievements).concat(Object.values(player.lore)).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid permanent progress');
    if (![player.prestige.quanta, player.prestige.totalQuanta, player.prestige.times].every(function (value) { return value.eq(value.floor()); }) || player.prestige.totalQuanta.lt(player.prestige.quanta)) throw new Error('Invalid Primordial Quanta');
    if (!Object.values(player.prestige.skills).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid skill progress');
    if (![settings.sound, settings.muteUnfocused, settings.clickSound, settings.autoClickSound, settings.bubbleSound, settings.perkSound, settings.perkVisuals, settings.generatorSound, settings.fluctuationSound, settings.coherentSound, settings.fieldSound, settings.condenseSound, settings.condenseVisuals, settings.autoDismiss, settings.offlineProgress, player.lore.introductionSeen, player.lore.coherenceSeen, player.lore.fieldFirstSeen, player.lore.fieldSecondSeen].every(function (value) { return value === 0 || value === 1; }) || settings.volume > 1 || ![0, 1, 2].includes(settings.visuals)) throw new Error('Invalid settings');
    Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
      const state=player.automation.buyers[buyer.id], toggle=player.settings.autoBuyers[buyer.id];
      if (![0,1].includes(toggle) || !Number.isInteger(state.level) || state.level>10) throw new Error('Invalid automation progress');
      if (state.elapsed>=(50-4*state.level)/10) state.elapsed=0;
    });
    const challenge=player.challenges;
    if (!Number.isInteger(challenge.active) || challenge.active<0 || challenge.active>8) throw new Error('Invalid challenge run');
    if(![challenge.failed,challenge.qualified,challenge.resetArmed].every(function (v) { return v===0 || v===1; }) || ![challenge.purchases,challenge.resets,challenge.latestGenerator].every(Number.isInteger) || challenge.latestGenerator>7 || challenge.lastPurchase>challenge.elapsed+1e-6) throw new Error('Invalid challenge clocks');
    if(challenge.active===1 && !challenge.failed && !challenge.qualified && challenge.elapsed>30-player.automation.buyers.energyDisturbance.level+1e-6) throw new Error('Invalid challenge deadline');
    if(challenge.active===4 && challenge.resetArmed && !challenge.qualified && challenge.resetAt<challenge.elapsed-1e-6) throw new Error('Invalid collapse clock');
    if (challenge.active) {
      const buyer=Game.CONFIG.AUTOMATION.buyers[challenge.active-1];
      if (!player.prestige.skills[buyer.skill] || player.automation.buyers[buyer.id].level>=10) throw new Error('Invalid active challenge');
      challenge.bestEnergy=Decimal.max(challenge.bestEnergy,player.resources.energy);
      const rule=Game.CONFIG.CHALLENGES[challenge.active-1];
      if (rule.blocked && rule.blocked.some(function (id) { return player.generators[id].purchased.gt(0) || player.generators[id].added.gt(0); })) throw new Error('Forbidden challenge generator');


    }
    Game.Progression.captureAchievements(player);
    Game.player = player;
  }
  function status(message) { if (Game.UI) Game.UI.setSaveStatus(message); }
  const BACKUP_KEY = Game.CONFIG.SAVE_KEY + ":backup", RECOVERY_KEY = Game.CONFIG.SAVE_KEY + ":recovery";
  function readStore(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function writeStore(key, value) { try { localStorage.setItem(key, value); return true; } catch (error) { return false; } }
  Game.Save = {
    restore: restore,
    save: function () {
      try {
        Game.Progression.captureAchievements();
        Game.player.time.savedAt = Date.now();
        localStorage.setItem(Game.CONFIG.SAVE_KEY, encode());
        status('Saved. Autosave every 10 seconds.');
        return true;
      } catch (error) {
        status('Browser saving unavailable. Export your save to keep your progress.');
        return false;
      }
    },
    load: function () {
      let raw = null;
      try {
        raw = localStorage.getItem(Game.CONFIG.SAVE_KEY);
        if (!raw) return false;
        restore(raw);
        // The session's starting point becomes the backup for this session.
        writeStore(BACKUP_KEY, raw);
        return true;
      } catch (error) {
        // Keep the unreadable save aside so autosave cannot destroy it.
        if (raw && readStore(RECOVERY_KEY) === null) writeStore(RECOVERY_KEY, raw);
        status('Your previous save could not be read. It was kept aside; use Export unreadable save in Settings to keep a copy.');
        return false;
      }
    },
    hasBackup: function () { return readStore(BACKUP_KEY) !== null; },
    hasRecovery: function () { return readStore(RECOVERY_KEY) !== null; },
    restoreBackup: function () {
      const raw = readStore(BACKUP_KEY);
      if (!raw || !confirm('Return to the save from the start of this session? Progress since then will be lost.')) return false;
      try { restore(raw); } catch (error) { alert('The backup could not be read. Your game has not changed.'); return false; }
      if (Game.Experience) Game.Experience.syncPlayer();
      this.save();if (Game.UI) Game.UI.render();status('Backup restored.');return true;
    },
    recoveryText: function () { const raw = readStore(RECOVERY_KEY);return raw ? btoa(raw) : ""; },
    discardRecovery: function () { try { localStorage.removeItem(RECOVERY_KEY); } catch (error) {} },
    exportText: function () { Game.Progression.captureAchievements();Game.player.time.savedAt = Date.now();return btoa(encode()); },
    exportSave: function () { if (Game.UI && Game.UI.openSaveDialog) Game.UI.openSaveDialog("export"); else prompt('Copy your save:', this.exportText()); },
    importText: function (encoded) {
      const text = String(encoded || "").trim();
      if (!text) return false;
      const previous = encode();
      try {
        restore(atob(text));
      } catch (error) { return false; }
      writeStore(BACKUP_KEY, previous);
      if (Game.Experience) Game.Experience.syncPlayer();
      const saved = this.save();
      if (Game.UI) Game.UI.render();
      if (saved) status('Save imported. Your previous progress is kept as a backup.');
      return true;
    },
    importSave: function () {
      if (Game.UI && Game.UI.openSaveDialog) { Game.UI.openSaveDialog("import");return; }
      const encoded = prompt('Paste your save:');
      if (encoded && !this.importText(encoded)) alert('That save is invalid or belongs to a different version. Your game has not changed.');
    },
    hardReset: function () {
      if (!confirm('Erase all progress, including Primordial Quanta, achievements, lore, and playtime? This replaces your current save.')) return;
      writeStore(BACKUP_KEY, encode());
      Game.resetPlayer();
      if (Game.Experience) Game.Experience.syncPlayer();
      this.save();
      Game.UI.render();
    }
  };
})(window.CosmicIdle);

