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

Accounts.checkedToken = function(email) {
    var user = Tokens.findOne({email: email});

    if (!user) {
	return false;
    }
    return user.verified;
}

// Based on the verifyEmail method in accounts-password/password_server.js.
Meteor.methods({verifyEmailMylar: function (r) {
    console.log("CALLING server verifyMylarEmail with " + JSON.stringify(r));
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
  var tokenExpires = Accounts._tokenExpiration(stampedLoginToken.when);
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
  
  this.setUserId(user._id);
  return {token: stampedLoginToken.token,
	  tokenExpires: tokenExpires,
	  id: user._id};
},

createOtherUser: function(email, profile) {
    var user = Meteor.users.findOne({'emails.address': email});

    if (user) {
	throw new Meteor.Error(403, "user already has an account");
    }

    var token = Random.id();
    
    Tokens.insert({email: email, token: token, profile: profile, verified: false});

    var origin = Meteor.absoluteUrl('#/Mylar-login-with-token/');
    var url = origin + encodeURIComponent(token);

    var text = "Please click on this link to create account:\n\n" + url;

    console.log(text);
    
    //TODO: allow customization for these
    Email.send({
	from: 'raluca.ada@gmail.com',
	to: email,
	subject: 'Welcome to app',
	text: text,
    });

},

checkToken: function(token, email) {
    var user = Tokens.findOne({email: email});
    if (!user) {
	throw new Meteor.Error(403, "user not found");
    }

    if (token != user.token) {
	throw new Meteor.Error(403, "token " + token + " is not correct for user " + email);
    }

    Tokens.update({_id: user._id}, {$set: {verified : true}});
    return user.profile;
},

userExists: function(email) {
    var user = Meteor.users.findOne({'emails.address':email});

    if (user)
	return true;
    else
	return false;
},

// Accounts.canChangePassword(user_allowed_to_change, target_user)
		
setSRP: function(email, verifier, wrap) {
    console.log("looking for email " + email);
    var user = Meteor.users.findOne({'emails.address' : email});
    
    if (!user)
	throw new Meteor.Error(403, "User not found");

    console.log("changing password to user " + email);
    //check that current user is allowed to change password of uname
    if (Accounts.canChangePassword &&
	Accounts.canChangePassword(Meteor.user(), user)) {
	console.log("can change password");
	Meteor.users.update({_id: user._id}, {
	    $set: {'services.password.srp': verifier, _wrap_privkey: wrap}});
    } else {
	var currentUser = Meteor.user().username;
	throw new Meteor.Error(403, "User " + currentUser + " not allowed to change password");
    }
}
});

var onCreateUserHook2;
Accounts.onCreateUser(function (options, user) {
    user._pk = options.public_keys;
    user._wrap_privkey = options.wrap_privkeys;
    user._princ_name = options._princ_name;
    
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
