---
title: "LeetCode 290：单词规律｜双向哈希与双射映射陷阱"
date: 2026-11-18 17:13:41
categories:
  - 算法每日一题
tags:
  - LeetCode
  - 哈希表
  - 字符串
  - Python
---

## 题目与关键约束

- **平台与题号**：LeetCode [290. 单词规律](https://leetcode.cn/problems/word-pattern/)
- **输入输出**：给定一种规律模式 `pattern` 和一个由空格分隔单字构成的字符串 `s`，判断 `s` 是否完全遵循相同的规律模式。
- **关键约束**：
  - $1 \le \text{pattern.length} \le 300$
  - $1 \le s.\text{length} \le 3000$
  - `pattern` 只包含小写英文字母；`s` 仅包含小写英文字母和空格，不含前导/后导空格，单词间以单个空格分隔
  - 遵循规律的数学本质是**双射（Bijection）**：
    1. 每个字母必须精确映射到一个唯一的单词；
    2. 每个单词必须精确映射到一个唯一的字母；
    3. 不能有两个不同的字母映射到同一个单词，也不能有两个不同的单词映射到同一个字母。

典型用例如下：
- `pattern = "abba", s = "dog cat cat dog"` $\rightarrow$ `True`
- `pattern = "abba", s = "dog cat cat fish"` $\rightarrow$ `False`（一对多冲突）
- `pattern = "abba", s = "dog dog dog dog"` $\rightarrow$ `False`（多对一冲突，最经典陷阱）

<!-- more -->

## 思路与推导

解决本题主要分为两步：**前置切分与快速失败剪枝**，以及**双向哈希双射校验**。

### 1. 预处理与长度剪枝
首先利用 Python 自带的 `s.split()` 方法，将按空格分隔的字符串提取为单词列表 `words`。
由于 `pattern` 中的每个字符必须与 `s` 中的每个单词一对一匹配：
若 `len(pattern) != len(words)`，数量不对等则必然无法构成双射，可直接返回 `False` 提前退出。

### 2. 核心误区：为什么单向字典是错的？
初学者极易写出仅维护 `ch -> word` 的单向哈希表，例如：
```python
# 错误示范：仅做单向映射
for ch, word in zip(pattern, words):
    if ch in ch2w and ch2w[ch] != word:
        return False
    ch2w[ch] = word
```
在面对反例 `pattern = "abba"`, `s = "dog dog dog dog"` 时：
- 字符 `'a'` 首次出现，记录 `'a' -> 'dog'`；
- 字符 `'b'` 首次出现，因 `ch2w` 中未见 `'b'`，记录 `'b' -> 'dog'`；
- 最终不同字符 `'a'` 和 `'b'` 均绑定到了同一个单词 `'dog'`，代码误判为 `True`！

### 3. 双向哈希模型（双射解法）
为了保证“双向唯一性”，必须同时维护两个方向的映射：
- `ch2w`（字符 $\rightarrow$ 单词）：确保同一字符不会映射到不同单词；
- `w2ch`（单词 $\rightarrow$ 字符）：确保同一单词不会被不同字符共用。

借助 `zip(pattern, words)` 进行同步遍历：
- 若 `ch in ch2w` 且 `ch2w[ch] != word`，说明违反了字符的单义性，返回 `False`；
- 若 `word in w2ch` 且 `w2ch[word] != ch`，说明违反了单词的单义性，返回 `False`；
- 若均无冲突，将两者互相记录。全部比对无误后返回 `True`。

## 代码与复杂度

```python
class Solution:
    def wordPattern(self, pattern: str, s: str) -> bool:
        words = s.split()
        # 预处理剪枝：字符数与单词数不同，直接判定不匹配
        if len(pattern) != len(words):
            return False

        ch2w = {}
        w2ch = {}

        for ch, word in zip(pattern, words):
            # 校验字符 -> 单词是否冲突
            if ch in ch2w and ch2w[ch] != word:
                return False
            # 校验单词 -> 字符是否冲突
            if word in w2ch and w2ch[word] != ch:
                return False

            ch2w[ch] = word
            w2ch[word] = ch

        return True
```

- **时间复杂度**：$O(N + M)$，其中 $N$ 为字符串 $s$ 的长度，$M$ 为 `pattern` 的长度。切分字符串需扫描一遍 $s$，耗时 $O(N)$；后续遍历长度为 $M$ 的序列，哈希表的插入与查找在平均情况下均为 $O(1)$。
- **空间复杂度**：$O(N + M)$。切分后的 `words` 列表占用 $O(N)$ 辅助空间，两个哈希字典存储的键值对数量不超过字符集大小与单词总数，总空间为 $O(N + M)$。

## 本次复盘

1. **原想法**：对在 Python 中如何按空格截取单词不够熟悉。
   - **原因**：习惯于低级语言的手动循环截取或下标索引操作。
   - **修正**：在 Python 中直接使用内置方法 `s.split()` 即可无缝处理单个或连续空格，配合 `zip(pattern, words)` 进行元素打包，省去繁琐的下标边界管理。
2. **关键决策**：单向哈希无法防范“多对一”映射。
   - **反例**：`"abba"` 与 `"dog dog dog dog"`，只查 `ch2w` 会误判为合法。
   - **修正**：双向建立映射（`ch2w` + `w2ch`），或者使用一个字典配合一个集合（`seen_words = set()`），确保正反双向均满足一对一。

**下次自检问题**：当题面涉及“字符与模式对应”、“同构字符串（Isomorphic Strings）”时，是否存在多个不同元素映射到同一个目标元素的伪命中可能？是否需要双向哈希确保双射成立？
