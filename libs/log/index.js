var bunyan = require('bunyan');
var PrettySteam = require('bunyan-pretty-stream');


/* ************************************************** *
 * ******************** Constructor
 * ************************************************** */

var Log = function() {
  
};

Log.prototype.createLogger = function(options) {
  if ( ! options) {
    options = {};
  }

  if( ! options.bunyanInstance) {
    if ( ! options.createLoggerConfig) {
      options.createLoggerConfig = {
        name: "defense",
        serializers: bunyan.stdSerializers,
        streams: [
          {
            level: 'info',
            stream: new PrettySteam()
          }
        ]
      }
    }

    options.bunyanInstance = bunyan.createLogger(options.createLoggerConfig)
  }

  return options.bunyanInstance.child({ widget_type: 'defense' });
}


/* ************************************************** *
 * ******************** Exports
 * ************************************************** */

exports = module.exports = Log;
exports = Log;

