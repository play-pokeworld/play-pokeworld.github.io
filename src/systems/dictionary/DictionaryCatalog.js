/**
 * @file DictionaryCatalog.js
 * @brief DOM-free dictionary query service for items, moves and abilities.
 * Supports progressive item generation discovery, move learner categorization
 * and ability carrier lists.
 */

import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemKinds } from '../../data/items/ItemKinds.js';
import { MoveDB } from '../../data/battle/MoveDB.js';
import { TalentDB, TalentRarity } from '../../data/pokemon/TalentDB.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { MoveLearnset } from '../../data/pokemon/MoveLearnset.js';
import { MoveConfig } from '../../config/MoveConfig.js';
import { ItemGenerationRules } from '../../config/ItemGenerationRules.js';
import { ROUTE_DROPS } from '../../data/world/RouteDrops.js';
import { ShopDB } from '../../data/shops/ShopDB.js';
import { MineLootDB } from '../../data/items/MineLootDB.js';
import { QuestDB } from '../../data/quests/QuestDB.js';
import {
  LocalizationManager,
  t,
} from '../../localization/LocalizationManager.js';

const ATOLL_SHOP_ITEMS = Object.freeze({
  rarecandy: 25,
  leftovers: 120,
  choice_band: 260,
  choice_specs: 260,
});

export class DictionaryCatalog {
  /**
   * Localized item display name with TM/HM suffix parity with main.
   * @param {string} itemId
   * @returns {string}
   */
  static itemName(itemId) {
    const rawName = t(`item.${itemId}.name`);
    const isEn = LocalizationManager.getInstance().currentLang === 'en';
    const item = ItemDB.getInstance().getById(itemId);
    const isTm = itemId.startsWith('ct_') || item?.kind === ItemKinds.TM;
    const isHm = itemId.startsWith('cs_') || item?.kind === ItemKinds.HM;
    if (isTm) return isEn ? `${rawName} TM` : `${rawName} CT`;
    if (isHm) return isEn ? `${rawName} HM` : `${rawName} CS`;
    return rawName;
  }

  /**
   * Localized item category/type subtitle.
   * @param {Object} item
   * @returns {string}
   */
  static itemTypeLabel(item) {
    if (!item) return t('item_type_special').trim();
    if (item.kind === ItemKinds.STONE) return t('item_type_stone').trim();
    if (item.kind === ItemKinds.TREASURE) return t('item_type_treasure').trim();
    if (item.kind === ItemKinds.CANDY) return t('item_type_candy').trim();
    if (item.kind === ItemKinds.KEY) return t('item_type_key').trim();
    if (item.kind === ItemKinds.HELD) return t('item_type_held').trim();
    if (item.kind === ItemKinds.FOSSIL) return t('item_type_fossil').trim();
    if (item.kind === ItemKinds.TM || item.kind === ItemKinds.HM)
      return t('item_type_tm').trim();
    if (item.kind === ItemKinds.EVOLUTION)
      return t('item_type_evolution').trim();
    if (item.kind === ItemKinds.BALL) return t('cat_pokeballs').trim();
    if (item.id.endsWith('_berry') || item.id === 'prine_berry')
      return t('item_type_berry').trim();
    return t('item_type_special').trim();
  }

  /**
   * Localized rarity label for talents.
   * @param {number} rarity
   * @returns {string}
   */
  static rarityLabel(rarity) {
    if (rarity === TalentRarity.VERY_RARE) return t('rarity_rare_label');
    if (rarity === TalentRarity.RARE) return t('rarity_uncommon_label');
    return t('rarity_common_label');
  }

  /**
   * List of items visible in the dictionary for the player's progression.
   * @param {Object|null} save
   * @param {ReadonlyArray<string>} [accessibleRegions=['kanto']]
   * @returns {Array<Object>}
   */
  static getItems(save, accessibleRegions = ['kanto']) {
    const all = ItemDB.getInstance().getAll();
    const inventory = save?.inventory ?? null;
    const lang = LocalizationManager.getInstance().currentLang;

    return all
      .filter((item) => {
        if (!ItemGenerationRules.isItemGenUnlocked(item.id, accessibleRegions))
          return false;
        if (item.hidden && !(inventory?.count(item.id) > 0)) return false;
        return true;
      })
      .map((item) => {
        const ownedQty = inventory?.count(item.id) || 0;
        const name = DictionaryCatalog.itemName(item.id);
        return {
          id: item.id,
          kind: 'item',
          name,
          ownedQty,
          owned: ownedQty > 0,
          desc: t(`item.${item.id}.desc`),
          subtitle:
            ownedQty > 0
              ? t('dict_owned_qty', { count: ownedQty })
              : t('dict_not_owned'),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }

  /**
   * List of moves for the dictionary.
   * @param {Object|null} save
   * @returns {Array<Object>}
   */
  static getMoves(save) {
    const moves = MoveDB.getInstance().getAll();
    const lang = LocalizationManager.getInstance().currentLang;
    const collection = save?.collection?.getAll() || [];

    // Deduplicate by normalized name (same as main)
    const seenNames = new Set();
    const filtered = moves.filter((m) => {
      if (!m || !m.type) return false;
      const normalized = t(`move.${m.id}`)
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, '');
      if (seenNames.has(normalized)) return false;
      seenNames.add(normalized);
      return true;
    });

    return filtered
      .map((m) => {
        const name = t(`move.${m.id}`);
        const userCount = collection.filter((pokemon) =>
          (pokemon.moves || []).includes(m.id),
        ).length;
        return {
          id: m.id,
          kind: 'move',
          name,
          type: m.type,
          category: m.category,
          power: m.power,
          userCount,
          owned: userCount > 0,
          desc: t(`move_desc.${m.id}`),
          subtitle:
            userCount > 0
              ? t('dict_move_users', { count: userCount })
              : t('dict_move_users_none'),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }

  /**
   * List of abilities/talents for the dictionary.
   * @param {Object|null} save
   * @returns {Array<Object>}
   */
  static getAbilities(save) {
    const talents = TalentDB.getInstance().getAll();
    const lang = LocalizationManager.getInstance().currentLang;
    const collection = save?.collection?.getAll() || [];

    return talents
      .map((tDef) => {
        const name = t(`talent.${tDef.id}.name`);
        const unlockedInLedger =
          save?.talents?.has(tDef.id) ||
          (save?.talents?._unlocked &&
            Object.values(save.talents._unlocked).some((ids) =>
              ids.includes(tDef.id),
            ));
        const ownedByPokemon = collection.some((p) => p.talent === tDef.id);
        const unlocked = !!(unlockedInLedger || ownedByPokemon);
        const rarityText = DictionaryCatalog.rarityLabel(tDef.rarity);
        const statusText = unlocked
          ? t('dict_ability_unlocked')
          : t('dict_ability_locked');

        return {
          id: tDef.id,
          kind: 'talent',
          name,
          rarity: tDef.rarity,
          rarityLabel: rarityText,
          unlocked,
          owned: unlocked,
          desc: t(`talent.${tDef.id}.desc`),
          subtitle: `${statusText} · ${rarityText}`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }

  /**
   * Details of one item for the info panel.
   * @param {string} itemId
   * @param {Object|null} save
   * @returns {Object|null}
   */
  static getItemDetail(itemId, save) {
    const item = ItemDB.getInstance().getById(itemId);
    if (!item) return null;

    const sources = [];
    const addSource = (s) => {
      if (s && !sources.some((x) => x.text === s.text)) sources.push(s);
    };

    // Route drops
    for (const [locId, drops] of Object.entries(ROUTE_DROPS)) {
      if (drops.includes(itemId))
        addSource({ icon: 'mapPin', text: t(`location.${locId}`) });
    }

    // Shops
    const isTm = itemId.startsWith('ct_') || itemId.startsWith('cs_');
    for (const shop of ShopDB.getInstance().getAll()) {
      if (shop.items.includes(itemId)) {
        addSource({
          icon: 'shop',
          text: `${t(`shop.${shop.id}.name`)}${isTm ? ' · CT' : ''}`,
        });
      }
    }

    // Atoll shop
    if (ATOLL_SHOP_ITEMS[itemId]) {
      addSource({
        icon: 'atoll',
        text: `${t('battle_atoll_title')} — ${ATOLL_SHOP_ITEMS[itemId]} ${t('atoll_tokens')}`,
      });
    }

    // Mine
    if (MineLootDB.getInstance().has(itemId)) {
      addSource({ icon: 'pickaxe', text: t('mine_title') });
    }

    // Quests
    let hasMainQuest = false;
    let hasSideQuest = false;
    for (const quest of QuestDB.getInstance().getAll()) {
      if (quest.rewards?.items && Object.hasOwn(quest.rewards.items, itemId)) {
        if (quest.category === 'main') hasMainQuest = true;
        else hasSideQuest = true;
      }
    }
    if (hasMainQuest)
      addSource({ icon: 'bookOpen', text: t('dict_main_quest') });
    if (hasSideQuest)
      addSource({ icon: 'bookOpen', text: t('dict_side_quest') });

    // Fossil
    if (item.kind === ItemKinds.FOSSIL) {
      addSource({ icon: 'sparkle', text: t('fossil_lab') });
    }

    return {
      id: itemId,
      kind: 'item',
      name: DictionaryCatalog.itemName(itemId),
      typeLabel: DictionaryCatalog.itemTypeLabel(item),
      price: item.price || 0,
      ownedQty: save?.inventory?.count(itemId) || 0,
      desc: t(`item.${itemId}.desc`),
      sources: sources.length ? sources : [t('dict_unknown_source')],
    };
  }

  /**
   * Formatted move effects with status badges.
   * @param {Object} move
   * @returns {Array<{badge: string|null, text: string}>}
   */
  static formatMoveEffects(move) {
    if (!move) return [{ badge: null, text: t('no_special_effects') }];
    const effects = [];
    const add = (badge, text) => effects.push({ badge, text });

    for (const eff of move.effects || []) {
      const chance = eff.chance || (move.category === 'status' ? 100 : 0);
      if (eff.kind === 'status') {
        const s = eff.status;
        if (move.category === 'status') {
          add(s, t(`effect_${s}_stat`, { pct: chance }));
        } else if (chance > 0) {
          add(s, t(`effect_${s}_chance`, { pct: chance }));
        }
      } else if (eff.kind === 'flinch') {
        add('flinch', t('effect_flinch_chance', { pct: eff.chance || 30 }));
      } else if (
        eff.kind === 'stat' &&
        eff.stat === 'spd' &&
        eff.target === 'foe'
      ) {
        if (move.category === 'status') {
          add('slow', t('effect_slow_stat', { pct: chance }));
        } else {
          add('slow', t('effect_slow_chance', { pct: chance }));
        }
      } else if (eff.kind === 'drain') {
        add(null, t('effect_drain'));
      } else if (eff.kind === 'recoil' || eff.kind === 'recoil_max_hp') {
        add(null, t('effect_recoil'));
      } else if (eff.kind === 'heal') {
        add(
          null,
          t('effect_heal', { pct: Math.round((eff.fraction || 0.5) * 100) }),
        );
      }
    }

    if (move.hasTag?.('crit') || move.tags?.includes('crit')) {
      add(null, t('effect_crit'));
    }
    if (move.priority && move.priority > 0) {
      add(null, t('effect_priority', { prio: move.priority }));
    }

    return effects.length
      ? effects
      : [{ badge: null, text: t('no_special_effects') }];
  }

  /**
   * Pokémon species categorized by how they learn the move (level / TM / training).
   * @param {string} moveId
   * @returns {{level: Array<Object>, ctcs: Array<Object>, training: Array<Object>}}
   */
  static getMoveLearners(moveId) {
    const move = MoveDB.getInstance().getById(moveId);
    if (!move) return { level: [], ctcs: [], training: [] };

    const speciesList = PokemonDB.getInstance()
      .getAll()
      .sort((a, b) => a.dex - b.dex);
    const tmItems = ItemDB.getInstance()
      .getAll()
      .filter(
        (i) =>
          [ItemKinds.TM, ItemKinds.HM].includes(i.kind) && i.move === moveId,
      );
    const isTm = tmItems.length > 0;

    const level = [];
    const ctcs = [];
    const training = [];

    for (const species of speciesList) {
      const pool = MoveLearnset.poolFor(species.types);
      if (pool.includes(moveId)) {
        level.push(species);
      } else {
        const compatible =
          move.learnTypes.includes(MoveConfig.ANY_TYPE) ||
          move.type === MoveConfig.ANY_TYPE ||
          species.types.includes(move.type) ||
          move.learnTypes.some((type) => species.types.includes(type));
        if (isTm && compatible) {
          ctcs.push(species);
        } else if (
          MoveLearnset.trainingPoolFor(species.types).includes(moveId)
        ) {
          training.push(species);
        }
      }
    }

    return { level, ctcs, training };
  }

  /**
   * Details of one move for the info panel.
   * @param {string} moveId
   * @returns {Object|null}
   */
  static getMoveDetail(moveId) {
    const move = MoveDB.getInstance().getById(moveId);
    if (!move) return null;

    return {
      id: moveId,
      kind: 'move',
      name: t(`move.${moveId}`),
      type: move.type,
      category: move.category,
      categoryLabel: t(`move_cat_${move.category || 'status'}`),
      power: move.power || 0,
      desc: t(`move_desc.${moveId}`),
      effects: DictionaryCatalog.formatMoveEffects(move),
      learners: DictionaryCatalog.getMoveLearners(moveId),
    };
  }

  /**
   * Details of one ability/talent for the info panel.
   * @param {string} talentId
   * @param {Object|null} save
   * @returns {Object|null}
   */
  static getAbilityDetail(talentId, save) {
    const talent = TalentDB.getInstance().getById(talentId);
    if (!talent) return null;

    const allSpecies = PokemonDB.getInstance()
      .getAll()
      .sort((a, b) => a.dex - b.dex);
    const carriers = allSpecies.filter((s) => s.talents.includes(talentId));
    const hiddenCarriers = allSpecies.filter(
      (s) => s.hiddenTalent === talentId,
    );

    return {
      id: talentId,
      kind: 'talent',
      name: t(`talent.${talentId}.name`),
      rarity: talent.rarity,
      rarityLabel: DictionaryCatalog.rarityLabel(talent.rarity),
      desc: t(`talent.${talentId}.desc`),
      carriers,
      hiddenCarriers,
    };
  }

  /**
   * Filters entries by search string across name, id, description and type.
   * @param {Array<Object>} entries
   * @param {string} search
   * @returns {Array<Object>}
   */
  static filter(entries, search) {
    const query = String(search || '')
      .toLowerCase()
      .trim();
    if (!query) return entries;
    return entries.filter((e) => {
      const searchBlob =
        `${e.name} ${e.id} ${e.desc || ''} ${e.type ? t(`type.${e.type}`) : ''}`.toLowerCase();
      return searchBlob.includes(query);
    });
  }
}
