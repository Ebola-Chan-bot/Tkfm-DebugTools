'use strict';
/*
 * 临时验证P：爬山"谷底试探"（变差移动容后再搜，用户定策 2026-09-23）端到端实测。
 * 机制：first-improving 走光变好移动 → 局部最优后收集全部变差邻域 → 最不差优先逐个跨谷
 *   （下降一步 + 谷底重爬）→ 超过全局最优则采纳并续搜。
 * 预期（验证O 背书）：t12궁→평 下降后，位4 上一发궁在 t9（CD4）、t13 恰就绪 → t13평→궁
 *   在新谷点变为【合法上升移动】，重爬自动完成"成对移궁" → 队[7] 91.48%→~97.3%、队[4] 92.53%→~98.6%。
 * 风险实测点：最不差优先排序下，深谷（−7pp）是否能在 K 次试探内排到 → 扫 K=2/4/8 看采纳轨迹。
 * 对照：勝나미/칼리버/후지카/신이카（达标队）K=8 不应回退（全局最优取优保护）。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = { ids, description: d.description, recommend: d.recommend };
  }
  return best;
}

const 目标 = [
  { 名: '队[7]最差', ids: '10197,10096,10134,10193,10147', K组: [4, 8, 12, 16] },
  { 名: '队[4]对照', ids: '10197,10152,10096,10193,10147', K组: [2, 8] },
  { 名: '승나미', ids: '10177,10060,10211,10208,10197', K组: [8] },
  { 名: '칼리버', ids: '10211,10167,10128,10168,10197', K组: [8] },
  { 名: '후지카', ids: '10213,10190,10167,10187,10155', K组: [8] },
  { 名: '신이카', ids: '10194,10167,10108,10213,10155', K组: [8] },
];
const inst = 适配.createEngine();
const pct = (x, r) => (x / r * 100).toFixed(2) + '%';

for (const g of 目标) {
  const d0 = DB队(g.ids);
  const 真값 = d0.recommend;
  console.log(`\n########## ${g.名} ${g.ids}  DB=${(真값 / 1e9).toFixed(3)}G ##########`);

  // K=0 基线（纯 first-improving）：预算 30000 足够真收敛（P2 教训：预算撞顶会制造假提升）
  const c5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
  const 基 = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 30000);
  console.log(`  K=0 基线: ${pct(基.dmg, 真값)}  (评估${基.评估} 提升${基.提升})`);

  for (const K of g.K组) {
    const t0 = Date.now();
    const r = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 60000, null, null, K);
    console.log(`  K=${K}: ${pct(r.dmg, 真값)}  Δ${r.dmg > 基.dmg ? '+' : ''}${((r.dmg - 基.dmg) / 真값 * 100).toFixed(2)}pp  ` +
      `试探${r.谷底试探数}/采纳${r.谷底采纳数} 评估${r.评估} 提升${r.提升}  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  }
}
console.log('\n完成');
