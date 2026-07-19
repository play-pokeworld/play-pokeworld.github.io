export const ROUTE_EVENT_TYPES = Object.freeze({
  NPC_BATTLE: 'npc_battle',
  BONUS_FIND: 'bonus_find',
  SPECIAL_ENCOUNTER: 'special_encounter',
  WEATHER: 'weather',
  STORY: 'story',
});

export function createRouteEventState() {
  return {
    seen: {},
    active: null,
    history: [],
    cooldowns: {},
  };
}

export function ensureRouteEventState(gameState) {
  if (!gameState.routeEvents || typeof gameState.routeEvents !== 'object') {
    gameState.routeEvents = createRouteEventState();
  }
  if (!gameState.routeEvents.seen || typeof gameState.routeEvents.seen !== 'object') gameState.routeEvents.seen = {};
  if (!Array.isArray(gameState.routeEvents.history)) gameState.routeEvents.history = [];
  if (!gameState.routeEvents.cooldowns || typeof gameState.routeEvents.cooldowns !== 'object') gameState.routeEvents.cooldowns = {};
  if (!('active' in gameState.routeEvents)) gameState.routeEvents.active = null;
  return gameState.routeEvents;
}

export function defineRouteEvent(event) {
  return Object.freeze({
    id: event.id,
    type: event.type || ROUTE_EVENT_TYPES.BONUS_FIND,
    label: event.label || event.id,
    location: event.location || null,
    once: !!event.once,
    weight: Number(event.weight || 1),
    minStory: Number(event.minStory || 0),
    maxStory: Number(event.maxStory || 9999),
    data: event.data || {},
  });
}

export const ROUTE_EVENT_REGISTRY = Object.freeze({
  kanto: Object.freeze([]),
  johto: Object.freeze([]),
});

export function getRouteEventsForLocation(region, locationId) {
  const events = ROUTE_EVENT_REGISTRY[region] || [];
  return events.filter((event) => !event.location || event.location === locationId);
}

export function canTriggerRouteEvent(gameState, event, locationId) {
  const state = ensureRouteEventState(gameState);
  if (!event) return false;
  if (event.location && event.location !== locationId) return false;
  if (event.once && state.seen[event.id]) return false;
  const storyIdx = Number(gameState.storyIdx || 0);
  if (storyIdx < Number(event.minStory || 0)) return false;
  if (storyIdx > Number(event.maxStory || 9999)) return false;
  if (state.cooldowns[event.id] && Number(state.cooldowns[event.id]) > Date.now()) return false;
  return true;
}

export function markRouteEventSeen(gameState, eventId) {
  const state = ensureRouteEventState(gameState);
  state.seen[eventId] = true;
  if (!state.history.includes(eventId)) state.history.unshift(eventId);
  state.history = state.history.slice(0, 30);
}

export function setRouteEventCooldown(gameState, eventId, durationMs) {
  const state = ensureRouteEventState(gameState);
  state.cooldowns[eventId] = Date.now() + Math.max(0, Number(durationMs || 0));
}

export function rollRouteEvent(gameState, region, locationId, random = Math.random) {
  const candidates = getRouteEventsForLocation(region, locationId).filter((event) => canTriggerRouteEvent(gameState, event, locationId));
  if (!candidates.length) return null;
  const totalWeight = candidates.reduce((sum, event) => sum + Math.max(1, Number(event.weight || 1)), 0);
  let roll = random() * totalWeight;
  for (const event of candidates) {
    roll -= Math.max(1, Number(event.weight || 1));
    if (roll <= 0) return event;
  }
  return candidates[candidates.length - 1] || null;
}
