var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  initialize: function(){
    //TODO: stuff
  },

  signup: function(username, password){
    return new Promise(function(resolve, reject){
      // generate salt
      bcrypt.genSalt(10, function(err, salt){
        if (err){
          reject(err);
        // generate hash for password and salt
        } else {
          bcrypt.hash(password, salt, null, function(err, hash){
            if (err){
              reject(err);
            } else {
              // add username and hashed password to database
              var user = new User({username: username, password: hash});
              user.save().then(function(){
                console.log("Got it.");
                resolve(user);
              });
            }
          });
        }
      });
    });
  },

  login: function(username, password){

  }

});

module.exports = User;
