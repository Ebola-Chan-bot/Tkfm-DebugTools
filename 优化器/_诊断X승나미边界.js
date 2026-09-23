'use strict';
/*
 * 诊断X：승나미 −1.84pp 是否为谷底试探的能力边界（复合谷）。
 * 验证W 已证：唯一合法相位移动 s13→s17(位4궁 t3→t4)=94.70%(−3.46pp 变差谷)，上升移动0；
 *   DB 与最优解差 5 处联动（位4궁相位移动 + t3 回合内位1/2/3/5 四人出手次序重排）。
 * 本诊断：
 *   ① 高 K 深探（8/16/32）：谷底试探从 −3.46pp 相位谷重爬，能否爬到 >98.16%？（K 越大越接近能力边界）
 *   ② 手工构造 DB 的 t3/t4 段（把最优解的 步10~17 替换成 DB 的），重放 → 确认"这 5 处联动就是全部缺口"
 *      （若 ≈100% 则缺口确系此复合谷；若仍 <100% 说明另有残差）。
 *   ③ 从谷底(94.70%解)出发跑大预算爬山，看 first-improving 能恢复到哪（谷底重爬的实际能力）。
 * 判据：若①高K仍≈98.16%、②≈100%、③谷底重爬爬不回 → 复合谷确认，属谷底试探能力边界，
 *   需更强手段（如束路径改进或直接接受 98.16% 为当前上界）。
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
const DBtoks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);

const b = 排程器.束搜索(inst, d0.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限초: 600 });
const bc = 排程器.爬山(inst, d0.ids, b.toks, BOND, 10000);
const 最优 = bc.dmg > b.dmg ? bc : b;
console.log(`승나미 DB=${pct(真값)}  最优(束+爬)=${pct(最优.dmg)}  缺口=${((真값 - 最优.dmg) / 真값 * 100).toFixed(2)}pp\n`);

// ① 高 K 深探
console.log('① 高K深探（谷底试探从最优解出发）：');
for (const K of [8, 16, 32]) {
  const t0 = Date.now();
  const r = 排程器.爬山(inst, d0.ids, 最优.toks, BOND, 60000, null, null, K);
  console.log(`  K=${K}: ${pct(r.dmg)}  Δ${((r.dmg - 最优.dmg) / 真값 * 100).toFixed(2)}pp  试探${r.谷底试探数}/采纳${r.谷底采纳数}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}

// ② 手工构造：最优解 t3/t4 段(步10~19)替换为 DB 的
console.log('\n② 手工构造（最优解 步10~19 全换成 DB 的 t3/t4 段）：');
const 混 = 最优.toks.map(t => ({ idx: t.idx, act: t.act }));
for (let k = 10; k < 20; k++) { 混[k].idx = DBtoks[k].idx; 混[k].act = DBtoks[k].act; }
const 混d = 排程器.重放(inst, d0.ids, 混, BOND);
console.log(`  t3/t4 段=DB → ${混d === 0 ? '非法(0)' : pct(混d)}  ${混d === 0 ? '(段替换破坏了后续CD合法性)' : `Δ${((混d - 最优.dmg) / 真값 * 100).toFixed(2)}pp`}`);
// 只换位4相位(步13궁→평, 步17평→궁)，不碰次序
const 混2 = 最优.toks.map(t => ({ idx: t.idx, act: t.act }));
混2[13].act = '평'; 混2[17].act = '궁';
const 混2d = 排程器.重放(inst, d0.ids, 混2, BOND);
console.log(`  仅换位4相位(t3궁→t4궁,不动次序) → ${混2d === 0 ? '非法' : pct(混2d)}  Δ${((混2d - 最优.dmg) / 真값 * 100).toFixed(2)}pp`);

// ③ 谷底(94.70%)大预算重爬
console.log('\n③ 谷底(s13→s17相位移动)大预算 first-improving 重爬：');
const 谷toks = 混2d > 0 ? 混2 : 最优.toks.map(t => ({ idx: t.idx, act: t.act }));
const 谷底d = 混2d;
console.log(`  谷底起点 = ${谷底d === 0 ? '非法' : pct(谷底d)}`);
if (谷底d > 0) {
  const hg = 排程器.爬山(inst, d0.ids, 谷toks, BOND, 60000);
  console.log(`  谷底+大预算爬山 = ${pct(hg.dmg)}  提升${hg.提升}  → ${hg.dmg > 最优.dmg ? '★超过原最优(谷底可穿)' : '未超过原最优(谷底重爬回不去)'}`);
}
console.log('\n完成');
