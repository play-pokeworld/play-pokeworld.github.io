/**
 * @file EntryRules.js
 * @brief Effects when a combatant enters the battle (C++: class EntryRules), port of the
 * original triggerEntryTalents: cure_on_switch (Natural Cure), entry_foe_stat (Intimidate:
 * direct modifier unless the foe has a `blockedBy` talent or a protect item; others go through
 * StatChangeRules), entry_debuff berries (×ENTRY_DEBUFF_MULT on a foe stat; on HP the foe loses
 * the HP above 85 % of its max HP — the original lowered max HP), entry_weather (8 turns with
 * the matching weather item, weather_duration talents), entry_terrain (8 turns with the
 * terrain item).
 */
import { BattleRules } from '../../config/BattleRules.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { StatChangeRules } from './StatChangeRules.js';
import { StatusRules } from './StatusRules.js';
import { weatherTurns } from './MoveEffectHandlers.js';

export class EntryRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant - Entering combatant
   * @param {import('./BattleCombatant.js').BattleCombatant} foe
   * @param {import('./BattleField.js').BattleField} field
   * @param {import('./BattleLog.js').BattleLog} log
   */
  static apply(combatant, foe, field, log) {
    if (combatant.status && combatant.hasTalentEffect(TalentEffectKinds.CURE_ON_SWITCH)) StatusRules.cure(combatant, log);
    for (const effect of combatant.talentEffects(TalentEffectKinds.ENTRY_FOE_STAT)) EntryRules._foeStat(effect, foe, log);
    EntryRules._debuffBerry(combatant, foe, log);
    for (const effect of combatant.talentEffects(TalentEffectKinds.ENTRY_WEATHER)) {
      const item = combatant.heldEffect(HeldEffectKinds.WEATHER);
      const base = item && item.weather === effect.weather ? BattleRules.FIELD_EXTENDED_TURNS : BattleRules.FIELD_TURNS;
      field.setWeather(effect.weather, weatherTurns(base, combatant));
      log.add('battle_log.weather_set', { name: combatant.name, weather: effect.weather });
    }
    for (const effect of combatant.talentEffects(TalentEffectKinds.ENTRY_TERRAIN)) {
      const turns = combatant.heldEffect(HeldEffectKinds.TERRAIN) ? BattleRules.FIELD_EXTENDED_TURNS : BattleRules.FIELD_TURNS;
      field.setTerrain(effect.terrain, turns);
      log.add('battle_log.terrain_set', { name: combatant.name, terrain: effect.terrain });
    }
  }

  /** @private */
  static _foeStat(effect, foe, log) {
    if (!effect.blockedBy) {
      StatChangeRules.apply(foe, effect.stat, effect.mult, log);
      return;
    }
    const blocked = foe.getTalentIds().some((id) => effect.blockedBy.includes(id)) || !!foe.heldEffect(HeldEffectKinds.PROTECT);
    if (blocked) {
      log.add('battle_log.stat_blocked', { name: foe.name, stat: effect.stat });
      return;
    }
    StatChangeRules.applyRaw(foe, effect.stat, effect.mult);
    log.add('battle_log.stat_down', { name: foe.name, stat: effect.stat });
  }

  /** @private */
  static _debuffBerry(combatant, foe, log) {
    const berry = combatant.heldEffect(HeldEffectKinds.ENTRY_DEBUFF);
    if (!berry) return;
    log.add('battle_log.item_debuff', { name: combatant.name, itemId: combatant.pokemon.heldItem });
    if (berry.stat === 'hp') {
      const cap = Math.max(1, Math.floor(foe.maxHp * BattleRules.ENTRY_DEBUFF_MULT));
      if (foe.hp > cap) foe.takeDamage(foe.hp - cap);
      return;
    }
    StatChangeRules.apply(foe, berry.stat, BattleRules.ENTRY_DEBUFF_MULT, log);
  }
}
