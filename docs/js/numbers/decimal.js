(function (Game) {
  if (typeof Decimal === "undefined") {
    document.body.innerHTML = "<main style='padding:2rem;font-family:sans-serif'><h1>Break Infinity failed to load</h1><p>The local number library is missing. Extract the complete game folder and reopen index.html.</p></main>";
    throw new Error("Break Infinity (Decimal) is unavailable.");
  }

  // Game code treats Decimals as immutable, so repeated conversions of the same
  // config string or number can share one instance. The cache is bounded.
  const cache = new Map();
  Game.D = function D(value) {
    if (value instanceof Decimal) return value;
    const type = typeof value;
    // Fractional numbers are mostly one-off timer values; caching them would only churn.
    if (type !== "string" && !(type === "number" && Number.isInteger(value))) return new Decimal(value);
    let result = cache.get(value);
    if (result === undefined) {
      if (cache.size >= 4096) cache.clear();
      result = new Decimal(value);
      cache.set(value, result);
    }
    return result;
  };
})(window.CosmicIdle);
