import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// FIX-07b — UNE SEULE source de talents par espèce (poke-talents.js).
// Le pool appartient à l'espèce : getSpeciesTalents(id) retourne le pool de
// l'espèce, et chaque talent utilisé par une équipe officielle y figure.
const R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function makeSandbox() {
  const sandbox = {
    console,
    window: {},
    G: { lang: 'fr', pokedex: {}, collection: {}, team: [], inventory: {} },
    t: (k) => k, tr: (k) => k, notify: () => {}, saveGame: () => {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource([
    'src/data/talents-full.js',
    'src/data/pd-data.js',
    'src/data/game-config.js',
    'src/data/poke-talents.js',
    'src/data/game-helpers.js',
  ]), sandbox, { filename: 'fix-07b [iife]' });
  return sandbox;
}

test('FIX-07b: une seule source — poke-talents-data.js a disparu', () => {
  assert.equal(fs.existsSync(new URL('../src/data/poke-talents-data.js', import.meta.url)), false, 'poke-talents-data.js supprimé');
});

test('FIX-07b: le pool de talents appartient à chaque espèce (1..386)', () => {
  const sb = makeSandbox();
  for (let i = 1; i <= 386; i++) {
    const tals = sb.getSpeciesTalents(i);
    assert.ok(Array.isArray(tals) && tals.length >= 1, `#${i} a un pool non vide`);
  }
});

test('FIX-07b: chaque talent d\'équipe officielle (3 régions) est dans le pool de l\'espèce', () => {
  const sb = makeSandbox();
  const teams = {};
  for (const f of ['src/data/official-teams-data.js', 'src/data/official-teams-hoenn.js']) {
    for (const m of R(f).matchAll(/id:\s*(\d+)[,\s][^\n]*?talent:\s*'([a-z_]+)'/g)) {
      (teams[Number(m[1])] = teams[Number(m[1])] || new Set()).add(m[2]);
    }
  }
  const problems = [];
  for (const [id, tals] of Object.entries(teams)) {
    const pool = new Set(sb.getSpeciesTalents(Number(id)));
    for (const tal of tals) if (!pool.has(tal)) problems.push(`#${id}:${tal}`);
  }
  assert.deepEqual(problems, [], 'aucun talent d\'équipe manquant');
});

test('FIX-07b: un talent caché par espèce est marqué séparément', () => {
  const sb = makeSandbox();
  // Les espèces ayant un talent caché ont POKEMON_TALENTS[#].hiddenAbility ;
  // c'est distinct du talent normal (jamais les 3 en même temps).
  let withHidden = 0;
  for (let i = 1; i <= 386; i++) {
    const ha = sb.POKEMON_TALENTS && sb.POKEMON_TALENTS[i] && sb.POKEMON_TALENTS[i].hiddenAbility;
    if (ha) withHidden++;
  }
  assert.ok(withHidden >= 300, `talent caché marqué pour de nombreuses espèces (got ${withHidden})`);
});

