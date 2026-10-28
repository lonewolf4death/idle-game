(function (Game) {
  Game.FieldWaves = {
    active: false, frame: null, waves: [], streamBudget: 0,
    canShow: function () {
      if(Game.Presentation && !Game.Presentation.animationEnabled('fieldExcitation'))return false;
      return !!Game.player.settings.visuals && !document.hidden && !document.getElementById("energy-view").hidden && !(Game.Loop && Game.Loop.catchingUp);
    },
    init: function () {
      this.canvas = document.getElementById("field-waves");
      this.context = this.canvas.getContext("2d");
      this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
      const waves = this;
      new ResizeObserver(function () { waves.resize(); }).observe(this.canvas);
      window.addEventListener("resize", function () { waves.resize(); });
      document.addEventListener("visibilitychange", function () { if (document.hidden) waves.clear(); });
      this.resize();
    },
    resize: function () {
      const bounds = this.canvas.getBoundingClientRect();
      this.width = bounds.width; this.height = bounds.height;
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      if (!this.width || !this.height) { this.clear(); return; }
      const width = Math.round(this.width * this.dpr), height = Math.round(this.height * this.dpr);
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width; this.canvas.height = height;
        if (this.active) this.draw(performance.now());
      }
    },
    clear: function () {
      cancelAnimationFrame(this.frame);
      this.frame = null; this.active = false; this.waves = []; this.streamBudget = 0;
      if (this.context) {
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },
    stream: function (gameDelta) {
      const owned = Game.Energy.getOwned("fieldExcitation"), config = Game.CONFIG.FIELD_EXCITATION;
      const speed = Game.Time.getGameSpeed();
      if (!this.canShow() || owned.lt(config.waveSmoothAt) || speed.lte(0)) { this.streamBudget = 0; return; }
      const rate = Decimal.min(config.maxWaveRate, owned.mul(config.wavesPerCycle).div(config.interval).mul(speed));
      const realDelta = Game.D(gameDelta).div(speed);
      this.streamBudget = Math.min(config.maxWaveRate, this.streamBudget + rate.mul(realDelta).toNumber());
      const count = Math.floor(this.streamBudget);
      this.streamBudget -= count;
      if (count > 0) this.play(count);
    },
    play: function (count) {
      if (!this.context || !this.canShow()) return;
      if (!this.width || !this.height) this.resize();
      if (!this.width || !this.height) return;
      const now = performance.now(), config = Game.CONFIG.FIELD_EXCITATION;
      const duration = config.waveDuration * 1000;
      this.waves = this.waves.filter(function (wave) { return now - wave.started < duration; });
      const available = Math.min(config.maxWaves - this.waves.length, Math.max(0, Math.floor(count === undefined ? 1 : count)));
      for (let i = 0; i < available; i++) {
        const position = Game.UI.visualPosition(this.width, this.height);
        this.waves.push({ started: now, x: position.x / this.width, y: position.y / this.height, scale: .8 + Math.random() * .4, phase: Math.random() * Math.PI * 2 });
      }
      if (!this.waves.length || this.active) return;
      this.color = getComputedStyle(this.canvas).color;
      this.active = true;
      const waves = this;
      let lastDraw = -Infinity;
      function animate(time) {
        if (!waves.canShow()) { waves.clear(); return; }
        waves.waves = waves.waves.filter(function (wave) { return time - wave.started < duration; });
        if (!waves.waves.length) { waves.clear(); return; }
        // Slow cosmic drift needs only 20 draws/sec; its lifetime stays in real time.
        if (time - lastDraw >= 1000 / 20) { waves.draw(time); lastDraw = time; }
        waves.frame = requestAnimationFrame(animate);
      }
      this.frame = requestAnimationFrame(animate);
    },
    draw: function (now) {
      if(Game.player.settings.visualTheme===1 && Game.Presentation) { Game.Presentation.drawWaves(this,now);return; }
      const ctx = this.context, w = this.width, h = this.height, config = Game.CONFIG.FIELD_EXCITATION;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1; ctx.lineCap = "round"; ctx.shadowBlur = 7; ctx.shadowColor = this.color;
      const density = 1 / Math.sqrt(Math.max(1, this.waves.length / 5));
      const span = Math.min(w * .8, 290);
      const waves = this;
      this.waves.forEach(function (wave) {
        const progress = Math.min(1, Math.max(0, (now - wave.started) / (config.waveDuration * 1000)));
        const t = waves.reducedMotion.matches ? .36 : progress;
        const symmetry=Game.Symmetry.intensity(),phase=(t * Math.PI * 6 + wave.phase)*(1-symmetry);
        const alpha = Math.pow(Math.sin(Math.PI * progress), 1.25) * config.waveIntensity * density;
        const width = span * (wave.scale*(1-symmetry)+symmetry), left = (wave.x*(1-symmetry)+.5*symmetry) * w - width / 2, center = (wave.y*(1-symmetry)+.5*symmetry) * h;
        const gradient = ctx.createLinearGradient(left, 0, left + width, 0);
        gradient.addColorStop(0, "transparent"); gradient.addColorStop(.2, waves.color);
        gradient.addColorStop(.8, waves.color); gradient.addColorStop(1, "transparent");
        ctx.strokeStyle = gradient;
        for (let band = 0; band < 4; band++) {
          ctx.globalAlpha = alpha * (.8 - Math.abs(band - 1.5) * .18);
          ctx.beginPath();
          for (let x = 0; x <= width; x += 4) {
            const u = x / width;
            const asymmetric=Math.sin(u*Math.PI*3+phase*.22+band*.075)*15+Math.sin(u*Math.PI*7-phase*.28)*5*Math.sin(u*Math.PI),symmetric=Math.cos((u-.5)*Math.PI*4)*15+Math.cos((u-.5)*Math.PI*8)*5;
            const y=center+(band-1.5)*5+asymmetric*(1-symmetry)+symmetric*symmetry;
            if (!x) ctx.moveTo(left + x, y); else ctx.lineTo(left + x, y);
          }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
  };
})(window.CosmicIdle);
