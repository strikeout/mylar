// pdos.csail.mit.edu
// author: helfer@csail.mit.edu
// some code based on HeaderSpy

//TODO: combine host + port for same-origin check?
//TODO: do we need to clear cache at beginning of safe page load to ensure no unsafe content can be loaded?

//dump("service start ---\n");

//import some utility functions
Components.utils.import("chrome://cryptframe/content/sjcl.js");
Components.utils.import("chrome://cryptframe/content/sha1.js");
Components.utils.import("chrome://cryptframe/content/parseUri.js");

//a more convenient nomenclature
//TODO: add abbreviations for utils, classes and interfaces as well
if (typeof CCIN == "undefined") {
    function CCIN(cName, ifaceName){
        return Components.classes[cName].createInstance(Components.interfaces[ifaceName]);
    }
}
//dump("imports done ---\n");

const CRYPTWEB_SERVICE_NAME = "CryptWeb Service";
const CRYPTWEB_SERVICE_CID = Components.ID("{f6480eac-e13a-494c-85ba-4de1817abbbd}");
const CRYPTWEB_SERVICE_CONTRACTID = "@cryptweb.csail.mit.edu/service;1";

const CRYPTWEB_CATMAN_CONTRACTID = "@mozilla.org/categorymanager;1";


function cryptweb_service() { // FF 4+
    this.wrappedJSObject = this;
    this.init();
}


if ("undefined" == typeof(CFNamespace)) {
  var CFNamespace = {};
}

//wrap global stuff in a namespace to make sure we don't pollute
CFNamespace = {
    //serialized_public: false,
    safe_pages: {},
    tainted_pages: {},
    allowed_unsafe_paths: {
      '\/config\.json':'application/json; charset=utf-8',
      '\/favicon\.ico':'image/x-icon',
      '\/sockjs\/info':'application/json; charset=UTF-8',
      //XXX: is this dangerous or does firefox treat json and javascript the same?
      '\/sockjs\/[\w\/]*':'application/javascript; charset=UTF-8'
    },
    //tests if an unsafe path matches
    test_unsafe_path: function(p) { 
      try{
      for (var allowed in CFNamespace.allowed_unsafe_paths){
        re = new RegExp(allowed);
        if (re.test(p)) {
          dump("REGEXP match " + allowed + " for " + p + "\n");
          return [true,CFNamespace.allowed_unsafe_paths[allowed]];
        }
        dump("no regexp match " + allowed + " for " + p + "\n");
      }
      } catch (e) {
        dump("E: " + e + "\n");
      }
      return [false,''];
    },
    /* A bit of unicode gymnastics for correct hashing of response content*/
    encode_utf8: function(s) {
        return unescape( encodeURIComponent( s ) );
    },

    decode_utf8: function(s) {
        return decodeURIComponent( escape( s ) );
    },

    //include sjcl and load developer public key
    set_public_key: function(serialized_key) {
        if(serialized_key == this.serialized_public)
            return; //no need to recompute
        try{
            this.serialized_public = serialized_key;
            c = sjcl.ecc.curves['c192'];
            pt = c.fromBits(sjcl.codec.hex.toBits(this.serialized_public));
            this.pub = new sjcl.ecc["ecdsa"].publicKey(c,pt);
            dump('initialized public key\n');
        } catch (e) {
            dump("CF Error: " + e + "\n");
        }
    },
};
CFN = CFNamespace;

cryptweb_service.flag = 1;

cryptweb_service.prototype =
{
    // this must match whatever is in chrome.manifest!
    classID: CRYPTWEB_SERVICE_CID, // FF 4+
    classDescription: CRYPTWEB_SERVICE_NAME,
    contractID: CRYPTWEB_SERVICE_CONTRACTID,

//    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIMyComponent]),
    QueryInterface: function(iid) {
        if (iid.equals(Components.interfaces.nsISupports)
                || iid.equals(Components.interfaces.nsISupportsWeakReference)
                || iid.equals(Components.interfaces.nsIWebProgressListener)
                || iid.equals(Components.interfaces.nsIHttpNotify)
                || iid.equals(Components.interfaces.nsIObserver)
                ) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },

    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "app-startup" || aTopic == "profile-after-change") { 
        // FF 4+: profile-after-change
            this.observers = [];
            this.delays    = [];

            var observerService = Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService);
            observerService.addObserver(this, "http-on-modify-request", false);
            observerService.addObserver(this, "http-on-examine-response", false);

        } else if (aTopic == "http-on-modify-request") {
            aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
            this.onModifyRequest(aSubject);

        } else if (aTopic == "http-on-examine-response") {
            aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
            var si = aSubject.securityInfo;

            //extract developer sig from cert. currently stored in 'locality' field
            // of Subject Name
            if(si){
                si.QueryInterface(Components.interfaces.nsISSLStatusProvider);
                var st = si.SSLStatus;
                if (st){
                    st.QueryInterface(Components.interfaces.nsISSLStatus);
                    var cert = st.serverCert;
                    if(cert){
                        var sn = cert.subjectName;
                        //var arr = sn.match("/L=(\w+)/g");
                        //regexp didn't work in FF..., so here's a low-tech approach
                        var mark = 'L=cf-dev-sig:';
                        if(sn.indexOf(mark)>=0){
                            var k = sn.slice(sn.indexOf(mark)+mark.length).split(',')[0]
                            dump('sig ' + k + '\n');
                            CFN.set_public_key(k);
                        }
                    }
                }
            }
            this.onExamineResponse(aSubject);
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
        //dump("modify " + oHttp.URI.spec + "\n");
        var uri = parseUri(oHttp.originalURI.spec);
        if(CFNamespace.safe_pages.hasOwnProperty(uri['host'])){
          //prevent loading from cache in secure origin
          oHttp.loadFlags |= Components.interfaces.nsICachingChannel.LOAD_BYPASS_LOCAL_CACHE;
          //dump("bypass cache\n");
        } else {
          //dump("cache active\n");
        }
        //dump("eom\n");
    },

    onExamineResponse: function(oHttp) {
        //dump("examine " + oHttp.URI.spec + "\n");
        try{
            //intercept http response content in inITraceableChannel
            var newListener = new CopyTracingListener();
            oHttp.QueryInterface(Components.interfaces.nsITraceableChannel);
            newListener.originalListener = oHttp.setNewListener(newListener);
        } catch (e) {
            dump("ERROR: " + e + "\n");
        }
    },

    // functions called from chrome component ----------------------
    hello: function() {
        return CFNamespace.safe_pages;
    },
    check_safety: function(host) {
        return CFNamespace.safe_pages.hasOwnProperty(host);
    },
    //-------------------------------------------------------------

    init: function() {
    },

    destroy: function() {
    },
};


// Copy response listener implementation.
function CopyTracingListener() {
    this.originalListener = null;
}

CopyTracingListener.prototype =
{
  onDataAvailable: function(request, context, inputStream, offset, count)
  {
    //dump("av");
    if(!this.requiresVerification){
      //dump("passing on data without verification\n");
      this.originalListener.onDataAvailable(
        request,context,inputStream,offset,count
      );
      return;
    } else {
      //dump("CONTENT REQUIRES VERIFICATION\n");
    }
    try {
      var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1", 
                             "nsIBinaryInputStream");
      binaryInputStream.setInputStream(inputStream);
      var data = binaryInputStream.readBytes(count);
      this.receivedData.push(data);
      this.offsetcount.push([offset,count]);

    } catch (e) {
        dump("CF Error: " + e + "\n");
    }
    //dump("ailable\n");
  },

  onStartRequest: function(request, context) {
      //dump("start request\n");
      var httpChannel = request.QueryInterface(Components.interfaces.nsIHttpChannel);
      //dump("URI:" + request.URI.spec + "\n");
      this.receivedData = [];   // array for incoming data.
      this.offsetcount = [];  //array for passing on chunks of data
      this.pageIsSigned = false; //true iff header contains cryptframe-signature
      this.pageSignature = null;
      this.requiresVerification = false; //true if signed or in signed origin
      try {
          var httpChannel = request.QueryInterface(Components.interfaces.nsIHttpChannel);
          this.ContentType = httpChannel.getResponseHeader("Content-Type");
          this.pageSignature = httpChannel.getResponseHeader("cryptframe-signature");
          this.pageIsSigned = true;
          this.requiresVerification = true;
          //dump("PAGE SIGNED\n");
      } catch (anError) {
          this.pageIsSigned = false
          //dump("page not signed\n");
          var uri = parseUri(request.originalURI.spec);
          if(CFNamespace.safe_pages.hasOwnProperty(uri['host'])){
              this.requiresVerification = true; 
          }
      }
      this.originalListener.onStartRequest(request, context);
  },
  
  onStopRequest: function(request, context, statusCode)
  {
    var uri = parseUri(request.originalURI.spec);
    //dump("uri is: " + uri['source'] + "\n");

    if(!this.requiresVerification){
      if(!CFNamespace.tainted_pages.hasOwnProperty(uri['host'])){
        CFNamespace.tainted_pages[uri['host']] = true;
      }
      this.originalListener.onStopRequest(request, context, Components.results.NS_OK);
      return;
    }
      
    var unsafe = true;
    try{
      var httpRequest = request.QueryInterface(Components.interfaces.nsIRequest);
      //dump("onStopRequest\n");
      var responseSource = this.receivedData.join('');
      //dump("SHA1 not string: " + Sha1.hash(responseSource,false) + "\n");
     
      var loadContext;
      try { 
          loadContext = request.QueryInterface(Components.interfaces.nsIChannel) // aRequest is equivalent to aSubject from observe
                                .notificationCallbacks 
                                .getInterface(Components.interfaces.nsILoadContext);
      } catch (ex) { 
          //dump("ex: " + ex + "\n");
          try { 
              loadContext = request.loadGroup.notificationCallbacks 
                                    .getInterface(Components.interfaces.nsILoadContext); 
          } catch (ex) {
              dump("ex: " + ex + "\n");
              loadContext = null;
          }
      }
      //dump("load context: " + loadContext.associatedWindow.location + "\n");
      var top_uri = parseUri(loadContext.associatedWindow.location);
      //dump("toplevel uri: " + top_uri['source'] + "\n");
      //dump("channel uri: " + uri['source'] + "\n");
      var is_toplevel = (uri['source'] == top_uri['source'])

      if(is_toplevel){
        dump("TOP LEVEL page load: " + top_uri['source'] + "\n");
      }


      check_unsafe = CFN.test_unsafe_path(uri['path']);
      if(responseSource.length > 0 && !check_unsafe[0] && !this.verifySignature(this.pageSignature,responseSource,this.ContentType,is_toplevel,uri['file'])){
        dump("ERROR: invalid signature on signed page!!!");
        this.emitFakeResponse(request,context,statusCode,uri);
        return;
      }
      //for unsafe paths, check content type:
      if(check_unsafe[0]){
        if(this.ContentType !== check_unsafe[1]){
          dump("ERROR: invalid content type "+this.ContentType+" for path "+uri['path']+"\n");
          dump(">"+responseSource+"<\n");
          this.emitFakeResponse(request,context,statusCode,uri);
          return;
        } 
      }



      //dump("signature is valid\n");
 
      if (is_toplevel) {
          if(!CFNamespace.tainted_pages.hasOwnProperty(uri['host'])){
            if(!CFNamespace.safe_pages.hasOwnProperty(uri['host'])){
              CFNamespace.safe_pages[uri['host']] = true;
            }
            unsafe = false;
          } else {
            dump("ERROR: Tainted origin. clear cache, close browser and retry\n")
          }  
      } else {
         if(responseSource.length == 0){
          dump("response length == 0\n");
         }
         if(responseSource.length > 0 && !check_unsafe[0] ){
            var hash = Sha1.hash(responseSource,false)
            if(this.pageIsSigned && uri['query'] === hash ){
              unsafe = false;
            } else {
              dump("INVALID HASH ("+hash+"): " + uri['source'] + "\n");
              dump('query was: ' + uri['query'] + "\n");
            }
          } else {
            unsafe = false;
          }
      }
      //makes sure files from secure origin cannot be loaded separately
      //but still allows including files from unsafe origin on secured origin page
      if(uri['host'] != top_uri['host']) {
        dump("different hosts: " + uri['host'] + ' ' + top_uri['host'] + "\n");
        unsafe = true;
      }
      //
      if(!unsafe){
        this.passOnData(request,context,statusCode,uri);
      } else {
        this.emitFakeResponse(request,context,statusCode,uri);
      }
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

  verifySignature: function(sig,responseSource,contentType,is_toplevel,uri_filename){
    //dump("verify\n");
    try{
      sn = sjcl.codec.hex.toBits(sig) 
      //var bithash = sjcl.hash.sha256.hash(CFN.decode_utf8(responseSource));
      //var hashed = sjcl.codec.hex.fromBits(bithash);
      var tl = is_toplevel ? '1':'0';
      var hashed = Sha1.hash(responseSource,false);
      var hstring = contentType + ':' + hashed + ':' + tl + ":" + uri_filename;
      //dump(hstring + '\n');
      var hash2 = Sha1.hash(hstring,true);
      //dump("simple hash: " + hashed + "\n");
      //dump("ctype: " + contentType + "\n");
      //dump("with ctype hash: " + hash2 + "\n");
      CFN.pub.verify(hash2,sn);//throws error if not safe
      return true;
    } catch (anError) {
      try {
        var tl = !is_toplevel ? '1':'0';
        var hashed = Sha1.hash(responseSource,false);
        //dump("uri_filename is " + uri_filename + "\n");
        var hash2 = Sha1.hash(contentType + ':' + hashed + ':' + tl+':' + uri_filename,true);
        CFN.pub.verify(hash2,sn);//throws error if not safe
        if(is_toplevel){
          dump("WARNING: other document trying to load toplevel page");
        } else {
          dump("WARNING: non-toplevel document trying to load as top-level page");
        }
      } catch (e) {
        //pass
      } 
      return false;
    }
    return false;
  },

  //passes data held back by onAvailable to next listener in queue.
  passOnData: function(request,context,statusCode,uri) {
    //dump("safe " + uri['source'] + "\n");
    for (var i = 0; i < this.receivedData.length; i++) {
      //dump("do ");
      var offset = this.offsetcount[i][0];
      var count = this.offsetcount[i][1];
      //dump("offset " + offset + " count " + count + "\n");
      //dump("data " + this.receivedData[i].length + "\n");
      
      //And we pass it on...
      var storageStream = CCIN("@mozilla.org/storagestream;1", 
                                       "nsIStorageStream");
      //8192 is the segment size in bytes, count is the maximum size of the stream in bytes
      storageStream.init(8192, count, null); 
      var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",  
                                       "nsIBinaryOutputStream");
      binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
      // Copy received data as they come.
      binaryOutputStream.writeBytes(this.receivedData[i], count);
      //Pass it on down the chain
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
    var stream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                   .createInstance(Components.interfaces.nsIStringInputStream);
    dump("unsafe " + uri['source'] + "\n");
    if(CFNamespace.tainted_pages.hasOwnProperty(uri['host'])){
      stream.setData("CFextension: This origin is tained and cannot be loaded securely. Close all tabs, clear cache, close browser and try again",-1);

    } else {
      stream.setData("CFextension blocked unverified content from loading", -1);
    }
    this.originalListener.onDataAvailable(request, context, stream, 0, stream.available());
    this.originalListener.onStopRequest(request, context, Components.results.NS_OK);
    //must clear cache here, becasue content is already in cache and 
    //loading from cache doesn't trigger http-on-examine-response
    var cacheService = Components.classes["@mozilla.org/network/cache-service;1"].getService(Components.interfaces.nsICacheService);
    //cacheService.evictEntries(Components.interfaces.nsICache.STORE_ON_DISK);
    //cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);
    dump("CFExtension: fake response emitted\n");
  }, 

  //writes to file, sometimes useful for debugging
  writeToFile: function(data,filename) {
      try{
      var aFile = Components.classes["@mozilla.org/file/local;1"].
                  createInstance(Components.interfaces.nsILocalFile);

      aFile.initWithPath(filename);
      aFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0600);
                  
      var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
      createInstance(Components.interfaces.nsIFileOutputStream);
      stream.init(aFile, 0x04 | 0x08 | 0x20, 0600, 0); // readwrite, create, truncate
                  
      stream.write(data, data.length);
      if (stream instanceof Components.interfaces.nsISafeOutputStream) {
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
    Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
}
catch(e) {}
//
// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
if (typeof XPCOMUtils != "undefined") {
    if (XPCOMUtils.generateNSGetFactory) {
        var NSGetFactory = XPCOMUtils.generateNSGetFactory([cryptweb_service]);
//    } else {
//        var NSGetModule = XPCOMUtils.generateNSGetModule([cryptweb_service]);
    }
}

// --------------------------------
dump("CryptWeb service started\n");
