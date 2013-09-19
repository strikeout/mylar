Meteor.loginWithIDP = function (callback) {
  idp_certify_pk(null, function (cert) {
    Accounts.callLoginMethod({
      methodArguments: [{idp: {cert: cert}}],
      userCallback: callback,
    });
  });
};
