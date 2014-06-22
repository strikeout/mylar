Meteor.startup(function () {
    console.log("Trying to generate keys..");
    generate_princ_keys(function (keys) {
        var key_priv = serialize_keys(keys);
        var key_pub = serialize_public(keys);

        console.log('Private key:', key_priv);
        console.log('Public key:', key_pub);
    });
});
