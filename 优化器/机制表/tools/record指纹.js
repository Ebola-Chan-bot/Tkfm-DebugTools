'use strict';
/*
 * record 指纹工具（增量回归闸门）
 *
 * 动机：每批扩簇改的是四侧共享代码（抽取器/压平器/解释器/schema），老角色 record 理论上也应
 *   保持不变——若压平后某角色的 record 逐字节未变，则其行为数学上必然未变，**无需重跑该角色差分**。
 *   据此把全量回归收缩为"只差分指纹变化的角色"，成本从 21k 场降到几百场，且覆盖比抽查更严（全覆盖）。
 *
 * 用法：
 *   node tools/record指纹.js            建立/覆盖基线 build/record指纹.json
 *   node tools/record指纹.js --对比      与基线对比，打印变化角色（新增/字段变化/消失），退出码 1=有变化
 *   node tools/record指纹.js --变化列表  只输出变化角色的逗号串（喂给 双跑差分.js --角色）
 *
 * 指纹 = sha1(record 的 canonical JSON)，含 id/rarity/…/cmds/flags/exclTypes/mnc/slotInit 全字段。
 *   注意：**names 字典不进指纹**（字典只追加，老角色引用的是索引而非字面串；索引变化会被 record 里的
 *   NameIdx 字段捕获）。但字符名表若整体重排，会体现为大量角色指纹同变——此时应检查 names.txt 是否
 *   被重新生成而非只追加（见 README 字典只追加约定）。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FLAT = path.join(__dirname, '..', 'build', 'flat.json');
const 基线路径 = path.join(__dirname, '..', 'build', 'record指纹.json');

// canonical JSON：键排序（flatc 输出键序理论稳定，排序保险），数组保序（指令序是语义！）
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}
function 指纹(r) { return crypto.createHash('sha1').update(canonical(r)).digest('hex').slice(0, 20); }

function 建表() {
  const flat = JSON.parse(fs.readFileSync(FLAT, 'utf8'));
  const 表 = {};
  for (const r of flat.records) 表[String(r.id)] = 指纹(r);
  return { 生成时间: new Date().toISOString(), names: (flat.names || []).length, 角色数: flat.records.length, 指纹: 表 };
}

const argv = process.argv.slice(2);
const 当前 = 建表();

if (argv.includes('--对比') || argv.includes('--变化列表')) {
  if (!fs.existsSync(基线路径)) {
    console.error('基线不存在：先跑 node tools/record指纹.js 建立基线');
    process.exit(2);
  }
  const 基 = JSON.parse(fs.readFileSync(基线路径, 'utf8'));
  const 变 = [], 增 = [], 减 = [], 同 = [];
  for (const id of Object.keys(当前.指纹)) {
    if (基.指纹[id] === undefined) 增.push(id);
    else if (基.指纹[id] !== 当前.指纹[id]) 变.push(id);
    else 同.push(id);
  }
  for (const id of Object.keys(基.指纹)) if (当前.指纹[id] === undefined) 减.push(id);

  if (argv.includes('--变化列表')) {
    console.log([...变, ...增].sort().join(','));
  }
  console.error(`基线角色 ${基.角色数} 个 / 当前 ${当前.角色数} 个`);
  console.error(`  指纹不变（免差分）: ${同.length}`);
  console.error(`  指纹变化（必须差分）: ${变.length}${变.length ? ' → ' + 变.sort().join(',') : ''}`);
  console.error(`  新增角色（必须差分）: ${增.length}${增.length ? ' → ' + 增.sort().join(',') : ''}`);
  console.error(`  消失角色（需检查）: ${减.length}${减.length ? ' → ' + 减.sort().join(',') : ''}`);
  process.exit((变.length || 增.length || 减.length) ? 1 : 0);
}

fs.writeFileSync(基线路径, JSON.stringify(当前, null, 1));
console.log(`基线已写入 ${基线路径}`);
console.log(`角色 ${当前.角色数} 个 / 字典 ${当前.names} 项`);
console.log('用法：改代码→重压平→ node tools/record指纹.js --对比 ；只差分列出"变化/新增"的角色。');
