'use strict';
/* 临时：从 TKFM-Data-Room 角色文件提取指定角色 id 的简体中文名（prefix+name）。 */
const fs = require('fs');
const path = require('path');
const 目录 = 'D:/天下布魔/TKFM-Data-Room/static/data/unit/general';
const 目标 = process.argv.slice(2).map(Number);
const 结果 = {};
for (const f of fs.readdirSync(目录)) {
  if (!/\.ts$/.test(f) || f === 'index.ts') continue;
  const txt = fs.readFileSync(path.join(目录, f), 'utf8');
  const idm = txt.match(/ID:\s*"(\d+)"/);
  if (!idm) continue;
  const id = +idm[1];
  if (!目标.includes(id)) continue;
  // name 块里 Locale.sc
  const nm = txt.match(/name:\s*\{[\s\S]*?\[Locale\.sc\]:\s*"([^"]*)"/);
  const pf = txt.match(/prefix:\s*\{[\s\S]*?\[Locale\.sc\]:\s*"([^"]*)"/);
  结果[id] = { 前缀: pf ? pf[1] : '', 名: nm ? nm[1] : '?' };
}
for (const id of 目标) {
  const r = 结果[id];
  console.log(`${id} = ${r ? r.前缀 + r.名 : '(未找到)'}`);
}
