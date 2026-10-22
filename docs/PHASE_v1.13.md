# Bilan de phase — Rework 1.13.0

- **Date :** 21 octobre 2026
- **Version applicative :** 1.13.0 · schéma de sauvegarde 14
- **Référence visuelle et comportementale :** `main` · architecture Rework conservée

> Cette version de suivi remplace l’archive 1.12.0 contestée par l’utilisateur. Les validations ci-dessous couvrent les priorités demandées; elles ne certifient pas une partie complète de chaque région.

## Corrections validées

### Histoire, quêtes et tutoriel

- Le compteur principal affiche la région et le palier courant; les quêtes de la chaîne sont numérotées et les objectifs restent lisibles sans doublon de progression.
- Une quête principale non réclamable affiche l’état informatif **« En cours… »**, plutôt qu’un bouton désactivé sans fonction.
- Les actions Guide / Désactiver du tutoriel reprennent le retour à la ligne de `main`.
- Vérification visuelle à **1280 × 720** : actions du tutoriel Rework **107 × 44**, **57 × 44**, **82 × 44 px**, contre 107,25 × 44, 57,75 × 44 et 82,5 × 44 px dans `main`; « Désactiver » passe bien sur la deuxième ligne. Carte tutoriel : 383,91 px contre 382,31 px dans `main`; carte de quête : 209,06 px contre 210,50 px. Les écarts résiduels d’environ 1 à 2 px sont conservés; aucune parité pixel par pixel n’est revendiquée.
- Parcours navigateur : parler au Prof. Chen depuis Bourg Palette termine sa quête et fait avancer l’en-tête de **Kanto — 1/64** à **Kanto — 2/64**. Le modal et la progression correspondante ont aussi été vérifiés en anglais.

### Routes et déblocages

- Parcours navigateur : déplacement vers Route 1, combat sauvage, puis victoires suivies dans le jeu. Le nœud **Jadielle / Viridian** est passé de `locked` à `adjacent` au seuil de dix victoires; le clic sur le nœud a ensuite réellement déplacé le joueur à Jadielle. Aucun changement de règle de combat ou de rencontre n’a été apporté pour ce contrôle.
- Le niveau sauvage étant tiré selon le jeu, une défaite contre un adversaire plus fort reste possible; une première défaite isolée n’est pas interprétée comme un défaut d’équilibrage. Les tests de parcours utilisent une source aléatoire de QA distincte et reproductible, sans IDs Pokémon dupliqués.

### Pokédex initial, équipe et Boîte PC

- Décision conservée : le starter initial reste capturé au Pokédex. Le tracker Kanto affiche **1/25 · 4 %**; aucun changement du modèle de départ.
- Parcours navigateur complet avec des identifiants Pokémon distincts : capture d’un second Pokémon, équipe à **2/6**, sauvegarde du preset **2/6**, rangement PC (**équipe 1/6 · PC 1**) et retrait du PC (**équipe 2/6 · PC 0**).
- Favoris, Verrouillés, rang et filtres PC restent basés sur le comportement de référence, sans nouvelle sémantique.

### Mobile et localisation

- Contrôle Playwright avec `isMobile: true`, `hasTouch: true`, largeur **390 × 844** : `maxTouchPoints = 1`, pointeur tactile détecté, aide du tutoriel adaptée au mobile, navigation Équipe / Raccourcis et ouverture de la Boîte PC fonctionnelles; aucun débordement horizontal (**scrollWidth − innerWidth = 0**).
- FR et EN vérifiés dans le navigateur sur le compteur des quêtes principales, la progression par dialogue, et les libellés des quêtes.
- Aucune erreur JavaScript ou console lors des parcours navigateur consignés.

## Persistance et compatibilité

- Aucun changement du schéma de sauvegarde : il reste à **14**; aucune migration n’est ajoutée dans cette phase.
- `package.json`, `package-lock.json` et `GameConfig.VERSION` sont synchronisés sur **1.13.0**.
- Les opérations de preset, d’équipe et de PC continuent de passer par leurs systèmes propriétaires. Aucune manipulation du DOM n’est ajoutée aux systèmes ou aux données.

## Validation automatisée

- `npm test` : **286 réussis, 0 échec** après déterminisation du test de type d’immunité. Le test utilisait auparavant un talent aléatoire de Rattata pouvant être Scrappy (qui ignore réellement l’immunité Normal); son fixture teste désormais le tableau des types sans talent qui en modifie le résultat. Aucune règle de combat n’a été modifiée.
- `node --check` : vérification des fichiers JavaScript du projet (résultat final consigné avant l’archive).
- `git diff --check` : résultat final consigné avant l’archive.

## Portée et limites

- Les parcours critiques demandés (parole de quête, déblocage de la prochaine ville, actions Story/tutoriel, flux d’équipe et transferts PC) ont été observés dans le navigateur; les tests unitaires seuls ne sont donc pas utilisés comme preuve de ces parcours.
- Cela ne certifie pas une partie complète jusqu’à la Ligue, ni tous les lieux, thèmes, états de combat, appareils ou paliers de progression. Les parcours navigateur Johto/Hoenn restent à compléter.
- Le tutoriel mobile a été vérifié avec émulation tactile; cela ne remplace pas un essai sur téléphone physique.
- Le résultat d’un combat dépend de l’adversaire tiré et du flux aléatoire; aucun ajustement de gameplay n’a été fait sur la base d’une rencontre unique.
- La Base secrète Hoenn complète demeure hors périmètre; ses règles d’accès/visibilité existantes sont conservées.

## Archive livrable

- Archive : `pokeworld-rework-1.13.0.zip` (racine `Rework/`).
- L’intégrité ZIP, l’extraction dans un dossier propre et la suite de tests exécutée depuis l’extraction sont contrôlées avant livraison.
