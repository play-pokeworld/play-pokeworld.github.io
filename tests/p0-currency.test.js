import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DUNGEON_TOLLS, DIAMOND_VALUES, moneyPerKill, tokensPerCatch, dungeonToll, pqForMoney,
} from '../src/application/economy/currency.js';
import {
  BALL_DEFS, BALL_CYCLE, PRESET_FILTERS, HONOR_EVERY, ballDef, filterMatches,
} from '../src/application/economy/pokeballs.js';

test('P0 — formule ₽/victoire (routeMoney PokéClicker, sans jitter)', () => {
  assert.equal(moneyPerKill(1), 10);      // plancher à 10 ₽
  assert.ok(moneyPerKill(9) >= 90, 'fin Kanto');
  assert.ok(moneyPerKill(18) >= 190, 'fin Johto');
  assert.ok(moneyPerKill(27) >= 300, 'fin Hoenn');
  assert.ok(moneyPerKill(10) < moneyPerKill(27), 'croissant');
});

test('P0 — formule JD/capture (routeDungeonTokens PokéClicker)', () => {
  assert.equal(tokensPerCatch(1, 'kanto'), 4);
  assert.ok(tokensPerCatch(27, 'hoenn') >= 250, 'fin Hoenn ≥ 250 JD');
  assert.ok(tokensPerCatch(18, 'johto') < tokensPerCatch(27, 'hoenn'), 'croissant par région');
});

test('P0 — péage des donjons par badgeReq', () => {
  // PASSE 39d — péages PLAFONNÉS : entrer dans un donjon avancé ne doit pas
  // être une punition (les récompenses croissent avec les badges, le péage
  // reste abordable). 8 badges → 1000 JD au lieu de 50 000.
  assert.deepEqual(DUNGEON_TOLLS, [100, 150, 250, 350, 500, 650, 800, 900, 1000]);
  assert.equal(dungeonToll(0), 100);
  assert.equal(dungeonToll(8), 1000);
  assert.equal(dungeonToll(99), 1000); // plafonné
  assert.equal(dungeonToll(-3), 100);  // borné bas
});

test('P0 — PQ par quête répétable (barème de conversion)', () => {
  assert.equal(pqForMoney(4000), 100);
  assert.equal(pqForMoney(9000), 250);
  assert.equal(pqForMoney(16000), 500);
  assert.equal(pqForMoney(21000), 1000);
  assert.equal(pqForMoney(30000), 2500);
});

test('P0 — valeurs 💎 des trésors de la mine', () => {
  assert.equal(DIAMOND_VALUES.stardust, 70);
  assert.equal(DIAMOND_VALUES.nugget, 100);
  assert.equal(DIAMOND_VALUES.rare_bone, 100);
  assert.equal(DIAMOND_VALUES.star_piece, 175);
  assert.equal(DIAMOND_VALUES.big_nugget, 250);
  assert.equal(DIAMOND_VALUES.heart_scale, 350);
});

test('P0 — Poké Balls : prix, taux, ordre, Honor Ball, filtres', () => {
  assert.equal(BALL_DEFS.pokeball.price, 100);
  assert.equal(BALL_DEFS.greatball.price, 500);
  assert.equal(BALL_DEFS.ultraball.price, 2000);
  assert.equal(BALL_DEFS.masterball.price, 10000000);
  assert.equal(BALL_DEFS.pokeball.rate, 10);
  assert.equal(BALL_DEFS.greatball.rate, 20);
  assert.equal(BALL_DEFS.ultraball.rate, 30);
  assert.equal(BALL_DEFS.masterball.rate, 100);
  assert.equal(BALL_DEFS.honorball.notForSale, true);
  assert.equal(HONOR_EVERY, 10);
  assert.deepEqual(BALL_CYCLE, ['none', 'pokeball', 'greatball', 'ultraball', 'masterball', 'honorball', 'lureball', 'moonball', 'fastball', 'diveball', 'repeatball', 'nestball', 'duskball', 'timerball', 'quickball', 'luxuryball', 'beastball']);
  assert.equal(ballDef('honorball').price, 0);
  assert.equal(ballDef('nope'), null);
  // Filtres par défaut (modèle PokéClicker : liste prioritaire).
  assert.equal(PRESET_FILTERS.length, 5);
  assert.equal(PRESET_FILTERS[0].id, 'new');
  assert.equal(PRESET_FILTERS[1].id, 'new_shiny');
  assert.equal(PRESET_FILTERS[2].id, 'caught_shiny');
  assert.equal(PRESET_FILTERS[3].id, 'caught');
  assert.equal(PRESET_FILTERS[4].id, 'roaming');
  // Le filtre "nouveau chromatique" exige shiny:true (et non capturé).
  assert.equal(filterMatches(PRESET_FILTERS[1], { shinyActive: true, id: 999 }), true);
  assert.equal(filterMatches(PRESET_FILTERS[1], { shinyActive: false, id: 999 }), false);
  // De base TOUTES les balls sont sur « none » (le tuto apprend à les poser).
  for (const f of PRESET_FILTERS) assert.equal(f.ball, 'none', f.id + ' → none');
  // Le filtre "errant" cible le type de rencontre roaming.
  assert.equal(filterMatches(PRESET_FILTERS[4], { id: 144, _isRoaming: true }), true);
  assert.equal(filterMatches(PRESET_FILTERS[4], { id: 25, shinyActive: false }), false);
});

