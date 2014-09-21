timeLog = "";

LATENCY_LOG = true; // turn off during tput experiments

TPUT_LOG = true;
TOTAL_MSGS = 0;

function now() {
  if (window.performance && window.performance.now) {
    return window.performance.now();
  } else {
    return 0;
  }
}

logAdd = function(msg) {
    if (LATENCY_LOG)
	timeLog = timeLog + msg;
}

startTime = function(msg) {
    if (LATENCY_LOG)
    	logAdd(msg + " START "  + now() + "\n");
}

endTime = function(msg) {
    if (LATENCY_LOG)
       logAdd(msg + " END " +  now() + "\n");
}

markTime = function(msg, type) {
    if (LATENCY_LOG)
        logAdd(msg + " " + type + " " + now() + "\n");
}

markGlobTime = function(msg, type) {
    if (LATENCY_LOG)
        logAdd(msg + " " + type + " " + new Date().getTime() + "\n");
}
