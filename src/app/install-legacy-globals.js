import { EVENTS, eventBus } from '../core/event-bus.js';
import { storage } from '../core/storage.js';
import { randomInt, chancePercent, clamp as clampValue } from '../core/random.js';
import { gameState } from '../domain/game/initial-state.js';
import { battleState } from '../domain/battle/battle-state.js';
import { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText } from '../domain/battle/type-system.js';
import { calculateBaseDamage } from '../domain/battle/damage.js';

export function installLegacyGlobals(target = globalThis) {
  target.safeStorage = storage;
  target.G = gameState;
  target.battle = battleState;
  target.EVENTS = EVENTS;
  target.EventBus = eventBus;
  target.TYPES = TYPES;
  target.TYPE_COLORS = TYPE_COLORS;
  target.CHART = TYPE_CHART;
  target.typeEff = typeEffect;
  target.effText = (multiplier) => effectivenessText(multiplier, target.t);
  target.rand = randomInt;
  target.chance = chancePercent;
  target.clamp = clampValue;
  target.PokeWorldDomain = { ...(target.PokeWorldDomain || {}), damage: { calculateBaseDamage }, typeSystem: { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText } };
  target.notify = function notify(message, color = 'var(--green)') { const element = document.getElementById('notif'); if (!element) return; element.textContent = message; element.style.background = color; element.style.display = 'block'; clearTimeout(element._t); element._t = setTimeout(() => { element.style.display = 'none'; }, 2500); };
  target.setMsg = function setMsg(message) { target.notify(message); };
  target.addBattleLog = function addBattleLog(message) { if (!target.battle.log) target.battle.log = []; target.battle.log.push(message); if (target.battle.log.length > 60) target.battle.log.shift(); const modal = document.getElementById('battle-summary-modal'); if (modal && modal.classList.contains('open') && typeof target.renderBattleSummary === 'function') target.renderBattleSummary(); };
  target.clearBattleLog = function clearBattleLog() { target.battle.log = []; };
  target.typeClass = function typeClass(type) { return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
  target.typeSpan = function typeSpan(type) { return `<span class="type-badge ${target.typeClass(type)}">${type}</span>`; };
  target.hpColor = function hpColor(percent) { if (percent > 0.5) return 'var(--green)'; if (percent > 0.25) return 'var(--light2)'; return 'var(--red)'; };
}
