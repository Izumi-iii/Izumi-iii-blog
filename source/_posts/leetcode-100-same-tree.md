---
title: "LeetCode 100：相同的树｜双树同步递归与守卫分支"
date: 2026-11-19 17:47:45
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

- **平台与题号**：LeetCode [100. 相同的树](https://leetcode.cn/problems/same-tree/)
- **输入输出**：给定两棵二叉树的根节点 `p` 和 `q`，编写一个函数来检验它们是否相同。当且仅当两棵树在结构上完全相同，并且所有对应节点具有相同的数值时，才认为它们是相同的。
- **关键约束**：
  - 两棵树上的节点数目在范围 $[0, 100]$ 内（包含空树情况）
  - 节点值范围 $[-10^4, 10^4]$

例如：
- `p = [1, 2, 3], q = [1, 2, 3]` $\rightarrow$ `True`（结构与数值完全一致）；
- `p = [1, 2], q = [1, null, 2]` $\rightarrow$ `False`（左孩子与右孩子位置不对称，结构不同）。

<!-- more -->

## 思路与推导

本题是从“单树递归”（如 LeetCode 104 计算最大深度）迈向“**双树同步递归**”的经典母题。

### 核心认知：二叉树遍历为什么不需要 `while` 循环？

在初学二叉树时，许多人常习惯性地思考“应该用 `while` 还是 `for` 循环推进节点”。
- 数组或链表是单向线性结构，状态转移只有一条路，自然使用循环迭代推进；
- 二叉树具备**分叉结构**（左子树与右子树两条分支并行展开）。若手动使用循环，必须借助显式栈或队列来记录分叉状态；
- 而**递归**天然由函数调用栈维护分叉与回溯。函数自我调用的过程，本质上就是在树结构上驱动的自动遍历，完全不需要手写 `while`。

### 双树同步状态机与守卫分支

站在当前考察的一对节点 `p` 与 `q` 面前，一共只有四种逻辑分支：
1. **两节点皆空**（`p is None and q is None`）：说明两条路径同时抵达底端叶子，且结构完全对称，返回 `True`；
2. **一空一非空**（`p is None or q is None`）：说明结构发生破损（一棵树有节点而另一棵无节点），返回 `False`；
3. **两节点均非空但数值不同**（`p.val != q.val`）：结构完好但数据不匹配，返回 `False`；
4. **两节点完全一致**：当前节点过关，整棵树是否相同的结论取决于子树。整棵树相同的充要条件是**左子树相同且右子树相同**：
   $$\text{isSameTree}(p, q) = \text{isSameTree}(p.left, q.left) \land \text{isSameTree}(p.right, q.right)$$

设计分支时应使用平级守卫（Guard Clauses）逐层过滤异常，确保只有在前三个异常均被排除后，才递归考察子树。

## 代码与复杂度

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def isSameTree(self, p: TreeNode | None, q: TreeNode | None) -> bool:
        # 守卫 1：两节点均为空，结构相同
        if p is None and q is None:
            return True
        # 守卫 2：其中一个为空另一个不为空，结构不同
        elif p is None or q is None:
            return False
        # 守卫 3：两节点值不同
        elif p.val != q.val:
            return False

        # 当前节点完全匹配，递归校验左右子树
        return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
```

- **时间复杂度**：$O(\min(N, M))$，其中 $N$ 和 $M$ 分别是两棵树的节点数。当两棵树相同时遍历所有节点，一旦在某节点发现结构或数值差异便提前返回（短路特性），最多遍历 $\min(N, M)$ 个节点。
- **空间复杂度**：$O(\min(H_1, H_2))$，其中 $H_1, H_2$ 分别为两棵树的高度。空间消耗取决于递归调用栈深度；在最坏情况下（树退化为链表）为 $O(N)$，在最好情况下（平衡树）为 $O(\log N)$。

## 本次复盘

1. **原想法**：对如何推进左右子树感到困惑，疑问“树结构的循环该如何写，用 while 吗？”。
   - **认知重构**：二叉树是典型的自相似递归结构。函数自身的递归调用 `self.isSameTree(...)` 即可天然替代循环，依靠系统调用栈实现自动深入与回溯。
2. **原想法**：将首个判空写为 `if p is None and q is None: return True else: return False`。
   - **反例**：对于两棵非空的正常二叉树，首个判断为假后直接跌入 `else:` 提前返回 `False`，后续比对数值和子树递归的代码全变成了不可达代码（Unreachable Code）。
   - **修正**：采用平级守卫模式（`if ... elif ... elif ...`），逐层排除“双空”、“单空”、“异值”后，才进入正常的递归合并。
3. **细节注意**：属性调用时不慎将点号键入为逗号（如 `q,left`），在 Python 中会将一个实参拆分成两个参数导致传参越界报错，编码时需仔细核验标点。

**下次自检问题**：在二叉树分治递归中，是否存在一个 `else` 过早截断了后续正常的递归分支？每个递归基准条件（Base Case）是否都做到了互斥与穷尽？
