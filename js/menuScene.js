// --- Menu background scene ---
// Extracted from main.js — pure Canvas 2D, no PIXI, no game state dependencies.

const menuCanvas = document.getElementById('menu-scene');
const mctx = menuCanvas.getContext('2d');
let menuAnimId = null;

// Snail sprite images — crossOrigin needed for canvas drawing from imgur
const snailFrames = [new Image(), new Image()];
snailFrames[0].crossOrigin = 'anonymous';
snailFrames[1].crossOrigin = 'anonymous';
snailFrames[0].src = 'https://i.imgur.com/shRbAl5.png';
snailFrames[1].src = 'https://i.imgur.com/r3DQaWf.png';
// Persistent snail state — survives resize
let snailX = -60;

export function initMenuScene() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  menuCanvas.width = w * dpr;
  menuCanvas.height = h * dpr;
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let seed = 42;
  function srand() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }

  // Stars — matching game's twinkle system (individual phase + speed per star)
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: srand() * w, y: srand() * h * 0.6,
      r: srand() * 1.6 + 0.5,
      baseAlpha: 0.15 + srand() * 0.35,
      twinkleSpeed: 0.008 + srand() * 0.012,
      twinklePhase: srand() * Math.PI * 2,
    });
  }
  // One prominent bright star with cross sparkle (like the game's mainStar)
  const brightStar = {
    x: w * 0.35, y: h * 0.1,
    twinkleSpeed: 0.04,
    twinklePhase: 0,
    coreR: Math.min(w, h) * 0.006,
  };

  // Moon — matching game style (bigger, brighter)
  const moonX = w * 0.8, moonY = h * 0.16, moonR = Math.min(w, h) * 0.07;

  // Mountains — lighter tones
  function genMountain(count, baseY, minH, maxH) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const cx = (i / (count - 1)) * (w + 200) - 100;
      pts.push({ x: cx, h: minH + srand() * (maxH - minH) });
    }
    return { pts, baseY };
  }
  const mtns = [
    { layer: genMountain(5, h * 0.62, h * 0.2, h * 0.35), color: '#141e2c', speed: 0.3 },
    { layer: genMountain(6, h * 0.68, h * 0.12, h * 0.24), color: '#182840', speed: 0.6 },
    { layer: genMountain(7, h * 0.74, h * 0.06, h * 0.16), color: '#1c3048', speed: 1.0 },
  ];

  // Ground
  const groundY = h * 0.78;

  // Trees
  const trees = [];
  for (let i = 0; i < 12; i++) {
    trees.push({ x: srand() * w * 1.1 - w * 0.05, h: 20 + srand() * 32, w: 12 + srand() * 16, trunk: 2.5 + srand() * 2 });
  }
  trees.sort((a, b) => a.h - b.h);

  // Clouds
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    clouds.push({ x: srand() * w, y: h * 0.08 + srand() * h * 0.22, w: 70 + srand() * 90, h: 18 + srand() * 14, speed: 5 + srand() * 8 });
  }

  // Two fires — positioned on ground left and right of center
  const fires = [
    { x: w * 0.18, phase: 0 },
    { x: w * 0.82, phase: Math.PI },
  ];
  const fireBaseR = Math.min(w, h) * 0.055;

  // Two tall lanterns — further out on each side, bigger light spread
  const lanterns = [
    { x: w * 0.06, phase: 1.2 },
    { x: w * 0.94, phase: 3.8 },
  ];
  const lanternR = Math.min(w, h) * 0.04;

  // Snail sizing
  const snailSpeed = w * 0.014;
  const snailSize = Math.min(w, h) * 0.1;
  let snailFrame = 0;
  let snailFrameTimer = 0;

  let t = 0;
  function drawFrame() {
    t += 0.016;
    mctx.clearRect(0, 0, w, h);

    // Sky gradient — slightly brighter night
    const skyGrd = mctx.createLinearGradient(0, 0, 0, h * 0.78);
    skyGrd.addColorStop(0, '#0c1222');
    skyGrd.addColorStop(0.4, '#12203a');
    skyGrd.addColorStop(1, '#1a3050');
    mctx.fillStyle = skyGrd;
    mctx.fillRect(0, 0, w, h * 0.78);

    // Stars — game-matching twinkle (per-star phase cycling)
    stars.forEach(s => {
      s.twinklePhase += s.twinkleSpeed;
      const a = s.baseAlpha * (0.5 + Math.sin(s.twinklePhase) * 0.5);
      mctx.beginPath();
      mctx.arc(s.x, s.y, s.r, 0, 6.28);
      mctx.fillStyle = `rgba(220, 230, 255, ${a})`;
      mctx.fill();
    });

    // Bright star with cross sparkle + glow pulse
    brightStar.twinklePhase += brightStar.twinkleSpeed;
    const bsA = 0.5 + Math.sin(brightStar.twinklePhase) * 0.5;
    const bsScale = 1 + Math.sin(brightStar.twinklePhase * 2) * 0.15;
    const bx = brightStar.x, by = brightStar.y, cr = brightStar.coreR * bsScale;
    // Outer glow
    mctx.globalAlpha = 0.06 * bsA;
    mctx.beginPath(); mctx.arc(bx, by, cr * 6, 0, 6.28);
    mctx.fillStyle = '#ddeeff'; mctx.fill();
    mctx.globalAlpha = 0.1 * bsA;
    mctx.beginPath(); mctx.arc(bx, by, cr * 4, 0, 6.28);
    mctx.fillStyle = '#ddeeff'; mctx.fill();
    // Cross sparkle
    mctx.globalAlpha = 0.4 * bsA;
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = 1;
    mctx.beginPath(); mctx.moveTo(bx, by - cr * 4); mctx.lineTo(bx, by + cr * 4); mctx.stroke();
    mctx.beginPath(); mctx.moveTo(bx - cr * 4, by); mctx.lineTo(bx + cr * 4, by); mctx.stroke();
    // Bright core
    mctx.globalAlpha = 0.9 * bsA;
    mctx.beginPath(); mctx.arc(bx, by, cr * 1.8, 0, 6.28);
    mctx.fillStyle = '#ffffff'; mctx.fill();
    mctx.globalAlpha = bsA;
    mctx.beginPath(); mctx.arc(bx, by, cr, 0, 6.28);
    mctx.fillStyle = '#ffffff'; mctx.fill();
    mctx.globalAlpha = 1;

    // Moon — game-matching with glow, body, craters, terminator
    // Outer glow layers
    const g3 = mctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4);
    g3.addColorStop(0, 'rgba(200, 220, 255, 0.12)');
    g3.addColorStop(0.5, 'rgba(200, 220, 255, 0.05)');
    g3.addColorStop(1, 'rgba(200, 220, 255, 0)');
    mctx.fillStyle = g3;
    mctx.beginPath(); mctx.arc(moonX, moonY, moonR * 4, 0, 6.28); mctx.fill();

    const g2 = mctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 2.2);
    g2.addColorStop(0, 'rgba(210, 225, 255, 0.18)');
    g2.addColorStop(1, 'rgba(210, 225, 255, 0)');
    mctx.fillStyle = g2;
    mctx.beginPath(); mctx.arc(moonX, moonY, moonR * 2.2, 0, 6.28); mctx.fill();

    // Moon body
    mctx.beginPath(); mctx.arc(moonX, moonY, moonR, 0, 6.28);
    mctx.fillStyle = '#e8e8f0'; mctx.fill();
    mctx.beginPath(); mctx.arc(moonX, moonY, moonR * 0.96, 0, 6.28);
    mctx.fillStyle = '#eeeef4'; mctx.fill();
    // Craters
    mctx.globalAlpha = 0.35;
    mctx.beginPath(); mctx.arc(moonX - moonR * 0.3, moonY - moonR * 0.23, moonR * 0.19, 0, 6.28);
    mctx.fillStyle = '#d0d0da'; mctx.fill();
    mctx.beginPath(); mctx.arc(moonX + moonR * 0.23, moonY - moonR * 0.38, moonR * 0.13, 0, 6.28);
    mctx.fillStyle = '#d4d4de'; mctx.fill();
    mctx.beginPath(); mctx.arc(moonX + moonR * 0.12, moonY + moonR * 0.3, moonR * 0.15, 0, 6.28);
    mctx.fillStyle = '#ccccda'; mctx.fill();
    mctx.globalAlpha = 0.15;
    // Terminator shadow
    mctx.beginPath(); mctx.arc(moonX + moonR * 0.3, moonY, moonR * 0.85, 0, 6.28);
    mctx.fillStyle = '#667788'; mctx.fill();
    // Bright highlight
    mctx.globalAlpha = 0.12;
    mctx.beginPath(); mctx.arc(moonX - moonR * 0.22, moonY - moonR * 0.3, moonR * 0.46, 0, 6.28);
    mctx.fillStyle = '#ffffff'; mctx.fill();
    mctx.globalAlpha = 1;

    // Clouds
    clouds.forEach(c => {
      const cx = ((c.x + t * c.speed) % (w + c.w * 2)) - c.w;
      mctx.beginPath();
      mctx.ellipse(cx, c.y, c.w * 0.5, c.h * 0.5, 0, 0, 6.28);
      mctx.ellipse(cx - c.w * 0.25, c.y + 2, c.w * 0.35, c.h * 0.4, 0, 0, 6.28);
      mctx.ellipse(cx + c.w * 0.28, c.y + 1, c.w * 0.38, c.h * 0.42, 0, 0, 6.28);
      mctx.fillStyle = 'rgba(35, 55, 80, 0.3)';
      mctx.fill();
    });

    // Mountains
    mtns.forEach(m => {
      const offset = Math.sin(t * 0.15) * m.speed * 4;
      mctx.beginPath();
      mctx.moveTo(-20, m.layer.baseY);
      m.layer.pts.forEach(p => { mctx.lineTo(p.x + offset, m.layer.baseY - p.h); });
      mctx.lineTo(w + 20, m.layer.baseY);
      mctx.closePath();
      mctx.fillStyle = m.color;
      mctx.fill();
    });

    // Ground
    const gndGrd = mctx.createLinearGradient(0, groundY, 0, h);
    gndGrd.addColorStop(0, '#15283a');
    gndGrd.addColorStop(1, '#0e1c28');
    mctx.fillStyle = gndGrd;
    mctx.fillRect(0, groundY, w, h - groundY);
    // Grass edge
    mctx.fillStyle = '#1e3a4e';
    mctx.fillRect(0, groundY, w, 2);

    // Trees
    trees.forEach(tr => {
      const tx = tr.x + Math.sin(t * 0.4 + tr.x * 0.01) * 0.5;
      mctx.fillStyle = '#0e1e2a';
      mctx.fillRect(tx - tr.trunk * 0.5, groundY - tr.h * 0.5, tr.trunk, tr.h * 0.5);
      mctx.beginPath();
      mctx.ellipse(tx, groundY - tr.h * 0.55, tr.w * 0.5, tr.h * 0.5, 0, 0, 6.28);
      mctx.fillStyle = '#142838';
      mctx.fill();
    });

    // Snail — drawn BEHIND fires/lanterns, bottom edge on ground
    snailX += snailSpeed * 0.016;
    if (snailX > w + snailSize) snailX = -snailSize;
    snailFrameTimer += 0.016;
    if (snailFrameTimer > 0.4) { snailFrameTimer = 0; snailFrame = (snailFrame + 1) % 2; }
    const img = snailFrames[snailFrame];
    if (img.complete && img.naturalWidth > 0) {
      mctx.globalAlpha = 0.5;
      mctx.drawImage(img, snailX, groundY - snailSize * 0.4, snailSize, snailSize);
      mctx.globalAlpha = 1;
    }

    // Fires — logs/stones static, only flames pulse
    fires.forEach(f => {
      const flicker = 0.7 + Math.sin(t * 5 + f.phase) * 0.2 + Math.sin(t * 11.5 + f.phase) * 0.1;
      const flamePulse = 0.9 + Math.sin(t * 3.5 + f.phase) * 0.15;
      const fy = groundY;
      const r = fireBaseR;

      // Wide ground light
      const groundGlow = mctx.createRadialGradient(f.x, fy, 0, f.x, fy, r * 10);
      groundGlow.addColorStop(0, `rgba(255, 150, 60, ${0.12 * flicker})`);
      groundGlow.addColorStop(0.4, `rgba(255, 120, 40, ${0.06 * flicker})`);
      groundGlow.addColorStop(1, 'rgba(255, 80, 20, 0)');
      mctx.fillStyle = groundGlow;
      mctx.beginPath(); mctx.arc(f.x, fy, r * 10, 0, 6.28); mctx.fill();

      // Big outer glow
      const fg = mctx.createRadialGradient(f.x, fy - r * 0.5, 0, f.x, fy - r * 0.5, r * 5);
      fg.addColorStop(0, `rgba(255, 140, 50, ${0.16 * flicker})`);
      fg.addColorStop(0.3, `rgba(255, 100, 30, ${0.08 * flicker})`);
      fg.addColorStop(1, 'rgba(255, 80, 20, 0)');
      mctx.fillStyle = fg;
      mctx.beginPath(); mctx.arc(f.x, fy - r * 0.5, r * 5, 0, 6.28); mctx.fill();

      // Mid glow
      const fg2 = mctx.createRadialGradient(f.x, fy - r * 0.6, 0, f.x, fy - r * 0.6, r * 2.5);
      fg2.addColorStop(0, `rgba(255, 180, 70, ${0.25 * flicker})`);
      fg2.addColorStop(1, 'rgba(255, 140, 50, 0)');
      mctx.fillStyle = fg2;
      mctx.beginPath(); mctx.arc(f.x, fy - r * 0.6, r * 2.5, 0, 6.28); mctx.fill();

      // Static campfire structure
      const logW = r * 1.2, logH = r * 0.22;
      mctx.save();
      mctx.translate(f.x, fy);
      mctx.save(); mctx.rotate(-0.35);
      mctx.fillStyle = '#2a1a0e';
      mctx.fillRect(-logW * 0.6, -logH * 0.5, logW, logH);
      mctx.fillStyle = '#3a2418';
      mctx.fillRect(-logW * 0.55, -logH * 0.3, logW * 0.9, logH * 0.6);
      mctx.restore();
      mctx.save(); mctx.rotate(0.35);
      mctx.fillStyle = '#2a1a0e';
      mctx.fillRect(-logW * 0.4, -logH * 0.5, logW, logH);
      mctx.fillStyle = '#3a2418';
      mctx.fillRect(-logW * 0.35, -logH * 0.3, logW * 0.9, logH * 0.6);
      mctx.restore();
      mctx.fillStyle = '#3a3a40';
      for (let si = 0; si < 6; si++) {
        const sa = (si / 6) * 6.28;
        mctx.beginPath(); mctx.ellipse(Math.cos(sa) * r * 0.55, Math.sin(sa) * r * 0.2, r * 0.12, r * 0.08, 0, 0, 6.28); mctx.fill();
      }
      mctx.restore();

      // Flames only pulse
      const flameR = r * flamePulse;
      const flameH = flameR * 1.6;
      mctx.save();
      mctx.translate(f.x, fy - r * 0.1);
      mctx.beginPath();
      mctx.moveTo(-flameR * 0.35, 0);
      mctx.quadraticCurveTo(-flameR * 0.15, -flameH * 0.6, flameR * 0.05 + Math.sin(t * 8 + f.phase) * flameR * 0.12, -flameH);
      mctx.quadraticCurveTo(flameR * 0.2, -flameH * 0.5, flameR * 0.35, 0);
      mctx.closePath();
      mctx.fillStyle = `rgba(255, 120, 20, ${0.75 * flicker})`;
      mctx.fill();
      mctx.beginPath();
      mctx.moveTo(-flameR * 0.17, 0);
      mctx.quadraticCurveTo(-flameR * 0.06, -flameH * 0.5, flameR * 0.02 + Math.sin(t * 12 + f.phase) * flameR * 0.07, -flameH * 0.7);
      mctx.quadraticCurveTo(flameR * 0.1, -flameH * 0.35, flameR * 0.17, 0);
      mctx.closePath();
      mctx.fillStyle = `rgba(255, 210, 70, ${0.85 * flicker})`;
      mctx.fill();
      mctx.restore();

      // Ground light pool
      mctx.globalAlpha = 0.14 * flicker;
      const poolGrd = mctx.createRadialGradient(f.x, groundY + 4, 0, f.x, groundY + 4, r * 8);
      poolGrd.addColorStop(0, '#ffaa55');
      poolGrd.addColorStop(1, 'rgba(255, 140, 50, 0)');
      mctx.fillStyle = poolGrd;
      mctx.fillRect(f.x - r * 8, groundY, r * 16, h - groundY);
      mctx.globalAlpha = 1;
    });

    // Lanterns — tall posts with cool white glow
    lanterns.forEach(ln => {
      const flicker = 0.75 + Math.sin(t * 4 + ln.phase) * 0.15 + Math.sin(t * 9 + ln.phase) * 0.1;
      const fy = groundY;
      const postH = lanternR * 7;
      const lampY = fy - postH;

      // Wide ambient glow — cool white
      const lg = mctx.createRadialGradient(ln.x, lampY, 0, ln.x, lampY, lanternR * 14);
      lg.addColorStop(0, `rgba(220, 230, 255, ${0.1 * flicker})`);
      lg.addColorStop(0.3, `rgba(200, 215, 240, ${0.05 * flicker})`);
      lg.addColorStop(1, 'rgba(180, 200, 230, 0)');
      mctx.fillStyle = lg;
      mctx.beginPath(); mctx.arc(ln.x, lampY, lanternR * 14, 0, 6.28); mctx.fill();

      // Mid glow — white
      const lg2 = mctx.createRadialGradient(ln.x, lampY, 0, ln.x, lampY, lanternR * 5);
      lg2.addColorStop(0, `rgba(230, 240, 255, ${0.2 * flicker})`);
      lg2.addColorStop(1, 'rgba(210, 225, 245, 0)');
      mctx.fillStyle = lg2;
      mctx.beginPath(); mctx.arc(ln.x, lampY, lanternR * 5, 0, 6.28); mctx.fill();

      // Post — tall dark iron
      const postW = lanternR * 0.25;
      mctx.fillStyle = '#18181c';
      mctx.fillRect(ln.x - postW * 0.5, lampY + lanternR * 0.5, postW, postH - lanternR * 0.5);
      // Cross brace near top
      mctx.fillRect(ln.x - lanternR * 0.35, lampY + lanternR * 1.2, lanternR * 0.7, postW * 0.6);

      // Lamp housing — glass box
      mctx.fillStyle = 'rgba(30, 35, 45, 0.8)';
      mctx.fillRect(ln.x - lanternR * 0.45, lampY - lanternR * 0.35, lanternR * 0.9, lanternR * 0.9);
      // Glass highlight edges
      mctx.strokeStyle = 'rgba(150, 170, 200, 0.3)';
      mctx.lineWidth = 1;
      mctx.strokeRect(ln.x - lanternR * 0.45, lampY - lanternR * 0.35, lanternR * 0.9, lanternR * 0.9);

      // Cap / roof
      mctx.beginPath();
      mctx.moveTo(ln.x - lanternR * 0.6, lampY - lanternR * 0.35);
      mctx.lineTo(ln.x, lampY - lanternR * 0.9);
      mctx.lineTo(ln.x + lanternR * 0.6, lampY - lanternR * 0.35);
      mctx.closePath();
      mctx.fillStyle = '#22222a';
      mctx.fill();

      // Lamp glow core — bright white
      mctx.beginPath();
      mctx.arc(ln.x, lampY + lanternR * 0.1, lanternR * 0.3, 0, 6.28);
      mctx.fillStyle = `rgba(240, 245, 255, ${0.8 * flicker})`;
      mctx.fill();
      mctx.beginPath();
      mctx.arc(ln.x, lampY + lanternR * 0.1, lanternR * 0.15, 0, 6.28);
      mctx.fillStyle = `rgba(255, 255, 255, ${0.9 * flicker})`;
      mctx.fill();

      // Ground light pool — cool white
      mctx.globalAlpha = 0.1 * flicker;
      const lPool = mctx.createRadialGradient(ln.x, groundY + 2, 0, ln.x, groundY + 2, lanternR * 12);
      lPool.addColorStop(0, '#dde6ff');
      lPool.addColorStop(1, 'rgba(200, 215, 240, 0)');
      mctx.fillStyle = lPool;
      mctx.fillRect(ln.x - lanternR * 12, groundY, lanternR * 24, h - groundY);
      mctx.globalAlpha = 1;
    });

    menuAnimId = requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

window.addEventListener('resize', () => { if (menuAnimId) { cancelAnimationFrame(menuAnimId); initMenuScene(); } });

export function stopMenuScene() {
  if (menuAnimId) { cancelAnimationFrame(menuAnimId); menuAnimId = null; }
}
