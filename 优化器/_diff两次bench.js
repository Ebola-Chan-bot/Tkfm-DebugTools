'use strict';
/*
 * _diff两次bench.js <日志A> <日志B> —— 逐队 终值 差分（按 ids 键对齐，动态队列下完工顺序乱序）
 * 用途：R9h(开门控) vs R9g(关门控) 验收——断言每队 终% bit 级一致；统计门控省下的总耗时(ms段)。
 * 输出：不一致队清单（若有）+ 一致队数 + A/B 分段耗时对比。
 */
const fs = require('fs');

function 解析(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const byId = new Map();
  for (const l of lines) {
    const m = l.match(/^(\S+)\[([\d,]+)\]: 前瞻([\d.]+)% 束([\d.]+)%\+爬([\d.]+)% 终([\d.]+)%/);
    if (!m) continue;
    const ids = m[2];
    const g = { 名: m[1], ids, 终: +m[6], 爬: +m[5], 束: +m[4], 前瞻: +m[3] };
    const msrc = l.match(/源=(\S+)/); if (msrc) g.来源 = msrc[1];
    const mms = l.match(/ms\[束(\d+) 爬(\d+) 兜(\d+) 节拍(\d+) 窗(\d+) 序(\d+)\]/);
    if (mms) { g.ms = { 束: +mms[1], 爬: +mms[2], 兜: +mms[3], 节拍: +mms[4], 窗: +mms[5], 序: +mms[6] }; g.ms和 = Object.values(g.ms).reduce((a, b) => a + b, 0); }
    byId.set(ids, g);
  }
  return byId;
}

const [fa, fb] = process.argv.slice(2);
const A = 解析(fa), B = 解析(fb);   // A=关门控基线(R9g) B=开门控(R9h)
const 共 = [...A.keys()].filter(k => B.has(k));
let 不一致 = 0; const 掉分队 = [], 涨分队 = [];
for (const k of 共) {
  const a = A.get(k), b = B.get(k);
  const Δ = +(b.终 - a.终).toFixed(4);
  if (Math.abs(Δ) > 1e-9) { 不一致++; (Δ < 0 ? 掉分队 : 涨分队).push(`${Δ > 0 ? '+' : ''}${Δ}pp ${b.名}[${k}] A${a.终}→B${b.终}`); }
}
console.log(`对齐队数=${共.length} (A=${A.size} B=${B.size})`);
console.log(`终值不一致=${不一致}队 (掉分${掉分队.length} 涨分${涨分队.length})`);
掉分队.sort().forEach(x => console.log('  ↓' + x));
涨分队.sort().forEach(x => console.log('  ↑' + x));
if (不一致 === 0) console.log('✓ 门控 bit 级零行为变化（每队终值完全一致）');

// 分段耗时对比（仅统计两日志都有的队）
const 段名 = { 束: '束', 爬: '爬', 兜: '兜(相位)', 节拍: '节拍', 窗: '窗', 序: '序重排' };
const Ah = {}, Bh = {};
for (const k of 共) {
  if (!A.get(k).ms || !B.get(k).ms) continue;
  for (const s in 段名) { Ah[s] = (Ah[s] || 0) + A.get(k).ms[s]; Bh[s] = (Bh[s] || 0) + B.get(k).ms[s]; }
}
if (Object.keys(Ah).length) {
  console.log('\n=== 分段耗时(串,秒) A关门控 vs B开门控 ===');
  let Atot = 0, Btot = 0;
  for (const s in 段名) { Atot += (Ah[s] || 0); Btot += (Bh[s] || 0); console.log(`  ${段名[s]}: A=${Ah[s] || 0} B=${Bh[s] || 0} Δ=${(Bh[s] || 0) - (Ah[s] || 0)}`); }
  console.log(`  合计: A=${Atot}s B=${Btot}s 省=${Atot - Btot}s (${(Atot ? (Atot - Btot) / Atot * 100 : 0).toFixed(1)}%) 提速=${(Btot ? Atot / Btot : 0).toFixed(2)}x`);
}
