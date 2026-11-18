---
title: "LeetCode 104：二叉树的最大深度｜递归分解与深度传递"
date: 2026-11-18 17:24:45
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

- **平台与题号**：LeetCode [104. 二叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/)
- **输入输出**：给定一个二叉树的根节点 `root`，返回其最大深度（即根节点到最远叶子节点的最长路径上的节点总数）。
- **关键约束**：
  - 节点总数范围为 $[0, 10^4]$（包含空树情况，需处理 `root is None` 返回 0）
  - 节点值范围 $[-100, 100]$

以 `root = [3, 9, 20, null, null, 15, 7]` 为例：
- 节点 3 为根；
- 节点 9 位于第 2 层（叶子）；
- 节点 20 位于第 2 层，其子节点 15 和 7 位于第 3 层；
- 最长路径经过 3 个节点，最大深度为 3。

<!-- more -->

## 思路与推导

二叉树天然具有自相似的嵌套递归结构。求解一棵树的最大深度，本质是**子问题的自顶向下分解与自底向上归约**。

### 递归分治模型

对于任意节点 `root`：
1. **递归基准（Base Case）**：若当前节点为空（`root is None`），说明没有任何节点，深度为 0；
2. **分解子问题**：递归求解左子树的最大深度 `left_depth = self.maxDepth(root.left)`；递归求解右子树的最大深度 `right_depth = self.maxDepth(root.right)`；
3. **合并结果**：整棵树的高度等于左右子树深度的较大者，再加上**当前根节点自身所占有的 1 层深度**：
   $$\text{maxDepth}(root) = \max(\text{left\_depth}, \text{right\_depth}) + 1$$

### “+1”的归属逻辑

初学者写树的递归时，常常在加 1 的时机上出现重复统计。
- 子树递归调用的语义必须清晰保持为：“**仅返回该子树本身的高度**”；
- 当前层的主调函数仅需做一件事情：取两个子树高度的最大值，并在最后统一加上 1（代表当前节点）。
- 这种单一职责的设计，能从结构上彻底杜绝跨层重复累加。

## 代码与复杂度

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def maxDepth(self, root: TreeNode | None) -> int:
        # 递归终止条件：空节点深度为 0
        if root is None:
            return 0

        # 分解子问题：分别求左右子树的最大深度
        left_depth = self.maxDepth(root.left)
        right_depth = self.maxDepth(root.right)

        # 当前树的最大深度 = 左右子树最大深度较大者 + 根节点自身
        return max(left_depth, right_depth) + 1
```

- **时间复杂度**：$O(N)$，其中 $N$ 为二叉树的节点数。每个节点均被访问且仅被访问一次。
- **空间复杂度**：$O(H)$，其中 $H$ 为树的高度。空间主要取决于递归调用栈深度。最好情况下（完全平衡二叉树）高度为 $O(\log N)$；最坏情况下（树退化为单链）高度为 $O(N)$。

## 本次复盘

1. **原想法**：在类内部直接书写 `L = maxDepth(root.left)`。
   - **原因**：忽略了 Python 类实例方法的调用语法规范。
   - **修正**：在 `Solution` 类内部调用成员方法时必须显式使用 `self.maxDepth(...)`，否则在执行期会抛出 `NameError: name 'maxDepth' is not defined`。
2. **原想法**：先对子树结果加 1（`L = ... + 1`, `R = ... + 1`），最后在返回时再次执行 `max(L + 1, R + 1)`。
   - **反例**：以单节点二叉树（只有根节点，无左右子树）为例：
     - `root.left` 为 `None`，返回 0，计算得 $L = 0 + 1 = 1$；
     - `root.right` 为 `None`，返回 0，计算得 $R = 0 + 1 = 1$；
     - 最终返回 $\max(1 + 1, 1 + 1) = 2$，导致单节点树被错误判定为深度为 2。
   - **修正**：明确递归返回值的纯净性，统一由当前层在汇总左右子树最大值后执行单次 `+ 1`。

**下次自检问题**：在二叉树递归中，递归函数的返回值定义是否纯粹？代表当前节点的常量累加（如计数、累和、高度 +1）是否只在汇总阶段执行了一次？
