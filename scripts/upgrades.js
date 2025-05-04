// scripts/upgrades.js
import Break_Infinity from 'https://esm.sh/break_infinity.js@2.1.0';

export const state = {
  points: new Break_Infinity(0),
  upgrades: {
    transient: { level: 0, cost: new Break_Infinity(50), unlockAt: new Break_Infinity(50) },
    kinetic:   { level: 0, cost: new Break_Infinity(10), unlockAt: new Break_Infinity(10) }
  }
};

export function getFadeDelay() {
  return 3 + state.upgrades.transient.level;
}

export function getKineticRestitution() {
  return Math.min(1, 0.1 + state.upgrades.kinetic.level * 0.1);
}

export function canBuy(id) {
  const up = state.upgrades[id];
  return state.points.gte(up.cost) && state.points.gte(up.unlockAt);
}

export function buyUpgrade(id) {
  const up = state.upgrades[id];
  if (canBuy(id)) {
    state.points = state.points.minus(up.cost);
    up.level++;
    up.cost = up.cost.mul(1.5).ceil();
    return true;
  }
  return false;
}