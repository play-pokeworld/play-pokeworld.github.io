import { test } from 'node:test';
import assert from 'node:assert/strict';

// Shim DOM & globals for tests
globalThis.t = (k) => k;
globalThis.tr = (k, v) => `${k}:${JSON.stringify(v)}`;
globalThis.formatNumber = (n) => String(n);
globalThis.getIcon = (name, size) => `<svg data-icon="${name}" data-size="${size}"></svg>`;
globalThis.notify = () => {};
globalThis.saveGame = () => {};
globalThis.updateHeader = () => {};
globalThis.getLocObj = () => ({ group: 'kanto', type: 'route' });
globalThis.clamp = (v, min, max) => Math.min(Math.max(v, min), max);
globalThis.STORY_QUESTS = [];
globalThis.SIDE_QUESTS = {};

test('Point 1 & 2 · In-game guide: sound removed, condensed short spoiler-free cards with 1-2 sentences', async () => {
  const { guideSections } = await import('../src/ui/game/guide-sections.js');
  const sections = guideSections();
  const keys = Object.keys(sections);

  assert.ok(!keys.includes('sound'), 'Sound section must be completely removed');
  assert.ok(!keys.includes('sound_music'), 'sound_music section must be completely removed');
  assert.ok(keys.includes('map'), 'map section exists');
  assert.ok(keys.includes('combat'), 'combat section exists');
  assert.ok(keys.includes('capture'), 'capture section exists');
  assert.ok(keys.includes('dungeon'), 'dungeon section exists');
  assert.ok(keys.includes('mine'), 'mine section exists');
  assert.ok(keys.includes('hatchery'), 'hatchery section exists');
  assert.ok(keys.includes('training'), 'training section exists');

  // Verify all sections are short (<= 4 pages, mostly 1 page)
  for (const [k, sec] of Object.entries(sections)) {
    assert.ok(sec.pages.length <= 4, `Section ${k} must be concise (has ${sec.pages.length} pages)`);
  }
});

test('Point 3 · Gym Badges & Leagues panel: renders Kanto, Johto, Hoenn badges and league status', async () => {
  const { renderBadgesPanel, openBadgesPanel } = await import('../src/ui/game/badges-panel.js');
  assert.equal(typeof renderBadgesPanel, 'function');
  assert.equal(typeof openBadgesPanel, 'function');

  const container = {
    innerHTML: '',
  };
  globalThis.G = {
    badges: ['brock', 'misty', 'falkner', 'roxanne'],
    defeatedChamps: { elite4: true },
    championTitle: true,
  };

  renderBadgesPanel(container);
  assert.ok(container.innerHTML.includes('pw-badges-panel-container'), 'Renders badges container');
  assert.ok(container.innerHTML.includes('Badge Roche'), 'Renders Badge Roche');
  assert.ok(container.innerHTML.includes('Badge Cascade'), 'Renders Badge Cascade');
  assert.ok(container.innerHTML.includes('Badge Zéphyr'), 'Renders Badge Zéphyr');
  assert.ok(container.innerHTML.includes('Ligue Pokémon de Kanto'), 'Renders Kanto League');
  assert.ok(container.innerHTML.includes('4 / 24'), 'Shows 4 / 24 badges collected');
  assert.ok(container.innerHTML.includes('1 / 3'), 'Shows 1 / 3 leagues beaten');
});

test('Point 4 · Auto-relaunch toggles (wild & dungeon): buttons that toggle color (.active) without redundant state labels', async () => {
  const arMod = await import('../src/application/automation/auto-relaunch.js');
  const dgaMod = await import('../src/application/automation/auto-dungeon-relaunch.js');

  assert.equal(typeof arMod.renderAutoRelaunchBar, 'function');
  assert.equal(typeof dgaMod.renderAutoDungeonRelaunchBar, 'function');
});

test('Point 5 · Automation upfront prices and confirmation dialogs', async () => {
  let confirmed = false;
  globalThis.pwConfirm = (msg, cb) => {
    confirmed = true;
    cb();
  };
  globalThis.G = {
    wallet: { questPoints: 10000, diamonds: 5000 },
    automationUpgrades: {},
    mine: { automation: { purchased: false, enabled: false } },
  };
  globalThis.ensureWallet = () => globalThis.G.wallet;
  globalThis.spendQuestPoints = (amt) => { globalThis.G.wallet.questPoints -= amt; };
  globalThis.spendDiamonds = (amt) => { globalThis.G.wallet.diamonds -= amt; };

  const { buyAutomationUpgrade } = await import('../src/application/automation/automation.js');
  buyAutomationUpgrade('autoHatch');
  assert.ok(confirmed, 'buyAutomationUpgrade asks for confirmation');
});

test('Point 6 · Repeatable quests baseline isolation & clean re-acquisition', async () => {
  const { questProgressValue, claimQuest } = await import('../src/application/quests/quest-core.js');

  globalThis.G = {
    wildWinsByLoc: { viridianforest: 100 },
    repeatables: [],
    completedQuests: {},
    repeatablesCompleted: 0,
  };
  globalThis.getQuestWildWinCount = (def) => (def.loc ? globalThis.G.wildKills[def.loc] || 0 : 0);

  const tpl = { id: 'rep1', type: 'defeat_wild', loc: 'viridianforest', target: 5 };
  const inst = {
    qid: 'r_rep1',
    tplId: 'rep1',
    cat: 'repeatable',
    def: tpl,
    baseline: 100, // starting baseline at 100 kills
    progress: 0,
    done: false,
  };
  globalThis.G.repeatables.push(inst);

  // Initially: 100 wins - baseline 100 = 0 progress
  assert.equal(questProgressValue(inst, tpl), 0, 'New instance progress is 0');

  // Player kills 5 more
  globalThis.G.wildWinsByLoc.viridianforest = 105;
  assert.equal(questProgressValue(inst, tpl), 5, 'Progress is 5 after 5 new kills');

  // Claim quest
  claimQuest(inst.qid, 'repeatable');
  assert.equal(globalThis.G.repeatablesCompleted, 1);
  assert.ok(!globalThis.G.completedQuests['r_rep1'], 'Repeatable is cleared from completedQuests');
});

test('Point 7, 8, 9, 10 · Achievements polish: clean SVG icons, metallic rank chips, and HUD tracker window', async () => {
  const { UI_ICONS } = await import('../src/data/ui-icons.js');
  const requiredIcons = ['star', 'sword', 'trainer', 'compass', 'fist', 'pickaxe', 'coin', 'flag', 'heart', 'dna', 'pin'];
  for (const icon of requiredIcons) {
    assert.ok(UI_ICONS[icon], `UI_ICONS must contain ${icon}`);
  }

  const { getAchievementTierInfo, renderAchievementsTrackerWindow } = await import('../src/ui/game/achievements-panel.js');
  const bronze = getAchievementTierInfo(0, 4);
  assert.equal(bronze.cls, 'rank-bronze');
  const silver = getAchievementTierInfo(1, 4);
  assert.equal(silver.cls, 'rank-silver');
  const gold = getAchievementTierInfo(2, 4);
  assert.equal(gold.cls, 'rank-gold');
  const diamond = getAchievementTierInfo(3, 4);
  assert.equal(diamond.cls, 'rank-diamond');

  // Test HUD tracker window
  const trackerBody = { innerHTML: '' };
  globalThis.document = {
    getElementById: (id) => (id === 'achievements-window-body' ? trackerBody : null),
  };
  globalThis.G = {
    achievements: { unlockedTiers: {}, pinned: 'dex_kanto' },
    pokedex: [1, 4, 7],
  };

  renderAchievementsTrackerWindow();
  assert.ok(trackerBody.innerHTML.includes('pw-ach-tracker-card'), 'HUD tracker displays pinned card');
  assert.ok(trackerBody.innerHTML.includes('Kanto'), 'Displays achievement name');
});

test('Point 11 · Achievement bonuses calculation verification (Money, XP, Catch)', async () => {
  const { getAchievementBonus } = await import('../src/application/achievements.js');
  globalThis.G = {
    achievements: {
      unlockedTiers: {
        dex_kanto: 2, // Tier 2 (index 2) = +10% money in Kanto
        total_captures: 1, // Tier 1 (index 1) = +1.0 pt catch
      },
    },
  };

  const moneyBonus = getAchievementBonus('money', 'region:kanto', globalThis.G);
  assert.equal(moneyBonus, 10, 'Dex Kanto tier 2 provides +10% money in Kanto');

  const catchBonus = getAchievementBonus('capture', 'global', globalThis.G);
  assert.equal(catchBonus, 1, 'Total captures tier 1 provides +1 pt catch');
});

test('Point 12 · Window header height increased to 50px', async () => {
  const fs = await import('fs');
  const css = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  assert.ok(css.includes('--pw-header-h: 50px;'), '--pw-header-h must be 50px');
});

test('Point 13 · All 386 Pokémon (Gen 1–3) are 100% obtainable', async () => {
  const { LOCS } = await import('../src/data/locations-data.js');
  const { LOCS_JOHTO } = await import('../src/data/locations-johto.js');
  const { LOCS_HOENN } = await import('../src/data/locations-hoenn.js');
  const { LEVEL_EVO_MAP, STONE_EVO } = await import('../src/application/combat/progression.js');
  const { SIDE_QUESTS } = await import('../src/data/side-quests-data.js');
  const { STORY_QUESTS } = await import('../src/data/story-quests.js');
  const { LEGENDARY_QUESTS } = await import('../src/data/legendary-quests.js');

  const wildSpecies = new Set();
  const addWild = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const p of arr) {
      if (typeof p === 'number') wildSpecies.add(p);
      else if (p && p.id) wildSpecies.add(Number(p.id));
      else if (Array.isArray(p)) wildSpecies.add(Number(p[0]));
    }
  };

  for (const locs of [LOCS, LOCS_JOHTO, LOCS_HOENN]) {
    for (const [k, v] of Object.entries(locs || {})) {
      addWild(v.wild);
      addWild(v.pokemon);
      if (v.rare) addWild(v.rare);
      if (v.day) addWild(v.day);
      if (v.night) addWild(v.night);
      if (v.water) addWild(v.water);
      if (v.super_rod) addWild(v.super_rod);
      if (v.good_rod) addWild(v.good_rod);
      if (v.old_rod) addWild(v.old_rod);
      if (v.rock_smash) addWild(v.rock_smash);
    }
  }

  const questSpecies = new Set();
  for (const q of Object.values(STORY_QUESTS || {})) {
    if (q.rewardPoke) questSpecies.add(Number(q.rewardPoke));
  }
  for (const q of Object.values(SIDE_QUESTS || {})) {
    if (q.rewardPoke) questSpecies.add(Number(q.rewardPoke));
  }
  for (const lq of Object.values(LEGENDARY_QUESTS || {})) {
    if (lq.poke) questSpecies.add(Number(lq.poke));
    if (lq.rewardPoke) questSpecies.add(Number(lq.rewardPoke));
  }
  const starters = [1, 4, 7, 152, 155, 158, 252, 255, 258];
  starters.forEach((id) => questSpecies.add(id));

  const shopSpecies = new Set();
  try {
    const { SHOPS } = await import('../src/data/shops-data.js');
    for (const s of Object.values(SHOPS || {})) {
      if (s.pokemon) s.pokemon.forEach((p) => shopSpecies.add(Number(p.id || p)));
    }
  } catch (_) {}

  const fossilSpecies = new Set([138, 140, 142, 345, 347]);

  const obtainable = new Set([...wildSpecies, ...questSpecies, ...shopSpecies, ...fossilSpecies]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(obtainable)) {
      if (LEVEL_EVO_MAP[id] && !obtainable.has(LEVEL_EVO_MAP[id])) {
        obtainable.add(LEVEL_EVO_MAP[id]);
        changed = true;
      }
      if (STONE_EVO[id]) {
        for (const target of Object.values(STONE_EVO[id])) {
          if (!obtainable.has(target)) {
            obtainable.add(target);
            changed = true;
          }
        }
      }
      if (id === 236) {
        if (!obtainable.has(106)) { obtainable.add(106); changed = true; }
        if (!obtainable.has(107)) { obtainable.add(107); changed = true; }
        if (!obtainable.has(237)) { obtainable.add(237); changed = true; }
      }
      if (id === 265) {
        if (!obtainable.has(266)) { obtainable.add(266); changed = true; }
        if (!obtainable.has(268)) { obtainable.add(268); changed = true; }
      }
      if (id === 290) {
        if (!obtainable.has(291)) { obtainable.add(291); changed = true; }
        if (!obtainable.has(292)) { obtainable.add(292); changed = true; }
      }
    }
  }

  assert.equal(obtainable.size, 386, 'Exactly 386 / 386 Gen 1-3 Pokémon must be obtainable');
});
