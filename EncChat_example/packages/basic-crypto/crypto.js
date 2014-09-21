/*
 Crypto interface useful for access graph: sjcl + serialization functions
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
            var sym_key = sjcl.random.randomWords(8);
            return {
                encrypt: enc.pub,
                decrypt: enc.sec,
                sign: sig.sec,
                verify: sig.pub,
                sym_key: sym_key
            };
        },

        encrypt: function (pk, data) {
            return sjcl.encrypt(pk, data);
        },

        decrypt: function (sk, ct) {
            return sjcl.decrypt(sk, ct);
        },

        // derives a secret from a secret and a message
        secret_derive: function (secret, msg) {
            var composed = JSON.stringify(secret, msg);
            var new_secret = sjcl.hash.sha256.hash(composed);
            return JSON.stringify(new_secret);
        },

        // authenticated encryption
        sym_encrypt: function (sk, data, adata) {
            if (data === undefined) {
                console.log('sym_encrypt: undefined', data);
                return;
            }

            var prp = new sjcl.cipher['aes'](sk);
            var iv = sjcl.random.randomWords(4, 0);
            var pt = sjcl.codec.utf8String.toBits(data);
            var ct = sjcl.mode['ccm'].encrypt(prp, pt, iv, adata);
            // Undefined adata/tag; might be useful later?

            return sjcl.codec.base64.fromBits(iv.concat(ct), 1);
        },

        sym_decrypt: function (sk, data, adata) {
            if (data === undefined) {
                console.log('sym_decrypt: undefined', data);
                return;
            }

            var prp = new sjcl.cipher['aes'](sk);
            var bits = sjcl.codec.base64.toBits(data);
            var iv = bits.slice(0, 4);
            var ct = bits.slice(4);
            var pt = sjcl.mode['ccm'].decrypt(prp, ct, iv, adata);
            return sjcl.codec.utf8String.fromBits(pt);
        },

        sign: function (msg, sk) {
            var hash = sjcl.hash.sha256.hash(msg);
            return sk.sign(hash);
        },
        verify: function (msg, sig, pk) {
            var hash = sjcl.hash.sha256.hash(msg);
            try {
                pk.verify(hash, sig);
                return true;
            } catch (e) {
                return false;
            }
        },

        mkhash: function (r, c) {
            var h = sjcl.hash.sha256.hash(r + c);
            var c = sjcl.codec.hex.fromBits(h);
            var l = c.length;
            return c.substr(l - 10, 10);
        },


        /* Starting with a secret key sk,
         unwraps keys in chain, until it obtains
         the secret key at the end of the chain. */
        chain_decrypt: function (chain, keys) {
            _.each(chain, function (wk) {
                var unwrapped;
                if (wk.isSym == undefined || wk.isSym == null) {
                    throw new Error("invalid wrapped key");
                }
                if (wk.isSym) {
                    unwrapped = base_crypto.sym_decrypt(keys.sym_key, wk.wkey);
                } else {
                    unwrapped = base_crypto.decrypt(keys.decrypt, wk.wkey);
                }
                keys = deserialize_keys(unwrapped);
            });
            return keys;
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


var _prepare_private = function (keys) {
    var ser = {};
    _.each(["mk_key", "sym_key"], function (k) {
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

var _prepare_public = function (keys) {
    var ser = {};
    _.each(["encrypt", "verify"], function (k) {
        if (keys[k]) {
            ser[k] = base_crypto.serialize_public(keys[k]);
        }
    });
    return ser;

}

serialize_keys = function (keys) {
    var ser = _.extend(_prepare_private(keys), _prepare_public(keys));
    return EJSON.stringify(ser);
};

serialize_private = function (keys) {
    return EJSON.stringify(_prepare_private(keys));
};

serialize_public = function (keys) {
    return EJSON.stringify(_prepare_public(keys));
}


/*********** Other util *************/

format_cert = function (email, pk, origin) {
    return JSON.stringify({
        type: 'user',
        email: email,
        pk: pk,
        origin: origin
    });
}
