# Voidstorm Arena — entry notes

**Pitch:** You are the Pulse Warden, the last ship holding the arena gate
against the Voidstorm — a neon arena survival shooter: survive 12 waves,
down the Void Colossus on waves 5, 10 and 12, and build your ship with a
1-of-3 upgrade choice after every cleared wave.

## How to play

- **Move:** WASD or arrow keys. **Aim:** mouse. **Fire:** hold mouse button
  or Space. **Pause:** P or Esc. **Mute:** M.
- Enemies fly in from the arena edges: chasers hunt you, darters telegraph
  and lunge, splitters break into shards, gunners keep their distance and
  shoot, and the boss fires radial bursts and spits shards when wounded.
- Kills drop green XP shards. Walk near them to pull them in with your
  magnet; each level you bank earns one upgrade choice when the wave ends.
- **Win:** clear wave 12 (final boss included). **Lose:** your hull reaches
  zero. Both end screens show your final score and restart on click/Space.

## File map (game/src/)

- `main.js` — boot, the fixed-step loop, screen state machine, sound reactions
- `config.js` — every tuning number, palette, wave mixes and difficulty curves
- `world.js` — rules and state: waves, spawning, collisions, score, XP, levels
- `player.js` — the Warden: stats, movement, aiming, regeneration
- `enemies.js` — the five hostile behaviours and the shared enemy pool
- `bullets.js` — player/enemy projectiles and XP gems with magnet pull
- `particles.js` — pooled particle bursts, sprays and glints
- `upgrades.js` — the nine upgrade cards and the 1-of-3 draw
- `audio.js` — WebAudio-synthesised effects and the looping music pattern
- `render.js` — canvas drawing of the arena, entities, particles, boss bar
- `hud.js` — HUD strip, wave banners and every screen panel
- `input.js` — keyboard/mouse state and one-shot action flags
- `random.js` — seeded RNG so spawns and screenshot scenes are repeatable
- `shots.js` — deterministic staged scenes for the screenshots

Everything is drawn in code (vector/neon shapes) and every sound is
synthesised — no image, audio, font or library files, and no network
requests. The game is plain static files under `game/` with no build step.

## Screenshots

`screenshots/` holds real renders of the game in headless Chrome, staged
deterministically through `shots.json` + `game/src/shots.js`:
`1-title.jpg` (title screen), `2-play.jpg` (wave-4 action with HUD),
`3-boss.jpg` (wave-10 boss fight with boss health bar), `4-win.jpg`
(victory screen with final score and restart prompt). Each was captured at
1280x800 from the served game and converted to JPEG under the 256 KiB cap.

## Verification

`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` produces `out/game`,
`out/screenshots` and `out/dossier.json`. The game logic was also exercised
headlessly in Node (seeded autopilot run: waves advance, bosses fall,
upgrade choices appear and apply) and in the browser with no console errors.

## Known issues

- Sound starts only after the first click/keypress (browser autoplay rules).
- On very slow displays the fixed-step loop caps catch-up at 0.25 s, so the
  game slows briefly instead of spiralling.
