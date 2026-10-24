/** @file verify.mjs @brief Executed assertions for the installed guide example, not a complete campaign. */
import assert from "node:assert/strict";
import fs from "node:fs";
const { installFakeDom } = await import("../../../tests/FakeDom.js");
installFakeDom();
for (const method of ["log", "info", "warn", "error", "debug"])
  console[method] = () => {};
const imports = await Promise.all(
  [
    ["../../../src/data/core/DataValidator.js", "DataValidator"],
    ["../../../src/systems/SaveSystem.js", "SaveSystem"],
    ["../../../src/data/save/SaveData.js", "SaveData"],
    ["../../../src/systems/LocationSystem.js", "LocationSystem"],
    ["../../../src/systems/FeatureAccessSystem.js", "FeatureAccessSystem"],
    ["../../../src/systems/RegionalStarterSystem.js", "RegionalStarterSystem"],
    ["../../../src/systems/QuestSystem.js", "QuestSystem"],
    ["../../../src/data/pokemon/PokemonDB.js", "PokemonDB"],
    ["../../../src/data/battle/MoveDB.js", "MoveDB"],
    ["../../../src/data/shops/ShopDB.js", "ShopDB"],
    ["../../../src/systems/TrainerSystem.js", "TrainerSystem"],
    ["../../../src/systems/BattleSystem.js", "BattleSystem"],
    ["../../../src/systems/TeamSystem.js", "TeamSystem"],
    ["../../../src/data/pokemon/PokemonFactory.js", "PokemonFactory"],
    ["../../../src/systems/FieldJournalSystem.js", "FieldJournalSystem"],
    [
      "../../../src/data/save/migrations/MigrationV20ToV21.js",
      "MigrationV20ToV21",
    ],
    ["../../../src/panels/FieldJournalPanel.js", "FieldJournalPanel"],
    ["../../../src/localization/LocalizationManager.js", "LocalizationManager"],
    ["../../../src/config/DashboardLayout.js", "DashboardColumns"],
    ["../../../src/systems/ShopSystem.js", "ShopSystem"],
    ["../../../src/core/SeededRandom.js", "SeededRandom"],
    ["../../../src/data/quests/QuestDB.js", "QuestDB"],
  ].map(async ([file, name]) => [name, (await import(file))[name]]),
);
const m = Object.fromEntries(imports),
  saves = m.SaveSystem.getInstance(),
  quests = m.QuestSystem.getInstance(),
  locations = m.LocationSystem.getInstance(),
  access = m.FeatureAccessSystem.getInstance(),
  battle = m.BattleSystem.getInstance(),
  journal = m.FieldJournalSystem.getInstance();
const results = [];
function check(name, run) {
  run();
  results.push({ name, passed: true });
  process.stdout.write("PASS " + name + "\n");
}
function writes(run) {
  const old = saves.saveCurrent;
  let n = 0;
  saves.saveCurrent = function (...args) {
    n++;
    return old.apply(this, args);
  };
  try {
    run();
  } finally {
    saves.saveCurrent = old;
  }
  return n;
}
function finishBattle() {
  for (let i = 0; i < 40000 && battle.isActive(); i++) battle.update(0.1);
  assert.equal(battle.isActive(), false);
  assert.equal(battle.getBattleSummary().victory, true);
}
quests.init();
access.init();
m.RegionalStarterSystem.getInstance().init();
let save, partner, panel;
check(
  "all example cross-references, translations and placeholder assets validate",
  () => {
    assert.deepEqual(m.DataValidator.validateAll(), []);
    assert.deepEqual(m.LocalizationManager.getInstance().getCollisions(), []);
    for (const language of ["fr", "en"]) {
      m.LocalizationManager.getInstance().setLanguage(language);
      assert.ok(m.LocalizationManager.getInstance().has("pokemon.mossling"));
      assert.ok(
        m.LocalizationManager.getInstance().has(
          "quests.main.auroria_rival.title",
        ),
      );
    }
    assert.ok(
      fs.existsSync(
        new URL("../../../assets/images/pokemon/mossling.png", import.meta.url),
      ),
    );
    assert.ok(
      fs.existsSync(
        new URL("../../../assets/images/maps/auroria.png", import.meta.url),
      ),
    );
    assert.ok(m.MoveDB.getInstance().has("chloroshot"));
  },
);
check(
  "region entry is actually locked before the preceding League and Pokédex facts",
  () => {
    save = saves.createNewSave("Guide smoke", "charmander");
    save.tutorial.enabled = false;
    assert.equal(access.getRegionAccessStatus("auroria").unlocked, false);
    assert.equal(locations.travelToRegion("auroria"), false);
  },
);
check(
  "explicit previous-region fixture permits the real travel and exactly one real regional starter choice",
  () => {
    save.statistics.recordLeague("hoenn");
    for (const p of m.PokemonDB.getInstance().getByRegion("hoenn"))
      save.pokedex.markCaught(p.id, false, { deferSave: true });
    assert.ok(locations.travelToRegion("auroria"));
    assert.equal(save.player.location, "auroria_start");
    const choice = m.RegionalStarterSystem.getInstance().chooseStarter(
      "auroria",
      "mossling",
    );
    assert.ok(choice.success);
    partner = choice.pokemon;
    assert.equal(
      m.RegionalStarterSystem.getInstance().chooseStarter("auroria", "mossling")
        .success,
      false,
    );
    assert.equal(
      save.collection.getAll().filter((p) => p.species === "mossling").length,
      1,
    );
  },
);
check(
  "actual localized NPC conversation advances the first auto-claimed story step",
  () => {
    assert.equal(quests.getMainQuest().quest.key, "main.auroria_welcome");
    assert.ok(locations.talkToNpc("auroria_guide"));
    assert.equal(quests.getMainQuest().quest.key, "main.auroria_road");
    assert.equal(access.isLocationUnlocked("auroria_city"), false);
  },
);
check(
  "the new route, encounter engine and kill objective produce three genuine wins before the pass claim",
  () => {
    const strong = m.PokemonFactory.create("mewtwo", 100);
    m.TeamSystem.getInstance().addPokemon(strong);
    m.TeamSystem.getInstance().setLead(
      save.team.findIndex((p) => p.uid === strong.uid),
    );
    assert.ok(locations.travelTo("auroria_path"));
    battle.setRandom(new m.SeededRandom(1234));
    assert.ok(battle.startBattle("auroria_path"));
    for (
      let i = 0;
      i < 40000 && (save.statistics.wildWins.auroria_path || 0) < 3;
      i++
    )
      battle.update(0.1);
    assert.ok((save.statistics.wildWins.auroria_path || 0) >= 3);
    battle.endBattle(false);
    assert.ok(quests.getStatus("main.auroria_road").complete);
    assert.equal(access.isLocationUnlocked("auroria_city"), false);
    assert.ok(quests.claim("main.auroria_road"));
    assert.equal(save.inventory.count("auroria_pass"), 1);
    assert.equal(access.isLocationUnlocked("auroria_city"), true);
  },
);
check(
  "field-journal UI is stable, reward is one-write, and a repeated survey never pays or saves again",
  () => {
    panel = new m.FieldJournalPanel(m.DashboardColumns.RIGHT);
    const node = panel._survey.getDomElement(),
      before = save.currencies.get("money");
    assert.equal(
      writes(() => assert.ok(journal.survey())),
      1,
    );
    assert.equal(save.currencies.get("money"), before + 250);
    assert.equal(
      writes(() => assert.equal(journal.survey(), false)),
      0,
    );
    assert.equal(panel._survey.getDomElement(), node);
    assert.deepEqual(save.fieldJournal.sites, ["auroria_path"]);
    assert.equal(journal.getSnapshot().total, 1);
  },
);
check(
  "new shop sells priced data items plus the shared non-inventory automation offers",
  () => {
    assert.ok(locations.travelTo("auroria_city"));
    const offers = m.ShopSystem.getInstance().getOffers();
    for (const key of [
      "auroria_tm_chloroshot",
      "autoRelaunch",
      "autoDungeonRelaunch",
    ])
      assert.ok(offers.some((o) => o.key === key));
    assert.equal(
      m.ShopDB.getInstance()
        .getById("auroria_store")
        .items.includes("rarecandy"),
      true,
    );
  },
);
check(
  "real Gym battle grants its trainer-ID badge, not its display badge slug",
  () => {
    assert.ok(m.TrainerSystem.getInstance().challenge("auroria_ivy"));
    finishBattle();
    assert.equal(save.player.hasBadge("auroria_ivy"), true);
    assert.equal(save.player.hasBadge("auroria_leaf"), false);
    assert.ok(quests.getStatus("main.auroria_gym").complete);
    assert.ok(quests.claim("main.auroria_gym"));
    assert.equal(access.isLocationUnlocked("auroria_forest"), false);
  },
);
check(
  "a separate real rival battle and claimed quest open the combat-gated dungeon",
  () => {
    assert.ok(
      m.TrainerSystem.getInstance().challenge("auroria_rival", {
        questKey: "main.auroria_rival",
      }),
    );
    finishBattle();
    assert.ok(quests.getStatus("main.auroria_rival").complete);
    assert.equal(access.isLocationUnlocked("auroria_forest"), false);
    assert.ok(quests.claim("main.auroria_rival"));
    assert.equal(access.isLocationUnlocked("auroria_forest"), true);
    assert.equal(m.QuestDB.getInstance().getMainChain("auroria").length, 4);
  },
);
check(
  "the example League uses the genuine chained trainer engine and stores its regional title in statistics",
  () => {
    assert.ok(locations.travelTo("auroria_summit"));
    assert.ok(m.TrainerSystem.getInstance().challenge("auroria_league"));
    finishBattle();
    assert.equal(save.statistics.hasWonLeague("auroria"), true);
    assert.equal(save.player.hasBadge("auroria_league"), false);
  },
);
check(
  "JSON round trip preserves survey facts; current and old-save migration do not duplicate other state",
  () => {
    const raw = save.serialize(),
      loaded = m.SaveData.fromJson(JSON.parse(JSON.stringify(raw)));
    assert.deepEqual(loaded.fieldJournal.serialize(), {
      sites: ["auroria_path"],
    });
    const old = JSON.parse(JSON.stringify(raw));
    old.version = 20;
    delete old.fieldJournal;
    const before = JSON.stringify(old),
      migrated = m.MigrationV20ToV21.migrate(old);
    assert.equal(JSON.stringify(old), before);
    for (const key of Object.keys(old).filter((k) => k !== "version"))
      assert.deepEqual(migrated[key], old[key], key);
    assert.equal(migrated.version, 21);
    assert.deepEqual(migrated.fieldJournal, { sites: [] });
  },
);
check(
  "a different save cannot inherit the field-journal reward, owned UID, or visible panel",
  () => {
    const other = saves.createNewSave("Guide other", "squirtle");
    assert.deepEqual(other.fieldJournal.sites, []);
    assert.equal(other.collection.has(partner.uid), false);
    assert.equal(journal.getSnapshot().visible, false);
    assert.equal(panel.isVisible(), false);
    panel.destroy();
  },
);
process.stdout.write(
  JSON.stringify(
    {
      passed: results.length,
      failed: 0,
      scope:
        "Installed disposable Auroria sample; previous-region progression explicitly seeded, no full campaign claim.",
      results,
    },
    null,
    2,
  ) + "\n",
);
