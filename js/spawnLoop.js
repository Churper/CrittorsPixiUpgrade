// --- Spawn loop ---
// Extracted from main.js — enemy spawning scheduler for endless and story modes.

import state from './state.js';
import { getisDead, getisPaused } from './state.js';
import { isTimerFinished } from './timer.js';
import { spawnEnemyDemi, spawnEnemy } from './combat.js';
import { shouldTriggerSiege, startSiege } from './siege.js';

let _critter, _app;

/** Call once after critter/app are created to store refs for the spawn loop. */
export function initSpawnLoop(critter, app) {
  _critter = critter;
  _app = app;
}

export function spawnEnemies() {
  if (state.isSpawning || getisDead() || getisPaused()) {
    return;
  }

  // Bail out during siege — siege.js handles its own spawning
  if (state.siegeActive) return;

  if (state.gameMode === 'endless') {
    // Check for siege trigger before demi check
    if (shouldTriggerSiege()) {
      // Use imp textures for baby enemies
      const impType = state.enemyTypes.find(e => e.name === 'imp') || state.enemyTypes[0];
      startSiege(_critter, _app, impType.walkTextures, impType.attackTextures);
      return;
    }

    // Cap: don't spawn if 2+ enemies are already alive — prevents pileup
    const aliveCount = state.enemies.filter(e => e.isAlive).length;
    if (aliveCount >= 2) {
      state.isSpawning = true;
      state.enemySpawnTimeout = setTimeout(() => {
        state.isSpawning = false;
        spawnEnemies();
      }, 2000);
      return;
    }

    // Post-demi cooldown: 8s breathing room after killing a demi boss
    if (state.lastDemiKillTime && Date.now() - state.lastDemiKillTime < 8000) {
      state.isSpawning = true;
      state.enemySpawnTimeout = setTimeout(() => {
        state.isSpawning = false;
        spawnEnemies();
      }, 8000 - (Date.now() - state.lastDemiKillTime));
      return;
    }

    // Endless mode: no max spawns, no timer check
    const sc = state.endlessSpawnCount || 0;
    const currentInterval = Math.max(2000, 12000 - sc * 100);

    const timeSinceLastSpawn = Date.now() - state.timeOfLastSpawn;
    if (timeSinceLastSpawn < currentInterval) {
      const remainingTime = currentInterval - timeSinceLastSpawn;
      state.isSpawning = true;
      state.enemySpawnTimeout = setTimeout(() => {
        state.isSpawning = false;
        spawnEnemies();
      }, remainingTime);
      return;
    }

    state.isSpawning = true;

    const randomIndex = Math.floor(Math.random() * state.enemyTypes.length);
    const selectedEnemy = state.enemyTypes[randomIndex];

    // Spawn demi boss every 5 kills (skip siege multiples — those trigger castle siege)
    if (state.endlessKillCount >= 5 && state.endlessKillCount % 10 !== 0 && state.demiSpawned < Math.floor(state.endlessKillCount / 5)) {
      spawnEnemyDemi(
        _critter,
        selectedEnemy.attackTextures,
        selectedEnemy.walkTextures,
        selectedEnemy.name
      );
      state.demiSpawned++;
    } else {
      spawnEnemy(
        _critter,
        selectedEnemy.attackTextures,
        selectedEnemy.walkTextures,
        selectedEnemy.name
      );
    }

    state.timeOfLastSpawn = Date.now();
    state.endlessSpawnCount++;

    state.enemySpawnTimeout = setTimeout(() => {
      state.isSpawning = false;
      spawnEnemies();
    }, currentInterval);
    return;
  }

  // Story mode logic below
  if (isTimerFinished()) {
    return;
  }

  // Cap enemies per round — spawn across ~75% of timer, leave end for castle
  const maxSpawns = 4 + Math.floor(state.currentRound * 0.4);
  if (state.spawnedThisRound >= maxSpawns) {
    return;
  }

  // On resume, wait the remaining interval before spawning instead of spawning instantly
  const currentInterval = state.interval + 2000 - (state.currentRound * 150);
  const timeSinceLastSpawn = Date.now() - state.timeOfLastSpawn;
  if (timeSinceLastSpawn < currentInterval) {
    const remainingTime = currentInterval - timeSinceLastSpawn;
    state.isSpawning = true;
    state.enemySpawnTimeout = setTimeout(() => {
      state.isSpawning = false;
      spawnEnemies();
    }, remainingTime);
    return;
  }

  state.isSpawning = true;

  const randomIndex = Math.floor(Math.random() * state.enemyTypes.length);
  const selectedEnemy = state.enemyTypes[randomIndex];

  spawnEnemy(
    _critter,
    selectedEnemy.attackTextures,
    selectedEnemy.walkTextures,
    selectedEnemy.name
  );

  state.spawnedThisRound++;
  state.timeOfLastSpawn = Date.now();

  state.enemySpawnTimeout = setTimeout(() => {
    state.isSpawning = false;
    spawnEnemies();
  }, currentInterval);
}
