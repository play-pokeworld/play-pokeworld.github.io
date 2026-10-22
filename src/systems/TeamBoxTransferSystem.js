/**
 * @file TeamBoxTransferSystem.js
 * @brief Coordinates atomic transfers between the active team and PC storage.
 * The BoxPanel only sends generic Pokémon-selection events; all team knowledge stays here.
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

  /** Moves one active team member into the PC as a single save operation. @param {string} teamUid */
  storeToBox(teamUid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const team = TeamSystem.getInstance();
    const box = BoxSystem.getInstance();
    const teamMembers = team.getTeam();
    const pokemon = team.getPokemonByUid(teamUid);
    if (!save || teamMembers.length <= 1 || !pokemon) return false;

    const nextTeam = teamMembers.filter((member) => member.uid !== teamUid);
    const nextBox = [...box.getBox(), pokemon];
    if (!team.replaceRoster(nextTeam, nextBox, { persist: false, notify: false })) return false;
    this._persistAndNotify(team, box);
    return true;
  }

  /** Moves one PC Pokémon into a free team slot as a single save operation. @param {string} boxUid */
  withdrawFromBox(boxUid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const team = TeamSystem.getInstance();
    const box = BoxSystem.getInstance();
    const pokemon = box.getPokemonByUid(boxUid);
    if (!save || !team.hasFreeSlot() || !pokemon) return false;

    const nextTeam = [...team.getTeam(), pokemon];
    const nextBox = box.getBox().filter((member) => member.uid !== boxUid);
    if (!team.replaceRoster(nextTeam, nextBox, { persist: false, notify: false })) return false;
    this._persistAndNotify(team, box);
    return true;
  }

  /** Replaces one active team member with a PC Pokémon atomically. @param {string} teamUid @param {string} boxUid */
  replaceFromBox(teamUid, boxUid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const team = TeamSystem.getInstance();
    const box = BoxSystem.getInstance();
    if (!save || !team.swapWithBoxMember(teamUid, boxUid, { persist: false, notify: false })) return false;
    this._persistAndNotify(team, box);
    return true;
  }

  /** @private @param {{operation:'withdraw'|'replace',teamUid?:string,selectionFooter?:Object}} request */
  _openSelection(request) {
    const requestId = `team-box-${++this._requestSequence}`;
    this._pendingSelection = { requestId, operation: request.operation, teamUid: request.teamUid || null };
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX, {
      selectionRequestId: requestId,
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

  /** @private @param {TeamSystem} team @param {BoxSystem} box */
  _persistAndNotify(team, box) {
    SaveSystem.getInstance().saveCurrent();
    team.dispatchChanged();
    box.dispatchChanged();
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
