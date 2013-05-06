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
}

if (Meteor.isServer) {
  Meteor.startup(function () {
      Meteor.publish("userdata", function () {
          return Meteor.users.find({_id: this.userId});
      });
  });

  Meteor.users.allow({
      update: function (userId, doc) {
          return userId === doc._id;
      }
  });

  Meteor.methods({
      get_public: function (name) {
          var user = Meteor.users.findOne({
              'emails.address': name
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
              'emails.address': name
          });
          return user.keys;
      }
  });
}
