
/*
  Multi-key search client-side interface
  -- NaCl
  -- or crypto_server in debug mode
*/


enc_module = undefined;
enc_return = undefined;

USE_CRYPTO_SERVER = true; //this is a temporary hack until we get NaCl working properly
// it uses the crypto server instead of NaCl, which is insecure

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
    if (USE_CRYPTO_SERVER) {
	crypto_server.keygen(cb);
	return;
    }
    enc_module.postMessage("keygen()");
};

Crypto.delta = function(k1, k2, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.delta(k1, k2, cb);
	return;
    }
  
    enc_module.postMessage("delta(" + k1 + "," + k2 + ")");
};

Crypto.token = function(k1, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.token(k, word, cb);
	return;
    }
  
    enc_module.postMessage("token(" + k1 + "," + word + ")");
};

Crypto.encrypt = function(k1, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.encrypt(k1, word, cb);
	return;
    }
  
    enc_module.postMessage("encrypt(" +  k1 + "," + word + ")");
};

var tokenize_for_search = function(text) {
    return text.match(/\w+|"[^"]+"/g); 
}

Crypto.text_encrypt = function(k, text, cb) {
    var items = tokenize_for_search(text);
    var encitems = [];

    callback = _.after(items.length, function() {
	cb(encitems);
    })
    
    _.each(items, function(item, index) {
	Crypto.encrypt(k, item, function(encitem) {
	    encitems.push(encitem);
	    callback();
	});
    });
}

// check if enctext is a correct encryption of text
// calls cb with true or false
Crypto.is_consistent = function(k, text, enctext, cb) {
    Crypto.text_encrypt(k, text, function(good_enctext) {
	cb(_.isEqual(enctext, good_enctext));
    });
}

validate

Crypto.adjust = function(tok, delta, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.adjust(tok, delta, cb);
	return;
    }
  
    enc_module.postMessage("adjust(" + tok + "," + delta + ")");
};

Crypto.match = function(tok, cipher, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.match(tok, cipher, cb);
	return;
    }
  
    enc_module.postMessage("match(" + tok + "," + cipher + ")");
};

