// Projectiles and XP gems. Player bolts fly straight and can pierce when
// upgraded; enemy bolts are slower and aimed (or radial, from a boss). Gems
// drift where they fell until the Warden's magnet pulls them in.

import { BULLET, FIELD, GEM } from './config.js';

export const MAX_BULLETS = 260;
export const MAX_GEMS = 160;

export function createBullets() {
  const bolts = [];
  for (let i = 0; i < MAX_BULLETS; i += 1) {
    bolts.push({ active: false, hostile: false, x: 0, y: 0, vx: 0, vy: 0, radius: 4, damage: 0, life: 0, pierce: 0 });
  }
  const gems = [];
  for (let i = 0; i < MAX_GEMS; i += 1) {
    gems.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, value: 1, age: 0 });
  }

  function freeBolt() {
    for (const b of bolts) if (!b.active) return b;
    return null;
  }

  function fireBolt(x, y, angle, speed, damage, hostile, pierce) {
    const b = freeBolt();
    if (b === null) return;
    b.active = true;
    b.hostile = hostile;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.radius = hostile ? BULLET.enemyRadius : 5;
    b.damage = damage;
    b.life = hostile ? BULLET.enemyLife : BULLET.life;
    b.pierce = pierce;
  }

  /** A fan of player bolts: count shots spread symmetrically around the aim. */
  function firePlayerFan(player, speed) {
    const count = player.bulletCount;
    const spreadStep = 0.11;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spreadStep;
      fireBolt(player.x, player.y, player.aimAngle + offset, speed, player.bulletDamage, false, player.pierce);
    }
  }

  function dropGem(x, y, value, random) {
    for (const g of gems) {
      if (g.active) continue;
      g.active = true;
      g.x = x;
      g.y = y;
      g.vx = (random() - 0.5) * 90;
      g.vy = (random() - 0.5) * 90;
      g.value = value;
      g.age = 0;
      return;
    }
  }

  function updateBullets(dt) {
    for (const b of bolts) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -40 || b.x > FIELD.width + 40 || b.y < -40 || b.y > FIELD.height + 40) b.active = false;
    }
  }

  /** Move gems; returns the XP value of every gem the player collected this step. */
  function updateGems(dt, player) {
    let collected = 0;
    for (const g of gems) {
      if (!g.active) continue;
      g.age += dt;
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < player.magnetRadius) {
        const pull = GEM.magnetSpeed * (1.15 - dist / Math.max(1, player.magnetRadius));
        g.vx = (dx / Math.max(1, dist)) * pull;
        g.vy = (dy / Math.max(1, dist)) * pull;
      } else {
        g.vx *= Math.max(0, 1 - 4 * dt);
        g.vy *= Math.max(0, 1 - 4 * dt);
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (dist < player.radius + GEM.radius + 4) {
        g.active = false;
        collected += g.value;
      }
    }
    return collected;
  }

  function clearBullets() {
    for (const b of bolts) b.active = false;
    for (const g of gems) g.active = false;
  }

  return { bolts, gems, fireBolt, firePlayerFan, dropGem, updateBullets, updateGems, clearBullets };
}
