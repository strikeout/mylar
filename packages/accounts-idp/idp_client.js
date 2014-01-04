var idp_url;
var idp_verify;
var idp_debug;
var idp_conn;

function idp_connect() {
  if (!idp_conn)
    idp_conn = DDP.connect(idp_url);

  return idp_conn;
}

idp_init = function(url, pk, debug) {
  idp_url = url;
  idp_verify = base_crypto.deserialize_public(pk, 'ecdsa');
  idp_debug = debug;

  /*
   * Your application should call something like:
   *
   * Accounts.config({ sendVerificationEmail: !!idp_url,
   *                   forbidClientAccountCreation: false });
   */
};

idp_app_url = function () {
  return Meteor.absoluteUrl('#/Mylar-verify-idp-token/');
};

idp_request_cert = function (email, pubkey) {
  var c = idp_connect();
  c.call('request_cert', email, pubkey, idp_app_url());
};

idp_obtain_cert = function (email, pk, sk, token, cb) {
    var register_msgx = {
	type: 'register',
	email: email,
	origin: idp_app_url(),
    };
    
    var register_msg = JSON.stringify(register_msgx);
    var register_sig = base_crypto.sign(register_msg, sk);
    
    console.log('register sign', register_msg, register_sig, pk, sk);
    
    var c = idp_connect();
    c.call('obtain_cert', token, register_msg, register_sig, function (err, r) {
	if (err) {
	    console.log('obtain_cert: error', err);
	    cb(null);
	    return;
	}
	
	var msg = r.msg;
	var sig = r.sig;
	if (!base_crypto.verify(msg, sig, idp_verify)) {
	    console.log('obtain_cert: verify failure');
	    cb(null);
	    return;
	}
	
	var msgx = JSON.parse(msg);
	if (msgx.type !== 'user' || msgx.origin !== idp_app_url() ||
            msgx.email !== email || msgx.pk !== pk)
	{
	    console.log('obtain_cert: field mismatch', msgx, idp_app_url(), email, pk);
	    cb(null);
	    return;
	}
	console.log("calling cb after obtain_cert");
	
	cb({ msg: r.msg, sig: r.sig });
    });

    console.log("exiting idp_obtain_cert");
};

idp_verify_msg = function (msg, sig) {
    return base_crypto.verify(msg, sig, idp_verify);
};
