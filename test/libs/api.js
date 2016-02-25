var ASSERTIONS = require('../data/assertions.json'),
    assert = require("assert"),
    defense = require('../../libs/index.js')(),
    should = require("should");

describe('Permission to', function() {

  beforeEach(function(done) {
    defense.pt.add(ASSERTIONS, function(err, results) {
      console.log(results);
      done();
    });
  });

  afterEach(function(done) {
    defense.pt.remove(ASSERTIONS, function(err, result) {
      done(err);
    });
  });

  describe('read', function() {
    it('should be allowed if the user has read permission to a resource', function(done) {
      defense.canRead("000000000000000000000000", "item", "100000000000000000000000", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });

    it('should be denied if the user does not have read permission to a resource', function(done) {
      defense.canRead("000000000000000000000000", "item", "100000000000000000000001", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should be denied if the user does not have read permission to one or more resources', function(done) {
      defense.canRead("000000000000000000000000", "item", ["100000000000000000000000", "100000000000000000000001"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should be allowed if the user has read permission for all resources', function(done) {
      defense.canRead("000000000000000000000000", "item", ["100000000000000000000000", "100000000000000000000002"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });

    it('should be allowed to use a user object', function(done) {
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

  describe('write', function() {
    it('should be allowed if the user has write permission to a resource', function(done) {
      defense.canWrite("000000000000000000000000", "item", "100000000000000000000002", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, true);
          done();
        }
      });
    });

    it('should be denied if the user does not have write permission to a resource', function(done) {
      defense.canWrite("000000000000000000000000", "item", "100000000000000000000001", function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should be denied if the user does not have write permission to one or more resources', function(done) {
      defense.canWrite("000000000000000000000000", "item", ["100000000000000000000002", "100000000000000000000001"], function(err, isAllowed) {
        if(err) {
          done(err);
        } else {
          assert.equal(isAllowed, false);
          done();
        }
      });
    });

    it('should be allowed if the user has write permission for all resources', function(done) {
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

});