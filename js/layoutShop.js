// --- Layout Shop (Bones Shop) Panel ---
// Extracted from main.js — pure DOM UI, no PIXI dependencies.

import state from './state.js';
import { saveBones } from './save.js';
import { skinCatalog } from './skins.js';
import { showLeaderboardPanel } from './leaderboard.js';

// --- Helper: show/hide panel via its backdrop ---
export function showPanel(panelId) {
  const backdrop = document.getElementById(panelId + '-backdrop');
  if (backdrop) backdrop.classList.add('visible');
}
export function hidePanel(panelId) {
  const backdrop = document.getElementById(panelId + '-backdrop');
  if (backdrop) backdrop.classList.remove('visible');
}

// Flat bonus per layout upgrade level
const layoutBonusPerLevel = { damage: 1, health: 12, defense: 1 };
const layoutBonusLabel = { damage: 'dmg', health: 'hp', defense: 'def' };

// Available hats & skins catalog
const hatCatalog = [
  { id: 'tophat',     icon: '🎩', name: 'Top Hat',     cost: 1 },
  { id: 'partyhat',   icon: '🎉', name: 'Party Hat',   cost: 3 },
  { id: 'crown',      icon: '👑', name: 'Crown',       cost: 5 },
  { id: 'wizardhat',  icon: '🧙', name: 'Wizard Hat',  cost: 8 },
  { id: 'viking',     icon: '⚔️', name: 'Viking Helm', cost: 12 },
  { id: 'halo',       icon: '😇', name: 'Halo',        cost: 15 },
];

// Items that can have starting counts purchased
const inventoryItemCatalog = [
  { id: 'shield',     icon: '🛡️', name: 'Shield',          costPer: 10 },
  { id: 'bomb',       icon: '💣', name: 'Bomb',            costPer: 20 },
  { id: 'rage',       icon: '🧃', name: 'Rage Potion',     costPer: 10 },
  { id: 'feather',    icon: '🪶', name: 'Phoenix Feather', costPer: 20 },
  { id: 'potionHeal', icon: 'potion-svg', name: 'Potion Power', costPer: 100, suffix: '+15 hp/use' },
  { id: 'medkit',     icon: '➕', name: 'Medkit',           costPer: 15, suffix: 'Heal all crittors' },
];

/** Call once from DOMContentLoaded to wire all layout shop DOM listeners. */
export function initLayoutShop() {
  const layoutPanel = document.getElementById('layout-panel');
  const layoutBonesEl = document.getElementById('layout-bones');
  const layoutCards = Array.from(document.querySelectorAll('.layout-card'));
  const charOrder = ['frog', 'snail', 'bird', 'bee'];
  let layoutDeckIndex = 0;

  function updateDeckPositions() {
    layoutCards.forEach(card => {
      card.className = 'layout-card';
      const picker = card.querySelector('.layout-inline-picker');
      if (picker) { picker.style.display = 'none'; picker.dataset.activeSlot = ''; }
      card.querySelectorAll('.layout-cosmetic-slot').forEach(s => s.classList.remove('slot-active'));
    });
    for (let i = 0; i < layoutCards.length; i++) {
      const cardIdx = (layoutDeckIndex + i) % layoutCards.length;
      layoutCards[cardIdx].classList.add('card-pos-' + i);
    }
  }

  function updateLayoutUI() {
    const bones = state.bones;
    const upgrades = state.layoutUpgrades;
    layoutBonesEl.textContent = `🍓 ${bones}`;
    const heartsEl = document.getElementById('layout-hearts');
    if (heartsEl) heartsEl.textContent = `💗 ${state.supporterHearts}`;

    layoutCards.forEach(card => {
      const charName = card.dataset.char;
      const charUpgrades = upgrades[charName] || { damage: 0, health: 0, defense: 0 };
      card.querySelectorAll('.layout-row').forEach(row => {
        const stat = row.dataset.stat;
        const level = charUpgrades[stat] || 0;
        const totalBonus = level * layoutBonusPerLevel[stat];
        const bonusStr = totalBonus;
        row.querySelector('.layout-stat-bonus').textContent = `+${bonusStr} ${layoutBonusLabel[stat]}`;
        const cost = 10 + level * 5;
        const btn = row.querySelector('.layout-buy-btn');
        btn.dataset.cost = cost;
        btn.textContent = `🍓${cost}`;
        btn.classList.toggle('cant-afford', bones < cost);
      });
    });
  }

  // --- Layout panel open/close ---
  document.getElementById('layout-btn').addEventListener('click', function() {
    showLayoutDeck();
    updateDeckPositions();
    updateLayoutUI();
    showPanel('layout');
  });

  document.getElementById('layout-close-btn').addEventListener('click', function() {
    hidePanel('layout');
  });

  // Card deck navigation
  document.getElementById('layout-next').addEventListener('click', function() {
    layoutDeckIndex = (layoutDeckIndex + 1) % layoutCards.length;
    updateDeckPositions();
    updateLayoutUI();
  });

  document.getElementById('layout-prev').addEventListener('click', function() {
    layoutDeckIndex = (layoutDeckIndex - 1 + layoutCards.length) % layoutCards.length;
    updateDeckPositions();
    updateLayoutUI();
  });

  // --- Touch swipe gestures for the card deck ---
  const layoutDeckEl = document.querySelector('.layout-deck');
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeStartTime = 0;
  let isSwiping = false;
  let swipeLocked = false;

  layoutDeckEl.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
    swipeStartTime = Date.now();
    isSwiping = true;
    swipeLocked = false;
    const frontCard = layoutDeckEl.querySelector('.card-pos-0');
    if (frontCard) frontCard.classList.add('swiping');
  }, { passive: false });

  layoutDeckEl.addEventListener('touchmove', function(e) {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStartX;
    const dy = touch.clientY - swipeStartY;
    if (!swipeLocked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      swipeLocked = true;
      if (Math.abs(dy) > Math.abs(dx)) {
        isSwiping = false;
        const frontCard = layoutDeckEl.querySelector('.swiping');
        if (frontCard) frontCard.classList.remove('swiping');
        return;
      }
    }
    if (!swipeLocked) return;
    e.preventDefault();
    const frontCard = layoutDeckEl.querySelector('.swiping');
    if (frontCard) {
      const clampedDx = Math.max(-100, Math.min(100, dx));
      const rot = clampedDx * 0.05;
      frontCard.style.transform = `translateX(${clampedDx}px) rotate(${rot}deg) scale(1)`;
      frontCard.style.opacity = Math.max(0.4, 1 - Math.abs(clampedDx) / 180);
    }
  }, { passive: false });

  layoutDeckEl.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    isSwiping = false;
    const frontCard = layoutDeckEl.querySelector('.swiping');
    if (frontCard) {
      frontCard.classList.remove('swiping');
      frontCard.style.transform = '';
      frontCard.style.opacity = '';
    }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeStartX;
    const elapsed = Date.now() - swipeStartTime;
    const velocity = Math.abs(dx) / Math.max(1, elapsed);
    const threshold = 25;
    const velThreshold = 0.25;
    if (Math.abs(dx) > threshold || velocity > velThreshold) {
      if (dx < 0) {
        layoutDeckIndex = (layoutDeckIndex + 1) % layoutCards.length;
      } else {
        layoutDeckIndex = (layoutDeckIndex - 1 + layoutCards.length) % layoutCards.length;
      }
      updateDeckPositions();
      updateLayoutUI();
    }
  }, { passive: true });

  layoutDeckEl.addEventListener('touchcancel', function() {
    isSwiping = false;
    const frontCard = layoutDeckEl.querySelector('.swiping');
    if (frontCard) {
      frontCard.classList.remove('swiping');
      frontCard.style.transform = '';
      frontCard.style.opacity = '';
    }
  }, { passive: true });

  // --- Buy buttons on all cards ---
  document.querySelectorAll('.layout-buy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const card = this.closest('.layout-card');
      const charName = card.dataset.char;
      const row = this.closest('.layout-row');
      const stat = row.dataset.stat;
      const cost = parseInt(this.dataset.cost);
      if (state.bones < cost) return;
      state.bones -= cost;
      state.layoutUpgrades[charName][stat]++;
      saveBones();
      updateLayoutUI();
    });
  });

  // --- Layout sub-view navigation ---
  const layoutDeckArea = document.querySelector('.layout-deck-area');
  const layoutHatsView = document.getElementById('layout-hats-view');
  const layoutSkinsView = document.getElementById('layout-skins-view');
  const layoutInventoryView = document.getElementById('layout-inventory-view');
  const hatsCharName = document.getElementById('hats-char-name');
  const skinsCharName = document.getElementById('skins-char-name');
  let activeSubviewChar = null;

  function showLayoutView(view, charLabel, charName) {
    layoutDeckArea.style.display = 'none';
    layoutHatsView.classList.remove('active');
    layoutSkinsView.classList.remove('active');
    layoutInventoryView.classList.remove('active');
    view.classList.add('active');
    if (charName) activeSubviewChar = charName;
    if (charLabel) {
      if (view === layoutHatsView) {
        hatsCharName.textContent = charLabel;
        const portrait = document.getElementById('hats-preview-portrait');
        if (portrait) portrait.src = './assets/' + charName + 'portrait.png';
        renderHatsGrid();
        updateHatsEquippedLabel();
      }
      if (view === layoutSkinsView) {
        skinsCharName.textContent = charLabel;
        const portrait = document.getElementById('skins-preview-portrait');
        if (portrait) portrait.src = './assets/' + charName + 'portrait.png';
        renderSkinsGrid();
        updateSkinsEquippedLabel();
      }
    }
    if (view === layoutInventoryView) renderInventoryGrid();
    const btn = document.getElementById('layout-inventory-btn');
    btn.textContent = view === layoutInventoryView ? '\u2190 Characters' : '\uD83C\uDF92 Inventory';
  }

  function updateHatsEquippedLabel() {
    const el = document.getElementById('hats-equipped-label');
    if (!el || !activeSubviewChar) return;
    const hatId = state.equippedHats[activeSubviewChar];
    if (!hatId) { el.textContent = 'None'; return; }
    const hat = hatCatalog.find(h => h.id === hatId);
    el.textContent = hat ? hat.icon + ' ' + hat.name : 'None';
  }

  function updateSkinsEquippedLabel() {
    const el = document.getElementById('skins-equipped-label');
    if (!el || !activeSubviewChar) return;
    const skinId = state.equippedSkins[activeSubviewChar];
    if (!skinId) { el.textContent = 'Default'; return; }
    const skin = skinCatalog.find(s => s.id === skinId);
    el.textContent = skin ? skin.icon + ' ' + skin.name : 'Default';
  }

  function showLayoutDeck() {
    layoutHatsView.classList.remove('active');
    layoutSkinsView.classList.remove('active');
    layoutInventoryView.classList.remove('active');
    layoutDeckArea.style.display = 'flex';
    activeSubviewChar = null;
    updateDeckPositions();
    document.getElementById('layout-inventory-btn').textContent = '🎒 Inventory';
  }

  // --- Render hats grid ---
  function renderHatsGrid() {
    const grid = document.getElementById('hats-grid');
    grid.innerHTML = '';
    const ch = activeSubviewChar;

    const isNone = !state.equippedHats[ch];
    const noneEl = document.createElement('div');
    noneEl.className = 'layout-subview-item' + (isNone ? ' equipped' : '');
    noneEl.innerHTML = '<span>\u2728</span><span class="subview-label">None</span>';
    noneEl.addEventListener('click', () => {
      state.equippedHats[ch] = null;
      saveBones();
      renderHatsGrid();
      updateHatsEquippedLabel();
    });
    grid.appendChild(noneEl);

    hatCatalog.forEach(hat => {
      const owned = state.ownedHats.includes(hat.id);
      const equipped = state.equippedHats[ch] === hat.id;
      const el = document.createElement('div');
      el.className = 'layout-subview-item' + (equipped ? ' equipped' : '');
      el.innerHTML = owned
        ? `<span>${hat.icon}</span><span class="subview-label">${hat.name}</span>`
        : `<span>${hat.icon}</span><span class="subview-cost">\uD83D\uDC97${hat.cost}</span>`;
      el.addEventListener('click', () => {
        if (!owned) {
          if (state.supporterHearts < hat.cost) return;
          state.supporterHearts -= hat.cost;
          state.ownedHats.push(hat.id);
          saveBones();
          updateLayoutUI();
          renderHatsGrid();
          updateHatsEquippedLabel();
        } else {
          state.equippedHats[ch] = equipped ? null : hat.id;
          saveBones();
          renderHatsGrid();
          updateHatsEquippedLabel();
        }
      });
      grid.appendChild(el);
    });
  }

  // --- Render skins grid ---
  function renderSkinsGrid() {
    const grid = document.getElementById('skins-grid');
    grid.innerHTML = '';
    const ch = activeSubviewChar;

    const isDefault = !state.equippedSkins[ch];
    const defEl = document.createElement('div');
    defEl.className = 'layout-subview-item' + (isDefault ? ' equipped' : '');
    defEl.innerHTML = '<span>\u2728</span><span class="subview-label">Default</span>';
    defEl.addEventListener('click', () => {
      state.equippedSkins[ch] = null;
      saveBones();
      renderSkinsGrid();
      updateSkinsEquippedLabel();
    });
    grid.appendChild(defEl);

    const available = skinCatalog.filter(s => !s.charOnly || s.charOnly === ch);
    available.forEach(skin => {
      const owned = state.ownedSkins.includes(skin.id);
      const equipped = state.equippedSkins[ch] === skin.id;
      const el = document.createElement('div');
      el.className = 'layout-subview-item' + (equipped ? ' equipped' : '');
      el.innerHTML = owned
        ? `<span>${skin.icon}</span><span class="subview-label">${skin.name}</span>`
        : `<span>${skin.icon}</span><span class="subview-label">${skin.name}</span><span class="subview-cost">\uD83D\uDC97${skin.cost}</span>`;
      el.addEventListener('click', () => {
        if (!owned) {
          if (state.supporterHearts < skin.cost) return;
          state.supporterHearts -= skin.cost;
          state.ownedSkins.push(skin.id);
          saveBones();
          updateLayoutUI();
          renderSkinsGrid();
          updateSkinsEquippedLabel();
        } else {
          state.equippedSkins[ch] = equipped ? null : skin.id;
          saveBones();
          renderSkinsGrid();
          updateSkinsEquippedLabel();
        }
      });
      grid.appendChild(el);
    });
  }

  // --- Render inventory grid ---
  function renderInventoryGrid() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    const potionSVG = '<svg width="22" height="32" viewBox="0 0 28 40"><rect x="10" y="0" width="8" height="5" rx="1" fill="#8B5E3C"/><rect x="11" y="5" width="6" height="8" rx="2" fill="#cc2222" opacity="0.8"/><rect x="6" y="13" width="16" height="22" rx="4" fill="#dd2222"/><rect x="8" y="15" width="4" height="12" rx="2" fill="#ff6666" opacity="0.45"/></svg>';
    inventoryItemCatalog.forEach(item => {
      const count = state.startingItems[item.id] || 0;
      const canAfford = state.bones >= item.costPer;
      const iconHtml = item.icon === 'potion-svg' ? potionSVG : item.icon;
      const row = document.createElement('div');
      row.className = 'shop-row';
      const desc = item.suffix ? `<span class="shop-row-desc">${item.suffix}</span>` : '';
      row.innerHTML =
        `<div class="shop-row-icon">${iconHtml}${count > 0 ? '<span class="shop-icon-badge">' + count + '</span>' : ''}</div>` +
        `<div class="shop-row-info"><span class="shop-row-name">${item.name}</span>${desc}</div>` +
        `<button class="shop-row-buy${canAfford ? '' : ' cant-afford'}">\uD83C\uDF53${item.costPer}</button>`;
      row.querySelector('.shop-row-buy').addEventListener('click', () => {
        if (state.bones < item.costPer) return;
        state.bones -= item.costPer;
        state.startingItems[item.id] = (state.startingItems[item.id] || 0) + 1;
        saveBones();
        updateLayoutUI();
        renderInventoryGrid();
      });
      grid.appendChild(row);
    });
  }

  // --- Cosmetic slot click handlers — inline picker with portrait preview ---
  document.querySelectorAll('.layout-cosmetic-slot').forEach(slot => {
    slot.addEventListener('click', function() {
      const card = this.closest('.layout-card');
      const charName = card.dataset.char;
      const slotType = this.dataset.slot;
      const picker = card.querySelector('.layout-inline-picker');

      if (picker.style.display !== 'none' && picker.dataset.activeSlot === slotType) {
        picker.style.display = 'none';
        picker.dataset.activeSlot = '';
        this.classList.remove('slot-active');
        return;
      }

      card.querySelectorAll('.layout-cosmetic-slot').forEach(s => s.classList.remove('slot-active'));
      this.classList.add('slot-active');

      picker.dataset.activeSlot = slotType;
      picker.style.display = 'block';
      if (slotType === 'hat') {
        renderInlineHats(picker, charName);
      } else if (slotType === 'skin') {
        renderInlineSkins(picker, charName);
      }
    });
  });

  // Build the persistent preview + grid layout inside the inline picker
  function ensurePickerLayout(container, charName) {
    let layout = container.querySelector('.inline-picker-layout');
    if (!layout) {
      container.innerHTML = '';
      layout = document.createElement('div');
      layout.className = 'inline-picker-layout';
      // Portrait preview (left)
      const preview = document.createElement('div');
      preview.className = 'inline-picker-preview';
      preview.innerHTML =
        '<img class="inline-picker-portrait" src="./assets/' + charName + 'portrait.png">' +
        '<div class="inline-picker-charname">' + charName.charAt(0).toUpperCase() + charName.slice(1) + '</div>' +
        '<div class="inline-picker-equipped-label"></div>';
      layout.appendChild(preview);
      // Grid (right)
      const grid = document.createElement('div');
      grid.className = 'inline-picker-grid';
      layout.appendChild(grid);
      container.appendChild(layout);
    }
    // Always update portrait src in case char changed
    const img = layout.querySelector('.inline-picker-portrait');
    if (img) img.src = './assets/' + charName + 'portrait.png';
    const nameEl = layout.querySelector('.inline-picker-charname');
    if (nameEl) nameEl.textContent = charName.charAt(0).toUpperCase() + charName.slice(1);
    return layout;
  }

  function updateInlineEquippedLabel(container, charName) {
    const label = container.querySelector('.inline-picker-equipped-label');
    if (!label) return;
    const slot = container.dataset.activeSlot;
    if (slot === 'hat') {
      const hatId = state.equippedHats[charName];
      if (!hatId) { label.textContent = 'No hat'; return; }
      const hat = hatCatalog.find(h => h.id === hatId);
      label.textContent = hat ? hat.icon + ' ' + hat.name : 'No hat';
    } else {
      const skinId = state.equippedSkins[charName];
      if (!skinId) { label.textContent = 'Default skin'; return; }
      const skin = skinCatalog.find(s => s.id === skinId);
      label.textContent = skin ? skin.icon + ' ' + skin.name : 'Default skin';
    }
  }

  function renderInlineHats(container, charName) {
    const layout = ensurePickerLayout(container, charName);
    const grid = layout.querySelector('.inline-picker-grid');
    grid.innerHTML = '';

    const isNone = !state.equippedHats[charName];
    const noneEl = document.createElement('div');
    noneEl.className = 'inline-picker-item' + (isNone ? ' equipped' : '');
    noneEl.innerHTML = '<span>\u2728</span><span class="inline-picker-label">None</span>';
    noneEl.addEventListener('click', () => {
      state.equippedHats[charName] = null;
      saveBones();
      renderInlineHats(container, charName);
      updateLayoutUI();
    });
    grid.appendChild(noneEl);

    hatCatalog.forEach(hat => {
      const owned = state.ownedHats.includes(hat.id);
      const equipped = state.equippedHats[charName] === hat.id;
      const el = document.createElement('div');
      el.className = 'inline-picker-item' + (equipped ? ' equipped' : '');
      el.innerHTML = owned
        ? `<span>${hat.icon}</span><span class="inline-picker-label">${hat.name}</span>`
        : `<span>${hat.icon}</span><span class="inline-picker-cost">\uD83D\uDC97${hat.cost}</span><span class="inline-picker-label">${hat.name}</span>`;
      el.addEventListener('click', () => {
        if (!owned) {
          if (state.supporterHearts < hat.cost) return;
          state.supporterHearts -= hat.cost;
          state.ownedHats.push(hat.id);
          saveBones();
          updateLayoutUI();
          renderInlineHats(container, charName);
        } else {
          state.equippedHats[charName] = equipped ? null : hat.id;
          saveBones();
          renderInlineHats(container, charName);
        }
      });
      grid.appendChild(el);
    });
    updateInlineEquippedLabel(container, charName);
  }

  function renderInlineSkins(container, charName) {
    const layout = ensurePickerLayout(container, charName);
    const grid = layout.querySelector('.inline-picker-grid');
    grid.innerHTML = '';

    const isDefault = !state.equippedSkins[charName];
    const defEl = document.createElement('div');
    defEl.className = 'inline-picker-item' + (isDefault ? ' equipped' : '');
    defEl.innerHTML = '<span>\u2728</span><span class="inline-picker-label">Default</span>';
    defEl.addEventListener('click', () => {
      state.equippedSkins[charName] = null;
      saveBones();
      renderInlineSkins(container, charName);
      updateLayoutUI();
    });
    grid.appendChild(defEl);

    const available = skinCatalog.filter(s => !s.charOnly || s.charOnly === charName);
    available.forEach(skin => {
      const owned = state.ownedSkins.includes(skin.id);
      const equipped = state.equippedSkins[charName] === skin.id;
      const el = document.createElement('div');
      el.className = 'inline-picker-item' + (equipped ? ' equipped' : '');
      el.innerHTML = owned
        ? `<span>${skin.icon}</span><span class="inline-picker-label">${skin.name}</span>`
        : `<span>${skin.icon}</span><span class="inline-picker-cost">\uD83D\uDC97${skin.cost}</span><span class="inline-picker-label">${skin.name}</span>`;
      el.addEventListener('click', () => {
        if (!owned) {
          if (state.supporterHearts < skin.cost) return;
          state.supporterHearts -= skin.cost;
          state.ownedSkins.push(skin.id);
          saveBones();
          updateLayoutUI();
          renderInlineSkins(container, charName);
        } else {
          state.equippedSkins[charName] = equipped ? null : skin.id;
          saveBones();
          renderInlineSkins(container, charName);
        }
      });
      grid.appendChild(el);
    });
    updateInlineEquippedLabel(container, charName);
  }

  // Inventory button — toggles between inventory and deck view
  const layoutInvBtn = document.getElementById('layout-inventory-btn');
  layoutInvBtn.addEventListener('click', function() {
    if (layoutInventoryView.classList.contains('active')) {
      showLayoutDeck();
    } else {
      showLayoutView(layoutInventoryView);
    }
  });

  // Back buttons
  document.querySelectorAll('.layout-back-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      showLayoutDeck();
    });
  });

  // Click-outside-to-close for all panel backdrops
  document.querySelectorAll('.panel-backdrop').forEach(function(backdrop) {
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        backdrop.classList.remove('visible');
      }
    });
  });

  // --- Settings panel ---
  document.getElementById('settings-btn').addEventListener('click', function() {
    document.getElementById('detail-high-btn').classList.toggle('active', state.detailMode === 'high');
    document.getElementById('detail-low-btn').classList.toggle('active', state.detailMode === 'low');
    showPanel('settings');
  });
  document.getElementById('settings-close-btn').addEventListener('click', function() {
    hidePanel('settings');
  });
  document.getElementById('detail-high-btn').addEventListener('click', function() {
    state.detailMode = 'high';
    this.classList.add('active');
    document.getElementById('detail-low-btn').classList.remove('active');
    saveBones();
  });
  document.getElementById('detail-low-btn').addEventListener('click', function() {
    state.detailMode = 'low';
    this.classList.add('active');
    document.getElementById('detail-high-btn').classList.remove('active');
    saveBones();
  });

  document.getElementById('leaderboard-btn').addEventListener('click', function() {
    showLeaderboardPanel();
    showPanel('leaderboard');
  });

  document.getElementById('leaderboard-close-btn').addEventListener('click', function() {
    hidePanel('leaderboard');
  });

  document.getElementById('guide-btn').addEventListener('click', function() {
    showPanel('guide');
  });

  document.getElementById('guide-close-btn').addEventListener('click', function() {
    hidePanel('guide');
  });

  // Delete save button (main menu trash icon)
  const deleteSaveBtn = document.getElementById('delete-save-btn');
  let deleteSaveConfirm = false;
  let deleteSaveTimeout = null;
  deleteSaveBtn.addEventListener('click', function() {
    if (!deleteSaveConfirm) {
      deleteSaveConfirm = true;
      deleteSaveBtn.textContent = 'Are you sure?';
      deleteSaveBtn.style.background = '#771122';
      deleteSaveBtn.style.borderColor = '#ff4444';
      deleteSaveTimeout = setTimeout(() => {
        deleteSaveConfirm = false;
        deleteSaveBtn.innerHTML = '&#128465; Delete Save';
        deleteSaveBtn.style.background = '';
        deleteSaveBtn.style.borderColor = '';
      }, 3000);
    } else {
      clearTimeout(deleteSaveTimeout);
      localStorage.removeItem('gameSave');
      localStorage.removeItem('crittorsBones');
      window.location.reload();
    }
  });
}
