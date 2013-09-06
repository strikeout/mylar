/*
  Implements principals
*/


/* Principal object
   type
   name
   id : public key of principal
   keys: encrypt, decrypt (pk)
         sign, verify (pk),
	 sym_key (sym),
	 mk_key  (multi-key)

   every principal has mk_key whether used or not
   
   Serialization of keys:
   - Principal.keys is unserialized	 	 
   - id, type, name correspond to _id, type, name in the Principals collection
   - localStorage contains user_princ_keys serialized
   - idp server gets and returns serialized keys

   token : the token used to search for a word in a column "col"
     princ : princ under which the token is encrypted for
     princ_field: field of a collection where the principal for "col" is
     token: the actual cryptographic token
*/

var debug = true;
var crypto = base_crypto;

search_cb = undefined;

/******* Data structures ****/

PrincAttr = function (type, name) {
    this.type = type;
    this.name = name;
};


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

pretty = function(princ) {
    var res = "";
    if (princ.name) {
	res = res + princ.name + " ";
    }
    if (princ.type) {
	res = res  + princ.type + " ";
    }
    if (princ.keys) {
	res = res + serialize_keys(princ.keys);
    }

    return res;
    
}

/*****************************************************/

if (Meteor.isServer) {
    
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

	// returns the decription of a principal with _id;
	// the description is the doc in the Principals collection
	princInfo: function(id) {
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
                console.log("No principal found! Here is princ graph:");
		console.log(princ_graph());
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

    Deps.autorun(function() {
	var x = GlobalEnc.findOne({key : "add_access"});
	if (x) {
	    add_access_happened = x["value"];
	}
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
    _generate_keys = function(cb) {
	keys = crypto.generate_keys();
	Crypto.keygen(function(key) {
	    keys['mk_key'] = key;
	    cb(keys);
	});
    }

    // creates a principal of type and name
    // as certified by principal authority
    // and stores it in the principal graph
    // as certified by creator
    // naturally, creator gets access to this principal
    // runs callback cb upon completion on input the new principal
    Principal.create = function(type, name, creator, cb) {

	if (!type || !name || (type != "user" && !creator)) {
	    throw new Error("cannot create principal with invalid (type, name, creator) : ("
			    + type + ", " + name + ", " + creator +")");
	}

	if (creator && !creator.keys.sign) {
	    throw new Error("creator " + creator.name + " does not have sign keys available");
	}

	// check if type exists in Princ type, else create it
	var pt = PrincType.findOne({type: type});
	if (!pt) {
	    PrincType.insert({type:type, searchable: false});
	}

	_generate_keys(function(keys) {
	    var p = new Principal(type, name, keys);
	    Principal._store(p, creator);
	    if (creator) {
		Principal.add_access(creator, p, function(){cb(p);});	
	    } else {
		cb(p);
	    }
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
	    accessInbox: []
	});

	if (authority) {
	    if (!authority.keys || !authority.keys.sign || !authority.keys.decrypt) {
		throw new Error("authority does not have secret keys loaded");
		return;
	    } 
	    authority.create_certificate(princ).store();
	
	} 

    }


    //TODO: remove hardcoded Messages
    // word to search for by principal indicated by this
    // info must have fields collection and field,
    // and optionally args and cb
    Principal.prototype.search = function(word, info, cb) {
	var self = this;
	
	if (!word || word == "") {
	    return;
	}
	if (!info.collection && !info.field) {
	    throw new Error("must specify collection and field so I know where to search");
	}

	Crypto.token(self.keys.mk_key, word, function(token){
	    var search_info = {};
	    search_info["princ"] = self.id;
	    search_info["enc_princ"] = Messages._enc_fields[info.field].princ;
	    search_info["token"] = token;
	    search_info["field"] = info.field;
	    search_info["args"] = info.args;

	    console.log("in search cb is " +  cb);
	    Session.set("_search_cb", cb);
	    search_cb = cb;
	    Session.set("_search_info", search_info);
	});
	
    }

    Deps.autorun(function(){
	// check if subscriptions get closed properly
	
	var search_info = Session.get("_search_info");
	
	if (search_info) {
	    var token = search_info.token;
	    Meteor.subscribe("_search", search_info["args"], token,
			     search_info["enc_princ"], search_info["princ"], search_field_name(search_info["field"]),
			     function(){ // on ready handle
				 console.log("on ready for token " + token);
				 var cb = search_cb;
				 console.log("cb in deps is " + cb);
				 if (cb) {
				     cb(Messages.find({_tag: token}).fetch());
				 }
				 Session.set("_search_info", null);
				 Session.set("_search_cb", null);
			     });
	}
    });
    

    record_add_access = function() {
	if (!add_access_happened) {
	    var aa = GlobalEnc.findOne({key: "add_access"});
	    // update must be only by id in meteor
	    GlobalEnc.update({_id: aa._id}, {$set: {value: true}});
	    add_access_happened = true;
	}
    }
    
    // Gives princ1 access to princ2
    Principal.add_access = function (princ1, princ2, on_complete) {

	record_add_access();

	if (debug) console.log("add_access princ1 " + princ1.name + " to princ2 " + princ2.name);
	// need to load secret keys for princ2 and then add access to princ1
	// we do these in reverse order due to callbacks
	
	princ2._load_secret_keys(function(){
	    Principal._add_access(princ1, princ2, on_complete);
	});
    };
    
    var updateWrappedKeys = function(pid, pid_for, wpk, wsym, delta) {
	var entry = WrappedKeys.findOne({principal: pid, wrapped_for: pid_for});

	if (!entry) {
	    var entry_id = WrappedKeys.insert({principal:pid,
					       wrapped_for:pid_for,
					       wrapped_keys: wpk,
					       wrapped_sym_keys: wsym,
					       delta: delta});
	    return entry_id;
	} else {
	    WrappedKeys.update({_id: entry._id},
			       {$set: {principal:pid, wrapped_for:pid_for, wrapped_keys: wpk, wrapped_sym_keys: wsym, delta:delta}});
	    return entry._id;
	}
    }
    
    // give princ1 access to princ2
    // encrypt's the keys of princ2 with princ 1's keys and
    // stores these new wrapped keys
    Principal._add_access = function (princ1, princ2, cb) {
	if (!princ2._has_secret_keys()) {
	    throw new Error("princ2 should have secret keys loaded");
	}

	var pt = serialize_private(princ2.keys);

	if (princ1._has_secret_keys()) { // encrypt symmetrically
	    wrap = princ1.sym_encrypt(pt);
	    // can compute delta as well so no need for access inbox
	    Crypto.delta(princ1.keys.mk_key, princ2.keys.mk_key, function(delta) {
		updateWrappedKeys(princ2.id, princ1.id, undefined, wrap, delta);
		if (cb) { cb(); }
	    });
	    return;
	}

	// encrypt using public keys
	var wrap = crypto.encrypt(princ1.keys.encrypt, pt);
	var entry_id = updateWrappedKeys(princ2.id, princ1.id, wrap.ct, null);
	// update user inbox for delta
	if (princ1.type == "user") {
	    Principals.update({_id : princ1.id}, {$push: {accessInbox: entry_id}});
	}
	if (cb)  {cb(); }
		
    };
    
    // Removes princ1 access to princ2
    Principal.remove_access = function (princ1, princ2, on_complete) {
	if (debug) console.log("remove_access princ1 " + princ1.name + " to princ2 " + princ2.name);
	    var inner = Principal._remove_access(princ1, princ2, on_complete);
	    princ2._load_secret_keys(inner);
    };


    Principal._remove_access = function (princ1, princ2, on_complete) {
	return function () { 

        // Remove WK from princ1.
	    var wrappedID = WrappedKeys.findOne({principal: princ2.id, wrapped_for: princ1.id})._id;
        WrappedKeys.remove(wrappedID);

        // Create a new principal.
        Principal.create(princ2.type, princ2.name, function(newPrincipal){
		    // Add new WK for new principal.
		    var parentOriginal = WrappedKeys.find({principal: princ2.id});
            var cb = _.after(parentOriginal.length, function() {
		        // The following are required to remove the possibility the client cached keys.
		        // TODO:Reencrypt data
		        
		        // Remove the children's pointers to the parent.
		        // var childrenOriginal = WrappedKeys.find({wrapped_for:princ2.id});
		        // childrenOriginal.forEach(function(wk){
		        //     var child = wk.principal;
		        //     Principal._remove_access(princ2, child, undefined);
		        // });
                on_complete();
            });
		    parentOriginal.forEach(function(wk) {
		        var princ = Principals.findOne(wk.wrapped_for);
		        Principal.add_access(princ, newPrincipal, cb);
		    });
	    });

	}};

    Principal.prototype.create_certificate = function (princ) {
	var self = this;
	var msg = Certificate.contents(princ);
        var sig = crypto.sign(msg, self.keys.sign);
	
	return new Certificate(princ, self.id, sig);
    };
    
    // returns true if it has all secret keys
    // throws exception if it only has a subset of the secret keys
    Principal.prototype._has_secret_keys = function() {
	var self = this;
	if (!self.keys) {
	    return false;
	}
	if (self.keys.decrypt && self.keys.sign && self.keys.mk_key && self.keys.sym_key) {
	    return true;
	}
	if (self.keys.decrypt || self.keys.sign || self.keys.mk_key || self.keys.sym_key) {
	    throw new Error("principal " + princ.id + " type " + princ.type + " has partial secret keys" );
	}
	return false;
    }
    // loads secret keys for the principal self.id
    // by finding a chain to the current user and decrypts the secret keys
    Principal.prototype._load_secret_keys = function (on_complete) {
	var self = this;
	if (self._has_secret_keys()) {
	    if (debug) console.log("secret keys available" + pretty(self));
            on_complete(self);
	} else {
	    var auth = Principal.user();
		
	    if (debug) console.log("no sk keys:  invoke key chain");

	    // create principals with no keys for the server
	    var auth2 = new Principal(auth.type, auth.name, auth.keys);
	    auth2.keys = {};
	    var self2 = new Principal(self.type, self.name, self.keys);
	    self2.keys = {};
            Meteor.call("keychain", auth2,
			self2, function (err, chain) {
			    //if (debug) console.log("keychain returns: " + chain);
			    if (chain) {
				self.keys = _.extend(self.keys, base_crypto.chain_decrypt(chain, auth.keys));
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

    // finds a principal based on his ID and gives this principal
    // to on_complete callback; this principal will have secret keys loaded
    Principal._lookupByID = function(id, on_complete) {
	if (debug) console.log("lookupByID princ id " + id);

	Meteor.call("princInfo", id, function(err, princ_info) {
	    if (err) {
		throw new Error("could not find princ with id " + id);
	    }
	    var p = new Principal(princ_info["type"], princ_info["name"], _get_keys(id));
	    
	    p._load_secret_keys(on_complete);
	});
    } 

    // returns the principal corresponding to the current user
    Principal.user = function () {
	var pkeys = deserialize_keys(localStorage['user_princ_keys']);

	var user = Meteor.user();
	
	if (!user || !pkeys) {
	    return undefined;
	}
	
	return new Principal('user', user.username, pkeys);
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
	    cb(new Principal("user", uname, deserialize_keys(keys)));
        });
    }
    
    /*
     Takes as input a list of PrincAttrs, and the username of a user -- authority
     and outputs a principal for attrs[0].
     The principal does not have secret keys loaded. 
    */
    Principal.lookup = function (attrs, authority, on_complete) {

	if (debug)
	    console.log("Principal.lookup: " + authority + " attrs[0]: " + attrs[0].type + "=" + attrs[0].name);
	
	idp.lookup(authority, function (authority_pk) {
	    if (!authority_pk) {
		throw new Error("idp did not find user " + authority);
	    }
	    var auth_id =  get_id(deserialize_keys(authority_pk));

	    Meteor.call("lookup", attrs, auth_id, function (err, result) {
	
                if (err || !result) {
                    throw new Error("Principal lookup fails");
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
	return serialize_public(keys);
    }
    
    Principal.prototype.set_id = function () {
	var self = this;
	self.id = get_id(self.keys);
    };

    // transforms an id into keys - crypto instance of public keys
    _get_keys = function(id) {
	return deserialize_keys(id);
    }

    // requires symmetric key of this principal to be set
    Principal.prototype.sym_encrypt = function(pt) {
	var self = this;
	if (self.keys.sym_key) {
	    return crypto.sym_encrypt(self.keys.sym_key, pt);
	}
	throw new Error("encrypt key must be set");
    }

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

    
    processAccessInbox = function() {
	if (Meteor.user()) {
	    console.log("userid is " + Meteor.user().username);
	    var uprinc = Principal.user();
	    var dbprinc = Principals.findOne({_id : uprinc.id});
	    if (dbprinc) {
		_.each(db.accessInbox, function(wid){
		    var w = WrappedKeys.findOne(wid);
		    if (!w) {
			Console.log("issue with access inbox and wrapped keys");
		    }
		    var subject_keys = base_crypto.decrypt(user.keys.decrypt, w["wrapped_keys"]);
		    var sym_wrapped = base_crypto.sym_encrypt(user.keys.sym_key, subject_keys);
		    // compute delta as well
		    var delta = Crypto.delta(uprinc.keys.mk_key, subject_keys.mk_key, function(delta) {
			WrappedKeys.update({_id: wid},
					   {$set : {wrapped_keys: undefined,
						    delta : delta, 
						    wrapped_sym_keys : sym_wrapped}
					   });
		    });
		});
	    }
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

