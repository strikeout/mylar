var idp_url;
var idp_verify;
var idp_debug;
var idp_conn;

function idp_connect() {
  if (!idp_conn)
    idp_conn = Meteor.connect(idp_url);

  return idp_conn;
}

idp_init = function(url, pk, debug) {
  idp_url = url;
  idp_verify = base_crypto.deserialize_public(pk, 'ecdsa');
  idp_debug = debug;

  Accounts.config({ sendVerificationEmail: !!idp_url,
                    forbidClientAccountCreation: false });
};

idp_app_url = function () {
  return Meteor.absoluteUrl('#/verify-email/');
};

idp_request_cert = function (email, pubkey) {
  var c = idp_connect();
  c.call('request_cert', email, pubkey, idp_app_url());
};

idp_obtain_cert = function (email, pk, token, cb) {
  var c = idp_connect();
  c.call('obtain_cert', token, function (r) {
    var msg = r.msg;
    var sig = r.sig;
    if (!base_crypto.verify(msg, sig, idp_verify)) {
      cb(null);
      return;
    }

    var msgx = JSON.parse(msg);
    if (msgx.type != 'user' || msgx.origin != idp_app_url() ||
        msgx.email != email || msgx.pk != pk)
    {
      cb(null);
      return;
    }

    cb({ msg: r.msg, sig: r.sig });
  });
};

idp_verify_msg = function (msg, sig) {
  return base_crypto.verify(msg, sig, idp_verify);
};
