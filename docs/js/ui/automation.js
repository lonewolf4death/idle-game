(function (Game) {
  function element(id) { return document.getElementById(id); }
  function text(node,value) { if(node.textContent!==value) node.textContent=value; }
  function number(value) { return Game.Format.number(value,0); }
  Game.AutomationUI = {
    selected:'energyDisturbance', key:null, rows:{}, tracks:{}, pending:null,
    init: function () {
      const view=this;
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer,index) {
        const row=document.createElement('label');
        row.innerHTML='<span>'+buyer.name+'<small></small></span><input type="checkbox" aria-label="Auto '+buyer.name+'">';
        row.querySelector('input').addEventListener('change',function () {
          Game.Loop.pump(performance.now());Game.Automation.setEnabled(buyer.id,this.checked);Game.Save.save();view.render();
        });
        element('automation-settings-list').appendChild(row);view.rows[buyer.id]=row;
        const track=document.createElement('button');track.type='button';track.dataset.track=buyer.id;
        track.innerHTML=Game.Icons.svg(buyer.id)+'<span>'+Game.CONFIG.CHALLENGES[index].name+'<small></small></span>';
        track.addEventListener('click',function () { view.selected=buyer.id;view.key=null;view.render(); });
        element('challenge-tracks').appendChild(track);view.tracks[buyer.id]=track;
      });
      element('automation-all-on').addEventListener('click',function () { view.toggleAll(true); });
      element('automation-all-off').addEventListener('click',function () { view.toggleAll(false); });
      element('automation-challenges').addEventListener('click',function () { Game.UI.selectView('challenges',true); });
      element('challenge-detail').addEventListener('click',function (event) {
        if(event.target.closest('#challenge-enter')) view.confirmRun('enter');
        if(event.target.closest('#challenge-exit')) view.confirmRun('exit');
        if(event.target.closest('#challenge-complete')) { Game.Loop.pump(performance.now());Game.Challenges.complete(); }
        if(event.target.closest('#challenge-tree')) {
          const buyer=Game.Automation.definition(view.selected);Game.UI.selectView('prestige',true);Game.PrestigeUI.showDetails(buyer.skill,true);
        }
      });
      element('active-challenge-view').addEventListener('click',function () {
        view.selected=Game.Challenges.buyer().id;view.key=null;Game.UI.selectView('challenges',true);
      });
      element('active-challenge-exit').addEventListener('click',function () { view.confirmRun('exit'); });
      element('active-challenge-complete').addEventListener('click',function () { Game.Loop.pump(performance.now());Game.Challenges.complete(); });
      element('challenge-confirm').addEventListener('click',function () { view.finishConfirmation(true); });
      element('challenge-cancel').addEventListener('click',function () { view.finishConfirmation(false); });
      element('challenge-dialog').addEventListener('cancel',function (event) { event.preventDefault();view.finishConfirmation(false); });
    },
    confirmRun: function (action) {
      Game.Loop.pump(performance.now());
      const index=action==='exit'?Game.Challenges.active():Game.CONFIG.AUTOMATION.buyers.findIndex(function (buyer) { return buyer.id===Game.AutomationUI.selected; })+1;
      if(!index || action==='enter' && (Game.Challenges.active() || !Game.Automation.unlocked(this.selected) || Game.Challenges.level(index)>=10)) return;
      const rule=Game.Challenges.definition(index),dialog=element('challenge-dialog');
      this.pending={action:action,index:index,owner:Game.player};
      Game.Challenges.confirming=true;
      text(element('challenge-confirm-title'),action==='enter' ? 'Enter '+rule.name+' · Level '+(Game.Challenges.level(index)+1)+'?' : 'Exit '+rule.name+'?');
      text(element('challenge-confirm-description'),(action==='enter' ? rule.description+' Goal: '+number(Game.Challenges.goal(index))+' Energy. ' : 'This attempt will not earn a completion. ')+ 'Restart the current run, losing its Energy, generators, Disturb, Resonance and run timers. No Quanta is awarded. Keep all Quanta, skills, achievements, lore, total playtime and completed challenge levels. '+(action==='enter'?'All automation, automatic clicks and bubbles pause; starting-unit skills are replaced by this challenge’s stated starting units. Skill purchases and respec are locked until you leave.':''));
      text(element('challenge-confirm'),action==='enter'?'Enter · restart run':'Exit · restart run');
      element('challenge-confirm').disabled=false;element('challenge-cancel').disabled=false;dialog.classList.remove('is-dismissing');dialog.showModal();element('challenge-cancel').focus();
    },
    finishConfirmation: function (accept) {
      const dialog=element('challenge-dialog'),view=this,pending=this.pending;
      if(!dialog.open || !pending || dialog.classList.contains('is-dismissing')) return;
      element('challenge-confirm').disabled=true;element('challenge-cancel').disabled=true;dialog.classList.add('is-dismissing');
      setTimeout(function () {
        Game.Loop.pump(performance.now());dialog.close();dialog.classList.remove('is-dismissing');view.pending=null;Game.Challenges.confirming=false;
        if(accept && Game.player===pending.owner) {
          if(pending.action==='enter') { Game.Challenges.enter(pending.index);Game.UI.selectView('energy',true); }
          else Game.Challenges.exit();
        }
        view.key=null;view.render();Game.Experience.next();
      },2000);
    },
    toggleAll: function (enabled) {
      Game.Loop.pump(performance.now());Game.Automation.setAll(enabled);Game.Save.save();this.render();
    },
    renderBanner: function () {
      const active=Game.Challenges.active(),banner=element('active-challenge-banner'),ready=active && Game.Challenges.ready();
      banner.hidden=!active;
      text(element('milestone-title'),active?'Challenge goal':'Condense Energy');
      element('milestone-bar').setAttribute('aria-label',active?'Logarithmic progress to the challenge goal':'Logarithmic progress to Condense Energy');
      const clicks=Game.Challenges.clicksAllowed();element('energy-field').setAttribute('aria-disabled',String(!clicks));
      element('energy-field').setAttribute('aria-label',clicks?'Generate Energy. Click anywhere in this field, or press Enter or Space.':'Clicks are disabled during Hands off. Generators continue producing Energy.');
      text(document.querySelector('.field-footnote'),clicks?'Click anywhere to stir the potential.':'Hands off · Let the field grow on its own.');
      if(!active) return;
      if(!clicks) text(element('click-gain'),'Clicks disabled · Hands off');
      const rule=Game.Challenges.definition(),level=Game.Challenges.level()+1,goal=Game.Challenges.goal(),best=Game.player.challenges.bestEnergy;
      text(element('active-challenge-name'),rule.name+' · Level '+level+'/10');
      text(element('active-challenge-progress'),(ready?'Goal reached · ':'Best Energy: '+number(best)+' / '+number(goal)+' · ')+'Automation paused');
      element('active-challenge-complete').disabled=!ready;
      const percent=Math.max(0,Math.min(100,best.add(1).log10()/goal.log10()*100));
      element('milestone-fill').style.width=percent+'%';element('milestone-bar').setAttribute('aria-valuenow',percent.toFixed(2));
      element('milestone-bar').setAttribute('aria-valuetext',percent.toFixed(1)+'% to the challenge Energy goal');
      text(element('milestone-value'),number(best)+' / '+number(goal)+' best held Energy');
      text(element('milestone-caption'),ready?'Goal reached · Complete the challenge to earn its reward':rule.name+' · '+percent.toFixed(1)+'% · Logarithmic scale');
      element('milestone-condense-summary').hidden=true;
    },
    render: function () {
      if(!this.rows.energyDisturbance) return;
      const challengesVisible=!element('challenges-view').hidden,settingsVisible=!element('settings-view').hidden;
      if(!challengesVisible && !settingsVisible) return;
      const view=this,active=Game.Challenges.active();Game.Challenges.observe();
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer,index) {
        const state=Game.player.automation.buyers[buyer.id],unlocked=Game.Automation.unlocked(buyer.id),interval=Game.Automation.interval(buyer.id).toFixed(1);
        if(settingsVisible) {
          const row=view.rows[buyer.id],input=row.querySelector('input');input.disabled=!unlocked;input.checked=!!Game.player.settings.autoBuyers[buyer.id];
          text(row.querySelector('small'),unlocked ? (active?'Paused in challenge · ':'')+'Every '+interval+'s · challenge '+state.level+'/10' : 'Unlock skill '+buyer.skill+' · 100 Quanta');
        }
        if(challengesVisible) {
          const track=view.tracks[buyer.id];track.setAttribute('aria-pressed',String(view.selected===buyer.id));
          text(track.querySelector('small'),unlocked ? (active===index+1?'Running · ':'')+state.level+'/10 · '+interval+'s · '+buyer.name : 'Locked · skill '+buyer.skill+' · 100 Quanta');
        }
      });
      if(!challengesVisible) return;
      const buyer=Game.Automation.definition(this.selected),index=Game.CONFIG.AUTOMATION.buyers.indexOf(buyer)+1,state=Game.player.automation.buyers[buyer.id],unlocked=Game.Automation.unlocked(buyer.id),rule=Game.Challenges.definition(index),running=active===index;
      const key=[buyer.id,state.level,active,unlocked].join('|');
      if(this.key!==key) {
        this.key=key;const detail=element('challenge-detail');
        detail.innerHTML='<span class="label">'+buyer.name+' automation</span><h3>'+rule.name+'</h3><p class="challenge-reward">'+state.level+'/10 completed · '+Game.Automation.interval(buyer.id).toFixed(1)+'s per attempt</p><div class="challenge-levels" aria-label="Ten challenge levels">'+Array.from({length:10},function (_,i) { return '<span title="Level '+(i+1)+': '+number(Game.D(10).pow(rule.startExponent+rule.exponentStep*i))+' Energy" class="'+(i<state.level?'is-complete':'')+'">'+(i+1)+'</span>'; }).join('')+'</div><p class="challenge-rules">'+rule.description+'</p>';
        if(!unlocked) detail.insertAdjacentHTML('beforeend',(state.level<10?'<div class="challenge-goal"><span class="label">Next · Level '+(state.level+1)+'</span><strong>Reach '+number(Game.Challenges.goal(index))+' Energy</strong></div><p class="challenge-instructions">Reward: −0.4s to this buyer’s interval per completion, down to 1s at level ten.</p>':'<p class="challenge-result">Track mastered · Rebuy its automation skill to use the 1s interval.</p>')+'<p class="challenge-instructions">Unlock skill <b>'+buyer.skill+'</b> for 100 Quanta to enter this challenge.</p><button id="challenge-tree">Open skill tree</button>');
        else if(state.level>=10) detail.insertAdjacentHTML('beforeend','<p class="challenge-result">Mastered · One automation attempt every 1 real second.</p>');
        else {
          detail.insertAdjacentHTML('beforeend','<div class="challenge-goal"><span class="label">'+(running?'Active':'Next')+' · Level '+(state.level+1)+'</span><strong>Reach '+number(Game.Challenges.goal(index))+' Energy</strong><p id="challenge-run-progress"></p></div><p class="challenge-instructions">Reward: '+buyer.name+' automation interval '+Game.Automation.interval(buyer.id).toFixed(1)+'s → '+(Game.Automation.interval(buyer.id)-.4).toFixed(1)+'s. Each completion removes 0.4s, reaching 1s at level ten.</p><div class="challenge-actions">'+(running?'<button id="challenge-complete">Complete · restart run</button><button id="challenge-exit">Exit challenge</button>':'<button id="challenge-enter" '+(active?'disabled':'')+'>'+(active?'Exit current challenge first':'Enter challenge')+'</button>')+'</div>');
        }
        detail.insertAdjacentHTML('beforeend','<p class="challenge-instructions">One challenge at a time. Entry, completion and exit restart the run without Quanta or a Condense. Keep skills, Quanta, achievements, lore and total playtime. Starting-unit skills do not grant units during challenges. Buyers, automatic impulses and bubbles pause; skill purchases and respec are locked. Reach the goal once, then choose Complete to earn one level and return to normal play.</p>');
      }
      if(element('challenge-run-progress')) text(element('challenge-run-progress'),running?'Best held: '+number(Game.player.challenges.bestEnergy)+' / '+number(Game.Challenges.goal(index))+' Energy':'A fresh run with altered rules. No resource entry fee.');
      if(element('challenge-complete')) element('challenge-complete').disabled=!Game.Challenges.ready();
    }
  };
})(window.CosmicIdle);
