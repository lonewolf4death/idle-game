(function (Game) {
  function set(node,value) { if(node.textContent!==value) node.textContent=value; }
  Game.AchievementsUI = {
    rows:{}, tierRows:[],
    init:function () {
      const table=document.querySelector("#achievements-view .achievement-table");
      Game.CONFIG.DISCOVERY_ACHIEVEMENTS.forEach(function (definition,index) {
        const row=document.createElement("div");row.className="achievement-row";row.id=definition.id+"-achievement";row.setAttribute("role","row");
        row.innerHTML="<div role='cell' class='achievement-name'><span class='achievement-emblem' aria-hidden='true'>"+Game.Icons.svg(definition.icon)+"</span><div><span class='achievement-number'>"+String(index+8).padStart(2,"0")+"</span><h3>"+definition.name+"</h3></div></div><div role='cell'><span class='mobile-cell-label'>Requirement</span>"+definition.requirement+"</div><div role='cell'><span class='mobile-cell-label'>Reward</span>"+Game.Achievements.rewardText(definition)+"</div><div role='cell'><span class='mobile-cell-label'>Status</span><strong data-status></strong></div>";
        table.appendChild(row);Game.AchievementsUI.rows[definition.id]={row:row,status:row.querySelector("[data-status]")};
      });
      Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT.tiers.forEach(function (tier,index) {
        const row=document.createElement("span");row.className="fluct-tier";row.dataset.fluctTier=index+1;row.hidden=true;
        row.textContent="Level "+(index+1)+" · "+tier.rolls+" negatives · +"+Math.round(tier.bonus*100)+" percentage "+(tier.bonus===.01?"point":"points");
        document.getElementById("fluct-streak-tiers").appendChild(row);Game.AchievementsUI.tierRows.push(row);
      });
    },
    render:function (reveal) {
      const P=Game.Progression, A=Game.Achievements, p=Game.player, level=A.fluctLevel(), rules=Game.CONFIG.FLUCT_STREAK_ACHIEVEMENT;
      const discoveries=Game.CONFIG.DISCOVERY_ACHIEVEMENTS.filter(function (definition) { return p.achievements[definition.id]; }).length;
      const base=[P.achievementUnlocked(),P.firstGeneratorAchievementUnlocked(),P.growingEngineAchievementUnlocked(),P.playtimeAchievementUnlocked(),P.coherentAchievementUnlocked(),P.condenseAchievementUnlocked()].filter(Boolean).length;
      const total=6+Number(level>0||reveal)+Game.CONFIG.DISCOVERY_ACHIEVEMENTS.length;
      set(document.getElementById("achievement-count"),(base+Number(level>0)+discoveries)+" / "+total);
      if(document.getElementById("achievements-view").hidden) return;
      const row=document.getElementById("fluct-streak-achievement");row.hidden=!(level||reveal);row.classList.toggle("unlocked",level>0);
      set(document.getElementById("fluct-streak-name"),rules.name);
      set(document.getElementById("fluct-streak-condition"),p.fluctuation.positiveChanceMastery?"Probability mastery · all levels unlocked":level?"Roll "+rules.tiers[level-1].rolls+" negative Flucts in a row":"Roll 3 negative Flucts in a row");
      const points=Math.round(A.fluctBonus()*100);
      set(document.getElementById("fluct-streak-reward"),"+"+points+" percentage "+(points===1?"point":"points")+" positive Fluct chance"+(p.fluctuation.positiveChanceMastery?" · positive chance at least 80%":""));
      set(document.getElementById("fluct-streak-status"),level?"Level "+level+" · "+(level===rules.tiers.length?"Maxed":"Unlocked"):"Hidden · not earned");
      this.tierRows.forEach(function (tier,index) { tier.hidden=!(index<level||reveal);tier.classList.toggle("earned",index<level); });
      Game.CONFIG.DISCOVERY_ACHIEVEMENTS.forEach(function (definition) {
        const item=Game.AchievementsUI.rows[definition.id], owned=Boolean(p.achievements[definition.id]);
        item.row.hidden=false;item.row.classList.toggle("unlocked",owned);set(item.status,definition.kind==='challenge' ? (function () { const n=p.automation.buyers[Game.CONFIG.AUTOMATION.buyers[definition.track-1].id].level;return (n>=10?'Mastered':n>=5?'Established':n>=1?'Initiated':'Locked')+' · '+n+'/10'; })() : owned?"Unlocked":"Locked");
      });
    }
  };
})(window.CosmicIdle);
