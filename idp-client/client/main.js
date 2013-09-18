Template.main.reply = function () {
  return Session.get('reply');
};

Template.main.events({
  'click input': function () {
    idp_get_app_key(function (key) {
      Session.set('reply', key);
    });
  },
});
