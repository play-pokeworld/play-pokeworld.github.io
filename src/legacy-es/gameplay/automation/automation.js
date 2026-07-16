function renderAutomationWindow(){
 const el = document.getElementById('automation-window-body');
 if(el) el.innerHTML = '';
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


// --- Migrated to ES module, globals exposed ---
if (typeof renderAutomationWindow !== 'undefined' && typeof window !== 'undefined') window.renderAutomationWindow = renderAutomationWindow;
if (typeof toggleAutomation !== 'undefined' && typeof window !== 'undefined') window.toggleAutomation = toggleAutomation;

export {};
