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

const CHAMPIONS = {
 brock: {badge:'boulder',badgeEmoji:'',
 reward:1500, badgeReq:0, team:[createPoke(74,12), createPoke(95,14)]},
 misty: {badge:'cascade',badgeEmoji:'',
 reward:2000, badgeReq:1, team:[createPoke(120,18), createPoke(121,21)]},
 surge: {badge:'thunder',badgeEmoji:'',
 reward:2500, badgeReq:2, team:[createPoke(100,21), createPoke(25,18), createPoke(26,24)]},
 erika: {badge:'rainbow',badgeEmoji:'🌈',
 reward:3000, badgeReq:3, team:[createPoke(71,29), createPoke(114,24), createPoke(45,29)]},
 koga: {badge:'soul',badgeEmoji:'💜',
 reward:3500, badgeReq:4, team:[createPoke(109,37), createPoke(89,39), createPoke(109,37), createPoke(110,43)]},
 sabrina: {badge:'marsh',badgeEmoji:'',
 reward:3800, badgeReq:5, team:[createPoke(64,38), createPoke(122,37), createPoke(49,38), createPoke(65,43)]},
 blaine:{badge:'volcano',badgeEmoji:'🌋',
 reward:4000, badgeReq:6, team:[createPoke(58,42), createPoke(77,40), createPoke(78,42), createPoke(59,47)]},
 giovanni:{badge:'earth',badgeEmoji:'🌍',
 reward:5000, badgeReq:7, team:[createPoke(111,45), createPoke(51,42), createPoke(31,44), createPoke(34,45), createPoke(112,50)]},
 elite4: {name:'Ligue Kanto', badge:'champion',badgeEmoji:'',
 reward:15000, badgeReq:8, team:[
 createPoke(87,54), createPoke(131,56),
 createPoke(95,55), createPoke(68,58),
 createPoke(94,56), createPoke(24,58),
 createPoke(148,58), createPoke(149,62),
 createPoke(65,63), createPoke(103,63), createPoke(59,63), createPoke(130,63), createPoke(6,65)
 ]},
 johto_elite4: {name:'Ligue Johto', badge:'johto_champion',badgeEmoji:'', region:'johto', reward:18000, badgeReq:8, team:[
 createPoke(178,42), createPoke(205,43), createPoke(237,43), createPoke(229,47), createPoke(149,50)
 ]},
 falkner: {region:'johto', badge:'zephyr',badgeEmoji:'🪽',
 reward:1800, badgeReq:0, team:[createPoke(16,13), createPoke(18,15)]},
 bugsy: {region:'johto', badge:'hive',badgeEmoji:'🐞',
 reward:2200, badgeReq:1, team:[createPoke(11,15), createPoke(14,15), createPoke(123,17)]},
 whitney: {region:'johto', badge:'plain',badgeEmoji:'🐮',
 reward:2600, badgeReq:2, team:[createPoke(35,18), createPoke(36,20)]},
 morty: {region:'johto', badge:'fog',badgeEmoji:'',
 reward:3200, badgeReq:3, team:[createPoke(92,21), createPoke(93,23), createPoke(94,25)]},
 chuck: {region:'johto', badge:'storm',badgeEmoji:'🥊',
 reward:3800, badgeReq:4, team:[createPoke(56,27), createPoke(62,30)]},
 jasmine: {region:'johto', badge:'mineral',badgeEmoji:'',
 reward:4200, badgeReq:5, team:[createPoke(81,30), createPoke(82,35)]},
 pryce: {region:'johto', badge:'glacier',badgeEmoji:'❄',
 reward:4800, badgeReq:6, team:[createPoke(86,32), createPoke(87,34), createPoke(131,36)]},
 clair: {region:'johto', badge:'rising',badgeEmoji:'',
 reward:5500, badgeReq:7, team:[createPoke(147,37), createPoke(148,39), createPoke(130,40)]}
};


// --- Migrated to ES module, globals exposed ---
if (typeof LEAGUE_TRAINERS !== 'undefined' && typeof window !== 'undefined') window.LEAGUE_TRAINERS = LEAGUE_TRAINERS;
if (typeof JOHTO_LEAGUE_TRAINERS !== 'undefined' && typeof window !== 'undefined') window.JOHTO_LEAGUE_TRAINERS = JOHTO_LEAGUE_TRAINERS;
if (typeof getLeagueTrainersForRegion !== 'undefined' && typeof window !== 'undefined') window.getLeagueTrainersForRegion = getLeagueTrainersForRegion;

export {};
