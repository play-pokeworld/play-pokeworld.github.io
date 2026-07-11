// ============================================================
// TEAM UI — Utilise le template poke-card.css
// ============================================================
function renderTeamWindow(){
  const el = document.getElementById('team-window-body');
  // Add team-view class for CSS to hide HP bars
  if(el) el.classList.add('team-view');
  if(!el) return;

  if(G.team.length === 0){
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--light1);font-size: 13px;">
      ${t('team_empty')}<br><br>
      ${!G.starter ? `<button class="hbtn" onclick="chooseStarter()">${t('choose_starter')}</button>` : t('explore_routes')}
    </div>`;
    return;
  }

  const battleLockBanner = battle.active
    ? `<div style="background:rgba(211,66,95,0.15);border:1px solid var(--red);padding:8px;border-radius:6px;margin-bottom:8px;color:#ff8a80;font-size:13px;display:flex;align-items:center;gap:8px;">
        <span>🔒</span><span>${t('battle_lock_team')}</span>
       </div>`
    : '';

  el.innerHTML = renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p, i) => {
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
  }).join('') + (G.team.length < 6 ? `
    <div style="background:var(--dark3);border:2px dashed var(--light1);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:all 0.2s;" 
         onmouseover="this.style.background='var(--light1)';this.style.borderColor='var(--light2)';" 
         onmouseout="this.style.background='var(--dark3)';this.style.borderColor='var(--light1)';"
         onclick="openUnifiedSelectorModal('team')">
      <div style="font-size: 32px;color:var(--light2);margin-bottom:8px;">+</div>
      <div style="font-size: 13px;color:var(--light2);font-weight:bold;">Ajouter un Pokémon</div>
      <div style="font-size: 13px;color:var(--light1);margin-top:4px;">${G.team.length}/6 dans l'équipe</div>
    </div>
  ` : '');
  addLongPressToItemBadges();
}

// ============================================================
// LOCATION INFO TAB
// ============================================================

function renderTeamPresetsToolbar(){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!G.teamPresets) G.teamPresets = {
    preset1: {name: "Équipe Aventure", uids: []},
    preset2: {name: "Équipe Boss", uids: []},
    preset3: {name: "Équipe Entraînement", uids: []}
  };

  return `<div style="display:flex;align-items:center;gap:6px;background:var(--dark3);padding:8px;border-radius:6px;margin-bottom:8px;border:1px solid var(--light1);flex-wrap:wrap;">
    <span style="font-size:13px;color:var(--light2);font-weight:bold;"> ${lang === 'en' ? 'Presets:' : 'Presets :'}</span>
    ${['preset1', 'preset2', 'preset3'].map((pk, idx) => {
      const active = G.activePresetId === pk;
      const count = (G.teamPresets[pk]?.uids || []).length;
      return `<div style="display:flex;align-items:center;gap:3px;">
        <button class="hbtn" style="padding:4px 8px;font-size:13px;${active ? 'background:var(--light1);border-color:var(--light1);color:var(--dark1);' : ''}" onclick="loadTeamFromPreset('${pk}')" title="Charger ${G.teamPresets[pk]?.name}">#${idx + 1} (${count})</button>
        <button class="hbtn" style="padding:3px 6px;font-size: 13px;color:var(--light1);" onclick="saveCurrentTeamToPreset('${pk}')" title="Sauvegarder l'équipe actuelle">💾</button>
      </div>`;
    }).join('')}
  </div>`;
}

function renderPokeCard(p, i){
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

// Open item selector for team Pokemon
function openItemSelector(teamIdx){
  openFullscreenPanel('inventory');
  setTimeout(() => showItemSelectorForPokemon(teamIdx), 200);
}

// Show inventory with Cancel/Remove buttons
function showItemSelectorForPokemon(teamIdx){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const p = G.team[teamIdx];
  if(!p) return;
  const fsContent = document.getElementById('fs-panel-content');
  if(!fsContent) return;
  
  const currentKey = p.heldItem;
  const entries = Object.entries(G.inventory).filter(([k,v]) => v > 0 && ITEMS[k] && ITEMS[k].buff);
  
  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
    <div>
      <div style="font-size: 15px;font-weight:bold;color:var(--light1);">${p.name} Nv.${p.level}</div>
      <div style="font-size: 13px;color:var(--light1);">Objet équipé: ${currentKey ? getItemName(currentKey) : 'Aucun'}</div>
    </div>
  </div>`;
  
  if(entries.length === 0){
    html += `<div style="text-align:center;padding:20px;color:var(--light1);">Aucun objet équippable</div>`;
  } else {
    html += entries.map(([key, qty]) => {
      const itm = ITEMS[key];
      const capped = Math.min(BAG_MAX, qty);
      const ratio = capped / BAG_MAX;
      const buffLines = Object.entries(itm.buff).map(([s, mx]) => {
        const label = {atk:'Atk',def:'Déf',spe:'Vit',hpMax:'PV Max',spa:'Atk Spé',spd:'Déf Spé'}[s] || s;
        return `${label} +${Math.round(mx*ratio*100)}%`;
      }).join(' · ');
      const equipped = itemEquippedOnTeam(key);
      return `<div class="inv-item" onclick="equipItemDirect(${teamIdx}, '${key}')">
        <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
        <div style="flex:1">
          <div class="inv-name">${getItemName(key)}</div>
          <div class="inv-desc">${buffLines}</div>
          ${equipped && equipped !== p ? `<div style="font-size: 13px;color:var(--light1);">Sur ${equipped.name}</div>` : ''}
        </div>
        <div class="inv-qty">×${qty}</div>
      </div>`;
    }).join('');
  }
  
  html += `<div style="display:flex;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--light1);">
    <button class="hbtn" style="flex:1;padding:10px;background:var(--dark3);" onclick="closeFullscreenPanel()">${lang==='en'?'Cancel':'Annuler'}</button>
    ${currentKey ? `<button class="hbtn" style="flex:1;padding:10px;background:var(--red);" onclick="removeItemFromPokemon(${teamIdx})">${lang==='en'?'Remove':'Retirer'}</button>` : ''}
  </div>`;
  
  fsContent.innerHTML = html;
}

function equipItemDirect(teamIdx, key){
  const p = G.team[teamIdx];
  if(!p) return;
  if(!ITEMS[key] || !ITEMS[key].buff) return;
  if(!(G.inventory[key] > 0)) return;
  p.heldItem = key;
  saveGame();
  renderTeamWindow();
  closeFullscreenPanel();
  notify(`${p.name} tient ${getItemName(key)} !`, 'var(--green)');
}

function removeItemFromPokemon(teamIdx){
  const p = G.team[teamIdx];
  if(!p || !p.heldItem) return;
  p.heldItem = null;
  saveGame();
  renderTeamWindow();
  closeFullscreenPanel();
  notify(`${p.name} ne tient plus rien.`, 'var(--light1)');
}

// Retire l'objet d'un Pokémon de l'équipe et ferme le panneau
function unequipItemFromPokemon(idx){
  const p = G.team[idx];
  if(!p || !p.heldItem) return;
  const itemName = getItemName(p.heldItem);
  p.heldItem = null;
  saveGame();
  renderTeamWindow();
  document.getElementById('poke-modal').classList.remove('open');
  notify(`${itemName} retiré de ${p.name}.`, 'var(--light1)');
}

// Retire l'objet d'un Pokémon de la boîte et ferme le panneau
function unequipItemFromBox(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p || !p.heldItem) return;
  const itemName = getItemName(p.heldItem);
  p.heldItem = null;
  saveGame();
  document.getElementById('poke-modal').classList.remove('open');
  notify(`${itemName} retiré de ${p.name}.`, 'var(--light1)');
}

// Retire un item spécifique de tous les Pokémon de l'équipe (par key)
function removeItemFromTeamByName(key){
  let removed = false;
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
    notify(`${getItemName(key)} retiré de l'équipe.`, 'var(--light1)');
  }
}

// Add long-press support to item badges for mobile
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
