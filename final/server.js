var debug = true
, WebSocketServer = require('./../nodejs/node_modules/ws').Server
, http = require('http')
, app = http.createServer();

/**
 * 测试好友数据
 */
var $list = {
    1:{
        'uid' : 1,
        'name' : '测试用户1',
        'modify' : '2013-05-06 21:10:10'
    },
    2:{
        'uid' : 2,
        'name' : '测试用户2',
        'modify' : '2013-05-07 21:10:10'
    },
    3:{
        'uid' : 3,
        'name' : '测试用户3',
        'modify' : '2013-05-08 21:10:10'
    },
    4:{
        'uid' : 4,
        'name' : '测试用户4',
        'modify' : '2013-05-09 21:10:10'
    },
    5:{
        'uid' : 5,
        'name' : '测试用户5',
        'modify' : '2013-05-10 21:10:10'
    }
};

/*****************/

var wss = new WebSocketServer({
    server: app
}),EVENT_TYPE = {
    'LOGIN':'i',//登录
    'LOGOUT':'o',//退出
    'SPEAK':'s',//对话
    'LIST':'l',//用户列表
    'ERROR':'e',//错误
    'HISTORY':'h'//对话记录
}, onlineUser = {};
wss.on('connection', function(ws){
    logSave('connection complete!');
    ws.sendError = function(message,msg){
        ws.send(JSON.stringify({
            'message': message,
            'd': msg,
            't': EVENT_TYPE.ERROR
        }));
    }
    ws.on('close',function(){
        ws.token = null;
        delete onlineUser[ws.userId];
        noticeOnline();
        logSave('close connect!');
    }).on('message', function(msg){
        var data = JSON.parse(msg);

        if(!data || !data.t){
            logSave('dataError:' + msg);
            ws.sendError('数据格式不正确!', msg);
            return;
        }

        if(data.t!=EVENT_TYPE.LOGIN && !ws.token){
            logSave('tokenError:' + msg);
            ws.sendError('用户验证不正确!', msg);
            return;
        }

        switch(data.t){
            //用户登录
            case EVENT_TYPE.LOGIN:
                //在此认证用户
                var token = data.d.split(','), u = token[1], v = token[0];

                ws.userId = u;
                ws.token = v;//令牌
                onlineUser[u] = ws
                ws.send(JSON.stringify({
                    't': data.t,
                    'd': $list[u]
                }));
                
                logSave(token);

                //通知在线用户更新用户列表(在线状态)
                noticeOnline();

                //推送未读消息

                break;
            //退出
            case EVENT_TYPE.LOGOUT:
                ws.close();
                break;
            //对话
            case EVENT_TYPE.SPEAK:
                var m = data.d;
                if(m.uid && m.msg && $list[m.uid]){
                    //在线否?
                    var opp = onlineUser[m.uid];
                    if(opp && opp.userId){
                        //消息转发到好友
                        //标记消息来自发送人
                        m.uid = ws.userId;
                        m.name = $list[ws.userId].name;
                        opp.send(JSON.stringify({
                            'd': m,
                            't': data.t
                        }));
                    }else{
                        //留言的逻辑
                    }
                    
                }else{
                    ws.send(JSON.stringify({
                        'd': '您好像没有加对方为好友,请重试..',
                        't': data.t
                    }));
                }
                break;
            //用户列表
            case EVENT_TYPE.LIST:
                ws.send(JSON.stringify({
                    'd': getOnline(),
                    't': data.t
                }));
                break;
            //错误
            case EVENT_TYPE.ERROR:
                ws.close();
                break;
            //对话记录
            case EVENT_TYPE.HISTORY:

                break;

            default :
                ws.close();
                break;
        }
    }).on('error', function(){
        logSave(Array.prototype.join.call(arguments, ", "));
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
/**
 * 得到用户列表(在线状态)
 * @return String
 */
function getOnline(){
    logSave('getOnline : ' + getDatetime());
    var l = 0;
    for(var i in $list) {
        var isOnline = onlineUser[$list[i].uid];
        $list[i].status = (isOnline && isOnline.userId) ? 'online' : 'offline';
        l++;
    }
    return JSON.stringify({
        "total":l,
        "data":$list
    });
    
}
/**
 * 通知在线用户更新用户列表(在线状态)
 */
function noticeOnline(){
    var friend = getOnline();
    for(var n in onlineUser){
        onlineUser[n].send(JSON.stringify({
            'd': friend,
            't': EVENT_TYPE.LIST
        }));
    }
}

app.listen(8080);