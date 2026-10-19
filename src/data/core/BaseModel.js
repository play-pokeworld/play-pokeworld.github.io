/**
 * @file BaseModel.js
 * @brief Base class for domain data models (C++ equivalent: class BaseModel : public BaseObject).
 * Provides standardized JSON serialization and deserialization methods.
 */

import { BaseObject } from '../../core/BaseObject.js';

export class BaseModel extends BaseObject {
  /**
   * @param {string} [name='']
   * @param {string} [tag='Model']
   */
  constructor(name = '', tag = 'Model') {
    super(name, tag);
  }

  /**
   * Serializes the model into a plain JSON object (C++: virtual Json::Value serialize() const = 0).
   * @virtual
   * @returns {Object}
   */
  serialize() {
    return {};
  }

  /**
   * Deserializes properties from a plain JSON object (C++: virtual void deserialize(const Json::Value& data) = 0).
   * @virtual
   * @param {Object} data
   */
  deserialize(data) {
    if (!data || typeof data !== 'object') return;
  }
}

