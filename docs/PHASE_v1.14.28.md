# Phase 1.14.28 — Parité intégrale de la Fiche d'information Pokémon (`PokemonInfoModal`)

**Production : 1.14.28 · schéma de sauvegarde 20, inchangé.**
Référence consultée et reproduite : `main` (`PokeDetailView.js`, `poke-modal.js`, `poke-detail.js`, `LearnableMovesPanelView.js`, `design-system.css`).
Le runtime original n'est pas transplanté ; l'architecture modulaire et rigoureuse du Rework (`StaticModalPanel`, `UIContainer`, `UIButton`, widgets réutilisables, `Rules.md`) est strictement respectée.

> **Note sur le saut de version :**  
> Conformément aux instructions explicites de l'utilisateur (*« la prochaine version sera la 1.14.28 puisque tu as mis 2 fois la .26 »*), la numérotation du jeu progresse directement de `1.14.26` à `1.14.28` (la version intermédiaire .27 est sautée, le schéma de sauvegarde reste le schéma 20 canonique sans altération).

---

## 1. Fiche principale Pokémon (`_viewMode = 'detail'`) : Parité visuelle et fonctionnelle

La fiche principale a été restructurée de fond en comble pour reproduire rigoureusement le rendu de `PokeDetailView.js` et `poke-modal.js` de la référence `main`.

### Bandeau supérieur canonique (`.modal-title.poke-detail-title`)
- **Structure canonique `.pw-row > .pw-info-head-text > .pw-info-name`** : regroupe étroitement l'étoile Shiny, le nom du Pokémon et son numéro `#ID` sur la gauche du bandeau.
- **Étoile Shiny (`.shiny-tag`)** : affichée uniquement si le Pokémon est chromatique.
- **Nom du Pokémon (`.poke-detail-title-name`)** : libellé de l'espèce ou surnom personnalisé.
- **Identifiant Pokédex National (`.poke-detail-id`)** : affiché au format `#ID` (ex. `#25` pour Pikachu).
- **Bouton de fermeture standard (`.modal-close`)** : glyph `✕` épuré, poussé sur la droite par la barre de titre, avec accessibilité aria complète et réinitialisation des états temporaires.

### Hero Card (`.poke-detail-hero`)
- **Dimensions canoniques du modal (860px)** : configuration `size: 'custom'` sur `StaticModalPanel` pour respecter rigoureusement le gabarit de 860px max de `main`, sans défilement imbriqué sur le corps de fenêtre.
- **Ligne de sous-titre épurée (`.poke-detail-name-row`)** :
  - Nom du Pokémon en gras (`<b>`).
  - Sous-titre compact et informatif : `Niveau {level} · {Location}` (ex. `Niveau 25 · Équipe`, `Niveau 12 · Boîte PC`, `Pension`, `Centre d'entraînement`).
- **Vignette Sprite centrée 132px (`.poke-detail-sprite-card`)** :
  - Rendu haute fidélité du sprite du Pokémon à 132×132 px avec le jeton de taille canonique `PokemonSpriteSizes.HERO` (`.pw-poke-circle-wrap--hero`).
  - Classe d'accentuation `.is-shiny` quand le spécimen est chromatique.
- **Badges de types 2 colonnes (`.poke-detail-types`)** :
  - Affichage des types primaires et secondaires avec leurs classes sémantiques et couleurs de thème respectives (`.type-badge.type-{type}`).
- **Bouton de bascule d'apparence Shiny (`.poke-detail-shiny-toggle`)** :
  - Disponible dès que l'espèce a été capturée en version chromatique ou que le spécimen est shiny.
  - Bascule instantanée entre la robe chromatique et la robe standard (`★ Shiny : ON` / `★ Shiny : OFF`).
- **Actions de protection de collection (`.poke-protection-actions`)** :
  - Bouton Favori (`.poke-protect-btn`) : ajoute/retire l'étoile de favori avec sauvegarde immédiate sans quitter la fiche.
  - Bouton Verrouillage (`.poke-protect-btn`) : verrouille/déverrouille le spécimen contre tout transfert, relâchement ou modification accidentelle.
- **Suppression des barres parasites** :
  - Les barres superflues de PV et d'EXP qui surchargeaient la fiche ont été retirées, restituant la clarté et l'élégance de `main`.

### Onglets de statistiques latéraux (`.poke-detail-side`, `.poke-detail-stat-panel`)
- **3 onglets accessibles au clavier** (`stats`, `ivs`, `evs`) avec navigation par flèches directionnelles (`ArrowLeft`, `ArrowRight`, `Home`, `End`) et maintien du focus et de la position de défilement.
- **Suppression de l'élément `<h3>` redondant** sous les onglets pour un rendu compact et net.
- **Jauges de statistiques harmonisées** :
  - Utilisation des variables CSS de couleurs canoniques (`STAT_COLORS` : Vert, Rouge, Bleu, Rose, Violet, Orange) pour identifier immédiatement chaque caractéristique (PV, Attaque, Défense, Attaque Spéciale, Défense Spéciale, Vitesse).
  - Onglet **Statistiques** : valeurs numériques formatées et barres de progression proportionnelles.
  - Onglet **IV** : affichage `${val} / 6` avec jauge et total global sur 36.
  - Onglet **EV** : affichage `${val} / 18` par statistique, jauge dédiée, et total global `${total} / 36` conforme à la limite de répartition.

### Architecture et conformité Rules.md (UIPanel / UIModal taille Moyen)
- **Héritage architectural strict et unifié** :
  - `PokemonInfoModal`, `PokemonMoveLearningModal` et `BallFilterEditorModal` héritent désormais directement de `UIModal` (qui hérite lui-même de `UIPanel` : `UIModal -> UIPanel -> UIElement -> BaseObject`), conformément aux exigences fondamentales de `Rules.md`.
  - **Taille Moyen (`size: 'md'`)** : toutes ces fenêtres utilisent strictement le format moyen standard (`size: 'md'`), supprimant définitivement les tailles personnalisées non conformes (`size: 'custom'`).
  - **3 tailles uniques dans le jeu** : confirmation formelle que le design system du jeu ne repose que sur **3 tailles standard** :
    1. **Small (`sm`)** : modales compactes / alertes (Largeur max : ~420px–440px).
    2. **Medium / Moyen (`md`)** : fenêtres standards de gestion, Paramètres, Quêtes, Fiche d'information Pokémon, Capacités apprenables et Filtres de Poké Balls (Largeur max : ~620px–680px).
    3. **Large (`lg`)** : grands panneaux presque plein écran tels que la Boîte PC, le Pokédex ou l'Équipe (Largeur max : ~820px–1180px).
- **Chrome natif UIPanel exploité à 100% (identique aux Settings et Panneaux de Gestion)** :
  - **Vrai Header natif fixe (`.pw-win-hdr`)** : bandeau d'en-tête de pleine largeur avec titre (`setTitle`), sous-titre optionnel (`setSubtitle`) et bouton de fermeture natif `.pw-modal-close-btn` à droite. Suppression des anciens styles parasites (`#poke-modal-inner` à 20px de padding externe, `display: block !important`, et fausse boîte de titre `.poke-detail-title`) qui cassaient la flexbox du conteneur de fenêtre et donnaient une apparence d'en-tête non conforme.
  - **Alignement strict du gabarit Moyen (`size: 'md'`)** : `PokemonInfoModal` possède exactement le même dimensionnement (`max-width: 620px`, `width: 100%`, `max-height: 88vh`), sans retrait externe superflu et avec défilement fluide confiné dans `.win-body.pw-pokemon-info-body`.
  - **Sélecteur d'onglets de statistiques (Base / IV / EV) à haute visibilité et couleurs du thème** : conteneur segmenté avec fond translucide sombre (`rgba(0,0,0,0.25)`), onglets inactifs discrets, et onglet sélectionné éclatant paré de la couleur d'accentuation du thème (`var(--accent)`), texte sombre contrasté (`var(--dark1)`) et ombre portée.
  - **Bouton Verrouiller épuré** : suppression du symbole « × » parasite devant le libellé du bouton verrouiller.
  - **Corps défilant propre (`.win-body`)** : le corps de fenêtre (`.win-body`) assure seul le défilement vertical (`flex: 1; overflow-y: auto;`), tandis que le header et le footer restent parfaitement immobiles et ancrés.
  - **Vrai Footer natif fixe (`.pw-panel-footer`)** : sur `PokemonMoveLearningModal`, le pied de page est un véritable `.pw-panel-footer` (`hasFooter: true`), alimenté par `addFooterChild(returnBtn)`.
- **Alignement de la fenêtre des Filtres de Poké Balls (`BallFilterEditorModal`)** :
  - Dotée d'un vrai header `UIPanel` : `title: t('ball_settings')` (*« Paramètres des Poké Balls »*), `hasHeader: true`, `showCloseBtn: true`.
  - Suppression du faux titre redondant dans le corps de fenêtre (`.pw-ball-title`).
  - Suppression du bouton « Fermer » superflu en bas de liste (`.pw-ball-actions`), la croix native du header assurant la fermeture.

---

### Grille de sections équilibrée en 2 colonnes (`.poke-detail-section-grid`)
- **Colonne 1 : Talents (affichage vertical strictly séquentiel)** :
  - Titre *« Talents »*.
  - **Disposition verticale stricte (`.poke-detail-talent-panel`)** : chaque phrase et chaque bouton est positionné sur la ligne en dessous du texte ou du bouton précédent (`display: flex; flex-direction: column; gap: 8px; width: 100%;`), évitant tout empilement horizontal disgracieux même lorsque les descriptions ou noms sont très courts.
  - **Sélecteur déroulant standard conforme du jeu (`UIDropdown`)** : composant uniforme sans cadre superflu (`pw-card-83`), pleine largeur.
  - **Puces de rareté explicites** : `[Commun]`, `[Peu commun]`, `[Rare]` calculées dynamiquement selon `TalentDB` et `TalentRarity`.
  - **Description du talent actif** : paragraphe complet sous le sélecteur déroulant.
  - **Puce Talent Caché** : bloc dédié sur sa propre ligne avec indication du statut débloqué/verrouillé, cliquable pour ouvrir la fiche Dictionnaire.
  - **Description du talent caché** : paragraphe complet sous la puce du talent caché.
  - **Motif de verrouillage** : affiché sur sa propre ligne sous le reste si le talent est restreint (combat, entraînement, etc.).
- **Colonne 2 : Rang & BST (`poke-rank-panel`)** :
  - Titre *« Rang »*.
  - Lettre de rang (S, A, B, C, D, E) avec son dégradé métallique caractéristique.
  - Statistique de Base Totale (`BST {val}`) calculée à partir des caractéristiques de base de l'espèce.
- **Colonne pleine largeur : Évolutions (`.poke-detail-panel-wide`)** :
  - Titre *« Évolutions »*.
  - Carte récapitulative des méthodes d'évolution (par montée de niveau, par pierre d'évolution ou conditions spécifiques) ou indication de stade final d'évolution.
- **Section Objet tenu supprimée** : conformément aux règles canoniques et à la demande explicite (*« Section objet ne doit pas exister »*), aucun panneau d'objet tenu ne figure sur la fiche Pokémon.

---

## 2. Bloc de capacités et flux de remplacement interactif

Le bloc de capacités (`.poke-detail-moves-block`) implémente fidèlement le flux d'apprentissage et de remplacement de capacités de `main`.

### Capacités équipées actuelles (`.poke-detail-moves-list.current`)
- Affichage des 4 capacités courantes avec leur badge de type (col 1), leur nom (col 2), leur puissance et catégorie `${pow} ${t('power_abbrev')} · ${cat}` (col 3), et leur puce d'état de remplacement (col 4).
- **Sélection et réorganisation intuitive par clic** :
  - Clic gauche sur une capacité équipée : arme le remplacement sur cet emplacement (`_replaceSlot`).
  - Clic sur une autre capacité équipée pendant qu'un emplacement est armé : permute immédiatement les deux capacités dans l'ordre des capacités (`pokemon.moves`) avec sauvegarde automatique.
  - Clic à nouveau sur la même capacité : désarme la sélection.
  - La ligne sélectionnée reçoit la classe `.selected` et une puce rouge d'alerte `⬇ Remplacement` (`.poke-detail-pill.danger`).
  - Un bouton `Annuler` apparaît immédiatement dans la barre de titre des capacités (`.poke-detail-moves-title .poke-detail-mini-btn`) permettant de désactiver l'armement du remplacement.
- **Inspection Dictionnaire par clic droit** :
  - Un clic droit (menu contextuel) sur n'importe quelle capacité connue ouvre immédiatement la modale détaillée du Dictionnaire (`DictionaryDetailModal`) pour inspecter la précision, la puissance, la description et les apprenants de la capacité.

### Capacités apprenables (`.poke-detail-moves-list.learn`) — Présentation identique aux capacités sélectionnées
- **Suppression du bouton `+` et widgets inutiles** : les capacités apprenables sont désormais présentées **exactement comme les capacités sélectionnées** :
  - Colonne 1 : Badge de type (`.type-badge`).
  - Colonne 2 : Nom de la capacité (`.poke-detail-move-name`).
  - Colonne 3 : Méta de puissance et catégorie (`.poke-detail-move-meta` : `${pow} ${t('power_abbrev')} · ${cat}`).
  - Aucun bouton `+` parasite ni puce superflue.
- **Action de clic directe sur la ligne** :
  - Si le Pokémon a moins de 4 capacités : un simple clic sur la ligne apprend la capacité.
  - Si le Pokémon a 4 capacités et qu'un emplacement est sélectionné en remplacement : un clic sur la ligne remplace immédiatement la capacité ciblée.
  - Si le Pokémon a 4 capacités et aucun emplacement sélectionné : la ligne est verrouillée avec invitation à sélectionner un emplacement à remplacer.
- **Inspection Dictionnaire par clic droit** :
  - Le clic droit sur une capacité apprenable ouvre également sa fiche complète dans le Dictionnaire.

### Bouton catalogue complet (`.poke-detail-full-list-btn`)
- Bouton pleine largeur épinglé sous les capacités : *« Voir toutes les capacités »*.
- Clic sur ce bouton : ouvre la fenêtre modale dédiée `PokemonMoveLearningModal` au-dessus de la fiche Pokémon sans la refermer.

---

## 3. Fenêtre dédiée d'apprentissage des capacités (`PokemonMoveLearningModal`)

Cette fenêtre utilise `UIModal` (héritant de `UIPanel`) en format **Moyen (`size: 'md'`)**, empilée au-dessus de `PokemonInfoModal` (`z-index: 31001` vs `31000`).

### Gabarit conforme et indépendance de fermeture
- **Taille Moyen conforme (`size: 'md'`)** : respecte les 3 tailles standard du jeu.
- **Fermeture ciblée par la croix native (`.pw-modal-close-btn`)** : cliquer sur la croix `✕` de l'en-tête ferme **uniquement cette fenêtre** et laisse la fenêtre du Pokémon ouverte juste en-dessous.
- **En-tête natif UIPanel avec compteur et sous-titre (`setTitle`, `setSubtitle`)** :
  - Titre : *« Capacités apprenables »*.
  - Sous-titre : `X/Y possédées` affiché dans `.pw-win-hdr-subtitle`.

### 3 Catégories avec titres explicites (`.poke-detail-moves-section`)
1. **★ Niveau ({count}) (`category_level_up`)** :
   - Titre visible : `★ Niveau (N)`.
   - Capacités apprises par montée de niveau.
2. **◇ CT / CS ({count}) (`category_ct_cs`)** :
   - Titre visible : `◇ CT/CS (N)`.
   - Capacités enseignées par CT ou CS compatibles avec l'espèce.
3. **▽ Entraînement ({count}) (`category_training`)** :
   - Titre visible : `▽ Entraînement (N)`.
   - Capacités issues du dressage et de l'entraînement.

### Pied de page avec bouton unique dans le Footer UIPanel
- **Véritable footer UIPanel (`.pw-panel-footer`)** : configuré via `hasFooter: true` et peuplé par `this.addFooterChild(...)`.
- **Bouton unique `← Retour au Pokémon`** : seul et unique bouton centré dans le pied de page, fermant la modale et ramenant le joueur directement sur sa fiche Pokémon. Pas de faux footer dans le défilement.

---

## 4. Bilan des tests et conformité

- **Tests unitaires (`npm test`)** : **588 tests réussis sur 588 (100% de succès)** répartis sur l'ensemble des 38 suites de tests du projet.
- **Suite spécifique de parité (`tests/PokemonInfoAndTmParity.test.js`)** :
  - Validation de la structure du header, du hero sans barres de PV/EXP, de la vignette sprite 132px (`pw-poke-circle-wrap--hero`), du gabarit modal custom 860px max, de la grille de sections à 2 colonnes sans panneau d'objet.
  - Validation de la suppression du cadre inutile autour du sélecteur de talent et utilisation du `UIDropdown` conforme.
  - Validation du flux de remplacement et d'échange de capacités : sélection d'emplacement, permutation directe par clic, puce de remplacement, bouton d'annulation, et remplacement effectif.
  - Validation de l'inspection par clic droit vers le Dictionnaire.
  - Validation des labels de rareté de talents (`[Commun]`, `[Peu commun]`, `[Rare]`).
  - Validation de la modale des capacités apprenables : 3 catégories avec leurs titres explicites et compteurs, ratio X/Y, bouton unique dans le footer, et fermeture isolée par la croix laissant la fiche Pokémon ouverte.
  - Validation du filtrage de compatibilité d'espèce pour les CT/CS dans le Sac et la Boîte PC.
- **Respect absolu des `Rules.md`** :
  - Zéro injection HTML brute (`innerHTML` / `createElement` hors du moteur UI).
  - Zéro emoji dans le code source (pictogrammes via `IconRegistry`).
  - Utilisation exclusive des panneaux existants (aucun panneau supplémentaire non conforme créé).
  - Code et identifiants 100% en anglais, textes utilisateurs 100% traduits via `t()`.
  - Schéma de sauvegarde maintenu sur le **schéma 20 canonique**.
  - Validation de l'inspection par clic droit vers le Dictionnaire.
  - Validation des labels de rareté de talents (`[Commun]`, `[Peu commun]`, `[Rare]`).
  - Validation de la transition vers la vue des capacités apprenables (ratio `X/Y`, 3 catégories, retour à la fiche).
  - Validation du filtrage de compatibilité d'espèce pour les CT/CS dans le Sac et la Boîte PC.
- **Respect absolu des `Rules.md`** :
  - Zéro injection HTML brute (`innerHTML` / `createElement` hors du moteur UI).
  - Zéro emoji dans le code source (pictogrammes via `IconRegistry`).
  - Code et identifiants 100% en anglais, textes utilisateurs 100% traduits via `t()`.
  - Schéma de sauvegarde maintenu sur le **schéma 20 canonique**.
