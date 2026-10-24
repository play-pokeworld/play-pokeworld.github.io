/** @file install-example.mjs @brief Installs the documented mini-region only into a new disposable project copy. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const example = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(example, '../../..');
const destination = path.resolve(
  process.argv[2] || path.join(source, '.arena/auroria-demo'),
);
if (destination === source || fs.existsSync(destination))
  throw Error(
    'Refusing to replace the source project or an existing destination. Choose a NEW directory.',
  );
const meta = JSON.parse(
  fs.readFileSync(path.join(source, 'package.json'), 'utf8'),
);
if (meta.version !== '1.14.28')
  throw Error(
    'This example is pinned to Rework 1.14.28. Review the patch points for another release.',
  );
fs.mkdirSync(destination, { recursive: true });
const excluded = new Set([
  '.git',
  '.arena',
  'node_modules',
  'artifacts',
  '.cache',
  'coverage',
  'dist',
  'build',
]);
for (const entry of fs.readdirSync(source)) {
  if (excluded.has(entry)) continue;
  fs.cpSync(path.join(source, entry), path.join(destination, entry), {
    recursive: true,
    filter: (p) =>
      !p.startsWith(path.join(source, 'docs/validation')) &&
      !fs.lstatSync(p).isSymbolicLink(),
  });
}
function read(name) {
  return fs.readFileSync(path.join(destination, name), 'utf8');
}
function write(name, content) {
  fs.mkdirSync(path.dirname(path.join(destination, name)), { recursive: true });
  fs.writeFileSync(path.join(destination, name), content);
}
function replace(name, needle, replacement) {
  const text = read(name);
  if (!text.includes(needle))
    throw Error(`Patch point not found in ${name}: ${needle}`);
  write(name, text.replace(needle, replacement));
}
function regex(name, pattern, replacement) {
  const text = read(name);
  if (!pattern.test(text))
    throw Error(`Patch point not found in ${name}: ${pattern}`);
  write(name, text.replace(pattern, replacement));
}
function addImport(name, statement) {
  write(name, statement + '\n' + read(name));
}
fs.cpSync(path.join(example, 'files'), destination, { recursive: true });
const content = JSON.parse(
  fs.readFileSync(path.join(example, 'content.json'), 'utf8'),
);
for (const [table, entries] of Object.entries(content)) {
  const name = `src/data/content/${table}-content.js`;
  const symbol =
    table === 'species'
      ? 'SPECIES_CONTENT'
      : table.toUpperCase().replaceAll('-', '_') + '_CONTENT';
  replace(name, `export const ${symbol}`, `const BASE_${symbol}`);
  write(
    name,
    read(name) +
      `\nexport const ${symbol} = ${Array.isArray(entries) ? `[...BASE_${symbol},...${JSON.stringify(entries, null, 2)}]` : `{...BASE_${symbol},...${JSON.stringify(entries, null, 2)}}`};\n`,
  );
}
replace(
  'src/config/Regions.js',
  "  Object.freeze({ id: 'sinnoh',",
  "  Object.freeze({id:'auroria',labelKey:'map_region_auroria',available:true}),\n  Object.freeze({ id: 'sinnoh',",
);
replace(
  'src/config/ContentAccessRules.js',
  "  kanto: 'pallet',",
  "  auroria:'auroria_start',\n  kanto: 'pallet',",
);
replace(
  'src/config/LocationBackgrounds.js',
  'const SCENE_BY_LOCATION = Object.freeze({',
  "const SCENE_BY_LOCATION = Object.freeze({\n auroria_forest:'forest',auroria_summit:'mountain',",
);
replace(
  'src/config/ContentAccessRules.js',
  'export const LOCATION_ACCESS_GATES = Object.freeze({',
  `export const LOCATION_ACCESS_GATES = Object.freeze({
  auroria_path:Object.freeze({starterRegion:'auroria'}),
  auroria_city:Object.freeze({questKey:'main.auroria_road',itemId:'auroria_pass'}),
  auroria_forest:Object.freeze({questKey:'main.auroria_rival'}),`,
);
replace(
  'src/data/pokemon/StarterData.js',
  'export const STARTERS_BY_REGION = Object.freeze({',
  "export const STARTERS_BY_REGION = Object.freeze({\n auroria:Object.freeze([Object.freeze({species:'mossling',nameKey:'pokemon.mossling',descKey:'starter_auroria_mossling_desc'})]),",
);
regex(
  'src/config/FacilityFilterRules.js',
  /filterRegion:\s*Object\.freeze\(\[([^\]]+)\]\)/,
  "filterRegion:Object.freeze([$1,'auroria'])",
);
replace(
  'src/data/content/NpcQuestLinks.js',
  'export const NPC_QUEST_LINKS',
  'const BASE_NPC_QUEST_LINKS',
);
write(
  'src/data/content/NpcQuestLinks.js',
  read('src/data/content/NpcQuestLinks.js') +
    "\nexport const NPC_QUEST_LINKS=Object.freeze({...BASE_NPC_QUEST_LINKS,auroria_guide:Object.freeze({mainQuestKey:'main.auroria_welcome'}),auroria_researcher:Object.freeze({sideQuestKey:'side.auroria_catches'})});\n",
);
for (const language of ['fr', 'en']) {
  write(
    `src/localization/${language}/auroria.js`,
    '/** @file auroria.js @brief Sample-only localized region and field-journal content. */\nexport const auroria=' +
      fs.readFileSync(path.join(example, language + '.json'), 'utf8') +
      ';\n',
  );
  addImport(
    'src/localization/LocaleCatalog.js',
    `import {auroria as ${language}_auroria} from './${language}/auroria.js';`,
  );
  regex(
    'src/localization/LocaleCatalog.js',
    new RegExp(`${language}:\\s*Object\\.freeze\\(\\[`),
    `${language}:Object.freeze([{source:${language}_auroria},`,
  );
}
fs.copyFileSync(
  path.join(example, 'auroria.png'),
  path.join(destination, 'assets/images/maps/auroria.png'),
);
// Development sprite placeholders only, explicitly documented; replace with your own art.
fs.copyFileSync(
  path.join(destination, 'assets/images/pokemon/bulbasaur.png'),
  path.join(destination, 'assets/images/pokemon/mossling.png'),
);
fs.copyFileSync(
  path.join(destination, 'assets/images/pokemon/shiny/bulbasaur.png'),
  path.join(destination, 'assets/images/pokemon/shiny/mossling.png'),
);
addImport(
  'src/data/save/SaveData.js',
  "import {FieldJournalData} from './FieldJournalData.js';",
);
regex(
  'src/data/save/SaveData.js',
  /this\.mine\s*=\s*new MineData\(\);/,
  '$&\n this.fieldJournal=new FieldJournalData();',
);
regex(
  'src/data/save/SaveData.js',
  /mine:\s*this\.mine\.serialize\(\),/,
  '$&\n fieldJournal:this.fieldJournal.serialize(),',
);
regex(
  'src/data/save/SaveData.js',
  /this\.mine\s*=\s*new MineData\(data\.mine\);/,
  '$&\n this.fieldJournal=new FieldJournalData(data.fieldJournal);',
);
addImport(
  'src/data/save/migrations/SaveMigrator.js',
  "import {MigrationV20ToV21} from './MigrationV20ToV21.js';",
);
regex(
  'src/data/save/migrations/SaveMigrator.js',
  /MigrationV19ToV20,?(\s*\])/,
  'MigrationV19ToV20,MigrationV20ToV21$1',
);
regex('src/config/SaveSchema.js', /VERSION:\s*20/, 'VERSION:21');
for (const name of ['package.json', 'package-lock.json']) {
  const data = JSON.parse(read(name));
  data.version = '1.14.29-demo';
  if (data.packages?.['']) data.packages[''].version = data.version;
  write(name, JSON.stringify(data, null, 2) + '\n');
}
regex(
  'src/config/GameConfig.js',
  /VERSION:\s*'1\.14\.28'/,
  "VERSION:'1.14.29-demo'",
);
// Explicit content-coverage fixtures: one new move, two NPCs, one main and one side offer.
replace(
  'tests/GameData.test.js',
  'assert.equal(db.count, 419);',
  'assert.equal(db.count, 420);',
);
replace(
  'tests/Dictionary.test.js',
  'assert.equal(items.length, 214);',
  'assert.equal(items.length, 216);',
);
for (const [before, after] of [
  ['frEntries.length, 214', 'frEntries.length, 216'],
  [
    'NpcQuestDirectory.getIds().length, 210',
    'NpcQuestDirectory.getIds().length, 212',
  ],
  ['mainCount, 44', 'mainCount, 45'],
  ['sideCount, 147', 'sideCount, 148'],
])
  replace('tests/NpcQuestParity.test.js', before, after);
// Cover generated plus manual locale domains without editing generated translation resources.
for (const name of ['tests/GameData.test.js', 'tests/NpcQuestParity.test.js'])
  for (const lang of ['fr', 'en'])
    addImport(
      name,
      `import {auroria as ${lang}_auroria} from '../src/localization/${lang}/auroria.js';`,
    );
for (const lang of ['fr', 'en']) {
  replace(
    'tests/GameData.test.js',
    `L_move_names_${lang}[move.id]`,
    `(L_move_names_${lang}[move.id] || ${lang}_auroria.move?.[move.id])`,
  );
  replace(
    'tests/GameData.test.js',
    `L_${lang}_move_descs[move.id]`,
    `(L_${lang}_move_descs[move.id] || ${lang}_auroria.move_desc?.[move.id])`,
  );
  replace(
    'tests/NpcQuestParity.test.js',
    `Object.entries(L_${lang}_npc)`,
    `Object.entries({...L_${lang}_npc,...${lang}_auroria.npc})`,
  );
}
// Existing schema contracts follow the deliberate sample-only schema bump.
for (const name of [
  'tests/StaticRules.test.js',
  'tests/FeedbackCorrections.test.js',
])
  regex(
    name,
    /(SaveSchema\.VERSION|loaded\.serialize\(\)\.version),\s*20/,
    '$1,21',
  );
addImport(
  'src/main.js',
  "import {FieldJournalSystem} from './systems/FieldJournalSystem.js';",
);
regex(
  'src/main.js',
  /engine\.registerSystem\('DungeonSystem',[^;]+;/,
  "$&\n engine.registerSystem('FieldJournalSystem',FieldJournalSystem.getInstance());",
);
replace(
  'src/config/DashboardLayout.js',
  'export const WindowIds = Object.freeze({',
  "export const WindowIds = Object.freeze({\n FIELD_JOURNAL:'win-field-journal',",
);
regex(
  'src/config/DashboardLayout.js',
  /WindowIds\.SHORTCUTS,\s*WindowIds\.CURRENCY,\s*WindowIds\.POKEBALLS/,
  'WindowIds.SHORTCUTS,WindowIds.CURRENCY,WindowIds.POKEBALLS,WindowIds.FIELD_JOURNAL',
);
addImport(
  'src/pages/GamePage.js',
  "import {FieldJournalPanel} from '../panels/FieldJournalPanel.js';",
);
replace(
  'src/pages/GamePage.js',
  'new MinePanel(DashboardColumns.RIGHT)',
  'new MinePanel(DashboardColumns.RIGHT),\n new FieldJournalPanel(DashboardColumns.RIGHT)',
);
replace(
  'assets/css/style.css',
  '@import url("./facilities.css");',
  '@import url("./facilities.css");\n@import url("./field-journal.css");',
);
console.log(
  JSON.stringify(
    {
      destination,
      version: '1.14.29-demo',
      schema: 21,
      sourceUnchanged: true,
      warning:
        'Disposable mini-region only; never import its schema-21 save into the shipped schema-20 game.',
    },
    null,
    2,
  ),
);
