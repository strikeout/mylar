
if (Meteor.isClient) {
    Deps.autorun(function () {
        Meteor.subscribe("userdata");
    });
/*

    //EVENTS HANDLERS BUTTON
    Template.hello.events({
	'click #loginBtn': function(evt) {
	    CreateUser();
	},
	'click #logoutBtn': function(evt) {
	    //UPDATE USER COLLECTION ONLINE FALSE
	    Meteor.call('UpdateOnlineFalse');
	    Meteor.logout();
	},
	'keypress #formCreateUser': function(evt) {
	    if (evt.keyCode == 13){
		CreateUser();
		return false;
	    }
	}
    });
    
*/
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
 

// calls cb with an application specific key
get_app_key = function(arg, origin, cb) {
    Meteor.call("get_app_key", origin, cb);
}

// calls cb with a certificate
certify_pk = function(pk, origin, cb) {
    Meteor.call("certifypk", pk, origin, cb);
}


priv = '{"sym_key":[1614353479,-1322269226,346639468,-1922281664,1543397848,36700503,-1283077055,-1438142375],"sign":"000000530752fdf7419ebc7906d88f682c9a6c027356a95c0c2132","decrypt":"000000de71fe414a477d84ea182a64dc5d24038bab8484f29d0a8e","encrypt":"ee8e81253e2c985137074e514982966787445d47a5013c83b357e3a94a49006ff12db2768bca2f2c9237dc64a977e744","verify":"e16e692df5f28e8f4555c1f25e847d5820d9518a6082ebc76017ff8ad009a818d7395b0c847b9a17b636ce03dce0ac61"}';

idpkeys = deserialize_keys(priv);
    
sign_text = function(user, origin, pk) {
    return user + "+++" + origin + "+++" + pk; //TODO: fix this so no formatting attacks possible 
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

      
      // calls cb with an application specific key
      get_app_key : function(origin) {
	  return "temppasswd"; //TEMPORARY!
      },
      
      // calls cb with a certificate
      certifypk : function(pk, origin, cb) {
	  var c = sign_text("temp", pk, origin); // USER Meteor.user()
	  return base_crypto.sign(sign_text, idpkeys.sign);
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
