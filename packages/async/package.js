Package.describe({
  summary: "Collection of functions for async logic."
});

Package.on_use(function (api, where) {
  where = where || ['client', 'server'];
  api.add_files('async.js', where);
});
