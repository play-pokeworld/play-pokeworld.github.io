# ⚡ PokéWorld

PokéWorld is an idle / exploration Pokémon fan game inspired by **PokéClicker** and **PokéChill**, combining real-time automatic battles, map exploration, quests, breeding, mining, automation and collection.

![Version](https://img.shields.io/badge/version-alpha-blue)
![Pokémon](https://img.shields.io/badge/pok%C3%A9mon-251-yellow)
![Regions](https://img.shields.io/badge/regions-Kanto%20%26%20Johto-green)

> **Language note**  
> PokéWorld is developed primarily in **French**. An English translation is available, but some text may still be incomplete, awkward, or inconsistent while the game is in development.

> **Development note**  
> This project was developed as a solo fan project with significant AI assistance for coding, refactoring and iteration. Game design decisions, balancing, testing direction and feature choices are manually guided.

> **Fan game / non-commercial notice**  
> PokéWorld is a free, non-commercial fan game made for fun, experimentation and entertainment. It is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, Creatures Inc. or The Pokémon Company.

---

## Play the game

The game can be played here:

[https://play-pokeworld.github.io/](https://play-pokeworld.github.io/)

You can also try opening `index.html` directly after downloading the project. However, depending on your browser and security settings, some scripts may be disabled when using the local `file://` protocol.

For the most reliable experience, use the hosted link above or run the game through a local static web server.

---

## Current status

PokéWorld is still in active development and may contain bugs, balance issues, unfinished UI, translation problems or save-breaking changes between versions.

The current version is best considered an **alpha / beta test build** rather than a finished game.

If you test the game, exporting your save regularly is recommended.

---

## Concept

PokéWorld is a web-based idle game where you explore the regions of **Kanto** and **Johto** with your Pokémon team.

Battles take place in real time, inspired by PokéChill: your Pokémon attack automatically, while you manage team composition, held items, training, breeding, automation and long-term progression.

Inspired by:

- **[PokéClicker](https://github.com/pokeclicker/pokeclicker)** — region progression, maps, quests and idle collection.
- **[PokéChill](https://github.com/play-pokechill/play-pokechill.github.io)** — real-time automatic battles, team management and equipable items.

---

## Features

### 🗺️ Exploration

- Interactive maps for **Kanto** and **Johto**.
- Progressive route, town and dungeon unlocking.
- Wild routes with random encounters.
- Towns, gyms and regional leagues.
- Special locations such as Pokémon Tower, Cerulean Cave, Safari Zone, Seafoam Islands, Whirl Islands, Bell Tower and more.
- Roaming legendary Pokémon.

### ⚔️ Real-time battles

- Automatic real-time combat inspired by PokéChill.
- Up to 4 moves per Pokémon.
- Visual cooldown bars for attacks.
- Status effects such as burn, poison, paralysis, sleep and freeze.
- Held items with battle effects.
- Pokémon talents / abilities.
- Gym battles, league battles, quest battles and training battles.

### 📜 Quests and progression

- Main story quests for Kanto and Johto.
- Side quests from NPCs.
- Repeatable quests with selectable objectives.
- Quest rewards as one of the main economy sources.
- Regional badge progression.
- Kanto completion requirements before accessing Johto.

### 🧬 Collection

- 251 Pokémon currently available.
- Pokédex tracking.
- Shiny tracking.
- Talent unlocking.
- IV and EV progression.
- PC box filters and sorting.
- Favorite and locked Pokémon markers.
- Region-based Pokédex visibility.

### 🥚 Hatchery / breeding

- Deposit Pokémon or fossils into the hatchery.
- Eggs progress through battle K.O. counts.
- Hatchery requirements scale by Pokémon strength, from low values for weak Pokémon to higher values for legendary Pokémon.
- Auto-hatching upgrade.
- Auto-filling upgrade.
- Manual waiting list for hatchery automation.
- Hatchery managers with levels, XP and passive bonuses.

### 🏋️ Training

- Training slots for Pokémon progression.
- Training modes for levels, EVs, talents and training-locked moves.
- Parallel training slots.
- Manual waiting lists per training slot.
- Automation per slot.
- Trainers with levels, XP and passive bonuses.

### ⛏️ Underground mine

- Dig through mine layers to uncover evolution stones, treasures and fossils.
- Energy-based mining system.
- Multiple tools with different digging patterns.
- Mine upgrades such as max energy increases.
- Auto-mining upgrade.
- Miners with levels, XP and passive bonuses.

### 🏪 Economy

- Shops with region and progression-based stock.
- Pokémon market for selected Pokémon.
- Expensive late-game held items.
- Treasures from the mine.
- Quest-based money rewards.
- Repeatable quest rewards.
- Duplicate reward item conversion systems.

### 💾 Saves and offline progress

- Multi-save menu.
- Save profile customization.
- Save import / export.
- Autosave.
- Offline / AFK simulation.
- AFK summary panel showing battles, captures, items, energy and team K.O.

### 🤖 Automation systems

PokéWorld includes early automation systems for:

- Hatchery auto-hatching.
- Hatchery auto-filling.
- Training slot automation.
- Mine automation.
- Staff systems for managers, trainers and miners.

These systems are still being tested and balanced.

---

## Requirements

- A modern web browser such as Chrome, Firefox or Edge.
- JavaScript enabled.

No installation is required when using the hosted version.

---

## Controls

### Interface

- Drag and drop dashboard windows to reorganize the layout.
- Use window buttons to move panels between columns.
- On mobile, use the navigation bar to switch between the main views.

### Battle

- Left-click a Pokémon in your team to open its details.
- Right-click a Pokémon or move to view detailed information.
- Use speed buttons to accelerate battles.
- Leave / forfeit buttons are available depending on battle type.

### Management

- Use the bag to equip items, use candies and evolution stones.
- Use the PC box to manage your collection.
- Use the hatchery, training room and mine menus to configure automation and staff.
- Export your save regularly while the game is in alpha / beta.

---

## Customization

### Themes

The game includes several visual themes:

- Dark
- Light
- Game Boy
- Fire

### Languages

- 🇫🇷 French — primary language / default.
- 🇬🇧 English — available, but may contain translation issues.

---

## Saving

PokéWorld saves progress in the browser's `localStorage`.

Available save features:

- Automatic saving.
- Multiple save slots.
- Import / export as JSON.
- Save profile customization.

Because the game is still in development, exported backups are strongly recommended before testing new versions.

---

## Reporting bugs

When reporting a bug, please include:

1. What you were doing.
2. Steps to reproduce the issue.
3. Browser used.
4. Console errors if available (`F12` → Console).
5. Your exported save if the bug is save-related.
6. Screenshots if the bug is visual.

Known alpha/beta limitations:

- Some UI elements may still be rough.
- English translations may be incomplete or inaccurate.
- Balancing may change heavily between versions.
- Saves may require migration or reset during major updates.

---

## Legal / license notice

PokéWorld is a personal, free and non-commercial fan project inspired by the Pokémon universe.

Pokémon names, characters and related intellectual property belong to their respective owners. This game is made only for fun and is not intended for commercial use.

Sprites and Pokémon data are based on public Pokémon resources such as [PokeAPI](https://pokeapi.co/) and are used for non-commercial fan-game purposes.

---

## Credits

- **PokéClicker** — inspiration for exploration, region progression and quest structure.
- **PokéChill** — inspiration for real-time automatic combat and team systems.
- **PokeAPI** — Pokémon data and sprite resources.
- **The Pokémon community** — inspiration, references and feedback.

---

**Have fun testing PokéWorld!** ⚡
