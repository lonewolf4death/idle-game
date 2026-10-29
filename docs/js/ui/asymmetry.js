(function (Game) {
  const el=function (id) { return document.getElementById(id); };
  const text=function (node,value) { value=String(value);if(node.textContent!==value)node.textContent=value; };
  Game.AsymmetryUI={
    cards:{},owner:null,
    init:function () {
      const ui=this;
      Object.entries(Game.CONFIG.ASYMMETRY.upgrades).forEach(function (entry) {
        const id=entry[0],rule=entry[1],card=document.createElement('article');card.className='asymmetry-upgrade';card.dataset.asymmetry=id;
        card.innerHTML='<span class="asymmetry-emblem" aria-hidden="true">'+Game.Icons.svg('coherent')+'</span><h3>'+rule.name+'</h3><p>'+rule.description+'</p><p data-asymmetry-level></p><button data-asymmetry-buy>Purchase</button>';
        card.querySelector('button').addEventListener('click',function () { Game.Loop.pump(performance.now());if(Game.Offline.busy)return;Game.Asymmetry.buy(id); });
        el('asymmetry-upgrades').appendChild(card);ui.cards[id]=card;
      });
      el('view-asymmetry').addEventListener('click',function () { Game.UI.selectView('asymmetry',true); });
      el('break-symmetry').addEventListener('keydown',function (event) { if(event.key===' ' || event.key==='Enter')event.stopPropagation(); });
      el('break-symmetry').addEventListener('click',function (event) {
        event.stopPropagation();
        Game.Loop.pump(performance.now());if(Game.Offline.busy || Game.Asymmetry.reward().lte(0))return;
        if(!Game.player.settings.confirmBreak) { Game.Asymmetry.breakSymmetry();return; }
        ui.owner=Game.player;Game.Asymmetry.confirming=true;ui.render();el('break-dialog').showModal();el('cancel-break').focus();
      });
      const close=function (accept) {
        const dialog=el('break-dialog');if(!dialog.open || dialog.classList.contains('is-dismissing'))return;
        const owner=ui.owner;dialog.classList.add('is-dismissing');el('confirm-break').disabled=true;el('cancel-break').disabled=true;
        setTimeout(function () {
          dialog.close();dialog.classList.remove('is-dismissing');Game.Asymmetry.confirming=false;ui.owner=null;el('cancel-break').disabled=false;
          if(accept && owner===Game.player) { Game.Loop.pump(performance.now());if(!Game.Offline.busy)Game.Asymmetry.breakSymmetry(); }
          if(el('break-symmetry').getClientRects().length)el('break-symmetry').focus();
        },2000);
      };
      el('cancel-break').addEventListener('click',function () { close(false); });
      el('confirm-break').addEventListener('click',function () { close(true); });
      el('break-dialog').addEventListener('cancel',function (event) { event.preventDefault();close(false); });
      el('asymmetry-tab').insertAdjacentHTML('afterbegin',Game.Icons.svg('coherent'));
    },
    render:function () {
      const p=Game.player,a=p.asymmetry,number=Game.Format.number;
      text(el('asymmetry-balance'),number(a.amount,0)+' Asymmetry');
      text(el('asymmetry-history'),number(a.total,0)+' earned · '+number(a.times,0)+' breaks');
      text(el('break-dialog-reward'),'Gain '+number(Game.Asymmetry.reward(),0)+' Asymmetry.');
      el('confirm-break').disabled=el('break-dialog').classList.contains('is-dismissing') || this.owner!==p || Game.Asymmetry.reward().lte(0);
      Object.entries(this.cards).forEach(function (entry) {
        const id=entry[0],card=entry[1],level=a.upgrades[id],rule=Game.CONFIG.ASYMMETRY.upgrades[id],cost=Game.Asymmetry.cost(id);
        text(card.querySelector('[data-asymmetry-level]'),'Level '+level+' / '+rule.max+' · '+(rule.startingSymmetry?'Starting Symmetry +'+number(Game.Asymmetry.effect(id).mul(100),2)+' percentage points':'Current effect ×'+number(Game.Asymmetry.effect(id),4)));
        const button=card.querySelector('button');button.disabled=!Game.Asymmetry.canBuy(id);text(button,level>=rule.max?'Complete':number(cost,0)+' Asymmetry');card.classList.toggle('is-owned',level>0);
      });
    }
  };
  const init=Game.UI.init,render=Game.UI.render;
  Game.UI.init=function () { init.call(this);Game.AsymmetryUI.init(); };
  Game.UI.render=function () { if(Game.Offline && Game.Offline.processing)return;render.call(this);Game.AsymmetryUI.render(); };
})(window.CosmicIdle);
