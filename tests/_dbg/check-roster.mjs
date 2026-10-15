import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../../tools/harness-bundle.mjs';
const R = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const sandbox = { console, window: {}, G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr' },
  PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
  rand: () => 0.5, chance: () => false, rollShiny: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  t: (k) => k, tr: (k) => k, getPokeName: (id) => 'P' + id, notify: () => {}, saveGame: () => {}, setMsg: () => {}, POKE_NAMES_EN: {}, POKE_NAMES_FR: {} };
sandbox.window = sandbox; sandbox.globalThis = sandbox; vm.createContext(sandbox);
for (const f of ['src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js', 'src/data/poke-talents.js', 'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js', 'src/application/world/team.js', 'src/application/pokemon-factory.js', 'src/data/official-teams-data.js', 'src/data/official-teams-hoenn.js']) {
  const txt = R(f); vm.runInContext(harnessIsEsm(txt) ? harnessBundleSource([f]) : txt, sandbox, { filename: f });
}
const sb = sandbox;
const arg = process.argv[2];
if (arg === 'pool') { // node check-roster.mjs pool 261
  const id = Number(process.argv[3]);
  console.log(sb.PD[id][0], 'talents:', (sb.getSpeciesTalents(id) || []).map((x) => x.id || x).join(','));
  console.log('natural:', [...(sb.getSpeciesFullLearnablePool(id) || [])].join(' '));
  console.log('tm/hm:', Object.keys(sb.getCtCsMoveIds(id) || {}).join(' '));
  process.exit(0);
}
const keys = arg ? [arg] : Object.keys(sb.OFFICIAL_TEAMS_HOENN);
let bad = 0;
for (const key of keys) {
  const e = sb.OFFICIAL_TEAMS_HOENN[key]; if (!e) { console.log('no entry', key); continue; }
  const variants = e.variantsByStarter ? Object.entries(e.variantsByStarter) : [['-', e.team]];
  for (const [v, specs] of variants) for (const spec of specs) {
    const label = `${key}[${v}]#${spec.id} ${sb.PD[spec.id] ? sb.PD[spec.id][0] : '??'} N${spec.level}`;
    if (!sb.PD[spec.id]) { console.log('BAD species', label); bad++; continue; }
    const natural = new Set(sb.getSpeciesFullLearnablePool(spec.id) || []); const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(spec.id) || {}));
    for (const mv of spec.moves) { if (!sb.MOVES[mv]) { console.log('BAD move missing', label, mv); bad++; } else if (!natural.has(mv) && !ctcs.has(mv)) { console.log('ILLEGAL move', label, mv); bad++; } }
    const talents = new Set((sb.getSpeciesTalents(spec.id) || []).map((x) => x.id || x));
    if (!talents.has(spec.talent)) { console.log('BAD talent', label, spec.talent, '→ allowed:', [...talents].join(',')); bad++; }
    if (spec.item != null) { const it = sb.ITEMS[spec.item]; if (!it) { console.log('BAD item', label, spec.item); bad++; } else if (!(it.type === 'held' || it.buff)) { console.log('BAD item not held', label, spec.item); bad++; } }
    const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
    if (sum(spec.ivs) > 36 || sum(spec.evs) > 36) { console.log('BAD budget', label); bad++; }
    for (const x of Object.values(spec.ivs || {})) if (x > 12) { console.log('BAD iv>12', label); bad++; }
    for (const x of Object.values(spec.evs || {})) if (x > 18) { console.log('BAD ev>18', label); bad++; }
  }
}
console.log(bad ? `${bad} problem(s)` : `OK (${keys.length} entries)`);
