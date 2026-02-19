// upgrades.js — Level up, stat upgrade system

import state from './state.js';
import {
  getCurrentCharacter,
  getPlayerCurrentHealth, getPlayerHealth, getisDead,
  setSpeedChanged,
  getCharEXP, getEXPtoLevel,
  setSnailSpeed, setBirdSpeed, setFrogSpeed, setBeeSpeed,
  setSnailHealth, setBirdHealth, setFrogHealth, setBeeHealth,
  setSnailDamage, setBirdDamage, setFrogDamage, setBeeDamage,
} from './state.js';
import { setCharEXP, setEXPtoLevel, setPlayerCurrentHealth, updateEXPIndicator, updateEXPIndicatorText } from './characters.js';
import { updatePlayerHealthBar, updateExpText } from './ui.js';

export function updateEXP(exp) {
  // Level up as many times as needed
  while (exp >= getEXPtoLevel(getCurrentCharacter())) {
    exp -= getEXPtoLevel(getCurrentCharacter());
    setEXPtoLevel(getCurrentCharacter(), getEXPtoLevel(getCurrentCharacter()) * 1.1);
    levelUp();
  }
  setCharEXP(getCurrentCharacter(), exp);
  const playerEXPBarFill = document.getElementById('exp-bar-fill');
  playerEXPBarFill.style.width = exp / getEXPtoLevel(getCurrentCharacter()) * 100 + '%';
  updateExpText('exp-text', 'exp', exp, getEXPtoLevel(getCurrentCharacter()));
}

export function setCharacterSpeed(currentCharacter, speed) {
  switch (currentCharacter) {
    case 'character-snail':
      setSnailSpeed(speed);
      break;
    case 'character-bird':
      setBirdSpeed(speed);
      break;
    case 'character-frog':
      setFrogSpeed(speed);
      break;
    case 'character-bee':
      setBeeSpeed(speed);
      break;
    default:
      console.log('Invalid character', currentCharacter);
  }
}

export function setCharacterHealth(currentCharacter, health) {
  switch (currentCharacter) {
    case 'character-snail':
      setSnailHealth(health);
      break;
    case 'character-bird':
      setBirdHealth(health);
      break;
    case 'character-frog':
      setFrogHealth(health);
      break;
    case 'character-bee':
      setBeeHealth(health);
      break;
    default:
      console.log('Invalid character', currentCharacter);
  }
}

export function setCharacterDamage(currentCharacter, attack) {
  switch (currentCharacter) {
    case 'character-snail':
      setSnailDamage(attack);
      break;
    case 'character-bird':
      setBirdDamage(attack);
      break;
    case 'character-frog':
      setFrogDamage(attack);
      break;
    case 'character-bee':
      setBeeDamage(attack);
      break;
    default:
      console.log('Invalid character', currentCharacter);
  }
}

export function levelUp() {
  state.leveling = true;
  const characterLevelElement = document.getElementById("character-level");

  // Function to update the character's level
  function updateCharacterLevel(level) {
    switch (getCurrentCharacter()) {
      case 'character-snail':
        level = state.snailLevel;
        break;
      case 'character-bird':
        level = state.birdLevel;
        break;
      case 'character-frog':
        level = state.frogLevel;
        break;
      case 'character-bee':
        level = state.beeLevel;
        break;
      default:
        console.log('Invalid character', getCurrentCharacter());
        return;
    }
    characterLevelElement.textContent = 'Lvl. ' + level;
  }

  // Determine which character is being leveled up
  switch (getCurrentCharacter()) {
    case 'character-snail':
      updateCharacterLevel(state.snailLevel++);
      break;
    case 'character-bird':
      updateCharacterLevel(state.birdLevel++);
      break;
    case 'character-frog':
      updateCharacterLevel(state.frogLevel++);
      break;
    case 'character-bee':
      updateCharacterLevel(state.beeLevel++);
      break;
    default:
      console.log('Invalid character');
      return;
  }

  // Auto-apply all 3 stat upgrades
  const stats = state.characterStats[state.currentCharacter];

  // Speed +0.15 (hidden stat — still applied but not displayed)
  stats.speed += 0.15;
  setCharacterSpeed(state.currentCharacter, stats.speed);
  setSpeedChanged(true);

  // Damage +2
  stats.attack += 2;
  setCharacterDamage(state.currentCharacter, stats.attack);

  // Health +12
  stats.health += 12;
  setCharacterHealth(state.currentCharacter, getPlayerHealth() + 12);
  if (!getisDead() && getPlayerCurrentHealth() > 0) {
    setPlayerCurrentHealth(getPlayerCurrentHealth() + 12);
  }
  updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);

  // Defense goes up with level — update charDefense and active defense
  const ch = state.currentCharacter.replace('character-', '');
  const newLevel = state[ch + 'Level'] || 1;
  const shopBonus = (state.charDefenseShop && state.charDefenseShop[ch]) || 0;
  if (state.charDefense) state.charDefense[ch] = newLevel + shopBonus;
  state.defense = newLevel + shopBonus;

  // Update attack + defense + speed infoboxes
  const shopDmg = (state.layoutUpgrades[ch] && state.layoutUpgrades[ch].damage) || 0;
  document.getElementById('swords-level').textContent = shopDmg > 0 ? `${stats.attack} (+${shopDmg})` : `${stats.attack}`;
  const defEl = document.getElementById('defense-level');
  defEl.textContent = shopBonus > 0 ? `${newLevel} (+${shopBonus})` : `${newLevel}`;
  const speed = ch === 'frog' ? state.speed : (state[ch + 'Speed'] || 1);
  const spdEl = document.getElementById('speed-level');
  if (spdEl) spdEl.textContent = speed.toFixed(1);

  state.leveling = false;

  state.chooseSound.volume = state.effectsVolume;
  state.chooseSound.play();
  state.levelSound.play();
}

// --- Shared Kill-Milestone Level System (Endless Mode) ---

export function checkSharedLevelUp() {
  const expectedLevel = Math.floor(state.endlessKillCount / 5) + 1;
  if (expectedLevel <= state.sharedLevel) return;

  const characters = ['frog', 'snail', 'bird', 'bee'];
  while (state.sharedLevel < expectedLevel) {
    state.sharedLevel++;
    // Apply stat gains to ALL 4 characters
    for (const ch of characters) {
      const charKey = 'character-' + ch;
      const stats = state.characterStats[charKey];

      // Speed +0.15
      stats.speed += 0.15;
      setCharacterSpeed(charKey, stats.speed);

      // Damage +2
      stats.attack += 2;
      setCharacterDamage(charKey, stats.attack);

      // Health +12
      stats.health += 12;
      setCharacterHealth(charKey, stats.health);

      // Increment level
      state[ch + 'Level'] = (state[ch + 'Level'] || 1) + 1;

      // Sync state speed property
      if (ch === 'frog') { state.speed = stats.speed; }
      else { state[ch + 'Speed'] = stats.speed; }
      state[ch + 'Damage'] = stats.attack;
      state[ch + 'Health'] = stats.health;

      // Heal current HP +12 if alive
      const hpKey = 'current' + ch.charAt(0).toUpperCase() + ch.slice(1) + 'Health';
      if (state[hpKey] > 0) {
        state[hpKey] = Math.min(state[hpKey] + 12, stats.health);
      }

      // Defense goes up with level
      const newLevel = state[ch + 'Level'] || 1;
      const shopBonus = (state.charDefenseShop && state.charDefenseShop[ch]) || 0;
      if (state.charDefense) state.charDefense[ch] = newLevel + shopBonus;

      // Update EXP indicator on portrait to show shared level
      updateEXPIndicator(charKey, state.endlessKillCount % 5, 5);
      updateEXPIndicatorText(charKey, newLevel);
    }

    // Update active character's defense
    const activeCh = getCurrentCharacter().replace('character-', '');
    state.defense = (state.charDefense && state.charDefense[activeCh]) || 0;

    // Update health bar for current character
    updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);

    // Update infobox UI
    const activeStats = state.characterStats[getCurrentCharacter()];
    const shopDmg = (state.layoutUpgrades[activeCh] && state.layoutUpgrades[activeCh].damage) || 0;
    document.getElementById('swords-level').textContent = shopDmg > 0 ? `${activeStats.attack} (+${shopDmg})` : `${activeStats.attack}`;
    const activeLevel = state[activeCh + 'Level'] || 1;
    const shopDef = (state.charDefenseShop && state.charDefenseShop[activeCh]) || 0;
    const defEl = document.getElementById('defense-level');
    defEl.textContent = shopDef > 0 ? `${activeLevel} (+${shopDef})` : `${activeLevel}`;
    const speed = activeCh === 'frog' ? state.speed : (state[activeCh + 'Speed'] || 1);
    const spdEl = document.getElementById('speed-level');
    if (spdEl) spdEl.textContent = speed.toFixed(1);
    const characterLevelElement = document.getElementById("character-level");
    if (characterLevelElement) characterLevelElement.textContent = 'Lvl. ' + activeLevel;

    // Play level-up sounds
    state.chooseSound.volume = state.effectsVolume;
    state.chooseSound.play();
    state.levelSound.play();
  }
  setSpeedChanged(true);
}

export function updateKillProgressBar() {
  const killsInLevel = state.endlessKillCount % 5;
  const playerEXPBarFill = document.getElementById('exp-bar-fill');
  playerEXPBarFill.style.width = (killsInLevel / 5) * 100 + '%';
  updateExpText('exp-text', 'Kills', killsInLevel, 5);

  // Update all character portrait EXP indicators
  const characters = ['frog', 'snail', 'bird', 'bee'];
  for (const ch of characters) {
    const charKey = 'character-' + ch;
    updateEXPIndicator(charKey, killsInLevel, 5);
    updateEXPIndicatorText(charKey, state[ch + 'Level'] || 1);
  }
}
