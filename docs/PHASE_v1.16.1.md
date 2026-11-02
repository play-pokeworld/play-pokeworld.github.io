# Phase 1.16.1 — Localisation dynamique

> Objectif : qu'**aucun texte ne reste figé** dans la langue active au moment où il a été construit, et que
> l'ensemble des textes du jeu passe par **un seul** système central. La phase 1.16.1 (équilibrage) est
> suspendue ; elle reprend après validation de cette phase (§8).

---

## 1. Ce qui n'allait pas (résultat de l'audit)

Le jeu utilisait déjà `t('clé')`, mais `t()` renvoyait une **chaîne figée** : le texte était résolu une fois,
au moment de la construction de la vue, puis stocké dans le DOM. D'où deux conséquences :

- une fenêtre ouverte **ne pouvait pas** changer de langue — il fallait la fermer/rouvrir ;
- toute composition (`+`, gabarit `` `${t(...)}` ``, `.join(', ')`) figeait la liste **et** sa ponctuation.

Causes racines identifiées par `tools/i18n/audit-i18n.mjs` :

| Cause racine | Effet visible | Volume initial |
|---|---|---|
| Texte résolu une seule fois à la construction | fenêtres figées (quetes, combat, équipe, base secrète, mine, pension, entraînement) | 48 vues sur 121 |
| Aucune vue ne s'abonnait à `LanguageChangedEvent` | aucun rafraîchissement | 121 vues |
| Les widgets (`UIText`, `UIElement`, `UIImage`…) ne conservaient pas la clé | impossible de re-résoudre | 8 classes de `src/ui/` |
| Concaténation `+` / gabarits / `Array.join` autour de `t()` | listes et libellés figés, séparateurs dans la mauvaise langue | 4 + 63 + 13 |
| Branches `if (currentLang === …)` dans des données | TM/CT, noms d'objets, libellés de talent figés | 139 clés variables |
| `t()` écrit **dans les sauvegardes** (`p.nickname = t('atoll_rental') + …`) | libellé « location » gravé dans la save | 1 cas structurel |
| Descriptions d'objets absentes de la table | clé brute ou vide affichée | 190 `item.*.desc` |
| Textes en dur hors de `t()` | non traduisibles | `DebugWidget`, `PokedexDetailModal`, `SecretBaseNpcModal`, 10 clés |
| `FALLBACK_LANGUAGE = 'fr'` | les trous anglais étaient invisibles en jeu | global |
| Tests de parité excluant `item.`, `quests.`, `move_desc.`, `guide_`, `tutorial_` | trous non détectés | global |

---

## 2. Architecture retenue (une seule, centralisée)

Aucun second système n'a été créé : `LocalizationManager` reste **la** source, il est complété.

- **`LocalizedText`** (`src/localization/LocalizedText.js`) — `String` enrichie qui transporte sa clé, ses
  paramètres et ses parties. `String(token)` donne le texte courant, `token.key` la clé. Un texte composé
  (`parts`) reste re-résoluble partie par partie.
- **`LocalizationManager`** expose désormais : `t(key, params)`, `tOr(key, fallback, params)`, `text(key)`,
  `has(key)`, `resolve(value)`, `compose(...parts)`, `join(separator, items)`, et le tag `` lt`…` ``.
  Tous renvoient un `LocalizedText`. `t()` accepte aussi un `LocalizedText` en paramètre : un nom de Pokémon
  passé dans un message suit le changement de langue.
- **`LocalizedTextBinder`** (`src/ui/`, WeakMap + slot) — les widgets enregistrent leurs textes ; à chaque
  `LanguageChangedEvent`, chaque texte est re-résolu **en place**. C'est le seul point de rafraîchissement :
  aucun composant n'a besoin d'un `if (langue)`.
- **Widgets** (`UIText`, `UIElement.setAttribute`, `UIContainer`, `UIPanel`, `UIDropdown`, `UIProgressBar`,
  `UITextInput`, `UIImage.setAlt`) — conservent le token, re-résolvent à l'événement. Écrire directement dans
  le DOM contourne le binder : c'est interdit par les règles.
- **Données** — les vues reçoivent des **ids** ; les textes dérivés sont calculés à l'affichage
  (`ItemDisplayName`, `ItemDescription`), jamais stockés.

Conséquence : une fenêtre ouverte, un modal, une infobulle, une notification ou une ligne de combat se
rafraîchissent sur place, sans reconstruction et sans perte d'état (la mise en page n'est reconstruite que
par les rares vues qui en dépendent, ex. la carte).

---

## 3. Corrections livrées

**Cœur** : `LocalizedText`, `LocalizationManager` (+`compose`/`join`/`tOr`/`has`/`lt`), `LocalizedTextBinder`,
les 8 widgets de `src/ui/`, `AppShell`.
**Codemod** : `tools/i18n/localize-templates.mjs` a converti 82 gabarits sur 19 fichiers en `` lt`…` `` ;
`joinLocalized` remplace les `Array.join` sur des listes traduites (`LocationPanel`, `PokedexPanel`,
`PuzzleSolveModal`, `PuzzleCard`, `SpeciesSourceCatalog`, `AtollSystem`).

**Interfaces** — quêtes/tutoriel (`QuestCard`, `TutorialCard`, `QuestRewardsView`), combat
(`BattleLootStrip`, `BattleZoneEffects`, lignes et infobulles), équipe/Pokémon (`PokemonCardView`,
`PokemonInfoModal`, `PokemonMoveLearningModal`), objets/currencies/infobulles (`BagPanel`,
`ItemTargetModal`, `CurrenciesPanel`, `DictionaryCard`, `DictionaryDetailModal`, `BallDescription`),
base secrète (`SecretBaseNpcModal`, `SecretBaseVisitModal`, `SecretBaseSystem`), mine, pension
(`HatcheryQueueCard`, `HatcherySlotCard`), entraînement, atoll, Pokédex, succès, notifications, dialogues PNJ.

**Textes en dur supprimés** : `DebugWidget` (`ON`/`OFF`/`AUTO`, `phase.toUpperCase()`, notification) →
`debug_state_*` / `debug_phase_*` ; `PokedexDetailModal` (`TOTAL BST`) → `pokedex_stat_total` ;
`SecretBaseNpcModal` (`… dispo`, `trainer-42...`) → `base_npced_sprite_available` / `base_npced_name_example`.

**Données** : `PokemonData.getDisplayName()` ne préfixe plus « Location » — un drapeau **runtime**
`p.rental` (jamais sérialisé) porte l'information, le libellé est composé à l'affichage (`compose`).
`AtollSystem` n'écrit plus de texte traduit dans `nickname`. `AtollBattleContext.reorgNotice` est composé.
`BallDescription` et le dictionnaire utilisent `ItemDescription` (repli piloté par les données) au lieu d'un
`has()` bloquant.

**Contenu** : `src/localization/{fr,en}/item-effects.js` (33 clés), `shop.weather_lab.name`, 10 clés d'UI,
`item_unknown_name` ; 10 entrées PNJ anglaises encore en français corrigées dans `en/npc.js` ;
`audit-keys.mjs` dé-bruité (espèces/formes, `.title/.badge` des dresseurs) : 283 → 200 clés manquantes.

**Garde-fous** (nouveaux) : `tests/LocalizationRules.test.js` (9 règles statiques + API) et
`tests/LocalizationRuntime.test.js` (10 scénarios de bascule sur de vraies vues).

---

## 4. Couverture des données (mesurée, pas estimée)

| Contenu | Clés FR = EN | État |
|---|---|---|
| Table complète | **9 249 clés** par langue, parité 100 % | ✅ |
| Objets — noms | 529 (518 objets + variantes) | ✅ |
| Objets — descriptions rédigées | 329 / 518 | 🟡 189 dérivées à l'affichage |
| Pokémon | 392 (386 espèces + formes) | ✅ |
| Capacités / descriptions | 419 / 726 | ✅ |
| Talents | 404 | ✅ |
| Lieux | 178 | ✅ |
| Quêtes | 764 | ✅ |
| Succès | 40 | ✅ |

Les 189 descriptions manquantes ne s'affichent **jamais** comme clé brute : `ItemDescription` les compose à
partir des effets/catégorie réels de l'objet (`mega_stone` 55, `flavor` 15, `pinch_heal` 7, `training` 7,
`immunity_berry` 6, `entry_debuff` 6, `pinch_stat` 5, catégories `apricorn`, `legend_key`, `underground_shard`…).

---

## 5. Vérifications réellement effectuées

- `npm test` → **722 tests, 0 échec** (~9 s), dont `Localization` (parité, collisions, clés littérales),
  `LocalizationRules` (9), `LocalizationRuntime` (10).
- `node tools/i18n/_run.mjs` → 10/10 : bascule FR→EN→FR avec tableau de bord complet ouvert, modal déjà
  ouvert, fiche Pokémon + boîte PC + apprentissage de capacité, combat en cours, quêtes/tutoriel, centres
  (pension, mine, entraînement), notifications, dialogues PNJ. Assertions bidirectionnelles (aucune valeur
  française ne subsiste en anglais, et inversement) + absence de clé brute + nombre d'enfants inchangé
  (mise en page).
- `node tools/i18n/audit-keys.mjs` → 200 clés manquantes = uniquement des `item.*.desc` non rédigées
  (couvertes par le repli).
- `node tools/i18n/audit-i18n.mjs` → `+` : 0 ; méthode de chaîne sur un `t()` : 0 ; gabarit non tagué : 0 ;
  comparaison d'identité : 0 ; texte en dur dans une option de widget : 0.

### 5.1 Vérification en navigateur réel (Chromium, Playwright)

Nouveau test `tests/browser/LanguageSwitch.mjs` (`npm run test:browser:language`), **8/8** :

| Scénario | Résultat |
|---|---|
| Partie créée en français | ✅ |
| Réglages → bouton « English » : la fenêtre **ouverte** se traduit sur place, le tableau de bord derrière aussi (même nombre de lignes) | ✅ |
| Combat **en cours** : bascule FR→EN pendant le combat, `Live Battle` devient `Combat en direct` | ✅ |
| Sac plein écran ouvert + bascule depuis les Réglages par-dessus : le sac suit, aucun reste de français | ✅ |
| Pokédex ouvert avant la bascule : suit, aucune clé brute | ✅ |
| Notification affichée avant la bascule : suit | ✅ |
| La langue choisie survit au rechargement | ✅ |
| Console et réseau propres, aucune clé brute à l'écran | ✅ |

La bascule se fait en cliquant le **vrai bouton de langue** des Réglages, pas en appelant l'API.

### 5.2 Suites navigateur existantes

Relancées avant livraison : `dictionary`, `baginfo`, `market`, `debugbox` **passent**.
`feedback`, `automation`, `interaction`, `visual`, `backdrop` échouent — **ces échecs sont identiques sur le
commit d'origine** (vérifié en remettant `src/` à l'état de `HEAD`), ils sont antérieurs à cette phase et
relèvent de l'équilibrage/l'animation, pas de la localisation. Deux tests devenus faux ont été corrigés au
passage : le total d'objets du dictionnaire était codé en dur (214 → calculé depuis `ItemGenerationRules`) et
le plafond d'EV affiché (18 → 6 par stat, 36 au total, valeurs actuelles de `PokemonRules`).

Un vrai bug applicatif a été trouvé par ce test et corrigé : `src/main.js` appelait
`BattleSystem.stopBattle()` qui n'existe pas (TypeError à chaque onglet masqué pendant un combat). Un combat
est au tour par tour : il ne peut pas avancer onglet masqué, l'appel a donc été retiré et le rattrapage du
temps écoulé reste assuré par `FastForwardSystem`.

---

## 6. Ce qui reste à faire

1. **189 descriptions d'objets** à rédiger (le repli s'affiche correctement mais reste générique) —
   vérifier en priorité le rendu des 55 Méga-Gemmes.
2. **Textes de contenu** : quelques tournures anglaises restent à relire (9 entrées PNJ gardent des noms
   français, volontairement).
3. **Audit statique** : 66 préfixes de clés dynamiques non reconnus par l'outil (faux positifs liés aux
   `item_effect_*`/`status_*`), à affiner.
4. Les vues sans abonnement propre (121) reposent sur le binder : à surveiller si une vue future construit
   sa **structure** à partir d'un texte.

---

## 7. Problèmes techniques restants (honnêtes)

- `LocalizedText` est un `String` : `JSON.stringify` le transformerait silencieusement en texte figé. La règle
  « jamais de texte traduit dans une sauvegarde » est documentée et respectée, mais seule une revue humaine
  la garantit — aucun test ne sérialise une sauvegarde complète pour la contrôler.
- Le binder couvre les widgets de `src/ui/` ; un composant qui écrirait directement dans le DOM passerait
  à travers. Les tests statiques détectent les cas connus, pas tous les cas futurs.
- Les séparateurs de liste sont **ceux de la langue** (`», «` en FR, `,` en EN) via `joinLocalized` ; toute
  nouvelle liste doit utiliser cette API.

---

## 8. Verdict

- **Traduction** : le jeu est intégralement traduit en FR et EN (9 249 clés, parité stricte vérifiée).
  Les descriptions d'objets sont complètes à 64 % en texte rédigé, le reste étant **affiché correctement**
  via une description dérivée des données.
- **Système** : la localisation peut être considérée **stable**, en DOM simulé **et** en Chromium réel. Une fenêtre ouverte suit la bascule, sans
  fermeture, sans texte figé, sans clé brute, sans perte de mise en page — c'est couvert par des tests
  automatisés à chaque `npm test`, et les règles anti-régression sont bloquantes.
- **Équilibrage** : la phase 1.16.1 peut **reprendre**. Recommandation : traiter d'abord les points 1 et 2
  du §6 en tâche de fond (rédaction de descriptions), car ils sont indépendants des réglages d'équilibrage.
