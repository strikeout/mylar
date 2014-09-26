/*
 Implements principals
 */

var debug = false;

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



var crypto = base_crypto;



// returns true if the attacker is active
active_attacker = function() {
    return (typeof MYLAR_ACTIVE_ATTACKER != "undefined");
}

/******** Use search or not ****/

function use_search(){
    return (typeof MYLAR_USE_SEARCH != "undefined") && MYLAR_USE_SEARCH;
}


/******* Data structures ****/

PrincAttr = function (type, name) {
    this.type = type;
    this.name = name;
};

/*****************  Principal cache ***********/
/*- caches only princs with loaded secret keys
 - princs are cached by id or by type+name; in
 the latter case, they are cached with the username that
 certified them to prevent attacks
 */

princ_cache = {};

var princ_str = function(name, type, auth_user) {
    var princ_def = JSON.stringify({name: name, type: type, auth_user: auth_user});
    return princ_def;
}

// adds princ to cache
// auth optional {uname: ...or princ: ..}
var cache_add = function(princ, auth){
    if (princ && princ._has_secret_keys()) {
        princ_cache[princ._id] = princ;
        if (auth) {
            var uname = auth.uname;
            if (auth.princ && auth.princ.type == "user") {
                uname = auth.princ.name;
            }
            if (uname) {
                var princ_def = princ_str(princ.name, princ.type, uname);
                princ_cache[princ_def] = princ;
            }
        }
    }
}

var cache_get_id = function(id) {
    return princ_cache[id];
}

var cache_get_certif = function(attrs, auth) {
    if (attrs.length != 1 || !auth) {
        return undefined;
    }
    //return undefined;
    var princ_def = princ_str(attrs[0].name, attrs[0].type, auth);
    return princ_cache[princ_def];
}

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

// takes as input a principal or a string
pretty = function(princ) {

    if (typeof princ == "string") {
        return princ;
    }
    var res = "";

    if (!princ) {
        return res;
    }

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
        }
        if (doc.wrapped_keys) {
            return {isSym: false, wkey: doc.wrapped_keys};
        }
        throw new Exception("wrapped keys does not actually have wrappedkeys!");
    }

    Meteor.methods({

        /* Given from_princ and to_princ of type Principal,
         finds a key chain from_princ to to_princ. from_princ has access
         to to_princ thru this chain.
         TODO: Currently exhaustive search. */
        keychain: function (from_id, from_type, to_id, to_type) {

            if (debug)
                console.log("KEYCHAIN: from", from_id, from_type, "to", to_id, to_type);

            if (!from_id || !from_type) {
                throw new Error("from principal in key chain must have at least id and type set");
            }

            // removed to_type check here, because to_type doesnt
            // get passed along when from_id and to_id are equal (user_princ)
            if (!to_id || !to_type) {
                throw new Error("to_princ in key chain must have at least id and type set");
            }

            // frontier is a list of principal id-s and
            // the wrapped keys to reach them starting from from_princ
            var frontier = [
                [ from_id, [] ]
            ];

            var found_chain;
            while (frontier.length > 0) {
                var new_frontier = [];

                _.each(frontier, function (node) {
                    var frontier_id = node[0];
                    var frontier_chain = node[1];

                    if (frontier_id === to_id) {
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

            if (debug) console.log("did not find a chain from", from_type, "to", to_type);
            return undefined;
        },

        // returns the decription of a principal with _id;
        // the description is the doc in the Principals collection
        princInfo: function(id) {
            return Principals.findOne({_id: id});
        },

        userPK : function(uname) {
            return Meteor.users.findOne({_princ_name: uname},
                {fields: {_pk: 1, _pubkey_cert: 1}});
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

            if (debug) console.log("lookup " + JSON.stringify(princattrs) + " auth " + authority);

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
                    if (debug) console.log("looking for name " + princattr.name + " signed by " + princid);
                    if (debug) console.log("found " + cs.length);
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
                if (debug) console.log("No principal found! Here is princ graph:");
                if (debug) console.log(princ_graph());
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
        if (!pt) PrincType.insert({type: type, searchable: false});


        // check if Principal already exists, return if it does
        var princ = Principals.findOne({type: type, name: name});
        if (princ) {
            console.log('found princ, not creating new', princ)
            return cb(princ);
        }


        generate_princ_keys(function(keys) {
            var p = new Principal(type, name, keys);
            cache_add(p, {'princ': creator});
            Principal._store(p, creator);
            if (creator) {
                Principal.add_access(creator, p, function () {
                    if (debug) console.log("Principal.add_access to: creator", creator);
                    cb(p);
                });
            } else {
                cb(p);
            }
        });
    }

    /* Creates a static principal and stores it at the server.
     Gives access to creator to this principal.
     keys must contain private keys
     Calls cb on the newly created principal.
     given keys are stringified
     */
    Principal.create_static = function(type, name, keys, creator, cb) {
        if (!type || !name) {
            throw new Error("cannot create principal with invalid (type, name) "
                + type + ", " + name);
        }

        var p = new Principal(type, name, deserialize_keys(keys));

        if (!p._has_secret_keys()) {
            throw new Error("cannot create static principal without its public keys");
        }

        cache_add(p);

        var pt = PrincType.findOne({type: type, name:name});
        if (!pt) {
            PrincType.insert({type:type, name:name});
            Principal._store(p, null, true);
        }

        if (creator) {
            Principal.add_access(creator, p,
                function(){cb && cb(p);});
        }

        return p;
    }

    /*
     Returns the principal with type, name, keys.
     Keys are stringified.
     */
    Principal.get_static = function(type, name, keys) {
        return new Principal(type, name, deserialize_keys(keys));
    }

    function wrap_message(princ) {
        return JSON.stringify({
            msg : 'wrapkeys',
            name : princ.name,
            keys : serialize_keys(princ.keys)
        });
    }
    // returns a string which is the wrapped principal princ
    // under the password 
    Principal.wrap = function(password, princ) {
        return sjcl.encrypt(password, wrap_message(princ));
    }

    // returns serialized keys of the principal wrapped in wrap
    // with password
    Principal.unwrap = function(password, wrap, uname) {
        var unwrapped = JSON.parse(sjcl.decrypt(password, wrap));
        if (unwrapped.msg != "wrapkeys") {
            throw new Error("invalid wrapped key");
        }
        if (unwrapped.name != uname) {
            throw new Error("uname in unwrapped key does not match");
        }

        return unwrapped.keys;

    }




// generates keys: standard crypto + multi-key
    generate_princ_keys = function(cb) {
        keys = crypto.generate_keys();
        if (use_search()) {
            var done_cb = function (key) {
                keys['mk_key'] = key;
                cb(keys);
            }
            if (Meteor.isClient) {
                MylarCrypto.keygen(done_cb);
            } else {
                var key = crypto_server.keygen();
                done_cb(key);
            }
        } else {
            cb(keys);
        }
    };



    /*
     Loads its secret keys if current user has access to it.
     */
    Principal.prototype.load_secret_keys = function(cb) {
        var newprinc = cache_get_id(this._id);
        if (newprinc) {
            cb && cb(newprinc);
            return;
        }
        this._load_secret_keys(cb);
        //TODO: verify that returned princ keys
        //indeed correspond to pubkeys
    }

    // Creates a new node in the principal graph for the given principal
    // If authority is specified:
    //   -- makes princ certified by authority
    //   -- authority must have secret keys loaded
    Principal._store = function (princ, authority, is_static) {

        if (debug) console.log("CREATE princ: " + princ.name + " keys " + JSON.stringify(princ.keys.sym_key)  + " id " + princ._id);

        if (!is_static) {
            is_static = false;
        }
        Principals.insert({
            '_id': princ._id,
            'type' : princ.type,
            'name' : princ.name,
            accessInbox: [],
            is_static: is_static
        });

        if (authority) {
            if (!authority.keys || !authority.keys.sign || !authority.keys.decrypt) {
                throw new Error("authority does not have secret keys loaded");
                return;
            }
            authority.create_certificate(princ).store();

        }

    }


    // Gives princ1 access to princ2
    // runs on_complete on no input
    Principal.add_access = function (princ1, princ2, on_complete) {

        startTime("PRINC_ACCESS");
        if (debug) console.log("add_access princ1 " + princ1.name + " to princ2 " + princ2.name);
        // need to load secret keys for princ2 and then add access to princ1
        // we do these in reverse order due to callbacks

        princ2._load_secret_keys(function(){
            Principal._add_access(princ1, princ2, function() {
                endTime("PRINC_ACCESS");
                on_complete && on_complete();
            });
        });
    };

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

            if (use_search()) {
                // can compute delta as well so no need for access inbox
                MylarCrypto.delta(princ1.keys.mk_key, princ2.keys.mk_key, function(delta) {
                    Meteor.call("updateWrappedKeys", princ2._id, princ1._id, null, wrap, delta, false, cb);
                });
            } else {
                Meteor.call("updateWrappedKeys", princ2._id, princ1._id, null, wrap, null, false, cb);
            }
            return;
        }

        // encrypt using public keys
        var wrap = crypto.encrypt(princ1.keys.encrypt, pt);
        Meteor.call("updateWrappedKeys", princ2._id, princ1._id, wrap, null, null, true, cb);
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
            var wrappedID = WrappedKeys.findOne({principal: princ2._id, wrapped_for: princ1._id})._id;
            WrappedKeys.remove(wrappedID);

            // Create a new principal.
            Principal.create(princ2.type, princ2.name, function(newPrincipal){
                // Add new WK for new principal.
                var parentOriginal = WrappedKeys.find({principal: princ2._id});
                var cb = _.after(parentOriginal.length, function() {
                    // The following are required to remove the possibility the client cached keys.
                    // TODO:Reencrypt data

                    // Remove the children's pointers to the parent.
                    // var childrenOriginal = WrappedKeys.find({wrapped_for:princ2._id});
                    // childrenOriginal.forEach(function(wk){
                    //     var child = wk.principal;
                    //     Principal._remove_access(princ2, child, undefined);
                    // });
                    on_complete && on_complete();
                });
                parentOriginal.forEach(function(wk) {
                    var princ = Principals.findOne(wk.wrapped_for);
                    Principal.add_access(princ, newPrincipal, cb);
                });
            });

        }};

    // Principal should not be serialized with JSON.
    Principal.prototype.toJSONValue = function () {
        throw new Error('cannot serialize Principal');
    };

    Principal.prototype.clone = function () {
        throw new Error('cannot clone Principal');
    };

    Principal.prototype.typeName = function () {
        return 'Principal';
    };

    EJSON.addType('Principal', function () {
        throw new Error('cannot deserialize Principal');
    });

    // Principal methods
    Principal.prototype.create_certificate = function (princ) {
        var self = this;
        var msg = Certificate.contents(princ);
        var sig = crypto.sign(msg, self.keys.sign);

        return new Certificate(princ, self._id, sig);
    };


    // returns true if it has all secret keys
    // throws exception if it only has a subset of the secret keys
    Principal.prototype._has_secret_keys = function() {
        var self = this;
        if (!self.keys) {
            return false;
        }
        if (self.keys.decrypt && self.keys.sign &&
            (!use_search() || self.keys.mk_key) && self.keys.sym_key) {
            return true;
        }
        if (self.keys.decrypt || self.keys.sign || (use_search() && self.keys.mk_key) || self.keys.sym_key) {
            throw new Error("principal " + self._id + " type " + self.type
                + " has partial secret keys" + serialize_keys(self.keys));
        }
        return false;
    }
    // loads secret keys for the principal self._id
    // by finding a chain to the current user and decrypts the secret keys
    Principal.prototype._load_secret_keys = function (on_complete, tentative) {
        var self = this;
        if (self._has_secret_keys()) {
            if (debug) console.log("secret keys available" + pretty(self));
            on_complete(self);
        } else {
            var auth = Principal.user();

            if (debug) console.log("no sk keys:  invoke key chain");

            if (auth) Meteor.call("keychain", auth._id, auth.type, self._id, self.type,
                function (err, chain) {
                    if (debug) console.log("keychain returns: " + JSON.stringify(chain), err);

                    if (chain) {
                        self.keys = _.extend(self.keys, base_crypto.chain_decrypt(chain, auth.keys));
                        if (on_complete) on_complete(self);
                    }
                    else {
//                        if (tentative)
                        on_complete && on_complete(undefined);
//                        else throw new Error("keychain not found");  // Did not find a chain
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
        startTime("lookup");

        var p = cache_get_id(id);
        if (p) {
            endTime("lookup");
            if (debug) console.log("HIT");
            on_complete(p);
            return;
        } else {
            if (debug) console.log("MISS");
        }

        if (debug) console.log("lookupByID princ id: " + id);

        Meteor.call("princInfo", id, function (err, princ_info) {
            if (!princ_info) {
                throw new Error("could not find princ with id " + id);
            }
            var p = new Principal(princ_info["type"], princ_info["name"], _get_keys(id));

            p._load_secret_keys(function(p){
                cache_add(p);
                endTime("lookup");
                on_complete(p);
            });
        });
    }

    var current_user = undefined;

    // returns the principal corresponding to the current user
    Principal.user = function () {
        var username = localStorage['user_princ_name'];

        if (!username) {
            return undefined;
        }

        if (current_user !== undefined &&
            username == current_user.name)
            return current_user;

        var pkeys = localStorage['user_princ_keys'];

        if (!pkeys) {
            return undefined;
        }

        current_user = new Principal('user', username, deserialize_keys(pkeys));
        return current_user;
    }

    Principal.set_current_user_keys = function (keys, username) {
        localStorage['user_princ_keys'] = keys;
        localStorage['user_princ_name'] = username;
        current_user = undefined;
    }
    Principal.delete_current_user_keys = function()
    {
        delete localStorage['user_princ_keys'];
        delete localStorage['user_princ_name'];
        current_user = undefined;
    }

    // p1.allowSearch(p2) : p1 can now search on data encrypted for p2
    // since p2 can see p2's data, if p1 searches for a word that matches a word in p2's document
    // p2 knows which word p1 searched for because p2 knows p2's document
    // in cases where the search word is to be hidden, allowSearch should only be given
    // to trusted principals
    Principal.allowSearch = function(allowed_princ) {
        delta = MylarCrypto.delta();
    }

    /* Wraps the secret keys of the principal for the user uname
     using password and provides it to cb as argument.
     It does not change the DB at the server. */
    Principal.rewrappedKey = function(uname, password, cb) {

        Principal.lookupUser(uname, function(userprinc) {
            userprinc.load_secret_keys(function(uprinc) {
                var ukeys = serialize_keys(uprinc.keys)
                cb && cb(sjcl.encrypt(password, ukeys));
            });
        });

    }


    // returns a principal for the user with uname and feeds it as input to callback cb
    Principal.lookupUser = function(uname, cb) {
        startTime("lookupUser");
        var cb2 = function(princ) {
            endTime("lookupUser");
            cb && cb(princ);
        }

        if (!uname) {
            throw new Error("cannot lookup user principal with uname " + uname);
        }

        Meteor.call("userPK", uname, function(err, uinfo) {
            if (debug) console.log("userPK answer " + JSON.stringify(uinfo));

            if (err || !uinfo || !uinfo._pk) {
                if (debug) console.log("user "+ uname + " " + JSON.stringify(uinfo));
                throw new Error("user " + uname + " public keys are not available");
            }

            var keys = uinfo._pk;

            if (active_attacker()) { // check certificate

                if (!uinfo._pubkey_cert) {
                    throw new Error("missing public key certificate for user " + uname);
                }
                var cert = uinfo._pubkey_cert;

                //verify certificate
                var res = idp_verify_msg(format_cert(uname, keys, idp_app_url()),
                    cert);
                if (!res) {
                    throw new Error("server provided invalid pub key certificate!");
                }
            }

            var princ = new Principal("user", uname, deserialize_keys(keys));
            cb2 && cb2(princ);
            return;
        });
    }

    /*
     Takes as input a list of PrincAttrs, and the username of a user -- authority
     and outputs a principal for attrs[0].
     The principal does not have secret keys loaded.
     Authority is either a string representing the name of a user,
     or an object representing a principal.
     TODO: needs cleanup, authority should always be principal, IDP or static
     */
    Principal.lookup = function (attrs, authority, on_complete) {

        startTime("lookup");

        if (typeof authority == "string") {
            var p = cache_get_certif(attrs, authority);
            if (p) {
                endTime("lookup");
                on_complete(p);
                return;
            } else {
                if (debug) console.log("MISS");
            }
        }

        // looks up the principal corresponding to authority
        // and calls cb with it
        var lookupAuthority = function(authority, cb) {
            if (typeof authority == "string") {
                Principal.lookupUser(authority, cb);
            } else {
                if (!authority._id)
                    throw new Error("authority in lookup must be principal or string ");
                cb(authority);
            }
        }


        if (debug)
            console.log("Principal.lookup: " + pretty(authority) + " attrs[0]: " + attrs[0].type + "=" + attrs[0].name);



        lookupAuthority(authority, function (auth_princ) {
            if (!auth_princ) {
                throw new Error("idp did not find user for " + pretty(authority));
            }
            var auth_id =  auth_princ._id;

            Meteor.call("lookup", attrs, auth_id, function (err, result) {

                if (err || !result) {
                    throw new Error("Principal lookup fails for authority " + pretty(authority));
                }

                var princ = result.principal;
                var certs = result["cert"];



                var cert_attrs = _.zip(certs, attrs);
                var princ_keys = deserialize_keys(princ);
                var subj_keys = princ_keys;

                var chain = _.map(cert_attrs, function (data) {
                    var cert = data[0];
                    var attr = data[1];

                    var pk = crypto.deserialize_public(EJSON.parse(cert.signer).verify, "ecdsa");
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
                    endTime("lookup");
                    on_complete(undefined);
                } else {
                    var verified = crypto.chain_verify(chain);
                    if (verified) {
                        if (debug) console.log("chain verifies");
                        var princc = new Principal(attrs[0].type, attrs[0].name, princ_keys);
                        princc._load_secret_keys(function () {
                            if (typeof authority == "string") //TODO: this cache must check it is for users, else insecure
                                cache_add(princc, {'uname': authority});
                            endTime("lookup");
                            on_complete && on_complete(princc);
                        }, true);

                    } else {
                        endTime("lookup");
                        on_complete && on_complete(undefined);
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
        self._id = get_id(self.keys);
    };

    // transforms an id into keys - crypto instance of public keys
    _get_keys = function(id) {
        return deserialize_keys(id);
    }

    // requires symmetric key of this principal to be set
    Principal.prototype.sym_encrypt = function(pt, adata) {
        var self = this;
        if (self.keys.sym_key) {
            return crypto.sym_encrypt(self.keys.sym_key, pt, adata);
        }
        throw new Error("sym_key must be set for sym_encrypt");
    };

    // requires keys.decrypt to be set
    Principal.prototype.sym_decrypt = function (ct, adata) {
        var self = this;
        if (self.keys.sym_key) {
            return crypto.sym_decrypt(self.keys.sym_key, ct, adata);
        }
        throw new Error("sym_key must be set for sym_decrypt");
    };

    Principal.prototype.asym_decrypt = function (ct) {
        var self = this;
        if (self.keys.decrypt) {
            return crypto.decrypt(self.keys.decrypt, ct);
        }
        throw new Error("decrypt key must be set for asym_decrypt");
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

    _processAccessInbox = function(uprinc, dbprinc) {
        if (dbprinc && dbprinc.accessInbox.length > 0) {
            if (debug) console.log(" NOT EMPTY ACCESS INBOX " + JSON.stringify(dbprinc.accessInbox));
            _.each(dbprinc.accessInbox, function(wid){
                Meteor.call("wrappedKeyByID", wid,
                    function(err, w) {
                        if (!w || !w.wrapped_keys) {
                            if (debug) console.log("smth wrong with this wrapped key "  + wid);
                            return;
                        }
                        var subject_keys_ser = base_crypto.decrypt(uprinc.keys.decrypt, w["wrapped_keys"]);
                        var subject_keys = deserialize_keys(subject_keys_ser);
                        var sym_wrapped = base_crypto.sym_encrypt(uprinc.keys.sym_key, subject_keys_ser);

                        var with_delta = function(delta) {
                            WrappedKeys.update({_id: wid},
                                {$set : {wrapped_keys: undefined,
                                    delta : delta,
                                    wrapped_sym_keys : sym_wrapped}
                                });
                        }

                        if (use_search()) {
                            // compute delta as well
                            MylarCrypto.delta(uprinc.keys.mk_key,
                                subject_keys.mk_key,
                                with_delta);
                        } else {
                            with_delta(null);
                        }
                    });
            });
            Principals.update({_id: uprinc._id},
                {$set:{accessInbox: []}});
        }

    }

    processAccessInbox = function() {
        if (!Meteor.user()) {
            return;
        }
        // some user is logged in
        if (debug) console.log("run PROCESS ACCESS INBOX: ");
        var uprinc = Principal.user();
        if (uprinc) {
            var dbprinc = Principals.findOne({_id : uprinc._id});
            _processAccessInbox(uprinc, dbprinc);
        }
    }

    Deps.autorun(processAccessInbox);

    Deps.autorun(function(){
        if (!Meteor.user()) {
            return;
        }
        var uprinc = Principal.user();
        if (uprinc) {
            Meteor.subscribe("myprinc", uprinc._id);
        }
    });
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

