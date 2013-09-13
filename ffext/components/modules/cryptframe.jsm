// module that updates the cryptframe icons (one for each browser window)
// code inspired by flagfox firefox extension
//dump("CF component load start\n");

var EXPORTED_SYMBOLS = ['Notifier'];

Components.utils.import("chrome://cryptframe/content/parseUri.js");

var Notifier = {
    init: function(window) {
        //dump("Notifier init\n");
        newNotifierInstance(window);
    },
}

function newNotifierInstance(window){
    var url = "";              // The URL of the current page
    var host = "";             // The host name of the current URL

    var icon = window.document.getElementById("flagfox-icon");
    var tooltip = window.document.getElementById("cf-tooltip-info");
    //dump("lili = " + window.location + "\n");
    if (!icon)
    {
        dump("Cryptframe warning: attempted to load icon into an invalid window");
        return;
    }

    refreshIcon();

    var progressListener =
    {
        onLocationChange : locationChange,
        onProgressChange : function() {},
        onSecurityChange : function() {},
        onStateChange : refreshIcon, //TODO: filter appropriate states only
        onStatusChange : function() {}
    };
    window.getBrowser().addProgressListener(progressListener);

    function unload()
    {
        window.getBrowser().removeProgressListener(progressListener);
        icon = null;
        tooltip = null;
    }

    function getIcon(state){
        return "chrome://cryptframe/content/icons/" + state + ".png";
    }
    function writeTooltip(state){
        if(state === "safe"){
            return "CFextension: this page is secure";
        } else {
            return "CFextension: this page is not secured";
        }
    }


    function locationChange(){
      //dump("LOCATION = " + window.location + "\n");
      refreshIcon();
    } 

    function refreshIcon()
    {
        //dump("Notifier location change\n");
        try
        {
            var uri = window.content.document.location.href;
            var cfComponent = Components.classes['@cryptweb.csail.mit.edu/service;1'].getService().wrappedJSObject;
            if(cfComponent.check_safety(uri)){
                //dump("update icon safe\n");
                icon.src = getIcon("safe");
                tooltip.value = writeTooltip("safe");
            } else {
                //dump("update icon unsafe\n");
                icon.src = getIcon("warn");
                tooltip.value = writeTooltip("unsafe");
            }

        }
        catch (e)
        {
            dump("could not change symbol because: " + e);
        }
    }


}
//dump("CF component load end\n");
