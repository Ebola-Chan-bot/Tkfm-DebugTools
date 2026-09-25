'use strict';
/*
 * 内层搜索正式 benchmark：角色组合确定时，MC rollout 束搜索能否高效发现 DB 最优指令序。
 *
 * 队选取：全站 recommend 降序、站位键去重、本地 bit 级复现（重放===recommend）的前 N 支强队。
 * 真值 = DB recommend（景观探测已证其为 r=2 局部极大，作 benchmark 可靠）。
 * 全部算法从零构造（不用 DB toks 作起点，无种子），达成率 = dmg / DB最优。
 *
 * 用法: node 内层benchmark.js [N支] [width] [R]
 *   - 支持 worker 并行：默认 24 线程（动态任务队列：worker 完工即领下一队，无长尾空转）；
 *     环境变量 BENCH_THREADS 可覆写（1=主线程串行）
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const CLIMB = Number(process.env.BENCH_CLIMB) || 3000; // 束后爬山精修预算（默认3000与hybrid基准同口径可比）
// 保守兜底（与生产 团队搜索器 同口径）：需相位规划 队跑 相位对齐构造+爬山，按真值取优。
//   BENCH_FALLBACK=0 可关（对照旧口径）。兜底档 {5,99}（实验L 实证：3太紧、5/8/99同解）。
//   谷底试探=8（诊断N~U + 验证P5 实证 + 生产同口径）：难例正解隔着必降谷且缺口分层（相位→次序），
//   纯上升爬山不可达。兜底爬山预算下限 30000（谷底试探评估消耗高：队[7] K=8 达 99.98% 需 14156 评估、
//   승나미 需 18156，CLIMB=10000 会撞顶致试探跑不完 —— 验证P5/生产同口径）。
const 兜底开关 = process.env.BENCH_FALLBACK !== '0';
const 兜底档 = [5, 99];
const 谷底试探 = process.env.BENCH_VALLEY == null ? 8 : Number(process.env.BENCH_VALLEY);
const 兜底爬山预算 = process.env.BENCH_FALLBACK_CLIMB == null
  ? (谷底试探 > 0 ? Math.max(CLIMB, 30000) : CLIMB)
  : Number(process.env.BENCH_FALLBACK_CLIMB);
// 节拍对齐兜底（2026-09-24，与生产 团队搜索器 同口径）：cd 混杂队的全员齐射相位起点+爬山。BENCH_BEAT=0 可关（对照旧口径）。TopK=3（希耶儿队实证：构造dmg排序与爬山终点排序不一致，只取Top1丢18pp）。
const 节拍开关 = process.env.BENCH_BEAT !== '0';
const 节拍TopK = process.env.BENCH_BEAT_TOPK == null ? 3 : Number(process.env.BENCH_BEAT_TOPK);
// 窗对齐兜底（2026-09-24，与生产 团队搜索器 同口径）：机制周期窗+CD改写队（需窗规划）的齐射相位起点+爬山。
//   BENCH_WINDOW=0 可关（对照）。TopK=3 同节拍教训（89队实证：构造dmg排序≠爬山终点排序，DB窗非Top1）。
//   85.16% 最难队救回件（实验M2：→100.04%）。
const 窗对齐开关 = process.env.BENCH_WINDOW !== '0';
const 窗对齐TopK = process.env.BENCH_WINDOW_TOPK == null ? 3 : Number(process.env.BENCH_WINDOW_TOPK);
// 终局整回合序重排（_实验O：97.9队 爬山后卡95.87的序深谷 → 100.19，成本~1547重放≈10s，仅终<真值时触发）
//   BENCH_SEQUENCE=0 可关（对照）。默认开。
const 序重排开关 = process.env.BENCH_SEQUENCE !== '0';
// ===== 段门控（BENCH_GATE=1 开启，**默认关 = 与 R9g/R9f 口径完全一致**）=====
// 依据（_分析段可裁性.js 交叉表 + 构造设计语义）：兜底各段是**独立起点 + max 取优**，
//   故"某段从未产出最优解"⇒ 跳过它终值逐位不变（数学精确，非启发式）。
//   三段各自的适用结构（设计原意）：
//     相位对齐构造 = 假设全员同相齐射节奏 → 只对 **cd单一** 队有意义（cd混杂队它构造不出 buff궁 也憋的结构）；
//     节拍对齐构造 = 为 **cd混杂**（cd方差）队而生（其注释原话："cd 混杂队的 DB 最优解要求 buff궁也憋"）；
//     窗对齐构造   = 需机制周期窗 ∧ CD改写（**需窗规划**）才有窗可对齐；生产链路本就有此闸门，benchmark 故意不设（最坏压力口径）。
//   裁决标准：交叉表"cd单一×源∈{+节拍,+窗}"与"cd方差×源=+对齐"必须为 0 队，否则有误伤（会掉分），不得开启。
const 段门控 = process.env.BENCH_GATE === '1';
const 特例ID = new Set([10162, 10205]);
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
// 机制表开关：BENCH_MECH=1 时 createEngine 启用表驱动解释器（有表角色走表，无表回落原 setDefault）。
//   用于阶段1扩验：证明机制表路径不降低达成率/不拖垮性能。主/副线程都用同一环境变量，结果一致。
const 引擎选项 = process.env.BENCH_MECH === '1' ? { 启用机制表: true } : {};

// ---- 选队（主/副线程同一逻辑，结果确定性一致）----
function 选队(N) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const inst = 适配.createEngine(引擎选项);
  const getCharacter = 适配.角色数据().getCharacter;
  const 缓存 = new Map();
  function 角色(id) { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); }
  const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
  }
  const 强队 = [...名单.values()].sort((a, b) => b.recommend - a.recommend);
  const 可复现 = d => {
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    return toks && 排程器.重放(inst, d.ids, toks, BOND) === d.recommend;
  };
  // 精选名单模式（BENCH_LIST=文件路径，一行一队 "id1,id2,..."，#开头为注释）：
  //   按文件顺序从 名单 取队+bit级复现校验，不做 top-N 截断——回归的价值在覆盖已知危险面不在数量。
  //   由 _生成精选集.js 产出（DB top20 ∪ R9g未达标 ∪ 各兜底来源代表 ∪ 历史难例）。
  if (process.env.BENCH_LIST) {
    const 行 = fs.readFileSync(process.env.BENCH_LIST, 'utf8').split(/\r?\n/);
    const 用队 = [];
    for (const l of 行) {
      // 行格式 "<ids> # 理由"（_生成精选集.js 产出带注记），整行注释也以 # 开头——统一截断首个 # 再 trim
      const s = l.split('#')[0].trim();
      if (!s) continue;
      const d = 名单.get(s);
      if (!d) { console.log(`⚠️ 精选名单未匹配(不可模拟/特例/不在DB): ${s}`); continue; }
      if (!可复现(d)) { console.log(`⚠️ 精选名单bit复现失败: ${s}`); continue; }
      用队.push(d);
    }
    return 用队;
  }
  const 用队 = [];
  for (const d of 强队) {
    if (用队.length >= N) break;
    if (!可复现(d)) continue;
    用队.push(d);
  }
  return 用队;
}

// ---- 单队评测（主线程内联 / worker 内同函数；引擎实例进程内共享一个）----
let 共享inst = null;
function 取inst() { return 共享inst || (共享inst = 适配.createEngine(引擎选项)); }
function 评一队(d, width, R, 评分) {
  const inst = 取inst();
  const t0 = Date.now();
  const out = {};
  const p = 排程器.先验前瞻贪心(inst, d.ids, BOND);
  out.前瞻 = p ? p.dmg : 0; out.前瞻ms = Date.now() - t0;
  const t1 = Date.now();
  const b = 排程器.束搜索(inst, d.ids, BOND, { width, R, 评分, 时限秒: 600 });
  out.束 = b ? b.dmg : 0; out.束ms = Date.now() - t1; out.扩展 = b ? b.扩展数 : 0; out.深 = b ? b.深度 : 0;
  // 束结果+爬山收尾（束给好起点，爬山精修）
  out.束爬 = out.束;
  if (b && b.toks && b.toks.length === 65 && out.束 < d.recommend) {
    const t2 = Date.now();
    const h = 排程器.爬山(inst, d.ids, b.toks, BOND, CLIMB);
    if (h && h.dmg > out.束爬) out.束爬 = h.dmg;
    out.爬ms = Date.now() - t2;
  }
  // 保守兜底（与生产链路同口径）：需相位规划 队，相位对齐构造给相位正确起点 → 真值爬山 → 按真值取优
  out.终 = out.束爬;
  let bestToks = (b && b.toks && b.toks.length === 65) ? b.toks : null;   // 终局序重排用最优toks（各段取优同步维护）
  out.来源 = out.束爬 >= out.束 ? '束+爬' : '束';
  out.需相位规划 = 兜底开关 && 机制特征.需相位规划(d.ids);
  // 段门控静态特征（纯查特征表，不跑引擎）：cd单一 = 全队 ult cd 相同（同相齐射结构）
  const cd列 = d.ids.map(id => { const f = 排程器.特征.get(id) || {}; return f.cd || 0; }).filter(c => c > 0);
  const cd单一 = new Set(cd列).size <= 1;
  const 需窗 = 机制特征.需窗规划(d.ids);
  out.cd单一 = cd单一; out.需窗 = 需窗;
  out.跳相位 = out.需相位规划 && 段门控 && !cd单一;
  out.跳节拍 = 节拍开关 && 段门控 && cd单一;
  out.跳窗 = 窗对齐开关 && 段门控 && !需窗;
  if (out.需相位规划 && !out.跳相位 && out.终 < d.recommend) {
    const t3 = Date.now();
    // 档间去重（2026-09-25，_探针相位重复 实测）：兜底档{5,99} 在 5/5 样本队构造出**完全相同的 toks**
    //   （实验L早已实证 5/8/99 同解，此次坐实到 toks 级）⇒ 同起点同预算爬山结果必然逐位一致，第二档是
    //   整段重复爬山（30000+谷底8）。按 toks键 跳过重复档，相位兜底段（R9g 实测 6120s=17.9%）近乎砍半。
    //   零行为变化：爬山确定性 + max 取优对重复候选不敏感（与窗对齐去重同一条数学性质）。
    const 见构 = new Set();
    for (const 憋 of 兜底档) {
      const g = 排程器.相位对齐构造(inst, d.ids, BOND, { 最大憋: 憋 });
      if (!g || !(g.dmg > 0)) continue;
      const 键 = 排程器.toks键(g.toks);
      if (见构.has(键)) continue;   // 重复档：爬了也逐位同结果，跳过
      见构.add(键);
      const gh = 排程器.爬山(inst, d.ids, g.toks, BOND, 兜底爬山预算, null, null, 谷底试探);
      const 兜底终 = (gh && gh.dmg > g.dmg) ? gh : g;
      if (兜底终.dmg > 0 && 兜底终.dmg > out.终) { out.终 = 兜底终.dmg; bestToks = 兜底终.toks; out.来源 = '+对齐'; }
    }
    out.兜底ms = Date.now() - t3;
  }
  // 节拍对齐兜底（与生产同口径）：纯静态构造 + TopK各爬山，按真值取优（结构上不可能低于现状）。
  //   不依赖 需相位规划 闸门独立跑（Top200 实测该闸门 200/200 全命中，判别力已失效），仅在 终<真值 时触发。
  if (节拍开关 && !out.跳节拍 && out.终 < d.recommend) {
    const t4 = Date.now();
    const 节拍候选 = 排程器.节拍对齐构造(inst, d.ids, BOND, { TopK: 节拍TopK });
    for (const 构 of 节拍候选) {
      const gh = 排程器.爬山(inst, d.ids, 构.toks, BOND, 兜底爬山预算, null, null, 谷底试探);
      const 节拍终 = (gh && gh.dmg > 构.dmg) ? gh : 构;
      if (节拍终.dmg > 0 && 节拍终.dmg > out.终) { out.终 = 节拍终.dmg; bestToks = 节拍终.toks; out.来源 = '+节拍'; }
    }
    out.节拍ms = Date.now() - t4;
  }
  // 窗对齐兜底（与生产同口径）：S族静态全扫 + TopK各爬山，按真值取优。同上不设闸门，仅 终<真值 时触发
  //   （benchmark 口径为最坏情况压力测试；生产链路有 需窗规划 闸门控成本）。
  if (窗对齐开关 && !out.跳窗 && out.终 < d.recommend) {
    const t5 = Date.now();
    const 窗候选 = 排程器.窗对齐构造(inst, d.ids, BOND, { TopK: 窗对齐TopK });
    for (const 构 of 窗候选) {
      const gh = 排程器.爬山(inst, d.ids, 构.toks, BOND, 兜底爬山预算, null, null, 谷底试探);
      const 窗终 = (gh && gh.dmg > 构.dmg) ? gh : 构;
      if (窗终.dmg > 0 && 窗终.dmg > out.终) { out.终 = 窗终.dmg; bestToks = 窗终.toks; out.来源 = '+窗对齐'; }
    }
    out.窗对齐ms = Date.now() - t5;
  }
  // 终局整回合序重排（2026-09-25，_实验O 实证）：97.9队 窗对齐+爬山后仍卡95.87%（填充已对、序差13/13、
  //   预算180k×K32不敏感=爬山邻域不可达的回合内序深谷）；对最优toks做整回合5!全排列重排（~1547重放≈10s）
  //   →100.19%。只对 终<真值 触发（已达标136+队零成本零扰动）；对束解无效不劣化（重排只换序,不改动作,
  //   bestToks取的是兜底构造爬山终点）；真值max取优（重排失败/劣化则保留原终）。
  if (序重排开关 && out.终 < d.recommend && bestToks) {
    const t6 = Date.now();
    const o = 排程器.整回合序重排(inst, d.ids, bestToks, BOND);
    if (o && o.dmg > out.终) { out.终 = o.dmg; out.来源 = '+序重排'; }
    out.序重排ms = Date.now() - t6;
  }
  out.ms = Date.now() - t0;
  return out;
}

// ---- worker 模式（动态任务队列：worker 完工即向主线程要下一队，消除静态分配的长尾空转）----
if (!isMainThread && workerData && workerData.动态) {
  parentPort.on('message', (m) => {
    if (m.type === '任务') {
      const out = 评一队(m.d, workerData.width, workerData.R, workerData.评分);
      parentPort.postMessage({ type: '结果', 队: m.d.队, ids: m.d.ids, recommend: m.d.recommend, ...out });
      parentPort.postMessage({ type: '要活' });
    } else if (m.type === '收工') {
      parentPort.postMessage({ type: 'done' });
      // ⚠ 僵尸修复（2026-09-24 实测：汇总已打印但主进程永不退出）：收工后 parentPort 的 listener
      //   仍 ref 住事件循环 → worker 线程不退 → 主线程永不退。close() 解除引用后线程自然结束。
      parentPort.close();
    }
  });
  parentPort.postMessage({ type: '要活' });   // 启动即领第一队
} else if (isMainThread) {
  const N = Number(process.argv[2]) || 8;
  const width = Number(process.argv[3]) || 10;
  const R = Number(process.argv[4]) || 4;
  const 评分 = process.argv[5] || 'sync';
  const 线程 = Number(process.env.BENCH_THREADS) || 24;
  console.log(`内层benchmark: N=${N} width=${width} R=${R} 评分=${评分} 线程=${线程}\n`);
  const 队 = 选队(N);
  console.log(`选队完成 ${队.length} 支（bit级复现）`);

  const fmtPct = (a, b) => (a / b * 100).toFixed(2) + '%';
  const 结果 = [];
  const 收尾 = () => {
    const 前瞻率 = 结果.map(r => r.前瞻 / r.recommend);
    const 束率 = 结果.map(r => r.束 / r.recommend);
    const 爬率 = 结果.map(r => r.束爬 / r.recommend);
    const 终率 = 结果.map(r => r.终 / r.recommend);
    const 均 = a => (a.reduce((s, v) => s + v, 0) / a.length * 100).toFixed(1);
    console.log('\n=============== 汇总 ===============');
    console.log(`先验前瞻: 平均${均(前瞻率)}%`);
    console.log(`MC束搜索: 平均${均(束率)}%`);
    console.log(`束+爬山:  平均${均(爬率)}% 最低${(Math.min(...爬率) * 100).toFixed(1)}%`);
    console.log(`+兜底终:  平均${均(终率)}% 最低${(Math.min(...终率) * 100).toFixed(1)}% ≥99.9%: ${终率.filter(x => x >= 0.999).length}/${终率.length} =100%: ${终率.filter(x => x >= 1).length}/${终率.length}`);
    console.log(`总耗时 ${(结果.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(0)}s(串)`);
    // ---- 分段耗时归因（纯输出，零行为变化：这些 ms 字段 评一队 早已逐段计时，此前汇总未用）----
    //   目的：定量回答"哪段最贵、哪段对哪些队零增益"，为"按机制特征裁剪冗余段"提供数据支撑（不臆断）。
    const 段表 = [['前瞻ms', '前瞻贪心'], ['束ms', '束搜索'], ['爬ms', '束后爬山'], ['兜底ms', '相位兜底'], ['节拍ms', '节拍兜底'], ['窗对齐ms', '窗对齐'], ['序重排ms', '序重排']];
    const 段和 = 段表.map(([k]) => 结果.reduce((s, r) => s + (r[k] || 0), 0));
    const 段总 = 段和.reduce((a, b) => a + b, 0) || 1;
    console.log('--- 分段耗时(串) 及占比 ---');
    段表.forEach(([, nm], i) => { if (段和[i] > 0) console.log(`  ${nm}: ${(段和[i] / 1000).toFixed(0)}s (${(段和[i] / 段总 * 100).toFixed(1)}%)`); });
    // ---- 最优解来源分布：来源='束+爬'/'束' 表示兜底四段对该队零增益（白烧）；'+X' 表示该段贡献了最终增益 ----
    const 来源计 = {};
    for (const r of 结果) 来源计[r.来源 || '?'] = (来源计[r.来源 || '?'] || 0) + 1;
    console.log('--- 最优解来源分布（判断哪些兜底段真被用到）---');
    Object.entries(来源计).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}队`));
    const 兜底有增益 = 结果.filter(r => r.来源 && r.来源.startsWith('+')).length;
    console.log(`  ⇒ 兜底链(相位/节拍/窗/序重排)真正贡献增益: ${兜底有增益}队，其余 ${结果.length - 兜底有增益}队 兜底段零增益`);
    // ---- 前瞻已达标队：束/爬/兜底对其全零增益（⚠️靠 DB 真值判定，生产链路无真值不可直接早停）----
    const 前瞻达 = 结果.filter(r => r.前瞻 >= r.recommend).length;
    console.log(`--- 前瞻贪心即≥DB真值(束爬兜底全白烧，仅benchmark可判): ${前瞻达}队 ---`);
  };

  if (线程 > 1) {
    // 动态任务队列：主线程持有 待办，worker 每次完工发“要活”领取下一队；难队自然被空闲 worker 接手，无长尾空转。
    const 待办 = 队.slice();
    // 来源=最终最优解由哪段产出；分段ms=逐队归因数据(_分析段可裁性.js 交叉用；纯打印零行为变化)
    const 打印 = (m) => console.log(`${m.队}[${m.ids}]: 前瞻${fmtPct(m.前瞻, m.recommend)} 束${fmtPct(m.束, m.recommend)}+爬${fmtPct(m.束爬, m.recommend)} 终${fmtPct(m.终, m.recommend)} 源=${m.来源 || '?'} ms[束${((m.束ms || 0) / 1000).toFixed(0)} 爬${((m.爬ms || 0) / 1000).toFixed(0)} 兜${((m.兜底ms || 0) / 1000).toFixed(0)} 节拍${((m.节拍ms || 0) / 1000).toFixed(0)} 窗${((m.窗对齐ms || 0) / 1000).toFixed(0)} 序${((m.序重排ms || 0) / 1000).toFixed(0)}] DB=${m.recommend.toLocaleString()}`);
    let 完工worker = 0;
    const workers = [];
    const 派发 = (w) => {
      if (待办.length) w.postMessage({ type: '任务', d: 待办.shift() });
      else w.postMessage({ type: '收工' });
    };
    const 开 = Math.min(线程, 队.length);
    for (let k = 0; k < 开; k++) {
      const w = new Worker(__filename, { workerData: { 动态: true, width, R, 评分 } });
      workers.push(w);
      w.on('message', m => {
        if (m.type === '要活') { 派发(w); return; }
        if (m.type === '结果') { 结果.push(m); 打印(m); return; }
        if (m.type === 'done') { if (++完工worker >= 开) { 收尾(); workers.forEach(x => { try { x.terminate(); } catch (e) {} }); } }
      });
      w.on('error', e => { console.error('worker错误', e); process.exit(1); });
    }
  } else {
        for (const d of 队) {
      const out = 评一队(d, width, R, 评分);
      结果.push({ 队: d.队, ids: d.ids, recommend: d.recommend, ...out });
      console.log(`${d.队}[${d.ids}]: 前瞻${fmtPct(out.前瞻, d.recommend)} 束${fmtPct(out.束, d.recommend)}+爬${fmtPct(out.束爬, d.recommend)} 终${fmtPct(out.终, d.recommend)} 源=${out.来源 || '?'} ms[束${((out.束ms || 0) / 1000).toFixed(0)} 爬${((out.爬ms || 0) / 1000).toFixed(0)} 兜${((out.兜底ms || 0) / 1000).toFixed(0)} 节拍${((out.节拍ms || 0) / 1000).toFixed(0)} 窗${((out.窗对齐ms || 0) / 1000).toFixed(0)} 序${((out.序重排ms || 0) / 1000).toFixed(0)}] DB=${d.recommend.toLocaleString()}`);
    }
    收尾();
  }
}
