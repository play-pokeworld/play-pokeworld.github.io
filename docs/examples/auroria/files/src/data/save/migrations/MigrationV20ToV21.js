/** @file MigrationV20ToV21.js @brief Sample-only next schema; existing fields remain unchanged. */
import { FieldJournalData } from "../FieldJournalData.js";
export const MigrationV20ToV21 = Object.freeze({
  from: 20,
  to: 21,
  migrate(raw) {
    return {
      ...raw,
      version: 21,
      fieldJournal: new FieldJournalData(raw.fieldJournal).serialize(),
    };
  },
});
