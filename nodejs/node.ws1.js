var sys = require("sys"),
ws = require("./ws");

ws.createServer(function (websocket) {
    websocket.addListener("connect", function (resource) {
        // emitted after handshake
        console.log("connect: " + resource);

        // server closes connection after 10s, will also get "close" event
        setTimeout(websocket.end, 10 * 1000);
    }).addListener("data", function (data) {
        // handle incoming data
        console.log(data);

        // send data to client
        websocket.write("Thanks!");
    }).addListener("close", function () {
        // emitted when server or client closes connection
        console.log("close");
    });
}).listen(8082);