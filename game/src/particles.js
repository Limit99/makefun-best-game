// A fixed pool of particles: sparks, explosion shards and pickup glints.
// Bursts write into the pool, updateParticles ages them, and the renderer
// reads the pool — nothing allocates while the game runs.

export const MAX_PARTICLES = 420;

export function createParticles(random) {
  const pool = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 1 });
  }
  let cursor = 0;

  function spawn(x, y, vx, vy, life, size, color, drag) {
    const p = pool[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.drag = drag;
  }

  return {
    pool,
    /** A radial burst of shards, for enemy deaths and boss hits. */
    burst(x, y, color, count, speed, size) {
      for (let i = 0; i < count; i += 1) {
        const angle = random() * Math.PI * 2;
        const pace = speed * (0.3 + random() * 0.9);
        spawn(x, y, Math.cos(angle) * pace, Math.sin(angle) * pace, 0.35 + random() * 0.45, size * (0.6 + random() * 0.8), color, 3.2);
      }
    },
    /** A short directional spray, for muzzle sparks and thruster trails. */
    spray(x, y, angle, color, count) {
      for (let i = 0; i < count; i += 1) {
        const spread = angle + (random() - 0.5) * 0.7;
        const pace = 120 + random() * 180;
        spawn(x, y, Math.cos(spread) * pace, Math.sin(spread) * pace, 0.14 + random() * 0.12, 2.4, color, 4.5);
      }
    },
    /** A soft rising glint, for XP pickups and level-ups. */
    glint(x, y, color) {
      spawn(x, y, (random() - 0.5) * 30, -60 - random() * 50, 0.5, 3, color, 0.6);
    },
    updateParticles(dt) {
      for (const p of pool) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },
    clearParticles() {
      for (const p of pool) p.active = false;
    },
  };
}
