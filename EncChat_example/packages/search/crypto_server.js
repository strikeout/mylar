/* Interface to crypto server. Synchronous. */

crypto_server = undefined;
var base_url = 'https://localhost:8443/';

if (Meteor.isServer) { // server is synchronous
    crypto_server = (function () {
	
	// synchronous send request
	function send_request(url_extension) {
	    //console.log("SENDING " + base_url + url_extension);
	    var res =  Meteor.http.call("GET", base_url+url_extension, {headers:{"Connection": "close"}});
	    if (!res.content || !res.content.length) {
		console.log("crypto server could not service request: " + res.headers + " " + res.content);
		return null;
	    }
	    return res.content;
	}
	
	return {
	    
	    keygen: function() {
		var url_ext = 'keygen?';
		return send_request(url_ext);
	    },
	    
	    delta : function(k1, k2) {
		var url_ext = 'delta?k1=' + k1 + '&k2=' + k2;
		return send_request(url_ext);
	    },

	    encrypt : function(k, word) {
		var url_ext = 'encrypt?k=' + k + '&word=' + word;
		return send_request(url_ext);
	    },
	    
	    index_enc : function(k, word) {
		var url_ext = 'index_enc?k=' + k + '&word=' + word;
		return send_request(url_ext);
	    },

	    par_enc : function(k, par) {
		var url_ext = 'par_enc?k=' + k + '&par=' + B64.encode(par);
		return send_request(url_ext);
	    },

	    token : function(k, word) {
		var url_ext = 'token?k=' + k + '&word=' + word;
		return send_request(url_ext);
	    },
	    
	    adjust : function(tok, delta) {
		var url_ext = 'adjust?tok=' + tok + '&delta=' + delta;
		return send_request(url_ext);
	    },
	    
	    match: function(searchtok, ciph) {
		var url_ext = 'match?searchtok=' + searchtok + "&ciph=" + ciph;
		return send_request(url_ext) == '1';
	    },

	    pkeygen: function() {
		var url_ext = 'pkeygen?';
		return send_request(url_ext);
	    },
	    	    
	    pencrypt: function(key, plain) {
		var url_ext = 'pencrypt?k=' + key + "&plain=" + plain;
		return send_request(url_ext);
	    },
	    
	    padd: function(key, c1, c2) {
		var url_ext = 'padd?k=' + key + '&c1=' + c1 + '&c2=' + c2;
		return send_request(url_ext);
	    },
	    
	    pencrypt: function(key, cipher) {
		var url_ext = 'pdecrypt?k=' + key + "&cipher=" + cipher;
		return send_request(url_ext);
	    }
	};
    }());
    
    
}

if (Meteor.isClient) { // client must be asynchronous
    crypto_server = (function () {
	
	// calls cb on the content of the response
	function send_request(url_extension, cb) {
        console.log("url for debug: " + base_url+url_extension);
        document.debug_url = base_url + url_extension;
	    Meteor.http.call("GET", base_url+url_extension, {}, function(error, res){
		if (!error && res && res.statusCode == 200) {
		    cb(res.content);
		} else {
            if(error)
                console.error("Crypto server error: " + error.toString());
		    throw new Error("Bad result from cryptoserver");
		    //cb();
		}
	    });
	}
	
	return {

	    /* Functions below call cb on the result
	       of the multi-key operation */
	    
	    keygen: function(cb) {
		var url_ext = 'keygen?';
		send_request(url_ext, cb);
	    },
	    
	    delta : function(k1, k2, cb) {
		var url_ext = 'delta?k1=' + k1 + '&k2=' + k2;
		send_request(url_ext, cb);
	    },

	    encrypt : function(k, word, cb) {
		var url_ext = 'encrypt?k=' + k + '&word=' + word;
		send_request(url_ext, cb);
	    },
	    
	    index_enc : function(k, word, cb) {
		var url_ext = 'index_enc?k=' + k + '&word=' + word;
		send_request(url_ext, cb);
	    },

	    par_enc : function(k, par, cb) {
		var url_ext = 'par_enc?k=' + k + '&par=' + B64.encode(par);
        //console.log('par ' + par);
        document.debug_B64 = B64;
        //console.log('urlext in b64 ' + url_ext);
		send_request(url_ext, cb);
	    },

	    token : function(k, word, cb) {
		var url_ext = 'token?k=' + k + '&word=' + word;
		send_request(url_ext, cb);
	    },
	    
	    adjust : function(tok, delta, cb) {
		var url_ext = 'adjust?tok=' + tok + '&delta=' + delta;
		send_request(url_ext, cb);
	    },
	    
	    match: function(searchtok, ciph, cb) {
		var url_ext = 'match?searchtok=' + searchtok + "&ciph=" + ciph;
		send_request(url_ext, function(res){
		    cb(res == '1');
		});
	    }
	};
    }());
    
}
