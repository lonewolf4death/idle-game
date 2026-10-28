(function (Game) {
  const byId=function (id) { return document.getElementById(id); };
  const text=function (node,value) { if(node.textContent!==String(value)) node.textContent=String(value); };
  const number=function (n,places) { return Game.Format.number(n,places===undefined?2:places); };
  Game.StructureUI = {
    confirming:false,owner:null,
    init:function () {
      const ui=this;
      const choices=document.createElement('div');choices.id='first-quanta-choices';choices.className='first-quanta-choices';
      choices.innerHTML='<p class="label">Your first Quanta · choose a new beginning</p><div><button data-first-skill="1-1"><strong>Impulse · 1 Quanta</strong><span>×4 all Energy · ×2 click Energy</span></button><button data-first-skill="2-1"><strong>Probability · 1 Quanta</strong><span>×3 all Energy · positive chance +5 points</span></button><button data-first-skill="3-1"><strong>Rhythm · 1 Quanta</strong><span>Remember an extra Stabilization · longer peak</span></button></div>';
      byId('prestige-view').insertBefore(choices,byId('prestige-view').firstChild);
      choices.querySelectorAll('button').forEach(function (button) { button.addEventListener('click',function (event) { Game.PrestigeUI.activateNode(button.dataset.firstSkill,event); }); });
      Game.CONFIG.GENERATORS.forEach(function (gen) {
        const node=Game.UI.generatorNodes[gen.id],status=document.createElement('div');status.className='pattern-summary';
        status.innerHTML='<div class="pattern-pips" aria-hidden="true"></div><p class="pattern-status"></p><p class="pattern-echo muted"></p>';
        node.card.insertBefore(status,node.card.querySelector('.generator-meta'));node.pattern=status;
      });
      const trace=document.createElement('div');trace.className='stabilization-trace';trace.setAttribute('aria-hidden','true');
      for(let i=0;i<4;i++) trace.appendChild(document.createElement('i'));
      byId('energy-field').appendChild(trace);
      byId('open-stabilization').addEventListener('click',function () {
        Game.Loop.pump(performance.now());if(!Game.Structure.canStabilize()) return;
        ui.owner=Game.player;ui.confirming=true;text(byId('stabilization-dialog-reward'),ui.rewardText());
        byId('stabilization-dialog').showModal();byId('cancel-stabilization').focus();
      });
      byId('cancel-stabilization').addEventListener('click',function () { ui.dismiss(false); });
      byId('confirm-stabilization').addEventListener('click',function () { ui.dismiss(true); });
      byId('stabilization-dialog').addEventListener('cancel',function (event) { event.preventDefault();ui.dismiss(false); });
    },
    dismiss:function (commit) {
      const ui=this,dialog=byId('stabilization-dialog');if(dialog.classList.contains('is-dismissing')) return;
      const owner=this.owner;dialog.classList.add('is-dismissing');
      byId('confirm-stabilization').disabled=true;byId('cancel-stabilization').disabled=true;
      setTimeout(function () {
        dialog.close();dialog.classList.remove('is-dismissing');ui.confirming=false;ui.owner=null;
        byId('confirm-stabilization').disabled=false;byId('cancel-stabilization').disabled=false;
        if(commit && owner===Game.player) { Game.Loop.pump(performance.now());Game.Structure.stabilize(); }
        if(byId('open-stabilization').getClientRects().length) byId('open-stabilization').focus();
      },2000);
    },
    rewardText:function () {
      const n=Game.player.structure.stabilizations.toNumber(),gen=n<4?Game.CONFIG.GENERATORS[n+3]:null;
      return (n<4?'Stabilization '+(n+1):'Refinement '+(n-3))+' · ×'+Game.CONFIG.STRUCTURE.strengthPerStabilization+' all Energy, '+(gen?'unlock Gen '+(n+4)+' ('+gen.name+'), ':'')+'and restart with '+(100*(n+1))+' Energy.'+(n===0?' Unlock basic buyers for Gen 1–3: one pattern attempt every 15 real seconds.':'');
    },
    patternFeedback:function (gen,crossed) {
      const card=Game.UI.generatorNodes[gen.id].card;
      if(Game.player.settings.visuals && Game.player.settings.perkVisuals) { card.classList.add('is-pattern-complete');setTimeout(function () { card.classList.remove('is-pattern-complete'); },900); }
      text(byId('pattern-announcement'),gen.name+' completed '+crossed+' resonance '+(crossed===1?'pattern':'patterns')+'. Production strengthened.');
      if(Game.Audio) Game.Audio.play('perk');
    },
    stabilizationFeedback:function () { if(Game.Audio) Game.Audio.play('stabilize'); },
    render:function () {
      const p=Game.player,level=p.structure.stabilizations.toNumber(),reveal=false;
      const choices=byId('first-quanta-choices');if(choices) { choices.hidden=p.prestige.totalQuanta.gte(5);choices.querySelectorAll('button').forEach(function (button) { button.classList.toggle('is-owned',Game.Progression.hasSkill(button.dataset.firstSkill)); }); }
      byId('stabilization-panel').hidden=!(reveal || level>0 || p.generators.coherentEnergy.purchased.gt(0));
      text(byId('stabilization-level'),level<4?level+' / 4 established':'4 established · '+(level-4)+' refinements');
      text(byId('stabilization-reward'),level<Game.CONFIG.STRUCTURE.maxStabilizations?this.rewardText():'The field is fully stabilized · ×'+number(Game.Structure.multiplier())+' Energy. Push onward to Condense.');
      const goal=Game.Structure.goal(),patterns=Game.Patterns.total(),ready=Game.Structure.canStabilize();
      const next=level<4?Game.CONFIG.GENERATORS[level+3]:null,missing=[];
      if(p.resources.energy.lt(goal.energy)) missing.push(number(goal.energy)+' Energy');
      if(patterns<goal.patterns) missing.push((goal.patterns-patterns)+' more patterns');
      if(p.resources.quantumResonance.lt(goal.quantum)) missing.push(number(goal.quantum.sub(p.resources.quantumResonance),0)+' more QR');
      text(byId('stabilization-next'),(next?'Next: '+next.name:'Next: stronger rebuilding')+' · '+(ready?'Ready to stabilize':missing.join(' · ')));
      text(byId('stabilization-goal'),level<Game.CONFIG.STRUCTURE.maxStabilizations?number(p.resources.energy)+' / '+number(goal.energy)+' Energy · '+patterns+' / '+goal.patterns+' patterns · '+number(p.resources.quantumResonance,0)+' / '+number(goal.quantum,0)+' Quantum Resonance':'Condense retains permanent progress and compresses this opening on future runs.');
      const progress=level>=Game.CONFIG.STRUCTURE.maxStabilizations?1:Math.min(1,p.resources.energy.add(1).log10()/goal.energy.log10(),patterns/goal.patterns,p.resources.quantumResonance.div(goal.quantum).toNumber());
      byId('stabilization-fill').style.width=(progress*100)+'%';
      byId('stabilization-fill').parentElement.setAttribute('aria-valuenow',(progress*100).toFixed(1));
      const button=byId('open-stabilization');button.hidden=level>=Game.CONFIG.STRUCTURE.maxStabilizations;button.disabled=!ready;text(button,Game.Challenges.active()?'Unavailable during challenges':ready?level<4?'Stabilize · '+(level+1)+'/4':'Refine the field':'Establish the next pattern');
      const recovery=byId('stabilization-recovery');recovery.hidden=p.structure.recoveryTarget.eq(0);
      text(recovery,p.structure.recovered?'Previous Energy high recovered in '+Game.Format.duration(p.structure.recoverySeconds)+'.':'Rebuilding toward previous high: '+number(p.structure.recoveryTarget)+' Energy.');
      byId('economy-migration').hidden=!p.structure.migrated;
      const trace=byId('energy-field').querySelector('.stabilization-trace');if(trace) { trace.hidden=!p.settings.visuals;trace.style.setProperty('--memory',String(level));Array.from(trace.children).forEach(function (ring,i) { ring.hidden=i>=level; }); }
      Game.CONFIG.GENERATORS.forEach(function (gen,index) {
        const node=Game.UI.generatorNodes[gen.id];if(!node.pattern) return;
        const state=Game.Patterns.forGenerator(gen.id),pips=node.pattern.querySelector('.pattern-pips');
        if(pips.childElementCount!==state.size) { pips.replaceChildren();for(let i=0;i<state.size;i++) pips.appendChild(document.createElement('i')); }
        Array.from(pips.children).forEach(function (pip,i) { pip.classList.toggle('filled',i<state.position); });
        text(node.pattern.querySelector('.pattern-status'),'Pattern '+(state.index+1)+' · '+state.position+' / '+state.size+' purchased · next ×'+gen.patternStrength+' strength');
        text(node.pattern.querySelector('.pattern-echo'),'Pattern strength ×'+number(Game.Patterns.ownMultiplier(gen.id))+' · incoming echoes ×'+number(Game.Patterns.echoMultiplier(gen.id))+(index>0?' · completion echoes ×1.10 to '+Game.CONFIG.GENERATORS[index-1].name:''));
        node.pattern.title='The unit price stays fixed for this pattern. Only purchased units fill it. Patterns repeat 4 → 6 → 8 → 12. Completing a pattern strengthens this generator and reinforces the previous generator.';
        text(node.scaling,'Next pattern raises the unit price ×'+number(Game.Energy.getGeneratorScaling(gen),3)+'. Constant price inside each 4 / 6 / 8 / 12 pattern. Later pattern price jumps grow.');
        if(gen.id==='energyDisturbance') { text(node.description,'Each unit produces Energy immediately. Pattern bonuses strengthen purchased and added units together.');text(node.production,'Producing '+number(Game.Energy.getGeneratorProduction(gen).mul(Game.Time.getGameSpeed()))+' Energy/sec · continuous flow'); }
        if(gen.type==='oscillation') {
          text(node.description,'Builds from a dependable baseline to a larger peak. Purchased patterns strengthen both. Peak timing remains available.');
          const rules=Game.FieldDynamics.rules();text(node.production,'All Energy ×'+number(Game.FieldDynamics.multiplier(),5)+' · baseline ×'+number(Game.FieldDynamics.baseline(),5)+' · peak ×'+number(Game.FieldDynamics.peak(),5)+(Game.FieldDynamics.peakPaused()?' · peak held during negative Fluct':Game.FieldDynamics.held()?' · waiting for release':' · '+number(Game.FieldDynamics.nextEventIn(),1)+'s to '+(p.fieldDynamics.elapsed.lt(rules.rise)?'peak':'restart')));
        }
        if(gen.type==='fluctuation') text(node.description,'Purchased patterns build dependable strength. Positive and negative Fluct vary that strength by +20% or −20%; Quantum Resonance reinforces it with diminishing returns.');
        if(gen.type==='field') text(node.description,'Purchasing immediately adds base Energy output. Every cycle adds more; purchased patterns strengthen future growth.');
      });
      const disturb=Game.Patterns.state(p.upgrades.clickPower);
      text(byId('disturb-pattern'),'Pattern '+(disturb.index+1)+' · '+disturb.position+' / '+disturb.size+' · whole click ×'+number(Game.D(Game.CONFIG.STRUCTURE.clickStrength).pow(disturb.index)));
      text(byId('click-upgrade-scaling'),'Fixed unit prices in 4 / 6 / 8 / 12 patterns; ×4 price and ×1.15 whole-click strength on completion.');
      text(byId('resonance-fluct-growth'),'QR stable-strength bonus ×'+number(Game.Energy.fluctGrowth(),5)+' · effective Resonance '+number(Game.Coherence.quantumSoftcapState().effective));
      if(this.confirming && this.owner!==p && !byId('stabilization-dialog').classList.contains('is-dismissing')) this.dismiss(false);
    }
  };
  const init=Game.UI.init,render=Game.UI.render;
  Game.UI.init=function () { init.call(this);Game.StructureUI.init(); };
  Game.UI.render=function () { render.call(this);Game.StructureUI.render(); };
})(window.CosmicIdle);
