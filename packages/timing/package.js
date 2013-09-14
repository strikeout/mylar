Package.describe({
    summary: "Timing package for eval of meteor-enc",
});

Package.on_use(function (api, where) {
    where = where || ['client', 'server'];

    api.add_files('timeLog.js', where);

});
