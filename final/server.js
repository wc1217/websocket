var debug = true
, WebSocketServer = require('./../nodejs/node_modules/ws').Server
, http = require('http')
, app = http.createServer();


var wss = new WebSocketServer({
    server: app
}),EVENT_TYPE = {
    'LOGIN':'i',//登录
    'LOGOUT':'o',//退出
    'SPEAK':'s',//对话
    'LIST':'l',//用户列表
    'ERROR':'e',//错误
    'HISTORY':'h'//对话记录
};
wss.on('connection', function (ws) {
    logSave('connection complete!');
    ws.on('close',function () {
        logSave('close connect!');
    }).on('message', function (msg) {
        switch(msg){
            case EVENT_TYPE.LOGIN:


                break;

            default :
                ws.close();
                break;
        }
    }).on('error', function() {
        console.log(Array.prototype.join.call(arguments, ", "));
    })
});
/**
 * 得到当前时间
 * @param time
 * @returns {string}
 */
function getDatetime(time) {
    var dt = new Date(), s = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate() + (time  ? '' : (' ' +  dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds()));
    return (s).replace(/([\-\: ])(\d{1})(?!\d)/g, '$10$2');
}
/**
 * 记录日志
 * @param str
 * @param write 写入文件？
 */
function logSave(str, write) {
    debug && console.log(getDatetime() + ' : ' + str);
}
app.listen(8080);