function renderAutomationWindow(){
 const el = document.getElementById('automation-window-body');
 if(!el) return;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 if(!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
 
 el.innerHTML = `
 <div class="extracted-template-style-086">
 ${t("m.automation.7")}
 </div>
 <div class="extracted-template-style-125">
 <label class="extracted-template-style-126">
 <div>
 <b class="extracted-template-style-127"> ${t("m.automation.6")}</b>
 <div class="extracted-template-style-007">${t("m.automation.5")}</div>
 </div>
 <input type="checkbox"${G.automation.autoHatch ? 'checked' : ''} data-change-call="toggleAutomation" data-change-args="'autoHatch', this.checked" class="extracted-bridge-style-028">
 </label>
 <label class="extracted-template-style-126">
 <div>
 <b class="extracted-template-style-127"> ${t("m.automation.4")}</b>
 <div class="extracted-template-style-007">${t("m.automation.3")}</div>
 </div>
 <input type="checkbox"${G.automation.autoSeedHatchery ? 'checked' : ''} data-change-call="toggleAutomation" data-change-args="'autoSeedHatchery', this.checked" class="extracted-bridge-style-028">
 </label>
 </div>
 `;
}
function toggleAutomation(key, val){
 if(!G.automation) G.automation = {};
 G.automation[key] = val;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 notify(` ${key} ${val ? (t("m.automation.2")) : (t("m.automation.1"))}`, val ? 'var(--green)' : 'var(--light1)');
 saveGame();
 if(key === 'autoSeedHatchery' && val){
   try {
     if(!G.hatchery) G.hatchery = [null];
     // Fill all empty slots from box
     const boxKeys = Object.keys(G.collection||{});
     let boxIdx=0;
     for(let i=0;i<G.hatchery.length;i++){
       if(G.hatchery[i]===null){
         // Find next available from box
         while(boxIdx < boxKeys.length){
           const k=boxKeys[boxIdx++];
           const cand=G.collection[k];
           if(cand && cand.uid){
             G.hatchery[i] = { poke: cand, steps: 0, stepsReq: (cand.level||1)*2+8 };
             delete G.collection[k];
             break;
           }
         }
       }
     }
     if(typeof renderHatcheryWindow === 'function') renderHatcheryWindow();
     if(typeof renderTeamWindow === 'function') renderTeamWindow();
     if(typeof updateHeader === 'function') updateHeader();
   } catch(e){ console.error(e); }
 }
}
