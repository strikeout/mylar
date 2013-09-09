
/*****
      Collection.search:        // runs client-side
              {field: word}    :  the field over which to search, the word to search
	      princ            :  the principal that does the search
	      [filter_args]    :  arguments to the filter function
	      [callback]

      Collection.search_filter: // runs server-side
              [filter]         : function that takes as input filter_args and outputs a list of filters
	      [proj]           : a list of field names for which the search results should contain values
	                         default is all fields in the document

      Callback will be called with results of search
      the results are a list of documents with only fields from proj set
      these documents satisfy any filter from filter(filter_args)
                      AND have field = word
      the user gets subscribed to these search results 

*******************/

search_cb = undefined;
search_collec = undefined;

if (Meteor.isClient) {
Meteor.Collection.prototype.search = function(pubname, wordmap, princ, filter_args, callback) {
    var self = this;
    
    var mapkeys = _.keys(wordmap);
    
    if (_.keys(wordmap).length != 1) {
	throw new Error("must specify one word");
    }
    var field = mapkeys[0];
    var word = wordmap[field];
    
    if (!word || word == "") {
	return;
    }
    
    Crypto.token(princ.keys.mk_key, word, function(token){
	var search_info = {};
	search_info["args"] = filter_args;
	search_info["princ"] = princ.id;
	search_info["enc_princ"] = self._enc_fields[field].princ;
	search_info["token"] = token;
	search_info["field"] = field;
        search_info["pubname"] = pubname;
	
	search_cb = callback;
	search_collec = self;
	Session.set("_search_info", search_info);
    });
    
}
    
Deps.autorun(function(){
    // check if subscriptions get closed properly
    
    var search_info = Session.get("_search_info");
    
    if (search_info) {
	var token = search_info.token;
	Meteor.subscribe(search_info["pubname"], search_info["args"], token,
			 search_info["enc_princ"], search_info["princ"], search_field_name(search_info["field"]),
			 function(){ // on ready handle
			     var cb = search_cb;
			     if (cb) {
				 cb(search_collec.find({_tag: token}).fetch());
			     }
			     Session.set("_search_info", null);
			     search_cb = undefined;
			 });
    }
});
    
}

if (Meteor.isServer) {
    
function getProj(proj, doc, token) {
    if (!proj) {
	return _.extend(doc, {_tag: token});
    }

    var res = {};
    res["_tag"] = token;

    _each(proj, function(field){
	res[field] = doc[field];
    });

    return res;
}

Meteor.Collection.prototype.publish_search_filter = function(pubname, filter, proj) {
	
    var self_col = this;
    
    Meteor.publish(pubname, function(args, token, enc_princ, princ, field){
	
	var self = this;
	
	if (token != null) {
	    
	    var filters = filter(args);
	    
	    var handles = [];
	    _.each(filters, function(filter){
		var handle = self_col.find(filter).observe({
		    added: function(doc) {
			// first check if it matches
			var wk = WrappedKeys.findOne({principal: doc[enc_princ], wrapped_for: princ});
			if (!wk) {
			    throw new Error("no wrapped key");
			}
			if (!wk.delta) {
			    throw new Error("missing delta");
			}
			var adjusted = crypto_server.adjust(token, wk.delta);
			var enctext = doc[field];
			_.some(enctext, function(encword){
			    if (crypto_server.match(adjusted, encword)) {
				
				self.added("messages", doc._id, getProj(proj, doc, token));
				
				return true;
			    }
			});
		    }
		});
		handles.push(handle);
	    });
	    
	    
	    self.onStop(function(){
		_.each(handles, function(handle) {handle.stop();});
	    });
	    
	    self.ready();
	    
	}
    });
    
}
}
