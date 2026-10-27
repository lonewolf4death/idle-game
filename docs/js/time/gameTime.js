(function (Game) {
  const D = Game.D;

  Game.Time = {
    getGameSpeed: function () {
      return D(1).mul(Game.player.meta.gameSpeedMultiplier);
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
