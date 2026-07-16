# Rework entraînement / pension — phase 2

## Corrections supplémentaires

- Chance d'obtenir +1 IV à la capture réduite de 35% à 10%.
- Les boutons des 4 entraînements sont maintenant plus visuels, colorés et explicitement traités comme des boutons.
- Le bouton d'amélioration de la Pension prend toute la largeur en haut de la fenêtre.
- Dans le menu d'amélioration de la Pension, les automatisations ont maintenant des cadres distincts selon l'état : vert si activé, rouge/sombre si désactivé.
- La version classique utilise bien les équipes de 6 Pokémon d'entraînement par type principal.
- Les textes de rounds d'entraînement indiquent maintenant 6 rounds.

## Métamorph / Morphing

- Morphing est implémenté.
- Le Pokémon qui utilise Morphing copie le Pokémon adverse :
  - apparence / id ;
  - types ;
  - stats ;
  - attaques ;
  - talent.
- Les PV sont conservés proportionnellement.
- La transformation est temporaire et restaurée à la fin du combat.

## Notes

- La copie du Pokémon adverse a été retenue car elle colle au fonctionnement officiel et évite les problèmes d'entraînement de Métamorph.
