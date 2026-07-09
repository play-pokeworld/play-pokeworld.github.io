const ITEMS = {
  // ---- Baies / Berries ----
  berry_oran:   {name_fr:'Baie Oran',   name_en:'Oran Berry',   icon:'🍇', desc_fr:'PV max +30 % au maximum (25/25).', desc_en:'Max HP +30% at max stack (25/25).', price:250,  buff:{hpMax:0.30}},
  berry_sitrus: {name_fr:'Baie Sitrus', name_en:'Sitrus Berry', icon:'🍊', desc_fr:'Attaque +25 % au maximum (25/25).', desc_en:'Attack +25% at max stack (25/25).', price:280,  buff:{atk:0.25}},
  berry_ceriz:  {name_fr:'Baie Ceriz',  name_en:'Cheri Berry',  icon:'🍒', desc_fr:'Vitesse +30 % au maximum (25/25).', desc_en:'Speed +30% at max stack (25/25).',  price:260,  buff:{spe:0.30}},
  berry_prine:  {name_fr:'Baie Prine',  name_en:'Lum Berry',    icon:'🫐', desc_fr:'Défense +25 % au maximum (25/25).', desc_en:'Defense +25% at max stack (25/25).', price:280,  buff:{def:0.25}},
  // ---- Objets compétitifs authentiques Pokémon ----
  leftovers:    {name_fr:'Restes',        name_en:'Leftovers',    icon:'🍎', desc_fr:'PV max +50 % au maximum (25/25).', desc_en:'Max HP +50% at max stack (25/25).', price:1000, buff:{hpMax:0.50}},
  choice_band:  {name_fr:'Bandeau Choix', name_en:'Choice Band',  icon:'🥋', desc_fr:'Attaque physique +50 % au maximum.', desc_en:'Physical Attack +50% at max stack.', price:1200, buff:{atk:0.50}},
  choice_specs: {name_fr:'Lunettes Choix',name_en:'Choice Specs', icon:'👓', desc_fr:'Attaque Spéciale +50 % au maximum.', desc_en:'Special Attack +50% at max stack.', price:1200, buff:{spa:0.50}},
  choice_scarf: {name_fr:'Mouchoir Choix',name_en:'Choice Scarf', icon:'🧣', desc_fr:'Vitesse +50 % au maximum (25/25).', desc_en:'Speed +50% at max stack (25/25).', price:1200, buff:{spe:0.50}},
  assault_vest: {name_fr:'Veste Combat',  name_en:'Assault Vest', icon:'🦺', desc_fr:'Défense Spéciale +50 % au maximum.', desc_en:'Special Defense +50% at max stack.', price:1200, buff:{spd:0.50}},
  eviolite:     {name_fr:'Évoluroc',      name_en:'Eviolite',     icon:'🔮', desc_fr:'Défense physique +50 % au maximum.', desc_en:'Physical Defense +50% at max stack.', price:1200, buff:{def:0.50}},
  life_orb:     {name_fr:'Orbe Vie',      name_en:'Life Orb',     icon:'🔮', desc_fr:'Attaque & Atk Spéciale +35 % au max.', desc_en:'Atk & Sp. Atk +35% at max stack.', price:1500, buff:{atk:0.35,spa:0.35}},
  swift_charm:  {name_fr:'Charme Rapide', name_en:'Swift Charm',  icon:'⚡', desc_fr:'Vitesse & PV max +30 % au maximum.', desc_en:'Speed & Max HP +30% at max stack.', price:1500, buff:{spe:0.30,hpMax:0.30}},
  // ---- Pierres d'évolution & Trésors ----
  firestone:    {name_fr:'Pierre Feu',    name_en:'Fire Stone',    icon:'🔥', desc_fr:'Fait évoluer certains Pokémon Feu.', desc_en:'Evolves certain Fire-type Pokémon.', price:2500, type:'stone'},
  waterstone:   {name_fr:'Pierre Eau',    name_en:'Water Stone',   icon:'💧', desc_fr:'Fait évoluer certains Pokémon Eau.', desc_en:'Evolves certain Water-type Pokémon.', price:2500, type:'stone'},
  thunderstone: {name_fr:'Pierre Foudre', name_en:'Thunder Stone', icon:'⚡', desc_fr:'Fait évoluer certains Pokémon Électrik.', desc_en:'Evolves certain Electric-type Pokémon.', price:2500, type:'stone'},
  leafstone:    {name_fr:'Pierre Plante', name_en:'Leaf Stone',    icon:'🌿', desc_fr:'Fait évoluer certains Pokémon Plante.', desc_en:'Evolves certain Grass-type Pokémon.', price:2500, type:'stone'},
  moonstone:    {name_fr:'Pierre Lune',   name_en:'Moon Stone',    icon:'🌙', desc_fr:'Fait évoluer certains Pokémon.', desc_en:'Evolves certain Pokémon.', price:3000, type:'stone'},
  nugget:       {name_fr:'Pépite',        name_en:'Nugget',        icon:'💰', desc_fr:'Objet précieux en or pur qui vaut 5 000₽.', desc_en:'Precious gold item worth 5,000₽.', price:5000, type:'treasure', value:5000},
  stardust:     {name_fr:'Poussière Étoile',name_en:'Stardust',    icon:'✨', desc_fr:'Poussière brillante qui vaut 2 000₽.', desc_en:'Lovely red dust worth 2,000₽.', price:2000, type:'treasure', value:2000},
  fossil:       {name_fr:'Fossile Ancien',name_en:'Old Fossil',    icon:'🦴', desc_fr:'Rare vestige — peut être ranimé à la Pension Fossile !', desc_en:'Ancient fossil — revive it at the Fossil Lab!', price:4000, type:'fossil', value:4000, revive:138},
  // ---- Fossiles PokéClicker ----
  helix_fossil: {name_fr:'Fossile Nautile', name_en:'Helix Fossil', icon:'🐚', desc_fr:'Fossile d\'Amonita. Ranime-le à la Pension Fossile !', desc_en:'Omanyte Fossil. Revive at Fossil Lab!', price:5000, type:'fossil', revive:138},
  dome_fossil:  {name_fr:'Fossile Dôme',    name_en:'Dome Fossil',  icon:'🪨', desc_fr:'Fossile de Kabuto. Ranime-le à la Pension Fossile !', desc_en:'Kabuto Fossil. Revive at Fossil Lab!', price:5000, type:'fossil', revive:140},
  old_amber:    {name_fr:'Vieil Ambre',     name_en:'Old Amber',    icon:'🟨', desc_fr:'Ambre contenant l\'ADN de Ptéra. Ranime-le !', desc_en:'Amber containing Aerodactyl DNA. Revive it!', price:8000, type:'fossil', revive:142},
  root_fossil:  {name_fr:'Fossile Racine',  name_en:'Root Fossil',  icon:'🌿', desc_fr:'Fossile Johto rare. Ranime un Pokémon plante préhistorique.', desc_en:'Rare Johto fossil.', price:6000, type:'fossil', revive:138},
  claw_fossil:  {name_fr:'Fossile Griffe',  name_en:'Claw Fossil',  icon:'🦞', desc_fr:'Fossile Johto rare. Ranime un Pokémon insecte préhistorique.', desc_en:'Rare Johto fossil.', price:6000, type:'fossil', revive:140},
  muscle_band:  {name_fr:'Bandeau Muscle', name_en:'Muscle Band',  icon:'💪', desc_fr:'Attaque physique +35 % au maximum.', desc_en:'Physical Attack +35% at max stack.', price:1200, buff:{atk:0.35}},
  metal_coat:   {name_fr:'Peau Métal',     name_en:'Metal Coat',   icon:'🛡️', desc_fr:'Défense & Déf. Spé. +30 % au max.', desc_en:'Defense & Sp. Def +30% at max stack.', price:1200, buff:{def:0.30}},
  soft_sand:    {name_fr:'Sable Doux',     name_en:'Soft Sand',    icon:'🏖️', desc_fr:'PV max & Défense +30 % au max.', desc_en:'Max HP & Defense +30% at max stack.', price:1200, buff:{hpMax:0.30,def:0.30}},
  focus_lens:   {name_fr:'Lentille Zoom',  name_en:'Focus Lens',   icon:'🔍', desc_fr:'Vitesse & Atk Spé. +35 % au max.', desc_en:'Speed & Sp. Atk +35% at max stack.', price:1200, buff:{spe:0.35}},
  power_gem:    {name_fr:'Joyau Pouvoir',  name_en:'Power Gem',    icon:'💎', desc_fr:'Attaque Spéciale +40 % au max.', desc_en:'Special Attack +40% at max stack.', price:1200, buff:{spa:0.40}},
  rarecandy:    {name_fr:'Super Bonbon',  name_en:'Rare Candy',    icon:'🍬', desc_fr:'Augmente instantanément le niveau d\'un Pokémon de +1 !', desc_en:'Instantly raises a Pokémon\'s level by +1!', price:10000, type:'candy'},
  chroma_charm: {name_fr:'Charme Chroma', name_en:'Shiny Charm',   icon:'✨', desc_fr:'Triple les chances de rencontrer des Pokémon Shiny (3x) !', desc_en:'Triples the chance of encountering Shiny Pokémon (3x)!', price:100000, type:'special'},
  // ---- Objets EXCLUSIFS JOHTO (Or/Argent) : effets en combat ----
  sunstone:     {name_fr:'Pierre Soleil', name_en:'Sun Stone', icon:'☀️', desc_fr:'Fait évoluer certains Pokémon Plante (Grainipiot→Floraëlla, Tournegrin→Héliatronc).', desc_en:'Evolves certain Grass Pokémon.', price:3000, type:'stone'},
  kings_rock:   {name_fr:'Rocher Royal', name_en:"King's Rock", icon:'👑', desc_fr:"Objet tenu : +12% Atk & +12% Atk Spé. (évoque Koross / Chorene).", desc_en:'Held: +12% Atk & Sp.Atk (evolves Politoed/Slowking).', price:2000, buff:{atk:0.12, spa:0.12}},
  dragon_scale: {name_fr:'Écaille Dragon', name_en:'Dragon Scale', icon:'🐉', desc_fr:'Objet tenu : +20% Atk & +20% Atk Spé. (évoque Hyporoi).', desc_en:'Held: +20% Atk & Sp.Atk (evolves Kingdra).', price:2000, buff:{atk:0.20, spa:0.20}},
  up_grade:     {name_fr:'Upgrade', name_en:'Up-Grade', icon:'💾', desc_fr:'Objet tenu : +30% Atk Spé. (évoque Porygon2).', desc_en:'Held: +30% Sp.Atk (evolves Porygon2).', price:2000, buff:{spa:0.30}},
  deep_sea_scale:{name_fr:'Écaille Océan', name_en:'Deep Sea Scale', icon:'🔱', desc_fr:'Objet tenu : +30% Déf. Spé. (évoque Moorelot).', desc_en:'Held: +30% Sp.Def (evolves Gorebyss).', price:1800, buff:{spd:0.30}},
  deep_sea_tooth:{name_fr:'Dent Océan', name_en:'Deep Sea Tooth', icon:'🦷', desc_fr:'Objet tenu : +30% Attaque (évoque Hydreloc).', desc_en:'Held: +30% Atk (evolves Huntail).', price:1800, buff:{atk:0.30}},
  twisted_spoon:{name_fr:'Cuillère Tordue', name_en:'Twisted Spoon', icon:'🥄', desc_fr:'Objet tenu : +20% Atk Spé. (renforce les capacités Psy).', desc_en:'Held: +20% Sp.Atk.', price:1500, buff:{spa:0.20}},
  thick_club:   {name_fr:'Os Épais', name_en:'Thick Club', icon:'🦴', desc_fr:'Objet tenu (Osselet / Macrogato) : +40% Attaque !', desc_en:'Held (Cubone/Marowak): +40% Atk!', price:1500, buff:{atk:0.40}},
  black_belt:   {name_fr:'Ceinture Noire', name_en:'Black Belt', icon:'🥋', desc_fr:'Objet tenu : +20% Attaque, dégâts Combat renforcés.', desc_en:'Held: +20% Atk, Fighting dmg up.', price:1500, buff:{atk:0.20}},
  black_glasses:{name_fr:'Lunettes Noires', name_en:'Black Glasses', icon:'🕶️', desc_fr:'Objet tenu : +20% Attaque, dégâts Ténèbres renforcés.', desc_en:'Held: +20% Atk, Dark dmg up.', price:1500, buff:{atk:0.20}},
  charcoal:     {name_fr:'Charbon', name_en:'Charcoal', icon:'🔥', desc_fr:'Objet tenu : +20% Attaque, dégâts Feu renforcés.', desc_en:'Held: +20% Atk, Fire dmg up.', price:1500, buff:{atk:0.20}},
  dragon_fang:  {name_fr:'Crocdure', name_en:'Dragon Fang', icon:'🐲', desc_fr:'Objet tenu : +20% Attaque, dégâts Dragon renforcés.', desc_en:'Held: +20% Atk, Dragon dmg up.', price:1500, buff:{atk:0.20}},
  miracle_seed: {name_fr:'Graine Miracle', name_en:'Miracle Seed', icon:'🌱', desc_fr:'Objet tenu : +20% Attaque, dégâts Plante renforcés.', desc_en:'Held: +20% Atk, Grass dmg up.', price:1500, buff:{atk:0.20}},
  mystic_water: {name_fr:'Eau Mystique', name_en:'Mystic Water', icon:'💧', desc_fr:'Objet tenu : +20% Attaque, dégâts Eau renforcés.', desc_en:'Held: +20% Atk, Water dmg up.', price:1500, buff:{atk:0.20}},
  never_melt_ice:{name_fr:'Glace Éternelle', name_en:'Never-Melt Ice', icon:'🧊', desc_fr:'Objet tenu : +20% Attaque, dégâts Glace renforcés.', desc_en:'Held: +20% Atk, Ice dmg up.', price:1500, buff:{atk:0.20}},
  sharp_beak:   {name_fr:'Bec Aiguisé', name_en:'Sharp Beak', icon:'🪶', desc_fr:'Objet tenu : +20% Attaque, dégâts Vol renforcés.', desc_en:'Held: +20% Atk, Flying dmg up.', price:1500, buff:{atk:0.20}},
  poison_barb:  {name_fr:'Piquant Poison', name_en:'Poison Barb', icon:'🟣', desc_fr:'Objet tenu : +20% Attaque, dégâts Poison renforcés.', desc_en:'Held: +20% Atk, Poison dmg up.', price:1500, buff:{atk:0.20}},
  spell_tag:    {name_fr:'Etiquette Maléfique', name_en:'Spell Tag', icon:'🔮', desc_fr:'Objet tenu : +20% Attaque, dégâts Spectre renforcés.', desc_en:'Held: +20% Atk, Ghost dmg up.', price:1500, buff:{atk:0.20}},
  hard_stone:   {name_fr:'Pierre Dure', name_en:'Hard Stone', icon:'🪨', desc_fr:'Objet tenu : +20% Attaque, dégâts Roche renforcés.', desc_en:'Held: +20% Atk, Rock dmg up.', price:1500, buff:{atk:0.20}},
  magnet:       {name_fr:'Aimant', name_en:'Magnet', icon:'🧲', desc_fr:'Objet tenu : +20% Attaque, dégâts Électrik renforcés.', desc_en:'Held: +20% Atk, Electric dmg up.', price:1500, buff:{atk:0.20}},
  silk_scarf:   {name_fr:'Foulard Soie', name_en:'Silk Scarf', icon:'🧣', desc_fr:'Objet tenu : +20% Attaque, dégâts Normal renforcés.', desc_en:'Held: +20% Atk, Normal dmg up.', price:1500, buff:{atk:0.20}},
  silver_wing:  {name_fr:'Aile Argent', name_en:'Silver Wing', icon:'🕊️', desc_fr:'Objet clé : réveille Ho-Oh à la Tour Cendrée.', desc_en:'Key item: awakens Ho-Oh at Tin Tower.', price:1, type:'key'},
  rainbow_wing: {name_fr:'Aile Arc-en-Ciel', name_en:'Rainbow Wing', icon:'🌈', desc_fr:'Objet clé : réveille Lugia aux Îles Whirl.', desc_en:'Key item: awakens Lugia at Whirl Islands.', price:1, type:'key'},
};

function getItemName(key){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const itm = ITEMS[key];
  if(!itm) return key;
  return lang === 'en' ? (itm.name_en || itm.name || key) : (itm.name_fr || itm.name || key);
}
function getItemDesc(key){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const itm = ITEMS[key];
  if(!itm) return '';
  return lang === 'en' ? (itm.desc_en || itm.desc || '') : (itm.desc_fr || itm.desc || '');
}

// ============================================================
// TALENTS / ABILITIES DATA (Authentic Pokémon Abilities)
// ============================================================
var TALENT_DATA = {
  overgrow:    {name_fr:"Engrais",       name_en:"Overgrow",      desc_fr:"Attaques Plante +35% de dégâts si PV < 35%.", desc_en:"Grass moves deal +35% dmg when HP < 35%."},
  blaze:       {name_fr:"Brasier",       name_en:"Blaze",         desc_fr:"Attaques Feu +35% de dégâts si PV < 35%.",    desc_en:"Fire moves deal +35% dmg when HP < 35%."},
  torrent:     {name_fr:"Torrent",       name_en:"Torrent",       desc_fr:"Attaques Eau +35% de dégâts si PV < 35%.",    desc_en:"Water moves deal +35% dmg when HP < 35%."},
  chlorophyll: {name_fr:"Chlorophylle",  name_en:"Chlorophyll",   desc_fr:"Vitesse augmentée de +35%.",                 desc_en:"Speed boosted by +35%."},
  solarpower:  {name_fr:"Force Soleil",  name_en:"Solar Power",   desc_fr:"Attaque Spéciale augmentée de +30%.",        desc_en:"Special Attack boosted by +30%."},
  intimidate:  {name_fr:"Intimidation",  name_en:"Intimidate",    desc_fr:"Réduit l'Attaque ennemie de 25% au combat.", desc_en:"Lowers enemy Attack by 25% in battle."},
  static:      {name_fr:"Statik",        name_en:"Static",        desc_fr:"25% de chance de paralyser l'assaillant.",   desc_en:"25% chance to paralyze attacker on hit."},
  lightningrod:{name_fr:"Paratonnerre",  name_en:"Lightning Rod", desc_fr:"Immunité Électrik, Atk Spéciale +25%.",      desc_en:"Electric immunity, Sp. Atk +25% when hit."},
  sandveil:    {name_fr:"Voile Sable",   name_en:"Sand Veil",     desc_fr:"Esquive augmentée de +20%.",                 desc_en:"Evasion boosted by +20%."},
  poisonpoint: {name_fr:"Point Poison",  name_en:"Poison Point",  desc_fr:"25% de chance d'empoisonner au contact.",    desc_en:"25% chance to poison attacker on hit."},
  magicguard:  {name_fr:"Garde Magik",   name_en:"Magic Guard",   desc_fr:"Immunisé aux dégâts de statut et indirects.",desc_en:"Immune to status and indirect damage."},
  hugepower:   {name_fr:"Coloforce",     name_en:"Huge Power",    desc_fr:"La statistique d'Attaque physique augmente de +60% !", desc_en:"Physical Attack stat increased by +60%!"},
  sturdy:      {name_fr:"Fermeté",       name_en:"Sturdy",        desc_fr:"Réduit les dégâts subis de 15% et bloque le K.O. direct.", desc_en:"Reduces incoming damage by 15%."},
  levitate:    {name_fr:"Lévitation",    name_en:"Levitate",      desc_fr:"Immunisé contre les attaques Sol.",          desc_en:"Immune to Ground-type attacks."},
  guts:        {name_fr:"Cran",          name_en:"Guts",          desc_fr:"Attaque augmentée de +50% en cas d'altération de statut.", desc_en:"Attack +50% when suffering status condition."},
  adaptability:{name_fr:"Adaptabilité",  name_en:"Adaptability",  desc_fr:"Le bonus de type du lanceur (STAB) passe à x2.0 !", desc_en:"STAB multiplier becomes 2.0x instead of 1.5x!"},
  thickfat:    {name_fr:"Isograisse",    name_en:"Thick Fat",     desc_fr:"Dégâts subis des capacités Feu et Glace réduits de 50%.", desc_en:"Fire and Ice damage taken halved."},
  multiscale:  {name_fr:"Multiécaille",  name_en:"Multiscale",    desc_fr:"Dégâts subis réduits de 50% quand les PV sont au maximum.", desc_en:"Halves incoming damage when at full 100% HP."},
  compoundeyes:{name_fr:"Œil Composé",   name_en:"Compound Eyes", desc_fr:"La précision de toutes les attaques augmente de +30%.", desc_en:"Move accuracy increased by +30%."},
  speedboost:  {name_fr:"Turbo",         name_en:"Speed Boost",   desc_fr:"La Vitesse augmente de +15% à chaque tour.", desc_en:"Speed increases by +15% each turn."},
  naturalcure: {name_fr:"Médic Nature",  name_en:"Natural Cure",  desc_fr:"Soigne automatiquement les statuts à la fin du combat.", desc_en:"Automatically cures status on switch/end of battle."},
  serenegrace: {name_fr:"Sérénité",      name_en:"Serene Grace",  desc_fr:"Chances d'effets secondaires des capacités doublées.", desc_en:"Doubles chance of move secondary effects."},
  clearbody:   {name_fr:"Corps Sain",    name_en:"Clear Body",    desc_fr:"Immunisé contre les baisses de statistiques ennemies.", desc_en:"Immune to enemy stat reduction effects."},
  roughskin:   {name_fr:"Peau Dure",     name_en:"Rough Skin",    desc_fr:"L'adversaire subit 12% de ses PV max lorsqu'il attaque.", desc_en:"Attacker takes 12% max HP reflection damage."},
  regenerator: {name_fr:"Régé-Force",    name_en:"Regenerator",   desc_fr:"Restaure 25% des PV au début ou à la fin d'un combat.", desc_en:"Restores 25% HP at the start of battle."},
  sniper:      {name_fr:"Sniper",        name_en:"Sniper",        desc_fr:"Les coups critiques infligent des dégâts multipliés par 2.25.", desc_en:"Critical hit damage multiplier becomes 2.25x."},
  technician:  {name_fr:"Technicien",    name_en:"Technician",    desc_fr:"Les capacités de puissance <= 60 infligent +50% de dégâts.", desc_en:"Moves with base power <= 60 deal +50% damage."},
  noguard:     {name_fr:"Annule Garde",  name_en:"No Guard",      desc_fr:"Toutes les attaques du lanceur et de la cible réussissent toujours.", desc_en:"All moves used by or against this Pokémon never miss."},
};

var STORY_LORE = {
  pallet: {speaker_fr:"Prof. Chen", speaker_en:"Prof. Oak", text_fr:"Bienvenue, jeune Dresseur ! Ton voyage à travers le monde des Pokémon débute aujourd'hui. Noue des liens profonds avec tes partenaires et sois patient et attentif dans les hautes herbes !", text_en:"Welcome, young Trainer! Your journey through the world of Pokémon begins today. Bond deeply with your partners and stay patient and watchful in the tall grass!"},
  route1: {speaker_fr:"Jeune Dresseur", speaker_en:"Young Trainer", text_fr:"Les Roucool et les Rattata adorent se cacher dans ces buissons. Si un Pokémon sauvage t'échappe, garde confiance et continue d'explorer la route !", text_en:"Pidgey and Rattata love hiding in these bushes. If a wild Pokémon slips away, stay confident and keep exploring the road!"},
  viridian: {speaker_fr:"Dresseur Jadielle", speaker_en:"Viridian Trainer", text_fr:"L'Arène de notre ville est fermée pour l'instant. Le Champion Giovanni est en voyage d'affaires mystérieux...", text_en:"Our city's Gym is closed for now. Gym Leader Giovanni is away on mysterious business..."},
  pewter: {speaker_fr:"Pierre (Brock)", speaker_en:"Brock", text_fr:"Ma volonté est aussi solide que la roche ! Si tu veux mon Badge Roche, tu vas devoir briser ma défense !", text_en:"My will is as solid as rock! If you want my Boulder Badge, you'll have to shatter my defense!"},
  mtmoon: {speaker_fr:"Chercheur Fossile", speaker_en:"Fossil Researcher", text_fr:"Cette grotte regorge de mystérieux fragments lunaires tombés du ciel. On raconte que de timides Mélofée s'y rassemblent les soirs de pleine lune !", text_en:"This cavern holds mysterious lunar shards that fell from the sky. They say elusive Clefairy gather here beneath the full moon!"},
  cerulean: {speaker_fr:"Ondine (Misty)", speaker_en:"Misty", text_fr:"Moi, c'est Ondine ! La Sirène As de l'Arène ! Mes Pokémon Eau vont submerger ton équipe sous un torrent d'attaques !", text_en:"I'm Misty! The Tomboyish Mermaid! My Water Pokémon will submerge your team in a torrent of attacks!"},
  vermilion: {speaker_fr:"Major Bob (Lt. Surge)", speaker_en:"Lt. Surge", text_fr:"Repos, soldat ! Pendant la guerre, mes Pokémon Électrik ont sauvé ma vie. Montre-moi si tu as les nerfs assez solides !", text_en:"Ten-hut! During the war, my Electric Pokémon saved my life. Show me if you have the guts to stand against me!"},
  celadon: {speaker_fr:"Erika", speaker_en:"Erika", text_fr:"Bonjour... Il fait si beau aujourd'hui. Mes Pokémon Plante s'épanouissent sous le soleil. Faisons un combat tout en élégance.", text_en:"Hello... It is such a lovely day. My Grass Pokémon thrive in the sunlight. Let us have an elegant battle."},
  fuchsia: {speaker_fr:"Koga", speaker_en:"Koga", text_fr:"Fufufu... Le désespoir, la terreur et le poison ! Telles sont les armes secrètes du ninjutsu Pokémon !", text_en:"Fufufu... Despair, terror, and poison! These are the secret weapons of Pokémon ninjutsu!"},
  cinnabar: {speaker_fr:"Auguste (Blaine)", speaker_en:"Blaine", text_fr:"Hahaha ! Mon arène est un volcan en éruption ! Tu vas avoir besoin d'un anti-brûlure si tu ne veux pas finir en cendres !", text_en:"Hahaha! My Gym is an erupting volcano! You better have burn heal if you don't want to turn to ash!"},
  seafoamislands: {speaker_fr:"Légende des Îles", speaker_en:"Islands Legend", text_fr:"Au plus profond des glaces éternelles sommeille Artikodin, l'un des trois oiseaux légendaires de Kanto. Seul un héros accompli peut l'éveiller.", text_en:"Deep within the eternal ice slumber Articuno, one of Kanto's three legendary birds. Only a true hero can awaken it."},
  powerplant: {speaker_fr:"Rapport Centrale", speaker_en:"Power Plant Report", text_fr:"De violentes décharges magnétiques font trembler les générateurs abandonnés. Électhor a fait de ce lieu son nid de foudre !", text_en:"Violent magnetic surges shake the abandoned generators. Zapdos has made this place its nest of lightning!"},
  victoryroad: {speaker_fr:"Inscription Rocheuse", speaker_en:"Stone Inscription", text_fr:"Seuls les Dresseurs possédant les 8 Badges de Kanto peuvent fouler cette route. Dans ses cratères incandescents règne Sulfura, l'oiseau de feu !", text_en:"Only Trainers with all 8 Kanto Badges may tread this path. In its glowing craters reigns Moltres, the bird of fire!"},
  indigo: {speaker_fr:"Maître Bleu", speaker_en:"Champion Blue", text_fr:"Salut ! Tu as enfin réussi à arriver jusqu'ici ! Mais c'est trop tard : je viens de battre le Conseil 4 ! Je suis le Dresseur le plus puissant du monde !", text_en:"Hey! You finally made it here! But you're too late: I just beat the Elite 4! I am the most powerful Trainer in the world!"},
  ceruleancave: {speaker_fr:"Journal de Fuji", speaker_en:"Fuji's Journal", text_fr:"Nous avons cloné Mew pour créer le Pokémon ultime... Mewtwo est né de nos expériences, et sa puissance psychique surpasse l'entendement !", text_en:"We cloned Mew to create the ultimate Pokémon... Mewtwo was born of our experiments, and its psychic power is beyond comprehension!"},


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
  ilexforest: {speaker_fr:"Protecteur du Bois", speaker_en:"Forest Warden", text_fr:"Le Bois aux Chênes abrite Celebi, Pokémon du Temps.", text_en:"Ilex Forest shelters Celebi, the Time Pokémon."}
};

var POKE_TALENTS = {
  1:['overgrow','overgrow','chlorophyll'], 2:['overgrow','overgrow','chlorophyll'], 3:['overgrow','overgrow','chlorophyll'],
  4:['blaze','blaze','solarpower'], 5:['blaze','blaze','solarpower'], 6:['blaze','blaze','solarpower'],
  7:['torrent','torrent','regenerator'], 8:['torrent','torrent','regenerator'], 9:['torrent','torrent','regenerator'],
  10:['compoundeyes','sniper','speedboost'], 11:['compoundeyes','sniper','speedboost'], 12:['compoundeyes','sniper','speedboost'],
  13:['poisonpoint','sniper','adaptability'], 14:['poisonpoint','sniper','adaptability'], 15:['poisonpoint','sniper','adaptability'],
  16:['sandveil','compoundeyes','sniper'], 17:['sandveil','compoundeyes','sniper'], 18:['sandveil','compoundeyes','sniper'],
  19:['guts','intimidate','hugepower'], 20:['guts','intimidate','hugepower'],
  21:['sniper','speedboost','technician'], 22:['sniper','speedboost','technician'],
  23:['intimidate','poisonpoint','regenerator'], 24:['intimidate','poisonpoint','regenerator'],
  25:['static','static','lightningrod'], 26:['static','static','lightningrod'],
  27:['sandveil','sturdy','roughskin'], 28:['sandveil','sturdy','roughskin'],
  29:['poisonpoint','sturdy','hugepower'], 30:['poisonpoint','sturdy','hugepower'], 31:['poisonpoint','sturdy','hugepower'],
  32:['poisonpoint','sturdy','hugepower'], 33:['poisonpoint','sturdy','hugepower'], 34:['poisonpoint','sturdy','hugepower'],
  35:['magicguard','serenegrace','regenerator'], 36:['magicguard','serenegrace','regenerator'],
  37:['blaze','solarpower','speedboost'], 38:['blaze','solarpower','speedboost'],
  39:['serenegrace','magicguard','hugepower'], 40:['serenegrace','magicguard','hugepower'],
  41:['intimidate','sniper','speedboost'], 42:['intimidate','sniper','speedboost'],
  43:['chlorophyll','overgrow','poisonpoint'], 44:['chlorophyll','overgrow','poisonpoint'], 45:['chlorophyll','overgrow','poisonpoint'],
  46:['compoundeyes','chlorophyll','regenerator'], 47:['compoundeyes','chlorophyll','regenerator'],
  48:['speedboost','sniper','intimidate'], 49:['speedboost','sniper','intimidate'],
  50:['sandveil','sturdy','hugepower'], 51:['sandveil','sturdy','hugepower'],
  52:['technician','intimidate','adaptability'], 53:['technician','intimidate','adaptability'],
  54:['serenegrace','magicguard','compoundeyes'], 55:['serenegrace','magicguard','compoundeyes'],
  56:['intimidate','technician','guts'], 57:['intimidate','technician','guts'],
  58:['intimidate','blaze','solarpower'], 59:['intimidate','blaze','solarpower'],
  60:['torrent','speedboost','regenerator'], 61:['torrent','speedboost','regenerator'], 62:['torrent','speedboost','regenerator'],
  63:['magicguard','serenegrace','regenerator'], 64:['magicguard','serenegrace','regenerator'], 65:['magicguard','serenegrace','regenerator'],
  66:['guts','noguard','hugepower'], 67:['guts','noguard','hugepower'], 68:['guts','noguard','hugepower'],
  69:['chlorophyll','poisonpoint','solarpower'], 70:['chlorophyll','poisonpoint','solarpower'], 71:['chlorophyll','poisonpoint','solarpower'],
  72:['clearbody','poisonpoint','regenerator'], 73:['clearbody','poisonpoint','regenerator'],
  74:['sturdy','sandveil','roughskin'], 75:['sturdy','sandveil','roughskin'], 76:['sturdy','sandveil','roughskin'],
  77:['blaze','speedboost','solarpower'], 78:['blaze','speedboost','solarpower'],
  79:['regenerator','torrent','adaptability'], 80:['regenerator','torrent','adaptability'],
  81:['sturdy','static','lightningrod'], 82:['sturdy','static','lightningrod'],
  83:['sniper','technician','adaptability'], 84:['sniper','speedboost','technician'], 85:['sniper','speedboost','technician'],
  86:['thickfat','regenerator','torrent'], 87:['thickfat','regenerator','torrent'],
  88:['poisonpoint','clearbody','regenerator'], 89:['poisonpoint','clearbody','regenerator'],
  90:['thickfat','sturdy','multiscale'], 91:['thickfat','sturdy','multiscale'],
  92:['levitate','magicguard','regenerator'], 93:['levitate','magicguard','regenerator'], 94:['levitate','magicguard','regenerator'],
  95:['sturdy','roughskin','sandveil'], 96:['magicguard','serenegrace','regenerator'], 97:['magicguard','serenegrace','regenerator'],
  98:['hugepower','sturdy','adaptability'], 99:['hugepower','sturdy','adaptability'],
  100:['static','speedboost','lightningrod'], 101:['static','speedboost','lightningrod'],
  102:['chlorophyll','solarpower','regenerator'], 103:['chlorophyll','solarpower','regenerator'],
  104:['sturdy','lightningrod','hugepower'], 105:['sturdy','lightningrod','hugepower'],
  106:['technician','speedboost','hugepower'], 107:['technician','speedboost','hugepower'],
  108:['regenerator','thickfat','sturdy'], 109:['levitate','poisonpoint','regenerator'], 110:['levitate','poisonpoint','regenerator'],
  111:['sturdy','lightningrod','roughskin'], 112:['sturdy','lightningrod','roughskin'],
  113:['naturalcure','serenegrace','regenerator'], 114:['chlorophyll','regenerator','solarpower'],
  115:['serenegrace','naturalcure','multiscale'], 116:['sniper','speedboost','torrent'], 117:['sniper','speedboost','torrent'],
  118:['speedboost','lightningrod','adaptability'], 119:['speedboost','lightningrod','adaptability'],
  120:['naturalcure','regenerator','adaptability'], 121:['naturalcure','regenerator','adaptability'],
  122:['magicguard','technician','serenegrace'], 123:['technician','speedboost','adaptability'],
  124:['magicguard','serenegrace','regenerator'], 125:['static','speedboost','lightningrod'],
  126:['blaze','speedboost','solarpower'], 127:['hugepower','technician','adaptability'],
  128:['intimidate','sturdy','hugepower'], 129:['speedboost','intimidate','multiscale'], 130:['intimidate','speedboost','multiscale'],
  131:['thickfat','sturdy','torrent'], 132:['adaptability','regenerator','magicguard'],
  133:['adaptability','speedboost','serenegrace'], 134:['torrent','thickfat','regenerator'],
  135:['static','speedboost','lightningrod'], 136:['blaze','speedboost','solarpower'],
  137:['adaptability','technician','regenerator'], 138:['speedboost','sturdy','torrent'], 139:['speedboost','sturdy','torrent'],
  140:['speedboost','sturdy','adaptability'], 141:['speedboost','sturdy','adaptability'],
  142:['sturdy','speedboost','noguard'], 143:['thickfat','sturdy','hugepower'],
  144:['thickfat','multiscale','serenegrace'], 145:['static','lightningrod','speedboost'], 146:['blaze','solarpower','speedboost'],
  147:['multiscale','serenegrace','hugepower'], 148:['multiscale','serenegrace','hugepower'], 149:['multiscale','serenegrace','hugepower'],
  150:['magicguard','regenerator','adaptability'], 151:['serenegrace','adaptability','regenerator'],
  152:['overgrow','overgrow','chlorophyll'],
  153:['overgrow','overgrow','chlorophyll'],
  154:['overgrow','overgrow','chlorophyll'],
  155:['blaze','blaze','solarpower'],
  156:['blaze','blaze','solarpower'],
  157:['blaze','blaze','solarpower'],
  158:['torrent','torrent','regenerator'],
  159:['torrent','torrent','regenerator'],
  160:['torrent','torrent','regenerator'],
  161:['compoundeyes','guts','hugepower'],
  162:['compoundeyes','guts','hugepower'],
  163:['compoundeyes','serenegrace','guts'],
  164:['compoundeyes','serenegrace','guts'],
  165:['compoundeyes','guts','hugepower'],
  166:['compoundeyes','guts','hugepower'],
  167:['poisonpoint','compoundeyes','guts'],
  168:['poisonpoint','compoundeyes','guts'],
  169:['clearbody','serenegrace','regenerator'],
  170:['lightningrod','compoundeyes','regenerator'],
  171:['lightningrod','compoundeyes','regenerator'],
  172:['static','static','lightningrod'],
  173:['magicguard','serenegrace','regenerator'],
  174:['magicguard','serenegrace','regenerator'],
  175:['serenegrace','magicguard','naturalcure'],
  176:['serenegrace','naturalcure','magicguard'],
  177:['serenegrace','compoundeyes','naturalcure'],
  178:['serenegrace','compoundeyes','naturalcure'],
  179:['static','static','lightningrod'],
  180:['static','static','lightningrod'],
  181:['static','static','lightningrod'],
  182:['chlorophyll','chlorophyll','solarpower'],
  183:['thickfat','hugepower','hugepower'],
  184:['thickfat','hugepower','hugepower'],
  185:['sturdy','sturdy','guts'],
  186:['sturdy','regenerator','thickfat'],
  187:['chlorophyll','chlorophyll','solarpower'],
  188:['chlorophyll','solarpower','guts'],
  189:['chlorophyll','solarpower','guts'],
  190:['compoundeyes','guts','hugepower'],
  191:['chlorophyll','solarpower','guts'],
  192:['chlorophyll','solarpower','guts'],
  193:['speedboost','compoundeyes','serenegrace'],
  194:['sturdy','regenerator','guts'],
  195:['sturdy','regenerator','guts'],
  196:['serenegrace','magicguard','naturalcure'],
  197:['serenegrace','clearbody','guts'],
  198:['compoundeyes','guts','hugepower'],
  199:['regenerator','naturalcure','serenegrace'],
  200:['levitate','levitate','magicguard'],
  201:['levitate','levitate','clearbody'],
  202:['clearbody','magicguard','regenerator'],
  203:['clearbody','serenegrace','guts'],
  204:['sturdy','sturdy','regenerator'],
  205:['sturdy','clearbody','regenerator'],
  206:['serenegrace','magicguard','guts'],
  207:['sandveil','sturdy','guts'],
  208:['sturdy','guts','hugepower'],
  209:['intimidate','guts','hugepower'],
  210:['intimidate','guts','hugepower'],
  211:['poisonpoint','guts','hugepower'],
  212:['technician','guts','hugepower'],
  213:['sturdy','guts','hugepower'],
  214:['guts','technician','hugepower'],
  215:['clearbody','guts','hugepower'],
  216:['guts','hugepower','sturdy'],
  217:['guts','hugepower','sturdy'],
  218:['sturdy','guts','hugepower'],
  219:['sturdy','guts','hugepower'],
  220:['sturdy','guts','hugepower'],
  221:['sturdy','guts','hugepower'],
  222:['naturalcure','regenerator','sturdy'],
  223:['sniper','guts','hugepower'],
  224:['sniper','guts','hugepower'],
  225:['guts','hugepower','sturdy'],
  226:['sturdy','regenerator','naturalcure'],
  227:['sturdy','regenerator','guts'],
  228:['guts','intimidate','hugepower'],
  229:['guts','intimidate','hugepower'],
  230:['sniper','guts','hugepower'],
  231:['sturdy','guts','hugepower'],
  232:['sturdy','guts','hugepower'],
  233:['adaptability','regenerator','guts'],
  234:['intimidate','guts','hugepower'],
  235:['technician','guts','hugepower'],
  236:['guts','sturdy','hugepower'],
  237:['guts','sturdy','hugepower'],
  238:['naturalcure','serenegrace','magicguard'],
  239:['static','guts','hugepower'],
  240:['guts','serenegrace','hugepower'],
  241:['thickfat','guts','hugepower'],
  242:['naturalcure','serenegrace','magicguard'],
  243:['sturdy','intimidate','lightningrod'],
  244:['sturdy','intimidate','guts'],
  245:['sturdy','intimidate','regenerator'],
  246:['guts','sturdy','hugepower'],
  247:['guts','sturdy','hugepower'],
  248:['guts','sturdy','hugepower'],
  249:['sturdy','regenerator','multiscale'],
  250:['sturdy','regenerator','solarpower'],
  251:['naturalcure','serenegrace','magicguard'],
};

// ============================================================
// STORYLINE QUESTS DATA (PokéClicker style)
// ============================================================
var STORY_QUESTS = [
  // ===================== CHAINE KANTO (region:'kanto') =====================
  {id:30, region:'kanto', title_fr:"Les Conseils du Prof. Chen", title_en:"Prof. Chen's Advice",
   desc_fr:"Au Bourg Palette, parlez au Prof. Chen pour recevoir ses precieux conseils de depart. C'est votre toute premiere quete !",
   desc_en:"In Pallet Town, talk to Prof. Chen to receive his valuable starter advice. Your very first quest!",
   type:"talk", loc:"pallet", target:1, rewardMoney:300, rewardItems:{berry_oran:5}, rewardDesc_fr:"300₽ + 5 Baies Oran", rewardDesc_en:"300₽ + 5 Oran Berries"},
  {id:0, region:'kanto', title_fr:"Le Début d'une Aventure", title_en:"A New Adventure Begins",
   desc_fr:"Bienvenue dans PokéWorld ! Rendez-vous sur la Route 1 et remportez 3 combats sauvages pour prouver votre talent.",
   desc_en:"Welcome to PokéWorld! Travel to Road 1 and win 3 battles against wild Pokémon to prove your skills.",
   type:"defeat_wild", loc:"route1", target:3, rewardMoney:500, rewardItems:{berry_oran:5}, rewardDesc_fr:"500₽ + 5 Baies Oran", rewardDesc_en:"500₽ + 5 Oran Berries"},
  {id:40, region:'kanto', title_fr:"La Forêt de Jadielle", title_en:"Viridian Forest Awakens",
   desc_fr:"Explorez la Forêt Jadielle et remportez 5 combats sauvages pour aiguiser votre equipe.",
   desc_en:"Explore Viridian Forest and win 5 wild battles to sharpen your team.",
   type:"defeat_wild", loc:"viridianforest", target:5, rewardMoney:600, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"600₽ + 5 Baies Sitrus", rewardDesc_en:"600₽ + 5 Sitrus Berries"},
  {id:41, region:'kanto', title_fr:"La Route 22 Sauvage", title_en:"Wild Route 22",
   desc_fr:"La Route 22 regorge de Pokémon. Remportez 6 combats sauvages pour devenir plus fort !",
   desc_en:"Route 22 is full of Pokémon. Win 6 wild battles to grow stronger!",
   type:"defeat_wild", loc:"route22", target:6, rewardMoney:700, rewardItems:{berry_ceriz:5}, rewardDesc_fr:"700₽ + 5 Baies Ceriz", rewardDesc_en:"700₽ + 5 Cheri Berries"},
  {id:1, region:'kanto', title_fr:"Le Baptême Roche d'Argenta", title_en:"The Pewter Boulder Test",
   desc_fr:"Rendez-vous à Argenta et defiez Pierre dans son Arene Roche. Triomphez pour remporter votre premier Badge !",
   desc_en:"Travel to Pewter City and challenge Brock at his Rock Gym. Emerge victorious to earn your first Badge!",
   type:"badge", targetBadge:"brock", target:1, rewardMoney:1000, rewardItems:{fossil:1}, rewardDesc_fr:"1 000₽ + 1 Fossile Ancien", rewardDesc_en:"1,000₽ + 1 Old Fossil"},
  {id:42, region:'kanto', title_fr:"L'Énigme du Mont Sélénite", title_en:"Mt. Moon Enigma",
   desc_fr:"Traversez la Route 3 et remportez 6 combats sauvages pour progresser vers le Mont Sélénite.",
   desc_en:"Cross Road 3 and win 6 wild battles to advance toward Mt. Moon.",
   type:"defeat_wild", loc:"route3", target:6, rewardMoney:1500, rewardItems:{moonstone:1}, rewardDesc_fr:"1 500₽ + 1 Pierre Lune", rewardDesc_en:"1,500₽ + 1 Moon Stone"},
  {id:43, region:'kanto', title_fr:"La Traversée de la Route 4", title_en:"Crossing Road 4",
   desc_fr:"La Route 4 mene a Azuria. Remportez 6 combats sauvages pour forger votre equipe.",
   desc_en:"Road 4 leads to Cerulean. Win 6 wild battles to forge your team.",
   type:"defeat_wild", loc:"route4", target:6, rewardMoney:1200, rewardItems:{berry_prine:5}, rewardDesc_fr:"1 200₽ + 5 Baies Prine", rewardDesc_en:"1,200₽ + 5 Prine Berries"},
  {id:2, region:'kanto', title_fr:"L'Expédition du Mont Sélénite", title_en:"Mt. Moon Expedition",
   desc_fr:"Explorez le sombre Mont Sélénite. Vainquez 6 Pokémon sauvages pour deterrer une Pierre Lune.",
   desc_en:"Explore the dark caverns of Mt. Moon. Defeat 6 wild Pokémon to uncover a Moon Stone.",
   type:"defeat_wild", loc:"mtmoon", target:6, rewardMoney:1500, rewardItems:{moonstone:1}, rewardDesc_fr:"1 500₽ + 1 Pierre Lune", rewardDesc_en:"1,500₽ + 1 Moon Stone"},
  {id:3, region:'kanto', title_fr:"Le Pont Pépite d'Azuria", title_en:"Cerulean Nugget Bridge",
   desc_fr:"À Azuria, triomphez d'Ondine pour le Badge Cascade, ou remportez 5 combats sur le Pont Pépite (Route 24/25) !",
   desc_en:"In Cerulean City, defeat Misty for the Cascade Badge, or win 5 battles on Nugget Bridge (Road 24/25)!",
   type:"badge_or_loc", targetBadge:"misty", loc:"route24", target:5, rewardMoney:2500, rewardItems:{nugget:1}, rewardDesc_fr:"2 500₽ + 1 Pépite d'or", rewardDesc_en:"2,500₽ + 1 Gold Nugget"},
  {id:44, region:'kanto', title_fr:"Les Eaux de la Route 5", title_en:"Waters of Road 5",
   desc_fr:"La Route 5 relie Azuria a Safrania. Remportez 6 combats sauvages pour vous entrainer.",
   desc_en:"Road 5 links Cerulean to Saffron. Win 6 wild battles to train up.",
   type:"defeat_wild", loc:"route5", target:6, rewardMoney:1500, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"1 500₽ + 5 Baies Sitrus", rewardDesc_en:"1,500₽ + 5 Sitrus Berries"},
  {id:45, region:'kanto', title_fr:"La Route 6 — Vers Carmin", title_en:"Road 6 — To Vermilion",
   desc_fr:"Empruntez la Route 6 vers Carmin sur Mer et remportez 6 combats sauvages.",
   desc_en:"Take Road 6 toward Vermilion City and win 6 wild battles.",
   type:"defeat_wild", loc:"route6", target:6, rewardMoney:1500, rewardItems:{berry_oran:5}, rewardDesc_fr:"1 500₽ + 5 Baies Oran", rewardDesc_en:"1,500₽ + 5 Oran Berries"},
  {id:5, region:'kanto', title_fr:"Le Tonnerre de Carmin sur Mer", title_en:"The Vermilion Thunder",
   desc_fr:"Naviguez jusqu'a Carmin sur Mer et affrontez le Major Bob dans son arene Electrik pour decrocher le Badge Foudre.",
   desc_en:"Travel to Vermilion City and challenge Lt. Surge in his Electric Gym to secure the Thunder Badge.",
   type:"badge", targetBadge:"surge", target:1, rewardMoney:3500, rewardItems:{thunderstone:1}, rewardDesc_fr:"3 500₽ + 1 Pierre Foudre", rewardDesc_en:"3,500₽ + 1 Thunder Stone"},
  {id:4, region:'kanto', title_fr:"Les Secrets de la Cave Taupiqueur", title_en:"Diglett's Cave Secrets",
   desc_fr:"Traversez la Route 11 et explorez la mystérieuse Cave Taupiqueur. Remportez 5 combats sauvages pour renforcer votre equipe.",
   desc_en:"Cross Road 11 and explore the mysterious Diglett's Cave. Win 5 wild battles to train your team.",
   type:"defeat_wild", loc:"diglettscave", target:5, rewardMoney:3000, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"3 000₽ + 5 Baies Sitrus", rewardDesc_en:"3,000₽ + 5 Sitrus Berries"},
  {id:46, region:'kanto', title_fr:"L'Écluse de la Route 9 et 10", title_en:"Roads 9 & 10 Gateway",
   desc_fr:"Les Routes 9 et 10 menent au nord. Remportez 6 combats sauvages pour progresser.",
   desc_en:"Roads 9 & 10 lead north. Win 6 wild battles to advance.",
   type:"defeat_wild", loc:"route10", target:6, rewardMoney:2000, rewardItems:{berry_prine:5}, rewardDesc_fr:"2 000₽ + 5 Baies Prine", rewardDesc_en:"2,000₽ + 5 Prine Berries"},
  {id:47, region:'kanto', title_fr:"Le Tunnel Rocheux", title_en:"The Rocky Tunnel",
   desc_fr:"Francchissez le Tunnel Rocheux vers Lavanville. Remportez 6 combats sauvages dans l'obscurite.",
   desc_en:"Cross the Rocky Tunnel toward Lavender Town. Win 6 wild battles in the dark.",
   type:"defeat_wild", loc:"rocktunnel", target:6, rewardMoney:2000, rewardItems:{berry_ceriz:5}, rewardDesc_fr:"2 000₽ + 5 Baies Ceriz", rewardDesc_en:"2,000₽ + 5 Cheri Berries"},
  {id:7, region:'kanto', title_fr:"Les Fantômes de la Tour de Lavanville", title_en:"Pokémon Tower Ghosts",
   desc_fr:"Rejoignez Lavanville et bravez les esprits de la Tour Pokémon. Remportez 5 combats pour obtenir 3 Super Bonbons.",
   desc_en:"Travel to Lavender Town and brave the spirits of Pokémon Tower. Win 5 battles to obtain 3 Rare Candies.",
   type:"defeat_wild", loc:"pokemontower", target:5, rewardMoney:4500, rewardItems:{rarecandy:3}, rewardDesc_fr:"4 500₽ + 3 Super Bonbons", rewardDesc_en:"4,500₽ + 3 Rare Candies"},
  {id:48, region:'kanto', title_fr:"La Route 7 — Céladopole", title_en:"Road 7 — Celadon",
   desc_fr:"La Route 7 relie Safrania a Céladopole. Remportez 6 combats sauvages pour vous preparer a l'arene.",
   desc_en:"Road 7 links Saffron to Celadon. Win 6 wild battles to prepare for the gym.",
   type:"defeat_wild", loc:"route7", target:6, rewardMoney:2500, rewardItems:{leafstone:1}, rewardDesc_fr:"2 500₽ + 1 Pierre Plante", rewardDesc_en:"2,500₽ + 1 Leaf Stone"},
  {id:8, region:'kanto', title_fr:"La Grâce Naturelle de Céladopole", title_en:"Celadon City's Rainbow",
   desc_fr:"Rendez-vous dans la metropole de Céladopole et triomphez d'Erika pour remporter le Badge Prisme.",
   desc_en:"Visit the metropolis of Celadon City and overcome Erika to claim the Rainbow Badge.",
   type:"badge", targetBadge:"erika", target:1, rewardMoney:5000, rewardItems:{leafstone:1, life_orb:1}, rewardDesc_fr:"5 000₽ + Pierre Plante + Orbe Vie", rewardDesc_en:"5,000₽ + Leaf Stone + Life Orb"},
  {id:9, region:'kanto', title_fr:"Le Maître de l'Ombre à Parmanie", title_en:"Fuchsia Shadow Master",
   desc_fr:"Atteignez Parmanie et déjouez les pieges toxiques de Koga pour capturer le Badge Ame.",
   desc_en:"Reach Fuchsia City and overcome Koga's toxic techniques to capture the Soul Badge.",
   type:"badge", targetBadge:"koga", target:1, rewardMoney:6000, rewardItems:{leftovers:1}, rewardDesc_fr:"6 000₽ + Restes", rewardDesc_en:"6,000₽ + Leftovers"},
  {id:10, region:'kanto', title_fr:"Les Pouvoirs Psychiques de Safrania", title_en:"Saffron Psychic Powers",
   desc_fr:"Pénétrez dans l'arene psychique de Safrania et vainquez Morgane (Sabrina) pour decrocher le Badge Marais.",
   desc_en:"Enter Saffron City's psychic gym and defeat Sabrina to claim the Marsh Badge.",
   type:"badge", targetBadge:"sabrina", target:1, rewardMoney:7000, rewardItems:{assault_vest:1}, rewardDesc_fr:"7 000₽ + Veste Combat", rewardDesc_en:"7,000₽ + Assault Vest"},
  {id:49, region:'kanto', title_fr:"Le Grand Souterrain", title_en:"Grand Underground Discovery",
   desc_fr:"Ouvrez l'onglet ⛏️ Mine et utilisez vos outils pour extraire et vendre 3 tresors deterres dans les roches de Kanto.",
   desc_en:"Open the ⛏️ Underground tab and use mining tools to unearth and sell 3 treasures from Kanto's depths.",
   type:"mine_sell", target:3, rewardMoney:4000, rewardItems:{stardust:2}, rewardDesc_fr:"4 000₽ + 2 Poussières Étoile", rewardDesc_en:"4,000₽ + 2 Stardust"},
  {id:50, region:'kanto', title_fr:"Les Îles Écume — Route 19 et 20", title_en:"Seafoam Isles — Roads 19 & 20",
   desc_fr:"Partez vers les Chenaux 19 et 20 au sud de Parmanie. Remportez 8 combats sauvages en mer.",
   desc_en:"Head to Sea Roads 19 & 20 south of Fuchsia. Win 8 wild sea battles.",
   type:"defeat_wild", loc:"route20", target:8, rewardMoney:4000, rewardItems:{berry_oran:10}, rewardDesc_fr:"4 000₽ + 10 Baies Oran", rewardDesc_en:"4,000₽ + 10 Oran Berries"},
  {id:11, region:'kanto', title_fr:"Le Volcan Flamboyant de Cramois'île", title_en:"Cinnabar Volcano Enigma",
   desc_fr:"Traversez les chenaux maritimes jusqu'a Cramois'île et battez Auguste (Pyro) pour le Badge Volcan.",
   desc_en:"Cross the sea routes to Cinnabar Island and defeat Blaine for the Volcano Badge.",
   type:"badge", targetBadge:"blaine", target:1, rewardMoney:8000, rewardItems:{firestone:1, waterstone:1}, rewardDesc_fr:"8 000₽ + Pierre Feu & Pierre Eau", rewardDesc_en:"8,000₽ + Fire & Water Stones"},
  {id:12, region:'kanto', title_fr:"L'Ultime Arène de Jadielle", title_en:"Viridian's Final Gym",
   desc_fr:"Retournez a Jadielle et affrontez le mystérieux Giovanni dans sa redoutable arene Sol pour obtenir le 8ᵉ Badge Kanto !",
   desc_en:"Return to Viridian City and face Giovanni in his ground gym to claim your 8th Kanto Badge!",
   type:"badge", targetBadge:"giovanni", target:1, rewardMoney:10000, rewardItems:{choice_scarf:1, rarecandy:5}, rewardDesc_fr:"10 000₽ + Mouchoir Choix + 5 Super Bonbons", rewardDesc_en:"10,000₽ + Choice Scarf + 5 Rare Candies"},
  {id:51, region:'kanto', title_fr:"La Route 23 — L'Avant-Garde", title_en:"Road 23 — The Vanguard",
   desc_fr:"La Route 23 garde l'acces a la Route Victoire. Remportez 10 combats sauvages pour vous aguerri.",
   desc_en:"Road 23 guards the path to Victory Road. Win 10 wild battles to toughen up.",
   type:"defeat_wild", loc:"route23", target:10, rewardMoney:5000, rewardItems:{choice_scarf:1}, rewardDesc_fr:"5 000₽ + Mouchoir Choix", rewardDesc_en:"5,000₽ + Choice Scarf"},
  {id:13, region:'kanto', title_fr:"Le Maître Suprême de Kanto", title_en:"The Ultimate Kanto Champion",
   desc_fr:"Francchissez la Route Victoire et triomphez des 5 combats du Conseil 4 au Plateau Indigo pour devenir le nouveau Maître de Kanto !",
   desc_en:"Conquer Victory Road and triumph over the Elite 4 at Indigo Plateau to become Kanto Champion!",
   type:"badge", targetBadge:"elite4", target:1, rewardMoney:25000, rewardItems:{choice_band:1, choice_specs:1}, rewardDesc_fr:"25 000₽ + Bandeau Choix + Lunettes Choix", rewardDesc_en:"25,000₽ + Choice Band & Specs"},
  {id:14, region:'kanto', title_fr:"L'Oiseau de Glace des Îles Écume", title_en:"The Ice Bird of Seafoam",
   desc_fr:"Explorez les profondeurs glacées des Îles Écume (Chenal 20) et triomphez de 10 Pokémon pour éveiller le légendaire Artikodin !",
   desc_en:"Explore the frozen depths of Seafoam Islands (Sea Road 20) and win 10 battles to awaken the legendary Articuno!",
   type:"defeat_wild", loc:"seafoamislands", target:10, rewardPoke:144, rewardDesc_fr:"Artikodin (Légendaire ✨)", rewardDesc_en:"Articuno (Legendary ✨)"},
  {id:15, region:'kanto', title_fr:"L'Oiseau de Foudre de la Centrale", title_en:"The Thunder Bird of Power Plant",
   desc_fr:"Pénétrez dans la Centrale Électrique abandonnée (Route 10) et vainquez 10 Pokémon pour faire apparaître Électhor !",
   desc_en:"Enter the abandoned Power Plant (Road 10) and defeat 10 wild Pokémon to summon Zapdos!",
   type:"defeat_wild", loc:"powerplant", target:10, rewardPoke:145, rewardDesc_fr:"Électhor (Légendaire ✨)", rewardDesc_en:"Zapdos (Legendary ✨)"},
  {id:16, region:'kanto', title_fr:"L'Oiseau de Feu de la Route Victoire", title_en:"The Fire Bird of Victory Road",
   desc_fr:"Traversez les epreuves de la Route Victoire (Grotte) et remportez 10 combats pour defier Sulfura !",
   desc_en:"Brave the trials of Victory Road (Cave) and win 10 battles to encounter Moltres!",
   type:"defeat_wild", loc:"victoryroad", target:10, rewardPoke:146, rewardDesc_fr:"Sulfura (Légendaire ✨)", rewardDesc_en:"Moltres (Legendary ✨)"},
  {id:17, region:'kanto', title_fr:"Les Archives du Manoir Pokémon", title_en:"Pokémon Mansion Archives",
   desc_fr:"Fouillez les ruines du Manoir Pokémon sur Cramois'île. Vainquez 10 Pokémon sauvages pour découvrir des secrets.",
   desc_en:"Explore the ruined Pokémon Mansion on Cinnabar Island. Win 10 wild battles to uncover secrets.",
   type:"defeat_wild", loc:"pokemonmansion", target:10, rewardMoney:15000, rewardItems:{swift_charm:1, rarecandy:10}, rewardDesc_fr:"15 000₽ + Charme Rapide + 10 Super Bonbons", rewardDesc_en:"15,000₽ + Swift Charm + 10 Rare Candies"},
  {id:18, region:'kanto', title_fr:"Le Clone Ultime de la Caverne Azurée", title_en:"The Ultimate Clone of Cerulean Cave",
   desc_fr:"Maintenant que vous êtes Maître de Kanto, accédez a la mystérieuse Caverne Azurée au nord d'Azuria. Triomphez de 15 Pokémon pour capturer Mewtwo !",
   desc_en:"Now Kanto Champion, enter Cerulean Cave north of Cerulean City. Triumph over 15 wild Pokémon to capture Mewtwo!",
   type:"defeat_wild", loc:"ceruleancave", target:15, rewardPoke:150, rewardMoney:25000, rewardDesc_fr:"Mewtwo (Légendaire ✨) + 25 000₽", rewardDesc_en:"Mewtwo (Legendary ✨) + 25,000₽"},
  {id:19, region:'kanto', title_fr:"Le Fabuleux Miraculeux du Parc Safari", title_en:"The Mythical Miracle of Safari Zone",
   desc_fr:"Explorez le vaste Parc Safari a Parmanie. Vainquez 15 Pokémon sauvages pour rencontrer et capturer le rarissime fabuleux Mew !",
   desc_en:"Explore the vast Safari Zone in Fuchsia City. Triumph over 15 wild Pokémon to encounter and capture the mythical Mew!",
   type:"defeat_wild", loc:"safarizone", target:15, rewardPoke:151, rewardMoney:50000, rewardItems:{chroma_charm:1}, rewardDesc_fr:"Mew (Fabuleux ✨) + Charme Chroma + 50 000₽", rewardDesc_en:"Mew (Mythical ✨) + Shiny Charm + 50,000₽"},

  // ===================== CHAINE JOHTO (region:'johto') =====================
  {id:31, region:'johto', title_fr:"Le Salut du Prof. Orme", title_en:"Prof. Elm's Greeting",
   desc_fr:"À Bourg Geonif, parlez au Prof. Orme pour debutere officiellement votre aventure Johto.",
   desc_en:"In New Bark Town, talk to Prof. Elm to officially begin your Johto adventure.",
   type:"talk", loc:"newbark", target:1, rewardMoney:300, rewardItems:{berry_oran:5}, rewardDesc_fr:"300₽ + 5 Baies Oran", rewardDesc_en:"300₽ + 5 Oran Berries"},
  {id:20, region:'johto', title_fr:"L'Appel de Johto — Bourg Geonif", title_en:"Johto's Call — New Bark",
   desc_fr:"Bienvenue en Johto ! Parlez au Prof. Orme a Bourg Geonif puis remportez 3 combats sauvages pour debutere.",
   desc_en:"Welcome to Johto! Visit Prof. Elm in New Bark, then win 3 wild battles to begin.",
   type:"defeat_wild", loc:"newbark", target:3, rewardMoney:500, rewardItems:{berry_oran:5}, rewardDesc_fr:"500₽ + 5 Baies Oran", rewardDesc_en:"500₽ + 5 Oran Berries"},
  {id:21, region:'johto', title_fr:"L'Épreuve d'Argenta (Johto)", title_en:"Violet's Flying Trial",
   desc_fr:"Rendez-vous a Argenta et defiez Albert (Falkner) dans son arene Vol pour le Badge Zephyr !",
   desc_en:"Travel to Violet City and challenge Falkner at his Flying Gym for the Zephyr Badge!",
   type:"badge", targetBadge:"falkner", target:1, rewardMoney:1000, rewardItems:{berry_sitrus:5}, rewardDesc_fr:"1 000₽ + 5 Baies Sitrus", rewardDesc_en:"1,000₽ + 5 Sitrus Berries"},
  {id:22, region:'johto', title_fr:"La Forêt d'Écorcia", title_en:"Azalea's Bug Trial",
   desc_fr:"À Écorcia, triomphez d'Hector (Bugsy) pour le Badge Essaim !",
   desc_en:"In Azalea Town, defeat Bugsy to claim the Hive Badge!",
   type:"badge", targetBadge:"bugsy", target:1, rewardMoney:1500, rewardItems:{muscle_band:1}, rewardDesc_fr:"1 500₽ + Bandeau Muscle", rewardDesc_en:"1,500₽ + Muscle Band"},
  {id:23, region:'johto', title_fr:"La Plaine de Doublonville", title_en:"Goldenrod's Plain Trial",
   desc_fr:"À Doublonville, battez Blanche (Whitney) pour le Badge Plaine !",
   desc_en:"In Goldenrod City, defeat Whitney for the Plain Badge!",
   type:"badge", targetBadge:"whitney", target:1, rewardMoney:2000, rewardItems:{soft_sand:1}, rewardDesc_fr:"2 000₽ + Sable Doux", rewardDesc_en:"2,000₽ + Soft Sand"},
  {id:24, region:'johto', title_fr:"La Brume d'Ébénelle", title_en:"Ecruteak's Fog Trial",
   desc_fr:"À Rosalia, vainquez Mortimer (Morty) pour le Badge Brume !",
   desc_en:"In Ecruteak City, defeat Morty for the Fog Badge!",
   type:"badge", targetBadge:"morty", target:1, rewardMoney:2500, rewardItems:{choice_scarf:1}, rewardDesc_fr:"2 500₽ + Mouchoir Choix", rewardDesc_en:"2,500₽ + Choice Scarf"},
  {id:25, region:'johto', title_fr:"Le Choc d'Irisia", title_en:"Cianwood's Storm Trial",
   desc_fr:"Sur l'Île d'Irisia, battez Chuck pour le Badge Choc !",
   desc_en:"On Cianwood Island, defeat Chuck for the Storm Badge!",
   type:"badge", targetBadge:"chuck", target:1, rewardMoney:3000, rewardItems:{power_gem:1}, rewardDesc_fr:"3 000₽ + Joyau Pouvoir", rewardDesc_en:"3,000₽ + Power Gem"},
  {id:26, region:'johto', title_fr:"Le Minéral d'Oliville", title_en:"Olivine's Mineral Trial",
   desc_fr:"À Oliville, triomphez de Jasmine pour le Badge Minéral !",
   desc_en:"In Olivine City, defeat Jasmine for the Mineral Badge!",
   type:"badge", targetBadge:"jasmine", target:1, rewardMoney:3500, rewardItems:{leftovers:1}, rewardDesc_fr:"3 500₽ + Restes", rewardDesc_en:"3,500₽ + Leftovers"},
  {id:27, region:'johto', title_fr:"Le Glacier d'Acajou", title_en:"Mahogany's Glacier Trial",
   desc_fr:"À Acajou, vainquez Frédo (Pryce) pour le Badge Glacier !",
   desc_en:"In Mahogany Town, defeat Pryce for the Glacier Badge!",
   type:"badge", targetBadge:"pryce", target:1, rewardMoney:4000, rewardItems:{choice_specs:1}, rewardDesc_fr:"4 000₽ + Lunettes Choix", rewardDesc_en:"4,000₽ + Choice Specs"},
  {id:28, region:'johto', title_fr:"Le Lever d'Ébénelle", title_en:"Blackthorn's Rising Trial",
   desc_fr:"À Ébénelle, affrontez Sandra (Clair) pour le Badge Lever et devenir Maître de Johto !",
   desc_en:"In Blackthorn City, challenge Clair for the Rising Badge and become Johto Champion!",
   type:"badge", targetBadge:"clair", target:1, rewardMoney:8000, rewardItems:{choice_band:1, rarecandy:5}, rewardDesc_fr:"8 000₽ + Bandeau Choix + 5 Super Bonbons", rewardDesc_en:"8,000₽ + Choice Band + 5 Rare Candies"}
,
  // ===================== HISTOIRE POST-LIGUE JOHTO (légendaires) =====================
  {id:60, region:'johto', title_fr:"La Tour Brûlante : le Mystère des Bêtes", title_en:"Burned Tower: The Beasts' Mystery",
   desc_fr:"À Rosalia, explorez la Tour Brûlante et affrontez 8 Pokémon pour libérer les trois Bêtes Légendaires : Raikou, Entei et Suicune !",
   desc_en:"In Ecruteak, explore Burned Tower and defeat 8 Pokémon to free the three Legendary Beasts: Raikou, Entei and Suicune!",
   type:"defeat_wild", loc:"burnedtower", target:8, rewardMoney:3000, rewardItems:{rarecandy:5}, rewardDesc_fr:"3 000₽ + 5 Super Bonbons", rewardDesc_en:"3,000₽ + 5 Rare Candies"},
  {id:61, region:'johto', title_fr:"Raikou, la Foudre Pourpre", title_en:"Raikou, the Purple Thunder",
   desc_fr:"Sillonnez la Route 44 et remportez 10 combats pour faire surgir Raikou, la Bête Foudre !",
   desc_en:"Roam Route 44 and win 10 battles to summon Raikou, the Thunder Beast!",
   type:"defeat_wild", loc:"jroute44", target:10, rewardMoney:5000, rewardPoke:243, rewardDesc_fr:"Raikou (Légendaire ✨)", rewardDesc_en:"Raikou (Legendary ✨)"},
  {id:62, region:'johto', title_fr:"Entei, le Volcan Vivant", title_en:"Entei, the Living Volcano",
   desc_fr:"Parcourez la Route 28 et remportez 10 combats pour réveiller Entei, la Bête Feu !",
   desc_en:"Travel Route 28 and win 10 battles to awaken Entei, the Fire Beast!",
   type:"defeat_wild", loc:"jroute28", target:10, rewardMoney:5000, rewardPoke:244, rewardDesc_fr:"Entei (Légendaire ✨)", rewardDesc_en:"Entei (Legendary ✨)"},
  {id:63, region:'johto', title_fr:"Suicune, l'Aurore Boréale", title_en:"Suicune, the Aurora",
   desc_fr:"Parcourez la Route 42 et remportez 10 combats pour croiser Suicune, la Bête Eau !",
   desc_en:"Cross Route 42 and win 10 battles to meet Suicune, the Water Beast!",
   type:"defeat_wild", loc:"jroute42", target:10, rewardMoney:5000, rewardPoke:245, rewardDesc_fr:"Suicune (Légendaire ✨)", rewardDesc_en:"Suicune (Legendary ✨)"},
  {id:64, region:'johto', title_fr:"Les Îles Whirl : Lugia, Gardien des Mers", title_en:"Whirl Islands: Lugia, Guardian of the Sea",
   desc_fr:"Plongez aux Îles Whirl et remportez 10 combats pour éveiller Lugia, le Pokémon de la Mer !",
   desc_en:"Dive to the Whirl Islands and win 10 battles to awaken Lugia, the Sea Pokémon!",
   type:"defeat_wild", loc:"whirlislands", target:10, rewardMoney:8000, rewardPoke:249, rewardDesc_fr:"Lugia (Légendaire ✨)", rewardDesc_en:"Lugia (Legendary ✨)"},
  {id:65, region:'johto', title_fr:"La Tour Cendrée : Ho-Oh, Oiseau de Feu", title_en:"Tin Tower: Ho-Oh, the Fire Bird",
   desc_fr:"Gravissez la Tour Cendrée à Rosalia et remportez 10 combats pour faire apparaître Ho-Oh, l'Oiseau de Feu !",
   desc_en:"Climb the Tin Tower in Ecruteak and win 10 battles to summon Ho-Oh, the Fire Bird!",
   type:"defeat_wild", loc:"tintower", target:10, rewardMoney:8000, rewardPoke:250, rewardDesc_fr:"Ho-Oh (Légendaire ✨)", rewardDesc_en:"Ho-Oh (Legendary ✨)"},
  {id:66, region:'johto', title_fr:"Le Bois aux Chênes : Celebi, Pokémon Fabuleux", title_en:"Ilex Forest: Celebi, the Mythical",
   desc_fr:"Dans le Bois aux Chênes, remportez 12 combats pour rencontrer Celebi, le Pokémon du Temps !",
   desc_en:"In Ilex Forest, win 12 battles to meet Celebi, the Time Pokémon!",
   type:"defeat_wild", loc:"ilexforest", target:12, rewardMoney:10000, rewardPoke:251, rewardDesc_fr:"Celebi (Fabuleux ✨)", rewardDesc_en:"Celebi (Mythical ✨)"}
];

function getSpeciesTalents(id){
  const nid = Number(id);
  return POKE_TALENTS[nid] || ['sturdy', 'intimidate', 'hugepower'];
}
function getTalentName(tal){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const td = TALENT_DATA[tal];
  if(!td) return tal || 'Normal';
  return lang === 'en' ? (td.name_en || tal) : (td.name_fr || tal);
}
function getTalentDesc(tal){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const td = TALENT_DATA[tal];
  if(!td) return '';
  return lang === 'en' ? (td.desc_en || '') : (td.desc_fr || '');
}
function isTalentHidden(id, tal){
  const tals = getSpeciesTalents(id);
  return tals[2] === tal && tals[0] !== tal && tals[1] !== tal;
}

// ============================================================
// POKEMON FACTORY
// ============================================================
function unlockTalentForSpecies(id, tal){
  if(typeof G === 'undefined' || !G) return;
  if(!G.unlockedTalents) G.unlockedTalents = {};
  const nid = Number(id);
  const tals = getSpeciesTalents(nid);
  if(!G.unlockedTalents[nid]) {
    G.unlockedTalents[nid] = [tals[0]];
  }
  if(tal && !G.unlockedTalents[nid].includes(tal)){
    G.unlockedTalents[nid].push(tal);
    const lang = G.lang || 'fr';
    const pokeName = getPokeName(nid);
    const isHid = isTalentHidden(nid, tal);
    if(typeof notify === 'function'){
      notify(lang === 'en' ? `🧬 New talent unlocked for ${pokeName}: ${getTalentName(tal)}${isHid?' (Hidden ✨)':''}!` : `🧬 Nouveau talent débloqué pour ${pokeName} : ${getTalentName(tal)}${isHid?' (Caché ✨)':''} !`, 'var(--purple)');
    }
  }
}

function getMovesForLevel(moveset, level){
  if(!moveset || !moveset.length) return [{id:'tackle', pp:35, maxPP:35}];
  const count = level >= 24 ? 4 : level >= 16 ? 3 : level >= 8 ? 2 : 1;
  const available = moveset.slice(0, Math.min(count, moveset.length));
  return available.map(m => ({id:m, pp:MOVES[m]?.pp||10, maxPP:MOVES[m]?.pp||10}));
}

function calcStat(base, level, isHP=false, isShiny=false, iv=0, ev=0){
  let val = isHP ? Math.floor((2*base*level)/100) + level + 10 : Math.floor((2*base*level)/100) + 5;
  if(isShiny) val = Math.floor(val * 1.2);
  const starMult = 1 + ((iv||0) * 0.05) + ((ev||0) * 0.05);
  return Math.floor(val * starMult);
}

function recalcPokeStats(p){
  if(!p) return;
  const d = PD[p.id];
  if(!d) return;
  if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
  if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
  if(!p.ivs) p.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  if(!p.evs) p.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const isShiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny);
  const hpRatio = p.currentHP / p.maxHP;
  p.maxHP = calcStat(d[3], p.level, true, isShiny, p.ivs.hp, p.evs.hp);
  p.currentHP = Math.max(1, Math.floor(p.maxHP * hpRatio));
  p.atk = calcStat(d[4], p.level, false, isShiny, p.ivs.atk, p.evs.atk);
  p.def = calcStat(d[5], p.level, false, isShiny, p.ivs.def, p.evs.def);
  p.spa = calcStat(d[6], p.level, false, isShiny, p.ivs.spa, p.evs.spa);
  p.spd = calcStat(d[7], p.level, false, isShiny, p.ivs.spd, p.evs.spd);
  p.spe = calcStat(d[8], p.level, false, isShiny, p.ivs.spe, p.evs.spe);
}

function renderStars(val, isEv=false){
  const count = clamp(val || 0, 0, 6);
  const symbol = isEv ? '🟢' : '⭐';
  const empty = isEv ? '⚫' : '☆';
  let s = '';
  for(let i=0; i<6; i++) s += i < count ? symbol : empty;
  return `<span title="+${count*5}%">${s}</span>`;
}

function isShinyDisplay(p){ return !!(p&&p.shinyActive); }
function xpForLevel(lv){ return Math.floor(Math.pow(lv,3) * 0.8); }

// ============================================================
// LOCATIONS MAP
// ============================================================
// [name, type(town/route/sea/dungeon), x, y, connections[], wildPokemon[[id,minLv,maxLv]], shopId, championId, badgeReq]
var LOCS = {
  pallet:        {name:'Bourg Palette',        type:'town',    x:392,y:620,w:80,h:72, conn:['route1','route21'],               wild:[], shopId:'pallet', champ:null, badgeReq:0},
  route1:        {name:'Route 1',              type:'route',   x:392,y:524,w:48,h:120, conn:['pallet','viridian'],              wild:[[16,2,5,'common'],[19,2,4,'common']], shopId:null, champ:null, badgeReq:0},
  viridian:      {name:'Jadielle',             type:'town',    x:400,y:432,w:64,h:64, conn:['route1','route22','route2'],       wild:[], shopId:'viridian', champ:'giovanni', badgeReq:0},
  route22:       {name:'Route 22',             type:'route',   x:240, y:440,w:256,h:48, conn:['viridian','route23'],             wild:[[16,3,5,'common'],[19,3,4,'common'],[56,3,5,'uncommon'],[29,3,5,'uncommon'],[32,3,5,'uncommon']], shopId:null, champ:null, badgeReq:0},
  route2:        {name:'Route 2',              type:'route',   x:392,y:252,w:48,h:56, group:'route2', conn:['viridian','viridianforest'],       wild:[[16,3,5,'common'],[19,3,4,'common'],[10,3,5,'uncommon'],[13,3,5,'uncommon']], shopId:null, champ:null, badgeReq:0},
  route2_south:  {name:'Route 2',              type:'route',   x:392,y:376,w:48,h:48, group:'route2', conn:['viridian','viridianforest'],            wild:[[43,3,6,'common'],[46,3,6,'common'],[48,4,7,'uncommon']], shopId:null, champ:null, badgeReq:0},
  viridianforest:{name:'Forêt Jadielle',       type:'dungeon', x:392,y:316,w:112,h:72, conn:['route2','route2_south','pewter'],                wild:[[10,3,5,'common'],[13,3,5,'common'],[11,4,6,'uncommon'],[14,4,6,'uncommon'],[25,3,5,'rare']], shopId:null, champ:null, badgeReq:0},
  pewter:        {name:'Argenta',              type:'town',    x:416,y:184,w:128,h:80,  conn:['viridianforest','route3'],        wild:[], shopId:'pewter', champ:'brock', badgeReq:0},
  route3:        {name:'Route 3',              type:'route',   x:600,y:200,w:240,h:48,  conn:['pewter','mtmoon'],                wild:[[16,6,8,'common'],[21,6,8,'common'],[39,6,7,'uncommon'],[56,7,9,'uncommon']], shopId:null, champ:null, badgeReq:1},
  mtmoon:        {name:'Mont Sélénite',        type:'dungeon', x:760,y:176,w:80,h:96,  conn:['route3','route4'],                wild:[[41,7,10,'common'],[74,7,10,'common'],[46,8,11,'uncommon'],[35,8,12,'rare']], shopId:null, champ:null, badgeReq:1},
  route4:        {name:'Route 4',              type:'route',   x:896,y:184,w:192,h:48,  conn:['mtmoon','cerulean'],              wild:[[19,8,12,'common'],[21,8,12,'common'],[23,6,12,'uncommon'],[27,6,12,'uncommon']], shopId:null, champ:null, badgeReq:1},
  cerulean:      {name:'Azuria',               type:'town',    x:1064,y:176,w:144,h:64,  conn:['route4','route24','route5','route9','ceruleancave'], wild:[], shopId:'cerulean', champ:'misty', badgeReq:1},
  ceruleancave:  {name:'Caverne Azurée',       type:'dungeon', x:1008,y:104,w:64,h:48,  conn:['cerulean'],                       wild:[[42,46,52,'common'],[64,46,52,'common'],[112,46,52,'common'],[113,50,56,'rare'],[132,45,50,'uncommon'],[150,70,70,'rare']], shopId:null, champ:null, badgeReq:8},
  route24:       {name:'Pont Pépite (24)',     type:'route',   x:1080,y:88,w:48,h:112,  conn:['cerulean','route25'],             wild:[[10,7,10,'common'],[13,7,10,'common'],[16,12,14,'common'],[43,12,14,'uncommon'],[69,12,14,'uncommon'],[63,8,12,'rare']], shopId:null, champ:null, badgeReq:2},
  route25:       {name:'Route 25',             type:'route',   x:1216,y:56,w:224,h:48,  conn:['route24'],                        wild:[[10,8,12,'common'],[13,8,12,'common'],[16,13,15,'common'],[43,13,15,'uncommon'],[69,13,15,'uncommon']], shopId:null, champ:null, badgeReq:2},
  route5:        {name:'Route 5',              type:'route',   x:1080,y:248,w:48,h:80, conn:['cerulean','saffron'],             wild:[[16,13,16,'common'],[19,13,16,'common'],[43,13,16,'uncommon'],[69,13,16,'uncommon'],[52,10,16,'uncommon'],[56,10,16,'uncommon']], shopId:null, champ:null, badgeReq:2},
  saffron:       {name:'Safrania',             type:'town',    x:1048,y:352,w:176,h:128, conn:['route5','route6','route8','route7'], wild:[], shopId:'celadon', champ:'sabrina', badgeReq:3},
  route6:        {name:'Route 6',              type:'route',   x:1080,y:456,w:48,h:80, conn:['saffron','vermilion'],             wild:[[16,13,16,'common'],[19,13,16,'common'],[43,13,16,'uncommon'],[69,13,16,'uncommon'],[52,10,16,'uncommon'],[56,10,16,'uncommon']], shopId:null, champ:null, badgeReq:2},
  vermilion:     {name:'Carmin sur Mer',       type:'town',    x:1056,y:528,w:160,h:64, conn:['route6','route11'],                wild:[], shopId:'vermilion', champ:'surge', badgeReq:2},
  route11:       {name:'Route 11',             type:'route',   x:1272,y:536,w:272,h:48, conn:['vermilion','diglettscave','route12'], wild:[[21,13,17,'common'],[23,12,15,'common'],[27,12,15,'common'],[96,11,15,'uncommon']], shopId:null, champ:null, badgeReq:2},
  diglettscave:  {name:'Cave Taupiqueur',      type:'dungeon', x:456,y:248,w:48,h:48, conn:['route11','route2'],                wild:[[50,15,22,'common'],[51,29,31,'rare']], shopId:null, champ:null, badgeReq:2},
  route9:        {name:'Route 9',              type:'route',   x:1264,y:168,w:256,h:48,  conn:['cerulean','route10'],             wild:[[19,13,17,'common'],[21,13,17,'common'],[23,11,17,'uncommon'],[27,11,17,'uncommon']], shopId:null, champ:null, badgeReq:2},
  route10:       {name:'Route 10',             type:'route',   x:1432,y:232,w:48,h:48,  conn:['route9','rocktunnel','powerplant'], wild:[[21,13,17,'common'],[23,11,17,'common'],[27,11,17,'common'],[100,14,17,'uncommon']], shopId:null, champ:null, badgeReq:2},
  rocktunnel:    {name:'Grotte Rocheuse',      type:'dungeon', x:1424,y:184,w:64,h:48, conn:['route10','lavender'],              wild:[[41,15,17,'common'],[74,15,17,'common'],[66,15,17,'uncommon'],[95,13,17,'rare']], shopId:null, champ:null, badgeReq:2},
  powerplant:    {name:'Centrale Électrique',  type:'dungeon', x:1520,y:256,w:64,h:64, conn:['route10'],                        wild:[[81,21,24,'common'],[100,21,24,'common'],[25,20,24,'uncommon'],[82,32,35,'rare'],[125,33,36,'rare']], shopId:null, champ:null, badgeReq:4},
  lavender:      {name:'Lavanville',           type:'town',    x:1392,y:344,w:64,h:80, conn:['rocktunnel','pokemontower','route8','route12'], wild:[], shopId:'lavender', champ:null, badgeReq:3},
  pokemontower:  {name:'Tour Pokémon',         type:'dungeon', x:1456,y:320,w:64,h:128, conn:['lavender'],                       wild:[[92,18,24,'common'],[93,20,25,'uncommon'],[104,20,22,'rare']], shopId:null, champ:null, badgeReq:3},
  route8:        {name:'Route 8',              type:'route',   x:1248,y:344,w:224,h:48, conn:['lavender','saffron'],              wild:[[16,18,20,'common'],[19,18,20,'common'],[23,18,20,'common'],[27,18,20,'common'],[37,15,18,'uncommon'],[58,15,18,'uncommon']], shopId:null, champ:null, badgeReq:3},
  route7:        {name:'Route 7',              type:'route',   x:872,y:344,w:176,h:48, conn:['saffron','celadon'],              wild:[[16,19,22,'common'],[19,19,22,'common'],[37,18,20,'uncommon'],[58,18,20,'uncommon']], shopId:null, champ:null, badgeReq:3},
  celadon:       {name:'Céladopole',           type:'town',    x:712,y:320,w:144,h:192, conn:['route7','route16'],               wild:[], shopId:'celadon', champ:'erika', badgeReq:3},
  route16:       {name:'Route 16',             type:'route',   x:592,y:344,w:96,h:48, conn:['celadon','route17'],              wild:[[21,20,22,'common'],[19,18,22,'common'],[84,20,22,'uncommon'],[143,30,30,'rare']], shopId:null, champ:null, badgeReq:4},
  route17:       {name:'Piste Cyclable (17)',  type:'route',   x:568,y:536,w:48,h:336, conn:['route16','route18'],              wild:[[21,25,29,'common'],[20,25,29,'common'],[84,26,28,'uncommon'],[77,28,30,'uncommon']], shopId:null, champ:null, badgeReq:4},
  route18:       {name:'Route 18',             type:'route',   x:624,y:728,w:160,h:48, conn:['route17','fuchsia'],              wild:[[21,25,29,'common'],[20,25,29,'common'],[84,26,28,'uncommon']], shopId:null, champ:null, badgeReq:4},
  fuchsia:       {name:'Parmanie',             type:'town',    x:768,y:744,w:128,h:80, conn:['route18','safarizone','route15','route19'], wild:[], shopId:'fuchsia', champ:'koga', badgeReq:4},
  safarizone:    {name:'Parc Safari',          type:'dungeon', x:800,y:664,w:96,h:80, conn:['fuchsia'],                        wild:[[29,22,25,'common'],[32,22,25,'common'],[46,22,25,'common'],[48,22,25,'uncommon'],[102,23,25,'uncommon'],[111,25,25,'uncommon'],[113,25,28,'rare'],[115,25,28,'rare'],[123,25,28,'rare'],[127,25,28,'rare'],[147,15,20,'rare']], shopId:null, champ:null, badgeReq:4},
  route15:       {name:'Route 15',             type:'route',   x:1016,y:728,w:368,h:48, conn:['fuchsia','route14'],              wild:[[43,22,26,'common'],[69,22,26,'common'],[16,23,27,'common'],[48,26,30,'uncommon'],[13,24,28,'uncommon']], shopId:null, champ:null, badgeReq:4},
  route14:       {name:'Route 14',             type:'route',   x:1304,y:664,w:208,h:48, conn:['route15','route13'],              wild:[[43,22,26,'common'],[69,22,26,'common'],[16,23,27,'common'],[44,28,30,'uncommon'],[70,28,30,'uncommon']], shopId:null, champ:null, badgeReq:4},
  route13:       {name:'Route 13',             type:'route',   x:1432,y:600,w:48,h:176, conn:['route14','route12'],              wild:[[43,22,26,'common'],[69,22,26,'common'],[16,23,27,'common'],[83,25,28,'rare']], shopId:null, champ:null, badgeReq:4},
  route12:       {name:'Route 12',             type:'route',   x:1432,y:448,w:48,h:128, conn:['route13','route11','lavender'],   wild:[[43,22,26,'common'],[69,22,26,'common'],[16,23,27,'common'],[143,30,30,'rare']], shopId:null, champ:null, badgeReq:3},
  route19:       {name:'Chenal 19',            type:'sea',     x:736,y:888,w:160,h:48, conn:['fuchsia','route20'],              wild:[[72,15,35,'common'],[73,25,35,'uncommon']], shopId:null, champ:null, badgeReq:5},
  route20:       {name:'Chenal 20',            type:'sea',     x:496,y:888,w:128,h:48, conn:['route19','seafoamislands','cinnabar'], wild:[[72,15,35,'common'],[73,25,35,'uncommon']], shopId:null, champ:null, badgeReq:5},
  seafoamislands:{name:'Îles Écume',           type:'dungeon', x:624,y:888,w:64,h:48, conn:['route20'],                        wild:[[41,26,30,'common'],[79,28,32,'common'],[86,28,32,'uncommon'],[87,32,36,'uncommon'],[90,28,32,'uncommon'],[144,50,50,'rare']], shopId:null, champ:null, badgeReq:5},
  cinnabar:      {name:'Cramois\'île',         type:'town',    x:392,y:888,w:80,h:80, conn:['route20','pokemonmansion','route21'], wild:[], shopId:'cinnabar', champ:'blaine', badgeReq:5},
  pokemonmansion:{name:'Manoir Pokémon',       type:'dungeon', x:296,y:840,w:112,h:80, conn:['cinnabar'],                       wild:[[37,28,32,'common'],[58,28,32,'common'],[88,30,34,'common'],[89,35,38,'uncommon'],[109,30,34,'common'],[110,35,38,'uncommon'],[126,38,42,'rare']], shopId:null, champ:null, badgeReq:5},
  route21:       {name:'Chenal 21',            type:'sea',     x:392,y:752,w:48,h:192, conn:['cinnabar'],              wild:[[72,15,35,'common'],[73,25,35,'uncommon'],[114,28,32,'uncommon']], shopId:null, champ:null, badgeReq:0},
  route23:       {name:'Route 23 / Victoire',  type:'route',   x:136, y:368,w:48,h:96, conn:['route22','victoryroad'],          wild:[[21,33,38,'common'],[22,38,43,'uncommon'],[23,33,38,'common'],[24,38,43,'uncommon'],[56,38,43,'uncommon']], shopId:null, champ:null, badgeReq:6},
  victoryroad:   {name:'Route Victoire (Grotte)',type:'dungeon',x:136, y:256, w:80, h:128, conn:['route23','indigo'],             wild:[[41,36,40,'common'],[42,40,44,'uncommon'],[74,36,40,'common'],[75,40,44,'uncommon'],[95,43,45,'uncommon'],[66,36,40,'common'],[67,40,44,'uncommon'],[146,50,50,'rare']], shopId:null, champ:null, badgeReq:6},
  indigo:        {name:'Plateau Indigo',       type:'town',    x:136, y:96, w:176, h:192, conn:['victoryroad'],                    wild:[], shopId:'indigo', champ:'elite4', badgeReq:7},
};

var LOCS_JOHTO = {
  jroute26:    {name:'Route 26',          type:'route',   x:1512,y:504,w:48,h:336, conn:['indigo_jo','jroute27'],                      wild:[], shopId:null, champ:null, badgeReq:8},
  jroute27:    {name:'Route 27',          type:'route',   x:1384,y:696,w:304,h:48, conn:['jroute26','jroute28'],                       wild:[], shopId:null, champ:null, badgeReq:8},
  jroute28:    {name:'Route 28',          type:'route',   x:1392,y:504,w:192,h:144, conn:['jroute27','mahogany','mtsilver'],           wild:[], shopId:null, champ:null, badgeReq:8},
  jroute37:    {name:'Route 37',          type:'route',   x:552,y:256,w:48,h:96, conn:['jroute36','ecruteak'],                        wild:[], shopId:null, champ:null, badgeReq:3},
  jroute39:    {name:'Route 39',          type:'route',   x:264,y:232,w:48,h:144, conn:['ecruteak','jroute38'],                        wild:[], shopId:null, champ:null, badgeReq:4},
  jroute41:    {name:'Chenal 41 (Mer)',   type:'sea',     x:176,y:624,w:96,h:192, conn:['olivine','cianwood'],                        wild:[], shopId:null, champ:null, badgeReq:4},
  jroute46:    {name:'Route 46',          type:'route',   x:1064,y:568,w:48,h:208, conn:['jroute45','blackthorn'],                    wild:[], shopId:null, champ:null, badgeReq:7},
  jroute47:    {name:'Route 47',          type:'route',   x:40,y:664,w:48,h:112, conn:['jroute48'],                                    wild:[], shopId:null, champ:null, badgeReq:8},
  jroute48:    {name:'Route 48',          type:'route',   x:40,y:504,w:48,h:208, conn:['jroute47','victoryroad_jo'],                 wild:[], shopId:null, champ:null, badgeReq:8},
  nationalpark:{name:'Parc National',     type:'town',    x:400,y:268,w:96,h:72, conn:['jroute35','jroute36'],                        wild:[], shopId:null, champ:null, badgeReq:0},
  indigo_jo:   {name:'Plateau Indigo',    type:'town',    x:1496,y:104,w:208,h:208, conn:['jroute26','victoryroad_jo'],              wild:[], shopId:null, champ:null, badgeReq:8},
  sprouttower: {name:'Tour Chétiflor',    type:'dungeon', x:736,y:260,w:64,h:88, conn:['violet'],                                     wild:[], shopId:null, champ:null, badgeReq:0},
  ruinsofalph: {name:'Ruines d\'Alpha',    type:'dungeon', x:696,y:432,w:80,h:64, conn:['jroute32','jroute32_mid'],                                   wild:[], shopId:null, champ:null, badgeReq:0},
  burnedtower: {name:'Tour Brûlante',     type:'dungeon', x:472,y:96,w:112,h:128, conn:['ecruteak'],                                  wild:[], shopId:null, champ:null, badgeReq:0},
  tintower:    {name:'Tour Cendrée',      type:'dungeon', x:616,y:80,w:112,h:160, conn:['ecruteak'],                                  wild:[], shopId:null, champ:null, badgeReq:0},
  mtmortar:    {name:'Mt. Mortar',        type:'dungeon', x:816,y:136,w:96,h:80, conn:['mahogany'],                                   wild:[], shopId:null, champ:null, badgeReq:6},
  icepath:     {name:'Chemin Glace',      type:'dungeon', x:1152,y:176,w:96,h:64, conn:['mahogany','blackthorn'],                     wild:[], shopId:null, champ:null, badgeReq:6},
  darkcave:    {name:'Grotte Obscure',    type:'dungeon', x:848,y:280,w:64,h:64, conn:['jroute42'],                                  wild:[], shopId:null, champ:null, badgeReq:6},
  slowpokewell:{name:'Puits Spinarak',    type:'dungeon', x:576,y:856,w:64,h:48, conn:['azalea'],                                      wild:[], shopId:null, champ:null, badgeReq:0},
  whirlislands:{name:'Îles Whirl',        type:'dungeon', x:256,y:680,w:128,h:112, conn:['cianwood'],                                  wild:[], shopId:null, champ:null, badgeReq:4},
  victoryroad_jo:{name:'Route Victoire (Johto)',type:'dungeon',x:1512,y:272,w:112,h:128, conn:['indigo_jo','jroute28','mtsilver'],   wild:[], shopId:null, champ:null, badgeReq:8},
  mtsilver:    {name:'Mt. Argent',        type:'dungeon', x:1264,y:448,w:160,h:288, conn:['jroute28','tohjofalls','victoryroad_jo'], wild:[], shopId:null, champ:null, badgeReq:8},
  tohjofalls:  {name:'Cascade Tohjo',     type:'dungeon', x:1264,y:648,w:64,h:48, conn:['mtsilver'],                                  wild:[], shopId:null, champ:null, badgeReq:8},

  newbark:     {name:'Bourg Geon',       type:'town',    x:1192,y:684,w:80,h:72, conn:['jroute29'],                          wild:[], shopId:'jnewbark', champ:null, badgeReq:0},
  jroute29:    {name:'Route 29',         type:'route',   x:1008,y:696,w:288,h:48, conn:['newbark','cherrygrove'],             wild:[[16,3,5,'common'], [19,3,5,'common'], [13,4,7,'uncommon']], shopId:null, champ:null, badgeReq:0},
  cherrygrove: {name:'Ville Griotte',    type:'town',    x:832,y:688,w:64,h:64, conn:['jroute29','jroute30'],               wild:[], shopId:'jcherrygrove', champ:null, badgeReq:0},
  jroute30:    {name:'Route 30',         type:'route',   x:840,y:504,w:48,h:304, conn:['cherrygrove','jroute31'],            wild:[[10,4,6,'common'], [13,4,6,'common'], [16,5,7,'uncommon']], shopId:null, champ:null, badgeReq:0},
  jroute31:    {name:'Route 31',         type:'route',   x:792,y:328,w:144,h:48, conn:['jroute30','violet'],                 wild:[[69,5,8,'common'], [43,5,8,'common'], [92,6,9,'uncommon']], shopId:null, champ:null, badgeReq:0},
  violet:      {name:'Mauville',         type:'town',    x:688,y:320,w:64,h:64, conn:['jroute31','jroute32'],               wild:[], shopId:'jviolet', champ:'falkner', badgeReq:0},
  jroute32:    {name:'Route 32',         type:'route',   x:696,y:376,w:48,h:48,  conn:['violet','ruinsofalph'],          wild:[[23,6,10,'common']],                                                  shopId:null, champ:null, badgeReq:1},
  jroute32_mid: {name:'Route 32',        type:'route',   x:696,y:608,w:48,h:288, conn:['violet','ruinsofalph','unioncave'],       wild:[[19,6,10,'common']],                                                  shopId:null, champ:null, badgeReq:1},
  jroute32_south:{name:'Route 32',       type:'route',   x:696,y:848,w:48,h:64,  conn:['violet','unioncave','jroute33'],         wild:[[179,7,11,'uncommon']],                                                shopId:null, champ:null, badgeReq:1},
  unioncave:   {name:'Caves Jumelles',   type:'dungeon', x:688,y:784,w:64,h:64, conn:['jroute32_mid','jroute32_south'],               wild:[[41,8,12,'common'], [74,8,12,'common'], [95,10,14,'rare']], shopId:null, champ:null, badgeReq:1},
  jroute33:    {name:'Route 33',         type:'route',   x:624,y:904,w:192,h:48, conn:['unioncave','azalea'],                wild:[[21,9,13,'common'], [19,9,13,'common']], shopId:null, champ:null, badgeReq:1},
  azalea:      {name:'Écorcia',          type:'town',    x:496,y:896,w:64,h:64, conn:['jroute33','ilexforest'],             wild:[], shopId:'jazalea', champ:'bugsy', badgeReq:0},
  ilexforest:  {name:'Bois aux Chênes',  type:'dungeon', x:408,y:888,w:112,h:112, conn:['azalea','jroute34'],                 wild:[[10,10,14,'common'], [13,10,14,'common'], [46,11,15,'uncommon']], shopId:null, champ:null, badgeReq:1},
  jroute34:    {name:'Route 34',         type:'route',   x:408,y:744,w:48,h:176, conn:['ilexforest','goldenrod'],            wild:[[63,12,16,'common'], [19,12,16,'common'], [39,13,17,'uncommon']], shopId:null, champ:null, badgeReq:2},
  goldenrod:   {name:'Doublonville',     type:'town',    x:416,y:560,w:128,h:192, conn:['jroute34','jroute35'],               wild:[], shopId:'jgoldenrod', champ:'whitney', badgeReq:0},
  jroute35:    {name:'Route 35',         type:'route',   x:408,y:408,w:48,h:112, conn:['goldenrod','jroute36'],              wild:[[16,14,18,'common'], [29,14,18,'common'], [54,15,19,'uncommon']], shopId:null, champ:null, badgeReq:2},
  jroute36:    {name:'Route 36',         type:'route',   x:520,y:328,w:272,h:48, conn:['jroute35','ecruteak'],               wild:[[37,15,20,'common'], [58,15,20,'common']], shopId:null, champ:null, badgeReq:2},
  ecruteak:    {name:'Rosalia',          type:'town',    x:544,y:176,w:64,h:64, conn:['jroute36','jroute38','jroute42'],    wild:[], shopId:'jecruteak', champ:'morty', badgeReq:3},
  jroute38:    {name:'Route 38',      type:'route',   x:400,y:184,w:224,h:48,  conn:['ecruteak','olivine'],                wild:[[19,16,21,'common'], [20,17,22,'common'], [81,18,23,'uncommon']], shopId:null, champ:null, badgeReq:4},
  olivine:     {name:'Oliville (Port 🚢)',type:'town',   x:216,y:332,w:144,h:72, conn:['jroute38','jroute40'],               wild:[], shopId:'jolivine', champ:'jasmine', badgeReq:4},
  jroute40:    {name:'Chenal 40 (Mer)',type:'sea',    x:200,y:448,w:48,h:160, conn:['olivine','cianwood'],                wild:[[72,18,24,'common'], [73,19,25,'uncommon']], shopId:null, champ:null, badgeReq:4},
  cianwood:    {name:'Irisia',           type:'town',    x:96, y:688,w:64,h:64, conn:['jroute40'],                          wild:[], shopId:'jcianwood', champ:'chuck', badgeReq:4},
  jroute42:    {name:'Route 42',         type:'route',   x:728,y:184,w:304,h:48, conn:['ecruteak','mahogany'],               wild:[[56,20,26,'common'], [41,20,26,'common']], shopId:null, champ:null, badgeReq:5},
  jroute43:    {name:'Route 43',          type:'route',   x:920,y:96,w:48,h:120, conn:['mahogany','lakerage'],                      wild:[], shopId:null, champ:null, badgeReq:6},
  mahogany:    {name:'Acajou',           type:'town',    x:912,y:176,w:64,h:64, conn:['jroute42','jroute43','jroute44'],    wild:[], shopId:'jmahogany', champ:'pryce', badgeReq:6},
  lakerage:    {name:'Lac Colère (Mer)', type:'sea',     x:920,y:36,w:120,h:72, conn:['jroute43'],                          wild:[[129,22,28,'common'], [130,25,32,'rare']], shopId:null, champ:null, badgeReq:6},
  jroute44:    {name:'Route 44 / Glace', type:'dungeon', x:1032,y:184,w:176,h:48, conn:['mahogany','blackthorn'],             wild:[[86,24,30,'common'], [87,25,32,'uncommon'], [124,26,34,'rare']], shopId:null, champ:null, badgeReq:7},
  blackthorn:  {name:'Ébénelle',         type:'town',    x:1136,y:256,w:64,h:64, conn:['jroute44','jroute45'],               wild:[], shopId:'jblackthorn', champ:'clair', badgeReq:7},
  jroute45:    {name:'Route 45',      type:'route',   x:1144,y:352,w:48,h:288, conn:['blackthorn'],                        wild:[[74,25,32,'common'], [75,26,33,'common'], [147,26,35,'rare']], shopId:null, champ:null, badgeReq:7},
};

// ============================================================
// PROGRESSION PAR NOMBRE DE POKÉMON BATTUS (style PokéClicker)
// - villes (type 'town') : minWins 0 -> points de passage libres (aucun
//   combat requis, comme "Jadielle" dans l'exemple utilisateur)
// - routes / donjons / mer : MIN_WINS_DEFAULT (10) combats sauvages à
//   remporter DANS le lieu pour débloquer les lieux connectés (via `conn`).
// La propagation est gérée dans display/map.js (locReachable).
// ============================================================
const MIN_WINS_DEFAULT = 10;
(function attachMinWins(){
  const apply = (obj)=>{ for(const id in obj){ const loc=obj[id]; if(!loc) continue; loc.minWins = (loc.type==='town') ? 0 : MIN_WINS_DEFAULT; } };
  apply(LOCS); apply(LOCS_JOHTO);
})();

// ============================================================
// ROUTES SCINDÉES EN PLUSIEURS SEGMENTS (ex: Route 2 = route2 + route2_south,
// Johto Route 32 = jroute32 + jroute32_mid + jroute32_south) :
//  - elles partagent le meme nom -> reliees par un `group` (une quete de la
//    route compte les combat sur TOUS les segments)
//  - elles partagent la meme liste de Pokemon sauvages (coherence de la route,
//    meme especes d'un bout a l'autre)
// ============================================================
(function linkSplitRoutes(){
  for(const obj of [LOCS, LOCS_JOHTO]){
    const byName = {};
    for(const id in obj){ const loc=obj[id]; if(!loc||!loc.name) continue; (byName[loc.name]=byName[loc.name]||[]).push(id); }
    for(const name in byName){
      const ids = byName[name];
      if(ids.length < 2) continue;
      const primary = ids[0];
      const baseWild = obj[primary].wild || [];
      for(const id of ids){
        obj[id].group = primary;                 // lien de quete (ex: 'route2', 'jroute32')
        if(id !== primary) obj[id].wild = baseWild.slice(); // meme Pokemon sur tous les segments
      }
    }
  }
})();

// ============================================================
// SHOPS
// ============================================================
function getShopName(id){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const sh = SHOPS[id];
  if(!sh) return id || 'Boutique';
  return lang === 'en' ? (sh.name_en || sh.name || id) : (sh.name_fr || sh.name || id);
}

const SHOPS = {
  pallet:    {name_fr:'Boutique Palette',  name_en:'Pallet Shop',     items:['berry_oran','berry_ceriz']},
  viridian:  {name_fr:'Boutique Jadielle', name_en:'Viridian Mart',   items:['berry_oran','berry_sitrus','berry_ceriz','berry_prine']},
  pewter:    {name_fr:'Boutique Argenta',  name_en:'Pewter Mart',     items:['berry_sitrus','berry_prine','muscle_band','metal_coat']},
  cerulean:  {name_fr:'Boutique Azuria',   name_en:'Cerulean Mart',   items:['berry_oran','berry_ceriz','soft_sand','focus_lens']},
  vermilion: {name_fr:'Boutique Carmin',   name_en:'Vermilion Mart',  items:['muscle_band','metal_coat','soft_sand','focus_lens']},
  lavender:  {name_fr:'Boutique Lavanville',name_en:'Lavender Mart',  items:['berry_oran','berry_sitrus','power_gem']},
  celadon:   {name_fr:'Centre Commercial', name_en:'Dept. Store',     items:['firestone','waterstone','thunderstone','leafstone','moonstone','berry_oran','berry_sitrus','berry_ceriz','berry_prine','rarecandy','muscle_band','metal_coat','soft_sand','focus_lens','power_gem','swift_charm']},
  fuchsia:   {name_fr:'Boutique Parmanie', name_en:'Fuchsia Mart',    items:['berry_ceriz','soft_sand','swift_charm']},
  cinnabar:  {name_fr:'Labo Cramois\'île', name_en:'Cinnabar Lab Shop',items:['muscle_band','focus_lens','power_gem','swift_charm']},
  indigo:    {name_fr:'Boutique Plateau',  name_en:'Indigo Mart',     items:['chroma_charm','rarecandy','choice_band','choice_specs','choice_scarf','life_orb','assault_vest','eviolite','leftovers','power_gem','swift_charm','muscle_band','metal_coat','soft_sand','focus_lens']},
  // ---- Boutiques EXCLUSIVES JOHTO (objets Or/Argent) ----
  jnewbark:   {name_fr:'Labo du Prof. Orme', name_en:"Prof. Elm's Lab", items:['berry_oran','berry_sitrus','berry_ceriz','berry_prine','rarecandy']},
  jcherrygrove:{name_fr:'Boutique Ville Griotte', name_en:'Cherrygrove Mart', items:['berry_oran','berry_ceriz','rarecandy']},
  jviolet:    {name_fr:'Boutique Argenta', name_en:'Violet Mart', items:['berry_sitrus','muscle_band','twisted_spoon','miracle_seed']},
  jazalea:    {name_fr:'Boutique Écorcia', name_en:'Azalea Mart', items:['berry_prine','soft_sand','spell_tag','poison_barb']},
  jgoldenrod: {name_fr:'Grand Magasin Doublonville', name_en:'Goldenrod Dept. Store', items:['rarecandy','sunstone','kings_rock','dragon_scale','up_grade','deep_sea_scale','deep_sea_tooth','twisted_spoon','thick_club','black_belt','black_glasses','charcoal','dragon_fang','miracle_seed','mystic_water','never_melt_ice','sharp_beak','poison_barb','spell_tag','hard_stone','magnet','silk_scarf','silver_wing','rainbow_wing','choice_band','choice_specs','life_orb','leftovers']},
  jecruteak:  {name_fr:'Boutique Rosalia', name_en:'Ecruteak Mart', items:['berry_prine','spell_tag','never_melt_ice','mystic_water']},
  jolivine:   {name_fr:'Boutique Oliville', name_en:'Olivine Mart', items:['berry_oran','leftovers','mystic_water','hard_stone']},
  jcianwood:  {name_fr:'Boutique Irisia', name_en:'Cianwood Mart', items:['berry_sitrus','black_belt','charcoal','magnet']},
  jmahogany:  {name_fr:'Boutique Acajou', name_en:'Mahogany Mart', items:['berry_prine','up_grade','deep_sea_scale','deep_sea_tooth','dragon_fang']},
  jblackthorn:{name_fr:'Boutique Ébénelle', name_en:'Blackthorn Mart', items:['rarecandy','dragon_scale','dragon_fang','twisted_spoon','kings_rock']},
};

// ============================================================
// CHAMPIONS
// ============================================================
const LEAGUE_TRAINERS = [
  { id: 'lorelei', name: 'Olga (Conseil 4 Glace)', title: 'Conseil 4 Glace/Eau', team: [[86,54], [91,53], [80,54], [124,56], [131,56]] },
  { id: 'bruno', name: 'Aldo (Conseil 4 Combat)', title: 'Conseil 4 Combat/Roche', team: [[95,53], [107,55], [106,55], [76,56], [68,58]] },
  { id: 'agatha', name: 'Agatha (Conseil 4 Spectre)', title: 'Conseil 4 Spectre/Poison', team: [[93,56], [42,56], [93,55], [24,58], [94,60]] },
  { id: 'lance', name: 'Peter (Conseil 4 Dragon)', title: 'Conseil 4 Dragon', team: [[130,58], [148,56], [148,56], [142,60], [149,62]] },
  { id: 'blue', name: 'Bleu (Maître Kanto)', title: 'Maître de la Ligue Kanto', team: [[18,61], [65,59], [112,61], [59,61], [103,63], [6,65]] }
];

const CHAMPIONS = {
  brock: {name:'Pierre (Brock)', title:'Champion Arène Argenta',badge:'boulder',badgeName:'Pierre Badge',badgeEmoji:'🪨',
    reward:1500, team:[createPoke(74,12), createPoke(95,14)]},
  misty: {name:'Ondine (Misty)', title:'Championne Arène Azuria',badge:'cascade',badgeName:'Cascade Badge',badgeEmoji:'💧',
    reward:2000, team:[createPoke(120,18), createPoke(121,21)]},
  surge: {name:'Surge (Lt. Surge)', title:'Champion Arène Carmin',badge:'thunder',badgeName:'Foudre Badge',badgeEmoji:'⚡',
    reward:2500, team:[createPoke(100,21), createPoke(25,18), createPoke(26,24)]},
  erika: {name:'Erika', title:'Championne Arène Céladopole',badge:'rainbow',badgeName:'Arc-en-Ciel Badge',badgeEmoji:'🌈',
    reward:3000, team:[createPoke(71,29), createPoke(114,24), createPoke(45,29)]},
  koga: {name:'Koga', title:'Champion Arène Parmanie',badge:'soul',badgeName:'Âme Badge',badgeEmoji:'💜',
    reward:3500, team:[createPoke(109,37), createPoke(89,39), createPoke(109,37), createPoke(110,43)]},
  sabrina: {name:'Morgane (Sabrina)', title:'Championne Arène Safrania',badge:'marsh',badgeName:'Marais Badge',badgeEmoji:'🔮',
    reward:3800, badgeReq:3, team:[createPoke(64,38), createPoke(122,37), createPoke(49,38), createPoke(65,43)]},
  blaine:{name:'Pyro (Blaine)', title:'Champion Arène Cramois\'île',badge:'volcano',badgeName:'Volcan Badge',badgeEmoji:'🌋',
    reward:4000, team:[createPoke(58,42), createPoke(77,40), createPoke(78,42), createPoke(59,47)]},
  giovanni:{name:'Giovanni', title:'Champion Arène Jadielle',badge:'earth',badgeName:'Terre Badge',badgeEmoji:'🌍',
    reward:5000, badgeReq:6, team:[createPoke(111,45), createPoke(51,42), createPoke(31,44), createPoke(34,45), createPoke(112,50)]},
  elite4: {name:'Élite 4 + Champion Bleu',title:'Ligue Kanto',badge:'champion',badgeName:'Titre Champion',badgeEmoji:'🏆',
    reward:15000, badgeReq:8, team:[
      createPoke(87,54), createPoke(131,56),
      createPoke(95,55), createPoke(68,58),
      createPoke(94,56), createPoke(24,58),
      createPoke(148,58), createPoke(149,62),
      createPoke(65,63), createPoke(103,63), createPoke(59,63), createPoke(130,63), createPoke(6,65)
    ]},
  falkner: {name:'Albert (Falkner)', title:'Champion Arène Mauville',badge:'zephyr',badgeName:'Zéphyr Badge',badgeEmoji:'🪽',
    reward:1800, badgeReq:0, team:[createPoke(16,13), createPoke(18,15)]},
  bugsy:   {name:'Hector (Bugsy)', title:'Champion Arène Écorcia',badge:'hive',badgeName:'Essaim Badge',badgeEmoji:'🐞',
    reward:2200, badgeReq:0, team:[createPoke(11,15), createPoke(14,15), createPoke(123,17)]},
  whitney: {name:'Blanche (Whitney)', title:'Championne Arène Doublonville',badge:'plain',badgeName:'Plaine Badge',badgeEmoji:'🐮',
    reward:2600, badgeReq:0, team:[createPoke(35,18), createPoke(36,20)]},
  morty:   {name:'Mortimer (Morty)', title:'Champion Arène Rosalia',badge:'fog',badgeName:'Brume Badge',badgeEmoji:'👻',
    reward:3200, badgeReq:0, team:[createPoke(92,21), createPoke(93,23), createPoke(94,25)]},
  chuck:   {name:'Chuck', title:'Champion Arène Irisia',badge:'storm',badgeName:'Choc Badge',badgeEmoji:'🥊',
    reward:3800, badgeReq:0, team:[createPoke(56,27), createPoke(62,30)]},
  jasmine: {name:'Jasmine', title:'Championne Arène Oliville',badge:'mineral',badgeName:'Minéral Badge',badgeEmoji:'⚙️',
    reward:4200, badgeReq:0, team:[createPoke(81,30), createPoke(82,35)]},
  pryce:   {name:'Frédo (Pryce)', title:'Champion Arène Acajou',badge:'glacier',badgeName:'Glacier Badge',badgeEmoji:'❄️',
    reward:4800, badgeReq:0, team:[createPoke(86,32), createPoke(87,34), createPoke(131,36)]},
  clair:   {name:'Sandra (Clair)', title:'Championne Arène Ébénelle',badge:'rising',badgeName:'Lever Badge',badgeEmoji:'🐉',
    reward:5500, badgeReq:0, team:[createPoke(147,37), createPoke(148,39), createPoke(130,40)]}
};

// Route drop tables — uniquement des baies (les objets classiques sont supprimés)
const ROUTE_DROPS = {
  pallet:['berry_oran'],
  route1:['berry_oran','berry_ceriz'], route22:['berry_oran','berry_ceriz'],
  route2:['berry_oran','berry_sitrus'], route3:['berry_sitrus','berry_prine'],
  route9:['berry_sitrus','berry_prine'], route24:['berry_oran','berry_ceriz'],
  route12:['berry_prine','berry_ceriz'], route16:['berry_sitrus','berry_prine'],
  route19:['berry_oran','berry_ceriz'], route21:['berry_oran','berry_sitrus'],
  route23:['berry_sitrus','berry_prine','berry_ceriz'],
};

// ============================================================
// ROUTES SCINDÉES — ITEMS IDENTIQUES SUR TOUS LES SEGMENTS
// (ex: Route 2 = route2 + route2_south ; Johto Route 32 = 3 segments).
// Comme pour les Pokémon sauvages (linkSplitRoutes), les objets obtenus
// (ROUTE_DROPS) sont copiés depuis le segment principal sur tous les
// segments du meme groupe, pour que chaque morceau de route link soit
// strictement identique (meme Pokemon, meme items).
// ============================================================
(function linkSplitRouteDrops(){
  for(const obj of [LOCS, LOCS_JOHTO]){
    const byName = {};
    for(const id in obj){ const loc=obj[id]; if(!loc||!loc.name) continue; (byName[loc.name]=byName[loc.name]||[]).push(id); }
    for(const name in byName){
      const ids = byName[name];
      if(ids.length < 2) continue;
      const primary = ids[0];
      const base = (ROUTE_DROPS[primary] || []).slice();
      for(const id of ids){ if(id !== primary) ROUTE_DROPS[id] = base; }
    }
  }
})();


// ============================================================
// POPULATION SAUVAGE JOHTO (ajout regional - ordre officiel Or/Argent)
// Applique APRES linkSplitRoutes pour peupler les lieux Johto.
(function populateJohtoWild(){
  if(typeof LOCS_JOHTO === 'undefined') return;
  if(LOCS_JOHTO['jroute29']) LOCS_JOHTO['jroute29'].wild = [[161, 3, 6, 'common'], [16, 3, 6, 'common'], [19, 3, 6, 'common']];
  if(LOCS_JOHTO['jroute30']) LOCS_JOHTO['jroute30'].wild = [[10, 4, 7, 'common'], [13, 4, 7, 'common'], [16, 4, 7, 'common'], [161, 4, 7, 'uncommon']];
  if(LOCS_JOHTO['jroute31']) LOCS_JOHTO['jroute31'].wild = [[163, 5, 9, 'common'], [41, 5, 9, 'common'], [19, 5, 9, 'uncommon']];
  if(LOCS_JOHTO['jroute32']) LOCS_JOHTO['jroute32'].wild = [[19, 6, 10, 'common'], [69, 6, 10, 'common'], [41, 6, 10, 'uncommon']];
  if(LOCS_JOHTO['jroute32_mid']) LOCS_JOHTO['jroute32_mid'].wild = [[19, 6, 10, 'common'], [69, 6, 10, 'common'], [41, 6, 10, 'uncommon']];
  if(LOCS_JOHTO['jroute32_south']) LOCS_JOHTO['jroute32_south'].wild = [[19, 6, 10, 'common'], [69, 6, 10, 'common'], [41, 6, 10, 'uncommon']];
  if(LOCS_JOHTO['unioncave']) LOCS_JOHTO['unioncave'].wild = [[41, 8, 12, 'common'], [74, 8, 12, 'common'], [95, 10, 14, 'rare']];
  if(LOCS_JOHTO['jroute33']) LOCS_JOHTO['jroute33'].wild = [[19, 9, 13, 'common'], [16, 9, 13, 'common']];
  if(LOCS_JOHTO['ilexforest']) LOCS_JOHTO['ilexforest'].wild = [[10, 10, 14, 'common'], [13, 10, 14, 'common'], [43, 10, 14, 'common'], [69, 11, 15, 'uncommon']];
  if(LOCS_JOHTO['jroute34']) LOCS_JOHTO['jroute34'].wild = [[16, 12, 16, 'common'], [19, 12, 16, 'common'], [63, 12, 16, 'uncommon'], [29, 12, 16, 'uncommon']];
  if(LOCS_JOHTO['jroute35']) LOCS_JOHTO['jroute35'].wild = [[16, 14, 18, 'common'], [19, 14, 18, 'common'], [39, 14, 18, 'uncommon'], [29, 14, 18, 'uncommon']];
  if(LOCS_JOHTO['jroute36']) LOCS_JOHTO['jroute36'].wild = [[29, 15, 20, 'common'], [39, 15, 20, 'common'], [69, 15, 20, 'uncommon']];
  if(LOCS_JOHTO['jroute38']) LOCS_JOHTO['jroute38'].wild = [[20, 16, 21, 'common'], [88, 16, 21, 'common'], [109, 18, 23, 'uncommon']];
  if(LOCS_JOHTO['jroute40']) LOCS_JOHTO['jroute40'].wild = [[72, 18, 24, 'common'], [129, 18, 24, 'common'], [98, 18, 24, 'uncommon']];
  if(LOCS_JOHTO['jroute42']) LOCS_JOHTO['jroute42'].wild = [[203, 20, 26, 'common'], [20, 20, 26, 'common'], [21, 20, 26, 'uncommon']];
  if(LOCS_JOHTO['jroute43']) LOCS_JOHTO['jroute43'].wild = [[218, 20, 26, 'common'], [219, 22, 28, 'common'], [220, 22, 28, 'uncommon']];
  if(LOCS_JOHTO['lakerage']) LOCS_JOHTO['lakerage'].wild = [[129, 22, 28, 'common'], [130, 25, 32, 'rare']];
  if(LOCS_JOHTO['jroute44']) LOCS_JOHTO['jroute44'].wild = [[131, 24, 30, 'common'], [220, 24, 30, 'common'], [221, 26, 34, 'rare']];
  if(LOCS_JOHTO['jroute45']) LOCS_JOHTO['jroute45'].wild = [[169, 25, 32, 'common'], [74, 25, 32, 'common'], [111, 26, 34, 'uncommon']];
  if(LOCS_JOHTO['jroute26']) LOCS_JOHTO['jroute26'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common']];
  if(LOCS_JOHTO['jroute27']) LOCS_JOHTO['jroute27'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common'], [21, 30, 35, 'uncommon']];
  if(LOCS_JOHTO['jroute28']) LOCS_JOHTO['jroute28'].wild = [[20, 30, 35, 'common'], [112, 32, 36, 'uncommon'], [22, 30, 35, 'uncommon']];
  if(LOCS_JOHTO['jroute37']) LOCS_JOHTO['jroute37'].wild = [[163, 12, 18, 'common'], [43, 12, 18, 'common'], [69, 13, 19, 'uncommon']];
  if(LOCS_JOHTO['jroute39']) LOCS_JOHTO['jroute39'].wild = [[241, 14, 20, 'common'], [128, 14, 20, 'common'], [16, 14, 20, 'common']];
  if(LOCS_JOHTO['jroute41']) LOCS_JOHTO['jroute41'].wild = [[72, 18, 24, 'common'], [129, 18, 24, 'common'], [73, 19, 25, 'uncommon']];
  if(LOCS_JOHTO['jroute46']) LOCS_JOHTO['jroute46'].wild = [[16, 28, 34, 'common'], [19, 28, 34, 'common'], [21, 28, 34, 'uncommon']];
  if(LOCS_JOHTO['jroute47']) LOCS_JOHTO['jroute47'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common']];
  if(LOCS_JOHTO['jroute48']) LOCS_JOHTO['jroute48'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common']];
  if(LOCS_JOHTO['nationalpark']) LOCS_JOHTO['nationalpark'].wild = [[191, 15, 19, 'common'], [43, 15, 19, 'common'], [123, 18, 22, 'rare'], [127, 18, 22, 'rare']];
  if(LOCS_JOHTO['sprouttower']) LOCS_JOHTO['sprouttower'].wild = [[19, 10, 14, 'common'], [92, 12, 16, 'uncommon']];
  if(LOCS_JOHTO['ruinsofalph']) LOCS_JOHTO['ruinsofalph'].wild = [[201, 15, 20, 'common'], [41, 15, 20, 'uncommon']];
  if(LOCS_JOHTO['burnedtower']) LOCS_JOHTO['burnedtower'].wild = [[92, 18, 24, 'common'], [109, 18, 24, 'uncommon']];
  if(LOCS_JOHTO['tintower']) LOCS_JOHTO['tintower'].wild = [[92, 20, 26, 'common'], [109, 20, 26, 'uncommon']];
  if(LOCS_JOHTO['mtmortar']) LOCS_JOHTO['mtmortar'].wild = [[41, 20, 26, 'common'], [74, 20, 26, 'common'], [169, 22, 28, 'uncommon']];
  if(LOCS_JOHTO['icepath']) LOCS_JOHTO['icepath'].wild = [[124, 25, 32, 'common'], [220, 25, 32, 'common'], [221, 26, 34, 'rare']];
  if(LOCS_JOHTO['darkcave']) LOCS_JOHTO['darkcave'].wild = [[41, 18, 24, 'common'], [169, 18, 24, 'uncommon']];
  if(LOCS_JOHTO['slowpokewell']) LOCS_JOHTO['slowpokewell'].wild = [[79, 20, 26, 'common'], [80, 22, 28, 'uncommon']];
  if(LOCS_JOHTO['whirlislands']) LOCS_JOHTO['whirlislands'].wild = [[72, 18, 24, 'common'], [129, 18, 24, 'common']];
  // Trio légendaire (Raikou / Entei / Suicune) : ils ERRENT désormais (roaming),
  // exactement comme le trio d'oiseaux de Kanto — aucune rencontre fixe sur une
  // route. Ils apparaissent en 1% lors des combats sauvages sur une route en
  // extérieur de Johto (rotation 12h, voir getRoamingLegendaryForRoute).
  if(LOCS_JOHTO['victoryroad_jo']) LOCS_JOHTO['victoryroad_jo'].wild = [[95, 30, 36, 'common'], [169, 32, 38, 'common'], [111, 30, 36, 'uncommon']];
  if(LOCS_JOHTO['mtsilver']) LOCS_JOHTO['mtsilver'].wild = [[246, 40, 46, 'common'], [247, 42, 48, 'common'], [112, 40, 46, 'uncommon']];
  if(LOCS_JOHTO['tohjofalls']) LOCS_JOHTO['tohjofalls'].wild = [[129, 28, 34, 'common'], [130, 30, 36, 'rare']];
})();

// ============================================================================
// PART 2: GAMEPLAY ENGINE & CORE MECHANICS
// Can be separated into engine.js. Contains game state definitions, calculation
// formulas, party rules, mining mechanics, shop transactions, and real-time combat engine.
// ============================================================================

// GAME STATE
