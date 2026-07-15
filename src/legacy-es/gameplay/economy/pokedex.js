function renderPokedex(el){
 const total = PD.filter(Boolean).length;
 const caught = Object.values(G.pokedex).filter(e=>e.caught).length;
 const seen = Object.values(G.pokedex).filter(e=>e.seen||e.caught).length;
 const shinyCount = PD.slice(1).filter((pd,i)=>pd && isSpeciesShiny(i+1)).length;

 
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 filterBar.style.display = 'flex';
 filterBar.style.gap = '16px';
 filterBar.style.alignItems = 'center';
 filterBar.innerHTML = `
 <span class="extracted-template-style-212">${t('pokedex_seen')}: <b class="extracted-template-style-232">${seen}</b></span>
 <span class="extracted-template-style-212">${t('pokedex_caught')}: <b class="extracted-template-style-232">${caught}</b> / ${total}</span>
 <span class="extracted-template-style-212">${t('pokedex_shiny')}: <b class="extracted-template-style-232">${shinyCount}</b> / ${total}</span>
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
 
 return `<div class="${classes.join(' ')}" ${isSeen?`data-action="legacy-call" data-call="openDexEntry" data-call-args="${id}"`:''} title="${isSeen?getPokeName(id):'???'}">
 <div class="dex-sprite extracted-template-style-217">${spriteImg(id,'',{size:72, shiny:isShiny, silhouette:!isCaught})}</div>
 <div class="dex-number">#${String(id).padStart(3,'0')}</div>
 <div class="dex-shiny ${isShiny?'is-visible':'is-hidden'}">★</div>
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
 
 inner.innerHTML = `<div class="modal-title">
 <div class="extracted-template-style-006">
 <div class="extracted-template-style-233">${spriteImg(id,emoji,{size:72, shiny:isShiny})}</div>
 <div>
 <div>#${id} ${isShiny?'<span class="shiny-tag">★</span>':''}${name}</div>
 <div class="extracted-template-style-026">${typeSpan(t1)}${t2?typeSpan(t2):''}</div>
 </div>
 </div>
 <span class="modal-close" data-action="close-poke-modal">✕</span>
 </div>
 ${getEvolutionMethodsHtml(id)}
 <div class="extracted-template-style-093">
 <div class="stat-row"><div class="stat-label">${t('stat_hp')}</div><div class="stat-bar"><div class="stat-fill"></div></div><div class="stat-val">${bhp}</div></div>
 <div class="stat-row"><div class="stat-label">${t('stat_atk')}</div><div class="stat-bar"><div class="stat-fill"></div></div><div class="stat-val">${batk}</div></div>
 <div class="stat-row"><div class="stat-label">${t('stat_def')}</div><div class="stat-bar"><div class="stat-fill"></div></div><div class="stat-val">${bdef}</div></div>
 <div class="stat-row"><div class="stat-label">${t('stat_spe')}</div><div class="stat-bar"><div class="stat-fill"></div></div><div class="stat-val">${bspe}</div></div>
 </div>
 <div class="extracted-template-style-234">${t('pokedex_moves')} :</div>
 <div class="extracted-template-style-094">
 ${(moves||[]).map(m=>`<span class="extracted-template-style-235">${getMoveName(m)||m}</span>`).join('')}
 </div>`;
 document.getElementById('poke-modal').classList.add('open');
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderPokedex !== 'undefined' && typeof window !== 'undefined') window.renderPokedex = renderPokedex;
if (typeof openDexEntry !== 'undefined' && typeof window !== 'undefined') window.openDexEntry = openDexEntry;

export {};
