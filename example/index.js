var defense = require('../libs/index.js')(),
    Assertion = defense.Assertion,
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

defense.on('error', function(err) {
  // Handle errors here.
});


//console.log(Assertion);
var assertions = [];
assertions.push(new Assertion().give('User', '1').permission('read', 'write').entity('User'));
assertions.push(new Assertion().give('User', '2').permission('delete').entity('Product', '2'));
assertions.push(new Assertion().give('User', '3').permission(6).entity('Product', '3'));
assertions.push(new Assertion().give('User'));
assertions.push(new Assertion().give('User', '2').permission('delete').entity('Product', '1'));
console.log(assertions.join("\n"));


/*
var assertion = new defense.Assertion;
//assertion.give('User', '12345').permission('read', 'write');
assertion.give('User', '1').permission('read', 'write').entity('User');
assertion.give('Product').permission('read', 'write').entity('Product', '12345');
console.log(assertion.toObject());
console.log(assertion.toString());
assertion.permission(0);

console.log(new defense.Assertion().fromObject({"user:2:product:2": 6}).toString());
console.log(new defense.Assertion().fromObject({"user:2:product:2": "7"}).toString());
console.log(new defense.Assertion().fromObject({"user:2:product:2": undefined}).toString());
console.log(new defense.Assertion().fromObject("asdf").toString());
console.log(new defense.Assertion("User").toString());
*/

/*defense.setup(function(err) {
  if(err) { console.log(err); }

  defense.canRead({ _id: "1" }, "user", [ {_id:"123"}, {_id:"321"}, {_id:"1"}, {_id:"2"}, {_id:"3"}, {_id:"4"}, {_id:"5"}, {_id:"6"} ], function(err, isAllowed) {
    if(err) { console.log(err); }
    console.log("Is Allowed: " + isAllowed);
  });

  defense.canRead({ _id: "1" }, "user", [ "123", "321" ], function(err, isAllowed) {
    if(err) { console.log(err); }

    console.log("Is Allowed: " + isAllowed);
  });

  defense.canRead({ _id: "1" }, "user", "321" , function(err, isAllowed) {
    if(err) { console.log(err); }

    console.log("Is Allowed: " + isAllowed);
  });

  defense.canWrite({ _id: "1" }, "user", {_id:"321"} , function(err, isAllowed) {
    if(err) { console.log(err); }

    console.log("Is Allowed: " + isAllowed);
  });
});
*/

// Method to connect to database and start the server.
var startServer = function() {
  var server = app.listen(3000, function() {
    var serverInfo = this.address();
    var address = (serverInfo.address === "::") ? "localhost" : serverInfo.address;
    
    console.log("Listening on http://%s:%s", address, serverInfo.port);
  });
};


startServer();