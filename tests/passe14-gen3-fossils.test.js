import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 14 — fossiles Johto canoniques (Lilia #345 / Anorith #347),
// anti-duplication des fossiles en files, éjection au changement de mode,
// couleurs des boutons pension/auto, anti-tremblement entraînement ──────────
const PD_DATA = fs.readFileSync(new URL('../src/data/pd-data.js', import.meta.url), 'utf8');
const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
const SPRITES = fs.readFileSync(new URL('../src/data/sprites.js', import.meta.url), 'utf8');
const I18N = fs.readFileSync(new URL('../src/localization/i18n.js', import.meta.url), 'utf8');
const HATCHERY = fs.readFileSync(new URL('../src/game/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/game/breeding/hatchery-ui.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/game/boxes/box-selector.js', import.meta.url), 'utf8');
const TRAINING = fs.readFileSync(new URL('../src/game/combat/training.js', import.meta.url), 'utf8');
const SAVE = fs.readFileSync(new URL('../src/game/save/save.js', import.meta.url), 'utf8');
const CSS = fs.readFileSync(new URL('../src/assets/styles/cleaned-components.css', import.meta.url), 'utf8');
const FR_UI = fs.readFileSync(new URL('../src/localization/fr/ui.js', import.meta.url), 'utf8');
const EN_UI = fs.readFileSync(new URL('../src/localization/en/ui.js', import.meta.url), 'utf8');

function makeEnv(overrides = {}) {
  const notifs = [];
  const nodes = {};
  const fakeNode = () => ({
    innerHTML: '', textContent: '', value: '', style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  });
  const sandbox = {
    console, notifs,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (m, c) => notifs.push([String(m), c]),
    addBattleLog: () => {}, saveGame: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {}, renderHatcheryWindow: () => {},
    openHatcheryManagementMenu: () => {}, renderUnifiedGrid: () => {},
    t: (k) => k,
    tr: (k, o) => k + (o ? ':' + Object.values(o).join(',') : ''),
    rand: () => 0, rollShiny: () => false, xpForLevel: () => 0,
    recalcPokeStats: () => {},
    getItemName: (k) => 'ITEM_' + k, getPokeName: (id) => 'POKE_' + id,
    createPoke: (id, lvl, shiny) => ({ id, level: lvl, shinyActive: shiny, name: 'POKE_' + id, ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} }),
    unlockShinyForSpecies: () => {}, speciesOwned: () => false,
    spriteImg: () => '', itemIcon: () => '', isSpeciesShiny: () => false,
    PD: {},
    ITEMS: { helix_fossil: { type: 'fossil' }, root_fossil: { type: 'fossil' }, claw_fossil: { type: 'fossil' } },
    G: {
      lang: 'fr', money: 999999, team: [], collection: {},
      inventory: { helix_fossil: 1 },
      hatchery: [null], hatcheryMaxSlots: 2,
      hatcheryModes: ['breed', 'exp'], hatcheryQueues: [[], []],
      hatcheryAutomation: { slots: [
        { enabled: true, mode: 'breed', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
        { enabled: true, mode: 'exp', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
      ] },
      automation: { autoHatch: false, autoSeedHatchery: false },
      pokedex: {}, badges: ['koga', 'x', 'y', 'z'],
    },
  };
  Object.assign(sandbox.G, overrides.G || {});
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(HATCHERY, sandbox, { filename: 'hatchery.js' });
  vm.runInContext(BOX_SELECTOR, sandbox, { filename: 'box-selector.js' });
  return sandbox;
}

// ── 1. Nouvelles espèces jouables ───────────────────────────────────────────

test('PD : Lilia #345 (Roche/Plante) et Anorith #347 (Roche/Insecte) existent', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(PD_DATA, sandbox);
  const lileep = sandbox.PD[345];
  const anorith = sandbox.PD[347];
  assert.ok(lileep, 'PD[345] présent');
  assert.ok(anorith, 'PD[347] présent');
  assert.equal(lileep[0], 'Lileep');
  assert.deepEqual([lileep[1], lileep[2]], ['Rock', 'Grass']);
  assert.equal(anorith[0], 'Anorith');
  assert.deepEqual([anorith[1], anorith[2]], ['Rock', 'Bug']);
  // Stats canoniques (Array.from : les tableaux PD vivent dans le vm,
  // deepEqual strict échouerait sinon — piège cross-realm)
  assert.deepEqual(Array.from(lileep.slice(3, 9)), [66, 41, 77, 61, 87, 23]);
  assert.deepEqual(Array.from(anorith.slice(3, 9)), [45, 95, 50, 40, 50, 75]);
  // Convention fossile du jeu (capture 45 / XP 60, comme #138-142)
  assert.deepEqual(Array.from(lileep.slice(10, 12)), [45, 60]);
  assert.deepEqual(Array.from(anorith.slice(10, 12)), [45, 60]);
});

test('noms : getPokeName donne Lilia/Anorith (FR) et Lileep/Anorith (EN)', () => {
  const block = I18N.match(/\/\/ Espèces hors dex[\s\S]*?\n\}\n/);
  assert.ok(block, 'bloc override + getPokeName extrait');
  const sandbox = {
    POKE_NAMES_EN: { 138: 'Omanyte' }, POKE_NAMES_FR: { 138: 'Amonita' },
    PD: { 345: ['Lileep'], 347: ['Anorith'], 138: ['Omanyte'] },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  let lang = 'fr';
  sandbox.currentLang = () => lang;
  vm.createContext(sandbox);
  vm.runInContext(block[0], sandbox);
  assert.equal(sandbox.getPokeName(345), 'Lilia', 'FR 345');
  assert.equal(sandbox.getPokeName(347), 'Anorith', 'FR 347');
  lang = 'en';
  assert.equal(sandbox.getPokeName(345), 'Lileep', 'EN 345');
  assert.equal(sandbox.getPokeName(347), 'Anorith', 'EN 347');
  assert.equal(sandbox.getPokeName(138), 'Omanyte', 'pas de régression dex classique');
});

test('carte de réanimation : root→345, claw→347 partout (map + objets)', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    HATCHERY.match(/const FOSSIL_REVIVE_MAP[\s\S]*?function getFossilReviveId[\s\S]*?\n\}/)[0] + '\n' + ITEMS_DATA,
    sandbox
  );
  assert.equal(sandbox.getFossilReviveId('root_fossil'), 345);
  assert.equal(sandbox.getFossilReviveId('claw_fossil'), 347);
  assert.equal(sandbox.getFossilReviveId('fossil'), 138, 'fossile générique inchangé → Amonita');
  assert.equal(sandbox.ITEMS.root_fossil.revive, 345, 'ITEMS.root_fossil.revive cohérent');
  assert.equal(sandbox.ITEMS.claw_fossil.revive, 347, 'ITEMS.claw_fossil.revive cohérent');
  // Copie exposée par le domaine (file-preflight.js) : doit suivre la même map
  const PREFLIGHT = fs.readFileSync(new URL('../src/file-preflight.js', import.meta.url), 'utf8');
  assert.ok(/root_fossil:345/.test(PREFLIGHT), 'domaine : root_fossil→345');
  assert.ok(/claw_fossil:347/.test(PREFLIGHT), 'domaine : claw_fossil→347');
  assert.ok(!/root_fossil:220/.test(PREFLIGHT + HATCHERY), 'plus aucune cible 220');
  assert.ok(!/claw_fossil:246/.test((PREFLIGHT + HATCHERY).replace(/\[220, 345\]|\[246, 347\]/g, '')), 'plus aucune cible 246');
});

test('sprites : entrées des 4 buckets + fichiers présents + DEX_MAP', () => {
  for (const bucket of ['front', 'back', 'frontShiny', 'backShiny']) {
    assert.ok(SPRITES.includes(`"345":"src/assets/images/pokemon/${bucket}/lileep.png"`), bucket + ' 345');
    assert.ok(SPRITES.includes(`"347":"src/assets/images/pokemon/${bucket}/anorith.png"`), bucket + ' 347');
    for (const n of ['lileep', 'anorith']) {
      assert.ok(
        fs.existsSync(new URL(`../src/assets/images/pokemon/${bucket}/${n}.png`, import.meta.url)),
        `${bucket}/${n}.png téléchargé (lien via download_assets.py)`
      );
    }
  }
  assert.ok(/"lileep":\s*345/.test(SPRITES), 'DEX_MAP lileep');
  assert.ok(/"anorith":\s*347/.test(SPRITES), 'DEX_MAP anorith');
});

test('descriptions objets : FR et EN promettent bien Lilia/Anorith', () => {
  const FR_ITEMS = fs.readFileSync(new URL('../src/localization/fr/items.js', import.meta.url), 'utf8');
  const EN_ITEMS = fs.readFileSync(new URL('../src/localization/en/items.js', import.meta.url), 'utf8');
  assert.ok(/root_fossil:[\s\S]{0,120}Lilia/.test(FR_ITEMS), 'FR racine → Lilia');
  assert.ok(/claw_fossil:[\s\S]{0,120}Anorith/.test(FR_ITEMS), 'FR griffe → Anorith');
  assert.ok(/"root_fossil"[\s\S]{0,160}Lileep/.test(EN_ITEMS), 'EN racine → Lileep');
  assert.ok(/"claw_fossil"[\s\S]{0,160}Anorith/.test(EN_ITEMS), 'EN griffe → Anorith');
});

// ── 2. Anti-duplication des fossiles ────────────────────────────────────────

test('sanitizeHatcheryFossilQueues : 1 exemplaire ne peut pas vivre dans 2 files', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], ['fossil:helix_fossil']];
  const removed = env.sanitizeHatcheryFossilQueues();
  assert.equal(removed, 1, 'doublon retiré');
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['fossil:helix_fossil'], 'première file conservée (ordre des slots)');
  assert.equal(env.G.hatcheryQueues[1].length, 0, 'deuxième file purgée');
});

test('sanitize : respecte le stock réel (2 stock → 2 files OK, 0 stock → purge)', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 2 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], ['fossil:helix_fossil']];
  assert.equal(env.sanitizeHatcheryFossilQueues(), 0, 'rien à retirer');
  env.G.inventory = {};
  assert.equal(env.sanitizeHatcheryFossilQueues(), 2, 'stock 0 → tout purgé');
});

test('getFossilAvailableCount = stock − réservations toutes files', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 2 };
  env.G.hatcheryQueues = [['fossil:helix_fossil', 'u1'], []];
  assert.equal(env.getFossilAvailableCount('helix_fossil'), 1);
  env.G.hatcheryQueues[1] = ['fossil:helix_fossil'];
  assert.equal(env.getFossilAvailableCount('helix_fossil'), 0);
});

test('fossilQueueCandidates ne propose rien quand tout est réservé', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [[], ['fossil:helix_fossil']];
  assert.deepEqual([...env.fossilQueueCandidates()], []);
});

test('sendFossilToHatchery refuse un fossile entièrement réservé (anti-doublon)', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], []];
  env.sendFossilToHatchery('helix_fossil', 0);
  assert.equal(env.G.inventory.helix_fossil, 1, 'stock inchangé');
  assert.equal(env.G.hatchery[0], null, 'slot non rempli');
  assert.ok(env.notifs.some(([m]) => m.includes('fossil_all_queued')), 'notification dédiée');
});

test('reviveFossil refuse un fossile entièrement réservé', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [[], ['fossil:helix_fossil']];
  env.reviveFossil('helix_fossil');
  assert.equal(env.G.inventory.helix_fossil, 1, 'stock inchangé');
  assert.ok(env.notifs.some(([m]) => m.includes('fossil_all_queued')));
});

test('processHatcheryQueue répare une save avec doublon fossil avant de remplir', () => {
  const env = makeEnv();
  env.G.automation.autoSeedHatchery = true;
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], ['fossil:helix_fossil']];
  env.processHatcheryQueue();
  const total = env.G.hatcheryQueues.flat().filter((e) => e === 'fossil:helix_fossil').length
    + (env.G.hatchery.some((s) => s && s.isFossil && s.fossilKey === 'helix_fossil') ? 1 : 0);
  assert.ok(total <= 1, "jamais plus d'unités réservées+utilisées que le stock");
  assert.equal((env.G.inventory.helix_fossil || 0) + total, 1, 'conservation du stock');
});

test('UI : files/labo/sélecteur affichent les quantités nettes de réservations', () => {
  assert.ok(/getHatcheryFossilReservations/.test(HATCHERY_UI), 'labo fossile : réservations lues');
  assert.ok(/fossil_all_queued/.test(HATCHERY_UI), 'labo fossile : bouton désactivé');
  assert.ok(/getHatcheryFossilReservations/.test(BOX_SELECTOR), 'sélecteur : réservations lues');
  assert.ok(/fossil_all_queued/.test(BOX_SELECTOR), 'sélecteur : bouton désactivé');
});

// ── 3. Sauvegarde : fossiles migrés, générique conservé ─────────────────────

test("save : le fossile générique de la mine n'est plus supprimé au chargement", () => {
  const retired = SAVE.match(/retiredKey of \[([^\]]+)\]/);
  assert.ok(retired, 'liste des objets retirés trouvée');
  assert.ok(!retired[1].split(',').some((k) => k.trim() === "'fossil'"), "'fossil' absent de la purge");
  assert.ok(retired[1].includes("'ancient_fossil'"), 'les doubletons legacy restent purgés');
});

test('save : les fossiles Johto en incubation migrent vers les cibles canoniques', () => {
  assert.ok(/root_fossil:\s*\[220,\s*345\]/.test(SAVE), 'migration racine 220→345');
  assert.ok(/claw_fossil:\s*\[246,\s*347\]/.test(SAVE), 'migration griffe 246→347');
});

// ── 4. Entraînement : anti-tremblement + bouton auto ────────────────────────

test("anti-tremblement : le panneau live n'est reconstruit que sur changement structurel", () => {
  assert.ok(/trainingBattlePanelSignature\(activeSlots\)/.test(TRAINING), 'signature calculée');
  assert.ok(/if\(battleSig === _trainingBattlePanelSig && panel\.classList\.contains\('open'\)\) return/.test(TRAINING), 'reconstruction sauté si inchangée');
  assert.ok(/data-training-text="player-move"/.test(TRAINING) && /data-training-text="enemy-move"/.test(TRAINING), 'noms d\'attaques patchés en place');
});

test('signature du panneau : change avec le round/ennemi, stable sinon', () => {
  const block = TRAINING.match(/var _trainingBattlePanelSig[\s\S]*?\n\}\n/);
  assert.ok(block, 'bloc signature extrait');
  const sandbox = {
    currentLang: () => 'fr',
    findPokemonByTrainingSlot: (slot) => slot._t,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(block[0], sandbox);
  const mk = (idx, enemyId, enemyName) => [{
    slot: { battle: { mode: 'ev', enemyIndex: idx, enemies: [{ id: enemyId, name: enemyName }], enemy: { id: enemyId, name: enemyName } }, _t: { uid: 'u1' } },
    i: 0,
  }];
  const s1 = sandbox.trainingBattlePanelSignature(mk(0, 25, 'Coach A'));
  const s1b = sandbox.trainingBattlePanelSignature(mk(0, 25, 'Coach A'));
  const s2 = sandbox.trainingBattlePanelSignature(mk(1, 26, 'Coach B'));
  assert.equal(s1, s1b, 'stable à structure identique');
  assert.notEqual(s1, s2, 'change au round suivant');
});

test('anti-tremblement : fenêtre entraînement reconstruite seulement si structure changée', () => {
  assert.ok(/maybeRenderTrainingWindowTick\(\)/.test(TRAINING), 'rendu de tick conditionnel utilisé');
  const upd = TRAINING.match(/function updateTrainingSlots\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(upd, 'updateTrainingSlots trouvé');
  assert.ok(!/try\{\s*renderTrainingWindow\(\);\s*\}catch/.test(upd[0]), 'plus de renderTrainingWindow par tick');
  assert.ok(!/try\{\s*renderTeamWindow\(\);\s*\}catch/.test(upd[0]), 'plus de renderTeamWindow par tick');
});

test('bouton auto de la fenêtre entraînement : libellés « Auto : activé/désactivé »', () => {
  const btn = TRAINING.match(/training-slot-auto-btn[\s\S]{0,460}/);
  assert.ok(btn, 'bouton auto trouvé');
  assert.ok(btn[0].includes("t('training_auto_on')") && btn[0].includes("t('training_auto_off')"), 'clés explicites utilisées');
  const onRule = CSS.match(/\.training-slot-auto-btn\.is-on\s*\{[^}]*\}/g) || [];
  assert.ok(onRule.some((r) => r.includes('var(--green)') && r.includes('box-shadow')), 'vert franc renforcé en CSS');
});

// ── 5. Clés i18n ────────────────────────────────────────────────────────────

test('i18n : nouvelles clés présentes en FR et EN', () => {
  for (const key of ['fossil_queued_count', 'fossil_all_queued', 'hatchery_mode_ejected']) {
    assert.ok(FR_UI.includes(`"${key}":`), `FR ${key}`);
    assert.ok(EN_UI.includes(`"${key}":`), `EN ${key}`);
  }
});
