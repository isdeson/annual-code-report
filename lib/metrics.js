/**
 * Git 年度报告 - 数据汇总模块
 * 负责将多个仓库的统计数据汇总为全局报告
 */

const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(isoWeek);

/**
 * 汇总所有仓库数据，生成全局统计报告
 * @param {Object[]} repos - 各仓库的统计数据数组
 * @returns {Object|null} 汇总后的全局统计数据
 */
function buildSummary(repos) {
  if (!repos.length) return null;

  // ========== 基础汇总 ==========
  const totalCommits = repos.reduce((a, b) => a + b.commits, 0);
  const totalInsertions = repos.reduce((a, b) => a + b.insertions, 0);
  const totalDeletions = repos.reduce((a, b) => a + b.deletions, 0);
  const totalFilesChanged = repos.reduce((a, b) => a + b.filesChanged, 0);

  // 计算各项目提交占比
  repos.forEach(r => { r.commitRatio = Number((r.commits / totalCommits).toFixed(3)); });

  // ========== Top 项目排行 ==========
  const topProjects = [...repos].sort((a, b) => b.commits - a.commits).slice(0, 5).map(r => ({
    name: r.name,
    commits: r.commits,
    insertions: r.insertions,
    deletions: r.deletions,
    badges: r.badges
  }));

  // ========== 时间分布汇总 ==========
  // 24小时分布
  const hourDistribution = Array(24).fill(0);
  repos.forEach(r => r.hourDistribution.forEach((v, i) => hourDistribution[i] += v));

  // 星期分布 (0=周日, 6=周六)
  const weekDistribution = Array(7).fill(0);
  repos.forEach(r => r.weekDistribution.forEach((v, i) => weekDistribution[i] += v));

  // 月度趋势
  const monthlyMap = {};
  repos.forEach(r => r.monthlyTrend.forEach(m => { monthlyMap[m.month] = (monthlyMap[m.month] || 0) + m.count; }));
  const monthlyTrend = Object.entries(monthlyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));

  // 季度对比
  const quarterlyComparison = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  repos.forEach(r => { Object.keys(r.quarterlyComparison).forEach(q => { quarterlyComparison[q] += r.quarterlyComparison[q]; }); });
  const mostProductiveQuarter = Object.entries(quarterlyComparison).sort((a, b) => b[1] - a[1])[0];

  // ========== 每日/每周最高产统计 ==========
  const dailyCommitsMap = {};
  repos.forEach(r => {
    if (r.mostProductiveDay) {
      dailyCommitsMap[r.mostProductiveDay.date] = (dailyCommitsMap[r.mostProductiveDay.date] || 0) + r.mostProductiveDay.commits;
    }
  });
  const mostProductiveDay = Object.entries(dailyCommitsMap).sort((a, b) => b[1] - a[1])[0];

  const weeklyMap = {};
  repos.forEach(r => {
    if (r.mostProductiveWeek) {
      weeklyMap[r.mostProductiveWeek.week] = (weeklyMap[r.mostProductiveWeek.week] || 0) + r.mostProductiveWeek.commits;
    }
  });
  const mostProductiveWeek = Object.entries(weeklyMap).sort((a, b) => b[1] - a[1])[0];

  // ========== 活跃天数估算 ==========
  const totalActiveDays = repos.reduce((a, b) => a + b.activeDays, 0);
  const estimatedActiveDays = Math.min(totalActiveDays, 365);  // 保守估计，最多365天

  // ========== 连续性统计 ==========
  const longestStreak = Math.max(...repos.map(r => r.longestStreak), 0);  // 最长连续提交天数
  const longestGap = Math.max(...repos.map(r => r.longestGap), 0);        // 最长摸鱼天数

  // ========== 关键词汇总 ==========
  const stopWords = new Set(['Merge', 'branch', 'into', 'master', 'release', 'publish', 'patch', 'feature', 'from', 'skip', 'ci', 'auto', 'merge']);
  const keywordMap = {};
  repos.forEach(r => r.topKeywords.forEach(k => {
    if (!stopWords.has(k.word)) {
      keywordMap[k.word] = (keywordMap[k.word] || 0) + k.count;
    }
  }));
  const topKeywords = Object.entries(keywordMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count }));

  // ========== Emoji 汇总 ==========
  const emojiMap = {};
  repos.forEach(r => r.emojiStats.forEach(e => { emojiMap[e.emoji] = (emojiMap[e.emoji] || 0) + e.count; }));
  const emojiStats = Object.entries(emojiMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([emoji, count]) => ({ emoji, count }));

  // ========== 文件类型汇总 ==========
  const fileTypeMap = {};
  repos.forEach(r => r.topFileTypes.forEach(f => {
    // 过滤掉异常后缀
    if (!f.ext.includes('}') && !f.ext.includes('"')) {
      fileTypeMap[f.ext] = (fileTypeMap[f.ext] || 0) + f.count;
    }
  }));
  const topFileTypes = Object.entries(fileTypeMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ext, count]) => ({ ext, count }));

  // ========== 最常修改的文件汇总 ==========
  const fileChangeMap = {};
  repos.forEach(r => r.topChangedFiles.forEach(f => {
    fileChangeMap[f.file] = (fileChangeMap[f.file] || 0) + f.count;
  }));
  const topChangedFiles = Object.entries(fileChangeMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([file, count]) => ({ file, count }));

  // ========== 协作者汇总 ==========
  const collaboratorMap = {};
  repos.forEach(r => r.collaborators.forEach(c => {
    collaboratorMap[c.name] = (collaboratorMap[c.name] || 0) + c.commits;
  }));
  const topCollaborators = Object.entries(collaboratorMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, commits]) => ({ name, commits }));

  // ========== Commit 类型汇总 ==========
  const commitTypeMap = {};
  repos.forEach(r => { Object.entries(r.commitTypeDistribution).forEach(([type, count]) => { commitTypeMap[type] = (commitTypeMap[type] || 0) + count; }); });

  // ========== 文件增删汇总 ==========
  const totalFilesAdded = repos.reduce((a, b) => a + b.fileChanges.added, 0);
  const totalFilesDeleted = repos.reduce((a, b) => a + b.fileChanges.deleted, 0);

  // ========== 协作相关汇总 ==========
  const totalMergeCommits = repos.reduce((a, b) => a + b.mergeCommits, 0);
  const totalRevertCommits = repos.reduce((a, b) => a + b.revertCommits, 0);
  const totalHotfixCount = repos.reduce((a, b) => a + b.hotfixCount, 0);
  const totalBigRefactorCount = repos.reduce((a, b) => a + b.bigRefactorCount, 0);
  const totalBranchCount = repos.reduce((a, b) => a + b.branchCount, 0);

  // ========== 时间段统计 ==========
  const nightCommits = hourDistribution.slice(22).reduce((a, b) => a + b, 0) + hourDistribution.slice(0, 7).reduce((a, b) => a + b, 0);  // 夜间 22:00-06:00
  const earlyBirdCommits = hourDistribution.slice(6, 9).reduce((a, b) => a + b, 0);   // 早起 06:00-09:00
  const lateNightCommits = hourDistribution.slice(2, 6).reduce((a, b) => a + b, 0);   // 深夜 02:00-06:00
  const weekendCommits = weekDistribution[0] + weekDistribution[6];                   // 周末
  const weekdayCommits = totalCommits - weekendCommits;                               // 工作日

  // ========== 边界提交（含项目来源） ==========
  const allEarliest = repos.map(r => ({ ...r.earliestCommit, project: r.name })).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
  const allLatest = repos.map(r => ({ ...r.latestCommit, project: r.name })).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
  const earliestCommit = allEarliest[0] || null;
  const latestCommit = allLatest[0] || null;

  const allShortestCommits = repos.map(r => ({ ...r.shortestCommit, project: r.name })).filter(Boolean).sort((a, b) => a.length - b.length);
  const allLongestCommits = repos.map(r => ({ ...r.longestCommit, project: r.name })).filter(Boolean).sort((a, b) => b.length - a.length);
  const shortestCommit = allShortestCommits[0] || null;
  const longestCommit = allLongestCommits[0] || null;

  // 年度跨度
  const yearSpanDays = earliestCommit && latestCommit ? dayjs(latestCommit.date).diff(dayjs(earliestCommit.date), 'day') : 0;

  // 最长工作时间段（含项目来源）
  const longestWorkSession = repos.map(r => r.longestWorkSession ? { ...r.longestWorkSession, project: r.name } : null).filter(s => s && s.minutes > 0).sort((a, b) => b.minutes - a.minutes)[0] || null;

  // ========== 平均值计算 ==========
  const avgLinesPerCommit = Number(((totalInsertions + totalDeletions) / totalCommits).toFixed(2));
  const avgCommitInterval = Number((repos.reduce((a, b) => a + b.avgCommitInterval * b.commits, 0) / totalCommits).toFixed(2));

  // ========== 情绪指数汇总 ==========
  const totalExclamation = repos.reduce((a, b) => a + b.emotionIndex.exclamation, 0);
  const totalQuestion = repos.reduce((a, b) => a + b.emotionIndex.question, 0);

  // ========== 年度徽章 ==========
  const badges = [];
  if (earlyBirdCommits / totalCommits > 0.1) badges.push('🌅 早起鸟');
  if (nightCommits / totalCommits > 0.2) badges.push('🦉 夜猫子');
  if (weekendCommits / totalCommits > 0.15) badges.push('💪 周末战士');
  if (longestStreak >= 7) badges.push('🔥 稳定输出');
  if (longestGap >= 14) badges.push('🏖️ 摸鱼王');
  if (lateNightCommits > 10) badges.push('🌙 深夜肝帝');
  if (totalBigRefactorCount >= 10) badges.push('🔨 重构大师');
  if (totalMergeCommits > 50) badges.push('🤝 协作达人');
  if (repos.length >= 10) badges.push('🚀 多项目达人');
  if (totalCommits >= 1000) badges.push('💎 千次提交');
  if (totalInsertions >= 100000) badges.push('📝 十万+行代码');

  // ========== 年度称号（唯一） ==========
  // 根据各维度得分，选出最突出的特征作为年度称号
  const titleCandidates = [
    { score: totalCommits >= 1000 ? 100 : totalCommits / 10, title: '💎 代码狂人', desc: '提交次数惊人' },
    { score: totalInsertions >= 100000 ? 90 : totalInsertions / 1000, title: '📝 产出之王', desc: '代码产出极高' },
    { score: (nightCommits / totalCommits) * 100, title: '🦉 暗夜行者', desc: '深夜是你的主场' },
    { score: (earlyBirdCommits / totalCommits) * 100, title: '🌅 晨光先锋', desc: '早起的鸟儿有代码写' },
    { score: (weekendCommits / totalCommits) * 80, title: '💪 周末战神', desc: '周末也在燃烧' },
    { score: longestStreak >= 30 ? 85 : longestStreak * 2, title: '🔥 持之以恒', desc: '连续提交天数超长' },
    { score: totalBigRefactorCount >= 20 ? 80 : totalBigRefactorCount * 4, title: '🔨 重构之神', desc: '大刀阔斧改代码' },
    { score: repos.length >= 15 ? 75 : repos.length * 5, title: '🚀 全栈游侠', desc: '多项目同时推进' },
    { score: totalMergeCommits >= 100 ? 70 : totalMergeCommits * 0.7, title: '🤝 团队枢纽', desc: '协作合并最频繁' },
    { score: longestGap >= 30 ? 60 : longestGap * 2, title: '🏖️ 佛系开发', desc: '张弛有度，懂得休息' },
    { score: (lateNightCommits / totalCommits) * 90, title: '🌙 深夜肝帝', desc: '凌晨还在写代码' },
  ];
  const annualTitle = titleCandidates.sort((a, b) => b.score - a.score)[0];

  // ========== 返回汇总数据 ==========
  return {
    projectCount: repos.length,                    // 参与项目总数
    totalCommits,                                  // 总提交次数
    totalInsertions,                               // 总新增代码行数
    totalDeletions,                                // 总删除代码行数
    netLines: totalInsertions - totalDeletions,    // 净增代码行数
    totalFilesChanged,                             // 总变更文件数
    activeDays: estimatedActiveDays,               // 活跃天数（估算）
    avgLinesPerCommit,                             // 平均每次提交改动行数
    avgCommitInterval,                             // 平均提交间隔（小时）

    earliestCommit,                                // 最早的提交（含项目来源）
    latestCommit,                                  // 最晚的提交（含项目来源）
    yearSpanDays,                                  // 年度跨度（天）

    hourDistribution,                              // 24小时提交分布
    weekDistribution,                              // 星期提交分布 (0=周日)
    monthlyTrend,                                  // 月度提交趋势
    quarterlyComparison,                           // 季度提交对比
    mostProductiveQuarter,                         // 最高产季度
    mostProductiveDay: mostProductiveDay ? { date: mostProductiveDay[0], commits: mostProductiveDay[1] } : null,  // 最高产的一天
    mostProductiveWeek: mostProductiveWeek ? { week: mostProductiveWeek[0], commits: mostProductiveWeek[1] } : null,  // 最高产的一周

    longestStreak,                                 // 最长连续提交天数
    longestGap,                                    // 最长摸鱼天数
    longestWorkSession,                            // 最长工作时间段（含项目来源）

    weekendVsWeekday: {
      weekend: weekendCommits,                     // 周末提交次数
      weekday: weekdayCommits,                     // 工作日提交次数
      weekendRate: Number((weekendCommits / totalCommits).toFixed(3))  // 周末提交比例
    },
    nightOwlRate: Number((nightCommits / totalCommits).toFixed(3)),  // 夜猫子比例
    earlyBirdCount: earlyBirdCommits,              // 早起提交次数 (06:00-09:00)
    lateNightCount: lateNightCommits,              // 深夜提交次数 (02:00-06:00)

    shortestCommit,                                // 字数最少的 commit（含项目来源）
    longestCommit,                                 // 字数最多的 commit（含项目来源）
    topKeywords,                                   // 高频关键词 Top20
    emojiStats,                                    // 表情符号统计 Top10
    emotionIndex: { exclamation: totalExclamation, question: totalQuestion },  // 情绪指数
    commitTypeDistribution: commitTypeMap,         // Commit 类型分布 (feat/fix/chore等)

    topFileTypes,                                  // 文件类型统计 Top10
    topChangedFiles,                               // 最常修改的文件 Top10
    fileChanges: {
      added: totalFilesAdded,                      // 新增文件数
      deleted: totalFilesDeleted,                  // 删除文件数
      net: totalFilesAdded - totalFilesDeleted     // 净增文件数
    },

    topCollaborators,                              // 协作者 Top10
    mergeCommits: totalMergeCommits,               // 合并提交次数
    revertCommits: totalRevertCommits,             // 回滚提交次数
    hotfixCount: totalHotfixCount,                 // 热修复次数
    hotfixRate: Number((totalHotfixCount / totalCommits).toFixed(3)),  // 热修复比例
    bigRefactorCount: totalBigRefactorCount,       // 大型重构次数 (单次>500行)
    branchCount: totalBranchCount,                 // 分支总数

    topProjects,                                   // Top5 项目排行
    allProjects: repos.map(r => r.name),           // 参与的所有项目列表

    badges,                                        // 年度徽章列表
    annualTitle: {                                 // 年度称号（唯一）
      title: annualTitle.title,
      desc: annualTitle.desc
    }
  };
}

module.exports = { buildSummary };
