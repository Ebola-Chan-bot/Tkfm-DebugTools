'use strict';
/*
 * _验证R8残差队.js：slice 修复后，残差队在"benchmark 同口径全链路"（束爬+相位兜底+节拍兜底+窗对齐兜底，max取优）的达成率。
 * 背景：benchFINAL(197/200) 由修复前代码启动——89队얀코 的胜出窗 S={1,4,5,7,10,13} 在爬山候选第4位，
 *   数组模式 slice(0,TopK=3) 截掉 → 终89.74%；修复后数组模式返回全量爬山候选（机制出≤6+节拍补足），
 *   M6 实证同队 99.81%。本验证走 内层benchmark.评一队 同款链路确认生产口径生效。
 * 目标队：benchFINAL 残余 <99.9% 的队（含 89队/승나미系/나리系）。
 * 用法: node _验证R8残差队.js [--预算=30000] [--谷底=8]
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 兜底爬山预算 = Number((process.argv.find(a => a.startsWith('--预算=')) || '').slice(5) || 30000);
const 谷底 = Number((process.argv.find(a => a.startsWith('--谷底=')) || '').slice(5) || 8);

const 目标 = [
  { 名: '89队얀코', ids: [10197, 10060, 10177, 10193, 10211], 现终: 89.74 },
  { 名: '94队얀코163', ids: [10197, 10152, 10096, 10177, 10163], 现终: 94.85 },
  { 名: '95승나미175', ids: [10177, 10175, 10208, 10211, 10197], 现终: 95.55 },
  { 名: '96승나미195', ids: [10177, 10060, 10195, 10193, 10197], 现终: 96.28 },
  { 名: '96승나미175', ids: [10177, 10175, 10193, 10197, 10208], 现终: 96.68 },
  { 名: '97승나미195', ids: [10177, 10175, 10195, 10197, 10208], 现终: 97.38 },
  { 名: '99胜나미208', ids: [10177, 10060, 10211, 10208, 10197], 现终: 98.16 },
];

function DB队(ids) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 键 = ids.join(',');
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    if (String(d.compstr).split(/\s+/).filter(Boolean).map(Number).join(',') !== 键) continue;
    if (!best || d.recommend > best.recommend) best = d;
  }
  return best;
}

const inst = 适配.createEngine();
for (const g of 目标) {
  const db = DB队(g.ids);
  if (!db) { console.log(`${g.名}: DB无记录`); continue; }
  const DBtoks = 排程器.解析指令集(inst, g.ids, db.description, BOND);
  const 真값 = 排程器.重放(inst, g.ids, DBtoks, BOND);
  const pct = x => (x / 真값 * 100).toFixed(2) + '%';

  // benchmark 评一队 同口径（跳过束搜索省时：残差队的窗对齐才是增量件，束爬值已由 benchFINAL 记录）
  let 终 = 0, 来源 = '-';
  // 相位兜底
  if (机制特征.需相位规划(g.ids)) {
    for (const 憋 of [5, 99]) {
      const c = 排程器.相位对齐构造(inst, g.ids, BOND, { 最大憋: 憋 });
      if (!c || !(c.dmg > 0)) continue;
      const h = 排程器.爬山(inst, g.ids, c.toks, BOND, 兜底爬山预算, null, null, 谷底);
      const 值 = (h && h.dmg > c.dmg) ? h.dmg : c.dmg;
      if (值 > 终) { 终 = 值; 来源 = '+对齐'; }
    }
  }
  // 节拍兜底
  const 节拍候选 = 排程器.节拍对齐构造(inst, g.ids, BOND, { TopK: 3 });
  for (const 构 of 节拍候选) {
    const h = 排程器.爬山(inst, g.ids, 构.toks, BOND, 兜底爬山预算, null, null, 谷底);
    const 值 = (h && h.dmg > 构.dmg) ? h.dmg : 构.dmg;
    if (值 > 终) { 终 = 值; 来源 = '+节拍'; }
  }
  // 窗对齐兜底（修复后：数组模式=全量爬山候选）
  const t0 = Date.now();
  const 窗候选 = 排程器.窗对齐构造(inst, g.ids, BOND, { TopK: 3 });
  for (const 构 of 窗候选) {
    const h = 排程器.爬山(inst, g.ids, 构.toks, BOND, 兜底爬山预算, null, null, 谷底);
    const 值 = (h && h.dmg > 构.dmg) ? h.dmg : 构.dmg;
    if (值 > 终) { 终 = 值; 来源 = '+窗对齐'; }
  }
  const Δ = 终 / 真값 * 100 - g.现终;
  console.log(`${g.名} [${g.ids}]: 兜底链终=${pct(终)} [${来源}] vs 现终=${g.现终}% → ${Δ > 0.05 ? '★+' + Δ.toFixed(2) + 'pp' : Δ.toFixed(2) + 'pp'}  (窗候选${窗候选.length}个, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log('完成');
