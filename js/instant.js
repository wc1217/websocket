$(function(){
    var instantIm = {
        target:null,//容器对象

        inbar:null,//状态栏

        inct:null,//联系人(消息数目)栏

        inuser:null,//列表框

        inlist:null,//用户列表

        indialog:{},//对话框

        userData:{},//全部用户数据

        userTarget:{},//存储用户列表对li对象,因为json不支持dom

        Finterval:{},//消息闪烁

        unReadList:{},//未读消息,暂放在变量里,以后修改为放在localStorage

        socket:null,//websocket

        docTitle:document.title,//网页标题

        config:{
            EVENT_TYPE : {
                'LOGIN':'i',//登录
                'LOGOUT':'o',//退出
                'SPEAK':'s',//对话
                'LIST':'l',//用户列表
                'ERROR':'e',//错误
                'HISTORY':'h'//对话记录
            },
            debug:true,
            animate:!$.browser.msie,//开启动画(ie不开)?
            drag:true,//开启拖动
            wsURI:'ws://127.0.0.1:8080',//ws url
            token:Math.round(new Date().getTime()/1000),//本实例的timeStamp + uid
            pollErrorLimit:0,//未知错误重试次数
            userid:function(){//测试用户id
                var id = $('#webIn');
                return id.length ? parseInt(id.attr('uid')) : false;
            },
            userInfo:{},
            wrap:'<div id="instantIm"><div class="inbar"><div class="inct gb">联系人[<span class="cRed">0</span>/<span>0</span>]<span class="ingif"></span></div></div></div>',
            list:'<div class="userList"><div class="intop gb"><div class="hand gb"></div><div class="intit">联系人</div><div class="linev"></div></div><div class="intip gb"><span class="gb"></span>这是联系人列表。</div><div class="inlist"><ul></ul></div><div class="inbot gb"><span class="gb"></span></div>',
            userList:'<li class="uid-{$uid}"><a href="javascript:;" title="{$name}">{$name}</a></li>',
            dialog:'<div class="dialog"><div class="intop gb"><div class="hand gb handx"></div><div class="hand gb"></div><div class="intit">联系人</div></div><div class="intip gb"><span class="gb"></span><span></span></div><div class="msg"></div><div class="infoot"><div class="send"><textarea></textarea><div class="sb"><div class="gb">发送</div></div></div><div class="ftip"><span class="gb"></span><a href="javascript:;" style="float:right">《消息系统使用规则》</a><a href="javascript:;" target="_blank" class="chatlog">对话记录</a></div></div></div>',
            userBar:'<div class="dialogue gb" uid="{$uid}">与“{$name}”对话中...</div>',
            userHis:'<div class="inname"><span>{$create}</span><a href="javascript:;">{$name}</a></div><div class="content">{$content}</div>'
        },
        logDump:function(str) {
            this.config.debug && console.log(this.getDatetime() + ' : ' + str);
        },
        init:function(userid){
            var _in = this;//, userid = _in.config.userid();
            if(_in.target==null && userid){
                _in.config.token = _in.config.token+','+userid;
                //初始化comet
                _in.webComet();
                $.chatIn = function(uid){
                    _in.chat(uid);
                }
            }
            return _in;
        },
        //通信核心
        webComet:function(){
            var _in = this, socket = window.WebSocket || window.MozWebSocket, EVENT_TYPE = _in.config.EVENT_TYPE
            , send = function(data){
                _in.socket.send(JSON.stringify(data));
            };
            if(socket)
                _in.socket = new socket(_in.config.wsURI);
            if(_in.socket){
                _in.socket.addEventListener('open',function(event){
                    _in.logDump('TIMESTAMP : '+event.timeStamp);
                    _in.loadUI();
                    //用户登录
                    send({
                        't': EVENT_TYPE.LOGIN,
                        'd': _in.config.token
                    });
                })
                _in.socket.addEventListener('error',function(event){
                    _in.logDump('ERROR: ' + event.message);
                })
                _in.socket.addEventListener('message',function(event){
                    //_in.logDump(_in.getDatetime(event.timeStamp));
                    try{
                        var data = JSON.parse(event.data);
                    }catch(e){}
                    if(!data || !data.t){
                        _in.logDump('errorMessage:' + event.data);
                        return;
                    }
                    switch(data.t){
                        //用户登录
                        case EVENT_TYPE.LOGIN:
                            _in.logDump('Login:' + _in.getDatetime(event.timeStamp));
                            //登录成功在此认证
                            if(data.d){
                                _in.config.userInfo = data.d;//得到令牌
                            }
                            break;
                        //退出
                        case EVENT_TYPE.LOGOUT:

                            break;
                        //对话
                        case EVENT_TYPE.SPEAK:
                            _in.logDump('Speak:' + _in.getDatetime(event.timeStamp));
                            var n = data.d;
                            if(!_in.unReadList[n.uid]){
                                _in.unReadList[n.uid] = [];
                            }
                            //存储消息
                            _in.unReadList[n.uid].push({
                                content:n.msg,
                                name:n.name,
                                create:_in.getDatetime(event.timeStamp)
                            });
                            //提示有消息
                            _in.userFlicker(n.uid);
                            break;
                        //用户列表
                        case EVENT_TYPE.LIST:
                            _in.logDump('List:' + _in.getDatetime(event.timeStamp));
                            _in.initList(JSON.parse(data.d));
                            break;
                        //错误
                        case EVENT_TYPE.ERROR:
                            alert(data.message);
                            break;
                        //对话记录
                        case EVENT_TYPE.HISTORY:

                            break;

                        default :
                            _in.socket.close();
                            break;
                    }
                })
                _in.socket.addEventListener('close',function(event){
                    _in.logDump('CLOSE: ' + event.code + ', ' + event.reason);
                    _in.target && _in.target.remove();
                });
            }else{
                alert('该浏览器不支持, 请使用Chrome or firefox.');
            }
        },
        //加载UI
        loadUI:function(){
            var _in = this;
            if(_in.target)return;
            _in.target = $('body').append(_in.config.wrap).find('#instantIm');
            _in.inbar = _in.target.find('.inbar').eq(0);
            _in.inuser = _in.initUserList();//列表框
            _in.inct = _in.initBar();//联系Bar,人数
        },
        //加载联系人栏
        initBar:function(){
            var _t = this;
            return _t.inbar.find('.inct').click(function(){
                //显示用户框(始终动画)
                _t.inuser.show().animate({
                    bottom:'1px'
                },{
                    duration:600,
                    easing:'easeOutExpo'
                }).status = 'block';
                _t.eachFlicker();
            }).eq(0);
        },
        //初始用户列表框(用户名点击事件在此)
        initUserList:function(){
            var _in = this,_u = _in.target.prepend(_in.config.list).find('.userList').eq(0);
            //得到列表对象
            _in.inlist = _u.find('.hand,.inbot').click(function(){
                //隐藏用户框(始终动画)
                _u.animate({
                    bottom:'-393px'
                },'fast', 'easeInExpo', function(){
                    _u.hide().status = 'none';
                    _in.clearFlicker();
                    if($.isEmptyObject(_in.unReadList)){
                        _in.removeFlicker();
                    }
                });
            }).end().find('.inlist ul').eq(0).delegate('li','click',function(){//事件托管
                //调出对话框
                var uid = parseInt($(this).attr('class').substr(4));
                _in.createDialog(uid);
                return false;
            });
            return _u;
        },
        //加载用户列表(包含更新)
        initList:function(res){
            var _in = this,html='',o = 0;
            $.each(res.data||[], function(i,n){
                _in.userData[n.uid] = {
                    name:n.name,
                    modify:n.modify,
                    status:n.status||'offline'
                };
                html+=_in.sprintf(_in.config.userList,n);
            });
            _in.inlist.html(html).find('li').each(function(){
                var _t = $(this),id = parseInt(_t.attr('class').substr(4));
                _in.userTarget[id] = _t;
                _in.userData[id].status == 'online' && _t.addClass('on') && o++;
            });
            _in.inct.find('span').eq(0).text(o||0).end().eq(1).text(res.total||0);
        },
        //创建聊天窗口
        createDialog:function(uid){
            var _in =this;
            if(_in.indialog[uid]){
                //@todo 窗口取得焦点
                _in.activeDialog(uid);
                return;
            }
            //定义单个用户对象
            _in.indialog[uid] = _in.target.append(_in.config.dialog).find('.dialog').last().attr('uid',uid).click(function(){
                _in.activeDialog(uid);
            });
            //按钮事件
            _in.indialog[uid].find('.intop .hand').eq(1).click(function(){
                //最小化(最小化到边栏)
                _in.hideDialog(uid);
                _in.showUserBar(uid);
                return false;
            }).end().eq(0).click(function(){
                //关闭
                //_in.hideDialog(uid);
                //_in.hideDialog(uid,function(){
                _in.closeDialog(uid);
                //});
                return false;
            });
            //标题对象
            _in.indialog[uid].intit = _in.indialog[uid].find('.intit').eq(0).text(_in.userData[uid].name);
            //提示区
            _in.indialog[uid].intip = _in.indialog[uid].find('.intip span').eq(1);
            //即时消息列表
            _in.indialog[uid].msg = _in.indialog[uid].find('.msg').eq(0);
            //输入框
            _in.indialog[uid].textarea = _in.indialog[uid].find('textarea').eq(0);
            //发送按钮
            _in.indialog[uid].find('.send .sb .gb').eq(0).click(function(){
                var msg = _in.indialog[uid].textarea.val();
                _in.indialog[uid].textarea.val('');
                if(msg.length>0&&msg.length<200){
                    //_in.indialog[uid].msg.addClass('sending');
                    var sent = {
                        t:_in.config.EVENT_TYPE.SPEAK,
                        d:{
                            uid:uid,
                            msg:msg
                        }
                    },res = {
                        'create':_in.getDatetime(),
                        'content':msg,
                        'name':_in.config.userInfo.name+'(我)'
                    }
                    _in.socket.send(JSON.stringify(sent));
                    
                    if(res.name){
                        var msgBox = _in.indialog[uid].msg.append(_in.sprintf(_in.config.userHis, res))[0];//.removeClass('sending')
                        msgBox.scrollTop=msgBox.scrollHeight;
                    }
                }else{
                    alert('请输入消息内容(不大于200个字符)! ');
                }
            });

            //用户窗口状态
            _in.indialog[uid].status = 'none';
            //用户bar状态
            _in.indialog[uid].barStatus = 'none';
            //窗口索引
            _in.indialog[uid].index = _in.indialog[uid].index();
            //用户状态栏_in.indialog[uid].bar
            //窗口位置_in.indialog[uid].seat
            //this.loadUserBar(uid);
            _in.loadHistory(uid);
            //_in.showDialog(uid);
            //激活窗口
            this.activeDialog(uid);
            //开启拖动
            this.config.drag && this.dragAndGo(uid);
        },
        //加载用户状态栏
        loadUserBar:function(uid){
            var _in =this;
            if(_in.indialog[uid].bar){
                return;
            }
            //点击用户状态栏后,显示窗口,隐藏自身
            _in.indialog[uid].bar = _in.inbar.append(_in.sprintf(_in.config.userBar,{
                uid:uid,
                name:_in.userData[uid].name
            })).find('.dialogue').last().click(function(){
                _in.removeFlicker(uid);
                _in.activeDialog(uid);
                _in.hideUserBar(uid);
            });
        },
        //显示用户状态栏
        showUserBar:function(uid){
            this.loadUserBar(uid);
            var _in = this.indialog[uid];
            if(_in.barStatus != 'block'){
                if(this.config.animate){
                    _in.bar.show().animate({
                        marginRight:6
                    },{
                        duration:'slow',
                        easing:'easeOutExpo'
                    });
                }else{
                    _in.bar.css('margin-right','6px').show();
                }
                _in.barStatus = 'block';
            }
        },
        //隐藏用户状态栏
        hideUserBar:function(uid){
            var _in = this.indialog[uid];
            if(_in.barStatus == 'block'){
                var index = _in.bar.index();
                if(this.config.animate){
                    _in.bar.animate({
                        marginRight:-220*index
                    }, 'slow', 'easeInExpo', function(){
                        _in.bar.hide();
                    });
                }else{
                    _in.bar.hide() ;
                }
                _in.barStatus = 'none';
            }
        },
        //加载未读聊天记录
        loadHistory:function(uid){
            var _in = this,html = '';
            for(var m in _in.unReadList[uid]){
                html += _in.sprintf(_in.config.userHis, _in.unReadList[uid][m]);
            }
            _in.unReadList[uid] = undefined;
            delete _in.unReadList[uid];
            var msg = _in.indialog[uid].msg.append(html)[0];
            msg.scrollTop=msg.scrollHeight;
            _in.clearFlicker(uid);
        },
        //重设窗口位置并显示
        showDialog:function(uid){
            var _in = this.indialog[uid];
            if(!_in.seat){
                _in.seat = {
                    right:350+_in.index*50,
                    top:-323-_in.index*20
                }
            }
            if(this.config.animate){
                _in.show().animate(_in.seat, 'fast', 'easeInOutQuad' ,function(){
                    _in.status='block';
                });
            }else{
                _in.css(_in.seat).show().status='block';
            }
            _in.intip.text(this.userData[uid].status != 'online' ? '对方当前不在线, 可能无法立即回复!' : '在线聊天，安全有保障。');
        },
        //聊天窗口位置归原位并隐藏
        hideDialog:function(uid,fn){
            var _in = this.indialog[uid];
            if(this.config.animate){
                _in.animate({
                    right:40+_in.index*20,
                    top:40
                }, 'fast', 'easeInBack', function(){
                    _in.hide().status='none';
                })
            }else{
                _in.hide().status='none';
            }
            if(typeof fn == 'function')fn();
        },
        //让窗口处于焦点
        activeDialog:function(uid){
            var _in = this.indialog[uid];
            if(_in.status!='active'){
                //如果隐藏则显示
                if(_in.status=='none'){
                    this.showDialog(uid);
                }
                for(var index in this.indialog){
                    if(uid!=index){
                        if(this.indialog[index].css('z-index','1').status=='active'){
                            this.indialog[index].status='block';
                        }
                    }
                }
                if(_in.status=='block'){
                    _in.textarea.focus();
                }
                this.hideUserBar(uid);
                _in.css('z-index','20').status='active';
            }
        },
        //卸载窗口
        closeDialog:function(uid){
            this.indialog[uid].remove();
            delete this.indialog[uid];
        },
        //窗口拖动
        dragAndGo:function(uid){
            var _in = this.indialog[uid], _move = false, _x=0, _y=0, x=0, y=0;
            var wh = $(window).height(), ww = $(window).width(), ih = _in.height()-this.target.height(), iw = _in.width();
            _in.intit.mousedown(function(e){
                _move=true;
                _x = ww - e.clientX - parseInt(_in.css('right'));
                _y = wh - e.clientY + parseInt(_in.css('top'));
                $(document).mousemove(function(e){
                    if(_move){
                        x = ww - e.clientX - _x;
                        y = _y - wh + e.clientY;
                        if(x<ww-iw && y<-ih){
                            _in.css({
                                right:x,
                                top:y
                            });
                        }
                    }
                }).mouseup(function(){
                    _move=false;
                    $(document).unbind('mousemove').unbind('mouseup');
                    if(x&&y){
                        _in.seat = {
                            right:x,
                            top:y
                        };
                    }
                });
                return false;
            });
        },
        //jquery.printf
        sprintf:function(format) {
            var data = Array.apply(null, arguments).slice(1)[0];
            var def = arguments[2];
            return format.replace(/(?:\{\$)([\w\d\-\_]+)(?:\})/g, function() {
                return data[arguments[1]]||def||'';
            });
        },
        //闪烁用户BAR
        flickerBar:function(uid){
            var _in = this, t = uid && _in.indialog[uid].barStatus=='block' ? _in.indialog[uid].bar : _in.inct;
            if(!t.hasClass('inctred') && !t.addClass('inctred').find('.ingif img').length){
                t.find('.ingif').html('<img src="/img/xiaoxi.gif" style="vertical-align:middle" />');
                _in.titleFlicker();
            }
        },
        //移除标识块
        removeFlicker:function(uid){
            var _in = this, t = uid && _in.indialog[uid].barStatus=='block' ? _in.indialog[uid].bar : _in.inct;
            if(t.hasClass('inctred')){
                t.removeClass('inctred').find('.ingif').empty();
                _in.removeTitleFlicker();
            }
        },
        titleFlicker:function(){
            var o = true, t = this.docTitle;
            this.timeId = setInterval(function(){
                document.title = (o ? '[新消息...]' : '[　　　　]') + t;
                o = !o;
            },400);
        },
        removeTitleFlicker:function(){
            if(this.timeId){
                clearInterval(this.timeId);
                document.title = this.docTitle;
            }
        },
        //单个用户消息闪烁(动态加载消息在此)
        userFlicker:function(uid){
            var _in = this;
            //用户有未读消息, 存在用户列表中, 且没有开启闪烁
            if(_in.userData[uid] && _in.unReadList[uid] && !_in.Finterval[uid]){
                if(_in.indialog[uid]){//如果对话窗口开启
                    if(_in.indialog[uid].status=='none'){//如果窗口是显示的
                        _in.flickerBar(uid);//@todo 闪烁用户状态
                    }
                    _in.loadHistory(uid);
                }else if(_in.inuser.status=='block'){//列表窗口开启
                    var that = _in.userTarget[uid];
                    if(that)
                        _in.Finterval[uid] = setInterval(function(){
                            that.toggleClass('m');
                        },300);
                }else{
                    _in.flickerBar();
                }
            }
        },
        //循环有未读消息的用户并闪烁
        eachFlicker:function(uid){
            var _t = this;
            if(_t.inuser.status=='block'){
                if(uid){
                    if(!_t.Finterval[uid]){
                        _t.userFlicker(uid);
                    }
                }else{
                    for(var i in _t.unReadList){
                        _t.userFlicker(i);
                    }
                }
            }
        },
        //清除闪烁
        clearFlicker:function(uid){
            var _in = this;
            if(uid){
                clearInterval(_in.Finterval[uid]);
                _in.Finterval[uid] = 0;
                _in.inlist.find('.uid-'+uid).removeClass('m');
            }else{
                for(var i in _in.Finterval){
                    if(_in.Finterval[i]){
                        clearInterval(_in.Finterval[i]);
                        _in.Finterval[i] = 0;
                    }
                }
                _in.inlist.find('.m').removeClass('m');
            }
            _in.removeTitleFlicker();
        },
        //聊天api
        chat:function(uid){
            var _in = this;
            if(_in.userData[uid]){
                _in.createDialog(uid);
            }else{
                $.post('/chat/getName.html',{
                    id:uid
                }, function(n){
                    if(n.name){
                        _in.userData[uid] = {
                            name:n.name,
                            modify:new Date(),
                            status:n.status,
                            type:'temp'
                        };
                        _in.createDialog(uid);
                    }else{
                        alert('未找到该用户!');
                    }
                },'json');
            }
        },
        getDatetime:function(ts,time){
            var dt = ts ? new Date(ts.toString().length>13 ? Number(ts.toString().substr(0,13)) : ts) : new Date()
            , s = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate() + (time  ? '' : (' ' +  dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds()));
            return (s).replace(/([\-\: ])(\d{1})(?!\d)/g, '$10$2');
        }
    }
    window.chat = instantIm.init();
});