'use strict';
/*
 * _AB爬山检查点.js —— 爬山（含谷底试探全链路）检查点路径 vs 纯fastReplay路径 A/B
 * 断言：同队同起点，两路径 {toks全文、dmg、提升、试探数、采纳数} 完全一致；计时给提速比。
 * 关闭方式：B路径 monkey-patch inst.increment.captureState = undefined → 回落原 重放() 全路径。
 * 起点：贪心基线 toks（非局部最优，有爬坡空间）；K=2 走完整谷底试探（相位候选/池收集/禁忌重爬）。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 预算 = Number((process.argv.find(a => a.startsWith('--预算=')) || '--预算=20000').split('=')[1]);

function 载入(ids列表) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 出 = [];
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (!ids列表.some(x => x.join(',') === ids.join(','))) continue;
    if (出.some(o => o.ids.join(',') === ids.join(','))) continue;
    出.push({ 队: d.name, ids, description: d.description, recommend: d.recommend });
  }
  return 出;
}

const 目标 = 载入([
  [10197, 10152, 10096, 10177, 10163],   // 94队
  [10213, 10190, 10167, 10164, 10155],   // 후지카
  [10197, 10096, 10134, 10193, 10147],   // 含10134
]);

const inst = 适配.createEngine();
const 保存cap = inst.increment.captureState, 保存res = inst.increment.restoreState;
let 全一致 = true;
for (const d of 目标) {
  const 贪 = 排程器.贪心基线(inst, d.ids, BOND, null);
  if (!贪) { console.log(`[跳过] ${d.队}`); continue; }
  for (const K of [0, 2]) {
    // A：检查点路径
    let t = process.hrtime.bigint();
    const A = 排程器.爬山(inst, d.ids, 贪.toks, BOND, 预算, null, null, K);
    const Ams = Number(process.hrtime.bigint() - t) / 1e6;
    // B：禁用检查点（回落 fastReplay），同起点重跑
    inst.increment.captureState = inst.increment.restoreState = undefined;
    t = process.hrtime.bigint();
    const B = 排程器.爬山(inst, d.ids, 贪.toks, BOND, 预算, null, null, K);
    const Bms = Number(process.hrtime.bigint() - t) / 1e6;
    inst.increment.captureState = 保存cap; inst.increment.restoreState = 保存res;
    const 同 = JSON.stringify(A.toks) === JSON.stringify(B.toks) && A.dmg === B.dmg && A.提升 === B.提升 && A.谷底试探数 === B.谷底试探数 && A.谷底采纳数 === B.谷底采纳数;
    if (!同) 全一致 = false;
    console.log(`${同 ? '✓' : '✗'} ${d.队}[${d.ids}] K=${K} dmg=${A.dmg.toLocaleString()}(B=${B.dmg.toLocaleString()}) 评估=${A.评估} 提升=${A.提升} 试探=${A.谷底试探数} 采纳=${A.谷底采纳数} | 检查点=${Ams.toFixed(0)}ms fastReplay=${Bms.toFixed(0)}ms 提速=${(Bms / Ams).toFixed(2)}x`);
  }
}
console.log(`\n[结论] ${全一致 ? '爬山全链路终值一致，A/B 通过' : '✗ 不一致，禁止接入'}`);
