// rewardedAd.js — Mock rewarded ad system (swap for real ads after approval)

let overlay = null;
let lastAdTime = 0;
const AD_COOLDOWN_MS = 60_000; // 60 seconds between ads

/** Create the ad overlay DOM element (call once on init) */
export function initRewardedAds() {
  overlay = document.createElement('div');
  overlay.id = 'reward-overlay';
  overlay.innerHTML =
    '<div class="reward-box slurm">' +
      '<div class="slurm-logo">SLURM</div>' +
      '<div class="slurm-tagline">It\'s Highly Addictive!</div>' +
      '<div class="slurm-worm"></div>' +
      '<div class="reward-progress"><div class="reward-bar"></div></div>' +
      '<div class="reward-sub">Enjoy Slurm\u2122</div>' +
    '</div>';
  overlay.style.display = 'none';
  document.body.appendChild(overlay);
}

/** Returns seconds remaining in cooldown, or 0 if ready */
export function getAdCooldownRemaining() {
  const elapsed = Date.now() - lastAdTime;
  if (elapsed >= AD_COOLDOWN_MS) return 0;
  return Math.ceil((AD_COOLDOWN_MS - elapsed) / 1000);
}

/**
 * Show a rewarded ad (mock or real).
 * @param {Function} onReward  — called when user earns the reward
 * @param {Function} [onDismiss] — called if ad is skipped/closed early
 *   onDismiss receives an optional object: { blocked: true } if ad was hidden by blocker
 */
export function showRewardedAd(onReward, onDismiss) {
  if (getAdCooldownRemaining() > 0) {
    if (onDismiss) onDismiss();
    return;
  }

  // --- Real ad integration (uncomment when approved) ---
  // if (window.adBreak) {
  //   window.adBreak({
  //     type: 'reward',
  //     name: 'earn-hearts',
  //     beforeReward: (showAdFn) => { showAdFn(); },
  //     adViewed: () => { lastAdTime = Date.now(); onReward(); },
  //     adDismissed: () => { if (onDismiss) onDismiss(); },
  //     adBreakDone: () => {},
  //   });
  //   return;
  // }

  // --- Mock ad (3-second simulated Slurm ad) ---
  if (!overlay) initRewardedAds();
  overlay.style.display = 'flex';
  const bar = overlay.querySelector('.reward-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  // Force reflow then animate
  void bar.offsetWidth;

  // Ad-block detection: check if blocker hid the overlay
  requestAnimationFrame(() => {
    if (overlay.offsetHeight === 0 || getComputedStyle(overlay).display === 'none') {
      // Ad blocker hid the overlay
      overlay.style.display = 'none';
      if (onDismiss) onDismiss({ blocked: true });
      return;
    }
    // Overlay is visible — start the progress bar animation
    bar.style.transition = 'width 3s linear';
    bar.style.width = '100%';

    setTimeout(() => {
      overlay.style.display = 'none';
      lastAdTime = Date.now();
      onReward();
    }, 3000);
  });
}
