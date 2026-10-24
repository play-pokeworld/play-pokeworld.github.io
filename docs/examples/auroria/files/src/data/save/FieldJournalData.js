/** @file FieldJournalData.js @brief Stores only surveyed site IDs; counts are derived. */
import { BaseModel } from "../core/BaseModel.js";
export class FieldJournalData extends BaseModel {
  constructor(data = {}) {
    super("FieldJournalData", "Data");
    this.deserialize(data);
  }
  deserialize(data = {}) {
    this.sites = [
      ...new Set(
        (Array.isArray(data?.sites) ? data.sites : []).filter(
          (id) => typeof id === "string" && id.length > 0,
        ),
      ),
    ];
  }
  has(locationId) {
    return this.sites.includes(locationId);
  }
  add(locationId) {
    if (!locationId || this.has(locationId)) return false;
    this.sites.push(locationId);
    return true;
  }
  serialize() {
    return { sites: [...this.sites] };
  }
}
