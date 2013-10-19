var current_pw = null;

Meteor.autorun(function () {
  var u = Meteor.user();
  if (u && u._wrap_privkey && current_pw) {
      var keys = sjcl.decrypt(current_pw, u._wrap_privkey);
    console.log('Setting user keys:', keys);
    // XXX is it a problem to use the username from Meteor.user()?
    Principal.set_current_user_keys(keys, u.username);
  }
});

var createPrincipalCB = function (uprinc, cb) {
  cb();
};
Meteor.onCreatePrincipal = function (f) {
  createPrincipalCB = f;
};

var createUserOrig = Accounts.createUser;
Accounts.createUser = function (options, callback) {

    if (!options.email) {
	throw new Error("need to specify user email for accounts-idp2");
    }
  var uname = options.email || options.username;
  var password = options.password;
  current_pw = password;

    console.log("create user options" +JSON.stringify(options)); 
  Principal.create('user', uname, null, function (uprinc) {
      createPrincipalCB(uprinc, function () {
      var ukeys = serialize_keys(uprinc.keys);
      Principal.set_current_user_keys(ukeys, uname);

      options = _.clone(options);
	  options.wrap_privkeys = sjcl.encrypt(password, ukeys);
	  options.public_keys = serialize_public(uprinc.keys);


      createUserOrig(options, callback);
    });
  });
};

var loginWithPasswordOrig = Meteor.loginWithPassword;
Meteor.loginWithPassword = function (selector, password, callback) {
  current_pw = password;
  loginWithPasswordOrig(selector, password, callback);
};
