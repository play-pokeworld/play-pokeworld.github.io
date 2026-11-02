# Release v1.15.7 — Audio, Notifications et Fiche Espèce Pokédex

## Vue d'ensemble

La version **v1.15.7** répond aux retours prioritaires de la communauté en apportant trois évolutions majeures :
1. **Restauration audio complète** : musique d'ambiance dynamique selon les lieux et combats, bruitages sonores (SFX) et 386 cris de Pokémon avec synchronisation des préférences de volume.
2. **Suppression du spam de notifications** : élimination des notifications superflues lors des victoires de combat ordinaires et préservation stricte des alertes à haute priorité (Pokémon chromatiques, légendaires, fuyards, quêtes et succès).
3. **Fiche encyclopédique Pokédex dédiée (`PokedexDetailModal`)** : un clic sur une entrée du Pokédex n'ouvre plus la fiche individuelle d'un Pokémon possédé, mais une fiche d'espèce complète avec description officielle, méthodes d'obtention, capacités apprenables, talents et statistiques de base.

---

## 1. Restauration Intégrale de l'Audio & des Musiques

- **Bibliothèque sonore complète** :
  - **42 pistes musicales (BGM)** couvrant les routes de Kanto, Johto et Hoenn, les villes, les marchés, les donjons élémentaires, les arènes, la Ligue et les différentes musiques de combat (sauvage, dresseur, boss, fuyard, légendaire).
  - **22 effets sonores (SFX)** : clics d'interface, ouvertures de menu, réussites et échecs de capture, victoires et K.O., obtention de badges, gains de niveau, évolutions, éclosions d'œufs.
  - **386 cris de Pokémon** au format OGG/WAV pour l'ensemble des espèces des Générations 1, 2 et 3.
- **Architecture `AudioSystem` robuste** :
  - Gestion indépendante de trois bus audio (`music`, `sfx`, `cries`) avec synchronisation temps réel des réglages du joueur dans les paramètres (`PreferencesSystem`).
  - Déverrouillage automatique de l'audio (`unlock()`) dès la première interaction utilisateur pour respecter les politiques d'autoplay des navigateurs modernes.
  - Fondu enchaîné harmonieux (*cross-fade*) lors des changements d'ambiance musicale.
  - Mise en pause automatique de la musique lorsque l'onglet est masqué (`document.hidden`) et reprise fluide au retour.
  - Moteur de secours par synthèse Web Audio (*AudioContext oscillators*) garantissant qu'aucun son ne plante même en environnement dégradé ou sans support codec direct.

---

## 2. Élimination du Spam de Notifications & Alertes Prioritaires

- **Suppression des notifications parasites** :
  - Les notifications toast répétitives émises à chaque fin de combat sauvage ("Ennemi vaincu !") ont été retirées du flux de combat rapide.
  - Les apparitions ordinaires de Pokémon sauvages ne polluent plus la file d'attente des notifications.
  - Le journal de combat en bas de panneau reste exhaustif pour les joueurs souhaitant analyser leurs actions.
- **Conservation stricte des alertes majeures** :
  - **Pokémon chromatiques (Shiny)** : émission immédiate d'une notification prioritaire avec signal sonore dédié.
  - **Pokémon légendaires et fuyards (Roaming)** : notification d'alerte lors de leur apparition.
  - **Progression et jalons clés** : maintien intégral des notifications d'objectifs de quêtes validés, de succès débloqués (`AchievementUnlockedEvent`) et de messages système critiques.

---

## 3. Fiche Espèce Pokédex Dédiée (`PokedexDetailModal`)

- **Redirection ergonomique** :
  - Cliquer sur une vignette dans le panneau Pokédex (`PokedexPanel`) ouvre désormais la nouvelle fenêtre modale `PokedexDetailModal` au lieu de `PokemonInfoModal` (qui reste réservée à l'équipe et à la boîte PC).
- **Contenu de la fiche Pokédex** :
  - **En-tête Héroïque** : numéro national Pokédex, nom de l'espèce, badges de type élémentaire, statut de capture (silhouette / vu / capturé), sprite haute définition et bouton audio interactif pour écouter le cri du Pokémon.
  - **Description Pokédex Officielle (Flavor Text)** : intégration des textes officiels du Pokédex en français et en anglais (`pokedex-flavor.js`) pour les 386 Pokémon des trois premières générations.
  - **Méthodes d'Obtention Dynamiques (`SpeciesSourceCatalog`)** :
    - Rencontres sauvages par lieu et route avec pourcentage d'apparition exact.
    - Statut de starter régional (Bourg Palette, Bourg Geon, Bourg-en-Vol).
    - Résurrection de fossiles en laboratoire (Argenta, Cramois'Île).
    - Pokémon fuyards régionaux.
    - Évolutions requises (niveaux, pierres évolutives, Câble Link).
    - Reproduction et pension Pokémon.
    - Récompenses d'étapes de quêtes.
  - **Capacités Apprenables** :
    - Capacités par montée de niveau avec palier requis.
    - Capacités par entraînement au dojo / maîtres des capacités.
    - Compatibilités avec les Capsules Techniques (CT) et Secrètes (CS).
    - Clic droit ou sélection d'une capacité ouvrant directement la fiche détaillée dans le dictionnaire des capacités.
  - **Talents & Aptitudes** :
    - Talents normaux et talents cachés distincts avec étiquettes de rareté.
    - Clic sur un talent ouvrant la définition détaillée dans le dictionnaire des talents.
  - **Statistiques de Base (BST)** :
    - Barres de progression proportionnelles pour chaque statistique (PV, Attaque, Défense, Attaque Spéciale, Défense Spéciale, Vitesse).
    - Calcul du total de statistiques de base (Total BST).

---

## 4. Tests et Validation

- **Couverture de tests v1.15.7 (`tests/Release1157.test.js`)** :
  1. Initialisation, gestion des bus de volume et contextes musicaux par `AudioSystem`.
  2. Non-émission de notifications toasts parasites lors des combats sauvages ordinaires.
  3. Déclenchement garanti des alertes prioritaires pour les rencontres spéciales (shiny, fuyards, boss).
  4. Redirection systématique du clic Pokédex vers `PokedexDetailModal` avec exclusion de `PokemonInfoModal`.
  5. Affichage fidèle des descriptions officielles, sources d'obtention, capacités et talents.
- **Résultat de la suite complète** :
  - **677 tests validés avec succès (0 échec)**.
  - 100% de conformité aux règles d'architecture statique (`Rules.md`).
