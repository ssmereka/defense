"use strict";

module.exports = function() {

  var config = require('config');

  const PERMISSION_READ_WRITE_DELETE = 7,
    PERMISSION_READ_WRITE = 6,
    PERMISSION_READ_DELETE = 5,
    PERMISSION_READ = 4,
    PERMISSION_WRITE_DELETE = 3,
    PERMISSION_WRITE = 2,
    PERMISSION_DELETE = 1,
    PERMISSION_NONE = 0;

  var addPermissions = function(currentPermissions, newPermissions) {
    if( ! currentPermissions) {
      currentPermissions = PERMISSION_NONE;
    }

    newPermissions.forEach(function (permission) {
      if(typeof permission == 'string') {
        permission = permission.toLowerCase();
      }

      switch (permission) {
        case PERMISSION_READ:
        case "r":
        case "read":
          if ((currentPermissions & PERMISSION_READ) != PERMISSION_READ) {
            currentPermissions += PERMISSION_READ;
          }
          break;

        case PERMISSION_DELETE:
        case "d":
        case "delete":
          if ((currentPermissions & PERMISSION_DELETE) != PERMISSION_DELETE) {
            currentPermissions += PERMISSION_DELETE;
          }
          break;

        case PERMISSION_WRITE:
        case "w":
        case "write":
          if ((currentPermissions & PERMISSION_WRITE) != PERMISSION_WRITE) {
            currentPermissions += PERMISSION_WRITE
          }
          break;

        case PERMISSION_NONE:
        case "n":
        case "none":
          currentPermissions = PERMISSION_NONE;
          break;

        default:
          // Permission is invalid.
          break;
      }
    });

    return currentPermissions;
  };

  var getDefaultPermission = function() {
    if(config.has('assertion.default.permissions')) {
      return addPermissions(PERMISSION_NONE, config.get('assertion.default.permissions'));
    } else {
      return PERMISSION_NONE;
    }
  };

  var getConfigValue = function (name, defaultValue) {
    if(config.has(name)) {
      return config.get(name);
    } else {
      return defaultValue;
    }
  };

  const DEFAULT_PERMISSION = getDefaultPermission(),
    OPERATOR_WILDCARD = getConfigValue('assertion.operators.wildcard', '*'),
    OPERATOR_OWNER = getConfigValue('assertion.operators.owner', '@'),
    DELIMITER = getConfigValue('assertion.delimiter', ':');

  const DEFAULT_ENTITY_MODEL = OPERATOR_WILDCARD,
    DEFAULT_ENTITY_ID = OPERATOR_WILDCARD,
    DEFAULT_SCOPE_MODEL = OPERATOR_WILDCARD,
    DEFAULT_SCOPE_ID = OPERATOR_WILDCARD;

  /**
   * Assertion
   */
  class Assertion {

    constructor(scopeModel, scopeId, entityModel, entityId, permissions) {
      this.assertion = {
        entity: {
          model: entityModel || DEFAULT_ENTITY_MODEL,
          id: entityId || DEFAULT_ENTITY_ID
        },
        permissions: permissions || DEFAULT_PERMISSION,
        scope: {
          model: scopeModel || DEFAULT_SCOPE_MODEL,
          id: scopeId || DEFAULT_SCOPE_ID
        }
      };
    }

    give(model, id) {
      if (model) {
        this.assertion.scope.model = model;
      }
      if (id) {
        this.assertion.scope.id = id;
      }
      return this;
    }

    permission() {
      this.assertion.permissions = addPermissions(this.assertion.permissions, Array.prototype.slice.call(arguments));
      return this;
    }

    entity(model, id) {
      if (model) {
        this.assertion.entity.model = model;
      }
      if (id) {
        this.assertion.entity.id = id;
      }
      return this;
    }

    toObject() {
      let obj = {};
      obj[this.key()] = this.value();
      return obj;
    }

    key() {
      return this.assertion.scope.model + DELIMITER
        + this.assertion.scope.id + DELIMITER
        + this.assertion.entity.model + DELIMITER
        + this.assertion.entity.id;
    }

    value() {
      return this.assertion.permissions;
    }

    toString() {
      return "\"" + this.key() + "\"" + " = " + Assertion.permissionNumberToString(this.value());
    }

    static permissionNumberToString(permission) {
      switch (permission) {
        case 7:
          return "Read, Write, Delete";
        case 6:
          return "Read, Write";
        case 5:
          return "Read, Delete";
        case 4:
          return "Read";
        case 3:
          return "Write, Delete";
        case 2:
          return "Write";
        case 1:
          return "Delete";
        case 0:
          return "None";
        default:
          return "Invalid permission value of " + permission;
      }
    }

  }

  return Assertion;
};