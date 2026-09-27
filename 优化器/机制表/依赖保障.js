'use strict';
// 依赖保障：require 第三方包失败（node_modules 不随 git 走，克隆后首次运行必缺）时自动 npm install 再重试，不让 "Cannot find module" 直接冒泡
// 安装目录 = 本文件所在目录（机制表/，package.json 所在处），一次 npm install 会把 package.json 里的全部依赖一并装齐
// npm 本身不可用或 registry 不可达时抛出带手动补救指引的错误（此时自动安装无解，只能人工介入）
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 找 npm 入口：优先用当前 node.exe 同目录的 npm-cli.js（这台机器 node 由文件关联启动、npm 不在 PATH，但配套 npm 一定在 node.exe 旁边），找不到再退回 PATH 里的 npm
function 找npm() {
   const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
   if (fs.existsSync(cli)) return { 命令: process.execPath, 前缀: [cli], 走shell: false };
   return { 命令: 'npm', 前缀: [], 走shell: process.platform === 'win32' };   // Windows 的 npm 是 npm.cmd，spawnSync 按文件名直找会 ENOENT，必须经 shell 解析
}

function 需(包名) {
   try {
      return require(包名);
   } catch (e) {
      // 只兜"包本身找不到"这一种：包内部缺子依赖或加载报错时原样抛出，避免把深层故障误判成缺包而反复重装
      if (e.code !== 'MODULE_NOT_FOUND' || !e.message.includes(`'${包名}'`)) throw e;
      console.log(`[依赖保障] 缺少第三方包 ${包名}，正在自动执行 npm install ...`);
      const npm = 找npm();
      const r = spawnSync(npm.命令, [...npm.前缀, 'install', '--no-audit', '--no-fund'], { cwd: __dirname, stdio: 'inherit', shell: npm.走shell });
      if (r.error) throw new Error(`[依赖保障] 自动安装失败：启动 npm 失败（${r.error.message}）。请在 ${__dirname} 手动执行 npm install 后重试`);
      if (r.status !== 0) throw new Error(`[依赖保障] 自动安装失败：npm install 退出码 ${r.status}。请在 ${__dirname} 手动执行 npm install 后重试`);
      return require(包名);
   }
}

module.exports = { 需 };
