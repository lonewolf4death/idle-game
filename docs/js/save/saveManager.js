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
    // Fixed Unified prices ignore the former per-run price anchor. Merge
    // retains all current resources, discoveries and purchased upgrades.
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
    player.ui.skillTree2D=1; // Legacy 3D preferences now use the readable map.
    if (!data.structure) {
      // Economic migration never resets progress. Honor every previously
      // reached generator stage, including stages earned in an earlier run.
      let stage=player.prestige.times.gt(0)?4:0;
      const high=Decimal.max(player.resources.energy,player.stats.totalEnergy,player.challenges.highestEnergy);
      Game.CONFIG.GENERATORS.forEach(function (gen,index) {
        if(index>=3 && (high.gte(gen.unlockEnergy) || player.generators[gen.id].purchased.add(player.generators[gen.id].added).gt(0))) stage=Math.max(stage,index-2);
      });
      player.structure.stabilizations=Game.D(stage);player.structure.bestEnergy=player.resources.energy;player.structure.migrated=1;
      if(stage) player.lore.stabilizationSeen=1;
    }
    const structure=player.structure;
    if(structure.economyVersion!==1 || !structure.stabilizations.eq(structure.stabilizations.floor()) || ![structure.recovered,structure.migrated].every(function (v) { return v===0 || v===1; }) || structure.recoverySeconds>structure.elapsed+1e-6) throw new Error('Invalid field structure');
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
      if (!state.purchased.eq(state.purchased.floor())) throw new Error('Invalid generator count');
    });
    if (!player.stats.manualClicks.eq(player.stats.manualClicks.floor()) || !player.upgrades.clickPower.eq(player.upgrades.clickPower.floor())) throw new Error('Invalid click progression');
    if (!player.stats.autoClicks.eq(player.stats.autoClicks.floor()) || player.stats.autoClicks.gt(player.stats.manualClicks) || player.autoClick.elapsed.gte(Game.CONFIG.PRESTIGE.skills["1-2-2"].interval)) throw new Error('Invalid automatic click progress');
    const replication=player.disturbanceReplication, replicationRules=Game.CONFIG.PRESTIGE.skills["1-5-1"];
    if (!replication.doubles.eq(replication.doubles.floor()) || replication.elapsed.gte(Game.D(replicationRules.firstInterval).add(replication.doubles.mul(replicationRules.intervalGrowth)))) throw new Error('Invalid replication progress');
    if (!data.stats || data.stats.generatorsBought === undefined) {
      player.stats.generatorsBought = Game.CONFIG.GENERATORS.reduce(function (sum, gen) { return sum.add(player.generators[gen.id].purchased); }, Game.D(0));
    }
    if (![0, 1].includes(player.fluctuation.positive) || player.generatorSchema !== 2) throw new Error('Invalid fluctuation state');
    if (!Number.isInteger(player.fluctuation.negativeStreak) || ![0, 1].includes(player.fluctuation.negativeStreakAchievement)) throw new Error('Invalid Fluct achievement');
    if (!Number.isInteger(player.fluctuation.negativeStreakLevel) || player.fluctuation.negativeStreakLevel>Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.tiers.length || ![0,1].includes(player.fluctuation.positiveChanceMastery)) throw new Error('Invalid Fluct achievement levels');
    player.fluctuation.negativeStreak = Math.min(player.fluctuation.negativeStreak, Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.requiredRolls);
    if (player.stats.totalQuantumResonance.lt(player.resources.quantumResonance)) throw new Error('Invalid resonance resources');
    if (![0, 1].includes(player.unlocks.fluctOdds) || ![0, 1].includes(player.unlocks.fieldExcitation) || !Object.values(player.ui.collapsed).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid interface settings');
    if (![0, 1].includes(player.ui.skillTree2D)) throw new Error('Invalid tree view');
    if(player.flow.seedElapsed.gte(Game.CONFIG.IDLE_FLOW.seedInterval)||player.flow.growthElapsed.gte(Game.CONFIG.IDLE_FLOW.growthInterval)||!player.flow.pulses.eq(player.flow.pulses.floor())) throw new Error('Invalid formation progress');
    if (player.coherence.quantumCarry.gte(1) || player.coherence.energyCarry.gte(1)) throw new Error('Invalid resonance progress');
    if (player.fieldExcitation.elapsed.gte(Game.CONFIG.FIELD_EXCITATION.interval)) throw new Error('Invalid Field Excitation timer');
    if (player.fieldDynamics.elapsed.gte(player.prestige.skills["3-2-3"] ? Game.CONFIG.PRESTIGE.skills["3-2-3"].cycle : Game.CONFIG.FIELD_DYNAMICS.cycle)) throw new Error('Invalid Field Oscillation timer');
    if (![0, 1].includes(player.fieldDynamics.held) || ![0, 1].includes(player.settings.oscillationFreeze)) throw new Error('Invalid Oscillation freeze state');
    if (!player.fluctuation.rollReductionStacks.eq(player.fluctuation.rollReductionStacks.floor())) throw new Error('Invalid Fluct reduction stack');
    if (player.generatorFocus.elapsed.gte(Game.D(Game.CONFIG.PRESTIGE.skills["3-3"].focusSeconds).mul(Game.CONFIG.GENERATORS.length))) throw new Error('Invalid generator focus timer');
    const settings = player.settings;
    if(![settings.confirmBreak,settings.confirmCondense,settings.confirmStabilize].every(function (value) { return value===0 || value===1; })) throw new Error('Invalid confirmation settings');
    if(!Object.values(settings.animations).every(function (value) { return value===0 || value===1; })) throw new Error('Invalid animation settings');
    if(![0,1,2,3].includes(settings.audioTheme) || ![0,1].includes(settings.visualTheme) || ![0,1].includes(settings.resetVisuals)) throw new Error('Invalid presentation settings');
    if(!Object.values(player.ui.attention).every(function (value) { return Number.isSafeInteger(value) && value>=0; })) throw new Error('Invalid discovery acknowledgement');
    const asymmetry=player.asymmetry;
    if(![asymmetry.amount,asymmetry.total,asymmetry.times].every(function (value) { return value.eq(value.floor()); }) || asymmetry.amount.gt(asymmetry.total)) throw new Error('Invalid Asymmetry');
    Object.keys(asymmetry.upgrades).forEach(function (id) { const level=asymmetry.upgrades[id];if(!Number.isInteger(level) || level>Game.CONFIG.ASYMMETRY.upgrades[id].max) throw new Error('Invalid Asymmetry upgrade'); });
    if (settings.autoCondenseTarget.lt(1) || !settings.autoCondenseTarget.eq(settings.autoCondenseTarget.floor())) throw new Error('Invalid auto-Condense target');
    if (!Object.values(player.achievements).concat(Object.values(player.lore)).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid permanent progress');
    if (![player.prestige.quanta, player.prestige.totalQuanta, player.prestige.times].every(function (value) { return value.eq(value.floor()); }) || player.prestige.totalQuanta.lt(player.prestige.quanta)) throw new Error('Invalid Primordial Quanta');
    if (!Object.values(player.prestige.skills).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid skill progress');
    if (![settings.sound, settings.muteUnfocused, settings.clickSound, settings.autoClickSound, settings.bubbleSound, settings.perkSound, settings.perkVisuals, settings.generatorSound, settings.fluctuationSound, settings.coherentSound, settings.fieldSound, settings.condenseSound, settings.condenseVisuals, settings.autoDismiss, player.lore.introductionSeen, player.lore.coherenceSeen, player.lore.fieldFirstSeen, player.lore.fieldSecondSeen].every(function (value) { return value === 0 || value === 1; }) || settings.volume > 1 || ![0, 1, 2].includes(settings.visuals)) throw new Error('Invalid settings');
    Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
      const state=player.automation.buyers[buyer.id], toggle=player.settings.autoBuyers[buyer.id];
      if (![0,1].includes(toggle) || !Number.isInteger(state.level) || state.level>10 || state.elapsed>Game.CONFIG.STRUCTURE.basicBuyerInterval || state.elapsed<0) throw new Error('Invalid automation progress');
      const interval=player.prestige.skills[buyer.skill]?(50-4*state.level)/10:Game.CONFIG.STRUCTURE.basicBuyerInterval;
      if (state.elapsed>=interval+1e-9) throw new Error('Invalid automation timer');
    });
    const stabilizer=player.automation.buyers.stabilize;
    if(![0,1].includes(player.settings.autoBuyers.stabilize) || stabilizer.level!==0 || stabilizer.elapsed<0 || stabilizer.elapsed>Game.CONFIG.STRUCTURE.basicBuyerInterval) throw new Error('Invalid Stabilize automation');
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
    const symmetry=player.symmetry;
    if(symmetry.pulseElapsed.gte(8) || symmetry.amount.gt(1) || symmetry.best.gt(1) || symmetry.best.lt(symmetry.amount) || !symmetry.alignment.eq(symmetry.alignment.floor()) || !symmetry.alignmentAdded.eq(symmetry.alignmentAdded.floor()) || !Object.values(symmetry.upgrades).every(function (v) { return v===0 || v===1; })) throw new Error('Invalid Symmetry progress');
    if(Object.keys(symmetry.upgrades).some(function(id){return symmetry.upgrades[id] && symmetry.best.lt(Game.CONFIG.SYMMETRY.upgrades[id].perfect?1:.5);})) throw new Error('Invalid Unified Interaction unlock');
    if(![0,1].includes(player.ui.generatorLayer)) throw new Error('Invalid generator layer');
    if(!player.prestige.symmetry && (symmetry.amount.gt(0) || symmetry.best.gt(0) || symmetry.alignment.gt(0) || symmetry.alignmentAdded.gt(0) || Object.values(symmetry.upgrades).some(Boolean))) throw new Error('Locked Symmetry progress');
    player.lateEnergy.highest=Decimal.max(player.lateEnergy.highest,player.resources.energy);
    Game.Progression.captureAchievements(player);
    Game.player = player;
  }
  const backupKey=Game.CONFIG.SAVE_KEY+':backups',protectedKey=Game.CONFIG.SAVE_KEY+':protected',loadedKey=Game.CONFIG.SAVE_KEY+':lastLoaded';
  function status(message) { Game.Save.lastMessage=message;if (Game.UI) Game.UI.setSaveStatus(message); }
  function backups() { try { const rows=JSON.parse(localStorage.getItem(backupKey)||'[]');return Array.isArray(rows)?rows.filter(function(row){return row&&typeof row.raw==='string';}).slice(0,5):[]; } catch(error) { return []; } }
  function preserve(raw,label) {
    if(!raw) return;
    try { const rows=backups().filter(function(row){return row.raw!==raw;});rows.unshift({raw:raw,label:label,at:Date.now()});localStorage.setItem(backupKey,JSON.stringify(rows.slice(0,5))); } catch(error) { /* Saving remains usable if backup storage is full. */ }
  }
  function protect(raw,message) {
    Game.Save.writeProtected=true;Game.Save.protectionReason=message;
    try { if(raw && !localStorage.getItem(protectedKey)) localStorage.setItem(protectedKey,raw); } catch(error) { /* The primary remains untouched. */ }
    status(message+' Autosave paused; the stored save has not been replaced.');
  }
  function exportRaw(raw,title) { if(raw) prompt(title,btoa(unescape(encodeURIComponent(raw)))); }
  Game.Save = {
    writeProtected:false,protectionReason:'',lastMessage:'',observedRaw:undefined,
    beginNewSession:function () { this.writeProtected=false;this.protectionReason='';try { this.observedRaw=localStorage.getItem(Game.CONFIG.SAVE_KEY); } catch(error) { this.observedRaw=undefined; } },
    backupEntries:function () {
      const rows=backups();
      try { const raw=localStorage.getItem(loadedKey);if(raw && !rows.some(function(row){return row.raw===raw;})) rows.push({raw:raw,label:'Last successfully loaded save',at:0}); } catch(error) { /* Optional checkpoint. */ }
      return rows;
    },
    save: function () {
      if(this.writeProtected) { status(this.protectionReason+' Autosave paused; the stored save has not been replaced.');return false; }
      try {
        const previous=localStorage.getItem(Game.CONFIG.SAVE_KEY);
        if(this.observedRaw!==undefined && previous!==this.observedRaw) { protect(previous,'Another tab or game copy changed this save. Export this run before choosing which save to keep.');return false; }
        Game.player.lateEnergy.highest=Decimal.max(Game.player.lateEnergy.highest,Game.player.resources.energy);
        Game.Progression.captureAchievements();
        Game.player.time.lastActiveAt=Game.Offline?Game.Offline.timestamp():Date.now();
        const raw=encode();if(previous && previous!==raw) preserve(previous,'Previous save');
        localStorage.setItem(Game.CONFIG.SAVE_KEY,raw);this.observedRaw=raw;
        status('Saved. Autosave every 10 seconds.');
        return true;
      } catch (error) {
        status('Browser saving unavailable. Export your save to keep your progress.');
        return false;
      }
    },
    load: function () {
      let raw;
      try {
        raw = localStorage.getItem(Game.CONFIG.SAVE_KEY);this.observedRaw=raw;
        if (!raw) { this.writeProtected=false;return false; }
        restore(raw);
        this.writeProtected=false;this.protectionReason='';
        try { localStorage.setItem(loadedKey,raw); } catch(error) { /* Optional checkpoint. */ }
        status('Save loaded. Autosave enabled.');
        return true;
      } catch (error) {
        protect(raw,'Save could not load: '+error.message+'. Open Settings to export the stored save or recover a backup.');
        return false;
      }
    },
    exportSave: function () { Game.Progression.captureAchievements();exportRaw(encode(),'Copy your current run:'); },
    exportStored:function () { try { exportRaw(localStorage.getItem(protectedKey)||localStorage.getItem(Game.CONFIG.SAVE_KEY),'Copy the protected stored save:'); } catch(error) { status('Stored save could not be read.'); } },
    importRaw:function (raw) {
      const old=Game.player,oldRun=encode();
      try {
        restore(raw);
      } catch(error) { Game.player=old;status('Import failed: '+error.message+'. Your current run and stored save were not changed.');return false; }
      preserve(oldRun,'Before import or recovery');
      try { preserve(localStorage.getItem(Game.CONFIG.SAVE_KEY),'Before import or recovery'); } catch(error) { /* Storage may be unavailable. */ }
      this.beginNewSession();
      if(Game.Loop){Game.Loop.accumulator=0;Game.Loop.lastTime=performance.now();}
      const saved=this.save();
      if(Game.Experience) Game.Experience.syncPlayer();if(Game.UI)Game.UI.render();
      if(saved)status('Save imported. Previous data retained in backups.');
      return true;
    },
    recoverBackup:function (index) { const entry=this.backupEntries()[Number(index)];return !!entry && this.importRaw(entry.raw); },
    importSave: function () {
      const encoded = prompt('Paste your Energy-only save:');
      if (!encoded) return;
      try {
        let raw=atob(encoded.trim());try { raw=decodeURIComponent(escape(raw)); } catch(error) { /* Legacy Latin-1 export. */ }
        if(!this.importRaw(raw)) alert('That save could not be loaded. Your existing data has been kept.');
      } catch (error) { alert('That save is invalid or belongs to a different version. Your game has not changed.'); }
    },
    hardReset: function () {
      if (!confirm('Erase all progress, including Primordial Quanta, achievements, lore, playtime, and recovery backups? This replaces your current save.')) return;
      Game.resetPlayer();
      if (Game.AchievementNotices) Game.AchievementNotices.clear();
      [backupKey,protectedKey,loadedKey].forEach(function(key){try { localStorage.setItem(key,''); } catch(error) { /* Best effort after explicit reset. */ }});
      if (Game.Experience) Game.Experience.syncPlayer();
      this.save();
      Game.UI.render();
    }
  };
})(window.CosmicIdle);

