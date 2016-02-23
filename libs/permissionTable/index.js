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

PermissionTable.prototype.build = function(scopeModel, scopeId, entityModel, entityId, permission) {
  return buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission);
}

PermissionTable.prototype.add = function(assertions, cb) {
  this.lib.ptda.addItems(undefined, assertions, cb);
}

PermissionTable.prototype.remove = function(assertions, cb) {
  this.lib.ptda.removeItems(undefined, assertion, cb);
}

PermissionTable.prototype.get = function(assertions, cb) {
  if( ! _.isArray(assertions)) {
    assertions = [ assertions ];
  }
  console.log(assertions);
  if(assertions && assertions.length > 0) {
    if(_.isString(assertions[0])) {
      this.lib.ptda.findItemsById(undefined, assertions, createCombineMethod(assertions, cb));
    } else {
      var keys = [];
      for(var i = 0; i < assertions.length; i++) {
        keys.push(Object.keys(assertions[i])[0]);
      }
      this.lib.ptda.findItemsById(undefined, keys, createCombineMethod(keys, cb));
    }
  }
}

PermissionTable.prototype.combine = function(assertions, results) {
  return combine(assertions, results);
}


PermissionTable.prototype.buildAndAdd = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  this.add(buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission), cb);
}

PermissionTable.prototype.buildAndRemove = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  this.remove(buildAssertion(this, scopeModel, scopeId, entityModel, entityId, permission), cb);
}






PermissionTable.prototype.buildAndGet = function(scopeModel, scopeId, entityModel, entityId, cb) {
  this.get(this.buildAssertionKey(scopeModel, scopeId, entityModel, entityId), cb);
}

/*PermissionTable.prototype.get = function(assertionKey, cb) {
  this.lib.ptda.findItemById(undefined, assertionKey, cb);
}*/


PermissionTable.prototype.can = function(scopeModel, scopeId, entityModel, entityId, permission, cb) {
  var pt = this,
    resource = buildResourceObject(pt, scopeModel, scopeId, entityModel, entityId);
  
  pt.lib.log.trace("PermissionTable.can(): Check for %s permission(s) for %s.", pt.permissionToString(permission), JSON.stringify(resource));

  getAssertion(pt, resource, function(err, assertion) {
    if(err) {
      cb(err);
    } else {
      cb(undefined, (assertion.permissions & permission) == permission);
    }
  });
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
    default: return "Invalid permission value";
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


var createCombineMethod = function(assertions, cb) {
  return function(err, results) {
    cb(undefined, combine(assertions, results));
  }
}

var combine = function(assertions, results) {
  var ary = [];
  
  if( ! _.isArray(assertions)) {
    assertions = [assertions];
  }

  if(assertions && assertions.length > 0) {
    for(var i = 0; i < results.length; i++) {
      if(results[i] != null) {
        var obj = {};
        obj[assertions[i]] = results[i];
        ary.push(obj);
      }
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
      permissions: assertionValue,
      scope: {
        model: assertionElements[0],
        id: assertionElements[1]
      }        
    };
    if(resource) {
      assertionObject.correlation = getPermissionCorrelation(pt, assertionObject, resource);
    }
  } else {
    pt.lib.log.warn("PermissionTable.assertionKeyValueToObject():  Invalid assertion key '"+assertionKey+"'");
  }

  return assertionObject;
}


var getMostPermissiveAssertion = function(pt, assertions, resource, cb) {
  var pt = this;
  var mpa = undefined;
  for(var key in assertions) {
    if(assertions.hasOwnProperty(key)) {
      var assertion = assertionKeyValueToObject(pt, key, assertions[key], resource);
      if(mpa == undefined 
          || mpa.correlation < assertion.correlation 
          || (mpa.correlation == assertion.correlation 
          && mpa.permissions < assertion.permissions) ) {
        
        mpa = assertion;
      }
    }
  }

  cb(undefined, mpa);
}


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

var buildAssertionObject = function(pt, scopeModel, scopeId, entityModel, entityId, permissions, resource, correlation) {
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
  var assertions = getRelatedAssertions(pt, resource);
  //pt.lib.log.trace("Query for possible assertions: %s", assertions);
  pt.lib.ptda.findItemsById(undefined, assertions, function(err, results) {
    if(err) {
      cb(err);
    } else if(results == undefined) {
      cb();
    } else {
      var mpa = undefined;
      for(var i = assertions.length-1; i >=0; i--) {
      //for(var i = 0; i < assertions.length; i++) {
        if(results[i] != null) {
          //pt.lib.log.trace("Found related assertion: { \"%s\": %s }", assertions[i], results[i]);
          var assertion = assertionKeyValueToObject(pt, assertions[i], results[i], resource);
          //pt.lib.log.trace("Related assertion: %s", assertion);
          if(mpa == undefined 
              || mpa.correlation < assertion.correlation 
              || (mpa.correlation == assertion.correlation 
              && mpa.permissions < assertion.permissions) ) {
            mpa = assertion;
            //pt.lib.log.trace("Changed most permissiable assertion: %s", JSON.stringify(mpa));
          } else {
            //pt.lib.log.trace("Unchanged most permissiable assertion: \n%s\nvs.\n%s", JSON.stringify(assertion), JSON.stringify(mpa));
          }
        }
      }
      cb(undefined, mpa);
    } 
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

          assertions.push(pt.buildAssertionKey(
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
 
