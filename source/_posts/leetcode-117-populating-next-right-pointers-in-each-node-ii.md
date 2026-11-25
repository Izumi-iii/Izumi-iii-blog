---
title: "LeetCode 117：填充每个节点的下一个右侧节点指针 II｜二叉树层序遍历（BFS）"
date: 2026-11-25 15:06:47
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 树
  - 广度优先搜索
  - 二叉树
  - Python
---

## 题目与关键约束

- **平台与题号**：LeetCode [117. 填充每个节点的下一个右侧节点指针 II](https://leetcode.cn/problems/populating-next-right-pointers-in-each-node-ii/)
- **输入输出**：给定一个普通二叉树的根节点 `root`，每个节点除了 `left` 和 `right` 外，还多了一个 `next` 指针。请填充每个节点的 `next` 指针，使其指向同一层的下一个右侧节点；如果找不到下一个右侧节点，则保留为 `None`（初始状态下所有 `next` 均为 `None`）。
- **关键约束**：
  - 树中节点总数在 `[0, 6000]` 范围内（需处理空树 `root is None`）
  - 节点值范围 `[-100, 100]`
  - **普通二叉树形态**：与 116 题（完美二叉树）不同，本题树形不规则，节点可能缺少左孩子或右孩子

<!-- more -->

## 思路与推导

### 1. 遍历方式选择：为什么用 BFS（层序遍历）？

前面练习的二叉树题目（最大深度、相同树、路径总和）均采用深度优先搜索（DFS），沿着一条分支一探到底；而本题要求在**同一水平层级**内将节点从左向右串成链表，因此最直接契合直觉的是**广度优先搜索（BFS / 层序遍历）**。

### 2. 队列与“层级快照”的核心技巧

我们使用双端队列 `collections.deque`（先进先出 FIFO）来管理待处理的节点：
- **核心技巧（层级隔离）**：在每轮 `while q:` 循环开始时，先记录当前队列的长度 `size = len(q)`。这个 `size` 精确锁定了**当前这一层的总节点数**。
- **内层三步流水线**：紧接着通过 `for i in range(size):` 精准消费完这一层的 `size` 个节点（保证不会把刚入队的下一层孩子混入本层）：
  1. **出队**：`node = q.popleft()` 取出当前节点；
  2. **连线**：只要当前节点不是本层的最后一个（即 `i < size - 1`），此时稳居队头的 `q[0]` 就是它在同一层的右邻居，直接连线 `node.next = q[0]`；若是本层最后一个（`i == size - 1`），则无需操作，默认保留 `None`；
  3. **入队**：按照“先左后右”的顺序，将非空的 `node.left` 和 `node.right` 放入队尾，留待下一轮处理。

## 代码与复杂度

```python
from collections import deque

"""
# Definition for a Node.
class Node:
    def __init__(self, val: int = 0, left: 'Node' = None, right: 'Node' = None, next: 'Node' = None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next
"""

class Solution:
    def connect(self, root: 'Node') -> 'Node':
        if not root:
            return root

        q = deque([root])

        while q:
            # 锁定当前层的节点总数，将其与下一层入队节点隔离
            size = len(q)

            for i in range(size):
                # 1. 请出队头节点
                node = q.popleft()

                # 2. 若非本层最后一个节点，将其 next 指向紧随其后的队头节点
                if i < size - 1:
                    node.next = q[0]

                # 3. 将非空子节点依次加入队尾
                if node.left is not None:
                    q.append(node.left)
                if node.right is not None:
                    q.append(node.right)

        return root
```

- **时间复杂度**：`O(N)`，其中 `N` 为二叉树的节点总数。每个节点入队一次、出队一次，`deque.popleft()` 和 `append()` 均为 `O(1)` 操作。
- **空间复杂度**：`O(N)`。队列中最多同时存放树中某一层的最大节点数，在最坏情况下空间占用为 `O(N)`。
  *(注：若在面试中遇到追问 `O(1)` 额外空间解法，可利用当前层已连好的 `next` 链表指针 + 虚拟头节点 `dummy` 横向穿针引线构建下一层)*。

## 本次复盘

1. **遍历范式的初次建立**：
   - 原状态：面对“按层横向连接”的问题缺乏直觉，不清楚用什么结构能一层层扫过去。
   - 认知重构：掌握了层序遍历（BFS）的通用骨架：`deque` + `while q:` + `size = len(q)` 分层快照，这是所有按层处理树题目的标准解法模板。
2. **内层循环流程拆解**：
   - 搭出外层 `while q:` 与 `size` 后，一度对循环体内部流程不清晰。归纳为“出队 -> 连线 -> 子节点入队”三步固定流水线后逻辑豁然开朗。
3. **遗漏 `popleft()` 导致变量未定义与死循环**：
   - 原想法：在 `for i in range(size):` 中直接写了 `node.next = q[0]` 与子节点入队，漏掉了首行的 `node = q.popleft()`。
   - 原因：没有在循环体首部弹出当前节点，既导致 `node` 未定义报错，又会使队列永远无法被消费清空而陷入死循环。
   - 修正：在 `for` 循环首行补全 `node = q.popleft()`，确保 `q[0]` 顺位指向右侧邻居。

**下次自检问题**：编写 BFS 层序遍历模板时，是否在 `for i in range(size):` 的第一行就显式执行了 `popleft()` 出队操作？连接 `q[0]` 前是否确认了 `i < size - 1` 边界？
