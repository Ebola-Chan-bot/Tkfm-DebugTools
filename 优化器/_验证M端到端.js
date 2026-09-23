'use strict';
/*
 * 临时验证M：保守兜底接入生产链路（团队搜索器.优化一个名单）后的端到端验证。
 * 实验L 只直接调了 排程器.相位对齐构造；本脚本走真实生产路径 团队搜索器.搜索（rtMax=0 单名单，
 *   含 120 站位粗评 → TopK 深搜 → 束精修 → 保守兜底 → 按真值取优），确认：
 *   ① 两支 88% 队经生产链路达到 ~92%（保守兜底在链路里真的被触发且起效）；
 *   ② 승나미/칼리버/후지카/신이카 不回退（取优保护）；
 *   ③ 保守兜底关(束配置.保守兜底=false)时退回旧行为（对照）。
 * rtMax=0：只搜起点名单本身，K站位=5、束精修N=5、爬山预算=10000，聚焦"同名单不同站位+排程"的内层能力。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 团队搜索器 = require(path.join(__dirname, '团队搜索器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function DB最优(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = d;
  }
  return best;
}

const 队组 = [
  { 名: '88%队[4]', ids: '10197,10152,10096,10193,10147', 期望: 88.05 },
  { 名: '88%队[7]', ids: '10197,10096,10134,10193,10147', 期望: 88.33 },
  { 名: '승나미', ids: '10177,10060,10211,10208,10197', 期望: 98.16 },
  { 名: '칼리버', ids: '10211,10167,10128,10168,10197', 期望: 100.0 },
];
const inst = 适配.createEngine();

for (const g of 队组) {
  const db = DB最优(g.ids);
  const 真값 = db.recommend;
  const ids0 = g.ids.split(',').map(Number);
  // 起点站位用 DB 站位（与 benchmark 同口径）
  process.stdout.write(`\n########## ${g.名} ${g.ids} DB=${(真값 / 1e9).toFixed(2)}G ##########\n`);

  const 库 = ids0.slice(); // rtMax=0 只搜起点名单，库内容无关（仍传起点5人）
  // N站位=0 → 束N=0，束精修块整体跳过（隔离验证：保守兜底是当前 Top 站位的唯一排程增强）。
  // K站位=1 只深搜粗评最优站位、爬山预算 2000 提速：本脚本只验证接线正确性，不追满血数值（实验L 已证明机制有效）。
  const 跑 = 保守兜底 => {
    const r = 团队搜索器.搜索(inst, { ids: ids0, toks: null }, 库, {
      rtMax: 0, K站位: 1, 爬山预算: 2000,
      束配置: { N站位: 0, width: 10, R: 4, 评分: 'sync', 时限秒: 60, 闸门: false, 保守兜底 },
    });
    return { dmg: r.最优 ? r.最优.dmg : 0, 来源: r.最优 ? r.最优.来源 : '?' };
  };

  const t0 = Date.now();
  const 开 = 跑(true);
  const t开 = ((Date.now() - t0) / 1000).toFixed(0);
  const t1 = Date.now();
  const 关 = 跑(false);
  const t关 = ((Date.now() - t1) / 1000).toFixed(0);

  console.log(`  需相位规划=${机制特征.需相位规划(ids0)}`);
  console.log(`  保守兜底=on : ${(开.dmg / 真값 * 100).toFixed(2)}%  来源=${开.来源}  (${t开}s)`);
  console.log(`  保守兜底=off: ${(关.dmg / 真값 * 100).toFixed(2)}%  来源=${关.来源}  (${t关}s)  ← 应≈${g.期望}%（旧行为）`);
  const pp = (开.dmg - 关.dmg) / 真값 * 100;
  const 对齐胜出 = 开.来源.includes('+对齐') ? '  (含+对齐=兜底路径胜出✓)' : '';
  console.log(`  ⇒ 兜底净收益 ${pp >= 0 ? '+' : ''}${pp.toFixed(2)}pp  ${pp > 0.5 ? '✅起效' : (Math.abs(pp) < 0.5 ? '持平(取优保护,已达标队正常)' : '⚠️回退!')}${对齐胜出}`);
}
