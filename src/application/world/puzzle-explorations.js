// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Local safe-HTML fallback (engine pwSetHtml when available, else direct).
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
// Secret explorations — v4.1
// Immersion, no UI jargon, sequences without feedback before confirmation,
// shuffled buttons, FR answers, Regi braille + ritual, shrine = real team.

function _shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function _seq(def) { return Object.assign({ type: 'sequence', feedbackOnPrefix: false }, def); }

export const PUZZLE_EXPLORATIONS = [
  // KANTO
  _seq({
    id: 'cerulean_sigil_a', region: 'kanto', loc: 'ceruleancave',
    name: 'Murmures sous la roche', nameEn: 'Whispers under stone',
    difficulty: 2, icon: '✦',
    summary: 'Quatre stèles veillent dans le noir. Une seule procession apaise la grotte.',
    summaryEn: 'Four steles watch in the dark. Only one procession calms the cave.',
    clue: 'Les anciens montraient la falaise avant le ruisseau, et le tonnerre avant le silence des cryptes.',
    clueEn: 'The ancients pointed to the cliff before the brook, and to thunder before the crypt silence.',
    options: [
      { key: 'rock', fr: 'Montagne', en: 'Mountain' },
      { key: 'lake', fr: 'Source', en: 'Spring' },
      { key: 'bolt', fr: 'Orage', en: 'Storm' },
      { key: 'shade', fr: 'Nuit', en: 'Night' },
    ],
    solutionKeys: ['rock', 'lake', 'bolt', 'shade'],
    rewardMoney: 6000, rewardItems: { twisted_spoon: 1 },
    rewardText: 'Un souffle tede parcourt la galerie…',
  }),
  _seq({
    id: 'cerulean_sigil_b', region: 'kanto', loc: 'ceruleancave',
    name: 'Second souffle', nameEn: 'Second breath',
    difficulty: 3, icon: '✦',
    summary: 'La grotte exige le chemin du retour, comme une marée qui se retire.',
    summaryEn: 'The cave demands the path home, like a tide pulling back.',
    clue: 'Quand la nuit se lève la première, le reste du monde suit à rebours jusqu’à la pierre.',
    clueEn: 'When night rises first, the rest of the world follows backward until stone.',
    options: [
      { key: 'rock', fr: 'Montagne', en: 'Mountain' },
      { key: 'lake', fr: 'Source', en: 'Spring' },
      { key: 'bolt', fr: 'Orage', en: 'Storm' },
      { key: 'shade', fr: 'Nuit', en: 'Night' },
    ],
    solutionKeys: ['shade', 'bolt', 'lake', 'rock'],
    requires: ['cerulean_sigil_a'],
    rewardMoney: 10000, rewardItems: { leftovers: 1 },
    rewardText: 'La crypte s’ouvre dans un silence parfait.',
  }),
  _seq({
    id: 'seafoam_valves_a', region: 'kanto', loc: 'seafoamislands',
    name: 'Chant des courants', nameEn: 'Song of currents',
    difficulty: 2, icon: '🌊',
    summary: 'Trois vannes de bronze. La mer n’obéit qu’à une mélodie.',
    summaryEn: 'Three bronze valves. The sea obeys only one melody.',
    clue: 'Une chanson de bord parle du large, de l’écume, puis de ce qui reste figé sous le récif.',
    clueEn: 'A sea shanty speaks of open water, foam, then what stays frozen under the reef.',
    options: [
      { key: 'open', fr: 'Large', en: 'Open sea' },
      { key: 'foam', fr: 'Ecume', en: 'Foam' },
      { key: 'heart', fr: 'Recif', en: 'Reef' },
    ],
    solutionKeys: ['open', 'foam', 'heart'],
    rewardMoney: 5000, rewardItems: { mystic_water: 1 },
    rewardText: 'L’eau se retire d’un cran.',
  }),
  {
    id: 'seafoam_freeze_code', region: 'kanto', loc: 'seafoamislands',
    name: 'Souffle blanc', nameEn: 'White breath',
    difficulty: 2, icon: '🧊',
    summary: 'Un panneau de glace porte un rébus de pêcheur.',
    summaryEn: 'An ice panel bears a fisher rebus.',
    type: 'code',
    clue: 'Rébus gravé : un flocon au-dessus d’une vague. Les anciens avaient un mot pour ce qui fige l’eau l’hiver.',
    clueEn: 'Carved rebus: a snowflake over a wave. An old word for what freezes water in winter.',
    solution: 'GLACE',
    altSolutions: ['GLACE', 'GEL', 'GIVRE', 'ICE', 'FROST'],
    requires: ['seafoam_valves_a'],
    rewardMoney: 7000, rewardItems: { never_melt_ice: 1 },
    rewardText: 'Le pont de glace se solidifie.',
  },
  _seq({
    id: 'mtmoon_fossils_a', region: 'kanto', loc: 'mtmoon',
    name: 'Couches du temps', nameEn: 'Layers of time',
    difficulty: 2, icon: '🌑',
    summary: 'Quatre strates de fouille. Du plus ancien au plus jeune.',
    summaryEn: 'Four dig layers. Oldest to youngest.',
    clue: 'Les couches parlent d’elles-mêmes si l’on lit la falaise du plus profond au plus jeune.',
    clueEn: 'The layers speak for themselves if you read the cliff from deepest to youngest.',
    options: [
      { key: 'helix', fr: 'Spirale', en: 'Spiral' },
      { key: 'dome', fr: 'Dome', en: 'Dome' },
      { key: 'amber', fr: 'Ambre', en: 'Amber' },
      { key: 'tools', fr: 'Outils', en: 'Tools' },
    ],
    solutionKeys: ['helix', 'dome', 'amber', 'tools'],
    rewardMoney: 4000, rewardItems: { hard_stone: 1 },
    rewardText: 'Une niche de fouille s’ouvre.',
  }),
  {
    id: 'mtmoon_lunar_code', region: 'kanto', loc: 'mtmoon',
    name: 'Veilleur d’argent', nameEn: 'Silver watcher',
    difficulty: 2, icon: '🌙',
    summary: 'Quelle lumière guide les Mélofée de ces grottes ?',
    summaryEn: 'Which light guides the Clefairy of these caves?',
    type: 'code',
    clue: 'Celle qui blanchit les nuits claires et donne son nom à une pierre d’évolution.',
    clueEn: 'The light of clear nights, and the name of an evolution stone.',
    solution: 'LUNE',
    altSolutions: ['LUNE', 'MOON'],
    requires: ['mtmoon_fossils_a'],
    rewardMoney: 5000, rewardItems: { moonstone: 1 },
    rewardText: 'Un éclat d’argent pulse dans la roche.',
  },

  // JOHTO
  _seq({
    id: 'alph_unown_circle', region: 'johto', loc: 'ruinsofalph',
    name: 'Course du jour', nameEn: 'Course of day',
    difficulty: 3, icon: '🔤',
    summary: 'Quatre piliers aux quatre vents. Suivez la course du soleil, presque deux fois.',
    summaryEn: 'Four pillars to the four winds. Follow the sun path, nearly twice.',
    clue: 'Suivez la course du jour sur les quatre vents, puis recommencez l’aube jusqu’au zénith.',
    clueEn: 'Follow the day path across the four winds, then take dawn again through to the zenith.',
    options: [
      { key: 'N', fr: 'Nord', en: 'North' },
      { key: 'E', fr: 'Est', en: 'East' },
      { key: 'S', fr: 'Sud', en: 'South' },
      { key: 'W', fr: 'Ouest', en: 'West' },
    ],
    solutionKeys: ['E', 'S', 'W', 'N', 'E', 'S'],
    rewardMoney: 5000, rewardItems: { twisted_spoon: 1 },
    rewardText: 'Les piliers s’alignent un instant.',
  }),
  _seq({
    id: 'alph_mirror_path', region: 'johto', loc: 'ruinsofalph',
    name: 'Maree de pierre', nameEn: 'Stone tide',
    difficulty: 3, icon: '🔤',
    summary: 'Après le jour, la marée ramène les flots. Le chemin se replie sur lui-même.',
    summaryEn: 'After day, the tide returns. The path folds onto itself.',
    clue: 'Après le voyage du soleil, la marée ramène les flots sur leurs pas — sans s’attarder au point le plus sombre.',
    clueEn: 'After the sun journey, the tide walks its steps back — without lingering at the darkest point.',
    options: [
      { key: 'N', fr: 'Nord', en: 'North' },
      { key: 'E', fr: 'Est', en: 'East' },
      { key: 'S', fr: 'Sud', en: 'South' },
      { key: 'W', fr: 'Ouest', en: 'West' },
    ],
    solutionKeys: ['E', 'S', 'W', 'N', 'W', 'S', 'E'],
    requires: ['alph_unown_circle'],
    rewardMoney: 8000, rewardItems: { moonstone: 1 },
    rewardText: 'Une dalle centrale s’enfonce sans un bruit.',
  }),
  _seq({
    id: 'sprout_bells', region: 'johto', loc: 'sprouttower',
    name: 'Cloches de l’aube', nameEn: 'Dawn bells',
    difficulty: 2, icon: '🔔',
    summary: 'Trois cloches de bois. Les moines sonnent l’éveil du temple.',
    summaryEn: 'Three wooden bells. Monks ring the temple awake.',
    clue: 'Les moines sonnent du plus sourd au plus clair.',
    clueEn: 'The monks ring from the dullest tone to the clearest.',
    options: [
      { key: 'low', fr: 'Grave', en: 'Low' },
      { key: 'mid', fr: 'Mediane', en: 'Middle' },
      { key: 'high', fr: 'Aigue', en: 'High' },
    ],
    solutionKeys: ['low', 'mid', 'high'],
    rewardMoney: 3500, rewardItems: { miracle_seed: 1 },
    rewardText: 'Un moine incline la tête, satisfait.',
  }),
  {
    id: 'sprout_mantra', region: 'johto', loc: 'sprouttower',
    name: 'Mantra du pilier', nameEn: 'Pillar mantra',
    difficulty: 2, icon: '📜',
    summary: 'Quel mot les moines répètent-ils pour apaiser les esprits ?',
    summaryEn: 'What word do monks repeat to calm the spirits?',
    type: 'code',
    clue: 'Le contraire de la guerre, murmuré au cœur de la tour.',
    clueEn: 'The opposite of war, whispered at the heart of the tower.',
    solution: 'PAIX',
    altSolutions: ['PAIX', 'PEACE', 'CALME'],
    requires: ['sprout_bells'],
    rewardMoney: 4500, rewardItems: { spell_tag: 1 },
    rewardText: 'Les flammes des bougies se stabilisent.',
  },
  _seq({
    id: 'burned_embers', region: 'johto', loc: 'burnedtower',
    name: 'Braises ordonnées', nameEn: 'Ordered embers',
    difficulty: 2, icon: '🔥',
    summary: 'Quatre braseros noircis. Le souvenir de l’incendie a un ordre.',
    summaryEn: 'Four blackened braziers. The fire memory has an order.',
    clue: 'Le drame du feu s’écrit dans l’ordre où il consume.',
    clueEn: 'Fire tragedy is written in the order it consumes.',
    options: [
      { key: 'spark', fr: 'Etincelle', en: 'Spark' },
      { key: 'smoke', fr: 'Fumee', en: 'Smoke' },
      { key: 'flame', fr: 'Flamme', en: 'Flame' },
      { key: 'ash', fr: 'Cendre', en: 'Ash' },
    ],
    solutionKeys: ['spark', 'smoke', 'flame', 'ash'],
    rewardMoney: 4000, rewardItems: { charcoal: 1 },
    rewardText: 'Une chaleur familière traverse les planches calcinées.',
  }),
  {
    id: 'burned_beast_word', region: 'johto', loc: 'burnedtower',
    name: 'Nom sous les cendres', nameEn: 'Name under ash',
    difficulty: 3, icon: '🔥',
    summary: 'Trois bêtes dormaient ici. L’une d’elles est de feu pur.',
    summaryEn: 'Three beasts once slept here. One is pure fire.',
    type: 'code',
    clue: 'Le monstre de lave au pelage de braise.',
    clueEn: 'The lava beast with an ember coat.',
    solution: 'ENTEI',
    altSolutions: ['ENTEI'],
    requires: ['burned_embers'],
    rewardMoney: 7000, rewardItems: { charcoal: 1 },
    rewardText: 'Un grondement lointain répond sous la ville.',
  },
  {
    id: 'icepath_riddle', region: 'johto', loc: 'icepath',
    name: 'Souffle du glacier', nameEn: 'Glacier breath',
    difficulty: 2, icon: '🧊',
    summary: 'Un serment est gravé dans la paroi bleue.',
    summaryEn: 'An oath is carved in the blue wall.',
    type: 'code',
    clue: 'Ce qui ne fond jamais… ou le nom d’une baie qui brave le froid.',
    clueEn: 'What never melts… or a berry that braves the cold.',
    solution: 'YACHE',
    altSolutions: ['YACHE', 'GLACE', 'ICE'],
    rewardMoney: 5000, rewardItems: { yache_berry: 1 },
    rewardText: 'Un souffle froid approuve.',
  },
  _seq({
    id: 'icepath_steps', region: 'johto', loc: 'icepath',
    name: 'Pas sur le verglas', nameEn: 'Steps on black ice',
    difficulty: 3, icon: '🧊',
    summary: 'Quatre dalles glissantes. Une chorégraphie évite la chute.',
    summaryEn: 'Four slick tiles. One choreography avoids the fall.',
    clue: 'Sur le verglas, le corps avance, hésite d’un côté puis de l’autre, et reprend appui.',
    clueEn: 'On black ice the body steps, sways one way then the other, and finds footing again.',
    options: [
      { key: 'F', fr: 'Avant', en: 'Forward' },
      { key: 'L', fr: 'Gauche', en: 'Left' },
      { key: 'R', fr: 'Droite', en: 'Right' },
      { key: 'B', fr: 'Arriere', en: 'Back' },
    ],
    solutionKeys: ['F', 'L', 'R', 'B'],
    requires: ['icepath_riddle'],
    rewardMoney: 6500, rewardItems: { never_melt_ice: 1 },
    rewardText: 'Le passage se stabilise.',
  }),

  // HOENN
  {
    id: 'sealed_braille_a', region: 'hoenn', loc: 'sealed_chamber',
    name: 'Première tablette', nameEn: 'First tablet',
    difficulty: 2, icon: '📜',
    summary: 'Une tablette de pierre porte un court message en relief.',
    summaryEn: 'A stone tablet bears a short raised message.',
    type: 'braille',
    clue: 'Trois glyphes seulement (message en anglais). Le grand bleu.',
    clueEn: 'Only three glyphs. The great blue.',
    // Braille message encoded in ENGLISH (SEA) — the game's universal language;
    // FR and EN answers are both accepted whatever the language.
    brailleCells: ['⠎', '⠑', '⠁'],
    solution: 'SEA',
    altSolutions: ['MER', 'SEA'],
    rewardMoney: 4000, rewardItems: { mystic_water: 1 },
    rewardText: 'La tablette s’efface un instant.',
  },
  {
    id: 'sealed_braille_b', region: 'hoenn', loc: 'sealed_chamber',
    name: 'Seconde tablette', nameEn: 'Second tablet',
    difficulty: 3, icon: '📜',
    summary: 'Plus bas, un second message parle du peuple antique.',
    summaryEn: 'Lower, a second message speaks of the ancient people.',
    type: 'braille',
    clue: 'Quatre glyphes (message en anglais). Ce qui s’ouvre quand le peuple est reconnu.',
    clueEn: 'Four glyphs. What opens when the people are recognized.',
    // Message braille encode in ANGLAIS (DOOR) ; reponses FR/in acceptees.
    brailleCells: ['⠙', '⠕', '⠕', '⠗'],
    solution: 'DOOR',
    altSolutions: ['PORTE', 'DOOR'],
    requires: ['sealed_braille_a'],
    rewardMoney: 5000, rewardItems: { hard_stone: 1 },
    rewardText: 'Un passage s’ouvre dans la légende…',
  },

  {
    id: 'sealed_relicanth_wailord', region: 'hoenn', loc: 'sealed_chamber',
    requires: ['sealed_braille_b'],
    name: 'Peuple des profondeurs', nameEn: 'People of the deep',
    difficulty: 3, icon: '📜',
    summary: 'Le panneau du fond ne s’éveille qu’en présence de deux gardiens des mers.',
    summaryEn: 'The back mural awakens only with two sea guardians present.',
    type: 'party',
    clue: 'Le panneau ne s’éveille qu’en présence de deux gardiens des mers : l’ancien des abysses de pierre, et le géant qui chante à la surface.',
    clueEn: 'The mural awakens only in the presence of two sea guardians: the ancient of rocky depths, and the giant that sings on the surface.',
    partyNeed: [369, 321], hidePartyList: true,
    rewardMoney: 6000, rewardItems: { hard_stone: 1 },
    rewardText: 'Le sol vibre. Trois chemins s’ouvrent dans la légende…',
  },
  {
    id: 'regirock_braille_lesson', region: 'hoenn', loc: 'desert_ruins',
    requires: ['sealed_relicanth_wailord'],
    name: 'Mur de points', nameEn: 'Wall of dots',
    difficulty: 3, icon: '🪨',
    summary: 'Un long message en relief. Déchiffrez le mot d’ordre des gardiens de pierre.',
    summaryEn: 'A long raised message. Decode the stone guardians watchword.',
    type: 'braille',
    clue: 'Clé braille : A=⠁ B=⠃ C=⠉ D=⠙ E=⠑ F=⠋ G=⠛ H=⠓ I=⠊ J=⠚ K=⠅ L=⠇ M=⠍ N=⠝ O=⠕ P=⠏ Q=⠟ R=⠗ S=⠎ T=⠞ U=⠥ V=⠧ W=⠺ X=⠭ Y=⠽ Z=⠵\nMessage : ⠏ ⠁ ⠞ ⠊ ⠑ ⠝ ⠉ ⠑',
    clueEn: 'Braille key: A=⠁ … Z=⠵\nMessage: ⠏ ⠁ ⠞ ⠊ ⠑ ⠝ ⠉ ⠑',
    brailleCells: ['⠏', '⠁', '⠞', '⠊', '⠑', '⠝', '⠉', '⠑'],
    solution: 'PATIENCE',
    altSolutions: ['PATIENCE'],
    rewardMoney: 5000, rewardItems: { hard_stone: 1 },
    rewardText: 'Le mot s’imprime dans votre esprit.',
  },
  {
    id: 'regirock_wait', region: 'hoenn', loc: 'desert_ruins',
    name: 'Silence de grès', nameEn: 'Sandstone silence',
    difficulty: 2, icon: '🪨',
    summary: 'Le seuil exige que vous honoriez le mot déchiffré… sans bouger.',
    summaryEn: 'The threshold asks you to honor the decoded word… without moving.',
    type: 'wait',
    clue: 'Ceux qui ont une force éternelle s’ouvrent à une attente éternelle.',
    clueEn: 'Those with eternal strength open with eternal waiting.',
    waitSeconds: 60,
    requires: ['regirock_braille_lesson'],
    rewardMoney: 5000, rewardItems: { hard_stone: 1 },
    rewardText: 'La porte intérieure s’entrouvre dans un craquement de pierre.',
  },
  {
    id: 'regirock_name', region: 'hoenn', loc: 'desert_ruins',
    name: 'Colosse de grès', nameEn: 'Sandstone colossus',
    difficulty: 2, icon: '🪨',
    summary: 'Quel nom portent les gardiens de pierre ?',
    summaryEn: 'What name do the stone guardians bear?',
    type: 'code',
    clue: 'Le mot de la matière brute des falaises — celle que l’on taille et que l’on jette.',
    clueEn: 'The raw matter of cliffs, cut and thrown.',
    solution: 'PIERRE',
    altSolutions: ['PIERRE', 'ROCK', 'ROCHE', 'STONE'],
    requires: ['regirock_wait'],
    rewardMoney: 8000, rewardItems: { hard_stone: 1 },
    rewardText: 'Regirock se dresse dans la poussière.',
    legendaryEncounter: { id: 377, level: 40 },
  },
  {
    id: 'regice_braille_lesson', region: 'hoenn', loc: 'island_cave',
    requires: ['sealed_relicanth_wailord'],
    name: 'Alphabet gelé', nameEn: 'Frozen alphabet',
    difficulty: 3, icon: '🧊',
    summary: 'Sur la glace : un message en points. Quel est le nom du froid ?',
    summaryEn: 'On the ice: a dotted message. What is the name of cold?',
    type: 'braille',
    clue: 'Sur la paroi gelée, seul le message en relief demeure (en anglais).',
    clueEn: 'On the frozen wall, only the raised message remains.',
    // Message braille encode in ANGLAIS (ICE) ; reponses FR/in acceptees.
    brailleCells: ['⠊', '⠉', '⠑'],
    solution: 'ICE',
    altSolutions: ['GLACE', 'ICE'],
    rewardMoney: 5000, rewardItems: { never_melt_ice: 1 },
    rewardText: 'La cavité résonne d’un tintement de glace.',
  },
  {
    id: 'regice_digits', region: 'hoenn', loc: 'island_cave',
    name: 'Cadran de givre', nameEn: 'Frost dial',
    difficulty: 3, icon: '🧊',
    summary: 'Des chiffres en braille indiquent une heure sacrée.',
    summaryEn: 'Braille digits mark a sacred hour.',
    type: 'braille',
    clue: 'Le cadran de givre montre deux glyphes. Lisez l’heure qu’ils forment.',
    clueEn: 'The frost dial shows two glyphs. Read the hour they form.',
    brailleCells: ['⠚', '⠋'],
    solution: '6',
    altSolutions: ['6', '06'],
    dynamicAnswer: 'regiSealsPartial',
    requires: ['regice_braille_lesson'],
    rewardMoney: 6000, rewardItems: { never_melt_ice: 1 },
    rewardText: 'Une note pure chante dans la glace.',
  },
  {
    id: 'regice_name', region: 'hoenn', loc: 'island_cave',
    name: 'Coeur de banquise', nameEn: 'Pack-ice heart',
    difficulty: 2, icon: '🧊',
    summary: 'Le gardien de froid attend qu’on le nomme.',
    summaryEn: 'The cold guardian waits to be named.',
    type: 'code',
    clue: 'Le gardien de la banquise porte un nom de glace pure.',
    clueEn: 'The pack-ice guardian bears a name of pure cold.',
    solution: 'GLACE',
    altSolutions: ['GLACE', 'ICE', 'REGICE'],
    requires: ['regice_digits'],
    rewardMoney: 8000, rewardItems: { never_melt_ice: 1 },
    rewardText: 'Regice émerge du silence blanc.',
    legendaryEncounter: { id: 378, level: 40 },
  },
  {
    id: 'registeel_braille_lesson', region: 'hoenn', loc: 'ancient_tomb',
    requires: ['sealed_relicanth_wailord'],
    name: 'Écriture de métal', nameEn: 'Metal writing',
    difficulty: 3, icon: '⚙️',
    summary: 'Des points martelés dans l’acier. Quel matériau honorent-ils ?',
    summaryEn: 'Dots hammered into steel. What material do they honor?',
    type: 'braille',
    // Message braille encode in ANGLAIS (STEEL) ; reponses FR/in acceptees.
    clue: 'Clé A-Z braille (message en anglais).\nMessage : ⠎ ⠞ ⠑ ⠑ ⠇',
    clueEn: 'Braille A-Z key.\nMessage: ⠎ ⠞ ⠑ ⠑ ⠇',
    brailleCells: ['⠎', '⠞', '⠑', '⠑', '⠇'],
    solution: 'STEEL',
    altSolutions: ['ACIER', 'STEEL'],
    rewardMoney: 5000, rewardItems: { metal_coat: 1 },
    rewardText: 'Les anneaux vibrent faiblement.',
  },
  _seq({
    id: 'registeel_arrows', region: 'hoenn', loc: 'ancient_tomb',
    name: 'Danse des forges', nameEn: 'Dance of forges',
    difficulty: 3, icon: '⚙️',
    summary: 'Six marques au sol, comme une chorégraphie de forgeron.',
    summaryEn: 'Six floor marks, like a smith choreography.',
    clue: 'La forge bat deux fois le haut, deux fois le bas, puis le côté du cœur et celui de la main qui frappe.',
    clueEn: 'The forge strikes high twice, low twice, then the heart side and the striking hand side.',
    options: [
      { key: 'U', fr: 'Ciel', en: 'Sky' },
      { key: 'D', fr: 'Terre', en: 'Earth' },
      { key: 'L', fr: 'Coeur', en: 'Heart' },
      { key: 'R', fr: 'Main', en: 'Hand' },
    ],
    solutionKeys: ['U', 'U', 'D', 'D', 'L', 'R'],
    requires: ['registeel_braille_lesson'],
    rewardMoney: 6000, rewardItems: { metal_coat: 1 },
    rewardText: 'Les anneaux s’alignent.',
  }),
  {
    id: 'registeel_name', region: 'hoenn', loc: 'ancient_tomb',
    name: 'Nom des forges', nameEn: 'Name of forges',
    difficulty: 2, icon: '⚙️',
    summary: 'Le tombeau demande le matériau sacré.',
    summaryEn: 'The tomb asks for the sacred material.',
    type: 'code',
    clue: 'Celui que les forgerons préfèrent à la pierre.',
    clueEn: 'What smiths prefer to stone.',
    solution: 'ACIER',
    altSolutions: ['ACIER', 'STEEL'],
    requires: ['registeel_arrows'],
    rewardMoney: 8000, rewardItems: { metal_coat: 1 },
    rewardText: 'Registeel s éveille dans le tombeau.',
    legendaryEncounter: { id: 379, level: 40 },
  },
  _seq({
    id: 'seafloor_pressure_a', region: 'hoenn', loc: 'seafloor_cavern',
    name: 'Pouls de l abysse', nameEn: 'Pulse of the abyss',
    difficulty: 3, icon: '🌊',
    summary: 'Quatre veines de pression. Une seule séquence évite l’effondrement.',
    summaryEn: 'Four pressure veins. Only one sequence avoids collapse.',
    clue: 'En marge du carnet : une croix des vents, et l’ordre d’une purge que seuls les anciens plongeurs connaissent.',
    clueEn: 'In the notebook margin: a cross of winds, and a purge order only old divers know.',
    options: [
      { key: 'N', fr: 'Nord', en: 'North' },
      { key: 'E', fr: 'Est', en: 'East' },
      { key: 'S', fr: 'Sud', en: 'South' },
      { key: 'W', fr: 'Ouest', en: 'West' },
    ],
    solutionKeys: ['N', 'S', 'E', 'W'],
    rewardMoney: 7000, rewardItems: { mystic_water: 1 },
    rewardText: 'Un sas s’ouvre sur l’obscurité.',
  }),
  {
    id: 'seafloor_depth_code', region: 'hoenn', loc: 'seafloor_cavern',
    name: 'Carnet de plongée', nameEn: 'Dive log',
    difficulty: 3, icon: '🌊',
    summary: 'Une profondeur est codée dans les marges du carnet.',
    summaryEn: 'A depth is coded in the notebook margins.',
    type: 'code',
    clue: 'Deux fois le numéro du chenal qui mène à Éternara, moins les Badges qu’il faut pour y plonger. Ce chenal porte le numéro cent vingt-huit.',
    clueEn: 'Twice the ocean channel number to Ever Grande, minus the badges needed to dive there. That channel is number one hundred twenty-eight.',
    solution: '249',
    altSolutions: ['249'],
    requires: ['seafloor_pressure_a'],
    rewardMoney: 9000, rewardItems: { deep_sea_tooth: 1 },
    rewardText: 'Un coffre pressurisé se déverrouille.',
  },
  _seq({
    id: 'mtpyre_ashes_a', region: 'hoenn', loc: 'mt_pyre',
    name: 'Rite des âmes', nameEn: 'Rite of souls',
    difficulty: 2, icon: '🕯️',
    summary: 'Quatre offrandes pour accompagner les départs.',
    summaryEn: 'Four offerings to walk the departed.',
    clue: 'Le deuil a son ordre, du premier chagrin jusqu’au silence.',
    clueEn: 'Grief has its order, from the first sorrow to silence.',
    options: [
      { key: 'tears', fr: 'Larmes', en: 'Tears' },
      { key: 'ash', fr: 'Cendre', en: 'Ash' },
      { key: 'flame', fr: 'Flamme', en: 'Flame' },
      { key: 'silence', fr: 'Silence', en: 'Silence' },
    ],
    solutionKeys: ['tears', 'ash', 'flame', 'silence'],
    rewardMoney: 5000, rewardItems: { spell_tag: 1 },
    rewardText: 'Les braseros s’allument d’un bleu pâle.',
  }),
  {
    id: 'mtpyre_summit_word', region: 'hoenn', loc: 'mt_pyre',
    name: 'Souffle du sommet', nameEn: 'Summit breath',
    difficulty: 2, icon: '🕯️',
    summary: 'Au faîte du mont, un seul mot de consolance.',
    summaryEn: 'At the peak, a single word of comfort.',
    type: 'code',
    clue: 'Ce que l’on souhaite aux voyageurs au bout du chemin.',
    clueEn: 'What one wishes travelers at the end of the road.',
    solution: 'REPOS',
    altSolutions: ['REPOS', 'PAIX', 'PEACE', 'REST'],
    requires: ['mtpyre_ashes_a'],
    rewardMoney: 7000, rewardItems: { spell_tag: 1 },
    rewardText: 'Le vent emporte une plainte apaisée.',
  },
];

(function () {
  for (const p of PUZZLE_EXPLORATIONS) {
    if (!p.rewardItems) continue;
    const c = {};
    for (const [k, v] of Object.entries(p.rewardItems)) if (v > 0) c[k] = v;
    p.rewardItems = c;
  }
})();

function ensurePuzzleState() {
  const g = (typeof G !== 'undefined' && G) ? G : null;
  if (!g) return { completed: {}, runSolved: {} };
  if (!g.puzzleExplorations || typeof g.puzzleExplorations !== 'object') g.puzzleExplorations = { completed: {}, runSolved: {} };
  if (!g.puzzleExplorations.completed) g.puzzleExplorations.completed = {};
  if (!g.puzzleExplorations.runSolved) g.puzzleExplorations.runSolved = {};
  return g.puzzleExplorations;
}
function getPuzzleById(id) { return PUZZLE_EXPLORATIONS.find((p) => p.id === id) || null; }
function isPuzzleEverCompleted(id) { const st = ensurePuzzleState(); return !!(st.completed && st.completed[id]); }
function isPuzzleCompleted(id) { return isPuzzleEverCompleted(id); }
function isPuzzleSolvedThisRun(id) { const st = ensurePuzzleState(); return !!(st.runSolved && st.runSolved[id]); }
function resetPuzzleRun(id) { const st = ensurePuzzleState(); if (st.runSolved) delete st.runSolved[id]; }
function puzzleRequirementsMet(puzzle) {
  if (!puzzle || !puzzle.requires || !puzzle.requires.length) return true;
  return puzzle.requires.every((rid) => isPuzzleEverCompleted(rid));
}
function getPuzzlesForLocation(locId) {
  const loc = locId || (typeof G !== 'undefined' && G ? G.location : null);
  if (!loc) return [];
  return PUZZLE_EXPLORATIONS.filter((p) => p.loc === loc);
}
function countCompletedPuzzles(region) {
  return PUZZLE_EXPLORATIONS.filter((p) => (!region || p.region === region) && isPuzzleEverCompleted(p.id)).length;
}
function _en() { return typeof G !== 'undefined' && G && G.lang === 'en'; }
function getPuzzleDisplayName(p) { return p ? (_en() && p.nameEn ? p.nameEn : p.name) : ''; }
function getPuzzleSummary(p) { return p ? (_en() && p.summaryEn ? p.summaryEn : p.summary) : ''; }
function getPuzzleClue(p) { return p ? (_en() && p.clueEn ? p.clueEn : (p.clue || '')) : ''; }
function _esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _partySpeciesSet() {
  const set = new Set();
  if (typeof G !== 'undefined' && G && Array.isArray(G.team)) {
    for (const p of G.team) if (p && p.id) set.add(Number(p.id));
  }
  return set;
}
function _norm(raw) {
  return String(raw || '').trim().toUpperCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9, ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function openPuzzleListForLocation(locId) {
  window._puzzleLocPending = locId || (G && G.location) || '';
  if (typeof openFullscreenPanel === 'function') {
    try { openFullscreenPanel('puzzles'); return; } catch (_) {}
  }
  renderPuzzleListPanel(window._puzzleLocPending);
}

function renderPuzzleListPanel(locId) {
  const loc = locId || (G && G.location) || window._puzzleLocPending || '';
  const list = getPuzzlesForLocation(loc);
  const en = _en();
  const body = document.getElementById('fs-panel-content') || document.getElementById('fs-panel-body');
  const title = document.getElementById('fs-panel-title');
  if (title) title.textContent = en ? 'Secret explorations' : 'Explorations secrètes';
  if (!body) return;
  if (!list.length) {
    _pwSetHtmlSafe(body, '<div class="pw-empty-state-md">' + (en ? 'Nothing unusual here…' : 'Rien d insolite ici…') + '</div>');
    return;
  }
  // Wave 21 (ECS DS): the list is rendered from zero by PuzzleListView —
  // this adapter only shapes (localized) models (the vdom serializer does
  // the escaping). DS rule: NO greyed-out dead button — a sealed puzzle
  // shows an informative lock line instead (same rule as the quest cards).
  const viewsL = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if (!viewsL || typeof viewsL.PuzzleListView !== 'function') throw new Error('[ui] PokeUI views not loaded (PuzzleListView)');
  const model = {
    hint: en ? 'Some places keep quiet secrets. Look closely.' : 'Certains lieux gardent des secrets silencieux. Observez bien.',
    cards: [],
    closeLabel: en ? 'Close' : 'Fermer',
  };
  for (const p of list) {
    const ever = isPuzzleEverCompleted(p.id);
    const locked = !puzzleRequirementsMet(p);
    model.cards.push({
      icon: p.icon || '✦',
      name: getPuzzleDisplayName(p),
      done: ever,
      summary: getPuzzleSummary(p),
      statusKind: locked ? 'locked' : (ever ? 'done' : 'open'),
      statusText: locked ? (en ? 'Sealed' : 'Scelle')
        : ever ? (en ? 'Remembered' : 'Déjà percé')
        : (en ? 'Intact' : 'Intact'),
      action: locked ? null : {
        callArgs: "'" + p.id + "'",
        label: ever ? (en ? 'Return' : 'Revenir') : (en ? 'Approach' : "S’approcher"),
      },
      lockText: en ? '🔒 The way is sealed for now.' : '🔒 La voie est scellée pour l’instant.',
    });
  }
  _pwSetHtmlSafe(body, viewsL.PuzzleListView.toHTML(model));
}

function openPuzzleExploration(puzzleId) {
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) return;
  if (!puzzleRequirementsMet(puzzle)) {
    if (typeof notify === 'function') notify(_en() ? 'Something still blocks the way…' : 'Quelque chose bloque encore le passage…', 'var(--accent)');
    return;
  }
  const en = _en();
  const box = (typeof ensurePokeModal === 'function')
    ? ensurePokeModal()
    : { modal: document.getElementById('poke-modal'), inner: document.getElementById('poke-modal-inner') };
  const modal = box.modal;
  const inner = box.inner;
  if (!modal || !inner) {
    if (typeof notify === 'function') notify(en ? 'Interface not ready. Try again.' : 'Interface non prête. Réessayez.', 'var(--red)');
    return;
  }
  const ever = isPuzzleEverCompleted(puzzle.id);
  const clue = getPuzzleClue(puzzle);
  window._puzzleSession = {
    id: puzzle.id, seq: [], waitStarted: Date.now(), waitTouched: false,
    waitNeed: (puzzle.waitSeconds || 60) * 1000,
  };

  // Wave 21 (ECS DS): the sheet is rendered from zero by
  // PuzzleExplorationView — model shaping only. Every id/class the wiring
  // below attaches to (#puzzle-answer-input, #puzzle-seq-progress,
  // .puzzle-seq-btn[data-seq-key]) is unchanged, and the vdom serializer
  // does the escaping (adapters pass RAW localized strings).
  const viewsP = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if (!viewsP || typeof viewsP.PuzzleExplorationView !== 'function') throw new Error('[ui] PokeUI views not loaded (PuzzleExplorationView)');
  const model = {
    icon: puzzle.icon || '✦',
    title: getPuzzleDisplayName(puzzle),
    beenBeforeText: ever ? (en ? '✓ You have been here before.' : '✓ Vous êtes déjà passe par ici.') : '',
    summary: getPuzzleSummary(puzzle),
    clue: clue,
    clueLabel: en ? 'Found here' : 'Sur place',
    kind: puzzle.type === 'sequence' ? 'sequence' : puzzle.type === 'wait' ? 'wait' : puzzle.type === 'party' ? 'party' : 'code',
    inputLabel: puzzle.type === 'wait' ? (en ? 'Your action' : 'Votre action') : (en ? 'Your reading' : 'Votre lecture'),
    waitHint: en ? 'The threshold listens.' : 'Le seuil écoute.',
    partyHint: en ? 'Stand before the mural with the right companions.' : 'Présentez-vous devant la murale avec les bons compagnons.',
    brailleText: (puzzle.brailleCells && puzzle.brailleCells.length) ? puzzle.brailleCells.join(' ') : '',
    confirmCallArgs: "'" + puzzle.id + "'",
    cancelLabel: en ? 'Leave' : "S’éloigner",
    confirmLabel: en ? 'Confirm' : 'Confirmer',
  };
  if (model.kind === 'sequence') {
    model.seqOptions = _shuffle((puzzle.options || []).map((o) => ({
      key: o.key, label: en ? (o.en || o.fr) : (o.fr || o.en),
    })));
  }
  const shell = viewsP.PuzzleExplorationView.toHTML(model);

  if (typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
  window._pwPokeSheet = null;
  modal.classList.remove('atoll-prep-modal', 'preset-editor-modal', 'pw-info-modal');
  modal.classList.add('pw-puzzle-modal', 'open');
  if (typeof _pwSetHtml === 'function') _pwSetHtmlSafe(inner, shell);
  else if (typeof pwSetHtml === 'function') pwSetHtml(inner, shell);
  else _pwSetHtmlSafe(inner, shell);

  if (puzzle.type === 'sequence') {
    const prog = modal.querySelector('#puzzle-seq-progress');
    const hidden = modal.querySelector('#puzzle-answer-input');
    const labelOf = (key) => {
      const o = (puzzle.options || []).find((x) => x.key === key);
      if (!o) return key;
      return en ? (o.en || o.fr) : (o.fr || o.en);
    };
    modal.querySelectorAll('.puzzle-seq-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-seq-key');
        const sess = window._puzzleSession;
        if (!sess || sess.id !== puzzle.id) return;
        sess.seq.push(key);
        const maxLen = (puzzle.solutionKeys || []).length;
        if (sess.seq.length > maxLen) sess.seq = sess.seq.slice(-maxLen);
        if (prog) prog.textContent = sess.seq.map(labelOf).join(' · ');
        if (hidden) hidden.value = sess.seq.join(',');
      });
    });
  }
  // Wave 21 cleanup (documented): the old "wait" ticker targeted
  // #puzzle-wait-fill / #puzzle-wait-label — elements the markup NEVER
  // rendered — and read sess.waitTouched, which NOTHING ever set. The whole
  // block was paint-dead since its introduction; the wait rule itself
  // (submitPuzzleAnswer checks Date.now()-waitStarted >= waitSeconds) is
  // unchanged. The matching dead CSS (.pw-puzzle-wait-bar/fill, gradient
  // inside) is deleted in design-system.css (DS2821).
  const input = modal.querySelector('#puzzle-answer-input');
  if (input && input.type === 'text') {
    setTimeout(() => { try { input.focus(); } catch (_) {} }, 40);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); submitPuzzleAnswer(puzzle.id); }
    });
  }
}

function closePuzzleExploration() {
  window._puzzleSession = null;
  const modal = document.getElementById('poke-modal');
  const inner = document.getElementById('poke-modal-inner');
  if (modal) modal.classList.remove('open', 'pw-puzzle-modal', 'preset-editor-modal', 'atoll-prep-modal', 'pw-info-modal');
  if (inner) {
    if (typeof _pwSetHtml === 'function') _pwSetHtmlSafe(inner, '');
    else inner.replaceChildren();
  }
}

function submitPuzzleAnswer(puzzleId) {
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) return false;
  const en = _en();
  const input = document.getElementById('puzzle-answer-input');
  const raw = input ? input.value : '';
  let ok = false;
  if (puzzle.type === 'sequence') {
    const exp = puzzle.solutionKeys || [];
    const sess = window._puzzleSession;
    const got = (sess && sess.id === puzzle.id && sess.seq && sess.seq.length)
      ? sess.seq.slice() : _norm(raw).split(',').filter(Boolean);
    ok = got.length === exp.length && got.every((v, i) => String(v) === String(exp[i]));
  } else if (puzzle.type === 'wait') {
    const sess = window._puzzleSession;
    const need = (puzzle.waitSeconds || 60) * 1000;
    const waited = sess && sess.waitStarted ? (Date.now() - sess.waitStarted) >= need : false;
    ok = waited;
  } else if (puzzle.type === 'party') {
    const have = _partySpeciesSet();
    ok = (puzzle.partyNeed || []).every((id) => have.has(Number(id)));
  } else {
    const ans = _norm(raw);
    if (puzzle.dynamicAnswer === 'regiSealsPartial') {
      let add = 0;
      if (isPuzzleEverCompleted('regirock_name')) add++;
      if (isPuzzleEverCompleted('registeel_name')) add++;
      const expect = String(6 + add);
      ok = ans === expect || ans === expect.padStart(2, '0');
    } else {
      const accepted = [_norm(puzzle.solution)].concat((puzzle.altSolutions || []).map(_norm));
      ok = ans.length > 0 && accepted.includes(ans);
    }
  }
  if (!ok) {
    if (typeof notify === 'function') notify(en ? 'Nothing happens…' : 'Rien ne se passe…', 'var(--accent)');
    try {
      const inp = document.getElementById('puzzle-answer-input');
      if (inp) {
        if (inp.type === 'text' || inp.type === 'search') { inp.value = ''; setTimeout(function(){ try { inp.focus(); } catch (_e) {} }, 0); }
        else if (puzzle && puzzle.type === 'sequence') {
          inp.value = '';
          if (window._puzzleSession && window._puzzleSession.id === puzzle.id) window._puzzleSession.seq = [];
          const prog = document.getElementById('puzzle-seq-progress');
          if (prog) prog.textContent = '';
        }
      }
    } catch (_e) {}
    return false;
  }
  return completePuzzleExploration(puzzle.id);
}

function completePuzzleExploration(puzzleId) {
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) return false;
  const st = ensurePuzzleState();
  const firstTime = !st.completed[puzzle.id];
  const en = _en();
  st.completed[puzzle.id] = st.completed[puzzle.id] || Date.now();
  st.runSolved[puzzle.id] = Date.now();
  if (firstTime) {
    if (puzzle.rewardMoney) G.money = (G.money || 0) + puzzle.rewardMoney;
    if (puzzle.rewardItems) {
      if (typeof grantRewardItems === 'function') grantRewardItems(puzzle.rewardItems);
      else if (typeof addToInventory === 'function') {
        for (const k of Object.keys(puzzle.rewardItems)) addToInventory(k, puzzle.rewardItems[k]);
      }
    }
  } else {
    G.money = (G.money || 0) + Math.max(200, Math.floor((puzzle.rewardMoney || 1000) * 0.1));
  }
  try {
    if (typeof advanceQuests === 'function') {
      advanceQuests('puzzle', puzzle.id, 1);
      if (puzzle.loc) advanceQuests('puzzle', puzzle.loc, 0);
    }
  } catch (_) {}
  if (typeof notify === 'function') {
    notify(firstTime
      ? ((en ? 'The place answers. ' : 'Le lieu répond. ') + (puzzle.rewardText || ''))
      : (en ? 'The place remembers you.' : 'Le lieu se souvient de vous.'),
      'var(--yellow, #ffd54f)');
  }
  try { if (typeof updateHeader === 'function') updateHeader(); } catch (_) {}
  closePuzzleExploration();
  if (firstTime && puzzle.legendaryEncounter && typeof startLegendaryEncounter === 'function') {
    const leg = puzzle.legendaryEncounter;
    setTimeout(() => { try { startLegendaryEncounter(leg.id, leg.level || 40, { shiny: false }); } catch (_) {} }, 600);
  } else if (typeof openFullscreenPanel === 'function' && window._fsCurrentPanel === 'puzzles') {
    renderPuzzleListPanel(puzzle.loc || (G && G.location));
  }
  try { if (typeof saveGame === 'function') saveGame(false); } catch (_) {}
  try {
    if (typeof EventBus !== 'undefined' && EventBus && EventBus.emit) {
      EventBus.emit('PUZZLE_SOLVED', { id: puzzle.id, loc: puzzle.loc, firstTime: firstTime });
    }
  } catch (_) {}
  return true;
}

// Wave 41 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.PUZZLE_EXPLORATIONS = PUZZLE_EXPLORATIONS;
if (typeof globalThis !== 'undefined') globalThis.ensurePuzzleState = ensurePuzzleState;
if (typeof globalThis !== 'undefined') globalThis.getPuzzleById = getPuzzleById;
if (typeof globalThis !== 'undefined') globalThis.isPuzzleCompleted = isPuzzleCompleted;
if (typeof globalThis !== 'undefined') globalThis.isPuzzleEverCompleted = isPuzzleEverCompleted;
if (typeof globalThis !== 'undefined') globalThis.isPuzzleSolvedThisRun = isPuzzleSolvedThisRun;
if (typeof globalThis !== 'undefined') globalThis.resetPuzzleRun = resetPuzzleRun;
if (typeof globalThis !== 'undefined') globalThis.puzzleRequirementsMet = puzzleRequirementsMet;
if (typeof globalThis !== 'undefined') globalThis.getPuzzlesForLocation = getPuzzlesForLocation;
if (typeof globalThis !== 'undefined') globalThis.countCompletedPuzzles = countCompletedPuzzles;
if (typeof globalThis !== 'undefined') globalThis.openPuzzleListForLocation = openPuzzleListForLocation;
if (typeof globalThis !== 'undefined') globalThis.renderPuzzleListPanel = renderPuzzleListPanel;
if (typeof globalThis !== 'undefined') globalThis.openPuzzleExploration = openPuzzleExploration;
if (typeof globalThis !== 'undefined') globalThis.closePuzzleExploration = closePuzzleExploration;
if (typeof globalThis !== 'undefined') globalThis.submitPuzzleAnswer = submitPuzzleAnswer;
if (typeof globalThis !== 'undefined') globalThis.completePuzzleExploration = completePuzzleExploration;

// --- Exported globals ---
if (typeof getPuzzleClue !== 'undefined') { if (typeof window !== 'undefined') window.getPuzzleClue = getPuzzleClue; if (typeof globalThis !== 'undefined') globalThis.getPuzzleClue = getPuzzleClue; }
if (typeof getPuzzleDisplayName !== 'undefined') { if (typeof window !== 'undefined') window.getPuzzleDisplayName = getPuzzleDisplayName; if (typeof globalThis !== 'undefined') globalThis.getPuzzleDisplayName = getPuzzleDisplayName; }
if (typeof getPuzzleSummary !== 'undefined') { if (typeof window !== 'undefined') window.getPuzzleSummary = getPuzzleSummary; if (typeof globalThis !== 'undefined') globalThis.getPuzzleSummary = getPuzzleSummary; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  ensurePuzzleState,
  getPuzzleById,
  isPuzzleCompleted,
  isPuzzleEverCompleted,
  isPuzzleSolvedThisRun,
  resetPuzzleRun,
  puzzleRequirementsMet,
  getPuzzlesForLocation,
  countCompletedPuzzles,
  openPuzzleListForLocation,
  renderPuzzleListPanel,
  openPuzzleExploration,
  closePuzzleExploration,
  submitPuzzleAnswer,
  completePuzzleExploration,
  getPuzzleClue,
  getPuzzleDisplayName,
  getPuzzleSummary,
};

