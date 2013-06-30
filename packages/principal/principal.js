Principals = new Meteor.Collection("princs");
WrappedKeys = new Meteor.Collection("wrapped_keys");
Certs = new Meteor.Collection("certs");

var crypto;

PrincAttr = function (type, name) {
    this.type = type;
    this.name = name;
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

	    if (!from_princ.id || !from_princ.type) {
		throw new Error("from principal in key chain must have at least id and type set");
	    }

	    if (!to_princ.id || !to_princ.type) {
		throw new Error("to_princ in key chain must have at least id and type set");
	    }

	    console.log("keychain: from " + from_princ + " to " + to_princ);

	    var frontier = [
                             [ from_princ, [] ],
                           ];

            while (frontier.length > 0) {
                var new_frontier = [];
                var found_chain;
                _.each(frontier, function (node) {
                    var frontier_node = node[0];
                    var frontier_chain = node[1];

                    if (frontier_node.id === to_princ.id) {
                        found_chain = frontier_chain;
                    }

                    var next_hops = WrappedKeys.find({ wrapped_for: frontier_node }).fetch();
                    _.each(next_hops, function (next_hop) {
                        var new_chain = frontier_chain.concat([ next_hop.wrapped_key ]);
                        new_frontier.push([ next_hop.principal, new_chain ]);
                    });
                });
                if (found_chain) {
                    console.log("found chain: " + found_chain);
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
	  which is certified by Principal authority.
	  Returns a principal only if each of the
	  certificates is valid.

	  TODO: currently exhaustive lookup
	*/
        lookup: function (princattrs, authority) {

	    // princs maps a Principal to its certificate 
	    // initially the principal is authority with no certificate
            var princs = {};
            princs[authority] = "";
            princattrs.reverse();
	    
            for (var i = 0; i < princattrs.length; i++) {
		// current attribute
		var princattr = princattrs[i];
                var new_princs = {};
                _.each(princs, function (cert_unused, p) {
		    // p is current authority
                    var cs = Certs.find({
                        subject_type: princname.type,
                        subject_name: princname.name,
			signer : p.id
                    }).fetch();
		    // add each ceritificate to new_princs
                    _.each(cs, function (cert) {
                        new_princs[cert.subject_id] = cert;
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
    // If keys is not defined, it generates random keys
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
	this.set_id(keys); 

    }

    // Creates a new node in the principal graph for the given principal
    // Optional callback function on_complete.
    Principal.create = function (princ, on_complete) {
	
	Principals.insert({
	    '_id': princ.id
	    'type' : princ.type,
	    'name' : princ.name,
	});

    }

       
    //TODO: all this should run at the client
    
    // Gives princ1 access to princ2
    Principal.add_access = function (princ1, princ2, on_complete) {
	
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
            keys.decrypt = crypto.serialize_private(keys.decrypt);
            keys.sign = crypto.serialize_private(keys.sign);
            wrapped = princ1.encrypt(EJSON.stringify(keys));
	
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
    
    Principal.prototype._secret_keys = function () {
	var self = this;
	return { decrypt: self.keys.decrypt, sign: self.keys.sign };
    };
    
    
    // loads secret keys for the principal self.id
    // by finding a chain to the current principal Principal.user()
    // and using the users secret key to decrypt the chain
    Principal.prototype._load_secret_keys = function (on_complete) {
	var self = this;
	if (self.keys.decrypt && self.keys.sign) {
            on_complete();
	} else {
            Meteor.call("keychain", Principal.user().princ,
			self, function (err, chain) {
			    console.log("keychain returns: " + chain);
			    if (chain) {
				var sk = Principal.user().keys.decrypt;
				crypto.chain_decrypt(chain, sk, function (unwrapped) {
				    self.keys.decrypt = unwrapped.decrypt;
				    self.keys.sign = unwrapped.sign;
				    on_complete(self);
				});
			    } else {
				// Did not find a chain
				on_complete();
			    }
			});
	}
    };
    

    Principal._erase_secret_keys = function() {
	this.keys.sign = undefined;
	this.keys.decrypt = undefined;
    }
    
    Principal.lookupByID = function(id, on_complete) {
	princ_info = Principal.findOne({_id : id});
	if (!princ_info) {
	    throw new Error("could not find principal");
	}

	var p = new Principal(princ_info["type"], princ_info["name"], _get_keys(id));
	
	p._load_secret_keys(on_complete);
    }
    
    /*
     Takes as input a list of PrincAttrs, an authority Principal 
    */
    Principal.lookup = function (attrs, authority, on_complete) {
	console.log("Principal.lookup: " + authority + " attrs: " + attrs[0].type + "=" + attrs[0].name);
	idp.lookup(authority, function (authority_pk) {
            var auth_princ = new Principal(authority_pk);
            console.log("principal from idp: " + auth_princ.id);
            Meteor.call("lookup", attrs, auth_princ.id, function (err, result) {
                if (err || !result) {
                    console.log("Principal lookup fails");
                    on_complete(undefined);
                    return;
                }
                var princ = result.principal;
                var certs = result.certs;
                var cert_attrs = _.zip(certs, attrs);
                var princ_keys = Principal.deserialize_keys(princ);
                var subj_keys = princ_keys;
                var chain = _.map(cert_attrs, function (data) {
                    var cert = data[0];
                    var attr = data[1];
                    var pk = crypto.deserialize_public(EJSON.parse(
                        cert.signer
                    ).verify, "ecdsa");
                    var subject = new Principal(subj_keys);
                    var msg = Certificate.contents(subject, attr);
                    // Load up subject keys for the next cert
                    subj_keys = Principal.deserialize_keys(cert.signer);
                    return {
			pk: pk,
			sig: cert.signature,
			m: msg
		    };
		});
		
		// The last cert should be signed by authority
		if (_.last(certs).signer !== auth_princ.id) {
		    on_complete(undefined);
		} else {
		    crypto.chain_verify(chain, function (verified) {
			princ = new Principal(princ_keys);
			on_complete(verified ? princ : undefined);
		    });
		}
	    });
	});
    };
    
    
    Principal.prototype.public_keys = function () {
	var self = this;
	return { encrypt: self.keys.encrypt, verify: self.keys.verify };
    };
    
    Principal.prototype.set_id = function (keys) {
	var self = this;
	var pk = self.public_keys();
	pk.encrypt = crypto.serialize_public(pk.encrypt);
	pk.verify = crypto.serialize_public(pk.verify);
	self.id = EJSON.stringify(pk);
    };

    _get_keys = function(id) {
	var pk = EJSON.parse(id);
	return {
	    encrypt: crypto.deserialize_public(pk.encrypt),
	    decrypt: undefined,
	    verify: crypto.deserialize_public(pk.verify),
	    sign: undefined
	}
    }

    idp = (function () {
        var idp = "localhost:3001";
        var conn = Meteor.connect(idp);
        return {
            //find user's public keys on idp
            lookup: function (name, on_complete) {
                conn.call("get_public", name, function (err, result) {
                    console.log("get public keys from idp for " + name);
                    var keys = Principal.deserialize_keys(result);
                    on_complete(keys);
                });
            },
            //fetch user's private keys on idp
            get_keys: function (name, pwd, on_complete) {
                console.log("get private keys from idp for" + name);
                conn.call("get_keys", name, pwd, function (err, result) {
                    on_complete(result);
                });
            },
            //update user's keys on idp, create new user if not exists
            create_keys: function (name, pwd, on_complete) {
		console.log("create keys on idp for " + name);
                Principal.create([], function (nkeys) { 
                    conn.call("create_keys", name, pwd, nkeys.serialize_keys(), function (err, result) {
                        on_complete(result);
                    });
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
Certificate.prototype.store = function (on_complete) {
    var self = this;
    Certs.insert({
        subject_id: self.subject.id,
	subject_type: self.subject.type,
	subject_name: self.subject.name,
	subject_pk: self.subject.keys.public_keys,
	signer: self.signer.id,
	signature: self.signature
    });
    if (on_complete) {
        on_complete();
    }
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

Certificate.contents = function (princ) {
    return "(" + princ.id + ", " + princ.type + ", " + princ.name + ")"; 
};

