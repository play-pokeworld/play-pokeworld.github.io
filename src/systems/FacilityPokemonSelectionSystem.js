/**
 * @file FacilityPokemonSelectionSystem.js
 * @brief Coordinates facility choices through the existing generic PC selector, never a second roster.
 */
import { BaseSystem } from './BaseSystem.js';
import { HatcherySystem } from './HatcherySystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BoxPokemonSelectedEvent } from '../core/events/BoxPokemonSelectedEvent.js';
import { BoxPokemonSelectionCancelledEvent } from '../core/events/BoxPokemonSelectionCancelledEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';

export class FacilityPokemonSelectionSystem extends BaseSystem {
  static _instance = null;
  /** @returns {FacilityPokemonSelectionSystem} */
  static getInstance() { return this._instance || (this._instance = new FacilityPokemonSelectionSystem()); }
  constructor() { super('FacilityPokemonSelectionSystem', 'System'); this._pending = null; this._sequence = 0; this._unsubscribers = []; }
  /** @override */
  init() {
    if (this._unsubscribers.length) return;
    const bus = EventBus.getInstance();
    this._unsubscribers = [
      bus.subscribe(BoxPokemonSelectedEvent, (event) => this._selected(event)),
      bus.subscribe(BoxPokemonSelectionCancelledEvent, (event) => { if (event.requestId === this._pending?.requestId) this._pending = null; }),
      ...[SaveLoadedEvent, SaveCreatedEvent].map((type) => bus.subscribe(type, () => { this._pending = null; }))
    ];
  }
  /** @param {string} feature @param {number} slotIndex @param {{queue?:boolean}} [options] @returns {boolean} */
  openSelection(feature, slotIndex, {queue=false,replace=false}={}) {
    const system = feature === 'hatchery' ? HatcherySystem.getInstance() : feature === 'training' ? TrainingSystem.getInstance() : null;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!system?.isUnlocked() || !save) return false;
    const candidates = system.getCandidates(slotIndex,{queue,replace});
    const requestId = `facility-pokemon-${++this._sequence}`;
    this._pending = { requestId, feature, slotIndex,queue,replace,saveId: save.id };
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX, {
      selectionRequestId: requestId,
      selectionAction: feature === 'hatchery' ? PokemonActionIds.DEPOSIT_DAYCARE : PokemonActionIds.TRAIN,
      selectionAllowedUids: candidates.map((entry) => entry.uid)
    }));
    return true;
  }
  /** @private */
  _selected(event) {
    const pending = this._pending;
    if (!pending || pending.requestId !== event.requestId) return;
    this._pending = null;
    if (pending.saveId !== SaveSystem.getInstance().getCurrentSave()?.id) return;
    const system = pending.feature === 'hatchery' ? HatcherySystem.getInstance() : TrainingSystem.getInstance();
    if (pending.queue) system.enqueue(pending.slotIndex, event.pokemonUid);
    else if (pending.feature === 'hatchery') system.depositPokemon(event.pokemonUid, pending.slotIndex);
    else system.assignPokemon(pending.slotIndex,event.pokemonUid,{replace:pending.replace});
  }
  /** @override */
  onDestroy() { this._unsubscribers.forEach((unsubscribe) => unsubscribe()); this._unsubscribers = []; this._pending = null; super.onDestroy(); }
}
