# Cosmic Idle

A space-themed incremental game about forming structure from primordial Energy.

**[Play Cosmic Idle](https://lonewolf4death.github.io/idle-game/)**

Click the Energy field to begin, discover generators, unlock achievements, and Condense Energy into Primordial Quanta to explore the skill tree. Use 1–9 and 0 to buy generators with the selected purchase quantity. Sound starts after your first interaction and can be adjusted in Settings.

Eight 100-Quanta skills unlock Gen 1–7 Max buyers and auto-Condense in the Automation tab. Eight ten-level restricted-run challenges require their automation skill and permanent Energy milestones from 1e55 to 1e125. Each completion improves its buyer from 5 seconds toward 1 second. Challenges include deadlines, reduced Energy powers, weakening initial suppression, periodic collapses, inflated prices, one active generator, disabled Fluct and purchase-reset production decay. Entry, completion, retry and exit restart the run without Quanta. Achievements, lore, permanent progression and total playtime remain. Individual challenge milestones have no production reward; completing level one of all eight raises Energy gains to 1.02 and permanently keeps Disturb maxed through all run resets. Auto-Condense has a saved minimum Quanta reward target (default 1), claims the full reward and takes priority over simultaneous Max purchases. Gentler resistance reduces Quantum Resonance slowdown to +0.1 seconds per milestone. With all perks, Symmetry unlocked and all challenges mastered, automated fresh runs benchmark around 45–47 minutes to 1e1000 without achievement bonuses. Symmetry unlocks for 10,000 Quanta. Switch generator layers beneath the title. SGen1 Field Alignment starts at 1e1000 Energy with eight opening prices scaling by ×1.1, followed by exponentially increasing cost jumps. Alignment capacity and shared field resistance prevent large Energy balances from skipping the roughly half-hour Symmetry stage. A single SGen takes over an hour even with all Unified upgrades. Achievement bonuses do not boost Symmetry generators. Milestones remain hidden until first reached. Symmetry multiplies Energy by 10^(100*S^4), reveals milestones and permanent Unified Interaction purchases with prices anchored to Energy when 50% is first reached; those prices stay fixed after resets. Unified Field I grants Energy ×1e40, and Field Resonance grants ×1e3 per Alignment level, and reshapes the field and Eventide audio near perfection. Condense resets Symmetry and Field Alignment but preserves bought Unified upgrades and discovered features. The footer tracks Symmetry after unlocking. Existing Energy gains face a new logarithmic resistance after 1e1000, with roughly 10/20/30-minute reference intervals per ten exponents; Symmetry and Unified Energy bonuses apply afterwards. Perfect Alignment perks and Symmetry Breaking are revealed placeholders for future designs. Gen 2 has additional late cost scaling after 6,000 purchased units.

Progress saves in your browser. Settings includes Export and Import for backups or moving a save between devices. Saves from the local edition can be imported here. The hosted site has separate browser storage from a local file; use Export/Import to move progress.

## Public edition

The current game is in `docs/`, deployed by the GitHub Pages workflow. This edition contains no reveal-all control, development multipliers, time-skip tool, or development-only respec. It needs no installation, server backend, or external assets.

The older root-level scaffold is retained in Git history and the repository; the Pages deployment serves only `docs/`.

## Bundled libraries

- Three.js: see [license](docs/js/vendor/LICENSE.three.txt).
- break_infinity.js: see [license](docs/js/numbers/LICENSE.break_infinity.txt).
