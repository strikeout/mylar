Template.main.logged_in = function () {
  return store_get('key');
};

Template.main.events({
  'click .logout': function () {
    store_set('key', null);
  },

  'click .login': function (ev, template) {
    var pw = template.find('#password').value;

    // XXX should we extend get_app_key() to provide a salt?
    var salt = sjcl.codec.hex.toBits('1234');

    var k = sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2(pw, salt, 1000, 256));
    store_set('key', k);
  },
});
