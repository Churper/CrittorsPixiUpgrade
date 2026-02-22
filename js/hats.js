import state from './state.js';

// Hat rendering — draws a hat graphic as a child of the critter sprite
let currentHatGraphic = null;

// Base hat position [x, y] in texture-space pixels from sprite center (walk frame 0 head)
// Pixel-analyzed from spritesheets: x = head center-of-mass X, y = head bulk-top Y
const _hatBasePos = {
  frog:  [0, -10],      // head roughly centered; lowered to sit on head
  snail: [-26, 100],    // head right of shell center; sits between eye stalks
  bird:  [-82, -150],   // crest left of center, near frame top
  bee:   [8, -38],      // shifted right and lower to sit on head
};

// Per-frame hat offsets [dx, dy] in texture-space pixels (added to base position)
// null = hide hat for that frame (e.g. snail shell-spin)
// All values pixel-analyzed from spritesheets using head center-of-mass & bulk-top
const _hatFrameDeltas = {
  frog: {
    // 10-frame hop: head rises 112px then drops 75px below baseline
    walk: [
      [0, 0],       // 0: standing baseline
      [0, -48],     // 1: rising
      [0, -83],     // 2: high
      [0, -105],    // 3: near peak
      [0, -112],    // 4: peak of hop
      [0, -104],    // 5: descending
      [0, -81],     // 6: mid descent
      [0, -43],     // 7: lower
      [0, 9],       // 8: near ground
      [0, 75],      // 9: tumble
    ],
    // 12-frame attack: head steady ~22px lower than walk baseline
    attack: [
      [0,22],[0,22],[0,22],[0,22],[0,22],[0,22],
      [0,22],[0,22],[0,22],[0,22],[0,22],[0,23],
    ],
  },
  snail: {
    // 20-frame slide: head drifts right then back, gentle Y bob (18px range)
    walk: [
      [0, 0],       // 0: baseline
      [0, -2],      // 1
      [4, -5],      // 2: head shifting right
      [12, -7],     // 3
      [20, -10],    // 4
      [24, -6],     // 5
      [26, -3],     // 6
      [28, 0],      // 7
      [30, 4],      // 8
      [32, 8],      // 9: rightmost
      [30, 9],      // 10
      [26, 9],      // 11
      [17, 7],      // 12: returning left
      [9, 5],       // 13
      [4, 4],       // 14
      [1, 3],       // 15
      [0, 2],       // 16
      [0, 1],       // 17
      [0, 0],       // 18
      [0, 0],       // 19: back to baseline
    ],
    // 20-frame shell-spin attack: hat hidden during spin + crystal effects
    attack: [
      [0, 0],       // 0: normal pose
      [0, 0],       // 1: shell glow starts
      null, null, null, null, null, null, null, null,  // 2-9: shell spin
      null, null, null, null, null, null, null, null,  // 10-17: spin + crystals
      null, null,   // 18-19: crystal aftermath
    ],
  },
  bird: {
    // 13-frame walk: smooth gentle Y bob, reduced amplitude
    walk: [
      [0, 0],       // 0: baseline
      [0, 1],       // 1
      [0, 3],       // 2
      [0, 5],       // 3: lowest step
      [0, 3],       // 4
      [0, 1],       // 5
      [0, 0],       // 6
      [0, 1],       // 7
      [0, 2],       // 8
      [0, 4],       // 9
      [0, 5],       // 10: lowest
      [0, 3],       // 11
      [0, 1],       // 12
    ],
    // 13-frame peck: smooth forward lean + hold + return
    attack: [
      [0, 4],       // 0: starting pose
      [8, 10],      // 1: leaning forward
      [18, 18],     // 2
      [28, 24],     // 3: near peak
      [33, 27],     // 4: peak
      [33, 27],     // 5: holding
      [33, 27],     // 6: holding
      [38, 27],     // 7: slight push
      [33, 27],     // 8: easing back
      [26, 22],     // 9
      [18, 16],     // 10: returning
      [9, 9],       // 11
      [0, 3],       // 12: back to neutral
    ],
  },
  bee: {
    // 9-frame hover: head stays nearly still, wings do the moving
    walk: [
      [0, 0],       // 0: baseline
      [0, 1],       // 1
      [0, 1],       // 2
      [0, 0],       // 3
      [0, 0],       // 4
      [0, 0],       // 5
      [0, 1],       // 6
      [0, 1],       // 7
      [0, 0],       // 8
    ],
    // 18-frame sting: smoothed lunge left then right
    attack: [
      [-10, -8],    // 0: winding up
      [-30, -16],   // 1: lunging left
      [-55, -32],   // 2
      [-75, -48],   // 3: deep lunge
      [-90, -56],   // 4: peak left lunge
      [-70, -44],   // 5: pulling back
      [-35, -28],   // 6: crossing center
      [5, -14],     // 7: swinging right
      [35, -28],    // 8
      [60, -42],    // 9
      [80, -52],    // 10: peak right lunge
      [65, -42],    // 11: returning
      [45, -32],    // 12
      [30, -22],    // 13
      [18, -14],    // 14
      [8, -8],      // 15: settling
      [4, -3],      // 16
      [0, 0],       // 17: back near rest
    ],
  },
};

export function applyHat(critterSprite, charType) {
  // Remove existing hat
  if (currentHatGraphic) {
    if (currentHatGraphic.parent) currentHatGraphic.parent.removeChild(currentHatGraphic);
    currentHatGraphic.destroy();
    currentHatGraphic = null;
  }
  // Clear previous frame-change handler
  if (critterSprite) critterSprite.onFrameChange = null;

  const charName = charType ? charType.replace('character-', '') : '';
  const hatId = state.equippedHats[charName];
  if (!hatId || !critterSprite) return;
  const pos = _hatBasePos[charName] || _hatBasePos.frog;
  const baseXOff = pos[0];
  const baseYOff = pos[1];

  if (hatId === 'tophat') {
    const hat = new PIXI.Graphics();
    // Wide brim with slight curve
    hat.roundRect(-32, -5, 64, 12, 5).fill({ color: 0x1a1a2e });
    hat.roundRect(-32, -3, 64, 4, 2).fill({ color: 0x222240 }); // brim highlight
    // Tall crown
    hat.roundRect(-22, -52, 44, 50, 4).fill({ color: 0x1a1a2e });
    // Silk sheen — vertical highlight strip
    hat.roundRect(-6, -50, 12, 46, 3).fill({ color: 0x2a2a4e, alpha: 0.5 });
    // Satin band with buckle
    hat.rect(-22, -14, 44, 8).fill({ color: 0x8b0000 });
    hat.rect(-22, -14, 44, 2).fill({ color: 0xaa2020, alpha: 0.4 }); // band highlight
    // Gold buckle
    hat.roundRect(-5, -16, 10, 12, 2).fill({ color: 0xFFD700 });
    hat.roundRect(-3, -14, 6, 8, 1).fill({ color: 0x1a1a2e });
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    critterSprite.addChild(hat);
    currentHatGraphic = hat;
  } else if (hatId === 'partyhat') {
    const hat = new PIXI.Graphics();
    // Festive cone party hat with colorful stripes
    // Main cone shape
    hat.moveTo(-28, 6);
    hat.lineTo(0, -42);
    hat.lineTo(28, 6);
    hat.closePath();
    hat.fill({ color: 0xDD2255 });
    // Stripe 1 — yellow band
    hat.moveTo(-22, -4); hat.lineTo(-10, -24); hat.lineTo(10, -24); hat.lineTo(22, -4);
    hat.closePath(); hat.fill({ color: 0xFFDD33 });
    // Stripe 2 — blue band
    hat.moveTo(-14, -18); hat.lineTo(-5, -32); hat.lineTo(5, -32); hat.lineTo(14, -18);
    hat.closePath(); hat.fill({ color: 0x3388FF });
    // Base rim — curled edge
    hat.ellipse(0, 6, 30, 6).fill({ color: 0xDD2255 });
    hat.ellipse(0, 6, 30, 4).fill({ color: 0xFF4477, alpha: 0.4 });
    // Pom-pom on top
    hat.circle(0, -42, 7).fill({ color: 0xFFFFFF });
    hat.circle(-2, -44, 4).fill({ color: 0xFFFFFF, alpha: 0.5 });
    hat.circle(2, -41, 3).fill({ color: 0xEEEEEE, alpha: 0.6 });
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    critterSprite.addChild(hat);
    currentHatGraphic = hat;
  } else if (hatId === 'crown') {
    const hat = new PIXI.Graphics();
    const gold = 0xFFD700;
    const darkGold = 0xDAA520;
    // Base band
    hat.roundRect(-32, -2, 64, 14, 3).fill({ color: gold });
    hat.roundRect(-32, -2, 64, 14, 3).stroke({ width: 1, color: darkGold });
    // Five pointed peaks
    hat.moveTo(-32, -2);
    hat.lineTo(-24, -28);
    hat.lineTo(-16, -6);
    hat.lineTo(-8, -32);
    hat.lineTo(0, -6);
    hat.lineTo(8, -34);
    hat.lineTo(16, -6);
    hat.lineTo(24, -28);
    hat.lineTo(32, -2);
    hat.closePath();
    hat.fill({ color: gold });
    hat.stroke({ width: 1.5, color: darkGold });
    // Jewels at peak tips
    hat.circle(-24, -26, 4).fill({ color: 0xff2244 });
    hat.circle(-8, -30, 4).fill({ color: 0x2266ff });
    hat.circle(8, -32, 5).fill({ color: 0xff2244 });
    hat.circle(24, -26, 4).fill({ color: 0x2266ff });
    // Center gem on band
    hat.circle(0, 5, 5).fill({ color: 0x22dd66 });
    hat.circle(0, 5, 5).stroke({ width: 1, color: darkGold });
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    critterSprite.addChild(hat);
    currentHatGraphic = hat;
  } else if (hatId === 'wizardhat') {
    const hat = new PIXI.Graphics();
    const purple = 0x6A0DAD;
    const darkPurple = 0x4B0082;
    // Wide brim
    hat.ellipse(0, 0, 42, 10).fill({ color: purple });
    hat.ellipse(0, 0, 42, 10).stroke({ width: 1.5, color: darkPurple });
    // Tall cone body (slightly bent)
    hat.moveTo(-28, 0);
    hat.lineTo(-4, -70);
    hat.lineTo(8, -72);
    hat.lineTo(28, 0);
    hat.closePath();
    hat.fill({ color: purple });
    hat.stroke({ width: 1.5, color: darkPurple });
    // Gold band at base of cone
    hat.rect(-26, -8, 52, 8).fill({ color: 0xFFD700, alpha: 0.8 });
    // Star on front
    const sx = 2, sy = -36;
    hat.moveTo(sx, sy - 12);
    hat.lineTo(sx + 4, sy - 4);
    hat.lineTo(sx + 12, sy - 3);
    hat.lineTo(sx + 6, sy + 3);
    hat.lineTo(sx + 8, sy + 11);
    hat.lineTo(sx, sy + 6);
    hat.lineTo(sx - 8, sy + 11);
    hat.lineTo(sx - 6, sy + 3);
    hat.lineTo(sx - 12, sy - 3);
    hat.lineTo(sx - 4, sy - 4);
    hat.closePath();
    hat.fill({ color: 0xFFD700 });
    hat.stroke({ width: 1, color: 0xDAA520 });
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    critterSprite.addChild(hat);
    currentHatGraphic = hat;
  } else if (hatId === 'viking') {
    const hat = new PIXI.Graphics();
    const steel = 0x8899AA;
    const darkSteel = 0x556677;
    const horn = 0xE8D5A0;
    const darkHorn = 0xC4AA6A;
    // Helmet dome
    hat.ellipse(0, -14, 30, 22).fill({ color: steel });
    hat.ellipse(0, -14, 30, 22).stroke({ width: 1.5, color: darkSteel });
    // Nose guard
    hat.roundRect(-4, -12, 8, 24, 2).fill({ color: darkSteel });
    // Brim band
    hat.roundRect(-32, -4, 64, 10, 3).fill({ color: darkSteel });
    hat.roundRect(-32, -4, 64, 10, 3).stroke({ width: 1, color: 0x445566 });
    // Rivets on band
    hat.circle(-22, 1, 3).fill({ color: 0xAABBCC });
    hat.circle(-10, 1, 3).fill({ color: 0xAABBCC });
    hat.circle(10, 1, 3).fill({ color: 0xAABBCC });
    hat.circle(22, 1, 3).fill({ color: 0xAABBCC });
    // Left horn — curved outward
    hat.moveTo(-26, -8);
    hat.lineTo(-38, -30);
    hat.lineTo(-50, -52);
    hat.lineTo(-44, -54);
    hat.lineTo(-34, -34);
    hat.lineTo(-22, -14);
    hat.closePath();
    hat.fill({ color: horn });
    hat.stroke({ width: 1.5, color: darkHorn });
    // Right horn — curved outward
    hat.moveTo(26, -8);
    hat.lineTo(38, -30);
    hat.lineTo(50, -52);
    hat.lineTo(44, -54);
    hat.lineTo(34, -34);
    hat.lineTo(22, -14);
    hat.closePath();
    hat.fill({ color: horn });
    hat.stroke({ width: 1.5, color: darkHorn });
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    critterSprite.addChild(hat);
    currentHatGraphic = hat;
  } else if (hatId === 'halo') {
    const hat = new PIXI.Graphics();
    // Outer glow ring (larger, faint)
    hat.ellipse(0, -38, 34, 9).stroke({ width: 6, color: 0xFFD700, alpha: 0.2 });
    // Main golden ring
    hat.ellipse(0, -38, 28, 7).stroke({ width: 4, color: 0xFFD700, alpha: 0.9 });
    // Inner bright highlight
    hat.ellipse(0, -38, 22, 5).stroke({ width: 2, color: 0xFFF4B0, alpha: 0.7 });
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    critterSprite.addChild(hat);
    currentHatGraphic = hat;
  }

  // Wire up per-frame hat tracking so it follows the head through all animations
  const deltas = _hatFrameDeltas[charName];
  if (deltas && currentHatGraphic) {
    const hat = currentHatGraphic;
    const walkDeltas = deltas.walk;
    const attackDeltas = deltas.attack;

    // Helper: apply a single frame's offset
    function applyFrame(frameIndex) {
      if (!hat || hat.destroyed) return;
      const deltaArr = state.isAttackingChar ? attackDeltas : walkDeltas;
      const entry = deltaArr[frameIndex % deltaArr.length];
      if (entry === null) {
        // null = hide hat (e.g. snail shell spin — no head visible)
        hat.visible = false;
      } else {
        hat.visible = true;
        const dx = entry ? entry[0] : 0;
        const dy = entry ? entry[1] : 0;
        hat.position.set(baseXOff + dx, baseYOff + dy);
      }
    }

    // Apply for current frame immediately
    applyFrame(critterSprite.currentFrame);

    critterSprite.onFrameChange = applyFrame;
  }
}

// Standalone preview hat — creates hat on a sprite without touching the shared game hat
export function applyPreviewHat(sprite, charName, hatId) {
  // Remove any existing preview hat children
  for (let i = sprite.children.length - 1; i >= 0; i--) {
    if (sprite.children[i]._isPreviewHat) {
      sprite.removeChild(sprite.children[i]);
      sprite.children[i]?.destroy?.();
    }
  }
  if (!hatId || !sprite) return;
  const pos = _hatBasePos[charName] || _hatBasePos.frog;
  const baseXOff = pos[0];
  const baseYOff = pos[1];
  let hat = null;

  if (hatId === 'tophat') {
    hat = new PIXI.Graphics();
    hat.roundRect(-32, -5, 64, 12, 5).fill({ color: 0x1a1a2e });
    hat.roundRect(-32, -3, 64, 4, 2).fill({ color: 0x222240 });
    hat.roundRect(-22, -52, 44, 50, 4).fill({ color: 0x1a1a2e });
    hat.roundRect(-6, -50, 12, 46, 3).fill({ color: 0x2a2a4e, alpha: 0.5 });
    hat.rect(-22, -14, 44, 8).fill({ color: 0x8b0000 });
    hat.roundRect(-5, -16, 10, 12, 2).fill({ color: 0xFFD700 });
    hat.roundRect(-3, -14, 6, 8, 1).fill({ color: 0x1a1a2e });
  } else if (hatId === 'partyhat') {
    hat = new PIXI.Graphics();
    hat.moveTo(-28, 6); hat.lineTo(0, -42); hat.lineTo(28, 6); hat.closePath(); hat.fill({ color: 0xDD2255 });
    hat.moveTo(-22, -4); hat.lineTo(-10, -24); hat.lineTo(10, -24); hat.lineTo(22, -4); hat.closePath(); hat.fill({ color: 0xFFDD33 });
    hat.moveTo(-14, -18); hat.lineTo(-5, -32); hat.lineTo(5, -32); hat.lineTo(14, -18); hat.closePath(); hat.fill({ color: 0x3388FF });
    hat.ellipse(0, 6, 30, 6).fill({ color: 0xDD2255 });
    hat.circle(0, -42, 7).fill({ color: 0xFFFFFF });
    hat.circle(-2, -44, 4).fill({ color: 0xFFFFFF, alpha: 0.5 });
  } else if (hatId === 'crown') {
    hat = new PIXI.Graphics();
    hat.roundRect(-32, -2, 64, 14, 3).fill({ color: 0xFFD700 });
    hat.moveTo(-32, -2); hat.lineTo(-24, -28); hat.lineTo(-16, -6);
    hat.lineTo(-8, -32); hat.lineTo(0, -6); hat.lineTo(8, -34);
    hat.lineTo(16, -6); hat.lineTo(24, -28); hat.lineTo(32, -2);
    hat.closePath(); hat.fill({ color: 0xFFD700 });
    hat.circle(-24, -26, 4).fill({ color: 0xff2244 });
    hat.circle(-8, -30, 4).fill({ color: 0x2266ff });
    hat.circle(8, -32, 5).fill({ color: 0xff2244 });
    hat.circle(24, -26, 4).fill({ color: 0x2266ff });
    hat.circle(0, 5, 5).fill({ color: 0x22dd66 });
  } else if (hatId === 'wizardhat') {
    hat = new PIXI.Graphics();
    hat.ellipse(0, 0, 42, 10).fill({ color: 0x6A0DAD });
    hat.moveTo(-28, 0); hat.lineTo(-4, -70); hat.lineTo(8, -72);
    hat.lineTo(28, 0); hat.closePath(); hat.fill({ color: 0x6A0DAD });
    hat.rect(-26, -8, 52, 8).fill({ color: 0xFFD700, alpha: 0.8 });
  } else if (hatId === 'viking') {
    hat = new PIXI.Graphics();
    hat.ellipse(0, -14, 30, 22).fill({ color: 0x8899AA });
    hat.roundRect(-4, -12, 8, 24, 2).fill({ color: 0x556677 });
    hat.roundRect(-32, -4, 64, 10, 3).fill({ color: 0x556677 });
    hat.moveTo(-26, -8); hat.lineTo(-50, -52); hat.lineTo(-44, -54);
    hat.lineTo(-22, -14); hat.closePath(); hat.fill({ color: 0xE8D5A0 });
    hat.moveTo(26, -8); hat.lineTo(50, -52); hat.lineTo(44, -54);
    hat.lineTo(22, -14); hat.closePath(); hat.fill({ color: 0xE8D5A0 });
  } else if (hatId === 'halo') {
    hat = new PIXI.Graphics();
    hat.ellipse(0, -38, 34, 9).stroke({ width: 6, color: 0xFFD700, alpha: 0.2 });
    hat.ellipse(0, -38, 28, 7).stroke({ width: 4, color: 0xFFD700, alpha: 0.9 });
    hat.ellipse(0, -38, 22, 5).stroke({ width: 2, color: 0xFFF4B0, alpha: 0.7 });
  }

  if (hat) {
    hat._isPreviewHat = true;
    hat.position.set(baseXOff, baseYOff);
    hat.zIndex = 100;
    sprite.addChild(hat);
    // Wire frame tracking for walk animation
    const deltas = _hatFrameDeltas[charName];
    if (deltas) {
      const walkDeltas = deltas.walk;
      sprite.onFrameChange = (frame) => {
        const entry = walkDeltas[frame % walkDeltas.length];
        if (entry === null) { hat.visible = false; }
        else { hat.visible = true; hat.position.set(baseXOff + entry[0], baseYOff + entry[1]); }
      };
    }
  }
}
