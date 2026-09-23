'use strict';
/*
 * 内层搜索正式 benchmark：角色组合确定时，MC rollout 束搜索能否高效发现 DB 最优指令序。
 *
 * 队选取：全站 recommend 降序、站位键去重、本地 bit 级复现（重放===recommend）的前 N 支强队。
 * 真值 = DB recommend（景观探测已证其为 r=2 局部极大，作 benchmark 可靠）。
 * 全部算法从零构造（不用 DB toks 作起点，无种子），达成率 = dmg / DB最优。
 *
 * 用法: node 内层benchmark.js [N支] [width] [R]
 *   - 支持 worker 并行：设 环境变量 BENCH_THREADS>1 时用 worker_threads 按队并行
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const 适配 = require('D:/天下布魔/Tkfm-DebugTools/优化器/引擎适配.js');
const 排程器 = require('D:/天下布魔/Tkfm-DebugTools/优化器/排程器.js');
const 机制特征 = require('D:/天下布魔/Tkfm-DebugTools/优化器/机制特征.js');

const BOND = [5, 5, 5, 5, 5];
const CLIMB = Number(process.env.BENCH_CLIMB) || 3000; // 束后爬山精修预算（默认3000与hybrid基准同口径可比）
// 保守兜底（与生产 团队搜索器 同口径）：需相位规划 队跑 相位对齐构造+爬山，按真值取优。
//   BENCH_FALLBACK=0 可关（对照旧口径）。兜底档 {5,99}（实验L 实证：3太紧、5/8/99同解）。
//   谷底试探=8（诊断N~U + 验证P5 实证 + 生产同口径）：难例正解隔着必降谷且缺口分层（相位→次序），
//   纯上升爬山不可达。兜底爬山预算下限 30000（谷底试探评估消耗高：队[7] K=8 达 99.98% 需 14156 评估、
//   승나미 需 18156，CLIMB=10000 会撞顶致试探跑不完 —— 验证P5/生产同口径）。
const 兜底开关 = process.env.BENCH_FALLBACK !== '0';
const 兜底档 = [5, 99];
const 谷底试探 = process.env.BENCH_VALLEY == null ? 8 : Number(process.env.BENCH_VALLEY);
const 兜底爬山预算 = process.env.BENCH_FALLBACK_CLIMB == null
  ? (谷底试探 > 0 ? Math.max(CLIMB, 30000) : CLIMB)
  : Number(process.env.BENCH_FALLBACK_CLIMB);
const 特例ID = new Set([10162, 10205]);
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
// 机制表开关：BENCH_MECH=1 时 createEngine 启用表驱动解释器（有表角色走表，无表回落原 setDefault）。
//   用于阶段1扩验：证明机制表路径不降低达成率/不拖垮性能。主/副线程都用同一环境变量，结果一致。
const 引擎选项 = process.env.BENCH_MECH === '1' ? { 启用机制表: true } : {};

// ---- 选队（主/副线程同一逻辑，结果确定性一致）----
function 选队(N) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const inst = 适配.createEngine(引擎选项);
  const getCharacter = 适配.角色数据().getCharacter;
  const 缓存 = new Map();
  function 角色(id) { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); }
  const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
  }
  const 强队 = [...名单.values()].sort((a, b) => b.recommend - a.recommend);
  const 用队 = [];
  for (const d of 强队) {
    if (用队.length >= N) break;
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    if (!toks || 排程器.重放(inst, d.ids, toks, BOND) !== d.recommend) continue;
    用队.push(d);
  }
  return 用队;
}

// ---- 单队评测（主线程内联 / worker 内同函数；引擎实例进程内共享一个）----
let 共享inst = null;
function 取inst() { return 共享inst || (共享inst = 适配.createEngine(引擎选项)); }
function 评一队(d, width, R, 评分) {
  const inst = 取inst();
  const t0 = Date.now();
  const out = {};
  const p = 排程器.先验前瞻贪心(inst, d.ids, BOND);
  out.前瞻 = p ? p.dmg : 0; out.前瞻ms = Date.now() - t0;
  const t1 = Date.now();
  const b = 排程器.束搜索(inst, d.ids, BOND, { width, R, 评分, 时限秒: 600 });
  out.束 = b ? b.dmg : 0; out.束ms = Date.now() - t1; out.扩展 = b ? b.扩展数 : 0; out.深 = b ? b.深度 : 0;
  // 束结果+爬山收尾（束给好起点，爬山精修）
  out.束爬 = out.束;
  if (b && b.toks && b.toks.length === 65 && out.束 < d.recommend) {
    const t2 = Date.now();
    const h = 排程器.爬山(inst, d.ids, b.toks, BOND, CLIMB);
    if (h && h.dmg > out.束爬) out.束爬 = h.dmg;
    out.爬ms = Date.now() - t2;
  }
  // 保守兜底（与生产链路同口径）：需相位规划 队，相位对齐构造给相位正确起点 → 真值爬山 → 按真值取优
  out.终 = out.束爬;
  out.来源 = out.束爬 >= out.束 ? '束+爬' : '束';
  out.需相位规划 = 兜底开关 && 机制特征.需相位规划(d.ids);
  if (out.需相位规划 && out.终 < d.recommend) {
    const t3 = Date.now();
    for (const 憋 of 兜底档) {
      const g = 排程器.相位对齐构造(inst, d.ids, BOND, { 最大憋: 憋 });
      if (!g || !(g.dmg > 0)) continue;
      const gh = 排程器.爬山(inst, d.ids, g.toks, BOND, 兜底爬山预算, null, null, 谷底试探);
      const 兜底终 = (gh && gh.dmg > g.dmg) ? gh.dmg : g.dmg;
      if (兜底终 > out.终) { out.终 = 兜底终; out.来源 = '+对齐'; }
    }
    out.兜底ms = Date.now() - t3;
  }
  out.ms = Date.now() - t0;
  return out;
}

// ---- worker 模式 ----
if (!isMainThread && workerData && workerData.队列) {
  for (const d of workerData.队列) {
    const out = 评一队(d, workerData.width, workerData.R, workerData.评分);
    parentPort.postMessage({ 队: d.队, ids: d.ids, recommend: d.recommend, ...out });
  }
  parentPort.postMessage({ done: true });
} else if (isMainThread) {
  const N = Number(process.argv[2]) || 8;
  const width = Number(process.argv[3]) || 10;
  const R = Number(process.argv[4]) || 4;
  const 评分 = process.argv[5] || 'sync';
  const 线程 = Number(process.env.BENCH_THREADS) || 1;
  console.log(`内层benchmark: N=${N} width=${width} R=${R} 评分=${评分} 线程=${线程}\n`);
  const 队 = 选队(N);
  console.log(`选队完成 ${队.length} 支（bit级复现）`);

  const fmtPct = (a, b) => (a / b * 100).toFixed(2) + '%';
  const 结果 = [];
  const 收尾 = () => {
    const 前瞻率 = 结果.map(r => r.前瞻 / r.recommend);
    const 束率 = 结果.map(r => r.束 / r.recommend);
    const 爬率 = 结果.map(r => r.束爬 / r.recommend);
    const 终率 = 结果.map(r => r.终 / r.recommend);
    const 均 = a => (a.reduce((s, v) => s + v, 0) / a.length * 100).toFixed(1);
    console.log('\n=============== 汇总 ===============');
    console.log(`先验前瞻: 平均${均(前瞻率)}%`);
    console.log(`MC束搜索: 平均${均(束率)}%`);
    console.log(`束+爬山:  平均${均(爬率)}% 最低${(Math.min(...爬率) * 100).toFixed(1)}%`);
    console.log(`+兜底终:  平均${均(终率)}% 最低${(Math.min(...终率) * 100).toFixed(1)}% ≥99.9%: ${终率.filter(x => x >= 0.999).length}/${终率.length} =100%: ${终率.filter(x => x >= 1).length}/${终率.length}`);
    console.log(`总耗时 ${(结果.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(0)}s(串)`);
  };

  if (线程 > 1) {
    const 分组 = Array.from({ length: 线程 }, () => []);
    队.forEach((d, i) => 分组[i % 线程].push(d));
    let 完成数 = 0;
    分组.forEach(q => {
      if (!q.length) return;
      const w = new Worker(__filename, { workerData: { 队列: q, width, R, 评分 } });
      w.on('message', m => {
        if (m.done) { if (++完成数 >= 分组.filter(x => x.length).length) 收尾(); return; }
        结果.push(m);
        console.log(`${m.队}[${m.ids}]: 前瞻${fmtPct(m.前瞻, m.recommend)} 束${fmtPct(m.束, m.recommend)}+爬${fmtPct(m.束爬, m.recommend)} 终${fmtPct(m.终, m.recommend)}(${m.需相位规划 ? '兜底' : '—'}) DB=${m.recommend.toLocaleString()}`);
      });
      w.on('error', e => { console.error('worker错误', e); process.exit(1); });
    });
  } else {
        for (const d of 队) {
      const out = 评一队(d, width, R, 评分);
      结果.push({ 队: d.队, ids: d.ids, recommend: d.recommend, ...out });
      console.log(`${d.队}[${d.ids}]: 前瞻${fmtPct(out.前瞻, d.recommend)} 束${fmtPct(out.束, d.recommend)}+爬${fmtPct(out.束爬, d.recommend)} 终${fmtPct(out.终, d.recommend)}(${out.需相位规划 ? '兜底' : '—'}) DB=${d.recommend.toLocaleString()}`);
    }
    收尾();
  }
}
