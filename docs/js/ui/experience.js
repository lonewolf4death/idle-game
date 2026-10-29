(function (Game) {
  const byId = function (id) { return document.getElementById(id); };
  Game.Audio = {
    context: null, voices: 0, last: {}, unlocked: false, steps: {},
    start: function (fromInteraction) {
      if (fromInteraction) this.unlocked = true;
      if (!this.unlocked || !Game.player.settings.sound) return;
      try {
        if (!this.context) {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) throw new Error('Audio unavailable');
          this.context = new Context();
          this.master = this.context.createGain();
          this.master.gain.value = this.shouldMute() ? 0 : Game.player.settings.volume;
          const compressor = this.context.createDynamicsCompressor();
          this.master.connect(compressor); compressor.connect(this.context.destination);
          this.delay = this.context.createDelay(1);
          this.delay.delayTime.value = Game.CONFIG.AUDIO.echoSeconds;
          const echo = this.context.createGain(); echo.gain.value = Game.CONFIG.AUDIO.echoGain;
          // One soft echo, without a feedback loop that can build up under rapid input.
          this.delay.connect(echo); echo.connect(this.master);
        }
        if (this.context.state === 'suspended') this.context.resume().catch(function () {});
        byId('audio-status').textContent = '';
      } catch (error) { byId('audio-status').textContent = 'Sound is unavailable in this browser. You can keep playing silently.'; }
    },
    shouldMute: function () {
      if(Game.Offline && Game.Offline.busy) return true;
      return !!Game.player.settings.muteUnfocused && (document.hidden || !document.hasFocus());
    },
    updateVolume: function () {
      if (this.context) this.master.gain.setTargetAtTime(Game.player.settings.sound && !this.shouldMute() ? Game.player.settings.volume : 0, this.context.currentTime, .03);
    },
    musicStage: function () {
      const memory=Game.player.structure.stabilizations.gte(1)?Math.min(5,Game.player.structure.stabilizations.toNumber()+3):0;
      if (Game.FieldExcitation.discovered()) return 5;
      if (Game.Coherence.discovered()) return Math.max(memory,4);
      if (Game.Energy.getOwned("quantumFluctuation").gt(0)) return Math.max(memory,3);
      if (Game.player.stats.generatorsBought.gte(Game.CONFIG.MUSIC.secondMilestone)) return Math.max(memory,2);
      if (Game.player.stats.manualClicks.gte(Game.CONFIG.MUSIC.firstMilestone) || Game.player.stats.generatorsBought.gte(1)) return Math.max(memory,1);
      return memory;
    },
    fluctRate: function () {
      return Game.Energy.getOwned("quantumFluctuation").gt(0) && !Game.player.fluctuation.positive ? Game.CONFIG.AUDIO.negativeFluctRate : 1;
    },
    tone: function (kind) {
      const stage = Math.max(this.musicStage(), (kind === "quantumResonance" || kind === "energyResonance") ? 1 : 0);
      const step = this.steps[kind] || 0; this.steps[kind] = step + 1;
      const scale = Game.CONFIG.MUSIC.scale;
      const movement = stage >= 5 ? 1 : stage >= 3 ? 3 : 2;
      const offset = stage >= 5 ? 4 : stage >= 4 ? 2 : Game.player.stats.generatorsBought.gte(1) ? 1 : 0;
      const semitone = scale[(step * movement + offset + (kind === 'fluctuation' ? 2 : kind === 'quantumResonance' ? 1 : kind === 'energyResonance' ? 3 : 0)) % scale.length];
      const register = kind === 'fieldOscillation' ? .625 : kind === 'fieldResonance' ? .9375 : kind === 'fieldCoupling' ? .75 : kind === 'fieldExcitation' ? .5 : kind === 'generator' ? .5 : kind === 'fluctuation' ? 2 : kind === 'quantumResonance' ? 1.5 : kind === 'energyResonance' ? .75 : 1;
      const base = Game.CONFIG.MUSIC.rootHz * register * (stage >= 5 && kind !== "fieldExcitation" ? .75 : 1) * (stage ? Math.pow(2, semitone / 12) : 1 + (step % 3) * .023);
      const symmetry=Game.Symmetry.intensity(),phrase=[0,4,7,12,12,7,4,0],aligned=Game.CONFIG.MUSIC.rootHz*register*Math.pow(2,phrase[step%phrase.length]/12);
      return { base:Math.exp(Math.log(base)*(1-symmetry)+Math.log(aligned)*symmetry),ratio:(stage>=2?1.5:stage?2:1.503)*(1-symmetry)+2*symmetry,end:(stage?1:.78)*(1-symmetry)+symmetry,stage:stage,symmetry:symmetry };
    },
    play: function (kind) {
      const settings = Game.player.settings;
      const dynamics = ["fieldOscillation", "fieldResonance", "fieldCoupling", "alignment"].includes(kind);
      if (dynamics && !settings.fieldSound) return;
      const enabled = kind === 'bubbleCollect' || kind === 'bubbleForm' ? settings.bubbleSound : (kind === 'perk' || kind === 'stabilize') ? settings.perkSound : kind === 'autoClick' ? settings.autoClickSound : kind === 'click' ? settings.clickSound : kind === 'fluctuation' ? settings.fluctuationSound : (kind === 'quantumResonance' || kind === 'energyResonance') ? settings.coherentSound : (kind === 'fieldExcitation' || dynamics) ? settings.fieldSound : settings.generatorSound;
      if (!settings.sound || !settings.volume || !enabled || this.shouldMute() || (Game.Loop && Game.Loop.catchingUp)) return;
      if(settings.audioTheme>0 && Game.Presentation) { Game.Presentation.playTone(kind);return; }
      this.start();
      if (!this.context || this.context.state !== 'running' || this.voices >= Game.CONFIG.AUDIO.maxVoices) return;
      const now = this.context.currentTime;
      if (now - (this.last[kind] === undefined ? -10 : this.last[kind]) < (dynamics ? 2 : kind === 'click' ? .06 : .24)) return;
      this.last[kind] = now;
      const config = Game.CONFIG.AUDIO;
      // Stretch synthesized notes like slowed playback, preserving their harmony.
      const rate = this.fluctRate();
      const tone = this.tone(kind);
      const coherent = kind === "quantumResonance" || kind === "energyResonance";
      const field = kind === "fieldExcitation" || dynamics;
      const bubble = kind === "bubbleCollect", forming = kind === "bubbleForm";
      const impulse = kind === "autoClick", perk = kind === "perk" || kind === "stabilize", stabilization = kind === "stabilize";
      const strongClick = kind === "click" && Game.Progression.hasSkill("1-2-1");
      const evolved = tone.stage >= 5;
      const attack = (bubble ? .025 : forming ? .2 : impulse ? .018 : perk ? .035 : strongClick ? .009 : field ? .22 : coherent ? .12 : config.attack * (evolved ? 1.25 : 1)) / rate;
      const release = (bubble ? 1.8 : forming ? .8 : impulse ? 2.2 : perk ? (stabilization ? 3.4 : 1.6) : strongClick ? .9 : field ? 2.8 : coherent ? 1.9 : config.release * (evolved ? 1.2 : 1)) / rate;
      this.delay.delayTime.setTargetAtTime(config.echoSeconds / rate, now, .04);
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = (bubble ? 2200 : forming ? 950 : impulse ? 2400 : perk ? 2800 : strongClick ? 1900 : field ? 720 : coherent ? (kind === 'quantumResonance' ? 1300 : 650) : config.filterHz * (evolved ? .9 : 1)) * rate;
      const envelope = this.context.createGain();
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(bubble ? .18 : forming ? .025 : impulse ? .26 : perk ? .14 : strongClick ? .24 : dynamics ? .045 : field ? .075 : coherent ? .09 : config.peakGain, now + attack);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + release);
      const pan = this.context.createStereoPanner();
      pan.pan.value = (kind === 'generator' ? -.18 : kind === 'fluctuation' ? .22 : 0)*(1-tone.symmetry);
      filter.connect(envelope); envelope.connect(pan); pan.connect(this.master);
      envelope.connect(this.delay);
      this.voices++;
      const audio = this;
      const ratios = stabilization ? [.5,1,1.25,1.5,2] : bubble ? [1,1.25,1.5,2] : forming ? [1,2] : impulse ? [.5, 1, 1.5, 2, 3] : perk ? [1, 1.25, 1.5, 2] : strongClick ? [.5, 1, 2, 3] : kind === "alignment" ? [1,1.5,2,3] : kind === "fieldOscillation" ? [.5, 1, 1.5] : kind === "fieldResonance" ? [1, 1.25, 1.5] : kind === "fieldCoupling" ? [.5, 1.5, 2] : field ? [.5, 1, 1.5, 2] : coherent ? (kind === "quantumResonance" ? [1, 1.25, 1.5] : [1, 1.5, 2]) : tone.stage >= 2 ? [1, 1.5, 2] : [1, tone.ratio];
      let ended = 0;
      ratios.forEach(function (ratio, index) {
        const osc = audio.context.createOscillator();
        const partial = audio.context.createGain();
        const amplitude = bubble || forming || impulse || perk || strongClick ? [ .44, .3, .13, .08, .035 ][index] : index === 0 ? .7 : index === 1 ? .16 : index === 2 ? .07 : .035;
        const start = now + (bubble ? index * .035 : perk ? index * (stabilization ? .11 : .045) : 0), frequency = tone.base * ratio * rate * (bubble ? 2 : forming ? 1.5 : perk ? (stabilization ? .75 : 2) : impulse ? 1.5 : 1);
        partial.gain.setValueAtTime(amplitude, start);
        if ((impulse || strongClick) && index >= 2) partial.gain.exponentialRampToValueAtTime(.0001, start + .16 / rate);
        osc.type = (bubble || forming || impulse || perk) && index > 0 ? 'sine' : config.waveform;
        osc.frequency.setValueAtTime(frequency * (impulse ? 1.35 : strongClick ? 1.06 : 1), start);
        if (impulse || strongClick) osc.frequency.exponentialRampToValueAtTime(frequency, start + .085 / rate);
        osc.frequency.exponentialRampToValueAtTime(frequency * tone.end, now + release);
        osc.connect(partial); partial.connect(filter);
        osc.start(start); osc.stop(now + release + .02);
        osc.onended = function () {
          osc.disconnect(); partial.disconnect(); ended++;
          if (ended === ratios.length) {
            filter.disconnect(); envelope.disconnect(); pan.disconnect(); audio.voices--;
          }
        };
      });
    }
  };

  // Achievements, lore and milestones share one nonblocking queue.
  // Run resets keep pending notices; automatic lore is deduplicated by its saved flag.
  Game.AchievementNotices = {
    queue: [], timer: null, dismissTimer: null, dismissing: false,
    place: function () {
      const card=byId('achievement-notice');
      if(card.hidden) return;
      const header=document.querySelector('.topbar').getBoundingClientRect(),tabs=document.querySelector('.view-tabs').getBoundingClientRect();
      // Short headers leave no room for a toast. Keep the tab row clear.
      card.style.top=(header.bottom>=card.offsetHeight+22?14:Math.max(14,tabs.bottom+10))+'px';
    },
    enqueue: function (message) {
      const flag=Game.Experience.loreFlag(message);
      if(flag && (Game.player.lore[flag] || this.queue.some(function (pending) { return Game.Experience.loreFlag(pending)===flag; }))) return;
      this.queue.push(Object.assign({kind:'Achievement unlocked'},message));
      this.render();
      if(this.queue.length===1) this.schedule();
    },
    render: function () {
      const card=byId('achievement-notice'),message=this.queue[0];
      card.hidden=!message || !!(Game.Offline && Game.Offline.busy);
      if(!message) return;
      const lore=/^Lore/.test(message.kind);
      card.classList.toggle('is-lore',lore);
      card.setAttribute('aria-label','Dismiss '+message.kind+': '+message.title);
      card.setAttribute('aria-disabled',String(this.dismissing));
      const values={'achievement-notice-kind':message.kind,'achievement-notice-title':message.title,'achievement-notice-reward':message.text,'achievement-notice-count':this.queue.length>1?(this.queue.length-1)+' waiting':'1 notification'};
      Object.keys(values).forEach(function (id) { if(byId(id).textContent!==values[id]) byId(id).textContent=values[id]; });
      this.place();
    },
    schedule: function () {
      clearTimeout(this.timer);
      if(Game.Offline && Game.Offline.busy) return;
      if(this.queue.length && !this.dismissing && Game.player.settings.autoDismiss)
        this.timer=setTimeout(function () { Game.AchievementNotices.dismiss(); },6000);
    },
    dismiss: function () {
      if(!this.queue.length || this.dismissing) return;
      this.dismissing=true;clearTimeout(this.timer);
      // Save acknowledgement immediately, so a reset or refresh during the fade
      // cannot present the same lore again.
      Game.Experience.acknowledge(this.queue[0]);
      byId('achievement-notice').classList.add('is-dismissing');this.render();
      this.dismissTimer=setTimeout(function () {
        const notices=Game.AchievementNotices;
        notices.queue.shift();notices.dismissing=false;
        byId('achievement-notice').classList.remove('is-dismissing');
        notices.render();notices.schedule();
      },2000);
    },
    clear: function () {
      clearTimeout(this.timer);clearTimeout(this.dismissTimer);
      this.queue=[];this.dismissing=false;
      byId('achievement-notice').classList.remove('is-dismissing');this.render();
    }
  };

  Game.Experience = {
    loreKey: '',
    introduction: 'Existence contains potential, but no meaningful structure has formed.',
    loreFlag: function (message) {
      if(message.milestoneLore)return message.milestoneLore+'Read';
      if(message.introduction) return 'introductionSeen';
      if(message.coherence) return 'coherenceSeen';
      if(message.fieldLesson) return message.fieldLesson===1?'fieldFirstSeen':'fieldSecondSeen';
      if(message.condense) return 'condenseSeen';
      if(message.symmetry) return 'symmetrySeen';
      return null;
    },
    acknowledge: function (message) {
      const flag=this.loreFlag(message);
      if(flag && !Game.player.lore[flag]) { Game.player.lore[flag]=1;Game.Save.save(); }
    },
    enqueue: function (message) {
      Game.AchievementNotices.enqueue(message);
    },
    queueStory:function () {
      const p=Game.player,key=Game.CONFIG.STORY.map(function (entry) {return p.lore[entry.id]+':'+p.lore[entry.id+'Read'];}).join('|');
      if(this.storyOwner===p && this.storyQueueKey===key)return;
      this.storyOwner=p;this.storyQueueKey=key;
      Game.CONFIG.STORY.forEach(function (entry) {
        if(!p.lore[entry.id] || p.lore[entry.id+'Read'])return;
        const milestone=entry.kind==='symmetry' && Game.CONFIG.SYMMETRY.milestones.find(function (m) {return Game.D(entry.amount).eq(m.at);});
        Game.Experience.enqueue({kind:'Lore',title:entry.title,text:entry.text+(milestone?'\n\n'+milestone.reward:''),milestoneLore:entry.id});
      });
    },
    next: function () {
      // The loop calls this every tick. Only touch layout when visibility changes.
      const hidden=!Game.AchievementNotices.queue.length || !!(Game.Offline && Game.Offline.busy);
      if(byId('achievement-notice').hidden!==hidden) Game.AchievementNotices.render();
    },
    schedule: function () {
      Game.AchievementNotices.schedule();
    },
    dismiss: function () {
      Game.AchievementNotices.dismiss();
    },
    syncPlayer: function (deferMessages) {
      this.storyQueueKey='';
      Game.PrestigeUI.hideDetails();
      if (Game.CondenseFX && Game.CondenseFX.active) Game.CondenseFX.cancel();
      Game.FieldWaves.clear();
      if (Game.PotentialBubble) Game.PotentialBubble.clear();
      if (Game.PerkFX) Game.PerkFX.clear();
      byId('energy-effects').replaceChildren();
      this.coherenceQueued = false; this.fieldQueued = false;this.symmetryQueued=false;
      if (Game.UI.syncCollapseState) Game.UI.syncCollapseState();
      const settings = Game.player.settings;
      ['sound', 'muteUnfocused', 'perkSound', 'perkVisuals', 'generatorSound', 'fluctuationSound', 'coherentSound', 'fieldSound', 'condenseSound', 'condenseVisuals', 'autoDismiss', 'confirmBreak', 'confirmCondense', 'confirmStabilize'].forEach(function (key) { byId('setting-' + key).checked = !!settings[key]; });
      ['audioTheme','visualTheme'].forEach(function (key) { byId('setting-'+key).value=settings[key]; });
      byId('setting-resetVisuals').checked=!!settings.resetVisuals;
      if(Game.Presentation)Game.Presentation.apply();
      byId('setting-volume').value = settings.volume;
      byId('setting-visuals').value = settings.visuals;
      Game.Audio.updateVolume(); this.loreKey = ''; this.updateLore();
      Game.AchievementNotices.render();Game.AchievementNotices.schedule();
      if (deferMessages) return;
      this.resumeMessages();
    },
    resumeMessages: function () {
      if (!Game.player.lore.introductionSeen) this.enqueue({kind:'Lore · 01', title:'Before structure', text:this.introduction, introduction:true});
      if (Game.Coherence.discovered() && !Game.player.lore.coherenceSeen) Game.Coherence.showLore();
      Game.FieldExcitation.checkUnlock();
      if (Game.player.prestige.times.gt(0) && !Game.player.lore.condenseSeen) this.enqueue({kind:'Lore · 07', title:'Discrete states', text:Game.CONFIG.PRESTIGE.lore, condense:true});
      Game.Symmetry.showLore();Game.Story.capture();this.queueStory();this.next();
    },
    init: function () {
      ["focus", "blur"].forEach(function (event) { window.addEventListener(event, function () { Game.Audio.updateVolume(); }); });
      document.addEventListener("visibilitychange", function () { Game.Audio.updateVolume(); });
      document.addEventListener('pointerdown', function () { Game.Audio.start(true); }, {capture:true});
      document.addEventListener('keydown', function () { Game.Audio.start(true); }, {capture:true});
      const notice=byId('achievement-notice');
      notice.addEventListener('click', function () { Game.AchievementNotices.dismiss(); });
      notice.addEventListener('keydown', function (event) {
        if(event.key==='Enter' || event.key===' ') { event.preventDefault();Game.AchievementNotices.dismiss(); }
      });
      if(window.ResizeObserver) {
        const observer=new ResizeObserver(function () { Game.AchievementNotices.place(); });
        [byId('achievement-notice'),document.querySelector('.topbar'),document.querySelector('.view-tabs')].forEach(function (node) { observer.observe(node); });
        Game.AchievementNotices.observer=observer;
      }
      ['sound','muteUnfocused','perkSound','perkVisuals','generatorSound','fluctuationSound','coherentSound','fieldSound','condenseSound','condenseVisuals','autoDismiss','volume','visuals','confirmBreak','confirmCondense','confirmStabilize'].forEach(function (key) {
        const input = byId('setting-' + key);
        input.addEventListener(key === 'volume' ? 'input' : 'change', function () {
          Game.player.settings[key] = this.type === 'checkbox' ? Number(this.checked) : Number(this.value);
          if (key === 'sound' && this.checked) Game.Audio.start();
          Game.Audio.updateVolume(); Game.Experience.schedule(); Game.AchievementNotices.schedule(); Game.Save.save();
          if (key === 'perkVisuals' && !this.checked) Game.PerkFX.clear();
            if (key === 'visuals') { byId('energy-effects').innerHTML = ''; Game.FieldWaves.clear();
      if (Game.PotentialBubble) Game.PotentialBubble.clear(); }
        });
      });
      byId('preview-perk-sound').addEventListener('click', function () { Game.Audio.play('perk'); });
      this.syncPlayer();
    },
    updateLore: function () {
      Game.Story.capture();this.queueStory();
      const clicked = Game.player.stats.generatorsBought.gte(1), generated = Game.player.lore.generatorSeen || Game.player.stats.generatorsBought.gte(1);
      const coherent = Game.Coherence.discovered();
      const field = Game.FieldExcitation.discovered() || Game.player.lore.fieldFirstSeen || Game.player.lore.fieldSecondSeen;
      const condensed = Game.player.prestige.times.gt(0);
      const key = String(clicked) + String(generated) + String(coherent) + String(field) + String(condensed)+String(Game.Symmetry.unlocked())+String(Game.player.lore.stabilizationSeen)+Game.CONFIG.STORY.map(function (entry) {return Game.player.lore[entry.id];}).join('');
      if (this.loreKey === key) return;
      this.loreKey = key;
      const entries = [{title:'01 · Before structure',text:this.introduction,order:1}];
      if (clicked) entries.push({title:'02 · A disturbance',text:'A faint difference interrupts the stillness. It has no shape, no boundary—only the possibility of becoming something.',order:2});
      if (generated) entries.push({title:'03 · Returning potential',text:'The disturbance returns without your touch. A rhythm emerges, but rhythm is not yet structure. Nothing has learned to hold its form.',order:3});
      if (coherent) entries.push({title:'04 · Coherent Energy',text:Game.CONFIG.COHERENCE.lore,order:4});
      if (Game.player.lore.stabilizationSeen) entries.push({title:'A pattern remembered',text:Game.CONFIG.STRUCTURE.lore,order:4.5});
      if (field) {
        entries.push({title:'05 · Beyond Energy',text:Game.CONFIG.FIELD_EXCITATION.lore[0],order:5});
        entries.push({title:'06 · Fields',text:Game.CONFIG.FIELD_EXCITATION.lore[1],order:6});
      }
      if (condensed) entries.push({title:'07 · Discrete states',text:Game.CONFIG.PRESTIGE.lore,order:7});
      if(Game.Symmetry.unlocked()) entries.push({title:'08 · Indistinguishable laws',text:Game.CONFIG.SYMMETRY.lore,order:8});
      Game.CONFIG.STORY.forEach(function (entry) {if(Game.player.lore[entry.id])entries.push(entry);});entries.sort(function (a,b) {return a.order-b.order;});
      const container = byId('lore-entries'); container.innerHTML = '';
      entries.forEach(function (entry) {
        const card = document.createElement('article'); card.className = 'lore-entry';
        const heading = document.createElement('h3'); heading.textContent = entry.title;
        const paragraph = document.createElement('p'); paragraph.textContent = entry.text;
        const replay = document.createElement('button'); replay.textContent = 'Read';
        replay.addEventListener('click', function () { const message={kind:'Lore',title:entry.title,text:entry.text};if(entry.id && !Game.player.lore[entry.id+'Read'])message.milestoneLore=entry.id;Game.Experience.enqueue(message); });
        card.append(heading,paragraph,replay); container.appendChild(card);
      });
    }
  };
})(window.CosmicIdle);
