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
 if(!src) return `<span class="sprite-fallback-emoji">${emoji}</span>`;
 if(silhouette){
 
 return `<img src="${src}"alt="${emoji}" class="sprite-img ${cls} silhouette-img silhouette-filtered" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
 }
 return `<img src="${src}"alt="${emoji}" class="sprite-img ${cls}" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
}


function spriteSilhouette(id, emoji, {size=40, cls=''}={}){
 const num=DEX_MAP[id];
 if(num==null) return `<span class="sprite-fallback-emoji">${emoji}</span>`;
 const src = SPRITE_DATA['front'][String(num)];
 if(!src) return `<span class="sprite-fallback-emoji">${emoji}</span>`;
 
 
 const canvasId = 'sil-canvas-' + id;
 return `<div class="sprite-silhouette-wrapper">
   <img src="${src}" class="sprite-silhouette-img" width="${size}" height="${size}" 
        onload="silhouetteCanvas(this, '${canvasId}', ${size})"
        onerror="this.style.display='none'">
   <canvas id="${canvasId}" class="sprite-silhouette-canvas" width="${size}" height="${size}"></canvas>
 </div>`;
}


function silhouetteCanvas(img, canvasId, size){
 try{
   const canvas = document.getElementById(canvasId);
   if(!canvas) return;
   const ctx = canvas.getContext('2d');
   ctx.clearRect(0, 0, size, size);
   
   
   ctx.drawImage(img, 0, 0, size, size);
   
   
   const imageData = ctx.getImageData(0, 0, size, size);
   const data = imageData.data;
   
   
   const gray = 40; 
   for(let i = 0; i < data.length; i += 4){
     if(data[i+3] > 0){ 
       data[i] = gray;     
       data[i+1] = gray;   
       data[i+2] = gray;   
       data[i+3] = 255;    
     }
   }
   
   
   ctx.putImageData(imageData, 0, 0);
   
   
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
 const emoji = ITEMS[key]?.icon || '?';
 if(!src) return `<span class="sprite-fallback-emoji">${emoji}</span>`;
 return `<img src="${src}"alt="${emoji}" class="sprite-img ${cls} sprite-middle" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
}


const BAG_MAX = 25;

