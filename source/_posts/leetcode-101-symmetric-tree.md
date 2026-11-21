---
title: "LeetCode 101：对称二叉树｜镜像递归与双指针拆解"
date: 2026-11-21 09:39:59
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

- **平台与题号**：LeetCode [101. 对称二叉树](https://leetcode.cn/problems/symmetric-tree/)
- **输入输出**：给定一个二叉树的根节点 `root`，检查它是否轴对称（即以中心垂直线为轴镜像对称）。
- **关键约束**：
  - 树中节点数目在范围 $[1, 1000]$ 内
  - 节点值范围 $[-100, 100]$

对称二叉树示意：
```text
        1
       / \
      2   2
     / \ / \
    3  4 4  3
```
以节点 1 为轴，左侧与右侧像照镜子一样完全对称，返回 `True`；若右侧 4 与 3 位置调换（如 `[1, 2, 2, null, 3, null, 3]`），则返回 `False`。

<!-- more -->

## 思路与推导

### 1. 核心误区破局：子树本身需要对称吗？

许多初学者容易产生一个直觉偏差：“只要根节点的左右孩子相等，再分别判断左子树是否自身对称、右子树是否自身对称即可”。
观察上面的对称二叉树：
- 单独提取它的左子树：根为 2，左孩子为 3，右孩子为 4；
- 左子树自身显然是不对称的（$3 \ne 4$）！

**结论**：对称的本质是**左子树与右子树之间互为镜像**，绝非子树各自内部对称。因此，原函数签名 `isSymmetric(root)` 只有一个参数，无法表达两棵树的相对关系，必须引入一个接收两个节点的辅助函数 `check(p, q)`。

### 2. 镜像递归与 LeetCode 100（相同的树）对比

本题与比较两棵树是否相同的 LeetCode 100 高度关联，差别仅在于遍历指针的配对关系：
- **LeetCode 100（相同）**：同向比对，左对左，右对右。
  $$\text{check}(p.left, q.left) \land \text{check}(p.right, q.right)$$
- **LeetCode 101（镜像）**：反向比对，**外侧对外侧，内侧对内侧**。
  - 外侧：左节点的左孩子，对应右节点的右孩子（`check(p.left, q.right)`）；
  - 内侧：左节点的右孩子，对应右节点的左孩子（`check(p.right, q.left)`）。

辅助函数中的基准守卫条件与 LeetCode 100 保持完全一致：
1. `p is None and q is None`：两端皆空，镜像成立，返回 `True`；
2. `p is None or q is None`：一空一非空，结构不对称，返回 `False`；
3. `p.val != q.val`：数值不匹配，镜像破损，返回 `False`；
4. 递归推进：当且仅当外侧与内侧两对子节点均满足镜像时，整棵树对称。

## 代码与复杂度

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def isSymmetric(self, root: TreeNode | None) -> bool:
        if root is None:
            return True

        # 定义辅助函数，判断以 p 和 q 为根的两棵子树是否互为镜像
        def check(p: TreeNode | None, q: TreeNode | None) -> bool:
            # 守卫 1：两节点均为空，镜像成立
            if p is None and q is None:
                return True
            # 守卫 2：仅有一个节点为空，结构不对称
            elif p is None or q is None:
                return False
            # 守卫 3：两节点数值不同，镜像破损
            elif p.val != q.val:
                return False

            # 外侧比外侧（p.left 对 q.right），内侧比内侧（p.right 对 q.left）
            return check(p.left, q.right) and check(p.right, q.left)

        # 对比根节点的左右子树
        return check(root.left, root.right)
```

- **时间复杂度**：$O(N)$，其中 $N$ 为二叉树的节点数。每个节点恰好被成对遍历访问一次。
- **空间复杂度**：$O(H)$，其中 $H$ 为树的高度。取决于递归调用栈深度；在最坏情况下（树退化为链表）为 $O(N)$，在最好情况下（平衡二叉树）为 $O(\log N)$。

## 本次复盘

1. **原想法**：试图直接在单入参函数中递归 `self.isSymmetric(root.left)` 与 `self.isSymmetric(root.right)`。
   - **认知重构**：镜像对称是两个分支之间的协同关系。必须通过引入双参数辅助函数 `check(p, q)` 将问题转化为“两棵树的镜像同构判定”。
2. **原想法**：首版代码未做判空直接取值 `root.left.val`，且在初次比对后直接 `if flag: return True else: return False` 结束。
   - **反例**：导致空指针异常，且递归调用语句沦为不可达代码（Unreachable Code）。
   - **修正**：在访问 `.val` 之前设置严格的判空守卫，确保各分支在排查异常后持续下潜至底。
3. **原想法**：在设计完基础守卫后，在 `check` 中误写了 `else: return True`。
   - **反例**：仅核验了第一层子节点的值便草草返回 `True`，漏掉了深层所有子孙节点的核对。
   - **修正**：将 `else` 分支替换为真正的深度递归推进语句 `check(p.left, q.right) and check(p.right, q.left)`。

**下次自检问题**：当遇到“对称”、“回文”、“双树关系”等跨分支约束时，是否需要将单指针扩展为“双指针/双节点”辅助函数？递归推进时，两端的步进方向是否对应镜像（外侧对内侧、左对右）？
