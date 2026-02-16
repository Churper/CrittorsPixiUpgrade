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
    return score + ' kills';
  }
  return 'Round ' + score;
}

// ── Supabase API ────────────────────────────────────────────
export async function submitScore(playerName, mode, score) {
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
  const panel = document.getElementById('leaderboard-panel');
  panel.style.display = 'block';

  // Wire tab clicks
  const tabs = panel.querySelectorAll('.lb-tab');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderList(tab.dataset.mode);
    };
  });

  // Load default tab
  const activeTab = panel.querySelector('.lb-tab.active');
  renderList(activeTab ? activeTab.dataset.mode : 'endless');
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
