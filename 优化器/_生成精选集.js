'use strict';
/*
 * _生成精选集.js —— 产出 精选回归集.txt（供 内层benchmark BENCH_LIST 模式用）
 * 动机：N=200 全量回归 ~9.5h，而 195/200 队早已稳定 100%，重复测无信息量。
 *   回归的价值在**覆盖已知危险面**，不在数量。精选集四源合并去重（~40队，24线程 ~25分钟）：
 *     ① DB recommend Top20（bit级可复现过滤后取前20）——生产主场景代表
 *     ② 上一次全量(R9g)未达 100% 的全部队——已知最差面，逐支必须盯
 *     ③ R9g 各兜底来源(+对齐/+节拍/+窗/+序重排)每类代表队——每个兜底段都要被打到
 *     ④ 人工指定的历史难例（후지카无伤害궁族、94/97.9队窗族、승나미相位族、시엘98.62、实验P/Q原型队）
 * 输出格式：一行一队 "id1,id2,..."，# 开头为注释（benchmark 侧解析）。
 * 用法：node _生成精选集.js [--bench=D:\path\_benchR9g.log]
 */
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

const DATA_JSON = path.resolve(__dirname, '..', '..', 'tenkaassist_data', 'data', 'data.json');
const OUT = path.join(__dirname, '精选回归集.txt');
const 特例ID = new Set([10162, 10205]);
const BOND = [5, 5, 5, 5, 5];

// --bench= 指定上一次全量日志（默认自动找 _benchR9g.log，不存在则只用 ①④）
const benchArg = (process.argv.find(a => a.startsWith('--bench=')) || '').slice(8)
  || [['..', '_benchR9g.log'], ['..', '_benchR9h.log']].map(p => path.join(__dirname, ...p)).find(p => fs.existsSync(p))
  || null;

// ---------- 名单（与 内层benchmark.选队 同一套过滤+bit级复现口径） ----------
const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
const inst = 适配.createEngine();
const getCharacter = 适配.角色数据().getCharacter;
const 缓存 = new Map();
function 角色(id) { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); }
const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
const 名单 = new Map();   // 键=ids.join(',') → {队,ids,description,recommend}
for (const d of arr) {
  if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
  const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
  if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
  const 键 = ids.join(',');
  const 旧 = 名单.get(键);
  if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
}
console.log(`DB可复现候选池: ${名单.size} 支`);
const 可复现队列 = [];   // 惰性验证（解析+重放≈几十ms/支，Top200验证成本可接受）
for (const d of [...名单.values()].sort((a, b) => b.recommend - a.recommend)) {
  if (可复现队列.length >= 400) break;   // 足够覆盖 top20 + 兜底来源查找
  const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  if (toks && 排程器.重放(inst, d.ids, toks, BOND) === d.recommend) 可复现队列.push(d);
}
console.log(`bit级可复现(Top400内): ${可复现队列.length} 支`);

// ---------- ③④ 历史难例（人工名单；不在可复现池中的会被自动剔除并告警） ----------
const 难例 = [
  ['후지카无伤族(命中memo唯一正收益/相位兜底重灾区)', '10213,10190,10167,10164,10155'],
  ['후지카族2', '10213,10155,10190,10187,10072'],
  ['94队(窗对齐重灾-候选9distinct1)', '10197,10152,10096,10177,10163'],
  ['97.9队(窗95.87→序重排100.19)', '10197,10167,10147,10163,10134'],
  ['시엘98.62(未破案)', '10210,10212,10151,10168,10072'],
  ['나리(窗节拍双依赖)', '10202,10212,10133,10210,10072'],
  ['승나미89(实验M原型-相位谷)', '10177,10060,10211,10208,10197'],
  ['승나미92(窗对齐)', '10177,10152,10208,10211,10197'],
  ['89队얀코( slice修复见证队)', '10197,10060,10177,10193,10211'],
  ['얀코相位难(实验M2/M3)', '10197,10060,10177,10193,10208'],
  ['실험Q原型(槽位窗)', '10197,10152,10196,10177,10147'],
  ['闸外2(需窗=false靠窗救回)', '10197,10152,10196,10163,10147'],
  ['신이카99.98(验证P队列型)', '10197,10152,10096,10163,10147'],
];

// ---------- 合并 ----------
const 选 = new Map();   // 键 → {ids, 理由[]}
function 加(键, 理由) {
  if (!名单.has(键)) return false;
  const 项 = 选.get(键) || { ids: 键, 理由: [] };
  项.理由.push(理由);
  选.set(键, 项);
  return true;
}
// ① Top20
可复现队列.slice(0, 20).forEach((d, i) => 加(d.ids.join(','), `①Top${i + 1}`));
// ④ 难例
for (const [注, 键] of 难例) 加(键.replace(/\s/g, ''), '④' + 注.trim());
// ②③ 从 bench 日志解析：未达100%队 + 各来源代表
let bench统计 = { 解析: 0 };
if (benchArg && fs.existsSync(benchArg)) {
  const 行 = fs.readFileSync(benchArg, 'utf8').split(/\r?\n/);
  const 源计 = {};
  for (const l of 行) {
    const m = l.match(/^(.{1,14})\[(\d+(?:,\d+){4})\].*终(\d+\.\d+)%/);
    if (!m) continue;
    bench统计.解析++;
    const [, 名, ids, pct] = m;
    const 源 = (l.match(/源=([^\s|]+)/) || [, '?'])[1];
    bench统计[ids] = { 名: 名.trim(), pct: +pct, 源 };
    if (!源计[源]) 源计[源] = [];
    源计[源].push(ids);
    // ② 未达100%
    if (+pct < 100) 加(ids, `②R9g未达100%(${pct}%)`);
  }
  // ③ 每类来源取"最难的2支 + 达标但靠它救回的2支"作代表
  for (const 源 of Object.keys(源计)) {
    const 按难 = 源计[源].sort((a, b) => (bench统计[a].pct) - (bench统计[b].pct));
    按难.slice(0, 2).concat(按难.slice(-2)).forEach(ids => 加(ids, `③来源${源}代表`));
  }
  bench统计.来源数 = Object.keys(源计).length;
} else {
  console.log(`⚠️ 未找到全量日志(--bench=)，跳过②③源，只用①④`);
}

// ---------- 输出 ----------
const 出 = [`# 精选回归集（_生成精选集.js 产出 ${new Date().toISOString().slice(0, 10)}）`,
  `# 基准日志: ${benchArg ? path.basename(benchArg) : '(无)'}`,
  `# 用法: $env:BENCH_LIST='<此文件>'; node 内层benchmark.js 40 10 4 sync`,
  ''];
for (const [键, 项] of 选) {
  const d = 名单.get(键);
  出.push(`${键} # ${d.队} DB=${d.recommend.toLocaleString()} ← ${项.理由.join(' + ')}`);
}
fs.writeFileSync(OUT, 出.join('\n') + '\n');
console.log(`\n精选集: ${选.size} 支 → ${OUT}`);
console.log(`构成: bench解析${bench统计.解析 || 0}队 来源类${bench统计.来源数 || 0}种`);
// 快速自检：每行 ids 可解析且 bit 复现（抽验前5支）
let 过 = 0;
for (const 键 of [...选.keys()].slice(0, 5)) {
  const d = 名单.get(键);
  const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  if (toks && 排程器.重放(inst, d.ids, toks, BOND) === d.recommend) 过++;
}
console.log(`抽验5支bit复现: ${过}/5`);
