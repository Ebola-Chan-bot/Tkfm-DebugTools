'use strict';
/*
 * 诊断85队：Top200 benchmark 最差队 얀코덱[10197,10060,10177,10193,10208] DB=27.60G 终85.16% 的根因定位。
 * 队构成：位1=10197 얀코(队长,每行动降队友CD) 位2=10060 풍오라 位3=10177 승나미(周期窗(t-1)%3=0 buff+nest点灯)
 *         位4=10193(탱커伤害궁,防守名单캐) 位5=10208
 * DB 解结构（人工判读）：t4/t7/t10/t13 位3/4/5 齐射（周期3 = 승나미机制窗）；t1 位4궁单放；t3 位4방；
 *   位1궁 t7/t10/t13（CD被自身机制改写）；位2궁 t8/t13。
 * 本诊断回答四个问题：
 *   ① 各构造器对该队的 T/S/序策 与构造 dmg —— 节拍对齐构造 能否自然生成 {4,7,10,13} 齐射集？
 *   ② 全流水线各路径（前瞻/束+爬/相位兜底/节拍兜底）分别停在哪；
 *   ③ DB vs 当前最优 三维归因（回合曲线/궁相位/逐token差异）；
 *   ④ DB 解在爬山景观下的性质：从 DB 出发爬山是否保持（景观局部极大验证）。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const IDS = '10197,10060,10177,10193,10208';

const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
let best = null;
for (const d of arr) {
  if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
  const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number).join(',');
  if (ids !== IDS) continue;
  if (!best || d.recommend > best.recommend) best = d;
}
const inst = 适配.createEngine();
const ids0 = IDS.split(',').map(Number);
const DBtoks = 排程器.解析指令集(inst, ids0, best.description, BOND);
const 真값 = 排程器.重放(inst, ids0, DBtoks, BOND);
const pct = x => (x / 真값 * 100).toFixed(2) + '%';
console.log(`${best.name} ${IDS}  DB=${(真값 / 1e9).toFixed(3)}G  (bit复现: ${真값 === best.recommend})`);

// ---- 队画像 ----
console.log('\n===== 队画像 =====');
for (let i = 0; i < 5; i++) {
  const f = 特征查(ids0[i]);
  const m = 机制特征.画像(ids0[i]);
  console.log(`位${i + 1}=${ids0[i]} role${f.role} cd${f.cd} ${是伤害궁(f) ? '伤害궁' : 'buff궁'} atk${(f.atk / 1e6).toFixed(1)}M  注入${m ? m.注入数 : '?'} 门控${m ? m.门控数 : '?'} 周期${m ? m.周期数 : '?'} CD操${m ? m.CD操纵数 : '?'}`);
}
console.log(`需相位规划 = ${机制特征.需相位规划(ids0)}`);

function 特征查(id) { return 排程器.特征.get(id) || { role: 2, atkMag: 0, ultMag: 0, atk: 0, cd: 4 }; }
function 是伤害궁(f) { return (f.ultMag > 0 || f.atkMag > 0); }

// ---- ① 节拍对齐构造 ----
console.log('\n===== ① 节拍对齐构造（全部候选）=====');
const 节拍 = 排程器.节拍对齐构造(inst, ids0, BOND, { 全部: true, TopK: 99 });
for (const g of 节拍.slice(0, 12)) {
  console.log(`  T=${g.T} t0=${g.t0} S={${g.S.join(',')}} 序策=${g.序策} 构造dmg=${(g.dmg / 1e9).toFixed(3)}G (${pct(g.dmg)})`);
}
console.log(`  合法候选总数=${节拍.length}`);

// DB 的齐射集对照
console.log('  DB 궁落点: ', 궁相位表(DBtoks));

// ---- ② 相位对齐构造 ----
console.log('\n===== ② 相位对齐构造 =====');
for (const 憋 of [5, 99]) {
  const c = 排程器.相位对齐构造(inst, ids0, BOND, { 最大憋: 憋 });
  console.log(`  憋=${憋}: ${(c.dmg / 1e9).toFixed(3)}G (${pct(c.dmg)})  궁落点:`, 궁相位表(c.toks));
}

// ---- ③ 全流水线各路径 ----
console.log('\n===== ③ 各路径 =====');
const p = 排程器.先验前瞻贪心(inst, ids0, BOND);
console.log(`  前瞻: ${pct(p.dmg)}`);
const b = 排程器.束搜索(inst, ids0, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
console.log(`  束: ${pct(b.dmg)} (扩展${b.扩展数})`);
const bh = 排程器.爬山(inst, ids0, b.toks, BOND, 3000);
console.log(`  束+爬3000: ${pct(Math.max(b.dmg, bh.dmg))}`);
const 束爬 = bh.dmg > b.dmg ? bh : b;

// 相位兜底（benchmark 同口径：相位对齐{5,99} + 爬山30000 + 谷底8）
let 相位终 = { dmg: 0, toks: null, 名: '-' };
for (const 憋 of [5, 99]) {
  const c = 排程器.相位对齐构造(inst, ids0, BOND, { 最大憋: 憋 });
  if (!c || !(c.dmg > 0)) continue;
  const ch = 排程器.爬山(inst, ids0, c.toks, BOND, 30000, null, null, 8);
  const 终 = (ch && ch.dmg > c.dmg) ? { dmg: ch.dmg, toks: ch.toks, 名: `对齐憋${憋}+爬` } : { dmg: c.dmg, toks: c.toks, 名: `对齐憋${憋}` };
  if (终.dmg > 相位终.dmg) 相位终 = 终;
}
console.log(`  相位兜底最优: ${pct(相位终.dmg)} [${相位终.名}]`);

// 节拍兜底（TopK=3 各爬山30000+谷底8）
let 节拍终 = { dmg: 0, toks: null, 名: '-' };
const 节拍Top = 排程器.节拍对齐构造(inst, ids0, BOND, { TopK: 3 });
节拍Top.forEach((g, k) => {
  const gh = 排程器.爬山(inst, ids0, g.toks, BOND, 30000, null, null, 8);
  const 终 = (gh && gh.dmg > g.dmg) ? gh : g;
  console.log(`  节拍候选#${k + 1}(T=${g.T} t0=${g.t0} 序策=${g.序策}) 构造${pct(g.dmg)} → 爬+谷底 ${pct(终.dmg)} (试探${gh ? gh.谷底试探数 : 0}/采纳${gh ? gh.谷底采纳数 : 0})`);
  if (终.dmg > 节拍终.dmg) 节拍终 = { dmg: 终.dmg, toks: 终.toks, 名: `节拍#${k + 1}` };
});

const 全终 = [束爬, 相位终, 节拍终].reduce((a, b) => b.dmg > a.dmg ? b : a, { dmg: 0, toks: null, 名: '-' });
console.log(`  ===== 终(取优): ${pct(全终.dmg)} [${全终.名}]  缺口=${((真값 - 全终.dmg) / 真값 * 100).toFixed(2)}pp =====`);

// ---- ④ DB 景观性质：从 DB toks 出发爬山（应不动 → r=1 局部极大） ----
console.log('\n===== ④ DB 解景观 =====');
const dbh = 排程器.爬山(inst, ids0, DBtoks, BOND, 3000);
console.log(`  DB+爬3000: ${pct(dbh.dmg)} (提升${dbh.提升}次 → 0=DB为局部极大)`);

// ---- 三维归因：回合曲线 / 궁相位 / 逐token差异 ----
console.log('\n===== 三维归因（DB vs 当前最优）=====');
function 曲线(toks) {
  const inc = inst.increment;
  if (!inc.initBattle(ids0, BOND, -1, null)) return null;
  const out = [];
  for (let k = 0; k < 65; k++) {
    if (!inc.step(toks[k].idx, toks[k].act)) { out.push(null); break; }
    if (k % 5 === 4) out.push(inc.dmgSoFar());
  }
  return out;
}
const db曲 = 曲线(DBtoks), 优曲 = 曲线(全终.toks || DBtoks);
console.log('  t\tDB当回合G\t最优当回合G\t差(DB-最优)G');
for (let t = 0; t < 13; t++) {
  const db增 = t === 0 ? db曲[t] : db曲[t] - db曲[t - 1];
  const 优增 = t === 0 ? 优曲[t] : 优曲[t] - 优曲[t - 1];
  const 差 = db增 - 优增;
  console.log(`  t${t + 1}\t${(db增 / 1e9).toFixed(3)}\t\t${(优增 / 1e9).toFixed(3)}\t\t${差 >= 0 ? '+' : ''}${(差 / 1e9).toFixed(3)}${Math.abs(差) > 0.15e9 ? '  ◀◀' : ''}`);
}

console.log('\n  궁相位对照:');
const db궁 = 궁相位(DBtoks), 优궁 = 궁相位(全终.toks || DBtoks);
for (let i = 0; i < 5; i++) {
  const dbV = db궁.get(i) || [], 优V = 优궁.get(i) || [];
  console.log(`  位${i + 1}: DB[${dbV.join(' ')}]  最优[${优V.join(' ')}]  ${dbV.join(' ') === 优V.join(' ') ? '✓' : '✗'}`);
}

console.log('\n  逐token差异:');
let 差异 = 0;
const 最toks = 全终.toks || DBtoks;
for (let t = 0; t < 13; t++) {
  const rows = [];
  for (let j = 0; j < 5; j++) {
    const k = t * 5 + j;
    const a = 最toks[k], bb = DBtoks[k];
    if (a && bb && a.idx === bb.idx && a.act === bb.act) continue;
    差异++;
    rows.push(`    步${k}: 最优[位${a ? a.idx + 1 : '?'}${a ? a.act : '?'}] vs DB[位${bb.idx + 1}${bb.act}]`);
  }
  if (rows.length) { console.log(`  t${t + 1}:`); rows.forEach(r => console.log(r)); }
}
console.log(`  差异步总数 = ${差异}/65`);
console.log('\n完成');

function 궁相位(toks) {
  const m = new Map();
  toks.forEach((x, k) => {
    if (x.act !== '궁') return;
    const T = ((k / 5) | 0) + 1;
    if (!m.has(x.idx)) m.set(x.idx, []);
    m.get(x.idx).push('t' + T);
  });
  return m;
}
function 궁相位表(toks) {
  const m = 궁相位(toks);
  return Array.from({ length: 5 }, (_, i) => `位${i + 1}[${(m.get(i) || []).join(' ')}]`).join(' ');
}
