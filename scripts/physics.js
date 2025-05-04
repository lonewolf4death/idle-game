// scripts/physics.js
import Matter from 'https://esm.sh/matter-js@0.20.0';
const { Engine, Render, World, Bodies, Events, Body } = Matter;
import { getKineticRestitution, getFadeDelay } from './upgrades.js';

export const engine = Engine.create();
export const world = engine.world;
world.gravity.y = 0;

export const render = Render.create({
  element: document.getElementById('game-container'),
  canvas: document.getElementById('world'),
  engine,
  options: { wireframes: false, width: 800, height: 600 }
});
Render.run(render);
Engine.run(engine);

export const dots = new Set();

export function spawnDot(x, y) {
  const restitution = getKineticRestitution();
  const radius = 8;
  const dot = Bodies.circle(x, y, radius, {
    restitution,
    frictionAir: 0.01,
    render: { fillStyle: '#fff' }
  });

  Body.setVelocity(dot, {
    x: (Math.random() * 2 - 1) * 2,
    y: (Math.random() * 2 - 1) * 2
  });

  World.add(world, dot);
  dots.add(dot);

  setTimeout(() => {
    if (dots.has(dot)) {
      World.remove(world, dot);
      dots.delete(dot);
    }
  }, getFadeDelay() * 1000);

  return dot;
}

export function onCollision(fn) {
  Events.on(engine, 'collisionStart', ev => {
    ev.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      if (dots.has(bodyA) && dots.has(bodyB)) fn(bodyA, bodyB);
    });
  });
}