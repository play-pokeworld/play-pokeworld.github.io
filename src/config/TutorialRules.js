/**
 * @file TutorialRules.js
 * @brief The original ten guided-tutorial steps and their one-time rewards.
 */

/**
 * What a guided step asks the player to look at. The tutorial never does it for them: it shows
 * where the control is and lets them click. Each reveal is a semantic description (a place, a
 * window, a shortcut); the UI layer turns it into selectors and into the button's label, because
 * both depend on where the player currently is.
 */
export const TutorialReveals = Object.freeze({
  /**
   * A place on the map, then one of its action tiles once the player stands there.
   * @param {string} locationId
   * @param {'battle'|'shop'|'dungeon'} tile - Action tile the step expects inside the Location window
   */
  travel: (locationId, tile) => Object.freeze({ kind: 'travel', locationId, tile }),
  /**
   * A dashboard window, optionally one precise control inside it.
   * @param {string} windowId - Dashboard window id (`win-*`)
   * @param {'ball_row'|'team_card'|null} [control=null]
   * @param {string|null} [arg=null] - Control argument (the capture filter id for `ball_row`)
   */
  window: (windowId, control = null, arg = null) => Object.freeze({ kind: 'window', windowId, control, arg }),
  /**
   * A shortcut button of the Shortcuts window.
   * @param {'inventory'|'pokedex'} shortcutId - `ShortcutIds` value, i.e. the button's `data-panel`
   */
  shortcut: (shortcutId) => Object.freeze({ kind: 'shortcut', shortcutId })
});

/**
 * Capture filter the early steps point at: the tutorial always works on the "new" row, because it is
 * the one a fresh save shows with an empty (grey) ball. The step targets it and its text names it —
 * both from this one id.
 */
export const TUTORIAL_BALL_ROW = 'new';

/**
 * @param {string} id
 * @param {string} textId - Suffix of the `tutorial_step_<textId>_*` localization keys
 * @param {string} objective - Completion rule id (see TutorialSystem)
 * @param {Readonly<Object>} reveal - TutorialReveals descriptor
 * @param {number} [target=1]
 * @param {Object} [reward]
 */
const step = (id, textId, objective, reveal, target = 1, reward = {}) => Object.freeze({
  id,
  titleKey: `tutorial_step_${textId}_title`,
  descriptionKey: `tutorial_step_${textId}_desc`,
  howKey: `tutorial_step_${textId}_how`,
  objective,
  reveal,
  target,
  reward: Object.freeze({
    money: reward.money || 0,
    dungeonToken: reward.dungeonToken || 0,
    items: Object.freeze({ ...(reward.items || {}) })
  })
});

export const TutorialRules = Object.freeze({
  STEPS: Object.freeze([
    step('route1_battles', 'route1', 'route1_wins', TutorialReveals.travel('route1', 'battle'), 5, { money: 300, items: { occa_berry: 1 } }),
    step('set_pokeball_filter', 'setball', 'ball_filter', TutorialReveals.window('win-pokeballs', 'ball_row', TUTORIAL_BALL_ROW), 1, { items: { pokeball: 25 } }),
    step('catch_first', 'catch', 'first_catch', TutorialReveals.travel('route1', 'battle')),
    step('buy_pokeballs', 'buyballs', 'buy_pokeball', TutorialReveals.travel('pallet', 'shop'), 1, { money: 200 }),
    step('honor_ball_intro', 'honor', 'honor_ball', TutorialReveals.window('win-pokeballs')),
    step('open_poke_sheet', 'sheet', 'pokemon_sheet', TutorialReveals.window('win-team', 'team_card'), 1, { money: 200 }),
    step('open_bag', 'bag', 'bag', TutorialReveals.shortcut('inventory'), 1, { items: { pokeball: 5 } }),
    step('open_pokedex', 'dex', 'pokedex_entry', TutorialReveals.shortcut('pokedex'), 1, { money: 500 }),
    step('dungeon_intro', 'dungeon', 'dungeon_token', TutorialReveals.window('win-currency'), 1, { dungeonToken: 100 }),
    step('dungeon_clear', 'dungeon2', 'dungeon_entry', TutorialReveals.travel('viridianforest', 'dungeon'), 1, { money: 300 })
  ])
});
