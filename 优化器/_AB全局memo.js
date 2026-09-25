'use strict';
/*
 * _AB全局memo.js —— 爬山全局 memo 表 A/B（零行为变化验证 + 提速计时）
 * A = memo 开（新默认）；B = memo 关（旧行为）。两跑之间 爬山memo.clear() + 统计归零。
 * 口径 = 生产兜底链最坏情况：相位档{5,99}（生产已带段内档去重）→ 节拍TopK3 → 窗TopK3，
 *   全部爬山(30000+谷底8)、max取优。段内重复已被各自局部去重吃掉，本 A/B 度量的是
 *   **跨段重合**的 memo 吸收（_探针跨段重复 天花板：61→49 省20%）。
 * 断言：A.终dmg == B.终dmg 且 A.终toks键 == B.终toks键（逐位一致，不只是"不掉分"——
 *   memo 是缓存同一确定性函数的结果，任何差异都是 bug）。
 */
const 排 = require('./排程器.js');
const 适配 = require('./引擎适配.js');
const BOND = [5, 5, 5, 5, 5];
const 预算 = 30000, 谷底 = 8;

const 队 = [
  ['후지카98.02', [10213, 10190, 10167, 10164, 10155]],
  ['94队', [10197, 10152, 10096, 10177, 10163]],
  ['승나미89', [10177, 10060, 10211, 10208, 10197]],
  ['시엘98.62', [10210, 10212, 10196, 10134, 10072]],
  ['나리', [10202, 10212, 10133, 10210, 10072]],
  ['얀코相位难', [10197, 10152, 10096, 10193, 10147]],
];

const inst = 适配.createEngine();

// 支持 `node _AB全局memo.js <索引>`：只跑 队[索引] 单队（并行模式——每进程有独立 爬山memo，require 缓存隔离，
//   跨进程天然无干扰；此时多进程抢核 → 提速数字仅供参考，正确性(逐位一致)才是并行gate，权威总提速看 N200 R9h）。
const 只队 = process.argv[2] != null ? Number(process.argv[2]) : null;
const 待跑队 = (只队 != null && Number.isInteger(只队) && 只队 >= 0 && 只队 < 队.length)
  ? [队[只队]] : 队;

function 兜底链(ids) {   // 复刻 内层benchmark 评一队 的三段兜底（束/爬段不参与：起点唯一无跨段重复）
  let 终 = { toks: null, dmg: 0 };
  const 见构 = new Set();   // 相位档间去重（生产同款）
  for (const 憋 of [5, 99]) {
    const g = 排.相位对齐构造(inst, ids, BOND, { 最大憋: 憋 });
    if (!g || !(g.dmg > 0)) continue;
    const k = 排.toks键(g.toks);
    if (g.dmg > 终.dmg) 终 = { toks: g.toks, dmg: g.dmg };
    if (见构.has(k)) continue;
    见构.add(k);
    const gh = 排.爬山(inst, ids, g.toks, BOND, 预算, null, null, 谷底);
    if (gh && gh.dmg > 终.dmg) 终 = { toks: gh.toks, dmg: gh.dmg };
  }
  const 节拍 = 排.节拍对齐构造(inst, ids, BOND, { TopK: 3 }) || [];
  for (const 构 of 节拍) {
    if (构.dmg > 终.dmg) 终 = { toks: 构.toks, dmg: 构.dmg };
    const gh = 排.爬山(inst, ids, 构.toks, BOND, 预算, null, null, 谷底);
    if (gh && gh.dmg > 终.dmg) 终 = { toks: gh.toks, dmg: gh.dmg };
  }
  const 窗 = 排.窗对齐构造(inst, ids, BOND, { TopK: 3 }) || [];
  for (const 构 of 窗) {
    if (构.dmg > 终.dmg) 终 = { toks: 构.toks, dmg: 构.dmg };
    const gh = 排.爬山(inst, ids, 构.toks, BOND, 预算, null, null, 谷底);
    if (gh && gh.dmg > 终.dmg) 终 = { toks: gh.toks, dmg: gh.dmg };
  }
  return 终;
}

let 全一致 = true;
for (const [名, ids] of 待跑队) {
  // A：memo 开
  排.爬山memo.clear();
  排.爬山memo设置.启用 = true; 排.爬山memo设置.统计.命中 = 0; 排.爬山memo设置.统计.存 = 0;
  let t = process.hrtime.bigint();
  const A = 兜底链(ids);
  const Ams = Number(process.hrtime.bigint() - t) / 1e6;
  const A命中 = 排.爬山memo设置.统计.命中, A存 = 排.爬山memo设置.统计.存;
  // B：memo 关
  排.爬山memo.clear();
  排.爬山memo设置.启用 = false;
  t = process.hrtime.bigint();
  const B = 兜底链(ids);
  const Bms = Number(process.hrtime.bigint() - t) / 1e6;
  排.爬山memo设置.启用 = true;
  const okDmg = Math.abs(A.dmg - B.dmg) < 1e-9;
  const okToks = 排.toks键(A.toks) === 排.toks键(B.toks);
  if (!(okDmg && okToks)) 全一致 = false;
  console.log(`${okDmg && okToks ? '✓' : '✗不一致!'} ${名}: 终A=${(A.dmg / 1e9).toFixed(6)}G 终B=${(B.dmg / 1e9).toFixed(6)}G Δ=${((A.dmg - B.dmg) / 1e9).toFixed(6)}G toks同=${okToks} | memo命中=${A命中} 存=${A存} | A=${(Ams / 1000).toFixed(1)}s B=${(Bms / 1000).toFixed(1)}s 提速=${Ams > 0 ? (Bms / Ams).toFixed(2) : '-'}x`);
}
console.log(全一致 ? '\n[结论] 全部逐位一致 ✓ memo零行为变化' : '\n[结论] 存在不一致 ✗ 必须回滚排查');
