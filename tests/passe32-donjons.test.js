// ════════════════════════════════════════════════════════════════════════════
// PASSE 32 — LES DONJONS : la boucle d'expédition
// ════════════════════════════════════════════════════════════════════════════
// Le joueur a validé la proposition `docs/PROPOSITION-DONJONS.md` (« j'aime
// beaucoup l'idée ») en laissant le gameplay à mon initiative. Ces tests
// verrouillent les cinq promesses tenues par le design, celles qu'une passe
// ultérieure ne doit pas défaire par accident :
//   1. le péage achète UNE expédition, pas un combat ;
//   2. le butin n'est encaissé qu'à la remontée ;
//   3. un K.O. général coûte la moitié du sac ;
//   4. un K.O. au premier palier rembourse le péage ;
//   5. le gardien du dernier palier clôt la session avec un bonus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ── Bac à sable : on branche les seules dépendances que le module consulte ──
// (`dungeon-run.js` s'écrit sur globalThis à l'import : c'est sa surface
//  classique, celle que consomment les fenêtres et le dispatcher d'actions.)
function sandbox({ badgeReq = 0, tokens = 100000 } = {}) {
  globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null };
  const wallet = { dungeonTokens: tokens, revealed: {} };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  return wallet;
}

const M = await import('../src/application/world/dungeon-run.js');

/** Purge le palier courant en enchaînant les victoires exigées. */
function clearFloor() {
  const run = M.currentDungeonRun();
  const need = M.dungeonQuotaFor(run.floor) - run.wins;
  for (let i = 0; i < need; i++) M.dungeonOnWin();
}

// ─── 1. Profondeur, multiplicateur, quota ───────────────────────────────────
test('32-D1 — la profondeur croît avec l\'exigence en badges (2 → 3, grand max 3)', () => {
  // PASSE 39d — retour joueur : « 12 paliers c'est beaucoup trop et
  // impossible, il faudrait grand max 3 palier » (les PV ne remontent plus
  // entre les combats). Une grotte fait 2 paliers sans badge, 3 au maximum.
  assert.equal(M.dungeonDepthFor(0), 2, 'un donjon sans badge fait 2 paliers');
  assert.equal(M.dungeonDepthFor(8), 3, 'la Caverne Azurée en fait 3 (max)');
  for (let b = 0; b <= 8; b++) {
    const d = M.dungeonDepthFor(b);
    assert.ok(d >= 1 && d <= 3, `profondeur hors bornes pour ${b} badges : ${d}`);
    if (b > 0) assert.ok(d >= M.dungeonDepthFor(b - 1), 'la profondeur ne doit jamais décroître');
  }
});

test('32-D2 — le multiplicateur récompense la descente, sans emballement', () => {
  assert.equal(M.dungeonMultFor(1), 1, 'le premier palier vaut la base');
  assert.ok(M.dungeonMultFor(2) > M.dungeonMultFor(1), 'descendre doit rapporter plus');
  assert.ok(M.dungeonMultFor(3) <= 2.1, 'le dernier palier (3 max) reste raisonnable');
  for (let f = 2; f <= 3; f++) {
    assert.ok(M.dungeonMultFor(f) > M.dungeonMultFor(f - 1), `palier ${f} : progression cassée`);
  }
});

test('32-D3 — le quota reste court (4 + palier) : la difficulté vient de la descente, pas de la répétition', () => {
  // PASSE 39d — les PV persistent d'un combat à l'autre : un quota long
  // serait infranchissable. 4 victoires au premier palier, +1 par palier.
  assert.equal(M.dungeonQuotaFor(1), 4, 'le premier palier demande 4 victoires');
  assert.ok(M.dungeonQuotaFor(1) <= 6, 'sans devenir une corvée');
  assert.ok(M.dungeonQuotaFor(3) > M.dungeonQuotaFor(1), 'la profondeur demande davantage');
});

test('32-D3b — un palier déjà purgé rapporte nettement moins (anti sur-place)', () => {
  sandbox();
  M.startDungeonRun('mtmoon');
  M.dungeonOnWin();
  const first = M.dungeonRunSummary().bag.tokens;
  clearFloor(); // atteint le quota
  const atQuota = M.dungeonRunSummary().bag.tokens;
  M.dungeonOnWin(); // victoire EN TROP sur un palier épuisé
  const extra = M.dungeonRunSummary().bag.tokens - atQuota;
  assert.ok(extra < first, 'farmer un palier purgé doit rapporter moins qu\'une victoire utile');
  assert.ok(extra >= 1, 'mais jamais rien : on ne punit pas le joueur prudent');
  M.dungeonAbandon();
});

// ─── 2. Le péage achète une expédition ──────────────────────────────────────
test('32-D4 — le péage est prélevé UNE fois, à l\'ouverture de la descente', () => {
  const w = sandbox();
  const before = w.dungeonTokens;
  const run = M.startDungeonRun('mtmoon');
  assert.ok(run, 'la descente doit s\'ouvrir');
  assert.equal(w.dungeonTokens, before - 500, 'le péage est prélevé une fois');
  // Une seconde tentative ne doit pas repayer : la session est déjà ouverte.
  M.startDungeonRun('mtmoon');
  assert.equal(w.dungeonTokens, before - 500, 'aucun second prélèvement pendant la descente');
  assert.equal(M.currentDungeonRun().floor, 1);
  M.dungeonAbandon();
});

test('32-D5 — sans jetons, aucune descente n\'est ouverte', () => {
  const w = sandbox({ tokens: 10 });
  assert.equal(M.startDungeonRun('mtmoon'), null, 'la descente doit être refusée');
  assert.equal(w.dungeonTokens, 10, 'aucun prélèvement');
  assert.equal(M.currentDungeonRun(), null);
});

// ─── 3. Le sac n'est crédité qu'à la remontée ───────────────────────────────
test('32-D6 — les gains restent dans le sac tant qu\'on n\'est pas remonté', () => {
  const w = sandbox();
  M.startDungeonRun('mtmoon');
  const afterToll = w.dungeonTokens;
  M.dungeonOnWin();
  M.dungeonOnWin();
  const s = M.dungeonRunSummary();
  assert.ok(s.bag.tokens > 0, 'les victoires remplissent le sac');
  assert.equal(w.dungeonTokens, afterToll, 'rien n\'est crédité pendant la descente');
  const res = M.dungeonAscend();
  assert.equal(res.outcome, 'ascend');
  assert.equal(w.dungeonTokens, afterToll + res.gained.tokens, 'la remontée verse tout le sac');
  assert.equal(M.currentDungeonRun(), null, 'la remontée clôt la session');
});

test('32-D7 — descendre exige d\'avoir purgé le palier, et paie mieux', () => {
  sandbox();
  M.startDungeonRun('mtmoon');
  M.dungeonOnWin();
  assert.equal(M.dungeonFloorCleared(), false, 'une victoire ne purge pas le palier');
  M.dungeonDescend();
  assert.equal(M.currentDungeonRun().floor, 1, 'la descente est refusée tant que le quota n\'est pas atteint');
  clearFloor();
  assert.equal(M.dungeonFloorCleared(), true);
  M.dungeonDescend();
  const s = M.dungeonRunSummary();
  assert.equal(s.floor, 2, 'le palier suivant est ouvert');
  assert.equal(s.wins, 0, 'le quota repart de zéro');
  assert.ok(s.mult > 1, 'le butin du palier 2 vaut plus que celui du palier 1');
  M.dungeonAbandon();
});

// ─── 4. Le risque : K.O. général ────────────────────────────────────────────
test('32-D8 — un K.O. général au palier 2 coûte la moitié du sac', () => {
  const w = sandbox();
  M.startDungeonRun('mtmoon');
  clearFloor();
  M.dungeonDescend();
  M.dungeonOnWin();
  const bag = M.dungeonRunSummary().bag;
  const afterToll = w.dungeonTokens;
  const res = M.dungeonOnWipe();
  assert.equal(res.outcome, 'wipe');
  assert.equal(res.kept.tokens, Math.floor(bag.tokens * 0.5), 'la moitié du sac survit');
  assert.equal(res.refunded, 0, 'pas de remboursement au-delà du premier palier');
  assert.equal(w.dungeonTokens, afterToll + res.kept.tokens);
  assert.equal(M.currentDungeonRun(), null, 'le K.O. clôt la session');
});

test('32-D9 — un K.O. au PREMIER palier rembourse le péage', () => {
  const w = sandbox();
  const before = w.dungeonTokens;
  M.startDungeonRun('mtmoon');
  M.dungeonOnWin();
  const res = M.dungeonOnWipe();
  assert.equal(res.floor, 1);
  assert.equal(res.refunded, 500, 'le péage d\'une expédition qui n\'a pas eu lieu est rendu');
  assert.ok(w.dungeonTokens >= before, 'le joueur ne perd pas son péage au premier palier');
});

// ─── 5. Le gardien clôt la session ──────────────────────────────────────────
test('32-D10 — le dernier palier est celui du gardien, et sa défaite clôt tout', () => {
  const w = sandbox();
  M.startDungeonRun('mtmoon');
  const depth = M.currentDungeonRun().depth;
  for (let f = 1; f < depth; f++) { clearFloor(); M.dungeonDescend(); }
  assert.equal(M.currentDungeonRun().floor, depth);
  assert.equal(M.dungeonIsBossFloor(), true, 'le dernier palier est le palier du gardien');
  const bagBefore = M.dungeonRunSummary().bag.tokens;
  const afterToll = w.dungeonTokens;
  const res = M.dungeonOnBossDefeated();
  assert.equal(res.outcome, 'cleared');
  assert.ok(res.gained.tokens > bagBefore, 'le bonus de complétion s\'ajoute au sac');
  assert.equal(w.dungeonTokens, afterToll + res.gained.tokens, 'tout est versé');
  assert.equal(M.currentDungeonRun(), null, 'battre le gardien clôt la session');
  assert.equal(globalThis.G.dungeonClears.mtmoon, 1, 'la complétion est mémorisée');
});

// ─── 6. Persistance et intégration ──────────────────────────────────────────
test('32-D11 — l\'expédition vit dans G : elle est sauvegardée telle quelle', () => {
  sandbox();
  M.startDungeonRun('mtmoon');
  const clone = JSON.parse(JSON.stringify(globalThis.G));
  assert.ok(clone.dungeonRun && clone.dungeonRun.active, 'saveGame() sérialise G en entier');
  assert.equal(clone.dungeonRun.loc, 'mtmoon');
  M.dungeonAbandon();
});

test('32-D12 — le péage d\'exploration passe désormais par la session', () => {
  const src = readFileSync(new URL('../src/application/encounter-system.js', import.meta.url), 'utf8');
  assert.match(src, /isDungeonRunAt/, 'exploreArea doit reconnaître une descente en cours');
  assert.match(src, /startDungeonRun/, 'le péage est délégué à l\'ouverture de session');
  assert.match(src, /applyDungeonBossBuff/, 'le dernier palier doit produire un gardien');
});

test('32-D13 — victoire et K.O. général sont branchés sur la session', () => {
  const status = readFileSync(new URL('../src/application/combat/battle-status.js', import.meta.url), 'utf8');
  const enc = readFileSync(new URL('../src/application/combat/battle-encounter.js', import.meta.url), 'utf8');
  assert.match(status, /dungeonOnWin/, 'une victoire doit remplir le sac');
  assert.match(status, /dungeonOnBossDefeated/, 'le gardien doit clore la session');
  assert.match(enc, /dungeonOnWipe/, 'le K.O. général doit amputer le sac');
});

test('32-D14/33 — le suivi d\'expédition vit dans la fenêtre de COMBAT', () => {
  // PASSE 33, retour n°11 : « le fait que l'affichage soit dans la fenêtre lieu
  // et non dans celle de combat est un problème ». Le panneau du LIEU a donc
  // été retiré ; le bandeau `#battle-dungeon-bar` le remplace.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const run = readFileSync(new URL('../src/application/world/dungeon-run.js', import.meta.url), 'utf8');
  const model = readFileSync(new URL('../src/ui/game/location-info.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');

  assert.match(html, /id="battle-dungeon-bar"/, 'le bandeau doit exister dans la fenêtre de combat');
  // Hors de la scène active : `endBattle()` la masque à chaque palier, or le
  // bandeau doit rester cliquable pour enchaîner.
  const idxBar = html.indexOf('id="battle-dungeon-bar"');
  const idxScene = html.indexOf('id="battle-active-scene"');
  assert.ok(idxBar > -1 && idxScene > -1 && idxBar < idxScene,
    'le bandeau doit précéder #battle-active-scene, hors de celle-ci');

  assert.match(run, /function renderBattleDungeonBar/, 'le bandeau doit avoir son rendu');
  assert.match(run, /data-call="dungeonDescend"/, 'le choix « descendre » doit être proposé');
  assert.match(run, /data-call="dungeonAscend"/, 'le choix « remonter » doit être proposé');
  assert.match(run, /data-call="dungeonFight"/, 'la reprise du combat doit être proposée');

  // Le panneau dupliqué de la fenêtre LIEU ne doit plus être alimenté.
  assert.equal(/model\.dungeonRun\s*=/.test(model), false,
    'la fenêtre LIEU ne doit plus dupliquer le suivi d\'expédition');

  assert.match(css, /\.pw-battle-dungeon-bar\s*\{/, 'le bandeau doit être habillé');
  const block = css.slice(css.indexOf('── 33.7 —'));
  assert.equal(/#[0-9a-fA-F]{6}\b/.test(block.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')), false,
    'le bandeau ne doit contenir aucune couleur en dur');
});

test('32-D15 — les libellés du donjon sont localisés dans les deux langues', () => {
  const fr = readFileSync(new URL('../src/localization/fr/economy.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../src/localization/en/economy.js', import.meta.url), 'utf8');
  for (const key of ['dungeon_run_started', 'dungeon_descend_btn', 'dungeon_ascend_btn', 'dungeon_wipe', 'dungeon_cleared', 'dungeon_boss_prefix']) {
    assert.match(fr, new RegExp(`"${key}"`), `clé FR manquante : ${key}`);
    assert.match(en, new RegExp(`"${key}"`), `clé EN manquante : ${key}`);
  }
});

