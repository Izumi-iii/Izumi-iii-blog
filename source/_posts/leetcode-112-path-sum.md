---
title: "LeetCode 112：路径总和｜减法回溯与叶子节点判别"
date: 2026-11-21 15:24:27
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

- **平台与题号**：LeetCode [112. 路径总和](https://leetcode.cn/problems/path-sum/)
- **输入输出**：给定一个二叉树的根节点 `root` 和一个表示目标和的整数 `targetSum`。判断该树中是否存在从**根节点到叶子节点**的完整路径，使得路径上所有节点值相加等于 `targetSum`。
- **关键约束**：
  - 树中节点总数在范围 $[0, 5000]$ 内（空树不存在任何根到叶的有效路径，直接返回 `False`）
  - $-1000 \le \text{Node.val} \le 1000$（**节点值可能为负数**，不可根据累加值大于 `targetSum` 进行单调性剪枝）
  - $-1000 \le \text{targetSum} \le 1000$
  - **必须到达叶子节点**：只有无子节点的节点（`root.left is None and root.right is None`）才算路径终点；中间节点即使累加和恰好等于目标值，也不构成合法路径。

<!-- more -->

## 思路与推导

### 1. 状态传递模型：做减法 vs 做累加

求解路径和通常有两种传递方式：
- **累加法**：额外携带一个参数 `cur_sum` 向下累加当前路径上的节点值；
- **做减法（推荐，极简）**：每经过一个节点，直接从目标和中扣减当前节点的值：
  $$\text{remaining} = \text{targetSum} - \text{root.val}$$
  这样函数不需要增加任何形参，直接将 `remaining` 作为下一层的子问题目标值即可，逻辑更加纯粹。

### 2. 状态机推导与递归边界

站在任意节点 `root` 面前，共有三个逻辑阶段：
1. **防线守卫（空节点）**：若 `root is None`，说明探索到了空枝，直接返回 `False`；
2. **叶子节点结算（Base Case）**：判断当前节点是否为真正的叶子（`root.left is None and root.right is None`）：
   - 若是叶子，路径到此终结。此时只需判断差额是否刚好扣完，即 `remaining == 0`（等价于 `root.val == targetSum`）；
3. **非叶子节点推进（递归子问题）**：若当前节点还有子节点，说明路径尚未到达终点，必须继续向下探索：
   - 将剩余目标值 `remaining` 传递给左子树或右子树；
   - 题目只要求“存在一条满足条件的路径”，因此左右两边使用 **`or`** 连接：
     $$\text{hasPathSum}(root, targetSum) = \text{hasPathSum}(root.left, remaining) \lor \text{hasPathSum}(root.right, remaining)$$

## 代码与复杂度

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def hasPathSum(self, root: TreeNode | None, targetSum: int) -> bool:
        # 守卫：空树或空分支不存在合法根到叶路径
        if root is None:
            return False

        # 核心技巧：自顶向下做减法
        remaining = targetSum - root.val

        # 基准情况：到达真正的叶子节点，核对差额是否刚好为 0
        if root.left is None and root.right is None:
            return remaining == 0

        # 非叶子节点：向左右子树探索，任一分支存在解即可（or）
        return self.hasPathSum(root.left, remaining) or self.hasPathSum(root.right, remaining)
```

- **时间复杂度**：$O(N)$，其中 $N$ 为二叉树的节点数。最坏情况下（没有满足条件的路径，或解在最后一个叶子），每个节点均会被访问一次。
- **空间复杂度**：$O(H)$，其中 $H$ 为树的高度。空间主要取决于递归调用栈深度；最坏情况（树退化为单链表）为 $O(N)$，最好情况（完全平衡二叉树）为 $O(\log N)$。

## 本次复盘

1. **叶子节点的物理约束**：明确了“单孩子节点不属于叶子节点”。如果只判断 `remaining == 0` 而不校验 `root.left is None and root.right is None`，会导致在半途命中的非叶子节点处被误判为解。
2. **叶子节点结束逻辑的简化**：
   - 原想法：写了 `if remaining == 0: return True else:` 后对后续流程产生停顿；
   - 认知澄清：既然已经抵达叶子节点，路径已经到达物理终点，差额不为 0 意味着该分支探索失败，必然只能 `return False`。将 `if-else` 分支直接合并为 `return remaining == 0`，逻辑严丝合缝。
3. **递归连接符的辨析**：
   - 对比 LeetCode 100（相同的树）使用 `and`（左右两边必须同时满足一致）；
   - 本题使用 `or`（只需存在任意一条通往叶子的合法路径即可），体现了存在性判定与全称判定的差异。

**下次自检问题**：题目要求的是“任意路径”还是“根到叶子路径”？在递归判定命中时，是否严格核验了当前节点左右孩子皆空的叶子条件？
