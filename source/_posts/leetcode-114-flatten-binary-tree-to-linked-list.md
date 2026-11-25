---
title: "LeetCode 114：二叉树展开为链表｜前序收集重连与原地剪接思路"
date: 2026-11-25 15:40:37
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 树
  - 链表
  - 深度优先搜索
  - 二叉树
  - Python
---

## 题目与关键约束

- **平台与题号**：LeetCode [114. 二叉树展开为链表](https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/)
- **输入输出**：给你二叉树的根节点 `root`，请原地将其展开为一个单链表：
  - 展开后的单链表仍使用 `TreeNode` 结构，其中 `right` 子指针指向链表中的下一个节点，而 `left` 子指针必须始终置为 `None`；
  - 展开后节点的排列顺序必须与二叉树的**前序遍历（根 → 左 → 右）**顺序完全一致。
- **关键约束**：
  - 树中节点数在范围 `[0, 2000]` 内（需处理空树情况）；
  - 节点值范围 `[-100, 100]`；
  - **原地修改**：函数返回 `None`，直接在原树上调整指针；
  - **进阶要求**：是否可以不使用额外存储空间，做到 `O(1)` 空间复杂度原地展开？

<!-- more -->

## 思路与推导

### 1. 基础直观解法：前序遍历收集 + 线性重连

面对指针交错的树形重构题，最稳妥的破局思路是**先用列表固定顺序，再统一改写指针**：
1. **前序递归收集**：严格按照“先记录当前根节点 → 再递归左子树 → 最后递归右子树”的字面顺序，把树中所有节点对象按次序装进列表 `nodes` 中；
2. **链表串接**：列表内已经存好了所有 `TreeNode` 的引用。只需让循环下标 `i` 从 `0` 走到 `len(nodes) - 2`，每次取出 `prev = nodes[i]` 和 `curr = nodes[i + 1]`，令 `prev.left = None` 并且 `prev.right = curr`。前序遍历的最后一个节点必然没有后继，保持即可。

### 2. 进阶优化思路：`O(1)` 空间的右子树剪接法

若在面试中被追问能否不使用 `nodes` 列表（实现 `O(1)` 额外空间），可以通过观察前序拓扑结构来“嫁接”右子树：
假设当前节点 `curr` 有左子树：
- 按照前序遍历“根 → 左 → 右”的顺序，`curr` 后面紧接着的必是 `curr.left`，而原来的 `curr.right` 必须紧跟在**左子树遍历完的最后一个节点**后面。
- 从 `curr.left` 出发一路向右走到头的最右节点 `pre`，就是适合承接原右子树的嫁接点。
- **四步剪接流程**：
  1. 寻找左子树最右节点 `pre`（`while pre.right: pre = pre.right`）；
  2. 把原右子树嫁接到 `pre` 右侧：`pre.right = curr.right`；
  3. 把左子树整体搬迁至右侧并置空左边：`curr.right = curr.left`，`curr.left = None`；
  4. 游标步进处理下一个节点：`curr = curr.right`。

如果 `curr.left` 本就为空，则无需搬运，直接 `curr = curr.right`。随着 `curr` 不断沿着右链推进，任意嵌套分支都会在后续步进中被逐层展开，全程无需辅助容器与递归栈。

## 代码与复杂度

以下为本次练习编写并修正定稿的前序收集重连实现：

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def flatten(self, root: TreeNode | None) -> None:
        """
        Do not return anything, modify root in-place instead.
        """
        if not root:
            return

        # 1. 前序遍历（根 -> 左 -> 右）收集所有节点对象引用
        nodes = []

        def preorder(node: TreeNode | None) -> None:
            if node is None:
                return
            nodes.append(node)
            preorder(node.left)
            preorder(node.right)

        preorder(root)

        # 2. 按收集顺序串接为 left=None, right 指向下一节点的单链表
        for i in range(len(nodes) - 1):
            prev = nodes[i]
            curr = nodes[i + 1]
            prev.left = None
            prev.right = curr
```

- **时间复杂度**：`O(N)`，其中 `N` 为二叉树的节点总数。前序递归遍历所有节点耗时 `O(N)`，重连循环遍历 `N - 1` 次耗时 `O(N)`。
- **空间复杂度**：`O(N)`。使用了长度为 `N` 的列表 `nodes` 暂存节点引用，同时递归深度最多为 `O(N)`。*(若采用上述进阶原地剪接法，空间复杂度可优化至严格的 `O(1)`)*。

## 本次复盘

1. **前序遍历代码模板的落地**：
   - 原状态：知道前序遍历口诀是“根左右”，但不知道如何写出具体的递归函数体。
   - 修正：通过将口诀直接对应为“先 `nodes.append(node)`，再调用 `preorder(node.left)` 和 `preorder(node.right)`”，彻底掌握了前/中/后序递归遍历的标准骨架。
2. **链表串接的越界边界控制**：
   - 难点：对如何将 `nodes` 列表安全串接成单链表一度无从下手。
   - 修正：确定两两配对需要执行 `len(nodes) - 1` 次连接，令下标 `i` 遍历 `range(len(nodes) - 1)`，既能用 `nodes[i + 1]` 精准锁定下一个节点，又完美避免了末尾越界报错。
3. **变量名拼写笔误与返回规范**：
   - 错误片段：重连循环中将复数列表名 `nodes` 误写成了单数 `node[i]`。
   - 修正：修正为 `nodes[i]` 与 `nodes[i + 1]`，并将空树特判的 `return root` 精简为符合原地修改语义的 `return`。

**下次自检问题**：面对要求“按某种遍历顺序重构树指针”的题目，是否能先用“辅助列表记录 + 顺序重连”写出保底的 `O(N)` 正确解，再去思考如何通过前驱节点指针嫁接优化到 `O(1)` 空间？
