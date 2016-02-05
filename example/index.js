var defense = require('../libs/index.js')(),
    express = require('express'),
    path = require('path');

var config = {
  //
  // Server configs can be placed here.
  // 
};

//defense.setConfig({});

// Create an express application object.
var app = express();


var api = express.Router();

api.route('/', function(req, res, next) {
  next();
});

app.use('/api/:version/', api);

defense.canRead({}, "User", undefined, function(err, isAllowed) {
  if(err) {
    console.log(err);
  }

  console.log("Is Allowed: " + isAllowed);
});



// Method to connect to database and start the server.
var startServer = function() {
  var server = app.listen(3000, function() {
    var serverInfo = this.address();
    var address = (serverInfo.address === "::") ? "localhost" : serverInfo.address;
    
    console.log("Listening on http://%s:%s", address, serverInfo.port);
  });
};


startServer();