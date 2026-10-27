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
      return !!Game.player.settings.muteUnfocused && (document.hidden || !document.hasFocus());
    },
    updateVolume: function () {
      if (this.context) this.master.gain.setTargetAtTime(Game.player.settings.sound && !this.shouldMute() ? Game.player.settings.volume : 0, this.context.currentTime, .03);
    },
    musicStage: function () {
      if (Game.FieldExcitation.discovered()) return 5;
      if (Game.Coherence.discovered()) return 4;
      if (Game.Energy.getOwned("quantumFluctuation").gt(0)) return 3;
      if (Game.player.stats.generatorsBought.gte(Game.CONFIG.MUSIC.secondMilestone)) return 2;
      if (Game.player.stats.manualClicks.gte(Game.CONFIG.MUSIC.firstMilestone) || Game.player.stats.generatorsBought.gte(1)) return 1;
      return 0;
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
      return { base: base, ratio: stage >= 2 ? 1.5 : stage ? 2 : 1.503, end: stage ? 1 : .78, stage: stage };
    },
    play: function (kind) {
      const settings = Game.player.settings;
      const dynamics = ["fieldOscillation", "fieldResonance", "fieldCoupling"].includes(kind);
      if (dynamics && !settings.fieldSound) return;
      const enabled = kind === 'bubbleCollect' || kind === 'bubbleForm' ? settings.bubbleSound : kind === 'perk' ? settings.perkSound : kind === 'autoClick' ? settings.autoClickSound : kind === 'click' ? settings.clickSound : kind === 'fluctuation' ? settings.fluctuationSound : (kind === 'quantumResonance' || kind === 'energyResonance') ? settings.coherentSound : (kind === 'fieldExcitation' || dynamics) ? settings.fieldSound : settings.generatorSound;
      if (!settings.sound || !settings.volume || !enabled || this.shouldMute() || (Game.Loop && Game.Loop.catchingUp)) return;
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
      const impulse = kind === "autoClick", perk = kind === "perk";
      const strongClick = kind === "click" && Game.Progression.hasSkill("1-2-1");
      const evolved = tone.stage >= 5;
      const attack = (bubble ? .025 : forming ? .2 : impulse ? .018 : perk ? .035 : strongClick ? .009 : field ? .22 : coherent ? .12 : config.attack * (evolved ? 1.25 : 1)) / rate;
      const release = (bubble ? 1.8 : forming ? .8 : impulse ? 2.2 : perk ? 1.6 : strongClick ? .9 : field ? 2.8 : coherent ? 1.9 : config.release * (evolved ? 1.2 : 1)) / rate;
      this.delay.delayTime.setTargetAtTime(config.echoSeconds / rate, now, .04);
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = (bubble ? 2200 : forming ? 950 : impulse ? 2400 : perk ? 2800 : strongClick ? 1900 : field ? 720 : coherent ? (kind === 'quantumResonance' ? 1300 : 650) : config.filterHz * (evolved ? .9 : 1)) * rate;
      const envelope = this.context.createGain();
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(bubble ? .18 : forming ? .025 : impulse ? .26 : perk ? .14 : strongClick ? .24 : dynamics ? .045 : field ? .075 : coherent ? .09 : config.peakGain, now + attack);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + release);
      const pan = this.context.createStereoPanner();
      pan.pan.value = kind === 'generator' ? -.18 : kind === 'fluctuation' ? .22 : 0;
      filter.connect(envelope); envelope.connect(pan); pan.connect(this.master);
      envelope.connect(this.delay);
      this.voices++;
      const audio = this;
      const ratios = bubble ? [1,1.25,1.5,2] : forming ? [1,2] : impulse ? [.5, 1, 1.5, 2, 3] : perk ? [1, 1.25, 1.5, 2] : strongClick ? [.5, 1, 2, 3] : kind === "fieldOscillation" ? [.5, 1, 1.5] : kind === "fieldResonance" ? [1, 1.25, 1.5] : kind === "fieldCoupling" ? [.5, 1.5, 2] : field ? [.5, 1, 1.5, 2] : coherent ? (kind === "quantumResonance" ? [1, 1.25, 1.5] : [1, 1.5, 2]) : tone.stage >= 2 ? [1, 1.5, 2] : [1, tone.ratio];
      let ended = 0;
      ratios.forEach(function (ratio, index) {
        const osc = audio.context.createOscillator();
        const partial = audio.context.createGain();
        const amplitude = bubble || forming || impulse || perk || strongClick ? [ .44, .3, .13, .08, .035 ][index] : index === 0 ? .7 : index === 1 ? .16 : index === 2 ? .07 : .035;
        const start = now + (bubble ? index * .035 : perk ? index * .045 : 0), frequency = tone.base * ratio * rate * (bubble ? 2 : forming ? 1.5 : perk ? 2 : impulse ? 1.5 : 1);
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

  Game.Experience = {
    queue: [], active: null, timer: null, dismissTimer: null, dismissing: false, loreKey: '',
    introduction: 'Existence contains potential, but no meaningful structure has formed.',
    enqueue: function (message) { this.queue.push(message); this.next(); },
    next: function () {
      if (this.active || !this.queue.length || byId('respec-dialog').open || Game.CondenseFX && Game.CondenseFX.active) return;
      this.active = this.queue.shift();
      const dialog = byId('story-dialog');
      dialog.classList.remove('is-dismissing');
      byId('story-dismiss').removeAttribute('aria-disabled');
      this.previousFocus = document.activeElement;
      byId('story-kind').textContent = this.active.kind;
      byId('story-icon').innerHTML = Game.Icons.svg(this.active.kind === "Achievement unlocked" ? Game.Icons.achievement(this.active.title) : "lore");
      byId('story-title').textContent = this.active.title;
      byId('story-text').textContent = this.active.text;
      byId('story-hint').textContent = Game.player.settings.autoDismiss ? 'Click to continue · closes after 6 seconds' : 'Click to continue';
      dialog.showModal();
      byId('story-dismiss').focus();
      this.schedule();
    },
    schedule: function () {
      clearTimeout(this.timer);
      if (this.active && !this.dismissing && Game.player.settings.autoDismiss) this.timer = setTimeout(function () { Game.Experience.dismiss(); }, 6000);
    },
    dismiss: function () {
      if (!this.active || this.dismissing) return;
      this.dismissing = true;
      clearTimeout(this.timer);
      byId('story-dialog').classList.add('is-dismissing');
      byId('story-dismiss').setAttribute('aria-disabled', 'true');
      const experience = this;
      this.dismissTimer = setTimeout(function () { experience.finishDismiss(); }, 2000);
    },
    finishDismiss: function () {
      if (!this.dismissing || !this.active) return;
      const message = this.active;
      clearTimeout(this.dismissTimer);
      this.active = null; this.dismissing = false;
      byId('story-dialog').close();
      byId('story-dialog').classList.remove('is-dismissing');
      byId('story-dismiss').removeAttribute('aria-disabled');
      if (message.introduction) Game.player.lore.introductionSeen = 1;
      if (message.coherence) Game.player.lore.coherenceSeen = 1;
      if (message.fieldLesson) Game.player.lore[message.fieldLesson === 1 ? 'fieldFirstSeen' : 'fieldSecondSeen'] = 1;
      if (message.condense) Game.player.lore.condenseSeen = 1;
      if (message.introduction || message.coherence || message.fieldLesson || message.condense) Game.Save.save();
      if (this.previousFocus && this.previousFocus.isConnected) this.previousFocus.focus();
      this.next();
    },
    syncPlayer: function (deferMessages) {
      Game.PrestigeUI.hideDetails();
      if (Game.CondenseFX && Game.CondenseFX.active) Game.CondenseFX.cancel();
      Game.FieldWaves.clear();
      if (Game.PotentialBubble) Game.PotentialBubble.clear();
      if (Game.PerkFX) Game.PerkFX.clear();
      byId('energy-effects').replaceChildren();
      this.queue = []; this.active = null; this.coherenceQueued = false; this.fieldQueued = false; this.dismissing = false; clearTimeout(this.timer); clearTimeout(this.dismissTimer); byId('story-dialog').close(); byId('story-dialog').classList.remove('is-dismissing'); byId('story-dismiss').removeAttribute('aria-disabled');
      if (Game.UI.syncCollapseState) Game.UI.syncCollapseState();
      const settings = Game.player.settings;
      ['sound', 'muteUnfocused', 'clickSound', 'autoClickSound', 'bubbleSound', 'perkSound', 'perkVisuals', 'generatorSound', 'fluctuationSound', 'coherentSound', 'fieldSound', 'condenseSound', 'condenseVisuals', 'autoDismiss'].forEach(function (key) { byId('setting-' + key).checked = !!settings[key]; });
      byId('setting-volume').value = settings.volume;
      byId('setting-visuals').value = settings.visuals;
      Game.Audio.updateVolume(); this.loreKey = ''; this.updateLore();
      if (deferMessages) return;
      this.resumeMessages();
    },
    resumeMessages: function () {
      if (!Game.player.lore.introductionSeen) this.enqueue({kind:'Lore · 01', title:'Before structure', text:this.introduction, introduction:true});
      if (Game.Coherence.discovered() && !Game.player.lore.coherenceSeen) Game.Coherence.showLore();
      Game.FieldExcitation.checkUnlock();
      if (Game.player.prestige.times.gt(0) && !Game.player.lore.condenseSeen) this.enqueue({kind:'Lore · 07', title:'Discrete states', text:Game.CONFIG.PRESTIGE.lore, condense:true});
      this.next();
    },
    init: function () {
      ["focus", "blur"].forEach(function (event) { window.addEventListener(event, function () { Game.Audio.updateVolume(); }); });
      document.addEventListener("visibilitychange", function () { Game.Audio.updateVolume(); });
      document.addEventListener('pointerdown', function () { Game.Audio.start(true); }, {capture:true});
      document.addEventListener('keydown', function () { Game.Audio.start(true); }, {capture:true});
      byId('story-dismiss').addEventListener('click', function () { Game.Experience.dismiss(); });
      byId('story-dialog').addEventListener('click', function (event) { if (event.target === this) Game.Experience.dismiss(); });
      byId('story-dialog').addEventListener('cancel', function (event) { event.preventDefault(); });
      ['sound','muteUnfocused','clickSound','autoClickSound','bubbleSound','perkSound','perkVisuals','generatorSound','fluctuationSound','coherentSound','fieldSound','condenseSound','condenseVisuals','autoDismiss','volume','visuals'].forEach(function (key) {
        const input = byId('setting-' + key);
        input.addEventListener(key === 'volume' ? 'input' : 'change', function () {
          Game.player.settings[key] = this.type === 'checkbox' ? Number(this.checked) : Number(this.value);
          if (key === 'sound' && this.checked) Game.Audio.start();
          Game.Audio.updateVolume(); Game.Experience.schedule(); Game.Save.save();
          if (key === 'perkVisuals' && !this.checked) Game.PerkFX.clear();
            if (key === 'visuals') { byId('energy-effects').innerHTML = ''; Game.FieldWaves.clear();
      if (Game.PotentialBubble) Game.PotentialBubble.clear(); }
        });
      });
      byId('preview-sound').addEventListener('click', function () { Game.Audio.play('click'); });
      byId('preview-auto-sound').addEventListener('click', function () { Game.Audio.play('autoClick'); });
      byId('preview-perk-sound').addEventListener('click', function () { Game.Audio.play('perk'); });
      this.syncPlayer();
    },
    updateLore: function () {
      const clicked = Game.player.lore.clickSeen || Game.player.stats.manualClicks.gte(1), generated = Game.player.lore.generatorSeen || Game.player.stats.generatorsBought.gte(1);
      const coherent = Game.Coherence.discovered();
      const field = Game.FieldExcitation.discovered() || Game.player.lore.fieldFirstSeen || Game.player.lore.fieldSecondSeen;
      const condensed = Game.player.prestige.times.gt(0);
      const key = String(clicked) + String(generated) + String(coherent) + String(field) + String(condensed);
      if (this.loreKey === key) return;
      this.loreKey = key;
      const entries = [{title:'01 · Before structure',text:this.introduction}];
      if (clicked) entries.push({title:'02 · A disturbance',text:'A faint difference interrupts the stillness. It has no shape, no boundary—only the possibility of becoming something.'});
      if (generated) entries.push({title:'03 · Returning potential',text:'The disturbance returns without your touch. A rhythm emerges, but rhythm is not yet structure. Nothing has learned to hold its form.'});
      if (coherent) entries.push({title:'04 · Coherent Energy',text:Game.CONFIG.COHERENCE.lore});
      if (field) {
        entries.push({title:'05 · Beyond Energy',text:Game.CONFIG.FIELD_EXCITATION.lore[0]});
        entries.push({title:'06 · Fields',text:Game.CONFIG.FIELD_EXCITATION.lore[1]});
      }
      if (condensed) entries.push({title:'07 · Discrete states',text:Game.CONFIG.PRESTIGE.lore});
      const container = byId('lore-entries'); container.innerHTML = '';
      entries.forEach(function (entry) {
        const card = document.createElement('article'); card.className = 'lore-entry';
        const heading = document.createElement('h3'); heading.textContent = entry.title;
        const paragraph = document.createElement('p'); paragraph.textContent = entry.text;
        const replay = document.createElement('button'); replay.textContent = 'Read';
        replay.addEventListener('click', function () { Game.Experience.enqueue({kind:'Lore',title:entry.title,text:entry.text}); });
        card.append(heading,paragraph,replay); container.appendChild(card);
      });
    }
  };
})(window.CosmicIdle);
