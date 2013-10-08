// Global parameters initialized with idp_user_init()
var idp_user_origin = undefined;
var idp_user_debug = false;

// RPC infrastructure
var req_id = 0;
var req_cb = {};
var req_queue = [];
var req_iframe = undefined;
var req_iframe_ready = false;

function check_iframe() {
  if (req_iframe === undefined) {
    var iframe_ready = function () {
      if (idp_user_debug)
        console.log('IDP iframe ready');

      req_iframe_ready = true;
      check_iframe();
    }

    req_iframe = document.createElement('iframe');
    if (req_iframe.addEventListener) {
      req_iframe.addEventListener('load', iframe_ready, false);
    } else if (req_iframe.attachEvent) {
      req_iframe.attachEvent('onload', iframe_ready);
    } else {
      console.log('How to register for iframe load?');
    }

    req_iframe.style.display = 'none';
    req_iframe.setAttribute('src', idp_user_origin);
    document.body.appendChild(req_iframe);

    if (idp_user_debug)
      console.log('Created iframe', req_iframe);
  }

  if (req_iframe_ready) {
    var win = req_iframe.contentWindow;
    for (var i = 0; i < req_queue.length; i++) {
      var msg = req_queue[i];
      if (idp_user_debug)
        console.log('Sending', msg, 'to', idp_user_origin);
      win.postMessage(msg, idp_user_origin);
    }

    req_queue = [];
  }
}

function call(op, arg, cb) {
  var id = req_id++;

  req_cb[id] = cb;
  var msg = { id: id, op: op, arg: arg };
  var json_msg = JSON.stringify(msg);
  if (idp_user_debug)
    console.log('Queueing', json_msg);

  req_queue.push(json_msg);
  check_iframe();
}

Meteor.startup(function () {
  window.addEventListener('message', function (ev) {
    var origin = ev.origin;
    var data = ev.data;

    if (idp_user_debug)
      console.log('Received', data, 'from', origin);

    if (origin != idp_user_origin) {
      console.log('Surprising response from', origin, 'not', idp_user_origin);
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
idp_user_init = function (origin, debug) {
  idp_user_origin = origin;
  idp_user_debug = debug;
};

idp_get_app_key = function (cb) {
  call('get_app_key', null, cb);
};

idp_create_cert = function (msg, cb) {
  call('create_cert', msg, cb);
};

idp_get_uname = function(cb) {
  call('get_uname','', cb);
};
