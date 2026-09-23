'use strict';
/*
 * 临时验证O：队[7]/队[4] 剩余缺口是否全部来自"位4 第4发궁 t12→t13"这一步。
 * 诊断N 已实锤：两队的最优解与 DB 的궁相位唯一差异 = 位4 第4发궁 打早一回合（t12 vs t13），
 *   且爬山单token邻域结构不可达（需 t12궁→평 + t13평→궁 成对联动，中间态非法/更差）。
 * 本验证：对最优解（构造5+爬山10k）施加这一处成对改动 → 修复解码 → 重放真值。
 *   若 ≈100%，剩余 8.5pp 全由此产生，"궁相位后移一回合"的成对邻域即完全解。
 *   若 <100%，还存在其他缺口成分（평/방次序等），需继续归因。
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

const 目标 = ['10197,10096,10134,10193,10147', '10197,10152,10096,10193,10147'];
const inst = 适配.createEngine();

for (const idsStr of 目标) {
  const d0 = DB队(idsStr);
  const 真값 = d0.recommend;
  console.log(`\n########## ${idsStr}  DB=${(真값 / 1e9).toFixed(3)}G ##########`);

  // 复现最优解：构造5 + 爬山10k（与 benchmark 兜底路同口径）
  const c = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
  const h = 排程器.爬山(inst, d0.ids, c.toks, BOND, 10000);
  const 最优 = h.dmg > c.dmg ? h : c;
  console.log(`最优解 = ${(最优.dmg / 真값 * 100).toFixed(2)}%`);

  // 找位4（idx=3）在 t12/t13 的 token
  const 找 = (toks, T, act) => {
    for (let k = (T - 1) * 5; k < T * 5; k++) if (toks[k].idx === 3 && toks[k].act === act) return k;
    return -1;
  };
  const k12궁 = 找(最优.toks, 12, '궁'), k13평 = 找(最优.toks, 13, '평');
  console.log(`位4 t12궁@步${k12궁}  t13평@步${k13평}`);
  if (k12궁 < 0 || k13평 < 0) { console.log('  结构不符，跳过'); continue; }

  // 成对改动：t12 궁→평，t13 평→궁
  const 변 = 最优.toks.map(t => ({ idx: t.idx, act: t.act }));
  변[k12궁].act = '평';
  변[k13평].act = '궁';
  const 修 = 排程器.修复解码(inst, d0.ids, 변, BOND);
  const 改后 = 修 ? 排程器.重放(inst, d0.ids, 修.toks, BOND) : 0;
  console.log(`成对改动后（修复${修 ? 修.修复次数 : '?'}次）= ${(改后 / 真값 * 100).toFixed(2)}%  Δ${(改后 - 最优.dmg) >= 0 ? '+' : ''}${((改后 - 最优.dmg) / 真값 * 100).toFixed(2)}pp`);
  if (改后 < 真값 * 0.999) {
    // 改后仍未接近 DB：再试"改动后爬山"，看成对邻域是否还有连带提升空间
    const h2 = 排程器.爬山(inst, d0.ids, 修.toks, BOND, 10000);
    console.log(`  改动解+再爬10k = ${(Math.max(h2.dmg, 改后) / 真값 * 100).toFixed(2)}%`);
  }
}
console.log('\n完成');
