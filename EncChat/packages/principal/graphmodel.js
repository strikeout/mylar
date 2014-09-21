Principals = new Meteor.Collection("_mylar_Principal");
/*
 id : unique over all principals (currently, serialized public keys)
 name
 type
 accessInbox: a list of pointers in WrappedKeys where there is a new public key access to be converted in a
 symmetric key access
 */

WrappedKeys = new Meteor.Collection("_mylar_WrappedKey");
/* principal: princ.id
 wrapped_for : princ.id -- the id of the princ that gets new access
 wrapped_keys : wrapped secret asymmetric keys
 wrapped_sym_keys : wrapped secret keys, symmetric
 delta

 There is a bijection between each edge of the graph and each document.
 Currently computing delta for any edge.
 */

Certs = new Meteor.Collection("_mylar_Cert");
/*
 subject_id : princ id
 subject_type
 subject_name
 subject_pk
 signer : id of principal signer
 signature
 */

PrincType = new Meteor.Collection("_mylar_PrincipalType");
/*
 Information on principal type:
 type
 searchable : True/False
 */


IndexEnc = new Meteor.Collection("_mylar_EncSearchIndex");
/*
 An index used for search
 only contains an _id
 */

if (Meteor.isServer) {

    var allow_all_writes = {
        insert: function () {
            return true;
        },
        update: function () {
            return true;
        }
    };

    //TODO: needs to be restricted
    Principals.allow(allow_all_writes);
    WrappedKeys.allow(allow_all_writes);
    Certs.allow(allow_all_writes);
    PrincType.allow(allow_all_writes);
    IndexEnc.allow(allow_all_writes);

    Meteor.publish("princtype", function () {
        return PrincType.find({});
    })
    Meteor.publish("myprinc", function (princid) {
        return Principals.find({$or: [
            {_id: princid},
            {is_static: true}
        ]});
    });

    Meteor.methods({
        updateWrappedKeys: function (pid, pid_for, wpk, wsym, delta, add_to_inbox) {
            var entry = WrappedKeys.findOne({principal: pid, wrapped_for: pid_for});
            var entry_id = "";
            if (!entry) {
                entry_id = WrappedKeys.insert({principal: pid,
                    wrapped_for: pid_for,
                    wrapped_keys: wpk,
                    wrapped_sym_keys: wsym,
                    delta: delta});
            } else {
                if (entry.wrapped_sym_keys && entry.delta && !wsym && !delta) {
                    throw new Exception("sym keys and delta already exist");
                } else {
                    WrappedKeys.update({_id: entry._id},
                        {$set: {principal: pid, wrapped_for: pid_for, wrapped_keys: wpk,
                            wrapped_sym_keys: wsym, delta: delta}});
                }
                entry_id = entry._id;
            }
            if (add_to_inbox) {
                Principals.update({_id: pid_for}, {$push: {accessInbox: entry_id}});
            }
        },

        wrappedKeyByID: function (id) {
            return WrappedKeys.findOne({_id: id});
        }
    });
}

if (Meteor.isClient) {
    Deps.autorun(function () {
        Meteor.subscribe("princtype");
    });

}

// subscriptions for which we don't need decryption
subscriptionsWithNoDec = {
    "myprinc": true,
    "meteor.loginServiceConfiguration": true,
    "princtype": true
}