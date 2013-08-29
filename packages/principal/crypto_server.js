/* Interface to crypto server. Synchronous. */

var crypto_server;

if (Meteor.isServer) { // server is synchronous
    crypto_server = (function () {
	
	var base_url = 'http://localhost:8082/';
	var ct_sep = ',';
	
	// synchronous send request
	function send_request(url_extension) {
	    var res =  Meteor.http.call("GET", base_url+url_extension);
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
	    }
	};
    }());
    
    
}

if (Meteor.isClient) { // client must be asynchronous
    crypto_server = (function () {
	
	var base_url = 'http://localhost:8082/';
	var ct_sep = ',';
	
	// calls cb on the content of the response
	function send_request(url_extension, cb) {
	    var res =  Meteor.http.call("GET", base_url+url_extension, function(){
		cb(res.content);
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