Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {
    const SUPPORT_MULTIKEY = true;

    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo', 'templating', 'timing'], where);
    api.add_files(['graphmodel.js'], where);
    api.add_files(['sjcl.js', 'crypto.js', 'certs.js', 'principal.js', 'crypto_server.js', 'search.js'], where);

    api.add_files('crypto_plugin.html', 'client');
    api.add_files(['crypto_plugin.js', 'idp_helper.js'], 'client');

    if(SUPPORT_MULTIKEY){
      var path = Npm.require('path');
//START_OF_EXT_FILES
      api.add_files(path.join('crypto_ext', 'crypto_ext_x86_32.nexe'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext_x86_64.nexe'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext_x86_64.map'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext_x86_32.map'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext.nmf'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libc.so.b7b14f88'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libc.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libppapi_cpp.so'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libpthread.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libm.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libstdc++.so.6'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libpthread.so.b7b14f88'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libgcc_s.so.1'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libm.so.b7b14f88'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/runnable-ld.so'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libc.so.b7b14f88'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libc.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libppapi_cpp.so'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libpthread.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libm.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libstdc++.so.6'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libpthread.so.b7b14f88'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libgcc_s.so.1'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libm.so.b7b14f88'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/runnable-ld.so'), 'client');
//END_OF_EXT_FILES
    }
});
