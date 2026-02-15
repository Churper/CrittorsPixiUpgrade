// timer.js — Timer system (round progress bar + snail animation)

import state from './state.js';

export function startTimer() {
  if (state.timerFinished) return;

  const snail = document.getElementById('snail');
  const progressFilled = document.getElementById('progress-filled');

  if (state.isPaused1) {
    // Resume from the paused time
    const currentTime = Date.now();
    const pausedDuration = currentTime - state.pauseTime;
    state.totalPausedTime += pausedDuration;
    state.startTime = state.resetStartTime + state.totalPausedTime;
    state.isPaused1 = false;
  } else if (!state.timer) {
    // Start from the beginning
    state.resetStartTime = Date.now();
    state.startTime = state.resetStartTime;
    state.totalPausedTime = 0;
  }

  if (state.timer) {
    clearInterval(state.timer);
  }

  // Cause a reflow by accessing offsetWidth
  snail.getBoundingClientRect();
  progressFilled.getBoundingClientRect();

  // Set the animations
  snail.style.animation = 'snail-movement 60s linear, snail-animation 1s steps(2) infinite';
  progressFilled.style.animation = 'progress-fill 60s linear';
  setTimeout(() => {
    snail.style.animationPlayState = 'running';
    progressFilled.style.animationPlayState = 'running';
  }, 0);


  state.timer = setInterval(() => {
    const diff = Date.now() - state.startTime;
    const percentage = Math.min(diff / 60000, 1); // 100 seconds

    if (percentage === 1) {
      clearInterval(state.timer);
      state.timer = null;
      state.timerFinished = true;
      snail.style.animation = 'none';
      progressFilled.style.animation = 'none';
      snail.style.left = 'calc(80vw)';  // Changed line
      progressFilled.style.width = '68vw';  // Changed line
    }
  }, 10);
}

export function pauseTimer() {
  const snail = document.getElementById('snail');
  const progressFilled = document.getElementById('progress-filled');

  snail.style.animationPlayState = 'paused';
  progressFilled.style.animationPlayState = 'paused';

  state.pauseTime = Date.now();
  state.isPaused1 = true;

  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

export function resetTimer() {
  const snail = document.getElementById('snail');
  const progressFilled = document.getElementById('progress-filled');

  snail.style.animation = 'none';
  progressFilled.style.animation = 'none';

  snail.style.left = 'calc(12%)';
  progressFilled.style.width = '0%';

  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }

  state.isPaused1 = false;
  state.pauseTime = null;
  state.startTime = null;
  state.resetStartTime = null;
  state.timerFinished = false;
  state.totalPausedTime = 0;
}

export function isTimerFinished() {
  return state.timerFinished;
}
