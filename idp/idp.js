
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
	  console.log("idp get_public");
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
          return serialize_public(deserialize_keys(user.keys));

      },


      // look up a user's keys (private and public)
      // args: username, password
      // returns user's keys, undefined if user is not found
      get_keys: function (name, pwd) {
          // TODO: check password
	  console.log("get_keys name " + name);
          var user = Meteor.users.findOne({
              'username': name
          });
	  if (!user) {
	      throw new Error("user " + user + " does not exist at idp");
	  }
          return user.keys;
      },
      
      // update keys for user, creates new user if user doesn't exsist
      // args: username, password, new keys
      // returns: new keys
      create_keys:  function (name, pwd, nkeys) {
	  console.log("create user " + name + " " + nkeys);
          var user = Meteor.users.findOne({'username': name});
	  console.log("idp gets keys " + nkeys);	  
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

              Meteor.users.insert({username: name , keys: nkeys});
	      console.log('keys inserted for ' + name);
	      
              return nkeys;
          }
      }

  });
}
