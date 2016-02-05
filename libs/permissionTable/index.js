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
  this.delimiter = ".";
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
 
