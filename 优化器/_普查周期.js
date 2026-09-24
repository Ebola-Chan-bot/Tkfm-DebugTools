'use strict';
/* 临时普查：191 角色机制表中 CmpGTMod(Gated) 周期条件与负size CD buff 的可静态提取性 */
const path = require('path');
const 基 = 'D:/张天夫/TKFM/Tkfm-DebugTools/优化器';
const 适配 = require(path.join(基, '引擎适配.js'));
const 机制特征 = require(path.join(基, '机制特征.js'));
const d = 适配.机制数据();
const 周期角色 = [], cdBuff角色 = [];
for (const rec of d.records) {
  const cmds = 机制特征.展开lib5(rec.cmds);
  const mods = new Set();
  const negFix = [];
  for (const c of cmds) {
    if (c.cond && (c.cond.kind === 'CmpGTMod' || c.cond.kind === 'CmpGTModGated')) {
      const a = c.cond.a / 1e4, b = c.cond.b / 1e4, r = c.cond.nameIdx / 1e4;
      mods.add('(t+' + a + ')%' + b + '=' + r);
    }
    for (const p of (c.ps || []))
      if (p.tag === 'Fix' && p.i < 0 && p.i >= -60000 && p.i % 10000 === 0) negFix.push(p.i / 1e4);
  }
  if (mods.size) 周期角色.push(rec.id + ' {' + [...mods].join('; ') + '}');
  if (negFix.length) cdBuff角色.push(rec.id + ' [' + negFix.join(',') + ']');
}
console.log('===== 周期条件角色 (' + 周期角色.length + ') =====');
console.log(周期角色.join('\n'));
console.log('\n===== 含负整数定点(可能是CD减buff/공퍼증-500类)角色 (' + cdBuff角色.length + ') =====');
console.log(cdBuff角色.join('\n'));
