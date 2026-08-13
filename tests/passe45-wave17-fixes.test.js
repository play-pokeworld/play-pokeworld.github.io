/**
 * Wave 17 — user's REAL-GAME feedback (screenshot-verified in headless
 * Chromium; jsdom alone cannot see these, it applies no stylesheet):
 *
 *  1. Save context menu: distinct colours per action (scoped !important).
 *  2/3. Sprite <img> now carries .sprite-img + a hard 100%-of-wrap cap —
 *       without it the img rendered at its NATURAL PNG size (96px+) inside
 *       a 64px circle and flooded the whole PC box (the "pills" screenshot).
 *  4. PC box grid: rows pinned to max-content + the legacy margin:auto
 *     shrink-wrap removed — the card is a full tile again.
 *  5. Fossil card: the "revives into" label renders ABOVE the revived name.
 *  6/7. Active buttons use PER-THEME tokens (the fixed cream pill was
 *       illegible on the light theme); money row is theme-adaptive.
 *  8. Settings: the ACTIVE language is re-asserted id-scoped (the settings
 *       blanket flattened it); the theme-swatch selection is an inset ring
 *       (the outer glow was clipped by the card overflow).
 *  9. Drag insertion markers are ::after bars drawn ABOVE the window
 *     header (the inset box-shadow was always hidden under .pw-win-hdr).
 * 10. Battle chrome (Résumé / Quitter) only exists while .is-live.
 * 11. Training: live panel on top of the scene, chrome row hidden, and
 *     the abandon button is the crimson danger family.
 *
 * All DOM-free (source contracts + component HTML strings + contrast math).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio } from '../src/ui/components/theme.js';
import { SPRITE_SIZES, SPRITE_SIZE_VARS } from '../src/core/design-tokens.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const CSS1 = CSS.replace(/\s+/g, ' '); // single-line for cross-line needles

/* ─── 2/3. Sprite image: the .sprite-img contract ────────────────────────── */

test('wave17: circle <img> always carries .sprite-img (component, both builders)', async () => {
  const src = R('src/ui/components/sprite.js');
  const emissions = src.match(/class: cx\('pw-poke-circle-img sprite-img'/g) || [];
  assert.ok(emissions.length >= 2, 'both createPokemonSprite and pokemonSpriteVNode tag .sprite-img');
  const { pokeCardHTML } = await import('../src/ui/components/poke-card.js');
  const html = pokeCardHTML({ imgSrc: 'x.png', emoji: '⚡', name: 'Pikachu', levelLabel: 'Nv.42', size: 'standard' });
  assert.ok(html.includes('pw-poke-circle-img sprite-img'), 'rendered card img carries both classes');
  assert.ok(html.includes('width:72px;height:72px'), 'standard wrap = 72px (canonical)');
  assert.ok(html.includes('pw-poke-circle-bg'), 'canonical disc kept');
});

test('wave17: canonical sizes are 72/104 everywhere (tokens, CSS var, fallbacks, clamp)', () => {
  assert.equal(SPRITE_SIZES.standard, 72);
  assert.equal(SPRITE_SIZES.team, 104);
  assert.ok(SPRITE_SIZE_VARS.standard.includes('72px'), 'CSS var fallback 72');
  assert.ok(SPRITE_SIZE_VARS.team.includes('104px'), 'CSS var fallback 104');
  assert.ok(CSS.includes('--pw-size-poke-sm: 72px'), 'stylesheet token 72');
  assert.ok(CSS.includes('--pw-size-poke-lg: 104px'), 'stylesheet token 104');
  const helpers = R('src/ui/game/sprite-helpers.js');
  assert.ok(!helpers.includes('{ standard: 56, team: 96 }'), 'no legacy 56/96 fallback left');
  // The hard cap: the img can NEVER exceed its wrap — the pill-bug fix.
  assert.ok(/img\.pw-poke-circle-img\s*\{[^}]*width:\s*100%\s*!important[^}]*height:\s*100%\s*!important/.test(CSS1), 'img hard-capped at 100% of the wrap');
});

/* ─── 4. PC box grid ────────────────────────────────────────────────────── */

test('wave17: PC box grid — rows max-content, card margin freed', () => {
  assert.ok(/grid-auto-rows:\s*max-content/.test(CSS), 'rows pinned to max-content (no equal-share squish)');
  assert.ok(/\.pw-poke-card\.box-card\s*\{[^}]*margin:\s*0\s*!important/.test(CSS1), 'legacy margin:0 auto shrink-wrap removed');
  assert.ok(CSS.includes('minmax(min(198px, 100%), 1fr)'), 'modern ~198px+ columns kept');
});

/* ─── 5. Fossil card: label above name ─────────────────────────────────── */

test('wave17: fossil card renders the revive label ABOVE the Pokémon name', () => {
  const src = R('src/ui/game/box-selector.js');
  const sub = src.indexOf('fossil-target-sub');
  const name = src.indexOf('fossil-target-name');
  assert.ok(sub !== -1 && name !== -1, 'both fossil rows exist');
  assert.ok(sub < name, '"revives into" precedes the name in the markup');
});

/* ─── 1. Save context menu colours ─────────────────────────────────────── */

test('wave17: save context menu — one scoped colour per action, AA-checked', () => {
  for (const [cls, col] of [['dl-item', 'var(--blue)'], ['imp-item', 'var(--green)']]) {
    const re = new RegExp(`#save-card-context-menu \\.save-context-item\\.${cls}[^{]*\\{[^}]*color:\\s*${col.replace(/[()]/g, (m) => '\\' + m)}\\s*!important`);
    assert.ok(re.test(CSS1), `${cls} colour scoped + !important`);
  }
  assert.ok(/#save-card-context-menu \.save-context-item\.danger[^{]*\{[^}]*color:\s*#FF7A8A\s*!important/.test(CSS1), 'danger = #FF7A8A (AA on the dark menu)');
  assert.ok(contrastRatio('#FF7A8A', '#2a2926') >= 4.5, 'delete red ≥ 4.5 on the menu bg');
  assert.ok(contrastRatio('#539DDF', '#2a2926') >= 4.5, 'download blue ≥ 4.5');
  assert.ok(contrastRatio('#60BE58', '#2a2926') >= 4.5, 'import green ≥ 4.5');
});

/* ─── 6/7/8. Theme-adaptive active states & settings ───────────────────── */

test('wave17: active buttons use per-theme tokens, not fixed cream', () => {
  assert.ok(!/button\[data-action\]:not\(\.save-slot\)\.active\s*\{[^}]*#ECDEB7\s*!important/.test(CSS1), 'no fixed-cream active blanket');
  // Wave 33 added `:not(.modal-close)` to this selector (the shared ✕ is a
  // <button data-action> in some panels and was being repainted with the
  // standard button chrome). Assert the EXEMPTIONS, not the literal string,
  // so adding a further guard cannot fail a test about theme swatches.
  // (the selector list is wrapped over several lines, so match across newlines)
  const activeBlanket = (CSS1.match(/[^{}]*button\[data-action\][^{}]*\.active\s*\{/g) || [])
    .find((sel) => sel.includes(':not(.theme-swatch)'));
  assert.ok(activeBlanket, 'theme swatches exempt (preview colours kept)');
  assert.ok(activeBlanket.includes(':not(.save-slot)'), 'save slots exempt');
  assert.ok(/button\[data-action\][^{]*\.active\s*\{[^}]*var\(--pw-btn-active-bg\)\s*!important/.test(CSS1), 'active bg = per-theme token');
  // The settings blanket flattens class rules → the ACTIVE language is
  // re-asserted with the id scope (wins over "#settings-inner .hbtn").
  assert.ok(/#settings-inner \.hbtn\.lang-btn\.active[^{]*\{[^}]*var\(--pw-btn-active-bg\)\s*!important[^}]*var\(--pw-btn-active-text\)\s*!important/.test(CSS1), 'ACTIVE language id-scoped with the per-theme pair');
  // Swatch: inset ring only — the outer glow was clipped by the card frame.
  assert.ok(/#settings-inner \.theme-swatch\.active[^{]*\{[^}]*box-shadow:\s*inset 0 0 0 3px/.test(CSS1), 'swatch selection = inset ring');
  assert.ok(!CSS.includes('0 0 12px rgba(236,222,183,0.5)'), 'clipped outer glow removed');
  assert.ok(/\.pw-money-row\s*\{[^}]*color-mix\(in srgb, var\(--light2\) 12%/.test(CSS1), 'money row theme-adaptive');
  // AA of the four per-theme active pairs (dark/light/gameboy/fire).
  for (const [theme, bg, fg] of [
    ['dark', '#ECDEB7', '#36342F'], ['light', '#6E5636', '#FFF7E4'],
    ['gameboy', '#9BBC0F', '#0F380F'], ['fire', '#FF8A5C', '#2C1810'],
  ]) {
    assert.ok(contrastRatio(fg, bg) >= 4.5, `active pair "${theme}" ≥ 4.5 (${contrastRatio(fg, bg).toFixed(2)})`);
  }
});

/* ─── 9. Drag markers ───────────────────────────────────────────────────── */

test('wave17: drag insertion markers are ::after bars above the header, dual marking kept', () => {
  assert.ok(/\.dash-win\.insert-above::after\s*\{[^}]*top:\s*2px/.test(CSS1), 'above marker bar at the window top');
  assert.ok(/\.dash-win\.insert-below::after\s*\{[^}]*bottom:\s*2px/.test(CSS1), 'below marker bar at the window bottom');
  assert.ok(/\.dash-win\.insert-above::after, \.dash-win\.insert-below::after\s*\{[^}]*z-index:\s*60/.test(CSS1), 'bars paint over the window header');
  const drag = R('src/ui/game/win-drag.js');
  // Wave 18: the same dual marking now runs on the VISIBLE-window list
  // (pwVisibleWinEls) — a hidden last window used to swallow the strip.
  assert.ok(drag.includes("vis[vi].el.classList.add('insert-above')"), 'lower window marked insert-above');
  assert.ok(drag.includes("vis[vi - 1].el.classList.add('insert-below')"), 'upper window marked insert-below');
  assert.ok(/for\(let c=1; c<=3; c\+\+\)/.test(drag), 'marking logic walks ALL three columns');
});

/* ─── 10/11. Battle chrome & training ───────────────────────────────────── */

test('wave17: battle chrome only exists while .is-live (+ all scene writers)', () => {
  assert.ok(/#battle-active-scene:not\(\.is-live\) \.pw-static-038\s*\{\s*display:\s*none\s*!important/.test(CSS1), 'guard: no chrome without .is-live');
  assert.ok(R('src/application/combat/battle-init.js').includes("classList.add('is-live')"), 'battle start marks live');
  assert.ok(R('src/application/combat/battle-flow.js').includes("classList.remove('is-live')"), 'battle end unmarks');
  assert.ok(R('src/application/save/offline-engine.js').includes("classList.add('is-live')"), 'offline resume marks live');
});

test('wave17: training — panel on top, chrome hidden/restored, red abandon', () => {
  const tr = R('src/application/combat/training.js');
  assert.ok(tr.includes('activeScene.insertBefore(panel, activeScene.firstChild)'), 'panel inserted above the scene content');
  assert.ok(/leaveBtn\.closest\('\.pw-static-038'\)/.test(tr), 'chrome row hidden via the leave button ancestor');
  assert.ok(tr.includes("chromeOff.style.display = ''"), 'chrome row restored afterwards');
  assert.ok(/class="hbtn pw-btn-danger" data-action="legacy-call" data-call="cancelTrainingSlot"/.test(tr), 'live abandon = danger family');
  assert.ok(/button\[data-action\]\.pw-btn-danger\s*,\s*button\[data-call\]\.pw-btn-danger/.test(CSS1), 'danger survives the data-action blanket (scoped)');
  // Wave 18 (user request): danger colour = the EXACT family crimson
  // #D3425F, identical to every other red button (the wave-17 darkened
  // mix, chosen for AA, made Abandonner/Retirer look off — visibility
  // consistency won over the marginal contrast bump).
  assert.ok(/button\[data-action\]\.pw-btn-danger,\s*button\[data-call\]\.pw-btn-danger,\s*\.hbtn\.pw-btn-danger \{\s*background:\s*#D3425F !important/.test(CSS1), 'danger colour = family crimson #D3425F (same as every red button)');
});

