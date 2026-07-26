// ─── Gestionnaire d'équipes (presets) — Passe 27 ─────────────────────────
// 20 presets persistants (G.teamPresets.preset1…preset20 = {name, uids[]}).
// Trois écrans :
//  1) renderPresetManager(el) — panneau plein écran listant les 20 équipes
//     (nom modifiable en ligne, chips sprites, Charger / Sauver / Modifier).
//  2) openPresetEditor(pk) — modale d'édition d'une équipe : cartes Pokémon
//     clonant la fenêtre « Équipe Active » ; changer de Pokémon (sélecteur),
//     gérer l'objet tenu (membres d'équipe uniquement), ouvrir la fiche,
//     réordonner par glisser-déposer.
//  3) Sélecteurs intégrés à la modale (Pokémon / objet) avec recherche.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };

// ── utilitaires ──────────────────────────────────────────────────────────
function _presetMax(){ return (typeof window !== 'undefined' && window.PRESET_MAX) || (typeof PRESET_MAX !== 'undefined' ? PRESET_MAX : 20); }
function _presetList(){ const out = []; for(let i = 1; i <= _presetMax(); i++) out.push('preset' + i); return out; }
function _escAttr(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function _presetChip(uid){
  const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
  if(!found) return `<span class="preset-chip missing" title="${t('preset_missing_hint')||'Pokémon introuvable'}">?</span>`;
  const nm = (typeof getPokeName==='function'?getPokeName(found.p.id):(found.p.name||''));
  const ttl = `${nm} Nv.${found.p.level||1}${found.here==='box' ? ' · ' + (t('box_pc_location')||'Boîte') : ''}`;
  return `<span class="preset-chip ${found.here==='box'?'in-box':''}" title="${_escAttr(ttl)}">${spriteImg(found.p.id, found.p.emoji, {size:20, shiny:!!found.p.shinyActive})}</span>`;
}

// ── 1) Panneau « Mes Équipes » (panneau plein écran) ─────────────────────
function renderPresetManager(el){
  if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
  const rows = _presetList().map((pk, i) => {
    const preset = G.teamPresets[pk] || {name:'', uids:[]};
    const uids = preset.uids || [];
    const active = G.activePresetId === pk;
    const chips = uids.length
      ? uids.slice(0, 6).map(_presetChip).join('') + (uids.length > 6 ? `<span class="preset-chip preset-chip-more">+${uids.length - 6}</span>` : '')
      : `<span class="preset-chip-empty">${t('preset_empty')||'Vide'}</span>`;
    return `<div class="preset-row${active?' active':''}">
      <span class="preset-row-idx">${i + 1}</span>
      <input class="preset-name-input" data-change-call="renamePreset" data-change-args="'${pk}', this.value" value="${_escAttr(preset.name)}" maxlength="24" aria-label="${_escAttr(preset.name)}">
      <div class="preset-row-chips">${chips}</div>
      <span class="preset-row-count">${uids.length}/6</span>
      <div class="preset-row-actions">
        ${active ? `<span class="preset-active-tag">${t('preset_active_tag')}</span>` : ''}
        <button class="hbtn" data-action="legacy-call" data-call="loadTeamFromPreset" data-call-args="'${pk}'">${t('preset_load_btn')}</button>
        <button class="hbtn" data-action="legacy-call" data-call="presetSaveHere" data-call-args="'${pk}'">${t('preset_save_btn')}</button>
        <button class="hbtn" data-action="legacy-call" data-call="openPresetEditor" data-call-args="'${pk}'">${t('preset_edit_btn')}</button>
      </div>
    </div>`;
  }).join('');
  _pwSetHtmlSafe(el, `<small class="preset-manager-hint">${t('presets_hint')}</small><div class="preset-list">${rows}</div>`);
}

function openPresetManager(){
  if(typeof openFullscreenPanel === 'function') openFullscreenPanel('presets');
  else renderPresetManager(document.getElementById('fs-panel-content') || document.getElementById('tab-content'));
}

function renamePreset(pk, name){
  if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
  if(!G.teamPresets[pk]) return;
  name = String(name == null ? '' : name).trim().slice(0, 24);
  if(!name) name = tr('preset_default_name', {n: Number(String(pk).replace('preset','')) || 1});
  G.teamPresets[pk].name = name;
  try{ saveGame(); }catch(_){}
  if(typeof renderTeamWindow === 'function') renderTeamWindow();
}

function presetSaveHere(pk){
  if(typeof saveCurrentTeamToPreset === 'function') saveCurrentTeamToPreset(pk);
  const el = document.getElementById('fs-panel-content');
  if(el && window._fsCurrentPanel === 'presets') renderPresetManager(el);
}

// ── 2) Éditeur d'équipe (modale, clone de l'Usine) ───────────────────────
function _editorPreset(){
  const pk = window._presetEditorOpen;
  return (pk && G.teamPresets && G.teamPresets[pk]) ? G.teamPresets[pk] : null;
}
function _editorMember(slot){
  const preset = _editorPreset();
  const uid = preset && preset.uids[slot];
  return uid ? (typeof resolvePresetPoke === 'function' ? resolvePresetPoke(uid) : null) : null;
}

function presetEditorCardHtml(pk, i){
  const uids = (G.teamPresets[pk] && G.teamPresets[pk].uids) || [];
  const uid = uids[i];
  // Emplacement vide → carte « + »
  if(uid === undefined){
    return `<div class="pw-drop-zone preset-slot-empty" data-action="legacy-call" data-call="presetEditorPick" data-call-args="${i}"><div class="pw-text-lg">+</div><div class="pw-text-sm pw-light2 pw-bold">${t('preset_add_lbl')}</div></div>`;
  }
  const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
  // Pokémon disparu → carte « ? » retirable
  if(!found){
    return `<div class="pw-drop-zone preset-slot-missing"><div class="pw-text-lg">?</div><div class="pw-text-sm pw-light2 pw-bold">${t('preset_missing_hint')||'Pokémon introuvable'}</div><button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="presetEditorRemoveMember" data-call-args="${i}">${t('preset_remove_member')}</button></div>`;
  }
  const inTeam = found.here === 'team';
  return generatePokeCardHTML(found.p, i, {
    isActive:false,
    isFainted: found.p.currentHP <= 0,
    showMoves:true,
    showXP:true,
    showStatus:false,
    movesAsBars:false,
    movesDraggable:false,
    moveInfoContextless:true,
    // Clic sprite = changer de Pokémon ; clic droit = ouvrir la fiche (modifier)
    onRightClickSprite:`presetEditorOpenInfo(${i})`,
    onLeftClickSprite:`presetEditorPick(${i})`,
    onLeftClickItem: inTeam ? `presetEditorPickItem(${i})` : '',
    spriteTitle:(typeof t === 'function' ? t('preset_editor_sprite_hint') : ''),
  });
}

function renderPresetEditor(){
  const pk = window._presetEditorOpen;
  const preset = _editorPreset();
  const inner = document.getElementById('poke-modal-inner');
  if(!inner || !preset) return false;
  const uids = preset.uids || [];
  const cards = [];
  for(let i = 0; i < Math.max(uids.length + (uids.length < 6 ? 1 : 0), 1) && i < 6; i++) cards.push(presetEditorCardHtml(pk, i));
  _pwSetHtmlSafe(inner,
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">🗂</span><div class="pw-info-head-text"><div class="pw-info-name">${_escAttr(preset.name)}</div><div class="pw-text-sm pw-light1">${t('preset_editor_sub')} · ${uids.length}/6</div></div></div><span class="modal-close" data-action="legacy-call" data-call="closePresetEditor" data-call-args=""></span></div>`
    + `<small class="atoll-prep-hint">${t('preset_editor_hint')}</small>`
    + `<div id="preset-editor-body" class="team-view">${cards.join('')}</div>`
    + `<div class="pw-btn-group"><button class="hbtn" data-action="legacy-call" data-call="presetEditorApply" data-call-args="">${t('preset_apply_btn')}</button><button class="hbtn" data-action="legacy-call" data-call="presetEditorSaveCurrent" data-call-args="">${t('preset_save_current_btn')}</button></div>`);
  installPresetEditorDragDrop();
  return true;
}

function openPresetEditor(pk){
  if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
  if(!G.teamPresets[pk]) return false;
  const modal = document.getElementById('poke-modal');
  if(!modal) return false;
  window._presetEditorOpen = pk;
  const ok = renderPresetEditor();
  if(!ok){ window._presetEditorOpen = null; return false; }
  window._pwPokeSheet = null; // ce n'est PAS une fiche d'équipe/box
  if(typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
  modal.classList.add('preset-editor-modal');
  modal.classList.add('open');
  try{ const inner = document.getElementById('poke-modal-inner'); if(inner) inner.scrollTop = 0; }catch(_){}
  return true;
}

function closePresetEditor(){
  window._presetEditorOpen = null;
  window._presetPickSlot = null;
  window._presetItemSlot = null;
  window._presetEditorReturn = null;
  const modal = document.getElementById('poke-modal');
  if(modal){ modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); }
  // Retour au gestionnaire (comme la préparation Usine retourne à l'atoll).
  openPresetManager();
}

function presetEditorApply(){
  const pk = window._presetEditorOpen;
  if(!pk) return;
  if(typeof loadTeamFromPreset === 'function') loadTeamFromPreset(pk);
  renderPresetEditor(); // la composition reste, les objets suivent l'équipe
}
function presetEditorSaveCurrent(){
  const pk = window._presetEditorOpen;
  if(!pk) return;
  if(typeof saveCurrentTeamToPreset === 'function') saveCurrentTeamToPreset(pk);
  if(window._presetEditorOpen) renderPresetEditor();
}

// Échange deux positions du preset (glisser-déposer des cartes).
function presetEditorSwap(from, to){
  const preset = _editorPreset();
  if(!preset) return;
  from = Number(from); to = Number(to);
  if(!(from >= 0) || !(to >= 0) || from >= preset.uids.length || to >= preset.uids.length || from === to) return;
  const tmp = preset.uids[from]; preset.uids[from] = preset.uids[to]; preset.uids[to] = tmp;
  try{ saveGame(); }catch(_){}
  renderPresetEditor();
}

let _presetEditDrag = null;
function installPresetEditorDragDrop(){
  const body = document.getElementById('preset-editor-body');
  if(!body || typeof body.querySelectorAll !== 'function') return;
  const cards = Array.prototype.slice.call(body.querySelectorAll('.poke-card'));
  cards.forEach((card, idx) => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', (ev) => {
      _presetEditDrag = { idx };
      ev.dataTransfer.effectAllowed = 'move';
      try{ ev.dataTransfer.setData('text/plain', String(idx)); }catch(_){}
      card.style.opacity = '0.6';
      const m = _editorMember(idx);
      if(m && typeof pwApplyDragGhost === 'function'){
        pwApplyDragGhost(ev, {
          icon:(typeof spriteImg === 'function') ? spriteImg(m.p.id, m.p.emoji, { size: 26, shiny: !!m.p.shinyActive }) : '',
          title:(typeof getPokeName === 'function' ? getPokeName(m.p.id) : (m.p.name || '')),
          sub:'Nv.' + (m.p.level || 1),
        });
      }
    });
    card.addEventListener('dragover', (ev) => {
      if(!_presetEditDrag) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      card.classList.add('atoll-prep-drag-over');
      try {
        const a = _editorMember(_presetEditDrag.idx), b = _editorMember(idx);
        if(a && b && typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function'){
          pwDropPreviewShow(pwSwapPreviewHtml(
            { icon:(typeof spriteImg==='function'?spriteImg(a.p.id,a.p.emoji,{size:26,shiny:!!a.p.shinyActive}):''), title:(typeof getPokeName==='function'?getPokeName(a.p.id):(a.p.name||'')), sub:'Nv.'+(a.p.level||1) },
            { icon:(typeof spriteImg==='function'?spriteImg(b.p.id,b.p.emoji,{size:26,shiny:!!b.p.shinyActive}):''), title:(typeof getPokeName==='function'?getPokeName(b.p.id):(b.p.name||'')), sub:'Nv.'+(b.p.level||1) }
          ), ev.clientX||0, ev.clientY||0);
        }
      } catch(_){}
    });
    card.addEventListener('dragleave', () => { card.classList.remove('atoll-prep-drag-over'); if(typeof pwDropPreviewHide==='function') pwDropPreviewHide(); });
    card.addEventListener('drop', (ev) => {
      if(!_presetEditDrag) return;
      ev.preventDefault();
      if(typeof pwDropPreviewHide==='function') pwDropPreviewHide();
      card.classList.remove('atoll-prep-drag-over');
      card.style.opacity = '';
      const from = _presetEditDrag.idx; _presetEditDrag = null;
      presetEditorSwap(from, idx);
    });
    card.addEventListener('dragend', () => {
      card.style.opacity = '';
      cards.forEach(c => c.classList.remove('atoll-prep-drag-over'));
      _presetEditDrag = null;
      if(typeof pwDropPreviewHide==='function') pwDropPreviewHide();
    });
  });
}

// Retire un membre (Pokémon disparu ou choix explicite dans le sélecteur).
function presetEditorRemoveMember(slot){
  const preset = _editorPreset();
  if(!preset) return;
  slot = Number(slot);
  if(slot >= 0 && slot < preset.uids.length){ preset.uids.splice(slot, 1); try{ saveGame(); }catch(_){} }
  renderPresetEditor();
}

// ── 3a) Sélecteur de Pokémon (dans la modale) ────────────────────────────
window._presetPickerSearch = '';
function presetEditorPick(slot){
  window._presetPickSlot = Number(slot);
  renderPresetPicker();
}
function presetPickerFilter(v){
  window._presetPickerSearch = String(v || '').toLowerCase().trim();
  renderPresetPicker();
}
function _presetPickerCandidates(){
  const preset = _editorPreset();
  const used = new Set((preset ? preset.uids : [])); used.delete(preset && preset.uids[window._presetPickSlot]);
  const out = [];
  (G.team || []).forEach((p, i) => { if(p && p.uid && !used.has(p.uid)) out.push({ p, where:'team', tag:t('preset_in_team_tag') }); });
  const boxed = Object.entries(G.collection || {}).filter(([id, p]) => p && p.uid && !used.has(p.uid));
  boxed.sort((a, b) => (Number(a[1].id) || 0) - (Number(b[1].id) || 0));
  boxed.forEach(([boxId, p]) => out.push({ p, where:'box', boxId, tag:(t('box_pc_location')||'Boîte') }));
  return out;
}
function renderPresetPicker(){
  const inner = document.getElementById('poke-modal-inner');
  const preset = _editorPreset();
  if(!inner || !preset) return;
  const q = window._presetPickerSearch || '';
  let cands = _presetPickerCandidates();
  if(q) cands = cands.filter(c => ((typeof getPokeName==='function'?getPokeName(c.p.id):(c.p.name||'')) + ' ' + c.p.id).toLowerCase().includes(q));
  const slot = window._presetPickSlot;
  const rows = cands.slice(0, 120).map((c) => {
    const nm = (typeof getPokeName==='function'?getPokeName(c.p.id):(c.p.name||''));
    const heldKey = (typeof getHeldItemForPokemon==='function' ? getHeldItemForPokemon(c.p) : c.p.heldItem) || null;
    return `<div class="inv-item preset-pick-row" data-action="legacy-call" data-call="presetEditorPickChoose" data-call-args="${slot}, '${c.p.uid}'">
      <div class="inv-icon">${spriteImg(c.p.id, c.p.emoji, {size:34, shiny:!!c.p.shinyActive})}</div>
      <div class="pw-flex-1"><div class="inv-name">${nm} <small class="pw-light1">#${c.p.id} · Nv.${c.p.level||1}</small></div>${heldKey && ITEMS[heldKey] ? `<div class="inv-desc">${getItemName(heldKey)}</div>` : ''}</div>
      <span class="preset-pick-tag ${c.where === 'box' ? 'in-box' : ''}">${c.tag}</span>
    </div>`;
  }).join('');
  const hasMember = preset.uids && preset.uids[slot] !== undefined;
  _pwSetHtmlSafe(inner,
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">🔍</span><div class="pw-info-head-text"><div class="pw-info-name">${t('preset_pick_poke_title')}</div><div class="pw-text-sm pw-light1">${_escAttr(preset.name)} · ${slot + 1}/6</div></div></div><span class="modal-close" data-action="legacy-call" data-call="renderPresetEditor" data-call-args=""></span></div>`
    + `<input class="dict-search preset-pick-search" data-action="filter-preset-picker" value="${_escAttr(q)}" placeholder="${t('preset_pick_search_ph')}">`
    + `<div class="preset-pick-list">${rows || `<div class="pw-empty-state-md">${t('box_empty_result')||'—'}</div>`}</div>`
    + `<div class="pw-btn-group">${hasMember ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="presetEditorRemoveMember" data-call-args="${slot}">${t('preset_remove_member')}</button>` : ''}<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="renderPresetEditor" data-call-args="">${t('cancel_btn')||'Annuler'}</button></div>`);
  const inp = inner.querySelector('.preset-pick-search');
  if(inp && q){ try{ inp.focus({preventScroll:true}); }catch(_){ inp.focus(); } inp.setSelectionRange(inp.value.length, inp.value.length); }
}
function presetEditorPickChoose(slot, uid){
  const preset = _editorPreset();
  if(!preset || !uid) return;
  slot = Number(slot);
  // Le Pokémon doit exister (équipe ou boîte)
  const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
  if(!found){ notify(t('preset_pokemon_not_found'), 'var(--red)'); renderPresetEditor(); return; }
  preset.uids = preset.uids.filter(u => u !== uid); // pas de doublon
  if(slot >= preset.uids.length) preset.uids.push(uid); else preset.uids.splice(slot, 1, uid);
  if(preset.uids.length > 6) preset.uids.length = 6;
  try{ saveGame(); }catch(_){}
  window._presetPickerSearch = '';
  renderPresetEditor();
}

// ── 3b) Sélecteur d'objet tenu (membres de l'équipe active uniquement) ───
function presetEditorPickItem(slot){
  const found = _editorMember(Number(slot));
  if(!found || found.here !== 'team'){ notify(t('preset_items_team_only'), 'var(--light1)'); return; }
  window._presetItemSlot = Number(slot);
  renderPresetItemPicker();
}
function renderPresetItemPicker(){
  const inner = document.getElementById('poke-modal-inner');
  const preset = _editorPreset();
  const slot = window._presetItemSlot;
  const found = _editorMember(slot);
  if(!inner || !preset || !found || found.here !== 'team'){ renderPresetEditor(); return; }
  const p = found.p;
  const teamIdx = G.team.indexOf(p);
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(teamIdx) : p.heldItem;
  const isEquippable = (typeof isHeldEquippableItem === 'function') ? isHeldEquippableItem : (k) => !!(ITEMS[k] && (ITEMS[k].type === 'held' || ITEMS[k].buff));
  const entries = Object.entries(G.inventory || {}).filter(([k, v]) => v > 0 && ITEMS[k] && isEquippable(k));
  entries.sort((a, b) => getItemName(a[0]).localeCompare(getItemName(b[0])));
  const rows = entries.map(([key, qty]) => {
    const holder = (typeof itemEquippedOnTeam === 'function') ? itemEquippedOnTeam(key) : null;
    const locked = holder && holder !== p;
    const desc = (typeof getItemDesc === 'function') ? getItemDesc(key) : '';
    return `<div class="inv-item ${locked ? 'is-disabled' : ''}" ${locked ? '' : `data-action="legacy-call" data-call="presetEditorEquipItem" data-call-args="${slot}, '${key}'"`} ${key === currentKey ? 'style="outline:1px solid var(--green);border-radius:8px;"' : ''} data-context-call="openItemInfo" data-context-args="'${key}'" title="${locked ? _escAttr((t('already_equipped_by')||'') + ' ' + holder.name) : ''}">
      <div class="inv-icon">${itemSpriteHtml(key, 34)}</div>
      <div class="pw-flex-1"><div class="inv-name">${getItemName(key)}</div><div class="inv-desc">${desc}</div>${locked ? `<div class="pw-text-sm pw-light1">${t('already_equipped_by')} ${holder.name}</div>` : ''}</div>
      <div class="inv-qty">&times;${qty}</div>
    </div>`;
  }).join('');
  const nm = (typeof getPokeName==='function'?getPokeName(p.id):(p.name||''));
  _pwSetHtmlSafe(inner,
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">${itemSpriteHtml(currentKey || '', 30)}</span><div class="pw-info-head-text"><div class="pw-info-name">${tr('preset_pick_item_title', {name: nm})}</div><div class="pw-text-sm pw-light1">${t('equipped_item_label')}: ${currentKey ? getItemName(currentKey) : t('none')}</div></div></div><span class="modal-close" data-action="legacy-call" data-call="renderPresetEditor" data-call-args=""></span></div>`
    + `<div class="preset-pick-list">${rows || `<div class="pw-empty-state-md">${t('preset_no_item')}</div>`}</div>`
    + `<div class="pw-btn-group">${currentKey ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="presetEditorClearItem" data-call-args="${slot}">${t('preset_remove_item')}</button>` : ''}<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="renderPresetEditor" data-call-args="">${t('cancel_btn')||'Annuler'}</button></div>`);
}
function presetEditorEquipItem(slot, key){
  const found = _editorMember(Number(slot));
  if(!found || found.here !== 'team' || !(G.inventory[key] > 0)) return;
  if(typeof isHeldEquippableItem === 'function' && !isHeldEquippableItem(key)){ notify(tr('item_not_holdable', {item:getItemName(key)}), 'var(--red)'); return; }
  const holder = (typeof itemEquippedOnTeam === 'function') ? itemEquippedOnTeam(key) : null;
  if(holder && holder !== found.p){ notify(tr('already_equipped_by_name', {item:getItemName(key), name:holder.name}), 'var(--red)'); renderPresetItemPicker(); return; }
  const teamIdx = G.team.indexOf(found.p);
  if(typeof setTeamSlotItem === 'function') setTeamSlotItem(teamIdx, key); else found.p.heldItem = key;
  try{ saveGame(); }catch(_){}
  notify(tr('holding_item', {name:(typeof getPokeName==='function'?getPokeName(found.p.id):found.p.name), item:getItemName(key)}), 'var(--green)');
  renderPresetEditor();
}
function presetEditorClearItem(slot){
  const found = _editorMember(Number(slot));
  if(!found || found.here !== 'team') return;
  const teamIdx = G.team.indexOf(found.p);
  if(typeof clearTeamSlotItem === 'function') clearTeamSlotItem(teamIdx); else found.p.heldItem = null;
  try{ saveGame(); }catch(_){}
  renderPresetEditor();
}

// ── 3c) Fiche du Pokémon (pour le « modifier ») ──────────────────────────
function presetEditorOpenInfo(slot){
  const found = _editorMember(Number(slot));
  if(!found) return;
  window._presetEditorReturn = window._presetEditorOpen;
  if(found.here === 'team'){
    const idx = G.team.indexOf(found.p);
    if(typeof openPokeModal === 'function') openPokeModal(idx);
  } else {
    let boxId = null;
    for(const k in (G.collection || {})){ if(G.collection[k] && G.collection[k].uid === found.p.uid){ boxId = k; break; } }
    if(boxId != null && typeof openBoxPokeModal === 'function') openBoxPokeModal(boxId);
    else window._presetEditorReturn = null;
  }
}

// --- Globals ---
if (typeof renderPresetManager !== 'undefined' && typeof window !== 'undefined') window.renderPresetManager = renderPresetManager;
if (typeof openPresetManager !== 'undefined' && typeof window !== 'undefined') window.openPresetManager = openPresetManager;
if (typeof renamePreset !== 'undefined' && typeof window !== 'undefined') window.renamePreset = renamePreset;
if (typeof presetSaveHere !== 'undefined' && typeof window !== 'undefined') window.presetSaveHere = presetSaveHere;
if (typeof openPresetEditor !== 'undefined' && typeof window !== 'undefined') window.openPresetEditor = openPresetEditor;
if (typeof renderPresetEditor !== 'undefined' && typeof window !== 'undefined') window.renderPresetEditor = renderPresetEditor;
if (typeof closePresetEditor !== 'undefined' && typeof window !== 'undefined') window.closePresetEditor = closePresetEditor;
if (typeof presetEditorApply !== 'undefined' && typeof window !== 'undefined') window.presetEditorApply = presetEditorApply;
if (typeof presetEditorSaveCurrent !== 'undefined' && typeof window !== 'undefined') window.presetEditorSaveCurrent = presetEditorSaveCurrent;
if (typeof presetEditorSwap !== 'undefined' && typeof window !== 'undefined') window.presetEditorSwap = presetEditorSwap;
if (typeof presetEditorPick !== 'undefined' && typeof window !== 'undefined') window.presetEditorPick = presetEditorPick;
if (typeof presetPickerFilter !== 'undefined' && typeof window !== 'undefined') window.presetPickerFilter = presetPickerFilter;
if (typeof presetEditorPickChoose !== 'undefined' && typeof window !== 'undefined') window.presetEditorPickChoose = presetEditorPickChoose;
if (typeof presetEditorRemoveMember !== 'undefined' && typeof window !== 'undefined') window.presetEditorRemoveMember = presetEditorRemoveMember;
if (typeof presetEditorPickItem !== 'undefined' && typeof window !== 'undefined') window.presetEditorPickItem = presetEditorPickItem;
if (typeof presetEditorEquipItem !== 'undefined' && typeof window !== 'undefined') window.presetEditorEquipItem = presetEditorEquipItem;
if (typeof presetEditorClearItem !== 'undefined' && typeof window !== 'undefined') window.presetEditorClearItem = presetEditorClearItem;
if (typeof presetEditorOpenInfo !== 'undefined' && typeof window !== 'undefined') window.presetEditorOpenInfo = presetEditorOpenInfo;
