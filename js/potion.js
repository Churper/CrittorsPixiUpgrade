import state from './state.js';
import { getCoffee, getisDead, getPlayerHealth, getPlayerCurrentHealth } from './state.js';
import { setPlayerCurrentHealth } from './characters.js';
import { updatePlayerHealthBar } from './ui.js';
import { addCoffee, playPotionChugSound, playPotionBottleAnimation } from './combat.js';

let _critter = null;
let _app = null;

export function initPotion(critter, app) {
  _critter = critter;
  _app = app;
}

export function updatePotionUI() {
  const btn = document.getElementById('potion-button');
  if (!btn) return;
  if (getCoffee() < 20) {
    btn.classList.add('cant-afford');
  } else {
    btn.classList.remove('cant-afford');
  }
}

export function wirePotionListeners() {
  document.getElementById('potion-button').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (getisDead()) return;
    const isHurt = getPlayerCurrentHealth() < getPlayerHealth();
    if (!isHurt) return;
    if (getCoffee() < 20) return;

    addCoffee(-20);
    const healAmt = state.potionHealAmount || 70;
    setPlayerCurrentHealth(Math.min(getPlayerCurrentHealth() + healAmt, getPlayerHealth()));
    updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
    updatePotionUI();

    playPotionChugSound();
    playPotionBottleAnimation(_critter, _app);

    // Button bounce
    const icon = document.getElementById('potion-icon');
    icon.style.transform = 'scale(1.4)';
    icon.style.transition = 'transform 0.15s';
    setTimeout(() => { icon.style.transform = 'scale(0.9)'; }, 150);
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 300);
  });
}
