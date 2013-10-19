// Based on Accounts.sendVerificationEmail,
// from accounts-password/password_server.js.
Accounts.sendVerificationEmail = function (userId, address) {
  // Make sure the user exists, and address is one of their addresses.
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  // pick the first unverified address if we weren't passed an address.
  if (!address) {
    var email = _.find(user.emails || [],
                       function (e) { return !e.verified; });
    address = (email || {}).address;
  }
  // make sure we have a valid address
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))
    throw new Error("No such email address for user.");

  idp_request_cert(address, user._pk);
};

// Based on the verifyEmail method in accounts-password/password_server.js.
Meteor.methods({verifyEmailMylar: function (r) {
  if (!idp_verify_msg(r.msg, r.sig))
    throw new Meteor.Error(403, "Certificate signature incorrect");

  var msgx = JSON.parse(r.msg);
  if (msgx.origin != idp_app_url())
    throw new Meteor.Error(403, "Certificate for wrong app URL");
  if (msgx.type != 'user')
    throw new Meteor.Error(403, "Wrong certificate type");

  // XXX does this mean the username MUST be the email address?
  var user = Meteor.users.findOne({ username: msgx.email });
  if (!user)
    throw new Meteor.Error(403, "Cannot find user");

  var emailsRecord = _.find(user.emails, function (e) {
    return e.address == msgx.email;
  });
  if (!emailsRecord)
    throw new Meteor.Error(403, "Verify email link is for unknown address");

  // Log the user in with a new login token.
  var stampedLoginToken = Accounts._generateStampedLoginToken();

  // By including the address in the query, we can use 'emails.$' in the
  // modifier to get a reference to the specific object in the emails
  // array. See
  // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)
  // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull
  Meteor.users.update(
    {_id: user._id,
     'emails.address': msgx.email},
      {$set: {'emails.$.verified': true,
	      _pubkey_cert : r.sig},
       $push: {'services.resume.loginTokens': stampedLoginToken}});
    console.log("UPDATED");
  
  this.setUserId(user._id);
  return {token: stampedLoginToken.token, id: user._id};
}});

var onCreateUserHook2;
Accounts.onCreateUser(function (options, user) {
    user._pk = options.public_keys;
    user._wrap_privkey = options.wrap_privkeys;
    
  if (onCreateUserHook2) {
    return onCreateUserHook2(options, user);
  } else {
    // Emulate defaultCreateUserHook which is not exported.
    if (options.profile)
      user.profile = options.profile;
    return user;
  }
});

Accounts.onCreateUser = function (hook) {
  onCreateUserHook2 = hook;
};
