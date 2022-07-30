---
title: grpc的源码走读
abbrlink: 22_07_26_17_34_reading_grpc_codes
date: 2022-07-26 17:34
date updated: 2022-07-26 17:34
tags: ["grpc","readingcodes","xds"]
index_img: "https://static.longalong.cn/img/photo-1493246507139-91e8fad9978e"
---

## 各包的作用
### admin
1. 初始化了默认的 channelz 监控，详见 channelz
2. 对外暴露了注册监控 server 的方法

### attributes
提供了一个简单封装的 immutable kv store 。

### authz
认证拦截器，提供了 rbac。
rbac 模型，使用的是 "github.com/envoyproxy/go-control-plane/envoy/config/rbac/v3" 这个包，这是 envoy 的模块。

提供了基于文件的拦截器。
可以预见，这部分内容，和 envoy 结合会比较紧密。

### backoff
提供了失败处理的默认 Config，被全局各处引用。重试延迟配置。

### balancer
使用 注册 的方式，采用 builder 的模式。
balancer 包含两个部分，其一 balancer ， 其二 picker。 
balancer、picker、resolver 均会被 warpper 包裹，用来保证 grpc 内部新增能力。 
internal 包中的 balancer ，实现了 优雅切换 的功能，是 wapper 中的重要能力。

k8s 的 resolver 部分，可以参考 [[grpc的负载均衡]] 


### benchmark
提供了一系列用于做基准测试的程序。


### binarylog
提供了类似于 mysql 的 binlog 机制。提供了方法过滤机制 (config中)。可以把 binlog 写到一个远端地址 (sink)。

具体实现在 internal 的 binarylog 中。

### channelz
对外提供 grpc 服务状态指标，和 metrics 的目标一样，本身也是一个 service (和自己写的 grpc service 一样)，提供了几个方法：
```go
type ChannelzServer interface {
	// Gets all root channels (i.e. channels the application has directly
	// created). This does not include subchannels nor non-top level channels.
	GetTopChannels(context.Context, *GetTopChannelsRequest) (*GetTopChannelsResponse, error)
	// Gets all servers that exist in the process.
	GetServers(context.Context, *GetServersRequest) (*GetServersResponse, error)
	// Returns a single Server, or else a NOT_FOUND code.
	GetServer(context.Context, *GetServerRequest) (*GetServerResponse, error)
	// Gets all server sockets that exist in the process.
	GetServerSockets(context.Context, *GetServerSocketsRequest) (*GetServerSocketsResponse, error)
	// Returns a single Channel, or else a NOT_FOUND code.
	GetChannel(context.Context, *GetChannelRequest) (*GetChannelResponse, error)
	// Returns a single Subchannel, or else a NOT_FOUND code.
	GetSubchannel(context.Context, *GetSubchannelRequest) (*GetSubchannelResponse, error)
	// Returns a single Socket or else a NOT_FOUND code.
	GetSocket(context.Context, *GetSocketRequest) (*GetSocketResponse, error)
}
```

实际的实现在 internal 的 channelz 中。

有一个 `Identifier` 的封装，还比较有意思，可以用 数值、字符串、类型 做标识，提供了比较的方法，关键是有 `集成关系` ，可以用于标识类似于 进程关系 。


一般用于 监控 和 问题排查 和 调试环节，为了更加直观方便，官方提供了 [ui 工具](https://github.com/grpc/grpc-experiments/tree/master/gdebug)。关于 channelz 的设计初衷，可以查看 [proposal](https://github.com/grpc/proposal/blob/master/A14-channelz.md)

### cmd
提供了一个简单的 生成 grpc 代码的工具 -- protoc-gen-go-grpc  (核心代码在 google.golang.org/protobuf/compiler/protogen 中)

### codes
类似于 http 的 200、400、401 等等状态码，提供了 grpc 中的状态码。
```go
var strToCode = map[string]Code{
	`"OK"`: OK,
	`"CANCELLED"`:/* [sic] */ Canceled,
	`"UNKNOWN"`: Unknown,
	`"INVALID_ARGUMENT"`: InvalidArgument,
	`"DEADLINE_EXCEEDED"`: DeadlineExceeded,
	`"NOT_FOUND"`: NotFound,
	`"ALREADY_EXISTS"`: AlreadyExists,
	`"PERMISSION_DENIED"`: PermissionDenied,
	`"RESOURCE_EXHAUSTED"`: ResourceExhausted,
	`"FAILED_PRECONDITION"`: FailedPrecondition,
	`"ABORTED"`: Aborted,
	`"OUT_OF_RANGE"`: OutOfRange,
	`"UNIMPLEMENTED"`: Unimplemented,
	`"INTERNAL"`: Internal,
	`"UNAVAILABLE"`: Unavailable,
	`"DATA_LOSS"`: DataLoss,
	`"UNAUTHENTICATED"`: Unauthenticated,
}
```

### connectivity
连接状态的定义，详见 state 包。

### credentials
提供 grpc 的认证能力。
默认有:  tls、[xds](https://www.servicemesher.com/blog/envoy-xds-protocol/)、[sts](https://datatracker.ietf.org/doc/html/rfc8693)、oauth、[alts](https://cloud.google.com/docs/security/encryption-in-transit/application-layer-transport-security)、local、insecure、google cloud 的方式。

### encoding
序列化方法 和 压缩方法。 提供了基于 proto 的序列化方法  和  基于 gzip 的压缩方法。

### gcp
希望提供 OpenCensus 的能力，目前还在测试阶段。

### grpclog
logger 的使用为在一个包中，这个包初始化一个带 tag 的 logger 实例 (有缓存)。

其他方面设计中规中矩，使用的 github.com.golang/glog 作为底层 log 包

### health
提供客户端的健康检查接口，为了解决服务假死的情况。

### internal
各种功能的具体实现 以及 一些工具库。

### interop
一些用于测试的程序

### keepalive
保持连接的配置。

### metadata
类似于 http 的 header，一个 `map[string][]string` ，用来传递元信息，例如 requestID 等。
提供注入 ctx 和 从 ctx 提取的方法。

### peer
用来表示对端的连接信息。用来做认证的信息传输，具体信息可以查看 credentials 部分。


### profiling
性能工具，和上面的 channelz 类似，也是一个提供接口的 service，可以记录每个接口的时长等。
提供了 json 转义工具。
目前使用较少。

提供了一个 buffer.go 的文件，主要实现了一个 ring buffer，使用 atomic 实现的无锁 buffer ，值得参考 。[TODO]


### reflection
提供各 service 的反射，也是一个提供接口的 service，能够获取到每个 service 的入参与出参的格式。
一个最常规的用法是用于 [grpcurl](https://github.com/fullstorydev/grpcurl)


### resolver
用于处理 `service name 解析`  ，默认不做解析 (由更底层的 net 包做解析)，除非自己指定 resolver 方法。
关于 name 的定义详情，可以参考 [grpc 官方文档](https://github.com/grpc/grpc/blob/master/doc/naming.md)，URI 规范用的 [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986)

从代码模式上看，使用了 建造者 模式，接口为：
```go
type Builder interface {
	Build(xxx, xxx, opts BuildOptions) (Resolver, error)
	Scheme() string
}
```

resovler 从预期看，应该只需要一次调用，然后给 resolver 提供回调的能力 ( `ClientConn.UpdateState()` )。

建造者模式 相比于直接实例化，提供了 需要时再实例化 的能力。



### security
1. 提供了基于 rbac 的授权工具。
2. 提供了 tls 工具，验证证书。

具体可以参考 credentials

使用了 [cel-go](https://github.com/google/cel-go) 这个规则引擎。值得进一步看下。可以参考[这篇文章](https://cloud.tencent.com/developer/article/2025423) 。规则引擎的语言定义可以查看[官方文档](https://github.com/google/cel-spec/blob/master/doc/langdef.md)


### serviceconfig
config 的类型接口定义。不知道用作什么目的。


### stats
用于统计请求信息，类似于 tracing 和 metrics，在初始化 server 时，通过 options 注入。


### status
和 http 的状态码相似，不过支持自定义的 msg 信息，通过 error 传递。



### stress
压测脚本


### tap
xxx

### test
大量集中性单元测试


### xds
[xds的介绍](https://www.servicemesher.com/blog/envoy-xds-protocol/) 、 [envoy 官方文档](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol) 、[grpc proposal](https://github.com/grpc/proposal/blob/master/A40-csds-support.md)
这是一系列资源发现服务的接口集合。
这个包是一套庞大的 xds 工具集，包括 client 和 server 。

因为还庞大的一套体系，没细读，之后找时间和 envoy 等一起阅读。【TODO】

## 整体的一些感受

grpc  是一个很大的体系，对于 grpc 的使用也有很多的技巧，初始使用时，会觉得很简单，尤其是以后加接口做维护啥的。 但实际上，grpc 也有很多细节，甚至很多同学都不知道。
例如， grpc 有自己的一套 error code 方式、grpc 的 resolver 可以实现多种类型的 uri 、grpc 默认使用 pickfirst 的 lb 策略、grpc 有很多认证方式、grpc 可以用 admin 做调试、stats 做 metrics 监控 等等。

后续需要去看一下别人都是怎么使用 grpc 的，看看一些最佳实践。


## 对于代码走读
#readingcodes 

代码的走读有 3 个层次：
1. 理解项目的整体模型
2. 理解各个包解决了什么问题，大致怎么实现的
3. 分析一些包的设计，找其亮点，想想如果自己写，会怎么写

从产出的角度看，可以有：
1. 走读记录 (包的作用、设计好的地方)
2. 代码结构图 ( 包结构、类关系、时序 )  

如果能把 类关系图 和 时序图 画出来，那就很不错了。


---
> My best friend is the one who brings out the best in me.
> — <cite>Henry Ford</cite>