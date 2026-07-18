function renderAutomationWindow(){
 const el = document.getElementById('automation-window-body');
 if(el) el.innerHTML = '';
}
const AUTOMATION_UPGRADE_COSTS = {autoHatch:250000, autoSeedHatchery:500000};
function isAutomationPurchased(key){
 if(!AUTOMATION_UPGRADE_COSTS[key]) return true;
 if(!G.automationUpgrades || typeof G.automationUpgrades !== 'object') G.automationUpgrades = {};
 if(G.automation && G.automation[key] === true && !G.automationUpgrades[key]) G.automationUpgrades[key] = true;
 return !!G.automationUpgrades[key];
}
function getAutomationUpgradeLabelSuffix(key){
 const cost = AUTOMATION_UPGRADE_COSTS[key] || 0;
 return (!isAutomationPurchased(key) && cost) ? ` · ${cost.toLocaleString()}₽` : '';
}
function purchaseAutomationIfNeeded(key){
 const cost = AUTOMATION_UPGRADE_COSTS[key] || 0;
 if(!cost || isAutomationPurchased(key)) return true;
 if(G.money < cost){ notify(tr('automation_upgrade_need_money', {price:cost.toLocaleString()}), 'var(--red)'); return false; }
 G.money -= cost;
 if(!G.automationUpgrades || typeof G.automationUpgrades !== 'object') G.automationUpgrades = {};
 G.automationUpgrades[key] = true;
 updateHeader();
 notify(tr('automation_upgrade_bought', {name:t('automation_'+key), price:cost.toLocaleString()}), 'var(--green)');
 return true;
}
function buyAutomationUpgrade(key){
 if(isAutomationPurchased(key)){ notify(t('automation_already_bought'), 'var(--green)'); return; }
 if(purchaseAutomationIfNeeded(key)){
  saveGame();
  try{ openHatcheryManagementMenu('automation'); }catch(_){}
 }
}
function toggleAutomationButton(key){
 if(!G.automation) G.automation = {};
 if(!isAutomationPurchased(key)){
  buyAutomationUpgrade(key);
  return;
 }
 toggleAutomation(key, !G.automation[key]);
 try{ openHatcheryManagementMenu('automation'); }catch(_){}
}
function toggleAutomation(key, val){
 if(!G.automation) G.automation = {};
 if(val && !purchaseAutomationIfNeeded(key)){
  G.automation[key] = false;
  try{ renderHatcheryWindow(); }catch(_){}
  return;
 }
 G.automation[key] = val;
 notify(` ${t('automation_'+key) || key} ${val ? (t("m.automation.2")) : (t("m.automation.1"))}`, val ? 'var(--green)' : 'var(--light1)');
 saveGame();
 if(key === 'autoSeedHatchery' && val){
   try {
     if(!G.hatchery) G.hatchery = [null];
     const boxKeys = Object.keys(G.collection||{});
     let boxIdx=0;
     for(let i=0;i<G.hatchery.length;i++){
       if(G.hatchery[i]===null){
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
if (typeof isAutomationPurchased !== 'undefined' && typeof window !== 'undefined') window.isAutomationPurchased = isAutomationPurchased;
if (typeof buyAutomationUpgrade !== 'undefined' && typeof window !== 'undefined') window.buyAutomationUpgrade = buyAutomationUpgrade;
if (typeof toggleAutomationButton !== 'undefined' && typeof window !== 'undefined') window.toggleAutomationButton = toggleAutomationButton;
if (typeof getAutomationUpgradeLabelSuffix !== 'undefined' && typeof window !== 'undefined') window.getAutomationUpgradeLabelSuffix = getAutomationUpgradeLabelSuffix;
if (typeof toggleAutomation !== 'undefined' && typeof window !== 'undefined') window.toggleAutomation = toggleAutomation;

export {};
