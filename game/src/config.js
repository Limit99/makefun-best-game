// Voidstorm Arena — every tuning number and colour in one place.
// The arena is a fixed 1280x720 logical field; the renderer scales it to the
// window, so no rule below depends on the real screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second at any refresh rate. */
export const STEP = 1 / 60;

/** The last wave. Clear it — final boss included — and the run is won. */
export const FINAL_WAVE = 12;

/** Waves that end with a boss guarding the arena. */
export const BOSS_WAVES = [5, 10, 12];

export const PLAYER = {
  radius: 15,
  speed: 272,
  maxHp: 100,
  fireInterval: 0.21,
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 5,
  contactInvulnerable: 0.7,
};

export const BULLET = { life: 0.95, enemySpeed: 265, enemyRadius: 6, enemyLife: 3.2 };

export const GEM = { radius: 7, magnetSpeed: 430, xpSmall: 1 };

/** Enemy blueprints: hull, pace, size, score and XP value per kind. */
export const ENEMY_KINDS = {
  chaser: { hp: 22, speed: 118, radius: 16, score: 40, xp: 1, damage: 11 },
  darter: { hp: 14, speed: 208, radius: 12, score: 60, xp: 1, damage: 9 },
  splitter: { hp: 40, speed: 82, radius: 22, score: 80, xp: 2, damage: 13 },
  shard: { hp: 10, speed: 178, radius: 10, score: 25, xp: 1, damage: 7 },
  gunner: { hp: 30, speed: 96, radius: 17, score: 110, xp: 2, damage: 10 },
  boss: { hp: 620, speed: 56, radius: 52, score: 1500, xp: 14, damage: 22 },
};

/** Which kinds may spawn on a wave, and their relative weights. */
export const WAVE_MIX = [
  null,
  [['chaser', 1]],
  [['chaser', 0.8], ['darter', 0.35]],
  [['chaser', 0.75], ['darter', 0.4], ['splitter', 0.25]],
  [['chaser', 0.7], ['darter', 0.45], ['splitter', 0.3], ['gunner', 0.25]],
  [['chaser', 0.7], ['darter', 0.4], ['gunner', 0.3]],
  [['chaser', 0.65], ['darter', 0.5], ['splitter', 0.35], ['gunner', 0.3]],
  [['chaser', 0.6], ['darter', 0.55], ['splitter', 0.35], ['gunner', 0.35]],
  [['chaser', 0.6], ['darter', 0.6], ['splitter', 0.4], ['gunner', 0.4]],
  [['chaser', 0.55], ['darter', 0.6], ['splitter', 0.45], ['gunner', 0.45]],
  [['chaser', 0.6], ['darter', 0.55], ['gunner', 0.45]],
  [['chaser', 0.55], ['darter', 0.65], ['splitter', 0.5], ['gunner', 0.5]],
  [['chaser', 0.6], ['darter', 0.6], ['splitter', 0.45], ['gunner', 0.5]],
];

/** Enemies to spawn on wave n (bosses come on top of this). */
export function waveSpawnCount(wave) {
  return 7 + wave * 3;
}

/** Seconds between spawns on wave n: the pressure valve of the difficulty curve. */
export function waveSpawnInterval(wave) {
  return Math.max(0.34, 1.05 - wave * 0.06);
}

/** Hull multiplier so late-wave enemies stay meaningful against upgraded guns. */
export function waveHpScale(wave) {
  return 1 + (wave - 1) * 0.16;
}

/** XP needed to earn the upgrade offered after wave n. */
export function xpForLevel(level) {
  return 6 + level * 4;
}

export const PALETTE = {
  backdrop: '#05060e',
  arena: '#0b0e1d',
  arenaEdge: '#2b3a6e',
  grid: '#141a33',
  player: '#3ef2c8',
  playerCore: '#eafffa',
  bullet: '#ffe066',
  enemyBullet: '#ff5d8f',
  chaser: '#ff5470',
  darter: '#ffb347',
  splitter: '#c77dff',
  shard: '#e0aaff',
  gunner: '#4cc9f0',
  boss: '#ff2e63',
  gem: '#52ffa8',
  text: '#eef4ff',
  muted: '#8b9bbd',
  danger: '#ff5470',
  panel: '#10142a',
  panelEdge: '#3ef2c8',
  xp: '#52ffa8',
  hp: '#3ef2c8',
  hpLow: '#ff5470',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'voidstorm-arena.best';
