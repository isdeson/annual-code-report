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
  // 24小时提交次数分布
  const hourDistribution = Array(24).fill(0);
  repos.forEach(r => r.hourDistribution.forEach((v, i) => hourDistribution[i] += v));

  // 24小时代码行数分布
  const hourLines = Array(24).fill(0);
  repos.forEach(r => r.hourLines.forEach((v, i) => hourLines[i] += v));

  // 星期提交次数分布 (0=周日, 6=周六)
  const weekDistribution = Array(7).fill(0);
  repos.forEach(r => r.weekDistribution.forEach((v, i) => weekDistribution[i] += v));

  // 星期代码行数分布
  const weekLines = Array(7).fill(0);
  repos.forEach(r => r.weekLines.forEach((v, i) => weekLines[i] += v));

  // 月度趋势（含提交次数和代码行数）
  const monthlyMap = {};
  const monthlyLinesMap = {};
  repos.forEach(r => r.monthlyTrend.forEach(m => {
    monthlyMap[m.month] = (monthlyMap[m.month] || 0) + m.count;
    monthlyLinesMap[m.month] = (monthlyLinesMap[m.month] || 0) + (m.lines || 0);
  }));
  const monthlyTrend = Object.entries(monthlyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count, lines: monthlyLinesMap[month] || 0 }));

  // 季度提交次数对比
  const quarterlyComparison = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  repos.forEach(r => { Object.keys(r.quarterlyComparison).forEach(q => { quarterlyComparison[q] += r.quarterlyComparison[q]; }); });
  const mostProductiveQuarter = Object.entries(quarterlyComparison).sort((a, b) => b[1] - a[1])[0];

  // 季度代码行数对比
  const quarterlyLines = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  repos.forEach(r => { if (r.quarterlyLines) Object.keys(r.quarterlyLines).forEach(q => { quarterlyLines[q] += r.quarterlyLines[q]; }); });

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
    const key = `${c.name}|${c.email}`;
    collaboratorMap[key] = (collaboratorMap[key] || 0) + c.commits;
  }));
  const topCollaborators = Object.entries(collaboratorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, commits]) => {
      const [name, email] = key.split('|');
      return { name, email, commits };
    });

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
  const totalBranchesCreated = repos.reduce((a, b) => a + (b.branchesCreated || 0), 0);

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

  // ========== 生成提示文案 ==========
  const totalLines = totalInsertions + totalDeletions;
  
  const projectCountTip = repos.length >= 15 ? '🚀 多线程人类，同时驾驭多个项目' : 
                          repos.length >= 10 ? '💪 项目达人，涉猎广泛' :
                          repos.length >= 5 ? '📦 稳扎稳打，多项目并行' : '🎯 专注深耕';
  
  const totalCommitsTip = totalCommits >= 1000 ? '💎 千次提交，代码狂人' :
                          totalCommits >= 500 ? '🔥 高产似母猪' :
                          totalCommits >= 200 ? '⚡ 稳定输出中' : '🌱 持续成长中';
  
  const totalInsertionsTip = totalInsertions >= 100000 ? `📚 相当于写了 ${Math.floor(totalInsertions / 30000)} 本小说` :
                             totalInsertions >= 50000 ? '📝 产出惊人' :
                             totalInsertions >= 10000 ? '✍️ 笔耕不辍' : '📖 积少成多';
  
  const netLinesTip = (totalInsertions - totalDeletions) >= 50000 ? '📈 净增代码量可观' :
                      (totalInsertions - totalDeletions) >= 10000 ? '📊 稳步增长' : '🔄 精简优化中';
  
  const activeDaysTip = estimatedActiveDays >= 300 ? '🔥 全年无休，肝帝本帝' :
                        estimatedActiveDays >= 200 ? '💪 勤奋打工人' :
                        estimatedActiveDays >= 100 ? '⏰ 稳定出勤' : '🌴 劳逸结合';
  
  const longestStreakTip = longestStreak >= 30 ? '🔥 连续一个月，毅力惊人' :
                           longestStreak >= 14 ? '💪 比坚持健身还久' :
                           longestStreak >= 7 ? '⚡ 一周连击' : '🎯 专注当下';
  
  const longestGapTip = longestGap >= 60 ? '🏖️ 超长假期，希望是在度假' :
                        longestGap >= 30 ? '😴 摸鱼冠军' :
                        longestGap >= 14 ? '🌴 适度休息' : '🔥 几乎不休息';
  
  const longestWorkSessionTip = longestWorkSession && longestWorkSession.hours >= 10 ? `⏰ 相当于看了 ${Math.floor(longestWorkSession.hours / 2)} 部电影` :
                                longestWorkSession && longestWorkSession.hours >= 6 ? '💪 超长待机' : '⚡ 高效工作';
  
  const bigRefactorCountTip = totalBigRefactorCount >= 20 ? '🔨 重构之神，代码焕然一新' :
                              totalBigRefactorCount >= 10 ? '🛠️ 重构大师' :
                              totalBigRefactorCount >= 5 ? '🔧 勤于优化' : '📦 稳定为主';
  
  const topCollaboratorsTip = topCollaborators.length >= 10 ? '🤝 社交达人，协作广泛' :
                              topCollaborators.length >= 5 ? '👥 团队核心' : '🎯 独立作战';
  
  const branchesCreatedTip = totalBranchesCreated >= 50 ? '🌿 分支管理大师' :
                             totalBranchesCreated >= 20 ? '🌱 分支达人' :
                             totalBranchesCreated >= 10 ? '🪴 有序开发' : '🎋 精简分支';
  
  const coffeeCount = Math.floor(totalCommits * 0.5);
  const coffeeTip = `☕ 按每2次提交喝1杯咖啡算，你喝了 ${coffeeCount} 杯`;

  // ========== 返回汇总数据 ==========
  return {
    projectCount: repos.length,
    projectCountTip,
    totalCommits,
    totalCommitsTip,
    totalInsertions,
    totalInsertionsTip,
    totalDeletions,
    netLines: totalInsertions - totalDeletions,
    netLinesTip,
    totalFilesChanged,
    activeDays: estimatedActiveDays,
    activeDaysTip,
    avgLinesPerCommit,
    avgCommitInterval,
    coffeeTip,

    earliestCommit,
    latestCommit,
    yearSpanDays,

    hourDistribution,
    hourLines,
    weekDistribution,
    weekLines,
    monthlyTrend,
    quarterlyComparison,
    quarterlyLines,
    mostProductiveQuarter,
    mostProductiveDay: mostProductiveDay ? { date: mostProductiveDay[0], commits: mostProductiveDay[1] } : null,
    mostProductiveWeek: mostProductiveWeek ? { week: mostProductiveWeek[0], commits: mostProductiveWeek[1] } : null,

    longestStreak,
    longestStreakTip,
    longestGap,
    longestGapTip,
    longestWorkSession,
    longestWorkSessionTip,

    weekendVsWeekday: {
      weekend: weekendCommits,
      weekday: weekdayCommits,
      weekendRate: Number((weekendCommits / totalCommits).toFixed(3))
    },
    weekendTip: weekendCommits / totalCommits > 0.2 ? '💪 周末战士，休息日也在战斗' :
                weekendCommits >= 20 ? '⚡ 偶尔周末加班' : '🌴 周末好好休息',
    
    nightOwlRate: Number((nightCommits / totalCommits).toFixed(3)),
    nightOwlTip: nightCommits / totalCommits > 0.3 ? '🦉 夜猫子，深夜是你的主场' :
                 nightCommits / totalCommits > 0.15 ? '🌙 偶尔熬夜' : '😴 作息规律',
    
    earlyBirdCount: earlyBirdCommits,
    earlyBirdTip: earlyBirdCommits / totalCommits > 0.15 ? '🌅 早起鸟，比太阳还勤快' :
                  earlyBirdCommits >= 10 ? '☀️ 偶尔早起' : '😴 不是早起型',
    
    lateNightCount: lateNightCommits,

    shortestCommit,
    longestCommit,
    topKeywords,
    emojiStats,
    emotionIndex: { exclamation: totalExclamation, question: totalQuestion },
    commitTypeDistribution: commitTypeMap,

    topFileTypes,
    topChangedFiles,
    fileChanges: {
      added: totalFilesAdded,
      deleted: totalFilesDeleted,
      net: totalFilesAdded - totalFilesDeleted
    },

    topCollaborators,
    topCollaboratorsTip,
    mergeCommits: totalMergeCommits,
    revertCommits: totalRevertCommits,
    hotfixCount: totalHotfixCount,
    hotfixRate: Number((totalHotfixCount / totalCommits).toFixed(3)),
    bigRefactorCount: totalBigRefactorCount,
    bigRefactorCountTip,
    branchCount: totalBranchCount,
    branchesCreated: totalBranchesCreated,
    branchesCreatedTip,

    topProjects,
    allProjects: repos.map(r => r.name),

    badges,
    annualTitle: {
      title: annualTitle.title,
      desc: annualTitle.desc
    }
  };
}

module.exports = { buildSummary };
