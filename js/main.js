import state from './state.js';
import {
  getFrogSpeed, setFrogSpeed, getFrogDamage, setFrogDamage, getFrogHealth, setFrogHealth, getFrogLevel,
  getSnailSpeed, setSnailSpeed, getSnailDamage, setSnailDamage, getSnailHealth, setSnailHealth, getSnailLevel,
  getBeeSpeed, setBeeSpeed, getBeeDamage, setBeeDamage, getBeeHealth, setBeeHealth, getBeeLevel,
  getBirdSpeed, setBirdSpeed, getBirdDamage, setBirdDamage, getBirdHealth, setBirdHealth, getBirdLevel,
  getEnemies, addEnemies,
  getCharSwap, setCharSwap,
  getCurrentCharacter, setCurrentCharacter,
  getCoffee, setCoffee,
  getFrogSize, getSpeedChanged, setSpeedChanged,
  getSelectLevel, setSelectLevel, getFrogTintColor,
  getPlayerEXP, setPlayerEXP,
  getisDead, setIsDead,
  getIsCharAttacking, setIsCharAttacking,
  getAreResetting, setCharAttackAnimating,
  getEnemiesInRange, setEnemiesInRange,
  getCharLevel, getCharEXP, getEXPtoLevel,
  getPlayerHealth, getPlayerCurrentHealth, getisPaused,
} from './state.js';
import { startTimer, pauseTimer, resetTimer, isTimerFinished } from './timer.js';
import { getRandomColor, getRandomColor1, getRandomColor3 } from './utils.js';
import {
  startFlashing, stopFlashing,
  setCurrentFrogHealth, setCurrentBeeHealth, setCurrentSnailHealth, setCurrentBirdHealth,
  setPlayerCurrentHealth, setCharEXP, setEXPtoLevel,
  updateEXPIndicator, updateEXPIndicatorText,
  getCharacterName, getCharacterPortraitUrl, updateCharacterStats,
  getCharacterDamage, updateCurrentLevels,
} from './characters.js';
import {
  createPauseMenuContainer, shouldReturnEarly, updateDialogPositions,
  getIsWiped, setisWiped, isCooldownActive, startCooldown, openCharacterMenu,
  updatePlayerHealthBar, updateBarText, updateGrayscale, updateEnemyGrayscale,
  updateExpText, playRoundText, getTextStyle,
} from './ui.js';
import {
  checkEnemyCollision, getEnemyPortraitUrl,
  spawnEnemyDemi, createSpawnDemi, spawnEnemy, createSpawnEnemy,
  determineEnemyScale, handleEnemySorting, handleEnemyActions,
  handleEnemyMoving, handleEnemyCombat, handleCritterAttack,
  addEnemyInRange, handleEnemyAttack, prepareEnemyPortrait,
  removeEnemy, checkProjectileCollisions, rangedAttack,
  resetEnemiesState, playGhostFly, resetToAttackTextures,
  handleEnemyAttacking, drawCharHitSplat, drawHitSplat,
  critterAttack, createCoffeeDrop, addCoffee, playSpawnAnimation,
  createCoffeeDropText, playDeathAnimation, drawEnemyHPBar,
} from './combat.js';

document.addEventListener('DOMContentLoaded', function () {
  let appStarted = false;
console.log("PIXIVERSION:",PIXI.VERSION);
  let rotateMessage = document.getElementById('rotateDevice');
  rotateMessage.style.display = "block"; // Always display the new menu

  document.getElementById('proceedAnyway').addEventListener('click', function() {
    rotateMessage.style.display = 'none';
    // Run your app's main function here if it's not already runnin
    if (!appStarted) {
      mainAppFunction();
      appStarted = true;
      
    }
  });

  async function mainAppFunction() {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: Math.max(window.innerHeight),
    antialias: true,
    transparent: false,
    resolution: 1,
  });
  state.app = app;
  document.body.appendChild(app.canvas);

  // UNSAFE variables - kept as local vars (also used as function params)
  let critter;
  let foreground;
  let critterWalkTextures;
  let backgroundSprite;
  let enemies = state.enemies;
  let gameData;
  const menuTexture = await PIXI.Assets.load('./assets/mainmenu.png');
  const menuSprite = new PIXI.Sprite(menuTexture);

  // Start Timer

 function spawnDemi()
 {

  console.log("running 1 DEMO HERE");
  if(state.demiSpawned === 0)
  {
    console.log("SPAWENING 1 DEMO HERE");
    const randomIndex = Math.floor(Math.random() * state.enemyTypes.length);
    const selectedEnemy = state.enemyTypes[randomIndex];

    spawnEnemyDemi(
      critter,
      selectedEnemy.attackTextures,
      selectedEnemy.walkTextures,
      selectedEnemy.name
    );
    state.demiSpawned = 1;
  }

 }



  

  
  // Initial check


  function setisPaused(value) {
    state.isPaused = value;
    if (value) {
      pauseTimer();
    }
    if (shouldReturnEarly(value)) {
      return;
    }

    if (value) {

      state.pauseMenuContainer = createPauseMenuContainer();
    } else {
      if (state.pauseMenuContainer) {
        app.stage.removeChild(state.pauseMenuContainer);
        state.pauseMenuContainer = null;
      }

      state.isUnpausing = false;
      state.isPaused = false; // Resume the game
      
      spawnEnemies();
      startTimer();
    }
  }





  var pauseButton = document.getElementById("pause-button");

  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  pauseButton.addEventListener("click", function () {
    if (getisDead() == false) {
      if (getPlayerCurrentHealth() > 0) {
        if(state.roundOver == false){
          
        setisPaused(!getisPaused());
        console.log("PAUSED");
        }
      }

    }
  });


  var pauseButton = document.getElementById("pause-button");

  pauseButton.addEventListener("mousedown", function () {
    pauseButton.style.backgroundImage = 'url("./assets/pausedown.png")';
    console.log("Button Pressed");
  });

  pauseButton.addEventListener("mouseup", function () {
    pauseButton.style.backgroundImage = 'url("./assets/pauseup.png")';
    console.log("Button Released");
  });




["character-portrait", "exp-bar", "health-bar"].forEach(id => {
    const element = document.getElementById(id);
    
    element.addEventListener("click", openCharacterMenu);

    element.addEventListener("touchstart", function(e) {
        const touchPosition = e.changedTouches[0].clientY;
        const screenHeight = window.innerHeight || document.documentElement.clientHeight;

        // Check if the touch started within the bottom 10% of the screen
        if (touchPosition >= screenHeight * 0.9) {
            // Now any movement in this touch sequence will open the menu
            element.addEventListener("touchmove", function() {
                if (!state.menuOpened) {
                    openCharacterMenu();
                    state.menuOpened = true;
                }
            });
        }
    });
    
    element.addEventListener("touchend", function() {
        state.menuOpened = false;
        // Remove the touchmove listener after the touch sequence is finished
        element.removeEventListener("touchmove", openCharacterMenu);
    });
});
  

  function handleCharacterClick(characterType) {
    let characterHealth;

    switch (characterType) {
      case 'character-snail':
        characterHealth = state.currentSnailHealth;
        break;
      case 'character-bird':
        characterHealth = state.currentBirdHealth;
        break;
      case 'character-frog':
        characterHealth = state.currentFrogHealth;
        break;
      case 'character-bee':
        characterHealth = state.currentBeeHealth;
        break;
      default:
        console.log('Invalid character', characterType);
        return;
    }

    app.stage.addChild(critter);


    document.getElementById('spawn-text').style.visibility = 'hidden';
    state.choose = false;
    if (characterHealth <= 0) {
      createReviveDialog(characterType);
      return;
    }
    stopFlashing();


    // Swap character portraits
    const characterPortrait = document.getElementById("character-portrait");
    characterPortrait.style.backgroundImage = `url('${getCharacterPortraitUrl(characterType)}')`;
    characterPortrait.classList.remove("character-snail", "character-bird", "character-bee", "character-frog");
    characterPortrait.classList.add(characterType);

    // Close the character menu
    const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
    characterBoxes.forEach((box) => {
      box.style.visibility = 'hidden';
    });
    updateEXPIndicatorText(getCurrentCharacter(), getCharLevel(getCurrentCharacter()));
    state.isCharacterMenuOpen = false;
    setCharSwap(true);

    setCurrentCharacter(characterType);

    // Swap positions of the current character box and the previously selected character box
    if (state.selectedCharacter !== characterType) {
      const characterLevelElement = document.getElementById("character-level");
      var updateLightning = document.getElementById("lightning-level");
      var updateHP = document.getElementById("heart-level");
      var updateDamage = document.getElementById("swords-level");
      let level;
      switch (characterType) {
        case 'character-snail':
          level = getSnailLevel();
          updateLightning.textContent = getSnailSpeed().toString();
          updateHP.textContent = getSnailHealth().toString();
          updateDamage.textContent = getSnailDamage().toString();
          break;
        case 'character-bird':
          level = getBirdLevel();
          updateLightning.textContent = getBirdSpeed().toString();
          updateHP.textContent = getBirdHealth().toString();
          updateDamage.textContent = getBirdDamage().toString();

          break;
        case 'character-frog':
          level = getFrogLevel();
          updateLightning.textContent = getFrogSpeed().toString();
          updateHP.textContent = getFrogHealth().toString();
          updateDamage.textContent = getFrogDamage().toString();
          break;
        case 'character-bee':
          level = getBeeLevel();
          updateLightning.textContent = getBeeSpeed().toString();
          updateHP.textContent = getBeeHealth().toString();
          updateDamage.textContent = getBeeDamage().toString();
          break;
        default:
          console.log('Invalid character', characterType);
          return;
      }
      if (getPlayerCurrentHealth() >= 0) {
        setisPaused(false);
      }
      startCooldown();
      updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
      characterLevelElement.textContent = 'Lvl. ' + level;

      const currentCharacterBox = document.querySelector('.upgrade-box.' + state.selectedCharacter);
      const prevCharacterBox = document.querySelector('.upgrade-box.' + characterType);
      const tempPosition = { ...characterPositions[state.selectedCharacter] };

      currentCharacterBox.style.top = state.characterPositions[characterType].top;
      currentCharacterBox.style.left = state.characterPositions[characterType].left;
      state.characterPositions[state.selectedCharacter] = state.characterPositions[characterType];
      state.characterPositions[characterType] = tempPosition;

      previousCharacter = state.selectedCharacter;
      state.selectedCharacter = characterType;
    } else {
      previousCharacter = ""; // Set previousCharacter to an empty string if the same character is selected again
    }

    updateCharacterStats(); // Update the stats for the new character
  }


  function createReviveDialog(characterType) {
    if (state.reviveDialogContainer && app.stage.children.includes(state.reviveDialogContainer)) {
      return;
    }
  
    state.reviveDialogContainer = new PIXI.Container();
  
    // Create a semi-transparent black background sprite for the dialog box
    backgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    backgroundSprite.width = app.screen.width * 0.6; // 60% of the screen width
    backgroundSprite.height = app.screen.height/2; // Fixed height
    backgroundSprite.tint = 0x000000; // Black color
    backgroundSprite.alpha = 0.5; // Make it semi-transparent
    state.reviveDialogContainer.addChild(backgroundSprite);
  
    // Create a brown border around the background
    const border = new PIXI.Graphics();
    border.rect(0, 0, backgroundSprite.width, backgroundSprite.height).stroke({ width: 4, color: 0x8B4513 });
    state.reviveDialogContainer.addChild(border);
  
    // Create the text for the dialog box
    const characterName = getCharacterName(characterType);

    const reviveText2 = `Spend 50 to revive ${characterName}?`;
  
    const textStyle = getTextStyle( backgroundSprite.width );
  
    const text = new PIXI.Text(reviveText2, textStyle);
    text.anchor.set(.5);
    text.position.set(backgroundSprite.width / 2, backgroundSprite.height * 0.25);
  
  
  
    // Add state.coffee bean image
    let beanSprite = new PIXI.Sprite(PIXI.Assets.get('bean'))
    beanSprite.anchor.set(0.5);
    beanSprite.scale.set(0.85);
    beanSprite.position.set(text.position.x - text.width / 5.5, text.position.y);
    
    state.reviveDialogContainer.addChild(beanSprite);
    state.reviveDialogContainer.addChild(text);
  
    // Create the 'Yes' button with emoji
    const playerCoins = getCoffee(); // Assuming getCoffee() is the function that returns the player's current coin amount
    const yesButtonStyle = new PIXI.TextStyle({
      fontSize: app.screen.width * 0.26, // Responsive font size
      fill: playerCoins >= 50 ? '#008000' : '#808080', // Green color if player has 50 or more coins, grey otherwise
      backgroundColor: '#000000', // Black background
      fontFamily: 'Marker Felt',
      stroke: '#000000', // Black outline color
      strokeThickness: -6, // Outline thickness
      dropShadow: true,
      dropShadowColor: '#000000', // Shadow color
      dropShadowBlur: 4, // Shadow blur
      dropShadowAngle: Math.PI / 6, // Shadow angle
      dropShadowDistance: 2, // Shadow distance
      wordWrap: true,
      wordWrapWidth: app.screen.width /3,
    });
  
    const yesButton = new PIXI.Text('☑', yesButtonStyle);
    yesButton.anchor.set(0.5);
    yesButton.position.set(backgroundSprite.width * 0.3, backgroundSprite.height * 0.75);
    state.reviveDialogContainer.addChild(yesButton);
  
    // Create the 'No' button with emoji and red tint
    const noButtonStyle = new PIXI.TextStyle({
      fontSize: app.screen.width * 0.26, // Responsive font size
      fill: '#FF0000', // Red color
      backgroundColor: '#000000', // Black background
      fontFamily: 'Marker Felt',
      stroke: '#000000', // Black outline color
      strokeThickness: -6, // Outline thickness
      dropShadow: true,
      dropShadowColor: '#000000', // Shadow color
      dropShadowBlur: 4, // Shadow blur
      dropShadowAngle: Math.PI / 6, // Shadow angle
      dropShadowDistance: 2, // Shadow distance
      wordWrap: true,
      wordWrapWidth: app.screen.width /3,
    });
  
    const noButton = new PIXI.Text('☒', noButtonStyle);
    noButton.anchor.set(0.5);
    noButton.position.set(backgroundSprite.width * 0.7, backgroundSprite.height * 0.75);
    state.reviveDialogContainer.addChild(noButton);
  
    // Calculate the position of the dialog box based on the current stage position
    const dialogX = (app.screen.width / 2) - (backgroundSprite.width / 2);
    const dialogY = (app.screen.height / 2) - (backgroundSprite.height / 2);
    state.reviveDialogContainer.position.set(dialogX, dialogY);
  
    // Add the dialog box to the PIXI stage
    app.stage.addChild(state.reviveDialogContainer);
    setisPaused(true);
  
    // Listen for click events on the 'Yes' button
    yesButton.eventMode = 'static';
    yesButton.cursor = 'pointer';
    noButton.eventMode = 'static';
    noButton.cursor = 'pointer';
  
    yesButton.on('pointerdown', () => {
      // Check if the player has enough coins to revive the character
      if (getCoffee() >= 50) {
        // Perform the revive logic
        if (characterType === 'character-snail') {
          setCurrentSnailHealth(getSnailHealth());
        } else if (characterType === 'character-bird') {
          setCurrentBirdHealth(getBirdHealth());
        } else if (characterType === 'character-frog') {
          setCurrentFrogHealth(getFrogHealth());
        } else if (characterType === 'character-bee') {
          setCurrentBeeHealth(getBeeHealth());
        }
        addCoffee(-50);
        // Remove the dialog box from the PIXI stage
        app.stage.removeChild(state.reviveDialogContainer);
        setisPaused(false);
      } else {
        // Player doesn't have enough coins
        console.log('Not enough coins to revive');
        app.stage.removeChild(state.reviveDialogContainer);
        setisPaused(false);
        // You can display an error message or perform other actions as needed
      }
    });
  
    noButton.on('pointerdown', () => {
      // Remove the dialog box from the PIXI stage
      app.stage.removeChild(state.reviveDialogContainer);
      setisPaused(false);
    });
  }



  // Add click event listeners to character boxes
  const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
  characterBoxes.forEach((box) => {
    box.addEventListener('click', function () {
      const characterType = box.classList[1];
      handleCharacterClick(characterType);

    });
  });



  document.body.appendChild(app.canvas);
 
  const hoverScale = 1.2;
  const hoverAlpha = 0.8;
 

  async function startGame() {

    window.addEventListener('blur', () => {
      if (getPlayerCurrentHealth() > 0) {
        setisPaused(true);
      }
    });
    

    const loadingTexture = await PIXI.Assets.load('./assets/loading.png');
    const loadingSprite = new PIXI.Sprite(loadingTexture);
    loadingSprite.anchor.set(0.5);
    loadingSprite.width = app.screen.width;
    loadingSprite.height = app.screen.height;
    loadingSprite.position.set(app.screen.width / 2, app.screen.height / 2);
    loadingSprite.alpha = 1; // Start fully opaque
    app.stage.removeChild(menuSprite);
    app.stage.addChild(loadingSprite);
    const sound = new Audio();
    sound.src = "./theme.ogg";
   // sound.volume = .42;
    //sound.play();


    // Game elements and logic 
    let castleMaxHealth = 100;
    let castleHealth = castleMaxHealth;
    const mountainVelocityX = 0;
    const mountainVelocityY = 0.2;
    const mountainVelocity1 = new PIXI.Point(0.01, 0.01);
    const mountainVelocity2 = new PIXI.Point(0.05, 0.05);
    const mountainVelocity3 = new PIXI.Point(0.1, 0.1);
    const mountainVelocity4 = new PIXI.Point(0.1, 0.1);
    const hpBarColor = 0xff0000;
    loadGame();
    var snailHPIndicator = document.querySelector('.upgrade-box.character-snail .hp-indicator');
    var birdHPIndicator = document.querySelector('.upgrade-box.character-bird .hp-indicator');
    var beeHPIndicator = document.querySelector('.upgrade-box.character-bee .hp-indicator');
    var frogHPIndicator = document.querySelector('.upgrade-box.character-frog .hp-indicator');
    // Calculate the height percentage for each character
    var snailHeightPercentage = (1 - state.currentSnailHealth / getSnailHealth()) * 100;
    var birdHeightPercentage = (1 - state.currentBirdHealth / getBirdHealth()) * 100;
    var beeHeightPercentage = (1 - state.currentBeeHealth / getBeeHealth()) * 100;
    var frogHeightPercentage = (1 - state.currentFrogHealth / getFrogHealth()) * 100;
    // Update the custom properties and height for each character
    snailHPIndicator.style.setProperty('--current-health-snail', state.currentSnailHealth);
    snailHPIndicator.style.setProperty('--max-health-snail', getSnailHealth());
    snailHPIndicator.style.setProperty('--hp-indicator-height', snailHeightPercentage + '%');

    birdHPIndicator.style.setProperty('--current-health-bird', state.currentBirdHealth);
    birdHPIndicator.style.setProperty('--max-health-bird', getBirdHealth());
    birdHPIndicator.style.setProperty('--hp-indicator-height', birdHeightPercentage + '%');

    beeHPIndicator.style.setProperty('--current-health-bee', state.currentBeeHealth);
    beeHPIndicator.style.setProperty('--max-health-bee', getBeeHealth());
    beeHPIndicator.style.setProperty('--hp-indicator-height', beeHeightPercentage + '%');

    frogHPIndicator.style.setProperty('--current-health-frog', state.currentFrogHealth);
    frogHPIndicator.style.setProperty('--max-health-frog', getFrogHealth());
    frogHPIndicator.style.setProperty('--hp-indicator-height', frogHeightPercentage + '%');

    var snailEXPIndicator = document.querySelector('.upgrade-box.character-snail .exp-indicator');
    var birdEXPIndicator = document.querySelector('.upgrade-box.character-bird .exp-indicator');
    var beeEXPIndicator = document.querySelector('.upgrade-box.character-bee .exp-indicator');
    var frogEXPIndicator = document.querySelector('.upgrade-box.character-frog .exp-indicator');

    // Calculate the height percentage for each character
    var snailEXPHeightPercentage = (1 - getCharEXP('character-snail') / getEXPtoLevel('character-snail')) * 100;
    var birdEXPHeightPercentage = (1 - getCharEXP('character-bird') / getEXPtoLevel('character-bird')) * 100;
    var beeEXPHeightPercentage = (1 - getCharEXP('character-bee') / getEXPtoLevel('character-bee')) * 100;
    var frogEXPHeightPercentage = (1 - getCharEXP('character-frog') / getEXPtoLevel('character-frog')) * 100;

    // Update the custom properties and height for each character
    snailEXPIndicator.style.setProperty('--current-exp-snail', getCharEXP('character-snail'));
    snailEXPIndicator.style.setProperty('--max-exp-snail', getEXPtoLevel('character-snail'));
    snailEXPIndicator.style.setProperty('--exp-indicator-height', snailEXPHeightPercentage + '%');

    birdEXPIndicator.style.setProperty('--current-exp-bird', getCharEXP('character-bird'));
    birdEXPIndicator.style.setProperty('--max-exp-bird', getEXPtoLevel('character-bird'));
    birdEXPIndicator.style.setProperty('--exp-indicator-height', birdEXPHeightPercentage + '%');

    beeEXPIndicator.style.setProperty('--current-exp-bee', getCharEXP('character-bee'));
    beeEXPIndicator.style.setProperty('--max-exp-bee', getEXPtoLevel('character-bee'));
    beeEXPIndicator.style.setProperty('--exp-indicator-height', beeEXPHeightPercentage + '%');

    frogEXPIndicator.style.setProperty('--current-exp-frog', getCharEXP('character-frog'));
    frogEXPIndicator.style.setProperty('--max-exp-frog', getEXPtoLevel('character-frog'));
    frogEXPIndicator.style.setProperty('--exp-indicator-height', frogEXPHeightPercentage + '%');


// Add the assets to load
PIXI.Assets.add({ alias: 'shark_emerge', src: './assets/shark_emerge.png' });
PIXI.Assets.add({ alias: 'shark_submerge', src: './assets/shark_submerge.png' });
PIXI.Assets.add({ alias: 'shark_walk', src: './assets/shark_walk.png' });
PIXI.Assets.add({ alias: 'shark_attack', src: './assets/shark_attack.png' });
PIXI.Assets.add({ alias: 'pig_walk', src: './assets/pig_walk.png' });
PIXI.Assets.add({ alias: 'pig_attack', src: './assets/pig_attack.png' });
PIXI.Assets.add({ alias: 'ele_walk', src: './assets/ele_walk.png' });
PIXI.Assets.add({ alias: 'ele_attack', src: './assets/ele_attack.png' });
PIXI.Assets.add({ alias: 'scorp_walk', src: './assets/scorp_walk.png' });
PIXI.Assets.add({ alias: 'scorp_attack', src: './assets/scorp_attack.png' });
PIXI.Assets.add({ alias: 'octo_walk', src: './assets/octo_walk.png' });
PIXI.Assets.add({ alias: 'octo_attack', src: './assets/octo_attack.png' });
PIXI.Assets.add({ alias: 'toofer_walk', src: './assets/toofer_walk.png' });
PIXI.Assets.add({ alias: 'toofer_attack', src: './assets/toofer_attack.png' });
PIXI.Assets.add({ alias: 'bird_egg', src: './assets/bird_egg.png' });
PIXI.Assets.add({ alias: 'bird_ghost', src: './assets/bird_ghost.png' });
PIXI.Assets.add({ alias: 'bird_walk', src: './assets/bird_walk.png' });
PIXI.Assets.add({ alias: 'bird_attack', src: './assets/bird_attack.png' });
PIXI.Assets.add({ alias: 'snail_ghost', src: './assets/snail_ghost.png' });
PIXI.Assets.add({ alias: 'bee_ghost', src: './assets/bee_ghost.png' });
PIXI.Assets.add({ alias: 'bee_walk', src: './assets/bee_walk.png' });
PIXI.Assets.add({ alias: 'bee_attack', src: './assets/bee_attack.png' });
PIXI.Assets.add({ alias: 'puffer_walk', src: './assets/puffer_walk.png' });
PIXI.Assets.add({ alias: 'puffer_attack', src: './assets/puffer_attack.png' });
PIXI.Assets.add({ alias: 'bean', src: './assets/bean.png' });
PIXI.Assets.add({ alias: 'background', src: './assets/background.png' });
PIXI.Assets.add({ alias: 'frog_ghost', src: './assets/frog_ghost.png' });
PIXI.Assets.add({ alias: 'foreground', src: './assets/foreground.png' });
PIXI.Assets.add({ alias: 'critter', src: './assets/critter.png' });
PIXI.Assets.add({ alias: 'critter_walk', src: './assets/critter_walk.png' });
PIXI.Assets.add({ alias: 'critter_attack', src: './assets/critter_attack.png' });
PIXI.Assets.add({ alias: 'snail_idle', src: './assets/snail_idle.png' });
PIXI.Assets.add({ alias: 'snail_walk', src: './assets/snail_walk.png' });
PIXI.Assets.add({ alias: 'snail_attack', src: './assets/snail_attack.png' });
PIXI.Assets.add({ alias: 'frog', src: './assets/frog.png' });
PIXI.Assets.add({ alias: 'frog_walk', src: './assets/frog_walk.png' });
PIXI.Assets.add({ alias: 'frog_attack', src: './assets/frog_attack.png' });
PIXI.Assets.add({ alias: 'enemy_death', src: './assets/enemy_death.png' });
PIXI.Assets.add({ alias: 'mountain1', src: './assets/mountain1.png' });
PIXI.Assets.add({ alias: 'mountain2', src: './assets/mountain2.png' });
PIXI.Assets.add({ alias: 'castle', src: './assets/castle.png' });
PIXI.Assets.add({ alias: 'clouds', src: './assets/clouds.png' });
PIXI.Assets.add({ alias: 'clouds2', src: './assets/clouds2.png' });
PIXI.Assets.add({ alias: 'clouds3', src: './assets/clouds3.png' });

// Load the assets and get a resolved promise once all are loaded
const texturesPromise = PIXI.Assets.load([
  'shark_emerge',
  'shark_submerge',
  'shark_walk',
  'shark_attack',
  'pig_walk',
  'pig_attack',
  'ele_walk',
  'ele_attack',
  'scorp_walk',
  'scorp_attack',
  'octo_walk',
  'octo_attack',
  'toofer_walk',
  'toofer_attack',
  'bird_egg',
  'bird_ghost',
  'bird_walk',
  'bird_attack',
  'snail_ghost',
  'bee_ghost',
  'bee_walk',
  'bee_attack',
  'puffer_walk',
  'puffer_attack',
  'bean',
  'background',
  'frog_ghost',
  'foreground',
  'critter',
  'critter_walk',
  'critter_attack',
  'snail_idle',
  'snail_walk',
  'snail_attack',
  'frog',
  'frog_walk',
  'frog_attack',
  'enemy_death',
  'mountain1',
  'mountain2',
  'castle',
  'clouds',
  'clouds2',
  'clouds3'
]);

// When the promise resolves, we have the textures!
texturesPromise.then((texturesPromise) => {
 setup(texturesPromise);
});

    function setup(textures) {


      // Add the state.timer animation to the stage


      backgroundTexture = textures.background;

// Create first background sprite
background = new PIXI.Sprite(backgroundTexture);
background.width = 2800;
background.height = app.screen.height;
background.anchor.set(0, 0);
background.position.set(0, 0);
app.stage.addChild(background);


foregroundTexture = textures.foreground;
// Set up the foreground
foreground = new PIXI.Sprite(foregroundTexture);
foreground.width = foreground.texture.width * 1.3;
foreground.height = foreground.texture.height * 1;
foreground.anchor.set(0, 1);
foreground.x = 0;
foreground.y = Math.max(app.screen.height);


const frogGhostTextures = textures.frog_ghost;
state.frogGhostPlayer = new PIXI.Sprite(frogGhostTextures);

state.frogGhostPlayer.anchor.set(0, 0);
state.frogGhostPlayer.scale.set(0.28);
backgroundTexture = textures.background;

      // Create a new tiling sprite with the background texture, specifying the width and height
 
      
      // No need to set the width and height again, since it's set in the TilingSprite constructor
      // background.width = app.screen.width * 2.75;
      // background.height = app.screen.height;
   
      const mountain1 = createMountainSprite('mountain1', -100, mountainVelocity1, foreground);
      const mountain2 = createMountainSprite('mountain2', app.screen.width * 0.45, mountainVelocity2, foreground);
      const mountain3 = createMountainSprite('mountain2', -200, mountainVelocity3, foreground); // Adjust the position as needed
      const mountain4 = createMountainSprite('mountain1', app.screen.width * 1.2, mountainVelocity4, foreground); // Adjust the position as needed
      function createMountainSprite(resourceName, xPos, velocity, foreground) {
        const sprite = new PIXI.Sprite(textures[resourceName]);

        const scaleFactor = Math.min(
          app.screen.height * 0.6 / sprite.height,
          app.screen.width * 1.5 / sprite.width
        );

        sprite.scale.set(scaleFactor);
        sprite.anchor.set(0, 1);

        const minHeightOffset = foreground ? foreground.height * 0.34 : 0;
        const heightOffsetRatio = (1 - scaleFactor) * 0.3; // Adjust this ratio based on your preference

        const foregroundHeightOffset = foreground ? minHeightOffset + sprite.height * heightOffsetRatio : 0; // Adjusted offset calculation
        sprite.position.set(xPos, app.screen.height - foregroundHeightOffset);
        sprite.zIndex = -1;
        sprite.velocity = velocity;

        return sprite;
      }
      mountain3.scale.x = .6;
      mountain3.scale.y = .65;
      mountain4.scale.x = .5;
      mountain4.scale.y = .55;
      console.log(mountain2);
      console.log(mountain3);
      foreground.x = 0;
      // mountain3.scale.x = 100;
      const castleTexture = PIXI.Assets.get('castle');
      const castle = new PIXI.Sprite(castleTexture);
      const castlePlayer = new PIXI.Sprite(castleTexture);
      castlePlayer.anchor.set(1, 1);
      castlePlayer.position.set(200, app.screen.height - castle.height * 0.25);
      castle.anchor.set(1, 1);
      castle.position.set(foreground.width, app.screen.height - castle.height * 0.25);
      const originalTint = castle.tint;
      const hpBarWidth = 180;
      const hpBarHeight = 16;

      const hpBarX = castle.position.x - castle.width / 1.1;
      // console.log(hpBarX);
      const hpBarY = app.screen.height - 40 - hpBarHeight - 210; // Adjusted position
      const hpBarBackgroundColor = 0x000000;
      const hpBar = new PIXI.Graphics();
      hpBar.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight).fill({ color: hpBarColor, alpha: 1 });
      const hpBarBackground = new PIXI.Graphics();
      const hpBarBorderColor = 0x000000; // Black color
      const hpBarBorderThickness = 4;
      hpBarBackground.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight).fill({ color: hpBarBackgroundColor, alpha: 0.5 }).stroke({ width: hpBarBorderThickness, color: hpBarBorderColor });
      hpBarBackground.rect(hpBarX + hpBarBorderThickness, hpBarY + hpBarBorderThickness, hpBarWidth - hpBarBorderThickness * 2, hpBarHeight - hpBarBorderThickness * 2).fill({ color: hpBarBackgroundColor, alpha: 1 });
    

 

      let frogIdleTexture = textures.frog;
      let frogIdleTextures = [frogIdleTexture];
      const frogIdleTextures1 = [frogIdleTexture];
      state.frogWalkTextures = createAnimationTextures('frog_walk', 10, 351);
      state.frogAttackTextures = createAnimationTextures('frog_attack', 12, 351);
      const frogWalkTextures1 = createAnimationTextures('frog_walk', 10, 351);
      const frogAttackTextures1 = createAnimationTextures('frog_attack', 12, 351);
      const critterAttackTextures = createAnimationTextures('critter_attack', 13, 266);
      critterWalkTextures = createAnimationTextures('critter_walk', 12, 266);
      const snailWalkTextures = createAnimationTextures2('snail_walk', 20, 562, 3560, 2248);
      const snailAttackTextures = createAnimationTextures2('snail_attack', 20, 562, 2848, 3372);
      const pufferWalkTextures = createAnimationTextures2('puffer_walk', 15, 413, 3705, 1239);
      const pufferAttackTextures = createAnimationTextures2('puffer_attack', 21, 413, 2223, 2891);
      const beeWalkTextures = createAnimationTextures2('bee_walk', 9, 256, 2753, 256);
      const beeAttackTextures = createAnimationTextures2('bee_attack', 18, 256, 1950, 1024);
      const birdWalkTextures = createAnimationTextures2('bird_walk', 13, 403, 2541, 806);
      const birdAttackTextures = createAnimationTextures2('bird_attack', 13, 403, 2541, 806);
      const cloudsTexture = textures.clouds;
      const clouds2Texture = textures.clouds2;
      const scorpWalkTextures = createAnimationTextures2('scorp_walk', 6, 499, 2202, 499);
      const scorpAttackTextures = createAnimationTextures2('scorp_attack', 9, 499, 3303, 499);
      const tooferWalkTextures = createAnimationTextures2('toofer_walk', 6, 377, 2412, 377);
      const tooferAttackTextures = createAnimationTextures2('toofer_attack', 15, 377, 1206, 1885);
      const octoWalkTextures = createAnimationTextures2('octo_walk', 10, 482, 3415, 964);
      const octoAttackTextures = createAnimationTextures2('octo_attack', 18, 482, 3415, 1928);
      const eleWalkTextures = createAnimationTextures2('ele_walk', 6, 377, 2256, 377);
      const eleAttackTextures = createAnimationTextures2('ele_attack', 12, 377, 1128, 1508);
      const pigWalkTextures = createAnimationTextures2('pig_walk', 6, 618, 1590, 1854);
      const pigAttackTextures = createAnimationTextures2('pig_attack', 15, 618, 2385, 3090);
      const sharkWalkTextures = createAnimationTextures2('shark_walk', 10, 398, 1398, 1990);
      const sharkAttackTextures = createAnimationTextures2('shark_attack', 21, 398, 3495, 1990);
      state.sharkEmergeTextures = createAnimationTextures2('shark_emerge', 5, 398, 699, 1990);
      const backgroundImage = new PIXI.Sprite(PIXI.Assets.get('background'));
      const clouds = createTilingSprite(cloudsTexture, backgroundImage.width * 30, 200);
      const clouds2 = createTilingSprite(clouds2Texture, backgroundImage.width * 30, 200);
      clouds2.position.y += 100;
      clouds2.alpha = .3;
      const enemyDeathTextures = createAnimationTextures('enemy_death', 8, 317);
      state.enemyDeath = createAnimatedSprite(enemyDeathTextures);
      const castleDeathTextures = createAnimationTextures('enemy_death', 8, 317);
      castleDeath = createAnimatedSprite(castleDeathTextures);
      const playerSpawn = createAnimatedSprite(enemyDeathTextures);
      castleDeath.animationSpeed = 0.175;
      castleDeath.loop = false;
      castleDeath.anchor.set(1, 0);
      castleDeath.scale.set(0.5);
      let characterTextures;

      characterTextures = state.frogWalkTextures;
      critter = createAnimatedSprite(characterTextures);
      critter.eventMode = 'static';

      critter.textures = state.frogWalkTextures;
      critter.loop = true;
      critter.play();
      // Define the desired color in hexadecimal format
      const desiredColor = 0x00ff00; // Green color

      // Apply the color filter to the sprite
      playerSpawn.tint = desiredColor;
      playerSpawn.animationSpeed = 0.175;
      playerSpawn.loop = false;
      playerSpawn.anchor.set(.65, 0.2);
      playerSpawn.scale.set(0.35);
      updateCurrentLevels();
      state.enemyDeath.animationSpeed = 0.175;
      state.enemyDeath.loop = false;
      state.enemyDeath.anchor.set(0.2, 0);
      state.enemyDeath.scale.set(0.35);
      state.enemyDeath.position.set(-10000, -100000);
      const velocity = new PIXI.Point();
      let xDir = 0;
      let yDir = 0;
      let isMoving = false;

      function createAnimationTextures(resourceName, frameCount, frameHeight) {
        const textures1 = [];
        const textureWidth = textures[resourceName].width / frameCount;

        for (let i = 0; i < frameCount; i++) {
          const rect = new PIXI.Rectangle(i * textureWidth, 0, textureWidth, frameHeight);
          const texture1 = new PIXI.Texture({ source: textures[resourceName].source, frame: rect });
          textures1.push(texture1);
        }

        return textures1;
      }

      function createAnimationTextures2(resourceName, frameCount, frameHeight, sheetWidth, sheetHeight) {
        const textures1 = [];
        const frameWidth = sheetWidth / Math.ceil(frameCount / (sheetHeight / frameHeight));

        for (let i = 0; i < frameCount; i++) {
          const row = Math.floor(i / (sheetWidth / frameWidth));
          const col = i % (sheetWidth / frameWidth);
          const rect = new PIXI.Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
          const texture1 = new PIXI.Texture({ source: textures[resourceName].source, frame: rect });
          textures1.push(texture1);
        }

        return textures1;
      }

      function createAnimatedSprite(textures) {
        const sprite = new PIXI.AnimatedSprite(textures);
        sprite.scale.set(0.5);
        sprite.anchor.set(.5, .5);
        sprite.position.set(app.screen.width / 3, app.screen.height - foreground.height / 1.6);
        sprite.animationSpeed = 0.25;
        sprite.zIndex = 1;
        sprite.loop = true;
        return sprite;
      }

      function createTilingSprite(texture, width, height) {
        const sprite = new PIXI.TilingSprite(texture, width, height);
        sprite.tileScale.set(0.4);
        sprite.tilePosition.y = 200;
        app.stage.addChild(sprite);
        return sprite;
      }

      // Variables
      let attackAnimationPlayed = false; // Flag variable to track if attack animation has played
      let pointerHoldInterval;
      let activeTouches = 0;

      app.stage.eventMode = 'static';
      app.stage.on("pointerdown", handleTouchStart);
      app.stage.on("pointerup", handleTouchEnd);
      app.stage.on("touchendoutside", handleTouchEnd);
      xDir = 1;
      updateVelocity();
      critter.loop = true;

      function handleTouchHold() {
        if (getisPaused()) {
          return;
        }
        if (state.roundOver === true) { isAttacking = false; attackAnimationPlayed = false; return; }
        if (!state.isAttackingChar) {
          if (!getisDead()) {
            state.isAttackingChar = true;
            critter.textures = state.frogAttackTextures;
            setCharAttackAnimating(true);
            critter.loop = false;
            critter.onComplete = function () {
              if (!state.isAttackingChar) {
                return; // Return early if attack was interrupted (paused)
              }
              if (state.isAttackingChar) {
                attackAnimationPlayed = true;
                state.attackSound.volume = 0.25;
                state.attackSound.play();
                if (getCurrentCharacter() === "character-bird") {
                  const birdProjectile = new PIXI.Sprite(textures.bird_egg);
                  birdProjectile.position.set(
                    critter.position.x,
                    critter.position.y
                  );
                  birdProjectile.name = "birdProjectile";
                  birdProjectile.scale.set(0.3);
                  app.stage.addChild(birdProjectile);

                  const projectileSpeed = 6;
                  const maxDistance = 450; // You can change this to the maximum distance you want the egg to travel
                  const startingX = birdProjectile.x;
                  const gravity = 0.1; // This controls the strength of the "gravity"
                  let verticalSpeed = -3; // This is the initial vertical speed. A negative value means the projectile will move up at first.

                  function updateProjectile() {
                    birdProjectile.x += projectileSpeed;

                    // Apply the "gravity" to the vertical speed
                    verticalSpeed += gravity;
                    // Apply the vertical speed to the projectile's position
                    birdProjectile.y += verticalSpeed;

                    if (Math.abs(birdProjectile.x - startingX) > maxDistance) {
                      // If the projectile has travelled more than the maximum distance, remove it
                      app.stage.removeChild(birdProjectile);
                      app.ticker.remove(updateProjectile);
                    }

                    // If the birdProjectile has been removed for any other reason, stop the update
                    if (!app.stage.children.includes(birdProjectile)) {
                      app.ticker.remove(updateProjectile);
                    }
                  }

                  app.ticker.add(updateProjectile);
                }

                if (critter.position.x > castle.position.x - castle.width / 1.1) {
                  console.log("takingDamage");
                  const greyscaleFilter = new PIXI.ColorMatrixFilter();
                  const remainingHealthPercentage = castleHealth / castleMaxHealth;
                  const greyscaleFactor = 1 - remainingHealthPercentage;

                  greyscaleFilter.desaturate(greyscaleFactor);

                  castle.filters = [greyscaleFilter];

                  castleTakeDamage(getCharacterDamage(getCurrentCharacter()));
                }
                state.isAttackingChar = false;
                isMoving = false;
              }
              state.isAttackingChar = false;
              critter.play();
            };
            critter.play();
          } else { state.isAttackingChar = false; }
        }
      }

      function handleTouchStart(event) {


        const deleteButton = event.target;

        // Log the event target and its text
        console.log(`Event target: ${deleteButton}`);
        console.log(`Event target text: ${deleteButton.text}`);

        if (deleteButton && deleteButton.text === '🗑️') {
          console.log('Delete button clicked');
          return;
        }
        if (deleteButton.text === '🔵') {
          console.log('Blue button clicked');
          return;
        }
        if ((deleteButton && deleteButton.text === '🔊') || (deleteButton && deleteButton.text === '🔈')) {
          console.log('Sound button clicked');
          return;
        }
        if (deleteButton === backgroundSprite || deleteButton === state.pauseMenuContainer) {
          console.log('Background or Pause menu clicked');
          return;
        }
        if (deleteButton === state.pauseMenuContainer || deleteButton.myCustomID === 'pauseMenuX') {
          console.log('Background or Pause menu clicked');
          return;
        }


        if (state.isPointerDown = true) {
          state.isPointerDown = false;
          console.log('Mouse has left the screen');
          attackAnimationPlayed = true;
          handleTouchEnd(event);

        }


        activeTouches++;

        if (attackAnimationPlayed) {
          attackAnimationPlayed = false;
        }

        if (getisPaused()) {


          if (getPlayerCurrentHealth() > 0) {

            setisPaused(false);
            // Hide the spawn text
            document.getElementById('spawn-text').style.visibility = 'hidden';
          }
          return;
        }
        function handleMouseLeave(event) {
          state.isPointerDown = false;
          console.log('Mouse has left the screen');
          attackAnimationPlayed = true;
          handleTouchEnd(event);

          // Perform any additional actions you want here
        }

     

        state.isPointerDown = true;
        pointerHoldInterval = setInterval(handleTouchHold, 10);
        document.addEventListener("mouseout", handleMouseLeave);

        document.addEventListener("touchend", handleMouseLeave);
      }

      function handleTouchEnd(event) {

        activeTouches--;
        clearInterval(pointerHoldInterval);

        state.isPointerDown = false;

        if (!attackAnimationPlayed) {
          return;
        }

        xDir = 1;
      }

      function getCharacterSpeed(currentCharacter) {
        switch (state.currentCharacter) {
          case 'character-snail':
            return getSnailSpeed();
          case 'character-bird':
            return getBirdSpeed();
          case 'character-frog':
            return getFrogSpeed();
          case 'character-bee':
            return getBeeSpeed();
          default:
            console.log('Invalid character', state.currentCharacter);
        }
      }


      function updateVelocity() {

        setIsCharAttacking(false);
        velocity.x = xDir * getCharacterSpeed(getCurrentCharacter());
        velocity.y = yDir * getCharacterSpeed(getCurrentCharacter());
        // console.log(isMoving);
        if (isMoving) {
          mountainVelocity1.x = mountainVelocityX;
          mountainVelocity1.y = mountainVelocityY;
          mountainVelocity2.x = mountainVelocityX;
          mountainVelocity2.y = mountainVelocityY;

        }

      }

      // Function to update the HP bar based on the castle's health
      function updateHPBar(health, maxHealth) {

        const hpRatio = health / maxHealth;
        const newHpWidth = Math.max(0, hpBarWidth * hpRatio);
        hpBar.clear();
        hpBar.rect(hpBarX, hpBarY, newHpWidth, hpBarHeight).fill(hpBarColor);
      }

let hasExploded = false;
      // Damage function
      function castleExpDrop(damage){
        expToGive = Math.round(damage * 0.75);
        if(cantGainEXP){return;}
        const expDrop = new PIXI.Text("+" + expToGive+ " EXP", {
          fontSize: 18,
          fill: "orange",
          fontWeight: "bold",
          stroke: "#000",
          strokeThickness: 3,
          strokeOutside: true
        });

    
        setCharEXP(getCurrentCharacter(), getCharEXP(getCurrentCharacter()) + expToGive);
        //ox setPlayerEXP(getPlayerEXP() + 100);
        console.log("YEP", getCharEXP(getCurrentCharacter()));
        console.log("YEPX", getEXPtoLevel(getCurrentCharacter()));
        updateEXP(getCharEXP(getCurrentCharacter()) + expToGive, getEXPtoLevel(getCurrentCharacter()));
        expDrop.position.set(critter.position.x + 20, critter.position.y - 20);
        expDrop.zIndex = 9999999999;
        app.stage.addChild(expDrop);
    
        // Animate the EXP drop text
        const startY = critter.position.y - 20;
    
        const endY = startY - 50; // Adjust the value to control the floating height
        const duration = 2600; // Animation duration in milliseconds
        const startTime = performance.now();
    
        const animateExpDrop = (currentTime) => {
          const elapsed = currentTime - startTime;
    
          if (elapsed < duration) {
            const progress = elapsed / duration;
            const newY = startY - (progress * (startY - endY));
            expDrop.position.y = newY;
            requestAnimationFrame(animateExpDrop);
          } else {
            // Animation complete, remove the EXP drop text
            app.stage.removeChild(expDrop);
          }
        };
    
        requestAnimationFrame(animateExpDrop);

      }
      let expToGive = 0;
      function castleTakeDamage(damage) {
        castleHealth -= damage;
        
        if ((castleHealth <= 0) && (!hasExploded)) {

         
          let newHP = getPlayerCurrentHealth() + 25;
          if (newHP < getPlayerHealth()) {
            setPlayerCurrentHealth(newHP);
            updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
          }
          else {
            setPlayerCurrentHealth(getPlayerHealth());
            updatePlayerHealthBar(getPlayerHealth() / getPlayerHealth() * 100);
          }
          hasExploded=true;
          castleExplode();
        }
        else{
          castleExpDrop(damage);}

        updateHPBar(castleHealth, castleMaxHealth);
      }
let cantGainEXP = false;
      function castleExplode() {
        cantGainEXP = true;
        state.currentRound++;
        setEnemiesInRange(0);
        console.log("enemies has been updated to", getEnemiesInRange())
        resetEnemiesState();
        state.exploded = true;
        app.stage.removeChild(castle);
        let completedExplosions = 0; // Counter for completed explosions
        createCoffeeDrop(critter.position.x + 20, critter.position.y-20);

        // Create multiple explosions
        for (let i = 0; i < 7; i++) {
            // Create a new explosion sprite for each explosion
            const explosion = createAnimatedSprite(castleDeathTextures);
    
            // Customize the position, size, speed, and tint of each explosion
            explosion.position.set(
                castle.position.x + Math.random() * 70 - 25 - 140, 
                castle.position.y - 100 + Math.random() * 70 - 25
            );
            if (i === 6) { // Conditions for the last explosion
              explosion.scale.set(0.35); // This sets the size of the last explosion
              explosion.animationSpeed = 0.1; // This makes the last explosion go really slow
              explosion.tint = 0x000000; // This makes the last explosion black
              explosion.position.set(explosion.position.x, explosion.position.y + 50);
          } else {
              explosion.scale.set(0.35 * (0.75 + Math.random() * 0.5));
              explosion.animationSpeed = 0.1 + Math.random() * .1 - .03;
              explosion.tint = getRandomColor();
          }
          explosion.loop=false;
            // Add the explosion sprite to the stage
            app.stage.addChild(explosion);
    
            // Play the explosion animation
            explosion.gotoAndPlay(0);
    
            // Remove the explosion animation after it completes
            explosion.onComplete = () => {
                app.stage.removeChild(explosion);
                completedExplosions++; // Increment the counter when an explosion completes

                if (completedExplosions === 7) { // All explosions completed
                  state.roundOver = true;
                
              }
            };
        }
       // state.demiSpawned = 2;
    }
    

      let unPauser = 0;
      const maxX = foreground.width - critter.width / 2;
      const cloudSpeed = .5 / 3.5;
      const cloud2Speed = 1.1 / 3.5;

      const mountain1Speed = 0.01;
      const mountain2Speed = 0.05;
      const mountain3Speed = .03;
      const mountain4Speed = .03;
      state.initialClouds = clouds.position.x;
      let once = 0;
      app.ticker.add(() => {
        if (isTimerFinished()) {
         
          console.log("TIMERDONE");
          spawnDemi();
          pauseTimer();
        }
        //console.log("HERXOROR:", getEnemiesInRange());
        if (state.reviveDialogContainer) {
          updateDialogPositions();
        }
        if (state.pauseMenuContainer) {
          updateDialogPositions();
        }
        if (getisPaused()) {


          // Game is paused, skip logic
          critter.stop();

          getEnemies().forEach(enemy => {
            enemy.stop();
          });
          unPauser = 1;
          return;
        }
        if (unPauser === 1) {
          critter.play();
          getEnemies().forEach(enemy => {
            enemy.play();
          });
          unPauser = 0;
          return;
        }


        //console.log("isatt:", state.isAttackingChar);
        if (state.roundOver) {
          if (getPlayerCurrentHealth() <= 0) {
            document.getElementById('spawn-text').style.visibility = 'visible';
            //document.getElementById("pause-text").style.visibility = "hidden";
          }

          // Calculate the amount to move the camera per frame
          const cameraSpeed = 6;

          // Calculate the target position (start position)
          const targetX = 0;
          const targetY = 0;

          // Calculate the distance between the current position and the target position
          const distanceX = targetX - app.stage.x;
          const distanceY = targetY - app.stage.y;

          // Calculate the movement for this frame
          const movementX = Math.sign(distanceX) * Math.min(Math.abs(distanceX), cameraSpeed);
          const movementY = Math.sign(distanceY) * Math.min(Math.abs(distanceY), cameraSpeed);

          // Update the camera position
          app.stage.x += movementX;
          app.stage.y += movementY;
          mountain1.position.x -= velocity.x * mountain1Speed;
          mountain2.position.x += velocity.x * mountain2Speed;
          mountain3.position.x += velocity.x * mountain3Speed;
          mountain4.position.x += velocity.x * mountain4Speed;
          // Return if the camera has reached the target position
          if (app.stage.x === targetX && app.stage.y === targetY) {

            if (state.currentSnailHealth + state.currentBeeHealth + state.currentBirdHealth + state.currentFrogHealth <= 0) {
              console.log("BANG");
              setisWiped(true);
            }

            if (state.exploded) {
              
              mountain1.tint = getRandomColor();
              mountain2.tint = getRandomColor();
              mountain3.tint = getRandomColor3();
              mountain4.tint = getRandomColor3();
              foreground.tint = getRandomColor();
              for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                console.log("hex", i);

                // Remove the enemy and its associated HP bar elements from the PIXI stage
                app.stage.removeChild(enemy);
                app.stage.removeChild(enemy.hpBar);
                app.stage.removeChild(enemy.hpBarBackground);

                // Destroy the enemy object to free up memory
                enemy.destroy();

                // Remove the enemy from the enemies array
                enemies.splice(i, 1);
                i--; // Decrement i to adjust for the removed enemy
              }
              state.exploded = false;
              saveGame();

              cantGainEXP=false;
              resetTimer();
              startTimer();
              app.stage.addChild(castle);
              app.stage.addChild(critter);
app.stage.addChild(hpBarBackground,hpBar);
              console.log("REEEE");
              hasExploded = false;


state.demiSpawned = 0;
            }

            playRoundText(state.currentRound);


            castle.tint = originalTint;
            setCharAttackAnimating(false);
            setIsCharAttacking(false);
            app.stage.removeChild(state.frogGhostPlayer);
            critter.position.set(app.screen.width / 20, state.stored);
            if (state.fullReset) {
              setPlayerCurrentHealth(getPlayerHealth());
              updatePlayerHealthBar(getPlayerHealth() / getPlayerHealth() * 100);
            }
            // Reset castle health
            castleHealth = castleMaxHealth + 20;
            castleMaxHealth = castleHealth;
            updateHPBar(castleHealth, castleMaxHealth);

            // Remove any existing enemy death sprites
            // Set state.isCombat and playAgain to false
            state.isCombat = false;
            enemyPortrait = document.getElementById('enemy-portrait');
            enemyPortrait.style.display = 'none'; // Make the element visible
            playAgain = false;
            state.isAttackingChar = false;
            isMoving = true;;
            setIsDead(false);
            critter.loop = true;
            critter.textures = state.frogWalkTextures;
            critter.play();
            setEnemiesInRange(0);
            // setPlayerCurrentHealth(0);
            // Clear the enemies array
            state.isPointerDown = false;
            let characterHealth;

            switch (getCurrentCharacter()) {
              case 'character-snail':
                characterHealth = state.currentSnailHealth;
                console.log("SNALIED");
                break;
              case 'character-bird':
                characterHealth = state.currentBirdHealth;
                break;
              case 'character-frog':
                characterHealth = state.currentFrogHealth;
                break;
              case 'character-bee':
                characterHealth = state.currentBeeHealth;
                break;
              default:
                console.log('Invalid character', characterType);
                return;
            }
            if (characterHealth == 0) {
              setisPaused(true); // Exit the function, don't perform any further actions
            }


            if (state.fullReset) {
              // Loop through the enemies array and remove each enemy
              for (let i = 0; i < getEnemies().length; i++) {
                let enemy = getEnemies()[i];
                // console.log(i);
                app.stage.removeChild(enemy);
                app.stage.removeChild(enemy.hpBar);
                app.stage.removeChild(enemy.hpBarBackground);
                // Destroy the enemy object to free up memory

              }

              enemies.length = 0;
            }
            state.roundOver = false;
            // setisPaused(false);
            setIsDead(false);
            resetEnemiesState();
            spawnEnemies();

          }
          return;
        }
        //setisPaused(true);

        if (getCharSwap()) {
          console.log("getcurrentchat", getCurrentCharacter());
          if (getCurrentCharacter() === "character-bird") {
            playerSpawn.tint = 0x0000ff; // Blue
            playerSpawn.blendMode = 'add';
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = birdWalkTextures;
            frogIdleTextures = birdWalkTextures;
            state.frogAttackTextures = birdAttackTextures;

          }
          else if (getCurrentCharacter() === "character-frog") {
            console.log("SWAP TO SNELL");
            playerSpawn.blendMode = 'add';
            playerSpawn.tint = 0x00ff80; // Light green
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = frogWalkTextures1;
            frogIdleTextures = frogIdleTextures1;
            state.frogAttackTextures = frogAttackTextures1;


          }
          else if (getCurrentCharacter() === "character-snail") {
            playerSpawn.blendMode = 'add';
            playerSpawn.tint = 0x800080; // Dark purple

            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = snailWalkTextures;
            frogIdleTextures = snailWalkTextures;
            state.frogAttackTextures = snailAttackTextures;


          }
          else if (getCurrentCharacter() === "character-bee") {
            playerSpawn.tint = 0xffff00; // Yellow

            playerSpawn.blendMode = 'add';
            playSpawnAnimation(critter, playerSpawn);
            state.frogWalkTextures = beeWalkTextures;
            frogIdleTextures = beeWalkTextures;
            state.frogAttackTextures = beeAttackTextures;


          }
          critter.position.x -= 20;
          updateEXP(getCharEXP(getCurrentCharacter()), getEXPtoLevel(getCurrentCharacter));
          document.getElementById('spawn-text').style.visibility = 'hidden';
          updateVelocity();
          setCharSwap(false);
          stopFlashing();
          app.stage.addChild(critter);

          return;
        }
       // if(getEnemiesInRange()>0){handleTouchHold();}
        if (getSpeedChanged()) { updateVelocity(); setSpeedChanged(false); }
        if (!state.isAttackingChar) {
          //  console.log("attacking char",state.isAttackingChar);
          if (!getisDead()) {
            //  console.log("not getisdead");
            console.log("getenemiesinrange", getisPaused(), getisDead(), getEnemiesInRange());
            if (!state.isCombat) {
              //   console.log("not iscombat");
              if (!state.isPointerDown) {
                // console.log("not ispointerdown");
                if (getEnemiesInRange() <= 0) {

                  if (getCurrentCharacter() != "character-snail") {
                    critter.position.x += velocity.x;

                  }
                  else {
                    if (critter.currentFrame > critter.totalFrames / 2) {
                      critter.position.x += velocity.x * 2;

                    }
                  }
                  if ((critter.textures != state.frogWalkTextures)) {
                    console.log("nope");
                    critter.textures = state.frogWalkTextures;
                    critter.play();
                  }
                  critter.loop = true;
                  mountain1.position.x -= velocity.x * mountain1Speed;
                  mountain2.position.x -= velocity.x * mountain2Speed;
                  mountain3.position.x -= velocity.x * mountain3Speed;
                  mountain4.position.x -= velocity.x * mountain4Speed;
                }
                else {
                  if (critter.textures != frogIdleTexture) {
                    critter.textures = frogIdleTextures;
                    critter.stop();
                  }
                }
              }
            }
            else {
              if (critter.textures != frogIdleTexture) {
                critter.textures = frogIdleTextures;
                critter.stop();
                critter.loop = false;
              }
            }
          }


          if (critter.position.x > maxX - 100) {
            critter.position.x = maxX - 100;
          }
          if (critter.position.x > 1500) {
            hpBar.visible = true; // Show the HP bar
            hpBarBackground.visible = true;
          } else {
            hpBar.visible = false;
            hpBarBackground.visible = false; // Hide the HP bar
          }

        }

        // Update cloud position
        clouds.position.x -= cloudSpeed;
        clouds2.position.x -= cloud2Speed;
        // Check if cloud has gone offscreen and move it to the right side
        if (clouds.x + clouds.width / 2 < -3000) {
          clouds.x = state.initialClouds;
        }
        if (clouds2.x + clouds2.width / 2 < -3000) {
          clouds2.x = state.initialClouds;
        }
        if (!getAreResetting()) {
          // Adjust app stage position
          app.stage.x = Math.min(0, Math.max(-foreground.width + app.screen.width, -critter.position.x + app.screen.width / 2));
          app.stage.y = Math.min(0, Math.max(-foreground.height + app.screen.height, -critter.position.y + app.screen.height / 2));
        }
        else { }
      });
      app.stage.removeChild(loadingSprite);
      playRoundText(state.currentRound);

      // document.getElementById("infoboxs").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
      document.getElementById("infoboxes").style.visibility = "visible";
      document.getElementById("ui-overlay").style.visibility = "visible";
      document.getElementById("pause-button").style.visibility = "visible";
      document.getElementById("coffee-button").style.visibility = "visible";
      critter.scale.set(getFrogSize());

      state.stored = app.screen.height - foreground.height / 2.2 - critter.height * .22;
      console.log("STORED", state.stored);
      critter.position.set(app.screen.width / 20, app.screen.height - foreground.height / 2.2 - critter.height * .22);
      updateEXP(0, state.expToLevel);
      updatePlayerHealthBar(getPlayerCurrentHealth() / getPlayerHealth() * 100);
      // Start the state.timer animation
      if (getPlayerCurrentHealth() <= 0) {


        setisPaused(true);


        // Toggle the visibility of the character info boxes
        const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');

        if (state.isCharacterMenuOpen) {
          characterBoxes.forEach((box) => {
            box.style.visibility = 'hidden';
          });
          state.isCharacterMenuOpen = false;
        } else {
          characterBoxes.forEach((box) => {
            if (state.selectedCharacter !== "" && box.classList.contains(state.selectedCharacter)) {
              box.style.visibility = 'hidden';
            } else {
              box.style.visibility = 'visible';
            }
          });
          state.isCharacterMenuOpen = true;
        }

        // Start the cooldown


      }
      app.stage.addChild(background, mountain4, mountain1, mountain2, mountain3, foreground, castle, critter, clouds, clouds2, hpBarBackground, hpBar, state.enemyDeath, castlePlayer);

      state.enemyTypes = [
        { attackTextures: pigAttackTextures, walkTextures: pigWalkTextures, name: "pig" },
        { attackTextures: octoAttackTextures, walkTextures: octoWalkTextures, name: "octo" },
        { attackTextures: eleAttackTextures, walkTextures: eleWalkTextures, name: "ele" },
        { attackTextures: critterAttackTextures, walkTextures: critterWalkTextures, name: "imp" },
        { attackTextures: pufferAttackTextures, walkTextures: pufferWalkTextures, name: "puffer" },
        { attackTextures: scorpAttackTextures, walkTextures: scorpWalkTextures, name: "scorp" },
        { attackTextures: tooferAttackTextures, walkTextures: tooferWalkTextures, name: "toofer" },
        { attackTextures: sharkAttackTextures, walkTextures: sharkWalkTextures, name: "shark" }

      ];


      spawnEnemies();


    }

  }


  function spawnEnemies() {
    if (state.isSpawning || getisDead() || getisPaused()) {
      return; // If already spawning or game is paused or player is dead, exit the function
    }

    if (isTimerFinished()) {
      console.log("TIMERDONE");
      return
    }

    state.isSpawning = true; // Set state.isSpawning to true to indicate that a spawn ticker is running

    const randomIndex = Math.floor(Math.random() * state.enemyTypes.length);
    const selectedEnemy = state.enemyTypes[randomIndex];

    spawnEnemy(
      critter,
      selectedEnemy.attackTextures,
      selectedEnemy.walkTextures,
      selectedEnemy.name
    );

    state.timeOfLastSpawn = Date.now(); // Update the time of last spawn

    state.enemySpawnTimeout = setTimeout(() => {
      state.isSpawning = false; // Set state.isSpawning to false when the timeout completes
      spawnEnemies(); // Spawn the next enemy
    }, state.interval- (state.currentRound * 225)) ;
  }


  function checkEnemyCollision(projectile, enemy) {
    const projectileX = projectile.position.x;
    const projectileWidth = projectile.width;

    const enemyX = enemy.x;
    const enemyWidth = enemy.width;

    return (
      projectileX + projectileWidth > enemyX &&
      projectileX < enemyX + enemyWidth
    );
  }


  function getEnemyPortraitUrl(enemyName) {
    // Find the matching enemy portrait URL based on enemy name
    const enemy = state.enemyPortraits.find(portrait => portrait.name === enemyName);
    return enemy ? enemy.url : ''; // Return the URL or an empty string if not found
  }


  function spawnEnemyDemi(critter, critterAttackTextures, critterWalkTextures, enemyName) {
    const enemy = createSpawnDemi(critterWalkTextures, enemyName);

    addEnemies(enemy); // add the already created enemy
    if (enemy.isAlive) {
      app.stage.addChild(enemy);
    }

    handleEnemySorting(enemy);

    app.ticker.add(() => {
      if (getisPaused()) {
        return;
      }

      if (app.stage.children.includes(enemy)) {
        handleEnemyActions(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
      } else {
        removeEnemy(enemy);
        return;
      }
    });
  }

  

  function createSpawnDemi(critterWalkTextures, enemyName) {
    const enemy = new PIXI.AnimatedSprite(critterWalkTextures);
    enemy.scale.set(determineEnemyScale(enemyName) * 2);
    enemy.exp = 32 + Math.floor(state.currentRound * 4);
    enemy.anchor.set(0.5, 0.5);
    enemy.resett = false;
    enemy.type = enemyName;
    enemy.tint = Math.floor(Math.random() * 0xFFFFFF);
    enemy.isAttacking = false;
    enemy.enemyAdded = false;
    enemy.position.set(2800, app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 60 - 30));
    enemy.zIndex = enemy.position.y + 10000;
    enemy.animationSpeed = enemyName === "pig" ? 0.23 : enemyName === "scorp" ? 0.15 : 0.25;
    enemy.loop = true;
    enemy.isAlive = true;
    enemy.attackDamage = Math.round(2 + state.currentRound /2) ;
    enemy.maxHP = 200 + state.currentRound * 7;
    enemy.currentHP = enemy.maxHP;
    enemy.scale.x *= -1; // Flip the enemy horizontally
    enemy.play();
    const randomSpeedFactor = 0.75 + Math.random() * 0.5; // Random speed factor between 0.75 and 1.25
    enemy.vx = -2 * randomSpeedFactor; // Set the enemy's horizontal velocity with random speed factor    console.log("enemy created", enemyName);
    return enemy;
  }


  function spawnEnemy(critter, critterAttackTextures, critterWalkTextures, enemyName) {
    const enemy = createSpawnEnemy(critterWalkTextures, enemyName);

    addEnemies(enemy); // add the already created enemy
    if (enemy.isAlive) {
      app.stage.addChild(enemy);
    }

    handleEnemySorting(enemy);

    app.ticker.add(() => {
      if (getisPaused()) {
        return;
      }

      if (app.stage.children.includes(enemy)) {
        handleEnemyActions(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
      } else {
        removeEnemy(enemy);
        return;
      }
    });
  }

  

  function createSpawnEnemy(critterWalkTextures, enemyName) {
    const enemy = new PIXI.AnimatedSprite(critterWalkTextures);
    enemy.scale.set(determineEnemyScale(enemyName));
    enemy.exp = 32 + Math.floor(state.currentRound * 2);
    enemy.anchor.set(0.5, 0.5);
    enemy.resett = false;
    enemy.type = enemyName;
    enemy.isAttacking = false;
    enemy.enemyAdded = false;
    enemy.position.set(2800, app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 60 - 30));
    enemy.zIndex = enemy.position.y + 10000;
    enemy.animationSpeed = enemyName === "pig" ? 0.23 : enemyName === "scorp" ? 0.15 : 0.25;
    enemy.loop = true;
    enemy.isAlive = true;
    enemy.attackDamage = Math.round(2 + state.currentRound /3) ;
    enemy.maxHP = 80 + state.currentRound * 7;
    enemy.currentHP = enemy.maxHP;
    enemy.scale.x *= -1; // Flip the enemy horizontally
    enemy.play();
    const randomSpeedFactor = 0.75 + Math.random() * 0.5; // Random speed factor between 0.75 and 1.25
    enemy.vx = -2 * randomSpeedFactor; // Set the enemy's horizontal velocity with random speed factor    console.log("enemy created", enemyName);
    return enemy;
  }

  function determineEnemyScale(enemyName) {
    switch (enemyName) {
      case "puffer":
        return 0.35;
      case "octo":
      case "ele":
      case "imp":
      case "shark":
        return 0.45;
      case "scorp":
        return 0.4;
      case "pig":
        return 0.5;
      default:
        return 0.45;
    }
  }

  function handleEnemySorting(enemy) {
    if (app.stage.children.includes(enemy)) {
      enemies.sort((a, b) => a.position.y - b.position.y);
      enemies.forEach((enemy) => {
        if (enemy.parent === app.stage) {
          app.stage.removeChild(enemy);
        }
      });
      enemies.forEach((enemy) => {
        app.stage.addChild(enemy);
      });
    }
  }

  function handleEnemyActions(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName) {
    if (getisDead()) {
      return;
    }

    checkProjectileCollisions(critter, enemy);
    if (getisDead()) {
      enemy.textures = critterWalkTextures;
      enemy.loop = true;
      // enemy.play();
      return;
    }

    if (enemy.isAlive && enemy.position.x - critter.position.x > 100 && enemy.position.x > 250) {
      handleEnemyMoving(critterWalkTextures, enemy);
    } else {
      handleEnemyCombat(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
    }

    //state.isCombat = false;
  }

  function handleEnemyMoving(critterWalkTextures, enemy) {
    if (enemy.textures !== critterWalkTextures && getEnemiesInRange() === 0) {
      enemy.textures = critterWalkTextures;
      enemy.loop = true;
      enemy.play();
    }
    enemy.position.x += enemy.vx;
  }

  function handleEnemyCombat(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName) {


    if (critter.textures !== state.frogWalkTextures && critter.currentFrame === critter.totalFrames - 2) {
      if(!state.hasAttackedThisFrame){

      handleCritterAttack(critter, enemy, critterAttackTextures);
      state.hasAttackedThisFrame = true;
      }
    } else if ((critter.currentFrame > critter.totalFrames - 2) || (critter.textures === state.frogWalkTextures) || (critter.currentFrame < critter.totalFrames - 2) ) {
      setIsCharAttacking(false);
      state.hasAttackedThisFrame = false;

    }

    if (!enemy.enemyAdded) {
      if(enemy.isAlive){
      addEnemyInRange(enemy);
      }
      return;
    }

    if (!getisDead() && !enemy.isAttacking && enemy.isAlive) {
      handleEnemyAttack(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
    }
  }

function handleCritterAttack(critter, enemy, critterAttackTextures) {
  if (!getIsCharAttacking()) {

  
          if(enemy.currentHP <= 0) {
              return;
          }
          setIsCharAttacking(true);
          if (getCurrentCharacter() !== "character-bird") {
              critterAttack(critter, enemy, critterAttackTextures);
          }
      
  }
}

  function addEnemyInRange(enemy) {
    enemy.enemyAdded = true;
    setEnemiesInRange(getEnemiesInRange() + 1);
  }

  function handleEnemyAttack(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName) {
    if (!state.isCombat) {
      prepareEnemyPortrait(enemyName);
    }

    enemy.isAttacking = true;
    enemy.isCombat = true;

    handleEnemyAttacking(enemy, critterAttackTextures, critter, critterWalkTextures, enemyName);
  }

  function prepareEnemyPortrait(enemyName) {
    enemyPortrait = document.getElementById('enemy-portrait');
    updateEnemyGrayscale(100);


    if (state.portraitNames.hasOwnProperty(enemyName)) {
      enemyName = state.portraitNames[enemyName];
    }

    const portraitUrl = getEnemyPortraitUrl(enemyName);
    enemyPortrait.style.backgroundImage = `url(${portraitUrl})`;
    enemyPortrait.style.display = 'block';
  }

  function removeEnemy(enemy) {
    app.stage.removeChild(enemy);
    const index = getEnemies().indexOf(enemy);
    if (index !== -1) {
      getEnemies().splice(index, 1);
    }
    app.ticker.remove(() => { });
  }


  function checkProjectileCollisions(critter, enemy) {
    let projectile = null;
    let enemyHit = false;

    for (let i = app.stage.children.length - 1; i >= 0; i--) {
      const child = app.stage.children[i];
      if (child.name === 'birdProjectile') {
        projectile = child;

        if (!enemyHit && checkEnemyCollision(projectile, enemy)) {
          // Enemy is hit by the projectile
          // Perform desired actions here, such as removing the enemy sprite from the stage
          // app.stage.removeChild(enemy);
          rangedAttack(critter, enemy);
          app.stage.removeChild(projectile);

          enemyHit = true; // Mark that an enemy has been hit

          // You can add a break here if you want to hit only one enemy even if there are multiple overlapping enemies.
        }
      }
    }
  }


  function rangedAttack(critter, enemy) {
    // Apply damage to the enemy
    drawHitSplat(enemy);
    console.log('ENEMY HP', enemy.currentHP);

    if (enemy.currentHP <= 0) {
   
        // Callback function to remove enemy after death animation2
        if (app.stage.children.includes(enemy)) {
            enemy.tint = 0xFF0000; // Set the hit color
        

            if (getEnemiesInRange() === 0) {
                const enemyPortrait = document.getElementById('enemy-portrait');
                enemyPortrait.style.display = 'none'; // Make the element visible
            }

            console.log("ENEMY DEAD", enemy.position.x, enemy.position.y);
            createCoffeeDrop(enemy.position.x + 20, enemy.position.y);
            app.stage.removeChild(enemy);
            getEnemies().splice(getEnemies().indexOf(enemy), 1);
enemy.isAlive = false;
            state.isCombat = false;
            setIsCharAttacking(false);
            playDeathAnimation(enemy, critter);

            critter.play();
        }
        if (getEnemiesInRange() > 0) {
          setEnemiesInRange(getEnemiesInRange()-1);
      }
    } 
}

  function resetEnemiesState() {
    getEnemies().forEach(enemy => {
      enemy.isAlive = true;
      enemy.isCombat = false;
      enemy.inRange = false;

      enemy.enemyAdded = false;
      enemy.isAttacking = false; // allow the enemy to attack again
      enemy.play();  // restart the walking animation
    });


  }
  function playGhostFly() {

    pauseTimer();
    setEnemiesInRange(0);
    setIsDead(true);
    state.frogGhostPlayer.alpha = 0.5;

    var currentCharacter = getCurrentCharacter();

    switch (state.currentCharacter) {
      case "character-snail":
        state.frogGhostPlayer.texture = PIXI.Assets.get("snail_ghost");
        break;
      case "character-bee":
        state.frogGhostPlayer.texture = PIXI.Assets.get("bee_ghost");
        break;
      case "character-bird":
        state.frogGhostPlayer.texture = PIXI.Assets.get("bird_ghost");
        break;

      default:
        // Use a default texture if the character is not recognized
        state.frogGhostPlayer.texture = PIXI.Assets.get("frog_ghost");
        break;
    }

    app.stage.addChild(state.frogGhostPlayer);

    let startY = state.frogGhostPlayer.y; // starting position
    let targetY = startY - 400; // target position
    let speed = 1.5; // speed of the movement
    let wobbleSpeed = 0.05; // speed of the wobble
    let wobbleAmplitude = 7.5; // initial amplitude of the wobble
    let wobbleDamping = 0.99; // damping factor of the wobble
    let moveInterval;

    moveInterval = setInterval(() => {
      state.frogGhostPlayer.y -= speed;
      let wobbleOffset = Math.sin(state.frogGhostPlayer.y * wobbleSpeed) * wobbleAmplitude;
      state.frogGhostPlayer.x += wobbleOffset;
      wobbleAmplitude *= wobbleDamping;
      if (state.frogGhostPlayer.y <= targetY) {
        state.frogGhostPlayer.y = targetY; // Ensure the frog reaches the exact target position

        // Stop the frog's movement temporarily until character is selected
        clearInterval(moveInterval);
        console.log("LEVELING",state.leveling);
        if (state.leveling == false) {
          // Check if character is selected
          if (state.selectedCharacter !== "") {
            // Hide the character info boxes
            const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
            characterBoxes.forEach((box) => {
              if (box.classList.contains(state.selectedCharacter)) {
                box.style.visibility = 'hidden';
              } else {
                box.style.visibility = 'visible';
              }
            });
            state.isCharacterMenuOpen = true;

          }


        }
        app.stage.removeChild(state.frogGhostPlayer);
        state.roundOver = true;

        // Continue with the game logic here
        // ...
      }
    }, 16); // (16ms = 60fps)
  }


  function resetToAttackTextures(enemy, critterAttackTextures) {
    enemy.textures = critterAttackTextures;
    enemy.loop = true;
    enemy.gotoAndPlay(0);
  }

  function handleEnemyAttacking(enemy, critterAttackTextures, critter, critterWalkTextures, enemyName) {
    if (state.roundOver) { return; }

    console.log("enemyname?", enemyName);
    console.log("enemynaeeeme?", enemy.emerging);

    // If the enemy is a shark and it's not currently playing the emerge animation
    if (enemyName === "shark" && !enemy.emerging) {
      console.log(enemy.name, "TRANSITION");

      // Set the enemy textures to the shark emerge textures and play it once
      enemy.textures = state.sharkEmergeTextures;
      enemy.loop = false;
      enemy.emerging = true;  // Mark that the shark is in the process of emerging
      enemy.play();

      enemy.onComplete = () => {
        // After the shark emerge animation completes, set the enemy textures to the attacking textures
        enemy.emerging = false;  // Mark that the shark has finished emerging
        resetToAttackTextures(enemy, critterAttackTextures);
      };
    } else if (!enemy.emerging) {
      // For other enemies, directly set the enemy textures to the attacking textures
      resetToAttackTextures(enemy, critterAttackTextures);
    }


    let hasDied = false;
    if (state.roundOver) { return; }


    function onFrameChange(currentFrame) {

      if (state.roundOver) {
        enemy.isAttacking = false;
        setEnemiesInRange(0);
        enemy.removeInRange = false;
        console.log("notstuck");
        return;
      }

      if (state.enemiesInRange <= 0) {
        return;
      }
      if (currentFrame === enemy.totalFrames - 5) {

        if (enemy.isAlive) {
          if (!getisDead()) {
            if (!hasDied) {

              critter.tint = state.flashColor;
              setPlayerCurrentHealth(getPlayerCurrentHealth() - enemy.attackDamage);
              drawCharHitSplat(critter, enemy);
              updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth()) * 100);

            }
            updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
            if (getPlayerCurrentHealth() <= 0) {
              setPlayerCurrentHealth(0);


              if (!hasDied) {
                // console.log("playerhp", playerHP);
                hasDied = true;
                state.frogGhostPlayer.position.set(critter.position.x, critter.position.y);
                critter.tint = 0xffffff;
                app.stage.removeChild(critter);
                for (let i = 0; i < enemies.length; i++) {
                  const enemy = enemies[i];

                  if (app.stage.children.includes(enemy.hpBarBackground)) {
                    app.stage.removeChild(enemy.hpBarBackground);
                  }

                  if (app.stage.children.includes(enemy.hpBar)) {
                    app.stage.removeChild(enemy.hpBar);
                  }
                }
                playGhostFly();
                startFlashing();

                for (let i = 0; i < getEnemies().length; i++) {
                  let enemy = getEnemies()[i];
                  // console.log(i);
                  enemy.stop();
                  // Destroy the enemy object to free up memory
                }
                //enemy.play();

              }
              return;
            }
            setTimeout(() => {
              critter.tint = getFrogTintColor();
            }, state.flashDuration);
            if (enemy.isAlive) {
              state.hitSound.volume = .25;
              state.hitSound.play();
            }
            hasPlayedSound = true;
          }
          else {


          }

        }
        else { console.log("enemy is dead"); }

      }
    }

    enemy.onFrameChange = onFrameChange;

    const tickerHandler = () => {
      if (enemy.currentFrame === 0) {
        hasPlayedSound = false;
        if (enemy.position.x - critter.position.x < 150) {
          if (getEnemies().length === 0) {
            const enemyPortrait = document.getElementById('enemy-portrait');
            enemyPortrait.style.display = 'none'; // Make the element visible
            state.isCombat = false;
          } else {
            // Additional logic for enemy attacks
          }
        }
      }
    };

    app.ticker.add(tickerHandler);

    const removeEnemy = () => {
      if (app.stage.children.includes(enemy)) {
        app.stage.removeChild(enemy);
        app.stage.removeChild(enemy.hpBar);
        app.stage.removeChild(enemy.hpBarBackground);
      }

      const index = getEnemies().indexOf(enemy);
      if (index !== -1) {
        getEnemies().splice(index, 1);
      }

      app.ticker.remove(tickerHandler);
      enemy.onFrameChange = null; // Remove the onFrameChange event listener
    };

    app.ticker.add(() => {
      if (!app.stage.children.includes(enemy)) {
        removeEnemy();
      }
    });
  }


  function resetGame(critter, enemy, enemies) {
    let isReset = false;
    if (!isReset) {
      setEnemiesInRange(0);
      setCharAttackAnimating(false);
      setIsCharAttacking(false);
      app.stage.removeChild(state.frogGhostPlayer);
      critter.position.set(app.screen.width / 20, state.stored);
      setPlayerCurrentHealth(getPlayerHealth());
      updatePlayerHealthBar(getPlayerHealth() / getPlayerHealth() * 100);
      // Reset castle health
      castleHealth = 100;
      // Remove any existing enemy death sprites
      // Set state.isCombat and playAgain to false
      state.isCombat = false;
      const enemyPortrait = document.getElementById('enemy-portrait');
      enemyPortrait.style.display = 'none'; // Make the element visible
      playAgain = false;
      setIsDead(false);
      critter.loop = true;
      critter.textures = state.frogWalkTextures;
      critter.play();
      app.stage.addChild(critter);
      playRoundText(state.currentRound);

      // Loop through the enemies array and remove each enemy
      for (let i = 0; i < getEnemies().length; i++) {
        let enemy = getEnemies()[i];
        // console.log(i);
        app.stage.removeChild(enemy);
        app.stage.removeChild(enemy.hpBar);
        app.stage.removeChild(enemy.hpBarBackground);
        // Destroy the enemy object to free up memory
      }

      // Clear the enemies array
      enemies.length = 0;
      state.isAttackingChar = false;
      isMoving = true;
      isReset = true;
    }
  }



  function drawCharHitSplat(critter, enemy) {


    let damage = -enemy.attackDamage;


    const damageText = new PIXI.Text(`${damage}`, {
      fontSize: 24,
      fill: "rgb(240, 70, 60)", // This is a slightly more red color.
      fontWeight: "bold",
      stroke: "#000",
      strokeThickness: 3,
      strokeOutside: true
    });

    damageText.anchor.set(0.5);
    damageText.position.set(critter.position.x - 40, critter.position.y - 60);
    app.stage.addChild(damageText);

    // Animate the hitsplat
    const startY = damageText.position.y; // Adjust the starting Y position as needed
    const duration = 100; // Animation duration in milliseconds
    let elapsed = 0; // Elapsed time
    const update = (ticker) => {
      elapsed += ticker.deltaTime;

      if (elapsed >= duration) {
        app.ticker.remove(update); // Stop the ticker update
        app.stage.removeChild(damageText); // Remove hitsplat after animation
      } else {
        const progress = elapsed / duration;
        damageText.position.y = startY - (progress * 30); // Update the Y position based on progress
        damageText.alpha = 1 - progress/3; // Update the alpha (opacity) based on progress
      }
    };

    app.ticker.add(update); // Start the ticker update for hitsplat animation
  }


  function drawHitSplat(enemy) {
    // Flash hit color for a brief second
    const originalTint = enemy.tint;
    enemy.tint = 0xFF0000; // Set the hit color
    setTimeout(() => {
      enemy.tint = originalTint; // Reset to original color
    }, 100);
    let damage = null;
    const characterType = getCurrentCharacter();
    const enemyType = enemy.type;
  
    switch (characterType) {
      case 'character-snail':
        if (enemyType === 'imp' || enemyType === 'toofer') {  
          damage = Math.round(getSnailDamage() * 1.75); // Half damage for weak against enemy.type toofer
        } else if (enemyType === 'scorp') {
          damage = Math.round(getSnailDamage() * .75); // Double damage for strong against enemy.type scorp and puffer
        } else {
          damage = Math.round(getSnailDamage());
        }
        enemy.currentHP -= damage;
        break;
      case 'character-bird':
        if (enemyType === 'imp' || enemyType === 'toofer') {
          damage = Math.round(getBirdDamage() * 0.3); // 1/4 damage for weak against enemy.type imp and toofer
        } else if (enemyType === 'shark' || enemyType === 'puffer') {
          damage = Math.round(getBirdDamage() * 1.75); // Double damage for strong against enemy.type shark and octo
        } else {
          damage = Math.round(getBirdDamage());
        }
        enemy.currentHP -= damage;
        break;
      case 'character-frog':
        if (enemyType === 'pig' || enemyType === 'scorp') {
          damage = Math.round(getFrogDamage() * 1.75); // Double damage for strong against enemy.type pig and scorp
        } else if (enemyType === 'puffer') {
          damage = Math.round(getFrogDamage() * 0.75); // Half damage for weak against enemy.type ele and octo
        } else {
          damage = Math.round(getFrogDamage());
        }
        enemy.currentHP -= damage;
        break;
      case 'character-bee':
        if (enemyType === 'ele' || enemyType === 'octo') {
          damage = Math.round(getBeeDamage() * 1.75); // Double damage for strong against enemy.type ele and puffer
        } else if (enemyType === 'octo') {
          damage = Math.round(getBeeDamage() * 0.75); // Half damage for weak against enemy.type shark and pig
        } else {
          damage = Math.round(getBeeDamage());
        }
        enemy.currentHP -= damage;
        break;
      default:
        console.log('Invalid character type');
    }
  
    drawEnemyHPBar(enemy);
    updateEnemyGrayscale(enemy.currentHP);
    const damageText = new PIXI.Text(`${-damage}`, {
      fontSize: 24,
      fill: "rgb(240, 70, 60)", // This is a slightly more red color.
      fontWeight: "bold",
      stroke: "#000",
      strokeThickness: 3,
      strokeOutside: true
    });
  
    damageText.anchor.set(0.5);
    damageText.position.set(enemy.position.x + 40, enemy.position.y - 30);
    app.stage.addChild(damageText);
  
    // Animate the hitsplat
    const startY = damageText.position.y; // Adjust the starting Y position as needed
    const duration = 100; // Animation duration in milliseconds
    let elapsed = 0; // Elapsed time
    const update = (ticker) => {
      elapsed += ticker.deltaTime;

      if (elapsed >= duration) {
        app.ticker.remove(update); // Stop the ticker update
        app.stage.removeChild(damageText); // Remove hitsplat after animation
      } else {
        const progress = elapsed / duration;
        damageText.position.y = startY - progress * 30; // Update the Y position based on progress
        damageText.alpha = 1 - progress; // Update the alpha (opacity) based on progress
      }
    };

    app.ticker.add(update); // Start the ticker update for hitsplat animation
  }


  function handlePlayClick() {

    if (!state.isGameStarted) {
      state.isGameStarted = true;
      resetTimer();
      startTimer();
      startGame();
    }
  }



  function updateEXP(exp, expToLevel1) {
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
  state.updateEXP = updateEXP;



  function animateUpgradeBoxes() {
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


  function setCharacterSpeed(currentCharacter, speed) {
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

  function setCharacterHealth(currentCharacter, health) {
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

  function setCharacterDamage(currentCharacter, attack) {
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


  function handleUpgrade(upgradeType) {
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
        //console.log(getCharacterSpeed(state.currentCharacter));
        divElement.textContent = stats.speed.toString();

        setSelectLevel(getSelectLevel() - 1);

        break;

      case 'attack-upgrade':
        // Logic for attack upgrade
        console.log('Attack upgrade');
        var divElement = document.getElementById("swords-level");
        stats.attack += 3; // Update the attack stat for the current character
        setCharacterDamage(state.currentCharacter, stats.attack);
        // setSnailDamage(getSnailDamage() + 5);
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
    state.chooseSound.volume = .22;
    state.chooseSound.play();

    if (getSelectLevel() <= 0) {
      for (let i = 0; i < upgradeBoxes.length; i++) {
        upgradeBoxes[i].style.visibility = 'hidden';
      }
    }

    state.isUpgradeBoxesAnimated = false;
  }

  function levelUp() {
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
        // Update level for character-snail
        updateCharacterLevel(state.snailLevel++);
        break;
      case 'character-bird':
        // Update level for character-bird
        updateCharacterLevel(state.birdLevel++);
        break;
      case 'character-frog':
        // Update level for character-frog
        updateCharacterLevel(state.frogLevel++);
        break;
      case 'character-bee':
        // Update level for character-bee
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

  function handleVisibilityChange() {
    if (!document.hidden && !state.isSpawning && !getisDead()) {
      spawnEnemies();
  }
    if (document.hidden || document.webkitHidden) {
      // Document is hidden, perform actions here (e.g., pause the game)
      if (getPlayerCurrentHealth() > 0) {
        setisPaused(true);
      }
    } else {
      if (getPlayerCurrentHealth() > 0) {
        // Document is visible again, perform actions here (e.g., resume the game)
        setisPaused(false);
      }
    }
  }



  // Add event listeners for visibility change
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("webkitvisibilitychange", handleVisibilityChange);
  // Add touchstart event listener
  document.addEventListener("touchstart", () => {
    // Increment touch count
    state.touchCount++;
  });
  // Add touchend event listener
  document.addEventListener("touchend", () => {
    // Decrement touch count
    state.touchCount--;
    // Check if all touches are released
    if (state.touchCount === 0) {
      handleAllTouchesReleased();
    }
  });


  // Function to handle all touches released
  function handleAllTouchesReleased() {
    // Your functionality when all touches are released
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    console.log("All touches released.");
    handleTouchEnd();
  }



  // Save game data
  function saveGame() {
    localStorage.removeItem('gameSave');
    gameData = {
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
      birdEXPToLevel: state.birdEXPToLevel
    };

    const saveData = JSON.stringify(gameData);
    localStorage.setItem('gameSave', saveData);
  }

  // Load game data
  function loadGame() {
    const savedData = localStorage.getItem('gameSave');
    if (savedData) {

      const gameData = JSON.parse(savedData);
     state.currentRound = gameData.currentRound;
   // state.currentRound = 20;
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
      characterLevelElement = document.getElementById("character-level");
      updateLightning = document.getElementById("lightning-level");
      updateHP = document.getElementById("heart-level");
      updateDamage = document.getElementById("swords-level");
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
      state.isCharacterMenuOpen = false; // Flag to track if the character menu is open

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
      roundover = false;
      state.cooldownActive = false;


    }
  }
  resetTimer();
      startTimer();
startGame();
isGameStart=true;
  }

});