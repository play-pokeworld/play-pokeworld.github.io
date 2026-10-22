/**
 * @file LocaleCatalog.js
 * @brief Declares which translation modules make up each language (C++ equivalent: static const LocaleDomain[]).
 * Adding a translation file = adding one line per language here. Nothing else to edit.
 *
 * Key naming produced by LocalizationManager:
 *   - flat domain (no prefix)         'key'                  -> t('key')
 *   - prefixed domain                 { a: 'x' }, 'type'     -> t('type.a')
 *   - nested objects are dotted       { a: { name: 'x' } }   -> t('talent.a.name')
 *   - arrays are indexed              [null, 'Bulbasaur']    -> t('pokemon.1')
 */

import { L_en_ui } from './en/ui.js';
import { L_en_combat } from './en/combat.js';
import { L_en_economy } from './en/economy.js';
import { L_en_messages } from './en/messages.js';
import { L_en_quests } from './en/quests.js';
import { L_en_base } from './en/base.js';
import { L_en_items } from './en/items.js';
import { L_en_stats } from './en/stats.js';
import { L_en_pokedex } from './en/pokedex.js';
import { L_en_types } from './en/types.js';
import { L_en_talents } from './en/talents.js';
import { L_en_trainers } from './en/trainers.js';
import { L_en_shops } from './en/shops.js';
import { L_en_lore } from './en/lore.js';
import { L_en_npc } from './en/npc.js';
import { puzzles as en_puzzles } from './en/puzzles.js';
import { L_location_names_en } from './en/locations.js';
import { L_pokemon_names_en } from './en/pokemon-names.js';
import { L_move_names_en } from './en/move-names.js';
import { L_en_move_descs } from './en/move-descs.js';
import { save as en_save } from './en/save.js';
import { starter as en_starter } from './en/starter.js';
import { notifications as en_notifications } from './en/notifications.js';
import { debug as en_debug } from './en/debug.js';
import { panels as en_panels } from './en/panels.js';
import { settings as en_settings } from './en/settings.js';
import { battleLog as en_battle_log } from './en/battle-log.js';

import { L_fr_ui } from './fr/ui.js';
import { L_fr_combat } from './fr/combat.js';
import { L_fr_economy } from './fr/economy.js';
import { L_fr_messages } from './fr/messages.js';
import { L_fr_quests } from './fr/quests.js';
import { L_fr_base } from './fr/base.js';
import { L_fr_items } from './fr/items.js';
import { L_fr_stats } from './fr/stats.js';
import { L_fr_pokedex } from './fr/pokedex.js';
import { L_fr_types } from './fr/types.js';
import { L_fr_talents } from './fr/talents.js';
import { L_fr_trainers } from './fr/trainers.js';
import { L_fr_shops } from './fr/shops.js';
import { L_fr_lore } from './fr/lore.js';
import { L_fr_npc } from './fr/npc.js';
import { puzzles as fr_puzzles } from './fr/puzzles.js';
import { L_location_names_fr } from './fr/locations.js';
import { L_pokemon_names_fr } from './fr/pokemon-names.js';
import { L_move_names_fr } from './fr/move-names.js';
import { L_fr_move_descs } from './fr/move-descs.js';
import { save as fr_save } from './fr/save.js';
import { starter as fr_starter } from './fr/starter.js';
import { notifications as fr_notifications } from './fr/notifications.js';
import { debug as fr_debug } from './fr/debug.js';
import { panels as fr_panels } from './fr/panels.js';
import { settings as fr_settings } from './fr/settings.js';
import { battleLog as fr_battle_log } from './fr/battle-log.js';

/**
 * @typedef {Object} LocaleDomain
 * @property {Object|Array} source - Translation module export
 * @property {string} [prefix]     - Namespace prepended to every key of the module
 */

/** Language used when a key is missing in the active language. */
export const FALLBACK_LANGUAGE = 'fr';

/** @type {Readonly<Record<string, ReadonlyArray<LocaleDomain>>>} */
export const LOCALE_CATALOG = Object.freeze({
  en: Object.freeze([
    { source: L_en_ui },
    { source: L_en_combat },
    { source: L_en_economy },
    { source: L_en_messages },
    { source: L_en_quests, prefix: 'quests' },
    { source: L_en_base },
    { source: L_en_items, prefix: 'item' },
    { source: L_en_stats },
    { source: L_en_pokedex },
    { source: L_en_types, prefix: 'type' },
    { source: L_en_talents, prefix: 'talent' },
    { source: L_en_trainers, prefix: 'trainer' },
    { source: L_en_shops, prefix: 'shop' },
    { source: L_en_lore, prefix: 'lore' },
    { source: L_en_npc, prefix: 'npc' },
    { source: en_puzzles, prefix: 'puzzles' },
    { source: L_location_names_en, prefix: 'location' },
    { source: L_pokemon_names_en, prefix: 'pokemon' },
    { source: L_move_names_en, prefix: 'move' },
    { source: L_en_move_descs, prefix: 'move_desc' },
    { source: en_save },
    { source: en_starter },
    { source: en_notifications },
    { source: en_debug },
    { source: en_panels },
    { source: en_settings },
    { source: en_battle_log, prefix: 'battle_log' }
  ]),
  fr: Object.freeze([
    { source: L_fr_ui },
    { source: L_fr_combat },
    { source: L_fr_economy },
    { source: L_fr_messages },
    { source: L_fr_quests, prefix: 'quests' },
    { source: L_fr_base },
    { source: L_fr_items, prefix: 'item' },
    { source: L_fr_stats },
    { source: L_fr_pokedex },
    { source: L_fr_types, prefix: 'type' },
    { source: L_fr_talents, prefix: 'talent' },
    { source: L_fr_trainers, prefix: 'trainer' },
    { source: L_fr_shops, prefix: 'shop' },
    { source: L_fr_lore, prefix: 'lore' },
    { source: L_fr_npc, prefix: 'npc' },
    { source: fr_puzzles, prefix: 'puzzles' },
    { source: L_location_names_fr, prefix: 'location' },
    { source: L_pokemon_names_fr, prefix: 'pokemon' },
    { source: L_move_names_fr, prefix: 'move' },
    { source: L_fr_move_descs, prefix: 'move_desc' },
    { source: fr_save },
    { source: fr_starter },
    { source: fr_notifications },
    { source: fr_debug },
    { source: fr_panels },
    { source: fr_settings },
    { source: fr_battle_log, prefix: 'battle_log' }
  ])
});
