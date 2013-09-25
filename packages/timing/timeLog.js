timeLog = "";

LATENCY_LOG = false; // turn off during tput experiments

TPUT_LOG = true;
TOTAL_MSGS = 0;

logAdd = function(msg) {
    if (LATENCY_LOG)
	timeLog = timeLog + msg;
}

startTime = function(msg) {
    if (LATENCY_LOG)
    	logAdd(msg + " START "  + window.performance.now() + "\n");
}

endTime = function(msg) {
    if (LATENCY_LOG)
       logAdd(msg + " END " +  window.performance.now() + "\n");
}

markTime = function(msg, type) {
    if (LATENCY_LOG)
        logAdd(msg + " " + type + " " + window.performance.now() + "\n");
}

markGlobTime = function(msg, type) {
    if (LATENCY_LOG)
        logAdd(msg + " " + type + " " + new Date().getTime() + "\n");
}
