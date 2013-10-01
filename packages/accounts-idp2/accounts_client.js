var current_pw = null;

Meteor.autorun(function () {
  var u = Meteor.user();
  if (u && u.wrap_privkeys && current_pw)
    Principal.set_current_user_keys(sjcl.decrypt(current_pw, u.wrap_privkeys));
});

var createUserOrig = Accounts.createUser;
Accounts.createUser = function (options, callback) {
  var uname = options.email || options.username;
  var password = options.password;
  current_pw = password;

  Principal.create('user', uname, null, function (uprinc) {
    var wrapped = sjcl.encrypt(password, serialize_keys(uprinc.keys));

    options = _.clone(options);
    options.wrap_privkeys = wrapped;
    options.public_keys = serialize_public(uprinc.keys);
    createUserOrig(options, callback);
  });
};

var loginWithPasswordOrig = Meteor.loginWithPassword;
Meteor.loginWithPassword = function (selector, password, callback) {
  current_pw = password;
  loginWithPasswordOrig(selector, password, callback);
};

// Based on Accounts.verifyEmail from accounts-password/password_client.js.
Accounts.verifyEmail = function(token, callback) {
  if (!token)
    throw new Error("Need to pass token");

  var email /* = XXX */;
  var pk /* = XXX */;
  idp_obtain_cert(email, pk, token, function (r) {
    if (!r) {
      console.log('Unable to obtain certificate for email address');
      return;
    }

    Accounts.callLoginMethod({
      methodName: 'verifyEmailMylar',
      methodArguments: [r],
      userCallback: callback});
  });
};
