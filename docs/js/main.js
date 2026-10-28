(function (Game) {
  function start() {
    Game.Save.load();
    Game.UI.init();
    Game.Experience.init();
    Game.UI.render();
    Game.Loop.start();

    setInterval(function () {
      Game.Save.save(false);
    }, Game.CONFIG.AUTOSAVE_MS);
    window.addEventListener('pagehide',function(){Game.Save.save();});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window.CosmicIdle);
