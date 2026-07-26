import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRouteEventState,
  ensureRouteEventState,
  defineRouteEvent,
  canTriggerRouteEvent,
  markRouteEventSeen,
  setRouteEventCooldown,
} from '../src/domain/world/route-events.js';

test('createRouteEventState returns default structure', () => {
  assert.deepEqual(createRouteEventState(), {
    seen: {},
    active: null,
    history: [],
    cooldowns: {},
  });
});

test('ensureRouteEventState repairs missing fields', () => {
  const gameState = { routeEvents: { seen: null, history: null } };
  const state = ensureRouteEventState(gameState);
  assert.ok(state.seen && typeof state.seen === 'object');
  assert.ok(Array.isArray(state.history));
  assert.ok(state.cooldowns && typeof state.cooldowns === 'object');
  assert.equal(state.active, null);
});

test('once/story/cooldown gates are respected', () => {
  const gameState = { storyIdx: 3 };
  const event = defineRouteEvent({ id: 'demo', location: 'route1', once: true, minStory: 2, maxStory: 5 });
  assert.equal(canTriggerRouteEvent(gameState, event, 'route1'), true);
  markRouteEventSeen(gameState, 'demo');
  assert.equal(canTriggerRouteEvent(gameState, event, 'route1'), false);

  const cooldownEvent = defineRouteEvent({ id: 'cooldown', location: 'route1' });
  setRouteEventCooldown(gameState, 'cooldown', 1000);
  assert.equal(canTriggerRouteEvent(gameState, cooldownEvent, 'route1'), false);
});

