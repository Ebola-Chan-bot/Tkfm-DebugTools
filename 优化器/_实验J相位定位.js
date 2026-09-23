'use strict';
/*
 * 临时实验J：88% 缺口最终定位——DB 前缀在死亡层的三种续航估值对比。
 * 实验I 实锤：88%两队 sync评分===纯即放（d即 每层都赢、d同 被 max 盖过、role泛化惰性）。
 *   但"即放为何给 DB 前缀打出比 top 更低的分"仍是黑箱。本实验在死亡层 s2 直接量三个续航：
 *     A) 即放填充续走（d即，当前评分主用）
 *     B) sync 填充续走（d同，当前被 max 盖过）
 *     C) DB 真实后续（真值上界）
 *   再对比 top1 前缀的 A/B/C。
 * 判别：
 *   - 若 DB前缀的 C ≫ A 且 C ≫ top 的 C → 即放/sync 都低估 DB 前缀的远程价值（填充续航失真），
 *     且 top 前缀的真值 C 反而低 → 说明"评分高的前缀真实续航反而低"= 评分器排序失真，需评分器升级。
 *   - 若 DB前缀 A≈C（即放能正确估出 DB 前缀续航）却仍排名低 → 是别的前缀 A 更高（填充偏好早放）。
 *
 * 另跑：设置.纯sync评分=true（评=d同 单路，去掉 max）看 88% 两队能否提升 → 判别 max() 是否是元凶。
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
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = { 队: d.name || idsStr, ids, description: d.description, recommend: d.recommend };
  }
  return best;
}

const 目标 = ['10197,10152,10096,10193,10147', '10197,10096,10134,10193,10147'];
const inst = 适配.createEngine();

for (const idsStr of 目标) {
  const d = 取DB队(idsStr);
  const 目标toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  const 真값 = 排程器.重放(inst, d.ids, 目标toks, BOND);
  console.log(`\n########## ${d.ids.join(',')}  DB=${真값.toLocaleString()} ##########`);

  // 三档束搜索对照：sync(基线 max) / 纯sync评分(评=d同) / rand纯即放(R1)
  const base = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  const pure = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'sync', 纯sync评分: true, 时限秒: 600 });
  const 即 = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 1, 评分: 'rand', 时限秒: 600 });
  console.log(`  sync max(即,同):   ${base.dmg.toLocaleString()} (${(base.dmg / 真값 * 100).toFixed(2)}%) 扩${base.扩展数}`);
  console.log(`  纯sync评分(评=同): ${pure.dmg.toLocaleString()} (${(pure.dmg / 真값 * 100).toFixed(2)}%) 扩${pure.扩展数}`);
  console.log(`  纯即放(rand R1):   ${即.dmg.toLocaleString()} (${(即.dmg / 真값 * 100).toFixed(2)}%) 扩${即.扩展数}`);
  console.log(`  ⇒ max 是否元凶: 纯sync=${(pure.dmg / 真값 * 100).toFixed(2)}% vs max=${(base.dmg / 真값 * 100).toFixed(2)}% → ${pure.dmg > base.dmg ? 'max 掩盖了 sync 更优估值（去掉 max 可提升）' : 'max 不是元凶：去掉 max 用纯 sync 反而更低，即放与 sync 两种填充都估不出 DB 的伤害궁相位规划'}`);
}

