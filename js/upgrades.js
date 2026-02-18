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
import { setCharEXP, setEXPtoLevel, setPlayerCurrentHealth } from './characters.js';
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
  switch (state.currentCharacter) {
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
      console.log('Invalid character', state.currentCharacter);
  }
}

export function setCharacterHealth(currentCharacter, health) {
  switch (state.currentCharacter) {
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
      console.log('Invalid character', state.currentCharacter);
  }
}

export function setCharacterDamage(currentCharacter, attack) {
  switch (state.currentCharacter) {
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
      console.log('Invalid character', state.currentCharacter);
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
  document.getElementById("swords-level").textContent = stats.attack.toString();

  // Health +12
  stats.health += 12;
  setCharacterHealth(state.currentCharacter, getPlayerHealth() + 12);
  if (!getisDead() && getPlayerCurrentHealth() > 0) {
    setPlayerCurrentHealth(getPlayerCurrentHealth() + 12);
  }
  updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
  document.getElementById("heart-level").textContent = stats.health.toString();

  state.leveling = false;

  state.chooseSound.volume = state.effectsVolume;
  state.chooseSound.play();
  state.levelSound.play();
}
