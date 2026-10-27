(function (Game) {
  const numberFormatters = new Map();
  Game.Format = {
    number: function (value, decimals) {
      const d = Game.D(value);
      const places = decimals === undefined ? 2 : decimals;
      if (!(Number.isFinite(d.mantissa) && Number.isFinite(d.exponent))) return "∞";
      if (d.eq(0)) return "0";
      if (d.abs().lt(1000)) {
        let formatter = numberFormatters.get(places);
        if (!formatter) { formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: places });numberFormatters.set(places, formatter); }
        return formatter.format(d.toNumber());
      }
      return d.toExponential(places).replace("+", "");
    },

    quantaRate: function (value) { return value===null ? "—" : Game.D(value).gt(0) && Game.D(value).lt(.001) ? Game.D(value).toExponential(2).replace("+","") : this.number(value,3); },
    runDuration: function (seconds) {
      if (seconds>=1e12) return this.duration(seconds);
      const rounded=Math.round(seconds*10)/10, hours=Math.floor(rounded/3600), minutes=Math.floor(rounded%3600/60), remainder=Number((rounded%60).toFixed(1));
      return (hours?hours+"h ":"")+(minutes?minutes+"m ":"")+this.number(remainder,1)+"s";
    },
    duration: function (seconds) {
      const numeric = seconds instanceof Decimal ? seconds.toNumber() : Number(seconds);
      if (!Number.isFinite(numeric) || numeric >= 1e12) return this.number(seconds) + "s";
      if (numeric < 60) return Math.floor(numeric) + "s";
      if (numeric < 3600) return Math.floor(numeric / 60) + "m " + Math.floor(numeric % 60) + "s";
      return Math.floor(numeric / 3600) + "h " + Math.floor((numeric % 3600) / 60) + "m";
    }
  };
})(window.CosmicIdle);

