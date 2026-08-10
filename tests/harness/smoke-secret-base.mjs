// Vague 43 — §preuve ANTIFRAGILE des deux régressions rapportées par
// l'utilisateur (régression P7 : appels nus inter-modules vers les modules
// base, exposition « registre seule ») + textes i18n à balises échappées
// dans le vdom. Verrous vivants en navigateur réel :
//   A. session réelle : baseGetState() (cross-module base-window → base-core
//      → data) RENVOIE l'état — la fenêtre base ne peut plus tomber sur la
//      branche « Charge une sauvegarde… » alors qu'une sauvegarde existe ;
//   B. base établie (layoutId + routeId) : la fenêtre base quitte l'état
//      vide et la fenêtre Lieu à Hoenn LISTE les alcôves avec le marqueur
//      « établie ici » (imports explicites mesurés au passage : 3 chaînes
//      d'appels nus réparées) ;
//   C. textes à balises : sous-titre mine (<b>), lockLabel box (<b>),
//      emptyLabel box/bag (<br>), emptyState quêtes (<br>) — le vdom ne les
//      échappe plus (contrat trusted markup via h.raw) ;
//   D. zéro erreur page sur l'ensemble du parcours.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
if (process.env.PWK_BLOCK_MEDIA === '1') await page.route(/\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|woff2?)$/, (route) => route.abort());

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// ── Session réelle (même gabarit que smoke-boot) ────────────────────────────
await page.evaluate(() => {
  const newBtn = [...document.querySelectorAll('#save-menu-screen button')].find((b) => /nouvelle|new/i.test(b.textContent || ''));
  if (newBtn) newBtn.click();
});
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) btn.click();
});
await page.waitForFunction(() => document.body.classList.contains('game-started'), null, { timeout: 8000 }).catch(async () => {
  await page.evaluate(() => { window.G.starter = true; window.saveGame(); });
  await page.evaluate((id) => window.startSaveById(id), await page.evaluate(() => window.currentSaveId || localStorage.getItem('pokeworld_active_save')));
});
await page.waitForTimeout(400);
assert.equal(await page.evaluate(() => document.body.classList.contains('game-started')), true, 'session réelle démarrée');

// Les écrans différés (vague 32 — dont tout le sous-système base) se chargent
// APRÈS le premier rendu : attendre la fin du stream avant toute mesure.
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForFunction(() => window.PokeActions && window.PokeActions.get('baseGetState'), null, { timeout: 15000 });

// ── A — baseGetState résout à travers les modules (le cœur de la régression) ─
const stProbe = await page.evaluate(() => {
  const st = window.PokeActions.get('baseGetState')();
  return { hasState: !!st && typeof st === 'object', hasLayoutField: st ? 'layoutId' in st : false };
});
console.log('A — baseGetState:', JSON.stringify(stProbe));
assert.ok(stProbe.hasState, 'A — baseGetState doit renvoyer l’état (appels nus inter-modules réparés)');

// ── B — base établie : fenêtre base + fenêtre Lieu à Hoenn ───────────────────
const baseWin = await page.evaluate(async () => {
  const G = window.G;
  G.region = 'hoenn';
  G.unlockedSecretBaseHoenn = true;
  const st = window.PokeActions.get('baseGetState')();
  const layoutId = (window.PokeActions.get('baseWindowGetRouteAlcoves')('route115') || [])[0] || 'cave_blue_2';
  st.layoutId = layoutId;
  st.routeId = 'route115';
  await window.PokeActions.get('baseWindowRender')();
  const empty = document.getElementById('base-win-empty');
  return {
    layoutId,
    emptyText: empty ? empty.textContent : '',
    emptyShown: empty ? getComputedStyle(empty).display !== 'none' : false,
    canvas2dShown: (() => { const c = document.getElementById('base-canvas-2d'); return !!c && getComputedStyle(c).display !== 'none'; })(),
    glHintPresent: !!document.getElementById('base-win-empty'),
  };
});
console.log('B1 — fenêtre base:', JSON.stringify(baseWin));
// Contrat réel : l'état vide GARDE son libellé initial en DOM, mais il doit
// être MASQUÉ quand une base existe — la régression l'affichait à la place du
// canvas. On jauge donc la visibilité, pas le texte résiduel de l'élément.
assert.ok(!baseWin.emptyShown, 'B1 — régression « Charge une sauvegarde » de retour (état vide affiché) !');
assert.ok(baseWin.canvas2dShown, 'B1 — la fenêtre base affiche la base (canvas 2D)');

const lieu = await page.evaluate(() => {
  const G = window.G;
  G.region = 'hoenn';
  G.location = 'route115';
  let el = document.getElementById('location-info-panel');
  if (!el) { el = document.createElement('div'); el.id = 'location-info-panel'; document.body.appendChild(el); }
  window.renderLocInfo(el);
  const text = el.textContent || '';
  return {
    hasAlcoves: text.includes('Alcôves de Base Secrète'),
    hasMarker: text.includes('établie ici'),
    len: text.length,
    sample: text.slice(0, 80),
  };
});
console.log('B2 — fenêtre Lieu (route115):', JSON.stringify(lieu));
assert.ok(lieu.hasAlcoves, 'B2 — la section alcôves a disparu de la fenêtre Lieu à Hoenn');
assert.ok(lieu.hasMarker, 'B2 — le marqueur « établie ici » de la base du joueur a disparu');

// ── C — textes à balises : le vdom ne doit plus les échapper ────────────────
const htmlChecks = await page.evaluate(() => {
  const v = window.PokeUI.views;
  const out = {};
  out.mine = v.MineWindowView.toHTML({ title: 'M', subtitle: window.t('mine_sub'), grid: { cols: 1, tiles: [] }, treasures: { rows: [], found: 0, total: 0 }, tools: [], newLayerLabel: '' });
  out.boxLock = v.BoxView.toHTML({ locked: true, lockLabel: window.t('battle_lock_box'), sorts: [], tabs: [], search: null, emptyAll: true, emptyLabel: window.t('box_empty'), swapMode: true, finishLabel: 'Fin', cells: [] });
  out.bag = v.BagView.toHTML({ emptyInventory: true, emptyLabel: window.t('inv_empty'), tabs: [], sorts: [] });
  out.quest = v.StoryWindowView.toHTML({ emptyState: { label: window.t('m.quest_ui.27'), boardLabel: window.t('m.quest_ui.16') } });
  return out;
});
// MineWindow/StoryWindow → chaîne ; Box/Bag → { filters, content, full }.
const asHtml = (v) => (typeof v === 'string' ? v : (v && (v.full ?? v.content)) || '');
const expectMarkup = [
  ['mine', out => asHtml(out.mine).includes('<b>Pierres') && !asHtml(out.mine).includes('&lt;b&gt;')],
  ['boxLock', out => asHtml(out.boxLock).includes('<b>Combat en cours') && asHtml(out.boxLock).includes('<br>') && !asHtml(out.boxLock).includes('&lt;')],
  ['bag', out => asHtml(out.bag).includes('Votre sac est vide.<br><br>') && !asHtml(out.bag).includes('&lt;')],
  ['quest', out => asHtml(out.quest).includes('pour l’instant.<br>') && !asHtml(out.quest).includes('&lt;')],
];
for (const [name, ok] of expectMarkup) {
  const pass = ok(htmlChecks);
  console.log(`C — ${name}: ${pass ? 'markup rendu' : 'ÉCHAPPÉ !'}`);
  assert.ok(pass, `C — ${name} : balises i18n échappées dans le vdom`);
}

// ── D — zéro erreur page ────────────────────────────────────────────────────
if (pageErrors.length) throw new Error('pageerrors: ' + pageErrors.join(' | '));
await browser.close();
console.log('smoke-secret-base: OK — baseGetState résout, fenêtre base + alcôves Lieu restaurées, balises i18n rendues (4 sites), 0 erreur page.');
