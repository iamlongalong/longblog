
---
title: grpc的设计分析
abbrlink: 22_07_25_11_21_learning_the_design_of_grpc
date: 2022-07-25 11:21
date updated: 2022-07-25 11:21
tags: ["grpc","网络协议","rpc","http2"]
index_img: "https://static.longalong.cn/img/photo-1484318571209-661cf29a69c3"
---



1.  Grpc 的场景是什么？为什么有价值？
2.  stream 的应用场景是什么？和 unary 有啥区别？
3.  grpc 使用多通道的价值有多大？
4.  为什么有些语言下会有 异步/同步 之分？
    1.  网络的异步本质
5.  grpc 在使用 http2 传输时，究竟传输了些什么？
6.  如何使用其他序列化方式？例如 json？
7.  和客户端的交互中使用 grpc 的方式 以及 价值？
8.  在 grpc 中，什么粒度被称为一个 service ？
9.  grpc 设计上的可借鉴点？
10.  Pb 的价值有多大？
11.  一个 rpc 框架，要考虑些什么问题？
    1.  服务治理的多层次关系


gRPC 值得分析的点：
1. 基于 proto 文件，生成基础代码
2. 提供多语言插件，使生态增长
3. 序列化方式，支持 pb 和 json
4. grpc-gateway 和 grpc-web


grpc 的源码走读，可以参考 [[grpc的源码走读]]


关于 grpc 的负载均衡，可以参考 [[grpc的负载均衡]]


可以参考的文档:
- [知乎 gRPC 简介](https://zhuanlan.zhihu.com/p/411315625)
-  [gRPC 基础概念详解](https://zhuanlan.zhihu.com/p/389328756)
-  [了解 gRPC 一篇就够了 - 开发者头条](https://toutiao.io/posts/9bek5r/preview)
-  [gRPC系列(四) 框架如何赋能分布式系统](https://zhuanlan.zhihu.com/p/344914169)
-  [基于 gRPC 的服务注册与发现和负载均衡的原理与实战](https://zhuanlan.zhihu.com/p/332863487)




---
> Opportunity does not knock, it presents itself when you beat down the door.
> — <cite>Kyle Chandler</cite>