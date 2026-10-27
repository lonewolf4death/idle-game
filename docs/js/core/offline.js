(function (Game) {
  const D = Game.D;
  // Simulates time spent away (closed page or long-hidden tab) through the
  // normal game loop, a slice at a time so the page stays responsive.
  Game.Offline = {
    active: false, pending: 0, total: 0, away: 0, before: null,
    snapshot: function () {
      const p = Game.player;
      return { energy: p.resources.energy, quanta: p.prestige.totalQuanta, condenses: p.prestige.times, bought: p.stats.generatorsBought, symmetry: p.symmetry ? p.symmetry.total : D(0), playtime: Game.Playtime.state().level };
    },
    // Record the save's timestamp before startup code has a chance to save again.
    noteLoad: function () { this.loadedSavedAt = Game.player.time.savedAt; },
    // Called once at startup, from the timestamp stored with the save.
    resumeFromSave: function () {
      const savedAt = this.loadedSavedAt !== undefined ? this.loadedSavedAt : Game.player.time.savedAt;
      this.loadedSavedAt = undefined;
      if (!savedAt) return false;
      return this.begin((Date.now() - savedAt) / 1000, true);
    },
    begin: function (seconds, closed) {
      const rules = Game.CONFIG.OFFLINE;
      if (!(seconds >= rules.minSeconds)) return false;
      if (!Game.player.settings.offlineProgress) return false;
      if (this.active) {
        const added = Math.max(0, Math.min(rules.maxSeconds - this.pending, seconds));
        this.pending += added;this.total += added;this.away += seconds;
        return true;
      }
      this.away = seconds;
      this.total = this.pending = Math.min(rules.maxSeconds, seconds);
      this.closed = !!closed;
      this.before = this.snapshot();
      this.active = true;
      if (Game.UI && Game.UI.showOffline) Game.UI.showOffline(0);
      return true;
    },
    // Simulate in short slices until the frame budget is used.
    step: function (budgetMs) {
      if (!this.active) return;
      const start = performance.now();
      do {
        // Reduce pending first so a save made inside the slice does not owe it twice.
        const slice = Math.min(this.pending, 10);
        this.pending = Math.max(0, this.pending - slice);
        Game.Loop.simulateBatch(slice);
      } while (this.pending > 1e-9 && performance.now() - start < budgetMs);
      if (this.pending <= 1e-9) this.finish();
      else if (Game.UI && Game.UI.showOffline) Game.UI.showOffline(this.progress());
    },
    // Replacing the save (import, backup restore, hard reset) drops any time still owed.
    cancel: function () {
      if (!this.active) return;
      this.active = false;this.pending = 0;this.total = 0;
      if (Game.UI && Game.UI.showOffline) Game.UI.showOffline(null);
    },
    runAll: function () { while (this.active) this.step(Infinity); },
    progress: function () { return this.total > 0 ? 1 - this.pending / this.total : 1; },
    summary: function () {
      const before = this.before, after = this.snapshot(), F = Game.Format;
      const lines = ["You were away for " + F.duration(this.away) + "."];
      if (this.away > this.total + 1) lines.push("Offline progress is limited to " + F.duration(this.total) + ".");
      const condenses = after.condenses.sub(before.condenses);
      if (condenses.gt(0)) lines.push("Auto-Condensed " + F.number(condenses, 0) + (condenses.eq(1) ? " time" : " times") + " for +" + F.number(after.quanta.sub(before.quanta), 0) + " Primordial Quanta.");
      else if (after.energy.gt(before.energy)) lines.push("Energy grew from " + F.number(before.energy) + " to " + F.number(after.energy) + ".");
      const bought = after.bought.sub(before.bought);
      if (bought.gt(0)) lines.push("Your buyers purchased " + F.number(bought, 0) + " generators.");
      if (after.playtime > before.playtime) lines.push("Reached playtime tier " + after.playtime + " (all Energy ×" + F.number(Game.Playtime.state().multiplier, 4) + " in total).");
      if (after.symmetry.gt(before.symmetry)) lines.push("Gained " + F.number(after.symmetry.sub(before.symmetry), 0) + " Broken Symmetries.");
      return lines.join(" ");
    },
    finish: function () {
      this.active = false;
      const text = this.summary();
      if (Game.UI && Game.UI.showOffline) Game.UI.showOffline(null);
      Game.Save.save();
      // Short tab switches catch up silently; real absences get a summary.
      if (this.away >= 600 && Game.Experience && Game.Experience.queue) Game.Experience.queue.unshift({ kind: "Welcome back", title: "While you were away", text: text });
      if (Game.Experience && Game.Experience.next) Game.Experience.next();
      this.lastSummary = text;
    }
  };
})(window.CosmicIdle);
