// Vague 42 — §preuve : les deux modales historiquement « templates » sont de
// vraies vues ECS (arbre d'entités → vdom → matérialisation par régions dans
// les slots content/footer de la DS Window), surface classique inchangée.
// Verrous vivants mesurés en navigateur réel :
//   A. window.{PokeUITemplates,PokemonCardTemplate,UnifiedPokemonSelectorModal,
//      UnifiedTeamEditorModal} exposés (contrat main.js) ;
//   B. UnifiedTeamEditorModal : 6 slots .slot-card (2 remplis / 4 vides),
//      markup DS Button (pw-ui-btn/​pw-ui-btn-text), bouton « + Ajouter »
//      routé par la DÉLÉGATION ECS [data-pw-eid] (ouvre le sélecteur) ;
//   C. UnifiedPokemonSelectorModal : 4 boutons de tri, un SEUL .usm-sort-btn
//      .active après clic (état → rendu ; l'ancien accumulait), tri niveau
//      descendant mesuré sur les cartes, recherche filtrante AVEC focus
//      conservé (le champ n'est jamais re-rendu), clic carte routé par la
//      délégation ECS (onSelect reçoit le bon Pokémon) ;
//   D. fermeture : clic « Fermer »/« Annuler » via délégation → fenêtre DS
//      retirée du DOM + callbacks onClose appelés ;
//   E. mode chaîne : les toHTML() statiques sérialisent sans DS Window.
import { chromium } from 'playwright';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
if (process.env.PWK_BLOCK_MEDIA === '1') await page.route(/\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|woff2?)$/, (route) => route.abort());

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// ─── A — surface classique inchangée ───────────────────────────────────────
const surface = await page.evaluate(() => ({
  ns: !!window.PokeUITemplates
    && typeof window.PokeUITemplates.PokemonCardTemplate === 'function'
    && typeof window.PokeUITemplates.UnifiedPokemonSelectorModal === 'function'
    && typeof window.PokeUITemplates.UnifiedTeamEditorModal === 'function',
  card: typeof window.PokemonCardTemplate === 'function',
  selector: typeof window.UnifiedPokemonSelectorModal?.open === 'function',
  editor: typeof window.UnifiedTeamEditorModal?.open === 'function',
}));
console.log('A — surface:', JSON.stringify(surface));
if (!surface.ns || !surface.card || !surface.selector || !surface.editor) throw new Error('surface classique rompue');

// ─── B — éditeur d'équipe : structure + délégation ECS ─────────────────────
const editor = await page.evaluate(() => {
  const mk = (id, name, level) => ({ id, name, level, currentHP: 3 * level, maxHP: 4 * level, moves: [] });
  window.__probeSaved = null;
  window.__probeClosed = false;
  window.__probeWin = window.UnifiedTeamEditorModal.open({
    title: 'Équipe Active (ECS)',
    teamData: [mk(25, 'Pikachu', 50), mk(6, 'Dracaufeu', 70)],
    availablePokemon: [mk(1, 'Bulbizarre', 5), mk(4, 'Salamèche', 12), mk(7, 'Carapuce', 8)],
    onSave: (t) => { window.__probeSaved = t; },
    onClose: () => { window.__probeClosed = true; },
  });
  const win = document.getElementById('unified-team-editor-modal-ecs');
  const slots = win ? [...win.querySelectorAll('.slot-card')] : [];
  return {
    winOpen: !!win,
    title: win ? win.querySelector('.pw-ui-window-title')?.textContent : '',
    slots: slots.length,
    filled: slots.filter((s) => !s.classList.contains('is-empty')).length,
    empty: slots.filter((s) => s.classList.contains('is-empty')).length,
    emptyText: win ? win.querySelector('.slot-empty-text')?.textContent : '',
    removeBtns: win ? win.querySelectorAll('.slot-card:not(.is-empty) .pw-ui-btn--danger').length : 0,
    addBtns: win ? win.querySelectorAll('.slot-card.is-empty .pw-ui-btn').length : 0,
    footerBtns: win ? [...win.querySelectorAll('.pw-ui-window-footer .pw-ui-btn')].map((b) => b.textContent.trim()) : [],
    canonicalCards: win ? win.querySelectorAll('.slot-card > span > .poke-card, .slot-card .poke-card, .slot-card .pw-poke-card').length : 0,
    delegatedAdd: win ? !!win.querySelector('.slot-card.is-empty .pw-ui-btn[data-pw-eid]') : false,
  };
});
console.log('B — éditeur:', JSON.stringify(editor));
if (!editor.winOpen || editor.slots !== 6 || editor.filled !== 2 || editor.empty !== 4) throw new Error('structure éditeur KO');
if (editor.emptyText !== 'Emplacement 3 vide') throw new Error('slot vide libellé KO: ' + editor.emptyText);
if (editor.removeBtns !== 2 || editor.addBtns !== 4) throw new Error('boutons slot KO');
if (editor.footerBtns.join('|') !== 'Sauvegarder|Vider|Annuler') throw new Error('footer KO: ' + editor.footerBtns);
if (!editor.delegatedAdd) throw new Error('bouton Ajouter non routé par la délégation ECS (data-pw-eid absent)');

// ─── C — clic « + Ajouter » (délégation) → sélecteur ; tri unique + recherche ─
await page.evaluate(() => {
  const win = document.getElementById('unified-team-editor-modal-ecs');
  win.querySelector('.slot-card.is-empty .pw-ui-btn').click();
});
await page.waitForTimeout(150);
const selector = await page.evaluate(() => {
  const sel = document.getElementById('unified-selector-modal-ecs');
  if (!sel) return { open: false };
  const cards = () => [...sel.querySelectorAll('.pw-ui-layout--grid .poke-card, .pw-ui-layout--grid .pw-poke-card')];
  const names = () => cards().map((c) => (c.querySelector('.poke-name, .poke-info')?.textContent || c.textContent || '').trim());
  return {
    open: true,
    title: sel.querySelector('.pw-ui-window-title')?.textContent || '',
    sortBtns: [...sel.querySelectorAll('.usm-sort-btn')].map((b) => b.textContent.trim()),
    activeBefore: sel.querySelectorAll('.usm-sort-btn.active').length,
    cardCount: cards().length,
    names: names(),
    search: !!sel.querySelector('.pw-ui-writebox-input'),
    closeBtn: !!sel.querySelector('.pw-ui-window-footer .pw-ui-btn[data-pw-eid]'),
  };
});
console.log('C1 — sélecteur ouvert:', JSON.stringify(selector));
if (!selector.open) throw new Error('clic Ajouter (délégation ECS) n’a pas ouvert le sélecteur');
if (selector.sortBtns.join('|') !== 'Nom|Niveau|Type|Numéro') throw new Error('boutons de tri KO: ' + selector.sortBtns);
if (selector.activeBefore !== 1) throw new Error('exactement un tri actif attendu à l’ouverture');
if (selector.cardCount !== 3) throw new Error('cartes sélecteur KO: ' + selector.cardCount);
if (!selector.search || !selector.closeBtn) throw new Error('recherche/footer sélecteur KO');

// Tri « Niveau » via délégation → un seul .active + ordre niveau décroissant.
await page.evaluate(() => {
  const sel = document.getElementById('unified-selector-modal-ecs');
  [...sel.querySelectorAll('.usm-sort-btn')].find((b) => b.textContent.trim() === 'Niveau').click();
});
await page.waitForTimeout(120);
const sorted = await page.evaluate(() => {
  const sel = document.getElementById('unified-selector-modal-ecs');
  const cards = [...sel.querySelectorAll('.pw-ui-layout--grid .poke-card, .pw-ui-layout--grid .pw-poke-card')];
  return {
    activeCount: sel.querySelectorAll('.usm-sort-btn.active').length,
    activeLabel: sel.querySelector('.usm-sort-btn.active')?.textContent.trim() || '',
    first: (cards[0]?.textContent || '').includes('Salamèche'),
    last: (cards[cards.length - 1]?.textContent || '').includes('Bulbizarre'),
    count: cards.length,
  };
});
console.log('C2 — tri niveau:', JSON.stringify(sorted));
if (sorted.activeCount !== 1 || sorted.activeLabel !== 'Niveau') throw new Error('tri actif non unique/état non suivi');
if (!sorted.first || !sorted.last) throw new Error('ordre niveau décroissant KO');

// Recherche : filtre mesuré + focus JAMAIS perdu (champ non re-rendu).
const search = await page.evaluate(async () => {
  const sel = document.getElementById('unified-selector-modal-ecs');
  const input = sel.querySelector('.pw-ui-writebox-input');
  input.focus();
  input.value = 'cara';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 80));
  const cards = sel.querySelectorAll('.pw-ui-layout--grid .poke-card, .pw-ui-layout--grid .pw-poke-card');
  return {
    focusKept: document.activeElement === input && sel.contains(document.activeElement),
    valueKept: input.value === 'cara',
    count: cards.length,
    isCarapuce: cards.length === 1 && (cards[0].textContent || '').includes('Carapuce'),
  };
});
console.log('C3 — recherche:', JSON.stringify(search));
if (!search.focusKept) throw new Error('focus perdu pendant la frappe (régression vs template historique)');
if (!search.valueKept) throw new Error('valeur saisie perdue');
if (!search.isCarapuce) throw new Error('filtre recherche KO');

// Clic carte via délégation ECS → onSelect reçoit Carapuce → slot 3 rempli.
await page.evaluate(() => {
  const sel = document.getElementById('unified-selector-modal-ecs');
  const card = [...sel.querySelectorAll('.pw-ui-layout--grid .poke-card, .pw-ui-layout--grid .pw-poke-card')][0];
  card.click();
});
await page.waitForTimeout(120);
const afterPick = await page.evaluate(() => {
  const win = document.getElementById('unified-team-editor-modal-ecs');
  const slots = [...win.querySelectorAll('.slot-card')];
  return {
    filledNow: slots.filter((s) => !s.classList.contains('is-empty')).length,
    slot3: (slots[2].textContent || '').includes('Carapuce'),
  };
});
console.log('C4 — après sélection:', JSON.stringify(afterPick));
if (!afterPick.slot3 || afterPick.filledNow !== 3) throw new Error('onSelect routé ECS KO (slot 3 attendu Carapuce)');

// ─── D — fermetures via délégation + callbacks ─────────────────────────────
await page.evaluate(() => {
  document.querySelector('#unified-selector-modal-ecs .pw-ui-window-footer .pw-ui-btn').click();
});
await page.waitForTimeout(120);
await page.evaluate(() => {
  const win = document.getElementById('unified-team-editor-modal-ecs');
  [...win.querySelectorAll('.pw-ui-window-footer .pw-ui-btn')].find((b) => b.textContent.trim() === 'Annuler').click();
});
await page.waitForTimeout(120);
const closed = await page.evaluate(() => ({
  selectorGone: !document.getElementById('unified-selector-modal-ecs'),
  editorGone: !document.getElementById('unified-team-editor-modal-ecs'),
  onCloseCalled: window.__probeClosed === true,
  overlayGone: [...document.querySelectorAll('.pw-ui-overlay')].length,
}));
const overlaysLeft = await page.evaluate(() => document.querySelectorAll('.pw-ui-overlay').length);
console.log('D — fermeture:', JSON.stringify(closed), 'overlays:', overlaysLeft);
if (!closed.selectorGone || !closed.editorGone) throw new Error('fenêtres non retirées du DOM');
if (!closed.onCloseCalled) throw new Error('onClose callback non appelé');
if (overlaysLeft !== 0) throw new Error(overlaysLeft + ' overlay(s) DS résiduel(s)');

// ─── E — mode chaîne DOM-free des vues (toHTML statiques) ──────────────────
const strings = await page.evaluate(() => {
  const mk = (id, name, level) => ({ id, name, level, currentHP: 10, maxHP: 20, moves: [] });
  const selHtml = window.UnifiedPokemonSelectorModal.toHTML({ pokemonList: [mk(25, 'Pikachu', 50)] });
  const edHtml = window.UnifiedTeamEditorModal.toHTML({ teamData: [mk(25, 'Pikachu', 50)] });
  return {
    sel: typeof selHtml === 'string'
      && selHtml.includes('pw-ui-writebox') && selHtml.includes('usm-sort-bar')
      && selHtml.includes('pw-ui-layout--grid'),
    ed: typeof edHtml === 'string' && (edHtml.match(/slot-card/g) || []).length >= 6
      && edHtml.includes('Sauvegarder') && edHtml.includes('Emplacement 2 vide'),
  };
});
console.log('E — toHTML:', JSON.stringify(strings));
if (!strings.sel || !strings.ed) throw new Error('sérialisation chaîne des vues KO');

const errors = await page.evaluate(() => window.__probeSaved);
if (pageErrors.length) throw new Error('pageerrors: ' + pageErrors.join(' | '));
await browser.close();
console.log('smoke-unified-views: OK — modales = vues ECS, surface classique inchangée, délégation [data-pw-eid] mesurée, focus conservé, fermeture propre.');
