'use strict';
/*
 * 临时诊断2：DB 前缀在不同束宽下的存活深度（评分器升级的关键前置数据）。
 * 问题：实验E 实锤加宽束只 +0.06pp——DB 前缀到底死在哪一层？
 *   若"早宽30层4"能让 DB 前缀活到 s=4 之后 → 中途检查点"补完+爬山重排"方案可行（DB路径在检查点可见）；
 *   若 w30 全程仍早死 → 评分失真比想象更深，需换思路（如改填充器本身而非重排）。
 * 复用 设置.诊断 影子跟踪（只读钩子）：逐层记 db排名/存活。
 * 用法：node _诊断存活.js
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);

function 取DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    const 旧 = 名单.get(idsStr);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(idsStr, { 队: d.name || idsStr, ids, description: d.description, recommend: d.recommend });
  }
  return 名单.get(idsStr);
}

const inst = 适配.createEngine();
const 队组 = [
  { 名: '승나미', ids: '10177,10060,10211,10208,10197', 变体: [
    { 名: 'w10', opt: { width: 10 } },
    { 名: 'w10早宽30层4', opt: { width: 10, 早期宽度: 30, 早期层数: 4 } },
    { 名: 'w30', opt: { width: 30 } },
  ]},
  { 名: '얀코E', ids: '10197,10096,10134,10193,10147', 变体: [
    { 名: 'w10', opt: { width: 10 } },
    { 名: 'w10早宽30层4', opt: { width: 10, 早期宽度: 30, 早期层数: 4 } },
    { 名: 'w30', opt: { width: 30 } },
  ]},
];

for (const g of 队组) {
  const d = 取DB队(g.ids);
  if (!d) { console.log(g.名, '未找到 DB 记录'); continue; }
  const 목표toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  const 真값 = 排程器.重放(inst, d.ids, 목표toks, BOND);
  console.log(`\n########## ${g.名} ${g.ids} DB=${(真값 / 1e9).toFixed(2)}G ##########`);
  for (const v of g.变体) {
    const r = 排程器.束搜索(inst, d.ids, BOND, { R: 4, 评分: 'sync', 时限秒: 600, ...v.opt, 诊断: { 目标toks: 목표toks, 真值: 真값 } });
    // 存活轮廓：每层 db排名，找出死亡层
    let 死层 = -1;
    const 轮廓 = [];
    for (const row of r.诊断报告) {
      if (row.db排名 < 0) { if (死层 < 0) 死层 = row.s; 轮廓.push('✂'); }
      else 轮廓.push(row.存活 ? String(row.db排名) : `[${row.db排名}]`);
    }
    console.log(`-- ${v.名}: 束=${(r.dmg / 真값 * 100).toFixed(2)}% (排名轨迹 前20层: ${轮廓.slice(0, 20).join(' ')})`);
    if (死层 >= 0) console.log(`   DB前缀死亡层 s=${死层} (第${死层 + 1}步)`);
    else console.log('   DB前缀全程存活');
  }
}
