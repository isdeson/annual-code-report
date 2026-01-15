/**
 * Git 本地仓库分析模块
 * 负责从本地 Git 仓库提取提交统计数据
 */

const path = require('path');
const simpleGit = require('simple-git');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(isoWeek);

/** 匹配 emoji 表情的正则 */
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;

/** 匹配 conventional commit 类型的正则 */
const commitTypeRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\(.+\))?:/i;

/**
 * 从文本中提取关键词
 * @param {string} text - 输入文本
 * @returns {string[]} 关键词数组
 */
function extractKeywords(text) {
  const cleaned = text.replace(emojiRegex, ' ').replace(/[^\w\u4e00-\u9fa5]/g, ' ');
  return cleaned.split(/\s+/).filter(w => w.length >= 2);
}

/**
 * 计算最长摸鱼天数（两次提交之间的最大间隔）
 * @param {string[]} sortedDays - 按日期排序的日期数组
 * @returns {number} 最长间隔天数
 */
function calcLongestGap(sortedDays) {
  if (sortedDays.length < 2) return 0;
  let maxGap = 0;
  for (let i = 1; i < sortedDays.length; i++) {
    const gap = dayjs(sortedDays[i]).diff(dayjs(sortedDays[i - 1]), 'day') - 1;
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

/**
 * 计算最长工作时间段（同一天内首次和末次提交的时间跨度）
 * @param {Object[]} commits - 提交记录数组
 * @returns {{ day: string, minutes: number, hours: number }} 最长工作时间段信息
 */
function calcLongestWorkSession(commits) {
  const byDay = {};
  commits.forEach(c => {
    const day = dayjs(c.date).format('YYYY-MM-DD');
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(dayjs(c.date));
  });
  let maxSpan = 0, maxSpanDay = null;
  Object.entries(byDay).forEach(([day, times]) => {
    if (times.length < 2) return;
    times.sort((a, b) => a - b);
    const span = times[times.length - 1].diff(times[0], 'minute');
    if (span > maxSpan) { maxSpan = span; maxSpanDay = day; }
  });
  return { day: maxSpanDay, minutes: maxSpan, hours: Number((maxSpan / 60).toFixed(2)) };
}

/**
 * 分析单个本地 Git 仓库
 * @param {string} repoPath - 仓库路径
 * @param {string} since - 开始日期
 * @param {string} until - 结束日期
 * @param {string} author - 作者名/邮箱（用于过滤提交）
 * @returns {Object|null} 仓库统计数据，无提交时返回 null
 */
async function analyzeLocalRepo(repoPath, since, until, author) {
  const git = simpleGit(repoPath);
  const name = path.basename(repoPath);

  // 获取指定作者的所有提交（含文件变更统计）
  const logRaw = await git.raw([
    'log', `--since=${since}`, `--until=${until}`, `--author=${author}`,
    '--pretty=format:%H|%aI|%s',
    '--numstat'
  ]);

  if (!logRaw.trim()) return null;

  // 获取该仓库所有提交者（用于协作者统计）
  const allAuthorsRaw = await git.raw([
    'log', `--since=${since}`, `--until=${until}`,
    '--pretty=format:%an|%ae'
  ]);
  const collaboratorMap = {};
  allAuthorsRaw.split('\n').filter(Boolean).forEach(line => {
    const [authorName, authorEmail] = line.split('|');
    // 排除自己，统计其他协作者
    if (!authorName.toLowerCase().includes(author.toLowerCase()) && 
        !authorEmail.toLowerCase().includes(author.toLowerCase())) {
      const key = `${authorName} <${authorEmail}>`;
      collaboratorMap[key] = (collaboratorMap[key] || 0) + 1;
    }
  });
  const collaborators = Object.entries(collaboratorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, commits]) => ({ name, commits }));

  // 解析提交记录
  const commits = [];
  const fileChangeCount = {};  // 文件修改次数统计
  const fileExtCount = {};     // 文件类型统计
  let totalInsertions = 0, totalDeletions = 0;
  let filesAdded = 0, filesDeleted = 0;
  const commitStats = {};      // 每个 commit 的行数统计

  const lines = logRaw.split('\n');
  let currentCommit = null;

  for (const line of lines) {
    if (line.includes('|')) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        currentCommit = { hash: parts[0], date: parts[1], message: parts.slice(2).join('|') };
        commits.push(currentCommit);
        commitStats[currentCommit.hash] = { insertions: 0, deletions: 0 };
      }
    } else if (line.trim() && currentCommit) {
      // 解析 numstat 格式: 新增行数\t删除行数\t文件名
      const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (match) {
        const ins = match[1] === '-' ? 0 : parseInt(match[1]);
        const del = match[2] === '-' ? 0 : parseInt(match[2]);
        const file = match[3];
        totalInsertions += ins;
        totalDeletions += del;
        commitStats[currentCommit.hash].insertions += ins;
        commitStats[currentCommit.hash].deletions += del;
        fileChangeCount[file] = (fileChangeCount[file] || 0) + 1;
        const ext = path.extname(file);
        const extKey = ext || path.basename(file);  // 无扩展名时用文件名
        fileExtCount[extKey] = (fileExtCount[extKey] || 0) + 1;
      }
    }
  }

  if (!commits.length) return null;

  // 获取文件新增/删除统计
  try {
    const diffTree = await git.raw([
      'log', `--since=${since}`, `--until=${until}`, `--author=${author}`,
      '--pretty=format:', '--name-status'
    ]);
    diffTree.split('\n').forEach(l => {
      if (l.startsWith('A\t')) filesAdded++;
      if (l.startsWith('D\t')) filesDeleted++;
    });
  } catch (e) { /* 忽略错误 */ }

  const totalCommits = commits.length;
  const dateSet = new Set();
  const dailyCommits = {}, weeklyCommits = {}, monthlyCommits = {};
  const quarterlyCommits = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const hourDistribution = Array(24).fill(0);   // 24小时分布
  const weekDistribution = Array(7).fill(0);    // 星期分布
  let night = 0, weekendCommits = 0, weekdayCommits = 0, earlyBird = 0, lateNight = 0;
  let exclamationCount = 0, questionCount = 0;

  // 遍历提交，统计各维度数据
  commits.forEach(c => {
    const t = dayjs(c.date);
    const day = t.format('YYYY-MM-DD');
    const week = t.isoWeek() + '-' + t.year();
    const month = t.format('YYYY-MM');
    const quarter = Math.ceil((t.month() + 1) / 3);
    const hour = t.hour();
    const dayOfWeek = t.day();

    dateSet.add(day);
    dailyCommits[day] = (dailyCommits[day] || 0) + 1;
    weeklyCommits[week] = (weeklyCommits[week] || 0) + 1;
    monthlyCommits[month] = (monthlyCommits[month] || 0) + 1;
    quarterlyCommits[`Q${quarter}`]++;
    hourDistribution[hour]++;
    weekDistribution[dayOfWeek]++;

    // 时间段统计
    if (hour >= 22 || hour <= 6) night++;      // 夜间 (22:00-06:00)
    if (hour >= 6 && hour <= 8) earlyBird++;   // 早起 (06:00-08:00)
    if (hour >= 2 && hour <= 5) lateNight++;   // 深夜 (02:00-05:00)
    if (dayOfWeek === 0 || dayOfWeek === 6) weekendCommits++;
    else weekdayCommits++;

    // 情绪符号统计
    exclamationCount += (c.message.match(/!/g) || []).length;
    questionCount += (c.message.match(/\?/g) || []).length;
  });

  // 计算最长连续提交天数
  const days = [...dateSet].sort();
  let longestStreak = 0, streak = 0, prev = null;
  days.forEach(d => {
    if (!prev) streak = 1;
    else { streak = dayjs(d).diff(dayjs(prev), 'day') === 1 ? streak + 1 : 1; }
    longestStreak = Math.max(longestStreak, streak);
    prev = d;
  });

  // 最早/最晚提交
  const sortedByDate = [...commits].sort((a, b) => new Date(a.date) - new Date(b.date));
  const earliestCommit = { date: sortedByDate[0].date, message: sortedByDate[0].message };
  const latestCommit = { date: sortedByDate[sortedByDate.length - 1].date, message: sortedByDate[sortedByDate.length - 1].message };
  const yearSpanDays = dayjs(latestCommit.date).diff(dayjs(earliestCommit.date), 'day');

  // 最短/最长 commit message
  const sortedByLength = [...commits].sort((a, b) => a.message.length - b.message.length);
  const shortestCommit = { message: sortedByLength[0].message, length: sortedByLength[0].message.length };
  const longestCommit = { message: sortedByLength[sortedByLength.length - 1].message, length: sortedByLength[sortedByLength.length - 1].message.length };

  // 高频关键词统计
  const keywordCount = {};
  commits.forEach(c => extractKeywords(c.message).forEach(w => { keywordCount[w] = (keywordCount[w] || 0) + 1; }));
  const topKeywords = Object.entries(keywordCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));

  // emoji 统计
  const emojiCount = {};
  commits.forEach(c => (c.message.match(emojiRegex) || []).forEach(e => { emojiCount[e] = (emojiCount[e] || 0) + 1; }));
  const emojiStats = Object.entries(emojiCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([emoji, count]) => ({ emoji, count }));

  // commit 类型统计
  const commitTypeCount = {};
  let mergeCommits = 0, revertCommits = 0, hotfixCount = 0;
  commits.forEach(c => {
    const msg = c.message.toLowerCase();
    const match = c.message.match(commitTypeRegex);
    if (match) commitTypeCount[match[1].toLowerCase()] = (commitTypeCount[match[1].toLowerCase()] || 0) + 1;
    if (msg.startsWith('merge')) mergeCommits++;
    if (msg.startsWith('revert')) revertCommits++;
    if (msg.includes('hotfix') || msg.includes('bugfix')) hotfixCount++;
  });

  // 最高产的一天/一周
  const mostProductiveDay = Object.entries(dailyCommits).sort((a, b) => b[1] - a[1])[0];
  const mostProductiveWeek = Object.entries(weeklyCommits).sort((a, b) => b[1] - a[1])[0];

  // 平均提交间隔
  let totalInterval = 0;
  for (let i = 1; i < sortedByDate.length; i++) {
    totalInterval += dayjs(sortedByDate[i].date).diff(dayjs(sortedByDate[i - 1].date), 'hour');
  }
  const avgCommitInterval = sortedByDate.length > 1 ? Number((totalInterval / (sortedByDate.length - 1)).toFixed(2)) : 0;

  const longestGap = calcLongestGap(days);
  const longestWorkSession = calcLongestWorkSession(commits);

  // 最常修改的文件/文件类型
  const topChangedFiles = Object.entries(fileChangeCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([file, count]) => ({ file, count }));
  const topFileTypes = Object.entries(fileExtCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ext, count]) => ({ ext, count }));

  // 平均每次提交改动行数
  const totalLinesChanged = totalInsertions + totalDeletions;
  const avgLinesPerCommit = Number((totalLinesChanged / totalCommits).toFixed(2));

  // 大型重构次数（单次提交超过500行变更）
  let bigRefactorCount = 0;
  Object.values(commitStats).forEach(s => { if (s.insertions + s.deletions > 500) bigRefactorCount++; });

  // 分支数量
  let branchCount = 0;
  try { branchCount = (await git.branch(['-a'])).all.length; } catch (e) { /* 忽略 */ }

  // 项目徽章
  const badges = [];
  if (earlyBird / totalCommits > 0.2) badges.push('🌅 早起鸟');
  if (night / totalCommits > 0.3) badges.push('🦉 夜猫子');
  if (weekendCommits / totalCommits > 0.3) badges.push('💪 周末战士');
  if (longestStreak >= 7) badges.push('🔥 稳定输出');
  if (longestGap >= 14) badges.push('🏖️ 摸鱼王');
  if (lateNight > 10) badges.push('🌙 深夜肝帝');
  if (bigRefactorCount >= 3) badges.push('🔨 重构大师');
  if (mergeCommits > 20) badges.push('🤝 协作达人');

  return {
    name,                        // 项目名称
    commits: totalCommits,       // 总提交次数
    activeDays: dateSet.size,    // 活跃天数
    longestStreak,               // 最长连续提交天数
    insertions: totalInsertions, // 新增代码行数
    deletions: totalDeletions,   // 删除代码行数
    netLines: totalInsertions - totalDeletions, // 净增代码行数
    filesChanged: Object.keys(fileChangeCount).length, // 变更文件数
    hourDistribution,            // 24小时提交分布
    weekDistribution,            // 星期提交分布 (0=周日)
    nightOwlRate: Number((night / totalCommits).toFixed(3)), // 夜猫子比例
    earliestCommit,              // 最早的提交
    latestCommit,                // 最晚的提交
    shortestCommit,              // 字数最少的 commit
    longestCommit,               // 字数最多的 commit
    topKeywords,                 // 高频关键词 Top10
    emojiStats,                  // 表情符号统计 Top10
    topChangedFiles,             // 最常修改的文件 Top10
    weekendVsWeekday: { weekend: weekendCommits, weekday: weekdayCommits, weekendRate: Number((weekendCommits / totalCommits).toFixed(3)) },
    mostProductiveDay: mostProductiveDay ? { date: mostProductiveDay[0], commits: mostProductiveDay[1] } : null,
    mostProductiveWeek: mostProductiveWeek ? { week: mostProductiveWeek[0], commits: mostProductiveWeek[1] } : null,
    avgCommitInterval,           // 平均提交间隔（小时）
    lateNightCount: lateNight,   // 深夜提交次数 (02:00-05:00)
    commitTypeDistribution: commitTypeCount, // Commit 类型分布
    mergeCommits,                // 合并提交次数
    revertCommits,               // 回滚提交次数
    hotfixCount,                 // 热修复次数
    hotfixRate: Number((hotfixCount / totalCommits).toFixed(3)),
    longestGap,                  // 最长摸鱼天数
    emotionIndex: { exclamation: exclamationCount, question: questionCount }, // 情绪指数
    yearSpanDays,                // 年度跨度（天）
    topFileTypes,                // 最常修改的文件类型 Top10
    avgLinesPerCommit,           // 平均每次提交改动行数
    bigRefactorCount,            // 大型重构次数
    branchCount,                 // 分支数量
    earlyBirdCount: earlyBird,   // 早起提交次数 (06:00-08:00)
    badges,                      // 项目徽章
    collaborators,               // 协作者 Top10
    monthlyTrend: Object.entries(monthlyCommits).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count })),
    quarterlyComparison: quarterlyCommits, // 季度对比
    mostProductiveQuarter: Object.entries(quarterlyCommits).sort((a, b) => b[1] - a[1])[0],
    longestWorkSession,          // 最长工作时间段
    fileChanges: { added: filesAdded, deleted: filesDeleted, net: filesAdded - filesDeleted }
  };
}

module.exports = { analyzeLocalRepo };
