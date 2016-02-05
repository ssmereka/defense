/* ************************************************** *
 * ******************** Global Variables
 * ************************************************** */

var _ = require("lodash");


/* ************************************************** *
 * ******************** Constructor
 * ************************************************** */

/**
 * Constructor to setup and initialize a new Database
 * Adapter.
 *
 * @param {object|undefined} config is a database 
 * adapter configuration object.
 * @param {object|undefined} log is a bunyan instance.
 */
var DatabaseAdapter = function(config, log, error) {
  this.config = config;
  this.log = log;
  this.error = error;
};


/* ************************************************** *
 * ******************** Transaction Methods
 * ************************************************** */

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
DatabaseAdapter.prototype.startTransaction = function(type, items, options, cb) {
  cb(undefined, {});
};

/**
 * Called when any database action is finished leaving 
 * the transaction completed.  This allows the adapter 
 * to track the result or perform post tasks.
 *
 * Notice:  This method should be overridden by any 
 * classes that inherit DatabaseAdapter and require
 * transactions.
 * 
 * @param {object} transaction is the transaction object.
 * @param  {transactionCallback} is a callback method.
 */
DatabaseAdapter.prototype.endTransaction = function(transaction, cb) {
  cb(undefined, transaction);
};

/**
 * Called when any database action has failed. This 
 * allows the adapter to track the result or tasks.
 *
 * Notice:  This method should be overridden by any 
 * classes that inherit DatabaseAdapter and require
 * transactions.
 * 
 * @param {object} transaction is the transaction object.
 * @param {array|object} err is the error or errors that 
 * occurred.
 * @param  {transactionCallback} is a callback method.
 */
DatabaseAdapter.prototype.failedTransaction = function(transaction, err, cb) {
  cb(undefined, transaction);
};

DatabaseAdapter.prototype.addItem = function(schemaName, item, cb) {
  var error = this.error.build("Current database adapter has not implemented the addItem method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.addItems = function(schemaName, items, cb) {
  var error = this.error.build("Current database adapter has not implemented the addItems method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.upsertItem = function(schemaName, item, cb) {
  var error = this.error.build("Current database adapter has not implemented the upsertItem method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.upsertItems = function(schemaName, item, cb) {
  var error = this.error.build("Current database adapter has not implemented the upsertItems method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.removeItem = function(schemaName, item, cb) {
  var error = this.error.build("Current database adapter has not implemented the removeItem method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.removeItems = function(schemaName, items, cb) {
  var error = this.error.build("Current database adapter has not implemented the removeItems method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.removeItemById = function(schemaName, id, cb) {
  var error = this.error.build("Current database adapter has not implemented the removeItemById method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.removeItemsById = function(schemaName, ids, cb) {
  var error = this.error.build("Current database adapter has not implemented the removeItemsById method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.findItemById = function(schemaName, id, cb) {
  var error = this.error.build("Current database adapter has not implemented the findItemById method.", 500)
  this.log.error(error);
  cb(error);
};

DatabaseAdapter.prototype.findItemsById = function(schemaName, id, cb) {
  var error = this.error.build("Current database adapter has not implemented the findItemsById method.", 500)
  this.log.error(error);
  cb(error);
};

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
DatabaseAdapter.prototype.findItemInListById = function(list, id, cb) {
  var error = this.error.build("Current database adapter has not implemented the findItemInListById method.", 500)
  this.log.error(error);
  cb(error);
};


/* ************************************************** *
 * ******************** Database Methods
 * ************************************************** */

/**
 * Insert one or more items to the database.
 * 
 * @param {object|array} items is a single or list of 
 * objects to be added.
 * @param {object} options specifies any special requests 
 * to be made when inserting the items.
 * @param {cudCallback} is a callback method.
 */
DatabaseAdapter.prototype.add = function(items, options, cb) {
  var database = this;
  database.startTransaction('insert', items, options, function(err, transaction) {
    if(err) {
      cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: [] });
    } else {
      database.addItems(options.fixtureId, items, function(err, results) {
        if(err) {
          database.failedTransaction(transaction, err, function(transactionError, transaction) {
            if(transactionError) {
              cb([err, transactionError], { fixtureId: options.fixtureId, transaction: transaction, results: results });
            } else {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            }
          });
        } else {
          database.endTransaction(transaction, function(err, transaction) {
            if(err) {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            } else {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            }
          });
        }
      });
    }
  });
};

/**
 * Upsert one or more items to the database.
 * 
 * @param {object|array} items is a single or list of 
 * objects to be upserted.
 * @param {object} options specifies any special requests 
 * to be made when upserting the items.
 * @param {cudCallback} is a callback method.
 */
DatabaseAdapter.prototype.upsert = function(items, options, cb) {
  var database = this;
  database.startTransaction('upsert', items, options, function(err, transaction) {
    if(err) {
      cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: [] });
    } else {
      database.upsertItems(items, options.fixtureId, function(err, results) {
        if(err) {
          database.failedTransaction(transaction, err, function(transactionError, transaction) {
            if(transactionError) {
              cb([err, transactionError], { fixtureId: options.fixtureId, transaction: transaction, results: results });
            } else {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            }
          });
        } else {
          database.endTransaction(transaction, function(err, transaction) {
            if(err) {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            } else {
              cb(undefined, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            }
          });
        }
      });
    }
  });
};

/**
 * Remove one or more items from the database.
 * 
 * @param {object|array} items is a single or list of 
 * objects to be removed.
 * @param {object} options specifies any special requests 
 * to be made when removing the items.
 * @param {cudCallback} is a callback method.
 */
DatabaseAdapter.prototype.remove = function(items, options, cb) {
  var database = this;
  database.startTransaction('delete', items, options, function(err, transaction) {
    if(err) {
      cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: [] });
    } else {
      database.removeItems(items, options.fixtureId, function(err, results) {
        if(err) {
          database.failedTransaction(transaction, err, function(transactionError, transaction) {
            if(transactionError) {
              cb([err, transactionError], { fixtureId: options.fixtureId, transaction: transaction, results: results });
            } else {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            }
          });
        } else {
          database.endTransaction(transaction, function(err, transaction) {
            if(err) {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            } else {
              cb(err, { fixtureId: options.fixtureId, transaction: transaction, results: results });
            }
          });
        }
      });
    }
  });
};


/* ************************************************** *
 * ******************** Expose API
 * ************************************************** */

exports = module.exports = DatabaseAdapter;
exports = DatabaseAdapter;


/* ************************************************** *
 * ******************** Documentation Stubs
 * ************************************************** */

/**
 * A callback used when a single database transaction 
 * starts, ends, fails, searched, or modified.
 *
 * @callback transactionCallback
 * @param {object|undefined} error describes the error that 
 * occurred.
 * @param {object|undefined} transaction is the transaction 
 * that was modified or found.
 */

/**
 * A callback used when fixture data is inserted, updated, 
 * or deleted in the database.  The result data will be an 
 * array of objects.  Each object will contain a transaction
 * and result key.  The result key's value will relate to the
 * data inserted, updated, or deleted.  The transaction key's
 * data will be related to the transaction used to modify the
 * data in the database.
 *
 * @callback cudCallback
 * @param {object|undefined} error describes the error that occurred.
 * @param {array|undefined} result is a list of objects with 
 * information related to the database action.
 */