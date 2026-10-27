(function (Game) {
  function text(id, value) {
    const node = document.getElementById(id);
    if (node.textContent !== value) node.textContent = value;
  }
  function show(id, visible) { document.getElementById(id).hidden = !visible; }
  function number(value, places) { return Game.Format.number(value, places === undefined ? 5 : places); }
  function multiplier(value) { return "×" + number(value, 6); }
  function increase(value) { return "+" + number(value); }
  function shareLabel(value) {
    const magnitude = Math.abs(value), sign = value < 0 ? "−" : "";
    if (magnitude === 0) return "0%";
    if (magnitude < .001) return sign + "<0.1%";
    if (magnitude === 1) return sign + "100%";
    if (magnitude > .9995) return sign + "~100%";
    return sign + (magnitude * 100).toFixed(1) + "%";
  }
  function set(node, value) { if (node.textContent !== value) node.textContent = value; }
  function makeRow(entry, child) {
    const root = document.createElement(entry.children ? "details" : "div");
    root.className = child ? "contribution-child" : "contribution-entry";
    root.dataset.contributionSource = entry.id;
    const row = document.createElement(entry.children ? "summary" : "div");
    row.className = "contribution-row";
    const share = document.createElement("span"), label = document.createElement("span"), effect = document.createElement("span");
    share.className = "contribution-share";label.className = "contribution-name";effect.className = "contribution-effect";
    label.textContent = entry.label;
    if (entry.tip) {
      label.classList.add("info-heading");label.dataset.tip = entry.tip;
      if (entry.children) row.dataset.tip = entry.tip;
      else label.tabIndex = 0;
    }
    row.append(share, label, effect);root.append(row);
    const node = { root: root, row: row, share: share, label: label, effect: effect, children: {} };
    if (entry.children) {
      const body = document.createElement("div"), note = document.createElement("p");
      body.className = "contribution-children";note.className = "stats-note";body.append(note);root.append(body);
      node.body = body;node.note = note;
    }
    return node;
  }

  Game.StatsUI = {
    page: "production",
    contributionViews: {},
    init: function () {
      const pages=["production","condense"];
      pages.forEach(function (page,index) {
        const button=document.getElementById("stats-"+page+"-tab");
        button.addEventListener("click",function () { Game.StatsUI.selectPage(page); });
        button.addEventListener("keydown",function (event) {
          if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
          event.preventDefault();const next=event.key==="Home"?pages[0]:event.key==="End"?pages[1]:pages[1-index];Game.StatsUI.selectPage(next,true);
        });
      });
    },
    selectPage: function (page,focus) {
      if (!["production","condense"].includes(page)) return;
      this.page=page;
      ["production","condense"].forEach(function (name) {
        const selected=name===page, button=document.getElementById("stats-"+name+"-tab");
        button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;
        document.getElementById("stats-"+name+"-panel").hidden=!selected;
        if (selected && focus) button.focus();
      });
      document.getElementById("stats-view").scrollTop=0;
      this.render(false);
    },
    renderHistory: function () {
      const run=Game.Prestige.currentRun(), history=Game.player.prestige.history;
      text("stats-run-real-duration",Game.Format.runDuration(run.realSeconds)+(run.partial?" · partial":""));
      text("stats-run-reward","+"+number(run.quanta,0)+" Quanta if condensed now");
      text("stats-run-quanta-minute",Game.Format.quantaRate(run.perMinute));
      text("stats-run-quanta-hour",Game.Format.quantaRate(run.perHour)+" Quanta / real hour");
      show("stats-run-partial",Boolean(run.partial));
      if (this.historyRef===history) return;
      this.historyRef=history;
      const body=document.getElementById("stats-condense-rows"), fragment=document.createDocumentFragment();
      history.forEach(function (entry) {
        const row=document.createElement("tr");row.dataset.condense=entry.condense.toString();
        const labels=["Condense","Real duration","Quanta gained","Quanta / min","Quanta / hour"];
        const values=["#"+number(entry.condense,0)+(entry.partial?" · partial":""),Game.Format.runDuration(entry.realSeconds),"+"+number(entry.quanta,0),Game.Format.quantaRate(Game.Prestige.quantaRate(entry.quanta,entry.realSeconds,60)),Game.Format.quantaRate(Game.Prestige.quantaRate(entry.quanta,entry.realSeconds,3600))];
        values.forEach(function (value,index) { const cell=document.createElement(index===0?"th":"td");if (index===0) cell.scope="row";cell.dataset.label=labels[index];cell.textContent=value;row.appendChild(cell); });
        fragment.appendChild(row);
      });
      body.replaceChildren(fragment);
      text("stats-condense-record-count",history.length+" / 10 recorded");
      show("stats-condense-empty",history.length===0);show("stats-condense-table-wrap",history.length>0);
      show("stats-condense-partial-note",history.some(function (entry) { return entry.partial || entry.realSeconds===0; }));
    },
    renderChildren: function (node, entry, profile, s, reveal, generator) {
      let note;
      if (entry.childBasis === "fluct-strength") {
        const strength = entry.strength;
        const change = s.fluct.multiplier.sub(1).mul(100);
        const changeLabel = (change.lt(0) ? "−" : "+") + number(change.abs(), 3) + "% Energy";
        note = strength.enabled ? "Shares build reinforcement strength " + multiplier(strength.magnitude) + ". Current roll: " + (s.fluct.positive ? "Reinforcement" : "Interference") + " · applied " + multiplier(s.fluct.multiplier) + " (" + changeLabel + "). Next roll in " + number(s.fluct.remaining) + "s." : "Fluct is inactive until at least one Gen 2 unit is owned.";
        if (strength.enabled && !s.fluct.positive) note += " Interference applies the softened penalty to the combined strength below.";
      } else if (entry.childBasis === "oscillation") {
        note = "Cycle " + number(s.dynamics.phase, 1) + " / " + s.dynamics.rules.cycle + "s · current " + multiplier(s.dynamics.multiplier) + " · peak " + multiplier(s.dynamics.peak) + ". Both sources build the current all-Energy multiplier; the final " + number(Game.D(s.dynamics.rules.cycle).sub(s.dynamics.rules.rise), 0) + " seconds hold the peak.";
        if (Game.Progression.hasSkill("3-2-2")) note += Game.FieldDynamics.peakPaused() ? " Peak bonus is off and its countdown is paused until Fluct is positive." : " Peak time is spent only while Fluct is positive.";
      } else if (entry.childBasis === "resonance-growth") {
        note = number(s.coherence.quantum, 0) + " Resonance held. Raw Resonance strengthens Fluct; the soft cap reduces that potential. Shares compare effects within this boost.";
      } else if (entry.childBasis === "captured-production") {
        note = "Direct Energy portions per click. Captured instant adds 0.25 seconds of the displayed Energy/sec rate until replaced by 1-2-1. Echo of creation adds 1% of per-game-second output and also grants Resonance and field growth. These direct bonuses do not advance clocks.";
      } else {
        note = entry.childBasis === "growth" ? "Shares within the combined achievement bonus." : generator ? "Actual portions of current Energy/sec, after all bonuses. These shares add to 100%." : "Actual portions of Energy per click, after all bonuses. These shares add to 100%.";
      }
      set(node.note, note);
      entry.children.forEach(function (child) {
        let childNode = node.children[child.id];
        if (!childNode) { childNode = makeRow(child, true);node.children[child.id] = childNode;node.body.append(childNode.root); }
        childNode.root.hidden = !reveal && child.factor.eq(entry.childBasis === "output" || entry.childBasis === "captured-production" ? 0 : 1);
        childNode.root.classList.toggle("is-slowdown", child.share < 0);
        set(childNode.label, child.label + (child.owned !== undefined ? " · " + number(child.owned, 0) + " owned" : ""));
        const strengthShares = entry.childBasis === "fluct-strength" || entry.childBasis === "resonance-growth";
        const active = strengthShares ? s.fluct.owned.gt(0) : profile.active;
        set(childNode.share, active ? shareLabel(child.share) : "—");
        set(childNode.effect, child.output !== undefined ? number(child.output) + (generator ? " / sec" : " / click") : multiplier(child.factor));
        if (child.children) Game.StatsUI.renderChildren(childNode, child, profile, s, reveal, generator);
      });
    },

    renderContributions: function (s, kind, reveal) {
      const profile = Game.ProductionStats.contributions(s, kind), generator = kind === "generators";
      const id = generator ? "stats-energy-contributions" : "stats-manual-contributions";
      let view = this.contributionViews[id];
      if (!view) {
        const container = document.getElementById(id), chart = document.createElement("div"), list = document.createElement("div"), columns = document.createElement("div");
        chart.className = "contribution-chart";chart.setAttribute("aria-hidden", "true");list.className = "contribution-list";
        columns.className = "contribution-columns";
        ["Share", "Source", "Effect"].forEach(function (label) { const span = document.createElement("span");span.textContent = label;columns.append(span); });
        list.append(columns);container.append(chart, list);
        view = { container: container, chart: chart, list: list, rows: {}, segments: {} };this.contributionViews[id] = view;
      }
      if (generator) {
        view.container.hidden = s.generators.owned.lte(0) && !reveal;
        show("stats-contribution-empty", !profile.active);
        text("stats-contribution-total", number(profile.output) + " Energy / sec");
        text("stats-contribution-empty", s.speed.eq(0) && s.generators.owned.gt(0) ? "Timed production is paused. Resume game time to see active contributions." : "No generator Energy yet. Contributions appear as production begins.");
      }
      view.chart.classList.toggle("is-inactive", !profile.active);
      Object.keys(view.rows).forEach(function (id) {
        if (!profile.entries.some(function (entry) { return entry.id === id; })) { view.rows[id].root.hidden = true;view.segments[id].hidden = true; }
      });
      profile.entries.forEach(function (entry) {
        let node = view.rows[entry.id], segment = view.segments[entry.id];
        if (!node) {
          node = makeRow(entry, false);view.rows[entry.id] = node;view.list.append(node.root);
          segment = document.createElement("span");segment.className = "contribution-segment";view.chart.append(segment);view.segments[entry.id] = segment;
          node.root.addEventListener("mouseenter", function () { segment.classList.add("is-highlighted"); });
          node.root.addEventListener("mouseleave", function () { segment.classList.remove("is-highlighted"); });
          node.root.addEventListener("focusin", function () { segment.classList.add("is-highlighted"); });
          node.root.addEventListener("focusout", function () { segment.classList.remove("is-highlighted"); });
        }
        const visible = reveal || entry.id === "base" || entry.id === "speed" && s.timeRelevant || entry.id === "fluct" && s.fluct.owned.gt(0) || entry.id === "oscillation" && s.dynamics.owned5.gt(0) || !entry.factor.eq(1) && entry.id !== "speed";
        node.root.hidden = !visible;
        const color = entry.share < 0 ? "slowdown" : entry.color;
        node.root.dataset.color = color;segment.dataset.color = color;
        node.root.classList.toggle("is-slowdown", entry.share < 0);
        set(node.share, profile.active ? shareLabel(entry.share) : "—");
        const effect = entry.base ? number(entry.factor) + (generator ? " base / sec" : " base / click") : multiplier(entry.factor);
        set(node.effect, effect);
        segment.style.height = (Math.abs(entry.share) * 100) + "%";
        segment.style.flex = Math.abs(entry.share) + " 1 0px";
        segment.hidden = !visible || !profile.active || entry.share === 0;
        segment.title = entry.label + " · " + shareLabel(entry.share) + " · " + effect;
        if (entry.children) {
          Game.StatsUI.renderChildren(node, entry, profile, s, reveal, generator);
        }
      });
    },

    render: function (reveal) {
      if (this.page==="condense") { this.renderHistory();return; }
      const s = Game.ProductionStats.snapshot(), p = Game.player, a = s.achievements;
      const hasFluct = Game.Challenges.produces("quantumFluctuation") && s.fluct.owned.gt(0), hasCoherence = Game.Coherence.discovered();
      const hasField = p.unlocks.fieldExcitation || s.field.owned.gt(0) || s.field.accumulated.gt(0);
      const showTime = reveal || s.time.level > 0, showSpeed = reveal || s.timeRelevant;
      text("stats-click-total", number(s.clicks.total));
      const advancesTime = Game.Progression.hasSkill("1-2-1");
      text("stats-click-total-label", advancesTime ? "Direct Energy per click" : "Energy per click");
      show("stats-click-time-step", advancesTime || Game.Progression.hasSkill("1-4-1") || reveal);
      let clickNote = advancesTime ? "1-2-1 · Each manual click also advances all generators by 0.33 game seconds. Timed Energy and resources are produced through their normal cycles, replacing Captured instant's Energy-only payout." : "1-2-1 · Locked: manual clicks do not advance generator time.";
      if (Game.Progression.hasSkill("1-4-1")) clickNote += " 1-4-1 · Additional per click: +" + number(s.clicks.echo.energy) + " Energy, +" + number(s.clicks.echo.quantumResonance) + " Quantum Resonance, +" + number(s.clicks.echo.energyResonance) + " Energy Resonance, +" + number(s.clicks.echo.baseGrowth) + " Gen 1 base growth"+(Game.Symmetry.unlocked()?", +"+number(s.clicks.echo.symmetry.mul(100))+"% Symmetry":"")+". Fractional Resonance is retained.";
      text("stats-click-time-step", Game.Challenges.clicksAllowed()?clickNote:"Hands off challenge · clicks and their Energy, resource and time rewards are disabled.");
      text("stats-generator-total", number(s.generators.perRealSecond));
      this.renderContributions(s, "generators", reveal);
      this.renderContributions(s, "clicks", reveal);
      show("stats-clock-note", showSpeed);
      text("stats-clock-note", s.speed.eq(0) ? "Game speed ×0 · Timed production is paused. Click Energy remains available." : "Game speed " + multiplier(s.speed) + " · Cycle durations are in game seconds. Generator Energy/sec uses real seconds.");
      show("stats-empty", !reveal && !Game.CONFIG.GENERATORS.some(function (gen) { return Game.Energy.getOwned(gen.id).gt(0); }));

      text("stats-click-base", increase(s.clicks.base));
      show("stats-disturb-row", reveal || p.upgrades.clickPower.gt(0) || Game.UI.isUnlocked(Game.CONFIG.CLICK_UPGRADE));
      text("stats-disturb-level", "· " + number(p.upgrades.clickPower, 0) + " levels");
      text("stats-click-disturb", increase(s.clicks.disturb));
      text("stats-click-base-total", number(s.clicks.baseTotal));
      show("stats-first-sparks-row", reveal || Game.Progression.achievementUnlocked());
      show("stats-first-generator-row", reveal || Game.Progression.firstGeneratorAchievementUnlocked());
      text("stats-first-sparks", multiplier(a.firstSparks));
      text("stats-first-generator", multiplier(a.firstGenerator));
      ["click","generator"].forEach(function (kind) {
        const factor=(kind==="click"?a.discoveryClicks:a.discoveryGenerators).mul(a.discoveryEnergy);
        show("stats-"+kind+"-discoveries-row",reveal||!factor.eq(1));text("stats-"+kind+"-discoveries",multiplier(factor));
      });
      show("stats-click-time-row", showTime);
      text("stats-click-time", multiplier(s.time.multiplier));
      show("stats-click-skill-row", reveal || Game.Progression.hasSkill("1-1"));
      text("stats-click-skill", multiplier(s.prestige.clickMultiplier));
      ["click", "generator"].forEach(function (kind) {
        show("stats-" + kind + "-continuum-row", reveal || Game.Progression.hasSkill("4-2"));
        text("stats-" + kind + "-continuum", multiplier(s.prestige.energyMultiplier));
        show("stats-" + kind + "-memory-row", reveal || Game.Progression.hasSkill("0-0"));
        text("stats-" + kind + "-memory", multiplier(s.prestige.condenseMemory));
      });
      ["click", "generator"].forEach(function (kind) {
        show("stats-" + kind + "-condense-row", reveal || Game.Progression.condenseAchievementUnlocked());
        text("stats-" + kind + "-condense", multiplier(a.condense));
        show("stats-" + kind + "-quanta-row", reveal || Game.Progression.bonusQuanta().gt(0));
        text("stats-" + kind + "-quanta", multiplier(s.prestige.multiplier)+(Game.Progression.quantaBonusState().active?" · soft-capped":""));
      });
      show("stats-click-fluct-row", reveal || hasFluct);
      text("stats-click-fluct", multiplier(s.fluct.multiplier));
      text("stats-click-bonus", multiplier(s.clicks.bonus));
      show("stats-click-captured-row", !advancesTime && (reveal || Game.Progression.hasSkill("1-2")));
      text("stats-click-captured", increase(s.clicks.captured));
      text("stats-click-result", number(s.clicks.total));

      show("stats-generators-section", reveal || s.generators.owned.gt(0));
      text("stats-generator-ownership", number(s.generators.purchased, 0) + " purchased + " + number(s.generators.added, 0) + " added = " + number(s.generators.owned, 0) + " total");
      text("stats-generator-base", number(s.generators.baseRate));
      show("stats-field-base-row", reveal || Boolean(hasField));
      text("stats-generator-field", increase(s.generators.fieldBonus));
      show("stats-purchased-base-row", reveal || Game.Progression.hasSkill("1-3-1"));
      text("stats-generator-purchased-base", multiplier(s.generators.purchasedMultiplier));
      show("stats-generator-count-row", reveal || Game.Progression.hasSkill("1-3-2"));
      text("stats-generator-count", multiplier(s.generators.countMultiplier) + " · " + number(s.generators.effective, 2) + " effective units");
      show("stats-generator-focus-row", reveal || Game.Progression.hasSkill("3-3"));
      text("stats-generator-focus", multiplier(s.generators.focus));
      text("stats-generator-unit", number(s.generators.perUnit));
      text("stats-generator-base-total", number(s.generators.baseTotal));
      show("stats-growing-engine-row", reveal || Game.Progression.growingEngineAchievementUnlocked());
      show("stats-coherent-beginning-row", reveal || Game.Progression.coherentAchievementUnlocked());
      text("stats-growing-engine", multiplier(a.growingEngine));
      text("stats-coherent-beginning", multiplier(a.coherentBeginning));
      show("stats-generator-time-row", showTime);
      text("stats-generator-time", multiplier(s.time.multiplier));
      document.querySelectorAll(".stats-time-tier").forEach(function (node) {
        const label = "· tier " + number(s.time.level, 0);
        if (node.textContent !== label) node.textContent = label;
      });
      show("stats-generator-fluct-row", reveal || hasFluct);
      text("stats-generator-fluct", multiplier(s.fluct.multiplier));
      text("stats-generator-bonus", multiplier(s.generators.bonus));
      show("stats-generator-game-row", showSpeed);
      text("stats-generator-game", number(s.generators.perGameSecond));
      show("stats-speed-row", showSpeed);
      text("stats-speed", multiplier(s.speed));
      text("stats-generator-result", number(s.generators.perRealSecond));
      text("stats-generator-cadence", s.generators.smooth ? "Smooth production · 25 or more units owned." : "Independent timers · each unit pays " + number(s.generators.burstPerUnit) + " Energy every " + number(s.generators.burstInterval) + "s at current bonuses.");

      show("stats-fluct-section", reveal || hasFluct);
      text("stats-fluct-owned", number(s.fluct.owned, 0));
      text("stats-fluct-state", hasFluct ? (s.fluct.positive ? "Reinforcement" : "Interference") : "Inactive");
      document.getElementById("stats-fluct-section").classList.toggle("is-negative", hasFluct && !s.fluct.positive);
      text("stats-fluct-current", multiplier(s.fluct.multiplier));
      text("stats-fluct-timer", hasFluct ? number(s.fluct.remaining) + "s" : "Requires an owned unit");
      text("stats-fluct-source", hasCoherence ? "Owned Quantum Fluctuations and Quantum Resonance set Fluct's strength. The current effect is included once in each Energy breakdown above." : "Owned Quantum Fluctuations set Fluct's strength. The current effect is included once in each Energy breakdown above.");
      show("stats-fluct-formula", reveal);
      text("stats-fluct-formula", Game.Energy.fluctFormulaText());
      show("stats-fluct-odds-row", reveal || Game.Progression.fluctOddsVisible());
      const chance = Math.max(0, Math.min(1, s.fluct.rules.positiveChance));
      text("stats-fluct-odds", (chance * 100).toFixed(1) + "% / " + ((1 - chance) * 100).toFixed(1) + "%");

      show("stats-coherence-section", reveal || hasCoherence);
      text("stats-coherence-owned", number(s.coherence.owned, 0));
      text("stats-coherence-bonus", multiplier(s.coherence.bonus));
      text("stats-quantum-output", increase(s.coherence.perCycle));
      text("stats-resonance-output", increase(s.coherence.perCycle) + (Game.Progression.hasSkill("2-4-1") ? " · plus matching ER on each QR cycle" : ""));
      text("stats-quantum-interval", number(s.coherence.quantumInterval) + "s");
      text("stats-resonance-interval", number(s.coherence.energyInterval) + "s");
      text("stats-quantum-held", number(s.coherence.quantum, 0));
      text("stats-resonance-added", number(s.coherence.energy, 0));
      show("stats-softcap-row", reveal || s.coherence.softcap.active);
      text("stats-quantum-softcap", s.coherence.softcap.active ? "Active" : "Inactive");
      show("stats-effective-row", reveal);
      show("stats-exponent-row", reveal);
      text("stats-effective-quantum", number(s.coherence.softcap.effective));
      text("stats-quantum-exponent", "^" + number(s.coherence.softcap.power, 2));

      show("stats-field-section", reveal || Boolean(hasField));
      text("stats-field-owned", number(s.field.owned, 0));
      text("stats-field-base", increase(s.field.baseIncrease) + " / sec");
      text("stats-field-bonus", multiplier(s.field.bonus));
      show("stats-field-purchased-row", reveal || Game.Progression.hasSkill("4-3-3"));
      text("stats-field-purchased", multiplier(s.field.purchasedMultiplier));
      show("stats-auto-clicks", reveal || Game.Progression.hasSkill("1-2-2"));
      text("stats-auto-clicks", "1-2-2 · " + number(p.stats.autoClicks, 0) + " automatic clicks this run · " + (Game.Energy.autoClickEligible() ? "next in " + number(Game.Energy.autoClickRemaining(), 2) + " game seconds" : "waiting for Disturb to reach its maximum") + ". Automatic clicks apply the same output and time effects as manual clicks.");
      text("stats-field-output", increase(s.field.perCycle) + " / sec");
      text("stats-field-interval", number(s.field.interval) + "s" + (Game.Progression.hasSkill("2-4-2") ? " · +15s cycle progress per QR cycle" : ""));
      text("stats-field-accumulated", increase(s.field.accumulated) + " / sec");
      show("stats-dynamics-section", reveal || s.dynamics.owned5.gt(0) || s.dynamics.owned6.gt(0) || s.dynamics.owned7.gt(0));
      text("stats-oscillation-phase", number(s.dynamics.phase, 1) + " / " + s.dynamics.rules.cycle + "s");
      text("stats-oscillation-current", multiplier(s.dynamics.multiplier));
      text("stats-oscillation-peak", multiplier(s.dynamics.peak));
      text("stats-field-resonance", multiplier(s.dynamics.resonance) + (Game.Progression.hasSkill("3-5-1") || Game.Progression.hasSkill("3-5-2") ? " · " + number(Game.Energy.getProductionCount("fieldResonance"),2) + " effective Gen 6 (QR ×" + number(Game.Energy.resonanceCountMultiplier(),3) + ", +" + number(Game.Energy.getSharedResonance(),0) + " from Gen 7)" : ""));
      text("stats-field-coupling", increase(s.dynamics.coupled) + " effective Gen 4 units");
    }
  };
})(window.CosmicIdle);
