---
title: groupcache 源码阅读记录
abbrlink: 22_07_16_19_47
date: 2022-07-16 19:47
date updated: 2022-07-16 19:47
tags: ["缓存","cache","groupcache","readingcodes"]
index_img: "https://static.longalong.cn/img/photo-1470115636492-6d2b56f9146d"
---
## 背景

“缓存” 是一个 非常、非常、非常 通用的模块，是提升 程序性能/系统性能 的极佳方式之一，缓存的模块有非常多的开源方案。

本地缓存可以使用 gcache、goframe中也有一个gcache，自己要实现一个简单的 LRU 的缓存也不难。

分布式缓存中，最常用的是 redis，几乎通吃，以前也有一些团队使用 memcache，现在几乎被 redis 替代。

内存中的缓存还可以看下 godis 这个项目，golang 的 redis 实现。

而 groupcache ，作为内存中的 分布式缓存，实现非常简洁，很有参考价值。值得一提的是，groupcache 的作者就是 memcache 的作者。

## 可参考的方面

### Pb 和 httpv2 提升性能

常规我们接触 pb，都是直接使用 grpc 生成代码，使用 grpc 的框架提供 rpc 服务，但是在 groupcache 中，作者直接把 pb 拿出来使用，并且结合 httpv2 的连接复用，也同样能够提供高性能，一定程度上达到了合 grpc 一样的能力。

### Singleflight 去除重复请求

通用的解决重复请求的方案，常用于解决缓存穿透问题。

### 87行代码的 lru 策略

一个双向链表 + 一个 hashmap，前者用来做 lru，后者用来做缓存。

这个双向链表是由 golang 提供的，初次之外，golang官方库还提供了 ring 和 heap 两种数据结构。

### 48行代码的一致性hash

有多个 hash slot，无删除 slot 操作。

使用的 []int 的方式做的 slot，这种方式在查询时的时间复杂度是 Ologn，这种方式和 redis client 的 slot 实现方式不一样，redis 用了更多的空间，但得到的是 O1 的查询复杂度。

## 一些特点

1.  会做本地缓存(hot cache)，且无更新机制
2.  有 load 机制，本地缓存没有 且 未能从 peer 获取时，进行 load
3.  有 evicted 机制，可以设置回调

整体来看，和 gcache 这类本地缓存差别不大，加的 peers 可以帮助减少 load 机制的使用，对于 load 操作很重的缓存比较有利。但本地的 cache 无法主动更新的特点可能导致缓存不一致问题。

生产使用的场景不太确定，可能适用于数据一致性不太重要、load过程很繁重的情况。

从开发角度来看，这个项目有一些可参考性，例如 48行代码实现一致性hash、87行代码实现 lru、singleflight解决缓存穿透、直接使用 pb 做为序列化方式提升性能、服务间的http使用 http2 提升性能。

## TODO

- [ ] 可以再看一下 go-redis 中的 hash slot 保持方法，以及 mongos 如何保证 路由到正确节点。






---
> They must often change, who would be constant in happiness or wisdom.
> — <cite>Confucius</cite>