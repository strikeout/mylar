get_app_key = function (arg, origin, cb) {
  var master = store_get('key');
  var salt = sjcl.codec.hex.toBits(origin);
  var derived = sjcl.misc.pbkdf2(master, salt, 1000, 256);
  cb(derived);
};

certify_pk = function (arg, origin, cb) {
  console.log('certify_pk not supported');
  cb(null);
};
