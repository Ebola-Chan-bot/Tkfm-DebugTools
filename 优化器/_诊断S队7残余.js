'use strict';
/*
 * 诊断S：队[7]（10197,10096,10134,10193,10147）相位邻域改造后剩余 −2.71pp 缺口的精细归因。
 * 当前最优解 = 相位对齐构造(最大憋5) + 爬山(预算10000, 谷底试探8)（与生产兜底路同口径，实测 97.29%）。
 * 归因三维度：
 *   ① 逐回合累计伤害曲线：缺口集中在哪个/哪些回合（诊断G 曾定位 t9；现应已修复，看残余在哪）；
 *   ② 궁相位表对照：每位角色的 궁 落在哪些回合，最优解 vs DB 差几发、差哪发；
 *   ③ 逐 token 差异清单：列出所有 (最优, DB) 动作不同的步，标注 位idx/回合/最优动作/DB动作，
 *      并区分"궁相位差"（同角色궁数不同）与"평/방次序差"（궁数相同但평방排列不同）。
 * 结论导向：残余缺口是"还有一发궁没对齐"（继续加相位邻域维度）还是"回合内 평/방 次序差"（另一类邻域）。
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
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = { ids, description: d.description, recommend: d.recommend };
  }
  return best;
}

const IDS = '10197,10096,10134,10193,10147';
const inst = 适配.createEngine();
const d0 = DB队(IDS);
const 真값 = d0.recommend;
const DBtoks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);

// 当前最优解（生产兜底路同口径）
const c5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
const 爬 = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 10000, null, null, 8);
const 最优toks = 爬.dmg > c5.dmg ? 爬.toks : c5.toks;
const 最优dmg = Math.max(爬.dmg, c5.dmg);

const pct = x => (x / 真값 * 100).toFixed(2) + '%';
console.log(`########## 队[7] ${IDS}  DB=${(真값 / 1e9).toFixed(3)}G ##########`);
console.log(`当前最优解 = ${pct(最优dmg)}  缺口 = ${((真값 - 最优dmg) / 1e9).toFixed(3)}G (${((真값 - 最优dmg) / 真값 * 100).toFixed(2)}pp)`);
console.log(`谷底试探=${爬.谷底试探数} 采纳=${爬.谷底采纳数} 评估=${爬.评估} 提升=${爬.提升}\n`);

// ① 逐回合累计伤害曲线
function 曲线(toks) {
  const inc = inst.increment;
  if (!inc.initBattle(d0.ids, BOND, -1, null)) return null;
  const out = [];
  for (let k = 0; k < 65; k++) {
    if (!inc.step(toks[k].idx, toks[k].act)) { out.push(null); break; }
    if (k % 5 === 4) out.push(inc.dmgSoFar());
  }
  return out;
}
const db曲 = 曲线(DBtoks), 优曲 = 曲线(最优toks);
console.log('① 逐回合伤害（当回合新增，单位 G）：');
console.log('  t\tDB当回合\t最优当回合\t差(DB-最优)');
for (let t = 0; t < 13; t++) {
  const db增 = t === 0 ? db曲[t] : db曲[t] - db曲[t - 1];
  const 优增 = t === 0 ? 优曲[t] : 优曲[t] - 优曲[t - 1];
  const 差 = db增 - 优增;
  const 标 = Math.abs(差) > 0.02e9 ? '  ◀' : '';
  console.log(`  t${t + 1}\t${(db增 / 1e9).toFixed(3)}\t\t${(优增 / 1e9).toFixed(3)}\t\t${差 >= 0 ? '+' : ''}${(差 / 1e9).toFixed(3)}${标}`);
}
console.log(`  累计\t${(db曲[12] / 1e9).toFixed(3)}\t\t${(优曲[12] / 1e9).toFixed(3)}\t\t${((db曲[12] - 优曲[12]) / 1e9).toFixed(3)}`);

// ② 궁相位表
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
const db궁 = 궁相位(DBtoks), 优궁 = 궁相位(最优toks);
console.log('\n② 궁相位对照（每位角色的 궁 落点）：');
for (let i = 0; i < 5; i++) {
  const dbV = (db궁.get(i) || []).join(' '), 优V = (优궁.get(i) || []).join(' ');
  const 同 = dbV === 优V;
  console.log(`  位${i + 1}(id${d0.ids[i]}): DB[${dbV}]  最优[${优V}]  ${同 ? '✓同' : '✗差  Δ궁数=' + ((db궁.get(i) || []).length - (优궁.get(i) || []).length)}`);
}

// ③ 逐 token 差异
console.log('\n③ 逐 token 差异清单（最优 ≠ DB 的步）：');
let 궁差步 = 0, 평방差步 = 0;
for (let t = 0; t < 13; t++) {
  const rows = [];
  for (let j = 0; j < 5; j++) {
    const k = t * 5 + j;
    const a = 最优toks[k], b = DBtoks[k];
    if (a.idx === b.idx && a.act === b.act) continue;
    rows.push(`  步${k}(t${t + 1}.${j + 1}): 最优[位${a.idx + 1}${a.act}] vs DB[位${b.idx + 1}${b.act}]`);
  }
  if (rows.length) { console.log(` t${t + 1}:`); rows.forEach(r => console.log(r)); }
}
// 归类：每位角色的궁数是否一致 → 一致则属평/방次序差，否则궁相位差
for (let i = 0; i < 5; i++) {
  const dn = (db궁.get(i) || []).length, un = (优궁.get(i) || []).length;
  if (dn !== un) 궁差步 += Math.abs(dn - un);
}
console.log(`\n  归类：궁数不一致的位（=相位差，缺/多发궁）总 궁数差 = ${궁差步} 发`);
console.log(`  若 =0，则全部为"回合内 평/방 次序差"（궁已全对齐，差在行动顺序）`);
console.log('\n完成');
