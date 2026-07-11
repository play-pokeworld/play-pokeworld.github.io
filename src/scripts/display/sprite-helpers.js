// Fallback : si un sprite (PNG) est absent/ne charge pas, on affiche l'emoji
// à la place au lieu d'une image cassée.
function spriteFallback(img, emoji, size){
 try{
 const span = document.createElement('span');
 span.style.fontSize = Math.floor(size*0.6)+'px';
 span.textContent = emoji;
 if(img && typeof img.replaceWith === 'function') img.replaceWith(span);
 }catch(_){}
}
function spriteImg(id, emoji, {shiny=false, back=false, size=40, cls='', silhouette=false}={}){
 const num=DEX_MAP[id];
 const bucket = back ? (shiny?'backShiny':'back') : (shiny?'frontShiny':'front');
 const src = num!=null ? SPRITE_DATA[bucket][String(num)] : null;
 if(!src) return `<span style="font-size:${Math.floor(size*0.6)}px">${emoji}</span>`;
 if(silhouette){
 // Use SVG filter for silhouette (no CORS issues)
 return `<img src="${src}"alt="${emoji}"class="sprite-img ${cls} silhouette-img"style="width:${size}px;height:${size}px;filter:url(#silhouette-filter);"onerror="spriteFallback(this,'${emoji}',${size})">`;
 }
 return `<img src="${src}"alt="${emoji}"class="sprite-img ${cls}"style="width:${size}px;height:${size}px"onerror="spriteFallback(this,'${emoji}',${size})">`;
}

// Create a silhouette version of a sprite using canvas
// All non-transparent pixels become a uniform dark gray color
function spriteSilhouette(id, emoji, {size=40, cls=''}={}){
 const num=DEX_MAP[id];
 if(num==null) return `<span style="font-size:${Math.floor(size*0.6)}px">${emoji}</span>`;
 const src = SPRITE_DATA['front'][String(num)];
 if(!src) return `<span style="font-size:${Math.floor(size*0.6)}px">${emoji}</span>`;
 
 // Create a canvas-based silhouette
 const canvasId = 'sil-canvas-' + id;
 return `<div style="width:${size}px;height:${size}px;position:relative;overflow:hidden;">
   <img src="${src}" style="width:${size}px;height:${size}px;object-fit:contain;" 
        onload="silhouetteCanvas(this, '${canvasId}', ${size})"
        onerror="this.style.display='none'">
   <canvas id="${canvasId}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;position:absolute;top:0;left:0;"></canvas>
 </div>`;
}

// Process an image into a silhouette on a canvas
function silhouetteCanvas(img, canvasId, size){
 try{
   const canvas = document.getElementById(canvasId);
   if(!canvas) return;
   const ctx = canvas.getContext('2d');
   ctx.clearRect(0, 0, size, size);
   
   // Draw the image
   ctx.drawImage(img, 0, 0, size, size);
   
   // Get pixel data
   const imageData = ctx.getImageData(0, 0, size, size);
   const data = imageData.data;
   
   // Replace all non-transparent pixels with dark gray
   const gray = 40; // Dark gray color (rgb(40, 40, 40))
   for(let i = 0; i < data.length; i += 4){
     if(data[i+3] > 0){ // If alpha > 0
       data[i] = gray;     // R
       data[i+1] = gray;   // G
       data[i+2] = gray;   // B
       data[i+3] = 255;    // Alpha (fully opaque)
     }
   }
   
   // Put the modified pixels back
   ctx.putImageData(imageData, 0, 0);
   
   // Hide the original image
   img.style.display = 'none';
 }catch(e){
   console.error('Silhouette error:', e);
 }
}
function itemIcon(key, size=20, cls=''){
 let src = ITEM_SPRITE_DATA[key];
 if(!src){
 if(key === 'rarecandy') src = ITEM_SPRITE_DATA['rarcandy'];
 else if(key === 'chroma_charm') src = ITEM_SPRITE_DATA['stardust'];
 else if(key.includes('berry')) src = ITEM_SPRITE_DATA['berry'];
 else if(key.includes('choice')) src = ITEM_SPRITE_DATA['choice_band'] || ITEM_SPRITE_DATA['muscle_band'];
 else if(key.includes('stone')) src = ITEM_SPRITE_DATA['moonstone'];
 else if(key.includes('charm')) src = ITEM_SPRITE_DATA['swift_charm'] || ITEM_SPRITE_DATA['pearl'];
 else if(key === 'leftovers') src = ITEM_SPRITE_DATA['fullrestore'];
 else if(key === 'life_orb') src = ITEM_SPRITE_DATA['revive'];
 else if(key === 'assault_vest' || key === 'eviolite') src = ITEM_SPRITE_DATA[key] || ITEM_SPRITE_DATA['muscle_band'];
 else src = ITEM_SPRITE_DATA['potion'];
 }
 const emoji = ITEMS[key]?.icon || '❔';
 if(!src) return `<span style="font-size:${Math.floor(size*0.7)}px">${emoji}</span>`;
 return `<img src="${src}"alt="${emoji}"class="sprite-img ${cls}"style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;"onerror="spriteFallback(this,'${emoji}',${size})">`;
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


