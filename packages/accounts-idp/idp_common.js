idp_pk = undefined;
idp_url = undefined;

idp_init = function(url, pk, debug) {
    idp_pk =  deserialize_keys(pk);
    idp_url = url;
    if (Meteor.isClient) {
        Session.set('idp_user_debug', debug);
	Session.set('idp_user_origin', url);
    }
}

// checks that `cert' is a valid certificate
// by the idp for user with msg at origin
// e.g., msg can be pks or "register"
idp_check = function(msg, user, cert) {
    // Remove the trailing slash in "http://host.name:port/"
    var origin = Meteor.absoluteUrl().slice(0, -1);
    var c = JSON.stringify({user: user, msg: msg, origin: origin});

    return base_crypto.verify(c, cert, idp_pk.verify);
}

