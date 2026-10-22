# Bilan de phase — Rework 1.14.15

- **Date :** 22/10/2026
- **Version applicative :** 1.14.15
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** retour de validation no 3 — emplacement « ajouter un Pokémon » à équipe complète

## Correction

- À six Pokémon, `ActiveTeamPanel._syncAddSlot()` appelait déjà `hide()`, mais le style `#team-window-body .pw-drop-zone { display:flex !important; }` le rendait de nouveau visible.
- Le style flex ne s'applique désormais qu'à `.pw-drop-zone:not(.is-hidden)`. Le style `display:none !important` du widget caché peut donc fonctionner, même sous la règle plus spécifique de la Team.
- L'emplacement reste visible et cliquable pour les équipes de moins de six membres; les six cartes Pokémon restent rendues à capacité maximale.

## Vérifications

- `npm test` sur le projet et après extraction de l'archive finale : **327 réussis, 0 échec**.
- Test d'interface avec une équipe de six membres, test statique de la spécificité CSS et du comportement `hide()`; autres flux de Team conservés.
- `node --check` sur **588 fichiers JS/MJS** dans le projet et après extraction; `git diff --check` propre.
- Schéma **15** conservé; aucune donnée sauvegardée ni mutation gameplay modifiée.
- Contrôle visuel manuel navigateur/jeu encore requis.

## Livraison

- Archive dédiée au retour no 3 : `pokeworld-rework-1.14.15.zip` — **2 582 entrées**, environ **14 Mo**, `unzip -t` sans erreur; archive cumulative depuis v1.14.14.
