/**
 * PokéWorld UI — ECS-native design system components (public index)
 *
 * Base objects rebuilt on the real engine ECS: every UI element is an
 * entity (UIRender + UIInteractive + UIState components) whose visual
 * output is a virtual tree themed exclusively through --pw-* tokens.
 *
 * @module ui/components
 */
export { THEME_TOKENS, THEME_IDS, SPRITE_SIZES, spriteSizeFor, token, contrastRatio, assertContrast, MIN_CONTRAST_RATIO } from './theme.js';
export { renderChildren, entityDataset, cx } from './component-utils.js';
// Wave 32 — THE shared panel-header constructor (see panel-header.js).
export { panelHeaderVNode, panelHeaderHTML } from './panel-header.js';
// Wave 33 — the same constructor applied to the static index.html headers.
export { pwBuildStaticHeaders } from './static-headers.js';
export { createButton, createToggle, BUTTON_VARIANTS } from './controls.js';
export { createHeader, createFooter, createPanel, createWindow } from './containers.js';
export { createLayout, createVerticalLayout, createHorizontalLayout, createGridLayout } from './layouts.js';
export { createToolbar } from './toolbar.js';
export { createPokemonSprite, pokemonSpriteVNode, POKEMON_SPRITE_SIZES } from './sprite.js';
export { pokeCardVNode, pokeCardHTML } from './poke-card.js';
// Wave 42 — templates convergence: the card adapter now lives here
// (DS component, next to poke-card/poke-full-card), class unchanged.
export { PokemonCardTemplate } from './pokemon-card-element.js';
export { pokeFullCardVNode, pokeFullCardHTML } from './poke-full-card.js';
export { filterBarVNode, filterBarHTML } from './filter-bar.js';
export { moneyRowVNode, moneyRowHTML } from './money-row.js';
export {
  saveContextMenuVNode, saveContextMenuHTML,
  saveIconGridVNode, saveIconGridHTML,
  saveProfileCurrentIconVNode, saveProfileCurrentIconHTML,
} from './save-extras.js';
export { moveButtonsBarVNode, moveButtonsBarHTML } from './move-buttons.js';
export { machineWindowVNode, machineWindowHTML } from './machine-window.js';
export { saveCardVNode, saveCardHTML, normalizeSaveCardBackground, SAVE_CARD_BACKGROUNDS } from './save-card.js';
export { moveRowVNode, moveRowHTML } from './move-row.js';
export {
  statRowVNode,
  statRowsHTML,
  rankPanelVNode,
  abilityChipVNode,
  talentBlockVNode,
  shinyToggleVNode,
  protectionBarVNode,
  evoMethodRowVNode,
  evoMethodsVNode,
  evoMethodsHTML,
} from './poke-detail.js';
export {
  sessionStatGridVNode,
  summarySectionTitleVNode,
  summaryEmptyVNode,
  damageRowVNode,
  damageListVNode,
  captureEntryVNode,
  captureListVNode,
  itemEntryVNode,
  itemListVNode,
  lootChipVNode,
} from './session-summary.js';
export { trainerCardVNode, trainerCardHTML } from './trainer-card.js';
export {
  managementTabVNode,
  managementTabBarVNode,
  managementTabBarHTML,
  upgradeCardVNode,
  upgradeGridVNode,
  automationToggleCardVNode,
  automationToggleRowVNode,
  managementBlockVNode,
  managementBlocksHTML,
  automationFieldVNode,
  automationRulesGridVNode,
  automationRulesGridHTML,
  queuePanelVNode,
  automationSlotCardVNode,
  hatcherySlotCardVNode,
} from './management.js';
export { staffSummaryVNode, staffCardVNode, staffListVNode, staffListHTML } from './staff.js';
export { swapFooterVNode, swapFooterHTML } from './swap-footer.js';
export {
  atollHeroVNode,
  atollNavVNode,
  atollRotationMetaVNode,
  atollGroupDescVNode,
  atollSpriteChipVNode,
  atollSpriteRowVNode,
  atollRankBadgeVNode,
  atollBanRowVNode,
  atollModeCardVNode,
  atollModeGridVNode,
  atollHomeCardVNode,
  atollHomeGridVNode,
  atollRunCardVNode,
  atollShopCardVNode,
  atollShopGridVNode,
} from './atoll.js';
export {
  locOverviewVNode,
  locLoreVNode,
  locActionVNode,
  locActionGridVNode,
  locUnlockTipVNode,
  locTimerChipVNode,
  locWildMetaVNode,
  locWildCardVNode,
  locWildGridVNode,
  locDropsVNode,
  locAlcovesVNode,
  mapHelpCardVNode,
  mapHelpCardHTML,
} from './map-dressing.js';
export {
  guideBtnVNode,
  guideSectionCardVNode,
  guideHomeVNode,
  guidePageCardVNode,
  guideDetailVNode,
  tutorialQuestCardVNode,
  guideHomeHTML,
  guideDetailHTML,
  tutorialQuestCardHTML,
} from './guide.js';
export {
  winGripVNode,
  winHeaderTitleVNode,
  winHeaderTitleHTML,
} from './win-chrome.js';

