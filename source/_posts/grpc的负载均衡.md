---
title: grpc在k8s中的负载均衡问题
abbrlink: 22_07_25_11_25_the_problem_of_grpc_lb_in_k8s_using_service
date: 2022-07-25 11:25
date updated: 2022-07-25 11:25
tags: ["k8s","微服务","grpc","loadbalance","负载均衡"]
index_img: "https://static.longalong.cn/img/photo-1419242902214-272b3f66ee7a"
---

因为 grpc 是基于 http2 的通信，而 http2 对单个 endpoint 默认仅建立一条 TCP 连接，这就导致在 k8s 中，一个 service 默认仅会有一条 grpc 连接，并且，对于该 grpc 的请求，也都会集中到其中一个 pod 上。

尽管 k8s 的 service 本身有着 round robin 的负载均衡方式，但那都是建立在 “多次建立连接” 的基础上，对于已经建立连接后，基于 四层网络通信 的 TCP，是无法做到负载均衡的。

这个问题在我们当前的服务中也存在，两个服务间通过 service name 进行调用时，则会出现负载不均问题。

之前一直没有太重视这个问题，主要原因在于 每个服务都会有多个 pod ，那么多个 pod 调用 多个 pod 时，一定程度上进行了负载均衡。但是这种负载均衡很不稳定，比较容易出现连接集中到其中几个 pod 上的情况，因此，需要用其他方式解决。

经过阅读 grpc 代码，发现 grpc 本身有提供一定的机制解决负载均衡的问题，只是默认的方式在 k8s 中没有那么友好。

这其中涉及到 两个主要概念： resolver、balancer(picker)

resolver的作用，是解析一个服务地址对应多少 ip 地址，默认的方式是 passthrough，意味着透传服务地址，交由更底层的 transport 去处理。

还有一些其他的 resolver： ① DNS resolver ② Manual resolver ③ unix resolver

其中，DNS resolver 可以解析 DNS 中所挂载的 backend ips，这对于传统的基于 DNS 做负载均衡的方案比较好用，k8s 中的 statefulset 也可以大致基于这种模式。

Manual resolver 则是手动设置 backend ips，如果有自己的服务注册与服务发现机制，则用这种方式就比较方便。

Balancer 的作用，是从 resolver 解析的对应的 ip 地址池 选择特定的连接，其中核心的职能由 picker 承担，grpc 提供了大量的负载均衡策略，并且支持自定义策略，默认是 pick_first，还有一些例如：轮询、加权轮询、grpc远程lb、优先、rls(自适应？)。 甚至，grpc 提供了一些集群负载均衡的策略，例如一致性hash、CDS LB？等。

从上面分析来看，我们至少有这么三类解决方案：

1.  通过使用 grpc 本身提供的 resolver 机制 和 balancer 机制，实现基于 k8s 的服务发现机制(通过client-go 进行封装)，则能比较优雅地解决这个问题。
2.  通过在 client 端实现 conn-pool 的方式，类似于通过多次 dial 的方式创建多个连接，然后自行实现一些 负载均衡的策略，例如 round-robin 或者随机，或者 sticky 的机制等。这个方案实现起来，从当前的技术复杂度上来看是最低的。但有三个问题： ① service 本身一定要更加“随机”，如果是 sticky 类机制，则此方式失效(k8s service默认是轮询机制)。 ② 每个遇到 grpc 负载均衡问题的 client ，都要改动其 client 包，以支持获取 conn 的方式(或者进行多一层封装，github.com/shimingyah/pool 就是采用这种方式)。③ 连接是在初始化过程建立的，初始化之后通过扩容形成的新pod很难被加入到连接池中。
3. 通过 service mesh ，指定 service 类型为 grpc。



从目前来看，我认为第一种方式更优雅，对业务的侵入也更小，仅需要修改 grpc 的 dial options，以及导入一个包即可。 这个包的设计，最好将 服务发现 独立出来，专门用于 k8s 中的服务发现与动态监听。

有些同学会认为，负载均衡这种事，应该交给网关，所以上 service mesh ，业务不要关心。关于这个问题，我的看法是 :  降低业务同学的心智负担，从总体上看是对的，但还是得根据公司实际情况是否值得。相关观点可以查看 [[服务化演进的一些问题探讨]] 。

后面通过看一些框架的代码，发现 go-zero 有方案 1 的实现，可以参考:  [zrpc/resolver](https://github.com/zeromicro/go-zero/tree/master/zrpc/resolver)


可以参考：
- [Kubernetes中gRPC Load Balancing分析和解决](https://zhuanlan.zhihu.com/p/258326212)
- [负载均衡算法及手段](https://segmentfault.com/a/1190000004492447)





---
> Whenever you find yourself on the side of the majority, it is time to pause and reflect.
> — <cite>Mark Twain</cite>