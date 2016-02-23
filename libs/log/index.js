var bunyan = require('bunyan');
var PrettyStream = require('bunyan-pretty-stream');


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
      //var prettyStdOut = new PrettySteam();
      //prettyStdOut.pipe(process.stdout);

      options.createLoggerConfig = {
        name: "defense",
        serializers: bunyan.stdSerializers,
        streams: [
          {
            level: 'trace',
            //type: 'raw',
            stream: new PrettyStream() // prettyStdOut //process.stdout//new PrettySteam()
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

