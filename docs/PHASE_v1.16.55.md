# Phase 1.16.55 — section « ecrans absents du jeu » dans le statut

Reponse a la question « reste-t-il des ecrans du catalogue qui ne sont pas dans le jeu ».

- `docs/STATUT_AFFICHAGES.md` recoit une section 0 en tete : la liste des affichages du catalogue
  sans ecran equivalent en jeu, verifiee dans le code et non supposee.
- Cinq ecrans concernes : confirmation du starter et export de sauvegarde (absents), Atoll —
  Boutique, fiche objet et quitter le combat (partiels).
- `tools/measure/presence.mjs` ajoute : il ouvre les 43 modales du jeu une par une et releve leur
  titre, pour distinguer « absent » de « present mais different ».
- Correction d'une correspondance fausse : « export de sauvegarde » n'est pas `DOWNLOAD_PROMPT`.

Aucun fichier de `src/` ou `assets/` modifie. `npm test` : 906 passes, 0 echec.
