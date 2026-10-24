# Phase 1.14.26 — Parité Sac (Inventaire) et Fiche d'information Pokémon

**Production : 1.14.26 · schéma de sauvegarde 20, inchangé.**
Référence consultée et reproduite : `main` **64d8f7942ae5b92168b8990813dd16d60a60e7e2**.
Le runtime original n'est pas transplanté ; l'architecture modulaire et rigoureuse du Rework est strictement respectée.

## 1. Sac (Inventaire / BagView) : Parité visuelle et fonctionnelle

Le panneau d'inventaire (`BagPanel`, id `#fs-inventory`) a été restructuré pour retrouver l'ergonomie, les visuels et les enchaînements d'actions de la référence `main`.

### Structure et filtrage par catégories

- **Présentation plein écran** (`UIFullscreenPanel`) avec barre d'outils supérieure (`.inv-toolbar`) hors de la zone de défilement :
  - **7 puces d'onglets de catégories** avec libellé et compteur dynamique d'objets possédés :
    - *Objets principaux* (`cat_main_items`)
    - *Poké Balls* (`cat_pokeballs`)
    - *Objets tenus* (`cat_held_items`)
    - *Évolution* (`cat_evolution`)
    - *Trésors* (`cat_treasures`)
    - *Fossiles* (`cat_fossils`)
    - *CT / CS* (`cat_tms`)
  - **Recherche instantanée** : champ de recherche en direct (`.inv-search`) filtrant sur le nom de l'objet, avec bouton de réinitialisation (`.pw-filter-reset`) restaurant immédiatement la liste complète.
- **Liste défilante** (`.inv-list-root`) :
  - Chaque ligne d'objet (`BagItemRow`, `.inv-item`) affiche son icône nette (`UIItemSprite` 32×32 px), son nom localisé, sa description synthétique et sa quantité courante (`×{count}`).
  - Si une catégorie ou une recherche ne retourne aucun objet, affichage du message vide centré *« Aucun objet dans cette catégorie. »* (`.inv-empty`).

### Gestion différenciée des interactions utilisateur

1. **Clic gauche sur un objet d'évolution (pierres évolutives)** :
   - Bascule immédiate vers la **sous-vue d'évolution inline** (`.pw-sticky-header`, `.pw-starter-grid`) intégrée directement dans le Sac sans quitter le plein écran.
   - En-tête épinglé affichant le sprite de la pierre, son nom et la quantité possédée (`×{qty}`).
   - Grille de cartes candidates éligibles (`.pw-starter-card`) pour chaque Pokémon compatible détenu par le dresseur (équipe ou boîte PC) :
     - Nom de l'espèce cible, niveau requis (`Nv.{reqLevel}` ou *« Niveau requis : {minLevel} »*), flèche vers l'évolution cible (`evo-target-label`).
     - Badge shiny (`★`) si le spécimen est chromatique.
     - Badge de possession (`.evo-owned-badge`) si l'évolution est déjà inscrite au Pokédex.
     - Clic sur une carte candidate : consomme un exemplaire de la pierre, déclenche l'évolution via `ItemUseSystem`, sauvegarde la progression et met à jour l'affichage.
   - Barre d'actions inférieure (`.pw-starter-actions`) avec bouton *« Retour au sac »* restaurant la liste standard des objets.

2. **Clic gauche sur un trésor / objet de valeur (pépite, perle, etc.)** :
   - Bascule immédiate vers la **sous-vue de vente inline** (`.loc-title`, `.loc-sub`, `.pw-starter-actions`).
   - Titre avec le nom de l'objet et sous-titre indiquant le nombre d'exemplaires détenus et le cours unitaire de revente en Pokédollars (ex. *« 3 exemplaires · 100₽ / unité »*).
   - Barre d'actions contenant :
     - *« Vendre un (+{price}₽) »* : vend une unité et crédite le compte du joueur.
     - *« Tout vendre ({count}) (+{total}₽) »* : liquide tout le lot d'un coup.
     - *« Retour au sac »* : annule et restaure la liste standard.

3. **Clic gauche sur un objet non utilisable (ex. restes, fossiles)** :
   - Ouvre directement la modale de détail Dictionnaire (`DictionaryDetailModal`) superposée sur le Sac, avec un bouton d'action contextuel *« Retour au sac »* (au lieu de *« ← Retour au Dictionnaire »*).

4. **Clic droit (menu contextuel) sur n'importe quel objet** :
   - Intercepte le clic droit et ouvre la modale de détail Dictionnaire (`DictionaryDetailModal`) pour inspecter les sources d'obtention, le prix et les caractéristiques détaillées de l'objet, tout en maintenant le Sac ouvert en dessous.

---

## 2. Fiche d'information Pokémon (`PokemonInfoModal`) : Restructuration complète

La modale d'information des Pokémon (`PokemonInfoModal`, id `#poke-modal`) a été intégralement refondue pour offrir une parité visuelle et fonctionnelle totale avec la référence `main`.

### Architecture et hiérarchie visuelle

- **Bandeau de titre canonique** (`.modal-title.poke-detail-title`) :
  - Tag shiny (`★`) doré si le spécimen est chromatique.
  - Nom personnalisé ou nom d'espèce du Pokémon (`.poke-detail-title-name`).
  - Numéro de Pokédex national au format `#025` (`.poke-detail-id`).
  - Bouton standard de fermeture de modale.

- **Hero Card supérieure** (`.poke-detail-hero`) :
  - **Carte de sprite** (`.poke-detail-sprite-card`) : grand sprite officiel contextuel, badges de types colorés (`.type-badge.type-{type}`) et badge de lieu de capture d'origine (`.poke-detail-location`). Suppression des barres parasites de PV et d'EXP pour correspondre strictement au design épuré de `main`.
  - **Boutons de protection réactifs** (`.poke-detail-hero-actions`) :
    - Bouton Favori (`star`) : bascule l'état favori (`is-on` / `is-off`) avec sauvegarde immédiate.
    - Bouton Verrouillage (`shield`) : verrouille ou déverrouille le spécimen contre tout transfert ou libération accidentelle (`is-locked` / `is-off`).

- **Panneau latéral d'onglets de statistiques** (`.poke-detail-side`) :
  - Trois onglets de statistiques (`.poke-detail-stat-tabs [role="tab"]`) :
    1. **Statistiques** (`pokemon_info_tab_stats`) : PV, Attaque, Défense, Attaque Spéciale, Défense Spéciale, Vitesse. Jauges proportionnelles colorées selon la charte des 6 statistiques canoniques (`STAT_COLORS` : PV `#60BE58`, Attaque `#D3425F`, Défense `#539DDF`, Attaque Spéciale `#EF90E6`, Défense Spéciale `#B763CF`, Vitesse `#FBA64C`) basées sur les variables `--pct` et `--bg` du design-system.
    2. **IV (Individual Values)** (`pokemon_info_tab_ivs`) : valeurs individuelles de 0 à 6 pour chaque statistique avec jauges dorées et ratio élégant avec balise `<small>` (ex. `6 / 6`), et ligne récapitulative *« Total des IV : {sum} / 36 »*.
    3. **EV (Effort Values)** (`pokemon_info_tab_evs`) : points d'effort de 0 à 18 par statistique avec jauges bleues et ratio `<small>` (ex. `0 / 18`), et ligne récapitulative *« Total des EV : {sum} / 108 »*.

- **Grille de sections modulaires** (`.poke-detail-section-grid`) :
  1. **Sélecteur de talent** (`PokemonTalentPanel`) :
     - Liste déroulante (`UIDropdown`) des talents connus et débloqués par le joueur pour cette espèce.
     - Puce de talent caché (`.talent-hidden-badge`) indiquant le talent caché de l'espèce et son statut de déblocage (avec glyphe `sparkle` si débloqué).
     - Bouton d'accès direct vers la fiche de détail Dictionnaire du talent actif.
  2. **Panneau de rang** (`.poke-rank-panel`) :
     - Badge visuel du rang de combat du Pokémon.
     - Badge BST (*Base Stats Total*) indiquant la somme des statistiques de base de l'espèce.
  3. **Panneau d'objet tenu** (`.poke-detail-held`) :
     - Affichage de l'icône et du nom de l'objet tenu actuel.
     - Bouton *« Changer »* ouvrant le sélecteur d'objet du Sac en mode `held-item` par-dessus la fiche.
  4. **Panneau des évolutions** (`.pw-progress-card-subtle`) :
     - Liste de toutes les branches d'évolution possibles avec sprite de la forme évoluée, nom, et condition précise (niveau minimum, pierre évolutive, échange, amitié).

- **Bloc des capacités et flux de remplacement interactif** (`.poke-detail-moves-block`) :
  - **Capacités actuelles** (`.poke-detail-moves-list.current`) :
    - Liste des 4 attaques équipées, avec badge de type, nom, puissance, précision et catégorie.
    - Clic gauche sur une attaque : si le Pokémon a 4 capacités, sélectionne l'emplacement pour remplacement (`replaceSlot`), surligne la ligne et active le mode d'apprentissage.
    - Clic droit (menu contextuel) sur une attaque : ouvre directement la modale de détail Dictionnaire de cette capacité.
  - **Capacités apprenables** (`.poke-detail-moves-list.learnable`) :
    - Liste des attaques débloquées par montée de niveau que le Pokémon peut équiper via des pilules d'action cliquables.
    - Clic gauche sur une capacité apprenable : apprend la capacité (ou remplace l'emplacement préalablement sélectionné si 4 capacités sont déjà apprises) directement, avec notification et mise à jour dynamique.
    - Clic droit sur une capacité apprenable : ouvre sa fiche Dictionnaire.
    - Bouton pleine largeur *« Voir toutes les capacités »* ouvrant la liste exhaustive des attaques apprenables par l'espèce.

---

## 3. Compatibilité et utilisation des CT / CS (`BagPanel` et `BoxPanel`)

- **Formatage des noms dans le Sac (`BagPanel`)** :
  - Les capsules techniques et secrètes affichent fidèlement leur suffixe canonique de type (`CT` ou `CS`), ex. `Surf CS`, `Toxik CT`.
- **Filtrage d'éligibilité dans la Boîte PC (`BoxPanel`)** :
  - Lors de l'utilisation d'une CT ou CS depuis le Sac, la Boîte PC passe en mode sélection d'objet (`_itemUseId = itemId`).
  - Seuls les Pokémon de l'équipe et des boîtes PC **compatibles** avec la capacité (`MoveLearningSystem.canUnlockWithItem`) sont conservés dans la liste affichée. Les espèces incompatibles (ex. Pikachu ou Évoli pour Surf CS) sont automatiquement exclues.
  - Titre de la modale adapté : `Enseigner {Nom} (CT/CS) · ×{Quantité}`.
  - En-tête informatif et pied de page contextualisés : `Cliquez sur un Pokémon compatible pour lui enseigner {Nom}. Quantité restante : {Quantité}`.
  - Message de collection vide spécifique : `Aucun Pokémon trouvé.` si aucun Pokémon du joueur ne peut apprendre la CT/CS.
  - L'apprentissage applique la capacité sur le Pokémon sélectionné, consomme un exemplaire de l'objet et maintient la boîte ouverte tant que la quantité est positive.

---

### Empilement et superposition des fenêtres (`z-index`)

Pour garantir un flux de navigation fluide et sans conflit d'événements pointeur :
- `#poke-modal` (fiche Pokémon) se positionne à `z-index: 31000`.
- Le Sac en mode objet tenu s'ouvre au-dessus à `z-index: 32000`.
- La modale de détail Dictionnaire (`DictionaryDetailModal`) est configurée avec une surcouche `#pw-dictionary-detail-overlay` à `z-index: 35000 !important`, permettant d'inspecter une capacité ou un objet depuis la fiche Pokémon sans la refermer, puis de revenir à la fiche d'un simple clic sur le bouton de retour.

---

---

## 4. Conformité aux règles architecturales (`Rules.md`)

- **Zéro HTML brut** : aucune utilisation de `innerHTML` ou `createElement` hors du sous-système de base `src/ui/`. Tous les éléments sont construits avec les widgets Rework (`UIContainer`, `UIText`, `UIButton`, `UIImage`, `UIIcon`, `UIProgressBar`, `UIDropdown`, etc.).
- **Aucun emoji dans le code** : les symboles utilisent des icônes SVG enregistrées dans `IconRegistry.js` (`sparkle`, `star`, `shield`, `edit`, `close`, `arrow-right`, `grip`, `box`).
- **Styles conformes au design-system** : la jauge `UIProgressBar` prend en charge les couleurs personnalisées via les variables CSS `--pct` et `--bg` sans attribut de style en ligne direct.
- **Localisation rigoureuse** : aucun texte visible en dur dans le code. Toutes les chaînes utilisent `t()` avec équivalence exacte dans les tables française et anglaise.
- **Pérennité des données** : schéma de sauvegarde **20** rigoureusement conservé sans migration inutile ni ajout de champ persistant superflu.

---

## 5. Synthèse des contrôles et validations

| Contrôle | Résultat |
|---|---:|
| Tests automatisés `npm test` | **585 réussites / 0 échec** |
| Scénarios de parité Sac et Fiche Pokémon (`BagAndPokemonInfoParity.mjs`) | **18 / 18 réussis** |
| Scénarios Boîte PC et Widget Debug (`DebugAndBoxItemUse.mjs`) | **12 / 12 réussis** |
| Chromium — Installations / parité (`FacilityParity.mjs`) | **17 / 17 réussis** |
| Chromium — Visuel / interactions (`FacilityVisualParity.mjs`) | **9 / 9 réussis** |
| Chromium — Retours précédents (`FeedbackCorrections.mjs`) | **17 / 17 réussis** |
| Chromium — Relances et pilote de donjon (`RelaunchAutomation.mjs`) | **13 / 13 réussis** |
| Chromium — Marché et entraînement adaptatif (`MarketAndResponsiveTraining.mjs`) | **21 / 21 réussis** |
| Chromium — Interactions équipe et combat (`InteractionCorrections.mjs`) | **18 / 18 réussis** |
| Chromium — Auto contextuel et fond animé (`BackdropAndAutoContext.mjs`) | **14 / 14 réussis** |
| Chromium — Dictionnaire complet (`DictionaryParity.mjs`) | **12 / 12 réussis** |
| **Total des scénarios Chromium exécutés** | **151 / 151 réussis**, tous les rapports `issues: []` |
| Contrôle de syntaxe JavaScript / MJS (`node --check`) | **701 fichiers, 0 erreur** |
| Analyse des feuilles de style CSS | **43 feuilles, 0 erreur** |
| Validation globale des données (`DataValidator.validateAll()`) | `[]` (zéro problème) |
| Tables de données générées comparées à 1.14.25 | **16 fichiers identiques octet pour octet** |
| `git diff --check` | Réussi (zéro espace orphelin) |

L'ensemble des captures d'écran haute résolution et le document autonome de preuves `preuves.html` sont consultables dans `docs/validation/v1.14.26/`.
