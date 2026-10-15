// V7 · DBT-08 — les simulateurs lisent les constantes DU CODE (aucune copie locale) et
// `src/version.js` est généré depuis package.json. Ce test garde ces contrats : si une
// constante est renommée, reformatée (DBT-01) ou déplacée, c'est ICI que ça casse, pas
// silencieusement dans `npm run sim:economy`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameConstants } from '../tools/lib/game-constants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('DBT-08 · tools/lib/game-constants.mjs lit toutes les constantes depuis les modules du jeu', async () => {
  const c = await gameConstants();
  assert.ok(c.ITEMS && c.ITEMS.rarecandy, 'ITEMS vient de items-data.js');
  assert.ok(Array.isArray(c.STAFF_DEFS) || typeof c.STAFF_DEFS === 'object', 'STAFF_DEFS exposé par automation.js');
  assert.equal(typeof c.moneyPerKill, 'function', 'moneyPerKill est la fonction du code (currency.js)');
  assert.equal(typeof c.dungeonToll, 'function', 'dungeonToll est la fonction du code');
  assert.ok(Number.isInteger(c.MINE_W) && Number.isInteger(c.MINE_H), 'dimensions de la mine');
  assert.ok(Number.isInteger(c.autoMineCostPerTile) && c.autoMineCostPerTile > 0, 'coût auto-mine lu dans le ticker (regex tolérante à Prettier)');
  assert.ok(c.mineLayerTreasures.min >= 1 && c.mineLayerTreasures.max >= c.mineLayerTreasures.min, 'trésors par couche lus dans generateMineLayer');
  assert.ok(c.BALL_DEFS && c.MASTER_BALL_BASES && c.MASTER_BALL_STEPS, 'Balls + Master Ball multi-monnaies (pokeballs.js)');
  assert.ok(c.HATCHERY_SLOT_UPGRADE_COSTS && c.TRAINING_QUEUE_UPGRADE_COSTS, 'coûts pension / entraînement');
  assert.ok(c.DUNGEON_TOLLS && c.DUNGEON_AUTO_UNLOCK_CLEARS !== undefined, 'donjons');
});

test('DBT-08 · economy-sim.mjs et sim_battles.mjs ne portent aucune constante de jeu dupliquée', () => {
  const eco = R('tools/economy-sim.mjs');
  assert.match(eco, /gameConstants\(\)/, 'economy-sim passe par gameConstants()');
  assert.doesNotMatch(eco, /const\s+(BALL_DEFS|STAFF_DEFS|DUNGEON_TOLLS|MINE_ITEMS|MASTER_BALL_BASES)\s*=\s*[\[{]/, 'aucune table recopiée dans le simulateur économique');
  const sim = R('tools/sim_battles.mjs');
  assert.match(sim, /domain\/battle\/type-system\.js/, 'sim_battles importe LA table des types du domaine');
  assert.doesNotMatch(sim, /const\s+TYPE_CHART\s*=\s*\{/, 'sim_battles ne recopie pas la table des types');
});

test('DBT-08 · src/version.js est généré depuis package.json (une seule version)', () => {
  const pkg = JSON.parse(R('package.json'));
  const ver = R('src/version.js');
  assert.match(ver, /FICHIER GÉNÉRÉ par tools\/gen-version\.mjs/, 'en-tête « généré »');
  assert.match(ver, new RegExp(`export const PW_VERSION = '${pkg.version.replace(/\./g, '\\.')}';`), `PW_VERSION = ${pkg.version}`);
  assert.match(ver, /export const PW_BUILD = PW_VERSION;/, 'PW_BUILD est un alias, pas une seconde version');
  assert.match(R('package.json'), /"build": "node tools\/gen-version\.mjs && /, 'le build régénère version.js');
});
