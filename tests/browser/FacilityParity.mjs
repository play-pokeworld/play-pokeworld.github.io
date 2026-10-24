/**
 * @file FacilityParity.mjs
 * @brief Optional real-Chromium acceptance checks. Progression is explicitly seeded; this is not a playthrough.
 * Run a local server, install Playwright separately, then:
 * PW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=playwright node tests/browser/FacilityParity.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-facilities');
await fs.mkdir(output, { recursive: true });
for (const file of ['failure.html', 'failure.png']) await fs.rm(path.join(output, file), { force: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1560, height: 1120 } });
page.setDefaultTimeout(10000);
const issues = [], results = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => { if (['warning', 'error'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`); });
page.on('response', (response) => { if (response.status() >= 400) issues.push(`HTTP ${response.status()} ${response.url()}`); });
// Stop only training ticks so exact persistence comparisons do not race the display refresh.
// The UI, events, system commands, RAF and other engine systems remain real.
await page.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    import('/src/systems/TrainingSystem.js').then(({ TrainingSystem }) => TrainingSystem.getInstance().setEnabled(false));
  });
});
async function check(name, action) {
  try { const detail = await action(); results.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
  catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  }
}
async function domState() {
  return page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    return SaveSystem.getInstance().getCurrentSave().serialize();
  });
}
async function openManagement(feature) {
  await page.locator(`#win-${feature} .pw-facility-manage`).last().click();
  await page.locator(`#pw-${feature}-management`).waitFor({ state: 'visible' });
  return page.locator(`#pw-${feature}-management`);
}
async function closeManagement(feature) { await page.locator(`#pw-${feature}-management .pw-modal-close-btn`).click(); }
async function tab(modal, index) { await modal.locator('.management-tabs button').nth(index).click(); }
async function chooseSpecies(species) { await page.locator(`#fs-box .pw-pokemon-grid-entry[data-species-id="${species}"]`).click(); }
let fixture;
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  fixture = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js');
    const { BoxSystem } = await import('/src/systems/BoxSystem.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { FeatureAccessSystem } = await import('/src/systems/FeatureAccessSystem.js');
    const { QuestSystem } = await import('/src/systems/QuestSystem.js');
    const { LeagueDB } = await import('/src/data/trainers/LeagueDB.js');
    const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
    const saves = SaveSystem.getInstance();
    const backup = saves.createNewSave('Browser second', 'squirtle');
    const save = saves.createNewSave('Browser parity', 'charmander');
    save.tutorial.enabled = false;
    for (const feature of ['hatchery','training','mine']) save.access.unlockFeature(feature);
    for (const id of ['pewter','cerulean','vermilion','celadon','saffron','cinnabar','goldenrod','fuchsia','indigo','blackthorn','mahogany']) save.access.unlockLocation(id);
    for (const id of ['brock','misty','surge','erika','koga','sabrina','blaine','giovanni']) save.player.earnBadge(id);
    for (const league of LeagueDB.getInstance().getAll().filter((entry) => entry.region === 'kanto')) save.player.earnBadge(league.badge);
    for (const [id,amount] of [['questPoint',100000],['diamond',10000],['money',1000000]]) save.currencies.add(id, amount);
    save.inventory.add('helix_fossil', 3, { deferSave: true });
    const owned = {};
    for (const [id,level] of [['pidgey',10],['eevee',35],['pikachu',100],['magikarp',60],['clefairy',100]]) {
      const pokemon = PokemonFactory.create(id,level);
      BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }); owned[id] = pokemon.uid;
    }
    save.player.location = 'route1'; save.quests.active = {}; save.quests.setMainStep('kanto',25);
    QuestSystem.getInstance().syncMainQuest();
    FeatureAccessSystem.getInstance().refresh('browser-fixture', { persist: false });
    saves.saveCurrent(); TrainingSystem.getInstance().setEnabled(false);
    Engine.getInstance().getPageManager().openPage('game');
    return { id: save.id, backupId: backup.id, owned };
  });
  await check('desktop: all three remote facilities are visible and stay inside their columns', async () => {
    await page.waitForFunction(() => document.querySelectorAll('#win-mine .mine-tile--d1, #win-mine .mine-tile--d2').length > 0);
    const sizes = await page.evaluate(() => ['hatchery','training','mine'].map((id) => {
      const panel = document.querySelector(`#win-${id}`), body = panel.querySelector('.win-body');
      return { id, visible: !panel.classList.contains('pw-progression-hidden'), width: body.clientWidth, content: body.scrollWidth };
    }));
    for (const size of sizes) { assert.ok(size.visible); assert.ok(size.content <= size.width + 1, JSON.stringify(size)); }
    await page.screenshot({ path: path.join(output, 'desktop-dashboard.png'), fullPage: true });
    return sizes;
  });
  await check('Location: shared full tile opens the accepted Pokédex at the requested species', async () => {
    const tile = page.locator('#win-tabs').getByRole('button', { name: 'Roucool', exact: true });
    assert.equal(await tile.count(), 1);
    assert.equal(await tile.locator('.pw-poke-circle-wrap').count(), 1);
    await tile.click();
    assert.match(await page.locator('#fs-pokedex .pw-pokedex-detail-title').innerText(), /Roucool/);
    await page.locator('#fs-pokedex .modal-close').click();
  });
  await check('Hatchery: real PC selection, withdrawal and canonical ownership', async () => {
    const card = page.locator('#win-hatchery [data-slot-index="0"]');
    await card.getByRole('button', { name: 'Ajouter un Pokémon', exact: true }).click();
    await chooseSpecies('pidgey');
    let state = await domState();
    assert.equal(state.hatchery.slots[0].pokemonUid, fixture.owned.pidgey);
    assert.equal(state.collection.filter((p) => p.uid === fixture.owned.pidgey).length, 1);
    await card.getByRole('button', { name: 'Retirer le Pokémon', exact: true }).click();
    state = await domState(); assert.equal(state.hatchery.slots[0], null);
    assert.equal(state.collection.filter((p) => p.uid === fixture.owned.pidgey).length, 1);
  });
  await check('Hatchery management: purchases, three real tabs and staff recruitment in quest points', async () => {
    const modal = await openManagement('hatchery');
    for (const id of ['slots','queue','auto-hatch','auto-fill']) await modal.locator(`[data-upgrade-id="${id}"] button`).click();
    let state = await domState(); assert.equal(state.hatchery.maxSlots, 2); assert.equal(state.hatchery.queueLevel, 1);
    assert.ok(state.hatchery.autoHatchPurchased && state.hatchery.autoFillPurchased);
    await tab(modal, 1); assert.equal(await modal.locator('.pw-facility-queue-card:visible').count(), 2);
    await tab(modal, 2);
    const pc = modal.locator('[data-staff-id="manager_cinnabar"]');
    assert.match(await pc.innerText(), /points|quête|100/i);
    const before = (await domState()).currencies.questPoint;
    await pc.getByRole('button', { name: 'Recruter', exact: true }).click();
    state = await domState(); assert.equal(state.currencies.questPoint, before - 100);
    await pc.getByRole('button', { name: 'Activer', exact: true }).click();
    assert.equal((await domState()).staff.active.hatchery, 'manager_cinnabar');
    assert.ok(await pc.locator('.pw-facility-legacy-note').isVisible());
    await page.screenshot({ path: path.join(output, 'desktop-hatchery-staff.png') });
    await closeManagement('hatchery');
  });
  await check('Training management: two slots, real FIFO selector above its parent and clean cancellation', async () => {
    const modal = await openManagement('training');
    for (const id of ['slots','queue','auto-0']) await modal.locator(`[data-upgrade-id="${id}"] button`).click();
    await tab(modal, 1);
    const card = modal.locator('.pw-facility-queue-card').first();
    await card.getByRole('button', { name: 'Ajouter un Pokémon', exact: true }).click();
    const clickExposed = await page.locator('#fs-box .pw-pokemon-grid-entry[data-species-id="eevee"]').evaluate((el) => {
      const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)?.closest('#fs-box') !== null;
    });
    assert.equal(clickExposed, true); await chooseSpecies('eevee');
    assert.equal((await domState()).training.slots[0].queue[0], fixture.owned.eevee);
    assert.ok(await modal.isVisible());
    await card.getByRole('button', { name: 'Ajouter un Pokémon', exact: true }).click();
    await page.locator('#fs-box .modal-close').click();
    assert.equal((await domState()).training.slots[0].queue.length, 1);
    await closeManagement('training');
    await page.locator('#win-shortcuts').getByRole('button', { name: 'Boîte PC', exact: true }).click();
    assert.equal(await page.locator('#fs-box').evaluate((el) => el.classList.contains('pw-box-selector-mode')), false);
    assert.equal(await page.locator('#fs-box .pw-pokemon-grid-entry').count(), 6);
    await page.locator('#fs-box .modal-close').click();
  });
  await check('Training management: switches retain native focus and identity during repeated battle events', async () => {
    const modal = await openManagement('training'); await tab(modal, 1);
    await modal.locator('[data-filter-field=mode] select').first().selectOption('configured');
    const focus = modal.getByRole('switch', { name: 'Discipline Capacités', exact: true }).first();
    await focus.focus();
    const mutations = await focus.evaluate(async (element) => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { TrainingBattleChangedEvent } = await import('/src/core/events/TrainingBattleChangedEvent.js');
      const records = []; const observer = new MutationObserver((entries) => records.push(...entries));
      observer.observe(element, { attributes: true, childList: true, subtree: true });
      for (let i=0;i<50;i++) EventBus.getInstance().dispatch(new TrainingBattleChangedEvent(null));
      await Promise.resolve(); observer.disconnect();
      return { focused: document.activeElement === element, connected: element.isConnected, mutations: records.length };
    });
    assert.deepEqual(mutations, { focused: true, connected: true, mutations: 0 });
    await page.screenshot({ path: path.join(output, 'desktop-training-automation.png') });
    await closeManagement('training'); return mutations;
  });
  await check('Native dropdown: unchanged option updates retain the actual browser option nodes and keyboard focus', async () => {
    const result = await page.evaluate(async () => {
      const { UIDropdown } = await import('/src/ui/UIDropdown.js');
      const { AppShell } = await import('/src/ui/AppShell.js');
      const options = [{ value:'first',label:'First option' },{ value:'second',label:'Second option' }];
      const widget = new UIDropdown({ options, value:'second' });
      AppShell.mountOverlay(widget);
      const element = widget.getDomElement(); const native = element.tagName==='SELECT' ? element : element.querySelector('select');
      try {
        native.focus(); const option = native.options[1]; const records = [];
        const observer = new MutationObserver((entries) => records.push(...entries));
        observer.observe(native, { attributes:true, childList:true, subtree:true });
        for (let i=0;i<50;i++) widget.setOptions(options.map((option)=>({...option})));
        await Promise.resolve(); observer.disconnect();
        return { focused: document.activeElement===native, sameOption: option===native.options[1], value:native.value, mutations:records.length };
      } finally { widget.destroy(); }
    });
    assert.deepEqual(result, { focused:true, sameOption:true, value:'second', mutations:0 });
    return result;
  });
  await check('Mine management: upgrades, five tools, actual dig and unique energy charge', async () => {
    const modal = await openManagement('mine');
    for (const id of ['energy','auto','tool-pickaxe','tool-drill','tool-dynamite']) await modal.locator(`[data-upgrade-id="${id}"] button`).click();
    await tab(modal, 1); assert.equal(await modal.getByRole('switch').count(), 1);
    await tab(modal, 2); assert.equal(await modal.locator('[data-staff-id]').count(), 5);
    await closeManagement('mine');
    await page.locator('#win-mine').getByRole('button', { name: 'Pioche renforcée', exact: true }).click();
    const before = await domState();
    await page.locator('#win-mine [data-mine-x="4"][data-mine-y="4"]').click();
    const after = await domState();
    assert.ok(after.mine.energy < before.mine.energy);
    assert.equal(after.mine.tool, 'pickaxe'); assert.equal(after.mine.unlockedTools.length, 5);
    assert.ok(after.mine.grid.flat().some((depth, index) => depth < before.mine.grid.flat()[index]));
    await page.locator('#win-mine [data-mine-x="5"][data-mine-y="5"]').hover();
    assert.equal(await page.locator('#win-mine .is-aim').count(), 5);
  });
  await check('Live training: real assignment/start hides only outdoor idle/footer and exposes the genuine battle', async () => {
    const card = page.locator('#win-training [data-slot-index="0"]');
    await card.getByRole('button', { name: 'Ajouter un Pokémon', exact: true }).click(); await chooseSpecies('magikarp');
    await card.getByRole('button', { name: 'Stage Niveau', exact: true }).click();
    assert.ok(await page.locator('#win-battle .pw-training-live').isVisible());
    assert.equal(await page.locator('#win-battle .pw-battle-idle').isVisible(), false);
    const state = await domState(); assert.equal(state.training.slots[0].pokemonUid, fixture.owned.magikarp);
    assert.ok(state.training.slots[0].battle); assert.equal(state.training.slots[0].queue[0], fixture.owned.eevee);
    await page.evaluate(async () => {
      const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
      const system = TrainingSystem.getInstance();
      for (let i=0;i<17;i++) system.update(0.1);
      const session = system._sessions.get(0); session.field.weather = 'rain'; session.field.weatherTurns = Infinity;
      session.active.statMods.atk = 1.5; session.active.status = 'burn'; session.active.statusTurns = 2;
      system._captureSessions();
    });
    await page.screenshot({ path: path.join(output, 'desktop-live-training.png'), fullPage: true });
  });
  let expected;
  await check('Browser reload: lifecycle checkpoint restores exact same opponent, HP, RNG, field and cooldown DTO', async () => {
    expected = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      return structuredClone(SaveSystem.getInstance().getCurrentSave().training.serialize());
    });
    // No explicit save: beforeunload/pagehide must flush this state.
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(`[id="save-card-${fixture.id}"]`).click();
    const result = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave(), system = TrainingSystem.getInstance();
      return { stored: save.training.serialize(), runtime: system._sessions.get(0)?.captureState(),
        canonical: system._sessions.get(0)?.active.pokemon === save.collection.get(save.training.slots[0].pokemonUid) };
    });
    assert.equal(result.canonical, true); assert.deepEqual(result.stored, expected);
    const { locationId: ignored, ...expectedBattle } = expected.slots[0].battle;
    assert.deepEqual(result.runtime, expectedBattle);
  });
  await check('Browser save switch: second save cannot inherit a battle; first save resumes its reserved UID', async () => {
    const navigate = async () => page.evaluate(async () => {
      const { Engine } = await import('/src/core/Engine.js'); Engine.getInstance().getPageManager().openPage('saveMenu');
    });
    await navigate(); await page.locator(`[id="save-card-${fixture.backupId}"]`).click();
    let state = await domState(); assert.equal(state.training.slots[0].pokemonUid, ''); assert.equal(state.training.slots[0].battle, null);
    await navigate(); await page.locator(`[id="save-card-${fixture.id}"]`).click();
    state = await domState(); assert.deepEqual(state.training, expected);
    await page.locator('#win-training [data-slot-index="0"]').getByRole('button', { name: 'Abandonner', exact: true }).click();
    state = await domState(); assert.equal(state.training.slots[0].pokemonUid, fixture.owned.magikarp); assert.equal(state.training.slots[0].battle, null);
  });
  await check('Johto 111: activation unlocks incubation; only a collected genuine egg completes and claims the quest', async () => {
    const gate = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { QuestSystem } = await import('/src/systems/QuestSystem.js');
      const { QuestDB } = await import('/src/data/quests/QuestDB.js');
      const { FeatureAccessSystem } = await import('/src/systems/FeatureAccessSystem.js');
      const { HatcherySystem } = await import('/src/systems/HatcherySystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      const chain = QuestDB.getInstance().getMainChain('johto'); const index = chain.findIndex((q)=>q.key==='main.111');
      save.player.region='johto'; save.player.location='jroute34'; save.access.unlockRegionStarter('johto');
      save.quests.setMainStep('johto', index-1); save.quests.active={}; QuestSystem.getInstance().syncMainQuest();
      const before = HatcherySystem.getInstance().isPokemonIncubationUnlocked();
      save.quests.setMainStep('johto',index); save.quests.active={}; QuestSystem.getInstance().syncMainQuest();
      FeatureAccessSystem.getInstance().refresh('browser-johto-111', {persist:false});
      Engine.getInstance().getPageManager().openPage('game');
      return { before, reached: HatcherySystem.getInstance().isPokemonIncubationUnlocked(), index };
    });
    assert.deepEqual([gate.before,gate.reached], [false,true]);
    const card = page.locator('#win-hatchery [data-slot-index="0"]');
    await card.getByRole('button', { name: 'Changer de mode', exact: true }).click();
    await card.getByRole('button', { name: 'Ajouter un Pokémon', exact: true }).click(); await chooseSpecies('pikachu');
    const progress = () => page.evaluate(async () => {
      const { QuestSystem }=await import('/src/systems/QuestSystem.js'); return QuestSystem.getInstance().getStatus('main.111').complete;
    });
    assert.equal(await progress(), false);
    const incubation = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const { SeededRandom } = await import('/src/core/SeededRandom.js');
      const { NotificationSystem } = await import('/src/systems/NotificationSystem.js');
      const notifications=NotificationSystem.getInstance(), previous=notifications.isChannelEnabled('BATTLE');
      notifications.setChannelEnabled('BATTLE', false);
      try {
      const save = SaveSystem.getInstance().getCurrentSave(), battle = BattleSystem.getInstance();
      // Seeded combat-ready party, then genuine battle actions/KO events; never a fabricated hatch event.
      save.team.at(0).setLevel(100); save.team.at(0).healFull();
      save.ballFilters.getAll().forEach((filter) => { filter.enabled = false; });
      const slot = save.hatchery.slots[0]; const required = slot.required;
      const before = save.statistics.wildWinsInGroup('jroute34');
      battle.setRandom(new SeededRandom(884422));
      if (!battle.startBattle('jroute34')) throw new Error('The genuine wild battle failed to start');
      let ticks = 0;
      for (; !slot.ready && ticks < 200000; ticks++) battle.update(0.1);
      if (!slot.ready) throw new Error('The real battle did not advance incubation');
      battle.endBattle(false);
      return { required, ticks, wildWins: save.statistics.wildWinsInGroup('jroute34') - before };
      } finally { notifications.setChannelEnabled('BATTLE', previous); }
    });
    assert.ok(incubation.wildWins >= incubation.required);
    if (await page.locator('#battle-summary-inner').isVisible()) await page.locator('#battle-summary-inner > .pw-win-hdr .pw-modal-close-btn').click();
    assert.equal(await progress(), false);
    await card.getByRole('button', { name: 'Faire éclore', exact: true }).click();
    assert.equal(await progress(), true);
    const state = await domState(), parent = state.collection.find(p=>p.uid===fixture.owned.pikachu);
    assert.equal(parent.level, 1); assert.equal(parent.exp, 0);
    assert.equal(state.collection.filter(p=>p.uid===fixture.owned.pikachu).length, 1);
    assert.ok(state.collection.some(p=>p.species==='pichu' && p.level===5));
    const claim = await page.evaluate(async()=>{const {QuestSystem}=await import('/src/systems/QuestSystem.js');return QuestSystem.getInstance().claim('main.111');});
    assert.equal(claim, true);
    assert.equal((await domState()).quests.mainStep.johto, gate.index+1);
    return { gate, incubation };
  });
  await check('Fossil subwindow: queue reserves inventory without consuming it; manual incubation consumes once', async () => {
    const modal = await openManagement('hatchery'); await tab(modal,1);
    const card = modal.locator('.pw-facility-queue-card').first();
    const before = await domState();
    await card.getByRole('button', {name:'Choisir un fossile à incuber',exact:true}).click();
    await page.locator('#pw-hatchery-fossils').getByRole('button', {name:'Choisir',exact:true}).first().click();
    let state = await domState();
    assert.equal(state.hatchery.queues[0][0].kind,'fossil');
    assert.equal(state.inventory.helix_fossil,before.inventory.helix_fossil);
    assert.ok(await modal.isVisible());
    await closeManagement('hatchery');
    await page.locator('#win-hatchery [data-slot-index="0"]').getByRole('button', {name:'Choisir un fossile à incuber',exact:true}).click();
    await page.locator('#pw-hatchery-fossils').getByRole('button', {name:'Choisir',exact:true}).first().click();
    state = await domState();
    assert.equal(state.hatchery.slots[0].kind,'fossil');
    assert.equal(state.inventory.helix_fossil,before.inventory.helix_fossil-1);
    assert.equal(state.hatchery.queues[0][0].kind,'fossil');
  });
  for (const width of [1024, 768, 375]) {
    await check(`responsive ${width}px: all three management screens and all nine tabs fit and scroll`, async () => {
      await page.setViewportSize({ width, height:900 });
      if (width<=850) await page.locator('.mobile-nav-bar').getByRole('button', {name:'Gestion',exact:true}).click();
      const geometries=[];
      for (const [feature,label] of [['hatchery','Pension'],['training','Entraînement'],['mine','Grand Souterrain']]) {
        if (width<=850) await page.locator('.mobile-subnav-bar').getByRole('button', {name:label,exact:true}).click();
        const modal=await openManagement(feature);
        for (let index=0;index<3;index++) {
          await tab(modal,index);
          const geometry=await modal.evaluate((element) => {
            const content=element.querySelector('.management-content'), r=element.getBoundingClientRect();
            const canScroll=content.scrollHeight<=content.clientHeight || (()=>{content.scrollTop=content.scrollHeight;return content.scrollTop>0;})();
            return { width:r.width, left:r.left, right:r.right, top:r.top, bottom:r.bottom, contentWidth:content.clientWidth, scrollWidth:content.scrollWidth, canScroll };
          });
          assert.ok(geometry.left>=-1 && geometry.right<=width+1, JSON.stringify({feature,index,...geometry}));
          assert.ok(geometry.top>=-1 && geometry.bottom<=901, JSON.stringify({feature,index,...geometry}));
          assert.ok(geometry.scrollWidth<=geometry.contentWidth+1, JSON.stringify({feature,index,...geometry}));
          assert.ok(geometry.canScroll);
          geometries.push({feature,tab:index,...geometry});
        }
        await page.waitForTimeout(200); // Let existing button color transitions settle before visual evidence.
        await page.screenshot({path:path.join(output,`${feature}-management-${width}.png`)});
        await closeManagement(feature);
      }
      return geometries;
    });
  }
  await check('English reconstruction: all three real management windows and their localized controls load', async () => {
    await page.setViewportSize({width:1560,height:1120});
    const language=async(lang)=>page.evaluate(async(lang)=>{
      const {LocalizationManager}=await import('/src/localization/LocalizationManager.js');
      const {Engine}=await import('/src/core/Engine.js');
      LocalizationManager.getInstance().setLanguage(lang);
      Engine.getInstance().getPageManager().openPage('game');
    },lang);
    await language('en');
    try {
      for (const [feature,staff] of [['hatchery','Managers'],['training','Trainers'],['mine','Miners']]) {
        const modal=await openManagement(feature);
        assert.deepEqual((await modal.locator('.management-tabs button').allTextContents()).map((text)=>text.trim()),['Upgrades','Automation',staff]);
        for(let index=0;index<3;index++) {
          await tab(modal,index);
          assert.ok((await modal.locator('.management-content').innerText()).trim().length>0);
        }
        await closeManagement(feature);
      }
    } finally { await language('fr'); }
  });
  assert.deepEqual(issues, [], 'Browser diagnostics and failed requests');
} catch (error) {
  console.error(error.stack); process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output,'results.json'), JSON.stringify({ environment:{node:process.version,chromium:browser.version()}, fixture, seededProgression:true, trainingTicksPausedForExactComparison:true, results, issues },null,2));
  await browser.close();
}
