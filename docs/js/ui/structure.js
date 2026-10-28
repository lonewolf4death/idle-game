(function (Game) {
  const byId=function (id) { return document.getElementById(id); };
  const text=function (node,value) { if(node.textContent!==String(value)) node.textContent=String(value); };
  const describe=function (node,value) { if(node.description.textContent!==value) { text(node.description,value);Game.Tooltips.enrich(node.description); } };
  const number=function (n,places) { return Game.Format.number(n,places===undefined?2:places); };
  Game.StructureUI = {
    confirming:false,owner:null,
    init:function () {
      const ui=this;
      Game.CONFIG.GENERATORS.forEach(function (gen) {
        const node=Game.UI.generatorNodes[gen.id],status=document.createElement('div');status.className='pattern-summary';
        status.innerHTML='<div class="pattern-pips" aria-hidden="true"></div><p class="pattern-status"></p><p class="pattern-echo muted"><span data-pattern-strength></span> · <button class="info-term" data-tip="echoes">Echoes</button> <span data-echo-strength></span><span data-echo-target></span></p>';
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
      return (n<4?'Stabilization '+(n+1):'Refinement '+(n-3))+' · ×'+Game.CONFIG.STRUCTURE.strengthPerStabilization+' all Energy, '+(gen?'unlock Gen '+(n+4)+' ('+gen.name+'), ':'')+'and restart with '+Game.CONFIG.IDLE_FLOW.startingEnergy+' Energy.';
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
      text(byId('stabilization-keeps'),Game.Discovery.resetSummary(true).keep);
      byId('stabilization-panel').hidden=!(reveal || level>0 || p.generators.coherentEnergy.purchased.gt(0));
      text(byId('stabilization-level'),level<4?level+' / 4 established':'4 established · '+(level-4)+' refinements');
      text(byId('stabilization-reward'),this.rewardText());
      const goal=Game.Structure.goal(),patterns=Game.Patterns.total(),ready=Game.Structure.canStabilize();
      const next=level<4?Game.CONFIG.GENERATORS[level+3]:null,missing=[];
      if(p.resources.energy.lt(goal.energy)) missing.push(number(goal.energy)+' Energy');
      if(patterns<goal.patterns) missing.push((goal.patterns-patterns)+' more patterns');
      if(p.resources.quantumResonance.lt(goal.quantum)) missing.push(number(goal.quantum.sub(p.resources.quantumResonance),0)+' more QR');
      text(byId('stabilization-next'),(next?'Next: '+next.name:'Next: stronger rebuilding')+' · '+(ready?'Ready to stabilize':missing.join(' · ')));
      text(byId('stabilization-goal'),number(p.resources.energy)+' / '+number(goal.energy)+' Energy · '+patterns+' / '+goal.patterns+' patterns · '+number(p.resources.quantumResonance,0)+' / '+number(goal.quantum,0)+' Quantum Resonance');
      const progress=Math.min(1,p.resources.energy.add(1).log10()/goal.energy.log10(),patterns/goal.patterns,p.resources.quantumResonance.div(goal.quantum).toNumber());
      byId('stabilization-fill').style.width=(progress*100)+'%';
      byId('stabilization-fill').parentElement.setAttribute('aria-valuenow',(progress*100).toFixed(1));
      const button=byId('open-stabilization');button.hidden=false;button.disabled=!ready;text(button,Game.Challenges.active()?'Unavailable during challenges':ready?level<4?'Stabilize · '+(level+1)+'/4':'Refine the field':'Establish the next pattern');
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
        text(node.pattern.querySelector('[data-pattern-strength]'),'Pattern strength ×'+number(Game.Patterns.ownMultiplier(gen.id)));
        text(node.pattern.querySelector('[data-echo-strength]'),'×'+number(Game.Patterns.echoMultiplier(gen.id)));
        text(node.pattern.querySelector('[data-echo-target]'),index>0?' · completion sends ×1.10 to '+Game.CONFIG.GENERATORS[index-1].name:'');
        node.pattern.title='The unit price stays fixed for this pattern. Only purchased units fill it. Patterns repeat 4 → 6 → 8 → 12. Completing a pattern strengthens this generator and reinforces the previous generator.';
        text(node.scaling,'Next pattern raises the unit price ×'+number(Game.Energy.getGeneratorScaling(gen),3)+'. Constant price inside each 4 / 6 / 8 / 12 pattern. Later pattern price jumps grow.');
        if(gen.id==='energyDisturbance') { describe(node,'Each unit produces Energy immediately. Pattern bonuses strengthen purchased and added units together.');text(node.production,'Producing '+number(Game.Energy.getGeneratorProduction(gen).mul(Game.Time.getGameSpeed()))+' Energy/sec · continuous flow'); }
        if(gen.type==='oscillation') {
          describe(node,'Builds from a dependable baseline to a larger peak. Purchased patterns strengthen both. Peak timing remains available.');
          const rules=Game.FieldDynamics.rules();text(node.production,'All Energy ×'+number(Game.FieldDynamics.multiplier(),5)+' · baseline ×'+number(Game.FieldDynamics.baseline(),5)+' · peak ×'+number(Game.FieldDynamics.peak(),5)+(Game.FieldDynamics.peakPaused()?' · peak held during negative Fluct':Game.FieldDynamics.held()?' · waiting for release':' · '+number(Game.FieldDynamics.nextEventIn(),1)+'s to '+(p.fieldDynamics.elapsed.lt(rules.rise)?'peak':'restart')));
        }
        if(gen.type==='fluctuation') describe(node,'Purchased patterns build dependable strength. Positive and negative Fluct vary that strength.'+(Game.Coherence.discovered() || Game.Discovery.generator('coherentEnergy')?' Quantum Resonance reinforces it with diminishing returns.':''));
        if(gen.type==='field') describe(node,'Purchasing immediately adds base Energy output. Every second adds more; purchased patterns strengthen future growth.');
      });
      text(byId('resonance-fluct-growth'),'QR stable-strength bonus ×'+number(Game.Energy.fluctGrowth(),5)+' · effective Resonance '+number(Game.Coherence.quantumSoftcapState().effective));
      if(this.confirming && this.owner!==p && !byId('stabilization-dialog').classList.contains('is-dismissing')) this.dismiss(false);
    }
  };
  const init=Game.UI.init,render=Game.UI.render;
  Game.UI.init=function () { init.call(this);Game.StructureUI.init(); };
  Game.UI.render=function () { render.call(this);Game.StructureUI.render(); };
})(window.CosmicIdle);
