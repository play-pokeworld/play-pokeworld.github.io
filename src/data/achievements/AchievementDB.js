/**
 * @file AchievementDB.js
 * @brief Read-only repository of achievement definitions and families (C++: class AchievementDB : public DataRepository).
 */

import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { ACHIEVEMENTS, ACHIEVEMENT_FAMILIES } from '../raw/achievements-data.js';
import { LocalizationManager } from '../../localization/LocalizationManager.js';

export class AchievementDB extends DataRepository {
  /** @type {AchievementDB|null} */
  static _instance = null;

  /** @returns {AchievementDB} */
  static getInstance() {
    if (!AchievementDB._instance) AchievementDB._instance = new AchievementDB();
    return AchievementDB._instance;
  }

  constructor() {
    super('AchievementDB');
  }

  /** @protected @override */
  _build() {
    /** @private @type {Map<string, Object>} */
    this._families = new Map();
    for (const [id, fam] of Object.entries(ACHIEVEMENT_FAMILIES)) {
      this._families.set(id, deepFreeze({ ...fam }));
    }

    for (const raw of ACHIEVEMENTS) {
      this._entries.set(raw.id, deepFreeze({ ...raw }));
    }
  }

  /**
   * Returns all achievement definitions.
   * @returns {ReadonlyArray<Object>}
   */
  getAll() {
    return super.getAll();
  }

  /**
   * Returns an achievement definition by id.
   * @param {string} id
   * @returns {Readonly<Object>|null}
   */
  getById(id) {
    return super.getById(id);
  }

  /**
   * Returns achievements belonging to the specified family.
   * @param {string} familyId
   * @returns {ReadonlyArray<Object>}
   */
  getByFamily(familyId) {
    return this.getAll().filter((ach) => ach.family === familyId);
  }

  /**
   * Returns all family definitions.
   * @returns {ReadonlyArray<Object>}
   */
  getFamilies() {
    return Object.freeze([...this._families.values()]);
  }

  /**
   * Returns a family definition by id.
   * @param {string} familyId
   * @returns {Readonly<Object>|null}
   */
  getFamily(familyId) {
    return this._families.get(familyId) || null;
  }

  /**
   * Returns the total number of tiers across all achievements.
   * @returns {number}
   */
  countTotalTiers() {
    return this.getAll().reduce((sum, ach) => sum + (Array.isArray(ach.tiers) ? ach.tiers.length : 0), 0);
  }

  /**
   * Returns the localized name of an achievement.
   * @param {Object} ach
   * @returns {string}
   */
  getLocalizedName(ach) {
    if (!ach) return '';
    const lang = LocalizationManager.getInstance().currentLang;
    return lang === 'en' ? ach.name_en : ach.name_fr;
  }

  /**
   * Returns the localized description of an achievement.
   * @param {Object} ach
   * @returns {string}
   */
  getLocalizedDesc(ach) {
    if (!ach) return '';
    const lang = LocalizationManager.getInstance().currentLang;
    return lang === 'en' ? ach.desc_en : ach.desc_fr;
  }

  /**
   * Returns the localized bonus label for a given tier value.
   * @param {Object} ach
   * @param {number} tierIndex
   * @returns {string}
   */
  getLocalizedBonusLabel(ach, tierIndex = 0) {
    if (!ach || !ach.bonus) return '';
    const lang = LocalizationManager.getInstance().currentLang;
    const values = ach.bonus.values || [];
    const val = values[Math.max(0, Math.min(tierIndex, values.length - 1))];
    const template = lang === 'en' ? ach.bonus.label_en : ach.bonus.label_fr;
    return (template || '').replace('{v}', String(val));
  }

  /**
   * Returns the localized family name.
   * @param {Object|string} familyOrId
   * @returns {string}
   */
  getLocalizedFamilyName(familyOrId) {
    const fam = typeof familyOrId === 'string' ? this.getFamily(familyOrId) : familyOrId;
    if (!fam) return '';
    const lang = LocalizationManager.getInstance().currentLang;
    return lang === 'en' ? fam.name_en : fam.name_fr;
  }
}
