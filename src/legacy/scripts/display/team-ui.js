function renderTeamWindow(){
  const el = document.getElementById('team-window-body');
  
  if(el) el.classList.add('team-view');
  if(!el) return;
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();

  if(G.team.length === 0){
    el.innerHTML = `<div class="extracted-template-style-108">
      ${t('team_empty')}<br><br>
      ${!G.starter ? `<button class="hbtn" data-action="legacy-call" data-call="chooseStarter" data-call-args="">${t('choose_starter')}</button>` : t('explore_routes')}
    </div>`;
    return;
  }

  const battleLockBanner = battle.active
    ? `<div class="extracted-template-style-109 battle-lock-banner"><span>${t('battle_lock_team')}</span></div>`
    : '';

  const teamCardsHtml = G.team.map((p, i) => {
    if((p.xp || 0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
    if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);

    const itemClickHandler = `openItemSelector(${i})`;

    return generatePokeCardHTML(p, i, {
      isActive: false,
      isFainted: false,
      showMoves: true,
      showXP: true,
      showStatus: false,
      movesAsBars: false,
      onRightClickSprite: `openPokeModal(${i})`,
      onLeftClickSprite: `onTeamCardClick(event, ${i})`,
      onLeftClickItem: itemClickHandler,
    });
  }).join('');

  const addCardHtml = G.team.length < 6 ? `
    <div class="extracted-template-style-110"
         data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'team'">
      <div class="extracted-template-style-111">+</div>
      <div class="extracted-template-style-112">${t('add_pokemon')}</div>
      <div class="extracted-template-style-113">${tr('team_count', {count:G.team.length})}</div>
    </div>
  ` : '';
  el.innerHTML = renderTeamPresetsToolbar() + battleLockBanner + teamCardsHtml + addCardHtml;
  
  
  addTeamDragAndDrop();
  addLongPressToItemBadges();
}


function renderTeamPresetsToolbar(){
    if(!G.teamPresets) G.teamPresets = {
    preset1: {name: t('preset_adventure'), uids: []},
    preset2: {name: t('preset_boss'), uids: []},
    preset3: {name: t('preset_training'), uids: []}
  };

  return `<div class="ui-control-toolbar team-toolbar"><div class="ui-toolbar-label">${t('presets_label')}</div>
    ${['preset1', 'preset2', 'preset3'].map((pk, idx) => {
      const active = G.activePresetId === pk;
      const count = (G.teamPresets[pk]?.uids || []).length;
      return `<div class="team-toolbar-group">
        ${typeof uiButtonHtml==='function' ? uiButtonHtml({label:'#' + (idx + 1) + ' (' + count + ')', call:'loadTeamFromPreset', args:`'${pk}'`, variant:'tool', active:active}) : `<button class="hbtn" data-action="legacy-call" data-call="loadTeamFromPreset" data-call-args="'${pk}'">#${idx + 1} (${count})</button>`}
        ${typeof uiButtonHtml==='function' ? uiButtonHtml({label:t('save_short') || 'Save', icon:(typeof getIcon==='function'?getIcon('save',14):''), call:'saveCurrentTeamToPreset', args:`'${pk}'`, variant:'icon', extraClass:'team-preset-save-btn'}) : `<button class="hbtn team-preset-save-btn" data-action="legacy-call" data-call="saveCurrentTeamToPreset" data-call-args="'${pk}'">${typeof getIcon==='function'?getIcon('save',14):'S'}</button>`}
      </div>`;
    }).join('')}
  </div>`;
}

function renderPokeCard(p, i){
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  if((p.xp || 0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
  if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);

  return generatePokeCardHTML(p, i, {
    isActive: false,
    isFainted: p.currentHP <= 0,
    showMoves: true,
    showXP: true,
    movesAsBars: false,
    onRightClickSprite: `openPokeModal(${i})`,
    onLeftClickSprite: `onTeamCardClick(event, ${i})`,
  });
}


function openItemSelector(teamIdx){
  openFullscreenPanel('inventory');
  setTimeout(() => showItemSelectorForPokemon(teamIdx), 200);
}


function showItemSelectorForPokemon(teamIdx){
    const p = G.team[teamIdx];
  if(!p) return;
  const fsContent = document.getElementById('fs-panel-content');
  if(!fsContent) return;
  
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(teamIdx) : p.heldItem;
  const entries = Object.entries(G.inventory).filter(([k,v]) => v > 0 && ITEMS[k] && ITEMS[k].buff);
  
  let html = `<div class="extracted-template-style-118">
    <div>
      <div class="extracted-template-style-119">${p.name} Nv.${p.level}</div>
      <div class="extracted-template-style-007">${t('equipped_item_label')}: ${currentKey ? getItemName(currentKey) : t('none')}</div>
    </div>
  </div>`;
  
  if(entries.length === 0){
    html += `<div class="extracted-template-style-120">${t('no_equippable_item')}</div>`;
  } else {
    html += entries.map(([key, qty]) => {
      const itm = ITEMS[key];
      const capped = Math.min(BAG_MAX, qty);
      const ratio = capped / BAG_MAX;
      const buffLines = Object.entries(itm.buff).map(([s, mx]) => {
        const label = {atk:t('stat_atk'),def:t('stat_def'),spe:t('stat_spe'),hpMax:t('stat_hp'),spa:t('stat_spa'),spd:t('stat_spd')}[s] || s;
        return `${label} +${Math.round(mx*ratio*100)}%`;
      }).join(' · ');
      const equipped = itemEquippedOnTeam(key);
      const lockedByOther = equipped && equipped !== p;
      return `<div class="inv-item ${lockedByOther?'is-disabled':''}" ${lockedByOther?'':`data-action="legacy-call" data-call="equipItemDirect" data-call-args="${teamIdx}, '${key}'"`} title="${lockedByOther?`Déjà équipé par ${equipped.name}`:''}">
        <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
        <div class="extracted-template-style-088">
          <div class="inv-name">${getItemName(key)}</div>
          <div class="inv-desc">${buffLines}</div>
          ${lockedByOther ? `<div class="extracted-template-style-007">Déjà équipé par ${equipped.name}</div>` : ''}
        </div>
        <div class="inv-qty">&times;${qty}</div>
      </div>`;
    }).join('');
  }
  
  html += `<div class="extracted-template-style-121">
    <button class="hbtn extracted-template-style-122" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">${t('cancel')}</button>
    ${currentKey ? `<button class="hbtn extracted-template-style-123" data-action="legacy-call" data-call="removeItemFromPokemon" data-call-args="${teamIdx}">${t('remove')}</button>` : ''}
  </div>`;
  
  fsContent.innerHTML = html;
}

function equipItemDirect(teamIdx, key){
  const p = G.team[teamIdx];
  if(!p) return;
  if(!ITEMS[key] || !ITEMS[key].buff) return;
  if(!(G.inventory[key] > 0)) return;
  const alreadyEquipped = itemEquippedOnTeam(key);
  if(alreadyEquipped && alreadyEquipped !== p){
    notify(`${getItemName(key)} est déjà équipé par ${alreadyEquipped.name}.`, 'var(--red)');
    showItemSelectorForPokemon(teamIdx);
    return;
  }
  if(typeof setTeamSlotItem === 'function') setTeamSlotItem(teamIdx, key);
  else p.heldItem = key;
  saveGame();
  renderTeamWindow();
  closeFullscreenPanel();
  notify(tr('holding_item', {name:p.name, item:getItemName(key)}), 'var(--green)');
}

function removeItemFromPokemon(teamIdx){
  const p = G.team[teamIdx];
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(teamIdx) : (p && p.heldItem);
  if(!p || !currentKey) return;
  if(typeof clearTeamSlotItem === 'function') clearTeamSlotItem(teamIdx);
  else p.heldItem = null;
  saveGame();
  renderTeamWindow();
  closeFullscreenPanel();
  notify(tr('holding_nothing', {name:p.name}), 'var(--light1)');
}


function unequipItemFromPokemon(idx){
  const p = G.team[idx];
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(idx) : (p && p.heldItem);
  if(!p || !currentKey) return;
  const itemName = getItemName(currentKey);
  if(typeof clearTeamSlotItem === 'function') clearTeamSlotItem(idx);
  else p.heldItem = null;
  saveGame();
  renderTeamWindow();
  document.getElementById('poke-modal').classList.remove('open');
  notify(tr('item_removed_from', {item:itemName, name:p.name}), 'var(--light1)');
}


function unequipItemFromBox(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p || !p.heldItem) return;
  const itemName = getItemName(p.heldItem);
  p.heldItem = null;
  saveGame();
  document.getElementById('poke-modal').classList.remove('open');
  notify(tr('item_removed_from', {item:itemName, name:p.name}), 'var(--light1)');
}


function removeItemFromTeamByName(key){
  let removed = false;
  if(typeof ensureTeamSlotItems === 'function') ensureTeamSlotItems();
  if(Array.isArray(G.teamSlotItems)){
    for(let i=0;i<G.teamSlotItems.length;i++){
      if(G.teamSlotItems[i] === key){ G.teamSlotItems[i] = null; removed = true; }
    }
    if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  }
  G.team.forEach(p => {
    if(p && p.heldItem === key){
      p.heldItem = null;
      removed = true;
    }
  });
  if(removed){
    saveGame();
    renderTeamWindow();
    closeFullscreenPanel();
    notify(tr('item_removed_team', {item:getItemName(key)}), 'var(--light1)');
  }
}


function addLongPressToItemBadges(){
  setTimeout(() => {
    document.querySelectorAll('.poke-item-badge').forEach(badge => {
      if(badge.dataset.longPressAdded) return;
      badge.dataset.longPressAdded = 'true';
      let timer;
      badge.addEventListener('touchstart', function(e) {
        timer = setTimeout(() => {
          e.preventDefault();
          const key = this.dataset.itemKey;
          if(key) openItemInfo(key);
        }, 500);
      });
      badge.addEventListener('touchend', () => clearTimeout(timer));
      badge.addEventListener('touchmove', () => clearTimeout(timer));
    });
  }, 100);
}

function aliveCount(){ return G.team.filter(p => p.currentHP > 0).length; }
function firstAlive(){ return G.team.findIndex(p => p.currentHP > 0); }


function addTeamDragAndDrop() {
  const teamEl = document.getElementById('team-window-body');
  if (!teamEl) return;
  const cards = teamEl.querySelectorAll('.poke-card');
  cards.forEach((card, idx) => {
    card.setAttribute('data-team-idx', idx);
    card.addEventListener('mousedown', (ev) => teamMouseDown(ev, idx));
    card.addEventListener('mouseup', (ev) => teamMouseUp(ev));
    card.addEventListener('dragstart', (ev) => teamDragStart(ev, idx));
    card.addEventListener('dragover', (ev) => teamDragOver(ev));
    card.addEventListener('dragleave', (ev) => teamDragLeave(ev));
    card.addEventListener('drop', (ev) => teamDrop(ev, idx));
  });
}


let _teamDragIdx = null;
let _teamLongPressTimer = null;
let _teamLongPressReady = false;
const TEAM_DRAG_DELAY = 400; 

function teamMouseDown(ev, idx) {
  
  if (ev.button !== 0) return;
  _teamLongPressReady = false;
  _teamDragIdx = idx;
  _teamLongPressTimer = setTimeout(() => {
    _teamLongPressReady = true;
    
    if (ev.currentTarget) {
      ev.currentTarget.setAttribute('draggable', 'true');
      ev.currentTarget.style.opacity = '0.6';
      ev.currentTarget.style.cursor = 'grabbing';
    }
  }, TEAM_DRAG_DELAY);
}

function teamMouseUp(ev) {
  clearTimeout(_teamLongPressTimer);
  _teamLongPressTimer = null;
  if (ev.currentTarget) {
    
    if (!_teamLongPressReady) {
      ev.currentTarget.removeAttribute('draggable');
    }
    ev.currentTarget.style.opacity = '';
    ev.currentTarget.style.cursor = '';
  }
}

function teamDragStart(ev, idx) {
  clearTimeout(_teamLongPressTimer);
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', String(idx));
  
  try {
    const rect = ev.currentTarget.getBoundingClientRect();
    ev.dataTransfer.setDragImage(ev.currentTarget, rect.width / 2, rect.height / 2);
  } catch(e) {}
}

function teamDragOver(ev) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.style.borderColor = 'var(--light2)';
  ev.currentTarget.style.boxShadow = '0 0 15px rgba(236,222,183,0.6)';
}

function teamDragLeave(ev) {
  ev.currentTarget.style.borderColor = '';
  ev.currentTarget.style.boxShadow = '';
}

function teamDrop(ev, targetIdx) {
  ev.preventDefault();
  ev.currentTarget.style.borderColor = '';
  ev.currentTarget.style.boxShadow = '';
  ev.currentTarget.style.opacity = '';
  ev.currentTarget.style.cursor = '';
  
  if (_teamDragIdx === null || _teamDragIdx === targetIdx) return;
  
  
  const sourceIdx = _teamDragIdx;
  const temp = G.team[sourceIdx];
  G.team[sourceIdx] = G.team[targetIdx];
  G.team[targetIdx] = temp;
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  
  _teamDragIdx = null;
  _teamLongPressReady = false;
  saveGame();
  renderTeamWindow();
}

