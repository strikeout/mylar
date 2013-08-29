
/*
  Crypto interface useful for access grap: sjcl + serialization functions
*/


/*** SJCL crypto **/
base_crypto = (function () {
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
	    // these are fed 0 paranoia - so no randomness???
            var enc = sjcl.ecc.elGamal.generateKeys(curve, 0);
            var sig = sjcl.ecc.ecdsa.generateKeys(curve, 0);
	    //sjcl's max size for key is 8 random words  which is weird
	    var sim_key = sjcl.random.randomWords(8);
            return {
                encrypt: enc.pub,
                decrypt: enc.sec,
                sign: sig.sec,
                verify: sig.pub,
		sim_key : sim_key
            };
        },
	
        encrypt: function (pk, data) {
            return sjcl.encrypt(pk, data);
        },
	
        decrypt: function (sk, ct) {
            return sjcl.decrypt(sk, ct);
        },
		
	// authenticated encryption
	sym_encrypt: function(sk, data) {
	    var ops = {mode:"ccm", cipher: "aes"};
	    return sjcl.encrypt(sk, data, ops);
	},
	
	sym_decrypt: function(sk, ct) {
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
        chain_decrypt: function (chain, keys) {
            var secret_keys;
            _.each(chain, function (wk) {
		var unwrapped;
		if (wk.isSym) {
                    unwrapped = sjcl.sym_decrypt(keys.sim_key, wk.wkey);
		} else {
		    unwrapped = sjcl.decrypt(keys.sk, wk.wkey);
		}
                secret_keys = EJSON.parse(unwrapped);
                sk = base_crypto.deserialize_private(secret_keys.decrypt,
						     "elGamal");
            });
            secret_keys.sign = base_crypto.deserialize_private(
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


/********** Serialization functions ***************/

deserialize_keys = function (ser) {
    var keys = EJSON.parse(ser);
    if (keys.encrypt) {
        keys.encrypt = base_crypto.deserialize_public(keys.encrypt, "elGamal");
    }
    if (keys.decrypt) {
        keys.decrypt = base_crypto.deserialize_private(keys.decrypt, "elGamal");
    }
    if (keys.sign) {
        keys.sign = base_crypto.deserialize_private(keys.sign, "ecdsa");
    }
    if (keys.verify) {
        keys.verify = base_crypto.deserialize_public(keys.verify, "ecdsa");
    }
    return keys;
};


var _prepare_private = function(keys) {
    var ser = {};
    ser['mk_key'] = keys.mk_key;
    _.each(["mk_key", "sim_key"], function(){
	if (keys[k]) {
	    ser[k] = keys[k];
	}
    });
    _.each(["sign", "decrypt"], function (k) {
        if (keys[k]) {
	    ser[k] = base_crypto.serialize_private(keys[k]);
        }
    });
    return ser;
    
}

serialize_keys = function (keys) {
    var ser = _prepare_private(keys);
    
    _.each(["encrypt", "verify"], function (k) {
        if (keys[k]) {
            ser[k] = base_crypto.serialize_public(keys[k]);
        }
    });
    
    ser = EJSON.stringify(ser);
    return ser;
};

serialize_private = function (keys) {
    return EJSON.stringify(_prepare_private(keys));
};