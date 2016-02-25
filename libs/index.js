/* ************************************************** *
 * ******************** Library Global Variables
 * ************************************************** */

// External Modules.
var async = require('async'),
  crave = require('crave'),
  path = require('path'),
  _ = require('lodash');

// Local paths and folders.
var databaseAdaptersFolder = path.resolve(__dirname, '.'+path.sep+'databaseAdapters') + path.sep,
    permissionTableFolder = path.resolve(__dirname, '.'+path.sep+'permissionTable') + path.sep
    logFolder = path.resolve(__dirname, '.'+path.sep+'log') + path.sep;

// Local Modules.
var Log = require(logFolder),
    PermissionTable = require(permissionTableFolder);

// Default configuration object.
var defaultConfig = {
  attributePermissionDatabase: {
    connectionUri: undefined,
    idAttributeName: undefined,
    instance: undefined,
    type: 'mongoose'
  },
  permissionTableDatabase: {
    connectionUri: undefined,
    instance: undefined,
    type: 'redis'
  },
  userModel: "user",
  userModelId: "_id",
  defaultId: "_id"
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
var Defense = function(options, log, error) {
  "use strict";

  // Auto instantiate the module when it is required.
  if(! (this instanceof Defense)) {
    return new Defense(options);
  } else {

    this.setConfig(options);
    this.setLog(log, (options) ? options.log : undefined);
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
Defense.prototype.setConfig = function(config) {
  if(config && _.isObject(config)) {
    
    if( ! this.config) {
      this.config = JSON.parse(JSON.stringify(defaultConfig));
    }

    for(var key in config) {
      switch(key) {
        case "crave":
          this.config[key] = config[key];
          break;
        default:
          for(var subObjectKey in config[key]) {
            this.config[key][subObjectKey] = config[key][subObjectKey];
          }
          break;
      }
    }
  } else {
    this.config = JSON.parse(JSON.stringify(defaultConfig));
  }

  this.setDatabaseAdapters();
};

/**
 * Set the database instance to the specified value.
 * PreCondition: Assumes setConfig has already been called at least once.
 * @param databaseInstance is the new database instance value.
 */
Defense.prototype.setPermissionTableDatabaseInstance = function(instance) {
  this.config.permissionTableDatabase.instance = instance;
  this.setDatabaseAdapters();
};

Defense.prototype.setAttributePermissionDatabaseInstance = function(instance) {
  this.config.attributePermissionDatabase.instance = instance;
  this.setDatabaseAdapters();
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
Defense.prototype.setLog = function(log, options) {
  if(log) {
    this.setLogInstance(log);
  } else {
    this.createNewLogger(options);
  }  
};

Defense.prototype.setLogInstance = function(log) {
  if(log) {
    this.log = log;
  } else {
    this.log.error("Defense.setLogInstance():  Cannot set log to an invalid instance value.");
  }  
};

Defense.prototype.createNewLogger = function(options) {
  this.Log = new Log((this.config) ? this.config.log : undefined);
  this.log = this.Log.createLogger(options);
}

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
Defense.prototype.setDatabaseAdapters = function() {
  var defense = this;

  defense.ptda = getDatabaseAdapter(defense, defense.config.permissionTableDatabase.type);
  

  if( ! defense.pt) {
    defense.pt = new PermissionTable(defense);  
  } else {
    defense.pt.setConfig(defense.config);
  }

  //defense.apda = getDatabaseAdapter(defense, defense.config.attributePermissionDatabase.type);
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
  this.pt.can(user, model, resources, this.pt.d, cb);
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
  this.pt.can(user, model, resources, this.pt.w, cb);
};

Defense.prototype.canWriteDelete = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.wd, cb);
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
  this.pt.can(user, model, resources, this.pt.r, cb);
};

Defense.prototype.canReadWrite = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.rw, cb);
};

Defense.prototype.canReadDelete = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.rd, cb);
};

Defense.prototype.canReadWriteDelete = function(user, model, resources, cb) {
  this.pt.can(user, model, resources, this.pt.rwd, cb);
};

Defense.prototype.can = function(user, model, resources, permissions, cb) {
  this.pt.can(user, model, resources, permissions, cb);
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
Defense.prototype.sanitizeRead = function(user, model, resource, cb) {
  var defense = this;

  // Check required parameters, without them calling this method would be useless.
  if( checkRequiredParameter(defense, "sanitizeRead", "callback", cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeRead", "user", user, cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeRead", "model", model, cb) != true) { return; }
  if( checkRequiredParameter(defense, "sanitizeRead", "resource", resource, cb) != true) { return; }

  // TODO: Determine if the user can read the specified resource.
  
  // TODO: Sanitize the array or object.

  cb(undefined, resource);
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
}

var getDatabaseAdapter = function(defense, databaseType) {
  databaseType = (databaseType) ? databaseType.toLowerCase() : "";
  switch(databaseType) {
    case 'mongoose':
    case 'redis':
      if( ! defense.RedisAdapter) {
        defense[databaseType + "Adapter"] = require(databaseAdaptersFolder + databaseType +'.js');
      }
      return defense[databaseType + "Adapter"](defense);
    default:
      defense.log.fatal("Defense.getDatabaseAdapter():  Invalid and unsupported database adapter type.");
      return undefined;
  }
}


/* ************************************************** *
 * ******************** Expose the Public API
 * ************************************************** */

exports = module.exports = Defense;
exports = Defense;


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

/**
 * This callback is used to return the sanitized array 
 * or object.  An error and result value will always be 
 * returned to this method respectively.  If an error 
 * occured, an empty array or empty object will always 
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

