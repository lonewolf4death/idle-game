(function (Game) {
  const el=function (id) { return document.getElementById(id); };
  Game.Offline={
    busy:false,processing:false,state:'idle',fastRealStep:0,fastGameStep:null,coarseSeconds:60,
    prepare:function (loaded) {
      const saved=Game.player.time.lastActiveAt;
      if(loaded && saved>0 && saved<Date.now()) this.begin((Date.now()-saved)/1000);
    },
    begin:function (seconds) {
      if(this.busy || !Number.isFinite(seconds) || seconds<=1e-6 || !Number.isFinite(Game.player.time.realPlayed+seconds)) return false;
      this.busy=true;this.processing=false;this.state='choice';this.total=seconds;this.completed=0;
      this.targetAt=Date.now();this.startAt=this.targetAt-seconds*1000;this.cursorAt=this.startAt;
      this.mode='accurate';this.coarseSeconds=60;this.approximate=false;this.cancelRequested=false;this.error='';
      this.before={energy:Game.player.resources.energy.toString(),quanta:Game.player.prestige.totalQuanta,times:Game.player.prestige.times};
      this.stabilizations=0;
      return true;
    },
    offer:function (seconds) {
      if(!this.begin(seconds)) return;
      if(Game.AchievementNotices) { Game.AchievementNotices.render();Game.AchievementNotices.schedule(); }
      if(Game.Audio)Game.Audio.updateVolume();
      if(this.total<10)this.run('accurate',true);else this.show();
      Game.Save.save();
    },
    timestamp:function () { return this.busy ? this.cursorAt : Date.now(); },
    init:function () {
      const offline=this;this.dialog=el('offline-dialog');
      el('offline-accurate').addEventListener('click',function () { offline.run('accurate'); });
      el('offline-fast').addEventListener('click',function () {
        if(offline.processing && offline.mode==='fast') offline.coarseSeconds=300;
        offline.run('fast');
      });
      el('offline-skip').addEventListener('click',function () { offline.skip(); });
      el('offline-continue').addEventListener('click',function () { offline.continue(); });
      this.dialog.addEventListener('cancel',function (event) { event.preventDefault(); });
      document.addEventListener('visibilitychange',function () { if(!document.hidden && offline.busy) offline.show(); });
      if(this.busy) {
        if(this.total<10) this.run('accurate',true);
        else this.show();
      }
    },
    show:function () {
      if(!this.dialog || document.hidden) return;
      if(this.state==='choice') { this.targetAt=Date.now();this.total=Math.max(this.total,(this.targetAt-this.startAt)/1000); }
      if(!this.dialog.open) { this.previousFocus=document.activeElement;this.dialog.showModal(); }
      this.render(true);
    },
    render:function (force) {
      if(!this.dialog) return;
      const now=performance.now();if(!force && now-(this.lastRender||0)<100) return;this.lastRender=now;
      const done=this.state==='complete',duration=function (seconds) { return Game.Format.runDuration(seconds); };
      el('offline-description').textContent='Unprocessed time: '+duration(this.total)+'.';
      el('offline-progress').value=this.total?Math.min(1,this.completed/this.total):0;
      const mode=this.mode==='fast'?'Fast · '+this.coarseSeconds+'s checkpoints · approximate':'Accurate simulation';
      el('offline-status').textContent=this.error?this.error:done?(this.skipped?'Remaining time skipped.':'Offline simulation complete.'):this.processing?mode+' · '+duration(this.completed)+' / '+duration(this.total):'Choose how to process this time.';
      const p=Game.player,parts=['Energy: '+Game.Format.energy(this.before.energy)+' → '+Game.Format.energy(p.resources.energy)];
      const quanta=p.prestige.totalQuanta.sub(this.before.quanta),condenses=p.prestige.times.sub(this.before.times);
      if(quanta.gt(0))parts.push('Quanta earned: '+Game.Format.number(quanta,0));
      if(condenses.gt(0))parts.push('Condenses: '+Game.Format.number(condenses,0));
      if(this.stabilizations)parts.push('Stabilizations: '+this.stabilizations);
      if(done)parts.push('Processed: '+duration(this.completed)+(this.skipped?' · skipped '+duration(Math.max(0,this.total-this.completed)):''));
      if(this.approximate)parts.push('Fast mode was used; results are approximate.');
      el('offline-summary').textContent=parts.join('\n');
      ['offline-accurate','offline-fast','offline-skip'].forEach(function (id) { el(id).hidden=done; });
      el('offline-continue').hidden=!done;
      el('offline-accurate').disabled=this.processing && this.mode==='accurate';
      el('offline-accurate').textContent=this.processing?'Use accurate mode':this.error?'Retry accurately':'Simulate accurately';
      el('offline-fast').disabled=!!Game.Challenges.active() || this.processing && this.mode==='fast' && this.coarseSeconds>=300;
      el('offline-fast').textContent=this.processing && this.mode==='fast'?(this.coarseSeconds>=300?'Fastest mode':'Speed up again · less accurate'):'Fast · less accurate';
      el('offline-skip').textContent=this.processing?'Skip remaining time':'Skip offline time';
      el('offline-accuracy').textContent=Game.Challenges.active()?'Active challenges use accurate simulation so deadlines and resets follow their normal rules. You can still skip unprocessed time.':'Accurate uses normal simulation rules. Fast checks purchases and timed production less often, so results can differ. Skipping keeps processed progress and discards the remaining time.';
    },
    settle:function () {
      this.fastRealStep=0;this.fastGameStep=null;
      // Finish unpaid partial cycles before normal timers, saves, or UI resume.
      Game.Coherence.resolveEvents();Game.FieldExcitation.resolveEvents();Game.Automation.resolve();
    },
    run:async function (mode,quiet) {
      if(!this.busy || this.state==='complete') return;
      this.mode=mode==='fast' && !Game.Challenges.active()?'fast':'accurate';
      if(this.processing) { this.render(true);return; }
      if(this.state==='choice') {
        this.targetAt=Date.now();this.total=Math.max(this.total,(this.targetAt-this.startAt)/1000);
      }
      this.processing=true;this.state='running';this.error='';this.cancelRequested=false;
      Game.Loop.catchingUp=true;
      if(Game.FieldWaves)Game.FieldWaves.clear();
      if(Game.Audio)Game.Audio.updateVolume();
      if(Game.AchievementNotices) { Game.AchievementNotices.render();Game.AchievementNotices.schedule(); }
      try {
        this.render(true);
        // Paint the controls before any potentially expensive production work.
        await new Promise(function (resolve) { setTimeout(resolve,0); });
        while(this.completed+1e-9<this.total && !this.cancelRequested) {
          const started=performance.now();let ticks=0;
          do {
            const fast=this.mode==='fast',step=Math.min(fast?this.coarseSeconds:1,this.total-this.completed);
            if(fast) { this.fastRealStep=step;this.fastGameStep=Game.Time.getGameDelta(step);this.approximate=true; }
            this.cursorAt=this.startAt+(this.completed+step)*1000;
            try { Game.Loop.simulate(step); } finally { if(fast)this.settle(); }
            this.completed=Math.min(this.total,this.completed+step);ticks++;
            if(Game.Save.writeProtected)throw new Error('Saving is paused. Processed progress is kept in this session; resolve the save conflict in Settings after leaving this panel.');
          } while(this.completed+1e-9<this.total && !this.cancelRequested && performance.now()-started<8 && ticks<32);
          this.render(false);
          if(this.completed+1e-9<this.total && !this.cancelRequested)await new Promise(function (resolve) { setTimeout(resolve,0); });
        }
        this.processing=false;Game.Loop.catchingUp=false;this.finish(this.cancelRequested);
        if(quiet)await this.continue();
      } catch(error) {
        this.fastRealStep=0;this.fastGameStep=null;this.processing=false;Game.Loop.catchingUp=false;
        this.state='error';this.error='Simulation paused: '+error.message;this.render(true);
      }
    },
    skip:function () {
      if(!this.busy || this.state==='complete') return;
      if(this.state==='choice') { this.targetAt=Date.now();this.total=Math.max(this.total,(this.targetAt-this.startAt)/1000); }
      this.cancelRequested=true;
      if(!this.processing)this.finish(true);
    },
    finish:function (skipped) {
      this.state='complete';this.skipped=skipped;this.error='';this.processing=false;
      this.cursorAt=Date.now();Game.Loop.accumulator=0;Game.Loop.lastTime=performance.now();
      Game.Save.save();this.render(true);
      if(this.dialog && this.dialog.open && !document.hidden)el('offline-continue').focus();
    },
    continue:async function () {
      if(this.state!=='complete' || this.continuing) return;
      this.continuing=true;
      if(this.dialog && this.dialog.open) {
        this.dialog.classList.add('is-dismissing');
        await new Promise(function (resolve) { setTimeout(resolve,2000); });
        this.dialog.close();this.dialog.classList.remove('is-dismissing');
      }
      this.busy=false;this.state='idle';this.continuing=false;
      Game.Loop.accumulator=0;Game.Loop.lastTime=performance.now();
      // Waiting on the completed report must not erase another absence.
      const extra=Math.max(0,(Date.now()-this.cursorAt)/1000);
      if(extra>=1 && this.begin(extra)) {
        if(extra<10)await this.run('accurate',true);
        else { this.show();Game.Save.save(); }
        return;
      }
      Game.Save.save();
      if(Game.UI)Game.UI.render();
      if(this.previousFocus && this.previousFocus.isConnected)this.previousFocus.focus();
      if(Game.AchievementNotices) { Game.AchievementNotices.render();Game.AchievementNotices.schedule(); }
      if(Game.Experience)Game.Experience.syncPlayer();
      if(Game.Audio)Game.Audio.updateVolume();
    }
  };
})(window.CosmicIdle);
