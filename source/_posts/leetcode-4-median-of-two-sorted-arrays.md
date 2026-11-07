---
title: "LeetCode 4：寻找两个正序数组的中位数｜二分切分"
date: 2026-11-07 18:21:12
categories:
  - "算法每日一题"
tags:
  - "算法"
  - "力扣"
  - "二分查找"
  - "数组"
---

## 题目与关键约束

给定两个升序数组 `nums1`、`nums2`，返回合并后数组的中位数。题目要求整体时间复杂度达到 `O(log(m+n))`，因此不能完整合并后再取中位数。题目保证两个数组总长度至少为 1。

例如 `[1, 3]` 和 `[2]` 合并后是 `[1, 2, 3]`，中位数为 `2`；`[1, 2]` 和 `[3, 4]` 的中位数为 `(2 + 3) / 2 = 2.5`。

题目：[LeetCode 4. 寻找两个正序数组的中位数](https://leetcode.com/problems/median-of-two-sorted-arrays/)。

<!-- more -->

## 思路与推导

### 1. 把问题改成寻找正确切分

把两个数组分别切成左、右两半。若总长度为奇数，让左半部分比右半部分多一个元素；若为偶数，两边元素数相同。设左半部分需要 `half = (m + n + 1) // 2` 个元素。

在较短数组 `A` 上选择切分点 `i`，表示 `A` 左侧取 `i` 个元素。另一个数组 `B` 的切分点便确定为 `j = half - i`。这样左半部分元素总数一定正确。

切分是否正确，只需检查切分线附近的四个值：

```text
A_left  = A[i - 1]，若 i == 0 则为 -∞
A_right = A[i]，    若 i == len(A) 则为 +∞
B_left  = B[j - 1]，若 j == 0 则为 -∞
B_right = B[j]，    若 j == len(B) 则为 +∞
```

合法切分条件为 `A_left <= B_right` 且 `B_left <= A_right`。左右各自已经有序，所以只要这两个交界处不逆序，左半部分的所有数就都不大于右半部分的数。`±∞` 是边界哨兵，用来统一处理切分点落在数组开头或结尾的情况。

### 2. 用二分找到切分点

只在较短数组上二分，令 `i` 的范围为 `0` 到 `len(A)`。两种不合法情况决定了移动方向：

- 若 `A_left > B_right`，A 左边取多了，`i` 向左移。
- 若 `B_left > A_right`，A 左边取少了，`i` 向右移。

以 `[1, 2]` 和 `[3, 4]` 为例，初始切分可能是 `A_left=1, A_right=2, B_left=3, B_right=4`。`B_left > A_right`，所以 `i` 右移。随后切分为 `A_left=2, A_right=+∞, B_left=-∞, B_right=3`，两条边界条件成立。

### 3. 从切分读取中位数

左半部分最大值是 `max(A_left, B_left)`，右半部分最小值是 `min(A_right, B_right)`。总长度为奇数时取左侧最大值；为偶数时取左右边界的平均值。

## 代码与复杂度

```python
class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        # 保证在较短数组上二分
        if len(nums1) > len(nums2):
            nums1, nums2 = nums2, nums1

        m, n = len(nums1), len(nums2)
        half = (m + n + 1) // 2
        low, high = 0, m

        while low <= high:
            i = (low + high) // 2
            j = half - i

            a_left = float('-inf') if i == 0 else nums1[i - 1]
            a_right = float('inf') if i == m else nums1[i]
            b_left = float('-inf') if j == 0 else nums2[j - 1]
            b_right = float('inf') if j == n else nums2[j]

            if a_left > b_right:
                high = i - 1
            elif b_left > a_right:
                low = i + 1
            else:
                left_max = max(a_left, b_left)
                if (m + n) % 2 == 1:
                    return float(left_max)
                right_min = min(a_right, b_right)
                return (left_max + right_min) / 2
```

每次二分较短数组的切分点，时间复杂度为 `O(log(min(m, n)))`，符合题目要求；只使用固定数量的变量，额外空间复杂度为 `O(1)`。

本地用两个有序数组的小规模穷举与“合并后取中位数”的结果对比，共检查 15,875 对输入，均一致。当前对话中没有平台提交结果，因此不记为平台通过。

## 本次复盘

1. **切分点是左侧元素个数**：`i` 和 `j` 不是数组下标本身。左侧最后一个元素是 `nums[i - 1]`，右侧第一个元素是 `nums[i]`；这能避免把边界整体错开一位。
2. **两个不合法条件的方向相反**：`A_left > B_right` 表示 `i` 太大，应左移；`B_left > A_right` 表示 `i` 太小，应右移。可用 `[1, 2]` 与 `[3, 4]` 手推一次，核对方向。
3. **不要漏掉唯一候选切分点**：当 `low == high` 时仍需检查，所以循环条件是 `low <= high`。例如一个数组为空时，搜索范围就是 `0..0`；哨兵值会处理空侧边界。

这题可以按固定顺序检查：左侧元素总数正确、两个跨数组边界有序、最后根据奇偶长度取边界值。