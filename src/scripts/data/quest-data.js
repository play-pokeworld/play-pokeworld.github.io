// ============================================================
// QUEST DATA — definitions only (no logic).
// Déclarées APRÈS game-data.js (STORY_QUESTS y est défini).
// ============================================================

// ============================================================
// QUEST SYSTEM — PokéClicker style (main / side / repeatable)
// Plusieurs quêtes actives en même temps, PNJ dans les villes,
// quêtes principales octroyées à la 1ʳᵉ visite d'une carte,
// quêtes secondaires via PNJ, quêtes répétables (menu accept/roll).
// ============================================================

// --- Déclencheur (carte) de chaque quête PRINCIPALE (octroyée à 1ʳᵉ visite) ---
var QUEST_TRIGGERS = {
  0:'pallet', 1:'pewter', 2:'route3', 3:'cerulean', 4:'route11', 5:'vermilion',
  6:'vermilion', 7:'lavender', 8:'celadon', 9:'fuchsia', 10:'saffron',
  11:'cinnabar', 12:'viridian', 13:'indigo', 14:'seafoamislands', 15:'powerplant',
  16:'victoryroad', 17:'pokemonmansion', 18:'ceruleancave', 19:'safarizone',
  // Johto
  20:'newbark', 21:'violet', 22:'azalea', 23:'goldenrod', 24:'ecruteak',
  25:'cianwood', 26:'olivine', 27:'mahogany', 28:'blackthorn',
  30:'pallet', 31:'newbark'
};

// --- Quêtes principales de Johto (ajoutées à la chaîne Kanto existante) ---
STORY_QUESTS.push(
  {id:20, title_fr:"21. L'Appel de Johto — Bourg Geonif", title_en:"21. Johto's Call — New Bark",
   desc_fr:"Bienvenue en Johto ! Parlez au Prof. Orme à Bourg Geonif puis remportez 3 combats sauvages pour débuter.",
   desc_en:"Welcome to Johto! Visit Prof. Elm in New Bark, then win 3 wild battles to begin.",
   type:"defeat_wild", loc:"newbark", target:3, rewardMoney:500, rewardItems:{berry_oran:5}, rewardDesc_fr:"500₽ + 5 Baies Oran", rewardDesc_en:"500₽ + 5 Oran Berries"},
  {id:21, title_fr:"22. L'Épreuve d'Argenta (Johto)", title_en:"22. Violet's Flying Trial",
   desc_fr:"Rendez-vous à Argenta et défiez Albert (Falkner) dans son arène Vol pour le Badge Zéphyr !",
   desc_en:"Travel to Violet City and challenge Falkner at his Flying Gym for the Zephyr Badge!",
   type:"badge", targetBadge:"falkner", target:1, rewardMoney:1000, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"1 000₽ + 5 Baies Sitrus", rewardDesc_en:"1,000₽ + 5 Sitrus Berries"},
  {id:22, title_fr:"23. La Forêt d'Écorcia", title_en:"23. Azalea's Bug Trial",
   desc_fr:"À Écorcia, triomphez d'Hector (Bugsy) pour le Badge Essaim !",
   desc_en:"In Azalea Town, defeat Bugsy to claim the Hive Badge!",
   type:"badge", targetBadge:"bugsy", target:1, rewardMoney:1500, rewardItems:{muscle_band:1}, rewardDesc_fr:"1 500₽ + Bandeau Muscle", rewardDesc_en:"1,500₽ + Muscle Band"},
  {id:23, title_fr:"24. La Plaine de Doublonville", title_en:"24. Goldenrod's Plain Trial",
   desc_fr:"À Doublonville, battez Blanche (Whitney) pour le Badge Plaine !",
   desc_en:"In Goldenrod City, defeat Whitney for the Plain Badge!",
   type:"badge", targetBadge:"whitney", target:1, rewardMoney:2000, rewardItems:{soft_sand:1}, rewardDesc_fr:"2 000₽ + Sable Doux", rewardDesc_en:"2,000₽ + Soft Sand"},
  {id:24, title_fr:"25. La Brume d'Ébénelle", title_en:"25. Ecruteak's Fog Trial",
   desc_fr:"À Rosalia, vainquez Mortimer (Morty) pour le Badge Brume !",
   desc_en:"In Ecruteak City, defeat Morty for the Fog Badge!",
   type:"badge", targetBadge:"morty", target:1, rewardMoney:2500, rewardItems:{choice_scarf:1}, rewardDesc_fr:"2 500₽ + Mouchoir Choix", rewardDesc_en:"2,500₽ + Choice Scarf"},
  {id:25, title_fr:"26. Le Choc d'Irisia", title_en:"26. Cianwood's Storm Trial",
   desc_fr:"Sur l'Île d'Irisia, battez Chuck pour le Badge Choc !",
   desc_en:"On Cianwood Island, defeat Chuck for the Storm Badge!",
   type:"badge", targetBadge:"chuck", target:1, rewardMoney:3000, rewardItems:{power_gem:1}, rewardDesc_fr:"3 000₽ + Joyau Pouvoir", rewardDesc_en:"3,000₽ + Power Gem"},
  {id:26, title_fr:"27. Le Minéral d'Oliville", title_en:"27. Olivine's Mineral Trial",
   desc_fr:"À Oliville, triomphez de Jasmine pour le Badge Minéral !",
   desc_en:"In Olivine City, defeat Jasmine for the Mineral Badge!",
   type:"badge", targetBadge:"jasmine", target:1, rewardMoney:3500, rewardItems:{leftovers:1}, rewardDesc_fr:"3 500₽ + Restes", rewardDesc_en:"3,500₽ + Leftovers"},
  {id:27, title_fr:"28. Le Glacier d'Acajou", title_en:"28. Mahogany's Glacier Trial",
   desc_fr:"À Acajou, vainquez Frédo (Pryce) pour le Badge Glacier !",
   desc_en:"In Mahogany Town, defeat Pryce for the Glacier Badge!",
   type:"badge", targetBadge:"pryce", target:1, rewardMoney:4000, rewardItems:{choice_specs:1}, rewardDesc_fr:"4 000₽ + Lunettes Choix", rewardDesc_en:"4,000₽ + Choice Specs"},
  {id:28, title_fr:"29. Le Lever d'Ébénelle", title_en:"29. Blackthorn's Rising Trial",
   desc_fr:"À Ébénelle, affrontez Sandra (Clair) pour le Badge Lever et devenir Maître de Johto !",
   desc_en:"In Blackthorn City, challenge Clair for the Rising Badge and become Johto Champion!",
   type:"badge", targetBadge:"clair", target:1, rewardMoney:8000, rewardItems:{choice_band:1, rarecandy:5}, rewardDesc_fr:"8 000₽ + Bandeau Choix + 5 Super Bonbons", rewardDesc_en:"8,000₽ + Choice Band + 5 Rare Candies"}
);

// --- Quêtes SECONDAIRES (proposées par les PNJ) ---
var SIDE_QUESTS = {
  s1:{id:'s1', region:'kanto', title_fr:"Le Collectionneur de Baies", title_en:"The Berry Collector",
    desc_fr:"Le Jeune Régis veut voir vos talents : vainquez 10 Pokémon sauvages sur la Route 1.",
    desc_en:"Young Régis wants to see your skill: defeat 10 wild Pokémon on Road 1.",
    type:"defeat_wild", loc:"route1", target:10, rewardMoney:800, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"800₽ + 5 Baies Sitrus", rewardDesc_en:"800₽ + 5 Sitrus Berries"},
  s2:{id:'s2', region:'kanto', title_fr:"Apprenti Dresseur", title_en:"Apprentice Trainer",
    desc_fr:"Le Dresseur Red vous met au défi : remportez 15 combats sur la Route 2.",
    desc_en:"Trainer Red challenges you: win 15 battles on Road 2.",
    type:"defeat_wild", loc:"route2", target:15, rewardMoney:1200, rewardItems:{berry_prine:5}, rewardDesc_fr:"1 200₽ + 5 Baies Prine", rewardDesc_en:"1,200₽ + 5 Prine Berries"},
  s3:{id:'s3', region:'kanto', title_fr:"Chercheur de Pierres", title_en:"Stone Seeker",
    desc_fr:"Le Pokémaniac Pierre vous envoie au Mont Sélénite : vainquez 12 Pokémon pour une Pierre Lune.",
    desc_en:"Pokémaniac Pierre sends you to Mt. Moon: defeat 12 Pokémon for a Moon Stone.",
    type:"defeat_wild", loc:"mtmoon", target:12, rewardMoney:1500, rewardItems:{moonstone:1}, rewardDesc_fr:"1 500₽ + 1 Pierre Lune", rewardDesc_en:"1,500₽ + 1 Moon Stone"},
  s4:{id:'s4', region:'kanto', title_fr:"Marin de Carmin", title_en:"Vermilion Sailor",
    desc_fr:"Le Marin Brie veut des trésors : vendez 5 objets de la mine.",
    desc_en:"Sailor Brie wants treasure: sell 5 mined items.",
    type:"mine_sell", target:5, rewardMoney:1500, rewardItems:{nugget:1}, rewardDesc_fr:"1 500₽ + 1 Pépite", rewardDesc_en:"1,500₽ + 1 Nugget"},
  s5:{id:'s5', region:'kanto', title_fr:"Gardiens de la Tour", title_en:"Tower Guardians",
    desc_fr:"La Channeler Lila vous demande : vainquez 12 Pokémon à la Tour Pokémon.",
    desc_en:"Channeler Lila asks: defeat 12 Pokémon at Pokémon Tower.",
    type:"defeat_wild", loc:"pokemontower", target:12, rewardMoney:2000, rewardItems:{rarecandy:3}, rewardDesc_fr:"2 000₽ + 3 Super Bonbons", rewardDesc_en:"2,000₽ + 3 Rare Candies"},
  s6:{id:'s6', region:'kanto', title_fr:"Vendeur de Céladopole", title_en:"Celadon Salesman",
    desc_fr:"Le Vendeur Marco veut agrandir sa collection : capturez 8 Pokémon différents.",
    desc_en:"Salesman Marco wants to expand his collection: catch 8 different Pokémon.",
    type:"catch", target:8, rewardMoney:2500, rewardItems:{leafstone:1}, rewardDesc_fr:"2 500₽ + 1 Pierre Plante", rewardDesc_en:"2,500₽ + 1 Leaf Stone"},
  s7:{id:'s7', region:'kanto', title_fr:"Dresseur de Parmanie", title_en:"Fuchsia Trainer",
    desc_fr:"La Dresseuse Nina vous défie sur la Route 19 : 12 victoires !",
    desc_en:"Trainer Nina challenges you on Road 19: 12 wins!",
    type:"defeat_wild", loc:"route19", target:12, rewardMoney:2000, rewardItems:{leftovers:1}, rewardDesc_fr:"2 000₽ + Restes", rewardDesc_en:"2,000₽ + Leftovers"},
  s8:{id:'s8', region:'kanto', title_fr:"Scientifique de Cramois'île", title_en:"Cinnabar Scientist",
    desc_fr:"La Scientifique Aria explore le Manoir : vainquez 12 Pokémon pour une Pierre Feu.",
    desc_en:"Scientist Aria explores the Mansion: defeat 12 Pokémon for a Fire Stone.",
    type:"defeat_wild", loc:"pokemonmansion", target:12, rewardMoney:2500, rewardItems:{firestone:1}, rewardDesc_fr:"2 500₽ + 1 Pierre Feu", rewardDesc_en:"2,500₽ + 1 Fire Stone"},
  s9:{id:'s9', region:'johto', title_fr:"Gardien d'Oliville", title_en:"Olivine Guard",
    desc_fr:"Le Gardien Olaf surveille la Route 38/39 : 10 victoires !",
    desc_en:"Guard Olaf watches Road 38/39: 10 wins!",
    type:"defeat_wild", loc:"jroute38", target:10, rewardMoney:2000, rewardItems:{berry_oran:10}, rewardDesc_fr:"2 000₽ + 10 Baies Oran", rewardDesc_en:"2,000₽ + 10 Oran Berries"},
  s10:{id:'s10', region:'johto', title_fr:"Maître Draco d'Ébénelle", title_en:"Blackthorn's Dragon Master",
    desc_fr:"Le Maître Draco vous met à l'épreuve sur la Route 45 : 10 victoires !",
    desc_en:"Dragon Master tests you on Road 45: 10 wins!",
    type:"defeat_wild", loc:"jroute45", target:10, rewardMoney:2500, rewardItems:{rarecandy:2}, rewardDesc_fr:"2 500₽ + 2 Super Bonbons", rewardDesc_en:"2,500₽ + 2 Rare Candies"},
  s11:{id:'s11', region:'kanto', title_fr:"Gardien de Jadielle", title_en:"Viridian Guardian",
    desc_fr:"Le Gardien Jo défie les newcomers : remportez 12 combats sauvages sur la Route 22 !",
    desc_en:"Guard Jo challenges newcomers: win 12 wild battles on Road 22!",
    type:"defeat_wild", loc:"route22", target:12, rewardMoney:1800, rewardItems:{berry_ceriz:5}, rewardDesc_fr:"1 800₽ + 5 Baies Ceriz", rewardDesc_en:"1,800₽ + 5 Cheri Berries"},
  s12:{id:'s12', region:'kanto', title_fr:"Chercheuse d'Azuria", title_en:"Cerulean Researcher",
    desc_fr:"La Chercheuse Lys traque les Pokémon rares : remportez 12 combats sur la Route 9 !",
    desc_en:"Researcher Lys tracks rare Pokémon: win 12 battles on Road 9!",
    type:"defeat_wild", loc:"route9", target:12, rewardMoney:2200, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"2 200₽ + 5 Baies Sitrus", rewardDesc_en:"2,200₽ + 5 Sitrus Berries"},
  s13:{id:'s13', region:'kanto', title_fr:"Collectionneuse de Céladopole", title_en:"Celadon Collector",
    desc_fr:"La Collectionneuse Mia veut compléter son Pokédex : capturez 10 Pokémon différents !",
    desc_en:"Collector Mia wants to complete her Pokédex: catch 10 different Pokémon!",
    type:"catch", target:10, rewardMoney:2600, rewardItems:{leafstone:1, life_orb:1}, rewardDesc_fr:"2 600₽ + Pierre Plante + Orbe Vie", rewardDesc_en:"2,600₽ + Leaf Stone + Life Orb"},
  s14:{id:'s14', region:'kanto', title_fr:"Dresseur de Carmin", title_en:"Vermilion Fighter",
    desc_fr:"Le Dresseur Ken surveille la Route 11 : 12 victoires sauvages !",
    desc_en:"Fighter Ken watches Road 11: 12 wild wins!",
    type:"defeat_wild", loc:"route11", target:12, rewardMoney:2400, rewardItems:{thunderstone:1}, rewardDesc_fr:"2 400₽ + 1 Pierre Foudre", rewardDesc_en:"2,400₽ + 1 Thunder Stone"},
  s15:{id:'s15', region:'kanto', title_fr:"Gardien de Lavanville", title_en:"Lavender Watcher",
    desc_fr:"Le Gardien Tom arpente la Route 12 : remportez 12 combats sauvages !",
    desc_en:"Watcher Tom patrols Road 12: win 12 wild battles!",
    type:"defeat_wild", loc:"route12", target:12, rewardMoney:2400, rewardItems:{rarecandy:4}, rewardDesc_fr:"2 400₽ + 4 Super Bonbons", rewardDesc_en:"2,400₽ + 4 Rare Candies"}
};
// --- Quêtes RÉPÉTABLES (menu accept/roll façon PokéClicker) ---
var REPEATABLE_QUESTS = [
  {id:'r1', icon:'💎', title_fr:"Chasseur de Trésors", title_en:"Treasure Hunter",
   desc_fr:"Vendez 5 trésors déterrés à la mine.", desc_en:"Sell 5 treasures mined underground.",
   type:"mine_sell", target:5, rewardMoney:1000, rewardDesc_fr:"1 000₽", rewardDesc_en:"1,000₽"},
  {id:'r2', icon:'⚔️', title_fr:"Dresseur Itinérant", title_en:"Wandering Trainer",
   desc_fr:"Remportez 25 combats sauvages (n'importe où).", desc_en:"Win 25 wild battles (anywhere).",
   type:"defeat_wild", target:25, rewardMoney:0, rewardItems:{berry_prine:5}, rewardDesc_fr:"5 Baies Prine", rewardDesc_en:"5 Prine Berries"},
  {id:'r3', icon:'🔴', title_fr:"Collectionneur", title_en:"Collector",
   desc_fr:"Capturez 10 Pokémon (n'importe où).", desc_en:"Catch 10 Pokémon (anywhere).",
   type:"catch", target:10, rewardMoney:1500, rewardDesc_fr:"1 500₽", rewardDesc_en:"1,500₽"},
  {id:'r4', icon:'⛏️', title_fr:"Mineur Acharné", title_en:"Dedicated Miner",
   desc_fr:"Vendez 10 trésors à la mine.", desc_en:"Sell 10 treasures underground.",
   type:"mine_sell", target:10, rewardMoney:0, rewardItems:{rarecandy:1}, rewardDesc_fr:"1 Super Bonbon", rewardDesc_en:"1 Rare Candy"},
  {id:'r5', icon:'🌿', title_fr:"Explorateur Aguerri", title_en:"Seasoned Explorer",
   desc_fr:"Remportez 50 combats sauvages (n'importe où).", desc_en:"Win 50 wild battles (anywhere).",
   type:"defeat_wild", target:50, rewardMoney:0, rewardItems:{choice_scarf:1}, rewardDesc_fr:"1 Mouchoir Choix", rewardDesc_en:"1 Choice Scarf"},
  {id:'r6', icon:'💰', title_fr:"Vendeur d'Objets", title_en:"Item Vendor",
   desc_fr:"Vendez 8 trésors à la mine.", desc_en:"Sell 8 treasures underground.",
   type:"mine_sell", target:8, rewardMoney:2000, rewardDesc_fr:"2 000₽", rewardDesc_en:"2,000₽"}
];

// --- PNJ par ville (clic sur le marqueur 🗣 de la carte) ---
var NPCS = {
  pallet:[
    {name:'Prof. Chen', lines_fr:["Bienvenue dans PokéWorld, jeune dresseur !","Choisis un Pokémon de départ pour commencer ton aventure.","Les quêtes principales apparaissent selon tes explorations. Parle aux habitants des villes !"],
     lines_en:["Welcome to PokéWorld, young trainer!","Choose a starter Pokémon to begin your adventure.","Main quests appear as you explore. Talk to townsfolk!"], mainTalk:30},
    {name:'Jeune Régis', lines_fr:["Salut ! Je collectionne les baies.","Montre-moi ton talent sur la Route 1 !"], lines_en:["Hey! I collect berries.","Show me your skill on Road 1!"], quest:'s1'}
  ],
  viridian:[
    {name:'Dresseur Red', lines_fr:["La Route 2 regorge de Pokémon.","Veux-tu relever mon défi ?"], lines_en:["Road 2 is full of Pokémon.","Up for my challenge?"], quest:'s2'}
  ,
    {name:'Gardien Jo', lines_fr:["Bienvenue à Jadielle !","La Route 22 regorge de Pokémon sauvages.","Montre-moi de quoi tu es capable !"], lines_en:["Welcome to Viridian!","Road 22 is full of wild Pokémon.","Show me what you've got!"], quest:'s11'}],
  pewter:[
    {name:'Pokémaniac Pierre', lines_fr:["Le Mont Sélénite cache des Pierres Lune !","Vas-y, défie-toi !"], lines_en:["Mt. Moon hides Moon Stones!","Go test yourself!"], quest:'s3'}
  ],
  cerulean:[
    {name:'Nageuse Ondée', lines_fr:["Besoin de quêtes répétables ?","Ouvre le tableau des quêtes répétables, ça rapporte gros !"], lines_en:["Need repeatable quests?","Open the repeatable board, it pays well!"], board:true}
  ,
    {name:'Chercheuse Lys', lines_fr:["Je traque les Pokémon rares d'Azuria.","La Route 9 est mon terrain de chasse !","Vaincs-en 12 pour moi !"], lines_en:["I track Azuria's rare Pokémon.","Road 9 is my hunting ground!","Defeat 12 for me!"], quest:'s12'}],
  vermilion:[
    {name:'Marin Brie', lines_fr:["La mine regorge de trésors !","Vends-en et je te récompense."], lines_en:["The mine is full of treasure!","Sell some and I'll reward you."], quest:'s4'}
  ,
    {name:'Dresseur Ken', lines_fr:["La Route 11 est sous ma surveillance.","Prouve ta valeur : 12 victoires !","Allez, montre-toi !"], lines_en:["Road 11 is under my watch.","Prove your worth: 12 wins!","Come on, show yourself!"], quest:'s14'}],
  lavender:[
    {name:'Channeler Lila', lines_fr:["Les esprits de la Tour sont agités...","Aide-nous à les apaiser !"], lines_en:["The Tower's spirits are restless...","Help us calm them!"], quest:'s5'}
  ,
    {name:'Gardien Tom', lines_fr:["La Route 12 est paisible, mais peuplée.","Bats-toi et ramène-moi 12 victoires !","Les esprits t'observeront."], lines_en:["Road 12 is peaceful but crowded.","Fight and bring me 12 wins!","The spirits will watch."], quest:'s15'}],
  celadon:[
    {name:'Vendeur Marco', lines_fr:["Ma collection a besoin de nouveaux Pokémon !","Capture-les pour moi."], lines_en:["My collection needs new Pokémon!","Catch them for me."], quest:'s6'}
  ,
    {name:'Collectionneuse Mia', lines_fr:["Ma collection a besoin de nouveaux Pokémon !","Capture-les pour moi, s'il te plaît.","10 espèces différentes, ce serait parfait !"], lines_en:["My collection needs new Pokémon!","Catch them for me, please.","10 different species would be perfect!"], quest:'s13'}],
  fuchsia:[
    {name:'Dresseuse Nina', lines_fr:["La Route 19 est mon terrain de chasse.","Affronte-moi !"], lines_en:["Road 19 is my hunting ground.","Face me!"], quest:'s7'}
  ],
  saffron:[
    {name:'Infirmière Joy', lines_fr:["Blessé ? Mon Centre soigne ton équipe.","Au besoin, ouvre le tableau de quêtes répétables."], lines_en:["Hurt? My Center heals your team.","If needed, open the repeatable board."], board:true}
  ],
  cinnabar:[
    {name:'Scientifique Aria', lines_fr:["Le Manoir renferme d'étranges secrets...","Exploration garantie !"], lines_en:["The Mansion holds strange secrets...","Guaranteed exploration!"], quest:'s8'}
  ],
  newbark:[
    {name:'Prof. Orme', lines_fr:["Bienvenue en Johto !","L'aventure t'attend au bout de la Route 29."], lines_en:["Welcome to Johto!","Adventure awaits beyond Road 29."], mainTalk:31}
  ],
  olivine:[
    {name:'Gardien Olaf', lines_fr:["La Route 38/39 est sous ma surveillance.","Prouve ta valeur !"], lines_en:["I watch over Road 38/39.","Prove your worth!"], quest:'s9'},
    {name:'Capitaine', lines_fr:["Besoin d'argent facile ?","Ouvre le tableau des quêtes répétables."], lines_en:["Need easy money?","Open the repeatable board."], board:true}
  ],
  blackthorn:[
    {name:'Maître Draco', lines_fr:["La Route 45 est rude.","Montre-moi ce que tu vaux !"], lines_en:["Road 45 is harsh.","Show me what you've got!"], quest:'s10'}
  ],
  ecruteak:[
    {name:'Moine Morten', lines_fr:["La paix d'Ébénelle passe par l'entraînement.","Ouvre le tableau des quêtes répétables."], lines_en:["Ecruteak's peace comes through training.","Open the repeatable board."], board:true}
  ]
};
