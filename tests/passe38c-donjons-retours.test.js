// ════════════════════════════════════════════════════════════════════════════
// PASSE 38c — NOUVEAUX RETOURS JOUEUR (14 points) :
//   1. paysage : rochers plus petits ;
//   2. affichage : latérales ≤ 50 % de la centrale (déjà 1:2:1, re-mesuré) ;
//   3. donjon : première case TOUJOURS vide ;
//   4. donjon : combat = logo de POKÉBALL VIDE, case soldée → vide ;
//   5. donjon : boss / pokéball / coffre = MÊME couleur (glyphes N&B teintés
//      en CSS) ;
//   6. donjon : cases combat et échelle bien distinctes du fond ;
//   7. donjon : moins de cases vides — boss GARDÉ, jamais sans combat ;
//   8. donjon : carte progressive 7×5 → 15×10 selon la localisation ;
//   9. donjon : légende supprimée ;
//  10. donjon : « Boss vaincu… » supprimé ;
//  11. donjon : « Remonter et encaisser » ROUGE comme le quitter ;
//  12. donjon : butin sous la carte, toujours actif, tout le butin du run ;
//      « sac d'expédition » supprimé ;
//  13. donjon : aide clavier supprimée ;
//  14. guide donjon dès la quête du premier donjon ; résumé de session à la
//      sortie du donjon ; auto à 3 modes (boss / plateau / coffres).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function sandbox({ badgeReq = 0, tokens = 100000, clears = 0 } = {}) {
  globalThis.G = {
    money: 0, dungeonsExplored: 0, dungeonRun: null,
    dungeonClears: clears ? { mtmoon: clears } : {},
    team: [{ currentHP: 100, maxHP: 100 }], unlockedLocs: { viridianforest: true, mtmoon: true },
  };
  const wallet = { dungeonTokens: tokens };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.exploreArea = () => {};
  globalThis.aliveCount = () => 6;
  globalThis.battle = { active: false, sessionCatches: [], sessionItems: {}, dungeonElite: false };
  globalThis.openBattleSummary = () => {};
  return wallet;
}

// tutorial.js planifie un minuteur de hooks qui lit `window` : on fournit un
// stub Node (les hooks sont des no-ops sans navigateur).
if (!globalThis.window) globalThis.window = globalThis;

const M = await import('../src/application/world/dungeon-run.js');
const T = await import('../src/ui/game/tutorial.js');
const tile = (run, id) => run.map.tiles[id];
const nb = (run, id) => {
  const t = tile(run, id);
  return [[1, 0], [-1, 0], [0, -1], [0, 1]]
    .map(([dc, dr]) => tile(run, `c${t.col + dc}r${t.row + dr}`))
    .filter(Boolean);
};

// ─── 8. TAILLE PROGRESSIVE DE LA CARTE ──────────────────────────────────────
test('38c-G1 — la grille grandit avec la localisation : 7×5 au début → 11×8 max (PASSE 39d : plus de débordement)', () => {
  // PASSE 39d — une grille 15×10 (150 cases) débordait de la fenêtre : les
  // tuiles sont de taille fixe et l'ensemble devenait plus haut que l'écran.
  // Plafonnée à 11×8 (88 cases) + scroll interne CSS.
  assert.deepEqual(M._dgGridSizeFor(0), { cols: 7, rows: 5 });
  assert.deepEqual(M._dgGridSizeFor(8), { cols: 11, rows: 8 });
  let prevArea = 0;
  for (let b = 0; b <= 8; b++) {
    const { cols, rows } = M._dgGridSizeFor(b);
    assert.ok(cols >= 7 && cols <= 11, `cols ${cols} borné pour badgeReq ${b}`);
    assert.ok(rows >= 5 && rows <= 8, `rows ${rows} borné pour badgeReq ${b}`);
    assert.ok(cols * rows >= prevArea, `la surface ne doit jamais rapetisser (badgeReq ${b})`);
    prevArea = cols * rows;
  }
  const css = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  assert.match(css, /\.pw-dgn-grid[\s\S]{0,200}?minmax\(0,\s*1fr\)/, 'colonnes flexibles (minmax(0,1fr))');
  assert.match(css, /\.pw-dgn-grid[\s\S]{0,700}?overflow-y:\s*auto/, 'scroll interne si besoin');
});

test('38c-G2 — le plateau généré suit la progression (7×5 → 11×8) et l\'entrée reste bas/milieu/vide', () => {
  sandbox({ badgeReq: 0 });
  const run0 = M.startDungeonRun('mtmoon');
  assert.equal(run0.map.cols, 7);
  assert.equal(run0.map.rows, 5);
  assert.equal(Object.keys(run0.map.tiles).length, 35);
  assert.equal(run0.pos, 'c3r4');
  assert.equal(tile(run0, run0.pos).type, 'empty', 'la première case est VIDE');
  M.dungeonAbandon();

  sandbox({ badgeReq: 8 });
  const run8 = M.startDungeonRun('mtmoon');
  assert.equal(run8.map.cols, 11);
  assert.equal(run8.map.rows, 8);
  assert.equal(run8.pos, 'c5r7', 'entrée bas/milieu sur grande grille');
  assert.equal(tile(run8, run8.pos).type, 'empty', 'la première case est TOUJOURS vide');
  M.dungeonAbandon();
});

// ─── 7. MOINS DE CASES VIDES, BOSS GARDÉ ────────────────────────────────────
test('38c-G3 — le boss est GARDÉ : toutes ses cases voisines sont des combats', () => {
  sandbox({ badgeReq: 0 });
  const run = M.startDungeonRun('mtmoon');
  const guards = nb(run, run.bossTile);
  assert.ok(guards.length >= 2, 'le boss a au moins 2 voisines (dont des gardes)');
  for (const g of guards) {
    assert.ok(g.type === 'combat' || g.type === 'elite', `garde ${g.id} = combat (type ${g.type})`);
  }
  // pas de case vide collée au boss
  assert.ok(guards.every((g) => g.type !== 'empty'), 'aucune case vide adjacente au boss');
  M.dungeonAbandon();
});

test('38c-G4 — le boss est TÉLÉPORTABLE comme toute case visible (retour joueur 39)', () => {
  sandbox({ badgeReq: 0 });
  const run = M.startDungeonRun('mtmoon');
  // rendre le boss visible (comme après exploration) et y sauter de loin
  for (const t of Object.values(run.map.tiles)) t.revealed = true;
  M.dungeonMoveTo(run.bossTile);
  assert.equal(run.pos, run.bossTile, 'depuis n\'importe quelle case visible, on peut défier le boss');
  M.dungeonAbandon();
});

test('38c-G5 — les cases vides ne sont plus la majorité, et le chemin PIÉTON vers le boss croise un combat', () => {
  for (const badgeReq of [0, 4, 8]) {
    sandbox({ badgeReq });
    const run = M.startDungeonRun('mtmoon');
    const types = Object.values(run.map.tiles).map((t) => t.type);
    const empties = types.filter((t) => t === 'empty').length;
    const combats = types.filter((t) => t === 'combat' || t === 'elite').length;
    const chests = types.filter((t) => t === 'chest').length;
    assert.ok(empties < combats + chests, `badgeReq ${badgeReq}: vides ${empties} < combats+coffres ${combats + chests}`);
    // en marchant (sans téléportation), le plus court chemin entrée→boss
    // traverse au moins une case combat (couloir garanti + gardes).
    const path = (() => {
      const prev = { [run.pos]: null };
      const q = [run.pos];
      while (q.length) {
        const cur = q.shift();
        if (cur === run.bossTile) {
          const p = [cur]; let x = cur;
          while (prev[x]) { x = prev[x]; p.unshift(x); }
          return p;
        }
        for (const n of nb(run, cur)) {
          if (n.id in prev) continue;
          prev[n.id] = cur;
          q.push(n.id);
        }
      }
      return null;
    })();
    assert.ok(path && path.length > 1, 'chemin entrée→boss existant');
    const mid = path.slice(1, -1).some((id) => {
      const t = tile(run, id);
      return t.type === 'combat' || t.type === 'elite';
    });
    assert.ok(mid, `badgeReq ${badgeReq}: le chemin piéton vers le boss croise un combat`);
    M.dungeonAbandon();
  }
});

// ─── 12. BUTIN SOUS LA CARTE + RÉSUMÉ À LA SORTIE ───────────────────────────
test('38c-L1 — le butin du run se cumule dans run.loot à chaque victoire', () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  globalThis.battle.sessionCatches = [{ id: 25, name: 'Pikachu', emoji: '⚡', shiny: false, dupe: false }];
  globalThis.battle.sessionItems = { potion: 2 };
  M.dungeonOnWin();
  assert.equal(run.loot.catches.length, 1, 'la capture est cumulée');
  assert.equal(run.loot.items.potion, 2, 'l\'objet est cumulé');
  // deuxième victoire : une autre capture s\'ajoute, la session repart à zéro
  globalThis.battle.sessionCatches = [{ id: 133, name: 'Évoli', emoji: '🦊', shiny: false, dupe: false }];
  globalThis.battle.sessionItems = {};
  M.dungeonOnWin();
  assert.equal(run.loot.catches.length, 2, 'deux captures cumulées');
  assert.equal(run.loot.items.potion, 2, 'l\'objet reste cumulé');
  assert.equal(globalThis.battle.sessionCatches.length, 0, 'la session est vidée après récolte');
  M.dungeonAbandon();
});

test('38c-L2 — la source UNIFIÉE (getBattleSessionSummaryData) agrège TOUT le run : captures + objets + UN SEUL total d\'argent + jetons', async () => {
  const BS = await import('../src/ui/game/battle-summary.js');
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  run.bag.tokens = 123;
  run.loot.money = 50;
  run.loot.catches = [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }];
  run.loot.items = { potion: 3 };
  run.totalWins = 4;
  const data = BS.getBattleSessionSummaryData();
  // PASSE 39e — un SEUL total d\'argent (tout le run, jamais « total + dernier
  // combat »), les jetons du sac, toutes les captures et objets du run.
  assert.equal(data.money, 50, 'UN SEUL total d\'argent (tout le run)');
  assert.equal(data.tokens, 123, 'les jetons du sac');
  assert.equal(data.totalCaptures, 1, 'la capture du run');
  assert.equal(data.catches[0].id, 25, 'Pikachu');
  assert.deepEqual(data.itemEntries[0], ['potion', 3], 'l\'objet du run');
  assert.equal(data.wins, 4, 'les victoires du run entier');
  M.dungeonAbandon();
});

test('38c-L3 — sortir du donjon OUVRE le résumé de session avec tout le butin du run', async () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  run.bag.tokens = 10;
  run.bag.money = 20;
  run.totalWins = 5;
  run.loot.catches = [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }];
  let opened = 0;
  let captured = null;
  globalThis.openBattleSummary = () => { opened++; };
  M.dungeonAscend();
  await new Promise((r) => setTimeout(r, 450));
  assert.equal(opened, 1, 'le résumé s\'est ouvert à la sortie du donjon');
  assert.equal(globalThis.battle.sessionCatches.length, 1, 'les captures du run sont versées au résumé');
  assert.equal(globalThis.battle.sessionWins, 5, 'les victoires du run sont versées au résumé');
  assert.equal(globalThis.G.dungeonRun, null, 'le run est bien clos');
});

test('38c-L4 — le « sac d\'expédition » (bag) ET le panneau parallèle ont disparu : le butin est la réglette commune sous la carte', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.doesNotMatch(js, /pw-bdg-bag/, 'la section sac d\'expédition a été retirée du bandeau');
  assert.doesNotMatch(js, /pw-bdg-loot/, 'le panneau de butin parallèle a été supprimé (PASSE 39e)');
  assert.doesNotMatch(js, /_dgLootHtml/, 'la fonction de rendu dupliquée a été supprimée');
  assert.match(js, /renderBattleLoot/, 'le bandeau rafraîchit la réglette commune #battle-loot-inline');
  const html = read('index.html');
  assert.ok(html.indexOf('id="battle-dungeon-bar"') < html.indexOf('id="battle-loot-row"'),
    'la réglette de butin est placée APRÈS la carte (sous la carte)');
});

// ─── 9 / 10 / 13. SUPPRESSIONS UI ───────────────────────────────────────────
test('38c-U1 — plus de légende, plus d\'aide clavier, plus de « Boss vaincu… »', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.doesNotMatch(js, /dungeon_boss_down/, 'le toast « Boss vaincu… » a été retiré');
  assert.doesNotMatch(js, /dungeon_ladder_hint/, 'l\'aide « Boss vaincu : monte sur l\'échelle » a été retirée');
  assert.doesNotMatch(js, /pw-bdg-legend/, 'la légende a été retirée');
  assert.doesNotMatch(js, /dungeon_keys_hint/, 'l\'aide clavier a été retirée');
});

// ─── 11. BOUTON ROUGE ───────────────────────────────────────────────────────
test('38c-U2 — « Remonter et encaisser » est ROUGE, comme le quitter de combat', () => {
  const css = read('src/assets/styles/design-system.css');
  const bloc = css.slice(css.indexOf('.pw-bdg-up {'), css.indexOf('.pw-bdg-up {') + 400);
  assert.match(bloc, /var\(--red\)/, 'fond rouge');
  assert.match(bloc, /font-weight:\s*700/, 'graisse forte');
});

// ─── 14. GUIDE + AUTO 3 MODES ───────────────────────────────────────────────
test('38c-GD1 — le guide a une rubrique Donjon, visible dès la quête du premier donjon', () => {
  const tuto = read('src/ui/game/tutorial.js');
  assert.match(tuto, /dungeon:\s*\{icon/, 'rubrique donjon dans le guide');
  assert.match(tuto, /guide_dungeon_title/, 'titre localisé');
  assert.match(tuto, /dungeonGuideUnlocked/, 'déblocage dédié');
  assert.match(tuto, /id === 'dungeon' && !dungeonGuideUnlocked\(\)/, 'filtre de déblocage branché');
  // à partir de la quête du premier donjon : dès qu\'un donjon est débloqué
  sandbox(); // unlockedLocs.viridianforest = true
  assert.equal(T.dungeonGuideUnlocked(), true, 'donjon débloqué → page visible');
  globalThis.G.unlockedLocs = {};
  assert.equal(T.dungeonGuideUnlocked(), false, 'aucun donjon débloqué → page cachée');
});

test('38c-AM1 — dungeonSetAuto accepte les 3 modes, refuse les valeurs inconnues, OFF éteint', () => {
  sandbox({ clears: 5 });
  const run = M.startDungeonRun('mtmoon');
  M.dungeonSetAuto('boss');
  assert.equal(run.auto, 'boss', 'mode boss');
  M.dungeonSetAuto('farm');
  assert.equal(run.auto, 'farm', 'mode plateau');
  M.dungeonSetAuto('chest');
  assert.equal(run.auto, 'chest', 'mode coffres');
  M.dungeonSetAuto('off');
  assert.equal(run.auto, false, 'off éteint');
  M.dungeonSetAuto('bogus');
  assert.equal(run.auto, false, 'mode inconnu refusé');
  M.dungeonAbandon();
});

test('38c-AM2 — mode boss : le pilote fonce vers le boss (la distance diminue)', () => {
  sandbox({ clears: 5 });
  const run = M.startDungeonRun('mtmoon');
  M.dungeonSetAuto('boss');
  const d0 = Math.abs(tile(run, run.bossTile).col - tile(run, run.pos).col)
           + Math.abs(tile(run, run.bossTile).row - tile(run, run.pos).row);
  M._dgAutoStep();
  const run2 = M.currentDungeonRun();
  const d1 = Math.abs(tile(run2, run2.bossTile).col - tile(run2, run2.pos).col)
           + Math.abs(tile(run2, run2.bossTile).row - tile(run2, run2.pos).row);
  assert.ok(d1 < d0, `le pilote se rapproche du boss (${d0} → ${d1})`);
  M.dungeonAbandon();
});

test('38c-AM3 — mode coffres : le pilote cible un coffre, pas le boss tant qu\'il reste des coffres', () => {
  sandbox({ clears: 5 });
  const run = M.startDungeonRun('mtmoon');
  // on garde UN SEUL coffre (révélé), les autres deviennent vides
  const chest = Object.values(run.map.tiles).find((t) => t.type === 'chest');
  assert.ok(chest, 'il y a des coffres');
  for (const t of Object.values(run.map.tiles)) if (t.type === 'chest' && t.id !== chest.id) t.type = 'empty';
  chest.revealed = true;
  M.dungeonSetAuto('chest');
  M._dgAutoStep();
  const run2 = M.currentDungeonRun();
  const dChest = Math.abs(tile(run2, chest.id).col - tile(run2, run2.pos).col)
               + Math.abs(tile(run2, chest.id).row - tile(run2, run2.pos).row);
  assert.ok(dChest < 3, `le pilote se dirige vers le coffre (distance ${dChest})`);
  M.dungeonAbandon();
});

// ─── 1. PAYSAGE : ROCHERS PLUS PETITS ───────────────────────────────────────
test('38c-P1 — les rochers de premier plan sont nettement plus petits (sommets bas)', () => {
  const css = read('src/assets/styles/design-system.css');
  const fg = css.slice(css.indexOf('#pw-land-fg {'), css.indexOf('#pw-land-fg {') + 4000);
  // le SVG est URL-encodé dans la data URI : les sommets des rochers sont à
  // y ≥ 15 (au lieu de y = 4-10 avant la PASSE 38c)
  assert.match(fg, /L38%2016/, 'nouveau profil de rocher (sommet y=16)');
  assert.match(fg, /L374%2015/, 'deuxième rocher, sommet à y=15');
  // l'ancien profil « gros rochers » (sommets à y=4-10) a disparu
  assert.doesNotMatch(fg, /L44%204%20L70%2016/, 'l\'ancien gros rocher (sommet y=4) a disparu');
  assert.doesNotMatch(fg, /L150%2010/, 'l\'ancien rocher (sommet y=10) a disparu');
});

// ─── 4. POKÉBALL DE LA BARRE DE TITRE (retour 38e) ───────────────────────────
test('38c-IC1 — la case de combat utilise la POKÉBALL de la barre de titre (pokeball.svg), pas le contour dessiné', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.match(js, /case 'combat':\s+return t\.done \? '' : _dgGlyph\('src\/assets\/images\/dungeon\/pokeball\.svg'\)/,
    'combat non soldé → pokéball de la barre de titre ; soldé → case vide');
  assert.match(js, /case 'elite':\s+return t\.done \? '' : '<span class="pw-dgn-elite">'/,
    'l\'élite superpose une étoile à la pokéball');
  // pokeball.svg = exactement l\'icône de la fenêtre « Poké Balls »
  // (cercle + trait + bouton), tracée en noir pour la teinte par masque.
  const svg = read('src/assets/images/dungeon/pokeball.svg');
  assert.match(svg, /<circle cx="12" cy="12" r="10"\/>/, 'cercle de la pokéball');
  assert.match(svg, /<line x1="2" y1="12" x2="22" y2="12"\/>/, 'trait médian de la pokéball');
  assert.match(svg, /<circle cx="12" cy="12" r="3"\/>/, 'bouton central de la pokéball');
  assert.match(svg, /stroke="#000000"/, 'glyphe noir (teinté en CSS par masque)');
  // les PNG Pokéclicker restent régénérés en monochrome (saturation ≈ 0)
  const out = execSync(`python3 -c "
from PIL import Image
import numpy as np
im = Image.open('src/assets/images/dungeon/encounter.png').convert('RGBA')
a = np.array(im)
m = a[...,3] > 40
rgb = a[...,:3][m]
print(float((rgb.max(axis=1)-rgb.min(axis=1)).mean()))
"`).toString().trim();
  assert.ok(parseFloat(out) < 2, `saturation encounter = ${out} (< 2) : monochrome`);
});
