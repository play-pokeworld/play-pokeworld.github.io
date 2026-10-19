/**
 * @file SaveStorage.js
 * @brief Persistence repository of save slots (C++ equivalent: class SaveStorage, a repository).
 * Knows the storage layout (slot payloads + library index) and nothing about the game session.
 * Layout:
 *   StorageKeys.SAVE_LIBRARY             ordered JSON array of save summaries (the source of truth)
 *   StorageKeys.SAVE_SLOT_PREFIX + id    JSON payload of one save
 *   StorageKeys.ACTIVE_SAVE_ID           id of the active save
 * A save is written ONCE per save (its slot payload); the index only holds the summary shown
 * by the save menu. StorageKeys.ACTIVE_SAVE (full mirror written by builds before v1.4) is only
 * read by the one-time legacy migration, then removed.
 */

import { SaveData } from '../data/save/SaveData.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';

export class SaveStorage {
  /**
   * @returns {Array<Object>|null} Library index, or null when it was never written
   */
  static readIndex() {
    const list = LocalStore.getJson(StorageKeys.SAVE_LIBRARY, null);
    return Array.isArray(list) ? list.filter((entry) => entry && entry.id) : (list === null ? null : []);
  }

  /** @param {Array<Object>} list */
  static writeIndex(list) {
    LocalStore.setJson(StorageKeys.SAVE_LIBRARY, list);
  }

  /**
   * @param {SaveData} save
   * @returns {Object} Summary stored in the library index
   */
  static summaryOf(save) {
    return {
      id: save.id,
      name: save.player.trainerName,
      background: save.background,
      badges: save.player.getBadgeCount(),
      caught: save.pokedex.getCaughtCount(),
      playTimeSeconds: save.player.playTimeSeconds,
      updatedAt: save.updatedAt
    };
  }

  /**
   * Inserts or refreshes the summary of a save in the library index.
   * @param {SaveData} save
   */
  static upsertIndex(save) {
    const list = SaveStorage.readIndex() || [];
    const index = list.findIndex((entry) => entry.id === save.id);
    if (index >= 0) list[index] = SaveStorage.summaryOf(save);
    else list.push(SaveStorage.summaryOf(save));
    SaveStorage.writeIndex(list);
  }

  /**
   * @param {string} id
   * @returns {SaveData|null}
   */
  static read(id) {
    const json = LocalStore.getJson(`${StorageKeys.SAVE_SLOT_PREFIX}${id}`, null);
    if (!json) return null;
    return SaveData.fromJson(json);
  }

  /**
   * Writes a slot payload and refreshes the index.
   * @param {SaveData} save
   * @returns {boolean}
   */
  static write(save) {
    const ok = LocalStore.setJson(`${StorageKeys.SAVE_SLOT_PREFIX}${save.id}`, save.serialize());
    if (ok) SaveStorage.upsertIndex(save);
    return ok;
  }

  /**
   * Marks a save as the active one (only its id is stored).
   * @param {SaveData} save
   */
  static writeActive(save) {
    LocalStore.setString(StorageKeys.ACTIVE_SAVE_ID, save.id);
  }

  /**
   * Removes a slot payload, its index entry and the active mirror when it pointed to it.
   * @param {string} id
   */
  static remove(id) {
    LocalStore.remove(`${StorageKeys.SAVE_SLOT_PREFIX}${id}`);
    SaveStorage.writeIndex((SaveStorage.readIndex() || []).filter((entry) => entry.id !== id));

    if (LocalStore.getString(StorageKeys.ACTIVE_SAVE_ID) === id) LocalStore.remove(StorageKeys.ACTIVE_SAVE_ID);
  }

  /**
   * One-time migration used when the library index has never been written:
   * collects slot payloads, prototype slots and the single active save, then writes the index.
   * @returns {SaveData[]}
   */
  static migrateLegacyLayout() {
    const found = new Map();
    const keep = (save) => {
      if (save && !found.has(save.id)) found.set(save.id, save);
    };

    for (const key of LocalStore.keys()) {
      if (key.startsWith(StorageKeys.SAVE_SLOT_PREFIX)) {
        keep(SaveStorage.read(key.substring(StorageKeys.SAVE_SLOT_PREFIX.length)));
      } else if (key.startsWith(StorageKeys.LEGACY_SAVE_SLOT_PREFIX)) {
        keep(SaveStorage._fromJson(LocalStore.getJson(key, null)));
        LocalStore.remove(key);
      }
    }
    keep(SaveStorage._fromJson(LocalStore.getJson(StorageKeys.ACTIVE_SAVE, null)));
    LocalStore.remove(StorageKeys.ACTIVE_SAVE);

    const saves = [...found.values()];
    for (const save of saves) {
      LocalStore.setJson(`${StorageKeys.SAVE_SLOT_PREFIX}${save.id}`, save.serialize());
    }
    SaveStorage.writeIndex(saves.map((save) => SaveStorage.summaryOf(save)));
    return saves;
  }

  /**
   * @private
   * @param {Object|null} json
   * @returns {SaveData|null}
   */
  static _fromJson(json) {
    if (!json || typeof json !== 'object') return null;
    return SaveData.fromJson(json);
  }
}
