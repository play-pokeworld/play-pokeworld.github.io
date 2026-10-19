/**
 * @file QuestRewardText.js
 * @brief Localized one-line summary of the rewards of a QuestDB entry
 * (C++: std::string questRewardText(const QuestRewards&)). Rewards are data, never prewritten text.
 */
import { t } from '../../localization/LocalizationManager.js';

/**
 * @param {{questPoints: number, items: Object<string, number>, pokemon: Object|null}} rewards
 * @returns {string} Empty when the quest gives nothing
 */
export function questRewardText(rewards) {
  const parts = [];
  if (rewards.questPoints > 0) parts.push(t('quest_reward_points', { count: rewards.questPoints }));
  for (const [itemId, quantity] of Object.entries(rewards.items)) {
    parts.push(t('quest_reward_item', { name: t(`item.${itemId}.name`), quantity }));
  }
  if (rewards.pokemon) {
    parts.push(t('quest_reward_pokemon', { name: t(`pokemon.${rewards.pokemon.species}`), level: rewards.pokemon.level }));
  }
  return parts.length > 0 ? t('quest_reward_line', { rewards: parts.join(t('list_separator')) }) : '';
}
