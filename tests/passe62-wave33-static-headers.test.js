/**
 * Passe 62 / Wave 33 — the static index.html headers go through the ONE
 * constructor.
 *
 * User constraint: "le jeu doit construire ses panneaux via un constructeur
 * d'affichage de bloc identique" — a panel header must be the same BY
 * CONSTRUCTION, not by CSS patching nor by hand-copied markup.
 *
 * Wave 32 rebranded the 26 runtime sites onto panelHeaderVNode(). The four
 * headers literally typed into index.html (#settings-modal, #quest-modal,
 * #unified-selector-modal, #battle-summary-modal) were only hand-ALIGNED,
 * i.e. identical by copy-paste. ui/components/static-headers.js now rebuilds
 * them from the constructor at boot. These tests pin that wiring and the
 * contracts (ids, i18n hooks, data-action hooks) the rest of the code needs.
 */
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const SRC = read('src/ui/components/static-headers.js');
// Comments quote the OLD hand-rolled markup on purpose (root-cause note);
// strip them before auditing what the module actually emits.
const SRC_CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const MAIN = read('src/main.js');
const BARREL = read('src/ui/components/index.js');
const HTML = read('index.html');

const HOSTS = [
  '#settings-modal .modal-title',
  '#quest-modal .modal-title',
  '#unified-selector-modal .modal-title',
  '#battle-summary-modal .modal-title',
];

test('A — static-headers builds through panelHeaderVNode and nothing else', () => {
  assert.match(SRC, /import\s*\{\s*panelHeaderVNode\s*\}\s*from\s*'\.\/panel-header\.js'/);
  // No hand-rolled header markup may reappear in this module.
  assert.ok(!/<div[^>]*class=["'][^"']*modal-title/.test(SRC_CODE),
    'static-headers must never emit literal .modal-title markup');
});

test('B — the four static headers are all covered', () => {
  for (const host of HOSTS) {
    assert.ok(SRC.includes(host), `missing descriptor for ${host}`);
  }
});

test('C — the module is loaded at boot and exported from the barrel', () => {
  assert.match(MAIN, /import\s+"\.\/ui\/components\/static-headers\.js"/);
  assert.match(BARREL, /export\s*\{\s*pwBuildStaticHeaders\s*\}\s*from\s*'\.\/static-headers\.js'/);
});

test('D — every id written elsewhere in the codebase is preserved', () => {
  for (const id of ['settings-title', 'quest-title', 'usm-title', 'battle-summary-title']) {
    assert.ok(SRC.includes(id), `id ${id} lost in the rebuild`);
  }
});

test('E — i18n hooks survive the rebuild', () => {
  for (const key of ['settings_title', 'usm_selection', 'battle_summary_title']) {
    assert.ok(SRC.includes(key), `data-i18n ${key} lost`);
  }
  const aria = SRC.match(/modal_close_btn/g) || [];
  assert.equal(aria.length, 4, 'each rebuilt close keeps data-i18n-aria-label');
});

test('F — dispatcher hooks survive the rebuild', () => {
  for (const act of ['close-settings', 'close-unified-selector', 'close-battle-summary']) {
    assert.ok(SRC.includes(act), `data-action ${act} lost`);
  }
  assert.ok(SRC.includes('closeQuestModal'), 'quest close call lost');
});

test('G — layout-only static classes survive the rebuild', () => {
  for (const cls of ['pw-static-054', 'pw-static-055', 'pw-static-035']) {
    assert.ok(SRC.includes(cls), `${cls} lost`);
  }
});

test('H — the rebuild is idempotent (guard flag present)', () => {
  assert.match(SRC, /pwHeaderBuilt/);
});

test('I — index.html still hosts the four bands the rebuild targets', () => {
  for (const id of ['settings-modal', 'quest-modal', 'unified-selector-modal', 'battle-summary-modal']) {
    assert.ok(HTML.includes(`id="${id}"`), `#${id} missing from index.html`);
  }
  // Exactly the four static .modal-title bands, no more.
  const bands = HTML.match(/class="modal-title/g) || [];
  assert.equal(bands.length, 4,
    'a new hand-rolled .modal-title appeared in index.html — add it to static-headers.js');
});
