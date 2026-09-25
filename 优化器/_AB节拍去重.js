'use strict';
/*
 * _AB节拍去重.js —— 节拍对齐构造 toks 去重 A/B（与 _AB窗去重 同构）
 * A = 去重开（新默认，先 slice 再 filter）；B = 去重:false（旧行为）。
 * 复刻生产节拍段：逐候选 爬山(30000)+谷底试探8，max 取优。断言 A.终 ≥ B.终-1e-9（应为逐位一致）。
 */
const 排 = require('./排程器.js');
const 适配 = require('./引擎适配.js');
const BOND = [5, 5, 5, 5, 5];
const 预算 = 30000, 谷底 = 8;
const 键 = t => t.map(x => x.idx + x.act).join('');

const 队 = [
  ['후지카', [10213, 10190, 10167, 10164, 10155]],
  ['승나미', [10177, 10060, 10211, 10208, 10197]],
  ['나리', [10202, 10212, 10133, 10210, 10072]],
  ['94队', [10197, 10152, 10096, 10177, 10163]],
];

const inst = 适配.createEngine();
let ids;
function 节拍段(cands) {
  let 终 = { toks: null, dmg: 0 };
  for (const 构 of cands) {
    if (构.dmg > 终.dmg) 终 = { toks: 构.toks, dmg: 构.dmg };
    const gh = 排.爬山(inst, ids, 构.toks, BOND, 预算, null, null, 谷底);
    if (gh && gh.dmg > 终.dmg) 终 = { toks: gh.toks, dmg: gh.dmg };
  }
  return 终;
}
let 全过 = true;
for (const [名, 队ids] of 队) {
  ids = 队ids;
  const cA = 排.节拍对齐构造(inst, ids, BOND, { TopK: 3 });
  const cB = 排.节拍对齐构造(inst, ids, BOND, { TopK: 3, 去重: false });
  let t = process.hrtime.bigint();
  const A = 节拍段(cA);
  const Ams = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint();
  const B = 节拍段(cB);
  const Bms = Number(process.hrtime.bigint() - t) / 1e6;
  const ok = A.dmg >= B.dmg - 1e-6;
  if (!ok) 全过 = false;
  console.log(`${ok ? '✓' : '✗掉分!'} ${名}: 候选A=${cA.length} B=${cB.length} | 终A=${(A.dmg / 1e9).toFixed(3)}G 终B=${(B.dmg / 1e9).toFixed(3)}G Δ=${((A.dmg - B.dmg) / 1e9).toFixed(4)}G | A=${(Ams / 1000).toFixed(1)}s B=${(Bms / 1000).toFixed(1)}s 提速=${Bms > 0 ? (Bms / Ams).toFixed(2) : '-'}x`);
}
console.log(全过 ? '\n[结论] 节拍去重全部 A≥B ✓' : '\n[结论] 存在掉分 ✗ 回滚');
