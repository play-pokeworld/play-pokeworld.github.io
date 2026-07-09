# Ajoute quêtes secondaires + répétables + PNJ (dialogues) Johto dans quest-data.js
p='src/scripts/data/quest-data.js'
s=open(p,encoding='utf-8').read()

# ---- SIDE QUESTS ----
a_side='rewardDesc_en:"2,400₽ + 4 Rare Candies"}\n};'
assert a_side in s, "anchor SIDE introuvable"
new_side='''  s30:{id:'s30', region:'johto', title_fr:"La Team Rocket à Acajou", title_en:"Team Rocket at Mahogany",
    desc_fr:"Le Scientifique Pierre-Jean traque la Team Rocket : remportez 10 combats à Acajou !", desc_en:"Scientist Pierre-Jean hunts Team Rocket: win 10 battles at Mahogany!",
    type:"defeat_wild", loc:"mahogany", target:10, rewardMoney:2500, rewardItems:{up_grade:1}, rewardDesc_fr:"2 500₽ + Upgrade", rewardDesc_en:"2,500₽ + Up-Grade"},
  s31:{id:'s31', region:'johto', title_fr:"Le Gyarados Rouge", title_en:"The Red Gyarados",
    desc_fr:"Le Pêcheur Requin traque le Lac Colère : 8 victoires !", desc_en:"Fisherman Requin hunts Lake Rage: 8 wins!",
    type:"defeat_wild", loc:"lakerage", target:8, rewardMoney:2000, rewardItems:{dragon_fang:1}, rewardDesc_fr:"2 000₽ + Crocdure", rewardDesc_en:"2,000₽ + Dragon Fang"},
  s32:{id:'s32', region:'johto', title_fr:"La Tour Radio", title_en:"The Radio Tower",
    desc_fr:"La Reporter Nina couvre Doublonville : 10 victoires !", desc_en:"Reporter Nina covers Goldenrod: 10 wins!",
    type:"defeat_wild", loc:"goldenrod", target:10, rewardMoney:2200, rewardItems:{rarecandy:2}, rewardDesc_fr:"2 200₽ + 2 Super Bonbons", rewardDesc_en:"2,200₽ + 2 Rare Candies"},
  s33:{id:'s33', region:'johto', title_fr:"Les Évolutions des Caves Jumelles", title_en:"Union Cave Evolutions",
    desc_fr:"Le Spécialiste Évoli explore les Caves Jumelles : 10 victoires !", desc_en:"Eevee Specialist explores Union Cave: 10 wins!",
    type:"defeat_wild", loc:"unioncave", target:10, rewardMoney:2000, rewardItems:{kings_rock:1}, rewardDesc_fr:"2 000₽ + Rocher Royal", rewardDesc_en:"2,000₽ + King's Rock"},
  s34:{id:'s34', region:'johto', title_fr:"Le Dresseur de la Route 30", title_en:"Route 30 Trainer",
    desc_fr:"Le Jeune Hugo défie la Route 30 : 12 victoires !", desc_en:"Young Hugo challenges Route 30: 12 wins!",
    type:"defeat_wild", loc:"jroute30", target:12, rewardMoney:1800, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"1 800₽ + 5 Baies Sitrus", rewardDesc_en:"1,800₽ + 5 Sitrus Berries"},
  s35:{id:'s35', region:'johto', title_fr:"Le Garde-Fort d'Écorcia", title_en:"Azalea's Fort Guard",
    desc_fr:"Le Garde Boris surveille Écorcia : 10 victoires !", desc_en:"Guard Boris watches Azalea: 10 wins!",
    type:"defeat_wild", loc:"azalea", target:10, rewardMoney:2000, rewardItems:{spell_tag:1}, rewardDesc_fr:"2 000₽ + Etiquette Maléfique", rewardDesc_en:"2,000₽ + Spell Tag"},
  s36:{id:'s36', region:'johto', title_fr:"Collectionneuse de Doublonville", title_en:"Goldenrod Collector",
    desc_fr:"La Collectionneuse Églantine veut 8 espèces : capturez-les !", desc_en:"Collector Églantine wants 8 species: catch them!",
    type:"catch", target:8, rewardMoney:2600, rewardItems:{life_orb:1}, rewardDesc_fr:"2 600₽ + Orbe Vie", rewardDesc_en:"2,600₽ + Life Orb"},
  s37:{id:'s37', region:'johto', title_fr:"Le Spécialiste de la Route 35", title_en:"Route 35 Specialist",
    desc_fr:"Le Dresseur Marius arpente la Route 35 : 12 victoires !", desc_en:"Trainer Marius patrols Route 35: 12 wins!",
    type:"defeat_wild", loc:"jroute35", target:12, rewardMoney:2200, rewardItems:{miracle_seed:1}, rewardDesc_fr:"2 200₽ + Graine Miracle", rewardDesc_en:"2,200₽ + Miracle Seed"},
  s38:{id:'s38', region:'johto', title_fr:"Le Marin d'Oliville", title_en:"Olivine Sailor",
    desc_fr:"Le Marin Joachim surveille Oliville : 10 victoires !", desc_en:"Sailor Joachim watches Olivine: 10 wins!",
    type:"defeat_wild", loc:"olivine", target:10, rewardMoney:2000, rewardItems:{mystic_water:1}, rewardDesc_fr:"2 000₽ + Eau Mystique", rewardDesc_en:"2,000₽ + Mystic Water"},
  s39:{id:'s39', region:'johto', title_fr:"Le Maître de la Tour Chétiflor", title_en:"Sprout Tower Master",
    desc_fr:"Le Moine Bao teste les initiés : 8 victoires à la Tour Chétiflor !", desc_en:"Monk Bao tests initiates: 8 wins at Sprout Tower!",
    type:"defeat_wild", loc:"sprouttower", target:8, rewardMoney:1500, rewardItems:{twisted_spoon:1}, rewardDesc_fr:"1 500₽ + Cuillère Tordue", rewardDesc_en:"1,500₽ + Twisted Spoon"},
  s40:{id:'s40', region:'johto', title_fr:"Le Mythe des Ruines d'Alpha", title_en:"Ruins of Alph Myth",
    desc_fr:"L'Archéologue Solène décrypte les Ruines d'Alpha : 8 victoires !", desc_en:"Archaeologist Solène decodes Ruins of Alph: 8 wins!",
    type:"defeat_wild", loc:"ruinsofalph", target:8, rewardMoney:1800, rewardItems:{rarecandy:3}, rewardDesc_fr:"1 800₽ + 3 Super Bonbons", rewardDesc_en:"1,800₽ + 3 Rare Candies"}'''
s=s.replace(a_side, a_side[:-3] + new_side + "\n};", 1)

# ---- REPEATABLE QUESTS ----
a_rep='rewardDesc_en:"2,000₽"}\n];'
assert a_rep in s, "anchor REPEAT introuvable"
new_rep='''  r30:{id:'r30', icon:'🌿', title_fr:"Patrouille Route 29", title_en:"Route 29 Patrol",
   desc_fr:"Remportez 15 combats sauvages sur la Route 29.", desc_en:"Win 15 wild battles on Route 29.",
   type:"defeat_wild", loc:"jroute29", target:15, rewardMoney:0, rewardItems:{berry_oran:5}, rewardDesc_fr:"5 Baies Oran", rewardDesc_en:"5 Oran Berries"},
  r31:{id:'r31', icon:'💧', title_fr:"Patrouille Route 34", title_en:"Route 34 Patrol",
   desc_fr:"Remportez 20 combats sauvages sur la Route 34.", desc_en:"Win 20 wild battles on Route 34.",
   type:"defeat_wild", loc:"jroute34", target:20, rewardMoney:0, rewardItems:{mystic_water:1}, rewardDesc_fr:"1 Eau Mystique", rewardDesc_en:"1 Mystic Water"},
  r32:{id:'r32', icon:'🐲', title_fr:"Patrouille Route 45", title_en:"Route 45 Patrol",
   desc_fr:"Remportez 20 combats sauvages sur la Route 45.", desc_en:"Win 20 wild battles on Route 45.",
   type:"defeat_wild", loc:"jroute45", target:20, rewardMoney:0, rewardItems:{dragon_fang:1}, rewardDesc_fr:"1 Crocdure", rewardDesc_en:"1 Dragon Fang"},
  r33:{id:'r33', icon:'🧺', title_fr:"Chasseur de Baies Johto", title_en:"Johto Berry Hunter",
   desc_fr:"Capturez 10 Pokémon en Johto.", desc_en:"Catch 10 Pokémon in Johto.",
   type:"catch", target:10, rewardMoney:1500, rewardDesc_fr:"1 500₽", rewardDesc_en:"1,500₽"},
  r34:{id:'r34', icon:'🌑', title_fr:"Grotte Obscure", title_en:"Dark Cave Patrol",
   desc_fr:"Remportez 12 combats dans la Grotte Obscure.", desc_en:"Win 12 battles in Dark Cave.",
   type:"defeat_wild", loc:"darkcave", target:12, rewardMoney:0, rewardItems:{kings_rock:1}, rewardDesc_fr:"1 Rocher Royal", rewardDesc_en:"1 King's Rock"},
  r35:{id:'r35', icon:'🌳', title_fr:"Bois aux Chênes", title_en:"Ilex Forest Patrol",
   desc_fr:"Remportez 15 combats dans le Bois aux Chênes.", desc_en:"Win 15 battles in Ilex Forest.",
   type:"defeat_wild", loc:"ilexforest", target:15, rewardMoney:0, rewardItems:{miracle_seed:1}, rewardDesc_fr:"1 Graine Miracle", rewardDesc_en:"1 Miracle Seed"},
  r36:{id:'r36', icon:'🎣', title_fr:"Pêcheur du Chenal 40", title_en:"Route 40 Angler",
   desc_fr:"Remportez 15 combats sur le Chenal 40.", desc_en:"Win 15 battles on Sea Route 40.",
   type:"defeat_wild", loc:"jroute40", target:15, rewardMoney:0, rewardItems:{mystic_water:1}, rewardDesc_fr:"1 Eau Mystique", rewardDesc_en:"1 Mystic Water"},
  r37:{id:'r37', icon:'📚', title_fr:"Collecteur Johto", title_en:"Johto Collector",
   desc_fr:"Capturez 12 Pokémon différents.", desc_en:"Catch 12 different Pokémon.",
   type:"catch", target:12, rewardMoney:2000, rewardItems:{rarecandy:2}, rewardDesc_fr:"2 000₽ + 2 Super Bonbons", rewardDesc_en:"2,000₽ + 2 Rare Candies"},
  r38:{id:'r38', icon:'⛏️', title_fr:"Mineur d'Acajou", title_en:"Mahogany Miner",
   desc_fr:"Vendez 6 trésors à la mine.", desc_en:"Sell 6 treasures underground.",
   type:"mine_sell", target:6, rewardMoney:2000, rewardDesc_fr:"2 000₽", rewardDesc_en:"2,000₽"}'''
s=s.replace(a_rep, a_rep[:-3] + new_rep + "\n];", 1)

# ---- NPCS (dialogues Johto) ----
import re
m=re.search(r"(\n  ecruteak:\[[\s\S]*?\n  \])\n\};", s)
assert m, "anchor NPCS introuvable"
new_npcs=''',
  cherrygrove:[
    {name:'Mme. Jo', lines_fr:["Bienvenue à Ville Griotte !","C'est ici que tout a commencé pour bien des dresseurs."], lines_en:["Welcome to Cherrygrove City!","This is where many trainers began."]}
  ],
  violet:[
    {name:'Guide de l'Arène', lines_fr:["Albert (Falkner) domine le ciel avec ses oiseaux !","Vaincs-le pour le Badge Zéphyr."], lines_en:["Falkner rules the sky with his birds!","Beat him for the Zephyr Badge."], board:true}
  ],
  azalea:[
    {name:'Garde Boris', lines_fr:["La Team Rocket rôde près du Puits Spinarak...","Montre-leur de quoi tu es capable !"], lines_en:["Team Rocket lurks near Slowpoke Well...","Show them what you've got!"], quest:'s35'}
  ],
  goldenrod:[
    {name:'Reporter Nina', lines_fr:["Le Grand Magasin est le plus grand de Johto !","La Tour Radio diffuse nos infos."], lines_en:["The Dept. Store is Johto's biggest!","The Radio Tower broadcasts our news."], quest:'s32'},
    {name:'Collectionneuse Églantine', lines_fr:["Complète mon Pokédex, attrape-les pour moi !"], lines_en:["Complete my Pokédex, catch them for me!"], quest:'s36'}
  ],
  cianwood:[
    {name:'Maître Chuck', lines_fr:["Mon corps est un temple du combat !","Échauffe-toi avant notre combat."], lines_en:["My body is a temple of battle!","Warm up before our fight."], board:true}
  ],
  mahogany:[
    {name:'Scientifique Pierre-Jean', lines_fr:["La Team Rocket a corrompu le Lac Colère !","Aide-moi à les arrêter."], lines_en:["Team Rocket corrupted Lake Rage!","Help me stop them."], quest:'s30'}
  ],
  lakerage:[
    {name:'Pêcheur Requin', lines_fr:["Un Gyarados ROUGE hante ces eaux...","Affronte-le si tu l'oses !"], lines_en:["A RED Gyarados haunts these waters...","Face it if you dare!"], quest:'s31'}
  ],
  jroute29:[
    {name:'Cueilleur Tom', lines_fr:["La Route 29 regorge de jeunes Pokémon.","Patrouille-la pour t'entraîner !"], lines_en:["Route 29 is full of young Pokémon.","Patrol it to train!"], board:true}
  ],
  jroute30:[
    {name:'Jeune Hugo', lines_fr:["Je m'entraîne sur cette route !","Vaincs 12 Pokémon et je te respecterai."], lines_en:["I train on this route!","Beat 12 Pokémon and I'll respect you."], quest:'s34'}
  ],
  jroute35:[
    {name:'Dresseur Marius', lines_fr:["La Route 35 mène au Parc National.","Bats-toi, ça forge le caractère !"], lines_en:["Route 35 leads to National Park.","Fight, it builds character!"], quest:'s37'}
  ],
  jroute38:[
    {name:'Fermière Anna', lines_fr:["Les Roussillets paissent près d'Oliville.","Fais attention aux rencontres !"], lines_en:["Miltank graze near Olivine.","Mind the encounters!"], board:true}
  ],
  jroute40:[
    {name:'Pêcheur Joachim', lines_fr:["Le Chenal 40 relie Oliville à Irisia.","Pêche la victoire !"], lines_en:["Sea Route 40 links Olivine to Cianwood.","Fish for victory!"], board:true}
  ],
  jroute42:[
    {name:'Rôdeur Masqué', lines_fr:["J'ai aperçu une créature aux reflets d'eau...","Suicune, peut-être ?"], lines_en:["I saw a watery creature gliding by...","Suicune, perhaps?"], board:true}
  ],
  jroute44:[
    {name:'Vieux Trappeur', lines_fr:["Une lueur pourpre a fendu la neige.","Raikou, la Bête Foudre..."], lines_en:["A purple gleam split the snow.","Raikou, the Thunder Beast..."], board:true}
  ],
  jroute45:[
    {name:'Maître Draco', lines_fr:["Les dragons rugissent au Mont Argent.","Ébénelle est proche !"], lines_en:["Dragons roar at Mt. Silver.","Blackthorn is near!"], board:true}
  ],
  jroute28:[
    {name:'Explorateur Sol', lines_fr:["Le Mont Argent garde des secrets anciens.","Une chaleur volunte s'en dégage..."], lines_en:["Mt. Silver hides ancient secrets.","A volcanic warmth emanates..."], board:true}
  ],
  nationalpark:[
    {name:'Gardien du Parc', lines_fr:["Le Parc National accueille le Concours de Pêche !","Capture le plus gros Pokémon !"], lines_en:["National Park hosts the Fishing Contest!","Catch the biggest Pokémon!"], board:true}
  ],
  sprouttower:[
    {name:'Moine Bao', lines_fr:["La Tour Chétiflor endure l'épreuve du vent.","Prouve ta patience !"], lines_en:["Sprout Tower endures the wind's trial.","Prove your patience!"], quest:'s39'}
  ],
  ruinsofalph:[
    {name:'Archéologue Solène', lines_fr:["Ces ruines cachent un alphabet ancien.","Les Pokémon fabuleux y veillent..."], lines_en:["These ruins hide an ancient alphabet.","Mythical Pokémon watch over them..."], quest:'s40'}
  ],
  burnedtower:[
    {name:'Esprit de la Tour', lines_fr:["Trois flammes s'élevèrent jadis...","Raikou, Entei, Suicune — les Bêtes renaîtront."], lines_en:["Three flames once rose here...","Raikou, Entei, Suicune — the Beasts shall return."]}
  ],
  tintower:[
    {name:'Gardien des Ailes', lines_fr:["La Tour Cendrée attend celui qui a dompté les Bêtes.","Ho-Oh descendra du ciel doré."], lines_en:["The Tin Tower awaits who tamed the Beasts.","Ho-Oh shall descend from the golden sky."]}
  ],
  slowpokewell:[
    {name:'Ancien de Écorcia', lines_fr:["Le Puits Spinarak fut profané par la Team Rocket.","Les Spinarak souffrent..."], lines_en:["Slowpoke Well was defiled by Team Rocket.","The Slowpoke suffer..."], board:true}
  ],
  unioncave:[
    {name:'Spécialiste Évoli', lines_fr:["Les Caves Jumelles regorgent d'évolutions.","Combats-y pour progresser !"], lines_en:["Union Cave teems with evolutions.","Battle to grow!"], quest:'s33'}
  ],
  mtmortar:[
    {name:'Ermite des Chutes', lines_fr:["Le Mt. Mortar cache une grotte aux évolutions.","Tout au fond, un Pokémon vous attend."], lines_en:["Mt. Mortar hides an evolution cave.","At the end, a Pokémon awaits."], board:true}
  ],
  icepath:[
    {name:'Guide de Glace', lines_fr:["Le Chemin Glace sépare Acajou d'Ébénelle.","Glisse sans te blesser !"], lines_en:["Ice Path splits Mahogany and Blackthorn.","Slide without harm!"], board:true}
  ],
  darkcave:[
    {name:'Exploratrice Noa', lines_fr:["La Grotte Obscure est un labyrinthe.","Mes torches guident tes pas."], lines_en:["Dark Cave is a maze.","My torches guide your steps."], board:true}
  ],
  whirlislands:[
    {name:'Vieux Pêcheur', lines_fr:["Au plus profond des Îles Whirl sommeille Lugia.","Écoute le chant des abîmes."], lines_en:["Deep in the Whirl Islands sleeps Lugia.","Listen to the abyss's song."]}
  ],
  victoryroad_jo:[
    {name:'Gardien de la Victoire', lines_fr:["La Route Victoire sépare les champions du reste.","Prouve ta valeur !"], lines_en:["Victory Road separates champions from the rest.","Prove your worth!"], board:true}
  ],
  mtsilver:[
    {name:'Légende du Mont', lines_fr:["Au sommet veille un Pokémon de roc et d'ombre.","Tyranocif, le tyran."], lines_en:["Atop waits a rock-and-shadow Pokémon.","Tyranitar, the tyrant."], board:true}
  ],
  tohjofalls:[
    {name:'Esprit des Chutes', lines_fr:["La Cascade Tohjo lie Johto au reste du monde.","Le voyage continue..."], lines_en:["Tohjo Falls links Johto to the wider world.","The journey continues..."], board:true}
  ],
  ilexforest:[
    {name:'Protecteur du Bois', lines_fr:["Le Bois aux Chênes abrite Celebi, le Pokémon du Temps.","Patiente, voyageur."], lines_en:["Ilex Forest shelters Celebi, the Time Pokémon.","Be patient, traveler."], board:true}
  ],
  indigo_jo:[
    {name:'Champion en titre', lines_fr:["Le Plateau Indigo couronne les maîtres de Johto.","As-tu les 8 Badges ?"], lines_en:["Indigo Plateau crowns Johto's masters.","Do you hold all 8 Badges?"], board:true}
  ]'''
s=s.replace(m.group(0), m.group(1) + "," + new_npcs + "\n};", 1)

open(p,'w',encoding='utf-8').write(s)
print("quest-data.js: side + repeat + NPCS Johto OK")
