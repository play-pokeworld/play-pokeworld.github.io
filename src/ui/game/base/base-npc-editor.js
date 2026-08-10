// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// SECRET BASE — NPC EDITOR — passes 45-47 + scroll fix / 101 sprites
// ----------------------------------------------------------------------------
// - Internal scroll (6-mon team): #base-npced-team max-height 50vh overflow auto
// - Team choice: window with presets + sprites (as requested)
// - Appearances: 101 sprites (trainer-0..100) + a dedicated window on
//   portrait click, with an edit badge on hover
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseGetState(...args) { const f = __pwV43Link('baseGetState'); return f ? f(...args) : undefined; }
function baseNpcDelete(...args) { const f = __pwV43Link('baseNpcDelete'); return f ? f(...args) : undefined; }
function baseNpcFind(...args) { const f = __pwV43Link('baseNpcFind'); return f ? f(...args) : undefined; }
function baseNpcSpriteUrl(...args) { const f = __pwV43Link('baseNpcSpriteUrl'); return f ? f(...args) : undefined; }
function baseNpcTeamFromPreset(...args) { const f = __pwV43Link('baseNpcTeamFromPreset'); return f ? f(...args) : undefined; }
function baseNpcUpdate(...args) { const f = __pwV43Link('baseNpcUpdate'); return f ? f(...args) : undefined; }
function baseWindowInvalidate(...args) { const f = __pwV43Link('baseWindowInvalidate'); return f ? f(...args) : undefined; }

// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

const _baseNpcEd = { npcId: null, draft: null, pickSlot: null, itemSlot: null, search: '', spriteSearch: '', spritePicker: false, presetPicker: false };

function _bnEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _bnT(k, p) { return (typeof tr === 'function') ? tr(k, p) : ((typeof t === 'function') ? t(k) : k); }
function _bnState() { return (typeof __pwV43Link('baseGetState') === 'function') ? baseGetState() : null; }
function _bnSprites() { return (typeof BASE_NPC_SPRITES !== 'undefined') ? BASE_NPC_SPRITES : ['trainer-0']; }
function _bnSpriteUrl(s) { return (typeof __pwV43Link('baseNpcSpriteUrl') === 'function') ? baseNpcSpriteUrl(s) : ('src/assets/images/trainers/profil/' + s + '.png'); }
function _bnMonName(id) { return (typeof getPokeName === 'function') ? getPokeName(id) : ('#' + id); }

function _bnViews() {
  return (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
}
// Wave 22 (ECS DS): portraits are class-based (.pw-base-portrait is-N,
// DS2822) — the adapter only resolves URLs / shapes models, the views
// build the <img> / buttons.

function _bnInstantiate(mon) {
  if (typeof createPoke === 'function') {
    const p = createPoke(mon.id, mon.level, !!mon.shiny);
    if (p) {
      if (Array.isArray(mon.moves) && mon.moves.length && typeof MOVES !== 'undefined') {
        const named = mon.moves.filter((m) => m && MOVES[m]).slice(0, 4);
        if (named.length) p.moves = named.map((m) => ({ id: m }));
      }
      if (mon.talent) p.talent = mon.talent;
      p.heldItem = mon.item || null;
      p.currentHP = p.maxHP;
      return p;
    }
  }
  return { id: mon.id, level: mon.level, name: _bnMonName(mon.id), moves: [], currentHP: 1, maxHP: 1, heldItem: mon.item || null, shiny: !!mon.shiny };
}
function _bnFreeze(p) {
  return { id: p.id|0, level: Math.min(100, Math.max(1, p.level|0||5)), moves: (Array.isArray(p.moves)?p.moves:[]).map(m=>(m&&m.id)||m).filter(Boolean).slice(0,4), talent: p.talent||null, shiny: !!(p.shiny||p.shinyActive), item: p.heldItem||null };
}
function _bnDraft() {
  if (_baseNpcEd.draft) return _baseNpcEd.draft;
  const st = _bnState();
  const npc = (st && _baseNpcEd.npcId) ? baseNpcFind(st, _baseNpcEd.npcId) : null;
  _baseNpcEd.draft = {
    name: (npc && npc.name) || '',
    sprite: (npc && npc.sprite) || (typeof BASE_NPC_SPRITE_DEFAULT !== 'undefined' ? BASE_NPC_SPRITE_DEFAULT : 'trainer-0'),
    team: ((npc && npc.team) || []).map((m) => _bnInstantiate(m)),
    msgs: { pre: (npc && npc.msgs && npc.msgs.pre) || '', win: (npc && npc.msgs && npc.msgs.win) || '', lose: (npc && npc.msgs && npc.msgs.lose) || '' },
  };
  return _baseNpcEd.draft;
}
function _bnCardHtml(p, i) {
  if (!p) return `<div class="pw-drop-zone preset-slot-empty" data-action="legacy-call" data-call="baseNpcEditorPick" data-call-args="${i}"><div class="pw-text-lg">+</div><div class="pw-text-sm pw-light2 pw-bold">${_bnT('base.npced.add_mon')}</div></div>`;
  if (typeof generatePokeCardHTML === 'function') {
    return generatePokeCardHTML(p, i, { isActive:false, isFainted:false, showMoves:true, showXP:false, showStatus:false, movesAsBars:false, movesDraggable:true, moveInfoContextless:true, onLeftClickSprite:`baseNpcEditorPick(${i})`, onLeftClickItem:`baseNpcEditorPickItem(${i})`, spriteTitle:_bnT('base.npced.pick_hint') });
  }
  return `<div class="pw-drop-zone" data-action="legacy-call" data-call="baseNpcEditorPick" data-call-args="${i}"><div class="pw-text-sm">${_bnEsc(_bnMonName(p.id))} Nv.${p.level}</div></div>`;
}
function _bnFormHtml() {
  const d = _bnDraft();
  const cards = [];
  const shown = Math.min(6, d.team.length + (d.team.length < 6 ? 1 : 0)) || 1;
  for (let i = 0; i < shown; i++) cards.push(_bnCardHtml(d.team[i] || null, i));
  const views = _bnViews();
  if (!views || typeof views.BaseNpcEditorView !== 'function') throw new Error('[ui] PokeUI views not loaded (BaseNpcEditorView)');
  return views.BaseNpcEditorView.toHTML({
    titleIconUrl: _bnSpriteUrl(d.sprite),
    title: _bnT('base.npced.title'),
    hint: _bnT('base.npced.hint'),
    portraitUrl: _bnSpriteUrl(d.sprite),
    portraitHint: _bnT('base.npced.edit_sprite_hint') || 'Changer apparence',
    nameValue: d.name,
    namePlaceholder: _bnT('base.npced.name'),
    spriteMetaLine: `${_bnT('base.npced.sprite')} · ${_bnSprites().length} dispo · ${_bnT('base.npced.edit_sprite_hint') || 'Clique image'}`,
    teamLabel: _bnT('base.npced.team', { n: d.team.length }),
    levelAutoText: _bnT('base.npced.level_auto'),
    presetBtnLabel: `${_bnT('base.npced.from_preset')} (voir teams)`,
    cardsHtml: cards.join(''),
    quotesLabel: _bnT('base.npced.quotes'),
    quotes: ['pre', 'win', 'lose'].map((q) => ({ key: q, label: _bnT('base.npced.quote_' + q), value: d.msgs[q] })),
    saveLabel: _bnT('base.npced.save'),
    deleteLabel: _bnT('base.npced.delete'),
    backLabel: _bnT('base.npced.back'),
  });
}

function _bnCandidates() {
  const G_ = (typeof G !== 'undefined') ? G : null;
  if (!G_) return [];
  const out=[];
  for(const p of (G_.team||[])) if(p&&p.id) out.push({p,where:'team',tag:(typeof t==='function'?t('preset_in_team_tag'):'Équipe')});
  const boxed=Object.entries(G_.collection||{}).filter(([,p])=>p&&p.id);
  boxed.sort((a,b)=>(Number(a[1].id)||0)-(Number(b[1].id)||0));
  for(const [,p] of boxed) out.push({p,where:'box',tag:(typeof t==='function'?(t('box_pc_location')||'Boîte'):'Boîte')});
  return out;
}

function renderBaseNpcPicker() {
  const inner=document.getElementById('poke-modal-inner'); if(!inner) return false;
  const q=_baseNpcEd.search||''; let cands=_bnCandidates(); if(q) cands=cands.filter(c=> (_bnMonName(c.p.id)+' '+c.p.id).toLowerCase().includes(q));
  const slot=_baseNpcEd.pickSlot; const d=_bnDraft(); _baseNpcEd._cands=cands;
  // Wave 22 (ECS DS): rows shaped here, rendered by BaseNpcPickerView.
  const views=_bnViews();
  if(!views||typeof views.BaseNpcPickerView!=='function') throw new Error('[ui] PokeUI views not loaded (BaseNpcPickerView)');
  const rows=cands.slice(0,120).map((c,k)=>({
    spriteHtml:(typeof spriteImg==='function')?spriteImg(c.p.id,c.p.emoji,{size:34,shiny:!!c.p.shinyActive}):'',
    nameText:_bnMonName(c.p.id),
    metaText:`#${c.p.id} · Nv.${c.p.level||1}`,
    tagText:c.tag, inBox:c.where==='box',
    callArgs:`${slot}, ${k}`,
  }));
  const hasMember=d.team[slot]!==undefined;
  const html=views.BaseNpcPickerView.toHTML({
    title:_bnT('base.npced.pick_title'),
    sub:`${d.name||_bnT('base.npced.title')} · ${slot+1}/6`,
    searchValue:q,
    searchPlaceholder:_bnT('base.npced.pick_search'),
    rows:rows, emptyLabel:'—',
    remove:hasMember?{label:_bnT('base.npced.remove_mon'),callArgs:String(slot)}:null,
    backLabel:_bnT('base.npced.back'),
  });
  _pwSetHtmlSafe(inner, html);
  return true;
}

function renderBaseNpcItemPicker() {
  const inner=document.getElementById('poke-modal-inner'); const d=_bnDraft(); const slot=_baseNpcEd.itemSlot; const p=d.team[slot]; if(!inner||!p) return renderBaseNpcEditor();
  const ITEMS_=(typeof ITEMS!=='undefined')?ITEMS:{}; const isEquippable=(typeof isHeldEquippableItem==='function')?isHeldEquippableItem:(k)=>!!(ITEMS_[k]&&(ITEMS_[k].type==='held'||ITEMS_[k].buff)); const nameOf=(k)=>(typeof getItemName==='function')?getItemName(k):k; const descOf=(k)=>(typeof getItemDesc==='function')?getItemDesc(k):''; const sprOf=(k,n)=>(typeof itemSpriteHtml==='function')?itemSpriteHtml(k,n):'';
  const current=p.heldItem||null; const keys=Object.keys(ITEMS_).filter(isEquippable).sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
  // Wave 22 (ECS DS): rows shaped here, rendered by BaseNpcItemPickerView.
  // The "current item" marker was an inline outline — now the .is-current
  // class (DS2822); openItemInfo right-click contract kept.
  const views=_bnViews();
  if(!views||typeof views.BaseNpcItemPickerView!=='function') throw new Error('[ui] PokeUI views not loaded (BaseNpcItemPickerView)');
  const rows=keys.map(key=>({
    spriteHtml:sprOf(key,34),
    nameText:nameOf(key), descText:descOf(key),
    isCurrent:key===current,
    callArgs:`${slot}, '${key}'`,
    contextArgs:`'${key}'`,
  }));
  const html=views.BaseNpcItemPickerView.toHTML({
    titleIconHtml:sprOf(current||'',30),
    title:_bnT('base.npced.pick_item_title', { name: _bnMonName(p.id) }),
    sub:current?nameOf(current):_bnT('base.npced.no_item'),
    rows:rows, emptyLabel:'—',
    remove:current?{label:_bnT('base.npced.remove_item'),callArgs:String(slot)}:null,
    backLabel:_bnT('base.npced.back'),
  });
  _pwSetHtmlSafe(inner, html);
  return true;
}

function _bnSpritePickerModel(closeCall, withHint) {
  const d=_bnDraft(); const filter=_baseNpcEd.spriteSearch||'';
  let sprites=_bnSprites(); if(filter){ const q=filter.toLowerCase(); sprites=sprites.filter(s=>s.toLowerCase().includes(q)); }
  return {
    title:`${_bnT('base.npced.sprite_picker_title')||'Apparences'} (${sprites.length}/${_bnSprites().length})`,
    hint:withHint?(_bnT('base.npced.sprite_picker_hint')||'Clique pour changer, se ferme auto'):null,
    filterValue:filter,
    filterPlaceholder:'trainer-42...',
    closeCall:closeCall,
    sprites:sprites.map((id)=>({ id:id, selected:id===d.sprite, url:_bnSpriteUrl(id) })),
    emptyLabel:'Aucun',
    backLabel:_bnT('base.npced.back'),
  };
}
function renderBaseNpcSpritePicker() {
  const inner=document.getElementById('poke-modal-inner'); if(!inner) return false;
  // Wave 22 (ECS DS): looks grid rendered by BaseNpcSpritePickerView (the
  // ~103 inline-styled <img> of the legacy grid are class-based, DS2822).
  const views=_bnViews();
  if(!views||typeof views.BaseNpcSpritePickerView!=='function') throw new Error('[ui] PokeUI views not loaded (BaseNpcSpritePickerView)');
  _pwSetHtmlSafe(inner, views.BaseNpcSpritePickerView.toHTML(_bnSpritePickerModel('renderBaseNpcEditor', true)));
  return true;
}

function renderBaseNpcPresetPicker() {
  const inner=document.getElementById('poke-modal-inner'); if(!inner) return false;
  const G_=(typeof G!=='undefined')?G:null; const presets=(G_&&G_.teamPresets)||{};
  const activeTeam=(G_&&G_.team)||[];
  const all=[];
  if(activeTeam.length) all.push({key:'active', name:_bnT('base.npced.from_preset_active')||'Équipe active', team:activeTeam});
  for(const pk of Object.keys(presets)){ const pr=presets[pk]||{}; const uids=pr.uids||[]; if(!uids.length) continue; const mons=[]; for(const uid of uids){ const found=(typeof resolvePresetPoke==='function')?resolvePresetPoke(uid):null; if(found&&found.p) mons.push(found.p); } all.push({key:pk, name:pr.name||pk, team:mons, count:uids.length}); }
  // Wave 22 (ECS DS): rows shaped here, rendered by BaseNpcPresetPickerView.
  const views=_bnViews();
  if(!views||typeof views.BaseNpcPresetPickerView!=='function') throw new Error('[ui] PokeUI views not loaded (BaseNpcPresetPickerView)');
  const rows=all.map((pr)=>({
    name:pr.name, count:pr.count||pr.team.length,
    spritesHtml:pr.team.slice(0,6).map((m)=>{
      const spr=(typeof spriteImg==='function')?spriteImg(m.id,m.emoji,{size:28,shiny:!!m.shinyActive}):'';
      return `<span class="preset-pick-sprite">${spr}</span>`;
    }).join(''),
    callArgs:`'${String(pr.key).replace(/'/g, '')}'`,
  }));
  _pwSetHtmlSafe(inner, views.BaseNpcPresetPickerView.toHTML({
    title:_bnT('base.npced.preset_picker_title')||'Choisir une équipe',
    hint:_bnT('base.npced.preset_picker_hint')||'Clique une team pour importer',
    rows:rows, emptyLabel:'Aucune team',
    backLabel:_bnT('base.npced.back'),
  }));
  return true;
}

function baseNpcInstallDrag() {
  if(typeof pwSetMoveDragContext==='function'){ pwSetMoveDragContext({ getTeam:()=>_bnDraft().team, swapMoves:(pi,a,b)=>baseNpcEditorSwapMove(pi,a,b), swapPokes:(a,b)=>baseNpcEditorSwap(a,b) }); if(typeof installMoveDragDrop==='function') installMoveDragDrop(); }
  if(typeof installCardDragAndDrop==='function'){ installCardDragAndDrop(document.getElementById('base-npced-team')); }
}
function baseNpcEditorSwap(from,to){ const d=_bnDraft(); if(from===to||!d.team[from]||!d.team[to]) return renderBaseNpcEditor(); const tmp=d.team[from]; d.team[from]=d.team[to]; d.team[to]=tmp; return renderBaseNpcEditor(); }
function baseNpcEditorSwapMove(slot,from,to){ const d=_bnDraft(); const p=d.team[slot]; if(!p||!Array.isArray(p.moves)||from===to) return renderBaseNpcEditor(); if(!p.moves[from]||!p.moves[to]) return renderBaseNpcEditor(); const tmp=p.moves[from]; p.moves[from]=p.moves[to]; p.moves[to]=tmp; return renderBaseNpcEditor(); }

function renderBaseNpcEditor() {
  const inner=document.getElementById('poke-modal-inner'); const st=_bnState(); if(!inner||!st) return false;
  if(_baseNpcEd.spritePicker){
    // Same looks sheet as the standalone picker, only the close target
    // differs (returns to the editor form instead of re-rendering it).
    const views=_bnViews();
    if(!views||typeof views.BaseNpcSpritePickerView!=='function') throw new Error('[ui] PokeUI views not loaded (BaseNpcSpritePickerView)');
    _pwSetHtmlSafe(inner, views.BaseNpcSpritePickerView.toHTML(_bnSpritePickerModel('baseNpcEditorCloseSpritePicker', false)));
    return true;
  }
  if(_baseNpcEd.presetPicker){ return renderBaseNpcPresetPicker(); }
  _baseNpcEd.pickSlot=null; _baseNpcEd.itemSlot=null;
  // Wave 22: the whole sheet (title included) comes from BaseNpcEditorView.
  _pwSetHtmlSafe(inner, _bnFormHtml());
  if (typeof window.pwApplyWindowChrome === 'function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
  baseNpcInstallDrag();
  return true;
}

function openBaseNpcEditor(npcId){
const st=_bnState(); if(!st) return false; const npc=npcId?baseNpcFind(st,npcId):null; if(!npc) return false;
const modal=document.getElementById('poke-modal'); if(!modal) return false; _baseNpcEd.npcId=npcId; _baseNpcEd.draft=null; _baseNpcEd.pickSlot=null; _baseNpcEd.itemSlot=null; _baseNpcEd.search=''; _baseNpcEd.spriteSearch=''; _baseNpcEd.spritePicker=false; _baseNpcEd.presetPicker=false; if(!renderBaseNpcEditor()) return false; window._pwPokeSheet=null; if(typeof window.pwModalInfo==='function') window.pwModalInfo(false); try{const _beInner=document.getElementById('poke-modal-inner'); if(_beInner) _beInner.classList.remove('management-inner');}catch(_){} /* wave 29: no stale management padding on the editor shell */ modal.classList.add('preset-editor-modal'); modal.classList.add('open'); try{document.getElementById('poke-modal-inner').scrollTop=0;}catch(_){} return true; }
function closeBaseNpcEditor(){ if(typeof pwClearMoveDragContext==='function') pwClearMoveDragContext(); _baseNpcEd.npcId=null; _baseNpcEd.draft=null; _baseNpcEd.pickSlot=null; _baseNpcEd.itemSlot=null; _baseNpcEd.search=''; _baseNpcEd.spriteSearch=''; _baseNpcEd.spritePicker=false; _baseNpcEd.presetPicker=false; const modal=document.getElementById('poke-modal'); if(modal){ modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); } if(typeof __pwV43Link('baseWindowInvalidate') === 'function') baseWindowInvalidate(); return true; }

function baseNpcEditorSetField(field,value){ const d=_bnDraft(); if(field==='name') d.name=String(value||'').slice(0,18); else if(field==='sprite'&&_bnSprites().includes(value)) d.sprite=value; return true; }
function baseNpcEditorSetSprite(sprite){ const d=_bnDraft(); if(_bnSprites().includes(sprite)) d.sprite=sprite; _baseNpcEd.spritePicker=false; return renderBaseNpcEditor(); }
function baseNpcEditorSetQuote(which,value){ const d=_bnDraft(); if(['pre','win','lose'].includes(which)) d.msgs[which]=String(value||'').slice(0,80); return true; }
function baseNpcEditorOpenSpritePicker(){ _baseNpcEd.spritePicker=true; _baseNpcEd.spriteSearch=''; return renderBaseNpcEditor(); }
function baseNpcEditorCloseSpritePicker(){ _baseNpcEd.spritePicker=false; return renderBaseNpcEditor(); }
function baseNpcEditorFilterSprite(v){ _baseNpcEd.spriteSearch=String(v||'').toLowerCase().trim(); const inner=document.getElementById('poke-modal-inner'); if(!inner) return false; // re-render only grid to keep input focus
  const d=_bnDraft(); let sprites=_bnSprites(); const filter=_baseNpcEd.spriteSearch; if(filter) sprites=sprites.filter(sp=>sp.toLowerCase().includes(filter));
  const views=_bnViews();
  if(!views||typeof views.BaseNpcSpritePickerView!=='function') throw new Error('[ui] PokeUI views not loaded (BaseNpcSpritePickerView)');
  const grid=inner.querySelector('.base-npc-looks'); if(grid){ _pwSetHtmlSafe(grid, views.BaseNpcSpritePickerView.looksHTML(sprites.map((id)=>({ id:id, selected:id===d.sprite, url:_bnSpriteUrl(id) })))); const title=inner.querySelector('.pw-info-name'); if(title) title.textContent=`${_bnT('base.npced.sprite_picker_title')||'Apparences'} (${sprites.length}/${_bnSprites().length})`; }
  return true;
}
function baseNpcEditorOpenPresetPicker(){ _baseNpcEd.presetPicker=true; return renderBaseNpcEditor(); }
function baseNpcEditorClosePresetPicker(){ _baseNpcEd.presetPicker=false; return renderBaseNpcEditor(); }
function baseNpcEditorPick(slot){ _baseNpcEd.pickSlot=Number(slot); _baseNpcEd.search=''; if(typeof openUnifiedSelectorModal==='function'){ openUnifiedSelectorModal('basenpc_slot_'+Number(slot)); return true; } return renderBaseNpcPicker(); }
function baseNpcEditorAcceptPick(slot,p){ if(!p) return false; const d=_bnDraft(); slot=Number(slot); const mon=_bnInstantiate(_bnFreeze(p)); if(slot>=d.team.length) d.team.push(mon); else d.team.splice(slot,1,mon); if(d.team.length>6) d.team.length=6; _baseNpcEd.pickSlot=null; const modal=document.getElementById('poke-modal'); if(modal){ modal.classList.add('preset-editor-modal'); modal.classList.add('open'); } return renderBaseNpcEditor(); }
function baseNpcPickerFilter(v){ _baseNpcEd.search=String(v||'').toLowerCase().trim(); return renderBaseNpcPicker(); }
function baseNpcEditorPickChoose(slot,idx){ const c=(_baseNpcEd._cands||[])[Number(idx)]; if(!c) return renderBaseNpcEditor(); const d=_bnDraft(); slot=Number(slot); const mon=_bnInstantiate(_bnFreeze(c.p)); if(slot>=d.team.length) d.team.push(mon); else d.team.splice(slot,1,mon); if(d.team.length>6) d.team.length=6; _baseNpcEd.pickSlot=null; _baseNpcEd.search=''; return renderBaseNpcEditor(); }
function baseNpcEditorRemoveMon(index){ const d=_bnDraft(); d.team.splice(index|0,1); _baseNpcEd.pickSlot=null; return renderBaseNpcEditor(); }
function baseNpcEditorPickItem(slot){ const d=_bnDraft(); const p=d.team[Number(slot)]; if(!p) return false; _baseNpcEd.itemSlot=Number(slot); if(typeof openHeldItemPickerFor==='function'&&typeof openFullscreenPanel==='function'&&typeof closeUnifiedSelectorModal==='function'){ const modal=document.getElementById('poke-modal'); if(modal) modal.classList.remove('open'); openHeldItemPickerFor(_bnMonName(p.id), p.heldItem||null, (key)=>{ baseNpcEditorEquipItem(Number(slot),key); _bnReopen(); }, ()=>{ baseNpcEditorClearItem(Number(slot)); _bnReopen(); }); return true; } return renderBaseNpcItemPicker(); }
function _bnReopen(){ const modal=document.getElementById('poke-modal'); if(modal){ modal.classList.add('preset-editor-modal'); modal.classList.add('open'); } renderBaseNpcEditor(); }
function baseNpcEditorEquipItem(slot,key){ const d=_bnDraft(); const p=d.team[Number(slot)]; if(!p) return false; p.heldItem=key; if(typeof notify==='function'&&typeof getItemName==='function'){ notify(_bnT('base.npced.item_set', { name:_bnMonName(p.id), item:getItemName(key) }), 'var(--green)'); } return renderBaseNpcEditor(); }
function baseNpcEditorClearItem(slot){ const d=_bnDraft(); const p=d.team[Number(slot)]; if(!p) return false; p.heldItem=null; return renderBaseNpcEditor(); }
function baseNpcEditorImportPreset(){ const sel=document.getElementById('base-npced-preset'); const key=sel?sel.value:'active'; const team=(typeof __pwV43Link('baseNpcTeamFromPreset') === 'function')?baseNpcTeamFromPreset(key):[]; if(!team.length){ if(typeof notify==='function') notify(_bnT('base.err.npc_team'),'var(--red)'); return false; } _bnDraft().team=team.map(m=>_bnInstantiate(m)); if(typeof notify==='function') notify(_bnT('base.npced.imported',{n:team.length}),'var(--green)'); return renderBaseNpcEditor(); }
function baseNpcEditorImportPresetFromPicker(key){ const team=(typeof __pwV43Link('baseNpcTeamFromPreset') === 'function')?baseNpcTeamFromPreset(key):[]; if(!team.length){ if(typeof notify==='function') notify(_bnT('base.err.npc_team'),'var(--red)'); return false; } _bnDraft().team=team.map(m=>_bnInstantiate(m)); _baseNpcEd.presetPicker=false; if(typeof notify==='function') notify(_bnT('base.npced.imported',{n:team.length}),'var(--green)'); return renderBaseNpcEditor(); }

function baseNpcEditorSave(){ const st=_bnState(); const d=_bnDraft(); if(!st||!_baseNpcEd.npcId) return false; const res=baseNpcUpdate(st,_baseNpcEd.npcId,{ name:d.name||_bnT('base.debug.npc_name'), sprite:d.sprite, team:d.team.map(p=>_bnFreeze(p)), msgs:d.msgs }); if(!res||!res.ok){ if(typeof notify==='function') notify(_bnT(res&&res.reason?res.reason:'base.err.npc_team'),'var(--red)'); return false; } if(typeof notify==='function'){ notify(_bnT('base.npced.updated',{name:d.name||_bnT('base.debug.npc_name')}),'var(--green)'); } if(typeof __pwV43Link('baseWindowInvalidate') === 'function') baseWindowInvalidate(); return closeBaseNpcEditor(); }
function baseNpcEditorDelete(){ const st=_bnState(); if(!st||!_baseNpcEd.npcId) return false; const npc=baseNpcFind(st,_baseNpcEd.npcId); if(!npc) return false; const name=npc.name; const npcId=_baseNpcEd.npcId; const doDelete=function(){ if(baseNpcDelete(st,npcId)){ if(typeof notify==='function') notify(_bnT('base.npced.deleted',{name}),'var(--green)'); } closeBaseNpcEditor(); }; if(typeof pwConfirm==='function'){ pwConfirm(_bnT('base.npced.delete_confirm',{name}),doDelete,{danger:true,title:'🗑️ '+name}); return true; } /* no design-system modal → action not triggered (no native dialog) */ return false; }

if (typeof PokeActions !== 'undefined') { PokeActions.register('openBaseNpcEditor', openBaseNpcEditor); } else if (typeof globalThis !== 'undefined') { globalThis.openBaseNpcEditor = openBaseNpcEditor; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('closeBaseNpcEditor', closeBaseNpcEditor); } else if (typeof globalThis !== 'undefined') { globalThis.closeBaseNpcEditor = closeBaseNpcEditor; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('renderBaseNpcEditor', renderBaseNpcEditor); } else if (typeof globalThis !== 'undefined') { globalThis.renderBaseNpcEditor = renderBaseNpcEditor; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('renderBaseNpcPicker', renderBaseNpcPicker); } else if (typeof globalThis !== 'undefined') { globalThis.renderBaseNpcPicker = renderBaseNpcPicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('renderBaseNpcItemPicker', renderBaseNpcItemPicker); } else if (typeof globalThis !== 'undefined') { globalThis.renderBaseNpcItemPicker = renderBaseNpcItemPicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcPickerFilter', baseNpcPickerFilter); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcPickerFilter = baseNpcPickerFilter; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorSetField', baseNpcEditorSetField); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorSetField = baseNpcEditorSetField; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorSetSprite', baseNpcEditorSetSprite); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorSetSprite = baseNpcEditorSetSprite; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorSetQuote', baseNpcEditorSetQuote); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorSetQuote = baseNpcEditorSetQuote; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorPick', baseNpcEditorPick); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorPick = baseNpcEditorPick; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorPickChoose', baseNpcEditorPickChoose); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorPickChoose = baseNpcEditorPickChoose; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorAcceptPick', baseNpcEditorAcceptPick); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorAcceptPick = baseNpcEditorAcceptPick; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorRemoveMon', baseNpcEditorRemoveMon); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorRemoveMon = baseNpcEditorRemoveMon; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorPickItem', baseNpcEditorPickItem); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorPickItem = baseNpcEditorPickItem; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorEquipItem', baseNpcEditorEquipItem); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorEquipItem = baseNpcEditorEquipItem; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorClearItem', baseNpcEditorClearItem); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorClearItem = baseNpcEditorClearItem; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorImportPreset', baseNpcEditorImportPreset); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorImportPreset = baseNpcEditorImportPreset; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorImportPresetFromPicker', baseNpcEditorImportPresetFromPicker); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorImportPresetFromPicker = baseNpcEditorImportPresetFromPicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorSave', baseNpcEditorSave); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorSave = baseNpcEditorSave; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorSwap', baseNpcEditorSwap); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorSwap = baseNpcEditorSwap; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorSwapMove', baseNpcEditorSwapMove); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorSwapMove = baseNpcEditorSwapMove; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcInstallDrag', baseNpcInstallDrag); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcInstallDrag = baseNpcInstallDrag; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorDelete', baseNpcEditorDelete); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorDelete = baseNpcEditorDelete; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorOpenSpritePicker', baseNpcEditorOpenSpritePicker); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorOpenSpritePicker = baseNpcEditorOpenSpritePicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorCloseSpritePicker', baseNpcEditorCloseSpritePicker); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorCloseSpritePicker = baseNpcEditorCloseSpritePicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorFilterSprite', baseNpcEditorFilterSprite); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorFilterSprite = baseNpcEditorFilterSprite; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorOpenPresetPicker', baseNpcEditorOpenPresetPicker); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorOpenPresetPicker = baseNpcEditorOpenPresetPicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcEditorClosePresetPicker', baseNpcEditorClosePresetPicker); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcEditorClosePresetPicker = baseNpcEditorClosePresetPicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('renderBaseNpcSpritePicker', renderBaseNpcSpritePicker); } else if (typeof globalThis !== 'undefined') { globalThis.renderBaseNpcSpritePicker = renderBaseNpcSpritePicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('renderBaseNpcPresetPicker', renderBaseNpcPresetPicker); } else if (typeof globalThis !== 'undefined') { globalThis.renderBaseNpcPresetPicker = renderBaseNpcPresetPicker; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  openBaseNpcEditor,
  closeBaseNpcEditor,
  renderBaseNpcEditor,
  renderBaseNpcPicker,
  renderBaseNpcItemPicker,
  baseNpcPickerFilter,
  baseNpcEditorSetField,
  baseNpcEditorSetSprite,
  baseNpcEditorSetQuote,
  baseNpcEditorPick,
  baseNpcEditorPickChoose,
  baseNpcEditorAcceptPick,
  baseNpcEditorRemoveMon,
  baseNpcEditorPickItem,
  baseNpcEditorEquipItem,
  baseNpcEditorClearItem,
  baseNpcEditorImportPreset,
  baseNpcEditorImportPresetFromPicker,
  baseNpcEditorSave,
  baseNpcEditorSwap,
  baseNpcEditorSwapMove,
  baseNpcInstallDrag,
  baseNpcEditorDelete,
  baseNpcEditorOpenSpritePicker,
  baseNpcEditorCloseSpritePicker,
  baseNpcEditorFilterSprite,
  baseNpcEditorOpenPresetPicker,
  baseNpcEditorClosePresetPicker,
  renderBaseNpcSpritePicker,
  renderBaseNpcPresetPicker,
};
