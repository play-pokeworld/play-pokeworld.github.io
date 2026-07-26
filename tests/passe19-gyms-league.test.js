import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 19 — Grand projet étape 3 : arènes & ligues sur le socle officiel ─
// Vérifie la couche de compatibilité champions-data.js (getChampDef,
// getLeagueTrainersForRegion), l'ordre des gauntlets, la variante du Maître
// Blue selon le starter du joueur, les espèces/niveaux canoniques, l'i18n
// des étapes de ligue et la compatibilité sauvegarde (ids inchangés).
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr' },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => '', tr: (k) => '', getPokeName: (id) => 'P' + id,
    notify: () => {}, saveGame: () => {}, setMsg: () => {},
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/game/world/team.js', 'src/game/core/pokemon-factory.js',
    'src/data/champions-data.js', 'src/data/official-teams-data.js', // ordre du loader réel
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}

const sb = makeSandbox();
const KANTO_GYMS = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
const JOHTO_GYMS = ['falkner', 'bugsy', 'whitney', 'morty', 'chuck', 'jasmine', 'pryce', 'clair'];

test('compat sauvegarde : les 16 ids d\'arène + 2 ids de ligue existent via getChampDef', () => {
  for (const id of [...KANTO_GYMS, ...JOHTO_GYMS, 'elite4', 'johto_elite4']) {
    const def = sb.getChampDef(id);
    assert.ok(def, `${id} : définition présente`);
    assert.ok(typeof def.badgeReq === 'number', `${id} : badgeReq numérique`);
  }
  assert.equal(sb.getChampDef('atoll'), null, 'atoll : pipeline séparé, pas de def ici');
  assert.equal(sb.getChampDef('inconnu'), null, 'id inconnu → null');
});

test('arènes : métadonnées cohérentes (région, badgeReq progressifs 0→7, récompenses plafonnées)', () => {
  KANTO_GYMS.forEach((id, i) => {
    const def = sb.getChampDef(id);
    assert.equal(def.region, 'kanto', `${id} : région kanto`);
    assert.equal(def.badgeReq, i, `${id} : badgeReq ${i} (ordre canon)`);
    assert.ok(def.reward >= 1400 && def.reward <= 5200, `${id} : récompense ${def.reward} dans [1400..5200]`);
    assert.ok(Array.isArray(def.strategy) && def.strategy.length >= 1, `${id} : styles affichés`);
  });
  JOHTO_GYMS.forEach((id, i) => {
    const def = sb.getChampDef(id);
    assert.equal(def.region, 'johto', `${id} : région johto`);
    assert.equal(def.badgeReq, i, `${id} : badgeReq ${i} (ordre canon)`);
    assert.ok(def.reward >= 1400 && def.reward <= 5200, `${id} : récompense ${def.reward} dans [1400..5200]`);
  });
  // Ligues : récompenses 1re victoire revues à la baisse (passe 18 éthos)
  assert.equal(sb.getChampDef('elite4').reward, 12000, 'ligue Kanto : 12000₽ (était 15000)');
  assert.equal(sb.getChampDef('johto_elite4').reward, 14000, 'ligue Johto : 14000₽ (était 18000)');
  assert.equal(sb.getChampDef('elite4').badgeReq, 8, 'ligue Kanto : 8 badges requis');
});

test('arènes : équipes instanciées réelles (movesets, talents, objets — fini les Pokémon aléatoires)', () => {
  for (const id of [...KANTO_GYMS, ...JOHTO_GYMS]) {
    const team = sb.getChampDef(id).team;
    assert.ok(team.length >= 2, `${id} : ≥ 2 Pokémon (canon)`);
    for (const p of team) {
      assert.ok(p.moves.length >= 1 && p.moves.length <= 4, `${id}#${p.id} : 1-4 attaques instanciées`);
      assert.ok(p.moves.every((m) => sb.MOVES[m.id]), `${id}#${p.id} : ids d\'attaques valides`);
      assert.ok(p.talent, `${id}#${p.id} : talent appliqué`);
    }
    // À partir du 2e badge de la région, l\'as porte un objet (type_boost
    // actif moteur, audit passe 17) — canon arène 1 : pas d\'objet tenu.
    const def = sb.getChampDef(id);
    if (def.badgeReq >= 2) {
      const ace = team[team.length - 1];
      assert.ok(ace.heldItem, `${id} : l\'as porte un objet (${ace.heldItem})`);
    }
  }
});

test('espèces & niveaux canoniques (RFVF Kanto / OAC Johto) — non-régressions legacy', () => {
  const lvl = (id, idx) => sb.getChampDef(id).team[idx].level;
  const pid = (id, idx) => sb.getChampDef(id).team[idx].id;
  // Kanto RFVF
  assert.deepEqual([lvl('surge', 0), lvl('surge', 2)], [21, 24], 'Major Bob : Voltorbe 21 / Raichu 24');
  assert.deepEqual([lvl('erika', 0), lvl('erika', 1), lvl('erika', 2)], [29, 24, 29], 'Erika : 29/24/29');
  assert.equal(lvl('koga', 3), 43, 'Koga : Smogogo 43');
  assert.equal(lvl('sabrina', 3), 43, 'Morgane : Alakazam 43');
  assert.equal(lvl('blaine', 3), 47, 'Auguste : Arcanin 47');
  assert.equal(lvl('giovanni', 4), 50, 'Giovanni : Rhinoféros 50');
  assert.equal(sb.getChampDef('giovanni').team.length, 5, 'Giovanni : 5 Pokémon (canon RFVF)');
  // Johto OAC — legacy avait des équipes fantaisistes (ex. Mélo 20 chez Blanche)
  assert.deepEqual([pid('whitney', 0), pid('whitney', 1)], [35, 241], 'Blanche : Mélofée 18 / Écrémeuh 20 (canon)');
  assert.equal(lvl('whitney', 1), 20, 'Écrémeuh niveau 20 canon');
  assert.deepEqual([lvl('falkner', 0), lvl('falkner', 1)], [9, 13], 'Albert : Roucool 9 / Roucoups 13');
  assert.equal(pid('bugsy', 2), 123, 'Hector : Insécateur 16 (canon)');
  assert.equal(lvl('morty', 3), 25, 'Mortimer : Ectoplasma 25');
  assert.equal(pid('jasmine', 2), 208, 'Jasmine : Steelix 35');
  assert.equal(pid('pryce', 2), 221, 'Frédo : Cochignon 31');
  assert.equal(pid('clair', 3), 230, 'Sandra : Hyporoi (canon)');
  assert.equal(lvl('clair', 3), 40, 'Sandra : Hyporoi 40');
});

test('ligues : gauntlet 5 étapes, Maître en dernier, aperçus localisés, équipe aplatie', () => {
  // Array.from : rebase le prototype (les objets créés dans le vm échouent
  // sinon au deepEqual strict — piège connu du harnais).
  assert.deepEqual(Array.from(sb.getOfficialLeagueKeys('kanto')), ['lorelei', 'bruno', 'agatha', 'lance', 'blue'], 'ordre ligue Kanto');
  assert.deepEqual(Array.from(sb.getOfficialLeagueKeys('johto')), ['will', 'koga_e4', 'bruno_johto', 'karen', 'lance_johto'], 'ordre ligue Johto');
  for (const region of ['kanto', 'johto']) {
    const trainers = sb.getLeagueTrainersForRegion(region);
    assert.equal(trainers.length, 5, `${region} : 5 étapes`);
    for (const tr of trainers) {
      assert.ok(tr.name && tr.title, `${region}/${tr.id} : nom + titre localisés (repli FR)`);
      assert.ok(tr.team.length >= 5 && tr.team.every(([id, lv]) => sb.PD[id] && lv >= 1 && lv <= 100), `${region}/${tr.id} : paires [id, niveau] valides`);
    }
    const flat = sb.getLeagueFlattenedTeam(region);
    assert.equal(flat.length, trainers.reduce((s, tr) => s + tr.team.length, 0), `${region} : aplatie = somme des étapes`);
    assert.ok(flat.every((p) => p.maxHP > 0), `${region} : instances jouables (xpYield/maxHP)`);
  }
  // Niveaux canon ligues
  const kanto = sb.getLeagueTrainersForRegion('kanto');
  assert.equal(kanto[3].team[4][1], 60, 'Peter : Dracolosse 60 (RFVF)');
  assert.equal(kanto[2].team[4][1], 58, 'Agatha : Ectoplasma 58 (RFVF)');
  const johto = sb.getLeagueTrainersForRegion('johto');
  assert.equal(johto[4].team[5][1], 50, 'Peter Johto : Dracolosse 50 (OAC)');
  assert.equal(johto[4].team.length, 6, 'Maître Johto : 6 Pokémon');
});

test('Maître Blue : équipe variable selon le starter du joueur (canon RFVF)', () => {
  const cases = [
    { starter: 1, expectedBlueStarter: 6, duo: [103, 130] },   // joueur Bulbizarre → Dracaufeu
    { starter: 4, expectedBlueStarter: 9, duo: [59, 103] },    // joueur Salamèche → Tortank
    { starter: 7, expectedBlueStarter: 3, duo: [130, 59] },    // joueur Carapuce → Florizarre
  ];
  for (const c of cases) {
    const team = sb.getOfficialLeagueTeam('kanto', 4, c.starter);
    assert.equal(team.length, 6, `vs starter ${c.starter} : 6 Pokémon`);
    assert.equal(team[0].id, 18, 'Roucarnage en tête (59)');
    assert.equal(team[0].level, 59, 'Roucarnage niveau 59');
    assert.equal(team[1].id, 65, 'Alakazam 2e (57)');
    assert.equal(team[2].id, 112, 'Rhinoféros 3e (59)');
    const ace = team[5];
    assert.equal(ace.id, c.expectedBlueStarter, `starter de Blue = ${c.expectedBlueStarter} (fort contre le joueur)`);
    assert.equal(ace.level, 63, 'starter de Blue niveau 63');
    assert.ok(ace.heldItem, 'starter de Blue porte un type_boost');
    const duoIds = [team[3].id, team[4].id];
    assert.deepEqual(duoIds, c.duo, `duo variable ${c.duo} (59/61)`);
    assert.equal(team[4].level, 61, 'le 5e membre est le niveau 61');
  }
  // Sans starter connu (vieille sauvegarde) → repli 1re variante, jamais vide
  const fallback = sb.getOfficialLeagueTeam('kanto', 4, null);
  assert.equal(fallback.length, 6, 'repli sans starter : équipe complète');
});

test('i18n : les 10 étapes de ligue ont nom + titre en FR et EN', () => {
  const SLOTS = ['lorelei', 'bruno', 'agatha', 'lance', 'blue', 'will', 'koga_e4', 'bruno_johto', 'karen', 'lance_johto'];
  for (const [file, globalName, expected] of [
    ['src/localization/fr/champions.js', 'L_fr_champions', 'Olga'],
    ['src/localization/en/champions.js', 'L_en_champions', 'Lorelei'],
  ]) {
    const box = { window: {} };
    box.window = box;
    vm.createContext(box);
    vm.runInContext(R(file), box, { filename: file });
    const frag = box[globalName];
    assert.ok(frag, `${file} : fragment chargé`);
    for (const slot of SLOTS) {
      assert.ok(frag[slot] && frag[slot].name && frag[slot].title, `${file} : ${slot} nom + titre`);
    }
    assert.equal(frag.lorelei.name, expected, `${file} : contrôle traduction Olga/${expected}`);
  }
});
