/**
 * @file RegionalStarterSystem.js
 * @brief One-time regional starter choice and roster/Pokédex settlement.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { STARTERS_BY_REGION, DEFAULT_STARTER_REGION } from '../data/pokemon/StarterData.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { EventBus } from '../core/EventBus.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { RegionalStarterRequiredEvent } from '../core/events/RegionalStarterRequiredEvent.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export class RegionalStarterSystem extends BaseSystem {
  /** @private @type {RegionalStarterSystem|null} */
  static _instance = null;

  /** @returns {RegionalStarterSystem} */
  static getInstance() {
    if (!RegionalStarterSystem._instance) RegionalStarterSystem._instance = new RegionalStarterSystem();
    return RegionalStarterSystem._instance;
  }

  constructor() {
    super('RegionalStarterSystem', 'System');
    /** @private @type {Array<[Function, Function]>} */
    this._subscriptions = [];
  }

  /** @override */
  init() {
    if (this._subscriptions.length) return;
    const bus = EventBus.getInstance();
    const onRegionEntry = (event) => this.requestForRegion(event.region);
    const onSaveLoaded = () => this.requestCurrentRegionStarter();
    bus.subscribe(LocationChangedEvent, onRegionEntry);
    bus.subscribe(SaveLoadedEvent, onSaveLoaded);
    this._subscriptions.push([LocationChangedEvent, onRegionEntry], [SaveLoadedEvent, onSaveLoaded]);
  }

  /** @override */
  onDestroy() {
    const bus = EventBus.getInstance();
    for (const [eventClass, callback] of this._subscriptions) bus.unsubscribe(eventClass, callback);
    this._subscriptions = [];
    super.onDestroy();
  }

  /** @param {string} regionId @returns {boolean} */
  needsChoice(regionId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const starters = STARTERS_BY_REGION[regionId];
    if (!save || !starters?.length || regionId === DEFAULT_STARTER_REGION || save.player.region !== regionId) return false;
    const access = FeatureAccessSystem.getInstance().getSnapshot();
    if (!access.regions.includes(regionId)) return false;
    if (access.regionStarters.includes(regionId) || save.access.hasRegionStarter(regionId)) return false;
    return !starters.some((starter) =>
      save.collection.getAll().some((pokemon) => pokemon.species === starter.species) ||
      save.pokedex.isCaught(starter.species)
    );
  }

  /** @returns {boolean} Emits a request when the loaded save needs a regional starter choice. */
  requestCurrentRegionStarter() {
    const regionId = SaveSystem.getInstance().getCurrentSave()?.player.region;
    return typeof regionId === 'string' ? this.requestForRegion(regionId) : false;
  }

  /** @param {string} regionId @returns {boolean} Emits a request when the region needs its one-time choice. */
  requestForRegion(regionId) {
    if (!this.needsChoice(regionId)) return false;
    EventBus.getInstance().dispatch(new RegionalStarterRequiredEvent(regionId));
    return true;
  }

  /**
   * Adds the selected regional partner to the active team, or to the PC when the team is full.
   * @param {string} regionId
   * @param {string} speciesId
   * @returns {{success:boolean,storedIn?:'team'|'box',pokemon?:Object}}
   */
  chooseStarter(regionId, speciesId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const starter = STARTERS_BY_REGION[regionId]?.find((entry) => entry.species === speciesId);
    if (!save || !starter || !this.needsChoice(regionId)) return { success: false };

    const pokemon = PokemonFactory.create(speciesId, PlayerDefaults.STARTER_LEVEL);
    if (!pokemon) return { success: false };
    const useTeam = TeamSystem.getInstance().hasFreeSlot();
    const added = useTeam
      ? TeamSystem.getInstance().addPokemon(pokemon, { deferSave: true })
      : BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true });
    if (!added) return { success: false };

    FeatureAccessSystem.getInstance().refresh('regional-starter-chosen', { persist: false });
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(
      t(useTeam ? 'regional_starter_added_team' : 'regional_starter_sent_pc', { name: t(starter.nameKey) }),
      { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.SUCCESS }
    );
    return { success: true, storedIn: useTeam ? 'team' : 'box', pokemon };
  }
}
