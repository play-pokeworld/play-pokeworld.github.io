/**
 * @file SaveMigrator.js
 * @brief Brings any raw save JSON up to the current schema (C++: class SaveMigrator, static).
 *
 * Version detection:
 *   0 — export of the original game (state wrapped in `.G`);
 *   1 — rework v1.0-v1.2 (no `version` field);
 *   n — `version` field.
 * The ordered migrations are applied one by one BEFORE deserialization, so every model only
 * reads the current shape. Each migration is a pure function with its own test fixture.
 * Adding a schema: write MigrationVnToVn+1.js, append it to MIGRATIONS, bump SaveSchema.VERSION.
 */
import { SaveSchema } from '../../../config/SaveSchema.js';
import { MigrationOriginalToV1 } from './MigrationOriginalToV1.js';
import { MigrationV1ToV2 } from './MigrationV1ToV2.js';
import { MigrationV2ToV3 } from './MigrationV2ToV3.js';
import { MigrationV3ToV4 } from './MigrationV3ToV4.js';
import { MigrationV4ToV5 } from './MigrationV4ToV5.js';
import { MigrationV5ToV6 } from './MigrationV5ToV6.js';
import { MigrationV6ToV7 } from './MigrationV6ToV7.js';
import { MigrationV7ToV8 } from './MigrationV7ToV8.js';
import { MigrationV8ToV9 } from './MigrationV8ToV9.js';
import { MigrationV9ToV10 } from './MigrationV9ToV10.js';
import { MigrationV10ToV11 } from './MigrationV10ToV11.js';
import { MigrationV11ToV12 } from './MigrationV11ToV12.js';

/** Ordered chain: MIGRATIONS[i].from === i. */
const MIGRATIONS = Object.freeze([
  MigrationOriginalToV1, MigrationV1ToV2, MigrationV2ToV3, MigrationV3ToV4,
  MigrationV4ToV5, MigrationV5ToV6, MigrationV6ToV7, MigrationV7ToV8,
  MigrationV8ToV9, MigrationV9ToV10, MigrationV10ToV11, MigrationV11ToV12
]);

export class SaveMigrator {
  /**
   * @param {Object} raw
   * @returns {number} Schema version of a raw save
   */
  static detectVersion(raw) {
    if (raw && raw.G && typeof raw.G === 'object') return 0;
    const version = Number(raw?.version);
    return Number.isInteger(version) && version > 0 ? version : 1;
  }

  /**
   * @param {Object} raw - Raw save JSON of any version (not mutated)
   * @returns {Object} Raw JSON in the SaveSchema.VERSION shape
   */
  static migrate(raw) {
    let data = raw && typeof raw === 'object' ? raw : {};
    for (let version = SaveMigrator.detectVersion(data); version < SaveSchema.VERSION; version++) {
      data = MIGRATIONS[version].migrate(data);
    }
    return data;
  }

  /** @returns {ReadonlyArray<Object>} The migration chain (tests, docs) */
  static getMigrations() {
    return MIGRATIONS;
  }
}
