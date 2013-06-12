var debug = true
, WebSocketServer = require('./../nodejs/node_modules/ws').Server
, http = require('http')
, url = require("url")
, qs = require("querystring")
, mysql = require('./../nodejs/node_modules/mysql')
, app = http.createServer(function(request, response) {
    var u = url.parse(request.url), pathname = u.pathname.replace(/\//g,''), b = qs.parse(u.query)['back'];
    logSave("Request for " + pathname + " received.");
    response.writeHead(200, {
        "Content-Type": "text/plain"
    });
    if(pathname == 'chatlist'){
        connection.query('select * from user', function(err, results){
            if (err) throw err;
            response.write(b+'(');
            response.write(JSON.stringify(results)||'[]');
            response.write(')');
            response.end();
        });
    }else{
        response.write('Hello World');
        response.end();
    }
})
, connection = mysql.createConnection('mysql://root@localhost/ysd?debug=["ComQueryPacket"]');

/*****************/

var wss = new WebSocketServer({
    server: app
}),EVENT_TYPE = {
    'LOGIN':'i',//登录
    'LOGOUT':'o',//退出
    'SPEAK':'s',//对话
    'LIST':'l',//用户列表
    'ERROR':'e',//错误
    'HISTORY':'h',//对话记录
    'SYSTEM':'t',//系统消息
    'ADDUSER':'a',//好友
    'AFFIRM':'f'//同意请求好友
}
//所有在线的用户
, onlineUser = {};
wss.on('connection', function(ws){
    var $list = {};
    logSave('connection complete!');
    //发送错误消息
    ws.sendError = function(message,msg){
        ws.send(JSON.stringify({
            'message': message,
            'd': msg,
            't': EVENT_TYPE.ERROR
        }));
    }
    //发送系统消息
    ws.sendSys = function(message){
        ws.send(JSON.stringify({
            'reply': message,
            't': EVENT_TYPE.SYSTEM
        }));
    }
    //刷新用户列表
    ws.upList = function(fn){
        //拉取好友
        ws.userId && connection.query('select `fid` as `uid`,`fname` as `name`,`modify` from ysd_friend where uid=? and status=1', [ws.userId], function(err, results){
            if(err) throw err;
            $list = {};
            for(var fd in results){
                $list[results[fd]['uid']] = results[fd];
            }
            if(typeof(fn)=='function')fn(getOnline($list));
        });
    }
    ws.on('close',function(){
        if(ws.token){
            ws.token = null;
            delete onlineUser[ws.userId];
            noticeOnline($list);
        }
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
                logSave(token);
                connection.query('select * from ysd_user where id=? limit 1', [u], function(err, uData){
                    if(err) throw err;
                    var me = uData.length ? uData[0] : false;
                    if(!me || !me['id']){
                        ws.sendError('登录失败...',msg);
                        return;
                    }
                    var lodws = onlineUser[u];
                    if(lodws){
                        //多处登录的处理
                        lodws.sendError('您的账号在别处登录,你被迫下线!\n远端IP:'+ws._socket.remoteAddress,msg);
                        lodws.token = false;
                        lodws.close();
                    }

                    ws.userId = u;
                    ws.userName = me['name'];
                    ws.token = v;//令牌
                    onlineUser[u] = ws
                    ws.send(JSON.stringify({
                        't': data.t,
                        'd': me
                    }));
                    //更新用户
                    ws.upList(function(){
                        //通知在线用户更新用户列表(在线状态)
                        noticeOnline($list);
                    });

                //推送未读消息
                    
                });

                break;
            //退出
            case EVENT_TYPE.LOGOUT:
                ws.close();
                break;
            //对话
            case EVENT_TYPE.SPEAK:
                var m = data.d;
                if(m.uid && m.msg){
                    //在线否?
                    var opp = onlineUser[m.uid];
                    if(opp && opp.userId){
                        //消息转发到好友
                        //标记消息来自发送人
                        m.uid = ws.userId;
                        m.name = ws.userName;
                        opp.send(JSON.stringify({
                            'd': m,
                            't': data.t
                        }));
                    }else{
                    //留言的逻辑
                    }
                    
                }else{
                    ws.sendError('您好像没有加对方为好友,请重试..',msg);
                }
                break;
            //用户列表
            case EVENT_TYPE.LIST:
                ws.upList(function(list){
                    ws.send(JSON.stringify({
                        'd': list,
                        't': data.t
                    }));
                });
                break;
            //错误
            case EVENT_TYPE.ERROR:
                ws.close();
                break;
            //对话记录
            case EVENT_TYPE.HISTORY:

                break;
            //添加好友请求
            case EVENT_TYPE.ADDUSER:
                var d = parseInt(data.d)||0;
                connection.query('select * from ysd_user where id=? limit 1', [d], function(err, uData){
                    if(!uData[0]){
                        ws.sendSys('用户不存在!');
                        return;
                    }
                    connection.query('select * from ysd_friend where uid=? and fid=? limit 1', [ws.userId,d], function(err, results){
                        if(err) throw err;
                        var rs = '已向该用户发送验证消息, 请等待对方验证好友请求!';
                        if(!results[0]){
                            //insert
                            connection.query('insert into ysd_friend(uid,fid,fname,status) values(?,?,?,0)',[ws.userId,d,uData[0]['name']]);
                        }else if(results[0]['status']==0){
                            rs = '已向该用户发送验证消息, 不用重复操作!';
                        }else if(results[0]['status']==1){
                            rs = '对方已是您的好友!';
                        }else{//按理不用出现这种状态
                            rs = '对方拒绝您的好友请求!';
                        }
                        ws.sendSys(rs);
                    });
                });
                if(onlineUser[d]){
                    //用户在线
                    onlineUser[d].send(JSON.stringify({
                        'reply': ws.userName+'请求加你为好友,是否同意? \n\
                                    <a href="javascript:;" class="affirm" value="'+ws.userId+'">同意</a> <a href="javascript:;" class="refuse">拒绝</a>',
                        't': data.t
                    }));
                }
                break;
            //同意请求
            case EVENT_TYPE.AFFIRM:
                connection.query('select * from ysd_user where id=? limit 1', [data.d], function(err, uData){
                    if(err) throw err;
                    if(!uData[0]){
                        ws.sendSys('用户不存在!');
                        return;
                    }
                    connection.query('update ysd_friend set status=1 where uid=? and fid=?',[data.d,ws.userId]);
                    connection.query('insert into ysd_friend(uid,fid,fname,status) values(?,?,?,1)',[ws.userId,data.d,uData[0]['name']]);
                    ws.upList(function(list){
                        //通知在线用户更新用户列表(在线状态)
                        noticeOnline($list);
                        ws.send(JSON.stringify({
                            'd': list,
                            't': EVENT_TYPE.LIST
                        }));
                    });
                });
                break;
            default :
                ws.sendError('错误的请求!', msg);
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
function getOnline($list){
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
function noticeOnline($list){
    logSave('noticeOnline : ' + getDatetime());
    for(var i in $list) {
        var isOnline = onlineUser[$list[i].uid];
        isOnline && isOnline.userId && isOnline.upList(function(list){
            try{
                list && isOnline.send(JSON.stringify({
                    'd': list,
                    't': EVENT_TYPE.LIST
                }));
            }catch(e){}
        });

    }
}

app.listen(8080);