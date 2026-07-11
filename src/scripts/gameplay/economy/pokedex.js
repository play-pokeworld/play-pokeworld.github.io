// ===== Pokedex - Header fixe avec stats, contenu scrollable =====
function renderPokedex(el){
 const total = PD.filter(Boolean).length;
 const caught = Object.values(G.pokedex).filter(e=>e.caught).length;
 const seen = Object.values(G.pokedex).filter(e=>e.seen||e.caught).length;
 const shinyCount = PD.slice(1).filter((pd,i)=>pd && isSpeciesShiny(i+1)).length;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

 // === BARRE FIXE: stats vues/capturé/shiny ===
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 filterBar.style.display = 'flex';
 filterBar.style.gap = '16px';
 filterBar.style.alignItems = 'center';
 filterBar.innerHTML = `
 <span style="color:var(--light2);font-size:13px;">${lang==='en'?'Seen':'Vus'}: <b style="font-size:15px;">${seen}</b></span>
 <span style="color:var(--light2);font-size:13px;">${lang==='en'?'Caught':'Capturés'}: <b style="font-size:15px;">${caught}</b> / ${total}</span>
 <span style="color:var(--light2);font-size:13px;">${lang==='en'?'Shiny':'Shiny'}: <b style="font-size:15px;">${shinyCount}</b> / ${total}</span>
 `;
 }

 el.innerHTML = `
 <div class="dex-grid">
 ${PD.slice(1).map((pd,i)=>{
 if(!pd) return '';
 const id = i+1;
 const entry = G.pokedex[id];
 const isCaught = entry?.caught;
 const isSeen = entry?.seen || isCaught;
 const isShiny = isSpeciesShiny(id);
 const classes = ['dex-entry'];
 if(isCaught) classes.push('caught');
 else if(isSeen) classes.push('seen');
 else classes.push('unknown');
 
 return `<div class="${classes.join(' ')}" onclick="${isSeen?`openDexEntry(${id})`:''}" title="${isSeen?getPokeName(id):'???'}">
 <div class="dex-sprite" style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;">${spriteImg(id,'',{size:72, shiny:isShiny, silhouette:!isCaught})}</div>
 <div class="dex-number">#${String(id).padStart(3,'0')}</div>
 <div class="dex-shiny" style="display:${isShiny?'block':'none'}">★</div>
 </div>`;
 }).join('')}
 </div>`;
}

function openDexEntry(id){
 const pd = PD[id];
 if(!pd) return;
 const [name,t1,t2,bhp,batk,bdef,bspe,moves,emoji] = pd;
 const isShiny = isSpeciesShiny(id);
 const inner = document.getElementById('poke-modal-inner');
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 
 inner.innerHTML = `<div class="modal-title">
 <div style="display:flex;align-items:center;gap:10px">
 <div style="font-size:32px">${spriteImg(id,emoji,{size:72, shiny:isShiny})}</div>
 <div>
 <div>#${id} ${isShiny?'<span class="shiny-tag">★</span>':''}${name}</div>
 <div style="margin-top:3px">${typeSpan(t1)}${t2?typeSpan(t2):''}</div>
 </div>
 </div>
 <span class="modal-close" onclick="document.getElementById('poke-modal').classList.remove('open')">✕</span>
 </div>
 ${getEvolutionMethodsHtml(id)}
 <div style="margin:10px 0">
 <div class="stat-row"><div class="stat-label">${lang==='en'?'Max HP':'PV Max'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,bhp/2)}%;background:var(--green)"></div></div><div class="stat-val">${bhp}</div></div>
 <div class="stat-row"><div class="stat-label">${lang==='en'?'Attack':'Attaque'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,batk/2)}%;background:var(--red)"></div></div><div class="stat-val">${batk}</div></div>
 <div class="stat-row"><div class="stat-label">${lang==='en'?'Defense':'Défense'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,bdef/2)}%;background:var(--blue)"></div></div><div class="stat-val">${bdef}</div></div>
 <div class="stat-row"><div class="stat-label">${lang==='en'?'Speed':'Vitesse'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,bspe/2)}%;background:var(--orange)"></div></div><div class="stat-val">${bspe}</div></div>
 </div>
 <div style="font-size:13px;color:var(--light2);margin-bottom:4px">${lang==='en'?'Moves':'Capacités'} :</div>
 <div style="display:flex;flex-wrap:wrap;gap:4px">
 ${(moves||[]).map(m=>`<span style="background:var(--dark3);color:var(--light2);border-radius:4px;padding:3px 8px;font-size:13px">${getMoveName(m)||m}</span>`).join('')}
 </div>`;
 document.getElementById('poke-modal').classList.add('open');
}
