(function (Game) {
  const el=function (id) { return document.getElementById(id); };
  function text(node,value) { value=String(value);if(node.textContent!==value) node.textContent=value; }
  function number(value,digits) { return Game.Format.number(value,digits===undefined?3:digits); }
  Game.SymmetryUI={
    upgrades:{},milestones:[],
    select:function (layer) {
      if(layer===1 && !Game.Symmetry.unlocked() && !false) return;
      Game.player.ui.generatorLayer=layer;Game.Save.save();Game.UI.selectView('energy');el('symmetry-controls').parentElement.scrollTop=0;
    },
    init:function () {
      const info=el('symmetry-counter').querySelector('button');info.addEventListener('click',function (event) { event.stopPropagation(); });info.addEventListener('keydown',function (event) { if(event.key===' ' || event.key==='Enter') event.stopPropagation(); });
      el('layer-primordial').addEventListener('click',function () { Game.SymmetryUI.select(0); });
      el('layer-symmetry').addEventListener('click',function () { Game.SymmetryUI.select(1); });
      el('buy-field-alignment').addEventListener('click',function () { Game.Loop.pump(performance.now());Game.Symmetry.buy(Game.UI.buyAmount);Game.UI.render(); });
      Game.CONFIG.SYMMETRY.milestones.forEach(function (m) {
        const row=document.createElement('li');row.hidden=true;row.innerHTML='<strong>'+Math.round(m.at*100)+'% · '+m.type+'</strong><span>'+m.reward+'</span>';el('symmetry-milestones').appendChild(row);Game.SymmetryUI.milestones.push(row);
      });
      Object.keys(Game.CONFIG.SYMMETRY.upgrades).forEach(function (id) {
        const rule=Game.CONFIG.SYMMETRY.upgrades[id],card=document.createElement('article');card.className='unified-upgrade';card.dataset.unified=id;
        card.innerHTML='<h3>'+(id==='quantumCoupling'?'<button class="info-term" data-tip="symmetryQuanta">'+rule.name+'</button>':rule.name)+'</h3><p>'+rule.description+'</p><p class="unified-cost"></p><button data-buy-unified>Purchase</button>';
        card.querySelector('[data-buy-unified]').addEventListener('click',function () { Game.Loop.pump(performance.now());Game.Symmetry.buyUpgrade(id);Game.UI.render(); });
        el('unified-upgrades').appendChild(card);Game.SymmetryUI.upgrades[id]=card;
      });
    },
    render:function (reveal) {
      const p=Game.player,S=Game.Symmetry,open=S.unlocked(),visible=open||reveal;
      if(!visible) {
        p.ui.generatorLayer=0;el('generator-layer-switch').hidden=true;el('primordial-controls').hidden=false;el('symmetry-controls').hidden=true;el('symmetry-counter').hidden=true;el('perfect-alignment-tree').hidden=true;el('symmetry-breaking').hidden=true;
        document.body.classList.remove('symmetry-layer','has-symmetry');el('energy-field').style.setProperty('--symmetry-strength','0');el('milestone-bar').classList.remove('symmetry-progress');return;
      }
      const selected=p.ui.generatorLayer===1;
      el('generator-layer-switch').hidden=!visible;
      el('layer-primordial').setAttribute('aria-pressed',String(!selected));el('layer-symmetry').setAttribute('aria-pressed',String(selected));
      el('primordial-controls').hidden=selected;el('symmetry-controls').hidden=!selected;
      if(selected) el('resonance-overview').hidden=true;
      document.body.classList.toggle('symmetry-layer',selected);document.body.classList.toggle('has-symmetry',visible);
      const amount=S.amount(),percent=amount*100,pct=percent.toFixed(percent>=99?4:3)+'%';
      el('symmetry-counter').hidden=!visible;text(el('symmetry-amount'),pct);text(el('symmetry-type'),S.type());
      el('symmetry-counter').title='S = '+amount.toFixed(6)+' · M = 10^(100 × S^4)'+(S.has('perfectInteraction')?' ^1.15':'')+' · Energy ×'+number(S.multiplier(),5);
      el('energy-field').style.setProperty('--symmetry-strength',String(p.settings.visuals?S.intensity():0));
      el('energy-field').style.setProperty('--symmetry-hue',String(268-110*amount));
      text(el('symmetry-total'),pct);text(el('symmetry-energy-bonus'),'×'+number(S.multiplier(),5)+' Energy');
      text(el('symmetry-production'),S.reached(1)?'Perfect Symmetry · generation capped':number(S.perSecond().mul(100),5)+'% / game second');
      text(el('field-alignment-owned'),'Purchased: '+number(p.symmetry.alignment,0)+' + '+number(p.symmetry.alignmentAdded,0)+' added · Total: '+number(S.alignmentOwned(),0));
      text(el('field-alignment-output'),number(S.unitProduction().mul(100),5)+'% per level / game second before shared field resistance'+(S.reached(.1)?' · Aligned fields active':''));
      const quote=S.quote(Game.UI.buyAmount),buy=el('buy-field-alignment');buy.disabled=quote.count.lte(0);
      text(buy,'Buy '+number(quote.requested || quote.count,0)+' — '+number(quote.cost)+' Energy');
      el('field-alignment-scaling').hidden=!reveal;text(el('field-alignment-scaling'),'SGen1 · first 8 prices scale ×1.1, then cost jumps ×1e10, ×1e20, ×1e40… · shared production limit '+number(Game.D(Game.CONFIG.SYMMETRY.totalProductionLimit).mul(100),5)+'% / game second');
      el('symmetry-locked-note').hidden=open;
      el('unified-interaction').hidden=!(S.discovered(.5)||reveal);
      Object.keys(this.upgrades).forEach(function (id) {
        const card=Game.SymmetryUI.upgrades[id],rule=Game.CONFIG.SYMMETRY.upgrades[id],owned=S.has(id);
        card.hidden=!!rule.perfect && !(S.discovered(1)||reveal);card.classList.toggle('is-owned',owned);
        const cost=number(S.upgradeCost(id));text(card.querySelector('.unified-cost'),'Cost: '+cost+' Energy');
        const button=card.querySelector('[data-buy-unified]');button.disabled=!S.canBuyUpgrade(id);text(button,owned?'Purchased':Game.Challenges.active()?'Unavailable during challenges':!S.discovered(rule.perfect?1:.5)?'Requires '+(rule.perfect?'Perfect Symmetry':'50% Symmetry'):'Buy · '+cost+' Energy');
      });
      this.milestones.forEach(function (row,index) { const m=Game.CONFIG.SYMMETRY.milestones[index];row.hidden=!(S.discovered(m.at)||reveal);row.classList.toggle('is-active',S.reached(m.at));row.classList.toggle('is-discovered',S.discovered(m.at)); });
      el('symmetry-milestones').parentElement.hidden=!this.milestones.some(function (row) { return !row.hidden; });
      el('symmetry-breaking').hidden=!(S.discovered(.99)||reveal);el('perfect-alignment-tree').hidden=!(S.discovered(.9)||reveal);
      text(el('symmetry-reset-note'),'Condense resets Symmetry and Field Alignment. Purchased Unified Interaction upgrades remain. Discovered features stay revealed.');
      if(!Game.Challenges.active() && open) {
        text(el('milestone-title'),'Symmetry');text(el('milestone-value'),pct+' · '+S.type());
        el('milestone-fill').style.width=percent+'%';el('milestone-bar').setAttribute('aria-valuenow',String(percent));el('milestone-bar').setAttribute('aria-label',S.discovered(1)||reveal?'Symmetry progress to Perfect Symmetry':'Symmetry progress');el('milestone-bar').setAttribute('aria-valuetext',pct+' · '+S.type());
        const next=S.nextMilestone(),known=next&&(S.discovered(next.at)||reveal);text(el('milestone-caption'),(known?'Next: '+Math.round(next.at*100)+'% · '+next.type+' · ':!next?'Perfect Symmetry · ':'')+'Energy ×'+number(S.multiplier(),5));
        el('milestone-bar').classList.add('symmetry-progress');
      } else el('milestone-bar').classList.remove('symmetry-progress');
      S.showLore();
    }
  };
})(window.CosmicIdle);
