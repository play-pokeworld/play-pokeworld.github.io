// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
function renderTeamWindow(){
  const el = document.getElementById('team-window-body');
  
  if(el) el.classList.add('team-view');
  if(!el) return;
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();

  if(G.team.length === 0){
    _pwSetHtmlSafe(el, `<div class="pw-empty-state">
      ${t('team_empty')}<br><br>
      ${!G.starter ? `<button class="hbtn" data-action="legacy-call" data-call="chooseStarter" data-call-args="">${t('choose_starter')}</button>` : t('explore_routes')}
    </div>`);
    return;
  }

  const battleLockBanner = battle.active
    ? `<div class="pw-alert battle-lock-banner"><span>${t('battle_lock_team')}</span></div>`
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
      movesDraggable: !(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()),
      onRightClickSprite: `openPokeModal(${i})`,
      onLeftClickSprite: `onTeamCardClick(event, ${i})`,
      onLeftClickItem: itemClickHandler,
    });
  }).join('');

  const addCardHtml = G.team.length < 6 ? `
    <div class="pw-drop-zone"
         data-action="legacy-call" data-call="openAddToTeamSelector" data-call-args="">
      <div class="pw-text-lg">+</div>
      <div class="pw-text-sm pw-light2 pw-bold">${t('add_pokemon')}</div>
      <div class="pw-text-sm pw-light1">${tr('team_count', {count:G.team.length})}</div>
    </div>
  ` : '';
  _pwSetHtmlSafe(el, renderTeamPresetsToolbar() + battleLockBanner + teamCardsHtml + addCardHtml);
  
  
  addTeamDragAndDrop();
  addLongPressToItemBadges();
  installMoveDragDrop();
}


function resolvePresetPoke(uid){
 // Passe 26 : résout un uid de preset → Pokémon (équipe puis boîte PC).
 const inTeam=(G.team||[]).find(p=>p&&p.uid===uid); if(inTeam) return {p:inTeam, here:'team'};
 for(const k in (G.collection||{})){ const c=G.collection[k]; if(c&&c.uid===uid) return {p:c, here:'box'}; }
 return null;
}
function renderTeamPresetsToolbar(){
  if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
  // Passe 27 : la barre des 3 presets devient UN bouton vers le gestionnaire
  // d'équipes (20 emplacements, renommage, aperçu, éditeur complet).
  {
  const _ap = (G.teamPresets && G.activePresetId && G.teamPresets[G.activePresetId]) || null;
  const _sub = _ap ? ` ${_ap.name} (${(_ap.uids||[]).length}/6)` : '';
  return `<div class="ui-control-toolbar team-toolbar"><div class="ui-toolbar-label">${t('presets_label')}</div>
    <button class="hbtn team-presets-open-btn" data-action="legacy-call" data-call="openPresetManager" data-call-args="">🗂 ${t('teams_manager_open')}<span class="team-preset-active">${_sub}</span></button>
  </div>`;
  }

  if(false){

  return `<div class="ui-control-toolbar team-toolbar"><div class="ui-toolbar-label">${t('presets_label')}</div>
    ${['preset1', 'preset2', 'preset3'].map((pk, idx) => {
      const active = G.activePresetId === pk;
      const uids = (G.teamPresets[pk]?.uids || []);
      const count = uids.length;
      // Passe 26 : PRÉVISUALISATION du preset — puce sprite par membre
      // (grisée si le Pokémon est en boîte, « ? » s'il est introuvable).
      const chips = count ? uids.slice(0, 6).map(uid => {
        const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
        if(!found) return `<span class="preset-chip missing" title="${t('preset_missing_hint')||'Pokémon introuvable'}">?</span>`;
        const nm = (typeof getPokeName==='function'?getPokeName(found.p.id):(found.p.name||''));
        const ttl = `${nm} Nv.${found.p.level||1}${found.here==='box' ? ' · ' + (t('box_pc_location')||'Boîte') : ''}`;
        return `<span class="preset-chip ${found.here==='box'?'in-box':''}" title="${ttl}">${spriteImg(found.p.id, found.p.emoji, {size:20, shiny:!!found.p.shinyActive})}</span>`;
      }).join('') : `<span class="preset-chip-empty">${t('preset_empty')||'Vide'}</span>`;
      return `<div class="team-toolbar-group team-preset-group">
        <div class="team-preset-btns">
        ${typeof uiButtonHtml==='function' ? uiButtonHtml({label:'#' + (idx + 1) + ' (' + count + ')', call:'loadTeamFromPreset', args:`'${pk}'`, variant:'tool', active:active}) : `<button class="hbtn" data-action="legacy-call" data-call="loadTeamFromPreset" data-call-args="'${pk}'">#${idx + 1} (${count})</button>`}
        ${typeof uiButtonHtml==='function' ? uiButtonHtml({label:t('save_short') || 'Save', icon:(typeof getIcon==='function'?getIcon('save',14):''), call:'saveCurrentTeamToPreset', args:`'${pk}'`, variant:'icon', extraClass:'team-preset-save-btn'}) : `<button class="hbtn team-preset-save-btn" data-action="legacy-call" data-call="saveCurrentTeamToPreset" data-call-args="'${pk}'">${typeof getIcon==='function'?getIcon('save',14):'S'}</button>`}
        </div>
        <div class="team-preset-chips">${chips}</div>
      </div>`;
    }).join('')}
  </div>`;
  }
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
    movesDraggable: !(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()),
    onRightClickSprite: `openPokeModal(${i})`,
    onLeftClickSprite: `onTeamCardClick(event, ${i})`,
  });
}


function openItemSelector(teamIdx){
  // Passe 17 : pas d'échange d'objet pendant un combat
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
  // Set equip callback so clicking an item auto-equips
  window._equipCallback = function(key) {
    equipItemDirect(teamIdx, key);
  };
  window._isEquipOpen = true;
  // Passe 18 : le sélecteur est rendu IMMÉDIATEMENT après l'ouverture du
  // panneau (le rendu du sac est synchrone) — fini la fenêtre de 200 ms
  // pendant laquelle un clic tombait sur la liste brute du sac.
  openFullscreenPanel('inventory');
  showItemSelectorForPokemon(teamIdx);
}


// Passe 25 : ouvre la fiche d'info d'un objet DEPUIS le sélecteur
// d'équipement — la source « retour » mémorisée est ce sélecteur, donc le
// bouton retour (et la croix) rouvrent le choix d'objet plutôt que le sac.
// L'indication _pwEquipInfoFrom est posée AVANT l'ouverture : pwInfoCaptureSource
// la lit pendant la construction du panneau → libellé ET comportement corrects.
function openItemInfoFromEquip(key, teamIdx){
  window._pwEquipInfoFrom = Number(teamIdx);
  try { if(typeof openItemInfo === 'function') openItemInfo(key); }
  finally { window._pwEquipInfoFrom = null; }
  // Filet de sécurité : la source doit rester le sélecteur même si la
  // capture n'a pas tourné (panneau déjà construit, DOM partiel…).
  if(!window._pwInfoSource || window._pwInfoSource.kind !== 'equip-select'){
    window._pwInfoSource = { kind: 'equip-select', teamIdx: Number(teamIdx) };
  }
}

function showItemSelectorForPokemon(teamIdx){
    const p = G.team[teamIdx];
  if(!p) return;
  const fsContent = document.getElementById('fs-panel-content');
  if(!fsContent) return;
  
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(teamIdx) : p.heldItem;
  // Passe 18 : filtre unique via isHeldEquippableItem (type 'held' ou buff
  // legacy). Avant, le filtre incluait des objets non tenables (pierres…)
  // et la ligne `Object.entries(itm.buff)` PLANTAIT sur tout objet sans
  // propriété buff — le sélecteur n'apparaissait jamais et les clics
  // suivants tombaient sur la liste brute du sac.
  const isEquippable = (typeof isHeldEquippableItem === 'function')
    ? isHeldEquippableItem
    : (k) => { const it = ITEMS[k]; return !!(it && (it.type === 'held' || it.buff)); };
  const entries = (G && G.inventory) ? Object.entries(G.inventory).filter(([k,v]) => v > 0 && ITEMS[k] && isEquippable(k)) : [];
  
  let html = `<div class="pw-row-between">
    <div>
      <div class="pw-text-md pw-bold pw-light1">${typeof getPokeName==='function'?getPokeName(p.id):p.name} Nv.${p.level}</div>
      <div class="pw-text-sm pw-light1">${t('equipped_item_label')}: ${currentKey ? getItemName(currentKey) : t('none')}</div>
    </div>
  </div>`;
  
  if(entries.length === 0){
    html += `<div class="pw-empty-state">${t('no_equippable_item')}</div>`;
  } else {
    html += entries.map(([key, qty]) => {
      const itm = ITEMS[key];
      // Passe 18 : lignes de buff legacy UNIQUEMENT si l'objet en possède
      // (plus aucun objet moderne n'utilise ce système) — sinon description.
      let buffLines = '';
      if(itm.buff){
        const capped = Math.min(25, qty);
        const ratio = capped / 25;
        buffLines = Object.entries(itm.buff).map(([s, mx]) => {
          const label = {atk:t('stat_atk'),def:t('stat_def'),spe:t('stat_spe'),hpMax:t('stat_hp'),spa:t('stat_spa'),spd:t('stat_spd')}[s] || s;
          return `${label} +${Math.round(mx*ratio*100)}%`;
        }).join(' · ');
      }
      const equipped = itemEquippedOnTeam(key);
      const lockedByOther = equipped && equipped !== p;
      const descText = buffLines.length ? buffLines : (typeof getItemDesc === 'function' ? getItemDesc(key) : '');
      // Passe 25 : le clic droit rouvre la fiche d'info de l'objet via le
      // wrapper openItemInfoFromEquip, qui mémorise CE sélecteur comme source
      // — le bouton retour de la fiche ramène ici (et non au sac global).
      return `<div class="inv-item ${lockedByOther?'is-disabled':''}" ${lockedByOther?'':`data-action="legacy-call" data-call="equipItemDirect" data-call-args="${teamIdx}, '${key}'"`} data-context-call="openItemInfoFromEquip" data-context-args="'${key}', ${teamIdx}" title="${lockedByOther?`${typeof t==='function'?t('already_equipped_by'):'Déjà équipé par'} ${equipped.name}`:''}">
        <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
        <div class="pw-flex-1">
          <div class="inv-name">${getItemName(key)}</div>
          <div class="inv-desc">${descText}</div>
          ${lockedByOther ? `<div class="pw-text-sm pw-light1">${typeof t==='function'?t('already_equipped_by'):'Already equipped by'} ${equipped.name}</div>` : ''}
        </div>
        <div class="inv-qty">&times;${qty}</div>
      </div>`;
    }).join('');
  }
  
  html += `<div class="pw-btn-group">
    <button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">${t('cancel')}</button>
    ${currentKey ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="removeItemFromPokemon" data-call-args="${teamIdx}">${t('remove')}</button>` : ''}
  </div>`;
  
  _pwSetHtmlSafe(fsContent, html);
  // Vue fraîche : on repart en haut du panneau (et on invalide toute
  // restauration différée héritée du rendu du sac juste avant).
  if(typeof pwResetScrollNow === 'function') pwResetScrollNow(fsContent);
  else fsContent.scrollTop = 0;
}

function equipItemDirect(teamIdx, key){
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
  const p = G.team[teamIdx];
  if(!p) return;
  // Passe 18 : on vérifie que l'objet est TENABLE (type 'held' ou buff
  // legacy) au lieu d'exiger un `.buff` — le système buff n'existe plus,
  // donc TOUT équipement échouait silencieusement avant cette passe.
  const equippable = (typeof isHeldEquippableItem === 'function') ? isHeldEquippableItem(key) : !!(ITEMS[key] && (ITEMS[key].type === 'held' || ITEMS[key].buff));
  if(!ITEMS[key] || !equippable){
    if(typeof notify === 'function' && typeof tr === 'function') notify(tr('item_not_holdable', {item:(typeof getItemName==='function'?getItemName(key):key)}), 'var(--red)');
    return;
  }
  if(!(G.inventory[key] > 0)) return;
  const alreadyEquipped = itemEquippedOnTeam(key);
  if(alreadyEquipped && alreadyEquipped !== p){
    notify(tr('already_equipped_by_name', {item:getItemName(key), name:alreadyEquipped.name}), 'var(--red)');
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
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
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
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
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
  installCardDragAndDrop(document.getElementById('team-window-body'));
}

// Passe 51 : le glisser-déposer des CARTES est extrait ici pour être réutilisé
// TEL QUEL par les presets, l'Atoll et les PNJ (retour utilisateur : « le drag
// and drop de Pokémon dans les presets et le PNJ devrait être exactement le
// même que dans l'équipe et l'Atoll »). Mêmes écouteurs, même appui long,
// mêmes vignettes ; seul l'ÉCHANGE final passe par le contexte partagé.
function installCardDragAndDrop(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const cards = root.querySelectorAll('.poke-card');
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


// ── Passe 17 : glisser-déposer des ATTAQUES dans les cartes de la fenêtre
// Party (et l'onglet Équipe) — échange de positions via swapTeamMoves. ──────
let _pwMoveDrag = null; // {teamIdx, moveIdx}
// Passe 27 : fiches fantômes partagées (vignette de drag ET preview de drop).
function _pwPokeGhostData(p){
  if(!p) return {icon:'', title:'?'};
  return { icon:(typeof spriteImg==='function'?spriteImg(p.id,p.emoji,{size:26,shiny:!!p.shinyActive}):''), title:(typeof getPokeName==='function'?getPokeName(p.id):(p.name||'')), sub:'Nv.'+(p.level||1) };
}
function _pwMoveGhostData(teamIdx, moveIdx){
  const _dt=(typeof _pwDragTeam==='function')?_pwDragTeam():((typeof G!=='undefined'&&G&&G.team)?G.team:[]);
  const _dm=(_dt[teamIdx]&&_dt[teamIdx].moves)?_dt[teamIdx].moves[moveIdx]:null;
  const _dmv=_dm&&typeof MOVES!=='undefined'?MOVES[_dm.id]:null;
  if(!_dm) return {icon:'', title:'?'};
  return { icon:_dmv?'<span class="type-badge type-'+String(_dmv.type||'').toLowerCase()+'">'+(typeof getTypeName==='function'?getTypeName(_dmv.type):(_dmv.type||''))+'</span>':'', title:(typeof getMoveName==='function'?getMoveName(_dm.id):_dm.id) };
}
// ── Passe 50 : le glisser-déposer d'attaques est UNIFIÉ ──────────────────
// Retour utilisateur : « les drag & drop des attaques et Pokémon ne sont pas
// les mêmes dans le PNJ, les presets et l'équipe : garder uniquement celui de
// l'équipe afin de tout unifier ».
//
// Ce handler délégué (installé UNE fois sur document) est désormais le SEUL
// mécanisme du jeu. Les écrans qui n'éditent pas G.team (presets, PNJ,
// Atoll) déclarent simplement un CONTEXTE : d'où lire les Pokémon et quoi
// appeler pour échanger. Même geste, mêmes vignettes, mêmes previews partout.
//   pwSetMoveDragContext({ getTeam, swapMoves, swapPokes })
let _pwMoveDragCtx = null;
function pwSetMoveDragContext(ctx) { _pwMoveDragCtx = ctx || null; }
function pwClearMoveDragContext() { _pwMoveDragCtx = null; }
function _pwDragTeam() {
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.getTeam === 'function') return _pwMoveDragCtx.getTeam() || [];
  return (typeof G !== 'undefined' && G && G.team) ? G.team : [];
}
function _pwDragSwapMoves(pi, a, b) {
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.swapMoves === 'function') return _pwMoveDragCtx.swapMoves(pi, a, b);
  if (typeof swapTeamMoves === 'function') return swapTeamMoves(pi, a, b);
  return undefined;
}
function _pwDragSwapPokes(a, b) {
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.swapPokes === 'function') return _pwMoveDragCtx.swapPokes(a, b);
  if (typeof swapTeamMembers === 'function') return swapTeamMembers(a, b);
  return undefined;
}

function installMoveDragDrop() {
  // (garde : environnements sans DOM complet — tests headless)
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (document._pwMoveDragInstalled) return;
  document._pwMoveDragInstalled = true;
  document.addEventListener('dragstart', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (!el) return;
    const parts = String(el.dataset.moveDrag).split('|');
    _pwMoveDrag = { teamIdx: Number(parts[0]), moveIdx: Number(parts[1]) };
    // Passe 26 : vignette de drag unifiée pour l'attaque déplacée.
    try {
      const _dt = _pwDragTeam();
      const _dm = (_dt[_pwMoveDrag.teamIdx] && _dt[_pwMoveDrag.teamIdx].moves) ? _dt[_pwMoveDrag.teamIdx].moves[_pwMoveDrag.moveIdx] : null;
      const _dmv = _dm && typeof MOVES !== 'undefined' ? MOVES[_dm.id] : null;
      if(_dm && typeof pwApplyDragGhost === 'function'){
        pwApplyDragGhost(ev, {
          icon: _dmv ? '<span class="type-badge type-' + String(_dmv.type || '').toLowerCase() + '">' + (typeof getTypeName === 'function' ? getTypeName(_dmv.type) : (_dmv.type || '')) + '</span>' : '',
          title: (typeof getMoveName === 'function' ? getMoveName(_dm.id) : _dm.id),
        });
      }
    } catch(_){}
    try { ev.stopPropagation(); } catch (_) {}
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', el.dataset.moveDrag); } catch (_) {}
    el.classList.add('pw-move-drag-src');
  });
  document.addEventListener('dragover', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (!el || !_pwMoveDrag) return;
    const parts = String(el.dataset.moveDrag).split('|');
    if (Number(parts[0]) !== _pwMoveDrag.teamIdx) return; // même Pokémon uniquement
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    el.classList.add('pw-move-drop-hover');
    // Passe 27 : preview du résultat (attaque source ⇄ attaque cible).
    try {
      if(typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function'){
        pwDropPreviewShow(pwSwapPreviewHtml(_pwMoveGhostData(_pwMoveDrag.teamIdx,_pwMoveDrag.moveIdx), _pwMoveGhostData(_pwMoveDrag.teamIdx,Number(parts[1]))), ev.clientX||0, ev.clientY||0);
      }
    } catch(_){}
  });
  document.addEventListener('dragleave', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (el) el.classList.remove('pw-move-drop-hover');
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  });
  document.addEventListener('drop', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (!el || !_pwMoveDrag) return;
    const parts = String(el.dataset.moveDrag).split('|');
    const targetTeam = Number(parts[0]);
    if (targetTeam !== _pwMoveDrag.teamIdx) return;
    ev.preventDefault();
    ev.stopPropagation();
    _pwDragSwapMoves(_pwMoveDrag.teamIdx, _pwMoveDrag.moveIdx, Number(parts[1]));
    _pwMoveDrag = null;
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  });
  document.addEventListener('dragend', () => {
    _pwMoveDrag = null;
    try { document.querySelectorAll('.pw-move-drag-src, .pw-move-drop-hover').forEach((n) => n.classList.remove('pw-move-drag-src', 'pw-move-drop-hover')); } catch (_) {}
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  });
}


let _teamDragIdx = null;
let _teamLongPressTimer = null;
let _teamLongPressReady = false;
const TEAM_DRAG_DELAY = 400; 

function teamMouseDown(ev, idx) {
  
  if (ev.button !== 0) return;
  // Ne pas armer le drag d'une CARTE quand la cible est une attaque
  // (le drag des attaques a priorité, passe 17) ou en combat.
  if (ev.target && ev.target.closest && ev.target.closest('.poke-move')) return;
  // le gel d'ordre en combat ne s'applique qu'à l'ÉQUIPE ACTIVE (passe 51 :
  // presets / PNJ / Atoll restent réordonnables pendant un combat)
  if (!_pwMoveDragCtx && typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()) return;
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
  // Passe 26 : vignette de drag unifiée (sprite + nom + niveau), propre et
  // identique partout, au lieu de la « photo » géante de la carte.
  const _dp = _pwDragTeam()[idx] || null;   // passe 51 : équipe contextuelle
  if(_dp && typeof pwApplyDragGhost === 'function'){
    pwApplyDragGhost(ev, {
      icon: (typeof spriteImg === 'function') ? spriteImg(_dp.id, _dp.emoji, { size: 26, shiny: !!_dp.shinyActive }) : '',
      title: (typeof getPokeName === 'function' ? getPokeName(_dp.id) : (_dp.name || '')),
      sub: 'Nv.' + (_dp.level || 1),
    });
  }
}

function teamDragOver(ev) {
  if (_teamDragIdx === null) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.style.borderColor = 'var(--light2)';
  ev.currentTarget.style.boxShadow = '0 0 15px rgba(236,222,183,0.6)';
  // Passe 27 : preview du résultat — le Pokémon déplacé et la cible s'échangent.
  try {
    const _toIdx = Number(ev.currentTarget && ev.currentTarget.dataset ? ev.currentTarget.dataset.teamIdx : -1);
    if(_toIdx >= 0 && _toIdx !== _teamDragIdx && typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function'){
      pwDropPreviewShow(pwSwapPreviewHtml(_pwPokeGhostData(G.team[_teamDragIdx]), _pwPokeGhostData(G.team[_toIdx])), ev.clientX||0, ev.clientY||0);
    }
  } catch(_){}
}

function teamDragLeave(ev) {
  if (ev.relatedTarget && ev.currentTarget && ev.currentTarget.contains && ev.currentTarget.contains(ev.relatedTarget)) return; // survol interne : garder highlight + preview
  ev.currentTarget.style.borderColor = '';
  ev.currentTarget.style.boxShadow = '';
  if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
}

function teamDrop(ev, targetIdx) {
  ev.preventDefault();
  // Passe 17 : ordre de l'équipe gelé pendant un combat
  if(!_pwMoveDragCtx && typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){
    notifyTeamStructureLocked();
    ev.currentTarget.style.borderColor = '';
    ev.currentTarget.style.boxShadow = '';
    ev.currentTarget.style.opacity = '';
    ev.currentTarget.style.cursor = '';
    _teamDragIdx = null;
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
    return;
  }
  ev.currentTarget.style.borderColor = '';
  ev.currentTarget.style.boxShadow = '';
  ev.currentTarget.style.opacity = '';
  ev.currentTarget.style.cursor = '';
  // Passe 27 : la bulle de preview de drop disparaît au lâcher.
  if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  
  if (_teamDragIdx === null || _teamDragIdx === targetIdx) return;
  
  
  const sourceIdx = _teamDragIdx;
  _teamDragIdx = null;
  _teamLongPressReady = false;
  // Passe 51 : hors de l'équipe active (presets, PNJ, Atoll), l'échange est
  // délégué au CONTEXTE — le geste et les visuels restent identiques.
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.swapPokes === 'function') {
    _pwMoveDragCtx.swapPokes(sourceIdx, targetIdx);
    return;
  }
  const temp = G.team[sourceIdx];
  G.team[sourceIdx] = G.team[targetIdx];
  G.team[targetIdx] = temp;
  // Passe 16 : l'objet tenu suit le Pokémon (échangé avec lui), au lieu de
  // rester collé au numéro de slot.
  if(typeof swapTeamSlotItems === 'function') swapTeamSlotItems(sourceIdx, targetIdx);
  else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();

  saveGame();
  renderTeamWindow();
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderTeamWindow !== 'undefined' && typeof window !== 'undefined') window.renderTeamWindow = renderTeamWindow;
if (typeof renderTeamPresetsToolbar !== 'undefined' && typeof window !== 'undefined') window.renderTeamPresetsToolbar = renderTeamPresetsToolbar;
if (typeof resolvePresetPoke !== 'undefined' && typeof window !== 'undefined') window.resolvePresetPoke = resolvePresetPoke;
if (typeof renderPokeCard !== 'undefined' && typeof window !== 'undefined') window.renderPokeCard = renderPokeCard;
if (typeof openItemSelector !== 'undefined' && typeof window !== 'undefined') window.openItemSelector = openItemSelector;
if (typeof showItemSelectorForPokemon !== 'undefined' && typeof window !== 'undefined') window.showItemSelectorForPokemon = showItemSelectorForPokemon;
if (typeof openItemInfoFromEquip !== 'undefined' && typeof window !== 'undefined') window.openItemInfoFromEquip = openItemInfoFromEquip;
if (typeof equipItemDirect !== 'undefined' && typeof window !== 'undefined') window.equipItemDirect = equipItemDirect;
if (typeof removeItemFromPokemon !== 'undefined' && typeof window !== 'undefined') window.removeItemFromPokemon = removeItemFromPokemon;
if (typeof unequipItemFromPokemon !== 'undefined' && typeof window !== 'undefined') window.unequipItemFromPokemon = unequipItemFromPokemon;
if (typeof unequipItemFromBox !== 'undefined' && typeof window !== 'undefined') window.unequipItemFromBox = unequipItemFromBox;
if (typeof removeItemFromTeamByName !== 'undefined' && typeof window !== 'undefined') window.removeItemFromTeamByName = removeItemFromTeamByName;
if (typeof addLongPressToItemBadges !== 'undefined' && typeof window !== 'undefined') window.addLongPressToItemBadges = addLongPressToItemBadges;
if (typeof aliveCount !== 'undefined' && typeof window !== 'undefined') window.aliveCount = aliveCount;
if (typeof firstAlive !== 'undefined' && typeof window !== 'undefined') window.firstAlive = firstAlive;
if (typeof addTeamDragAndDrop !== 'undefined' && typeof window !== 'undefined') window.addTeamDragAndDrop = addTeamDragAndDrop;
if (typeof installMoveDragDrop !== 'undefined' && typeof window !== 'undefined') window.installMoveDragDrop = installMoveDragDrop;
if (typeof teamMouseDown !== 'undefined' && typeof window !== 'undefined') window.teamMouseDown = teamMouseDown;
if (typeof teamMouseUp !== 'undefined' && typeof window !== 'undefined') window.teamMouseUp = teamMouseUp;
if (typeof teamDragStart !== 'undefined' && typeof window !== 'undefined') window.teamDragStart = teamDragStart;
if (typeof installCardDragAndDrop !== 'undefined' && typeof window !== 'undefined') window.installCardDragAndDrop = installCardDragAndDrop;
if (typeof teamDragOver !== 'undefined' && typeof window !== 'undefined') window.teamDragOver = teamDragOver;
if (typeof teamDragLeave !== 'undefined' && typeof window !== 'undefined') window.teamDragLeave = teamDragLeave;
if (typeof teamDrop !== 'undefined' && typeof window !== 'undefined') window.teamDrop = teamDrop;



// ── Passe 49 : sélecteur d'objet tenu GÉNÉRIQUE (sac plein écran) ────────
// Retour utilisateur : « le choix d'item à mettre sur le Pokémon dans les
// presets, l'Atoll et les PNJ doit se faire comme avec les Pokémon de la team
// active, avec le sac ».
//
// openItemSelector() ci-dessus est câblé sur un index d'ÉQUIPE. Ici on ouvre
// le MÊME écran (panneau plein écran « inventaire », filtré sur les objets
// tenables par _equipCallback) mais en rendant la main via un callback libre :
// chaque appelant décide quoi faire de la clé d'objet choisie.
//   onPick(key)  : objet retenu
//   onClear()    : bouton « Retirer » (optionnel)
function openHeldItemPickerFor(label, currentKey, onPick, onClear) {
  if (typeof openFullscreenPanel !== 'function') return false;
  window._equipCallback = function (key) {
    try { if (typeof onPick === 'function') onPick(key); }
    finally { if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel(); }
  };
  window._equipPickerMeta = { label: String(label || ''), currentKey: currentKey || null, onClear: onClear || null };
  window._isEquipOpen = true;
  openFullscreenPanel('inventory');
  return true;
}

// Retire l'objet courant depuis le sélecteur générique (bouton « Retirer »).
function heldItemPickerClear() {
  const meta = window._equipPickerMeta;
  window._equipCallback = null;
  window._equipPickerMeta = null;
  if (meta && typeof meta.onClear === 'function') meta.onClear();
  if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel();
}

if (typeof window !== 'undefined') {
  window.pwSetMoveDragContext = pwSetMoveDragContext;
  window.pwClearMoveDragContext = pwClearMoveDragContext;
  window.openHeldItemPickerFor = openHeldItemPickerFor;
  window.heldItemPickerClear = heldItemPickerClear;
}
