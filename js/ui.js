import state from './state.js';
import { getPlayerCurrentHealth, getPlayerHealth, getCurrentCharacter, getEXPtoLevel, getSelectLevel, getCoffee, getisPaused, getisDead } from './state.js';
import { pauseTimer, startTimer } from './timer.js';
// --- Pause menu helpers ---

export function createBackgroundSprite() {
  const sw = state.app.screen.width;
  const sh = state.app.screen.height;
  const backgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  backgroundSprite.width = Math.min(sw * 0.7, 520);
  // Clamp height so it doesn't overflow on landscape mobile
  backgroundSprite.height = Math.min(sh * 0.75, 500, sh - 20);
  backgroundSprite.tint = 0x0a0a14;
  backgroundSprite.alpha = 0.88;
  return backgroundSprite;
}

export function createBorder(backgroundSprite) {
  const border = new PIXI.Graphics();
  const bw = backgroundSprite.width;
  const bh = backgroundSprite.height;
  const r = 14;
  border.roundRect(0, 0, bw, bh, r).stroke({ width: 2, color: 0x6688aa });
  return border;
}

export function getTextStyle(backgroundSpriteWidth) {
  const baseFontSize = Math.max(18, Math.min(36, backgroundSpriteWidth * 0.07));
  return new PIXI.TextStyle({
    fontFamily: 'Patrick Hand',
    fontSize: baseFontSize,
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeThickness: 4,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 3,
    dropShadowAngle: Math.PI / 6,
    dropShadowDistance: 2,
    wordWrap: true,
    wordWrapWidth: backgroundSpriteWidth * 0.8,
  });
}

export function createText(textContent, textStyle, backgroundSprite, isRoundText = false) {
  const text = new PIXI.Text(textContent, textStyle);
  text.anchor.set(0.5);
  const yPos = isRoundText ? backgroundSprite.height * 0.22 : backgroundSprite.height * 0.1;
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
  const bw = backgroundSprite.width;
  const volumeSlider = new PIXI.Container();
  const trackWidth = bw * 0.4;
  volumeSlider.position.set(bw * 0.45, yOffset);

  const labelFontSize = Math.max(14, Math.min(24, bw * 0.05));

  // Rounded track background (taller hit area for mobile)
  const sliderBackground = new PIXI.Graphics();
  sliderBackground.roundRect(0, -18, trackWidth, 36, 10)
    .fill({ color: 0x000000, alpha: 0 }); // invisible wide hit area
  sliderBackground.roundRect(0, -8, trackWidth, 16, 8)
    .fill({ color: 0x000000, alpha: 0.4 })
    .stroke({ width: 1, color: 0x666666 });
  sliderBackground.eventMode = 'static';
  volumeSlider.addChild(sliderBackground);

  const labelText = new PIXI.Text(label, {
    fontFamily: 'Patrick Hand',
    fontSize: labelFontSize,
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeThickness: 3,
  });
  labelText.anchor.set(1, 0.5);
  labelText.position.set(-12, 0);
  volumeSlider.addChild(labelText);

  const ball = createSliderBall(backgroundSprite, type, trackWidth);
  volumeSlider.addChild(ball);

  // Tap anywhere on the track to jump the slider ball there
  sliderBackground.on('pointerdown', (event) => {
    const localX = event.data.global.x - volumeSlider.getGlobalPosition().x;
    const newX = Math.max(0, Math.min(trackWidth, localX));
    ball.x = newX;
    const vol = newX / trackWidth;
    if (type === 'music') {
      state.musicVolume = vol;
      if (state.themeMusic) state.themeMusic.volume = vol;
    } else {
      state.effectsVolume = vol;
    }
    event.stopPropagation();
  });

  return volumeSlider;
}

export function createSliderBall(backgroundSprite, type, trackWidth) {
  const currentVolume = type === 'music' ? state.musicVolume : state.effectsVolume;
  const ballRadius = Math.max(12, Math.min(18, backgroundSprite.width * 0.038));

  const sliderBall = new PIXI.Graphics();
  // Invisible larger hit area for easier mobile touch
  sliderBall.circle(0, 0, ballRadius + 14).fill({ color: 0xFFFFFF, alpha: 0 });
  // Visible ball
  sliderBall.circle(0, 0, ballRadius).fill({ color: 0xFFFFFF }).stroke({ width: 2, color: 0x000000 });
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
  const bw = backgroundSprite.width;
  const bh = backgroundSprite.height;
  const fontSize = Math.max(11, Math.min(16, bw * 0.035));
  const btnW = Math.max(100, bw * 0.35);
  const btnH = Math.max(28, bh * 0.065);

  const container = new PIXI.Container();
  container.position.set(bw * 0.85, bh * 0.9);

  const bg = new PIXI.Graphics();
  bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 6)
    .fill({ color: 0x551122, alpha: 0.7 })
    .stroke({ width: 1.5, color: 0xaa3344, alpha: 0.8 });
  bg.eventMode = 'static';
  bg.cursor = 'pointer';
  container.addChild(bg);

  const txt = new PIXI.Text('Delete Save', {
    fontFamily: 'Luckiest Guy',
    fontSize: fontSize,
    fill: '#ff6666',
    stroke: '#000000',
    strokeThickness: 2,
  });
  txt.anchor.set(0.5);
  txt.eventMode = 'static';
  txt.cursor = 'pointer';
  container.addChild(txt);

  // Confirmation state
  let awaitingConfirm = false;
  let confirmTimeout = null;

  function handleClick() {
    if (!awaitingConfirm) {
      awaitingConfirm = true;
      txt.text = 'Are you sure?';
      txt.style.fill = '#ff4444';
      bg.clear();
      bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 6)
        .fill({ color: 0x771122, alpha: 0.85 })
        .stroke({ width: 2, color: 0xff4444, alpha: 0.9 });
      confirmTimeout = setTimeout(() => {
        awaitingConfirm = false;
        txt.text = 'Delete Save';
        txt.style.fill = '#ff6666';
        bg.clear();
        bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 6)
          .fill({ color: 0x551122, alpha: 0.7 })
          .stroke({ width: 1.5, color: 0xaa3344, alpha: 0.8 });
      }, 3000);
    } else {
      clearTimeout(confirmTimeout);
      // Wipe ALL progress
      localStorage.removeItem('gameSave');
      localStorage.removeItem('crittorsBones');
      window.location.reload();
    }
  }

  bg.on('pointerdown', handleClick);
  txt.on('pointerdown', handleClick);

  return container;
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

  const bw = backgroundSprite.width;
  const bh = backgroundSprite.height;

  const pauseText = 'Game Paused';
  const roundText = state.gameMode === 'endless' ? '' : 'Round: ' + state.currentRound;

  const textStyle = getTextStyle(bw);
  const text = createText(pauseText, textStyle, backgroundSprite);
  state.pauseMenuContainer.addChild(text);

  if (roundText) {
    const text1 = createText(roundText, textStyle, backgroundSprite, true);
    state.pauseMenuContainer.addChild(text1);
  }

  // Compact layout flag for landscape/short screens
  const isCompact = bh < 350;
  const sliderY1 = isCompact ? bh * 0.26 : bh * 0.32;
  const sliderY2 = isCompact ? bh * 0.38 : bh * 0.44;
  const btnY1    = isCompact ? bh * 0.52 : bh * 0.58;
  const btnY2    = isCompact ? bh * 0.66 : bh * 0.72;
  const delY     = isCompact ? bh * 0.82 : bh * 0.9;

  const musicSlider = createVolumeSlider(backgroundSprite, sliderY1, 'Music', 'music');
  state.pauseMenuContainer.addChild(musicSlider);

  const effectsSlider = createVolumeSlider(backgroundSprite, sliderY2, 'Effects', 'effects');
  state.pauseMenuContainer.addChild(effectsSlider);

  // Button dimensions
  const menuFontSize = Math.max(13, Math.min(22, bw * 0.045));
  const btnW = Math.max(120, bw * 0.55);
  const btnH = Math.max(30, bh * 0.075);

  // Helper to create a styled button with accent color
  function addPauseButton(label, yPos, handler, fillColor, strokeColor) {
    const style = new PIXI.TextStyle({
      fontFamily: 'Luckiest Guy',
      fontSize: menuFontSize,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
    });
    const txt = new PIXI.Text(label, style);
    txt.anchor.set(0.5);
    txt.position.set(bw / 2, yPos);
    txt.eventMode = 'static';
    txt.cursor = 'pointer';
    const bg = new PIXI.Graphics();
    bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 8)
      .fill({ color: fillColor, alpha: 0.65 })
      .stroke({ width: 1.5, color: strokeColor, alpha: 0.8 });
    bg.position.set(txt.x, txt.y);
    bg.eventMode = 'static';
    bg.cursor = 'pointer';
    bg.on('pointerdown', handler);
    txt.on('pointerdown', handler);
    state.pauseMenuContainer.addChild(bg);
    state.pauseMenuContainer.addChild(txt);
  }

  // Submit Score button — blue accent
  addPauseButton('Submit Score', btnY1, () => {
    if (window._crittorsShowPauseScore) window._crittorsShowPauseScore();
  }, 0x2a4477, 0x5588bb);

  // Main Menu button — muted red accent
  addPauseButton('Main Menu', btnY2, () => { window.location.reload(); }, 0x662233, 0xaa5566);

  const garbageButton = createGarbageButton(backgroundSprite);
  // Override Y to use compact-aware position
  garbageButton.position.y = delY;
  state.pauseMenuContainer.addChild(garbageButton);

  let pauseX = -state.app.stage.position.x + (state.app.screen.width / 2) - (state.pauseMenuContainer.width / 2);
  let pauseY = -state.app.stage.position.y + (state.app.screen.height / 2) - (state.pauseMenuContainer.height / 2);
  state.pauseMenuContainer.position.set(pauseX, pauseY);

  state.app.stage.addChild(state.pauseMenuContainer);

  return state.pauseMenuContainer;
}

// --- Should return early check ---

export function shouldReturnEarly(value) {
  if ((value && state.pauseMenuContainer) || (!value && state.isUnpausing) || state.app.stage.children.includes(state.reviveDialogContainer)) {
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

  const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');

  // If paused waiting for character selection (dead), always show menu — don't toggle close
  const forceOpen = getisPaused() && getPlayerCurrentHealth() <= 0;

  if (state.isCharacterMenuOpen && !forceOpen) {
    characterBoxes.forEach((box) => {
      box.style.visibility = 'hidden';
    });
    state.isCharacterMenuOpen = false;
  } else {
    const visibleBoxes = [];
    characterBoxes.forEach((box) => {
      const charClass = box.classList[1];
      if (!state.unlockedCharacters.includes(charClass)) {
        box.style.visibility = 'hidden';
      } else if (!getisDead() && state.selectedCharacter !== "" && box.classList.contains(state.selectedCharacter)) {
        box.style.visibility = 'hidden';
      } else {
        box.style.visibility = 'visible';
        visibleBoxes.push(box);
      }
    });
    // Evenly space visible boxes so nothing overlaps
    const totalWidth = visibleBoxes.length * 60;
    const startOffset = -totalWidth / 2;
    visibleBoxes.forEach((box, i) => {
      box.style.left = 'calc(45% + ' + (startOffset + i * 60) + 'px)';
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
  const roundedEnder = Math.round(expToLevel).toFixed();
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
