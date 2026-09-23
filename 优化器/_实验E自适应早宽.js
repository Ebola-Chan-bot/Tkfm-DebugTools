'use strict';
/*
 * 临时实验E：机制画像驱动的自适应早期束宽验证。
 * 诊断实锤（_诊断승나미.js）：승나미 DB 前缀在 s=1 跌至第 21 名被 w=10 剪掉，填充续航仅真值 88.2%；
 *   误剪只发生在早期（s1），后续层 DB 前缀根本未被生成。
 * 实验D实锤：cond 就位度判据对点灯闪烁型供给原理上不可见（실현값/potential 恒<0.3），全部退化为 sync。
 * ⇒ 机制特征的正确兑现 = 路由（花多少算力），不是改填充判据：
 *   延迟供给/高机制复杂度队 → 更宽的早期束（束搜索 早期宽度/早期层数 参数，默认关）。
 * 对照组：승나미(84.43%) / 얀코88%队×2 / 칼리버(100%, 不应变慢变差)。
 * 变体：sync w10 基线 / 早宽30层2 / 早宽30层4 / 早宽50层2 / 全程宽20 / 全程宽30。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);

function 加载DB队() {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const getCharacter = 适配.角色数据().getCharacter;
  const 可模拟 = id => { const c = getCharacter(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name || 键, ids, description: d.description, recommend: d.recommend });
  }
  return [...名单.values()].sort((a, b) => b.recommend - a.recommend);
}

// 聚焦 4 支关键队：승나미(点灯叠层难点) / 칼리버(常驻,不应变差) / 两支 얀코88%(同名单换位难例)
const 强队 = 加载DB队();
const inst = 适配.createEngine();
const 목표ids组 = [
  [10177, 10060, 10211, 10208, 10197],   // 승나미덱      DB=31.01G sync束=84.43%
  [10211, 10167, 10128, 10168, 10197],   // 칼리버덱      DB=30.27G sync束=100%
  [10197, 10167, 10168, 10128, 10211],   // 얀코(칼리버同名单换位) DB=29.90G sync束=88.01%
  [10197, 10096, 10134, 10193, 10147],   // 얀코(另一88%队) DB=29.58G sync束=87.73%
];
const 목표 = [];
for (const idsArr of 목표ids组) {
  const d = 强队.find(x => x.ids.join(',') === idsArr.join(','));
  if (d) {
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    if (toks && 排程器.重放(inst, d.ids, toks, BOND) === d.recommend) 목표.push(d);
  }
}
console.log(`目标 ${목표.length} 支：`);
for (const d of 목표) console.log(`  ${d.ids.join(',')}  DB=${(d.recommend / 1e9).toFixed(2)}G`);

const 变体组 = [
  { 名: 'sync基线 w10', opt: { width: 10, R: 4, 评分: 'sync', 时限秒: 600 } },
  { 名: '早宽30层2  ', opt: { width: 10, R: 4, 评分: 'sync', 早期宽度: 30, 早期层数: 2, 时限秒: 600 } },
  { 名: '早宽30层4  ', opt: { width: 10, R: 4, 评分: 'sync', 早期宽度: 30, 早期层数: 4, 时限秒: 600 } },
  { 名: '早宽50层2  ', opt: { width: 10, R: 4, 评分: 'sync', 早期宽度: 50, 早期层数: 2, 时限秒: 600 } },
  { 名: '全程宽20   ', opt: { width: 20, R: 4, 评分: 'sync', 时限秒: 600 } },
  { 名: '全程宽30   ', opt: { width: 30, R: 4, 评分: 'sync', 时限秒: 600 } },
];

// 机制画像（实验A同款聚合）：给每队标记 复杂度/延迟供给者数，验证"该不该加宽"的路由判据
function 队画像(ids) {
  let 复杂 = 0, 延迟 = 0;
  for (const id of ids) {
    const f = 机制特征.画像(id);
    if (!f) continue;
    复杂 += f.注入数 * 2 + f.门控数 + f.叠层数 + f.开关数 + f.周期数;
    if (机制特征.是延迟供给者(id)) 延迟++;
  }
  return { 复杂, 延迟 };
}

for (const d of 목표) {
  const 真 = d.recommend;
  const 像 = 队画像(d.ids);
  console.log(`\n===== ${d.ids.join(',')}  DB=${(真 / 1e9).toFixed(2)}G  机制复杂度=${像.复杂} 延迟供给者=${像.延迟} =====`);
  for (const v of 变体组) {
    const t0 = Date.now();
    const r = 排程器.束搜索(inst, d.ids, BOND, v.opt);
    const 초 = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  ${v.名} 束=${(r.dmg / 真 * 100).toFixed(2)}%  扩${r.扩展数}  ${초}s`);
  }
}
