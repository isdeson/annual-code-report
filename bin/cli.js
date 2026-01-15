#!/usr/bin/env node

/**
 * Git 年度报告生成器 - CLI 入口
 * 用于收集用户输入并启动报告生成
 */

const { execSync } = require('child_process');
const path = require('path');
const generate = require('../lib/generate');

/**
 * 从 git config 获取所有用户配置
 * @returns {{ name: string, email: string }[]} 用户列表
 */
function getGitUsers() {
  const users = [];
  
  // 获取 global 配置
  try {
    const name = execSync('git config --global user.name', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const email = execSync('git config --global user.email', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (name) users.push({ name, email });
  } catch (e) { /* 忽略 */ }
  
  // 获取 local 配置（当前目录如果是 git 仓库）
  try {
    const name = execSync('git config --local user.name', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const email = execSync('git config --local user.email', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (name && !users.some(u => u.name === name)) users.push({ name, email });
  } catch (e) { /* 忽略 */ }
  
  return users;
}

async function init() {
  const inquirer = (await import('inquirer')).default;
  
  console.log('\n🚀 年度代码报告生成器\n');

  // 获取 git 用户配置
  const users = getGitUsers();
  
  let author;
  if (users.length === 0) {
    const { manualAuthor } = await inquirer.prompt([{
      name: 'manualAuthor',
      message: '请输入你的 Git 用户名或邮箱:',
      validate: v => v.trim() ? true : '请输入你的 Git 用户名或邮箱'
    }]);
    author = manualAuthor;
  } else if (users.length === 1) {
    author = users[0].name;
    console.log(`👤 使用 Git 用户: ${users[0].name} <${users[0].email}>\n`);
  } else {
    const { selectedAuthor } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedAuthor',
      message: '检测到多个 Git 用户，请选择:',
      choices: users.map(u => ({ name: `${u.name} <${u.email}>`, value: u.name }))
    }]);
    author = selectedAuthor;
  }

  const answers = await inquirer.prompt([
    {
      name: 'repoRoot',
      message: '你的 Git 仓库根目录路径（如有多个仓库请选择共同的父级目录）:',
      default: path.dirname(process.cwd())
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
    author: author,                       // Git 作者名，用于过滤提交
    authorName: users.length > 0 ? users.find(u => u.name === author)?.name || author : author,
    authorEmail: users.length > 0 ? users.find(u => u.name === author)?.email || '' : '',
    repoRoot: answers.repoRoot,
    since: answers.since,
    until: answers.until,
    output: 'report.json'
  };

  await generate(config);

  console.log('\n🎉 报告生成完成，请前往 report.json 查看统计数据');
}

init();
