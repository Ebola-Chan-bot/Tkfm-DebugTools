'use strict';
/*
 * 临时实验D：cond 填充就位阈值 θ 扫描（승나미 / 칼리버 / 얀코D 三队代表）。
 * 直接束搜索（w=10,R=4,时限600）× 多 θ，看：
 *   승나미(点灯叠层, 诊断实锤 DB前缀 s=1 被剪) —— θ 应把DB路径续航抬高、束%回升（sync=84.43%）
 *   칼리버(常驻, sync=100%) / 얀코D(同名单换位难例, sync=88.01%) —— θ 不应拉低
 * 用法：node _实验D阈值扫描.js [θ逗号列表，默认0.3,0.5,0.7]
 * 三队串行、每 θ 每队一次束搜索 → 单次 ~20-30s，总 ~几分钟。BENCH_CLIMB 关（只看束，隔离填充效果）。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);
const 目标 = [
  { 名: '승나미', ids: [10177, 10060, 10211, 10208, 10197] },
  { 名: '칼리버', ids: [10211, 10167, 10128, 10168, 10197] },
  { 名: '얀코D', ids: [10197, 10167, 10168, 10128, 10211] },
];

function 加载DB队() {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const getCharacter = 适配.角色数据().getCharacter;
  const 可模拟 = id => { const c = getCharacter(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const m = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const k = ids.join(',');
    const 旧 = m.get(k);
    if (!旧 || d.recommend > 旧.recommend) m.set(k, { 队: d.name || k, ids, description: d.description, recommend: d.recommend });
  }
  return m;
}

const DB = 加载DB队();
const θ组 = (process.argv[2] || '0.3,0.5,0.7').split(',').map(Number);
const inst = 适配.createEngine();

// 基线：sync
console.log('θ组 =', θ组.join(','), '\n');
for (const g of 目标) {
  const d = DB.get(g.ids.join(','));
  if (!d) { console.log(g.名, '未在DB找到'); continue; }
  const 真값 = 排程器.重放(inst, d.ids, 排程器.解析指令集(inst, d.ids, d.description, BOND), BOND);
  const bs = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  console.log(`${g.名}\tDB=${(真값 / 1e9).toFixed(2)}G\tsync束=${(bs.dmg / 真값 * 100).toFixed(2)}% (${(bs.dmg / 1e9).toFixed(2)}G)`);
  for (const θ of θ组) {
    const bc = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'cond', cond阈值: θ, 时限秒: 600 });
    const δ = (bc.dmg - bs.dmg) / 真값 * 100;
    console.log(`\t\tcond θ=${θ}\t束=${(bc.dmg / 真값 * 100).toFixed(2)}% (${(bc.dmg / 1e9).toFixed(2)}G) ${δ >= 0 ? '+' : ''}${δ.toFixed(2)}pp`);
  }
  console.log('');
}
