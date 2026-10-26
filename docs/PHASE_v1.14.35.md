# PokéWorld — Version 1.14.35 (Ajustements Succès & Base Secrète)

**Date :** 25 octobre 2026  
**Branche :** Rework  
**Statut :** Livré et validé (631/631 tests passants, 27/27 règles statiques)

---

## 1. Contexte & Demandes Utilisateur

Suite aux retours sur la version 1.14.34, quatre correctifs spécifiques ont été implémentés pour finaliser le socle avant la Phase 3 :

1. **Succès (Achievements) — Adaptation automatique de la taille du panel :**
   - *Problème :* Lorsque plus de 3 succès étaient épinglés, un conteneur rigide de 280 px imposait un défilement interne gênant dans la fenêtre du tableau de bord.
   - *Solution :* Suppression du plafond de hauteur fixe (`max-height: 280px; overflow-y: auto;`) au profit d'un dimensionnement naturel et dynamique (`.pw-ach-tracker-list`), permettant à la fenêtre du tableau de bord de s'adapter en hauteur sans scrollbar interne (conformément à la règle d'architecture stipulant que les fenêtres ne doivent pas défiler en interne).

2. **Base Secrète — Rendu du canvas sans étirement (respect strict des ratios de sprites) :**
   - *Problème :* En mode visite ou selon les gabarits de base (layouts carrés vs larges vs verticaux), le canvas subissait des largeurs forcées (560px / 650px) qui provoquaient un étirement horizontal ou vertical des sprites.
   - *Solution :* 
     - Suppression des largeurs rigides forcées (`width: min(100%, 650px)`) sur `.pw-secret-base-room` et `.pw-secret-base-room--visit`.
     - Application de dimensions intrinsèques `width: auto; max-width: 100%; height: auto; max-height: 58vh; object-fit: contain; margin: 0 auto;`.
     - Centrage automatique avec marges neutres sur les côtés (« laisser du vide sur les côtés »), assurant un rendu pixel art 1:1 net et sans aucune déformation de sprite.

3. **Base Secrète — Modal de visite conforme à `UIModal` et `Rules.md` :**
   - *Problème :* `SecretBaseVisitModal` avait `closeOnBackdrop: false` et `showCloseBtn: false`, ce qui supprimait la croix de fermeture d'en-tête et empêchait de fermer la fenêtre en cliquant en dehors sur le fond sombre.
   - *Solution :* Héritage direct de `UIModal` avec en-tête standardisé (`.pw-win-hdr`), bouton de fermeture officiel (`.pw-modal-close-btn` avec icône `close`), fermeture activée sur clic de backdrop (`closeOnBackdrop: true`) et arrêt propre de la session de visite sur `onExit()`.

4. **Base Secrète — Pose de PNJ illimitée et accessible dès le départ :**
   - *Problème :* La pose de PNJ était bloquée par une référence indéfinie (`MAX_NPCS_PER_BASE`), et un plafond artificiel de 8 PNJ était appliqué dans le moteur.
   - *Solution :*
     - Levée intégrale du plafond de PNJ (`MAX_NPCS: Infinity`).
     - Bouton d'ajout de PNJ (`.base-stock-item` dans l'onglet PNJ) disponible et actif dès le début sans prérequis d'objet possédé (`disabled: false`).
     - Pastille de quantité affichant le symbole infini `∞`.
     - Possibilité pour le joueur de recruter et positionner autant de partenaires PNJ qu'il le souhaite sur les cases libres de la base.

---

## 2. Détail des Modifications Techniques

### 2.1 CSS & Design System
- **`assets/css/design-system.css` :**
  - Mise à jour de `.pw-ach-tracker-list` : suppression de `max-height: 280px; overflow-y: auto;` pour une extension fluide de la fenêtre du tableau de bord.
- **`assets/css/secret-base.css` :**
  - Mise à jour de `.pw-secret-base-room` et `.pw-secret-base-room--visit` : `width: auto; max-width: 100%; height: auto; max-height: 58vh; object-fit: contain; margin: 0 auto;`.
  - Adaptation de la media query mobile (`@media (max-width: 640px)`) pour préserver les proportions naturelles sans déformation.

### 2.2 Moteur & Configuration
- **`src/config/SecretBaseRules.js` :**
  - `MAX_NPCS: Infinity` (suppression de la limite de 8 PNJ par base).
- **`src/systems/SecretBaseSystem.js` :**
  - Contrôle `createNpc` sécurisé avec `Number.isFinite(SecretBaseRules.MAX_NPCS)`.
- **`src/panels/SecretBasePanel.js` :**
  - Onglet `__pals` débloqué en permanence (`disabled: false`), décompte dynamique et pastille `∞`.

### 2.3 Interface Visite
- **`src/panels/SecretBaseVisitModal.js` :**
  - Héritage de `UIModal` avec `hasHeader: true`, `showCloseBtn: true`, `closeOnBackdrop: true`.
  - Implémentation du cycle de vie `onExit()` arrêtant proprement la visite lors de la fermeture via le bouton d'en-tête ou le clic hors fenêtre.

---

## 3. Validation & Tests

La suite automatisée valide l'intégralité des fonctionnalités :
- **631 tests exécutés, 631 passants, 0 échec.**
- **27 règles statiques d'architecture (StaticRules.test.js) validées à 100 % :**
  - 0 injection HTML.
  - 0 style inline.
  - Code et identifiants 100 % en anglais.
  - Synchronisation bilingue FR/EN parfaite.
  - Aucune mention interdite.

---

## 4. Archive Livrable

L'archive complète du projet prêt à l'emploi est générée :
- **Chemin :** `/home/user/pokeworld-rework-1.14.35.zip`
