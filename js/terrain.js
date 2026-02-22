import state from './state.js';

// --- Container refs (set via initTerrain) ---
let _ground = null;
let _decor = null;
let _decorFG = null;
let _groundHeight = 0;
let _foregroundWidth = 0;

// --- Seeded random for consistent positions across redraws ---
let _endlessGroundSeed = 12345;
function endlessGroundRandom() {
  _endlessGroundSeed = (_endlessGroundSeed * 16807 + 0) % 2147483647;
  return (_endlessGroundSeed & 0x7fffffff) / 2147483647;
}

// --- Terrain wave constants ---
const terrainWaveFreq1 = 0.0004;
const terrainWaveFreq2 = 0.0011;
const terrainWaveAmp = 14;

// --- Weather-based color palettes ---
const endlessGroundPalettes = {
  sun:  { base: 0x4a8c3f, dirt: 0x6b5234, path: 0xc4a66a, grass: 0x5cb350, variation: 0x3f7a35,
          rock: 0x8a8078, rockShade: 0x6b6058, trunk: 0x6b4226, canopy: [0xd4442a, 0xe06830, 0xcc3322, 0x44a040, 0x389030], flower: 0xe8c840 },
  rain: { base: 0x3b6b35, dirt: 0x4a3d2a, path: 0x7a6b50, grass: 0x2d5a28, variation: 0x335e2e,
          rock: 0x606060, rockShade: 0x484848, trunk: 0x4a3520, canopy: [0x1e4a1e, 0x2a5a2a, 0x1a3e1a], flower: 0x5a7a5a },
  wind: { base: 0xc9a46b, dirt: 0x8a673f, path: 0xe0bf86, grass: 0xb28a52, variation: 0xb7905b,
          rock: 0x9f8b73, rockShade: 0x7f6f5c, trunk: 0x7a5530, canopy: [0x8a7a42, 0xa38f52, 0x6f6436, 0xc59a45], flower: 0xd6b06a },
  snow: { base: 0xd4dce6, dirt: 0x8a8a90, path: 0xb0b5bc, grass: 0xe8eef5, variation: 0xc0c8d4,
          rock: 0xa8aab0, rockShade: 0x8a8c92, trunk: 0x5a4a3a, canopy: [0x2a5a3a, 0x1a4a2a, 0xc8d8e0], flower: 0xd0dae0 },
  night: { base: 0x1a2e1a, dirt: 0x2a2218, path: 0x3a3528, grass: 0x1e3a1e, variation: 0x162a16,
           rock: 0x4a4a50, rockShade: 0x3a3a40, trunk: 0x3a2a18, canopy: [0x142a14, 0x1a3a1a, 0x0e200e], flower: 0x3a3a50 },
};

/**
 * Initialize terrain with PIXI container references from main.js.
 * Call again after biome transitions when containers are replaced.
 */
export function initTerrain(ground, decor, decorFG, height, foregroundWidth) {
  _ground = ground;
  _decor = decor;
  _decorFG = decorFG;
  _groundHeight = height;
  _foregroundWidth = foregroundWidth;
}

/**
 * Helper to get the curving top-edge Y offset at a given x position.
 */
export function terrainTopY(x) {
  return Math.sin(x * terrainWaveFreq1) * terrainWaveAmp
       + Math.sin(x * terrainWaveFreq2) * terrainWaveAmp * 0.5;
}

export function drawEndlessGround(weather, skyWeather = weather) {
  const palette = endlessGroundPalettes[weather] || endlessGroundPalettes.sun;
  const g = _ground;
  const w = state.gameMode === 'endless' ? 50000 : Math.ceil(_foregroundWidth);
  const h = _groundHeight;
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

  // Low detail: skip rocks, pebbles, grass, and tree/rock decor
  if (state.detailMode === 'low') {
    if (_decor) _decor.removeChildren();
    if (_decorFG) _decorFG.removeChildren();
    return;
  }

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

  // 7-9. Vegetation passes (skip in desert/wind biome).
  if (weather !== 'wind') {
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
  }

  // -- Draw trees/rocks into the decor container (above ground line) --
  if (_decor) {
    _decor.removeChildren();
  }
  if (_decorFG) {
    _decorFG.removeChildren();
  }
  drawEndlessGroundDecor(weather, palette, h, skyWeather);
}

function drawEndlessGroundDecor(weather, palette, groundH, skyWeather = weather) {
  if (!_decor) return;
  const d = new PIXI.Graphics();
  const w = 50000;
  const isNightSky = skyWeather === 'night';

  // Trees — behind the walking area (positioned on the curving terrain)
  _endlessGroundSeed = 33333;
  let tx = 120;
  while (tx < w) {
    const treeType = endlessGroundRandom();
    const treeScale = 0.5 + endlessGroundRandom() * 0.9; // wider range: 0.5x to 1.4x
    const trunkH = (30 + endlessGroundRandom() * 25) * treeScale;
    const trunkW = (6 + endlessGroundRandom() * 4) * treeScale;
    const canopyR = (18 + endlessGroundRandom() * 14) * treeScale;
    const depthOffset = endlessGroundRandom() * 22 * treeScale; // slight Y offset for depth
    const treeY = terrainTopY(tx) + depthOffset; // follow terrain curve + depth
    const canopyColor = palette.canopy[Math.floor(endlessGroundRandom() * palette.canopy.length)];
    // Derive dark canopy from the actual canopy color (darken by 40%) so base layer always matches
    const darkCanopy = ((canopyColor >> 16 & 0xff) * 0.6 | 0) << 16 | ((canopyColor >> 8 & 0xff) * 0.6 | 0) << 8 | ((canopyColor & 0xff) * 0.6 | 0);
    const darkTrunk = 0x2a1a0a;

    if (weather === 'wind') {
      if (treeType >= 0.72) {
        // Dry desert shrub.
        d.circle(tx, treeY - 4, 5 * treeScale).fill({ color: 0x7c6a3c, alpha: 0.8 });
        d.circle(tx - 4 * treeScale, treeY - 3, 3 * treeScale).fill({ color: 0x6d5f35, alpha: 0.75 });
        d.circle(tx + 4 * treeScale, treeY - 3, 3 * treeScale).fill({ color: 0x8f7a45, alpha: 0.75 });
        tx += 260 + endlessGroundRandom() * 420;
        continue;
      }
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
      // Solid base fill — covers entire canopy footprint so no sky peeks through
      d.ellipse(cx, cy - r * 0.4, r * 1.2, r * 1.1).fill({ color: darkCanopy });
      // Main body — cluster of overlapping circles
      d.circle(cx, cy - r * 0.4, r * 1.15).fill({ color: canopyColor });
      d.circle(cx - r * 0.65, cy - r * 0.1, r * 0.75).fill({ color: canopyColor });
      d.circle(cx + r * 0.65, cy - r * 0.1, r * 0.75).fill({ color: canopyColor });
      // Upper lobes
      d.circle(cx - r * 0.3, cy - r * 0.9, r * 0.6).fill({ color: canopyColor });
      d.circle(cx + r * 0.3, cy - r * 0.9, r * 0.6).fill({ color: canopyColor });
      d.circle(cx, cy - r * 1.1, r * 0.5).fill({ color: canopyColor });
      // Extra lobes for fullness
      d.circle(cx - r * 0.5, cy - r * 0.55, r * 0.5).fill({ color: canopyColor });
      d.circle(cx + r * 0.5, cy - r * 0.55, r * 0.5).fill({ color: canopyColor });
      d.circle(cx - r * 0.15, cy - r * 0.2, r * 0.65).fill({ color: canopyColor });
      d.circle(cx + r * 0.15, cy - r * 0.25, r * 0.6).fill({ color: canopyColor });
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
      d.ellipse(cx + lean, cy, canopyR * 1.05, canopyR * 1.3).fill({ color: canopyColor });
      // Drooping sub-ellipses
      d.ellipse(cx + lean - canopyR * 0.4, cy + canopyR * 0.6, canopyR * 0.4, canopyR * 0.55).fill({ color: canopyColor });
      d.ellipse(cx + lean + canopyR * 0.35, cy + canopyR * 0.5, canopyR * 0.35, canopyR * 0.5).fill({ color: canopyColor });
      d.ellipse(cx + lean, cy + canopyR * 0.7, canopyR * 0.3, canopyR * 0.4).fill({ color: canopyColor });
      // Darker depth underneath
      d.ellipse(cx + lean, cy + canopyR * 0.3, canopyR * 0.65, canopyR * 0.5).fill({ color: darkCanopy, alpha: 0.3 });
      // Moss dots on trunk
      d.circle(tx - trunkW * 0.3, treeY - trunkH * 0.4, 2.5 * treeScale).fill({ color: 0x446644, alpha: 0.5 });
      d.circle(tx + trunkW * 0.2, treeY - trunkH * 0.6, 2 * treeScale).fill({ color: 0x446644, alpha: 0.4 });
      // Drip detail below canopy
      d.circle(cx + lean - canopyR * 0.2, cy + canopyR * 1.1, 1.5).fill({ color: 0x6688bb, alpha: 0.4 });
      d.circle(cx + lean + canopyR * 0.15, cy + canopyR * 1.0, 1.2).fill({ color: 0x6688bb, alpha: 0.35 });
    } else if (isNightSky) {
      // Silhouette tree — dark canopy, no glow at base
      const cx = tx, cy = treeY - trunkH - canopyR * 0.5;
      d.circle(cx, cy, canopyR).fill({ color: canopyColor });
      d.circle(cx - canopyR * 0.3, cy + canopyR * 0.2, canopyR * 0.6).fill({ color: canopyColor });
      d.circle(cx + canopyR * 0.35, cy + canopyR * 0.15, canopyR * 0.55).fill({ color: canopyColor });
      d.circle(cx + canopyR * 0.1, cy - canopyR * 0.3, canopyR * 0.5).fill({ color: canopyColor });
    } else {
      // Default round tree — enhanced
      const cx = tx, cy = treeY - trunkH - canopyR * 0.5;
      // Dark underside for volume
      d.ellipse(cx, cy + canopyR * 0.35, canopyR * 0.9, canopyR * 0.5).fill({ color: darkCanopy });
      // Main circle
      d.circle(cx, cy, canopyR).fill({ color: canopyColor });
      // Side clusters — 4 overlapping
      d.circle(cx - canopyR * 0.3, cy + canopyR * 0.2, canopyR * 0.6).fill({ color: canopyColor });
      d.circle(cx + canopyR * 0.35, cy + canopyR * 0.15, canopyR * 0.55).fill({ color: canopyColor });
      d.circle(cx - canopyR * 0.5, cy - canopyR * 0.15, canopyR * 0.45).fill({ color: canopyColor });
      d.circle(cx + canopyR * 0.45, cy - canopyR * 0.2, canopyR * 0.5).fill({ color: canopyColor });
      // Highlight on top-left
      d.circle(cx - canopyR * 0.15, cy - canopyR * 0.35, canopyR * 0.4).fill({ color: 0xffffff, alpha: 0.1 });
    }

    tx += 300 + endlessGroundRandom() * 500;
  }

  // Bushes with berries (skip for desert/wind biome).
  if (weather !== 'wind') {
    _endlessGroundSeed = 22222;
    let bsx = 80;
    const berryColors = { sun: 0xcc2244, rain: 0x5544aa, wind: 0xddaa22, snow: 0x8844bb };
    const berryColor = berryColors[weather] || 0xcc2244;
    while (bsx < w) {
      const bushY = terrainTopY(bsx);
      const bushW = 16 + endlessGroundRandom() * 20;
      const bushH = 10 + endlessGroundRandom() * 12;
      // Bush body — overlapping circles
      d.circle(bsx, bushY - bushH * 0.5, bushW * 0.4).fill({ color: palette.canopy[0] });
      d.circle(bsx - bushW * 0.25, bushY - bushH * 0.3, bushW * 0.35).fill({ color: palette.canopy[Math.min(1, palette.canopy.length - 1)] });
      d.circle(bsx + bushW * 0.25, bushY - bushH * 0.3, bushW * 0.33).fill({ color: palette.canopy[0] });
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

  // Small flowers (sun only).
  if (weather === 'sun') {
    _endlessGroundSeed = 66666;
    let fx = 60;
    const flowerSpacing = 80;
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
  if (isNightSky) {
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
  if (isNightSky) {
    _endlessGroundSeed = 99333;
    let lnx = 900;
    while (lnx < w) {
      const lnY = terrainTopY(lnx);
      const sc = (0.8 + endlessGroundRandom() * 0.3) * 1.4;
      // Post
      d.rect(lnx - 2 * sc, lnY - 32 * sc, 4 * sc, 32 * sc)
        .fill({ color: 0x4a3a2a });
      // Cross beam at top
      d.rect(lnx - 6 * sc, lnY - 33 * sc, 12 * sc, 2 * sc)
        .fill({ color: 0x3a2a1a });
      // Lantern body — glass housing
      d.roundRect(lnx - 5 * sc, lnY - 42 * sc, 10 * sc, 10 * sc, 2)
        .fill({ color: 0x222222 });
      // Light inside
      d.roundRect(lnx - 4 * sc, lnY - 41 * sc, 8 * sc, 8 * sc, 1.5)
        .fill({ color: 0xffcc44, alpha: 0.9 });
      d.circle(lnx, lnY - 37 * sc, 3 * sc)
        .fill({ color: 0xffeedd, alpha: 0.8 });
      // Top cap
      d.rect(lnx - 6.5 * sc, lnY - 43 * sc, 13 * sc, 2.5 * sc)
        .fill({ color: 0x333333 });
      lnx += 1100 + endlessGroundRandom() * 1200;
    }
  }

  _decor.addChild(d);

  // --- Foreground decor (in front of character, semi-transparent for depth) ---
  // Container alpha controls overall transparency — shapes are opaque so overlapping circles don't show through
  if (_decorFG) {
    _decorFG.alpha = 0.5;
    const fg = new PIXI.Graphics();

    if (weather !== 'wind') {
      // FG trees — sparse, larger, dark silhouettes, positioned well below terrain line
      _endlessGroundSeed = 33334;
      let ftx = 800;
      while (ftx < w) {
        const sc = 1.6 + endlessGroundRandom() * 0.4;
        const trH = (30 + endlessGroundRandom() * 20) * sc;
        const trW = (6 + endlessGroundRandom() * 3) * sc;
        const cr = (18 + endlessGroundRandom() * 10) * sc;
        const fy = terrainTopY(ftx) + 55 + endlessGroundRandom() * 35;
        const col = isNightSky ? 0x0a150a : (weather === 'snow' ? 0x1a3a2a : palette.trunk);
        const canCol = isNightSky ? 0x0c1a0c : (weather === 'snow' ? 0x1a4a2a : palette.canopy[0]);
        // Trunk
        fg.moveTo(ftx - trW / 2, fy);
        fg.lineTo(ftx - trW * 0.35, fy - trH);
        fg.lineTo(ftx + trW * 0.35, fy - trH);
        fg.lineTo(ftx + trW / 2, fy);
        fg.closePath().fill({ color: col });
        // Canopy — opaque overlapping circles
        const cx = ftx, cy = fy - trH - cr * 0.5;
        fg.circle(cx, cy, cr).fill({ color: canCol });
        fg.circle(cx - cr * 0.4, cy + cr * 0.2, cr * 0.6).fill({ color: canCol });
        fg.circle(cx + cr * 0.4, cy + cr * 0.15, cr * 0.55).fill({ color: canCol });
        ftx += 1500 + endlessGroundRandom() * 1500;
      }

      // FG bushes — sparse, bigger, positioned lower
      _endlessGroundSeed = 22223;
      let fbx = 500;
      while (fbx < w) {
        const bw = (20 + endlessGroundRandom() * 20) * 1.5;
        const bh = (12 + endlessGroundRandom() * 10) * 1.5;
        const by = terrainTopY(fbx) + 45 + endlessGroundRandom() * 30;
        const canCol = isNightSky ? 0x0c1a0c : palette.canopy[0];
        fg.circle(fbx, by - bh * 0.4, bw * 0.4).fill({ color: canCol });
        fg.circle(fbx - bw * 0.2, by - bh * 0.25, bw * 0.3).fill({ color: canCol });
        fg.circle(fbx + bw * 0.2, by - bh * 0.25, bw * 0.28).fill({ color: canCol });
        fbx += 1000 + endlessGroundRandom() * 1000;
      }
    }

    // FG rocks — sparse, bigger, positioned lower
    _endlessGroundSeed = 44445;
    let frx = 1200;
    while (frx < w) {
      const rw = (18 + endlessGroundRandom() * 20) * 1.4;
      const rh = (12 + endlessGroundRandom() * 12) * 1.4;
      const ry = terrainTopY(frx) + 40 + endlessGroundRandom() * 25;
      fg.roundRect(frx, ry - rh * 0.4, rw, rh, rh * 0.35).fill({ color: palette.rock });
      frx += 2000 + endlessGroundRandom() * 2000;
    }

    _decorFG.addChild(fg);
  }
}

export { endlessGroundPalettes };
