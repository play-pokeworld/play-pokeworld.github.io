# Audit — lisibilité, unification des affichages et ergonomie (v1.16.9)

> Demande : « En analysant le projet, vois-tu des points à améliorer/corriger, des moyens d'avoir une
> meilleure ergonomie ou un meilleur affichage, ou encore de mieux unifier les affichages et rendre le
> jeu plus lisible ? »
>
> Ce document est un **état des lieux mesuré**, pas un chantier déjà lancé. Les points marqués
> « corrigé en 1.16.9 » sont faits ; tout le reste attend votre validation, parce que chaque lot
> touche plusieurs fenêtres à la fois.

---

## 0. Méthode et limites

Toutes les mesures ci-dessous ont été prises **sur cette version du dépôt**, en comptant dans les
fichiers réels (CSS, JS, tables de traduction) et en mesurant les tailles rendues dans Chromium quand
c'est indiqué. Deux réserves d'honnêteté :

- les compteurs de clés de traduction « non utilisées » sont des **bornes hautes** : une clé peut être
  demandée à l'exécution (`t(\`item.${id}.name\`)`) sans apparaître littéralement dans le code ;
- les compteurs CSS comptent des **déclarations** : une même règle répétée peut être légitime (états,
  media queries). Ce sont des signaux, pas des verdicts.

---

## 1. Corrigé dans cette livraison (1.16.9)

| Constat | Correctif |
|---|---|
| Le résumé de combat et le rapport AFK avaient **deux copies** de la même liste de Pokémon capturés (33 lignes identiques, seul le texte d'état vide différait) — exactement la faute qui avait produit les icônes géantes de la 1.16.8 | Un composant unique `CapturedPokemonList` sert les deux fenêtres ; un test vérifie que le HTML produit est **identique au caractère près** |

C'est la seule dette que j'ai traitée d'office : elle appartient à la même famille de défaut que le
correctif demandé, avec un risque nul et une couverture de test immédiate.

---

## 2. P0 — défauts à corriger (visibles ou bloquants pour la suite)

> **Statut au 1.16.10 : les quatre points de cette section sont traités.** Voir
> `PHASE_v1.16.10.md` §3 pour ce qui a été corrigé, mesuré, et pour les deux constats qui se sont
> révélés être des faux positifs (§2.2 : 200 ce n'est pas 200 ; §2.3 : les neuf clés existaient déjà
> en français).

### 2.1 Aucune fenêtre modale ne se ferme avec Échap, et le clavier n'est pas géré

**Mesuré** : 26 fenêtres modales (`extends UIModal` / `StaticModalPanel`). `Escape` n'est écouté que
par deux composants internes (`UIContextMenu`, `UISortableList`). Il n'y a **ni piège de focus, ni
retour du focus** après fermeture, ni `aria-hidden` du fond : au clavier, `Tab` continue de parcourir le
tableau de bord **derrière** la fenêtre ouverte.

**Impact** : quiconque joue au clavier (ou avec un lecteur d'écran) peut « se perdre » derrière une
modale ; sur mobile, Échap est le geste naturel de retour.

**Correctif proposé** : gérer `Escape` et le focus dans `UIModal` **une seule fois** (fermeture,
`focus()` sur le premier contrôle, restauration du focus au déclencheur, `aria-hidden` du reste).
Effort : ~1 h + une passe de non-régression sur les 26 fenêtres. Risque : moyen (comportement global).

### 2.2 L'audit de traduction est en permanence rouge

**Mesuré** : `node tools/i18n/audit-keys.mjs` → **200 clés manquantes**, toutes de la forme
`item.*.desc`. Or ces descriptions ne sont **jamais demandées** : `ItemDescription` les dérive à
l'affichage quand elles ne sont pas rédigées (décision de la v1.16.4).

**Impact** : un audit qui crie 200 fois au loup ne détecte plus la vraie clé manquante du jour.

**Correctif proposé** : aligner l'outil sur la règle réelle (« une clé `.desc` n'est obligatoire que si
`ItemDescription` ne sait pas la dériver »), et faire échouer la suite si une **autre** clé manque.
Effort : court. Risque : nul (outil uniquement).

### 2.3 Neuf clés existent en anglais et pas en français

`stat_up`, `stat_down`, `stat_blocked`, `accuracy_down`, `paralyzed`, `immune`, `item_boost`,
`item_debuff`, `move_failed`. Deux sont réellement demandées par du code (`t(\`stat_${…}\`)`), les
autres semblent mortes. **Impact** : risque d'afficher la clé brute en français le jour où le chemin
de code est atteint. **Correctif** : ajouter (ou supprimer) ces 9 clés en FR — décision triviale à
prendre ensemble.

### 2.4 L'audit de contraste n'est pas rejouable

Plusieurs blocs CSS affirment « WCAG ≥ 4,5 (généré — `tools/contrast-audit.mjs`) », mais **ce fichier
n'existe pas dans le dépôt**. Impossible de vérifier qu'un changement de couleur ne casse pas la
lisibilité. **Correctif proposé** : reconstruire le générateur (lecture des couleurs de types/badges et
comparaison AA) et l'ajouter à la suite.

---

## 3. P1 — unification et lisibilité (le plus gros gain visuel)

> **État au 1.16.11** — 3.1 (titres, états vides) ✅ · 3.2 ✅ (arborescence éclatée + budget
> `!important` verrouillé par test) · 3.3 ✅ (échelle 40/52/72 px) · 3.4 ✅ (plancher 11 px, 10 px
> réservé aux pastilles) · 3.1 (boutons, 22 variantes) ⏳ reste ouvert · 3.5 (recherche texte dans
> les fenêtres) ⏳ reste ouvert. Détail et preuves : `docs/PHASE_v1.16.11.md`.


### 3.1 Trois vocabulaires pour la même chose

| Élément | Valeur mesurée | Proposition |
|---|---|---|
| Titres de section | **9 classes** (`pw-section-title`, `battle-summary-section-title`, `pw-loc-section-title`, `pw-cur-section-title`, `pw-box-section-title`, `pw-atoll-section-title`, `pw-progress-section-title`, `pw-story-quest-section-title`, `pw-repeatable-board-section-title`) | **une** classe + 2 tailles (`is-lg`, `is-sm`) |
| États vides | **16 classes** (`pw-empty-state-md`, `pw-empty-state-lg`, `-center`, `battle-summary-empty`, `poke-detail-empty`, `pw-ach-empty-tracker`…) | **une** classe + 2 tailles |
| Boutons | `hbtn` + 22 combinaisons locales (`pw-btn-primary`, `queue-action-btn`, `pw-facility-manage`, `poke-detail-mini-btn`…) | un jeu fermé de 5 variantes : primaire / secondaire / danger / fantôme / icône |

**Impact** : c'est ce qui donne l'impression que « chaque fenêtre a son style ». Le regroupement ne
change aucun comportement, seulement le rendu et la maintenance. Effort : ~1 journée, fenêtre par
fenêtre, avec captures avant/après.

### 3.2 La feuille de style est devenue une sédimentation

**Mesuré** : 43 fichiers CSS, **25 162 lignes** ; `design-system.css` à lui seul fait **15 654 lignes**
et **3 876 règles**, avec **2 690 `!important`**, **448 sélecteurs définis plusieurs fois** et
**38 blocs d'override** en fin de fichier (« WAVE 20 », « DS2820 »…).

**Pourquoi c'est important** : chaque correctif visuel doit aujourd'hui gagner une guerre de
spécificité (je m'y suis cassé les dents deux fois : l'image d'item à 62 % écrasée par un
`width:100% !important`, et `.pw-grid-media` qui ne se pliait pas comme prévu). C'est ce qui rend les
corrections lentes et risquées.

**Proposition (progressive, pas un « big bang »)** : à chaque prochaine fenêtre retouchée, **remonter**
ses règles au bon endroit et **supprimer** l'override correspondant en fin de fichier ; un test simple
peut compter les `!important` et échouer si le total augmente. Effort : étalé, sans risque de régression
de masse.

### 3.3 Cinq tailles pour les icônes d'objets

**Mesuré en 1.16.8** (Chromium) : sac 40 px, marché 42, dictionnaire 42, fiche d'objet 48, ciblage
d'objet 52, fenêtre lieu et résumés **72**. Cinq valeurs pour le même contenu.

**Proposition** : une échelle de trois tailles (`sm` 40, `md` 52, `lg` 72) exposée par `UIItemSprite`
(`size: 'sm'|'md'|'lg'`), et affectation par fenêtre. Ça ne change pas la densité choisie, ça supprime
les valeurs intermédiaires arbitraires.

### 3.4 Typographie : 89 déclarations à 10 px ou moins

**Mesuré** : 1 022 tailles de police en `px` (seulement 6 en `rem`), dont **89 ≤ 10 px** (le plus petit
descend à **9 px**). Sur un écran de téléphone, 9 px est illisible.

**Proposition** : plancher à **11 px** pour tout texte porteur d'information, 10 px réservé aux pastilles
(niveaux, compteurs). Passe unique sur les 89 déclarations, vérification par captures en 390 px.

### 3.5 Recherche texte : 5 fenêtres sur 12

**Mesuré** : recherche présente dans le sac, la boîte PC, le Pokédex, le dictionnaire et les succès ;
absente du marché, du magasin, des badges, du guide, des puzzles, des presets d'équipe et de l'atoll (le
marché compense par des catégories). **Proposition** : le même champ de recherche (composant partagé)
là où une liste dépasse ~30 entrées — marché en premier.

---

## 4. P2 — ergonomie et finitions

| Point | Constat mesuré | Proposition |
|---|---|---|
| Images sans texte alternatif | **19** widgets média (`UIPokemonSprite` / `UIImage` / `UIItemSprite`) n'ont pas d'`alt` | passer le nom de l'entité ; test unitaire qui refuse un nouveau média sans `alt` |
| Traduction à chaud | **124 fichiers** appellent `t()` sans écouter `LanguageChangedEvent` (ils reposent sur le « binder ») ; le test navigateur de changement de langue passe, mais tout texte construit en **chaîne** ne sera pas retraduit | documenter la règle dans `Rules.md` + un test qui échoue si un nouveau panneau ne la respecte pas |
| Clés de traduction mortes | **~2 400 candidates** côté FR (borne haute) | traçage à l'exécution : instrumenter `t()` en mode dev sur une session type, puis supprimer ce qui n'est jamais demandé |
| Notifications | files séparées par canal ; pas de plafond visible dans l'interface | décider d'un maximum affiché et d'un empilement stable |
| Cellules de grille | `PokemonGrid` (88 px mini) et `pw-grid-media` (72 px) cohabitent ; la boîte PC, le Pokédex et la fenêtre lieu n'ont pas la même densité | une seule grille paramétrée par densité |

---

## 5. Ce que je **déconseille** de faire

- **Renommer massivement les clés de traduction** : 4 823 clés, des centaines construites dynamiquement
  (`item.*`, `pokemon.*`, `move.*`, `quests.*`) ; le gain est nul et le risque de casse élevé.
- **Supprimer les 2 690 `!important` d'un coup** : chaque suppression est un pari visuel sur une fenêtre
  qu'on ne regarde pas ; la méthode par fenêtre est plus lente mais sûre.
- **Changer la densité générale** (tailles de grille, d'icônes) sans captures avant/après : c'est le
  reproche le plus fréquent de la phase précédente.

---

## 6. Ordre proposé (à valider)

| Lot | Contenu | Effort | Gain |
|---|---|---|---|
| **A** | 2.2 + 2.3 + 2.4 (outils d'audit et 9 clés) | ~2 h | audits de nouveau fiables |
| **B** | 3.1 (titres + états vides + boutons) | ~1 j | cohérence visuelle immédiate |
| **C** | 2.1 (Échap + focus des modales) | ~1 j avec non-régression | accessibilité clavier |
| **D** | 3.3 + 3.4 (échelle d'icônes, plancher typo) | ~1 j | lisibilité, surtout mobile |
| **E** | 3.2 (nettoyage CSS par fenêtre, au fil de l'eau) | étalé | fin de la guerre de spécificité |

Dis-moi quel(s) lot(s) tu veux que j'attaque — je commence par ceux que tu valides, un par livraison,
avec captures avant/après et tests dédiés.
