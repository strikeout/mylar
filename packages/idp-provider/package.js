Package.describe({
  summary: 'IDP provider postMessage RPC interface',
});

Package.on_use(function (api) {
  api.add_files(['rpc_server.js'], 'client');
});
