// 实验O：整回合内序全排列重排（爬山第④邻域）能否补齐 97.9队(얀코[10197,10167,10147,10163,10134]) 的 95.87%→100% 缺口
//   诊断979 实证：爬山 60k/180k × K8/K32 全卡 95.87%，평/방填充已修到差1，但 序차이=13/13、궁차이=4
//   假说：相邻交换是 first-improving，到达 DB 整回合排列需经过多个变差中间态 → 结构性不可达
//   成本：每回合 ≤120 排列 × 13 回合 ≈ 1560 次重放 ≈ 9s，可全轮迭代至收敛
// 用法: node _实验O回合序.js <ids> [爬山预算=60000] [K=8] [轮数=6]
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(path.resolve(__dirname, '..'), '../tenkaassist_data/data/data.json'))).toString('utf8'));
const ids = (process.argv[2] || '10197,10167,10147,10163,10134').split(',').map(Number);
const 预算 = Number(process.argv[3] || 60000);
const K = Number(process.argv[4] || 8);
const 最大轮 = Number(process.argv[5] || 6);
const BOND = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
const want = [...ids].sort((a, b) => a - b).join(' ');
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === want);
const DB = Number(rec.recommend);
const dbToks = 排程.解析指令集(inst, ids, rec.description, BOND);
const pct = x => (x / DB * 100).toFixed(2) + '%';
console.log(`队 ${rec.name} [${ids}] DB=${DB.toLocaleString()}`);

// —— 排列枚举（Heap 算法，5! = 120）——
function 全排列(n) {
  const 结果 = []; const a = Array.from({ length: n }, (_, i) => i);
  const rec2 = (arr, k) => {
    if (k === arr.length) { 结果.push(arr.slice()); return; }
    for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; rec2(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; }
  };
  rec2(a, 0); return 结果;
}
const 排5 = 全排列(5);

// —— 整回合内序重排（best-improving：对每回合试全 120 序，取该回合最优；迭代至全轮无改进）——
function 回合序重排(toks, 起始dmg, 日志) {
  let cur = toks.map(t => ({ idx: t.idx, act: t.act }));
  let curDmg = 起始dmg == null ? 排程.重放(inst, ids, cur, BOND) : 起始dmg;
  let 总评估 = 0;
  for (let 轮 = 0; 轮 < 最大轮; 轮++) {
    let 本轮改进 = 0;
    for (let t = 0; t < 13; t++) {
      const 基 = cur.slice(t * 5, t * 5 + 5);
      let 最优序 = null, 最优dmg = curDmg;
      for (const p of 排5) {
        const nb = cur.map(x => ({ idx: x.idx, act: x.act }));
        for (let k = 0; k < 5; k++) nb[t * 5 + k] = { idx: 基[p[k]].idx, act: 基[p[k]].act };
        const 键 = nb.slice(t * 5, t * 5 + 5).map(x => x.idx + x.act).join('');
        if (键 === 基.map(x => x.idx + x.act).join('')) continue;   // 同序跳过
        总评估++;
        const d = 排程.重放(inst, ids, nb, BOND);
        if (d > 最优dmg) { 最优dmg = d; 最优序 = p; }
      }
      if (最优序) {
        const 新 = cur.slice(t * 5, t * 5 + 5);
        for (let k = 0; k < 5; k++) cur[t * 5 + k] = { idx: 新[最优序[k]].idx, act: 新[最优序[k]].act };
        curDmg = 最优dmg; 本轮改进++;
      }
    }
    if (日志) console.log(`  序重排轮${轮 + 1}: 改进${本轮改进}回合 → ${pct(curDmg)} (累计评估${总评估})`);
    if (!本轮改进) break;
  }
  return { toks: cur, dmg: curDmg, 评估: 总评估 };
}
// —— 变体：只做궁回合的序重排（更省，看是否够）——
function 差异统计(toks) {
  let 궁차 = 0, 평방차 = 0, 순차 = 0;
  for (let i = 0; i < 65; i++) if (toks[i].act !== dbToks[i].act) { if (toks[i].act === '궁' || dbToks[i].act === '궁') 궁차++; else 평방차++; }
  for (let t = 0; t < 13; t++) {
    if (toks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('') !== dbToks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('')) 순차++;
  }
  return `궁차이=${궁차} 평/방차이=${평방차} 序차이=${순차}/13`;
}

// 起点1：生产窗对齐最佳构造 → 爬山 → 序重排
console.log('\n== 路径A: 窗对齐构造 → 爬山 → +整回合序重排 ==');
const 全 = 排程.窗对齐构造(inst, ids, BOND, { 全部: true });
const 起 = 全[0];
console.log(`构造起点 ${起.来源}${起.buff窗 ? '[憋]' : '[준]'} = ${pct(起.dmg)}`);
let t0 = Date.now();
const h = 排程.爬山(inst, ids, 起.toks, BOND, 预算, null, null, K);
console.log(`爬山(${预算},K${K}) = ${pct(h.dmg)}  ${差异统计(h.toks)}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
t0 = Date.now();
const o = 回合序重排(h.toks, h.dmg, true);
console.log(`+序重排 = ${pct(o.dmg)}  ${差异统计(o.toks)}  评估${o.评估} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
// 序重排后再爬山（两者交替）
let 交替 = o, 交替dmg = o.dmg;
for (let i = 0; i < 3; i++) {
  const hh = 排程.爬山(inst, ids, 交替.toks, BOND, 30000, null, null, K);
  if (hh.dmg <= 交替dmg) break;
  交替 = hh; 交替dmg = hh.dmg;
  const oo = 回合序重排(交替.toks, 交替.dmg, false);
  if (oo.dmg <= 交替dmg) break;
  交替 = oo; 交替dmg = oo.dmg;
}
console.log(`序重排↔爬山 交替3轮 = ${pct(交替dmg)}  ${差异统计(交替.toks)}`);

console.log('\n== 路径B: 束搜索+爬山(生产主路径,96.10%) → +序重排 ==');
t0 = Date.now();
const b = 排程.束搜索(inst, ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 300 });
const bh = b ? 排程.爬山(inst, ids, b.toks, BOND, 3000) : null;
const 束爬 = Math.max(b ? b.dmg : 0, bh ? bh.dmg : 0);
const 束toks = (bh && bh.dmg > (b ? b.dmg : 0)) ? bh.toks : (b ? b.toks : null);
console.log(`束+爬 = ${pct(束爬)} [${((Date.now() - t0) / 1000).toFixed(0)}s] ${差异统计(束toks)}`);
if (束toks) { const ob = 回合序重排(束toks, 束爬, false); console.log(`+序重排 = ${pct(ob.dmg)}  ${差异统计(ob.toks)}  评估${ob.评估}`); }

console.log('\n== 参照 ==');
console.log(`DB解直接爬山 = ${pct(排程.爬山(inst, ids, dbToks, BOND, 30000, null, null, 8).dmg)}  ${差异统计(dbToks)}`);
const odb = 回合序重排(dbToks, DB, false);
console.log(`DB解只做序重排 = ${pct(odb.dmg)} 评估${odb.评估} (检验序是否是唯一残差)`);
console.log('完成');
