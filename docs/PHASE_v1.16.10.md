# Phase 1.16.10 — Fatigue qui fonctionne, fenêtres au clavier, audits rejouables, Pokémon de la carte

> Demandes :
> 1. « Pour le Pokémon sur la carte, enlève le rond noir derrière le Pokémon et mets-le de la même
>    taille que le cadre. »
> 2. « Bug trouvé : système de fatigue en combat qui ne fonctionne pas en combat. »
> 3. « Je te laisse régler aussi tous les P0 dans cette passe. » (P0 de `docs/AUDIT_v1.16.9.md`)
> 4. Question : « quel est le vrai problème avec `design-system.css` et qu'est-ce qu'il contient ? » —
>    réponse mesurée dans **`docs/ANALYSE_design-system.md`**.

---

## 1. Le Pokémon de la carte : plus de rond noir, à la taille du cadre

**Cause.** La carte réutilise `UIPokemonSprite`, donc le disque canonique du design system
(`.pw-poke-circle-bg`, un rond de 80 % de la boîte) **et** un cadre carré de 74 px. On voyait donc un
petit rond sombre dans un cadre plus grand, avec le sprite à l'intérieur du rond.

**Correctif.** Le Pokémon de la carte porte une classe propre (`save-card-avatar`) et un bloc CSS
dédié : le disque est **masqué** et l'image est dimensionnée **au cadre** (72 px dans un cadre de
74 px avec bordure de 1 px), avec une ombre portée douce pour la profondeur. Aucune autre fenêtre ne
change : le disque canonique reste partout ailleurs (sac, boîte PC, équipe, combats, résumés).

C'est aussi la géométrie du `main` : `.save-slot-icon` y fait 74 px pour une image plafonnée à 70 px,
sans disque.

**Mesuré dans Chromium** : cadre `74 × 74`, art `72 × 72`, `display` du disque `none` — sur l'aperçu
des réglages **et** sur la carte du menu des sauvegardes.

> Remarque honnête : les fichiers de sprite portent beaucoup de marge transparente (le Pokémon occupe
> en moyenne 58 % de son canevas 96 × 96, de 28 % pour les plus petits à 100 % pour les plus grands).
> « Remplir le cadre » veut donc dire « la boîte de l'image = le cadre », comme dans le `main`. Un
> recadrage visuel par Pokémon demanderait de mesurer 392 images et de les traiter différemment :
> ce n'est pas fait, et ce serait une décision à valider.

## 2. La fatigue de combat : pourquoi elle ne se déclenchait jamais

**Ce qui se passait.** Le bloc de fatigue lisait `session.playerKOs` :

```js
// avant 1.16.10 — BattleSystem._settleWildEncounter()
run.playerKOs = session.playerKOs;
if (run.playerKOs >= 50) { /* usure */ }
```

Or `BattleSession.playerKOs` compte les **KO du joueur** (ses propres Pokémon mis au tapis) : il vaut
0 dans un combat propre, et il est **remis à zéro à chaque construction de session**. Dans une chaîne
de combats sauvages il ne peut donc jamais approcher 50 : la condition était inatteignable, et les
deux textes `battle_log.fatigue_warning` / `fatigue_wear` n'ont jamais pu s'afficher.

Deuxième défaut mesuré au passage : la victime active était touchée **deux fois** (`member.hp -=` puis
`session.active.takeDamage(...)`), et l'`hp` du combattant lisant déjà celui du Pokémon, l'usure de la
ligne active était doublée.

**La règle appliquée (celle que la documentation promettait).** « 50 combats consécutifs sans repos »
(`PLAN_EQUILIBRAGE_GLOBAL.md` §7, `PHASE_v1.15.2.md`, `PHASE_v1.15.6.md`). Un combat sauvage est **une
chaîne ininterrompue** : l'équipe n'est soignée qu'à la fin de la chaîne (`_end()` → `healFull()`).
Le compteur est donc le nombre de **victoires de la chaîne en cours** (`run.wins`), pas les KO subis :

| Victoires dans la chaîne | Usure appliquée |
|---|---|
| 0 → 49 | aucune |
| 50 | avertissement + 1 pas (1 % des PV max) |
| 51 → 54 | 1 pas |
| 55 → 59 | 2 pas |
| … | +1 pas tous les 5 combats |
| ≥ 95 | 10 pas maximum (10 % des PV max) |

L'usure touche **toute l'équipe non K.-O.** après chaque victoire au-delà du seuil, et le talent
`stamina` (visible ou caché) la **divise par deux**. « Se reposer » = terminer la chaîne (victoire
sans adversaire suivant, défaite, fuite) : l'équipe est soignée et le compteur repart de zéro, sans
rien ajouter à la sauvegarde (aucun changement de schéma).

**Fichiers** : nouveau `src/config/FatigueRules.js` (règles pures et testables), `BattleSystem._applyFatigue()`
(une seule responsabilité, plus de double coup), textes `battle_log.fatigue_warning` enrichis du nombre
de victoires (`{count}`) en FR et EN.

**Vérifié** :
- Node : `FatigueRules` (seuils, pas, plafond, moitié `stamina`), `run.wins` comme compteur, absence de
  double coup, chaîne réelle à 60 victoires (usure exacte + journal), chaîne ordinaire sans usure.
- Chromium : bataille réelle, chaîne à 49 victoires puis **une victoire de plus** → avertissement au
  50ᵉ combat (avec `count = 50`), usure journalisée, PV de l'équipe réellement entamés.

**Deux tests de la suite ont été réécrits, et il faut le dire** : `Release1152` et `Release1156`
verrouillaient l'ancien contrat (`session.playerKOs = 50`). Ils décrivaient donc le bug. Leur intention
(usure au-delà du seuil, `stamina` qui divise par deux) est conservée, mais ils pilotent désormais
`_activeRun.wins`.

## 3. P0 de l'audit

### 3.1 Fenêtres modales : Échap, piège de focus, retour du focus, fond inerte

Un seul module porte le contrat — `src/ui/ModalFocusScope.js` — et les **deux familles** de fenêtres y
délèguent : `UIModal` (29 sous-classes, dont `StaticModalPanel`, `ConfirmDialog`, `PromptDialog`) et
`UIFullscreenPanel` (sac, boîte PC, marché, Pokédex, badges, guides…). Ce qui est garanti :

1. **Échap ferme la fenêtre du dessus, et seulement elle.** La fermeture est différée d'un tour de
   boucle : un composant imbriqué qui consomme Échap (menu contextuel, glisser-déposer de liste,
   déplacement de fenêtre) appelle `preventDefault()` et la fenêtre reste ouverte. La fenêtre du
   starter garde son propre Échap (`closeOnEscape: false`) : il ramène au menu des sauvegardes.
2. **Tab / Maj+Tab bouclent** dans la fenêtre au lieu de parcourir le tableau de bord derrière.
3. **À l'ouverture**, le focus va au premier contrôle de la fenêtre (la fenêtre elle-même, avec
   `tabindex="-1"`, si elle n'en a aucun).
4. **À la fermeture**, le focus revient au contrôle qui l'avait avant.
5. **Le fond est inerte** tant qu'une fenêtre est ouverte : tous les frères de la chaîne d'ancêtres
   reçoivent `inert` + `aria-hidden="true"`, restaurés exactement dans leur état précédent.

Correctif de bord nécessaire : `WindowDragController` et `UISortableList` écoutent Échap en
permanence sur `window`. Ils ne le consomment désormais **que pendant un glisser** (sinon le moindre
Échap était avalé et aucune fenêtre ne se fermait).

### 3.2 Audit de traduction : 200 faux positifs, et 36 vrais trous

`tools/i18n/audit-keys.mjs` exigeait `item.<id>.desc` pour les 518 objets alors que
`ItemDescription` dérive le texte des données depuis la 1.16.4. L'outil applique maintenant la vraie
règle : un `.desc` **rédigé** doit exister dans **toutes** les langues, et **tout** objet doit produire
un texte via `ItemDescription.of()`.

Effet immédiat : le bruit tombe à zéro et **36 objets n'avaient aucune description** (les 17 plaques
d'Arceus, les engrais, les pelles, les flûtes, le permis de vente de baies, les outils de terrain).
Quatre familles de repli ont été ajoutées (`item_category_plate`, `item_category_farm`,
`item_category_flute`, `item_category_tool`), en FR et EN, avec un texte factuel qui ne promet aucune
mécanique non implémentée. Audit : **0 clé manquante**, sortie non nulle en cas de trou réel.

### 3.3 Les « neuf clés anglaises seulement » étaient un faux positif

Vérifié à l'exécution : `battle_log.{stat_up, stat_down, stat_blocked, accuracy_down, paralyzed,
immune, item_boost, item_debuff, move_failed}` existent **en FR et en EN**. Aucune clé n'a été
ajoutée ni supprimée ; un test verrouille désormais leur présence dans toutes les langues pour que la
question ne revienne pas.

### 3.4 Audit de contraste reconstruit (`tools/contrast-audit.mjs`)

Le fichier cité par les commentaires CSS n'existait pas. Il est reconstruit et **ne code aucune couleur
en dur** : il relit la feuille de style, reconstruit les palettes (`:root` + chaque thème), relit les
règles `.type-badge.type-<x>` pour retrouver l'encre et le fond réels (y compris le
`color-mix(in srgb, … P%, #000 Q%)`), puis calcule le ratio WCAG 2.1.

```
node tools/contrast-audit.mjs           # rapport
node tools/contrast-audit.mjs --check   # échoue sous AA 4,5 (npm run audit:contrast)
```

Résultat mesuré : **147 paires auditées sur 7 palettes, 0 sous AA**, pire cas 4,77 (badge Spectre). Les
valeurs reproduisent celles documentées dans le CSS (Plante 7,02 ; Feu 8,31 ; Électrik 11,55), ce qui
prouve que le générateur est fidèle. Un test vérifie aussi que l'outil **échoue** sur une paire jaune
sur blanc : ce n'est pas un tampon.

### 3.5 Trouvaille au passage (P2, corrigée)

En mesurant `design-system.css`, 5 règles utilisaient des jetons qui **n'existent nulle part** :
`--pw-shadow-lg` (les fenêtres modales n'avaient donc **aucune ombre**, dans trois fichiers CSS),
`--bg-card` et `--border` (les cartes de succès et la bannière de résumé n'avaient ni fond ni bordure).
`--pw-shadow-lg` est déclaré, les autres sont remplacés par les jetons canoniques
(`--pw-bg-surface`, `--pw-border-color`).

## 4. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/ui/SaveCard.js`, `assets/css/design-system.css` | Pokémon de la carte : classe `save-card-avatar`, disque masqué, art au cadre (bloc `DS-v1.16.10`) |
| `src/config/FatigueRules.js` | **nouveau** — règles de fatigue pures (seuil, pas, plafond, `stamina`) |
| `src/systems/BattleSystem.js` | `_applyFatigue()` : compteur = victoires de la chaîne, plus de double coup, avertissement unique |
| `src/localization/{fr,en}/battle-log.js` | `fatigue_warning` porte `{count}` |
| `src/localization/{fr,en}/item-effects.js` | 4 familles de description dérivée (plaque, culture, flûte, outil) |
| `src/ui/ModalFocusScope.js` | **nouveau** — Échap, piège de focus, retour du focus, fond inerte |
| `src/ui/UIModal.js`, `src/ui/UIFullscreenPanel.js` | délégation au module ; option `closeOnEscape` |
| `src/panels/StarterModal.js`, `src/ui/UIContextMenu.js`, `src/ui/UISortableList.js`, `src/ui/dashboard/WindowDragController.js` | consommation d'Échap explicite (un seul Échap = une seule couche) |
| `tools/i18n/audit-keys.mjs` | règle `.desc` réelle + sortie non nulle |
| `tools/contrast-audit.mjs` | **nouveau** — audit WCAG rejouable |
| `tests/Release11610.test.js`, `tests/browser/Release11610.mjs` | **nouveaux** — 22 + 7 vérifications |
| `tests/Release1152.test.js`, `tests/Release1156.test.js` | contrat de fatigue mis à jour (voir §2) |
| `package.json`, `src/config/GameConfig.js` | version 1.16.10 + scripts `audit:contrast`, `audit:i18n` |

## 5. Vérifications

| Contrôle | Résultat |
|---|---|
| `node test_suite.js` | **810 / 0** (789 en 1.16.9, +21) |
| `node tools/i18n/audit-keys.mjs` | 0 clé manquante (sortie 0) |
| `node tools/contrast-audit.mjs --check` | 147 paires, 0 sous AA (sortie 0) |
| `tests/browser/Release11610.mjs` (Chromium) | **7/7** — carte du menu des saves et aperçu des réglages mesurés, fond inerte, Échap + retour du focus, fatigue réelle au 50ᵉ combat, console propre |
| `tests/browser/SaveCardPortrait.mjs` | 9/9 |
| `tests/browser/ItemSpriteSize.mjs` | 8/8 |
| `tests/browser/PanelFit.mjs` | 7/7 |
| `tests/browser/LanguageSwitch.mjs` | 8/8 |
| `tests/browser/AfkCatchUp.mjs` | 4/4 |
| `tests/browser/BackdropAndAutoContext.mjs` | pass |
| `InteractionCorrections.mjs`, `FeedbackCorrections.mjs` | **échouent à l'identique avant et après cette passe** (vérifié par `git stash`) : suites anciennes déjà rouges, hors périmètre |

**Non vérifié dans cette passe** (honnêtement) : la fatigue sur 50 victoires réelles jouées à la main
(le test Chromium force 49 victoires puis gagne réellement la 50ᵉ) ; la fatigue pendant la reprise AFK
(elle applique la même règle réelle, mais aucun scénario AFK de 50 victoires n'a été mesuré) ; les 26
fenêtres une par une au clavier (le contrat est commun et testé sur les deux familles, pas fenêtre par
fenêtre) ; le rendu des 9 thèmes après le correctif des jetons de succès.

## 6. Décisions laissées ouvertes

1. **Fatigue** : le modèle appliqué est celui que la documentation et le plan d'équilibrage promettaient
   (50 combats consécutifs). Le `main` a un autre modèle (drain par tour `battle.chill`). Si tu préfères
   celui du `main`, c'est un remplacement de `FatigueRules` + `_applyFatigue`, sans toucher au reste.
2. **Recadrage des sprites de la carte** : voir la remarque du §1 (marge transparente des PNG).
3. P1/P2 de l'audit non traités : unification des 9 classes de titres / 16 états vides / 22 boutons,
   plancher typographique à 11 px, recherche texte dans les 5 fenêtres qui n'en ont pas, échelle unique
   d'icônes d'objets (5 tailles mesurées).
