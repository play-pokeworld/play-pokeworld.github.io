/**
 * @file AnimationPreferences.js
 * @brief Supported accessibility and battle-animation preference identifiers.
 */

export const AnimationPreferences = Object.freeze({
  CAPTURE: 'capture',
  UI_FEEDBACK: 'ui'
});

export const DEFAULT_ANIMATION_PREFERENCES = Object.freeze({
  [AnimationPreferences.CAPTURE]: true,
  [AnimationPreferences.UI_FEEDBACK]: true
});
