// Load the http module to create an http server.
var http = require('http');


var js = "<!DOCTYPE html><html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'><script>var y = 17;</script><script src='http://idp:8008'><</script><script>alert('byebye ' + x + ' ' + y);</script></head><body>a</body></html>";


// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  console.log('req ' + request.url);
  console.log(process.execPath);
  //response.writeHead(200, {"Content-Type": "text/html"});
  response.end(js);
});

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(process.env.PORTNUM);

// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:"+process.env.PORTNUM+'/');
