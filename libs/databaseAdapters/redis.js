module.exports = function(lib) {


  /* ************************************************** *
   * ******************** Global Variables
   * ************************************************** */

  var async = require('async'),
    path = require('path'),
    _ = require('lodash');

  var DatabaseAdapter = require(path.resolve(__dirname, '.'+path.sep+'index.js'));


  /* ************************************************** *
   * ******************** Constructor & Inherit
   * ************************************************** */

  /**
   * Initializes a new Redis adapter and configures the
   * parent database adapter class.
   */
  function RedisAdapter(instance) {
    //this.idAttributeName = lib.config.database.idAttributeName || '_id';

    if( ! instance) {
      var redis = require('redis');
      this.db = redis.createClient(lib.config.redis);
    } else {
      this.db = instance
    }
    
    DatabaseAdapter.call(this, lib.config, lib.log);
  }

  // Inherits the DatabaseAdapter parent class's methods and variables.
  RedisAdapter.prototype = lib.inherit(DatabaseAdapter.prototype);


  /* ************************************************** *
   * ******************** Transaction Methods
   * ************************************************** */

  RedisAdapter.prototype.createTransactionEventMethod = function(transaction, cb) {
    var adapter = this;
    return function(err) {
      if(err) {
        adapter.log.error(err);
      }

      if(cb) {
        cb(err, transaction || {});
      }
    }
  };

  /**
   * Called before any database action is taken.  Allows
   * the adapter to track actions or pre-perform tasks.
   *
   * Notice:  This method should be overridden by any 
   * classes that inherit DatabaseAdapter and require
   * transactions.
   * 
   * @param {string} type is the type of transaction.
   * @param {object|array} items is the object or list 
   * of objects to be modified or queried.
   * @param {object} options is any additional settings 
   * included with the database operation.
   * @param  {transactionCallback} is a callback method.
   */
  RedisAdapter.prototype.startTransaction = function(type, items, options, cb) {
    var adapter = this,
      transaction = {};

    if( ! adapter.db) {
      cb(lib.error.build('RedisAdapter.startTransaction():  Database "Redis" was never initalized.', 500));
    } //else if( ! adapter.mongoose.connection) {
      //cb(lib.error.build('RedisAdapter.startTransaction():  Redis connection was never initalized.', 500));
    //} else if(adapter.mongoose.connection.readyState !== 1){
      //console.log(adapter.mongoose.connection.readyState);
      //console.log("MongooseAdapter.startTransaction():  Mongoose not connected.");
      
      // Make sure the connection URI is specified.
      //if( ! lib.config.database.connectionUri) {
      //  lib.config.database.connectionUri = 'mongodb://localhost/lib';
      //  lib.log.warn('Database not connected and the Mongoose connection URI is not specified, defaulting to %s', lib.config.database.connectionUri)
      //}

      // Handle when mongoose connects and/or errors.
      //adapter.mongoose.connection.on('error', adapter.createMongooseTransactionEventMethod(transaction, cb));
      //adapter.mongoose.connection.once('connected', adapter.createMongooseTransactionEventMethod(transaction, cb)); 
      
      // Start connecting to the database.
      //adapter.mongoose.connect(lib.config.database.connectionUri || 'mongodb://localhost/lib');
    //}
     else {
      cb(undefined, transaction);
    }
  };


  /* ************************************************** *
   * ******************** Public Adapter Methods
   * ************************************************** */

  /**
   * Adds an item to the specified document.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be stored.
   * @param {object} item is the data to add to the database.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.addItem = function(schemaName, item, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The item should always be an object.
    if( ! item || ! _.isObject(item)) {
      cb(lib.error.build("RedisAdapter.addItem():  Item parameter must be an object with at least one key/value pair.", 500));
    } else {

      if( ! schemaName) {
        var key = Object.keys(item)[0];
        adapter.db.set(key, item[key], function(err, newItem) {
          if(err) {
            cb(err);
          } else {
            lib.log.trace("Added %s to redis database.", JSON.stringify(item));
            cb(undefined, newItem);
          }
        });
      } else {
        adapter.db.hmset(schemaName, item, function(err, newItem) {
          if(err) {
            cb(err);
          } else {
            lib.log.trace("Added %s for schema %s to redis database", json.stringify(newItem), schemaName);
            cb(undefined, newItem);
          }
        });
      }
    }
  };

  /**
   * Adds multiple items to the specified document.
   *
   * For the items parameter you can pass a single item
   * object.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be stored.
   * @param {array} items is the list of items to add to
   * the database.
   * @param {cudMultipleItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.addItems = function(schemaName, items, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // Make sure the items parameter is an array.
    if( ! _.isArray(items)) {
      items = [items];
    }

    var tasks = [];
    for(var i = 0; i < items.length; i++) {
      tasks.push(adapter.createAddItemMethod(schemaName, items[i]));
    }

    async.parallel(tasks, cb);
  };



  RedisAdapter.prototype.findItemsById = function(schemaName, ids, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // Make sure the ids parameter is an array.
    if( ! _.isArray(ids)) {
      ids = [ids];
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      adapter.db.mget(ids, function(err, items) {
        if(err) {
          cb(err);
        } else if (items === undefined || items === null) {
          lib.log.trace("RedisAdapter.findItemsById():  Key %s was not found.", ids);
          cb();
        } else {
          cb(undefined, items);
        }
      });
    } else {
      adapter.db.hmget(schemaName, ids.join(" "), function(err, items) {
        if (err) {
          cb(err);
        } else if (items === undefined || items === null) {
          lib.log.trace("RedisAdapter.findItemsById():  Schema %s with id %s was not found.", schemaName, ids);
          cb();
        } else {
          cb(undefined, items);
        }
      });
    }
  }

  /**
   * Find an item by ID in the specified document.
   *
   * Specify the ID attribute name using the class's 
   * "idAttributeName" value.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information is stored.
   * @param {string} id is the data's unique identifier.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.findItemById = function(schemaName, id, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The ID should always be a valid string.
    if( ! id || ! _.isString(id)) {
      return cb(lib.error.build('RedisAdapter.findItemById():  Cannot find an item with an invalid ID.'));
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      adapter.db.get(id, function(err, item) {
        if(err) {
          cb(err);
        } else if (item === undefined || item === null) {
          lib.log.trace("RedisAdapter.findItemById():  Key %s was not found.", id);
          cb();
        } else {
          cb(undefined, item);
        }
      });
    } else {
      adapter.db.hmget(schemaName, id, function(err, item) {
        if (err) {
          cb(err);
        } else if (item === undefined || item === null) {
          lib.log.trace("RedisAdapter.findItemById():  Schema %s with id %s was not found.", schemaName, id);
          cb();
        } else {
          cb(undefined, item);
        }
      });
    }
  }

  /**
   * Find an item by ID and remove it from the specified 
   * document.
   *
   * Specify the ID attribute name using the class's 
   * "idAttributeName" value.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information is stored.
   * @param {string} id is the data's unique identifier.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.removeItemById = function(schemaName, id, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The ID should always be a valid string.
    if( ! id || ! _.isString(id)) {
      return cb(lib.error.build('RedisAdapter.findById():  Cannot find an item with an invalid ID.'));
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      adapter.db.del(id, function(err, result) {
        if(err) {
          cb(err);
        } else if( ! result) {
          lib.log.trace("Already removed '%s' from the redis database.", id);
          cb();
        } else {
          lib.log.trace("Removed '%s' from the redis database.", id);
          cb(undefined, id);
        }
      });
    } else {
      adapter.db.hdel(schemaName, id, function(err, result) {
        if(err) {
          cb(err);
        } else if( ! result) {
          lib.log.trace("Already removed '%s' from the redis database.", id);
          cb();
        } else {
          lib.log.trace("Removed '%s' fromt he redis database.", id);
          cb(undefined, id);
        }
      });
    }
  };

  /**
   * Find items by ID and remove them from the specified 
   * document.
   *
   * Specify the ID attribute name using the class's 
   * "idAttributeName" value.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information is stored.
   * @param {string} ids is a list of the data's unique 
   * identifiers.
   * @param {cudMultipleItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.removeItemsById = function(schemaName, ids, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // Make sure the ids parameter is an array.
    if( ! _.isArray(ids)) {
      ids = [ids];
    }

    var tasks = [];
    for(var i = 0; i < ids.length; i++) {
      tasks.push(adapter.createRemoveItemByIdMethod(schemaName, ids[i]));
    }

    async.parallel(tasks, cb);
  };

  /**
   * Find an item and remove it from the specified 
   * document.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information is stored.
   * @param {string} item is the item to remove from the 
   * document.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.removeItem = function(schemaName, item, cb) {
    adapter.removeItemById(schemaName, item, cb);
  };

  /**
   * Find items and remove them from the specified document.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information is stored.
   * @param {string} items is a list of items to remove from
   * the database.
   * @param {cudMultipleItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.removeItems = function(schemaName, items, cb) {
    this.removeItemsById(schemaName, items, cb);
  };

  /**
   * Upsert an item in the specified document.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be added or updated.
   * @param {object} item is the data to upsert in the database.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.upsertItem = function(schemaName, item, cb) {
    this.addItem(schemaName, item, cb);
  };

  /**
   * Upserts multiple items in the specified document.
   *
   * For the items parameter you can pass a single item
   * object.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be added or updated.
   * @param {array} items is the list of items to upsert
   * in the database.
   * @param {cudMultipleItemCallback} cb is a callback method.
   */
  RedisAdapter.prototype.upsertItems = function(items, schemaName, cb) {
    this.addItems(schemaName, item, cb);
  };


  /* ************************************************** *
   * ******************** Private Methods
   * ************************************************** */

  /**
   * Create an asynchronous method to upsert an item into 
   * the specified document.
   *
   * Upsert refers to inserting the new data or 
   * updating the existing data.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be added or updated.
   * @param {object} item is the data to upsert in the 
   * database.
   * @return {asyncFunction} the described method.
   */
  RedisAdapter.prototype.createUpsertItemMethod = function(schemaName, item) {
    var adapter = this;

    return function(cb) { 
      adapter.upsertItem(schemaName, item, cb);
    }
  };

  /**
   * Create an asynchronous method to add an item into 
   * the specified document.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be added.
   * @param {object} item is the data to add in to the 
   * database.
   * @return {asyncFunction} the described method.
   */
  RedisAdapter.prototype.createAddItemMethod = function(schemaName, item) {
    var adapter = this;

    return function(cb) { 
      adapter.addItem(schemaName, item, cb);
    }
  };

  /**
   * Create an asynchronous method to find an item by 
   * ID and remove it from the specified document.
   *
   * Specify the ID attribute name using the class's 
   * "idAttributeName" value.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be removed from.
   * @param {object} id is the data's unique identifier.
   * @return {asyncFunction} the described method.
   */
  RedisAdapter.prototype.createRemoveItemByIdMethod = function(schemaName, id) {
    var adapter = this;

    return function(cb) { 
      adapter.removeItemById(schemaName, id, cb);
    }
  };


  /* ************************************************** *
   * ******************** Export and Initalize
   * ************************************************** */

  return new RedisAdapter();

};


/* ************************************************** *
 * ******************** Documentation Stubs
 * ************************************************** */

/**
 * A callback used when fixture data is queried, inserted, 
 * updated, or deleted in the database.  The result data 
 * will be the modified object.
 *
 * @callback crudOneItemCallback
 * @param {object|undefined} error describes the error that 
 * occurred.
 * @param {array|undefined} result is the modified object.
 */

/**
 * A callback used when fixture data is inserted, updated, 
 * or deleted in the database.  The result data will be an 
 * array of the modified objects.
 *
 * @callback cudMultipleItemCallback
 * @param {object|undefined} error describes the error that occurred.
 * @param {array|undefined} result is a list of modified objects.
 */

/**
 * An asynchronous function that accepts only a callback as the parameter.
 * All results will be passed to the callback with the first parameter
 * being an error.
 *
 * @callback asyncFunction
 * @param {function} cb is a callback method.
 */
