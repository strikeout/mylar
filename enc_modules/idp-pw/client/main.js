Template.login.username = function () {
  return store_get('uname');
};

Template.login.logged_in = function () {
  return store_get('key');
};

Template.login.events({
  'click .logout': function () {
    store_set('key', null);
  },

  'click .login': function (ev, template) {
    var uname = template.find('#username').value;
    var pw = template.find('#password').value;

    // XXX should we extend get_app_key() to provide a salt?
    var salt = sjcl.codec.hex.toBits('1234');

    var k = sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2(pw, salt, 1000, 256));
    store_set('key', k);
    store_set('uname', uname);
  },
});
