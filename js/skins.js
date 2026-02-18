// skins.js — Skin catalog, HSL recoloring engine, texture generation, runtime effects

import state from './state.js';
import { getCurrentCharacter } from './state.js';

// ── Skin catalog ──────────────────────────────────────────────────────────────
export const skinCatalog = [
  // Frog skins
  { id: 'frog-ice',    icon: '🧊', name: 'Ice Frog',       cost: 3, charOnly: 'frog' },
  { id: 'frog-golden', icon: '✨', name: 'Golden Frog',    cost: 5, charOnly: 'frog' },
  { id: 'frog-shadow', icon: '🌑', name: 'Shadow Frog',    cost: 4, charOnly: 'frog' },
  // Snail skins
  { id: 'snail-crystal',   icon: '💎', name: 'Crystal Snail',   cost: 3, charOnly: 'snail' },
  { id: 'snail-magma',     icon: '🌋', name: 'Magma Snail',    cost: 4, charOnly: 'snail' },
  { id: 'snail-valentine', icon: '💝', name: 'Valentine Snail', cost: 4, charOnly: 'snail' },
  // Bird skins
  { id: 'bird-phoenix', icon: '🔥', name: 'Phoenix Bird',  cost: 5, charOnly: 'bird' },
  { id: 'bird-arctic',  icon: '❄️', name: 'Arctic Bird',   cost: 3, charOnly: 'bird' },
  // Bee skins
  { id: 'bee-neon',  icon: '💚', name: 'Neon Bee',   cost: 3, charOnly: 'bee' },
  { id: 'bee-royal', icon: '👑', name: 'Royal Bee',  cost: 5, charOnly: 'bee' },
];

// ── HSL conversion ────────────────────────────────────────────────────────────

function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function _hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ── Hue shift configs per skin ────────────────────────────────────────────────

const skinHueConfigs = {
  // ── FROG ──
  'frog-ice': [
    { from: 70, to: 160, targetFrom: 190, targetTo: 200, sat: 1.2, lit: 1.15 },
  ],
  'frog-golden': [
    { from: 70, to: 160, targetFrom: 44, targetTo: 52, sat: 1.3, lit: 1.2, shine: 0.65 },
  ],
  'frog-shadow': [
    { from: 70, to: 160, targetFrom: 272, targetTo: 286, sat: 0.9, lit: 0.65 },
  ],

  // ── SNAIL ──
  // Shell range starts at 170 to catch ALL blue/teal pixels including the lower shell.
  // The dark head area (~170-190°) gets recolored too but with the lit boost it looks fine.
  'snail-crystal': [
    { from: 170, to: 280, targetFrom: 178, targetTo: 192, sat: 1.15, lit: 1.2 },
    { from: 335, to: 360, targetFrom: 185, targetTo: 192, sat: 0.3, lit: 1.35 },
    { from: 0, to: 20, targetFrom: 185, targetTo: 192, sat: 0.3, lit: 1.35 },
    { from: 38, to: 68, targetFrom: 200, targetTo: 210, sat: 0.5, lit: 1.1 },
  ],
  'snail-magma': [
    { from: 170, to: 280, targetFrom: 2, targetTo: 14, sat: 1.35, lit: 1.3 },
    { from: 38, to: 68, targetFrom: 35, targetTo: 45, sat: 1.0, lit: 1.0 },
  ],
  'snail-valentine': [
    { from: 170, to: 280, targetFrom: 335, targetTo: 348, sat: 1.2, lit: 1.35 },
    { from: 335, to: 360, targetFrom: 318, targetTo: 328, sat: 1.3, lit: 1.05 },
    { from: 0, to: 20, targetFrom: 318, targetTo: 328, sat: 1.3, lit: 1.05 },
    { from: 38, to: 68, targetFrom: 348, targetTo: 355, sat: 0.35, lit: 1.45 },
  ],

  // ── BIRD ──
  // Phoenix: body → bright yellow/orange (hot flame center), petals/crest → vivid red-orange (fire)
  'bird-phoenix': [
    { from: 80, to: 168, targetFrom: 42, targetTo: 55, sat: 1.5, lit: 1.8, shine: 0.5 },
    { from: 258, to: 328, targetFrom: 6, targetTo: 18, sat: 1.5, lit: 1.4, shine: 0.3 },
  ],
  'bird-arctic': [
    { from: 80, to: 168, targetFrom: 196, targetTo: 208, sat: 0.95, lit: 1.35, shine: 0.25 },
    { from: 258, to: 328, targetFrom: 205, targetTo: 215, sat: 0.55, lit: 1.4 },
  ],

  // ── BEE ──
  'bee-neon': [
    { from: 18, to: 72, targetFrom: 118, targetTo: 142, sat: 1.55, lit: 1.05 },
  ],
  'bee-royal': [
    { from: 18, to: 72, targetFrom: 268, targetTo: 285, sat: 1.25, lit: 0.82 },
  ],
};

// ── Spritesheet recoloring ────────────────────────────────────────────────────

function recolorSheet(baseTex, shifts) {
  const src = baseTex.source;
  const resource = src.resource;
  const w = src.pixelWidth || src.width;
  const h = src.pixelHeight || src.height;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.drawImage(resource, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    let [hue, sat, lit] = _rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (sat < 0.08 || lit < 0.06 || lit > 0.94) continue;
    for (const s of shifts) {
      const hN = ((hue % 360) + 360) % 360;
      if (hN >= s.from && hN <= s.to) {
        const pct = (hN - s.from) / Math.max(1, s.to - s.from);
        hue = s.targetFrom + pct * (s.targetTo - s.targetFrom);
        if (s.sat !== undefined) sat = Math.min(1, sat * s.sat);
        if (s.lit !== undefined) lit = Math.min(1, Math.max(0, lit * s.lit));
        if (s.shine) lit = Math.min(1, lit + s.shine * lit * lit);
        break;
      }
    }
    const [nr, ng, nb] = _hslToRgb(hue, sat, lit);
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  ctx.putImageData(imgData, 0, 0);
  return PIXI.Texture.from(cvs);
}

// ── Texture cache & accessors ─────────────────────────────────────────────────

const skinTextureCache = {};

export function applySkinFilter(critterSprite) {
  critterSprite.tint = 0xffffff;
  critterSprite.filters = [];
  state.skinBaseTint = 0xffffff;
}

export function getSkinTextures(charName, type) {
  const skinId = state.equippedSkins[charName];
  if (skinId && skinTextureCache[skinId + '_' + type]) {
    return skinTextureCache[skinId + '_' + type];
  }
  return null;
}

// ── Generate all skin textures at load time ───────────────────────────────────

const _skinFrameParams = {
  frog:  { type: 1, walk: { n: 10, fh: 351 }, attack: { n: 12, fh: 351 } },
  snail: { type: 2, walk: { n: 20, fh: 562, sw: 3560, sh: 2248 }, attack: { n: 20, fh: 562, sw: 2848, sh: 3372 } },
  bee:   { type: 2, walk: { n: 9,  fh: 256, sw: 2753, sh: 256 },  attack: { n: 18, fh: 256, sw: 1950, sh: 1024 } },
  bird:  { type: 2, walk: { n: 13, fh: 403, sw: 2541, sh: 806 },  attack: { n: 13, fh: 403, sw: 2541, sh: 806 } },
};

export function generateSkinTextures(textures, textureScaleFactors) {
  for (const ch of ['frog', 'snail', 'bee', 'bird']) {
    const skinId = state.equippedSkins[ch];
    if (!skinId || !skinHueConfigs[skinId]) continue;
    const shifts = skinHueConfigs[skinId];
    const fp = _skinFrameParams[ch];
    const walkSheet = ch + '_walk';
    const atkSheet = ch + '_attack';
    const recoloredWalk = recolorSheet(textures[walkSheet], shifts);
    const recoloredAtk = recolorSheet(textures[atkSheet], shifts);
    if (fp.type === 1) {
      const wFrames = [], aFrames = [];
      const wScale = textureScaleFactors[walkSheet] || 1;
      const aScale = textureScaleFactors[atkSheet] || 1;
      const wFw = recoloredWalk.width / fp.walk.n;
      const wFh = Math.floor(fp.walk.fh * wScale);
      for (let i = 0; i < fp.walk.n; i++) {
        wFrames.push(new PIXI.Texture({ source: recoloredWalk.source, frame: new PIXI.Rectangle(i * wFw, 0, wFw, wFh) }));
      }
      const aFw = recoloredAtk.width / fp.attack.n;
      const aFh = Math.floor(fp.attack.fh * aScale);
      for (let i = 0; i < fp.attack.n; i++) {
        aFrames.push(new PIXI.Texture({ source: recoloredAtk.source, frame: new PIXI.Rectangle(i * aFw, 0, aFw, aFh) }));
      }
      skinTextureCache[skinId + '_walk'] = wFrames;
      skinTextureCache[skinId + '_attack'] = aFrames;
    } else {
      for (const mode of ['walk', 'attack']) {
        const recolored = mode === 'walk' ? recoloredWalk : recoloredAtk;
        const sheetName = mode === 'walk' ? walkSheet : atkSheet;
        const p = fp[mode];
        const scale = textureScaleFactors[sheetName] || 1;
        const fh = Math.floor(p.fh * scale);
        const sw = Math.floor(p.sw * scale);
        const sh = Math.floor(p.sh * scale);
        const fw = sw / Math.ceil(p.n / (sh / fh));
        const frames = [];
        for (let i = 0; i < p.n; i++) {
          const row = Math.floor(i / (sw / fw));
          const col = i % (sw / fw);
          frames.push(new PIXI.Texture({ source: recolored.source, frame: new PIXI.Rectangle(col * fw, row * fh, fw, fh) }));
        }
        skinTextureCache[skinId + '_' + mode] = frames;
      }
    }
  }
}

// ── Runtime skin particle effects ─────────────────────────────────────────────
// Called every frame from the main ticker. Spawns sparkles/hearts on the critter.

const _skinParticles = []; // active particles
let _nextSparkleTime = 0;
let _nextHeartTime = 0;

// Skin effect configs: which skins get which particle effects
const _skinEffects = {
  'frog-golden': 'sparkle',
  'snail-valentine': 'heart',
};

export function updateSkinEffects(critter, now) {
  if (!critter || state.isPaused) return;

  const ch = getCurrentCharacter() ? getCurrentCharacter().replace('character-', '') : 'frog';
  const skinId = state.equippedSkins[ch];
  const effect = skinId ? _skinEffects[skinId] : null;

  // Spawn new particles
  if (effect === 'sparkle' && now > _nextSparkleTime) {
    _spawnSparkle(critter);
    _nextSparkleTime = now + 400 + Math.random() * 400; // every 0.4-0.8s
  }
  if (effect === 'heart' && now > _nextHeartTime) {
    _spawnHeart(critter);
    _nextHeartTime = now + 1200 + Math.random() * 1000; // every 1.2-2.2s
  }

  // Update & remove expired particles
  for (let i = _skinParticles.length - 1; i >= 0; i--) {
    const p = _skinParticles[i];
    const age = now - p.born;
    const progress = age / p.life;
    if (progress >= 1) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
      p.gfx.destroy();
      _skinParticles.splice(i, 1);
      continue;
    }
    // Animate
    if (p.type === 'sparkle') {
      // Scale up then down, fade out
      const scale = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
      p.gfx.scale.set(scale * p.maxScale);
      p.gfx.alpha = 1 - progress * progress;
      p.gfx.rotation += 0.05;
    } else if (p.type === 'heart') {
      // Float upward and fade out
      p.gfx.y = p.startY - age * 0.06;
      p.gfx.alpha = 1 - progress;
      const scale = progress < 0.2 ? progress / 0.2 : 1;
      p.gfx.scale.set(scale * p.maxScale);
    }
  }
}

function _spawnSparkle(critter) {
  const g = new PIXI.Graphics();
  const size = 4 + Math.random() * 4;
  // Draw a 4-pointed star
  g.moveTo(0, -size);
  g.lineTo(size * 0.25, -size * 0.25);
  g.lineTo(size, 0);
  g.lineTo(size * 0.25, size * 0.25);
  g.lineTo(0, size);
  g.lineTo(-size * 0.25, size * 0.25);
  g.lineTo(-size, 0);
  g.lineTo(-size * 0.25, -size * 0.25);
  g.closePath();
  g.fill({ color: 0xfffde0, alpha: 1 });
  g.stroke({ width: 1, color: 0xffd700, alpha: 0.8 });

  // Random position on the critter
  const bw = critter.width * 0.6;
  const bh = critter.height * 0.6;
  g.position.set(
    -bw / 2 + Math.random() * bw,
    -bh / 2 + Math.random() * bh - critter.height * 0.1
  );
  g.scale.set(0);
  critter.addChild(g);

  _skinParticles.push({
    gfx: g,
    type: 'sparkle',
    born: Date.now(),
    life: 500 + Math.random() * 300,
    maxScale: 0.8 + Math.random() * 0.6,
    startY: g.y,
  });
}

function _spawnHeart(critter) {
  const heart = new PIXI.Text({
    text: '\u2764',
    style: {
      fontSize: 10 + Math.random() * 6,
      fill: '#ff4070',
    },
  });
  heart.anchor.set(0.5);
  const bw = critter.width * 0.5;
  const startY = -critter.height * 0.1 + Math.random() * critter.height * 0.3;
  heart.position.set(
    -bw / 2 + Math.random() * bw,
    startY
  );
  heart.scale.set(0);
  critter.addChild(heart);

  _skinParticles.push({
    gfx: heart,
    type: 'heart',
    born: Date.now(),
    life: 800 + Math.random() * 400,
    maxScale: 0.8 + Math.random() * 0.4,
    startY: startY,
  });
}

// Clean up all skin particles (call on character swap)
export function clearSkinEffects() {
  for (const p of _skinParticles) {
    if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    p.gfx.destroy();
  }
  _skinParticles.length = 0;
}
