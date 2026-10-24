/**
 * @file SaveSystem.js
 * @brief Save session service (C++ equivalent: class SaveSystem : public BaseSystem).
 * Owns the active save, exposes the save-library use cases (create, load, duplicate, rename,
 * import, export, delete) and emits the matching events. Storage details live in SaveStorage.
 */

import { SaveRules } from '../config/SaveRules.js';
import { SaveCheckpointRequestedEvent } from '../core/events/SaveCheckpointRequestedEvent.js';
import { BaseSystem } from './BaseSystem.js';
import { SaveStorage } from './SaveStorage.js';
import { SaveData, generateSaveId } from '../data/save/SaveData.js';
import { EventBus } from '../core/EventBus.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class SaveSystem extends BaseSystem {
  /** @private @type {SaveSystem|null} */
  static _instance = null;

  constructor() {
    super('SaveSystem', 'System');
    /** @private @type {SaveData|null} */
    this._currentSave = null;
    this._checkpointElapsed = 0;
    this._unsubscribeCheckpoint = null;
  }

  /** @override */
  init() {
    if (!this._unsubscribeCheckpoint) this._unsubscribeCheckpoint = EventBus.getInstance().subscribe(SaveCheckpointRequestedEvent, () => this.saveCurrent());
  }
  /** @override @param {number} dt */
  update(dt) {
    if (!this._currentSave || !Number.isFinite(dt) || dt <= 0) return;
    this._checkpointElapsed += dt;
    if (this._checkpointElapsed >= SaveRules.CHECKPOINT_SECONDS) this.saveCurrent();
  }
  /** @override */
  onDestroy() { this._unsubscribeCheckpoint?.(); this._unsubscribeCheckpoint = null; super.onDestroy(); }

  /** @returns {SaveSystem} */
  static getInstance() {
    if (!SaveSystem._instance) {
      SaveSystem._instance = new SaveSystem();
    }
    return SaveSystem._instance;
  }

  /**
   * Lists the existing saves in library order (never empty placeholder slots).
   * Index entries whose payload is unreadable are dropped from the index.
   * @returns {Array<{ id: string, slotId: number, exists: boolean, data: SaveData }>}
   */
  listExistingSaves() {
    const index = SaveStorage.readIndex();
    let saves;
    if (index === null) {
      saves = SaveStorage.migrateLegacyLayout();
    } else {
      saves = index.map((entry) => SaveStorage.read(entry.id)).filter(Boolean);
      if (saves.length !== index.length) {
        SaveStorage.writeIndex(saves.map((save) => SaveStorage.summaryOf(save)));
      }
    }
    return saves.map((save, idx) => ({ id: save.id, slotId: idx + 1, exists: true, data: save }));
  }

  /**
   * Creates, persists and activates a new save (appended at the end of the library).
   * @param {string} trainerName
   * @param {string} starterSpecies
   * @param {string} [background]
   * @returns {SaveData}
   */
  createNewSave(trainerName, starterSpecies, background) {
    if (this._currentSave) this.saveCurrent();
    const save = SaveData.createNew(trainerName, starterSpecies, background);
    this._currentSave = save;
    this.saveCurrent();

    console.log(t('debug_save_created', { id: save.id, name: save.player.trainerName }));
    EventBus.getInstance().dispatch(new SaveCreatedEvent(save.id, save.player.trainerName));
    return save;
  }

  /**
   * Activates a stored save by id, or by its 1-based position in the library.
   * @param {string|number} idOrPosition
   * @returns {SaveData|null}
   */
  loadSlot(idOrPosition) {
    if (this._currentSave) this.saveCurrent();
    const key = String(idOrPosition);
    let save = SaveStorage.read(key);
    if (!save) {
      const match = this.listExistingSaves().find((entry) => String(entry.slotId) === key);
      save = match ? match.data : null;
    }
    if (!save) return null;

    this._currentSave = save;
    SaveStorage.writeActive(save);
    console.log(t('debug_save_loaded', { id: save.id }));
    EventBus.getInstance().dispatch(new SaveLoadedEvent(save.id, save));
    return save;
  }

  /** Writes the active save to storage. */
  saveCurrent() {
    if (!this._currentSave) return;
    this._checkpointElapsed = 0;
    this._currentSave.updatedAt = Date.now();
    if (SaveStorage.write(this._currentSave)) {
      SaveStorage.writeActive(this._currentSave);
      console.log(t('debug_save_written'));
    } else {
      console.error(t('debug_save_write_failed', { id: this._currentSave.id }));
    }
  }

  /**
   * Deletes a save permanently (payload, index entry, active mirror).
   * @param {string} id
   */
  deleteSlot(id) {
    const strId = String(id);
    SaveStorage.remove(strId);
    if (this._currentSave && this._currentSave.id === strId) {
      this._currentSave = null;
    }
    console.log(t('debug_save_deleted', { id: strId }));
    EventBus.getInstance().dispatch(new SaveDeletedEvent(strId));
  }

  /**
   * Copies a stored save under a new id (the active session is untouched).
   * @param {string} sourceId
   * @returns {SaveData|null}
   */
  duplicateSlot(sourceId) {
    const source = SaveStorage.read(String(sourceId));
    if (!source) return null;

    const copy = SaveData.fromJson({
      ...source.serialize(),
      id: generateSaveId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    if (!SaveStorage.write(copy)) return null;

    console.log(t('debug_save_duplicated', { src: source.id, dst: copy.id }));
    return copy;
  }

  /**
   * Renames the trainer of a stored save.
   * @param {string} id
   * @param {string} trainerName
   * @returns {SaveData|null}
   */
  renameSlot(id, trainerName) {
    const save = SaveStorage.read(String(id));
    const name = String(trainerName || '').trim();
    if (!save || !name) return null;

    save.player.trainerName = name;
    save.updatedAt = Date.now();
    SaveStorage.write(save);
    if (this._currentSave && this._currentSave.id === save.id) {
      this._currentSave.player.trainerName = name;
    }
    console.log(t('debug_save_renamed', { id: save.id, name }));
    return save;
  }

  /**
   * @param {string} id
   * @returns {string|null} Pretty-printed JSON of a stored save
   */
  exportSlotAsJson(id) {
    const save = SaveStorage.read(String(id));
    return save ? JSON.stringify(save.serialize(), null, 2) : null;
  }

  /**
   * Imports a save file (rework format or original game export) and activates it.
   * @param {string} jsonString
   * @returns {SaveData|null}
   */
  importFromJson(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error(t('debug_save_import_failed'), err);
      return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    if (this._currentSave) this.saveCurrent();
    const save = SaveData.fromJson(parsed);
    this._currentSave = save;
    this.saveCurrent();
    console.log(t('debug_save_loaded', { id: save.id }));
    EventBus.getInstance().dispatch(new SaveLoadedEvent(save.id, save));
    return save;
  }

  /** @returns {SaveData|null} */
  getCurrentSave() {
    return this._currentSave;
  }

  /** @param {SaveData|null} save */
  setCurrentSave(save) {
    this._currentSave = save;
  }
}
