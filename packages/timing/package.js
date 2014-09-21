Package.describe({
    summary: "Timing package for eval of meteor-enc",
});

Package.on_use(function (api, where) {
    where = where || ['client', 'server'];

    api.add_files('timeLog.js', where);

    // TODO: export just one timing variable
    api.export("logAdd");
    api.export("startTime");
    api.export("endTime");
    api.export("markTime");
    api.export("markGlobTime");
    api.export("timeLog");
    api.export("LATENCY_LOG");
    api.export("TPUT_LOG");
    api.export("TOTAL_MSGS");


});
