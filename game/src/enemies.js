// The Voidstorm hostiles. Five behaviours share one pool:
//   chaser   — flies straight at the Warden, the baseline threat
//   darter   — pauses, telegraphs, then lunges in a fast straight dash
//   splitter — a slow heavy hull that breaks into three shards when killed
//   gunner   — keeps its distance and fires aimed bolts
//   boss     — the Void Colossus: huge hull, radial bursts and shard spawns
// updateEnemies moves them and reports what they did (fired a bolt, lunged)
// through the returned events so the world can react with sound and bullets.

import { ENEMY_KINDS, FIELD, waveHpScale } from './config.js';
import { randomEdgePoint } from './random.js';

export const MAX_ENEMIES = 90;
export const EVENT_ENEMY_FIRED = 1;

export function createEnemies(random) {
  const pool = [];
  for (let i = 0; i < MAX_ENEMIES; i += 1) {
    pool.push({
      active: false, kind: 'chaser', x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1,
      radius: 14, speed: 100, score: 0, xp: 0, damage: 10, age: 0, state: 0,
      stateTimer: 0, fireTimer: 0, flash: 0, knockX: 0, knockY: 0, seed: 0,
    });
  }

  function freeEnemy() {
    for (const e of pool) if (!e.active) return e;
    return null;
  }

  function spawnEnemy(kind, x, y, wave) {
    const e = freeEnemy();
    if (e === null) return null;
    const base = ENEMY_KINDS[kind];
    const scale = waveHpScale(wave) * (kind === 'boss' ? 1 + (wave - 10) * 0.35 : 1);
    e.active = true;
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.maxHp = Math.round(base.hp * scale);
    e.hp = e.maxHp;
    e.radius = base.radius;
    e.speed = base.speed * (0.92 + random() * 0.16);
    e.score = base.score;
    e.xp = base.xp;
    e.damage = base.damage;
    e.age = 0;
    e.state = 0;
    e.stateTimer = 0.6 + random() * 0.9;
    e.fireTimer = 1.1 + random() * 1.2;
    e.flash = 0;
    e.knockX = 0;
    e.knockY = 0;
    e.seed = random() * Math.PI * 2;
    return e;
  }

  /** Spawn a regular enemy just outside a random arena edge. */
  function spawnAtEdge(kind, wave) {
    const p = randomEdgePoint(random, FIELD.width, FIELD.height, 60);
    return spawnEnemy(kind, p.x, p.y, wave);
  }

  function countActive() {
    let n = 0;
    for (const e of pool) if (e.active) n += 1;
    return n;
  }

  function steer(e, player, dt, speedScale) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    e.vx = (dx / dist) * e.speed * speedScale;
    e.vy = (dy / dist) * e.speed * speedScale;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    return dist;
  }

  function updateDarter(e, player, dt) {
    e.stateTimer -= dt;
    if (e.state === 0) { // approach, slower than its full pace
      steer(e, player, dt, 0.55);
      if (e.stateTimer <= 0) { e.state = 1; e.stateTimer = 0.42; }
    } else if (e.state === 1) { // telegraph: hold still and shiver
      e.x += (random() - 0.5) * 1.6;
      e.y += (random() - 0.5) * 1.6;
      if (e.stateTimer <= 0) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        e.vx = (dx / dist) * e.speed * 2.6;
        e.vy = (dy / dist) * e.speed * 2.6;
        e.state = 2;
        e.stateTimer = 0.5;
      }
    } else { // lunging
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.stateTimer <= 0) { e.state = 0; e.stateTimer = 0.7 + random() * 0.8; }
    }
  }

  function updateGunner(e, player, dt, fire) {
    const dist = steer(e, player, dt, 0.8);
    if (dist < 300) { // back away to firing range
      e.x -= e.vx * dt * 1.6;
      e.y -= e.vy * dt * 1.6;
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && dist < 560) {
      e.fireTimer = 1.7 + random() * 0.7;
      fire.push({ x: e.x, y: e.y, angle: Math.atan2(player.y - e.y, player.x - e.x) });
    }
  }

  function updateBoss(e, player, dt, fire) {
    steer(e, player, dt, 0.7);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 2.3;
      const base = random() * Math.PI * 2;
      const bolts = 10;
      for (let i = 0; i < bolts; i += 1) {
        fire.push({ x: e.x, y: e.y, angle: base + (i / bolts) * Math.PI * 2 });
      }
      if (e.hp < e.maxHp * 0.5) { // wounded colossus also spits shards
        for (let i = 0; i < 3; i += 1) {
          const shard = spawnEnemy('shard', e.x + (random() - 0.5) * 60, e.y + (random() - 0.5) * 60, 1);
          if (shard) shard.hp = shard.maxHp;
        }
      }
    }
  }

  /**
   * Advance every enemy one step. `fire` is an out-array of {x, y, angle}
   * bolt requests. Returns EVENT_* flags.
   */
  function updateEnemies(dt, player) {
    let events = 0;
    const fire = updateEnemies.pendingFire;
    fire.length = 0;
    for (const e of pool) {
      if (!e.active) continue;
      e.age += dt;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 6);
      // Knockback from bullet hits decays fast so heavy hulls barely drift.
      e.x += e.knockX * dt;
      e.y += e.knockY * dt;
      e.knockX *= Math.max(0, 1 - 9 * dt);
      e.knockY *= Math.max(0, 1 - 9 * dt);
      if (e.kind === 'chaser' || e.kind === 'shard' || e.kind === 'splitter') steer(e, player, dt, 1);
      else if (e.kind === 'darter') updateDarter(e, player, dt);
      else if (e.kind === 'gunner') updateGunner(e, player, dt, fire);
      else if (e.kind === 'boss') updateBoss(e, player, dt, fire);
      if (fire.length > 0) events |= EVENT_ENEMY_FIRED;
    }
    return events;
  }
  updateEnemies.pendingFire = [];

  function clearEnemies() {
    for (const e of pool) e.active = false;
  }

  return { pool, spawnEnemy, spawnAtEdge, countActive, updateEnemies, clearEnemies };
}
