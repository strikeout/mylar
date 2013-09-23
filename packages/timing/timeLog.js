timeLog = "";

RECORD_EVAL_LOG = true; // turn off during tput experiments

logAdd = function(msg) {
    if (RECORD_EVAL_LOG)
	timeLog = timeLog + msg;
}

startTime = function(msg) {
    logAdd(msg + " START "  + window.performance.now() + "\n");
}

endTime = function(msg) {
    logAdd(msg + " END " +  window.performance.now() + "\n");
}

markTime = function(msg, type) {
    logAdd(msg + " " + type + " " + window.performance.now() + "\n");
}

markGlobTime = function(msg, type) {
    logAdd(msg + " " + type + " " + new Date().getTime() + "\n");
}