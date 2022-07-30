---
title: kratos源码走读记录
abbrlink: 22_07_29_11_19_codes_reading_of_go_kratos
date: 2022-07-29 11:18
date updated: 2022-07-29 11:18
tags: ["readingcodes","微服务","框架","kratos","go-kratos"]
index_img: "https://static.longalong.cn/img/photo-1506744038136-46273834b3fb"
---

go-kratos 是 B 站开源的微服务框架，是 golang 体系下几大微服务框架之一，有阅读源码的必要。

### api
?? metadata server

### cmd
命令行工具，三个部分：
- 创建 proto、api 等的基础工具
- 基于 protoc 的 http server 代码生成 ( grpc 框架的 http 方案，可以对比一下其他方案 )
- 基于 protoc 的 errors 代码生成 ( 这个很有特色，详见 errors 包 )

### config
配置管理
几个特点：
- 全部基于接口设计
- option 模式，可以修改  source、decoder、resolver 的具体实现
- 支持多个 source 及合并
- resolver 支持模板处理
- watch 机制，支持向上的变更监听
- observe 机制，支持向下的变更通知

一个想法： 基于接口的开发，很流畅

- [ ] 对比一下和 viper 、go-zero、goframe、go-kit 的配置方案

### contrib
三方项目的支持
config:  apollo、consul、etcd、configmap、nacos、polaris
原来使用 volume 挂载的方式使用 configmap，需要 deployment  去申明这些东西，比较麻烦，实际上，直接在 k8s 中用 sdk 读 configmap 确实挺方便。

encoding: [msgpack](https://msgpack.org/index.html) #序列化

metrics: datadog、promethues  (看看 metrics 还有其他什么方案吗)

opensergo: 一个ali、字节、bilibili 一起搞的服务治理框架，[参考文档](https://developer.aliyun.com/article/889635?utm_content=m_1000337652)

registry:  consul、 discovery、etcd、eureka、k8s、nacos、polaris、zk

### encoding
用于序列化和反序列化。
提供了 json、xml、yaml、proto、form 的方式。
json 和 proto 都用的 pb 的 marshal 和 unmarshal。
xml 用的标准库。
yaml 用的 `gopkg.in/yaml.v3`
form 用的 `gggo-playground/form/v4` ，并且为 proto.Message 做了专门的适配。


### errors
errors 的设计挺有意思，可以再参考下。
使用 proto 文件管理，自动生成代码。
有很多 error 体系都是自己的 封装，可以参考下 goframe 的 errors 、gopkg/errors 的设计。

### internal
一些内部工具。

group 包下的 example_test.go 的使用比较有意思，可以参考 这种 test 的方式。


### log
log 的接口有两层，一层是 `log(level, kv...)` ，另一层是 `helper` ，日常使用 helper。
contrib 中实现了对 ali、fluent、zap、logrus 的对接。主要还是做输出的管理。


### metadata
简单的 metadata 封装，其实就是一个 `map[string]string`

### metrics
简单的 metrics 接口定义。 具体实现在 contrib 包中。

### middleware
一些常用的 server 中间件。

### registry
简单的注册中心接口定义，具体的实现在 contrib 中。
?? 不知道现在是 全量同步，还是增量同步。

### selector
一些 balancer 的方法，例如 随机、轮询。

### third_party
一些三方的 proto 定义。

### transport
http 框架封装 和 grpc 框架封装。 预期 ws 框架封装也可以进来。

http 路由使用的 mux 。


## 整体感受

kratos 的代码非常清晰简洁，没有太多复杂的设计。
代码风格一致性很好，外层定义接口，内层多个实现。常用 option 模式。

之后要再实际用 kratos 写几个小 demo 。
要看看 kratos 的返回值定义，以及 api 文档方面的解决方案。
- [ ] 使用 go-kratos 写几个小 demo






---
> Life's most persistent and urgent question is, 'What are you doing for others?'
> — <cite>Martin Luther King Jr.</cite>