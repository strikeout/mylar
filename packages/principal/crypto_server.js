/* Interface to crypto server. Synchronous. */


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


