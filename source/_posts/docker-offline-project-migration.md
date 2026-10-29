---
title: "Docker 项目如何从有网迁移到无网环境？常用命令与边界"
date: 2026-10-29 22:46:48
categories:
  - Agent开发求职
tags:
  - Docker
  - 离线部署
  - 工程实践
  - Agent
  - 面试八股
---

## 一、面试回答：迁移的是完整运行依赖

回答“使用过 Docker 吗”要先说明真实实践范围：只写过 Dockerfile、在本地启动过服务，与完成过无网环境迁移，是不同程度的经验。下面介绍操作方案，不把它写成已完成的个人项目经历。

从有网迁移到无网环境，我会先确认目标机器的系统、CPU 架构、Docker/Compose 版本；在有网环境构建应用镜像、准备全部依赖镜像，再用 `docker save` 导出，在目标端用 `docker load` 导入，最后用 Compose 禁止拉取和构建后启动。

**镜像之外，还要迁移配置、数据库与向量库数据、模型权重、分词器和证书等运行资源。** 有容器能启动，不等于模型可用或离线链路已经跑通。

<!-- more -->

## 二、迁移顺序与常用命令

下面以 Linux amd64 目标机器为例，命令按 Bash 写法展示，当前未实际执行。假设已有应用 Dockerfile；离线 Compose 文件只引用预构建镜像，并配置好端口、挂载和环境变量。`YOUR_TESTED_TAG` 必须换成实际验证过的 Qdrant 标签。

```bash
# 有网机器：构建应用并准备依赖镜像
docker version
docker compose version
docker build --platform linux/amd64 -t my-agent:1.0.0 .
docker pull --platform linux/amd64 qdrant/qdrant:YOUR_TESTED_TAG
docker image ls
docker save -o agent-images.tar my-agent:1.0.0 qdrant/qdrant:YOUR_TESTED_TAG
sha256sum agent-images.tar > agent-images.tar.sha256

# 将镜像包、校验文件、离线配置和数据备份拷到目标机器
# 无网机器：校验、导入、检查配置并启动
sha256sum -c agent-images.tar.sha256
docker load -i agent-images.tar
docker image ls
docker compose -f compose.offline.yaml config --quiet
docker compose -f compose.offline.yaml up -d --pull never --no-build
docker compose -f compose.offline.yaml ps
docker compose -f compose.offline.yaml logs --tail 100
# 排查时进入 api 服务；极简镜像可能没有 sh
docker compose -f compose.offline.yaml exec api sh
```

如果还有 PostgreSQL、Redis、反向代理或本地推理服务，它们的实际镜像也必须导出。Compose 中的镜像名称和标签要与导入内容一致，不能依赖不存在的 `latest`。

跨架构构建可能还需要 Buildx 和仿真环境。镜像架构匹配只是前提，不能保证 GPU 驱动或原生库兼容；需要在目标类型机器上验证。

## 三、最容易漏掉的四类东西

**1. 数据不在镜像里。** `docker save` 保存镜像，不包含挂载卷中的业务数据。数据库优先按官方机制做一致性备份与恢复；直接复制运行中的数据目录可能得到不一致结果。向量库还要确认快照、版本兼容和恢复方法。

**2. 模型可能在首次调用时下载。** embedding、reranker、生成模型、tokenizer 和 OCR 资源，都要提前缓存或明确放入挂载目录。启动脚本不能再执行在线 `pip install`、下载模型或拉远程配置。

**3. 配置与密钥是另一份交付物。** 准备环境变量、证书、代理与服务地址，离线端指向本地推理和存储。密钥不应硬编码进镜像或提交到公开仓库；Compose 配置命令也可能展开敏感环境变量，因此示例只做静默校验。

**4. 宿主机基础条件不能用一个镜像包替代。** 目标端需要可用的 Docker Engine、Compose，以及 GPU 场景相应的驱动和容器运行支持。Linux 容器镜像也不是原生 Windows 容器镜像。

迁移完成后至少做一次断网验证：健康检查、文档写入与检索、模型真实回答、流式中断、重启后数据保留。记录应用和依赖镜像版本、架构、文件校验值与数据备份版本，保留可回滚版本。

## 四、三个高频追问

**Q1：为什么用 save/load，不用 export/import？**

`save/load` 面向镜像及其层、标签等信息，更适合镜像迁移；`export/import` 主要面向容器文件系统，不等于完整保留原镜像的层与运行配置，也不包含挂载卷数据。不能把两组命令当成等价备份。

**Q2：为什么 load 后还是启动失败？**

先看容器日志、镜像标签与架构，再看启动时是否仍需下载、配置是否指向公网、模型或卷路径是否缺失，以及目标驱动是否兼容。`--pull never --no-build` 只约束 Compose 拉取和构建，不能阻止应用自己访问网络。

**Q3：无网环境还可以调用云端模型吗？**

完全隔离且没有可达网关时不行，需要本地推理服务或被允许的内部模型接口。把云端 SDK 装进容器不会让云端模型变成离线可用。最终验收应验证实际生成，而不只是 HTTP 健康接口。

**参考资料**：[docker image save](https://docs.docker.com/reference/cli/docker/image/save/)、[docker image load](https://docs.docker.com/reference/cli/docker/image/load/)、[Compose 启动参数](https://docs.docker.com/reference/cli/docker/compose/up/)、[卷备份与迁移](https://docs.docker.com/engine/storage/volumes/)。
