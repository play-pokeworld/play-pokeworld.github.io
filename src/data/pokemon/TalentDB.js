/**
 * @file TalentDB.js
 * @brief Read-only repository of the talents (abilities) (C++: class TalentDB : public DataRepository).
 * Built from data/raw/talents-data.js. Every entry is a frozen TalentDefinition:
 *   { id, rarity (1 common, 2 rare, 3 very rare), affinity[type ids | 'all'], effects[] }
 * An empty `effects` list means the talent has no battle effect yet (docs/DATA_COVERAGE.md).
 * Texts: t('talent.<id>.name') / t('talent.<id>.desc').
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { TALENTS_TABLE as GENERATED_TALENTS } from '../raw/talents-data.js';
import { TALENTS_CONTENT } from '../content/talents-content.js';
import { withContent } from '../core/ContentTables.js';

const TALENTS_TABLE = withContent(GENERATED_TALENTS, TALENTS_CONTENT);
import { TalentEffectKinds } from '../battle/TalentEffectKinds.js';

/** Talent rarities (C++: enum class TalentRarity). */
export const TalentRarity = Object.freeze({ COMMON: 1, RARE: 2, VERY_RARE: 3 });

const KNOWN_KINDS = new Set(Object.values(TalentEffectKinds));

export class TalentDB extends DataRepository {
  /** @type {TalentDB|null} */
  static _instance = null;

  /** @returns {TalentDB} */
  static getInstance() {
    if (!TalentDB._instance) TalentDB._instance = new TalentDB();
    return TalentDB._instance;
  }

  constructor() {
    super('TalentDB');
  }

  /** @protected @override */
  _build() {
    for (const [id, raw] of Object.entries(TALENTS_TABLE)) {
      this._entries.set(id, deepFreeze({
        id,
        rarity: Number(raw.rarity) || TalentRarity.COMMON,
        affinity: [...(raw.affinity || [])],
        effects: (raw.effects || []).map((effect) => ({ ...effect }))
      }));
    }
  }

  /**
   * @param {string} id
   * @param {string} kind - TalentEffectKinds value
   * @returns {Readonly<Object>[]} Effects of that kind (empty when none / unknown talent)
   */
  effectsOf(id, kind) {
    const talent = this.getById(id);
    return talent ? talent.effects.filter((effect) => effect.kind === kind) : [];
  }

  /** @override */
  validate() {
    const problems = [];
    for (const talent of this._entries.values()) {
      if (!Object.values(TalentRarity).includes(talent.rarity)) problems.push(this._problem(talent.id, 'rarity', talent.rarity));
      for (const effect of talent.effects) {
        if (!KNOWN_KINDS.has(effect.kind)) problems.push(this._problem(talent.id, 'effects', effect.kind));
      }
    }
    return problems;
  }
}
