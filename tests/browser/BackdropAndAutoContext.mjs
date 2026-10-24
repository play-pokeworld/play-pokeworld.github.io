/** @file BackdropAndAutoContext.mjs @brief Named exclusive relaunch controls and actual CSS flight geometry; prepared collection and cosmetic clock. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT ||
  path.resolve('artifacts/backdrop-auto-context');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.setDefaultTimeout(12000);
const results = [],
  issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type()))
    issues.push(m.type() + ': ' + m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url()}`);
});
await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of [
      'BattleSystem',
      'TrainingSystem',
      'HatcherySystem',
      'MineSystem',
      'SaveSystem',
      'RelaunchSystem',
      'DungeonAutoSystem',
    ])
      import('/src/systems/' + name + '.js').then((m) =>
        m[name].getInstance().setEnabled(false),
      );
  }),
);
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page
      .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
      .catch(() => {});
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    throw error;
  }
}
const controls = () =>
  page.locator('#win-battle [data-relaunch-scope="battle"]:visible');
async function location(id) {
  await page.evaluate(async (id) => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { LocationDB } = await import('/src/data/world/LocationDB.js');
    const { EventBus } = await import('/src/core/EventBus.js');
    const { LocationChangedEvent } = await import(
      '/src/core/events/LocationChangedEvent.js'
    );
    const s = SaveSystem.getInstance().getCurrentSave(),
      l = LocationDB.getInstance().getById(id);
    s.player.region = l.region;
    s.player.location = id;
    s.access.unlockLocation(id);
    EventBus.getInstance().dispatch(new LocationChangedEvent(l.region, id));
  }, id);
}
async function sample(now) {
  return page.evaluate(async (now) => {
    const view = globalThis.__backgroundView;
    globalThis.__cosmeticNow = now;
    view.onUpdate();
    for (const w of view._walkers) {
      w.root.getDomElement().getBoundingClientRect();
      for (const a of w.root.getDomElement().getAnimations()) {
        a.pause();
        a.currentTime = now - w.committedAt;
      }
    }
    await new Promise(requestAnimationFrame);
    return view._walkers.map((w) => {
      const e = w.root.getDomElement(),
        r = e.getBoundingClientRect(),
        f = w.flight;
      const visible =
        getComputedStyle(e).opacity !== '0' &&
        r.right > 0 &&
        r.bottom > 0 &&
        r.left < innerWidth &&
        r.top < innerHeight;
      const t = f
        ? Math.max(0, Math.min(1, (now - f.startAt) / f.duration))
        : 0;
      return {
        flight: f,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        expected: f
          ? {
              x: f.from.x + (f.to.x - f.from.x) * t,
              y: f.from.y + (f.to.y - f.from.y) * t,
            }
          : null,
        visible,
        source: w.image.getDomElement().getAttribute('src'),
        animation: e.getAnimations()[0]?.animationName,
      };
    });
  }, now);
}
function verifyPositions(entries) {
  for (const e of entries) {
    if (!e.flight) continue;
    assert.ok(Math.abs(e.rect.x - e.expected.x) < 1.2, JSON.stringify(e));
    assert.ok(Math.abs(e.rect.y - e.expected.y) < 1.2, JSON.stringify(e));
  }
  const visible = entries.filter((e) => e.visible && e.flight);
  for (let i = 0; i < visible.length; i++)
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i].rect,
        b = visible[j].rect;
      assert.ok(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
        'visible sprite rectangles must stay separated',
      );
    }
  return visible.length;
}
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { PokemonDB } = await import('/src/data/pokemon/PokemonDB.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { LocalizationManager } = await import(
      '/src/localization/LocalizationManager.js'
    );
    LocalizationManager.getInstance().setLanguage('fr');
    const s = SaveSystem.getInstance().createNewSave(
      'Backdrop context',
      'charmander',
    );
    s.tutorial.enabled = false;
    s.player.location = 'route1';
    s.player.earnBadge('brock');
    s.relaunch.wild = { purchased: true, enabled: true };
    s.relaunch.dungeon = { purchased: true, enabled: false, mode: 'farm' };
    for (const [p, i] of PokemonDB.getInstance()
      .getAll()
      .map((p, i) => [p, i]))
      s.pokedex.markCaught(p.id, i % 17 === 0, { deferSave: true });
    Engine.getInstance().getPageManager().openPage('game');
  });
  await check(
    'explorable route shows only the named Auto combat control, not its dungeon counterpart',
    async () => {
      assert.equal(await controls().count(), 1);
      assert.equal(await controls().getAttribute('data-relaunch-kind'), 'wild');
      assert.equal(
        await controls().getByRole('switch').innerText(),
        'AUTO COMBAT',
      );
      assert.equal(await controls().locator('button').count(), 1);
      await controls().screenshot({
        path: path.join(output, 'auto-combat-route.png'),
      });
    },
  );
  await check(
    'dungeon location replaces that control with named Auto donjon and preserves its disabled preference',
    async () => {
      await location('viridianforest');
      assert.equal(await controls().count(), 1);
      assert.equal(
        await controls().getAttribute('data-relaunch-kind'),
        'dungeon',
      );
      assert.equal(
        await controls().getByRole('switch').innerText(),
        'AUTO DONJON',
      );
      assert.equal(
        await controls().getByRole('switch').getAttribute('aria-checked'),
        'false',
      );
      await controls().screenshot({
        path: path.join(output, 'auto-donjon-location.png'),
      });
    },
  );
  await check(
    'towns show neither exploration nor dungeon Auto and travel never merges the two preferences',
    async () => {
      await location('pallet');
      assert.equal(await controls().count(), 0);
      await location('route1');
      assert.equal(await controls().count(), 1);
      assert.equal(
        await controls().getByRole('switch').getAttribute('aria-checked'),
        'true',
      );
    },
  );
  await check(
    'EN names remain distinct and the named switch fits a narrow 210px panel',
    async () => {
      await page.evaluate(async () => {
        (
          await import('/src/localization/LocalizationManager.js')
        ).LocalizationManager.getInstance().setLanguage('en');
      });
      const style = await page.addStyleTag({
        content:
          '#win-battle{width:210px!important;max-width:210px!important;}',
      });
      assert.equal(
        await controls().getByRole('switch').innerText(),
        'AUTO BATTLE',
      );
      await location('viridianforest');
      assert.equal(
        await controls().getByRole('switch').innerText(),
        'AUTO DUNGEON',
      );
      const g = await controls()
        .getByRole('switch')
        .evaluate((e) => {
          const b = e.closest('#win-battle').getBoundingClientRect(),
            r = e.getBoundingClientRect();
          return {
            left: r.left,
            right: r.right,
            panelLeft: b.left,
            panelRight: b.right,
            scroll: e.scrollWidth,
            width: e.clientWidth,
          };
        });
      assert.ok(
        g.left >= g.panelLeft &&
          g.right <= g.panelRight &&
          g.scroll <= g.width + 1,
      );
      await style.evaluate((e) => e.remove());
      await location('route1');
      return g;
    },
  );
  await check(
    'deterministic cosmetic fixture uses the real background view with a capped full-Dex pool',
    async () => {
      const facts = await page.evaluate(async () => {
        const { Engine } = await import('/src/core/Engine.js');
        const { PokemonBackgroundView } = await import(
          '/src/ui/PokemonBackgroundView.js'
        );
        const { SeededRandom } = await import('/src/core/SeededRandom.js');
        const v = Engine.getInstance()
          .getPageManager()
          .getCurrentPage()
          .getChildren()
          .find((c) => c instanceof PokemonBackgroundView);
        if (!v) throw Error('missing real background view');
        globalThis.__backgroundView = v;
        globalThis.__cosmeticNow = 0;
        v._random = new SeededRandom(35795);
        v._clock = () => globalThis.__cosmeticNow;
        v.refresh(true);
        globalThis.__backgroundNodes = v
          .getChildren()
          .map((c) => c.getDomElement());
        return {
          nodes: v.getChildren().length,
          caught: v._roster.length,
          pointer: getComputedStyle(v.getDomElement()).pointerEvents,
          aria: v.getDomElement().getAttribute('aria-hidden'),
        };
      });
      assert.equal(facts.nodes, 12);
      assert.equal(facts.caught, 386);
      assert.equal(facts.pointer, 'none');
      assert.equal(facts.aria, 'true');
      return facts;
    },
  );
  await check(
    'every actual CSS rectangle starts wholly outside the viewport, with no negative initial phase',
    async () => {
      const entries = await sample(0);
      for (const e of entries.filter((e) => e.flight)) {
        const r = e.rect;
        assert.ok(
          r.x + r.width < 0 || r.y + r.height < 0 || r.x > 1360 || r.y > 900,
        );
        assert.ok(e.flight.startAt >= 0);
        assert.match(e.animation, /pw-background-flight-/);
      }
      return { scheduled: entries.filter((e) => e.flight).length };
    },
  );
  await check(
    'planned entries spread over four borders and use many slopes rather than four diagonal lanes',
    async () => {
      const entries = await sample(0),
        flights = entries.map((e) => e.flight).filter(Boolean),
        edges = new Set(flights.map((f) => f.fromEdge)),
        angles = new Set(
          flights.map((f) =>
            Math.round(
              (Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x) * 180) /
                Math.PI,
            ),
          ),
        );
      assert.equal(edges.size, 4);
      assert.ok(angles.size >= 8);
      return { edges: [...edges], angles: [...angles] };
    },
  );
  let isolated;
  await check(
    'real CSS positions match their reservations and do not overlap at successive synchronized times',
    async () => {
      isolated = await page.addStyleTag({
        content:
          '#header,#main-dashboard,.mobile-nav-bar,.mobile-subnav-bar,#msg-log{opacity:0!important;pointer-events:none!important;}',
      });
      const samples = [];
      for (const now of [8000, 18000, 28000, 38000]) {
        const entries = await sample(now),
          visible = verifyPositions(entries);
        samples.push({ now, visible });
        if (now === 18000 || now === 38000)
          await page.screenshot({
            path: path.join(output, `background-isolated-${now}.png`),
          });
      }
      assert.ok(samples.some((s) => s.visible >= 4));
      return samples;
    },
  );
  await check(
    'scrolling the document does not shift or bend the viewport-fixed decorative layer',
    async () => {
      const before = await sample(38000);
      await page.evaluate(() => scrollTo(0, 400));
      const after = await sample(38000);
      assert.deepEqual(
        after.map((e) => e.rect),
        before.map((e) => e.rect),
      );
    },
  );
  await check(
    'completed journeys recycle the same DOM pool and generate new offscreen itineraries',
    async () => {
      const before = (await sample(38000)).map((e) => e.flight);
      const after = await sample(140000);
      verifyPositions(after);
      assert.ok(
        after.some(
          (e, i) => e.flight && e.flight.startAt !== before[i]?.startAt,
        ),
      );
      assert.ok(
        await page.evaluate(() =>
          globalThis.__backgroundView
            .getChildren()
            .every(
              (c, i) => c.getDomElement() === globalThis.__backgroundNodes[i],
            ),
        ),
      );
    },
  );
  await check(
    'mobile resize replans outside the new screen and reduces density instead of crowding it',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () => globalThis.__backgroundView._viewport.width === 390,
      );
      const entries = await sample(140000);
      assert.equal(entries.length, 3);
      for (const e of entries.filter((e) => e.flight)) {
        const r = e.rect;
        assert.ok(
          r.x + r.width < 0 || r.y + r.height < 0 || r.x > 390 || r.y > 844,
        );
      }
      verifyPositions(await sample(158000));
      await page.screenshot({
        path: path.join(output, 'background-mobile-390.png'),
      });
    },
  );
  await check(
    'reduced-motion preference stops all flights and the renderer restarts only from outside',
    async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() =>
        globalThis.__backgroundView._walkers.every((w) => !w.flight),
      );
      assert.equal(
        await page.locator('#pw-background-pokemon-layer').isVisible(),
        false,
      );
      await sample(220000);
      assert.ok(
        await page.evaluate(() =>
          globalThis.__backgroundView._walkers.every((w) => !w.flight),
        ),
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() =>
        globalThis.__backgroundView._walkers.some((w) => w.flight),
      );
      const entries = await sample(220000);
      for (const e of entries.filter((e) => e.flight))
        assert.ok(
          e.rect.x + e.rect.width < 0 ||
            e.rect.y + e.rect.height < 0 ||
            e.rect.x > 390 ||
            e.rect.y > 844,
        );
    },
  );
  await check(
    'cosmetic work never advances a prepared battle RNG or writes gameplay state',
    async () => {
      await isolated.evaluate((e) => e.remove());
      await page.setViewportSize({ width: 1360, height: 900 });
      await page.evaluate(async () => {
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const b = BattleSystem.getInstance();
        if (!b.startBattle('route1')) throw Error('real battle required');
        globalThis.__battleBeforeBackdrop = JSON.stringify(
          b._session.captureState(),
        );
        const s = SaveSystem.getInstance(),
          old = s.saveCurrent.bind(s);
        globalThis.__decorWrites = 0;
        s.saveCurrent = (...args) => {
          globalThis.__decorWrites++;
          return old(...args);
        };
      });
      for (const now of [230000, 250000, 280000]) await sample(now);
      const facts = await page.evaluate(async () => {
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        return {
          same:
            JSON.stringify(
              BattleSystem.getInstance()._session.captureState(),
            ) === globalThis.__battleBeforeBackdrop,
          writes: globalThis.__decorWrites,
        };
      });
      assert.equal(facts.same, true);
      assert.equal(facts.writes, 0);
      return facts;
    },
  );
  await check(
    'all decorative sources are valid and the complete run has no unexpected browser diagnostic',
    async () => {
      await page.waitForFunction(() =>
        [
          ...document.querySelectorAll('#pw-background-pokemon-layer img[src]'),
        ].every((i) => i.complete && i.naturalWidth > 0),
      );
      assert.deepEqual(issues, []);
      return { issues };
    },
  );
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        browserVersion: browser.version(),
        fixture:
          'Full caught Dex and both owned modules are explicitly prepared. CSS animations use a synchronized cosmetic clock for reproducible geometric samples; foreground is hidden only in isolated backdrop evidence. Gameplay clocks are paused for state comparisons, not commands.',
        results,
        issues,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
