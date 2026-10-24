/** @file BackdropAndContext.test.js @brief Exclusive named Auto controls and bounded decorative flight geometry. */
import fs from 'node:fs';
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { LocationKinds } from '../src/data/world/LocationKinds.js';
import { LocationActivityKinds } from '../src/config/LocationActivityKinds.js';
import { LocationActivityRules } from '../src/data/world/LocationActivityRules.js';
import { RelaunchRules } from '../src/config/RelaunchRules.js';
import { RelaunchSystem } from '../src/systems/RelaunchSystem.js';
import { RelaunchControls } from '../src/panels/components/RelaunchControls.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { PokemonBackgroundRules as R } from '../src/config/PokemonBackgroundRules.js';
import { PokemonFlightRules as F } from '../src/ui/background/PokemonFlightRules.js';
import { PokemonBackgroundView } from '../src/ui/PokemonBackgroundView.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { Random } from '../src/core/Random.js';
import {
  LocalizationManager,
  t,
} from '../src/localization/LocalizationManager.js';
const saves = SaveSystem.getInstance();
const desktop = { width: 1560, height: 1120 },
  mobile = { width: 390, height: 844 };
function offscreen(point, size, viewport) {
  return (
    point.x + size < 0 ||
    point.y + size < 0 ||
    point.x > viewport.width ||
    point.y > viewport.height
  );
}
function fixture() {
  TrainingSystem.getInstance().onDestroy();
  if (BattleSystem.getInstance().isActive())
    BattleSystem.getInstance().endBattle(false);
  const save = SaveData.createNew('Background and context', 'charmander');
  save.tutorial.enabled = false;
  save.player.location = 'route1';
  saves.setCurrentSave(save);
  return save;
}
function withView(action, { reduced = false } = {}) {
  const previous = saves.getCurrentSave(),
    oldMedia = window.matchMedia;
  let now = 0,
    viewport = { ...desktop };
  const media = {
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  };
  window.matchMedia = () => media;
  const save = fixture();
  const view = new PokemonBackgroundView({
    random: new SeededRandom(35795),
    clock: () => now,
    viewport: () => viewport,
  });
  try {
    action({
      view,
      save,
      media,
      setTime: (t) => {
        now = t;
        view.onUpdate();
      },
      resize: (v) => {
        viewport = v;
        view.refresh(true);
      },
    });
  } finally {
    view.destroy();
    saves.setCurrentSave(previous);
    window.matchMedia = oldMedia;
  }
}
const flight = (from, to, startAt = 0, size = 60, duration = 10000) => ({
  from,
  to,
  startAt,
  endAt: startAt + duration,
  size,
  duration,
});

describe('Named and exclusive location Auto context', (test) => {
  test('a dungeon takes the exclusive dungeon branch even with wild encounter rows', () => {
    assert.equal(
      LocationActivityRules.forLocation(
        { kind: LocationKinds.DUNGEON },
        7,
        true,
      ),
      LocationActivityKinds.DUNGEON,
    );
  });
  test('a dungeon without ordinary wild rows still has its own control context', () => {
    assert.equal(
      LocationActivityRules.forLocation(
        { kind: LocationKinds.DUNGEON },
        0,
        false,
      ),
      LocationActivityKinds.DUNGEON,
    );
  });
  test('routes and seas expose exploration, but towns do not gain a fake Auto battle action', () => {
    for (const kind of [LocationKinds.ROUTE, LocationKinds.SEA])
      assert.equal(
        LocationActivityRules.forLocation({ kind }, 1, false),
        LocationActivityKinds.WILD,
      );
    assert.equal(
      LocationActivityRules.forLocation({ kind: LocationKinds.TOWN }, 4, true),
      null,
    );
  });
  test('a roaming-only outdoor location follows the same exploration rule as its action tile', () => {
    assert.equal(
      LocationActivityRules.forLocation({ kind: LocationKinds.ROUTE }, 0, true),
      LocationActivityKinds.WILD,
    );
    assert.equal(
      LocationActivityRules.forLocation(
        { kind: LocationKinds.ROUTE },
        0,
        false,
      ),
      null,
    );
  });
  test('missing locations have no context and the two activity identifiers cannot be equal', () => {
    assert.equal(LocationActivityRules.forLocation(null, 9, true), null);
    assert.ok(LocationActivityKinds.WILD !== LocationActivityKinds.DUNGEON);
  });
  test('every production location resolves to at most one activity', () => {
    for (const l of LocationDB.getInstance().getAll()) {
      const activity = LocationActivityRules.forLocation(
        l,
        LocationDB.getInstance().getEncounters(l.id).length,
        false,
      );
      assert.ok(
        [
          null,
          LocationActivityKinds.WILD,
          LocationActivityKinds.DUNGEON,
        ].includes(activity),
      );
      if (l.kind === LocationKinds.DUNGEON)
        assert.equal(activity, LocationActivityKinds.DUNGEON);
    }
  });
  test('both owned preferences remain independent when travelling between route and dungeon', () => {
    const previous = saves.getCurrentSave(),
      save = fixture();
    try {
      save.relaunch.wild = { purchased: true, enabled: true };
      save.relaunch.dungeon = { purchased: true, enabled: false, mode: 'boss' };
      const before = JSON.stringify(save.relaunch.serialize());
      for (const [location, kind] of [
        ['route1', 'wild'],
        ['viridianforest', 'dungeon'],
        ['route1', 'wild'],
      ]) {
        save.player.location = location;
        const a = RelaunchSystem.getInstance().getSnapshot('wild'),
          b = RelaunchSystem.getInstance().getSnapshot('dungeon');
        assert.equal(Number(a.visible) + Number(b.visible), 1);
        assert.equal((kind === 'wild' ? a : b).visible, true);
      }
      assert.equal(JSON.stringify(save.relaunch.serialize()), before);
    } finally {
      saves.setCurrentSave(previous);
    }
  });
  test('FR and EN name each switch on and off without adding a second title or paragraph', () => {
    const previous = saves.getCurrentSave(),
      save = fixture(),
      locale = LocalizationManager.getInstance(),
      old = locale.currentLang;
    save.relaunch.wild = { purchased: true, enabled: true };
    save.relaunch.dungeon = { purchased: true, enabled: false, mode: 'farm' };
    const controls = [
      new RelaunchControls('wild', 'named-unit'),
      new RelaunchControls('dungeon', 'named-unit'),
    ];
    try {
      for (const language of ['fr', 'en']) {
        locale.setLanguage(language);
        for (const [index, kind] of ['wild', 'dungeon'].entries()) {
          const view = controls[index],
            node = view._switch.getDomElement();
          view.refresh();
          assert.equal(
            node.textContent,
            t(RelaunchRules.UPGRADES[kind].toggleLabelKey),
          );
          assert.equal(view.getChildren().length, 1);
          assert.equal(
            node.getAttribute('aria-label'),
            t(RelaunchRules.UPGRADES[kind].labelKey),
          );
        }
      }
    } finally {
      for (const v of controls) v.destroy();
      locale.setLanguage(old);
      saves.setCurrentSave(previous);
    }
  });
});

describe('Offscreen randomized flight rules', (test) => {
  test('captured collection density is bounded instead of growing to forty-three simultaneous sprites', () => {
    assert.equal(F.count(0, desktop), 0);
    assert.equal(F.count(1, desktop), 5);
    assert.equal(F.count(10, desktop), 6);
    assert.equal(F.count(386, desktop), 12);
    assert.equal(F.count(386, mobile), 3);
    assert.equal(F.count(386, { width: 0, height: 0 }), 0);
  });
  test('invalid or hidden viewport dimensions do not produce NaN trajectories', () => {
    for (const viewport of [
      { width: 0, height: 900 },
      { width: 400, height: 0 },
      { width: Infinity, height: 900 },
      { width: -5, height: 900 },
    ])
      assert.equal(F.plan(new SeededRandom(5), viewport, [], 0), null);
  });
  for (const [name, viewport] of [
    ['desktop', desktop],
    ['mobile', mobile],
    ['small mobile', { width: 320, height: 640 }],
  ])
    test(`${name}: every generated rectangle begins and ends entirely outside the viewport`, () => {
      const random = new SeededRandom(9417);
      for (let n = 0; n < 100; n++) {
        const f = F.plan(random, viewport, [], n * 1000);
        assert.ok(f);
        assert.ok(offscreen(f.from, f.size, viewport));
        assert.ok(offscreen(f.to, f.size, viewport));
        assert.ok(f.fromEdge !== f.toEdge);
        assert.ok(
          f.duration >= R.MIN_DURATION_MS && f.duration <= R.MAX_DURATION_MS,
        );
      }
    });
  test('deterministic sampling covers all four entrances and many directions rather than four diagonals', () => {
    const random = new SeededRandom(35795),
      edges = new Set(),
      directions = new Set(),
      positions = new Set();
    for (let n = 0; n < 120; n++) {
      const f = F.plan(random, desktop, [], n * 1000);
      assert.ok(f);
      edges.add(f.fromEdge);
      directions.add(
        Math.round(
          (Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x) * 180) / Math.PI,
        ),
      );
      positions.add(`${f.from.x}:${f.from.y}`);
    }
    assert.equal(edges.size, 4);
    assert.ok(directions.size > 40);
    assert.ok(positions.size > 100);
  });
  test('horizontal and vertical travel are possible, not only corner-to-corner motion', () => {
    const random = new SeededRandom(4128);
    let horizontal = false,
      vertical = false;
    for (let n = 0; n < 160; n++) {
      const f = F.plan(random, desktop, [], 0);
      const angle = Math.abs(Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x));
      horizontal ||= angle < 0.2 || angle > Math.PI - 0.2;
      vertical ||= Math.abs(angle - Math.PI / 2) < 0.2;
    }
    assert.ok(horizontal && vertical);
  });
  test('same-place same-time intersections are rejected analytically', () => {
    assert.equal(
      F.clears(
        flight({ x: 0, y: 200 }, { x: 800, y: 200 }),
        flight({ x: 400, y: -200 }, { x: 400, y: 600 }),
      ),
      false,
    );
  });
  test('parallel lanes with enough spacing do not unnecessarily block one another', () => {
    assert.equal(
      F.clears(
        flight({ x: 0, y: 0 }, { x: 800, y: 0 }),
        flight({ x: 0, y: 200 }, { x: 800, y: 200 }),
      ),
      true,
    );
  });
  test('geometrically crossing paths at separate times remain valid', () => {
    assert.equal(
      F.clears(
        flight({ x: 0, y: 200 }, { x: 800, y: 200 }, 0),
        flight({ x: 400, y: -200 }, { x: 400, y: 600 }, 20000),
      ),
      true,
    );
  });
  test('peer reservations retain clearance throughout a dense prepared sequence', () => {
    const random = new SeededRandom(34127);
    let peers = [],
      accepted = 0;
    for (let i = 0; i < 180; i++) {
      const now = i * 1900;
      peers = peers.filter((p) => p.endAt > now);
      const f = F.plan(random, desktop, peers, now);
      if (!f) continue;
      assert.ok(peers.every((p) => F.clears(f, p)));
      for (const p of peers) {
        const start = Math.max(f.startAt, p.startAt),
          end = Math.min(f.endAt, p.endAt);
        for (let j = 0; j <= 30 && start < end; j++) {
          const t = start + ((end - start) * j) / 30,
            a = F.position(f, t),
            b = F.position(p, t);
          assert.ok(
            Math.hypot(
              a.x + f.size / 2 - b.x - p.size / 2,
              a.y + f.size / 2 - b.y - p.size / 2,
            ) >=
              (f.size + p.size) * Math.SQRT1_2 + R.SEPARATION - 0.01,
          );
        }
      }
      peers.push(f);
      accepted++;
      if (peers.length > R.MAX_WALKERS) peers.shift();
    }
    assert.ok(accepted > 100);
  });
  test('an unhelpful constant random stream exits after bounded attempts instead of forcing an overlap', () => {
    let calls = 0;
    const random = {
      int: (min) => (calls++, min),
      pick: (xs) => (calls++, xs[0]),
      next: () => (calls++, 0),
    };
    assert.equal(F.plan(random, desktop, [], 0), null);
    assert.ok(calls <= R.MAX_ATTEMPTS * 9);
  });
  test('flight positions interpolate in time and clamp outside their lifetime', () => {
    const f = flight({ x: -80, y: 40 }, { x: 920, y: 540 }, 1000);
    assert.deepEqual(F.position(f, 0), f.from);
    assert.deepEqual(F.position(f, 6000), { x: 420, y: 290 });
    assert.deepEqual(F.position(f, 30000), f.to);
  });
});

describe('Decorative view lifecycle and isolation', (test) => {
  test('startup delays are nonnegative and no flight is prefixed at an in-screen negative phase', () =>
    withView(({ view }) => {
      assert.equal(view._walkers.length, 5);
      for (const w of view._walkers)
        if (w.flight) {
          assert.ok(w.flight.startAt >= w.committedAt);
          assert.ok(offscreen(w.flight.from, w.flight.size, desktop));
          assert.ok(!w.root.getDomElement().className.includes('--phase-'));
        }
    }));
  test('ordinary Dex additions retain active walker objects and add only the needed slot', () =>
    withView(({ view, save }) => {
      const nodes = view.getChildren().map((n) => n.getDomElement());
      for (const species of [
        'bulbasaur',
        'squirtle',
        'pidgey',
        'rattata',
        'caterpie',
        'weedle',
        'pikachu',
        'geodude',
        'abra',
      ])
        save.pokedex.markCaught(species, false, { deferSave: true });
      assert.equal(view.getChildren().length, 6);
      assert.ok(
        nodes.every((n, i) => view.getChildren()[i].getDomElement() === n),
      );
    }));
  test('completed flights reuse the same DOM nodes and choose a new itinerary', () =>
    withView(({ view, setTime }) => {
      const nodes = view.getChildren().map((n) => n.getDomElement()),
        before = view._walkers.map((w) => w.flight);
      setTime(120000);
      assert.ok(
        nodes.every((n, i) => view.getChildren()[i].getDomElement() === n),
      );
      assert.ok(
        view._walkers.some((w, i) => w.flight && w.flight !== before[i]),
      );
    }));
  test('viewport resize replans offscreen and caps mobile density', () =>
    withView(({ view, save, resize }) => {
      for (const species of [
        'bulbasaur',
        'squirtle',
        'pidgey',
        'rattata',
        'caterpie',
        'weedle',
        'pikachu',
        'geodude',
        'abra',
      ])
        save.pokedex.markCaught(species, false, { deferSave: true });
      resize(mobile);
      assert.equal(view._walkers.length, 3);
      assert.ok(
        view._walkers
          .filter((w) => w.flight)
          .every((w) => offscreen(w.flight.from, w.flight.size, mobile)),
      );
    }));
  test('reduced motion does not schedule flights or load decorative sprites', () =>
    withView(
      ({ view, setTime }) => {
        assert.ok(
          view._walkers.every(
            (w) =>
              !w.flight && w.image.getDomElement().getAttribute('src') === null,
          ),
        );
        setTime(60000);
        assert.ok(view._walkers.every((w) => !w.flight));
      },
      { reduced: true },
    ));
  test('a preference change clears active flights and restarts outside when motion returns', () =>
    withView(({ view, media }) => {
      media.matches = true;
      view.refresh(true);
      assert.ok(view._walkers.every((w) => !w.flight));
      media.matches = false;
      view.refresh(true);
      assert.ok(view._walkers.some((w) => w.flight));
    }));
  test('leaving the page prevents hidden cosmetic scheduling until the page re-enters', () =>
    withView(({ view, setTime }) => {
      view.onExit();
      setTime(60000);
      assert.ok(view._walkers.every((w) => !w.flight));
      view.onEnter();
      assert.ok(view._walkers.some((w) => w.flight));
    }));
  test('cosmetic scheduling neither advances Random.default nor modifies the save', () => {
    const previous = saves.getCurrentSave(),
      save = fixture(),
      before = JSON.stringify(save.serialize()),
      old = Random.default.next;
    Random.default.next = () => {
      throw Error('gameplay random consumed');
    };
    let view;
    try {
      view = new PokemonBackgroundView({
        clock: () => 30000,
        viewport: () => desktop,
      });
      view.onUpdate();
      assert.equal(JSON.stringify(save.serialize()), before);
    } finally {
      view?.destroy();
      Random.default.next = old;
      saves.setCurrentSave(previous);
    }
  });
  test('empty saves clear every sprite and do not keep the previous collection', () =>
    withView(({ view }) => {
      saves.setCurrentSave(null);
      view.refresh();
      assert.equal(view.getChildren().length, 0);
      assert.equal(view.getDomElement().getAttribute('aria-hidden'), 'true');
    }));
  test('CSS contains single flights and transform/opacity motion, with no old diagonal route animations', () => {
    const css = fs.readFileSync(
      new URL('../assets/css/pokemon-background.css', import.meta.url),
      'utf8',
    );
    assert.ok(css.includes('animation-iteration-count: 1'));
    assert.ok(css.includes('prefers-reduced-motion'));
    assert.ok(!css.includes('pw-background-pokemon-nw-se'));
    assert.ok(!css.includes('animation-delay: -'));
  });
});
