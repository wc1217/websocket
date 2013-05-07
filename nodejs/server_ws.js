var WebSocketServer = require('./node_modules/ws').Server, http = require('http'), app = http.createServer();

var wss = new WebSocketServer({
    server: app
});
wss.on('connection', function(ws) {
    console.log(wss.clients);
    var id = setInterval(function() {
        ws.send(JSON.stringify(process.memoryUsage()), function() { /* ignore errors */ });
    }, 100);
    console.log('started client interval');
    ws.on('close', function() {
        console.log('stopping client interval');
        clearInterval(id);
    })
});

app.listen(8080);