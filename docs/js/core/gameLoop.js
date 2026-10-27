(function (Game) {
  Game.Loop = {
    lastTime: performance.now(),
    accumulator: 0,
    interval: 1 / Game.CONFIG.SIMULATION_TPS,
    catchingUp: false,
    displayInterval: 1000 / 15,
    lastDisplay: -Infinity,
    advanceGameTime: function (gameDelta) {
      Game.Achievements.checkFluctMastery();
      const before = Game.Playtime.state().level;
      let remaining = Game.D(gameDelta);
      // Share one ordered clock for real progress and click-granted progress.
      // Automatic clicks enqueue their time rather than recursively simulating it.
      while (remaining.gt(0)) {
        const eligible = Game.Energy.autoClickEligible();
        if (!eligible) Game.player.autoClick.elapsed = Game.D(0);
        const untilTier = Game.Playtime.state().next.seconds.sub(Game.player.time.gamePlayed);
        const segment = Decimal.min(remaining, Decimal.min(untilTier, Game.Energy.autoClickRemaining()));
        if (segment.gt(0)) {
          Game.Energy.tick(segment);
          Game.Time.advance(0, segment);
          if (eligible) Game.player.autoClick.elapsed = Game.player.autoClick.elapsed.add(segment);
          remaining = remaining.sub(segment);
        }
        if (eligible && Game.player.autoClick.elapsed.add(1e-12).gte(Game.CONFIG.PRESTIGE.skills["1-2-2"].interval)) {
          Game.player.autoClick.elapsed = Game.D(0);
          Game.player.stats.autoClicks = Game.player.stats.autoClicks.add(1);
          remaining = remaining.add(Game.Energy.generateManual(true));
          if (Game.UI.autoClickFeedback) Game.UI.autoClickFeedback();
        }
      }
      const earned = Game.Playtime.state();
      if (earned.level > before) {
        const crossed = earned.level - before;
        Game.UI.notifyAchievement("A moment in the void · Tier " + Game.Format.number(earned.level, 0),
          (crossed > 1 ? Game.Format.number(crossed, 0) + " time tiers reached · " : "") +
          Game.Playtime.tierLabel(earned.last) + " · ×" + Game.Format.number(earned.last.multiplier, 3) +
          " all Energy · total ×" + Game.Format.number(earned.multiplier, 6));
      }
    },
    simulate: function (realDelta) {
      // Segment at real-time buyer boundaries so catch-up purchases affect only
      // subsequent production and each Condense records the correct duration.
      let remaining=realDelta;
      while (remaining>1e-10) {
        const step=Math.min(remaining,Game.Automation.remaining());
        if (step>0) {
          this.advanceGameTime(Game.Time.getGameDelta(step));
          Game.Time.advance(step, Game.D(0));
          Game.Automation.advance(step);remaining=Math.max(0,remaining-step);
        }
        Game.Automation.resolve();
      }
    },
    pump: function (now) {
      const elapsed = Math.max(0, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.accumulator += elapsed;
      this.catchingUp = this.accumulator > 1;
      try {
        // Normal play stays at 20 TPS. Delayed timers catch up in one-second chunks;
        // Energy.tick splits those further at every Fluct roll boundary.
        while (this.accumulator + 1e-9 >= this.interval) {
          const step = this.accumulator >= 1 ? 1 : this.interval;
          this.simulate(step);
          this.accumulator = Math.max(0, this.accumulator - step);
        }
      } finally { this.catchingUp = false; }
    },
    frame: function (now) {
      Game.Loop.pump(now);
      if (!document.hidden && now - Game.Loop.lastDisplay >= Game.Loop.displayInterval) {
        Game.UI.render();Game.Loop.lastDisplay = now;
      }
      requestAnimationFrame(Game.Loop.frame);
    },
    start: function () {
      this.lastTime = performance.now();
      requestAnimationFrame(this.frame);
      // Browsers throttle this while hidden; the shared clock accounts for the gap.
      this.backgroundTimer = setInterval(function () { Game.Loop.pump(performance.now()); }, 250);
      document.addEventListener("visibilitychange", function () {
        Game.Loop.pump(performance.now());
        if (!document.hidden) Game.UI.render();
      });
    }
  };
})(window.CosmicIdle);
