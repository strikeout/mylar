
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

MYLAR_USE_SEARCH = false;


search_cb = undefined;
search_collec = undefined;

const search_debug = false;

var sub_name = function(coll, pub) {
    return coll+"++"+pub;
}


if (Meteor.isClient) {

    
     
Mongo.Collection.prototype.search = function(pubname, wordmap, princ, filter_args, callback) {
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

    MylarCrypto.token(princ.keys.mk_key, word.toLowerCase(), function(token){
	var search_info = {};

	search_info["args"] = filter_args;
	search_info["princ"] = princ.id;
	search_info["enc_princ"] = self._enc_fields[field].princ;
	search_info["token"] = token;
	search_info["tag"] = token;
	search_info["field"] = field;
        search_info["pubname"] = pubname;
	search_info["has_index"] = is_indexable(self._enc_fields, field);

        // To force Meteor to re-do the autorun function below.
        search_info["freshness_nonce"] = Meteor.uuid();

	if (search_debug)
	    console.log("word " + word + " token " + token);
	
	search_cb = callback;
	search_collec = self;
	Session.set("_search_info", search_info);
    });
    
}
    
Deps.autorun(function(){
    // check if subscriptions get closed properly
    var search_info = Session.get("_search_info");
    
    if (search_info && search_collec) {
	var token = search_info.token;
	var tag = search_info.tag;

	var subname = sub_name(search_collec._name, search_info["pubname"]);

	console.log("subscribing subname " + subname);
	Meteor.subscribe(subname,
			 search_info["args"], token, tag,
			 search_info["enc_princ"], search_info["princ"],
			 search_info["field"], search_info["has_index"],
			 function(){ // on ready handle
			     var self = this;
			     //console.log("ready");
                  if(window.performance != undefined){
                     document.READY_TIME = window.performance.now()
                  } else {
                      document.READY_TIME = new Date().getTime();
                  }
			     Session.set("search_tag", tag);

			     var cb = search_cb;
			     if (cb) {
				 cb(search_collec.find({_tag: tag}));
			     }
			 });
    } else {
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
    res["_macs"] = doc['_macs'];

    _.each(proj, function(val, field){
	if (val == 1) {
	    res[field] = doc[field];
	}
    });

    return res;
}

Mongo.Collection.prototype.publish_search_filter = function(pubname, filter, proj) {
	
    var self_col = this;

    Meteor.publish(sub_name(self_col._name, pubname),
      function(args, token, tag, enc_princ, princ, field, has_index){
	  console.log("searching for " + tag);
          if (search_debug)
	      console.log("\n\n START SEARCH \n\n enc_princ " + enc_princ);
	  
	  var self = this;
	  
	  //var starttime = new Date().getTime();
	  var found = false;
	  
	// a cache of adjusted tokens so we don't adjust
	// to same principal many times
	var adj_toks = {}
	  
	if (token != null) {
	    
	    var filters = [{}];//one filter, all data
	    if (filter)
		filters = filter(args);

	    var handles = [];

	    var rand_f = rand_field_name(field);
	    var search_f = search_field_name(field);

	    _.each(filters, function(filter){
		//console.log("each");
		var handle = self_col.find(filter).observe({
		    added: function(doc) {
			var princid = doc[enc_princ];
			var adjusted = adj_toks[princid];

			//if (search_debug)
			//    console.log("considering doc " + JSON.stringify(doc));
			
			if (!adjusted) {
			    //console.log("not adjusted");
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

			if (search_debug)
			    console.log("adjusted " + adjusted + " has index " + has_index);
			
			if (has_index) {
			    var res = IndexEnc.findOne({_id : adjusted});
			    if (res) {
				//var fulldoc = self_col.findOne({_id: doc._id});
				
				if (search_debug)
				    console.log("adding " + JSON.stringify(doc));

				//var docproj = getProj(fulldoc, proj, token);
				var docproj = getProj(doc, proj, tag);
				
				if (search_debug)
				    console.log("\n\n docproj is " + JSON.stringify(docproj));
				
				self.added(self_col._name, doc._id, docproj);
				found = true;
					   
			    }
			} else {
			    if (search_debug) console.log("no index");
			    var enctext = doc[search_f];
			  if (!enctext) {
			    console.log("there is no search enc field; is the field SEARCHABLE?");
			  }
			    if (search_debug) console.log("enctext " + JSON.stringify(enctext));
			    _.some(enctext, function(encword, index){
				if (adjusted == encword) {
				    if (search_debug) {console.log("FOUND\n");}
				    var docproj = getProj(doc, proj, tag);
				    //var docproj = getProj(self_col.findOne({_id: doc._id}), proj, token);
				    if (search_debug)
					console.log("\n\n docproj is " + JSON.stringify(docproj));
				    self.added(self_col._name, doc._id, docproj);
				    found = true;
			      //console.log("matched " + JSON.stringify(enctext));
				    return true;
				}
			    });
			}
		    }
		});
		handles.push(handle);
	    });

	    //console.log("done");
	    
	    
	    self.onStop(function(){
		_.each(handles, function(handle) {handle.stop();});
	    });

	    //console.log("found " + found);

	    //console.log("time " + (new Date().getTime() - starttime));
	    self.ready();
	    
	}
    });
    
}



Mongo.Collection.prototype.publish_single_search_filter = function(pubname, filter, proj) {
	
    var self_col = this;


    var subname = sub_name(self_col._name, pubname);

    console.log("subname " + subname);

    Meteor.publish(subname,
      function(args, token, tag, enc_princ, princ, field, has_index){

        if (search_debug)
	    console.log("\n\n START SEARCH \n\n enc_princ " + enc_princ);
	  
        var self = this;

	var found = false;
	  
	if (token != null) {

	    // unstrigify tokens
	    adjtokens = JSON.parse(token);
	    
	    var filters = [{}];//one filter, all data
	    if (filter)
		filters = filter(args);

	    var handles = [];

	    var rand_f = rand_field_name(field);
	    var search_f = search_field_name(field);

	    _.each(filters, function(filter){
		var handle = self_col.find(filter).observe({
		    added: function(doc) {

			var princid = doc[enc_princ];
			var adjusted = adjtokens[princid];

			//if (search_debug)
			//    console.log("considering doc " + JSON.stringify(doc));
			
			if (!adjusted) {
			    throw new Error("should have gotten token for princid " + princid);
			} 

			var rand = doc[rand_f];
			adjusted = base_crypto.mkhash(rand, adjusted);

			if (search_debug)
			    console.log("adjusted " + adjusted + " has index " + has_index);
			
			var enctext = doc[search_f];
			if (search_debug) console.log("enctext " + JSON.stringify(enctext));
			_.some(enctext, function(encword, index){
			    if (adjusted == encword) {
				if (search_debug) {console.log("FOUND\n");}
				var docproj = getProj(doc, proj, tag);
				//var docproj = getProj(self_col.findOne({_id: doc._id}), proj, token);
				if (search_debug)
				    console.log("\n\n docproj is " + JSON.stringify(docproj));
				self.added(self_col._name, doc._id, docproj);
				found = true;
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

	    //console.log("found " + found);

	    //console.log("time " + (new Date().getTime() - starttime));
	    self.ready();
	    
	}
    });
    
}















    
}

/***********************************
*
* Single-key search for eval
* - only works for kChat
***********************************/

if (Meteor.isClient) {
       
 /*   
Mongo.Collection.prototype.single_search = function(pubname, wordmap, princ, filter_args, callback) {
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

    // need to figure out all rooms this user is in
    var rooms = Rooms.find({}).fetch();

    // need to lookup these room princs
    var roomprincs = {};

    var callback2 = _.after(rooms.length, function(){

	var search_info = {};
	search_info["args"] = filter_args;
	search_info["princ"] = "x";
	search_info["enc_princ"] = self._enc_fields[field].princ;
	var tokens = JSON.stringify(roomprincs);
	search_info["token"] = tokens;
	search_info["tag"] = base_crypto.mkhash(tokens);
	search_info["field"] = field;
        search_info["pubname"] = pubname;
	search_info["has_index"] = is_indexable(self._enc_fields, field);

	if (search_debug)
	    console.log("word " + word + " tokens " + tokens);
	
	search_cb = callback;
	search_collec = self;
	Session.set("_search_info", search_info);

    });

    _.each(rooms, function(room){
	var createdBy = room.createdByID;
	var creator_uname = Meteor.users.findOne({"_id": createdBy})["username"];

	Principal._lookupByID(room.roomprinc, 
	//Principal.lookup([new PrincAttr("room", room.roomTitle)], creator_uname,
			 function(princ) {
			     if (!princ._has_secret_keys()) {
				 throw new Error("princ does not have secret keys");
			     }
			     MylarCrypto.index_enc(princ.keys.mk_key, word, function(token){
				 roomprincs[princ.id] = token;
				 callback2();
			     });
			 });
    });
    
   
 }
*/

    
Mongo.Collection.prototype.single_search = function(pubname, wordmap, princ, filter_args, callback) {
    var self = this;

    if (!Submissions) {
	alert("single search is just for submit");
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

    // need to lookup these room princs
    var princs = {};

    var userscount = Meteor.users.find({}).count();

    var callback2 = _.after(userscount, function(){
	var search_info = {};
	search_info["args"] = filter_args;
	search_info["princ"] = "x";
	search_info["enc_princ"] = self._enc_fields[field].princ;
	var tokens = JSON.stringify(princs);
	search_info["token"] = tokens;
	search_info["tag"] = base_crypto.mkhash(tokens);
	search_info["field"] = field;
        search_info["pubname"] = pubname;
	search_info["has_index"] = is_indexable(self._enc_fields, field);

	if (search_debug)
	    console.log("word " + word + " tokens " + tokens);
	
	search_cb = callback;
	search_collec = self;
	Session.set("_search_info", search_info);

    });

    Meteor.users.find().forEach(function(doc){
	Principal._lookupByID(doc._pk, // assuming staff princ has cached validations of pk, name
//	Principal.lookup([new PrincAttr("user", doc.emails[0].address)],  ,
			 function(princ) {
			     if (!princ._has_secret_keys()) {
				 throw new Error("princ does not have secret keys");
			     }
			     MylarCrypto.index_enc(princ.keys.mk_key, word, function(token){
				 princs[princ.id] = token;
				 callback2();
			     });
			 });
    });

    
   
 }


}