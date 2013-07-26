Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {
    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo', 'templating'], where);
    api.add_files(['sjcl.js', 'principal.js', ], where);

    api.add_files('crypto_plugin.html', 'client');
    api.add_files('crypto_plugin.js', 'client');

    var path = Npm.require('path');
    api.add_files(path.join('crypto_ext', 'crypto_ext.nmf'), 'client');
    api.add_files(path.join('crypto_ext', 'crypto_ext_x86_32.nexe'), 'client');
    api.add_files(path.join('crypto_ext', 'crypto_ext_x86_64.nexe'), 'client');

    api.add_files(path.join('crypto_ext', 'lib32/libc.so.b7d4c72d'), 'client');
    api.add_files(path.join('crypto_ext', 'lib32/libgcc_s.so.1'), 'client');
    api.add_files(path.join('crypto_ext', 'lib32/libm.so.b7d4c72d'), 'client');
    api.add_files(path.join('crypto_ext', 'lib32/libpthread.so.b7d4c72d'), 'client');
    api.add_files(path.join('crypto_ext', 'lib32/libstdc++.so.6'), 'client');
    api.add_files(path.join('crypto_ext', 'lib32/runnable-ld.so'), 'client');

    api.add_files(path.join('crypto_ext', 'lib64/libc.so.b7d4c72d'), 'client');
    api.add_files(path.join('crypto_ext', 'lib64/libgcc_s.so.1'), 'client');
    api.add_files(path.join('crypto_ext', 'lib64/libm.so.b7d4c72d'), 'client');
    api.add_files(path.join('crypto_ext', 'lib64/libpthread.so.b7d4c72d'), 'client');
    api.add_files(path.join('crypto_ext', 'lib64/libstdc++.so.6'), 'client');
    api.add_files(path.join('crypto_ext', 'lib64/runnable-ld.so'), 'client');
});