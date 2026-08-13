// Wave 33 — ONE panel header, proven by measurement.
//
// ── The bug this wave closes ───────────────────────────────────────────
// The user reported three times that the panel headers still did not match.
// Wave 32 had built the shared constructor (components/panel-header.js) and
// rebranded 26 hand-rolled sites onto it — but the REFERENCE panels (sac,
// marché, pokédex, dictionnaire, guide, boutique) were never among the 26.
// They are built by src/ui/game/fullscreen-panel.js, which emitted its own
// `pw-`-prefixed markup family:
//
//     .pw-modal-header > .pw-modal-title + .pw-modal-close
//
// styled by a legacy rule set (dark1 background, 12px 18px padding, 50px
// min-height, square corners, bare 22px ✕) that was completely disjoint from
// the canonical `.modal-title` rules. Two families, two CSS paths, one very
// unconvinced user — and a green test suite the whole time, because the
// wave-32 check compared the builder's output against the builder's own
// output instead of against the reference panel's real DOM.
//
// Wave 33: fullscreen-panel.js goes through panelHeaderHTML() like everyone
// else, the legacy geometry is deleted, and the remaining local overrides
// (settings, quests, poke-modal bleeds, management, box PC, window bars) are
// folded onto shared tokens. The proof is browser-measured — see
// tests/harness/visual-wave33-headers.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(new URL('..', import.meta.url).pathname);
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const DS = R('src/assets/styles/design-system.css');
const FS_PANEL = R('src/ui/game/fullscreen-panel.js');
const HEADER = R('src/ui/components/panel-header.js');

/* ── 1. The reference panel uses the shared constructor ─────────────── */
test('wave 33 A: fullscreen-panel.js no longer hand-rolls its header', () => {
  assert.ok(
    FS_PANEL.includes("import { panelHeaderHTML }"),
    'the reference panel imports the shared constructor'
  );
  assert.ok(
    /panelHeaderHTML\(\{[\s\S]*?id:\s*'fs-panel-header'[\s\S]*?\}\)/.test(FS_PANEL),
    'the reference header is BUILT, not written by hand'
  );
  for (const legacy of ['class="pw-modal-title"', 'class="pw-modal-close"']) {
    assert.ok(!FS_PANEL.includes(legacy), `legacy markup gone: ${legacy}`);
  }
  // The ids the classic bridge and the i18n pass rely on are preserved.
  assert.ok(FS_PANEL.includes("id: 'fs-panel-title'"), '#fs-panel-title kept');
  assert.ok(FS_PANEL.includes("call: 'closeFullscreenPanel'"), 'close wiring kept');
});

test('wave 33 B: the constructor can carry an id on the header band', () => {
  assert.ok(/if \(o\.id\) props\.id = o\.id;/.test(HEADER), 'id support in panelHeaderVNode');
});

/* ── 2. The competing CSS family is really gone ─────────────────────── */
test('wave 33 C: the legacy .pw-modal-* header geometry is deleted', () => {
  // Both copies of the old block (there were two: ~L2399 and ~L6155).
  assert.ok(!/\.pw-modal-header\s*\{[^}]*min-height:\s*50px/.test(DS), 'no 50px legacy band');
  assert.ok(!/\.pw-modal-header\s*\{[^}]*padding:\s*12px 18px/.test(DS), 'no 12px 18px legacy padding');
  assert.ok(!/\.pw-modal-title\s*\{/.test(DS), '.pw-modal-title has no geometry rule left');
  assert.ok(!/\.pw-modal-close\s*\{/.test(DS), '.pw-modal-close has no geometry rule left');
});

/* ── 3. Geometry lives in tokens, so no panel can silently drift ────── */
test('wave 33 D: the header band is described by shared tokens only', () => {
  for (const token of [
    '--pw-header-h: 48px',
    '--pw-header-pad: 0 8px 0 14px',
    '--pw-header-radius: 10px',
    '--pw-header-gap: 12px',
    '--pw-header-title-size: 13px',
    '--pw-header-close-size: 34px',
    '--pw-header-close-glyph: 17px',
  ]) assert.ok(DS.includes(token), `token defined: ${token}`);

  const canonical = DS.match(/\.modal-title,\s*\n\.pw-modal-header,\s*\n#fs-panel-header,[\s\S]*?\}/);
  assert.ok(canonical, 'canonical header rule still covers both class families');
  assert.ok(/padding:\s*var\(--pw-header-pad\)/.test(canonical[0]), 'padding from token');
  assert.ok(/border-radius:\s*var\(--pw-header-radius\)/.test(canonical[0]), 'radius from token');
  assert.ok(/font-size:\s*var\(--pw-header-title-size\)/.test(canonical[0]), 'title size from token');
});

test('wave 33 E: the header title node is pinned to the header size', () => {
  // ROOT CAUSE of the size split: `.pw-info-name` is 15px/900 because it is
  // also the title of info-sheet BODIES. Inside a header it must follow the
  // header token, or the rebranded panels render 15px against the
  // reference's 13px — which is exactly what the user was seeing.
  assert.ok(
    /\.modal-title \.pw-info-name,\s*\n\.pw-modal-header \.pw-info-name \{[^}]*font-size:\s*var\(--pw-header-title-size\)/.test(DS),
    '.pw-info-name inside a header follows the header token'
  );
});

test('wave 33 F: the 13px blanket hammer cannot reach into a header', () => {
  // `#quest-inner *` / `#settings-inner *` was resizing the shared ✕ down to
  // 13px on those two panels only (17px everywhere else).
  assert.ok(
    DS.includes('#quest-inner *:not(.modal-title):not(.modal-title *)'),
    'quest shell hammer excludes the header'
  );
  assert.ok(
    DS.includes('#settings-inner *:not(.modal-title):not(.modal-title *)'),
    'settings shell hammer excludes the header'
  );
});

test('wave 33 G: no panel re-declares the band locally', () => {
  // Every rule whose selector mentions a header class is scanned; none may
  // set the properties the canonical block owns (bar the token-normalising
  // rule itself and the deliberate sticky/flex layout roles).
  const OWNED = ['padding-top', 'padding-bottom', 'min-height'];
  const rules = DS.match(/^[^{}\n][^{}]*?(?:\.modal-title|\.management-title|\.poke-detail-title)[^{}]*\{[^}]*\}/gm) || [];
  assert.ok(rules.length > 3, 'header rules found to audit');
  for (const rule of rules) {
    const [selector, body] = [rule.slice(0, rule.indexOf('{')), rule.slice(rule.indexOf('{'))];
    // The canonical block is the one allowed to own them — it is the rule
    // that also names #fs-panel-header, i.e. the reference panel's band.
    if (selector.includes('#fs-panel-header')) continue;
    if (selector.includes('.pw-info-name') || selector.includes('.pw-text-sm')) continue;
    for (const prop of OWNED) {
      assert.ok(
        !new RegExp(`(^|[;{\\s])${prop}\\s*:`).test(body),
        `${selector.trim()} must not set ${prop} — the canonical header owns it`
      );
    }
  }
});

test('wave 33 I: generic button chrome cannot repaint the shared ✕', () => {
  // ROOT CAUSE of the last visible difference: `.modal-close` is a <span> in
  // the reference panels and a <button data-action> in réglages/quêtes/boîte
  // PC. Generic `button[data-action]` rules (two of them !important) gave the
  // button form a 12% background + 35% border + 10px radius, so the two forms
  // rendered differently even though every shared token matched.
  // comments stripped first: the explanatory note next to the canonical rule
  // quotes the selector and would otherwise be audited as if it were one.
  const bare = DS.replace(/\/\*[\s\S]*?\*\//g, '');
  const generic = bare.match(/^[^{}\n][^{}]*button\[data-action\][^{}]*\{[^}]*\}/gm) || [];
  assert.ok(generic.length >= 4, 'the generic button-chrome rules are still there to audit');
  let audited = 0;
  for (const rule of generic) {
    const selector = rule.slice(0, rule.indexOf('{'));
    // Only UNSCOPED `button[data-action]…` compound selectors are dangerous.
    // A selector further narrowed by another class (e.g.
    // `button[data-action].pw-loc-quest-btn`) can never match the ✕.
    const dangerous = selector.split(',').some((part) => {
      const t = part.trim();
      if (!t.startsWith('button[data-action]')) return false;
      const rest = t.slice('button[data-action]'.length);
      return !/(^|[^:])\.[a-z]/i.test(rest.replace(/:not\([^)]*\)/g, ''));
    });
    if (!dangerous) continue;
    audited += 1;
    assert.ok(
      selector.includes(':not(.modal-close)'),
      `this rule can repaint the shared close control — add :not(.modal-close):\n${selector.trim()}`
    );
  }
  assert.ok(audited >= 4, `expected the 4 generic button-chrome rules, audited ${audited}`);
});

/* ── 4. The measurement itself ──────────────────────────────────────── */
test('wave 33 H: every header family MEASURES identically in a browser', (t) => {
  // This is the check that would have caught the wave-32 miss. It needs a
  // real Chromium; without one we skip rather than pretend.
  const harness = path.join(ROOT, 'tests/harness/visual-wave33-headers.mjs');
  assert.ok(fs.existsSync(harness), 'the measurement harness ships with the repo');

  let out;
  try {
    out = execFileSync(process.execPath, [harness], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
    });
  } catch (err) {
    const text = `${err.stdout || ''}${err.stderr || ''}`;
    if (/Executable doesn't exist|browserType\.launch|shared libraries|ERR_MODULE_NOT_FOUND/.test(text)) {
      t.skip('no usable Chromium here — run: npx playwright install chromium');
      return;
    }
    throw new Error(`header measurement failed:\n${text}`);
  }
  assert.match(out, /Toutes les familles d'en-tête mesurent à l'identique/,
    `browser measurement reported a divergence:\n${out}`);
});
