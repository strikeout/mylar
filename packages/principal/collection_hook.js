
/* MeteorEnc: Each field names f gets extra fields: f_enc, f_sig,
   and optionally f_mk for search.
   The field f contains plaintext and is not sent to the server
   unless ENC_DEBUG is true */

var debug = false;

// if true, an unencrypted copy of the fields
// will be kept for debugging mode
var ENC_DEBUG = true;

set_enc_debug = function (flag) {
    ENC_DEBUG = flag;
};


enc_field_name = function(f) {
    return f + "_enc";
}
sig_field_name = function(f) {
    return f + "_sig";
}

search_field_name = function(f) {
    return f + "_mk";
}

rand_field_name = function(f) {
    return f + "_rand";
}


// returns a list of keys that show up in both a and b
var intersect = function(a, b) {
    r = [];

    _.each(a, function(f) {
        // XXX: We should split enc_fields() into two functions,
        // and check for exactly one of f and f+"_enc", depending on
        // whether we are trying to encrypt or decrypt a message.
        // A further complication is signed fields -- some of those
        // might be encrypted (so only the _enc version is present),
        // and some of those might be plaintext.
        if (_.has(b, f)) {
            r.push(f);
        }
    });

    return r;
};


function enc_fields(enc_fields, signed_fields, container) {
    return intersect(_.union(_.keys(enc_fields), _.keys(signed_fields)), container);
}

function fields_for_dec(enc_fields, signed_fields, container) {
    var r = []

    _.each(enc_fields, function(v, f) {
	if (_.has(container, enc_field_name(f))) {
	    r.push(f);
	}
    });

    return r;
}


// returns a function F, such that F
// looks up the enc and sign principals for the field f
lookup_princ_func = function(f, container) {
    // given a list of annotations, such as self._enc_fields,
    // looks-up the principal in the annotation of field f
    return function(annot, cb) {

	var annotf = annot[f];
	if (!annotf) { // f has no annotation in annot
	    cb(undefined, undefined);
	    return;
	}
	var princ_id = container[annotf['princ']];
	
	if (!princ_id) {
	    cb(undefined, undefined);
	    return;
	}

	Principal._lookupByID(princ_id, function(princ){
		cb(undefined, princ);
	});
    }
    
}


/*
  Given container -- an object with key (field name) and value (enc value) 
  fields -- set of field names that are encrypted or signed,
  decrypt their values in container
*/
_dec_fields = function(_enc_fields, _signed_fields, container, fields, callback) {
    
    var cb = _.after(fields.length, function() {
        callback();
    });
    
    _.each(fields, function(f) {
	async.map([_enc_fields, _signed_fields], lookup_princ_func(f, container),
		  function(err, results) {
		      if (err) {
			  throw new Error("could not find princs");
		      }
		      var dec_princ = results[0];
		      var verif_princ = results[1];


		      if (verif_princ) {
			  if (!verif_princ.verify(JSON.stringify(container[enc_field_name(f)]), container[sig_field_name(f)])) {
			      throw new Error("signature does not verify on field " + f);
			  }
		      }
		      if (debug) console.log("dec f; f is " + f);

		      if (dec_princ) {
			  var res  = JSON.parse(dec_princ.sym_decrypt(container[enc_field_name(f)]));
			  if (ENC_DEBUG) {
			      if (JSON.stringify(res) != JSON.stringify(container[f])) {
				  throw new Error ("inconsistency in the value decrypted and plaintext");
			      }
			  } else {
			      container[f] = res;
			  }
			  if (is_searchable(this._enc_fields, f)) {
			      MylarCrypto.is_consistent(dec_princ.keys.mk_key, container[f], container[search_field_name(f)],
					function(res) {
					    if (!res)
						throw new Error(
						    "search encryption not consistent for "
							+ f + " content " + container[f]);
					    cb();
					});
			      return;
			  } 
		      } else {
			   console.log("no dec princ");
		      }
		      cb();
		  });	
    });
}

var is_searchable = function(enc_fields, field) {
    if (!enc_fields) {
	return false;
    }
    var annot = enc_fields[field];
    if (annot && (annot['attr'] == 'SEARCHABLE'
		  || annot['attr'] == 'SEARCHABLE INDEX')) 
	return true;
    else
	return false;
}


is_indexable =  function(enc_fields, field) {
    if (!enc_fields)
	return false;

    var annot = enc_fields[field];
    if (annot && annot['attr'] == 'SEARCHABLE INDEX') 
	return true;
    else
	return false;
}

function insert_in_enc_index(ciph){
    _.each(ciph, function(item) {
	IndexEnc.insert({_id: item});
    });
}




// encrypts & signs a document
// container is a map of key to values
//_enc_fields is set
_enc_row_helper = function(_enc_fields, _signed_fields, container, callback) {

    /* r is the set of fields in this row that we need to encrypt or sign */
    var r = enc_fields(_enc_fields, _signed_fields, container);

    if (r.length == 0) {
        callback();
        return;
    }

    // we start timing here because we want time of encryption
    // so we want to average over docs with enc fields
    startTime("ENC");
    var cb = _.after(r.length, function() {
	endTime("ENC");
	callback();
    });

   _.each(r, function(f) {

       async.map([_enc_fields, _signed_fields], lookup_princ_func(f, container),
		 function(err, results) {
		     if (err) {
			 throw new Error("could not find princs");
		     }
		     var enc_princ = results[0];
		     var sign_princ = results[1];

		     // encrypt value
		     if (enc_princ) {
			 container[enc_field_name(f)] = enc_princ.sym_encrypt(JSON.stringify(container[f]));
			 if (sign_princ) {
			     container[sig_field_name(f)] = sign_princ.sign(JSON.stringify(container[enc_field_name(f)]));
			 }

			 var done_encrypt = function() {
			     if (!ENC_DEBUG) {
				 delete container[f];
			     }
			     cb();
			 }

			     startTime("mk");
			 if (is_searchable(_enc_fields, f)) {

			     if (debug) console.log("is searchable");
			     //var time1 = window.performance.now();
			     MylarCrypto.text_encrypt(enc_princ.keys.mk_key,
						      container[f],
						      function(rand, ciph) {
							  container[search_field_name(f)] = ciph;
							  container[rand_field_name(f)] = rand;
							  //var time1a = window.performance.now();
							  if (is_indexable(_enc_fields, f)) {
							      if (debug) console.log("inserting in index");
							      insert_in_enc_index(ciph);
							  }
							  //var time1b = window.performance.now();
							  //var time2 = window.performance.now();
							  //console.log("all search takes " + (time2-time1));
							  //console.log("indexing search " + (time1b-time1a));
							  endTime("mk");
							  done_encrypt();
						      });
			 } else {
			     done_encrypt();
			 }
			 return;
		     }

		     // do not encrypt value
		     if (sign_princ) {
			 container[sig_field_name(f)] = sign_princ.sign(JSON.stringify(container[f]));
		     }
		     cb();
	      });	
   });
 
}



// container is an object with key (field name), value (enc field value)
_dec_msg_helper = function(_enc_fields, _signed_fields, container, callback) {
    
    var r = fields_for_dec(self._enc_fields, self._signed_fields, container);
    if (debug) console.log("dec: r is " + JSON.stringify(r));
    
    if (r.length > 0) {
	startTime("DECMSG");
	var callback_q = [];
	self._decrypt_cb.push(callback_q);
	callback2 = function () {
	    endTime("DECMSG");
	    if (callback) {
		callback();
	    }
	    self._decrypt_cb = _.without(self._decrypt_cb, callback_q);
	    _.each(callback_q, function (f) {
		f();
	    });
	};

        _dec_fields(_enc_fields,_signed_fields, container, r, callback2);
    } else {
        callback && callback();
    }

}


_process_enc_fields = function(_enc_fields, lst) {
 
    if (_enc_fields && _.isEqual(_enc_fields, lst)) {//annotations already set
	return _enc_fields; 
    }
    
    // make sure these annotations were not already set
    if (_enc_fields && !_.isEqual(_enc_fields,{}) && !_.isEqual(_enc_fields, lst)) {
	throw new Error("cannot declare different annotations for the same collection");
    }
    

    _enc_fields = lst;

    _.each(lst, function(val){
	var type = val["princtype"];
	var attr = val["attr"];

	var pt = PrincType.findOne({type: type});
	if (pt == undefined) {
	    PrincType.insert({type: type, searchable: (attr == "SEARCHABLE")});
	} else {
	    if (attr == "SEARCHABLE" && !pt['searchable'] ) {
		PrincType.update({type:type}, {$set: {'searchable' : true}});
	    }	    
	}
    });

    return _enc_fields;
}