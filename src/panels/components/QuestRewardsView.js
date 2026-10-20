/**
 * @file QuestRewardsView.js
 * @brief Renders the reward data itself as currency, item and Pokémon entries.
 * Reward amounts and identities come only from QuestDB; no reward sentence is
 * authored or kept in localization, so changing quest data changes this list.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { QuestRules } from '../../config/QuestRules.js';
import { CURRENCIES } from '../../data/save/CurrencyDefinitions.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

/** @param {*} value @returns {number} */
function positiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

/**
 * Builds the visible reward entries directly from a quest's reward object.
 * @param {{currencies?: Object<string, number>, questPoints?: number, items?: Object<string, number>, pokemon?: Object|null}} rewards
 * @returns {Array<Object>}
 */
export function questRewardEntries(rewards = {}) {
  const currencyAmounts = { ...(rewards.currencies || {}) };
  const legacyQuestPoints = positiveInteger(rewards.questPoints);
  if (legacyQuestPoints > 0 && currencyAmounts[QuestRules.REWARD_CURRENCY] == null) {
    currencyAmounts[QuestRules.REWARD_CURRENCY] = legacyQuestPoints;
  }

  const entries = [];
  for (const definition of CURRENCIES) {
    const quantity = positiveInteger(currencyAmounts[definition.id]);
    if (!quantity) continue;
    entries.push({
      kind: 'currency',
      id: definition.id,
      quantity,
      label: t(definition.labelKey),
      icon: AssetPaths.currency(definition.iconStem)
    });
  }

  const items = rewards.items || {};
  for (const [itemId, rawQuantity] of Object.entries(items)) {
    const quantity = positiveInteger(rawQuantity);
    if (!quantity) continue;
    const item = ItemDB.getInstance().getById(itemId);
    entries.push({
      kind: 'item',
      id: itemId,
      quantity,
      label: item ? t(`item.${itemId}.name`) : itemId,
      icon: ItemDB.getInstance().getImagePath(itemId)
    });
  }

  const rewardPokemon = rewards.pokemon;
  if (rewardPokemon?.species) {
    const species = PokemonDB.getInstance().getById(rewardPokemon.species);
    entries.push({
      kind: 'pokemon',
      id: rewardPokemon.species,
      quantity: 1,
      level: Math.max(1, Math.floor(Number(rewardPokemon.level) || 1)),
      form: rewardPokemon.form || '',
      shiny: !!rewardPokemon.shiny,
      label: species ? t(species.getNameKey()) : rewardPokemon.species
    });
  }
  return entries;
}

/** @param {Object} entry */
function rewardEntryView(entry) {
  const row = new UIContainer({ className: `pw-quest-reward-entry pw-quest-reward-entry--${entry.kind}` });
  if (entry.kind === 'pokemon') {
    row.addChild(new UIPokemonSprite({
      species: entry.id,
      form: entry.form,
      shiny: entry.shiny,
      alt: entry.label,
      size: PokemonSpriteSizes.CONTEXT,
      className: 'pw-quest-reward-pokemon'
    }));
  } else {
    row.addChild(new UIImage({
      src: entry.icon,
      alt: entry.label,
      className: 'pw-quest-reward-icon',
      pixelated: entry.kind === 'item'
    }));
  }
  row.addChild(new UIText({ tagName: 'span', className: 'pw-quest-reward-name', text: entry.label }));
  if (entry.kind === 'currency') {
    row.addChild(new UIText({
      tagName: 'span',
      className: 'pw-quest-reward-quantity',
      text: TextFormatter.formatNumber(entry.quantity)
    }));
  } else if (entry.kind === 'item') {
    row.addChild(new UIText({
      tagName: 'span',
      className: 'pw-quest-reward-quantity',
      text: `×${TextFormatter.formatNumber(entry.quantity)}`
    }));
  } else {
    row.addChild(new UIText({ tagName: 'span', className: 'pw-quest-reward-level', text: t('level_short_value', { level: entry.level }) }));
  }
  row.setTooltip(entry.kind === 'currency' ? `${entry.label} · ${TextFormatter.formatNumber(entry.quantity)}` : entry.label);
  return row;
}

export class QuestRewardsView extends UIContainer {
  constructor() {
    super({ className: 'pw-quest-rewards', name: 'QuestRewardsView' });
  }

  /** @param {Object} rewards */
  setRewards(rewards) {
    this.clearChildren();
    for (const entry of questRewardEntries(rewards)) this.addChild(rewardEntryView(entry));
  }
}
