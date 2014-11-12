/* MeteorEnc: Each field names f gets extra fields: f_enc, f_sig,
 and optionally f_mk for search.
 The field f contains plaintext and is not sent to the server
 unless ENC_DEBUG is true */

var debug = false;

// if true, an unencrypted copy of the fields
// will be kept for debugging mode
var ENC_DEBUG = false;

mylar_decrypt_cb = {};

set_enc_debug = function (flag) {
    ENC_DEBUG = flag;
};


enc_field_name = function (f) {
    return f + "_enc";
}
sig_field_name = function (f) {
    return f + "_sig";
}

search_field_name = function (f) {
    return f + "_mk";
}

rand_field_name = function (f) {
    return f + "_rand";
}


Meteor.Collection.prototype._encrypted_fields = function (lst) {
    this._enc_fields = _process_enc_fields(this._enc_fields, lst);
}

Meteor.Collection.prototype._immutable = function (annot) {
    this._im_rings = annot;
}


// returns a list of keys that show up in both a and b
// b must be map
var intersect = function (a, b) {
    r = [];

    _.each(a, function (f) {
        // XXX: We should split enc_fields() into two functions,
        // and check for exactly one of f and f+"_enc", depending on
        // whether we are trying to encrypt or decrypt a message.
        // A further complication is signed fields -- some of those
        // might be encrypted (so only the _enc version is present),
        // and some of those might be plaintext.
        if (_.has(b, f)) {
            r.push(f);
        }
    });

    return r;
};


function enc_fields(enc_fields, signed_fields, container) {
    return intersect(_.union(_.keys(enc_fields), _.keys(signed_fields)), container);
}


// returns a function F, such that F
// looks up the enc and sign principals for the field f
lookup_princ_func = function (f, container) {
    // given a list of annotations, such as self._enc_fields,
    // looks-up the principal in the annotation of field f
    return function (annot, cb) {

        var annotf = annot[f];
        if (!annotf) { // f has no annotation in annot
            cb(undefined, undefined);
            return;
        }
        var princ_id = container[annotf['princ']];

        if (!princ_id) {
            cb(undefined, undefined);
            return;
        }

        Principal._lookupByID(princ_id, function (princ) {
            cb(undefined, princ);
        });
    }

}


/*
 Given container -- an object with key (field name) and value (enc value)
 fields -- set of field names that are encrypted or signed,
 decrypt their values in container
 */
_dec_fields = function (_enc_fields, _signed_fields, id, container, fields, callback) {

    var cb = _.after(fields.length, function () {
        callback();
    });

    _.each(fields, function (f) {
        async.map([_enc_fields, _signed_fields], lookup_princ_func(f, container),
            function (err, results) {

                if (err) {
                    throw new Error("could not find princs");
                }
                var dec_princ = results[0];
                var verif_princ = results[1];

                if (verif_princ) {
                    if (!verif_princ.verify(JSON.stringify(container[enc_field_name(f)]), container[sig_field_name(f)])) {
                        throw new Error("signature does not verify on field " + f);
                    }
                }
                if (debug) console.log("dec f; f is " + f);

                if (dec_princ) {
                    var auth_data = get_adata(_enc_fields, f, _.extend(container, {_id: id}));
                    var enc_name = enc_field_name(f);
                    var res = JSON.parse(dec_princ.sym_decrypt(container[enc_name], auth_data));
                    if (ENC_DEBUG) {
                        if (JSON.stringify(res) != JSON.stringify(container[f])) {
                            throw new Error("inconsistency in the value decrypted and plaintext");
                        }
                    } else {
                        container[f] = res;
                        if (debug) console.log("setting f to " + res);
                    }
                    delete container[enc_name];
                    //todo: searchable consistency check
                } else {
                    if (debug) console.log("no dec princ");
                }
                cb();
            });
    });
}

var is_searchable = function (enc_fields, field) {
    if (!enc_fields) {
        return false;
    }
    var annot = enc_fields[field];
    if (annot && (annot['attr'] == 'SEARCHABLE'
        || annot['attr'] == 'SEARCHABLE INDEX'))
        return true;
    else
        return false;
}
is_indexable = function (enc_fields, field) {
    if (!enc_fields)
        return false;

    var annot = enc_fields[field];
    if (annot && annot['attr'] == 'SEARCHABLE INDEX')
        return true;
    else
        return false;
}

function insert_in_enc_index(ciph) {
    _.each(ciph, function (item) {
        IndexEnc.insert({_id: item});
    });
}

function has_auth(_enc_fields, f) {
    return _enc_fields && _enc_fields[f]
        && _enc_fields[f].auth
        && _enc_fields[f].auth.length;
}

function get_adata(_enc_fields, f, container) {
    var adata = {};
    if (has_auth(_enc_fields, f)) {
        lst = _enc_fields[f].auth;
        adata = {};
        _.each(lst, function (el) {
            var val = container[el];
            if (!val) {
                throw new Error("doc must contain fields in auth list of " + f +
                    " but it only contains " + JSON.stringify(container));
            }
            adata[el] = val;
        });
    }

    return JSON.stringify(adata);
}


_check_immutable = function (_enc_fields, annot) {
    if (!_enc_fields)
        throw new Error("must declare enc_fields before immutable annotation");

    _.each(annot, function (lst, princ) {
        _.each(lst, function (f) {
            if (_enc_fields[f])
                throw new Error("use auth annotation for encrypted fields " +
                    "instead of immutable annotation");
        })
    });
}

//returns JSON-ed data from container for lst
// either all of lst is in container or none
function get_ring(princ, lst, container) {
    lst.splice(0, 0, princ);
    var inters = intersect(lst, container);

    if (inters.length == 0) {
        return null;
    }
    // degenerate case: docs might be changed at the server
    // due to benign behavior and subscriptions only send delta
    // if these deltas only contain the id and none of the fields
    // that are supposed to not change it is ok
    if (inters.length == 1 && inters[0] == "_id") {
        return null;
    }

    // only partial changes, not allowed
    // xx: there are cases when this could be ok if sent with a new mac
    if (inters.length > 0 && inters.length != lst.length) {
        throw new Error("received doc only contains subset of fields in immutable ring");
    }

    lst.splice(0, 1); // remove princ

    return compute_ring(princ, lst, container);
}

_check_macs = function (immutable, id, container, cb) {

    if (_.isEmpty(immutable)) {
        cb && cb();
        return;
    }

    if (!container["_id"]) {
        container = _.extend(container, {_id: id});
    }


    // determine which macs to check

    var to_check = [];

    _.each(immutable, function (lst, princ) {

        var ring = get_ring(princ, lst, container);
        if (ring) {
            to_check.push({princ: princ, ring: ring});
        }
    });

    //check macs
    var macs = container['_macs'];
//    if (!macs) {
//        if (debug) console.log("container: " + JSON.stringify(container));
//        if (debug) console.log("immutable: " + JSON.stringify(immutable));
//        throw new Error("collection has immutable but macs are not in received doc", immutable, container);
//    }


    if (!to_check.length || !macs) {
        cb && cb();
        return;
    }


    var each_cb = _.after(to_check.length, cb);

    _.each(to_check, function (el) {
        Principal._lookupByID(container[el.princ], function (princ) {
            if (!princ) {
                each_cb();
                return false; // princ not found, just continue
//                throw new Error("princ " + el.princ + '/' + princ + " is missing")
            }
            var mac = macs[el.princ];
            if (!mac) {
                throw new Error("mac for princ " + princ + " is missing");
            }
            var dec = princ.sym_decrypt(mac, el.ring);
            if (dec != " ") {
                if (debug) console.log("dec is <" + dec + ">");
                throw new Error("invalid mac");
            }
            each_cb();
        });
    });
}


/* checks that there are values for
 princ and all elems in lst in container,
 and concatenates this data unambiguously */
function compute_ring(princ, lst, container) {
    var princ_id = container[princ];
    if (!princ_id) {
        if (debug) console.log(JSON.stringify(container));
//        return false;
        throw new Error("container does not contain princ " + princ + " in immutable annotation");
    }

    var res = [princ_id]; //should be a list so that the order of keys is deterministic

    _.each(lst, function (el) {
        var val = container[el];
        if (!val)
            throw new Error('container does not contain field in immutable ' + el);
        res.push(val);
    });

    return JSON.stringify(res);
}

function add_macs(immutable, container, cb) {

    if (_.isEmpty(immutable)) {
        cb && cb();
        return;
    }

    if (container['_macs']) {
        cb && cb();
        return; // already added macs
    }

    var macs = {};

    var when_done = function () {
        container['_macs'] = macs;
        cb && cb();
    };

    var each_cb = _.after(_.keys(immutable).length, when_done);

    // all fields in immutable must be in container
    _.each(immutable, function (lst, princ) {

        var ring = compute_ring(princ, lst, container);

        if (!ring) {
            each_cb();
            return;
        }

        Principal._lookupByID(container[princ], function (p) {
            //TODO: a shorter mac by hashing?
            macs[princ] = p.sym_encrypt(" ", ring);
            each_cb();
        });
    })
}

function encrypt_row(_enc_fields, _signed_fields, container, callback) {

    /* r is the set of fields in this row that we need to encrypt or sign */
    var r = enc_fields(_enc_fields, _signed_fields, container);

    if (r.length == 0) {
        callback();
        return;
    }

    var cb = _.after(r.length, function (container) {
        callback(container);
    });

    _.each(r, function (f) {

        var princ_field = _enc_fields[f].princ;

        // check if user sent a field which is marked for encryption but
        // doesnt provide an encryptor principal, prevent unencrypted inserts
        if (_.isEmpty(container[princ_field]))
            throw new Error('Provided field to encrypt, but no principal for: ' + f + ' / ' + princ_field)


        async.map([_enc_fields, _signed_fields], lookup_princ_func(f, container),
            function (err, results) {
                if (err) {
                    throw new Error("could not find princs");
                }
                var enc_princ = results[0];
                var sign_princ = results[1];

                // encrypt value
                if (enc_princ) {

                    // encrypt data
                    container[enc_field_name(f)] = enc_princ.sym_encrypt(
                        JSON.stringify(container[f]),
                        get_adata(_enc_fields, f, container));


                    if (sign_princ) {
                        container[sig_field_name(f)] = sign_princ.sign(
                            JSON.stringify(container[enc_field_name(f)]));
                    }

                    var done_encrypt = function () {
                        if (!ENC_DEBUG) {
                            delete container[f];
                        }
                        cb(container);
                    }

                    if (is_searchable(_enc_fields, f)) {
                        startTime("mk");

                        if (debug) console.log("is searchable");
                        //var time1 = window.performance.now();
                        MylarCrypto.paragraph_encrypt(enc_princ.keys.mk_key,
                            container[f],
                            function (rand, ciph) {
                                container[search_field_name(f)] = ciph;
                                container[rand_field_name(f)] = rand;
                                //var time1a = window.performance.now();
                                if (is_indexable(_enc_fields, f)) {
                                    if (debug) console.log("inserting in index");
                                    insert_in_enc_index(ciph);
                                }
                                endTime("mk");
                                done_encrypt();
                            });
                    } else {
                        done_encrypt();
                    }
                    return;
                }

                // do not encrypt value
                if (sign_princ) {
                    container[sig_field_name(f)] = sign_princ.sign(JSON.stringify(container[f]));
                }
                cb();
            });
    });

}

// encrypts & signs a document
// container is a map of key to values
//_enc_fields is set
_enc_row_helper = function (_enc_fields, _im_rings, _signed_fields, container, callback) {
    _signed_fields = _signed_fields || {};

    add_macs(_im_rings, container, function () {
        encrypt_row(_enc_fields, _signed_fields, container, callback);
    });

}


_process_enc_fields = function (_enc_fields, lst) {

    if (_enc_fields && _.isEqual(_enc_fields, lst)) {//annotations already set
        return _enc_fields;
    }

    // make sure these annotations were not already set
    if (_enc_fields && !_.isEqual(_enc_fields, {}) && !_.isEqual(_enc_fields, lst)) {
        throw new Error("cannot declare different annotations for the same collection");
    }


    _enc_fields = lst;

    _.each(lst, function (val) {
        var type = val["princtype"];
        var attr = val["attr"];

        var pt = PrincType.findOne({type: type});
        if (pt == undefined) {
            PrincType.insert({type: type, searchable: (attr == "SEARCHABLE")});
        } else {
            if (attr == "SEARCHABLE" && !pt['searchable']) {
                PrincType.update({type: type}, {$set: {'searchable': true}});
            }
        }
    });

    return _enc_fields;
}

// encrypts & signs a document
// container is a map of key to values 
function enc_row(coll, container, callback) {

    if (!Meteor.isClient || !container) {
        callback && callback();
        return;
    }

    if (_.isEmpty(coll._im_rings) && _.isEmpty(coll._enc_fields)) {
        callback && callback(container);
        return;
    }

    _enc_row_helper(coll._enc_fields, coll._im_rings, coll._signed_fields, container, callback);
}

function fields_for_dec(enc_fields, signed_fields, container) {
    var r = []

    _.each(enc_fields, function (v, f) {
        if (_.has(container, enc_field_name(f))) {
            r.push(f);
        }
    });

    return r;
}


// container is an object with key (field name), value (enc field value)
function dec_msg(coll, id, container, callback) {

    var debug = false;

    if (!Meteor.isClient || !container) {
        callback && callback();
        return;
    }
    if (_.isEmpty(coll._im_rings) && _.isEmpty(coll._enc_fields)) {
        callback && callback();
        return;
    }

    // Push a queue of callbacks in decrypt_cb
    // This queue will be given another callback function
    // to run later (the ready subscription callback)
    var callback_q = [];
    var rid = Random.id();
    mylar_decrypt_cb[rid] = callback_q;
    var callback2 = function () {
        if (callback) {
            callback();
        }
        _.each(callback_q, function (f) {
            f();
        });
        delete mylar_decrypt_cb[rid];
    };

    // check macs
    _check_macs(coll._im_rings, id, container, function () {
        var r = fields_for_dec(coll._enc_fields, coll._signed_fields, container);

        if (r.length > 0) {
            _dec_fields(coll._enc_fields, coll._signed_fields, id, container, r, callback2);
        } else {
            callback2();
        }
    });

}


function intercept_init(coll) {
    coll._enc_fields = {};
    coll._signed_fields = {};
    coll._im_rings = {};
}

// will be run when documents are ready in the local database
function onReadyHook(subname, f) {

    if (subscriptionsWithNoDec[subname]) {
        f && f();
        return;
    }

    if (!mylar_decrypt_cb) {
        f && f();
        return;
    }
    var ndecrypts = _.keys(mylar_decrypt_cb).length;
    if (ndecrypts == 0) {
        f && f();
        return;
    }

    var done = _.after(ndecrypts, f);
    _.each(mylar_decrypt_cb, function (q) {
        q.push(done);
    });

}


/*
 init: should be run once for each collection to initialize intercept state
 incoming: should be run on every document incoming from server
 out: should be run on every document going to server
 on_ready: should be run with the ready function for a subscription;
 when the intercept code finished running, it will call the ready function
 */
Meteor.Collection.intercept =
{
    init: intercept_init,
    incoming: dec_msg,
    out: enc_row,
    on_ready: onReadyHook
};
Meteor.intercept =
{
    init: intercept_init,
    incoming: dec_msg,
    out: enc_row,
    on_ready: onReadyHook
};