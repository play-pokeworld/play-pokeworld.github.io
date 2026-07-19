const TRAINER_SPRITES = {
 blue:'Rival Blue.png', silver:'Silver.png', rocket:'Team Rocket Grunt (male).png', rocket_f:'Team Rocket Grunt (female).png', rocket_admin:'Rocket Executive (archer).png', giovanni:'Team Rocket Boss Giovanni.png',
 brock:'Brock.png', misty:'Misty.png', surge:'Lt. Surge.png', erika:'Erika.png', koga:'Koga.png', sabrina:'Sabrina.png', blaine:'Blaine.png',
 falkner:'Falkner.png', bugsy:'Bugsy.png', whitney:'Whitney.png', morty:'Morty.png', chuck:'Chuck.png', jasmine:'Jasmine.png', pryce:'Pryce.png', clair:'Clair.png',
 lorelei:'Lorelei.png', bruno:'Bruno.png', agatha:'Agatha.png', lance:'Lance.png', will:'Will.png', karen:'Karen.png', sage:'Elder Li.png', scientist:'Super Nerd.png', atoll:'Ace Trainer (male).png', trainer:'Ace Trainer (male).png'
};
const TRAINER_BATTLE_SPRITES = {
 kanto_rival_route22:'blue', kanto_rival_cerulean:'blue', kanto_rival_ssanne:'blue', kanto_rival_silph:'blue', kanto_rival_victory:'blue',
 johto_rival_cherrygrove:'silver', johto_rival_ilex:'silver', johto_rival_burned:'silver', johto_rival_victory:'silver',
 kanto_rocket_mtmoon:'rocket', kanto_rocket_hideout:'rocket_admin', kanto_giovanni_hideout:'giovanni', kanto_giovanni_silph:'giovanni',
 johto_rocket_slowpoke:'rocket', johto_rocket_lake:'rocket_admin', johto_rocket_radio:'rocket_admin', kanto_super_nerd_fossil:'scientist', johto_sprout_elder:'sage'
};
const CHAMPION_TRAINER_SPRITES = {brock:'brock',misty:'misty',surge:'surge',erika:'erika',koga:'koga',sabrina:'sabrina',blaine:'blaine',giovanni:'giovanni',falkner:'falkner',bugsy:'bugsy',whitney:'whitney',morty:'morty',chuck:'chuck',jasmine:'jasmine',pryce:'pryce',clair:'clair',elite4:'lance',johto_elite4:'lance',atoll:'atoll'};
function getTrainerSpriteKey(key){
 if(!key) return 'trainer';
 if(TRAINER_SPRITES[key]) return key;
 if(TRAINER_BATTLE_SPRITES[key]) return TRAINER_BATTLE_SPRITES[key];
 if(CHAMPION_TRAINER_SPRITES[key]) return CHAMPION_TRAINER_SPRITES[key];
 return 'trainer';
}
const STAFF_NPC_SPRITES = {
 manager_daisy: 'Lass.png',
 manager_celadon: 'Beauty.png',
 manager_saffron: 'Gentleman.png',
 manager_cinnabar: 'Scientist (female).png',
 manager_goldenrod: 'Lady.png',
 trainer_vermilion: 'Ace Trainer (male).png',
 trainer_saffron: 'Black Belt.png',
 trainer_fuchsia: 'Battle Girl.png',
 trainer_indigo: 'Veteran (male).png',
 trainer_blackthorn: 'Dragon Tamer.png',
 miner_pewter: 'Hiker.png',
 miner_cerulean: 'Worker (male).png',
 miner_cinnabar: 'Ruin Maniac.png',
 miner_mahogany: 'Backpacker (male).png',
 miner_blackthorn: 'Worker (female).png',
};
const STAFF_PROFILE_SPRITES = {
 manager_daisy: 0,
 manager_celadon: 6,
 manager_saffron: 12,
 manager_cinnabar: 18,
 manager_goldenrod: 24,
 trainer_vermilion: 36,
 trainer_saffron: 42,
 trainer_fuchsia: 48,
 trainer_indigo: 54,
 trainer_blackthorn: 60,
 miner_pewter: 72,
 miner_cerulean: 78,
 miner_cinnabar: 84,
 miner_mahogany: 90,
 miner_blackthorn: 96,
};
function trainerProfileImg(profileId, size=72){
 const safeId = Number(profileId);
 if(!Number.isFinite(safeId) || safeId < 0) return trainerSpriteImg('trainer', size);
 const file = `trainer-${safeId}.png`;
 return `<img class="trainer-sprite-img trainer-profile-img" src="src/assets/images/trainers/profil/${file}" width="${size}" height="${size}" alt="trainer-profile-${safeId}" onerror="this.onerror=null;this.src='src/assets/images/trainers/npcs/Ace Trainer (male).png';">`;
}
function staffSpriteImg(staffId, size=52){
 const npcFile = STAFF_NPC_SPRITES[staffId];
 if(npcFile){
  const safeFile = String(npcFile).replace(/"/g, '&quot;');
  return `<img class="trainer-sprite-img trainer-staff-img" src="src/assets/images/trainers/npcs/${safeFile}" width="${size}" height="${size}" alt="${staffId}" onerror="this.onerror=null;this.src='src/assets/images/trainers/npcs/Ace Trainer (male).png';">`;
 }
 const profileId = STAFF_PROFILE_SPRITES[staffId];
 if(profileId != null) return trainerProfileImg(profileId, size);
 const fallbackKey = String(staffId || '').includes('miner') ? 'scientist' : 'trainer';
 return trainerSpriteImg(fallbackKey, size);
}
function trainerSpriteImg(key, size=72){
 const spriteKey = getTrainerSpriteKey(key);
 const file = TRAINER_SPRITES[spriteKey] || TRAINER_SPRITES.trainer;
 const safeFile = String(file).replace(/"/g, '&quot;');
 return `<img class="trainer-sprite-img" src="src/assets/images/trainers/npcs/${safeFile}" width="${size}" height="${size}" alt="${spriteKey}">`;
}
if (typeof TRAINER_SPRITES !== 'undefined' && typeof window !== 'undefined') window.TRAINER_SPRITES = TRAINER_SPRITES;
if (typeof TRAINER_BATTLE_SPRITES !== 'undefined' && typeof window !== 'undefined') window.TRAINER_BATTLE_SPRITES = TRAINER_BATTLE_SPRITES;
if (typeof CHAMPION_TRAINER_SPRITES !== 'undefined' && typeof window !== 'undefined') window.CHAMPION_TRAINER_SPRITES = CHAMPION_TRAINER_SPRITES;
if (typeof getTrainerSpriteKey !== 'undefined' && typeof window !== 'undefined') window.getTrainerSpriteKey = getTrainerSpriteKey;
if (typeof trainerSpriteImg !== 'undefined' && typeof window !== 'undefined') window.trainerSpriteImg = trainerSpriteImg;
if (typeof trainerProfileImg !== 'undefined' && typeof window !== 'undefined') window.trainerProfileImg = trainerProfileImg;
if (typeof staffSpriteImg !== 'undefined' && typeof window !== 'undefined') window.staffSpriteImg = staffSpriteImg;


