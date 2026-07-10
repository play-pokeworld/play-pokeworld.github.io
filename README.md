# ⚡ PokéWorld

Un jeu idle/exploration Pokémon inspiré de **PokéClicker** et **PokéChill**, combinant combat automatique en temps réel, exploration de cartes, quêtes, élevage et collection.

![Version](https://img.shields.io/badge/version-1.0-blue)
![Pokémon](https://img.shields.io/badge/pok%C3%A9mon-251-yellow)
![Régions](https://img.shields.io/badge/r%C3%A9gions-Kanto%20%26%20Johto-green)

##  Concept

PokéWorld est un jeu web idle où vous explorez les régions de **Kanto** et **Johto** avec votre équipe de Pokémon. Les combats se déroulent en temps réel style PokéChill : vos Pokémon attaquent automatiquement, vous gérez la stratégie, l'équipement et la progression.

Inspiré par :
- **[PokéClicker](https://github.com/pokeclicker/pokeclicker)** : exploration de cartes, progression par régions, quêtes
- **[PokéChill](https://github.com/play-pokechill/play-pokechill.github.io)** : combat automatique en temps réel, système d'équipe, items équipables

##  Fonctionnalités

### 🗺️ Exploration
- **Carte interactive** de Kanto et Johto avec déblocage progressif
- **Routes sauvages** avec rencontres aléatoires (251 Pokémon disponibles)
- **Villes et arènes** : défiez les 8 champions + Ligue Pokémon
- **Lieux spéciaux** : Tour Pokémon, Grotte Azurée, Zone Safari, etc.

### ️ Combat en temps réel
- **Système PokéChill** : vos Pokémon attaquent automatiquement selon leurs capacités
- **4 attaques par Pokémon** avec cooldowns visuels
- **Effets de statut** : brûlure, poison, paralysie, sommeil, gel
- **Objets tenus** : 55+ items avec effets (Leftovers, Choice Band, Life Orb, etc.)
- **Talents** : chaque Pokémon a des talents passifs (Intimidate, Regenerator, etc.)

###  Élevage & Collection
- **Pension** : déposez vos Pokémon pour obtenir des œufs
- **Éclosion** : gagnez des combats pour faire éclore les œufs
- **Shiny** : chassez les Pokémon shiny (1/4096 de base, 3x avec Charme Chroma)
- **Pokédex** : collectionnez les 251 Pokémon

### ⛏️ Mine souterraine
- **Excavation** : creusez pour trouver pierres d'évolution, fossiles et trésors
- **Fossiles** : ranimez des Pokémon préhistoriques (Amonita, Kabuto, Ptéra)
- **Énergie** : se régénère avec le temps et les combats

### 📜 Quêtes & Progression
- **Quêtes principales** : scénario Kanto puis Johto
- **Quêtes secondaires** : PNJ avec défis spécifiques
- **Quêtes répétables** : challenges quotidiens avec récompenses
- **Badges** : 8 badges par région pour débloquer la Ligue

### 🏪 Économie
- **Boutiques** : achetez baies, objets et équipements
- **Marché Pokémon** : achetez des Pokémon rares ou starters
- **Trésors** : vendez vos trouvailles de la mine

##  Installation

### Prérequis
- **Python 3.6+** (pour le serveur HTTP local)
- Navigateur web moderne (Chrome, Firefox, Edge)

### Lancement

#### Méthode automatique (recommandée)
Double-cliquez sur **`LANCER.bat`** - le jeu s'ouvre automatiquement dans votre navigateur.

#### Méthode manuelle
```bash
# Ouvrir un terminal dans le dossier du jeu
python -m http.server 8000

# Puis ouvrir dans le navigateur
http://localhost:8000
```

⚠️ **Important** : N'ouvrez pas `index.html` directement (protocole `file://`) - les navigateurs bloquent le chargement des scripts pour des raisons de sécurité.

## 🎯 Contrôles

### Interface
- **Glisser-déposer** : réorganisez les fenêtres du dashboard
- **Boutons de fenêtre** : monter, descendre, changer de colonne
- **Mobile** : barre de navigation en bas pour switcher entre les vues

### Combat
- **Clic gauche** sur un Pokémon de l'équipe : ouvrir sa fiche
- **Clic droit** sur un Pokémon ou une attaque : voir les informations détaillées
- **Boutons de vitesse** : x1, x2, x3, x10 pour accélérer le combat
- **Abandonner** : quittez le combat sans pénalité

### Gestion
- **Sac** : équiper des objets, utiliser des bonbons, pierres d'évolution
- **Boîte PC** : gérer votre collection (clic droit pour détails)
- **Marché** : acheter des Pokémon rares

## ️ Structure du projet

```
pokeworld/
├── index.html                    # Point d'entrée
├── LANCER.bat                    # Script de lancement automatique
├── README.md                     # Ce fichier
├── src/
│   ├── assets/
│   │   ├── css/style.css         # Styles globaux
│   │   ├── images/
│   │   │   ├── pokemon/          # Sprites Pokémon (front/back/shiny)
│   │   │   └── items/            # Sprites des items
│   │   └── sounds/               # Effets sonores (futur)
│   ├── localization/
│   │   ├── fr/                   # Textes en français
│   │   ├── en/                   # Textes en anglais
│   │   ├── data.js               # Fusion des langues
│   │   └── i18n.js               # Système de traduction
│   ├── scripts/
│   │   ├── core/                 # État global, event bus, utilities
│   │   ├── data/                 # Données (Pokémon, moves, locations, etc.)
│   │   ├── display/              # UI rendering (carte, équipe, modals)
│   │   ── gameplay/
│   │       ├── combat/           # Moteur de combat
│   │       ├── economy/          # Mine, inventaire, shop
│   │       ├── quests/           # Système de quêtes
│   │       ├── breeding/         # Pension et éclosion
│   │       ├── save/             # Sauvegarde localStorage
│   │       └── world/            # Équipe, collection, roaming
│   └── loader.js                 # Chargeur de modules
└── tool/
    └── download_sprites.bat      # Script pour re-télécharger les sprites
```

## 🎨 Personnalisation

### Thèmes
Le jeu propose 4 thèmes visuels :
- **Sombre** (défaut)
- **Clair**
- **Game Boy** (style rétro vert)
- **Feu** (tons chauds)

### Langues
- 🇫🇷 Français (par défaut)
- 🇬🇧 English

## 💾 Sauvegarde

Le jeu sauvegarde automatiquement dans le `localStorage` du navigateur :
- **Auto-save** : toutes les 60 secondes
- **Export/Import** : sauvegardez votre progression en JSON
- **Cloud** : copiez-collez votre sauvegarde pour la transférer

##  Signaler un bug

Si vous rencontrez un problème :
1. Vérifiez que vous utilisez `LANCER.bat` ou un serveur HTTP
2. Ouvrez la console du navigateur (F12) et copiez les erreurs
3. Décrivez le problème avec les étapes pour le reproduire

## 📄 Licence

Projet personnel inspiré de l'univers Pokémon. Les sprites proviennent de [PokeAPI](https://pokeapi.co/) et sont utilisés à des fins non commerciales.

## 🙏 Remerciements

- **PokéClicker** : inspiration pour l'exploration et la progression
- **PokéChill** : inspiration pour le combat en temps réel
- **PokeAPI** : base de données Pokémon et sprites
- **Pokémon Company** : l'univers Pokémon

---

**Bon jeu !** ⚡
