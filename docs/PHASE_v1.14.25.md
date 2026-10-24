# Phase 1.14.25 — Réimplémentation native du Dictionnaire

**Production : 1.14.25 · schéma de sauvegarde 20, inchangé.**
Référence consultée et reproduite : `main` **64d8f7942ae5b92168b8990813dd16d60a60e7e2**.
Le runtime original n'est pas transplanté ; l'architecture propre et modulaire du Rework est préservée.

## 1. Dictionnaire : conformité visuelle et fonctionnelle avec le main

L'écran du Dictionnaire remplace l'ancien état temporaire « Bientôt disponible » du raccourci. Il est accessible depuis la fenêtre des Raccourcis (`ShortcutIds.DICTIONARY` → `ModalIds.DICTIONARY`).

### Structure et onglets

Le panneau principal est un écran plein format (`UIFullscreenPanel`), id `#fs-dictionary`, avec :
- Une barre d'outils fixe en tête (`.dict-toolbar.pw-ui-toolbar`), hors de la zone de défilement :
  - **Trois onglets** (`.dict-tabs` > `button.dict-tab`) : **Objets**, **Attaques**, **Talents**. L'onglet sélectionné porte la classe `.active`.
  - **Un champ de recherche** (`.dict-search.pw-ui-toolbar-search`) avec le texte d'invite *« Rechercher... »*. Le filtrage s'applique en temps réel sur la liste courante sans rechargement.
- Une grille défilante responsive (`.dict-grid-root` > `.dict-grid`) contenant les cartes d'entrée (`.dict-entry`). Si aucun résultat ne correspond à la recherche, le message *« Aucun résultat. »* (`.dict-muted`) s'affiche.

### Présentation des cartes

Chaque carte (`DictionaryCard`) respecte les spécifications exactes du main :
- **Onglet Objets** :
  - Icône : vignette de l'objet (32×32 px, rendu pixel art net, sans cadre circulaire déformant).
  - Titre : nom de l'objet, suffixé de « CT » ou « CS » pour les capsules en français (« TM » / « HM » en anglais).
  - Sous-titre : *« Possédé ×{count} »* si le joueur en a dans son inventaire, sinon *« Non possédé »*.
  - Classe `.owned` (bordure verte subtile) appliquée lorsque l'objet est possédé.
- **Onglet Attaques** :
  - Icône : badge de type officiel (`.type-badge.type-{type}`) affichant le nom du type.
  - Bordure gauche : accentuée avec la couleur du type de l'attaque (`--type-color`).
  - Titre : nom de l'attaque.
  - Sous-titre : *« {count} Pokémon connaissent cette attaque »* (basé sur la collection active du joueur), ou *« Aucun Pokémon ne connaît cette attaque »*.
  - Classe `.owned` appliquée si au moins un Pokémon de la collection connaît l'attaque.
- **Onglet Talents** :
  - Icône : glyphe haltère (`dumbbell`).
  - Titre : nom du talent.
  - Sous-titre : *« Débloqué · {Rareté} »* ou *« Non débloqué · {Rareté} »*.
  - Classe `.owned` appliquée si le talent est débloqué dans le registre permanent ou possédé par un Pokémon.

## 2. Découverte progressive des objets

La règle historique de découverte progressive des générations (Passe 19 du main) est fidèlement implémentée dans `ItemGenerationRules` :
- **Départ en Kanto** : seuls les objets de Génération 1 et les capsules techniques (CT/CS, hors génération) sont visibles (exactement **214 objets**).
- **Accès à Johto débloqué** : les objets de Génération 2 s'ajoutent (**252 objets** au total).
- **Accès à Hoenn débloqué** : les objets de Génération 3 s'ajoutent (**277 objets** au total).
- **Génération 4 et plus** : les objets des générations futures restent strictement masqués.
- **Objets masqués (`hidden: true`)** : les balls spéciales masquées n'apparaissent que si le joueur en possède au moins un exemplaire.
- **Exception Babiri Berry** : la Baie Babiri reste visible dès Kanto conformément à la règle joueur du main.

## 3. Fiches de détail modales superposées

Cliquer sur n'importe quelle entrée du dictionnaire ouvre une fiche d'information modale dédiée (`DictionaryDetailModal`, id `ModalIds.DICTIONARY_DETAIL`).
Cette modale s'ouvre **par-dessus** le dictionnaire (`z-index` supérieur), laissant le dictionnaire ouvert et intact en arrière-plan.

### Contenu des détails selon le type

1. **Objet** :
   - En-tête : icône de l'objet (48×48 px), nom, type d'objet (Pierre, Trésor, Bonbon, Objet Tenu, Fossile, CT/CS, etc.), croix de fermeture `✕`.
   - Cartes de statistiques (`.pw-info-stat-cards`) :
     - *Prix* : montant en Pokédollars ou tiret si invendable.
     - *Possédé* : quantité possédée (`×{qty}` en vert).
   - Section *Description* : texte d'effet de l'objet.
   - Section *Où trouver :* : liste des sources légitimes (`.pw-src-line`) extraite des tables du jeu :
     - Routes et lieux où l'objet peut être obtenu en butin sauvage (`🗺️`).
     - Boutiques le vendant (`🏬`).
     - Atoll de Combat avec son coût en jetons (`🏭`).
     - Grand Souterrain / Mine (`⛏️`).
     - Quêtes principales (`📖`) et secondaires (`📗`).
     - Laboratoire de fossiles pour les fossiles (`🔬`).
     - *« Obtention non renseignée »* si aucune source n'est listée.
   - Bouton d'action : *« ← Retour au Dictionnaire »* fermant la modale.

2. **Attaque** :
   - En-tête : badge de type, nom de l'attaque, catégorie (Physique / Spéciale / Statut), croix de fermeture `✕`.
   - Cartes de statistiques :
     - *Puissance :* valeur numérique ou tiret si statut.
     - *Catégorie :* Physique, Spéciale ou Statut.
   - Section *Description* : description textuelle de l'attaque.
   - Section *Effets* : liste formatée avec badges de statut (Brûlure, Paralysie, etc.) et puces textuelles (recul, soin, priorité, coup critique, etc.).
   - Section *Pokémon pouvant l'apprendre* :
     - *Par niveau* : puces (`.dict-chip`) de chaque espèce compatible `#dex Nom`.
     - *Par CT / CS* : puces des espèces compatibles par apprentissage technique.
     - *Par dressage* : puces des espèces éligibles par le centre d'entraînement.
     - Plafonnées à 24 puces avec mention *« … et {count} autres »* si le nombre dépasse le seuil.
   - Bouton d'action : *« ← Retour au Dictionnaire »*.

3. **Talent** :
   - En-tête : icône, nom du talent, niveau de rareté, croix de fermeture `✕`.
   - Section *Description* : texte explicatif de l'effet en combat ou sur le terrain.
   - Section *Pokémon concernés* : puces de tous les Pokémon possédant ce talent naturellement.
   - Section *Talent caché de…* : puces (avec bordure violette `.dict-chip-hidden`) des Pokémon dont c'est le talent caché (s'il en existe).
   - Ligne *Rareté* : Commun, Peu commun ou Rare.
   - Bouton d'action : *« ← Retour au Dictionnaire »*.

Fermer la fiche via le bouton retour, la croix de fermeture ou la touche Échap referme la modale et replace immédiatement le joueur sur sa navigation dans le dictionnaire.

## 4. Respect des règles d'architecture (`Rules.md`)

- **Aucun HTML brut** : l'ensemble des éléments est instancié à partir des classes de composants (`UIContainer`, `UIText`, `UIButton`, `UIImage`, `UIIcon`, `UITextInput`, `UIFullscreenPanel`, `StaticModalPanel`).
- **Aucun emoji dans le code source** : les puces de sources et d'effets utilisent des composants `UIIcon` du registre d'icônes (`IconRegistry`).
- **Séparation données / vues** : toute la logique de requêtage, de filtrage, de catégorisation et de calcul des apprenants/porteurs est encapsulée dans `DictionaryCatalog` (100% DOM-free).
- **Internationalisation complète** : chaque intitulé, en-tête, infobulle et message d'état est bilingue FR/EN et utilise `t()`.
- **Rétrocompatibilité des sauvegardes** : aucun nouveau champ n'est injecté dans `SaveData`. Le schéma de sauvegarde reste en version **20**.

## 5. Synthèse des vérifications exécutées

| Contrôle | Résultat |
|---|---:|
| Tests automatisés `npm test` | **574 réussites / 0 échec** |
| Nouveaux tests unitaires de cette phase | **23 tests dédiés** (`tests/Dictionary.test.js`) |
| Chromium — Installations / parité | **17 / 17** |
| Chromium — Visuel / interactions | **9 / 9** |
| Chromium — Retours précédents | **17 / 17** |
| Chromium — Relances et pilote de donjon | **13 / 13** |
| Chromium — Marché et entraînement adaptatif | **21 / 21** |
| Chromium — Interactions équipe et combat | **18 / 18** |
| Chromium — Auto contextuel et fond animé | **14 / 14** |
| Chromium — Dictionnaire complet (`DictionaryParity.mjs`) | **12 / 12** |
| **Total scénarios Chromium du jeu livré** | **121 / 121**, tous les rapports `issues: []` |
| Contrôle de syntaxe JavaScript / MJS | **724 fichiers, 0 erreur** |
| Analyse des feuilles de style CSS | **43 feuilles, 0 erreur** |
| Validation globale des données (`DataValidator.validateAll()`) | `[]` (zéro problème) |
| Tables de données générées comparées à 1.14.24 | **16 fichiers identiques octet pour octet** |
| `git diff --check` | Réussi (aucun espace orphelin) |
| Kit pédagogique Auroria (copie isolée 1.14.26-demo / schéma 21) | **12 ciblés + 575 tests + 4 scénarios Chromium** |

Les captures réelles et journaux complets sont archivés dans `docs/validation/v1.14.25/`.
