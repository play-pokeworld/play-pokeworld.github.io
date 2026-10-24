/** @file FieldJournalSystem.js @brief Sample-only gameplay: one paid survey per cleared route. */
import { BaseSystem } from "./BaseSystem.js";
import { SaveSystem } from "./SaveSystem.js";
import { BattleSystem } from "./BattleSystem.js";
import { FeatureAccessSystem } from "./FeatureAccessSystem.js";
import { LocationSystem } from "./LocationSystem.js";
import { LocationDB } from "../data/world/LocationDB.js";
import { FieldJournalRules as Rules } from "../config/FieldJournalRules.js";
import { EventBus } from "../core/EventBus.js";
import { FieldJournalChangedEvent } from "../core/events/FieldJournalChangedEvent.js";
export class FieldJournalSystem extends BaseSystem {
  static _instance = null;
  static getInstance() {
    return this._instance || (this._instance = new FieldJournalSystem());
  }
  constructor() {
    super("FieldJournalSystem", "System");
  }
  getSnapshot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const location = LocationDB.getInstance().getById(
      LocationSystem.getInstance().getCurrentLocationId(),
    );
    const visible = !!save && save.player.region === Rules.REGION;
    const wins =
      save && location ? save.statistics.wildWinsInGroup(location.id) : 0;
    const already = !!location && !!save?.fieldJournal.has(location.id);
    const reason = already
      ? "already"
      : BattleSystem.getInstance().isActive()
        ? "battle"
        : location?.kind !== "route"
          ? "location"
          : wins < Rules.MIN_WINS
            ? "wins"
            : "ready";
    return {
      visible,
      locationId: location?.id || null,
      wins,
      required: Rules.MIN_WINS,
      total: save?.fieldJournal.sites.length || 0,
      reward: Rules.REWARD,
      reason,
      canSurvey:
        visible &&
        reason === "ready" &&
        FeatureAccessSystem.getInstance().isLocationUnlocked(location.id),
    };
  }
  survey() {
    const model = this.getSnapshot(),
      save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !model.canSurvey || !save.fieldJournal.add(model.locationId))
      return false;
    save.currencies.add(Rules.CURRENCY, Rules.REWARD);
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(
      new FieldJournalChangedEvent(model.locationId),
    );
    return true;
  }
}
