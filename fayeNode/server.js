var WebSocket = require('C://Users//WangChao//AppData//Roaming//npm//node_modules//faye-websocket'),
    http      = require('http');

var server = http.createServer();

server.on('upgrade', function(request, socket, body) {
  if (WebSocket.isWebSocket(request)) {
    var ws = new WebSocket(request, socket, body),i=0;

    ws.on('message', function(event) {
      ws.send((++i)+event.data);
    });

    ws.on('close', function(event) {
      console.log('close', event.code, event.reason);
      ws = null;
    });
  }
});

server.listen(8000);