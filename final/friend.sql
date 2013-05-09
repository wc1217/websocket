-- phpMyAdmin SQL Dump
-- version 3.5.3
-- http://www.phpmyadmin.net
--
-- 主机: localhost
-- 生成日期: 2013 年 05 月 10 日 00:20
-- 服务器版本: 5.5.20-log
-- PHP 版本: 5.3.9

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- 数据库: `chat`
--

-- --------------------------------------------------------

--
-- 表的结构 `friend`
--

CREATE TABLE IF NOT EXISTS `friend` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) unsigned NOT NULL,
  `fid` int(10) unsigned NOT NULL,
  `fname` varchar(50) NOT NULL,
  `status` tinyint(1) unsigned NOT NULL COMMENT '状态:0待确认,1:已同意,2:不同意(删除)',
  `modify` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `fid` (`fid`),
  KEY `status` (`status`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=22 ;

--
-- 转存表中的数据 `friend`
--

INSERT INTO `friend` (`id`, `uid`, `fid`, `fname`, `status`, `modify`) VALUES
(1, 1, 6, 'IE浏览器', 0, '2013-05-09 11:24:56'),
(2, 1, 1, 'chrome', 0, '2013-05-09 13:14:15'),
(3, 1, 2, 'firefox', 1, '2013-05-09 14:25:04'),
(4, 2, 1, 'chrome', 0, '2013-05-09 13:42:49'),
(5, 2, 1, 'chrome', 1, '2013-05-09 14:30:04'),
(6, 3, 1, 'chrome', 1, '2013-05-09 15:09:18'),
(7, 1, 3, 'opera', 1, '2013-05-09 15:09:18'),
(8, 1, 3, 'opera', 1, '2013-05-09 15:09:38'),
(9, 1, 3, 'opera', 1, '2013-05-09 15:09:43'),
(10, 2, 3, 'opera', 0, '2013-05-09 15:10:33'),
(11, 1, 4, '苹果浏览器', 1, '2013-05-09 15:15:14'),
(12, 4, 1, 'chrome', 1, '2013-05-09 15:15:14'),
(13, 3, 2, 'firefox', 1, '2013-05-09 15:22:53'),
(14, 2, 3, 'opera', 1, '2013-05-09 15:22:53'),
(15, 4, 4, '苹果浏览器', 0, '2013-05-09 15:23:31'),
(16, 4, 2, 'firefox', 1, '2013-05-09 15:24:42'),
(17, 2, 4, '苹果浏览器', 1, '2013-05-09 15:24:42'),
(18, 5, 1, 'chrome', 1, '2013-05-09 15:25:49'),
(19, 1, 5, '360浏览器', 1, '2013-05-09 15:25:49'),
(20, 5, 2, 'firefox', 1, '2013-05-09 15:27:08'),
(21, 2, 5, '360浏览器', 1, '2013-05-09 15:27:08');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
