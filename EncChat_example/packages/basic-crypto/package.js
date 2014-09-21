Package.describe({
  summary: 'Basic crypto',
});

Package.on_use(function (api) {
    where = ['client', 'server'];
    api.use(['ejson', 'underscore']);
    api.add_files(['sjcl.js', 'crypto.js'], where);

    api.export("sjcl");
    api.export("base_crypto");
    api.export("deserialize_keys");
    api.export("serialize_keys");
    api.export("serialize_private");
    api.export("serialize_public");
    api.export("format_cert");
});
