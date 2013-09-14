Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {
    const SUPPORT_MULTIKEY = true;

    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo', 'templating'], where);
    api.add_files(['config.js', 'graphmodel.js'], where);
    api.add_files(['sjcl.js', 'crypto.js', 'certs.js', 'principal.js', 'crypto_server.js', 'search.js'], where);

    api.add_files('crypto_plugin.html', 'client');
    api.add_files(['crypto_plugin.js', 'idp_helper.js'], 'client');

    if(SUPPORT_MULTIKEY){
      var path = Npm.require('path');
//START_OF_EXT_FILES
//END_OF_EXT_FILES
    }
});
