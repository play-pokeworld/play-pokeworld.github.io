/**
 * @file LongPress.test.js
 * @brief Guards the shared press-and-hold gesture (v1.16.19): the one gesture every secondary action
 *        of the game leans on. Each case below is a defect that was found on a phone.
 */
import { describe, assert } from './TestRunner.js';
import { attachLongPress, LONG_PRESS_DELAY, LONG_PRESS_TOLERANCE } from '../src/ui/LongPress.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bare element stub: the gesture only needs listeners, classList and dispatch. */
class Target {
  constructor() {
    this.listeners = new Map();
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name)
    };
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }

  removeEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter((entry) => entry !== callback));
  }

  dispatch(type, init = {}) {
    const event = {
      type,
      pointerType: 'touch',
      pointerId: 1,
      button: 0,
      clientX: 0,
      clientY: 0,
      prevented: false,
      stopped: false,
      immediate: false,
      ...init,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
      stopImmediatePropagation() { this.immediate = true; this.stopped = true; }
    };
    for (const callback of [...(this.listeners.get(type) || [])]) callback(event);
    return event;
  }
}

describe('Long press (1.16.19)', (test) => {
  test('a resting finger fires once, after the delay', async () => {
    const target = new Target();
    let fired = 0;
    attachLongPress(target, () => { fired += 1; });
    target.dispatch('pointerdown');
    await wait(LONG_PRESS_DELAY - 200);
    assert.equal(fired, 0, 'nothing happens while the finger is still resting');
    await wait(320);
    assert.equal(fired, 1, 'the press fires once the delay has elapsed');
    target.dispatch('pointerup');
    await wait(50);
    assert.equal(fired, 1, 'releasing does not fire a second time');
  });

  test('the finger jitter of a real hand does not cancel the press', async () => {
    // The copied blocks this replaces cancelled on ANY `touchmove`, so the press never fired while
    // the player was holding a finger on a real screen.
    const target = new Target();
    let fired = 0;
    attachLongPress(target, () => { fired += 1; });
    target.dispatch('pointerdown', { clientX: 100, clientY: 100 });
    target.dispatch('pointermove', { clientX: 100 + LONG_PRESS_TOLERANCE - 2, clientY: 100 + LONG_PRESS_TOLERANCE - 2 });
    await wait(LONG_PRESS_DELAY + 120);
    assert.equal(fired, 1, 'a drift inside the tolerance still counts as a press');
  });

  test('a swipe cancels the press: scrolling a list never opens a sheet', async () => {
    const target = new Target();
    let fired = 0;
    attachLongPress(target, () => { fired += 1; });
    target.dispatch('pointerdown', { clientX: 100, clientY: 300 });
    target.dispatch('pointermove', { clientX: 100, clientY: 300 - (LONG_PRESS_TOLERANCE + 20) });
    await wait(LONG_PRESS_DELAY + 120);
    assert.equal(fired, 0, 'a finger that travelled is a scroll, not a press');
  });

  test('when the browser takes the gesture for a scroll, the press is dropped', async () => {
    const target = new Target();
    let fired = 0;
    attachLongPress(target, () => { fired += 1; });
    target.dispatch('pointerdown');
    target.dispatch('pointercancel');
    await wait(LONG_PRESS_DELAY + 120);
    assert.equal(fired, 0, 'pointercancel ends the press');
  });

  test('a mouse never triggers the gesture: the right click stays the desktop path', async () => {
    const target = new Target();
    let fired = 0;
    attachLongPress(target, () => { fired += 1; });
    target.dispatch('pointerdown', { pointerType: 'mouse' });
    await wait(LONG_PRESS_DELAY + 120);
    assert.equal(fired, 0, 'a held left button is not a long press');
  });

  test('the click that ends the press is swallowed, the next one is not', async () => {
    // Without this, a long press on a bag row opened the item sheet AND used the item: the browser
    // fires a click after the release, on the element that was held.
    const target = new Target();
    attachLongPress(target, () => {});
    target.dispatch('pointerdown');
    await wait(LONG_PRESS_DELAY + 120);
    const releaseClick = target.dispatch('click');
    assert.ok(releaseClick.prevented, 'the click of the release is prevented');
    assert.ok(releaseClick.immediate, 'and it stops before the row handler runs');

    target.dispatch('pointerdown');
    target.dispatch('pointerup');
    const nextClick = target.dispatch('click');
    assert.equal(nextClick.prevented, false, 'a plain tap still reaches the row');
  });

  test('the gesture marks its surface so the native callout stays away', async () => {
    const target = new Target();
    const detach = attachLongPress(target, () => {});
    assert.ok(target.classList.contains('pw-long-press'), 'the surface carries the gesture class');
    detach();
    assert.equal(target.classList.contains('pw-long-press'), false, 'detaching cleans the class');
    target.dispatch('pointerdown');
    await wait(LONG_PRESS_DELAY + 120);
    assert.equal((target.listeners.get('pointerdown') || []).length, 0, 'detaching removes its listeners');
  });
});
