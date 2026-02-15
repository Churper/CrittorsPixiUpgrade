# Crittors — CLAUDE.md

## Project Overview
2D side-scrolling combat game built with PixiJS v8. Players control one of 4 characters fighting waves of enemies across rounds. Features character swapping, type advantages, leveling, coffee currency, and a 60-second round timer.

## Tech Stack
- Vanilla JS with ES modules (no bundler)
- PixiJS v8 (loaded from CDN)
- CSS animations for UI
- localStorage for saves
- PWA-enabled (manifest.json, fullscreen)

## File Architecture

| File | Purpose |
|------|---------|
| `js/main.js` | Game init, PIXI app, game loop (app.ticker), input handling, camera, spawning loop |
| `js/state.js` | Central state object + all getters/setters. Single source of truth |
| `js/combat.js` | Enemy spawning, AI, movement, attack logic, damage calc, coffee drops, hit splats |
| `js/upgrades.js` | EXP tracking, auto level-up (all 3 stats), character stat setters |
| `js/characters.js` | Per-character health/EXP management, portrait flashing, HP indicators |
| `js/ui.js` | Health/EXP bars, pause menu, cooldown overlay, round text, grayscale filters |
| `js/timer.js` | 60-second round timer with animated snail progress bar |
| `js/save.js` | Save/load to localStorage key `'gameSave'` |
| `js/utils.js` | Random color generators for particle effects |
| `index.html` | Game container, UI overlay, character boxes |
| `style.css` | All styles, animations (bounce, slideUp, pulsate, snail-movement) |

## Characters
| Character | Emoji | Default Damage | Strong vs (1.75x) | Weak vs (0.75x) |
|-----------|-------|----------------|-------------------|-----------------|
| Frog (default) | `character-frog` | 16 | pig, scorp | puffer |
| Snail | `character-snail` | 16 | imp, toofer | scorp, shark |
| Bird | `character-bird` | 10 | shark, puffer | imp, toofer (0.3x) |
| Bee | `character-bee` | 16 | ele, octo | shark |

All start at: speed 1, health 100, level 1, EXP 0, EXP-to-level 100.

## Enemy Types
pig, octo, ele, imp, puffer, scorp, toofer, shark (shark has special emerge animation)

- Regular: HP `80 + round*7`, damage `2 + round/3`, EXP `32 + round*2`
- Demi (spawns when timer ends): 2x scale, HP `200 + round*7`, damage `2 + round/2`, EXP `32 + round*4`

## Level-Up System
Auto-applies all 3 stats on level-up (no UI picker):
- Speed: +0.15
- Damage: +2
- Health: +12 (also heals +12 if alive)
- EXP requirement increases by 10% each level

## Key Mechanics
- **Rounds:** Destroy castle to advance. Castle HP = `100 + 20*round`. Castle gives +25 HP + coffee drop
- **Spawn interval:** `13000ms - round*225ms` (gets faster each round)
- **Coffee:** Dropped by enemies/castle. 50 coffee to revive a dead character
- **Character swap:** 3-second cooldown, spawn animation with colored particles
- **Death:** Ghost flies up, must swap to alive character. All 4 dead = wipe
- **Bird:** Ranged attack (fires egg projectiles). Others are melee
- **Snail:** Only moves during 2nd half of walk animation frame

## State Management
All game state lives in `state.js` default export. Access via getters/setters (e.g., `getSnailSpeed()`, `setSnailSpeed()`). Character-routing helpers like `getPlayerHealth()` switch on `state.currentCharacter`.

`selectLevel` in state exists but is never incremented (legacy from old pick-a-stat UI). Guards in `ui.js` check `getSelectLevel() >= 1` — always passes since it stays 0.

## Save System
`saveGame()` serializes state to JSON in localStorage. `loadGame()` restores all stats, levels, EXP, health, coffee, volumes, round number. Called on game start.

## Audio
- `theme.ogg` — background music (loops, default volume 0.42)
- `attacksound.wav`, `hurt.wav`, `levelup.wav`, `upgradeavailable.wav`
- Volumes controlled by pause menu sliders (music + effects separate)

## Assets
Sprites in `./assets/`: `[character]_walk.png`, `[character]_attack.png`, `[character]_ghost.png`, `[enemy]_walk.png`, `[enemy]_attack.png`, `[enemy]portrait.png`, environment (`background.png`, `foreground.png`, `castle.png`, mountains, clouds), `bean.png` (coffee), `enemy_death.png` (explosion sheet).

## Known Quirks
- `getFrogSpeed()` returns `state.speed` (not `state.frogSpeed`) — possible bug
- `setCharacterSpeed/Health/Damage()` in upgrades.js take a `currentCharacter` param but ignore it, using `state.currentCharacter` instead
- index.html has two `</body>` closing tags
- `#pause-button` div has duplicate `id` attributes (`id="pause-button" id="coffee-coins"`)
