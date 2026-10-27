(function (Game) {
  const byId = function (id) { return document.getElementById(id); };
  function set(node, value) { value = String(value);if (node.textContent !== value) node.textContent = value; }

  Game.SymmetryUI = {
    perkRows: {}, structureNodes: {},
    init: function () {
      const list = byId("symmetry-perks");
      Game.CONFIG.SYMMETRY.perks.forEach(function (perk) {
        const row = document.createElement("div");row.className = "symmetry-perk";
        const text = document.createElement("div");
        const name = document.createElement("h3");name.textContent = perk.name;
        const description = document.createElement("p");description.textContent = perk.description;
        text.append(name, description);
        const button = document.createElement("button");
        button.addEventListener("click", function () { Game.Symmetry.buyPerk(perk.id); });
        row.append(text, button);list.appendChild(row);
        Game.SymmetryUI.perkRows[perk.id] = { row: row, button: button };
      });
      byId("symmetry-deeper").addEventListener("click", function () { Game.Symmetry.buyDeeper(); });
      byId("symmetry-break").addEventListener("click", function () { Game.SymmetryUI.confirmBreak(); });
      byId("cancel-symmetry").addEventListener("click", function () { byId("symmetry-dialog").close(); });
      byId("confirm-symmetry").addEventListener("click", function () { byId("symmetry-dialog").close();Game.Symmetry.breakSymmetry(false); });
      byId("symmetry-dialog").addEventListener("close", function () { if (Game.Experience) Game.Experience.next(); });
    },
    // Gen 8–10 cards share the generator list and its styles.
    buildStructureCards: function (list) {
      Game.CONFIG.SYMMETRY.structures.forEach(function (structure, index) {
        const number = Game.CONFIG.GENERATORS.length + index + 1;
        const card = document.createElement("details");
        card.className = "generator-card structure-card";card.dataset.collapse = structure.id;card.open = true;card.hidden = true;
        card.innerHTML = "<summary><h3>" + Game.Icons.svg("symmetry") + "<span data-name></span></h3><button class='collapsed-buy' data-buy-collapsed>Buy</button></summary><p data-description></p><div class='generator-meta'><strong data-owned></strong><span data-production class='muted'></span><button data-buy>Buy</button></div>";
        card.querySelector("[data-name]").textContent = structure.name;
        card.querySelector("[data-description]").textContent = structure.description;
        const buy = card.querySelector("[data-buy]"), collapsedBuy = card.querySelector("[data-buy-collapsed]");
        [buy, collapsedBuy].forEach(function (button) {
          button.title = "Buy Gen " + number + " · hotkey " + (number === 10 ? 0 : number) + " in the Energy tab · uses selected buy amount";
          button.addEventListener("click", function (event) {
            event.preventDefault();event.stopPropagation();
            Game.Structure.buy(structure.id, Game.UI.buyAmount);Game.UI.render();
          });
        });
        list.appendChild(card);
        Game.SymmetryUI.structureNodes[structure.id] = { card: card, owned: card.querySelector("[data-owned]"), production: card.querySelector("[data-production]"), buy: buy, collapsedBuy: collapsedBuy };
      });
    },
    confirmBreak: function () {
      const reward = Game.Symmetry.reward();
      if (reward.lte(0)) return;
      const s = Game.player.symmetry;
      set(byId("symmetry-confirm-reward"), "+" + Game.Format.number(reward, 0) + " Broken " + (reward.eq(1) ? "Symmetry" : "Symmetries"));
      set(byId("symmetry-confirm-description"), "This resets your current run, Primordial Quanta" + (s.perks.memory ? "" : ", Condense count") + " and Mass" + (s.perks.echo ? " (halved, thanks to Echoing mass)" : "") + ". Your skill tree, achievements, lore, playtime, challenge levels and settings stay.");
      byId("symmetry-dialog").showModal();
    },
    render: function () {
      const p = Game.player, s = p.symmetry, discovered = Game.Symmetry.discovered(), F = Game.Format;
      byId("symmetry-tab").hidden = !discovered;
      const placeholder = byId("symmetry-placeholder");
      if (placeholder) placeholder.classList.toggle("is-formed", discovered);
      Game.CONFIG.SYMMETRY.structures.forEach(function (structure, index) {
        const node = Game.SymmetryUI.structureNodes[structure.id], state = p.structures[structure.id];
        node.card.hidden = !Game.Structure.unlocked(structure.id);
        if (node.card.hidden) return;
        const quote = Game.Structure.quote(structure.id, Game.UI.buyAmount);
        set(node.owned, "Gen " + (Game.CONFIG.GENERATORS.length + index + 1) + " · Purchased: " + F.number(state.purchased, 0) + " + " + F.number(state.added, 0) + " added");
        if (index === 0) set(node.production, "+" + F.number(Game.Symmetry.massRate()) + " Mass / sec · Mass " + F.number(s.mass) + " · all Energy ×" + F.number(Game.Symmetry.energyMultiplier(), 3));
        else if (index === 1) set(node.production, "+" + F.number(Game.Structure.owned(structure.id), 0) + " Gen 8 every " + structure.interval + "s · next in " + F.number(Game.Structure.owned(structure.id).gt(0) ? Game.D(structure.interval).sub(p.structureTimer.elapsed) : Game.D(structure.interval), 1) + "s");
        else set(node.production, "Mass production ×" + F.number(Game.D(structure.massMultiplier).pow(Game.Structure.owned(structure.id))));
        if (Game.Challenges.active()) set(node.buy, "Unavailable in challenges");
        else set(node.buy, quote.count.gt(0) ? "Buy " + F.number(quote.count, 0) + " — " + F.number(quote.cost) + " Energy" : "Buy — " + F.number(Game.Structure.cost(structure.id)) + " Energy");
        node.buy.disabled = quote.count.lte(0);
        Game.UI.updateCompactBuy(node.collapsedBuy, node.buy, structure.name);
      });
      if (byId("symmetry-view").hidden) return;
      const reward = Game.Symmetry.reward();
      set(byId("symmetry-shards"), F.number(s.shards, 0));
      set(byId("symmetry-summary"), "Broken " + F.number(s.times, 0) + (s.times.eq(1) ? " time" : " times") + " · " + F.number(s.total, 0) + " Broken Symmetries earned in total");
      const massBonus = Game.Symmetry.massRewardMultiplier();
      set(byId("symmetry-reward"), "+" + F.number(reward, 0) + " Broken " + (reward.eq(1) ? "Symmetry" : "Symmetries") + (massBonus > 1 ? " (Mass ×" + F.number(massBonus, 1) + ")" : ""));
      set(byId("symmetry-requirement"), Game.Challenges.active() ? "Unavailable during challenges." : !Game.Symmetry.gateOpen() ? "Requires every skill in the Condense tree, then " + F.number(Game.D(Game.CONFIG.SYMMETRY.unlockEnergy)) + " held Energy." : reward.gt(0) ? "Next Broken Symmetry at " + F.number(Game.Symmetry.nextRewardEnergy()) + " Energy." : "Requires " + F.number(Game.D(Game.CONFIG.SYMMETRY.unlockEnergy)) + " held Energy.");
      byId("symmetry-break").disabled = reward.lte(0);
      Game.CONFIG.SYMMETRY.perks.forEach(function (perk) {
        const row = Game.SymmetryUI.perkRows[perk.id], owned = Game.Symmetry.has(perk.id);
        row.row.classList.toggle("owned", owned);
        set(row.button, owned ? "Owned" : "Buy — " + perk.cost + " BS");
        row.button.disabled = owned || !Game.Symmetry.canBuyPerk(perk.id);
      });
      const deeper = Game.CONFIG.SYMMETRY.deeper;
      set(byId("symmetry-deeper-level"), deeper.name + " · Level " + s.deeper + " · Mass ×" + F.number(Game.D(deeper.massMultiplier).pow(s.deeper), 0));
      set(byId("symmetry-deeper"), "Buy — " + F.number(Game.Symmetry.deeperCost(), 0) + " BS");
      byId("symmetry-deeper").disabled = s.shards.lt(Game.Symmetry.deeperCost()) || s.deeper >= 60;
      const progress = Game.Symmetry.atomProgress();
      byId("symmetry-atom-fill").style.width = (progress * 100).toFixed(1) + "%";
      byId("symmetry-atom-bar").setAttribute("aria-valuenow", String(Math.round(progress * 100)));
      set(byId("symmetry-atom-text"), s.atom ? "The first atom has formed. Existence has structure." : "Mass " + F.number(s.mass) + " / " + F.number(Game.D(Game.CONFIG.SYMMETRY.atomMass)) + " to form the first stable atom.");
    }
  };
})(window.CosmicIdle);
