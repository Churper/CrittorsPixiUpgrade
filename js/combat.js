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
} from './state.js';
import { pauseTimer, isTimerFinished } from './timer.js';
import { startFlashing, stopFlashing, setPlayerCurrentHealth, setCharEXP, getCharacterDamage } from './characters.js';
import { updatePlayerHealthBar, updateEnemyGrayscale } from './ui.js';
import { updateEXP } from './upgrades.js';

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
  const enemy = createSpawnDemi(critterWalkTextures, enemyName);

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


export function createSpawnDemi(critterWalkTextures, enemyName) {
  const enemy = new PIXI.AnimatedSprite(critterWalkTextures);
  enemy.scale.set(determineEnemyScale(enemyName) * 2);
  enemy.exp = 32 + Math.floor(state.currentRound * 4);
  enemy.anchor.set(0.5, 0.5);
  enemy.resett = false;
  enemy.type = enemyName;
  enemy.tint = Math.floor(Math.random() * 0xFFFFFF);
  enemy.isAttacking = false;
  enemy.enemyAdded = false;
  enemy.position.set(2800, state.app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 60 - 30));
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


export function spawnEnemy(critter, critterAttackTextures, critterWalkTextures, enemyName) {
  const enemy = createSpawnEnemy(critterWalkTextures, enemyName);

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


export function createSpawnEnemy(critterWalkTextures, enemyName) {
  const enemy = new PIXI.AnimatedSprite(critterWalkTextures);
  enemy.scale.set(determineEnemyScale(enemyName));
  enemy.exp = 32 + Math.floor(state.currentRound * 2);
  enemy.anchor.set(0.5, 0.5);
  enemy.resett = false;
  enemy.type = enemyName;
  enemy.isAttacking = false;
  enemy.enemyAdded = false;
  enemy.position.set(2800, state.app.screen.height - 120 - enemy.height / 8 - enemy.scale.y * 120 + (Math.random() * 60 - 30));
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
    handleEnemyMoving(critterWalkTextures, enemy);
  } else {
    handleEnemyCombat(critter, critterAttackTextures, critterWalkTextures, enemy, enemyName);
  }

  //state.isCombat = false;
}

export function handleEnemyMoving(critterWalkTextures, enemy) {
  if (enemy.textures !== critterWalkTextures && getEnemiesInRange() === 0) {
    enemy.textures = critterWalkTextures;
    enemy.loop = true;
    enemy.play();
  }
  enemy.position.x += enemy.vx;
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
  console.log('ENEMY HP', enemy.currentHP);

  if (enemy.currentHP <= 0) {

      // Callback function to remove enemy after death animation2
      if (state.app.stage.children.includes(enemy)) {
          enemy.tint = 0xFF0000; // Set the hit color


          if (getEnemiesInRange() === 0) {
              const enemyPortrait = document.getElementById('enemy-portrait');
              enemyPortrait.style.display = 'none'; // Make the element visible
          }

          console.log("ENEMY DEAD", enemy.position.x, enemy.position.y);
          createCoffeeDrop(enemy.position.x + 20, enemy.position.y);
          state.app.stage.removeChild(enemy);
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

  state.app.stage.addChild(state.frogGhostPlayer);

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
            const charClass = box.classList[1];
            if (!state.unlockedCharacters.includes(charClass)) {
              box.style.visibility = 'hidden';
            } else if (box.classList.contains(state.selectedCharacter)) {
              box.style.visibility = 'hidden';
            } else {
              box.style.visibility = 'visible';
            }
          });
          state.isCharacterMenuOpen = true;

        }


      }
      state.app.stage.removeChild(state.frogGhostPlayer);
      state.roundOver = true;

      // Continue with the game logic here
      // ...
    }
  }, 16); // (16ms = 60fps)
}


export function resetToAttackTextures(enemy, critterAttackTextures) {
  enemy.textures = critterAttackTextures;
  enemy.loop = true;
  enemy.gotoAndPlay(0);
}

export function handleEnemyAttacking(enemy, critterAttackTextures, critter, critterWalkTextures, enemyName) {
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
  let hasPlayedSound = false;
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
              state.app.stage.removeChild(critter);
              for (let i = 0; i < state.enemies.length; i++) {
                const enemy = state.enemies[i];

                if (state.app.stage.children.includes(enemy.hpBarBackground)) {
                  state.app.stage.removeChild(enemy.hpBarBackground);
                }

                if (state.app.stage.children.includes(enemy.hpBar)) {
                  state.app.stage.removeChild(enemy.hpBar);
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
            state.hitSound.volume = state.effectsVolume;
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

  // Pitch-shifted attack sound for crit/dud feedback
  const hitSound = state.attackSound.cloneNode();
  hitSound.volume = state.effectsVolume;
  if (damage > baseDamage) {
    hitSound.playbackRate = 2.0; // Crit: high pitch, snappy
  } else if (damage < baseDamage) {
    hitSound.playbackRate = 0.6; // Dud: lower pitch
  }
  hitSound.play();

  // Color-coded damage text
  let fillColor = "rgb(255, 100, 80)";        // normal: warm red
  if (damage > baseDamage) fillColor = "rgb(255, 165, 0)";  // crit: deep gold
  if (damage < baseDamage) fillColor = "rgb(160, 160, 160)"; // dud: grey

  drawEnemyHPBar(enemy);
  updateEnemyGrayscale(enemy.currentHP);
  const damageText = new PIXI.Text(`${-damage}`, {
    fontSize: 24,
    fill: fillColor,
    fontWeight: "bold",
    stroke: "#000",
    strokeThickness: 3,
    strokeOutside: true
  });

  damageText.anchor.set(0.5);
  damageText.position.set(enemy.position.x + 40, enemy.position.y - 30);
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
      damageText.position.y = startY - progress * 30;
      damageText.alpha = 1 - progress;
    }
  };

  state.app.ticker.add(update);
}


export function critterAttack(critter, enemy, critterAttackTextures) {
  // Reduce enemy's HP
  console.log('ENEMY TYPE', enemy.type);

  drawHitSplat(enemy);

  console.log("dmgD", getCharacterDamage(getCurrentCharacter()));
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
      setIsCharAttacking(false);
      console.log("ENEMY DEAD", enemy.position.x, enemy.position.y);
      createCoffeeDrop(enemy.position.x + 20, enemy.position.y);
      state.app.stage.removeChild(enemy);
      getEnemies().splice(getEnemies().indexOf(enemy), 1);

      playDeathAnimation(enemy, critter);
    }
  }
}


export function createCoffeeDrop(x, y) {
  // Create a container to hold the state.coffee beans
  const coffeeContainer = new PIXI.Container();

  // Get the bean texture from the loaded resources
  const beanTexture = PIXI.Assets.get('bean');

  // Generate a random number between 1 and 10 for the number of state.coffee beans
  const numBeans = Math.floor(Math.random() * 15 + state.currentRound * 2) + 1;

  // Define the duration (in milliseconds) for the state.coffee beans to fall
  const duration = 2000; // Adjust this value as desired

  // Create and position state.coffee beans randomly within the container
  for (let i = 0; i < numBeans; i++) {
    const bean = new PIXI.Sprite(beanTexture);

    // Set the initial position of the state.coffee bean
    bean.anchor.set(0.5); // Set the anchor point to the center of the bean
    bean.x = x + Math.random() * 80 - 10; // Randomize the x position within a range
    bean.y = y + Math.random() * 60 - 20;;

    // Set a random rotation angle for the state.coffee bean
    bean.rotation = Math.random() * Math.PI * 2;

    // Set the scale of the state.coffee bean (adjust the values as desired)
    bean.scale.set(0.075 + Math.random() * 0.2); // Randomize the scale between 0.3 and 0.5

    // Add the state.coffee bean to the container
    coffeeContainer.addChild(bean);

    // Animate the state.coffee bean to drop gradually
    const targetY = y + 50; // Adjust the target position as desired
    const initialY = bean.y - 50;
    const startTime = Date.now();

    const update = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = elapsedTime / duration;

      if (progress >= 1) {
        bean.y = targetY;
        return;
      }

      bean.y = initialY + (targetY - initialY) * progress;
      requestAnimationFrame(update);
    };

    update();
  }

  // Add the state.coffee container to the stage or another container in your application
  coffeeContainer.zIndex = 15;
  state.app.stage.addChild(coffeeContainer);

  // Start a state.timer to remove the state.coffee beans after the specified duration
  setTimeout(() => {
    // Remove the state.coffee container from the stage or parent container
    state.app.stage.removeChild(coffeeContainer);
    createCoffeeDropText(x, y + 50, numBeans);

  }, duration * 1.5);
  addCoffee(numBeans);
}

export function addCoffee(amount) {
  setCoffee(getCoffee() + amount);
  const coffeeAmountElement = document.getElementById('coffee-amount');
  const coffeeAmount = getCoffee();
  coffeeAmountElement.textContent = `${coffeeAmount}`;
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
  state.enemyDeath.onComplete = () => {
    setCharEXP(getCurrentCharacter(), getCharEXP(getCurrentCharacter()) + enemy.exp);
    //ox setPlayerEXP(getPlayerEXP() + 100);
    console.log("YEP", getCharEXP(getCurrentCharacter()));
    console.log("YEPX", getEXPtoLevel(getCurrentCharacter()));
    updateEXP(getCharEXP(getCurrentCharacter()) + enemy.exp, getEXPtoLevel(getCurrentCharacter()));

    // Create the EXP drop text

    // Remove the death animation sprite after it completes
    state.app.stage.removeChild(state.enemyDeath);
    //state.isCombat=false;
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
    console.log("HELLO");

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
  console.log("HPX", hpBarX);
  console.log("HPY", hpBarY);

  enemy.hpBar.clear();
  enemy.hpBar.rect(hpBarX + hpBarWidth - hpBarWidthActual, hpBarY, hpBarWidthActual, hpBarHeight).fill({ color: 0xff0000, alpha: 0.75 });
}
