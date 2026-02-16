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
  createCoffeeDrop,
} from './combat.js';
import { updateEXP } from './upgrades.js';
import { saveGame, loadGame } from './save.js';


document.addEventListener('DOMContentLoaded', function () {
  let appStarted = false;
console.log("PIXIVERSION:",PIXI.VERSION);
  let rotateMessage = document.getElementById('rotateDevice');
  rotateMessage.style.display = "block"; // Always display the new menu

  function startFromMenu(mode) {
    rotateMessage.style.display = 'none';
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
  const menuTexture = await PIXI.Assets.load('./assets/mainmenu.png');
  const menuSprite = new PIXI.Sprite(menuTexture);

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
    { name: 'rain', emoji: '\uD83C\uDF27\uFE0F' },
    { name: 'wind', emoji: '\uD83D\uDCA8' },
    { name: 'snow', emoji: '\u2744\uFE0F' },
    { name: 'night', emoji: '\uD83C\uDF19' },
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
  let moonStars = null;

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
    if (moonStars && state.app) {
      state.app.stage.removeChild(moonStars);
      moonStars.destroy({ children: true });
      moonStars = null;
    }
    weatherSun = null;
    weatherMoon = null;
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

      // Stars container — twinkle behind the moon
      moonStars = new PIXI.Container();
      moonStars.zIndex = 0.3;
      moonStars.eventMode = 'none';
      for (let i = 0; i < 50; i++) {
        const star = new PIXI.Graphics();
        const sz = 0.5 + Math.random() * 1.5;
        star.circle(0, 0, sz).fill({ color: 0xFFFFFF, alpha: 0.3 + Math.random() * 0.5 });
        star.position.set(Math.random() * w, Math.random() * h * 0.6);
        star.twinkleSpeed = 0.02 + Math.random() * 0.04;
        star.twinklePhase = Math.random() * Math.PI * 2;
        star.baseAlpha = star.alpha;
        moonStars.addChild(star);
      }
      app.stage.addChild(moonStars);

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
        drop.position.x += drop.vx;
        drop.position.y += drop.vy;
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
        p.position.x += p.vx;
        p.position.y += p.vy;
        if (p.isLeaf) {
          p.wobble += 0.05;
          p.position.y += Math.sin(p.wobble) * 1.2;
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
        flake.wobblePhase += flake.drift;
        flake.position.x += Math.sin(flake.wobblePhase) * flake.wobbleAmp;
        flake.position.y += flake.vy;
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

      // Star twinkle
      if (moonStars) {
        moonStars.position.set(-app.stage.x, -app.stage.y);
        for (const star of moonStars.children) {
          star.twinklePhase += star.twinkleSpeed;
          star.alpha = star.baseAlpha * (0.5 + Math.sin(star.twinklePhase) * 0.5);
        }
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
    } else if (getCoffee() < 50) {
      shop.classList.add('cant-afford');
    }
  }

  // Shop button — BUY a dose (50 coffee)
  document.getElementById('potion-shop').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const doses = state.potionDoses || 0;
    if (doses >= state.potionMaxDoses) return;
    if (getCoffee() < 50) return;

    addCoffee(-50);
    state.potionDoses = doses + 1;
    updatePotionUI();

    // Fill animation on potion
    const icon = document.getElementById('potion-icon');
    icon.style.transform = 'scale(1.3)';
    icon.style.transition = 'transform 0.2s';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
  });

  // Potion button — USE a dose (heal 50 HP)
  document.getElementById('potion-button').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (getisDead()) return; // Can't heal a dead character
    const doses = state.potionDoses || 0;
    const isHurt = getPlayerCurrentHealth() < getPlayerHealth();
    if (doses <= 0 || !isHurt) return;

    setPlayerCurrentHealth(Math.min(getPlayerCurrentHealth() + 50, getPlayerHealth()));
    updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
    state.potionDoses--;
    updatePotionUI();

    // Gulp gulp feedback
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
        state.endlessStartTime += (Date.now() - state._endlessPauseTime);
        state._endlessPauseTime = null;
      }

      spawnEnemies();
      startTimer();
    }
  }





  var pauseButton = document.getElementById("pause-button");

  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  pauseButton.addEventListener("click", function () {
    if (getisDead() == false) {
      if (getPlayerCurrentHealth() > 0) {
        if(state.roundOver == false){
          
        setisPaused(!getisPaused());
        console.log("PAUSED");
        }
      }

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
  

  function handleCharacterClick(characterType) {
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

    app.stage.addChild(critter);


    document.getElementById('spawn-text').style.visibility = 'hidden';
    state.choose = false;
    if (characterHealth <= 0) {
      createReviveDialog(characterType);
      return;
    }
    stopFlashing();


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

    setCurrentCharacter(characterType);

    // Swap positions of the current character box and the previously selected character box
    if (state.selectedCharacter !== characterType) {
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
      updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
      characterLevelElement.textContent = 'Lvl. ' + level;

      const currentCharacterBox = document.querySelector('.upgrade-box.' + state.selectedCharacter);
      const prevCharacterBox = document.querySelector('.upgrade-box.' + characterType);
      const tempPosition = { ...state.characterPositions[state.selectedCharacter] };

      currentCharacterBox.style.top = state.characterPositions[characterType].top;
      currentCharacterBox.style.left = state.characterPositions[characterType].left;
      state.characterPositions[state.selectedCharacter] = state.characterPositions[characterType];
      state.characterPositions[characterType] = tempPosition;

      previousCharacter = state.selectedCharacter;
      state.selectedCharacter = characterType;
    } else {
      previousCharacter = ""; // Set previousCharacter to an empty string if the same character is selected again
    }

    updateCharacterStats(); // Update the stats for the new character
  }


  function createReviveDialog(characterType) {
    if (state.reviveDialogContainer && app.stage.children.includes(state.reviveDialogContainer)) {
      return;
    }
  
    state.reviveDialogContainer = new PIXI.Container();
    state.reviveDialogContainer.zIndex = 999999;

    // Create a semi-transparent black background sprite for the dialog box
    backgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    backgroundSprite.width = app.screen.width * 0.6;
    backgroundSprite.height = app.screen.height / 2;
    backgroundSprite.tint = 0x000000; // Black color
    backgroundSprite.alpha = 0.5; // Make it semi-transparent
    state.reviveDialogContainer.addChild(backgroundSprite);
  
    // Create a brown border around the background
    const border = new PIXI.Graphics();
    border.rect(0, 0, backgroundSprite.width, backgroundSprite.height).stroke({ width: 4, color: 0x8B4513 });
    state.reviveDialogContainer.addChild(border);
  
    // Create the text for the dialog box
    const characterName = getCharacterName(characterType);

    const reviveText2 = `Spend 50 to revive ${characterName}?`;
  
    const textStyle = getTextStyle( backgroundSprite.width );
  
    const text = new PIXI.Text(reviveText2, textStyle);
    text.anchor.set(.5);
    text.position.set(backgroundSprite.width / 2, backgroundSprite.height * 0.25);
  
  
  
    // Add state.coffee bean image
    let beanSprite = new PIXI.Sprite(PIXI.Assets.get('bean'))
    beanSprite.anchor.set(0.5);
    beanSprite.scale.set(0.85);
    beanSprite.position.set(text.position.x - text.width / 5.5, text.position.y);
    
    state.reviveDialogContainer.addChild(beanSprite);
    state.reviveDialogContainer.addChild(text);
  
    // Create the 'Yes' button with emoji
    const playerCoins = getCoffee(); // Assuming getCoffee() is the function that returns the player's current coin amount
    const yesButtonStyle = new PIXI.TextStyle({
      fontSize: app.screen.width * 0.26,
      fill: playerCoins >= 50 ? '#008000' : '#808080',
      backgroundColor: '#000000',
      fontFamily: 'Marker Felt',
      stroke: '#000000',
      strokeThickness: -6,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 2,
      wordWrap: true,
      wordWrapWidth: app.screen.width / 3,
    });
  
    const yesButton = new PIXI.Text('☑', yesButtonStyle);
    yesButton.anchor.set(0.5);
    yesButton.position.set(backgroundSprite.width * 0.3, backgroundSprite.height * 0.75);
    state.reviveDialogContainer.addChild(yesButton);
  
    // Create the 'No' button with emoji and red tint
    const noButtonStyle = new PIXI.TextStyle({
      fontSize: app.screen.width * 0.26,
      fill: '#FF0000',
      backgroundColor: '#000000',
      fontFamily: 'Marker Felt',
      stroke: '#000000',
      strokeThickness: -6,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 2,
      wordWrap: true,
      wordWrapWidth: app.screen.width / 3,
    });
  
    const noButton = new PIXI.Text('☒', noButtonStyle);
    noButton.anchor.set(0.5);
    noButton.position.set(backgroundSprite.width * 0.7, backgroundSprite.height * 0.75);
    state.reviveDialogContainer.addChild(noButton);
  
    // Calculate the position of the dialog box based on the current stage position
    const dialogX = (app.screen.width / 2) - (backgroundSprite.width / 2);
    const dialogY = (app.screen.height / 2) - (backgroundSprite.height / 2);
    state.reviveDialogContainer.position.set(dialogX, dialogY);
  
    // Add the dialog box to the PIXI stage
    app.stage.addChild(state.reviveDialogContainer);
    setisPaused(true);
  
    // Listen for click events on the 'Yes' button
    yesButton.eventMode = 'static';
    yesButton.cursor = 'pointer';
    noButton.eventMode = 'static';
    noButton.cursor = 'pointer';
  
    yesButton.on('pointerdown', () => {
      // Check if the player has enough coins to revive the character
      if (getCoffee() >= 50) {
        // Perform the revive logic
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
        // Remove the dialog box from the PIXI stage
        app.stage.removeChild(state.reviveDialogContainer);
        setisPaused(false);
      } else {
        // Player doesn't have enough coins
        console.log('Not enough coins to revive');
        app.stage.removeChild(state.reviveDialogContainer);
        setisPaused(false);
        // You can display an error message or perform other actions as needed
      }
    });
  
    noButton.on('pointerdown', () => {
      // Remove the dialog box from the PIXI stage
      app.stage.removeChild(state.reviveDialogContainer);
      setisPaused(false);
    });
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

    window.addEventListener('blur', () => {
      if (getPlayerCurrentHealth() > 0) {
        setisPaused(true);
      }
    });
    

    const loadingTexture = await PIXI.Assets.load('./assets/loading.png');
    const loadingSprite = new PIXI.Sprite(loadingTexture);
    loadingSprite.anchor.set(0.5);
    loadingSprite.width = app.screen.width;
    loadingSprite.height = app.screen.height;
    loadingSprite.position.set(app.screen.width / 2, app.screen.height / 2);
    loadingSprite.alpha = 1; // Start fully opaque
    app.stage.removeChild(menuSprite);
    app.stage.addChild(loadingSprite);


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
      document.getElementById('endless-timer').style.display = 'block';
      // Set endless start time
      state.endlessStartTime = Date.now();
      state.endlessElapsed = 0;
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
PIXI.Assets.add({ alias: 'background', src: './assets/background.png' });
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
PIXI.Assets.add({ alias: 'mountain1', src: './assets/mountain1.png' });
PIXI.Assets.add({ alias: 'mountain2', src: './assets/mountain2.png' });
PIXI.Assets.add({ alias: 'castle', src: './assets/castle.png' });
PIXI.Assets.add({ alias: 'clouds', src: './assets/clouds.png' });
PIXI.Assets.add({ alias: 'clouds2', src: './assets/clouds2.png' });
PIXI.Assets.add({ alias: 'clouds3', src: './assets/clouds3.png' });

// Load the assets and get a resolved promise once all are loaded
const texturesPromise = PIXI.Assets.load([
  'shark_emerge',
  'shark_submerge',
  'shark_walk',
  'shark_attack',
  'pig_walk',
  'pig_attack',
  'ele_walk',
  'ele_attack',
  'scorp_walk',
  'scorp_attack',
  'octo_walk',
  'octo_attack',
  'toofer_walk',
  'toofer_attack',
  'bird_egg',
  'bird_ghost',
  'bird_walk',
  'bird_attack',
  'snail_ghost',
  'bee_ghost',
  'bee_walk',
  'bee_attack',
  'puffer_walk',
  'puffer_attack',
  'bean',
  'background',
  'frog_ghost',
  'foreground',
  'critter',
  'critter_walk',
  'critter_attack',
  'snail_idle',
  'snail_walk',
  'snail_attack',
  'frog',
  'frog_walk',
  'frog_attack',
  'enemy_death',
  'mountain1',
  'mountain2',
  'castle',
  'clouds',
  'clouds2',
  'clouds3'
]);

// When the promise resolves, we have the textures!
texturesPromise.then((texturesPromise) => {
 setup(texturesPromise);
});

    function setup(textures) {


      // Add the state.timer animation to the stage


      let backgroundTexture = textures.background;

// Create background — use TilingSprite in endless mode for infinite scrolling
let background;
if (state.gameMode === 'endless') {
  background = new PIXI.TilingSprite(backgroundTexture, 50000, app.screen.height);
} else {
  background = new PIXI.Sprite(backgroundTexture);
  background.width = 2800;
  background.height = app.screen.height;
}
background.anchor.set(0, 0);
background.position.set(0, 0);
app.stage.addChild(background);


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
  const w = 50000;
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
    const treeScale = 0.6 + endlessGroundRandom() * 0.6;
    const trunkH = (30 + endlessGroundRandom() * 25) * treeScale;
    const trunkW = (6 + endlessGroundRandom() * 4) * treeScale;
    const canopyR = (18 + endlessGroundRandom() * 14) * treeScale;
    const treeY = terrainTopY(tx); // follow terrain curve
    const canopyColor = palette.canopy[Math.floor(endlessGroundRandom() * palette.canopy.length)];

    if (weather === 'wind' && treeType < 0.35) {
      // Cactus for wind biome — no trunk/canopy, just a cactus shape
      const cH = (20 + endlessGroundRandom() * 30) * treeScale;
      const cW = 8 * treeScale;
      // Main body
      d.roundRect(tx - cW / 2, treeY - cH, cW, cH, cW * 0.4).fill({ color: 0x3a7a30 });
      // Left arm
      const armY = treeY - cH * 0.6;
      d.roundRect(tx - cW / 2 - cW * 0.8, armY, cW * 0.8, cW, cW * 0.3).fill({ color: 0x3a7a30 });
      d.roundRect(tx - cW / 2 - cW * 0.8, armY - cH * 0.25, cW, cH * 0.25 + cW, cW * 0.3).fill({ color: 0x3a7a30 });
      // Right arm
      const armY2 = treeY - cH * 0.45;
      d.roundRect(tx + cW / 2, armY2, cW * 0.7, cW, cW * 0.3).fill({ color: 0x3a7a30 });
      d.roundRect(tx + cW / 2 + cW * 0.7 - cW, armY2 - cH * 0.2, cW, cH * 0.2 + cW, cW * 0.3).fill({ color: 0x3a7a30 });
      // Highlight
      d.rect(tx - 1, treeY - cH + 3, 2, cH - 6).fill({ color: 0x5aaa50, alpha: 0.3 });
      tx += 300 + endlessGroundRandom() * 500;
      continue;
    }

    // Ground shadow for all trees in sun weather
    if (weather === 'sun') {
      d.ellipse(tx + canopyR * 0.4, treeY + 3, canopyR * 1.3, 5).fill({ color: 0x000000, alpha: 0.15 });
    }

    // Trunk
    d.rect(tx - trunkW / 2, treeY - trunkH, trunkW, trunkH).fill({ color: palette.trunk });
    d.rect(tx - 1, treeY - trunkH + 4, 2, trunkH - 8).fill({ color: palette.trunk, alpha: 0.4 });

    if (weather === 'sun' && treeType < 0.5) {
      // Maple tree — rich multi-layered canopy with maple-leaf style lobes
      const cx = tx, cy = treeY - trunkH;
      const r = canopyR;
      // Main body — cluster of overlapping circles for organic look
      const darkCanopy = palette.canopy[Math.min(3, palette.canopy.length - 1)];
      d.circle(cx, cy - r * 0.4, r * 1.15).fill({ color: canopyColor, alpha: 0.85 });
      d.circle(cx - r * 0.65, cy - r * 0.1, r * 0.75).fill({ color: canopyColor, alpha: 0.8 });
      d.circle(cx + r * 0.65, cy - r * 0.1, r * 0.75).fill({ color: canopyColor, alpha: 0.8 });
      // Upper lobes for maple crown shape
      d.circle(cx - r * 0.3, cy - r * 0.9, r * 0.6).fill({ color: canopyColor, alpha: 0.9 });
      d.circle(cx + r * 0.3, cy - r * 0.9, r * 0.6).fill({ color: canopyColor, alpha: 0.9 });
      d.circle(cx, cy - r * 1.1, r * 0.5).fill({ color: canopyColor, alpha: 0.85 });
      // Darker depth layer underneath
      d.circle(cx, cy + r * 0.1, r * 0.8).fill({ color: darkCanopy, alpha: 0.35 });
      // Highlight — sunlit top
      d.circle(cx - r * 0.15, cy - r * 0.7, r * 0.4).fill({ color: 0xffffff, alpha: 0.12 });
      // Fallen leaves at base
      for (let fl = 0; fl < 4; fl++) {
        const lx = cx - r + endlessGroundRandom() * r * 2;
        const ly = treeY - 1 + endlessGroundRandom() * 3;
        d.circle(lx, ly, 1.5 + endlessGroundRandom()).fill({ color: canopyColor, alpha: 0.5 });
      }
    } else if (weather === 'snow' && treeType < 0.6) {
      // Pine with snow caps
      const cx = tx, cy = treeY - trunkH;
      const pineH = canopyR * 2.2, pineW = canopyR * 1.4;
      for (let tier = 0; tier < 3; tier++) {
        const ty = cy - tier * pineH * 0.28;
        const tw = pineW * (1 - tier * 0.22), th = pineH * 0.45;
        d.poly([cx - tw / 2, ty, cx, ty - th, cx + tw / 2, ty]).fill({ color: canopyColor });
        d.poly([cx - tw * 0.3, ty, cx, ty - th * 0.3, cx + tw * 0.3, ty]).fill({ color: 0xe8eef5, alpha: 0.7 });
      }
    } else if (weather === 'rain') {
      // Dark droopy canopy
      const cx = tx, cy = treeY - trunkH - canopyR * 0.4;
      d.ellipse(cx, cy, canopyR * 1.0, canopyR * 1.3).fill({ color: canopyColor, alpha: 0.85 });
      d.ellipse(cx, cy + canopyR * 0.3, canopyR * 0.6, canopyR * 0.5).fill({ color: canopyColor, alpha: 0.5 });
    } else {
      // Default round tree
      const cx = tx, cy = treeY - trunkH - canopyR * 0.5;
      d.circle(cx, cy, canopyR).fill({ color: canopyColor, alpha: 0.85 });
      d.circle(cx - canopyR * 0.3, cy + canopyR * 0.2, canopyR * 0.6).fill({ color: canopyColor, alpha: 0.6 });
      d.circle(cx + canopyR * 0.35, cy + canopyR * 0.15, canopyR * 0.55).fill({ color: canopyColor, alpha: 0.6 });
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

  endlessGroundDecor.addChild(d);
}

if (state.gameMode === 'endless') {
  endlessGround = new PIXI.Graphics();
  endlessGround.position.set(0, app.screen.height - endlessGroundHeight);
  endlessGround.zIndex = 5;
  // Decor layer (trees, boulders) sits just above the ground surface
  endlessGroundDecor = new PIXI.Container();
  endlessGroundDecor.position.set(0, app.screen.height - endlessGroundHeight);
  endlessGroundDecor.zIndex = 6; // above ground, below critter (10)
  drawEndlessGround('sun');
  endlessGroundCurrentWeather = 'sun';
  // Hide the original foreground sprite in endless mode
  foreground.visible = false;
}


const frogGhostTextures = textures.frog_ghost;
state.frogGhostPlayer = new PIXI.Sprite(frogGhostTextures);

state.frogGhostPlayer.anchor.set(0, 0);
state.frogGhostPlayer.scale.set(0.28);
backgroundTexture = textures.background;

      // Create a new tiling sprite with the background texture, specifying the width and height
 
      
      // No need to set the width and height again, since it's set in the TilingSprite constructor
      // background.width = app.screen.width * 2.75;
      // background.height = app.screen.height;
   
      const mountain1 = createMountainSprite('mountain1', -100, mountainVelocity1, foreground);
      const mountain2 = createMountainSprite('mountain2', app.screen.width * 0.45, mountainVelocity2, foreground);
      const mountain3 = createMountainSprite('mountain2', -200, mountainVelocity3, foreground); // Adjust the position as needed
      const mountain4 = createMountainSprite('mountain1', app.screen.width * 1.2, mountainVelocity4, foreground); // Adjust the position as needed
      function createMountainSprite(resourceName, xPos, velocity, foreground) {
        const sprite = new PIXI.Sprite(textures[resourceName]);

        const scaleFactor = Math.min(
          app.screen.height * 0.6 / sprite.height,
          app.screen.width * 1.5 / sprite.width
        );

        sprite.scale.set(scaleFactor);
        sprite.anchor.set(0, 1);

        const minHeightOffset = foreground ? foreground.height * 0.34 : 0;
        const heightOffsetRatio = (1 - scaleFactor) * 0.3; // Adjust this ratio based on your preference

        const foregroundHeightOffset = foreground ? minHeightOffset + sprite.height * heightOffsetRatio : 0; // Adjusted offset calculation
        sprite.position.set(xPos, app.screen.height - foregroundHeightOffset);
        sprite.zIndex = -1;
        sprite.velocity = velocity;

        return sprite;
      }
      mountain3.scale.x = .6;
      mountain3.scale.y = .65;
      mountain4.scale.x = .5;
      mountain4.scale.y = .55;
      console.log(mountain2);
      console.log(mountain3);
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
      const backgroundImage = new PIXI.Sprite(PIXI.Assets.get('background'));
      const clouds = createTilingSprite(cloudsTexture, backgroundImage.width * 30, 200);
      const clouds2 = createTilingSprite(clouds2Texture, backgroundImage.width * 30, 200);
      clouds2.position.y += 100;
      clouds2.alpha = .3;
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
        const textureWidth = textures[resourceName].width / frameCount;

        for (let i = 0; i < frameCount; i++) {
          const rect = new PIXI.Rectangle(i * textureWidth, 0, textureWidth, frameHeight);
          const texture1 = new PIXI.Texture({ source: textures[resourceName].source, frame: rect });
          textures1.push(texture1);
        }

        return textures1;
      }

      function createAnimationTextures2(resourceName, frameCount, frameHeight, sheetWidth, sheetHeight) {
        const textures1 = [];
        const frameWidth = sheetWidth / Math.ceil(frameCount / (sheetHeight / frameHeight));

        for (let i = 0; i < frameCount; i++) {
          const row = Math.floor(i / (sheetWidth / frameWidth));
          const col = i % (sheetWidth / frameWidth);
          const rect = new PIXI.Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
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
                if (getCurrentCharacter() === "character-bird") {
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
                    birdProjectile.x += projectileSpeed;

                    // Apply the "gravity" to the vertical speed
                    verticalSpeed += gravity;
                    // Apply the vertical speed to the projectile's position
                    birdProjectile.y += verticalSpeed;

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

                  castleTakeDamage(getCharacterDamage(getCurrentCharacter()));
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

    
        setCharEXP(getCurrentCharacter(), getCharEXP(getCurrentCharacter()) + expToGive);
        //ox setPlayerEXP(getPlayerEXP() + 100);
        console.log("YEP", getCharEXP(getCurrentCharacter()));
        console.log("YEPX", getEXPtoLevel(getCurrentCharacter()));
        updateEXP(getCharEXP(getCurrentCharacter()) + expToGive, getEXPtoLevel(getCurrentCharacter()));
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
        createWeatherEffects();

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
      app.ticker.add(() => {
        updateWeatherEffects();

        // Endless mode: update survival timer
        if (state.gameMode === 'endless' && state.endlessStartTime && !getisPaused()) {
          state.endlessElapsed = Math.floor((Date.now() - state.endlessStartTime) / 1000);
          const mins = Math.floor(state.endlessElapsed / 60);
          const secs = state.endlessElapsed % 60;
          document.getElementById('endless-timer').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;

          // Cycle weather every 60s and update ground color + weather effects
          const currentWeather = getWeatherType();
          if (endlessGround && currentWeather !== endlessGroundCurrentWeather) {
            endlessGroundCurrentWeather = currentWeather;
            drawEndlessGround(currentWeather);
            updateWeatherIcon();
            createWeatherEffects();
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
          getEnemies().forEach(enemy => {
            enemy.play();
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
          const movementX = Math.sign(distanceX) * Math.min(Math.abs(distanceX), cameraSpeed);
          const movementY = Math.sign(distanceY) * Math.min(Math.abs(distanceY), cameraSpeed);

          // Update the camera position
          app.stage.x += movementX;
          app.stage.y += movementY;
          mountain1.position.x -= velocity.x * mountain1Speed;
          mountain2.position.x += velocity.x * mountain2Speed;
          mountain3.position.x += velocity.x * mountain3Speed;
          mountain4.position.x += velocity.x * mountain4Speed;
          wrapMountains();

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
              unlockAnimSprite.position.x -= 6;
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
                pe.position.y -= 0.3;
                pe.rotation = Math.sin(elapsed * 0.005) * 0.2;
                pe.scale.set(1 + Math.sin(elapsed * 0.008) * 0.1);
              }

              // Animate confetti — fall, tumble, drift
              if (unlockAnimSprite.confettiContainer) {
                for (const p of unlockAnimSprite.confettiContainer.children) {
                  p.vy += p.gravity;
                  p.vx += p.drift * 0.02;
                  p.position.x += p.vx;
                  p.position.y += p.vy;
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
              if (state.gameMode === 'endless' && !state.isWiped) {
                setisWiped(true);
                // Show final survival time
                const mins = Math.floor(state.endlessElapsed / 60);
                const secs = state.endlessElapsed % 60;
                const timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
                const wipeEl = document.getElementById('wipe-text');
                wipeEl.textContent = 'YOU WIPED!! ' + timeStr;
                // Return to menu after delay (reload page to reset state)
                setTimeout(() => {
                  location.reload();
                }, 4000);
              } else {
                setisWiped(true);
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
          // Character swap: keep critter at their current position (no teleport)
          updateEXP(getCharEXP(getCurrentCharacter()), getEXPtoLevel(getCurrentCharacter()));
          document.getElementById('spawn-text').style.visibility = 'hidden';
          updateVelocity();
          setCharSwap(false);
          stopFlashing();
          app.stage.addChild(critter);

          return;
        }
       // if(getEnemiesInRange()>0){handleTouchHold();}
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
                    critter.position.x += velocity.x;

                  }
                  else {
                    if (critter.currentFrame > critter.totalFrames / 2) {
                      critter.position.x += velocity.x * 2;

                    }
                  }
                  if ((critter.textures != state.frogWalkTextures)) {
                    console.log("nope");
                    critter.textures = state.frogWalkTextures;
                    critter.play();
                  }
                  critter.loop = true;
                  mountain1.position.x -= velocity.x * mountain1Speed;
                  mountain2.position.x -= velocity.x * mountain2Speed;
                  mountain3.position.x -= velocity.x * mountain3Speed;
                  mountain4.position.x -= velocity.x * mountain4Speed;
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

        // Update cloud position
        clouds.position.x -= cloudSpeed;
        clouds2.position.x -= cloud2Speed;
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
      app.stage.removeChild(loadingSprite);
      playRoundText(state.currentRound);

      // document.getElementById("infoboxs").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
      document.getElementById("infoboxes").style.visibility = "visible";
      document.getElementById("ui-overlay").style.visibility = "visible";
      document.getElementById("pause-button").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
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
      updateEXP(0, getEXPtoLevel(getCurrentCharacter()));
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
          characterBoxes.forEach((box) => {
            const charClass = box.classList[1];
            if (!state.unlockedCharacters.includes(charClass)) {
              box.style.visibility = 'hidden';
            } else if (state.selectedCharacter !== "" && box.classList.contains(state.selectedCharacter)) {
              box.style.visibility = 'hidden';
            } else {
              box.style.visibility = 'visible';
            }
          });
          state.isCharacterMenuOpen = true;
        }

        // Start the cooldown


      }
      if (state.gameMode === 'endless') {
        app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, endlessGround, endlessGroundDecor, foreground, critter, clouds, clouds2, state.enemyDeath, castlePlayer);
      } else {
        app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, foreground, castle, critter, clouds, clouds2, hpBarBackground, hpBar, state.enemyDeath, castlePlayer);
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
        background.height = app.screen.height;
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
          const minHeightOffset = foreground ? foreground.height * 0.34 : 0;
          const heightOffsetRatio = (1 - Math.abs(m.scale.y)) * 0.3;
          const foregroundHeightOffset = foreground ? minHeightOffset + m.height * heightOffsetRatio : 0;
          m.position.y = app.screen.height - foregroundHeightOffset;
        });

        // Reposition existing enemies preserving their offset from the ground
        getEnemies().forEach(enemy => {
          const offsetFromBottom = oldHeight - enemy.position.y;
          enemy.position.y = app.screen.height - offsetFromBottom;
        });
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

      // Spawn demi boss every ~45 seconds after the first 30s
      if (elapsed >= 30 && Math.floor(elapsed) % 45 < 2 && state.demiSpawned < Math.floor((elapsed - 30) / 45) + 1) {
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
    const maxSpawns = 5 + Math.floor(state.currentRound * 0.5);
    if (state.spawnedThisRound >= maxSpawns) {
      return;
    }

    // On resume, wait the remaining interval before spawning instead of spawning instantly
    const currentInterval = state.interval - (state.currentRound * 225);
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



startGame();
state.isGameStarted=true;
  }

});