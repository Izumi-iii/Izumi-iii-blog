---
title: "LeetCode 42：接雨水｜双指针"
date: 2026-11-07 17:32:13
categories:
  - "算法每日一题"
tags:
  - "算法"
  - "力扣"
  - "双指针"
  - "Python"
---

## 题目与关键约束

给定每根柱子的非负高度 `height`，柱子宽度为 1，计算下雨后能接住多少水。某个位置的水位由左右两侧较矮的最高柱子决定，因此位置 `i` 的积水量为：

```text
max(0, min(左侧最高高度, 右侧最高高度) - height[i])
```

例如 `[0, 1, 0, 2]` 中，高度为 0 的第三根柱子左右最高分别为 1 和 2，因此能接 1 格水。

本题来自 [LeetCode 42. 接雨水](https://leetcode.com/problems/trapping-rain-water/)。

<!-- more -->

## 思路与推导

最直接的方法是为每个位置分别向左、向右扫描，找两侧最高柱子。这会重复扫描。可以先用两个数组分别保存每个位置的左侧最高值和右侧最高值，再计算积水；时间复杂度为 `O(n)`，但需要 `O(n)` 额外空间。

进一步用双指针省去这两个数组。`left_max` 记录从左侧扫描过的最高柱子，`right_max` 记录从右侧扫描过的最高柱子。每轮先更新这两个值，再处理最高值较小的一侧：

- 若 `left_max <= right_max`，当前左侧的水位由 `left_max` 决定，积水为 `left_max - height[left]`，然后左指针右移。
- 否则，当前右侧的水位由 `right_max` 决定，积水为 `right_max - height[right]`，然后右指针左移。

为什么可以立刻结算较小的一边？例如 `left_max <= right_max` 时，右侧已经存在一根不低于 `left_max` 的柱子；无论更远处地形如何，当前左端位置的水位上限已经确定为 `left_max`。右侧较小时同理。

对 `[0, 1, 0, 2]`，先结算左端高度 0，积水为 0；再结算高度 1，积水为 0；接着高度 0 的位置积水为 `1 - 0 = 1`。

## 代码与复杂度

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        left, right = 0, len(height) - 1
        left_max = right_max = water = 0

        while left < right:
            left_max = max(left_max, height[left])
            right_max = max(right_max, height[right])

            if left_max <= right_max:
                water += left_max - height[left]
                left += 1
            else:
                water += right_max - height[right]
                right -= 1

        return water
```

每轮至少移动一个指针，左右指针总共最多移动 `n` 次，因此时间复杂度为 `O(n)`。算法只使用几个变量，额外空间复杂度为 `O(1)`。

本地验证覆盖 LeetCode 示例、`[4, 2, 0, 3, 2, 5]`、对话中的 `[0, 1, 0, 2]`、空数组、单柱和等高柱子，共 6 组输入，均通过。用户也反馈本题平台评测已通过。

## 本次复盘

1. **左右端点高度不等于两侧最高值**：公式中的左右值应是当前位置两侧的最高柱子。双指针遍历时，用 `left_max` 和 `right_max` 保存扫描过程中的最高值。
2. **一开始不确定如何决定结算哪一端**：比较两侧最高值。较小一侧的水位已被另一侧更高的边界保证，可以直接计算并移动该侧指针。
3. **逐格验证有助于理解指针状态**：在 `[0, 1, 0, 2]` 中，依次处理高度 0、1、0，对应积水 0、0、1。检查最高值何时更新、指针何时移动，能避免把柱高误当成积水量。

遇到类似题目时，可以先问：当前这侧的水位是否已由已知的另一侧边界确定？如果确定，就可以在移动指针时直接结算。