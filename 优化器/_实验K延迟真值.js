'use strict';
/*
 * 临时实验K：保守方案可行性验证——"伤害궁相位延迟 × 真值重放"穷举。
 *
 * 用户定的保守原则：简单规则优化不了的情况，检测到该机制特征就**完全不做会剪掉正确路径的那种剪枝**，
 *   改用真值评估的小规模穷举（成本极低、过度触发无害）。
 *
 * 本实验回答：把束搜索结果里每个伤害궁角色的 궁 整体延迟 d 回合（只改各角色各回合动作、回合内出手顺序不变），
 *   用 修复解码 落合法 + 重放（真值 fastReplay）打分，能否收回 88% 缺口？再爬山能否收满？
 *
 * 为什么这个变换对得上 DB（实验G 实锤的结构）：
 *   束 t5 = 位2궁 位3궁 位4평 位5궁 位1궁，DB t5 = 位2궁 位3궁 位4궁 位5궁 位1궁 —— **出手顺序完全相同，
 *   只差 位4평→位4궁**；t9 同样只差这一处。但单独改会因 CD 未就绪而非法（实验H：dmg=0），
 *   必须整条相位线一起后移，所以按"延迟 d 回合"整体平移。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);
const getCharacter = 适配.角色数据().getCharacter;

function 取DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = { 队: d.name || idsStr, ids, description: d.description, recommend: d.recommend };
  }
  return best;
}

/*
 * 相位延迟变体：把 目标们 里每个角色的 궁 从回合 t 平移到 t+d（原回合改 평），回合内出手顺序不变。
 * 用原始 궁 回合快照避免级联平移；越界(t+d>12)的直接丢弃（保守，不折叠）。
 */
function 延迟变体(toks, 目标们, d) {
  const 动作 = [];
  for (let t = 0; t < 13; t++) {
    const m = [null, null, null, null, null];
    for (let k = t * 5; k < t * 5 + 5; k++) m[toks[k].idx] = toks[k].act;
    动作.push(m);
  }
  for (const i of 目标们) {
    const 原궁 = [];
    for (let t = 0; t < 13; t++) if (动作[t][i] === '궁') 原궁.push(t);
    for (const t of 原궁) 动作[t][i] = '평';
    for (const t of 原궁) { const nt = t + d; if (nt < 13) 动作[nt][i] = '궁'; }
  }
  // 重建 toks：位置(idx 序列)不变，只换动作
  return toks.map((tk, k) => ({ idx: tk.idx, act: 动作[(k / 5) | 0][tk.idx] }));
}

const 目标队 = [
  '10197,10152,10096,10193,10147',   // 88%队[4]
  '10197,10096,10134,10193,10147',   // 88%队[7]
  '10177,10060,10211,10208,10197',   // 승나미（已达 97.96%，验证不变差）
  '10211,10167,10128,10168,10197',   // 칼리버（100%，验证不回退）
];
const inst = 适配.createEngine();
const Dmax = Number(process.argv[2] || 4);

for (const idsStr of 目标队) {
  const d0 = 取DB队(idsStr);
  const 목표toks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);
  const 真값 = 排程器.重放(inst, d0.ids, 목표toks, BOND);
  const 需 = 机制特征.需相位规划(d0.ids);
  console.log(`\n########## ${d0.ids.join(',')}  DB=${(真값 / 1e9).toFixed(2)}G  需相位规划=${需} ##########`);
  const base = 排程器.束搜索(inst, d0.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  console.log(`束基线 = ${(base.dmg / 真값 * 100).toFixed(2)}%`);

  // 伤害궁 角色（role 无关，与排程器新口径一致）
  const 궁캐 = d0.ids.map((id, i) => { const c = getCharacter(id); return (c && (c.ultMag > 0 || c.atkMag > 0)) ? i : -1; }).filter(i => i >= 0);
  console.log(`伤害궁槽位: ${궁캐.map(i => `位${i + 1}=${d0.ids[i]}`).join(' ')}`);

  let 最优 = { dmg: base.dmg, 描述: '束基线', toks: base.toks };
  const t0 = Date.now();
  let 变体数 = 0;
  // 单角色延迟 + 全伤害궁延迟（两套小家族，够覆盖"整条相位平移"）
  const 家族 = 궁캐.map(i => [i]).concat([[...궁캐]]);
  for (const 组 of 家族) {
    for (let dd = 1; dd <= Dmax; dd++) {
      const 变 = 延迟变体(base.toks, 组, dd);
      const 修 = 排程器.修复解码(inst, d0.ids, 变, BOND);
      变体数++;
      if (!修 || !(修.dmg > 0)) continue;
      if (修.dmg > 最优.dmg) 最优 = { dmg: 修.dmg, 描述: `延迟d=${dd} 槽位[${组.map(i => i + 1).join(',')}] 修复${修.修复次数}`, toks: 修.toks };
    }
  }
  console.log(`相位穷举: ${变体数} 变体 / ${(Date.now() - t0) / 1000}s → 最优 = ${(最优.dmg / 真값 * 100).toFixed(2)}%  [${最优.描述}]`);

  // 从最优变体爬山（真值），看能否收满
  if (最优.toks !== base.toks) {
    const h = 排程器.爬山(inst, d0.ids, 最优.toks, BOND, 10000);
    if (h.dmg > 最优.dmg) 最优 = { dmg: h.dmg, 描述: 最优.描述 + ' + 爬山', toks: h.toks };
    console.log(`  + 爬山(10000) → ${(h.dmg / 真값 * 100).toFixed(2)}%`);
  }
  const h0 = 排程器.爬山(inst, d0.ids, base.toks, BOND, 3000);
  console.log(`对照：束+爬山(3000, benchmark旧口径) = ${(h0.dmg / 真값 * 100).toFixed(2)}%`);
  console.log(`★ 最终 = ${(最优.dmg / 真값 * 100).toFixed(2)}%  (缺口从 ${((真값 - h0.dmg) / 1e9).toFixed(2)}G → ${((真값 - 最优.dmg) / 1e9).toFixed(2)}G)`);

  // 打印 궁 相位对照（验证是否逼近 DB）
  const 포 = t => t.map((tk, k) => (tk.act === '궁' && 궁캐.includes(tk.idx)) ? `位${tk.idx + 1}t${((k / 5) | 0) + 1}` : null).filter(Boolean).join(' ');
  console.log(`  DB 궁相位: ${포(목표toks)}`);
  console.log(`  束 궁相位: ${포(base.toks)}`);
  console.log(`  优 궁相位: ${포(最优.toks)}`);
}
