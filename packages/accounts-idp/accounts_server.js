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
