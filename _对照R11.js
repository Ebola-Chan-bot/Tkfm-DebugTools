// _对照R11.js —— 引擎重写后(R11) vs 重写前(R10) 精选集逐队对照。
// 验收双口径：① 53队 终% 逐队零回退（bit-exact 已证，这里复核端到端一致）；② 分段ms 墙钟提速。
const fs = require('fs');
const 解析 = p => {
  const m = new Map();
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const g = l.match(/^(\S+)\[([\d,]+)\].*终(\d+\.\d+)%.*ms\[束(\d+) 爬(\d+) 兜(\d+) 节拍(\d+) 窗(\d+) 序(\d+)\]/);
    if (g) m.set(g[2], { 名: g[1], 终: +g[3], 束: +g[4], 爬: +g[5], 兜: +g[6], 节拍: +g[7], 窗: +g[8], 序: +g[9] });
    else { const g2 = l.match(/^(\S+)\[([\d,]+)\].*终(\d+\.\d+)%/); if (g2) m.set(g2[2], { 名: g2[1], 终: +g2[3] }); }
  }
  return m;
};
const A = 解析('D:/张天夫/TKFM/Tkfm-DebugTools/_精选R10.log');
const B = 解析('D:/张天夫/TKFM/Tkfm-DebugTools/_精选R11引擎重写.log');
console.log('R10解析', A.size, '队; R11解析', B.size, '队');
let 同 = 0, 升 = 0, 降 = 0;
const 降队 = [], 升队 = [];
for (const [ids, b] of B) {
  const a = A.get(ids);
  if (!a) { console.log('⚠️ R10无此队:', ids); continue; }
  const Δ = +(b.终 - a.终).toFixed(2);
  if (Δ < -0.005) { 降++; 降队.push(`${b.名}[${ids}] R10=${a.终}% → R11=${b.终}% Δ=${Δ}`); }
  else if (Δ > 0.005) { 升++; 升队.push(`${b.名}[${ids}] R10=${a.终}% → R11=${b.终}% Δ=+${Δ}`); }
  else 同++;
}
console.log(`逐队对照: 相同=${同} 提升=${升} 回退=${降}`);
if (降队.length) { console.log('--- ❌ 回退队 ---'); 降队.forEach(x => console.log(' ', x)); }
if (升队.length) { console.log('--- ⚠ 提升队(bit-exact下理论不该有,若>0.005pp说明有非确定性) ---'); 升队.forEach(x => console.log(' ', x)); }
// 分段ms墙钟对照
const 段和 = { 束: 0, 爬: 0, 兜: 0, 节拍: 0, 窗: 0, 序: 0 }, A和 = { 束: 0, 爬: 0, 兜: 0, 节拍: 0, 窗: 0, 序: 0 };
let n = 0;
for (const [ids, b] of B) { const a = A.get(ids); if (!a || a.窗 === undefined || b.窗 === undefined) continue; n++; for (const k of Object.keys(段和)) { 段和[k] += b[k]; A和[k] += a[k]; } }
if (A和.窗 !== undefined && n) {
  console.log(`--- 墙钟(串行段ms汇总)提速 ---`);
  for (const k of Object.keys(段和)) console.log(`  ${k}: ${A和[k]}→${段和[k]} (x${(A和[k] / 段和[k]).toFixed(2)})`);
  const 总A = Object.values(A和).reduce((a, b) => a + b, 0), 总B = Object.values(段和).reduce((a, b) => a + b, 0);
  console.log(`  合计: ${总A}→${总B} (x${(总A / 总B).toFixed(2)})`);
}
// 墙钟（进程实际耗时，从日志汇总行抓"总耗时"）
const wallOf = p => { const l = fs.readFileSync(p, 'utf8').match(/总耗时\s*(\d+)s/); return l ? +l[1] : null; };
const wA = wallOf('D:/张天夫/TKFM/Tkfm-DebugTools/_精选R10.log'), wB = wallOf('D:/张天夫/TKFM/Tkfm-DebugTools/_精选R11引擎重写.log');
if (wA && wB) console.log(`串行账总耗时: R10=${wA}s → R11=${wB}s (x${(wA / wB).toFixed(2)})`);
