import state from './state.js';
import { getisPaused } from './state.js';

// --- Module-level state ---
let weatherContainer = null;
let weatherSun = null;
let weatherMoon = null;
let sunLightOverlay = null;
let nightOverlay = null;
let nightFireGlows = null;
let sunBeamsAboveClouds = null;

// Initialized from main.js via initWeather()
let _groundHeight = 0;

// Weather system — icon based on current round
const weatherTypes = [
  { name: 'sun', emoji: '\u2600\uFE0F' },
  { name: 'night', emoji: '\uD83C\uDF19' },
  { name: 'rain', emoji: '\uD83C\uDF27\uFE0F' },
  { name: 'wind', emoji: '\uD83D\uDCA8' },
  { name: 'snow', emoji: '\u2744\uFE0F' },
];

const skyGradients = {
  sun:   { top: 0x3388CC, bottom: 0x99CCEE, starsAlpha: 0.0,  mountain: 0xFFFFFF, cloud: 0xFFFFFF, starTint: 0xFFFFFF },
  night: { top: 0x0a0a2a, bottom: 0x1a1a3a, starsAlpha: 1.0,  mountain: 0x3a3a5a, cloud: 0x4a4a6a, starTint: 0xFFFFFF },
  rain:  { top: 0x4a5a6a, bottom: 0x7a8a9a, starsAlpha: 0.0,  mountain: 0x7a8a9a, cloud: 0x8a8a9a, starTint: 0xFFFFFF },
  wind:  { top: 0x6699BB, bottom: 0xAADDFF, starsAlpha: 0.05, mountain: 0xccddee, cloud: 0xeef4ff, starTint: 0xF3FBFF },
  snow:  { top: 0x8899AA, bottom: 0xCCDDEE, starsAlpha: 0.08, mountain: 0xb8c8d8, cloud: 0xd8e4f0, starTint: 0xD9F4FF },
};

// Biome-specific sky variants layered on top of weather type.
// Every biome gets a distinct look across the full weather cycle.
const biomeSkyGradients = {
  forest: {
    sun:   { top: 0x2f85bd, bottom: 0x9dd8ee, starsAlpha: 0.0,  mountain: 0xf5fff2, cloud: 0xf4fff6, starTint: 0xF4FFF6 },
    night: { top: 0x081521, bottom: 0x183042, starsAlpha: 1.0,  mountain: 0x36526c, cloud: 0x4a6176, starTint: 0xCFF7FF },
    rain:  { top: 0x2f4f58, bottom: 0x63818b, starsAlpha: 0.0,  mountain: 0x6b8792, cloud: 0x889da5, starTint: 0xDFF5FF },
    wind:  { top: 0x5d91a6, bottom: 0xa8d6e3, starsAlpha: 0.06, mountain: 0xb9d5da, cloud: 0xdfedf1, starTint: 0xE8FFFF },
    snow:  { top: 0x778ca0, bottom: 0xc2d3e2, starsAlpha: 0.10, mountain: 0xa9bcc9, cloud: 0xd0deea, starTint: 0xD9ECFF },
  },
  desert: {
    sun:   { top: 0x6fa8cf, bottom: 0xf4deb2, starsAlpha: 0.01, mountain: 0xc79756, cloud: 0xf5e7cf, starTint: 0xFFF1D0 },
    night: { top: 0x1a1130, bottom: 0x3d1f56, starsAlpha: 1.0,  mountain: 0x5d4a76, cloud: 0x77608f, starTint: 0xFFD7A6 },
    rain:  { top: 0x587388, bottom: 0x95afc2, starsAlpha: 0.0,  mountain: 0x9a9386, cloud: 0xb9b2a7, starTint: 0xF2E3C9 },
    wind:  { top: 0x8fb7d1, bottom: 0xf3e2bf, starsAlpha: 0.08, mountain: 0xd4b682, cloud: 0xf3e8d2, starTint: 0xFFF2D6 },
    snow:  { top: 0x8f93a0, bottom: 0xd3d5dd, starsAlpha: 0.12, mountain: 0xb7aba1, cloud: 0xe1ddd6, starTint: 0xFFE8D2 },
  },
  tundra: {
    sun:   { top: 0x5f94bf, bottom: 0xdaf4ff, starsAlpha: 0.04, mountain: 0xcde8fb, cloud: 0xf2fbff, starTint: 0xD8F6FF },
    night: { top: 0x041a2e, bottom: 0x0f3f63, starsAlpha: 1.0,  mountain: 0x74a9c8, cloud: 0x93bfd8, starTint: 0x9EEBFF },
    rain:  { top: 0x4c6b84, bottom: 0x88adc5, starsAlpha: 0.10, mountain: 0x9fc4d8, cloud: 0xbfd9e8, starTint: 0xB6ECFF },
    wind:  { top: 0x78adc6, bottom: 0xe5f8ff, starsAlpha: 0.18, mountain: 0xc9e7f4, cloud: 0xf4fcff, starTint: 0xBEF5FF },
    snow:  { top: 0x7fa2ba, bottom: 0xe7f7ff, starsAlpha: 0.24, mountain: 0xd2edf9, cloud: 0xf7fdff, starTint: 0xD9FBFF },
  },
  volcano: {
    sun:   { top: 0x7a2a17, bottom: 0xd86b34, starsAlpha: 0.0,  mountain: 0x7f4f43, cloud: 0x8f6556, starTint: 0xFFD0B8 },
    night: { top: 0x13070d, bottom: 0x3b0f1c, starsAlpha: 1.0,  mountain: 0x502839, cloud: 0x6a3947, starTint: 0xFFA9C2 },
    rain:  { top: 0x47373a, bottom: 0x776060, starsAlpha: 0.02, mountain: 0x6e5859, cloud: 0x8d7777, starTint: 0xFFC6B3 },
    wind:  { top: 0x6a5042, bottom: 0xb07a57, starsAlpha: 0.05, mountain: 0x8d6657, cloud: 0xc0997f, starTint: 0xFFE0C5 },
    snow:  { top: 0x605a63, bottom: 0xa79ca9, starsAlpha: 0.22, mountain: 0x887e8a, cloud: 0xb7abb8, starTint: 0xFFD0EA },
  },
  void: {
    sun:   { top: 0x26124a, bottom: 0x6d35a0, starsAlpha: 0.45, mountain: 0x6c4e91, cloud: 0x7f63a8, starTint: 0xE6C9FF },
    night: { top: 0x070014, bottom: 0x210541, starsAlpha: 1.0,  mountain: 0x3d2a67, cloud: 0x503b7d, starTint: 0x9FEFFF },
    rain:  { top: 0x19092f, bottom: 0x3d1760, starsAlpha: 0.75, mountain: 0x4e2c76, cloud: 0x634090, starTint: 0xAEF4FF },
    wind:  { top: 0x13204a, bottom: 0x274f8f, starsAlpha: 0.65, mountain: 0x3a4f87, cloud: 0x5470aa, starTint: 0xA9D0FF },
    snow:  { top: 0x2b2146, bottom: 0x5c4d82, starsAlpha: 0.85, mountain: 0x524579, cloud: 0x6d5f95, starTint: 0xDCC8FF },
  },
};

/**
 * Call once after foreground is loaded to provide the ground height
 * (foreground.height * 0.65) needed by weather effects.
 */
export function initWeather(groundHeight) {
  _groundHeight = groundHeight;
}

export function getWeatherType() {
  const cycle = Math.floor((state.endlessElapsed || 0) / 60) % weatherTypes.length;
  return weatherTypes[cycle].name;
}

function getCurrentBiomeIndex() {
  const castleLevel = state.lastSiegeCastleLevel || 0;
  return Math.floor(castleLevel / 20); // 0=forest, 1=desert, 2=tundra, 3=volcano, 4=void
}

export function getSkyGradient(weather) {
  const biomeKeys = ['forest', 'desert', 'tundra', 'volcano', 'void'];
  const biomeIdx = Math.max(0, Math.floor(getCurrentBiomeIndex()));
  const biomeKey = biomeKeys[Math.min(biomeIdx, biomeKeys.length - 1)] || 'forest';
  const biomeSet = biomeSkyGradients[biomeKey];
  if (biomeSet && biomeSet[weather]) return biomeSet[weather];
  return skyGradients[weather] || skyGradients.sun;
}

export function updateWeatherIcon() {
  // No-op: weather icon removed from UI
}

export function clearWeatherEffects() {
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
  weatherSun = null;
  weatherMoon = null;
  if (nightFireGlows && state.app) {
    state.app.stage.removeChild(nightFireGlows);
    nightFireGlows.destroy({ children: true });
    nightFireGlows = null;
  }
  if (sunBeamsAboveClouds && state.app) {
    state.app.stage.removeChild(sunBeamsAboveClouds);
    sunBeamsAboveClouds.destroy({ children: true });
    sunBeamsAboveClouds = null;
  }
}

export function createWeatherEffects() {
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
  const lowDetail = state.detailMode === 'low';

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
    // Beams and accent rays — skip in low detail (static beams look ugly)
    if (!lowDetail) {
      const beamCount = 8;
      for (let i = 0; i < beamCount; i++) {
        const beam = new PIXI.Graphics();
        const angle = (i / beamCount) * Math.PI * 2;
        const len = 120 + Math.random() * 80;
        beam.moveTo(0, 0).lineTo(Math.cos(angle) * len, Math.sin(angle) * len).stroke({ width: 4, color: 0xFFEE44, alpha: 0.25 });
        beam.rayAngle = angle;
        beam.rayLen = len;
        beam.isBeam = true;
        weatherSun.addChild(beam);
      }
      for (let i = 0; i < 8; i++) {
        const ray = new PIXI.Graphics();
        const angle = ((i + 0.5) / 8) * Math.PI * 2;
        const len = 60 + Math.random() * 40;
        ray.moveTo(0, 0).lineTo(Math.cos(angle) * len, Math.sin(angle) * len).stroke({ width: 1.5, color: 0xFFEE44, alpha: 0.15 });
        ray.rayAngle = angle;
        ray.rayLen = len;
        weatherSun.addChild(ray);
      }
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

  } else if (type === 'rain') {
    // Rain drops (fewer in low detail)
    const rainCount = lowDetail ? 25 : 80;
    for (let i = 0; i < rainCount; i++) {
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
    // Wind streaks (fewer in low detail)
    const streakCount = lowDetail ? 10 : 25;
    for (let i = 0; i < streakCount; i++) {
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
    // Leaf particles (skip in low detail)
    if (!lowDetail) {
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
    }

  } else if (type === 'snow') {
    // Snowflakes (fewer in low detail)
    const snowCount = lowDetail ? 20 : 60;
    for (let i = 0; i < snowCount; i++) {
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
    const nightGrad = getSkyGradient('night');
    // Moon — renders behind mountains like the sun
    weatherContainer.zIndex = 0.5;

    weatherMoon = new PIXI.Container();

    // Outer glow — soft, layered halo (simplified in low detail)
    const outerGlow = new PIXI.Graphics();
    if (lowDetail) {
      outerGlow.circle(0, 0, 38).fill({ color: 0xDDEEFF, alpha: 0.1 });
    } else {
      outerGlow.circle(0, 0, 70).fill({ color: 0xCCDDFF, alpha: 0.06 });
      outerGlow.circle(0, 0, 52).fill({ color: 0xCCDDFF, alpha: 0.08 });
      outerGlow.circle(0, 0, 38).fill({ color: 0xDDEEFF, alpha: 0.1 });
    }
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
    nightOverlay.rect(0, 0, 8000, 8000).fill({ color: nightGrad.top });
    nightOverlay.zIndex = 49999;
    nightOverlay.alpha = 0.35;
    nightOverlay.eventMode = 'none';
    app.stage.addChild(nightOverlay);

    // Animated fire glows — placed at campfire and lantern positions (skip in low detail)
    if (lowDetail) { /* no fire glows in low detail */ }
    else {
    // (must match seeds 99222 and 99333 from drawEndlessGroundDecor)
    nightFireGlows = new PIXI.Container();
    nightFireGlows.zIndex = 7; // above decor (6), below critter (10)
    nightFireGlows.eventMode = 'none';
    // Campfire glows — seed 99222, same spacing as campfire decor
    let _fgs = 99222;
    function _fgr() { _fgs = (_fgs * 16807) % 2147483647; return (_fgs & 0x7fffffff) / 2147483647; }
    let cfx = 200;
    while (cfx < 50000) {
      const sc = 0.8 + _fgr() * 0.4; // matches endlessGroundRandom() call in decor
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
      cfx += 600 + _fgr() * 1000; // matches endlessGroundRandom() call in decor
    }
    // Lantern glows — seed 99333, same spacing as lantern decor
    _fgs = 99333;
    let lnx = 900;
    while (lnx < 50000) {
      const sc = (0.8 + _fgr() * 0.3) * 1.4; // matches endlessGroundRandom() call in decor (with 1.4x scale)
      const glow = new PIXI.Graphics();
      glow.circle(0, 0, 25 * sc).fill({ color: 0xffaa33, alpha: 0.1 });
      glow.circle(0, 0, 14 * sc).fill({ color: 0xffcc44, alpha: 0.14 });
      const groundY = Math.sin(lnx * 0.0004) * 14 + Math.sin(lnx * 0.0011) * 7;
      glow.position.set(lnx, groundY - 36 * sc);
      glow.baseAlpha = glow.alpha;
      glow.flickerPhase = Math.random() * Math.PI * 2;
      glow.flickerSpeed = 0.05 + Math.random() * 0.04;
      glow.isCampfire = false;
      nightFireGlows.addChild(glow);
      lnx += 1100 + _fgr() * 1200; // matches endlessGroundRandom() call in decor
    }
    app.stage.addChild(nightFireGlows);
    } // end if !lowDetail
  }
}

export function updateWeatherEffects() {
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

    // Sun sinks behind foreground naturally (foreground zIndex 5 > sun zIndex 0.5)

    // In low detail: skip rotation, pulse, and lighting overlay updates
    if (state.detailMode !== 'low') {
      // Rotate rays slowly
      weatherSun.rotation = elapsed * 0.0003;
      // Pulse the glow
      const pulse = 1 + Math.sin(elapsed * 0.003) * 0.08;
      weatherSun.scale.set(pulse);
    }

    // sinusoidal brightness: 0 at edges, 1 at middle, clamp so it doesn't go negative after sunset
    const brightness = Math.max(0, Math.sin(progress * Math.PI));

    // Lighting: dim at dawn/dusk (progress near 0 or 1), bright at noon (progress ~0.5)
    if (sunLightOverlay) {
      sunLightOverlay.position.set(-app.stage.x - 2000, -app.stage.y - 2000);
      // Overlay alpha: 0.35 at dawn/dusk, 0.0 at peak noon
      sunLightOverlay.alpha = 0.15 * (1 - brightness);
      // Skip tint changes in low detail
      if (state.detailMode !== 'low') {
        if (progress < 0.15 || progress > 0.85) {
          sunLightOverlay.tint = 0x331100;
        } else {
          sunLightOverlay.tint = 0x000000;
        }
      }
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

    // Moon sinks behind foreground naturally via z-ordering

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

    // Animate fire glows — flicker
    if (nightFireGlows) {
      // Position container on the ground layer
      nightFireGlows.position.set(0, app.screen.height - _groundHeight);
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

/**
 * Returns references to internal weather display objects.
 * Used by biome transition code in main.js.
 */
export function getWeatherRefs() {
  return { weatherContainer, weatherSun, weatherMoon, sunLightOverlay, nightOverlay, nightFireGlows };
}

/**
 * Nulls out weather refs so createWeatherEffects() builds fresh ones.
 * Used by biome transition code in main.js before creating new weather.
 */
export function resetWeatherRefs() {
  sunLightOverlay = null;
  nightOverlay = null;
  nightFireGlows = null;
  weatherContainer = null;
}

/**
 * Maps a weather type to the appropriate ground style based on the current biome.
 * Ground visuals are biome-locked for consistency.
 */
export function getGroundWeather(weather) {
  const biomeIdx = getCurrentBiomeIndex();

  if (biomeIdx === 0) {
    return 'sun';   // forest
  } else if (biomeIdx === 1) {
    return 'wind';  // desert
  } else if (biomeIdx === 2) {
    return 'snow';  // tundra
  } else if (biomeIdx === 3) {
    return 'rain';  // volcano
  } else {
    return 'night'; // void
  }
}

export { weatherTypes, skyGradients };
