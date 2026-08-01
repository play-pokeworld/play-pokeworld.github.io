import { eventBus } from '../core/event-bus.js';
import { randomInt, clamp, chancePercent } from '../core/random.js';
import { createGameSession } from './game-session.js';
import * as damage from '../domain/battle/damage.js';
import * as typeSystem from '../domain/battle/type-system.js';

export function createApplicationRuntime() {
  const session = createGameSession();
  return {
    state: session.gameState,
    battle: session.battleState,
    events: { eventBus },
    core: { randomInt, clamp, chancePercent },
    domain: { damage, typeSystem },
  };
}

