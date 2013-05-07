$(function(){
    /*
     t.repeat(function(){
                t.toggleClass('inctred');
            },4,300,function(){
                t.addClass('inctred');
            });*/
    $.fn.repeat = function(fn,limit,time,last){
        this.queue('cym_fs',[]);
        for(var i=0;i<=limit;i++){
            this.queue('cym_fs', function(){
                var self = this;
                fn();
                setTimeout(function() {
                    $(self).dequeue('cym_fs');
                }, time||1000);
            });
        }
        if(typeof last=='function'){
            this.queue('cym_fs', function(){
                last();
                $(this).dequeue('cym_fs');
            });
        }
        return this.dequeue('cym_fs');
    };

    $.fn.flicker = function(){
        var _in = instantIm;
        for(var i in _in.Finterval){
            clearInterval(_in.Finterval[i]);
        }
        this.each(function(){
            var that = $(this);
            _in.Finterval.push(setInterval(function(){
                that.toggleClass('m');
            },300));
        });
    }
     
    var instantIm = {
        target:null,//容器对象

        inbar:null,//状态栏

        inct:null,//联系人(消息数目)栏

        inuser:null,//列表框

        inlist:null,//用户列表

        indialog:{},//对话框

        userData:{},//全部用户数据

        userTarget:{},//存储用户列表对li对象,因为json不支持dom

        store:null,//存储对象

        unReadUser:{},//有未读消息的用户

        unReadList:{},//所有未读消息

        Finterval:{},//消息闪烁

        socket:null,//websocket

        docTitle:document.title,//网页标题

        config:{
            animate:!$.browser.msie,//开启动画(ie不开)?
            drag:true,//开启拖动
            wsURI:'ws://127.0.0.1:8080',//ws url
            loadURI:'/lately.php',//最近联系人
            onlineURI:'/chat/getonline.html',//在线用户
            onlineTime:1000*60*5,//在线用户重新加载时间
            getName:'/chat/getName.html',
            pollURI:'/chat/poll.html',//获取新消息页面(长轮循)
            pollSuccessTime:1000*3,//成功之后的重新开始时间
            pollErrorTime:1000*10,//错误之后的重新开始时间
            pollListenTime:1000*30,//等待唤醒时间(与后端对应)
            tsStamp:Math.round(new Date().getTime()/1000),//本实例的timeStamp + uid
            isStamp:false,//是否活动的
            pollErrorNum:0,//未知错误
            pollErrorLimit:0,//未知错误重试次数
            userid:function(){//测试用户id
                var id = $('#webIn');
                return id.length ? parseInt(id.attr('uid')) : false;
            },
            wrap:'<div id="instantIm"><div class="inbar"><div class="inct gb">联系人[<span class="cRed">0</span>/<span>0</span>]<span class="ingif"></span></div></div></div>',
            list:'<div class="userList"><div class="intop gb"><div class="hand gb"></div><div class="intit">联系人</div><div class="linev"></div></div><div class="intip gb"><span class="gb"></span>清除聊天记录即可删除联系人。</div><div class="inlist"><ul></ul></div><div class="inbot gb"><span class="gb"></span></div>',
            userList:'<li class="uid-{$uid}"><a href="javascript:;" title="最近通话时间: {$modify}">{$name}</a></li>',
            dialog:'<div class="dialog"><div class="intop gb"><div class="hand gb handx"></div><div class="hand gb"></div><div class="intit">联系人</div></div><div class="intip gb"><span class="gb"></span><span></span></div><div class="msg"></div><div class="infoot"><div class="send"><textarea></textarea><div class="sb"><div class="gb">发送</div></div></div><div class="ftip"><span class="gb"></span><a href="javascript:;" style="float:right">《消息系统使用规则》</a><a href="/member/#/personal.html" target="_blank" class="chatlog">对话记录</a></div></div></div>',
            userBar:'<div class="dialogue gb" uid="{$uid}">与“{$name}”对话中...</div>',
            userHis:'<div class="inname"><span>{$create}</span><a href="javascript:;">{$name}</a></div><div class="content">{$content}</div>'
        },
        init:function(){
            var _in = this, userid = _in.config.userid();
            if(_in.target==null && userid){
                _in.config.tsStamp = userid+''+_in.config.tsStamp;
                //初始化comet
                _in.webComet();
                $.chatIn = function(uid){
                    _in.chat(uid);
                }
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
            _in.initList();//加载用户列表
            //延时加载在线用户列表
            setInterval(function(){
                _in.initList();
            }, _in.config.onlineTime);
        },
        //加载联系人栏
        initBar:function(){
            var _t = this;
            return _t.inbar.find('.inct').click(function(){
                //显示用户框(始终动画)
                _t.inuser.show().animate({
                    bottom:'1px'
                },{
                    duration:'slow',
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
                },'slow', 'easeInExpo', function(){
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
        initList:function(){
            var _in = this,html='',o = 0;
            $.post(_in.config.loadURI,function(res){
                if(!res)return;
                $.each(res.data||[], function(i,n){
                    _in.userData[n.uid] = {
                        name:n.name,
                        modify:n.modify,
                        content:n.msg,
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
            },'json');
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
                    _in.indialog[uid].msg.addClass('sending');
                    $.post('/chat/send.html', {
                        uid:uid,
                        msg:msg
                    }, function(res){
                        if(res.name){
                            var msg = _in.indialog[uid].msg.append(_in.sprintf(_in.config.userHis, res)).removeClass('sending')[0];
                            msg.scrollTop=msg.scrollHeight;
                        }
                        if(_in.userData[uid].type==='temp')
                            _in.initList();
                    },'json');
                }else{
                    alert('请输入消息内容(不大于200个字符)! ');
                }
            });

            //用户窗口状态
            _in.indialog[uid].status = 'none';
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
            _in.indialog[uid].barStatus = 'none';
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
        //加载聊天记录
        loadHistory:function(uid){
            return;
            var _in = this;
            //---------------------------------以下加载消息------------------------------------------------------
            try{
                //历史消息

                var html = '';
                for(var m in _in.unReadList[uid]){
                    html += _in.sprintf(_in.config.userHis, _in.unReadList[uid][m]);
                }
                var msg = _in.indialog[uid].msg.append(html)[0];
                msg.scrollTop=msg.scrollHeight;
                //}
                _in.clearFlicker(uid);
            }catch(e){
                _in.writeLock=false;
            }
        // }
        //---------------------------------以上加载消息------------------------------------------------------

        //if(!$.isEmptyObject(data))
        //    this.indialog[uid].msg.append(this.sprintf(this.config.userHis, data));
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
                _in.show().animate(_in.seat, 'slow', 'easeOutBack' ,function(){
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
                    if(typeof fn == 'function')fn();
                })
            }else{
                _in.hide().status='none';
                if(typeof fn == 'function')fn();
            }
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
        //通信核心
        webComet:function(){
            var _in = this, socket = window.WebSocket || window.MozWebSocket;
            if(socket)
                _in.socket = new socket(_in.config.wsURI);
            if(_in.socket)
                _in.loadUI();
        },
        //闪烁用户BAR
        flickerBar:function(uid){
            var _in = this, t = uid && _in.indialog[uid].barStatus=='block' ? _in.indialog[uid].bar : _in.inct;
            if(!t.hasClass('inctred') && !t.addClass('inctred').find('.ingif img').length){
                t.find('.ingif').html('<img src="/img/xiaoxi.gif" />');
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
                document.title = (o ? '[新消息...]' : '[　　　　   ]') + t;
                o = !o;
            },400);
        },
        removeTitleFlicker:function(){
            if(this.timeId){
                clearInterval(this.timeId);
                document.title = this.docTitle;
            }
        },
        //循环store
        storePoll:function(){
            var _in = this;
            _in.storeInterval = setInterval(function(){
                if(_in.writeLock===false){
                    //活动的
                    if(_in.isStamp){
                        /*
                         * 活动的列表
                         * 1.读取未读消息,(之后保存至历史消息中..一天之内的)
                         * 2.有新用户则加入用户列表中
                         */
                        _in.unReadList = JSON.parse(_in.store.get('unReadList'));//消息列表
                        //闪烁提示
                        _in.unReadUser = JSON.parse(_in.store.get('unReadUser'));
                        //用户列表打开时,且聊天窗口不存在时
                        if(_in.inuser.status=='block'){
                            _in.eachFlicker();
                        }
                    }else{//正在监听的
                        /*
                         * 非活动的(暂放)
                         * 1.加载用户列表,并存储已加载对象
                         * 2.加载历史消息,并存储已加载对象
                         */
                        _in.historyMsg = JSON.parse(_in.store.get('historyMsg'));
                        _in.userList = JSON.parse(_in.store.get('userList'));
                    }
                }
            },1000);
        },
        //用户消息闪烁(动态加载消息在此)
        userFlicker:function(uid){
            var _in = this;
            //用户有未读消息, 存在用户列表中, 且没有开启闪烁
            if(_in.unReadUser[uid]===true && !_in.Finterval[uid]){
                //clearInterval(_in.Finterval[uid]);  //这里更改可以改为同步闪烁
                //_in.Finterval[uid] = 0;
                if(_in.userData[uid]){
                    if(_in.indialog[uid]){//如果窗口开启
                        if(_in.indialog[uid].status=='none'){//如果窗口是显示的
                            _in.flickerBar(uid);//@todo 闪烁用户状态
                        }
                        _in.loadHistory(uid);
                    }else{
                        var that = _in.userTarget[uid];
                        if(that)
                            _in.Finterval[uid] = setInterval(function(){
                                that.toggleClass('m');
                            },300);
                    }
                }else{
                    _in.userData[uid] = {
                        name:'加载中..',
                        status:'offline',
                        type:'loading'
                    };
                    _in.initList();
                }
            }
        },
        //循环用户闪烁
        eachFlicker:function(uid){
            var _t = this;
            if(_t.inuser.status=='block'){
                if(uid){
                    if(!_t.Finterval[uid]){
                        _t.userFlicker(uid);
                    }
                }else{
                    for(var i in _t.unReadUser){
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
        }
    }
    instantIm.init();
});