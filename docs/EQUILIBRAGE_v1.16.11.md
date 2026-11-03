# Équilibrage — lecture des données et propositions (v1.16.11)

> Source des chiffres : `node tools/sim/balance-sim.mjs` → `docs/SIMULATION_v1.16.11.md`
> (données brutes dans `artifacts/sim-full.json`). Tous les combats sont exécutés par le vrai
> `BattleSystem` ; seules les décisions du joueur sont modélisées.

## 1. Ce que la simulation mesure — et ce qu'elle ne mesure pas

**Mesuré** (fiable) :

- le temps réel de combat (horloge du moteur, pas une estimation) ;
- les gains de ₽ et d'XP par heure, calculés sur les récompenses réelles ;
- le taux de défaite par région et par lieu ;
- le **niveau minimal** auquel une équipe de 6 gagne chaque arène / ligue, trouvé par
  dichotomie en exécutant réellement le combat.

**Non mesuré** (à ne pas lire dans les tableaux) :

- les menus, le déplacement, la capture, les quêtes, l'AFK, l'entraînement → le temps affiché
  est du **temps de combat pur**. Un joueur réel passe grossièrement 2,5 à 3 fois plus de temps
  (ordre de grandeur, non simulé) ;
- les objets (potions, rappels) : le modèle se bat **sans sac** ;
- les changements de Pokémon en cours de combat et les types adverses : le modèle garde le
  starter actif, avec deux compagnons de secours re-synchronisés à son niveau ;
- le farm volontaire : le modèle quitte un lieu dès qu'il a 3 niveaux d'avance.

Conséquence de lecture : **un « mur » n'est pas une preuve de blocage du jeu**, c'est le point où
le modèle (sans sac, sans changement, sans farm volontaire) abandonne. Ce qui est solide, c'est
l'**écart de niveau** entre l'arène et le sauvage disponible au même palier de badges.

## 2. Temps de jeu — ordre de grandeur

| Région | Départ | Niveau 5 → sortie | Combats | Temps de combat | Estimation de jeu réel (×2,5–3) |
| --- | --- | --- | ---: | ---: | ---: |
| Kanto | starter neuf | 5 → 39 | 2 282 | **1,8 h** | **4,5 – 5,5 h** |
| Johto | starter neuf | 5 → 23 | 767 | **0,9 h** | **2,3 – 2,8 h** |
| Hoenn | starter neuf | 5 → 13 | 228 | **0,25 h** (puis mur `route105`) | non extrapolable |
| Hoenn | équipe vétérane | 39 → 46 | 548 | 3,7 h | — |

Lecture : **environ 60 combats par niveau** en Kanto (2 282 combats / 34 niveaux) à ~2,9 s par
combat. C'est le vrai coût de progression aujourd'hui. Johto est deux fois plus court en combat
mais s'arrête 16 niveaux plus bas ; Hoenn ne se mesure pas avec ce modèle (voir §4.3).

## 3. Gains de ressources

| Région | ₽ / heure | XP / heure |
| --- | ---: | ---: |
| Kanto | 62 000 – 79 000 | 51 000 – 60 000 |
| Johto | 97 000 | 22 000 |
| Hoenn (vétéran) | 43 000 | 18 000 |

Ordre de grandeur utile : **une heure de combat en Kanto ≈ 65 000 ₽**. À comparer aux prix du
marché : c'est la jauge à surveiller si les prix doivent rester « quelques heures d'économie »
pour un objet cher.

## 4. Anomalies confirmées, causes et propositions

### 4.1 Écart arène ↔ sauvage disponible (le vrai sujet d'équilibrage)

Le modèle donne, pour chaque arène, le niveau minimal de victoire et le meilleur niveau sauvage
accessible au même nombre de badges. L'écart est le nombre de niveaux à farmer « à vide » :

| Région | Arène | Badges | Sauvage dispo | Niv. min. victoire | Écart |
| --- | --- | ---: | ---: | ---: | ---: |
| Kanto | `koga` | 4 | 36 | 53 | **+17** |
| Kanto | `giovanni` | 7 | 42 | 65 | **+23** |
| Kanto | `misty` | 1 | 20 | 32 | **+12** |
| Kanto | `blaine` | 6 | 42 | 50 | +8 |
| Johto | `clair` | 7 | 35 | 52 | **+17** |
| Hoenn | `norman` | 4 | 35 | 55 | **+20** |
| Hoenn | `flannery` / `winona` / `tate_liza` | 3/5/6 | 35 | 40–42 | +5 à +7 |
| Johto | `falkner` / `bugsy` / `morty` | 0/1/3 | 28 | 11 | **−16 à −17** |
| Hoenn | `brawly` / `wattson` | 1/2 | 25/35 | 14/23 | **−11 à −12** |
| Kanto | `brock` / `erika` | 0/3 | 10/31 | 7/26 | −3 / −5 |

- **Problème** : cinq arènes demandent 12 à 23 niveaux au-dessus de ce que la région offre au
  même palier, cinq autres se gagnent 11 à 17 niveaux *sous* le contenu voisin.
- **Comportement actuel** : rien n'indique au joueur le niveau attendu ; il découvre le mur en
  perdant, et la seule réponse possible est de farmer.
- **Options** :
  1. baisser les équipes des 5 arènes hors norme (`koga`, `giovanni`, `misty`, `clair`,
     `norman`) de 5 à 8 niveaux ;
  2. remonter les 5 arènes trop faciles (`falkner`, `bugsy`, `morty`, `brawly`, `wattson`) ;
  3. ajouter un champ `recommendedLevel` par arène, affiché dans le panneau du lieu, sans
     toucher aux équipes.
- **Recommandation** : **1 + 3**, dans cet ordre. La baisse des cinq arènes hors norme supprime
  le farm forcé ; le champ affiché évite de recréer le problème à la prochaine modification de
  données. L'option 2 est un choix de direction (jeu plus dur) qui t'appartient : les arènes
  faciles ne bloquent personne.
- **Conséquences** : aucune migration de sauvegarde ; un joueur déjà bloqué sur `koga` passe plus
  tôt ; les badges restent dans le même ordre ; la difficulté perçue baisse sur 5 combats seulement.

### 4.2 Ligue : non validable par le modèle

`kanto.elite4` et `hoenn.elite4` ne sont **pas gagnables au niveau 100** par le modèle, qui se bat
sans sac et sans soin entre les membres du conseil. À l'inverse, une sonde manuelle avec 6 Pokémon
de niveau 100 **gagne** (`giovanni` compris). Deux hypothèses restent ouvertes : (a) la chaîne de
combats ne soigne pas entre deux membres — ce qui est le comportement attendu ; (b) la ligue est
réellement trop dure sans sac.

- **Recommandation** : **vérifier en jeu avec un sac rempli** avant toute modification de données.
  Je n'ai pas la preuve que la ligue soit mal réglée, seulement la preuve que le modèle sans sac
  n'y arrive pas.

### 4.3 Murs de progression

| Mur | Contexte | Cause identifiée |
| --- | --- | --- |
| `route105` (Hoenn, neuf) | starter feu niveau 13, rencontres à parité | type eau/roche local contre starter feu, sans second type disponible |
| `jroute41` (Johto, neuf) | niveau 23, rencontres 25-30 | saut de 5 niveaux d'un coup dans l'ordre du lieu |
| `ceruleancave` (Kanto, 8 badges) | niveau 39-45, rencontres 50-56 | contenu post-ligue placé dans l'échelle normale |
| `jroute26` (Johto, vétéran) | équipe 39, rencontres 42-46 | entrée de région par les routes de fin de jeu |

- **Problème** : `ceruleancave` (50-56) est traité comme une étape de l'échelle alors que c'est du
  contenu d'après-ligue ; les routes d'entrée de Johto pour une équipe vétérane sont des routes
  de fin de jeu.
- **Recommandation** : marquer le contenu d'après-ligue (`ceruleancave`, `sky_pillar`…) comme
  **hors échelle** dans les données, pour qu'il ne soit ni proposé comme « prochaine étape » ni
  utilisé par les outils d'équilibrage. Pour `route105`, la vraie réponse est un **type
  alternatif capturable avant** (herbe/électrique) : je ne propose pas de toucher aux niveaux.

## 5. Ce que je n'ai pas fait

- Aucune donnée de jeu n'a été modifiée : ce document est une proposition, pas un patch.
- Le modèle ne remplace pas une partie réelle : il donne des écarts, pas des certitudes de
  ressenti.
- Les valeurs de `artifacts/sim-full.json` bougent de quelques pour cent d'un tirage à l'autre
  (aléatoire du moteur) ; les écarts d'arène, eux, sont stables.
