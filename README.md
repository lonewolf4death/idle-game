# Cosmic Idle

**[Play Cosmic Idle](https://lonewolf4death.github.io/idle-game/)**

A space-themed incremental game about forming structure from primordial Energy.

Click the Energy field, develop generators and complete purchased resonance patterns. Patterns follow a repeating 4 / 6 / 8 / 12 phrase. Each pattern has one unit price until completion; the next pattern raises that price. Completion strengthens the generator and echoes a smaller bonus into the previous generator. Added units benefit without filling patterns. Choose single purchases, Next pattern, 5, 10, 100 or Max; use 1–9 and 0 for generator hotkeys. Next pattern buys one SGen unit in the Symmetry layer.

Gen 1 produces continuously from its first unit. Gen 2 builds stable strength, with rolls applying +20% or -20% around it; QR contributes a logarithmic bonus outside the purchased-count exponent. Gen 4 purchases immediately increase base Energy output, in addition to later growth cycles. Gen 5 retains a dependable baseline between its timed peaks. Prices grow more steeply after 32 completed generator patterns to preserve late progression.

Stabilize the Field to rebuild with remembered structure. The first four Stabilizations unlock Gen 4–7; refinements provide further rebuilding strength. This lower reset keeps permanent progression and the complete Condense-run duration. Its confirmation lists reset boundaries, and recovery statistics track the return to the previous Energy high. Condense remains the major prestige at 1e50, awarding Primordial Quanta and access to the skill tree. Condense history provides stronger Energy and progressively restores starting Stabilizations. The first Quanta choices have clearer, stronger effects. Shift-click an available skill node to purchase directly in either tree view.

Basic automation unlocks for Gen 1–3 after Stabilizing and for all seven after Condensing. These buyers attempt one next pattern every 15 real seconds. The existing eight 100-Quanta skills upgrade Gen 1–7 to Max buyers and unlock auto-Condense, with saved individual/all toggles in Automation. Advanced buyers start at 5 seconds and ten challenge completions improve them to 1 second. Auto-Condense has a saved minimum Quanta reward target, takes priority over simultaneous Max buyers and claims the full reward. Challenges require their advanced automation skill and permanent Energy milestones. They pause automation and Stabilization; entry and exit restart the run while keeping permanent progress.

The early economy is benchmarked from a fresh save and a first-Quanta repeat run. Timings depend on purchasing policy, rolls and player choices. Achievement, pattern, Fluct, Stabilization, Quanta and production contributions appear in Stats.

Symmetry unlocks for 10,000 Quanta. Switch generator layers beneath the title. SGen1 Field Alignment starts at 1e1000 Energy. Alignment capacity and shared resistance prevent large Energy balances from immediately completing Symmetry. Achievements do not boost SGen output. Milestones remain hidden until reached; permanent Unified Interaction upgrades use Energy prices anchored when 50% is first reached. Condense resets current Symmetry and Field Alignment but preserves purchased Unified upgrades and discoveries. Symmetry multiplies Energy by 10^(100*S^4), applying after late Energy resistance. Perfect Alignment and Symmetry Breaking remain future-mechanic placeholders.

Progress saves in your browser. Settings includes Export, Import and rolling recovery backups. Failed loads and conflicting tabs pause autosaving instead of replacing stored progress. Asset URLs are versioned to avoid mixed cached modules. Older saves retain achievements, lore, skills, resources, generator counts, settings and earned generator stages when migrating to resonance patterns. The hosted site and a local file have separate browser storage; use Export/Import to move progress.

## Public edition

The current game is in docs/, deployed by the GitHub Pages workflow. The public edition contains no developer reveal control, development multipliers, time skipping or development-only respec. Sound starts after your first interaction and can be adjusted in Settings. No installation, external assets or backend are required.

The older root scaffold remains in the repository; Pages serves only docs/.

## Bundled libraries

- [Three.js license](docs/js/vendor/LICENSE.three.txt)
- [break_infinity.js license](docs/js/numbers/LICENSE.break_infinity.txt)
