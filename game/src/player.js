// The Pulse Warden: the player's ship. Holds its stats (which upgrades
// rewrite), moves it inside the arena, and tracks the brief invulnerability
// after a hit so one swarm cannot drain the hull in a single frame.

import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    bulletDamage: PLAYER.bulletDamage,
    bulletCount: 1,
    pierce: 0,
    magnetRadius: 90,
    regen: 0,
    invulnerable: 0,
    aimAngle: -Math.PI / 2,
    thrust: 0,
  };

  function resetPlayer() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.hp = PLAYER.maxHp;
    player.maxHp = PLAYER.maxHp;
    player.speed = PLAYER.speed;
    player.fireInterval = PLAYER.fireInterval;
    player.fireTimer = 0;
    player.bulletDamage = PLAYER.bulletDamage;
    player.bulletCount = 1;
    player.pierce = 0;
    player.magnetRadius = 90;
    player.regen = 0;
    player.invulnerable = 0;
    player.aimAngle = -Math.PI / 2;
    player.thrust = 0;
  }

  /** Move by the input direction for one step and keep the ship in the arena. */
  function movePlayer(dt, direction) {
    player.x += direction.x * player.speed * dt;
    player.y += direction.y * player.speed * dt;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y));
    player.thrust = Math.min(1, Math.hypot(direction.x, direction.y));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.regen > 0 && player.hp > 0) player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
    if (player.fireTimer > 0) player.fireTimer = Math.max(0, player.fireTimer - dt);
  }

  /** Aim from the ship toward a field point (the mouse). */
  function aimPlayerAt(point) {
    player.aimAngle = Math.atan2(point.y - player.y, point.x - player.x);
  }

  return { player, resetPlayer, movePlayer, aimPlayerAt };
}
