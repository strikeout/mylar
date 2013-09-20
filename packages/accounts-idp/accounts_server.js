
Accounts.certifyFunc(function(options, user) {
    // check certificate
    var cert = options.cert;
    var uname = options.username;

    var ok = idp_check("register", uname, cert, idp_pk);

    if (!ok) {
	user._validate = false;
    } else {
	user._validate = true;
	user._wrap_privkey = options.wrap_privkey;
    }

    delete options.wrap_privkey;
    delete options.cert;

    return user;
});

Meteor.methods({
    GetWrapPrivKey: function(){
	console.log("returning wrap key " +
		    Meteor.user()._wrap_privkey);
	return Meteor.user()._wrap_privkey;
    }
});

//gets called after onCreateUser
Accounts.validateNewUser(function(user){
    return user._validate;
});

