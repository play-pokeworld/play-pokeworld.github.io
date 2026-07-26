import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Grand projet « Dresseurs officiels » — Étape 1 : socle + validateur ───
// Toute équipe OFFICIAL_TEAMS doit être LÉGITIME : espèce/niveau/moves
// (pool légal = apprentissage naturel ∪ CT/CS), talent obtenable par le
// joueur, objet tenu existant, budgets IV/EV ≤ 18 au total chacun (moitié
// du max 36, règle validée avec l'utilisateur).
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const LOADER = R('src/loader.js');
const OFFICIAL = R('src/data/official-teams-data.js');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr' },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k) => k, getPokeName: (id) => 'P' + id,
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
    'src/game/world/team.js', 'src/game/core/pokemon-factory.js', 'src/data/official-teams-data.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}

const sb = makeSandbox();
const teams = sb.OFFICIAL_TEAMS;
const MAX_IV_EV_TOTAL = 18; // moitié de 36, règle utilisateur

test('socle : fichier chargé par le loader après champions-data', () => {
  const iChamp = LOADER.indexOf('champions-data.js');
  const iOff = LOADER.indexOf('official-teams-data.js');
  assert.ok(iChamp > 0 && iOff > iChamp, 'official-teams-data.js chargé après champions-data.js');
  assert.ok(teams && typeof teams === 'object', 'OFFICIAL_TEAMS exposé');
  assert.ok(teams.brock && teams.misty, 'pilotes Pierre & Ondine présents');
});

test('structure : chaque entrée a id/kind/region/team valides', () => {
  for (const [key, entry] of Object.entries(teams)) {
    assert.equal(entry.id, key, `${key} : id cohérent`);
    assert.ok(['gym', 'rival', 'team_enemy', 'league', 'atoll', 'quest', 'boss'].includes(entry.kind), `${key} : kind connu`);
    assert.ok(['kanto', 'johto'].includes(entry.region), `${key} : région connue`);
    if (entry.variantsByStarter) {
      // Variante du rival selon le starter du joueur (canon RFVF/OAC)
      const ks = Object.keys(entry.variantsByStarter);
      assert.ok(ks.length >= 2, `${key} : ≥ 2 variantes de starter`);
      for (const v of ks) assert.ok(Array.isArray(entry.variantsByStarter[v]) && entry.variantsByStarter[v].length >= 1 && entry.variantsByStarter[v].length <= 6, `${key}#${v} : taille d'équipe 1-6`);
    } else {
      assert.ok(Array.isArray(entry.team) && entry.team.length >= 1 && entry.team.length <= 6, `${key} : taille d'équipe 1-6`);
    }
  }
});

// Itère chaque spec de chaque entrée, y compris chaque variante de starter.
function eachSpec(cb) {
  for (const [key, entry] of Object.entries(teams)) {
    if (entry.variantsByStarter) {
      for (const [starterId, list] of Object.entries(entry.variantsByStarter)) {
        for (const spec of list) cb(key, spec, `vs starter #${starterId}`);
      }
    } else {
      for (const spec of entry.team) cb(key, spec, '');
    }
  }
}

test('légitimité : espèces, niveaux, attaques, talents, objets, budgets IV/EV', () => {
  eachSpec((key, spec, variant) => {
      const label = `${key}${variant ? '[' + variant + ']' : ''}#${spec.id}N${spec.level}`;
      // Espèce + niveau
      assert.ok(sb.PD[spec.id], `${label} : espèce connue`);
      assert.ok(spec.level >= 1 && spec.level <= 100, `${label} : niveau 1-100`);
      // Attaques : ≤ 4, ids valides ET pool légal (naturel ∪ CT/CS)
      assert.ok(Array.isArray(spec.moves) && spec.moves.length >= 1 && spec.moves.length <= 4, `${label} : 1-4 attaques`);
      const natural = new Set(sb.getSpeciesFullLearnablePool(spec.id) || []);
      const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(spec.id) || {}));
      for (const mv of spec.moves) {
        assert.ok(sb.MOVES[mv], `${label} : attaque ${mv} existe dans MOVES`);
        assert.ok(natural.has(mv) || ctcs.has(mv), `${label} : attaque ${mv} légale (naturel/CT/CS)`);
      }
      // Talent obtenable par le joueur (pool réel du jeu)
      const allowedTalents = new Set((sb.getSpeciesTalents(spec.id) || []).map((x) => x.id || x));
      assert.ok(allowedTalents.has(spec.talent), `${label} : talent ${spec.talent} obtenable par le joueur`);
      // Objet tenu : existant et équipable (règle equipItemOn)
      if (spec.item != null) {
        const it = sb.ITEMS[spec.item];
        assert.ok(it, `${label} : objet ${spec.item} existe`);
        assert.ok(it.type === 'held' || it.buff, `${label} : objet ${spec.item} équipable`);
      }
      // Budgets IV/EV : total ≤ 18 CHACUN (règle moitié max), valeurs 0..18
      const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
      assert.ok(sum(spec.ivs) <= MAX_IV_EV_TOTAL, `${label} : total IV ${sum(spec.ivs)} ≤ ${MAX_IV_EV_TOTAL}`);
      assert.ok(sum(spec.evs) <= MAX_IV_EV_TOTAL, `${label} : total EV ${sum(spec.evs)} ≤ ${MAX_IV_EV_TOTAL}`);
      for (const v of Object.values(spec.ivs || {})) assert.ok(v >= 0 && v <= MAX_IV_EV_TOTAL, `${label} : IV par stat 0..${MAX_IV_EV_TOTAL}`);
      for (const v of Object.values(spec.evs || {})) assert.ok(v >= 0 && v <= MAX_IV_EV_TOTAL, `${label} : EV par stat 0..${MAX_IV_EV_TOTAL}`);
  });
});

test('instanciation : buildOfficialTeamPoke produit des Pokémon jouables conformes', () => {
  const team = sb.getOfficialTeam('brock');
  assert.ok(Array.isArray(team) && team.length === 2, 'équipe Pierre instanciée (2 Pokémon)');
  const [geo, onix] = team;
  assert.equal(geo.level, 12, 'Racaillou niveau officiel');
  assert.equal(onix.level, 14, 'Onix niveau officiel');
  // Attaque filtrée = spec (toutes valides → 1:1)
  assert.equal(geo.moves.length, 3, 'Racaillou < 4 attaques accepté (début d\'aventure)');
  assert.deepEqual([...onix.moves.map((m) => m.id)], ['tackle', 'rock_throw', 'rock_tomb', 'dig'], 'moveset Onix conforme');
  assert.equal(onix.heldItem, 'hard_stone', 'objet tenu appliqué');
  // Recalc stats appliqué : Onix lvl 14 + EV def 18 > Geodude lvl 12 sans surprise
  assert.ok(onix.maxHP > 0 && onix.def > 0, 'stats recalculées');
  assert.equal(sb.getOfficialTeam('inconnu'), null, 'clé inconnue → null');
  // Ondine : objet Eau Mystérieuse
  const starmie = sb.getOfficialTeam('misty')[1];
  assert.equal(starmie.heldItem, 'mystic_water', 'objet tenu Starmie');
});

test('audit moteur (audit passe 17) : objets et talents ennemis sont neutres de côté', () => {
  // getHeldBuff fonctionne pour un Pokémon HORS équipe (cas ennemi)
  const misty = sb.getOfficialTeam('misty');
  const starmie = misty[1];
  const buff = sb.getHeldBuff(starmie);
  assert.ok(buff.atk > 0 && buff.spa > 0, 'Eau Mystérieuse → buffs actifs pour un Pokémon ennemi');
  const geo = sb.getOfficialTeam('brock')[0];
  assert.equal(sb.getHeldBuff(geo).atk, 0, 'sans objet → pas de buff');
});

test('équipes de quêtes (étape 2) : variantes du rival résolues via getOfficialTeam', () => {
  // Rival Kanto : chaque starter du joueur donne une équipe complète et
  // dont le dernier Pokémon est bien le starter FORT contre le joueur.
  const STRONG_AGAINST = { '1': [4, 5, 6], '4': [7, 8, 9], '7': [1, 2, 3] };
  for (const starterId of ['1', '4', '7']) {
    const team = sb.getOfficialTeam('kanto_rival_silph', Number(starterId));
    assert.equal(team.length, 5, `silph vs ${starterId} : 5 Pokémon`);
    const ace = team[team.length - 1];
    assert.ok(STRONG_AGAINST[starterId].includes(ace.id), `silph vs ${starterId} : as = starter fort (#${ace.id})`);
    assert.ok(ace.heldItem, `silph vs ${starterId} : l'as tient un objet (${ace.heldItem})`);
    assert.ok(ace.moves.length >= 3, 'as ≥ 3 attaques en fin d\'arc');
  }
  // Rival Johto : le premier duel n'oppose QUE le starter volé.
  const first = sb.getOfficialTeam('johto_rival_cherrygrove', 155);
  assert.equal(first.length, 1, 'premier duel Silver = starter seul');
  assert.equal(first[0].id, 158, 'vs Héricendre → Silver a Kaiminus');
});

test('non-régression documentée : aucun id d\'attaque legacy compact (étape 2)', () => {
  // Terminé en étape 2 (passe 18) : ni le socle officiel ni les équipes de
  // quêtes n'utilisent d'ids compacts — tout est snake_case, validé ci-dessus.
  eachSpec((key, spec) => {
    for (const mv of spec.moves) assert.ok(sb.MOVES[mv], `${key} : attaque ${mv} valide (aucun id legacy compact)`);
  });
});
