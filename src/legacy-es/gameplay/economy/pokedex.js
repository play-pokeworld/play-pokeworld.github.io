
function findPokemonSources(id){
 const out=[];
 const add=(kind, label)=>{ if(label && !out.some(x=>x.kind===kind&&x.label===label)) out.push({kind,label}); };
 for(const [locId,loc] of Object.entries(LOCS||{})) if((loc.wild||[]).some(w=>Number(w[0])===Number(id))) add('zone', getLocName(locId));
 for(const [locId,loc] of Object.entries(LOCS_JOHTO||{})) if((loc.wild||[]).some(w=>Number(w[0])===Number(id))) add('zone', getLocName(locId));
 for(const base in (LEVEL_EVO_MAP||{})) if(Number(LEVEL_EVO_MAP[base])===Number(id)) add('evo', `${getPokeName(Number(base))} (${t('level_word')} ${EVO_LEVELS[base]||'?'})`);
 for(const base in (STONE_EVO||{})) for(const stone in STONE_EVO[base]) if(Number(STONE_EVO[base][stone])===Number(id)) add('evo', `${getPokeName(Number(base))} + ${getItemName(stone)}`);
 if(typeof FOSSIL_REVIVE_MAP !== 'undefined') for(const fk in FOSSIL_REVIVE_MAP) if(Number(FOSSIL_REVIVE_MAP[fk])===Number(id)) add('fossil', getItemName(typeof getFossilDisplayKey==='function'?getFossilDisplayKey(fk):fk));
 if((STORY_QUESTS||[]).some(q=>Number(q.rewardPoke)===Number(id))) add('quest', t('dex_quest_source'));
 if(!out.length) add('unknown', t('dict_unknown_source'));
 return out;
}
function getDexFlavor(id){
 const lang = (G && G.lang) || 'fr';
 const data = (typeof POKEDEX_FLAVOR !== 'undefined') ? POKEDEX_FLAVOR : null;
 return (data && data[lang] && data[lang][id]) || (data && data.en && data.en[id]) || '';
}

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
 const name = getPokeName(id);
 const t1 = pd[1], t2 = pd[2];
 const bhp = pd[3] || 0, batk = pd[4] || 0, bdef = pd[5] || 0, bspa = pd[6] || batk, bspd = pd[7] || bdef, bspe = pd[8] || 0;
 const moves = Array.isArray(pd[9]) ? pd[9] : [];
 const emoji = pd[12] || '';
 const isShiny = isSpeciesShiny(id);
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 const desc = getDexFlavor(id);
 const sources = findPokemonSources(id);
 const tals = (typeof getSpeciesTalents === 'function') ? getSpeciesTalents(id) : [];
 inner.classList.add('poke-detail-inner');
 inner.innerHTML = `<div class="modal-title poke-detail-title">
 <div>#${id} ${isShiny?'<span class="shiny-tag">★</span>':''}${name}</div>
 <span class="modal-close" data-action="close-poke-modal">✕</span>
 </div>
 <div class="dex-detail-layout">
   <div class="dex-detail-hero">
     <div class="dex-detail-orb">${spriteImg(id,emoji,{size:120, shiny:isShiny})}</div>
     <div class="dex-detail-types">${typeSpan(t1)}${t2?typeSpan(t2):''}</div>
   </div>
   <div class="dex-detail-main">
     <p class="dex-flavor">${desc || 'Description indisponible pour le moment.'}</p>
     ${getEvolutionMethodsHtml(id)}
     <div class="dex-detail-section"><h3>${t('dex_where')}</h3><div class="dict-chip-list">${sources.map(s=>`<span class="dict-chip">${s.label}</span>`).join('')}</div></div>
     <div class="dex-detail-section"><h3>${t('pokedex_moves')}</h3><div class="dict-chip-list">${moves.length?moves.map(m=>`<span class="dict-chip" data-action="legacy-call" data-call="openMoveInfo" data-call-args="'${m}'">${getMoveName(m)||m}</span>`).join(''):`<span class="dict-muted">${t('dex_no_moves')}</span>`}</div></div>
     <div class="dex-detail-section"><h3>${t('pokemon_talents')}</h3><div class="dict-chip-list">${tals.length?tals.map(tal=>`<span class="dict-chip" data-action="legacy-call" data-call="openAbilityInfo" data-call-args="'${tal}'">${TALENTS_FULL[tal]?.name||tal}</span>`).join(''):`<span class="dict-muted">${t('dex_no_talents')}</span>`}</div></div>
     <div class="dex-detail-section"><h3>${t('dex_base_stats')}</h3><div class="dex-stat-mini"><span>PV ${bhp}</span><span>ATK ${batk}</span><span>DEF ${bdef}</span><span>ASP ${bspa}</span><span>DSP ${bspd}</span><span>VIT ${bspe}</span></div></div>
   </div>
 </div>`;
 document.getElementById('poke-modal').classList.add('open');
}


// --- Migrated to ES module, globals exposed ---
if (typeof findPokemonSources !== 'undefined' && typeof window !== 'undefined') window.findPokemonSources = findPokemonSources;
if (typeof renderPokedex !== 'undefined' && typeof window !== 'undefined') window.renderPokedex = renderPokedex;
if (typeof openDexEntry !== 'undefined' && typeof window !== 'undefined') window.openDexEntry = openDexEntry;

export {};
