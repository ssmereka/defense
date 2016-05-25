/* ************************************************** *
 * ******************** Library Global Variables
 * ************************************************** */

// External Modules.
var EventEmitter = require('events'),
    path = require('path'),
    util = require('util'),
    _ = require('lodash');

// Local paths and folders.
var assertionFolder = path.resolve(__dirname, '.'+path.sep+'assertion') + path.sep,
    attributePermissionFolder = path.resolve(__dirname, '.'+path.sep+'attributePermission') + path.sep,
    configFolder = path.resolve(__dirname, ".."+path.sep+"config" + path.sep),
    defaultConfigObject = require(configFolder + path.sep + "default.json"),
    databaseAdaptersFolder = path.resolve(__dirname, '.'+path.sep+'databaseAdapters') + path.sep,
    permissionTableFolder = path.resolve(__dirname, '.'+path.sep+'permissionTable') + path.sep,
    logFolder = path.resolve(__dirname, '.'+path.sep+'log') + path.sep;

// Local Modules.
var Assertion = require(assertionFolder),
    AttributePermission = require(attributePermissionFolder),
    Log = require(logFolder),
    PermissionTable = require(permissionTableFolder);


/* ************************************************** *
 * ******************** Constructor
 * ************************************************** */

/**
 * Create and setup a new Defense instance.
 *
 * @param {object|undefined} options is a Defense configuration object.
 * @param {object|undefined} log is a bunyan instance.
 * @returns {object} the new or current Defense instance.
 * @constructor
 */
var Defense = function(options, log) {
  "use strict";

  // Auto instantiate the module when it is required.
  if(! (this instanceof Defense)) {
    return new Defense(options, log);
  } else {
    setConfig(this, options);
    this.setLog(log, (options) ? options.log : this.config.log);

    // Display logs from config initialization.
    this.log.trace("Loaded config with root folder %s", process.env.NODE_CONFIG_DIR);

    setEventHandlers(this);
    setDatabaseAdapters(this);

    return this;
  }
};

util.inherits(Defense, EventEmitter);


/* ************************************************** *
 * ******************** Initialize and Set Methods
 * ************************************************** */

/**
 * Initialize the configuration object to the default
 * values, overriding values that are specified in the
 * options argument.
 *
 * @param {object} defense is an instance of defense.
 * @param {object|undefined} options is an object that
 * contains config values to be overridden.
 * @return {object} the defense instance.
 */
var setConfig = function(defense, options) {
  if(process.env.NODE_CONFIG_DIR === undefined) {
    process.env.NODE_CONFIG_DIR = configFolder;
  }

  // So applications don't get a "No config files"
  // warning if they aren't using node-config.
  process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

  // Once this is called the config object returned in immutable.
  var config = require('config');

  // Override default config with options.
  if(options && _.isObject(options)) {
    config.util.extendDeep(defaultConfigObject, options);
    config.util.setModuleDefaults('Defense', defaultConfigObject);
  }

  // Once GET is called, the config object is now immutable.
  config.get('defaultId');

  defense.config = config;

  return defense;
};

/**
 * Add and configure the database adapters to manage
 * the permission database records.
 *
 * @param {undefined|object} defense is a defense instance.
 * @return {object} the defense instance.
 */
var setDatabaseAdapters = function(defense) {

  defense.ptda = getDatabaseAdapter(defense, defense.config.get('permissionTableDatabase.type'));
  defense.apda = getDatabaseAdapter(defense, defense.config.get('attributePermissionDatabase.type'));
  defense.Assertion = Assertion();

  if( ! defense.pt) {
    defense.pt = new PermissionTable(defense);
    defense.ap = new AttributePermission(defense);
  } else {
    defense.pt.setConfig(defense.config);
  }

  //defense.apda = getDatabaseAdapter(defense, defense.config.attributePermissionDatabase.type);
  return defense;
};

/**
 * Creates a database adapter instance of the specified type.
 *
 * @param {object} defense is a defense instance.
 * @param {string} databaseType is the database adapter type to create.
 * @returns {object|undefined} the specified database adapter instance.
 */
var getDatabaseAdapter = function(defense, databaseType) {
  databaseType = (databaseType) ? databaseType.toLowerCase() : "";
  switch(databaseType) {
    case 'mongoose':
    case 'redis':
      if( ! defense[databaseType + "Adapter"]) {
        defense[databaseType + "Adapter"] = require(databaseAdaptersFolder + databaseType +'.js');
      }
      return defense[databaseType + "Adapter"](defense);
    default:
      defense.emit('error', "Defense.getDatabaseAdapter():  Unsupported database adapter type \"" + databaseType + "\"");
      return undefined;
  }
};

/**
 * Creates an event emitter and adds listeners for the
 * defense instance.
 *
 * @param {undefined|object} defense is a defense instance.
 * @return {object} the defense instance.
 */
var setEventHandlers = function(defense) {
  EventEmitter.call(defense);

  defense.on('error', function(err) {
    defense.log.error(err);
  });

  defense.on('newListener', function(eventName, eventMethod) {
    defense.log.trace("New listener for event %s", eventName)
  });
};

/**
 * A method used to aid in the creation of a class
 * that will inherit another class.  Used to generate
 * the proper prototype object that will be used
 * by the child class.
 */
Defense.prototype.inherit = function(proto) {
  function F() {}
  F.prototype = proto;
  return new F;
};


/* ************************************************** *
 * ******************** Public API
 * ************************************************** */

/**
 * Set or create a new bunyan log instance.
 *
 * @param {object|undefined} log is a bunyan instance.
 * @param {object|undefined} options is a bunyan
 * configuration object.
 */
Defense.prototype.setLog = function(log, options) {
  if(log) {
    this.log = log;
  } else {
    var LogModule = new Log();
    this.log = LogModule.createLogger(options);
  }
};

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
  this.pt.can(user, model, resources, this.pt.d, true, cb);
};

/**
 * Check if a user has permissions to update or create 
 * a given resource or group of resources. If the user 
 * is denied access to a single item in a group of 
 * resources a value of denied will be returned. When 
 * checking permissions for objects each attribute will 
 * be evaluated for user permissions. If a single 
 * attribute fails the permission test, a result of 
 * denied will be returned. Permission to an entire 
 * database record type can be evaluated by passing a 
 * value of undefined as the Resource value.
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
Defense.prototype.canWrite = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.w, true, cb);
};

Defense.prototype.canWriteDelete = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.wd, true, cb);
};

/**
 * Check if a user has permissions to read a given 
 * resource or group of resources. If the user is 
 * denied access to a single item in a group of 
 * resources a value of denied will be returned. When 
 * checking permissions for objects each attribute 
 * will be evaluated for user permissions. If a single 
 * attribute fails the permission test, a result of 
 * denied will be returned. Permission to an entire 
 * database record type can be evaluated by passing a 
 * value of undefined as the Resource value.
 * 
 * @param {object} user is a user database record, 
 * typically pulled from the current session.
 * @param {string} model is the type of database record 
 * to check permissions against. Should be the same 
 * type as the Resource provided.
 * @param {array|object|string|undefined} resources is a 
 * list of database records, a single database record, 
 * a single database record's unique identifier, or 
 * undefined respectively.
 * @param {canPerformActionCallback} cb is a callback 
 * method.
 */
Defense.prototype.canRead = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.r, true, cb);
};

Defense.prototype.canReadWrite = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.rw, true, cb);
};

Defense.prototype.canReadDelete = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.rd, true, cb);
};

Defense.prototype.canReadWriteDelete = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.rwd, true, cb);
};

Defense.prototype.can = function(user, model, resources, permissions, cb) {
  this.pt.can(user, model, resources, permissions, true, cb);
};

/**
 * Checks if a user can read a given resource or group 
 * of resources. All resources that the user does not 
 * have permission to read are removed from the 
 * returned resource list. Attribute permissions for 
 * the remaining resources are evaluated, removing 
 * attributes that are not accessible for the user. A 
 * single object or list of objects are returned 
 * respective to the Resource parameter type used. For 
 * example, if an array is passed to the Resource 
 * parameter, then an array will always be returned.
 *
 * Note: A pure javascript object or list of objects 
 * will be returned. This is due to a limitation 
 * presented with some database objects (such as 
 * MongoDB) where attributes cannot be removed. Instead 
 * we copy the object removing all attached methods.
 * 
 * @param {object} user is a user database record, 
 * typically pulled from the current session.
 * @param {string} model is the type of database record 
 * to check permissions against. Should be the same 
 * type as the Resource provided.
 * @param {array|object} A list of database records or a 
 * single database record respectively.
 * @param {canPerformActionAndSanitizeCallback} cb is a 
 * callback method.
 */
Defense.prototype.sanitizeRead = function(user, model, resources, cb) {
  var defense = this;

  // Check required parameters, without them calling this method would be useless.
  if( checkRequiredParameter(defense, "sanitizeRead", "callback", cb) != true) { return; }

  this.pt.can(user, model, resources, this.pt.r, false, function(err, isAllowed, results) {
    if(err) {
      return cb(err);
    } 

    var allowedResources = [];
    if( ! isAllowed) {
      if( ! _.isArray(resources)) {
        if(results[0] == false) {
          return cb();
        } else {
          allowedResources = [ resources ];
        }
      } else {
        for(var i = 0; i < results.length; i++) {
          if(results[i] == true) {
            allowedResources.push(resources[i]);
          }
        }
      }
    }

    // TODO: Sanitize the resource objects.
    cb(undefined, resources);
  });

  // TODO: Determine if the user can read the specified resource.
  
  // TODO: Sanitize the array or object.
};

/**
 * Checks if a user can read and write to a given 
 * resource or group of resources. All resources that 
 * the user does not have permission to read and write 
 * to are removed from the returned resource list. 
 * Attribute permissions for the remaining resources are 
 * evaluated, removing attributes that are not 
 * accessible for the user. A single object or list of 
 * objects are returned respective to the Resource 
 * parameter type used. For example, if an array is 
 * passed to the Resource parameter, then an array will 
 * always be returned.
 *
 * Note: A pure javascript object or list of objects 
 * will be returned. This is due to a limitation 
 * presented with some database objects (such as 
 * MongoDB) where attributes cannot be removed. Instead 
 * we copy the object removing all attached methods.
 * 
 * @param {object} user is a user database record, 
 * typically pulled from the current session.
 * @param {string} model is the type of database record 
 * to check permissions against. Should be the same 
 * type as the Resource provided.
 * @param {array|object} A list of database records or a 
 * single database record respectively.
 * @param {canPerformActionAndSanitizeCallback} cb is a 
 * callback method.
 */
Defense.prototype.sanitizeReadWrite = function(user, model, resource, cb) {
  var defense = this;

  // Check required parameters, without them calling this method would be useless.
  if( checkRequiredParameter(defense, "sanitizeReadWrite", "callback", cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeReadWrite", "user", user, cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeReadWrite", "model", model, cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeReadWrite", "resource", resource, cb) != true) { return; }

  // TODO: Determine if the user can read and write to the specified resource.
  
  // TODO: Sanitize the array or object.

  cb(undefined, resource);
};

/**
 * Checks if a user can write to a given resource or 
 * group of resources. All resources that the user does 
 * not have permission to write to are removed from the 
 * returned resource list. Attribute permissions for 
 * the remaining resources are evaluated, removing 
 * attributes that are not accessible for the user. A 
 * single object or list of objects are returned 
 * respective to the Resource parameter type used. For 
 * example, if an array is passed to the Resource 
 * parameter, then an array will always be returned.
 *
 * Note: A pure javascript object or list of objects 
 * will be returned. This is due to a limitation 
 * presented with some database objects (such as 
 * MongoDB) where attributes cannot be removed. Instead 
 * we copy the object removing all attached methods.
 * 
 * @param {object} user is a user database record, 
 * typically pulled from the current session.
 * @param {string} model is the type of database record 
 * to check permissions against. Should be the same 
 * type as the Resource provided.
 * @param {array|object} A list of database records or a 
 * single database record respectively.
 * @param {canPerformActionAndSanitizeCallback} cb is a 
 * callback method.
 */
Defense.prototype.sanitizeWrite = function(user, model, resource, cb) {
  var defense = this;

  // Check required parameters, without them calling this method would be useless.
  if( checkRequiredParameter(defense, "sanitizeWrite", "callback", cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeWrite", "user", user, cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeWrite", "model", model, cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeWrite", "resource", resource, cb) != true) { return; }

  // TODO: Determine if the user can write the specified resource.
  
  // TODO: Sanitize the array or object.

  cb(undefined, resource);
};


/* ************************************************** *
 * ******************** Private Methods
 * ************************************************** */

/**
 * Checks if the specified parameter is defined, 
 * generating an error if it is not.  The error is 
 * returned to the callback method, if provided, and 
 * logged as a fatal error.
 * @param {Object} defense is the module's instance. 
 * @param {String} method is the method's name who was 
 * expecting the parameter to be defined.
 * @param {String} name is the name of the parameter.
 * @param {*} parameter is the parameter's value.
 * @param {canPerformActionCallback} cb is a callback 
 * method.
 * @return {Boolean} true is returned if the parameter 
 * is defined, false otherwise.
 */
var checkRequiredParameter = function(defense, method, name, parameter, cb) {
  if( ! parameter) {
    var error = defense.build.error('The parameter "'+name+'" is a required parameter for the "defense.'+method+'()" method.', 500);
    this.log.fatal(error);
    if(cb) {
      cb(error);
    }
    return false;
  } else {
    return true;
  }
};


/* ************************************************** *
 * ******************** Expose the Public API
 * ************************************************** */

module.exports = Defense;


/* ************************************************** *
 * ******************** Documentation Stubs
 * ************************************************** */

/**
 * This callback is used to return the result of a 
 * permission check request.  An error and boolean 
 * value will always be returned to this method 
 * respectively.  If an error occurred, a value of false
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

/**
 * This callback is used to return the sanitized array 
 * or object.  An error and result value will always be 
 * returned to this method respectively.  If an error 
 * occurred, an empty array or empty object will always
 * be returned as well.  If the operation was 
 * successful, an sanitized array or object will be 
 * returned matching the object type of the original 
 * data's type.
 *
 * @callback canPerformActionAndSanitizeCallback
 * @param {object|undefined} error describes the error 
 * that occurred.
 * @param {Array|Object} sanitizedData is the sanizited 
 * array or object.
 */

