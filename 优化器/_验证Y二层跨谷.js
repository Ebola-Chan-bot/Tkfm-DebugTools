'use strict';
/*
 * 验证Y：승나미 复合谷能否被"二层跨谷"穿越。
 * 诊断X 已实锤：① 单层谷底试探 K=8/16/32 全部停 98.16%（池耗尽）；② DB 的 t3/t4 段恰为完整解（手工替换=100.00%）；
 *   ③ 谷底(94.70%) first-improving 重爬 0 提升 —— 谷底与 DB 之间还隔着第二层谷（t3 回合内次序重排）。
 * 本验证：从谷底(94.70%)出发、用"带谷底试探的爬山"(K=8) 再爬 —— 即在谷底继续跨谷（二层）。
 *   若 →100%：复合谷可被"谷底重爬带试探"穿越，产出实现 = 排程器.爬山 的谷底重爬从 爬坡(纯上升) 升级为
 *     带试探的爬坡（深度2）；若仍回不去：승나미 98.16% 确认为束+爬山+谷底试探体系的能力边界。
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

const b = 排程器.束搜索(inst, d0.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限초: 600 });
const bc = 排程器.爬山(inst, d0.ids, b.toks, BOND, 10000);
const 最优 = bc.dmg > b.dmg ? bc : b;
console.log(`最优(束+爬)=${pct(最优.dmg)}`);

// 谷底 = 唯一合法相位移动 s13궁→평 / s17평→궁（验证W 实测 94.70%）
const 谷 = 最优.toks.map(t => ({ idx: t.idx, act: t.act }));
谷[13].act = '평'; 谷[17].act = '궁';
const 谷d = 排程器.重放(inst, d0.ids, 谷, BOND);
console.log(`谷底(位4궁 t3→t4) = ${pct(谷d)}`);

// 二层跨谷：从谷底出发，再跑"带谷底试探的爬山"
for (const K2 of [4, 8, 16]) {
  const t0 = Date.now();
  const r = 排程器.爬山(inst, d0.ids, 谷, BOND, 60000, null, null, K2);
  console.log(`谷底+试探爬山 K2=${K2}: ${pct(r.dmg)}  Δ${((r.dmg - 最优.dmg) / 真값 * 100).toFixed(2)}pp(vs最优)  试探${r.谷底试探数}/采纳${r.谷底采纳数}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
console.log('完成');
