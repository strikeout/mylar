Principals = new Meteor.Collection("princs");
WrappedKeys = new Meteor.Collection("wrapped_keys");
Certs = new Meteor.Collection("certs");

var crypto;

if (Meteor.isServer) {

    var allow_all_writes = {
        insert: function () { return true; },
        update: function () { return true; }
    };
    Principals.allow(allow_all_writes);
    WrappedKeys.allow(allow_all_writes);
    Certs.allow(allow_all_writes);

    Meteor.methods({
        keychain: function (from_princ, to_princ) {
            function ret_chain(chain) {
                return _.map(chain, function (wk) {
                    return wk.wrapped_key;
                });
            }

            if (from_princ === to_princ) {
                return [];
            }
            var next_hops = WrappedKeys.find({
                wrapped_for: from_princ
            });
            var chains = _.map(next_hops, function (wk) {
                return [wk];
            });
            var keep_looking = true;
            while (keep_looking) {
                var new_chains = [];
                var found_chain;
                keep_looking = false;
                _.each(chains, function (chain) {
                    var wk = _.last(chain);
                    if (wk.principal === to_princ) {
                        found_chain = ret_chain(chain);
                    }
                    var new_wks = WrappedKeys.find({
                        wrapped_for: wk.principal
                    });
                    _.each(new_wks, function (new_wk) {
                        if (!_.contains(chain, new_wk)) {
                            // We've found an extension for one of our chains,
                            // so keep looping.
                            keep_looking = true;
                            chain.push(new_wk);
                            new_chains.push(chain);
                        }
                    });
                });
                if (found_chain) {
                    return found_chain;
                }
                chains = new_chains;
            }
        },

        lookup: function (attrs, authority) {
            var ext_princ = Principals.findOne({id: authority});
            var princs = {ext_princ: []};
            attrs.reverse();
            for (var i = 0; i < attrs.length; i++) {
                var attr = attrs[i];
                var new_princs = {};
                _.each(princs, function (p, cert_lst) {
                    var cs = Certs.find({
                        attr_name: attr.name,
                        attr_value: attr.value
                    });
                    _.each(cs, function (cert) {
                        if (!_.contains(_.keys(new_princs), cert.principal)) {
                            cert_lst.append(cert);
                            new_princs[cert.principal] = cert_lst;
                        }
                    });
                });
                princs = new_princs;
            }

            if (_.isEmpty(princs)) {
                console.log("No principal found!");
                return undefined;
            }
            var p = _.keys(princs)[0];
            return {
                "principal": p,
                "certs": princs[p]
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

            generate_keys: function (on_complete) {
                var enc = sjcl.ecc.elGamal.generateKeys(curve, 0);
                var sig = sjcl.ecc.ecdsa.generateKeys(curve, 0);
                on_complete({
                    encrypt: enc.pub,
                    decrypt: enc.sec,
                    sign: sig.sec,
                    verify: sig.pub
                });
            },

            encrypt: function (pk, data, on_complete) {
                on_complete(sjcl.encrypt(pk, data));
            },

            decrypt: function (sk, ct, on_complete) {
                on_complete(sjcl.decrypt(sk, ct));
            },

            sign: function (msg, sk, on_complete) {
                var hash = sjcl.hash.sha256.hash(msg);
                on_complete(sk.sign(hash));
            },

            verify: function (msg, sig, pk, on_complete) {
                var hash = sjcl.hash.sha256.hash(msg);
                try {
                    pk.verify(hash, sig);
                    on_complete(true);
                } catch (e) {
                    on_complete(false);
                }
            },

            chain_decrypt: function (chain, sk, on_complete) {
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
                on_complete(secret_keys);
            },

            chain_verify: function (chain, on_complete) {
                chain = _.map(chain, function (cert) {
                    var hash = sjcl.hash.sha256.hash(cert.m);
                    try {
                        pk.verify(hash, cert.sig);
                        return true;
                    } catch (e) {
                        return false;
                    }
                });
                on_complete(_.every(chain, _.identity));
            }
        };
    })();

    test_crypto = crypto;
}

Principal = function (keys) {
    this.keys = keys;
    this.set_id(keys);
};

Principal.prototype.public_keys = function () {
    var self = this;
    return { encrypt: self.keys.encrypt, verify: self.keys.verify };
};

Principal.prototype._secret_keys = function () {
    return { decrypt: keys.decrypt, sign: keys.sign };
};

Principal.prototype._load_secret_keys = function (on_complete) {
    var self = this;
    if (self.keys.decrypt && self.keys.sign) {
        on_complete();
    } else {
        Meteor.call("keychain", Principal.user().id, self.id, function (chain) {
            var sk = Principal.user().keys.decrypt;
            crypto.chain_decrypt(chain, sk, function (unwrapped) {
                self.keys.decrypt = unwrapped.decrypt;
                self.keys.sign = unwrapped.sign;
                on_complete();
            });
        });
    }
};

Principal.prototype.create_certificate = function (subject, attr,
                                                   on_complete) {
    var self = this;
    self._load_secret_keys(self._create_certificate(subject,
                                                   attr,
                                                   on_complete));
};

Principal.prototype._create_certificate = function (subject, attr,
                                                    on_complete) {
    var self = this;
    function sig_done(sig) {
        var cert = new Certificate(subject, attr, self, sig);
        on_complete(cert);
    }
    return function () {
        var msg = Certificate.contents(subject, attr);
        crypto.sign(msg, self.keys.sign, sig_done);
    };
};

Principal.prototype.set_id = function (keys) {
    var self = this;
    var pk = self.public_keys();
    pk.encrypt = crypto.serialize_public(pk.encrypt);
    pk.verify = crypto.serialize_public(pk.verify);
    self.id = EJSON.stringify(pk);
};

Principal.prototype.encrypt = function (pt, on_complete) {
    var self = this;
    crypto.encrypt(self.keys.encrypt, pt, on_complete);
};

Principal.prototype.decrypt = function (ct, on_complete) {
    var self = this;
    self._load_secret_keys(function () {
        crypto.decrypt(self.keys.decrypt, ct, on_complete);
    });
};

// Assumes user's private keys are sitting in localStorage.
// How did they get there? What happens if they're not there?
Principal.user = function () {
    var keys = Principal.deserialize_keys(localStorage['user_princ_keys']);
    return new Principal(keys);
};

Principal.deserialize_keys = function (ser) {
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

// Creates a new Principal with randomly generated keys.
// Creates a certificate for each of the attributes in cert_attrs,
// signed by the current user.
Principal.create = function (cert_attrs, on_complete) {
    var up = Principal.user();
    crypto.generate_keys(function (keys) {
        var p = new Principal(keys);
        Principals.insert({
            id: p.id
        });
        _.each(cert_attrs, function (attr) {
            up.create_certificate(p, attr, function (cert) {
                cert.store();
            });
        });
        on_complete(p);
    });
};

// Gives princ1 access to princ2's data
Principal.add_access = function (princ1, princ2, on_complete) {
    var inner = Principal._add_access(princ1, princ2, on_complete);
    princ2._load_secret_keys(inner);
};

// Should be called only when princ2's secret keys are loaded.
Principal._add_access = function (princ1, princ2, on_complete) {
    return function () {
        var keys = princ2._secret_keys();
        keys.decrypt = crypto.serialize_private(keys.decrypt);
        keys.sign = crypto.serialize_private(keys.sign);
        princ1.encrypt(EJSON.stringify(keys), function (wrapped) {
            WrappedKeys.insert({
                principal: princ2.id,
                wrapped_for: princ1.id,
                wrapped_key: wrapped
            });
            on_complete();
        });
    };
};

Principal.lookup = function (attrs, authority, on_complete) {
    idp.lookup(authority, function (authority_pk) {
        var auth_princ = new Principal(authority_pk);
        Meteor.call("lookup", attrs, auth_princ.id, function (result) {
            var princ = result.principal;
            var certs = result.certs;
            var cert_attrs = _.zip(certs, attrs);
            var princ_keys = Principal.deserialize_keys(princ);
            var subj_keys = princ_keys;
            var chain = _.map(cert_attrs, function (cert, attr) {
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

Certificate = function (subject, attr, signer, signature) {
    this.subject = subject; // Principal
    this.attr = attr; // CertAttr
    this.signer = signer; // Principal
    this.signature = signature; // string
    this.verified = false;
};

Certificate.prototype.store = function (on_complete) {
    var self = this;
    Certs.insert({
        subject: self.subject.id,
        attr_name: self.attr.name,
        attr_value: self.attr.value,
        signer: self.signer.id,
        signature: self.signature
    });
    if (on_complete) {
        on_complete();
    }
};

Certificate.prototype.verify = function (on_complete) {
    var self = this;
    var msg = Certificate.contents(self.subject, self.attr);
    var vk = self.signer.keys.verify;

    function verified(passed) {
        self.verified = passed;
        on_complete(self.verified);
    }

    crypto.verify(msg, self.signature, vk, verified);
};

Certificate.contents = function (subject, attr) {
    return "(" + subject.id + ", " + attr.name + ", " + attr.value + ")";
};

CertAttr = function (name, value) {
    this.name = name;
    this.value = value;
};