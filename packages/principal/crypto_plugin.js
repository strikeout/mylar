
/*
  NaCl crypto interface for multi-key crypto
*/


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
Crypto.keygen = function(cb) {
    enc_return = cb;
    enc_module.postMessage("keygen()");
};

Crypto.delta = function(k1, k2, cb) {
    enc_return = cb;
    enc_module.postMessage("delta(" + k1 + "," + k2 + ")");
};

Crypto.token = function(k1, word, cb) {
    enc_return = cb;
    enc_module.postMessage("token(" + k1 + "," + word + ")");
};

Crypto.encrypt = function(k1, word, cb) {
    enc_return = cb;
    enc_module.postMessage("encrypt(" +  k1 + "," + word + ")");
};

Crypto.adjust = function(tok, delta, cb) {
    enc_return = cb;
    enc_module.postMessage("adjust(" + tok + "," + delta + ")");
};

Crypto.match = function(tok, cipher, cb) {
    enc_return = cb;
    enc_module.postMessage("match(" + tok + "," + cipher + ")");
};

