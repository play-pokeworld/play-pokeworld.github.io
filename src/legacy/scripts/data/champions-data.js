const LEAGUE_TRAINERS = [
 { id: 'lorelei', name: 'Olga (Conseil 4 Glace)', title: 'Conseil 4 Glace/Eau', team: [[86,54], [91,53], [80,54], [124,56], [131,56]] },
 { id: 'bruno', name: 'Aldo (Conseil 4 Combat)', title: 'Conseil 4 Combat/Roche', team: [[95,53], [107,55], [106,55], [76,56], [68,58]] },
 { id: 'agatha', name: 'Agatha (Conseil 4 Spectre)', title: 'Conseil 4 Spectre/Poison', team: [[93,56], [42,56], [93,55], [24,58], [94,60]] },
 { id: 'lance', name: 'Peter (Conseil 4 Dragon)', title: 'Conseil 4 Dragon', team: [[130,58], [148,56], [148,56], [142,60], [149,62]] },
 { id: 'blue', name: 'Bleu (Maître Kanto)', title: 'Maître de la Ligue Kanto', team: [[18,61], [65,59], [112,61], [59,61], [103,63], [6,65]] }
];


const JOHTO_LEAGUE_TRAINERS = [
 { id: 'will', name: 'Clément (Conseil 4 Psy)', title: 'Conseil 4 Psy', team: [[178,40], [103,41], [80,41], [124,42], [178,42]] },
 { id: 'koga_e4', name: 'Koga (Conseil 4 Poison)', title: 'Conseil 4 Poison', team: [[168,40], [49,41], [89,42], [169,44], [205,43]] },
 { id: 'bruno_johto', name: 'Aldo (Conseil 4 Combat)', title: 'Conseil 4 Combat', team: [[237,42], [95,43], [107,43], [106,43], [68,46]] },
 { id: 'karen', name: 'Marion (Conseil 4 Ténèbres)', title: 'Conseil 4 Ténèbres', team: [[197,42], [45,42], [198,44], [94,45], [229,47]] },
 { id: 'lance_johto', name: 'Peter (Maître Johto)', title: 'Maître de la Ligue Johto', team: [[130,44], [149,47], [6,46], [142,46], [148,47], [149,50]] }
];

function getLeagueTrainersForRegion(region){ return region === 'johto' ? JOHTO_LEAGUE_TRAINERS : LEAGUE_TRAINERS; }

function trainerPoke(id, level, opts={}){
 const p = createPoke(id, level, !!opts.shiny);
 if(!p) return p;
 if(opts.moves) p.moves = opts.moves.filter(m => MOVES && MOVES[m]).slice(0,4).map(m => ({id:m}));
 if(opts.talent) p.talent = opts.talent;
 if(opts.item) p.heldItem = opts.item;
 if(opts.evs) p.evs = Object.assign({hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, opts.evs);
 if(opts.ivs) p.ivs = Object.assign({hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, opts.ivs);
 try{ recalcPokeStats(p); p.currentHP = p.maxHP; }catch(_){}
 return p;
}

const CHAMPIONS = {
 brock: {badge:'boulder',badgeEmoji:'', strategy:['rock','defense'],
 reward:1500, badgeReq:0, team:[trainerPoke(74,12,{talent:'sturdy',moves:['rockthrow','tackle','defensecurl']}), trainerPoke(95,14,{talent:'sturdy',moves:['rockthrow','dig','tackle']})]},
 misty: {badge:'cascade',badgeEmoji:'', strategy:['water','speed','special'],
 reward:2000, badgeReq:1, team:[trainerPoke(120,18,{talent:'naturalcure',moves:['watergun','quickattack','confusion']}), trainerPoke(121,21,{talent:'analytic',moves:['watergun','psybeam','bubble','recover']})]},
 surge: {badge:'thunder',badgeEmoji:'', strategy:['electric','speed','paralysis'],
 reward:2500, badgeReq:2, team:[trainerPoke(100,21,{talent:'static',moves:['thundershock','thunderwave','quickattack']}), trainerPoke(25,20,{talent:'static',moves:['thundershock','quickattack','irontail']}), trainerPoke(26,24,{talent:'lightningrod',moves:['thunderbolt','quickattack','irontail','thunderwave']})]},
 erika: {badge:'rainbow',badgeEmoji:'🌈', strategy:['grass','poison','drain'],
 reward:3000, badgeReq:3, team:[trainerPoke(71,29,{talent:'chlorophyll',moves:['razorleaf','sludgebomb','poisonsting']}), trainerPoke(114,26,{talent:'regenerator',moves:['vinewhip','absorb','sludgebomb']}), trainerPoke(45,30,{talent:'effectspore',moves:['razorleaf','sludgebomb','poisonsting']})]},
 koga: {badge:'soul',badgeEmoji:'💜', strategy:['poison','status','tank'],
 reward:3500, badgeReq:4, team:[trainerPoke(109,37,{talent:'levitate',moves:['sludgebomb','toxic','smokescreen']}), trainerPoke(89,39,{talent:'poisontouch',moves:['sludgebomb','bodyslam','toxic']}), trainerPoke(109,37,{talent:'levitate',moves:['sludgebomb','toxic','flamethrower']}), trainerPoke(110,43,{talent:'levitate',moves:['sludgebomb','toxic','flamethrower','shadowball']})]},
 sabrina: {badge:'marsh',badgeEmoji:'', strategy:['psychic','speed','special'],
 reward:3800, badgeReq:5, team:[trainerPoke(64,38,{talent:'synchronize',moves:['psybeam','shadowball','confusion']}), trainerPoke(122,37,{talent:'filter',moves:['psychic','dazzlinggleam','confusion']}), trainerPoke(49,38,{talent:'tintedlens',moves:['psybeam','sludgebomb','bugbite']}), trainerPoke(65,43,{talent:'magicguard',moves:['psychic','shadowball','psybeam','recover']})]},
 blaine:{badge:'volcano',badgeEmoji:'🌋', strategy:['fire','burn','offense'],
 reward:4000, badgeReq:6, team:[trainerPoke(58,42,{talent:'intimidate',moves:['flamethrower','bite','quickattack']}), trainerPoke(77,40,{talent:'flashfire',moves:['flamethrower','quickattack','bodyslam']}), trainerPoke(78,42,{talent:'flashfire',moves:['fireblast','megapunch','quickattack']}), trainerPoke(59,47,{talent:'intimidate',moves:['fireblast','flamethrower','bodyslam','bite']})]},
 giovanni:{badge:'earth',badgeEmoji:'🌍', strategy:['ground','bulk','coverage'],
 reward:5000, badgeReq:7, team:[trainerPoke(111,45,{talent:'rockhead',moves:['earthquake','rockthrow','bodyslam']}), trainerPoke(51,42,{talent:'arenatrap',moves:['earthquake','slash','rockslide']}), trainerPoke(31,44,{talent:'poisonpoint',moves:['earthquake','sludgebomb','bodyslam']}), trainerPoke(34,45,{talent:'sheerforce',moves:['earthquake','sludgebomb','thunderbolt']}), trainerPoke(112,50,{talent:'lightningrod',moves:['earthquake','stoneedge','bodyslam','hornattack']})]},
 elite4: {name:'Ligue Kanto', badge:'champion',badgeEmoji:'', reward:15000, badgeReq:8, team:[
 createPoke(87,54), createPoke(131,56), createPoke(95,55), createPoke(68,58), createPoke(94,56), createPoke(24,58), createPoke(148,58), createPoke(149,62), createPoke(65,63), createPoke(103,63), createPoke(59,63), createPoke(130,63), createPoke(6,65)
 ]},
 johto_elite4: {name:'Ligue Johto', badge:'johto_champion',badgeEmoji:'', region:'johto', reward:18000, badgeReq:8, team:[ createPoke(178,42), createPoke(205,43), createPoke(237,43), createPoke(229,47), createPoke(149,50) ]},
 falkner: {region:'johto', badge:'zephyr',badgeEmoji:'🪽', strategy:['flying','speed'], reward:1800, badgeReq:0, team:[trainerPoke(16,13,{talent:'keeneye',moves:['gust','quickattack']}), trainerPoke(18,15,{talent:'tangledfeet',moves:['gust','quickattack','wingattack']})]},
 bugsy: {region:'johto', badge:'hive',badgeEmoji:'🐞', strategy:['bug','tempo'], reward:2200, badgeReq:1, team:[trainerPoke(11,15,{talent:'shedskin',moves:['stringshot','bugbite']}), trainerPoke(14,15,{talent:'shedskin',moves:['poisonsting','bugbite']}), trainerPoke(123,17,{talent:'technician',moves:['bugbite','wingattack','quickattack']})]},
 whitney: {region:'johto', badge:'plain',badgeEmoji:'🐮', strategy:['normal','bulk'], reward:2600, badgeReq:2, team:[trainerPoke(35,18,{talent:'cutecharm',moves:['bodyslam','dazzlinggleam']}), trainerPoke(36,20,{talent:'magicguard',moves:['bodyslam','moonblast','icebeam']})]},
 morty: {region:'johto', badge:'fog',badgeEmoji:'', strategy:['ghost','status'], reward:3200, badgeReq:3, team:[trainerPoke(92,21,{talent:'levitate',moves:['lick','shadowball']}), trainerPoke(93,23,{talent:'levitate',moves:['shadowball','nightshade']}), trainerPoke(94,25,{talent:'cursedbody',moves:['shadowball','nightshade','psychic']})]},
 chuck: {region:'johto', badge:'storm',badgeEmoji:'🥊', strategy:['fighting','physical'], reward:3800, badgeReq:4, team:[trainerPoke(56,27,{talent:'vitalspirit',moves:['karatechop','rockslide']}), trainerPoke(62,30,{talent:'waterabsorb',moves:['surf','karatechop','icebeam']})]},
 jasmine: {region:'johto', badge:'mineral',badgeEmoji:'', strategy:['steel','defense'], reward:4200, badgeReq:5, team:[trainerPoke(81,30,{talent:'sturdy',moves:['thunderbolt','metalclaw']}), trainerPoke(82,35,{talent:'magnetpull',moves:['thunderbolt','irontail']}), trainerPoke(208,35,{talent:'sturdy',moves:['irontail','earthquake','rockthrow']})]},
 pryce: {region:'johto', badge:'glacier',badgeEmoji:'❄', strategy:['ice','water'], reward:4800, badgeReq:6, team:[trainerPoke(86,32,{talent:'thickfat',moves:['icebeam','watergun']}), trainerPoke(87,34,{talent:'thickfat',moves:['icebeam','surf']}), trainerPoke(131,36,{talent:'waterabsorb',moves:['icebeam','surf','bodyslam']})]},
 clair: {region:'johto', badge:'rising',badgeEmoji:'', strategy:['dragon','boss'], reward:5500, badgeReq:7, team:[trainerPoke(147,37,{talent:'shedskin',moves:['dragonbreath','surf']}), trainerPoke(148,39,{talent:'shedskin',moves:['dragonbreath','thunderbolt']}), trainerPoke(130,40,{talent:'intimidate',moves:['surf','bite','dragonbreath']}), trainerPoke(230,42,{talent:'sniper',moves:['surf','dragonbreath','icebeam']})]}
};


// --- Migrated to ES module, globals exposed ---
if (typeof LEAGUE_TRAINERS !== 'undefined' && typeof window !== 'undefined') window.LEAGUE_TRAINERS = LEAGUE_TRAINERS;
if (typeof JOHTO_LEAGUE_TRAINERS !== 'undefined' && typeof window !== 'undefined') window.JOHTO_LEAGUE_TRAINERS = JOHTO_LEAGUE_TRAINERS;
if (typeof getLeagueTrainersForRegion !== 'undefined' && typeof window !== 'undefined') window.getLeagueTrainersForRegion = getLeagueTrainersForRegion;


