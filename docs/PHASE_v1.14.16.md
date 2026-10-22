# Bilan de phase — Rework 1.14.16

- **Date :** 22/10/2026
- **Version applicative :** 1.14.16
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** retour de validation no 4 — action de donjon dans le panneau Lieu

## Correction

- L'icône de porte est remplacée par le glyphe `sparkle` de Rework, dont la géométrie correspond au glyphe `explore` de `main`.
- Avant une expédition, le libellé reprend la profondeur localisée (un ou plusieurs paliers), puis le sprite du Jeton de donjon et le péage formaté dans la langue active. Le tarif reste lu par `DungeonSystem.entryToll()`; aucune donnée de jeu ni formule n'est dupliquée.
- Le bouton de donjon adopte le skin générique adaptatif de `main` : fond et bordure dérivés de `--light2`, texte renforcé, ainsi que le retour hover assorti. La variante est appliquée au composant `UIActionTile`; aucune règle DOM ou logique issue de `main` n'est transplantée.
- **Flux d'expédition conservé selon la décision de validation :** le démarrage et la reprise sur place appellent `DungeonSystem.enter(location.id)`. Une expédition active conserve « Reprendre l'expédition », ne réaffiche pas le péage et n'ajoute pas de nouveau comportement de combat. Une expédition active ailleurs demeure une ligne informative non cliquable.
- `UIActionTile` accepte désormais un modèle de texte riche `UIText` pour les symboles inline sûrs; aucun `innerHTML` n'est utilisé.

## Vérifications

- `npm test` sur le projet et après extraction de l'archive finale : **331 réussis, 0 échec**.
- Tests FR/EN sur l'icône exploration, la profondeur, le sprite et le péage; tests de dispatch d'entrée et de reprise via `DungeonSystem.enter()`; état actif ailleurs conservé comme ligne informative.
- Test CSS compare le skin de base et le hover au traitement générique de `main`.
- `node --check` sur **589 fichiers JS/MJS** dans le projet et après extraction; `git diff --check` propre.
- Métadonnées **1.14.16** synchronisées; schéma **15** conservé.
- Contrôle visuel manuel navigateur/jeu encore requis.

## Livraison

- Archive dédiée au retour no 4 : `pokeworld-rework-1.14.16.zip` — **2 584 entrées**, environ **14 Mo**, `unzip -t` sans erreur; archive cumulative depuis v1.14.15.
