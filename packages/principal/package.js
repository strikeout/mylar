Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {

    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo', 'templating',
             'timing', 'basic_crypto', 'http'], where);
    api.add_files(['graphmodel.js', 'collection_hook.js'], where);
    api.add_files(['certs.js', 'principal.js'], where);
    api.add_files(['idp_helper.js'], 'client');

});
