---
title: FastAPI 中线程、进程、协程一般怎么用？
date: 2026-10-25 14:52:01
categories:
  - Agent开发求职
tags:
  - FastAPI
  - Python
  - 并发编程
  - Agent
  - 面试八股
---

## 一、面试回答：三者配合使用

FastAPI 并不是在线程、进程、协程中三选一，而是在不同层面配合使用：

- **协程处理异步请求**：`async def` 接口在事件循环中执行，适合调用支持异步的模型 API、数据库和搜索服务。
- **线程池兼容同步代码**：普通 `def` 接口由框架放到线程池执行，适合包含阻塞 I/O 的同步 SDK。
- **多进程扩展服务**：部署时可以启动多个 worker，利用多个 CPU 核心，每个 worker 分别处理请求。

对于 Agent 服务，常见做法是：**异步接口处理网络调用，线程池兼容同步工具，根据负载配置多个服务进程。**

但“写成异步函数”不代表内部代码自动异步。真正需要关注的是：**耗时操作会不会阻塞事件循环，以及底层库是否支持异步。**

<!-- more -->

## 二、关键机制：代码究竟在哪里执行？

以 Uvicorn 的常规部署为例，每个 worker 是一个独立进程，里面运行事件循环，并可通过线程池处理同步操作。

| 写法或配置 | 执行方式 | 常见用途 |
|---|---|---|
| `async def` 路由 | 在事件循环线程中执行 | 异步模型请求、异步数据库 |
| `def` 路由 | 框架在线程池中执行 | 同步网络请求、同步 SDK |
| 普通函数被直接调用 | 在调用它的线程中执行 | 取决于调用位置 |
| 显式线程池调用 | 把指定函数交给线程执行 | 异步接口中调用同步工具 |
| 多个 worker | 多个独立服务进程 | 扩展吞吐、利用多核 |

**最容易答错的是：普通 `def` 函数不一定在线程池里。**

FastAPI 会把自己调用的同步路由函数、同步依赖函数放到线程池。但你在异步接口中直接调用的普通工具函数，不会自动获得这个待遇。

例如，在 `async def` 接口中直接执行 `requests.get()`、`time.sleep()` 或长时间计算，会占住当前事件循环线程，让这个 worker 中其他需要事件循环推进的请求也受到影响。

**为什么异步能同时处理多个请求？**

一个请求执行到需要等待的异步 I/O 时，可以挂起，事件循环再推进其他就绪任务。因此，等待模型响应时，服务仍能处理其他请求。

但 `await` 不是“开启一个线程”，也不保证每次都会切换任务；等待对象已经就绪时，可能直接继续执行。

**为什么线程池不能解决所有问题？**

线程池可以把阻塞调用移出事件循环，但线程资源有限。同步调用过多时，后续任务仍需排队。

在常见的启用 GIL 的 CPython 中，线程池通常也不能加速纯 Python 的 CPU 密集型计算。大量重计算可考虑进程池或独立计算服务，但要评估数据传输和内存成本。

## 三、Agent 接口中怎么选？

先看调用的客户端，而不是只看任务名称：

- 模型或检索客户端支持 `await`：使用异步接口，直接等待异步调用。
- 工具 SDK 只有同步方法：整个接口都是同步逻辑时，可以写普通 `def`；需要混合异步调用时，显式把同步工具放到线程池。
- 本地存在大量计算：单独评估计算执行方式，不要直接塞进事件循环。
- 单进程容量不够：结合 CPU、内存和压测结果增加 worker，或扩展服务实例。

下面用等待模拟工具调用，展示三种接口写法。示例中的等待不是实际模型请求。

```python
import asyncio
import time

from fastapi import FastAPI
from starlette.concurrency import run_in_threadpool

app = FastAPI()


def sync_tool():
    time.sleep(1)  # 模拟阻塞式 I/O
    return {"result": "工具调用完成"}


@app.get("/sync")
def sync_endpoint():
    # 同步路由由框架放在线程池执行
    return sync_tool()


@app.get("/async")
async def async_endpoint():
    await asyncio.sleep(1)  # 模拟异步 I/O
    return {"result": "异步调用完成"}


@app.get("/mixed")
async def mixed_endpoint():
    # 异步路由中，显式将同步工具移到线程池
    return await run_in_threadpool(sync_tool)
```

保存为 `main.py`，安装 `fastapi` 和 `uvicorn` 后，可使用 `uvicorn main:app` 启动。

重点看 `/mixed`：如果改成直接 `return sync_tool()`，同步函数就会在事件循环线程中运行，里面的 `time.sleep()` 也会阻塞它。

线程池调用还需要确认 SDK 的线程安全性，并在底层客户端设置超时。把调用移到线程池，不会自动解决超时、重试或 API 限流问题。

此外，一个请求中连续等待两个工具，通常仍然是先后执行。**只有相互独立的工具调用，才适合组织成并发任务。** FastAPI 能并发处理请求，不代表它会自动并发你的业务步骤。

## 四、高频追问：这三个区别要说清

**Q1：FastAPI 默认是多进程吗？**

不能只看 FastAPI 框架，要看服务器的启动配置。使用 Uvicorn 时，未配置多个 worker 的常规启动是单 worker；可以通过 `uvicorn main:app --workers 4` 启动四个 worker。

多个 worker 可以并行处理不同请求，但不会自动把某个请求内部的一段计算拆到多个进程执行。

**Q2：多个 worker 共享全局变量吗？**

默认不共享普通 Python 全局变量。

例如，用全局字典保存 Agent 会话，某个 worker 写入后，另一个 worker 不会自动看到。需要跨进程访问的会话状态，应放到数据库、Redis 等共享存储中。

每个 worker 也可能分别加载模型、创建连接池，因此不能只看 CPU 核数，还要计算总内存和连接数量。

**Q3：是不是所有接口都应该写成 `async def`？**

不是。选择要与实际调用方式匹配：

- 支持异步的 I/O，使用 `async def`。
- 主要是同步阻塞 I/O，普通 `def` 是合理选择。
- 异步与同步混用时，显式处理同步阻塞部分。
- 简短的非阻塞逻辑也可以直接放在异步接口中，没有必要为每一步创建线程。

复习时，重点解释清楚：**协程负责重叠等待，线程池承接同步阻塞操作，多进程扩展服务处理能力。**

**参考资料**：[FastAPI 异步与同步执行规则](https://fastapi.tiangolo.com/async/)、[多 worker 部署](https://fastapi.tiangolo.com/deployment/server-workers/)、[进程、内存与部署概念](https://fastapi.tiangolo.com/deployment/concepts/)。
