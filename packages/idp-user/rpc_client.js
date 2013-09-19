// Configuration parameters
var idp_origin = 'http://localhost:3000';
var idp_debug = true;

// Meteor template hooks for the iframe
Template.idp_client.debug = function () {
  return idp_debug;
};

Template.idp_client.origin = function () {
  return idp_origin;
};

// RPC infrastructure
var req_id = 0;
var req_cb = {};

function call(op, arg, cb) {
  var iframe = document.getElementById('idp_iframe').contentWindow;
  var id = req_id++;

  req_cb[id] = cb;
  var msg = { id: id, op: op, arg: arg };
  var json_msg = JSON.stringify(msg);
  if (idp_debug)
    console.log('Sending', json_msg, 'to', idp_origin);

  iframe.postMessage(json_msg, idp_origin);
}

Meteor.startup(function () {
  window.addEventListener('message', function (ev) {
    var origin = ev.origin;
    var data = ev.data;

    if (idp_debug)
      console.log('Received', data, 'from', origin);

    if (origin != idp_origin) {
      console.log('Surprising response from', origin, 'not', idp_origin);
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
