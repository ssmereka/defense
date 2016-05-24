var policyTableAssertions = require('../data/assertions.json'),
    attributeAssertions = require('../data/attributeAssertions.json'),
    assert = require("assert"),
    defense = require('../../libs/index.js')(),
    should = require("should");

describe('API method', function() {

  beforeEach(function(done) {
    defense.pt.add(policyTableAssertions, function(err, results) {
      if(err) { return done(err); }
      defense.ap.add(attributeAssertions, function(err, results) {
        done(err);
      });
    });
  });

  afterEach(function(done) {
    defense.pt.remove(policyTableAssertions, function(err, result) {
      if(err) { return done(err); }
      defense.ap.remove(attributeAssertions, function(err, results) {
        done(err);
      });
    });
  });

  describe('canRead', function() {
    it('should grant access if the user has read permission to a resource', function(done) {
      defense.canRead("000000000000000000000000", "item", "100000000000000000000000", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });

    it('should deny access if the user does not have read permission to a resource', function(done) {
      defense.canRead("000000000000000000000000", "item", "100000000000000000000001", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should deny access if the user does not have read permission to one or more resources', function(done) {
      defense.canRead("000000000000000000000000", "item", ["100000000000000000000000", "100000000000000000000001"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should grant access if the user has read permission for all resources', function(done) {
      defense.canRead("000000000000000000000000", "item", ["100000000000000000000000", "100000000000000000000002"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });

    it('should grant access when using a user\'s full object instead of just an ID', function(done) {
      defense.canRead({ _id: "000000000000000000000000" }, "item", ["100000000000000000000000", "100000000000000000000002"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });
  });

  describe('canWrite', function() {
    it('should grant access if the user has write permission to a resource', function(done) {
      defense.canWrite("000000000000000000000000", "item", "100000000000000000000002", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });

    it('should deny access if the user does not have write permission to a resource', function(done) {
      defense.canWrite("000000000000000000000000", "item", "100000000000000000000001", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should deny access if the user does not have write permission to one or more resources', function(done) {
      defense.canWrite("000000000000000000000000", "item", ["100000000000000000000002", "100000000000000000000001"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should grant access if the user has write permission for all resources', function(done) {
      defense.canWrite("000000000000000000000000", "item", ["100000000000000000000002", "100000000000000000000003"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });
  });

  describe('canDelete', function() {});


  describe('sanitizeRead', function() {

    it('should grant access if the user has read permission to a resource', function(done) {
      var resource = {
        _id: "100000000000000000000000"
      };

      defense.sanitizeRead("000000000000000000000000", "item", resource, function(err, resource) {
        if(err) {
          done(err);
        } else {
          assert.equal(JSON.stringify(resource), JSON.stringify(resource));
          done();
        }
      });
    });

    it('should deny access if the user does not have read permission to a resource', function(done) {
      var resource = {
        _id: "100000000000000000000001"
      };

      defense.sanitizeRead("000000000000000000000000", "item", resource, function(err, resource) {
        if(err) {
          done(err);
        } else {
          assert.equal(JSON.stringify(resource), JSON.stringify(resource));
          done();
        }
      });
    });
  });

});