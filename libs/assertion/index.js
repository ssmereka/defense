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

  var addRead = function(currentPermissions) {
    if ((currentPermissions & PERMISSION_READ) != PERMISSION_READ) {
      currentPermissions += PERMISSION_READ;
    }
    return currentPermissions;
  };

  var addWrite = function(currentPermissions) {
    if ((currentPermissions & PERMISSION_WRITE) != PERMISSION_WRITE) {
      currentPermissions += PERMISSION_WRITE
    }
    return currentPermissions;
  };

  var addDelete = function(currentPermissions) {
    if ((currentPermissions & PERMISSION_DELETE) != PERMISSION_DELETE) {
      currentPermissions += PERMISSION_DELETE;
    }
    return currentPermissions;
  };

  var addPermissions = function(currentPermissions, newPermissions) {
    if( ! currentPermissions) {
      currentPermissions = PERMISSION_NONE;
    }

    newPermissions.forEach(function (permission) {
      if(typeof permission == 'string') {
        permission = permission.toLowerCase();
      }

      switch (permission) {
        case PERMISSION_READ_WRITE_DELETE:
        case "rwd":
        case "read, write, delete":
          currentPermissions = addRead(currentPermissions);
          currentPermissions = addWrite(currentPermissions);
          currentPermissions = addDelete(currentPermissions);
          break;

        case PERMISSION_READ_WRITE:
        case "rw":
        case "read, write":
          currentPermissions = addRead(currentPermissions);
          currentPermissions = addWrite(currentPermissions);
          break;

        case PERMISSION_READ_DELETE:
        case "rd":
        case "read, delete":
          currentPermissions = addRead(currentPermissions);
          currentPermissions = addDelete(currentPermissions);
          break;

        case PERMISSION_WRITE_DELETE:
        case "wd":
        case "write, delete":
          currentPermissions = addWrite(currentPermissions);
          currentPermissions = addDelete(currentPermissions);
          break;

        case PERMISSION_READ:
        case "r":
        case "read":
          currentPermissions = addRead(currentPermissions);
          break;

        case PERMISSION_DELETE:
        case "d":
        case "delete":
          currentPermissions = addDelete(currentPermissions);
          break;

        case PERMISSION_WRITE:
        case "w":
        case "write":
          currentPermissions = addWrite(currentPermissions);
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
      this.setDefault();

      if(arguments.length == 1 && arguments[0] !== null && typeof arguments[0] === 'object') {
        this.fromObject(arguments[0]);
      } else {
        this.give(scopeModel, scopeId).permission(permissions).entity(entityModel, entityId);
      }
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

    fromObject(obj) {
      if(obj !== null && typeof obj === 'object' && Object.keys(obj).length == 1) {
        let key = Object.keys(obj)[0],
          items = key.split(DELIMITER);

        if(items.length == 4) {
          this.give(items[0], items[1]).entity(items[2], items[3]);
        }
        this.permission(Number(obj[key]));
      }
      return this;
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

    key() {
      return this.assertion.scope.model + DELIMITER
        + this.assertion.scope.id + DELIMITER
        + this.assertion.entity.model + DELIMITER
        + this.assertion.entity.id;
    }

    permission() {
      this.assertion.permissions = addPermissions(this.assertion.permissions, Array.prototype.slice.call(arguments));
      return this;
    }

    setDefault() {
      this.assertion = {
        entity: {
          model: DEFAULT_ENTITY_MODEL,
          id: DEFAULT_ENTITY_ID
        },
        permissions: DEFAULT_PERMISSION,
        scope: {
          model: DEFAULT_SCOPE_MODEL,
          id: DEFAULT_SCOPE_ID
        }
      };
    }

    toObject() {
      let obj = {};
      obj[this.key()] = this.value();
      return obj;
    }

    toString() {
      return "\"" + this.key() + "\"" + " = " + Assertion.permissionNumberToString(this.value());
    }

    value() {
      return this.assertion.permissions;
    }

    static permissionNumberToString(permission) {
      switch (permission) {
        case 7:
          return "Read, Write, and Delete";
        case 6:
          return "Read and Write";
        case 5:
          return "Read and Delete";
        case 4:
          return "Read";
        case 3:
          return "Write and Delete";
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