import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 13 — noms Johto (décalage) + fossiles Johto + UI pension/auto ────
// Bug remonté : « les noms des pokémon de Johto ont un décalage, et les
// fossiles de Johto ne donnent pas les bons Pokémon ». Cause : l'entrée
// Piloswine (#221) manquait dans la table des noms EN → tout était décalé de
// +1 jusqu'à Celebi ; et en FR les indices 220-222 étaient décalés d'un cran
// (Marcacrin perdu). Les fossiles (sprites basés sur l'id) affichaient donc
// un mauvais nom pour le bon sprite.

const PD_DATA = fs.readFileSync(new URL('../src/data/pd-data.js', import.meta.url), 'utf8');
const EN_NAMES = fs.readFileSync(new URL('../src/localization/en/pokemon-names.js', import.meta.url), 'utf8');
const FR_NAMES = fs.readFileSync(new URL('../src/localization/fr/pokemon-names.js', import.meta.url), 'utf8');
const HATCHERY = fs.readFileSync(new URL('../src/game/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/game/breeding/hatchery-ui.js', import.meta.url), 'utf8');
const TRAINING = fs.readFileSync(new URL('../src/game/combat/training.js', import.meta.url), 'utf8');
const CSS = fs.readFileSync(new URL('../src/assets/styles/cleaned-components.css', import.meta.url), 'utf8');
const FR_UI = fs.readFileSync(new URL('../src/localization/fr/ui.js', import.meta.url), 'utf8');
const EN_UI = fs.readFileSync(new URL('../src/localization/en/ui.js', import.meta.url), 'utf8');

function loadNames() {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(PD_DATA + '\n' + EN_NAMES + '\n' + FR_NAMES, sandbox, { filename: 'names#passe13' });
  return sandbox;
}

// Noms canoniques Johto (référence officielle)
const CANON_EN = {
  152: 'Chikorita', 155: 'Cyndaquil', 158: 'Totodile', 172: 'Pichu', 182: 'Bellossom',
  193: 'Yanma', 201: 'Unown', 208: 'Steelix', 215: 'Sneasel', 218: 'Slugma', 219: 'Magcargo',
  220: 'Swinub', 221: 'Piloswine', 222: 'Corsola', 223: 'Remoraid', 224: 'Octillery',
  225: 'Delibird', 226: 'Mantine', 227: 'Skarmory', 228: 'Houndour', 229: 'Houndoom',
  230: 'Kingdra', 231: 'Phanpy', 232: 'Donphan', 233: 'Porygon2', 234: 'Stantler',
  235: 'Smeargle', 236: 'Tyrogue', 237: 'Hitmontop', 238: 'Smoochum', 239: 'Elekid',
  240: 'Magby', 241: 'Miltank', 242: 'Blissey', 243: 'Raikou', 244: 'Entei', 245: 'Suicune',
  246: 'Larvitar', 247: 'Pupitar', 248: 'Tyranitar', 249: 'Lugia', 250: 'Ho-Oh', 251: 'Celebi',
};
const CANON_FR = {
  152: 'Germignon', 155: 'Héricendre', 158: 'Kaiminus', 172: 'Pichu', 182: 'Joliflor',
  218: 'Limagma', 219: 'Volcaropod', 220: 'Marcacrin', 221: 'Cochignon', 222: 'Corayon',
  223: 'Rémoraid', 232: 'Donphan', 236: 'Debugant', 241: 'Écrémeuh', 242: 'Leuphorie',
  246: 'Embrylex', 247: 'Ymphect', 248: 'Tyranocif', 249: 'Lugia', 250: 'Ho-Oh', 251: 'Celebi',
};

test('les tables de noms ont 251 espèces (+ index 0 null)', () => {
  const env = loadNames();
  assert.ok(env.L_pokemon_names_en.length >= 252, 'EN : >= 252 entrées');
  assert.ok(env.L_pokemon_names_fr.length >= 252, 'FR : >= 252 entrées');
  assert.equal(env.L_pokemon_names_en[0], null);
  assert.equal(env.L_pokemon_names_fr[0], null);
});

test('noms EN Johto : aucun décalage (Piloswine #221 restauré)', () => {
  const env = loadNames();
  for (const [id, name] of Object.entries(CANON_EN)) {
    assert.equal(env.L_pokemon_names_en[id], name, `EN #${id}`);
  }
});

test('noms FR Johto : aucun décalage (Marcacrin #220 restauré)', () => {
  const env = loadNames();
  for (const [id, name] of Object.entries(CANON_FR)) {
    assert.equal(env.L_pokemon_names_fr[id], name, `FR #${id}`);
  }
});

test('alignement global : PD et noms EN concordent sur toutes les espèces 1-251', () => {
  const env = loadNames();
  const mismatches = [];
  for (let i = 1; i <= 251; i++) {
    const pd = String((env.PD[i] || [])[0] || '');
    const en = String(env.L_pokemon_names_en[i] || '');
    if (pd.toLowerCase() !== en.toLowerCase()) mismatches.push(`#${i} PD=${pd} EN=${en}`);
  }
  assert.deepEqual(mismatches, [], 'aucune espèce décalée');
});

test('fossiles Johto : cibles canoniques Lilia #345 / Anorith #347 (passe 14)', () => {
  const env = loadNames();
  vm.runInContext(HATCHERY.match(/const FOSSIL_REVIVE_MAP[\s\S]*?function getFossilReviveId[\s\S]*?\n\}/)[0], env);
  const cases = { helix_fossil: [138, 'Omanyte'], dome_fossil: [140, 'Kabuto'], old_amber: [142, 'Aerodactyl'], root_fossil: [345, 'Lileep'], claw_fossil: [347, 'Anorith'] };
  for (const [fossil, [id, enName]] of Object.entries(cases)) {
    const rid = env.getFossilReviveId(fossil);
    assert.equal(rid, id, `${fossil} → #${id}`);
    assert.ok(env.PD[rid], `#${rid} existe dans le dex`);
    // Kanto : table des noms ; Hoenn (#345/#347) : entrée PD (hors table 1-251).
    const displayName = env.L_pokemon_names_en[rid] || env.PD[rid][0];
    assert.equal(displayName, enName, `nom affiché = sprite (#${rid})`);
  }
  // Les anciens placeholders ne doivent plus être visés
  assert.notEqual(env.getFossilReviveId('root_fossil'), 220, 'plus de Marcacrin');
  assert.notEqual(env.getFossilReviveId('claw_fossil'), 246, "plus d'Embrylex");
});

test('fossile générique de la mine : objet, cible #138 et sprite réparés', () => {
  const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(HATCHERY.match(/const FOSSIL_REVIVE_MAP[\s\S]*?function getFossilReviveId[\s\S]*?\n\}/)[0] + '\n' + ITEMS_DATA, sandbox);
  assert.ok(sandbox.ITEMS.fossil, 'ITEMS.fossil existe (plus d\'entrée sac invisible)');
  assert.equal(sandbox.ITEMS.fossil.type, 'fossil');
  assert.equal(sandbox.getFossilReviveId('fossil'), 138, 'réanimation en Amonita (#138)');
  assert.ok(fs.existsSync(new URL('../src/assets/images/items/fossil.png', import.meta.url)), 'fossil.png présent (lien dans download_assets.py)');
});

// ── UI : couleurs des toggles et labels auto entraînement ───────────────────

test('pension : le bouton de mode garde les couleurs du slot (vert/violet)', () => {
  // Passe 14 : couleurs via classes CSS dédiées — le data-style était masqué
  // par la règle générique .hbtn:not(...) de pw-unified.css.
  assert.ok(/hatchery-mode-toggle \$\{mode === 'exp' \? 'is-exp' : 'is-breed'\}"/.test(HATCHERY_UI), 'classes d\'état sur le toggle de mode');
  const expRule = CSS.match(/\.hatchery-mode-toggle\.is-exp\s*\{[^}]*\}/);
  const breedRule = CSS.match(/\.hatchery-mode-toggle\.is-breed\s*\{[^}]*\}/);
  assert.ok(expRule && expRule[0].includes('var(--green)'), 'vert garderie');
  assert.ok(breedRule && breedRule[0].includes('var(--purple)'), 'violet incubation');
});

test('pension : le bouton de priorité a des couleurs distinctes des modes', () => {
  assert.ok(/toggleHatcherySlotPriority/.test(HATCHERY_UI));
  assert.ok(/hatchery-priority-toggle \$\{priority === 'fossil' \? 'is-fossil' : 'is-pokemon'\}"/.test(HATCHERY_UI), 'classes d\'état sur le toggle de priorité');
  const pokeRule = CSS.match(/\.hatchery-priority-toggle\.is-pokemon\s*\{[^}]*\}/);
  const fosRule = CSS.match(/\.hatchery-priority-toggle\.is-fossil\s*\{[^}]*\}/);
  assert.ok(pokeRule && pokeRule[0].includes('var(--blue)'), 'pokémon = bleu');
  assert.ok(fosRule && fosRule[0].includes('#a06a2c'), 'fossile = bronze (≠ violet incubation)');
});

test('pension/entraînement : les boutons colorés sont exclus de la règle générique .hbtn', () => {
  const PWU = fs.readFileSync(new URL('../src/assets/styles/pw-unified.css', import.meta.url), 'utf8');
  assert.ok(PWU.includes(':not(.hatchery-mode-toggle)'), 'mode pension exclu');
  assert.ok(PWU.includes(':not(.hatchery-priority-toggle)'), 'priorité pension exclue');
  assert.ok(PWU.includes(':not(.training-slot-auto-btn)'), 'auto entraînement exclu');
});

test('entraînement : toggle auto is-on clairement vert en CSS', () => {
  const rules = CSS.match(/\.automation-toggle-btn\.is-on\s*\{[^}]*\}/g) || [];
  const strong = rules.some((r) => r.includes('var(--green)') && r.includes('box-shadow'));
  assert.ok(strong, 'règle is-on verte renforcée présente');
});

test('entraînement : la carte slot affiche « Auto : activé/désactivé »', () => {
  assert.ok(/training_auto_on/.test(TRAINING) && /training_auto_off/.test(TRAINING), 'clés utilisées');
  assert.ok(FR_UI.includes('"training_auto_on":"Auto : activé"'), 'FR on');
  assert.ok(FR_UI.includes('"training_auto_off":"Auto : désactivé"'), 'FR off');
  assert.ok(EN_UI.includes('"training_auto_on"'), 'EN on');
  assert.ok(EN_UI.includes('"training_auto_off"'), 'EN off');
});

