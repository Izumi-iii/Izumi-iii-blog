---
title: "LeetCode 383. 赎金信｜哈希表频次计数与提前剪枝"
date: 2026-11-12 16:14:00
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 哈希表
  - 字符串
  - Python
---

给定两个由小写英文字母组成的字符串 `ransomNote` 和 `magazine`，判断能否通过剪下杂志中的字符拼出赎金信。每个杂志字符只能使用一次。先利用总长度进行提前剪枝，再维护单字典动态扣减字符频次，并在防御性访问中规避键不存在的异常。

<!-- more -->

## 题目与关键约束

[LeetCode 383. 赎金信](https://leetcode.cn/problems/ransom-note/) 要求判断字符串 `ransomNote` 能否由 `magazine` 里面的字符构成。若全部字符都能由杂志提供且不超量，返回 `true`，否则返回 `false`。

- **频次与一次性约束**：`magazine` 中的每个字符在拼写时只能使用一次，不能重复复用。
- **字符集约束**：两个字符串均只包含小写英文字母（26 个字母）。
- **规模约束**：$1 \le \text{len}(ransomNote), \text{len}(magazine) \le 10^5$。

示例：`ransomNote = "aa", magazine = "aab"` 返回 `true`；而 `ransomNote = "a", magazine = "b"` 返回 `false`。

## 思路与推导

现实中用杂志剪字拼信，核心是判断杂志中对应字符的供给量是否大于等于信件所需量。从计算机角度，这一过程本质是**字符频次的统计与比对**。

### 1. 总长度极速剪枝
在开展任何字符统计之前，先比较两者的长度：若 `len(ransomNote) > len(magazine)`，杂志的总字数甚至少于信件所需字数，无论种类如何都不可能凑齐，可直接返回 `False`，避免了无意义的哈希构建开销。

### 2. 单字典动态消耗
与“分别统计两个字符串再完整对比”的双字典方案相比，采用“单字典边消耗边校验”更优：
- 先遍历 `magazine`，将每个字符的出现次数记录在字典 `dic` 中。
- 随后遍历 `ransomNote` 中的每个字符，并在字典中寻找对应配额。
- 若发现当前字符在字典中供给不足（未出现或剩余数量小于等于 0），即可立即触发短路退出返回 `False`；若充足则扣减其配额。

## 代码与复杂度

Python 完整实现代码如下：

```python
class Solution:
    def canConstruct(self, ransomNote: str, magazine: str) -> bool:
        if len(ransomNote) > len(magazine):
            return False

        dic = {}

        for ch in magazine:
            dic[ch] = dic.get(ch, 0) + 1

        for ch in ransomNote:
            if dic.get(ch, 0) <= 0:
                return False
            else:
                dic[ch] -= 1

        return True
```

### 复杂度分析

设 $m = \text{len}(ransomNote)$，$n = \text{len}(magazine)$：

- **时间复杂度**：$O(n)$。构建字典需要扫描一次 `magazine`，耗时 $O(n)$；随后消耗字符最多遍历一次 `ransomNote`，单次哈希查找与更新平均为 $O(1)$，耗时 $O(m)$。由于前置了 $m > n$ 的快速返回，整体耗时严格受限于 $O(n)$。LeetCode 评测通过全部 131 个用例，执行用时为 34 ms。
- **空间复杂度**：$O(1)$（或记作 $O(|\Sigma|)$）。虽然维护了字典 `dic`，但由于题目限制仅含小写英文字母，字符集大小 $|\Sigma| = 26$。字典中最多仅保留 26 个键值对，辅助空间为严格常数级。

## 本次复盘

本题的核心收获在于**动态消耗过程中的防御性字典访问与默认值处理**。

- **原想法与初始缺陷**：
  初版实现将消耗分支写为：
  ```python
  if dic.get(ch) == 0:
      return False
  else:
      dic[ch] -= 1
  ```
  该逻辑默认 `dic.get(ch)` 会返回数值。然而在测试用例 `ransomNote = "a", magazine = "b"` 下，信件中的 `'a'` 从未在杂志字典中出现过，`dic.get('a')` 返回的是 `None`。因 `None == 0` 为 `False`，代码意外跌入 `else` 分支并执行 `dic['a'] -= 1`，随即触发 `KeyError: 'a'` 崩溃。
- **修正方案**：
  借鉴前面统计时使用的 `dic.get(ch, 0)` 习惯，在判断时显式提供默认值 0：
  ```python
  if dic.get(ch, 0) <= 0:
      return False
  ```
  这一调整使“字符从未在字典中出现”与“字符配额已耗尽归零”两种失效场景得到统一捕获，无需编写多层嵌套条件即可安全短路。
- **下次自检信号**：
  在 Python 中对字典取值进行数值比较或自减前，务必警惕键缺失返回 `None` 导致的类型比较失效与后续 `KeyError`。优先使用带默认值的 `dict.get(key, 0)` 或 `key not in dic` 做好防御性判断。
