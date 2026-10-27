(function (Game) {
  const byId = function (id) { return document.getElementById(id); };

  // A short, composed A-minor/add9 phrase. All synthesis routes through the
  // existing master volume, focus mute and compressor; it never touches game RNG.
  Game.Audio.playCondenseMusic = function () {
    const audio = this, settings = Game.player.settings;
    if (!settings.condenseSound || !settings.sound || !settings.volume || this.shouldMute() || Game.Loop.catchingUp) return;
    this.start();
    if (!this.context || this.context.state !== "running" || this.voices >= Game.CONFIG.AUDIO.maxVoices) return;
    if (this.condenseScore) this.condenseScore.stop();
    const context = this.context, now = context.currentTime, bus = context.createGain(), filter = context.createBiquadFilter();
    bus.gain.value = .8;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 4.7);
    filter.frequency.exponentialRampToValueAtTime(750, now + 8.0);
    filter.connect(bus);bus.connect(this.master);bus.connect(this.delay);
    this.delay.delayTime.setTargetAtTime(.38, now, .04);
    const voices = [];let remaining = 0, cleaned = false;
    const cleanup = function () {
      if (cleaned) return;cleaned = true;
      filter.disconnect();bus.disconnect();audio.voices--;
      if (audio.condenseScore === score) audio.condenseScore = null;
    };
    const note = function (frequency, start, duration, gain, endFrequency) {
      const oscillator = context.createOscillator(), envelope = context.createGain();
      oscillator.type = frequency < 100 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + start + duration);
      envelope.gain.setValueAtTime(.0001, now + start);
      envelope.gain.exponentialRampToValueAtTime(gain, now + start + Math.min(.22, duration * .2));
      envelope.gain.exponentialRampToValueAtTime(.0001, now + start + duration);
      oscillator.connect(envelope);envelope.connect(filter);
      oscillator.onended = function () { oscillator.disconnect();envelope.disconnect();if (--remaining === 0) cleanup(); };
      remaining++;voices.push(oscillator);oscillator.start(now + start);oscillator.stop(now + start + duration + .03);
    };
    const score = { stop: function () {
      if (cleaned) return;
      const at = context.currentTime;
      bus.gain.cancelScheduledValues(at);bus.gain.setTargetAtTime(0, at, .04);
      voices.forEach(function (voice) { try { voice.stop(at + .2); } catch (error) { /* Already ended. */ } });
    } };
    this.condenseScore = score;this.voices++;
    note(55, 0, 4.8, .1, 82.4069);
    [110, 164.8138, 220, 246.9417, 261.6256, 329.6276, 440, 493.8833].forEach(function (frequency, i) { note(frequency, .25 + i * .48, 1.4, .045); });
    [110, 164.8138, 246.9417, 261.6256, 329.6276].forEach(function (frequency, i) { note(frequency, 4.7 + i * .035, 3.6, i === 0 ? .08 : .035); });
    note(659.2551, 5.0, 2.8, .024);note(880, 5.4, 2.7, .012);
  };

  Game.CondenseFX = {
    active: false, frame: null, timer: null, callback: null,
    init: function () {
      if (this.initialized) return;this.initialized = true;
      this.dialog = byId("condense-dialog");this.canvas = byId("condense-canvas");this.context = this.canvas.getContext("2d");
      byId("skip-condense").addEventListener("click", function () { Game.CondenseFX.finish(true); });
      this.dialog.addEventListener("cancel", function (event) { event.preventDefault();Game.CondenseFX.finish(true); });
      window.addEventListener("resize", function () { if (Game.CondenseFX.active) Game.CondenseFX.resize(); });
    },
    resize: function () {
      this.width = innerWidth;this.height = innerHeight;
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      this.canvas.width = Math.floor(this.width * ratio);this.canvas.height = Math.floor(this.height * ratio);
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (this.completed) this.draw(6.2);
    },
    play: function (reward, callback) {
      this.init();
      Game.Audio.playCondenseMusic();
      if (!Game.player.settings.condenseVisuals || !Game.player.settings.visuals || document.hidden || !this.context) { callback();return; }
      this.callback = callback;this.active = true;
      this.finishing = false;this.dialog.classList.remove("is-dismissing");
      this.completed = false;
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.started = performance.now();this.lastDraw = 0;
      byId("condense-cinematic-title").textContent = "Condensing Energy";
      byId("condense-cinematic-reward").textContent = "+" + Game.Format.number(reward, 0) + " Primordial Quanta";
      byId("skip-condense").textContent = "Skip cinematic";
      this.dialog.showModal();this.resize();byId("skip-condense").focus();
      this.timer = setTimeout(function () {
        const effect = Game.CondenseFX;
        if (Game.player.settings.autoDismiss) effect.finish(false);
        else {
          effect.completed = true;cancelAnimationFrame(effect.frame);effect.draw(6.2);
          byId("skip-condense").textContent = "Continue";
        }
      }, this.reduced ? 2200 : 6800);
      const frame = function (now) {
        if (!Game.CondenseFX.active || Game.CondenseFX.completed) return;
        const effect = Game.CondenseFX;
        if (!document.hidden && now - effect.lastDraw >= 1000 / 40) {
          effect.lastDraw = now;effect.draw(effect.reduced ? 6.2 : (now - effect.started) / 1000);
        }
        effect.frame = requestAnimationFrame(frame);
      };
      this.frame = requestAnimationFrame(frame);
    },
    draw: function (seconds) {
      const c=this.context,w=this.width,h=this.height,x=w*.5,y=h*.43,radius=Math.min(w,h)*.43;
      const hash=function(i){const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
      const progress=Math.min(1,Math.max(0,seconds/5.3)),compression=Math.pow(1-progress,1.8);
      c.clearRect(0,0,w,h);c.fillStyle="#040810";c.fillRect(0,0,w,h);
      for(let i=0;i<130;i++){c.fillStyle="rgba(173,186,213,"+(.04+hash(i+70)*.18)+")";c.fillRect(hash(i+30)*w,hash(i+300)*h,1,1);}
      const cloudRadius=22+radius*1.5*Math.pow(1-progress,.8);
      const cloud=c.createRadialGradient(x,y,0,x,y,cloudRadius);
      cloud.addColorStop(0,"rgba(190,158,233,"+(.1+progress*.3)+")");
      cloud.addColorStop(.3,"rgba(107,70,153,"+(.05+progress*.12)+")");cloud.addColorStop(1,"rgba(22,33,60,0)");
      c.fillStyle=cloud;c.fillRect(0,0,w,h);c.save();c.globalCompositeOperation="screen";
      // Every shell and material trace contracts. Nothing expands after arrival.
      for(let i=0;i<7;i++){
        const shell=8+radius*(.45+i*.2)*Math.pow(1-progress,1.25);
        c.strokeStyle="rgba(166,145,208,"+(.13+progress*.15)+")";c.lineWidth=.8;
        c.beginPath();c.ellipse(x,y,shell,shell*(.4+i*.055),-.7+i*.35+progress*.9,0,Math.PI*2);c.stroke();
      }
      for(let i=0;i<360;i++){
        const angle=hash(i+1)*Math.PI*2+progress*progress*4;
        const initial=radius*(.15+Math.sqrt(hash(i+20))*1.5);
        const distance=5+initial*compression;
        const previousProgress=Math.max(0,progress-.008),previousDistance=5+initial*Math.pow(1-previousProgress,1.8);
        const previousAngle=hash(i+1)*Math.PI*2+previousProgress*previousProgress*4;
        const px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance*.7;
        c.strokeStyle=i%4===0?"rgba(231,206,148,"+(.23+progress*.25)+")":"rgba(177,153,224,"+(.2+progress*.25)+")";
        c.lineWidth=.7+hash(i+10)*.8;c.beginPath();c.moveTo(x+Math.cos(previousAngle)*previousDistance,y+Math.sin(previousAngle)*previousDistance*.7);c.lineTo(px,py);c.stroke();
        if(progress<.995){c.fillStyle=i%4===0?"#d6bd80":"#af97d4";c.fillRect(px,py,1.1,1.1);}
      }
      const core=3+progress*10;
      c.shadowColor="#c8a9ef";c.shadowBlur=12+progress*25;c.fillStyle="#e3d2f7";
      c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-core*.5,-core*.5,core,core);
      c.strokeStyle="#d6bd80";c.lineWidth=1;c.strokeRect(-core*.8,-core*.8,core*1.6,core*1.6);c.restore();
      c.restore();
      byId("condense-cinematic-title").textContent=progress>=1?"Primordial Quanta condensed":progress>.6?"Compressing potential":"Drawing the field inward";
    },
    finish: function (skip) {
      if (!this.active || this.finishing) return;
      this.finishing = true;this.completed = true;
      clearTimeout(this.timer);cancelAnimationFrame(this.frame);
      if (skip && Game.Audio.condenseScore) Game.Audio.condenseScore.stop();
      this.dialog.classList.add("is-dismissing");
      byId("skip-condense").setAttribute("aria-disabled", "true");
      this.closeTimer = setTimeout(function () {
        const effect = Game.CondenseFX, callback = effect.callback;
        effect.cancel(false);
        if (callback) callback();
      }, 2000);
    },
    cancel: function (stopMusic) {
      this.active = false;this.callback = null;this.finishing = false;
      clearTimeout(this.timer);clearTimeout(this.closeTimer);cancelAnimationFrame(this.frame);
      if (this.dialog) { if (this.dialog.open) this.dialog.close();this.dialog.classList.remove("is-dismissing");byId("skip-condense").removeAttribute("aria-disabled"); }
      if (this.context) this.context.clearRect(0, 0, this.width, this.height);
      if (stopMusic !== false && Game.Audio.condenseScore) Game.Audio.condenseScore.stop();
    }
  };
})(window.CosmicIdle);
