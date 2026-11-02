# Phase 1.16.6 — Le debug « Vitesse x10 » ne pilotait qu'un seul moteur

> Signalement du joueur : « Le debug de speed x10 ne fonctionne pas sur l'entraînement, cela devrait
> être le cas. » C'est exact, et le `main` faisait déjà ce que vous décrivez.

---

## 1. Le problème constaté

Mesure avant correction, même graine, Dracaufeu niv. 60 en mode attaque, 20 images de 0,1 s :

| Vitesse | Temps de combat simulé | Vagues gagnées |
|---|---|---|
| x1 | 2,00 s | 1 |
| x10 | **2,00 s** | **1** |

Le bouton ne changeait rien du tout pour l'entraînement.

## 2. La cause : un réglage possédé par un seul système

`BattleSystem` stockait la valeur dans un champ privé (`_speedMultiplier`) et l'appliquait dans sa
propre boucle :

```js
// src/systems/BattleSystem.js avant 1.16.6
update(dt) {
  const timeScale = this._speedMultiplier > 1 ? this._speedMultiplier : 1;
  session.update(dt * timeScale);      // ← seul endroit où le multiplicateur servait
```

Or une session d'entraînement n'est pas avancée par `BattleSystem` : elle a sa propre boucle,
`TrainingSystem.update(dt)`, qui utilisait le `dt` brut. Le bouton de debug était donc branché sur un
seul des deux moteurs — et le nom du champ (`_speedMultiplier` du système de combat) disait déjà que
la valeur n'était pas censée être partagée.

**La référence fait l'inverse** : dans le `main`, `updateTrainingSlots()` commence par

```js
const dt = 100 * (typeof battle !== 'undefined' && battle && battle.speed ? battle.speed : 1);
```

c'est-à-dire que la vitesse globale y accélérait bien l'entraînement. Le comportement attendu est donc
aussi le comportement d'origine.

## 3. La correction : un propriétaire neutre

Nouveau module `src/core/DebugTimeScale.js` (un réglage, pas un système métier) :

- `getMultiplier()`, `setMultiplier(n)` (borné entre 1 et 10, toute valeur non finie retombe à 1),
  `toggleX10()`, `scale(dt)`, `reset()` ;
- **seul propriétaire** de la valeur : `BattleSystem` n'a plus de champ privé ni d'accesseur dupliqué,
  `TrainingSystem` et le bouton de debug (`DebugWidget`) lisent le même objet.

```js
// BattleSystem.update
session.update(DebugTimeScale.getInstance().scale(dt));

// TrainingSystem.update
this._advance(DebugTimeScale.getInstance().scale(dt));
```

Deux conséquences voulues :

1. **Le plafond de session est accéléré aussi.** `slot.elapsed` est un temps de combat simulé : à x10,
   les 30 minutes d'une session (18 000 ticks) se consomment en 3 minutes réelles. C'est le sens de la
   demande — accélérer l'entraînement, pas seulement ses animations.
2. **Le rattrapage AFK reste en temps réel.** `TrainingSystem.catchUp(seconds)` appelle désormais
   `_advance(step)` sans multiplicateur : une absence de deux minutes reste deux minutes, même si le
   joueur a laissé le x10 allumé. Les chiffres du rapport hors-ligne restent donc vrais.

## 4. Ce qui n'est volontairement **pas** accéléré

Ni la pension (incubation), ni la régénération d'énergie de la mine, ni le rattrapage AFK : ce sont des
horloges réelles, pas des simulations. Le `main` ne les accélérait pas non plus. Si vous voulez les
inclure, c'est une décision séparée (elle rendrait faux les temps affichés).

## 5. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/core/DebugTimeScale.js` | **nouveau** : propriétaire unique du multiplicateur |
| `src/systems/BattleSystem.js` | champ privé et accesseurs supprimés, lecture du propriétaire partagé |
| `src/systems/TrainingSystem.js` | `update()` accéléré, `_advance()` non accéléré pour l'AFK |
| `src/panels/components/DebugWidget.js` | le bouton bascule le réglage partagé, état affiché correct à l'ouverture |
| `tests/Release1166.test.js` | **nouveau** : 5 tests |
| `tests/browser/TrainingWaves.mjs` | +1 vérification Chromium sur le vrai bouton |
| `tests/DebugAndBoxItemUse.test.js` | lit le propriétaire partagé au lieu de `BattleSystem` |

## 6. Vérifications

| Vérification | Résultat |
|---|---|
| `node test_suite.js` | **760 réussis, 0 échec** (755 + 5) |
| Entraînement, 20 images de 0,1 s | x1 : 2,00 s / 1 vague — x10 : **20,00 s / 7 vagues** |
| Chromium, vrai bouton du tiroir de debug | 700 ms réelles → **0,70 s à 1x**, **7,00 s à x10** |
| Rattrapage AFK identique x10 allumé ou éteint | même absence, mêmes secondes simulées, mêmes vagues |
| Combat sauvage inchangé | x10 pendant 5 images rejoue exactement ce que 1x fait en 50 images |
| `tests/browser/TrainingWaves.mjs` | **6/6** |
| `tests/browser/AfkCatchUp.mjs` | 4/4 |
| `tests/browser/DebugAndBoxItemUse.mjs` | toutes les vérifications passent |
| `tests/browser/TalentPools.mjs` | 5/5 |
| `tests/browser/LanguageSwitch.mjs` | 8/8 |
| `tests/browser/PanelFit.mjs` | 7/7 |
| `tests/browser/MarketAndResponsiveTraining.mjs` | toutes les vérifications passent |

## 7. Incident d'environnement à signaler

Pendant cette phase, l'espace de travail a été restauré depuis un instantané : le dépôt Git a été
re-cloné sur la pointe de la branche `Rework` du dépôt distant et l'historique local des versions
1.16.4 et 1.16.5 a disparu. Les fichiers de la 1.16.5 livrée ont été restaurés depuis l'archive
`pokeworld-Rework-v1.16.5.zip` (vérifiée : 755/0), cinq fichiers régressés ont été remis dans leur
version livrée, puis la 1.16.6 a été construite et validée par-dessus. Aucun contenu livré n'a été
perdu, mais l'historique de commits local, lui, est reparti de la pointe distante.
