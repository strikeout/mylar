Package.describe({
    summary: "Multi-key search over encrypted data",
});

Package.on_use(function (api, where) {

    where = where || ['client', 'server'];

    api.use(['principal'], where);
    api.add_files(['search.js'], where);

});
