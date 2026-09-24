'use strict';
/*
 * _实验M3生产窗对齐.js：直接调生产版 排程器.窗对齐构造（爬山预算模式，含"周期族优先补节拍族"候选选择），
 * 验证与生产接线同路径的效果。可 --队= 单队运行（并行启动用）。
 * 用法: node _实验M3生产窗对齐.js [爬山预算=60000] [谷底=8] [TopK=3] [--队=ids]
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number).join(',');
    if (ids !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = d;
  }
  return best;
}

const 目标 = [
  { 名: '85队얀코', ids: '10197,10060,10177,10193,10208', 现终: 85.16 },
  { 名: '89队얀코', ids: '10197,10060,10177,10193,10211', 现终: 89.74 },
  { 名: '91队얀코', ids: '10197,10152,10196,10177,10147', 现终: 91.70 },
  { 名: '92승나미', ids: '10177,10152,10208,10211,10197', 现终: 91.92 },
  { 名: '92얀코125', ids: '10197,10152,10196,10125,10147', 现终: 92.28 },
  { 名: '92나리', ids: '10202,10212,10133,10210,10072', 现终: 92.91 },
  { 名: '승나미本队(对照)', ids: '10177,10060,10211,10208,10197', 现终: 98.16 },
  { 名: '칼리버(对照)', ids: '10211,10167,10128,10168,10197', 现终: 100.0 },
];
const 队参 = process.argv.find(a => a.startsWith('--队='));
const 过滤 = 队参 ? 队参.slice(4) : null;
const 爬山预算 = Number(process.argv[2]) || 60000;
const 谷底 = Number(process.argv[3]) || 8;
const TopK = Number(process.argv[4]) || 3;

const inst = 适配.createEngine();
for (const g of 目标) {
  if (过滤 && g.ids !== 过滤) continue;
  const db = DB队(g.ids);
  if (!db) { console.log(`${g.名}: DB无记录`); continue; }
  const ids0 = g.ids.split(',').map(Number);
  const DBtoks = 排程器.解析指令集(inst, ids0, db.description, BOND);
  const 真값 = 排程器.重放(inst, ids0, DBtoks, BOND);
  const pct = x => (x / 真값 * 100).toFixed(2) + '%';
  const t0 = Date.now();
  console.log(`\n########## ${g.名} ${g.ids} DB=${(真값 / 1e9).toFixed(3)}G 现终=${g.现终}% 需窗规划=${机制特征.需窗规划(ids0)} ##########`);
  const r = 排程器.窗对齐构造(inst, ids0, BOND, { TopK, 爬山预算, 谷底试探: 谷底 });
  const 提升 = r ? r.dmg / 真값 * 100 - g.现终 : -g.现终;
  console.log(`生产版窗对齐终=${r ? pct(r.dmg) : '0%'} [${r ? r.来源 : '-'}] vs 现终=${g.现终}% → ${提升 > 0.05 ? '★+' + 提升.toFixed(2) + 'pp' : '▼' + 提升.toFixed(2) + 'pp'} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
console.log('\n完成');
