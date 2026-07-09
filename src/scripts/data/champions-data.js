// ============================================================
// LEAGUE_TRAINERS + CHAMPIONS — gym leaders & league
// ============================================================
const LEAGUE_TRAINERS = [
  { id: 'lorelei', name: 'Olga (Conseil 4 Glace)', title: 'Conseil 4 Glace/Eau', team: [[86,54], [91,53], [80,54], [124,56], [131,56]] },
  { id: 'bruno', name: 'Aldo (Conseil 4 Combat)', title: 'Conseil 4 Combat/Roche', team: [[95,53], [107,55], [106,55], [76,56], [68,58]] },
  { id: 'agatha', name: 'Agatha (Conseil 4 Spectre)', title: 'Conseil 4 Spectre/Poison', team: [[93,56], [42,56], [93,55], [24,58], [94,60]] },
  { id: 'lance', name: 'Peter (Conseil 4 Dragon)', title: 'Conseil 4 Dragon', team: [[130,58], [148,56], [148,56], [142,60], [149,62]] },
  { id: 'blue', name: 'Bleu (Maître Kanto)', title: 'Maître de la Ligue Kanto', team: [[18,61], [65,59], [112,61], [59,61], [103,63], [6,65]] }
];
// ============================================================
// CHAMPIONS — gym leaders (split)
// ============================================================
const CHAMPIONS = {
  brock: {badge:'boulder',badgeEmoji:'🪨',
    reward:1500, team:[createPoke(74,12), createPoke(95,14)]},
  misty: {badge:'cascade',badgeEmoji:'💧',
    reward:2000, team:[createPoke(120,18), createPoke(121,21)]},
  surge: {badge:'thunder',badgeEmoji:'⚡',
    reward:2500, team:[createPoke(100,21), createPoke(25,18), createPoke(26,24)]},
  erika: {badge:'rainbow',badgeEmoji:'🌈',
    reward:3000, team:[createPoke(71,29), createPoke(114,24), createPoke(45,29)]},
  koga: {badge:'soul',badgeEmoji:'💜',
    reward:3500, team:[createPoke(109,37), createPoke(89,39), createPoke(109,37), createPoke(110,43)]},
  sabrina: {badge:'marsh',badgeEmoji:'🔮',
    reward:3800, badgeReq:3, team:[createPoke(64,38), createPoke(122,37), createPoke(49,38), createPoke(65,43)]},
  blaine:{badge:'volcano',badgeEmoji:'🌋',
    reward:4000, team:[createPoke(58,42), createPoke(77,40), createPoke(78,42), createPoke(59,47)]},
  giovanni:{badge:'earth',badgeEmoji:'🌍',
    reward:5000, badgeReq:6, team:[createPoke(111,45), createPoke(51,42), createPoke(31,44), createPoke(34,45), createPoke(112,50)]},
  elite4: {badge:'champion',badgeEmoji:'🏆',
    reward:15000, badgeReq:8, team:[
      createPoke(87,54), createPoke(131,56),
      createPoke(95,55), createPoke(68,58),
      createPoke(94,56), createPoke(24,58),
      createPoke(148,58), createPoke(149,62),
      createPoke(65,63), createPoke(103,63), createPoke(59,63), createPoke(130,63), createPoke(6,65)
    ]},
  falkner: {badge:'zephyr',badgeEmoji:'🪽',
    reward:1800, badgeReq:0, team:[createPoke(16,13), createPoke(18,15)]},
  bugsy:   {badge:'hive',badgeEmoji:'🐞',
    reward:2200, badgeReq:0, team:[createPoke(11,15), createPoke(14,15), createPoke(123,17)]},
  whitney: {badge:'plain',badgeEmoji:'🐮',
    reward:2600, badgeReq:0, team:[createPoke(35,18), createPoke(36,20)]},
  morty:   {badge:'fog',badgeEmoji:'👻',
    reward:3200, badgeReq:0, team:[createPoke(92,21), createPoke(93,23), createPoke(94,25)]},
  chuck:   {badge:'storm',badgeEmoji:'🥊',
    reward:3800, badgeReq:0, team:[createPoke(56,27), createPoke(62,30)]},
  jasmine: {badge:'mineral',badgeEmoji:'⚙️',
    reward:4200, badgeReq:0, team:[createPoke(81,30), createPoke(82,35)]},
  pryce:   {badge:'glacier',badgeEmoji:'❄️',
    reward:4800, badgeReq:0, team:[createPoke(86,32), createPoke(87,34), createPoke(131,36)]},
  clair:   {badge:'rising',badgeEmoji:'🐉',
    reward:5500, badgeReq:0, team:[createPoke(147,37), createPoke(148,39), createPoke(130,40)]}
};
