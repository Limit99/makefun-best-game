// Drawing the arena and everything in it: the starfield grid, gems, bolts,
// enemies (each kind with its own neon silhouette), the Warden, particles
// and the boss health bar. Screen panels and the HUD live in hud.js; this
// file only paints the world itself. The 1280x720 field is scaled to fit
// the window and centred, with screen shake applied on top.

import { FIELD, PALETTE } from './config.js';

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resizeRenderer() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  /** Convert a client (mouse) point into field coordinates. */
  function toField(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.x) / view.scale,
      y: (clientY * ratio - view.y) / view.scale,
    };
  }

  function drawArena(state) {
    context.fillStyle = PALETTE.arena;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 64; x < FIELD.width; x += 64) { context.moveTo(x, 0); context.lineTo(x, FIELD.height); }
    for (let y = 64; y < FIELD.height; y += 64) { context.moveTo(0, y); context.lineTo(FIELD.width, y); }
    context.stroke();
    // Slow star specks drifting with time, so the arena never looks frozen.
    context.fillStyle = '#26315e';
    for (let i = 0; i < 46; i += 1) {
      const sx = ((i * 173.3) % FIELD.width + state.time * (4 + (i % 5))) % FIELD.width;
      const sy = (i * 97.7) % FIELD.height;
      context.fillRect(sx, sy, 2.4, 2.4);
    }
    context.strokeStyle = PALETTE.arenaEdge;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, FIELD.width - 3, FIELD.height - 3);
  }

  function drawGem(g) {
    const pulse = 1 + Math.sin(g.age * 6) * 0.18;
    context.save();
    context.translate(g.x, g.y);
    context.rotate(Math.PI / 4);
    context.fillStyle = PALETTE.gem;
    const s = 7 * pulse;
    context.fillRect(-s / 2, -s / 2, s, s);
    context.restore();
  }

  function drawBolt(b) {
    context.fillStyle = b.hostile ? PALETTE.enemyBullet : PALETTE.bullet;
    context.beginPath();
    context.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.35;
    context.beginPath();
    context.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.radius * 0.7, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function polygon(points, fill, stroke) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i][0], points[i][1]);
    context.closePath();
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 2; context.stroke(); }
  }

  function drawEnemy(e) {
    const color = e.flash > 0.4 ? '#ffffff' : PALETTE[e.kind];
    const angle = Math.atan2(e.vy, e.vx);
    context.save();
    context.translate(e.x, e.y);
    if (e.kind === 'chaser') {
      context.rotate(angle);
      polygon([[-e.radius, -e.radius * 0.8], [e.radius, 0], [-e.radius, e.radius * 0.8], [-e.radius * 0.45, 0]], color, null);
    } else if (e.kind === 'darter') {
      context.rotate(angle);
      const stretch = e.state === 2 ? 1.35 : 1;
      polygon([[-e.radius * stretch, -e.radius * 0.55], [e.radius * stretch, 0], [-e.radius * stretch, e.radius * 0.55]], color, null);
      if (e.state === 1) { // telegraph ring while it lines up its lunge
        context.strokeStyle = PALETTE.darter;
        context.globalAlpha = 0.6 + Math.sin(e.age * 30) * 0.3;
        context.beginPath();
        context.arc(0, 0, e.radius + 7, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
    } else if (e.kind === 'splitter') {
      context.rotate(e.seed + e.age * 0.7);
      const r = e.radius;
      polygon([[0, -r], [r * 0.87, -r * 0.5], [r * 0.87, r * 0.5], [0, r], [-r * 0.87, r * 0.5], [-r * 0.87, -r * 0.5]], color, '#ffffff33');
      context.fillStyle = '#2a1052';
      context.beginPath();
      context.arc(0, 0, r * 0.38, 0, Math.PI * 2);
      context.fill();
    } else if (e.kind === 'shard') {
      context.rotate(e.seed + e.age * 3);
      polygon([[0, -e.radius], [e.radius, e.radius], [-e.radius, e.radius]], color, null);
    } else if (e.kind === 'gunner') {
      context.rotate(angle);
      context.beginPath();
      context.arc(0, 0, e.radius, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.fillStyle = '#082f3f';
      context.beginPath();
      context.arc(e.radius * 0.35, 0, e.radius * 0.42, 0, Math.PI * 2);
      context.fill();
    } else if (e.kind === 'boss') {
      context.rotate(e.seed + e.age * 0.35);
      const r = e.radius;
      const spikes = [];
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        spikes.push([Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18]);
        const a2 = a + Math.PI / 8;
        spikes.push([Math.cos(a2) * r * 0.78, Math.sin(a2) * r * 0.78]);
      }
      polygon(spikes, color, '#ffd6e0');
      context.fillStyle = '#4a0e22';
      context.beginPath();
      context.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = e.flash > 0.4 ? '#ffffff' : '#ffd166';
      context.beginPath();
      context.arc(0, 0, r * 0.26, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    // A thin health tick over anything tougher than a basic hull.
    if (e.maxHp >= 30 && e.hp < e.maxHp && e.kind !== 'boss') {
      context.fillStyle = '#00000088';
      context.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 4);
      context.fillStyle = color;
      context.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2 * (e.hp / e.maxHp), 4);
    }
  }

  function drawPlayer(player, time) {
    if (player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) context.globalAlpha = 0.35;
    context.save();
    context.translate(player.x, player.y);
    context.rotate(player.aimAngle);
    // Thruster flame behind the ship while it moves.
    if (player.thrust > 0) {
      context.fillStyle = '#ff9f43';
      const flame = 12 + Math.sin(time * 40) * 4;
      polygon([[-player.radius - 2, -5], [-player.radius - 2 - flame, 0], [-player.radius - 2, 5]], '#ff9f43', null);
    }
    polygon([[player.radius + 6, 0], [-player.radius, -player.radius * 0.85], [-player.radius * 0.45, 0], [-player.radius, player.radius * 0.85]], PALETTE.player, '#eafffa');
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.arc(2, 0, 4.6, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (player.invulnerable > 0) { // the shield ring that says "just hit, briefly safe"
      context.strokeStyle = PALETTE.player;
      context.globalAlpha = 0.55;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 8 + Math.sin(time * 18) * 1.6, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawParticles(particles) {
    for (const p of particles.pool) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    context.globalAlpha = 1;
  }

  function drawBossBar(enemies) {
    for (const e of enemies.pool) {
      if (!e.active || e.kind !== 'boss') continue;
      const width = 560;
      const x = (FIELD.width - width) / 2;
      context.fillStyle = '#00000099';
      context.fillRect(x, FIELD.height - 34, width, 13);
      context.fillStyle = PALETTE.boss;
      context.fillRect(x + 1.5, FIELD.height - 32.5, (width - 3) * Math.max(0, e.hp / e.maxHp), 10);
      context.fillStyle = PALETTE.text;
      context.font = '15px ' + '"Segoe UI", system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('VOID COLOSSUS', FIELD.width / 2, FIELD.height - 42);
    }
  }

  /** Paint the whole world for one frame. */
  function drawWorld(world) {
    const state = world.state;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawArena(state);
    for (const g of world.bullets.gems) if (g.active) drawGem(g);
    for (const e of world.enemies.pool) if (e.active) drawEnemy(e);
    if (!state.over || state.won) drawPlayer(world.player, state.time);
    for (const b of world.bullets.bolts) if (b.active) drawBolt(b);
    drawParticles(world.particles);
    drawBossBar(world.enemies);
  }

  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
  return { drawWorld, toField, view };
}
