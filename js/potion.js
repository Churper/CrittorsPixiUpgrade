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
  const fill = document.getElementById('potion-fill');
  const doseText = document.getElementById('potion-doses');
  const shop = document.getElementById('potion-shop');
  const doses = state.potionDoses || 0;
  const max = state.potionMaxDoses || 3;
  const fillPct = (doses / max) * 100;
  fill.style.height = fillPct + '%';
  doseText.textContent = doses > 0 ? doses + '/' + max : '';
  if (doses > 0) {
    btn.classList.add('filled');
  } else {
    btn.classList.remove('filled');
  }
  // Update shop button state
  shop.classList.remove('cant-afford', 'maxed');
  if (doses >= max) {
    shop.classList.add('maxed');
  } else if (getCoffee() < 20) {
    shop.classList.add('cant-afford');
  }
}

export function wirePotionListeners() {
  // Shop button — BUY a dose (20 coffee)
  document.getElementById('potion-shop').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const doses = state.potionDoses || 0;
    if (doses >= state.potionMaxDoses) return;
    if (getCoffee() < 20) return;

    addCoffee(-20);
    state.potionDoses = doses + 1;
    updatePotionUI();

    // Fill animation on potion
    const icon = document.getElementById('potion-icon');
    icon.style.transform = 'scale(1.3)';
    icon.style.transition = 'transform 0.2s';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
  });

  // Potion button — USE a dose (heal 70 HP)
  document.getElementById('potion-button').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (getisDead()) return; // Can't heal a dead character
    const doses = state.potionDoses || 0;
    const isHurt = getPlayerCurrentHealth() < getPlayerHealth();
    if (doses <= 0 || !isHurt) return;

    const healAmt = state.potionHealAmount || 70;
    setPlayerCurrentHealth(Math.min(getPlayerCurrentHealth() + healAmt, getPlayerHealth()));
    updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
    state.potionDoses--;
    updatePotionUI();

    // Chug sound + bottle animation at character
    playPotionChugSound();
    playPotionBottleAnimation(_critter, _app);

    // Button feedback
    const gulpText = document.getElementById('potion-icon');
    gulpText.style.transform = 'scale(1.4)';
    gulpText.style.transition = 'transform 0.15s';
    setTimeout(() => { gulpText.style.transform = 'scale(0.9)'; }, 150);
    setTimeout(() => { gulpText.style.transform = 'scale(1)'; }, 300);
  });
}
