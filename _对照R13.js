// _对照R13.js —— R3-B影子字段后(R13) vs 引擎重写基线(R12) 精选集逐队对照。
// 验收双口径：① 53队 终% 逐队零回退（bit-exact 3150场已证，这里复核端到端一致）；② 分段ms 墙钟提速。
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
const A = 解析('D:/张天夫/TKFM/Tkfm-DebugTools/_精选R12.log');
const B = 解析('D:/张天夫/TKFM/Tkfm-DebugTools/优化器/_精选R13.log');
console.log('R12解析', A.size, '队; R13解析', B.size, '队');
let 同 = 0, 升 = 0, 降 = 0;
const 降队 = [], 升队 = [];
for (const [ids, b] of B) {
  const a = A.get(ids);
  if (!a) { console.log('⚠️ R12无此队:', ids); continue; }
  const Δ = +(b.终 - a.终).toFixed(2);
  if (Δ < -0.005) { 降++; 降队.push(`${b.名}[${ids}] R12=${a.终}% → R13=${b.终}% Δ=${Δ}`); }
  else if (Δ > 0.005) { 升++; 升队.push(`${b.名}[${ids}] R12=${a.终}% → R13=${b.终}% Δ=+${Δ}`); }
  else 同++;
}
console.log(`逐队对照: 相同=${同} 提升=${升} 回退=${降}`);
if (降队.length) { console.log('--- ❌ 回退队 ---'); 降队.forEach(x => console.log(' ', x)); }
if (升队.length) { console.log('--- ⚠ 变动队(爬山随机抖动或非确定性,需人工核对) ---'); 升队.forEach(x => console.log(' ', x)); }
// 分段ms墙钟对照
const 段和 = { 束: 0, 爬: 0, 兜: 0, 节拍: 0, 窗: 0, 序: 0 }, A和 = { 束: 0, 爬: 0, 兜: 0, 节拍: 0, 窗: 0, 序: 0 };
let Bn = 0, An = 0;
for (const [, b] of B) if (b.束 !== undefined) { for (const k of Object.keys(段和)) 段和[k] += b[k]; Bn++; }
for (const [, a] of A) if (a.束 !== undefined) { for (const k of Object.keys(A和)) A和[k] += a[k]; An++; }
console.log(`分段ms合计(串) R12→R13:`);
for (const k of Object.keys(段和)) {
  const 倍 = A和[k] > 0 ? (A和[k] / 段和[k]).toFixed(2) : '-';
  console.log(`  ${k}: ${A和[k]} → ${段和[k]} ms  x${倍}`);
}
const A总 = Object.values(A和).reduce((x, y) => x + y, 0), B总 = Object.values(段和).reduce((x, y) => x + y, 0);
console.log(`  总: ${A总} → ${B总} ms  x${(A总 / B总).toFixed(2)}`);
