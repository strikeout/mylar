var current_pw = null;

Meteor.autorun(function () {
  var u = Meteor.user();
  if (u && u.wrap_privkeys && current_pw) {
    var keys = sjcl.decrypt(current_pw, u.wrap_privkeys);
    console.log('Setting user keys:', keys);
    Principal.set_current_user_keys(keys);
  }
});

var createUserOrig = Accounts.createUser;
Accounts.createUser = function (options, callback) {
  var uname = options.email || options.username;
  var password = options.password;
  current_pw = password;

  Principal.create('user', uname, null, function (uprinc) {
    var ukeys = serialize_keys(uprinc.keys);
    Principal.set_current_user_keys(ukeys);

    options = _.clone(options);
    options.wrap_privkeys = sjcl.encrypt(password, ukeys);
    options.public_keys = serialize_public(uprinc.keys);
    createUserOrig(options, callback);
  });
};

var loginWithPasswordOrig = Meteor.loginWithPassword;
Meteor.loginWithPassword = function (selector, password, callback) {
  current_pw = password;
  loginWithPasswordOrig(selector, password, callback);
};
