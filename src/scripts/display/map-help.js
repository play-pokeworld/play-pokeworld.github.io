// ============================================================
// MAP HELP — (split from map.js)
// ============================================================
function ensureMapHelpButton(){
  if(document.getElementById('map-help-btn')) return;
  const header=document.querySelector('#win-map .win-header');
  if(!header) return;
  const btn=document.createElement('button');
  btn.id='map-help-btn';
  btn.className='win-tool-btn';
  btn.textContent='?';
  btn.title='Aide — code couleur de la carte';
  btn.setAttribute('onclick','toggleMapHelp()');
  header.appendChild(btn);
}


function toggleMapHelp(){
  let m=document.getElementById('map-help-modal');
  if(!m){
    m=document.createElement('div');
    m.id='map-help-modal';
    m.className='map-help-modal';
    m.innerHTML=`<div class="map-help-card">
      <div class="map-help-head">🗺️ Code couleur de la carte<button class="win-tool-btn" onclick="toggleMapHelp()">✕</button></div>
      <div class="map-help-body">
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(31,138,59,0.55)"></span><b>Vert</b> — Une quête (principale ou secondaire) est à faire ici.</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(123,31,162,0.55)"></span><b>Violet</b> — Un Pokémon légendaire errant est présent (non capturé).</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(21,101,194,0.55)"></span><b>Bleu</b> — Des Pokémon sont encore à capturer.</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(201,160,0,0.60)"></span><b>Jaune</b> — Un shiny est encore à capturer.</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(58,63,68,0.55)"></span><b>Gris</b> — Zone verrouillée (badge ou histoire manquant).</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(255,255,255,0.12);border:1px solid #777"></span><b>Transparent</b> — Zone terminée (tout est capturé).</div>
      </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e=>{ if(e.target===m) toggleMapHelp(); });
  }
  m.classList.toggle('open');
}

// Rafraîchit la carte et la fiche du lieu courant (capture / victoire /
// prise de quête) pour une mise à jour instantanée de l'UI.
