import state from './state.js';

// ── Supabase config ─────────────────────────────────────────
// Replace these with your Supabase project values from Settings > API
const SUPABASE_URL = 'https://xoyshmjirnlrrgkwlpjc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hV2btNJj4EHPUTsNs_4MPA_o-nnmGFW';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

// ── Player name persistence ─────────────────────────────────
const NAME_KEY = 'crittorsPlayerName';

export function getSavedPlayerName() {
  return localStorage.getItem(NAME_KEY) || '';
}

export function savePlayerName(name) {
  localStorage.setItem(NAME_KEY, name);
}

// ── Score formatting ────────────────────────────────────────
export function formatScore(score, mode) {
  if (mode === 'endless') {
    const castle = Math.floor(score / 10);
    return 'Castle #' + castle;
  }
  return 'Round ' + score;
}

// ── Supabase API ────────────────────────────────────────────
export async function submitScore(playerName, mode, score) {
  if (state.leaderboardLockedByDevTools) {
    return { ok: false, error: 'Leaderboard disabled for this save (dev unlock used). Wipe save to re-enable.' };
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leaderboard`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ player_name: playerName, mode, score }),
      }
    );
    if (!res.ok) {
      const msg = await res.text();
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchLeaderboard(mode, limit = 20) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leaderboard` +
        `?mode=eq.${mode}&order=score.desc&limit=${limit}`,
      { headers }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── Leaderboard panel rendering ─────────────────────────────
export async function showLeaderboardPanel() {
  renderList('endless');
}

async function renderList(mode) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '<p style="text-align:center;opacity:0.6;">Loading...</p>';

  const rows = await fetchLeaderboard(mode);

  if (rows.length === 0) {
    list.innerHTML = '<p style="text-align:center;opacity:0.6;">No scores yet</p>';
    return;
  }

  list.innerHTML = rows.map((row, i) => {
    const rank = i + 1;
    const gold = rank <= 3 ? ' lb-top' : '';
    return `<div class="lb-row${gold}">
      <span class="lb-rank">${rank}</span>
      <span class="lb-name">${escapeHtml(row.player_name)}</span>
      <span class="lb-score">${formatScore(row.score, mode)}</span>
    </div>`;
  }).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Score submission overlay ────────────────────────────────
export function showScoreSubmitOverlay(mode, score, fromPause = false) {
  const overlay = document.getElementById('score-submit-overlay');
  const scoreEl = document.getElementById('score-submit-score');
  const nameInput = document.getElementById('score-submit-name');
  const submitBtn = document.getElementById('score-submit-btn');
  const skipBtn = document.getElementById('score-skip-btn');
  const statusEl = document.getElementById('score-submit-status');

  const titleEl = document.getElementById('score-submit-title');
  if (titleEl) titleEl.textContent = fromPause ? 'Submit Score' : 'Game Over';
  scoreEl.textContent = formatScore(score, mode);
  nameInput.value = getSavedPlayerName();
  statusEl.textContent = '';
  submitBtn.disabled = false;
  nameInput.disabled = false;
  overlay.classList.add('visible');

  if (state.leaderboardLockedByDevTools) {
    statusEl.textContent = 'Leaderboard disabled for this save (dev unlock used). Wipe save to submit again.';
    submitBtn.disabled = true;
    nameInput.disabled = true;
  }

  // Guard against synthetic click events from the touch that opened this overlay.
  // On mobile, pointerdown shows the overlay, then ~300ms later a synthetic click
  // can land on Skip/Submit and dismiss it instantly.
  const openTime = Date.now();

  // Block pointer events on the overlay background so taps outside the panel
  // don't propagate to the game canvas underneath.
  overlay.onclick = (e) => { e.stopPropagation(); };

  submitBtn.onclick = async () => {
    if (state.leaderboardLockedByDevTools) return;
    if (Date.now() - openTime < 400) return;
    const name = nameInput.value.trim();
    if (!name || name.length > 20) {
      statusEl.textContent = 'Enter a name (1-20 chars)';
      return;
    }
    submitBtn.disabled = true;
    statusEl.textContent = 'Submitting...';
    savePlayerName(name);
    const result = await submitScore(name, mode, score);
    if (result.ok) {
      statusEl.textContent = 'Score submitted!';
      if (fromPause) {
        setTimeout(() => overlay.classList.remove('visible'), 1200);
      } else {
        setTimeout(() => location.reload(), 1200);
      }
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'try again');
      submitBtn.disabled = false;
    }
  };

  skipBtn.onclick = () => {
    if (Date.now() - openTime < 400) return;
    if (fromPause) {
      overlay.classList.remove('visible');
    } else {
      location.reload();
    }
  };
}

