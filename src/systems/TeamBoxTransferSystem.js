/**
 * @file TeamBoxTransferSystem.js
 * @brief Coordinates party changes chosen from the PC box (the collection of every owned Pokémon).
 * The BoxPanel only sends generic Pokémon-selection events; all team knowledge stays here.
 * Selections ask for the JOIN_TEAM action so the PC only offers Pokémon no mode currently uses.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BoxPokemonSelectedEvent } from '../core/events/BoxPokemonSelectedEvent.js';
import { BoxPokemonSelectionCancelledEvent } from '../core/events/BoxPokemonSelectionCancelledEvent.js';
import { BoxPokemonSelectionRemoveRequestedEvent } from '../core/events/BoxPokemonSelectionRemoveRequestedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { t } from '../localization/LocalizationManager.js';

export class TeamBoxTransferSystem extends BaseSystem {
  /** @private @type {TeamBoxTransferSystem|null} */
  static _instance = null;

  /** @returns {TeamBoxTransferSystem} */
  static getInstance() {
    if (!TeamBoxTransferSystem._instance) TeamBoxTransferSystem._instance = new TeamBoxTransferSystem();
    return TeamBoxTransferSystem._instance;
  }

  constructor() {
    super('TeamBoxTransferSystem', 'System');
    this._requestSequence = 0;
    this._pendingSelection = null;
    const bus = EventBus.getInstance();
    this._unsubscribeSelected = bus.subscribe(BoxPokemonSelectedEvent, (event) => this._onPokemonSelected(event));
    this._unsubscribeCancelled = bus.subscribe(BoxPokemonSelectionCancelledEvent, (event) => this._onSelectionCancelled(event));
    this._unsubscribeRemoveRequested = bus.subscribe(
      BoxPokemonSelectionRemoveRequestedEvent,
      (event) => this._onSelectionRemoveRequested(event)
    );
  }

  /** Opens generic PC selection for the empty team slot. @returns {boolean} */
  openWithdrawSelector() {
    const team = TeamSystem.getInstance();
    if (!SaveSystem.getInstance().getCurrentSave() || !team.hasFreeSlot()) return false;
    return this._openSelection({ operation: 'withdraw' });
  }

  /** @param {string} teamUid @returns {boolean} */
  openReplacementSelector(teamUid) {
    const team = TeamSystem.getInstance();
    const outgoing = team.getPokemonByUid(teamUid);
    if (!SaveSystem.getInstance().getCurrentSave() || !outgoing) return false;
    return this._openSelection({
      operation: 'replace',
      teamUid,
      selectionFooter: {
        label: t('selected_pokemon', { name: outgoing.getDisplayName(), level: outgoing.level }),
        cancelLabel: t('cancel'),
        removeLabel: t('remove_from_team'),
        removeDisabled: team.getTeam().length <= 1
      }
    });
  }

  /**
   * Takes one member out of the party; it stays in the PC box (the collection owns it).
   * @param {string} teamUid
   * @returns {boolean}
   */
  storeToBox(teamUid) {
    const team = TeamSystem.getInstance();
    if (!team.removePokemon(teamUid, { persist: false, notify: false })) return false;
    this._persistAndNotify(team);
    return true;
  }

  /** Puts one available PC Pokémon into a free party slot. @param {string} boxUid @returns {boolean} */
  withdrawFromBox(boxUid) {
    const team = TeamSystem.getInstance();
    if (!team.addMember(boxUid, { persist: false, notify: false })) return false;
    this._persistAndNotify(team);
    return true;
  }

  /** Replaces one party member with an available PC Pokémon. @param {string} teamUid @param {string} boxUid */
  replaceFromBox(teamUid, boxUid) {
    const team = TeamSystem.getInstance();
    if (!team.replaceMember(teamUid, boxUid, { persist: false, notify: false })) return false;
    this._persistAndNotify(team);
    return true;
  }

  /** @private @param {{operation:'withdraw'|'replace',teamUid?:string,selectionFooter?:Object}} request */
  _openSelection(request) {
    const requestId = `team-box-${++this._requestSequence}`;
    this._pendingSelection = { requestId, operation: request.operation, teamUid: request.teamUid || null };
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX, {
      selectionRequestId: requestId,
      selectionAction: PokemonActionIds.JOIN_TEAM,
      ...(request.selectionFooter ? { selectionFooter: request.selectionFooter } : {})
    }));
    return true;
  }

  /** @private @param {BoxPokemonSelectedEvent} event */
  _onPokemonSelected(event) {
    const pending = this._pendingSelection;
    if (!pending || event.requestId !== pending.requestId) return;
    this._pendingSelection = null;
    if (pending.operation === 'withdraw') this.withdrawFromBox(event.pokemonUid);
    else if (pending.operation === 'replace') this.replaceFromBox(pending.teamUid, event.pokemonUid);
  }

  /** @private @param {BoxPokemonSelectionCancelledEvent} event */
  _onSelectionCancelled(event) {
    if (this._pendingSelection?.requestId === event.requestId) this._pendingSelection = null;
  }

  /** @private @param {BoxPokemonSelectionRemoveRequestedEvent} event */
  _onSelectionRemoveRequested(event) {
    const pending = this._pendingSelection;
    if (!pending || pending.requestId !== event.requestId || pending.operation !== 'replace') return;
    this._pendingSelection = null;
    this.storeToBox(pending.teamUid);
  }

  /** @private @param {TeamSystem} team */
  _persistAndNotify(team) {
    SaveSystem.getInstance().saveCurrent();
    team.dispatchChanged();
    BoxSystem.getInstance().dispatchChanged();
  }

  /** @override */
  onDestroy() {
    this._unsubscribeSelected?.();
    this._unsubscribeCancelled?.();
    this._unsubscribeRemoveRequested?.();
    this._pendingSelection = null;
    super.onDestroy();
  }
}
