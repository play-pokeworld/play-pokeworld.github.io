/** @file TeamPresetEditSystem.js @brief Transient UID-only preset draft and canonical PC selection coordinator. */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamPresetSystem } from './TeamPresetSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TeamPresetRules } from '../config/TeamPresetRules.js';
import { ModalIds } from '../config/ModalIds.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { TeamPresetDraftChangedEvent } from '../core/events/TeamPresetDraftChangedEvent.js';
import { BoxPokemonSelectedEvent } from '../core/events/BoxPokemonSelectedEvent.js';
import { BoxPokemonSelectionCancelledEvent } from '../core/events/BoxPokemonSelectionCancelledEvent.js';
import { BoxPokemonSelectionRemoveRequestedEvent } from '../core/events/BoxPokemonSelectionRemoveRequestedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class TeamPresetEditSystem extends BaseSystem {
  static _instance = null;
  /** @returns {TeamPresetEditSystem} */
  static getInstance() {
    return this._instance || (this._instance = new TeamPresetEditSystem());
  }
  constructor() {
    super('TeamPresetEditSystem', 'System');
    this._draft = null;
    this._pending = null;
    this._sequence = 0;
    this._subscriptions = [];
  }
  /** @override */
  init() {
    if (this._subscriptions.length) return;
    const bus = EventBus.getInstance();
    this._subscriptions = [
      bus.subscribe(BoxPokemonSelectedEvent, (e) => this._selected(e)),
      bus.subscribe(BoxPokemonSelectionCancelledEvent, (e) => {
        if (e.requestId === this._pending?.requestId) this._pending = null;
      }),
      bus.subscribe(BoxPokemonSelectionRemoveRequestedEvent, (e) => {
        if (e.requestId !== this._pending?.requestId) return;
        const index = this._pending.index;
        this._pending = null;
        const state = this.getSnapshot();
        if (state) this.remove(state.members[index]);
      }),
      ...[SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent].map((type) =>
        bus.subscribe(type, () => this.close()),
      ),
    ];
  }
  /** @param {string} id @returns {boolean} */
  begin(id) {
    const save = SaveSystem.getInstance().getCurrentSave(),
      slot = TeamPresetSystem.getInstance().getPreset(id);
    if (!save || !slot) return false;
    this._pending = null;
    this._draft = {
      id,
      saveId: save.id,
      members: [...slot.members],
      dirty: false,
    };
    this._changed();
    return true;
  }
  /** @returns {Object|null} Defensive UID list with canonical Pokémon references for display. */
  getSnapshot() {
    const draft = this._draft;
    if (
      !draft ||
      SaveSystem.getInstance().getCurrentSave()?.id !== draft.saveId
    )
      return null;
    const preset = TeamPresetSystem.getInstance().getPreset(draft.id);
    if (!preset) return null;
    return {
      ...draft,
      name: preset.name,
      members: [...draft.members],
      entries: draft.members.map((uid, index) => ({
        uid,
        index,
        pokemon: BoxSystem.getInstance().getPokemonByUid(uid),
        source: TeamSystem.getInstance().isMember(uid) ? 'team' : 'box',
      })),
    };
  }
  /** @param {string} firstUid @param {string} secondUid @returns {boolean} */
  swap(firstUid, secondUid) {
    const state = this.getSnapshot();
    if (!state || firstUid === secondUid) return false;
    const a = state.members.indexOf(firstUid),
      b = state.members.indexOf(secondUid);
    if (a < 0 || b < 0) return false;
    [this._draft.members[a], this._draft.members[b]] = [
      this._draft.members[b],
      this._draft.members[a],
    ];
    this._draft.dirty = true;
    this._changed();
    return true;
  }
  /** @param {string} uid @param {number} delta @returns {boolean} */
  move(uid, delta) {
    const state = this.getSnapshot(),
      index = state?.members.indexOf(uid) ?? -1,
      target = state?.members[index + delta];
    return index >= 0 && !!target && this.swap(uid, target);
  }
  /** @param {string} uid @returns {boolean} */
  remove(uid) {
    const state = this.getSnapshot();
    if (!state || !state.members.includes(uid)) return false;
    this._draft.members = state.members.filter((id) => id !== uid);
    this._draft.dirty = true;
    this._changed();
    return true;
  }
  /** @param {number} index @returns {boolean} */
  requestPokemon(index) {
    const state = this.getSnapshot();
    if (
      !state ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= TeamPresetRules.MAX_MEMBERS ||
      index > state.members.length
    )
      return false;
    const current = state.members[index],
      selected = new Set(state.members.filter((uid, i) => i !== index));
    const candidates = TeamPresetSystem.getInstance()
      .getRosterMembers()
      .filter(({ pokemon }) => !selected.has(pokemon.uid));
    const requestId = `${TeamPresetRules.SELECTION_PREFIX}${++this._sequence}`;
    this._pending = {
      requestId,
      index,
      saveId: state.saveId,
      presetId: state.id,
    };
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.BOX, {
        selectionRequestId: requestId,
        selectionAllowedUids: candidates.map(({ pokemon }) => pokemon.uid),
        selectionFooter: {
          label: t('preset_pick_poke_title'),
          cancelLabel: t('btn_cancel'),
          removeLabel: current ? t('preset_remove_member') : '',
        },
      }),
    );
    return true;
  }
  /** @private */
  _selected(event) {
    const pending = this._pending;
    if (!pending || pending.requestId !== event.requestId) return;
    this._pending = null;
    const state = this.getSnapshot();
    if (
      !state ||
      state.saveId !== pending.saveId ||
      state.id !== pending.presetId
    )
      return;
    if (
      state.members.some(
        (uid, index) => index !== pending.index && uid === event.pokemonUid,
      )
    )
      return;
    if (
      !TeamPresetSystem.getInstance()
        .getRosterMembers()
        .some(({ pokemon }) => pokemon.uid === event.pokemonUid)
    )
      return;
    this._draft.members[pending.index] = event.pokemonUid;
    this._draft.dirty = true;
    this._changed();
  }
  /** Saves only references, never copies Pokémon or changes the active party. @returns {boolean} */
  save() {
    const state = this.getSnapshot();
    if (
      !state ||
      !TeamPresetSystem.getInstance().setMembers(state.id, state.members)
    )
      return false;
    this._draft.dirty = false;
    this._changed();
    return true;
  }
  /** @returns {Object} Atomic preset + party apply through the canonical team coordinator. */
  apply() {
    const state = this.getSnapshot();
    if (!state) return { ok: false, reason: 'missing' };
    const result = TeamPresetSystem.getInstance().applyMembers(
      state.id,
      state.members,
    );
    if (result.ok) {
      this._draft.dirty = false;
      this._changed();
    }
    return result;
  }
  /** @returns {boolean} */
  useCurrent() {
    const state = this.getSnapshot();
    if (!state || !TeamPresetSystem.getInstance().saveCurrentToPreset(state.id))
      return false;
    this._draft.members = [
      ...TeamPresetSystem.getInstance().getPreset(state.id).members,
    ];
    this._draft.dirty = false;
    this._changed();
    return true;
  }
  /** Discards uncommitted UI state only. */
  close() {
    if (!this._draft && !this._pending) return;
    this._draft = null;
    this._pending = null;
    this._changed();
  }
  /** @private */
  _changed() {
    EventBus.getInstance().dispatch(
      new TeamPresetDraftChangedEvent(this._draft?.id || null),
    );
  }
  /** @override */
  onDestroy() {
    for (const unsubscribe of this._subscriptions) unsubscribe();
    this._subscriptions = [];
    this.close();
    super.onDestroy();
  }
}
