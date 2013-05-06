<?php

$list = array(
    array('uid' => 1, 'name' => '测试用户', 'modify' => '2013-05-06 21:10:10', 'msg' => '最后一次消息', 'status' => 'online'),
    array('uid' => 2, 'name' => '测试用户', 'modify' => '2013-05-06 21:10:10', 'msg' => '最后一次消息', 'status' => 'online'),
    array('uid' => 3, 'name' => '测试用户', 'modify' => '2013-05-06 21:10:10', 'msg' => '最后一次消息', 'status' => 'online'),
    array('uid' => 4, 'name' => '测试用户', 'modify' => '2013-05-06 21:10:10', 'msg' => '最后一次消息', 'status' => 'offline'),
    array('uid' => 5, 'name' => '测试用户', 'modify' => '2013-05-06 21:10:10', 'msg' => '最后一次消息', 'status' => 'online'),
);
echo '{"total":"' . count($list) . '","data":' . json_encode($list) . '}';
exit;