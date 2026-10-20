# Phase v1.7 — interface, combat et presets d’équipe

Version : **1.7.0** · Sauvegarde : **schéma 5** · Branche : `Rework` · Base : `c3df357`

Validation : **176 tests réussis, 0 échec** (`npm test`). Les tests couvrent les règles statiques,
les localisations FR/EN, les migrations, les systèmes, les widgets, l’accès au résumé de combat et la
construction des panneaux. `node --check` sur `src/` et `tests/`, ainsi que `git diff --check`, passent.

---

## 1. Périmètre et décisions respectées

La phase prolonge le Rework modulaire existant ; elle ne remplace pas son architecture par celle de
`main`. Les règles de `Rules.md` restent appliquées : données et systèmes sans accès au DOM, écrans
composés avec les widgets existants, messages localisés, mutations d’équipe par `TeamSystem` et
mutations de boîte par `BoxSystem`.

Les dialogues et le lore propres à chaque lieu n’étant pas disponibles dans les données du Rework,
aucun lore inédit n’a été inventé. Le panneau Lieu n’affiche pas de description de lieu.

---

## 2. Réglages et tableau de bord

- Le choix de langue est maintenant présenté avec des **boutons FR / EN**, et la langue active est
  signalée par l’état du bouton, dans l’esprit de l’original.
- L’en-tête reprend la hauteur desktop de `main` (56 px), le texte `Badges : n/8` et le bouton Réglages
  de 38 × 38 px. Le compteur `#h-money` reste masqué pour compatibilité ; le header mobile reste compact.
- Les monnaies sont affichées en colonnes icône / montant / nom, **sans cadres ni fond autour de chaque
  entrée**.
- Les récompenses de quête sont des entrées générées à partir de `rewards.currencies`, `items` et
  `pokemon`. Aucun texte de récompense n’est pré-écrit dans l’interface ; les données définissent le
  contenu et le système crédite chaque monnaie déclarée.
- Le panneau Lieu conserve son bandeau illustré et les rencontres, mais retire les tags et la
  description : le nom du lieu est centré dans son bandeau.

---

## 3. Combat

- La scène remet en place la frise d’attaques, la carte adverse, les six emplacements de l’équipe,
  l’état actif / K.O., les statuts, les boosts et les attaques du Pokémon actif. Les barres de charge
  suivent les délais réels via le cycle `onUpdate` de l’interface.
- Le joueur peut sélectionner un autre membre vivant par clic ou clavier ; les mutations restent
  dans `BattleSystem`. La relève adverse automatique et le changement d’adversaire sont conservés.
- Les combats de dresseur affichent la carte du dresseur. Les effets météo / terrain actifs et leurs
  durées finies sont aussi rendus dans la scène.
- Le bouton « Résumé » ouvre maintenant une modale : résultat du dernier combat, gains, journal et
  totaux de session (combats, victoires, XP, argent et points de quête). Les totaux en mémoire sont
  remis à zéro lors du chargement ou de la création d’une sauvegarde.
- **Limite de portée :** captures, objets trouvés, dégâts par Pokémon, durée et butin de donjon ne
  sont pas encore agrégés comme dans le résumé complet de `main` (voir la grille finale).

---

## 4. Presets d’équipe — portage complet

Le gestionnaire comprend les **20 emplacements** de l’original et les intègre au modèle de sauvegarde
et au système du Rework :

- ouvrir le gestionnaire directement depuis la fenêtre Équipe, sans passer par un autre écran ;
- sélectionner, charger et marquer l’emplacement actif ;
- renommer un preset ; enregistrer l’équipe courante ;
- éditer la composition en sélectionnant jusqu’à six Pokémon présents dans l’équipe ou la boîte,
  les ajouter / retirer et les réordonner ;
- enregistrer le brouillon ou l’appliquer ; les membres non retenus de l’équipe courante sont envoyés
  dans la boîte, et les Pokémon sélectionnés depuis la boîte entrent dans l’équipe ;
- empêcher le chargement pendant un combat et tolérer les références introuvables sans supprimer
  les données de Pokémon.

Les presets ne possèdent pas de copies de Pokémon : chaque composition conserve des UID, résolus dans
l’équipe ou la boîte. Les opérations de roster passent par `TeamSystem` et `BoxSystem`.

Le schéma passe à **5**. La migration `MigrationV4ToV5` crée les vingt emplacements et récupère les
anciennes sauvegardes originales (`G.teamPresets.presetN.{name,uids}` et `G.activePresetId`). Le
modèle et le système sont dans `src/data/save/TeamPresetsData.js` et
`src/systems/TeamPresetSystem.js` ; l’interface est `src/panels/TeamPresetsModal.js`.

---

## 5. Sac et fenêtres superposées

- Le style de tri cible le véritable `<select>` natif, pas seulement son conteneur décoratif ; le
  carré de fond derrière le menu de tri est supprimé.
- La fiche de l’objet sélectionné reste après la liste et le scroll du contenu est préservé au
  rerendu. Le second clic d’un double-clic ne relance pas la sélection et n’entraîne plus de saut.
- Le gestionnaire de presets s’ouvre au-dessus de la fenêtre Équipe sans la fermer ; fermer le
  gestionnaire révèle l’équipe dessous. L’ordre d’enregistrement des modals dans `GamePage` est
  conservé.

---

## 6. Sauvegarde, documentation et versions

- Version synchronisée à **1.7.0** dans `package.json` et `src/config/GameConfig.js`.
- `SaveSchema.VERSION` vaut **5** ; la chaîne de migrations va des exports originaux et des schémas
  précédents au schéma courant.
- `docs/DATA_MODEL.md` décrit désormais la forme du schéma 5 et des presets ; ce document complète
  `docs/AUDIT.md` et le README pointe sur la phase.

---

## 7. Vérifications

```bash
npm test              # 176 réussis, 0 échec
node --check          # tous les fichiers JS de src/ et tests/
git diff --check      # aucun espace / conflit de patch
npm start             # serveur local pour vérifier l’application
```

Les tests valident les comportements et la construction des composants. La feuille CSS a été
comparée au code de `main`, mais aucun navigateur / capture responsive automatisé n’est disponible.
Le rendu doit donc encore être validé visuellement par l’utilisateur, sur desktop et mobile.

---

## 8. Limites restantes connues

- Le Sac permet encore de parcourir les objets, mais l’utilisation des CT, pierres, bonbons,
  vitamines et la vente des trésors ne sont pas branchées.
- Un Pokémon cadeau de quête attend toujours une place libre dans l’équipe ; contrairement aux captures,
  il n’est pas encore automatiquement envoyé dans la boîte PC.
- Les dialogues par PNJ et le lore détaillé propre à chaque lieu ne sont pas portés ; le panneau Lieu
  garde ses messages génériques.
- La vérification visuelle responsive manuelle reste à faire ; un test fonctionnel du modal ne valide pas son apparence.
- Le résumé de combat est fonctionnel mais **partiel face à `main`** : pas de captures / objets, dégâts par Pokémon, durée, statistiques de K.O. ni agrégation du butin de donjon.

## 9. Grille de validation — fonctionnement et visuel

| Domaine | Fonctionnement / gameplay | Rendu visuel |
|---|---|---|
| Header, badges, Réglages | ✅ 100 % — compteur dynamique et bouton relié à la modale. | ◐ CSS rapproché de `main` (56 px desktop, badge et bouton restaurés) ; validation à l’écran en attente. |
| Monnaies | ✅ 100 % — valeurs et définitions existantes conservées. | ◐ Cadres/fonds retirés ; vérification desktop/mobile manuelle en attente. |
| Récompenses de quête | ✅ 100 % — monnaies/objets lus et crédités depuis les données ; Pokémon aussi affiché. ◐ Un cadeau Pokémon réclame encore une place libre dans l’équipe (pas d’envoi automatique à la boîte). | ◐ Icônes, quantités et libellés présents ; apparence finale à confirmer visuellement. |
| Lieu | ✅ 100 % — actions conservées, nom centré, tags/description retirés, statistiques rafraîchies après victoire/capture. | ◐ Structure rapprochée de `main` ; validation visuelle en attente. |
| Équipe / presets | ✅ 100 % — 20 emplacements, édition, sélection équipe/boîte, chargement, sauvegarde et migration v5 testés. | ◐ Accès direct ajouté dans la fenêtre Équipe ; validation visuelle en attente. |
| Scène de combat | ✅ 100 % des éléments portés — cartes, switch manuel, statuts/boosts, charge d’attaque, dresseur, météo/terrain et relève adverse. | ◐ Sélecteurs/styles rapprochés de `main` ; comparaison à l’écran encore requise. |
| Résumé de combat | ◐ Partiel face à `main` — résultat, journal, gains et cumuls de session disponibles ; captures, objets, dégâts/K.O., durée et butin de donjon absents. | ◐ Modale fonctionnelle, apparence non validée manuellement. |
| Sac et inventaire | ◐ Sélection/tri/scroll corrigés ; utilisation des CT, pierres, bonbons, vitamines et vente non branchées. | ◐ Styles présents, pas de validation responsive manuelle. |
| Responsive global | — Pas d’échec automatisé connu ; aucun navigateur/capture multi-viewport configuré. | ◐ À vérifier par l’utilisateur sur desktop et mobile. |
