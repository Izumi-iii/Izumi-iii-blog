---
title: "LeetCode 167：两数之和 II - 输入有序数组｜对撞双指针与排除法证明"
date: 2026-11-15 23:06:04
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 双指针
  - 数组
  - Python
---

## 题目与关键约束

- **平台与题号**：LeetCode [167. 两数之和 II - 输入有序数组](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)
- **输入输出**：给定一个下标从 1 开始、按非递减顺序排列的整数数组 `numbers` 和一个目标值 `target`。找出和为 `target` 的两个数，并返回它们在数组中的下标 `[index1, index2]`（满足 $1 \le \text{index1} < \text{index2} \le \text{numbers.length}$）。
- **关键约束**：
  - $2 \le \text{numbers.length} \le 3 \times 10^4$
  - $-1000 \le \text{numbers}[i] \le 1000$，数组已排序
  - $-1000 \le \text{target} \le 1000$
  - 题目保证有且仅有一个有效答案，且同一个元素不能使用两次
  - **必须使用 $O(1)$ 的额外空间**（限制使用哈希表）

以 `numbers = [2, 7, 11, 15]`, `target = 9` 为例，由于 $2 + 7 = 9$，对应 1-based 下标为 1 和 2，输出 `[1, 2]`。

<!-- more -->

## 思路与推导

本题与经典 LeetCode 1（两数之和）最大的不同，在于两个前提条件：“**数组已有序**”与“**严格限制 $O(1)$ 辅助空间**”。

若沿用哈希表解法，空间复杂度为 $O(N)$，无法满足常量空间要求；若使用暴力双重循环，时间复杂度为 $O(N^2)$，面对 $3 \times 10^4$ 的数据规模会直接超时（TLE）。充分利用数组的“单调有序性”，最佳方案是**对撞双指针法**。

### 双指针推导与状态转移

我们在数组两端分别放置两个指针：
- `left` 初始化为 0，指向当前可选区间的最小值；
- `right` 初始化为 `len(numbers) - 1`，指向当前可选区间的最大值。

每次计算当前两数之和 $s = \text{numbers}[left] + \text{numbers}[right]$：
1. **若 $s == \text{target}$**：找到了唯一解，直接返回 1-based 下标 `[left + 1, right + 1]`。
2. **若 $s > \text{target}$**：当前的和偏大，必须使和变小。因为数组有序，缩小和的唯一途径是将较大数的指针向左收缩，即 `right -= 1`。
3. **若 $s < \text{target}$**：当前的和偏小，必须使和变大。放大和的唯一途径是将较小数的指针向右推进，即 `left += 1`。

### 核心证明：为什么双指针不会漏解？

许多初学者会疑惑：这道题看似简单，为什么 LeetCode 把它标为 Medium？其核心考点在于**决策单调性与排除法的严谨证明**。

以 $s > \text{target}$ 为例：
- 当 $\text{numbers}[left] + \text{numbers}[right] > \text{target}$ 时，我们将 `right` 左移，意味着把当前的 $\text{numbers}[right]$ 彻底淘汰。
- 为什么可以安全淘汰？因为对于当前可选区间内任意大于 `left` 的下标 $k$（即 $left < k \le right$），根据数组的单调非递减性，必然有：
  $$\text{numbers}[k] \ge \text{numbers}[left]$$
- 进而得出：
  $$\text{numbers}[k] + \text{numbers}[right] \ge \text{numbers}[left] + \text{numbers}[right] > \text{target}$$
- 这意味着：当前的 $\text{numbers}[right]$ 与剩余区间内**任何**其它数字配对，和都必然严格大于 `target`。它绝对不可能参与构成有效解！因此将其永远排除是 100% 安全且完备的。
- 同理，当 $s < \text{target}$ 时，$\text{numbers}[left]$ 与剩余任何元素配对都无法达到 `target`，同样可被安全淘汰。

## 代码与复杂度

```python
class Solution:
    def twoSum(self, numbers: list[int], target: int) -> list[int]:
        left = 0
        right = len(numbers) - 1

        # 使用 left < right 作为防御性循环边界
        while left < right:
            s = numbers[left] + numbers[right]

            if s < target:
                left += 1
            elif s > target:
                right -= 1
            else:
                return [left + 1, right + 1]

        return []
```

- **时间复杂度**：$O(N)$，其中 $N$ 为数组长度。每一步循环必然使 `left` 右移或 `right` 左移一位，双指针相向而行直至相遇，最多执行 $N$ 次加法与比较。
- **空间复杂度**：$O(1)$。仅维护了 `left`、`right` 和局部变量 `s`，未申请任何与输入规模相关的额外内存。

## 本次复盘

1. **原想法**：在首轮代码实现中，双指针核心逻辑一次性全部写对，但直接返回了 `return [left, right]`。
   - **原因**：惯性思维使用了编程语言常见的 0-based 下标，漏看了题面中反复强调的 `1-indexed`。
   - **修正**：在返回时统一进行偏移，改为 `[left + 1, right + 1]`。在面试中，面对下标题目必须在审题阶段特意标注是 0-based 还是 1-based。
2. **工程习惯**：本题由于输入保证有且仅有唯一答案，使用 `while True:` 能够保证退出；但在求职面试与工程规范中，更推荐显式书写 `while left < right:` 配合兜底返回 `return []`，防御死循环。

**下次识别信号**：只要看到“**有序数组**”并需要“**寻找两数之和/差/组合**”且限制“**$O(1)$ 空间**”时，直接使用对撞双指针模型。该思维模型可无缝迁移至 LeetCode 15（三数之和，排序后固定一数转化为两数之和）以及 LeetCode 11（盛最多水的容器）。
