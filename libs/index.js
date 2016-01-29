/* ************************************************** *
 * ******************** Library Global Variables
 * ************************************************** */

var async = require('async'),
  crave = require('crave'),
  path = require('path'),
  _ = require('lodash');

// Default configuration object.
var defaultConfig = {
  database: {
    connectionUri: undefined,
    idAttributeName: undefined,
    instance: undefined,
    type: undefined
  },
  crave: {
    cache: {                    // Crave can store the list of files to load rather than create it each time.
      enable: false             // Disable caching of the list of files to load.  In production this should be enabled.
    },
    identification: {           // Variables related to how to find and require files are stored here.
      type: "filename",         // Determines how to find files.  Available options are: 'string', 'filename'
      identifier: "_"           // Determines how to identify the files.
    }
  },
  fixture: {}
};

var defaultLogConfig = {
  level: 40, //Information about Levels https://github.com/trentm/node-bunyan#levels
  name: 'Defense'
};

/* ************************************************** *
 * ******************** Constructor
 * ************************************************** */

/**
 * Constructor to setup and initialize a new or existing
 * instance.
 *
 * @param {object|undefined} config is a Defense configuration object.
 * @param {object|undefined} log is a bunyan instance.
 * @param {object|undefined} error is a Defense error instance.
 * @returns {object} the new or current Defense instance.
 * @constructor
 */
var Defense = function(config, log, error) {
  "use strict";

  // Auto instantiate the module when it is required.
  if(! (this instanceof Defense)) {
    return new Defense(config, log, error);
  } else {

    // Initalize the class with the passed parameters.
    this.setConfig(config, true);
    this.setLog(log);
    this.setError(error);

    return this;
  }
};


/* ************************************************** *
 * ******************** Initalize and Set Methods
 * ************************************************** */

/**
 * Set and apply new configurations for Defense.
 * Any attribute included in the configuration 
 * object will overwrite the existing attribute.
 *
 * A config value of undefined will reset the 
 * configuration object to the default settings.
 *
 * @param {object|undefined} config is a Defense
 * configuration object.
 * @param {boolean|undefined} initalize when true
 * will set the Defense's config instance to the 
 * default settings before applying the passed
 * configuration values.
 */
Defense.prototype.setConfig = function(config, initalize) {
  if(initalize && ! this.config) {
    this.config = JSON.parse(JSON.stringify(defaultConfig));
  }

  if( ! config || ! _.isObject(config) && ! initalize) {
    this.config = JSON.parse(JSON.stringify(defaultConfig));
  } else {
    for(var key in config) {
      for(var subObjectKey in config[key]) {
        this.config[key][subObjectKey] = config[key][subObjectKey];
      }
    }
  }

  this.setDatabaseAdapter();
};

/**
 * Set the database instance to the specified value.
 * @param databaseInstance is the new database instance value.
 */
Defense.prototype.setDatabaseInstance = function(databaseInstance) {
  if( ! this.config || ! _.isObject(this.config)) {
    this.config = JSON.parse(JSON.stringify(defaultConfig));
  }
  this.config.database.instance = databaseInstance;
  this.setDatabaseAdapter();
};

/**
 * Set or configure the Defense bunyan log instace.
 *
 * Passing a value of undefined for both the config
 * and log parameters will initalize a new bunyan 
 * log instance with the default values.
 *
 * @param {object|undefined} config is a bunyan
 * configuration object.
 * @param {object|undefined} log is a bunyan instance.
 */
Defense.prototype.setLog = function(config, log) {
  if(log) {
    this.log = log;
  } else {
    var bunyan = require('bunyan');
    this.log = bunyan.createLogger(config || defaultLogConfig);
  }
};

/**
 * Set or configure the Defense error object.
 * The error object is used to build and display
 * errors that occur in Defense.
 *
 * Passing a value of undefined for the error
 * object will reset the error object to the 
 * default. 
 *
 * @param {object|undefined} error is an object
 * with methods related to building error objects.
 */
Defense.prototype.setError = function(error) {
  if(error) {
    this.error = error;
  } else {
    this.error = {
      build: function(message, code) {
        var err = new Error(message);
        err.status = code || 500;
        return err;
      }
    };
  }
};

/**
 * Set the database adapter to interact with the desired 
 * database.
 *
 * If the configuration object is undefined, then the current
 * configuraiton object will be used.
 *
 * @param {undefined|object} config is a Defense configuration
 * object.
 */
Defense.prototype.setDatabaseAdapter = function(config) {
  var defense = this;

  config = config || defense.config;

  switch((config && config.database && config.database.type) ? config.database.type.toLowerCase(): "") {
    case 'mongoose':
      if( ! defense.MongooseAdapter) {
        defense.MongooseAdapter = require(databaseAdaptersFolder + 'mongoose.js');
      }

      defense.databaseAdapter = defense.MongooseAdapter(defense);
      break;

    default:
      if( ! defense.DatabaseAdapter) {
        defense.DatabaseAdapter = require(databaseAdaptersFolder + 'index.js');
      }
      defense.databaseAdapter = defense.DatabaseAdapter(defense.config, defense.log);
      break;
  }
};


/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

/**
 * Check if a user has permission to delete a given 
 * resource or group of resources. If the user is 
 * denied access to a single item in a group of 
 * resources a value of denied will be returned. 
 * Permission to an entire database record type can be 
 * evaluated by passing a value of undefined as the 
 * Resource value.
 * 
 * @param {object} user is a user database record, 
 * typically pulled from the current session.
 * @param {string} model is the type of database record 
 * to check permissions against. Should be the same 
 * type as the Resource provided.
 * @param {array|object|string|undefined} resource is a 
 * list of database records, a single database record, 
 * a single database record's unique identifier, or 
 * undefined respectively.
 * @param {canPerformActionCallback} cb is a callback 
 * method.
 */
Defense.prototype.canDelete = function(user, model, resource, cb) {
  var defense = this,
      isAllowed = false;

  // Check required parameters, without them calling this method would be useless.
  if( checkRequiredParameter(defense, "canDelete", "callback", cb) != true) { return; }
  if( checkRequiredParameter(defense, "canDelete", "user", user, cb) != true) { return; }
  if( checkRequiredParameter(defense, "canDelete", "model", model, cb) != true) { return; }

  // TODO: Determine if the user can delete the specified resource.

  cb(undefined, isAllowed);
};


/* ************************************************** *
 * ******************** Private Methods
 * ************************************************** */


var checkRequiredParameter = function(defense, method, name, parameter, cb) {
  if( ! parameter) {
    var error = defense.build.error('The parameter "'+name+'" is a required parameter for the "defense.'+method+'()" method.'), 500);
    this.log.fatal(error);
    if(cb) {
      cb(error);
    }
    return false;
  } else {
    return true;
  }
}


/* ************************************************** *
 * ******************** Expose the Public API
 * ************************************************** */

exports = module.exports = Cramit;
exports = Cramit;


/* ************************************************** *
 * ******************** Documentation Stubs
 * ************************************************** */

/**
 * This callback is used to return the result of a 
 * permission check request.  An error and boolean 
 * value will always be returned to this method 
 * respectively.  If an error occured, a value of false 
 * will always be returned as well.  If the assessment 
 * was successful, a value of true will indicate the 
 * user has permission to the specified action and 
 * resource(s).
 *
 * @callback canPerformActionCallback
 * @param {object|undefined} error describes the error 
 * that occurred.
 * @param {boolean} isAllowed when true indicates the 
 * user has permission to perform the action on the 
 * specified resource(s).
 */

