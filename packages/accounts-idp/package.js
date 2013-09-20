Package.describe({
  summary: "Login service for IDP accounts"
});

Package.on_use(function(api) {
  api.use('accounts-base', ['client', 'server']);
  api.use('accounts-password', ['client', 'server']);
  api.use('idp-user', 'client');
  api.use('session', 'client');
  api.use('basic_crypto', ['client', 'server']);
    
  api.add_files('accounts_client.js', 'client');
  api.add_files('accounts_server.js', 'server');
  api.add_files('idp_common.js', ['client', 'server'])
});
