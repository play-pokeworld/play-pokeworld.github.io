import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.waitForTimeout(500);
console.log(await page.evaluate(() => { const b = document.querySelector('.pw-discord-btn'); if (!b) return 'no btn'; const cs = getComputedStyle(b); return { bg: cs.backgroundColor, border: cs.borderColor, href: b.getAttribute('href') }; }));
await browser.close();
