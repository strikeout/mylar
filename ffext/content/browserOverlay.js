/**
 * CryptFrameChrome namespace.
 */

if ("undefined" == typeof(CryptFrameChrome)) {
  var CryptFrameChrome = {};
}
CryptFrameChrome.BrowserOverlay = {
  /**
   * Says 'Hello' to the user.
   */
  sayHello : function(aEvent) {
    //let stringBundle = document.getElementById("cryptframe-string-bundle");
    //let message = stringBundle.getString("cryptframe.greeting.label");
    dump("overlayhello");
    try {
            var myComponent = Components.classes['@headerspy.mozdev.org/service;1'].getService().wrappedJSObject;
            var safe = myComponent.hello();
            var str = "";
            for (var k in safe) {
                str = str + k + "\n";
            }
            alert("safe origins:\n" + str);
    } catch (anError) {
            dump("ERROR: " + anError);
    }
  },

  tabChange : function(event) {
      var browser = gBrowser.selectedBrowser;
      window.alert("now at: " + browser.currentURI.spec);
  // browser is the XUL element of the browser that's just been selected
  },

    // During initialisation
  init: function(){
    var container = gBrowser.tabContainer;
    container.addEventListener("TabSelect", this.tabChange, false);
  }

};

