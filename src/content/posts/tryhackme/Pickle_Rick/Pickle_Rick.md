---
title: thm_Pickle_Rick
published: 2026-02-02
description: 'TryHackMe writeup - Pickle Rick'
image: './cover.png'
tags: [ctf, writeup, tryhackme]
category: 'TryHackMe Writeup'
draft: false 
lang: ''
---

# TryHackMe Writeup - Pickle Rick
## nmap看服務
```
┌──(kali㉿kali)-[~/Desktop/ctf/tryhackme]
└─$ nmap 10.49.187.123 -F
Starting Nmap 7.98 ( https://nmap.org ) at 2026-02-01 03:23 -0500
Nmap scan report for 10.49.187.123
Host is up (0.040s latency).
Not shown: 94 closed tcp ports (reset)
PORT     STATE    SERVICE
22/tcp   open     ssh
80/tcp   open     http
513/tcp  filtered login
1028/tcp filtered unknown
1900/tcp filtered upnp
6000/tcp filtered X11

Nmap done: 1 IP address (1 host up) scanned in 5.29 seconds
```

## gobuster炸網頁
```
┌──(kali㉿kali)-[~/Desktop/ctf/tryhackme]
└─$ gobuster dir -u http://10.49.187.123/ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt 
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.49.187.123/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
assets               (Status: 301) [Size: 315] [--> http://10.49.187.123/assets/]
server-status        (Status: 403) [Size: 278]
Progress: 29999 / 29999 (100.00%)
===============================================================
Finished
===============================================================

┌──(kali㉿kali)-[~/Desktop/ctf/tryhackme]
└─$ gobuster dir -u http://10.49.187.123/ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt 
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.49.187.123/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
login.php            (Status: 200) [Size: 882]
index.html           (Status: 200) [Size: 1062]
.htaccess            (Status: 403) [Size: 278]
robots.txt           (Status: 200) [Size: 17]
.                    (Status: 200) [Size: 1062]
.html                (Status: 403) [Size: 278]
portal.php           (Status: 302) [Size: 0] [--> /login.php]
.php                 (Status: 403) [Size: 278]
.htpasswd            (Status: 403) [Size: 278]
.htm                 (Status: 403) [Size: 278]
.htpasswds           (Status: 403) [Size: 278]
.htgroup             (Status: 403) [Size: 278]
wp-forum.phps        (Status: 403) [Size: 278]
.htaccess.bak        (Status: 403) [Size: 278]
.htuser              (Status: 403) [Size: 278]
.htc                 (Status: 403) [Size: 278]
.ht                  (Status: 403) [Size: 278]
denied.php           (Status: 302) [Size: 0] [--> /login.php]
Progress: 17129 / 17129 (100.00%)
===============================================================
Finished
===============================================================
```
## F12看網頁資訊
發現隱藏帳號`R1ckRul3s`
```
<!--

    Note to self, remember username!

    Username: R1ckRul3s

-->
```
## 看robots.txt
猜這東西是密碼
```
Wubbalubbadubdub
```

## 網頁登入
gobuster發現有login.php，可用剛剛找到的帳號密碼登入

登入密碼`R1ckRul3s:Wubbalubbadubdub`

## 指令面板
一登入可獲得一個指令面板，可下達ls等命令，且發現目前目錄中存在`Sup3rS3cretPickl3Ingred.txt`

用cat會被擋掉，改用strings
```
strings Sup3rS3cretPickl3Ingred.txt

mr. meeseek hair
```

## 提權
在指令面板中下`sudo -l`發現可在不需要密碼的情況下用sudo執行任意指令
```
Matching Defaults entries for www-data on ip-10-48-159-25:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User www-data may run the following commands on ip-10-48-159-25:
    (ALL) NOPASSWD: ALL
```

## 找flag
有了sudo權限後就可以慢慢找flag

一個在`/home/rick/second ingredients`，有空格所以可以用`*`萬用字元strings出來

一個在`/root/3rd.txt`，用sudo正常strings即可
```
sudo strings /home/rick/second*
1 jerry tear

sudo strings /root/3rd.txt
3rd ingredients: fleeb juice
```