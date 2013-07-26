enc_module = undefined;
enc_return = undefined;

Handlebars.registerHelper(
    "cryptoPlugin",
    function (options) {
        return new Handlebars.SafeString(Template._cryptoPlugin());
    });

Template._cryptoPlugin.events({
    'load *': function(evt) {
        enc_module = document.getElementById("_cryptoNACL");
    },
    'message *': function(evt) {
        if(enc_return)
            enc_return(evt.data);
    }
});


Crypto = function() {};

Crypto.test = function(cb) {
    enc_return = cb;
    enc_module.postMessage("testJ()");
};

Crypto.newKey = function(cb) {
    enc_return = cb;
    enc_module.postMessage("new()");
};

Crypto.keygen = function(g, cb) {
    enc_return = cb;
    enc_module.postMessage("keygen(" + g + ")");
};

Crypto.delta = function(g, k1, k2, cb) {
    enc_return = cb;
    enc_module.postMessage("delta(" + g + "," + k1 + "," + k2 + ")");
};

Crypto.token = function(g, k1, word, cb) {
    enc_return = cb;
    enc_module.postMessage("token(" + g + "," + k1 + "," + word + ")");
};

Crypto.encrypt = function(g, k1, word, cb) {
    enc_return = cb;
    enc_module.postMessage("encrypt(" + g + "," + k1 + "," + word + ")");
};

Crypto.adjust = function(g, tok, delta, cb) {
    enc_return = cb;
    enc_module.postMessage("adjust(" + g + "," + tok + "," + delta + ")");
};

Crypto.match = function(g, tok, cipher, cb) {
    enc_return = cb;
    enc_module.postMessage("match(" + g + "," + tok + "," + cipher + ")");
};