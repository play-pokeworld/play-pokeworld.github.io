/**
 * PokeEngine — Style Injector
 *
 * Reads PokeStyles constants and injects them as CSS custom properties + common rules.
 * Ensures ALL game UI visually follows the unified style guide.
 * Run once on engine init.
 */
(function() {
'use strict';

function injectPokeStyles() {
  if (document.getElementById('poke-engine-styles')) return; // already injected

  const S = window.PokeStyles;
  if (!S) return;

  const css = [];

  // ─── CSS Custom Properties (matches style.css :root) ───
  css.push(`:root {
    --poke-bg-primary: ${S.colors.bg.primary};
    --poke-bg-secondary: ${S.colors.bg.secondary};
    --poke-bg-tertiary: ${S.colors.bg.tertiary};
    --poke-text-primary: ${S.colors.text.primary};
    --poke-text-secondary: ${S.colors.text.secondary};
    --poke-text-muted: ${S.colors.text.muted};
    --poke-accent: ${S.colors.accent};
    --poke-hp-high: ${S.colors.hp.high};
    --poke-hp-mid: ${S.colors.hp.mid};
    --poke-hp-low: ${S.colors.hp.low};
    --poke-xp: ${S.colors.xp};
    --poke-shiny: ${S.colors.shiny};
    --poke-font: ${S.fonts.body};
    --poke-font-title: ${S.fonts.title};
    --poke-radius: ${S.radius.lg};
    --poke-radius-sm: ${S.radius.sm};
    --poke-shadow: ${S.shadows.card};
    --poke-shadow-hover: ${S.shadows.hover};
    --poke-shadow-modal: ${S.shadows.modal};
  }`);

  // ─── Global typography ───
  css.push(`body {
    font-family: ${S.fonts.body};
    font-size: ${S.fontSizes.md};
    letter-spacing: ${S.fonts.letterSpacing};
    color: var(--poke-text-primary);
    background: var(--poke-bg-primary);
  }`);

  // ─── PokeButton unified ───
  css.push(`.poke-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: ${S.sizes.button.md};
    padding: 6px 14px;
    border-radius: var(--poke-radius);
    font-family: var(--poke-font);
    font-size: ${S.fontSizes.sm};
    font-weight: 800;
    letter-spacing: 0.4px;
    cursor: pointer;
    transition: ${S.transition.default};
    border: 1px solid;
    text-decoration: none;
    line-height: 1;
  }
  .poke-btn--secondary { background: ${S.colors.accent}; border-color: ${S.colors.bg.primary}; color: ${S.colors.bg.primary}; }
  .poke-btn--secondary:hover { background: ${S.colors.text.primary}; transform: translateY(-1px); }
  .poke-btn--primary { background: ${S.colors.text.primary}; border-color: ${S.colors.text.primary}; color: ${S.colors.bg.primary}; }
  .poke-btn--danger { background: ${S.colors.hp.low}; border-color: ${S.colors.hp.low}; color: white; }
  .poke-btn--icon { min-width: ${S.sizes.button.md}; padding-inline: 10px; background: rgba(236,222,183,0.10); color: var(--poke-text-primary); border-color: rgba(236,222,183,0.16); }
  .poke-btn--icon:hover { background: var(--poke-text-primary); color: var(--poke-bg-primary); border-color: var(--poke-text-primary); }
  .poke-btn.is-active { background: var(--poke-text-primary); color: var(--poke-bg-primary); border-color: var(--poke-text-primary); font-weight: bold; }
  .poke-btn.is-disabled { opacity: 0.5; cursor: not-allowed; }
  .poke-btn--sm { min-height: ${S.sizes.button.sm}; padding: 4px 10px; font-size: ${S.fontSizes.xs}; }
  .poke-btn--lg { min-height: ${S.sizes.button.lg}; padding: 10px 20px; font-size: ${S.fontSizes.md}; }
  .hbtn.poke-btn { /* Override legacy .hbtn when .poke-btn is also present */ }
  `);

  // ─── PokeBadge ───
  css.push(`.poke-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: ${S.fontSizes.badge};
    font-weight: bold;
    color: white;
    text-shadow: ${S.shadows.text};
  }`);

  // ─── PokeCard (Pokemon/item cards) ───
  css.push(`.poke-card {
    background: ${S.colors.text.secondary};
    border-radius: var(--poke-radius);
    border: 1px solid ${S.colors.bg.primary};
    overflow: hidden;
    box-shadow: var(--poke-shadow);
    transition: ${S.transition.default};
  }
  .poke-card:hover { box-shadow: var(--poke-shadow-hover); border-color: var(--poke-text-primary); }
  .poke-card.active { box-shadow: 0 0 15px rgba(236,222,183,0.4); border-color: var(--poke-text-primary); }
  .poke-card.fainted { opacity: 0.4; filter: grayscale(0.7); }
  `);

  // ─── Progress bars ───
  css.push(`.poke-progressbar {
    border-radius: ${S.sizes.progress.hp / 2}px;
    overflow: hidden;
  }
  .poke-progressbar-fill {
    transition: ${S.transition.hp};
  }`);

  // ─── Sprite containers ───
  css.push(`.poke-sprite {
    width: ${S.sizes.sprite.card}px;
    height: ${S.sizes.sprite.card}px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${S.radius.full};
    overflow: visible;
    flex-shrink: 0;
  }
  .poke-sprite img {
    width: 110%;
    height: 110%;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .poke-sprite--large { width: ${S.sizes.sprite.large}px; height: ${S.sizes.sprite.large}px; }
  .poke-sprite--small { width: ${S.sizes.sprite.small}px; height: ${S.sizes.sprite.small}px; }
  `);

  // ─── Info Panel ───
  css.push(`.poke-info-panel .info-section-title {
    font-size: ${S.fontSizes.md};
    font-weight: bold;
    color: var(--poke-text-primary);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid ${S.colors.bg.tertiary};
  }
  .poke-info-panel .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: ${S.fontSizes.sm};
  }
  .poke-info-panel .info-row-label {
    color: var(--poke-text-secondary);
  }
  .poke-info-panel .info-row-value {
    color: var(--poke-text-primary);
    font-weight: 500;
  }
  .poke-info-panel .item-effect-box {
    padding: 10px 12px;
    background: var(--poke-bg-tertiary);
    border-radius: var(--poke-radius);
    font-size: ${S.fontSizes.sm};
    line-height: 1.6;
    color: var(--poke-text-primary);
  }
  `);

  // ─── Inventory items ───
  css.push(`.inv-item, .shop-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    background: ${S.colors.text.secondary};
    border-radius: var(--poke-radius);
    margin-bottom: 8px;
    border: 2px solid ${S.colors.bg.primary};
    cursor: pointer;
    transition: ${S.transition.default};
  }
  .inv-item:hover, .shop-item:hover { border-color: var(--poke-text-primary); background: var(--poke-text-primary); }
  .inv-item.is-disabled { opacity: 0.5; cursor: not-allowed; }
  .inv-name { flex: 1; color: ${S.colors.bg.primary}; font-weight: 500; font-size: ${S.fontSizes.md}; }
  .inv-qty { background: ${S.colors.bg.primary}; color: var(--poke-text-primary); font-weight: bold;
    padding: 4px 10px; border-radius: 12px; min-width: 40px; text-align: center; font-size: ${S.fontSizes.sm}; }
  .inv-icon { width: ${S.sizes.sprite.icon}px; height: ${S.sizes.sprite.icon}px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .inv-icon img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
  `);

  // ─── Grid ───
  css.push(`.poke-grid {
    display: grid;
    gap: 10px;
    padding: 10px;
  }`);

  // ─── Select ───
  css.push(`.poke-select {
    background: rgba(0,0,0,0.24);
    color: var(--poke-text-primary);
    border: 1px solid rgba(236,222,183,0.16);
    border-radius: 10px;
    padding: 8px 10px;
    min-height: 36px;
    font-family: var(--poke-font);
  }`);

  // ─── Scrollbar ───
  css.push(`::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: ${S.colors.bg.primary}; }
  ::-webkit-scrollbar-thumb { background: ${S.colors.bg.tertiary}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${S.colors.text.secondary}; }
  `);

  // ─── Move Description Badge (weather/terrain/status) ───
  css.push(`.move-desc-badge {
    display: inline-block;
    padding: 0.1rem 0.7rem;
    border-radius: 0.2rem;
    font-size: 1.1rem;
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    width: auto;
  }`);

  // ─── Inject ───
  const style = document.createElement('style');
  style.id = 'poke-engine-styles';
  style.textContent = css.join('\n');
  document.head.appendChild(style);
}

// Auto-inject when DOM ready
if (document.readyState === 'complete') injectPokeStyles();
else document.addEventListener('DOMContentLoaded', injectPokeStyles);

})();

