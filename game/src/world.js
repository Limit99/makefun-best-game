// The world's rules and state, with no drawing and no browser in it: waves,
// spawning, shooting, collisions, score, XP and levels. stepWorld advances
// one fixed step and returns what happened as bit flags, so the caller can
// answer with sound and screens without the world knowing about either.

import { BOSS_WAVES, FINAL_WAVE, PLAYER, WAVE_MIX, waveSpawnCount, waveSpawnInterval, xpForLevel } from './config.js';
import { createPlayer } from './player.js';
import { createEnemies, EVENT_ENEMY_FIRED } from './enemies.js';
import { createBullets } from './bullets.js';
import { createParticles } from './particles.js';
import { drawUpgradeChoices } from './upgrades.js';
import { PALETTE } from './config.js';

export const EVENT_SHOT = 1;
export const EVENT_KILL = 2;
export const EVENT_BOSS_DOWN = 4;
export const EVENT_HURT = 8;
export const EVENT_PICKUP = 16;
export const EVENT_WAVE_CLEAR = 32;
export const EVENT_LEVEL_UP = 64;
export const EVENT_VICTORY = 128;
export const EVENT_DEFEAT = 256;
export const EVENT_ENEMY_SHOT = 512;

function circlesHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const playerKit = createPlayer();
  const enemyKit = createEnemies(random);
  const bulletKit = createBullets();
  const particleKit = createParticles(random);
  const player = playerKit.player;

  const state = {
    wave: 1,
    score: 0,
    kills: 0,
    xp: 0,
    level: 1,
    xpNeeded: xpForLevel(1),
    pendingLevels: 0,
    choices: [],
    toSpawn: 0,
    spawnTimer: 0,
    bossSpawned: false,
    waveActive: false,
    waveBanner: 0,
    intermission: 0,
    shake: 0,
    time: 0,
    over: false,
    won: false,
  };

  function pickKind(wave) {
    const mix = WAVE_MIX[wave];
    let total = 0;
    for (const [, weight] of mix) total += weight;
    let roll = random() * total;
    for (const [kind, weight] of mix) {
      roll -= weight;
      if (roll <= 0) return kind;
    }
    return mix[0][0];
  }

  function startWave(wave) {
    state.wave = wave;
    state.toSpawn = waveSpawnCount(wave);
    state.spawnTimer = 0.4;
    state.bossSpawned = !BOSS_WAVES.includes(wave);
    state.waveActive = true;
    state.waveBanner = 2.1;
    state.intermission = 0;
  }

  function resetWorld() {
    playerKit.resetPlayer();
    enemyKit.clearEnemies();
    bulletKit.clearBullets();
    particleKit.clearParticles();
    state.score = 0;
    state.kills = 0;
    state.xp = 0;
    state.level = 1;
    state.xpNeeded = xpForLevel(1);
    state.pendingLevels = 0;
    state.choices = [];
    state.shake = 0;
    state.time = 0;
    state.over = false;
    state.won = false;
    startWave(1);
  }

  function spawnStep(dt) {
    if (!state.bossSpawned) {
      state.bossSpawned = true;
      const boss = enemyKit.spawnEnemy('boss', 640, -70, state.wave);
      if (boss) state.shake = Math.max(state.shake, 7);
    }
    if (state.toSpawn <= 0) return;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer += waveSpawnInterval(state.wave);
      state.toSpawn -= 1;
      enemyKit.spawnAtEdge(pickKind(state.wave), state.wave);
    }
  }

  function killEnemy(e, events) {
    e.active = false;
    state.score += e.score;
    state.kills += 1;
    particleKit.burst(e.x, e.y, PALETTE[e.kind] || '#ffffff', e.kind === 'boss' ? 60 : 14, e.kind === 'boss' ? 380 : 240, e.kind === 'boss' ? 4.5 : 3);
    bulletKit.dropGem(e.x, e.y, e.xp, random);
    if (e.kind === 'splitter') {
      for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * Math.PI * 2 + random();
        const shard = enemyKit.spawnEnemy('shard', e.x + Math.cos(angle) * 18, e.y + Math.sin(angle) * 18, state.wave);
        if (shard) { shard.knockX = Math.cos(angle) * 160; shard.knockY = Math.sin(angle) * 160; }
      }
    }
    if (e.kind === 'boss') {
      state.shake = Math.max(state.shake, 14);
      return events | EVENT_BOSS_DOWN | EVENT_KILL;
    }
    return events | EVENT_KILL;
  }

  function bulletStep(events) {
    // Player bolts against enemies.
    for (const b of bulletKit.bolts) {
      if (!b.active) continue;
      if (b.hostile) {
        if (player.invulnerable <= 0 && circlesHit(b.x, b.y, b.radius, player.x, player.y, player.radius - 2)) {
          b.active = false;
          events = hurtPlayer(b.damage, events);
        }
        continue;
      }
      for (const e of enemyKit.pool) {
        if (!e.active) continue;
        if (!circlesHit(b.x, b.y, b.radius, e.x, e.y, e.radius)) continue;
        e.hp -= b.damage;
        e.flash = 1;
        e.knockX += b.vx * 0.14;
        e.knockY += b.vy * 0.14;
        particleKit.spray(b.x, b.y, Math.atan2(b.vy, b.vx), PALETTE.bullet, 2);
        if (e.hp <= 0) events = killEnemy(e, events);
        if (b.pierce > 0) b.pierce -= 1;
        else { b.active = false; }
        break;
      }
    }
    return events;
  }

  function hurtPlayer(damage, events) {
    player.hp -= damage;
    player.invulnerable = PLAYER.contactInvulnerable;
    state.shake = Math.max(state.shake, 8);
    particleKit.burst(player.x, player.y, PALETTE.danger, 16, 260, 3);
    if (player.hp <= 0) {
      player.hp = 0;
      state.over = true;
      particleKit.burst(player.x, player.y, PALETTE.player, 70, 420, 4.5);
      return events | EVENT_HURT | EVENT_DEFEAT;
    }
    return events | EVENT_HURT;
  }

  function contactStep(events) {
    if (player.invulnerable > 0) return events;
    for (const e of enemyKit.pool) {
      if (!e.active) continue;
      if (circlesHit(e.x, e.y, e.radius - 3, player.x, player.y, player.radius)) {
        if (e.kind !== 'boss') {
          e.active = false;
          particleKit.burst(e.x, e.y, PALETTE[e.kind] || '#ffffff', 12, 220, 3);
        }
        return hurtPlayer(e.damage, events);
      }
    }
    return events;
  }

  function xpStep(events) {
    const gained = bulletKit.updateGems(STEP_GEMS, player);
    if (gained > 0) {
      state.xp += gained;
      particleKit.glint(player.x, player.y - 18, PALETTE.gem);
      events |= EVENT_PICKUP;
      while (state.xp >= state.xpNeeded) {
        state.xp -= state.xpNeeded;
        state.level += 1;
        state.xpNeeded = xpForLevel(state.level);
        state.pendingLevels += 1;
      }
    }
    return events;
  }

  const STEP_GEMS = 1 / 60;

  function waveStep(events) {
    const cleared = state.waveActive && state.toSpawn <= 0 && enemyKit.countActive() === 0;
    if (!cleared) return events;
    state.waveActive = false;
    events |= EVENT_WAVE_CLEAR;
    if (state.wave >= FINAL_WAVE) {
      state.won = true;
      state.over = true;
      return events | EVENT_VICTORY;
    }
    if (state.pendingLevels > 0) {
      state.pendingLevels -= 1;
      state.choices = drawUpgradeChoices(random, player, 3);
      return events | EVENT_LEVEL_UP;
    }
    state.intermission = 1.6;
    return events;
  }

  /**
   * Advance the world one fixed step. `input` is {move:{x,y}, aim:{x,y}, firing}.
   * Returns EVENT_* flags for sound and screen changes.
   */
  function stepWorld(dt, input) {
    let events = 0;
    state.time += dt;
    playerKit.movePlayer(dt, input.move);
    playerKit.aimPlayerAt(input.aim);

    if (input.firing && player.fireTimer <= 0 && !state.over) {
      player.fireTimer = player.fireInterval;
      bulletKit.firePlayerFan(player, PLAYER.bulletSpeed);
      particleKit.spray(player.x + Math.cos(player.aimAngle) * 18, player.y + Math.sin(player.aimAngle) * 18, player.aimAngle, PALETTE.bullet, 2);
      events |= EVENT_SHOT;
    }

    spawnStep(dt);
    const enemyEvents = enemyKit.updateEnemies(dt, player);
    if (enemyEvents & EVENT_ENEMY_FIRED) {
      events |= EVENT_ENEMY_SHOT;
      for (const f of enemyKit.updateEnemies.pendingFire) {
        bulletKit.fireBolt(f.x, f.y, f.angle, 265, 12, true, 0);
      }
    }
    bulletKit.updateBullets(dt);
    events = bulletStep(events);
    events = contactStep(events);
    events = xpStep(events);
    particleKit.updateParticles(dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.waveBanner > 0) state.waveBanner = Math.max(0, state.waveBanner - dt);
    if (!state.over) events = waveStep(events);
    if (state.intermission > 0) {
      state.intermission -= dt;
      if (state.intermission <= 0 && !state.waveActive && !state.over) startWave(state.wave + 1);
    }
    return events;
  }

  /** Apply the chosen upgrade card and open the next wave (or chain choices). */
  function applyChoice(index) {
    const choice = state.choices[index];
    if (!choice) return false;
    choice.apply(player);
    state.choices = [];
    if (state.pendingLevels > 0) {
      state.pendingLevels -= 1;
      state.choices = drawUpgradeChoices(random, player, 3);
      return true;
    }
    startWave(state.wave + 1);
    return true;
  }

  resetWorld();

  return {
    state, player, enemies: enemyKit, bullets: bulletKit, particles: particleKit,
    resetWorld, stepWorld, applyChoice, startWave,
  };
}
