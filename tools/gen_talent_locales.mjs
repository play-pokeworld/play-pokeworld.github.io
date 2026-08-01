// ============================================================================
// Passe 24 — Régénération des locales de talents (fr/en) + réparation des
// descriptions tronquées dans talents-full.js.
// ----------------------------------------------------------------------------
// Problèmes traités :
//  • 41+ descriptions tronquées (« Grants immunity to », « on  weather »,
//    « inflict  when attacked »…) — copiées en l'état dans les DEUX langues ;
//  • 175/202 descriptions françaises restées en anglais ;
//  • réparation à la SOURCE (talents-full.js info) pour les replis d'affichage.
// Idempotent : on peut relancer le script sans effet de bord.
// ============================================================================
import { readFileSync, writeFileSync } from 'fs';

// ——————————————————————————— TABLE FRANÇAISE (202) ———————————————————————————
const FR = {
  overgrow:['Engrais','Attaques Plante +35% de dégâts si PV < 35%.'],
  blaze:['Brasier','Attaques Feu +35% de dégâts si PV < 35%.'],
  torrent:['Torrent','Attaques Eau +35% de dégâts si PV < 35%.'],
  chlorophyll:['Chlorophylle','Vitesse augmentée de +35%.'],
  solarpower:['Force Soleil','Attaque Spéciale augmentée de +30%.'],
  intimidate:['Intimidation','Réduit l\'Attaque ennemie de 25% au combat.'],
  lightningrod:['Paratonnerre','Immunité Électrik, Atk Spéciale +25%.'],
  sandveil:['Voile Sable','Esquive augmentée de +20%.'],
  poisonpoint:['Point Poison','25% de chance d\'empoisonner au contact.'],
  magicguard:['Garde Magik','Immunisé aux dégâts de statut et indirects.'],
  hugepower:['Coloforce','La statistique d\'Attaque physique augmente de +60% !'],
  sturdy:['Fermeté','Réduit les dégâts subis de 15% et bloque le K.O. direct.'],
  levitate:['Lévitation','Immunisé contre les attaques Sol.'],
  guts:['Cran','Attaque augmentée de +50% en cas d\'altération de statut.'],
  adaptability:['Adaptabilité','Le bonus de type du lanceur (STAB) passe à x2.0 !'],
  thickfat:['Isograisse','Dégâts subis des capacités Feu et Glace réduits de 50%.'],
  multiscale:['Multiécaille','Dégâts subis réduits de 50% quand les PV sont au maximum.'],
  compoundeyes:['Œil Composé','La précision de toutes les attaques augmente de +30%.'],
  speedboost:['Turbo','La Vitesse augmente de +15% à chaque tour.'],
  naturalcure:['Médic Nature','Soigne automatiquement les statuts à la fin du combat.'],
  serenegrace:['Sérénité','Chances d\'effets secondaires des capacités doublées.'],
  clearbody:['Corps Sain','Immunisé contre les baisses de statistiques ennemies.'],
  roughskin:['Peau Dure','L\'adversaire subit 12% de ses PV max lorsqu\'il attaque.'],
  regenerator:['Régé-Force','Restaure 25% des PV au début ou à la fin d\'un combat.'],
  sniper:['Sniper','Les coups critiques infligent des dégâts multipliés par 2.25.'],
  technician:['Technicien','Les capacités de puissance <= 60 infligent +50% de dégâts.'],
  noguard:['Annule Garde','Toutes les attaques du lanceur et de la cible réussissent toujours.'],
  static:['Statik','25% de chance de paralyser l\'assaillant.'],
  hydratation:['Hydratation','Empêche les altérations de statut sous la pluie.'],
  snowcloak:['Rideau Neige','Esquive augmentée de +20%.'],
  grabguard:['Garde Lutte','Réduit de moitié les dégâts des capacités de type Combat.'],
  waterguard:['Garde Eau','Réduit de moitié les dégâts des capacités de type Eau.'],
  flameguard:['Garde Feu','Réduit de moitié les dégâts des capacités de type Feu.'],
  curseguard:['Garde Malédiction','Réduit de moitié les dégâts des capacités de type Spectre.'],
  poisonguard:['Garde Poison','Réduit de moitié les dégâts des capacités de type Poison.'],
  iceguard:['Garde Glace','Réduit de moitié les dégâts des capacités de type Glace.'],
  psychicguard:['Garde Psy','Réduit de moitié les dégâts des capacités de type Psy.'],
  fairyguard:['Garde Fée','Réduit de moitié les dégâts des capacités de type Fée.'],
  leafguard:['Garde Feuille','Réduit de moitié les dégâts des capacités de type Plante.'],
  plainguard:['Garde Normale','Réduit de moitié les dégâts des capacités de type Normal.'],
  sinisterguard:['Garde Obscure','Réduit de moitié les dégâts des capacités de type Ténèbres.'],
  steelguard:['Garde Acier','Réduit de moitié les dégâts des capacités de type Acier.'],
  dragonguard:['Garde Dragon','Réduit de moitié les dégâts des capacités de type Dragon.'],
  bugguard:['Garde Insecte','Réduit de moitié les dégâts des capacités de type Insecte.'],
  rockguard:['Garde Roche','Réduit de moitié les dégâts des capacités de type Roche.'],
  groundguard:['Garde Terre','Réduit de moitié les dégâts des capacités de type Sol.'],
  flyingguard:['Garde Céleste','Réduit de moitié les dégâts des capacités de type Vol.'],
  insomnia:['Insomnia','Immunisé contre le sommeil.'],
  immunity:['Vaccin','Immunisé contre le poison.'],
  limber:['Échauffement','Immunisé contre la paralysie.'],
  owntempo:['Tempo Perso','Immunisé contre la confusion.'],
  magmaarmor:['Armumagma','Immunisé contre le gel.'],
  waterveil:['Ignifu-Voile','Immunisé contre la brûlure.'],
  marvelscale:['Écaille Spéciale','Défense +50% en cas d\'altération de statut.'],
  livingshield:['Égide Vivante','Défense Spéciale +50% en cas d\'altération de statut.'],
  swarm:['Essaim','Attaques Insecte +35% de dégâts si PV < 35%.'],
  bastion:['Bastion','Attaques Acier +35% de dégâts si PV < 35%.'],
  average:['Normalité','Attaques Normal +35% de dégâts si PV < 35%.'],
  resolve:['Bravoure','Attaques Combat +35% de dégâts si PV < 35%.'],
  mistify:['Mystique','Attaques Psy +35% de dégâts si PV < 35%.'],
  hexerei:['Sortilège','Attaques Spectre +35% de dégâts si PV < 35%.'],
  glimmer:['Lueur','Attaques Fée +35% de dégâts si PV < 35%.'],
  skyward:['Ascension','Attaques Vol +35% de dégâts si PV < 35%.'],
  draconic:['Draconique','Attaques Dragon +35% de dégâts si PV < 35%.'],
  noxious:['Toxique','Attaques Poison +35% de dégâts si PV < 35%.'],
  solid:['Robustesse','Attaques Roche +35% de dégâts si PV < 35%.'],
  rime:['Givre','Attaques Glace +35% de dégâts si PV < 35%.'],
  voltage:['Tension','Attaques Électrik +35% de dégâts si PV < 35%.'],
  hypercutter:['Hyper Cutter','L\'Attaque ne peut pas être baissée.'],
  bigpecks:['Cœur de Coq','La Défense ne peut pas être baissée.'],
  wonderskin:['Peau Miracle','50% de chance que les altérations de statut reçues échouent.'],
  synchronize:['Synchro','Renvoie à l\'attaquant l\'altération de statut reçue.'],
  icebody:['Corps Gel','Défense +50% sous la grêle.'],
  raindish:['Cuvette','Attaque Spéciale +50% sous la pluie.'],
  sandforce:['Force Sable','Attaque +50% sous la tempête de sable.'],
  flamebody:['Corps Ardent','15% de chance de brûler au contact.'],
  strangecharm:['Charme Étrange','15% de chance de rendre confus au contact.'],
  effectspore:['Pose Spore','5% de chance d\'infliger sommeil, poison ou paralysie au contact.'],
  glacialbody:['Corps Glacé','5% de chance de geler au contact.'],
  scrappy:['Querelleur','Peut toucher les types Spectre avec des capacités Normal et Combat.'],
  unaware:['Inconscient','En attaquant, ignore les changements de stats de la cible.'],
  voltabsorb:['Volt Absorbeur','Annule les capacités Électrik reçues et soigne 25% des PV max.'],
  waterabsorb:['Absorb Eau','Annule les capacités Eau reçues et soigne 25% des PV max.'],
  flareabsorb:['Absorb Feu','Annule les capacités Feu reçues et soigne 25% des PV max.'],
  curseabsorb:['Absorb Spectre','Annule les capacités Spectre reçues et soigne 25% des PV max.'],
  poisonabsorb:['Absorb Poison','Annule les capacités Poison reçues et soigne 25% des PV max.'],
  frostabsorb:['Absorb Glace','Annule les capacités Glace reçues et soigne 25% des PV max.'],
  psychicabsorb:['Absorb Psy','Annule les capacités Psy reçues et soigne 25% des PV max.'],
  lightabsorb:['Absorb Fée','Annule les capacités Fée reçues et soigne 25% des PV max.'],
  growthabsorb:['Absorb Plante','Annule les capacités Plante reçues et soigne 25% des PV max.'],
  strongjaw:['Prognathe','Les capacités « Croc » ont leur puissance de base doublée.'],
  toughclaws:['Griffe Dure','Les capacités « Griffe » ont leur puissance de base doublée.'],
  ironfist:['Poing de Fer','Les capacités « Poing » ont leur puissance de base x1.5.'],
  rivalry:['Rivalité','Dégâts x1.5 quand l\'adversaire partage un type.'],
  pickpocket:['Pickpocket','Augmente de 1% le poids des butins rares (cumulable). Fonctionne toujours, pour tous.'],
  brittlearmor:['Armure Fragile','Attaque Spéciale +50% en cas d\'altération de statut.'],
  grassypelt:['Fourrure Herbe','Empêche baisses de stats et altérations sous le Champ Herbu.'],
  sandypelt:['Fourrure Sable','Empêche baisses de stats et altérations sous la tempête de sable.'],
  icypelt:['Fourrure Givre','Empêche baisses de stats et altérations sous la grêle.'],
  moistpelt:['Fourrure Humide','Empêche baisses de stats et altérations sous la pluie.'],
  fierypelt:['Fourrure Braise','Empêche baisses de stats et altérations sous le soleil.'],
  pixiepelt:['Fourrure Féerique','Empêche baisses de stats et altérations sous le Champ Psychique.'],
  blackpelt:['Fourrure Sombre','Empêche baisses de stats et altérations sous le Champ Sombre.'],
  spikypelt:['Fourrure Électrik','Empêche baisses de stats et altérations sous le Champ Électrifié.'],
  climatact:['Climatact','La météo invoquée par le lanceur dure 15 tours de plus.'],
  intangible:['Intangible','Vitesse +50% sous le Champ Sombre.'],
  hyperconductor:['Hyperconducteur','Vitesse +50% sous le Champ Électrifié.'],
  faerush:['Ruée Fée','Vitesse +50% sous le Champ Brumeux.'],
  moltshed:['Mue','Vitesse +50% sous le soleil.'],
  slushrush:['Chasse-Neige','Vitesse +50% sous la grêle.'],
  swiftswim:['Glissade','Vitesse +50% sous la pluie.'],
  sandrush:['Rush Sable','Vitesse +50% sous la tempête de sable.'],
  dauntinglook:['Regard Intimidant','Baisse l\'Attaque Spéciale ennemie de 50% à son entrée au combat.'],
  unburden:['Délestage','Vitesse +50% si aucun objet tenu.'],
  moxie:['Impudence','Attaque +50% après avoir mis K.O. un Pokémon.'],
  strategist:['Stratège','Attaque Spéciale +50% après avoir mis K.O. un Pokémon.'],
  sheerforce:['Sans Limite','Les effets secondaires positifs des capacités offensives sont supprimés et leurs dégâts x1.25.'],
  ambidextrous:['Ambidextre','Puissance croisée +0.3.'],
  skilllink:['Multi-Coups','Les capacités à plusieurs coups atteignent toujours leur maximum.'],
  sharpness:['Incisif','Les capacités « Lame » ont leur puissance de base x1.5.'],
  angerpoint:['Colérique','Attaque +100% quand touché par une capacité super efficace.'],
  justified:['Justicier','Attaque Spéciale +100% quand touché par une capacité super efficace.'],
  filter:['Filtre','Les dégâts super efficaces subis sont réduits de moitié.'],
  reckless:['Téméraire','Les capacités plus lentes que la normale ont leur puissance de base x1.5.'],
  libero:['Libéro','Les capacités plus rapides que la normale ont leur puissance de base x2.'],
  flashelectro:['Flash Électro','Annule les capacités Électrik reçues et Vitesse +50% après en avoir reçu une.'],
  flashaqua:['Flash Aqua','Annule les capacités Eau reçues et Vitesse +50% après en avoir reçu une.'],
  flashpyro:['Flash Pyro','Annule les capacités Feu reçues et Vitesse +50% après en avoir reçu une.'],
  flashumbra:['Flash Ombre','Annule les capacités Spectre reçues et Vitesse +50% après en avoir reçu une.'],
  flashvenum:['Flash Venin','Annule les capacités Poison reçues et Vitesse +50% après en avoir reçu une.'],
  flashcryo:['Flash Cryo','Annule les capacités Glace reçues et Vitesse +50% après en avoir reçu une.'],
  flashpsycha:['Flash Psy','Annule les capacités Psy reçues et Vitesse +50% après en avoir reçu une.'],
  flashfae:['Flash Fée','Annule les capacités Fée reçues et Vitesse +50% après en avoir reçu une.'],
  flashherba:['Flash Herba','Annule les capacités Plante reçues et Vitesse +50% après en avoir reçu une.'],
  stoned:['Minéral','Les boosts de stats positifs durent 3 fois plus longtemps.'],
  powerofalchemy:['Pouvoir Alchimique','Le lanceur obtient temporairement le talent (non caché) du dernier Pokémon de l\'équipe mis K.O., en plus des siens. Un second talent temporaire remplace le premier.'],
  stamina:['Endurance','Dégâts de fatigue subis réduits de moitié.'],
  gooey:['Poisseux','Baisse la Vitesse ennemie de 50% quand le lanceur est touché.'],
  flowerveil:['Garde Fleur','Empêche toute l\'équipe de subir des baisses de stats.'],
  aromaveil:['Aroma-Voile','Empêche toute l\'équipe d\'être entravée (provocation, tourmente…).'],
  sweetveil:['Gluco-Voile','Empêche toute l\'équipe de s\'endormir.'],
  pastelveil:['Pastel-Voile','Empêche toute l\'équipe d\'être empoisonnée.'],
  shieldsdown:['Bouclier-Carré','Les dégâts super efficaces subis deviennent neutres.'],
  colorspore:['Spore Couleur','Les altérations de statut infligées à la cible durent 3 fois plus longtemps.'],
  merciless:['Cruauté','Dégâts x1.5 si la cible a une altération de statut.'],
  costar:['Partenaire','Quand un allié augmente une stat, le lanceur l\'imite.'],
  purifyingsalt:['Sel Purifiant','Dégâts des capacités Spectre réduits de 25% (cumulable). Fonctionne toujours, pour tous.'],
  treasureofruin:['Trésor du Fléau','Puissance croisée +0.5.'],
  thousandarms:['Mille Bras','Toutes les attaques deviennent super efficaces, quel que soit le type.'],
  goodasgold:['Corps en Or','+15% de chance de rencontrer un Pokémon sauvage chromatique. Fonctionne toujours, pour tous.'],
  wonderguard:['Garde Mystère','Dégâts subis des capacités non super efficaces réduits de 80%.'],
  tintedlens:['Lentiteintée','Les capacités résistées par le type infligent des dégâts normaux.'],
  prankster:['Farceur','Les capacités Spectre et Ténèbres s\'exécutent 1.5 fois plus vite.'],
  galewings:['Ailes Bourrasque','Les capacités Vol et Insecte s\'exécutent 1.5 fois plus vite.'],
  neuroforce:['Neuroforce','Les capacités Psy et Fée s\'exécutent 1.5 fois plus vite.'],
  scorch:['Incendie','Les dégâts de brûlure sur la durée de l\'ennemi sont doublés tant que le lanceur est actif.'],
  corrosion:['Corrosion','Les dégâts de poison sur la durée de l\'ennemi sont doublés tant que le lanceur est actif.'],
  dancer:['Danseur','Les capacités « Danse » s\'exécutent deux fois plus vite.'],
  cacophony:['Cacophonie','Les capacités « Son » s\'exécutent deux fois plus vite.'],
  windrider:['Aéroporté','Les capacités « Vent » s\'exécutent deux fois plus vite.'],
  iaido:['Iaïdo','Les capacités « Lame » s\'exécutent deux fois plus vite.'],
  megalauncher:['Mégavore','Les capacités « Pulsaire » ont leur puissance de base x1.5.'],
  metalhead:['Tête de Métal','Les capacités « Tête » ont leur puissance de base x1.5.'],
  imposter:['Morphing','Copie les augmentations de stats positives de l\'ennemi.'],
  toxicboost:['Rage Poison','Dégâts infligés x1.2 en cas d\'empoisonnement, et annule ses dégâts sur la durée.'],
  flareboost:['Rage Brûlure','Dégâts infligés x1.2 en cas de brûlure, et annule ses dégâts sur la durée.'],
  fullmetalbody:['Métalloprotection','Empêche toute baisse de stats.'],
  supremeoverlord:['Général Suprême','Dégâts infligés x1.15 par membre de l\'équipe mis K.O.'],
  gorillatactics:['Entêtement Gorille','Attaque x1.5, mais empêche le changement de Pokémon.'],
  beastboost:['Boost Chimère','La stat la plus élevée du lanceur +50% après avoir mis K.O. un Pokémon.'],
  quarkdrive:['Charge Quark','La stat la plus élevée du lanceur +50% sous le Champ Électrifié.'],
  protosynthesis:['Paléosynthèse','La stat la plus élevée du lanceur +50% sous le soleil.'],
  drizzle:['Crachin','Invoque la pluie en entrant au combat.'],
  drought:['Sécheresse','Invoque le soleil en entrant au combat.'],
  sandstream:['Sable Volant','Invoque une tempête de sable en entrant au combat.'],
  snowwarning:['Alerte Neige','Invoque la grêle en entrant au combat.'],
  somberfield:['Champ Sombre','Invoque le Champ Sombre en entrant au combat.'],
  electricsurge:['Créa-Élec','Active un Champ Électrifié en entrant au combat.'],
  grassysurge:['Créa-Herbe','Active un Champ Herbu en entrant au combat.'],
  mistysurge:['Créa-Brume','Active un Champ Brumeux en entrant au combat.'],
  contrary:['Contestataire','Inverse les changements de stats : les hausses deviennent baisses et inversement.'],
  protean:['Protéen','Le type du lanceur devient celui de la capacité utilisée.'],
  simple:['Simple','Les changements de stats du lanceur sont amplifiés d\'un cran.'],
  parentalbond:['Amour Filial','Les capacités sont exécutées une seconde fois à demi-puissance.'],
  moody:['Lunatique','Chaque tour, monte deux stats de 100% pour un tour.'],
  darkaura:['Aura Sombre','Puissance des capacités Ténèbres de toute l\'équipe x1.1.'],
  soulasterism:['Astre d\'Âmes','Dégâts des capacités Spectre de toute l\'équipe x1.1.'],
  normalize:['Normalise','Toutes les capacités deviennent Normal, puissance x1.3.'],
  ferrilate:['Ferrisation','Les capacités Normal deviennent Acier, puissance x1.3.'],
  glaciate:['Réfrigération','Les capacités Normal deviennent Glace, puissance x1.3.'],
  terralate:['Terrisation','Les capacités Normal deviennent Sol, puissance x1.3.'],
  toxilate:['Toxisation','Les capacités Normal deviennent Poison, puissance x1.3.'],
  hydrolate:['Hydrisation','Les capacités Normal deviennent Eau, puissance x1.3.'],
  pyrolate:['Pyrisation','Les capacités Normal deviennent Feu, puissance x1.3.'],
  chrysilate:['Chrysalisation','Les capacités Normal deviennent Insecte, puissance x1.3.'],
  galvanize:['Galvanisation','Les capacités Normal deviennent Électrik, puissance x1.3.'],
  gloomilate:['Obscurisation','Les capacités Normal deviennent Ténèbres, puissance x1.3.'],
  espilate:['Psychisation','Les capacités Normal deviennent Psy, puissance x1.3.'],
  aerilate:['Aérisation','Les capacités Normal deviennent Vol, puissance x1.3.'],
  pixilate:['Pixilisation','Les capacités Normal deviennent Fée, puissance x1.3.'],
  verdify:['Verdification','Les capacités Normal deviennent Plante, puissance x1.3.'],
  dragonmaw:['Mâchoire Draco','Les capacités Normal deviennent Dragon, puissance x1.3.'],
};

// ——— Réparations des descriptions ANGLAISES tronquées (locale en + talents-full) ———
const EN_FIX = {
  hydratation:'Prevents negative status effects while on rainy weather',
  sandveil:'Increases evasion by 20%',
  snowcloak:'Increases evasion by 20%',
  insomnia:'Grants immunity to sleep',
  immunity:'Grants immunity to poison',
  limber:'Grants immunity to paralysis',
  owntempo:'Grants immunity to confusion',
  magmaarmor:'Grants immunity to freeze',
  waterveil:'Grants immunity to burn',
  solarpower:'Increases Special Attack by 50% on sunny weather',
  icebody:'Increases Defense by 50% on hail weather',
  raindish:'Increases Special Attack by 50% on rainy weather',
  sandforce:'Increases Attack by 50% on sandstorm weather',
  static:'15% chance to inflict paralysis when attacked',
  flamebody:'15% chance to inflict burn when attacked',
  poisonpoint:'15% chance to inflict poison when attacked',
  strangecharm:'15% chance to inflict confusion when attacked',
  effectspore:'5% chance to inflict sleep, poison or paralysis when attacked',
  glacialbody:'5% chance to inflict freeze when attacked',
  chlorophyll:'Increases Speed by 50% on sunny weather',
  grassypelt:'Prevents negative stat changes and status effects while on grassy terrain',
  sandypelt:'Prevents negative stat changes and status effects while on sandstorm weather',
  icypelt:'Prevents negative stat changes and status effects while on hail weather',
  moistpelt:'Prevents negative stat changes and status effects while on rainy weather',
  fierypelt:'Prevents negative stat changes and status effects while on sunny weather',
  pixiepelt:'Prevents negative stat changes and status effects while on psychic terrain',
  blackpelt:'Prevents negative stat changes and status effects while on somber field',
  spikypelt:'Prevents negative stat changes and status effects while on electric terrain',
  intangible:'Increases Speed by 50% on somber field',
  hyperconductor:'Increases Speed by 50% on electric terrain',
  faerush:'Increases Speed by 50% on misty terrain',
  moltshed:'Increases Speed by 50% on sunny weather',
  slushrush:'Increases Speed by 50% on hail weather',
  swiftswim:'Increases Speed by 50% on rainy weather',
  sandrush:'Increases Speed by 50% on sandstorm weather',
  scorch:'Enemy damage over time from burn is doubled while this Pokemon is active',
  corrosion:'Enemy damage over time from poison is doubled while this Pokemon is active',
  protosynthesis:'Increases the highest stat of the user by 50% on sunny weather',
  quarkdrive:'Increases the highest stat of the user by 50% on electric terrain',
  drizzle:'Changes the weather to rain when entering or switching into the battle',
  drought:'Changes the weather to sun when entering or switching into the battle',
  sandstream:'Changes the weather to sandstorm when entering or switching into the battle',
  snowwarning:'Changes the weather to hail when entering or switching into the battle',
  somberfield:'Changes the weather to somber field when entering or switching into the battle',
  electricsurge:'Changes the field to electric terrain when entering or switching into the battle',
  grassysurge:'Changes the field to grassy terrain when entering or switching into the battle',
  mistysurge:'Changes the field to misty terrain when entering or switching into the battle',
};

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// ——— 1) Locale FR : régénération complète (ordre du fichier existant conservé) ———
{
  const path = new URL('../src/localization/fr/talents.js', import.meta.url);
  const src = readFileSync(path, 'utf8');
  const order = [...src.matchAll(/"(\w+)":\s*\{/g)].map((m) => m[1]);
  const missing = order.filter((k) => !FR[k]);
  if (missing.length) throw new Error('Clés FR non traduites: ' + missing.join(','));
  const extra = Object.keys(FR).filter((k) => !order.includes(k));
  if (extra.length) console.log('⚠ clés table FR absentes du fichier (ignorées):', extra.join(','));
  const body = order.map((k) => `  "${k}": {\n    "name": "${esc(FR[k][0])}",\n    "desc": "${esc(FR[k][1])}"\n  }`).join(',\n');
  writeFileSync(path, `// ===== FR — Ability (talent) names & descriptions =====\n// Passe 24 : régénéré par tools/gen_talent_locales.mjs — 100 % français.\nwindow.L_fr_talents = {\n${body}\n};\n`);
  console.log(`fr/talents.js : ${order.length} entrées réécrites (100 % FR)`);
}

// ——— 2) Locale EN : répare UNIQUEMENT les descriptions tronquées ———
{
  const path = new URL('../src/localization/en/talents.js', import.meta.url);
  let src = readFileSync(path, 'utf8');
  let n = 0;
  for (const [k, desc] of Object.entries(EN_FIX)) {
    const re = new RegExp(`("${k}":\\s*\\{\\s*"name":\\s*"((?:[^"\\\\]|\\\\.)*)",\\s*"desc":\\s*")((?:[^"\\\\]|\\\\.)*)(")`, '');
    if (re.test(src)) { src = src.replace(re, `$1${desc}$4`); n++; }
  }
  // Double espaces résiduels dans les descriptions
  src = src.replace(/"desc": "([^"]*?) {2,}([^"]*?)"/g, (w, a, b) => `"desc": "${a} ${b}"`);
  writeFileSync(path, src);
  console.log(`en/talents.js : ${n} descriptions réparées`);
}

// ——— 3) talents-full.js : répare les infos tronquées à la source ———
{
  const path = new URL('../src/data/talents-full.js', import.meta.url);
  let src = readFileSync(path, 'utf8');
  let n = 0;
  for (const [k, info] of Object.entries(EN_FIX)) {
    const re = new RegExp(`(\\n  ${k}:\\s*\\{\\s*name:\\s*'[^']*',\\s*rarity:\\s*\\d,\\s*info:\\s*')((?:[^'\\\\\\\\]|\\\\\\\\.)*)(')`, '');
    if (re.test(src)) { src = src.replace(re, `$1${info}$3`); n++; }
    else console.log('  (info talents-full introuvable pour', k + ')');
  }
  writeFileSync(path, src);
  console.log(`talents-full.js : ${n} infos réparées`);
}

