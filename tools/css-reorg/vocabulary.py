"""
Owner resolution from the code: which module uses which class name.

The legacy sheets are full of opaque generated class names (`.pw-static-042`, `.extracted-style-118`)
that no keyword can place. The code that builds those nodes is the ground truth: the module that
uses a class name owns its styling, so the sheet owning that module owns the rule.
"""
import glob
import os
import re
from collections import Counter, defaultdict

# Which sheet owns which module. Longest prefix wins, so a specific component can override its panel.
MODULE_OWNERS = [
    # core / layout
    ('src/ui/dashboard/DashboardView.js', 'layout/dashboard-grid.css'),
    ('src/ui/', 'components/'),
    ('src/panels/components/HeaderPanel.js', 'layout/header-bar.css'),
    ('src/panels/components/', 'components/'),
    ('src/panels/settings/', 'panels/settings.css'),
    ('src/panels/fullscreen/BagPanel.js', 'panels/bag.css'),
    ('src/panels/fullscreen/BoxPanel.js', 'panels/box.css'),
    ('src/panels/fullscreen/PokedexPanel.js', 'panels/pokedex.css'),
    ('src/panels/fullscreen/DictionaryPanel.js', 'panels/dictionary.css'),
    ('src/panels/fullscreen/ShopPanel.js', 'panels/shop.css'),
    ('src/panels/fullscreen/MarketPanel.js', 'panels/market.css'),
    ('src/panels/fullscreen/BadgesPanel.js', 'panels/achievements.css'),
    ('src/panels/fullscreen/AchievementsPanel.js', 'panels/achievements.css'),
    ('src/panels/fullscreen/AtollPanel.js', 'panels/atoll.css'),
    ('src/panels/fullscreen/GuidePanel.js', 'panels/guide.css'),
    ('src/panels/facilities/', 'panels/facilities.css'),
    ('src/panels/', 'panels/'),
]

# Per-module overrides, checked before MODULE_OWNERS.
EXPLICIT = {
    'src/panels/components/DebugWidget.js': 'components/debug-widget.css',
    'src/panels/components/NotificationCenterView.js': 'components/notifications.css',
    'src/panels/components/ShortcutsPanel.js': 'panels/shortcuts.css',
    'src/panels/components/LocationPanel.js': 'panels/location.css',
    'src/panels/components/MapPanel.js': 'components/ui-map-view.css',
    'src/panels/components/PokeballsPanel.js': 'components/pokeball-filters.css',
    'src/panels/components/HeaderPanel.js': 'layout/header-bar.css',
    'src/panels/components/CurrencyPanel.js': 'layout/header-bar.css',
    'src/panels/ShortcutsPanel.js': 'panels/shortcuts.css',
    'src/panels/LocationPanel.js': 'panels/location.css',
    'src/panels/StoryPanel.js': 'panels/quests.css',
    'src/panels/TeamPanel.js': 'panels/team.css',
    'src/panels/TeamModal.js': 'panels/team.css',
    'src/panels/BattlePanel.js': 'panels/battle.css',
    'src/panels/BattleSummaryModal.js': 'panels/battle-summary.css',
    'src/panels/PokemonInfoModal.js': 'panels/pokemon-sheet.css',
    'src/panels/MinePanel.js': 'panels/mine.css',
    'src/panels/HatcheryPanel.js': 'panels/hatchery.css',
    'src/panels/TrainingCenterPanel.js': 'panels/training.css',
    'src/panels/AchievementsPanel.js': 'panels/achievements.css',
    'src/panels/AtollPanel.js': 'panels/atoll.css',
    'src/panels/SecretBasePanel.js': 'panels/secret-base.css',
    'src/panels/SettingsPanel.js': 'panels/settings.css',
    'src/panels/MapPanel.js': 'components/ui-map-view.css',
    'src/panels/PokeballsPanel.js': 'components/pokeball-filters.css',
    'src/panels/DictionaryPanel.js': 'panels/dictionary.css',
    'src/panels/GuidePanel.js': 'panels/guide.css',
    'src/panels/TutorialCardPanel.js': 'panels/tutorial.css',
    'src/panels/NpcTalkModal.js': 'panels/npc.css',
    'src/panels/SaveMenuPanel.js': 'panels/save-menu.css',
    'src/panels/StarterModal.js': 'panels/starter.css',
    'src/panels/DungeonPanel.js': 'panels/dungeon.css',
    'src/panels/AfkPanel.js': 'panels/afk.css',
    'src/panels/PuzzlesPanel.js': 'panels/puzzles.css',
    'src/panels/HeaderPanel.js': 'layout/header-bar.css',
    'src/panels/BoxPanel.js': 'panels/box.css',
    'src/panels/BagPanel.js': 'panels/bag.css',
    'src/panels/QuestPanel.js': 'panels/quests.css',
    'src/panels/MarketPanel.js': 'panels/market.css',
    'src/panels/ShopPanel.js': 'panels/shop.css',
    'src/panels/PokedexPanel.js': 'panels/pokedex.css',
}

TOKEN = re.compile(r'^[a-z][a-z0-9_-]{1,}$')


def owner_for(path):
    if path in EXPLICIT:
        return EXPLICIT[path]
    for prefix, owner in sorted(MODULE_OWNERS, key=lambda entry: -len(entry[0])):
        if path.startswith(prefix):
            if owner.endswith('/'):
                name = os.path.basename(path)[:-3]
                return owner + snake(name) + '.css'
            return owner
    return None


def snake(name):
    out = re.sub(r'(?<!^)(?=[A-Z])', '-', name).lower()
    return out


def build_vocabulary():
    """class token -> most frequent owner sheet."""
    votes = defaultdict(Counter)
    for path in glob.glob('src/**/*.js', recursive=True) + glob.glob('src/*.js'):
        owner = owner_for(path)
        if not owner:
            continue
        text = open(path, encoding='utf-8').read()
        for literal in re.findall(r'[`\'"]([^`\'"\n]{2,400})[`\'"]', text):
            for token in re.split(r'[\s,;.()[\]{}:=+]+', literal):
                if TOKEN.match(token):
                    votes[token][owner] += 1
    return {token: counter.most_common(1)[0][0] for token, counter in votes.items()}


VOCAB = build_vocabulary()


def owner_from_code(selector):
    """Owner sheet inferred from the code that uses the selector's class names."""
    tokens = re.findall(r'\.([a-z][a-z0-9_-]*)', selector.lower())
    counts = Counter()
    for token in tokens:
        owner = VOCAB.get(token)
        if owner:
            counts[owner] += 1
    if not counts:
        return None
    return counts.most_common(1)[0][0]
