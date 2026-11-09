# Galerie visuelle v1.16.32 — à valider avant de coder

Toutes les images viennent du **jeu réel** (serveur local, branche `Rework`, v1.16.32), pas d'une maquette.
Même sauvegarde, même partie, mêmes données dans toutes les captures : seul le thème change.

**Fichier unique à ouvrir :** `study/gallery/GALERIE_v1.16.32.pdf` (6 pages).
Images séparées : `study/gallery/sheets/*.jpg`. Captures d'origine (pleine résolution) :
`study/gallery/raw/{pc|mb}-{thème}-{écran}.jpg` — 100 fichiers, 1280×800 et 390×844.

## Ce que contient chaque page

| Page | Contenu | Ce qu'elle sert à décider |
|---|---|---|
| 1 | Tableau de bord **PC** (1280×800) dans les **10 thèmes** | La direction artistique sur la présentation à trois colonnes |
| 2 | Tableau de bord **mobile** (390×844) dans les **10 thèmes** | La même direction une fois la colonne unique et la barre basse |
| 3 | **5 écrans PC** (tableau de bord, Boîte PC, Pokédex, Sac, Réglages) en thème **sombre** et **clair** | La cohérence entre les fenêtres denses |
| 4 | **Les mêmes 5 écrans en mobile**, sombre et clair | Ce que la refonte 1.16.32 change vraiment, écran par écran |
| 5 | **Boîte PC** dans 5 thèmes, PC **et** mobile | Le test le plus dur : filtres + grille + listes |
| 6 | **Pokédex** dans 5 thèmes, PC **et** mobile | Grille d'espèces, bande de filtres, fiche détaillée |

Les 10 thèmes existants : Sombre (défaut), Clair, Game Boy, Feu, Océan, Forêt, Sakura, Minuit, Désert,
Contraste élevé.

## Mesures réelles sur les captures (pas des impressions)

Contraste du texte, mesuré en `getComputedStyle` sur le tableau de bord, thème par thème
(seuil WCAG AA : 4,5:1 pour du petit texte).

| Thème | Titre de fenêtre (13 px) | Texte secondaire `.pw-cur-name` (11 px) |
|---|---|---|
| Sombre | 9,29:1 | **4,22:1** — juste sous le seuil |
| Clair | 8,21:1 | **2,12:1** — échec |
| Game Boy | 8,25:1 | **2,98:1** — échec |
| Feu | 12,83:1 | 5,51:1 |
| Océan | 15,40:1 | 6,70:1 |
| Forêt | 14,56:1 | 6,23:1 |
| Sakura | 11,88:1 | **2,21:1** — échec |
| Minuit | 16,14:1 | 7,85:1 |
| Désert | 12,93:1 | 5,46:1 |
| Contraste élevé | 21:1 | 8,68:1 |

**Cause identifiée :** le texte secondaire utilise une couleur fixe (`#99aaaa`) qui ne suit pas les
jetons du thème. Elle est lisible sur les thèmes sombres et **illisible sur les thèmes clairs**
(Clair, Sakura, Game Boy). C'est un défaut de conception des thèmes, pas de la mise en page — donc à
corriger dans les jetons de couleur, pas dans les écrans.

## Ce que les images montrent, sans complaisance

1. **Les trois colonnes PC tiennent** dans les 10 thèmes ; les fenêtres gardent leur largeur (310 px)
   et la carte ne se déforme pas. Aucun thème ne casse la structure.
2. **Le mobile est encore une pile de fenêtres de bureau** : la colonne unique fonctionne, la barre basse
   fonctionne, mais l'écran d'accueil mobile reste long (Carte → Lieu → Monnaies → Poké Balls → …).
   C'est le chantier de la phase 4, pas un défaut du socle.
3. **La carte et les sprites Pokémon restent en couleur** dans les thèmes monochromes (Game Boy,
   Contraste élevé, Minuit) : le chrome est vert monochrome, l'illustration non. Deux directions
   possibles — assumer le contraste (contenu = couleur, interface = thème), ou désaturer/teinter
   l'illustration par thème. **C'est une décision de DA, elle t'appartient.**
4. **« Contraste élevé » et « Minuit » sont visuellement très proches** de « Sombre » à l'écran ; si le
   thème doit servir d'accessibilité, il n'est pas assez distinct (fond noir pur, texte blanc pur, oui —
   mais les surfaces intermédiaires restent sombres).
5. **Le thème Clair est le plus fragile** : les surfaces claires se ressemblent (fenêtre / fond de page),
   la hiérarchie repose alors sur les bordures seules, et le texte secondaire tombe à 2,12:1.
6. **Boîte PC en PC** : le panneau plein cadre mesure **960×720, centré** (x = 160, y = 40) — vérifié en
   mesurant le DOM, pas à l'œil : ce n'est pas un panneau « petit dans un coin ».
7. **Boîte PC en mobile** : la bande de filtres tient sur **une ligne** (Pokédex #, Niveau, IVs, EVs,
   chevron) contre quatre auparavant — c'est le gain de la 1.16.32, visible sur la page 5.

## Ce que je te demande de valider (et ce que je ne décide pas)

1. **Direction artistique** : on garde les 10 thèmes tels quels ? On en retravaille quelques-uns ? On en
   garde 3–4 et on soigne ceux-là ?
2. **Thème de référence** pour la suite du travail : sur lequel je juge chaque écran refait (Sombre ?
   Clair ? Les deux systématiquement ?).
3. **La couleur de l'illustration face au thème** : la carte et les sprites suivent-ils le thème
   (filtre de saturation par thème) ou restent-ils toujours en couleur ?
4. **Le texte secondaire** : je corrige la couleur fixe `#99aaaa` pour qu'elle suive le thème (jeton
   `--pw-text-muted`), ce qui répare Clair / Sakura / Game Boy d'un coup — ou tu préfères choisir une
   valeur par thème à la main ?

## Limites de cette galerie

- Captures faites dans **Chromium piloté**, viewports **1280×800** (PC) et **390×844** (mobile),
  `hasTouch`. **Aucun appareil physique** : ni pouce réel, ni barre d'URL mobile, ni clavier natif.
- Une seule sauvegarde, une seule partie, un seul Pokémon dans la Boîte PC : la galerie montre la
  structure et les couleurs, pas la densité d'une partie avancée (200 Pokémon, quêtes terminées).
- Auto-défense utile : deux idées fausses corrigées en mesurant le DOM — le panneau PC **est** centré,
  et la barre de notifications ne recouvre pas la navigation.
