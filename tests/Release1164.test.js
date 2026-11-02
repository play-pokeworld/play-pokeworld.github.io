/**
 * @file Release1164.test.js
 * @brief 1.16.4 — talent pools (every species draws from a real pool of at least
 * PokemonRules.MIN_TALENT_POOL talents, no duplicate) and the attack pools that were audited
 * with them (level-up pools identical to the original rule, no unknown move in a trainer team).
 */

import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { Random } from '../src/core/Random.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { TalentDB } from '../src/data/pokemon/TalentDB.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { MoveLearnset } from '../src/data/pokemon/MoveLearnset.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { MoveConfig } from '../src/config/MoveConfig.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { PokemonTalentSystem } from '../src/systems/PokemonTalentSystem.js';
import { TRAINERS_TABLE } from '../src/data/raw/trainers-data.js';
import { completeTalentPool, affinityTalentIds } from '../tools/data/talent-pools.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const species = () => PokemonDB.getInstance().getAll();
const walkMembers = (node, visit) => {
  if (Array.isArray(node)) return node.forEach((item) => walkMembers(item, visit));
  if (!node || typeof node !== 'object') return;
  if (node.species) return visit(node);
  Object.values(node).forEach((value) => walkMembers(value, visit));
};

/** Species that only had their signature ability upstream (3 entries, often duplicated). */
const PREVIOUSLY_EMPTY = [
  'treecko', 'grovyle', 'sceptile', 'torchic', 'combusken', 'blaziken', 'mudkip',
  'poochyena', 'mightyena', 'shedinja', 'lunatone', 'solrock', 'castform', 'latias', 'latios'
];

describe('1.16.4 — talent pool of every species', (test) => {
  test('no species has a short pool (at least PokemonRules.MIN_TALENT_POOL talents)', () => {
    const short = species()
      .filter((entry) => entry.talents.length < PokemonRules.MIN_TALENT_POOL)
      .map((entry) => `${entry.id}:${entry.talents.length}`);
    assert.deepEqual(short, []);
    assert.equal(PokemonRules.MIN_TALENT_POOL, 10);
  });

  test('no species repeats a talent in its pool', () => {
    const duplicates = species()
      .filter((entry) => new Set(entry.talents).size !== entry.talents.length)
      .map((entry) => entry.id);
    assert.deepEqual(duplicates, []);
  });

  test('every pool talent exists in TalentDB', () => {
    const talents = TalentDB.getInstance();
    const unknown = species().flatMap((entry) => entry.talents.filter((id) => !talents.has(id)));
    assert.deepEqual([...new Set(unknown)], []);
  });

  test('the pool contains every talent of the type affinities of the species', () => {
    const missing = species()
      .filter((entry) => affinityTalentIds(entry.types).some((id) => !entry.talents.includes(id)))
      .map((entry) => entry.id);
    assert.deepEqual(missing, []);
  });

  test('the signature talents of the original data are kept', () => {
    const db = PokemonDB.getInstance();
    const expectations = {
      treecko: 'overgrow', sceptile: 'overgrow', torchic: 'blaze', mudkip: 'torrent',
      machop: 'guts', skarmory: 'rockguard', poochyena: 'scrappy', mightyena: 'intimidate'
    };
    for (const [id, talent] of Object.entries(expectations)) {
      assert.ok(db.getById(id).talents.includes(talent), `${id} must keep ${talent}`);
    }
  });

  test('species that only had a signature ability now have a full pool', () => {
    const db = PokemonDB.getInstance();
    for (const id of PREVIOUSLY_EMPTY) {
      const entry = db.getById(id);
      assert.ok(entry.talents.length >= PokemonRules.MIN_TALENT_POOL, `${id}: ${entry.talents.length}`);
      assert.ok(entry.hiddenTalent === null || typeof entry.hiddenTalent === 'string');
    }
  });

  test('completeTalentPool() is idempotent and unions listed talents with the affinities', () => {
    const db = PokemonDB.getInstance();
    const entry = db.getById('treecko');
    const completed = completeTalentPool(entry.types, entry.talents);
    assert.deepEqual(completed, [...entry.talents]);
    assert.deepEqual(completeTalentPool(['grass'], ['overgrow']).slice(0, 1), ['overgrow']);
    assert.equal(new Set(completeTalentPool(['grass'], ['overgrow', 'overgrow'])).size,
      completeTalentPool(['grass'], ['overgrow', 'overgrow']).length);
  });

  test('the checked-in table is the output of the rule (tools/data/apply-talent-pools.mjs --check)', () => {
    const output = execFileSync(process.execPath, ['tools/data/apply-talent-pools.mjs', '--check'], {
      cwd: PROJECT_ROOT, encoding: 'utf8'
    });
    assert.ok(output.includes('talent pools complete'), output.trim());
  });

  test('PokemonDB.validate() reports no problem', () => {
    assert.deepEqual(PokemonDB.getInstance().validate(), []);
  });
});

describe('1.16.4 — talent roll of a species with a full pool', (test) => {
  test('a formerly single-talent species rolls several different talents', () => {
    const db = PokemonDB.getInstance();
    const talents = TalentDB.getInstance();
    for (const id of ['treecko', 'torchic', 'mudkip', 'poochyena']) {
      const entry = db.getById(id);
      const rolled = new Set();
      const random = new Random(() => Math.random());
      for (let index = 0; index < 400; index++) {
        const talent = PokemonFactory.rollTalent(entry, random);
        assert.ok(entry.talents.includes(talent), `${id}: ${talent} outside the pool`);
        assert.notEqual(talent, entry.hiddenTalent, `${id}: hidden talent rolled`);
        assert.ok(talents.has(talent));
        rolled.add(talent);
      }
      assert.ok(rolled.size >= 5, `${id} only rolled ${[...rolled].join(', ')}`);
    }
  });

  test('the talent dropdown of an owned Pokémon with a former single-talent species lists more than one option', () => {
    SaveSystem.getInstance().createNewSave('Talents 1.16.4', 'charmander');
    const pokemon = PokemonFactory.create('treecko', 20);
    assert.ok(BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }));
    const state = PokemonTalentSystem.getInstance().getSnapshot(pokemon.uid);
    assert.ok(state, 'no talent state for the owned Pokémon');
    const entry = PokemonDB.getInstance().getById('treecko');
    const options = [...new Set(entry.talents)].filter((id) => id !== entry.hiddenTalent);
    assert.equal(state.options.length, options.length, 'the dropdown lists the whole pool');
    assert.ok(state.options.length >= PokemonRules.MIN_TALENT_POOL - 1, `${state.options.length} options`);
    assert.ok(state.options.some((option) => option.unlocked), 'the current talent is unlocked');
    assert.ok(state.options.every((option) => entry.talents.includes(option.id)));
  });

  test('a created Pokémon draws its talent and its moves from its species', () => {
    const db = PokemonDB.getInstance();
    const entry = db.getById('treecko');
    const pokemon = PokemonFactory.create('treecko', 20);
    assert.ok(entry.talents.includes(pokemon.talent), pokemon.talent);
    assert.deepEqual(pokemon.moves, MoveLearnset.movesForLevel(entry.types, 20));
    assert.ok(pokemon.moves.length > 0);
  });
});

describe('1.16.4 — attack pools audited with the talents', (test) => {
  test('every species has a full level-up pool with a damaging move of its own type', () => {
    const moves = MoveDB.getInstance();
    const problems = [];
    for (const entry of species()) {
      const pool = MoveLearnset.poolFor(entry.types);
      if (pool.length !== MoveConfig.POOL_SIZE) problems.push(`${entry.id}:${pool.length}`);
      const stab = pool.some((id) => moves.getById(id).type && entry.types.includes(moves.getById(id).type)
        && moves.getById(id).power > 0);
      if (!stab) problems.push(`${entry.id}:no-stab`);
    }
    assert.deepEqual(problems, []);
  });

  test('the training pool of every species is never empty', () => {
    const empty = species().filter((entry) => MoveLearnset.trainingPoolFor(entry.types).length === 0)
      .map((entry) => entry.id);
    assert.deepEqual(empty, []);
  });

  test('no trainer or training opponent carries an unknown move', () => {
    const moves = MoveDB.getInstance();
    const db = PokemonDB.getInstance();
    const unknown = new Set();
    let members = 0;
    const visit = (member) => {
      members++;
      if (!db.has(member.species)) unknown.add(`species:${member.species}`);
      for (const move of member.moves || []) if (!moves.getById(move)) unknown.add(move);
    };
    walkMembers(TRAINERS_TABLE, visit);
    assert.ok(members > 300, `${members} members checked`);
    assert.deepEqual([...unknown], []);
  });

  test('no trainer talent is outside the pool of its species', () => {
    const db = PokemonDB.getInstance();
    const outside = new Set();
    walkMembers(TRAINERS_TABLE, (member) => {
      if (!member.talent || !db.has(member.species)) return;
      const entry = db.getById(member.species);
      if (entry.talents.includes(member.talent) || member.talent === entry.hiddenTalent) return;
      outside.add(`${member.species}:${member.talent}`);
    });
    assert.deepEqual([...outside], []);
  });
});
