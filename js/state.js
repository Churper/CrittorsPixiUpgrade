// state.js — Central game state object + getters/setters

const state = {
  // Game mode
  gameMode: 'story',          // 'story' or 'endless'
  endlessStartTime: null,     // Date.now() when endless begins
  endlessElapsed: 0,          // seconds survived

  // Core game state
  leveling: false,
  timer: null,
  volumeButton: null,
  sharkEmergeTextures: null,
  pauseMenuContainer: null,
  flashing: false,
  reviveDialogContainer: null,
  gameData: null,
  critter: null,
  enemyTypes: [],
  frogGhostPlayer: null,
  fullReset: false,
  exploded: false,
  enemyDeath: null,
  frogWalkTextures: null,
  frogAttackTextures: null,
  expToLevel: 100,
  currentRound: 1,
  foreground: null,
  critterWalkTextures: null,
  roundOver: false,
  playerHealth: 100,
  coffee: 0,
  frogSize: 0.35,
  speed: 1,
  choose: false,
  backgroundSprite: null,
  demiSpawned: 0,
  lastDemiKillTime: 0,
  biomeTransition: null,
  speedChanged: false,
  selectLevel: 0,
  frogTintColor: 0xffffff,

  // Character stats
  snailSpeed: 1,
  snailDamage: 16,
  snailHealth: 100,
  snailLevel: 1,
  beeLevel: 1,
  birdLevel: 1,
  birdSpeed: 1,
  birdDamage: 10,
  touchCount: 0,
  birdHealth: 100,
  beeSpeed: 1,
  beeDamage: 16,
  beeHealth: 100,
  frogSpeed: 1,
  frogDamage: 16,
  frogHealth: 100,
  frogLevel: 1,
  currentFrogHealth: 100,
  currentSnailHealth: 100,
  currentBeeHealth: 100,
  currentBirdHealth: 100,
  charSwap: false,
  currentCharacter: "character-frog",
  isCharAttacking: false,
  playerEXP: 0,
  repicked: false,
  isDead: false,
  enemiesInRange: 0,
  areResetting: false,
  isPaused: false,
  isWiped: false,
  isAttackingChar: false,
  isGameStarted: false,
  initialClouds: 0,
  unlockedCharacters: ['character-frog'],

  // EXP
  frogEXP: 0,
  snailEXP: 0,
  beeEXP: 0,
  birdEXP: 0,
  frogEXPToLevel: 100,
  snailEXPToLevel: 100,
  beeEXPToLevel: 100,
  birdEXPToLevel: 100,

  // Cooldown
  cooldownActive: false,
  cooldownDuration: 3000,

  // Spawn protection (invincibility after character swap)
  spawnProtectionEnd: 0,
  lastInvulnTime: 0,
  featherReviveEnd: null,

  // Potion
  potionDoses: 0,
  potionMaxDoses: 3,

  // Misc
  stored: 0,
  enemies: [],
  isCharacterMenuOpen: false,
  selectedCharacter: "character-frog",
  flashDuration: 100,
  flashColor: 0xff5555,
  isCombat: false,
  isPointerDown: false,
  autoAttack: false,

  // Item drops (endless mode)
  shieldCount: 0,
  bombCount: 0,
  shieldActive: false,
  shieldHP: 0,
  groundItems: [],
  shieldSprite: null,
  rageCount: 0, rageActive: false, rageStartTime: 0, rageEndTime: 0,
  featherCount: 0, featherActive: false, featherSprite: null,
  goldenBeanCount: 0,
  ghostFlyInterval: null,
  endlessKillCount: 0,

  // Cross-round currency
  bones: 0,
  layoutUpgrades: {
    frog:  { damage: 0, health: 0, speed: 0 },
    snail: { damage: 0, health: 0, speed: 0 },
    bird:  { damage: 0, health: 0, speed: 0 },
    bee:   { damage: 0, health: 0, speed: 0 },
  },

  // Config
  characterPositions: {
    "character-snail": { top: "-50px", left: "calc(45% - 70px)" },
    "character-frog": { top: "-50px", left: "calc(45% - 70px)" },
    "character-bird": { top: "-50px", left: "calc(45% - 10px)" },
    "character-bee": { top: "-50px", left: "calc(45% + 50px)" }
  },

  characterStats: {
    'character-frog': { speed: 1, attack: 16, health: 100 },
    'character-snail': { speed: 1, attack: 16, health: 100 },
    'character-bird': { speed: 1, attack: 10, health: 100 },
    'character-bee': { speed: 1, attack: 16, health: 100 },
  },

  enemyPortraits: [
    { name: 'ele_portrait', url: './assets/eleportrait.png' },
    { name: 'octo_portrait', url: './assets/octoportrait.png' },
    { name: 'pig_portrait', url: './assets/pigportrait.png' },
    { name: 'scorp_portrait', url: './assets/scorpportrait.png' },
    { name: 'toofer_portrait', url: './assets/tooferportrait.png' },
    { name: 'imp_portrait', url: './assets/impportrait.png' },
    { name: 'puffer_portrait', url: './assets/pufferportrait.png' },
    { name: 'shark_portrait', url: './assets/sharkportrait.png' }
  ],

  portraitNames: {
    'ele': 'ele_portrait',
    'puffer': 'puffer_portrait',
    'octo': 'octo_portrait',
    'pig': 'pig_portrait',
    'scorp': 'scorp_portrait',
    'toofer': 'toofer_portrait',
    'imp': 'imp_portrait',
    'shark': 'shark_portrait'
  },

  // Timer state
  pauseTime: null,
  startTime: null,
  isPaused1: false,
  timerFinished: false,
  totalPausedTime: 0,
  resetStartTime: null,

  // Portrait flashing
  isFlashing: false,
  intervalId: null,

  // Pause
  isUnpausing: false,

  // Menu
  menuOpened: false,

  // Spawning
  timeOfLastSpawn: Date.now(),
  interval: 12000,
  enemySpawnTimeout: null,
  isSpawning: false,
  spawnedThisRound: 0,

  // Enemy
  attackingEnemy: null,
  hasAttackedThisFrame: false,
  currentAttackedEnemy: null,

  // Upgrades
  isUpgradeBoxesAnimated: false,

  // Audio
  attackSound: null,
  chooseSound: null,
  levelSound: null,
  hitSound: null,
  musicVolume: 0,
  effectsVolume: 0.25,
  themeMusic: null,

  // Delta time (set each frame by main ticker; 1.0 at 60fps, 2.0 at 30fps)
  dt: 1,

  // PIXI app reference (set after creation)
  app: null,
};

// Initialize audio
state.attackSound = new Audio();
state.attackSound.src = "./attacksound.wav";
state.chooseSound = new Audio();
state.chooseSound.src = "./upgradeavailable.wav";
state.levelSound = new Audio();
state.levelSound.src = "./levelup.wav";
state.levelSound.volume = state.effectsVolume;
state.hitSound = new Audio();
state.hitSound.src = "./hurt.wav";

// Initialize characterStats with actual values
state.characterStats = {
  'character-frog': { speed: state.frogSpeed, attack: state.frogDamage, health: state.frogHealth },
  'character-snail': { speed: state.snailSpeed, attack: state.snailDamage, health: state.snailHealth },
  'character-bird': { speed: state.birdSpeed, attack: state.birdDamage, health: state.birdHealth },
  'character-bee': { speed: state.beeSpeed, attack: state.beeDamage, health: state.beeHealth },
};

export default state;

// --- Getter/Setter functions ---

// Snail
export function getSnailLevel() { return state.snailLevel; }
export function getSnailSpeed() { return state.snailSpeed; }
export function setSnailSpeed(speed) { state.snailSpeed = speed; }
export function getSnailDamage() { return state.snailDamage; }
export function setSnailDamage(damage) { state.snailDamage = damage; }
export function getSnailHealth() { return state.snailHealth; }
export function setSnailHealth(health) { state.snailHealth = health; }

// Bee
export function getBeeLevel() { return state.beeLevel; }
export function getBeeSpeed() { return state.beeSpeed; }
export function setBeeSpeed(speed) { state.beeSpeed = speed; }
export function getBeeDamage() { return state.beeDamage; }
export function setBeeDamage(damage) { state.beeDamage = damage; }
export function getBeeHealth() { return state.beeHealth; }
export function setBeeHealth(health) { state.beeHealth = health; }

// Bird
export function getBirdLevel() { return state.birdLevel; }
export function getBirdSpeed() { return state.birdSpeed; }
export function setBirdSpeed(speed) { state.birdSpeed = speed; }
export function getBirdDamage() { return state.birdDamage; }
export function setBirdDamage(damage) { state.birdDamage = damage; }
export function getBirdHealth() { return state.birdHealth; }
export function setBirdHealth(health) { state.birdHealth = health; }

// Frog
export function getFrogLevel() { return state.frogLevel; }
// NOTE: getFrogSpeed returns state.speed (not state.frogSpeed) — matches original behavior
// where the second declaration of getFrogSpeed() overwrote the first
export function getFrogSpeed() { return state.speed; }
export function setFrogSpeed(value) { state.speed = value; }
export function getFrogDamage() { return state.frogDamage; }
export function setFrogDamage(damage) { state.frogDamage = damage; }
export function getFrogHealth() { return state.frogHealth; }
export function setFrogHealth(health) { state.frogHealth = health; }

// Enemies
export function getEnemies() { return state.enemies; }
export function addEnemies(enemy) { console.log("added an eneymy"); return state.enemies.push(enemy); }

// Character
export function getCharSwap() { return state.charSwap; }
export function setCharSwap(value) { state.charSwap = value; }
export function getCurrentCharacter() { return state.currentCharacter; }
export function setCurrentCharacter(value) { state.currentCharacter = value; }

// Coffee
export function getCoffee() { return state.coffee; }
export function setCoffee(value) { state.coffee = value; }

// Item drops
export function getShieldCount() { return state.shieldCount; }
export function setShieldCount(v) { state.shieldCount = v; }
export function getBombCount() { return state.bombCount; }
export function setBombCount(v) { state.bombCount = v; }
export function getRageCount() { return state.rageCount; }
export function setRageCount(v) { state.rageCount = v; }
export function getFeatherCount() { return state.featherCount; }
export function setFeatherCount(v) { state.featherCount = v; }
export function getGoldenBeanCount() { return state.goldenBeanCount; }
export function setGoldenBeanCount(v) { state.goldenBeanCount = v; }

// Misc getters/setters
export function getFrogSize() { return state.frogSize; }
export function getSpeedChanged() { return state.speedChanged; }
export function setSpeedChanged(value) { state.speedChanged = value; }
export function getSelectLevel() { return state.selectLevel; }
export function setSelectLevel(value) { state.selectLevel = value; }
export function getFrogTintColor() { return state.frogTintColor; }
export function getPlayerEXP() { return state.playerEXP; }
export function setPlayerEXP(value) { state.playerEXP = value; }
export function getisDead() { return state.isDead; }
export function setIsDead(value) { state.isDead = value; }
export function getIsCharAttacking() { return state.isCharAttacking; }
export function setIsCharAttacking(value) { state.isCharAttacking = value; }
export function getAreResetting() { return state.areResetting; }
export function setCharAttackAnimating(value) { state.isCharAttackAnimating = value; }
export function getEnemiesInRange() { return state.enemiesInRange; }
export function setEnemiesInRange(value) { state.enemiesInRange = value; }

// --- Character routing functions ---

export function getCharLevel(character) {
  switch (character) {
    case 'character-snail':
      return state.snailLevel;
    case 'character-bird':
      return state.birdLevel;
    case 'character-frog':
      return state.frogLevel;
    case 'character-bee':
      return state.beeLevel;
    default:
      return;
  }
}

export function getCharEXP(currentChar) {
  switch (currentChar) {
    case 'character-snail':
      return state.snailEXP;
    case 'character-bird':
      return state.birdEXP;
    case 'character-frog':
      return state.frogEXP;
    case 'character-bee':
      return state.beeEXP;
    default:
      return state.frogEXP;
  }
}

export function getEXPtoLevel(currentChar) {
  switch (currentChar) {
    case 'character-snail':
      return state.snailEXPToLevel;
    case 'character-bird':
      return state.birdEXPToLevel;
    case 'character-frog':
      return state.frogEXPToLevel;
    case 'character-bee':
      return state.beeEXPToLevel;
    default:
      return state.frogEXPToLevel;
  }
}

export function getPlayerHealth() {
  switch (getCurrentCharacter()) {
    case 'character-snail':
      return getSnailHealth();
    case 'character-bird':
      return getBirdHealth();
    case 'character-frog':
      return getFrogHealth();
    case 'character-bee':
      return getBeeHealth();
    default:
      console.log('Invalid character type');
  }
}

export function getPlayerCurrentHealth() {
  switch (getCurrentCharacter()) {
    case 'character-snail':
      return state.currentSnailHealth;
    case 'character-bird':
      return state.currentBirdHealth;
    case 'character-frog':
      return state.currentFrogHealth;
    case 'character-bee':
      return state.currentBeeHealth;
    default:
      console.log('Invalid character type');
  }
  return;
}

export function getisPaused() {
  return state.isPaused;
}

// Unlocked Characters
export function getUnlockedCharacters() { return state.unlockedCharacters; }
export function setUnlockedCharacters(value) { state.unlockedCharacters = value; }

// Bones (cross-round currency)
export function getBones() { return state.bones; }
export function setBones(value) { state.bones = value; }
export function getLayoutUpgrades() { return state.layoutUpgrades; }
export function setLayoutUpgrades(value) { state.layoutUpgrades = value; }
