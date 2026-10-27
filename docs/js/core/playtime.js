(function (Game) {
  const D = Game.D;
  Game.Playtime = {
    tiers: function () {
      if (this._tiers) return this._tiers;
      const config = Game.CONFIG.PLAYTIME_ACHIEVEMENT;
      const tiers = config.earlyTiers.map(function (tier) {
        return { seconds: D(tier.seconds), label: tier.label, multiplier: D(tier.multiplier) };
      });
      for (let month = 1; month < 12; month++) {
        tiers.push({ seconds: D(config.monthSeconds * month), label: month + (month === 1 ? " month" : " months"), multiplier: D(config.monthlyMultiplier) });
      }
      tiers.push({ seconds: D(config.yearSeconds), label: "1 year", multiplier: D(config.monthlyMultiplier) });
      config.yearTiers.forEach(function (year) {
        tiers.push({ seconds: D(config.yearSeconds * year), label: year + " years", multiplier: D(config.yearMultiplier) });
      });
      this._tiers = tiers;
      return tiers;
    },
    state: function () {
      const elapsed = Game.player.time.gamePlayed;
      if (this._elapsed === elapsed) return this._state;
      const config = Game.CONFIG.PLAYTIME_ACHIEVEMENT;
      const tiers = this.tiers();
      let level = 0, multiplier = D(1), last = null, next = null;
      for (const tier of tiers) {
        if (elapsed.lt(tier.seconds)) { next = tier; break; }
        multiplier = multiplier.mul(tier.multiplier);
        level++;
        last = tier;
      }
      if (!next) {
        const start = D(config.yearSeconds).mul(config.repeatingStartYears);
        const factor = D(config.repeatingTimeFactor);
        let repeated = elapsed.lt(start) ? 0 : Math.max(0, Math.floor(elapsed.div(start).log10() / factor.log10()) + 1);
        let target = start.mul(factor.pow(repeated));
        // Repair logarithm rounding at exact powers without iterating through years.
        if (repeated > 0 && elapsed.lt(target.div(factor))) { repeated--; target = target.div(factor); }
        if (elapsed.gte(target)) { repeated++; target = target.mul(factor); }
        const makeTier = function (seconds) {
          const years = seconds.div(config.yearSeconds);
          return { seconds: seconds, years: years, multiplier: D(config.repeatingMultiplier) };
        };
        next = makeTier(target);
        if (repeated > 0) {
          last = makeTier(target.div(factor));
          level += repeated;
          multiplier = multiplier.mul(D(config.repeatingMultiplier).pow(repeated));
        }
      }
      this._elapsed = elapsed;
      this._state = { level: level, multiplier: multiplier, last: last, next: next };
      return this._state;
    },
    tierLabel: function (tier) {
      return tier.label || Game.Format.number(tier.years, 0) + " years";
    },
    elapsedLabel: function () {
      const elapsed = Game.player.time.gamePlayed;
      if (elapsed.lt(86400)) return Game.Format.duration(elapsed);
      const yearSeconds = Game.CONFIG.PLAYTIME_ACHIEVEMENT.yearSeconds;
      const years = elapsed.div(yearSeconds);
      if (elapsed.gte(yearSeconds * 1000)) return Game.Format.number(years) + " years";
      if (elapsed.gte(yearSeconds)) {
        const wholeYears = years.add(1e-12).floor();
        const days = Decimal.max(0, elapsed.sub(wholeYears.mul(yearSeconds))).div(86400).add(1e-12).floor();
        return Game.Format.number(wholeYears, 0) + "y " + Game.Format.number(days, 0) + "d";
      }
      const days = elapsed.div(86400).add(1e-12).floor();
      const hours = Decimal.max(0, elapsed.sub(days.mul(86400))).div(3600).add(1e-12).floor();
      return Game.Format.number(days, 0) + "d " + Game.Format.number(hours, 0) + "h";
    }
  };
})(window.CosmicIdle);
