'use strict';
/*
 * 验证W：승나미 −1.84pp = 位4궁早放谷（诊断V：位4相位 t3 vs DB t4，净 −0.538G 集中 t3+t4）。
 * 疑点：单步"궁@s13 ↔ 同角色평@s17"恰在 相位候选 生成范围内（d=1、同idx、非궁），
 *   应属爬坡③相位上升邻域（预期 +1.74pp），但束+爬与构造+谷底爬(K=8)都停 98.16%。
 * 本验证拆开每一步：
 *   ① 单步移动直接重放：升不升？合法吗？（dmg>0 且 >当前？）
 *   ② 该移动是否在 相位候选 生成集内（复现生成逻辑核对 s13/s17 条件）；
 *   ③ 若在且上升 → 爬山③没走到它 = 爬坡实现问题（继续拆：从最优解出发跑 用相位 爬坡看会不会接受）；
 *      若不在或变差 → 记录实际 dmg 与 DB t3/t4 分解，找真正原因（如 t4 대발 依赖 t3 的 buff궁 次序）。
 *   ④ 若单步不够：试"移动+短爬山"（谷底试探视角）。
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
const pct = x => (x / 真값 * 100).toFixed(2) + '%';

// 复现最优解（束+爬，benchmark 口径）
const b = 排程器.束搜索(inst, d0.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限초: 600 });
const bc = 排程器.爬山(inst, d0.ids, b.toks, BOND, 10000);
const 最优 = bc.dmg > b.dmg ? bc : b;
console.log(`승나미 最优(束+爬) = ${pct(最优.dmg)}`);

// ① 单步移动：궁@s1 ↔ 평@s2（s1 遍历位4 的 t3 궁，s2 = 其后 1~2 回合的同角色非궁）
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
      候.push({ s1, s2, toks: 移 });
    }
  }
  return 候;
}
const 候池 = 相位候选(最优.toks);
console.log(`\n① 相位候选池 = ${候池.length} 条；逐条重放：`);
let 上升数 = 0;
for (const c of 候池) {
  const d = 排程器.重放(inst, d0.ids, c.toks, BOND);
  const 上升 = d > 最优.dmg;
  if (上升) 上升数++;
  // 位4 = idx3；只详列涉及 位4 궁@t3(步10~14) 的与其他全部上升/高位移动
  const 涉位4t3 = (最优.toks[c.s1].idx === 3 && c.s1 >= 10 && c.s1 <= 14);
  if (上升 || 涉位4t3 || d === 0) {
    console.log(`  s${c.s1}(t${((c.s1 / 5) | 0) + 1},位${最优.toks[c.s1].idx + 1}궁)→s${c.s2}(t${((c.s2 / 5) | 0) + 1},位${最优.toks[c.s2].idx + 1}${最优.toks[c.s2].act}): ${pct(d)}  Δ${((d - 最优.dmg) / 真값 * 100).toFixed(2)}pp${上升 ? ' ★上升' : ''}${d === 0 ? ' (非法)' : ''}${涉位4t3 ? ' ◀位4t3相关' : ''}`);
  }
}
console.log(`  上升移动总数 = ${上升数}/${候池.length}`);

// ② 检查位4 궁具体位置与移动目标
const 位4궁步 = [];
最优.toks.forEach((x, k) => { if (x.idx === 3 && x.act === '궁') 位4궁步.push(k); });
console.log(`\n② 位4궁在步 [${位4궁步}]（t${位4궁步.map(k => ((k / 5) | 0) + 1).join('/t')}）`);
const 位4평步t4 = [];
for (let k = 15; k < 20; k++) if (最优.toks[k].idx === 3) 位4평步t4.push(k);
console.log(`  位4 在 t4(步15~19) 的行动步 = [${位4평步t4}] act=${位4평步t4.map(k => 最优.toks[k].act)}`);

// ③ 用 用相位 爬山从最优解出发（K=8），看能否走出 98.16%
const r3 = 排程器.爬山(inst, d0.ids, 最优.toks, BOND, 30000, null, null, 8);
console.log(`\n③ 从最优解出发 爬山(用相位,K=8) = ${pct(r3.dmg)}  试探${r3.谷底试探数}/采纳${r3.谷底采纳数} 提升${r3.提升}`);

// ④ 若①单步不够：构造"早放→晚放"完整变体（位4 t3궁 移到 t4 + t6 缺口顺带看）
//    先手工构造 DB t3/t4 结构：步13=位4평? 不——直接对比 DB toks 的 t3/t4 段与最优解段
console.log(`\n④ t3/t4 段对照（步10~19）：`);
const DBtoks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);
for (let k = 10; k < 20; k++) {
  const a = 最优.toks[k], bb = DBtoks[k];
  const 同 = a.idx === bb.idx && a.act === bb.act;
  console.log(`  步${k}(t${((k / 5) | 0) + 1}.${(k % 5) + 1}): 最优[位${a.idx + 1}${a.act}]  DB[位${bb.idx + 1}${bb.act}] ${同 ? '' : '✗'}`);
}
console.log('\n完成');
