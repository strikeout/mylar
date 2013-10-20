var idpkeys = deserialize_keys('{"sym_key":[-2078830561,1682189118,1575134806,156233709,-391209604,1727757807,-1046869112,873814060],"sign":"0000006275556c333caa9d7cd3a26fd26eb48403773bd36ceb1be0","decrypt":"0000004f0d7ae3323dea172ee8c53f3b83845ee81be1f183e4fc51","encrypt":"021cbeb072a8a136a35efd7d59eac32d4415929bc1ca9d5a0e1e640789079a91dcc534c65119ed3fbddb12c918c5a582","verify":"b7bf9d94519d221ec2dd5cb033da55149852858c776d66bf8568a85a45b099c009c926575494bddf3fe2783c15de337b"}');

get_app_key = function (arg, origin, cb) {
  var master = store_get('key');
  var salt = sjcl.codec.hex.toBits(origin);
  var derived = sjcl.misc.pbkdf2(master, salt, 1000, 256);
  cb(derived);
};

create_cert = function (msg, origin, cb) {
  var uname = store_get('uname');
  var c = JSON.stringify({user: uname, msg: msg, origin: origin});
  var cert = base_crypto.sign(c, idpkeys.sign);
  cb(cert);
};

get_uname = function (arg, origin, cb) {
  cb(store_get('uname'));
};
