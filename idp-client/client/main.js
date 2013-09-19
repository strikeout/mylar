Template.main.reply = function () {
  return Session.get('reply');
};

Template.main.events({
  'click .setup': function (ev, template) {
    var origin = template.find('#origin').value;
    idp_init(origin, true);
  },

  'click .getkey': function () {
    idp_get_app_key(function (key) {
      Session.set('reply', key);
    });
  },
});

Meteor.startup(function () {
  idp_init('http://localhost:3000', true);
});
