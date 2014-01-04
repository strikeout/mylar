Package.describe({
  summary: "Login service for IDP accounts"
});

Package.on_use(function(api) {

    api.use('accounts-base', ['client', 'server']);
    api.use('accounts-password', ['client', 'server']);
    api.use('srp', ['client', 'server']);
    api.use('basic-crypto', ['client', 'server']);
    api.use('principal', 'client');
    
    api.add_files('accounts_common.js', ['client','server']);
    api.add_files('idp_client.js', ['client', 'server'])
    api.add_files('idp_token.js', 'client');
    api.add_files('accounts_client.js', 'client');
    api.add_files('accounts_server.js', 'server');

    // TODO: export just one variable
    api.export("idp_init");
    api.export("idp_verify_msg");
    api.export("idp_app_url");
});
