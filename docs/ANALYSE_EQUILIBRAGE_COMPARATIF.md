# Analyse Comparative et Plan d'Équilibrage Global du Jeu

Ce document présente une analyse approfondie et comparative entre **PokéWorld (Rework)**, **le jeu de référence (main / PokéChill)** et **PokéClicker**, sur les quatre piliers fondamentaux :
1. **La Pension & Reproduction (Daycare / Hatchery)** : Coûts progressifs, Level Cap régional, déblocage de Ligue et courbe de K.O.
2. **Le Moteur de Combat & Équilibre des Pokémon** : Cadence, Vitesse vs Bulk, ordre des capacités, talents météo/terrain et objets tenus.
3. **L'Économie & Les Monnaies** : Rôles complémentaires des Pokédollars (₽), Jetons de Donjon (DT) et Points de Quête (QP).
4. **Taux de Capture & Rareté** : Justification mathématique du statu quo.

---

## I. Analyse Comparative des Moteurs de Combat

### 1. Synthèse Comparative des 3 Systèmes

| Caractéristique | PokéClicker | Référence (main / PokéChill) | PokéWorld (Actuel / Cible) |
| :--- | :--- | :--- | :--- |
| **Philosophie de combat** | Idle clicker pur sans tour | Auto-battler temps réel à jauge | Auto-battler tactique temps réel |
| **Intervention en combat** | Clics manuels + passif global | Aucune (100% pré-combat) | Aucune (100% pré-combat) |
| **Dégâts infligés** | Somme des attaques / 10 par sec | Formule RPG canonique (Niv, Pow, Atk/Def) | Formule RPG canonique (Niv, Pow, Atk/Def) |
| **Cadence d'attaque** | Fixe (1 action d'équipe par sec) | Variable par Pokémon & Capacité (0.5s - 2.6s) | Variable par Pokémon & Capacité (0.5s - 2.6s) |
| **Rôle de la Vitesse** | Inexistant | Détermine le rechargement de la jauge | Détermine le rechargement de la jauge |
| **Gestion des attaques** | Aucune (stat d'attaque globale) | 4 capacités en rotation avec cooldown propre | 4 capacités en rotation avec cooldown propre |
| **Objets tenus** | Aucun en combat actif | Évolutifs selon quantité en sac (paliers 1-25) | Évolutifs avec multiplicateurs dédiés |
| **Talents** | Inexistants | Actifs (météo, stats, statuts, immunité) | Actifs (météo, stats, statuts, immunité) |

### 2. Ce que fait la référence et pourquoi c'est supérieur à PokéClicker
Dans PokéClicker, chaque Pokémon n'est qu'un chiffre qui s'ajoute à une somme globale. Un Ronflex et un Voltali ont le même comportement.
Dans la référence :
- **L'identité de chaque Pokémon est préservée** grâce à ses 6 statistiques canoniques (PV, Attaque, Défense, Attaque Spéciale, Défense Spéciale, Vitesse).
- **Le temps de recharge d'attaque (Cooldown)** est calculé par la formule :
  $$\text{Cooldown Base (ms)} = \text{clamp}\left(1900 \times \frac{100}{100 + \min(\text{Vitesse}, 180)},\ 500,\ 2600\right)$$
- **Chaque capacité modifie ce cooldown** :
  - Capacités prioritaires ou rapides (*Vive-Attaque*, *Aqua-Jet*, *Mach Punch*) : multiplicateur $\times 0.5$ à $\times 0.833$ (le Pokémon attaque 1,2 à 2 fois plus vite).
  - Capacités lourdes ou à recharge (*Ultralaser*, *Lance-Soleil*, *Hydrocanon*) : multiplicateur $\times 1.2$ à $\times 1.5$ (dégâts massifs mais temps d'attente augmenté).
- **L'équilibre Vitesse vs Bulk / Attaque** :
  - Un Pokémon rapide (*Voltali, Alakazam*) attaque souvent mais possède des défenses et des PV faibles. S'il n'élimine pas l'adversaire rapidement, il s'effondre.
  - Un Pokémon lent (*Ronflex, Grolem, Mackogneur*) attaque moins souvent, mais encaisse facilement les premiers assauts grâce à ses PV et sa Défense, avant de riposter par des frappes colossales.
  - **L'Herbe Pouvoir (`power_herb`)** permet aux Pokémon lents d'annuler le malus de recharge de leur attaque lourde.
  - **La Vive Griffe (`quick_claw`)** permet aux Pokémon équipés de capacités rapides d'enchaîner leurs frappes à une cadence fulgurante.

---

## II. La Pension & Reproduction (Daycare / Hatchery)

### 1. Le Diagnostic des Faiblesses Actuelles
- **Frais fixes trop lourds au début, dérisoires à la fin** : Payer 100 ₽ par niveau au niveau 5 est ruineux pour un dresseur débutant qui gagne 10 ₽ par combat, alors qu'au niveau 80 avec 500 000 ₽ en banque, 100 ₽ ne représente rien.
- **Le risque du sur-niveau (Over-leveling)** : Laisser un Pokémon monter niveau 100 dès la première route casse toute la progression de l'histoire et des arènes régionales.
- **La fausse contradiction entre Level Cap et Éclosion / IV** : Le blocage de niveau ne doit en aucun cas bloquer l'incubation des œufs ni le farming des IV.

### 2. Le Plan d'Action Précis pour la Pension

#### A. Le Barème Progressif des Frais de Pension
Pour éviter le gouffre financier précoce et l'absence de coût en fin de jeu, les frais sont indexés sur les tranches de niveau du Pokémon déposé :

| Tranche de Niveau | Étape du Jeu correspondante | Coût par Niveau (₽) | Coût total de la tranche |
| :--- | :--- | :---: | :---: |
| **Niv. 1 à 15** | Début de région (Routes 1-3, Badge 1) | **15 ₽** | 210 ₽ |
| **Niv. 16 à 30** | Milieu de région (Badges 2-4) | **60 ₽** | 840 ₽ |
| **Niv. 31 à 50** | Fin de région (Badges 5-8) | **200 ₽** | 3 800 ₽ |
| **Niv. 51 à 75** | Ligue & Seconde région | **600 ₽** | 14 400 ₽ |
| **Niv. 76 à 100** | Post-game & Atoll de Combat | **2 000 ₽** | 48 000 ₽ |
| **Total Niv. 1 → 100** | — | — | **~67 250 ₽** |

*Bénéfice* : À 15 ₽ par niveau, un joueur débutant peut entraîner son Roucool ou son Bulbizarre sans compromettre son achat de Poké Balls. En fin de partie, entraîner une équipe complète Niv. 100 constitue un véritable débouché économique pour réinvestir les gains de ligue et de mine.

#### B. La Formule Linéaire des K.O. (1 K.O. par niveau)
Pour passer du niveau $N$ au niveau $N+1$, le nombre de victoires requises est exactement égal à $N$ :
- Niveau 1 $\to$ 2 : **1 K.O.**
- Niveau 10 $\to$ 11 : **10 K.O.**
- Niveau 50 $\to$ 51 : **50 K.O.**
- Niveau 99 $\to$ 100 : **99 K.O.**
- **Total cumulé du Niv. 1 au Niv. 100** :
  $$\sum_{N=1}^{99} N = \frac{99 \times 100}{2} = 4\,950\text{ K.O.}$$
*Bénéfice* : Simple, élégant, compréhensible immédiatement par le joueur. Les premiers niveaux montent vite, tandis que les derniers niveaux demandent un vrai temps de jeu.

#### C. Le Plafond Régional (Level Cap) et sa Dissociation avec la Reproduction
1. **Plafond d'XP selon l'avancement de l'histoire** :
   - Un Pokémon ne peut pas dépasser le niveau maximal atteint dans la région en cours (indexé sur le badge le plus élevé possédé, par ex. Badge 1 = Niv. 15, ..., Ligue = Niv. 65).
   - **Déverrouillage total à la Ligue** : Dès que le joueur bat le Maître de la Ligue de la région (Champion Kanto), le plafond de cette région saute définitivement à **100**.
2. **Dissociation totale Éclosion / Reproduction / IV** :
   - L'éclosion d'œufs est basée sur un compteur de K.O. dédié (25 à 100 K.O. selon le BST de l'espèce), **indépendant du niveau d'XP**.
   - Un Pokémon au niveau maximal (ou bloqué à son plafond régional) peut **toujours être reproduit**.
   - Lorsqu'il produit un œuf, l'œuf éclot au niveau 1 avec un transfert / bonus d'IV. Le blocage de niveau n'empêche donc jamais le joueur d'optimiser ses statistiques ou d'obtenir de nouveaux spécimens.

---

## III. Économie & Régulation des 3 Monnaies

À l'instar de PokéClicker et de la référence, un jeu incrémental sain repose sur **3 monnaies aux rôles distincts et non interchangeables** :

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LES TROIS MONNAIES                             │
├──────────────────┬─────────────────────────────┬────────────────────────┤
│     Monnaie      │       Sources (Faucets)     │     Puits (Sinks)      │
├──────────────────┼─────────────────────────────┼────────────────────────┤
│ 1. Pokédollars ₽ │ • Combats sauvages (>=25₽)  │ • Poké Balls / Super / │
│                  │ • Re-matches d'arènes       │   Hyper Balls          │
│                  │ • Vente de trésors miniers  │ • Frais de Pension     │
│                  │                             │ • Marché noir Pokémon  │
│                  │                             │ • Vitamines d'EV (9800)│
├──────────────────┼─────────────────────────────┼────────────────────────┤
│ 2. Jetons de     │ • Captures sauvages réussies│ • Entrées en donjons   │
│    Donjon (DT)   │   (5 DT commun, 15 peu com, │ • Boss exclusifs       │
│                  │    50 rare, 200 légendaire) │ • Coffres de donjon    │
├──────────────────┼─────────────────────────────┼────────────────────────┤
│ 3. Points de     │ • Quêtes d'histoire         │ • Master Balls         │
│    Quête (QP)    │ • Tableau de contrats       │ • Tickets d'incubation │
│                  │   répétables                │ • Objets de confort    │
└──────────────────┴─────────────────────────────┴────────────────────────┘
```

### La Boucle de Gameplay Vertueuse :
1. Le joueur combat sur les routes pour capturer des Pokémon $\to$ Cela génère des **Jetons de Donjon (DT)**.
2. Les DT permettent d'explorer des **Donjons**, qui rapportent des trésors précieux (Pépites, Pierres d'évolution) et des rencontres uniques.
3. Les trésors sont vendus pour obtenir des **Pokédollars (₽)**, finançant les Poké Balls, les frais de Pension et les Vitamines.
4. Les **Points de Quête (QP)** récompensent les missions annexes et débloquent des automatisations et des objets légendaires.

---

## IV. Taux de Capture : Maintien Absolu du Statu Quo

1. **Rareté par le Spawn, et non par le taux de capture** :
   Dans les jeux Pokémon canoniques et incrémentaux, la rareté d'une espèce (ex. Minidraco, Lokhlass, Évoli, Leveinard) est déjà régulée par son taux d'apparition sur la route (1 % à 5 %).
2. **Le piège mathématique d'une baisse des taux de capture** :
   Si un Pokémon apparaît à 1 % et possède un taux de capture abaissé à 5 %, la probabilité combinée d'apparition et de capture chute à $0.01 \times 0.05 = 0.0005$ (1 chance sur 2 000 rencontres sauvages).
   Dans un jeu idle, une telle probabilité crée une frustration disproportionnée sans apporter aucune valeur ludique.
3. **Le rôle des Balls supérieures** :
   Le joueur améliore naturellement son efficacité de capture en investissant ses Pokédollars dans des Super Balls ($\times 1.5$) et des Hyper Balls ($\times 2.0$), ce qui renforce le rôle économique de l'or.
