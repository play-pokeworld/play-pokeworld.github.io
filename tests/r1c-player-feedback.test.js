// ═════════════════════════════════════════════════
// V7-R1c — retours joueurs « Il reste des bugs » (6 points)
// ═════════════════════════════════════════════════
//   1. Auto donjon : le pilote « plateau » (farm) et « coffres » ne vont au
//      boss QU'UNE FOIS la mission accomplie (tout le plateau / tous les coffres).
//   2. Combats dresseurs : le Pokémon adverse s'affiche comme un sauvage
//      (carte ennemie + barres d'attaques) — la carte du dresseur vit dans un
//      hôte dédié au-dessus de la rangée, plus devant la carte ennemie.
//   3. Carte : le zoom (pincement mobile) survit au clic sur un lieu.
//   4. Diamants : source unique = revente des trésors de la Mine ; la colonne 💎
//      se dévoile dès que la Mine est ouverte et le guide « Monnaies » l'explique.
//   5. Sac trésor : plus de texte « 175💎₽ » (l'unité est portée par la valeur).
//   6. Icône du jeu : Icon.png du joueur (1024) + déclinaisons 192 / 180.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── 1. pilote auto ────────────────────────────────────────────────────────────
function dungeonSandbox({ badgeReq = 0, forest = false } = {}) {
  globalThis.G = {
    money: 0,
    dungeonsExplored: 0,
    dungeonRun: null,
    dungeonClears: { x: 99 },
    team: [{ currentHP: 10, maxHP: 10 }],
  };
  const wallet = { dungeonTokens: 100000, revealed: {} };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => {
    wallet.dungeonTokens -= n;
    return true;
  };
  globalThis.gainDungeonTokens = (n) => {
    wallet.dungeonTokens += n;
  };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq, bg: forest ? 'forest' : 'cave' });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.aliveCount = () => 6;
  globalThis.battle = { active: false };
  return wallet;
}

const DG = await import('../src/application/world/dungeon-run.js');

/** Joue le pilote sur le 1er étage ; renvoie l'état du plateau au moment où le boss est engagé. */
function simulatePilot(mode, opts) {
  dungeonSandbox(opts);
  const events = [];
  globalThis.exploreArea = () => {
    const run = DG.currentDungeonRun();
    const b = globalThis.battle;
    const tile = run.map.tiles[run.pendingNode];
    events.push('fight:' + (tile ? tile.type : '?'));
    if (b.pendingDungeonBoss) {
      b.pendingDungeonBoss = false;
      DG.dungeonOnWin();
      DG.dungeonOnBossDefeated();
      return;
    }
    DG.dungeonOnWin();
  };
  const run = DG.startDungeonRun('x');
  const tiles = Object.values(run.map.tiles);
  const stat = () => ({
    revealed: tiles.filter((t) => t.revealed).length,
    total: tiles.length,
    chestsDone: tiles.filter((t) => t.type === 'chest' && t.done).length,
    chests: tiles.filter((t) => t.type === 'chest').length,
    combatsDone: tiles.filter((t) => (t.type === 'combat' || t.type === 'elite') && t.done).length,
    combats: tiles.filter((t) => t.type === 'combat' || t.type === 'elite').length,
  });
  DG.dungeonSetAuto(mode);
  const floorStart = run.floor;
  let guard = 0;
  let atBoss = null;
  let steps = 0;
  while (DG.currentDungeonRun() && DG.currentDungeonRun().floor === floorStart && guard++ < 400) {
    const before = events.length;
    DG._dgAutoStep();
    steps++;
    if (!atBoss && events.slice(before).includes('fight:boss')) atBoss = stat();
  }
  const after = DG.currentDungeonRun();
  const outcome = after ? { floor: after.floor } : { ended: true };
  if (after) DG.dungeonAbandon();
  return { atBoss, outcome, steps, fights: events.length, depth: run.depth, guard };
}

for (const opts of [
  { badgeReq: 0, forest: true },
  { badgeReq: 3, forest: false },
]) {
  const label = `badgeReq ${opts.badgeReq}`;

  test(`R1c-1a farm (${label}) : le boss n'est engagé qu'une fois TOUT le plateau fait`, () => {
    for (let i = 0; i < 3; i++) {
      const r = simulatePilot('farm', opts);
      assert.ok(r.atBoss, 'le pilote finit par engager le boss');
      assert.equal(r.atBoss.chestsDone, r.atBoss.chests, 'tous les coffres ouverts avant le boss');
      assert.equal(r.atBoss.combatsDone, r.atBoss.combats, 'tous les combats faits avant le boss');
      assert.equal(r.atBoss.revealed, r.atBoss.total, 'tout le plateau révélé avant le boss');
      assert.ok(r.guard < 400, 'pas de boucle infinie');
    }
  });

  test(`R1c-1b chest (${label}) : le boss n'est engagé qu'une fois TOUS les coffres trouvés`, () => {
    for (let i = 0; i < 3; i++) {
      const r = simulatePilot('chest', opts);
      assert.ok(r.atBoss, 'le pilote finit par engager le boss');
      assert.equal(r.atBoss.chestsDone, r.atBoss.chests, 'tous les coffres ouverts avant le boss');
      assert.ok(r.guard < 400, 'pas de boucle infinie');
    }
  });

  test(`R1c-1c boss (${label}) : le mode boss file au boss puis descend / termine`, () => {
    const r = simulatePilot('boss', opts);
    assert.ok(r.atBoss, 'boss engagé');
    assert.ok(r.steps <= 40, `peu d'étapes (${r.steps})`);
    assert.ok(r.outcome.ended || r.outcome.floor === 2, 'descente ou fin de run juste après le boss');
  });
}

test('R1c-1d farm : après la victoire sur le boss, le pilote descend dans la même foulée', () => {
  const r = simulatePilot('farm', { badgeReq: 3 });
  assert.ok(r.atBoss);
  assert.ok(r.outcome.ended || r.outcome.floor === 2, JSON.stringify(r.outcome));
});

test('R1c-1e le chemin BFS du pilote ne traverse JAMAIS la case du boss', () => {
  const src = read('src/application/world/dungeon-run.js');
  assert.match(src, /function _dgBfsPath\(run, targetId, fightCost\)/);
  assert.match(src, /bossTile/, 'le BFS connaît la case du boss');
  assert.match(src, /function _dgAutoKick/);
  const step = src.slice(src.indexOf('function _dgAutoStep('), src.indexOf('function _dgInitDungeonKeys'));
  assert.match(step, /mode === 'farm'/);
  assert.match(step, /mode === 'chest'/);
  assert.match(step, /run\.bossDefeated && run\.pos === run\.bossTile/);
  assert.doesNotMatch(step, /target\.type !== 'boss'/);
});

// ── 2. combats dresseurs ─────────────────────────────────────────────────────
test('R1c-2a index.html : hôte dédié à la carte du dresseur AVANT la rangée de combat', () => {
  const html = read('index.html');
  const host = html.indexOf('id="battle-trainer-host"');
  const row = html.indexOf('id="battle-team-row"');
  assert.ok(host > 0, '#battle-trainer-host présent');
  assert.ok(row > host, "l'hôte précède #battle-team-row");
});

test('R1c-2b battle-team-ui : la carte du dresseur va dans l’hôte, jamais devant la carte ennemie', () => {
  const src = read('src/ui/game/battle-team-ui.js');
  assert.match(src, /battle-trainer-host/);
  const fn = src.slice(src.indexOf('function renderBattleTeamRow('));
  assert.match(fn, /trainerVisualHtml\(/);
  assert.match(fn, /getElementById\('battle-trainer-host'\)/);
});

test('R1c-2c design-system : l’hôte n’ajoute une marge que lorsqu’il est rempli', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /#battle-trainer-host:not\(:empty\)\s*\{\s*margin-bottom:\s*8px;\s*\}/);
});

// ── 3. zoom carte ────────────────────────────────────────────────────────────
test('R1c-3 renderMap : le zoom est ré-appliqué après la réinitialisation du viewBox', () => {
  const src = read('src/ui/game/map-render.js');
  assert.match(src, /let __pwMapZoomRegion/);
  const fn = src.slice(src.indexOf('function renderMap('), src.indexOf('function applyMapViewBox('));
  assert.match(fn, /__pwMapZoomRegion/);
  assert.match(fn, /__pwMapZoom > 1/);
  assert.match(fn, /applyMapViewBox\(\)/);
});

// ── 4. diamants ──────────────────────────────────────────────────────────────
function economySandbox({ diamonds = 0, mineOpen = false } = {}) {
  globalThis.G = { money: 0, team: [], badges: [] };
  globalThis.mineUnlocked = () => mineOpen;
  delete globalThis.G.wallet;
  return diamonds;
}

const CUR = await import('../src/application/economy/currency.js');

test('R1c-4a diamondTreasureList : les trésors convertibles, triés, cohérents avec items-data', () => {
  const list = CUR.diamondTreasureList();
  assert.ok(list.length >= 7, 'au moins 7 trésors');
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].value <= list[i].value, 'tri croissant');
  const items = read('src/data/items-data.js');
  for (const { key, value } of list) {
    const m = items.match(new RegExp(`"${key}":\\s*\\{[^}]*"diamondValue":\\s*(\\d+)`));
    assert.ok(m, `${key} a un diamondValue dans items-data.js (la vente ECS lit itemDef.diamondValue)`);
    assert.equal(Number(m[1]), value, `${key} : DIAMOND_VALUES et items-data d'accord`);
    assert.equal(CUR.diamondValueOf(key), value);
  }
});

test('R1c-4b la colonne 💎 se dévoile dès que la Mine est ouverte (même à 0)', () => {
  economySandbox({ mineOpen: false });
  let snap = CUR.currencySnapshot().find((c) => c.id === 'diamonds');
  assert.equal(snap.revealed, false, 'Mine fermée, jamais de diamant : colonne cachée');
  economySandbox({ mineOpen: true });
  snap = CUR.currencySnapshot().find((c) => c.id === 'diamonds');
  assert.equal(snap.revealed, true, 'Mine ouverte : colonne visible à 0 💎');
  assert.equal(snap.amount, 0);
  // et une fois le 1er diamant gagné, elle reste visible même si mineUnlocked régresse
  CUR.gainDiamonds(5);
  globalThis.mineUnlocked = () => false;
  snap = CUR.currencySnapshot().find((c) => c.id === 'diamonds');
  assert.equal(snap.revealed, true);
  assert.equal(snap.amount, 5);
});

test('R1c-4c guide « Monnaies » : page en tête d’Économie, chiffres lus dans le code', async () => {
  economySandbox({ mineOpen: true });
  const fr = read('src/localization/fr/ui.js');
  const en = read('src/localization/en/ui.js');
  for (const s of [fr, en]) {
    assert.match(s, /"guide_currencies":/);
    assert.match(s, /"guide_currencies_desc":"[^"]*\{treasures\}[^"]*"/);
    assert.match(s, /"guide_currencies_desc":"[^"]*\{mine\}[^"]*"/);
    assert.doesNotMatch(s.match(/"guide_currencies_desc":"([^"]*)"/)[1], /\d{2,}/, 'aucun chiffre en dur');
  }
  globalThis.t = (k) => k;
  globalThis.tr = (k, v) => k + ' ' + JSON.stringify(v);
  globalThis.getItemName = (k) => 'N_' + k;
  globalThis.formatNumber = (n) => String(n);
  globalThis.getLocName = (id) => 'L_' + id;
  const GS = await import('../src/ui/game/guide-sections.js');
  const page = GS.guideSections().economy.pages[0];
  assert.equal(page[0], 'guide_currencies');
  assert.match(page[1], /N_nugget 100 💎/);
  assert.match(page[1], /N_heart_scale 350 💎/);
  assert.match(page[1], /L_diglettscave/);
});

test('R1c-4d gainDiamonds n’est plus réservé au debug : la vente ECS crédite wallet.diamonds', () => {
  const ecs = read('src/application/ecs-gameplay-systems.js');
  const block = ecs.slice(ecs.indexOf("op.op === 'sell-treasure'"));
  assert.match(block, /wallet\.diamonds = \(Number\(wallet\.diamonds\) \|\| 0\) \+ diamondUnit \* count/);
  const market = read('src/application/market-system.js');
  assert.match(market, /treasure_sold_diamonds/);
});

// ── 5. textes de vente ───────────────────────────────────────────────────────
test('R1c-5a m.treasure_sell_sub ne suffixe plus « ₽ » (la valeur porte son unité 💎 ou ₽)', () => {
  for (const lang of ['fr', 'en']) {
    const s = read(`src/localization/${lang}/messages.js`);
    const m = s.match(/"m\.treasure_sell_sub":"([^"]*)"/);
    assert.ok(m, lang);
    assert.match(m[1], /\{value\}/);
    assert.doesNotMatch(m[1], /₽|💎/, `${lang} : aucune unité dans le gabarit`);
  }
  const src = read('src/application/economy/inventory-actions.js');
  assert.match(src, /diamonds > 0 \? formatNumber\(diamonds\) \+ '💎'/);
});

test('R1c-5b descriptions d’objets : Pépite / Poussière Étoile parlent de diamants, sans prix en dur', () => {
  const en = read('src/localization/en/items.js');
  const fr = read('src/localization/fr/items.js');
  assert.doesNotMatch(en, /worth [\d,]+₽/);
  assert.match(en, /"nugget":\s*\{\s*"name": "Nugget",\s*"desc": "[^"]*diamonds/);
  assert.match(fr, /nugget:\{name:'Pépite',desc:'[^']*diamants/);
  assert.match(fr, /stardust:\{name:'Poussière Étoile',desc:'[^']*diamants/);
  assert.match(read('src/localization/fr/ui.js'), /"guide_treasures_desc":"[^"]*diamants/);
  assert.match(read('src/localization/en/ui.js'), /"guide_treasures_desc":"[^"]*diamonds/);
});

// ── 6. icône ─────────────────────────────────────────────────────────────────
function pngSize(p) {
  const buf = readFileSync(new URL('../' + p, import.meta.url));
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', p + ' est un PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test('R1c-6 icône du jeu : Icon.png 1024² + déclinaisons 192² / 180², référencées par index.html', () => {
  assert.deepEqual(pngSize('src/assets/images/Icon.png'), { w: 1024, h: 1024 });
  assert.deepEqual(pngSize('src/assets/images/icon-192.png'), { w: 192, h: 192 });
  assert.deepEqual(pngSize('src/assets/images/icon-180.png'), { w: 180, h: 180 });
  const html = read('index.html');
  assert.match(html, /rel="icon"[^>]*href="src\/assets\/images\/Icon\.png"/);
  assert.match(html, /sizes="192x192" href="src\/assets\/images\/icon-192\.png"/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="src\/assets\/images\/icon-180\.png"/);
  assert.match(html, /class="brand-mark"[^]*?<img src="src\/assets\/images\/Icon\.png"/);
});
