export function createRouteEventState() {
  return { seen: {}, active: null, history: [], cooldowns: {} };
}

export function ensureRouteEventState(gameState) {
  if (!gameState.routeEvents || typeof gameState.routeEvents !== 'object') gameState.routeEvents = createRouteEventState();
  const state = gameState.routeEvents;
  if (!state.seen || typeof state.seen !== 'object') state.seen = {};
  if (!Array.isArray(state.history)) state.history = [];
  if (!state.cooldowns || typeof state.cooldowns !== 'object') state.cooldowns = {};
  if (!Object.prototype.hasOwnProperty.call(state, 'active')) state.active = null;
  if (state.active === undefined) state.active = null;
  return state;
}

export function defineRouteEvent(definition) {
  if (!definition || !definition.id) throw new Error('Route event requires an id');
  return {
    once: false,
    minStory: 0,
    maxStory: Infinity,
    cooldownMs: 0,
    ...definition,
  };
}

export function canTriggerRouteEvent(gameState, event, location, now = Date.now()) {
  if (!event) return false;
  const state = ensureRouteEventState(gameState);
  if (event.location && location && event.location !== location) return false;
  const storyIdx = Number(gameState.storyIdx || 0);
  if (storyIdx < Number(event.minStory || 0)) return false;
  if (event.maxStory != null && storyIdx > Number(event.maxStory)) return false;
  if (event.once && state.seen[event.id]) return false;
  const cooldownUntil = Number(state.cooldowns[event.id] || 0);
  if (cooldownUntil > now) return false;
  return true;
}

export function markRouteEventSeen(gameState, eventId) {
  const state = ensureRouteEventState(gameState);
  state.seen[eventId] = true;
  state.history.push({ id: eventId, at: Date.now() });
}

export function setRouteEventCooldown(gameState, eventId, durationMs, now = Date.now()) {
  const state = ensureRouteEventState(gameState);
  state.cooldowns[eventId] = now + Math.max(0, Number(durationMs || 0));
}

