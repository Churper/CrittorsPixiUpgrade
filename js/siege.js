// siege.js — Castle siege system for endless mode
// Every 10 kills triggers a multi-enemy swarm + destructible castle encounter

import state from './state.js';
import {
  getEnemies, addEnemies,
  getCurrentCharacter, getEnemiesInRange, setEnemiesInRange,
  setIsCharAttacking, getisDead, getisPaused,
  getPlayerCurrentHealth, getPlayerHealth,
  getShieldCount, setShieldCount, getBombCount, setBombCount,
  getRageCount, setRageCount, getFeatherCount, setFeatherCount,
  getGoldenBeanCount, setGoldenBeanCount,
} from './state.js';
import {
  handleEnemySorting, handleEnemyActions,
  createCoffeeDrop, playExplosionSound,
  createSpawnEnemy, createItemDrop,
} from './combat.js';
import { getCharacterDamage, setPlayerCurrentHealth } from './characters.js';
import { updatePlayerHealthBar } from './ui.js';
import { checkSharedLevelUp, updateKillProgressBar } from './upgrades.js';
import { saveBones } from './save.js';

// --- Detection ---

export function shouldTriggerSiege() {
  if (state.gameMode !== 'endless') return false;
  if (state.endlessKillCount < 10) return false;
  if (state.endlessKillCount % 10 !== 0) return false;
  const level = state.endlessKillCount / 10;
  if (level <= state.lastSiegeCastleLevel) return false;
  return true;
}

// --- Start Siege ---

export function startSiege(critter, app, impWalkTextures, impAttackTextures) {
  const level = state.endlessKillCount / 10;
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
    app.screen.height - 100
  );
  castle.zIndex = 6;
  castle.scale.set(0.8);
  app.stage.addChild(castle);
  state.siegeCastleSprite = castle;

  // HP
  state.siegeCastleMaxHP = 100 + level * 50;
  state.siegeCastleHP = state.siegeCastleMaxHP;

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

  // Pick a second baby type at level 3+
  let secondType = null;
  if (level >= 3 && state.enemyTypes && state.enemyTypes.length > 1) {
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
    const waveDelay = w * 2000;
    const mobsThisWave = Math.min(mobsPerWave, totalMobs - w * mobsPerWave);

    for (let m = 0; m < mobsThisWave; m++) {
      const delay = waveDelay + m * 500;
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

  // Stats scale with level — 2-hit normal, 1-hit with type advantage
  enemy.maxHP = 20 + level * 4;
  enemy.currentHP = enemy.maxHP;
  enemy.attackDamage = Math.max(1, Math.round(sc / 5 + level * 0.4));
  enemy.exp = 8 + level * 2;

  // Position off-screen right, with vertical variance
  const spawnX = critter.position.x + app.screen.width + 100 + spawnIndex * 50;
  enemy.position.set(
    spawnX,
    app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 40 - 20)
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
    if (level >= 4) pool.push('feather');
    if (level >= 5) pool.push('bomb');
    const effect = pool[Math.floor(Math.random() * pool.length)];

    if (effect === 'shield') {
      enemy.enemyShieldHP = Math.round(enemy.maxHP * 0.5);
      const shield = new PIXI.Graphics();
      shield.circle(0, 0, 60).fill({ color: 0x3399ff, alpha: 0.15 });
      shield.circle(0, 0, 60).stroke({ color: 0x3399ff, alpha: 0.45, width: 2 });
      enemy.addChild(shield);
      enemy._shieldGfx = shield;
    } else if (effect === 'feather') {
      enemy.hasFeather = true;
      enemy.tint = 0xFFEEBB;
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
  }

  // Floating EXP text on castle hit (visual feedback)
  const expToGive = Math.round(damage * 0.75);
  const expDrop = new PIXI.Text({
    text: '+' + expToGive + ' EXP',
    style: {
      fontSize: 18,
      fill: 'orange',
      fontWeight: 'bold',
      stroke: { color: '#000000', width: 3 },
    }
  });
  expDrop.anchor.set(0.5);
  expDrop.position.set(critter.position.x + 20, critter.position.y - 20);
  expDrop.zIndex = 9999999;
  app.stage.addChild(expDrop);

  const startY = expDrop.position.y;
  const startTime = performance.now();
  const animateExp = (currentTime) => {
    const elapsed = currentTime - startTime;
    if (elapsed < 2600) {
      expDrop.position.y = startY - (elapsed / 2600) * 50;
      requestAnimationFrame(animateExp);
    } else {
      if (app.stage.children.includes(expDrop)) app.stage.removeChild(expDrop);
      expDrop.destroy();
    }
  };
  requestAnimationFrame(animateExp);

  if (state.siegeCastleHP <= 0) {
    siegeCastleDestroyed(critter, app);
  }
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

  // Generate reward items and drop them on the ground
  const level = state.siegeCastleLevel;
  const itemPool = ['shield', 'bomb', 'rage', 'feather', 'goldenBean'];
  const count = Math.min(1 + Math.floor(level / 3), 3);
  const rewards = [];
  for (let i = 0; i < count; i++) {
    rewards.push(itemPool[Math.floor(Math.random() * itemPool.length)]);
  }
  state.siegeRewardItems = rewards;
  rewards.forEach((item, i) => {
    setTimeout(() => {
      createItemDrop(dropX + (i - count / 2) * 40, dropY - 20, item);
    }, 200 + i * 150);
  });

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

  // Subtitle
  let subtitleEl = document.querySelector('.siege-reward-subtitle');
  if (!subtitleEl) {
    subtitleEl = document.createElement('p');
    subtitleEl.className = 'siege-reward-subtitle';
    const panel = document.getElementById('siege-reward-panel');
    if (panel && titleEl) panel.insertBefore(subtitleEl, titleEl.nextSibling);
  }
  subtitleEl.textContent = '+25 HP healed  ·  ' + rewards.length + ' items dropped!';

  // Checkpoint message
  const msgEl = document.getElementById('siege-checkpoint-msg');
  if (msgEl) msgEl.textContent = 'Checkpoint unlocked! Start from here on the Map.';

  // Show panel
  const backdrop = document.getElementById('siege-reward-backdrop');
  if (backdrop) backdrop.classList.add('visible');
}

export function collectSiegeRewards() {
  const rewards = state.siegeRewardItems;
  const setterMap = {
    shield: () => { setShieldCount(getShieldCount() + 1); state.startingItems.shield = (state.startingItems.shield || 0) + 1; },
    bomb: () => { setBombCount(getBombCount() + 1); state.startingItems.bomb = (state.startingItems.bomb || 0) + 1; },
    rage: () => { setRageCount(getRageCount() + 1); state.startingItems.rage = (state.startingItems.rage || 0) + 1; },
    feather: () => { setFeatherCount(getFeatherCount() + 1); state.startingItems.feather = (state.startingItems.feather || 0) + 1; },
    goldenBean: () => { setGoldenBeanCount(getGoldenBeanCount() + 1); state.startingItems.goldenBean = (state.startingItems.goldenBean || 0) + 1; },
  };

  rewards.forEach(item => {
    if (setterMap[item]) setterMap[item]();
  });

  // Update UI counts
  const countMap = { shield: 'shield-count', bomb: 'bomb-count', rage: 'rage-count', feather: 'feather-count', goldenBean: 'golden-bean-count' };
  const btnMap = { shield: 'shield-btn', bomb: 'bomb-btn', rage: 'rage-btn', feather: 'feather-btn', goldenBean: 'golden-bean-btn' };
  const getMap = { shield: getShieldCount, bomb: getBombCount, rage: getRageCount, feather: getFeatherCount, goldenBean: getGoldenBeanCount };
  for (const key of Object.keys(countMap)) {
    const el = document.getElementById(countMap[key]);
    if (el) el.textContent = getMap[key]();
    const btn = document.getElementById(btnMap[key]);
    if (btn && getMap[key]() > 0) btn.style.display = 'flex';
  }
  document.dispatchEvent(new Event('itemButtonsChanged'));

  // Unlock checkpoint
  const level = state.siegeCastleLevel;
  if (!state.unlockedCastles.includes(level)) {
    state.unlockedCastles.push(level);
    state.unlockedCastles.sort((a, b) => a - b);
  }
  state.lastSiegeCastleLevel = level;

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

export function renderOverworldMap() {
  const pathEl = document.getElementById('map-path');
  if (!pathEl) return;
  pathEl.innerHTML = '';

  const maxUnlocked = state.unlockedCastles.length > 0
    ? Math.max(...state.unlockedCastles)
    : 0;
  const totalNodes = Math.max(20, maxUnlocked + 5);
  const cols = 4; // nodes per row

  // Biome definitions — every 20 checkpoints changes biome
  const biomes = [
    { name: 'forest',  label: '\u{1F332} Forest',  range: [1, 20] },
    { name: 'desert',  label: '\u{1F3DC}\uFE0F Desert',  range: [21, 40] },
    { name: 'tundra',  label: '\u{2744}\uFE0F Tundra',  range: [41, 60] },
    { name: 'volcano', label: '\u{1F30B} Volcano', range: [61, 80] },
    { name: 'void',    label: '\u{1F30C} Void',    range: [81, Infinity] },
  ];
  function getBiome(nodeIdx) {
    if (nodeIdx === 0) return biomes[0];
    for (const b of biomes) {
      if (nodeIdx >= b.range[0] && nodeIdx <= b.range[1]) return b;
    }
    return biomes[biomes.length - 1];
  }

  // Build a winding snake-path grid: row 0 goes left-to-right, row 1 right-to-left, etc.
  // Start node is at top-left (index 0)
  const rows = Math.ceil((totalNodes + 1) / cols);
  let lastBiomeName = null;

  for (let r = 0; r < rows; r++) {
    const startIdx = r * cols;
    const endIdx = Math.min(startIdx + cols, totalNodes + 1);
    const indices = [];
    for (let c = startIdx; c < endIdx; c++) indices.push(c);
    // Reverse odd rows for snake pattern
    if (r % 2 === 1) indices.reverse();

    // Check if this row starts a new biome — use the first real node index
    const firstNodeIdx = Math.min(...indices);
    const rowBiome = getBiome(firstNodeIdx);
    if (rowBiome.name !== lastBiomeName) {
      const biomeLabel = document.createElement('div');
      biomeLabel.className = 'map-biome-label biome-' + rowBiome.name;
      biomeLabel.textContent = rowBiome.label;
      pathEl.appendChild(biomeLabel);
      lastBiomeName = rowBiome.name;
    }

    const rowDiv = document.createElement('div');
    rowDiv.className = 'map-row';

    for (let ci = 0; ci < indices.length; ci++) {
      const i = indices[ci];
      const biome = getBiome(i);
      const node = document.createElement('div');
      node.className = 'map-node biome-' + biome.name;

      if (i === 0) {
        node.classList.add('start');
        node.textContent = '\u2694\uFE0F';
        node.title = 'Start';
        node.addEventListener('click', () => {
          startFromCheckpoint(0);
        });
      } else {
        const isUnlocked = state.unlockedCastles.includes(i);
        node.textContent = isUnlocked ? '\u{1F3F0}' : '\u{1F512}';
        if (isUnlocked) {
          node.classList.add('unlocked');
          node.title = 'Castle ' + i;
          const level = i;
          node.addEventListener('click', () => {
            startFromCheckpoint(level);
          });
        } else {
          node.classList.add('locked');
          node.title = 'Locked';
        }
      }

      // Node label
      const label = document.createElement('span');
      label.className = 'map-node-label';
      label.textContent = i === 0 ? 'Start' : '#' + i;
      node.appendChild(label);

      rowDiv.appendChild(node);

      // Add horizontal connector between nodes in the same row
      if (ci < indices.length - 1) {
        const hConn = document.createElement('div');
        hConn.className = 'map-connector-h biome-' + biome.name;
        // Light up connector if both nodes it connects are unlocked/start
        const nextI = indices[ci + 1];
        const curOk = i === 0 || state.unlockedCastles.includes(i);
        const nextOk = nextI === 0 || state.unlockedCastles.includes(nextI);
        if (curOk && nextOk) hConn.classList.add('active');
        rowDiv.appendChild(hConn);
      }
    }

    pathEl.appendChild(rowDiv);

    // Add vertical connector between rows — aligned to the turning column
    if (r < rows - 1) {
      const vConnRow = document.createElement('div');
      vConnRow.className = 'map-row map-vconn-row';

      // The turn happens at the last column of even rows (right side) or first column of odd rows (left side)
      // Add spacer nodes to push the vertical connector to the correct column
      const turnCol = r % 2 === 0 ? cols - 1 : 0;
      const biome = getBiome(r % 2 === 0 ? Math.min(endIdx - 1, totalNodes) : startIdx);

      for (let c = 0; c < cols; c++) {
        if (c === turnCol) {
          const vConn = document.createElement('div');
          vConn.className = 'map-connector-v biome-' + biome.name;
          // Check if both endpoints are unlocked
          const turnIdx = r % 2 === 0 ? Math.min(endIdx - 1, totalNodes) : startIdx;
          const turnOk = turnIdx === 0 || state.unlockedCastles.includes(turnIdx);
          const nextRowStart = (r + 1) * cols;
          const nextTurnIdx = r % 2 === 0 ? Math.min(nextRowStart + cols - 1, totalNodes) : nextRowStart;
          const nextTurnOk = nextTurnIdx === 0 || state.unlockedCastles.includes(nextTurnIdx);
          if (turnOk && nextTurnOk) vConn.classList.add('active');
          vConnRow.appendChild(vConn);
        } else {
          // Invisible spacer to keep column alignment
          const spacer = document.createElement('div');
          spacer.className = 'map-vconn-spacer';
          vConnRow.appendChild(spacer);
        }
        // Add gap spacer for horizontal connectors between columns
        if (c < cols - 1) {
          const gapSpacer = document.createElement('div');
          gapSpacer.className = 'map-connector-h-spacer';
          vConnRow.appendChild(gapSpacer);
        }
      }

      pathEl.appendChild(vConnRow);
    }
  }
}

function startFromCheckpoint(level) {
  state.endlessCheckpointStart = level;
  // Hide map panel
  const backdrop = document.getElementById('map-backdrop');
  if (backdrop) backdrop.classList.remove('visible');
  // Trigger endless mode start via click
  document.dispatchEvent(new CustomEvent('startFromCheckpoint', { detail: { level } }));
}
