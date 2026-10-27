# Cosmic Idle

A space-themed incremental game about forming structure from primordial Energy.

**[Play Cosmic Idle](https://lonewolf4death.github.io/idle-game/)**

Click the Energy field to begin, discover generators, unlock achievements, and Condense Energy into Primordial Quanta to explore the skill tree. Use 1–9 and 0 to buy generators with the selected purchase quantity. Sound starts after your first interaction and can be adjusted in Settings.

Eight 100-Quanta skills unlock Gen 1–7 buyers and auto-Condense. Enable individual buyers or all unlocked buyers in the Automation tab. Buyers attempt one purchase every 5 real seconds. Challenges offers eight restricted-run tracks with ten escalating Energy goals each: no clicks, forced negative Fluct, unavailable Resonance or fields, no Oscillation, purchases erasing lower generators, capped purchases, or disabled Quanta bonuses. Entering, completing or exiting restarts the run without Quanta. Challenge completions improve only the associated buyer by 0.4 seconds, reaching 1 second at level ten. Earned mastery survives Condense and respec. All automation, automatic clicks and bubbles pause inside challenges; normal starting-unit gifts are replaced by challenge-specific seeds. Confirmations explain the reset before entry or exit. In the Automation tab, set a minimum Quanta reward target for auto-Condense (default 1). It waits until the available reward reaches that target, still requiring 1e50 Energy, then claims the full reward. Editing pauses auto-Condense, and the target is saved.

Progress saves in your browser. Settings includes Export and Import for backups or moving a save between devices. Saves from the local edition can be imported here. The hosted site has separate browser storage from a local file; use Export/Import to move progress.

## Public edition

The current game is in `docs/`, deployed by the GitHub Pages workflow. This edition contains no reveal-all control, development multipliers, time-skip tool, or development-only respec. It needs no installation, server backend, or external assets.

The older root-level scaffold is retained in Git history and the repository; the Pages deployment serves only `docs/`.

## Bundled libraries

- Three.js: see [license](docs/js/vendor/LICENSE.three.txt).
- break_infinity.js: see [license](docs/js/numbers/LICENSE.break_infinity.txt).
