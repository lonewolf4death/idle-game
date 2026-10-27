(function (Game) {
  if (typeof Decimal === "undefined") {
    document.body.innerHTML = "<main style='padding:2rem;font-family:sans-serif'><h1>Break Infinity failed to load</h1><p>The local number library is missing. Extract the complete game folder and reopen index.html.</p></main>";
    throw new Error("Break Infinity (Decimal) is unavailable.");
  }

  Game.D = function D(value) {
    return value instanceof Decimal ? value : new Decimal(value);
  };
})(window.CosmicIdle);
