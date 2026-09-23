'use strict';
/*
 * 验证T：队[7] 残余 −2.71pp = t13 回合内궁出手次序差（诊断S 实锤：궁相位全对齐、缺口全部在 t13 当回合 −0.796G）。
 * 最优解 t13 궁次序 = 位5→位3→位4；DB = 位3→位4→位5。
 * 本验证：
 *   ① 枚举 t13 三발궁的全部 6 种次序重排（其余步不动）→ 真值重放，画出次序景观：
 *      DB 次序收益多少？当前次序排第几？
 *   ② 重排路径是否需要穿越变差中间态（相邻交换一步可达性）：当前(5,3,4) 的相邻交换邻居
 *      =(3,5,4)/(5,4,3)，各自真值多少——若都低于当前，则 first-improving 爬山结构性不可达（又一类谷）。
 *   ③ 若②成立，对策 = 谷底试探的变差候选集补上"궁↔궁 次序交换"（相位邻域曾以"궁↔궁无意义"
 *      排除——该判断只对跨回合相位移动成立，对回合内次序漏网）。
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

const IDS = '10197,10096,10134,10193,10147';
const inst = 适配.createEngine();
const d0 = DB队(IDS);
const 真값 = d0.recommend;

const c5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
const 爬 = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 10000, null, null, 8);
const 最优toks = 爬.dmg > c5.dmg ? 爬.toks : c5.toks;
const 最优dmg = Math.max(爬.dmg, c5.dmg);
console.log(`队[7] DB=${pct(真값)}  当前最优=${pct(最优dmg)}\n`);
function pct(x) { return (x / 真값 * 100).toFixed(2) + '%'; }

// t13 = 步 60..64；找出其中 궁 步与对应 idx
const t13궁步 = [];
for (let k = 60; k < 65; k++) if (最优toks[k].act === '궁') t13궁步.push(k);
console.log(`t13 궁步 = [${t13궁步}]  当前次序 = ${t13궁步.map(k => '位' + (最优toks[k].idx + 1)).join('→')}`);

// ① 全 6 种重排
function 重排(순서) {
  // 순서 = 궁步数组的元素按新次序填入原궁步位置（idx 重新分配）
  const 변 = 最优toks.map(t => ({ idx: t.idx, act: t.act }));
  const 原idx = t13궁步.map(k => 最优toks[k].idx);
  순서.forEach((新idx, i) => { 변[t13궁步[i]].idx = 新idx; });
  return 변;
}
const 原 = t13궁步.map(k => 最优toks[k].idx);
function* 全排列(a) {
  if (a.length <= 1) { yield a.slice(); return; }
  for (let i = 0; i < a.length; i++) {
    const rest = a.slice(0, i).concat(a.slice(i + 1));
    for (const p of 全排列(rest)) yield [a[i], ...p];
  }
}
console.log('\n① 6 种次序景观：');
const 景观 = [];
for (const 순 of 全排列(原)) {
  const 변 = 重排(순);
  const d = 排程器.重放(inst, d0.ids, 변, BOND);
  景观.push({ 순: 순.slice(), dmg: d });
  const 是DB = 순.join(',') === '2,3,4';   // 位3,位4,位5 = idx 2,3,4
  const 是当前 = 순.join(',') === 原.join(',');
  console.log(`  ${순.map(i => '位' + (i + 1)).join('→')}: ${pct(d)}${是DB ? '  ◀DB' : ''}${是当前 ? '  ◀当前' : ''}`);
}
景观.sort((a, b) => b.dmg - a.dmg);
console.log(`  最优次序 = ${景观[0].순.map(i => '位' + (i + 1)).join('→')} (${pct(景观[0].dmg)})  当前排名 = ${景观.findIndex(x => x.순.join(',') === 原.join(',')) + 1}/6`);

// ② 相邻交换一步可达性（爬山②邻域视角：t13 内相邻궁步交换）
console.log('\n② 相邻交换一步邻居（first-improving 能否直接走）：');
for (let a = 0; a < t13궁步.length; a++) {
  for (let b = a + 1; b < t13궁步.length; b++) {
    if (t13궁步[b] - t13궁步[a] !== 1) continue;   // 只算物理相邻步
    const 변 = 重排(原.slice());
    const tmp = 변[t13궁步[a]].idx; 변[t13궁步[a]].idx = 변[t13궁步[b]].idx; 변[t13궁步[b]].idx = tmp;
    const d = 排程器.重放(inst, d0.ids, 변, BOND);
    const 新순 = 原.slice(); const t2 = 新순[a]; 新순[a] = 新순[b]; 新순[b] = t2;
    console.log(`  交换步${t13궁步[a]}↔${t13궁步[b]}: ${新순.map(i => '位' + (i + 1)).join('→')} = ${pct(d)}  ${d > 最优dmg ? '★上升(爬山应接受?)' : '▼变差(谷)'}`);
  }
}

// ③ 整场直接采用 DB 次序的收益
const DB排 = 重排([2, 3, 4]);
const dbD = 排程器.重放(inst, d0.ids, DB排, BOND);
console.log(`\n③ 仅重排 t13 为 DB 次序（其余步不动）= ${pct(dbD)}  Δ${((dbD - 最优dmg) / 真값 * 100).toFixed(2)}pp`);
console.log('完成');
