(function (Game) {
  function start() {
    const loaded=Game.Save.load();
    Game.Offline.prepare(loaded);
    Game.UI.init();
    Game.Experience.init();
    Game.Offline.init();
    Game.UI.render();
    Game.Loop.start();

    setInterval(function () {
      Game.Loop.pump(performance.now());
      Game.Save.save(false);
    }, Game.CONFIG.AUTOSAVE_MS);
    window.addEventListener('pagehide',function(){Game.Loop.pump(performance.now());Game.Save.save();});
    window.addEventListener('pageshow',function(event){
      if(!event.persisted)return;
      Game.Loop.lastTime=performance.now();Game.Loop.accumulator=0;
      if(Game.Offline.busy)Game.Offline.show();
      else if(Game.player.time.lastActiveAt>0)Game.Offline.offer(Math.max(0,(Date.now()-Game.player.time.lastActiveAt)/1000));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window.CosmicIdle);
