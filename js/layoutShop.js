// --- Layout Shop (Bones Shop) Panel ---
// Extracted from main.js — pure DOM UI, no PIXI dependencies.

import state from './state.js';
import { saveBones } from './save.js';
import { skinCatalog } from './skins.js';
import { showLeaderboardPanel } from './leaderboard.js';
import { initRewardedAds, showRewardedAd, getAdCooldownRemaining } from './rewardedAd.js';

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
  { id: 'shield',     icon: '🛡️', name: 'Shield',          costPer: 10, suffix: 'Blocks 100 dmg' },
  { id: 'bomb',       icon: '💣', name: 'Bomb',            costPer: 20, suffix: 'AoE explosion' },
  { id: 'rage',       icon: '🧃', name: 'Rage Potion',     costPer: 10, suffix: '2x damage' },
  { id: 'feather',    icon: '🪶', name: 'Phoenix Feather', costPer: 20, suffix: 'Auto-revive' },
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

  /** Refresh the always-visible equip row on each card */
  function refreshAllCardEquipRows() {
    layoutCards.forEach(card => {
      const charName = card.dataset.char;
      const row = card.querySelector('.card-equip-row');
      if (!row) return;
      refreshPreview(row, charName);
    });
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
        const cost = 8 + level * 3;
        const btn = row.querySelector('.layout-buy-btn');
        btn.dataset.cost = cost;
        btn.textContent = `🍓${cost}`;
        btn.classList.toggle('cant-afford', bones < cost);
      });
    });
    refreshAllCardEquipRows();
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
    btn.textContent = view === layoutInventoryView ? '\u2190 Back' : '\uD83D\uDEE1\uFE0F Shop';
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
    document.getElementById('layout-inventory-btn').textContent = '🛡️ Shop';
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
    const potionSVG = '<svg width="26" height="36" viewBox="0 0 28 40"><rect x="10" y="0" width="8" height="5" rx="1" fill="#8B5E3C"/><rect x="11" y="5" width="6" height="8" rx="2" fill="#cc2222" opacity="0.8"/><rect x="6" y="13" width="16" height="22" rx="4" fill="#dd2222"/><rect x="8" y="15" width="4" height="12" rx="2" fill="#ff6666" opacity="0.45"/></svg>';
    inventoryItemCatalog.forEach(item => {
      const count = state.startingItems[item.id] || 0;
      const canAfford = state.bones >= item.costPer;
      const iconHtml = item.icon === 'potion-svg' ? potionSVG : item.icon;
      const card = document.createElement('div');
      card.className = 'shop-card';
      const desc = item.suffix ? `<div class="shop-card-desc">${item.suffix}</div>` : '';
      card.innerHTML =
        `<div class="shop-card-icon">${iconHtml}${count > 0 ? `<span class="shop-card-qty">x${count}</span>` : ''}</div>` +
        `<div class="shop-card-name">${item.name}</div>` +
        desc +
        `<button class="shop-card-buy${canAfford ? '' : ' cant-afford'}"><span class="shop-card-price">\uD83C\uDF53 ${item.costPer}</span></button>`;
      card.querySelector('.shop-card-buy').addEventListener('click', () => {
        if (state.bones < item.costPer) return;
        state.bones -= item.costPer;
        state.startingItems[item.id] = (state.startingItems[item.id] || 0) + 1;
        saveBones();
        updateLayoutUI();
        renderInventoryGrid();
      });
      grid.appendChild(card);
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

  // --- Cosmetic equipped preview: hat canvas + skin label ---

  function _hexCSS(hex, a) {
    return a !== undefined
      ? `rgba(${(hex>>16)&0xFF},${(hex>>8)&0xFF},${hex&0xFF},${a})`
      : `rgb(${(hex>>16)&0xFF},${(hex>>8)&0xFF},${hex&0xFF})`;
  }

  function _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
    else {
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    }
  }

  /** Draw a hat shape centered at the current canvas origin */
  function _drawHatShape(ctx, hatId) {
    if (hatId === 'tophat') {
      ctx.fillStyle = _hexCSS(0x1a1a2e);
      _rr(ctx, -30, -5, 60, 10, 4); ctx.fill();
      _rr(ctx, -20, -48, 40, 45, 5); ctx.fill();
      ctx.fillStyle = _hexCSS(0x8b0000); ctx.fillRect(-20, -13, 40, 7);
    } else if (hatId === 'partyhat') {
      ctx.scale(1.3, 1.3);
      ctx.fillStyle = _hexCSS(0x0070DD);
      _rr(ctx, -42, -3, 84, 16, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-42,-3); ctx.lineTo(-32,-22); ctx.lineTo(-21,-3);
      ctx.lineTo(-11,-22); ctx.lineTo(0,-3); ctx.lineTo(11,-22);
      ctx.lineTo(21,-3); ctx.lineTo(32,-22); ctx.lineTo(42,-3);
      ctx.closePath(); ctx.fill();
    } else if (hatId === 'crown') {
      ctx.fillStyle = _hexCSS(0xFFD700);
      _rr(ctx, -32, -2, 64, 14, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-32,-2); ctx.lineTo(-24,-28); ctx.lineTo(-16,-6);
      ctx.lineTo(-8,-32); ctx.lineTo(0,-6); ctx.lineTo(8,-34);
      ctx.lineTo(16,-6); ctx.lineTo(24,-28); ctx.lineTo(32,-2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = _hexCSS(0xff2244);
      ctx.beginPath(); ctx.arc(-24,-26,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = _hexCSS(0x2266ff);
      ctx.beginPath(); ctx.arc(-8,-30,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = _hexCSS(0xff2244);
      ctx.beginPath(); ctx.arc(8,-32,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = _hexCSS(0x2266ff);
      ctx.beginPath(); ctx.arc(24,-26,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = _hexCSS(0x22dd66);
      ctx.beginPath(); ctx.arc(0,5,5,0,Math.PI*2); ctx.fill();
    } else if (hatId === 'wizardhat') {
      ctx.fillStyle = _hexCSS(0x6A0DAD);
      ctx.beginPath(); ctx.ellipse(0,0,42,10,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-28,0); ctx.lineTo(-4,-70); ctx.lineTo(8,-72);
      ctx.lineTo(28,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = _hexCSS(0xFFD700); ctx.globalAlpha = 0.8;
      ctx.fillRect(-26, -8, 52, 8); ctx.globalAlpha = 1;
      ctx.fillStyle = _hexCSS(0xFFD700);
      ctx.beginPath();
      const sx = 2, sy = -36;
      ctx.moveTo(sx,sy-12); ctx.lineTo(sx+4,sy-4); ctx.lineTo(sx+12,sy-3);
      ctx.lineTo(sx+6,sy+3); ctx.lineTo(sx+8,sy+11); ctx.lineTo(sx,sy+6);
      ctx.lineTo(sx-8,sy+11); ctx.lineTo(sx-6,sy+3); ctx.lineTo(sx-12,sy-3);
      ctx.lineTo(sx-4,sy-4); ctx.closePath(); ctx.fill();
    } else if (hatId === 'viking') {
      ctx.fillStyle = _hexCSS(0x8899AA);
      ctx.beginPath(); ctx.ellipse(0,-14,30,22,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = _hexCSS(0x556677);
      _rr(ctx, -4,-12,8,24,2); ctx.fill();
      _rr(ctx, -32,-4,64,10,3); ctx.fill();
      ctx.fillStyle = _hexCSS(0xAABBCC);
      for (const rx of [-22,-10,10,22]) { ctx.beginPath(); ctx.arc(rx,1,3,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle = _hexCSS(0xE8D5A0);
      ctx.beginPath(); ctx.moveTo(-26,-8); ctx.lineTo(-38,-30); ctx.lineTo(-50,-52);
      ctx.lineTo(-44,-54); ctx.lineTo(-34,-34); ctx.lineTo(-22,-14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(26,-8); ctx.lineTo(38,-30); ctx.lineTo(50,-52);
      ctx.lineTo(44,-54); ctx.lineTo(34,-34); ctx.lineTo(22,-14); ctx.closePath(); ctx.fill();
    } else if (hatId === 'halo') {
      ctx.strokeStyle = _hexCSS(0xFFD700, 0.2); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0,-38,34,9,0,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = _hexCSS(0xFFD700, 0.9); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0,-38,28,7,0,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = _hexCSS(0xFFF4B0, 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0,-38,22,5,0,0,Math.PI*2); ctx.stroke();
    }
  }

  /** Render a standalone hat shape on a small canvas */
  function renderHatCanvas(hatId) {
    if (!hatId) return null;
    const cvs = document.createElement('canvas');
    cvs.width = 80; cvs.height = 56;
    cvs.className = 'preview-hat-canvas';
    const ctx = cvs.getContext('2d');
    ctx.save();
    ctx.translate(cvs.width / 2, cvs.height * 0.8);
    ctx.scale(0.55, 0.55);
    _drawHatShape(ctx, hatId);
    ctx.restore();
    return cvs;
  }

  /** Build the hat + skin equipped indicator inside the preview div */
  function refreshPreview(previewDiv, charName) {
    previewDiv.innerHTML = '';

    // -- Hat box --
    const hatBox = document.createElement('div');
    hatBox.className = 'equip-box';
    const hatHead = document.createElement('div');
    hatHead.className = 'equip-box-label';
    hatHead.textContent = 'Hat';
    hatBox.appendChild(hatHead);
    const hatId = state.equippedHats[charName];
    if (hatId) {
      const cvs = renderHatCanvas(hatId);
      if (cvs) hatBox.appendChild(cvs);
      const hat = hatCatalog.find(h => h.id === hatId);
      if (hat) {
        const nm = document.createElement('div');
        nm.className = 'equip-box-name';
        nm.textContent = hat.name;
        hatBox.appendChild(nm);
      }
    } else {
      const empty = document.createElement('div');
      empty.className = 'equip-box-empty';
      empty.textContent = '\u2014';
      hatBox.appendChild(empty);
    }
    previewDiv.appendChild(hatBox);

    // -- Skin box --
    const skinBox = document.createElement('div');
    skinBox.className = 'equip-box';
    const skinHead = document.createElement('div');
    skinHead.className = 'equip-box-label';
    skinHead.textContent = 'Skin';
    skinBox.appendChild(skinHead);
    const skinId = state.equippedSkins[charName];
    if (skinId) {
      const skin = skinCatalog.find(s => s.id === skinId);
      if (skin) {
        const ico = document.createElement('div');
        ico.className = 'equip-box-icon';
        ico.textContent = skin.icon;
        skinBox.appendChild(ico);
        const nm = document.createElement('div');
        nm.className = 'equip-box-name';
        nm.textContent = skin.name;
        skinBox.appendChild(nm);
      }
    } else {
      const def = document.createElement('div');
      def.className = 'equip-box-empty';
      def.textContent = 'Default';
      skinBox.appendChild(def);
    }
    previewDiv.appendChild(skinBox);
  }

  function ensurePickerLayout(container, charName) {
    let layout = container.querySelector('.inline-picker-layout');
    if (!layout) {
      container.innerHTML = '';
      layout = document.createElement('div');
      layout.className = 'inline-picker-layout';
      const preview = document.createElement('div');
      preview.className = 'inline-picker-preview';
      layout.appendChild(preview);
      const grid = document.createElement('div');
      grid.className = 'inline-picker-grid';
      layout.appendChild(grid);
      container.appendChild(layout);
    }
    const preview = layout.querySelector('.inline-picker-preview');
    refreshPreview(preview, charName);
    return layout;
  }

  function renderInlineHats(container, charName) {
    const layout = ensurePickerLayout(container, charName);
    const grid = layout.querySelector('.inline-picker-grid');
    grid.innerHTML = '';

    // Refresh preview with current hat
    const hatPreview = layout.querySelector('.inline-picker-preview');
    if (hatPreview) refreshPreview(hatPreview, charName);

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
        } else {
          state.equippedHats[charName] = equipped ? null : hat.id;
          saveBones();
        }
        updateLayoutUI();
        renderInlineHats(container, charName);
      });
      grid.appendChild(el);
    });
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
        } else {
          state.equippedSkins[charName] = equipped ? null : skin.id;
          saveBones();
        }
        updateLayoutUI();
        renderInlineSkins(container, charName);
      });
      grid.appendChild(el);
    });
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

  // --- Hearts Shop panel ---
  initRewardedAds();
  const heartsShopWatchBtn = document.getElementById('hearts-shop-watch-btn');
  const heartsShopBalanceEl = document.getElementById('hearts-shop-balance');
  const heartsShopBlockedMsg = document.getElementById('hearts-shop-blocked-msg');
  let heartsShopCooldownInterval = null;

  function updateHeartsShopUI() {
    heartsShopBalanceEl.textContent = '\uD83D\uDC97 ' + state.supporterHearts;
    const remaining = getAdCooldownRemaining();
    if (remaining > 0) {
      heartsShopWatchBtn.classList.add('on-cooldown');
      heartsShopWatchBtn.textContent = remaining + 's';
      if (!heartsShopCooldownInterval) {
        heartsShopCooldownInterval = setInterval(() => {
          const r = getAdCooldownRemaining();
          if (r <= 0) {
            clearInterval(heartsShopCooldownInterval);
            heartsShopCooldownInterval = null;
            heartsShopWatchBtn.classList.remove('on-cooldown');
            heartsShopWatchBtn.textContent = '\uD83C\uDFA5 Watch Ad \u2014 Earn 3 \uD83D\uDC97';
          } else {
            heartsShopWatchBtn.textContent = r + 's';
          }
        }, 1000);
      }
    } else {
      heartsShopWatchBtn.classList.remove('on-cooldown');
      heartsShopWatchBtn.textContent = '\uD83C\uDFA5 Watch Ad \u2014 Earn 3 \uD83D\uDC97';
    }
  }

  document.getElementById('hearts-btn').addEventListener('click', function() {
    updateHeartsShopUI();
    heartsShopBlockedMsg.classList.remove('visible');
    showPanel('hearts-shop');
  });

  document.getElementById('hearts-shop-close-btn').addEventListener('click', function() {
    hidePanel('hearts-shop');
  });

  heartsShopWatchBtn.addEventListener('click', function() {
    if (getAdCooldownRemaining() > 0) return;
    heartsShopBlockedMsg.classList.remove('visible');
    showRewardedAd(
      () => {
        state.supporterHearts += 3;
        saveBones();
        updateLayoutUI();
        updateHeartsShopUI();
      },
      (info) => {
        if (info && info.blocked) {
          heartsShopBlockedMsg.classList.add('visible');
        }
      }
    );
  });

  // --- Privacy policy panel ---
  document.getElementById('privacy-policy-btn').addEventListener('click', function() {
    showPanel('privacy');
  });
  document.getElementById('privacy-close-btn').addEventListener('click', function() {
    hidePanel('privacy');
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
