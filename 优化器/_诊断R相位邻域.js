'use strict';
/*
 * 临时诊断R：验证"相位后移"专用邻域（同角色궁与后一回合自己的평/방成对交换）能否覆盖两支难例队的正解移动。
 * 验证P 教训：通用变差前沿浅谷数百条，−7pp 的语义深谷按"最不差优先"排序 K=8 排不到（队[7] 试探8/采纳0）；
 *   必须把 궁相位移动作为一等邻域直接生成（验证O：队[7] 成对移动=t12궁↔t13평 重放84.25%→重爬97.29%，
 *   队[4] 同形态成对移动直接上升 98.60%）。
 * 本诊断回答三个问题：
 *   Q1 相位移动邻域规模：每队收敛解上，(궁@s1, 同角色后回合非궁@s2) 候选数、其中 d=+1回合 与 d=+2回合 各多少；
 *   Q2 目标移动在邻域内的损失排名（决定试探预算 K 与排序策略：最不差优先是否 K 次内命中）；
 *   Q3 队[4] 的目标移动是否为上升移动（uphill，被一等邻域直接接受，无需跨谷）。
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

// 相位移动候选：궁@s1（角色i）↔ 非궁@s2（同角色i，s2在后），成对交换动作。
// 返回 [{s1, s2, d回合, toks}]，d回合 = s2所在回合 − s1所在回合。
function 相位移动候选(toks) {
  const 출 = []; // 每角色每回合的行动步号与动作
  for (let k = 0; k < 65; k++) 출.push({ k, idx: toks[k].idx, act: toks[k].act, t: (k / 5) | 0 });
  const 候 = [];
  for (const a of 출) {
    if (a.act !== '궁') continue;
    for (const b of 출) {
      if (b.idx !== a.idx || b.k <= a.k) continue;
      if (b.act === '궁') continue;               // 궁↔궁 交换无意义
      const d = b.t - a.t;
      if (d > 2) continue;                        // 只测 +1/+2 回合（诊断范围；产品化时可放宽再测）
      const 변 = toks.map(t => ({ idx: t.idx, act: t.act }));
      변[a.k].act = b.act;
      변[b.k].act = '궁';
      候.push({ s1: a.k, s2: b.k, d, t1: a.t + 1, t2: b.t + 1, toks: 변 });
    }
  }
  return 候;
}

const 目标 = [
  { 名: '队[7]最差', ids: '10197,10096,10134,10193,10147', 目标移动: [57, 64] }, // 验证O实测步号：t12궁@57 → t13평@64
  { 名: '队[4]对照', ids: '10197,10152,10096,10193,10147', 目标移动: [55, 62] }, // 验证O实测步号：t12궁@55 → t13평@62
];
const inst = 适配.createEngine();

for (const g of 目标) {
  const d0 = DB队(g.ids);
  const 真값 = d0.recommend;
  console.log(`\n########## ${g.名} ${g.ids}  DB=${(真값 / 1e9).toFixed(3)}G ##########`);

  // 收敛解（与验证P同路径：构造5 + K=0爬山，预算给足以真收敛）
  const c5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
  const 基 = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 30000);
  console.log(`  收敛解 = ${(基.dmg / 真값 * 100).toFixed(2)}%  (评估${基.评估} 提升${基.提升})`);

  const 候 = 相位移动候选(基.toks);
  const d1 = 候.filter(c => c.d === 1), d2 = 候.filter(c => c.d === 2);
  console.log(`  [Q1] 邻域规模: 全部(d≤2)=${候.length}  d=+1回合=${d1.length}  d=+2回合=${d2.length}`);

  // Q2/Q3：逐候选真值 + 损失排名
  const 评过 = 候.map(c => ({ ...c, dmg: 排程器.重放(inst, d0.ids, c.toks, BOND) }));
  const 上升 = 评过.filter(c => c.dmg > 基.dmg).sort((a, b) => b.dmg - a.dmg);
  const 变差 = 评过.filter(c => c.dmg <= 基.dmg).sort((a, b) => b.dmg - a.dmg); // 最不差优先
  console.log(`  [Q3] 上升移动 ${上升.length} 个:`);
  for (const c of 上升.slice(0, 5)) {
    console.log(`    步${c.s1}(t${c.t1}궁)→步${c.s2}(t${c.t2}${c.toks[c.s2].act === '궁' ? '' : ''}) d=${c.d} = ${(c.dmg / 真값 * 100).toFixed(2)}%  Δ+${((c.dmg - 基.dmg) / 真값 * 100).toFixed(2)}pp`);
  }
  const [步1, 步2] = g.目标移动;
  const 目标在变差 = 变差.findIndex(c => c.s1 === 步1 && c.s2 === 步2);
  const 目标在上升 = 上升.findIndex(c => c.s1 === 步1 && c.s2 === 步2);
  if (目标在上升 >= 0) {
    console.log(`  [Q2] 目标移动 步${步1}→${步2} 是【上升】移动（排名${目标在上升 + 1}/${上升.length}，一等邻域直接接受）`);
  } else if (目标在变差 >= 0) {
    console.log(`  [Q2] 目标移动 步${步1}→${步2} 是【变差】谷，最不差优先排名 ${目标在变差 + 1}/${变差.length}`);
    const 谷 = 变差[目标在变差];
    console.log(`    直接重放 = ${(谷.dmg / 真값 * 100).toFixed(2)}%  Δ${((谷.dmg - 基.dmg) / 真값 * 100).toFixed(2)}pp`);
    console.log(`    变差谷前8名（最不差优先会先试这些）:`);
    变差.slice(0, 8).forEach((c, i) => console.log(`      #${i + 1} 步${c.s1}(t${c.t1})→步${c.s2}(t${c.t2}) d=${c.d} = ${(c.dmg / 真값 * 100).toFixed(2)}%`));
  } else {
    console.log(`  [Q2] ⚠️ 目标移动 步${步1}→${步2} 不在 d≤2 邻域内！`);
  }
}
console.log('\n完成');

