// Task B深诊: 94.85队窗对齐构造toks vs DB解toks 的结构差异 + 爬山起点/预算/K敏感性
//   已知(实证Xvar): Sdb={5,9,13}在族内(dmg65.7%第2/198), 显式族爬山30000→94.85%, DB解直接爬山→100.11%
//   目的: 定位 94.85% 卡在什么结构差异上, 决定通用修法(序重排邻域/多起点/预算)
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const 根 = path.resolve(__dirname, '..');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(根, '../tenkaassist_data/data/data.json'))).toString('utf8'));
const ids = (process.argv[2] || '10197,10152,10096,10177,10163').split(',').map(Number);
const bonds = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
const wantKey = [...ids].sort((a, b) => a - b).join(' ');
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === wantKey);
const DB真值 = Number(rec.recommend);
const dbToks = 排程.解析指令集(inst, ids, rec.description, bonds);
const Sdb = [...new Set(Array.from({ length: 65 }, (_, i) => i).filter(i => dbToks[i].act === '궁').map(i => (i / 5 | 0) + 1))].sort((a, b) => a - b);

function 比较(toks, 标签) {
  let 궁차 = 0, 평방차 = 0, 순차 = 0;
  const 궁回合 = new Set();
  for (let i = 0; i < 65; i++) {
    if (toks[i].act === '궁') 궁回合.add((i / 5 | 0) + 1);
    if (toks[i].act !== dbToks[i].act) { if (toks[i].act === '궁' || dbToks[i].act === '궁') 궁차++; else 평방차++; }
  }
  // 回合内序差异: 每回合5人的 idx 排列是否相同
  for (let t = 0; t < 13; t++) {
    const a = toks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('');
    const b = dbToks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('');
    if (a !== b) 순차++;
  }
  const dmg = 排程.重放(inst, ids, toks, bonds);
  console.log(`  ${标签}: dmg=${(dmg / DB真值 * 100).toFixed(2)}% 궁差异=${궁차} 평/방差异=${평방차} 回合内序差异=${순차}/13 궁回合集{${[...궁回合].sort((x,y)=>x-y).join(',')}}`);
  return dmg;
}

console.log(`DB真值=${DB真值.toLocaleString()} Sdb={${Sdb.join(',')}}\n`);
console.log('== 结构差异(vs DB解) ==');
比较(dbToks, 'DB解    ');
// 生产窗对齐构造(全部, 取Sdb命中的憋/准点两族)
const 全 = 排程.窗对齐构造(inst, ids, bonds, { 全部: true });
const SdbKey = Sdb.join(',');
const hits = 全.filter(c => [...new Set(c.S)].sort((a, b) => a - b).join(',') === SdbKey);
hits.forEach((c, i) => 比较(c.toks, `构造${i}(Sdb,${c.buff窗 ? '憋' : '准'})`));

console.log('\n== 爬山起点×预算/K 敏感性(真值%DB) ==');
const 起 = hits.find(c => c.buff窗) || hits[0];
for (const [预算, K] of [[30000, 8], [90000, 8], [90000, 16], [90000, 32], [150000, 16]]) {
  const t0 = Date.now();
  const h = 排程.爬山(inst, ids, 起.toks, bonds, 预算, null, null, K);
  console.log(`  构造起点 预算=${预算} K=${K}: ${(h.dmg / DB真值 * 100).toFixed(2)}%  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log('完成');
