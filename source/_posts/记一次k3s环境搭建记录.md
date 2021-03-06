---
title: 记一次k3s环境搭建记录
abbrlink: 21_12_26_a_record_of_k3s_run_up
date: 2021-12-26 12:45:47
index_img: https://static.longalong.cn/img/photo-1491425432462-010715fd7ed7
tags: ["k3s", "k8s", "enviroment", "develop"]
---

### 背景

生产环境中，我们很早在使用 k8s 作为基础设施了，后来，企业项目要做私有化部署，就把目光转向 `k3s` 了。
k3s 是一个轻量级的 k8s，几乎实现了所有 k8s 的特性，除了一些边缘的场景，基本可以把 k3s 当做 k8s 去使用。

### 一些备选方案

早期部署 k8s 环境是十分繁杂的，各个组件都是二进制方式部署，如果遇到问题，排查起来需要的预备知识非常多，因此，大部分企业在使用 k8s 时，都是直接选择云服务商提供的 k8s 集群，阿里云、腾讯云、亚马逊等等都提供了非常完善的 k8s 集群。
那作为个人想要玩一玩 k8s ，我们可以怎么搞呢？ 其实社区已经出了非常多的用于简化 k8s 环境搭建的项目，下面列举一些：
1. 使用 ansible 等工具简化搭建，例如 [kubespray](https://github.com/kubernetes-sigs/kubespray)、[kubeasz](https://github.com/easzlab/kubeasz)、[Kops](https://github.com/kubernetes/kops)、[kubeadm](https://github.com/kubernetes/kubeadm)
3. [minikube](https://github.com/kubernetes/minikube)、[kind](https://github.com/kubernetes-sigs/kind)、[microk8s](https://github.com/ubuntu/microk8s)、[k3s](https://github.com/k3s-io/k3s) 等轻量级 k8s 实现。
4. [rancher](https://github.com/ubuntu/microk8s)、[kubeoperator](https://github.com/KubeOperator/KubeOperator) 这类可视化操作方式
5. 如果你只是想在自己电脑上玩一下，可以直接使用 docker 客户端提供的 k8s 集群，或者用 [k3d](https://github.com/rancher/k3d) (k3s in docker) 、[minikube](https://github.com/kubernetes/minikube)、[kind](https://github.com/kubernetes-sigs/kind)

值得一提的是， k3s 和 microk8s 是为生成环境设计的 k8s 实现，是为了在资源有限的情况下使用 k8s 集群的一种方案，例如 边缘计算、iot 等场景。(可以搜索和 kubeedge 等结合的内容)


### 搭建操作

因为更加看好 k3s 的生态，因此选用 k3s 作为基础设施。在 k3s 的搭建上，使用官方的搭建脚本已经比较简单了，不过还是有一些为了更加简化搭建过程而出现的项目，例如 [k3sup](https://github.com/alexellis/k3sup) 、 [autok3s](https://github.com/cnrancher/autok3s) 这两者都提供了远程安装 k3s 的能力，不过后者还有图形化界面。 从搭建难度上，这两者对我而言没啥差别，因此我直接选择了 k3sup。

1. 在本地下载 k3sup 

```shell
curl -sLS https://get.k3sup.dev | sh
```

2. 在阿里云上开两台机器，并配置公钥
```shell
ssh-copy-id root@xxx.xx.xx.xx
```

3. 在机器 1 上部署 master 节点
```shell
k3sup install --user root --ip xx.xx.xx.xx --k3s-version v1.21.1+k3s1  --k3s-extra-args '--no-deploy traefik --docker' --tls-san "xx.xx.xx.xx" --context k3s --merge
```

4. 在机器 2 上部署 slave 节点
```shell
k3sup join --user root --ip xx.xx.xx.xx --k3s-version v1.19.7+k3s1 --server-ip xx.xx.xx.xx
```

5. 查看结果
```shell
[root@longk3s001 ~]# kubectl  get node
NAME         STATUS   ROLES    AGE    VERSION
longk3s001   Ready    master   129m   v1.19.7+k3s1
longk3s002   Ready    <none>   112m   v1.19.7+k3s1
```

以上，基本的 k3s 环境就搭建完成成功了

可以设置几个常用的 kubectl 别名，方便使用
```shell
cat <<eof >> ~/.bashrc
alias k=kubectl
alias ke="kubectl edit"
alias ked="kubectl edit deploy"
alias kg="kubectl get"
alias kgp="kubectl get po"
alias wp="watch kubectl get po"
alias kd="kubectl delete"
alias kdp="kubectl delete pod"
alias klf="kubectl logs -f"
alias krrd="kubectl rollout restart deploy "
eof
bash

```

### 解决远程访问问题

在集群外访问集群内的通用方案，基本可以分为： 

1. loadBalancer
2. nodePort
3. ingress
4. hostNetwork

一般来说，云厂商提供的 k8s 集群，都是采用 loadBalancer 的方式，云厂商会自动提供公网 ip (当然也可以是内网 ip)。 而对于自建的 k8s 集群，则没有现成的 lb，要么使用其他方式，要么，自建 lb。

1. 自建 lb 可以采用 [metalLB](https://github.com/metallb/metallb)， 另外，k3s 官方也提供了一个 lb 实现 [klipper-lb](https://github.com/k3s-io/klipper-lb)
2. 使用 nodePort 是一个比较简便的方式，直接改 service 类型即可。但问题是要记各个服务的 nodePort 是多少，比较麻烦，服务多了之后，根本不记得哪个 port 对应哪个服务。
3. 使用 ingress 是一个很不错的方式，相当于在所有服务前加了一个反向代理服务器，比如 nginx。ingress 的使用能比较好地解决端口复用问题，可以根据 二级域名、访问路径、header 等各种标识对流量进行分发，基本上可以认为，对于企业级项目，用 ingress 就对了。不过，ingress 的相关配置是一个需要学习的内容，尤其是关于 ssl 证书，之后专门出一篇文章记录一下。
4. 使用 hostNetwork 相当于直接使用宿主机的网络，也就是说，一个服务若开了 8080 端口，则会直接在宿主机上监听 8080 端口。一般来说，hostNetwork 适用于一个集群仅服务于一个主服务的项目。但有一种很好的方式，可以解决 没有 lb 的问题，那就是 使用 ingress 作为流量分发，同时对 ingress 使用 hostNetwork，并且，对于 ingress 使用 daemonset 进行部署，这样就类似于将 ingress 作为 lb 来使用了。

我直接采用 4 中的方案。相关的信息可以参考 [ingress-nginx](https://github.com/kubernetes/ingress-nginx/blob/nginx-0.29.0/docs/deploy/baremetal.md)

记录一下基本过程：
1. 进入到 nginx-ingress 的[文档中](https://github.com/kubernetes/ingress-nginx/blob/nginx-0.29.0/docs/deploy/index.md)

2. 获取清单
```shell
wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.29.0/deploy/static/mandatory.yaml
```

3. 修改 deployment 资源
```shell
# 1. 修改 Deployment 为 DaemonSet
# 2. 去掉 spec.replicas
# 3. spec.template.spec 增加  hostNetwork: true
```

4. 启用配置
```shell
kubectl apply -f mandatory.yaml
```

这之后就按照自己的需要，部署自己的服务即可。

### 解决存储问题

- 使用默认的 本地存储 (local-path)。
- 使用 nfs 或其他远程存储方案，具体可以参见：[nfs-provisioner](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner)
- 使用类似于 Longhorn 的分布式存储方案 (k3s 推荐方式)，具体可以参见：[k3s storage](https://rancher.com/docs/k3s/latest/en/storage/)
 


### 解决日志问题

默认的日志是分布在各个节点上的，当节点被删除时，日志也就丢了，日志可以使用 fluentd 进行采集(或者 fluent-bit)，具体可以参见： [fluentd 官方文档](https://docs.fluentd.org/)

[TODO] 解决日志解析和查询问题 (重量和轻量)


### 解决证书问题
1. 解决集群内证书时长问题，虽然每年重启一次 k3s 即可自动更新证书，但一个稳定的服务扔在那里，谁记得啥时候要重启啊，可以通过改代码重新编译，变成100年就ok了。
2. 解决 ssl 证书问题，可以参考 [cert-manager](https://cert-manager.io/docs/)


### 解决面板及管理工具

k8s 生态下已经有大量的面板，最基础的是官方的 dashboard，周边的还有：
- kubeboard
- kubepi
- kubesphere
- rancher

面板工具来看，整体差别不大，交互上有少量差别，日常使用完全够了，如果有多集群管理需求的话，个人使用不建议 kubeboard(超过3个收费) ，毕竟穷人不配(-.-!)。 kubesphere 和 kubeboard 的周边插件功能还是不错的，可以方便地集成一些常用的组件，并且提供了控制面板。

客户端还有 lens， 命令行还有 k9s ，都是非常不错的工具。尤其是 `k9s` ，熟悉了快捷键后，十分方便。


### 解决 CD 问题

对于 k8s 的自动发布，最基础的方式自然是在原有的 CD 脚本中，写一些 kubectl 的命令。但这样不够优雅，主要是将来维护比较麻烦，对于不够熟练 kubectl 的同学而言，有一定学习成本。

如果要采用更加成熟的方案，可以考虑 jenkins (x) ，社区也有很多针对 k8s 的脚本。 也可以采用 argoCD ，和 k8s 的生态结合得比较紧密。 droneCI 也是一个不错的选择。

还有一些备选方案： skaffold、devspace 等，这些是可以在本地打包，然后部署到 k8s 的方式。

如果，企业级使用的话，spinnaker 是一个非常不错选择。

[TODO] 补一些 CD 相关的文档


### 解决监控问题

机器的监控，比较轻量的方式可以使用 netdata。另外可以用 datadog，生态应该也是很不错的，不过我没怎么做更多的探索。
grafana + promethues 是一个更加通用的方案，社区也提供了大量的面板模板，不论是 node exporter 还是 pod exporter，都有比较成熟的面板。推荐使用。 


### 解决开发调试问题

两个不错的方案：
[devspace](https://devspace.sh/cli/docs/introduction)
[nocalhost](https://nocalhost.dev/docs/quick-start/)

### 其他可能的问题
- 服务可视化 (tracing、metrics)
- 日志体系
- 告警体系
- 均衡问题 可以参考 [descheduler](https://github.com/kubernetes-sigs/descheduler)


TODO:
1. 增加 k8s ssl相关配置操作记录
2. 增加 k8s 日志、监控、追踪、告警 相关操作记录
3. 增加对一个服务的相关操作
