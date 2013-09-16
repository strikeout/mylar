// Load the http module to create an http server.
var http = require('http');


var js = '{x: 17}';

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  console.log('req ' + request.url);
  response.writeHead(200, {"Content-Type": "text/html"});
  response.end(js);
  console.log('response sent');
});

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(process.env.PORTNUM);

// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:"+process.env.PORTNUM+'/');
