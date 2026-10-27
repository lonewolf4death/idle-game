(function (Game) {
  function element(id) { return document.getElementById(id); }
  function text(node,value) { if(node.textContent!==value) node.textContent=value; }
  Game.AutomationUI = {
    selected:'energyDisturbance', key:null, rows:{}, tracks:{}, completion:'',
    init: function () {
      const view=this;
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
        const row=document.createElement('label');
        row.innerHTML='<span>'+buyer.name+'<small></small></span><input type="checkbox" aria-label="Auto '+buyer.name+'">';
        row.querySelector('input').addEventListener('change',function () {
          Game.Loop.pump(performance.now());Game.Automation.setEnabled(buyer.id,this.checked);Game.Save.save();view.render();
        });
        element('automation-settings-list').appendChild(row);view.rows[buyer.id]=row;
        const track=document.createElement('button');track.type='button';track.dataset.track=buyer.id;
        track.innerHTML=Game.Icons.svg(buyer.id)+'<span>'+buyer.title+'<small></small></span>';
        track.addEventListener('click',function () { view.selected=buyer.id;view.completion='';view.key=null;view.render(); });
        element('challenge-tracks').appendChild(track);view.tracks[buyer.id]=track;
      });
      element('automation-all-on').addEventListener('click',function () { view.toggleAll(true); });
      element('automation-all-off').addEventListener('click',function () { view.toggleAll(false); });
      element('automation-challenges').addEventListener('click',function () { Game.UI.selectView('challenges',true); });
      element('challenge-detail').addEventListener('click',function (event) {
        const cell=event.target.closest('[data-cell]');
        if(cell) {
          const id=view.selected,state=Game.player.automation.buyers[id],before=state.level;
          if(Game.Challenges.pulse(id,Number(cell.dataset.cell))) {
            if(state.level>before) view.completion='Level '+state.level+' aligned. Buyer interval: '+Game.Automation.interval(id).toFixed(1)+' seconds.';
            view.key=null;view.render();
            const next=element('challenge-detail').querySelector('[data-cell="'+cell.dataset.cell+'"]');
            if(next) next.focus({preventScroll:true});else element('challenge-result').focus({preventScroll:true});
          }
        }
        if(event.target.closest('#challenge-reset')) { Game.Challenges.reset(view.selected);view.key=null;view.render(); }
      });
      element('challenge-detail').addEventListener('keydown',function (event) {
        const cell=event.target.closest('[data-cell]');if(!cell || !event.key.startsWith('Arrow')) return;
        const puzzle=Game.Challenges.puzzle(view.selected,Game.player.automation.buyers[view.selected].level),n=Number(cell.dataset.cell),size=puzzle.size;
        const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-size,ArrowDown:size}[event.key];
        if(delta===undefined) return;
        event.preventDefault();const next=n+delta;
        if(next>=0 && next<size*size && (Math.abs(delta)!==1 || Math.floor(next/size)===Math.floor(n/size))) element('challenge-detail').querySelector('[data-cell="'+next+'"]').focus();
      });
    },
    toggleAll: function (enabled) {
      Game.Loop.pump(performance.now());Game.Automation.setAll(enabled);Game.Save.save();this.render();
    },
    render: function () {
      if(!this.rows.energyDisturbance) return;
      const challengesVisible=!element('challenges-view').hidden, settingsVisible=!element('settings-view').hidden;
      if(!challengesVisible && !settingsVisible) return;
      const view=this;
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) {
        const state=Game.player.automation.buyers[buyer.id], unlocked=Game.Automation.unlocked(buyer.id), interval=Game.Automation.interval(buyer.id).toFixed(1);
        if(settingsVisible) {
          const row=view.rows[buyer.id],input=row.querySelector('input');
          input.disabled=!unlocked;input.checked=!!Game.player.settings.autoBuyers[buyer.id];
          text(row.querySelector('small'),unlocked ? 'Every '+interval+'s · challenge '+state.level+'/10' : 'Unlock skill '+buyer.skill+' · 100 Quanta');
        }
        if(challengesVisible) {
          const track=view.tracks[buyer.id];track.setAttribute('aria-pressed',String(view.selected===buyer.id));
          text(track.querySelector('small'),unlocked ? state.level+'/10 · '+interval+'s · '+buyer.name : 'Locked · skill '+buyer.skill+' · 100 Quanta');
        }
      });
      if(!challengesVisible) return;
      const buyer=Game.Automation.definition(this.selected),state=Game.player.automation.buyers[buyer.id],unlocked=Game.Automation.unlocked(buyer.id);
      const key=[buyer.id,state.level,state.board,state.moves,unlocked,this.completion].join('|');
      if(this.key===key) return;
      this.key=key;
      const detail=element('challenge-detail');
      detail.innerHTML='<span class="label">'+buyer.name+'</span><h3>'+buyer.title+'</h3><p class="challenge-reward">'+state.level+'/10 completed · '+Game.Automation.interval(buyer.id).toFixed(1)+'s per attempt</p><div class="challenge-levels" aria-label="Ten mastery levels">'+Array.from({length:10},function (_,i) { return '<span class="'+(i<state.level?'is-complete':'')+'">'+(i+1)+'</span>'; }).join('')+'</div>';
      if(!unlocked) {
        detail.insertAdjacentHTML('beforeend','<p class="challenge-instructions">Unlock skill <b>'+buyer.skill+'</b> for 100 Quanta to enter this track. No Energy or Quanta is spent on puzzle attempts.</p><button id="challenge-tree">Open skill tree</button>');
        element('challenge-tree').addEventListener('click',function () { Game.UI.selectView('prestige',true);Game.PrestigeUI.showDetails(buyer.skill,true); });return;
      }
      if(state.level>=10) {
        detail.insertAdjacentHTML('beforeend','<p id="challenge-result" tabindex="-1" class="challenge-result" role="status">Track mastered. One attempt every 1 second.</p><p class="challenge-instructions">All ten patterns are aligned. Enable your buyer in Settings to use its permanent speed improvement.</p>');return;
      }
      const puzzle=Game.Challenges.puzzle(buyer.id,state.level),board=Game.Challenges.board(buyer.id);
      detail.insertAdjacentHTML('beforeend','<p class="challenge-instructions"><b>Level '+(state.level+1)+' · '+puzzle.size+' × '+puzzle.size+'</b><br>Quiet every signal. A pulse flips its own cell and its immediate neighbors above, below, left and right. Lit cells become quiet; quiet cells light up. There is no time limit or move limit. The game continues while you solve.</p><div class="phase-grid" role="group" aria-label="Phase alignment puzzle" style="--grid-size:'+puzzle.size+'"></div><div class="challenge-actions"><button id="challenge-reset">Restart this level</button><span>'+state.moves+' pulses</span></div><p id="challenge-result" class="challenge-result" tabindex="-1" role="status"></p><p class="challenge-instructions">Reward: −0.4s to this buyer\'s interval per level, from 5s to 1s at level 10. Completion saves immediately. Use Tab and Enter/Space, or arrow keys within the grid.</p>');
      const grid=detail.querySelector('.phase-grid');
      for(let i=0;i<puzzle.size*puzzle.size;i++) {
        const lit=!!(board&(1<<i)),button=document.createElement('button');
        button.type='button';button.dataset.cell=i;button.className=lit?'is-lit':'';
        button.setAttribute('aria-label','Row '+(Math.floor(i/puzzle.size)+1)+', column '+(i%puzzle.size+1)+': '+(lit?'lit':'quiet'));
        button.setAttribute('aria-pressed',String(lit));button.innerHTML='<span aria-hidden="true">'+(lit?'◆':'·')+'</span>';grid.appendChild(button);
      }
      text(element('challenge-result'),this.completion);
    }
  };
})(window.CosmicIdle);
