if (Meteor.isClient) {
    Deps.autorun(function () {
        Meteor.subscribe("userdata");
    });

    Template.hello.user_email = function () {
        var user = Meteor.users.findOne();
        if (user) {
	    // TODO: more inconsistency in idp: why would we need this for??
	    if (!_.has(user, 'keys')) {
		var user_princ = new Principal("user", user.emails[0].address);
                Meteor.users.update(user._id, {$set: {
                    keys: serialize_keys(user_princ.keys),
                    username:user.emails[0].address
                }});
            } 
            return user.emails[0].address;
        }
    };


}

if (Meteor.isServer) {
  Meteor.startup(function () {
      Meteor.publish("userdata", function () {
          return Meteor.users.find({_id: this.userId});
      });
  });

  Meteor.users.allow({
      update: function (userId, doc) {
         return true; //TODO: allow script, but make safe later...
         //return userId === doc._id;
      }
  });

  Meteor.methods({
      // look up a user's public key
      //args: username
      //returns: public keys corresponding to username, undefined if user doesn't exist
      get_public: function (name) {
          var users = Meteor.users.find({
              'username': name
          }).fetch();
	  var sz = _.size(users);
	  if (sz != 1) {
	      console.log("found " + sz + " user called " + name);
	      return undefined;
	  }
	  var user = users[0];
          if(!user || !user.keys){
            return undefined;
          }
          console.log("idp: get_public for " + name);
	  console.log("before parse , keys are " + user.keys);
          var keys = EJSON.parse(user.keys);
	  console.log("after parse;");
          return EJSON.stringify({
              encrypt: keys.encrypt,
              verify: keys.verify
          });
      },


      // look up a user's keys (private and public)
      // args: username, password
      // returns user's keys, undefined if user is not found
      get_keys: function (name, pwd) {
          // TODO: check password
          var user = Meteor.users.findOne({
              'username': name
          });
          return user.keys;
      },
      
      // update keys for user, creates new user if user doesn't exsist
      // args: username, password, new keys
      // returns: new keys
      create_keys:  function (name, pwd, nkeys) {
          var user = Meteor.users.findOne({
              'username': name
          });
          if (user) {//TODO: must check password!
	      if (!nkeys) {
		  throw new Error("nkeys is null");
	      }
              if (!_.has(user, 'keys')) {
		  console.log("NEW KEYS for " + name + " keys " + nkeys);
                  Meteor.users.update(user._id, {$set: {
                      keys: nkeys
                  }});
              }
              return user.keys;
          } else {
              console.log('creating user '+name);
              uid = Accounts.createUser({username:name, password:pwd});
              console.log('user id '+uid);
	      console.log("NEW KEYS for " + name + " keys " + nkeys);
              Meteor.users.update(uid, {$set: {
                  keys: nkeys
              }});
              console.log('keys added for ' + name);
              return nkeys;
          }
      }

  });
}
