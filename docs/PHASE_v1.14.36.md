# Phase v1.14.36 — Isolation de la visite de Base Secrète & Refonte du formulaire PNJ

## Objectifs de la version 1.14.36

Cette itération corrective répond aux deux points de retour utilisateur sur la Base Secrète :
1. **Isolation de la visite depuis la fenêtre Lieu** : Le lancement d'une visite de base secrète depuis la fenêtre Lieu (`LocationPanel` / `LocationAlcoves`) ne doit plus basculer le panneau de base secrète (`SecretBasePanel` / `#win-base`) en mode visite.
2. **Refonte de la modale d'édition de PNJ (`SecretBaseNpcModal`)** : Refonte visuelle et structurelle pour éliminer le collage inconfortable entre libellés et zones de texte, en s'inspirant de l'agencement et des espacements de `Settings` (profil de sauvegarde, `.save-profile-field`, sections nettes et spacieuses).

---

## 1. Isolation de la visite depuis la fenêtre Lieu

### Problématique identifiée
Dans `SecretBasePanel.js`, l'écouteur d'événement `SecretBaseVisitChangedEvent` interceptait sans distinction tout démarrage de visite (`event.reason === 'started'`) et activait automatiquement `this._visitMode = true`, masquant le tiroir de réserve `#base-stock` et altérant l'affichage de l'éditeur sur le tableau de bord, même si la visite provenait d'une alcove ou d'une visite lancée depuis `LocationAlcoves`.

### Corrections apportées
- **Marquage contextuel de session** :
  - `SecretBaseSystem.startOwnVisit({ fromLocation = false } = {})` accepte un paramètre optionnel `fromLocation`.
  - `SecretBaseSystem.startAlcoveVisit()` et les ouvertures depuis `LocationAlcoves._visit()` marquent désormais explicitement `fromLocation: true`.
  - Le snapshot de visite `SecretBaseSystem.getVisitSnapshot()` restitue ce champ `fromLocation`.
- **Filtrage dans `SecretBasePanel`** :
  - Dans `SecretBasePanel.js`, si `event.snapshot?.fromLocation` ou `event.snapshot?.source === 'alcove'` est détecté au démarrage, le panneau ignore l'événement et ne bascule pas en mode visite.
  - Le panneau d'édition reste disponible et intact, tandis que la modale dédiée `SecretBaseVisitModal` prend en charge l'expérience de visite immersive.

---

## 2. Refonte visuelle et ergonomique de `SecretBaseNpcModal`

### Problématique identifiée
L'ancienne implémentation utilisait une grille compacte 2 colonnes (`gap: 6px`) sans marge adéquate entre les libellés et les champs de texte. De plus, le changement d'apparence était relégué à un simple menu déroulant textuel peu fonctionnel, et l'équipe du PNJ n'était ni visualisable sous forme de cartes interactives, ni modifiable individuellement par Pokémon ou par présélection.

### Solutions et alignement complet avec la référence
- **Champs de formulaire standardisés (`.save-profile-field`)** :
  - Reprise fidèle de l'architecture CSS de `Settings` (`display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 13px; font-weight: 700;`).
  - Champs de texte confortables avec padding généreux (`8px 12px`), fond sombre transparent, bordures nettes et largeur 100 %.
- **Galerie visuelle d'apparences (101 sprites de dresseur)** :
  - Bouton de portrait interactif 64px avec icône d'édition vectorielle (`rename`) et bouton « Choisir une apparence » ouvrant la galerie dédiée (`_mode: 'sprite-picker'`).
  - Filtre de recherche dynamique en direct (`trainer-42...`).
  - Grille défilante de vignettes 48px (`.pw-base-looks-grid`, `.base-npc-looks`) mettant en surbrillance l'apparence active (`.sel` / `.is-selected`) et permettant de choisir instantanément un nouveau look en un seul clic.
- **Création et composition interactive de l'équipe (`_mode: 'mon-picker'` & `'preset-picker'`)** :
  - Les 6 emplacements affichent des cartes de Pokémon interactives avec miniature, nom d'espèce localisé, niveau, et bouton de retrait rapide `✕`.
  - Les emplacements disponibles proposent une zone de clic d'ajout mise en valeur (`+ Ajouter un Pokémon`).
  - Le sélecteur de Pokémon (`_renderMonPicker`) propose une barre de recherche temps réel et liste tous les candidats éligibles (équipe active avec pastille « Équipe » et boîte PC avec pastille « Boîte PC »).
  - Le sélecteur d'équipes complètes (`_renderPresetPicker`) permet d'importer d'un seul clic l'équipe active ou n'importe quel préréglage d'équipe sauvegardé avec prévisualisation des membres.
- **Section Répliques spacieuse** :
  - Trois blocs distincts et espacés pour « Avant le combat », « S'il gagne » et « S'il perd ».
- **Actions de bas de fenêtre (`.pw-modal-actions`)** :
  - Boutons « Enregistrer » (`#pw-base-npc-save-btn`), « Supprimer ce PNJ » (`pw-btn-danger`) et « Annuler ».

---

## 3. Validation et tests automatisés

- **Tests unitaires dédiés ajoutés dans `tests/SecretBase.test.js`** :
  - `visiting from location alcoves does not trigger visit mode on SecretBasePanel` : valide que les visites d'alcove et de base personnelle depuis `LocationAlcoves` ne basculent pas `SecretBasePanel._visitMode` à `true` et conservent le tiroir de réserve visible.
  - `SecretBaseNpcModal layout adheres to settings styling with spacious fields and portrait preview` : valide la structure de l'éditeur PNJ, la présence des classes `.save-profile-field`, la mise à jour des 101 visuels et la sauvegarde des répliques et du nom.
- **Résultats globaux** :
  - **633 tests passants sur 633 (100 % de réussite)**.
  - 27 règles statiques validées sans aucune exception (0 violation).
