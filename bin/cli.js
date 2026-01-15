#!/usr/bin/env node

/**
 * Git 年度报告生成器 - CLI 入口
 * 用于收集用户输入并启动报告生成
 */

const { execSync } = require('child_process');
const generate = require('../lib/generate');

/**
 * 从本地 git 配置获取用户信息
 * @returns {{ name: string, email: string }} 用户名和邮箱
 */
function getGitUser() {
  try {
    const name = execSync('git config user.name', { encoding: 'utf8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf8' }).trim();
    return { name, email };
  } catch (e) {
    return { name: '', email: '' };
  }
}

async function init() {
  const inquirer = (await import('inquirer')).default;
  const gitUser = getGitUser();
  
  console.log('\n🚀 Git 年度报告生成器\n');

  const answers = await inquirer.prompt([
    {
      name: 'author',
      message: '你的 Git 用户名或邮箱 (用于过滤你的提交):',
      default: gitUser.name || gitUser.email,
      validate: v => v.trim() ? true : '请输入你的 Git 用户名或邮箱'
    },
    {
      name: 'repoRoot',
      message: '你的 Git 仓库根目录路径:',
      default: process.cwd()
    },
    {
      name: 'since',
      message: '统计开始日期 (YYYY-MM-DD):',
      default: `${new Date().getFullYear()}-01-01`
    },
    {
      name: 'until',
      message: '统计结束日期 (YYYY-MM-DD):',
      default: `${new Date().getFullYear()}-12-31`
    }
  ]);

  const config = {
    author: answers.author,       // Git 作者名/邮箱，用于过滤提交
    repoRoot: answers.repoRoot,   // 仓库根目录
    since: answers.since,         // 统计开始日期
    until: answers.until,         // 统计结束日期
    output: 'report.json'         // 输出文件名
  };

  await generate(config);

  console.log('\n✅ report.json 已生成!');
  console.log('📊 现在你可以把 report.json 喂给你的 H5 年度报告页面');
  console.log('🎉 生成完成，祝你年度报告刷屏朋友圈!\n');
}

init();
