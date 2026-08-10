// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// pickWildEncounter / exploreArea are NOT defined here anymore: the spawn
// table rule moved to src/domain/world/encounter-rules.js and the spawn
// itself is produced by the `world:encounter` ECS system
// (src/application/encounter-system.js, wave 33 §1.1). Both names keep their
// exact public surface, re-exposed from the application layer.

function healTeam(){
 let healed=false;
 for(const p of G.team){
 if(p.currentHP<p.maxHP||p.status){
 p.currentHP=p.maxHP;
 p.status=null;
 healed=true;
 }
 }
 if(healed){
 notify(t('team_healed_center'));
 setMsg(t('all_pokemon_healed'));
 renderTeamWindow();
 } else setMsg(t('pokemon_already_healthy'));
}


function addToInventory(key, qty){
 if(!ITEMS[key]) return;
 const cur=G.inventory[key]||0;
 const maxLimit = ITEMS[key] && (ITEMS[key].type === 'held' || ITEMS[key].category || ITEMS[key].buff) ? 25 : 999999;
 G.inventory[key]=Math.min(maxLimit, cur+qty);
}


// --- Migrated to ES module, globals exposed ---
// pickWildEncounter / exploreArea: exposed by src/application/encounter-system.js (ECS).
if (typeof healTeam !== 'undefined') { if (typeof window !== 'undefined') window.healTeam = healTeam; if (typeof globalThis !== 'undefined') globalThis.healTeam = healTeam; }
if (typeof addToInventory !== 'undefined') { if (typeof window !== 'undefined') window.addToInventory = addToInventory; if (typeof globalThis !== 'undefined') globalThis.addToInventory = addToInventory; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  healTeam,
  addToInventory,
};
