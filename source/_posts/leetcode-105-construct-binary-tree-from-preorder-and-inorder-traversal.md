---
title: "LeetCode 105：从前序与中序遍历序列构造二叉树｜分治切片与根节点定位"
date: 2026-11-21 17:10:47
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 树
  - 数组
  - 分治
  - 二叉树
  - Python
---

## 题目与关键约束

- **平台与题号**：LeetCode [105. 从前序与中序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)
- **输入输出**：给定两个整数数组 `preorder` 和 `inorder`，其中 `preorder` 是二叉树的前序遍历，`inorder` 是同一棵树的中序遍历，请构造并返回这棵二叉树的根节点。
- **关键约束**：
  - $1 \le \text{preorder.length} \le 3000$ 且 $\text{inorder.length} == \text{preorder.length}$
  - 节点值范围 $[-3000, 3000]$
  - **`preorder` 和 `inorder` 均由无重复数值构成**（这是通过根节点数值唯一定位中序切分点的核心前提）
  - 输入保证合法有效

例如输入 `preorder = [3, 9, 20, 15, 7]`, `inorder = [9, 3, 15, 20, 7]`，构造出的二叉树为 `[3, 9, 20, null, null, 15, 7]`。

<!-- more -->

## 思路与推导

解决本题的关键在于洞察两种遍历顺序在空间结构上的互补性：

### 1. 前序出“根”，中序定“界”

- **前序遍历（Preorder）的结构**：
  $$\text{preorder} = [\text{根节点}, \underbrace{\text{左子树节点}\dots}_{k \text{ 个}}, \underbrace{\text{右子树节点}\dots}]$$
  第一个元素 `preorder[0]` 必然是当前整棵子树的根节点。
- **中序遍历（Inorder）的结构**：
  $$\text{inorder} = [\underbrace{\text{左子树节点}\dots}_{k \text{ 个}}, \text{根节点}, \underbrace{\text{右子树节点}\dots}]$$
  利用前序拿到的根节点值，通过 `k = inorder.index(root_val)` 找到其在中序中的位置。由于数值无重复，$k$ 便是天然的分水岭：
  - 中序切片中，$k$ 左侧全部是左子树节点（数量为 $k$ 个）；
  - $k$ 右侧全部是右子树节点。

### 2. 依据子树规模，完成前序数组切分

既然中序告诉我们左子树一共有 $k$ 个节点，那么在前序数组中：
- 紧随根节点后面的 $k$ 个数字（即下标 `1` 到 `k`），必然对应左子树的前序遍历：`preorder[1 : k + 1]`；
- 剩下的全部数字（下标从 `k + 1` 到末尾），必然对应右子树的前序遍历：`preorder[k + 1 :]`。

至此，左右子树各自的前序和中序序列全部切分完毕，直接将子切片递归送入子问题求解即可。

## 代码与复杂度

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def buildTree(self, preorder: list[int], inorder: list[int]) -> TreeNode | None:
        # 基准情况：列表为空说明子树无节点，返回 None
        if not preorder:
            return None

        # 1. 前序首元素即为当前子树根节点
        root_val = preorder[0]
        root = TreeNode(root_val)

        # 2. 在中序中定位根节点下标，获得左子树规模 k
        k = inorder.index(root_val)

        # 3. 按规模切片，分治递归构建左右子树
        # 中序：左子树 inorder[:k], 右子树 inorder[k+1:]
        # 前序：左子树 preorder[1:k+1], 右子树 preorder[k+1:]
        root.left = self.buildTree(preorder[1 : k + 1], inorder[:k])
        root.right = self.buildTree(preorder[k + 1 :], inorder[k + 1 :])

        return root
```

- **时间复杂度**：$O(N^2)$（使用 Python 数组切片与 `index` 查找）。每层递归调用中，查找根节点位置耗时 $O(N)$，复制生成切片列表耗时 $O(N)$，递归深度最高为 $O(N)$。*(注：若在面试中追求极速 $O(N)$，可使用哈希表预存储中序下标并用双指针区间索引代替数组切片)*。
- **空间复杂度**：$O(N^2)$（切片复制产生的中间列表内存开销）。

## 本次复盘

1. **变量实例化缺失**：
   - 原想法：直接书写 `root.val = preorder[0]`；
   - 报错：`root` 尚未被分配任何对象实例，引发未定义引用错误；
   - 修正：必须调用类构造函数显式创建节点对象 `root = TreeNode(root_val)`。
2. **空列表与 `None` 的混淆**：
   - 原想法：基准判空写成 `if preorder is None:`；
   - 反例：Python 中切片取空时生成的是空列表 `[]`（而非 `None`），`[] is None` 的判定为 `False`，导致逻辑漏过基准条件并在后续执行 `preorder[0]` 时抛出 `IndexError: list index out of range`；
   - 修正：采用 Pythonic 的真值判断 `if not preorder:` 或 `if len(preorder) == 0:`。

**下次自检问题**：在递归基准判断中，针对列表切片入参，是否使用了针对空列表 `[]` 的真值判断（`if not arr:`）而非对象比对（`is None`）？
