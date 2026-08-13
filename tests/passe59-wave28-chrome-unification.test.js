/**
 * Wave 28 — 7th user pass.
 *
 * Three regressions the user reported, each guarded by the ROOT CAUSE and
 * not by the incidental spelling of the fix:
 *
 *   1. Kanto story quest 26 must say WHERE the wild Pokémon are (Route 10).
 *   2. Dashboard windows must all clip their header to the rounded corner.
 *   3. Panel headers must be the sac/marché/guide header everywhere.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ───────────────────────────── 1. quest 26 ─────────────────────────────
test('wave 28 A: story quest 26 names Route 10 as the hunting ground', () => {
  // story-quests.js is a module (data array + helpers), so slice out the one
  // object literal instead of JSON.parse-ing the whole file.
  const src = R('src/data/story-quests.js');
  const block = src.slice(src.indexOf('"id": 26,'));
  const q26 = JSON.parse('{' + block.slice(0, block.indexOf('\n },')) + '}');
  assert.equal(q26.id, 26);
  assert.equal(q26.type, 'defeat_wild');
  // The objective is counted on route10 ONLY (no `group` links route9 to it),
  // so the text must not let the player farm route 9 by mistake.
  assert.equal(q26.loc, 'route10');
  assert.equal(q26.target, 40);

  for (const [lang, needle] of [['fr', 'Route 10'], ['en', 'Route 10']]) {
    const desc = R(`src/localization/${lang}/quests.js`)
      .match(/"26":\s*\{[\s\S]*?\}/)[0];
    assert.ok(desc.includes(needle), `${lang}: quest 26 names Route 10`);
    // Route 9 must be named as the way there, so the player knows the order.
    assert.ok(
      /(Route 9)/.test(desc),
      `${lang}: quest 26 situates Route 10 after Route 9`
    );
    // The KO objective must be explicitly attached to Route 10 — that is the
    // only place wins are counted. Phrasing is free (it must stay in-world),
    // but the number and the route have to travel together in one sentence.
    const koSentence = desc
      .split(/(?<=\.)\s+/)
      .find((s) => /40/.test(s));
    assert.ok(koSentence, `${lang}: quest 26 states the 40 KO target`);
    assert.ok(
      /Route 10/.test(koSentence),
      `${lang}: the 40 KO objective is tied to Route 10 in the same sentence`
    );
    // Immersion guard: no bracketed rules-lawyer aside.
    assert.ok(
      !/(Attention\s*:|Careful:)/.test(desc),
      `${lang}: quest 26 stays in-world (no out-of-fiction warning)`
    );
  }
});

// ─────────────────────── 2. dashboard window corners ───────────────────
test('wave 28 B: every dashboard window clips its header to the rounded corner', () => {
  const html = R('index.html');
  const css = R('src/assets/styles/design-system.css');

  const wins = [...html.matchAll(/<div id="(win-[\w-]+)" class="dash-win ([\w-]+)"/g)];
  assert.ok(wins.length >= 8, 'found the dashboard windows');

  // ROOT CAUSE GUARD: the generated `.pw-static-0XX` classes have the same
  // specificity as `.dash-win` but are emitted later, so an `overflow:visible`
  // there silently un-rounds the window. None of them may say that again.
  for (const [, winId, cls] of wins) {
    const rule = css.match(new RegExp('\\.' + cls + '\\{([^}]*)\\}'));
    assert.ok(rule, `${cls} exists in the stylesheet`);
    const overflow = (rule[1].match(/overflow:\s*([\w-]+)/) || [])[1];
    assert.notEqual(
      overflow, 'visible',
      `${winId} (${cls}) must not re-open overflow — that squares the header corners`
    );
  }

  // And the shared contract is re-asserted after the generated block.
  const guardIdx = css.indexOf('.dash-win { overflow: hidden; }');
  assert.ok(guardIdx > css.indexOf('.pw-static-021{'), 'the guard is emitted AFTER the generated classes');
  assert.ok(
    /\.dash-win\s*>\s*\.pw-win-hdr:first-child\s*\{[^}]*border-top-left-radius:\s*inherit/.test(css),
    'the window header inherits the parent rounding'
  );
});

// ─────────────────────────── 3. panel headers ──────────────────────────
test('wave 28 C: .modal-title is no longer pinned to the legacy header geometry', () => {
  const css = R('src/assets/styles/design-system.css');

  // ROOT CAUSE: the early !important block forced `padding:12px 16px` on
  // `.modal-title` but not on `.pw-modal-header`, so the canonical rule
  // (no !important) could only ever win on the reference panels.
  const legacyBlock = css.match(
    /\.pw-panel-header, \.pw-ui-window-header[^{]*\{[^}]*padding:\s*12px 16px\s*!important/
  );
  assert.ok(legacyBlock, 'the legacy header block still exists for its other selectors');
  assert.ok(
    !/\.modal-title,\s*\.pw-panel-header, \.pw-ui-window-header/.test(css),
    '.modal-title must NOT be part of the legacy !important header block'
  );

  // The canonical rule still covers both families -> one header for all.
  const canonical = css.match(
    /\.modal-title,\s*\n\.pw-modal-header,\s*\n#fs-panel-header,[\s\S]*?\}/
  );
  assert.ok(canonical, 'canonical header rule lists .modal-title AND .pw-modal-header');
  // Wave 33: the literals became shared tokens so no panel can re-declare
  // them locally without being caught by the computed-style test.
  assert.ok(/padding:\s*var\(--pw-header-pad\)/.test(canonical[0]), 'canonical padding token');
  assert.ok(/min-height:\s*var\(--pw-header-h\)/.test(canonical[0]), 'canonical height');
  assert.ok(/--pw-header-pad:\s*0 8px 0 14px/.test(css), 'the padding token still resolves to the reference value');
});

test('wave 28 D: the settings header spans the full panel width', () => {
  const css = R('src/assets/styles/design-system.css');

  // The shell used to carry `padding: 20px`, insetting its header by 20px on
  // each side while every other panel had a full-bleed header band.
  assert.ok(/#settings-inner\s*\{[^}]*padding:\s*0;/.test(css), 'shell padding removed');
  assert.ok(
    /#settings-inner\s*>\s*#settings-body\s*\{[^}]*padding:\s*16px 20px 20px/.test(css),
    'the inset moved onto the scrolling body'
  );
  // The old negative-margin bleed that compensated the padding must be gone,
  // otherwise the header would now hang outside the panel.
  assert.ok(
    !/#settings-inner\s*>\s*\.modal-title\s*\{[^}]*margin:\s*-18px/.test(css),
    'the -18px bleed hack is retired'
  );
  assert.ok(
    /#settings-inner\s*>\s*\.modal-title\s*\{[^}]*width:\s*100%/.test(css),
    'header spans the full width'
  );
});

test('wave 28 E: the PC box header defers to the canonical header', () => {
  const css = R('src/assets/styles/design-system.css');

  // The box PC header used to hardcode its own padding / border / background
  // (a near-copy of the reference that drifted: 1px border vs 2px, no
  // min-height, 15px close glyph vs the shared one).
  const boxHdr = css.match(/\.pw-static-054\{([^}]*)\}/);
  assert.ok(boxHdr, '.pw-static-054 exists');
  for (const prop of ['padding', 'border-bottom', 'background']) {
    assert.ok(
      !new RegExp(prop + ':').test(boxHdr[1]),
      `.pw-static-054 must not redeclare ${prop} — the canonical header owns it`
    );
  }
  const boxClose = css.match(/\.pw-static-055\{([^}]*)\}/);
  assert.ok(boxClose, '.pw-static-055 exists');
  assert.ok(
    !/font-size:/.test(boxClose[1]),
    'the box close glyph must inherit the shared .modal-close sizing'
  );
});
