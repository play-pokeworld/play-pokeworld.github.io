/**
 * PokéWorld UI — Views (windows / panels layered over the GameScene)
 *
 * The game owns exactly two scenes (MainMenuScene, GameScene). Every other
 * display is a UIView: an ECS entity tree (design-system base objects)
 * rendered as ONE virtual tree, materialized as HTML string (adapters,
 * tests) or live DOM (browser mount).
 *
 * @module ui/views
 */
export { UIView } from './UIView.js';
export { BagView } from './BagView.js';
export { DictionaryView } from './DictionaryView.js';
export { PokedexView } from './PokedexView.js';
export { QuestView } from './QuestView.js';
export { BoxView } from './BoxView.js';
export { TrainingWindowView } from './TrainingWindowView.js';
export { HatcheryWindowView } from './HatcheryWindowView.js';
export { MineWindowView } from './MineWindowView.js';
export { SettingsModalView } from './SettingsModalView.js';
export { SaveMenuView } from './SaveMenuView.js';
export { ShopView } from './ShopView.js';
export { MarketView } from './MarketView.js';
export { StarterModalView } from './StarterModalView.js';
export { PokeDetailView } from './PokeDetailView.js';
export { ManagementMenuView } from './ManagementMenuView.js';
export { InfoPanelView } from './InfoPanelView.js';
export { LearnableMovesPanelView } from './LearnableMovesPanelView.js';
export { SessionSummaryView } from './SessionSummaryView.js';
export { AtollPanelView } from './AtollPanelView.js';
export { LocationInfoView } from './LocationInfoView.js';
export { MapOverlaysView } from './MapOverlaysView.js';
export { GuidePanelView, TutorialCardView } from './GuidePanelView.js';
export { DashboardChromeView } from './DashboardChromeView.js';
export { DexDetailView } from './DexDetailView.js';
export { AfkRecapView } from './AfkRecapView.js';
export { StoryWindowView, NpcDialogView, RepeatableUpgradeView } from './StoryWindowView.js';
export { PuzzleListView, PuzzleExplorationView, SpecialFormsView } from './PuzzleViews.js';
export {
  BaseNpcDialogView, BasePcDialogView, BaseNpcEditorView,
  BaseNpcPickerView, BaseNpcItemPickerView, BaseNpcSpritePickerView, BaseNpcPresetPickerView,
} from './BaseViews.js';
export { AtollFactoryPrepView } from './AtollFactoryPrepView.js';
export { UnifiedPokemonSelectorModal } from './UnifiedPokemonSelectorView.js';
export { UnifiedTeamEditorModal } from './UnifiedTeamEditorView.js';
