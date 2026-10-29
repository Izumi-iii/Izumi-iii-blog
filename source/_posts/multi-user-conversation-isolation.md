---
title: "多用户 Agent 服务如何避免对话串数据？"
date: 2026-10-29 22:46:48
categories:
  - Agent开发求职
tags:
  - 多租户
  - 权限控制
  - 对话管理
  - Agent
  - 面试八股
---

## 一、面试回答：身份、数据与运行状态一起隔离

避免多用户串数据，不能只给每个请求分配一个 conversation_id。我会先从可信认证结果中取得用户与租户身份，对每次会话操作校验对象权限，再把相同边界贯穿数据库、缓存、检索、流式输出和后台任务。

**conversation_id 用于定位会话，授权决定谁能访问它。** 即使 ID 是 UUID，也必须检查所属关系。前端提交的 user_id、tenant_id 不能直接作为可信身份。

同时避免使用保存所有用户消息的全局列表或共享可变 memory。可复用的是连接池等无会话状态资源；每个请求的消息、工具结果与生成句柄，应绑定当前用户、会话和 generation_id。

<!-- more -->

## 二、数据链路：所有入口使用同一权限边界

**数据库。** 会话记录包含 tenant_id、owner_id 或明确的成员授权，消息通过会话关联。查询、写入、删除、导出、摘要更新和取消生成都必须鉴权，不能只给历史读取接口补一个判断。

下面是采用“每个会话只有一个拥有者”模型的 SQL 示意，参数来自已验证身份和请求中的会话 ID，使用参数化查询：

```sql
SELECT m.id, m.role, m.content
FROM messages AS m
JOIN conversations AS c ON c.id = m.conversation_id
WHERE c.id = :conversation_id
  AND c.tenant_id = :authenticated_tenant_id
  AND c.owner_id = :authenticated_user_id
ORDER BY m.sequence_no;
```

这是读取示例，不是完整授权系统。写入也必须在正确的事务或授权约束下校验；共享会话应检查成员角色和具体操作权限，而不是强行使用单拥有者规则。

**缓存。** 状态键应包含必要范围，例如 `tenant:user:conversation:summary_version`。答案缓存还要考虑知识库版本、权限范围和模型配置；只按问题文本缓存，可能把私有答案返回给另一个人。

**向量检索。** 文档写入时保存可信的租户和 ACL 元数据，查询时由后端强制添加过滤。关键词与向量两路都要带过滤，结果在发给重排器或模型之前就应处于授权范围；不能先发送给模型，再指望它不泄露。

**任务和 SSE。** 队列消息携带身份与会话范围，执行前验证当前权限；每次生成有独立 generation_id。订阅输出、查看状态和取消任务都要核验归属，不能把所有用户结果广播到同一个通道。

## 三、并发运行：不只防越权，也要防状态污染

串数据还可能来自正常用户的并发请求，而不是攻击。

例如，全局 Agent 对象中保存 `messages`，请求 A 加入自己的消息后挂起，请求 B 又加入另一组消息，A 恢复时就可能读到 B 的内容。因此，共享客户端与共享聊天状态必须分开；框架 memory 或 checkpointer 的 thread_id 也需要可信映射和访问校验。

同一个用户也可能同时开两个会话。缓存仅按 user_id 分区还不够，必须带 conversation_id；同一会话发起两次生成，则需要排队、版本校验或显式分支策略，避免答案对应错轮次。

多 worker 下，全局字典既无法跨进程一致共享，也不能作为完整状态库。持久化状态放到合适存储，必要时使用事务、唯一约束或版本号控制顺序，流式事件带 generation_id 便于客户端丢弃过期结果。

日志和追踪也要分区访问、避免记录不必要的原始敏感内容。能在数据库中正确隔离，不代表运维后台、导出文件和观测面板已经隔离。

一个具体例子：A 与 B 在同一租户内各有私有会话。即使 tenant_id 相同，B 也不能用 A 的 conversation_id 读取消息。因此租户过滤解决组织边界，会话权限还要解决组织内部边界。

## 四、三个高频追问

**Q1：每人一个向量集合就安全吗？**

不自动安全。服务端如果允许用户指定别人的集合名，仍然可能越权。独立集合、分片或数据库能提供不同隔离方式，但都需要正确授权，且大量集合有资源成本。

**Q2：UUID 很难猜，还需要鉴权吗？**

需要。ID 可能通过 URL、日志、分享链接或其他接口泄露。不可预测标识只是辅助措施，不能代替对目标对象和操作的权限判断。

**Q3：怎样验证没有串数据？**

创建两个用户、两个租户及多会话，交换 conversation_id、generation_id、文档 ID，覆盖读写、导出、取消、缓存命中和 SSE 重连。再并发发送请求，检查同一会话的顺序和不同会话的隔离；不要只测试前端隐藏按钮。

复习时按链路回答：**认证取得身份 → 对象授权 → 存储和缓存分区 → 检索强制过滤 → 任务与流式输出校验 → 越权和并发测试。**

**参考资料**：[OWASP 对象级授权风险](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/)、[OWASP API 授权测试](https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html)、[Qdrant 多租户过滤](https://qdrant.tech/documentation/manage-data/multitenancy/)。
