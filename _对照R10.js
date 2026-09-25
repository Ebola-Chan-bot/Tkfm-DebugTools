// 一次性分析（可删）：R10精选集 vs R9g同队逐队对照，验收"不回退"。
// 口径：按ids匹配，比较 终%（6位小数不可得，日志只有2位），任何Δ<-0.005pp都视为回退。
const fs = require('fs');
const 解析 = p => {
  const m = new Map();
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const g = l.match(/^(\S+)\[([\d,]+)\].*终(\d+\.\d+)%.*ms\[束(\d+) 爬(\d+) 兜(\d+)\s+节拍(\d+)\s+窗(\d+)/);
    if (g) m.set(g[2], { 名: g[1], 终: +g[3], 束: +g[4], 爬: +g[5], 兜: +g[6], 节拍: +g[7], 窗: +g[8], 行: l.trim() });
    else {
      const g2 = l.match(/^(\S+)\[([\d,]+)\].*终(\d+\.\d+)%/);
      if (g2) m.set(g2[2], { 名: g2[1], 终: +g2[3], 行: l.trim() });
    }
  }
  return m;
};
const A = 解析('D:/张天夫/TKFM/Tkfm-DebugTools/_benchR9g.log');
const B = 解析('D:/张天夫/TKFM/Tkfm-DebugTools/_精选R10.log');
console.log('R9g解析', A.size, '队; R10解析', B.size, '队');
let 同 = 0, 升 = 0, 降 = 0, 未匹配 = 0;
const 降队 = [], 升队 = [];
for (const [ids, b] of B) {
  const a = A.get(ids);
  if (!a) { 未匹配++; console.log('⚠️ R9g无此队(不应发生):', ids); continue; }
  const Δ = +(b.终 - a.终).toFixed(2);
  if (Δ < -0.005) { 降++; 降队.push(`${b.名}[${ids}] R9g=${a.终}% → R10=${b.终}% Δ=${Δ}`); }
  else if (Δ > 0.005) { 升++; 升队.push(`${b.名}[${ids}] R9g=${a.终}% → R10=${b.终}% Δ=+${Δ}`); }
  else 同++;
}
console.log(`逐队对照: 相同=${同} 提升=${升} 回退=${降} 未匹配=${未匹配}`);
if (降队.length) { console.log('--- ❌ 回退队 ---'); 降队.forEach(x => console.log(' ', x)); }
if (升队.length) { console.log('--- ✓ 提升队(理论不应有,零行为变化) ---'); 升队.forEach(x => console.log(' ', x)); }
// 分段ms对照（同队）
if ([...B.values()].some(b => b.窗 !== undefined)) {
  const 段和 = { 束: 0, 爬: 0, 兜: 0, 节拍: 0, 窗: 0 }, 段和A = { 束: 0, 爬: 0, 兜: 0, 节拍: 0, 窗: 0 };
  let n = 0;
  for (const [ids, b] of B) {
    const a = A.get(ids);
    if (!a || a.窗 === undefined || b.窗 === undefined) continue;
    n++;
    for (const k of Object.keys(段和)) { 段和[k] += b[k]; 段和A[k] += a[k]; }
  }
  console.log(`--- 同${n}队分段ms对照 (R9g→R10, 收缩率) ---`);
  for (const k of Object.keys(段和)) {
    const r = 段和A[k] ? (段和[k] / 段和A[k]) : NaN;
    console.log(`  ${k}: ${段和A[k]}→${段和[k]} (x${r.toFixed(3)})`);
  }
}
