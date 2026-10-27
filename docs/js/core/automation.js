(function (Game) {
  // Real-time timers deliberately do not accelerate from click-granted game time.
  Game.Automation = {
    editingCondenseTarget:false,
    definition: function (id) { return Game.CONFIG.AUTOMATION.buyers.find(function (buyer) { return buyer.id === id; }); },
    unlocked: function (id) { const buyer=this.definition(id);return !!buyer && Game.Progression.hasSkill(buyer.skill); },
    interval: function (id) { return (50 - 4 * Game.player.automation.buyers[id].level) / 10; },
    active: function (id) { return !Game.Challenges.active() && !Game.Challenges.confirming && !(id==='condense' && this.editingCondenseTarget) && this.unlocked(id) && !!Game.player.settings.autoBuyers[id]; },
    parseCondenseTarget: function (input) {
      if (typeof input!=='string' && typeof input!=='number') return null;
      const value=String(input).trim();
      if (!/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return null;
      const target=Game.D(value);
      if (!Number.isFinite(target.mantissa) || !Number.isFinite(target.exponent) || target.lt(1) || !target.eq(target.floor()) || target.toString()==='Infinity') return null;
      return target;
    },
    setCondenseTarget: function (input) {
      const target=this.parseCondenseTarget(input);
      if(!target) return false;
      Game.player.settings.autoCondenseTarget=target;return true;
    },
    setEnabled: function (id, enabled) {
      if (!this.definition(id) || enabled && !this.unlocked(id)) return false;
      Game.player.settings.autoBuyers[id]=Number(!!enabled);
      Game.player.automation.buyers[id].elapsed=0;
      return true;
    },
    setAll: function (enabled) {
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) { Game.Automation.setEnabled(buyer.id,enabled); });
    },
    remaining: function () {
      return Game.CONFIG.AUTOMATION.buyers.reduce(function (next,buyer) {
        return Game.Automation.active(buyer.id) ? Math.min(next,Math.max(0,Game.Automation.interval(buyer.id)-Game.player.automation.buyers[buyer.id].elapsed)) : next;
      },Infinity);
    },
    advance: function (seconds) {
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
        const state=Game.player.automation.buyers[buyer.id];
        state.elapsed=Game.Automation.active(buyer.id) ? Math.round((state.elapsed+seconds)*1e9)/1e9 : 0;
      });
    },
    resolve: function () {
      // Stable priority: Gen 1 through Gen 7, then Condense. No banked attempts.
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
        const state=Game.player.automation.buyers[buyer.id];
        if (!Game.Automation.active(buyer.id) || state.elapsed+1e-9<Game.Automation.interval(buyer.id)) return;
        state.elapsed=0;
        if (buyer.id === 'condense') {
          if(Game.Prestige.reward().gte(Game.player.settings.autoCondenseTarget)) Game.Prestige.condense(true);
        }
        else Game.Energy.buyGenerator(buyer.id,1);
      });
    },
    preserve: function (old,fresh) {
      // Challenge mastery survives both Condense and respec; timers start fresh.
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
        const state=old.automation.buyers[buyer.id];
        fresh.automation.buyers[buyer.id]={level:state.level,elapsed:0};
      });
    }
  };

  Game.Challenges = {
    confirming:false,
    active: function (index) { return index===undefined ? Game.player.challenges.active : Game.player.challenges.active===index; },
    definition: function (index) { return Game.CONFIG.CHALLENGES[(index===undefined ? this.active() : index)-1]; },
    buyer: function (index) { return Game.CONFIG.AUTOMATION.buyers[(index===undefined ? this.active() : index)-1]; },
    level: function (index) { return Game.player.automation.buyers[this.buyer(index).id].level; },
    goal: function (index) { const rule=this.definition(index);return Game.D(10).pow(rule.startExponent+rule.exponentStep*this.level(index)); },
    observe: function () { if (this.active()) Game.player.challenges.bestEnergy=Decimal.max(Game.player.challenges.bestEnergy,Game.player.resources.energy); },
    clicksAllowed: function () { return !this.active(1); },
    allowedGenerator: function (id) { const rule=this.definition();return !rule || !rule.blocked || !rule.blocked.includes(id); },
    addedAllowed: function (id) { return !this.active(7) && this.allowedGenerator(id); },
    purchaseLimit: function (id) { return this.active(7) ? Math.max(0,10-Game.player.generators[id].purchased.toNumber()) : Infinity; },
    ready: function () { this.observe();return !!this.active() && Game.player.challenges.bestEnergy.gte(this.goal()); },
    enter: function (index) {
      if (this.active() || !Number.isInteger(index) || index<1 || index>8 || !Game.Automation.unlocked(this.buyer(index).id) || this.level(index)>=10) return false;
      this.restart(index);return true;
    },
    exit: function () { if(!this.active()) return false;this.restart(0);return true; },
    complete: function () {
      if(!this.ready()) return false;
      const buyer=this.buyer(),state=Game.player.automation.buyers[buyer.id];
      state.level++;
      const title=this.definition().name,level=state.level,interval=Game.Automation.interval(buyer.id);
      this.restart(0);
      if(Game.Experience && Game.Experience.enqueue) Game.Experience.enqueue({kind:'Challenge complete',title:title+' · Level '+level,text:buyer.name+' automation now attempts once every '+interval.toFixed(1)+' real seconds.'});
      if(Game.Audio) Game.Audio.play('perk');
      return true;
    },
    restart: function (index) {
      const old=Game.player,fresh=Game.createDefaultPlayer();
      Game.Progression.captureAchievements(old);
      if(Game.Coherence.discovered()) old.lore.coherenceSeen=1;
      if(Game.FieldExcitation.discovered()) old.lore.fieldFirstSeen=old.lore.fieldSecondSeen=1;
      fresh.achievements=old.achievements;fresh.lore=old.lore;fresh.prestige=old.prestige;
      fresh.time.realPlayed=old.time.realPlayed;fresh.time.gamePlayed=old.time.gamePlayed;
      fresh.fluctuation.negativeStreakAchievement=old.fluctuation.negativeStreakAchievement;
      fresh.fluctuation.negativeStreakLevel=old.fluctuation.negativeStreakLevel;
      fresh.fluctuation.positiveChanceMastery=old.fluctuation.positiveChanceMastery;
      Game.Automation.preserve(old,fresh);fresh.settings=old.settings;fresh.ui=old.ui;
      fresh.challenges.active=index;
      // Challenge entry replaces starting-unit gifts; the two otherwise blocked
      // openings receive only the seed their stated restriction needs.
      if(index===1) fresh.generators.energyDisturbance.added=Game.D(1);
      if(index===2) { fresh.generators.quantumFluctuation.added=Game.D(1);fresh.fluctuation.positive=0; }
      if(!index) {
        if(fresh.prestige.skills['3-2']) fresh.generators.fieldOscillation.added=Game.D(Game.CONFIG.PRESTIGE.skills['3-2'].startingOscillations);
        if(fresh.prestige.skills['3-4-2']) fresh.generators.fieldCoupling.added=Game.D(Game.CONFIG.PRESTIGE.skills['3-4-2'].startingCouplings);
      }
      Game.player=fresh;
      if(Game.Loop) { Game.Loop.accumulator=0;Game.Loop.lastTime=performance.now(); }
      if(Game.UI) Game.UI.generatorSparkBudget=0;
      if(Game.Experience) Game.Experience.syncPlayer();
      Game.Save.save();if(Game.UI) Game.UI.render();
    },
    afterPurchase: function (id) {
      if(!this.active(6)) return;
      Game.Progression.captureAchievements(Game.player);
      const index=Game.CONFIG.GENERATORS.findIndex(function (gen) { return gen.id===id; });
      Game.CONFIG.GENERATORS.slice(0,index).forEach(function (gen) {
        Game.player.generators[gen.id]={purchased:Game.D(0),added:Game.D(0),burstElapsed:Game.D(0),burstTimers:[]};
        if(gen.id==='coherentEnergy') Game.player.coherence.quantumElapsed=Game.player.coherence.energyElapsed=Game.D(0);
        if(gen.id==='fieldExcitation') Game.player.fieldExcitation.elapsed=Game.D(0);
        if(gen.id==='fieldOscillation') { Game.player.fieldDynamics.elapsed=Game.D(0);Game.player.fieldDynamics.held=0; }
      });
    }
  };
})(window.CosmicIdle);
