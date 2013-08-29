/* Interface for talking to idp */

/*
  Idp stores uname .. keys, where keys are serialized
  */
    
if (Meteor.isClient) {

    idp = (function () {
        var idp = "localhost:3001";
        var conn = Meteor.connect(idp);
        return {
            //find user's public keys on idp, returns keys deserialized
            lookup: function (name, on_complete) {
                conn.call("get_public", name, function (err, result) {
                    if (debug) console.log("get public keys from idp for " + name);
                    var keys = deserialize_keys(result);
                    on_complete(keys);
                });
            },
            //fetch user's private keys on idp
            get_keys: function (name, pwd, on_complete) {
		if (debug) console.log("get keys for " + name);
                conn.call("get_keys", name, pwd, function (err, result) {
                    on_complete(result);
                });
            },
            //update user's keys on idp, create new user if not exists
	    // keys are fresh out of generate (not serialized)
            set_keys: function (name, pwd, keys, on_complete) {
		if (debug) console.log("update keys on idp for " + name);
                conn.call("create_keys", name, pwd, serialize_keys(keys),
			  function (err, result) {
                              on_complete(result);
			  });
            }
        };
    })();

}