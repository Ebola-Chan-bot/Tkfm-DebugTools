// _探针解释器.js —— 机制表解释器装配路径 vs 原生钩子：速度对照 + 逐位对拍（WASM 路线前置探针）
// 用法：node _探针解释器.js
// 输出：每队 dmg 对拍 + fastReplay 单场耗时（原生/解释器）+ 提速比 + 机制表覆盖度
// 判读：解释器若 ≥1.3x 且逐位一致 → R3 走"生产切解释器路径"；若更慢 → 走原地数值化(单态化+intern)。
'use strict';
const 适配 = require('./引擎适配.js');
const 排程 = require('./排程器.js');

const 队列 = [
  ['후지카', [10213, 10190, 10167, 10164, 10155]],
  ['94队', [10197, 10152, 10096, 10177, 10163]],
  ['승나미', [10177, 10060, 10211, 10208, 10197]],
  ['시엘', [10210, 10212, 10196, 10134, 10072]],
  ['나리', [10202, 10212, 10133, 10210, 10072]],
  ['97.9队', [10197, 10167, 10147, 10163, 10134]],
  ['85.16队', [10197, 10152, 10196, 10177, 10147]],
  ['칼리버', [10211, 10167, 10128, 10190, 10197]],
];
const bonds = [5, 5, 5, 5, 5];
const N = 200;
const now = () => Number(process.hrtime.bigint()) / 1e6;

const 原生 = 适配.createEngine();
const 解释 = 适配.createEngine({ 启用机制表: true });

// 机制表覆盖度
const 表ids = new Set(适配.机制数据().records.map(r => r.id));
const 全部ids = new Set(队列.flatMap(([, ids]) => ids));
const 缺 = [...全部ids].filter(id => !表ids.has(id));
console.log(`机制表记录=${表ids.size} 角色; 8队涉及${全部ids.size}角; 表外(回落setDefault)=[${缺.join(',')}]`);

let 总原 = 0, 总释 = 0, 不一致 = 0;
for (const [名, ids] of 队列) {
  const c = 排程.窗对齐构造(原生, ids, bonds, { TopK: 1 });
  const toks = (Array.isArray(c) ? c[0] : c).toks;
  if (!toks || toks.length !== 65) { console.log(`${名}: toks 获取失败`); continue; }
  const d1 = 原生.increment.fastReplay(ids, toks, bonds, -1, null);
  const d2 = 解释.increment.fastReplay(ids, toks, bonds, -1, null);
  const 一致 = d1 === d2;
  if (!一致) 不一致++;
  // 预热（JIT/解释器初始化）
  for (let i = 0; i < 30; i++) { 原生.increment.fastReplay(ids, toks, bonds, -1, null); 解释.increment.fastReplay(ids, toks, bonds, -1, null); }
  let t = now();
  for (let i = 0; i < N; i++) 原生.increment.fastReplay(ids, toks, bonds, -1, null);
  const t1 = (now() - t) / N;
  t = now();
  for (let i = 0; i < N; i++) 解释.increment.fastReplay(ids, toks, bonds, -1, null);
  const t2 = (now() - t) / N;
  总原 += t1; 总释 += t2;
  console.log(`${名}: 原生=${t1.toFixed(3)}ms 解释器=${t2.toFixed(3)}ms x${(t1 / t2).toFixed(2)} dmg一致=${一致} (${d1})`);
}
console.log(`合计: 原生=${总原.toFixed(1)}ms 解释器=${总释.toFixed(1)}ms x${(总原 / 总释).toFixed(2)} 不一致=${不一致}/8`);
