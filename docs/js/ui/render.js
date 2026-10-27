(function (Game) {
  const elements = Object.create(null);
  function byId(id) { return elements[id] || (elements[id] = document.getElementById(id)); }
  function setText(node, value) { value = String(value);if (node.textContent !== value) node.textContent = value; }

  Game.UI = {
    views: ["energy", "prestige", "achievements", "stats", "lore", "challenges", "automation", "settings"],
    generatorNodes: {},
    buyAmount: 1,

    selectView: function (name, focusTab) {
      document.body.classList.toggle("condense-active", name === "prestige");
      document.body.classList.toggle("achievements-active", name === "achievements");
      document.body.classList.toggle("stats-active", name === "stats");
      document.body.classList.toggle("challenges-active", name === "challenges");
      document.body.classList.toggle("automation-active", name === "automation");
      if (name !== "energy") Game.FieldWaves.clear();
      this.views.forEach(function (view) {
        const active = view === name;
        const tab = byId(view + "-tab");
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        byId(view + "-view").hidden = !active;
        if (active && focusTab) tab.focus();
      });
      Game.Tooltips.hide();
      Game.PrestigeUI.hideDetails();
      Game.TreeCamera.setActive(name === "prestige" && !Game.player.ui.skillTree2D);
      this.render();
    },

    notifyAchievement: function (name, reward) {
      Game.Experience.enqueue({ kind: "Achievement unlocked", title: name || "First sparks", text: reward || "×" + Game.CONFIG.CLICK_ACHIEVEMENT.multiplier + " Energy per click" });
    },
    autoClickFeedback: function () {
      if (Game.Loop && Game.Loop.catchingUp) return;
      Game.Audio.play("autoClick");
      if (!document.hidden && !byId("energy-view").hidden) this.flashEnergy({automated:true});
    },

    isUnlocked: function (definition) {
      if (false) return true;
      if (definition.id && !Game.Energy.generatorEnabled(definition)) return false;
      const cost = definition.id ? Game.Energy.getGeneratorCost(definition) : Game.Progression.upgradeCost();
      return Game.player.resources.energy.gte(cost);
    },

    syncCollapseState: function () {
      document.querySelectorAll("details[data-collapse]").forEach(function (details) {
        details.open = !Game.player.ui.collapsed[details.dataset.collapse];
      });
      document.querySelectorAll("[data-category]").forEach(function (panel) {
        const collapsed = Boolean(Game.player.ui.collapsed[panel.dataset.category]);
        panel.classList.toggle("is-compact", collapsed);
        panel.querySelector(".category-toggle").setAttribute("aria-expanded", String(!collapsed));
      });
    },

    fluctuationFeedback: function () {
      if (Game.Loop && Game.Loop.catchingUp) return;
      Game.Audio.play("fluctuation");
      if (byId("energy-view").hidden || document.hidden) return;
      this.flashEnergy({ generator: true, fluctuation: true });
    },
    resonanceFeedback: function (kind) {
      if (Game.Loop && Game.Loop.catchingUp) return;
      Game.Audio.play(kind);
      if (byId("energy-view").hidden || document.hidden) return;
      this.flashEnergy({ generator: true, resonance: kind });
    },
    fieldFeedback: function () {
      if (Game.Loop && Game.Loop.catchingUp) return;
      Game.Audio.play("fieldExcitation");
      const owned = Game.Energy.getOwned("fieldExcitation"), config = Game.CONFIG.FIELD_EXCITATION;
      if (owned.lt(config.waveSmoothAt)) Game.FieldWaves.play(Decimal.min(config.maxWaves, owned.mul(config.wavesPerCycle)).toNumber());
    },
    dynamicsFeedback: function (kind) {
      if (Game.Loop && Game.Loop.catchingUp) return;
      Game.Audio.play(kind);
      if (!byId("energy-view").hidden && !document.hidden) this.flashEnergy({ generator: true, dynamics: kind });
    },
    streamFieldWaves: function (gameDelta) {
      Game.FieldWaves.stream(gameDelta);
    },
    generatorSparkBudget: 0,
    streamGeneratorSparks: function (gen, owned, gameDelta) {
      if (Game.Loop && Game.Loop.catchingUp) { this.generatorSparkBudget = 0; return; }
      // Preserve five sparks per generator cycle at 25; cap automatic feedback at 12/sec.
      const rate = Decimal.min(12, owned.mul(gen.sparksPerBurst).div(Game.Energy.burstInterval(gen)).mul(Game.Time.getGameSpeed()));
      if (Game.Time.getGameSpeed().lte(0)) return;
      const realDelta = gameDelta.div(Game.Time.getGameSpeed());
      this.generatorSparkBudget = Math.min(6, this.generatorSparkBudget + rate.mul(realDelta).toNumber());
      const count = Math.floor(this.generatorSparkBudget);
      this.generatorSparkBudget -= count;
      this.flashGeneratorBurst(count);
    },
    flashGeneratorBurst: function (count) {
      if (Game.Loop && Game.Loop.catchingUp) return;
      if (count > 0) Game.Audio.play("generator");
      if (byId("energy-view").hidden || document.hidden) return;
      for (let i = 0; i < count; i++) {
        this.flashEnergy({ generator: true });
      }
    },
    visualPosition: function (width, height) {
      const insetX = Math.min(16, width * .08), insetY = Math.min(16, height * .08);
      return { x: insetX + Math.random() * (width - insetX * 2), y: insetY + Math.random() * (height - insetY * 2) };
    },
    flashEnergy: function (event) {
      if (!Game.player.settings.visuals) return;
      const field = byId("energy-field");
      const bounds = field.getBoundingClientRect();
      const spark = document.createElement("span");
      spark.className = "energy-spark" + (event.generator ? " generator-spark" : "") + (Game.player.settings.visuals === 1 ? " abstract-energy" : "");
      if (event.automated) spark.classList.add("automatic-impulse");
      if (event.fluctuation) spark.classList.add("fluctuation-wave", Game.player.fluctuation.positive ? "fluct-positive" : "fluct-negative");
      if (event.resonance) spark.classList.add("coherence-pulse", event.resonance === "quantumResonance" ? "quantum-resonance-pulse" : "energy-resonance-pulse");
      if (event.dynamics) spark.classList.add("dynamics-pulse", event.dynamics);
      const appearance = Game.Progression.sparkAppearance();
      spark.style.setProperty("--spark-size", appearance.size + "px");
      spark.style.setProperty("--spark-opacity", appearance.opacity * (Game.player.settings.visuals === 1 ? .16 : 1));
      const position = this.visualPosition(bounds.width, bounds.height);
      spark.style.left = position.x + "px";
      spark.style.top = position.y + "px";
      const effects = byId("energy-effects");
      // Bound the effect count while allowing quick clicks to overlap.
      if (effects.children.length >= 160) effects.firstElementChild.remove();
      effects.appendChild(spark);
      setTimeout(function () { spark.remove(); }, (event.resonance || event.dynamics) ? 2200 : event.fluctuation ? 1600 : 700);
    },

    init: function () {
      Game.Icons.init();
      Game.AutomationUI.init();
      Game.AchievementsUI.init();
      Game.PrestigeUI.init();
      Game.StatsUI.init();
      this.views.forEach(function (view) {
        const tab = byId(view + "-tab");
        tab.addEventListener("click", function () { Game.UI.selectView(view); });
        tab.addEventListener("keydown", function (event) {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const views = Game.UI.views;
            const index = views.indexOf(view);
            const target = event.key === "Home" ? views[0] : event.key === "End" ? views[views.length - 1] : views[(index + (event.key === "ArrowRight" ? 1 : views.length - 1)) % views.length];
            Game.UI.selectView(target, true);
          }
        });
      });
      document.querySelectorAll("[data-buy-amount]").forEach(function (button) {
        button.addEventListener("click", function () {
          Game.UI.buyAmount = this.dataset.buyAmount;
          document.querySelectorAll("[data-buy-amount]").forEach(function (option) {
            option.setAttribute("aria-pressed", String(option === button));
          });
          Game.UI.render();
        });
      });
      const list = byId("generator-list");
      list.innerHTML = "";

      Game.CONFIG.GENERATORS.forEach(function (gen) {
        const card = document.createElement("details");
        card.className = "generator-card";
        card.dataset.generator = gen.id;
        card.dataset.collapse = gen.id;
        card.open = true;
        const formula = gen.type === "fluctuation" ? Game.Energy.fluctFormulaText() : "";
        card.innerHTML = [
          "<summary><h3" + (formula ? " class='info-heading' data-tip='fluctFormula'" : "") + ">" + Game.Icons.svg(gen.id) + gen.name + "</h3>",
          formula ? "<button class='info-term formula-hint' data-tip='fluctFormula' aria-label='Fluct formula'>?</button>" : "",
          "<button class='collapsed-buy' data-buy-collapsed>Buy</button></summary>",
          "<p data-description>" + (gen.type === "oscillation" ? "Exponentially strengthens all Energy over 55s, holds its peak for 5s, then restarts." : gen.type === "resonance" ? "Each unit multiplies Field Oscillation's peak by ×1.025." : gen.type === "coupling" ? "Every Disturb level adds one effective Field Excitation per owned unit." : gen.type === "fluctuation" ? "Fluct shifts all Energy gains, alternating between reinforcement and interference." : gen.type === "field" ? "Every cycle permanently strengthens the base Energy rate of every Energy Disturbance." : gen.type === "coherent" ? "Produces Quantum Resonance to strengthen Fluct and Energy Resonance to create Energy Disturbances." : "Base production: " + (gen.burstInterval ? Game.Format.number(gen.burstProduction) + " Energy every " + gen.burstInterval + "s each" : Game.Format.number(gen.production) + " Energy/sec each")) + "</p>",
          "<p data-scaling hidden></p>",
          "<p data-formula hidden>" + formula + "</p>",
          "<p data-odds hidden></p>",
          gen.type === "oscillation" ? "<div class='oscillation-controls' hidden><button data-freeze aria-pressed='false'>Freeze before peak: OFF</button><button data-release hidden>Release peak</button></div>" : "",
          "<div class='generator-meta'>",
          "<strong data-owned>Owned: 0</strong>",
          "<span data-production class='muted'>Producing 0/sec</span>",
          "<button data-buy>Buy — 0 Energy</button>",
          "</div>"
        ].join("");

        Game.Tooltips.enrich(card.querySelector("[data-description]"));
        if (gen.type === "oscillation") {
          card.querySelector("[data-freeze]").addEventListener("click", function () { Game.FieldDynamics.toggleFreeze(); });
          card.querySelector("[data-release]").addEventListener("click", function () { Game.FieldDynamics.releasePeak();Game.Save.save();Game.UI.render(); });
        }
        const button = card.querySelector("[data-buy]");
        const collapsedButton = card.querySelector("[data-buy-collapsed]");
        [button, collapsedButton].forEach(function (purchaseButton) {
          const number=Game.CONFIG.GENERATORS.indexOf(gen)+1;
          if (number<=10) purchaseButton.title="Buy Gen "+number+" · hotkey "+(number===10?0:number)+" in the Energy tab · uses selected buy amount";
          purchaseButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            Game.Energy.buyGenerator(gen.id, Game.UI.buyAmount);
            Game.UI.render();
          });
        });

        Game.UI.generatorNodes[gen.id] = {
          card: card,
          owned: card.querySelector("[data-owned]"),
          description: card.querySelector("[data-description]"),
          production: card.querySelector("[data-production]"),
          scaling: card.querySelector("[data-scaling]"),
          formula: card.querySelector("[data-formula]"),
          odds: card.querySelector("[data-odds]"),
          buy: button,
          collapsedBuy: collapsedButton
        };

        list.appendChild(card);
      });

      Game.Tooltips.init();
      Game.FieldWaves.init();
      document.querySelectorAll("[data-category-toggle]").forEach(function (button) {
        button.addEventListener("click", function () {
          const key = this.dataset.categoryToggle;
          Game.player.ui.collapsed[key] = Number(!Game.player.ui.collapsed[key]);
          Game.UI.syncCollapseState();
          Game.Save.save();
        });
      });
      this.syncCollapseState();
      document.querySelectorAll("details[data-collapse]").forEach(function (details) {
        details.addEventListener("toggle", function () {
          const collapsed = Number(!this.open);
          if (Game.player.ui.collapsed[this.dataset.collapse] !== collapsed) {
            Game.player.ui.collapsed[this.dataset.collapse] = collapsed;
            Game.Save.save();
          }
        });
      });
      byId("energy-field").addEventListener("click", function (event) {
        if (!Game.Challenges.clicksAllowed()) return;
        Game.Audio.play("click");
        Game.UI.flashEnergy(event);
        Game.Energy.generateManual();
        Game.UI.render();
      });
      document.addEventListener("keydown", function (event) {
        if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !/^[0-9]$/.test(event.key)) return;
        if (byId("energy-view").hidden || document.querySelector("dialog[open]") || event.target.closest && event.target.closest("input,textarea,select,[contenteditable]:not([contenteditable=false])")) return;
        const index=event.key==="0"?9:Number(event.key)-1, gen=Game.CONFIG.GENERATORS[index];
        if (!gen || !(Game.UI.isUnlocked(gen) || Game.Energy.getOwned(gen.id).gt(0))) return;
        event.preventDefault();Game.Energy.buyGenerator(gen.id,Game.UI.buyAmount);Game.UI.render();
      });
      byId("energy-field").addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!event.repeat) this.click();
        }
      });
      ["buy-click-upgrade", "buy-click-upgrade-collapsed"].forEach(function (id) {
        byId(id).addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          Game.Progression.buyClickUpgrade(Game.UI.buyAmount);
          Game.UI.render();
        });
      });
      byId("save-button").addEventListener("click", function () { Game.Save.save(true); });
      byId("export-button").addEventListener("click", function () { Game.Save.exportSave(); });
      byId("import-button").addEventListener("click", function () { Game.Save.importSave(); });
      byId("reset-button").addEventListener("click", function () { Game.Save.hardReset(); });
    },

    updateCompactBuy: function (compact, full, name) {
      const label = full.textContent.replace(" — ", "\n").replace(" Energy", " E");
      if (compact.textContent !== label) compact.textContent = label;
      compact.disabled = full.disabled;
      compact.setAttribute("aria-label", name + ": " + full.textContent);
    },

    setSaveStatus: function (message) {
      setText(byId("save-status"), message);

    },

    render: function () {
      const p = Game.player;
      if (Game.PotentialBubble) Game.PotentialBubble.update();
      Game.AutomationUI.render();
      Game.FieldExcitation.checkUnlock();
      setText(byId("existence-state"), Game.Energy.getOwned("fieldExcitation").gt(0) ? "Excited" : "Dormant");
      setText(byId("existence-structure"), p.lore.fieldSecondSeen ? "Fields" : "None");
      const production = Game.Energy.getProductionPerSecond();
      byId("energy-field").classList.toggle("is-resonant", Game.Energy.getOwned("energyDisturbance").gte(25));
      setText(byId("energy-display"), Game.Format.number(p.resources.energy));
      setText(byId("center-energy"), p.resources.energy.lt(1000) ? p.resources.energy.toNumber().toFixed(2) : Game.Format.number(p.resources.energy));
      Game.Experience.updateLore();
      setText(byId("energy-rate"), "+" + Game.Format.number(production.mul(Game.Time.getGameSpeed())) + " / sec (average)");
      const focus = Game.Progression.generatorFocus();
      byId("generator-focus-status").hidden = !focus.active;
      setText(byId("generator-focus-status"), focus.active ? "Rhythm · " + focus.generators.map(function (gen) { return "Gen " + (Game.CONFIG.GENERATORS.indexOf(gen)+1); }).join(" + ") + " ×" + Game.Format.number(focus.multiplier, 2) + " · " + Game.Format.number(focus.remaining, 1) + "s" : "");
      byId("generator-focus-status").title = focus.active ? "Wandering rhythm · " + focus.generators.map(function (gen) { return gen.name; }).join(" + ") : "";
      if (!document.body.classList.contains("condense-active")) Game.CONFIG.GENERATORS.forEach(function (gen) {
        const node = Game.UI.generatorNodes[gen.id];
        const owned = Game.Energy.getOwned(gen.id);
        node.card.classList.toggle("has-wandering-rhythm", Game.Progression.generatorFocusMultiplier(gen.id).gt(1));
        node.card.hidden = !(Game.UI.isUnlocked(gen) || owned.gt(0));
        const quote = Game.Energy.quoteGenerator(gen.id, Game.UI.buyAmount);
        const genProduction = Game.Energy.getGeneratorProduction(gen);
        let ownershipText = "Purchased: " + Game.Format.number(p.generators[gen.id].purchased, 0) + " + " + Game.Format.number(p.generators[gen.id].added, 0) + " added" + (gen.type === "field" && Game.Energy.getCoupledFields().gt(0) ? " + " + Game.Format.number(Game.Energy.getCoupledFields(), 0) + " coupled" : "") + " · Total: " + Game.Format.number(owned, 0);
        if (gen.id === "energyDisturbance" && Game.Progression.hasSkill("1-3-2")) ownershipText += " · Effective: " + Game.Format.number(Game.Energy.getProductionCount(gen.id), 2);
        if (gen.type === "resonance" && Game.Energy.getSharedResonance().gt(0)) ownershipText += " · +" + Game.Format.number(Game.Energy.getSharedResonance(),0) + " from purchased Gen 7";
        if (gen.type === "resonance" && Game.Progression.hasSkill("3-5-1")) ownershipText += " · QR ×" + Game.Format.number(Game.Energy.resonanceCountMultiplier(),3) + " · Effective: " + Game.Format.number(Game.Energy.getProductionCount(gen.id),2);
        if (gen.id === "energyDisturbance" && Game.Progression.hasSkill("1-5-1")) ownershipText += " · Double in " + Game.Format.number(Game.Energy.replicationRemaining(),1) + "s · interval " + Game.Format.number(Game.Energy.replicationInterval(),0) + "s";
        if (Game.Progression.generatorFocusMultiplier(gen.id).gt(1)) ownershipText += " · Wandering rhythm ×" + Game.Format.number(focus.multiplier, 2);
        setText(node.owned, ownershipText);
        node.scaling.hidden = !false;
        node.formula.hidden = !(false && gen.type === "fluctuation");
        node.odds.hidden = !(gen.type === "fluctuation" && (false || Game.Progression.fluctOddsVisible()));
        setText(node.scaling, "Cost scaling ×" + Game.Format.number(Game.Energy.getGeneratorScaling(gen), 5) + " · +" + (gen.scalingStepIncrease || Game.CONFIG.GENERATOR_SCALING.stepIncrease) + " every " + (gen.scalingStepLevels || Game.CONFIG.GENERATOR_SCALING.stepLevels) + " purchased");
        if (gen.type === "oscillation") {
          const dynamics = Game.FieldDynamics.rules();
          const description = "Exponentially strengthens all Energy over " + dynamics.rise + "s, holds its peak for " + Game.D(dynamics.cycle).sub(dynamics.rise).toString() + "s, then restarts." + (Game.Progression.hasSkill("3-2-2") ? " Peak bonus and countdown pause during negative Fluct." : " Total cycle: " + dynamics.cycle + "s.");
          if (node.description.textContent !== description) node.description.textContent = description;
          const oscillationText = Game.FieldDynamics.peakPaused() ? "All Energy ×1 · peak paused during negative Fluct · " + Game.Format.number(Game.D(dynamics.cycle).sub(p.fieldDynamics.elapsed), 2) + "s peak time remaining" : Game.FieldDynamics.held() ? "All Energy ×" + Game.Format.number(Game.FieldDynamics.multiplier(), 5) + " · frozen 0.25s before peak · click the field or Release peak when ready" : "All Energy ×" + Game.Format.number(Game.FieldDynamics.multiplier(), 5) + " · peak ×" + Game.Format.number(Game.FieldDynamics.peak(), 5) + " · " + (p.fieldDynamics.elapsed.lt(dynamics.rise) ? "rising · peak in " : "holding · restart in ") + Game.Format.number(Game.FieldDynamics.nextEventIn()) + "s";
          setText(node.production, oscillationText);
          const controls = node.card.querySelector(".oscillation-controls"), toggle = controls.querySelector("[data-freeze]"), release = controls.querySelector("[data-release]");
          controls.hidden = !(Game.Progression.hasSkill("3-2-1") || false);
          toggle.disabled = !Game.Progression.hasSkill("3-2-1");toggle.setAttribute("aria-pressed", String(Game.FieldDynamics.freezeEnabled()));
          setText(toggle, "Freeze before peak: " + (Game.FieldDynamics.freezeEnabled() ? "ON" : "OFF"));
          release.hidden = !Game.FieldDynamics.held();
        } else if (gen.type === "resonance") {
          const description = "Each effective Gen 6 (Field Resonance) reinforces the Oscillation peak by ×" + Game.FieldDynamics.rules().resonancePerUnit + ".";
          if (node.description.textContent !== description) { node.description.textContent = description;Game.Tooltips.enrich(node.description); }
          setText(node.production, "Oscillation peak ×" + Game.Format.number(Game.FieldDynamics.resonance(), 5) + " · " + (Game.FieldDynamics.active() ? "reinforcing" : "requires Field Oscillation"));
        } else if (gen.type === "coupling") {
          setText(node.production, "+" + Game.Format.number(Game.Energy.getCoupledFields(), 0) + " effective Field Excitations from " + Game.Format.number(p.upgrades.clickPower, 0) + " Disturb levels");
        } else if (gen.type === "fluctuation") {
          const fluctRules = Game.Modifiers.getFluctuationRules();
          const chance = Math.max(0, Math.min(1, fluctRules.positiveChance));
          const formulaText = Game.Energy.fluctFormulaText();
          setText(node.formula, formulaText);
          setText(node.odds, (chance * 100).toFixed(1) + "% positive / " + ((1 - chance) * 100).toFixed(1) + "% negative");
          let fluctText = "Fluct: ×" + Game.Format.number(Game.Energy.fluctMultiplier(), 5) + " to all Energy · next roll in " + Game.Format.number(Game.D(fluctRules.rollInterval).sub(p.fluctuation.elapsed)) + " game seconds";
          if (Game.Progression.hasSkill("2-1-2") && p.fluctuation.rollReductionStacks.gt(0)) fluctText += " · negative chain: " + Game.Format.number(p.fluctuation.rollReductionStacks, 0) + " · interval " + Game.Format.number(fluctRules.rollInterval, 5) + "s";
          setText(node.production, fluctText);
        } else if (gen.type === "coherent") {
          const output = owned.mul(Game.Progression.generatorMultiplier()).mul(Game.Progression.generatorFocusMultiplier(gen.id));
          const energyOutput=Game.Challenges.active(7)?Game.D(0):output;
          setText(node.production, Game.Format.number(output) + " Quantum Resonance / " + Game.Format.number(Game.Coherence.quantumInterval()) + "s · " + Game.Format.number(energyOutput) + " Energy Resonance / " + Game.Coherence.energyInterval().toString() + "s" + (Game.Progression.hasSkill("2-4-1") && !Game.Challenges.active(7) ? " · QR cycles also produce ER" : "") + (Game.Progression.hasSkill("2-4-2") ? " · each QR cycle advances Gen 4 by 15s" : ""));
        } else if (gen.type === "field") {
          setText(node.production, "+" + Game.Format.number(Game.FieldExcitation.boostPerCycle(), 5) + " base Energy/sec to Energy Disturbance every " + Game.FieldExcitation.interval().toString() + "s · next in " + Game.Format.number(Game.FieldExcitation.remaining()) + "s · accumulated base bonus +" + Game.Format.number(p.fieldExcitation.baseRateBonus, 5) + "/sec");
        } else if (gen.burstInterval && owned.lt(gen.smoothAt)) {
          const timers = p.generators[gen.id].burstTimers;
          const next = timers.length ? Game.Energy.burstInterval(gen).sub(timers.reduce(function (latest, timer) { return Decimal.max(latest, timer); }, Game.D(0))) : Game.Energy.burstInterval(gen).sub(p.generators[gen.id].burstElapsed);
          setText(node.production, Game.Format.number(Game.Energy.getBaseRate(gen).mul(Game.Energy.burstInterval(gen)).mul(Game.Energy.getCountMultiplier(gen.id)).mul(Game.Progression.generatorFocusMultiplier(gen.id)).mul(Game.Progression.generatorMultiplier()).mul(Game.Progression.energyMultiplier()).mul(Game.Energy.fluctMultiplier()).mul(Game.FieldDynamics.multiplier())) + " Energy each / " + Game.Energy.burstInterval(gen).toString() + "s · independent timers · next in " + Game.Format.number(next) + "s");
        } else {
          setText(node.production, "Producing " + Game.Format.number(genProduction.mul(Game.Time.getGameSpeed())) + "/sec" + (gen.burstInterval ? " · smooth flow (25+ owned)" : ""));
        }
        if (gen.id === "energyDisturbance") {
          const description = "Base production: " + Game.Format.number(Game.Energy.getBaseRate(gen).mul(Game.Energy.burstInterval(gen)), 5) + " Energy every " + Game.Energy.burstInterval(gen).toString() + "s each · " + Game.Format.number(Game.Energy.getBaseRate(gen), 5) + " Energy/sec average";
          if (node.description.textContent !== description) node.description.textContent = description;
        }
        setText(node.buy, quote.count.gt(0) ? "Buy " + Game.Format.number(quote.count, 0) + (quote.gain && quote.gain.gt(quote.count)?" → "+Game.Format.number(quote.gain,0)+" units":"") + " — " + Game.Format.number(quote.cost) + " Energy" : "Buy 1 — " + Game.Format.number(Game.Energy.getGeneratorCost(gen)) + " Energy");
        if (Game.Challenges.active() && !Game.Challenges.allowedGenerator(gen.id)) setText(node.buy,"Unavailable in this challenge");
        else if(Game.Challenges.purchaseLimit(gen.id)===0) setText(node.buy,"Challenge limit · 10 purchased");
        node.buy.disabled = quote.count.lte(0);
        Game.UI.updateCompactBuy(node.collapsedBuy, node.buy, gen.name);
      });

      byId("generator-empty").hidden = Game.CONFIG.GENERATORS.some(function (gen) {
        return !Game.UI.generatorNodes[gen.id].card.hidden;
      });
      const upgradeVisible = this.isUnlocked(Game.CONFIG.CLICK_UPGRADE) || p.upgrades.clickPower.gt(0);
      byId("click-upgrade").hidden = !upgradeVisible;
      byId("upgrade-empty").hidden = upgradeVisible;
      const rules = Game.Modifiers.getClickUpgradeRules();
      const capped = p.upgrades.clickPower.gte(rules.maxLevel);
      setText(byId("click-upgrade-level"), "Level " + Game.Format.number(p.upgrades.clickPower, 0) + " / " + rules.maxLevel.toLocaleString());
      const tier = Math.floor(p.upgrades.clickPower.toNumber() / rules.scalingStepLevels);
      const scale = Game.D(rules.initialScaling).add(Game.D(rules.scalingStepIncrease).mul(tier));
      const nextBreakpoint = Math.min(rules.maxLevel, (tier + 1) * rules.scalingStepLevels);
      byId("click-upgrade-scaling").hidden = !false;
      setText(byId("click-upgrade-scaling"), capped ? "Maximum level reached" : "Cost scaling ×" + Game.Format.number(scale) + (Game.D(rules.scalingStepIncrease).eq(0) ? " · constant" : " · next breakpoint: " + nextBreakpoint));
      setText(byId("click-upgrade-affordable"), "Can afford " + Game.Progression.affordableClickLevels() + " more now");
      byId("auto-click-status").hidden = !Game.Progression.hasSkill("1-2-2");
      setText(byId("auto-click-status"), capped ? "Self-sustaining impulse · click in " + Game.Format.number(Game.Energy.autoClickRemaining(), 1) + " game seconds" : "Self-sustaining impulse · max Disturb to activate");
      const clickQuote = Game.Progression.quoteClickUpgrade(this.buyAmount);
      setText(byId("buy-click-upgrade"), capped ? "Maxed" : clickQuote.count.gt(0) ? "Buy " + Game.Format.number(clickQuote.count, 0) + (clickQuote.gain.gt(clickQuote.count)?" → +"+Game.Format.number(clickQuote.gain,0)+" levels":"") + " — " + Game.Format.number(clickQuote.cost) + " Energy" : "Buy 1 — " + Game.Format.number(Game.Progression.upgradeCost()) + " Energy");
      byId("buy-click-upgrade").disabled = capped || clickQuote.count.lte(0);
      this.updateCompactBuy(byId("buy-click-upgrade-collapsed"), byId("buy-click-upgrade"), "Disturb");
      const resonanceVisible = false || Game.Coherence.discovered();
      byId("resonance-overview").hidden = !resonanceVisible;
      byId("energy-field").classList.toggle("has-resonance", resonanceVisible);
      setText(byId("quantum-resonance-display"), Game.Format.number(p.resources.quantumResonance, 0));
      setText(byId("energy-resonance-display"), Game.Format.number(p.resources.energyResonance, 0));
      const coherenceActive = Game.Energy.getOwned("coherentEnergy").gt(0);
      setText(byId("quantum-resonance-timer"), coherenceActive ? "Next in " + Game.Format.number(Game.Coherence.quantumRemaining()) + "s · interval " + Game.Format.number(Game.Coherence.quantumInterval()) + "s" : "Requires Coherent Energy");
      setText(byId("energy-resonance-timer"), coherenceActive ? "Next in " + Game.Format.number(Game.Coherence.energyRemaining()) + "s · interval " + Game.Coherence.energyInterval().toString() + "s" : "Requires Coherent Energy");
      byId("resonance-fluct-growth").hidden = !false;
      const quantumSoftcap = Game.Coherence.quantumSoftcapState();
      byId("quantum-resonance-softcap").hidden = !quantumSoftcap.active && !false;
      setText(byId("quantum-resonance-softcap").querySelector("button"), quantumSoftcap.active ? "Fluct effect soft-capped" : "Fluct soft cap inactive");
      setText(byId("resonance-fluct-growth"), "Fluct base: " + Game.Format.number(Game.Energy.fluctGrowth(), 6) + " · effective Resonance: " + Game.Format.number(quantumSoftcap.effective, 3) + " · exponent " + Game.Format.number(quantumSoftcap.power, 2) + (quantumSoftcap.next ? " · next at " + Game.Format.number(quantumSoftcap.next, 0) : " · final soft cap"));
      const fluct = Game.Energy.getOwned("quantumFluctuation");
      byId("fluct-display").hidden = fluct.lte(0);
      setText(byId("fluct-display"), "Fluct " + (p.fluctuation.positive ? "+" : "−") + " · ×" + Game.Format.number(Game.Energy.fluctMultiplier(), 5));
      setText(byId("music-stage"), "Eventide · " + ["Unformed tones", "Pentatonic notes · 10 clicks", "Harmonic layers · 25 purchased generators", "Interwoven tones · Quantum Fluctuation", "Resonance chords · Coherent Energy", "Field harmonics · Field Excitation"][Game.Audio.musicStage()]);
      setText(byId("click-gain"), "+" + Game.Format.number(Game.Energy.manualGain()) + (Game.Progression.hasSkill("1-2-1") ? " direct / click · +0.33s all generators" : " / click"));
      const achieved = Game.Progression.achievementUnlocked();
      byId("click-achievement").classList.toggle("unlocked", achieved);
      const firstGen = Game.Progression.firstGeneratorAchievementUnlocked(), twentyFive = Game.Progression.growingEngineAchievementUnlocked();
      const timeAchievement = Game.Playtime.state();
      const fiveMinutes = timeAchievement.level > 0;
      const coherent = Game.Progression.coherentAchievementUnlocked();
      Game.AchievementsUI.render(false);
      byId("coherent-achievement").classList.toggle("unlocked", coherent);
      setText(byId("coherent-achievement-status"), coherent ? "Unlocked" : "0 / 1 Coherent Energy");
      byId("five-minutes-achievement").classList.toggle("unlocked", fiveMinutes);
      const nextTimeLabel = Game.Playtime.tierLabel(timeAchievement.next);
      setText(byId("playtime-requirement"), "Reach " + nextTimeLabel);
      setText(byId("playtime-reward"), "×" + Game.Format.number(fiveMinutes ? timeAchievement.multiplier : timeAchievement.next.multiplier, 6) + " all Energy production");
      setText(byId("playtime-next-reward"), fiveMinutes ? "Next tier: ×" + Game.Format.number(timeAchievement.next.multiplier, 3) : "Rewards stack at every tier");
      setText(byId("five-minutes-status"), "Tier " + Game.Format.number(timeAchievement.level, 0) + (fiveMinutes ? " · Unlocked" : " · Locked") + " · " + Game.Playtime.elapsedLabel() + " / " + nextTimeLabel);
      byId("first-generator-achievement").classList.toggle("unlocked", firstGen);
      byId("twenty-five-achievement").classList.toggle("unlocked", twentyFive);
      setText(byId("first-generator-status"), firstGen ? "Unlocked" : "0 / 1 generators");
      setText(byId("twenty-five-status"), twentyFive ? "Unlocked" : Game.Format.number(p.generators.energyDisturbance.purchased, 0) + " / 25 Energy Disturbances");
      setText(byId("achievement-required"), Game.CONFIG.CLICK_ACHIEVEMENT.requiredClicks);
      setText(byId("achievement-reward"), "×" + Game.CONFIG.CLICK_ACHIEVEMENT.multiplier);
      const achievementText = achieved ? "Unlocked · ×" + Game.CONFIG.CLICK_ACHIEVEMENT.multiplier + " clicks" : Game.Format.number(p.stats.manualClicks, 0) + " / " + Game.CONFIG.CLICK_ACHIEVEMENT.requiredClicks + " clicks";
      if (byId("achievement-status").textContent !== achievementText) byId("achievement-status").textContent = achievementText;
      byId("generators-panel").hidden = byId("generator-empty").hidden === false;
      const percent = Game.Progression.milestoneProgress() * 100;
      byId("milestone-fill").style.width = percent + "%";
      byId("milestone-bar").setAttribute("aria-valuenow", percent.toFixed(2));
      byId("milestone-bar").setAttribute("aria-valuetext", percent.toFixed(1) + "% on a logarithmic scale");
      setText(byId("milestone-value"), Game.Format.number(p.resources.energy) + " / " + Game.Format.number(Game.CONFIG.PROGRESSION.prestigeEnergy) + " held Energy");
      setText(byId("milestone-caption"), percent >= 100 ? "Condense Energy available · +" + Game.Format.number(Game.Prestige.reward(), 0) + " Primordial Quanta" : percent.toFixed(1) + "% · Logarithmic scale");
      Game.PrestigeUI.render(false);
      setText(byId("tps-display"), Game.CONFIG.SIMULATION_TPS);
      const timeRelevant = !Game.Time.getGameSpeed().eq(1) || p.time.gamePlayed.sub(p.time.realPlayed).abs().gt(.01);
      byId("game-speed-stat").hidden = !false && !timeRelevant;
      byId("game-time-stat").hidden = !false && !timeRelevant;
      setText(byId("game-speed-display"), Game.Format.number(Game.Time.getGameSpeed()) + "×");
      setText(byId("real-time-display"), Game.Format.duration(p.time.realPlayed));
      setText(byId("game-time-display"), Game.Format.duration(p.time.gamePlayed));
      if (!byId("stats-view").hidden) Game.StatsUI.render(false);
      Game.AutomationUI.renderBanner();
    }
  };
})(window.CosmicIdle);
