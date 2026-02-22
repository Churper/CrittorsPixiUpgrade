// siege.js — Castle siege system for endless mode
// Every 10 kills triggers a multi-enemy swarm + destructible castle encounter

import state from './state.js';
import {
  getEnemies, addEnemies,
  getCurrentCharacter, getEnemiesInRange, setEnemiesInRange,
  setIsCharAttacking, getisDead, getisPaused,
  getPlayerCurrentHealth, getPlayerHealth,
  getFrogHealth, getSnailHealth, getBirdHealth, getBeeHealth,
  getCoffee, setCoffee, setIsDead,
  getShieldCount, setShieldCount, getBombCount, setBombCount,
  getRageCount, setRageCount, getFeatherCount, setFeatherCount,
  getGoldenBeanCount, setGoldenBeanCount,
  getMedkitCount, setMedkitCount,
} from './state.js';
import {
  handleEnemySorting, handleEnemyActions,
  createCoffeeDrop, playExplosionSound,
  createSpawnEnemy, createItemDrop,
} from './combat.js';
import {
  getCharacterDamage, setPlayerCurrentHealth,
  setCurrentFrogHealth, setCurrentSnailHealth, setCurrentBirdHealth, setCurrentBeeHealth,
  stopFlashing,
} from './characters.js';
import { updatePlayerHealthBar } from './ui.js';
import { checkSharedLevelUp, updateKillProgressBar } from './upgrades.js';
import { saveBones } from './save.js';

// --- Detection ---

export function shouldTriggerSiege() {
  if (state.gameMode !== 'endless') return false;
  if (state.endlessKillCount < 10) return false;
  // Use >= threshold instead of exact modulo — prevents skipping if kills jump past a multiple of 10
  const nextSiegeAt = (state.lastSiegeCastleLevel + 1) * 10;
  if (state.endlessKillCount < nextSiegeAt) return false;
  return true;
}

// --- Start Siege ---

export function startSiege(critter, app, impWalkTextures, impAttackTextures) {
  const level = state.lastSiegeCastleLevel + 1;
  state.siegeActive = true;
  state.siegePhase = 'alert';
  state.siegeCastleLevel = level;

  // Stop normal spawner
  if (state.enemySpawnTimeout) {
    clearTimeout(state.enemySpawnTimeout);
    state.enemySpawnTimeout = null;
  }
  state.isSpawning = false;

  // Show pulsing "!" alert above critter
  const alertText = new PIXI.Text({
    text: '!',
    style: {
      fontFamily: 'Luckiest Guy, cursive',
      fontSize: 48,
      fill: '#ff4444',
      stroke: { color: '#000000', width: 5 },
    }
  });
  alertText.anchor.set(0.5);
  alertText.position.set(critter.position.x, critter.position.y - 80);
  alertText.zIndex = 99999;
  app.stage.addChild(alertText);
  state.siegeAlertSprite = alertText;

  // Pulse animation
  let alertElapsed = 0;
  const alertTicker = (ticker) => {
    alertElapsed += ticker.deltaTime;
    const scale = 1 + Math.sin(alertElapsed * 0.3) * 0.3;
    alertText.scale.set(scale);
    alertText.position.set(critter.position.x, critter.position.y - 80);
    if (alertElapsed > 90) { // ~1.5s at 60fps
      app.ticker.remove(alertTicker);
      if (app.stage.children.includes(alertText)) {
        app.stage.removeChild(alertText);
      }
      state.siegeAlertSprite = null;
      // Transition to spawning phase
      startSiegeSpawning(critter, app, impWalkTextures, impAttackTextures);
    }
  };
  app.ticker.add(alertTicker);
}

// --- Castle Positioning ---

function createSiegeCastle(critter, app) {
  const level = state.siegeCastleLevel;
  const castleTexture = PIXI.Assets.get('castle');
  const castle = new PIXI.Sprite(castleTexture);
  castle.anchor.set(0.5, 1);
  castle.position.set(
    critter.position.x + app.screen.width + 200,
    state.groundY || (app.screen.height - 100)
  );
  castle.zIndex = 6;
  castle.scale.set(0.8);
  app.stage.addChild(castle);
  state.siegeCastleSprite = castle;

  // HP
  state.siegeCastleMaxHP = 110 + level * 40;
  state.siegeCastleHP = state.siegeCastleMaxHP;
  state.siegeRewardItems = [];

  // HP bar background
  const barWidth = 120;
  const barHeight = 10;
  const barBG = new PIXI.Graphics();
  barBG.rect(0, 0, barWidth, barHeight).fill({ color: 0x000000, alpha: 0.6 });
  barBG.position.set(castle.position.x - barWidth / 2, castle.position.y - castle.height - 20);
  barBG.zIndex = 99998;
  barBG.visible = false;
  app.stage.addChild(barBG);
  state.siegeCastleHPBarBG = barBG;

  // HP bar fill
  const barFill = new PIXI.Graphics();
  barFill.rect(0, 0, barWidth, barHeight).fill({ color: 0xff4444, alpha: 0.85 });
  barFill.position.set(castle.position.x - barWidth / 2, castle.position.y - castle.height - 20);
  barFill.zIndex = 99999;
  barFill.visible = false;
  app.stage.addChild(barFill);
  state.siegeCastleHPBar = barFill;
}

// --- Swarm Spawning ---

function startSiegeSpawning(critter, app, impWalkTextures, impAttackTextures) {
  state.siegePhase = 'spawning';

  // Place castle first
  createSiegeCastle(critter, app);

  const level = state.siegeCastleLevel;
  const totalMobs = Math.min(2 + level, 8);
  const waves = Math.min(1 + Math.floor(level / 3), 4);
  const mobsPerWave = Math.ceil(totalMobs / waves);

  // Pick a second baby type at level 2+ (mix variety earlier)
  let secondType = null;
  if (level >= 2 && state.enemyTypes && state.enemyTypes.length > 1) {
    const candidates = state.enemyTypes.filter(e => e.name !== 'imp');
    if (candidates.length > 0) {
      secondType = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // Add 1-2 normal mobs to the siege
  const normalMobCount = Math.min(1 + Math.floor(level / 3), 2);
  const totalWithNormals = totalMobs + normalMobCount;

  state.siegeMobsTotal = totalWithNormals;
  state.siegeMobsRemaining = totalWithNormals;

  // Split babies into two groups by type (grouped for cleave effectiveness)
  const halfPoint = secondType ? Math.ceil(totalMobs / 2) : totalMobs;
  let spawned = 0;

  for (let w = 0; w < waves; w++) {
    const waveDelay = w * 1200;
    const mobsThisWave = Math.min(mobsPerWave, totalMobs - w * mobsPerWave);

    for (let m = 0; m < mobsThisWave; m++) {
      const delay = waveDelay + m * 180;
      const spawnIdx = spawned;
      // First half = imp, second half = second type (grouped for cleave)
      const useSecondType = secondType && spawnIdx >= halfPoint;
      const walkTex = useSecondType ? secondType.walkTextures : impWalkTextures;
      const atkTex = useSecondType ? secondType.attackTextures : impAttackTextures;
      const typeName = useSecondType ? secondType.name : 'imp';
      spawned++;
      setTimeout(() => {
        if (!state.siegeActive) return;
        spawnBabyEnemy(critter, app, walkTex, atkTex, spawnIdx, typeName);
      }, delay);
    }
  }

  // Spawn normal-sized enemies mixed into the siege
  const enemyTypes = state.enemyTypes || [];
  if (enemyTypes.length > 0) {
    for (let n = 0; n < normalMobCount; n++) {
      const delay = 4000 + n * 3000; // arrive after baby wave has thinned out
      setTimeout(() => {
        if (!state.siegeActive) return;
        const picked = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        spawnSiegeNormalEnemy(critter, app, picked);
      }, delay);
    }
  }
}

function spawnBabyEnemy(critter, app, walkTextures, attackTextures, spawnIndex, typeName) {
  const level = state.siegeCastleLevel;
  const sc = state.endlessSpawnCount || 0;

  const enemy = new PIXI.AnimatedSprite(walkTextures);
  enemy.scale.set(0.25);
  enemy.anchor.set(0.5, 0.5);
  enemy.type = typeName || 'imp';
  enemy.isAttacking = false;
  enemy.enemyAdded = false;
  enemy.resett = false;
  enemy.isAlive = true;
  enemy.isBaby = true;
  enemy.isSiegeMob = true;

  // Stats scale with level — 1-shot with strong type, 2-shot with neutral/weak
  enemy.maxHP = 8 + level * 3;
  enemy.currentHP = enemy.maxHP;
  // Mid-ground siege-baby damage scaling (undo part of the recent nerf).
  enemy.attackDamage = Math.max(1, Math.round((sc / 8 + level * 0.3) * 0.5));
  // Give slightly more EXP from siege baby waves.
  enemy.exp = 10 + level * 3;

  // Position off-screen right in a tighter cluster.
  const spawnX = critter.position.x + app.screen.width + 80 + spawnIndex * 22;
  enemy.position.set(
    spawnX,
    app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 20 - 10)
  );
  enemy.zIndex = enemy.position.y + 10000;
  enemy.animationSpeed = 0.3;
  enemy.loop = true;
  enemy.scale.x *= -1; // face left

  const speedFactor = 0.75 + Math.random() * 0.5;
  enemy.vx = -3 * speedFactor; // faster than normal

  enemy.play();

  addEnemies(enemy);
  if (enemy.isAlive) {
    app.stage.addChild(enemy);
  }
  handleEnemySorting(enemy);

  // Register on ticker — same pattern as spawnEnemy
  const enemyTypeName = enemy.type;
  app.ticker.add(() => {
    if (getisPaused()) return;
    if (app.stage.children.includes(enemy)) {
      handleEnemyActions(critter, attackTextures, walkTextures, enemy, enemyTypeName);
    }
  });
}

function spawnSiegeNormalEnemy(critter, app, enemyType) {
  const enemy = createSpawnEnemy(enemyType.walkTextures, enemyType.name, critter);
  enemy.isSiegeMob = true;

  // Apply item effects at later siege levels
  const level = state.siegeCastleLevel;
  if (level >= 3) {
    const pool = ['shield'];
    if (level >= 5) pool.push('bomb');
    const effect = pool[Math.floor(Math.random() * pool.length)];

    if (effect === 'shield') {
      enemy.enemyShieldHP = Math.round(enemy.maxHP * 0.5);
      const shield = new PIXI.Graphics();
      shield.circle(0, 0, 60).fill({ color: 0x3399ff, alpha: 0.15 });
      shield.circle(0, 0, 60).stroke({ color: 0x3399ff, alpha: 0.45, width: 2 });
      enemy.addChild(shield);
      enemy._shieldGfx = shield;
    } else if (effect === 'bomb') {
      enemy.dropsBomb = true;
      enemy.tint = 0xFFAAAA;
    }
  }

  addEnemies(enemy);
  if (enemy.isAlive) {
    app.stage.addChild(enemy);
  }
  handleEnemySorting(enemy);

  app.ticker.add(() => {
    if (getisPaused()) return;
    if (app.stage.children.includes(enemy)) {
      handleEnemyActions(critter, enemyType.attackTextures, enemyType.walkTextures, enemy, enemyType.name);
    }
  });
}

// --- Siege Mob Kill Tracking ---

export function siegeMobKilled() {
  state.siegeMobsRemaining--;
  if (state.siegeMobsRemaining <= 0) {
    state.siegeMobsRemaining = 0;
    transitionToCastlePhase();
  }
}

// --- Castle Phase ---

function transitionToCastlePhase() {
  state.siegePhase = 'castle';
  const app = state.app;
  const castle = state.siegeCastleSprite;

  // Show HP bars
  if (state.siegeCastleHPBar) state.siegeCastleHPBar.visible = true;
  if (state.siegeCastleHPBarBG) state.siegeCastleHPBarBG.visible = true;

}

// --- Castle Combat ---

export function siegeCastleTakeDamage(damage, critter, app) {
  state.siegeCastleHP -= damage;

  // Update HP bar
  updateSiegeCastleHPBar();

  // Flash castle red
  const castle = state.siegeCastleSprite;
  if (castle) {
    castle.tint = 0xff4444;
    setTimeout(() => {
      if (state.siegeCastleSprite) state.siegeCastleSprite.tint = 0xffffff;
    }, 100);
    tryDropSiegeCastleItemOnHit(castle);
  }

  if (state.siegeCastleHP <= 0) {
    siegeCastleDestroyed(critter, app);
  }
}

function tryDropSiegeCastleItemOnHit(castle) {
  if (!castle) return;
  // Pure per-hit drop roll. Kept intentionally low so drops feel special.
  const dropChance = 0.025;
  if (Math.random() > dropChance) return;
  dropRandomSiegeItem(castle.position.x, castle.position.y - castle.height / 2, 0);
}

function dropRandomSiegeItem(dropX, dropY, delayMs) {
  const itemPool = ['shield', 'bomb', 'rage', 'feather', 'goldenBean', 'medkit'];
  const idx = Math.floor(Math.random() * itemPool.length);
  const item = itemPool[idx];
  state.siegeRewardItems.push(item);

  const offsetX = (Math.random() - 0.5) * 36;
  const offsetY = (Math.random() - 0.5) * 16;
  setTimeout(() => {
    createItemDrop(dropX + offsetX, dropY + offsetY, item);
  }, Math.max(0, delayMs || 0));
}

function updateSiegeCastleHPBar() {
  const bar = state.siegeCastleHPBar;
  if (!bar) return;
  const ratio = Math.max(0, state.siegeCastleHP / state.siegeCastleMaxHP);
  const barWidth = 120;
  const barHeight = 10;
  bar.clear();
  bar.rect(0, 0, barWidth * ratio, barHeight).fill({ color: 0xff4444, alpha: 0.85 });
}

// --- Castle Destroyed ---

function siegeCastleDestroyed(critter, app) {
  state.siegePhase = 'reward';
  const castle = state.siegeCastleSprite;

  // Explosion particles
  if (castle) {
    playExplosionSound();
    const particles = [];
    const cx = castle.position.x;
    const cy = castle.position.y - castle.height / 2;
    for (let i = 0; i < 20; i++) {
      const p = new PIXI.Graphics();
      const colors = [0xff6600, 0xffaa00, 0xff2200, 0xffdd00];
      const size = 4 + Math.random() * 6;
      p.circle(0, 0, size).fill({ color: colors[Math.floor(Math.random() * colors.length)] });
      p.position.set(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 80);
      p.zIndex = 99999;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      app.stage.addChild(p);
      particles.push(p);
    }
    let elapsed = 0;
    const explosionTicker = (ticker) => {
      elapsed += ticker.deltaTime;
      const t = elapsed / 60;
      if (t >= 1) {
        for (const p of particles) {
          if (app.stage.children.includes(p)) app.stage.removeChild(p);
          p.destroy();
        }
        app.ticker.remove(explosionTicker);
        return;
      }
      for (const p of particles) {
        p.position.x += p.vx * state.dt;
        p.position.y += p.vy * state.dt;
        p.vy += 0.1 * state.dt;
        p.alpha = 1 - t;
      }
    };
    app.ticker.add(explosionTicker);
  }

  // Heal player 25 HP
  const curHP = getPlayerCurrentHealth();
  const maxHP = getPlayerHealth();
  const newHP = Math.min(curHP + 25, maxHP);
  setPlayerCurrentHealth(newHP);
  updatePlayerHealthBar((newHP / maxHP) * 100);

  // Coffee drop + item drops on the floor with animation
  const dropX = castle ? castle.position.x : (critter ? critter.position.x + 100 : 400);
  const dropY = castle ? castle.position.y - castle.height / 2 : 300;
  if (castle) {
    createCoffeeDrop(dropX, dropY);
  }

  // Castle awards half a level of kill progress (single chunk)
  const halfProgress = Math.max(1, Math.floor(state.killsToNextLevel / 2));
  checkSharedLevelUp(halfProgress);
  updateKillProgressBar();

  // Remove castle + HP bars
  removeSiegeCastleSprites(app);

  // Show reward panel after delay (simplified — items already on floor)
  setTimeout(() => {
    showSiegeRewardPanel();
  }, 1000);
}

function removeSiegeCastleSprites(app) {
  if (state.siegeCastleSprite && app.stage.children.includes(state.siegeCastleSprite)) {
    app.stage.removeChild(state.siegeCastleSprite);
    state.siegeCastleSprite.destroy();
  }
  state.siegeCastleSprite = null;

  if (state.siegeCastleHPBar && app.stage.children.includes(state.siegeCastleHPBar)) {
    app.stage.removeChild(state.siegeCastleHPBar);
    state.siegeCastleHPBar.destroy();
  }
  state.siegeCastleHPBar = null;

  if (state.siegeCastleHPBarBG && app.stage.children.includes(state.siegeCastleHPBarBG)) {
    app.stage.removeChild(state.siegeCastleHPBarBG);
    state.siegeCastleHPBarBG.destroy();
  }
  state.siegeCastleHPBarBG = null;
}

// --- Reward Panel ---

function showSiegeRewardPanel() {
  const level = state.siegeCastleLevel;
  const rewards = state.siegeRewardItems;

  // Clear item list (items drop on floor now, not shown here)
  const listEl = document.getElementById('siege-reward-list');
  if (listEl) listEl.innerHTML = '';

  // Title
  const titleEl = document.getElementById('siege-reward-title');
  if (titleEl) titleEl.textContent = 'Castle #' + level + ' Cleared!';

  // Spend-all-coffee team heal button state
  const healBtn = document.getElementById('siege-reward-heal-btn');
  if (healBtn) {
    const coffee = getCoffee();
    healBtn.textContent = coffee > 0 ? `Spend All Coffee (${coffee})` : 'Spend All Coffee (0)';
    healBtn.disabled = coffee <= 0;
  }

  // Show panel
  const backdrop = document.getElementById('siege-reward-backdrop');
  if (backdrop) backdrop.classList.add('visible');
}

function playHealCenterJingle() {
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const notes = [659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25, 783.99, 880.0, 987.77, 1174.66];
  notes.forEach((freq, i) => {
    const start = now + i * 0.08;
    const end = start + 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.2), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
  });
  setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1800);
}

export function spendAllCoffeeTeamHeal() {
  const coffee = getCoffee();
  if (coffee <= 0) return false;

  setCoffee(0);
  const coffeeAmountElement = document.getElementById('coffee-amount');
  if (coffeeAmountElement) coffeeAmountElement.textContent = '0';
  document.dispatchEvent(new Event('coffeeChanged'));

  // Full-team restore (heals and revives all critters).
  setCurrentFrogHealth(getFrogHealth());
  setCurrentSnailHealth(getSnailHealth());
  setCurrentBirdHealth(getBirdHealth());
  setCurrentBeeHealth(getBeeHealth());
  setIsDead(false);
  stopFlashing();

  // Clean up any ghost visuals if a death state was active.
  if (state.ghostFlyInterval) {
    clearInterval(state.ghostFlyInterval);
    state.ghostFlyInterval = null;
  }
  if (state.frogGhostPlayer && state.app && state.app.stage.children.includes(state.frogGhostPlayer)) {
    state.app.stage.removeChild(state.frogGhostPlayer);
  }

  updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth()) * 100);

  // Pokecenter-style heal jingle.
  playHealCenterJingle();

  const healBtn = document.getElementById('siege-reward-heal-btn');
  if (healBtn) {
    healBtn.textContent = 'Spend All Coffee (0)';
    healBtn.disabled = true;
  }

  return true;
}

export function collectSiegeRewards() {
  const rewards = state.siegeRewardItems;
  const setterMap = {
    shield: () => { setShieldCount(getShieldCount() + 1); state.startingItems.shield = (state.startingItems.shield || 0) + 1; },
    bomb: () => { setBombCount(getBombCount() + 1); state.startingItems.bomb = (state.startingItems.bomb || 0) + 1; },
    rage: () => { setRageCount(getRageCount() + 1); state.startingItems.rage = (state.startingItems.rage || 0) + 1; },
    feather: () => { setFeatherCount(getFeatherCount() + 1); state.startingItems.feather = (state.startingItems.feather || 0) + 1; },
    goldenBean: () => { setGoldenBeanCount(getGoldenBeanCount() + 1); state.startingItems.goldenBean = (state.startingItems.goldenBean || 0) + 1; },
    medkit: () => { setMedkitCount(getMedkitCount() + 1); state.startingItems.medkit = (state.startingItems.medkit || 0) + 1; },
  };

  rewards.forEach(item => {
    if (setterMap[item]) setterMap[item]();
  });

  // Update UI counts
  const countMap = { shield: 'shield-count', bomb: 'bomb-count', rage: 'rage-count', feather: 'feather-count', goldenBean: 'golden-bean-count', medkit: 'medkit-count' };
  const btnMap = { shield: 'shield-btn', bomb: 'bomb-btn', rage: 'rage-btn', feather: 'feather-btn', goldenBean: 'golden-bean-btn', medkit: 'medkit-btn' };
  const getMap = { shield: getShieldCount, bomb: getBombCount, rage: getRageCount, feather: getFeatherCount, goldenBean: getGoldenBeanCount, medkit: getMedkitCount };
  for (const key of Object.keys(countMap)) {
    const el = document.getElementById(countMap[key]);
    if (el) el.textContent = getMap[key]();
    const btn = document.getElementById(btnMap[key]);
    if (btn && getMap[key]() > 0) btn.style.display = 'flex';
  }
  document.dispatchEvent(new Event('itemButtonsChanged'));

  // Unlock checkpoint — backfill all previous castles too
  const level = state.siegeCastleLevel;
  for (let i = 1; i <= level; i++) {
    if (!state.unlockedCastles.includes(i)) {
      state.unlockedCastles.push(i);
    }
  }
  state.unlockedCastles.sort((a, b) => a - b);
  state.lastSiegeCastleLevel = level;

  // Record actual level at this checkpoint so resume uses exact values
  if (!state.checkpointLevels) state.checkpointLevels = {};
  state.checkpointLevels[level] = state.sharedLevel || 1;

  // Auto-reward Potion Power every 10 castles (10, 20, 30, ...)
  if (level > 0 && level % 10 === 0) {
    state.startingItems.potionHeal = (state.startingItems.potionHeal || 0) + 1;
  }

  saveBones();

  // Hide panel
  const backdrop = document.getElementById('siege-reward-backdrop');
  if (backdrop) backdrop.classList.remove('visible');

  // End siege
  endSiege();
}

// --- End / Cleanup ---

function endSiege() {
  state.siegeActive = false;
  state.siegePhase = 'idle';
  state.siegeMobsRemaining = 0;
  state.siegeMobsTotal = 0;
  state.siegeCastleHP = 0;
  state.siegeCastleMaxHP = 0;
  state.siegeRewardItems = [];

  // Post-siege cooldown — reuse demi cooldown so spawner waits 8s
  state.lastDemiKillTime = Date.now();

  // Sync demi counter so no catch-up demi spawns right after siege
  state.demiSpawned = Math.floor(state.endlessKillCount / 5);

  // Resume normal spawning — fire a custom event so main.js can call spawnEnemies()
  document.dispatchEvent(new Event('siegeEnded'));
}

export function cleanupSiege() {
  const app = state.app;
  if (app) {
    removeSiegeCastleSprites(app);
  }

  // Remove alert sprite if present
  if (state.siegeAlertSprite && app && app.stage.children.includes(state.siegeAlertSprite)) {
    app.stage.removeChild(state.siegeAlertSprite);
  }
  state.siegeAlertSprite = null;

  // Remove any remaining siege mobs
  const enemies = getEnemies();
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].isSiegeMob) {
      if (app && app.stage.children.includes(enemies[i])) {
        app.stage.removeChild(enemies[i]);
      }
      enemies.splice(i, 1);
    }
  }

  // Reset siege state
  state.siegeActive = false;
  state.siegePhase = 'idle';
  state.siegeCastleLevel = 0;
  state.siegeMobsRemaining = 0;
  state.siegeMobsTotal = 0;
  state.siegeCastleHP = 0;
  state.siegeCastleMaxHP = 0;
  state.siegeRewardItems = [];

  // Hide reward panel if visible
  const backdrop = document.getElementById('siege-reward-backdrop');
  if (backdrop) backdrop.classList.remove('visible');
}

// --- Overworld Map ---

// Biome definitions — every 20 checkpoints changes biome
const MAP_BIOMES = [
  { name: 'forest',  label: '\u{1F332} Forest',  range: [0, 19] },
  { name: 'desert',  label: '\u{1F3DC}\uFE0F Desert',  range: [20, 39] },
  { name: 'tundra',  label: '\u{2744}\uFE0F Tundra',  range: [40, 59] },
  { name: 'volcano', label: '\u{1F30B} Volcano', range: [60, 79] },
  { name: 'void',    label: '\u{1F30C} Void',    range: [80, 99] },
];

let mapDeckIndex = 0;
let mapCards = [];
let mapSwipeWired = false;
export function getMapBiomeIndex() { return mapDeckIndex; }
export function getMapBiomeCount() { return MAP_BIOMES.length; }

export function renderOverworldMap(biomeIdx) {
  const deck = document.getElementById('map-deck');
  const titleEl = document.getElementById('map-biome-title');
  if (!deck || !titleEl) return;
  deck.innerHTML = '';
  mapCards = [];

  // Auto-navigate to highest unlocked biome
  if (biomeIdx === undefined) {
    const maxUnlocked = state.unlockedCastles.length > 0
      ? Math.max(...state.unlockedCastles) : 0;
    mapDeckIndex = 0;
    for (let b = MAP_BIOMES.length - 1; b >= 0; b--) {
      if (maxUnlocked >= MAP_BIOMES[b].range[0]) { mapDeckIndex = b; break; }
    }
  } else {
    mapDeckIndex = biomeIdx;
  }

  // Build one card per biome
  for (let b = 0; b < MAP_BIOMES.length; b++) {
    const biome = MAP_BIOMES[b];
    const card = document.createElement('div');
    card.className = 'map-card ' + biome.name;
    card.dataset.biome = biome.name;

    const grid = document.createElement('div');
    grid.className = 'map-grid';
    buildBiomeGrid(grid, biome);
    card.appendChild(grid);

    deck.appendChild(card);
    mapCards.push(card);
  }

  // Wire swipe gestures (only once per deck element)
  if (!mapSwipeWired) {
    wireMapSwipe(deck);
    mapSwipeWired = true;
  }

  updateMapDeckPositions();
}

function buildBiomeGrid(container, biome) {
  const cols = 4;
  const rangeStart = biome.range[0];
  const rangeEnd = biome.range[1];
  const nodeCount = rangeEnd - rangeStart + 1;
  const rows = Math.ceil(nodeCount / cols);

  for (let r = 0; r < rows; r++) {
    const rowStartNode = rangeStart + r * cols;
    const rowEndNode = Math.min(rowStartNode + cols - 1, rangeEnd);
    const indices = [];
    for (let n = rowStartNode; n <= rowEndNode; n++) indices.push(n);
    if (r % 2 === 1) indices.reverse();

    const rowDiv = document.createElement('div');
    rowDiv.className = 'map-row';

    for (let ci = 0; ci < indices.length; ci++) {
      const i = indices[ci];
      const node = document.createElement('div');
      node.className = 'map-node biome-' + biome.name;

      if (i === 0) {
        node.classList.add('start');
        node.textContent = '\u2694\uFE0F';
        node.title = 'Start';
        node.addEventListener('click', () => startFromCheckpoint(0));
      } else {
        const isUnlocked = state.unlockedCastles.includes(i);
        node.textContent = isUnlocked ? '\u{1F3F0}' : '\u{1F512}';
        if (isUnlocked) {
          node.classList.add('unlocked');
          node.title = 'Castle ' + i;
          const level = i;
          node.addEventListener('click', () => startFromCheckpoint(level));
        } else {
          node.classList.add('locked');
          node.title = 'Locked';
        }
      }

      const label = document.createElement('span');
      label.className = 'map-node-label';
      label.textContent = i === 0 ? 'Start' : '#' + i;
      node.appendChild(label);
      rowDiv.appendChild(node);

      // Horizontal connector
      if (ci < indices.length - 1) {
        const hConn = document.createElement('div');
        hConn.className = 'map-connector-h biome-' + biome.name;
        const nextI = indices[ci + 1];
        const curOk = i === 0 || state.unlockedCastles.includes(i);
        const nextOk = nextI === 0 || state.unlockedCastles.includes(nextI);
        if (curOk && nextOk) hConn.classList.add('active');
        rowDiv.appendChild(hConn);
      }
    }

    container.appendChild(rowDiv);

    // Vertical connector between rows
    if (r < rows - 1) {
      const vConnRow = document.createElement('div');
      vConnRow.className = 'map-row map-vconn-row';
      const turnCol = r % 2 === 0 ? Math.min(indices.length - 1, cols - 1) : 0;

      for (let c = 0; c < cols; c++) {
        if (c === turnCol) {
          const vConn = document.createElement('div');
          vConn.className = 'map-connector-v biome-' + biome.name;
          const turnIdx = indices[r % 2 === 0 ? indices.length - 1 : 0];
          const turnOk = turnIdx === 0 || state.unlockedCastles.includes(turnIdx);
          const nextRowStart = rangeStart + (r + 1) * cols;
          const nextIndices = [];
          for (let n = nextRowStart; n <= Math.min(nextRowStart + cols - 1, rangeEnd); n++) nextIndices.push(n);
          if ((r + 1) % 2 === 1) nextIndices.reverse();
          const nextTurnIdx = nextIndices[(r + 1) % 2 === 0 ? nextIndices.length - 1 : 0];
          const nextTurnOk = nextTurnIdx === 0 || state.unlockedCastles.includes(nextTurnIdx);
          if (turnOk && nextTurnOk) vConn.classList.add('active');
          vConnRow.appendChild(vConn);
        } else {
          const spacer = document.createElement('div');
          spacer.className = 'map-vconn-spacer';
          vConnRow.appendChild(spacer);
        }
        if (c < cols - 1) {
          const gapSpacer = document.createElement('div');
          gapSpacer.className = 'map-connector-h-spacer';
          vConnRow.appendChild(gapSpacer);
        }
      }

      container.appendChild(vConnRow);
    }
  }
}

function updateMapDeckPositions() {
  const titleEl = document.getElementById('map-biome-title');
  const panel = document.getElementById('map-panel');

  // Strip old position classes, keep biome class
  mapCards.forEach(c => {
    c.className = 'map-card ' + (c.dataset.biome || '');
  });
  // Assign card-pos-N from mapDeckIndex
  for (let i = 0; i < mapCards.length; i++) {
    const pos = i - mapDeckIndex;
    if (pos >= 0 && pos <= 4) {
      mapCards[i].classList.add('map-card-pos-' + pos);
    }
  }
  // Update title + panel theme
  const biome = MAP_BIOMES[mapDeckIndex];
  if (titleEl) titleEl.textContent = biome.label;
  if (panel) {
    for (const b of MAP_BIOMES) panel.classList.remove('map-biome-' + b.name);
    panel.classList.add('map-biome-' + biome.name);
  }
  // Nav button visibility
  const prevBtn = document.getElementById('map-prev');
  const nextBtn = document.getElementById('map-next');
  if (prevBtn) prevBtn.style.visibility = mapDeckIndex > 0 ? 'visible' : 'hidden';
  if (nextBtn) nextBtn.style.visibility = mapDeckIndex < MAP_BIOMES.length - 1 ? 'visible' : 'hidden';
}

function wireMapSwipe(deck) {
  let swipeStartX = 0, swipeStartY = 0, swipeStartTime = 0;
  let isSwiping = false, swipeLocked = false;

  deck.addEventListener('touchstart', function(e) {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeStartTime = Date.now();
    isSwiping = true;
    swipeLocked = false;
    const front = deck.querySelector('.map-card-pos-0');
    if (front) front.classList.add('swiping');
  }, { passive: true });

  deck.addEventListener('touchmove', function(e) {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;
    if (!swipeLocked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      if (Math.abs(dy) > Math.abs(dx)) {
        isSwiping = false;
        const front = deck.querySelector('.swiping');
        if (front) front.classList.remove('swiping');
        return;
      }
      swipeLocked = true;
    }
    if (!swipeLocked) return;
    e.preventDefault();
    const front = deck.querySelector('.map-card-pos-0.swiping');
    if (!front) return;
    const clamp = Math.max(-100, Math.min(100, dx));
    front.style.transform = 'translateX(' + clamp + 'px) rotate(' + (clamp * 0.05) + 'deg) scale(1)';
    front.style.opacity = Math.max(0.4, 1 - Math.abs(clamp) / 180);
  }, { passive: false });

  deck.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    isSwiping = false;
    const front = deck.querySelector('.map-card-pos-0.swiping');
    if (front) {
      front.classList.remove('swiping');
      front.style.transform = '';
      front.style.opacity = '';
    }
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const vel = Math.abs(dx) / Math.max(1, Date.now() - swipeStartTime);
    if (Math.abs(dx) > 25 || vel > 0.25) {
      if (dx < 0 && mapDeckIndex < MAP_BIOMES.length - 1) mapDeckIndex++;
      else if (dx > 0 && mapDeckIndex > 0) mapDeckIndex--;
      updateMapDeckPositions();
    }
  });

  deck.addEventListener('touchcancel', function() {
    isSwiping = false;
    const front = deck.querySelector('.swiping');
    if (front) {
      front.classList.remove('swiping');
      front.style.transform = '';
      front.style.opacity = '';
    }
  });
}

export function navigateMapDeck(direction) {
  if (direction < 0 && mapDeckIndex > 0) {
    mapDeckIndex--;
    updateMapDeckPositions();
  } else if (direction > 0 && mapDeckIndex < MAP_BIOMES.length - 1) {
    mapDeckIndex++;
    updateMapDeckPositions();
  }
}

function startFromCheckpoint(level) {
  state.endlessCheckpointStart = level;
  const backdrop = document.getElementById('map-backdrop');
  if (backdrop) backdrop.classList.remove('visible');
  document.dispatchEvent(new CustomEvent('startFromCheckpoint', { detail: { level } }));
}
