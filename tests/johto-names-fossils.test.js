import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { computeRequiredHatchKos } from '../src/domain/breeding/hatchery-rules.js';
import { harnessBundleSource, harnessRunMixed } from '../tools/harness-bundle.mjs';

// ── Pass 13 — Johto names (offset) + Johto fossils + day care/auto UI ────
// Reported bug: "Johto Pokémon names are offset, and Johto
// fossils don't give the right Pokémon". Cause: the Piloswine (#221)
// entry was missing from the EN name table → everything was shifted by
// +1 up to Celebi; and in FR indices 220-222 were off by one
// (Swinub lost). Fossils (id-based sprites) therefore displayed
// a wrong name for the right sprite.

const PD_DATA = fs.readFileSync(new URL('../src/data/pd-data.js', import.meta.url), 'utf8');
const EN_NAMES = fs.readFileSync(new URL('../src/localization/en/pokemon-names.js', import.meta.url), 'utf8');
const FR_NAMES = fs.readFileSync(new URL('../src/localization/fr/pokemon-names.js', import.meta.url), 'utf8');
const HATCHERY = fs.readFileSync(new URL('../src/application/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/ui/game/hatchery-ui.js', import.meta.url), 'utf8');
const TRAINING = fs.readFileSync(new URL('../src/application/combat/training.js', import.meta.url), 'utf8');
const CSS = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
// Wave 11: the day-care slot card is rendered by the DS component
// (ui/components/management.js) and its state colors are FIXED FLAT rules
// in design-system.css (DS2811) — the actual stylesheet the game loads.
const MANAGEMENT_COMP = fs.readFileSync(new URL('../src/ui/components/management.js', import.meta.url), 'utf8');
const DS_CSS = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
const FR_UI = fs.readFileSync(new URL('../src/localization/fr/ui.js', import.meta.url), 'utf8');
const EN_UI = fs.readFileSync(new URL('../src/localization/en/ui.js', import.meta.url), 'utf8');

function loadNames() {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // T2-D (vague 38) : noms devenus modules ESM — évalués via le bundle IIFE
// (même ordre pokedex-data → en → fr, globales L_* gardées par leurs shims).
vm.runInContext(harnessBundleSource(['src/data/pd-data.js', 'src/localization/en/pokemon-names.js', 'src/localization/fr/pokemon-names.js']), sandbox, { filename: 'names#passe13 [iife]' });
  return sandbox;
}

// Canonical Johto names (official reference)
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

test('name tables hold 251 species (+ null index 0)', () => {
  const env = loadNames();
  assert.ok(env.L_pokemon_names_en.length >= 252, 'EN: >= 252 entries');
  assert.ok(env.L_pokemon_names_fr.length >= 252, 'FR: >= 252 entries');
  assert.equal(env.L_pokemon_names_en[0], null);
  assert.equal(env.L_pokemon_names_fr[0], null);
});

test('Johto EN names: no offset (Piloswine #221 restored)', () => {
  const env = loadNames();
  for (const [id, name] of Object.entries(CANON_EN)) {
    assert.equal(env.L_pokemon_names_en[id], name, `EN #${id}`);
  }
});

test('Johto FR names: no offset (Swinub #220 restored)', () => {
  const env = loadNames();
  for (const [id, name] of Object.entries(CANON_FR)) {
    assert.equal(env.L_pokemon_names_fr[id], name, `FR #${id}`);
  }
});

test('global alignment: PD and EN names agree on all species 1-251', () => {
  const env = loadNames();
  const mismatches = [];
  for (let i = 1; i <= 251; i++) {
    const pd = String((env.PD[i] || [])[0] || '');
    const en = String(env.L_pokemon_names_en[i] || '');
    if (pd.toLowerCase() !== en.toLowerCase()) mismatches.push(`#${i} PD=${pd} EN=${en}`);
  }
  assert.deepEqual(mismatches, [], 'no species offset');
});

test('Johto fossils: canonical targets Lileep #345 / Anorith #347 (phase 14)', () => {
  const env = loadNames();
  vm.runInContext(HATCHERY.match(/const FOSSIL_REVIVE_MAP[\s\S]*?function getFossilReviveId[\s\S]*?\n\}/)[0], env);
  const cases = { helix_fossil: [138, 'Omanyte'], dome_fossil: [140, 'Kabuto'], old_amber: [142, 'Aerodactyl'], root_fossil: [345, 'Lileep'], claw_fossil: [347, 'Anorith'] };
  for (const [fossil, [id, enName]] of Object.entries(cases)) {
    const rid = env.getFossilReviveId(fossil);
    assert.equal(rid, id, `${fossil} → #${id}`);
    assert.ok(env.PD[rid], `#${rid} exists in the dex`);
    // Kanto: name table; Hoenn (#345/#347): PD entry (outside the 1-251 table).
    const displayName = env.L_pokemon_names_en[rid] || env.PD[rid][0];
    assert.equal(displayName, enName, `shown name = sprite (#${rid})`);
  }
  // The old placeholders must no longer be targeted
  assert.notEqual(env.getFossilReviveId('root_fossil'), 220, 'plus de Marcacrin');
  assert.notEqual(env.getFossilReviveId('claw_fossil'), 246, "plus d'Embrylex");
});

test('generic mine fossil: item, #138 target and sprite fixed', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 40 — ex concat slice(hatchery) + items-data : mêmes sources, même
  // ordre ; items-data (désormais ESM) est bundlé isolément.
  const SLICE = '__slice/hatchery FOSSIL_REVIVE_MAP→getFossilReviveId';
  for (const seg of harnessRunMixed(
    [SLICE, 'src/data/items-data.js'],
    (label) => (label === SLICE
      ? HATCHERY.match(/const FOSSIL_REVIVE_MAP[\s\S]*?function getFossilReviveId[\s\S]*?\n\}/)[0]
      : fs.readFileSync(new URL('../' + label, import.meta.url), 'utf8'))
  )) vm.runInContext(seg.source, sandbox, { filename: seg.filename });
  assert.ok(sandbox.ITEMS.fossil, 'ITEMS.fossil exists (no more invisible bag entry)');
  assert.equal(sandbox.ITEMS.fossil.type, 'fossil');
  assert.equal(sandbox.getFossilReviveId('fossil'), 138, 'revives into Omanyte (#138)');
  assert.ok(fs.existsSync(new URL('../src/assets/images/items/fossil.png', import.meta.url)), 'fossil.png present (link in download_assets.py)');
});

// ── UI: toggle colors and auto-training labels ──────────────────────────────

test('daycare: the mode button keeps the slot colors (green/purple)', () => {
  // Wave 11 (legitimate move): the state classes are now assembled by the
  // DS component — same rendered classes (is-exp / is-breed), and the
  // colors are FIXED FLAT pairs (user rule: no gradients on colored
  // controls): green day-care, purple incubation.
  assert.ok(/hatchery-mode-toggle is-\$\{m\.modeBtn\.mode \|\| 'exp'\}/.test(MANAGEMENT_COMP), 'state classes on the mode toggle');
  assert.ok(/toggleHatcherySlotMode/.test(HATCHERY_UI), 'mode toggle still routed from the adapter model');
  const expRule = DS_CSS.match(/\.hatchery-mode-toggle\.is-exp\s*\{[^}]*\}/g) || [];
  const breedRule = DS_CSS.match(/\.hatchery-mode-toggle\.is-breed\s*\{[^}]*\}/g) || [];
  assert.ok(expRule.some((r) => r.includes('background: #60BE58')), 'vert garderie (flat #60BE58, 7.02:1)');
  assert.ok(breedRule.some((r) => r.includes('background: #8E44AD')), 'violet incubation (flat #8E44AD, 5.07:1)');
});

test('day care: the priority button has colors distinct from the modes', () => {
  assert.ok(/toggleHatcherySlotPriority/.test(HATCHERY_UI));
  // Same legitimate move: class assembly moved to the DS component —
  // the rendered state classes and the distinct blue/bronze colors are
  // unchanged (flat pairs, still ≠ purple incubation).
  assert.ok(/hatchery-priority-toggle \$\{m\.priority\.current === 'fossil' \? 'is-fossil' : 'is-pokemon'\}/.test(MANAGEMENT_COMP), 'state classes on the priority toggle');
  const pokeRule = DS_CSS.match(/\.hatchery-priority-toggle\.is-pokemon\s*\{[^}]*\}/g) || [];
  const fosRule = DS_CSS.match(/\.hatchery-priority-toggle\.is-fossil\s*\{[^}]*\}/g) || [];
  assert.ok(pokeRule.some((r) => r.includes('background: #539DDF')), 'pokemon = blue (flat #539DDF, 5.50:1)');
  assert.ok(fosRule.some((r) => r.includes('background: #7A4E1E')), 'fossile = bronze (flat #7A4E1E, 6.15:1, ≠ violet incubation)');
});

test('day care/training: colored buttons are excluded from the generic .hbtn rule', () => {
  const PWU = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  assert.ok(PWU.includes(':not(.hatchery-mode-toggle)'), 'mode pension exclu');
  assert.ok(PWU.includes(':not(.hatchery-priority-toggle)'), 'day care priority excluded');
  assert.ok(PWU.includes(':not(.training-slot-auto-btn)'), 'training auto excluded');
});

test('training: auto toggle clearly green in CSS when is-on', () => {
  const rules = CSS.match(/\.automation-toggle-btn\.is-on\s*\{[^}]*\}/g) || [];
  const strong = rules.some((r) => r.includes('var(--green)') && r.includes('box-shadow'));
  assert.ok(strong, 'strengthened green is-on rule present');
});

test('training: the slot card shows "Auto: on/off"', () => {
  assert.ok(/training_auto_on/.test(TRAINING) && /training_auto_off/.test(TRAINING), 'keys used');
  assert.ok(FR_UI.includes('"training_auto_on":"Auto : activé"'), 'FR on');
  assert.ok(FR_UI.includes('"training_auto_off":"Auto : désactivé"'), 'FR off');
  assert.ok(EN_UI.includes('"training_auto_on"'), 'EN on');
  assert.ok(EN_UI.includes('"training_auto_off"'), 'EN off');
});

