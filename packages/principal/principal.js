Principals = new Meteor.Collection("princs");
WrappedKeys = new Meteor.Collection("wrapped_keys");
Certs = new Meteor.Collection("certs");

var crypto;

var debug = false;

PrincAttr = function (type, name) {
    this.type = type;
    this.name = name;
};


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

all_certs = function() {
    var certs = Certs.find({}).fetch();
	var res = "";
    _.each(certs, function(doc) {
	res = res + "subject: " + doc["subject_id"] + " type " + doc["subject_type"] + " name " + doc["subject_name"] + " SIGNER: " + doc["signer"] + "\n";
    });
    return res;
}


deserialize_keys = function (ser) {
    var keys = EJSON.parse(ser);
    if (keys.encrypt) {
        keys.encrypt = crypto.deserialize_public(keys.encrypt, "elGamal");
    }
    if (keys.decrypt) {
        keys.decrypt = crypto.deserialize_private(keys.decrypt, "elGamal");
    }
    if (keys.sign) {
        keys.sign = crypto.deserialize_private(keys.sign, "ecdsa");
    }
    if (keys.verify) {
        keys.verify = crypto.deserialize_public(keys.verify, "ecdsa");
    }
    return keys;
};


serialize_keys = function (keys) {
    var ser = {};
    _.each(["encrypt", "verify"], function (k) {
        if (keys[k]) {
            ser[k] = crypto.serialize_public(keys[k]);
        }
    });
    _.each(["sign", "decrypt"], function (k) {
        if (keys[k]) {
            ser[k] = crypto.serialize_private(keys[k]);
        }
    });
    ser = EJSON.stringify(ser);
    return ser;
};

if (Meteor.isServer) {

    var allow_all_writes = {
        insert: function () { return true; },
        update: function () { return true; }
    };
    
    Principals.allow(allow_all_writes);
    WrappedKeys.allow(allow_all_writes);
    Certs.allow(allow_all_writes);

  
    
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
                        var new_chain = frontier_chain.concat([ next_hop.wrapped_key ]);
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


if (Meteor.isClient) {
    crypto = (function () {
        var curve = 192;
        return {
            serialize_public: function (key) {
                return sjcl.codec.hex.fromBits(
                    key._point.toBits()
                );
            },
            serialize_private: function (key) {
                return sjcl.codec.hex.fromBits(
                    key._exponent.toBits()
                );
            },
            deserialize_public: function (ser, system) {
                var c = sjcl.ecc.curves['c' + curve];
                var pt = c.fromBits(
                    sjcl.codec.hex.toBits(ser)
                );
                return new sjcl.ecc[system].publicKey(c, pt);
            },
            deserialize_private: function (ser, system) {
                var c = sjcl.ecc.curves['c' + curve];
                var exp = sjcl.bn.fromBits(
                    sjcl.codec.hex.toBits(ser)
                );
                return new sjcl.ecc[system].secretKey(c, exp);
            },

            generate_keys: function () {
                var enc = sjcl.ecc.elGamal.generateKeys(curve, 0);
                var sig = sjcl.ecc.ecdsa.generateKeys(curve, 0);
                return {
                    encrypt: enc.pub,
                    decrypt: enc.sec,
                    sign: sig.sec,
                    verify: sig.pub
                };
            },

            encrypt: function (pk, data) {
                return sjcl.encrypt(pk, data);
            },

            decrypt: function (sk, ct) {
                return sjcl.decrypt(sk, ct);
            },

            sign: function (msg, sk) {
                var hash = sjcl.hash.sha256.hash(msg);
                return sk.sign(hash);
            },

            verify: function (msg, sig, pk, on_complete) {
                var hash = sjcl.hash.sha256.hash(msg);
                try {
                    pk.verify(hash, sig);
                    return true;
                } catch (e) {
                    return false;
                }
            },

	    /* Starting with a secret key sk,
	       unwraps keys in chain, until it obtains
	       the secret key at the end of the chain. */
            chain_decrypt: function (chain, sk) {
                var secret_keys;
                _.each(chain, function (wk) {
                    var unwrapped = sjcl.decrypt(sk, wk);
                    secret_keys = EJSON.parse(unwrapped);
                    sk = crypto.deserialize_private(secret_keys.decrypt,
                                                    "elGamal");
                });
                secret_keys.sign = crypto.deserialize_private(
                    secret_keys.sign, "ecdsa"
                );
                secret_keys.decrypt = sk;
                return secret_keys;
            },

            chain_verify: function (chain) {
                chain = _.map(chain, function (cert) {
                    var hash = sjcl.hash.sha256.hash(cert.m);
                    var pk = cert.pk;
                    try {
                        pk.verify(hash, cert.sig);
                        return true;
                    } catch (e) {
                        return false;
                    }
                });
                return _.every(chain, _.identity);
            }
        };
    })();

    // Constructs a new principal
    // keys is optional, and is generated randomly if missing
    Principal = function(type, name, keys) {
	if (type == '')
	    throw new Error("Principal needs a type");
	
	this.type = type;
	this.name = name;
	
	if (!keys) {
	    keys = crypto.generate_keys();
	}
	
	this.keys = keys;
        
	/* Currently, id is public keys. 
	 * If too long, generate a random id.
	 */
	this.set_id(); 

    }

    // creates a principal of type and name
    // as certified by principal authority
    // and stores it in the principal graph
    // as certified by creator
    // naturally, creator gets access to this principal
    // runs callback cb upon completion
    // returns the principal created
    Principal.create = function(type, name, creator, cb) {

	if (!type || !name || !creator) {
	    throw new Error("cannot create principal with invalid (type, name, creator) : ("
			    + type + ", " + name + ", " + creator +")");
	}

	if (!creator.keys.sign) {
	    throw new Error("creator " + creator.name + " does not have sign keys available");
	}
	
	var p = new Principal(type, name);
	Principal._store(p, creator);
	Principal.add_access(creator, p, cb);
	return p;
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

	if (debug) console.log("add_access princ1 " + princ1.name + " to princ2 " + princ2.name);
	// need to load secret keys for princ2 and then add access to princ1
	// we do these in reverse order due to callbacks
	
	var inner = Principal._add_access(princ1, princ2, on_complete);
	princ2._load_secret_keys(inner);
    };
    
    
    // encrypt's the keys of princ2 with princ 1's keys and
    // stores these new wrapped keys
    Principal._add_access = function (princ1, princ2, on_complete) {
	return function () {
            var keys = princ2._secret_keys();
	    if (!keys) {
		throw new Error("princ2 should have secret keys loaded");
	    }
	    keys.decrypt = crypto.serialize_private(keys.decrypt);
            keys.sign = crypto.serialize_private(keys.sign);
            var wrapped = princ1.encrypt(EJSON.stringify(keys));
	    
            WrappedKeys.insert({
		principal: princ2.id,
		wrapped_for: princ1.id,
		wrapped_key: wrapped
            });

	    if (on_complete) {
		on_complete();
	    }
	    
	};
    };
    
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
	return new Principal(keys);
    };

    
    // loads secret keys for the principal self.id
    // by finding a chain to the current user and decrypts the secret keys
    Principal.prototype._load_secret_keys = function (on_complete) {
	var self = this;
	if (self.keys.decrypt && self.keys.sign) {
	    if (debug) console.log("secret keys available");
            on_complete();
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
			    if (debug) console.log("keychain returns: " + chain);
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
	princ_info = Principal.findOne({_id : id});
	if (!princ_info) {
	    throw new Error("could not find principal");
	}

	var p = new Principal(princ_info["type"], princ_info["name"], _get_keys(id));
	
	p._load_secret_keys(on_complete);
    }

    // returns the principal corresponding to the current user
    Principal.user = function () {
	var pname = localStorage['user_princ_name'];
	var pkeys = localStorage['user_princ_keys'];
	
	if (!pname || !pkeys) {
	    console.log("USERPRINC UNDEFINED");
	    return undefined;
	}
	
	return new Principal('user', pname, deserialize_keys(pkeys));
    }


    // returns a principal for the user with uname and feeds it as input to callback cb
    Principal.lookupUser = function(uname, cb) {

	if (!uname) {
	    throw new Error("cannot lookup user principal with uname " + uname);
	}
	
        idp.lookup(uname, function (keys) {
	    if (!keys) {
		console.log("no keys found for " + uname);
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

    _get_keys = function(id) {
	Meteor._debug("parsing" +  id);
	var pk = EJSON.parse(id);
	return {
	    encrypt: crypto.deserialize_public(pk.encrypt),
	    decrypt: undefined,
	    verify: crypto.deserialize_public(pk.verify),
	    sign: undefined
	}
    }


    // requires public key to be set
    Principal.prototype.encrypt = function (pt) {
	var self = this;
	if (self.keys.encrypt) {
	    return crypto.encrypt(self.keys.encrypt, pt);
	} else {
	    throw new Error("encrypt key must be set");
	}
    };

    // requires keys.decrypt to be set
    Principal.prototype.decrypt = function (ct) {
	var self = this;
	if (self.keys.decrypt) {
	    return crypto.decrypt(self.keys.decrypt, ct);
	} else {
	    throw new Error("cannot decrypt without decrypt key");
	}
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
    
    idp = (function () {
        var idp = "localhost:3001";
        var conn = Meteor.connect(idp);
        return {
            //find user's public keys on idp, returns keys deserialized
            lookup: function (name, on_complete) {
                conn.call("get_public", name, function (err, result) {
                    if (debug) console.log("get public keys from idp for " + name);
                    var keys = deserialize_keys(result);
                    on_complete(keys);
                });
            },
            //fetch user's private keys on idp
            get_keys: function (name, pwd, on_complete) {
		console.log("get keys for " + name);
                conn.call("get_keys", name, pwd, function (err, result) {
                    on_complete(result);
                });
            },
            //update user's keys on idp, create new user if not exists
            create_keys: function (name, pwd, on_complete) {
		if (debug) console.log("create keys on idp for " + name);
		var nkeys = crypto.generate_keys();
                conn.call("create_keys", name, pwd, serialize_keys(nkeys),
			  function (err, result) {
                              on_complete(result);
			  });
            }
        };
    })();
    
}


/*
   Receives as input
   subject : Principal
   signer: id of signinig Principal
   signature
   verified 
 */
Certificate = function (subject, signer, signature) {

    this.subject = subject; // Principal
    this.signer = signer; // Principal id
    this.signature = signature; // string
    this.verified = false;
};

/*
   This must have the following fields set:
   id, type, name, pk
*/
Certificate.prototype.store = function () {
    var self = this;
    Certs.insert({
        subject_id: self.subject.id,
	subject_type: self.subject.type,
	subject_name: self.subject.name,
	signer: self.signer,
	signature: self.signature
    });

 };


Certificate.prototype.verify = function (on_complete) {
    var self = this;
    var msg = Certificate.contents(self.subject);
    var vk = self.signer.keys.verify;

    function verified(passed) {
        self.verified = passed;
        on_complete(self.verified);
    }

    crypto.verify(msg, self.signature, vk, verified);
};

//TODO: verify consistency public keys and id
Certificate.contents = function (princ) {
    return "(" + princ.id + ", " + princ.type + ", " + princ.name + ")"; 
};

