import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
await page.evaluate(() => { G.badges = ['brock','misty','surge','erika']; G.location = 'diglettscave'; try { unlockLocation('diglettscave'); } catch (_) {} updateFeatureWindows(); renderMineWindow(); });
await page.waitForTimeout(300);
const r = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('#win-mine .mine-tool-btn'));
  const out = btns.map((b) => { const cs = getComputedStyle(b); return { cls: b.className, pressed: b.getAttribute('aria-pressed'), disabled: b.disabled, bg: cs.backgroundColor, color: cs.color, opacity: cs.opacity, filter: cs.filter, border: cs.borderColor }; });
  const rules = [];
  for (const ss of document.styleSheets) { let list; try { list = ss.cssRules; } catch (_) { continue; } for (const r of list) { if (r.selectorText && /mine-tool-btn/.test(r.selectorText) && /background/.test(r.cssText)) rules.push(r.cssText.slice(0, 220)); } }
  const hb = []; for (const ss of document.styleSheets) { let list; try { list = ss.cssRules; } catch (_) { continue; } for (const r of list) { if (r.selectorText && /\.hbtn/.test(r.selectorText) && /background[^;]*important/.test(r.cssText) && /pw-chip-group|dash-win|#win-mine|\.active|aria-pressed/.test(r.selectorText)) hb.push(r.cssText.slice(0, 200)); } }
  const el = btns[0];
  const matched = [];
  for (const ss of document.styleSheets) { let list; try { list = ss.cssRules; } catch (_) { continue; } for (const r of list) { if (!r.selectorText) continue; let m = false; try { m = el.matches(r.selectorText); } catch (_) {} if (m && /background(-color)?\s*:/.test(r.style.cssText)) matched.push({ sel: r.selectorText.slice(0, 120), bg: r.style.getPropertyValue('background-color') || r.style.getPropertyValue('background'), imp: r.style.getPropertyPriority('background-color') || r.style.getPropertyPriority('background') }); } }
  return { out, matchedTail: matched.slice(-12), matchedCount: matched.length };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
