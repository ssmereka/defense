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
 * Initializes a new Mongoose Adapter and configures
 * the parent Database Adapter class.
 */
var AttributePermissions = function(defense) {
  this.lib = defense;
  this.attributeSchema = "AttributePermission";

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
  };
  //this.registerSchema()
  //this.defaultPermission = this.n;
  //this.defaultAssertion = buildAssertion(this, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.defaultPermission);
  //this.defaultAssertionObject = buildAssertionObject(this, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.operators.wildcard, this.defaultPermission, 0);
};

/* ************************************************** *
 * ******************** Public API
 * ************************************************** */


AttributePermissions.prototype.add = function(assertions, cb) {
  this.lib.apda.add(assertions, { fixtureId: this.attributeSchema }, cb);
};

AttributePermissions.prototype.remove = function(assertions, cb) { 
  var ap = this;

  if( ! assertions) {
    this.lib.log.warn("AttributePermissions.remove():  Cannot remove assertions with value of '%s'", assertions)
    return cb(undefined, []);
  }
    
  // Ensure our assertion(s) are in an array.
  if( ! _.isArray(assertions)) {
    assertions = [ assertions ];
  } else if(assertions.length == 0) {
    return cb(undefined, []);
  }
  
  this.lib.apda.removeItems(ap.attributeSchema, assertions, cb);
}





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



