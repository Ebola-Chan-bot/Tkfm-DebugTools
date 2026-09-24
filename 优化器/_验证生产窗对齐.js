// Task B生产验证: 窗对齐兜底【生产同口径】(数组模式TopK → 外部逐候选爬山 → max) 批量跑难队
//   与 内层benchmark.js line126/团队搜索器.js line211 完全一致:
//     窗对齐构造(inst,ids,BOND,{TopK}) → 数组 of 爬山候选 → 每个 爬山(兜底爬山预算,K) → max + 构造dmg
//   验证: ①94.85队生产链路达~99.5%(방变体自动入选) ②已知难队(89/91/92승나미/85)零回退或提升
// 用法: node _验证生产窓对齐.js [爬山预算=30000] [谷底K=8] [TopK=3]
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');
const 机制特征 = require('./机制特征.js');
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(path.resolve(__dirname, '..'), '../tenkaassist_data/data/data.json'))).toString('utf8'));
const BOND = [5, 5, 5, 5, 5];
const 爬山预算 = Number(process.argv[2] || 30000);
const 谷底 = Number(process.argv[3] || 8);
const TopK = Number(process.argv[4] || 3);
const 队参 = process.argv.find(a => a.startsWith('--队='));
const 过滤 = 队参 ? 队参.slice(4) : null;

// 生产兜底链（与 内层benchmark.评一队 窗对齐段逐字对齐）
function 生産窓兜底(inst, ids, DBtoks, 真값) {
  const 窗候选 = 排程器.窗对齐构造(inst, ids, BOND, { TopK });
  let 终 = 0, 来源 = '-';
  for (const 构 of 窗候选) {
    const gh = 排程器.爬山(inst, ids, 构.toks, BOND, 爬山预算, null, null, 谷底);
    const 窗终 = (gh && gh.dmg > 构.dmg) ? gh.dmg : 构.dmg;
    if (窗终 > 终) { 终 = 窗终; 来源 = 构.来源 + (构.buff窗 ? '[憋]' : '[준]'); }
  }
  return { 终: (终 / 真값 * 100), 来源, 候选数: 窗候选.length };
}

// 难队清单(名, ids, 现终% from 最新R9c或历史最差, 是否新队)
const 队组 = [
  { 名: '94队(新最低)', ids: '10197,10152,10096,10177,10163', 现终: 94.85 },   // R9c 新最低, _实验N방变체实证99.65
  { 名: '89队얀코', ids: '10197,10060,10177,10193,10211', 现终: 99.81 },
  { 名: '91队얀코', ids: '10197,10152,10196,10177,10147', 现终: 99.87 },
  { 名: '92승나미', ids: '10177,10152,10208,10211,10197', 现终: 100.17 },
  { 名: '85队얀코', ids: '10197,10060,10177,10193,10208', 现终: 100.04 },
  { 名: '승나미本队', ids: '10177,10060,10211,10208,10197', 现终: 99.92 },
  { 名: '칼리버对照', ids: '10211,10167,10128,10168,10197', 现终: 100.0 },
];
const inst = 适配器.createEngine();
console.log(`生产窗对齐兜底验证: 爬山预算=${爬山预算} K=${谷底} TopK=${TopK}  时间${new Date().toLocaleTimeString()}\n`);
for (const g of 队组) {
  if (过滤 && String(g.ids).split(',').map(Number).sort((a, b) => a - b).join(',') !== 过滤.split(',').map(Number).sort((a, b) => a - b).join(',')) continue;
  const ids = g.ids.split(',').map(Number);
  const wantKey = [...ids].sort((a, b) => a - b).join(' ');
  // 取该站位全部 DB 记录中可 bit 级复现的最高 recommend（与 内层benchmark 选队口径一致，避免单条记录重放失真）
  const 同队 = 原始.filter(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === wantKey);
  let 真값 = 0, DBtoks = null;
  for (const rec of 同队) {
    const tk = 排程器.解析指令集(inst, ids, rec.description, BOND);
    if (!tk) continue;
    const v = 排程器.重放(inst, ids, tk, BOND);
    if (v === Number(rec.recommend) && v > 真값) { 真값 = v; DBtoks = tk; }
  }
  if (!DBtoks) { for (const rec of 同队) { const v = Number(rec.recommend); if (v > 真값) 真값 = v; } DBtoks = 排程器.解析指令集(inst, ids, 同队.find(x => Number(x.recommend) === 真값).description, BOND); console.log(`${g.名}: 无bit级复现记录, 用最高recommend=${真값}作分母(近似)`); }
  if (!(真값 > 0)) { console.log(`${g.名}: 真값解析失败 跳过`); continue; }
  const t0 = Date.now();
  const r = 生産窓兜底(inst, ids, DBtoks, 真값);
  const 提升 = r.终 - g.现终;
  const 标记 = 提升 > 0.05 ? `★+${提升.toFixed(2)}pp` : (提升 < -0.05 ? `▼${提升.toFixed(2)}pp 回退!` : '≈持平');
  console.log(`${g.名} [${g.ids}] 需窗规划=${机制特征.需窗规划(ids)}: 生产窗兜底=${r.终.toFixed(2)}% (vs现终${g.现终}%) ${标记} 候选${r.候选数}个 来源=${r.来源} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
console.log('\n完成');
