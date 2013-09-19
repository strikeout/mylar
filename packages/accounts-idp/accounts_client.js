
// creates app password from app key
function app_password(app_key) {
    return app_key; //TODO hash("login", app_key)
}

function createUser(uname, app_key, cb) {
    
    Meteor.createUser()
}

function finishLoginUser(uname, app_key, cb) {
    var keys = base_crypto.sym_decrypt(app_key,
				       Meteor.user().wrapped_privkey);
    localStorage['user_princ_keys'] = keys;

    cb && cb();
}

Meteor.loginWithIDP = function (callback) {

    idp_get_uname(function(uname) {
	idp_get_app_key(function(app_key) {

	    Meteor.loginWithPassword({username:uname}, app_password(app_key),
		function(error) {
		    if (error) {
			// user does not exist TODO: other error reasons
			createUser(uname, app_key, callback);
			return;
		    } else {// logged in successfully
			finishLoginUser(uname, app_key, callback);
		    }
	    });	
	});
    });
};


/*
  
	    idp_create_cert(null, function (cert) {
		Accounts.callLoginMethod({
		    methodArguments: [{idp: {cert: cert}}],
		    userCallback: callback,
		});
	    }
*/