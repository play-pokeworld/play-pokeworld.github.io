import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

// ── V7 · TXT-01 (D4) — aucune valeur de RÈGLE en dur dans les textes ─────────
// Les pourcentages/prix pilotés par une constante du code arrivent par
// placeholder ({pct}, {price}…). Les descriptions FIXES de talents/attaques
// (recul 25 %, drain 50 %, Isograisse…) restent des textes : liste blanche
// explicite ci-dessous — toute nouvelle entrée doit être justifiée ici.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const NAMESPACES = ['ui', 'economy', 'messages', 'combat'];
const LANGS = ['fr', 'en'];

/** Clé → raison de la liste blanche (description fixe d'une mécanique, pas un paramètre). */
const WHITELIST = {
  effect_recoil: 'description fixe d’effet d’attaque (recul 25 %)',
  effect_drain: 'description fixe d’effet d’attaque (drain 50 %)',
  effect_priority: 'description fixe d’effet d’attaque (priorité)',
  shiny_charm_regional_hint: '« Pokédex 100 % » = définition de la complétion, pas un réglage',
  'm.battle.21': 'message fixe du talent Isograisse',
  'm.battle.25': 'message fixe du talent Cran',
  'm.battle.26': 'message fixe du talent Coloforce',
  combat_attack_auto_25: 'message fixe du talent Coloforce',
  combat_attack_auto_26: 'message fixe du talent Cran',
  combat_attack_auto_30: 'message fixe du talent Isograisse',
};

function entries(src) {
  const re = /"([A-Za-z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push([m[1], m[2]]);
  return out;
}

for (const lang of LANGS) {
  for (const ns of NAMESPACES) {
    test(`TXT-01 — ${lang}/${ns}: no « N % » rule value outside the whitelist`, () => {
      const offenders = [];
      for (const [key, value] of entries(R(`src/localization/${lang}/${ns}.js`))) {
        if (!/\d+\s?%/.test(value)) continue;
        if (WHITELIST[key]) continue;
        offenders.push(`${key} = ${value}`);
      }
      assert.deepEqual(offenders, [], `hard-coded percentages in ${lang}/${ns}`);
    });
  }
}

test('TXT-01 — the parameterized strings exist in both languages and the code feeds them from constants', () => {
  for (const lang of LANGS) {
    const ui = R(`src/localization/${lang}/ui.js`);
    for (const key of ['rarity_com', 'rarity_uncom', 'rarity_rare', 'tutorial_step_catch_desc', 'atoll_factory_desc', 'atoll_factory_reorg_hint', 'roaming_short']) {
      assert.match(ui, new RegExp(`"${key}":"[^"]*\\{pct\\}[^"]*"`), `${lang}: ${key} carries {pct}`);
    }
  }
  const li = R('src/ui/game/location-info.js');
  assert.match(li, /tr\('rarity_rare', \{ pct: _pwBucketPct\('rare'\) \}\)/);
  assert.match(li, /BUCKET_ODDS/);
  assert.ok(wsMatch(R('src/ui/game/tutorial.js'), /tr\('tutorial_step_catch_desc', \{ pct: [\s\S]{0,160}?ballDef\('pokeball'\)\.rate/)); // V7 · DBT-01
  const fp = R('src/ui/game/fullscreen-panel.js');
  assert.match(fp, /ATOLL_FACTORY_STREAK_BONUS/);
  assert.match(R('src/application/world/atoll-core.js'), /export const ATOLL_FACTORY_STREAK_BONUS = 0\.25;/);
  assert.match(R('src/application/world/atoll-core.js'), /1 \+ ATOLL_FACTORY_STREAK_BONUS \*/);
  // Form shop prices come from FORMS (no literal in the panel).
  assert.doesNotMatch(li, /20000|50000/);
});

test('TXT-01 — the whitelist only lists keys that still exist (no stale exemption)', () => {
  const all = new Set();
  for (const ns of NAMESPACES) for (const [k] of entries(R(`src/localization/fr/${ns}.js`))) all.add(k);
  for (const key of Object.keys(WHITELIST)) assert.ok(all.has(key), `whitelisted key ${key} still exists`);
});
