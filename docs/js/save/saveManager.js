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
    // Older saves have no real duration for the ongoing run. Track from load
    // and label it partial instead of inferring real time from accelerated time.
    if (data.time && data.time.currentEnergyRunReal===undefined) player.time.currentEnergyRunPartial=Number(player.time.realPlayed>0 || player.time.currentEnergyRun.gt(0));
    if (![0,1].includes(player.time.currentEnergyRunPartial) || player.time.currentEnergyRunReal>player.time.realPlayed+1e-6) throw new Error('Invalid real run duration');
    player.prestige.history.forEach(function (entry,index,history) {
      if (!entry.condense.eq(entry.condense.floor()) || entry.condense.lt(1) || entry.condense.gt(player.prestige.times) || !entry.quanta.eq(entry.quanta.floor()) || entry.quanta.lt(1) || entry.quanta.gt(player.prestige.totalQuanta) || entry.realSeconds>player.time.realPlayed+1e-6 || ![0,1].includes(entry.partial) || index>0 && entry.condense.gte(history[index-1].condense)) throw new Error('Invalid Condense record');
    });
    Game.CONFIG.GENERATORS.forEach(function (gen) {
      const state = player.generators[gen.id];
      if (!state.purchased.eq(state.purchased.floor()) || !state.added.eq(state.added.floor())) throw new Error('Invalid generator count');
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
    if (!player.resources.quantumResonance.eq(player.resources.quantumResonance.floor()) || !player.resources.energyResonance.eq(player.resources.energyResonance.floor()) || !player.stats.totalQuantumResonance.eq(player.stats.totalQuantumResonance.floor()) || player.stats.totalQuantumResonance.lt(player.resources.quantumResonance)) throw new Error('Invalid resonance resources');
    if (![0, 1].includes(player.unlocks.fluctOdds) || ![0, 1].includes(player.unlocks.fieldExcitation) || !Object.values(player.ui.collapsed).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid interface settings');
    if (![0, 1].includes(player.ui.skillTree2D)) throw new Error('Invalid tree view');
    if (player.coherence.quantumCarry.gte(1) || player.coherence.energyCarry.gte(1)) throw new Error('Invalid resonance progress');
    if (player.fieldExcitation.elapsed.gte(Game.CONFIG.FIELD_EXCITATION.interval)) throw new Error('Invalid Field Excitation timer');
    if (player.fieldDynamics.elapsed.gte(player.prestige.skills["3-2-3"] ? Game.CONFIG.PRESTIGE.skills["3-2-3"].cycle : Game.CONFIG.FIELD_DYNAMICS.cycle)) throw new Error('Invalid Field Oscillation timer');
    if (![0, 1].includes(player.fieldDynamics.held) || ![0, 1].includes(player.settings.oscillationFreeze)) throw new Error('Invalid Oscillation freeze state');
    if (!player.fluctuation.rollReductionStacks.eq(player.fluctuation.rollReductionStacks.floor())) throw new Error('Invalid Fluct reduction stack');
    if (player.generatorFocus.elapsed.gte(Game.D(Game.CONFIG.PRESTIGE.skills["3-3"].focusSeconds).mul(Game.CONFIG.GENERATORS.length))) throw new Error('Invalid generator focus timer');
    const settings = player.settings;
    if (!Object.values(player.achievements).concat(Object.values(player.lore)).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid permanent progress');
    if (![player.prestige.quanta, player.prestige.totalQuanta, player.prestige.times].every(function (value) { return value.eq(value.floor()); }) || player.prestige.totalQuanta.lt(player.prestige.quanta)) throw new Error('Invalid Primordial Quanta');
    if (!Object.values(player.prestige.skills).every(function (value) { return value === 0 || value === 1; })) throw new Error('Invalid skill progress');
    if (![settings.sound, settings.muteUnfocused, settings.clickSound, settings.autoClickSound, settings.bubbleSound, settings.perkSound, settings.perkVisuals, settings.generatorSound, settings.fluctuationSound, settings.coherentSound, settings.fieldSound, settings.condenseSound, settings.condenseVisuals, settings.autoDismiss, player.lore.introductionSeen, player.lore.coherenceSeen, player.lore.fieldFirstSeen, player.lore.fieldSecondSeen].every(function (value) { return value === 0 || value === 1; }) || settings.volume > 1 || ![0, 1, 2].includes(settings.visuals)) throw new Error('Invalid settings');
    Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
      const state=player.automation.buyers[buyer.id], toggle=player.settings.autoBuyers[buyer.id];
      if (![0,1].includes(toggle) || !Number.isInteger(state.level) || state.level>10 || state.elapsed>5 || state.elapsed<0) throw new Error('Invalid automation progress');
      if (state.elapsed>=(50-4*state.level)/10+1e-9) throw new Error('Invalid automation timer');
    });
    const challenge=player.challenges;
    if (!Number.isInteger(challenge.active) || challenge.active<0 || challenge.active>8) throw new Error('Invalid challenge run');
    if (challenge.active) {
      const buyer=Game.CONFIG.AUTOMATION.buyers[challenge.active-1];
      if (!player.prestige.skills[buyer.skill] || player.automation.buyers[buyer.id].level>=10) throw new Error('Invalid active challenge');
      challenge.bestEnergy=Decimal.max(challenge.bestEnergy,player.resources.energy);
      const rule=Game.CONFIG.CHALLENGES[challenge.active-1];
      if (rule.blocked && rule.blocked.some(function (id) { return player.generators[id].purchased.gt(0) || player.generators[id].added.gt(0); })) throw new Error('Forbidden challenge generator');
      if (challenge.active===2 && player.fluctuation.positive!==0) throw new Error('Invalid forced Fluct state');
      if (challenge.active===7 && Game.CONFIG.GENERATORS.some(function (gen) { return player.generators[gen.id].purchased.gt(10) || player.generators[gen.id].added.gt(0); })) throw new Error('Invalid sparse generator count');
    }
    Game.Progression.captureAchievements(player);
    Game.player = player;
  }
  function status(message) { if (Game.UI) Game.UI.setSaveStatus(message); }
  Game.Save = {
    save: function () {
      try {
        Game.Progression.captureAchievements();
        localStorage.setItem(Game.CONFIG.SAVE_KEY, encode());
        status('Saved. Autosave every 10 seconds.');
        return true;
      } catch (error) {
        status('Browser saving unavailable. Export your save to keep your progress.');
        return false;
      }
    },
    load: function () {
      try {
        const raw = localStorage.getItem(Game.CONFIG.SAVE_KEY);
        if (!raw) return false;
        restore(raw);
        return true;
      } catch (error) {
        status('Save unavailable. You can play and export your progress.');
        return false;
      }
    },
    exportSave: function () { Game.Progression.captureAchievements(); prompt('Copy your save:', btoa(encode())); },
    importSave: function () {
      const encoded = prompt('Paste your Energy-only save:');
      if (!encoded) return;
      try {
        restore(atob(encoded.trim()));
        if (Game.Experience) Game.Experience.syncPlayer();
        const saved = this.save();
        Game.UI.render();
        if (saved) status('Save imported.');
      } catch (error) { alert('That save is invalid or belongs to a different version. Your game has not changed.'); }
    },
    hardReset: function () {
      if (!confirm('Erase all progress, including Primordial Quanta, achievements, lore, and playtime? This replaces your current save.')) return;
      Game.resetPlayer();
      if (Game.Experience) Game.Experience.syncPlayer();
      this.save();
      Game.UI.render();
    }
  };
})(window.CosmicIdle);

