(function (Game) {
  // One DOM target, updated by the existing 15 Hz UI loop. No extra RAF or
  // background timer; collection checks the exact interaction timestamp.
  Game.PotentialBubble = {
    active: null, nextAt: null, serial: 0,
    init: function () {
      const field=document.getElementById("energy-field");
      this.node=document.createElement("button");this.node.id="potential-bubble";this.node.className="potential-bubble";this.node.hidden=true;
      this.node.innerHTML="<span class='bubble-ring'></span><span class='bubble-core'></span><span class='bubble-hint'>Potential forming</span>";
      this.node.addEventListener("click",function (event) { event.stopPropagation();Game.PotentialBubble.collect(performance.now()); });
      this.node.addEventListener("keydown",function (event) { event.stopPropagation(); });
      field.appendChild(this.node);
      this.notice=document.createElement("span");this.notice.className="bubble-result";this.notice.setAttribute("role","status");this.notice.hidden=true;field.appendChild(this.notice);
      document.addEventListener("visibilitychange",function () { Game.PotentialBubble.clear(); });
      window.addEventListener("blur",function () { Game.PotentialBubble.clear(); });
    },
    eligible: function () {
      return !Game.Challenges.active() && Game.Progression.hasSkill("1-5-2") && !document.hidden && document.hasFocus() && !document.getElementById("energy-view").hidden && !document.querySelector("dialog[open]") && !(Game.CondenseFX && Game.CondenseFX.active);
    },
    clear: function () { this.active=null;this.nextAt=null;if (this.node) this.node.hidden=true;if (this.notice) this.notice.hidden=true; },
    windowOpen: function (now) {
      if (!this.active) return false;
      const age=(now-this.active.started)/1000, rules=Game.CONFIG.PRESTIGE.skills["1-5-2"];
      return age>=rules.growSeconds && age<=rules.growSeconds+rules.graceSeconds;
    },
    spawn: function (now) {
      const n=++this.serial;
      this.active={started:now,owner:Game.player};this.node.hidden=false;this.node.classList.remove("is-ready");
      // Keep targets away from edges and use no gameplay random numbers.
      this.node.style.left=(15+(n*.61803398875%1)*70)+"%";this.node.style.top=(22+(n*.41421356237%1)*49)+"%";
      this.node.style.setProperty("--bubble-size","0.08");this.node.style.opacity="1";
      this.node.querySelector(".bubble-hint").textContent="Potential forming";this.node.setAttribute("aria-label","Potential bubble. Collect when the ring turns green.");
      Game.Audio.play("bubbleForm");
    },
    update: function (now) {
      if (!this.node) return;
      if (!this.eligible() || this.active && this.active.owner!==Game.player) { this.clear();return; }
      now=now===undefined?performance.now():now;
      const rules=Game.CONFIG.PRESTIGE.skills["1-5-2"];
      if (this.nextAt===null) this.nextAt=now+rules.spawnSeconds*1000;
      if (this.resultUntil && now>=this.resultUntil) this.notice.hidden=true;
      if (now>=this.nextAt) { this.nextAt=now+rules.spawnSeconds*1000;this.spawn(now); }
      if (!this.active) return;
      const age=(now-this.active.started)/1000, ready=this.windowOpen(now), end=rules.growSeconds+rules.graceSeconds;
      if (age>end+.5) { this.active=null;this.node.hidden=true;return; }
      this.node.style.setProperty("--bubble-size",String(.08+.92*Math.min(1,age/rules.growSeconds)));
      this.node.style.opacity=String(age>end?Math.max(0,1-(age-end)/.5):1);
      this.node.classList.toggle("is-ready",ready);
      this.node.querySelector(".bubble-hint").textContent=ready?"Collect potential":age>end?"Dissipating":"Potential forming";
      this.node.setAttribute("aria-label",ready?"Collect potential now. Gain one of every available Primordial generator.":"Potential bubble. Wait for the green ring.");
    },
    collect: function (now) {
      if (!this.active || !this.eligible()) return false;
      const success=this.windowOpen(now===undefined?performance.now():now);
      if (success) {
        Game.CONFIG.GENERATORS.forEach(function (gen) { if (Game.Energy.generatorEnabled(gen)) Game.Energy.addGenerators(gen.id,1); });
        Game.Audio.play("bubbleCollect");
      }
      this.notice.textContent=success?"Potential captured · +1 to every available Primordial generator":"Potential slipped away";
      this.notice.hidden=false;this.resultUntil=performance.now()+1800;
      this.active=null;this.node.hidden=true;Game.UI.render();return success;
    }
  };
})(window.CosmicIdle);
