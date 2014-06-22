var priv = '{"sym_key":[-2078830561,1682189118,1575134806,156233709,-391209604,1727757807,-1046869112,873814060],"sign":"0000006275556c333caa9d7cd3a26fd26eb48403773bd36ceb1be0","decrypt":"0000004f0d7ae3323dea172ee8c53f3b83845ee81be1f183e4fc51","encrypt":"021cbeb072a8a136a35efd7d59eac32d4415929bc1ca9d5a0e1e640789079a91dcc534c65119ed3fbddb12c918c5a582","verify":"b7bf9d94519d221ec2dd5cb033da55149852858c776d66bf8568a85a45b099c009c926575494bddf3fe2783c15de337b"}';

var idpkeys = deserialize_keys(priv);

Meteor.users.allow({// don't allow users to write
});

Accounts.onCreateUser(function(options, user) {
    // create user master key
    user.masterKey = JSON.stringify(
	sjcl.random.randomWords(6));
    return user;
});

Meteor.methods({
    // look up a user's public key
    //args: username
    //returns: public keys corresponding to username, undefined if user doesn't exist
    get_public: function (name) {
	console.log("idp get_public");
        var users = Meteor.users.find({
            'username': name
        }).fetch();
	var sz = _.size(users);
	if (sz != 1) {
	    console.log("found " + sz + " user called " + name);
	    return undefined;
	}
	var user = users[0];
        if(!user || !user.keys){
            return undefined;
        }
        console.log("idp: get_public for " + name);
        return serialize_public(deserialize_keys(user.keys));
	
    },
    
    
    // calls cb with an application specific key
    get_app_key : function(origin) {
        return base_crypto.secret_derive(Meteor.user().masterKey,
					 origin);
    },
    
    // calls cb with a certificate
    create_cert : function(msg, origin) {
	var c = JSON.stringify({user: Meteor.user().username,
				msg: msg, origin: origin});
	var cert = "";
	try { 
	    cert = base_crypto.sign(c, idpkeys.sign);
	} catch (err) {
	    console.log("err is " + err);
	}
	return cert;
    },
    
    get_uname: function() {
	return Meteor.user().username;
    },
    
    // look up a user's keys (private and public)
    // args: username, password
    // returns user's keys, undefined if user is not found
    get_keys: function (name, pwd) {
        // TODO: check password
	console.log("get_keys name " + name);
        var user = Meteor.users.findOne({
            'username': name
        });
	if (!user) {
	    throw new Error("user " + user + " does not exist at idp");
	}
        return user.keys;
    },
    
    // update keys for user, creates new user if user doesn't exsist
    // args: username, password, new keys
    // returns: new keys
    create_keys:  function (name, pwd, nkeys) {
	console.log("create user " + name + " " + nkeys);
        var user = Meteor.users.findOne({'username': name});
	console.log("idp gets keys " + nkeys);	  
        if (user) {//TODO: must check password!
	    if (!nkeys) {
		throw new Error("nkeys is null");
	    }
            if (!_.has(user, 'keys')) {
		console.log("NEW KEYS for " + name + " keys " + nkeys);
                Meteor.users.update(user._id, {$set: {
                    keys: nkeys
                }});
            }
            return user.keys;
        } else {
	    
            Meteor.users.insert({username: name , keys: nkeys});
	    console.log('keys inserted for ' + name);
	    
            return nkeys;
        }
    }
    
});

