
// ===== extracted from src/scripts/gameplay/mine.js =====
function renderPokedex(el){
  const total=PD.filter(Boolean).length;
  const caught=Object.values(G.pokedex).filter(e=>e.caught).length;
  const seen=Object.values(G.pokedex).filter(e=>e.seen||e.caught).length;
  const shinyCount=PD.slice(1).filter((pd,i)=>pd && isSpeciesShiny(i+1)).length;
  el.innerHTML=`<div style="font-size:12px;color:var(--dim);margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <span>${t('dex_seen')} <b style="color:var(--text)">${seen}</b></span> | 
    <span>${t('dex_caught')} <b style="color:var(--gold)">${caught}</b> / ${total}</span> | 
    <span style="color:var(--yellow);font-weight:bold;background:rgba(255,215,0,0.12);padding:2px 8px;border-radius:10px;border:1px solid var(--yellow)">${t('dex_shiny')} ${shinyCount} / ${total}</span>
  </div>
  <div class="dex-grid">
    ${PD.slice(1).map((pd,i)=>{
      if(!pd) return '';
      const id=i+1;
      const entry=G.pokedex[id];
      const isCaught=entry?.caught;
      const isSeen=entry?.seen||isCaught;
      const isShiny=isSpeciesShiny(id);
      return `<div class="dex-entry${isCaught?'':isSeen?' seen':' unknown'}${isShiny?' is-shiny':''}" onclick="${isSeen?`openDexEntry(${id})`:''}" style="${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.08);box-shadow:0 0 8px rgba(255,215,0,0.3);':''}">
        <div class="dex-sprite${isShiny?' is-shiny':''}" style="background:${TYPE_COLORS[pd[1]]}22">${isSeen?spriteImg(id,'',{size:32, shiny:isShiny}):'❓'}</div>
        <div class="dex-name">${isShiny?'<span class="shiny-tag" title="Forme Shiny">✨</span>':''}${isSeen?getPokeName(id):'???'}</div>
        ${isShiny?`<div style="font-size:10px;color:var(--yellow);font-weight:bold">✨ Shiny</div>`:isCaught?`<div style="font-size:9px;color:var(--gold)">${t('owned_btn')}</div>`:isSeen?`<div style="font-size:9px;color:var(--dim)">Vu</div>`:''}
      </div>`;
    }).join('')}
  </div>`;
}
function openDexEntry(id){
  const pd=PD[id];
  if(!pd) return;
  const [name,t1,t2,bhp,batk,bdef,bspe,moves,emoji] = pd;
  const isShiny = isSpeciesShiny(id);
  const inner=document.getElementById('poke-modal-inner');
  inner.innerHTML=`<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="${isShiny?'is-shiny':''}" style="font-size:32px">${spriteImg(id,emoji,{size:56, shiny:isShiny})}</div>
      <div>
        <div>#${id} ${isShiny?'<span class="shiny-tag" title="Forme Shiny">✨</span>':''}${name}</div>
        <div style="margin-top:3px">${typeSpan(t1)}${t2?typeSpan(t2):''}</div>
        ${isShiny?`<div style="font-size:11px;color:var(--yellow);margin-top:4px;font-weight:bold">✨ Forme Shiny débloquée / possédée !</div>`:''}
      </div>
    </div>
    <span class="modal-close" onclick="document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  ${getEvolutionMethodsHtml(id)}
  <div style="margin:10px 0">
    <div class="stat-row"><div class="stat-label">PV Max</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,bhp/2)}%;background:var(--green)"></div></div><div class="stat-val">${bhp}</div></div>
    <div class="stat-row"><div class="stat-label">Attaque</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,batk/2)}%;background:var(--red)"></div></div><div class="stat-val">${batk}</div></div>
    <div class="stat-row"><div class="stat-label">Défense</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,bdef/2)}%;background:var(--blue)"></div></div><div class="stat-val">${bdef}</div></div>
    <div class="stat-row"><div class="stat-label">Atk Spé</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,pd[6]/2)}%;background:#e91e63"></div></div><div class="stat-val">${pd[6]}</div></div>
    <div class="stat-row"><div class="stat-label">Déf Spé</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,pd[7]/2)}%;background:#9c27b0"></div></div><div class="stat-val">${pd[7]}</div></div>
    <div class="stat-row"><div class="stat-label">Vitesse</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,pd[8]/2)}%;background:var(--yellow)"></div></div><div class="stat-val">${pd[8]}</div></div>
  </div>
  <div style="font-size:12px;color:var(--dim);margin-bottom:4px">Capacités :</div>
  <div style="display:flex;flex-wrap:wrap;gap:4px">
    ${moves.map(m=>`<span style="background:var(--card);border-radius:4px;padding:3px 8px;font-size:11px">${getMoveName(m)||m}</span>`).join('')}
  </div>`;
  document.getElementById('poke-modal').classList.add('open');
}



