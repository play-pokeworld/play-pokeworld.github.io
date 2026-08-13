// visual-wave33-headers.mjs — MEASURED proof that every panel header in the
// game is the SAME component.
//
// ── Why this harness exists ─────────────────────────────────────────────
// Wave 32 introduced components/panel-header.js and rebranded 26 hand-rolled
// header sites onto it, then "verified" the unification by comparing the
// builder's output to the builder's own output. That proves nothing: the
// REFERENCE panels (sac / marché / pokédex / dictionnaire / guide / boutique)
// were never part of the 26 — they were built by fullscreen-panel.js with a
// completely different, `pw-`-prefixed markup family:
//
//     .pw-modal-header > .pw-modal-title + .pw-modal-close      (reference)
//     .modal-title > .pw-row > … > .pw-info-name + .modal-close (everything else)
//
// Two markup families ⇒ two disjoint CSS paths ⇒ the user still saw two
// different headers, and every source-level test kept passing.
//
// The lesson this file encodes: a unification claim is only worth what a
// BROWSER says about the final computed pixels. Never compare a builder to
// itself — compare every family against the reference panel's real DOM.
//
// MANUAL RUN (also invoked automatically by the wave-33 test when a real
// Chromium is installed):
//   npx playwright install chromium
//   node tests/harness/visual-wave33-headers.mjs
//
// Exit code 0 = every family measures identically to the reference.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(new URL('../..', import.meta.url).pathname);
const CSS = fs.readFileSync(path.join(ROOT, 'src/assets/styles/design-system.css'), 'utf8');

/* Each entry is the markup the family REALLY emits today, copied from the
   source of truth listed beside it. When a panel is refactored, its entry
   must be updated from the source — that is the point of the harness. */
const FAMILIES = {
  // src/ui/game/fullscreen-panel.js — THE reference look, per the user.
  'A sac / marché / pokédex (RÉFÉRENCE)': `
    <div class="pw-modal-container">
      <div id="fs-panel-header" class="modal-title">
        <div class="pw-row"><div class="pw-info-head-text">
          <div id="fs-panel-title" class="pw-info-name">Sac</div></div></div>
        <span class="modal-close">✕</span>
      </div>
    </div>`,
  // index.html — #settings-modal
  'B réglages': `
    <div id="settings-modal"><div id="settings-inner">
      <div class="modal-title">
        <div class="pw-row"><div class="pw-info-head-text">
          <div id="settings-title" class="pw-info-name">Réglages</div></div></div>
        <button type="button" class="modal-close" data-action="close-modal">✕</button>
      </div>
    </div></div>`,
  // index.html — #quest-modal
  'C quêtes': `
    <div id="quest-modal"><div id="quest-inner">
      <div class="modal-title">
        <div class="pw-row"><div class="pw-info-head-text">
          <div id="quest-title" class="pw-info-name">Quêtes</div></div></div>
        <button type="button" class="modal-close" data-action="close-modal">✕</button>
      </div>
    </div></div>`,
  // index.html — #unified-selector-modal (boîte PC)
  'D boîte PC': `
    <div id="unified-selector-modal" class="pw-static-052"><div class="pw-static-053">
      <div class="modal-title pw-static-054">
        <div class="pw-row"><div class="pw-info-head-text">
          <div id="usm-title" class="pw-info-name pw-static-035">Sélection</div></div></div>
        <button type="button" class="modal-close pw-static-055" data-action="close-modal">✕</button>
      </div>
    </div></div>`,
  // panelHeaderVNode() inside #poke-modal (fiche objet / capacité / talent)
  'E fiche Pokémon / objet': `
    <div id="poke-modal" class="pw-info-modal"><div id="poke-modal-inner"><div class="pw-view">
      <div class="modal-title">
        <div class="pw-row"><span class="pw-info-icon">🎒</span><div class="pw-info-head-text">
          <div class="pw-info-name">Bulbizarre</div></div></div>
        <span class="modal-close">✕</span>
      </div>
    </div></div></div>`,
  // DexDetailView — the pokédex detail sheet
  'F fiche pokédex': `
    <div id="poke-modal"><div id="poke-modal-inner" class="poke-detail-inner"><div class="pw-view">
      <div class="modal-title poke-detail-title">
        <div class="pw-row"><div class="pw-info-head-text">
          <div class="pw-info-name">Bulbizarre</div></div></div>
        <span class="modal-close">✕</span>
      </div>
    </div></div></div>`,
  // MineWindowView / day-care / training — .management-title
  'G mine / pension / entraînement': `
    <div id="poke-modal"><div id="poke-modal-inner" class="management-inner"><div class="pw-view">
      <div class="modal-title management-title">
        <div class="pw-row"><div class="pw-info-head-text">
          <div class="pw-info-name">Mine</div></div></div>
        <span class="modal-close">✕</span>
      </div>
    </div></div></div>`,
  // AFK / offline recap card
  'H bilan hors-ligne': `
    <div class="afk-result-card">
      <div class="modal-title">
        <div class="pw-row"><div class="pw-info-head-text">
          <div class="pw-info-name">De retour</div></div></div>
        <span class="modal-close">✕</span>
      </div>
    </div>`,
};

/* The dashboard window bar is measured too, but it is a DELIBERATE variant:
   it is welded to the top of a draggable window, so it keeps the grip, the
   grab cursor, top-only rounding and no gap under it. Everything else — the
   height, the horizontal padding, the typography — must still match. */
const WINDOW_BAR = `
  <div class="dash-win"><div class="pw-win-hdr">
    <div class="pw-win-hdr-title">
      <span class="pw-win-hdr-grip"><span></span><span></span><span></span><span></span></span>
      <span class="pw-win-hdr-label">Carte</span>
    </div>
  </div><div class="win-body">x</div></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

const entries = Object.entries(FAMILIES);
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>
<style>
  /* The modals ship hidden; force the open state so we measure real boxes. */
  #settings-modal, #quest-modal, #unified-selector-modal, #poke-modal {
    display: block !important; position: static !important; inset: auto !important;
    background: none !important;
  }
  #settings-inner, #quest-inner, #poke-modal-inner, .pw-static-053 { display: block !important; }
</style>
<body class="theme-default" style="background:#1a1a1a;padding:16px">
${entries.map(([k, v], i) => `<div class="probe" data-k="${k}" id="fam${i}">${v}</div>`).join('')}
<div class="probe" data-k="I fenêtre du tableau de bord" id="winbar">${WINDOW_BAR}</div>
</body>`);

const rows = await page.evaluate(() => {
  const n = (v) => +parseFloat(v).toFixed(1);
  return [...document.querySelectorAll('.probe')].map((wrap) => {
    const bar = wrap.querySelector('.pw-modal-header, .modal-title, .pw-win-hdr');
    const title = wrap.querySelector('.pw-modal-title, .pw-info-name, .pw-win-hdr-label');
    const close = wrap.querySelector('.pw-modal-close, .modal-close');
    const cb = getComputedStyle(bar);
    const ct = getComputedStyle(title);
    const cc = close && getComputedStyle(close);
    const rc = close && close.getBoundingClientRect();
    return {
      famille: wrap.dataset.k,
      hauteur: n(bar.getBoundingClientRect().height),
      fond: cb.backgroundColor,
      padding: cb.padding,
      rayon: cb.borderRadius,
      marge: cb.margin,
      titre: `${ct.fontSize}/${ct.fontWeight}/${ct.letterSpacing}`,
      couleur: ct.color,
      croix: cc ? `${n(rc.width)}x${n(rc.height)} ${cc.fontSize}` : '—',
      // Wave 33: the ✕ is a <span> in the reference panels but a <button
      // data-action> in réglages/quêtes/boîte PC. Four generic
      // `button[data-action]` rules used to paint the button form with the
      // standard button chrome, so the two forms looked different while
      // every geometry number above matched. Chrome is now measured too.
      croixFond: cc ? cc.backgroundColor : '—',
      croixBordure: cc ? `${cc.borderTopWidth} ${cc.borderTopStyle} ${cc.borderTopColor}` : '—',
      croixRayon: cc ? cc.borderRadius : '—',
    };
  });
});

await browser.close();

console.table(rows);

const ref = rows[0];
const windowBar = rows[rows.length - 1];
// The window bar legitimately differs on the three "welded to a window"
// properties; it must match on everything else.
// The dashboard window bar is deliberately distinct (drag grip, top-only
// radius, no close control) — see design-system.css `.pw-win-hdr`.
const WINDOW_BAR_EXEMPT = new Set(['rayon', 'marge', 'croix', 'croixFond', 'croixBordure', 'croixRayon']);

let failures = 0;
console.log(`\nRéférence : ${ref.famille}\n`);
for (const row of rows.slice(1)) {
  const exempt = row === windowBar ? WINDOW_BAR_EXEMPT : new Set();
  const diffs = Object.keys(ref).filter(
    (k) => k !== 'famille' && !exempt.has(k) && row[k] !== ref[k]
  );
  if (diffs.length) {
    failures += 1;
    console.log(`  ✗ ${row.famille}`);
    for (const k of diffs) console.log(`      ${k}: attendu ${ref[k]} — mesuré ${row[k]}`);
  } else {
    console.log(`  ✓ ${row.famille}${exempt.size ? ' (variante fenêtre : rayon/marge exemptés)' : ''}`);
  }
}

if (failures) {
  console.error(`\n${failures} famille(s) d'en-tête divergent(s) de la référence.`);
  process.exit(1);
}
console.log('\nToutes les familles d\'en-tête mesurent à l\'identique.');
