var idp_conn;

function idp_connect() {
  if (!idp_conn)
    idp_conn = Meteor.connect(idp_url);

  return idp_conn;
}

function app_url() {
  return Meteor.absoluteUrl() + '/#';
};

idp_request_cert = function (email, keys) {
  var c = idp_connect();
  c.call('request_cert', email, serialize_public(keys), app_url());
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
    if (msgx.type != 'user' || msgx.origin != app_url() ||
        msgx.email != email || msgx.pk != pk)
    {
      cb(null);
      return;
    }

    cb({ msg: r.msg, sig: r.sig });
  });
};
