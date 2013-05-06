var sys = require("sys"),
ws = require("./ws");

var socketPool = [];

var server = ws.createServer(function(socket) {
	
    socket.addListener("connect", function(res) {
        console.log("client connected from：" + socket.remoteAddress + "" + res);
        socket.write("welcome\r\n");

        socketPool.push(this);
    });

    socket.addListener("data", function(data) {
        socket.write(data);

        for (var i = 0, len = socketPool.length; i < len; i++)
        {
            socketPool[i].write(data);
        }
    });

    socket.addListener("close", function() {
        console.log("client close!");

        for (var i = 0, len = socketPool.length; i < len; i++)
        {
            if (this == socketPool[i])
            {
                socketPool.splice(i, 1);
                break;
            }
        }
    });

});

server.listen(8082);
console.log('running......');