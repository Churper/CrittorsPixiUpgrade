// skins.js — Skin catalog, HSL recoloring engine, texture generation, runtime effects

import state from './state.js';
import { getCurrentCharacter } from './state.js';

// ── Skin catalog ──────────────────────────────────────────────────────────────
export const skinCatalog = [
  // Frog skins
  { id: 'frog-ice',    icon: '🧊', name: 'Ice Frog',         cost: 3, charOnly: 'frog' },
  { id: 'frog-golden', icon: '✨', name: 'Silver Frog',       cost: 5, charOnly: 'frog' },
  { id: 'frog-cherry', icon: '🌸', name: 'Cherry Frog',      cost: 3, charOnly: 'frog' },
  { id: 'frog-pride',  icon: '🏳️‍⚧️', name: 'Pride Frog',       cost: 4, charOnly: 'frog' },
  { id: 'frog-poison', icon: '☠️', name: 'Poison Dart Frog', cost: 4, charOnly: 'frog' },
  // Snail skins
  { id: 'snail-crystal',   icon: '💎', name: 'Crystal Snail',   cost: 3, charOnly: 'snail' },
  { id: 'snail-magma',     icon: '🌋', name: 'Magma Snail',     cost: 4, charOnly: 'snail' },
  { id: 'snail-valentine', icon: '💝', name: 'Valentine Snail', cost: 4, charOnly: 'snail' },
  { id: 'snail-galaxy',    icon: '🌌', name: 'Galaxy Snail',    cost: 5, charOnly: 'snail' },
  // Bird skins
  { id: 'bird-phoenix', icon: '🔥', name: 'Phoenix Bird', cost: 5, charOnly: 'bird' },
  { id: 'bird-arctic',  icon: '❄️', name: 'Arctic Bird',  cost: 3, charOnly: 'bird' },
  { id: 'bird-moss',    icon: '🌿', name: 'Moss Bird',    cost: 3, charOnly: 'bird' },
  { id: 'bird-parrot',  icon: '🦜', name: 'Parrot Bird',  cost: 4, charOnly: 'bird' },
  // Bee skins
  { id: 'bee-neon',  icon: '☣️', name: 'Toxic Bee',  cost: 3, charOnly: 'bee' },
  { id: 'bee-royal', icon: '🪻', name: 'Orchid Bee', cost: 5, charOnly: 'bee' },
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
  // ── FROG (body green = hue 70-160) ──
  'frog-ice': [
    { from: 70, to: 160, targetFrom: 192, targetTo: 206, sat: 1.2, lit: 1.1, shine: 0.1 },
  ],
  'frog-golden': [
    // Silver: bright polished silver bar — high lightness, near-zero saturation, strong shine
    { from: 70, to: 160, targetFrom: 210, targetTo: 215, sat: 0.05, lit: 1.7, shine: 0.5 },
  ],
  'frog-cherry': [
    { from: 70, to: 160, targetFrom: 338, targetTo: 350, sat: 1.2, lit: 1.05 },
  ],
  'frog-pride': [
    // Handled specially in recolorSheet — vertical trans pride bands
    { from: 70, to: 160, targetFrom: 200, targetTo: 200, sat: 1.0, lit: 1.0 },
  ],
  'frog-poison': [
    // Deep cobalt blue poison dart frog
    { from: 70, to: 160, targetFrom: 215, targetTo: 230, sat: 1.45, lit: 0.95, shine: 0.1 },
  ],

  // ── SNAIL (shell = 140-334, extended to catch lower-back shell pixels) ──
  'snail-crystal': [
    { from: 140, to: 334, targetFrom: 180, targetTo: 196, sat: 1.15, lit: 1.15, shine: 0.15 },
    { from: 335, to: 360, targetFrom: 186, targetTo: 194, sat: 0.3, lit: 1.3 },
    { from: 0, to: 20, targetFrom: 186, targetTo: 194, sat: 0.3, lit: 1.3 },
    { from: 21, to: 37, targetFrom: 188, targetTo: 195, sat: 0.35, lit: 1.25 },
    { from: 38, to: 68, targetFrom: 198, targetTo: 208, sat: 0.45, lit: 1.08 },
  ],
  'snail-magma': [
    { from: 140, to: 334, targetFrom: 4, targetTo: 18, sat: 1.35, lit: 1.1 },
    { from: 21, to: 37, targetFrom: 8, targetTo: 14, sat: 1.1, lit: 1.05 },
    { from: 38, to: 68, targetFrom: 32, targetTo: 42, sat: 0.95, lit: 0.95 },
  ],
  'snail-valentine': [
    { from: 140, to: 334, targetFrom: 335, targetTo: 348, sat: 1.15, lit: 1.25 },
    { from: 335, to: 360, targetFrom: 320, targetTo: 330, sat: 1.2, lit: 1.0 },
    { from: 0, to: 20, targetFrom: 320, targetTo: 330, sat: 1.2, lit: 1.0 },
    { from: 21, to: 37, targetFrom: 332, targetTo: 342, sat: 1.05, lit: 1.15 },
    { from: 38, to: 68, targetFrom: 345, targetTo: 352, sat: 0.3, lit: 1.35 },
  ],
  'snail-galaxy': [
    // Deep space purple shell
    { from: 140, to: 334, targetFrom: 262, targetTo: 278, sat: 1.25, lit: 0.75, shine: 0.15 },
    { from: 335, to: 360, targetFrom: 268, targetTo: 276, sat: 0.85, lit: 0.82 },
    { from: 0, to: 20, targetFrom: 268, targetTo: 276, sat: 0.85, lit: 0.82 },
    // Body — cosmic teal to contrast purple shell
    { from: 21, to: 37, targetFrom: 175, targetTo: 190, sat: 0.9, lit: 0.85 },
    { from: 38, to: 68, targetFrom: 168, targetTo: 182, sat: 0.75, lit: 0.9 },
  ],

  // ── BIRD (body = 80-168, crest = 258-328) ──
  'bird-phoenix': [
    { from: 80, to: 168, targetFrom: 12, targetTo: 28, sat: 1.5, lit: 1.05, shine: 0.15 },
    { from: 258, to: 328, targetFrom: 2, targetTo: 10, sat: 1.35, lit: 0.9, shine: 0.08 },
  ],
  'bird-arctic': [
    { from: 80, to: 168, targetFrom: 196, targetTo: 210, sat: 1.0, lit: 1.2, shine: 0.15 },
    { from: 258, to: 328, targetFrom: 202, targetTo: 214, sat: 0.55, lit: 1.35 },
  ],
  'bird-moss': [
    // Lush forest green body, deep emerald crest
    { from: 80, to: 168, targetFrom: 100, targetTo: 125, sat: 1.1, lit: 0.82 },
    { from: 258, to: 328, targetFrom: 145, targetTo: 165, sat: 0.85, lit: 0.65 },
  ],
  'bird-parrot': [
    // Tropical scarlet body, golden yellow crest
    { from: 80, to: 168, targetFrom: 356, targetTo: 368, sat: 1.4, lit: 1.0 },
    { from: 258, to: 328, targetFrom: 48, targetTo: 56, sat: 1.3, lit: 1.1 },
  ],

  // ── BEE (yellow = 18-72) ──
  'bee-neon': [
    { from: 18, to: 72, targetFrom: 120, targetTo: 142, sat: 1.45, lit: 1.0 },
  ],
  'bee-royal': [
    { from: 18, to: 72, targetFrom: 270, targetTo: 286, sat: 1.25, lit: 0.82 },
  ],
};

// ── Spritesheet recoloring ────────────────────────────────────────────────────

function recolorSheet(baseTex, shifts, skinId, numFrames) {
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
  const isPride = skinId === 'frog-pride';
  const frameW = isPride && numFrames > 1 ? w / numFrames : w;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    let [hue, sat, lit] = _rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (sat < 0.08 || lit < 0.06 || lit > 0.94) continue;
    if (isPride) {
      // Trans pride flag via vertical X-position bands per frame
      const hN = ((hue % 360) + 360) % 360;
      if (hN >= 70 && hN <= 160) {
        const pixIdx = i / 4;
        const pixX = pixIdx % w;
        const xPct = (pixX % frameW) / frameW;
        // 5 vertical bands centered on body: blue / pink / white / pink / blue.
        // Slightly narrow the middle so outer blue reads stronger.
        if (xPct < 0.35 || xPct >= 0.65) {
          hue = 200; sat = 0.8; lit = Math.min(1, lit * 1.05 + 0.2);
        } else if (xPct < 0.45 || xPct >= 0.55) {
          hue = 340; sat = 0.7; lit = Math.min(1, lit * 1.1 + 0.15);
        } else {
          hue = 0; sat = 0.08; lit = Math.min(0.95, lit * 1.3 + 0.2);
        }
      }
    } else {
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
    const fp = _skinFrameParams[ch];
    const walkSheet = ch + '_walk';
    const atkSheet = ch + '_attack';
    const skinIds = Object.keys(skinHueConfigs).filter(id => id.startsWith(ch + '-'));
    for (const skinId of skinIds) {
      const shifts = skinHueConfigs[skinId];
      const recoloredWalk = recolorSheet(textures[walkSheet], shifts, skinId, fp.walk.n);
      const recoloredAtk = recolorSheet(textures[atkSheet], shifts, skinId, fp.attack.n);
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
  'snail-galaxy': 'sparkle',
};

export function updateSkinEffects(critter, now) {
  if (!critter || state.isPaused) return;

  const ch = getCurrentCharacter() ? getCurrentCharacter().replace('character-', '') : 'frog';
  const skinId = state.equippedSkins[ch];
  const effect = skinId ? _skinEffects[skinId] : null;

  // Spawn new particles
  if (effect === 'sparkle' && now > _nextSparkleTime) {
    _spawnSparkle(critter);
    _nextSparkleTime = now + 400 + Math.random() * 500; // every 0.4-0.9s
  }
  if (effect === 'heart' && now > _nextHeartTime) {
    _spawnHeart(critter);
    _nextHeartTime = now + 400 + Math.random() * 400; // every 0.4-0.8s
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
      p.gfx.y = p.startY - age * 0.05;
      p.gfx.alpha = 1 - progress;
      const scale = progress < 0.2 ? progress / 0.2 : 1;
      p.gfx.scale.set(scale * p.maxScale);
    }
  }
}

function _spawnSparkle(critter) {
  const g = new PIXI.Graphics();
  const size = 10 + Math.random() * 8;
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
  g.stroke({ width: 2, color: 0xffd700, alpha: 0.8 });

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
    life: 1100 + Math.random() * 600,
    maxScale: 1.5 + Math.random() * 1.0,
    startY: g.y,
  });
}

function _spawnHeart(critter) {
  const heart = new PIXI.Text({
    text: '\u2764',
    style: {
      fontSize: 22 + Math.random() * 10,
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
    life: 1000 + Math.random() * 500,
    maxScale: 1.5 + Math.random() * 1.0,
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
