var conns = new Array();
var ws = require('C://Users//WangChao//AppData//Roaming//npm//node_modules//websocket-server');
var server = ws.createServer();
server.addListener('connection', function(conn){
    console.log('connection....');
    conns.push(conn);
    conn.addListener('message',function(msg){
        console.log(msg);
        for(var i=0; i<conns.length; i++){
            if(conns[i]!=conn){
                conns[i].send(msg);
            }
        }
    });
});
server.listen(8080);
console.log('running......');