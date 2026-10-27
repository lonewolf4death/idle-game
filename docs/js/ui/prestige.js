(function (Game) {
  const elements = Object.create(null);
  function byId(id) { return elements[id] || (elements[id] = document.getElementById(id)); }
  function setText(node, value) { value = String(value);if (node.textContent !== value) node.textContent = value; }
  function number(value) { return Game.Format.number(value, 0); }
  Game.PrestigeUI = {
    selected: "1-1", nodes: {}, pinned: false,
    showDetails: function (id, pin) {
      clearTimeout(this.showTimer);clearTimeout(this.hideTimer);
      const node = this.nodes[id];
      if (!node || byId("prestige-view").hidden) return;
      if (id !== this.selected) byId("skill-purchase-status").textContent = "";
      this.selected = id;this.pinned = Boolean(pin);
      byId("skill-detail").hidden = false;
      this.render(false);
      this.positionDetails();
    },
    scheduleDetails: function (id) {
      clearTimeout(this.showTimer);clearTimeout(this.hideTimer);
      if (!byId("skill-detail").hidden && this.selected === id) return;
      this.showTimer = setTimeout(function () { Game.PrestigeUI.showDetails(id, false); }, 1000);
    },
    queueHide: function () {
      clearTimeout(this.showTimer);clearTimeout(this.hideTimer);
      if (this.pinned) return;
      this.hideTimer = setTimeout(function () {
        const panel = byId("skill-detail");
        if (!panel.matches(":hover") && !panel.contains(document.activeElement)) Game.PrestigeUI.hideDetails();
      }, 220);
    },
    hideDetails: function (restoreFocus) {
      clearTimeout(this.showTimer);clearTimeout(this.hideTimer);
      const panel = byId("skill-detail");
      if (!panel) return;
      panel.hidden = true;this.pinned = false;
      Object.values(this.nodes).forEach(function (node) { node.setAttribute("aria-expanded", "false");node.setAttribute("aria-pressed", "false"); });
      if (restoreFocus && this.nodes[this.selected] && !byId("prestige-view").hidden) {
        this.suppressFocus = true;this.nodes[this.selected].focus({preventScroll:true});this.suppressFocus = false;
      }
    },
    positionDetails: function () {
      const panel = byId("skill-detail"), node = this.nodes[this.selected];
      if (panel.hidden || !node) return;
      const bounds = node.getBoundingClientRect(), width = panel.offsetWidth, height = panel.offsetHeight;
      panel.style.left = Math.max(12, Math.min(innerWidth - width - 12, bounds.left + bounds.width / 2 - width / 2)) + "px";
      const above = bounds.top - height - 12;
      panel.style.top = Math.max(12, Math.min(innerHeight - height - 12, above >= 12 ? above : bounds.bottom + 12)) + "px";
    },
    init: function () {
      Game.CondenseFX.init();
      byId('unlock-symmetry').addEventListener('click',function () { Game.Loop.pump(performance.now());Game.Prestige.unlockSymmetry(); });
      const tree = byId("skill-world");
      Game.CONFIG.PRESTIGE.branches.forEach(function (branch) {
        branch.nodes.forEach(function (id, index) {
          const node = document.createElement("button");
          const definition = Game.CONFIG.PRESTIGE.skills[id];
          node.className = "constellation-node";
          node.classList.toggle("is-root", !definition.requires);
          node.dataset.skill = id;
          node.innerHTML = "<span class='skill-label-title'>" + Game.Icons.svg("skill-" + id) + "<b>" + id + "</b><span>" + definition.name + "</span></span><span class='skill-node-state'></span>";
          node.setAttribute("aria-label", id + ": " + (definition ? definition.name : "Unformed skill") + ". Inspect skill.");
          node.setAttribute("aria-haspopup", "dialog");node.setAttribute("aria-controls", "skill-detail");node.setAttribute("aria-expanded", "false");
          node.addEventListener("pointerenter", function (event) { if (event.pointerType !== "touch") Game.PrestigeUI.scheduleDetails(id); });
          node.addEventListener("pointerleave", function (event) { if (!byId("skill-detail").contains(event.relatedTarget)) Game.PrestigeUI.queueHide(); });
          node.addEventListener("focus", function () {
            if (Game.PrestigeUI.suppressFocus) return;
            // Moving the camera during a touch focus can move the label away
            // before its click lands. Reframe only for keyboard navigation.
            if (node.matches(":focus-visible")) {
              if (Game.player.ui.skillTree2D) node.scrollIntoView({block:"nearest",inline:"nearest"});
              else Game.TreeCamera.reveal(id);
            }
            Game.PrestigeUI.scheduleDetails(id);
          });
          node.addEventListener("blur", function (event) { if (!byId("skill-detail").contains(event.relatedTarget)) { Game.PrestigeUI.pinned = false;Game.PrestigeUI.queueHide(); } });
          node.addEventListener("click", function () { Game.PrestigeUI.showDetails(id, true); });
          Game.PrestigeUI.nodes[id] = node;
          tree.appendChild(node);
        });
      });
      Game.TreeCamera.init();
      Game.TreeMap.init();
      byId("buy-skill").addEventListener("click", function () {
        if (Game.Prestige.buySkill(Game.PrestigeUI.selected)) byId("skill-purchase-status").textContent = "Skill " + Game.PrestigeUI.selected + " unlocked.";
      });
      const panel = byId("skill-detail");
      panel.addEventListener("pointerenter", function () { clearTimeout(Game.PrestigeUI.hideTimer); });
      panel.addEventListener("pointerleave", function () { Game.PrestigeUI.queueHide(); });
      panel.addEventListener("focusout", function (event) { if (!panel.contains(event.relatedTarget)) { Game.PrestigeUI.pinned = false;Game.PrestigeUI.queueHide(); } });
      byId("close-skill-detail").addEventListener("click", function () { Game.PrestigeUI.hideDetails(true); });
      document.addEventListener("pointerdown", function (event) { if (!panel.contains(event.target) && !event.target.closest("[data-skill]")) Game.PrestigeUI.hideDetails(); });
      document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !panel.hidden) { event.preventDefault();Game.PrestigeUI.hideDetails(panel.contains(document.activeElement)); } });
      document.addEventListener("scroll", function (event) {
        if (panel.contains(event.target)) return;
        Game.PrestigeUI.hideDetails();
        // Scrolling a tall map can deliver pointerenter before scroll. Restart
        // the hover delay for the node now under the pointer after hiding.
        const hovered=document.querySelector("#skill-map [data-skill]:hover");
        if (hovered) Game.PrestigeUI.scheduleDetails(hovered.dataset.skill);
      }, true);
      document.addEventListener("visibilitychange", function () { Game.PrestigeUI.hideDetails(); });
      window.addEventListener("blur", function () { Game.PrestigeUI.hideDetails(); });
      window.addEventListener("resize", function () { Game.PrestigeUI.positionDetails(); });
      byId("condense-button").addEventListener("click", function () {
        Game.Loop.pump(performance.now());
        Game.Prestige.condense();
      });
      byId("milestone-condense").addEventListener("click", function () { Game.UI.selectView("prestige", true);byId("condense-button").scrollIntoView({block:"center"}); });
      byId("respec-skills").addEventListener("click", function () {
        if (!Game.Prestige.canRespec()) return;
        const dialog=byId("respec-dialog");
        setText(byId("respec-refund"), "Refund "+number(Game.Prestige.respecRefund())+" Primordial Quanta");
        setText(byId("respec-description"), "Clear all purchased skills and restart this run. Energy, generators, Disturb, Resonance, field growth and run timers reset. Keep achievements, lore, total playtime, lifetime Condenses and earned Quanta. This grants no Condense reward.");
        setText(byId("confirm-respec"), "Respec · restart run");
        dialog.classList.remove("is-dismissing");byId("confirm-respec").disabled=false;byId("cancel-respec").disabled=false;dialog.showModal();byId("cancel-respec").focus();
      });
      const finishRespec=function (accept) {
        const dialog=byId("respec-dialog");if (!dialog.open || dialog.classList.contains("is-dismissing")) return;
        byId("confirm-respec").disabled=true;byId("cancel-respec").disabled=true;dialog.classList.add("is-dismissing");
        setTimeout(function () {
          dialog.close();dialog.classList.remove("is-dismissing");
          if (accept) { Game.Loop.pump(performance.now());Game.Prestige.respec(); }
          if (Game.Experience) Game.Experience.next();
        },2000);
      };
      byId("confirm-respec").addEventListener("click",function () { finishRespec(true); });
      byId("cancel-respec").addEventListener("click",function () { finishRespec(false); });
      byId("respec-dialog").addEventListener("cancel",function (event) { event.preventDefault();finishRespec(false); });
    },
    render: function (reveal) {
      Game.TreeMap.syncMode();
      const sym=byId('unlock-symmetry'),symOwned=Game.player.prestige.symmetry;
      sym.disabled=!Game.Prestige.canUnlockSymmetry();setText(sym,symOwned?'Unlocked · 10,000 Quanta':'Unlock · 10,000 Quanta');
      setText(byId('symmetry-state'),symOwned?'Unlocked · see the Symmetry tab':'Disconnected · opens Breaking Symmetry');
      const p = Game.player, reward = Game.Prestige.reward(), ready = reward.gt(0), experienced = p.prestige.times.gt(0);
      setText(byId("quanta-balance"), number(p.prestige.quanta));
      byId("quanta-header").hidden = !(experienced || p.prestige.quanta.gt(0) || reveal);
      const quantaBonus=Game.Progression.quantaBonusState();
      setText(byId("quanta-bonus"), "×" + Game.Format.number(quantaBonus.multiplier, 5) + " all Energy" + (quantaBonus.suppressed ? " · disabled in this challenge" : quantaBonus.active ? " · soft-capped" : "") + (Game.Progression.hasSkill("4-4-2") ? " · basis " + Game.Format.number(quantaBonus.basis, 1) + " Quanta" : ""));
      setText(byId("condense-earned"), number(p.prestige.totalQuanta) + " earned · " + number(p.prestige.times) + " condensations" + (Game.Progression.hasSkill("4-3-1") ? " · " + number(Game.Progression.effectiveCondenses()) + " effective" : ""));
      setText(byId("condense-reward"), "+" + number(reward) + " Primordial Quanta");
      setText(byId("condense-next"), "Next reward: " + number(reward.add(Game.Symmetry.quantaMultiplier())) + " at " + number(Game.Prestige.nextRewardEnergy()) + " held Energy");
      setText(byId("condense-requirement"), Game.Challenges.active() ? "Condense is unavailable during a challenge. Complete its Energy goal or exit the challenge first." : ready ? "Ready to condense. Your current run will reset." : "Requires " + number(Game.CONFIG.PROGRESSION.prestigeEnergy) + " held Energy.");
      byId("condense-button").disabled = !ready;
      setText(byId("condense-button"), "Condense Energy · +" + number(reward) + " Quanta");
      byId("prestige-view").classList.toggle("can-condense", ready);
      byId("milestone-condense").hidden = !(ready || experienced || reveal);
      byId("milestone-condense-summary").hidden = !(ready || experienced || reveal);
      const run=Game.Prestige.currentRun();
      setText(byId("milestone-quanta-rate"),(run.partial ? "Tracked: " : "")+Game.Format.quantaRate(run.perMinute)+" Quanta/min");
      setText(byId("milestone-condense"), ready ? "Condense · +" + number(reward) + " Quanta" : "Condense Energy");
      byId("condense-achievement").classList.toggle("unlocked", Game.Progression.condenseAchievementUnlocked());
      setText(byId("condense-achievement-status"), Game.Progression.condenseAchievementUnlocked() ? "Unlocked" : "0 / 1 condensations");
      if (byId("prestige-view").hidden) return;
      setText(byId("respec-skills"), "Respec · " + number(Game.Prestige.respecRefund()) + " Q");
      byId("respec-skills").title = Game.Challenges.active()?"Exit the challenge before changing skills":"Refund " + number(Game.Prestige.respecRefund()) + " Quanta" + " and restart this run";
      byId("respec-skills").disabled = !Game.Prestige.canRespec();
      const selected = this.selected, definition = Game.CONFIG.PRESTIGE.skills[selected];
      Object.keys(this.nodes).forEach(function (id) {
        const node = Game.PrestigeUI.nodes[id], owned = Game.Progression.hasSkill(id), available = Game.Prestige.canBuySkill(id), designed = Boolean(Game.CONFIG.PRESTIGE.skills[id]);
        const definition = Game.CONFIG.PRESTIGE.skills[id], locked = definition && definition.requires && !Game.Progression.hasSkill(definition.requires);
        node.classList.toggle("is-owned", owned);node.classList.toggle("is-available", available);node.classList.toggle("is-unformed", !designed);node.classList.toggle("is-locked", Boolean(locked));
        const inspecting = id === selected && !byId("skill-detail").hidden;
        node.setAttribute("aria-pressed", String(inspecting));node.setAttribute("aria-expanded", String(inspecting));
        setText(node.querySelector(".skill-node-state"), definition.cost + " Quanta" + (owned ? " · Owned" : locked && !Game.player.ui.skillTree2D ? " · Requires " + definition.requires : ""));
      });
      const branch = Game.CONFIG.PRESTIGE.branches.find(function (item) { return item.nodes.includes(selected); });
      const owned = Game.Progression.hasSkill(selected), affordable = Game.Prestige.canBuySkill(selected);
      setText(byId("skill-detail-id"), selected + " · " + branch.name);
      setText(byId("skill-detail-name"), definition ? definition.name : "Unformed potential");
      let description = definition ? definition.description : "This part of the constellation has yet to take shape. Its effect and cost will be designed later.";
      if (selected === "0-0") description += " Current bonus: ×" + Game.Format.number(Game.Progression.hasSkill("0-0") ? Game.Progression.condenseMemoryMultiplier() : Game.D(definition.energyPerCondense).pow(Game.Progression.effectiveCondenses()), 5) + " from " + number(p.prestige.times) + " lifetime Condenses" + (Game.Progression.hasSkill("4-3-1") ? " (" + number(Game.Progression.effectiveCondenses()) + " effective)" : "") + ".";
      if (selected === "1-2" && Game.Progression.hasSkill("1-2-1")) description += " Replaced by 1-2-1: clicks now advance all generators by 0.33 game seconds instead of granting this Energy-only payout.";
      if (selected === "3-3" && Game.Progression.hasSkill("3-4-3")) description += " Upgraded by 3-4-3: the current bonus is ×1.2 for two adjacent generators.";
      // Live notes appended above (current bonus, replacements) stay visible with the summary.
      const hasSummary = !!(definition && definition.summary), live = hasSummary ? description.slice(definition.description.length) : "";
      setText(byId("skill-detail-summary"), hasSummary ? definition.summary + live : description);
      byId("skill-detail-rules").hidden = !hasSummary;
      setText(byId("skill-detail-description"), description);
      const afterSpend=Decimal.max(0,p.prestige.quanta.sub(definition.cost));
      const afterBasis=Decimal.max(afterSpend,Game.Progression.hasSkill("4-4-2") || selected==="4-4-2" ? p.prestige.totalQuanta.div(2) : 0);
      setText(byId("skill-detail-cost"), "Cost: " + definition.cost + " Quanta · " + (owned ? "Owned · Permanent skill · survives Condensing" : "After purchase: " + number(afterSpend) + " unspent" + (affordable ? " · Quanta bonus ×" + Game.Format.number(Game.Progression.quantaMultiplier(afterBasis), 5) : "")));
      byId("buy-skill").disabled = !affordable;
      setText(byId("buy-skill"), owned ? "Owned" : Game.Challenges.active()?"Exit challenge to unlock skills":definition.requires && !Game.Progression.hasSkill(definition.requires) ? "Requires " + definition.requires : affordable ? "Unlock · " + definition.cost + " Quanta" : "Need " + definition.cost + " Quanta");
      const detailKey = selected + String(owned) + String(reveal) + p.prestige.quanta.toString();
      if (this.detailKey !== detailKey) { this.detailKey = detailKey;this.positionDetails(); }
      if (p.ui.skillTree2D) Game.TreeMap.updateState();else Game.TreeCamera.updateState();
    }
  };
})(window.CosmicIdle);
