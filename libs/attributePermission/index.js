/* ************************************************** *
 * ******************** Global Variables
 * ************************************************** */

var async = require('async'),
  path = require('path'),
  _ = require('lodash');


/* ************************************************** *
 * ******************** Constructor & Inherit
 * ************************************************** */

/**
 * Initalizes a new Mongoose Adapter and configures the
 * parent Database Adapter class.
 */
var AttributePermissions = function(defense) {
  this.lib = defense;
  this.attributeSchema = "attributePermissions";

  this.delimiter = ":";
  this.operators = {
    wildcard: "*",
    owner: "@"
  };
  this.identifiers = {
    "default": {
      id: "_id"
    },
    user: {
      model: "user",
      id: "_id"
    }
  }
  this.defaultPermission = this.n;
  //this.defaultAssertion = buildAssertion(this, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.defaultPermission);
  this.defaultAssertionObject = buildAssertionObject(this, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.defaultPermission, 0);
}

/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

/**
 * Build an assertion object from the key components.
 * @param {String} scopeModel is the scope model identifier.
 * @param {String} scopeId is the scope id identifier.
 * @param {String} entityModel is the entity model identifier.
 * @param {String} entityId is the entity id identifier.
 * @param {Number} permission is the permission value.
 * @return {Object} an assertion object.
 */
AttributePermissions.prototype.build = function(scopeModel, scopeId, entityModel, entityId, permission) {
  return buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission);
}

AttributePermissions.prototype.add = function(scopeModel, scopeId, entityModel, entityId, permission, attribute, cb) {
  var ap = this;
  var query = {
    "model": scopeModel,
    "recordId": scopeId
  };

  var entityKey = entityModel+ap.delimiter+entityId;

  ap.lib.apda.findItem(ap.attributeSchema, query, function(err, item) {
    if(err) {
      cb(err);
    } else if( ! item) {
      ap.lib.apda.addItem(ap.attributeSchema, assertionToObject(ap, scopeModel, scopeId, entityModel, entityId, permission, attribute), cb);
    } else if( ! attribute) {
      // Handle default attribute permission.
      if( ! item["default"]) {
        item["default"] = {};
      }
      if(item["default"][entityKey] != permission) {
        item["default"][entityKey] = permission;
        
      } else {
        cb(undefined, item);
      }
    } else {
      // Handle attribute specific permission.
      if( ! item["attributes"]) {
        item["attributes"] = {};
      }

      if(item["attributes"][attribute]) {
        item["attributes"][attribute] = {};
      }

      if(item["attributes"][attribute][entityKey] != permission) {
        item["attributes"][attribute][entityKey] = permission;
      } else {
        // Already there, no need to update.
      }

    }
  });

  return buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission);
}

/* ************************************************** *
 * ******************** Private Methods
 * ************************************************** */ 

var buildAssertionKey = function(ap, entityModel, entityId) {
  return entityModel+ap.delimiter+entityId;
}

var assertionToObject = function(ap, scopeModel, scopeId, entityModel, entityId, permission, attribute) {
  var obj = {
    "attributes": {},
    "default:": {},
    "model": model,
    "recordId": id
  };

  if(attribute) {
    obj["attributes"][attribute] = {};
    obj["attributes"][attribute][buildAssertionKey(ap, entityModel, entityKey)] = permission;
  } else {
    obj["default"][buildAssertionKey(ap, entityModel, entityKey)] = permission;
  }

  return obj;
};


/* ************************************************** *
 * ******************** Expose API
 * ************************************************** */

exports = module.exports = AttributePermissions;


/* ************************************************** *
 * ******************** Documentation Stubs
 * ************************************************** */
 
 /**
 * 
 *
 * @callback databaseCallback
 * @param {object|undefined} error describes the error 
 * that occurred.
 * @param {array|undefined} responses is a list of 
 * responses from the database to describe whether or 
 * not each assertion was inserted into the database 
 * successfully.
 */

/**
 * 
 *
 * @callback databaseCallback
 * @param {object|undefined} error describes the error 
 * that occurred.
 * @param {array|undefined} responses is a list of 
 * responses from the database to describe whether or 
 * not each assertion was inserted into the database 
 * successfully.
 */



