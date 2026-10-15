import { chromium } from 'playwright';
import fs from 'node:fs';
const targets = [['p1', 'http://localhost:4176/'], ['p2', 'http://localhost:4174/']];
const widths = [1280, 700];
const PROPS = ['display','position','flexDirection','gap','padding','border','borderRadius','backgroundColor','backgroundImage','color','fontSize','fontWeight','lineHeight','opacity','boxShadow','overflow','gridTemplateColumns','alignItems','justifyContent','textAlign','visibility','zIndex','minHeight','maxWidth','letterSpacing','textTransform','transform'];
const browser = await chromium.launch();
const results = {};
for (const w of widths) {
  for (const [tag, base] of targets) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
    await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
    await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
    await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); if (b) b.click(); });
    await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate((PROPS) => {
      const path = (el) => { const parts = []; let e = el; while (e && e !== document.body && parts.length < 6) { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; else if (e.classList.length) s += '.' + Array.from(e.classList).filter((c) => !/^(is-|has-|pw-anim|active|open)/.test(c)).slice(0, 3).join('.'); parts.unshift(s); e = e.parentElement; } return parts.join('>'); };
      const out = {};
      const els = Array.from(document.querySelectorAll('body *')).filter((e) => !e.closest('#battle-team-row') && !e.closest('canvas') && !e.closest('#map-canvas-wrap'));
      for (const el of els.slice(0, 4000)) {
        const cs = getComputedStyle(el);
        const key = path(el);
        if (out[key]) continue; // first occurrence per path
        const o = {}; for (const p of PROPS) o[p] = cs[p];
        out[key] = o;
      }
      return out;
    }, PROPS);
    results[`${tag}@${w}`] = data;
    await page.close();
  }
}
await browser.close();
fs.writeFileSync('tests/_dbg/dashboard-compare.json', JSON.stringify(results));
for (const w of widths) {
  const a = results[`p1@${w}`], b = results[`p2@${w}`];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let diffs = 0, missing = 0; const lines = [];
  for (const k of keys) {
    if (!a[k] || !b[k]) { missing++; continue; }
    const d = Object.keys(a[k]).filter((p) => a[k][p] !== b[k][p]);
    if (d.length) { diffs++; if (lines.length < 25) lines.push(`${k} :: ${d.map((p) => `${p}: ${a[k][p]} → ${b[k][p]}`).join(' | ')}`); }
  }
  console.log(`@${w}px — paths compared: ${keys.size - missing}, differing: ${diffs}, only-in-one-side: ${missing}`);
  lines.forEach((l) => console.log('   ' + l.slice(0, 260)));
}
