/**
 * @file LocalQuestBattleContent.js
 * @brief Manual town pools used by the original local-quest battle flow.
 * The encounter rows use stable species ids and explicit levels; generated raw tables stay untouched.
 */
const pool = (...entries) => Object.freeze(entries.map((entry) => Object.freeze(entry)));
const row = (species, level) => ({ species, minLevel: level, maxLevel: level });

export const LOCAL_QUEST_BATTLE_TOWN_POOLS = Object.freeze({
  azalea: pool(
    row('zubat', 16), row('ekans', 16), row('koffing', 18), row('rattata', 17)
  ),
  goldenrod: pool(
    row('rattata', 20), row('raticate', 22), row('zubat', 20), row('koffing', 22), row('grimer', 22)
  ),
  mahogany: pool(
    row('raticate', 27), row('zubat', 26), row('grimer', 28), row('koffing', 29), row('weezing', 30)
  ),
  olivine: pool(
    row('tentacool', 24), row('krabby', 24), row('machop', 26), row('tentacruel', 26)
  ),
  cherrygrove: pool(
    row('rattata', 6), row('pidgey', 6), row('sentret', 6)
  ),
  newbark: pool(
    row('sentret', 4), row('pidgey', 4), row('rattata', 4)
  ),
  violet: pool(
    row('pidgey', 10), row('spearow', 10), row('hoothoot', 10)
  ),
  ecruteak: pool(
    row('gastly', 22), row('haunter', 24), row('koffing', 23)
  ),
  blackthorn: pool(
    row('dratini', 32), row('geodude', 32), row('crobat', 34)
  )
});

export const LOCAL_QUEST_BATTLE_FALLBACK_POOL = pool(
  row('rattata', 10), row('zubat', 10), row('ekans', 10)
);
