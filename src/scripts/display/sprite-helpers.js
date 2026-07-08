function spriteImg(id, emoji, {shiny=false, back=false, size=44, cls=''}={}){
  const num=DEX_MAP[id];
  const key = (shiny?'front':'front'); // placeholder, overwritten below
  const bucket = back ? (shiny?'backShiny':'back') : (shiny?'frontShiny':'front');
  const src = num!=null ? SPRITE_DATA[bucket][String(num)] : null;
  if(!src) return `<span style="font-size:${Math.floor(size*0.6)}px">${emoji}</span>`;
  return `<img src="${src}" alt="${emoji}" class="sprite-img ${cls}" style="width:${size}px;height:${size}px">`;
}
function itemIcon(key, size=20, cls=''){
  let src = ITEM_SPRITE_DATA[key];
  if(!src){
    if(key === 'rarecandy') src = ITEM_SPRITE_DATA['rarcandy'];
    else if(key === 'chroma_charm') src = ITEM_SPRITE_DATA['stardust'];
    else if(key.includes('berry')) src = ITEM_SPRITE_DATA['berry'];
    else if(key.includes('choice')) src = ITEM_SPRITE_DATA['xattack'];
    else if(key.includes('stone')) src = ITEM_SPRITE_DATA['moonstone'];
    else if(key.includes('charm')) src = ITEM_SPRITE_DATA['pearl'];
    else if(key === 'leftovers') src = ITEM_SPRITE_DATA['fullrestore'];
    else if(key === 'life_orb') src = ITEM_SPRITE_DATA['revive'];
    else if(key === 'assault_vest' || key === 'eviolite') src = ITEM_SPRITE_DATA['xdefend'];
    else src = ITEM_SPRITE_DATA['potion'];
  }
  const emoji = ITEMS[key]?.icon || '❔';
  return `<img src="${src}" alt="${emoji}" class="sprite-img ${cls}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;">`;
}

// ============================================================
// ITEMS
// ============================================================
// ============================================================
// ITEMS — équipables uniquement (Baies + Buffs)
// Chaque item a `buff:{stat:maxMultiplier}` : l'effet est n/25 × max, où n
// est le nombre d'exemplaires du même item dans le sac (max 25).
// Un même item ne peut être équipé que sur UN Pokémon de l'équipe active.
// ============================================================
const BAG_MAX = 25;
