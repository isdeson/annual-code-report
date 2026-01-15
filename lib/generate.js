/**
 * Git 年度报告生成器 - 核心生成逻辑
 * 负责扫描仓库、收集数据、生成报告
 */

const fs = require("fs-extra");
const path = require("path");

const { analyzeLocalRepo } = require("./gitLocal");
const { buildSummary } = require("./metrics");

/**
 * 判断目录是否为 git 仓库
 * @param {string} dir - 目录路径
 * @returns {Promise<boolean>}
 */
async function isGitRepo(dir) {
  return fs.pathExists(path.join(dir, ".git"));
}

/**
 * 递归查找所有 git 仓库
 * 找到 .git 目录后不再往下递归，避免扫描子模块
 * @param {string} dir - 起始目录
 * @param {string[]} repos - 已找到的仓库列表
 * @returns {Promise<string[]>} 仓库路径列表
 */
async function findGitRepos(dir, repos = []) {
  if (await isGitRepo(dir)) {
    repos.push(dir);
    return repos;
  }
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      // 跳过隐藏目录和 node_modules
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const full = path.join(dir, entry);
      const stat = await fs.stat(full);
      if (stat.isDirectory()) {
        await findGitRepos(full, repos);
      }
    }
  } catch (e) { /* 忽略权限错误 */ }
  return repos;
}

/**
 * 生成年度报告
 * @param {Object} config - 配置对象
 * @param {string} config.author - Git 作者名/邮箱
 * @param {string} config.repoRoot - 仓库根目录
 * @param {string} config.since - 开始日期
 * @param {string} config.until - 结束日期
 * @param {string} config.output - 输出文件名
 */
async function generate(config) {
  const open = (await import("open")).default;
  const repos = [];

  console.log("🔍 正在扫描 Git 仓库...");
  const gitRepos = await findGitRepos(config.repoRoot);
  console.log(`📁 找到 ${gitRepos.length} 个仓库\n`);

  // 逐个分析仓库
  for (const repoPath of gitRepos) {
    const name = path.relative(config.repoRoot, repoPath) || path.basename(repoPath);
    console.log("🔍 分析中:", name);
    const data = await analyzeLocalRepo(repoPath, config.since, config.until, config.author);
    if (data) repos.push(data);
  }

  // 汇总所有仓库数据
  const summary = buildSummary(repos);

  // 构建最终报告
  const report = {
    generatedAt: new Date().toISOString(),  // 报告生成时间
    range: { since: config.since, until: config.until },  // 统计时间范围
    author: config.author,  // 统计的作者
    summary  // 汇总数据
  };

  await fs.writeJson(config.output, report, { spaces: 2 });

  // 生成 base64 编码的报告数据，拼接到 H5 页面 URL
  const jsonStr = JSON.stringify(report);
  const base64 = Buffer.from(jsonStr).toString("base64");
  const reportUrl = `https://your-report-site.com/#/report?data=${encodeURIComponent(base64)}`;

  console.log("🌍 正在打开年度报告页面...");
  await open(reportUrl);
}

module.exports = generate;
