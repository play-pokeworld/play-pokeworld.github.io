function ensureMapHelpButton(){
 if(document.getElementById('map-help-btn')) return;
 const header=document.querySelector('#win-map .win-header');
 if(!header) return;
 const btn=document.createElement('button');
 btn.id='map-help-btn';
 btn.className='win-tool-btn';
 btn.textContent='?';
 btn.title=t('map_help_title_attr');
 btn.dataset.action = 'toggle-map-help';
 header.appendChild(btn);
}


function toggleMapHelp(){
 let m=document.getElementById('map-help-modal');
 if(!m){
 m=document.createElement('div');
 m.id='map-help-modal';
 m.className='map-help-modal';
 m.innerHTML=`<div class="map-help-card">
 <div class="map-help-head"> ${t('map_help_title')}<button class="win-tool-btn extracted-bridge-style-014" data-action="toggle-map-help">✕</button></div>
 <div class="map-help-body">
 <div class="legend-row"><span class="legend-swatch extracted-bridge-style-015"></span>${t('map_help_green')}</div>
 <div class="legend-row"><span class="legend-swatch extracted-bridge-style-016"></span>${t('map_help_purple')}</div>
 <div class="legend-row"><span class="legend-swatch extracted-bridge-style-017"></span>${t('map_help_blue')}</div>
 <div class="legend-row"><span class="legend-swatch extracted-bridge-style-018"></span>${t('map_help_yellow')}</div>
 <div class="legend-row"><span class="legend-swatch extracted-bridge-style-019"></span>${t('map_help_gray')}</div>
 <div class="legend-row"><span class="legend-swatch extracted-bridge-style-020"></span>${t('map_help_transparent')}</div>
 </div>
 </div>`;
 document.body.appendChild(m);
 m.addEventListener('click', e=>{ if(e.target===m) toggleMapHelp(); });
 }
 m.classList.toggle('open');
}
