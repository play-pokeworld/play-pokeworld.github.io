# Polissage — audit et propositions (v1.16.11)

> Complète `docs/PHASE_v1.16.11.md`. Ce document ne modifie rien : il inventorie ce qui reste à
> unifier et propose un ordre d'exécution. Chiffres relevés sur l'arbre courant (HEAD `88e2324`).

## 1. Ce qui est déjà unifié (livré en 1.16.10 et 1.16.11)

| Élément | État | Preuve |
| --- | --- | --- |
| Feuilles de style | 74 feuilles, `style.css` = manifeste seul | 5 504 règles, 0 différence après découpage |
| Titres de section | 8 classes fusionnées dans `ui-section-title` | `assets/css/components/ui-section-title.css` |
| États vides | 13 classes fusionnées dans `ui-empty-state` | `assets/css/components/ui-empty-state.css` |
| Icônes d'objets | échelle unique via tokens | `assets/css/core/tokens.css` |
| Plancher typographique | 11 px minimum, 10 px réservé aux badges de type/rareté | `design-system/pass-06.css`, vérifié en navigateur |
| Contraste | 147 paires / 7 palettes, 0 sous AA | `node tools/contrast-audit.mjs` |

## 2. P1 3.1 — Boutons : inventaire réel

**Ce qui existe** : un composant `UIButton` avec 6 variantes (`primary`, `secondary`, `danger`,
`success`, `ghost`, `tab`), 3 tailles et 3 alignements — `assets/css/components/ui-button.css`.

**Ce qui reste à côté** :

| Famille | Classes | Poids | Verdict |
| --- | --- | ---: | --- |
| `.hbtn` | 1 classe, historique | 79 usages | la variante la plus utilisée du jeu n'est pas `pw-button` |
| Actions de lieu | `pw-loc-action-btn`, `-npc-`, `-gym-`, `-quest-`, `-dungeon-` | 5 | 5 classes pour un même bouton de carte |
| Quêtes / automatisation | `quest-claim-btn`, `automation-toggle-btn`, `automation-buy-btn` | 3 | doublons de `primary` / `secondary` |
| Fenêtres | `pw-modal-close-btn`, `pw-win-tool-btn`, `pw-team-store-btn`, `save-menu-new-btn`, `settings-btn`, `starter-back-btn` | 6 | variantes locales de `ghost` |
| Mobile | `mob-btn`, `mob-sub-btn` | 2 | taille, pas une variante |
| Outils de dev | 13 `debug-btn-*` | 13 | **hors périmètre** (tiroir de debug), à laisser tel quel |

Total : **24 classes actives** pour 6 variantes existantes, plus `.hbtn` qui pèse 79 usages.

### Problème
Un même bouton change d'apparence selon la fenêtre ; toute correction visuelle doit être répétée
24 fois, et la variante la plus fréquente (`.hbtn`) échappe au composant.

### Options
1. **Migrer toutes les classes vers `UIButton`** (6 variantes), en 3 lots : actions de lieu →
   quêtes/automatisation → `.hbtn`.
2. **Ne rien renommer, composer en CSS** : `:where(.pw-loc-gym-btn, .pw-loc-action-btn, …)`
   hérite des règles de `pw-button`. Aucune modification de JS, aucun risque de régression DOM,
   mais la dette reste (un bouton = deux endroits à maintenir).
3. Statu quo.

### Recommandation
**Option 1 pour les lots 1 et 2** (11 classes, faible risque, rendu vérifiable en capture),
**option 2 pour `.hbtn`** : 79 usages dans l'en-tête, un renommage massif n'apporte rien au
joueur et casse tous les tests de sélecteurs. Puis une passe de contrôle visuelle par lot avec
`tests/browser/Release11611.mjs` (il vérifie déjà le thème, les états vides et le plancher 11 px).

### Conséquences
Aucune migration de sauvegarde. Un lot raté se détecte en une capture. Le tiroir de debug garde
ses 13 classes : c'est un outil interne, il ne doit pas peser sur le design system.

## 3. P1 3.5 — Recherche : 5 fenêtres sur 12

**Fenêtres avec recherche** (5) : Pokédex, Succès, PC (boîte), Sac, Dictionnaire.
Les quatre premières passent déjà par `src/panels/components/FilterBar.js` ; le Dictionnaire a
encore un champ maison.

**Fenêtres sans recherche** (7) : Atoll, Badges, Guide, Marché, Puzzle, Boutique, Équipes.

### Problème
Le joueur cherche un objet au Sac, puis ne peut pas chercher le même nom au Marché ni dans ses
Équipes ; et le Dictionnaire est le dernier champ de recherche non factorisé.

### Options
1. Ajouter `FilterBar` (mode `search` seul) aux **4 fenêtres à liste longue** : Marché, Boutique,
   Badges, Équipes. Atoll, Guide et Puzzle n'ont pas de liste à filtrer → ne rien ajouter.
2. Migrer le Dictionnaire sur `FilterBar` au passage.
3. Traiter les 7 fenêtres sans distinction.

### Recommandation
**1 + 2.** Les trois fenêtres écartées n'ont pas de liste : y ajouter une recherche créerait un
contrôle mort, exactement ce que le polissage doit éviter.

### Doublon de localisation à corriger au passage
Sept clés de placeholder coexistent (`bag_search_placeholder`, `box_filter_search_placeholder`,
`dict_search_placeholder`, `pick_search`, `preset_pick_search_ph`, `save_icon_search_placeholder`,
`search_by_name`). Proposition : garder **une** clé partagée `search_by_name` pour les listes
génériques, et ne conserver une clé spécifique que si le texte diffère réellement (le Sac cherche
« un objet », les Équipes cherchent « une équipe »). Aucune clé n'est supprimée sans vérifier son
usage dans les deux langues.

## 4. Ordre d'exécution proposé

1. `FilterBar` dans Marché, Boutique, Badges, Équipes + Dictionnaire migré (impact joueur immédiat,
   risque faible).
2. Boutons — lot 1 (actions de lieu), capture de contrôle.
3. Boutons — lot 2 (quêtes / automatisation), capture de contrôle.
4. `.hbtn` composé en CSS, sans renommage.
5. Consolidation des clés de recherche.

## 5. Ce que je n'ai pas fait

- Aucune ligne de ce document n'est implémentée : l'inventaire est vérifié, les propositions ne le
  sont pas encore.
- Je n'ai pas mesuré le coût visuel réel des lots 1 et 2 (nombre de captures à comparer) : il se
  saura à l'exécution du lot 1.
