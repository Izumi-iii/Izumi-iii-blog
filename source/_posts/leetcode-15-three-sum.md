---
title: "LeetCode 15：三数之和｜排序 + 双指针"
date: 2026-11-07 10:28:28
categories:
  - "算法每日一题"
tags:
  - "算法"
  - "力扣"
  - "双指针"
  - "Python"
---

## 题目与关键约束

给定整数数组 `nums`，找出所有和为 0 的三元组。答案不能包含重复组合，元素顺序不重要。比如 `[-1, 0, 1, 2, -1, -4]` 的结果是 `[[-1, -1, 2], [-1, 0, 1]]`。

关键在于“去重”：相同的数值组合即使来自不同下标，也只能输出一次。本题来自 [LeetCode 15. 三数之和](https://leetcode.com/problems/3sum/)。

<!-- more -->

## 思路与推导

最直接的想法是枚举三个下标，检查三数之和是否为 0，时间复杂度是 `O(n³)`。但枚举会重复得到相同的数值组合。

先排序，再固定一个数 `nums[i]`，问题就变成在它右侧找两个数，使它们的和等于 `-nums[i]`。令 `left = i + 1`、`right = n - 1`，根据三数之和移动指针：

- 和小于 0：左指针右移，让和变大。
- 和大于 0：右指针左移，让和变小。
- 和等于 0：记录三元组，左右指针都向中间移动。

去重分两层。固定数重复时跳过当前 `i`；找到一组后，左右指针移动，并跳过与刚才使用过的值相同的元素。由于数组有序，重复值相邻，跳过后不会漏掉不同的组合。

## 代码与复杂度

```python
class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        nums.sort()
        n = len(nums)
        answer = []

        for i in range(n - 2):
            if i > 0 and nums[i] == nums[i - 1]:
                continue

            left, right = i + 1, n - 1

            while left < right:
                total = nums[i] + nums[left] + nums[right]

                if total < 0:
                    left += 1
                elif total > 0:
                    right -= 1
                else:
                    answer.append([nums[i], nums[left], nums[right]])
                    left += 1
                    right -= 1

                    while left < right and nums[left] == nums[left - 1]:
                        left += 1
                    while left < right and nums[right] == nums[right + 1]:
                        right -= 1

        return answer
```

排序需要 `O(n log n)`，外层固定一个数，内层双指针扫描，因此总时间复杂度为 `O(n²)`。除排序自身可能使用的辅助空间外，双指针只占 `O(1)` 额外空间；返回结果所占空间不计入辅助空间。

本题代码已按用户反馈提交并通过平台评测；本次没有另行进行本地运行验证。

## 本次复盘

1. **和小于 0 时误想移动右指针**：数组升序排列，右指针左移只会让数更小。应移动左指针右移，才能增大总和。
2. **去重代码放在搜索循环前**：此时还没有找到组合，跳过相同指针值可能漏解；而初始 `right + 1` 还会越界。左右指针去重应放在命中三元组并移动指针之后。
3. **固定值也要去重**：若 `nums[i] == nums[i - 1]`，前一轮已经覆盖了当前固定值可以形成的组合，应跳过当前 `i`。

自检时可以问：每次移动指针是否让和朝目标 0 靠近？每次跳过重复值是否发生在排序之后，并且不会越过尚未搜索的候选？