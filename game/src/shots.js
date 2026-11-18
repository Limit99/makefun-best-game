// The screenshot scenes behind ?shot=title|play|boss|win. Each one builds a
// real game state directly — the actual player, enemies, bolts and gems the
// renderer draws every frame — so a screenshot is the game itself at that
// moment, never a mock-up. Positions are fixed, so the same scene always
// renders the same frame.

import { createRandom } from './random.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './hud.js';

function placeEnemies(world, list) {
  for (const [kind, x, y, hpFraction] of list) {
    const e = world.enemies.spawnEnemy(kind, x, y, world.state.wave);
    if (e && hpFraction) e.hp = Math.round(e.maxHp * hpFraction);
  }
}

function scatterGems(world, points) {
  const random = createRandom(7);
  for (const [x, y] of points) world.bullets.dropGem(x, y, 1, random);
}

function fireBolts(world, list) {
  for (const [x, y, angle, hostile] of list) {
    world.bullets.fireBolt(x, y, angle, hostile ? 265 : 640, hostile ? 12 : 12, hostile, 0);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any name other than play/boss/win stages the title.
 */
export function stageShot(name, world) {
  world.resetWorld();
  const state = world.state;
  const player = world.player;
  state.waveActive = true;
  state.toSpawn = 0;
  state.waveBanner = 0;

  if (name === 'play') {
    state.wave = 4;
    state.score = 1240;
    state.kills = 31;
    state.level = 3;
    state.xp = 9;
    state.xpNeeded = 18;
    world.best = 3120;
    player.x = 470;
    player.y = 400;
    player.hp = 76;
    player.aimAngle = -0.5;
    placeEnemies(world, [
      ['chaser', 830, 250], ['chaser', 905, 360], ['chaser', 760, 140],
      ['darter', 980, 520], ['splitter', 250, 160], ['gunner', 1080, 180],
      ['chaser', 180, 520], ['darter', 620, 90],
    ]);
    scatterGems(world, [[560, 330], [600, 360], [700, 470], [390, 300], [880, 470]]);
    fireBolts(world, [
      [520, 375, -0.5, false], [565, 352, -0.5, false], [610, 330, -0.5, false],
      [1035, 200, 2.6, true],
    ]);
    world.particles.burst(845, 255, '#ff5470', 12, 220, 3);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'boss') {
    state.wave = 10;
    state.score = 8650;
    state.kills = 148;
    state.level = 7;
    state.xp = 12;
    state.xpNeeded = 34;
    world.best = 9210;
    player.x = 330;
    player.y = 470;
    player.hp = 58;
    player.aimAngle = -0.42;
    placeEnemies(world, [
      ['boss', 880, 290, 0.55],
      ['chaser', 1060, 520], ['gunner', 1120, 120], ['darter', 700, 590], ['shard', 800, 420],
    ]);
    scatterGems(world, [[430, 420], [470, 445], [520, 400]]);
    fireBolts(world, [
      [385, 448, -0.42, false], [435, 427, -0.42, false], [485, 406, -0.42, false],
      [820, 330, 2.2, true], [930, 250, -2.4, true],
    ]);
    world.particles.burst(800, 240, '#ff2e63', 16, 260, 3.6);
    return { screen: 'boss' };
  }

  if (name === 'win') {
    state.wave = 12;
    state.score = 24750;
    state.kills = 312;
    state.level = 9;
    state.won = true;
    state.over = true;
    world.best = 24750;
    player.x = 640;
    player.y = 360;
    player.hp = 34;
    scatterGems(world, [[520, 300], [760, 300], [640, 460], [470, 420], [810, 420]]);
    world.particles.burst(640, 300, '#52ffa8', 30, 320, 4);
    world.particles.burst(420, 220, '#ffe066', 18, 260, 3.4);
    world.particles.burst(860, 220, '#3ef2c8', 18, 260, 3.4);
    return { screen: SCREEN_VICTORY };
  }

  // Title: the Warden holds the centre while the first wave gathers at the edges.
  world.best = 3120;
  placeEnemies(world, [
    ['chaser', 150, 130], ['chaser', 1130, 150], ['darter', 1080, 560],
    ['splitter', 170, 560], ['gunner', 640, 90],
  ]);
  scatterGems(world, [[520, 250], [760, 250], [640, 500]]);
  return { screen: SCREEN_TITLE };
}
