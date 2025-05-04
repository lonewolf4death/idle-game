// scripts/ui.js
import { state, buyUpgrade, canBuy, getFadeDelay, getKineticRestitution } from './upgrades.js';

const uiPanel  = document.getElementById('ui-panel');
const ptsLabel = document.getElementById('points');
const upgDiv   = document.getElementById('upgrades');
const dbgDiv   = document.getElementById('debug');

export function maybeRevealUI(count) {
  if (count >= 25) uiPanel.classList.remove('hidden');
}

export function updateUI() {
  ptsLabel.textContent = `Points: ${state.points.toString()}`;

  upgDiv.innerHTML = '';
  for (const id in state.upgrades) {
    const up = state.upgrades[id];
    if (state.points.gte(up.unlockAt)) {
      const btn = document.createElement('button');
      btn.textContent = `${id} Lv.${up.level} — Cost ${up.cost.toString()}`;
      btn.disabled = !canBuy(id);
      btn.onclick = () => { if (buyUpgrade(id)) updateUI(); };
      upgDiv.append(btn);
    }
  }

  dbgDiv.innerHTML = `
    Fade delay: ${getFadeDelay()}s<br>
    Restitution: ${getKineticRestitution().toFixed(2)}
  `;
}