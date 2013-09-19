// Meteor template hooks for the iframe
function idp_origin () {
  return Session.get('idp_user_origin');
};
Template.idp_client.origin = idp_origin;

function idp_debug () {
  return Session.get('idp_user_debug');
};
Template.idp_client.debug = idp_debug;

// RPC infrastructure
var req_id = 0;
var req_cb = {};

function call(op, arg, cb) {
  var iframe = document.getElementById('idp_iframe').contentWindow;
  var id = req_id++;

  req_cb[id] = cb;
  var msg = { id: id, op: op, arg: arg };
  var json_msg = JSON.stringify(msg);
  if (idp_debug())
    console.log('Sending', json_msg, 'to', idp_origin());

  iframe.postMessage(json_msg, idp_origin());
}

Meteor.startup(function () {
  window.addEventListener('message', function (ev) {
    var origin = ev.origin;
    var data = ev.data;

    if (idp_debug())
      console.log('Received', data, 'from', origin);

    if (origin != idp_origin()) {
      console.log('Surprising response from', origin, 'not', idp_origin());
      return;
    }

    var msg = JSON.parse(data);
    var id = msg.id;
    var cb = req_cb[id];
    delete req_cb[id];
    if (cb !== undefined)
      cb(msg.reply);
  });
});

// API exposed to the rest of the application
idp_get_app_key = function (cb) {
  call('get_app_key', null, cb);
};

idp_certify_pk = function (pubkey, cb) {
  call('certify_pk', pubkey, cb);
};

idp_get_uname = function(cb) {
    call('get_uname', cb);
}

idp_init = function (origin, debug) {
  Session.set('idp_user_origin', origin);
  Session.set('idp_user_debug', debug);
};
