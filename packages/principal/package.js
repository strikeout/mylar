Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {
    const SUPPORT_MULTIKEY = false;

    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo', 'templating'], where);
    api.add_files(['sjcl.js', 'principal.js', ], where);

    api.add_files('crypto_plugin.html', 'client');
    api.add_files('crypto_plugin.js', 'client');

    if(SUPPORT_MULTIKEY){
      var path = Npm.require('path');
      api.add_files(path.join('crypto_ext', 'lib64/libc.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libpthread.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libgcc_s.so.1'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/runnable-ld.so'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libm.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib64/libstdc++.so.6'), 'client');
      api.add_files(path.join('crypto_ext', 'main/base64_x86_64.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/dir.stamp'), 'client');
      api.add_files(path.join('crypto_ext', 'main/prng_x86_32.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/ec_x86_32.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/b64_wrapper_x86_32.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/multikey_x86_64.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/base64_x86_32.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/multikey_x86_32.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/ec_x86_64.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/prng_x86_64.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/ec_x86_64.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/base64_x86_32.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/ec_x86_32.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/base64_x86_64.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/b64_wrapper_x86_32.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/multikey_x86_64.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/multikey_x86_32.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/prng_x86_32.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/b64_wrapper_x86_64.o'), 'client');
      api.add_files(path.join('crypto_ext', 'main/b64_wrapper_x86_64.d'), 'client');
      api.add_files(path.join('crypto_ext', 'main/prng_x86_64.d'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext_x86_64.nexe'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libc.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libpthread.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libgcc_s.so.1'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/runnable-ld.so'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libm.so.a0e12298'), 'client');
      api.add_files(path.join('crypto_ext', 'lib32/libstdc++.so.6'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext.nmf'), 'client');
      api.add_files(path.join('crypto_ext', 'crypto_ext_x86_32.nexe'), 'client');
    }
});
