var verify_idp_token;
var match = window.location.hash.match(/^\#\/verify-idp-token\/(.*)$/);

if (match) {
  window.location.hash = '';
  Accounts._preventAutoLogin = true;
  verify_idp_token = match[1];
}

Meteor.startup(function () {
  if (verify_idp_token) {
    var token = decodeURIComponent(verify_idp_token);
    var u = Principal.user();

    console.log('Verifying IDP token', token);
    console.log('Current principal', u);

    var email = u.name;
    var pk = serialize_public(u.keys);
    idp_obtain_cert(email, pk, u.keys.sign, token, function (r) {
      if (!r) {
        console.log('Unable to obtain certificate for email address');
        return;
      }

      // Based on Accounts.verifyEmail from accounts-password/password_client.js.
      Accounts.callLoginMethod({
        methodName: 'verifyEmailMylar',
        methodArguments: [r],
        userCallback: function (err) {
          if (err) {
            console.log('verifyEmailMylar:', err);
            return;
          }
        },
      });
    });
  }
});
