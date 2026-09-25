'use strict';
/*
 * _AB检查点.js —— 整回合序重排 检查点路径 vs fastReplay 路径 A/B
 * 断言：同队同起点，两条路径的 {toks 全文、dmg、轮数} 逐位一致；计时给出实际提速比。
 * 起点构造：贪心基线 toks（与生产兜底路径相同的"动作正确、仅可能序错"形态），另加 DB 正确序对照。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function 载入(名列表) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 出 = [];
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5) continue;
    const 键 = ids.join(',');
    const 命中 = 名列表.find(x => x.ids && x.ids.join(',') === 键) || 名列表.find(x => x.队 && d.name === x.队 && !x.ids);
    if (!命中) continue;
    if (出.some(o => o.键 === 键)) continue;
    出.push({ 队: d.name, ids, 键, description: d.description, recommend: d.recommend });
  }
  return 出;
}

const 目标 = 载入([
  { ids: [10197, 10152, 10096, 10177, 10163] },   // 94队
  { ids: [10213, 10190, 10167, 10164, 10155] },   // 후지카（供给队）
  { ids: [10177, 10152, 10208, 10211, 10197] },   // 승나미
  { ids: [10197, 10060, 10211, 10208, 10197] },   // 승나미덱（DB榜首）
  { ids: [10197, 10096, 10134, 10193, 10147] },   // 含10134 动态字段队
]);

const inst = 适配.createEngine();
let 全一致 = true;
for (const d of 目标) {
  const toks0 = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  if (!toks0) { console.log(`[跳过] ${d.队}[${d.ids}] 解析失败`); continue; }
  // 起点A：贪心基线；起点B：DB 正确序
  const 贪 = 排程器.贪心基线(inst, d.ids, BOND, null);
  const 起点 = [['贪心', 贪 ? 贪.toks : null], ['DB', toks0]];
  for (const [名, s0] of 起点) {
    if (!s0) continue;
    let t = process.hrtime.bigint();
    const A = 排程器.整回合序重排(inst, d.ids, s0, BOND, { 最大轮: 4, 检查点: true });
    const Ams = Number(process.hrtime.bigint() - t) / 1e6;
    t = process.hrtime.bigint();
    const B = 排程器.整回合序重排(inst, d.ids, s0, BOND, { 最大轮: 4, 检查点: false });
    const Bms = Number(process.hrtime.bigint() - t) / 1e6;
    const 同toks = JSON.stringify(A.toks) === JSON.stringify(B.toks);
    const 同dmg = A.dmg === B.dmg;
    if (!同toks || !同dmg || A.轮数 !== B.轮数) 全一致 = false;
    console.log(`${同toks && 同dmg ? '✓' : '✗'} ${d.队}[${d.ids}] 起点=${名} dmg=${A.dmg.toLocaleString()} 轮=${A.轮数} 评估=${A.评估} | 检查点=${Ams.toFixed(0)}ms fastReplay=${Bms.toFixed(0)}ms 提速=${(Bms / Ams).toFixed(2)}x`);
  }
}
console.log(`\n[结论] ${全一致 ? '终值逐位一致，A/B 通过' : '✗ 存在不一致，必须回滚接入'}`);
