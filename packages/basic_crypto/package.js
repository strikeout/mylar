Package.describe({
  summary: 'Basic crypto',
});

Package.on_use(function (api, where) {
  where = where || ['client', 'server'];

    api.add_files(['sjcl.js', 'crypto.js'], where);
});
