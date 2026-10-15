// PokeWorld — P0 · Fenêtre « Poké Balls » (dashboard, à la PokéClicker)
//
// Table Name | Ball | Qté en grille (colonnes parfaitement alignées).
// Chaque ligne = un FILTRE de capture (prioritaire : la 1ʳᵉ correspondance
// décide de la ball lancée).
// - clic sur le nom → active/désactive le filtre (grisé) ;
// - clic sur l'emplacement Ball (0 si aucune) → modal de sélection AVEC effets ;
// - ⚙ → éditeur : créer / réinitialiser / réordonner par drag & drop /
//   renommer / bouton « Modifier les paramètres » (panneau d'options +/−) / supprimer.
// L'ACHAT se fait dans les boutiques des lieux.

// Shared safe-HTML service (canonical sink).
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

const PICKER_CSS = `
.pw-ball-panel{display:flex;flex-direction:column;gap:4px;padding:4px;}
.pw-ball-grid{display:grid;grid-template-columns:1fr 52px 52px;align-items:stretch;gap:4px;}
.pw-ball-head-name{font-size:11px;letter-spacing:.06em;color:var(--pw-text-secondary,#C8BBA0);padding:8px 4px 2px;text-align:left;}
.pw-ball-col{text-align:center;font-size:11px;letter-spacing:.06em;color:var(--pw-text-secondary,#C8BBA0);}
.pw-ball-row{display:contents;}
.pw-ball-row-cell{border-radius:var(--pw-radius-md,8px);background:var(--pw-bg-header,#1C1A17);border:1px solid var(--pw-border-color,#4A3E31);min-height:32px;display:flex;align-items:center;}
.pw-ball-row-name{padding:0 8px;font-size:13px;color:var(--pw-text-primary,#ECDEB7);cursor:default;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pw-ball-row-ball{justify-content:center;cursor:pointer;}
.pw-ball-row-qty{justify-content:center;font-size:12px;color:var(--pw-text-primary,#ECDEB7);font-variant-numeric:tabular-nums;}
.pw-ball-row.off .pw-ball-row-cell{opacity:.35;}
.pw-ball-row-pad{background:none;border:none;}
.pw-ball-none{color:var(--pw-text-secondary,#999);font-weight:700;font-variant-numeric:tabular-nums;}
#pw-ball-overlay-root button{min-width:0;min-height:0;}
#pw-ball-overlay-root button[data-action]{background:var(--pw-bg-header,#1C1A17);}
.pw-ball-picker,.pw-ball-editor{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);}
.pw-ball-box{background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:var(--pw-radius-lg,12px);padding:14px;min-width:460px;max-width:94vw;max-height:86vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.5);}
.pw-ball-title{font-size:14px;color:var(--pw-text-primary,#ECDEB7);margin-bottom:8px;font-weight:700;}
.pw-ball-row-opt{display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:var(--pw-radius-md,8px);cursor:pointer;border:1px solid transparent;}
.pw-ball-row-opt:hover{background:var(--pw-bg-header,#1C1A17);}
.pw-ball-row-opt.selected{background:var(--pw-accent-color,#FFA500);border-color:var(--pw-accent-color,#FFA500);}
.pw-ball-name-block{flex:1;display:flex;flex-direction:column;gap:1px;min-width:0;}
.pw-ball-name{font-size:13px;color:var(--pw-text-primary,#ECDEB7);font-weight:700;}
.pw-ball-desc{font-size:10.5px;color:var(--pw-text-secondary,#C8BBA0);line-height:1.25;}
.pw-ball-row-opt.selected .pw-ball-name{color:#1C1A17;}
.pw-ball-row-opt.selected .pw-ball-desc{color:rgba(28,26,23,.82);}
.pw-ball-qty2{font-size:12px;color:var(--pw-text-secondary,#C8BBA0);font-variant-numeric:tabular-nums;}
.pw-ball-row-opt.selected .pw-ball-qty2{color:#1C1A17;font-weight:700;}
.pw-ball-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.pw-ball-editor-top{display:flex;gap:8px;margin-bottom:6px;}
.pw-ball-editor-note{font-size:11px;color:var(--pw-text-secondary,#C8BBA0);margin-bottom:8px;}
.pw-ball-filter-row{display:flex;flex-direction:column;gap:6px;padding:7px 8px;border-radius:var(--pw-radius-md,8px);background:var(--pw-bg-header,#1C1A17);border:1px solid var(--pw-border-color,#4A3E31);margin-bottom:6px;}
.pw-ball-filter-row.off{opacity:.4;}
.pw-ball-filter-row.dragging{opacity:.5;border-color:var(--pw-accent-color,#FFA500);}
.pw-ball-filter-top{display:flex;align-items:center;gap:7px;}
.pw-ball-drag{cursor:grab;color:var(--pw-text-secondary,#999);font-size:15px;padding:0 2px;user-select:none;}
.pw-ball-filter-name-input{flex:1;min-width:80px;background:var(--pw-bg-sprite,#191714);border:1px solid var(--pw-border-color,#4A3E31);border-radius:var(--pw-radius-sm,4px);color:var(--pw-text-primary,#ECDEB7);padding:4px 6px;font-size:13px;}
.pw-ball-filter-name{flex:1;min-width:80px;font-size:13px;color:var(--pw-text-primary,#ECDEB7);padding:4px 6px;}
.pw-ball-del-pad{width:24px;flex-shrink:0;}
#pw-ball-overlay-root .pw-ball-switch{position:relative;width:42px;height:22px;background:var(--pw-bg-sprite,#191714) !important;border:1px solid var(--pw-border-color,#4A3E31);border-radius:999px;cursor:pointer;flex-shrink:0;padding:0;transition:background .15s,border-color .15s;}
.pw-ball-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--pw-text-primary,#ECDEB7);transition:left .15s;}
#pw-ball-overlay-root .pw-ball-switch.on{background:var(--pw-color-success,#2ECC71) !important;border-color:var(--pw-color-success,#2ECC71) !important;}
.pw-ball-switch.on::after{left:22px;background:#0F380F;}
.pw-ball-ball-btn{display:flex;align-items:center;justify-content:center;width:36px;cursor:pointer;flex-shrink:0;}
#pw-ball-overlay-root .pw-ball-del{background:none !important;border:none;color:var(--pw-color-danger,#E74C3C) !important;cursor:pointer;font-size:14px;padding:2px 6px;}
#pw-ball-overlay-root .pw-ball-params-toggle{display:block;width:100%;margin-top:2px;background:var(--pw-bg-surface,#24221E) !important;border:1px solid var(--pw-border-color,#4A3E31);border-radius:var(--pw-radius-md,8px);color:var(--pw-text-primary,#ECDEB7);font-size:11px;padding:4px 8px;cursor:pointer;text-align:center;}
.pw-ball-params-toggle:hover{background:var(--pw-bg-header,#1C1A17);}
#pw-ball-overlay-root .pw-ball-params-toggle.on{color:#1C1A17 !important;background:var(--pw-accent-color,#FFA500) !important;border-color:var(--pw-accent-color,#FFA500) !important;font-weight:700;}
.pw-ball-opts{display:flex;flex-direction:column;gap:4px;padding:6px 0 0 0;}
.pw-ball-opt-row{display:flex;align-items:center;gap:8px;min-height:26px;padding:3px 6px;border-radius:var(--pw-radius-sm,4px);}
.pw-ball-opt-row.avail{background:var(--pw-bg-surface,#24221E);}
#pw-ball-overlay-root .pw-ball-opt-btn{width:22px;height:22px;min-width:22px;min-height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;line-height:1;cursor:pointer;border:none;flex-shrink:0;padding:0;}
#pw-ball-overlay-root .pw-ball-opt-btn.add{background:var(--pw-color-success,#2ECC71) !important;color:#fff !important;box-shadow:0 1px 3px rgba(0,0,0,.35);}
.pw-ball-opt-btn.add:hover{filter:brightness(1.1);}
#pw-ball-overlay-root .pw-ball-opt-btn.remove{background:var(--pw-color-danger,#E74C3C) !important;color:#fff !important;box-shadow:0 1px 3px rgba(0,0,0,.35);}
.pw-ball-opt-btn.remove:hover{filter:brightness(1.1);}
.pw-ball-opt-btn:disabled{opacity:.4;cursor:default;}
.pw-ball-opt-label{font-size:12px;color:var(--pw-text-primary,#ECDEB7);}
.pw-ball-sel{background:var(--pw-bg-sprite,#191714);border:1px solid var(--pw-border-color,#4A3E31);border-radius:var(--pw-radius-sm,4px);color:var(--pw-text-primary,#ECDEB7);padding:3px 5px;font-size:12px;max-width:130px;}
.pw-ball-sel:disabled{opacity:.55;}
`;

let _pickerCss = false;
function _ensurePickerCss() {
  if (_pickerCss || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.id = 'pw-ball-picker-css';
  st.textContent = PICKER_CSS;
  document.head.appendChild(st);
  _pickerCss = true;
}

// Emplacement de ball : « 0 » quand aucune ball n'est sélectionnée.
function _ballImg(type, size) {
  const url = typeof ballSpriteUrl === 'function' ? ballSpriteUrl(type) : null;
  const src = url || 'src/assets/images/pokeball/None.svg';
  return (
    '<img class="pw-ball-icon" src="' +
    src +
    '" alt="" style="width:' +
    size +
    'px;height:' +
    size +
    'px;image-rendering:pixelated;">'
  );
}

function pokeballWindowModel() {
  const b = typeof ensurePokeballs === 'function' ? ensurePokeballs() : null;
  const filters = b && Array.isArray(b.filters) ? b.filters : [];
  const rows = filters.map((f) => ({
    id: f.id,
    label: typeof ballFilterLabel === 'function' ? ballFilterLabel(f) : f.id,
    ball: f.ball || 'none',
    qty: f.ball && f.ball !== 'none' ? b[f.ball] || 0 : 0,
    enabled: f.enabled !== false,
  }));
  return { rows };
}

function renderPokeballWindow() {
  if (typeof document === 'undefined') return;
  _ensurePickerCss();
  const el = document.getElementById('pokeballs-window-body');
  if (!el) return;
  const m = pokeballWindowModel();

  // Passe 26l — en-tête de colonnes dans son propre conteneur (lignes réelles,
  // séparations + survol possibles, plus de display:contents).
  const head =
    '<div class="pw-ball-head"><span class="pw-ball-head-name">' +
    (typeof t === 'function' ? t('ball_col_name') : 'Nom') +
    '</span>' +
    '<span class="pw-ball-col">' +
    (typeof t === 'function' ? t('ball_col_ball') : 'Ball') +
    '</span>' +
    '<span class="pw-ball-col">' +
    (typeof t === 'function' ? t('ball_col_qty') : 'Qté') +
    '</span></div>';

  const rows = m.rows
    .map(
      (r) =>
        '<div class="pw-ball-row' +
        (r.enabled ? '' : ' off') +
        '">' +
        '<span class="pw-ball-row-cell pw-ball-row-name">' +
        r.label +
        '</span>' +
        '<span class="pw-ball-row-cell pw-ball-row-ball" data-action="legacy-call" data-call="openBallPicker" data-call-args="\'' +
        r.id +
        '\'" title="' +
        (typeof t === 'function' ? t('ball_cycle_hint') : 'Choisir la ball') +
        '">' +
        _ballImg(r.ball, 22) +
        '</span>' +
        '<span class="pw-ball-row-cell pw-ball-row-qty">' +
        (r.ball !== 'none' ? formatNumber(r.qty) : '0') +
        '</span>' +
        '</div>'
    )
    .join('');

  _pwSetHtmlSafe(
    el,
    '<div class="pw-ball-panel"><div class="pw-ball-grid">' + head + rows + '</div></div>'
  );
}

// ── Sélecteur de ball (avec EFFETS, à la PokéClicker) ──────────────────────
function ballOptionDesc(type) {
  if (type === 'none') return typeof t === 'function' ? t('ball_no_ball_desc') : '';
  // Passe 26e : description dynamique (taux calculé depuis BALL_DEFS), jamais en dur.
  if (typeof getItemDesc === 'function') {
    const d = getItemDesc(type);
    if (d) return d;
  }
  const def = typeof BALL_DEFS !== 'undefined' && BALL_DEFS ? BALL_DEFS[type] : null;
  const rate = def ? def.rate : null;
  return rate != null
    ? typeof tr === 'function'
      ? tr('ball_catch_rate', { rate: rate })
      : 'Taux de capture : ' + rate + '%'
    : '';
}

function openBallPicker(filterId) {
  if (typeof document === 'undefined') return;
  _ensurePickerCss();
  closeBallOverlay();
  const b = typeof ensurePokeballs === 'function' ? ensurePokeballs() : null;
  const f = b && Array.isArray(b.filters) ? b.filters.find((x) => x.id === filterId) : null;
  if (!f) return;
  const current = f.ball || 'none';
  // DORM-06b — toutes les balls de BALL_DEFS (dont les 11 spéciales).
  const allTypes = (
    typeof BALL_DEFS !== 'undefined' && BALL_DEFS
      ? Object.keys(BALL_DEFS)
      : ['pokeball', 'greatball', 'ultraball', 'masterball', 'honorball']
  )
    // V7 · BALL-01 — les balls « ferme » (hidden) n'apparaissent qu'une fois possédées.
    .filter((type) => !(typeof isBallHidden === 'function' && isBallHidden(type)));
  const options = ['none'].concat(allTypes).map((type) => ({
    type,
    name:
      type === 'none'
        ? typeof t === 'function'
          ? t('ball_no_ball')
          : 'Aucune'
        : typeof t === 'function'
          ? t(BALL_DEFS[type].labelKey)
          : type,
    qty: type === 'none' ? 0 : b[type] || 0,
    desc: ballOptionDesc(type),
  }));
  const title = typeof ballFilterLabel === 'function' ? ballFilterLabel(f) : f.id;
  const html =
    '<div class="pw-ball-picker" data-action="legacy-call" data-call="closeBallOverlay" data-call-args="">' +
    '<div class="pw-ball-box" data-action="stop-propagation">' +
    '<div class="pw-ball-title">' +
    title +
    '</div>' +
    options
      .map(
        (o) =>
          '<div class="pw-ball-row-opt' +
          (o.type === current ? ' selected' : '') +
          '" data-action="legacy-call" data-call="pickBallForFilter" data-call-args="\'' +
          filterId +
          "','" +
          o.type +
          '\'">' +
          _ballImg(o.type, 26) +
          '<div class="pw-ball-name-block">' +
          '<span class="pw-ball-name">' +
          o.name +
          '</span>' +
          '<span class="pw-ball-desc">' +
          o.desc +
          '</span>' +
          '</div>' +
          '<span class="pw-ball-qty2">' +
          (o.type !== 'none' ? '× ' + formatNumber(o.qty) : '') +
          '</span>' +
          '</div>'
      )
      .join('') +
    '</div></div>';
  const box = document.createElement('div');
  box.id = 'pw-ball-overlay-root';
  _pwSetHtmlSafe(box, html);
  document.body.appendChild(box);
}

function pickBallForFilter(filterId, type) {
  const b = typeof ensurePokeballs === 'function' ? ensurePokeballs() : null;
  if (b && Array.isArray(b.filters)) {
    const f = b.filters.find((x) => x.id === filterId);
    if (f) f.ball = type;
  }
  // Ne rouvre l'éditeur QUE s'il était déjà ouvert (changer de ball ne doit
  // jamais ouvrir les paramètres de filtres).
  const wasEditor = !!(
    document.getElementById('pw-ball-overlay-root') && document.querySelector('.pw-ball-editor')
  );
  try {
    saveGame();
  } catch (_) {}
  closeBallOverlay();
  renderPokeballWindow();
  if (wasEditor)
    try {
      renderBallFilterEditor();
    } catch (_) {}
}

function closeBallOverlay() {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('pw-ball-overlay-root');
  if (root && root.parentNode) root.remove();
}

// ── Éditeur de filtres (à la PokéClicker) ──────────────────────────────────
// Chaque filtre = une ligne : [drag] [interrupteur activer/désactiver]
// [nom] [ball]. Sous la ligne, un bouton « Modifier les paramètres » PAR FILTRE
// déplie les options À LA VERTICALE : conditions actives en bouton rond « − »
// (rouge), conditions inactives en « + » (vert), type/rencontre en menu.
// Filtres de base (locked) : nom figé, options en lecture seule, ball et
// ordre modifiables.
const FILTER_OPTION_DEFS = [
  { key: 'new', labelKey: 'ball_opt_not_caught' },
  { key: 'caught', labelKey: 'ball_opt_caught' },
  { key: 'shiny', labelKey: 'ball_opt_shiny' },
  { key: 'caughtShiny', labelKey: 'ball_opt_caught_shiny' },
];

// Filtres dont le panneau d'options est déplié (état de session).
const _openOptions = new Set();

// Une option booléenne est-elle active pour ce filtre ?
function ballFilterOptionOn(f, key) {
  const o = f.options || {};
  switch (key) {
    case 'new':
      return o.caught === false;
    case 'caught':
      return o.caught === true;
    case 'shiny':
      return o.shiny === true;
    case 'caughtShiny':
      return o.caughtShiny === true;
    default:
      return false;
  }
}

function toggleFilterOptionsPanel(filterId) {
  if (_openOptions.has(filterId)) _openOptions.delete(filterId);
  else _openOptions.add(filterId);
  renderBallFilterEditor();
}

function openBallFilterEditor() {
  if (typeof document === 'undefined') return;
  _ensurePickerCss();
  closeBallOverlay();
  renderBallFilterEditor();
}

// Ligne d'option booléenne : [−/+ rond] libellé.
function optRow(f, key, labelKey) {
  const locked = !!f.locked;
  const on = ballFilterOptionOn(f, key);
  const label = typeof t === 'function' ? t(labelKey) : key;
  if (on) {
    return (
      '<div class="pw-ball-opt-row">' +
      '<button type="button" class="pw-ball-opt-btn remove"' +
      (locked ? ' disabled' : '') +
      (locked
        ? ''
        : ' data-action="legacy-call" data-call="removeBallFilterOption" data-call-args="\'' +
          f.id +
          "','" +
          key +
          '\'"') +
      '>−</button>' +
      '<span class="pw-ball-opt-label">' +
      label +
      '</span>' +
      '</div>'
    );
  }
  if (locked) return ''; // les filtres de base ne proposent pas d'ajout.
  return (
    '<div class="pw-ball-opt-row avail">' +
    '<button type="button" class="pw-ball-opt-btn add" data-action="legacy-call" data-call="addBallFilterOption" data-call-args="\'' +
    f.id +
    "','" +
    key +
    '\'">+</button>' +
    '<span class="pw-ball-opt-label">' +
    label +
    '</span>' +
    '</div>'
  );
}

// Ligne d'option à valeur (type / rencontre) : [−] libellé [menu] ou [+] libellé.
function valueRow(f, key, labelKey) {
  const locked = !!f.locked;
  const opts = f.options || {};
  const label = typeof t === 'function' ? t(labelKey) : key;
  const active = !!opts[key];
  if (!active) {
    if (locked) return '';
    return (
      '<div class="pw-ball-opt-row avail">' +
      '<button type="button" class="pw-ball-opt-btn add" data-action="legacy-call" data-call="addBallFilterValueOption" data-call-args="\'' +
      f.id +
      "','" +
      key +
      '\'">+</button>' +
      '<span class="pw-ball-opt-label">' +
      label +
      '</span>' +
      '</div>'
    );
  }
  let list, selected;
  if (key === 'type') {
    list = typeof FILTER_TYPES !== 'undefined' && Array.isArray(FILTER_TYPES) ? FILTER_TYPES : [];
    selected = opts.type;
  } else {
    list =
      typeof ENCOUNTER_TYPES !== 'undefined' && Array.isArray(ENCOUNTER_TYPES)
        ? ENCOUNTER_TYPES
        : ['route', 'dungeon', 'dungeon_boss', 'roaming'];
    selected = opts.encounter;
  }
  const options = list
    .map(
      (v) =>
        '<option value="' +
        v +
        '"' +
        (selected === v ? ' selected' : '') +
        '>' +
        (key === 'type'
          ? typeof getTypeName === 'function'
            ? getTypeName(v)
            : v
          : typeof t === 'function'
            ? t('ball_enc_' + v) || v
            : v) +
        '</option>'
    )
    .join('');
  return (
    '<div class="pw-ball-opt-row">' +
    '<button type="button" class="pw-ball-opt-btn remove" data-action="legacy-call" data-call="removeBallFilterValueOption" data-call-args="\'' +
    f.id +
    "','" +
    key +
    '\'">−</button>' +
    '<span class="pw-ball-opt-label">' +
    label +
    '</span>' +
    '<select class="pw-ball-sel"' +
    (locked ? ' disabled' : '') +
    (locked
      ? ''
      : ' onchange="setBallFilterValueOption(\'' + f.id + "','" + key + '\',this.value)"') +
    '>' +
    options +
    '</select>' +
    '</div>'
  );
}

function renderBallFilterEditor() {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('pw-ball-overlay-root');
  const b = typeof ensurePokeballs === 'function' ? ensurePokeballs() : null;
  const filters = b && Array.isArray(b.filters) ? b.filters : [];

  const rows = filters
    .map((f) => {
      const locked = !!f.locked;
      const open = _openOptions.has(f.id);
      const nameField = locked
        ? '<span class="pw-ball-filter-name">' +
          (typeof ballFilterLabel === 'function' ? ballFilterLabel(f) : f.id) +
          '</span>'
        : '<input type="text" class="pw-ball-filter-name-input" value="' +
          (typeof ballFilterLabel === 'function' ? ballFilterLabel(f) : f.id).replace(
            /"/g,
            '&quot;'
          ) +
          '" data-name-input="' +
          f.id +
          '" data-action="stop-propagation">';

      let optsPanel = '';
      if (open) {
        const rowsHtml =
          FILTER_OPTION_DEFS.map((o) => optRow(f, o.key, o.labelKey)).join('') +
          valueRow(f, 'type', 'ball_opt_type') +
          valueRow(f, 'encounter', 'ball_opt_encounter');
        optsPanel = '<div class="pw-ball-opts">' + rowsHtml + '</div>';
      }

      const paramsLabel = open
        ? typeof t === 'function'
          ? t('ball_edit_hide')
          : 'Masquer les paramètres'
        : typeof t === 'function'
          ? t('ball_edit_show')
          : 'Modifier les paramètres';

      return (
        '<div class="pw-ball-filter-row' +
        (f.enabled !== false ? '' : ' off') +
        '" data-filter-id="' +
        f.id +
        '" draggable="false">' +
        '<div class="pw-ball-filter-top">' +
        '<span class="pw-ball-drag" data-drag-handle="' +
        f.id +
        '" title="' +
        (typeof t === 'function' ? t('ball_drag_hint') : 'Glisser pour réordonner') +
        '">⠿</span>' +
        '<button type="button" class="pw-ball-switch' +
        (f.enabled !== false ? ' on' : '') +
        '" data-action="legacy-call" data-call="toggleFilterEnabled" data-call-args="\'' +
        f.id +
        '\'" title="' +
        (typeof t === 'function' ? t('ball_enable') : 'Activer/désactiver le filtre') +
        '" aria-label="' +
        (typeof t === 'function' ? t('ball_enable') : 'Activer/désactiver') +
        '"></button>' +
        nameField +
        '<span class="pw-ball-ball-btn" data-action="legacy-call" data-call="openBallPicker" data-call-args="\'' +
        f.id +
        '\'">' +
        _ballImg(f.ball || 'none', 22) +
        '</span>' +
        (locked
          ? '<span class="pw-ball-del-pad"></span>'
          : '<button type="button" class="pw-ball-del" data-action="legacy-call" data-call="deleteBallFilter" data-call-args="\'' +
            f.id +
            '\'" title="' +
            (typeof t === 'function' ? t('ball_delete') : 'Supprimer') +
            '">✕</button>') +
        '</div>' +
        '<button type="button" class="pw-ball-params-toggle' +
        (open ? ' on' : '') +
        '" data-action="legacy-call" data-call="toggleFilterOptionsPanel" data-call-args="\'' +
        f.id +
        '\'">' +
        paramsLabel +
        '</button>' +
        optsPanel +
        '</div>'
      );
    })
    .join('');

  const html =
    '<div class="pw-ball-editor" data-action="legacy-call" data-call="closeBallOverlay" data-call-args="">' +
    '<div class="pw-ball-box" data-action="stop-propagation">' +
    '<div class="pw-ball-title">' +
    (typeof t === 'function' ? t('ball_settings') : 'Paramètres des Poké Balls') +
    '</div>' +
    '<div class="pw-ball-editor-top">' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="createBallFilter" data-call-args="">' +
    (typeof t === 'function' ? t('ball_new_filter') : 'Nouveau filtre') +
    '</button>' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="resetBallFilters" data-call-args="">' +
    (typeof t === 'function' ? t('ball_reset_filters') : 'Réinitialiser') +
    '</button>' +
    '</div>' +
    '<div class="pw-ball-editor-note">' +
    (typeof t === 'function' ? t('ball_editor_hint') : 'Ordre = priorité.') +
    '</div>' +
    '<div id="pw-ball-filter-list">' +
    rows +
    '</div>' +
    '<div class="pw-ball-actions">' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="closeBallOverlay" data-call-args="">' +
    (typeof t === 'function' ? t('close_btn') : 'Fermer') +
    '</button>' +
    '</div>' +
    '</div></div>';

  if (root) {
    _pwSetHtmlSafe(root, html);
  } else {
    const box = document.createElement('div');
    box.id = 'pw-ball-overlay-root';
    _pwSetHtmlSafe(box, html);
    document.body.appendChild(box);
  }
  installFilterEditorInteractions();
}

// Drag & drop (réordonner par priorité) + édition du nom.
function installFilterEditorInteractions() {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('pw-ball-filter-list');
  if (!list) return;
  let dragId = null;

  list.querySelectorAll('[data-drag-handle]').forEach((handle) => {
    handle.addEventListener('mousedown', () => {
      const row = handle.closest('.pw-ball-filter-row');
      if (!row) return;
      dragId = row.dataset.filterId;
      row.classList.add('dragging');
      row.setAttribute('draggable', 'true');
    });
    handle.addEventListener('mouseup', () => {
      if (dragId) {
        const row = list.querySelector('[data-filter-id="' + dragId + '"]');
        if (row) {
          row.classList.remove('dragging');
          row.setAttribute('draggable', 'false');
        }
        dragId = null;
      }
    });
  });

  list.querySelectorAll('.pw-ball-filter-row').forEach((row) => {
    row.addEventListener('dragover', (ev) => {
      ev.preventDefault();
    });
    row.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const targetId = row.dataset.filterId;
      if (dragId && targetId && dragId !== targetId && typeof reorderBallFilter === 'function') {
        reorderBallFilter(dragId, targetId);
      }
      dragId = null;
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      row.setAttribute('draggable', 'false');
      dragId = null;
    });
  });

  list.querySelectorAll('[data-name-input]').forEach((input) => {
    input.addEventListener('change', () => {
      if (typeof renameBallFilter === 'function')
        renameBallFilter(input.dataset.nameInput, input.value);
    });
  });
}

// --- Surface classique -----------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.pokeballWindowModel = pokeballWindowModel;
  window.renderPokeballWindow = renderPokeballWindow;
  window.openBallPicker = openBallPicker;
  window.pickBallForFilter = pickBallForFilter;
  window.closeBallOverlay = closeBallOverlay;
  window.openBallFilterEditor = openBallFilterEditor;
  window.renderBallFilterEditor = renderBallFilterEditor;
  window.toggleFilterOptionsPanel = toggleFilterOptionsPanel;
}
if (typeof globalThis !== 'undefined') {
  globalThis.pokeballWindowModel = pokeballWindowModel;
  globalThis.renderPokeballWindow = renderPokeballWindow;
  globalThis.openBallPicker = openBallPicker;
  globalThis.pickBallForFilter = pickBallForFilter;
  globalThis.closeBallOverlay = closeBallOverlay;
  globalThis.openBallFilterEditor = openBallFilterEditor;
  globalThis.renderBallFilterEditor = renderBallFilterEditor;
  globalThis.toggleFilterOptionsPanel = toggleFilterOptionsPanel;
}

export {
  pokeballWindowModel,
  renderPokeballWindow,
  openBallPicker,
  pickBallForFilter,
  closeBallOverlay,
  openBallFilterEditor,
  renderBallFilterEditor,
  toggleFilterOptionsPanel,
};
