// pdos.csail.mit.edu
// author: helfer@csail.mit.edu
// some code based on HeaderSpy

//dump("service start ---\n");
if ("undefined" === typeof(Ci)) {
  var Ci = Components.interfaces;
}
if ("undefined" === typeof(Cc)) {
  var Cc = Components.classes;
}
if ("undefined" === typeof(Cu)) {
  var Cu = Components.utils;
}

if (typeof CCIN == "undefined") {
    function CCIN(cName, ifaceName){
        return Cc[cName].createInstance(Ci[ifaceName]);
    }
}

//import some utility functions
Cu.import("chrome://mylar/content/sjcl.js");
Cu.import("chrome://mylar/content/sha1.js");
Cu.import("chrome://mylar/content/parseUri.js");

const MYLAR_SERVICE_NAME = "Mylar Service";
const MYLAR_SERVICE_CID = Components.ID("{f6480eac-e13a-494c-85ba-4de1817abbbd}");
const MYLAR_SERVICE_CONTRACTID = "@mylar.csail.mit.edu/service;1";
const MYLAR_CATMAN_CONTRACTID = "@mozilla.org/categorymanager;1";

function mylar_service() { // FF 4+
    this.wrappedJSObject = this;
    this.init();
}

if ("undefined" == typeof(CFNamespace)) {
  var CFNamespace = {};
}

/*
 * global objects for this component
 */
CFNamespace = {
    safe_pages: {},
    serialized_public:{},
    pub: {},

    encode_utf8: function(s) {
        return unescape( encodeURIComponent( s ) );
    },

    decode_utf8: function(s) {
        return decodeURIComponent( escape( s ) );
    },

    uri2key: function(uri){
        return uri['protocol']+'://'+uri['host']+':'+uri['port'];
    },

    is_safe_page: function(uri) {
        uri = parseUri(uri);
        var key = this.uri2key(uri);
        return this.safe_pages.hasOwnProperty(key);
    },

    add_safe_page: function(uri) {
        var key = this.uri2key(uri);
        dump("adding " + key + " to safe pages\n");
        this.safe_pages[key] = true;
    },

    /*
     * load current developer public key
     */
    set_public_key: function(uri,serialized_key) {
        if(serialized_key == this.serialized_public[this.uri2key(uri)])
            return; //no need to recompute
        try{
            this.serialized_public[this.uri2key(uri)] = serialized_key;
            c = sjcl.ecc.curves['c192'];
            pt = c.fromBits(sjcl.codec.hex.toBits(this.serialized_public[this.uri2key(uri)]));
            this.pub[this.uri2key(uri)] = new sjcl.ecc["ecdsa"].publicKey(c,pt);
        } catch (e) {
            dump("CF Error: " + e + "\n");
        }
    },

    get_public_key: function(uri) {
        //just crash if not found?
        if(this.pub.hasOwnProperty(this.uri2key(uri)))
            return this.pub[this.uri2key(uri)];
        return false;
    },

    //return hash value, if query string contains well formated mylar_hash
    //return true if there is mylar_hash in uri
    //return false if uri doesn't contain 'mylar_hash='
    checkForHash: function (uri){
        var key = 'mylar_hash=';
        var kpos = uri.query.indexOf(key);
        if(kpos < 0){
            return false;
        }
       
        var hashstring =  uri.query.substr(kpos+key.length,40);
        //parse as hexadecimal to check format
        if(isNaN(parseInt(hashstring,16)))
            return true; //return true to force hash check

        return hashstring;
    },

};
CFN = CFNamespace;

mylar_service.flag = 1;
mylar_service.prototype =
{
    // this must match whatever is in chrome.manifest!
    classID: MYLAR_SERVICE_CID, // FF 4+
    classDescription: MYLAR_SERVICE_NAME,
    contractID: MYLAR_SERVICE_CONTRACTID,

    //QueryInterface: XPCOMUtils.generateQI([Ci.nsIMyComponent]),
    QueryInterface: function(iid) {
        if (iid.equals(Ci.nsISupports)
                || iid.equals(Ci.nsISupportsWeakReference)
                || iid.equals(Ci.nsIWebProgressListener)
                || iid.equals(Ci.nsIHttpNotify)
                || iid.equals(Ci.nsIObserver)
                ) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },

    get509XSignature: function (si){
        si.QueryInterface(Ci.nsISSLStatusProvider);
        var st = si.SSLStatus;
        if (st){
            st.QueryInterface(Ci.nsISSLStatus);
            var cert = st.serverCert;
            if(cert){
                var sn = cert.subjectName;
                //var arr = sn.match("/L=(\w+)/g");
                //regexp didn't work in FF..., so here's a low-tech approach
                var mark = 'L=cf-dev-sig:';
                if(sn.indexOf(mark)>=0){
                    var k = sn.slice(sn.indexOf(mark)+mark.length).split(',')[0];
                    //dump('sig ' + k + '\n');
                    return k;
                }
            }
        }
        return false;
    },

    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "app-startup" || aTopic == "profile-after-change") { 
        // FF 4+: profile-after-change
            this.observers = [];
            this.delays    = [];

            var observerService = Cc["@mozilla.org/observer-service;1"].
                getService(Ci.nsIObserverService);
            observerService.addObserver(this, "http-on-modify-request", false);
            observerService.addObserver(this, "http-on-examine-response", false);

        } else if (aTopic == "http-on-modify-request") {
            var s = new Date()
            //dump("start modify " + s.getTime() + "\n");
            aSubject.QueryInterface(Ci.nsIHttpChannel);
            this.onModifyRequest(aSubject);
            var d = new Date()
            //dump("end modify " + (d.getTime()-s) + "\n");
        } else if (aTopic == "http-on-examine-response") {
            var s = new Date()
            //dump("start http-on-examine " + s.getTime() + "\n");
            aSubject.QueryInterface(Ci.nsIHttpChannel);
            //dump("hash " + hash + "\n");
            //dump("uri " + aSubject.originalURI.spec);
            var uri = parseUri(aSubject.originalURI.spec)
            var hash = CFN.checkForHash(uri);
            var si = aSubject.securityInfo;

            //extract developer sig from cert. 
            //currently stored in 'locality' field of Subject Name
            var attached = false;
            if(si){
                var k = this.get509XSignature(si) 
                if (k) {
                    CFN.set_public_key(uri,k);
                    this.attachChannelListener(aSubject);
                    attached = true;
                    dump("page has sig: "+aSubject.originalURI.spec + "\n");
                }
            }
            if(hash && !attached){
                dump("listening for hash\n");
                //aSubject.referrer = Subject.originalURI;
                this.attachChannelListener(aSubject,'hash_only');
            }
            var d = new Date()
            //dump("end http-on-examine " + (d.getTime()-s) + "\n");
            //no other tests needed, we rely on FF to have verified the cert.
        }
    },

    addObserver : function (observer) {
        //dump("observer added\n");
        this.observers[observer] = observer;
    },

    removeObserver : function (observer) {
        //dump("observer removed\n");
        delete this.observers[observer];
    },
  
    onModifyRequest: function(oHttp) {
        //XXX: Not sure if the referrer field can't be modified... this might be a security hole
        if(CFN.is_safe_page(oHttp.originalURI.spec) || CFN.is_safe_page(oHttp.referrer.spec)){
          //prevent loading from cache, because cache might store malicious content
          //and firefox will load stuff from cache before we can intercept it
         oHttp.loadFlags |= Ci.nsICachingChannel.LOAD_BYPASS_LOCAL_CACHE;
        }
    },

    attachChannelListener: function(oHttp,type) {
        try{
            //intercept http response content in inITraceableChannel
            var newListener = new CopyTracingListener(type);
            oHttp.QueryInterface(Ci.nsITraceableChannel);
            newListener.originalListener = oHttp.setNewListener(newListener);
        } catch (e) {
            dump("ERROR: " + e + "\n");
        }
    },

    // functions called from chrome component ----------------------
    hello: function() {
        return CFNamespace.safe_pages;
    },
    check_safety: function(uri) {
        return CFN.is_safe_page(uri);
    },
    //-------------------------------------------------------------

    init: function() {
    },

    destroy: function() {
    },
};


/*
 * Copy tracing listener. Here's where the meat of this extension is.
 */
function CopyTracingListener(type) {
    this.originalListener = null;
    this.type = type;
}

CopyTracingListener.prototype =
{

  _pageIsSigned: false, //local variable, just for speedup
  _hasher: undefined,
 
  onStartRequest: function(request, context) {

    var d = new Date()
    //dump("on Start request " + d.getTime() + "\n");
      var httpChannel = request.QueryInterface(Ci.nsIHttpChannel);
      //dump("URI:" + request.URI.spec + "\n");
      this.startTime = new Date();
      this.receivedData = [];   // array for incoming data.
      this.offsetcount = [];  //array for passing on chunks of data
      this._pageIsSigned = false; //header contains CF signature
      this.pageSignature = null;
      this._hasher = Cc["@mozilla.org/security/hash;1"]
                   .createInstance(Components.interfaces.nsICryptoHash),
      this._hasher.init(this._hasher.SHA1);
      try {
          var chan = request.QueryInterface(Ci.nsIHttpChannel);
          this.ContentType = chan.getResponseHeader("Content-Type");
          this.pageSignature = chan.getResponseHeader("mylar-signature");
          this._pageIsSigned = true;
      } catch (anError) {
          //dump("page not signed\n");
      }
      this.originalListener.onStartRequest(request, context);
  },
 
  /*
   * On data available caches data for hashing in onStopRequest 
   */
  onDataAvailable: function(request, context, inputStream, offset, count)
  {
    var start = new Date()
    //dump("data available " + start.getTime() + "\n");
    try {
      var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1", 
                             "nsIBinaryInputStream");
      binaryInputStream.setInputStream(inputStream);
      var data = binaryInputStream.readByteArray(count);
      this._hasher.update(data, data.length);
      this.receivedData.push(data);
      this.offsetcount.push([offset,count]);

    } catch (e) {
        dump("CF Error: " + e + "\n");
    }
    var end = new Date()
    //dump("on data done " + (end-start) + "\n");
  },

  /*
   * onStopRequest: at this point, all data has been held back
   * do checks to decide whether or not data is safe to load
   */
  onStopRequest: function(request, context, statusCode)
  {
    var start = new Date()
    //dump("on Stop request " + start.getTime() + "\n");
    var uri = parseUri(request.originalURI.spec);
    //dump("uri is: " + uri['source'] + "\n");

    try{
      var httpRequest = request.QueryInterface(Ci.nsIRequest);
      //var responseSource = this.receivedData.join('');

      //var d = new Date()
      //dump("after join" + (d.getTime()-start) + "\n");
      //dump("len after join" + responseSource.length + "\n");

      var hash = this._hasher.finish(false);
      // return the two-digit hexadecimal code for a byte
      function toHexString(charCode)
      {
        return ("0" + charCode.toString(16)).slice(-2);
      }
  
      // convert the binary hash data to a hex string.
      var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");



      var hashed = s; //Sha1.hash(responseSource,false);
      //check for hash if present:
      var prehash = CFN.checkForHash(uri);
      if(prehash && prehash !== hashed){
          dump('content failed hash check\n');
          dump('expected: ' + prehash + ' actual: ' + hashed + "\n");
          this.emitFakeResponse(request,context,statusCode,uri);
          return;
      }


      //if outside secure origin, skip signature check
      if(this.type === 'hash_only'){
        var d = new Date()
        //dump("stop request done hash before pass" + (d.getTime()-start) + "\n");
        this.passOnData(request,context,statusCode,uri);
        var d = new Date()
        //dump("stop request done hash after pass" + (d.getTime()-start) + "\n");
        //dump("stop request done hash total time" + (d.getTime()-this.startTime) + "\n");
        return;
      }

      //verify signature or hash on all content
      var sig = this.verifySignature(
                 this.pageSignature,
                 hashed,
                 this.ContentType,
                 uri['file'],
                 uri //XXX clean this up some time
                );
      if(sig){
        CFN.add_safe_page(uri)
        this.passOnData(request,context,statusCode,uri);
        var d = new Date()
        //dump("stop request done sig" + (d.getTime()-start) + "\n");
        //dump("stop request done sig total time" + (d.getTime()-this.startTime) + "\n");
        return;
      }

      //if in doubt, throw it out.
      this.emitFakeResponse(request,context,statusCode,uri);
    var d = new Date()
    //dump("stop request done fake" + (d.getTime()-start) + "\n");
    //dump("stop request done fake total time" + (d.getTime()-this.startTime) + "\n");

    } catch (anError) {
      dump("CF ERROR: " + anError + "\n");
    }
  },
  
  QueryInterface: function (aIID) {
      if (aIID.equals(Ci.nsIStreamListener) ||
          aIID.equals(Ci.nsISupports)) {
          return this;
      }
      throw Components.results.NS_NOINTERFACE;
  },

  verifySignature: function(sig,hashed,contentType,uri_filename,uri){
    try{
      sn = sjcl.codec.hex.toBits(sig) 
      var hstring = contentType + ':' + hashed + ':' + uri_filename;
      var hash2 = Sha1.hash(hstring,true);
      var pub = CFN.get_public_key(uri);
      pub.verify(hash2,sn);//throws error if not safe
      //dump('signature valid for ' + uri_filename + "\n");
      return true;
    } catch (anError) {
      dump("signature not valid for " + uri_filename + "\n");
      return false;
    }
    return false;
  },

  //passes data held back by onAvailable to next listener in queue.
  passOnData: function(request,context,statusCode,uri) {
    for (var i = 0; i < this.receivedData.length; i++) {
      var offset = this.offsetcount[i][0];
      var count = this.offsetcount[i][1];
      
      //And we pass it on...
      var storageStream = CCIN("@mozilla.org/storagestream;1", 
                                       "nsIStorageStream");
      //8192 is the segment size in bytes,
      //count is the maximum size of the stream in bytes
      storageStream.init(8192, count, null); 
      var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",  
                                       "nsIBinaryOutputStream");
      binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
      binaryOutputStream.writeByteArray(this.receivedData[i], count);
      try {
        this.originalListener.onDataAvailable(request, 
                        context,
                        storageStream.newInputStream(0), 
                        offset, 
                        count); 
      } catch ( e ) {
        //not sure why this fails sometimes on abort response...
        dump("caught exception: " + e + "\n");
      }

    }    
    this.originalListener.onStopRequest(request, context, statusCode);
  },
  
  emitFakeResponse: function(request,context,statusCode,uri){
    // Call old listener with our data and set "response" headers
    var stream = Cc["@mozilla.org/io/string-input-stream;1"]
                   .createInstance(Ci.nsIStringInputStream);

    stream.setData("CF extension blocked this content from loading",-1); 

    //XXX: throws Exception sometimes. Find out why.
    this.originalListener.onDataAvailable(
        request, 
        context, 
        stream, 
        0, 
        stream.available()
    );
    this.originalListener.onStopRequest(
        request, 
        context, 
        Components.results.NS_OK
    );
    dump("CFExtension: fake response emitted\n");
  }, 

  /*
   * Write data to file, sometimes useful for debugging
   */
  writeToFile: function(data,filename) {
      try{
      var aFile = Cc["@mozilla.org/file/local;1"].
                  createInstance(Ci.nsILocalFile);

      aFile.initWithPath(filename);
      aFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0600);
                  
      var stream = Cc["@mozilla.org/network/safe-file-output-stream;1"].
          createInstance(Ci.nsIFileOutputStream);
      stream.init(aFile, 0x04 | 0x08 | 0x20, 0600, 0);
                  
      stream.write(data, data.length);
      if (stream instanceof Ci.nsISafeOutputStream) {
          stream.finish();
      } else {
          stream.close();
      }
      } catch (e) {
          dump("CF Error: " + e + "\n");
      }
      dump("file written");
  },

}

// FF 4+
// https://developer.mozilla.org/en/XPCOM/XPCOM_changes_in_Gecko_2.0
// import utils
try {
    Cu.import("resource://gre/modules/XPCOMUtils.jsm");
}
catch(e) {}
//
// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
if (typeof XPCOMUtils != "undefined") {
    if (XPCOMUtils.generateNSGetFactory) {
        var NSGetFactory = XPCOMUtils.generateNSGetFactory([mylar_service]);
//    } else {
//        var NSGetModule = XPCOMUtils.generateNSGetModule([mylar_service]);
    }
}

// --------------------------------
dump("Mylar service started\n");
