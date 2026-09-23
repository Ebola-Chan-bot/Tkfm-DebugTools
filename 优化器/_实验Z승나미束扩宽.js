'use strict';
/*
 * 实验Z：승나미 束扩宽复测（sync 填充状态继承修复之后的首次扩宽测试）。
 * 背景：승나미 98.16% 来自束+爬山路径（束 97.96%）；谷底试探轴已实证穷尽（诊断X/Y：池耗尽、
 *   二层跨谷 96.18% 反低于基线）。唯一未测的资源轴 = 束宽本身——승나미 与 DB 的分歧在 t3 回合内
 *   次序（束评分依赖 sync 填充续航估计，而填充状态继承 bug 修复恰好改的就是"前缀已铺 buff"的估计精度），
 *   修复后 DB 前缀的估值可能不再被压死，加宽或许能让 DB 分支存活。
 * 网格：w=10(基线)/20/30/50 × R=4，每档束+爬山10000，报达成率。
 * 判据：任何档 >98.16% → "束宽轴资源有效"，승나미 缺口可在束层修复；全部 ≈97.96~98.16% → 束评分
 *   对 t3 次序的排序失真与队[7]同源（加宽无法救回被估值压死的前缀），승나미 98.16% 确认为体系边界，
 *   下一根轴只能是评分器升级或复合邻域算子。
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
console.log(`승나미 ${IDS}  DB=${(真값 / 1e9).toFixed(3)}G`);

for (const [w, R] of [[10, 4], [20, 4], [30, 4], [50, 4]]) {
  const t0 = Date.now();
  const b = 排程器.束搜索(inst, d0.ids, BOND, { width: w, R, 评分: 'sync', 时限秒: 900 });
  const h = 排程器.爬山(inst, d0.ids, b.toks, BOND, 10000);
  const 取 = Math.max(b.dmg, h.dmg);
  console.log(`w=${String(w).padEnd(2)} R=${R}: 束${pct(b.dmg)} +爬${pct(取)}  扩${b.扩展数}  [${((Date.now() - t0) / 1000).toFixed(0)}s]${取 > 真값 * 0.9816 ? '  ★超基线' : ''}`);
}
console.log('\n完成');
