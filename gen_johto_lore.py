# Ajoute STORY_LORE pour les lieux Johto (game-data.js) - approche par index
p='src/scripts/data/game-data.js'
s=open(p,encoding='utf-8').read()

new_lore='''
  newbark: {speaker_fr:"Prof. Orme", speaker_en:"Prof. Elm", text_fr:"Bourg Geonif, où tout commence. Le Prof. Orme étudie la reproduction des Pokémon.", text_en:"New Bark Town, where it all begins. Prof. Elm studies Pokémon breeding."},
  cherrygrove: {speaker_fr:"Mme. Jo", speaker_en:"Ms. Jo", text_fr:"Ville Griotte : la première ville des dresseurs de Johto, bercée par la mer.", text_en:"Cherrygrove City: Johto's first trainers' town, by the sea."},
  violet: {speaker_fr:"Albert (Falkner)", speaker_en:"Falkner", text_fr:"Mauville, ville des vents. Mon arène Vol teste l'agilité !", text_en:"Violet City of winds. My Flying Gym tests agility!"},
  azalea: {speaker_fr:"Bourg Écorcia", speaker_en:"Azalea Town", text_fr:"Écorcia, nichée dans les buissons. La Team Rocket rôde près du Puits Spinarak.", text_en:"Azalea, nested in the bushes. Team Rocket lurks near Slowpoke Well."},
  goldenrod: {speaker_fr:"Maï", speaker_en:"Whitney", text_fr:"Doublonville, la métropole animée ! Son Grand Magasin a de tout.", text_en:"Goldenrod, the bustling metropolis! Its Dept. Store has it all."},
  ecruteak: {speaker_fr:"Moine Morten", speaker_en:"Monk Morten", text_fr:"Rosalia abrite deux tours : l'une brûlée, l'autre dorée.", text_en:"Ecruteak holds two towers: one burned, one golden."},
  olivine: {speaker_fr:"Jasmine", speaker_en:"Jasmine", text_fr:"Oliville, port bercé par les vagues. Mon Flotajou est souffrant...", text_en:"Olivine, port town by the waves. My Ampharos is ailing..."},
  cianwood: {speaker_fr:"Chuck", speaker_en:"Chuck", text_fr:"Irisia, île des vagues et des poings. Mon corps est un temple !", text_en:"Cianwood, isle of waves and fists. My body is a temple!"},
  mahogany: {speaker_fr:"Frédo (Pryce)", speaker_en:"Pryce", text_fr:"Acajou, ville des neiges. Le Lac Colère bouillonne d'étrange.", text_en:"Mahogany, city of snow. Lake Rage boils with something strange."},
  blackthorn: {speaker_fr:"Sandra (Clair)", speaker_en:"Clair", text_fr:"Ébénelle, cité des dragons. Ma famille veille sur eux.", text_en:"Blackthorn, city of dragons. My family guards them."},
  jroute29: {speaker_fr:"Route 29", speaker_en:"Route 29", text_fr:"Douce route bordée de prés. Les jeunes Pokémon y gambadent.", text_en:"Gentle meadow road. Young Pokémon frolic here."},
  jroute30: {speaker_fr:"Route 30", speaker_en:"Route 30", text_fr:"La Route 30 mène aux ruines. On dit qu'un prof y vécut jadis.", text_en:"Route 30 leads to ruins. A professor once lived here."},
  jroute31: {speaker_fr:"Route 31", speaker_en:"Route 31", text_fr:"Sombre et boisée. La Tour Chétiflor se dresse au bout.", text_en:"Dark, wooded road. Sprout Tower stands at its end."},
  jroute32: {speaker_fr:"Route 32", speaker_en:"Route 32", text_fr:"Route escarpée vers les Caves Jumelles et le Puits Spinarak.", text_en:"Steep road to Union Cave and Slowpoke Well."},
  jroute34: {speaker_fr:"Route 34", speaker_en:"Route 34", text_fr:"Route paisible menant au Parc National et à Doublonville.", text_en:"Peaceful road to National Park and Goldenrod."},
  jroute35: {speaker_fr:"Route 35", speaker_en:"Route 35", text_fr:"La Route 35 rejoint le Parc National, paradis des baies.", text_en:"Route 35 meets National Park, berry paradise."},
  jroute36: {speaker_fr:"Route 36", speaker_en:"Route 36", text_fr:"Route 36 : on y soigne les Roussillets à la laiterie.", text_en:"Route 36: Miltank are tended at the dairy."},
  jroute38: {speaker_fr:"Route 38", speaker_en:"Route 38", text_fr:"Les fermes d'Oliville. Les Roussillets paissent en paix.", text_en:"Olivine's farms. Miltank graze in peace."},
  jroute40: {speaker_fr:"Chenal 40", speaker_en:"Sea Route 40", text_fr:"La mer lie Oliville à Irisia. Embarque, marin !", text_en:"The sea links Olivine to Cianwood. Set sail!"},
  jroute42: {speaker_fr:"Route 42", speaker_en:"Route 42", text_fr:"Route sauvage menant au Mt. Mortar. Une brume y rôde.", text_en:"Wild road to Mt. Mortar. A mist lingers."},
  jroute44: {speaker_fr:"Route 44 / Glace", speaker_en:"Route 44 / Ice", text_fr:"Route enneigée vers Ébénelle. Une lueur pourpre y fuit.", text_en:"Snowy road to Blackthorn. A purple gleam flees."},
  jroute45: {speaker_fr:"Route 45", speaker_en:"Route 45", text_fr:"Route rocailleuse au Mont Argent. Les dragons y rugissent.", text_en:"Rocky road to Mt. Silver. Dragons roar."},
  jroute28: {speaker_fr:"Route 28", speaker_en:"Route 28", text_fr:"Route 28 vers le Mont Argent, gardien des secrets anciens.", text_en:"Route 28 to Mt. Silver, keeper of ancient secrets."},
  nationalpark: {speaker_fr:"Gardien du Parc", speaker_en:"Park Ranger", text_fr:"Le Parc National : concours de pêche et rencontres rares !", text_en:"National Park: fishing contests and rare encounters!"},
  sprouttower: {speaker_fr:"Moine Bao", speaker_en:"Monk Bao", text_fr:"La Tour Chétiflor plie mais ne rompt jamais.", text_en:"Sprout Tower bends but never breaks."},
  ruinsofalph: {speaker_fr:"Archéologue Solène", speaker_en:"Archaeologist Solène", text_fr:"Les Ruines d'Alpha cachent un alphabet perdu et des mystères.", text_en:"Ruins of Alph hide a lost alphabet and mysteries."},
  burnedtower: {speaker_fr:"Esprit de la Tour", speaker_en:"Tower Spirit", text_fr:"Jadis incendiée, trois flammes y renaîtront en Bêtes Légendaires.", text_en:"Once burned, three flames shall return as Legendary Beasts."},
  tintower: {speaker_fr:"Gardien des Ailes", speaker_en:"Wing Guardian", text_fr:"La Tour Cendrée attend le héros des Bêtes pour faire venir Ho-Oh.", text_en:"The Tin Tower awaits the Beasts' hero to summon Ho-Oh."},
  slowpokewell: {speaker_fr:"Ancien de Écorcia", speaker_en:"Azalea Elder", text_fr:"Le Puits Spinarak fut pollué par la Team Rocket.", text_en:"Slowpoke Well was polluted by Team Rocket."},
  unioncave: {speaker_fr:"Spécialiste Évoli", speaker_en:"Eevee Specialist", text_fr:"Les Caves Jumelles regorgent d'évolutions surprenantes.", text_en:"Union Cave teems with surprising evolutions."},
  mtmortar: {speaker_fr:"Ermite des Chutes", speaker_en:"Waterfall Hermit", text_fr:"Le Mt. Mortar cache une grotte où Crocrodil évolue.", text_en:"Mt. Mortar hides a cave where Croconaw evolves."},
  icepath: {speaker_fr:"Guide de Glace", speaker_en:"Ice Guide", text_fr:"Le Chemin Glace relie Acajou à Ébénelle par le froid.", text_en:"Ice Path links Mahogany and Blackthorn through cold."},
  darkcave: {speaker_fr:"Exploratrice Noa", speaker_en:"Explorer Noa", text_fr:"La Grotte Obscure, labyrinthe sans lumière.", text_en:"Dark Cave, a maze without light."},
  whirlislands: {speaker_fr:"Vieux Pêcheur", speaker_en:"Old Fisher", text_fr:"Aux Îles Whirl sommeille Lugia, gardien des mers.", text_en:"In the Whirl Islands sleeps Lugia, guardian of the sea."},
  lakerage: {speaker_fr:"Pêcheur Requin", speaker_en:"Fisherman Requin", text_fr:"Le Lac Colère rougeoie : un Gyarados mutant y vit.", text_en:"Lake Rage glows red: a mutated Gyarados dwells here."},
  victoryroad_jo: {speaker_fr:"Gardien de la Victoire", speaker_en:"Victory Guard", text_fr:"La Route Victoire sépare les champions du reste.", text_en:"Victory Road separates champions from the rest."},
  mtsilver: {speaker_fr:"Légende du Mont", speaker_en:"Mount Legend", text_fr:"Au sommet veille Tyranocif, tyran de roc et d'ombre.", text_en:"Atop waits Tyranitar, tyrant of rock and shadow."},
  tohjofalls: {speaker_fr:"Esprit des Chutes", speaker_en:"Falls Spirit", text_fr:"La Cascade Tohjo marque la fin du voyage Johto.", text_en:"Tohjo Falls marks the end of the Johto journey."},
  indigo_jo: {speaker_fr:"Champion en titre", speaker_en:"Reigning Champion", text_fr:"Le Plateau Indigo couronne les maîtres de Johto.", text_en:"Indigo Plateau crowns Johto's masters."},
  ilexforest: {speaker_fr:"Protecteur du Bois", speaker_en:"Forest Warden", text_fr:"Le Bois aux Chênes abrite Celebi, Pokémon du Temps.", text_en:"Ilex Forest shelters Celebi, the Time Pokémon."}'''

idx_p = s.index('var POKE_TALENTS = {')
idx_close = s.rfind('};', 0, idx_p)
assert idx_close != -1, "STORY_LORE close introuvable"
s = s[:idx_close] + "\n" + new_lore + "\n};" + s[idx_close+2:]
open(p,'w',encoding='utf-8').write(s)
print("STORY_LORE Johto OK")
