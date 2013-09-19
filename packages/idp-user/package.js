Package.describe({
  summary: 'IDP-using application postMessage RPC interface',
});

Package.on_use(function (api) {
  api.use(['templating'], 'client');
  api.add_files(['rpc_client.html', 'rpc_client.js'], 'client');
});
