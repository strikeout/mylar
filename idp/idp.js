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
                        keys: p.serialize_keys()
                    }});
                });
            }
            return user.emails[0].address;
        }
    };

    Template.config.events({
    "click #configure": function() {
        

        //parse file

        var reader = new FileReader();

        reader.onload = function(file) {
            var text = file.target.result;
            var lines = text.split("\n");
            var state = {}
            var pw = "submit";
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].split(',');
                if (l == ''){
                    continue;
                }
                if (l[0].indexOf('@') == 0){
                //change state
                    conf = l[0].split('=');
                    switch(conf[0]){
                        case '@group':
                            state["group"] = conf[1];
                        break;
                        case '@create_users':
                        case '@create_groups':
                        case '@create_assignments':
                            console.log("mode = " + conf[0]);
                            state["mode"] = conf[0]
                        break;
                        default:
                            console.log("error parsing file on line " + i);
                    }
                    continue;        
                }
                //perform action
                switch(state["mode"]){
                    case '@create_groups':
                        console.log("create group " + lines[i]); 
                    break;
                    case '@create_users':
                        var s = lines[i].split(":");
                        var name = s[0];
                        var pw = s[1];
                        var user = {
                            "name":name,
                            "email":name,
                            "password":pw
                        };
                        var result = Meteor.call("createUser",user,function(error,result){
                        if(error){
                            console.log("error creating user " + lines[i]);
                            console.log(error);
                        } else {
                            Principal.create([], function (p) {
                                Meteor.users.update(result.id, {$set: {
                                    keys: p.serialize_keys()
                                }});
                                console.log("user " + result.id + " created successfully");
                            });
                             //var user = Meteor.users.findOne({"_id":result.id});
                             //if (user) {
                             //   if (!_.has(user, 'keys')) {
                             //   }
                             // } else {
                             //   console.log("could not find recently created user with _id: " + result.id);
                             //}
                        }});

                        //create users on local server
                        //create users on idp
                        //create principal on idp
                    break;

                    case '@create_assignments':
                        console.log("create assignment " + lines[i]);
                    break;
                    default:
                        console.log("error parsing file on line " + i + " state " + state["@mode"]);
                        


                }
            }
        };

        reader.readAsText(document.getElementById("fileinput").files[0]);
    },
    });
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
      get_public: function (name) {
          var user = Meteor.users.findOne({
              'username': name
          });
          var keys = EJSON.parse(user.keys);
          return EJSON.stringify({
              encrypt: keys.encrypt,
              verify: keys.verify
          });
      },

      get_keys: function (name, pwd) {
          // TODO: check password
          var user = Meteor.users.findOne({
              'username': name
          });
          return user.keys;
      },
      create_keys:  function (name, pwd, nkeys) {
          var user = Meteor.users.findOne({
              'username': name
          });
          if (user) {
              if (!_.has(user, 'keys')) {
                  Meteor.users.update(user._id, {$set: {
                      keys: nkeys
                  }});
              }
              return user.keys;
          } else {
              uid = Accounts.createUser({username:name, password:pwd});
              Meteor.users.update(uid, {$set: {
                  keys: nkeys
              }});
              return nkeys;
          }
      }
  });
}
