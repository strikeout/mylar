cat <<EOF
Package.describe({
    summary: "Principal graph",
});

Package.on_use(function (api, where) {
    const SUPPORT_MULTIKEY = true;

    where = where || ['client', 'server'];

    api.use(['underscore', 'json', 'ejson', 'minimongo', 'templating'], where);
    api.add_files('graphmodel.js', where);
    api.add_files(['sjcl.js', 'crypto.js', 'certs.js', 'principal.js', ], where);

    api.add_files('crypto_plugin.html', 'client');
    api.add_files(['crypto_plugin.js', 'idp_helper.js'], 'client');

    if(SUPPORT_MULTIKEY){
      var path = Npm.require('path');
EOF

for i in `find bin -maxdepth 2 -type f | sed "s/bin\///g" | grep -v "\(main\|src\)"`; do
	echo "      api.add_files(path.join('crypto_ext', '$i'), 'client');"
done

cat <<EOF
    }
});
EOF