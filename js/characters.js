// characters.js — Character stats, health, EXP management

import state from './state.js';
import {
  getFrogHealth, getBeeHealth, getSnailHealth, getBirdHealth,
  getFrogSpeed, getBeeSpeed, getSnailSpeed, getBirdSpeed,
  getFrogDamage, getBeeDamage, getSnailDamage, getBirdDamage,
  getFrogLevel, getBeeLevel, getSnailLevel, getBirdLevel,
  setFrogSpeed, setBeeSpeed, setSnailSpeed, setBirdSpeed,
  setFrogDamage, setBeeDamage, setSnailDamage, setBirdDamage,
  setFrogHealth, setBeeHealth, setSnailHealth, setBirdHealth,
  getCurrentCharacter, getCharEXP, getEXPtoLevel, getCharLevel,
} from './state.js';

// --- Portrait flashing ---

export function startFlashing() {
  const portrait = document.getElementById('character-portrait');
  if (!state.isFlashing) {
    state.isFlashing = true;
    state.intervalId = setInterval(function () {
      portrait.classList.toggle("flash");
    }, 1500);
  }
}

export function stopFlashing() {
  const portrait = document.getElementById('character-portrait');
  if (state.isFlashing) {
    state.isFlashing = false;
    clearInterval(state.intervalId);
    portrait.classList.remove("flash");
  }
}

// --- Current health setters (with HP indicator DOM updates) ---

export function setCurrentFrogHealth(health) {
  state.currentFrogHealth = health;
  const frogHpIndicator = document.querySelector('.upgrade-box.character-frog .hp-indicator');
  const frogBox = document.querySelector('.upgrade-box.character-frog');

  frogHpIndicator.style.setProperty('--hp-indicator-height', `${(1 - (state.currentFrogHealth / getFrogHealth())) * 100}%`);

  if (state.currentFrogHealth <= 0) {
    frogBox.style.backgroundColor = 'grey';
    frogBox.style.pointerEvents = '';
  } else {
    frogBox.style.backgroundColor = '';
    frogBox.style.pointerEvents = '';
  }
}

export function setCurrentBeeHealth(health) {
  state.currentBeeHealth = health;
  const beeHpIndicator = document.querySelector('.upgrade-box.character-bee .hp-indicator');
  const beeBox = document.querySelector('.upgrade-box.character-bee');

  beeHpIndicator.style.setProperty('--hp-indicator-height', `${(1 - (state.currentBeeHealth / getBeeHealth())) * 100}%`);

  if (state.currentBeeHealth <= 0) {
    beeBox.style.backgroundColor = 'grey';
    beeBox.style.pointerEvents = '';
  } else {
    beeBox.style.backgroundColor = '';
    beeBox.style.pointerEvents = '';
  }
}

export function setCurrentSnailHealth(health) {
  state.currentSnailHealth = health;
  const snailHpIndicator = document.querySelector('.upgrade-box.character-snail .hp-indicator');
  const snailBox = document.querySelector('.upgrade-box.character-snail');

  snailHpIndicator.style.setProperty('--hp-indicator-height', `${(1 - (state.currentSnailHealth / getSnailHealth())) * 100}%`);

  if (state.currentSnailHealth <= 0) {
    snailBox.style.backgroundColor = 'grey';
    snailBox.style.pointerEvents = '';
  } else {
    snailBox.style.backgroundColor = '';
    snailBox.style.pointerEvents = '';
  }
}

export function setCurrentBirdHealth(health) {
  state.currentBirdHealth = health;
  const birdHpIndicator = document.querySelector('.upgrade-box.character-bird .hp-indicator');
  const birdBox = document.querySelector('.upgrade-box.character-bird');

  birdHpIndicator.style.setProperty('--hp-indicator-height', `${(1 - (state.currentBirdHealth / getBirdHealth())) * 100}%`);

  if (state.currentBirdHealth <= 0) {
    birdBox.style.backgroundColor = 'grey';
    birdBox.style.pointerEvents = '';
  } else {
    birdBox.style.backgroundColor = '';
    birdBox.style.pointerEvents = '';
  }
}

export function setPlayerCurrentHealth(value) {
  switch (getCurrentCharacter()) {
    case 'character-snail':
      setCurrentSnailHealth(value);
      break;
    case 'character-bird':
      setCurrentBirdHealth(value);
      break;
    case 'character-frog':
      setCurrentFrogHealth(value);
      break;
    case 'character-bee':
      setCurrentBeeHealth(value)
      break;
    default:
      console.log('Invalid character type');
  }
}

// --- EXP management ---

export function setEXPtoLevel(currentChar, value) {
  switch (currentChar) {
    case 'character-snail':
      state.snailEXPToLevel = value;
      break;
    case 'character-bird':
      state.birdEXPToLevel = value;
      break;
    case 'character-frog':
      state.frogEXPToLevel = value;
      break;
    case 'character-bee':
      state.beeEXPToLevel = value;
      break;
    default:
      state.frogEXPToLevel = value;
      break;
  }

  updateEXPIndicator(currentChar, getCharEXP(currentChar), getEXPtoLevel(currentChar), getCharLevel(currentChar));
}

export function setCharEXP(currentChar, value) {
  switch (currentChar) {
    case 'character-snail':
      state.snailEXP = value;
      break;
    case 'character-bird':
      state.birdEXP = value;
      break;
    case 'character-frog':
      state.frogEXP = value;
      break;
    case 'character-bee':
      state.beeEXP = value;
      break;
    default:
      state.frogEXP = value;
      break;
  }

  updateEXPIndicator(currentChar, getCharEXP(currentChar), getEXPtoLevel(currentChar));
}

export function updateEXPIndicator(character, currentEXP, maxEXP) {
  const expIndicator = document.querySelector(`.upgrade-box.${character} .exp-indicator`);
  const characterBox = document.querySelector(`.upgrade-box.${character}`);

  const heightPercentage = (1 - currentEXP / maxEXP) * 100;
  expIndicator.style.setProperty('--exp-indicator-height', `${heightPercentage}%`);
}

export function updateEXPIndicatorText(character, level) {
  const expIndicator = document.querySelector(`.upgrade-box.${character} .exp-indicator`);
  const levelElement = expIndicator.querySelector('.level');
  levelElement.textContent = `${level}`;
}

// --- Character info ---

export function getCharacterName(characterType) {
  switch (characterType) {
    case 'character-snail':
      return 'Snail';
    case 'character-bird':
      return 'Bird';
    case 'character-frog':
      return 'Frog';
    case 'character-bee':
      return 'Bee';
    default:
      console.log('Invalid character type', characterType);
      return '';
  }
}

export function getCharacterPortraitUrl(characterType) {
  switch (characterType) {
    case 'character-snail': return './assets/snailportrait.png';
    case 'character-bird': return './assets/birdportrait.png';
    case 'character-frog': return './assets/frogportrait.png';
    case 'character-bee': return './assets/beeportrait.png';
    default: return '';
  }
}

export function updateCharacterStats() {
  switch (state.selectedCharacter) {
    case 'character-snail':
      setSnailSpeed(getSnailSpeed());
      setSnailDamage(getSnailDamage());
      setSnailHealth(getSnailHealth());
      break;
    case 'character-bird':
      setBirdSpeed(getBirdSpeed());
      setBirdDamage(getBirdDamage());
      setBirdHealth(getBirdHealth());
      break;
    case 'character-frog':
      setFrogSpeed(getFrogSpeed());
      setFrogDamage(getFrogDamage());
      setFrogHealth(getFrogHealth());
      break;
    case 'character-bee':
      setBeeSpeed(getBeeSpeed());
      setBeeDamage(getBeeDamage());
      setBeeHealth(getBeeHealth());
      break;
    default:
      console.log('Invalid character type', state.selectedCharacter);
  }
}

// --- Character routing helpers ---

export function getCharacterDamage(currentCharacter) {
  switch (state.currentCharacter) {
    case 'character-snail':
      return getSnailDamage();
    case 'character-bird':
      return getBirdDamage();
    case 'character-frog':
      return getFrogDamage();
    case 'character-bee':
      return getBeeDamage();
    default:
      console.log('Invalid character', state.currentCharacter);
  }
}

export function updateCurrentLevels() {
  const characterLevelElement = document.getElementById("character-level");
  const updateLightning = document.getElementById("lightning-level");
  const updateHP = document.getElementById("heart-level");
  const updateDamage = document.getElementById("swords-level");
  let level;

  level = getSnailLevel();

  updateLightning.textContent = getSnailSpeed().toString();
  updateHP.textContent = getSnailHealth().toString();
  updateDamage.textContent = getSnailDamage().toString();

  level = getBirdLevel();
  console.log("DIRTY", level);
  updateLightning.textContent = getBirdSpeed().toString();
  updateHP.textContent = getBirdHealth().toString();
  updateDamage.textContent = getBirdDamage().toString();

  level = getFrogLevel();
  updateLightning.textContent = getFrogSpeed().toString();
  updateHP.textContent = getFrogHealth().toString();
  console.log("LOADER", getCharacterDamage('character-frog').toString());
  updateDamage.textContent = getCharacterDamage('character-frog').toString();
  characterLevelElement.textContent = 'Lvl. ' + level;
  state.isCharacterMenuOpen = false;

  level = getBeeLevel();
  updateLightning.textContent = getBeeSpeed().toString();
  updateHP.textContent = getBeeHealth().toString();
  updateDamage.textContent = getBeeDamage().toString();
}
