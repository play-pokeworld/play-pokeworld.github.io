/**
 * PokéWorld UI Components — PokemonCardTemplate (element adapter)
 *
 * Wave 42: convergence of the templates layer. This file IS
 * the former `src/ui/templates/PokemonCardTemplate.js`, moved body-
 * unchanged into the design-system components layer (alongside
 * poke-card.js / poke-full-card.js): a Pokémon card is a
 * COMPONENT, not a window — the two modals consuming it
 * became, for their part, real ECS views (src/ui/views/).
 *
 * SINGLE POKEMON DISPLAY COMPONENT (2026-08 rebuild).
 *
 * Before this pass, at least three code paths produced different Pokemon
 * cards (legacy generatePokeCardHTML, this "lite" ECS template, and ad-hoc
 * blocks). Result: a scattered display depending on the context.
 *
 * From now on, THIS template is the canonical ECS/UI entry point:
 *   - in "full game" mode it delegates to the canonical generator
 *     `generatePokeCardHTML` (battle-team-ui.js) — a single source of truth
 *     for Team, Battle, PC Box, Presets, Hatchery, Atoll, Secret Base;
 *   - in "pure ECS" mode (unit tests with no legacy loaded) it falls back to
 *     a standalone minimal render BUT reusing exactly the same canonical CSS
 *     classes (pw-poke-card / pw-poke-circle-wrap / pw-poke-circle-bg),
 *     hence the same visual design.
 *
 * Unchanged API (consumed by ECS-UI, UnifiedPokemonSelectorModal,
 * UnifiedTeamEditorModal):
 *   new PokemonCardTemplate(poke, options).render() -> HTMLElement
 *
 * @module ui/components/pokemon-card-element
 */


// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

function resolveLegacyCardHtml(poke, options) {
  const gen = (typeof globalThis !== 'undefined' && typeof globalThis.generatePokeCardHTML === 'function'
    ? globalThis.generatePokeCardHTML
    : (typeof window !== 'undefined' && typeof window.generatePokeCardHTML === 'function'
      ? window.generatePokeCardHTML : null));
  if (!gen) return null;
  try {
    return gen(poke, (options && options.index != null ? options.index : 0), {
      isActive: !!options.isActive,
      isEnemy: !!options.isEnemy,
      isFainted: !!(options.isFainted || (poke && poke.currentHP !== undefined && poke.currentHP <= 0)),
      showMoves: options.showMoves !== undefined ? !!options.showMoves : true,
      showXP: !!options.showXP,
      showStatus: !!options.showStatus,
      movesAsBars: !!options.movesAsBars,
      movesDraggable: !!options.movesDraggable,
      itemReadonly: !!options.itemReadonly,
      noSpriteHandlers: !!options.noSpriteHandlers,
      spriteTitle: options.spriteTitle || null,
      moveInfoContextless: !!options.moveInfoContextless,
      onLeftClickSprite: options.onLeftClickSprite || null,
      onRightClickSprite: options.onRightClickSprite || null,
      onLeftClickItem: options.onLeftClickItem || null,
    }) || null;
  } catch (_) {
    return null;
  }
}

function resolveSpriteUrl(poke, options) {
  const num = (poke && poke.id) || 1;
  const isShiny = !!(options.shiny || (poke && (poke.shinyActive || poke.shiny)));
  const gen = (typeof globalThis !== 'undefined' && typeof globalThis.getPokemonSpriteUrl === 'function' && globalThis.getPokemonSpriteUrl)
    || (typeof window !== 'undefined' && typeof window.getPokemonSpriteUrl === 'function' && window.getPokemonSpriteUrl)
    || null;
  if (gen) { try { return gen(num, isShiny); } catch (_) { /* fallthrough */ } }
  return `src/assets/images/pokemon/${isShiny ? 'frontShiny' : 'front'}/${num}.png`;
}

/** Standalone ECS-only render (no legacy present) — same canonical CSS classes. */
function renderStandaloneCard(template) {
  const poke = template.poke || {};
  const options = template.options || {};
  const el = document.createElement('div');
  el.className = 'poke-card pw-poke-card';
  if (options.selected) el.classList.add('is-selected');
  if (poke.currentHP !== undefined && poke.currentHP <= 0) el.classList.add('fainted');
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');

  // Sprite: canonical beige circle + image (same design language as everywhere)
  const size = options.size || 64;
  const wrap = document.createElement('div');
  wrap.className = 'poke-sprite-container large pw-poke-circle-wrap';
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  const circle = document.createElement('div');
  circle.className = 'pw-poke-circle-bg';
  wrap.appendChild(circle);
  const img = document.createElement('img');
  // Wave 18: carry the canonical img class so img.pw-poke-circle-img
  // {width/height:100% !important} caps the sprite inside its circle
  // (before: natural 96px PNG overflowed the 64px wrap, like the wave-17
  // PC-box bug).
  img.className = 'pw-poke-circle-img sprite-img pw-poke-img';
  img.src = resolveSpriteUrl(poke, options);
  img.alt = poke.name || `#${(poke && poke.id) || 1}`;
  img.loading = 'lazy';
  wrap.appendChild(img);
  el.appendChild(wrap);

  // Infos : nom + niveau (typographies canoniques poke-name / poke-level)
  const info = document.createElement('div');
  info.className = 'poke-info';
  const nameRow = document.createElement('div');
  nameRow.className = 'poke-name';
  const nameEl = document.createElement('span');
  nameEl.textContent = poke.name || `P_${poke.id || '?'}`;
  const levelEl = document.createElement('span');
  levelEl.className = 'poke-level';
  levelEl.textContent = `Nv.${poke.level || 1}`;
  nameRow.appendChild(nameEl);
  nameRow.appendChild(levelEl);
  info.appendChild(nameRow);

  if (options.showHP && poke.maxHP) {
    const hpBox = document.createElement('div');
    hpBox.className = 'hp-bar-container';
    const pct = Math.max(0, Math.min(100, Math.floor(((poke.currentHP || 0) / poke.maxHP) * 100)));
    globalThis._pwSetHtmlSafe(hpBox, // Wave 13: inline width (self-contained bar), data-pct contract kept.
      `<div class="hp-bar"><div class="hp-fill ${pct > 50 ? 'high' : pct > 20 ? 'medium' : 'low'}" data-pct="${pct}" style="width:${pct}%"></div></div>` +
      `<div class="hp-text">${poke.currentHP || 0}/${poke.maxHP} PV</div>`);
    info.appendChild(hpBox);
  }
  el.appendChild(info);

  if (options.tag) {
    const tagEl = document.createElement('div');
    tagEl.className = 'poke-status';
    tagEl.textContent = String(options.tag);
    el.appendChild(tagEl);
  }
  return el;
}

export class PokemonCardTemplate {
  /**
   * @param {Object} poke - Pokemon data object
   * @param {Object} [options={}] - display options (see resolveLegacyCardHtml)
   */
  constructor(poke, options = {}) {
    this.poke = poke || {};
    this.options = options || {};
    this._element = null;
  }

  /**
   * Renders the Pokemon card and returns the HTMLElement.
   * Delegates to the canonical generator when loaded (full game);
   * homogeneous standalone render otherwise (pure ECS contexts).
   * @returns {HTMLElement}
   */
  render() {
    let el = null;
    const legacyHtml = resolveLegacyCardHtml(this.poke, this.options);
    if (legacyHtml) {
      // Same markup as the rest of the game => string -> referenced element conversion.
      const holder = document.createElement(this.options.tagName || 'div');
      globalThis._pwSetHtmlSafe(holder, legacyHtml);
      el = holder.firstElementChild || holder;
      el.__pwFromCanonicalGenerator = true;
    } else {
      el = renderStandaloneCard(this);
    }

    if (this.options.selected) el.classList.add('is-selected');
    if (typeof this.options.onClick === 'function') {
      const opts = this.options;
      el.addEventListener('click', (e) => opts.onClick(this.poke, e, el));
    }

    this._element = el;
    return el;
  }

  /** Canonical HTML string, directly usable (string mode). */
  html() {
    const legacyHtml = resolveLegacyCardHtml(this.poke, this.options);
    if (legacyHtml) return legacyHtml;
    const el = renderStandaloneCard(this);
    return el.outerHTML;
  }
}

