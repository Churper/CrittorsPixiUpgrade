// rewardedAd.js — Mock rewarded ad system (swap for real ads after approval)

let overlay = null;
let lastAdTime = 0;
const AD_COOLDOWN_MS = 60_000; // 60 seconds between ads

/** Create the ad overlay DOM element (call once on init) */
export function initRewardedAds() {
  overlay = document.createElement('div');
  overlay.id = 'ad-overlay';
  overlay.innerHTML =
    '<div class="ad-overlay-box slurm">' +
      '<div class="ad-slurm-logo">SLURM</div>' +
      '<div class="ad-slurm-tagline">It\'s Highly Addictive!</div>' +
      '<div class="ad-slurm-worm"></div>' +
      '<div class="ad-overlay-progress"><div class="ad-overlay-bar"></div></div>' +
      '<div class="ad-overlay-sub">Enjoy Slurm\u2122</div>' +
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
  const bar = overlay.querySelector('.ad-overlay-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  // Force reflow then animate
  void bar.offsetWidth;
  bar.style.transition = 'width 3s linear';
  bar.style.width = '100%';

  setTimeout(() => {
    overlay.style.display = 'none';
    lastAdTime = Date.now();
    onReward();
  }, 3000);
}
