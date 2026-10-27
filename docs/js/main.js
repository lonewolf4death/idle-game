(function (Game) {
  function start() {
    Game.Save.load();
    Game.Offline.noteLoad();
    // Start catch-up before any startup message opens, so messages wait for it.
    Game.Offline.resumeFromSave();
    Game.UI.init();
    Game.Experience.init();
    Game.PotentialBubble.init();
    Game.UI.render();
    Game.Loop.start();

    setInterval(function () {
      Game.Save.save(false);
    }, Game.CONFIG.AUTOSAVE_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window.CosmicIdle);
