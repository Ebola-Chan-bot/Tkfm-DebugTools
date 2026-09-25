'use strict';
/*
 * _AB窗去重.js —— 窗对齐构造 toks 去重 A/B
 * A = 去重开（新默认）；B = 去重:false（旧行为）。口径 = 生产窗段：TopK3、爬山预算30000、谷底试探8、逐候选爬山max取优。
 * 断言：A.终 ≥ B.终（单调不掉分——数学guaranteed 见 排程器.js 见toks 注释）；计时给出窗段提速。
 * 顺带测 节拍对齐构造 候选 toks 重复度（若有同病则一并去重）。
 */
const 排 = require('./排程器.js');
const 适配 = require('./引擎适配.js');
const BOND = [5, 5, 5, 5, 5];
const 预算 = 30000, 谷底 = 8;
const 键 = t => t.map(x => x.idx + x.act).join('');

const 队 = [
  ['후지카98.02', [10213, 10190, 10167, 10164, 10155]],
  ['94队', [10197, 10152, 10096, 10177, 10163]],
  ['승나미89', [10177, 10060, 10211, 10208, 10197]],
  ['시엘98.62', [10210, 10212, 10196, 10134, 10072]],
  ['나리', [10202, 10212, 10133, 10210, 10072]],
  ['얀코相位难', [10197, 10152, 10096, 10193, 10147]],
  ['얀코177', [10197, 10152, 10177, 10163, 10147]],
  ['闸外2', [10197, 10152, 10196, 10163, 10147]],
];

const inst = 适配.createEngine();

function 窗段(cands) {           // 复刻 内层benchmark 窗段：逐候选爬山、max取优
  let 终 = { toks: null, dmg: 0 };
  for (const 构 of cands) {
    if (构.dmg > 终.dmg) 终 = { toks: 构.toks, dmg: 构.dmg };
    const gh = 排.爬山(inst, 队ids, 构.toks, BOND, 预算, null, null, 谷底);
    if (gh && gh.dmg > 终.dmg) 终 = { toks: gh.toks, dmg: gh.dmg };
  }
  return 终;
}

let 队ids;
let 全不掉 = true;
for (const [名, ids] of 队) {
  队ids = ids;
  // 候选结构快照（不爬山，快）
  const cA = 排.窗对齐构造(inst, ids, BOND, { TopK: 3 });
  const cB = 排.窗对齐构造(inst, ids, BOND, { TopK: 3, 去重: false });
  const dA = new Set(cA.map(c => 键(c.toks))).size, dB = new Set(cB.map(c => 键(c.toks))).size;
  let t = process.hrtime.bigint();
  const A = 窗段(cA);
  const Ams = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint();
  const B = 窗段(cB);
  const Bms = Number(process.hrtime.bigint() - t) / 1e6;
  const ok = A.dmg >= B.dmg - 1e-6;
  if (!ok) 全不掉 = false;
  console.log(`${ok ? '✓' : '✗掉分!'} ${名}: 候选A=${cA.length}(distinct ${dA}) B=${cB.length}(distinct ${dB}) | 终A=${(A.dmg / 1e9).toFixed(3)}G 终B=${(B.dmg / 1e9).toFixed(3)}G Δ=${((A.dmg - B.dmg) / 1e9).toFixed(3)}G | A=${(Ams / 1000).toFixed(1)}s B=${(Bms / 1000).toFixed(1)}s 提速=${Bms > 0 ? (Bms / Ams).toFixed(2) : '-'}x`);
}
console.log(全不掉 ? '\n[结论] 全部 A≥B 单调不掉分 ✓' : '\n[结论] 存在掉分 ✗ 必须回滚排查');

// 节拍对齐构造重复度探测（只构造不爬山）
console.log('\n=== 节拍对齐构造 候选toks重复度 ===');
for (const [名, ids] of 队) {
  try {
    const c = 排.节拍对齐构造(inst, ids, BOND, { TopK: 3 });
    const d = new Set(c.map(x => 键(x.toks))).size;
    console.log(`${名}: 候选=${c.length} distinct-toks=${d} ${d < c.length ? '【有重复!】' : ''}`);
  } catch (e) { console.log(`${名}: 异常 ${e.message.slice(0, 60)}`); }
}
