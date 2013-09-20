
// creates app password from app key
function app_password(app_key) {
    return base_crypto.secret_derive(app_key, "login"); 
}

function createUser(uname, app_key, cb) {
    if (idp_debug()) 
	console.log("create user " + uname + " app_key " + app_key);
   
    Principal.generate_keys(function(keys){
	var ser_keys = serialize_keys(keys);
	var pub_keys = serialize_public(keys);
	var wrap_privkeys = base_crypto.sym_encrypt(app_key,
						    ser_keys);

	// now create a certificate on name and
	// one on public keys
	idp_create_cert("register", function(name_cert){
	    idp_create_cert(pub_keys, function(key_cert) {

		var after_create_cb = function(err) {
                    if (!err) 
			localStorage['user_princ_keys'] = ser_keys;
		    cb && cb(err);
		}

		Accounts.createUser({username: uname,
				     password: app_password(app_key),
				     name_cert : name_cert,
				     key_cert : key_cert,
				     wrap_privkey: wrap_privkeys},
				    after_create_cb);
	    });
	});
    });
}

function finishLoginUser(uname, app_key, cb) {

    var dec_func = function(wkey) { // decrypt wrapped key
	var keys = base_crypto.sym_decrypt(app_key, wkey);
	localStorage['user_princ_keys'] = keys;
	
	cb && cb();	
    }
    
    var wk = Meteor.user()._wrap_privkey;
    if (!wk) {
	// RPC to server, we don't want to clog user's
	// subscriptions with the wrapped key
	Meteor.call("GetWrapPrivkey", function(err, wkey){
	    if (err) {
		throw new Error("issue with wrapped key from server");
	    }
	    dec_func(wkey);
	});
    } else {
	dec_func(wk);
    }
     
}

Meteor.loginWithIDP = function (callback) {

    idp_get_uname(function(uname) {

	if (idp_debug()) {
	    console.log("uname " + uname);
	}

	if (!uname) {
	    callback("You are not logged in the idp");
	    return;
	}
	idp_get_app_key(function(app_key) {

	    if (idp_debug()) {
		console.log("app key" + app_key);
	    }

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

