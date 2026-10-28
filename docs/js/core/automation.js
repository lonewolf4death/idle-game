(function (Game) {
  // Real-time timers deliberately do not accelerate from click-granted game time.
  Game.Automation = {
    editingCondenseTarget:false,
    definitions: function () { return Game.CONFIG.AUTOMATION.buyers.concat(Game.CONFIG.AUTOMATION.stabilizer); },
    definition: function (id) { return this.definitions().find(function (buyer) { return buyer.id === id; }); },
    advanced: function (id) { const buyer=this.definition(id);return !!buyer && Game.Progression.hasSkill(buyer.skill); },
    basic: function (id) { return id!=='condense' && !!this.definition(id) && Game.player.prestige.times.gt(0); },
    unlocked: function (id) { return Game.player.prestige.times.gt(0) && (this.advanced(id) || this.basic(id)); },
    interval: function (id) {
      if(id==='stabilize') {
        const buyers=Game.CONFIG.AUTOMATION.buyers.filter(function (buyer) { return Game.Automation.unlocked(buyer.id); });
        return buyers.length ? buyers.reduce(function (sum,buyer) { return sum+Game.Automation.interval(buyer.id); },0)/buyers.length : Game.CONFIG.STRUCTURE.basicBuyerInterval;
      }
      return this.advanced(id) ? (50 - 4 * Game.player.automation.buyers[id].level) / 10 : Game.CONFIG.STRUCTURE.basicBuyerInterval;
    },
    active: function (id) { return !Game.Challenges.active() && !Game.Challenges.confirming && !(Game.StructureUI && Game.StructureUI.confirming) && !((id==='condense'||id==='stabilize') && this.editingCondenseTarget) && this.unlocked(id) && !!Game.player.settings.autoBuyers[id]; },
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
      this.definitions().forEach(function (buyer) { Game.Automation.setEnabled(buyer.id,enabled); });
    },
    remaining: function () {
      return this.definitions().reduce(function (next,buyer) {
        return Game.Automation.active(buyer.id) ? Math.min(next,Math.max(0,Game.Automation.interval(buyer.id)-Game.player.automation.buyers[buyer.id].elapsed)) : next;
      },Infinity);
    },
    advance: function (seconds) {
      this.definitions().forEach(function (buyer) {
        const state=Game.player.automation.buyers[buyer.id];
        state.elapsed=Game.Automation.active(buyer.id) ? Math.round((state.elapsed+seconds)*1e9)/1e9 : 0;
      });
    },
    resolve: function () {
      // Reset requirements are checked before buyers can spend their Energy.
      // Condense takes priority, followed by Stabilize, then Gen 1 through 7.
      const buyers=Game.CONFIG.AUTOMATION.buyers;
      [buyers[7],Game.CONFIG.AUTOMATION.stabilizer].concat(buyers.slice(0,7)).forEach(function (buyer) {
        const state=Game.player.automation.buyers[buyer.id];
        if (!Game.Automation.active(buyer.id) || state.elapsed+1e-9<Game.Automation.interval(buyer.id)) return;
        state.elapsed=0;
        if (buyer.id === 'condense') {
          if(Game.Prestige.reward().gte(Game.player.settings.autoCondenseTarget)) Game.Prestige.condense(true);
        }
        else if(buyer.id==='stabilize') {
          if(Game.Automation.active('condense') && Game.Prestige.reward().gte(Game.player.settings.autoCondenseTarget)) return;
          Game.Structure.stabilize(true);
        }
        else Game.Energy.buyGenerator(buyer.id,Game.Automation.advanced(buyer.id)?'max':'pattern');
      });
    },
    preserve: function (old,fresh) {
      fresh.challenges.highestEnergy=Decimal.max(old.challenges.highestEnergy,old.resources.energy);
      Game.Symmetry.preserve(old,fresh);
      // Challenge mastery survives both Condense and respec; timers start fresh.
      this.definitions().forEach(function (buyer) {
        const state=old.automation.buyers[buyer.id];
        fresh.automation.buyers[buyer.id]={level:state.level,elapsed:0};
      });
      Game.Progression.keepDisturbMaxed(fresh);
    }
  };

  Game.Challenges = {
    confirming:false,
    active: function (index) { return index===undefined ? Game.player.challenges.active : Game.player.challenges.active===index; },
    definition: function (index) { return Game.CONFIG.CHALLENGES[(index===undefined ? this.active() : index)-1]; },
    buyer: function (index) { return Game.CONFIG.AUTOMATION.buyers[(index===undefined ? this.active() : index)-1]; },
    level: function (index) { return Game.player.automation.buyers[this.buyer(index).id].level; },
    goal: function (index) { const rule=this.definition(index);return Game.D(10).pow(rule.startExponent+rule.exponentStep*this.level(index)); },
    observe: function () {
      const p=Game.player,c=p.challenges;
      c.highestEnergy=Decimal.max(c.highestEnergy,p.resources.energy);
      if(!this.active() || c.failed) return;
      c.bestEnergy=Decimal.max(c.bestEnergy,p.resources.energy);
      if(c.bestEnergy.gte(this.goal()) && (!this.active(1) || c.purchases>=this.definition().requiredPurchases)) c.qualified=1;
    },
    unlocked: function (index) { this.observe();return Game.player.prestige.times.gt(0) && Game.Automation.advanced(this.buyer(index).id) && Game.player.challenges.highestEnergy.gte(this.definition(index).unlockEnergy); },
    clicksAllowed: function () { return false; },
    allowedGenerator: function (id) { const rule=this.definition();return !rule || !rule.blocked || !rule.blocked.includes(id); },
    produces: function (id) { return this.allowedGenerator(id) && (!this.active(6) || Game.CONFIG.GENERATORS[Game.player.challenges.latestGenerator-1]?.id===id); },
    addedAllowed: function (id) { return this.allowedGenerator(id); },
    purchaseLimit: function () { return Infinity; },
    permanentBonusesDisabled: function () { return false; },
    energyPower: function () { return this.active(2) ? (95-5*this.level())/100 : 1; },
    gainPower: function () { return this.energyPower()*(Game.player.achievements.allChallenges ? 1.02 : 1); },
    wallOrders: function () { return this.definition(3).wallOrders+this.definition(3).wallStep*this.level(3); },
    energyFactor: function (offset) {
      const c=Game.player.challenges,t=c.elapsed+(offset||0);
      return Game.D(10).pow(this.active(3)?-Math.max(0,this.wallOrders()-t):this.active(8)?Math.log10(.85)*Math.max(0,t-c.lastPurchase):0);
    },
    // Log10 slope per real second; integrated with Oscillation, never sampled per tick.
    energySlope: function () { return this.active(3) && Game.player.challenges.elapsed+1e-9<this.wallOrders()?1:this.active(8)?Math.log10(.85):0; },
    deadline: function () { const r=this.definition(1);return r.deadline-r.deadlineStep*this.level(1); },
    resetInterval: function () { const r=this.definition(4);return r.resetSeconds-r.resetStep*this.level(4); },
    ruleText: function (index) {
      const rule=this.definition(index),level=this.level(index);
      return rule.description+(index===1?' Current deadline: '+(rule.deadline-rule.deadlineStep*level)+' real seconds.':index===2?' Current Energy gain power: '+((95-5*level)/100).toFixed(2)+'.':index===3?' Current initial suppression: ×1e−'+(rule.wallOrders+rule.wallStep*level)+'.':index===4?' Current collapse interval: '+(rule.resetSeconds-rule.resetStep*level)+' real seconds.':'');
    },
    status: function () {
      const c=Game.player.challenges;
      if(c.qualified) return 'Goal reached';
      if(this.active(1)) return c.failed ? 'Deadline missed · retry this attempt' : Math.max(0,this.deadline()-c.elapsed).toFixed(1)+'s remaining · '+c.purchases+'/'+this.definition().requiredPurchases+' purchases';
      if(this.active(2)) return 'Energy gain power: '+this.energyPower().toFixed(2);
      if(this.active(3) || this.active(8)) return 'Energy suppression: ×'+Game.Format.number(this.energyFactor(),3);
      if(this.active(4)) return c.resetArmed ? Math.max(0,c.resetAt-c.elapsed).toFixed(1)+'s until collapse · '+c.resets+' collapses' : 'Collapse timer inactive';
      if(this.active(6)) return c.latestGenerator ? 'Active: Gen '+c.latestGenerator+' · '+Game.CONFIG.GENERATORS[c.latestGenerator-1].name : 'No active generator';
      return 'Restricted run';
    },
    realRemaining: function () {
      const c=Game.player.challenges;
      if(!this.active()) return Infinity;
      if(this.active(3) && c.elapsed+1e-9<this.wallOrders()) return this.wallOrders()-c.elapsed;
      if(c.qualified) return Infinity;
      if(this.active(1) && !c.failed) return Math.max(0,this.deadline()-c.elapsed);
      if(this.active(4) && c.resetArmed) return Math.max(0,c.resetAt-c.elapsed);
      return Infinity;
    },
    advanceClock: function (seconds) { if(this.active()) Game.player.challenges.elapsed=Math.round((Game.player.challenges.elapsed+seconds)*1e9)/1e9; },
    resolveClockEvents: function () {
      const c=Game.player.challenges;this.observe();
      if(c.qualified) return;
      if(this.active(1) && c.elapsed+1e-9>=this.deadline()) c.failed=1;
      if(this.active(4) && c.resetArmed && c.elapsed+1e-9>=c.resetAt) {
        const retained={elapsed:c.elapsed,resetArmed:1,resetAt:c.elapsed+this.resetInterval(),resets:c.resets+1};
        this.restart(4,true);Object.assign(Game.player.challenges,retained);
      }
    },
    priceMultiplier: function () { return Game.D(this.active(5)?this.definition().purchasePriceMultiplier:1); },
    purchaseQuantity: function () {
      if(!this.active(5) || !Game.FieldDynamics.active()) return Game.D(1);
      const current=Game.FieldDynamics.multiplier(),peak=Game.FieldDynamics.peak(),max=Game.D(this.definition().maxPurchaseQuantity);
      if(Game.FieldDynamics.peakPaused()) return Game.D(1);
      if(Game.player.fieldDynamics.elapsed.gte(Game.FieldDynamics.rules().rise)) return max;
      if(current.lte(1) || peak.lte(1)) return Game.D(1);
      if(current.gte(peak)) return max;
      return Decimal.max(1,Decimal.min(max,Game.D(1).add(max.sub(1).mul(current.sub(1).div(peak.sub(1))).floor())));
    },
    ready: function () { this.observe();return !!this.active() && !!Game.player.challenges.qualified; },
    enter: function (index) {
      if (this.active() || !Number.isInteger(index) || index<1 || index>8 || !this.unlocked(index) || this.level(index)>=10) return false;
      this.restart(index);return true;
    },
    exit: function () { if(!this.active()) return false;this.restart(0);return true; },
    complete: function () {
      if(!this.ready()) return false;
      const buyer=this.buyer(),state=Game.player.automation.buyers[buyer.id];
      state.level++;
      Game.Achievements.capture(Game.player,true);
      if([5,10].includes(state.level) && Game.UI) Game.UI.notifyAchievement(this.definition().name+' · '+(state.level===10?'Mastered':'Established'),'Challenge milestone · no production reward');
      const title=this.definition().name,level=state.level,interval=Game.Automation.interval(buyer.id);
      this.restart(0);
      if(Game.Experience && Game.Experience.enqueue) Game.Experience.enqueue({kind:'Challenge complete',title:title+' · Level '+level,text:buyer.name+' automation now attempts once every '+interval.toFixed(1)+' real seconds.'});
      if(Game.Audio) Game.Audio.play('perk');
      return true;
    },
    restart: function (index, automatic) {
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
      Game.Structure.seed(fresh);
      if(index===5) {
        const rule=this.definition(5);
        fresh.resources.energy=Game.D(rule.startingEnergy);fresh.challenges.bestEnergy=Game.D(rule.startingEnergy);
        fresh.generators.fieldOscillation.added=Game.D(rule.startingOscillations);
      }
      if(!index) {
        if(fresh.prestige.skills['3-2']) fresh.generators.fieldOscillation.added=Game.D(Game.CONFIG.PRESTIGE.skills['3-2'].startingOscillations);
        if(fresh.prestige.skills['3-4-2']) fresh.generators.fieldCoupling.added=Game.D(Game.CONFIG.PRESTIGE.skills['3-4-2'].startingCouplings);
      }
      Game.player=fresh;
      if(Game.Loop && !automatic) { Game.Loop.accumulator=0;Game.Loop.lastTime=performance.now(); }
      if(Game.UI) Game.UI.generatorSparkBudget=0;
      if(Game.Experience) Game.Experience.syncPlayer();
      if(!automatic) { Game.Save.save();if(Game.UI) Game.UI.render(); }
    },
    afterPurchase: function (id) {
      if(!this.active()) return;
      const c=Game.player.challenges,index=Game.CONFIG.GENERATORS.findIndex(function (gen) { return gen.id===id; });
      c.lastPurchase=c.elapsed;
      if(index>=0) { c.purchases++;c.latestGenerator=index+1; }
      if(this.active(4) && id==='quantumFluctuation' && !c.resetArmed) { c.resetArmed=1;c.resetAt=c.elapsed+this.resetInterval(); }
      this.observe();
    }
  };
})(window.CosmicIdle);
