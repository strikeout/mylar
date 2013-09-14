timeLog = "";

logAdd = function(msg) {
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