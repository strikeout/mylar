// Load the http module to create an http server.
var http = require('http');


var js = "var x = 1;alert('hello ' + x + ' ' + y);";

var xml = "function reqListener () {\n"+
"  console.log('resp ' + this.responseText);\n"+ 
"};\n";

xml += 'var oReq = new XMLHttpRequest();oReq.onload = reqListener;oReq.open("get", "http://localhost:8000/file"+y, true);oReq.send();'

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  console.log('req script ' + request.url);
  response.writeHead(200, {"Content-Type": "text/html"});
  response.end(js+xml);
});

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(process.env.PORTNUM);

// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:"+process.env.PORTNUM+'/');
