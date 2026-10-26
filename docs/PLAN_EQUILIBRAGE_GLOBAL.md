# Plan Stratégique d'Équilibrage Global & Architecture de Jeu
*Version 1.14.38 - Spécifications exhaustives révisées suite aux retours de conception*

Fichier de données compagne : `docs/DONNEES_EQUILIBRAGE_GLOBAL.xlsx` (classeur Excel multi-onglets contenant les 151 Pokémon de Kanto sans évolutions sauvages, les flux économiques, les boss légendaires calibrés façon référence, la pension avec level lock régional, l'entraînement des EVs pour toutes les classes, et la progression narrative avec la Team Rocket).

---

## I. Synthèse et Vision Globale

Ce document formalise les arbitrages finaux d'équilibrage de **PokéWorld Rework**, intégrant toutes les directives et correctifs :
1. **Équité et progression naturelle** : Les Pokémon évolués ne spawnent plus sur les routes sauvages ; le joueur doit entraîner ses créatures pour les faire évoluer.
2. **Évolutions par échange** : Utilisation exclusive de l'objet officiel **Câble Link** (`link_cable`, remplaçant le libellé erroné "Link Stone" / "Pierre Liaison").
3. **Pension et Génétique saine** : Suppression des bonus d'attaque arbitraires et des arbres généalogiques superflus. La pension transmet **$+1$ étoile d'IV par éclosion jusqu'à 6 étoiles max par stat** ($+5\%$ par étoile, soit $+30\%$ max).
4. **Verrou de Région (Level Lock)** : La pension ne peut pas dépasser le niveau du boss le plus élevé de la région active, empêchant d'écraser prématurément une nouvelle région.
5. **Entraînement des EVs Universel** : Le Centre d'Entraînement entraîne les **EVs** ($+2.5\%$ par EV, soit la moitié des IVs, max 6 EVs par stat = $+15\%$). Les 30 vagues s'adaptent dynamiquement à la force relative du stagiaire afin que **n'importe quel Pokémon, même de classe E (Chenipan, Magicarpe, Rattata)**, puisse progresser.
6. **Boss Légendaires Régionaux Épiques** : Difficulté calibrée sur le niveau d'exigence de la référence (PV $\times 40$, enrage timer de 90 secondes, DPS check de phase). Une équipe ordinaire se fait laminer ; la victoire requiert une composition optimisée (6 IV, 6 EV, Nature stratégique, objets tenus de palier 25 et synergie élémentaire).
7. **Immersion Narrative & Teams Adversaires** : Intégration de combats de sbires et commandants de la Team Rocket au fil de la quête principale, embuscades aléatoires sur les routes contestées, et déblocage du **Marché Noir de Céladopole** via une quête dédiée d'infiltration.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BOUCLE DE GAMEPLAY MAÎTRESSE                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. ROUTES SAUVAGES             2. CAPTURES                  3. DONJONS & MINES         │
│  [Formes de base uniquement] ──► [Génèrent des DT]     ───►  [Coûtent des DT]           │
│  - Embuscades Team Rocket        - Complètent Pokédex        - Boss de donjons          │
│  - Fatigue de combat             - Requis 147 pour Johto     - Fossiles (50 💎)         │
│           ▲                                                           │                 │
│           │                                                           │                 │
│           │            5. PENSION & ENTRAÎNEMENT                      │                 │
│           │            - Pension : IVs max 6 (+5%/étoile)             ▼                 │
│           │            - Level Lock au boss régional         4. ÉCONOMIE                │
│           └─────────── - Entraînement : EVs (+2.5%/EV) ◄───  [Faucets & Sinks]          │
│                        - Accessible dès la classe E          - Consommables & Câbles    │
│                                                              - Marché Noir (Quête)      │
│                                                                                         │
│  6. RENCONTRES LÉGENDAIRES CANONIQUES (DIFFICULTÉ MAX)                                 │
│  - Îles Écume (Artikodin), Centrale (Électhor), Caverne Azurée (Mewtwo)                 │
│  - PV x40, Enrage Timer 90s, DPS check 1 200+                                           │
│  - Nécessite impérativement une équipe full 6 IV / 6 EV / Nature / Objets p25           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## II. Analyse Détaillée des 8 Domaines

---

### 1. Expérience & Montée de Niveau *(Validé)*
- **Courbe par paliers** : 100 EXP par niveau, transparente et constante.
- **Règle anti-abus** : Gain d'EXP strictement égal à **0** si l'adversaire a $\le \text{Niveau Joueur} - 10$.
- **Rattrapage d'équipe (Catch-up boost)** : Multiplicateur de $\times 3$ à $\times 128$ lorsque l'adversaire dépasse le niveau du Pokémon, permettant d'intégrer rapidement un nouveau Pokémon de niveau 1 dans une zone avancée.
- **Multi-Exp passif** : $50\%$ d'EXP partagée en continu à tous les Pokémon de l'équipe active.

---

### 2. Difficulté des Rencontres Légendaires : Étalonnage Référence

#### Analyse de la difficulté :
Dans le jeu de référence, les combats de boss mythiques ne sont pas de simples sacs de PV :
- **Multiplicateur de PV** : $\times 40$ à $\times 60$ par rapport à un Pokémon standard (Artikodin ~60 000 PV, Mewtwo ~120 000 PV).
- **Vitesse d'attaque adverse** : Cooldown ultra-rapide (1 200 à 1 500 ms).
- **Compte à rebours d'Enrage (Hard Enrage Timer)** : **90 secondes maximum**. Au bout de 90 secondes, le boss déclenche une frappe d'annihilation globale immédiate (wipe de l'équipe).
- **DPS Check de Phase** : À $50\%$ de PV, le boss déploie son bouclier ou sa phase critique (ex. Artikodin érige un bouclier de givre de $30\%$ de ses PV max). Le joueur doit fournir un DPS combiné d'au moins **1 200 à 1 500 DPS** pour franchir la phase avant l'enrage.

#### Pourquoi une équipe standard échoue inévitablement :
- Une équipe issue de l'histoire normale (0-1 IV, 0 EV, objets de niveau 1) culmine à **300 - 450 DPS d'équipe** et subit 400 à 600 dégâts par coup adverse toutes les 1,5 secondes. Elle est décimée en moins de 25 secondes ou se heurte irrémédiablement au mur des 90 secondes.

#### L'Exigence d'Optimisation Complète :
Pour triompher, le joueur doit obligatoirement aligner :
1. **6 Étoiles d'IV partout** ($+30\%$ stats globales issues de la Pension).
2. **6 Étoiles d'EV ciblées** ($+15\%$ stats issues du Centre d'Entraînement).
3. **Natures accordées** ($+10\%$ Atk/SpA ou Vitesse).
4. **Objets tenus améliorés au Palier 25** (Bandeau Choix, Lunettes Choix, Orbe Vie, Restes amplifiés).
5. **Synergies d'attaques et Cross-STAB** ($+35\%$ DPS en alternant les types élémentaires pour exploiter la faiblesse du boss).
Avec cette configuration, le DPS d'équipe grimpe à **1 350 - 1 700 DPS**, permettant de terrasser le boss en 60 à 75 secondes de combat intense.

---

### 3. Système de Combat : Audit des Items, Talents et Attaques

#### État des lieux du code actuel (`BattleEffectCoverage.js` & `src/systems/battle/`) :
- **Objets tenus (Held Items)** :
  - Le système de puissance par quantité possédée (`HeldItemPower.js`) est déjà opérationnel (paliers 1 à 6).
  - *Points à finaliser* : Les effets `Z_CRYSTAL` et `MEGA_STONE` sont actuellement marqués `DEFERRED`. L'activation des Cristaux Z périodiques (déclenchement automatique tous les $N$ tours) et l'effet de temporisation des Méga-Gemmes sont les deux briques majeures à activer.
- **Talents** :
  - 39 familles de talents sont entièrement portées (`PORTED`).
  - 18 talents récents de Gen 6-9 présents dans le dictionnaire (`talents-data.js`) n'ont pas encore de routine de combat dédiée (ex: `moody`, `stamina`, `simple`, `goodasgold`). Ces talents peuvent être branchés sur les déclencheurs existants d'entrée (`EntryRules`) et de K.O. (`HitReactionRules`).
- **Attaques** :
  - 26 familles d'effets sont actives.
  - 27 capacités avec une description mécanique spécifique doivent recevoir leur calcul dédié : notamment *Big Splash* (`body_press` basé sur la Défense), *Ball'Météo* (`weather_ball` avec changement de type et doublement sous météo), et *Force Ajoutée* (`stored_power` avec bonus de +30 par palier de buff).
- **Mécaniques clés retenues pour une parité totale** :
  - **Cross-STAB Combo** : Alternance de deux types d'attaque consécutifs = $+35\%$ à $+80\%$ de dégâts + jauge d'action hachurée.
  - **Timer de Vitesse Exponentiel** : $\text{Timer} = \text{Base} \times (100 / (100 + \text{Vitesse})) \times 0.95^{\text{IV Vitesse}}$.
  - **Paralysie Déterministe** : Cooldown multiplié par $\times 1.75$ (suppression de la RNG de saut de tour).
  - **Tiers de Buffs Discrets** : Paliers stricts `atkup1` ($\times 1.5$) et `atkup2` ($\times 2.0$).

---

### 4. Économie & Faucets / Sinks Chiffrés

Les flux économiques sont consolidés dans l'onglet *Economie 5 Devises* du fichier Excel :
- **Pokédollars (₽)** : 
  - Faucets : Routes ($25$ à $800$ ₽), Arènes ($1 400$ à $5 000$ ₽), Ligue ($25 000$ ₽), Pépites ($5 000$ ₽).
  - Sinks : Consommables, Câbles Link, Pension progressive ($15$ à $2 000$ ₽/niv), Vitamines EV ($9 800$ ₽), Marché Noir ($100k$ à $250k$ ₽).
- **Jetons de Donjon (DT)** :
  - Faucets : Captures sauvages ($5$ DT commun, $15$ peu commun, $50$ rare, $200$ très rare, $500$ shiny).
  - Sinks : Péages des 10 donjons ($50$ DT à $10 000$ DT pour la Caverne Azurée), Master Ball ($75 000$ DT), Assistants de pension ($10k$ à $50k$ DT).
- **Points de Quête (QP)** :
  - Faucets : Quêtes principales et contrats de primes ($50$ à $250$ QP).
  - Sinks : Pierres évolutives ($2 500$ QP), Master Ball ($10 000$ QP), Licences AFK ($5 000$ QP).
- **Diamants (💎 Mine)** :
  - Faucets : Fouilles sous-terraines ($1$ à $5$ 💎).
  - Sinks : Réanimation de fossiles au labo de Cramois'Île (**50 💎** par fossile Nautile, Dôme, Ambre).
- **Points de Combat (BP)** :
  - Faucets : Séries de la Tour de Combat.
  - Sinks : Objets de compétition ($48$ BP), Pilules Talent ($50$ BP), Capsules d'Argent ($25$ BP).

---

### 5. Pension : Modèle Épuré des IVs & Verrou de Région (Level Lock)

#### Règle des IVs façon référence :
- **Suppression intégrale** du bonus d'attaque arbitraire ($+25\%$) et de l'arbre généalogique.
- **Progression linéaire par les IVs** : Chaque éclosion à la pension confère **$+1$ étoile d'IV garantie** sur les statistiques.
- **Plafond strict** : **Maximum 6 étoiles d'IV par statistique** (soit $+5\%$ de statistique par étoile, pour un maximum de $+30\%$ de statistiques globales à 6 étoiles).

#### Level Lock Régional (Anti-Powerleveling) :
Pour éviter qu'un joueur ne dépose un Pokémon à la pension pour le monter niveau 100 et rouler instantanément sur la région suivante dès son arrivée :
- **Le niveau maximum atteignable à la pension est verrouillé sur le niveau du champion/boss le plus fort de la région active** :
  - *Kanto (Histoire)* : Plafonné au niveau de Giovanni (**Niv. 50**) avant le 8e badge, puis au Conseil des 4 (**Niv. 65**) avant la victoire de Ligue.
  - *Kanto (Post-Ligue)* : Le plafond saute à **100**.
  - *Transfert à Johto* : Dès que le joueur embarque pour Johto, le cap de pension retombe automatiquement au palier de progression de Johto (ex: Niv. 20 avant le badge 2, etc.), préservant la courbe de difficulté de la nouvelle région.

---

### 6. Centre d'Entraînement : Les EVs Accessibles à Toutes les Classes

#### Entraînement des EVs (et non des IVs) :
- Les IVs s'obtiennent par la Pension. Le Centre d'Entraînement est dédié aux **EVs (Effort Values)**.
- **Formule de Statistique des EVs** : Les EVs donnent **la moitié des statistiques des IVs** :
  $$\text{Bonus EV} = \text{Étoiles EV} \times 2.5\% \quad (\text{Maximum 6 EVs par stat} = +15\% \text{ stats max})$$
- Le Pokémon peut ainsi cumuler **6 IVs ($+30\%$)** et **6 EVs ($+15\%$)**, pour un bonus total de **$+45\%$** sur ses statistiques maîtresses.

#### Accessibilité Universelle (Classe E comprise) :
Un Pokémon de classe E (monstres faibles de départ comme Chenipan, Magicarpe, Aspicot, Rattata) ne doit pas être condamné à l'échec face à des ennemis aux stats surdimensionnées.
- **Algorithme d'Étalonnage Relatif** :
  Les 30 vagues de sparring sont calibrées sur la **classe et le BST du stagiaire** :
  - Un Chenipan affrontera des adversaires de même palier (Chrysacier, Aspicot, Coconfort, Roucool) dotés de niveaux proportionnels ($60\%$ à $120\%$ du stagiaire).
  - Un Dracaufeu ou un Tyranocif affrontera des adversaires de son propre palier (Arcanin, Mackogneur, Dracolosse).
  - Cela garantit que **n'importe quel Pokémon peut valider ses 30 vagues et forger ses 6 EVs**, récompensant l'affection du joueur pour ses créatures favorites.

---

### 7. AFK & Fatigue de Combat *(Validé)*
- Jauge de fatigue basée sur le **Bulk défensif** : micro-dégâts d'usure après 50 combats sans repos pour empêcher le farming illimité sans surveillance.
- Mode **Fast Forward** déterministe au retour du joueur.

---

### 8. Obtenabilité : Respect Strict de Main, Câble Link & Marché Noir

#### A. Suppression des Formes Évoluées Sauvages :
- Conformément à la logique de `main`, **seules les formes de base apparaissent sur les routes sauvages** (Roucool, Chenipan, Aspicot, Rattata, Ptitard, Sabelette, Abo...).
- Les formes évoluées (Roucarnage, Papilusion, Arbok, Sablaireau...) ne spawnent pas : **le joueur doit monter de niveau ses Pokémon de base** pour déclencher leur évolution et remplir son Pokédex.

#### B. Évolutions par Échange via le "Câble Link" :
- L'item nommé par erreur "Link Stone" / "Pierre Liaison" dans la base de données est corrigé en **"Câble Link"** (FR) / **"Link Cable"** (EN).
- Les 4 évolutions par échange de Kanto s'effectuent via l'utilisation de cet objet :
  - Kadabra $\to$ Alakazam
  - Machopeur $\to$ Mackogneur
  - Gravalanch $\to$ Grolem
  - Spectrum $\to$ Ectoplasma

#### C. Le Marché Noir de Céladopole :
- Officialisation du nom **"Marché Noir"** (Black Market).
- Implanté dans l'arrière-salle secrète de Céladopole (en lien avec le Casino et la Team Rocket).
- **Déblocage par Quête Dédiée** : Inaccessible au début. Le joueur doit accomplir la quête d'infiltration du Repaire Rocket de Céladopole et obtenir le sésame auprès d'un PNJ contact pour ouvrir les portes du Marché Noir.
- Permet d'acquérir les spécimens introuvables à l'état sauvage : Starters Kanto restants ($100 000$ ₽), Tygnon/Kicklee ($140 000$ ₽), Évoli additionnel ($180 000$ ₽), Lokhlass ($220 000$ ₽), Porygon ($250 000$ ₽).

---

### 9. Quêtes, Immersion & Combats contre les Teams Adversaires

En phase avec la Roadmap de `main`, l'aventure scénarisée intègre deux niveaux de confrontation avec la Team adverse :

#### 1. Combats Narratifs Scénarisés (Quête Principale) :
- **Mont Sélénite** : Affrontement contre les sbires Rocket tentant de dérober les fossiles Nautile et Dôme.
- **Azuria (Pont Pépite)** : Démasquer le recruteur de la Team Rocket au bout du pont.
- **Lavanville (Tour Pokémon)** : Libération de M. Fuji retenu par les sbires au sommet de la Tour.
- **Céladopole (Repaire Rocket)** : Infiltration souterraine sous le Casino, combats de lieutenants et premier affrontement contre Giovanni (Niv. 30-33). Déblocage du Marché Noir.
- **Safrania (Sylphe SARL)** : Libération des 11 étages envahis par la Team Rocket, combat contre le Rival Blue au 7e étage, puis défaite de Giovanni (Niv. 38-42). Obtention de la Master Ball et de Lokhlass.
- **Jadielle (8e Arène)** : Révélation de l'identité secrète du Champion Giovanni (Niv. 45-50).

#### 2. Embuscades Aléatoires sur les Routes ("Random Encounters") :
- Sur les routes contestées ou occupées par la Team adverse (Route 4, Route 24, Route 7 de nuit, abords de Safrania), il existe une probabilité de **$5\%$ à $15\%$** qu'un combat sauvage se transforme en **embuscade d'un sbire Rocket**.
- Ces combats rapportent des gains accrus en Pokédollars, des jetons de donjon supplémentaires et parfois des objets volés (potions, pépites).

---

### 10. Courbe de Difficulté Globale par Région (Kanto)

Pour instaurer une véritable sensation de progression et de tension :

| Étape de Progression | Tranche de Niveaux | Boss / Ennemis Clés | Éléments Exigés du Joueur |
| :--- | :---: | :--- | :--- |
| **Routes 1 à 4 & Forêt de Jade** | Niv. 2 - 8 | Chenipan, Roucool, Rattata | Découverte de la capture et des types de base. |
| **Arène 1 (Pierre - Argenta)** | Niv. 12 - 14 | Racaillou, Onix (Défense élevée) | Première diversification (avantage Eau/Plante ou Double Pied). |
| **Mont Sélénite & Azuria** | Niv. 10 - 18 | Sbires Rocket, Nosferapti, Racaillou | Gestion du poison et premiers donjons à péage en DT. |
| **Arène 2 (Ondine - Azuria)** | Niv. 18 - 21 | Stari, Staross (Vitesse & Vibraqua) | Premier pic de vitesse : nécessite Plante/Élec ou timers rapides. |
| **Carmin & SS Anne** | Niv. 18 - 24 | Rival Blue, Matelots, Major Bob | Gestion de la paralysie et introduction des Pokémon Sol. |
| **Arène 3 (Major Bob)** | Niv. 21 - 24 | Voltorbe, Pikachu, Raichu | Immunité Sol ou équipement de Baies Ceriz. |
| **Grotte Sombre & Lavanville** | Niv. 22 - 28 | Onix, Fantominus, Spectrum | Gestion des types Spectre et immunité Normal/Combat. |
| **Céladopole & Repaire Rocket** | Niv. 25 - 33 | Erika, Sbires Rocket, Giovanni 1 | Gestion des poudres de statut (Spore, Toxik) et premier boss multi-pokémon. |
| **Piste Cyclable & Parmanie** | Niv. 28 - 38 | Motards, Koga, Safari | Résistance physique et spéciale face au poison sévère. |
| **Sylphe SARL & Safrania** | Niv. 34 - 43 | Rival Blue, Giovanni 2, Morgane | Alakazam et Kadabra frappent avec un DPS spécial colossal. |
| **Chenaux & Cramois'Île** | Niv. 36 - 47 | Nageurs, Auguste (Feu & Déflagration) | Burst offensif lourd sous météo Ensoleillée. |
| **Arène 8 (Giovanni - Jadielle)** | Niv. 45 - 50 | Triopikeur, Nidoqueen, Nidoking, Rhinoféros | Équipe complète et solide de 5 Pokémon imposants avec Séisme. |
| **Route Victoire & Conseil des 4** | Niv. 50 - 60 | Olga, Aldo, Agatha, Peter | Boss Rush sans retour : exige une équipe diversifiée niveau 55+. |
| **Maître de la Ligue (Rival)** | Niv. 59 - 65 | Équipe de 6 Pokémon de très haut niveau | Examen final : requiert une équipe niveau 60+ avec IVs/EVs travaillés. |
| **Sanctuaires Légendaires (Endgame)** | Niv. 70 - 100 | Artikodin, Électhor, Sulfura, Mewtwo | Hard Enrage 90s, PV x40 : réservé aux équipes full 6 IV / 6 EV niveau 100. |

---

### Fichiers Livrés et Consultables

1. **`docs/DONNEES_EQUILIBRAGE_GLOBAL.xlsx`** : Le classeur complet (7 onglets, 151 Pokémon sans évolutions sauvages, matrice économique, boss légendaires, pension avec level lock régional, entraînement adaptatif des EVs, et courbe narrative).
2. **`docs/PLAN_EQUILIBRAGE_GLOBAL.md`** : Ce document de référence intégral.
3. **`/home/user/pokeworld-rework-1.14.39.zip`** : Archive complète du projet actualisée.
