'use strict';
/*
 * 诊断U：谷底试探的"变差池"构成与目标谷排名（队[7]，97.29% 局部最优点）。
 * 验证P3 现象：加类B（涉궁相邻次序交换）后 K=2 反而退回 91.48%（P2 时 K=2 已达 97.29%）、K=4/8 停在 97.29%
 *   未到 99.98%。假说 = 类B 引入了大量"近平变差谷"（−0.00x pp），在"最不差优先"排序下抢占了试探预算，
 *   使 t13 那个真正通往 99.98% 的 −0.54pp 谷（验证T 实锤）永远排不到前 K。
 * 本诊断测三件事：
 *   ① 池规模与构成：91.48% 点与 97.29% 点上，类A/类B 各多少条变差候选；
 *   ② 近平谷占比：|Δ| < 0.1pp 的候选条数（这些是"抢占预算但不通向新盆"的浪费源）；
 *   ③ 目标谷排名：97.29% 点上 t13 步61↔62 交换（=96.75%）在"最不差优先"里的名次 → 决定所需 K，
 *      以及"若跳过近平谷（Δ<阈值 直接不收）"后名次是多少 → 决定阈值策略可行性。
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
const pp = x => (x / 真값 * 100).toFixed(2) + '%';
const dpp = x => (x / 真값 * 100).toFixed(2) + 'pp';

// 与 排程器.爬山 内部一致的两类语义邻域（此处独立实现以便逐条统计）
function 相位候选(toks) {
  const 候 = [];
  for (let s1 = 0; s1 < 65; s1++) {
    if (toks[s1].act !== '궁') continue;
    const ii = toks[s1].idx, t1 = (s1 / 5) | 0;
    for (let s2 = s1 + 1; s2 < 65; s2++) {
      if (((s2 / 5) | 0) - t1 > 2) break;
      if (toks[s2].idx !== ii || toks[s2].act === '궁') continue;
      const 移 = toks.map(t => ({ idx: t.idx, act: t.act }));
      移[s1].act = toks[s2].act;
      移[s2].act = '궁';
      候.push({ 类: 'A', 描: `s${s1}(t${t1 + 1}궁位${ii + 1})→s${s2}`, toks: 移 });
    }
  }
  return 候;
}
function 次序候选(toks) {
  const 候 = [];
  for (let p = 0; p < 64; p++) {
    if (toks[p].idx === toks[p + 1].idx) continue;
    if (toks[p].act !== '궁' && toks[p + 1].act !== '궁') continue;
    const nb = toks.map(t => ({ idx: t.idx, act: t.act }));
    const tmp = nb[p]; nb[p] = nb[p + 1]; nb[p + 1] = tmp;
    候.push({ 类: 'B', 描: `交换s${p}↔s${p + 1}(t${((p / 5) | 0) + 1})`, toks: nb });
  }
  return 候;
}

function 分析池(点名, toks, baseDmg, 关注) {
  const 候 = 相位候选(toks).concat(次序候选(toks));
  const 评 = [];
  for (const c of 候) {
    const d = 排程器.重放(inst, d0.ids, c.toks, BOND);
    评.push({ ...c, dmg: d, Δ: d - baseDmg });
  }
  const 变差 = 评.filter(c => c.dmg <= baseDmg).sort((a, b) => b.dmg - a.dmg); // 最不差优先
  const 近平 = 变差.filter(c => c.dmg > baseDmg - 真값 * 0.001);              // |Δ|<0.1pp
  console.log(`\n[${点名}] 基准=${pp(baseDmg)}`);
  console.log(`  ① 池: 类A=${评.filter(c => c.类 === 'A').length} 类B=${评.filter(c => c.类 === 'B').length}  变差候选=${变差.length}（上升=${评.length - 变差.length}）`);
  console.log(`  ② 近平谷(|Δ|<0.1pp)=${近平.length}/${变差.length}  非近平(Δ≤-0.1pp)=${变差.length - 近平.length}`);
  console.log(`  变差前12名（最不差优先会按此序消耗试探预算）:`);
  变差.slice(0, 12).forEach((c, i) => console.log(`    #${i + 1} ${c.类} ${c.描} = ${pp(c.dmg)} (Δ${dpp(c.Δ)})`));
  if (关注) {
    const r = 变差.findIndex(c => c.描.includes(关注));
    if (r >= 0) {
      console.log(`  ③ 目标谷"${关注}"排名 = ${r + 1}/${变差.length}  → 需 K≥${r + 1}`);
      // 跳过近平谷后的名次
      const 严格 = 变差.filter(c => c.dmg <= baseDmg - 真값 * 0.001);
      const r2 = 严格.findIndex(c => c.描.includes(关注));
      console.log(`     若"近平谷不入池"（阈值0.1pp）：目标谷排名 = ${r2 + 1}/${严格.length} → 需 K≥${r2 + 1}`);
    } else {
      console.log(`  ③ ⚠️ 目标谷"${关注}"不在变差池内`);
    }
  }
  return 变差;
}

// 路径1：构造5 + K=0 爬山 → 91.48% 点
const c5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
const h0 = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 30000);
console.log(`构造5+K0爬山 = ${pp(h0.dmg)}`);
分析池('91.48%点', h0.toks, h0.dmg, null);

// 路径2：构造5 + K=8 爬山（现状生产口径）→ 97.29% 点
const h8 = 排程器.爬山(inst, d0.ids, c5.toks, BOND, 30000, null, null, 8);
console.log(`\n构造5+K8爬山 = ${pp(h8.dmg)}  试探${h8.谷底试探数}/采纳${h8.谷底采纳数}`);
分析池('97.29%点', h8.toks, h8.dmg, 's61↔62');

console.log('\n完成');
