'use strict';
/*
 * _分析段可裁性.js —— 数据驱动判定"哪些搜索段对多数队冗余、可否按机制特征静态排除"
 * 方法：解析 R9f 日志每队 {前瞻,束,爬,终}(%)，对每队算机制画像(需相位/需窗/cd分布/无伤害궁/注入/CD改/周期)，
 *       交叉分组看：前瞻已达标队、束零增益队、兜底大增益队 各自的机制特征分布是否有可判别的共性。
 * 只做离线统计（读日志 + 算画像），不改任何生产路径、不回退。产出判别规则候选，交 A/B 验证后再落生产。
 */
const fs = require('fs');
const path = require('path');
const 机制 = require('./机制特征.js');
const 排程 = require('./排程器.js');

// 日志路径：--log=<相对/绝对> 或默认 R9g（带 源=/ms[] 归因字段）
const 参数log = (process.argv.find(a => a.startsWith('--log=')) || '').slice(6);
const LOG = 参数log ? path.resolve(参数log) : path.resolve(__dirname, '..', '_benchR9g.log');
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(l => /终\d+\.\d+%/.test(l));

function 画像v2(ids) {
  const cd = ids.map(id => { const f = 排程.特征.get(id) || {}; return f.cd || 0; });
  const 无伤害궁 = !ids.some(id => { const f = 排程.特征.get(id); return f && (f.ultMag > 0 || f.atkMag > 0); });
  let 注入 = 0, CD改 = 0, 周期 = 0;
  for (const id of ids) { const m = 机制.画像(id) || {}; 注入 += (m.注入数 || 0); CD改 += (m.CD操纵数 || 0); 周期 += (m.周期数 || 0); }
  const cdSet = new Set(cd.filter(c => c > 0));
  return { cd, cd方差: cdSet.size > 1, cd单一: cdSet.size === 1, 无伤害궁, 注入, CD改, 周期, 需相位: 机制.需相位规划(ids), 需窗: 机制.需窗规划(ids) };
}

const 队 = [];
let 旧格式 = 0;
for (const l of lines) {
  const m = l.match(/^(\S+)\[([\d,]+)\]: 前瞻([\d.]+)% 束([\d.]+)%\+爬([\d.]+)% 终([\d.]+)%/);
  if (!m) continue;
  const ids = m[2].split(',').map(Number);
  const [名, , , s前瞻, s束, s爬, s终] = m;
  const g = { 名, ids, 前瞻: +s前瞻, 束: +s束, 爬: +s爬, 终: +s终, ...画像v2(ids) };
  // 新字段（R9g 起有）：源=最终最优解产出段；ms[束.. 爬.. 兜.. 节拍.. 窗.. 序..]=逐队分段耗时(秒)
  const msrc = l.match(/源=(\S+)/);
  g.来源 = msrc ? msrc[1] : null;
  if (!msrc) 旧格式++;
  const mms = l.match(/ms\[束(\d+) 爬(\d+) 兜(\d+) 节拍(\d+) 窗(\d+) 序(\d+)\]/);
  if (mms) { g.ms = { 爬: +mms[2] || 0, 兜: +mms[3] || 0, 节拍: +mms[4] || 0, 窗: +mms[5] || 0, 序: +mms[6] || 0 }; g.ms.束 = +mms[1] || 0; }
  g.束零增益 = Math.abs(g.束 - g.前瞻) < 0.005;
  g.前瞻达标 = g.前瞻 >= 100;
  g.兜底大增益 = g.终 - g.爬 >= 1.0;        // 兜底链把 <100 拉到 ≥终
  g.爬已达标 = g.爬 >= 100;
  队.push(g);
}
if (旧格式) console.log(`⚠ ${旧格式}/${队.length} 行为旧格式(无 源=/ms[])，交叉分析仅基于新格式行`);

function 分布(子集, 标) {
  if (!子集.length) { console.log(`\n[${标}] 0队`); return; }
  const c = k => 子集.filter(x => x[k]).length;
  const N = 子集.length;
  const pct = v => (v / N * 100).toFixed(0) + '%';
  console.log(`\n[${标}] ${N}队`);
  console.log(`  需相位=${pct(c('需相位'))} 需窗=${pct(c('需窗'))} | 无伤害궁=${pct(c('无伤害궁'))} cd方差=${pct(c('cd方差'))} cd单一=${pct(c('cd单一'))}`);
  console.log(`  注入>0=${pct(子集.filter(x => x.注入 > 0).length)} CD改>0=${pct(子集.filter(x => x.CD改 > 0).length)} 周期>0=${pct(子集.filter(x => x.周期 > 0).length)}`);
}

console.log(`解析 ${队.length} 队。全局基准：`);
分布(队, '全部200');
分布(队.filter(g => g.前瞻达标), '前瞻已≥DB真值(束爬兜底全白烧)');
分布(队.filter(g => g.束零增益 && !g.前瞻达标), '前瞻<100且束零增益(束段无改进)');
分布(队.filter(g => g.兜底大增益), '兜底链大增益≥1pp(兜底不可裁)');
分布(队.filter(g => g.爬已达标), '爬已≥100(兜底应零触发)');

// ===== 混淆矩阵：静态特征 vs "兜底链是否有增益"（判断能否按特征静态排除兜底段）=====
//   定义：兜底有增益 = 终 - 爬 >= 0.005pp（相位/节拍/窗/序重排至少一段救回了 <100 的爬解）
//   目标：找一条静态规则，"命中则该队兜底几乎必无增益"→ 可跳过兜底四段（省最贵的相位/节拍/窗爬山）。
function 混淆(判据, 判据名) {
  const 命中 = 队.filter(判据), 未命中 = 队.filter(g => !判据(g));
  const 益 = 集 => 集.filter(g => g.终 - g.爬 >= 0.005).length;
  const 达 = 集 => 集.filter(g => g.爬 >= 100).length;
  console.log(`\n[判据: ${判据名}]`);
  console.log(`  命中 ${命中.length}队: 爬已≥100=${达(命中)} 兜底有增益=${益(命中)} | 未命中 ${未命中.length}队: 爬已≥100=${达(未命中)} 兜底有增益=${益(未命中)}`);
  const 精度 = 命中.length ? (命中.length - 益(命中)) / 命中.length * 100 : 0;   // 命中且兜底无增益 / 命中 = 裁兜底的"正确率"
  const 漏网 = 益(命中);   // 命中但兜底本有增益 = 误裁的队（会掉分）
  console.log(`  → 若命中则跳兜底: 正确率(兜底确实无增益)=${精度.toFixed(1)}%  误裁(会掉分)=${漏网}队`);
}
混淆(g => g.cd单一, 'cd单一(全队cd相同)');
混淆(g => g.cd单一 && !g.需窗, 'cd单一 且 不需窗规划');
混淆(g => g.cd单一 && g.周期 === 0, 'cd单一 且 无周期机制');
混淆(g => !g.需窗 && g.周期 === 0, '不需窗 且 无周期机制');
混淆(g => g.cd单一 && g.注入 <= 4 && g.CD改 <= 5, 'cd单一 且 注入≤4 且 CD改≤5');

// 前瞻达标队的完整静态指纹（逐队）
console.log('\n=== 前瞻达标队(26) 逐队静态特征 ===');
for (const g of 队.filter(x => x.前瞻达标)) {
  console.log(`  cd[${g.cd}] 无伤${g.无伤害궁 ? 'Y' : 'N'} 注入${g.注入} CD改${g.CD改} 窗${g.需窗 ? 'Y' : 'N'} | ${g.名}[${g.ids}] 前瞻${g.前瞻} 爬${g.爬}`);
}

// ===== 来源×cd结构交叉表（R9g 新字段）：兜底互斥门控的核心证据 =====
//   结构上各段独立起点+max取优 ⇒ "源≠某段 ⇒ 该段对终值零贡献 ⇒ 可安全跳过"。
//   门控规则候选：cd单一→只跑相位段(跳节拍+窗)；cd方差→只跑节拍+窗(跳相位)。
//   裁决标准：交叉表里"cd单一×源=+节拍/+窗" 与 "cd方差×源=+对齐" 都必须是 0 队，否则有误伤。
const 有源 = 队.filter(g => g.来源);
if (有源.length) {
  const 源集 = ['束+爬', '束', '+对齐', '+节拍', '+窗对齐', '+序重排'];
  const 组 = { 'cd单一': 有源.filter(g => g.cd单一), 'cd方差': 有源.filter(g => !g.cd单一) };
  console.log('\n=== 来源×cd结构交叉表 ===');
  console.log('组       ' + 源集.map(s => s.padStart(8)).join('') + '   小计');
  for (const [k, 集] of Object.entries(组)) {
    const 行 = 源集.map(s => String(集.filter(g => g.来源 === s).length).padStart(8)).join('');
    console.log(k.padEnd(8) + 行 + String(集.length).padStart(7));
  }
  // 门控裁决
  const 误A = 组['cd单一'].filter(g => g.来源 === '+节拍' || g.来源 === '+窗对齐');   // cd单一队靠节拍/窗救回 = 跳它们会掉分
  const 误B = 组['cd方差'].filter(g => g.来源 === '+对齐');                            // cd方差队靠相位段救回 = 跳它会掉分
  const 误C = 有源.filter(g => !g.需窗 && g.来源 === '+窗对齐');                        // 不需窗队靠窗对齐救回 = 跳窗会掉分
  console.log(`\n门控裁决: cd单一跳节拍+窗 误伤=${误A.length}队 | cd方差跳相位 误伤=${误B.length}队 | 不需窗跳窗对齐 误伤=${误C.length}队`);
  误A.forEach(g => console.log(`  [误A] cd单一但源=+${g.来源.slice(1)}: ${g.名}[${g.ids}] cd=[${g.cd}] 爬${g.爬}→终${g.终}`));
  误B.forEach(g => console.log(`  [误B] cd方差但源=+对齐: ${g.名}[${g.ids}] cd=[${g.cd}] 爬${g.爬}→终${g.终}`));
  误C.forEach(g => console.log(`  [误C] 不需窗但源=+窗对齐: ${g.名}[${g.ids}] cd=[${g.cd}] 需窗=${g.需窗} 爬${g.爬}→终${g.终}`));
  // 跳束安全性：cd单一队里 源=束+爬(束toks进终解) 的占比——这部分跳束需换起点(前瞻toks)，要验终值；
  //   源=+X 的束解已被丢弃→跳束纯省时间零风险。
  const 束进终 = 有源.filter(g => g.来源 === '束+爬' || g.来源 === '束');
  const 束进终单一 = 束进终.filter(g => g.cd单一);
  console.log(`\n跳束分析: 源∈{束+爬,束}(束toks进终解)=${束进终.length}队, 其中cd单一=${束进终单一.length}队(需验起点替换)；其余cd单一队跳束零风险`);
  // ===== 分段耗时总账（秒，新格式行）=====
  const ms队 = 有源.filter(g => g.ms);
  if (ms队.length) {
    const 段 = ['束', '爬', '兜', '节拍', '窗', '序'];
    console.log(`\n=== 分段耗时总账(${ms队.length}队, 串) ===`);
    const 和 = {};
    for (const s of 段) 和[s] = ms队.reduce((a, g) => a + g.ms[s], 0);
    const 总 = 段.reduce((a, s) => a + 和[s], 0) || 1;
    for (const s of 段) console.log(`  ${s}: ${和[s]}s (${(和[s] / 总 * 100).toFixed(1)}%)`);
    // 触发口径：各兜底段 ms>0 的队数 = 实际触发队数(终<DB才跑)
    for (const s of ['兜', '节拍', '窗', '序']) console.log(`  ${s}段触发队数: ${ms队.filter(g => (g.ms[s] || 0) > 0).length}/${ms队.length}`);
  }
}
