// _profile行级.js —— 行级 self-time 热点解析（R3 定靶用）
// 用法：先 node --cpu-prof --cpu-prof-interval=50 --cpu-prof-dir=. _profile重放L2.js 生成 .cpuprofile
//       再 node _profile行级.js [函数名前缀...] 输出行级 self 排名
// 只统计指定函数（默认 addBuff/buff/getBuffSizeList/getBossBuffSizeList）内部行号分布
'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.cpuprofile'));
if (!files.length) { console.log('无 .cpuprofile'); process.exit(0); }
files.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
const 目标 = process.argv.slice(2).length ? process.argv.slice(2) : ['addBuff', 'buff', 'getBuffSizeList', 'getBossBuffSizeList'];
const p = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
const byId = new Map();
for (const n of p.nodes) byId.set(n.id, n);
const self = new Map();   // fn|line → us
const 名map = new Map();  // fn|line → url line for source lookup
for (let i = 0; i < p.samples.length; i++) {
  const n = byId.get(p.samples[i]);
  if (!n) continue;
  const cf = n.callFrame;
  const fn = cf.functionName || '(anon)';
  if (!目标.some(t => fn === t || fn.startsWith(t))) continue;
  const k = fn + ':' + (cf.lineNumber + 1);
  self.set(k, (self.get(k) || 0) + (p.timeDeltas[i] || 0));
  名map.set(k, cf.url);
}
const 排序 = [...self.entries()].sort((a, b) => b[1] - a[1]);
const 总 = 排序.reduce((a, b) => a + b[1], 0);
console.log(`file=${files[0]} 目标函数行级 self 合计=${(总 / 1000).toFixed(0)}ms`);
for (const [k, us] of 排序.slice(0, 40)) console.log(`  ${(us / 1000).toFixed(0).padStart(5)}ms ${(us / 总 * 100).toFixed(1).padStart(5)}%  ${k}`);
