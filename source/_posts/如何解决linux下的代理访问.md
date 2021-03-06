---
title: 如何解决linux下的代理访问
abbrlink: 21_12_12_how_to_resolve_proxy_in_linux
date: 2021-12-12 13:26:59
index_img: https://static.longalong.cn/img/photo-1413752362258-7af2a667b590
tags: ["linux", "proxy", "helm", "ssh", "proxychains","radius"]
---

### 起因
想在 linux 上安装 helm，结果网速巨慢，于是想给服务器配个代理

### 代理安装
1. 配置pip源
```shell
cat > /root/.pip/pip.conf << eof
[global]
trusted-host =  pypi.douban.com
index-url = http://pypi.douban.com/simple
eof
```

2. pip升个级
```shell
yum install python3 -y && pip3 install --upgrade pip
```

3. 安装ss
```shell
pip install shadowsocks
```

4. 创建ss-local配置文件
```shell
mkdir /etc/ss
cat > /etc/ss/ss.json << eof
{
    "server":"ss 服务端 ip",
    "server_port":"ss 服务端端口",
    "local_address": "127.0.0.1",
    "local_port":1080,
    "password":"ss 服务端密码",
    "timeout":300,
    "method":"aes-256-cfb",
    "fast_open": false,
    "workers": 1
}
eof
```

5. 创建ss service
```shell
cat > /etc/systemd/system/ss.service << eof
[Unit]
Description=ss
[Service]
TimeoutStartSec=0
Restart=always
RestartSec=30
ExecStart=/usr/local/bin/sslocal -c /etc/ss/ss.json start
ExecStop=/usr/bin/killall sslocal
[Install]
WantedBy=multi-user.target
eof

# 如果没有 killall ，则执行
yum install psmisc -y
```

6. 自启动ss service
```shell
systemctl daemon-reload
systemctl enable ss.service
systemctl start ss.service
systemctl status ss

# 到此为止，已经可以使用 ss 代理了，验证一下
curl --socks5 127.0.0.1:1080 http://httpbin.org/ip
```

7. 安装privoxy (为了使用 http 代理)
```shell
yum install privoxy -y
```

8. 增加 privoxy 的配置文件
```shell
# 增加一条转发规则
echo 'forward-socks5t   /               127.0.0.1:1080 .' >> /etc/privoxy/config
# 默认配置已经打开 listen-address  127.0.0.1:8118 (http代理端口)
```

9. 启动 privoxy 代理
```shell
systemctl enable privoxy
systemctl restart privoxy
systemctl status privoxy
```

10. 安装 proxychains-ng (为了支持单个进程的代理)
```shell
yum install -y git
export http_proxy=http://127.0.0.1:8118; export https_proxy=https://127.0.0.1:8118; # 解决 git 慢的问题
git clone --depth=1 https://github.com/rofl0r/proxychains-ng
yum install gcc -y
cd proxychains-ng
./configure --prefix=/usr --sysconfdir=/etc
make && make install && make install-config
```

11. 修改 proxychains 配置
```shell
vim /etc/proxychains.conf
# 把最后一行的 socks4  127.0.0.1 9050 改成 socks5 127.0.0.1 1080
```

12. 起个别名
```shell
ln -s /usr/bin/proxychains4 /usr/bin/proxy
```

13. 测试一下
```shell
proxy curl www.google.com
```

自此以后，如果没法访问一些资源，则使用：
proxy + 要执行的命令

如果想在整个终端中使用 http 代理，则： (这是 privoxy 带来的)
```shell
export http_proxy=127.0.0.1:8118
export https_proxy=127.0.0.1:8118
```

以下，终于可以不受限制地安装helm了。。。
```shell
#helm安装
wget https://get.helm.sh/helm-v3.2.4-linux-amd64.tar.gz 

tar -zxvf helm-v3.2.4-linux-amd64.tar.gz

mv linux-amd64/helm /usr/local/bin/helm
```

相关的程序也可以看下： polipo

### 其他 ss 问题

1. 如果希望使用多级 ss (一台机器 作为 另一台机器的 中转 ss)
    - 能够使用 ssh， 则参照 [[反穿技术哪家强]]
    - 能够使用 ss-tunnel，则 ① 中转机启动 ss-local (假设本地代理端口为 50000) ② 中转机启动 ss-server ③ 使用 `ss-tunnel -l 1080 -b 127.0.0.1 -L 127.0.0.1:50000` (监听本地 1080)。这种方案 和 ssh 的方案本质一样，都是转发本地端口到远端端口。
    - 仅能使用 ss-local，则 ① 中转机启动 ss-local, 用于连接到上位ss  ② 中转机启动 ss-server, 用于承接 PC 上的连接  ③ 使用 proxy ssserver 
    - 如果中转机上使用的 ss-local , 那么任何能提供 `认证` 能力的 tunnel，都能满足需求，比如 [gost](https://github.com/ginuerzh/gost)、[nps](https://github.com/ehang-io/nps)、[clash](https://github.com/Dreamacro/clash)
    - 最简单的方式，是直接用 iptables 转发即可，直接使用 `iptables -t nat -A PREROUTING -4 -p tcp --dport 50000 -j DNAT --to-destination xxx.xxx.xxx.xx:50001` 即可 (本地 50000 转发到 上位 ss 的 50001)
      ps: 使用 iptables 有两个坑要注意下，① 要配置 内核参数允许转发 `net.ipv4.ip_forward = 1`  ② 要设置出网 ip 替换 `iptables -t nat -A POSTROUTING -4 -p tcp --dport 50001 -j MASQUERADE`，否则回包的地址就错了

2. 如果想用 ss 作为全局代理，可以使用 `redsocks + iptables` 的方案。

3. ssh 其实非常强大, 我们完全可以不用 ss-server 作为代理，直接使用 `ssh -D 1080 user@host`, 就能做到同样的事情。

4. 调试网络的过程中，有几个很好用的工具
   - `ss` 查看 socket 相关信息，和 netstat 有重合的部分
   - `netstat` 查看 socket 相关信息、路由信息
   - `ip` 查看或修改 路由、网卡
   - `ifconfig` 网卡信息查看及配置
   - `tcpdump` tcp 抓包工具
   - `telnet` 远程登录
   - `nc` socket 转发
   - `iptables` iptables 管理工具
   - `ipvsadm` ipvs 管理工具
   - `dig` / `nslookup` dns 查询
   - `curl` 支持多种应用层协议的工具

5. 希望 ss 有认证能力，可以结合 RADIUS ，具体可以参考: http://ss5.sourceforge.net/configuration.htm
