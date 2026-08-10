/**
 * PokeWorld — UI Component System (Unified)
 * 
 * all the interfaces utilisent this systeme.
 * more of styles inline, more of classes extracted-template-style.
 * 
 * Usage:
 *   Components.modal('Titre', bodyHtml)
 *   Components.button('Click', 'callback', 'args')
 *   Components.panel('Section', '<p>content</p>')
 */
'use strict';

const C = {};
const _t = function(key, fallback) {
  if (typeof t === 'function') { const v = t(key); if (v && v !== key) return v; }
  return fallback || key;
};
const _esc = function(value) {
  if (typeof PokeCore !== 'undefined' && PokeCore.escapeHtml) return PokeCore.escapeHtml(value);
  return String(value == null ? '' : value).replace(/[&<>\"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]; });
};
const _attr = _esc;

// ─── WINDOW / MODAL ───
C.modal = function(title, body, opts) {
  opts = opts || {};
  const ttl = opts.tKey ? _t(opts.tKey, title) : title;
  const icon = opts.icon || '';
  const shell = opts.shell || 'default';
  const w = opts.w ? ' data-style="max-width:var(--pw-modal-w);" style="--pw-modal-w:' + opts.w + 'px"' : '';
  return '<div class="modal-title"><div>' + icon + ' ' + ttl + '</div><span class="modal-close" data-action="close-poke-modal">\u2715</span></div>' +
    '<div class="pw-ui-window management-shell management-' + shell + '"' + w + '>' + body + '</div>';
};

C.modalSimple = function(title, body) {
  return '<div class="modal-title"><div>' + title + '</div><span class="modal-close" data-action="close-poke-modal">\u2715</span></div>' + body;
};

// ─── BUTTON ───
C.button = function(label, action, args, opts) {
  opts = opts || {};
  const variant = opts.variant || (opts.primary ? 'primary' : 'secondary');
  const cls = 'pw-ui-btn hbtn poke-btn poke-btn--' + variant + (opts.cls ? ' ' + opts.cls : '') + (opts.active ? ' active is-active' : '');
  const disabled = opts.disabled ? ' disabled' : '';
  const dataAct = action ? ' data-action="legacy-call" data-call="' + _attr(action) + '"' : '';
  const dataArgs = args !== undefined ? ' data-call-args="' + _attr(args) + '"' : '';
  const style = opts.style ? ' data-inline-css="' + _attr(opts.style) + '"' : '';
  const icon = opts.icon || '';
  const lbl = opts.tKey ? _t(opts.tKey === true ? label : opts.tKey, label) : label;
  return '<button class="' + cls + '"' + dataAct + dataArgs + disabled + style + '>' + (icon ? '<span class="ui-btn-icon">' + icon + '</span>' : '') + (lbl ? '<span class="ui-btn-label">' + _esc(lbl) + '</span>' : '') + '</button>';
};

C.primaryBtn = function(label, action, args) {
  return C.button(label, action, args, { cls: 'primary', variant: 'primary' });
};

C.btnGroup = function(buttons) {
  // buttons: [{label, action, args, opts}]
  return '<div class="btn-group pw-btn-group">' +
    buttons.map(function(b) { return C.button(b.label, b.action, b.args, b.opts || {}); }).join('') +
    '</div>';
};

// ─── TAB SYSTEM ───
C.tabs = function(tabs, activeId) {
  // tabs: [{id, label, tKey, icon, call, args}]
  return '<div class="pw-ui-tabs management-tabs ui-management-tabs">' +
    tabs.map(function(t) {
      const isAct = t.id === activeId ? ' active' : '';
      const lbl = t.tKey ? _t(t.tKey, t.label) : t.label;
      const icon = t.icon || '';
      const call = t.call || 'showTab';
      const args = t.args !== undefined ? t.args : "'" + t.id + "'";
      return '<button class="pw-ui-btn hbtn' + isAct + '" data-action="legacy-call" data-call="' + call + '" data-call-args="' + args + '">' + icon + ' ' + lbl + '</button>';
    }).join('') + '</div>';
};

// ─── PANEL / CARD ───
C.panel = function(title, body, opts) {
  opts = opts || {};
  let cls = opts.cls || 'upgrade-card pw-panel';
  if (cls.indexOf('pw-') === -1) cls += ' pw-panel';
  cls += ' pw-ui-panel';
  const style = opts.style ? ' data-inline-css="' + _attr(opts.style) + '"' : '';
  const t = title ? '<div class="panel-title pw-panel-title">' + _esc(title) + '</div>' : '';
  return '<div class="' + cls + '"' + style + '>' + t + body + '</div>';
};

C.section = function(label, body) {
  return '<div class="info-section pw-section">' +
    (label ? '<div class="info-section-title pw-section-title">' + _esc(label) + '</div>' : '') +
    body + '</div>';
};

// ─── SLOT CARD (for training, hatchery) ───
C.slotCard = function(content, opts) {
  opts = opts || {};
  const cls = 'slot-card' + (opts.active ? ' is-active' : '') + (opts.empty ? ' is-empty' : '');
  const style = opts.style ? ' data-style="' + opts.style + '"' : '';
  return '<div class="' + cls + '"' + style + '>' + content + '</div>';
};

// ─── INFO ROW ───
C.infoRow = function(label, value, opts) {
  opts = opts || {};
  return '<div class="info-row pw-info-row">' +
    '<span class="info-row-label pw-info-label">' + _esc(label) + '</span>' +
    '<span class="info-row-value pw-info-value' + (opts.bold ? ' pw-bold' : '') + '">' + value + '</span></div>';
};

// ─── STAT LINE ───
C.statLine = function(label, value, icon) {
  return '<div class="pw-stat-line"><span class="pw-stat-icon">' + (icon || '') + '</span><span class="pw-stat-label">' + label + '</span><span class="pw-stat-value">' + value + '</span></div>';
};

// ─── PROGRESS BAR ───
C.progress = function(pct, opts) {
  opts = opts || {};
  const value = Math.min(100, Math.max(0, Number(pct) || 0));
  const done = value >= 100 ? ' is-done' : '';
  const cls = 'pw-ui-progress ' + (opts.cls || 'pw-progress') + done;
  return '<div class="' + cls + '" data-pct="' + value + '"><div class="pw-progress-fill" data-pct="' + value + '"></div></div>';
};

// ─── MOVE ROW ───
C.moveRow = function(moveId, isKnown, opts) {
  opts = opts || {};
  const mv = (typeof MOVES !== 'undefined') ? MOVES[moveId] : null;
  if (!mv) return '';
  const name = (typeof getMoveName === 'function') ? getMoveName(moveId) : moveId;
  const type = mv.type || '?';
  const power = mv.power || 0;
  const tCls = (typeof window.typeClass === 'function') ? window.typeClass(type) : '';
  const kCls = isKnown ? 'known' : 'learnable';
  const ctxArgs = "'" + moveId + "'";
  const ctx = opts.noContext ? '' : ' data-context-call="openMoveInfo" data-context-args="' + ctxArgs + '"';
  const typeColor = (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[type]) ? TYPE_COLORS[type] : '#888';
  return '<div class="poke-detail-move-row ' + kCls + '" data-type-color="' + typeColor + '"' + ctx + '>' +
    '<span class="type-badge ' + tCls + '">' + type + '</span>' +
    '<span class="poke-detail-move-name">' + name + '</span>' +
    '<span class="poke-detail-move-meta">' + power + ' ' + _t('power_abbrev', 'PWR') + '</span>' +
    (isKnown ? '<span class="poke-detail-pill is-known">\u2713</span>' : '<span class="poke-detail-pill">+</span>') +
    '</div>';
};

// ─── TYPE BADGE ───
C.typeBadge = function(type) {
  if (!type) return '';
  const key = String(type).toLowerCase();
  const color = (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[key]) ? TYPE_COLORS[key] : '#888';
  return '<span class="pw-ui-badge type-badge type-' + _attr(key) + '" data-type-color="' + _attr(color) + '">' + _esc(type) + '</span>';
};

// ─── SPRITE ───
C.sprite = function(id, size, shiny) {
  size = size || 48;
  if (typeof spriteImg === 'function') return spriteImg(id, '', { size: size, shiny: !!shiny });
  return '<span data-style="font-size:var(--ii-fs);" style="--ii-fs:' + size + 'px;">\u2753</span>';
};

// ─── ITEM ICON ───
C.itemIcon = function(key, size) {
  size = size || 32;
  if (typeof itemSpriteHtml === 'function') return itemSpriteHtml(key, size);
  if (typeof itemIcon === 'function') return itemIcon(key, size);
  return '<span>\uD83D\uDCE6</span>';
};

// ─── EMPTY STATE ───
C.empty = function(message, icon) {
  return '<div class="pw-empty"><div class="pw-empty-icon">' + (icon || '\u25C7') + '</div><div class="pw-empty-text">' + message + '</div></div>';
};

// ─── GRID ───
C.grid = function(items, renderFn, cols) {
  cols = cols || 'auto-fill, minmax(200px, 1fr)';
  return '<div class="pw-grid" data-style="display:grid;grid-template-columns:repeat(' + cols + ');gap:12px;">' +
    items.map(renderFn).join('') + '</div>';
};

// ─── LABELED SELECT ───
C.select = function(label, options, current, changeCall, changeArgs) {
  const opts = options.map(function(o) {
    const sel = String(o.value) === String(current) ? ' selected' : '';
    const lbl = o.tKey ? _t(o.tKey, o.label) : o.label;
    return '<option value="' + o.value + '"' + sel + '>' + lbl + '</option>';
  }).join('');
  const chg = changeCall ? ' data-change-call="' + changeCall + '" data-change-args="' + changeArgs + '"' : '';
  return '<label class="pw-field"><span class="pw-field-label">' + label + '</span>' +
    '<select class="pw-select"' + chg + '>' + opts + '</select></label>';
};

// ─── AUTO TOGGLE ───
C.autoToggle = function(key, label, enabled, toggleCall) {
  const cls = enabled ? 'is-on' : 'is-off';
  return '<button class="hbtn automation-toggle-btn ' + cls + '" data-action="legacy-call" data-call="' + toggleCall + '" data-call-args="\'' + key + '\'">' +
    '<span>' + label + '</span><b>' + (enabled ? _t('automation_enabled', 'ON') : _t('automation_disabled', 'OFF')) + '</b></button>';
};

// ─── QUEUE CHIP ───
C.queueChip = function(p, removeCall, removeArgs) {
  if (!p) return '';
  const name = p.name || (typeof getPokeName === 'function' ? getPokeName(p.id) : '#' + p.id);
  return '<div class="queue-chip">' +
    C.sprite(p.id, 28, !!(p.shinyActive || p.shiny)) +
    '<span>' + name + ' \u00B7 Nv.' + (p.level || 1) + '</span>' +
    (removeCall ? '<button class="queue-remove-btn" data-action="legacy-call" data-call="' + removeCall + '" data-call-args="' + removeArgs + '">\u2715</button>' : '') +
    '</div>';
};

// ─── HEADER ROW ───
C.headerRow = function(left, right) {
  return '<div class="pw-header-row" data-style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<div>' + left + '</div><div>' + (right || '') + '</div></div>';
};

// ─── TRANSLATED TEXT ───
C.text = function(key, fallback) { return _t(key, fallback); };

// ─── BALISE OF RARETE ───
C.rarityStars = function(rarity) {
  let s = '';
  for (let i = 0; i < Math.min(5, rarity || 1); i++) s += '\u2605';
  return s;
};

// ─── MODE BADGE ───
C.modeBadge = function(label, color) {
  color = color || 'var(--light1)';
  return '<span class="mode-badge" data-type-color="' + _attr(color) + '">' + _esc(label) + '</span>';
};

// ─── ACTIONS BAR ───
C.actions = function(buttons) {
  return '<div class="pw-actions" data-style="display:flex;gap:8px;margin-top:8px;">' +
    buttons.map(function(b) { return C.button(b.label, b.action, b.args, b.opts || {}); }).join('') +
    '</div>';
};

// T2 (wave 37): ESM module — native export + surface kept on the global object.
export { C as Components };
export default C;
if (typeof globalThis !== 'undefined') globalThis.Components = C;
