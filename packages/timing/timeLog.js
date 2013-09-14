timeLog = "";

logAdd = function(msg) {
    timeLog = timeLog + msg;
}

startTime = function(msg) {
    logAdd(msg + " ST "  + window.performance.now() + "\n");
}

endTime = function(msg) {
    logAdd(msg + " END " +  window.performance.now() + "\n");
}
