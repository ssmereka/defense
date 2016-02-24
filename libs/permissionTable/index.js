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
PermissionTable.prototype.build = function(scopeModel, scopeId, entityModel, entityId, permission) {
  return buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission);
}

/**
 * Add one or more assertions to the database.
 * @param {Array|Object} assertions are a single or 
 * list of assertion objects to be inserted into the 
 * database.
 * @param {databaseCallback} cb is a callback method.
 */
PermissionTable.prototype.add = function(assertions, cb) {
  this.lib.ptda.addItems(undefined, assertions, cb);
}

/**
 * Remove one or more assertions from the database.
 * @param {Array|Object} assertions are a single or list 
 * of assertion objects or assertion keys to be removed from the database
 * @param {databaseCallback} cb is a callback method.
 */
PermissionTable.prototype.remove = function(assertions, cb) { 
  if( ! assertions) {
    this.lib.log.warn("PermissionTable.get():  Cannot remove assertions with value of '%s'", assertions)
    return cb(undefined, []);
  }
    
  // Ensure our assertion(s) are in an array.
  if( ! _.isArray(assertions)) {
    assertions = [ assertions ];
  } else if(assertions.length == 0) {
    return cb(undefined, []);
  }
  
  // Check if the assertion(s) are just String assertion key(s).
  if(_.isString(assertions[0])) {
    this.lib.ptda.removeItems(undefined, assertions, cb);
  } else {
    var keys = [];
    for(var i = 0; i < assertions.length; i++) {
      keys.push(Object.keys(assertions[i])[0]);
    }
    this.lib.ptda.removeItems(undefined, keys, cb);
  }
}

/**
 * Find one or more assertions in the database using 
 * the assertion's key value.
 * @param {Object} assertions is one or more 
 * assertions or assertion keys.
 * @param {} cb is a callback method.
 */
PermissionTable.prototype.get = function(assertions, cb) {
  if( ! assertions) {
    this.lib.log.warn("PermissionTable.get():  Cannot find assertions with value of '%s'", assertions)
    return cb(undefined, []);
  }
    
  // Ensure our assertion(s) are in an array.
  if( ! _.isArray(assertions)) {
    assertions = [ assertions ];
  } else if(assertions.length == 0) {
    return cb(undefined, []);
  }
  
  // Check if the assertion(s) are just String assertion key(s).
  if(_.isString(assertions[0])) {
    this.lib.ptda.findItemsById(undefined, assertions, createCombineMethod(this, assertions, cb));
  } else {
    var keys = [];
    for(var i = 0; i < assertions.length; i++) {
      keys.push(Object.keys(assertions[i])[0]);
    }
    this.lib.ptda.findItemsById(undefined, keys, createCombineMethod(this, keys, cb));
  }
}

PermissionTable.prototype.buildAndAdd = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  this.add(buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission), cb);
}

PermissionTable.prototype.buildAndRemove = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  this.remove(buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission), cb);
}

PermissionTable.prototype.buildAndGet = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  this.get(buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission), cb);
}

PermissionTable.prototype.can = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  var pt = this,
    resource = buildResourceObject(pt, scopeModel, scopeId, entityModel, entityId);

  getAssertion(pt, resource, function(err, assertion) {
    if(err) {
      cb(err);
    } else if( ! assertion || assertion.permissions == undefined) {
      pt.lib.log.trace("Default: PermissionTable.can(): Checked for %s permission(s) for %s and found permission of %s, so permission %s.", pt.permissionToString(permission), JSON.stringify(resource), pt.permissionToString(pt.defaultPermission), permissionAllowedString((pt.defaultPermission & permission) == permission));
      cb(undefined, (pt.defaultPermission & permission) == permission)
    } else {
      pt.lib.log.trace("PermissionTable.can(): Checked for %s permission(s) for %s and found permission of %s, so permission %s.", pt.permissionToString(permission), JSON.stringify(resource), pt.permissionToString(assertion.permissions), permissionAllowedString((assertion.permissions & permission) == permission));
      cb(undefined, (assertion.permissions & permission) == permission);
    }
  });
}

PermissionTable.prototype.createCanMethod = function(scopeModel, scopeId, entityModel, entityId, permission, errorOnPermissionDenied) {
  var pt = this;
  return function(cb) {
    pt.can(scopeModel, scopeId, entityModel, entityId, permission, function(err, isAllowed) {
      if(err) {
        cb(err);
      } else {
        if(errorOnPermissionDenied && ! isAllowed) {
          cb(new Error("Permission denied to one or more items."));
        } else {
          cb(undefined, isAllowed);
        }
      }
    });
  };
}

PermissionTable.prototype.permissionToAbbreviatedString = function(permission) {
  switch(permission) {
    case 7: return "rwd";
    case 6: return "rw";
    case 5: return "rd";
    case 4: return "r";
    case 3: return "wd";
    case 2: return "w";
    case 1: return "d";
    case 0: return "n";
    default: return "Invalid permission value";
  }
}

PermissionTable.prototype.permissionToString = function(permission) {
  switch(permission) {
    case 7: return "read, write, and delete";
    case 6: return "read and write";
    case 5: return "read and delete";
    case 4: return "read";
    case 3: return "write and delete";
    case 2: return "write";
    case 1: return "delete";
    case 0: return "none";
    default: 
      return "Invalid permission value: "+permission;
  }
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
 * ******************** Private Methods
 * ************************************************** */


/* ************************************************** *
 * ******************** Assertion Key/Value
 * ************************************************** */

var permissionAllowedString = function(isAllowed) {
  return (isAllowed) ? "granted" : "denied";
}

/**
 * Create a method to accept a response from a database 
 * query and combine the list of assertion keys and 
 * query results to create a list of full assertion 
 * key/values.
 * @param {Object} pt is the policy table instance.
 * @param {Array} assertions a list of assertion keys.
 * @param {} cb is a callback method.
 */
var createCombineMethod = function(pt, assertions, cb) {
  return function(err, results) {
    cb(undefined, combine(pt, assertions, results));
  }
}

/**
 * Combine a list of assertion keys and query results 
 * to create a list of full assertion key/values.
 * @param {Object} pt is the policy table instance.
 * @param {Array} assertions a list of assertion keys.
 * @param {Array} results a list of query results.
 * @return {Array} a list of assertion key/value objects.
 */
var combine = function(pt, assertions, results) {
  var ary = [];
  
  // Make sure preconditions are met.
  if( ! assertions || ! _.isArray(assertions)) {
    pt.lib.log.warn("combine(): Cannot combine assertions with a value of '%s'", assertions);
    return ary;
  } else if( ! results || ! _.isArray(results)) {
    pt.lib.log.warn("combine(): Cannot combine results with a value of '%s'", results)
    return ary;
  } else if(assertions.length != results.length) {
    pt.lib.log.warn("combine(): Cannot combine assertions(%s) and results(%s) properly when they have different lengths.", assertions.length, results.length);
    return ary;
  }

  for(var i = 0; i < results.length; i++) {
    if(results[i] != null) {
      var obj = {};
      try {
        obj[assertions[i]] = Number(results[i]);
      } catch(err) {
        pt.lib.log.error(err);
        pt.lib.log.warn("combine():  Could not convert permission string to a number.  Using default permission instead.");
        obj[assertions[i]] = pt.defaultPermission;
      }
      ary.push(obj);
    }
  }

  return ary;
}

/**
 * Create an assetion key/value pair.
 * @param  {[type]} pt 
 * @param  {[type]} scopeModel  [description]
 * @param  {[type]} scopeId     [description]
 * @param  {[type]} entityModel [description]
 * @param  {[type]} entityId    [description]
 * @param  {[type]} permission  [description]
 * @return {Object}
 */
var buildAssertion = function(pt, scopeModel, scopeId, entityModel, entityId, permission) {
  var assertion = {};
  assertion[buildAssertionKey(pt, scopeModel, scopeId, entityModel, entityId)] = permission;
  return assertion;  
}

/**
 * Create an assertion key given each piece of information.
 * @param {Object} pt is the policy table instance.
 * @param {String} scopeModel is the scope model identifier.
 * @param {String} scopeId is the scope id identifier.
 * @param {String} entityModel is the entity model identifier.
 * @param {String} entityId is the entity id identifier.
 * @return {String} an assertion key string.
 */
var buildAssertionKey = function(pt, scopeModel, scopeId, entityModel, entityId) {
  return scopeModel + pt.delimiter + scopeId + pt.delimiter + entityModel + pt.delimiter + entityId;
}

var assertionKeyValueToObject = function(pt, assertionKey, assertionValue, resource) {
  var assertionElements = assertionKey.split(pt.delimiter);
  var assertionObject = undefined;

  if(assertionElements && assertionElements.length == 4) {
    assertionObject = {
      entity: {
        model: assertionElements[2],
        id: assertionElements[3]
      },
      //permissions: assertionValue,
      scope: {
        model: assertionElements[0],
        id: assertionElements[1]
      }        
    };

    try {
      assertionObject.permissions = Number(assertionValue);
    } catch(err) {
      pt.lib.log.error(err);
      pt.lib.log.warn("assertionKeyValueToObject():  Could not convert permission string to a number.  Using default permission instead.");
      assertionObject.permissions = pt.defaultPermission;
    }

    if(resource) {
      assertionObject.correlation = getPermissionCorrelation(pt, assertionObject, resource);
    }
  } else {
    pt.lib.log.warn("PermissionTable.assertionKeyValueToObject():  Invalid assertion key '"+assertionKey+"'");
  }

  return assertionObject;
}

/**
 * Create an assertion describing a specific resource.  
 * This will not have the permission value, but will 
 * have the scope and entity.
 * @param {Object} pt is the policy table instance.
 * @param {String} scopeModel is the scope model identifier.
 * @param {String} scopeId is the scope id identifier.
 * @param {String} entityModel is the entity model identifier.
 * @param {String} entityId is the entity id identifier.
 * @return {Object} the resource object.
 */
var buildResourceObject = function(pt, scopeModel, scopeId, entityModel, entityId) {
  var resource = {
    entity: {
      id: entityId,
      model: entityModel
    },
    scope: {
      id: scopeId,
      model: scopeModel
    }
  }

  return resource
}


var buildAssertionObject = function(pt, scopeModel, scopeId, entityModel, entityId, permissions, correlation, resource) {
  var assertion = {
    correlation: correlation,
    entity: {
      id: entityId,
      model: entityModel
    },
    permissions: permissions,
    resource: resource,
    scope: {
      id: scopeId,
      model: scopeModel
    }
  }

  if(resource && ! correlation) {
    assertion.correlation = getPermissionCorrelation(pt, assertion)
  }

  return assertion
}

/**
 * Determine the correlation between an asserition and a 
 * resource and return a numeric value to represent the 
 * correlcation.  Where a higher number indicates a 
 * higher correlation.
 * 
 * @param  {Object} pt
 * @param  {Object} assertion 
 * @param  {Object} resource 
 * @return {Number}
 */
var getPermissionCorrelation = function(pt, assertion, resource) {
  var cf = 0;
  
  if( ! assertion) {
    pt.lib.log.warn("getPermissionCorrelation():  Cannot determine assertion correlation when the assertion is undefined.");
    return -1;
  } else if( ! resource) {
    if(assertion.resource) {
      resource = assertion.resource;
    } else {
      pt.lib.log.warn("getPermissionCorrelation():  Cannot determine assertion correlation when resource is undefined.");
      return -1;
    }
  } 

  if(assertion.scope.model == resource.scope.model) {
    cf++;
    if(assertion.scope.id != pt.operators.wildcard) {
      // TODO: Check if owner.
      cf++;
    }
  }
  if(assertion.entity.model == resource.entity.model) {
    cf++;
    if(assertion.entity.id != pt.operators.wildcard) {
      // TODO: Check if owner.
      cf++;
    }
  }

  return cf;
}

var getAssertion = function(pt, resource, cb) {
  var assertions = getRelatedAssertions(pt, resource),  
      mpa = pt.defaultAssertionObject;

  pt.lib.ptda.findItemsById(undefined, assertions, function(err, results) {
    if(err) {
      cb(err, mpa);
    } else {
      if(results != undefined) {
        for(var i = assertions.length-1; i >=0; i--) {
          if(results[i] != null) {
            var assertion = assertionKeyValueToObject(pt, assertions[i], results[i], resource);
            if(mpa == undefined 
                || mpa.correlation < assertion.correlation 
                || (mpa.correlation == assertion.correlation 
                && mpa.permissions < assertion.permissions) ) {
              mpa = assertion;
            }
          }
        }
      }
      cb(undefined, mpa);
    } 
  });
}

/**
 * Get all possible permutations of assertions that 
 * could affect access to a specified resource.  
 * @param {Object} pt is the policy table instance.
 * @param {Object} resource is an resource assertion object.
 * @return {[type]}
 */
var getRelatedAssertions = function(pt, resource) {
  var possibleScopeModels = [ pt.operators.wildcard ];
  if(possibleScopeModels[0] !== resource.scope.model) {
    possibleScopeModels.push(resource.scope.model);
  }

  var possibleScopeIds = [ pt.operators.wildcard, pt.operators.owner ];
  if(possibleScopeIds[0] !== resource.scope.id && possibleScopeIds[1] !== resource.scope.id) {
    possibleScopeIds.push(resource.scope.id);
  }

  var possibleEntityModel = [ pt.operators.wildcard ];
  if(possibleEntityModel[0] !== resource.entity.model) {
    possibleEntityModel.push(resource.entity.model);
  }

  var possibleEntityId = [ pt.operators.wildcard, pt.operators.owner ];
  if(possibleEntityId[0] !== resource.entity.id && possibleEntityId[1] !== resource.entity.id) {
    possibleEntityId.push(resource.entity.id);
  }

  var assertions = [];
  for(var scopeModelCounter = possibleScopeModels.length-1; scopeModelCounter >= 0; scopeModelCounter--) {
    for(var scopeIdCounter = possibleScopeIds.length-1; scopeIdCounter >= 0; scopeIdCounter--) {
      for(var entityModelCounter = possibleEntityModel.length-1; entityModelCounter >= 0; entityModelCounter--) {
        for(var entityIdCounter = possibleEntityId.length-1; entityIdCounter >= 0; entityIdCounter--) {

          assertions.push(buildAssertionKey(
            pt,
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


/* ************************************************** *
 * ******************** Expose API
 * ************************************************** */

exports = module.exports = PermissionTable;
exports = PermissionTable;



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
