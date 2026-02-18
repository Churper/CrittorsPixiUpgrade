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
  getShieldCount, setShieldCount, getBombCount, setBombCount,
  getRageCount, setRageCount, getFeatherCount, setFeatherCount,
  getGoldenBeanCount, setGoldenBeanCount,
} from './state.js';
import { startTimer, pauseTimer, resetTimer, isTimerFinished } from './timer.js';
import { getRandomColor, getRandomColor3 } from './utils.js';
import {
  stopFlashing,
  setCurrentFrogHealth, setCurrentBeeHealth, setCurrentSnailHealth, setCurrentBirdHealth,
  setPlayerCurrentHealth, setCharEXP,
  updateEXPIndicator, updateEXPIndicatorText,
  getCharacterName, getCharacterPortraitUrl, updateCharacterStats,
  getCharacterDamage, updateCurrentLevels,
} from './characters.js';
import {
  createPauseMenuContainer, shouldReturnEarly, updateDialogPositions,
  getIsWiped, setisWiped, startCooldown, openCharacterMenu,
  updatePlayerHealthBar, playRoundText, getTextStyle,
} from './ui.js';
import {
  spawnEnemyDemi, spawnEnemy,
  resetEnemiesState, addCoffee, playSpawnAnimation,
  createCoffeeDrop, collectGroundItem, drawEnemyHPBar,
  playShieldActivateSound, playShieldBreakSound,
  playBombDropSound, playExplosionSound,
  createItemDrop,
  playRageSound, playFeatherReviveSound, playGoldenBeanSound,
  playGoldenBeanFlyEffect,
  playPotionChugSound, playPotionBottleAnimation,
} from './combat.js';
import { updateEXP } from './upgrades.js';
import { saveGame, loadGame } from './save.js';
import {
  submitScore, formatScore,
  getSavedPlayerName, savePlayerName,
  showLeaderboardPanel,
} from './leaderboard.js';


document.addEventListener('DOMContentLoaded', function () {
  let appStarted = false;
console.log("PIXIVERSION:",PIXI.VERSION);
  let rotateMessage = document.getElementById('rotateDevice');
  rotateMessage.style.display = "block"; // Always display the new menu

  function startFromMenu(mode) {
    rotateMessage.style.display = 'none';
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (!appStarted) {
      state.gameMode = mode;
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

  document.getElementById('story-mode-btn').addEventListener('click', function() {
    startFromMenu('story');
  });

  document.getElementById('endless-mode-btn').addEventListener('click', function() {
    startFromMenu('endless');
  });

  document.getElementById('info-btn').addEventListener('click', function() {
    document.getElementById('info-panel').style.display = 'block';
  });

  document.getElementById('info-close-btn').addEventListener('click', function() {
    document.getElementById('info-panel').style.display = 'none';
  });

  document.getElementById('leaderboard-btn').addEventListener('click', function() {
    showLeaderboardPanel();
  });

  document.getElementById('leaderboard-close-btn').addEventListener('click', function() {
    document.getElementById('leaderboard-panel').style.display = 'none';
  });

  document.getElementById('guide-btn').addEventListener('click', function() {
    document.getElementById('guide-panel').style.display = 'block';
  });

  document.getElementById('guide-close-btn').addEventListener('click', function() {
    document.getElementById('guide-panel').style.display = 'none';
  });

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
  console.log("running 1 DEMO HERE");
  if(state.demiSpawned === 0)
  {
    console.log("SPAWENING 1 DEMO HERE");
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

  // Weather system — icon based on current round
  const weatherTypes = [
    { name: 'sun', emoji: '\u2600\uFE0F' },
    { name: 'night', emoji: '\uD83C\uDF19' },
    { name: 'rain', emoji: '\uD83C\uDF27\uFE0F' },
    { name: 'wind', emoji: '\uD83D\uDCA8' },
    { name: 'snow', emoji: '\u2744\uFE0F' },
  ];

  function updateWeatherIcon() {
    const weatherEl = document.getElementById('weather-icon');
    const type = getWeatherType();
    const entry = weatherTypes.find(w => w.name === type) || weatherTypes[0];
    weatherEl.textContent = entry.emoji;
  }

  // --- Weather particle effects ---
  let weatherContainer = null;
  let weatherSun = null;
  let weatherMoon = null;
  let weatherTicker = null;
  let sunLightOverlay = null;
  let nightOverlay = null;
  let playerShadow = null;
  let nightFireGlows = null; // Animated glow circles for campfires/lanterns

  function getWeatherType() {
    if (state.gameMode === 'endless') {
      const cycle = Math.floor((state.endlessElapsed || 0) / 60) % weatherTypes.length;
      return weatherTypes[cycle].name;
    }
    return weatherTypes[(state.currentRound - 1) % weatherTypes.length].name;
  }

  function clearWeatherEffects() {
    if (weatherContainer && state.app) {
      state.app.stage.removeChild(weatherContainer);
      weatherContainer.destroy({ children: true });
      weatherContainer = null;
    }
    if (sunLightOverlay && state.app) {
      state.app.stage.removeChild(sunLightOverlay);
      sunLightOverlay.destroy();
      sunLightOverlay = null;
    }
    if (nightOverlay && state.app) {
      state.app.stage.removeChild(nightOverlay);
      nightOverlay.destroy();
      nightOverlay = null;
    }
    if (playerShadow && state.app) {
      state.app.stage.removeChild(playerShadow);
      playerShadow.destroy();
      playerShadow = null;
    }
    weatherSun = null;
    weatherMoon = null;
    if (nightFireGlows && state.app) {
      state.app.stage.removeChild(nightFireGlows);
      nightFireGlows.destroy({ children: true });
      nightFireGlows = null;
    }
  }

  function createWeatherEffects() {
    clearWeatherEffects();
    const app = state.app;
    if (!app) return;

    weatherContainer = new PIXI.Container();
    weatherContainer.label = 'weatherFX';
    weatherContainer.eventMode = 'none';
    app.stage.addChild(weatherContainer);

    const w = app.screen.width;
    const h = app.screen.height;
    const type = getWeatherType();

    // Sun renders behind mountains (zIndex 0.5) so it sets behind them
    // Other weather renders in front of everything
    weatherContainer.zIndex = (type === 'sun') ? 0.5 : 50000;

    if (type === 'sun') {
      // Sun glow orb — larger with layered glow
      weatherSun = new PIXI.Container();
      const glow = new PIXI.Graphics();
      glow.circle(0, 0, 80).fill({ color: 0xFFDD44, alpha: 0.15 });
      glow.circle(0, 0, 55).fill({ color: 0xFFDD44, alpha: 0.25 });
      glow.circle(0, 0, 38).fill({ color: 0xFFEE66, alpha: 0.5 });
      glow.circle(0, 0, 22).fill({ color: 0xFFFF99, alpha: 0.9 });
      weatherSun.addChild(glow);
      // Big extruding beams
      for (let i = 0; i < 8; i++) {
        const beam = new PIXI.Graphics();
        const angle = (i / 8) * Math.PI * 2;
        const len = 120 + Math.random() * 80;
        beam.moveTo(0, 0).lineTo(Math.cos(angle) * len, Math.sin(angle) * len).stroke({ width: 4, color: 0xFFEE44, alpha: 0.25 });
        beam.rayAngle = angle;
        beam.rayLen = len;
        beam.isBeam = true;
        weatherSun.addChild(beam);
      }
      // Thinner accent rays between beams
      for (let i = 0; i < 8; i++) {
        const ray = new PIXI.Graphics();
        const angle = ((i + 0.5) / 8) * Math.PI * 2;
        const len = 60 + Math.random() * 40;
        ray.moveTo(0, 0).lineTo(Math.cos(angle) * len, Math.sin(angle) * len).stroke({ width: 1.5, color: 0xFFEE44, alpha: 0.15 });
        ray.rayAngle = angle;
        ray.rayLen = len;
        weatherSun.addChild(ray);
      }
      weatherSun.startTime = Date.now();
      weatherContainer.addChild(weatherSun);

      // Lighting overlay — dims at dawn/dusk, bright at noon
      // Use huge fixed size to cover any screen orientation/camera position
      sunLightOverlay = new PIXI.Graphics();
      sunLightOverlay.rect(0, 0, 8000, 8000).fill({ color: 0x000000 });
      sunLightOverlay.zIndex = 49999;
      sunLightOverlay.alpha = 0.12;
      sunLightOverlay.eventMode = 'none';
      app.stage.addChild(sunLightOverlay);

      // Player shadow — big enough to be noticeable, above foreground
      playerShadow = new PIXI.Graphics();
      playerShadow.ellipse(0, 0, 40, 10).fill({ color: 0x000000, alpha: 0.5 });
      playerShadow.zIndex = 9;
      playerShadow.eventMode = 'none';
      app.stage.addChild(playerShadow);

    } else if (type === 'rain') {
      // Rain drops
      for (let i = 0; i < 80; i++) {
        const drop = new PIXI.Graphics();
        const alpha = 0.3 + Math.random() * 0.4;
        const length = 8 + Math.random() * 14;
        drop.moveTo(0, 0).lineTo(-2, length).stroke({ width: 1.5, color: 0x88BBEE, alpha: alpha });
        drop.position.set(Math.random() * (w + 100) - 50, Math.random() * h);
        drop.vy = 6 + Math.random() * 6;
        drop.vx = -1.5 - Math.random() * 1;
        drop.dropLength = length;
        weatherContainer.addChild(drop);
      }

    } else if (type === 'wind') {
      // Wind streaks and leaf-like particles
      for (let i = 0; i < 25; i++) {
        const streak = new PIXI.Graphics();
        const len = 20 + Math.random() * 40;
        const alpha = 0.1 + Math.random() * 0.2;
        streak.moveTo(0, 0).lineTo(len, 0).stroke({ width: 1, color: 0xFFFFFF, alpha: alpha });
        streak.position.set(Math.random() * w, Math.random() * h);
        streak.vx = 8 + Math.random() * 6;
        streak.vy = (Math.random() - 0.5) * 1.5;
        streak.streakLen = len;
        streak.isStreak = true;
        weatherContainer.addChild(streak);
      }
      // Leaf particles
      const leafColors = [0x66AA44, 0x88CC55, 0xAABB44, 0xCC9933, 0xDD8822];
      for (let i = 0; i < 15; i++) {
        const leaf = new PIXI.Graphics();
        const color = leafColors[Math.floor(Math.random() * leafColors.length)];
        leaf.ellipse(0, 0, 4, 2.5).fill({ color: color, alpha: 0.7 });
        leaf.position.set(Math.random() * w, Math.random() * h);
        leaf.vx = 5 + Math.random() * 5;
        leaf.vy = -1 + Math.random() * 2;
        leaf.spinSpeed = (Math.random() - 0.5) * 0.2;
        leaf.wobble = Math.random() * Math.PI * 2;
        leaf.isLeaf = true;
        weatherContainer.addChild(leaf);
      }

    } else if (type === 'snow') {
      // Snowflakes
      for (let i = 0; i < 60; i++) {
        const flake = new PIXI.Graphics();
        const size = 1.5 + Math.random() * 3;
        const alpha = 0.4 + Math.random() * 0.5;
        flake.circle(0, 0, size).fill({ color: 0xFFFFFF, alpha: alpha });
        flake.position.set(Math.random() * (w + 60) - 30, Math.random() * h);
        flake.vy = 0.8 + Math.random() * 1.5;
        flake.vx = 0;
        flake.drift = (Math.random() - 0.5) * 0.02;
        flake.wobblePhase = Math.random() * Math.PI * 2;
        flake.wobbleAmp = 0.3 + Math.random() * 0.6;
        flake.flakeSize = size;
        weatherContainer.addChild(flake);
      }

    } else if (type === 'night') {
      // Moon — renders behind mountains like the sun
      weatherContainer.zIndex = 0.5;

      weatherMoon = new PIXI.Container();

      // Outer glow — soft, layered halo
      const outerGlow = new PIXI.Graphics();
      outerGlow.circle(0, 0, 70).fill({ color: 0xCCDDFF, alpha: 0.06 });
      outerGlow.circle(0, 0, 52).fill({ color: 0xCCDDFF, alpha: 0.08 });
      outerGlow.circle(0, 0, 38).fill({ color: 0xDDEEFF, alpha: 0.1 });
      weatherMoon.addChild(outerGlow);

      // Moon body — gradient-like concentric fills
      const moonBody = new PIXI.Graphics();
      moonBody.circle(0, 0, 26).fill({ color: 0xE8E8F0 });
      moonBody.circle(0, 0, 25).fill({ color: 0xEEEEF4 });
      // Surface texture — subtle craters
      moonBody.circle(-8, -6, 5).fill({ color: 0xD0D0DA, alpha: 0.4 });
      moonBody.circle(6, -10, 3.5).fill({ color: 0xD4D4DE, alpha: 0.35 });
      moonBody.circle(3, 8, 4).fill({ color: 0xCCCCD6, alpha: 0.3 });
      moonBody.circle(-12, 5, 2.5).fill({ color: 0xD8D8E2, alpha: 0.25 });
      moonBody.circle(10, 2, 2).fill({ color: 0xD0D0DA, alpha: 0.2 });
      // Terminator shadow — dark edge for crescent effect
      moonBody.circle(8, 0, 22).fill({ color: 0x667788, alpha: 0.15 });
      // Bright highlight — upper left lit edge
      moonBody.circle(-6, -8, 12).fill({ color: 0xFFFFFF, alpha: 0.12 });
      weatherMoon.addChild(moonBody);

      weatherMoon.startTime = Date.now();
      weatherMoon.totalPaused = 0;
      weatherContainer.addChild(weatherMoon);

      // Night overlay — dark blue-black tint over entire scene
      nightOverlay = new PIXI.Graphics();
      nightOverlay.rect(0, 0, 8000, 8000).fill({ color: 0x0a0a2a });
      nightOverlay.zIndex = 49999;
      nightOverlay.alpha = 0.35;
      nightOverlay.eventMode = 'none';
      app.stage.addChild(nightOverlay);

      // Player shadow from moonlight
      playerShadow = new PIXI.Graphics();
      playerShadow.ellipse(0, 0, 30, 8).fill({ color: 0x000000, alpha: 0.3 });
      playerShadow.zIndex = 9;
      playerShadow.eventMode = 'none';
      app.stage.addChild(playerShadow);

      // Animated fire glows — world-positioned, flicker each frame
      nightFireGlows = new PIXI.Container();
      nightFireGlows.zIndex = 7; // above decor (6), below critter (10)
      nightFireGlows.eventMode = 'none';
      // Place glows at campfire and lantern positions (must match seeds from drawEndlessGroundDecor)
      let _s = 99222;
      function _r() { _s = (_s * 16807) % 2147483647; return (_s & 0x7fffffff) / 2147483647; }
      let cfx = 200;
      while (cfx < 50000) {
        const sc = 0.8 + _r() * 0.4;
        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 28 * sc).fill({ color: 0xff8833, alpha: 0.12 });
        glow.circle(0, 0, 16 * sc).fill({ color: 0xffaa44, alpha: 0.15 });
        glow.circle(0, 0, 6 * sc).fill({ color: 0xffcc66, alpha: 0.2 });
        const groundY = Math.sin(cfx * 0.0004) * 14 + Math.sin(cfx * 0.0011) * 7;
        glow.position.set(cfx, groundY - 8 * sc);
        glow.baseAlpha = glow.alpha;
        glow.flickerPhase = Math.random() * Math.PI * 2;
        glow.flickerSpeed = 0.08 + Math.random() * 0.06;
        glow.isCampfire = true;
        nightFireGlows.addChild(glow);
        cfx += 600 + _r() * 1000;
      }
      // Lantern glows
      _s = 99333;
      let lnx = 500;
      while (lnx < 50000) {
        const sc = 0.8 + _r() * 0.3;
        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 20 * sc).fill({ color: 0xffaa33, alpha: 0.1 });
        glow.circle(0, 0, 10 * sc).fill({ color: 0xffcc44, alpha: 0.14 });
        const groundY = Math.sin(lnx * 0.0004) * 14 + Math.sin(lnx * 0.0011) * 7;
        glow.position.set(lnx, groundY - 30 * sc);
        glow.baseAlpha = glow.alpha;
        glow.flickerPhase = Math.random() * Math.PI * 2;
        glow.flickerSpeed = 0.05 + Math.random() * 0.04;
        glow.isCampfire = false;
        nightFireGlows.addChild(glow);
        lnx += 900 + _r() * 1400;
      }
      app.stage.addChild(nightFireGlows);
    }
  }

  function updateWeatherEffects() {
    if (!weatherContainer || !state.app) return;
    const app = state.app;
    const w = app.screen.width;
    const h = app.screen.height;

    // Keep container screen-fixed (counter camera movement)
    weatherContainer.position.set(-app.stage.x, -app.stage.y);

    const type = getWeatherType();

    if (type === 'sun' && weatherSun) {
      // Track paused time so sun doesn't move during pause
      if (getisPaused()) {
        if (!weatherSun.pauseStart) weatherSun.pauseStart = Date.now();
        return;
      } else if (weatherSun.pauseStart) {
        weatherSun.totalPaused = (weatherSun.totalPaused || 0) + (Date.now() - weatherSun.pauseStart);
        weatherSun.pauseStart = null;
      }

      // Arc the sun across the sky over 60 seconds
      const elapsed = Date.now() - weatherSun.startTime - (weatherSun.totalPaused || 0);
      const duration = 60000;
      // Don't cap — let sun keep sinking below the horizon after timer ends
      const progress = elapsed / duration;

      // Parallax: sun shifts slightly opposite to camera, feels distant
      const parallaxX = app.stage.x * 0.04;
      const parallaxY = app.stage.y * 0.02;

      // Parabolic arc: rises from bottom-left, peaks at top-center, sets at bottom-right
      // After progress > 1.0, sin(progress * PI) goes negative → sun dips below horizon
      const arcX = w * 0.1 + Math.min(progress, 1.3) * w * 0.8 + parallaxX;
      const arcY = h * 0.7 - Math.sin(progress * Math.PI) * h * 0.55 + parallaxY;
      weatherSun.position.set(arcX, arcY);

      // Fade out as sun approaches/crosses the ground line
      const sunGroundY = app.screen.height * 0.6;
      weatherSun.alpha = arcY < sunGroundY - 60 ? 1 : Math.max(0, 1 - (arcY - (sunGroundY - 60)) / 80);

      // Rotate rays slowly
      weatherSun.rotation = elapsed * 0.0003;
      // Pulse the glow
      const pulse = 1 + Math.sin(elapsed * 0.003) * 0.08;
      weatherSun.scale.set(pulse);

      // sinusoidal brightness: 0 at edges, 1 at middle, clamp so it doesn't go negative after sunset
      const brightness = Math.max(0, Math.sin(progress * Math.PI));

      // Lighting: dim at dawn/dusk (progress near 0 or 1), bright at noon (progress ~0.5)
      if (sunLightOverlay) {
        sunLightOverlay.position.set(-app.stage.x - 2000, -app.stage.y - 2000);
        // Overlay alpha: 0.35 at dawn/dusk, 0.0 at peak noon
        sunLightOverlay.alpha = 0.15 * (1 - brightness);
        // Warm tint at dawn/dusk via slight orange
        if (progress < 0.15 || progress > 0.85) {
          sunLightOverlay.tint = 0x331100;
        } else {
          sunLightOverlay.tint = 0x000000;
        }
      }

      // Player shadow: direction + length based on sun position
      if (playerShadow && critter) {
        const sunScreenX = arcX;
        const critterScreenX = critter.position.x + app.stage.x;

        // Shadow cast direction: opposite side from the sun
        const sunDir = sunScreenX < critterScreenX ? 1 : -1;
        // Longer shadow when sun is low, shorter at noon
        const stretchX = 1 + (1 - brightness) * 2.5;

        // Position at character's feet
        playerShadow.position.set(
          critter.position.x + sunDir * stretchX * 12,
          state.stored + critter.height * 0.42
        );
        playerShadow.scale.set(stretchX, 1);
        playerShadow.alpha = 0.25 + brightness * 0.35;
      }

    } else if (type === 'rain') {
      for (const drop of weatherContainer.children) {
        drop.position.x += drop.vx * state.dt;
        drop.position.y += drop.vy * state.dt;
        // Wrap around
        if (drop.position.y > h + 20) {
          drop.position.y = -drop.dropLength;
          drop.position.x = Math.random() * (w + 100) - 50;
        }
        if (drop.position.x < -20) {
          drop.position.x = w + 10;
        }
      }

    } else if (type === 'wind') {
      for (const p of weatherContainer.children) {
        p.position.x += p.vx * state.dt;
        p.position.y += p.vy * state.dt;
        if (p.isLeaf) {
          p.wobble += 0.05 * state.dt;
          p.position.y += Math.sin(p.wobble) * 1.2 * state.dt;
          p.rotation += p.spinSpeed;
        }
        // Wrap around right edge
        if (p.position.x > w + 60) {
          p.position.x = -60;
          p.position.y = Math.random() * h;
        }
        if (p.position.y < -20) p.position.y = h + 10;
        if (p.position.y > h + 20) p.position.y = -10;
      }

    } else if (type === 'snow') {
      for (const flake of weatherContainer.children) {
        flake.wobblePhase += flake.drift * state.dt;
        flake.position.x += Math.sin(flake.wobblePhase) * flake.wobbleAmp * state.dt;
        flake.position.y += flake.vy * state.dt;
        // Wrap around
        if (flake.position.y > h + 10) {
          flake.position.y = -10;
          flake.position.x = Math.random() * (w + 60) - 30;
        }
        if (flake.position.x < -30) flake.position.x = w + 20;
        if (flake.position.x > w + 30) flake.position.x = -20;
      }

    } else if (type === 'night' && weatherMoon) {
      // Track paused time
      if (getisPaused()) {
        if (!weatherMoon.pauseStart) weatherMoon.pauseStart = Date.now();
        return;
      } else if (weatherMoon.pauseStart) {
        weatherMoon.totalPaused = (weatherMoon.totalPaused || 0) + (Date.now() - weatherMoon.pauseStart);
        weatherMoon.pauseStart = null;
      }

      const elapsed = Date.now() - weatherMoon.startTime - (weatherMoon.totalPaused || 0);
      const duration = 60000;
      const progress = elapsed / duration;

      // Parallax — distant feel
      const parallaxX = app.stage.x * 0.03;
      const parallaxY = app.stage.y * 0.015;

      // Moon arc — rises from right, peaks, sets left (opposite of sun for variety)
      const arcX = w * 0.9 - Math.min(progress, 1.3) * w * 0.8 + parallaxX;
      const arcY = h * 0.7 - Math.sin(progress * Math.PI) * h * 0.55 + parallaxY;
      weatherMoon.position.set(arcX, arcY);

      // Fade out as moon approaches/crosses the ground line
      const moonGroundY = app.screen.height * 0.6;
      weatherMoon.alpha = arcY < moonGroundY - 60 ? 1 : Math.max(0, 1 - (arcY - (moonGroundY - 60)) / 80);

      // Slow rotation for subtle liveliness
      weatherMoon.rotation = Math.sin(elapsed * 0.0001) * 0.05;
      // Gentle pulse
      const pulse = 1 + Math.sin(elapsed * 0.002) * 0.03;
      weatherMoon.scale.set(pulse);

      const moonBrightness = Math.max(0, Math.sin(progress * Math.PI));

      // Night overlay — darker when moon is low, slightly lighter at peak
      if (nightOverlay) {
        nightOverlay.position.set(-app.stage.x - 2000, -app.stage.y - 2000);
        nightOverlay.alpha = 0.3 + 0.15 * (1 - moonBrightness);
      }

      // Player shadow from moonlight
      if (playerShadow && critter) {
        const moonScreenX = arcX;
        const critterScreenX = critter.position.x + app.stage.x;
        const moonDir = moonScreenX < critterScreenX ? 1 : -1;
        const stretchX = 1 + (1 - moonBrightness) * 2;
        playerShadow.position.set(
          critter.position.x + moonDir * stretchX * 10,
          state.stored + critter.height * 0.42
        );
        playerShadow.scale.set(stretchX, 1);
        playerShadow.alpha = 0.12 + moonBrightness * 0.18;
      }

      // Animate fire glows — flicker
      if (nightFireGlows) {
        // Position container on the ground layer
        nightFireGlows.position.set(0, app.screen.height - foreground.height * 0.65);
        for (const glow of nightFireGlows.children) {
          glow.flickerPhase += glow.flickerSpeed;
          const flicker = 0.7 + Math.sin(glow.flickerPhase) * 0.2
            + Math.sin(glow.flickerPhase * 2.3) * 0.1;
          glow.alpha = glow.baseAlpha * flicker;
          // Slight scale pulse for campfires
          if (glow.isCampfire) {
            glow.scale.set(0.9 + Math.sin(glow.flickerPhase * 0.7) * 0.15);
          }
        }
      }
    }
  }

  // Health potion system (up to 3 doses)
  function updatePotionUI() {
    const btn = document.getElementById('potion-button');
    const fill = document.getElementById('potion-fill');
    const doseText = document.getElementById('potion-doses');
    const shop = document.getElementById('potion-shop');
    const doses = state.potionDoses || 0;
    const max = state.potionMaxDoses || 3;
    const fillPct = (doses / max) * 100;
    fill.style.height = fillPct + '%';
    doseText.textContent = doses > 0 ? doses + '/' + max : '';
    if (doses > 0) {
      btn.classList.add('filled');
    } else {
      btn.classList.remove('filled');
    }
    // Update shop button state
    shop.classList.remove('cant-afford', 'maxed');
    if (doses >= max) {
      shop.classList.add('maxed');
    } else if (getCoffee() < 20) {
      shop.classList.add('cant-afford');
    }
  }

  // Shop button — BUY a dose (20 coffee)
  document.getElementById('potion-shop').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const doses = state.potionDoses || 0;
    if (doses >= state.potionMaxDoses) return;
    if (getCoffee() < 20) return;

    addCoffee(-20);
    state.potionDoses = doses + 1;
    updatePotionUI();

    // Fill animation on potion
    const icon = document.getElementById('potion-icon');
    icon.style.transform = 'scale(1.3)';
    icon.style.transition = 'transform 0.2s';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
  });

  // Potion button — USE a dose (heal 70 HP)
  document.getElementById('potion-button').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (getisDead()) return; // Can't heal a dead character
    const doses = state.potionDoses || 0;
    const isHurt = getPlayerCurrentHealth() < getPlayerHealth();
    if (doses <= 0 || !isHurt) return;

    setPlayerCurrentHealth(Math.min(getPlayerCurrentHealth() + 70, getPlayerHealth()));
    updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
    state.potionDoses--;
    updatePotionUI();

    // Chug sound + bottle animation at character
    playPotionChugSound();
    playPotionBottleAnimation(critter, app);

    // Button feedback
    const gulpText = document.getElementById('potion-icon');
    gulpText.style.transform = 'scale(1.4)';
    gulpText.style.transition = 'transform 0.15s';
    setTimeout(() => { gulpText.style.transform = 'scale(0.9)'; }, 150);
    setTimeout(() => { gulpText.style.transform = 'scale(1)'; }, 300);
  });


  
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
          const elapsed = state.endlessElapsed || 0;
          const currentInterval = Math.max(2000, 12000 - Math.floor(elapsed / 5) * 50);
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
      setisPaused(!getisPaused());
      console.log("PAUSED");
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
    console.log("Button Pressed");
  });

  pauseButton.addEventListener("mouseup", function () {
    pauseButton.style.backgroundImage = 'url("./assets/pauseup.png")';
    console.log("Button Released");
  });




["character-portrait", "exp-bar", "health-bar"].forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener("pointerdown", function(e) {
      e.stopPropagation();
      openCharacterMenu();
    });
});
  

  let _swapLock = false; // debounce guard for swap clicks

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

    // Close the character menu
    const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
    characterBoxes.forEach((box) => {
      box.style.visibility = 'hidden';
    });
    updateEXPIndicatorText(getCurrentCharacter(), getCharLevel(getCurrentCharacter()));
    state.isCharacterMenuOpen = false;
    setCharSwap(true);

    // Save old selected character and update both tracking vars together
    // so they can never desync if later code throws
    const prevSelected = state.selectedCharacter;
    setCurrentCharacter(characterType);
    state.selectedCharacter = characterType;

    // Swap positions of the current character box and the previously selected character box
    if (prevSelected !== characterType) {
      const characterLevelElement = document.getElementById("character-level");
      var updateLightning = document.getElementById("lightning-level");
      var updateHP = document.getElementById("heart-level");
      var updateDamage = document.getElementById("swords-level");
      let level;
      switch (characterType) {
        case 'character-snail':
          level = getSnailLevel();
          updateLightning.textContent = getSnailSpeed().toString();
          updateHP.textContent = getSnailHealth().toString();
          updateDamage.textContent = getSnailDamage().toString();
          break;
        case 'character-bird':
          level = getBirdLevel();
          updateLightning.textContent = getBirdSpeed().toString();
          updateHP.textContent = getBirdHealth().toString();
          updateDamage.textContent = getBirdDamage().toString();

          break;
        case 'character-frog':
          level = getFrogLevel();
          updateLightning.textContent = getFrogSpeed().toString();
          updateHP.textContent = getFrogHealth().toString();
          updateDamage.textContent = getFrogDamage().toString();
          break;
        case 'character-bee':
          level = getBeeLevel();
          updateLightning.textContent = getBeeSpeed().toString();
          updateHP.textContent = getBeeHealth().toString();
          updateDamage.textContent = getBeeDamage().toString();
          break;
        default:
          console.log('Invalid character', characterType);
          return;
      }
      if (getPlayerCurrentHealth() >= 0) {
        setisPaused(false);
      }
      startCooldown();

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
        critter.tint = 0xffffff;
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
  // Stacks only visible item buttons below the auto-attack btn with no gaps.
  // Called whenever an item count changes.
  function repositionItemButtons() {
    const btnIds = ['shield-btn', 'bomb-btn', 'rage-btn', 'feather-btn', 'golden-bean-btn'];
    const visibleBtns = [];
    for (const id of btnIds) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      if (btn.style.display !== 'none' && btn.style.display !== '') {
        visibleBtns.push(btn);
      }
    }

    const screenH = window.innerHeight;
    const btnSize = 56;
    const gap = 6;
    const leftEdge = 16;

    // Position auto-attack button: always at top of the left button stack
    const autoAtkBtn = document.getElementById('auto-attack-btn');
    const autoAtkTop = Math.max(screenH * 0.35, 80);
    if (autoAtkBtn) {
      autoAtkBtn.style.bottom = 'auto';
      autoAtkBtn.style.top = autoAtkTop + 'px';
    }

    if (visibleBtns.length === 0) return;

    // Items stack below the auto-attack button
    const startTop = autoAtkTop + btnSize + gap + 4;
    // Max items per column before we'd go off-screen
    const maxPerCol = Math.max(1, Math.floor((screenH - startTop - 8) / (btnSize + gap)));

    visibleBtns.forEach((btn, i) => {
      const col = Math.floor(i / maxPerCol);
      const row = i % maxPerCol;
      btn.style.bottom = 'auto';
      btn.style.width = btnSize + 'px';
      btn.style.height = btnSize + 'px';
      btn.style.top = (startTop + row * (btnSize + gap)) + 'px';
      btn.style.left = (leftEdge + col * (btnSize + gap)) + 'px';
    });
  }

  // Re-layout whenever combat.js dispatches an item-count change (e.g. pickup)
  document.addEventListener('itemButtonsChanged', repositionItemButtons);
  // Update shop affordability whenever coffee changes
  document.addEventListener('coffeeChanged', updatePotionUI);

  // --- Airstrike (bomb item) ---
  function triggerAirstrike(app, critter) {
    // Drop target = ahead of player (shifted ~2 character lengths to the right)
    const dropX = critter.position.x + 140;
    const dropY = -app.stage.y + app.screen.height / 2;
    const groundY = critter.position.y;

    // Play falling bomb whistle
    playBombDropSound();

    // Create bomb emoji dropping from top of screen
    const bombSprite = new PIXI.Text({ text: '💣', style: { fontSize: 48 } });
    bombSprite.anchor.set(0.5);
    bombSprite.position.set(dropX, -app.stage.y - 60);
    bombSprite.zIndex = 999999;
    app.stage.addChild(bombSprite);

    // Animate bomb falling
    const fallStart = Date.now();
    const fallDuration = 700;
    const startBombY = bombSprite.position.y;
    const targetBombY = groundY;

    const animateFall = () => {
      const elapsed = Date.now() - fallStart;
      const progress = Math.min(elapsed / fallDuration, 1);
      // Accelerating fall (ease-in)
      const t = progress * progress;
      bombSprite.position.y = startBombY + (targetBombY - startBombY) * t;
      bombSprite.rotation += 0.15;
      // Grow slightly as it gets closer
      const s = 1 + progress * 0.4;
      bombSprite.scale.set(s);

      if (progress < 1) {
        requestAnimationFrame(animateFall);
      } else {
        // IMPACT — remove bomb sprite
        app.stage.removeChild(bombSprite);
        bombSprite.destroy();

        // Play explosion sound
        playExplosionSound();

        // --- Explosion visual ---
        const explosionContainer = new PIXI.Container();
        explosionContainer.zIndex = 999999;
        explosionContainer.position.set(dropX, groundY);
        app.stage.addChild(explosionContainer);

        // Central fireball ring (expanding circle)
        const fireball = new PIXI.Graphics();
        fireball.circle(0, 0, 10);
        fireball.fill({ color: 0xff6600, alpha: 0.9 });
        explosionContainer.addChild(fireball);

        // Inner white-hot core
        const core = new PIXI.Graphics();
        core.circle(0, 0, 6);
        core.fill({ color: 0xffffcc, alpha: 1 });
        explosionContainer.addChild(core);

        // Explosion particles — fiery debris
        const particles = [];
        const particleCount = 24;
        for (let i = 0; i < particleCount; i++) {
          const p = new PIXI.Graphics();
          const size = 3 + Math.random() * 5;
          const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0xffaa00];
          const color = colors[Math.floor(Math.random() * colors.length)];
          p.circle(0, 0, size);
          p.fill({ color: color, alpha: 0.9 });
          p.position.set(0, 0);
          const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
          const speed = 3 + Math.random() * 6;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - Math.random() * 3;
          p.gravity = 0.12;
          p.drag = 0.96;
          explosionContainer.addChild(p);
          particles.push(p);
        }

        // Smoke puffs
        const smokes = [];
        for (let i = 0; i < 8; i++) {
          const s = new PIXI.Graphics();
          const smokeSize = 8 + Math.random() * 12;
          const grey = Math.floor(80 + Math.random() * 80);
          s.circle(0, 0, smokeSize);
          s.fill({ color: (grey << 16) | (grey << 8) | grey, alpha: 0.5 });
          s.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20);
          s.vx = (Math.random() - 0.5) * 1.5;
          s.vy = -1 - Math.random() * 2;
          explosionContainer.addChild(s);
          smokes.push(s);
        }

        // Screen flash overlay
        const overlay = new PIXI.Graphics();
        overlay.rect(0, 0, app.screen.width, app.screen.height);
        overlay.fill({ color: 0xffffff, alpha: 0.7 });
        overlay.zIndex = 10000;
        overlay.position.set(-app.stage.x, -app.stage.y);
        app.stage.addChild(overlay);

        // Animate explosion
        const explosionStart = Date.now();
        const explosionDuration = 800;
        const animateExplosion = () => {
          const elapsed = Date.now() - explosionStart;
          const progress = Math.min(elapsed / explosionDuration, 1);

          // Expand fireball then fade
          const fireScale = 1 + progress * 8;
          fireball.scale.set(fireScale);
          fireball.alpha = Math.max(0, 0.9 - progress * 1.2);
          core.scale.set(1 + progress * 5);
          core.alpha = Math.max(0, 1 - progress * 2);

          // Particles fly outward
          for (const p of particles) {
            p.position.x += p.vx;
            p.position.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.alpha = Math.max(0, 1 - progress * 1.3);
            p.scale.set(Math.max(0, 1 - progress * 0.8));
          }

          // Smoke drifts up
          for (const s of smokes) {
            s.position.x += s.vx;
            s.position.y += s.vy;
            s.vy *= 0.98;
            s.alpha = Math.max(0, 0.5 - progress * 0.7);
            s.scale.set(1 + progress * 1.5);
          }

          // Fade flash overlay
          const flashAlpha = Math.max(0, 0.7 - progress * 1.4);
          overlay.clear();
          overlay.rect(0, 0, app.screen.width, app.screen.height);
          overlay.fill({ color: 0xffffff, alpha: flashAlpha });
          overlay.position.set(-app.stage.x, -app.stage.y);

          if (progress < 1) {
            requestAnimationFrame(animateExplosion);
          } else {
            // Cleanup
            if (app.stage.children.includes(explosionContainer)) {
              app.stage.removeChild(explosionContainer);
            }
            explosionContainer.destroy({ children: true });
            if (app.stage.children.includes(overlay)) {
              app.stage.removeChild(overlay);
            }
            overlay.destroy();
          }
        };
        requestAnimationFrame(animateExplosion);

        // Screen shake
        let shakeTime = 0;
        const shakeInterval = setInterval(() => {
          shakeTime += 20;
          if (shakeTime > 400) {
            clearInterval(shakeInterval);
            return;
          }
          const intensity = Math.max(0, 1 - shakeTime / 400);
          app.stage.x += (Math.random() - 0.5) * 8 * intensity;
          app.stage.y += (Math.random() - 0.5) * 8 * intensity;
        }, 20);

        // --- Apply damage to all enemies ---
        const enemies = getEnemies();
        const deadEnemies = [];
        for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (!enemy.isAlive) continue;
          const damage = Math.round(enemy.maxHP * 0.75);
          enemy.currentHP -= damage;
          enemy.tint = 0xffffff;
          setTimeout(() => { if (enemy && enemy.isAlive) enemy.tint = 0xffffff; }, 150);
          drawEnemyHPBar(enemy);
          if (enemy.currentHP <= 0) {
            enemy.isAlive = false;
            if (enemy.isDemi) state.lastDemiKillTime = Date.now();
            deadEnemies.push(enemy);
          }
        }

        // Process dead enemies
        deadEnemies.forEach(enemy => {
          if (app.stage.children.includes(enemy)) {
            enemy.tint = 0xFF0000;
            createCoffeeDrop(enemy.position.x + 20, enemy.position.y);
            if (state.gameMode === 'endless') {
              const roll = Math.random();
              if (roll < 0.025) createItemDrop(enemy.position.x, enemy.position.y, 'shield');
              else if (roll < 0.05) createItemDrop(enemy.position.x, enemy.position.y, 'bomb');
            }
            app.stage.removeChild(enemy);
            const idx = enemies.indexOf(enemy);
            if (idx !== -1) enemies.splice(idx, 1);
            const expGain = enemy.exp || 32;
            updateEXP(getCharEXP(getCurrentCharacter()) + expGain);
          }
        });

        if (getEnemiesInRange() > 0) {
          setEnemiesInRange(Math.max(0, getEnemiesInRange() - deadEnemies.length));
        }
        if (getEnemiesInRange() === 0) {
          const enemyPortrait = document.getElementById('enemy-portrait');
          if (enemyPortrait) enemyPortrait.style.display = 'none';
          state.isCombat = false;
        }
      }
    };
    animateFall();
  }


  function createReviveDialog(characterType) {
    if (state.reviveDialogContainer && app.stage.children.includes(state.reviveDialogContainer)) {
      return;
    }

    state.reviveDialogContainer = new PIXI.Container();
    state.reviveDialogContainer.zIndex = 999999;

    const dialogW = Math.min(app.screen.width * 0.55, 320);
    const dialogH = Math.min(app.screen.height * 0.35, 200);
    const cornerRadius = 16;
    const canAfford = getCoffee() >= 50;
    const characterName = getCharacterName(characterType);

    // --- Background panel with rounded corners ---
    const panel = new PIXI.Graphics();
    panel.roundRect(0, 0, dialogW, dialogH, cornerRadius);
    panel.fill({ color: 0x0a0f19, alpha: 0.92 });
    panel.roundRect(0, 0, dialogW, dialogH, cornerRadius);
    panel.stroke({ width: 2, color: 0x64a0c8, alpha: 0.6 });
    state.reviveDialogContainer.addChild(panel);

    // --- Title text ---
    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'Luckiest Guy',
      fontSize: Math.max(16, Math.min(24, dialogW * 0.07)),
      fill: '#e0e8f0',
      stroke: '#000000',
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 1,
    });
    const title = new PIXI.Text(`Revive ${characterName}?`, titleStyle);
    title.anchor.set(0.5, 0);
    title.position.set(dialogW / 2, 14);
    state.reviveDialogContainer.addChild(title);

    // --- Cost line: bean icon + "50" ---
    const costStyle = new PIXI.TextStyle({
      fontFamily: 'Patrick Hand',
      fontSize: Math.max(14, Math.min(20, dialogW * 0.055)),
      fill: canAfford ? '#aaddaa' : '#ff8888',
      stroke: '#000000',
      strokeThickness: 2,
    });
    const costText = new PIXI.Text(`Cost: 50`, costStyle);
    costText.anchor.set(0.5, 0);
    costText.position.set(dialogW / 2 + 12, title.position.y + title.height + 6);
    state.reviveDialogContainer.addChild(costText);

    const beanSprite = new PIXI.Sprite(PIXI.Assets.get('bean'));
    beanSprite.anchor.set(0.5);
    beanSprite.scale.set(0.5);
    beanSprite.position.set(costText.position.x - costText.width / 2 - 14, costText.position.y + costText.height / 2);
    state.reviveDialogContainer.addChild(beanSprite);

    if (!canAfford) {
      const warnStyle = new PIXI.TextStyle({
        fontFamily: 'Patrick Hand',
        fontSize: Math.max(11, Math.min(15, dialogW * 0.04)),
        fill: '#ff6666',
        stroke: '#000000',
        strokeThickness: 2,
      });
      const warnText = new PIXI.Text(`(Not enough coffee!)`, warnStyle);
      warnText.anchor.set(0.5, 0);
      warnText.position.set(dialogW / 2, costText.position.y + costText.height + 2);
      state.reviveDialogContainer.addChild(warnText);
    }

    // --- Buttons ---
    const btnW = dialogW * 0.35;
    const btnH = 40;
    const btnY = dialogH - btnH - 16;
    const btnGap = 16;

    // Yes button
    const yesBg = new PIXI.Graphics();
    yesBg.roundRect(0, 0, btnW, btnH, 8);
    yesBg.fill({ color: canAfford ? 0x1a6630 : 0x333333, alpha: 0.85 });
    yesBg.roundRect(0, 0, btnW, btnH, 8);
    yesBg.stroke({ width: 2, color: canAfford ? 0x44cc66 : 0x666666, alpha: 0.7 });
    yesBg.position.set(dialogW / 2 - btnW - btnGap / 2, btnY);
    state.reviveDialogContainer.addChild(yesBg);

    const yesBtnStyle = new PIXI.TextStyle({
      fontFamily: 'Luckiest Guy',
      fontSize: Math.max(14, Math.min(18, dialogW * 0.05)),
      fill: canAfford ? '#88ff88' : '#888888',
      stroke: '#000000',
      strokeThickness: 2,
    });
    const yesLabel = new PIXI.Text('Revive', yesBtnStyle);
    yesLabel.anchor.set(0.5);
    yesLabel.position.set(yesBg.position.x + btnW / 2, btnY + btnH / 2);
    state.reviveDialogContainer.addChild(yesLabel);

    // No button
    const noBg = new PIXI.Graphics();
    noBg.roundRect(0, 0, btnW, btnH, 8);
    noBg.fill({ color: 0x661a1a, alpha: 0.85 });
    noBg.roundRect(0, 0, btnW, btnH, 8);
    noBg.stroke({ width: 2, color: 0xcc4444, alpha: 0.7 });
    noBg.position.set(dialogW / 2 + btnGap / 2, btnY);
    state.reviveDialogContainer.addChild(noBg);

    const noBtnStyle = new PIXI.TextStyle({
      fontFamily: 'Luckiest Guy',
      fontSize: Math.max(14, Math.min(18, dialogW * 0.05)),
      fill: '#ff8888',
      stroke: '#000000',
      strokeThickness: 2,
    });
    const noLabel = new PIXI.Text('Cancel', noBtnStyle);
    noLabel.anchor.set(0.5);
    noLabel.position.set(noBg.position.x + btnW / 2, btnY + btnH / 2);
    state.reviveDialogContainer.addChild(noLabel);

    // Position dialog centered on screen (in stage coords)
    const dialogX = -app.stage.x + (app.screen.width - dialogW) / 2;
    const dialogY = -app.stage.y + (app.screen.height - dialogH) / 2;
    state.reviveDialogContainer.position.set(dialogX, dialogY);

    app.stage.addChild(state.reviveDialogContainer);
    setisPaused(true);

    // --- Button interactivity ---
    yesBg.eventMode = 'static';
    yesBg.cursor = 'pointer';
    yesLabel.eventMode = 'static';
    yesLabel.cursor = 'pointer';
    noBg.eventMode = 'static';
    noBg.cursor = 'pointer';
    noLabel.eventMode = 'static';
    noLabel.cursor = 'pointer';

    let reviveProcessing = false; // prevent double-click

    const doRevive = () => {
      if (reviveProcessing) return;
      if (getCoffee() >= 50) {
        reviveProcessing = true;
        // Restore health
        if (characterType === 'character-snail') {
          setCurrentSnailHealth(getSnailHealth());
        } else if (characterType === 'character-bird') {
          setCurrentBirdHealth(getBirdHealth());
        } else if (characterType === 'character-frog') {
          setCurrentFrogHealth(getFrogHealth());
        } else if (characterType === 'character-bee') {
          setCurrentBeeHealth(getBeeHealth());
        }
        addCoffee(-50);
        app.stage.removeChild(state.reviveDialogContainer);
        state.reviveDialogContainer = null;
        const revivingSelf = characterType === state.selectedCharacter;

        // --- Ghost cleanup (shared by both paths) ---
        setIsDead(false);
        if (state.ghostFlyInterval) {
          clearInterval(state.ghostFlyInterval);
          state.ghostFlyInterval = null;
        }
        if (state.frogGhostPlayer && state.app.stage.children.includes(state.frogGhostPlayer)) {
          state.app.stage.removeChild(state.frogGhostPlayer);
        }
        // Reset enemies so they re-engage cleanly (keep them on the field)
        for (const enemy of state.enemies) {
          enemy.play();
          enemy.enemyAdded = false;
          enemy.isAttacking = false;
          enemy.onFrameChange = null;
        }

        // Reset combat flags
        state.roundOver = false;
        state.isCombat = false;
        setEnemiesInRange(0);
        state.isAttackingChar = false;
        state.isCharAttacking = false;
        state.hasAttackedThisFrame = false;
        state.isPointerDown = false;
        state.isPaused = false;

        // Hide enemy portrait
        const enemyPortrait = document.getElementById('enemy-portrait');
        if (enemyPortrait) enemyPortrait.style.display = 'none';
        // Unify both self-revive and cross-revive through handleCharacterClick.
        // For self-revive, clear selectedCharacter so handleCharacterClick runs
        // the full swap path (prevSelected !== characterType).
        if (revivingSelf) {
          state.selectedCharacter = '';
        }
        handleCharacterClick(characterType);
        // Reset spawner AFTER setisPaused — setisPaused adjusts timeOfLastSpawn
        // by adding pause duration, which can push it into the future and stall spawns
        if (state.enemySpawnTimeout) {
          clearTimeout(state.enemySpawnTimeout);
          state.enemySpawnTimeout = null;
        }
        state.isSpawning = false;
        state.timeOfLastSpawn = Date.now();
        spawnEnemies();
      } else {
        // Can't afford — shake dialog
        state.hitSound.volume = state.effectsVolume;
        state.hitSound.play();
        if (!state.reviveDialogContainer) return;
        const origX = state.reviveDialogContainer.position.x;
        let shakeCount = 0;
        const shakeInterval = setInterval(() => {
          if (!state.reviveDialogContainer) { clearInterval(shakeInterval); return; }
          state.reviveDialogContainer.position.x = origX + (shakeCount % 2 === 0 ? 8 : -8);
          shakeCount++;
          if (shakeCount >= 6) {
            clearInterval(shakeInterval);
            if (state.reviveDialogContainer) state.reviveDialogContainer.position.x = origX;
          }
        }, 50);
      }
    };

    const doCancel = () => {
      if (!state.reviveDialogContainer) return;
      app.stage.removeChild(state.reviveDialogContainer);
      state.reviveDialogContainer = null;
      openCharacterMenu();
    };

    yesBg.on('pointerdown', (e) => { e.stopPropagation(); doRevive(); });
    yesLabel.on('pointerdown', (e) => { e.stopPropagation(); doRevive(); });
    noBg.on('pointerdown', (e) => { e.stopPropagation(); doCancel(); });
    noLabel.on('pointerdown', (e) => { e.stopPropagation(); doCancel(); });
  }



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

    // --- Endless mode setup ---
    if (state.gameMode === 'endless') {
      // Unlock all 4 characters
      state.unlockedCharacters = ['character-frog', 'character-snail', 'character-bird', 'character-bee'];
      // Hide timer bar (snail + progress)
      document.getElementById('snail').style.display = 'none';
      document.getElementById('progress').style.display = 'none';
      document.getElementById('progress-filled').style.display = 'none';
      // Show endless timer
      document.getElementById('endless-timer').style.display = 'flex';
      // Wire auto-attack button (shown after loading finishes)
      const autoBtn = document.getElementById('auto-attack-btn');
      autoBtn.addEventListener('click', () => {
        state.autoAttack = !state.autoAttack;
        autoBtn.classList.toggle('active', state.autoAttack);
      });
      // Set endless start time + reset kill count
      state.endlessStartTime = Date.now();
      state.endlessElapsed = 0;
      state.endlessKillCount = 0;

      // Start with 1 bomb and 1 rage potion
      setBombCount(1);
      setRageCount(1);

      // Wire item buttons
      const shieldBtn = document.getElementById('shield-btn');
      const bombBtn = document.getElementById('bomb-btn');
      const rageBtn = document.getElementById('rage-btn');
      const featherBtn = document.getElementById('feather-btn');
      const goldenBeanBtn = document.getElementById('golden-bean-btn');

      // Show buttons + counts for starting items
      bombBtn.style.display = 'flex';
      rageBtn.style.display = 'flex';
      document.getElementById('bomb-count').textContent = getBombCount();
      document.getElementById('rage-count').textContent = getRageCount();
      repositionItemButtons();

      // Shield button handler
      shieldBtn.addEventListener('click', () => {
        if (getShieldCount() > 0 && !state.shieldActive) {
          setShieldCount(getShieldCount() - 1);
          document.getElementById('shield-count').textContent = getShieldCount();
          shieldBtn.classList.toggle('active', getShieldCount() > 0);
          if (getShieldCount() <= 0) { shieldBtn.style.display = 'none'; }
          repositionItemButtons();

          state.shieldActive = true;
          state.shieldHP = 100;

          // Create shield visual — rendered in front of critter (zIndex 10)
          const shield = new PIXI.Graphics();
          // Outer glow ring
          shield.circle(0, 0, 55);
          shield.fill({ color: 0x00ffff, alpha: 0.08 });
          // Main bubble
          shield.circle(0, 0, 45);
          shield.fill({ color: 0x00ffff, alpha: 0.15 });
          shield.stroke({ width: 3, color: 0x00ffff, alpha: 0.6 });
          shield.zIndex = 50;
          shield.position.set(critter.position.x, critter.position.y);
          state.app.stage.addChild(shield);
          state.shieldSprite = shield;

          // Update shield bar
          const shieldBarFill = document.getElementById('shield-bar-fill');
          if (shieldBarFill) shieldBarFill.style.width = '100%';

          // Glow on button
          shieldBtn.classList.add('shield-active-glow');

          playShieldActivateSound();
        }
      });

      // Bomb button handler
      bombBtn.addEventListener('click', () => {
        if (getBombCount() > 0) {
          setBombCount(getBombCount() - 1);
          document.getElementById('bomb-count').textContent = getBombCount();
          bombBtn.classList.toggle('active', getBombCount() > 0);
          if (getBombCount() <= 0) { bombBtn.style.display = 'none'; }
          repositionItemButtons();
          triggerAirstrike(app, critter);
        }
      });

      // Rage Potion button handler
      rageBtn.addEventListener('click', () => {
        if (getRageCount() > 0 && !state.rageActive) {
          setRageCount(getRageCount() - 1);
          document.getElementById('rage-count').textContent = getRageCount();
          rageBtn.classList.toggle('active', getRageCount() > 0);

          state.rageActive = true;
          state.rageStartTime = Date.now();
          state.rageEndTime = Date.now() + 30000;
          state.originalAnimSpeed = critter.animationSpeed;
          critter.animationSpeed *= 2;
          critter.tint = 0xff4444;
          rageBtn.classList.add('rage-active-glow');
          // Show full rage fill
          const rageFill = document.getElementById('rage-fill');
          if (rageFill) rageFill.style.height = '100%';
          playRageSound();
        }
      });

      // Feather button handler
      featherBtn.addEventListener('click', () => {
        if (getFeatherCount() > 0 && !state.featherActive) {
          setFeatherCount(getFeatherCount() - 1);
          document.getElementById('feather-count').textContent = getFeatherCount();
          featherBtn.classList.toggle('active', getFeatherCount() > 0);
          if (getFeatherCount() <= 0) { featherBtn.style.display = 'none'; }
          repositionItemButtons();

          state.featherActive = true;
          // Create feather sprite above critter
          const featherSprite = new PIXI.Text({ text: '🪶', style: { fontSize: 28 } });
          featherSprite.anchor.set(0.5);
          featherSprite.position.set(critter.position.x, critter.position.y - 50);
          featherSprite.zIndex = 51;
          state.app.stage.addChild(featherSprite);
          state.featherSprite = featherSprite;
          featherBtn.classList.add('feather-active-glow');
        }
      });

      // Golden Bean button handler (instant use)
      goldenBeanBtn.addEventListener('click', () => {
        if (getGoldenBeanCount() > 0) {
          setGoldenBeanCount(getGoldenBeanCount() - 1);
          document.getElementById('golden-bean-count').textContent = getGoldenBeanCount();
          goldenBeanBtn.classList.toggle('active', getGoldenBeanCount() > 0);
          if (getGoldenBeanCount() <= 0) { goldenBeanBtn.style.display = 'none'; }
          repositionItemButtons();
          playGoldenBeanFlyEffect(critter, 100);
          playGoldenBeanSound();
        }
      });
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
// Clouds are now procedural — no sprite assets needed

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
  'castle'
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
    console.log(`Downscaling ${key}: ${w}x${h} -> ${nw}x${nh} (max=${maxSize})`);

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
 console.log('GPU max texture size:', maxTex);
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
// Pick 2 random indices to be bright twinkler stars
const brightTwinklerIndices = new Set();
while (brightTwinklerIndices.size < 2) {
  brightTwinklerIndices.add(Math.floor(Math.random() * 50));
}
for (let i = 0; i < 50; i++) {
  const star = new PIXI.Graphics();
  const isBright = brightTwinklerIndices.has(i);
  const sz = isBright ? (2.5 + Math.random() * 1.0) : (0.5 + Math.random() * 2.0);
  const color = sz > 1.5 ? [0xFFFFFF, 0xFFEEDD, 0xDDEEFF][Math.floor(Math.random() * 3)] : 0xFFFFFF;
  if (isBright) {
    // Single inner glow ring only
    star.circle(0, 0, sz * 1.6).fill({ color, alpha: 0.08 });
  }
  star.circle(0, 0, sz).fill({ color, alpha: isBright ? (0.7 + Math.random() * 0.2) : (0.2 + Math.random() * 0.4) });
  star.position.set(Math.random() * app.screen.width, Math.random() * app.screen.height * 0.55);
  star.twinkleSpeed = isBright ? (0.03 + Math.random() * 0.02) : (0.008 + Math.random() * 0.012);
  star.twinklePhase = Math.random() * Math.PI * 2;
  star.baseAlpha = star.alpha;
  star.isBrightTwinkler = isBright;
  persistentStars.addChild(star);
}
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
const endlessGroundPalettes = {
  sun:  { base: 0x4a8c3f, dirt: 0x6b5234, path: 0xc4a66a, grass: 0x5cb350, variation: 0x3f7a35,
          rock: 0x8a8078, rockShade: 0x6b6058, trunk: 0x6b4226, canopy: [0xd4442a, 0xe06830, 0xcc3322, 0x44a040, 0x389030], flower: 0xe8c840 },
  rain: { base: 0x3b6b35, dirt: 0x4a3d2a, path: 0x7a6b50, grass: 0x2d5a28, variation: 0x335e2e,
          rock: 0x606060, rockShade: 0x484848, trunk: 0x4a3520, canopy: [0x1e4a1e, 0x2a5a2a, 0x1a3e1a], flower: 0x5a7a5a },
  wind: { base: 0x5a9a4f, dirt: 0x6b5234, path: 0xc4a66a, grass: 0x6db85f, variation: 0x4e8a43,
          rock: 0x9a9088, rockShade: 0x7a7068, trunk: 0x7a5530, canopy: [0x50a848, 0x60b858, 0x3a8a30, 0xe8a820], flower: 0xd0d840 },
  snow: { base: 0xd4dce6, dirt: 0x8a8a90, path: 0xb0b5bc, grass: 0xe8eef5, variation: 0xc0c8d4,
          rock: 0xa8aab0, rockShade: 0x8a8c92, trunk: 0x5a4a3a, canopy: [0x2a5a3a, 0x1a4a2a, 0xc8d8e0], flower: 0xd0dae0 },
  night: { base: 0x1a2e1a, dirt: 0x2a2218, path: 0x3a3528, grass: 0x1e3a1e, variation: 0x162a16,
           rock: 0x4a4a50, rockShade: 0x3a3a40, trunk: 0x3a2a18, canopy: [0x142a14, 0x1a3a1a, 0x0e200e], flower: 0x3a3a50 },
};
let endlessGroundCurrentWeather = null;
const endlessGroundHeight = foreground.height * 0.65;

// Seeded random for consistent positions across redraws
let _endlessGroundSeed = 12345;
function endlessGroundRandom() {
  _endlessGroundSeed = (_endlessGroundSeed * 16807 + 0) % 2147483647;
  return (_endlessGroundSeed & 0x7fffffff) / 2147483647;
}

// Helper to get the curving top-edge Y offset at a given x position
const terrainWaveFreq1 = 0.0004;
const terrainWaveFreq2 = 0.0011;
const terrainWaveAmp = 14;
function terrainTopY(x) {
  return Math.sin(x * terrainWaveFreq1) * terrainWaveAmp
       + Math.sin(x * terrainWaveFreq2) * terrainWaveAmp * 0.5;
}

function drawEndlessGround(weather) {
  const palette = endlessGroundPalettes[weather] || endlessGroundPalettes.sun;
  const g = endlessGround;
  const w = state.gameMode === 'endless' ? 50000 : Math.ceil(foreground.width);
  const h = endlessGroundHeight;
  const step = 50; // polygon segment width
  g.clear();

  // 1. Base fill with curving top edge
  g.moveTo(0, terrainTopY(0));
  for (let x = step; x <= w; x += step) { g.lineTo(x, terrainTopY(x)); }
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath().fill({ color: palette.base });

  // 2. Dirt/subsoil strip at the bottom (20% of height) with sub-layers
  const dirtH = h * 0.20;
  g.rect(0, h - dirtH, w, dirtH).fill({ color: palette.dirt });
  g.rect(0, h - dirtH, w, 3).fill({ color: palette.rockShade, alpha: 0.4 });
  g.rect(0, h - dirtH * 0.5, w, dirtH * 0.25).fill({ color: palette.dirt, alpha: 0.6 });

  // 3. Color variation bands
  const bandH = h * 0.06;
  g.rect(0, h * 0.18, w, bandH).fill({ color: palette.variation, alpha: 0.35 });
  g.rect(0, h * 0.35, w, bandH * 1.2).fill({ color: palette.variation, alpha: 0.5 });
  g.rect(0, h * 0.55, w, bandH).fill({ color: palette.variation, alpha: 0.3 });
  g.rect(0, h * 0.72, w, bandH * 0.8).fill({ color: palette.variation, alpha: 0.4 });

  // 4. Walking path — thick, gently winding
  const pathCenterY = h * 0.38;
  const pathH = 44;
  const pathWaveAmp = 8;
  const pathWaveFreq = 0.0008;
  function pathOffset(px) {
    return Math.sin(px * pathWaveFreq) * pathWaveAmp + Math.sin(px * pathWaveFreq * 2.7) * pathWaveAmp * 0.4;
  }
  // Border
  g.moveTo(0, pathCenterY + pathOffset(0) - 3);
  for (let px = 0; px <= w; px += step) g.lineTo(px, pathCenterY + pathOffset(px) - 3);
  for (let px = w; px >= 0; px -= step) g.lineTo(px, pathCenterY + pathOffset(px) + pathH + 3);
  g.closePath().fill({ color: palette.variation, alpha: 0.5 });
  // Main fill
  g.moveTo(0, pathCenterY + pathOffset(0));
  for (let px = 0; px <= w; px += step) g.lineTo(px, pathCenterY + pathOffset(px));
  for (let px = w; px >= 0; px -= step) g.lineTo(px, pathCenterY + pathOffset(px) + pathH);
  g.closePath().fill({ color: palette.path, alpha: 0.7 });
  // Highlight
  g.moveTo(0, pathCenterY + pathOffset(0) + 5);
  for (let px = 0; px <= w; px += step) g.lineTo(px, pathCenterY + pathOffset(px) + 5);
  for (let px = w; px >= 0; px -= step) g.lineTo(px, pathCenterY + pathOffset(px) + 9);
  g.closePath().fill({ color: palette.path, alpha: 0.3 });

  // 5. Scattered rocks embedded in the ground
  _endlessGroundSeed = 99999;
  let rx = 80;
  while (rx < w) {
    const rw = 8 + endlessGroundRandom() * 16;
    const rh = 5 + endlessGroundRandom() * 10;
    const ry = h * 0.5 + endlessGroundRandom() * (h * 0.3);
    g.roundRect(rx, ry, rw, rh, 3).fill({ color: palette.rock });
    g.roundRect(rx + 2, ry + 1, rw * 0.5, rh * 0.4, 2).fill({ color: palette.rockShade, alpha: 0.3 });
    rx += 150 + endlessGroundRandom() * 350;
  }

  // 6. Small pebbles
  _endlessGroundSeed = 77777;
  let px = 30;
  while (px < w) {
    const ps = 2 + endlessGroundRandom() * 4;
    const py = h * 0.3 + endlessGroundRandom() * (h * 0.5);
    g.circle(px, py, ps).fill({ color: palette.rock, alpha: 0.5 });
    px += 60 + endlessGroundRandom() * 120;
  }

  // 7. Grass tufts along the curving top edge
  _endlessGroundSeed = 12345;
  let gx = 5;
  while (gx < w) {
    const topY = terrainTopY(gx);
    const cluster = 1 + Math.floor(endlessGroundRandom() * 3);
    for (let i = 0; i < cluster; i++) {
      const tuftH = 5 + endlessGroundRandom() * 12;
      const tuftW = 3 + endlessGroundRandom() * 5;
      const ox = i * (tuftW * 0.7);
      g.poly([
        gx + ox, topY,
        gx + ox + tuftW / 2, topY - tuftH,
        gx + ox + tuftW, topY,
      ]).fill({ color: palette.grass });
    }
    gx += 20 + endlessGroundRandom() * 40;
  }

  // 8. Grass tufts scattered across the ground surface
  _endlessGroundSeed = 55555;
  let sgx = 40;
  while (sgx < w) {
    const tuftH = 4 + endlessGroundRandom() * 6;
    const tuftW = 3 + endlessGroundRandom() * 4;
    const sy = h * 0.15 + endlessGroundRandom() * (h * 0.4);
    g.poly([sgx, sy, sgx + tuftW / 2, sy - tuftH, sgx + tuftW, sy]).fill({ color: palette.grass, alpha: 0.6 });
    sgx += 70 + endlessGroundRandom() * 140;
  }

  // 9. Individual grass blades
  _endlessGroundSeed = 11111;
  let bx2 = 15;
  while (bx2 < w) {
    const bladeH = 8 + endlessGroundRandom() * 14;
    const bladeY = h * 0.05 + endlessGroundRandom() * (h * 0.55);
    const lean = (endlessGroundRandom() - 0.5) * 6;
    const bladeColor = endlessGroundRandom() > 0.5 ? palette.grass : palette.variation;
    const bladeAlpha = 0.4 + endlessGroundRandom() * 0.4;
    g.poly([bx2, bladeY, bx2 + lean, bladeY - bladeH, bx2 + 1.5, bladeY]).fill({ color: bladeColor, alpha: bladeAlpha });
    bx2 += 15 + endlessGroundRandom() * 35;
  }

  // -- Draw trees/rocks into the decor container (above ground line) --
  if (endlessGroundDecor) {
    endlessGroundDecor.removeChildren();
  }
  drawEndlessGroundDecor(weather, palette, h);
}

function drawEndlessGroundDecor(weather, palette, groundH) {
  if (!endlessGroundDecor) return;
  const d = new PIXI.Graphics();
  const w = 50000;

  // Trees — behind the walking area (positioned on the curving terrain)
  _endlessGroundSeed = 33333;
  let tx = 120;
  while (tx < w) {
    const treeType = endlessGroundRandom();
    const treeScale = 0.5 + endlessGroundRandom() * 0.9; // wider range: 0.5x to 1.4x
    const trunkH = (30 + endlessGroundRandom() * 25) * treeScale;
    const trunkW = (6 + endlessGroundRandom() * 4) * treeScale;
    const canopyR = (18 + endlessGroundRandom() * 14) * treeScale;
    const depthOffset = endlessGroundRandom() * 12 * treeScale; // slight Y offset for depth
    const treeY = terrainTopY(tx) + depthOffset; // follow terrain curve + depth
    const canopyColor = palette.canopy[Math.floor(endlessGroundRandom() * palette.canopy.length)];
    const darkCanopy = palette.canopy[Math.min(3, palette.canopy.length - 1)];
    const darkTrunk = 0x2a1a0a;

    if (weather === 'wind' && treeType < 0.35) {
      // Cactus — smoother rounded shapes
      const cH = (20 + endlessGroundRandom() * 30) * treeScale;
      const cW = 8 * treeScale;
      const hasFlower = endlessGroundRandom() > 0.6;
      // Main body — rounded
      d.circle(tx, treeY - cH * 0.5, cW * 0.5).fill({ color: 0x3a7a30 });
      d.ellipse(tx, treeY - cH * 0.5, cW * 0.48, cH * 0.5).fill({ color: 0x3a7a30 });
      // Left arm
      const armY = treeY - cH * 0.6;
      d.ellipse(tx - cW * 0.9, armY, cW * 0.35, cW * 0.45).fill({ color: 0x3a7a30 });
      d.ellipse(tx - cW * 0.9, armY - cH * 0.15, cW * 0.35, cH * 0.18).fill({ color: 0x3a7a30 });
      // Right arm
      const armY2 = treeY - cH * 0.45;
      d.ellipse(tx + cW * 0.85, armY2, cW * 0.3, cW * 0.4).fill({ color: 0x3a7a30 });
      d.ellipse(tx + cW * 0.85, armY2 - cH * 0.12, cW * 0.3, cH * 0.15).fill({ color: 0x3a7a30 });
      // Vertical highlight stripe
      d.rect(tx - 1, treeY - cH + 3, 2, cH - 6).fill({ color: 0x5aaa50, alpha: 0.3 });
      // Flower on top
      if (hasFlower) {
        d.circle(tx, treeY - cH - 2, cW * 0.25).fill({ color: 0xff6688, alpha: 0.85 });
        d.circle(tx - 1, treeY - cH - 3, cW * 0.15).fill({ color: 0xffaacc, alpha: 0.5 });
      }
      tx += 300 + endlessGroundRandom() * 500;
      continue;
    }

    // Trunk — tapered (wider at base) with bark texture
    const trunkTopW = trunkW * 0.7;
    d.moveTo(tx - trunkW / 2, treeY);
    d.lineTo(tx - trunkTopW / 2, treeY - trunkH);
    d.lineTo(tx + trunkTopW / 2, treeY - trunkH);
    d.lineTo(tx + trunkW / 2, treeY);
    d.closePath();
    d.fill({ color: palette.trunk });
    // Bark texture lines
    d.moveTo(tx - 1, treeY - trunkH * 0.15);
    d.lineTo(tx - 1.5, treeY - trunkH * 0.7);
    d.stroke({ width: 1, color: darkTrunk, alpha: 0.3 });
    d.moveTo(tx + 1.5, treeY - trunkH * 0.1);
    d.lineTo(tx + 1, treeY - trunkH * 0.55);
    d.stroke({ width: 1, color: darkTrunk, alpha: 0.25 });
    // Branch stubs
    if (treeScale > 0.7) {
      d.moveTo(tx - trunkTopW * 0.4, treeY - trunkH * 0.7);
      d.lineTo(tx - trunkW * 1.2, treeY - trunkH * 0.8);
      d.stroke({ width: 2 * treeScale, color: palette.trunk, alpha: 0.7 });
      d.moveTo(tx + trunkTopW * 0.4, treeY - trunkH * 0.55);
      d.lineTo(tx + trunkW * 1.0, treeY - trunkH * 0.62);
      d.stroke({ width: 1.5 * treeScale, color: palette.trunk, alpha: 0.6 });
    }
    if (weather === 'sun' && treeType < 0.5) {
      // Maple tree — rich multi-layered canopy
      const cx = tx, cy = treeY - trunkH;
      const r = canopyR;
      // Dark inner base layer
      d.circle(cx, cy + r * 0.1, r * 0.85).fill({ color: darkCanopy, alpha: 0.4 });
      // Main body — cluster of overlapping circles
      d.circle(cx, cy - r * 0.4, r * 1.15).fill({ color: canopyColor, alpha: 0.85 });
      d.circle(cx - r * 0.65, cy - r * 0.1, r * 0.75).fill({ color: canopyColor, alpha: 0.8 });
      d.circle(cx + r * 0.65, cy - r * 0.1, r * 0.75).fill({ color: canopyColor, alpha: 0.8 });
      // Upper lobes
      d.circle(cx - r * 0.3, cy - r * 0.9, r * 0.6).fill({ color: canopyColor, alpha: 0.9 });
      d.circle(cx + r * 0.3, cy - r * 0.9, r * 0.6).fill({ color: canopyColor, alpha: 0.9 });
      d.circle(cx, cy - r * 1.1, r * 0.5).fill({ color: canopyColor, alpha: 0.85 });
      // Extra lobes for fullness
      d.circle(cx - r * 0.5, cy - r * 0.55, r * 0.5).fill({ color: canopyColor, alpha: 0.75 });
      d.circle(cx + r * 0.5, cy - r * 0.55, r * 0.5).fill({ color: canopyColor, alpha: 0.75 });
      d.circle(cx - r * 0.15, cy - r * 0.2, r * 0.65).fill({ color: canopyColor, alpha: 0.7 });
      d.circle(cx + r * 0.15, cy - r * 0.25, r * 0.6).fill({ color: canopyColor, alpha: 0.7 });
      // Highlight — sunlit top-left
      d.circle(cx - r * 0.2, cy - r * 0.75, r * 0.45).fill({ color: 0xffffff, alpha: 0.12 });
      d.circle(cx - r * 0.05, cy - r * 1.0, r * 0.3).fill({ color: 0xffffff, alpha: 0.1 });
      // Leaf scatter around canopy edge
      for (let fl = 0; fl < 7; fl++) {
        const angle = endlessGroundRandom() * Math.PI * 2;
        const dist = r * 0.9 + endlessGroundRandom() * r * 0.4;
        const lx = cx + Math.cos(angle) * dist;
        const ly = cy - r * 0.4 + Math.sin(angle) * dist * 0.6;
        const lc = palette.canopy[Math.floor(endlessGroundRandom() * palette.canopy.length)];
        d.circle(lx, ly, 1.5 + endlessGroundRandom() * 1.5).fill({ color: lc, alpha: 0.5 + endlessGroundRandom() * 0.3 });
      }
      // Fallen leaves at base
      for (let fl = 0; fl < 5; fl++) {
        const lx = cx - r + endlessGroundRandom() * r * 2;
        const ly = treeY - 1 + endlessGroundRandom() * 3;
        d.circle(lx, ly, 1.5 + endlessGroundRandom()).fill({ color: canopyColor, alpha: 0.5 });
      }
    } else if (weather === 'snow' && treeType < 0.6) {
      // Pine tree — 4 tiers with curved snow caps
      const cx = tx, cy = treeY - trunkH;
      const pineH = canopyR * 2.2, pineW = canopyR * 1.4;
      for (let tier = 0; tier < 4; tier++) {
        const ty = cy - tier * pineH * 0.24;
        const tw = pineW * (1 - tier * 0.18), th = pineH * 0.4;
        // Tier foliage — triangle with curved bottom (ellipse clip effect)
        d.poly([cx - tw / 2, ty, cx, ty - th, cx + tw / 2, ty]).fill({ color: canopyColor });
        // Curved bottom edge
        d.ellipse(cx, ty + 2, tw * 0.5, 4).fill({ color: canopyColor, alpha: 0.6 });
        // Snow draping over tier edges
        d.ellipse(cx, ty - th * 0.15, tw * 0.42, th * 0.18).fill({ color: 0xe8eef5, alpha: 0.75 });
        d.ellipse(cx - tw * 0.2, ty - th * 0.05, tw * 0.2, 4).fill({ color: 0xdde8f0, alpha: 0.5 });
        d.ellipse(cx + tw * 0.2, ty - th * 0.05, tw * 0.2, 4).fill({ color: 0xdde8f0, alpha: 0.5 });
        // Tiny trunk visible between tiers
        if (tier < 3) {
          d.rect(cx - trunkTopW * 0.3, ty, trunkTopW * 0.6, pineH * 0.04).fill({ color: palette.trunk, alpha: 0.5 });
        }
      }
    } else if (weather === 'rain') {
      // Droopy tree — wind-swept with moss
      const cx = tx, cy = treeY - trunkH - canopyR * 0.4;
      const lean = canopyR * 0.15;
      // Main canopy — ellipse
      d.ellipse(cx + lean, cy, canopyR * 1.05, canopyR * 1.3).fill({ color: canopyColor, alpha: 0.85 });
      // Drooping sub-ellipses
      d.ellipse(cx + lean - canopyR * 0.4, cy + canopyR * 0.6, canopyR * 0.4, canopyR * 0.55).fill({ color: canopyColor, alpha: 0.65 });
      d.ellipse(cx + lean + canopyR * 0.35, cy + canopyR * 0.5, canopyR * 0.35, canopyR * 0.5).fill({ color: canopyColor, alpha: 0.6 });
      d.ellipse(cx + lean, cy + canopyR * 0.7, canopyR * 0.3, canopyR * 0.4).fill({ color: canopyColor, alpha: 0.5 });
      // Darker depth underneath
      d.ellipse(cx + lean, cy + canopyR * 0.3, canopyR * 0.65, canopyR * 0.5).fill({ color: darkCanopy, alpha: 0.3 });
      // Moss dots on trunk
      d.circle(tx - trunkW * 0.3, treeY - trunkH * 0.4, 2.5 * treeScale).fill({ color: 0x446644, alpha: 0.5 });
      d.circle(tx + trunkW * 0.2, treeY - trunkH * 0.6, 2 * treeScale).fill({ color: 0x446644, alpha: 0.4 });
      // Drip detail below canopy
      d.circle(cx + lean - canopyR * 0.2, cy + canopyR * 1.1, 1.5).fill({ color: 0x6688bb, alpha: 0.4 });
      d.circle(cx + lean + canopyR * 0.15, cy + canopyR * 1.0, 1.2).fill({ color: 0x6688bb, alpha: 0.35 });
    } else if (weather === 'night') {
      // Silhouette tree with warm glow at base
      const cx = tx, cy = treeY - trunkH - canopyR * 0.5;
      d.circle(cx, cy, canopyR).fill({ color: canopyColor, alpha: 0.85 });
      d.circle(cx - canopyR * 0.3, cy + canopyR * 0.2, canopyR * 0.6).fill({ color: canopyColor, alpha: 0.6 });
      d.circle(cx + canopyR * 0.35, cy + canopyR * 0.15, canopyR * 0.55).fill({ color: canopyColor, alpha: 0.6 });
      d.circle(cx + canopyR * 0.1, cy - canopyR * 0.3, canopyR * 0.5).fill({ color: canopyColor, alpha: 0.7 });
      // Warm lantern glow at base
      d.circle(tx, treeY - 2, canopyR * 0.6).fill({ color: 0xffaa44, alpha: 0.06 });
      d.circle(tx, treeY - 4, canopyR * 0.35).fill({ color: 0xffcc66, alpha: 0.08 });
    } else {
      // Default round tree — enhanced
      const cx = tx, cy = treeY - trunkH - canopyR * 0.5;
      // Dark underside for volume
      d.ellipse(cx, cy + canopyR * 0.35, canopyR * 0.9, canopyR * 0.5).fill({ color: darkCanopy, alpha: 0.3 });
      // Main circle
      d.circle(cx, cy, canopyR).fill({ color: canopyColor, alpha: 0.85 });
      // Side clusters — 4 overlapping
      d.circle(cx - canopyR * 0.3, cy + canopyR * 0.2, canopyR * 0.6).fill({ color: canopyColor, alpha: 0.6 });
      d.circle(cx + canopyR * 0.35, cy + canopyR * 0.15, canopyR * 0.55).fill({ color: canopyColor, alpha: 0.6 });
      d.circle(cx - canopyR * 0.5, cy - canopyR * 0.15, canopyR * 0.45).fill({ color: canopyColor, alpha: 0.65 });
      d.circle(cx + canopyR * 0.45, cy - canopyR * 0.2, canopyR * 0.5).fill({ color: canopyColor, alpha: 0.65 });
      // Highlight on top-left
      d.circle(cx - canopyR * 0.15, cy - canopyR * 0.35, canopyR * 0.4).fill({ color: 0xffffff, alpha: 0.1 });
    }

    tx += 300 + endlessGroundRandom() * 500;
  }

  // Bushes with berries — all biomes
  _endlessGroundSeed = 22222;
  let bsx = 80;
  const berryColors = { sun: 0xcc2244, rain: 0x5544aa, wind: 0xddaa22, snow: 0x8844bb };
  const berryColor = berryColors[weather] || 0xcc2244;
  while (bsx < w) {
    const bushY = terrainTopY(bsx);
    const bushW = 16 + endlessGroundRandom() * 20;
    const bushH = 10 + endlessGroundRandom() * 12;
    // Bush body — overlapping circles
    d.circle(bsx, bushY - bushH * 0.5, bushW * 0.4).fill({ color: palette.canopy[0], alpha: 0.8 });
    d.circle(bsx - bushW * 0.25, bushY - bushH * 0.3, bushW * 0.35).fill({ color: palette.canopy[Math.min(1, palette.canopy.length - 1)], alpha: 0.75 });
    d.circle(bsx + bushW * 0.25, bushY - bushH * 0.3, bushW * 0.33).fill({ color: palette.canopy[0], alpha: 0.7 });
    // Berries — small bright dots
    const numBerries = 2 + Math.floor(endlessGroundRandom() * 4);
    for (let b = 0; b < numBerries; b++) {
      const bxOff = (endlessGroundRandom() - 0.5) * bushW * 0.6;
      const byOff = -bushH * 0.2 - endlessGroundRandom() * bushH * 0.5;
      d.circle(bsx + bxOff, bushY + byOff, 2 + endlessGroundRandom() * 1.5).fill({ color: berryColor });
      d.circle(bsx + bxOff - 0.5, bushY + byOff - 0.5, 1).fill({ color: 0xffffff, alpha: 0.4 });
    }
    bsx += 200 + endlessGroundRandom() * 400;
  }

  // Wind biome: tumbleweed
  if (weather === 'wind') {
    _endlessGroundSeed = 77700;
    let twx = 150;
    while (twx < w) {
      const twY = terrainTopY(twx);
      const twR = 6 + endlessGroundRandom() * 8;
      // Tumbleweed — scribbled circle
      d.circle(twx, twY - twR, twR).fill({ color: 0x8a7a50, alpha: 0.7 });
      d.circle(twx, twY - twR, twR * 0.7).fill({ color: 0xa09060, alpha: 0.5 });
      // Inner scribble lines
      for (let i = 0; i < 5; i++) {
        const angle = endlessGroundRandom() * Math.PI * 2;
        const len = twR * 0.6;
        d.moveTo(twx, twY - twR).lineTo(twx + Math.cos(angle) * len, twY - twR + Math.sin(angle) * len)
          .stroke({ width: 1, color: 0x6a5a30, alpha: 0.4 });
      }
      twx += 500 + endlessGroundRandom() * 800;
    }
  }

  // Large rocks / boulders above the ground
  _endlessGroundSeed = 44444;
  let bx = 200;
  while (bx < w) {
    const bw = 14 + endlessGroundRandom() * 22;
    const bh = 10 + endlessGroundRandom() * 14;
    const by = terrainTopY(bx) - bh * 0.4;
    d.roundRect(bx, by, bw, bh, bh * 0.4).fill({ color: palette.rock });
    d.ellipse(bx + bw / 2, by + bh + 2, bw * 0.5, 3).fill({ color: 0x000000, alpha: 0.15 });
    d.roundRect(bx + 3, by + 2, bw * 0.4, bh * 0.35, 3).fill({ color: 0xffffff, alpha: 0.12 });
    bx += 400 + endlessGroundRandom() * 600;
  }

  // Small flowers (sun and wind only — but not as many in wind)
  if (weather === 'sun' || weather === 'wind') {
    _endlessGroundSeed = 66666;
    let fx = 60;
    const flowerSpacing = weather === 'wind' ? 200 : 80;
    while (fx < w) {
      const fy = terrainTopY(fx) - 2 - endlessGroundRandom() * 6;
      const fSize = 2 + endlessGroundRandom() * 3;
      d.circle(fx, fy, fSize).fill({ color: palette.flower, alpha: 0.8 });
      d.circle(fx, fy, fSize * 0.5).fill({ color: 0xffffff, alpha: 0.4 });
      fx += flowerSpacing + endlessGroundRandom() * 200;
    }
  }

  // Snow patches (snow only)
  if (weather === 'snow') {
    _endlessGroundSeed = 88888;
    let sx = 40;
    while (sx < w) {
      const sw = 20 + endlessGroundRandom() * 40;
      const sh = 4 + endlessGroundRandom() * 6;
      d.ellipse(sx, terrainTopY(sx) - 1, sw, sh).fill({ color: 0xf0f4fa, alpha: 0.5 });
      sx += 100 + endlessGroundRandom() * 200;
    }
  }

  // Snowmen (snow only)
  if (weather === 'snow') {
    _endlessGroundSeed = 99111;
    let smx = 300;
    while (smx < w) {
      const smY = terrainTopY(smx);
      const sc = 0.7 + endlessGroundRandom() * 0.5;
      // Bottom ball
      d.circle(smx, smY - 10 * sc, 10 * sc).fill({ color: 0xf0f4fa });
      d.circle(smx - 3 * sc, smY - 13 * sc, 3 * sc).fill({ color: 0xffffff, alpha: 0.3 });
      // Middle ball
      d.circle(smx, smY - 24 * sc, 7.5 * sc).fill({ color: 0xeaeff5 });
      d.circle(smx - 2 * sc, smY - 26 * sc, 2 * sc).fill({ color: 0xffffff, alpha: 0.25 });
      // Head
      d.circle(smx, smY - 36 * sc, 5.5 * sc).fill({ color: 0xf0f4fa });
      // Eyes — coal
      d.circle(smx - 2 * sc, smY - 38 * sc, 1 * sc).fill({ color: 0x111111 });
      d.circle(smx + 2 * sc, smY - 38 * sc, 1 * sc).fill({ color: 0x111111 });
      // Carrot nose
      d.poly([smx, smY - 36 * sc, smx + 6 * sc, smY - 35.5 * sc, smx, smY - 35 * sc])
        .fill({ color: 0xe87830 });
      // Stick arms
      d.moveTo(smx - 7.5 * sc, smY - 24 * sc)
        .lineTo(smx - 18 * sc, smY - 30 * sc)
        .stroke({ width: 1.5, color: 0x5a3a18 });
      d.moveTo(smx - 15 * sc, smY - 28 * sc)
        .lineTo(smx - 18 * sc, smY - 33 * sc)
        .stroke({ width: 1, color: 0x5a3a18 });
      d.moveTo(smx + 7.5 * sc, smY - 24 * sc)
        .lineTo(smx + 18 * sc, smY - 30 * sc)
        .stroke({ width: 1.5, color: 0x5a3a18 });
      d.moveTo(smx + 15 * sc, smY - 28 * sc)
        .lineTo(smx + 20 * sc, smY - 33 * sc)
        .stroke({ width: 1, color: 0x5a3a18 });
      // Buttons
      d.circle(smx, smY - 21 * sc, 1 * sc).fill({ color: 0x111111 });
      d.circle(smx, smY - 25 * sc, 1 * sc).fill({ color: 0x111111 });
      smx += 800 + endlessGroundRandom() * 1200;
    }
  }

  // Campfires with warm glow (night only)
  if (weather === 'night') {
    _endlessGroundSeed = 99222;
    let cfx = 200;
    while (cfx < w) {
      const cfY = terrainTopY(cfx);
      const sc = 0.8 + endlessGroundRandom() * 0.4;
      // Stone ring
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const rx = cfx + Math.cos(angle) * 8 * sc;
        const ry = cfY - 2 + Math.sin(angle) * 3 * sc;
        d.circle(rx, ry, 2 * sc).fill({ color: 0x5a5a5a });
        d.circle(rx - 0.5, ry - 0.5, 1 * sc).fill({ color: 0x7a7a7a, alpha: 0.4 });
      }
      // Logs
      d.roundRect(cfx - 6 * sc, cfY - 3 * sc, 12 * sc, 3 * sc, 1)
        .fill({ color: 0x3a2210 });
      d.roundRect(cfx - 4 * sc, cfY - 5 * sc, 10 * sc, 3 * sc, 1)
        .fill({ color: 0x4a3018, alpha: 0.8 });
      // Fire — layered triangles/circles for flame shape
      d.poly([cfx - 5 * sc, cfY - 4 * sc, cfx, cfY - 18 * sc, cfx + 5 * sc, cfY - 4 * sc])
        .fill({ color: 0xff4400, alpha: 0.8 });
      d.poly([cfx - 3 * sc, cfY - 5 * sc, cfx + 1 * sc, cfY - 15 * sc, cfx + 4 * sc, cfY - 5 * sc])
        .fill({ color: 0xff8800, alpha: 0.85 });
      d.poly([cfx - 2 * sc, cfY - 5 * sc, cfx, cfY - 12 * sc, cfx + 2 * sc, cfY - 5 * sc])
        .fill({ color: 0xffcc22, alpha: 0.9 });
      // Inner bright core
      d.circle(cfx, cfY - 8 * sc, 2.5 * sc).fill({ color: 0xffeeaa, alpha: 0.7 });
      // Ground glow — warm circle of light on the ground
      d.circle(cfx, cfY, 30 * sc).fill({ color: 0xff8833, alpha: 0.06 });
      d.circle(cfx, cfY, 18 * sc).fill({ color: 0xffaa44, alpha: 0.08 });
      cfx += 600 + endlessGroundRandom() * 1000;
    }
  }

  // Lanterns on posts (night only)
  if (weather === 'night') {
    _endlessGroundSeed = 99333;
    let lnx = 500;
    while (lnx < w) {
      const lnY = terrainTopY(lnx);
      const sc = 0.8 + endlessGroundRandom() * 0.3;
      // Post
      d.rect(lnx - 1.5 * sc, lnY - 28 * sc, 3 * sc, 28 * sc)
        .fill({ color: 0x4a3a2a });
      // Lantern body — glass housing
      d.roundRect(lnx - 4 * sc, lnY - 34 * sc, 8 * sc, 8 * sc, 2)
        .fill({ color: 0x222222 });
      // Light inside
      d.roundRect(lnx - 3 * sc, lnY - 33 * sc, 6 * sc, 6 * sc, 1.5)
        .fill({ color: 0xffcc44, alpha: 0.85 });
      d.circle(lnx, lnY - 30 * sc, 2 * sc)
        .fill({ color: 0xffeedd, alpha: 0.7 });
      // Top cap
      d.rect(lnx - 5 * sc, lnY - 35 * sc, 10 * sc, 2 * sc)
        .fill({ color: 0x333333 });
      // Ground glow
      d.circle(lnx, lnY, 22 * sc).fill({ color: 0xffaa33, alpha: 0.05 });
      d.circle(lnx, lnY, 12 * sc).fill({ color: 0xffcc44, alpha: 0.07 });
      lnx += 900 + endlessGroundRandom() * 1400;
    }
  }

  endlessGroundDecor.addChild(d);
}

endlessGround = new PIXI.Graphics();
endlessGround.position.set(0, app.screen.height - endlessGroundHeight);
endlessGround.zIndex = 5;
endlessGroundDecor = new PIXI.Container();
endlessGroundDecor.position.set(0, app.screen.height - endlessGroundHeight);
endlessGroundDecor.zIndex = 6;
const initialWeather = getWeatherType();
drawEndlessGround(initialWeather);
endlessGroundCurrentWeather = initialWeather;
foreground.visible = false;

const skyGradients = {
  sun:   { top: 0x3388CC, bottom: 0x99CCEE, starsAlpha: 0.0,  mountain: 0xFFFFFF, cloud: 0xFFFFFF },
  night: { top: 0x0a0a2a, bottom: 0x1a1a3a, starsAlpha: 1.0,  mountain: 0x3a3a5a, cloud: 0x4a4a6a },
  rain:  { top: 0x4a5a6a, bottom: 0x7a8a9a, starsAlpha: 0.0,  mountain: 0x7a8a9a, cloud: 0x8a8a9a },
  wind:  { top: 0x6699BB, bottom: 0xAADDFF, starsAlpha: 0.05, mountain: 0xccddee, cloud: 0xeef4ff },
  snow:  { top: 0x8899AA, bottom: 0xCCDDEE, starsAlpha: 0.08, mountain: 0xb8c8d8, cloud: 0xd8e4f0 },
};

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function drawSkyGradient(gfx, topColor, bottomColor, width, height) {
  gfx.clear();
  const BANDS = 32;
  const bandHeight = Math.ceil(height / BANDS);
  for (let i = 0; i < BANDS; i++) {
    const t = i / (BANDS - 1);
    const color = lerpColor(topColor, bottomColor, t);
    gfx.rect(0, i * bandHeight, width, bandHeight + 1).fill({ color });
  }
}

function transitionWeather(newWeather) {
  const app = state.app;
  if (!app) return;

  // Force-complete any existing transition
  if (state.biomeTransition) {
    const t = state.biomeTransition;
    if (t.oldWeather && t.oldWeather.parent) { app.stage.removeChild(t.oldWeather); t.oldWeather.destroy({ children: true }); }
    if (t.oldGround && t.oldGround.parent) { app.stage.removeChild(t.oldGround); t.oldGround.destroy({ children: true }); }
    if (t.oldGroundDecor && t.oldGroundDecor.parent) { app.stage.removeChild(t.oldGroundDecor); t.oldGroundDecor.destroy({ children: true }); }
    for (const o of (t.oldOverlays || [])) { if (o && o.parent) { app.stage.removeChild(o); o.destroy({ children: true }); } }
    if (t.newWeather) t.newWeather.alpha = 1;
    if (t.newSunLight) t.newSunLight.alpha = t.targetSunLightAlpha;
    if (t.newNightOverlay) t.newNightOverlay.alpha = t.targetNightAlpha;
    if (t.newPlayerShadow) t.newPlayerShadow.alpha = t.targetPlayerShadowAlpha;
    if (t.newFireGlows) t.newFireGlows.alpha = t.targetFireGlowsAlpha;
    currentSkyTop = t.newSkyTop;
    currentSkyBottom = t.newSkyBottom;
    drawSkyGradient(background, currentSkyTop, currentSkyBottom, app.screen.width, app.screen.height);
    persistentStars.alpha = t.newStarsAlpha;
    mountain1.tint = t.newMtnTint; mountain2.tint = t.newMtnTint;
    mountain3.tint = t.newMtnTint; mountain4.tint = t.newMtnTint;
    if (t.newCloudTint !== undefined) { clouds.tint = t.newCloudTint; clouds2.tint = t.newCloudTint; }
    state.biomeTransition = null;
  }

  // Save old elements
  const oldWeather = weatherContainer;
  const oldGround = endlessGround;
  const oldGroundDecor = endlessGroundDecor;
  const oldOverlays = [sunLightOverlay, nightOverlay, playerShadow, nightFireGlows];
  const oldSkyTop = currentSkyTop;
  const oldSkyBottom = currentSkyBottom;
  const oldStarsAlpha = persistentStars.alpha;
  const oldMtnTint = mountain1.tint ?? 0xFFFFFF;
  const oldCloudTint = clouds.tint ?? 0xFFFFFF;

  // Create new ground on top — no masks, just alpha crossfade
  const newGround = new PIXI.Graphics();
  newGround.position.set(0, app.screen.height - endlessGroundHeight);
  newGround.zIndex = 5;
  newGround.alpha = 0;
  app.stage.addChild(newGround);

  const newGroundDecor = new PIXI.Container();
  newGroundDecor.position.set(0, app.screen.height - endlessGroundHeight);
  newGroundDecor.zIndex = 6;
  newGroundDecor.alpha = 0;
  app.stage.addChild(newGroundDecor);

  // Draw new biome ground
  endlessGround = newGround;
  endlessGroundDecor = newGroundDecor;
  drawEndlessGround(newWeather);
  endlessGroundCurrentWeather = newWeather;

  // Capture old sun/moon BEFORE creating new effects (createWeatherEffects resets them)
  const oldWasSun = !!weatherSun;
  const oldSun = weatherSun;
  const oldWasMoon = !!weatherMoon;
  const oldMoon = weatherMoon;

  // Detach old overlays so createWeatherEffects makes fresh ones
  sunLightOverlay = null;
  nightOverlay = null;
  playerShadow = null;
  nightFireGlows = null;
  weatherContainer = null;

  // Create new weather at alpha 0
  createWeatherEffects();
  if (weatherContainer) weatherContainer.alpha = 0;
  if (sunLightOverlay) sunLightOverlay.alpha = 0;
  if (nightOverlay) nightOverlay.alpha = 0;
  if (playerShadow) playerShadow.alpha = 0;
  if (nightFireGlows) nightFireGlows.alpha = 0;

  const targetNightAlpha = nightOverlay ? 0.35 : 0;
  const targetSunLightAlpha = sunLightOverlay ? 0.12 : 0;
  const targetPlayerShadowAlpha = playerShadow ? 0.5 : 0;
  const targetFireGlowsAlpha = nightFireGlows ? 1 : 0;
  const newGrad = skyGradients[newWeather] || skyGradients.sun;

  updateWeatherIcon();

  state.biomeTransition = {
    oldWeather, oldGround, oldGroundDecor, oldOverlays,
    oldWasSun, oldSun, oldWasMoon, oldMoon,
    progress: 0,
    newWeather: weatherContainer,
    newSunLight: sunLightOverlay,
    newNightOverlay: nightOverlay,
    newPlayerShadow: playerShadow,
    newFireGlows: nightFireGlows,
    newGround, newGroundDecor,
    targetNightAlpha, targetSunLightAlpha, targetPlayerShadowAlpha,
    targetFireGlowsAlpha,
    oldSkyTop, oldSkyBottom, oldStarsAlpha,
    newSkyTop: newGrad.top, newSkyBottom: newGrad.bottom, newStarsAlpha: newGrad.starsAlpha,
    oldMtnTint, newMtnTint: newGrad.mountain,
    oldCloudTint, newCloudTint: newGrad.cloud,
  };
}

function updateBiomeTransition() {
  const t = state.biomeTransition;
  if (!t) return;

  // Simple time-based crossfade (~3s at 60fps)
  t.progress += 0.002;
  const p = Math.min(1, t.progress);

  // Lerp sky gradient + mountain tints
  currentSkyTop = lerpColor(t.oldSkyTop, t.newSkyTop, p);
  currentSkyBottom = lerpColor(t.oldSkyBottom, t.newSkyBottom, p);
  drawSkyGradient(background, currentSkyTop, currentSkyBottom, app.screen.width, app.screen.height);
  persistentStars.alpha = t.oldStarsAlpha + (t.newStarsAlpha - t.oldStarsAlpha) * p;
  const mtnTint = lerpColor(t.oldMtnTint, t.newMtnTint, p);
  mountain1.tint = mtnTint;
  mountain2.tint = mtnTint;
  mountain3.tint = mtnTint;
  mountain4.tint = mtnTint;
  const cloudTint = lerpColor(t.oldCloudTint, t.newCloudTint, p);
  clouds.tint = cloudTint;
  clouds2.tint = cloudTint;

  // Staggered crossfade ground — new appears before old fades, preventing ghosting
  if (t.oldGround) t.oldGround.alpha = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.5);
  if (t.oldGroundDecor) t.oldGroundDecor.alpha = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.5);
  if (t.newGround) t.newGround.alpha = p < 0.1 ? 0 : Math.min(1, (p - 0.1) / 0.5);
  if (t.newGroundDecor) t.newGroundDecor.alpha = p < 0.1 ? 0 : Math.min(1, (p - 0.1) / 0.5);

  // Transition old weather out
  if (t.oldWeather) {
    // Keep old weather container tracking the camera
    t.oldWeather.position.set(-app.stage.x, -app.stage.y);

    if (t.oldWasSun && t.oldSun) {
      // Sun: sink behind the ground naturally (foreground occludes it at zIndex 5)
      const w = app.screen.width;
      const h = app.screen.height;
      // Continue the sun's arc — advance elapsed time so it keeps moving
      if (t.sunSinkStart === undefined) {
        t.sunSinkStart = Date.now();
        t.sunBaseElapsed = Date.now() - t.oldSun.startTime - (t.oldSun.totalPaused || 0);
      }
      const sinkElapsed = t.sunBaseElapsed + (Date.now() - t.sunSinkStart) * 1.5; // 1.5x speed for snappy sink
      const progress = sinkElapsed / 60000;
      const parallaxX = app.stage.x * 0.04;
      const parallaxY = app.stage.y * 0.02;
      const arcX = w * 0.1 + Math.min(progress, 1.3) * w * 0.8 + parallaxX;
      const arcY = h * 0.7 - Math.sin(progress * Math.PI) * h * 0.55 + parallaxY;
      t.oldSun.position.set(arcX, arcY);
      t.oldSun.rotation = sinkElapsed * 0.0003;
      // Fade out as sun approaches ground line
      const sinkGroundY = h * 0.6;
      t.oldSun.alpha = arcY < sinkGroundY - 60 ? 1 : Math.max(0, 1 - (arcY - (sinkGroundY - 60)) / 80);
      t.oldWeather.alpha = 1;
    } else if (t.oldWasMoon && t.oldMoon) {
      // Moon: sink behind the ground the same way
      const w = app.screen.width;
      const h = app.screen.height;
      if (t.moonSinkStart === undefined) {
        t.moonSinkStart = Date.now();
        t.moonBaseElapsed = Date.now() - t.oldMoon.startTime - (t.oldMoon.totalPaused || 0);
      }
      const sinkElapsed = t.moonBaseElapsed + (Date.now() - t.moonSinkStart) * 1.5;
      const progress = sinkElapsed / 60000;
      const parallaxX = app.stage.x * 0.04;
      const parallaxY = app.stage.y * 0.02;
      const arcX = w * 0.9 - Math.min(progress, 1.3) * w * 0.8 + parallaxX;
      const arcY = h * 0.7 - Math.sin(progress * Math.PI) * h * 0.55 + parallaxY;
      t.oldMoon.position.set(arcX, arcY);
      // Fade out as moon approaches ground line
      const moonSinkGroundY = h * 0.6;
      t.oldMoon.alpha = arcY < moonSinkGroundY - 60 ? 1 : Math.max(0, 1 - (arcY - (moonSinkGroundY - 60)) / 80);
      t.oldWeather.alpha = 1;
    } else {
      t.oldWeather.alpha = 1 - p;
    }
  }
  for (const o of (t.oldOverlays || [])) {
    if (o && o.parent) o.alpha *= (1 - p * 0.05);
  }

  // Crossfade new weather/overlays in
  if (t.newWeather) t.newWeather.alpha = p;
  if (t.newSunLight) t.newSunLight.alpha = t.targetSunLightAlpha * p;
  if (t.newNightOverlay) t.newNightOverlay.alpha = t.targetNightAlpha * p;
  if (t.newPlayerShadow) t.newPlayerShadow.alpha = t.targetPlayerShadowAlpha * p;
  if (t.newFireGlows) t.newFireGlows.alpha = t.targetFireGlowsAlpha * p;

  if (p >= 1) {
    // Destroy old elements
    if (t.oldWeather && t.oldWeather.parent) { state.app.stage.removeChild(t.oldWeather); t.oldWeather.destroy({ children: true }); }
    if (t.oldGround && t.oldGround.parent) { state.app.stage.removeChild(t.oldGround); t.oldGround.destroy({ children: true }); }
    if (t.oldGroundDecor && t.oldGroundDecor.parent) { state.app.stage.removeChild(t.oldGroundDecor); t.oldGroundDecor.destroy({ children: true }); }
    for (const o of (t.oldOverlays || [])) { if (o && o.parent) { state.app.stage.removeChild(o); o.destroy({ children: true }); } }
    state.biomeTransition = null;
  }
}

const frogGhostTextures = textures.frog_ghost;
state.frogGhostPlayer = new PIXI.Sprite(frogGhostTextures);

state.frogGhostPlayer.anchor.set(0, 0);
state.frogGhostPlayer.scale.set(0.28);

      const mountain1 = createMountainGraphics(1, -100, mountainVelocity1, foreground, 0);
      const mountain2 = createMountainGraphics(2, app.screen.width * 3.0, mountainVelocity2, foreground, 0);
      const mountain3 = createMountainGraphics(2, app.screen.width * 1.5, mountainVelocity3, foreground, 0.7);
      const mountain4 = createMountainGraphics(1, app.screen.width * 4.5, mountainVelocity4, foreground, 0.85);

      // Store base positions and parallax factors for camera-based parallax
      mountain4.baseX = mountain4.position.x; mountain4.parallaxFactor = 0.05;
      mountain3.baseX = mountain3.position.x; mountain3.parallaxFactor = 0.10;
      mountain1.baseX = mountain1.position.x; mountain1.parallaxFactor = 0.20;
      mountain2.baseX = mountain2.position.x; mountain2.parallaxFactor = 0.30;

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

      function drawMountainType1(g, w, h, depth) {
        const haze = 0x8899aa;
        const d = depth || 0;
        function dc(c, a) { return { color: d > 0 ? lerpColor(c, haze, d * 0.45) : c, alpha: a }; }

        // Peak off-center for asymmetry
        const px = w * 0.43;

        // Layer 1: Base silhouette — concave lower slopes, shoulder ridges, natural shape
        g.moveTo(0, 0);
        // Left base: concave flare outward, then steepens
        g.bezierCurveTo(w * 0.02, -h * 0.01, w * 0.06, -h * 0.05, w * 0.10, -h * 0.14);
        // Left lower slope with a subtle shoulder/ridge bump
        g.bezierCurveTo(w * 0.14, -h * 0.26, w * 0.16, -h * 0.32, w * 0.20, -h * 0.38);
        g.bezierCurveTo(w * 0.22, -h * 0.42, w * 0.23, -h * 0.40, w * 0.25, -h * 0.46);
        // Left upper slope steepens to peak
        g.bezierCurveTo(w * 0.30, -h * 0.60, w * 0.36, -h * 0.82, px, -h);
        // Right slope: steeper near peak, then a ridge shoulder, then concave base
        g.bezierCurveTo(w * 0.50, -h * 0.92, w * 0.55, -h * 0.78, w * 0.60, -h * 0.62);
        // Right shoulder bump
        g.bezierCurveTo(w * 0.63, -h * 0.54, w * 0.65, -h * 0.52, w * 0.68, -h * 0.46);
        g.bezierCurveTo(w * 0.72, -h * 0.36, w * 0.76, -h * 0.28, w * 0.82, -h * 0.18);
        // Right concave base flare
        g.bezierCurveTo(w * 0.88, -h * 0.10, w * 0.94, -h * 0.03, w, 0);
        g.lineTo(0, 0);
        g.closePath();
        g.fill(dc(0x5a6678, 1.0));

        // Layer 2: Shadow — gradient-like darker face on the right, following the slope
        g.moveTo(px, -h);
        g.bezierCurveTo(w * 0.50, -h * 0.92, w * 0.55, -h * 0.78, w * 0.60, -h * 0.62);
        g.bezierCurveTo(w * 0.63, -h * 0.54, w * 0.65, -h * 0.52, w * 0.68, -h * 0.46);
        g.bezierCurveTo(w * 0.72, -h * 0.36, w * 0.76, -h * 0.28, w * 0.82, -h * 0.18);
        g.bezierCurveTo(w * 0.88, -h * 0.10, w * 0.94, -h * 0.03, w, 0);
        g.lineTo(w * 0.55, 0);
        g.closePath();
        g.fill(dc(0x3d4a58, 0.4));

        // Layer 3: Snow cap with jagged/irregular bottom edge
        // Left and right edges trace the silhouette; bottom is a zigzag
        g.moveTo(w * 0.31, -h * 0.64);
        // Left edge up — matches silhouette bezier
        g.bezierCurveTo(w * 0.34, -h * 0.74, w * 0.38, -h * 0.88, px, -h);
        // Right edge down — matches silhouette bezier
        g.bezierCurveTo(w * 0.48, -h * 0.94, w * 0.52, -h * 0.82, w * 0.57, -h * 0.68);
        // Jagged snow bottom edge — series of small line segments
        g.lineTo(w * 0.54, -h * 0.66);
        g.lineTo(w * 0.51, -h * 0.70);
        g.lineTo(w * 0.48, -h * 0.65);
        g.lineTo(w * 0.45, -h * 0.68);
        g.lineTo(w * 0.42, -h * 0.63);
        g.lineTo(w * 0.39, -h * 0.67);
        g.lineTo(w * 0.36, -h * 0.62);
        g.lineTo(w * 0.33, -h * 0.66);
        g.lineTo(w * 0.31, -h * 0.64);
        g.closePath();
        g.fill(dc(0xdce1e8, 0.9));

        // Layer 4: Snow shadow — subtle darker tint on the right half of snow
        g.moveTo(px, -h);
        g.bezierCurveTo(w * 0.48, -h * 0.94, w * 0.52, -h * 0.82, w * 0.57, -h * 0.68);
        g.lineTo(w * 0.54, -h * 0.66);
        g.lineTo(w * 0.51, -h * 0.70);
        g.lineTo(w * 0.48, -h * 0.65);
        g.lineTo(px, -h * 0.68);
        g.lineTo(px, -h);
        g.closePath();
        g.fill(dc(0xb8c0cc, 0.2));

        // Layer 5: Base atmospheric haze
        g.moveTo(0, 0);
        g.lineTo(w, 0);
        g.lineTo(w, -h * 0.1);
        g.bezierCurveTo(w * 0.7, -h * 0.12, w * 0.3, -h * 0.12, 0, -h * 0.1);
        g.closePath();
        g.fill(dc(0x8899aa, 0.15));
      }

      function drawMountainType2(g, w, h, depth) {
        const haze = 0x8899aa;
        const d = depth || 0;
        function dc(c, a) { return { color: d > 0 ? lerpColor(c, haze, d * 0.45) : c, alpha: a }; }

        // Three peaks at different heights for natural range look
        const lpx = w * 0.22, lpy = -h * 0.62;
        const cpx = w * 0.47, cpy = -h;
        const rpx = w * 0.75, rpy = -h * 0.55;

        // Layer 1: Base silhouette — organic ridgeline with concave bases
        g.moveTo(0, 0);
        // Left concave base flare up to lower left slope
        g.bezierCurveTo(w * 0.02, -h * 0.02, w * 0.06, -h * 0.08, w * 0.10, -h * 0.20);
        // Left slope up — curves inward as it steepens
        g.bezierCurveTo(w * 0.14, -h * 0.36, w * 0.18, -h * 0.52, lpx, lpy);
        // Left peak to saddle — dip down with rocky ridge
        g.bezierCurveTo(w * 0.25, -h * 0.56, w * 0.27, -h * 0.44, w * 0.29, -h * 0.40);
        g.bezierCurveTo(w * 0.30, -h * 0.38, w * 0.31, -h * 0.36, w * 0.33, -h * 0.38);
        // Rise to center peak — steepening curve
        g.bezierCurveTo(w * 0.36, -h * 0.50, w * 0.40, -h * 0.76, cpx, cpy);
        // Center peak down — steep, then a small spur ridge
        g.bezierCurveTo(w * 0.52, -h * 0.88, w * 0.56, -h * 0.68, w * 0.60, -h * 0.52);
        g.bezierCurveTo(w * 0.62, -h * 0.44, w * 0.64, -h * 0.38, w * 0.66, -h * 0.34);
        // Saddle to right peak
        g.bezierCurveTo(w * 0.68, -h * 0.32, w * 0.69, -h * 0.34, w * 0.71, -h * 0.40);
        g.bezierCurveTo(w * 0.73, -h * 0.48, w * 0.74, -h * 0.52, rpx, rpy);
        // Right peak down — concave flare to base
        g.bezierCurveTo(w * 0.78, -h * 0.46, w * 0.82, -h * 0.32, w * 0.86, -h * 0.20);
        g.bezierCurveTo(w * 0.90, -h * 0.12, w * 0.95, -h * 0.04, w, 0);
        g.lineTo(0, 0);
        g.closePath();
        g.fill(dc(0x5a6678, 1.0));

        // Layer 2: Shadow on right faces of each peak (softer, offset from center)
        g.moveTo(cpx, cpy);
        g.bezierCurveTo(w * 0.52, -h * 0.88, w * 0.56, -h * 0.68, w * 0.60, -h * 0.52);
        g.bezierCurveTo(w * 0.62, -h * 0.44, w * 0.64, -h * 0.38, w * 0.66, -h * 0.34);
        g.bezierCurveTo(w * 0.68, -h * 0.32, w * 0.69, -h * 0.34, w * 0.71, -h * 0.40);
        g.bezierCurveTo(w * 0.73, -h * 0.48, w * 0.74, -h * 0.52, rpx, rpy);
        g.bezierCurveTo(w * 0.78, -h * 0.46, w * 0.82, -h * 0.32, w * 0.86, -h * 0.20);
        g.bezierCurveTo(w * 0.90, -h * 0.12, w * 0.95, -h * 0.04, w, 0);
        g.lineTo(w * 0.52, 0);
        g.closePath();
        g.fill(dc(0x3d4a58, 0.35));

        // Layer 3: Snow cap (center peak) — jagged bottom edge
        g.moveTo(w * 0.39, -h * 0.72);
        g.bezierCurveTo(w * 0.41, -h * 0.82, w * 0.44, -h * 0.92, cpx, cpy);
        g.bezierCurveTo(w * 0.51, -h * 0.92, w * 0.54, -h * 0.80, w * 0.57, -h * 0.70);
        // Jagged snow bottom
        g.lineTo(w * 0.55, -h * 0.68);
        g.lineTo(w * 0.52, -h * 0.72);
        g.lineTo(w * 0.50, -h * 0.67);
        g.lineTo(w * 0.47, -h * 0.71);
        g.lineTo(w * 0.44, -h * 0.66);
        g.lineTo(w * 0.42, -h * 0.70);
        g.lineTo(w * 0.39, -h * 0.72);
        g.closePath();
        g.fill(dc(0xdce1e8, 0.85));

        // Layer 4: Snow cap (left peak) — small jagged cap
        g.moveTo(w * 0.19, -h * 0.52);
        g.bezierCurveTo(w * 0.20, -h * 0.56, w * 0.21, -h * 0.60, lpx, lpy);
        g.bezierCurveTo(w * 0.23, -h * 0.60, w * 0.24, -h * 0.55, w * 0.26, -h * 0.52);
        g.lineTo(w * 0.24, -h * 0.50);
        g.lineTo(w * 0.22, -h * 0.52);
        g.lineTo(w * 0.20, -h * 0.50);
        g.lineTo(w * 0.19, -h * 0.52);
        g.closePath();
        g.fill(dc(0xdce1e8, 0.7));

        // Layer 5: Snow cap (right peak) — small jagged cap
        g.moveTo(w * 0.72, -h * 0.46);
        g.bezierCurveTo(w * 0.73, -h * 0.50, w * 0.74, -h * 0.53, rpx, rpy);
        g.bezierCurveTo(w * 0.76, -h * 0.53, w * 0.77, -h * 0.49, w * 0.79, -h * 0.46);
        g.lineTo(w * 0.77, -h * 0.44);
        g.lineTo(w * 0.75, -h * 0.46);
        g.lineTo(w * 0.73, -h * 0.44);
        g.lineTo(w * 0.72, -h * 0.46);
        g.closePath();
        g.fill(dc(0xdce1e8, 0.65));

        // Layer 6: Base atmospheric haze
        g.moveTo(0, 0);
        g.lineTo(w, 0);
        g.lineTo(w, -h * 0.08);
        g.bezierCurveTo(w * 0.7, -h * 0.1, w * 0.3, -h * 0.1, 0, -h * 0.08);
        g.closePath();
        g.fill(dc(0x8899aa, 0.12));
      }

      function createMountainGraphics(type, xPos, velocity, foreground, depth) {
        const g = new PIXI.Graphics();
        g.eventMode = 'none';
        const w = (type === 1) ? 600 : 1000;
        const h = (type === 1) ? 400 : 350;

        if (type === 1) drawMountainType1(g, w, h, depth || 0);
        else drawMountainType2(g, w, h, depth || 0);

        const scaleFactor = Math.min(
          app.screen.height * 0.6 / h,
          app.screen.width * 1.5 / w
        );
        g.scale.set(scaleFactor);

        const minHeightOffset = foreground ? foreground.height * 0.22 : 0;
        const heightOffsetRatio = (1 - scaleFactor) * 0.3;
        const scaledHeight = h * scaleFactor;
        const foregroundHeightOffset = foreground
          ? minHeightOffset + scaledHeight * heightOffsetRatio : 0;
        g.position.set(xPos, app.screen.height - foregroundHeightOffset);
        g.zIndex = -1;
        g.velocity = velocity;
        return g;
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
      // console.log(hpBarX);
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
      // Clouds are procedural — no textures needed
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
      // Procedural cloud generation
      function drawCloud(g, cw, ch, complexity) {
        // Draw cloud as a single filled path — bumpy top contour, flat bottom
        // This avoids visible individual circle outlines

        // Number of bumps along the top (3-6 based on complexity)
        const bumps = 3 + Math.min(complexity, 3);
        // Pseudo-random offsets based on complexity to vary each cloud
        const seed = complexity * 7.3;
        function prand(i) { return ((Math.sin(seed + i * 13.7) * 43758.5453) % 1 + 1) % 1; }

        // Build the cloud as one continuous path
        // Start at bottom-left
        g.moveTo(-cw * 0.42, ch * 0.05);

        // Left side rise — gentle curve upward
        g.quadraticCurveTo(-cw * 0.44, -ch * 0.15, -cw * 0.32, -ch * 0.25);

        // Top contour — series of arc bumps across the cloud
        for (let i = 0; i < bumps; i++) {
          const t0 = i / bumps;
          const t1 = (i + 1) / bumps;
          // X positions across the cloud width
          const x0 = -cw * 0.32 + t0 * cw * 0.64;
          const x1 = -cw * 0.32 + t1 * cw * 0.64;
          const midX = (x0 + x1) * 0.5;
          // Bump height — center bumps are taller, with pseudo-random variation
          const heightMul = Math.sin((t0 + t1) * 0.5 * Math.PI) * 0.6 + 0.4;
          const randOff = (prand(i) - 0.5) * 0.25;
          const peakY = -ch * (0.35 + heightMul * 0.55 + randOff * 0.3);
          // Draw bump as a quadratic curve through the peak
          g.quadraticCurveTo(midX - cw * 0.03, peakY, midX, peakY + ch * 0.02);
          g.quadraticCurveTo(midX + cw * 0.03, peakY, x1, -ch * 0.25 - prand(i + 3) * ch * 0.1);
        }

        // Right side drop — gentle curve downward
        g.quadraticCurveTo(cw * 0.44, -ch * 0.10, cw * 0.42, ch * 0.05);

        // Flat bottom — nearly straight line back to start
        g.lineTo(-cw * 0.42, ch * 0.05);
        g.closePath();
        g.fill({ color: 0xffffff, alpha: 1.0 });

        // Subtle bottom shading — thin flat ellipse at the base
        g.ellipse(0, ch * 0.04, cw * 0.36, ch * 0.04).fill({ color: 0xe0e4ec, alpha: 0.6 });
      }

      const clouds = new PIXI.Container();
      clouds.eventMode = 'none';
      const clouds2 = new PIXI.Container();
      clouds2.eventMode = 'none';
      const CLOUD_SPREAD = 8000;
      // Layer 1: foreground clouds
      const cloud1Seeds = [0.12, 0.28, 0.42, 0.55, 0.68, 0.82, 0.95];
      for (let i = 0; i < cloud1Seeds.length; i++) {
        const cg = new PIXI.Graphics();
        const cw = 120 + (i % 3) * 40;
        const ch = 40 + (i % 2) * 15;
        drawCloud(cg, cw, ch, 5 + (i % 3));
        cg.position.set(cloud1Seeds[i] * CLOUD_SPREAD, app.screen.height * 0.08 + (i % 3) * 30);
        cg.alpha = 0.85;
        clouds.addChild(cg);
      }
      // Layer 2: background clouds — smaller, translucent
      const cloud2Seeds = [0.05, 0.15, 0.27, 0.38, 0.48, 0.6, 0.72, 0.83, 0.93];
      for (let i = 0; i < cloud2Seeds.length; i++) {
        const cg = new PIXI.Graphics();
        const cw = 70 + (i % 3) * 25;
        const ch = 25 + (i % 2) * 10;
        drawCloud(cg, cw, ch, 4 + (i % 2));
        cg.position.set(cloud2Seeds[i] * CLOUD_SPREAD, app.screen.height * 0.2 + (i % 3) * 25);
        cg.alpha = 0.95;
        clouds2.addChild(cg);
      }
      clouds2.alpha = 0.35;
      // Apply initial cloud tint from weather
      clouds.tint = _initGrad.cloud;
      clouds2.tint = _initGrad.cloud;
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
        console.log('Mouse has left the screen');
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
                return; // Return early if attack was interrupted (paused)
              }
              if (state.isAttackingChar) {
                attackAnimationPlayed = true;
                state.attackSound.volume = state.effectsVolume;
                state.attackSound.play();
                if (attackingChar === "character-bird") {
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

                if (state.gameMode !== 'endless' && critter.position.x > castle.position.x - castle.width / 1.1) {
                  console.log("takingDamage");
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
              critter.play();
            };
            critter.play();
          } else { state.isAttackingChar = false; }
        }
      }

      function handleTouchStart(event) {


        const deleteButton = event.target;

        // Log the event target and its text
        console.log(`Event target: ${deleteButton}`);
        console.log(`Event target text: ${deleteButton.text}`);

        if (deleteButton && deleteButton.text === '🗑️') {
          console.log('Delete button clicked');
          return;
        }
        if (deleteButton.isSlider) {
          console.log('Slider clicked');
          return;
        }
        if ((deleteButton && deleteButton.text === '🔊') || (deleteButton && deleteButton.text === '🔈')) {
          console.log('Sound button clicked');
          return;
        }
        if (deleteButton === backgroundSprite || deleteButton === state.pauseMenuContainer) {
          console.log('Background or Pause menu clicked');
          return;
        }
        if (deleteButton === state.pauseMenuContainer || deleteButton.myCustomID === 'pauseMenuX') {
          console.log('Background or Pause menu clicked');
          return;
        }


        if (state.isPointerDown) {
          state.isPointerDown = false;
          console.log('Mouse has left the screen');
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
        // console.log(isMoving);
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
let unlockAnimSprite = null;
      // Damage function
      function castleExpDrop(damage){
        expToGive = Math.round(damage * 0.75);
        if(cantGainEXP){return;}
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
      function showUnlockText(characterType) {
        const names = {
          'character-snail': '\u{1F40C} Snail',
          'character-bird': '\u{1F99A} Bird',
          'character-bee': '\u{1F41D} Bee'
        };
        const el = document.getElementById('unlock-text');
        el.textContent = names[characterType] + ' Unlocked!';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        setTimeout(() => { el.style.opacity = '0'; }, 2000);
        setTimeout(() => { el.style.visibility = 'hidden'; }, 2500);
      }

      function castleExplode() {
        cantGainEXP = true;
        state.currentRound++;
        updateWeatherIcon();
        // Transition ground biome for the new round
        const newWeather = getWeatherType();
        if (endlessGround && newWeather !== endlessGroundCurrentWeather && !state.biomeTransition) {
          transitionWeather(newWeather);
        } else {
          createWeatherEffects();
        }

        // Check for character unlocks
        const unlocks = { 2: 'character-snail', 5: 'character-bird', 10: 'character-bee' };
        const newChar = unlocks[state.currentRound];
        if (newChar && !state.unlockedCharacters.includes(newChar)) {
          state.unlockedCharacters.push(newChar);

          // Prepare unlock walk-out sprite (added to stage after explosions)
          const unlockTexMap = {
            'character-snail': snailWalkTextures,
            'character-bird': birdWalkTextures,
            'character-bee': beeWalkTextures,
          };
          const texs = unlockTexMap[newChar];
          if (texs) {
            unlockAnimSprite = new PIXI.AnimatedSprite(texs);
            unlockAnimSprite.scale.set(0.05);
            unlockAnimSprite.anchor.set(0.5, 0.5);
            unlockAnimSprite.position.set(
              castle.position.x - castle.width / 2,
              state.stored
            );
            unlockAnimSprite.animationSpeed = 0.2;
            unlockAnimSprite.loop = true;
            unlockAnimSprite.scale.x *= -1; // Face left toward base
            unlockAnimSprite.zIndex = 10000;
            unlockAnimSprite.unlockChar = newChar;
          }
        }

        // Rebuild enemy types for the new round
        buildEnemyTypes();
        setEnemiesInRange(0);
        console.log("enemies has been updated to", getEnemiesInRange())
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
                  // Spawn unlock character walking out of the rubble
                  if (unlockAnimSprite) {
                    app.stage.addChild(unlockAnimSprite);
                    unlockAnimSprite.play();
                    showUnlockText(unlockAnimSprite.unlockChar);
                  }
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

      // Camera-based parallax — update mountain positions each frame
      function updateMountainParallax() {
        const screenW = app.screen.width;
        [mountain1, mountain2, mountain3, mountain4].forEach(m => {
          // Mountains are stage children so screen_x = position.x + stage.x
          // We want screen_x = baseX + stage.x * factor (slower than camera)
          // So position.x = baseX - stage.x * (1 - factor)
          m.position.x = m.baseX - app.stage.x * (1 - m.parallaxFactor);

          // Wrap for endless scrolling: keep mountains cycling within view
          const screenX = m.position.x + app.stage.x;
          const mw = m.width;
          if (screenX + mw < -200) {
            m.baseX += screenW + mw + 400;
          } else if (screenX > screenW + 200 + mw) {
            m.baseX -= screenW + mw + 400;
          }
        });
      }

      // Procedural clouds don't need initialClouds tracking
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
            critter.tint = state.rageActive ? 0xff4444 : 0xffffff;
            state.featherReviveEnd = null;
          }
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
          document.getElementById('endless-kill-count').textContent = state.endlessKillCount;

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

          console.log("TIMERDONE");
          spawnDemi();
          pauseTimer();
        }
        //console.log("HERXOROR:", getEnemiesInRange());
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
          // Stop flashing character portraits
          stopFlashing();

          // Show wipe screen
          setisWiped(true);
          document.getElementById('spawn-text').style.visibility = 'hidden';
          const wipeCharBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
          wipeCharBoxes.forEach((box) => { box.style.visibility = 'hidden'; });
          state.isCharacterMenuOpen = false;

          const wipeEl = document.getElementById('wipe-text');
          const isEndless = state.gameMode === 'endless';
          const score = isEndless ? state.endlessKillCount : state.currentRound;
          const mode = isEndless ? 'endless' : 'story';

          wipeEl.innerHTML = '';
          const wipeTitle = document.createElement('div');
          wipeTitle.className = 'wipe-title';
          wipeTitle.textContent = 'GAME OVER';
          wipeEl.appendChild(wipeTitle);

          const wipeSubtitle = document.createElement('div');
          wipeSubtitle.className = 'wipe-subtitle';
          wipeSubtitle.textContent = isEndless
            ? state.endlessKillCount + ' kills'
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

        //console.log("isatt:", state.isAttackingChar);
        if (state.roundOver) {
          if (getPlayerCurrentHealth() <= 0) {
            document.getElementById('spawn-text').style.visibility = 'visible';
            //document.getElementById("pause-text").style.visibility = "hidden";
          }

          // Camera: match sprite walk speed during unlock, keep panning to 0 during celebration
          const unlockActive = unlockAnimSprite && app.stage.children.includes(unlockAnimSprite);
          const celebrating = unlockActive && unlockAnimSprite.celebrating;
          // Keep panning during celebration until camera reaches 0, then freeze
          const cameraAtTarget = Math.abs(app.stage.x) < 2 && Math.abs(app.stage.y) < 2;
          const cameraSpeed = (celebrating && cameraAtTarget) ? 0 : (unlockActive ? 6 : 6);

          // Calculate the target position (start position, or stay in place for endless)
          const targetX = (state.gameMode === 'endless') ? app.stage.x : 0;
          const targetY = (state.gameMode === 'endless') ? app.stage.y : 0;

          // Calculate the distance between the current position and the target position
          const distanceX = targetX - app.stage.x;
          const distanceY = targetY - app.stage.y;

          // Calculate the movement for this frame
          const movementX = Math.sign(distanceX) * Math.min(Math.abs(distanceX), cameraSpeed) * state.dt;
          const movementY = Math.sign(distanceY) * Math.min(Math.abs(distanceY), cameraSpeed) * state.dt;

          // Update the camera position
          app.stage.x += movementX;
          app.stage.y += movementY;
          updateMountainParallax();

          // Animate unlock character walking out of castle toward player's base
          if (unlockActive) {
            // Stop at the player's starting castle area (x=250), not past it
            const celebrationX = 300;

            if (!unlockAnimSprite.celebrating) {
              // Grow from tiny to full size (squirm out effect)
              const targetScale = 0.35;
              const currentScale = Math.abs(unlockAnimSprite.scale.x);
              if (currentScale < targetScale) {
                const growStep = 0.006;
                const newScale = Math.min(currentScale + growStep, targetScale);
                unlockAnimSprite.scale.set(newScale);
                unlockAnimSprite.scale.x *= -1; // Keep facing left
              }
              // Walk left toward the player's castle
              unlockAnimSprite.position.x -= 6 * state.dt;
              unlockAnimSprite.position.y = state.stored + Math.sin(Date.now() * 0.008) * 3;

              // Reached the player's castle — start celebration!
              if (unlockAnimSprite.position.x <= celebrationX) {
                unlockAnimSprite.celebrating = true;
                unlockAnimSprite.celebrateStart = Date.now();
                unlockAnimSprite.position.x = celebrationX;
                // Snap critter next to the unlock character
                critter.position.x = celebrationX - 70;
                critter.position.y = state.stored;

                // Spawn 🥳 emoji above them
                const partyEmoji = new PIXI.Text('\u{1F973}', { fontSize: 64 });
                partyEmoji.anchor.set(0.5);
                partyEmoji.position.set(celebrationX - 35, state.stored - 80);
                partyEmoji.zIndex = 99999;
                app.stage.addChild(partyEmoji);
                unlockAnimSprite.partyEmoji = partyEmoji;

                // Spawn confetti particles
                const confettiContainer = new PIXI.Container();
                confettiContainer.zIndex = 99998;
                app.stage.addChild(confettiContainer);
                unlockAnimSprite.confettiContainer = confettiContainer;
                const confettiColors = [0xFF4444, 0x44BB44, 0x4488FF, 0xFFDD00, 0xFF88DD, 0xFF8800, 0xAA44FF];
                for (let i = 0; i < 40; i++) {
                  const particle = new PIXI.Graphics();
                  const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
                  const w = 4 + Math.random() * 6;
                  const h = 3 + Math.random() * 5;
                  particle.rect(-w / 2, -h / 2, w, h).fill(color);
                  particle.position.set(
                    celebrationX - 100 + Math.random() * 200,
                    state.stored - 120 - Math.random() * 80
                  );
                  particle.vx = (Math.random() - 0.5) * 3;
                  particle.vy = -2 + Math.random() * 2;
                  particle.gravity = 0.08 + Math.random() * 0.04;
                  particle.spin = (Math.random() - 0.5) * 0.15;
                  particle.drift = (Math.random() - 0.5) * 0.3;
                  confettiContainer.addChild(particle);
                }
              }
            } else {
              // Celebration! Slow bouncy hops + flip direction back and forth
              const elapsed = Date.now() - unlockAnimSprite.celebrateStart;
              const bounce = Math.sin(elapsed * 0.006) * 18;
              unlockAnimSprite.position.y = state.stored - Math.abs(bounce);
              critter.position.y = state.stored - Math.abs(Math.sin((elapsed * 0.006) + Math.PI)) * 18;

              // Flip facing direction each bounce cycle
              const flipCycle = Math.sin(elapsed * 0.006);
              unlockAnimSprite.scale.x = flipCycle > 0 ? -Math.abs(unlockAnimSprite.scale.x) : Math.abs(unlockAnimSprite.scale.x);
              critter.scale.x = flipCycle > 0 ? -Math.abs(critter.scale.x) : Math.abs(critter.scale.x);

              // Animate 🥳 emoji — float up and bob
              if (unlockAnimSprite.partyEmoji) {
                const pe = unlockAnimSprite.partyEmoji;
                pe.position.y -= 0.3 * state.dt;
                pe.rotation = Math.sin(elapsed * 0.005) * 0.2;
                pe.scale.set(1 + Math.sin(elapsed * 0.008) * 0.1);
              }

              // Animate confetti — fall, tumble, drift
              if (unlockAnimSprite.confettiContainer) {
                for (const p of unlockAnimSprite.confettiContainer.children) {
                  p.vy += p.gravity * state.dt;
                  p.vx += p.drift * 0.02 * state.dt;
                  p.position.x += p.vx * state.dt;
                  p.position.y += p.vy * state.dt;
                  p.rotation += p.spin;
                  // Slow down sideways drift for flutter effect
                  p.vx *= 0.995;
                }
              }

              // After 3 seconds, fade out and clean up
              if (elapsed > 3000) {
                // Reset critter facing direction
                critter.scale.x = Math.abs(critter.scale.x);
                unlockAnimSprite.alpha -= 0.04;
                critter.position.y = state.stored; // Reset player position

                // Fade confetti and emoji too
                if (unlockAnimSprite.partyEmoji) unlockAnimSprite.partyEmoji.alpha -= 0.04;
                if (unlockAnimSprite.confettiContainer) unlockAnimSprite.confettiContainer.alpha -= 0.04;

                if (unlockAnimSprite.alpha <= 0) {
                  // Clean up confetti
                  if (unlockAnimSprite.confettiContainer) {
                    app.stage.removeChild(unlockAnimSprite.confettiContainer);
                    unlockAnimSprite.confettiContainer.destroy({ children: true });
                  }
                  // Clean up emoji
                  if (unlockAnimSprite.partyEmoji) {
                    app.stage.removeChild(unlockAnimSprite.partyEmoji);
                    unlockAnimSprite.partyEmoji.destroy();
                  }
                  app.stage.removeChild(unlockAnimSprite);
                  unlockAnimSprite.destroy();
                  unlockAnimSprite = null;
                }
              }
            }
          }

          // Return if the camera has reached the target position
          if (app.stage.x === targetX && app.stage.y === targetY) {

            if (state.currentSnailHealth + state.currentBeeHealth + state.currentBirdHealth + state.currentFrogHealth <= 0) {
              console.log("BANG");
              if (!state.isWiped) {
                setisWiped(true);

                // Hide character selection text
                document.getElementById('spawn-text').style.visibility = 'hidden';

                // Hide character menu boxes
                const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
                characterBoxes.forEach((box) => { box.style.visibility = 'hidden'; });
                state.isCharacterMenuOpen = false;

                const wipeEl = document.getElementById('wipe-text');
                const isEndless = state.gameMode === 'endless';
                const score = isEndless ? state.endlessKillCount : state.currentRound;
                const mode = isEndless ? 'endless' : 'story';

                // Build styled wipe screen
                wipeEl.innerHTML = '';
                const title = document.createElement('div');
                title.className = 'wipe-title';
                title.textContent = 'GAME OVER';
                wipeEl.appendChild(title);

                const subtitle = document.createElement('div');
                subtitle.className = 'wipe-subtitle';
                subtitle.textContent = isEndless
                  ? state.endlessKillCount + ' kills'
                  : 'Round ' + state.currentRound;
                wipeEl.appendChild(subtitle);

                wipeEl.style.visibility = 'visible';

                setTimeout(() => {
                  showScoreSubmitOverlay(mode, score);
                }, 2500);
              }
            }

            if (state.gameMode !== 'endless' && state.exploded && !unlockAnimSprite) {

              mountain1.tint = getRandomColor();
              mountain2.tint = getRandomColor();
              mountain3.tint = getRandomColor3();
              mountain4.tint = getRandomColor3();
              foreground.tint = getRandomColor();
              for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                console.log("hex", i);

                // Remove the enemy and its associated HP bar elements from the PIXI stage
                app.stage.removeChild(enemy);
                app.stage.removeChild(enemy.hpBar);
                app.stage.removeChild(enemy.hpBarBackground);

                // Destroy the enemy object to free up memory
                enemy.destroy();

                // Remove the enemy from the enemies array
                enemies.splice(i, 1);
                i--; // Decrement i to adjust for the removed enemy
              }
              state.exploded = false;
              buildEnemyTypes();
              saveGame();

              cantGainEXP=false;
              resetTimer();
              startTimer();
              app.stage.addChild(castle);
              app.stage.addChild(critter);
app.stage.addChild(hpBarBackground,hpBar);
              console.log("REEEE");
              hasExploded = false;


state.demiSpawned = 0;
            }

            // Don't reset the round while unlock animation is still playing
            if (!unlockAnimSprite) {
            playRoundText(state.currentRound);


            castle.tint = originalTint;
            setCharAttackAnimating(false);
            setIsCharAttacking(false);
            app.stage.removeChild(state.frogGhostPlayer);
            if (state.gameMode === 'endless') {
              critter.position.set(state.endlessDeathX || app.screen.width / 20, state.stored);
            } else {
              critter.position.set(app.screen.width / 20, state.stored);
            }
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
                console.log("SNALIED");
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
                // console.log(i);
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
            } // end unlock animation guard

          }
          return;
        }
        //setisPaused(true);

        if (getCharSwap()) {
          console.log("getcurrentchat", getCurrentCharacter());
          if (getCurrentCharacter() === "character-bird") {
            playerSpawn.tint = 0x0000ff; // Blue
            playerSpawn.blendMode = 'add';
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = birdWalkTextures;
            frogIdleTextures = birdWalkTextures;
            state.frogAttackTextures = birdAttackTextures;

          }
          else if (getCurrentCharacter() === "character-frog") {
            console.log("SWAP TO SNELL");
            playerSpawn.blendMode = 'add';
            playerSpawn.tint = 0x00ff80; // Light green
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = frogWalkTextures1;
            frogIdleTextures = frogIdleTextures1;
            state.frogAttackTextures = frogAttackTextures1;


          }
          else if (getCurrentCharacter() === "character-snail") {
            playerSpawn.blendMode = 'add';
            playerSpawn.tint = 0x800080; // Dark purple

            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = snailWalkTextures;
            frogIdleTextures = snailWalkTextures;
            state.frogAttackTextures = snailAttackTextures;


          }
          else if (getCurrentCharacter() === "character-bee") {
            playerSpawn.tint = 0xffff00; // Yellow

            playerSpawn.blendMode = 'add';
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = beeWalkTextures;
            frogIdleTextures = beeWalkTextures;
            state.frogAttackTextures = beeAttackTextures;


          }
          // Character swap: apply correct textures before showing critter
          critter.textures = state.frogWalkTextures;
          critter.loop = true;
          critter.onComplete = null;  // Clear stale attack callback
          state.isAttackingChar = false;  // Reset attack state (revive dialog click can leave this stuck)
          critter.play();
          updateEXP(getCharEXP(getCurrentCharacter()));
          document.getElementById('spawn-text').style.visibility = 'hidden';
          updateVelocity();
          setCharSwap(false);
          stopFlashing();
          critter.visible = true;
          app.stage.addChild(critter);
          // Ensure health bar reflects the new character (fixes stale bar after dead→alive swap)
          updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
          // Fall through to auto-attack check (no early return)
        }
        // Auto-attack: trigger attack when enemies are in range
        if (state.autoAttack && getEnemiesInRange() > 0 && !state.isAttackingChar && !state.isPointerDown) {
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
            critter.tint = 0xffffff;
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
        if (!state.isAttackingChar) {
          //  console.log("attacking char",state.isAttackingChar);
          if (!getisDead()) {
            //  console.log("not getisdead");
            console.log("getenemiesinrange", getisPaused(), getisDead(), getEnemiesInRange());
            if (!state.isCombat) {
              //   console.log("not iscombat");
              if (!state.isPointerDown) {
                // console.log("not ispointerdown");
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
                    console.log("nope");
                    critter.textures = state.frogWalkTextures;
                    critter.play();
                  }
                  critter.loop = true;
                  updateMountainParallax();
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


          // Only clamp player position in story mode
          if (state.gameMode !== 'endless' && critter.position.x > maxX - 100) {
            critter.position.x = maxX - 100;
          }
          if (state.gameMode !== 'endless' && critter.position.x > 1500) {
            hpBar.visible = true; // Show the HP bar
            hpBarBackground.visible = true;
          } else {
            hpBar.visible = false;
            hpBarBackground.visible = false; // Hide the HP bar
          }

        }

        // Update procedural cloud positions — scroll each child and wrap
        for (const c of clouds.children) {
          c.position.x -= cloudSpeed * state.dt;
          if (c.position.x < -app.stage.x - 300) {
            c.position.x = -app.stage.x + app.screen.width + 200 + Math.random() * 400;
          }
        }
        for (const c of clouds2.children) {
          c.position.x -= cloud2Speed * state.dt;
          if (c.position.x < -app.stage.x - 300) {
            c.position.x = -app.stage.x + app.screen.width + 200 + Math.random() * 400;
          }
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

      // document.getElementById("infoboxs").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
      document.getElementById("infoboxes").style.visibility = "visible";
      document.getElementById("ui-overlay").style.visibility = "visible";
      document.getElementById("pause-button").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
      // Show auto-attack button after loading (endless only)
      if (state.gameMode === 'endless') {
        document.getElementById('auto-attack-btn').style.display = 'flex';
      }
      const weatherIconEl = document.getElementById("weather-icon");
      weatherIconEl.style.visibility = "visible";
      if (state.gameMode !== 'endless') {
        // In story mode, position at the right end of the progress bar
        weatherIconEl.style.position = 'absolute';
        weatherIconEl.style.left = '';
        weatherIconEl.style.right = '-10px';
        weatherIconEl.style.top = '50%';
        weatherIconEl.style.transform = 'translateY(-50%)';
        weatherIconEl.style.zIndex = '4';
        document.getElementById('progress').appendChild(weatherIconEl);
      } else {
        // In endless mode, sit just left of the centered kill counter
        weatherIconEl.style.left = 'calc(50% - 70px)';
      }
      updateWeatherIcon();
      createWeatherEffects();
      document.getElementById("potion-button").style.visibility = "visible";
      document.getElementById("potion-shop").style.visibility = "visible";
      updatePotionUI();
      critter.scale.set(getFrogSize());

      state.stored = app.screen.height - foreground.height / 2.2 - critter.height * .22;
      console.log("STORED", state.stored);
      critter.position.set(app.screen.width / 20, app.screen.height - foreground.height / 2.2 - critter.height * .22);
      updateEXP(getCharEXP(getCurrentCharacter()));
      updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
      // Start the state.timer animation
      if (getPlayerCurrentHealth() <= 0) {


        setisPaused(true);


        // Toggle the visibility of the character info boxes
        const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');

        if (state.isCharacterMenuOpen) {
          characterBoxes.forEach((box) => {
            box.style.visibility = 'hidden';
          });
          state.isCharacterMenuOpen = false;
        } else {
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
          // Evenly center all visible boxes
          if (visibleBoxes.length > 0) {
            const totalWidth = visibleBoxes.length * 60;
            const startOffset = -totalWidth / 2;
            visibleBoxes.forEach((box, i) => {
              box.style.left = 'calc(45% + ' + (startOffset + i * 60) + 'px)';
            });
          }
          state.isCharacterMenuOpen = true;
        }

        // Start the cooldown


      }
      if (state.gameMode === 'endless') {
        app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, endlessGround, endlessGroundDecor, foreground, critter, clouds, clouds2, state.enemyDeath, castlePlayer);
      } else {
        app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, endlessGround, endlessGroundDecor, foreground, castle, critter, clouds, clouds2, hpBarBackground, hpBar, state.enemyDeath, castlePlayer);
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
        castle.position.y = app.screen.height - castle.height * 0.25;
        castlePlayer.position.y = app.screen.height - castle.height * 0.25;
        state.stored = app.screen.height - foreground.height / 2.2 - critter.height * .22;
        critter.position.y = state.stored;

        // Reposition mountains to match new screen height
        [mountain1, mountain2, mountain3, mountain4].forEach(m => {
          const minHeightOffset = foreground ? foreground.height * 0.22 : 0;
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
      resetTimer();
      startTimer();
      spawnEnemies();


    }

  }


  function spawnEnemies() {
    if (state.isSpawning || getisDead() || getisPaused()) {
      return;
    }

    if (state.gameMode === 'endless') {
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
      const elapsed = state.endlessElapsed || 0;
      const currentInterval = Math.max(2000, 12000 - Math.floor(elapsed / 5) * 50);

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

      // Spawn demi boss every 5 kills (use demiSpawned tracking instead of
      // exact % 5 check — kills can jump past a multiple between spawn checks)
      if (state.endlessKillCount >= 5 && state.demiSpawned < Math.floor(state.endlessKillCount / 5)) {
        spawnEnemyDemi(
          critter,
          selectedEnemy.attackTextures,
          selectedEnemy.walkTextures,
          selectedEnemy.name
        );
        state.demiSpawned++;
      } else {
        spawnEnemy(
          critter,
          selectedEnemy.attackTextures,
          selectedEnemy.walkTextures,
          selectedEnemy.name
        );
      }

      state.timeOfLastSpawn = Date.now();

      state.enemySpawnTimeout = setTimeout(() => {
        state.isSpawning = false;
        spawnEnemies();
      }, currentInterval);
      return;
    }

    // Story mode logic below
    if (isTimerFinished()) {
      console.log("TIMERDONE");
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
      critter,
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
      updateWeatherIcon();
      createWeatherEffects();

      // Loop through the enemies array and remove each enemy
      for (let i = 0; i < getEnemies().length; i++) {
        let enemy = getEnemies()[i];
        // console.log(i);
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
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    handleTouchEnd();
  }



// ── Score submission overlay ────────────────────────────────
function showScoreSubmitOverlay(mode, score, fromPause = false) {
  const overlay = document.getElementById('score-submit-overlay');
  const scoreEl = document.getElementById('score-submit-score');
  const nameInput = document.getElementById('score-submit-name');
  const submitBtn = document.getElementById('score-submit-btn');
  const skipBtn = document.getElementById('score-skip-btn');
  const statusEl = document.getElementById('score-submit-status');

  scoreEl.textContent = formatScore(score, mode);
  nameInput.value = getSavedPlayerName();
  statusEl.textContent = '';
  submitBtn.disabled = false;
  overlay.classList.add('visible');

  submitBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name || name.length > 20) {
      statusEl.textContent = 'Enter a name (1-20 chars)';
      return;
    }
    submitBtn.disabled = true;
    statusEl.textContent = 'Submitting...';
    savePlayerName(name);
    const result = await submitScore(name, mode, score);
    if (result.ok) {
      statusEl.textContent = 'Score submitted!';
      if (fromPause) {
        setTimeout(() => overlay.classList.remove('visible'), 1200);
      } else {
        setTimeout(() => location.reload(), 1200);
      }
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'try again');
      submitBtn.disabled = false;
    }
  };

  skipBtn.onclick = () => {
    if (fromPause) {
      overlay.classList.remove('visible');
    } else {
      location.reload();
    }
  };
}

window._crittorsShowPauseScore = function() {
  const mode = state.gameMode;
  const score = mode === 'endless' ? state.endlessKillCount : state.currentRound;
  showScoreSubmitOverlay(mode, score, true);
};

startGame();
state.isGameStarted=true;
  }

});