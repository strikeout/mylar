/*
  Implements principals
*/


var debug = true;
var crypto = base_crypto;

/******* Data structures ****/

PrincAttr = function (type, name) {
    this.type = type;
    this.name = name;
};

/* keys: sign, verify, encrypt, decrypt, mk_key, sim_key */


/****** Pretty printing for debug *****************/

// for debugging purposes, it returns a string representing the princ graph
princ_graph = function() {
    var princs = Principals.find({}).fetch();
    var res = "";
    _.each(princs, function(princ) {
	res = res + "{'type': " + princ["type"] + ", 'name': " +  princ["name"] + "}" +  " id "+ princ["_id"] + "\n";
    });
	return res;
}

wrapped_keys = function() {
    var keys = WrappedKeys.find({}).fetch();
    var res = "";
    _.each(keys, function(doc) {
	res = res + "principal: " + doc["principal"]
	          + " wrapped_for " + doc["wrapped_for"]
	          + "wrapped_key" + doc["wrapped_key"] +  "\n";
    });
    return res;
}

/*****************************************************/

if (Meteor.isServer) {

    var allow_all_writes = {
        insert: function () { return true; },
        update: function () { return true; }
    };
    //TODO: needs to be restricted
    Principals.allow(allow_all_writes);
    WrappedKeys.allow(allow_all_writes);
    Certs.allow(allow_all_writes);


    // gets the wrapped key, symmetric or public
    getWKey = function(doc) {
	if (doc.wrapped_sym_keys) {
	    return {isSym: true, wkey: doc.wrapped_sym_keys};
	} else {
	    return {isSym: false, wkey: doc.wrapped_keys};
	}
    }
    
    Meteor.methods({

	/* Given from_princ and to_princ of type Principal, 
	   finds a key chain from_princ to to_princ. from_princ has access
	   to to_princ thru this chain. 
	   TODO: Currently exhaustive search. */
        keychain: function (from_princ, to_princ) {
	    	 
	    if (debug) 
		console.log("KEYCHAIN: from " + JSON.stringify(from_princ) + " to " + JSON.stringify(to_princ));

	    if (!from_princ.id || !from_princ.type) {
		throw new Error("from principal in key chain must have at least id and type set");
	    }

	    if (!to_princ.id || !to_princ.type) {
		throw new Error("to_princ in key chain must have at least id and type set");
	    }

	    // frontier is a list of principal id-s and
	    // the wrapped keys to reach them starting from from_princ
	    var frontier = [
                             [ from_princ.id, [] ],
                           ];

	    var found_chain;
            while (frontier.length > 0) {
                var new_frontier = [];

                _.each(frontier, function (node) {
                    var frontier_id = node[0];
                    var frontier_chain = node[1];
		    
	            if (frontier_id === to_princ.id) {
                        found_chain = frontier_chain;
			return found_chain;
                    }
		    
                    var next_hops = WrappedKeys.find({ wrapped_for: frontier_id }).fetch();
                    _.each(next_hops, function (next_hop) {
                        var new_chain = frontier_chain.concat([getWKey(next_hop)]);
                        new_frontier.push([ next_hop.principal, new_chain ]);
                    });
                });

		if (found_chain) {
		    return found_chain;
		}
                frontier = new_frontier;
            }
	    
	    console.log("did not find a chain from " + from_princ + " to " + to_princ);
	    return undefined;
        },

	// returns a principal with id from the principal graph
	lookupByID: function(id) {
	    return Principals.findOne({_id: id});
	},

	/*
	  Given a list of PrincAttr-s,
	  looks up a principal whose attrs are PrincAttr1,
	  which is certified by some principal with PrincAttr2,
	  ....
	  which is certified by some principal with PrincAttrN,
	  which is certified by authority - id of a principal
	  Returns a principal only if each of the
	  certificates is valid.

	  TODO: currently exhaustive lookup
	*/
        lookup: function (princattrs, authority) {
	    
	    if (debug)
		console.log("lookup " + JSON.stringify(princattrs) + " auth " + authority);

	    // princs maps a Principal id  to a chain of certificates
	    // the last certificate in the chain has id as subject
	    // the first certificate in the chain is signed by authority id
	    // initially the principal is authority with no certificate
            var princs = {};
            princs[authority] = [];
            princattrs.reverse();
	    
	    //TODO: why is this not checking the certificate chain?
	    
            for (var i = 0; i < princattrs.length; i++) {
		// current attribute
		var princattr = princattrs[i];
                var new_princs = {};
                _.each(princs, function (cert_lst, princid) {
		    // p is current authority
                    var cs = Certs.find({
                        subject_type: princattr.type,
                        subject_name: princattr.name,
			signer : princid
                    }).fetch();
		    // add each certificate to new_princs
                    _.each(cs, function (cert) {
			var new_lst = cert_lst.slice(0);
                        new_lst.push(cert);
                        new_princs[cert.subject_id] = new_lst;
                    });
                });
                princs = new_princs;
            }

            if (_.isEmpty(princs)) {
                console.log("No principal found!");
                return undefined;
            }
            var p = _.keys(princs)[0];
            princs[p].reverse();
            return {
                "principal": p,
                "cert": princs[p]
            };
        }
    });
}

/***** Client ***************/

if (Meteor.isClient) {

    var add_access_happened = undefined;

    Deps.autorun(function(){
	add_access_happened = GlobalEnc.findOne({key : "add_access"})["value"];
    });
    
    // Constructs a new principal
    // keys is optional, and is generated randomly if missing
    Principal = function(type, name, keys) {
	if (type == '' || !keys)
	    throw new Error("Principal needs a type & keys must be set");
	
	this.type = type;
	this.name = name;
	this.keys = keys;
        
	/* Currently, id is public keys. 
	 * If too long, generate a random id.
	 */
	this.set_id(); 

    }

    // generates keys: standard crypto + multi-key
    _generate_keys = function(type, cb) {
	keys = crypto.generate_keys();
	Crypto.keygen(function(key) {
	    _.extend(keys, {'mk_key' : key});
	    cb(keys);
	});
    }

    // creates a principal of type and name
    // as certified by principal authority
    // and stores it in the principal graph
    // as certified by creator
    // naturally, creator gets access to this principal
    // runs callback cb upon completion
    Principal.create = function(type, name, creator, cb) {

	if (!type || !name || !creator) {
	    throw new Error("cannot create principal with invalid (type, name, creator) : ("
			    + type + ", " + name + ", " + creator +")");
	}

	if (!creator.keys.sign) {
	    throw new Error("creator " + creator.name + " does not have sign keys available");
	}

	// check if type exists in Princ type, else create it
	var pt = PrincType.findOne({type: type});
	if (!pt) {
	    PrincType.insert({type:type, searchable: false});
	} 

	_generate_keys(type, function(keys) {
	    var p = new Principal(type, name, keys);
	    Principal._store(p, creator);
	    Principal.add_access(creator, p, cb);
	});
    }

    // Creates a new node in the principal graph for the given principal
    // If authority is specified:
    //   -- makes princ certified by authority
    //   -- authority must have secret keys loaded
    Principal._store = function (princ, authority) {

	if (debug) console.log("CREATE princ: " + princ.name + " keys " + princ.keys  + " id " + princ.id);
	
	Principals.insert({
	    '_id': princ.id,
	    'type' : princ.type,
	    'name' : princ.name,
	});

	if (authority) {
	    if (!authority.keys || !authority.keys.sign || !authority.keys.decrypt) {
		throw new Error("authority does not have secret keys loaded");
		return;
	    } 
	    authority.create_certificate(princ).store();
	
	} 

    }
       
    //TODO: all this should run at the client
    
    // Gives princ1 access to princ2
    Principal.add_access = function (princ1, princ2, on_complete) {

	if (!add_access_happened) {
	    GlobalEnc.update({key: "add_access"}, {$set: {value : true}});
	}
	if (debug) console.log("add_access princ1 " + princ1.name + " to princ2 " + princ2.name);
	// need to load secret keys for princ2 and then add access to princ1
	// we do these in reverse order due to callbacks
	
	princ2._load_secret_keys(function(){
	    Principal._add_access(princ1, princ2, on_complete);
	});
    };
    
    
    // encrypt's the keys of princ2 with princ 1's keys and
    // stores these new wrapped keys
    Principal._add_access = function (princ1, princ2, cb) {
        var keys = princ2._secret_keys();

	if (!keys) {
	    throw new Error("princ2 should have secret keys loaded");
	}
	
	keys.decrypt = crypto.serialize_private(keys.decrypt);
        keys.sign = crypto.serialize_private(keys.sign);
	keys.mk_key = crypto.serialize_private(keys.mk_key);

	
	var wrap = princ2.encrypt(EJSON.stringify(keys));

	if (wrap.isSym) {
	    // no need for access inbox
	    WrappedKeys.save({
		principal: princ2.id,
		wrapped_for: princ1.id,
		wrapped_sym_keys: wrap.ct
           }); 
	}
	else {
	    var entry_id = WrappedKeys.save({
		principal: princ2.id,
		wrapped_for: princ1.id,
		wrapped_key: wrap.ct
	    });
	    // update user inbox
	    if (princ1.type == "user") {
		Principals.update({_id : princ1.id}, {$push: {accessInbox: entry_id}});
	    }
	}
		
	if (cb) {
	    cb();
	}
	
    };
    
    // Removes princ1 access to princ2
    Principal.remove_access = function (princ1, princ2, on_complete) {
	if (debug) console.log("remove_access princ1 " + princ1.name + " to princ2 " + princ2.name);
	    var inner = Principal._remove_access(princ1, princ2, on_complete);
	    princ2._load_secret_keys(inner);
    };


    Principal._remove_access = function (princ1, princ2, on_complete) {
	return function () {
        var originalKeys = princ2._secret_keys();

        // Remove WK from princ1.
	    var wrappedID = WrappedKeys.findOne({principal: princ2.id, wrapped_for: princ1.id})._id;
        WrappedKeys.remove(wrappedID);

        // Create a new principal.
            Principal.create(princ2.type, princ2.name, function(newPrincipal){
		
		// Add new WK for new principal.
		var parentOriginal = WrappedKeys.find({principal: princ2.id});
		parentOriginal.forEach(function(wk) {
		    var princ = Principals.findOne(wk.wrapped_for);
		    Principal.add_access(princ, newPrincipal, undefined);
		});
		
		// The following are required to remove the possibility the client cached keys.
		// TODO:Reencrypt data
		
		// Remove the children's pointers to the parent.
		// var childrenOriginal = WrappedKeys.find({wrapped_for:princ2.id});
		// childrenOriginal.forEach(function(wk){
		//     var child = wk.principal;
		//     Principal._remove_access(princ2, child, undefined);
		// });
		
		if (on_complete) {
		    on_complete();
		}
	    		
	    });

	}};

    Principal.prototype.create_certificate = function (princ) {
	var self = this;
	var msg = Certificate.contents(princ);
        var sig = crypto.sign(msg, self.keys.sign);
	
	return new Certificate(princ, self.id, sig);
    };
    


    Principal.prototype._secret_keys = function () {
	var self = this;
	return { decrypt: self.keys.decrypt, sign: self.keys.sign };
    };

    
    // Assumes user's private keys are sitting in localStorage.
    // How did they get there? What happens if they're not there?
    Principal.prototype.user = function () {
	var keys = Principal.deserialize_keys(localStorage['user_princ_keys']);
	return new Principal("user", Meteor.user().username, keys);
    };

    
    // loads secret keys for the principal self.id
    // by finding a chain to the current user and decrypts the secret keys
    Principal.prototype._load_secret_keys = function (on_complete) {
	var self = this;
	if (self.keys.decrypt && self.keys.sign) {
	    if (debug) console.log("secret keys available");
            on_complete(self);
	} else {
	    var auth = new Principal("user", Meteor.user().username,
				     deserialize_keys(localStorage['user_princ_keys']));
	    
	    if (debug) console.log("no sk keys:  invoke key chain");

	    // hack: rpc cannot stringify keys with json
	    var auth2 = new Principal(auth.type, auth.name, auth.keys);
	    auth2.keys = {};
	    var self2 = new Principal(self.type, self.name, self.keys);
	    self2.keys = {};
            Meteor.call("keychain", auth2,
			self2, function (err, chain) {
			    //if (debug) console.log("keychain returns: " + chain);
			    if (chain) {
				var sk = auth.keys.decrypt;
				var unwrapped = crypto.chain_decrypt(chain, sk);
				self.keys.decrypt = unwrapped.decrypt;
				self.keys.sign = unwrapped.sign;
				if (on_complete) {
				    on_complete(self);
				}
			    }
			    else {
				// Did not find a chain
				throw new Error("keychain not found");
				
			    }
			});
	}
    };
    

    Principal._erase_secret_keys = function() {
	this.keys.sign = undefined;
	this.keys.decrypt = undefined;
    }
    
    Principal._lookupByID = function(id, on_complete) {
	if (debug) console.log("lookupByID princ id " + id);

	Meteor.call("lookupByID", id, function(err, result) {
	    if (err) {
		throw new Error("could not find princ with id " + id);
	    }
	    var princ_info = result;
	    var p = new Principal(princ_info["type"], princ_info["name"], _get_keys(id));
	    
	    p._load_secret_keys(on_complete);
	});
    } 
    // returns the principal corresponding to the current user
    Principal.user = function () {
	var pname = localStorage['user_princ_name'];
	var pkeys = localStorage['user_princ_keys'];
	
	if (!pname || !pkeys) {
	    return undefined;
	}
	
	return new Principal('user', pname, deserialize_keys(pkeys));
    }

    // p1.allowSearch(p2) : p1 can now search on data encrypted for p2
    // since p2 can see p2's data, if p1 searches for a word that matches a word in p2's document
    // p2 knows which word p1 searched for because p2 knows p2's document
    // in cases where the search word is to be hidden, allowSearch should only be given
    // to trusted principals
    Principal.allowSearch = function(allowed_princ) {
	delta = Crypto.delta();
    }

    // returns a principal for the user with uname and feeds it as input to callback cb
    Principal.lookupUser = function(uname, cb) {

	if (!uname) {
	    throw new Error("cannot lookup user principal with uname " + uname);
	}
	
        idp.lookup(uname, function (keys) {
	    if (!keys) {
		if (debug) console.log("no keys found for " + uname);
		return;
	    }
	    cb(new Principal("user", uname, keys));
        });
    }
    
    /*
     Takes as input a list of PrincAttrs, and the username of a user -- authority
     and outputs a principal for attrs[0].
     The principal does not have secret keys loaded. 
    */
    Principal.lookup = function (attrs, authority, on_complete) {

	if (debug) console.log("Principal.lookup: " + authority + " attrs[0]: " + attrs[0].type + "=" + attrs[0].name);
	
	idp.lookup(authority, function (authority_pk) {
	    var auth_id =  get_id(authority_pk);

	    Meteor.call("lookup", attrs, auth_id, function (err, result) {
	
                if (err || !result) {
                    console.log("Principal lookup fails");
                    on_complete(undefined);
                    return;
                }
	
                var princ = result.principal;
                var certs = result["cert"];
		
	        var cert_attrs = _.zip(certs, attrs);
	        var princ_keys = deserialize_keys(princ);
                var subj_keys = princ_keys;
	
                var chain = _.map(cert_attrs, function (data) {
                    var cert = data[0];
                    var attr = data[1];
	
                    var pk = crypto.deserialize_public(EJSON.parse(cert.signer).verify,
						       "ecdsa");
                    var subject = new Principal(attr.type, attr.name, subj_keys);
                    var msg = Certificate.contents(subject);
                    // Load up subject keys for the next cert
                    subj_keys = deserialize_keys(cert.signer);
                    return {
			pk: pk,
			sig: cert.signature,
			m: msg
		    };
		});

		// The last cert should be signed by authority
		if (_.last(certs).signer !== auth_id) {
		    console.log("last cert is not signed by authority");
		    on_complete(undefined);
		} else {
		    var verified = crypto.chain_verify(chain);
		    if (verified) {
			if (debug) console.log("chain verifies");
			princ = new Principal(attrs[0].type, attrs[0].name, princ_keys);
			if (on_complete) {
			    on_complete(princ);
			}
		    } else {
			console.log("chain does not verify");
			if (on_complete) {
			    on_complete(undefined);
			}
		    }
		}
	    });
	});
    };

    
    
    Principal.prototype.public_keys = function () {
	var self = this;
	return { encrypt: self.keys.encrypt, verify: self.keys.verify };
    };

    /* Given an object keys, returns the id of a princ with those keys */
    get_id = function (keys) {
	var pk = {};
	pk.encrypt = crypto.serialize_public(keys.encrypt);
	pk.verify = crypto.serialize_public(keys.verify);
	return EJSON.stringify(pk);
    }
    
    Principal.prototype.set_id = function () {
	var self = this;
	self.id = get_id(self.keys);
    };

    // transforms an id into keys - crypto instance of public keys
    _get_keys = function(id) {
	var pk = EJSON.parse(id);

	return {
	    encrypt: crypto.deserialize_public(pk.encrypt, "elGamal"),
	    decrypt: undefined,
	    verify: crypto.deserialize_public(pk.verify, "ecdsa"),
	    sign: undefined
	}
    }

    // requires symmetric key of this principal to be set
    Principal.prototype.sym_encrypt = function(pt) {
	if (this.keys.sym_key) {
	    return crypto.sym_encrypt(self.keys.sym_key, pt);
	}
	throw new Error("encrypt key must be set");
    }

    // encrypts with either sym_key or public key
    // requires sym_key or public enc key to be set
    Principal.prototype.encrypt = function (pt) {
	var self = this;
	if (self.keys.sym_key) {
	    return {isSym: true, ct:crypto.sym_encrypt(self.keys.sym_key, pt)};
	}
	if (self.keys.encrypt) {
	    return {isSym: false, ct:crypto.encrypt(self.keys.encrypt, pt)};
	} 
	throw new Error("encrypt key must be set");
    };

    // requires keys.decrypt to be set
    Principal.prototype.decrypt = function (ct) {
	var self = this;
	if (self.keys.sym_key) {
	    return crypto.sym_decrypt(self.keys.sym_key, ct);
	}
	if (self.keys.decrypt) {
	    return crypto.decrypt(self.keys.decrypt, ct);
	} 
	throw new Error("cannot decrypt without decrypt key");
    };

    // requires sign key to be set
    Principal.prototype.sign = function (msg) {
	var self = this;
        if (self.keys.sign) {
            return crypto.sign(msg, self.keys.sign);
        } else {
            throw new Error("cannot sign with missing keys");
        }
    };
    
    Principal.prototype.verify = function (msg, sig) {
	var self = this;
	if (self.keys.verify) {
	    return crypto.verify(msg, sig, self.keys.verify);
	} else {
	    throw new Error("verify key must be set");
	}
    };

    
    //TODO: remove new Principal which gets name instead of id 
    
    processAccessInbox = function() {
	if (Meteor.user) {
	    var user = Principal.user();
	    var accessinbox = Principals.findOne({_id : user.id}).accessInbox;
	    _.each(accessinbox, function(wid){
		var w = WrappedKeys.findOne(wid);
		if (!w) {
		    Console.log("issue with access inbox and wrapped keys");
		}
		var subject_keys = base_crypto.decrypt(user.keys.decrypt, w["wrapped_keys"]);
		var sym_wrapped = base_crypto.sym_encrypt(user.keys.sym_key, subject_keys);
		WrappedKeys.update({_id: wid},
				   {$set : {wrapped_sym_keys : sym_wrapped,
					    wrapped_keys: undefined}
				   });
	    });
	}
    }

    Deps.autorun(processAccessInbox);
    
}

/* Algorithm for switching access from public key to private key.

   This happens in two ways:

   1. Access given to a user -- common case
   The user has an accessinbox which gets filled with information about a new access, and the user
   converts these to secret key as soon as the user logs in, in processAccessInbox

   2. Access given to an inner principal : NOT  YET IMPLEMENTED
   - the access is granted using the public key of the inner principal, if secret key is not available
   - when one searches for inner principal later and obtains its keys, one updates the wrapped key to be encrypted under the symmetric keys


   TODO: can avoid generating pks for terminal principals if we know the type graph ahead of time
   */

