// save.js — Save/load game to localStorage

import state from './state.js';
import {
  getSnailLevel, getBirdLevel, getFrogLevel, getBeeLevel,
  getSnailSpeed, getBirdSpeed, getFrogSpeed, getBeeSpeed,
  getSnailHealth, getBirdHealth, getFrogHealth, getBeeHealth,
  getSnailDamage, getBirdDamage, getFrogDamage, getBeeDamage,
  getPlayerCurrentHealth, getPlayerHealth,
  setSelectLevel,
  getBones, setBones, getSupporterHearts, setSupporterHearts,
  getLayoutUpgrades, setLayoutUpgrades,
} from './state.js';
import {
  setCurrentFrogHealth, setCurrentSnailHealth, setCurrentBeeHealth, setCurrentBirdHealth,
  setCharEXP, setEXPtoLevel, updateEXPIndicatorText, getCharacterDamage,
} from './characters.js';
import { updateEXP } from './upgrades.js';
import { addCoffee } from './combat.js';

export function saveGame() {
  if (state.gameMode === 'endless') return; // Endless mode doesn't save progress
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
    unlockedCharacters: state.unlockedCharacters,
    potionDoses: state.potionDoses || 0,
  };

  const saveData = JSON.stringify(gameData);
  localStorage.setItem('gameSave', saveData);
}

export function loadGame() {
  if (state.gameMode === 'endless') return; // Endless mode always starts fresh
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
    updateEXP(gameData.frogEXP);


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
    const characterLevelElement = document.getElementById("character-level");
    const ch = state.currentCharacter ? state.currentCharacter.replace('character-', '') : 'frog';
    // Attack: base + (shop bonus)
    const baseDmg = state.characterStats[state.currentCharacter] ? state.characterStats[state.currentCharacter].attack : 16;
    const shopDmg = (state.layoutUpgrades[ch] && state.layoutUpgrades[ch].damage) || 0;
    const dmgEl = document.getElementById('swords-level');
    if (dmgEl) dmgEl.textContent = shopDmg > 0 ? `${baseDmg} (+${shopDmg})` : `${baseDmg}`;
    // Defense: base (= level) + (shop bonus)
    const baseDefense = state[ch + 'Level'] || 1;
    const shopDefense = (state.charDefenseShop && state.charDefenseShop[ch]) || 0;
    const defEl = document.getElementById('defense-level');
    if (defEl) defEl.textContent = shopDefense > 0 ? `${baseDefense} (+${shopDefense})` : `${baseDefense}`;
    // Speed
    const speed = ch === 'frog' ? state.speed : (state[ch + 'Speed'] || 1);
    const spdEl = document.getElementById('speed-level');
    if (spdEl) spdEl.textContent = speed.toFixed(1);
    if (characterLevelElement) characterLevelElement.textContent = 'Lvl. ' + getFrogLevel();
    state.isCharacterMenuOpen = false;
    updateEXPIndicatorText("character-bird", gameData.birdLevel);
    updateEXPIndicatorText("character-snail", gameData.snailLevel);
    updateEXPIndicatorText("character-frog", gameData.frogLevel);
    updateEXPIndicatorText("character-bee", gameData.beeLevel);
    //updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
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

    if (gameData.unlockedCharacters) {
      state.unlockedCharacters = gameData.unlockedCharacters;
    }

    if (gameData.potionDoses !== undefined) {
      state.potionDoses = gameData.potionDoses;
    }

    state.roundOver = false;
    state.cooldownActive = false;


  }
}

// Bones persistence — separate localStorage key so it survives endless mode
export function saveBones() {
  const data = {
    bones: getBones(),
    supporterHearts: getSupporterHearts(),
    layoutUpgrades: getLayoutUpgrades(),
    startingItems: state.startingItems,
    ownedHats: state.ownedHats,
    ownedSkins: state.ownedSkins,
    equippedHats: state.equippedHats,
    equippedSkins: state.equippedSkins,
    unlockedCastles: state.unlockedCastles,
    checkpointLevels: state.checkpointLevels,
    detailMode: state.detailMode,
    leaderboardLockedByDevTools: !!state.leaderboardLockedByDevTools,
  };
  localStorage.setItem('crittorsBones', JSON.stringify(data));
}

export function loadBones() {
  const saved = localStorage.getItem('crittorsBones');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.bones !== undefined) setBones(data.bones);
      if (data.supporterHearts !== undefined) setSupporterHearts(data.supporterHearts);
      if (data.layoutUpgrades) setLayoutUpgrades(data.layoutUpgrades);
      if (data.startingItems) state.startingItems = data.startingItems;
      if (data.ownedHats) state.ownedHats = data.ownedHats;
      if (data.ownedSkins) {
        state.ownedSkins = data.ownedSkins.filter(id => id !== 'frog-shadow');
      }
      if (data.equippedHats) state.equippedHats = data.equippedHats;
      if (data.equippedSkins) {
        state.equippedSkins = data.equippedSkins;
        if (state.equippedSkins.frog === 'frog-shadow') delete state.equippedSkins.frog;
      }
      if (data.unlockedCastles) state.unlockedCastles = data.unlockedCastles;
      if (data.checkpointLevels) state.checkpointLevels = data.checkpointLevels;
      if (data.detailMode) state.detailMode = data.detailMode;
      state.leaderboardLockedByDevTools = !!data.leaderboardLockedByDevTools;
    } catch (e) {
      console.warn('Failed to load bones data:', e);
    }
  }
}
