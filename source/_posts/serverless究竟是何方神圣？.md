---
title: serverless_究竟是何方神圣？
abbrlink: 22_07_11_what_is_serverless
date: 2022-07-11 21:24
date updated: 2022-07-12 00:30
index_img: https://static.longalong.cn/img/photo-1421930866250-aa0594cea05c
tags: ["serverless", "faas", "baas", "k8s", "cloud native"]
---

## 什么是 serverless

顾名思义，`serverless` 就是 `server-less`，也就是 `别话时间去搞服务器` => `把精力全都放到业务开发上` !

在传统的开发流程中，一个团队的标准配置是： 前端工程师 * x + 后端工程师 * y + 运维工程师 * z 。 前端写交互，后端写数据逻辑与存储，运维就搞服务部署、灰度、日志、监控等等。每个岗位各司其职，看起来十分完美。

但有时候也没有那么完美，人越多、职责分的越细，岗位间的鸿沟就越大，沟通的成本在组织内就会急剧增加。 通常的表现就是 会越来越多、参会的人也越拉越多，有时候可能一个简单的 `上新服务进行调试` 的工作，都需要大动干戈搞十来个人拉会各种同步和对齐。

这种时候我们可能就会想： 能不能不要这么多麻烦的服务器的问题？由一个统一的平台去解决 网关配置、服务发现、服务调用、日志、告警、数据库、中间件、CICD、负载均衡、动态扩缩容 等等……

实际上，不论是传统的各种 cmdb，还是各种微服务框架，还是各种服务引擎，都是在为了解决上面列出的这个问题，只是他们选择的方案不同而已。 其中 serverless，是最晚出现的一种方案，是在 微服务架构之后出现的另一种架构风格。

有一种论调是 serverless = faas + baas。其中 faas 是主计算的，而 baas 是主存储的。实际上我们对服务器的需求本质上就这两类： 计算 + 存储。

而泛 IT 领域内，大家常说起 serverless 的时候，总喜欢把 AWS 的 lambda 计算作为例子，或者把 阿里云 的 函数计算 作为例子。容易让人误以为 serverless 就是 `函数计算` 。

而我认为 serverless ，除了包括 机器视角下 的 faas 以及 baas 外，还包括 开发流 视角下的 serverless 开发工具链 + 管理平台 + 编排系统 + 监控系统。 这是站在 serverless 的终极目标上得出的结论。

云服务上更关心 机器视角，例如 baas 要包含哪些产品？kv？文档存储？对象存储？table存储？ 例如 faas 有哪些形式的延伸？微服务场景？任务触发场景？

开发者更关心 开发流视角，例如 如何部署一段程序？如何管理一段程序？如何监控程序运行？

## serverless 解决了什么问题？
1. 开发和部署工具链
2. 弹性扩缩容 (按量付费)

## 使用 serverless 的场景是什么？

1. 异步 (事件触发)
2. 无状态 (少依赖)
3. 突发性

## serverless 的技术点有哪些？

1. 如何触发 serverless？(events)
2. 如何解决弹性扩缩容？
   1. 基于 kubernetes
3. 如何解决路由绑定？(负载均衡)
4. 如何解决快速启动？
5. 如何解决程序运行？(build 过程)
6. 如何解决服务编排？

## serverless 比较难搞定什么？

1. 状态保持 (本地缓存、长连接)

2. 事务

3. 编排

4. 冷启动

5. 黑盒排查问题

6. 服务商绑定

## 阿里云的几款 serverless 产品的异同

1. FC
2. SAE
3. MSE
4. ASK

当我们纵眼观察 阿里云 提供了几类和 serverless 有关的产品时，往往容易犯迷糊。
FC 是函数计算，主要目的是提供计算能力，运行的资源粒度可以非常小 (128MB * 0.08 C)，可以运行任意你想要的程序。在使用场景上，类似于 `任务` 的概念。(当然你也可以把他用于 http server)

SAE 是 serverless 应用引擎，提供的能力和 FC 类似，都是计算能力。在场景上，类似于 `service` 的概念，例如启动一个 auth 服务。 相比于传统的自己部署一个服务，SAE 提供了 网关、弹性伸缩、监控 等能力。(其实，MSE 有逐渐替代 SAE 的倾向，毕竟他们的重合度太高了)

MSE 是 微服务引擎，提供的是 服务治理 的能力。是 注册/配置中心、网关、分布式事务、流量治理、开发测试 的集合体。实际就是把原来 阿里云 提供的各类单个的产品，在 微服务 的应用场景下进行了组合。

ASK 是 弹性 k8s 集群，也就是 k8s 集群的按量付费版本，提供的是 k8s 基础设施。

## 我们对 serverless 抱有什么样的期待？

1. 完全无运维 
	- 一套完善的开发和部署平台
2. 友好一致的开发体验
	- 开发者无需关注除 业务需求 之外的一切 (比如 k8s、注册中心、服务发现、CICD 等等)
3. 省钱
	- 按需付费，不用为每个不怎么使用的应用都花着钱



## 一些常见的 serverless 应用
- [ ] 举一些具体的例子

1. 音视频行业的转码需求
2. 设计、图形等领域相关的渲染需求
3. 推荐系统相关的机器学习需求

分为 2 类：

1. 微服务场景
2. 弹性任务场景

## serverless 平台有哪些？
- [ ] 对比各家的产品，看看他们都在解决什么问题？

1. openfaas
2. knative
3. kubeless
4. 阿里云相关产品
5. 腾讯云相关产品
6. AWS 相关产品


## 我会怎么选？
- [ ] 列举一些场景，分别在这些场景下我会如何决策？

如果我是团队 TL，我会如何选择？



## 可以参考的文档

1. [阿里云 serverless 工作流](https://www.aliyun.com/product/aliware/fnf)
2. [阿里云 serverless 应用引擎](https://help.aliyun.com/document_detail/97792.html)
3. [阿里云 FC 函数计算](https://www.aliyun.com/product/fc)
4. [阿里云 ASK 容器服务](https://www.aliyun.com/product/cs/ask)
5. [腾讯云函数](https://cloud.tencent.com/document/product/583/9199)
6. [腾讯云 serverless 应用中心](https://cloud.tencent.com/document/product/1154)
7. [腾讯云 弹性微服务](https://cloud.tencent.com/document/product/1371)
8. [firebase](https://firebase.google.com/)
---

> Through meditation and by giving full attention to one thing at a time, we can learn to direct attention where we choose.
> — <cite>Eknath Easwaran</cite>
