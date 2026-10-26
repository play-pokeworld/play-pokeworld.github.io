# Phase v1.14.38 — Marqueur Joueur sur la Carte, Ergonomie & Parité PNJ Base Secrète, et Analyse d'Équilibrage

## Résumé de la version 1.14.38

Cette mise à jour corrective et structurelle apporte :
1. **Marqueur visuel du joueur sur la carte du monde** : Restauration du marqueur animé du dresseur (`pw-map-player`, `pw-map-player-ring`, `pw-map-player-bob`) centré sur le nœud du lieu actuel avec infobulle localisée (« Vous êtes ici »).
2. **Correction du filtre de recherche de l'éditeur de PNJ** : Suppression de la perte de focus lors de la saisie dans le sélecteur d'apparence (galerie des 101 sprites) et dans le sélecteur de Pokémon. Le champ de texte reste focalisé et actif en permanence.
3. **Parité complète des cartes de l'équipe du PNJ** : Remplacement des conteneurs simplifiés par le composant unifié `PokemonCardView` (`BaseNpcMemberCard`), affichant la liste complète des 4 capacités (`poke-moves`), le niveau, le sprite animé/statique, le badge d'objet tenu, le bouton de retrait direct `✕` et le clic pour remplacer le membre.
4. **Validation des orientations d'équilibrage du jeu** : Fixation des règles de capture, propositions concrètes pour la Pension et l'économie, et benchmark du moteur de combat en auto-battle.

---

## 1. Marqueur visuel du joueur sur la carte (`UIMapView` & `MapPanel`)

### Problématique
Dans l'ancienne implémentation de `UIMapView`, seuls les calques de terrain, de nœuds (`.pw-map-nodes`) et de libellés (`.pw-map-labels`) étaient créés. L'avatar du joueur n'apparaissait pas sur la carte, rendant impossible la visualisation immédiate de sa position actuelle.

### Solution apportée
- **Calque SVG dédié (`.pw-map-player-layer`)** : Ajouté en sommet de pile au-dessus des libellés et des nœuds.
- **Composant SVG fidèle à la référence** :
  - Groupe `.pw-map-player` avec infobulle `<title>` (« Vous êtes ici » / « You are here »).
  - Anneau pulsé `.pw-map-player-ring` centré sur les coordonnées `(cx, cy)` du lieu.
  - Groupe d'animation de sautillement `.pw-map-player-bob` avec ellipse d'ombre au sol (`opacity: 0.35`) et élément `<image>` du sprite de dresseur (`AssetPaths.trainerSprite`).
- **Synchronisation dynamique** :
  - `MapPanel._render()` vérifie si la localisation active du joueur appartient à la région affichée.
  - Lors d'un voyage vers un nouveau lieu, le marqueur se déplace instantanément aux nouvelles coordonnées.
  - Lors de la consultation d'une autre région, le marqueur est masqué proprement sans erreur.

---

## 2. Modale PNJ de Base Secrète (`SecretBaseNpcModal`)

### Problème A : Perte de focus lors de la recherche dans les sélecteurs
- **Cause** : À chaque caractère saisi (`onInput`), la méthode appelait `this._render()`, ce qui détruisait l'ensemble du DOM de la modale, réinitialisant le champ de texte et coupant la saisie.
- **Correction** : Séparation stricte entre le conteneur du champ de recherche et la grille de résultats :
  - Dans `_renderSpritePicker()` : `filterInput` est instancié une seule fois. L'événement `onInput` invoque `this._updateLooksGrid()` qui rafraîchit uniquement les enfants de `this._looksGrid` et le compteur textuel, sans jamais détruire le champ de saisie.
  - Dans `_renderMonPicker()` : `searchInput` est instancié une seule fois. L'événement `onInput` invoque `this._updateMonCandidates()` qui filtre et met à jour uniquement la liste des candidats dans `this._monCandidatesContainer`.

### Problème B : Affichage et parité des cartes de l'équipe du PNJ
- **Cause** : Les cartes utilisaient un bloc ad-hoc compact (`pw-base-npced-mon-card`) sans capacités, sans objet tenu, et sans le design système unifié du jeu.
- **Correction** :
  - Création du composant dédié `BaseNpcMemberCard` (`src/panels/components/BaseNpcMemberCard.js`), héritant directement de `PokemonCardView`.
  - Intégration complète de la structure `.poke-card` :
    - En-tête : niveau (`.poke-level`), nom d'espèce localisé, icône de capture, badge d'objet tenu (`.poke-item-badge`), et bouton de retrait rapide `✕` (`.pw-preset-remove.pw-base-npced-mon-del`).
    - Visuel : sprite de Pokémon en taille contextuelle avec détection shiny.
    - Capacités : liste complète des 4 attaques (`PokemonMoveList` / `.poke-moves`) avec pastilles colorées par type et jauges de PP.
    - Interaction : le clic sur la carte ou le sprite bascule sur le sélecteur de Pokémon (`_mode: 'mon-picker'`) pour remplacer le membre de ce slot.
    - Emplacement libre : rendu sous forme de zone de dépôt stylisée `.pw-drop-zone.preset-slot-empty.pw-base-npced-mon-add` avec bouton `+ Ajouter un Pokémon` jusqu'à concurrence de 6 membres.

---

## 3. Analyse & Stratégie d'Équilibrage Global

### A. Taux de capture (Catch rates)
- **Constat** : Les Pokémon rares ont déjà des apparitions et des probabilités adaptées. Réduire les taux de capture pénaliserait excessivement le joueur et rendrait les captures impossibles ou frustrantes.
- **Décision** : **Maintien strict des taux de capture actuels**. Aucune baisse de taux de capture n'est appliquée.

### B. Progression, XP et Pension / Garderie
- **Plafond 0 XP en combat actif** : Le palier coupant l'XP à 0 au-delà d'un écart de 10 niveaux (`gap >= 10 → 0 XP`) est **normal et voulu** pour empêcher le sur-leveling passif (AFK farming) sur les premières routes du jeu.
- **Faille identifiée à la Pension** :
  - Actuellement, tout K.O. sauvage (même un Roucool Niv. 2 sur la Route 1) incrémente le compteur de la Pension (`10 K.O. = +1 niveau`).
  - Lorsque les automatisations ne sont pas achetées, les frais sont à 0 ₽, permettant d'amener gratuitement un Pokémon au niveau 100 sans aucun danger.
- **Solutions concrètes pour la Pension** :
  1. *Frais obligatoires par niveau* : Rétablir le prélèvement systématique des frais de pension (ex. 100 ₽ par niveau gagné ou montant indexé sur le niveau) quel que soit le mode d'automatisation. En cas de solde insuffisant, le Pokémon cesse de progresser ou est expulsé au PC (`daycare_evicted_funds`).
  2. *Échelonnement des K.O. par palier de niveau* : Passer d'un ratio plat de 10 K.O./niveau à une formule proportionnelle au niveau du pensionnaire (ex. `10 + floor(level / 10) * 10` K.O.), évitant qu'un Pokémon de niveau 85 ne monte au niveau 86 au même rythme qu'un niveau 5.
  3. *Condition de niveau minimum de l'adversaire* : Ne comptabiliser les K.O. pour la pension que si le niveau du Pokémon adverse est supérieur ou égal à un pourcentage du pensionnaire (ex. au moins 30 % ou 50 % de son niveau).

### C. Moteur de combat (Auto-battle, Vitesse vs Stats)
- **Pas d'IA en combat** : Le jeu s'inscrit dans le paradigme de l'auto-battler où toute la réflexion et l'expertise du joueur se situent dans la **préparation en amont** (composition des 6 membres, choix des 4 capacités, objets tenus, synergie des talents, répartition des EV/IV). Le déroulement en combat reste automatique et prévisible.
- **Rôle de la Vitesse** : L'avantage de vitesse (cadence d'attaque plus rapide) est normal et contrebalancé par les autres statistiques :
  - Les Pokémon très rapides sont généralement des « canons de verre » (faibles PV, faibles défenses).
  - Les Pokémon lents compensent par un bulk massif (PV et Défense élevés) et une puissance de frappe brute capable de punir les attaquants fragiles dès leur premier coup.

### D. Économie concrète
- **Puits de monnaie (Sinks)** :
  - Achat de Poké Balls (Hyper Balls, Balls de spécialité).
  - Frais de pension et d'éclosion d'œufs.
  - Vitamines d'EV et capsules.
  - Tickets d'entrée et clés de donjons.
  - Décorations et extensions de la base secrète.
- **Sources de monnaie (Faucets)** :
  - Victoires sauvages échelonnées par région et nombre de badges (`RewardRules.wildMoney`).
  - Re-défis d'arènes et ligues régionales.
  - Vente de trésors miniers (pépites, perles) à la Boutique.

---

## 4. Tests et Conformité

- **Suite de tests automatisée** : **635 tests passés avec succès (100 % de réussite, 0 échec)**.
- **Règles statiques** : 27/27 règles respectées sans aucune violation :
  - Règle « une seule classe par fichier » respectée (`BaseNpcMemberCard.js`).
  - Pas d'injection HTML de chaînes de caractères.
  - Aucune dépendance globale orpheline.
  - Localisation intégrale FR / EN vérifiée.
- **Archive livrable** : `pokeworld-rework-1.14.38.zip`.
