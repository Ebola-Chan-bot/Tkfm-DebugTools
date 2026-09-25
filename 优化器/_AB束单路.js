'use strict';
/*
 * _AB束单路.js —— 束搜索"无伤害궁队单路评分"A/B 验证
 * A（默认）= 单路等价:true → 无伤害궁队跳过 sync rollout；B = 单路等价:false → 旧双路 max(d即,d同)。
 * 断言：{toks 全文, dmg, 扩展数, 深度} 逐位一致（等价性数学论证见 排程器.js 无伤害궁 注释）。
 * 无时限跑（时限秒=Infinity）保证两侧走完全相同的确定性扩展序列；生产 600s 限下只会探得更多、dmg 单调不降。
 * 附带一支有伤害궁队（승나미）做阴性对照：两路都不触发单路优化，逐位一致是平凡真，确认开关不误伤。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(__dirname, '..', '..', 'tenkaassist_data', 'data', 'data.json');

function 载入(keys) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 出 = [];
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5) continue;
    const 键 = ids.join(',');
    if (!keys.includes(键)) continue;
    if (出.some(o => o.键 === 键)) continue;
    出.push({ 队: d.name, ids, 键, description: d.description, recommend: d.recommend });
  }
  return 出;
}

const 目标 = 载入([
  '10069,10152,10063,10126,10155',   // 스즈란덱（无伤害궁）
  '10077,10155,10044,10151,10072',   // 베리스덱（无伤害궁）
  '10122,10152,10063,10126,10155',   // 천사기덱（无伤害궁）
  '10177,10060,10211,10208,10197',   // 승나미（有伤害궁，阴性对照）
]);

const WIDTH = 6;   // 无时限全跑完，控规模；等价性证明与 width 无关（逐候选评分相同 ⇒ 逐层排序相同）
const inst = 适配.createEngine();
let 全一致 = true, 总A = 0, 总B = 0;
for (const d of 目标) {
  const 无伤 = !d.ids.some(id => { const f = 排程器.特征.get(id); return f && (f.ultMag > 0 || f.atkMag > 0); });
  let t = process.hrtime.bigint();
  const A = 排程器.束搜索(inst, d.ids, BOND, { width: WIDTH, 时限秒: Infinity, 单路等价: true });
  const Ams = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint();
  const B = 排程器.束搜索(inst, d.ids, BOND, { width: WIDTH, 时限秒: Infinity, 单路等价: false });
  const Bms = Number(process.hrtime.bigint() - t) / 1e6;
  if (!A || !B) { console.log(`[跳过] ${d.队} 束搜索返回 null`); continue; }
  const 同toks = JSON.stringify(A.toks) === JSON.stringify(B.toks);
  const 同 = 同toks && A.dmg === B.dmg && A.扩展数 === B.扩展数 && A.深度 === B.深度;
  if (!同) 全一致 = false;
  总A += Ams; 总B += Bms;
  console.log(`${同 ? '✓' : '✗'} ${无伤 ? '[无伤]' : '[对照]'} ${d.队} dmg=${A.dmg.toLocaleString()} 扩展=${A.扩展数} 深=${A.深度} | 单路=${(Ams / 1000).toFixed(1)}s 双路=${(Bms / 1000).toFixed(1)}s 提速=${(Bms / Ams).toFixed(2)}x${同toks ? '' : ' TOKS不一致!'}`);
}
console.log(`总计 单路=${(总A / 1000).toFixed(1)}s 双路=${(总B / 1000).toFixed(1)}s | ${全一致 ? '全部✓ 零行为变化' : '存在✗ 不一致！'}`);
