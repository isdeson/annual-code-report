# Git 年度报告生成器

扫描本地 Git 仓库，生成个人年度代码贡献报告。

## 安装

```bash
npm install
```

## 使用

```bash
npm start
```

## 统计维度说明

### 基础统计

| 字段 | 说明 |
|------|------|
| `name` | 项目名称 |
| `commits` | 总提交次数 |
| `activeDays` | 活跃天数 |
| `longestStreak` | 最长连续提交天数 |
| `insertions` | 新增代码行数 |
| `deletions` | 删除代码行数 |
| `netLines` | 净增代码行数 |
| `filesChanged` | 变更文件数 |

### 时间分布

| 字段 | 说明 |
|------|------|
| `hourDistribution` | 小时分布（0-23点各多少次提交） |
| `weekDistribution` | 星期分布（周日-周六各多少次提交） |
| `nightOwlRate` | 夜猫子比例（22点-6点提交占比） |
| `earlyBirdCount` | 早起提交次数（6-8点） |
| `lateNightCount` | 深夜提交次数（凌晨2-5点） |
| `weekendVsWeekday` | 周末vs工作日提交对比 |
| `avgCommitInterval` | 平均提交间隔（小时） |

### 时间边界

| 字段 | 说明 |
|------|------|
| `earliestCommit` | 最早的提交（日期+message） |
| `latestCommit` | 最晚的提交（日期+message） |
| `yearSpanDays` | 年度跨度（天） |

### 高产统计

| 字段 | 说明 |
|------|------|
| `mostProductiveDay` | 最高产的一天（日期+提交数） |
| `mostProductiveWeek` | 最高产的一周（周数+提交数） |
| `mostProductiveQuarter` | 最高产的季度 |
| `monthlyTrend` | 月度提交趋势 |
| `quarterlyComparison` | 季度对比（Q1-Q4） |

### Commit 内容分析

| 字段 | 说明 |
|------|------|
| `shortestCommit` | 字数最少的commit |
| `longestCommit` | 字数最多的commit |
| `topKeywords` | 高频关键词Top10 |
| `emojiStats` | 表情符号统计Top10 |
| `emotionIndex` | 情绪指数（感叹号/问号数量） |
| `commitTypeDistribution` | Conventional Commit类型分布（feat/fix/docs等） |

### 文件统计

| 字段 | 说明 |
|------|------|
| `topChangedFiles` | 最常修改的文件Top10 |
| `topFileTypes` | 最常修改的文件类型Top10 |
| `avgLinesPerCommit` | 平均每次提交改动行数 |
| `fileChanges.added` | 新增文件数 |
| `fileChanges.deleted` | 删除文件数 |
| `fileChanges.net` | 净增文件数 |

### 协作统计

| 字段 | 说明 |
|------|------|
| `mergeCommits` | 合并提交次数 |
| `revertCommits` | 回滚提交次数 |
| `branchCount` | 分支数量 |

### 特殊统计

| 字段 | 说明 |
|------|------|
| `hotfixCount` | 热修复提交次数 |
| `hotfixRate` | 热修复占比 |
| `bigRefactorCount` | 大型重构次数（单次>500行） |
| `longestGap` | 最长连续不提交天数 |
| `holidayCommits` | 节假日提交统计（春节/国庆等） |
| `longestWorkSession` | 连续工作最长时间段（同一天内） |

### 成就徽章

| 徽章 | 条件 |
|------|------|
| 🌅 早起鸟 | 6-8点提交占比>20% |
| 🦉 夜猫子 | 22点-6点提交占比>30% |
| 💪 周末战士 | 周末提交占比>30% |
| 🔥 稳定输出 | 连续提交>=7天 |
| 🏖️ 摸鱼王 | 连续不提交>=14天 |
| 🌙 深夜肝帝 | 凌晨2-5点提交>10次 |
| 🔨 重构大师 | 大型重构>=3次 |
| 🤝 协作达人 | 合并提交>20次 |

## 节假日覆盖

- 元旦
- 春节（近似日期）
- 清明节
- 劳动节
- 端午节
- 中秋节
- 国庆节

## License

MIT
