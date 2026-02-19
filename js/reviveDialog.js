import state from './state.js';
import {
  getCoffee, setIsDead, setEnemiesInRange,
  getSnailHealth, getBirdHealth, getFrogHealth, getBeeHealth,
} from './state.js';
import {
  setCurrentSnailHealth, setCurrentBirdHealth, setCurrentFrogHealth, setCurrentBeeHealth,
  getCharacterName,
} from './characters.js';
import { addCoffee } from './combat.js';
import { openCharacterMenu } from './ui.js';

let _setisPaused = null;
let _handleCharacterClick = null;
let _spawnEnemies = null;

export function initReviveDialog({ setisPaused, handleCharacterClick, spawnEnemies }) {
  _setisPaused = setisPaused;
  _handleCharacterClick = handleCharacterClick;
  _spawnEnemies = spawnEnemies;
}

export function createReviveDialog(characterType) {
  const app = state.app;
  if (state.reviveDialogContainer && app.stage.children.includes(state.reviveDialogContainer)) {
    return;
  }

  state.reviveDialogContainer = new PIXI.Container();
  state.reviveDialogContainer.zIndex = 999999;

  const dialogW = Math.min(app.screen.width * 0.55, 320);
  const dialogH = Math.min(app.screen.height * 0.35, 200);
  const cornerRadius = 16;
  const canAfford = getCoffee() >= 50;
  const characterName = getCharacterName(characterType);

  // --- Background panel with rounded corners ---
  const panel = new PIXI.Graphics();
  panel.roundRect(0, 0, dialogW, dialogH, cornerRadius);
  panel.fill({ color: 0x0a0f19, alpha: 0.92 });
  panel.roundRect(0, 0, dialogW, dialogH, cornerRadius);
  panel.stroke({ width: 2, color: 0x64a0c8, alpha: 0.6 });
  state.reviveDialogContainer.addChild(panel);

  // --- Title text ---
  const titleStyle = new PIXI.TextStyle({
    fontFamily: 'Luckiest Guy',
    fontSize: Math.max(16, Math.min(24, dialogW * 0.07)),
    fill: '#e0e8f0',
    stroke: '#000000',
    strokeThickness: 3,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 4,
    dropShadowDistance: 1,
  });
  const title = new PIXI.Text(`Revive ${characterName}?`, titleStyle);
  title.anchor.set(0.5, 0);
  title.position.set(dialogW / 2, 14);
  state.reviveDialogContainer.addChild(title);

  // --- Cost line: bean icon + "50" ---
  const costStyle = new PIXI.TextStyle({
    fontFamily: 'Patrick Hand',
    fontSize: Math.max(14, Math.min(20, dialogW * 0.055)),
    fill: canAfford ? '#aaddaa' : '#ff8888',
    stroke: '#000000',
    strokeThickness: 2,
  });
  const costText = new PIXI.Text(`Cost: 50`, costStyle);
  costText.anchor.set(0.5, 0);
  costText.position.set(dialogW / 2 + 12, title.position.y + title.height + 6);
  state.reviveDialogContainer.addChild(costText);

  const beanSprite = new PIXI.Sprite(PIXI.Assets.get('bean'));
  beanSprite.anchor.set(0.5);
  beanSprite.scale.set(0.5);
  beanSprite.position.set(costText.position.x - costText.width / 2 - 14, costText.position.y + costText.height / 2);
  state.reviveDialogContainer.addChild(beanSprite);

  if (!canAfford) {
    const warnStyle = new PIXI.TextStyle({
      fontFamily: 'Patrick Hand',
      fontSize: Math.max(11, Math.min(15, dialogW * 0.04)),
      fill: '#ff6666',
      stroke: '#000000',
      strokeThickness: 2,
    });
    const warnText = new PIXI.Text(`(Not enough coffee!)`, warnStyle);
    warnText.anchor.set(0.5, 0);
    warnText.position.set(dialogW / 2, costText.position.y + costText.height + 2);
    state.reviveDialogContainer.addChild(warnText);
  }

  // --- Buttons ---
  const btnW = dialogW * 0.35;
  const btnH = 40;
  const btnY = dialogH - btnH - 16;
  const btnGap = 16;

  // Yes button
  const yesBg = new PIXI.Graphics();
  yesBg.roundRect(0, 0, btnW, btnH, 8);
  yesBg.fill({ color: canAfford ? 0x1a6630 : 0x333333, alpha: 0.85 });
  yesBg.roundRect(0, 0, btnW, btnH, 8);
  yesBg.stroke({ width: 2, color: canAfford ? 0x44cc66 : 0x666666, alpha: 0.7 });
  yesBg.position.set(dialogW / 2 - btnW - btnGap / 2, btnY);
  state.reviveDialogContainer.addChild(yesBg);

  const yesBtnStyle = new PIXI.TextStyle({
    fontFamily: 'Luckiest Guy',
    fontSize: Math.max(14, Math.min(18, dialogW * 0.05)),
    fill: canAfford ? '#88ff88' : '#888888',
    stroke: '#000000',
    strokeThickness: 2,
  });
  const yesLabel = new PIXI.Text('Revive', yesBtnStyle);
  yesLabel.anchor.set(0.5);
  yesLabel.position.set(yesBg.position.x + btnW / 2, btnY + btnH / 2);
  state.reviveDialogContainer.addChild(yesLabel);

  // No button
  const noBg = new PIXI.Graphics();
  noBg.roundRect(0, 0, btnW, btnH, 8);
  noBg.fill({ color: 0x661a1a, alpha: 0.85 });
  noBg.roundRect(0, 0, btnW, btnH, 8);
  noBg.stroke({ width: 2, color: 0xcc4444, alpha: 0.7 });
  noBg.position.set(dialogW / 2 + btnGap / 2, btnY);
  state.reviveDialogContainer.addChild(noBg);

  const noBtnStyle = new PIXI.TextStyle({
    fontFamily: 'Luckiest Guy',
    fontSize: Math.max(14, Math.min(18, dialogW * 0.05)),
    fill: '#ff8888',
    stroke: '#000000',
    strokeThickness: 2,
  });
  const noLabel = new PIXI.Text('Cancel', noBtnStyle);
  noLabel.anchor.set(0.5);
  noLabel.position.set(noBg.position.x + btnW / 2, btnY + btnH / 2);
  state.reviveDialogContainer.addChild(noLabel);

  // Position dialog centered on screen (in stage coords)
  const dialogX = -app.stage.x + (app.screen.width - dialogW) / 2;
  const dialogY = -app.stage.y + (app.screen.height - dialogH) / 2;
  state.reviveDialogContainer.position.set(dialogX, dialogY);

  app.stage.addChild(state.reviveDialogContainer);
  _setisPaused(true);

  // --- Button interactivity ---
  yesBg.eventMode = 'static';
  yesBg.cursor = 'pointer';
  yesLabel.eventMode = 'static';
  yesLabel.cursor = 'pointer';
  noBg.eventMode = 'static';
  noBg.cursor = 'pointer';
  noLabel.eventMode = 'static';
  noLabel.cursor = 'pointer';

  let reviveProcessing = false; // prevent double-click

  const doRevive = () => {
    if (reviveProcessing) return;
    if (getCoffee() >= 50) {
      reviveProcessing = true;
      // Restore health
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
      app.stage.removeChild(state.reviveDialogContainer);
      state.reviveDialogContainer = null;
      const revivingSelf = characterType === state.selectedCharacter;

      // --- Ghost cleanup (shared by both paths) ---
      setIsDead(false);
      if (state.ghostFlyInterval) {
        clearInterval(state.ghostFlyInterval);
        state.ghostFlyInterval = null;
      }
      if (state.frogGhostPlayer && state.app.stage.children.includes(state.frogGhostPlayer)) {
        state.app.stage.removeChild(state.frogGhostPlayer);
      }
      // Reset enemies so they re-engage cleanly (keep them on the field)
      for (const enemy of state.enemies) {
        enemy.play();
        enemy.enemyAdded = false;
        enemy.isAttacking = false;
        enemy.onFrameChange = null;
      }

      // Reset combat flags
      state.roundOver = false;
      state.isCombat = false;
      setEnemiesInRange(0);
      state.isAttackingChar = false;
      state.isCharAttacking = false;
      state.hasAttackedThisFrame = false;
      state.isPointerDown = false;
      state.isPaused = false;

      // Hide enemy portrait
      const enemyPortrait = document.getElementById('enemy-portrait');
      if (enemyPortrait) enemyPortrait.style.display = 'none';
      // Unify both self-revive and cross-revive through handleCharacterClick.
      // For self-revive, clear selectedCharacter so handleCharacterClick runs
      // the full swap path (prevSelected !== characterType).
      if (revivingSelf) {
        state.selectedCharacter = '';
      }
      _handleCharacterClick(characterType);
      // Reset spawner AFTER setisPaused — setisPaused adjusts timeOfLastSpawn
      // by adding pause duration, which can push it into the future and stall spawns
      if (state.enemySpawnTimeout) {
        clearTimeout(state.enemySpawnTimeout);
        state.enemySpawnTimeout = null;
      }
      state.isSpawning = false;
      state.timeOfLastSpawn = Date.now();
      _spawnEnemies();
    } else {
      // Can't afford — shake dialog
      state.hitSound.volume = state.effectsVolume;
      state.hitSound.play();
      if (!state.reviveDialogContainer) return;
      const origX = state.reviveDialogContainer.position.x;
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        if (!state.reviveDialogContainer) { clearInterval(shakeInterval); return; }
        state.reviveDialogContainer.position.x = origX + (shakeCount % 2 === 0 ? 8 : -8);
        shakeCount++;
        if (shakeCount >= 6) {
          clearInterval(shakeInterval);
          if (state.reviveDialogContainer) state.reviveDialogContainer.position.x = origX;
        }
      }, 50);
    }
  };

  const doCancel = () => {
    if (!state.reviveDialogContainer) return;
    app.stage.removeChild(state.reviveDialogContainer);
    state.reviveDialogContainer = null;
    openCharacterMenu();
  };

  yesBg.on('pointerdown', (e) => { e.stopPropagation(); doRevive(); });
  yesLabel.on('pointerdown', (e) => { e.stopPropagation(); doRevive(); });
  noBg.on('pointerdown', (e) => { e.stopPropagation(); doCancel(); });
  noLabel.on('pointerdown', (e) => { e.stopPropagation(); doCancel(); });
}
