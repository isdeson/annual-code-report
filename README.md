# Git 年度报告生成器

扫描本地 Git 仓库，生成个人年度代码贡献报告。自动过滤指定作者的提交，支持多仓库递归扫描。

## 安装

```bash
npm install
```

## 使用

```bash
npm start
```

启动后会提示输入：
- Git 用户名/邮箱（自动从 git config 获取默认值）
- 仓库根目录路径
- 统计开始/结束日期

## 输出 JSON 字段说明

```jsonc
{
  // ==================== 报告元信息 ====================
  "generatedAt": "2025-01-15T10:30:00.000Z",    // 报告生成时间
  "range": {
    "since": "2025-01-01",                       // 统计开始日期
    "until": "2025-12-31"                        // 统计结束日期
  },
  "author": "zhangsan",                          // 被统计的 Git 作者

  // ==================== 汇总数据 ====================
  "summary": {

    // ---------- 基础统计 ----------
    "projectCount": 14,                          // 参与的项目总数
    "projectCountTip": "💪 项目达人，涉猎广泛",   // 项目数提示文案
    
    "totalCommits": 303,                         // 总提交次数
    "totalCommitsTip": "⚡ 稳定输出中",           // 提交次数提示文案
    
    "totalInsertions": 50000,                    // 新增代码总行数
    "totalInsertionsTip": "📚 相当于写了 1 本小说", // 代码行数提示文案
    
    "totalDeletions": 10000,                     // 删除代码总行数
    
    "netLines": 40000,                           // 净增代码行数
    "netLinesTip": "📈 净增代码量可观",           // 净增行数提示文案
    
    "totalFilesChanged": 500,                    // 修改过的文件总数
    
    "activeDays": 100,                           // 有提交的天数
    "activeDaysTip": "⏰ 稳定出勤",               // 活跃天数提示文案
    
    "avgLinesPerCommit": 198.02,                 // 平均每次提交改动行数
    "avgCommitInterval": 24.5,                   // 平均提交间隔（小时）
    "coffeeTip": "☕ 按每2次提交喝1杯咖啡算，你喝了 151 杯", // 咖啡比喻

    // ---------- 时间边界 ----------
    "earliestCommit": {                          // 第一次提交
      "date": "2025-02-19T09:34:45+08:00",
      "message": "feat: 初始化项目",
      "project": "my-project"                    // 来自哪个项目
    },
    "latestCommit": {                            // 最后一次提交
      "date": "2025-12-31T18:00:00+08:00",
      "message": "fix: 修复bug",
      "project": "another-project"
    },
    "yearSpanDays": 315,                         // 首次到末次提交跨越天数

    // ---------- 时间分布 ----------
    "hourDistribution": [0,0,0,...],             // 24小时提交次数分布（索引0=0点）
    "hourLines": [0,0,0,...],                    // 24小时代码行数分布
    
    "weekDistribution": [10,50,60,55,65,50,13],  // 星期提交次数分布（索引0=周日）
    "weekLines": [1000,5000,...],                // 星期代码行数分布
    
    "monthlyTrend": [                            // 月度趋势
      { "month": "2025-01", "count": 20, "lines": 5000 }  // 月份、提交次数、代码行数
    ],
    
    "quarterlyComparison": {                     // 季度提交次数对比
      "Q1": 80, "Q2": 60, "Q3": 70, "Q4": 93
    },
    "quarterlyLines": {                          // 季度代码行数对比
      "Q1": 10000, "Q2": 8000, "Q3": 12000, "Q4": 20000
    },
    "mostProductiveQuarter": ["Q4", 93],         // 最高产季度

    // ---------- 最高产记录 ----------
    "mostProductiveDay": {                       // 提交最多的一天
      "date": "2025-11-27",
      "commits": 26
    },
    "mostProductiveWeek": {                      // 提交最多的一周
      "week": "48-2025",
      "commits": 59
    },

    // ---------- 连续性统计 ----------
    "longestStreak": 15,                         // 最长连续提交天数
    "longestStreakTip": "💪 比坚持健身还久",      // 连续提交提示文案
    
    "longestGap": 30,                            // 最长摸鱼天数
    "longestGapTip": "😴 摸鱼冠军",               // 摸鱼提示文案
    
    "longestWorkSession": {                      // 单日最长工作时长
      "day": "2025-11-25",
      "minutes": 480,
      "hours": 8.0,
      "project": "my-project"
    },
    "longestWorkSessionTip": "⏰ 相当于看了 4 部电影", // 工作时长提示文案

    // ---------- 周末/夜间统计 ----------
    "weekendVsWeekday": {
      "weekend": 23,                             // 周末提交次数
      "weekday": 280,                            // 工作日提交次数
      "weekendRate": 0.076                       // 周末提交比例
    },
    "weekendTip": "🌴 周末好好休息",              // 周末提示文案
    
    "nightOwlRate": 0.15,                        // 夜猫子比例（22:00-06:00）
    "nightOwlTip": "😴 作息规律",                 // 夜猫子提示文案
    
    "earlyBirdCount": 15,                        // 早起提交次数（06:00-09:00）
    "earlyBirdTip": "😴 不是早起型",              // 早起提示文案
    
    "lateNightCount": 5,                         // 深夜提交次数（02:00-06:00）

    // ---------- Commit 内容分析 ----------
    "shortestCommit": {                          // 字数最少的 commit
      "message": "fix",
      "length": 3,
      "project": "my-project"
    },
    "longestCommit": {                           // 字数最多的 commit
      "message": "feat: 完成用户模块重构...",
      "length": 120,
      "project": "another-project"
    },
    
    "topKeywords": [                             // 高频关键词 Top20
      { "word": "feat", "count": 150 }
    ],
    
    "emojiStats": [                              // 表情符号统计 Top10
      { "emoji": "🎉", "count": 10 }
    ],
    
    "emotionIndex": {                            // 情绪指数
      "exclamation": 20,                         // 感叹号总数
      "question": 5                              // 问号总数
    },
    
    "commitTypeDistribution": {                  // Commit 类型分布
      "feat": 150,                               // 新功能
      "fix": 80,                                 // Bug修复
      "chore": 30                                // 杂项
    },

    // ---------- 文件统计 ----------
    "topFileTypes": [                            // 最常修改的文件类型 Top10
      { "ext": ".tsx", "count": 200 }
    ],
    
    "topChangedFiles": [                         // 最常修改的文件 Top10
      { "file": "src/index.tsx", "count": 50 }
    ],
    
    "fileChanges": {                             // 文件增删统计
      "added": 100,                              // 新增文件数
      "deleted": 20,                             // 删除文件数
      "net": 80                                  // 净增文件数
    },

    // ---------- 协作统计 ----------
    "topCollaborators": [                        // 协作者 Top10
      { "name": "lisi <lisi@example.com>", "commits": 200 }
    ],
    "topCollaboratorsTip": "👥 团队核心",         // 协作者提示文案
    
    "mergeCommits": 31,                          // 合并提交次数
    "revertCommits": 2,                          // 回滚提交次数
    "hotfixCount": 5,                            // 热修复次数
    "hotfixRate": 0.016,                         // 热修复比例
    
    "bigRefactorCount": 10,                      // 大型重构次数（单次>500行）
    "bigRefactorCountTip": "🛠️ 重构大师",        // 重构提示文案
    
    "branchCount": 50,                           // 分支总数
    "branchesCreated": 25,                       // 用户创建的分支数
    "branchesCreatedTip": "🌱 分支达人",          // 分支提示文案

    // ---------- 项目统计 ----------
    "topProjects": [                             // Top5 项目排行
      {
        "name": "my-project",
        "commits": 100,
        "insertions": 20000,
        "deletions": 5000,
        "badges": ["🔥 稳定输出"]
      }
    ],
    
    "allProjects": ["my-project", "..."],        // 参与的所有项目列表

    // ---------- 年度徽章 ----------
    "badges": [                                  // 获得的所有徽章
      "🌅 早起鸟",        // 早起提交占比 > 10%
      "🦉 夜猫子",        // 夜间提交占比 > 20%
      "💪 周末战士",      // 周末提交占比 > 15%
      "🔥 稳定输出",      // 连续提交 >= 7 天
      "🏖️ 摸鱼王",       // 连续不提交 >= 14 天
      "🌙 深夜肝帝",      // 深夜提交 > 10 次
      "🔨 重构大师",      // 大型重构 >= 10 次
      "🤝 协作达人",      // 合并提交 > 50 次
      "🚀 多项目达人",    // 参与项目 >= 10 个
      "💎 千次提交",      // 总提交 >= 1000 次
      "📝 十万+行代码"    // 新增代码 >= 10万行
    ],

    // ---------- 年度称号（唯一） ----------
    "annualTitle": {
      "title": "📝 产出之王",                    // 称号名称
      "desc": "代码产出极高"                     // 称号描述
    }
    // 可能的称号：
    // 💎 代码狂人 - 提交次数惊人
    // 📝 产出之王 - 代码产出极高
    // 🦉 暗夜行者 - 深夜是你的主场
    // 🌅 晨光先锋 - 早起的鸟儿有代码写
    // 💪 周末战神 - 周末也在燃烧
    // 🔥 持之以恒 - 连续提交天数超长
    // 🔨 重构之神 - 大刀阔斧改代码
    // 🚀 全栈游侠 - 多项目同时推进
    // 🤝 团队枢纽 - 协作合并最频繁
    // 🏖️ 佛系开发 - 张弛有度，懂得休息
    // 🌙 深夜肝帝 - 凌晨还在写代码
  }
}
```

## License

MIT
