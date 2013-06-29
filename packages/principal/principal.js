Principals = new Meteor.Collection("princs");
WrappedKeys = new Meteor.Collection("wrapped_keys");
Certs = new Meteor.Collection("certs");

var crypto;


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
}

// Creates a new principal
Principal = function (type, name) {
    var self = this;
    
    if (type == '')
	throw new Error("Principal needs a type");

    self.type = type;
    self.name = name;
 
    crypto.generate_keys(function (keys) {
	self.keys = keys;

	/* Currently, id is public keys. 
	 * If too long, generate a random id.
	 */
	self.set_id(keys); 
	
	Principals.insert({
	    '_id': self.id
	    'type' : self.type,
	    'name' : self.name,
        });
    });
	


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
				    on_complete();
				});
			    } else {
				// Did not find a chain
				on_complete();
			    }
			});
	}
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
    
}