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
  sun:   { top: 0x3388CC, bottom: 0x99CCEE, starsAlpha: 0.0,  mountain: 0xFFFFFF, cloud: 0xFFFFFF },
  night: { top: 0x0a0a2a, bottom: 0x1a1a3a, starsAlpha: 1.0,  mountain: 0x3a3a5a, cloud: 0x4a4a6a },
  rain:  { top: 0x4a5a6a, bottom: 0x7a8a9a, starsAlpha: 0.0,  mountain: 0x7a8a9a, cloud: 0x8a8a9a },
  wind:  { top: 0x6699BB, bottom: 0xAADDFF, starsAlpha: 0.05, mountain: 0xccddee, cloud: 0xeef4ff },
  snow:  { top: 0x8899AA, bottom: 0xCCDDEE, starsAlpha: 0.08, mountain: 0xb8c8d8, cloud: 0xd8e4f0 },
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
    // Big extruding beams
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
    nightOverlay.rect(0, 0, 8000, 8000).fill({ color: 0x0a0a2a });
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

export { weatherTypes, skyGradients };
