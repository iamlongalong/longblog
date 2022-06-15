---
title: service mesh 是如何产生的？
abbrlink: 22_06_16_how_service_mesh_born
date: 2022-06-16 00:07:19
tags:
---

### 演进过程

最原始的应用，是由小团队直接负责的单体应用，直观的感受是，团队里的每个人，都对整个项目的技术选型具有影响力(姑且认为 每个人都是 “技术管理委员会” 的成员)。由于仅有一个大项目，也就基本不存在 “平台能力” 的概念。

单体项目逐渐膨胀，分层逐渐模糊、模块逐渐耦合、调用逐渐混乱、发布越发频繁、单个错误的影响面越发增大…… ，这就进入到所谓的 “单体地狱” 阶段。 解决办法之一，就是进行 服务化演进。

### 遇到的问题

当单体服务拆分成多个服务后，从代码功能上，出现了一系列 与业务功能无关的 相似需求，例如 `服务发现`、`配置管理`、`负载均衡`、`健康检查`、`限流熔断`、`安全加密`、`协议转换`、`认证授权`、`链路追踪`、`通用监控` 等，我们将之统称为 “平台能力”。

在组织结构上，不同的服务 会被 不同的团队(人员) 所管理，服务的技术走向 会逐渐脱离原有的 “技术管理委员会” 的管理，逐渐出现 不同代码实现、不同库选型、不同框架选型、不同语言选型 等等情况。

当出现了一些上述的问题后，有识之士 就会想： <strong>“如何统一提供平台能力，解放业务专家们，让业务同学专注业务开发？”</strong>

### 解决问题的方向

#### 进程内方案

最直接的想法会是：根据不同语言，提供平台能力的 sdk。表现形式可能是： 工具库、应用框架。例如，统一的 web server 框架，在框架中提供 服务发现、负载均衡、监控、限流 等平台能力。

举个栗子，java 中的 `spring cloud` 提供了几大组件解决平台能力，如： `Eureka` 解决服务注册与发现、 `Ribbon` 解决负载均衡、 `Hystrix` 解决系统保护、 `Gateway` 提供 api 网关、 `Spring cloud config` 解决配置管理……

实际上，在单个语言体系下的各类 微服务框架 都是在解决这个问题。例如 golang 下的 `kratos`、`go-zero`、`go-micro`、`rpcx`、`kitex`、`go-kit` 等。(每个语言下都有一大堆)

但这种方式也存在 2 个主要问题： 
1. 如果使用了多个语言体系，那么代码的维护成本就需要 *N 。例如，一个 负载均衡 的能力，如果有 python、java、golang、nodejs 4种语言，就需要对应的开发团队维护 4 套代码。难度之大，难以想象。  这个假设，其实是建立在一些 `大型团队`、`历史包袱重` 的前提下的。 对于大多数中小团队，服务端其实也只有一个语言体系，因此不失为一个不错的方案。
2. 当平台能力不够稳定时(其实几乎很难稳定)，平台能力的升级需要业务代码同步更新，而推动业务同学进行库的升级，在稍大点的团队中是十分费心费力的。这也就是 代码耦合 带来的弊端。

#### 进程外方案

在遇到上面的问题后，自然而然的想法，就是将一些平台能力进行抽离，在单独的进程中运行。独立部署后，使用一系列进程间通信的方式提供平台能力，就解决了 “语言绑定” 和 “代码绑定” 的问题。就这样，sidecar 模式诞生了！

Sidecar 在解决一些问题的同时，自然也引入了一些问题，主要有两个：
1. 通信方式的问题。
2. 性能的问题。

性能问题，从全局来看，由于多了一层进程外处理流程，不可避免地肯定会有性能损耗。解决办法自然就是尽量降低 sidecar 本身处理的资源耗用，包括 语言选型使用更高性能的语言(如 go、c++ 等)、代码层的架构设计和实现优化、扩展点使用更高性能的实现 (例如 grpc、wasm、golang、lua 等)。

通信方式 有两个走向：
1. 业务完全透明 的流量劫持 模式。
2. 提供 http/grpc 的通信模式。

### side car 一览

目前社区中比较出彩的 sidecar 解决平台能力的方案有： [kong(kuma)](https://konghq.com/kong-mesh)、[istio(envoy)](https://github.com/istio/istio)、[traefik-mesh](https://github.com/traefik/mesh)、[nginx mesh (不开源)](https://docs.nginx.com/nginx-service-mesh)、[linkerd](https://github.com/linkerd/linkerd2)、 [dapr](https://github.com/dapr/dapr) 、[mosn](https://github.com/mosn/mosn)、[easegress](https://github.com/megaease/easegress) 、[consul](https://github.com/hashicorp/consul) 、[osm(envoy)](https://github.com/openservicemesh/osm)

从上面的项目可以看出，sidecar 大多都是从 `网关` 延伸而来的，这和 `平台能力` 的主体 `流量治理` 是分不开关系的。 基础能力是要做到 `服务发现`、`负载均衡`、`路由`、`安全`，延伸能力有  `限流熔断`、`可观测性(metrics、tracing)` 、`流量灰度`、`故障注入`、`认证授权`、`协议转换`、`管理平台` 。 

所有上面这些项目，有一个比较特殊： `dapr`，其他的基本都是 `网关`，而 dapr 被认为是一个 `应用运行时`，之所以 dapr 也被我列到这里，是因为他们有很多相似的地方，例如：`路由` 、`服务发现`、`负载均衡`、`可观测性` 等。 

现在看起来不一样的地方，例如 dapr 提供 `kvstore(state)`、`pubsub` 等，目标是提供与平台无关(不太相关) 的特定能力，例如 kvstore 就提供了 `DynamoDB` 、`redis`、`postgresql` 等实现。  从一部分 service mesh 的项目发展方向来看 (envoy、mson等)，流量代理的类型从原有的 `tcp`、`http`、`ws`、`http2`、`grpc` 等协议，扩展至 `redis`、`mongodb`、`dynamodb`、`kakfa`、`dubbo` 甚至是 自定义 协议(自有 rpc 协议) 的代理。 

有了这类中间件的代理，自然而然就会想着做些什么，比如 抽象一些通用业务能力，在代理中进行一些特定处理……， 这样，也就和 dapr 殊途同归了……

### 趋势

可以看到一个趋势，随着技术需求的逐渐固化，开发模式逐渐靠近 `更加通用`、`更加透明`、`更加傻瓜式` 的设计理念，不论是各类开发框架提供的 `开箱即用 的开发套件`，还是类似于 grpc 提供的 `rpc client server 代码生成能力`， 亦或是各类脚手架工具提供的 `http 基础代码、orm 代码 一键生成` 能力，还是 基础设施层提供的 `流量代理side car` 流量治理能力，以及还未怎么普及的 `应用运行时`(eg: dapr)。

可以认为，基础设施所追求的一个目标是： <strong>极大地 降低业务人员的心智负担， 让业务人员 回归 业务开发！</strong> 。 

### 我们可以做些什么？

为了实现这个目标，我们可以无所不用其极。例如：

- 在一定程度上，选择一套完善的开发框架，能够完成业务开发的需要 (http server、log、api、orm)；
- 选择一套部署方案，能够快速准备环境，部署应用 (gitlab、k8s 等)；
- 选择一套通用基础设施，以及对应的管理平台 (mysql、redis、kafka 等)；
- 选择一系列通用工具，例如 功能测试、接口测试、压测、低代码平台、yapi、k8s 调试工具(devspace 等)、oauth平台、账户中心、rbac 等等；

### 其他

实际上，`dapr` 的设计思想，和 `baas` 有着密不可分的联系。当我们盘点一下 baas 所提供的能力，例如 文档存储、事件通知 ，就会发现，和 dapr 提供的 state 管理、pub/sub(binding) 相对应。

### 参考资料：

[Pattern: Service Mesh](https://philcalcado.com/2017/08/03/pattern_service_mesh.html)
[Dapr 在阿里云原生的实践-阿里云开发者社区](https://developer.aliyun.com/article/785943)
[MOSN 多协议机制解析](https://mosn.io/blog/posts/multi-protocol-deep-dive/)
[Envoy 是什么? · Envoy proxy中文文档](https://www.servicemesher.com/envoy/intro/what_is_envoy.html)
