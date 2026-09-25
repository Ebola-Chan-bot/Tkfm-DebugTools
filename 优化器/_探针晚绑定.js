// _探针晚绑定.js —— 裁决"兜底爬山候选晚绑定"（②修正形态）
//
// 背景：R10 分段账 兜底链（相位17.4% + 节拍25.6% + 窗34.0%）= 77% 为第一大头。
//   爬山本体天然收敛即停（30000 预算非约束，验证P5 实测难队 14-18k 评估），所以砍预算省不到钱；
//   真成本 = 满规格爬山(30000+谷底8, ~25-30s)的【次数】：每站位去重候选 5~7 个各全爬一遍。
// 晚绑定假说：每候选先轻爬(预算10000, K=0)，只对轻爬 TopJ 升级满规格爬 → 省 (n-J) 次满爬。
// 风险（验证T 实锤）：相位深谷候选"一步邻居全部变差"，轻爬(K=0 不跨谷)会低估它 → 排序翻转漏真最优。
// 本探针量化：轻爬排序命中率(Top1/Top2) + 晚绑定 dmg 损失 + 时间节省比。
//
// 用法：node _探针晚绑定.js <队列索引0..9>   （单队并行模式，输出各自日志聚合）
// 判据（用户纪律"确认显著提升即落地"）：Top2 命中且损失=0 的队 ≥8/10 → 晚绑定(TopJ=2)落地。
'use strict';
const 适配 = require('./引擎适配.js');
const 排程 = require('./排程器.js');

const 队列表 = [
  ['후지카',    [10213, 10190, 10167, 10164, 10155]],
  ['94队',      [10197, 10152, 10096, 10177, 10163]],
  ['승나미',    [10177, 10060, 10211, 10208, 10197]],
  ['시엘',      [10210, 10212, 10196, 10134, 10072]],
  ['나리',      [10202, 10212, 10133, 10210, 10072]],
  ['97.9队',    [10197, 10167, 10147, 10163, 10134]],
  ['85.16队',   [10197, 10152, 10196, 10177, 10147]],
  ['얀코相位',  [10197, 10196, 10151, 10134, 10147]],
  ['칼리버',    [10211, 10167, 10128, 10190, 10197]],
  ['신이카',    [10197, 10152, 10096, 10193, 10211]],
];

const 索引 = Number(process.argv[2] || 0);
const [名, ids] = 队列表[索引];
const bonds = [5, 5, 5, 5, 5];
const inst = 适配.createEngine();

// ---- 收集兜底链去重候选（与 团队搜索器 生产口径一致）----
const 见 = new Set();
const 候选 = [];
const push = (toks, dmg, 段) => {
  const 键 = 排程.toks键(toks);
  if (见.has(键)) return;
  见.add(键);
  候选.push({ toks, dmg, 段 });
};
// 相位档 {5,99}（toks级去重，与生产链路同）
for (const 憋 of [5, 99]) {
  const c = 排程.相位对齐构造(inst, ids, bonds, { 最大憋: 憋 });
  if (c && c.dmg > 0) push(c.toks, c.dmg, '相位' + 憋);
}
// 节拍 TopK3
const 节拍 = 排程.节拍对齐构造(inst, ids, bonds, { TopK: 3 });
for (const c of 节拍 || []) if (c && c.dmg > 0) push(c.toks, c.dmg, '节拍');
// 窗对齐 TopK3（数组模式）
const 窗 = 排程.窗对齐构造(inst, ids, bonds, { TopK: 3 });
for (const c of 窗 || []) if (c && c.dmg > 0) push(c.toks, c.dmg, '窗');

console.log(`== ${名} [${ids.join(',')}] 去重候选 ${候选.length} 个 (${候选.map(c => c.段).join('|')})`);

// ---- 双规格爬山并记录 ----
const 满爬s = [], 轻爬s = [];
let 满总ms = 0, 轻总ms = 0;
for (let i = 0; i < 候选.length; i++) {
  const c = 候选[i];
  let t = process.hrtime.bigint();
  const 满 = 排程.爬山(inst, ids, c.toks, bonds, 30000, null, null, 8);
  let ms = Number(process.hrtime.bigint() - t) / 1e6;
  满总ms += ms; 满爬s.push({ dmg: 满.dmg, 评估: 满.评估, ms });
  t = process.hrtime.bigint();
  const 轻 = 排程.爬山(inst, ids, c.toks, bonds, 10000, null, null, 0);
  ms = Number(process.hrtime.bigint() - t) / 1e6;
  轻总ms += ms; 轻爬s.push({ dmg: 轻.dmg, 评估: 轻.评估, ms });
  console.log(`  #${i} ${c.段}: 满爬 ${(满.dmg / 1e9).toFixed(3)}G/${Math.round(满爬s[i].ms)}ms(评${满.评估}) 轻爬 ${(轻.dmg / 1e9).toFixed(3)}G/${Math.round(轻爬s[i].ms)}ms(评${轻.评估})`);
}

// ---- 裁决指标 ----
const 满最优i = 满爬s.reduce((b, x, i) => (满爬s[i].dmg > 满爬s[b].dmg ? i : b), 0);
const 轻序 = 轻爬s.map((x, i) => i).sort((a, b) => 轻爬s[b].dmg - 轻爬s[a].dmg);
const 损 = J => {
  const 选 = 轻序.slice(0, J);
  const best = Math.max(...选.map(i => 满爬s[i].dmg));
  return { 命中: 选.includes(满最优i), 损pp: (满爬s[满最优i].dmg - best) / 满爬s[满最优i].dmg * 100 };
};
const r1 = 损(1), r2 = 损(2);
// 时间账：现状全满爬 vs 晚绑定(全轻爬 + TopJ满爬)
const 绑1ms = 轻总ms + 满爬s[轻序[0]].ms;
const 绑2ms = 轻总ms + 满爬s[轻序[0]].ms + 满爬s[轻序[1]].ms;
console.log(`  满爬最优=#${满最优i}(${候选[满最优i].段}) 轻爬Top1=#${轻序[0]} Top2=[${轻序[0]},${轻序[1]}]`);
console.log(`  J=1: 命中=${r1.命中} 损=${r1.损pp.toFixed(4)}pp | J=2: 命中=${r2.命中} 损=${r2.损pp.toFixed(4)}pp`);
console.log(`  时间: 全满爬=${Math.round(满总ms)}ms 晚绑定J1=${Math.round(绑1ms)}ms(x${(满总ms / 绑1ms).toFixed(2)}) J2=${Math.round(绑2ms)}ms(x${(满总ms / 绑2ms).toFixed(2)})`);
console.log(`RESULT ${名} n=${候选.length} 满最优=${满最优i} 轻序=${轻序.join(',')} J1命中=${r1.命中} J1损=${r1.损pp.toFixed(4)} J2命中=${r2.命中} J2损=${r2.损pp.toFixed(4)} 满ms=${Math.round(满总ms)} J1ms=${Math.round(绑1ms)} J2ms=${Math.round(绑2ms)}`);
