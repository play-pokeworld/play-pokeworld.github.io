# Phase 1.16.21 — Reflow réel des interfaces mobiles

**Date :** 5 novembre 2026  
**Branche :** `Rework`  
**Type :** correctif responsive d'affichage et d'accessibilité du scroll ; schéma de sauvegarde inchangé.

## 1. Retour de la 1.16.20 et nouvelle cause

Le retour utilisateur a montré que les scrolls et le dimensionnement des interfaces cités restaient mauvais. La vérification précédente mesurait les cadres et assignait `scrollTop` programmatiquement ; elle ne contrôlait pas suffisamment les débordements horizontaux internes ni tous les gestes de doigt. C'était une validation trop faible, et la 1.16.20 ne corrigeait pas le problème complètement.

La suite étendue a mis en évidence deux causes supplémentaires :

- certains éléments de réglages et certaines grilles de détails Pokédex conservaient des tailles min-content/minimum prévues pour ordinateur, ce qui élargissait le contenu scrollable au-delà du corps de la fenêtre ;
- la table des capacités utilisait plusieurs colonnes fixes. Un panneau peut donc tenir à l'écran tout en ayant son contenu horizontalement coupé ou hors du geste de scroll vertical.

## 2. Corrections

- **Settings :** les rangées d'actions de sauvegarde et le champ de code de diagnostic peuvent maintenant se replier, leurs enfants ne débordent plus de la largeur disponible.
- **Fiche Pokédex :** passage à une grille `minmax(0, 1fr)` sur écran étroit ; contenus et panneaux imbriqués ont une largeur minimale réductible.
- **Talents Pokédex :** la grille ne garde plus son minimum PC de 280 px lorsqu'elle est plus étroite que le panneau.
- **Capacités Pokédex :** colonnes redimensionnées pour les écrans tactiles étroits ; texte et badges peuvent s'enrouler. Grilles CT/entraînement également bornées à la largeur réellement disponible.
- Les corrections précédentes de v1.16.20 pour le flux de scroll, les dialogues, le filtre des Succès et les hauteurs dynamiques sont conservées.
- Version synchronisée `package.json`, `package-lock.json`, `GameConfig.VERSION` : **1.16.21**.

Aucun nouveau système de responsive ou d'interaction n'est introduit. Les styles restent dans les feuilles propriétaires concernées.

## 3. Tests et résultats

- `npm test` : **880 réussis, 0 échec**.
- `tests/browser/ReportedMobileWindows.mjs` : **20 configurations**, quatre interfaces × cinq tailles : 320×568, 390×844, 844×390, 768×1024, 1024×768. Vérifie la géométrie du cadre, l'absence de débordement horizontal dans la fenêtre ET son scroller, les puces des Succès, la fin du contenu et un balayage vertical en touch events CDP pour chaque zone défilante.
- Les dialogues PNJ sans contenu dépassant la fenêtre ne requièrent pas de défilement ; lorsqu'ils débordent, le test leur envoie également un geste tactile.
- `MobileTouch.mjs` : **14/14** ; `PanelFit.mjs` : **7/7**. Les deux sont rejoués sur le snapshot final.
- Les mesures sont dans Chromium émulateur avec `hasTouch`, pas sur appareil physique. Safari/WebKit et Firefox ne sont pas testés.

## 4. Portée et limites

Cette correction vise les interfaces citées et les causes de reflow identifiées dans leurs composants partagés. Elle ne certifie pas l'intégralité de toutes les interfaces/fonctionnalités du jeu ni un appareil tactile réel. Tout écran non couvert doit rester considéré comme à auditer, et non comme validé par extrapolation.
