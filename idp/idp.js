if (Meteor.isClient) {
    Deps.autorun(function () {
        Meteor.subscribe("userdata");
    });

    Template.hello.user_email = function () {
        var user = Meteor.users.findOne();
        if (user) {
            if (!_.has(user, 'keys')) {
                Principal.create([], function (p) {
                    Meteor.users.update(user._id, {$set: {
                        keys: p.serialize_keys(),
                        username:user.emails[0].address
                    }});
                });
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
          var user = Meteor.users.findOne({
              'username': name
          });
          if(!user || !user.keys){
            return undefined;
          }
          console.log(user);
          var keys = EJSON.parse(user.keys);
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
              console.log('update keys for '+name);
              if (!_.has(user, 'keys')) {
                  Meteor.users.update(user._id, {$set: {
                      keys: nkeys
                  }});
              }
              return user.keys;
          } else {
              console.log('creating user '+name);
              uid = Accounts.createUser({username:name, password:pwd});
              console.log('user id '+uid);
              Meteor.users.update(uid, {$set: {
                  keys: nkeys
              }});
              console.log('keys added');
              return nkeys;
          }
      }
  });
}
