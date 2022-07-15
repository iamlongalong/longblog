---
title: websocket百万连接测试
abbrlink: 21_12_02_websocket百万连接测试
date: 2021-12-02 17:19:45
index_img: https://static.longalong.cn/img/photo-1491425432462-010715fd7ed7
tags: ["websocket"]
---

## 前置准备
websocket作为一个与客户端直接连接通信的中间人，在大用户量的情况下，需要建立大量的连接，在此测试单台机器进行websocket的连接具有多大的潜力。
### 测试目的
1. 机器的连接数潜力
2. 机器的网络传输潜力

### 测试内容
1. 单台机器进行连接数测试
2. 单台机器进行传输量测试

### 硬件资源：
1. 被测试机  ecs 4c8g * 1
2. 压测机 ecs 4c8g * 2

### 软件准备：
1. websocket server 端 (基于 gorilla 写的简单服务)
2. websocket client 端 (基于 gorilla 写的简单客户端)

## 连接测试

### 开始运行server端并监控数据
![1](https://static.longalong.cn/img/1.png)

### 遇到问题1
压测量到达50000左右时上不去了
![2](https://static.longalong.cn/img/2.png)

发现客户端报错：
![3](https://static.longalong.cn/img/3.png)

查看系统内核参数中对 port 的分配：
```shell
[root@ws_press_client_02 ~]# sysctl -a  |grep port_range
net.ipv4.ip_local_port_range = 32768        60999
```

发现仅有28000个左右，要调整。
解决办法：
```shell
# 1. 调低端口释放后的等待时间，默认为60s，修改为15~30s
sysctl -w net.ipv4.tcp_fin_timeout=15
# 2. 修改tcp/ip协议配置， 通过配置/proc/sys/net/ipv4/tcp_tw_resue, 默认为0，修改为1，释放TIME_WAIT端口给新连接使用
sysctl -w net.ipv4.tcp_timestamps=1
# 3. 修改tcp/ip协议配置，快速回收socket资源，默认为0，修改为1
sysctl -w net.ipv4.tcp_tw_recycle=1
# 4. 增加可用端口
sysctl -w net.ipv4.ip_local_port_range ="2000  65000"
```

### 遇到问题2
客户端报错：
![4](https://static.longalong.cn/img/4.png)

服务端报错：
![5](https://static.longalong.cn/img/5.png)

问题是
```shell
[root@ws_press_server ~]# ulimit -a
core file size          (blocks, -c) 0
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) 1024
pending signals                 (-i) 31202
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 65535  => 文件句柄大小限制
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 31202
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
```

解决办法
```shell
[root@ws_press_server ~]# ulimit -n 1000000
[root@ws_press_server ~]# ulimit -a
core file size          (blocks, -c) 0
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) 1024
pending signals                 (-i) 31202
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1000000
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 31202
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
```

### 第一波结果
到现在为止，达到120000连接
```shell
[root@ws_press_server ~]# echo && curl localhost:8080/conns && echo && echo

{"closed":0,"conns":120000}
```

查看server端资源耗用
![6](https://static.longalong.cn/img/6.png)
Ps: cpu的变化较大，从40%到400%不等。（由于数据发送的周期性）

client端资源耗用
![7](https://static.longalong.cn/img/7.png)

单个连接资源耗用
```shell
> 8 * 1024 * 1024 // 总kb数
8388608
> 8 * 1024 * 1024 * 36.7 * 0.01 // 占用kb数
3078619
> 3078619 / 120000 // 单个连接占用kb数
25.65
```

### 问题分析
目前的瓶颈在压测服务器的port资源上，因此，如果想达到 1,000,000 的数量，需要 63000(连接) * 16(机器)  = 1008000 。
从ws服务器的资源使用情况来看，4c8g是无法支撑这个量的，按照每个连接需要约 26kb 的内存来算，需要至少 26 kb * 1000000 = 25 g 的内存。

### 第二波测试
#### 换配置
服务端： 16c32g * 1
压测端： 2c4g * 16

斥巨资买服务器，纪念一下
![8](https://static.longalong.cn/img/8.png)

执行命令
```shell
./main -addr 172.16.0.42:8080 -con 63000 -time 180 -path /ws -co 1000 -wait 180
```

### 执行情况
![9](https://static.longalong.cn/img/9.png)
![10](https://static.longalong.cn/img/10.png)
达到了单机100万连接，然后进程就被杀死了……

### 结论1
基本算是达到了单机百万连接的目标。
但实际上，连接量并不是我们所追求的，而应当是在有数据传输下的表现，因此要对数据传输进行压测。

## 数据传输压测
### 第一轮： 4 * 10000 连接， 100byte每100ms 
结果：
![11](https://static.longalong.cn/img/11.png)
![12](https://static.longalong.cn/img/12.png)

60s内总共发送了 2344 MB 数据，cpu使用大约为 960%

### 第二轮： 4 * 10000 连接， 50byte每50ms 
![13](https://static.longalong.cn/img/13.png)

### 第三轮： 4 * 10000 连接， 200byte每100ms
![14](https://static.longalong.cn/img/14.png)

### 第四轮： 4 * 10000 连接， 1000byte每100ms
![15](https://static.longalong.cn/img/15.png)

### 第五轮： 4 * 5000 连接， 2000byte每100ms
![16](https://static.longalong.cn/img/16.png)

### 第六轮： 4 * 20000 连接， 1000byte每100ms
![17](https://static.longalong.cn/img/17.png)

### 第七轮： 4 * 20000 连接， 100byte每200ms
![18](https://static.longalong.cn/img/18.png)

### 第八轮： 4 * 20000 连接， 50byte每100ms
![19](https://static.longalong.cn/img/19.png)

### 第九轮： 4 * 20000 连接， 100byte每100ms
![20](https://static.longalong.cn/img/20.png)

### 第十轮： 4 * 20000 连接， 1000byte每200ms = 64 k连接·kb/ms
![21](https://static.longalong.cn/img/21.png)

### 第十一轮： 4 * 20000 连接， 2000byte每400ms  = 64 k连接 · kb/ms
![22](https://static.longalong.cn/img/22.png)

### 第十二轮： 4 * 20000 连接， 1000 byte 每 200ms
![23](https://static.longalong.cn/img/23.png)

### 第十三轮： 4 * 25000 连接， 1000 byte 每 200ms (大量报错)
![24](https://static.longalong.cn/img/24.png)


### 执行命令
```shell
./main -addr 172.16.0.42:8080 -con 20000 -time 180 -path /ws -co 1000 -wait 180 -sendtick 100 -databyte 100
```

### 结论2
1. 关注平均负载是很重要的
2. 对内存耗用不高，对cpu耗用非常高
3. 单次传输量对cpu的影响不大(估计是和 socket 的读写缓冲大小相关)
4. 传输频次对cpu的影响较大

## 其他文档
不错的总结： [《使用Go实现支持百万连接的websocket服务器》笔记(上)](https://blog.csdn.net/Fredric_2014/article/details/89019815)
不错的排查： [记一次压测问题定位:connection reset by peer，TCP三次握手后服务端发送RST](https://blog.csdn.net/c359719435/article/details/80300433)
