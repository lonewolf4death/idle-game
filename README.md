# Cosmic Idle

A space-themed incremental game about forming structure from primordial Energy.

**[Play Cosmic Idle](https://lonewolf4death.github.io/idle-game/)**

Click the Energy field to begin, discover generators, unlock achievements, and Condense Energy into Primordial Quanta to explore the skill tree. Use 1–9 and 0 to buy Gen 1–10 with the selected purchase quantity. Sound starts after your first interaction and can be adjusted in Settings.

Eight 100-Quanta skills unlock Gen 1–7 Max buyers and auto-Condense in the Automation tab. Eight ten-level restricted-run challenges require their automation skill and permanent Energy milestones from 1e55 to 1e125. Each completion improves its buyer from 5 seconds toward 1 second. Challenges include deadlines, reduced Energy powers, weakening initial suppression, periodic collapses, inflated prices, one active generator, disabled Fluct and purchase-reset production decay. Entry, completion, retry and exit restart the run without Quanta. Achievements, lore, permanent progression and total playtime remain. Individual challenge milestones have no production reward; completing level one of all eight raises Energy gains to 1.02. Auto-Condense has a saved minimum Quanta reward target (default 1), claims the full reward and takes priority over simultaneous Max purchases. Symmetry is a disconnected 10,000-Quanta purchase reserved for future mechanics. Gen 2 has additional late cost scaling after 6,000 purchased units.

## Symmetry and the ending

Once every skill in the Condense tree is owned and a run holds 1e100 Energy, the Symmetry tab opens. Breaking Symmetry resets your run, Quanta, Condense count and Mass in exchange for Broken Symmetries: one at 1e100 Energy and one more each time the exponent doubles, plus 10% per order of magnitude of Mass. The skill tree, achievements, lore, playtime, challenge levels and settings stay.

Broken Symmetries buy eight permanent perks (a 1e30 Energy head start, double Quanta, keeping your Condense count, faster buyers, a Gen 8 head start, Mass that survives Breaks at half strength, and more) and the repeatable Deeper asymmetry. Breaking also opens Gen 8 (Symmetry Breaking), which produces Mass; perks add Gen 9 (Massive Particles) and Gen 10 (Binding Force). Mass multiplies all Energy and persists through Condenses until the next Break. Gathering 1e30 Mass forms the first stable atom, which is the ending. You can keep playing afterwards.

## Saving and offline progress

Progress saves in your browser. Settings includes Export and Import, with copy, file download and file upload, for backups or moving a save between devices. The game keeps a backup of the save it loaded each session (Restore session backup), and if a save ever fails to load it is kept aside instead of being overwritten (Export unreadable save).

Time away is simulated when you return, up to 24 hours, with a progress bar and a summary. This covers a closed page and a long-hidden tab, and can be turned off in Settings.

## Running locally

Serve the `docs/` folder with any static server, for example `./start-server.sh` (or `start-server.bat` on Windows), then open http://localhost:8080. The hosted site and a local copy use separate browser storage; use Export/Import to move progress.

## Development tools

`tools/` runs the game logic headlessly in Node (no browser needed):

- `node --test tools/test.js` runs the logic tests (saves, offline progress, achievements, Symmetry).
- `node tools/balance.js [hours] [seed] [scenario]` plays the game with a goal-driven bot and prints when milestones are reached. Scenario `tree` starts with the full skill tree to measure the Symmetry layer.

The Pages workflow deploys only `docs/`.

## Bundled libraries

- Three.js: see [license](docs/js/vendor/LICENSE.three.txt).
- break_infinity.js: see [license](docs/js/numbers/LICENSE.break_infinity.txt).
