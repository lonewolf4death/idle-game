(function (Game) {
  Game.Discovery = {
    resetSummary: function (stabilizing) {
      const p=Game.player,reveal=false,reset=['Energy','purchased and added generators'],keep=['achievements','lore','total playtime'];
      if(reveal || Game.Coherence.discovered() || p.lore.coherenceSeen)reset.push('Resonance');
      if(reveal || Game.FieldExcitation.discovered() || p.lore.fieldFirstSeen)reset.push('field growth');
      if(stabilizing)keep.push('previous Stabilizations',"this run’s elapsed time");
      else {reset.push('Stabilizations','run timers');keep.push('Primordial Quanta','purchased skills');}
      if(stabilizing && (reveal || p.prestige.times.gt(0)))keep.push('Primordial Quanta','purchased skills');
      if(stabilizing && (reveal || Game.CONFIG.AUTOMATION.buyers.some(function (b) { return p.automation.buyers[b.id].level>0; })))keep.push('automation mastery');
      if(reveal || Game.Symmetry.unlocked()) {reset.push('Symmetry','Field Alignment');keep.push('Symmetry access and discoveries');}
      if(reveal || Game.Symmetry.discovered(.5))keep.push('purchased Unified Interaction upgrades');
      keep.push('settings');
      return {reset:'Resets '+reset.join(', ')+'.',keep:'Keeps '+keep.join(', ')+'.'};
    },
    generator: function (id) {
      const gen=Game.Energy.getGenerator(id),state=Game.player.generators[id];
      return Boolean(gen && (state.purchased.add(state.added).gt(0) || Game.Energy.generatorEnabled(gen) && Game.player.resources.energy.gte(gen.unlockEnergy)));
    },
    challenge: function (index) { return Boolean(false || Game.Challenges.active()===index || Game.Challenges.level(index)>0 || Game.Challenges.unlocked(index)); },
    view: function (name) {
      if(false) return true;
      if(name==='prestige') return Game.player.prestige.times.gt(0);
      if(name==='automation') return Game.CONFIG.AUTOMATION.buyers.some(function (buyer) { return Game.Automation.unlocked(buyer.id); });
      if(name==='challenges') return Game.CONFIG.AUTOMATION.buyers.some(function (_,i) { return Game.Discovery.challenge(i+1); });
      return true;
    },
    skill: function (id) {
      if(false || Game.Progression.hasSkill(id)) return true;
      const skill=Game.CONFIG.PRESTIGE.skills[id];
      if(!skill.requires || Game.Progression.hasSkill(skill.requires)) return true;
      return Object.keys(Game.CONFIG.PRESTIGE.skills).some(function (owned) {
        if(!Game.Progression.hasSkill(owned)) return false;
        for(let parent=Game.CONFIG.PRESTIGE.skills[owned].requires;parent;parent=Game.CONFIG.PRESTIGE.skills[parent].requires) if(parent===id) return true;
        return false;
      });
    },
    achievement: function (definition) {
      const p=Game.player;
      if(false || p.achievements[definition.id]) return true;
      if(definition.kind==='purchased') return this.generator(definition.generator);
      if(definition.kind==='passive') return Game.Progression.hasSkill('1-2-1') || Game.Progression.hasSkill('1-5-2');
      if(definition.kind==='purchases') return this.generator('energyDisturbance');
      if(definition.kind==='disturb') return p.upgrades.clickPower.gt(0) || p.resources.energy.gte(Game.CONFIG.CLICK_UPGRADE.unlockEnergy);
      if(definition.kind==='patterns') return this.generator('energyDisturbance');
      if(definition.kind==='stabilizations') return p.structure.stabilizations.gt(0) || this.generator('coherentEnergy');
      if(definition.kind==='challenge') return this.challenge(definition.track);
      if(definition.kind==='allChallenges') return Game.CONFIG.AUTOMATION.buyers.every(function (_,i) { return Game.Discovery.challenge(i+1); });
      return true;
    },
    sync: function () {
      Game.UI.views.forEach(function (name) { document.getElementById(name+'-tab').hidden=!Game.Discovery.view(name); });
      const selected=Game.UI.views.find(function (name) { return !document.getElementById(name+'-view').hidden; });
      if(selected && !this.view(selected)) Game.UI.selectView('energy',false);
      const condensed=Game.player.prestige.times.gt(0),preview=false;
      const note=document.getElementById('stats-introduction');if(note)note.textContent=condensed||preview?'Production bonuses and the history of condensation.':'Production bonuses.';
      [['fluctuationSound',this.generator('quantumFluctuation')],['coherentSound',this.generator('coherentEnergy')],['fieldSound',this.generator('fieldExcitation')],['condenseSound',condensed||Game.Prestige.reward().gt(0)],['condenseVisuals',condensed||Game.Prestige.reward().gt(0)],['perkSound',condensed],['perkVisuals',condensed]].forEach(function (entry) { document.getElementById('setting-'+entry[0]).closest('label').hidden=!(preview||entry[1]); });
      document.getElementById('preview-perk-sound').hidden=!(preview||condensed);
      const history=document.getElementById('stats-condense-tab');history.hidden=!(false || Game.player.prestige.times.gt(0));
      if(history.hidden && Game.StatsUI.page==='condense') Game.StatsUI.selectPage('production');
    }
  };
})(window.CosmicIdle);
