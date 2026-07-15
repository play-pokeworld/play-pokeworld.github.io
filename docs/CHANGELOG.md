# Changelog PokéWorld

## [2026-07-10] - Version 1.0

###  Nouveautés

#### Interface & Navigation
- **README professionnel** inspiré de PokéClicker et PokéChill
- **Script de lancement** `LANCER.bat` pour démarrer le jeu en un clic
- **Ordre des scripts corrigé** dans `loader.js` (shortcuts.js avant bootstrap.js)

#### Combat - Clic droit informatif
- **Clic droit sur tous les Pokémon en combat** :
  - Sprite du Pokémon ennemi → affiche ses stats et capacités officielles
  - Sprites de l'équipe joueur (actif et inactifs) → ouvre la fiche complète
  - Toutes les attaques (joueur et ennemi) → affiche les détails de l'attaque
- **Nouvelle fonction** `openPokeInfo(pokeId)` pour afficher les infos d'un Pokémon par son ID
- **Nouvelle fonction** `openItemInfo(itemKey)` pour afficher les infos d'un item

#### Système de progression
- **8 badges débloquent toutes les routes** de la région
- **Vitesse de combat x10** ajoutée dans le menu debug et les boutons de vitesse

#### Gestion des objets
- **Bonbons Super (Rare Candy)** : reste sur la page de sélection pour enchaîner les utilisations
- **Compteur visible** dans le header lors de l'utilisation de bonbons
- **Suppression du double affichage** du nombre d'items dans le sac
- **Modal de confirmation** : z-index augmenté pour apparaître au-dessus du sac

#### Système d'attaque
- **Apprentissage par niveau** : les attaques se débloquent au bon niveau selon les jeux officiels
- **Fonction `getLearnLevelForMove()`** calcule le niveau requis pour chaque attaque
- **Premières 4 attaques** disponibles au niveau 1
- **Attaques suivantes** déblocables progressivement (+5 niveaux par palier)

#### Affichage des statuts en combat
- **Indicateurs buff/debuff** avec flèches (▲/▼) sous les sprites
- **1 à 3 flèches** selon l'importance du buff/debuff
- **Statuts visibles** : brûlure, poison, paralysie, sommeil, gel
- **Couleurs distinctes** : rouge (ATK), bleu (DEF), orange (VIT)

#### Effets de combat vérifiés
- **Objets tenus type-boosting** : +20% dégâts du type correspondant
- **Choice Band/Specs** : +50% attaques physiques/spéciales
- **Life Orb** : +30% dégâts mais -10% PV par attaque
- **Leftovers** : régénère 1/16 PV max par tour
- **King's Rock** : 10% de chance de faire hésiter
- **Assault Vest** : réduit dégâts spéciaux de 10%
- **Brûlure** : dégâts réduits à 1/16 PV (au lieu de 1/8)

### 🐛 Corrections de bugs

- **Fenêtre Raccourcis** : boutons ne disparaissent plus au rechargement
- **Erreur SyntaxError ligne 117** : virgule manquante dans `loader.js`
- **Érreurs `file://`** : documenté que le jeu nécessite un serveur HTTP
- **Menu équipe** : s'actualise correctement après utilisation d'objets
- **Sprites d'items** : tous les 55 items ont maintenant leurs sprites

###  Structure du projet

```
pokeworld/
├── index.html                    # Point d'entrée
├── LANCER.bat                    # Script de lancement automatique
├── README.md                     # Documentation principale
├── CHANGELOG.md                  # Historique des modifications
├── src/
│   ├── assets/
│   │   ├── css/style.css         # Styles globaux
│   │   ├── images/
│   │   │   ├── pokemon/          # 251 Pokémon (front/back/shiny)
│   │   │   └── items/            # 55 sprites d'items
│   │   └── sounds/
│   ├── localization/
│   │   ├── fr/                   # 15 fichiers de textes français
│   │   ├── en/                   # 15 fichiers de textes anglais
│   │   ├── data.js               # Fusion des langues
│   │   └── i18n.js               # Système de traduction
│   ├── scripts/
│   │   ├── core/                 # État, event bus, utilities
│   │   ├── data/                 # Données (251 Pokémon, moves, locations)
│   │   ├── display/              # UI rendering
│   │   └── gameplay/
│   │       ├── combat/           # Moteur de combat temps réel
│   │       ├── economy/          # Mine, inventaire, shop
│   │       ├── quests/           # Système de quêtes
│   │       ├── breeding/         # Pension et éclosion
│   │       ├── save/             # Sauvegarde localStorage
│   │       └── world/            # Équipe, collection, roaming
│   └── loader.js                 # Chargeur de modules
└── tool/
    └── download_sprites.bat      # Script de téléchargement des sprites
```

### 🎯 Fonctionnalités principales

- **251 Pokémon** de Kanto et Johto
- **Combat automatique** style PokéChill
- **Carte interactive** avec déblocage progressif
- **8 champions** + Ligue Pokémon par région
- **Élevage** et éclosion d'œufs
- **Mine souterraine** avec fossiles
- **55+ objets** équipables avec effets
- **Quêtes** principales, secondaires et répétables
- **Pokédex** complet
- **Système shiny** (1/4096, 3x avec Charme Chroma)
- **Économie** : boutiques, marché, trésors

### 🔧 Technique

- **Architecture modulaire** : 108 modules JavaScript
- **Système de localisation** : français et anglais
- **Sauvegarde** : localStorage avec export/import JSON
- **Sprites** : PokeAPI (251 Pokémon × 4 vues)
- **Compatibilité** : navigateurs modernes (Chrome, Firefox, Edge)
- **Serveur requis** : Python 3.6+ (`python -m http.server 8000`)

### 📝 Notes

- Le jeu **ne fonctionne pas** en ouvrant `index.html` directement (protocole `file://`)
- Utilisez **`LANCER.bat`** ou lancez manuellement `python -m http.server 8000`
- Sauvegarde automatique toutes les 60 secondes
- Support mobile avec barre de navigation

---

**Développé avec ❤️ pour les fans de Pokémon**