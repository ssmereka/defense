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
   * Initalizes a new Mongoose Adapter and configures the
   * parent Database Adapter class.
   */
  function MongooseAdapter() {
    this.idAttributeName = lib.config.database.idAttributeName || '_id';

    if( ! lib.config.database.instance) {
      this.mongoose = require('mongoose');
    } else {
      this.mongoose = lib.config.database.instance;
    }
    
    DatabaseAdapter.call(this, lib.config, lib.log);
  }

  // Inherits the DatabaseAdapter parent class's methods and variables.
  MongooseAdapter.prototype = lib.inherit(DatabaseAdapter.prototype);


  /* ************************************************** *
   * ******************** Transaction Methods
   * ************************************************** */

  MongooseAdapter.prototype.createMongooseTransactionEventMethod = function(transaction, cb) {
    var adapter = this;
    return function(err) {
      if(err) {
        adapter.log.error(err);
      }

      if(cb) {
        cb(err, transaction || {});
      }
    }
  }

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
  MongooseAdapter.prototype.startTransaction = function(type, items, options, cb) {
    var adapter = this,
      transaction = {};

    if( ! adapter.mongoose) {
      cb(lib.error.build('MongooseAdapter.startTransaction():  Database "Mongoose" was never initalized.', 500));
    } else if( ! adapter.mongoose.connection) {
      cb(lib.error.build('MongooseAdapter.startTransaction():  Mongoose connection was never initalized.', 500));
    } else if(adapter.mongoose.connection.readyState !== 1){
      //console.log(adapter.mongoose.connection.readyState);
      //console.log("MongooseAdapter.startTransaction():  Mongoose not connected.");
      
      // Make sure the connection URI is specified.
      if( ! lib.config.database.connectionUri) {
        lib.config.database.connectionUri = 'mongodb://localhost/lib';
        lib.log.warn('Database not connected and the Mongoose connection URI is not specified, defaulting to %s', lib.config.database.connectionUri)
      }

      // Handle when mongoose connects and/or errors.
      adapter.mongoose.connection.on('error', adapter.createMongooseTransactionEventMethod(transaction, cb));
      adapter.mongoose.connection.once('connected', adapter.createMongooseTransactionEventMethod(transaction, cb)); 
      
      // Start connecting to the database.
      adapter.mongoose.connect(lib.config.database.connectionUri || 'mongodb://localhost/lib');
    } else {
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
  MongooseAdapter.prototype.addItem = function(schemaName, item, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.addItem():  Cannot add item to an undefined schema.'));
    }

    // The item should always be an object.
    if( ! item || ! _.isObject(item)) {
      item = {};
    }

    var Model = adapter.mongoose.model(schemaName);    
    new Model(item).save(function(err, newItem) {
      if(err) {
        cb(err);
      } else {
        lib.log.trace("Added %s with id.", schemaName, newItem[adapter.idAttributeName]);
        cb(undefined, newItem);
      }
    });
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
  MongooseAdapter.prototype.addItems = function(items, schemaName, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.addItems():  Cannot add items to an undefined schema.'));
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
  MongooseAdapter.prototype.findItemById = function(schemaName, id, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.findById():  Cannot find an item from an undefined schema.'));
    }

    // The ID should always be a valid string.
    if( ! id || ! _.isString(id)) {
      return cb(lib.error.build('MongooseAdapter.findById():  Cannot find an item with an invalid ID.'));
    }

    var Schema = adapter.mongoose.model(schemaName),
      query = {};

    query[adapter.idAttributeName] = id;

    Schema.findOne(query, function (err, data) {
      if (err) {
        cb(err);
      } else if (data === undefined || data === null) {
        lib.log.trace("Schema %s with item id %s was not found.", schemaName, id);
        cb();
      } else {
        cb(undefined, data);
      }
    });
  }

  MongooseAdapter.prototype.findItem = function(schemaName, query, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.findItems():  Cannot find items using an undefined schema.'));
    }

    var Schema = adapter.mongoose.model(schemaName);

    Schema.findOne(query, function (err, data) {
      if (err) {
        cb(err);
      } else if (data === undefined || data === null) {
        lib.log.trace("Schema %s with item query %s was not found.", schemaName, JSON.stringify(query));
        cb();
      } else {
        cb(undefined, data);
      }
    });
  }


  /**
   * Find an item by ID in a list of items.
   *
   * Specify the ID attribute name using the class's 
   * "idAttributeName" value.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information is stored.
   * @param {string} id is the data's unique identifier.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  MongooseAdapter.prototype.findItemInListById = function(list, id, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.findById():  Cannot find an item from an undefined schema.'));
    }

    // The ID should always be a valid string.
    if( ! id || ! _.isString(id)) {
      return cb(lib.error.build('MongooseAdapter.findById():  Cannot find an item with an invalid ID.'));
    }

    var Schema = adapter.mongoose.model(schemaName),
      query = {};

    query[adapter.idAttributeName] = id;

    Schema.findOne(query, function (err, data) {
      if (err) {
        cb(err);
      } else if (data === undefined || data === null) {
        lib.log.trace("Schema %s with item id %s was not found.", schemaName, id);
        cb();
      } else {
        cb(undefined, data);
      }
    });
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
  MongooseAdapter.prototype.removeItemById = function(schemaName, id, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    adapter.findItemById(schemaName, id, function(err, item){
      if(err) {
        cb(err);
      } else if( ! item) {
        lib.log.trace("Schema %s with item id %s already removed.", schemaName, id);
        cb();
      } else {
        item.remove(function(err, removedItem) {
          if(err) {
            cb(err);
          } else {
            lib.log.trace("Schema %s with item id %s removed.", schemaName, item[adapter.idAttributeName]);
            cb(undefined, removedItem);
          }
        });
      }
    });
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
  MongooseAdapter.prototype.removeItemsById = function(schemaName, ids, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.removeItemsById():  Cannot remove items from an undefined schema.'));
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
  MongooseAdapter.prototype.removeItem = function(schemaName, item, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! item || ! _.isObject(item)) {
      item = {};
    }

    adapter.removeItemById(schemaName, item[adapter.idAttributeName], cb);
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
  MongooseAdapter.prototype.removeItems = function(items, schemaName, cb) {
    if( ! _.isArray(items)) {
      items = [ items ];
    }

    var ids = [];
    for(var i = 0; i < items.length; i++) {
      ids.push(items[i][this.idAttributeName]);
    }

    this.removeItemsById(schemaName, ids, cb);
  };

  /**
   * Upsert an item in the specified document.
   *
   * @param {string} schemaName is the data's schema name 
   * where the information will be added or updated.
   * @param {object} item is the data to upsert in the database.
   * @param {crudOneItemCallback} cb is a callback method.
   */
  MongooseAdapter.prototype.upsertItem = function(schemaName, item, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.upsertItem():  Cannot upsert item to an undefined schema.'));
    }

    // The item should always be an object.
    if( ! item || ! _.isObject(item)) {
      item = {};
    }

    var Model = adapter.mongoose.model(schemaName),
      query = {};
    
    query[adapter.idAttributeName] = item[adapter.idAttributeName];
    delete item[adapter.idAttributeName];
    
    Model.findOneAndUpdate(query, item, { 'new': true, 'upsert': true }, function(err, newItem) {
      if(err) {
        cb(err);
      } else {
        adapter.log.trace("Upsert %s with id.", schemaName, newItem._id);
        cb(undefined, newItem);
      }
    });
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
  MongooseAdapter.prototype.upsertItems = function(items, schemaName, cb) {
    var adapter = this;

    // Make sure the callback is defined and displays errors
    if( ! cb) {
      cb = function(err) { if(err) { lib.log.error(err); } };
    }

    // The schema needs to be defined.
    if( ! schemaName) {
      return cb(lib.error.build('MongooseAdapter.upsertItems():  Cannot upsert items to an undefined schema.'));
    }

    // Make sure the items parameter is an array.
    if(!_.isArray(items)) {
      items = [items];
    }

    var tasks = [];
    for(var i = 0; i < items.length; i++) {
      tasks.push(adapter.createUpsertItemMethod(schemaName, items[i]));
    }

    async.parallel(tasks, cb);
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
  MongooseAdapter.prototype.createUpsertItemMethod = function(schemaName, item) {
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
  MongooseAdapter.prototype.createAddItemMethod = function(schemaName, item) {
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
  MongooseAdapter.prototype.createRemoveItemByIdMethod = function(schemaName, id) {
    var adapter = this;

    return function(cb) { 
      adapter.removeItemById(schemaName, id, cb);
    }
  };


  /* ************************************************** *
   * ******************** Export and Initalize
   * ************************************************** */

  return new MongooseAdapter();

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
