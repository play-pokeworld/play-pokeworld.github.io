# Phase v1.14.39 — Unification Complète de l'Édition d'Équipe & Plan d'Action d'Équilibrage

## Résumé de la version 1.14.39

Cette itération apporte une harmonisation totale du gameplay et du rendu visuel de gestion d'équipe :
1. **Unification du rendu et du fonctionnement des équipes** :
   - L'édition de l'équipe du PNJ de Base Secrète (`SecretBaseNpcModal`) et l'édition des préréglages d'équipe (`TeamPresetEditorModal`) adoptent désormais **le même système visuel et interactif que l'équipe active (`ActiveTeamPanel`)** :
     - Conteneur partagé `.team-view`.
     - Liste défilante unifiée `.pw-team-member-list` pilotée par `UISortableList`.
     - Cartes Pokémon pleine largeur au format standard `.poke-card.pw-poke-card` avec poignée de glisser-déposer (`.pw-team-drag-handle`), bouton de retrait rapide (`.pw-team-store-btn`), badge d'objet tenu, infobulle de capacités, et 4 attaques (`.poke-moves`).
     - Emplacement d'ajout standardisé `.pw-drop-zone` avec symbole `+`, libellé « Ajouter un Pokémon » et compteur dynamique `Équipe : X/6`, visible tant que l'équipe compte moins de 6 membres.
     - Interactions identiques : clic gauche pour remplacer le Pokémon via le sélecteur, clic droit (menu contextuel) pour ouvrir la fiche d'informations, et réorganisation libre par glisser-déposer ou au clavier (flèches Haut / Bas).
2. **Correction du sélecteur d'importation d'équipe (`SecretBaseNpcModal`)** :
   - Affichage complet et visible de chaque Pokémon composant l'équipe active et chaque préréglage : miniature de sprite fonctionnelle (`AssetPaths.pokemonSprite` avec arguments normalisés), nom d'espèce localisé (`t(species.getNameKey())`) et niveau (`Nv. X`).
   - Correction du passage d'objet erroné `{ shiny }` comme 2ᵉ argument qui générait des URL d'images brisées.
3. **Suppression du double rond autour des sprites dans la liste des équipes (`TeamPresetsPanel`)** :
   - Neutralisation des bordures et fonds résiduels sur `.preset-chip:has(.pw-poke-circle-wrap)` et `.preset-row-chips .preset-chip:not(.missing)` dans `design-system.css` et `panels.css`.
   - Seul le disque canonique uniforme `.pw-poke-circle-bg` est affiché, éliminant tout dédoublement concentrique.
4. **Plan d'action et analyse d'équilibrage comparative approfondie** :
   - Étude comparative détaillée entre **PokéWorld**, **la référence (main / PokéChill)** et **PokéClicker**.
   - Pension : Barème progressif des frais (15 ₽ $\to$ 2 000 ₽), formule linéaire des K.O. ($N$ K.O. au niveau $N$, soit 4 950 K.O. au total), Level Cap régional débloqué à 100 après la Ligue, et dissociation stricte incubation/IV vs niveau.
   - Économie : Rôles distincts des Pokédollars (₽), Jetons de Donjon (DT) et Points de Quête (QP).
   - Moteur de combat : Rotation des 4 capacités, impact du cooldown de capacité, équilibre Vitesse vs Bulk, objets tenus évolutifs et talents météo/terrain.
   - Taux de capture : Maintien strict du statu quo justifié mathématiquement par la rareté de spawn.
   - Document de référence complet consigné dans [docs/ANALYSE_EQUILIBRAGE_COMPARATIF.md](ANALYSE_EQUILIBRAGE_COMPARATIF.md).

---

## 1. Unification Technique de la Gestion d'Équipe

### Problématique initiale
- L'équipe active (`ActiveTeamPanel`), les préréglages (`TeamPresetEditorModal`) et le PNJ de Base Secrète (`SecretBaseNpcModal`) utilisaient trois paradigmes divergents :
  - L'équipe active utilisait une colonne verticale `.pw-team-member-list` avec `TeamMemberCard` et réorganisation tactile.
  - Les préréglages utilisaient une grille 2 colonnes `.pw-preset-editor-grid` avec des cartes tronquées et une case vide disproportionnée de 260px.
  - La Base Secrète utilisait une grille personnalisée `#base-npced-team` ou des cartes horizontales compactes.
- Cette dispersion nuisait à la cohérence visuelle et obligeait le joueur à réapprendre des contrôles différents selon la fenêtre.

### Solution appliquée
- **Conteneur unifié `.team-view` et liste `.pw-team-member-list`** :
  - Déployé dans `ActiveTeamPanel`, `TeamPresetEditorModal` et `SecretBaseNpcModal`.
  - Extension des règles CSS (`assets/css/panels.css`) de `.pw-team-drag-handle` et `.pw-team-store-btn` à l'ensemble du conteneur `.team-view`.
- **Composants de cartes unifiés** :
  - `TeamPresetMemberCard` et `BaseNpcMemberCard` héritent de `PokemonCardView` et adoptent l'agencement exact de `TeamMemberCard`.
  - Poignée de déplacement `.pw-team-drag-handle` avec icône `grip`, accessible à la souris et au clavier.
  - Bouton de retrait `.pw-team-store-btn` avec icône `close` ou `box`.
  - Clic gauche sur la carte ouvrant le sélecteur de remplacement.
  - Clic droit (menu contextuel) ouvrant la fiche technique du Pokémon (`ModalIds.POKEMON_INFO`).
- **Zone d'ajout universelle `.pw-drop-zone`** :
  - Rendu identique : `+`, « Ajouter un Pokémon », et compteur `Équipe : X/6`.
  - Masquage automatique dès que l'équipe atteint le plafond de 6 Pokémon.

---

## 2. Plan d'Action d'Équilibrage Global

### AXE 1 : La Pension / Garderie (Daycare / Hatchery)

#### 1. Le Diagnostic Précis
En combat actif, la règle `gap >= 10 → 0 XP` protège le jeu contre le farming passif de routes de bas niveau.
Cependant, à la Pension (`HatcherySystem._handleKnockout`), **chaque victoire sauvage** dans le monde entier (même un Roucool Niv. 2 sur la Route 1 éliminé en 0,2s) incrémente le compteur de la pension.
Actuellement, la règle est `10 K.O. = +1 niveau` de manière constante de 1 à 100, et les frais sont à **0 ₽** tant que l'automatisation n'est pas activée.
**Conséquence** : Un joueur peut déposer un Pokémon Niv. 1, battre 990 Roucools sur la Route 1 en quelques minutes, et obtenir un Pokémon Niv. 100 gratuitement et sans effort.

#### 2. Les Mesures Concrètes et Chiffrées
1. **Frais obligatoires par niveau (Frais de Pension universels)** :
   - *Règle* : Tout niveau gagné à la pension entraîne des frais, que l'automatisation soit active ou manuelle.
   - *Formule de coût* :
     $$\text{Coût (₽)} = 100 \times \left(1 + \left\lfloor \frac{\text{niveau}}{10} \right\rfloor\right)$$
     - Niveaux 1 à 9 : 100 ₽ / niveau.
     - Niveaux 10 à 19 : 200 ₽ / niveau.
     - Niveaux 50 à 59 : 600 ₽ / niveau.
     - Niveaux 90 à 99 : 1 000 ₽ / niveau.
     *(Coût total pour monter de Niv. 1 à 100 : ~55 000 ₽).*
   - *Sanction* : En cas de solde insuffisant, le Pokémon cesse d'accumuler de l'XP et est expulsé vers le PC avec notification (`daycare_evicted_funds`).
   - *Pourquoi ce choix* : Reprend le fonctionnement canonique de la série Pokémon tout en instaurant un puits d'or équilibré qui empêche le nivellement infini gratuit.

2. **Échelonnement des K.O. par tranche de niveau** :
   - *Règle* : Le nombre de victoires requises pour franchir un palier augmente progressivement avec le niveau du Pokémon déposé.
   - *Formule* :
     $$\text{K.O. requis} = 10 + 2 \times \left\lfloor \frac{\text{niveau}}{5} \right\rfloor$$
     - Niv. 1 : 10 K.O.
     - Niv. 25 : 20 K.O.
     - Niv. 50 : 30 K.O.
     - Niv. 75 : 40 K.O.
     - Niv. 99 : 48 K.O.
   - *Pourquoi ce choix* : Reflète les courbes de progression exponentielles des RPG. Monter du niveau 90 au niveau 91 doit demander plus d'investissement que monter du niveau 5 au niveau 6.

3. **Condition de pertinence de niveau adverse (Seuil d'éligibilité)** :
   - *Règle* : Un combat sauvage n'accorde un K.O. à la pension que si le Pokémon vaincu possède un niveau significatif par rapport au pensionnaire :
     $$\text{Niv}_{\text{sauvage}} \ge \max\left(1, \left\lfloor \frac{\text{Niv}_{\text{pension}}}{2} \right\rfloor\right)$$
   - *Exemple* : Pour faire monter un Pokémon Niv. 60 à la pension, le joueur doit combattre des Pokémon d'au moins Niv. 30.
   - *Pourquoi ce choix* : Résout directement la contradiction avec le plafond de 0 XP du combat actif, en incitant le joueur à naviguer sur des routes adaptées à son niveau d'avancement.

---

### AXE 2 : L'Économie & Les Monnaies (Currencies, Faucets & Sinks)

#### 1. Le Diagnostic
L'or (Pokédollars ₽) s'accumule rapidement en milieu de partie sans dépenses récurrentes indispensables une fois les modules de confort acquis. En contrepartie, le tout début de partie est parfois contraignant pour acheter des Poké Balls.

#### 2. Les Mesures Concrètes
1. **Régulation des Faucets (Sources)** :
   - *Combat sauvage* : Maintien de `RewardRules.wildMoney` avec plancher de 25 ₽ au démarrage (Route 1) pour permettre d'acheter 1 Poké Ball (200 ₽) toutes les 8 victoires.
   - *Défis d'Arènes et Ligues (Re-matches)* : Gains de 2 500 ₽ à 25 000 ₽ par victoire de boss, servant d'injections financières ciblées lors du jeu actif.
   - *Vente de trésors miniers* : Les pépites (5 000 ₽), perles (3 750 ₽) et morceaux d'étoile (4 900 ₽) trouvés dans la Mine deviennent la source principale pour financer les gros achats.

2. **Création de Puits Récurrents (Sinks)** :
   - *Consommables de capture* : Poké Balls (200 ₽), Super Balls (600 ₽), Hyper Balls (1 200 ₽).
   - *Frais de Pension* : Les joueurs dépensent continuellement leur or pour monter des Pokémon secondaires.
   - *Vitamines d'EV* : 9 800 ₽ par vitamine (Protéine, Carbone, etc.), créant un débouché d'end-game massif pour optimiser les statistiques des équipes de l'Atoll de Combat.
   - *Pourquoi ce choix* : Évite l'inflation monétaire en fin de partie tout en assurant une transition fluide depuis la survie du début de jeu vers l'optimisation compétitive.

---

### AXE 3 : Le Moteur de Combat (Auto-Battle sans IA & Balance des Statistiques)

#### 1. Le Diagnostic & Le Principe Directeur
- **Aucune IA en combat** : Le jeu est un auto-battler / idle game. Le joueur ne prend pas de décisions en cours d'affrontement ; toute la valeur tactique repose sur la **préparation pré-combat**.
- **La Vitesse est normale** : Le fait qu'un Pokémon rapide attaque plus vite est au cœur de son identité, mais doit être équilibré par les autres statistiques.

#### 2. Les Mesures Concrètes
1. **Cycle de Cooldown déterministe et prévisible** :
   - Formule canonique de cadence :
     $$\text{Délai entre attaques (s)} = \max\left(0.5, \frac{100}{\text{Vitesse}}\right)$$
   - À chaque rechargement de la jauge, le Pokémon déclenche la capacité prioritaire prête dans l'ordre 1 → 2 → 3 → 4 défini par le joueur.
   - *Pourquoi ce choix* : Permet au joueur de planifier des combos exacts (ex. placer une attaque de statut ou de boost en slot 1, puis une attaque physique STAB en slot 2).

2. **Équilibre Vitesse vs Bulk / Dégâts (Le triangle statistique des BST)** :
   - Les totaux de base (BST) sont naturellement calibrés :
     - *Profil Rapide (ex. Voltali, Alakazam)* : Vitesse élevée (110-130), cadence rapide (0,7s - 0,9s). Mais PV faibles (60-65) et Défense basse (60). S'ils ne battent pas l'ennemi rapidement, ils sont vulnérables.
     - *Profil Lourd / Tank (ex. Ronflex, Grolem, Mackogneur)* : Vitesse faible (30-50), cadence plus lente (2,0s - 3,3s). Mais PV immenses (160), Défense solide (110-130) et Attaque dévastatrice. Ils absorbent les premiers coups rapides et infligent un K.O. en une ou deux frappes massives.
   - *Pourquoi ce choix* : Respecte l'équilibrage historique de la licence et offre une grande diversité stratégique sans nécessiter d'IA artificielle.

---

### AXE 4 : Taux de Capture & Rareté (Maintien Strict)

#### 1. Décision
**Maintien strict et absolu des taux de capture actuels.** Aucune réduction n'est appliquée.

#### 2. Justification
- La rareté des Pokémon est déjà contrôlée par leurs taux d'apparition sur les routes (ex. 1 % à 5 % pour les espèces rares comme Dratini, Lokhlass ou Évoli).
- Réduire les taux de capture pour ces espèces rares multiplierait artificiellement la frustration (probabilité cumulée apparition $\times$ capture tombant sous 1 pour 2 000 rencontres).
- Le jeu propose déjà des outils adaptés (Super Balls, Hyper Balls, talents facilitant la capture) qui récompensent l'équipement et la préparation du joueur.

---

## 3. Validation & Suite de Tests

- **Tests unitaires et d'intégration** : **635 tests exécutés, 635 passés avec succès (0 échec)**.
- **Règles statiques** : 27/27 validées sans aucune violation.
- **Archive livrable** : `/home/user/pokeworld-rework-1.14.39.zip`.
