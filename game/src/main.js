// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between six screens: title, play, paused, upgrade choice, victory and
// game over. World events (shots, kills, hurts, wave clears) are answered
// here with sound, because the world itself knows nothing of audio.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|boss|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_BOSS_DOWN, EVENT_DEFEAT, EVENT_ENEMY_SHOT, EVENT_HURT,
  EVENT_KILL, EVENT_LEVEL_UP, EVENT_PICKUP, EVENT_SHOT, EVENT_VICTORY, EVENT_WAVE_CLEAR,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_PICK_1, ACTION_PICK_2, ACTION_PICK_3, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { upgradeCardRects } from './upgrades.js';
import { FIELD } from './config.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const hud = createHud(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  world.best = world.best || readBest();
  let painted = 0;
  function paint() {
    renderer.drawWorld(world);
    const remaining = world.state.toSpawn + world.enemies.countActive();
    hud.drawOverlay(world, scene.screen, remaining);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toField);
  let screen = SCREEN_TITLE;
  let best = readBest();
  world.best = best;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.resetWorld();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1 of 12.');
  }

  function finishRun(won) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    world.best = best;
    screen = won ? SCREEN_VICTORY : SCREEN_OVER;
    if (won) audio.victory();
    else audio.gameOver();
    announce(won ? `Victory. Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function reactToEvents(events) {
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_ENEMY_SHOT) audio.enemyHit();
    if (events & EVENT_KILL) audio.explosion(false);
    if (events & EVENT_BOSS_DOWN) audio.explosion(true);
    if (events & EVENT_HURT) audio.playerHurt();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_LEVEL_UP) {
      audio.levelUp();
      screen = SCREEN_UPGRADE;
      announce(`Wave cleared. Choose upgrade 1, 2 or 3.`);
    } else if (events & EVENT_WAVE_CLEAR) audio.waveClear();
    if (events & EVENT_VICTORY) finishRun(true);
    else if (events & EVENT_DEFEAT) finishRun(false);
  }

  function pickUpgrade(index) {
    if (world.applyChoice(index)) {
      audio.unlock();
      screen = world.state.choices.length > 0 ? SCREEN_UPGRADE : SCREEN_PLAY;
      announce(screen === SCREEN_PLAY ? `Wave ${world.state.wave}.` : 'Choose another upgrade.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicked = input.takeClick();
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startGame();
    else if ((screen === SCREEN_OVER || screen === SCREEN_VICTORY) && (actions & ACTION_CONFIRM)) startGame();
    else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_PICK_1) pickUpgrade(0);
      else if (actions & ACTION_PICK_2) pickUpgrade(1);
      else if (actions & ACTION_PICK_3) pickUpgrade(2);
      else if (clicked) {
        const rects = upgradeCardRects(FIELD);
        const index = rects.findIndex((r) => input.mouse.x >= r.x && input.mouse.x <= r.x + r.width && input.mouse.y >= r.y && input.mouse.y <= r.y + r.height);
        if (index >= 0) pickUpgrade(index);
      }
    }
    if (clicked && screen === SCREEN_PLAY) audio.unlock();
  }

  function hoverCard() {
    if (screen !== SCREEN_UPGRADE) {
      world.hoverCard = -1;
      return;
    }
    const rects = upgradeCardRects(FIELD);
    world.hoverCard = rects.findIndex((r) => input.mouse.x >= r.x && input.mouse.x <= r.x + r.width && input.mouse.y >= r.y && input.mouse.y <= r.y + r.height);
  }

  function stepOnce() {
    const move = input.moveDirection();
    const firing = input.mouse.down || inputHeldSpace();
    const events = world.stepWorld(STEP, { move, aim: { x: input.mouse.x, y: input.mouse.y }, firing });
    reactToEvents(events);
  }

  function inputHeldSpace() {
    return input.spaceHeld === true;
  }

  // Space also fires: track it on the input's behalf through a key listener.
  window.addEventListener('keydown', (event) => { if (event.code === 'Space') input.spaceHeld = true; });
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') input.spaceHeld = false; });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    hoverCard();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepOnce();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      if (screen === SCREEN_TITLE) world.particles.updateParticles(STEP);
    }
    audio.updateMusic(Math.min(0.05, accumulator + STEP), screen === SCREEN_PLAY);
    renderer.drawWorld(world);
    const remaining = world.state.toSpawn + world.enemies.countActive();
    hud.drawOverlay(world, screen, remaining);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
  });

  announce('Voidstorm Arena. Click or press Space to launch.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
