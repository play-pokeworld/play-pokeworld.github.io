# Phase v1.15.2 — Capacités de Combat Spécifiques & Système de Fatigue en Combat Prolongé

## Résumé de la version 1.15.2

Cette itération 1.15.2 apporte des perfectionnements majeurs au système de combat et à l'équilibrage du jeu continu :

1. **Mécaniques des Capacités de Combat Spécifiques (`DamageCalculator.js` & `MoveTyping.js`)** :
   - **Ball'Météo (`weather_ball`)** : Le type de la capacité s'adapte dynamiquement à la météo active sur le champ de bataille (Eau sous la Pluie, Feu sous le Soleil, Roche sous la Tempête de sable, Glace sous la Grêle) et sa puissance est multipliée par 2 ($2\times$) sous météo active.
   - **Force Ajoutée (`stored_power`)** : La puissance de base de la capacité augmente de $+30$ par palier d'augmentation de statistique positive du lanceur (`atk`, `def`, `spa`, `spd`, `spe`), valorisant les stratégies de placement et d'amplification.
   - **Big Splash (`body_press`)** : Le calcul des dégâts physiques utilise la statistique de **Défense** (`def`) du lanceur ainsi que ses modificateurs de statistique défensive au lieu de l'Attaque physique, permettant aux Pokémon dotés d'une défense colossale (ex. Steelix, Regirock, Gigalithe) d'infliger d'immenses dégâts d'écrasement.

2. **Système de Fatigue en Combat Prolongé & Talent Endurance (`BattleSystem.js`)** :
   - Intégration de l'usure de fatigue (Section II.7 du plan d'équilibrage) lors des sessions ininterrompues de combats sauvages.
   - Au-delà de 50 KOs consécutifs dans la même session, une légère usure de fatigue s'applique à l'équipe active.
   - Le talent **Endurance** (`stamina`) divise par deux l'usure de fatigue subie, concrétisant la promesse de ce talent en combat continu.

3. **Suite de Tests et Validation** :
   - Création de la suite de tests `tests/Release1152.test.js` couvrant l'adaptation météo et le multiplicateur de Ball'Météo, l'échelle de Force Ajoutée, le calcul de Défense de Big Splash, et l'atténuation de fatigue par le talent Endurance.
   - Validation complète de la suite : **648 tests passants sur 648 (100 % de succès)**.
   - Respect absolu des règles statiques (architecture modulaire, un seul rôle par classe, zéro emoji dans le code, zéro HTML direct hors UI, commentaires et identifiants strictement en anglais).
