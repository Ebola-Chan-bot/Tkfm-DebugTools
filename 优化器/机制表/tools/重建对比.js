/**
 * 重建对比（阶段2c 验收）——手工表（src/*.json）与抽取器生成表（生成/*.json）分别压平后逐字段 diff。
 * 语义等价判据：两张表压出的 CharacterRecord（mnc/slotInit/flags/exclTypes/usedCmds + 每条 Cmd 的 op/tgt/cond/参数）
 * 必须完全同形。允许的差异：无（形态差异应在抽取器翻译期归一，例如 switch(L)→LibIf 展开与手工 perLib 同构）。
 * 用法：node tools/重建对比.js [--id 10012,10141]
 */
const path = require('path');
const fs = require('fs');
const F = require('./flatten_core.js');
const 抽 = require(path.join(F.D, '机制抽取器.js'));
const 引擎 = require(path.join(F.D, '..', '引擎适配.js'));

// 默认骨架归一化：手工表常显式写出与引擎缺省同形的钩子（如 ultimate:[{ultLogic}]），
// 抽取器则判默认后省略字段。压平前对两边统一剔除默认骨架 → 同走"无段→装默认钩子"路径，diff 只看真实差异。
function 归一化(表) {
  const out = JSON.parse(JSON.stringify(表));
  if (!out.钩子) return out;
  for (const k of Object.keys(out.钩子)) {
    if (抽.是默认骨架(k, out.钩子[k])) delete out.钩子[k];
  }
  return out;
}

const args = process.argv.slice(2);
const i = args.indexOf('--id');
const ids = i >= 0 ? args[i + 1].split(',').map(Number) : [10012, 10141, 10177, 10188];

// 同一字典上下文：先按手工表建字典，再在同一字典下压两边 → nameIdx 可比
const dict = F.读字典();

function 压(文件, dict) {
  const src = 归一化(JSON.parse(fs.readFileSync(文件, 'utf8')));
  return F.压平角色(src, dict, 引擎);
}

function diff(a, b, 路径, out) {
  if (a === b) return;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') { out.push(`${路径}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); return; }
  if (Array.isArray(a) !== Array.isArray(b)) { out.push(`${路径}: 数组性不同`); return; }
  if (Array.isArray(a)) {
    if (a.length !== b.length) { out.push(`${路径}: 长度 ${a.length} ≠ ${b.length}`); return; }
    for (let k = 0; k < a.length; k++) diff(a[k], b[k], `${路径}[${k}]`, out);
    return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) diff(a[k], b[k], `${路径}.${k}`, out);
}

let 全绿 = true;
for (const id of ids) {
  const 手工 = path.join(F.SRC, id + '.json');
  const 生成 = path.join(F.D, '生成', id + '.json');
  if (!fs.existsSync(生成)) { console.log(`${id}: 无生成表 ${生成}`); 全绿 = false; continue; }
  // 手工表先压（字典增量归属手工侧），生成表用同一字典 → 同 nameIdx
  const ra = 压(手工, dict);
  const rb = 压(生成, dict);
  // 截断 pad 区（usedCmds 之后的 None 填充必须一致，也一并 diff）
  const out = [];
  diff(ra, rb, `rec${id}`, out);
  if (out.length === 0) console.log(`${id}: ✅ 压平 bit 级同形（usedCmds=${ra.usedCmds}）`);
  else {
    全绿 = false;
    console.log(`${id}: ❌ ${out.length} 处差异（首 20）`);
    out.slice(0, 20).forEach(x => console.log('   ' + x));
  }
}
console.log(全绿 ? '\n===== 全部同形 =====' : '\n===== 存在差异 =====');
process.exit(全绿 ? 0 : 1);
