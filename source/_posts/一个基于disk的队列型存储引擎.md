---
title: 一个基于disk的队列型存储引擎
abbrlink: 22_07_28_00_40_a_queue_storage_based_on_disk
date: 2022-07-28 00:39
date updated: 2022-07-28 00:39
index_img: "https://static.longalong.cn/img/photo-1421930866250-aa0594cea05c"
---


我们有一种场景，将用户在画布上的操作保存下来。
`操作` 的模型已经使用特定的序列化方法变成二进制。
操作有特定的顺序。
对每个操作，都需要去校验操作的合法性。
合法操作才会被确认，不合法的，会被忽略(一种策略，也可以是删除)。
获取时，需要按 ① 特定字段  ② offset ③ ID ④ 时间 获取，且有范围获取。
数据大小，大多为 100B ，但存在 50MB 的可能。

这和 writeahead log 类似。
其他客户端，类似于订阅 binlog。


从技术上看这个问题，有以下思路：
1. 这整体是一个队列
2. 同时兼容 kv 的索引
3. 需要持久化

队列的问题域：
1. 队列大小
	1. 轮转
	2. 压缩

存储的问题域：
1. 存储介质
	1. 磁盘存储
	2. 数据库存储
2. 序列化问题
3. 缓存问题
	1. 内存缓存
	2. 本地缓存

索引的问题域：
1. 索引建立
2. 索引更新
3. 索引重构
4. 全量索引与稀疏索引
5. 索引的存储形态


其他问题域：
1. 锁问题
2. 迁移问题
3. schema 变更问题
5. 事务支持


业务的时序图应当为：
```

```

面向接口编程，识别 entity ，识别关系。


---
> It is no use saying, 'We are doing our best.' You have got to succeed in doing what is necessary.
> — <cite>Winston Churchill</cite>