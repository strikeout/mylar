
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


var sub_name = function(coll, pub) {
    return coll+"++"+pub;
}


if (Meteor.isClient) {
Meteor.Collection.prototype.search = function(pubname, wordmap, princ, filter_args, callback) {
    var self = this;

    /* First check if this principal has any
       deltas to convert in inbox */
    var dbprinc = Principals.findOne({_id: princ.id});
    if (!dbprinc) {
	throw new Error("principal does not exist in db");
    }
    if (dbprinc.accessInbox.length > 0) {
	_processAccessInbox(princ, dbprinc);
    }
    
    var mapkeys = _.keys(wordmap);
    
    if (_.keys(wordmap).length != 1) {
	throw new Error("must specify one word");
    }
    var field = mapkeys[0];
    var word = wordmap[field];
    
    if (!word || word == "") {
	return;
    }

    console.log("search " + JSON.stringify(wordmap));

    console.log("princ.keys" + serialize_keys(princ.keys));
    
    MylarCrypto.token(princ.keys.mk_key, word, function(token){
	var search_info = {};
	search_info["args"] = filter_args;
	search_info["princ"] = princ.id;
	search_info["enc_princ"] = self._enc_fields[field].princ;
	search_info["token"] = token;
	search_info["field"] = field;
        search_info["pubname"] = pubname;
	search_info["has_index"] = is_indexable(self._enc_fields, field);
	
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
	Meteor.subscribe(sub_name(search_collec._name, search_info["pubname"]),
			 search_info["args"], token,
			 search_info["enc_princ"], search_info["princ"],
			 search_info["field"], search_info["has_index"],
			 function(){ // on ready handle
			     var self = this;
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
    
    function getProj(doc, proj, token) {
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


    
    Meteor.publish(sub_name(self_col._name, pubname),
      function(args, token, enc_princ, princ, field, has_index){

	  console.log("search for " + field + " enc_princ " + enc_princ);
	var self = this;

	// a cache of adjusted tokens so we don't adjust
	// to same principal many times
	var adj_toks = {}
	  
	if (token != null) {
	    
	    var filters = [{}];//one filter, all data
	    if (filter)
		filters = filter(args);

	    var handles = [];

	    var rand_f = rand_field_name(field);
	    var search_f = rand_field_name(field);

	    var search_proj = {};
	    search_proj[enc_princ] = 1;
	    search_proj[rand_f] = 1;
	    if (!has_index) {// don't pull out the field if we use index
		search_proj[search_f] = 1;
	    }
	    console.log(JSON.stringify(search_proj));
	    _.each(filters, function(filter){
		var handle = self_col.find(filter, {fields: search_proj}).observe({
		    added: function(doc) {
			var princid = doc[enc_princ];
			var adjusted = adj_toks[princid];
			console.log("observing " + JSON.stringify(doc));

			if (!adjusted) {
			    // first check if it matches
			    var wk = WrappedKeys.findOne({principal: princid,
							  wrapped_for: princ});
			    if (!wk) {
				throw new Error("no wrapped key");
			    }
			    if (!wk.delta) {
				throw new Error("missing delta");
			    }
			
			    adjusted = crypto_server.adjust(token, wk.delta);
			    adj_toks[princid] = adjusted; 
			} 

			var rand = doc[rand_f];
			adjusted = base_crypto.mkhash(rand, adjusted);
			if (has_index) {
			    var res = IndexEnc.findOne({_id : adjusted});
			    if (res) {
				self.added(self_col._name, doc._id,
					   getProj(self_col.findOne(doc._id), proj, token));
			    }
			} else {
			    _.some(enctext, function(encword, index){
				if (index) {
				    if (adjusted == encword) {
					self.added(self_col._name, doc._id,
						   getProj(proj, doc, token));
					return true;
				    }
				}
			    });
			}
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
