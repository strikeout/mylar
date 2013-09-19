Meteor.loginWithIDP = function (callback) {
    var uname = get_username();

    idp_certify_pk(null, function (cert) {
    Accounts.callLoginMethod({
      methodArguments: [{idp: {cert: cert}}],
      userCallback: callback,
    });
  });
};
