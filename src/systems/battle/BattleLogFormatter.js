/**
 * @file BattleLogFormatter.js
 * @brief Turns language-neutral BattleLog entries into localized lines (C++: class
 * BattleLogFormatter). Raw ids in the parameters are translated here: moveId → move,
 * itemId → item, ballId → ball, stat, status, weather, terrain, type, bonus, trainerId → trainer,
 * previousTrainerId → previous, badgeTrainerId → badge; effectiveness and hits become the
 * optional suffixes of the damage line. The trainer quote needs two values (quoteTrainerId +
 * quoteKind 'intro' | 'win') and is resolved in format() into the `quote` parameter.
 */
import { t } from '../../localization/LocalizationManager.js';

/** @type {Readonly<Record<string, (value: any) => [string, string]>>} */
const TRANSLATORS = Object.freeze({
  moveId: (id) => ['move', t(`move.${id}`)],
  itemId: (id) => ['item', t(`item.${id}.name`)],
  ballId: (id) => ['ball', t(`item.${id}.name`)],
  stat: (stat) => ['stat', t(`stat_${stat}`)],
  status: (status) => ['status', t(`battle_effect_${status}`)],
  weather: (weather) => ['weather', t(`battle_log.weather.${weather}`)],
  terrain: (terrain) => ['terrain', t(`battle_log.terrain.${terrain}`)],
  type: (type) => ['type', t(`type.${type}`)],
  bonus: (bonus) => ['bonus', t(`battle_log.bonus_name.${bonus}`)],
  trainerId: (id) => ['trainer', t(`trainer.${id}.name`)],
  previousTrainerId: (id) => ['previous', t(`trainer.${id}.name`)],
  badgeTrainerId: (id) => ['badge', t(`trainer.${id}.badge`)],
  effectiveness: (value) => ['effect', value > 1 ? t('battle_log.effect.super') : value > 0 && value < 1 ? t('battle_log.effect.weak') : ''],
  hits: (hits) => ['hits', hits > 1 ? t('battle_log.hits', { hits }) : '']
});

export class BattleLogFormatter {
  /**
   * @param {import('./BattleLog.js').BattleLogEntry} entry
   * @returns {string}
   */
  static format(entry) {
    const params = {};
    const { quoteTrainerId, quoteKind, ...rest } = entry.params;
    if (quoteTrainerId) params.quote = t(`trainer.${quoteTrainerId}.${quoteKind}`);
    for (const [key, value] of Object.entries(rest)) {
      const translate = TRANSLATORS[key];
      if (translate) {
        const [name, text] = translate(value);
        params[name] = text;
      } else {
        params[key] = value;
      }
    }
    return t(entry.key, params);
  }
}
