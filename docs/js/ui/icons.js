(function (Game) {
  // One engraved, scalable icon family. Paths use currentColor so locked,
  // available and earned states inherit the existing game palette.
  const shapes = {
    spark: '<path d="M16 3l3.5 9.5L29 16l-9.5 3.5L16 29l-3.5-9.5L3 16l9.5-3.5Z"/><path d="M23 4l1 3 3 1M5 24l3 1 1 3"/>',
    engine: '<circle cx="16" cy="16" r="5"/><ellipse cx="16" cy="16" rx="14" ry="8" transform="rotate(-35 16 16)"/><circle cx="26" cy="8" r="2" fill="currentColor"/>',
    growing: '<path d="M5 25V15h5v10M13.5 25V9h5v16M22 25V3h5v22M3 29h26"/><path d="M4 9l8-5 7 1"/>',
    time: '<circle cx="16" cy="16" r="13"/><path d="M11 7h10M11 25h10M12 8c0 5 8 11 8 16M20 8c0 5-8 11-8 16M15 5h2M15 27h2"/>',
    coherent: '<path d="M16 3l12 7v12l-12 7-12-7V10Z"/><circle cx="11" cy="14" r="4"/><circle cx="21" cy="14" r="4"/><circle cx="16" cy="21" r="4"/>',
    negative: '<path d="M4 9h8M20 9h8M12 23h8"/><circle cx="8" cy="9" r="6"/><circle cx="24" cy="9" r="6"/><circle cx="16" cy="23" r="6"/>',
    condense: '<path d="M2 10l6 6-6 6M30 10l-6 6 6 6M10 2l6 6 6-6M10 30l6-6 6 6"/><path d="M16 11l5 5-5 5-5-5Z" fill="currentColor" fill-opacity=".25"/>',
    energyDisturbance: '<path d="M2 17h6l3-8 6 17 5-14 3 5h5"/><path d="M5 5l3 2M24 25l3 2"/>',
    quantumFluctuation: '<path d="M3 8h10M8 3v10M20 24h10"/><path d="M4 25C11 6 21 6 28 8M4 24c11 4 19-5 24-18"/>',
    coherentEnergy: '<path d="M16 3l12 7v12l-12 7-12-7V10Z"/><circle cx="16" cy="16" r="6"/><path d="M16 3v7M28 22l-7-3M4 22l7-3"/>',
    fieldExcitation: '<path d="M3 9c6-9 20 9 26 0M3 16c6-9 20 9 26 0M3 23c6-9 20 9 26 0"/><path d="M10 3v26M22 3v26" opacity=".45"/>',
    fieldOscillation: '<path d="M2 16c5 0 5-12 10-12s5 24 10 24 5-12 8-12"/><path d="M2 16h28" opacity=".35"/>',
    fieldResonance: '<circle cx="16" cy="16" r="4"/><path d="M9 7a12 12 0 0 0 0 18M23 7a12 12 0 0 1 0 18M5 3a18 18 0 0 0 0 26M27 3a18 18 0 0 1 0 26"/>',
    fieldCoupling: '<circle cx="9" cy="11" r="6"/><circle cx="23" cy="21" r="6"/><path d="M10 16l7 5M15 11l7 5M3 27l6-5M23 10l6-5"/>',
    quantumResonance: '<path d="M11 3l8 10-8 10-8-10ZM21 9l8 10-8 10-8-10Z"/>',
    energyResonance: '<circle cx="16" cy="16" r="11"/><path d="M16 7v18M7 16h18"/><circle cx="25" cy="9" r="3" fill="currentColor"/>',
    quanta: '<path d="M16 3l12 13-12 13L4 16Z"/><path d="M16 9l6 7-6 7-6-7Z" fill="currentColor" fill-opacity=".3"/>',
    capture: '<path d="M5 4l9 3-4 4 7 7-4 4-7-7-4 4ZM19 3h10M19 29h10M21 5c0 6 6 16 6 22M27 5c0 6-6 16-6 22"/>',
    quickening: '<path d="M2 18c5 0 5-9 9-9s4 14 8 14 4-9 8-9"/><path d="M20 3l8 4-8 4M23 25h7"/>',
    firstRhythm: '<path d="M2 17c4 0 4-8 8-8s4 16 8 16 4-8 8-8M23 3v8M19 7h8"/>',
    lore: '<path d="M16 8C10 3 5 5 3 6v21c4-2 8-2 13 1 5-3 9-3 13-1V6c-4-2-8-2-13 2ZM16 8v20"/><path d="M7 11l5 1M7 17l5 1M20 12l5-1M20 18l5-1"/>',
    stats: '<path d="M4 3v25h25M8 22l6-8 6 3 8-12"/><circle cx="14" cy="14" r="2"/>',
    settings: '<path d="M13 3h6l.7 4.1 2.5 1.4 3.9-1.4 3 5.2-3.2 2.7v2.9l3.2 2.7-3 5.2-3.9-1.4-2.5 1.4L19 30h-6l-.7-4.2-2.5-1.4-3.9 1.4-3-5.2 3.2-2.7V15l-3.2-2.7 3-5.2 3.9 1.4 2.5-1.4Z"/><circle cx="16" cy="16.5" r="5"/>',
    achievements: '<path d="M16 3l4 8 9 1-6 7 1 10-8-5-8 5 1-10-6-7 9-1Z"/><circle cx="16" cy="16" r="4"/>'
  };
  const aliases = { "skill-1-1":"spark", "skill-1-2":"capture", "skill-1-3-1":"growing", "skill-1-3-2":"engine", "skill-2-1":"quantumFluctuation", "skill-2-2":"quickening", "skill-2-3-1":"quantumResonance", "skill-2-3-2":"energyResonance", "skill-2-3-3":"time", "skill-3-1":"fieldOscillation", "skill-3-2":"firstRhythm", "skill-3-3":"coherent", "skill-3-4-1":"fieldResonance", "skill-3-4-2":"fieldCoupling", "skill-4-1":"quanta", "skill-4-2":"condense", energy:"spark", prestige:"condense" };
  Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer) { aliases["skill-"+buyer.skill]=buyer.id; });
  aliases.challenges="coherent";
  const achievementIds = {"click-achievement":"spark", "first-generator-achievement":"engine", "twenty-five-achievement":"growing", "five-minutes-achievement":"time", "coherent-achievement":"coherent", "fluct-streak-achievement":"negative", "condense-achievement":"condense"};
  Object.assign(aliases, { "skill-1-4-2":"quickening", "skill-1-5-1":"growing", "skill-1-5-2":"spark", "skill-2-4-1":"energyResonance", "skill-2-4-2":"fieldExcitation", "skill-3-2-3":"time", "skill-3-5-1":"quantumResonance", "skill-3-5-2":"fieldCoupling", "skill-4-4-1":"quanta", "skill-4-4-2":"condense", "skill-0-0":"condense", "skill-1-2-1":"time", "skill-1-2-2":"spark", "skill-2-1-2":"negative", "skill-3-2-1":"capture", "skill-1-4-1":"coherentEnergy", "skill-3-2-2":"fieldOscillation", "skill-3-4-3":"coherent", "skill-4-3-1":"condense", "skill-4-3-2":"time", "skill-4-3-3":"fieldExcitation" });
  Game.Icons = {
    svg: function (name) { return '<svg class="cosmic-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (shapes[aliases[name] || name] || shapes.quanta) + '</svg>'; },
    achievement: function (name) { return name.indexOf("A moment") === 0 ? "time" : ({"First sparks":"spark","First generator":"engine","A growing engine":"growing","A coherent beginning":"coherent","Against the current":"negative","First condensation":"condense"}[name] || "achievements"); },
    init: function () {
      Object.keys(achievementIds).forEach(function (id) { document.querySelector('#' + id + ' .achievement-emblem').innerHTML = Game.Icons.svg(achievementIds[id]); });
      ["energy","prestige","achievements","stats","lore","challenges","settings"].forEach(function (id) { document.getElementById(id + "-tab").insertAdjacentHTML("afterbegin", Game.Icons.svg(id)); });
      document.querySelector(".header-energy .label").insertAdjacentHTML("afterbegin", this.svg("spark"));
      document.querySelector(".header-quanta>span").insertAdjacentHTML("afterbegin", this.svg("quanta"));
      ["quantumResonance","energyResonance"].forEach(function (id) { document.querySelector('#resonance-overview [data-tip="' + id + '"]').insertAdjacentHTML("afterbegin", Game.Icons.svg(id)); });
    }
  };
})(window.CosmicIdle);
