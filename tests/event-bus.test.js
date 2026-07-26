import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/event-bus.js';

test('EventBus on/emit/off lifecycle works', () => {
  const bus = new EventBus();
  const received = [];
  const off = bus.on('demo', (payload) => received.push(payload));
  bus.emit('demo', { ok: true });
  off();
  bus.emit('demo', { ok: false });
  assert.deepEqual(received, [{ ok: true }]);
});

test('EventBus clear removes listeners', () => {
  const bus = new EventBus();
  let called = 0;
  bus.on('a', () => { called += 1; });
  bus.on('b', () => { called += 1; });
  bus.clear('a');
  bus.emit('a');
  bus.emit('b');
  assert.equal(called, 1);
  bus.clear();
  bus.emit('b');
  assert.equal(called, 1);
});

