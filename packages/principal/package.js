Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {
    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo'], where);
    api.add_files(['sjcl.js', 'principal.js'], where);
});