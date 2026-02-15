// upgrades.js — Level up, stat upgrade system

import state from './state.js';
import {
  getCurrentCharacter, getSelectLevel, setSelectLevel,
  getPlayerCurrentHealth, getPlayerHealth, getisDead,
  setSpeedChanged,
  getCharEXP, getEXPtoLevel,
  setSnailSpeed, setBirdSpeed, setFrogSpeed, setBeeSpeed,
  setSnailHealth, setBirdHealth, setFrogHealth, setBeeHealth,
  setSnailDamage, setBirdDamage, setFrogDamage, setBeeDamage,
} from './state.js';
import { setCharEXP, setEXPtoLevel, setPlayerCurrentHealth } from './characters.js';
import { updatePlayerHealthBar, updateExpText } from './ui.js';

export function updateEXP(exp, expToLevel1) {
  let leftover = 0;
  if (exp >= getEXPtoLevel(getCurrentCharacter())) {
    leftover = exp - expToLevel1;
    setCharEXP(getCurrentCharacter(), leftover);
    setEXPtoLevel(getCurrentCharacter(), getEXPtoLevel(getCurrentCharacter() + expToLevel1) * 1.1);
    levelUp();

  }
  const playerEXPBarFill = document.getElementById('exp-bar-fill');
  playerEXPBarFill.style.width = getCharEXP(getCurrentCharacter()) / getEXPtoLevel(getCurrentCharacter()) * 100 + '%';
  updateExpText('exp-text', 'exp', getCharEXP(getCurrentCharacter()), getEXPtoLevel(getCurrentCharacter()));
}

export function animateUpgradeBoxes() {
  console.log("SLECT", getSelectLevel());
  if (state.isUpgradeBoxesAnimated) {
    return; // If already animated, exit the function
  }
  state.isUpgradeBoxesAnimated = true; // Set the flag to indicate animation has occurred
  const upgradeBoxes = document.querySelectorAll('.upgrade-box');
  upgradeBoxes.forEach((box) => {
    const classNames = box.classList;
    box.style.visibility = 'hidden'; // Hide all upgrade boxes initially

    if (
      classNames.contains('spd-upgrade') ||
      classNames.contains('hp-upgrade') ||
      classNames.contains('attack-upgrade')
    ) {
      box.style.visibility = 'visible'; // Make the first three upgrade boxes visible
    }

    box.style.animationPlayState = 'running';
    box.removeEventListener('click', box.clickHandler); // Remove previous event listener

    // Define the click event handler separately
    box.clickHandler = () => {
      const upgradeType = classNames[1];
      handleUpgrade(upgradeType);
      state.leveling = false;
    };

    box.addEventListener('click', box.clickHandler); // Add the updated event listener
  });
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

export function handleUpgrade(upgradeType) {
  const upgradeBoxes = document.getElementsByClassName('upgrade-box');

  // Get the current character
  const currentCharacter = getCurrentCharacter();

  // Get the stats for the current character
  const stats = state.characterStats[state.currentCharacter];

  // Handle different upgrade types
  switch (upgradeType) {
    case 'spd-upgrade':
      // Logic for speed upgrade
      console.log('Speed upgrade');
      var divElement = document.getElementById("lightning-level");

      stats.level++;
      // Update the display
      stats.speed += .25; // Update the speed stat for the current character
      setCharacterSpeed(state.currentCharacter, stats.speed);
      setSpeedChanged(true);
      divElement.textContent = stats.speed.toString();

      setSelectLevel(getSelectLevel() - 1);

      break;

    case 'attack-upgrade':
      // Logic for attack upgrade
      console.log('Attack upgrade');
      var divElement = document.getElementById("swords-level");
      stats.attack += 3; // Update the attack stat for the current character
      setCharacterDamage(state.currentCharacter, stats.attack);
      // Update the display with the new attack level
      divElement.textContent = stats.attack.toString();
      setSelectLevel(getSelectLevel() - 1);
      break;

    case 'hp-upgrade':
      // Logic for health upgrade
      console.log('Health upgrade');
      var divElement = document.getElementById("heart-level");
      stats.hp++;
      stats.health += 20; // Update the health stat for the current character
      console.log("YYcurrentCharacter", state.currentCharacter);
      console.log("YYN", getPlayerHealth() + 20);
      console.log("YYS", getPlayerCurrentHealth());
      if (!getisDead()) {
        if (getPlayerCurrentHealth() > 0) {
          setPlayerCurrentHealth(getPlayerCurrentHealth() + 20);
        }
      }
      setCharacterHealth(state.currentCharacter, getPlayerHealth() + 20);
      updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);

      divElement.textContent = stats.health.toString();

      setSelectLevel(getSelectLevel() - 1);

      break;

    default:
      console.log('Invalid upgrade type', upgradeType);
  }
  state.chooseSound.volume = state.effectsVolume;
  state.chooseSound.play();

  if (getSelectLevel() <= 0) {
    for (let i = 0; i < upgradeBoxes.length; i++) {
      upgradeBoxes[i].style.visibility = 'hidden';
    }
  }

  state.isUpgradeBoxesAnimated = false;
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

  setSelectLevel(getSelectLevel() + 1);
  animateUpgradeBoxes();
  state.levelSound.play();

}
