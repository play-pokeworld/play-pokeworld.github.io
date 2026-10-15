/**
 * PokeEngine — EventBus
 *
 * V7 · DBT-05 — UN SEUL bus d'événements : l'implémentation vit dans
 * src/core/event-bus.js (wildcards multiples, once, emitAsync, clear). Ce
 * fichier ne fait que publier la classe sur la surface moteur
 * (globalThis.PokeEventBus, window.poke.EventBus) pour Engine.js et le pont
 * classique. Le compteur PokeTrace est branché ici, sans dupliquer le bus.
 */
import { EventBus as CoreEventBus } from '../../core/event-bus.js';

class EventBus extends CoreEventBus {
  emit(event, ...args) {
    try {
      if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.count('event', String(event));
    } catch (_) {
      /* trace optionnelle */
    }
    return super.emit(event, ...args);
  }
}

if (typeof globalThis !== 'undefined') globalThis.PokeEventBus = EventBus;
if (typeof window !== 'undefined') {
  if (!window.poke) window.poke = {};
  window.poke.EventBus = EventBus;
}

export { EventBus };
export default EventBus;
