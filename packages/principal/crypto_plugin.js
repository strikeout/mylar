
/*
  Multi-key search client-side interface
  -- NaCl
  -- or crypto_server in debug mode
*/


enc_fire = function() {
    return document.getElementById("_cryptoFIRE");
}

enc_module = undefined;
enc_return = undefined;

USE_CRYPTO_SERVER = true;
//replaces NaCl with crypto_server; for testing

Handlebars.registerHelper(
    "cryptoPlugin",
    function (options) {
        return new Handlebars.SafeString(Template._cryptoPlugin());
    });

Template._cryptoPlugin.events({
    'load *': function(evt) {
	enc_fire = document.getElementById("_cryptoFIRE");
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
    if(enc_fire().valid)
        cb(enc_fire().Keygen());
    else
        enc_module.postMessage("keygen()");
};

Crypto.delta = function(k1, k2, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.delta(k1, k2, cb);
	return;
    }
  
    if(enc_fire().valid)
        cb(enc_fire().Delta(k1, k2));
    else
        enc_module.postMessage("delta(" + k1 + "," + k2 + ")");
};

Crypto.token = function(k, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.token(k, word, cb);
	return;
    }
  
    if(enc_fire().valid)
        cb(enc_fire().Token(k, word));
    else
        enc_module.postMessage("token(" + k + "," + word + ")");
};

Crypto.encrypt = function(k, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.encrypt(k, word, cb);
	return;
    }
  
    if(enc_fire().valid)
        cb(enc_fire().Encrypt(k1, word));
    else
        enc_module.postMessage("encrypt(" +  k + "," + word + ")");
};


Crypto.index_enc = function(k, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.index_enc(k, word, cb);
	return;
    }

    enc_module.postMessage("index_enc(" +  k + "," + word + ")");
};

var tokenize_for_search = function(text) {
    return text.match(/\w+|"[^"]+"/g); 
}

Crypto.text_encrypt = function(k, ptext, cb) {
    var items = tokenize_for_search(ptext);
    var encitems = [];

    callback = _.after(items.length, function() {
	cb(encitems);
    })
    
    _.each(items, function(item, index) {
	Crypto.encrypt(k, item, function(encitem) {
	    encitems[index] = encitem;
	    callback();
	});
    });
}

var _check_index = function(k, word, ciph, cb) {
    Crypto.index_enc(k, word, function(iciph) {
	Crypto.match(iciph, ciph, cb);
    });
}

// check if enctext is a correct encryption of text
// calls cb with true or false
Crypto.is_consistent = function(k, ptext, enctext, cb) {
    ptext = tokenize_for_search(ptext);
    if (ptext.length != enctext.length) {
	cb(false);
	return;
    }
    var done = false;
    for (var i = 0; i < ptext.length; i++){
	var word = ptext[i];
	_check_index(k, word, enctext[i], function(res) {
	    if (!res) {
		cb(false);
		done = true;
		return;
	    }
	});
	if (done) return;
    }

    cb(true);
}


Crypto.adjust = function(tok, delta, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.adjust(tok, delta, cb);
	return;
    }
  
    if(enc_fire().valid)
        cb(enc_fire().Adjust(tok, delta));
    else
    enc_module.postMessage("adjust(" + tok + "," + delta + ")");
};

Crypto.match = function(tok, cipher, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.match(tok, cipher, cb);
	return;
    }
  
    if(enc_fire().valid)
        cb(enc_fire().Match(tok, cipher));
    else
        enc_module.postMessage("match(" + tok + "," + cipher + ")");
};

