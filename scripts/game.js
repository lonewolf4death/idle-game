// scripts/game.js
import { spawnDot, dots, onCollision } from './physics.js';
import { state } from './upgrades.js';
import { updateUI, maybeRevealUI } from './ui.js';
import { loadState } from './save.js';

loadState();
updateUI();

const overlay = document.getElementById('overlay');
overlay.addEventListener('click', e => {
  const rect = overlay.getBoundingClientRect();
  spawnDot(e.clientX - rect.left, e.clientY - rect.top);
  maybeRevealUI(dots.size);
  updateUI();
});

onCollision((a, b) => {
  if (dots.has(a) && dots.has(b)) {
    state.points = state.points.add(1);
    World.remove(world, a);
    World.remove(world, b);
    dots.delete(a);
    dots.delete(b);
    updateUI();
  }
});