/**
 * @file TutorialRules.js
 * @brief The original ten guided-tutorial steps and their one-time rewards.
 */
const step = (id, textId, objective, action, target = 1, reward = {}) => Object.freeze({
  id,
  titleKey: `tutorial_step_${textId}_title`,
  descriptionKey: `tutorial_step_${textId}_desc`,
  howKey: `tutorial_step_${textId}_how`,
  actionKey: `tutorial_step_${textId}_action`,
  objective,
  action,
  target,
  reward: Object.freeze({
    money: reward.money || 0,
    dungeonToken: reward.dungeonToken || 0,
    items: Object.freeze({ ...(reward.items || {}) })
  })
});

export const TutorialRules = Object.freeze({
  STEPS: Object.freeze([
    step('route1_battles', 'route1', 'route1_wins', 'route1', 5, { money: 300, items: { occa_berry: 1 } }),
    step('set_pokeball_filter', 'setball', 'ball_filter', 'ball_filters', 1, { items: { pokeball: 25 } }),
    step('catch_first', 'catch', 'first_catch', 'route1'),
    step('buy_pokeballs', 'buyballs', 'buy_pokeball', 'shop', 1, { money: 200 }),
    step('honor_ball_intro', 'honor', 'honor_ball', 'ball_filters'),
    step('open_poke_sheet', 'sheet', 'pokemon_sheet', 'pokemon_sheet', 1, { money: 200 }),
    step('open_bag', 'bag', 'bag', 'bag', 1, { items: { pokeball: 5 } }),
    step('open_pokedex', 'dex', 'pokedex_entry', 'pokedex', 1, { money: 500 }),
    step('dungeon_intro', 'dungeon', 'dungeon_token', 'currencies', 1, { dungeonToken: 100 }),
    step('dungeon_clear', 'dungeon2', 'dungeon_entry', 'viridianforest', 1, { money: 300 })
  ])
});
