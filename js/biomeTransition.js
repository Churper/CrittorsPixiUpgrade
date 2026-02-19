import state from './state.js';
import {
  skyGradients, getWeatherType, updateWeatherIcon,
  getWeatherRefs, resetWeatherRefs, createWeatherEffects,
} from './weather.js';
import { initTerrain, drawEndlessGround } from './terrain.js';

// Getter/setter closures for reassignable variables in main.js
let _getEndlessGround = null;
let _setEndlessGround = null;
let _getEndlessGroundDecor = null;
let _setEndlessGroundDecor = null;
let _getEndlessGroundDecorFG = null;
let _setEndlessGroundDecorFG = null;
let _getEndlessGroundCurrentWeather = null;
let _setEndlessGroundCurrentWeather = null;
let _getCurrentSkyTop = null;
let _setCurrentSkyTop = null;
let _getCurrentSkyBottom = null;
let _setCurrentSkyBottom = null;

// Direct object refs (stable display objects)
let _background = null;
let _persistentStars = null;
let _mountains = null; // [mountain1, mountain2, mountain3, mountain4]
let _clouds = null;    // [clouds, clouds2]
let _foreground = null;
let _endlessGroundHeight = 0;

export function initBiomeTransition(refs) {
  _getEndlessGround = refs.getEndlessGround;
  _setEndlessGround = refs.setEndlessGround;
  _getEndlessGroundDecor = refs.getEndlessGroundDecor;
  _setEndlessGroundDecor = refs.setEndlessGroundDecor;
  _getEndlessGroundDecorFG = refs.getEndlessGroundDecorFG;
  _setEndlessGroundDecorFG = refs.setEndlessGroundDecorFG;
  _getEndlessGroundCurrentWeather = refs.getEndlessGroundCurrentWeather;
  _setEndlessGroundCurrentWeather = refs.setEndlessGroundCurrentWeather;
  _getCurrentSkyTop = refs.getCurrentSkyTop;
  _setCurrentSkyTop = refs.setCurrentSkyTop;
  _getCurrentSkyBottom = refs.getCurrentSkyBottom;
  _setCurrentSkyBottom = refs.setCurrentSkyBottom;
  _background = refs.background;
  _persistentStars = refs.persistentStars;
  _mountains = refs.mountains;
  _clouds = refs.clouds;
  _foreground = refs.foreground;
  _endlessGroundHeight = refs.endlessGroundHeight;
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function drawSkyGradient(gfx, topColor, bottomColor, width, height) {
  gfx.clear();
  const BANDS = 32;
  const bandHeight = Math.ceil(height / BANDS);
  for (let i = 0; i < BANDS; i++) {
    const t = i / (BANDS - 1);
    const color = lerpColor(topColor, bottomColor, t);
    gfx.rect(0, i * bandHeight, width, bandHeight + 1).fill({ color });
  }
}

export function transitionWeather(newWeather) {
  const app = state.app;
  if (!app) return;

  const [mountain1, mountain2, mountain3, mountain4] = _mountains;
  const [clouds, clouds2] = _clouds;

  // Force-complete any existing transition
  if (state.biomeTransition) {
    const t = state.biomeTransition;
    if (t.oldWeather && t.oldWeather.parent) { app.stage.removeChild(t.oldWeather); t.oldWeather.destroy({ children: true }); }
    if (t.oldGround && t.oldGround.parent) { app.stage.removeChild(t.oldGround); t.oldGround.destroy({ children: true }); }
    if (t.oldGroundDecor && t.oldGroundDecor.parent) { app.stage.removeChild(t.oldGroundDecor); t.oldGroundDecor.destroy({ children: true }); }
    if (t.oldGroundDecorFG && t.oldGroundDecorFG.parent) { app.stage.removeChild(t.oldGroundDecorFG); t.oldGroundDecorFG.destroy({ children: true }); }
    for (const o of (t.oldOverlays || [])) { if (o && o.parent) { app.stage.removeChild(o); o.destroy({ children: true }); } }
    if (t.newWeather) t.newWeather.alpha = 1;
    if (t.newSunLight) t.newSunLight.alpha = t.targetSunLightAlpha;
    if (t.newNightOverlay) t.newNightOverlay.alpha = t.targetNightAlpha;
    if (t.newFireGlows) t.newFireGlows.alpha = t.targetFireGlowsAlpha;
    _setCurrentSkyTop(t.newSkyTop);
    _setCurrentSkyBottom(t.newSkyBottom);
    drawSkyGradient(_background, _getCurrentSkyTop(), _getCurrentSkyBottom(), app.screen.width, app.screen.height);
    _persistentStars.alpha = t.newStarsAlpha;
    mountain1.tint = t.newMtnTint; mountain2.tint = t.newMtnTint;
    mountain3.tint = t.newMtnTint; mountain4.tint = t.newMtnTint;
    if (t.newCloudTint !== undefined) { clouds.tint = t.newCloudTint; clouds2.tint = t.newCloudTint; }
    state.biomeTransition = null;
  }

  // Save old elements
  const _oldRefs = getWeatherRefs();
  const oldWeather = _oldRefs.weatherContainer;
  const oldGround = _getEndlessGround();
  const oldGroundDecor = _getEndlessGroundDecor();
  const oldGroundDecorFG = _getEndlessGroundDecorFG();
  const oldOverlays = [_oldRefs.sunLightOverlay, _oldRefs.nightOverlay, _oldRefs.nightFireGlows];
  const oldSkyTop = _getCurrentSkyTop();
  const oldSkyBottom = _getCurrentSkyBottom();
  const oldStarsAlpha = _persistentStars.alpha;
  const oldMtnTint = mountain1.tint ?? 0xFFFFFF;
  const oldCloudTint = clouds.tint ?? 0xFFFFFF;

  // Create new ground on top — no masks, just alpha crossfade
  const newGround = new PIXI.Graphics();
  newGround.position.set(0, app.screen.height - _endlessGroundHeight);
  newGround.zIndex = 5;
  newGround.alpha = 0;
  app.stage.addChild(newGround);

  const newGroundDecor = new PIXI.Container();
  newGroundDecor.position.set(0, app.screen.height - _endlessGroundHeight);
  newGroundDecor.zIndex = 6;
  newGroundDecor.alpha = 0;
  app.stage.addChild(newGroundDecor);

  const newGroundDecorFG = new PIXI.Container();
  newGroundDecorFG.position.set(0, app.screen.height - _endlessGroundHeight);
  newGroundDecorFG.zIndex = 8;
  newGroundDecorFG.alpha = 0;
  app.stage.addChild(newGroundDecorFG);

  // Draw new biome ground
  _setEndlessGround(newGround);
  _setEndlessGroundDecor(newGroundDecor);
  _setEndlessGroundDecorFG(newGroundDecorFG);
  initTerrain(_getEndlessGround(), _getEndlessGroundDecor(), _getEndlessGroundDecorFG(), _endlessGroundHeight, _foreground.width);
  drawEndlessGround(newWeather);
  _setEndlessGroundCurrentWeather(newWeather);

  // Capture old sun/moon BEFORE creating new effects (createWeatherEffects resets them)
  const _preRefs = getWeatherRefs();
  const oldWasSun = !!_preRefs.weatherSun;
  const oldSun = _preRefs.weatherSun;
  const oldWasMoon = !!_preRefs.weatherMoon;
  const oldMoon = _preRefs.weatherMoon;

  // Detach old overlays so createWeatherEffects makes fresh ones
  resetWeatherRefs();

  // Create new weather at alpha 0
  createWeatherEffects();
  const _newRefs = getWeatherRefs();
  if (_newRefs.weatherContainer) _newRefs.weatherContainer.alpha = 0;
  if (_newRefs.sunLightOverlay) _newRefs.sunLightOverlay.alpha = 0;
  if (_newRefs.nightOverlay) _newRefs.nightOverlay.alpha = 0;
  if (_newRefs.nightFireGlows) _newRefs.nightFireGlows.alpha = 0;

  const targetNightAlpha = _newRefs.nightOverlay ? 0.35 : 0;
  const targetSunLightAlpha = _newRefs.sunLightOverlay ? 0.12 : 0;
  const targetFireGlowsAlpha = _newRefs.nightFireGlows ? 1 : 0;
  const newGrad = skyGradients[newWeather] || skyGradients.sun;

  updateWeatherIcon();

  state.biomeTransition = {
    oldWeather, oldGround, oldGroundDecor, oldGroundDecorFG, oldOverlays,
    oldWasSun, oldSun, oldWasMoon, oldMoon,
    progress: 0,
    newWeather: _newRefs.weatherContainer,
    newSunLight: _newRefs.sunLightOverlay,
    newNightOverlay: _newRefs.nightOverlay,
    newFireGlows: _newRefs.nightFireGlows,
    newGround, newGroundDecor, newGroundDecorFG,
    targetNightAlpha, targetSunLightAlpha,
    targetFireGlowsAlpha,
    oldSkyTop, oldSkyBottom, oldStarsAlpha,
    newSkyTop: newGrad.top, newSkyBottom: newGrad.bottom, newStarsAlpha: newGrad.starsAlpha,
    oldMtnTint, newMtnTint: newGrad.mountain,
    oldCloudTint, newCloudTint: newGrad.cloud,
  };
}

export function updateBiomeTransition() {
  const t = state.biomeTransition;
  if (!t) return;

  const app = state.app;
  const [mountain1, mountain2, mountain3, mountain4] = _mountains;
  const [clouds, clouds2] = _clouds;

  // Simple time-based crossfade (~3s at 60fps)
  t.progress += 0.002;
  const p = Math.min(1, t.progress);

  // Lerp sky gradient + mountain tints
  _setCurrentSkyTop(lerpColor(t.oldSkyTop, t.newSkyTop, p));
  _setCurrentSkyBottom(lerpColor(t.oldSkyBottom, t.newSkyBottom, p));
  drawSkyGradient(_background, _getCurrentSkyTop(), _getCurrentSkyBottom(), app.screen.width, app.screen.height);
  _persistentStars.alpha = t.oldStarsAlpha + (t.newStarsAlpha - t.oldStarsAlpha) * p;
  const mtnTint = lerpColor(t.oldMtnTint, t.newMtnTint, p);
  mountain1.tint = mtnTint;
  mountain2.tint = mtnTint;
  mountain3.tint = mtnTint;
  mountain4.tint = mtnTint;
  const cloudTint = lerpColor(t.oldCloudTint, t.newCloudTint, p);
  clouds.tint = cloudTint;
  clouds2.tint = cloudTint;

  // Ground fill crossfades smoothly
  if (t.newGround) t.newGround.alpha = Math.min(1, p / 0.6);
  if (t.oldGround) t.oldGround.alpha = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.3);
  // Trees swap style instantly at midpoint — same positions, different look
  if (p < 0.5) {
    if (t.oldGroundDecor) t.oldGroundDecor.alpha = 1;
    if (t.newGroundDecor) t.newGroundDecor.alpha = 0;
    if (t.oldGroundDecorFG) t.oldGroundDecorFG.alpha = 1;
    if (t.newGroundDecorFG) t.newGroundDecorFG.alpha = 0;
  } else {
    if (t.oldGroundDecor) t.oldGroundDecor.alpha = 0;
    if (t.newGroundDecor) t.newGroundDecor.alpha = 1;
    if (t.oldGroundDecorFG) t.oldGroundDecorFG.alpha = 0;
    if (t.newGroundDecorFG) t.newGroundDecorFG.alpha = 1;
  }

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
      // Sun sinks behind foreground naturally via z-ordering
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
      // Moon sinks behind foreground naturally via z-ordering
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
  if (t.newFireGlows) t.newFireGlows.alpha = t.targetFireGlowsAlpha * p;

  if (p >= 1) {
    // Destroy old elements
    if (t.oldWeather && t.oldWeather.parent) { state.app.stage.removeChild(t.oldWeather); t.oldWeather.destroy({ children: true }); }
    if (t.oldGround && t.oldGround.parent) { state.app.stage.removeChild(t.oldGround); t.oldGround.destroy({ children: true }); }
    if (t.oldGroundDecor && t.oldGroundDecor.parent) { state.app.stage.removeChild(t.oldGroundDecor); t.oldGroundDecor.destroy({ children: true }); }
    if (t.oldGroundDecorFG && t.oldGroundDecorFG.parent) { state.app.stage.removeChild(t.oldGroundDecorFG); t.oldGroundDecorFG.destroy({ children: true }); }
    for (const o of (t.oldOverlays || [])) { if (o && o.parent) { state.app.stage.removeChild(o); o.destroy({ children: true }); } }
    state.biomeTransition = null;
  }
}
