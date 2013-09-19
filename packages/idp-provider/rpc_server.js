Meteor.startup(function () {
  var debug = true;

  var rpc_ops = {
    get_app_key:  get_app_key,
      create_cert:  create_cert,
      get_uname: get_uname
  };

  window.addEventListener('message', function (ev) {
    var origin = ev.origin;
    var data = ev.data;

    if (debug)
      console.log('Received request', data, 'from', origin);

    var req_msg = JSON.parse(data);
    var cb = function (reply) {
      var reply_msg = { id: req_msg.id, reply: reply };
      var reply_json = JSON.stringify(reply_msg);
      if (debug)
        console.log('Replying', reply_json, 'to', origin);
      ev.source.postMessage(reply_json, origin);
    };

    rpc_ops[req_msg.op](req_msg.arg, origin, cb);
  });
});
