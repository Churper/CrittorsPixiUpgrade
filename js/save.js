// save.js — Save/load game to localStorage

import state from './state.js';
import {
  getSnailLevel, getBirdLevel, getFrogLevel, getBeeLevel,
  getSnailSpeed, getBirdSpeed, getFrogSpeed, getBeeSpeed,
  getSnailHealth, getBirdHealth, getFrogHealth, getBeeHealth,
  getSnailDamage, getBirdDamage, getFrogDamage, getBeeDamage,
  getPlayerCurrentHealth, getPlayerHealth,
  setSelectLevel,
} from './state.js';
import {
  setCurrentFrogHealth, setCurrentSnailHealth, setCurrentBeeHealth, setCurrentBirdHealth,
  setCharEXP, setEXPtoLevel, updateEXPIndicatorText, getCharacterDamage,
} from './characters.js';
import { updateEXP } from './upgrades.js';
import { addCoffee } from './combat.js';

export function saveGame() {
  localStorage.removeItem('gameSave');
  const gameData = {
    expToLevel: state.expToLevel,
    currentRound: state.currentRound,
    coffee: state.coffee,
    frogSize: state.frogSize,
    speedChanged: state.speedChanged,
    selectLevel: state.selectLevel,
    frogTintColor: state.frogTintColor,
    snailSpeed: state.snailSpeed,
    snailDamage: state.snailDamage,
    snailHealth: state.snailHealth,
    snailLevel: state.snailLevel,
    beeLevel: state.beeLevel,
    birdLevel: state.birdLevel,
    birdSpeed: state.birdSpeed,
    birdDamage: state.birdDamage,
    touchCount: state.touchCount,
    birdHealth: state.birdHealth,
    beeSpeed: state.beeSpeed,
    beeDamage: state.beeDamage,
    beeHealth: state.beeHealth,
    frogSpeed: state.frogSpeed,
    frogDamage: state.frogDamage,
    frogHealth: state.frogHealth,
    frogLevel: state.frogLevel,
    currentFrogHealth: state.currentFrogHealth,
    currentSnailHealth: state.currentSnailHealth,
    currentBeeHealth: state.currentBeeHealth,
    currentBirdHealth: state.currentBirdHealth,
    isGameStarted: state.isGameStarted,
    characterStats: state.characterStats,
    repicked: state.repicked,
    frogEXP: state.frogEXP,
    snailEXP: state.snailEXP,
    beeEXP: state.beeEXP,
    birdEXP: state.birdEXP,
    frogEXPToLevel: state.frogEXPToLevel,
    snailEXPToLevel: state.snailEXPToLevel,
    beeEXPToLevel: state.beeEXPToLevel,
    birdEXPToLevel: state.birdEXPToLevel,
    musicVolume: state.musicVolume,
    effectsVolume: state.effectsVolume,
  };

  const saveData = JSON.stringify(gameData);
  localStorage.setItem('gameSave', saveData);
}

export function loadGame() {
  const savedData = localStorage.getItem('gameSave');
  if (savedData) {

    const gameData = JSON.parse(savedData);
   state.currentRound = gameData.currentRound;
    // Load the saved values into your variables
    setCurrentFrogHealth(gameData.currentFrogHealth);
    setCurrentSnailHealth(gameData.currentSnailHealth);
    setCurrentBeeHealth(gameData.currentBeeHealth);
    setCurrentBirdHealth(gameData.currentBirdHealth);
    setCharEXP("character-frog", gameData.frogEXP);
    setCharEXP("character-snail", gameData.snailEXP);
    setCharEXP("character-bee", gameData.beeEXP);
    setCharEXP("character-bird", gameData.birdEXP);
    setEXPtoLevel("character-frog", gameData.frogEXPToLevel);
    setEXPtoLevel("character-snail", gameData.snailEXPToLevel);
    setEXPtoLevel("character-bee", gameData.beeEXPToLevel);
    setEXPtoLevel("character-bird", gameData.birdEXPToLevel);
    updateEXP(gameData.frogEXP, gameData.frogEXPToLevel);


    state.expToLevel = gameData.expToLevel;

    state.coffee = gameData.coffee;
    state.frogSize = gameData.frogSize;
    state.speedChanged = gameData.speedChanged;
    state.selectLevel = gameData.selectLevel;
    state.frogTintColor = gameData.frogTintColor;
    state.snailSpeed = gameData.snailSpeed;
    state.snailDamage = gameData.snailDamage;
    state.snailHealth = gameData.snailHealth;
    state.snailLevel = gameData.snailLevel;
    state.beeLevel = gameData.beeLevel;
    state.birdLevel = gameData.birdLevel;
    state.birdSpeed = gameData.birdSpeed;
    state.birdDamage = gameData.birdDamage;
    state.touchCount = gameData.touchCount;
    state.birdHealth = gameData.birdHealth;
    state.beeSpeed = gameData.beeSpeed;
    state.beeDamage = gameData.beeDamage;
    state.beeHealth = gameData.beeHealth;
    state.frogSpeed = gameData.frogSpeed;
    state.frogDamage = gameData.frogDamage;
    state.frogHealth = gameData.frogHealth;
    state.frogLevel = gameData.frogLevel;
    state.isGameStarted = gameData.isGameStarted;
    state.characterStats = gameData.characterStats;
    state.repicked = gameData.repicked;
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
    updateEXPIndicatorText("character-bird", gameData.birdLevel);
    updateEXPIndicatorText("character-snail", gameData.snailLevel);
    updateEXPIndicatorText("character-frog", gameData.frogLevel);
    updateEXPIndicatorText("character-bee", gameData.beeLevel);
    //updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
    console.log("LOADING", getPlayerCurrentHealth());
    addCoffee(gameData.coffee - gameData.coffee);
    //updateVelocity();
    setSelectLevel(0);
    if (gameData.musicVolume !== undefined) {
      state.musicVolume = gameData.musicVolume;
      if (state.themeMusic) {
        state.themeMusic.volume = state.musicVolume;
      }
    }
    if (gameData.effectsVolume !== undefined) {
      state.effectsVolume = gameData.effectsVolume;
    }

    state.roundOver = false;
    state.cooldownActive = false;


  }
}
