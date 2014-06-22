
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
//replaces NaCl or crypto_fire with crypto_server; for testing


USE_INDEX = false;


MylarCrypto = function() {};


_is_crypto_setup = false;

// setup crypto template
setup_crypto = function(){

    if (Meteor.isServer || _is_crypto_setup) {
	return;
    }
  
    //console.log("creating document");
    var fire_div = document.createElement('div');
    fire_div.id = "_cryptoFIREWrapper";
    
    fire_obj = document.createElement("object");
    fire_obj.id = "_cryptoFIRE";
    fire_obj.type = "application/x-cryptoext";
    fire_obj.width = "0"
    fire_obj.height = "0"
    
    fire_div.appendChild(fire_obj);
    
    var nacl_div = document.createElement("div");
    nacl_div.id = "_cryptoNACLWrapper";
    
    nacl_embed = document.createElement("embed");
    nacl_embed.name = "nacl_module";
    nacl_embed.id = "_cryptoNACL";
    nacl_embed.width = 0;
    nacl_embed.height = 0;
    nacl_embed.src = "/packages/search/crypto_ext/crypto_ext.nmf";
    nacl_embed.type = "application/x-nacl";
    
    nacl_div.appendChild(nacl_embed);
    
    
    var crypto_div = document.createElement('div');
    crypto_div.id = "_cryptoPlugin";
    crypto_div.appendChild(fire_div);
    crypto_div.appendChild(nacl_div);
    
    document.body.appendChild(crypto_div);
    _is_crypto_setup = true;
};


MylarCrypto.test = function(cb) {
    setup_crypto();

    enc_return = cb;
    enc_module.postMessage("testJ()");
};
MylarCrypto.keygen = function(cb) {
    setup_crypto();

    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.keygen(cb);
	return;
    }

    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Keygen());
    else if(typeof EncApp != 'undefined')
	enc_return(EncApp.keygen());
    else
        enc_module.postMessage("keygen()");
};

MylarCrypto.delta = function(k1, k2, cb) {
    setup_crypto();

    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.delta(k1, k2, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if(enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Delta(k1, k2));
    else if(typeof EncApp != 'undefined')
	enc_return(EncApp.delta(k1, k2));
    else
        enc_module.postMessage("delta(" + k1 + "," + k2 + ")");
};

MylarCrypto.token = function(k, word, cb) {
    setup_crypto();

    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.token(k, word, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if(enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Token(k, word));
    else if(typeof EncApp != 'undefined')
	enc_return(EncApp.token(k, word));
    else
        enc_module.postMessage("token(" + k + "," + word + ")");
};

MylarCrypto.encrypt = function(k, word, cb) {
    setup_crypto();

    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.encrypt(k, word, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Encrypt(k, word));
    else if(typeof EncApp != 'undefined')
	enc_return(EncApp.encrypt(k, word));
    else
        enc_module.postMessage("encrypt(" +  k + "," + word + ")");
};


MylarCrypto.index_enc = function(k, word, cb) {
    setup_crypto();


    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.index_enc(k, word, cb);
	return;
    }
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid) {
	cb(enc_fire_e.IndexEnc(k, word));
    } else if(typeof EncApp != 'undefined') {
	enc_return(EncApp.index_enc(k, word));
    } else {
	enc_module.postMessage("index_enc(" +  k + "," + word + ")");
    }
};

var tokenize_for_search = function(text) {
    var lst = text.match(/\w+|"[^"]+"/g);

    // uniquefy
    var dict = {}
    var res = []

    _.each(lst, function (item) {
        var t = String(item).toLowerCase();
	if (!_.has(dict, t)) {
	    dict[t] = 1;
	    res.push(t);
	} 
    });

    return res;
}


// encrypts a text
// calls cb on random value and ciphertext - a list
MylarCrypto.text_encrypt = function(k, ptext, cb) {
    setup_crypto();


    var items = tokenize_for_search(ptext);
    var encitems = [];
    
    var r = sjcl.codec.hex.fromBits(sjcl.random.randomWords(2));
    var encitems = [];
    
    callback = _.after(items.length, function() {
	cb(r, encitems);
    })
    
    _.each(items, function(item, index) {
	MylarCrypto.index_enc(k, item, function(encitem) {
	    encitems[index] = base_crypto.mkhash(r , encitem);
	    callback();
	});
    });    
}

// calls cb with a string that contains
// b64 enc strings separated by space
function par_enc(k, ptext, cb) {
    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.par_enc(k, ptext, cb);
	return;
    }

    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.ParEnc(k, ptext));
    else
	throw new Error("paragraph encryption only supported by crypto server and encfire");
}

function split_by_space(str) {
    var str_list = str.split(" ");

    var new_list = [];
    for (i = 0; i < str_list.length; i++) {
	if (str_list[i] && str_list[i].length > 0) {
	    new_list.push(str_list[i]);
	}
    }

    return new_list;
}

// encrypts a text
// same as text_encrypt, but faster because it sends all text to
// the low-level crypto directly
// calls cb on random value and ciphertext
MylarCrypto.paragraph_encrypt = function(k, ptext, cb) {
    setup_crypto();

    var r = sjcl.codec.hex.fromBits(sjcl.random.randomWords(2));

    var callback = function(ciph) {
	// ciph should be a string formed of b64 encoded
	// strings split by space
	//console.log("this is ciph " + ciph);
	var ciph_list = split_by_space(ciph);
	//console.log("After splitting by space " + JSON.stringify(ciph_list));
	var encitems = [];

	// hash with randomness
	_.each(ciph_list, function(encitem, index){
	    encitems[index] = base_crypto.mkhash(r, encitem);
	});

	cb(r, encitems);
    }

    par_enc(k, ptext, callback);
}


var _check_index = function(k, word, ciph, cb) {
    MylarCrypto.index_enc(k, word, function(iciph) {
	MylarCrypto.match(iciph, ciph, cb);
    });
}

// check if enctext is a correct encryption of text
// calls cb with true or false
MylarCrypto.is_consistent = function(k, ptext, enctext, cb) {
    setup_crypto();


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
    setup_crypto();


    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.adjust(tok, delta, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Adjust(tok, delta));
    else if(typeof EncApp != 'undefined')
	enc_return(EncApp.adjust(tok, delta));
    else
        enc_module.postMessage("adjust(" + tok + "," + delta + ")");
};

MylarCrypto.match = function(tok, cipher, cb) {
    setup_crypto();


    enc_return = cb;
    if (USE_CRYPTO_SERVER) {
	crypto_server.match(tok, cipher, cb);
	return;
    }
  
    var enc_fire_e = enc_fire();
    if (enc_fire_e && enc_fire_e.valid)
        cb(enc_fire_e.Match(tok, cipher));
    else if(typeof EncApp != 'undefined')
	enc_return(EncApp.match(tok, cipher));
    else
        enc_module.postMessage("match(" + tok + "," + cipher + ")");
};

