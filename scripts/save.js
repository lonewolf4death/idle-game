// scripts/save.js
import { state } from './upgrades.js';
import Break_Infinity from 'https://esm.sh/break_infinity.js@2.1.0';

const KEY = 'idlePhysicsSave';

export function saveState() {
  localStorage.setItem(KEY, JSON.stringify({
    points: state.points.toString(),
    upgrades: {
      transient: {
        level: state.upgrades.transient.level,
        cost: state.upgrades.transient.cost.toString(),
        unlockAt: state.upgrades.transient.unlockAt.toString()
      },
      kinetic: {
        level: state.upgrades.kinetic.level,
        cost: state.upgrades.kinetic.cost.toString(),
        unlockAt: state.upgrades.kinetic.unlockAt.toString()
      }
    }
  }));
}

export function loadState() {
  const data = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (data) {
    state.points = new Break_Infinity(data.points);
    ['transient', 'kinetic'].forEach(id => {
      const upData = data.upgrades[id];
      state.upgrades[id].level = upData.level;
      state.upgrades[id].cost = new Break_Infinity(upData.cost);
      state.upgrades[id].unlockAt = new Break_Infinity(upData.unlockAt);
    });
  }
}