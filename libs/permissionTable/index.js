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
var PermissionTable = function(defense) {
  this.lib = defense;
  this.delimiter = ":";
  this.operators = {
      wildcard: "*",
      owner: "@"
    };
}


/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

PermissionTable.prototype.buildAssertion = function(scopeModel, scopeId, entityModel, entityId, permission) {
  var assertion = {};
  assertion[this.buildAssertionKey(scopeModel, scopeId, entityModel, entityId)] = permission;
  return assertion;  
}

PermissionTable.prototype.buildAssertionKey = function(scopeModel, scopeId, entityModel, entityId) {
  return scopeModel + this.delimiter + scopeId + this.delimiter + entityModel + this.delimiter + entityId;
}


PermissionTable.prototype.buildAndAdd = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  this.add(this.buildAssertion(scopeModel, scopeId, entityModel, entityId, permission), cb);
}

PermissionTable.prototype.add = function(assertion, cb) {
  this.lib.ptda.addItem(undefined, assertion, cb);
}

PermissionTable.prototype.buildAndGet = function(scopeModel, scopeId, entityModel, entityId, cb) {
  this.get(this.buildAssertionKey(scopeModel, scopeId, entityModel, entityId), cb);
}

PermissionTable.prototype.get = function(assertionKey, cb) {
  this.lib.ptda.findItemById(undefined, assertionKey, cb);
}

PermissionTable.prototype.getRelatedAssertions = function(scopeModel, scopeId, entityModel, entityId, cb) {
  var possibleScopeModels = [ this.operators.wildcard ];
  if(possibleScopeModels[0] !== scopeModel) {
    possibleScopeModels.push(scopeModel);
  }

  var possibleScopeIds = [ this.operators.wildcard, this.operators.owner ];
  if(possibleScopeIds[0] !== scopeId && possibleScopeIds[1] !== scopeId) {
    possibleScopeIds.push(scopeId);
  }

  var possibleEntityModel = [ this.operators.wildcard ];
  if(possibleEntityModel[0] !== entityModel) {
    possibleEntityModel.push(entityModel);
  }

  var possibleEntityId = [ this.operators.wildcard, this.operators.owner ];
  if(possibleEntityId[0] !== entityId && possibleEntityId[1] !== entityId) {
    possibleEntityId.push(entityId);
  }

  var assertions = [];
  for(var scopeModelCounter = possibleScopeModels.length-1; scopeModelCounter >= 0; scopeModelCounter--) {
    for(var scopeIdCounter = possibleScopeIds.length-1; scopeIdCounter >= 0; scopeIdCounter--) {
      for(var entityModelCounter = possibleEntityModel.length-1; entityModelCounter >= 0; entityModelCounter--) {
        for(var entityIdCounter = possibleEntityId.length-1; entityIdCounter >= 0; entityIdCounter--) {

          assertions.push(this.buildAssertionKey(
            possibleScopeModels[scopeModelCounter],
            possibleScopeIds[scopeIdCounter],
            possibleEntityModel[entityModelCounter],
            possibleEntityId[entityIdCounter]
          ));
        }
      }
    }
  }

  return assertions;
}

PermissionTable.prototype.buildAndGetRelated = function(scopeModel, scopeId, entityModel, entityId, cb) {
  var assertions = this.getRelatedAssertions(scopeModel, scopeId, entityModel, entityId);
  this.lib.ptda.findItemsById(undefined, assertions, function(err, results) {
    if(err) {
      cb(err);
    } else {
      createPermissionObject(assertions, results, cb);
    }
  });
}

PermissionTable.prototype.checkPermissions = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  var isAllowed = false;
  this.buildAndGetRelated(scopeModel, scopeId, entityModel, entityId, function(err, pObj) {
    console.log(pObj);

    


    cb(undefined, isAllowed);
  });
}

var createPermissionObject = function(assertions, queryResults, cb) {
  var obj = {};
  for(var i = assertions.length-1; i >=0; i--) {
    if(queryResults[i] != null) {
      obj[assertions[i]]= queryResults[i];
    }
  }
  cb(undefined, obj);
}




PermissionTable.prototype.rwd = 7;
PermissionTable.prototype.rw  = 6;
PermissionTable.prototype.rd  = 5;
PermissionTable.prototype.r   = 4;
PermissionTable.prototype.wd  = 3;
PermissionTable.prototype.w   = 2;
PermissionTable.prototype.d   = 1;
PermissionTable.prototype.n   = 0;


/* ************************************************** *
 * ******************** Expose API
 * ************************************************** */

exports = module.exports = PermissionTable;
exports = PermissionTable;



/* ************************************************** *
 * ******************** Documentation Stubs
 * ************************************************** */
 
