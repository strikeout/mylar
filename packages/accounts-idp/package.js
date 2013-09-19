Package.describe({
  summary: "Login service for IDP accounts"
});

Package.on_use(function(api) {
  api.use('accounts-base', ['client', 'server']);
  api.use('idp-user', 'client');

  api.add_files('idp_client.js', 'client');
  api.add_files('idp_server.js', 'server');
});
