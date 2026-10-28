(function (Game) {
  const entries = {
    lateEnergy:{title:'Late Energy resistance',text:'After 1e1000, each ten-exponent band adds more resistance to existing Energy production. Existing bonuses and achievements still contribute, but their growth is compressed. Symmetry and Unified Interaction Energy bonuses apply afterwards, allowing them to overcome this resistance. Spending Energy does not reset the band; restarting the run does.'},
    symmetryQuanta:{title:'Quantum Coupling · Unified Interaction',text:function () { return 'Multiply raw Symmetry generation by 1 + log₁₀(unspent Quanta + 1) / 4, minimum ×1. Current bonus: ×'+Game.Format.number(Game.D(1+Game.player.prestige.quanta.add(1).log10()/4),5)+'. Alignment capacity and shared field resistance still apply. This upgrade survives Condense.'; }},
    symmetry:{title:'Symmetry',text:function () { return 'S = Symmetry / 100%. The Energy multiplier is 10^(100 × S⁴), reaching ×1e100 at 100% Symmetry.'+(Game.Symmetry.discovered(1)||false?' Perfect Interaction raises this multiplier to 1.15.':'')+' Symmetry bonuses apply after late Energy resistance. Current multiplier: ×'+Game.Format.number(Game.Symmetry.multiplier(),5)+'. Condense resets current Symmetry and Field Alignment.'+(Game.Symmetry.discovered(.5)||false?' Unified Interaction purchases remain.':'')+' Achievements do not boost Symmetry generator output. Alignment capacity limits each level and shared field resistance gives additional levels diminishing returns.'; }},
    quantaBonus: { title: "Primordial Quanta · Energy bonus", text: function () {
      const state=Game.Progression.quantaBonusState();
      return "Each bonus Quanta multiplies all Energy gains by ×"+Game.CONFIG.PRESTIGE.quantaEnergyBase+" until the bonus reaches ×"+Game.Format.number(state.cap,0)+", at about "+Game.Format.number(state.threshold,2)+" Quanta. Above that soft cap, every ×10 increase in the bonus requires ×10 as much Quanta. The bonus stays continuous at the threshold and keeps growing. "+(state.active?"Soft cap active. ":"")+"Spending Quanta can lower this bonus immediately. "+(Game.Progression.hasSkill("4-4-2")?"Lasting potential uses whichever is higher: unspent Quanta or half lifetime Quanta. Both follow the same soft cap. ":"")+"Current bonus basis: "+Game.Format.number(state.basis,1)+" Quanta. Purchased skills survive Condensing.";
    } },
    fieldOscillation: { terms: ["Field Oscillation"], title: "Field Oscillation", text: function () { const rules = Game.FieldDynamics.rules(); return "Each owned Gen 5 unit contributes ×1.25 to the peak Energy multiplier. Purchased patterns strengthen the peak and the dependable baseline. The shared " + rules.cycle + "-second cycle rises exponentially from its current baseline for " + rules.rise + " seconds, holds its peak for " + Game.D(rules.cycle).sub(rules.rise).toString() + " seconds, and restarts." + (Game.Progression.hasSkill("3-2-2") ? " At peak, negative Fluct returns output to its baseline and pauses the remaining peak countdown until Fluct is positive again." : "") + " All Energy gains receive the current effect. Resonance resources and permanent base boosts use their existing bonuses."; } },
    fieldResonance: { terms: ["Field Resonance"], title: "Field Resonance", text: function () { return "Each owned Gen 6 unit multiplies Field Oscillation's combined peak by ×" + Game.FieldDynamics.rules().resonancePerUnit + ". Purchased patterns strengthen this effect. A quarter of its logarithmic strength also reinforces Oscillation's baseline. It requires an owned Field Oscillation to affect Energy. Purchased and added units both count." + (Game.Progression.hasSkill("3-5-2") ? " Purchased Gen 7 units also contribute: " + Game.Format.number(Game.Energy.getSharedResonance(), 0) + "." : "") + (Game.Progression.hasSkill("3-5-1") ? " Logarithmic harmony multiplies the combined count by ×" + Game.Format.number(Game.Energy.resonanceCountMultiplier(), 3) + " (log₂ of raw held QR, minimum ×1). Effective count: " + Game.Format.number(Game.Energy.getProductionCount("fieldResonance"), 3) + "." : ""); } },
    fieldCoupling: { terms: ["Field Coupling"], title: "Field Coupling", text: "Each owned Gen 7 unit makes every purchased Disturb level add one effective Field Excitation. Coupled units join its shared cycle and boost future base-rate increases. Purchase costs and achievements still count only purchased units. Coupled units are derived from current levels, rather than permanently added." },
    fluct: {
      terms: ["Fluct"],
      title: "Fluct",
      text: function () { return "A changing multiplier applied to every Energy gain, including clicks and generators. Quantum Fluctuations roll a new reinforcement or interference effect every " + Game.Modifiers.getFluctuationRules().rollInterval + " game seconds. Purchases build stable strength. Positive and negative rolls apply x1.20 and x0.80 around it; Quantum Resonance adds a logarithmic bonus outside the purchased-count exponent."; }
    },
    quantumResonance: {
      terms: ["Quantum Resonance"],
      title: "Quantum Resonance",
      text: function () { const rules = Game.Coherence.rules(); return "Produced by Coherent Energy. Quantum Resonance multiplies stable Fluct strength by 1 + 0.1 * log10(1 + effective Resonance). It never changes the positive or negative chance. Its effect has diminishing returns starting at " + rules.quantumSoftcap.start + " held Resonance; the actual resource count keeps growing normally. The production cycle starts at " + Game.Progression.productionInterval(rules.quantumInterval).toString() + " game seconds and becomes " + rules.quantumSlowdownSeconds + " seconds longer for every " + rules.quantumSlowdownEvery + " Quantum Resonance produced. Generator production bonuses apply; fractional output carries into later cycles."; }
    },
    quantumSoftcap: {
      title: "Quantum Resonance · soft cap",
      text: function () {
        const state = Game.Coherence.quantumSoftcapState(), rules = Game.Coherence.rules().quantumSoftcap;
        let threshold = Game.D(rules.start);
        const tiers = rules.powers.map(function (power) {
          const label = Game.Format.number(threshold, 0) + ": ^" + power;
          threshold = threshold.mul(rules.stepFactor);
          return label;
        });
        return "Diminishing returns apply only to the Fluct boost. Current effective Resonance: " + Game.Format.number(state.effective, 4) + "; current exponent: " + Game.Format.number(state.power, 2) + ". Each threshold is ×" + rules.stepFactor + " the preceding threshold. Tiers — " + tiers.join("; ") + ". Each interval continues smoothly from the preceding one. The final ^0.50 scaling continues indefinitely. Resource production and its count are unchanged.";
      }
    },
    energyResonance: {
      terms: ["Energy Resonance"],
      title: "Energy Resonance",
      text: function () { return "Produced by Coherent Energy every " + Game.Coherence.energyInterval().toString() + " game seconds. Each Energy Resonance immediately adds 1 Energy Disturbance. These added generators produce normally, without raising purchase costs or counting toward purchase achievements. Generator production bonuses apply; fractional output carries into later cycles."; }
    },
    energyDisturbance: {
      terms: ["Energy Disturbances", "Energy Disturbance"],
      title: "Energy Disturbance",
      text: function () { return "Produces a continuous Energy flow, equivalent to 30 base Energy every " + Game.Energy.burstInterval(Game.CONFIG.GENERATORS[0]).toString() + " game seconds. Purchased and added units both produce immediately. Paid purchases complete repeating 4 / 6 / 8 / 12 resonance patterns, multiplying the entire output; added units do not fill patterns. Field Excitation increases this base rate."; }
    },
    fieldExcitation: {
      terms: ["Field Excitation"],
      title: "Field Excitation",
      text: function () { return "Every " + Game.FieldExcitation.interval().toString() + " game seconds, each owned unit adds 0.01 to Energy Disturbance's base Energy per second. New purchases also immediately grant the extra base output they add to a cycle. Purchased patterns and incoming echoes strengthen all of this generator's growth. Added units benefit too. Generator production bonuses strengthen each increase." + (Game.Progression.hasSkill("4-3-3") ? " Excited foundation currently multiplies this growth by ×" + Game.Format.number(Game.FieldExcitation.purchasedMultiplier(), 5) + ", based only on purchased Field Excitations." : ""); }
    },
    coherentEnergy: {
      terms: ["Coherent Energy"],
      title: "Coherent Energy",
      text: "Produces Quantum Resonance and Energy Resonance in separate cycles. Purchasing your first Coherent Energy unlocks a permanent ×1.05 bonus to all generator production."
    },
    fluctFormula: {
      title: "Fluct · formula",
      text: function () {
        return Game.Energy.fluctFormulaText();
      }
    }
  };
  let tooltip, active, timer;
  function hide() {
    clearTimeout(timer);
    if (active) active.removeAttribute("aria-describedby");
    active = null;
    if (tooltip) tooltip.hidden = true;
  }
  function position() {
    if (!active || tooltip.hidden) return;
    const bounds = active.getBoundingClientRect();
    const width = tooltip.offsetWidth, height = tooltip.offsetHeight;
    tooltip.style.left = Math.max(12, Math.min(bounds.left, innerWidth - width - 12)) + "px";
    const below = bounds.bottom + 10;
    tooltip.style.top = Math.max(12, Math.min(below + height <= innerHeight - 12 ? below : bounds.top - height - 10, innerHeight - height - 12)) + "px";
  }
  function schedule(target) {
    if (active === target) return;
    hide();
    active = target;
    timer = setTimeout(function () {
      const entry = entries[target.dataset.tip];
      if (!entry || !target.isConnected || !target.getClientRects().length) return hide();
      tooltip.replaceChildren();
      const heading = document.createElement("strong"), description = document.createElement("p");
      heading.textContent = entry.title;
      description.textContent = typeof entry.text === "function" ? entry.text() : entry.text;
      tooltip.append(heading, description);
      tooltip.hidden = false;
      target.setAttribute("aria-describedby", tooltip.id);
      position();
    }, 1000);
  }
  Game.Tooltips = {
    enrich: function (element) {
      const terms = Object.keys(entries).flatMap(function (key) {
        return (entries[key].terms || []).map(function (term) { return { key: key, term: term }; });
      }).sort(function (a, b) { return b.term.length - a.term.length; });
      const pattern = new RegExp("\\b(" + terms.map(function (entry) { return entry.term; }).join("|") + ")\\b", "g");
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) if (!walker.currentNode.parentElement.closest("button")) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        const text = node.textContent, fragment = document.createDocumentFragment();
        let end = 0;
        for (const match of text.matchAll(pattern)) {
          fragment.append(document.createTextNode(text.slice(end, match.index)));
          const button = document.createElement("button");
          button.className = "info-term";
          button.dataset.tip = terms.find(function (entry) { return entry.term === match[0]; }).key;
          button.textContent = match[0];
          fragment.append(button);
          end = match.index + match[0].length;
        }
        if (end) { fragment.append(document.createTextNode(text.slice(end))); node.replaceWith(fragment); }
      });
    },
    hide: hide,
    init: function () {
      tooltip = document.createElement("div");
      tooltip.id = "info-tooltip";
      tooltip.className = "info-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.hidden = true;
      document.body.append(tooltip);
      document.addEventListener("mouseover", function (event) {
        const target = event.target.closest("[data-tip]");
        if (target) schedule(target);
      });
      document.addEventListener("mouseout", function (event) {
        const target = event.target.closest("[data-tip]");
        if (target && !target.contains(event.relatedTarget)) hide();
      });
      document.addEventListener("focusin", function (event) {
        const target = event.target.closest("[data-tip]");
        if (target) schedule(target);
      });
      document.addEventListener("focusout", function (event) {
        if (event.target.closest("[data-tip]")) hide();
      });
      document.addEventListener("click", function (event) {
        const target = event.target.closest("[data-tip]");
        if (target) {
          if (target.matches("button")) {
            event.preventDefault();
            event.stopPropagation();
            schedule(target);
          } else hide();
        } else hide();
      });
      document.addEventListener("keydown", function (event) { if (event.key === "Escape") hide(); });
      document.addEventListener("scroll", hide, true);
      document.addEventListener("visibilitychange", hide);
      window.addEventListener("blur", hide);
      window.addEventListener("resize", position);
    }
  };
})(window.CosmicIdle);
