import { EVENTS, eventBus } from '../core/event-bus.js';
import { storage } from '../core/storage.js';
import { randomInt, chancePercent, clamp } from '../core/random.js';
import * as typeSystem from '../domain/battle/type-system.js';
import * as damage from '../domain/battle/damage.js';
import * as market from '../domain/economy/market.js';
import * as mineData from '../domain/mine/mine-data.js';
import * as fossils from '../domain/breeding/fossils.js';
import * as routeEvents from '../domain/world/route-events.js';
import { gameState, createInitialGameState } from '../domain/game/initial-state.js';
import { battleState, createInitialBattleState } from '../domain/battle/battle-state.js';
import * as domComponents from '../ui/components/dom.js';
import * as templateComponents from '../ui/components/template.js';
import { installLegacyGlobals } from './install-legacy-globals.js';

if (typeof window !== 'undefined') {
  window.PokeWorldComponents = { dom: domComponents, template: templateComponents };
  window.PokeWorldEventBus = { EVENTS, eventBus };
  window.PokeWorldDomain = { typeSystem, damage, market, mineData, fossils, routeEvents };
  routeEvents.ensureRouteEventState(gameState);
  window.PokeWorldState = { gameState, createInitialGameState };
  window.PokeWorldBattleState = { battleState, createInitialBattleState };
  window.PokeWorldCore = { storage, randomInt, chancePercent, clamp };
  installLegacyGlobals(globalThis);
}
export {};

