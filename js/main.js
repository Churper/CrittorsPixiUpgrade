import state from './state.js';
import {
  getFrogSpeed, getFrogDamage, getFrogHealth, getFrogLevel,
  getSnailSpeed, getSnailDamage, getSnailHealth, getSnailLevel,
  getBeeSpeed, getBeeDamage, getBeeHealth, getBeeLevel,
  getBirdSpeed, getBirdDamage, getBirdHealth, getBirdLevel,
  getEnemies, addEnemies,
  getCharSwap, setCharSwap,
  getCurrentCharacter, setCurrentCharacter,
  getCoffee, setCoffee,
  getFrogSize, getSpeedChanged, setSpeedChanged,
  getisDead, setIsDead,
  getIsCharAttacking, setIsCharAttacking,
  getAreResetting, setCharAttackAnimating,
  getEnemiesInRange, setEnemiesInRange,
  getCharLevel, getCharEXP, getEXPtoLevel,
  getPlayerHealth, getPlayerCurrentHealth, getisPaused,
  setShieldCount, setBombCount,
  getRageCount, setRageCount, setFeatherCount,
  setGoldenBeanCount,
  setMedkitCount,
  getSupporterHearts, setSupporterHearts,
} from './state.js';
import { startTimer, pauseTimer, resetTimer, isTimerFinished } from './timer.js';
import { getRandomColor, getRandomColor3 } from './utils.js';
import {
  stopFlashing,
  setPlayerCurrentHealth, setCharEXP,
  updateEXPIndicator, updateEXPIndicatorText,
  getCharacterPortraitUrl, updateCharacterStats,
  getCharacterDamage, updateCurrentLevels,
} from './characters.js';
import {
  createPauseMenuContainer, shouldReturnEarly, updateDialogPositions,
  getIsWiped, setisWiped, startCooldown, openCharacterMenu,
  updatePlayerHealthBar, playRoundText, getTextStyle,
} from './ui.js';
import {
  spawnEnemyDemi, spawnEnemy,
  resetEnemiesState, playSpawnAnimation,
  createCoffeeDrop, collectGroundItem,
  playShieldBreakSound,
} from './combat.js';
import { updateEXP, checkSharedLevelUp, updateKillProgressBar } from './upgrades.js';
import { saveGame, loadGame, saveBones, loadBones } from './save.js';
import { applySkinFilter, getSkinTextures, generateSkinTextures, updateSkinEffects, clearSkinEffects } from './skins.js';
import { showScoreSubmitOverlay } from './leaderboard.js';
import {
  siegeMobKilled,
  siegeCastleTakeDamage, cleanupSiege, collectSiegeRewards,
  renderOverworldMap, getMapBiomeIndex, getMapBiomeCount, navigateMapDeck,
} from './siege.js';
import {
  skyGradients,
  getWeatherType,
  clearWeatherEffects, createWeatherEffects, updateWeatherEffects,
  initWeather,
} from './weather.js';
import { initTerrain, drawEndlessGround } from './terrain.js';
import { applyHat } from './hats.js';
import { initPotion, wirePotionListeners, updatePotionUI } from './potion.js';
import { initReviveDialog, createReviveDialog } from './reviveDialog.js';
import {
  initBiomeTransition, transitionWeather, updateBiomeTransition,
  drawSkyGradient,
} from './biomeTransition.js';
import { initMenuScene, stopMenuScene } from './menuScene.js';
import { initLayoutShop, showPanel, hidePanel } from './layoutShop.js';
import { repositionItemButtons, initItemButtons } from './itemButtons.js';
import { initSpawnLoop, spawnEnemies } from './spawnLoop.js';


document.addEventListener('DOMContentLoaded', function () {
  let appStarted = false;
  let rotateMessage = document.getElementById('rotateDevice');
  rotateMessage.style.display = "block"; // Always display the new menu

  // Load persistent bones currency before menu shows
  loadBones();

  // Menu background scene (extracted to menuScene.js)
  initMenuScene();

  function startFromMenu() {
    stopMenuScene();
    rotateMessage.style.display = 'none';
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (!appStarted) {
      state.gameMode = 'endless';
      // Start music here, within the user gesture (before any await)
      const sound = new Audio('./theme.ogg');
      sound.volume = state.musicVolume;
      sound.loop = true;
      state.themeMusic = sound;
      sound.play();

      mainAppFunction();
      appStarted = true;
    }
  }

  document.getElementById('endless-mode-btn').addEventListener('click', function() {
    renderOverworldMap();
    showPanel('map');
  });

  // --- Map panel ---
  document.getElementById('map-close-btn').addEventListener('click', function() {
    hidePanel('map');
  });
  document.getElementById('map-prev').addEventListener('click', function() {
    navigateMapDeck(-1);
  });
  document.getElementById('map-next').addEventListener('click', function() {
    navigateMapDeck(1);
  });

  // --- Siege reward panel ---
  document.getElementById('siege-reward-continue-btn').addEventListener('click', function() {
    collectSiegeRewards();
  });

  // Siege mob killed event (from combat.js)
  document.addEventListener('siegeMobKilled', function() {
    siegeMobKilled();
  });

  // Start from checkpoint event (from siege.js map)
  document.addEventListener('startFromCheckpoint', function() {
    startFromMenu('endless');
  });

  // Layout shop, settings, leaderboard, guide panels (extracted to layoutShop.js)
  initLayoutShop();

  async function mainAppFunction() {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    transparent: false,
    resolution: 1,
  });
  state.app = app;
  app.stage.sortableChildren = true;
  // Prevent PIXI from pausing the ticker when tab loses focus
  app.ticker.backgroundTimeout = -1;
  document.getElementById('game-container').appendChild(app.canvas);

  // UNSAFE variables - kept as local vars (also used as function params)
  let critter;
  let foreground;
  let critterWalkTextures;
  let backgroundSprite;
  let enemies = state.enemies;
  let previousCharacter = "";
  let playAgain = false;
  let isAttacking = false;
  let enemyPortrait;
  let handleTouchEnd;
  // Procedural main menu scene
  const menuScene = new PIXI.Container();
  menuScene.eventMode = 'none';
  (function buildMenuScene() {
    const sw = app.screen.width, sh = app.screen.height;
    // 1. Sky gradient (twilight)
    const menuBg = new PIXI.Graphics();
    const BANDS = 32;
    const bandH = Math.ceil(sh / BANDS);
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1);
      const tr = Math.round(10 + (26 - 10) * t);
      const tg = Math.round(22 + (58 - 22) * t);
      const tb = Math.round(40 + (90 - 40) * t);
      const c = (tr << 16) | (tg << 8) | tb;
      menuBg.rect(0, i * bandH, sw, bandH + 1).fill({ color: c });
    }
    menuScene.addChild(menuBg);

    // 2. Stars
    const menuStars = new PIXI.Graphics();
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * sw;
      const sy = Math.random() * sh * 0.55;
      const sr = 0.5 + Math.random() * 1.5;
      menuStars.circle(sx, sy, sr).fill({ color: 0xffffff, alpha: 0.2 + Math.random() * 0.5 });
    }
    menuScene.addChild(menuStars);

    // 3. Far mountain silhouette (type 2 shape, dark)
    const farMtn = new PIXI.Graphics();
    const fmw = sw * 1.2, fmh = sh * 0.25;
    farMtn.moveTo(0, 0);
    farMtn.quadraticCurveTo(fmw * 0.12, -fmh * 0.5, fmw * 0.22, -fmh * 0.65);
    farMtn.quadraticCurveTo(fmw * 0.3, -fmh * 0.4, fmw * 0.38, -fmh * 0.8);
    farMtn.quadraticCurveTo(fmw * 0.45, -fmh, fmw * 0.5, -fmh * 0.85);
    farMtn.quadraticCurveTo(fmw * 0.6, -fmh * 0.5, fmw * 0.7, -fmh * 0.6);
    farMtn.quadraticCurveTo(fmw * 0.8, -fmh * 0.45, fmw * 0.9, -fmh * 0.3);
    farMtn.quadraticCurveTo(fmw * 0.95, -fmh * 0.15, fmw, 0);
    farMtn.lineTo(0, 0);
    farMtn.closePath();
    farMtn.fill({ color: 0x1a2a3a, alpha: 0.6 });
    farMtn.position.set(-sw * 0.1, sh * 0.7);
    menuScene.addChild(farMtn);

    // 4. Near mountain silhouette (type 1 shape, darker, larger)
    const nearMtn = new PIXI.Graphics();
    const nmw = sw * 0.9, nmh = sh * 0.35;
    nearMtn.moveTo(0, 0);
    nearMtn.quadraticCurveTo(nmw * 0.1, -nmh * 0.25, nmw * 0.25, -nmh * 0.55);
    nearMtn.quadraticCurveTo(nmw * 0.35, -nmh * 0.85, nmw * 0.45, -nmh);
    nearMtn.quadraticCurveTo(nmw * 0.55, -nmh * 0.82, nmw * 0.65, -nmh * 0.5);
    nearMtn.quadraticCurveTo(nmw * 0.8, -nmh * 0.2, nmw, 0);
    nearMtn.lineTo(0, 0);
    nearMtn.closePath();
    nearMtn.fill({ color: 0x0e1a28, alpha: 0.8 });
    nearMtn.position.set(sw * 0.1, sh * 0.75);
    menuScene.addChild(nearMtn);

    // 5. Ground strip
    const menuGround = new PIXI.Graphics();
    menuGround.rect(0, sh * 0.82, sw, sh * 0.2).fill({ color: 0x0a1218 });
    menuGround.rect(0, sh * 0.82, sw, 3).fill({ color: 0x1a3020, alpha: 0.5 });
    menuScene.addChild(menuGround);

    // 6. Cloud wisps
    const menuCloudContainer = new PIXI.Container();
    menuCloudContainer.eventMode = 'none';
    for (let i = 0; i < 3; i++) {
      const cg = new PIXI.Graphics();
      const cw = 80 + i * 30, ch = 20 + i * 5;
      cg.ellipse(0, 0, cw * 0.35, ch * 0.3).fill({ color: 0xffffff, alpha: 0.15 });
      for (let j = 0; j < 3; j++) {
        const bx = -cw * 0.25 + j * cw * 0.25;
        const by = -ch * 0.2;
        cg.circle(bx, by, ch * 0.25).fill({ color: 0xffffff, alpha: 0.12 });
      }
      cg.position.set(sw * 0.2 + i * sw * 0.25, sh * 0.2 + i * 25);
      menuCloudContainer.addChild(cg);
    }
    menuScene.addChild(menuCloudContainer);

    // 7. Vignette (dark edges)
    const vignette = new PIXI.Graphics();
    vignette.rect(0, 0, sw, sh * 0.15).fill({ color: 0x000000, alpha: 0.3 });
    vignette.rect(0, sh * 0.88, sw, sh * 0.12).fill({ color: 0x000000, alpha: 0.4 });
    menuScene.addChild(vignette);

    // Animate cloud drift on menu
    menuScene._cloudContainer = menuCloudContainer;
    menuScene._animTicker = (ticker) => {
      for (const c of menuCloudContainer.children) {
        c.position.x -= 0.15 * ticker.deltaTime;
        if (c.position.x < -150) c.position.x = sw + 100;
      }
      // Stars are static on menu (drawn as Graphics paths)
    };
    app.ticker.add(menuScene._animTicker);
  })();
  app.stage.addChild(menuScene);

  // Start Timer

 function spawnDemi()
 {
  if (state.currentRound < 3) return;
  if(state.demiSpawned === 0)
  {
    const randomIndex = Math.floor(Math.random() * state.enemyTypes.length);
    const selectedEnemy = state.enemyTypes[randomIndex];

    spawnEnemyDemi(
      critter,
      selectedEnemy.attackTextures,
      selectedEnemy.walkTextures,
      selectedEnemy.name
    );
    state.demiSpawned = 1;
  }

 }

  // Weather system moved to weather.js

  // Potion system moved to potion.js


  
  // Initial check


  function setisPaused(value) {
    state.isPaused = value;
    if (value) {
      // Clear pending spawn timeout so it doesn't fire during pause
      if (state.enemySpawnTimeout) {
        clearTimeout(state.enemySpawnTimeout);
        state.enemySpawnTimeout = null;
        state.isSpawning = false;
      }
      pauseTimer();
      // Pause endless timer
      if (state.gameMode === 'endless' && state.endlessStartTime) {
        state._endlessPauseTime = Date.now();
      }
    }
    if (shouldReturnEarly(value)) {
      return;
    }

    if (value) {

      state.pauseMenuContainer = createPauseMenuContainer();
    } else {
      if (state.pauseMenuContainer) {
        app.stage.removeChild(state.pauseMenuContainer);
        state.pauseMenuContainer = null;
      }

      state.isUnpausing = false;
      state.isPaused = false; // Resume the game

      // Resume endless timer — adjust start time for paused duration
      if (state.gameMode === 'endless' && state._endlessPauseTime) {
        const pausedMs = Date.now() - state._endlessPauseTime;
        state.endlessStartTime += pausedMs;
        // Adjust spawn timer so pause duration doesn't count
        state.timeOfLastSpawn += pausedMs;
        // Adjust demi cooldown so pause doesn't skip it
        if (state.lastDemiKillTime) state.lastDemiKillTime += pausedMs;
        state._endlessPauseTime = null;

        // If no enemies are alive, force a fast spawn (max 2s wait)
        const aliveCount = state.enemies.filter(e => e.isAlive).length;
        if (aliveCount === 0) {
          const sc = state.endlessSpawnCount || 0;
          const currentInterval = Math.max(2000, 12000 - sc * 100);
          const maxWait = 2000;
          const earliest = Date.now() - (currentInterval - maxWait);
          if (state.timeOfLastSpawn < earliest) {
            state.timeOfLastSpawn = earliest;
          }
        }
      }

      spawnEnemies();
      startTimer();
    }
  }





  var pauseButton = document.getElementById("pause-button");

  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  function togglePause() {
    if (state.roundOver === false) {
      // Paused without a menu (e.g. character selection) — show the pause menu overlay
      if (getisPaused() && !state.pauseMenuContainer) {
        state.pauseMenuContainer = createPauseMenuContainer();
        return;
      }
      // Pause menu is open — close it; stay paused if in character select or revive dialog
      if (state.pauseMenuContainer) {
        app.stage.removeChild(state.pauseMenuContainer);
        state.pauseMenuContainer = null;
        if (getisDead() || app.stage.children.includes(state.reviveDialogContainer)) {
          return; // stay paused during death/revive, just close the pause overlay
        }
      }
      setisPaused(!getisPaused());
    }
  }

  pauseButton.addEventListener("click", togglePause);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      togglePause();
    }
  });


  var pauseButton = document.getElementById("pause-button");

  pauseButton.addEventListener("mousedown", function () {
    pauseButton.style.backgroundImage = 'url("./assets/pausedown.png")';
  });

  pauseButton.addEventListener("mouseup", function () {
    pauseButton.style.backgroundImage = 'url("./assets/pauseup.png")';
  });




["character-portrait", "exp-bar", "health-bar"].forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener("pointerdown", function(e) {
      e.stopPropagation();
      openCharacterMenu();
    });
});
  

  let _swapLock = false; // debounce guard for swap clicks

  // Skin recoloring engine imported from skins.js

  // Update the attack + defense + speed infoboxes for the given character
  function updateStatInfoboxes(charType) {
    const ch = charType ? charType.replace('character-', '') : 'frog';
    // Attack: base damage + shop bonus
    const baseDmg = state.characterStats[charType] ? state.characterStats[charType].attack : 16;
    const shopDmg = (state.layoutUpgrades[ch] && state.layoutUpgrades[ch].damage) || 0;
    const dmgEl = document.getElementById('swords-level');
    if (dmgEl) dmgEl.textContent = shopDmg > 0 ? `${baseDmg} (+${shopDmg})` : `${baseDmg}`;
    // Defense: base (= level) + shop bonus
    const baseDefense = state[ch + 'Level'] || 1;
    const shopDefense = (state.charDefenseShop && state.charDefenseShop[ch]) || 0;
    const defEl = document.getElementById('defense-level');
    if (defEl) defEl.textContent = shopDefense > 0 ? `${baseDefense} (+${shopDefense})` : `${baseDefense}`;
    // Speed
    const speed = ch === 'frog' ? state.speed : (state[ch + 'Speed'] || 1);
    const spdEl = document.getElementById('speed-level');
    if (spdEl) spdEl.textContent = speed.toFixed(1);
  }

  // Hat system moved to hats.js

  function handleCharacterClick(characterType) {
    // --- Guard: prevent rapid double-clicks ---
    if (_swapLock) return;

    // --- Guard: prevent swapping to same character while alive ---
    if (characterType === state.selectedCharacter && !getisDead()) {
      return;
    }

    let characterHealth;

    switch (characterType) {
      case 'character-snail':
        characterHealth = state.currentSnailHealth;
        break;
      case 'character-bird':
        characterHealth = state.currentBirdHealth;
        break;
      case 'character-frog':
        characterHealth = state.currentFrogHealth;
        break;
      case 'character-bee':
        characterHealth = state.currentBeeHealth;
        break;
      default:
        console.log('Invalid character', characterType);
        return;
    }

    document.getElementById('spawn-text').style.visibility = 'hidden';
    state.choose = false;

    // Close revive dialog if open
    if (state.reviveDialogContainer && state.reviveDialogContainer.parent) {
      app.stage.removeChild(state.reviveDialogContainer);
      state.reviveDialogContainer = null;
    }

    if (characterHealth <= 0) {
      createReviveDialog(characterType);
      return;
    }

    // Lock swap for a short debounce window
    _swapLock = true;
    setTimeout(() => { _swapLock = false; }, 300);

    app.stage.addChild(critter);
    stopFlashing();

    // Interrupt any in-progress attack animation
    state.isAttackingChar = false;
    state.isPointerDown = false;
    setCharAttackAnimating(false);
    critter.onComplete = null;
    critter.onFrameChange = null;
    critter.stop();

    // Remove any lingering bird egg projectiles so they can't hit enemies after swap
    for (let i = app.stage.children.length - 1; i >= 0; i--) {
      if (app.stage.children[i].name === 'birdProjectile') {
        app.stage.removeChild(app.stage.children[i]);
      }
    }

    // Hide critter until the ticker swaps textures to the new character
    critter.visible = false;

    // Swap character portraits
    const characterPortrait = document.getElementById("character-portrait");
    characterPortrait.style.backgroundImage = `url('${getCharacterPortraitUrl(characterType)}')`;
    characterPortrait.classList.remove("character-snail", "character-bird", "character-bee", "character-frog");
    characterPortrait.classList.add(characterType);

    // Refresh character menu (stays open, updates which boxes are visible)
    updateEXPIndicatorText(getCurrentCharacter(), getCharLevel(getCurrentCharacter()));
    setCharSwap(true);

    // Save old selected character and update both tracking vars together
    // so they can never desync if later code throws
    const prevSelected = state.selectedCharacter;
    setCurrentCharacter(characterType);
    state.selectedCharacter = characterType;

    // Swap positions of the current character box and the previously selected character box
    if (prevSelected !== characterType) {
      const characterLevelElement = document.getElementById("character-level");
      const level = getCharLevel(characterType);
      if (!level && level !== 0) { console.log('Invalid character', characterType); return; }
      characterLevelElement.textContent = 'Lvl. ' + level;
      updateStatInfoboxes(characterType);
      if (getPlayerCurrentHealth() >= 0) {
        setisPaused(false);
      }
      startCooldown();

      // Reset enemy combat state so enemies re-engage the new character cleanly
      for (const enemy of state.enemies) {
        enemy.enemyAdded = false;
        enemy.isAttacking = false;
        enemy.onFrameChange = null;
        if (!enemy.playing && enemy.isAlive) enemy.play();
      }
      state.isCombat = false;
      setEnemiesInRange(0);
      state.isAttackingChar = false;
      state.isCharAttacking = false;
      state.hasAttackedThisFrame = false;

      // Break shield on character swap
      if (state.shieldActive) {
        state.shieldActive = false;
        state.shieldHP = 0;
        if (state.shieldSprite) {
          if (state.app.stage.children.includes(state.shieldSprite)) {
            state.app.stage.removeChild(state.shieldSprite);
          }
          state.shieldSprite.destroy();
        }
        state.shieldSprite = null;
        const shieldBarFill = document.getElementById('shield-bar-fill');
        if (shieldBarFill) shieldBarFill.style.width = '0%';
        const shieldBtnEl = document.getElementById('shield-btn');
        if (shieldBtnEl) shieldBtnEl.classList.remove('shield-active-glow');
        playShieldBreakSound();
      }

      // Break rage on character swap
      if (state.rageActive) {
        state.rageActive = false;
        state.rageEndTime = 0;
        critter.tint = state.skinBaseTint || 0xffffff;
        if (state.originalAnimSpeed) {
          critter.animationSpeed = state.originalAnimSpeed;
          state.originalAnimSpeed = null;
        }
        const rageBtnEl = document.getElementById('rage-btn');
        if (rageBtnEl) {
          rageBtnEl.classList.remove('rage-active-glow');
          if (getRageCount() <= 0) {
            rageBtnEl.style.display = 'none';
            repositionItemButtons();
          }
        }
        const rageFill = document.getElementById('rage-fill');
        if (rageFill) rageFill.style.height = '0%';
      }

      // Clean up ghost state when swapping away from a dead character
      if (getisDead()) {
        setIsDead(false);

        // Remove ghost sprite
        if (state.ghostFlyInterval) {
          clearInterval(state.ghostFlyInterval);
          state.ghostFlyInterval = null;
        }
        if (state.frogGhostPlayer && state.app.stage.children.includes(state.frogGhostPlayer)) {
          state.app.stage.removeChild(state.frogGhostPlayer);
        }

        // Fully reset enemies so they re-engage cleanly
        for (const enemy of state.enemies) {
          enemy.play();
          enemy.enemyAdded = false;
          enemy.isAttacking = false;
          enemy.onFrameChange = null;
        }

        // Reset combat flags so enemies can fight again
        state.roundOver = false;
        state.isCombat = false;
        setEnemiesInRange(0);
        state.isAttackingChar = false;
        state.isCharAttacking = false;
        state.hasAttackedThisFrame = false;
        state.isPointerDown = false;
        // Ensure game is not paused (defensive — death flow shouldn't pause,
        // but stale state can leave it stuck)
        state.isPaused = false;
        // Clear any leaked pointer-hold interval from before death
        if (pointerHoldInterval) {
          clearInterval(pointerHoldInterval);
          pointerHoldInterval = null;
        }

        // Restart spawner chain (was broken when isDead blocked it)
        if (state.enemySpawnTimeout) {
          clearTimeout(state.enemySpawnTimeout);
          state.enemySpawnTimeout = null;
        }
        state.isSpawning = false;
        state.timeOfLastSpawn = Date.now();
        spawnEnemies();
      }

      // Spawn protection — 2s invincibility, but only once per 15s
      if (Date.now() - state.lastInvulnTime >= 15000) {
        state.spawnProtectionEnd = Date.now() + 2000;
        state.lastInvulnTime = Date.now();
      }

      updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
      characterLevelElement.textContent = 'Lvl. ' + level;

      // Swap box positions (skip if prevSelected is empty, e.g. self-revive)
      if (prevSelected) {
        const currentCharacterBox = document.querySelector('.upgrade-box.' + prevSelected);
        const prevCharacterBox = document.querySelector('.upgrade-box.' + characterType);
        const tempPosition = { ...state.characterPositions[prevSelected] };

        currentCharacterBox.style.top = state.characterPositions[characterType].top;
        currentCharacterBox.style.left = state.characterPositions[characterType].left;
        state.characterPositions[prevSelected] = state.characterPositions[characterType];
        state.characterPositions[characterType] = tempPosition;
      }

      previousCharacter = prevSelected;
    } else {
      previousCharacter = ""; // Set previousCharacter to an empty string if the same character is selected again
    }

    updateCharacterStats(); // Update the stats for the new character
  }


  // --- Dynamic item button layout ---
  // Re-layout whenever combat.js dispatches an item-count change (e.g. pickup)
  document.addEventListener('itemButtonsChanged', repositionItemButtons);
  // Update shop affordability whenever coffee changes
  document.addEventListener('coffeeChanged', updatePotionUI);


  // Revive dialog moved to reviveDialog.js



  // Add click event listeners to character boxes
  const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
  characterBoxes.forEach((box) => {
    box.addEventListener('click', function () {
      const characterType = box.classList[1];
      handleCharacterClick(characterType);

    });
  });



  document.getElementById('game-container').appendChild(app.canvas);

  const hoverScale = 1.2;
  const hoverAlpha = 0.8;
 

  async function startGame() {

    // No auto-pause on focus loss — let the game keep running
    

    // Remove procedural menu scene and stop its animation
    if (menuScene._animTicker) app.ticker.remove(menuScene._animTicker);
    app.stage.removeChild(menuScene);
    menuScene.destroy({ children: true });


    // Game elements and logic
    let castleMaxHealth = 100;
    let castleHealth = castleMaxHealth;
    const mountainVelocityX = 0;
    const mountainVelocityY = 0.2;
    const mountainVelocity1 = new PIXI.Point(0.01, 0.01);
    const mountainVelocity2 = new PIXI.Point(0.05, 0.05);
    const mountainVelocity3 = new PIXI.Point(0.1, 0.1);
    const mountainVelocity4 = new PIXI.Point(0.1, 0.1);
    const hpBarColor = 0xff0000;
    loadGame();

    // Apply layout stat upgrades to base character stats
    const lu = state.layoutUpgrades || {};
    const charKeys = ['frog', 'snail', 'bird', 'bee'];
    let totalDefense = 0;
    charKeys.forEach(ch => {
      const ups = lu[ch] || { damage: 0, health: 0, defense: 0 };
      if (ups.damage) {
        state[ch + 'Damage'] += ups.damage * 1;           // +1 flat damage per level
        state.characterStats['character-' + ch].attack += ups.damage * 1;
      }
      if (ups.health) {
        state[ch + 'Health'] += ups.health * 12;           // +12 flat HP per level
        state['current' + ch[0].toUpperCase() + ch.slice(1) + 'Health'] += ups.health * 12;
        state.characterStats['character-' + ch].health += ups.health * 12;
      }
      // Defense is per-character but we track current char's defense
      if (ups.defense) totalDefense = Math.max(totalDefense, ups.defense);
    });
    // Store per-character defense: base (= char level) + shop bonus
    state.charDefense = {};
    charKeys.forEach(ch => {
      const baseDefense = state[ch + 'Level'] || 1;  // defense = character level
      const shopBonus = (lu[ch] && lu[ch].defense) || 0;
      state.charDefense[ch] = baseDefense + shopBonus;
      state.charDefenseShop = state.charDefenseShop || {};
      state.charDefenseShop[ch] = shopBonus;
    });
    state.defense = state.charDefense.frog || 1; // start as frog
    // Apply potion heal bonus
    state.potionHealAmount = 70 + (state.startingItems.potionHeal || 0) * 15;

    // --- Endless mode setup ---
    if (state.gameMode === 'endless') {
      // Show bones counter
      document.getElementById('endless-timer').style.display = 'flex';
      const bonesAmountEl = document.getElementById('bones-amount');
      if (bonesAmountEl) bonesAmountEl.textContent = state.bones;
      // Auto-attack always on
      state.autoAttack = true;
      // Set endless start time + reset kill count
      state.endlessStartTime = Date.now();
      state.endlessElapsed = 0;
      state.endlessSpawnCount = 0;
      state.endlessKillCount = 0;
      state.sharedLevel = 1;
      state.killsToNextLevel = 50;

      // Checkpoint start — if starting from a castle checkpoint, fast-forward state
      // spawnCount uses cpLevel*7 (not *10) so enemies are softer when resuming
      if (state.endlessCheckpointStart > 0) {
        const cpLevel = state.endlessCheckpointStart;
        state.endlessKillCount = cpLevel * 10;
        state.endlessSpawnCount = cpLevel * 7;
        state.demiSpawned = Math.floor(cpLevel * 10 / 5);
        state.lastSiegeCastleLevel = cpLevel;

        // Use saved level from when checkpoint was unlocked; fall back to formula for old saves
        const savedLevel = state.checkpointLevels && state.checkpointLevels[cpLevel];
        const targetLevel = savedLevel || Math.round(cpLevel + Math.sqrt(cpLevel) * 1.5);
        state.sharedLevel = targetLevel;
        const characters = ['frog', 'snail', 'bird', 'bee'];
        for (const ch of characters) {
          const charKey = 'character-' + ch;
          const stats = state.characterStats[charKey];
          const levelsToGain = targetLevel - 1; // from level 1
          if (levelsToGain > 0) {
            stats.speed = Math.min(stats.speed + 0.1 * levelsToGain, 3.0);
            stats.attack += 1.5 * levelsToGain;
            stats.health += 10 * levelsToGain;
            state[ch + 'Level'] = targetLevel;
            // Sync state properties with characterStats
            if (ch === 'frog') { state.speed = stats.speed; }
            else { state[ch + 'Speed'] = stats.speed; }
            state[ch + 'Damage'] = stats.attack;
            state[ch + 'Health'] = stats.health;
            // Set current health to new max
            const hpKey = 'current' + ch.charAt(0).toUpperCase() + ch.slice(1) + 'Health';
            state[hpKey] = stats.health;
            // Update defense
            const shopBonus = (state.charDefenseShop && state.charDefenseShop[ch]) || 0;
            if (state.charDefense) state.charDefense[ch] = state[ch + 'Level'] + shopBonus;
          }
        }
        // Set active character's defense
        const activeCh = getCurrentCharacter().replace('character-', '');
        state.defense = (state.charDefense && state.charDefense[activeCh]) || 0;

        // Set kills-to-next-level with checkpoint scaling
        state.killsToNextLevel = (4 + targetLevel + cpLevel) * 10;

        state.endlessCheckpointStart = 0;
      }

      // Load item stockpile — these are consumable, not per-run
      const si = state.startingItems || {};
      setShieldCount(si.shield || 0);
      setBombCount(si.bomb || 0);
      setRageCount(si.rage || 0);
      setFeatherCount(si.feather || 0);
      setGoldenBeanCount(si.goldenBean || 0);
      setMedkitCount(si.medkit || 0);
      // NOTE: initItemButtons is called later, after critter is created (line ~1249)
    }

    var snailHPIndicator = document.querySelector('.upgrade-box.character-snail .hp-indicator');
    var birdHPIndicator = document.querySelector('.upgrade-box.character-bird .hp-indicator');
    var beeHPIndicator = document.querySelector('.upgrade-box.character-bee .hp-indicator');
    var frogHPIndicator = document.querySelector('.upgrade-box.character-frog .hp-indicator');
    // Calculate the height percentage for each character
    var snailHeightPercentage = (1 - state.currentSnailHealth / getSnailHealth()) * 100;
    var birdHeightPercentage = (1 - state.currentBirdHealth / getBirdHealth()) * 100;
    var beeHeightPercentage = (1 - state.currentBeeHealth / getBeeHealth()) * 100;
    var frogHeightPercentage = (1 - state.currentFrogHealth / getFrogHealth()) * 100;
    // Update the custom properties and height for each character
    snailHPIndicator.style.setProperty('--current-health-snail', state.currentSnailHealth);
    snailHPIndicator.style.setProperty('--max-health-snail', getSnailHealth());
    snailHPIndicator.style.setProperty('--hp-indicator-height', snailHeightPercentage + '%');

    birdHPIndicator.style.setProperty('--current-health-bird', state.currentBirdHealth);
    birdHPIndicator.style.setProperty('--max-health-bird', getBirdHealth());
    birdHPIndicator.style.setProperty('--hp-indicator-height', birdHeightPercentage + '%');

    beeHPIndicator.style.setProperty('--current-health-bee', state.currentBeeHealth);
    beeHPIndicator.style.setProperty('--max-health-bee', getBeeHealth());
    beeHPIndicator.style.setProperty('--hp-indicator-height', beeHeightPercentage + '%');

    frogHPIndicator.style.setProperty('--current-health-frog', state.currentFrogHealth);
    frogHPIndicator.style.setProperty('--max-health-frog', getFrogHealth());
    frogHPIndicator.style.setProperty('--hp-indicator-height', frogHeightPercentage + '%');

    var snailEXPIndicator = document.querySelector('.upgrade-box.character-snail .exp-indicator');
    var birdEXPIndicator = document.querySelector('.upgrade-box.character-bird .exp-indicator');
    var beeEXPIndicator = document.querySelector('.upgrade-box.character-bee .exp-indicator');
    var frogEXPIndicator = document.querySelector('.upgrade-box.character-frog .exp-indicator');

    // Calculate the height percentage for each character
    var snailEXPHeightPercentage = (1 - getCharEXP('character-snail') / getEXPtoLevel('character-snail')) * 100;
    var birdEXPHeightPercentage = (1 - getCharEXP('character-bird') / getEXPtoLevel('character-bird')) * 100;
    var beeEXPHeightPercentage = (1 - getCharEXP('character-bee') / getEXPtoLevel('character-bee')) * 100;
    var frogEXPHeightPercentage = (1 - getCharEXP('character-frog') / getEXPtoLevel('character-frog')) * 100;

    // Update the custom properties and height for each character
    snailEXPIndicator.style.setProperty('--current-exp-snail', getCharEXP('character-snail'));
    snailEXPIndicator.style.setProperty('--max-exp-snail', getEXPtoLevel('character-snail'));
    snailEXPIndicator.style.setProperty('--exp-indicator-height', snailEXPHeightPercentage + '%');

    birdEXPIndicator.style.setProperty('--current-exp-bird', getCharEXP('character-bird'));
    birdEXPIndicator.style.setProperty('--max-exp-bird', getEXPtoLevel('character-bird'));
    birdEXPIndicator.style.setProperty('--exp-indicator-height', birdEXPHeightPercentage + '%');

    beeEXPIndicator.style.setProperty('--current-exp-bee', getCharEXP('character-bee'));
    beeEXPIndicator.style.setProperty('--max-exp-bee', getEXPtoLevel('character-bee'));
    beeEXPIndicator.style.setProperty('--exp-indicator-height', beeEXPHeightPercentage + '%');

    frogEXPIndicator.style.setProperty('--current-exp-frog', getCharEXP('character-frog'));
    frogEXPIndicator.style.setProperty('--max-exp-frog', getEXPtoLevel('character-frog'));
    frogEXPIndicator.style.setProperty('--exp-indicator-height', frogEXPHeightPercentage + '%');


// Add the assets to load
PIXI.Assets.add({ alias: 'shark_emerge', src: './assets/shark_emerge.png' });
PIXI.Assets.add({ alias: 'shark_submerge', src: './assets/shark_submerge.png' });
PIXI.Assets.add({ alias: 'shark_walk', src: './assets/shark_walk.png' });
PIXI.Assets.add({ alias: 'shark_attack', src: './assets/shark_attack.png' });
PIXI.Assets.add({ alias: 'pig_walk', src: './assets/pig_walk.png' });
PIXI.Assets.add({ alias: 'pig_attack', src: './assets/pig_attack.png' });
PIXI.Assets.add({ alias: 'ele_walk', src: './assets/ele_walk.png' });
PIXI.Assets.add({ alias: 'ele_attack', src: './assets/ele_attack.png' });
PIXI.Assets.add({ alias: 'scorp_walk', src: './assets/scorp_walk.png' });
PIXI.Assets.add({ alias: 'scorp_attack', src: './assets/scorp_attack.png' });
PIXI.Assets.add({ alias: 'octo_walk', src: './assets/octo_walk.png' });
PIXI.Assets.add({ alias: 'octo_attack', src: './assets/octo_attack.png' });
PIXI.Assets.add({ alias: 'toofer_walk', src: './assets/toofer_walk.png' });
PIXI.Assets.add({ alias: 'toofer_attack', src: './assets/toofer_attack.png' });
PIXI.Assets.add({ alias: 'bird_egg', src: './assets/bird_egg.png' });
PIXI.Assets.add({ alias: 'bird_ghost', src: './assets/bird_ghost.png' });
PIXI.Assets.add({ alias: 'bird_walk', src: './assets/bird_walk.png' });
PIXI.Assets.add({ alias: 'bird_attack', src: './assets/bird_attack.png' });
PIXI.Assets.add({ alias: 'snail_ghost', src: './assets/snail_ghost.png' });
PIXI.Assets.add({ alias: 'bee_ghost', src: './assets/bee_ghost.png' });
PIXI.Assets.add({ alias: 'bee_walk', src: './assets/bee_walk.png' });
PIXI.Assets.add({ alias: 'bee_attack', src: './assets/bee_attack.png' });
PIXI.Assets.add({ alias: 'puffer_walk', src: './assets/puffer_walk.png' });
PIXI.Assets.add({ alias: 'puffer_attack', src: './assets/puffer_attack.png' });
PIXI.Assets.add({ alias: 'bean', src: './assets/bean.png' });
PIXI.Assets.add({ alias: 'frog_ghost', src: './assets/frog_ghost.png' });
PIXI.Assets.add({ alias: 'foreground', src: './assets/foreground.png' });
PIXI.Assets.add({ alias: 'critter', src: './assets/critter.png' });
PIXI.Assets.add({ alias: 'critter_walk', src: './assets/critter_walk.png' });
PIXI.Assets.add({ alias: 'critter_attack', src: './assets/critter_attack.png' });
PIXI.Assets.add({ alias: 'snail_idle', src: './assets/snail_idle.png' });
PIXI.Assets.add({ alias: 'snail_walk', src: './assets/snail_walk.png' });
PIXI.Assets.add({ alias: 'snail_attack', src: './assets/snail_attack.png' });
PIXI.Assets.add({ alias: 'frog', src: './assets/frog.png' });
PIXI.Assets.add({ alias: 'frog_walk', src: './assets/frog_walk.png' });
PIXI.Assets.add({ alias: 'frog_attack', src: './assets/frog_attack.png' });
PIXI.Assets.add({ alias: 'enemy_death', src: './assets/enemy_death.png' });
PIXI.Assets.add({ alias: 'castle', src: './assets/castle.png' });
PIXI.Assets.add({ alias: 'mountain1', src: './assets/mountain1.png' });
PIXI.Assets.add({ alias: 'mountain2', src: './assets/mountain2.png' });
PIXI.Assets.add({ alias: 'clouds', src: './assets/clouds.png' });
PIXI.Assets.add({ alias: 'clouds2', src: './assets/clouds2.png' });
PIXI.Assets.add({ alias: 'clouds3', src: './assets/clouds3.png' });

// Load the assets with progress tracking
const assetList = [
  'shark_emerge', 'shark_submerge', 'shark_walk', 'shark_attack',
  'pig_walk', 'pig_attack', 'ele_walk', 'ele_attack',
  'scorp_walk', 'scorp_attack', 'octo_walk', 'octo_attack',
  'toofer_walk', 'toofer_attack', 'bird_egg', 'bird_ghost',
  'bird_walk', 'bird_attack', 'snail_ghost', 'bee_ghost',
  'bee_walk', 'bee_attack', 'puffer_walk', 'puffer_attack',
  'bean', 'frog_ghost', 'foreground',
  'critter', 'critter_walk', 'critter_attack',
  'snail_idle', 'snail_walk', 'snail_attack',
  'frog', 'frog_walk', 'frog_attack',
  'enemy_death',
  'castle',
  'mountain1', 'mountain2',
  'clouds', 'clouds2', 'clouds3'
];
const texturesPromise = PIXI.Assets.load(assetList, (progress) => {
  const fill = document.getElementById('loading-bar-fill');
  const status = document.getElementById('loading-status');
  if (fill) fill.style.width = Math.round(progress * 100) + '%';
  if (status) status.textContent = Math.round(progress * 100) + '%';
});

// When the promise resolves, we have the textures!
// Detect GPU max texture size and downscale oversized textures
const textureScaleFactors = {};

function getMaxTextureSize() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      c.width = 0; c.height = 0;
      return max;
    }
  } catch (e) {}
  return 4096;
}

function downscaleTextures(textures, maxSize) {
  for (const key in textures) {
    const tex = textures[key];
    if (!tex || !tex.source) continue;
    const src = tex.source;
    const resource = src.resource;
    if (!resource) continue;
    const w = resource.naturalWidth || resource.width;
    const h = resource.naturalHeight || resource.height;
    if (w <= maxSize && h <= maxSize) continue;

    const scale = Math.min(maxSize / w, maxSize / h);
    const nw = Math.floor(w * scale);
    const nh = Math.floor(h * scale);


    const canvas = document.createElement('canvas');
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(resource, 0, 0, nw, nh);

    const newTex = PIXI.Texture.from(canvas);
    textures[key] = newTex;
    textureScaleFactors[key] = scale;
  }
}

texturesPromise.then((loadedTextures) => {
 const maxTex = getMaxTextureSize();
 downscaleTextures(loadedTextures, maxTex);
 setup(loadedTextures);
});

    function setup(textures) {


      // Add the state.timer animation to the stage


let background = new PIXI.Graphics();
background.eventMode = 'none';
app.stage.addChild(background);
let currentSkyTop = 0x3388CC;
let currentSkyBottom = 0x99CCEE;

const persistentStars = new PIXI.Container();
persistentStars.zIndex = 0.3;
persistentStars.eventMode = 'none';
// Background stars — small, subtle
for (let i = 0; i < 40; i++) {
  const star = new PIXI.Graphics();
  const sz = 0.5 + Math.random() * 1.5;
  star.circle(0, 0, sz).fill({ color: 0xFFFFFF, alpha: 0.15 + Math.random() * 0.25 });
  star.position.set(Math.random() * app.screen.width, Math.random() * app.screen.height * 0.5);
  star.twinkleSpeed = 0.008 + Math.random() * 0.012;
  star.twinklePhase = Math.random() * Math.PI * 2;
  star.baseAlpha = star.alpha;
  star.isBrightTwinkler = false;
  persistentStars.addChild(star);
}
// One prominent twinkly star — larger, brighter, with glow and cross sparkle
const mainStar = new PIXI.Graphics();
// Soft outer glow
mainStar.circle(0, 0, 8).fill({ color: 0xDDEEFF, alpha: 0.06 });
mainStar.circle(0, 0, 5).fill({ color: 0xDDEEFF, alpha: 0.1 });
// 4-point sparkle cross
mainStar.moveTo(0, -6).lineTo(0, 6).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.4 });
mainStar.moveTo(-6, 0).lineTo(6, 0).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.4 });
// Bright core
mainStar.circle(0, 0, 2.5).fill({ color: 0xFFFFFF, alpha: 0.9 });
mainStar.circle(0, 0, 1.5).fill({ color: 0xFFFFFF, alpha: 1.0 });
mainStar.position.set(app.screen.width * 0.7, app.screen.height * 0.12);
mainStar.twinkleSpeed = 0.04;
mainStar.twinklePhase = 0;
mainStar.baseAlpha = 1;
mainStar.isBrightTwinkler = true;
persistentStars.addChild(mainStar);
app.stage.addChild(persistentStars);


const foregroundTexture = textures.foreground;
// Set up the foreground
foreground = new PIXI.Sprite(foregroundTexture);
foreground.width = foreground.texture.width * 1.3;
foreground.height = foreground.texture.height * 1;
foreground.anchor.set(0, 1);
foreground.x = 0;
foreground.y = Math.max(app.screen.height);

// Endless mode: procedural ground that extends beyond the foreground sprite
let endlessGround = null;
let endlessGroundDecor = null; // Separate container for trees/rocks above ground line
let endlessGroundDecorFG = null; // Foreground decor layer (in front of character)
let endlessGroundCurrentWeather = null;
const endlessGroundHeight = foreground.height * 0.75;


endlessGround = new PIXI.Graphics();
endlessGround.position.set(0, app.screen.height - endlessGroundHeight);
endlessGround.zIndex = 5;
endlessGroundDecor = new PIXI.Container();
endlessGroundDecor.position.set(0, app.screen.height - endlessGroundHeight);
endlessGroundDecor.zIndex = 6;
endlessGroundDecorFG = new PIXI.Container();
endlessGroundDecorFG.position.set(0, app.screen.height - endlessGroundHeight);
endlessGroundDecorFG.zIndex = 8; // behind character (10) but above ground decor (6)
initTerrain(endlessGround, endlessGroundDecor, endlessGroundDecorFG, endlessGroundHeight, foreground.width);
initWeather(endlessGroundHeight);
const initialWeather = getWeatherType();
drawEndlessGround(initialWeather);
endlessGroundCurrentWeather = initialWeather;
foreground.visible = false;


// Biome transition moved to biomeTransition.js

const frogGhostTextures = textures.frog_ghost;
state.frogGhostPlayer = new PIXI.Sprite(frogGhostTextures);

state.frogGhostPlayer.anchor.set(0, 0);
state.frogGhostPlayer.scale.set(0.28);

      const mountain1 = createMountainSprite('mountain1', -100, mountainVelocity1, foreground);
      const mountain2 = createMountainSprite('mountain2', app.screen.width * 0.45, mountainVelocity2, foreground);
      const mountain3 = createMountainSprite('mountain2', -200, mountainVelocity3, foreground);
      const mountain4 = createMountainSprite('mountain1', app.screen.width * 1.2, mountainVelocity4, foreground);

      // Apply initial sky gradient so the first round starts with correct colors
      const _initGrad = skyGradients[initialWeather] || skyGradients.sun;
      currentSkyTop = _initGrad.top;
      currentSkyBottom = _initGrad.bottom;
      drawSkyGradient(background, currentSkyTop, currentSkyBottom, app.screen.width, app.screen.height);
      persistentStars.alpha = _initGrad.starsAlpha;
      mountain1.tint = _initGrad.mountain;
      mountain2.tint = _initGrad.mountain;
      mountain3.tint = _initGrad.mountain;
      mountain4.tint = _initGrad.mountain;

      function createMountainSprite(resourceName, xPos, velocity, foreground) {
        const sprite = new PIXI.Sprite(textures[resourceName]);

        const scaleFactor = Math.min(
          app.screen.height * 0.6 / sprite.height,
          app.screen.width * 1.5 / sprite.width
        );

        sprite.scale.set(scaleFactor);
        sprite.anchor.set(0, 1);

        const minHeightOffset = foreground ? foreground.height * 0.15 : 0;
        const heightOffsetRatio = (1 - scaleFactor) * 0.3;

        const foregroundHeightOffset = foreground ? minHeightOffset + sprite.height * heightOffsetRatio : 0;
        sprite.position.set(xPos, app.screen.height - foregroundHeightOffset);
        sprite.zIndex = -1;
        sprite.velocity = velocity;

        return sprite;
      }
      mountain3.scale.x = .6;
      mountain3.scale.y = .65;
      mountain4.scale.x = .5;
      mountain4.scale.y = .55;
      foreground.x = 0;
      // mountain3.scale.x = 100;
      const castleTexture = PIXI.Assets.get('castle');
      const castle = new PIXI.Sprite(castleTexture);
      const castlePlayer = new PIXI.Sprite(castleTexture);
      castlePlayer.anchor.set(1, 1);
      castlePlayer.position.set(200, app.screen.height - castle.height * 0.25);
      castle.anchor.set(1, 1);
      castle.position.set(foreground.width, app.screen.height - castle.height * 0.25);
      const originalTint = castle.tint;
      const hpBarWidth = 180;
      const hpBarHeight = 16;

      const hpBarX = castle.position.x - castle.width / 1.1;
      const hpBarY = app.screen.height - 40 - hpBarHeight - 210; // Adjusted position
      const hpBarBackgroundColor = 0x000000;
      const hpBar = new PIXI.Graphics();
      hpBar.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight).fill({ color: hpBarColor, alpha: 1 });
      const hpBarBackground = new PIXI.Graphics();
      const hpBarBorderColor = 0x000000; // Black color
      const hpBarBorderThickness = 4;
      hpBarBackground.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight).fill({ color: hpBarBackgroundColor, alpha: 0.5 }).stroke({ width: hpBarBorderThickness, color: hpBarBorderColor });
      hpBarBackground.rect(hpBarX + hpBarBorderThickness, hpBarY + hpBarBorderThickness, hpBarWidth - hpBarBorderThickness * 2, hpBarHeight - hpBarBorderThickness * 2).fill({ color: hpBarBackgroundColor, alpha: 1 });
    

 

      let frogIdleTexture = textures.frog;
      let frogIdleTextures = [frogIdleTexture];
      const frogIdleTextures1 = [frogIdleTexture];
      state.frogWalkTextures = createAnimationTextures('frog_walk', 10, 351);
      state.frogAttackTextures = createAnimationTextures('frog_attack', 12, 351);
      const frogWalkTextures1 = createAnimationTextures('frog_walk', 10, 351);
      const frogAttackTextures1 = createAnimationTextures('frog_attack', 12, 351);
      const critterAttackTextures = createAnimationTextures('critter_attack', 13, 266);
      critterWalkTextures = createAnimationTextures('critter_walk', 12, 266);
      const snailWalkTextures = createAnimationTextures2('snail_walk', 20, 562, 3560, 2248);
      const snailAttackTextures = createAnimationTextures2('snail_attack', 20, 562, 2848, 3372);
      const pufferWalkTextures = createAnimationTextures2('puffer_walk', 15, 413, 3705, 1239);
      const pufferAttackTextures = createAnimationTextures2('puffer_attack', 21, 413, 2223, 2891);
      const beeWalkTextures = createAnimationTextures2('bee_walk', 9, 256, 2753, 256);
      const beeAttackTextures = createAnimationTextures2('bee_attack', 18, 256, 1950, 1024);
      const birdWalkTextures = createAnimationTextures2('bird_walk', 13, 403, 2541, 806);
      const birdAttackTextures = createAnimationTextures2('bird_attack', 13, 403, 2541, 806);

      // Generate recolored skin textures for equipped skins (engine in skins.js)
      generateSkinTextures(textures, textureScaleFactors);

      // Apply skin textures for frog (default starting character) if equipped
      if (getSkinTextures('frog', 'walk')) {
        state.frogWalkTextures = getSkinTextures('frog', 'walk');
        state.frogAttackTextures = getSkinTextures('frog', 'attack');
        frogIdleTextures = state.frogWalkTextures;
      }

      const cloudsTexture = textures.clouds;
      const clouds2Texture = textures.clouds2;
      const scorpWalkTextures = createAnimationTextures2('scorp_walk', 6, 499, 2202, 499);
      const scorpAttackTextures = createAnimationTextures2('scorp_attack', 9, 499, 3303, 499);
      const tooferWalkTextures = createAnimationTextures2('toofer_walk', 6, 377, 2412, 377);
      const tooferAttackTextures = createAnimationTextures2('toofer_attack', 15, 377, 1206, 1885);
      const octoWalkTextures = createAnimationTextures2('octo_walk', 10, 482, 3415, 964);
      const octoAttackTextures = createAnimationTextures2('octo_attack', 18, 482, 3415, 1928);
      const eleWalkTextures = createAnimationTextures2('ele_walk', 6, 377, 2256, 377);
      const eleAttackTextures = createAnimationTextures2('ele_attack', 12, 377, 1128, 1508);
      const pigWalkTextures = createAnimationTextures2('pig_walk', 6, 618, 1590, 1854);
      const pigAttackTextures = createAnimationTextures2('pig_attack', 15, 618, 2385, 3090);
      const sharkWalkTextures = createAnimationTextures2('shark_walk', 10, 398, 1398, 1990);
      const sharkAttackTextures = createAnimationTextures2('shark_attack', 21, 398, 3495, 1990);
      state.sharkEmergeTextures = createAnimationTextures2('shark_emerge', 5, 398, 699, 1990);
      const CLOUD_TILE_WIDTH = 50000;
      const clouds = createTilingSprite(cloudsTexture, CLOUD_TILE_WIDTH, 200);
      const clouds2 = createTilingSprite(clouds2Texture, CLOUD_TILE_WIDTH, 200);
      clouds2.position.y += 100;
      clouds2.alpha = .3;
      // Apply initial cloud tint from weather
      clouds.tint = _initGrad.cloud;
      clouds2.tint = _initGrad.cloud;

      // Wire biome transition module with getter/setter closures for reassignable variables
      initBiomeTransition({
        getEndlessGround: () => endlessGround,
        setEndlessGround: (v) => { endlessGround = v; },
        getEndlessGroundDecor: () => endlessGroundDecor,
        setEndlessGroundDecor: (v) => { endlessGroundDecor = v; },
        getEndlessGroundDecorFG: () => endlessGroundDecorFG,
        setEndlessGroundDecorFG: (v) => { endlessGroundDecorFG = v; },
        getEndlessGroundCurrentWeather: () => endlessGroundCurrentWeather,
        setEndlessGroundCurrentWeather: (v) => { endlessGroundCurrentWeather = v; },
        getCurrentSkyTop: () => currentSkyTop,
        setCurrentSkyTop: (v) => { currentSkyTop = v; },
        getCurrentSkyBottom: () => currentSkyBottom,
        setCurrentSkyBottom: (v) => { currentSkyBottom = v; },
        background,
        persistentStars,
        mountains: [mountain1, mountain2, mountain3, mountain4],
        clouds: [clouds, clouds2],
        foreground,
        endlessGroundHeight,
      });

      const enemyDeathTextures = createAnimationTextures('enemy_death', 8, 317);
      state.enemyDeath = createAnimatedSprite(enemyDeathTextures);
      const castleDeathTextures = createAnimationTextures('enemy_death', 8, 317);
      let castleDeath = createAnimatedSprite(castleDeathTextures);
      const playerSpawn = createAnimatedSprite(enemyDeathTextures);
      castleDeath.animationSpeed = 0.175;
      castleDeath.loop = false;
      castleDeath.anchor.set(1, 0);
      castleDeath.scale.set(0.5);
      let characterTextures;

      characterTextures = state.frogWalkTextures;
      critter = createAnimatedSprite(characterTextures);
      critter.eventMode = 'static';

      critter.textures = state.frogWalkTextures;
      critter.loop = true;
      critter.play();

      // Wire potion system (needs critter + app refs)
      initPotion(critter, app);
      wirePotionListeners();

      // Item button click handlers — must be after critter is created
      initItemButtons(critter, app);

      // Define the desired color in hexadecimal format
      const desiredColor = 0x00ff00; // Green color

      // Apply the color filter to the sprite
      playerSpawn.tint = desiredColor;
      playerSpawn.animationSpeed = 0.175;
      playerSpawn.loop = false;
      playerSpawn.anchor.set(.65, 0.2);
      playerSpawn.scale.set(0.35);
      updateCurrentLevels();
      state.enemyDeath.animationSpeed = 0.175;
      state.enemyDeath.loop = false;
      state.enemyDeath.anchor.set(0.2, 0);
      state.enemyDeath.scale.set(0.35);
      state.enemyDeath.position.set(-10000, -100000);
      const velocity = new PIXI.Point();
      let xDir = 0;
      let yDir = 0;
      let isMoving = false;

      function createAnimationTextures(resourceName, frameCount, frameHeight) {
        const textures1 = [];
        const scale = textureScaleFactors[resourceName] || 1;
        const textureWidth = textures[resourceName].width / frameCount;
        const scaledFrameHeight = Math.floor(frameHeight * scale);

        for (let i = 0; i < frameCount; i++) {
          const rect = new PIXI.Rectangle(i * textureWidth, 0, textureWidth, scaledFrameHeight);
          const texture1 = new PIXI.Texture({ source: textures[resourceName].source, frame: rect });
          textures1.push(texture1);
        }

        return textures1;
      }

      function createAnimationTextures2(resourceName, frameCount, frameHeight, sheetWidth, sheetHeight) {
        const textures1 = [];
        const scale = textureScaleFactors[resourceName] || 1;
        const sFrameHeight = Math.floor(frameHeight * scale);
        const sSheetWidth = Math.floor(sheetWidth * scale);
        const sSheetHeight = Math.floor(sheetHeight * scale);
        const frameWidth = sSheetWidth / Math.ceil(frameCount / (sSheetHeight / sFrameHeight));

        for (let i = 0; i < frameCount; i++) {
          const row = Math.floor(i / (sSheetWidth / frameWidth));
          const col = i % (sSheetWidth / frameWidth);
          const rect = new PIXI.Rectangle(col * frameWidth, row * sFrameHeight, frameWidth, sFrameHeight);
          const texture1 = new PIXI.Texture({ source: textures[resourceName].source, frame: rect });
          textures1.push(texture1);
        }

        return textures1;
      }

      function createAnimatedSprite(textures) {
        const sprite = new PIXI.AnimatedSprite(textures);
        sprite.scale.set(0.5);
        sprite.anchor.set(.5, .5);
        sprite.position.set(app.screen.width / 3, app.screen.height - foreground.height / 1.6);
        sprite.animationSpeed = 0.25;
        sprite.zIndex = 1;
        sprite.loop = true;
        return sprite;
      }

      function createTilingSprite(texture, width, height) {
        const sprite = new PIXI.TilingSprite(texture, width, height);
        sprite.tileScale.set(0.4);
        sprite.tilePosition.y = 200;
        app.stage.addChild(sprite);
        return sprite;
      }

      // Variables
      let attackAnimationPlayed = false; // Flag variable to track if attack animation has played
      let pointerHoldInterval;
      let activeTouches = 0;

      handleTouchEnd = function(event) {
        activeTouches--;
        clearInterval(pointerHoldInterval);
        pointerHoldInterval = null;
        state.isPointerDown = false;
        if (!attackAnimationPlayed) {
          return;
        }
        xDir = 1;
      };

      function handleMouseLeave(event) {
        state.isPointerDown = false;
        attackAnimationPlayed = true;
        handleTouchEnd(event);
      }

      app.stage.eventMode = 'static';
      app.stage.on("pointerdown", handleTouchStart);
      app.stage.on("pointerup", handleTouchEnd);
      app.stage.on("pointerupoutside", handleTouchEnd);
      xDir = 1;
      updateVelocity();
      critter.loop = true;

      function handleTouchHold() {
        if (getisPaused()) {
          return;
        }
        if (state.roundOver === true) { isAttacking = false; attackAnimationPlayed = false; return; }
        if (!state.isAttackingChar) {
          if (!getisDead()) {
            state.isAttackingChar = true;
            const attackingChar = getCurrentCharacter();
            critter.textures = state.frogAttackTextures;
            setCharAttackAnimating(true);
            critter.loop = false;
            critter.onComplete = function () {
              if (!state.isAttackingChar) {
                // Attack was interrupted or already resolved — restore walk textures
                critter.textures = state.frogWalkTextures;
                critter.loop = true;
                setCharAttackAnimating(false);
                critter.play();
                return;
              }
              if (state.isAttackingChar) {
                attackAnimationPlayed = true;
                state.attackSound.volume = state.effectsVolume;
                state.attackSound.play();
                if (attackingChar === "character-bird") {
                  // Skip firing if no alive enemies ahead within egg range
                  const hasTarget = getEnemies().some(e => e.isAlive && e.position.x > critter.position.x && e.position.x - critter.position.x < 500);
                  if (!hasTarget && !(state.siegeActive && state.siegePhase === 'castle')) {
                    state.isAttackingChar = false;
                    setIsCharAttacking(false);
                    setCharAttackAnimating(false);
                    critter.textures = state.frogWalkTextures;
                    critter.loop = true;
                    critter.play();
                    return;
                  }
                  const birdProjectile = new PIXI.Sprite(textures.bird_egg);
                  birdProjectile.position.set(
                    critter.position.x,
                    critter.position.y
                  );
                  birdProjectile.name = "birdProjectile";
                  birdProjectile.scale.set(0.3);
                  birdProjectile.zIndex = 11;
                  app.stage.addChild(birdProjectile);

                  const projectileSpeed = 6;
                  const maxDistance = 450; // You can change this to the maximum distance you want the egg to travel
                  const startingX = birdProjectile.x;
                  const gravity = 0.1; // This controls the strength of the "gravity"
                  let verticalSpeed = -3; // This is the initial vertical speed. A negative value means the projectile will move up at first.

                  function updateProjectile() {
                    birdProjectile.x += projectileSpeed * state.dt;

                    // Apply the "gravity" to the vertical speed
                    verticalSpeed += gravity * state.dt;
                    // Apply the vertical speed to the projectile's position
                    birdProjectile.y += verticalSpeed * state.dt;

                    if (Math.abs(birdProjectile.x - startingX) > maxDistance) {
                      // If the projectile has travelled more than the maximum distance, remove it
                      app.stage.removeChild(birdProjectile);
                      app.ticker.remove(updateProjectile);
                    }

                    // If the birdProjectile has been removed for any other reason, stop the update
                    if (!app.stage.children.includes(birdProjectile)) {
                      app.ticker.remove(updateProjectile);
                    }
                  }

                  app.ticker.add(updateProjectile);
                }

                // Siege castle combat (endless mode)
                if (state.siegeActive && state.siegePhase === 'castle' && state.siegeCastleSprite &&
                    critter.position.x > state.siegeCastleSprite.position.x - state.siegeCastleSprite.width / 1.1) {
                  siegeCastleTakeDamage(getCharacterDamage(attackingChar), critter, app);
                }

                if (state.gameMode !== 'endless' && critter.position.x > castle.position.x - castle.width / 1.1) {
                  const greyscaleFilter = new PIXI.ColorMatrixFilter();
                  const remainingHealthPercentage = castleHealth / castleMaxHealth;
                  const greyscaleFactor = 1 - remainingHealthPercentage;

                  greyscaleFilter.desaturate(greyscaleFactor);

                  castle.filters = [greyscaleFilter];

                  castleTakeDamage(getCharacterDamage(attackingChar));
                }
                state.isAttackingChar = false;
                isMoving = false;
              }
              state.isAttackingChar = false;
              setCharAttackAnimating(false);
              // Restore walk textures after attack resolves
              critter.textures = state.frogWalkTextures;
              critter.loop = true;
              critter.play();
            };
            critter.play();
          } else { state.isAttackingChar = false; }
        }
      }

      function handleTouchStart(event) {


        const deleteButton = event.target;


        if (deleteButton && deleteButton.text === '🗑️') {
          return;
        }
        if (deleteButton && deleteButton.isDeleteSaveBtn) {
          return;
        }
        if (deleteButton.isSlider) {
          return;
        }
        if ((deleteButton && deleteButton.text === '🔊') || (deleteButton && deleteButton.text === '🔈')) {
          return;
        }
        if (deleteButton === backgroundSprite || deleteButton === state.pauseMenuContainer) {
          return;
        }
        if (deleteButton === state.pauseMenuContainer || deleteButton.myCustomID === 'pauseMenuX') {
          return;
        }


        if (state.isPointerDown) {
          state.isPointerDown = false;
          attackAnimationPlayed = true;
          handleTouchEnd(event);

        }


        activeTouches++;

        if (attackAnimationPlayed) {
          attackAnimationPlayed = false;
        }

        if (getisPaused()) {


          if (getPlayerCurrentHealth() > 0) {

            setisPaused(false);
            // Hide the spawn text
            document.getElementById('spawn-text').style.visibility = 'hidden';
          }
          return;
        }
        state.isPointerDown = true;
        pointerHoldInterval = setInterval(handleTouchHold, 10);
      }

      function getCharacterSpeed(currentCharacter) {
        switch (state.currentCharacter) {
          case 'character-snail':
            return getSnailSpeed();
          case 'character-bird':
            return getBirdSpeed();
          case 'character-frog':
            return getFrogSpeed();
          case 'character-bee':
            return getBeeSpeed();
          default:
            console.log('Invalid character', state.currentCharacter);
        }
      }


      function updateVelocity() {

        setIsCharAttacking(false);
        velocity.x = xDir * getCharacterSpeed(getCurrentCharacter());
        velocity.y = yDir * getCharacterSpeed(getCurrentCharacter());
        if (isMoving) {
          mountainVelocity1.x = mountainVelocityX;
          mountainVelocity1.y = mountainVelocityY;
          mountainVelocity2.x = mountainVelocityX;
          mountainVelocity2.y = mountainVelocityY;

        }

      }

      // Function to update the HP bar based on the castle's health
      function updateHPBar(health, maxHealth) {

        const hpRatio = health / maxHealth;
        const newHpWidth = Math.max(0, hpBarWidth * hpRatio);
        hpBar.clear();
        hpBar.rect(hpBarX, hpBarY, newHpWidth, hpBarHeight).fill(hpBarColor);
      }

let hasExploded = false;
      // Damage function
      function castleExpDrop(damage){
        expToGive = Math.round(damage * 0.75);
        if(cantGainEXP){return;}
        if(state.gameMode === 'endless'){return;}
        const expDrop = new PIXI.Text("+" + expToGive+ " EXP", {
          fontSize: 18,
          fill: "orange",
          fontWeight: "bold",
          stroke: "#000",
          strokeThickness: 3,
          strokeOutside: true
        });


        updateEXP(getCharEXP(getCurrentCharacter()) + expToGive);
        expDrop.position.set(critter.position.x + 20, critter.position.y - 20);
        expDrop.zIndex = 9999999999;
        app.stage.addChild(expDrop);
    
        // Animate the EXP drop text
        const startY = critter.position.y - 20;
    
        const endY = startY - 50; // Adjust the value to control the floating height
        const duration = 2600; // Animation duration in milliseconds
        const startTime = performance.now();
    
        const animateExpDrop = (currentTime) => {
          const elapsed = currentTime - startTime;
    
          if (elapsed < duration) {
            const progress = elapsed / duration;
            const newY = startY - (progress * (startY - endY));
            expDrop.position.y = newY;
            requestAnimationFrame(animateExpDrop);
          } else {
            // Animation complete, remove the EXP drop text
            app.stage.removeChild(expDrop);
          }
        };
    
        requestAnimationFrame(animateExpDrop);

      }
      let expToGive = 0;
      function castleTakeDamage(damage) {
        castleHealth -= damage;
        
        if ((castleHealth <= 0) && (!hasExploded)) {

         
          let newHP = getPlayerCurrentHealth() + 25;
          if (newHP < getPlayerHealth()) {
            setPlayerCurrentHealth(newHP);
            updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
          }
          else {
            setPlayerCurrentHealth(getPlayerHealth());
            updatePlayerHealthBar(getPlayerHealth() / getPlayerHealth() * 100);
          }
          hasExploded=true;
          castleExplode();
        }
        else{
          castleExpDrop(damage);}

        updateHPBar(castleHealth, castleMaxHealth);
      }
let cantGainEXP = false;

      function castleExplode() {
        cantGainEXP = true;
        state.currentRound++;
        // Transition ground biome for the new round
        const newWeather = getWeatherType();
        if (endlessGround && newWeather !== endlessGroundCurrentWeather && !state.biomeTransition) {
          transitionWeather(newWeather);
        } else {
          createWeatherEffects();
        }

        // Rebuild enemy types for the new round
        buildEnemyTypes();
        setEnemiesInRange(0);
        resetEnemiesState();
        state.exploded = true;
        app.stage.removeChild(castle);
        let completedExplosions = 0; // Counter for completed explosions
        createCoffeeDrop(critter.position.x + 20, critter.position.y-20);

        // Create multiple explosions
        for (let i = 0; i < 7; i++) {
            // Create a new explosion sprite for each explosion
            const explosion = createAnimatedSprite(castleDeathTextures);
            explosion.zIndex = 15;

            // Customize the position, size, speed, and tint of each explosion
            explosion.position.set(
                castle.position.x + Math.random() * 70 - 25 - 140,
                castle.position.y - 100 + Math.random() * 70 - 25
            );
            if (i === 6) { // Conditions for the last explosion
              explosion.scale.set(0.35); // This sets the size of the last explosion
              explosion.animationSpeed = 0.1; // This makes the last explosion go really slow
              explosion.tint = 0x000000; // This makes the last explosion black
              explosion.position.set(explosion.position.x, explosion.position.y + 50);
          } else {
              explosion.scale.set(0.35 * (0.75 + Math.random() * 0.5));
              explosion.animationSpeed = 0.1 + Math.random() * .1 - .03;
              explosion.tint = getRandomColor();
          }
          explosion.loop=false;
            // Add the explosion sprite to the stage
            app.stage.addChild(explosion);

            // Play the explosion animation
            explosion.gotoAndPlay(0);

            // Remove the explosion animation after it completes
            explosion.onComplete = () => {
                app.stage.removeChild(explosion);
                completedExplosions++; // Increment the counter when an explosion completes

                if (completedExplosions === 7) { // All explosions completed
                  state.roundOver = true;
              }
            };
        }
       // state.demiSpawned = 2;
    }
    

      let unPauser = 0;
      const maxX = foreground.width - critter.width / 2;
      const cloudSpeed = .5 / 3.5;
      const cloud2Speed = 1.1 / 3.5;
      const mountain1Speed = 0.01;
      const mountain2Speed = 0.05;
      const mountain3Speed = .03;
      const mountain4Speed = .03;

      // Wrap mountains so they reappear on the opposite side when scrolling off-screen
      function wrapMountains() {
        const cam = -app.stage.x; // current camera left edge in world coords
        const screenW = app.screen.width;
        const margin = 200; // buffer before recycling
        [mountain1, mountain2, mountain3, mountain4].forEach(m => {
          // anchor is (0,1): position.x = left edge
          const mRight = m.position.x + m.width;
          const mLeft = m.position.x;
          // If entirely off the left side of the visible area
          if (mRight < cam - margin) {
            m.position.x = cam + screenW + margin + Math.random() * 300;
          }
          // If entirely off the right side of the visible area
          else if (mLeft > cam + screenW + margin) {
            m.position.x = cam - margin - m.width - Math.random() * 300;
          }
        });
      }

      state.initialClouds = clouds.position.x;
      let once = 0;
      app.ticker.add((ticker) => {
        state.dt = ticker.deltaTime;
        // Spawn protection / feather revive visual effect
        if (Date.now() < state.spawnProtectionEnd && critter) {
          if (state.featherReviveEnd && Date.now() < state.featherReviveEnd) {
            // Gold shimmer during feather revive
            const pulse = 0.7 + Math.sin(Date.now() * 0.008) * 0.3;
            critter.alpha = pulse;
            critter.tint = 0xffd700;
          } else {
            // Normal spawn protection blink
            critter.alpha = (Math.floor(Date.now() / 100) % 2 === 0) ? 0.4 : 1.0;
          }
        } else if (critter && (critter.alpha !== 1 || critter.tint === 0xffd700)) {
          critter.alpha = 1;
          if (state.featherReviveEnd) {
            critter.tint = state.rageActive ? 0xff4444 : (state.skinBaseTint || 0xffffff);
            state.featherReviveEnd = null;
          }
        }

        if (state.detailMode === 'high') {
          updateSkinEffects(critter, Date.now());
        }
        updateWeatherEffects();
        updateBiomeTransition();

        background.position.set(-app.stage.x, -app.stage.y);
        persistentStars.position.set(-app.stage.x, -app.stage.y);
        for (const star of persistentStars.children) {
          star.twinklePhase += star.twinkleSpeed;
          star.alpha = star.baseAlpha * (0.5 + Math.sin(star.twinklePhase) * 0.5);
          if (star.isBrightTwinkler) {
            const s = 1 + Math.sin(star.twinklePhase * 2) * 0.15;
            star.scale.set(s);
          }
        }

        // Endless mode: update kill counter + track elapsed for weather cycling
        if (state.gameMode === 'endless' && state.endlessStartTime && !getisPaused()) {
          state.endlessElapsed = Math.floor((Date.now() - state.endlessStartTime) / 1000);

          // Cycle weather every 60s — crossfade ground + weather effects
          const currentWeather = getWeatherType();
          if (endlessGround && currentWeather !== endlessGroundCurrentWeather && !state.biomeTransition) {
            transitionWeather(currentWeather);
          }

          // --- Spawn chain safety net ---
          // If the setTimeout chain stalled (e.g. browser throttled background tab),
          // detect the gap and restart spawning.
          if (!getisDead() && !getisPaused()) {
            const spawnGap = Date.now() - state.timeOfLastSpawn;
            const maxAllowedGap = 15000; // 15s — well above any normal interval
            if (spawnGap > maxAllowedGap) {
              console.warn('[spawn-safety] Spawn chain stalled for', spawnGap, 'ms — restarting');
              if (state.enemySpawnTimeout) clearTimeout(state.enemySpawnTimeout);
              state.enemySpawnTimeout = null;
              state.isSpawning = false;
              spawnEnemies();
            }
          }
        }

        if (isTimerFinished()) {

          spawnDemi();
          pauseTimer();
        }
        if (state.reviveDialogContainer) {
          updateDialogPositions();
        }
        if (state.pauseMenuContainer) {
          updateDialogPositions();
        }
        // Wipe detection — all characters dead and can't afford revive
        // Runs before pause check so it triggers even while revive dialog is open
        if (getisDead() && !state.isWiped
            && state.currentSnailHealth + state.currentBeeHealth + state.currentBirdHealth + state.currentFrogHealth <= 0
            && getCoffee() < 50) {
          // Clean up ghost fly
          if (state.ghostFlyInterval) {
            clearInterval(state.ghostFlyInterval);
            state.ghostFlyInterval = null;
          }
          if (state.frogGhostPlayer && app.stage.children.includes(state.frogGhostPlayer)) {
            app.stage.removeChild(state.frogGhostPlayer);
          }
          // Clean up revive dialog if present
          if (state.reviveDialogContainer && app.stage.children.includes(state.reviveDialogContainer)) {
            app.stage.removeChild(state.reviveDialogContainer);
            state.reviveDialogContainer = null;
          }
          // Clean up siege if active
          if (state.siegeActive) {
            cleanupSiege();
          }
          // Stop flashing character portraits
          stopFlashing();

          // Show wipe screen
          setisWiped(true);
          document.getElementById('spawn-text').style.visibility = 'hidden';
          const wipeCharBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
          wipeCharBoxes.forEach((box) => { box.style.visibility = 'hidden'; });
          state.isCharacterMenuOpen = false;

          const wipeEl = document.getElementById('wipe-text');
          const score = state.endlessKillCount;
          const mode = 'endless';

          wipeEl.innerHTML = '';
          const wipeTitle = document.createElement('div');
          wipeTitle.className = 'wipe-title';
          wipeTitle.textContent = 'GAME OVER';
          wipeEl.appendChild(wipeTitle);

          const wipeSubtitle = document.createElement('div');
          wipeSubtitle.className = 'wipe-subtitle';
          wipeSubtitle.textContent = state.gameMode === 'endless'
            ? 'Castle #' + Math.floor(state.endlessKillCount / 10)
            : 'Round ' + state.currentRound;
          wipeEl.appendChild(wipeSubtitle);

          wipeEl.style.visibility = 'visible';

          setTimeout(() => {
            showScoreSubmitOverlay(mode, score);
          }, 2500);
          return;
        }

        if (getisPaused()) {
          // Game is paused, skip logic
          critter.stop();

          getEnemies().forEach(enemy => {
            enemy.stop();
          });
          unPauser = 1;
          return;
        }
        if (unPauser === 1) {
          critter.play();
          // Only resume enemies that are actively engaged — queued ones stay idle
          getEnemies().forEach(enemy => {
            if (enemy.isAlive && enemy.position.x - critter.position.x <= 100) {
              enemy.play();
            }
          });
          unPauser = 0;
          return;
        }

        // Safety net: if pointer is held but the attack interval was cleared, restart it
        if (state.isPointerDown && !pointerHoldInterval && !getisDead() && !state.roundOver) {
          pointerHoldInterval = setInterval(handleTouchHold, 10);
        }

        if (state.roundOver) {

          // Mountain parallax
          mountain1.position.x -= velocity.x * mountain1Speed * state.dt;
          mountain2.position.x += velocity.x * mountain2Speed * state.dt;
          mountain3.position.x += velocity.x * mountain3Speed * state.dt;
          mountain4.position.x += velocity.x * mountain4Speed * state.dt;
          wrapMountains();

          {

            if (state.currentSnailHealth + state.currentBeeHealth + state.currentBirdHealth + state.currentFrogHealth <= 0) {
              if (!state.isWiped) {
                setisWiped(true);

                // Hide character selection text
                document.getElementById('spawn-text').style.visibility = 'hidden';

                // Hide character menu boxes
                const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
                characterBoxes.forEach((box) => { box.style.visibility = 'hidden'; });
                state.isCharacterMenuOpen = false;

                // Clean up siege if active
                if (state.siegeActive) {
                  cleanupSiege();
                }

                const wipeEl = document.getElementById('wipe-text');
                const score = state.endlessKillCount;
                const mode = 'endless';

                // Build styled wipe screen
                wipeEl.innerHTML = '';
                const title = document.createElement('div');
                title.className = 'wipe-title';
                title.textContent = 'GAME OVER';
                wipeEl.appendChild(title);

                const subtitle = document.createElement('div');
                subtitle.className = 'wipe-subtitle';
                subtitle.textContent = state.gameMode === 'endless'
                  ? 'Castle #' + Math.floor(state.endlessKillCount / 10)
                  : 'Round ' + state.currentRound;
                wipeEl.appendChild(subtitle);

                wipeEl.style.visibility = 'visible';

                setTimeout(() => {
                  showScoreSubmitOverlay(mode, score);
                }, 2500);
              }
            }

            playRoundText(state.currentRound);


            castle.tint = originalTint;
            setCharAttackAnimating(false);
            setIsCharAttacking(false);
            app.stage.removeChild(state.frogGhostPlayer);
            critter.position.set(state.endlessDeathX || app.screen.width / 20, state.stored);
            if (state.fullReset) {
              setPlayerCurrentHealth(getPlayerHealth());
              updatePlayerHealthBar(getPlayerHealth() / getPlayerHealth() * 100);
            }
            // Reset castle health
            castleHealth = castleMaxHealth + 20;
            castleMaxHealth = castleHealth;
            updateHPBar(castleHealth, castleMaxHealth);

            // Remove any existing enemy death sprites
            // Set state.isCombat and playAgain to false
            state.isCombat = false;
            enemyPortrait = document.getElementById('enemy-portrait');
            enemyPortrait.style.display = 'none'; // Make the element visible
            playAgain = false;
            state.isAttackingChar = false;
            isMoving = true;;
            setIsDead(false);
            critter.loop = true;
            critter.textures = state.frogWalkTextures;
            critter.play();
            setEnemiesInRange(0);
            // setPlayerCurrentHealth(0);
            // Clear the enemies array
            state.isPointerDown = false;
            let characterHealth;

            switch (getCurrentCharacter()) {
              case 'character-snail':
                characterHealth = state.currentSnailHealth;
                break;
              case 'character-bird':
                characterHealth = state.currentBirdHealth;
                break;
              case 'character-frog':
                characterHealth = state.currentFrogHealth;
                break;
              case 'character-bee':
                characterHealth = state.currentBeeHealth;
                break;
              default:
                console.log('Invalid character', characterType);
                return;
            }
            if (characterHealth == 0) {
              setisPaused(true); // Exit the function, don't perform any further actions
            }


            if (state.fullReset) {
              // Loop through the enemies array and remove each enemy
              for (let i = 0; i < getEnemies().length; i++) {
                let enemy = getEnemies()[i];
                app.stage.removeChild(enemy);
                app.stage.removeChild(enemy.hpBar);
                app.stage.removeChild(enemy.hpBarBackground);
                // Destroy the enemy object to free up memory

              }

              enemies.length = 0;
            }
            state.roundOver = false;
            state.spawnedThisRound = 0;
            // setisPaused(false);
            setIsDead(false);
            resetEnemiesState();
            spawnEnemies();

          }
          return;
        }
        //setisPaused(true);

        if (getCharSwap()) {
          if (getCurrentCharacter() === "character-bird") {
            playerSpawn.tint = 0x0000ff; // Blue
            playerSpawn.blendMode = 'add';
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = getSkinTextures('bird', 'walk') || birdWalkTextures;
            frogIdleTextures = state.frogWalkTextures;
            state.frogAttackTextures = getSkinTextures('bird', 'attack') || birdAttackTextures;

          }
          else if (getCurrentCharacter() === "character-frog") {
            playerSpawn.blendMode = 'add';
            playerSpawn.tint = 0x00ff80; // Light green
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = getSkinTextures('frog', 'walk') || frogWalkTextures1;
            frogIdleTextures = state.equippedSkins['frog'] ? state.frogWalkTextures : frogIdleTextures1;
            state.frogAttackTextures = getSkinTextures('frog', 'attack') || frogAttackTextures1;

          }
          else if (getCurrentCharacter() === "character-snail") {
            playerSpawn.blendMode = 'add';
            playerSpawn.tint = 0x800080; // Dark purple
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = getSkinTextures('snail', 'walk') || snailWalkTextures;
            frogIdleTextures = state.frogWalkTextures;
            state.frogAttackTextures = getSkinTextures('snail', 'attack') || snailAttackTextures;

          }
          else if (getCurrentCharacter() === "character-bee") {
            playerSpawn.tint = 0xffff00; // Yellow
            playerSpawn.blendMode = 'add';
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = getSkinTextures('bee', 'walk') || beeWalkTextures;
            frogIdleTextures = state.frogWalkTextures;
            state.frogAttackTextures = getSkinTextures('bee', 'attack') || beeAttackTextures;

          }
          // Character swap: apply correct textures before showing critter
          critter.textures = state.frogWalkTextures;
          critter.loop = true;
          critter.onComplete = null;  // Clear stale attack callback
          state.isAttackingChar = false;  // Reset attack state (revive dialog click can leave this stuck)
          critter.play();
          updateKillProgressBar();
          document.getElementById('spawn-text').style.visibility = 'hidden';
          updateVelocity();
          setCharSwap(false);
          stopFlashing();
          clearSkinEffects();
          critter.tint = 0xffffff;
          applyHat(critter, getCurrentCharacter());
          applySkinFilter(critter, getCurrentCharacter());
          // Update defense for this character
          const swapChar = getCurrentCharacter().replace('character-', '');
          state.defense = (state.charDefense && state.charDefense[swapChar]) || 0;
          critter.visible = true;
          app.stage.addChild(critter);
          // Ensure health bar reflects the new character (fixes stale bar after dead→alive swap)
          updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
          // Refresh character menu so it shows the updated swap options
          showCharacterMenu();
          // Fall through to auto-attack check (no early return)
        }
        // Reconcile enemiesInRange with reality — prevent stale counter after baby clears
        if (getEnemiesInRange() > 0) {
          const aliveNearby = getEnemies().filter(e => e.isAlive && e.enemyAdded).length;
          if (aliveNearby === 0) {
            setEnemiesInRange(0);
            state.isCombat = false;
            state.isAttackingChar = false;
            setIsCharAttacking(false);
          }
        }
        // Safety: if stuck in attack textures with nothing to fight, restore walk
        if (!state.isAttackingChar && getEnemiesInRange() === 0 && critter.textures === state.frogAttackTextures) {
          critter.textures = state.frogWalkTextures;
          critter.loop = true;
          setCharAttackAnimating(false);
          critter.play();
        }
        // Auto-attack: trigger attack when enemies are in range, or at siege castle
        const atSiegeCastle = state.siegeActive && state.siegePhase === 'castle' && state.siegeCastleSprite &&
          critter.position.x >= state.siegeCastleSprite.position.x - state.siegeCastleSprite.width / 1.1;
        if ((state.autoAttack || atSiegeCastle) && (getEnemiesInRange() > 0 || atSiegeCastle) && !state.isAttackingChar && !state.isPointerDown) {
          handleTouchHold();
        }

        // --- Item pickup proximity check ---
        if (state.gameMode === 'endless' && state.groundItems.length > 0 && critter) {
          for (let i = state.groundItems.length - 1; i >= 0; i--) {
            const item = state.groundItems[i];
            if (item.collected) continue;
            const dx = critter.position.x - item.x;
            const dy = critter.position.y - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Proximity pickup or auto-collect after 3s
            if (dist < 80 || (Date.now() - item.createdAt > 3000)) {
              collectGroundItem(item);
            }
          }
        }

        // --- Shield visual update ---
        if (state.shieldActive && state.shieldSprite && critter) {
          state.shieldSprite.position.set(critter.position.x, critter.position.y);
          // Pulse alpha — visible enough to see the bubble
          const pulse = 0.55 + Math.sin(Date.now() * 0.005) * 0.2;
          state.shieldSprite.alpha = pulse;
          // Scale based on remaining HP
          const s = 0.8 + (state.shieldHP / 100) * 0.2;
          state.shieldSprite.scale.set(s);
        }

        // --- Rage timer update ---
        if (state.rageActive) {
          if (Date.now() > state.rageEndTime) {
            state.rageActive = false;
            critter.tint = state.skinBaseTint || 0xffffff;
            if (state.originalAnimSpeed) {
              critter.animationSpeed = state.originalAnimSpeed;
              state.originalAnimSpeed = null;
            }
            const rageBtnEl = document.getElementById('rage-btn');
            if (rageBtnEl) {
              rageBtnEl.classList.remove('rage-active-glow');
              if (getRageCount() <= 0) {
                rageBtnEl.style.display = 'none';
                repositionItemButtons();
              }
            }
            const rageFill = document.getElementById('rage-fill');
            if (rageFill) rageFill.style.height = '0%';
          } else {
            // Drain the rage fill meter
            const elapsed = Date.now() - state.rageStartTime;
            const remaining = Math.max(0, 1 - elapsed / 30000);
            const rageFill = document.getElementById('rage-fill');
            if (rageFill) rageFill.style.height = (remaining * 100) + '%';
            // Pulse tint between red shades while active
            const t = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;
            const r = 0xff;
            const g = Math.floor(0x22 + t * 0x22);
            const b = Math.floor(0x22 + t * 0x22);
            critter.tint = (r << 16) | (g << 8) | b;
          }
        }

        // --- Feather sprite follows critter ---
        if (state.featherActive && state.featherSprite && critter) {
          const bob = Math.sin(Date.now() * 0.004) * 5;
          state.featherSprite.position.set(critter.position.x, critter.position.y - 50 + bob);
        }

        if (getSpeedChanged()) { updateVelocity(); setSpeedChanged(false); }

        // --- Siege: stop character during reward phase ---
        const siegeFrozen = state.siegeActive && (state.siegePhase === 'reward');
        // --- Siege: stop character at castle during castle phase ---
        const siegeAtCastle = state.siegeActive && state.siegePhase === 'castle' && state.siegeCastleSprite &&
          critter.position.x >= state.siegeCastleSprite.position.x - state.siegeCastleSprite.width / 1.1;

        if (!state.isAttackingChar) {
          if (!getisDead()) {
            if (siegeFrozen || siegeAtCastle) {
              // Freeze critter in place during siege reward or at castle
              if (critter.textures !== frogIdleTextures) {
                critter.textures = frogIdleTextures;
                critter.stop();
                critter.loop = false;
              }
            }
            else if (!state.isCombat) {
              if (!state.isPointerDown) {
                if (getEnemiesInRange() <= 0) {

                  if (getCurrentCharacter() != "character-snail") {
                    critter.position.x += velocity.x * state.dt;

                  }
                  else {
                    if (critter.currentFrame > critter.totalFrames / 2) {
                      critter.position.x += velocity.x * 2 * state.dt;

                    }
                  }
                  if ((critter.textures != state.frogWalkTextures)) {
                    critter.textures = state.frogWalkTextures;
                    critter.play();
                  }
                  critter.loop = true;
                  mountain1.position.x -= velocity.x * mountain1Speed * state.dt;
                  mountain2.position.x -= velocity.x * mountain2Speed * state.dt;
                  mountain3.position.x -= velocity.x * mountain3Speed * state.dt;
                  mountain4.position.x -= velocity.x * mountain4Speed * state.dt;
                  wrapMountains();
                }
                else {
                  if (critter.textures != frogIdleTexture) {
                    critter.textures = frogIdleTextures;
                    critter.stop();
                  }
                }
              }
            }
            else {
              if (critter.textures != frogIdleTexture) {
                critter.textures = frogIdleTextures;
                critter.stop();
                critter.loop = false;
              }
            }
          }


          hpBar.visible = false;
          hpBarBackground.visible = false;

        }

        // Update cloud position
        clouds.position.x -= cloudSpeed * state.dt;
        clouds2.visible = state.detailMode !== 'low';
        clouds2.position.x -= cloud2Speed * state.dt;
        // Check if cloud has gone offscreen and move it to the right side
        if (clouds.x + clouds.width / 2 < -3000) {
          clouds.x = state.initialClouds;
        }
        if (clouds2.x + clouds2.width / 2 < -3000) {
          clouds2.x = state.initialClouds;
        }
        if (!getAreResetting()) {
          // Adjust app stage position
          if (state.gameMode === 'endless') {
            // Endless: camera follows player infinitely to the right
            app.stage.x = Math.min(0, -critter.position.x + app.screen.width / 2);
          } else {
            app.stage.x = Math.min(0, Math.max(-foreground.width + app.screen.width, -critter.position.x + app.screen.width / 2));
          }
          app.stage.y = Math.min(0, Math.max(-foreground.height + app.screen.height, -critter.position.y + app.screen.height / 2));
        }
        else { }
      });
      // Hide HTML loading overlay
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      playRoundText(state.currentRound);

      document.getElementById("coffee-button").style.visibility = "visible";
      document.getElementById("infoboxes").style.visibility = "visible";
      document.getElementById("ui-overlay").style.visibility = "visible";
      document.getElementById("pause-button").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
      createWeatherEffects();
      document.getElementById("potion-button").style.visibility = "visible";
      updatePotionUI();
      critter.scale.set(getFrogSize());
      clearSkinEffects();
      critter.tint = 0xffffff;
      applyHat(critter, getCurrentCharacter());
      applySkinFilter(critter, getCurrentCharacter());

      state.stored = app.screen.height - foreground.height / 1.8 - critter.height * .22;
      state.groundY = app.screen.height - foreground.height / 1.8 + critter.height * .3;
      critter.position.set(app.screen.width / 20, app.screen.height - foreground.height / 1.8 - critter.height * .22);
      updateKillProgressBar();
      updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);

      // Character menu always starts open
      setTimeout(() => showCharacterMenu(), 100);

      // --- Character menu helper: show all unlocked swap boxes ---
      function showCharacterMenu() {
        const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
        const visibleBoxes = [];
        characterBoxes.forEach((box) => {
          const charClass = box.classList[1];
          if (!state.unlockedCharacters.includes(charClass)) {
            box.style.visibility = 'hidden';
          } else if (!getisDead() && state.selectedCharacter !== "" && box.classList.contains(state.selectedCharacter)) {
            box.style.visibility = 'hidden';
          } else {
            box.style.visibility = 'visible';
            visibleBoxes.push(box);
          }
        });
        if (visibleBoxes.length > 0) {
          const totalWidth = visibleBoxes.length * 60;
          const startOffset = -totalWidth / 2;
          visibleBoxes.forEach((box, i) => {
            box.style.left = 'calc(45% + ' + (startOffset + i * 60) + 'px)';
          });
        }
        state.isCharacterMenuOpen = true;
      }

      function hideCharacterMenu() {
        const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
        characterBoxes.forEach((box) => { box.style.visibility = 'hidden'; });
        state.isCharacterMenuOpen = false;
      }

      // Start the state.timer animation
      if (getPlayerCurrentHealth() <= 0) {
        setisPaused(true);
        showCharacterMenu();
      }
      if (state.gameMode === 'endless') {
        app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, endlessGround, endlessGroundDecor, foreground, critter, endlessGroundDecorFG, clouds, clouds2, state.enemyDeath, castlePlayer);
      } else {
        app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, endlessGround, endlessGroundDecor, foreground, castle, critter, endlessGroundDecorFG, clouds, clouds2, hpBarBackground, hpBar, state.enemyDeath, castlePlayer);
      }

      // Z-layer ordering for weather effects (sun renders behind foreground)
      background.zIndex = 0;
      mountain4.zIndex = 1;
      mountain1.zIndex = 1;
      mountain2.zIndex = 1;
      mountain3.zIndex = 1;
      clouds.zIndex = 2;
      clouds2.zIndex = 2;
      // Sun weather goes at zIndex 0.5 (behind mountains so it sets behind them)
      foreground.zIndex = 5;
      castle.zIndex = 6;
      castlePlayer.zIndex = 6;
      critter.zIndex = 10;
      hpBarBackground.zIndex = 12;
      hpBar.zIndex = 12;
      state.enemyDeath.zIndex = 15;

      function buildEnemyTypes() {
        const allEnemies = [
          { attackTextures: critterAttackTextures, walkTextures: critterWalkTextures, name: "imp", minRound: 1 },
          { attackTextures: scorpAttackTextures, walkTextures: scorpWalkTextures, name: "scorp", minRound: 1 },
          { attackTextures: tooferAttackTextures, walkTextures: tooferWalkTextures, name: "toofer", minRound: 2 },
          { attackTextures: pufferAttackTextures, walkTextures: pufferWalkTextures, name: "puffer", minRound: 4 },
          { attackTextures: sharkAttackTextures, walkTextures: sharkWalkTextures, name: "shark", minRound: 5 },
          { attackTextures: pigAttackTextures, walkTextures: pigWalkTextures, name: "pig", minRound: 6 },
          { attackTextures: octoAttackTextures, walkTextures: octoWalkTextures, name: "octo", minRound: 7 },
          { attackTextures: eleAttackTextures, walkTextures: eleWalkTextures, name: "ele", minRound: 8 },
        ];
        if (state.gameMode === 'endless') {
          state.enemyTypes = allEnemies; // All enemy types available in endless
        } else {
          state.enemyTypes = allEnemies.filter(e => state.currentRound >= e.minRound);
        }
      }
      buildEnemyTypes();

      // Resize handler — adapts to rotation and window changes
      function handleResize() {
        const oldHeight = app.screen.height;
        app.renderer.resize(window.innerWidth, window.innerHeight);

        // Reposition elements that depend on screen dimensions
        drawSkyGradient(background, currentSkyTop, currentSkyBottom, app.screen.width, app.screen.height);
        foreground.y = app.screen.height;
        if (endlessGround) {
          endlessGround.position.y = app.screen.height - endlessGroundHeight;
        }
        if (endlessGroundDecor) {
          endlessGroundDecor.position.y = app.screen.height - endlessGroundHeight;
        }
        if (endlessGroundDecorFG) {
          endlessGroundDecorFG.position.y = app.screen.height - endlessGroundHeight;
        }
        castle.position.y = app.screen.height - castle.height * 0.25;
        castlePlayer.position.y = app.screen.height - castle.height * 0.25;
        state.stored = app.screen.height - foreground.height / 1.8 - critter.height * .22;
        state.groundY = app.screen.height - foreground.height / 1.8 + critter.height * .3;
        critter.position.y = state.stored;

        // Reposition mountains to match new screen height
        [mountain1, mountain2, mountain3, mountain4].forEach(m => {
          const minHeightOffset = foreground ? foreground.height * 0.15 : 0;
          const heightOffsetRatio = (1 - Math.abs(m.scale.y)) * 0.3;
          const foregroundHeightOffset = foreground ? minHeightOffset + m.height * heightOffsetRatio : 0;
          m.position.y = app.screen.height - foregroundHeightOffset;
        });

        // Reposition existing enemies preserving their offset from the ground
        getEnemies().forEach(enemy => {
          const offsetFromBottom = oldHeight - enemy.position.y;
          enemy.position.y = app.screen.height - offsetFromBottom;
        });

        // Re-layout item buttons for new screen dimensions
        repositionItemButtons();
      }

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', () => setTimeout(handleResize, 100));

      // Start timer here — after all assets are loaded and setup is done
      initSpawnLoop(critter, app);
      resetTimer();
      startTimer();
      spawnEnemies();


    }

  }


  // spawnEnemies extracted to spawnLoop.js

  // Wire revive dialog (needs setisPaused, handleCharacterClick, spawnEnemies)
  initReviveDialog({ setisPaused, handleCharacterClick, spawnEnemies });

  // Siege ended event — resume walk animation + spawning
  document.addEventListener('siegeEnded', function() {
    if (state.gameMode === 'endless' && !state.isWiped) {
      // Restore walk animation (siege freeze stops it via critter.stop())
      critter.textures = state.frogWalkTextures;
      critter.loop = true;
      critter.play();
      state.isAttackingChar = false;
      state.isSpawning = false;
      spawnEnemies();
    }
  });

  function resetGame(critter, enemy, enemies) {
    let isReset = false;
    if (!isReset) {
      setEnemiesInRange(0);
      setCharAttackAnimating(false);
      setIsCharAttacking(false);
      app.stage.removeChild(state.frogGhostPlayer);
      critter.position.set(app.screen.width / 20, state.stored);
      setPlayerCurrentHealth(getPlayerHealth());
      updatePlayerHealthBar(getPlayerHealth() / getPlayerHealth() * 100);
      // Reset castle health
      castleHealth = 100;
      // Remove any existing enemy death sprites
      // Set state.isCombat and playAgain to false
      state.isCombat = false;
      const enemyPortrait = document.getElementById('enemy-portrait');
      enemyPortrait.style.display = 'none'; // Make the element visible
      playAgain = false;
      setIsDead(false);
      critter.loop = true;
      critter.textures = state.frogWalkTextures;
      critter.play();
      app.stage.addChild(critter);
      playRoundText(state.currentRound);
      createWeatherEffects();

      // Loop through the enemies array and remove each enemy
      for (let i = 0; i < getEnemies().length; i++) {
        let enemy = getEnemies()[i];
        app.stage.removeChild(enemy);
        app.stage.removeChild(enemy.hpBar);
        app.stage.removeChild(enemy.hpBarBackground);
        // Destroy the enemy object to free up memory
      }

      // Clear the enemies array
      enemies.length = 0;
      state.isAttackingChar = false;
      isMoving = true;
      isReset = true;
    }
  }


  function handlePlayClick() {

    if (!state.isGameStarted) {
      state.isGameStarted = true;
      resetTimer();
      startTimer();
      startGame();
    }
  }




  function handleVisibilityChange() {
    // No-op: game continues running when tab loses focus
  }



  // Add event listeners for visibility change
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("webkitvisibilitychange", handleVisibilityChange);
  // Add touchstart event listener
  document.addEventListener("touchstart", () => {
    // Increment touch count
    state.touchCount++;
  });
  // Add touchend event listener
  document.addEventListener("touchend", () => {
    // Decrement touch count
    state.touchCount--;
    // Check if all touches are released
    if (state.touchCount === 0) {
      handleAllTouchesReleased();
    }
  });


  // Function to handle all touches released
  function handleAllTouchesReleased() {
    // Your functionality when all touches are released
    handleTouchEnd();
  }



window._crittorsShowPauseScore = function() {
  showScoreSubmitOverlay('endless', state.endlessKillCount, true);
};

startGame();
state.isGameStarted=true;
  }

});
