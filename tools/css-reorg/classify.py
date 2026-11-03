"""
Classification table: which sheet owns which rule.

The table is ordered: the first pattern that matches the rule's selector (or its enclosing at-rule)
wins, so the most specific object always comes before the generic one.
Every entry is (regex on the lowercased selector, target sheet). Sheets are grouped by folder in
TREE, which also fixes the cascade order of the generated manifest.
"""
import re

from extract import split_selector_list

# Order of the folders, and of the sheets inside each folder: this IS the cascade.
TREE = [
    ('core', [
        'fonts.css',
        'tokens.css',
        'variables.css',
        'themes.css',
        'base.css',
        'form-controls.css',
        'keyframes.css',
        'scrollbars.css',
    ]),
    ('layout', [
        'page-shell.css',
        'header-bar.css',
        'dashboard-grid.css',
        'window-chrome.css',
        'mobile.css',
        'mobile-nav.css',
    ]),
    ('components', [
        'ui-element.css',
        'ui-section-title.css',
        'ui-empty-state.css',
        'ui-button.css',
        'ui-text.css',
        'ui-toolbar.css',
        'legacy-buttons.css',
        'ui-icon.css',
        'ui-image.css',
        'ui-link.css',
        'ui-file-button.css',
        'ui-input.css',
        'ui-dropdown.css',
        'ui-progressbar.css',
        'ui-panel.css',
        'ui-modal.css',
        'ui-dialog.css',
        'ui-context-menu.css',
        'ui-pokemon-sprite.css',
        'ui-map-view.css',
        'modal-sizes.css',
        'fullscreen-panel.css',
        'notifications.css',
        'pokeball-filters.css',
        'sortable.css',
        'debug-widget.css',
        'badges.css',
        'badge-bar.css',
        'type-badges.css',
        'chips.css',
        'cards.css',
        'grid.css',
    ]),
    ('panels', [
        'location.css',
        'shortcuts.css',
        'team.css',
        'team-moves.css',
        'pokemon-sheet.css',
        'pokemon-sheet-generated.css',
        'battle-team-row.css',
        'battle.css',
        'battle-summary.css',
        'dungeon.css',
        'bag.css',
        'box.css',
        'pokedex.css',
        'shop.css',
        'market.css',
        'achievements.css',
        'quests.css',
        'trainers.css',
        'automation.css',
        'training.css',
        'facilities.css',
        'hatchery.css',
        'fossils.css',
        'mine.css',
        'atoll.css',
        'secret-base.css',
        'guide.css',
        'dictionary.css',
        'settings.css',
        'theme-picker.css',
        'save-menu.css',
        'starter.css',
        'afk.css',
        'tutorial.css',
        'npc.css',
        'puzzles.css',
        'presets.css',
        'item-use.css',
        'pokemon-grid.css',
        'pokemon-background.css',
    ]),
]

PANEL = lambda name: 'panels/' + name
COMP = lambda name: 'components/' + name
CORE = lambda name: 'core/' + name
LAYOUT = lambda name: 'layout/' + name

# (pattern, target) — first match wins.
MAP = [


    (r'#debug-|debug-widget|speed-toggle|#speed-|leave-btn|idle-scene|debug-active|speed-x10|msg-log', COMP('debug-widget.css')),
    (r'loot-container', PANEL('battle-summary.css')),
    (r'pw-detail-|pw-evo-title|pw-green-text|pw-shiny|pw-header-close|pw-footer\b', PANEL('pokemon-sheet.css')),
    (r'pw-context-item|pw-drop-zone|ui-control-toolbar|ui-stat-chip', COMP('grid.css') if False else COMP('cards.css')),


    (r'^\.pw-green$|^\.pw-red$|^\.pw-orange$|^\.pw-black$', COMP('ui-text.css')),
    (r'^\.is-hidden|^\.pw-clickable|^\.pw-visually-hidden|^\.pw-tag|^\.pw-tip', CORE('base.css')),
    (r'^\.pw-caught-ball', PANEL('pokedex.css')),
    (r'pw-tab-bar|^\.tab\b|inv-tab|dict-tab|pw-toolbar-tab', COMP('chips.css')),
    (r'^\.pw-header|^\.pw-window|^\.pw-layout|pw-win-placeholder|^\.pw-scene|pw-header-host|pw-header-title', LAYOUT('window-chrome.css')),
    (r'pw-filter-', COMP('ui-input.css')),
    (r'^\.pw-money|pw-cur-', LAYOUT('header-bar.css')),
    (r'^\[data-daytime', PANEL('pokemon-background.css')),
    (r'#pw-land-fg|pw-bg-|background-flight', PANEL('pokemon-background.css')),
    (r'league-card|leagues-', PANEL('achievements.css')),
    (r'pw-move-effect|pw-effect-bullet', PANEL('pokemon-sheet.css')),
    (r'pw-move-learning', PANEL('item-use.css')),
    (r'pw-mcol|pw-tm-', PANEL('pokedex.css')),
    (r'#right-panel|#currency-window|pw-currencies-grid', LAYOUT('header-bar.css')),
    (r'pw-evo-|pw-source-icon|pw-talent-rarity|silhouette|pw-machine-card', PANEL('pokemon-sheet.css')),
    (r'pw-tut-|pw-tuto', PANEL('tutorial.css')),
    (r'pw-discord', PANEL('settings.css')),
    (r'pw-item-sprite|pw-item-circle', COMP('ui-image.css')),
    (r'pw-charge-move|pw-status|pw-pending|pw-label-white', COMP('badges.css')),
    (r'pw-johto-lock', PANEL('location.css')),

    (r'team-card|enemy-card|stat-label|stat-val|combatant|move-name|move-type|move-desc|poke-buffs|hp-bar|x-pill', PANEL('team.css')),
    (r'\.qcard-|\.qr-|\.am-', PANEL('quests.css')),
    (r'#fs-panel-filters|panel-filters', COMP('ui-input.css')),
    (r'pw-move-|pw-move\b', PANEL('pokemon-sheet.css')),

    (r'^\.item-badge|^\.info-row|pw-stat-line|^\.poke-badge|^\.move-desc-badge', COMP('badges.css')),
    (r'^option\b|^:where\(button|^\.modal-inner|^\.modal\b|machine-window', CORE('base.css')),
    (r'oncontextmenu|data-context-action|^\.move-row', COMP('ui-context-menu.css')),
    (r'^\.btn\b|^\.toggle', COMP('ui-button.css')),
    (r'loc-gym', PANEL('location.css')),
    (r'^span\.type-|^\.type-', COMP('badges.css')),
    (r'map-terrain|^img\b|^svg\b|^canvas\b', COMP('ui-map-view.css')),

    (r'^\.stat-row|stat-row', COMP('cards.css')),
    (r'focus-visible|^\[href\]|\[tabindex\]', CORE('base.css')),


    (r'pw-static-\d+', PANEL('pokemon-sheet-generated.css')),
    (r'pw-bdg', COMP('badge-bar.css')),
    (r'poke-move|pw-move-list|move-row|move-slot|pw-moves', PANEL('team-moves.css')),

    (r'^:is\(\.move-type|^:is\(\.type-badge|^:is\(\.pw-badge', COMP('type-badges.css')),

    # ---- second pass: explicit owners for the legacy tails --------------------------------
    (r'extracted-', 'DELETE'),
    (r'automation', PANEL('automation.css')),
    (r'^\[data-buff|data-buff=', COMP('badges.css')),
    (r'^\[data-theme', 'THEME'),
    (r'data-buff|weather-indicator|terrain-indicator|poke-weather|legendary-sprite|shiny-tag|shiny-spark|enemy-section|victory-icon|victory-screen|msg-log', PANEL('battle.css')),
    (r'pw-switch|pw-toggle|pw-range|drawer-toggle|pw-input|pw-search|pw-file-btn-input', COMP('ui-input.css')),
    (r'pw-file-btn', COMP('ui-file-button.css')),
    (r'pw-held-item|pw-item-use|item-target', PANEL('item-use.css')),
    (r'pw-ball|ball-icon|ball-title|ball-name|ball-desc|ball-qty|ball-actions|ball-drag|ball-del|ball-opts|ball-opt', COMP('pokeball-filters.css')),
    (r'pw-bdg', COMP('badges.css')),
    (r'pw-tier-dot|pw-rank', COMP('badges.css')),
    (r'pw-manage|pw-slot-label|queue-|pw-facility|facility|pw-auto-relaunch|relaunch|relic-mini', PANEL('facilities.css')),
    (r'pw-repeatable|repeatable-|upgrade-card|pw-upgrade', PANEL('quests.css')),
    (r'trainer-|pw-trainer', PANEL('trainers.css')),
    (r'pw-static-modal', COMP('modal-sizes.css')),
    (r'pw-channel|theme-grid|settings-section', PANEL('settings.css')),
    (r'pw-cur-|pw-money-row|pw-update-banner|brand-mark|header-brand|pw-game-screen', LAYOUT('header-bar.css')),
    (r'pw-win-tool|win-help-btn|pw-win-hdr', LAYOUT('window-chrome.css')),
    (r'pw-map|map-panel|map-region|map-svg|map-legend|map-help|map-node|map-line', COMP('ui-map-view.css')),
    (r'#col-1|#col-2|#col-3|dash-col', LAYOUT('dashboard-grid.css')),
    (r'hp-fill|hp-bar|hp-text|xp-fill|poke-name|poke-info|team-container|team-toolbar|poke-item-badge|poke-level|poke-hp', PANEL('team.css')),
    (r'box-move|box-shiny|ui-control-toolbar--box', PANEL('box.css')),
    (r'dict-|pw-src|pw-info-|item-effect-box|hinfo', PANEL('dictionary.css')),
    (r'confirm-|pw-alert|pw-dialog', COMP('ui-dialog.css')),
    (r'^\.pw-filterbar|^\.pw-ui-toolbar|^\.ui-toolbar|^\.pw-toolbar\b|ui-control-toolbar|panel-filters|^#fs-panel-filters', COMP('ui-toolbar.css')),
    (r'^\.ui-icon|^\.pw-icon|^\.pw-big-icon|^\.pw-inline-icon|^\.ui-btn--icon|icon-wrap|^\.icon-slot', COMP('ui-icon.css')),
    (r'^\.pw-button|^\.pw-btn|^\.btn\b|^\.icon-btn|^\.ui-btn|^\.pw-cta|^\.toggle|^\.hbtn|^\.action-btn|^\.mob-btn|pw-cta', COMP('ui-button.css')),
    (r'route-events|loc-caught', PANEL('location.css')),
    (r'^\.type-|type-color', COMP('badges.css')),
    (r'base-stock|base-toolbar|base-ed|base-canvas|pw-base|secret-base|decoration', PANEL('secret-base.css')),
    (r'pw-sticky|pw-count-badge|pw-relative|pw-margin|pw-action-flex|pw-field|pw-choice-sub|pw-choice-icon', COMP('grid.css')),
    (r'pw-choice-title|pw-choice-desc|pw-element', COMP('cards.css')),
    (r'pw-text\b|pw-clipboard', COMP('ui-text.css')),
    (r'pw-drop-preview', COMP('sortable.css')),
    (r'pw-mask-icon', COMP('ui-icon.css')),
    (r'^(\*|\*::before|\*::after|\[role|\[hidden|:where\(\[hidden)', CORE('base.css')),
    (r'^\.badge\b', COMP('badges.css')),
    (r'inventory-card|evo-owned', PANEL('bag.css')),
    (r'pw-type-info', PANEL('pokemon-sheet.css')),
    (r'move-eff-badge', PANEL('pokemon-sheet.css')),
    (r'pw-settings|^settings|settings-|#settings', PANEL('settings.css')),
    (r'pw-npc|npc-|#pw-npc', PANEL('npc.css')),
    (r'pw-tuto|tuto', PANEL('tutorial.css')),
    (r'pw-afk|afk-|#afk', PANEL('afk.css')),
    (r'theme-swatch|theme-grid|theme-picker', PANEL('theme-picker.css')),
    (r'#battle-team-row', PANEL('battle-team-row.css')),
    (r'^\.type-|^span\.type-|type-color', COMP('type-badges.css')),
    (r'^\.hbtn|^\.action-btn|^\.poke-btn|^\.btn\b|^\.toggle|^\.mob-btn|pw-cta', COMP('legacy-buttons.css')),
    (r'^(button|input|select|option|textarea|label)\b|^\[type=', CORE('form-controls.css')),

    # ---- core -------------------------------------------------------------------------------
    (r'^@font-face', CORE('fonts.css')),
    (r'^:root\[data-theme', CORE('themes.css')),
    (r'^:root\s*\[data-theme', CORE('themes.css')),
    (r'^(html|body|:root|\*)\b', CORE('base.css')),
    (r'^(::selection|::-webkit-scrollbar|::-webkit-color-swatch|input|button|select|textarea)\b', CORE('base.css')),

    # ---- layout -----------------------------------------------------------------------------
    (r'mobile-mode|^\.mob-btn|^\.mob-|mobile-', LAYOUT('mobile.css')),
    (r'#main-dashboard|#app\b|#page-|\.pw-page', LAYOUT('page-shell.css')),
    (r'#header|\.pw-topbar|#player-card|\.player-card|#save-name|\.pw-currency', LAYOUT('header-bar.css')),
    (r'dash-column|dashboard|pw-dash|#win-|\.dash-win|dashbar', LAYOUT('dashboard-grid.css')),
    (r'win-hdr|window-header|pw-win-hdr|modal-title|modal-footer|modal-close|\.pw-panel-header|pw-panel-footer|pw-header-row|pw-actions|win-header|win-footer|win-body|win-title', LAYOUT('window-chrome.css')),
    (r'nav-|mobile-nav', LAYOUT('mobile-nav.css')),
    (r'scrollbar', CORE('scrollbars.css')),
    (r'@keyframes', CORE('keyframes.css')),

    # ---- components -------------------------------------------------------------------------
    (r'pw-text-|pw-light1|pw-light2|pw-dim|pw-accent|pw-bold|pw-italic|text-color|pw-ellipsis|pw-mono', COMP('ui-text.css')),
    (r'pw-section-title|section-title', COMP('ui-section-title.css')),
    (r'pw-empty-state|empty-state', COMP('ui-empty-state.css')),
    (r'pw-button|pw-btn|\.hbtn|\.action-btn|\.poke-btn|\.pw-cta|\.btn-|pw-icon-btn|pw-mini-btn|pw-toggle-btn', COMP('ui-button.css')),
    (r'type-badge|status-badge|buff-badge|pw-badge|rank-badge|pw-rank|type-chip|type-color', COMP('badges.css')),
    (r'pw-chip|\.chip\b', COMP('chips.css')),
    (r'pw-card\b|pw-choice-card|pw-info-card|pw-stat-card|\.slot-card', COMP('cards.css')),
    (r'pw-row\b|pw-col\b|pw-grid|pw-stack|pw-flex|pw-gap|pw-ml|pw-mt|pw-mb|pw-mr|pw-pt|pw-pb|pw-center|pw-spacer|pw-scroll|pw-hide|pw-only', COMP('grid.css')),
    (r'pw-pokemon-sprite|sprite-img|sprite-wrap|poke-sprite|pw-sprite|shiny-pulse|\.sprite\b', COMP('ui-pokemon-sprite.css')),
    (r'map-svg|pw-map|map-node|map-line|map-legend|map-help', COMP('ui-map-view.css')),
    (r'toast|notif', COMP('notifications.css')),
    (r'ball-filter|pokeball-filter|ball-row|ball-picker|ball-editor|ball-catalog', COMP('pokeball-filters.css') if False else COMP('notifications.css')),
    (r'sortable|drag-placeholder|pw-drag', COMP('sortable.css')),
    (r'context-menu', COMP('ui-context-menu.css')),
    (r'pw-dropdown|pw-select|unified-selector|usm-', COMP('ui-dropdown.css')),
    (r'progressbar|pw-progress|progress-fill|progress-track|xp-bar|charge-fill', COMP('ui-progressbar.css')),
    (r'pw-input|pw-search|inv-toolbar input', COMP('ui-input.css')),
    (r'pw-icon\b|pw-icon-|icon-box', COMP('ui-icon.css')),
    (r'pw-image|inv-icon-img|item-icon|pw-img', COMP('ui-image.css')),
    (r'pw-link|pw-anchor', COMP('ui-link.css')),
    (r'file-button|input\[type=file\]', COMP('ui-file-button.css')),
    (r'pw-dialog|confirm-dialog', COMP('ui-dialog.css')),
    (r'pw-modal|modal-backdrop|pw-sheet', COMP('ui-modal.css')),
    (r'pw-panel\b|pw-panel--', COMP('ui-panel.css')),
    (r'fullscreen|pw-fullscreen', COMP('fullscreen-panel.css')),
    (r'pw-ui-', COMP('ui-panel.css')),

    # ---- panels: location, shortcuts, maps --------------------------------------------------
    (r'win-tabs|pw-loc|loc-node|loc-action|loc-wild|loc-trainer|location-|pw-weather|pw-region|travel', PANEL('location.css')),
    (r'win-shortcuts|shortcut-', PANEL('shortcuts.css')),

    # ---- panels: team & sheet ---------------------------------------------------------------
    (r'team-window|team-view|team-modal|team-slot|pw-team|poke-card|poke-slot|poke-move|poke-btn|poke-level|poke-hp|pw-poke-card|batch-action|team-bench|bench-', PANEL('team.css')),
    (r'poke-modal|poke-detail|poke-protect|poke-rank|poke-stat|poke-talent|poke-hero|pw-poke-', PANEL('pokemon-sheet.css')),

    # ---- panels: battle ---------------------------------------------------------------------
    (r'battle-summary|summary-|loot-item|battle-loot|pw-summary', PANEL('battle-summary.css')),
    (r'battle|pw-capture|auto-move|combatant|enrage|pw-fx|pw30-bob|pw31-|pw32-hop', PANEL('battle.css')),
    (r'dungeon|dgn|pw-dungeon', PANEL('dungeon.css')),

    # ---- panels: storage --------------------------------------------------------------------
    (r'inv-|#fs-inventory|bag-|pw-bag|item-sale|treasure', PANEL('bag.css')),
    (r'#fs-box|box-card|box-panel|box-filter|box-grid|box-poke|pw-box|box-selection|pw-pokemon-tile', PANEL('box.css')),
    (r'pokedex|dex-entry|dex-detail|pw-dex|dex-', PANEL('pokedex.css')),

    # ---- panels: economy & progress ---------------------------------------------------------
    (r'shop|pw-shop|buy-|pw-price', PANEL('shop.css')),
    (r'market|pw-market', PANEL('market.css')),
    (r'ach-|achievement|pw-ach', PANEL('achievements.css')),
    (r'quest', PANEL('quests.css')),
    (r'badges|fs-badges|medal|pw-badge-card', PANEL('badges.css') if False else PANEL('achievements.css')),

    # ---- panels: facilities -----------------------------------------------------------------
    (r'training', PANEL('training.css')),
    (r'facility|pw-facility|management-|staff-', PANEL('facilities.css')),
    (r'hatchery|daycare|incubat|egg-|pw-hatch', PANEL('hatchery.css')),
    (r'fossil', PANEL('fossils.css')),
    (r'mine|pw-mine|dig-', PANEL('mine.css')),

    # ---- panels: world & endgame ------------------------------------------------------------
    (r'atoll', PANEL('atoll.css')),
    (r'secret-base|pw-base|base-flag|decoration|pw-npc-editor', PANEL('secret-base.css')),
    (r'guide|pw-guide|puzzle|sequence|code-|pw-solve', PANEL('puzzles.css') if False else PANEL('guide.css')),
    (r'dict-entry|dictionary|pw-dict', PANEL('dictionary.css')),

    # ---- panels: system ---------------------------------------------------------------------
    (r'settings|theme-swatch|pw-settings|#settings', PANEL('settings.css')),
    (r'save-slot|save-menu|save-card|save-icon|save-profile|save-context|pw-save', PANEL('save-menu.css')),
    (r'starter|pw-starter', PANEL('starter.css')),
    (r'afk|pw-afk|offline', PANEL('afk.css')),
    (r'tuto', PANEL('tutorial.css')),
    (r'npc|pw-npc', PANEL('npc.css')),
    (r'preset', PANEL('presets.css')),
    (r'item-use|item-target|pw-item-use|pw-item-target', PANEL('item-use.css')),
    (r'pokemon-grid|pw-pokemon-grid|pokemon-tile', PANEL('pokemon-grid.css')),
    (r'pw-bg-|background-flight|bg-poke|pw-background', PANEL('pokemon-background.css')),
]


def classify(block):
    """Returns the target sheet path for one parsed block."""
    text = (block.get('selector') or block.get('prelude') or '').lower()
    body = block.get('body') or ''
    # Design tokens: the theme-scoped blocks own their sheet, the plain `:root` blocks are split
    # between the legacy palette and the `--pw-*` tokens depending on what they declare.
    if block.get('kind') == 'rule' and text.lstrip().startswith(':root'):
        if '[data-theme' in text:
            return CORE('themes.css')
        return CORE('tokens.css') if '--pw-' in body else CORE('variables.css')
    # A theme-scoped override belongs to the sheet that owns what it overrides, so a component and
    # its themes stay side by side; only the bare `[data-theme]` rules go to core/themes.css.
    themed = re.match(r'^\[data-theme[^\]]*\]\s*(.+)$', text.strip())
    if themed:
        rest = themed.group(1).strip()
        if rest and not rest.startswith(':'):
            return classify({'kind': 'rule', 'selector': rest, 'body': body})
    if block.get('kind') != 'rule' and text.startswith('@keyframes'):
        return CORE('keyframes.css')
    if block.get('kind') != 'rule' and text.startswith('@font-face'):
        return CORE('fonts.css')
    if block.get('kind') != 'rule' and text.startswith('@property'):
        return CORE('tokens.css')
    # split on every comma so a shared rule keeps the most specific owner
    parts = split_selector_list(text)
    votes = []
    for part in parts:
        owner = None
        for pattern, target in MAP:
            if re.search(pattern, part):
                owner = target
                break
        votes.append(owner)
    known = [vote for vote in votes if vote]
    if known and all(vote == 'THEME' for vote in known):
        return CORE('themes.css')
    known = [vote for vote in known if vote != 'THEME']
    if not known:
        return None
    # the first declared selector decides, like a reader would
    return known[0]
