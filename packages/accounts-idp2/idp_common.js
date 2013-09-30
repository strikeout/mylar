idp_url = undefined;
idp_verify = undefined;
idp_debug = undefined;

idp_init = function(url, pk, debug) {
  idp_url = url;
  idp_verify = base_crypto.deserialize_public(pk, 'ecdsa');
  idp_debug = debug;

  Accounts.config({ sendVerificationEmail: !!idp_url,
                    forbidClientAccountCreation: false });
};
