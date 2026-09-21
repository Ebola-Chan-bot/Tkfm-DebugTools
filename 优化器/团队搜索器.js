'use strict';
/*
 * 团队搜索器（第 2+3 层编排：站位排列 × 名单球 × 排程深搜）
 *
 * 职责：给定"初始团队（5 角色+站位）+ 初始指令集 + 角色库"，在允许换人/换位的前提下，
 * 搜索 dmg13 最大化的 (名单, 站位, 排程) 全局最优解。
 *
 * 搜索结构（外层由粗到细，内层可判停）：
 *   第 3 层 名单球：以起点队为球心，半径 rt = 0,1,…,5 枚举"恰好换 rt 人"的全部名单。
 *     规范形：移除位置子集(升序) × 加入角色子集(库中升序，且不含在队角色) → 每个名单唯一枚举一次，
 *     天然无重复、零去重内存。rt=5 即覆盖 库内全部 C(m,5) → 名单层穷尽可判停。
 *     闸门：isValidComp(名单) 不过直接跳过（生存语义 S1 = 站点原生白名单）。
 *   第 2 层 站位：名单内 5! = 120 种站位排列全穷举（队长技在位 1；站位技能 po 随位置生效）→ 恒可判停。
 *     为省评估，采用两遍：先"粗评"（每站位只跑贪心基线）选 TopK 站位，再"深搜"（爬山）精修。
 *   第 1 层 排程：贪心基线 → 爬山（预算封顶）。编辑球迭代加深（排程层渐近完备）由主程序在
 *     "全局最优已锁定且用户仍要求继续加深"时对 Top1 团队按需驱动（编辑球层在 排程器 中，可复用）。
 *
 * 渐近完备性说明：
 *   - 名单层 rt→5 穷尽、站位层 120 穷尽、排程层在每个 (名单,站位) 上编辑球 r→∞ 穷尽
 *     ⇒ 三层全部穷尽即覆盖全部理论可能。排程层球心 = 该队贪心基线（每队唯一确定），保证同一排程
 *     只被一个球心覆盖一次（规范形），不产生跨球重复。
 *   - 实际运行时由预算/停止标志截断；主程序会如实报告"已完备的层"与"仍在加深的层"。
 *
 * 内存：O(当前爬山的评估缓存 + TopK 排行 + 半径计数器)，与运行时间无关（无 visited 大表）。
 */
const 排程器 = require('./排程器.js');
const 适配 = require('./引擎适配.js');
const 难例特征 = require('./难例特征.js');

// 角色静态数据查表（供 难例特征.同步画像 用）：懒加载缓存，id→原始角色对象
let _角色查表 = null;
function 取角色(id) {
  if (!_角色查表) {
    _角色查表 = new Map();
    for (const c of 适配.角色表()) if (c && c.id != null) _角色查表.set(c.id, c);
  }
  const c = _角色查表.get(id);
  // 查不到给中性兜底（buff型/cd13）：宁可判'中'不误判'易'跳过束精修
  return c || { role: 2, cd: 13, ultMag: 0, atkMag: 0 };
}

// 把 [id0..id4] 的全部 120 种站位排列枚举出来（生成器，字典序）。arr 会先排序保证规范序。
function* 排列升序(arr) {
  const a = arr.slice().sort((x, y) => x - y);
  const n = a.length;
  const used = new Array(n).fill(false);
  const cur = [];
  function* rec() {
    if (cur.length === n) { yield cur.slice(); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(a[i]);
      yield* rec();
      cur.pop(); used[i] = false;
    }
  }
  yield* rec();
}

// 名单规范键：id 升序（换人只看集合，站位在外层单独穷举，故键用无序集合避免重复）
function 名单键(ids) { return ids.slice().sort((a, b) => a - b).join(','); }

/*
 * 对一个名单做"站位粗评 + TopK 深搜"，返回该名单的最优 {ids(含站位), toks, dmg, 站位评估数}。
 *   粗评：120 站位各跑贪心基线（~5.5ms×120≈0.7s/名单），选伤害 Top K站位；
 *   深搜：对 Top K站位 各跑爬山（预算/站位），取最优。
 *   种子接种：若提供 种子提供器(名单ids)→起点列表，则把种子的(站位,toks)作为高质量候选
 *     直接并入站位候选池参与排序与深搜——实验证明近最优起点上爬山/编辑球能秒级命中库内最优。
 * startToks: 仅当某站位与"用户起点站位"完全相同时，用用户起点指令作爬山起点。
 */
function 优化一个名单(inst, ids0, 库, startToks, K站位, 爬山预算, stopFlag, onProgress, 种子提供器, 束配置, onBest) {
  const 站位候选 = []; // {ids, toks, dmg, 来源}
  let 粗评数 = 0;

  // (0) 种子接种：把库内已验证队伍的高质量(站位,排程)作为候选直接注入
  if (种子提供器) {
    const 起点们 = 种子提供器(ids0) || [];
    for (const sd of 起点们) {
      if (stopFlag && stopFlag()) break;
      // 种子可能带自己的站位（精确-原位）或需迁移到默认站位；站位由 sd.站位 指定，否则用 ids0
      const 站位 = sd.站位 || ids0;
      if (!适配.isValidComp(站位)) continue;
      const dmg = 排程器.重放(inst, 站位, sd.toks, [5,5,5,5,5]);
      if (dmg > 0) 站位候选.push({ ids: 站位.slice(), toks: sd.toks, dmg, 来源: '种子:' + sd.来源 });
    }
  }

  // (1) 贪心粗评：120 站位
  for (const perm of 排列升序(ids0)) {
    if (stopFlag && stopFlag()) break;
    if (!适配.isValidComp(perm)) continue; // S1 生存闸门（按站位：队长技依赖位 1）
    const g = 排程器.贪心基线(inst, perm, [5,5,5,5,5], stopFlag);
    粗评数++;
    if (onProgress) onProgress(1); // 粗评本身也是一次完整评估，计入"已搜索数目"并给主程序心跳计时点
    if (!g || !g.toks || g.toks.length < 65) continue;
    站位候选.push({ ids: perm, toks: g.toks, dmg: g.dmg, 来源: '贪心' });
  }
  if (站位候选.length === 0) return null;
  站位候选.sort((a, b) => b.dmg - a.dmg);
  const top = 站位候选.slice(0, K站位);
  let best = null;
  let 深评 = 0;
  // 逐站位上报回调：让主程序在爬山/束精修的数十秒阶段内也能在心跳里展示"当前最优"
  //（否则单名单深搜期间 onResult 一次都不触发，心跳全程显示 最优=0）。
  const 上报 = (b) => { if (onBest && b && b.dmg > 0) onBest({ ids: b.ids, toks: b.toks, dmg: b.dmg, 来源: b.来源 }); };
  上报(站位候选[0]); // 先报贪心粗评头部站位作最初基线（约 1s 内即可见）
  // sync 束精修（可选）：只对深搜 Top-N 站位启用，每站位 ~25-35s，成本远高于爬山，故 N站位置小。
  //   束搜索内部数千次 rollout 是构造式评估、非"候选重放"，不计入评估预算（否则瞬间吃光预算），
  //   但受 stopFlag 与自身 时限秒 封顶，可被 Ctrl+C/预算打断。
  const 束N = 束配置 ? (束配置.N站位 == null ? 1 : 束配置.N站位) : 0;
  // 难例特征闸门：'易'(buff富余)名单跳过束精修省时。起点队豁免（用户明确要优化的队伍必精修）。
  //   _originKey 由 搜索() 注入（=名单键(起点.ids)）；直接外部调用 优化一个名单 时无此键 → 不豁免（保守：仍走闸门）。
  const 束闸门 = !!(束配置 && 束配置.闸门 === true);
  let 闸门跳过数 = 0;
  const 是起点队 = 束配置 && 束配置._originKey != null && 名单键(ids0) === 束配置._originKey;
  const 画像 = 束闸门 && !是起点队 ? 难例特征.同步画像(ids0, 取角色) : null;
  for (let ti = 0; ti < top.length; ti++) {
    const c = top[ti];
    if (stopFlag && stopFlag()) break;
    // 若该站位恰为起点队站位，爬山从用户起点指令开始（更优起点）；否则从该候选（种子或贪心）起点开始
    let 起 = c.toks;
    if (startToks && 名单键(c.ids) === 名单键(ids0) && 同站位(c.ids, ids0)) 起 = startToks;
    const r = 排程器.爬山(inst, c.ids, 起, [5,5,5,5,5], 爬山预算, stopFlag, onProgress);
    深评 += r.评估;
    let 站位最优 = { toks: r.toks, dmg: r.dmg, 来源: c.来源 };
    上报({ ids: c.ids, toks: r.toks, dmg: r.dmg, 来源: c.来源 }); // 爬山完成即报（束精修还要数十秒，不能等）
    // 束精修：对前 束N 个站位叠加 sync 束搜索+再爬山，取更优（束搜索给强起点，爬山收尾）
    //   闸门（束配置.闸门 === true 才生效，默认关）：静态同步画像分级'易'的名单跳过束精修。
    //   依据：'易'=buff富余队（딜伤害궁≤1 且密度≤0.6），sync 填充下爬山已能达最优（8队benchmark
    //   '易'队全部 100%）；外层海量名单搜索时跳过可省下 ~30-60s×Top站位×名单数 的巨量时间。
    //   风险边界：静态特征无法在难例内部分级，'中'队（如후지카变体）不豁免也不跳过（仍精修），
    //   故闸门只在 rtMax≥1 的海量场景推荐开启；单团队 rtMax=0 时由调用方自动禁用（见 搜索()）。
    const 闸门跳过 = 束闸门 && 画像 && 画像.分级 === '易';
    if (闸门跳过) { 闸门跳过数++; }
    else if (ti < 束N && !(stopFlag && stopFlag())) {
      const b = 排程器.束搜索(inst, c.ids, [5,5,5,5,5], {
        width: 束配置.width || 10, R: 束配置.R || 4, 评分: 束配置.评分 || 'sync',
        时限秒: 束配置.时限秒 || 60, stopFlag,
      });
      if (b && b.dmg > 0) {
        const bh = 排程器.爬山(inst, c.ids, b.toks, [5,5,5,5,5], 爬山预算, stopFlag, onProgress);
        深评 += bh ? bh.评估 : 0;
        const 束终 = (bh && bh.dmg > b.dmg) ? bh : b;
        if (束终.dmg > 站位最优.dmg) 站位最优 = { toks: 束终.toks, dmg: 束终.dmg, 来源: c.来源 + '+束' };
      }
    }
    if (站位最优.dmg > 0 && (best === null || 站位最优.dmg > best.dmg)) {
      best = { ids: c.ids, toks: 站位最优.toks, dmg: 站位最优.dmg, 来源: 站位最优.来源 };
      上报(best); // 束精修后刷新即报
    }
  }
  if (best === null && 站位候选[0]) best = 站位候选[0];
  return best ? { ...best, 粗评数, 深评数: 深评, 闸门跳过数, 分级: 画像 ? 画像.分级 : undefined } : null;
}

function 同站位(a, b) { for (let i = 0; i < 5; i++) if (a[i] !== b[i]) return false; return true; }

/*
 * 主搜索：名单球迭代加深 × 站位 × 排程。
 * 参数：
 *   inst 引擎实例；起点 {ids, toks}（起点站位+起点指令集，均已过 isValidComp）；
 *   库 = 角色 id 数组（用户已拥有、可模拟的 SSR）；
 *   选项 {rtMax=5, K站位=5, 爬山预算=2000, 预算=∞, stopFlag, onResult, onProgress}。
 * 行为：
 *   - onResult(全局最优快照) 在刷新最优时回调（供主程序心跳展示）；
 *   - 返回 {最优:{ids,toks,dmg}, 统计:{名单数,评估数,当前rt,名单层完备}}。
 * 名单球半径 rt：0=不换人；1=换1人；…；5=名单层穷尽（覆盖全部 C(|库|,5)）。
 */
function 搜索(inst, 起点, 库, 选项) {
  选项 = 选项 || {};
  const rtMax = 选项.rtMax == null ? 5 : 选项.rtMax;
  const K站位 = 选项.K站位 == null ? 5 : 选项.K站位;
  const 爬山预算 = 选项.爬山预算 == null ? 2000 : 选项.爬山预算;
  const 预算 = 选项.预算 == null ? Infinity : 选项.预算;
  // 可选：{N站位, width, R, 时限秒, 闸门}，对名单深搜 Top-N 站位启用 sync 束精修（默认关，成本 ~25-35s/站位）。
  //   闸门=true：用难例特征分级把'易'(buff富余)名单挡在束精修之外（海量名单省时）。
  //   单团队模式(rtMax=0)自动禁用闸门——端到端验收中후지카(易队)靠束精修才达 100% bit级，
  //   单团队彻底优化时每分算力都该花，闸门只该在外层名单海量时起筛子作用。
  let 束配置 = 选项.束配置 || null;
  if (束配置 && rtMax === 0) 束配置 = { ...束配置, 闸门: false };
  if (束配置 && 束配置.闸门 === true) 束配置 = { ...束配置, _originKey: 名单键(起点.ids) }; // 起点队闸门豁免键
  const 种子提供器 = 选项.种子提供器 || null;
  const stopFlag = 选项.stopFlag || (() => false);
  const onResult = 选项.onResult || (() => {});
  const onProgress = 选项.onProgress || (() => {});

  const 库集 = new Set(库);
  let 全局最优 = null;
  let 名单数 = 0, 评估数 = 0;
  let 闸门跳过数 = 0;      // 被'易'闸门拦下束精修的站位总数（观测闸门效果）
  let rt已完备 = -1; // 已穷尽的名单位半径

  const 考虑名单 = (ids) => {
    名单数++;
    const r = 优化一个名单(inst, ids, 库集, 起点.toks, K站位, 爬山预算,
      () => stopFlag() || 评估数 >= 预算,
      // 转发进度：n=增量评估数；名单数一并带出，供主程序心跳实时展示"已探名单数"（不再只在结束时回填）
      (n) => { 评估数 += n; onProgress(n, 名单数); },
      种子提供器, 束配置,
      // 逐站位上报：刷新全局最优即回报（worker → 主程序心跳实时展示"当前最优"，不用等整个名单算完）
      (b) => { if (b.dmg > 0 && (全局最优 === null || b.dmg > 全局最优.dmg)) { 全局最优 = b; onResult({ ...b }); } });
    if (r) 闸门跳过数 += (r.闸门跳过数 || 0);
    if (r && r.dmg > 0 && (全局最优 === null || r.dmg > 全局最优.dmg)) {
      全局最优 = r;
      onResult({ ...r }); // 刷新即回报（心跳展示当前最优）
    }
  };

  // 起点队半径 0 先行（含用户起点指令的爬山）
  考虑名单(起点.ids);

  let 被打断 = false, 自然穷尽 = false;
  outer:
  for (let rt = 1; rt <= rtMax; rt++) {
    if (stopFlag() || 评估数 >= 预算) { 被打断 = true; break; }
    // 恰好换 rt 人：移除 rt 个位置(升序子集) × 从"库\起点队"升序加入 rt 个
    const 移 = Array.from({ length: 5 }, (_, i) => i);
    const 候选池 = 库.filter(id => !起点.ids.includes(id)).slice().sort((a, b) => a - b);
    if (候选池.length < rt) { 自然穷尽 = true; break; } // 可换角色已耗尽：全部 C(m,5) 名单已枚举 → 名单层完备
    for (const 移除集 of 子集升序(移, rt)) {
      if (stopFlag() || 评估数 >= 预算) { 被打断 = true; break outer; }
      const 移除位 = new Set(移除集);
      const 保留 = 起点.ids.filter((_, i) => !移除位.has(i));
      for (const 加入集 of 子集升序(候选池, rt)) {
        if (stopFlag() || 评估数 >= 预算) { 被打断 = true; break outer; }
        const ids = 保留.concat(加入集);
        if (ids.length !== 5) continue;
        考虑名单(ids);
      }
    }
    rt已完备 = rt; // 该半径全部名单已穷尽
  }

  // 名单层完备判据（此前误用 rt已完备>=min(rtMax,5) 导致自然穷尽被误判为不完备）：
  //   被打断 → 不完备；
  //   可换角色耗尽(自然穷尽) → 全部 C(m,5) 已枚举 → 完备；
  //   rt 跑到 rtMax 上界且未被打断 → 已覆盖到 rtMax，仅 rtMax>=5 时才是全空间完备。
  const 名单已穷尽 = (!被打断) && (自然穷尽 || rtMax >= 5);
  // 范围内完备：rt 循环自然跑完（未按停止/预算/时间打断）。rtMax=0 时换人循环空转、起点名单已搜完，
  //   属"完成指定半径内全部名单"（≠覆盖全部理论名单，故与 名单已穷尽 分开）。终止原因据此区分
  //   "自然算完 rtMax 范围" vs "被打断"，避免 rtMax=0 被误报成"被打断(未穷尽)"。
  const 范围内完备 = !被打断;

  return {
    最优: 全局最优,
    统计: { 名单数, 评估数, rt已完备, 名单已穷尽, 范围内完备, 闸门跳过数 }
  };
}

// 工具：从数组升序取 k 个的全部子集（生成器，规范形去重的根基）
function* 子集升序(arr, k) {
  const n = arr.length;
  if (k > n || k <= 0) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map(i => arr[i]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

module.exports = { 搜索, 优化一个名单, 排列升序, 子集升序, 名单键 };
