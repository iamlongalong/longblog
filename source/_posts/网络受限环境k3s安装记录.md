---
title: "网络受限环境k3s安装记录"
abbrlink: 22_07_21_12_45_install_k3s_in_air_gap_air
date: 2022-07-21 12:45
date updated: 2022-07-21 12:45
tags: ["k3s","air gap","k8s","k8s集群安装","运维","云原生","ingress","dashboard"]
index_img: "https://static.longalong.cn/img/photo-1547471080-7cc2caa01a7e"
---

## 背景

在 [[我需要什么样的集群搭建工具]] 中解释过，我有时候需要在 网络受限 的环境搭建 k8s 环境。由于 k3s 官方对 air gap 环境的支持比较好，因此记录一下如何做的安装。

## 过程记录

### 下载资源

资源地址: https://github.com/k3s-io/k3s/releases

- 建立资源文件夹
```bash
mkdir k3s && cd k3s
```

- 下载 k3s 二进制文件
```bash
wget https://github.com/k3s-io/k3s/releases/download/v1.21.12-rc3%2Bk3s1/k3s
```

- 下载依赖镜像
```bash
wget https://github.com/k3s-io/k3s/releases/download/v1.21.12-rc3%2Bk3s1/k3s-airgap-images-amd64.tar.gz
```

- 下载部署脚本
```bash
wget -O install.sh https://get.k3s.io/
```

-  设置执行权限
```bash
chmod +x k3s install.sh
```

- 将整个文件夹打包
```bash
tar -czf k3s.tar.gz ../k3s
```

### 集群节点操作

- 将资源上传到机器上
```bash
scp k3s.tar.gz xxxx:~/
```

- 登录机器
```bash
ssh xxxx
```

- 解压资源
```bash
tar -zxf k3s.tar.gz
```

- 进入资源文件夹
```bash
cd k3s
```

- 创建 k3s 默认镜像目录
```bash
mkdir -p /var/lib/rancher/k3s/agent/images/
```

- 将 k3s 放入 bin 目录
```bash
cp k3s /usr/local/bin/
```

- 解压默认镜像包
```bash
tar -zmxf k3s-airgap-images-amd64.tar.gz  -C /var/lib/rancher/k3s/agent/images/
```

- 安装 master 节点
```bash
INSTALL_K3S_SKIP_DOWNLOAD=true INSTALL_K3S_EXEC="server --disable traefik --token testdemo" ./install.sh
```



### 安装常用工具

#### 安装 helm
- 下载 helm
```bash
wget https://get.helm.sh/helm-v3.7.1-linux-amd64.tar.gz
```
- 解压
```bash
tar -xzvf helm-v3.7.1-linux-amd64.tar.gz
```
- 移动到 bin 下
```bash
mv linux-amd64/helm /usr/local/bin/helm
```
- 清理残余
```bash
rm -rf helm-v3.7.1-linux-amd64.tar.gz linux-amd64
```



#### 安装 dashboard
- 获取基础 dashboard 清单
```bash
wget -O dashboard.yaml https://raw.githubusercontent.com/kubernetes/dashboard/v2.6.0/aio/deploy/recommended.yaml
```

- 修改镜像拉取策略
```bash
imagePullPolicy: IfNotPresent
```

- 修改 token 过期时间 (option)
```bash
# 在 deploy 启动参数中加入
--token-ttl=86400
```

- 手动获取镜像
```bash
docker pull kubernetesui/dashboard:v2.6.0

docker save -o dashboard.tar kubernetesui/dashboard:v2.6.0

docker pull kubernetesui/metrics-scraper:v1.0.8

docker save -o metrics-scraper.tar kubernetesui/metrics-scraper:v1.0.8
```

- 压缩镜像
```bash
tar -zcf dashboard.tar.gz dashboard.tar 
tar -zcf metrics-scraper.tar.gz metrics-scraper.tar
```

- 传递到服务器
```bash
scp dashboard.tar.gz xxxx:~/k3s
scp metrics-scraper.tar.gz xxxx:~/k3s
```

- 将镜像放入 k3s 默认路径中
```bash
tar -zxf dashboard.tar.gz -C /var/lib/rancher/k3s/agent/images/
tar -zxf metrics-scraper.tar.gz -C /var/lib/rancher/k3s/agent/images/
```

- 手动导入到 ctr 中 ( 不想重启 k3s )
```bash
ctr i import /var/lib/rancher/k3s/agent/images/dashboard.tar 
ctr i import /var/lib/rancher/k3s/agent/images/metrics-scraper.tar
```

- 设置访问账户
```bash
cat <<eof > dashboard.role.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
    name: admin-user
    namespace: kubernetes-dashboard
---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
    name: admin-user
roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: ClusterRole
    name: cluster-admin
subjects:
    - kind: ServiceAccount
      name: admin-user
      namespace: kubernetes-dashboard

eof
```

- 部署 dashboard
```bash
kubectl apply -f dashboard.yaml -f dashboard.role.yaml
```
- 设置 dashboard 端口访问
```bash
kubectl edit svc kubernetes-dashboard -n kubernetes-dashboard

# 将 port 改为 8082 (或自定义)
# 将 type 改为 LoadBalancer
```

- 访问地址
```bash
https://xxxx:8082/
```

- 跳过证书验证
```bash
# 在浏览器页面按下
thisisunsafe
```

- 获取 token
```bash
kubectl -n kubernetes-dashboard describe secret admin-user-token | grep '^token'
```

- 修改 metrics scriber 的保存时长
```bash
kubectl edit deploy -n kubernetes-dashboard dashboard-metrics-scraper

# 添加 args
args:
  - --metric-duration
  - 360h
```

- 持久化 metrics， 创建 pvc
```bash
cat <<eof > metrics.pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
    name: metrics-pvc
    namespace: kubernetes-dashboard
spec:
    accessModes:
      - ReadWriteOnce
    # storageClassName: local-path
    resources:
      requests: 
        storage: 2Gi
eof
```

- 创建 pvc
```bash
kubectl apply -f metrics.pvc.yaml
```

- 修改 metrics deploy
```bash
kubectl edit deploy -n kubernetes-dashboard dashboard-metrics-scraper
```

```yaml
# 修改 volume 申明
volumes:
  - name: metrics-volume
    persistentVolumeClaim:
	  claimName: metrics-pvc

# 修改 挂载申明
volumeMounts:
  - name: metrics-volume
    mountPath: /tmp
```


#### 安装 nginx-ingress
ingress 作为集群的统一入口，几乎是必不可少的。nginx 是最被大家熟悉的了，因此平常就使用 nginx 作为 ingress。

- 获取 nginx-ingress-controller 清单
```bash
wget -O ingress-nginx.yaml https://raw.githubusercontent.com/kubernetes/ingress-nginx/release-v1.3/deploy/static/provider/kind/1.22/deploy.yaml
```

- 获取 镜像
```bash
docker pull registry.k8s.io/ingress-nginx/controller:v1.3.0
docker pull docker.io/jettech/kube-webhook-certgen:v1.2.1

docker save -o kube-webhook-certgen.tar docker.io/jettech/kube-webhook-certgen:v1.2.1

docker save -o ingress-nginx.tar registry.k8s.io/ingress-nginx/controller:v1.3.0

tar -zcf ingress-nginx.tar.gz ingress-nginx.tar
tar -zcf kube-webhook-certgen.tar.gz kube-webhook-certgen.tar
```

- 上传镜像
```bash
scp ingress-nginx.tar.gz xxxx:~/k3s
scp kube-webhook-certgen.tar.gz xxxx:~/k3s
```

- 导入镜像
```bash
tar -zxf ingress-nginx.tar.gz -C /var/lib/rancher/k3s/agent/images/
tar -zxf kube-webhook-certgen.tar.gz -C /var/lib/rancher/k3s/agent/images/

ctr i import /var/lib/rancher/k3s/agent/images/ingress-nginx.tar
ctr i import /var/lib/rancher/k3s/agent/images/kube-webhook-certgen.tar
```

- 修改yaml镜像
```yaml
# nginx deployment
image: registry.k8s.io/ingress-nginx/controller:v1.3.0

# job
image: docker.io/jettech/kube-webhook-certgen:v1.2.1
```

- 去掉 node-selector 
```bash
#删除 ingress-ready: "true"
kubectl edit deploy ingress-nginx-controller -n ingress-nginx
```
- 部署
```bash
kubectl apply -f ingress-nginx.yaml
```

- 修改 svc 类型为 LoadBalancer (似乎不用)
```bash
kubectl edit svc ingress-nginx-controller -n ingress-nginx
```

- 测试一下
```bash
curl xxxx
```


#### 对 dashboard 增加 ingress
证书的来源，可以是自签，也可以是申请真正的证书，具体可以参考 [[如何解决证书问题]]
- 创建 secret 
```bash
k create secret tls mg-tls --key _wildcard.mg.com-key.pem --cert _wildcard.mg.com.pem
```


- 修改 dashboard 为 http 访问
仅需要把 `--auto-generate-certificates` 给注释掉，然后开放 `9090` 端口即可，另外，把 readness 探活端口也改成 9090
```bash
kubectl edit deploy kubernetes-dashboard -n kubernetes-dashboard
```

- 把 service 指向 9090
```bash
kubectl edit svc kubernetes-dashboard -n kubernetes-dashboard
```

- 创建 ingress yaml
```bash
cat <<eof > dashboard.ing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  labels:
    app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
spec:
  rules:
  - host: dashboard.mg.com
    http:
      paths:
      - backend:
          service:
            name: kubernetes-dashboard
            port: 
              number: 80
        path: /
        pathType: ImplementationSpecific
  tls:
  - hosts:
      - dashboard.mg.com
    secretName: mg-tls
eof
```
- 创建 ingress
```bash
kubectl apply -f dashboard.ing.yaml
```


- (可选) 实际也可以用 nginx 直接代理 https
```yaml
# 直接在注解中添加
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```


#### 安装 bash-completion
- 安装
```bash
yum install -y bash-completion
```

- 配置 helm 到 bash-completion 配置文件中
```bash
helm completion bash > /etc/bash_completion.d/helm
```

- 生效
```bash
source /usr/share/bash-completion/bash_completion
```


### 踩了一个大坑
- 阿里云会墙掉未备案的域名，如果想走公网ip，就不能随便自签一个证书
对通信过程的抓包
![](https://static.longalong.cn/img/20220723023426.png)
对 tls 握手的抓包
![](https://static.longalong.cn/img/20220723023648.png)



- 查看 tls 握手过程 #network #ssl
```bash
openssl s_client -connect baidu.com:443 -msg
```


国内非 air gap 也可以使用如下加速安装:
```bash
curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -
```

### 后续要继续做的

- [ ] 调研存储的实现方案 (nfs、longhorn)
- [ ] 调研 cert manager 的作用
- [ ] 完成对基础环境的封包
- [ ] 解决调试的问题( init container )
- [ ] 考虑是否解决证书轮转问题
- [ ] 考虑解决 registry 问题
- [ ] 解决日志采集问题 (采或不采是个问题，方案就用 fluentd)
- [ ] 解决集群监控问题 及 告警问题
- [ ] 解决非常基础的一些组件问题 (redis、mysql、kafka)
- [ ] 解决多集群管理问题 (rancher)
- [ ] 解决多集群发布问题 

---
> As you walk in God's divine wisdom, you will surely begin to see a greater measure of victory and good success in your life.
> — <cite>Joseph Prince</cite>