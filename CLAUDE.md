# Crittors — CLAUDE.md

## Project Overview
2D side-scrolling combat game built with PixiJS v8. Two game modes: **Story** (round-based with castle destruction) and **Endless** (infinite survival with scaling difficulty, siege encounters, and an overworld checkpoint map). Players control one of 4 characters fighting waves of enemies. Features character swapping, type advantages, leveling, coffee currency, bones meta-currency, consumable items, skins, hats, and weather/day-night systems.

## Tech Stack
- Vanilla JS with ES modules (no bundler)
- PixiJS v8 (loaded from CDN)
- Web Audio API for synthesized SFX (coin, slash, explosion, shield, bomb, rage, potion, feather sounds)
- CSS animations for UI
- localStorage for saves (key `'gameSave'`)
- PWA-enabled (manifest.json, fullscreen)

## File Architecture

| File | Lines | Purpose |
|------|-------|---------|
| `js/main.js` | ~2,500 | PIXI app init, game loop (`app.ticker`), input handling, camera, character swap, pause system, asset loading, `setup()`, `startGame()`, story-mode castle logic, resize handler. Key sections: `handleCharacterClick` (~line 450), `handleTouchHold` (attack logic, ~line 1150), game loop (~line 1600), `buildEnemyTypes` (~line 2200) |
| `js/state.js` | ~500 | Central state object + all getters/setters. Single source of truth for game mode, character stats, items, siege state, bones, skins, hats, layout upgrades |
| `js/combat.js` | ~2,200 | Enemy spawning (`spawnEnemy`, `spawnEnemyDemi`), AI, movement, attack logic, damage calc, type multipliers, coffee drops, hit splats, item drops, bones awarding, ground item collection, death animations, synthesized SFX, `triggerAirstrike()` (bomb AoE + explosion visuals) |
| `js/spawnLoop.js` | ~145 | Enemy spawn scheduling for endless + story modes. Demi boss timing, siege trigger checks, spawn interval scaling. `initSpawnLoop(critter, app)` + `spawnEnemies()` |
| `js/itemButtons.js` | ~210 | All 6 item button click handlers (shield, bomb, rage, feather, golden bean, medkit) + `repositionItemButtons()` layout. `initItemButtons(critter, app)` |
| `js/layoutShop.js` | ~555 | Bones shop panel: card deck navigation, swipe gestures, stat upgrades, hats/skins/inventory sub-views, inline cosmetic pickers, settings panel, leaderboard/guide button wiring, delete save. `showPanel()`/`hidePanel()` helpers |
| `js/menuScene.js` | ~400 | Animated menu background (pure Canvas 2D): stars, moon, mountains, campfires, lanterns, snail sprite. `initMenuScene()` + `stopMenuScene()` |
| `js/siege.js` | ~500 | Castle siege system (triggers every 10 kills in endless). Alert phase, baby mob swarm, castle combat, reward panel. Overworld map rendering with snake-path grid + checkpoint system |
| `js/skins.js` | ~450 | Skin catalog (16 skins across 4 characters), HSL recoloring engine (`recolorSheet`), per-skin hue shift configs, texture cache, runtime particle effects (sparkles for golden frog, hearts for valentine snail) |
| `js/upgrades.js` | ~100 | EXP tracking, auto level-up (all 3 stats), character stat setters |
| `js/characters.js` | ~200 | Per-character health/EXP management, portrait flashing, HP indicators, `getCharacterDamage()` |
| `js/ui.js` | ~300 | Health/EXP bars, pause menu, cooldown overlay, round text, grayscale filters |
| `js/timer.js` | ~100 | 60-second round timer with animated snail progress bar |
| `js/save.js` | ~100 | Save/load to localStorage. `saveBones()` persists bones + layout upgrades + starting items + unlocked castles + owned hats/skins |
| `js/utils.js` | ~20 | Random color generators for particle effects |
| `js/leaderboard.js` | ~160 | Supabase leaderboard: score submission, formatting, player name persistence, leaderboard panel rendering, `showScoreSubmitOverlay()` |
| `js/hats.js` | ~150 | `applyHat()` — draws hat shapes as PIXI.Graphics children of critter sprite |
| `js/potion.js` | ~100 | Potion system: 3 doses per potion, heal amount, UI wiring |
| `js/reviveDialog.js` | ~100 | Death/revive dialog: coffee-to-revive flow |
| `js/terrain.js` | ~150 | `initTerrain()`, `drawEndlessGround()` — procedural ground tiles |
| `js/weather.js` | ~200 | Weather type selection, rain/snow/etc. particle creation + update |
| `js/biomeTransition.js` | ~150 | Biome crossfade system, sky gradient drawing |
| `index.html` | — | Game container, UI overlay, character boxes, panels (pause, layout shop, map, siege reward, skin/hat previews) |
| `style.css` | — | All styles, animations, overworld map grid, panel styling |

## Characters
| Character | Emoji | Default Damage | Strong vs (1.75x) | Weak vs (0.75x) |
|-----------|-------|----------------|-------------------|-----------------|
| Frog (default) | `character-frog` | 16 | pig, scorp | puffer |
| Snail | `character-snail` | 16 | imp, toofer | scorp, shark |
| Bird | `character-bird` | 10 | shark, puffer | imp, toofer (0.3x) |
| Bee | `character-bee` | 16 | ele, octo | shark |

All start at: speed 1, health 100, level 1, EXP 0, EXP-to-level 100.
Characters are unlocked progressively; `state.unlockedCharacters` tracks which are available.

## Enemy Types
pig, octo, ele, imp, puffer, scorp, toofer, shark (shark has special emerge animation)

- **Regular** (story): HP `80 + round*7`, damage `2 + round/3`, EXP `32 + round*2`
- **Regular** (endless): HP `80 + spawnCount*7`, damage `2 + spawnCount/2`, EXP `32 + spawnCount*2`
- **Demi boss**: 1.4x scale, pink tint. Story: HP `200 + round*7`. Endless: HP `200 + spawnCount*7`. Drops random item on death.
- **Baby (siege mob)**: 0.25 scale, fast, low HP (`30 + spawnCount*2 + level*15`). Tagged `isBaby` and `isSiegeMob`.
- **Normal siege mob**: Full-sized regular enemy tagged `isSiegeMob`, spawned alongside baby swarm.

Enemy queue system: only 1 enemy engages in melee at a time; others wait at distance (baby mobs bypass queue).

## Level-Up System
Auto-applies all 3 stats on level-up (no UI picker):
- Speed: +0.2
- Damage: +3
- Health: +15 (also heals +15 if alive)
- EXP requirement increases by 10% each level

## Game Modes

### Story Mode
- **Rounds:** Destroy castle to advance. Castle HP = `100 + 20*round`. Castle gives +25 HP + coffee drop
- **Spawn interval:** `13000ms - round*225ms` (gets faster each round)
- **Demi boss:** Spawns when timer ends

### Endless Mode
- Infinite scrolling right. Camera follows player: `app.stage.x = Math.min(0, -critter.x + screenW/2)`
- Enemies scale with `state.endlessSpawnCount`
- Demi boss every 5 kills (skipping multiples of 10)
- **Siege** every 10 kills (see Siege System below)
- Kill count tracked in `state.endlessKillCount`
- Bones awarded per kill (1 regular, 3 demi)
- 2% item drop chance from regular kills (1% shield, 1% bomb)

## Siege System (`siege.js`)
Triggers every 10 kills in endless mode (`shouldTriggerSiege()`).

**Phases:**
1. **Alert** — "!" pulses above player for ~1.5s
2. **Spawning** — Baby imp swarm + 1-2 normal mobs spawn in waves. Castle placed off-screen right.
3. **Castle** — After all siege mobs killed, "Destroy the Castle!" appears. Castle HP = `300 + level*100`.
4. **Reward** — Castle explodes, +25 HP heal, coffee drop. Panel shows random items (shield/bomb/rage/feather/goldenBean). Items added to `state.startingItems` (persistent).
5. **End** — Siege flag cleared, 8s cooldown before normal spawning resumes via `siegeEnded` event.

**Castle checkpoints** are stored in `state.unlockedCastles[]` and shown on the overworld map.

## Overworld Map
2D snake-path grid (4 columns). Start node at top-left. Nodes wind left-to-right, then right-to-left per row. Unlocked castles are clickable checkpoints. Connectors light up between unlocked nodes. Rendered by `renderOverworldMap()` in siege.js. CSS uses `.map-row`, `.map-node`, `.map-connector-h`, `.map-connector-v`.

## Consumable Items
| Item | Button ID | Effect |
|------|-----------|--------|
| Shield | `shield-btn` | Absorbs damage (100 HP barrier). Blue sprite orbits player. |
| Bomb | `bomb-btn` | Airstrike: bomb drops from sky, AoE explosion. Does 75% maxHP to regular enemies, **instant kill on baby mobs** (`isBaby`). Screen shake + flash. |
| Rage Potion | `rage-btn` | 2x damage boost for duration. Red tint + particles. Potion chug animation. |
| Phoenix Feather | `feather-btn` | Auto-revive on death at 30% HP with 7s invulnerability + gold shimmer burst. |
| Golden Bean | `golden-bean-btn` | Grants large coffee amount. Gold-tinted beans fly to UI. |
| Potion (Heal) | via potion system | 3 doses per potion, heals `15 + potionHeal upgrades` per sip |

Items persist across runs in `state.startingItems`. Can be purchased in the layout shop with bones.

## Currencies
- **Coffee** — In-run currency. Dropped by enemies/castle. 50 to revive dead character. Earned from golden beans.
- **Bones** — Cross-run meta-currency. 1 per kill, 3 per demi boss (endless only). Spent in layout shop for upgrades, items, hats, skins. Persisted via `saveBones()`.

## Skins System (`skins.js`)
16 skins across 4 characters. Each skin defines HSL hue shift ranges in `skinHueConfigs`. At load, `generateSkinTextures()` recolors walk/attack spritesheets via canvas pixel manipulation.

| Skin | Character | Hue ranges |
|------|-----------|------------|
| frog-ice | Frog | Green→Cyan |
| frog-golden | Frog | Green→Rich Gold (sat 1.6, subtle shine) |
| frog-cherry | Frog | Green→Pink (335-348°) |
| frog-pride | Frog | Trans pride flag: green split into 3 bands → light blue / pink / white |
| frog-poison | Frog | Green→Electric Blue (210-225°, high sat) |
| snail-crystal | Snail | Shell→Cyan, body accents→light blue |
| snail-magma | Snail | Shell→Red/Orange |
| snail-valentine | Snail | Shell→Pink (140-334°→335-348°), accents→deep pink, body→pale pink. Hearts particle effect. |
| snail-galaxy | Snail | Shell→Deep Space Purple (265-280°, shimmer). Sparkle particle effect. |
| bird-phoenix | Bird | Body→Orange-red, crest→deep red |
| bird-arctic | Bird | Body→Light blue, crest→pale blue |
| bird-moss | Bird | Body→Deep forest green (85-105°, muted), crest→brown/olive |
| bird-parrot | Bird | Body→Vivid red (355-10°), crest→bright yellow |
| bee-neon (Toxic Bee) | Bee | Yellow→Green |
| bee-royal (Orchid Bee) | Bee | Yellow→Purple |

**Runtime effects:** Golden frog and galaxy snail get sparkle particles (bigger, more frequent). Valentine snail gets floating heart particles (larger, more frequent). Managed by `updateSkinEffects()`.

## Hats System
Hats are drawn as PIXI.Graphics children of the critter sprite in `applyHat()` (`hats.js`). Hat catalog (defined in `layoutShop.js`):

| Hat | Shape | Notes |
|-----|-------|-------|
| tophat | Brim + crown + red band | Dark color (0x1a1a2e), positioned at -0.42 × texture height |
| partyhat | OSRS-style paper crown with 4 triangular peaks + tip dots | Blue (0x0070DD), scaled 1.15x, positioned lower at -0.34 × texture height |

## Layout Shop (Bones Shop)
Accessed from pause menu. Card-swipe UI. Categories:
- **Character upgrades:** +damage, +health, +defense per character (costs scale with level)
- **Starting items:** Buy shields, bombs, rage potions, feathers, potions with bones
- **Hats & Skins:** Cosmetic purchases with bones

## Key Mechanics
- **Character swap:** 3-second cooldown, spawn animation with colored particles, 2s spawn protection
- **Death:** Ghost flies up, character menu opens. Must swap to alive character or revive with 50 coffee. All 4 dead = wipe
- **Bird:** Ranged attack (fires egg projectiles). Others are melee
- **Snail:** Only moves during 2nd half of walk animation frame
- **Auto-attack:** Toggleable. When enabled, character attacks automatically when enemy in range
- **Enemy HP bars:** Drawn as child containers on enemy sprites, scaled inversely to enemy scale
- **Weather system:** Biome transitions with rain, snow, etc. Weather container tracks camera.
- **Day/night cycle:** Sun lighting overlay dims/brightens. Sun parallax shifts opposite to camera.
- **Mountain parallax:** Multiple mountain layers at different scroll speeds, wrapping horizontally.

## State Management
All game state lives in `state.js` default export. Access via getters/setters (e.g., `getSnailSpeed()`, `setSnailSpeed()`). Character-routing helpers like `getPlayerHealth()` switch on `state.currentCharacter`.

Key state groups:
- **Core:** gameMode, currentRound, currentCharacter, enemies[], isPaused, isDead
- **Per-character:** [char]Speed, [char]Damage, [char]Health, [char]Level, [char]EXP, current[Char]Health
- **Endless:** endlessSpawnCount, endlessKillCount, endlessDeathX
- **Siege:** siegeActive, siegePhase, siegeCastleLevel, siegeMobsRemaining, siegeCastleHP, unlockedCastles[]
- **Items:** shieldCount, bombCount, rageCount, featherCount, goldenBeanCount, groundItems[], startingItems{}
- **Meta:** bones, layoutUpgrades{}, ownedHats[], ownedSkins[], equippedHats{}, equippedSkins{}
- **Cosmetic:** skinBaseTint, biomeTransition, weather state

## Save System
`saveGame()` serializes full state to JSON in localStorage key `'gameSave'`. `loadGame()` restores everything.
`saveBones()` separately persists: bones, layoutUpgrades, startingItems, unlockedCastles, ownedHats, ownedSkins, equippedHats, equippedSkins.

## Audio
- `theme.ogg` — background music (loops, default volume 0.42)
- Synthesized SFX via Web Audio API: coin pickup, sword slash, bomb drop whistle, explosion (3-layer: boom + noise + crunch), shield activate/break, rage sound, potion chug + ahh, feather revive chime, golden bean chime
- `attacksound.wav`, `hurt.wav`, `levelup.wav`, `upgradeavailable.wav`
- Volumes controlled by pause menu sliders (music + effects separate)

## Assets
Sprites in `./assets/`:
- Characters: `[char]_walk.png`, `[char]_attack.png`, `[char]_ghost.png` (frog, snail, bird, bee)
- Enemies: `[enemy]_walk.png`, `[enemy]_attack.png`, `[enemy]portrait.png` (pig, octo, ele, imp, puffer, scorp, toofer, shark)
- Environment: `background.png`, `foreground.png`, `castle.png`, mountains, clouds
- Items: `bean.png` (coffee)
- Effects: `enemy_death.png` (explosion spritesheet)

## Spritesheet Frame Params (for skin recoloring)
- Frog: type 1 (single-row), walk 10 frames × 351h, attack 12 frames × 351h
- Snail: type 2 (multi-row), walk 20 frames × 562h (3560×2248), attack 20 frames × 562h (2848×3372)
- Bee: type 2, walk 9 frames × 256h (2753×256), attack 18 frames × 256h (1950×1024)
- Bird: type 2, walk 13 frames × 403h (2541×806), attack 13 frames × 403h (2541×806)

## Module Init Order
Inside `DOMContentLoaded`:
1. `loadBones()` — restore persistent currency
2. `initMenuScene()` — start animated menu canvas
3. `initLayoutShop()` — wire bones shop + settings + panel helpers
4. Button click handlers (map, siege reward) remain in main.js

Inside `mainAppFunction()` → `setup()` → `startGame()`:
5. `initItemButtons(critter, app)` — wire 6 consumable item buttons
6. `initSpawnLoop(critter, app)` — store refs for spawn scheduler
7. `spawnEnemies()` — kick off first spawn

## Known Quirks
- `getFrogSpeed()` returns `state.speed` (not `state.frogSpeed`) — possible bug
- `setCharacterSpeed/Health/Damage()` in upgrades.js take a `currentCharacter` param but ignore it, using `state.currentCharacter` instead
- index.html has two `</body>` closing tags
- `#pause-button` div has duplicate `id` attributes (`id="pause-button" id="coffee-coins"`)
- `main.js` remaining ~2,500 lines are tightly coupled game-loop code (PIXI closure vars `critter`, `app`). Key sections: `handleCharacterClick` (~line 450), `handleTouchHold` (~line 1150), game loop `app.ticker.add` (~line 1600), `buildEnemyTypes` (~line 2200)
