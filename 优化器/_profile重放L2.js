// _profile重放L2.js —— 引擎函数级火焰账（⑤层2剖析）
// 跑法：node --cpu-prof --cpu-prof-interval=100 --cpu-prof-dir=. _profile重放L2.js
// 然后解析生成的 .cpuprofile：按 functionName(去重url) 聚合 self-time，输出 Top25
// 负载：N 次 fastReplay（94队 toks，与层1同负载）+ 等量检查点后缀评估（贴近爬山真实混合）
'use strict';
const fs = require('fs');
const path = require('path');
const 适配 = require('./引擎适配.js');
const 排程 = require('./排程器.js');

const ids = [10197, 10152, 10096, 10177, 10163];
const bonds = [5, 5, 5, 5, 5];
const inst = 适配.createEngine();
const inc = inst.increment;
const cand = 排程.窗对齐构造(inst, ids, bonds, { TopK: 1 });
const toks = (Array.isArray(cand) ? cand[0] : cand).toks;

const N = 800; // ~800×(3.5ms+1.4ms) ≈ 4s 纯负载

// 负载A：整场 fastReplay（束搜索/序/构造评分路径）
for (let i = 0; i < N; i++) inc.fastReplay(ids, toks, bonds, -1, null);

// 负载B：检查点后缀评估（爬山邻域路径的真实形态）
inc.initBattle(ids, bonds, -1, null);
const cps = [inc.captureState()];
const 原 = inc.原语();
for (let t = 0; t < 13; t++) {
  for (let k = 0; k < 5; k++) { const tk = toks[t * 5 + k]; tk.act === '평' ? 原.do_atk(tk.idx) : tk.act === '궁' ? 原.do_ult(tk.idx) : 原.do_def(tk.idx); }
  cps.push(inc.captureState());
}
for (let i = 0; i < N; i++) {
  const t = 1 + (i % 13);
  inc.restoreState(cps[t]);
  const o2 = inc.原语();
  for (let j = t * 5; j < 65; j++) { const tk = toks[j]; tk.act === '평' ? o2.do_atk(tk.idx) : tk.act === '궁' ? o2.do_ult(tk.idx) : o2.do_def(tk.idx); }
  inc.dmgSoFar();
}

// ---- 解析本进程 cpu-prof 输出不可行（进程结束才落盘），这里改为提示外部脚本解析 ----
console.log('负载完成 N=' + N + '×(fastReplay + 后缀评估)。请用 _解析cpuprofile.js 解析同目录 *.cpuprofile');

// ---- 若存在 profile 文件（二次运行），顺手解析 ----
if (process.argv.includes('--analyze')) {
  const dir = __dirname;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.cpuprofile'));
  if (!files.length) { console.log('未找到 .cpuprofile，先跑: node --cpu-prof --cpu-prof-dir=. _profile重放L2.js'); process.exit(0); }
  files.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
  for (const f of files.slice(0, 2)) {
    console.log('==== ' + f + ' ====');
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const byId = new Map();
    for (const n of p.nodes) byId.set(n.id, n);
    const self = new Map();
    // timeDeltas 与 samples 一一对应
    for (let i = 0; i < p.samples.length; i++) {
      const n = byId.get(p.samples[i]);
      if (!n) continue;
      const cf = n.callFrame;
      const 名 = (cf.functionName || '(匿名)') + ' @' + String(cf.url || '').split(/[\\/]/).pop() + ':' + (cf.lineNumber + 1);
      self.set(名, (self.get(名) || 0) + (p.timeDeltas[i] || 0));
    }
    const 总 = [...self.values()].reduce((a, b) => a + b, 0);
    const 排序 = [...self.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`total ${(总 / 1000).toFixed(0)}ms  Top25 self-time:`);
    for (const [名, us] of 排序.slice(0, 25)) console.log(`  ${(us / 1000).toFixed(0).padStart(6)}ms ${(us / 总 * 100).toFixed(1).padStart(5)}%  ${名}`);
  }
}
