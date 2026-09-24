'use strict';
/*
 * _实验M4联合窗.js：残差三支队（89.74/91.92/92.62，单一全局S窗无法表达"队内多相位"DB解）的联合窗验证。
 *
 * 假说：DB 多相位 = 各槽按自身有效 CD 节奏落在不同窗，但**全部落点 ⊆ 各槽窗的并集**。
 *   窗对齐构造用引擎真实 curCd 推进——每槽只在"就绪 且 t∈S"时放궁。若 S 取并集，
 *   各槽的自然节奏会被引擎状态自动区分（位3 cd3 → t1,4,7,10,13；位4/5 cd4 → t3,7,11），
 *   单一全局 S 即可表达多相位，无需每槽独立窗。
 *   例 92승나미：DB 位1/3=[1,4,7,10,13](T3t0=1)、位4/5=[3,7,13]≈T4t0=3{3,7,11}(t13≠t11 由降CD动力学生成，爬山可修)。
 *   联合窗 S={1,3,4,7,10,11,13}：位3 在 t1 就绪即放（1∈S），位4 在 t3 就绪即放（3∈S）→ 各归各位。
 *
 * 测试：对三支残差队 + 85队(回归)，用生产版 排程器.窗对齐构造 的 设置.S族 注入口，
 *   传入[周期窗∪节拍窗 的两两联合 + 三窗联合 + 原单窗]，爬山60000/谷底8/TopK4，对照现终。
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
    if (String(d.compstr).split(/\s+/).filter(Boolean).map(Number).join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = d;
  }
  return best;
}

// 生成候选窗集（与生产 S族 同逻辑的本地轻量版）
function 窗集(ids) {
  const 集 = new Map();
  const 加 = (S, 来源) => {
    const 정 = [...new Set(S)].sort((a, b) => a - b);
    if (!정.length) return;
    const 键 = 정.join(',');
    if (!集.has(键)) 集.set(键, { S: 정, 来源 });
  };
  const cds = [...new Set(ids.map(id => (排程器.特征.get(id) || {}).cd).filter(c => c >= 1 && c <= 12))];
  for (const T of cds) for (let t0 = 1; t0 <= T; t0++) {   // t0 只需扫 1..T（再多为重复集）
    const S = []; for (let t = t0; t <= 13; t += T) S.push(t);
    加(S, `T${T}t0=${t0}`);
  }
  // 机制周期窗（简化硬提取：10177 (t-1)%3=0 → {4,7,10,13}；通用逻辑在生产 窗对齐构造 内，这里直接枚举 mod3 相位）
  for (let r = 0; r < 3; r++) { const S = []; for (let t = 2; t <= 13; t++) if ((t - 1) % 3 === r) S.push(t); 加(S, `周期3r${r}`); }
  return [...集.values()];
}

function 联合族(ids) {
  const 单 = 窗集(ids);
  const 出 = [];
  const 见 = new Set();
  const 推 = (S, 来源) => {
    const 정 = [...new Set(S)].sort((a, b) => a - b);
    const 键 = 정.join(',');
    if (!见.has(键)) { 见.add(键); 出.push({ S: 정, 来源 }); }
  };
  // 单窗（周期族 + 节拍族）
  for (const c of 单) 推(c.S, c.来源);
  // 手工联合：周期3族(每相位) × 周期4族(每相位) 的并集 —— 92승나미 多相位假说的直接验证
  //   周期3 r∈{0,1,2} → {4,7,10,13}/{2,5,8,11}/{1,3,6,9,12}；周期4 t0∈{1..4} → {1,5,9,13}/{2,6,10}/{3,7,11}/{4,8,12}
  const 周3 = [ [4,7,10,13],[2,5,8,11],[1,3,6,9,12],[3,6,9,12],[2,5,8] ];
  const 周4 = [ [1,5,9,13],[2,6,10],[3,7,11],[4,8,12],[1,5,9],[2,6,10,13],[3,7,10,13] ];
  for (const a of 周3) for (const b of 周4) {
    const 联 = [...new Set([...a, ...b])];
    if (联.length > 10) continue;   // 并集太宽 → 约束失效(≈全放),跳过
    推(联, `联{${a.join('')}}∪{${b.join('')}}`);
  }
  return 出;
}

const 目标 = [
  { 名: '89队얀코', ids: '10197,10060,10177,10193,10211', 现终: 89.74 },
  { 名: '92승나미', ids: '10177,10152,10208,10211,10197', 现终: 91.92 },
  { 名: '93승나미', ids: '10177,10152,10193,10197,10208', 现终: 92.62 },
  { 名: '85队(回归)', ids: '10197,10060,10177,10193,10208', 现终: 100.04 },
];

const inst = 适配.createEngine();
const 爬山预算 = Number(process.argv[2]) || 30000;
const 谷底 = Number(process.argv[3]) || 8;
const TopK = Number(process.argv[4]) || 6;

for (const g of 目标) {
  const db = DB队(g.ids);
  const ids0 = g.ids.split(',').map(Number);
  const DBtoks = 排程器.解析指令集(inst, ids0, db.description, BOND);
  const 真값 = 排程器.重放(inst, ids0, DBtoks, BOND);
  const pct = x => (x / 真값 * 100).toFixed(2) + '%';
  console.log(`\n########## ${g.名} ${g.ids} DB=${(真값 / 1e9).toFixed(3)}G 现终=${g.现终}% ##########`);
  const 族 = 联合族(ids0);
  console.log(`联合窗族 ${族.length} 个（含单窗+两两联合+首发变体）`);
  const t0 = Date.now();
  // 先只看构造 dmg 排序（不爬山），确认联合窗能否在构造阶段就命中 DB 多相位结构
  const 构造们 = 排程器.窗对齐构造(inst, ids0, BOND, { TopK: 10, S族: 族, 全部: true });
  console.log('构造 Top5（含联合窗）:');
  构造们.slice(0, 5).forEach((r, i) => console.log(`  #${i+1} S={${r.S.join(',')}} ${r.buff窗?'窗憋':'准点'} 构造${pct(r.dmg)}`));
  const r = 排程器.窗对齐构造(inst, ids0, BOND, { TopK, 爬山预算, 谷底试探: 谷底, S族: 族 });
  const 提升 = r ? r.dmg / 真값 * 100 - g.现终 : -100;
  console.log(`联合窗+爬终=${r ? pct(r.dmg) : '0%'} [${r ? r.来源 : '-'}] vs 现终=${g.现终}% → ${提升 > 0.05 ? '★+' + 提升.toFixed(2) + 'pp' : '▼' + 提升.toFixed(2) + 'pp'} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
console.log('\n完成');
