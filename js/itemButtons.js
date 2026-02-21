// --- Item button wiring & layout ---
// Extracted from main.js — handles shield, bomb, rage, feather, golden bean, medkit buttons.

import state from './state.js';
import {
  getShieldCount, setShieldCount, getBombCount, setBombCount,
  getRageCount, setRageCount, getFeatherCount, setFeatherCount,
  getGoldenBeanCount, setGoldenBeanCount,
  getMedkitCount, setMedkitCount,
  getPlayerCurrentHealth, getPlayerHealth,
} from './state.js';
import { saveBones } from './save.js';
import { updatePlayerHealthBar } from './ui.js';
import {
  playShieldActivateSound,
  playRageSound, playGoldenBeanSound,
  playGoldenBeanFlyEffect,
  triggerAirstrike,
} from './combat.js';
import {
  setCurrentFrogHealth, setCurrentSnailHealth,
  setCurrentBirdHealth, setCurrentBeeHealth,
} from './characters.js';
import {
  getFrogHealth, getSnailHealth, getBirdHealth, getBeeHealth,
} from './state.js';

/** Stacks visible item buttons on the left side of the screen. */
export function repositionItemButtons() {
  const btnIds = ['shield-btn', 'bomb-btn', 'rage-btn', 'feather-btn', 'golden-bean-btn', 'medkit-btn'];
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

  if (visibleBtns.length === 0) return;

  const startTop = Math.max(screenH * 0.35, 80);
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

/**
 * Wire all 6 item button click handlers. Call once after critter/app are ready.
 * Also shows buttons for any starting items with count > 0.
 */
export function initItemButtons(critter, app) {
  const shieldBtn = document.getElementById('shield-btn');
  const bombBtn = document.getElementById('bomb-btn');
  const rageBtn = document.getElementById('rage-btn');
  const featherBtn = document.getElementById('feather-btn');
  const goldenBeanBtn = document.getElementById('golden-bean-btn');
  const medkitBtn = document.getElementById('medkit-btn');

  // Show buttons + counts for all starting items (only if count > 0)
  if (getShieldCount() > 0) { shieldBtn.style.display = 'flex'; document.getElementById('shield-count').textContent = getShieldCount(); }
  if (getBombCount() > 0) { bombBtn.style.display = 'flex'; document.getElementById('bomb-count').textContent = getBombCount(); }
  if (getRageCount() > 0) { rageBtn.style.display = 'flex'; document.getElementById('rage-count').textContent = getRageCount(); }
  if (getFeatherCount() > 0) { featherBtn.style.display = 'flex'; document.getElementById('feather-count').textContent = getFeatherCount(); }
  if (getGoldenBeanCount() > 0) { goldenBeanBtn.style.display = 'flex'; document.getElementById('golden-bean-count').textContent = getGoldenBeanCount(); }
  if (getMedkitCount() > 0) { medkitBtn.style.display = 'flex'; document.getElementById('medkit-count').textContent = getMedkitCount(); }
  repositionItemButtons();

  // Shield button handler
  shieldBtn.addEventListener('click', () => {
    if (getShieldCount() > 0 && !state.shieldActive) {
      setShieldCount(getShieldCount() - 1);
      state.startingItems.shield = Math.max(0, (state.startingItems.shield || 0) - 1);
      saveBones();
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
      state.startingItems.bomb = Math.max(0, (state.startingItems.bomb || 0) - 1);
      saveBones();
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
      state.startingItems.rage = Math.max(0, (state.startingItems.rage || 0) - 1);
      saveBones();
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
      state.startingItems.feather = Math.max(0, (state.startingItems.feather || 0) - 1);
      saveBones();
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
      state.startingItems.goldenBean = Math.max(0, (state.startingItems.goldenBean || 0) - 1);
      saveBones();
      document.getElementById('golden-bean-count').textContent = getGoldenBeanCount();
      goldenBeanBtn.classList.toggle('active', getGoldenBeanCount() > 0);
      if (getGoldenBeanCount() <= 0) { goldenBeanBtn.style.display = 'none'; }
      repositionItemButtons();
      playGoldenBeanFlyEffect(critter, 60);
      playGoldenBeanSound();
    }
  });

  // Medkit button handler — heals all crittors
  medkitBtn.addEventListener('click', () => {
    if (getMedkitCount() > 0) {
      setMedkitCount(getMedkitCount() - 1);
      state.startingItems.medkit = Math.max(0, (state.startingItems.medkit || 0) - 1);
      saveBones();
      document.getElementById('medkit-count').textContent = getMedkitCount();
      if (getMedkitCount() <= 0) { medkitBtn.style.display = 'none'; }
      repositionItemButtons();
      // Heal all 4 crittors by 40% of their max HP (use setters to update HP indicator bars)
      const healMap = [
        { cur: state.currentFrogHealth,  max: getFrogHealth(),  set: setCurrentFrogHealth },
        { cur: state.currentSnailHealth, max: getSnailHealth(), set: setCurrentSnailHealth },
        { cur: state.currentBirdHealth,  max: getBirdHealth(),  set: setCurrentBirdHealth },
        { cur: state.currentBeeHealth,   max: getBeeHealth(),   set: setCurrentBeeHealth },
      ];
      for (const h of healMap) {
        if (h.cur > 0) {
          h.set(Math.min(h.cur + Math.round(h.max * 0.4), h.max));
        }
      }
      updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
      // Green flash on critter
      critter.tint = 0x44FF44;
      setTimeout(() => { critter.tint = 0xFFFFFF; }, 300);
    }
  });
}
