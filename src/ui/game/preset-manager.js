import { panelHeaderHTML } from '../components/panel-header.js';
// Phase 27 — legacy feature update
// 20 persistent presets (G.teamPresets.preset1…preset20 = {name, uids[]}).
// Three screens:
//  1) renderPresetManager(el) — fullscreen panel listing the 20 teams
//     (inline-editable name, sprite chips, Load / Save / Edit).
//  2) openPresetEditor(pk) — team edit modal: Pokemon cards cloning the
//     "Active Team" window; change Pokemon (selector), manage the held
//     item (team members only), open the sheet, reorder by drag & drop.
//  3) Selectors integrated in the modal (Pokemon / item) with search.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

// ── utilitaires ──────────────────────────────────────────────────────────
function _presetMax(){ return (typeof window !== 'undefined' && window.PRESET_MAX) || (typeof PRESET_MAX !== 'undefined' ? PRESET_MAX : 20); }
function _presetList(){ const out = []; for(let i = 1; i <= _presetMax(); i++) out.push('preset' + i); return out; }
function _escAttr(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function _presetChip(uid){
  const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
  if(!found) return `<span class="preset-chip missing" title="${t('preset_missing_hint')||'Pokémon introuvable'}">?</span>`;
  const nm = (typeof getPokeName==='function'?getPokeName(found.p.id):(found.p.name||''));
  const ttl = `${nm} Nv.${found.p.level||1}${found.here==='box' ? ' · ' + (t('box_pc_location')||'Boîte') : ''}`;
  return `<span class="preset-chip ${found.here==='box'?'in-box':''}" title="${_escAttr(ttl)}">${spriteImg(found.p.id, found.p.emoji, {size:56, shiny:!!found.p.shinyActive})}</span>`;
}

// ── 1) "My Teams" panel (fullscreen panel) ─────────────────────
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
  // Wave 28 (user): the team manager rows flow as CARDS in the canonical
  // content grid (same recipe as the validated box/bag/market/pokedex
  // layouts), not one full-width row per slot anymore.
  _pwSetHtmlSafe(el, `<small class="preset-manager-hint">${t('presets_hint')}</small><div class="preset-list pw-preset-grid">${rows}</div>`);
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

// ── 2) Editeur of team (modal, clone of the Usine) ───────────────────────
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
  // Empty slot → "+" card
  if(uid === undefined){
    return `<div class="pw-drop-zone preset-slot-empty" data-action="legacy-call" data-call="presetEditorPick" data-call-args="${i}"><div class="pw-text-lg">+</div><div class="pw-text-sm pw-light2 pw-bold">${t('preset_add_lbl')}</div></div>`;
  }
  const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
  // Missing Pokemon → removable "?" card
  if(!found){
    return `<div class="pw-drop-zone preset-slot-missing"><div class="pw-text-lg">?</div><div class="pw-text-sm pw-light2 pw-bold">${t('preset_missing_hint')||'Pokémon introuvable'}</div><button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="presetEditorRemoveMember" data-call-args="${i}">${t('preset_remove_member')}</button></div>`;
  }
  const inTeam = found.here === 'team';
  return generatePokeCardHTML(found.p, i, {
    isActive:false,
    // Phase 49 (user feedback: "all the Pokemon show up greyed"): a
    // Pokemon STORED in the box has no tracked current HP (it is
    // resting) — `currentHP <= 0` would declare it K.O. and grey the
    // card. Only ACTIVE team members have a meaningful HP state here.
    isFainted: inTeam && found.p.currentHP <= 0,
    showMoves:true,
    showXP:true,
    showStatus:false,
    movesAsBars:false,
    movesDraggable:true,
    moveInfoContextless:true,
    // Sprite click = change Pokemon; right-click = open the sheet (edit)
    onRightClickSprite:`presetEditorOpenInfo(${i})`,
    onLeftClickSprite:`presetEditorPick(${i})`,
    onLeftClickItem: inTeam ? `presetEditorPickItem(${i})` : '',
    spriteTitle:(typeof t === 'function' ? t('preset_editor_sprite_hint') : ''),
  });
}

function renderPresetEditor(){
  const pk = window._presetEditorOpen;
  const preset = _editorPreset();
  const box = (typeof ensurePokeModal === 'function') ? ensurePokeModal() : { inner: document.getElementById('poke-modal-inner') };
  const inner = box.inner;
  if(!inner || !preset) return false;
  const uids = preset.uids || [];
  const cards = [];
  try{
    for(let i = 0; i < Math.max(uids.length + (uids.length < 6 ? 1 : 0), 1) && i < 6; i++) cards.push(presetEditorCardHtml(pk, i));
  }catch(err){
    console.error('[preset] card render', err);
    cards.push(`<div class="pw-empty-state">Erreur de rendu des cartes.</div>`);
  }
  // Wave 32: header built by THE shared constructor (components/panel-header.js).
  _pwSetHtmlSafe(inner,
    panelHeaderHTML({
      icon: '🗂',
      titleHtml: _escAttr(preset.name),
      subtitle: `${t('preset_editor_sub')} · ${uids.length}/6`,
      close: { call: 'closePresetEditor', glyph: false }
    })
    + `<small class="atoll-prep-hint">${t('preset_editor_hint')}</small>`
    + `<div id="preset-editor-body" class="team-view">${cards.join('')}</div>`
    + `<div class="pw-btn-group"><button class="hbtn" data-action="legacy-call" data-call="presetEditorApply" data-call-args="">${t('preset_apply_btn')}</button><button class="hbtn" data-action="legacy-call" data-call="presetEditorSaveCurrent" data-call-args="">${t('preset_save_current_btn')}</button></div>`);
  if(typeof window.pwApplyWindowChrome==='function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
  installPresetEditorDragDrop();
  return true;
}

function openPresetEditor(pk){
  try{
    if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
    if(!G) return false;
    if(!G.teamPresets || typeof G.teamPresets !== 'object') G.teamPresets = {};
    if(!G.teamPresets[pk]) {
      const n = Number(String(pk).replace('preset','')) || 1;
      G.teamPresets[pk] = { name: (typeof tr==='function' ? tr('preset_default_name',{n}) : ('Équipe '+n)), uids: [] };
    }
    const box = (typeof ensurePokeModal === 'function') ? ensurePokeModal() : { modal: document.getElementById('poke-modal'), inner: document.getElementById('poke-modal-inner') };
    const modal = box.modal;
    const inner = box.inner;
    if(!modal || !inner){
      if(typeof notify==='function') notify(tr('preset_modal_missing'), 'var(--red)');
      return false;
    }
    // closes the other modes of the same modal
    modal.classList.remove('atoll-prep-modal');
    window._atollPrepOpen = false;
    window._pwPokeSheet = null;
    window._pwInfoSource = null;
    // Wave 29: clear the stale management-shell padding (same trap as the
    // base dialogs — a management menu closed via the backdrop/Escape left
    // "management-inner" behind, which shrank this editor's content box).
    inner.classList.remove('management-inner');
    if(typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
    window._presetEditorOpen = pk;
    const ok = renderPresetEditor();
    if(!ok){
      window._presetEditorOpen = null;
      if(typeof notify==='function') notify(tr('preset_editor_failed'), 'var(--red)');
      return false;
    }
    modal.classList.add('preset-editor-modal');
    modal.classList.add('open');
    try{ inner.scrollTop = 0; }catch(_){}
    return true;
  }catch(err){
    console.error('[preset] openPresetEditor', err);
    if(typeof notify==='function') notify(tr('preset_error', { err: err&&err.message||err }), 'var(--red)');
    return false;
  }
}

function closePresetEditor(){
  if(typeof pwClearMoveDragContext === 'function') pwClearMoveDragContext();
  window._presetEditorOpen = null;
  window._presetPickSlot = null;
  window._presetItemSlot = null;
  window._presetEditorReturn = null;
  const modal = document.getElementById('poke-modal');
  if(modal){ modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); }
   // Preset team editor and member selection rules
  openPresetManager();
}

function presetEditorApply(){
  const pk = window._presetEditorOpen;
  if(!pk) return;
  if(typeof loadTeamFromPreset === 'function') loadTeamFromPreset(pk);
  renderPresetEditor(); // the composition remains, the items follow the team
}
function presetEditorSaveCurrent(){
  const pk = window._presetEditorOpen;
  if(!pk) return;
  if(typeof saveCurrentTeamToPreset === 'function') saveCurrentTeamToPreset(pk);
  if(window._presetEditorOpen) renderPresetEditor();
}

// Swaps two preset positions (card drag & drop).
function presetEditorSwap(from, to){
  const preset = _editorPreset();
  if(!preset) return;
  from = Number(from); to = Number(to);
  if(!(from >= 0) || !(to >= 0) || from >= preset.uids.length || to >= preset.uids.length || from === to) return;
  const tmp = preset.uids[from]; preset.uids[from] = preset.uids[to]; preset.uids[to] = tmp;
  try{ saveGame(); }catch(_){}
  renderPresetEditor();
}

const _presetEditDrag = null;
function installPresetEditorDragDrop(){
  // Phase 51: reuse the active team's drag & drop AS IS (cards and
  // moves) — user feedback "exactly the same". Only the final swap is
  // redirected by the context.
  if(typeof pwSetMoveDragContext === 'function'){
    pwSetMoveDragContext({
      getTeam: () => _presetDragTeam(),
      swapMoves: (pi, a, b) => presetEditorSwapMove(pi, a, b),
      swapPokes: (a, b) => presetEditorSwap(a, b),
    });
    if(typeof installMoveDragDrop === 'function') installMoveDragDrop();
  }
  if(typeof installCardDragAndDrop === 'function'){
    installCardDragAndDrop(document.getElementById('preset-editor-body'));
  }
}

// "Virtual" team of the current preset (for the drag context).
function _presetDragTeam(){
  const preset = _editorPreset();
  const uids = (preset && preset.uids) || [];
  return uids.map(u => { const f = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(u) : null; return f ? f.p : null; });
}

// Reorders two moves of a preset member (the Pokemon is REAL: we act on
// its moves, exactly like the active team).
function presetEditorSwapMove(slot, a, b){
  const m = _editorMember(Number(slot));
  if(!m || !Array.isArray(m.p.moves)) return;
  if(!m.p.moves[a] || !m.p.moves[b] || a === b) return;
  const tmp = m.p.moves[a]; m.p.moves[a] = m.p.moves[b]; m.p.moves[b] = tmp;
  try{ saveGame(); }catch(_){}
  renderPresetEditor();
}

// Removes a member (Pokemon gone or explicit choice in the selector).
function presetEditorRemoveMember(slot){
  const preset = _editorPreset();
  if(!preset) return;
  slot = Number(slot);
  if(slot >= 0 && slot < preset.uids.length){ preset.uids.splice(slot, 1); try{ saveGame(); }catch(_){} }
  renderPresetEditor();
}

// ── 3a) Selector of Pokemon (in the modal) ────────────────────────────
window._presetPickerSearch = '';
function presetEditorPick(slot){
  window._presetPickSlot = Number(slot);
  // Phase 48 (user feedback): open the REAL "PC box" selector,
  // exactly the one of the active team (box/team tabs, sorting, search,
  // sheets), instead of the small homemade list. Fallback to the old list if
  // the selector module is not loaded.
  if(typeof openUnifiedSelectorModal === 'function'){
    openUnifiedSelectorModal('preset_slot_' + Number(slot));
    return;
  }
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
  (G.team || []).forEach((p, _i) => { if(p && p.uid && !used.has(p.uid)) out.push({ p, where:'team', tag:t('preset_in_team_tag') }); });
  const boxed = Object.entries(G.collection || {}).filter(([_id, p]) => p && p.uid && !used.has(p.uid));
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
    panelHeaderHTML({
      icon: '🔍',
      title: t('preset_pick_poke_title'),
      subtitleHtml: `${_escAttr(preset.name)} · ${slot + 1}/6`,
      close: { call: 'renderPresetEditor', glyph: false }
    })
    + `<input class="dict-search preset-pick-search" data-action="filter-preset-picker" value="${_escAttr(q)}" placeholder="${t('preset_pick_search_ph')}">`
    + `<div class="preset-pick-list">${rows || `<div class="pw-empty-state-md">${t('box_empty_result')||'—'}</div>`}</div>`
    + `<div class="pw-btn-group">${hasMember ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="presetEditorRemoveMember" data-call-args="${slot}">${t('preset_remove_member')}</button>` : ''}<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="renderPresetEditor" data-call-args="">${t('cancel_btn')||'Annuler'}</button></div>`);
  if(typeof window.pwApplyWindowChrome==='function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
  const inp = inner.querySelector('.preset-pick-search');
  if(inp && q){ try{ inp.focus({preventScroll:true}); }catch(_){ inp.focus(); } inp.setSelectionRange(inp.value.length, inp.value.length); }
}
function presetEditorPickChoose(slot, uid){
  const preset = _editorPreset();
  if(!preset || !uid) return;
  slot = Number(slot);
  // the Pokemon must exist (team or box)
  const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
  if(!found){ notify(t('preset_pokemon_not_found'), 'var(--red)'); renderPresetEditor(); return; }
  preset.uids = preset.uids.filter(u => u !== uid); // no duplicates
  if(slot >= preset.uids.length) preset.uids.push(uid); else preset.uids.splice(slot, 1, uid);
  if(preset.uids.length > 6) preset.uids.length = 6;
  try{ saveGame(); }catch(_){}
  window._presetPickerSearch = '';
  renderPresetEditor();
}

// ── 3b) Selector of item held (membres of the team active only) ───
function presetEditorPickItem(slot){
  const found = _editorMember(Number(slot));
  if(!found || found.here !== 'team'){ notify(t('preset_items_team_only'), 'var(--light1)'); return; }
  window._presetItemSlot = Number(slot);
  // Phase 49 (user feedback): open the fullscreen BAG, exactly
  // as for a Pokemon of the active team, instead of the homemade list.
  // (the in-modal list fallback stays in use when the fullscreen bag is not
  //  available — notably in headless tests)
  if(typeof openHeldItemPickerFor === 'function' && typeof openFullscreenPanel === 'function'
     && typeof closeUnifiedSelectorModal === 'function'){
    const pk = window._presetEditorOpen;
    const nm = (typeof getPokeName === 'function') ? getPokeName(found.p.id) : found.p.name;
    const cur = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(G.team.indexOf(found.p)) : found.p.heldItem;
    openHeldItemPickerFor(nm, cur,
      (key) => { presetEditorEquipItem(Number(slot), key); if(pk) openPresetEditor(pk); },
      () => { presetEditorClearItem(Number(slot)); if(pk) openPresetEditor(pk); });
    return;
  }
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
    panelHeaderHTML({
      iconHtml: itemSpriteHtml(currentKey || '', 30),
      titleHtml: tr('preset_pick_item_title', {name: nm}),
      subtitleHtml: `${t('equipped_item_label')}: ${currentKey ? getItemName(currentKey) : t('none')}`,
      close: { call: 'renderPresetEditor', glyph: false }
    })
    + `<div class="preset-pick-list">${rows || `<div class="pw-empty-state-md">${t('preset_no_item')}</div>`}</div>`
    + `<div class="pw-btn-group">${currentKey ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="presetEditorClearItem" data-call-args="${slot}">${t('preset_remove_item')}</button>` : ''}<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="renderPresetEditor" data-call-args="">${t('cancel_btn')||'Annuler'}</button></div>`);
  if(typeof window.pwApplyWindowChrome==='function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
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

// ── 3c) Pokemon sheet (for the "edit" action) ──────────────────────────
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
if (typeof renderPresetManager !== 'undefined') { if (typeof window !== 'undefined') window.renderPresetManager = renderPresetManager; if (typeof globalThis !== 'undefined') globalThis.renderPresetManager = renderPresetManager; }
if (typeof openPresetManager !== 'undefined') { if (typeof window !== 'undefined') window.openPresetManager = openPresetManager; if (typeof globalThis !== 'undefined') globalThis.openPresetManager = openPresetManager; }
if (typeof renamePreset !== 'undefined') { if (typeof window !== 'undefined') window.renamePreset = renamePreset; if (typeof globalThis !== 'undefined') globalThis.renamePreset = renamePreset; }
if (typeof presetSaveHere !== 'undefined') { if (typeof window !== 'undefined') window.presetSaveHere = presetSaveHere; if (typeof globalThis !== 'undefined') globalThis.presetSaveHere = presetSaveHere; }
if (typeof openPresetEditor !== 'undefined') { if (typeof window !== 'undefined') window.openPresetEditor = openPresetEditor; if (typeof globalThis !== 'undefined') globalThis.openPresetEditor = openPresetEditor; }
if (typeof renderPresetEditor !== 'undefined') { if (typeof window !== 'undefined') window.renderPresetEditor = renderPresetEditor; if (typeof globalThis !== 'undefined') globalThis.renderPresetEditor = renderPresetEditor; }
if (typeof closePresetEditor !== 'undefined') { if (typeof window !== 'undefined') window.closePresetEditor = closePresetEditor; if (typeof globalThis !== 'undefined') globalThis.closePresetEditor = closePresetEditor; }
if (typeof presetEditorApply !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorApply = presetEditorApply; if (typeof globalThis !== 'undefined') globalThis.presetEditorApply = presetEditorApply; }
if (typeof presetEditorSaveCurrent !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorSaveCurrent = presetEditorSaveCurrent; if (typeof globalThis !== 'undefined') globalThis.presetEditorSaveCurrent = presetEditorSaveCurrent; }
if (typeof presetEditorSwap !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorSwap = presetEditorSwap; if (typeof globalThis !== 'undefined') globalThis.presetEditorSwap = presetEditorSwap; }
if (typeof presetEditorPick !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorPick = presetEditorPick; if (typeof globalThis !== 'undefined') globalThis.presetEditorPick = presetEditorPick; }
if (typeof presetPickerFilter !== 'undefined') { if (typeof window !== 'undefined') window.presetPickerFilter = presetPickerFilter; if (typeof globalThis !== 'undefined') globalThis.presetPickerFilter = presetPickerFilter; }
if (typeof presetEditorPickChoose !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorPickChoose = presetEditorPickChoose; if (typeof globalThis !== 'undefined') globalThis.presetEditorPickChoose = presetEditorPickChoose; }
if (typeof presetEditorSwapMove !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorSwapMove = presetEditorSwapMove; if (typeof globalThis !== 'undefined') globalThis.presetEditorSwapMove = presetEditorSwapMove; }
if (typeof presetEditorRemoveMember !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorRemoveMember = presetEditorRemoveMember; if (typeof globalThis !== 'undefined') globalThis.presetEditorRemoveMember = presetEditorRemoveMember; }
if (typeof presetEditorPickItem !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorPickItem = presetEditorPickItem; if (typeof globalThis !== 'undefined') globalThis.presetEditorPickItem = presetEditorPickItem; }
if (typeof presetEditorEquipItem !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorEquipItem = presetEditorEquipItem; if (typeof globalThis !== 'undefined') globalThis.presetEditorEquipItem = presetEditorEquipItem; }
if (typeof presetEditorClearItem !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorClearItem = presetEditorClearItem; if (typeof globalThis !== 'undefined') globalThis.presetEditorClearItem = presetEditorClearItem; }
if (typeof presetEditorOpenInfo !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorOpenInfo = presetEditorOpenInfo; if (typeof globalThis !== 'undefined') globalThis.presetEditorOpenInfo = presetEditorOpenInfo; }


// --- Exported globals ---
if (typeof installPresetEditorDragDrop !== 'undefined') { if (typeof window !== 'undefined') window.installPresetEditorDragDrop = installPresetEditorDragDrop; if (typeof globalThis !== 'undefined') globalThis.installPresetEditorDragDrop = installPresetEditorDragDrop; }
if (typeof presetEditorCardHtml !== 'undefined') { if (typeof window !== 'undefined') window.presetEditorCardHtml = presetEditorCardHtml; if (typeof globalThis !== 'undefined') globalThis.presetEditorCardHtml = presetEditorCardHtml; }
if (typeof renderPresetItemPicker !== 'undefined') { if (typeof window !== 'undefined') window.renderPresetItemPicker = renderPresetItemPicker; if (typeof globalThis !== 'undefined') globalThis.renderPresetItemPicker = renderPresetItemPicker; }
if (typeof renderPresetPicker !== 'undefined') { if (typeof window !== 'undefined') window.renderPresetPicker = renderPresetPicker; if (typeof globalThis !== 'undefined') globalThis.renderPresetPicker = renderPresetPicker; }

// T2 (wave 37): ESM module — native exports; the window/globalThis surface
// above stays unchanged for classic consumers.
export { renderPresetManager, openPresetEditor, renderPresetPicker, renderPresetItemPicker, presetEditorCardHtml, installPresetEditorDragDrop };

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('openPresetEditor', openPresetEditor); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('presetPickerFilter', presetPickerFilter); } catch (_) {} }

