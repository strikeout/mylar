
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

USE_CRYPTO_SERVER = false;
//replaces NaCl or crypto_fire with crypto_server; for testing

var enable_search = true;

principal_enable_search = function (flag) {
    enable_search = flag;
};

USE_INDEX = false;
/*
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
*/

MylarCrypto = function() {};

MylarCrypto.test = function(cb) {
    enc_return = cb;
    enc_module.postMessage("testJ()");
};
MylarCrypto.keygen = function(cb) {
    if (!enable_search)
        cb('');

    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.keygen(cb);
	return;
    }

    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Keygen());
    else
        enc_module.postMessage("keygen()");
};

MylarCrypto.delta = function(k1, k2, cb) {
    if (!enable_search)
        cb('');

    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.delta(k1, k2, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if(enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Delta(k1, k2));
    else
        enc_module.postMessage("delta(" + k1 + "," + k2 + ")");
};

MylarCrypto.token = function(k, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.token(k, word, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if(enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Token(k, word));
    else
        enc_module.postMessage("token(" + k + "," + word + ")");
};

MylarCrypto.encrypt = function(k, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.encrypt(k, word, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Encrypt(k, word));
    else
        enc_module.postMessage("encrypt(" +  k + "," + word + ")");
};


MylarCrypto.index_enc = function(k, word, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.index_enc(k, word, cb);
	return;
    }
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid) {
	cb(enc_fire_e.IndexEnc(k, word));
    } else {
	enc_module.postMessage("index_enc(" +  k + "," + word + ")");
    }
};

var tokenize_for_search = function(text) {
    return text.match(/\w+|"[^"]+"/g); 
}


/*
MylarCrypto.text_encrypt = function(k, ptext, cb) {
    var items = tokenize_for_search(ptext);
    var encitems = [];

    callback = _.after(items.length, function() {
	cb(encitems);
    })
    
    _.each(items, function(item, index) {
	MylarCrypto.encrypt(k, item, function(encitem) {
	    encitems[index] = encitem;
	    callback();
	});
    });
}
*/
MylarCrypto.text_encrypt = function(k, ptext, cb) {
    var items = tokenize_for_search(ptext);
    var encitems = [];

    callback = _.after(items.length, function() {
	cb(encitems);
    })

    var r = sjcl.codec.hex.fromBits(sjcl.random.randomWords(2));
    encitems[0] = r;
    
    _.each(items, function(item, index) {
	MylarCrypto.index_enc(k, item, function(encitem) {
	    encitems[index+1] = base_crypto.mkhash(r , encitem);
	    callback();
	});
    });    
}


var _check_index = function(k, word, ciph, cb) {
    MylarCrypto.index_enc(k, word, function(iciph) {
	MylarCrypto.match(iciph, ciph, cb);
    });
}

// check if enctext is a correct encryption of text
// calls cb with true or false
MylarCrypto.is_consistent = function(k, ptext, enctext, cb) {
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


MylarCrypto.adjust = function(tok, delta, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.adjust(tok, delta, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Adjust(tok, delta));
    else
        enc_module.postMessage("adjust(" + tok + "," + delta + ")");
};

MylarCrypto.match = function(tok, cipher, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.match(tok, cipher, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Match(tok, cipher));
    else
        enc_module.postMessage("match(" + tok + "," + cipher + ")");
};

