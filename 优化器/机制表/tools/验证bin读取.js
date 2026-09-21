'use strict';
/*
 * bin 读取器验证：tools/bin读取器.js 读 build/flat.bin → 与 build/flat.json（压平器输出）逐字段 diff。
 * 全等 = reader 正确（struct 偏移/字典解码/enum 反查全对），这是解释器能正确消费 bin 的前置证明。
 * 用法：node tools/验证bin读取.js
 */
const fs = require('fs');
const path = require('path');
const { 读取bin } = require('./bin读取器.js');

const D = path.resolve(__dirname, '..');
const flat = JSON.parse(fs.readFileSync(path.join(D, 'build', 'flat.json'), 'utf8'));
const 读出 = 读取bin(path.join(D, 'build', 'mechanisms.bin'));

let 错 = 0;
const 报 = (w, x, y) => { if (JSON.stringify(x) !== JSON.stringify(y)) { console.log(`  ✗ ${w}\n    flat.json: ${JSON.stringify(x).slice(0, 200)}\n    读出bin : ${JSON.stringify(y).slice(0, 200)}`); 错++; } };

console.log('=== 根表 ===');
报('version', flat.version, 读出.version);
报('charCount', flat.charCount, 读出.charCount);
报('names 字典', flat.names, 读出.names);

console.log('=== records 逐字段 ===');
for (let r = 0; r < flat.records.length; r++) {
  const a = flat.records[r], b = 读出.records[r];
  const tag = `records[${r}].id=${a.id}`;
  for (const k of ['id', 'rarity', 'element', 'role', 'cd', 'hp', 'atk', 'atkMag', 'ultMag', 'seq', 'usedCmds', 'exclCount', '_pad3']) 报(`${tag}.${k}`, a[k], b[k]);
  报(`${tag}.exclTypes`, a.exclTypes, b.exclTypes);
  报(`${tag}.mnc`, a.mnc, b.mnc);
  报(`${tag}.slotInit`, a.slotInit, b.slotInit);
  报(`${tag}.flags`, a.flags, b.flags);
  if (a.cmds.length !== b.cmds.length) { console.log(`  ✗ ${tag}.cmds 长度 ${a.cmds.length} ≠ ${b.cmds.length}`); 错++; continue; }
  for (let c = 0; c < a.cmds.length; c++) {
    const ca = a.cmds[c], cb = b.cmds[c];
    if (JSON.stringify(ca) !== JSON.stringify(cb)) {
      console.log(`  ✗ ${tag}.cmds[${c}]\n    flat: ${JSON.stringify(ca)}`);
      console.log(`    bin : ${JSON.stringify(cb)}`);
      错++;
      if (错 > 20) { console.log('  ……错误过多，中止'); process.exit(1); }
    }
  }
}

console.log(`\n=== 结果: ${错 === 0 ? '✅ bin 读取与 flat.json 逐字段全等（reader 正确）' : `✗ ${错} 处差异`} ===`);
process.exit(错 === 0 ? 0 : 1);
