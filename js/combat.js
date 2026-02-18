// combat.js — Enemy spawning, AI, attacks, damage, hit splats, coffee drops

import state from './state.js';
import {
  getEnemies, addEnemies,
  getCurrentCharacter, getEnemiesInRange, setEnemiesInRange,
  getIsCharAttacking, setIsCharAttacking, setCharAttackAnimating,
  setIsDead, getisDead, getisPaused,
  getPlayerCurrentHealth, getPlayerHealth,
  getSnailDamage, getBirdDamage, getFrogDamage, getBeeDamage,
  getFrogTintColor, getCoffee, setCoffee,
  getCharEXP, getEXPtoLevel,
  getShieldCount, setShieldCount, getBombCount, setBombCount,
  getRageCount, setRageCount, getFeatherCount, setFeatherCount,
  getGoldenBeanCount, setGoldenBeanCount,
  getBones, setBones,
} from './state.js';
import { isTimerFinished } from './timer.js';
import { startFlashing, stopFlashing, setPlayerCurrentHealth, setCharEXP, getCharacterDamage } from './characters.js';
import { updatePlayerHealthBar, updateEnemyGrayscale } from './ui.js';
import { updateEXP } from './upgrades.js';
import { saveBones } from './save.js';

// --- Synthesized SFX via Web Audio API ---
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

export function playCoinSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  // Two quick high-pitched tones for a metallic clink
  [1800, 2400].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04);
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.04);
    osc.stop(ctx.currentTime + i * 0.04 + 0.08);
  });
}

export function playSwordSlashSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  // Noise burst shaped like a slash — fast attack, quick decay
  const duration = 0.12;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    // Envelope: sharp attack, fast decay
    const env = t < 0.05 ? t / 0.05 : Math.exp(-12 * (t - 0.05));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  // Bandpass filter for a metallic, airy quality
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3000, ctx.currentTime);
  filter.Q.setValueAtTime(1.2, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export function checkEnemyCollision(projectile, enemy) {
  const projectileX = projectile.position.x;
  const projectileWidth = projectile.width;

  const enemyX = enemy.x;
  const enemyWidth = enemy.width;

  return (
    projectileX + projectileWidth > enemyX &&
    projectileX < enemyX + enemyWidth
  );
}


export function getEnemyPortraitUrl(enemyName) {
  // Find the matching enemy portrait URL based on enemy name
  const enemy = state.enemyPortraits.find(portrait => portrait.name === enemyName);
  return enemy ? enemy.url : ''; // Return the URL or an empty string if not found
}


export function spawnEnemyDemi(critter, critterAttackTextures, critterWalkTextures, enemyName) {
  const enemy = createSpawnDemi(critterWalkTextures, enemyName, critter);

  addEnemies(enemy); // add the already created enemy
  if (enemy.isAlive) {
    state.app.stage.addChild(enemy);
  }

  handleEnemySorting(enemy);

  state.app.ticker.add(() => {
    if (getisPaused()) {
      return;
    }

    if (state.app.stage.children.includes(enemy)) {
      handleEnemyActions(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
    } else {
      removeEnemy(enemy);
      return;
    }
  });
}


export function createSpawnDemi(critterWalkTextures, enemyName, critter) {
  const enemy = new PIXI.AnimatedSprite(critterWalkTextures);
  enemy.scale.set(determineEnemyScale(enemyName) * 1.4);
  enemy.anchor.set(0.5, 0.5);
  enemy.resett = false;
  enemy.type = enemyName;
  enemy.tint = 0xffaaaa;
  enemy.isAttacking = false;
  enemy.enemyAdded = false;
  const spawnX = (state.gameMode === 'endless' && critter)
    ? critter.position.x + state.app.screen.width + 200
    : 2800;
  enemy.position.set(spawnX, state.app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 60 + (Math.random() * 60 - 30));
  enemy.zIndex = enemy.position.y + 10000;
  enemy.animationSpeed = enemyName === "pig" ? 0.23 : enemyName === "scorp" ? 0.15 : 0.25;
  enemy.loop = true;
  enemy.isAlive = true;
  enemy.isDemi = true;

  if (state.gameMode === 'endless') {
    const elapsed = state.endlessElapsed || 0;
    enemy.attackDamage = Math.round(2 + elapsed / 20) + 2;
    enemy.maxHP = 200 + Math.floor(elapsed / 10) * 7;
    enemy.exp = 32 + Math.floor(elapsed / 10) * 4;
  } else {
    enemy.attackDamage = Math.round(2 + state.currentRound / 2);
    enemy.maxHP = 200 + state.currentRound * 7;
    enemy.exp = 32 + Math.floor(state.currentRound * 4);
  }

  enemy.currentHP = enemy.maxHP;
  enemy.scale.x *= -1; // Flip the enemy horizontally
  enemy.play();
  const randomSpeedFactor = 0.75 + Math.random() * 0.5; // Random speed factor between 0.75 and 1.25
  enemy.vx = -2 * randomSpeedFactor; // Set the enemy's horizontal velocity with random speed factor
  return enemy;
}


export function spawnEnemy(critter, critterAttackTextures, critterWalkTextures, enemyName) {
  const enemy = createSpawnEnemy(critterWalkTextures, enemyName, critter);

  addEnemies(enemy); // add the already created enemy
  if (enemy.isAlive) {
    state.app.stage.addChild(enemy);
  }

  handleEnemySorting(enemy);

  state.app.ticker.add(() => {
    if (getisPaused()) {
      return;
    }

    if (state.app.stage.children.includes(enemy)) {
      handleEnemyActions(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
    } else {
      removeEnemy(enemy);
      return;
    }
  });
}


export function createSpawnEnemy(critterWalkTextures, enemyName, critter) {
  const enemy = new PIXI.AnimatedSprite(critterWalkTextures);
  enemy.scale.set(determineEnemyScale(enemyName));
  enemy.anchor.set(0.5, 0.5);
  enemy.resett = false;
  enemy.type = enemyName;
  enemy.isAttacking = false;
  enemy.enemyAdded = false;
  const spawnX = (state.gameMode === 'endless' && critter)
    ? critter.position.x + state.app.screen.width + 200
    : 2800;
  enemy.position.set(spawnX, state.app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 60 - 30));
  enemy.zIndex = enemy.position.y + 10000;
  enemy.animationSpeed = enemyName === "pig" ? 0.23 : enemyName === "scorp" ? 0.15 : 0.25;
  enemy.loop = true;
  enemy.isAlive = true;

  if (state.gameMode === 'endless') {
    const elapsed = state.endlessElapsed || 0;
    enemy.attackDamage = Math.round(2 + elapsed / 20);
    enemy.maxHP = 80 + Math.floor(elapsed / 10) * 7;
    enemy.exp = 32 + Math.floor(elapsed / 10) * 2;
  } else {
    enemy.attackDamage = Math.round(2 + state.currentRound / 3);
    enemy.maxHP = 80 + state.currentRound * 7;
    enemy.exp = 32 + Math.floor(state.currentRound * 2);
  }

  enemy.currentHP = enemy.maxHP;
  enemy.scale.x *= -1; // Flip the enemy horizontally
  enemy.play();
  const randomSpeedFactor = 0.75 + Math.random() * 0.5; // Random speed factor between 0.75 and 1.25
  enemy.vx = -2 * randomSpeedFactor; // Set the enemy's horizontal velocity with random speed factor
  return enemy;
}

export function determineEnemyScale(enemyName) {
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

export function handleEnemySorting(enemy) {
  if (state.app.stage.children.includes(enemy)) {
    state.enemies.sort((a, b) => a.position.y - b.position.y);
    state.enemies.forEach((enemy) => {
      if (enemy.parent === state.app.stage) {
        state.app.stage.removeChild(enemy);
      }
    });
    state.enemies.forEach((enemy) => {
      state.app.stage.addChild(enemy);
    });
  }
}

export function handleEnemyActions(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName) {
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
    // Queue gate: hold position when an enemy is already engaged and this one is close
    if (getEnemiesInRange() >= 1 && enemy.position.x - critter.position.x < 250) {
      // Stand still — freeze on current frame
      if (enemy.playing) {
        enemy.stop();
      }
      enemy.isQueued = true;
      return;
    }
    handleEnemyMoving(critterWalkTextures, enemy);
  } else {
    handleEnemyCombat(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
  }

  //state.isCombat = false;
}

export function handleEnemyMoving(critterWalkTextures, enemy) {
  // Ensure walk animation is playing — set textures if needed
  if (enemy.textures !== critterWalkTextures) {
    enemy.textures = critterWalkTextures;
    enemy.loop = true;
    enemy.play();
  }
  // Restart walk animation if enemy was queued and is now free to move
  if (enemy.isQueued || !enemy.playing) {
    enemy.isQueued = false;
    enemy.loop = true;
    enemy.play();
  }
  enemy.position.x += enemy.vx * state.dt;
}

export function handleEnemyCombat(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName) {


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

export function handleCritterAttack(critter, enemy, critterAttackTextures) {
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

export function addEnemyInRange(enemy) {
  enemy.enemyAdded = true;
  setEnemiesInRange(getEnemiesInRange() + 1);
}

export function handleEnemyAttack(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName) {
  if (!state.isCombat) {
    prepareEnemyPortrait(enemyName);
  }

  enemy.isAttacking = true;
  enemy.isCombat = true;

  handleEnemyAttacking(enemy, critterAttackTextures, critter, critterWalkTextures, enemyName);
}

export function prepareEnemyPortrait(enemyName) {
  const enemyPortrait = document.getElementById('enemy-portrait');
  updateEnemyGrayscale(100);


  if (state.portraitNames.hasOwnProperty(enemyName)) {
    enemyName = state.portraitNames[enemyName];
  }

  const portraitUrl = getEnemyPortraitUrl(enemyName);
  enemyPortrait.style.backgroundImage = `url(${portraitUrl})`;
  enemyPortrait.style.display = 'block';
}

export function removeEnemy(enemy) {
  state.app.stage.removeChild(enemy);
  const index = getEnemies().indexOf(enemy);
  if (index !== -1) {
    getEnemies().splice(index, 1);
  }
  state.app.ticker.remove(() => { });
}


export function checkProjectileCollisions(critter, enemy) {
  let projectile = null;
  let enemyHit = false;

  for (let i = state.app.stage.children.length - 1; i >= 0; i--) {
    const child = state.app.stage.children[i];
    if (child.name === 'birdProjectile') {
      projectile = child;

      if (!enemyHit && checkEnemyCollision(projectile, enemy)) {
        // Enemy is hit by the projectile
        // Perform desired actions here, such as removing the enemy sprite from the stage
        // state.app.stage.removeChild(enemy);
        rangedAttack(critter, enemy);
        state.app.stage.removeChild(projectile);

        enemyHit = true; // Mark that an enemy has been hit

        // You can add a break here if you want to hit only one enemy even if there are multiple overlapping enemies.
      }
    }
  }
}


export function rangedAttack(critter, enemy) {
  // Apply damage to the enemy
  drawHitSplat(enemy);
  if (enemy.currentHP <= 0) {

      // Callback function to remove enemy after death animation2
      if (state.app.stage.children.includes(enemy)) {
          enemy.tint = 0xFF0000; // Set the hit color


          if (getEnemiesInRange() === 0) {
              const enemyPortrait = document.getElementById('enemy-portrait');
              enemyPortrait.style.display = 'none'; // Make the element visible
          }

          createCoffeeDrop(enemy.position.x + 20, enemy.position.y);
          // Item drop — demi-boss only
          if (state.gameMode === 'endless' && enemy.isDemi) {
            const items = ['shield','bomb','rage','feather','goldenBean'];
            createItemDrop(enemy.position.x, enemy.position.y, items[Math.floor(Math.random() * items.length)]);
          }
          state.app.stage.removeChild(enemy);
          getEnemies().splice(getEnemies().indexOf(enemy), 1);
          enemy.isAlive = false;
          if (enemy.isDemi) {
            state.lastDemiKillTime = Date.now();
          }
          if (state.gameMode === 'endless') state.endlessKillCount++;
          awardBones(enemy);
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

export function resetEnemiesState() {
  getEnemies().forEach(enemy => {
    enemy.isAlive = true;
    enemy.isCombat = false;
    enemy.inRange = false;

    enemy.enemyAdded = false;
    enemy.isAttacking = false; // allow the enemy to attack again
    enemy.play();  // restart the walking animation
  });


}
export function playGhostFly() {

  setEnemiesInRange(0);
  setIsDead(true);
  state.frogGhostPlayer.alpha = 0.5;

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
      state.frogGhostPlayer.texture = PIXI.Assets.get("frog_ghost");
      break;
  }

  state.app.stage.addChild(state.frogGhostPlayer);
  state.frogGhostPlayer.zIndex = 99999;

  // Open character menu immediately — show ALL unlocked characters including
  // the dead one so the player can revive their own character if they want
  const characterBoxes = document.querySelectorAll('.upgrade-box.character-snail, .upgrade-box.character-bird, .upgrade-box.character-bee, .upgrade-box.character-frog');
  const visibleBoxes = [];
  characterBoxes.forEach((box) => {
    const charClass = box.classList[1];
    if (!state.unlockedCharacters.includes(charClass)) {
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
  document.getElementById('spawn-text').style.visibility = 'visible';


  // Ghost fly is purely cosmetic — just animates and removes itself
  let startY = state.frogGhostPlayer.y;
  let targetY = startY - 400;
  let speed = 1.5;
  let wobbleSpeed = 0.05;
  let wobbleAmplitude = 7.5;
  let wobbleDamping = 0.99;
  state.ghostFlyInterval = setInterval(() => {
    if (getisPaused()) return; // freeze ghost when paused
    state.frogGhostPlayer.y -= speed;
    let wobbleOffset = Math.sin(state.frogGhostPlayer.y * wobbleSpeed) * wobbleAmplitude;
    state.frogGhostPlayer.x += wobbleOffset;
    wobbleAmplitude *= wobbleDamping;
    if (state.frogGhostPlayer.y <= targetY) {
      clearInterval(state.ghostFlyInterval);
      state.ghostFlyInterval = null;
      if (state.app.stage.children.includes(state.frogGhostPlayer)) {
        state.app.stage.removeChild(state.frogGhostPlayer);
      }
    }
  }, 16);
}


export function resetToAttackTextures(enemy, critterAttackTextures) {
  enemy.textures = critterAttackTextures;
  enemy.loop = true;
  enemy.gotoAndPlay(0);
}

export function handleEnemyAttacking(enemy, critterAttackTextures, critter, critterWalkTextures, enemyName) {
  if (state.roundOver) { return; }

  // If the enemy is a shark and it's not currently playing the emerge animation
  if (enemyName === "shark" && !enemy.emerging) {
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
  let hasPlayedSound = false;
  if (state.roundOver) { return; }


  function onFrameChange(currentFrame) {

    if (state.roundOver) {
      enemy.isAttacking = false;
      setEnemiesInRange(0);
      enemy.removeInRange = false;
      return;
    }

    if (state.enemiesInRange <= 0) {
      return;
    }
    if (currentFrame === enemy.totalFrames - 5) {

      if (enemy.isAlive) {
        if (!getisDead()) {
          if (!hasDied) {

            // Skip damage during spawn protection
            if (Date.now() < state.spawnProtectionEnd) {
              return;
            }

            // Shield damage interception
            if (state.shieldActive && state.shieldHP > 0) {
              const prevShieldHP = state.shieldHP;
              state.shieldHP -= enemy.attackDamage;
              // Flash shield sprite
              if (state.shieldSprite) {
                state.shieldSprite.tint = 0xffffff;
                setTimeout(() => { if (state.shieldSprite) state.shieldSprite.tint = 0x00ffff; }, 100);
              }
              // Update shield bar
              const shieldBarFill = document.getElementById('shield-bar-fill');
              if (shieldBarFill) shieldBarFill.style.width = Math.max(0, state.shieldHP) + '%';
              if (state.shieldHP <= 0) {
                const overflow = -state.shieldHP;
                state.shieldActive = false;
                state.shieldHP = 0;
                // Remove shield sprite
                if (state.shieldSprite) {
                  if (state.app.stage.children.includes(state.shieldSprite)) {
                    state.app.stage.removeChild(state.shieldSprite);
                  }
                  state.shieldSprite.destroy();
                }
                state.shieldSprite = null;
                playShieldBreakSound();
                // Update shield button
                const shieldBtn = document.getElementById('shield-btn');
                if (shieldBtn) shieldBtn.classList.remove('shield-active-glow');
                if (shieldBarFill) shieldBarFill.style.width = '0%';
                // Apply overflow damage
                if (overflow > 0) {
                  critter.tint = state.flashColor;
                  setPlayerCurrentHealth(getPlayerCurrentHealth() - overflow);
                  drawCharHitSplat(critter, enemy);
                  updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth()) * 100);
                }
              }
              drawCharHitSplat(critter, enemy);
              return;
            }

            critter.tint = state.flashColor;
            const dmgReduction = state.defense || 0;
            const finalDmg = Math.max(1, enemy.attackDamage - dmgReduction);
            setPlayerCurrentHealth(getPlayerCurrentHealth() - finalDmg);
            drawCharHitSplat(critter, enemy);
            updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth()) * 100);

          }
          updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth() * 100));
          if (getPlayerCurrentHealth() <= 0) {
            setPlayerCurrentHealth(0);


            if (!hasDied) {
              // Phoenix feather death interception
              if (state.featherActive) {
                state.featherActive = false;
                setPlayerCurrentHealth(Math.round(getPlayerHealth() * 0.3));
                updatePlayerHealthBar((getPlayerCurrentHealth() / getPlayerHealth()) * 100);
                // Remove feather sprite
                if (state.featherSprite) {
                  if (state.app.stage.children.includes(state.featherSprite)) {
                    state.app.stage.removeChild(state.featherSprite);
                  }
                  state.featherSprite.destroy();
                  state.featherSprite = null;
                }
                playFeatherReviveSound();
                // 7-second invulnerability with gold shimmer
                state.spawnProtectionEnd = Date.now() + 7000;
                state.featherReviveEnd = Date.now() + 7000;
                critter.tint = 0xffd700;
                // Gold sparkle burst
                playFeatherReviveBurst(critter);
                // Remove feather glow from button
                const featherBtn = document.getElementById('feather-btn');
                if (featherBtn) featherBtn.classList.remove('feather-active-glow');
                return; // skip death entirely
              }
              hasDied = true;
              state.frogGhostPlayer.position.set(critter.position.x, critter.position.y);
              if (state.gameMode === 'endless') {
                state.endlessDeathX = critter.position.x;
              }
              critter.tint = 0xffffff;
              state.app.stage.removeChild(critter);
              playGhostFly();
              startFlashing();

            }
            return;
          }
          setTimeout(() => {
            critter.tint = state.skinBaseTint || getFrogTintColor();
          }, state.flashDuration);
          if (enemy.isAlive) {
            state.hitSound.volume = state.effectsVolume;
            state.hitSound.play();
          }
          hasPlayedSound = true;
        }
      }
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

  state.app.ticker.add(tickerHandler);

  const removeEnemy = () => {
    if (state.app.stage.children.includes(enemy)) {
      state.app.stage.removeChild(enemy);
      state.app.stage.removeChild(enemy.hpBar);
      state.app.stage.removeChild(enemy.hpBarBackground);
    }

    const index = getEnemies().indexOf(enemy);
    if (index !== -1) {
      getEnemies().splice(index, 1);
    }

    state.app.ticker.remove(tickerHandler);
    enemy.onFrameChange = null; // Remove the onFrameChange event listener
  };

  state.app.ticker.add(() => {
    if (!state.app.stage.children.includes(enemy)) {
      removeEnemy();
    }
  });
}


export function drawCharHitSplat(critter, enemy) {


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
  damageText.zIndex = 99999;
  state.app.stage.addChild(damageText);

  // Animate the hitsplat
  const startY = damageText.position.y;
  const duration = 100;
  let elapsed = 0;
  const update = (ticker) => {
    elapsed += ticker.deltaTime;

    if (elapsed >= duration) {
      state.app.ticker.remove(update);
      state.app.stage.removeChild(damageText);
    } else {
      const progress = elapsed / duration;
      damageText.position.y = startY - (progress * 30);
      damageText.alpha = 1 - progress/3;
    }
  };

  state.app.ticker.add(update);
}


export function drawHitSplat(enemy) {
  // Flash hit color for a brief second
  const originalTint = enemy.tint;
  enemy.tint = 0xFF0000; // Set the hit color
  setTimeout(() => {
    enemy.tint = originalTint; // Reset to original color
  }, 100);
  let damage = null;
  const characterType = getCurrentCharacter();
  const enemyType = enemy.type;

  // Compute base damage (no multiplier) for crit/dud detection
  let baseDamage;
  switch (characterType) {
    case 'character-snail': baseDamage = Math.round(getSnailDamage()); break;
    case 'character-bird': baseDamage = Math.round(getBirdDamage()); break;
    case 'character-frog': baseDamage = Math.round(getFrogDamage()); break;
    case 'character-bee': baseDamage = Math.round(getBeeDamage()); break;
    default: baseDamage = 0;
  }

  switch (characterType) {
    case 'character-snail':
      if (enemyType === 'imp' || enemyType === 'toofer') {
        damage = Math.round(getSnailDamage() * 1.75);
      } else if (enemyType === 'scorp') {
        damage = Math.round(getSnailDamage() * .75);
      } else {
        damage = Math.round(getSnailDamage());
      }
      enemy.currentHP -= damage;
      break;
    case 'character-bird':
      if (enemyType === 'imp' || enemyType === 'toofer') {
        damage = Math.round(getBirdDamage() * 0.3);
      } else if (enemyType === 'shark' || enemyType === 'puffer') {
        damage = Math.round(getBirdDamage() * 1.75);
      } else {
        damage = Math.round(getBirdDamage());
      }
      enemy.currentHP -= damage;
      break;
    case 'character-frog':
      if (enemyType === 'pig' || enemyType === 'scorp') {
        damage = Math.round(getFrogDamage() * 1.75);
      } else if (enemyType === 'puffer') {
        damage = Math.round(getFrogDamage() * 0.75);
      } else {
        damage = Math.round(getFrogDamage());
      }
      enemy.currentHP -= damage;
      break;
    case 'character-bee':
      if (enemyType === 'ele' || enemyType === 'octo') {
        damage = Math.round(getBeeDamage() * 1.75);
      } else if (enemyType === 'shark') {
        damage = Math.round(getBeeDamage() * 0.75);
      } else {
        damage = Math.round(getBeeDamage());
      }
      enemy.currentHP -= damage;
      break;
    default:
      console.log('Invalid character type');
  }

  // Detect hit type
  const isCrit = damage > baseDamage;
  const isDud = damage < baseDamage;

  // Sound feedback
  if (isCrit) {
    playSwordSlashSound();
  } else {
    const hitSound = state.attackSound.cloneNode();
    hitSound.volume = state.effectsVolume;
    if (isDud) hitSound.playbackRate = 0.6;
    hitSound.play();
  }

  // Color-coded damage text
  let fillColor = "rgb(255, 100, 80)";        // normal: warm red
  if (isCrit) fillColor = "rgb(255, 165, 0)";  // crit: deep gold
  if (isDud) fillColor = "rgb(160, 160, 160)"; // dud: grey

  drawEnemyHPBar(enemy);
  updateEnemyGrayscale(enemy.currentHP);

  const fontSize = isCrit ? 36 : 24;
  const damageText = new PIXI.Text(`${-damage}`, {
    fontSize: fontSize,
    fill: fillColor,
    fontWeight: "bold",
    stroke: "#000",
    strokeThickness: isCrit ? 5 : 3,
    strokeOutside: true
  });

  damageText.anchor.set(0.5);
  damageText.position.set(enemy.position.x + 40, enemy.position.y - 30);
  damageText.zIndex = 99999;
  state.app.stage.addChild(damageText);

  // Crit: fling direction (upper-right diagonal) + spark particles
  const flingVX = isCrit ? 2.5 : 0;
  const flingVY = isCrit ? -1.8 : -0.3;
  const animDuration = isCrit ? 60 : 100;

  // Spawn crit spark particles
  let critSparks = null;
  if (isCrit) {
    critSparks = new PIXI.Container();
    critSparks.zIndex = 99998;
    state.app.stage.addChild(critSparks);
    const sparkColors = [0xFFAA00, 0xFFDD44, 0xFFFFAA, 0xFF8800, 0xFFFFFF];
    for (let i = 0; i < 12; i++) {
      const spark = new PIXI.Graphics();
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      spark.circle(0, 0, 2 + Math.random() * 2).fill({ color: color });
      spark.position.set(enemy.position.x + 20, enemy.position.y - 10);
      // Spray mostly to the right (attack direction)
      const angle = -Math.PI * 0.8 + Math.random() * Math.PI * 0.6;
      const speed = 3 + Math.random() * 5;
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.gravity = 0.15;
      critSparks.addChild(spark);
    }
  }

  // Animate the hitsplat
  const startX = damageText.position.x;
  const startY = damageText.position.y;
  let elapsed = 0;
  const update = (ticker) => {
    elapsed += ticker.deltaTime;

    if (elapsed >= animDuration) {
      state.app.ticker.remove(update);
      state.app.stage.removeChild(damageText);
      if (critSparks) {
        state.app.stage.removeChild(critSparks);
        critSparks.destroy({ children: true });
      }
    } else {
      const progress = elapsed / animDuration;
      damageText.position.x = startX + elapsed * flingVX;
      damageText.position.y = startY + elapsed * flingVY;
      damageText.alpha = 1 - progress;
      if (isCrit) {
        // Scale up slightly then down for impact feel
        const scale = progress < 0.2 ? 1 + progress * 3 : 1.6 - progress * 0.8;
        damageText.scale.set(scale);
      }

      // Animate sparks
      if (critSparks) {
        for (const spark of critSparks.children) {
          spark.vy += spark.gravity * state.dt;
          spark.position.x += spark.vx * state.dt;
          spark.position.y += spark.vy * state.dt;
          spark.alpha = 1 - progress;
          spark.vx *= 0.97;
        }
      }
    }
  };

  state.app.ticker.add(update);
}


export function critterAttack(critter, enemy, critterAttackTextures) {
  // Reduce enemy's HP
  drawHitSplat(enemy);

  if (enemy.currentHP - getCharacterDamage(getCurrentCharacter()) <= 0) {

    // Callback function to remove enemy after death animation
    if (state.app.stage.children.includes(enemy)) {
      enemy.tint = 0xFF0000; // Set the hit color
      if (getCurrentCharacter !== 'character-bird') {
        if (getEnemiesInRange() > 0) {
          setEnemiesInRange(getEnemiesInRange() - 1);
        }
      }
      state.isCombat = false;
      if (getEnemiesInRange() === 0) {
        const enemyPortrait = document.getElementById('enemy-portrait');
        enemyPortrait.style.display = 'none'; // Make the element visible
      }
      state.currentAttackedEnemy = null;

      enemy.isAlive = false;
      if (enemy.isDemi) {
        state.lastDemiKillTime = Date.now();
      }
      if (state.gameMode === 'endless') state.endlessKillCount++;
      awardBones(enemy);
      setIsCharAttacking(false);
      createCoffeeDrop(enemy.position.x + 20, enemy.position.y);
      // Item drop — demi-boss only
      if (state.gameMode === 'endless' && enemy.isDemi) {
        const items = ['shield','bomb','rage','feather','goldenBean'];
        createItemDrop(enemy.position.x, enemy.position.y, items[Math.floor(Math.random() * items.length)]);
      }
      state.app.stage.removeChild(enemy);
      getEnemies().splice(getEnemies().indexOf(enemy), 1);

      playDeathAnimation(enemy, critter);
    }
  }
}


export function createCoffeeDrop(x, y) {
  const coffeeContainer = new PIXI.Container();
  const beanTexture = PIXI.Assets.get('bean');
  const numBeans = Math.floor(Math.random() * 15 + state.currentRound * 2) + 1;
  const fallDuration = 1200;
  const flyDuration = 900;

  const beans = [];
  for (let i = 0; i < numBeans; i++) {
    const bean = new PIXI.Sprite(beanTexture);
    bean.anchor.set(0.5);
    bean.x = x + Math.random() * 80 - 10;
    bean.y = y + Math.random() * 60 - 20;
    bean.rotation = Math.random() * Math.PI * 2;
    bean.scale.set(0.075 + Math.random() * 0.2);
    coffeeContainer.addChild(bean);
    beans.push(bean);

    // Phase 1: fall down
    const targetY = y + 50;
    const initialY = bean.y - 50;
    const startTime = Date.now();

    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / fallDuration;
      if (progress >= 1) {
        bean.y = targetY;
        return;
      }
      bean.y = initialY + (targetY - initialY) * progress;
      requestAnimationFrame(update);
    };
    update();
  }

  coffeeContainer.zIndex = 15;
  state.app.stage.addChild(coffeeContainer);

  // Phase 2: after falling, fly each bean toward the coffee UI
  setTimeout(() => {
    beans.forEach((bean, i) => {
      const delay = i * 40; // stagger each bean
      const startX = bean.x;
      const startY = bean.y;
      const startScale = bean.scale.x;
      // Capture initial arc height offset per bean
      const arcHeight = 80 + Math.random() * 40;
      const flyStart = Date.now() + delay;

      const flyUpdate = () => {
        const elapsed = Date.now() - flyStart;
        if (elapsed < 0) { requestAnimationFrame(flyUpdate); return; }
        const progress = Math.min(elapsed / flyDuration, 1);

        // Recalculate target each frame so rotation/resize doesn't leave beans midair
        const screenTargetX = state.app.screen.width - 30;
        const screenTargetY = 30;
        const stageTargetX = -state.app.stage.position.x + screenTargetX;
        const stageTargetY = -state.app.stage.position.y + screenTargetY;
        const cpX = startX + (stageTargetX - startX) * 0.5;
        const cpY = startY - arcHeight;

        // Ease-in-out for smooth arc
        const t = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Quadratic bezier: (1-t)^2*start + 2*(1-t)*t*cp + t^2*end
        const oneMinusT = 1 - t;
        bean.x = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * cpX + t * t * stageTargetX;
        bean.y = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * cpY + t * t * stageTargetY;
        bean.scale.set(startScale * (1 - t * 0.7));
        bean.rotation += 0.2;
        bean.alpha = t < 0.8 ? 1 : 1 - (t - 0.8) * 5;

        if (progress >= 1) {
          bean.visible = false;
          addCoffee(1); // +1 as each bean arrives
          return;
        }
        requestAnimationFrame(flyUpdate);
      };
      requestAnimationFrame(flyUpdate);
    });

    // Clean up after all beans arrive
    setTimeout(() => {
      state.app.stage.removeChild(coffeeContainer);
      coffeeContainer.destroy({ children: true });
      createCoffeeDropText(x, y + 50, numBeans);
    }, flyDuration + beans.length * 40 + 100);

  }, fallDuration + 300);
}

export function addCoffee(amount) {
  setCoffee(getCoffee() + amount);
  const coffeeAmountElement = document.getElementById('coffee-amount');
  const coffeeAmount = getCoffee();
  coffeeAmountElement.textContent = `${coffeeAmount}`;
  playCoinSound();
  document.dispatchEvent(new Event('coffeeChanged'));
}

// --- Bones (cross-round currency) ---
export function awardBones(enemy) {
  if (state.gameMode !== 'endless') return;
  const amount = enemy.isDemi ? 3 : 1;
  setBones(getBones() + amount);
  saveBones();
  // Visual popup near the kill
  if (state.app) {
    const txt = new PIXI.Text({ text: `+${amount} 🦴`, style: {
      fontFamily: 'Luckiest Guy, cursive',
      fontSize: 18,
      fill: '#f0e8d0',
      stroke: { color: '#000000', width: 3 },
    }});
    txt.anchor.set(0.5);
    txt.position.set(enemy.position.x, enemy.position.y - 40);
    txt.zIndex = 9999;
    state.app.stage.addChild(txt);
    const startY = txt.position.y;
    const startTime = Date.now();
    const ticker = () => {
      const elapsed = Date.now() - startTime;
      txt.position.y = startY - elapsed * 0.03;
      txt.alpha = Math.max(0, 1 - elapsed / 1200);
      if (elapsed > 1200) {
        state.app.ticker.remove(ticker);
        if (txt.parent) txt.parent.removeChild(txt);
        txt.destroy();
      }
    };
    state.app.ticker.add(ticker);
  }
  // Update layout UI if open
  const bonesEl = document.getElementById('layout-bones');
  if (bonesEl) bonesEl.textContent = `🦴 ${getBones()}`;
}

// --- Item Drop System (Shield + Bomb) ---

export function playItemPickupSound(itemType) {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  const freqMap = {
    'shield': [600, 500, 400], 'bomb': [400, 600, 800],
    'rage': [500, 700, 900], 'feather': [700, 900, 1100], 'goldenBean': [300, 500, 700]
  };
  const freqs = freqMap[itemType] || [400, 600, 800];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.12);
  });
}

export function playShieldActivateSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
  osc.connect(gain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

export function playShieldBreakSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  [1000, 600, 300].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.06);
    osc.stop(ctx.currentTime + i * 0.06 + 0.1);
  });
}

export function playBombDropSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  // Falling whistle — high pitch sweeping down over ~0.7s
  const whistleGain = ctx.createGain();
  whistleGain.connect(ctx.destination);
  whistleGain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
  whistleGain.gain.linearRampToValueAtTime(vol * 0.4, ctx.currentTime + 0.5);
  whistleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
  const whistle = ctx.createOscillator();
  whistle.type = 'sine';
  whistle.frequency.setValueAtTime(2000, ctx.currentTime);
  whistle.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.7);
  whistle.connect(whistleGain);
  whistle.start(ctx.currentTime);
  whistle.stop(ctx.currentTime + 0.75);
  // Layered second whistle for thickness
  const whistle2Gain = ctx.createGain();
  whistle2Gain.connect(ctx.destination);
  whistle2Gain.gain.setValueAtTime(vol * 0.08, ctx.currentTime);
  whistle2Gain.gain.linearRampToValueAtTime(vol * 0.2, ctx.currentTime + 0.5);
  whistle2Gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  const whistle2 = ctx.createOscillator();
  whistle2.type = 'sawtooth';
  whistle2.frequency.setValueAtTime(1800, ctx.currentTime);
  whistle2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.7);
  whistle2.connect(whistle2Gain);
  whistle2.start(ctx.currentTime);
  whistle2.stop(ctx.currentTime + 0.7);
}

export function playExplosionSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  // Big boom — low frequency thump
  const boomGain = ctx.createGain();
  boomGain.connect(ctx.destination);
  boomGain.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
  boomGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  const boom = ctx.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(80, ctx.currentTime);
  boom.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
  boom.connect(boomGain);
  boom.start(ctx.currentTime);
  boom.stop(ctx.currentTime + 0.6);
  // Noise burst — the crackle/blast
  const noiseGain = ctx.createGain();
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(vol * 0.15, ctx.currentTime + 0.15);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  const bufferSize = Math.floor(ctx.sampleRate * 0.8);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.connect(noiseGain);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.8);
  // Mid crunch layer
  const crunchGain = ctx.createGain();
  crunchGain.connect(ctx.destination);
  crunchGain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  crunchGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  const crunch = ctx.createOscillator();
  crunch.type = 'square';
  crunch.frequency.setValueAtTime(150, ctx.currentTime);
  crunch.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
  crunch.connect(crunchGain);
  crunch.start(ctx.currentTime);
  crunch.stop(ctx.currentTime + 0.4);
}

export function playRageSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  // Aggressive rising tone
  [300, 500, 800].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.12);
  });
}

export function playPotionChugSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  // Gulp bubbles — 3 descending "glug" tones
  [0, 0.12, 0.26].forEach((delay, i) => {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const freq = 400 - i * 60;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + delay + 0.1);
    osc.connect(gain);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.12);
  });
  // Satisfying "ahh" finish
  const ahhGain = ctx.createGain();
  ahhGain.connect(ctx.destination);
  ahhGain.gain.setValueAtTime(0, ctx.currentTime + 0.38);
  ahhGain.gain.linearRampToValueAtTime(vol * 0.1, ctx.currentTime + 0.42);
  ahhGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  const ahh = ctx.createOscillator();
  ahh.type = 'triangle';
  ahh.frequency.setValueAtTime(250, ctx.currentTime + 0.38);
  ahh.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.65);
  ahh.connect(ahhGain);
  ahh.start(ctx.currentTime + 0.38);
  ahh.stop(ctx.currentTime + 0.7);
}

export function playPotionBottleAnimation(critter, app) {
  // Draw a small red potion bottle
  const bottle = new PIXI.Container();
  const body = new PIXI.Graphics();
  // Bottle body (red liquid)
  body.roundRect(-6, -4, 12, 16, 3).fill({ color: 0xdd2222, alpha: 0.9 });
  // Neck
  body.roundRect(-3, -10, 6, 8, 2).fill({ color: 0xdd2222, alpha: 0.7 });
  // Cork
  body.roundRect(-4, -13, 8, 4, 1).fill({ color: 0x8B5E3C });
  // Highlight
  body.roundRect(-4, -2, 3, 8, 1).fill({ color: 0xff6666, alpha: 0.5 });
  bottle.addChild(body);

  bottle.position.set(critter.position.x + 30, critter.position.y - 20);
  bottle.zIndex = 99999;
  bottle.pivot.set(0, 0);
  bottle.rotation = -0.3;
  app.stage.addChild(bottle);

  const startTime = Date.now();
  const duration = 500;

  const ticker = () => {
    const t = Math.min(1, (Date.now() - startTime) / duration);
    if (t < 0.4) {
      // Tip the bottle toward mouth
      bottle.rotation = -0.3 + (t / 0.4) * -1.2;
    } else {
      // Hold tipped, fade out and shrink
      bottle.rotation = -1.5;
      const fadeT = (t - 0.4) / 0.6;
      bottle.alpha = 1 - fadeT;
      bottle.scale.set(1 - fadeT * 0.5);
    }
    if (t >= 1) {
      app.stage.removeChild(bottle);
      bottle.destroy({ children: true });
      app.ticker.remove(ticker);
    }
  };
  app.ticker.add(ticker);
}

export function playFeatherReviveSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  // Ascending magical chime
  [500, 700, 900, 1200].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.15);
  });
}

function playFeatherReviveBurst(critter) {
  const app = state.app;
  const cx = critter.position.x;
  const cy = critter.position.y;
  const particles = [];
  for (let i = 0; i < 16; i++) {
    const p = new PIXI.Graphics();
    const size = 3 + Math.random() * 4;
    p.circle(0, 0, size);
    p.fill({ color: 0xffd700, alpha: 0.9 });
    p.position.set(cx, cy);
    p.zIndex = 9999;
    const angle = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.4;
    const speed = 2 + Math.random() * 3;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    app.stage.addChild(p);
    particles.push(p);
  }
  let elapsed = 0;
  const duration = 50;
  const update = (ticker) => {
    elapsed += ticker.deltaTime;
    const t = elapsed / duration;
    if (t >= 1) {
      for (const p of particles) {
        if (app.stage.children.includes(p)) app.stage.removeChild(p);
        p.destroy();
      }
      app.ticker.remove(update);
      return;
    }
    for (const p of particles) {
      p.position.x += p.vx * state.dt;
      p.position.y += p.vy * state.dt;
      p.vy += 0.03 * state.dt;
      p.alpha = 1 - t;
      p.scale.set(1 - t * 0.5);
    }
  };
  app.ticker.add(update);
}

export function playGoldenBeanSound() {
  const ctx = getAudioCtx();
  const vol = state.effectsVolume;
  if (vol <= 0) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  // Deep coffee chime — lower frequencies than regular coin sound
  [300, 400, 600].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.18);
  });
}

export function playGoldenBeanFlyEffect(critter, totalCoffee) {
  const beanTexture = PIXI.Assets.get('bean');
  const numBeans = 20;
  const coffeePerBean = totalCoffee / numBeans;
  const flyDuration = 700;
  const stagger = 30;

  for (let i = 0; i < numBeans; i++) {
    const bean = new PIXI.Sprite(beanTexture);
    bean.anchor.set(0.5);
    bean.scale.set(0.12 + Math.random() * 0.08);
    bean.tint = 0xFFD700;
    bean.zIndex = 15;
    bean.position.set(
      critter.position.x + (Math.random() * 60 - 30),
      critter.position.y + (Math.random() * 40 - 20)
    );
    bean.rotation = Math.random() * Math.PI * 2;
    state.app.stage.addChild(bean);

    const startX = bean.position.x;
    const startY = bean.position.y;
    const startScale = bean.scale.x;
    const arcHeight = 80 + Math.random() * 40;
    const flyStart = Date.now() + i * stagger;

    const flyUpdate = () => {
      const elapsed = Date.now() - flyStart;
      if (elapsed < 0) { requestAnimationFrame(flyUpdate); return; }
      const progress = Math.min(elapsed / flyDuration, 1);

      const screenTargetX = state.app.screen.width - 30;
      const screenTargetY = 30;
      const stageTargetX = -state.app.stage.position.x + screenTargetX;
      const stageTargetY = -state.app.stage.position.y + screenTargetY;
      const cpX = startX + (stageTargetX - startX) * 0.5;
      const cpY = startY - arcHeight;

      const t = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const oneMinusT = 1 - t;
      bean.x = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * cpX + t * t * stageTargetX;
      bean.y = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * cpY + t * t * stageTargetY;
      bean.scale.set(startScale * (1 - t * 0.7));
      bean.rotation += 0.2;
      bean.alpha = t < 0.8 ? 1 : 1 - (t - 0.8) * 5;

      if (progress >= 1) {
        addCoffee(coffeePerBean);
        if (state.app.stage.children.includes(bean)) {
          state.app.stage.removeChild(bean);
        }
        bean.destroy();
        return;
      }
      requestAnimationFrame(flyUpdate);
    };
    requestAnimationFrame(flyUpdate);
  }
}

function updateItemButtonState(itemType) {
  const btnMap = { 'shield': 'shield-btn', 'bomb': 'bomb-btn', 'rage': 'rage-btn', 'feather': 'feather-btn', 'goldenBean': 'golden-bean-btn' };
  const countMap = { 'shield': 'shield-count', 'bomb': 'bomb-count', 'rage': 'rage-count', 'feather': 'feather-count', 'goldenBean': 'golden-bean-count' };
  const getCountMap = { 'shield': getShieldCount, 'bomb': getBombCount, 'rage': getRageCount, 'feather': getFeatherCount, 'goldenBean': getGoldenBeanCount };
  const btnId = btnMap[itemType];
  const countId = countMap[itemType];
  const count = getCountMap[itemType] ? getCountMap[itemType]() : 0;
  const btn = document.getElementById(btnId);
  const countEl = document.getElementById(countId);
  if (countEl) countEl.textContent = count;
  if (btn) {
    btn.style.display = count > 0 ? 'flex' : 'none';
    btn.classList.toggle('active', count > 0);
  }
  // Notify main.js to reposition visible buttons
  document.dispatchEvent(new Event('itemButtonsChanged'));
}

export function createItemDrop(x, y, itemType) {
  let itemSprite;
  if (itemType === 'goldenBean') {
    const beanTexture = PIXI.Assets.get('bean');
    itemSprite = new PIXI.Sprite(beanTexture);
    itemSprite.anchor.set(0.5);
    itemSprite.scale.set(0.2);
    itemSprite.tint = 0xFFD700;
  } else {
    const emojiMap = { 'shield': '🛡️', 'bomb': '💣', 'rage': '🧃', 'feather': '🪶' };
    const emoji = emojiMap[itemType] || '❓';
    itemSprite = new PIXI.Text({ text: emoji, style: { fontSize: 32 } });
    itemSprite.anchor.set(0.5);
  }
  itemSprite.position.set(x, y - 30);
  itemSprite.zIndex = 16;
  state.app.stage.addChild(itemSprite);

  // Phase 1 — Fall to ground with bounce
  const groundY = y + 40;
  const startY = y - 30;
  const fallDuration = 800;
  const fallStart = Date.now();

  const fallUpdate = () => {
    const elapsed = Date.now() - fallStart;
    const progress = Math.min(elapsed / fallDuration, 1);
    // Ease-out bounce
    const t = progress;
    const bounce = t < 0.6
      ? (t / 0.6) * (t / 0.6)
      : t < 0.8
        ? 1 - (1 - ((t - 0.6) / 0.2)) * 0.3
        : 1 - (1 - ((t - 0.8) / 0.2)) * 0.1 * (1 - ((t - 0.8) / 0.2));
    itemSprite.position.y = startY + (groundY - startY) * Math.min(bounce, 1);
    itemSprite.rotation = Math.sin(t * Math.PI * 4) * 0.2 * (1 - t);
    if (progress < 1) {
      requestAnimationFrame(fallUpdate);
    } else {
      // Item is on the ground — add to ground items
      itemSprite.position.y = groundY;
      const groundItem = {
        sprite: itemSprite,
        type: itemType,
        x: x,
        y: groundY,
        createdAt: Date.now(),
        collected: false,
      };
      state.groundItems.push(groundItem);
    }
  };
  fallUpdate();
}

export function collectGroundItem(groundItem) {
  if (groundItem.collected) return;
  groundItem.collected = true;

  const sprite = groundItem.sprite;
  const itemType = groundItem.type;

  playItemPickupSound(itemType);

  // Fly to UI button position
  const btnIdMap = { 'shield': 'shield-btn', 'bomb': 'bomb-btn', 'rage': 'rage-btn', 'feather': 'feather-btn', 'goldenBean': 'golden-bean-btn' };
  const btnId = btnIdMap[itemType] || 'shield-btn';
  const btn = document.getElementById(btnId);

  const startX = sprite.position.x;
  const startY = sprite.position.y;
  const startScale = sprite.scale.x;
  const flyDuration = 600;
  const flyStart = Date.now();

  const flyUpdate = () => {
    const elapsed = Date.now() - flyStart;
    const progress = Math.min(elapsed / flyDuration, 1);
    const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Recalculate button position each frame so the item tracks the actual button
    const btnRect = btn ? btn.getBoundingClientRect() : { left: 16, top: window.innerHeight * 0.65, width: 56, height: 56 };
    const curTargetX = -state.app.stage.position.x + btnRect.left + btnRect.width / 2;
    const curTargetY = -state.app.stage.position.y + btnRect.top + btnRect.height / 2;

    sprite.position.x = startX + (curTargetX - startX) * t;
    sprite.position.y = startY + (curTargetY - startY) * t;
    sprite.scale.set(startScale * (1 - t * 0.5));
    sprite.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) * 3.33;

    if (progress >= 1) {
      // Increment count + persist to stockpile
      if (itemType === 'shield') {
        setShieldCount(getShieldCount() + 1);
        state.startingItems.shield = (state.startingItems.shield || 0) + 1;
      } else if (itemType === 'bomb') {
        setBombCount(getBombCount() + 1);
        state.startingItems.bomb = (state.startingItems.bomb || 0) + 1;
      } else if (itemType === 'rage') {
        setRageCount(getRageCount() + 1);
        state.startingItems.rage = (state.startingItems.rage || 0) + 1;
      } else if (itemType === 'feather') {
        setFeatherCount(getFeatherCount() + 1);
        state.startingItems.feather = (state.startingItems.feather || 0) + 1;
      } else if (itemType === 'goldenBean') {
        setGoldenBeanCount(getGoldenBeanCount() + 1);
        state.startingItems.goldenBean = (state.startingItems.goldenBean || 0) + 1;
      }
      saveBones();
      updateItemButtonState(itemType);

      // Flash the button
      if (btn) {
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => { btn.style.transform = ''; }, 200);
      }

      // Remove sprite
      if (state.app.stage.children.includes(sprite)) {
        state.app.stage.removeChild(sprite);
      }
      sprite.destroy();

      // Remove from groundItems
      const idx = state.groundItems.indexOf(groundItem);
      if (idx !== -1) state.groundItems.splice(idx, 1);
      return;
    }
    requestAnimationFrame(flyUpdate);
  };
  flyUpdate();
}

export function playSpawnAnimation(critter, critterSpawn) {
  stopFlashing();

  critterSpawn.position.set(critter.position.x, critter.position.y);
  critterSpawn.zIndex = 15;
  state.app.stage.addChild(critterSpawn);


  critterSpawn.gotoAndPlay(0);

  // Remove the death animation after it completes
  critterSpawn.onComplete = () => {
    state.app.stage.removeChild(critterSpawn);
  };

}
export function createCoffeeDropText(x, y, coffeeAmount) {
  // create the state.coffee drop text
  const coffeeDropText = "+" + coffeeAmount;
  const coffeeDrop = new PIXI.Text(coffeeDropText, {
    fontSize: 24,
    fill: "rgb(178, 135, 90)",
    fontWeight: "bold",
    stroke: "#000",
    strokeThickness: 3,
    strokeOutside: true
  });

  // Position the state.coffee drop text
  coffeeDrop.position.set(x, y-50);
  coffeeDrop.zIndex = 9999999999;
  state.app.stage.addChild(coffeeDrop);

  // Animate the Coffee drop text
  const startY = y -50;
  const endY = startY - 100; // Adjust the value to control the floating height
  const duration = 2600; // Animation duration in milliseconds
  const startTime = performance.now();

  const animateCoffeeDrop = (currentTime) => {
    const elapsed = currentTime - startTime;

    if (elapsed < duration) {
      const progress = elapsed / duration;
      const newY = startY - (progress * (startY - endY));
      coffeeDrop.position.y = newY;
      requestAnimationFrame(animateCoffeeDrop);
    } else {
      // Animation complete, remove the state.coffee drop text
      state.app.stage.removeChild(coffeeDrop);
    }
  };

  requestAnimationFrame(animateCoffeeDrop);
}

export function playDeathAnimation(enemy, critter) {

  // Add the death animation sprite to the stage
  state.enemyDeath.position.set(enemy.position.x, enemy.position.y);
  state.enemyDeath.zIndex = 15;
  state.app.stage.addChild(state.enemyDeath);
  const expDropText = enemy.exp;
  const expDrop = new PIXI.Text("+" + enemy.exp + " EXP", {
    fontSize: 18,
    fill: "orange",
    fontWeight: "bold",
    stroke: "#000",
    strokeThickness: 3,
    strokeOutside: true
  });
  expDrop.position.set(enemy.position.x + 20, enemy.position.y - 20);
  expDrop.zIndex = 9999999999;
  state.app.stage.addChild(expDrop);

  // Animate the EXP drop text
  const startY = enemy.position.y - 20;

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
      state.app.stage.removeChild(expDrop);
    }
  };

  requestAnimationFrame(animateExpDrop);
  // Play the death animation
  state.enemyDeath.gotoAndPlay(0);

  // Remove the death animation after it completes
  // Capture the character who made the kill so EXP goes to the right one
  const killingChar = getCurrentCharacter();
  state.enemyDeath.onComplete = () => {
    // Skip EXP if the killing character is dead (HP <= 0)
    if (getisDead()) {
      state.app.stage.removeChild(state.enemyDeath);
      return;
    }
    // Award EXP to the character who made the kill (not whoever is current now)
    const newEXP = getCharEXP(killingChar) + enemy.exp;
    setCharEXP(killingChar, newEXP);
    // Only update bar/level-up if this character is still active
    if (getCurrentCharacter() === killingChar) {
      updateEXP(newEXP);
    }

    state.app.stage.removeChild(state.enemyDeath);
  };
}

export function drawEnemyHPBar(enemy) {

  if (!enemy.initialWidth) {
    enemy.initialWidth = Math.round(enemy.width);
  }

  const hpBarWidth = 100;
  const hpBarHeight = 8;
  const hpBarX = enemy.anchor.x - 32;
  const hpBarY = -40;


  if (!enemy.hpBarContainer) {
    enemy.hpBarContainer = new PIXI.Container();
    enemy.addChild(enemy.hpBarContainer);

    enemy.hpBarBackground = new PIXI.Graphics();
    enemy.hpBarBackground.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight).fill({ color: 0x000000, alpha: 0.5 });
    enemy.hpBarContainer.addChild(enemy.hpBarBackground);

    enemy.hpBar = new PIXI.Graphics();
    enemy.hpBar.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight).fill({ color: 0xff0000, alpha: 0.75 });
    enemy.hpBarContainer.addChild(enemy.hpBar);
    enemy.hpBarBackground.position.set(hpBarX, hpBarY);
    enemy.hpBar.position.set(hpBarX, hpBarY);
  }

  const maxHealth = enemy.maxHP; // Replace with actual max health of enemy
  const currentHealth = enemy.currentHP; // Replace with actual current health of enemy
  const hpBarRatio = currentHealth / maxHealth;
  const hpBarWidthActual = Math.max(Math.round(hpBarWidth * hpBarRatio), 0);

  enemy.hpBarContainer.scale.set(1 / Math.abs(enemy.scale.x), 1 / Math.abs(enemy.scale.y));

  enemy.hpBar.clear();
  enemy.hpBar.rect(hpBarX + hpBarWidth - hpBarWidthActual, hpBarY, hpBarWidthActual, hpBarHeight).fill({ color: 0xff0000, alpha: 0.75 });
}
