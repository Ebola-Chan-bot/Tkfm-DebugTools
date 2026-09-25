'use strict';
/*
 * _测量重复评估.js —— 测量爬山全过程 fastReplay 的 toks 全文重复率（memoization 潜在收益上界）
 * 方法：wrap inst.increment.fastReplay 计数总调用/distinct键；禁用检查点使爬山全走 fastReplay（评估集不变，
 * 检查点只是同键不同前缀实现，重复率测量与之无关）。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function 载入(ids列表) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 出 = [];
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (!ids列表.some(x => x.join(',') === ids.join(','))) continue;
    if (出.some(o => o.ids.join(',') === ids.join(','))) continue;
    出.push({ 队: d.name, ids, description: d.description, recommend: d.recommend });
  }
  return 出;
}

const 目标 = 载入([
  [10197, 10152, 10096, 10177, 10163],
  [10213, 10190, 10167, 10164, 10155],
  [10197, 10096, 10134, 10193, 10147],
]);

const inst = 适配.createEngine();
// 禁用检查点 → 爬山全走 fastReplay（wrap 才数得到）
const 保存cap = inst.increment.captureState;
inst.increment.captureState = undefined;

const orig = inst.increment.fastReplay;
let 总调用 = 0;
const 键计数 = new Map();
inst.increment.fastReplay = (ids, toks, b, e, o) => {
  总调用++;
  let 键 = '';
  for (let i = 0; i < toks.length; i++) 键 += toks[i].idx + toks[i].act;
  键计数.set(键, (键计数.get(键) || 0) + 1);
  return orig(ids, toks, b, e, o);
};

for (const d of 目标) {
  const 贪 = 排程器.贪心基线(inst, d.ids, BOND, null);
  if (!贪) continue;
  for (const K of [0, 2]) {
    总调用 = 0; 键计数.clear();
    const t = process.hrtime.bigint();
    const r = 排程器.爬山(inst, d.ids, 贪.toks, BOND, 20000, null, null, K);
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    const distinct = 键计数.size;
    let 最大重复 = 0; for (const c of 键计数.values()) if (c > 最大重复) 最大重复 = c;
    console.log(`${d.队}[${d.ids}] K=${K} dmg=${r.dmg.toLocaleString()} | fastReplay总=${总调用} distinct=${distinct} 重复率=${((1 - distinct / 总调用) * 100).toFixed(1)}% 最大重复=${最大重复} | ${ms.toFixed(0)}ms`);
  }
}
inst.increment.captureState = 保存cap;
