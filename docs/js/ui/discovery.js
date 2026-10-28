(function (Game) {
  Game.Discovery = {
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
      if(definition.kind==='autoClicks') return Game.Progression.hasSkill('1-2-2');
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
      const history=document.getElementById('stats-condense-tab');history.hidden=!(false || Game.player.prestige.times.gt(0));
      if(history.hidden && Game.StatsUI.page==='condense') Game.StatsUI.selectPage('production');
    }
  };
})(window.CosmicIdle);
