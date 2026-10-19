/**
 * @file ChallengeStates.js
 * @brief State of a gym / league challenge seen from the player (original location-info.js button).
 */
export const ChallengeStates = Object.freeze({
  /** Not enough badges of the region. */
  LOCKED: 'locked',
  /** Never beaten: first win gives the badge and the reward. */
  CHALLENGE: 'challenge',
  /** Already beaten: rematch team, no reward money. */
  REMATCH: 'rematch'
});
