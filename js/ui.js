import state from './state.js';
import { getPlayerCurrentHealth, getPlayerHealth, getCurrentCharacter, getEXPtoLevel, getSelectLevel, getCoffee } from './state.js';
import { pauseTimer, startTimer } from './timer.js';

// --- Pause menu helpers ---

export function createBackgroundSprite() {
  const backgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  backgroundSprite.width = state.app.screen.width;
  backgroundSprite.height = Math.max(state.app.screen.height * 0.4, 300);
  backgroundSprite.tint = 0xFFFFFF;
  backgroundSprite.alpha = 0.8;
  return backgroundSprite;
}

export function createBorder(backgroundSprite) {
  const border = new PIXI.Graphics();
  border.rect(0, 0, backgroundSprite.width, backgroundSprite.height).stroke({ width: 4, color: 0x8B4513 });
  return border;
}

export function getTextStyle(backgroundSpriteWidth) {
  return new PIXI.TextStyle({
    fontFamily: 'Patrick Hand',
    fontSize: 44,
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 4,
    dropShadowAngle: Math.PI / 6,
    dropShadowDistance: 2,
    wordWrap: true,
    wordWrapWidth: backgroundSpriteWidth / 2,
  });
}

export function createText(textContent, textStyle, backgroundSprite, isRoundText = false) {
  const text = new PIXI.Text(textContent, textStyle);
  text.anchor.set(0.5);
  const yPos = isRoundText ? backgroundSprite.height / 1.5 : backgroundSprite.height / 6;
  text.position.set(backgroundSprite.width / 2, yPos);
  return text;
}

export function setVolume(normalizedValue, type) {
  if (type === 'music') {
    state.musicVolume = normalizedValue;
    if (state.themeMusic) {
      state.themeMusic.volume = normalizedValue;
    }
  } else if (type === 'effects') {
    state.effectsVolume = normalizedValue;
  }
}

export function createVolumeSlider(backgroundSprite, yOffset, label, type) {
  const volumeSlider = new PIXI.Container();
  const trackWidth = backgroundSprite.width * 0.35;
  volumeSlider.position.set(backgroundSprite.width * 0.4, yOffset);

  const sliderBackground = new PIXI.Graphics();
  sliderBackground.rect(0, -10, trackWidth, 20).fill(0x000000);
  sliderBackground.eventMode = 'static';
  sliderBackground.on('pointerdown', (event) => { event.stopPropagation(); });
  volumeSlider.addChild(sliderBackground);

  const labelText = new PIXI.Text(label, {
    fontFamily: 'Patrick Hand',
    fontSize: 32,
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeThickness: 4,
  });
  labelText.anchor.set(1, 0.5);
  labelText.position.set(-20, 0);
  volumeSlider.addChild(labelText);

  const ball = createSliderBall(backgroundSprite, type, trackWidth);
  volumeSlider.addChild(ball);

  return volumeSlider;
}

export function createSliderBall(backgroundSprite, type, trackWidth) {
  const currentVolume = type === 'music' ? state.musicVolume : state.effectsVolume;

  // White circle with black outline instead of emoji
  const sliderBall = new PIXI.Graphics();
  sliderBall.circle(0, 0, 14).fill({ color: 0xFFFFFF }).stroke({ width: 3, color: 0x000000 });
  sliderBall.position.set(currentVolume * trackWidth, 0);

  let isDragging = false;
  let offsetX = 0;

  sliderBall.eventMode = 'static';
  sliderBall.cursor = 'pointer';
  sliderBall.isSlider = true;

  sliderBall.on('pointerdown', (event) => {
    isDragging = true;
    offsetX = event.data.global.x - sliderBall.x;
    event.stopPropagation();
  });

  // Use globalpointermove so drag works even when cursor leaves the ball
  sliderBall.on('globalpointermove', (event) => {
    if (isDragging) {
      let newX = event.data.global.x - offsetX;
      newX = Math.max(0, Math.min(trackWidth, newX));
      sliderBall.x = newX;
      setVolume(newX / trackWidth, type);
    }
  });

  sliderBall.on('pointerup', () => {
    isDragging = false;
  });

  sliderBall.on('pointerupoutside', () => {
    isDragging = false;
  });

  return sliderBall;
}

export function createGarbageButton(backgroundSprite) {
  const garbageButton = new PIXI.Text('\u{1F5D1}\u{FE0F}', { fontSize: 70 });
  garbageButton.anchor.set(0.4);
  garbageButton.position.set((backgroundSprite.width / 4) * 2, backgroundSprite.height - 200);

  garbageButton.eventMode = 'static';
  garbageButton.cursor = 'pointer';

  garbageButton.on('pointerdown', () => {
    alert("DELETED");
    localStorage.removeItem('gameSave');
    state.unlockedCharacters = ['character-frog'];
  });

  return garbageButton;
}

// --- Pause menu container ---

export function createPauseMenuContainer() {
  state.pauseMenuContainer = new PIXI.Container();
  state.pauseMenuContainer.myCustomID = 'pauseMenuX';
  state.pauseMenuContainer.zIndex = 999999;
  state.pauseMenuContainer.eventMode = 'static';

  const backgroundSprite = createBackgroundSprite();
  state.pauseMenuContainer.addChild(backgroundSprite);

  const border = createBorder(backgroundSprite);
  state.pauseMenuContainer.addChild(border);

  const pauseText = 'Game Paused';
  const roundText = 'Round: ' + state.currentRound;

  const textStyle = getTextStyle(backgroundSprite.width);
  const text = createText(pauseText, textStyle, backgroundSprite);
  state.pauseMenuContainer.addChild(text);

  const text1 = createText('\n' + roundText, textStyle, backgroundSprite, true);
  state.pauseMenuContainer.addChild(text1);

  const musicSlider = createVolumeSlider(backgroundSprite, backgroundSprite.height * 0.3, 'Music', 'music');
  state.pauseMenuContainer.addChild(musicSlider);

  const effectsSlider = createVolumeSlider(backgroundSprite, backgroundSprite.height * 0.45, 'Effects', 'effects');
  state.pauseMenuContainer.addChild(effectsSlider);

  const garbageButton = createGarbageButton(backgroundSprite);
  garbageButton.position.set(backgroundSprite.width - garbageButton.width - 10, backgroundSprite.height);
  state.pauseMenuContainer.addChild(garbageButton);

  let pauseX = -state.app.stage.position.x + (state.app.screen.width / 2) - (state.pauseMenuContainer.width / 2);
  let pauseY = -state.app.stage.position.y + (state.app.screen.width / 2) - (state.pauseMenuContainer.height / 2);
  state.pauseMenuContainer.position.set(pauseX, pauseY);

  state.app.stage.addChild(state.pauseMenuContainer);

  return state.pauseMenuContainer;
}

// --- Should return early check ---

export function shouldReturnEarly(value) {
  if ((value && state.pauseMenuContainer) || (!value && state.isUnpausing) || state.app.stage.children.includes(state.reviveDialogContainer)) {
    console.log('returning early');
    return true;
  }

  const spawnTextElement = document.getElementById('spawn-text');
  const computedStyle = window.getComputedStyle(spawnTextElement);
  const visibility = computedStyle.getPropertyValue('visibility');

  return visibility === 'visible';
}

// --- Dialog/menu positioning update ---

export function updateDialogPositions() {
  if (state.reviveDialogContainer) {
    let dialogX = -state.app.stage.position.x + (state.app.screen.width / 2) - (state.reviveDialogContainer.width / 2);
    let dialogY = -state.app.stage.position.y + (state.app.screen.height / 2) - (state.reviveDialogContainer.height / 2);
    state.reviveDialogContainer.position.set(dialogX, dialogY);
  }

  if (state.pauseMenuContainer) {
    let pauseX = -state.app.stage.position.x + (state.app.screen.width / 2) - (state.pauseMenuContainer.width / 2);
    let pauseY = -state.app.stage.position.y + (state.app.screen.height / 2) - (state.pauseMenuContainer.height / 2);
    state.pauseMenuContainer.position.set(pauseX, pauseY);
  }
}

// --- Wipe state ---

export function getIsWiped() {
  return state.isWiped;
}

export function setisWiped(value) {
  console.log("WIPED");
  state.isWiped = value;

  var wipeText = document.getElementById("wipe-text");

  if (getIsWiped()) {
    wipeText.style.visibility = "visible";
  } else {
    wipeText.style.visibility = "hidden";
  }
}

// --- Cooldown ---

export function isCooldownActive() {
  return state.cooldownActive;
}

export function startCooldown() {
  state.cooldownActive = true;

  const overlayElement = document.getElementById("cooldown-overlay");
  overlayElement.style.display = "block";

  setTimeout(() => {
    state.cooldownActive = false;
    overlayElement.style.display = "none";
  }, state.cooldownDuration);
}

// --- Character menu ---

export function openCharacterMenu() {
  if (getSelectLevel() >= 1) {
    return;
  }

  if (isCooldownActive()) {
    return;
  }

  const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');

  if (state.isCharacterMenuOpen) {
    characterBoxes.forEach((box) => {
      box.style.visibility = 'hidden';
    });
    state.isCharacterMenuOpen = false;
  } else {
    characterBoxes.forEach((box) => {
      const charClass = box.classList[1];
      if (!state.unlockedCharacters.includes(charClass)) {
        box.style.visibility = 'hidden';
      } else if (state.selectedCharacter !== "" && box.classList.contains(state.selectedCharacter)) {
        box.style.visibility = 'hidden';
      } else {
        box.style.visibility = 'visible';
      }
    });
    state.isCharacterMenuOpen = true;
  }
}

// --- HUD updates ---

export function updatePlayerHealthBar(health) {
  const playerHealthBarFill = document.getElementById('health-bar-fill');
  playerHealthBarFill.style.width = health + '%';
  updateGrayscale(health);
  updateBarText('hp-text', 'hp', health);
}

export function updateBarText(elementId, labelText, value) {
  const barText = document.getElementById(elementId);
  const roundedValue = getPlayerCurrentHealth().toFixed();
  barText.innerText = `${labelText}:\u00A0 ${roundedValue}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\/${getPlayerHealth()}`;
}

export function updateGrayscale(hpPercentage) {
  const grayscalePercentage = 100 - hpPercentage;
  document.getElementById('character-portrait').style.filter = `sepia(${grayscalePercentage}%)`;
}

export function updateEnemyGrayscale(hpPercentage) {
  const grayscalePercentage = 100 - hpPercentage;
  document.getElementById('enemy-portrait').style.filter = `grayscale(${grayscalePercentage}%)`;
}

export function updateExpText(elementId, labelText, value, expToLevel) {
  const barText = document.getElementById(elementId);
  const roundedEXPValue = Math.round(value).toFixed();
  const roundedEnder = Math.round(state.expToLevel).toFixed();
  barText.innerText = `${labelText}: ${roundedEXPValue}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\/${roundedEnder}`;
}

// --- Round text ---

export function playRoundText(round) {
  var roundText = document.getElementById("round-text");

  roundText.innerHTML = round;

  roundText.style.opacity = 1;
  roundText.style.display = "block";
  roundText.style.visibility = "visible";

  var opacity = 1;
  var fadeOutInterval = setInterval(function () {
    if (opacity > 0) {
      opacity -= 0.01;
      roundText.style.opacity = opacity;
    } else {
      roundText.style.display = "none";
      clearInterval(fadeOutInterval);
    }
  }, 10);
}
