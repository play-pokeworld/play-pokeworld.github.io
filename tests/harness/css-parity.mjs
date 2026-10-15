// css-parity.mjs — V7 · P2 (DBT-06) visual-cascade parity check between two served builds.
//
// Why: `tools/cascade-check.mjs` / the retired `css-reduce` simulator reason about the
// stylesheet text only. The browser is the only oracle for "this !important can go":
// during P2 the simulated reduction of the `#battle-team-row` zone passed every textual
// check and still changed paddings/borders in the real battle window. This harness
// compares the COMPUTED styles of a reference build and a candidate build, element by
// element, on the dashboard (1280 px and 700 px) and inside the battle team row.
//
// MANUAL RUN (two served builds, e.g. the previous delivered zip and the working tree):
//   (cd /path/to/reference && npm run build && npx vite preview --port 4176 &)
//   npm run build && npx vite preview --port 4174 &
//   PWK_REF_URL=http://localhost:4176/ PWK_BASE_URL=http://localhost:4174/ node tests/harness/css-parity.mjs
//
// Exit code 1 when a cascade difference is found. Dynamic values are ignored:
// sizes (width/height/margin — depend on texts and random encounters), asset URLs
// are compared without their origin, animated opacities are rounded.

import { chromium } from 'playwright';

const REF_URL = process.env.PWK_REF_URL || 'http://localhost:4176/';
const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4174/';
const WIDTHS = [1280, 700];
const PROPS = ['display', 'position', 'flexDirection', 'gap', 'padding', 'border', 'borderRadius', 'backgroundColor',
  'backgroundImage', 'color', 'fontSize', 'fontWeight', 'lineHeight', 'opacity', 'boxShadow', 'overflow',
  'gridTemplateColumns', 'alignItems', 'justifyContent', 'textAlign', 'visibility', 'zIndex', 'minHeight', 'maxWidth',
  'letterSpacing', 'textTransform']; // no `transform`/exact opacity: animated values are never stable

const normalize = (v) => String(v).replace(/https?:\/\/[^/"')]+/g, '').replace(/(\d+\.\d)\d+/g, '$1');

async function bootNewGame(page, base) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); if (b) b.click(); });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
}

async function snapshot(page, PROPS) {
  return page.evaluate((PROPS) => {
    const path = (el) => {
      const parts = []; let e = el;
      while (e && e !== document.body && parts.length < 6) {
        let s = e.tagName.toLowerCase();
        if (e.id) s += '#' + e.id;
        else if (e.classList.length) s += '.' + Array.from(e.classList).filter((c) => !/^(is-|has-|pw-anim|active|open|fainted|charging|visual-)/.test(c)).slice(0, 3).join('.');
        parts.unshift(s); e = e.parentElement;
      }
      return parts.join('>');
    };
    const out = {};
    const els = Array.from(document.querySelectorAll('body *')).filter((e) => !e.closest('canvas') && !e.closest('#map-canvas-wrap'));
    for (const el of els.slice(0, 6000)) {
      const key = path(el);
      if (out[key]) continue; // first occurrence per path
      const cs = getComputedStyle(el);
      const o = {}; for (const p of PROPS) o[p] = cs[p];
      out[key] = o;
    }
    return out;
  }, PROPS);
}

async function startDeterministicBattle(page) {
  await page.evaluate(() => {
    const a = window.createPoke(25, 40); const b = window.createPoke(1, 30); const c = window.createPoke(4, 30);
    b.currentHP = 0; c.status = 'psn'; c.currentHP = Math.floor(c.maxHP / 3);
    window.G.team = [a, b, c]; window.G.location = 'route1';
    window.startWildBattle();
  });
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch();
let totalDiffs = 0;
for (const w of WIDTHS) {
  const snaps = {};
  for (const [tag, base] of [['ref', REF_URL], ['new', BASE_URL]]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await bootNewGame(page, base);
    const dash = await snapshot(page, PROPS);
    await startDeterministicBattle(page);
    const battle = await snapshot(page, PROPS);
    snaps[tag] = { dash, battle };
    await page.close();
  }
  for (const scene of ['dash', 'battle']) {
    const a = snaps.ref[scene], b = snaps.new[scene];
    const keys = Object.keys(a).filter((k) => b[k]);
    const lines = [];
    for (const k of keys) {
      const d = PROPS.filter((p) => p !== 'opacity' && normalize(a[k][p]) !== normalize(b[k][p]));
      if (d.length) lines.push(`${k} :: ${d.map((p) => `${p}: ${a[k][p]} → ${b[k][p]}`).join(' | ')}`);
    }
    totalDiffs += lines.length;
    console.log(`@${w}px ${scene === 'dash' ? 'dashboard' : 'battle window'} — ${keys.length} element paths compared, ${lines.length} cascade difference(s)`);
    lines.slice(0, 30).forEach((l) => console.log('   ' + l.slice(0, 240)));
  }
}
await browser.close();
if (totalDiffs) { console.error(`css-parity: ${totalDiffs} difference(s) — the cascade changed.`); process.exit(1); }
console.log('css-parity: OK — identical computed cascade on the dashboard and the battle window (1280 px and 700 px).');
