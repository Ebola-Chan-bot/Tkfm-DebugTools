// 实验Q: 逐槽位子窗构造（第二代构造器原型）——후지카队(98.02%天花板)攻关
//   诊断实证: DB解 = 槽2/3 T4t0=1 ∪ 槽4/5 T3t0=4 ∪ 槽1 两族并集(注入压cd高频跟随),
//   全局单窗构造窗内全员齊放→궁差18,爬山修不动(98.02封顶,序重排/束路径全无效)。
//   Stage1: 用DB导出正确逐槽窗验证构造骨架能力(可行域证明)
//   Stage2: 无DB信息,槽位级坐标上升搜窗(每槽节拍族~150窗+全放+他槽并集),构造dmg贪心,再爬山
// 用法: node _实验Q槽位窗.js [ids]
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(path.resolve(__dirname, '..'), '../tenkaassist_data/data/data.json'))).toString('utf8'));
const idsArg = process.argv.slice(2).find(a => /^\d/.test(a));   // 只认数字开头的参数为 ids（--跳Stage1 是开关）
const ids = (idsArg || '10213,10190,10167,10164,10155').split(',').map(Number);
const BOND = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
const inc = inst.increment;
const want = [...ids].sort((a, b) => a - b).join(' ');
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === want);
const DB = Number(rec.recommend);
const dbToks = 排程.解析指令集(inst, ids, rec.description, BOND);
const pct = x => (x / DB * 100).toFixed(2) + '%';
console.log(`队 ${rec.name} [${ids}] DB=${DB.toLocaleString()}`);

// 特征缓存
const 特征 = new Map(); for (const id of ids) 特征.set(id, 排程.特征.get(id) || { role: 2, atkMag: 0, ultMag: 0, atk: 0, cd: 4 });

// ===== 逐槽位窗构造器（复制 构造一 骨架, S→S[i]逐槽, 全宮参与憋招规划(不依赖是伤害궁判定)）=====
function 构造槽窗(S按槽, 방우선) {
  if (!inc.initBattle(ids, BOND, -1, null)) return null;
  const comp = inst.internals.comp;
  const 原 = inc.原语();
  const S集 = S按槽.map(S => new Set(S));
  const S最大 = S按槽.map(S => S.length ? Math.max(...S) : 0);   // Set 无 .some，预算每槽最远窗回合
  const toks = [];
  function 选(禁궁) {
    let bI = -1, bA = null, bS = -Infinity;
    for (let i = 0; i < 5; i++) {
      const c = comp[i];
      if (!c || c.isActed) continue;
      const f = 特征.get(ids[i]);
      const 평점 = 방우선 ? (f.role === 0 ? 0.5 : 0.1) + (f.atkMag || 0) * f.atk / 1e7 : (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
      if (평점 > bS) { bS = 평점; bI = i; bA = '평'; }
      const 방점 = 방우선 ? (600 + (f.role === 2 ? 30 : 0)) : (f.role === 2 ? 30 : 1);
      if (방점 > bS) { bS = 방점; bI = i; bA = '방'; }
      if (c.curCd <= 0 && !禁궁) {
        const 궁점 = 2e6 - i;   // 全员궁按槽序放出（本队全궁皆规划对象）
        if (궁점 > bS) { bS = 궁점; bI = i; bA = '궁'; }
      }
    }
    return bI < 0 ? null : { i: bI, a: bA };
  }
  for (let k = 0; k < 65; k++) {
    const t = ((k / 5) | 0) + 1;
    let sel = 选(false);
    if (!sel) break;
    if (sel.a === '궁') {
      const Si = S集[sel.i];
      const 要憋 = !Si.has(t) && S最大[sel.i] > t;   // 本槽窗外且未来有窗 → 憋
      if (要憋) { const alt = 选(true); if (alt) sel = alt; }
    }
    const ok = sel.a === '평' ? 原.do_atk(sel.i) : (sel.a === '궁' ? 原.do_ult(sel.i) : 原.do_def(sel.i));
    if (!ok) break;
    toks.push({ idx: sel.i, act: sel.a });
  }
  if (toks.length < 65) { const 修 = 排程.修复解码(inst, ids, toks, BOND); return 修 ? { toks: 修.toks, dmg: 修.dmg } : null; }
  return { toks, dmg: 排程.重放(inst, ids, toks, BOND) };
}

// DB 导出的正确逐槽窗（Stage1 可行域证明用）
const Sdb槽 = [[], [], [], [], []];
for (let i = 0; i < 65; i++) if (dbToks[i].act === '궁') { const t = (i / 5 | 0) + 1; if (!Sdb槽[dbToks[i].idx].includes(t)) Sdb槽[dbToks[i].idx].push(t); }
console.log('\nDB逐槽궁窗:', Sdb槽.map((S, i) => `槽${i + 1}{${S.sort((a,b)=>a-b).join(',')}}`).join(' '));

if (!process.argv.includes('--跳Stage1')) {
  console.log('\n== Stage1: 正确逐槽窗构造(可行域证明) ==');
  for (const 방 of [false, true]) {
    const r = 构造槽窗(Sdb槽, 방);
    if (!r) { console.log('  构造失败'); continue; }
    let 궁차 = 0; for (let i = 0; i < 65; i++) if ((r.toks[i].act === '궁') !== (dbToks[i].act === '궁')) 궁차++;
    console.log(`  ${방 ? '방' : '평'}优先: ${pct(r.dmg)} 궁차${궁차}`);
    const t0 = Date.now();
    const h = 排程.爬山(inst, ids, r.toks, BOND, 60000, null, null, 8);
    const o = 排程.整回合序重排(inst, ids, h.toks, BOND);
    const 终 = Math.max(h.dmg, o.dmg);
    console.log(`    +爬山K8=${pct(h.dmg)} +序重排=${pct(o.dmg)} → ${pct(终)} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  }
}

console.log('\n== Stage2: 无DB信息, 槽位级坐标上升搜窗 ==');
// 窗候选族: 节拍 T2..13×t0 + 全放{1..13}
const 窗族 = []; for (let T = 2; T <= 13; T++) for (let t0 = 1; t0 <= 13; t0++) { const S = []; for (let t = t0; t <= 13; t += T) S.push(t); if (S.length >= 2) 窗族.push(S); }
窗族.push([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
// 起点: 全员同一节拍窗(방优先构造dmg最高者——Stage1证평优先天花板98.02,방优先信号更强)
const 방构 = W5 => { const r = 构造槽窗(W5, true); return r && r.dmg > 0 ? r.dmg : 0; };
let 最好窗 = null;
for (const W of 窗族) { const d = 방构([W, W, W, W, W]); if (d > 0 && (!最好窗 || d > 最好窗.dmg)) 最好窗 = { W, dmg: d }; }
console.log(`起点(全员同窗,방구动): {${最好窗.W.join(',')}} ${pct(最好窗.dmg)}`);
let cur = [最好窗.W, 最好窗.W, 最好窗.W, 最好窗.W, 最好窗.W];
let curDmg = 最好窗.dmg;
for (let 轮 = 1; 轮 <= 3; 轮++) {
  let 改进 = 0;
  for (let i = 0; i < 5; i++) {
    // 候选: 全窗族 + 他槽当前窗的两两并集(槽1类"并集跟随"形态)
    const 候 = 窗族.slice();
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) { if (a === i || b === i) continue; const u = [...new Set([...cur[a], ...cur[b]])].sort((x, y) => x - y); if (u.length <= 10) 候.push(u); }
    let 最佳W = cur[i], 最佳d = curDmg;
    for (const W of 候) {
      if (W.join(',') === cur[i].join(',')) continue;
      const 试 = cur.slice(); 试[i] = W;
      const d = 방构(试);
      if (d > 最佳d) { 最佳d = d; 最佳W = W; }
    }
    if (最佳d > curDmg) { cur[i] = 最佳W; curDmg = 最佳d; 改进++; }
  }
  console.log(`轮${轮}: 改进${改进}槽 → 搜窗信号${pct(curDmg)}`);
  console.log(`  当前窗: ${cur.map((S, i) => `槽${i + 1}{${S.join(',')}}`).join(' ')}`);
  if (!改进) break;
}
// 방变体重构 + 爬山 + 序重排
const 终评 = [];
for (const 방 of [false, true]) {
  const r = 构造槽窗(cur, 방);
  if (!r) continue;
  const t0 = Date.now();
  const h = 排程.爬山(inst, ids, r.toks, BOND, 60000, null, null, 8);
  const o = 排程.整回合序重排(inst, ids, h.toks, BOND);
  const 终 = Math.max(h.dmg, o.dmg, r.dmg);
  终评.push(终);
  console.log(`坐标上升终点 ${방 ? '방' : '평'}优先: 构造${pct(r.dmg)} 爬山${pct(h.dmg)} 序重排${pct(o.dmg)} → ${pct(终)} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
console.log(`\n对照: 生产窗对齐天花板98.02% | DB参照100.00% | 本实验最优=${pct(Math.max(...终评))}`);
console.log('完成');
