# Cosmic Idle

A space-themed incremental game about forming structure from primordial Energy.

**[Play Cosmic Idle](https://lonewolf4death.github.io/idle-game/)**

Click the Energy field to begin, discover generators, unlock achievements, and Condense Energy into Primordial Quanta to explore the skill tree. Use 1–9 and 0 to buy generators with the selected purchase quantity. Sound starts after your first interaction and can be adjusted in Settings.

Eight 100-Quanta skills unlock Gen 1–7 buyers and auto-Condense. Enable individual buyers or all unlocked buyers in Settings → Automation. Buyers attempt one purchase every 5 real seconds. Challenges offers eight ten-level phase-alignment tracks: quiet every cell by flipping a cell and its immediate neighbors. Each completion reduces that buyer’s interval by 0.4 seconds, reaching 1 second at level ten. Puzzle mastery survives Condense and respec. Auto-Condense claims the available reward at 1e50 or more and skips the cinematic.

Progress saves in your browser. Settings includes Export and Import for backups or moving a save between devices. Saves from the local edition can be imported here. The hosted site has separate browser storage from a local file; use Export/Import to move progress.

## Public edition

The current game is in `docs/`, deployed by the GitHub Pages workflow. This edition contains no reveal-all control, development multipliers, time-skip tool, or development-only respec. It needs no installation, server backend, or external assets.

The older root-level scaffold is retained in Git history and the repository; the Pages deployment serves only `docs/`.

## Bundled libraries

- Three.js: see [license](docs/js/vendor/LICENSE.three.txt).
- break_infinity.js: see [license](docs/js/numbers/LICENSE.break_infinity.txt).
