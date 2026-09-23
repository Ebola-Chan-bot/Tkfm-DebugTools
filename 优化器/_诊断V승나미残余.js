'use strict';
/*
 * 诊断V：승나미队（10177,10060,10211,10208,10197）残余 −1.84pp 缺口的三维归因。
 * 与队[7]/[4]（相位规划队、走构造+谷底试探路径）不同：승나미 前瞻仅 66%、束路径收敛到 98.16%，
 *   benchmark 终值来自"束+爬山"，兜底(构造+谷底)取优未超过（验证P5：승나미 K=0/K=8 均 98.16%）。
 * 本诊断复现两条路径各取最优，再对照 DB 做三维分析：
 *   ① 逐回合伤害曲线：缺口集中在哪个回合；
 *   ② 궁相位表：每位角色 궁 落点 + 每位 궁 数是否一致（相位差 vs 次序差）；
 *   ③ 逐 token 差异清单 + 归类。
 * 目的：判断 −1.84pp 是"还有一发궁没对齐"（相位谷残留）、"回合内출手次序"（次序谷残留），
 *   还是全新形态（如 평/방 分布、站位、或束路径本身的次优）。
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

const IDS = '10177,10060,10211,10208,10197';
const inst = 适配.createEngine();
const d0 = DB队(IDS);
const 真값 = d0.recommend;
const DBtoks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);
const pct = x => (x / 真값 * 100).toFixed(2) + '%';

// 路径1：束+爬山（benchmark 口径，束评分sync + CLIMB10000）
// 注：时限초 是 排程器.束搜索 的 API 字段名（韩文同形字，与 benchmark 传参一致），勿改成中文否则时限失效
const b = 排程器.束搜索(inst, d0.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限초: 600 });
const bc = 排程器.爬山(inst, d0.ids, b.toks, BOND, 10000);
const 束爬 = bc.dmg > b.dmg ? bc : b;
// 路径2：相位对齐构造(憋5)+爬山(谷底试探8) —— 与生产兜底同口径
const c5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
const cv = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 30000, null, null, 8);
const 构造爬 = cv.dmg > c5.dmg ? cv : c5;

console.log(`########## 승나미 ${IDS}  DB=${(真값 / 1e9).toFixed(3)}G ##########`);
console.log(`路径1 束+爬 = ${pct(束爬.dmg)}   路径2 构造+谷底爬 = ${pct(构造爬.dmg)} (试探${cv.谷底试探数}/采纳${cv.谷底采纳数})`);
const 最优 = 束爬.dmg >= 构造爬.dmg ? { 名: '束+爬', toks: 束爬.toks, dmg: 束爬.dmg } : { 名: '构造+谷底爬', toks: 构造爬.toks, dmg: 构造爬.dmg };
console.log(`当前最优 = ${pct(最优.dmg)} [${最优.名}]  缺口 = ${((真값 - 最优.dmg) / 1e9).toFixed(3)}G (${((真값 - 最优.dmg) / 真값 * 100).toFixed(2)}pp)\n`);

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
const db曲 = 曲线(DBtoks), 优曲 = 曲线(最优.toks);
console.log('① 逐回合伤害（当回合新增 G）：');
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
const db궁 = 궁相位(DBtoks), 优궁 = 궁相位(最优.toks);
console.log('\n② 궁相位对照：');
let 궁数差 = 0;
for (let i = 0; i < 5; i++) {
  const dbV = db궁.get(i) || [], 优V = 优궁.get(i) || [];
  const 同 = dbV.join(' ') === 优V.join(' ');
  if (dbV.length !== 优V.length) 궁数差 += Math.abs(dbV.length - 优V.length);
  console.log(`  位${i + 1}(id${d0.ids[i]}): DB[${dbV.join(' ')}]  最优[${优V.join(' ')}]  ${同 ? '✓同' : '✗差 Δ궁数=' + (dbV.length - 优V.length)}`);
}
console.log(`  궁数不一致总数（相位差）= ${궁数差} 发`);

// ③ 逐 token 差异
console.log('\n③ 逐 token 差异清单：');
let 差异步 = 0;
for (let t = 0; t < 13; t++) {
  const rows = [];
  for (let j = 0; j < 5; j++) {
    const k = t * 5 + j;
    const a = 最优.toks[k], bb = DBtoks[k];
    if (a.idx === bb.idx && a.act === bb.act) continue;
    差异步++;
    const 궁变 = (a.act === '궁') !== (bb.act === '궁');
    rows.push(`  步${k}(t${t + 1}.${j + 1}): 最优[位${a.idx + 1}${a.act}] vs DB[位${bb.idx + 1}${bb.act}]${궁变 ? '  ◀궁相关' : ''}`);
  }
  if (rows.length) { console.log(` t${t + 1}:`); rows.forEach(r => console.log(r)); }
}
console.log(`\n  差异步总数 = ${差异步}/65`);
console.log('\n完成');
