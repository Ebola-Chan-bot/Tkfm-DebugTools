// _profile重放.js —— 重放成本宏观分解（⑤层1剖析）
// 裁决三个嫌疑点：
//   ① fastReplay 每次全量 initBattle 的占比（若高 → 缓存初始态+restoreState 白捡）
//   ② 检查点后缀重放 vs 整场 fastReplay 的实际倍率（旧"~6%"结论按精选集口径重估）
//   ③ 单步 do_* 平均成本分解（평/궁 分别计时）
// 层2（--cpu-prof 函数级）另行跑：node --cpu-prof --cpu-prof-interval=100 _profile重放.js --prof
'use strict';
const 适配 = require('./引擎适配.js');
const 排程 = require('./排程器.js');

const ids = [10197, 10152, 10096, 10177, 10163]; // 94队（有窗对齐构造可用）
const bonds = [5, 5, 5, 5, 5];
const inst = 适配.createEngine();
const inc = inst.increment;

// 取一条合法 65-toks（窗对齐构造第一候选）
const cand = 排程.窗对齐构造(inst, ids, bonds, { TopK: 1 });
const toks = (Array.isArray(cand) ? cand[0] : cand).toks;
if (!toks || toks.length !== 65) { console.log('toks 获取失败'); process.exit(1); }
const 计数 = { 평: 0, 궁: 0, 방: 0 };
for (const t of toks) 计数[t.act] = (计数[t.act] || 0) + 1;

const N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '200', 10);
const now = () => Number(process.hrtime.bigint()) / 1e6;

// --- ① fastReplay 整场 ---
let t0 = now();
for (let i = 0; i < N; i++) inc.fastReplay(ids, toks, bonds, -1, null);
const t_full = (now() - t0) / N;

// --- ② initBattle 单独（initBattle 可重复调用，每次都全量重建）---
t0 = now();
for (let i = 0; i < N; i++) inc.initBattle(ids, bonds, -1, null);
const t_init = (now() - t0) / N;

// --- ③ 65步裸走 = 整场 - init（用捕获初始态 + restoreState 起点验证）---
inc.initBattle(ids, bonds, -1, null);
const 初始态 = inc.captureState();
t0 = now();
for (let i = 0; i < N; i++) {
  inc.restoreState(初始态);
  const 原语 = inc.原语();
  for (let k = 0; k < 65; k++) { const t = toks[k]; t.act === '평' ? 原语.do_atk(t.idx) : t.act === '궁' ? 原语.do_ult(t.idx) : 原语.do_def(t.idx); }
  inc.dmgSoFar();
}
const t_restoreReplay = (now() - t0) / N;
t0 = now();
for (let i = 0; i < N; i++) { inc.captureState(); }
const t_capture = (now() - t0) / N;
t0 = now();
for (let i = 0; i < N; i++) { inc.restoreState(初始态); }
const t_restore = (now() - t0) / N;

// --- ④ 回合检查点：建一次，逐回合后缀重放 ---
// 建回合检查点/检查点评估 未从排程器导出，这里按同一语义本地实现（原语驱动，与生产爬山内部一致）
function 建cps() {
  if (!inc.initBattle(ids, bonds, -1, null)) return null;
  const cps = [inc.captureState()];
  const 原 = inc.原语();
  for (let t = 0; t < 13; t++) {
    for (let k = 0; k < 5; k++) {
      const tk = toks[t * 5 + k];
      const o = tk.act === '평' ? 原.do_atk(tk.idx) : tk.act === '궁' ? 原.do_ult(tk.idx) : 原.do_def(tk.idx);
      if (!o) return null;
    }
    cps.push(inc.captureState());
  }
  return cps;
}
function cps评估(cps, 起) {
  const 原 = inc.原语();
  inc.restoreState(cps[起]);
  for (let i = 起 * 5; i < 65; i++) {
    const tk = toks[i];
    const o = tk.act === '평' ? 原.do_atk(tk.idx) : tk.act === '궁' ? 原.do_ult(tk.idx) : 原.do_def(tk.idx);
    if (!o) return 0;
  }
  return inc.dmgSoFar();
}
const cps = 建cps();
const 后缀 = [];
for (let t = 1; t <= 13; t++) {
  t0 = now();
  for (let i = 0; i < N; i++) cps评估(cps, t);
  后缀.push((now() - t0) / N);
}
const 后均 = 后缀.reduce((a, b) => a + b, 0) / 后缀.length;

// --- ⑤ bit一致性自检：fastReplay vs restore+裸走 ---
const dA = inc.fastReplay(ids, toks, bonds, -1, null);
inc.restoreState(初始态);
const 原语 = inc.原语();
for (let k = 0; k < 65; k++) { const t = toks[k]; t.act === '평' ? 原语.do_atk(t.idx) : t.act === '궁' ? 原语.do_ult(t.idx) : 原语.do_def(t.idx); }
const dB = inc.dmgSoFar();

console.log(`N=${N} toks: 평${计数.평} 궁${计数.궁} 방${计数.방}`);
console.log(`fastReplay 整场      = ${t_full.toFixed(3)} ms`);
console.log(`initBattle 单独      = ${t_init.toFixed(3)} ms  (占整场 ${(t_init / t_full * 100).toFixed(1)}%)`);
console.log(`captureState        = ${(t_capture * 1000).toFixed(0)} us   restoreState = ${(t_restore * 1000).toFixed(0)} us`);
console.log(`restore初始态+65步裸走 = ${t_restoreReplay.toFixed(3)} ms  → init替换收益 ≈ x${(t_full / t_restoreReplay).toFixed(2)}`);
console.log(`检查点后缀重放 t=1..13: ${后缀.map(x => x.toFixed(2)).join(' ')} ms`);
console.log(`后缀均值 = ${后均.toFixed(3)} ms vs 整场 ${t_full.toFixed(3)} ms → x${(t_full / 后均).toFixed(2)}（爬山邻域评估若走检查点，此为倍率上界）`);
console.log(`bit一致: fastReplay=${dA} restore+裸走=${dB} 相同=${dA === dB}`);
