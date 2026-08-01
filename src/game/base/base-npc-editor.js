// ============================================================================
// BASE SECRÈTE — ÉDITEUR D'UN PNJ — passes 45-47
// ----------------------------------------------------------------------------
// Passe 47 — refonte complète d'après les retours utilisateur :
//   · « je ne veux pas de banque de PNJ comme tu l'as fait, juste un objet PNJ
//     posé dans la base et quand on clique dessus on voit un bouton modifier »
//     → plus de liste/vivier. Cet écran édite UN PNJ, celui qu'on a
//       sélectionné dans la salle (openBaseNpcEditor(npcId)).
//   · « la modification de la team n'est pas du tout comme dans les presets :
//     on ne peut pas changer les Pokémon, on ne peut pas leur mettre d'items »
//     → l'éditeur d'équipe est le MÊME que celui des presets : cartes
//       generatePokeCardHTML, clic sprite = changer de Pokémon, clic badge
//       objet = équiper/retirer un objet tenu, sélecteurs avec recherche.
//   · « le mot est "pnj" ou "npc" mais pas "copain" » → toute la terminologie
//     FR/EN a été reprise (clés base.npced.*).
//   · « les assets des PNJ sont horribles, utilise images/trainers/profil »
//     → la galerie d'allures affiche les VRAIS portraits de dresseurs.
//
// L'équipe reste un INSTANTANÉ GELÉ (choix validé passe 45) : le PNJ ne suit
// pas les changements ultérieurs de l'équipe du joueur, sinon l'export de la
// base vers un autre joueur serait incohérent. On stocke donc, par membre :
// { id, level, moves[], talent, shiny, item } — « item » étant l'objet tenu.
// ============================================================================

var _pwSetHtmlSafe = _pwSetHtmlSafe || function (el, html) {
  if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html;
};

// npcId : le PNJ en cours d'édition ; pickSlot/itemSlot : sélecteurs ouverts.
const _baseNpcEd = { npcId: null, draft: null, pickSlot: null, itemSlot: null, search: '' };

function _bnEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _bnT(k, p) {
  return (typeof tr === 'function') ? tr(k, p) : ((typeof t === 'function') ? t(k) : k);
}
function _bnState() { return (typeof baseGetState === 'function') ? baseGetState() : null; }
function _bnSprites() {
  return (typeof BASE_NPC_SPRITES !== 'undefined') ? BASE_NPC_SPRITES : ['trainer-0'];
}
function _bnSpriteUrl(s) {
  return (typeof baseNpcSpriteUrl === 'function')
    ? baseNpcSpriteUrl(s) : ('src/assets/images/trainers/profil/' + s + '.png');
}
function _bnMonName(id) { return (typeof getPokeName === 'function') ? getPokeName(id) : ('#' + id); }

// Portrait de dresseur (vrai asset du jeu) — c'est « l'endroit pour voir le
// sprite choisi » demandé : ici en grand dans l'en-tête, et en vignette dans
// la galerie d'allures.
function _bnPortrait(sprite, px) {
  const size = px || 48;
  return `<img class="base-npc-portrait" src="${_bnSpriteUrl(sprite)}" alt=""`
    + ` data-style="width:auto;height:${size}px;image-rendering:pixelated;vertical-align:middle">`;
}

// ——— Brouillon ————————————————————————————————————————————————————————————
// L'équipe est manipulée en Pokémon INSTANCIÉS (createPoke) pour que les
// cartes des presets s'affichent exactement pareil (PV, stats, attaques).
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
  // repli minimal (tests headless sans fabrique)
  return { id: mon.id, level: mon.level, name: _bnMonName(mon.id), moves: [],
    currentHP: 1, maxHP: 1, heldItem: mon.item || null, shiny: !!mon.shiny };
}

// Instantané GELÉ à partir d'un Pokémon instancié.
function _bnFreeze(p) {
  return {
    id: p.id | 0,
    level: Math.min(100, Math.max(1, p.level | 0 || 5)),
    moves: (Array.isArray(p.moves) ? p.moves : []).map((m) => (m && m.id) || m).filter(Boolean).slice(0, 4),
    talent: p.talent || null,
    shiny: !!(p.shiny || p.shinyActive),
    item: p.heldItem || null,
  };
}

function _bnDraft() {
  if (_baseNpcEd.draft) return _baseNpcEd.draft;
  const st = _bnState();
  const npc = (st && _baseNpcEd.npcId) ? baseNpcFind(st, _baseNpcEd.npcId) : null;
  _baseNpcEd.draft = {
    name: (npc && npc.name) || '',
    sprite: (npc && npc.sprite) || (typeof BASE_NPC_SPRITE_DEFAULT !== 'undefined' ? BASE_NPC_SPRITE_DEFAULT : 'trainer-0'),
    team: ((npc && npc.team) || []).map((m) => _bnInstantiate(m)),
    msgs: {
      pre: (npc && npc.msgs && npc.msgs.pre) || '',
      win: (npc && npc.msgs && npc.msgs.win) || '',
      lose: (npc && npc.msgs && npc.msgs.lose) || '',
    },
  };
  return _baseNpcEd.draft;
}

// ——— Carte d'un membre — IDENTIQUE à l'éditeur de presets ————————————————
function _bnCardHtml(p, i) {
  if (!p) {
    return `<div class="pw-drop-zone preset-slot-empty" data-action="legacy-call" data-call="baseNpcEditorPick" data-call-args="${i}">`
      + `<div class="pw-text-lg">+</div><div class="pw-text-sm pw-light2 pw-bold">${_bnT('base.npced.add_mon')}</div></div>`;
  }
  if (typeof generatePokeCardHTML === 'function') {
    return generatePokeCardHTML(p, i, {
      isActive: false,
      isFainted: false,
      showMoves: true,
      showXP: false,
      showStatus: false,
      movesAsBars: false,
      // Passe 49 : attaques réordonnables au glisser-déposer, comme dans les
      // Passe 50 : attaques déplaçables avec le handler UNIQUE de l'équipe
      // (attribut standard data-move-drag) ; le contexte déclaré par
      // baseNpcInstallDrag() redirige l'échange vers l'équipe du PNJ.
      movesDraggable: true,
      moveInfoContextless: true,
      // clic sprite = changer de Pokémon ; clic badge objet = objet tenu
      onLeftClickSprite: `baseNpcEditorPick(${i})`,
      onLeftClickItem: `baseNpcEditorPickItem(${i})`,
      spriteTitle: _bnT('base.npced.pick_hint'),
    });
  }
  return `<div class="pw-drop-zone" data-action="legacy-call" data-call="baseNpcEditorPick" data-call-args="${i}">`
    + `<div class="pw-text-sm">${_bnEsc(_bnMonName(p.id))} Nv.${p.level}</div></div>`;
}

function _bnGalleryHtml(cur) {
  return _bnSprites().map((s) =>
    `<button type="button" class="base-npc-look${s === cur ? ' sel' : ''}" title="${_bnEsc(s)}"
       data-action="legacy-call" data-call="baseNpcEditorSetSprite" data-call-args="'${s}'">
       ${_bnPortrait(s, 40)}
     </button>`).join('');
}

function _bnPresetOptions() {
  const out = [`<option value="active">${_bnT('base.npced.from_preset_active')}</option>`];
  const G_ = (typeof G !== 'undefined') ? G : null;
  const presets = (G_ && G_.teamPresets) || {};
  for (const pk of Object.keys(presets)) {
    const p = presets[pk] || {};
    const n = (p.uids || []).length;
    if (!n) continue;
    out.push(`<option value="${_bnEsc(pk)}">${_bnEsc(p.name || pk)} (${n})</option>`);
  }
  return out.join('');
}

function _bnFormHtml() {
  const d = _bnDraft();
  const cards = [];
  const shown = Math.min(6, d.team.length + (d.team.length < 6 ? 1 : 0)) || 1;
  for (let i = 0; i < shown; i++) cards.push(_bnCardHtml(d.team[i] || null, i));
  return `<small class="preset-manager-hint">${_bnT('base.npced.hint')}</small>
  <div class="preset-list">
    <div class="preset-row">
      <span class="preset-row-idx">${_bnPortrait(d.sprite, 56)}</span>
      <div class="pw-flex-1">
        <input class="preset-name-input" maxlength="18" value="${_bnEsc(d.name)}"
               data-change-call="baseNpcEditorSetField" data-change-args="'name', this.value"
               placeholder="${_bnEsc(_bnT('base.npced.name'))}" aria-label="${_bnEsc(_bnT('base.npced.name'))}">
        <div class="pw-text-sm pw-light1">${_bnT('base.npced.sprite')}</div>
      </div>
    </div>
  </div>
  <div class="base-npc-looks">${_bnGalleryHtml(d.sprite)}</div>
  <div class="pw-row pw-btn-group">
    <b>${_bnT('base.npced.team', { n: d.team.length })}</b>
    <span class="pw-text-sm pw-light1">${_bnT('base.npced.level_auto')}</span>
    <select class="preset-name-input" id="base-npced-preset" aria-label="${_bnEsc(_bnT('base.npced.from_preset'))}">${_bnPresetOptions()}</select>
    <button class="hbtn" data-action="legacy-call" data-call="baseNpcEditorImportPreset" data-call-args="">${_bnT('base.npced.from_preset')}</button>
  </div>
  <div id="base-npced-team" class="team-view">${cards.join('')}</div>
  <div class="pw-row pw-btn-group"><b>${_bnT('base.npced.quotes')}</b></div>
  <div class="preset-list">
    ${['pre', 'win', 'lose'].map((q) => `<div class="preset-row">
      <span class="preset-row-count">${_bnT('base.npced.quote_' + q)}</span>
      <input class="preset-name-input" maxlength="80" value="${_bnEsc(d.msgs[q])}"
             data-change-call="baseNpcEditorSetQuote" data-change-args="'${q}', this.value"
             aria-label="${_bnEsc(_bnT('base.npced.quote_' + q))}">
    </div>`).join('')}
  </div>
  <div class="pw-btn-group">
    <button class="hbtn" data-action="legacy-call" data-call="baseNpcEditorSave" data-call-args="">${_bnT('base.npced.save')}</button>
    <button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="baseNpcEditorDelete" data-call-args="">${_bnT('base.npced.delete')}</button>
    <button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="closeBaseNpcEditor" data-call-args="">${_bnT('base.npced.back')}</button>
  </div>`;
}

// ——— Sélecteur de Pokémon — CLONE de celui des presets ————————————————————
function _bnCandidates() {
  const G_ = (typeof G !== 'undefined') ? G : null;
  if (!G_) return [];
  const out = [];
  for (const p of (G_.team || [])) {
    if (p && p.id) out.push({ p, where: 'team', tag: (typeof t === 'function' ? t('preset_in_team_tag') : 'Équipe') });
  }
  const boxed = Object.entries(G_.collection || {}).filter(([, p]) => p && p.id);
  boxed.sort((a, b) => (Number(a[1].id) || 0) - (Number(b[1].id) || 0));
  for (const [, p] of boxed) {
    out.push({ p, where: 'box', tag: (typeof t === 'function' ? (t('box_pc_location') || 'Boîte') : 'Boîte') });
  }
  return out;
}

function renderBaseNpcPicker() {
  const inner = document.getElementById('poke-modal-inner');
  if (!inner) return false;
  const q = _baseNpcEd.search || '';
  let cands = _bnCandidates();
  if (q) cands = cands.filter((c) => (_bnMonName(c.p.id) + ' ' + c.p.id).toLowerCase().includes(q));
  const slot = _baseNpcEd.pickSlot;
  const d = _bnDraft();
  _baseNpcEd._cands = cands;
  const rows = cands.slice(0, 120).map((c, k) => {
    const spr = (typeof spriteImg === 'function')
      ? spriteImg(c.p.id, c.p.emoji, { size: 34, shiny: !!c.p.shinyActive }) : '';
    return `<div class="inv-item preset-pick-row" data-action="legacy-call" data-call="baseNpcEditorPickChoose" data-call-args="${slot}, ${k}">
      <div class="inv-icon">${spr}</div>
      <div class="pw-flex-1"><div class="inv-name">${_bnEsc(_bnMonName(c.p.id))} <small class="pw-light1">#${c.p.id} · Nv.${c.p.level || 1}</small></div></div>
      <span class="preset-pick-tag ${c.where === 'box' ? 'in-box' : ''}">${_bnEsc(c.tag)}</span>
    </div>`;
  }).join('');
  const hasMember = d.team[slot] !== undefined;
  _pwSetHtmlSafe(inner,
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">🔍</span>`
    + `<div class="pw-info-head-text"><div class="pw-info-name">${_bnT('base.npced.pick_title')}</div>`
    + `<div class="pw-text-sm pw-light1">${_bnEsc(d.name || _bnT('base.npced.title'))} · ${slot + 1}/6</div></div></div>`
    + `<span class="modal-close" data-action="legacy-call" data-call="renderBaseNpcEditor" data-call-args=""></span></div>`
    + `<input class="dict-search preset-pick-search" data-action="filter-base-npc-picker" value="${_bnEsc(q)}" placeholder="${_bnEsc(_bnT('base.npced.pick_search'))}">`
    + `<div class="preset-pick-list">${rows || `<div class="pw-empty-state-md">—</div>`}</div>`
    + `<div class="pw-btn-group">`
    + (hasMember ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="baseNpcEditorRemoveMon" data-call-args="${slot}">${_bnT('base.npced.remove_mon')}</button>` : '')
    + `<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="renderBaseNpcEditor" data-call-args="">${_bnT('base.npced.back')}</button></div>`);
  const inp = inner.querySelector('.preset-pick-search');
  if (inp && q) {
    try { inp.focus({ preventScroll: true }); } catch (_) { inp.focus(); }
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
  return true;
}

// ——— Sélecteur d'OBJET TENU — CLONE de celui des presets ————————————————
// Différence assumée : un PNJ n'est pas un membre de l'équipe du joueur, donc
// l'objet est COPIÉ dans l'instantané (aucun retrait de l'inventaire, aucun
// verrou « déjà équipé par »). Le joueur habille librement ses PNJ.
function renderBaseNpcItemPicker() {
  const inner = document.getElementById('poke-modal-inner');
  const d = _bnDraft();
  const slot = _baseNpcEd.itemSlot;
  const p = d.team[slot];
  if (!inner || !p) { return renderBaseNpcEditor(); }
  const ITEMS_ = (typeof ITEMS !== 'undefined') ? ITEMS : {};
  const isEquippable = (typeof isHeldEquippableItem === 'function')
    ? isHeldEquippableItem : (k) => !!(ITEMS_[k] && (ITEMS_[k].type === 'held' || ITEMS_[k].buff));
  const nameOf = (k) => (typeof getItemName === 'function') ? getItemName(k) : k;
  const descOf = (k) => (typeof getItemDesc === 'function') ? getItemDesc(k) : '';
  const sprOf = (k, n) => (typeof itemSpriteHtml === 'function') ? itemSpriteHtml(k, n) : '';
  const current = p.heldItem || null;
  const keys = Object.keys(ITEMS_).filter(isEquippable).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const rows = keys.map((key) => `<div class="inv-item preset-pick-row"
      data-action="legacy-call" data-call="baseNpcEditorEquipItem" data-call-args="${slot}, '${key}'"
      ${key === current ? 'data-style="outline:1px solid var(--green);border-radius:8px"' : ''}
      data-context-call="openItemInfo" data-context-args="'${key}'">
      <div class="inv-icon">${sprOf(key, 34)}</div>
      <div class="pw-flex-1"><div class="inv-name">${_bnEsc(nameOf(key))}</div><div class="inv-desc">${_bnEsc(descOf(key))}</div></div>
    </div>`).join('');
  _pwSetHtmlSafe(inner,
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">${sprOf(current || '', 30)}</span>`
    + `<div class="pw-info-head-text"><div class="pw-info-name">${_bnT('base.npced.pick_item_title', { name: _bnMonName(p.id) })}</div>`
    + `<div class="pw-text-sm pw-light1">${current ? _bnEsc(nameOf(current)) : _bnT('base.npced.no_item')}</div></div></div>`
    + `<span class="modal-close" data-action="legacy-call" data-call="renderBaseNpcEditor" data-call-args=""></span></div>`
    + `<div class="preset-pick-list">${rows || `<div class="pw-empty-state-md">—</div>`}</div>`
    + `<div class="pw-btn-group">`
    + (current ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="baseNpcEditorClearItem" data-call-args="${slot}">${_bnT('base.npced.remove_item')}</button>` : '')
    + `<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="renderBaseNpcEditor" data-call-args="">${_bnT('base.npced.back')}</button></div>`);
  return true;
}

// ——— Glisser-déposer : celui de l'ÉQUIPE, rien d'autre (passe 50) ————————
// Retour utilisateur : « les drag & drop ne sont pas les mêmes dans le PNJ,
// les presets et l'équipe : garder uniquement celui de l'équipe ». On ne
// réimplémente donc plus rien ici : on déclare seulement le CONTEXTE (où lire
// l'équipe, comment échanger) et le handler unique de team-ui.js fait le
// reste — même geste, mêmes vignettes, mêmes previews.
function baseNpcInstallDrag() {
  // Passe 51 : glisser-déposer STRICTEMENT identique à celui de l'équipe —
  // on déclare le contexte, puis on installe les mêmes écouteurs (cartes et
  // attaques). Plus une ligne de code de drag spécifique aux PNJ.
  if (typeof pwSetMoveDragContext === 'function') {
    pwSetMoveDragContext({
      getTeam: () => _bnDraft().team,
      swapMoves: (pi, a, b) => baseNpcEditorSwapMove(pi, a, b),
      swapPokes: (a, b) => baseNpcEditorSwap(a, b),
    });
    if (typeof installMoveDragDrop === 'function') installMoveDragDrop();
  }
  if (typeof installCardDragAndDrop === 'function') {
    installCardDragAndDrop(document.getElementById('base-npced-team'));
  }
}

// Échange deux Pokémon de l'équipe du PNJ.
function baseNpcEditorSwap(from, to) {
  const d = _bnDraft();
  if (from === to || !d.team[from] || !d.team[to]) return renderBaseNpcEditor();
  const tmp = d.team[from];
  d.team[from] = d.team[to];
  d.team[to] = tmp;
  return renderBaseNpcEditor();
}

// Réordonne deux attaques d'un même Pokémon du PNJ.
function baseNpcEditorSwapMove(slot, from, to) {
  const d = _bnDraft();
  const p = d.team[slot];
  if (!p || !Array.isArray(p.moves) || from === to) return renderBaseNpcEditor();
  if (!p.moves[from] || !p.moves[to]) return renderBaseNpcEditor();
  const tmp = p.moves[from];
  p.moves[from] = p.moves[to];
  p.moves[to] = tmp;
  return renderBaseNpcEditor();
}

// ——— Rendu / ouverture / fermeture ————————————————————————————————————————
function renderBaseNpcEditor() {
  const inner = document.getElementById('poke-modal-inner');
  const st = _bnState();
  if (!inner || !st) return false;
  _baseNpcEd.pickSlot = null; _baseNpcEd.itemSlot = null;
  const d = _bnDraft();
  _pwSetHtmlSafe(inner,
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">${_bnPortrait(d.sprite, 28)}</span>`
    + `<div class="pw-info-head-text"><div class="pw-info-name">${_bnT('base.npced.title')}</div></div></div>`
    + `<span class="modal-close" data-action="legacy-call" data-call="closeBaseNpcEditor" data-call-args=""></span></div>`
    + _bnFormHtml());
  baseNpcInstallDrag();
  return true;
}

// Ouvre l'éditeur SUR un PNJ posé (celui sélectionné dans la salle).
function openBaseNpcEditor(npcId) {
  const modal = document.getElementById('poke-modal');
  const st = _bnState();
  if (!modal || !st) return false;
  const npc = npcId ? baseNpcFind(st, npcId) : null;
  if (!npc) return false;
  _baseNpcEd.npcId = npcId; _baseNpcEd.draft = null;
  _baseNpcEd.pickSlot = null; _baseNpcEd.itemSlot = null; _baseNpcEd.search = '';
  if (!renderBaseNpcEditor()) return false;
  window._pwPokeSheet = null;
  if (typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
  modal.classList.add('preset-editor-modal');
  modal.classList.add('open');
  try { document.getElementById('poke-modal-inner').scrollTop = 0; } catch (_) { /* noop */ }
  return true;
}

function closeBaseNpcEditor() {
  if (typeof pwClearMoveDragContext === 'function') pwClearMoveDragContext();
  _baseNpcEd.npcId = null; _baseNpcEd.draft = null;
  _baseNpcEd.pickSlot = null; _baseNpcEd.itemSlot = null; _baseNpcEd.search = '';
  const modal = document.getElementById('poke-modal');
  if (modal) { modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); }
  if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
  return true;
}

// ——— Actions ——————————————————————————————————————————————————————————————
function baseNpcEditorSetField(field, value) {
  const d = _bnDraft();
  if (field === 'name') d.name = String(value || '').slice(0, 18);
  else if (field === 'sprite' && _bnSprites().includes(value)) d.sprite = value;
  return true;
}

function baseNpcEditorSetSprite(sprite) {
  const d = _bnDraft();
  if (_bnSprites().includes(sprite)) d.sprite = sprite;
  return renderBaseNpcEditor();
}

function baseNpcEditorSetQuote(which, value) {
  const d = _bnDraft();
  if (['pre', 'win', 'lose'].includes(which)) d.msgs[which] = String(value || '').slice(0, 80);
  return true;
}

function baseNpcEditorPick(slot) {
  _baseNpcEd.pickSlot = Number(slot);
  _baseNpcEd.search = '';
  // Passe 48 (retour utilisateur) : on ouvre le VRAI sélecteur « boîte PC »,
  // le même que pour changer un Pokémon de l'équipe active et que dans les
  // presets. Repli sur la liste interne si le module n'est pas disponible.
  if (typeof openUnifiedSelectorModal === 'function') {
    openUnifiedSelectorModal('basenpc_slot_' + Number(slot));
    return true;
  }
  return renderBaseNpcPicker();
}

// Retour du sélecteur « boîte PC » : on GÈLE une copie du Pokémon choisi
// (niveau, attaques, talent, chromatique, objet tenu) puis on rouvre la fiche.
function baseNpcEditorAcceptPick(slot, p) {
  if (!p) return false;
  const d = _bnDraft();
  slot = Number(slot);
  const mon = _bnInstantiate(_bnFreeze(p));
  if (slot >= d.team.length) d.team.push(mon); else d.team.splice(slot, 1, mon);
  if (d.team.length > 6) d.team.length = 6;
  _baseNpcEd.pickSlot = null;
  const modal = document.getElementById('poke-modal');
  if (modal) { modal.classList.add('preset-editor-modal'); modal.classList.add('open'); }
  return renderBaseNpcEditor();
}

function baseNpcPickerFilter(v) {
  _baseNpcEd.search = String(v || '').toLowerCase().trim();
  return renderBaseNpcPicker();
}

// Choix d'un Pokémon : instantané GELÉ — niveau, attaques, talent et
// chromatique viennent du Pokémon RÉEL (aucune saisie de niveau).
function baseNpcEditorPickChoose(slot, idx) {
  const c = (_baseNpcEd._cands || [])[Number(idx)];
  if (!c) return renderBaseNpcEditor();
  const d = _bnDraft();
  slot = Number(slot);
  const mon = _bnInstantiate(_bnFreeze(c.p));
  if (slot >= d.team.length) d.team.push(mon); else d.team.splice(slot, 1, mon);
  if (d.team.length > 6) d.team.length = 6;
  _baseNpcEd.pickSlot = null; _baseNpcEd.search = '';
  return renderBaseNpcEditor();
}

function baseNpcEditorRemoveMon(index) {
  const d = _bnDraft();
  d.team.splice(index | 0, 1);
  _baseNpcEd.pickSlot = null;
  return renderBaseNpcEditor();
}

function baseNpcEditorPickItem(slot) {
  const d = _bnDraft();
  const p = d.team[Number(slot)];
  if (!p) return false;
  _baseNpcEd.itemSlot = Number(slot);
  // Passe 49 : même écran que l'équipe active — le SAC plein écran. L'objet
  // est COPIÉ dans l'instantané du PNJ (jamais retiré de l'inventaire).
  if (typeof openHeldItemPickerFor === 'function' && typeof openFullscreenPanel === 'function'
      && typeof closeUnifiedSelectorModal === 'function') {
    const modal = document.getElementById('poke-modal');
    if (modal) modal.classList.remove('open');
    openHeldItemPickerFor(_bnMonName(p.id), p.heldItem || null,
      (key) => { baseNpcEditorEquipItem(Number(slot), key); _bnReopen(); },
      () => { baseNpcEditorClearItem(Number(slot)); _bnReopen(); });
    return true;
  }
  return renderBaseNpcItemPicker();
}

// Rouvre la fiche du PNJ après un passage par le sac / la boîte PC.
function _bnReopen() {
  const modal = document.getElementById('poke-modal');
  if (modal) { modal.classList.add('preset-editor-modal'); modal.classList.add('open'); }
  renderBaseNpcEditor();
}

function baseNpcEditorEquipItem(slot, key) {
  const d = _bnDraft();
  const p = d.team[Number(slot)];
  if (!p) return false;
  p.heldItem = key;
  if (typeof notify === 'function' && typeof getItemName === 'function') {
    notify(_bnT('base.npced.item_set', { name: _bnMonName(p.id), item: getItemName(key) }), 'var(--green)');
  }
  return renderBaseNpcEditor();
}

function baseNpcEditorClearItem(slot) {
  const d = _bnDraft();
  const p = d.team[Number(slot)];
  if (!p) return false;
  p.heldItem = null;
  return renderBaseNpcEditor();
}

function baseNpcEditorImportPreset() {
  const sel = document.getElementById('base-npced-preset');
  const key = sel ? sel.value : 'active';
  const team = (typeof baseNpcTeamFromPreset === 'function') ? baseNpcTeamFromPreset(key) : [];
  if (!team.length) {
    if (typeof notify === 'function') notify(_bnT('base.err.npc_team'), 'var(--red)');
    return false;
  }
  _bnDraft().team = team.map((m) => _bnInstantiate(m));
  if (typeof notify === 'function') notify(_bnT('base.npced.imported', { n: team.length }), 'var(--green)');
  return renderBaseNpcEditor();
}

function baseNpcEditorSave() {
  const st = _bnState();
  const d = _bnDraft();
  if (!st || !_baseNpcEd.npcId) return false;
  const res = baseNpcUpdate(st, _baseNpcEd.npcId, {
    name: d.name || _bnT('base.debug.npc_name'),
    sprite: d.sprite,
    team: d.team.map((p) => _bnFreeze(p)),
    msgs: d.msgs,
  });
  if (!res || !res.ok) {
    if (typeof notify === 'function') notify(_bnT(res && res.reason ? res.reason : 'base.err.npc_team'), 'var(--red)');
    return false;
  }
  if (typeof notify === 'function') {
    notify(_bnT('base.npced.updated', { name: d.name || _bnT('base.debug.npc_name') }), 'var(--green)');
  }
  if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
  return closeBaseNpcEditor();
}

function baseNpcEditorDelete() {
  const st = _bnState();
  if (!st || !_baseNpcEd.npcId) return false;
  const npc = baseNpcFind(st, _baseNpcEd.npcId);
  if (!npc) return false;
  const name = npc.name;
  const npcId = _baseNpcEd.npcId;
  const doDelete = function () {
    if (baseNpcDelete(st, npcId)) {
      if (typeof notify === 'function') notify(_bnT('base.npced.deleted', { name }), 'var(--green)');
    }
    closeBaseNpcEditor();
  };
  // Panneau de confirmation unifié — repli window.confirm si indisponible.
  if (typeof pwConfirm === 'function') {
    pwConfirm(_bnT('base.npced.delete_confirm', { name }), doDelete, { danger: true, title: '🗑️ ' + name });
    return true;
  }
  if (typeof confirm === 'function' && !confirm(_bnT('base.npced.delete_confirm', { name }))) return false;
  doDelete();
  return true;
}

window.openBaseNpcEditor = openBaseNpcEditor;
window.closeBaseNpcEditor = closeBaseNpcEditor;
window.renderBaseNpcEditor = renderBaseNpcEditor;
window.renderBaseNpcPicker = renderBaseNpcPicker;
window.renderBaseNpcItemPicker = renderBaseNpcItemPicker;
window.baseNpcPickerFilter = baseNpcPickerFilter;
window.baseNpcEditorSetField = baseNpcEditorSetField;
window.baseNpcEditorSetSprite = baseNpcEditorSetSprite;
window.baseNpcEditorSetQuote = baseNpcEditorSetQuote;
window.baseNpcEditorPick = baseNpcEditorPick;
window.baseNpcEditorPickChoose = baseNpcEditorPickChoose;
window.baseNpcEditorAcceptPick = baseNpcEditorAcceptPick;
window.baseNpcEditorRemoveMon = baseNpcEditorRemoveMon;
window.baseNpcEditorPickItem = baseNpcEditorPickItem;
window.baseNpcEditorEquipItem = baseNpcEditorEquipItem;
window.baseNpcEditorClearItem = baseNpcEditorClearItem;
window.baseNpcEditorImportPreset = baseNpcEditorImportPreset;
window.baseNpcEditorSave = baseNpcEditorSave;
window.baseNpcEditorSwap = baseNpcEditorSwap;
window.baseNpcEditorSwapMove = baseNpcEditorSwapMove;
window.baseNpcInstallDrag = baseNpcInstallDrag;
window.baseNpcEditorDelete = baseNpcEditorDelete;
