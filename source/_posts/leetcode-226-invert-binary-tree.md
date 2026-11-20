---
title: "LeetCode 226：翻转二叉树｜递归直觉与树的序列化认知"
date: 2026-11-20 23:01:45
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 树
  - 深度优先搜索
  - 二叉树
  - Python
---

## 题目与关键约束

- **平台与题号**：LeetCode [226. 翻转二叉树](https://leetcode.cn/problems/invert-binary-tree/)
- **输入输出**：给定一棵二叉树的根节点 `root`，翻转这棵二叉树，并返回其根节点。翻转的本质是将整棵树中所有节点的左右子树进行镜像互换。
- **关键约束**：
  - 节点总数范围在 $[0, 100]$ 之内（包含空树情况，需处理 `root is None`）
  - 节点值范围 $[-100, 100]$

以 `root = [4, 2, 7, 1, 3, 6, 9]` 为例，翻转后的树为 `[4, 7, 2, 9, 6, 3, 1]`。

<!-- more -->

## 思路与推导

### 1. 概念澄清：为什么题面输入展示的是一个“数组”？

初刷 LeetCode 树题时，常会产生困惑：“明明函数形参是 `root: TreeNode`，为什么题目示例给的是 `root = [4, 2, 7, ...]` 数组？”
- 题面中的数组只是二叉树按层序遍历（BFS）序列化后的**文本展示形式**，用于方便传输与生成测试用例；
- 在进入算法函数时，评测系统早已将数组在内存中实例化为由 `TreeNode` 构成的真实链式树结构；
- 代码中面对的始终是具备 `val`、`left`、`right` 指针属性的节点对象。

### 2. 为什么二叉树递归给人一种“又简单又难”的感觉？

在面对二叉树翻转时，很多学习者会产生一种强烈的反差感：
- **觉得“难”**：源于人脑的线性思维惯性。人脑极不擅长在多层嵌套中模拟函数调用栈，试图在大脑中人肉跟踪每一个节点的左右交替，极易造成脑力超载；
- **觉得“简单”**：源于递归（数学归纳法）的降维能力。只要恪守“**抓大放小，信任递归（Trust the Recursion）**”的原则，我们无需关心几十层调用的具体过程，只需站稳在当前节点 `root` 做好三件事：
  1. **防线守好**：若节点为空（`root is None`），直接返回 `root`；
  2. **做好当前层动作**：交换当前节点的左右子指针（Python 中可优雅地写作 `root.left, root.right = root.right, root.left`）；
  3. **委托子问题**：递归触发 `self.invertTree(root.left)` 与 `self.invertTree(root.right)`。

当局部逻辑与边界绝对正确时，整棵树成百上千个节点便自然会在回溯中完成整体翻转。

## 代码与复杂度

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        # 基准情况：空节点直接返回
        if root is None:
            return root

        # 核心操作：交换当前节点的左右子指针
        root.left, root.right = root.right, root.left

        # 递归翻转左右子树
        self.invertTree(root.left)
        self.invertTree(root.right)

        # 显式返回当前翻转完毕的根节点
        return root
```

- **时间复杂度**：$O(N)$，其中 $N$ 为二叉树的节点总数。每个节点都会被遍历访问一次并完成指针交换。
- **空间复杂度**：$O(H)$，其中 $H$ 为树的高度。空间开销主要为递归调用栈的深度；在最坏情况下（树退化为单链表）为 $O(N)$，最好情况下（完全平衡二叉树）为 $O(\log N)$。

## 本次复盘

1. **认知障碍**：对 LeetCode 树结构输入形式产生困惑（“为什么输入是一个数组”）。
   - **修正**：区分前端序列化展示与底层对象指针。明确传入的 `root` 是真正的对象引用，拥有完整的链式访问能力。
2. **逻辑细节**：代码完成了指针交换与子树递归，但遗漏了最后的 `return root`。
   - **原因**：在 Python 中，若函数末尾缺少显式 return，默认返回 `None`，导致评测端无法接收到已经翻转好的树根。
   - **修正**：在函数末尾补齐 `return root`，与函数签名 `-> Optional[TreeNode]` 契合。
3. **思维模式升级**：厘清了“又简单又难”的心智模型差异，摆脱对多层递归细节的人肉推演，转向依赖局部不变性与递归委托的思考方式。

**下次自检问题**：在修改树结构的递归函数中，是否在末尾显式返回了当前层的根节点？是否将心智聚焦于当前节点的指针操作，而不是陷入全树的人肉展开？
