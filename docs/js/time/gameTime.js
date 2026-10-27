(function (Game) {
  const D = Game.D;

  Game.Time = {
    // Single hook for any future speed effects; the public edition runs at 1×.
    speed: D(1),
    getGameSpeed: function () {
      return this.speed;
    },

    getGameDelta: function (realDeltaSeconds) {
      return D(realDeltaSeconds).mul(this.getGameSpeed());
    },

    advance: function (realDeltaSeconds, gameDelta) {
      Game.player.time.realPlayed = Math.round((Game.player.time.realPlayed + realDeltaSeconds) * 1e9) / 1e9;
      Game.player.time.currentEnergyRunReal = Math.round((Game.player.time.currentEnergyRunReal + realDeltaSeconds) * 1e9) / 1e9;
      Game.player.time.gamePlayed = Game.player.time.gamePlayed.add(gameDelta);
      Game.player.time.currentEnergyRun = Game.player.time.currentEnergyRun.add(gameDelta);
    }
  };
})(window.CosmicIdle);
