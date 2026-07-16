# Audit préliminaire des lieux — Kanto / Johto

> Statut : audit uniquement. Les données de carte/progression n'ont pas encore été modifiées dans cette étape.

## 1. Constats techniques

### 1.1. Le champ `badgeReq` n'est presque pas utilisé pour débloquer les zones
Beaucoup de lieux possèdent un `badgeReq`, mais la logique principale de déblocage actuelle repose surtout sur :

- le graphe `conn` ;
- le nombre de combats gagnés sur le lieu voisin (`minWins`) ;
- `G.unlockedLocs` ;
- un bypass complet si le joueur possède 8 badges.

Conséquence : certaines zones peuvent devenir accessibles dans un ordre incohérent si une connexion les relie trop tôt.

### 1.2. Les connexions servent de prérequis, pas seulement de liens visuels
La fonction `locReachable(id)` considère qu'un lieu est atteignable si l'un des lieux listés dans `loc.conn` est déjà atteignable et nettoyé. Donc chaque `conn` est en pratique un prérequis potentiel.

Cela impose de corriger la carte avec prudence : une connexion ajoutée pour l'affichage peut aussi changer la progression.

### 1.3. `minWins` est uniforme
`MIN_WINS_DEFAULT = 10` est appliqué à presque tous les lieux non-villes. Ce système donne une progression régulière, mais ne reproduit pas bien les verrous officiels comme :

- badges ;
- CS / capacités terrain ;
- événements Team Rocket ;
- Pokéflûte / Ronflex ;
- accès maritime ;
- Ligue ;
- zones post-game.

## 2. Kanto — incohérences probables à corriger dans l'étape carte/logique

### 2.1. Route 22 / Route 23 / Route Victoire / Plateau Indigo
Actuellement, la chaîne vers la Route 23 et la Route Victoire peut être atteinte trop tôt via les connexions autour de Jadielle / Route 22.

Correction envisagée :

- Route 22 : accessible tôt, optionnelle.
- Route 23 : verrouillée tardivement, après 8 badges.
- Route Victoire : après Route 23 et 8 badges.
- Plateau Indigo : après Route Victoire.

### 2.2. Caverne Azurée
Doit rester post-Ligue / post-8 badges, pas seulement liée à Azuria.

Correction envisagée : condition spéciale `championTitle` ou 8 badges + Ligue.

### 2.3. Chenaux 19 / 20 / 21, Îles Écume, Cramois'île
À traiter comme progression Surf / badges de milieu-fin de jeu. Actuellement certaines connexions peuvent créer des raccourcis.

Correction envisagée : accès maritime après badge adéquat et progression vers Parmanie / Cramois'île.

### 2.4. Centrale Électrique
Zone optionnelle liée à Route 10 / Surf dans les jeux. Elle ne devrait pas être un passage principal obligatoire.

## 3. Johto — incohérences probables à corriger dans l'étape carte/logique

### 3.1. Routes 26 / 27 / 28 / Plateau Indigo / Mont Argenté
Ces zones sont post-8 badges / fin de jeu. Elles ne doivent pas servir de raccourcis prématurés.

### 3.2. Route 37 / Parc Naturel / Routes 38/39
L'ordre officiel est plutôt :

Bourg Geon → Ville Griotte → Mauville → Route 32 → Caves Jumelles → Écorcia → Bois aux Chênes → Doublonville → Route 35 / Parc Naturel / Route 36 → Rosalia → Oliville.

Le graphe actuel a des routes parfois présentes dans un fichier secondaire et parfois reliées de façon trop large.

### 3.3. Acajou / Lac Colère / Route 43 / Team Rocket
Dans les jeux, Acajou et le Lac Colère sont liés à un événement important. Le badge seul ne représente pas parfaitement ce verrou.

Correction possible : garder un verrou simplifié par badges, ou ajouter un événement de progression.

### 3.4. Route 44 / Route de Glace / Ébènelle
Route 44 et Route de Glace devraient être séparées plus clairement.

### 3.5. Mont Argenté
Zone post-Ligue / post-16 badges idéalement. Dans ce jeu limité Kanto+Johto, minimum : post-Ligue ou très fin de Johto.

## 4. Noms FR à vérifier / corriger

### Kanto
- `viridianforest` : actuellement **Forêt Jadielle**. Nom officiel à privilégier : **Forêt de Jade**.
- `route23` : actuellement **Route 23 / Victoire**. Préférer **Route 23** ou **Route 23 — accès Route Victoire**.
- `victoryroad` : **Route Victoire** est correct ; éviter de mélanger avec Route 23.

### Johto
Corrections probables :

- `nationalpark` : **Parc National** → probablement **Parc Naturel**.
- `slowpokewell` : **Puits Spinarak** → **Puits Ramoloss**.
- `burnedtower` : **Tour Brûlante** → **Tour Cendrée**.
- `tintower` : **Tour Cendrée** → **Tour Ferraille** ou **Tour Carillon** selon la version choisie.
- `mtmortar` : **Mt. Mortar** → **Mont Creuset**.
- `darkcave` : **Grotte Obscure** → **Antre Noir**.
- `whirlislands` : **Îles Whirl** → **Tourb'Îles**.
- `icepath` : **Chemin Glace** → **Route de Glace**.
- `jroute44` : **Route 44 / Glace** → séparer **Route 44** et **Route de Glace**.
- `blackthorn` : **Ébénelle** → vérifier accent officiel, probablement **Ébènelle**.
- `mtsilver` : **Mt. Argent** → **Mont Argenté**.
- `tohjofalls` : **Cascade Tohjo** → **Chutes Tohjo**.

## 5. Noms EN à vérifier / corriger

- Les routes anglaises utilisent souvent **Road** dans la localisation actuelle. Les jeux officiels utilisent plutôt **Route**.
  - Exemple : `Road 29` → `Route 29`.
- `Sea Road 40/41` → plutôt `Route 40` / `Route 41` ou `Sea Route 40/41` si on veut garder le style maritime.
- `Mt. Argent` côté FR et `Mt. Silver` côté EN doivent être harmonisés.
- `Tin Tower` / `Bell Tower` : choisir une convention selon génération.

## 6. Proposition pour l'étape suivante

### Étape 2 — Carte + logique

1. Corriger les noms FR/EN dans les localisations.
2. Nettoyer les doublons Johto entre `locations-data.js` et `locations-johto.js` si nécessaire.
3. Ajouter une notion simple de progression officielle :
   - ordre de badges ;
   - routes principales ;
   - zones optionnelles ;
   - zones post-game.
4. Corriger les connexions qui créent des raccourcis incohérents.
5. Faire en sorte que les messages "X combats pour débloquer Y" ne mentionnent que des zones réellement débloquées par ce lieu.
