Package.describe({
  summary: 'IDP-using application postMessage RPC interface',
});

Package.on_use(function (api) {
  api.add_files(['rpc_client.js'], 'client');
});
