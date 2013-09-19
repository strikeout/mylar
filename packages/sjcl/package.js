Package.describe({
  summary: 'SJCL',
});

Package.on_use(function (api, where) {
  where = where || ['client', 'server'];

  api.add_files(['sjcl.js'], where);
});
