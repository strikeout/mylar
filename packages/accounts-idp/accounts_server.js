
Accounts.certifyFunc(function(options, user) {
    // check certificate
    var cert = options.cert;
    var uname = options.username;

    var ok = idp_check("register", uname, cert, idp_pk);

    if (!ok) {
	user._validate = false;
    } else {
	user._validate = true;
	user._wrap_privkey = options.wrap_privkey;
    }

    delete options.wrap_privkey;
    delete option.cert;

    return user;
});


//gets called after onCreateUser
Accounts.validateNewUser(function(user){
    return user._validate;
});

//TODOs: make the two above only one function given that
// we anyways change accounts-password?

/* NOT USED
Accounts.registerLoginHandler(function (options) {
  if (!options.idp)
    return undefined;

  var config = Accounts.loginServiceConfiguration.findOne({service: 'idp'});
  if (!config)
    throw new Accounts.ConfigError("Service not configured");

  // XXX figure out how cert is encoded
  check(options.idp, {cert: String});
  var cert = options.idp.cert;
  console.log('idp_login', cert);

  var pubkey = config.pubkey;

  // XXX verify cert with pubkey

  // XXX extract username from cert
  var userid = cert;

  return Accounts.updateOrCreateUserFromExternalService('idp', {id: userid});
});
*/