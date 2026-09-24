'use strict';
/*
 * 排程器（第 1 层：给定"名单+站位"，搜索 65 步行动排程使 13 回合打桩伤害 dmg13 最大）
 *
 * 排程表示：toks = [{idx:0..4, act:'평'|'궁'|'방'} × 65]，即 13 回合 × 每回合 5 人各一次行动，
 *   token 顺序 = 行动顺序（回合内顺序对伤害有影响，实测 44% 的高伤队顺序敏感）。
 *
 * 评估：一律用引擎 fastReplay(ids, toks, bonds)（无快照整场重放，非法 token 返回 0），约 5.5ms/次。
 *   合法性由引擎裁决（CD 未满放궁 / 同回合重复行动 → 非法 → 0），排程器不自行推测 CD。
 *
 * 三个能力（由轻到重，主程序按预算组合调用）：
 *   1) 贪心基线：逐步读 engine legalActs，按"궁就绪即放 > 딜러평 > 其余방"优先级构造一条合法排程。
 *   2) 爬山（first-improving）：邻域 = 单 token 改动作 + 相邻 token 交换顺序；找到更优立即接受，预算封顶。
 *   3) 编辑球迭代加深（渐近完备）：以基线为球心，r=0,1,2… 枚举"恰好 r 处偏离"的全部排程，
 *      每层有限、可判该层穷尽；r→∞ 理论覆盖全空间（用于"时间无限→穷尽"的完备性承诺）。
 *
 * 所有函数接收已建好的 inst（多例引擎实例），不重复建实例，便于复用与并行。
 */

const 动作 = ['평', '궁', '방'];
const 序先验 = require('./序先验.js');   // 回合内딜러伤害궁出手序静态先验（DB 挖掘，见 序先验.js 文件头）
const 防守名单 = require('./防守名单.js');   // 剪枝A：按队构成禁用无防守机制角色的방分支（50名单캐+12授予者，实证见该文件头）

// 角色静态特征缓存（role 用于优先级），进程级，构建一次
function 建特征表() {
  const 适配 = require('./引擎适配.js');
  const 表 = new Map();
  for (const c of 适配.角色表()) {
    if (c && c.id != null) 表.set(c.id, { role: c.role, atkMag: c.atkMag || 0, ultMag: c.ultMag || 0, atk: c.atk || 0, cd: c.cd });
  }
  return 表;
}
const 特征 = 建特征表();

/*
 * 伤害궁（딜러궁）在 1e6 档内的先后分：只决定"同为就绪딜러伤害궁时谁先出手"，不改变档位（绝不越入 buff궁 2e6 档）。
 *
 * 为什么换掉旧规则：旧 tie-break 是 atk·ultMag/1000 降序，属拍脑袋代理。DB 实测（%TEMP%\序先验挖掘.js，
 *   58,234 条名单键去重后的已验证排程、149,264 个"同回合≥2딜러伤害궁"回合）：
 *     旧规则    序完全一致 25.4%、首位命中 31.1%、逆序对 59.3%（≈随机，0.5 为纯随机）
 *     序先验    序完全一致 72.3%、首位命中 79.5%、逆序对 14.2%
 *   ⇒ 同一档位下，序先验远胜旧规则。这是**软优先级**：只换同档内次序，不增删任何动作档位、不改搜索
 *   空间，渐近完备性完全不变；作用是让"更可能是优解的排程先被搜到"，提升受限时间/预算下的命中率。
 *
 * 为什么不像 设置.sync试排 那样失败：试排按"该回合即时伤害增量"选序，是逐前缀动态判据，会不均匀地抬高
 *   各前缀分数、破坏 beam 排序的一致性（实测 81.8%→78.1%）。序先验是**每个角色一个常数**，对所有前缀
 *   一致生效（一致偏差不改变相对排序），因此只提升填充续航的真实性而无排序副作用。
 *
 * 覆盖：121/123 伤害궁角色有序分（98.4%）；未覆盖的 63 个可模拟 SSR 几乎都是 buff궁角色（如풍오라 10060），
 *   不参与딜러궁排序。未覆盖者回落旧规则并置于档中位（1e6+4.5e5），既不被先验角色全面压制、也不僭越，
 *   另用旧规则做微幅 tie-break 保证确定性。
 *
 * @param {number} id 角色 id
 * @param {object} f  特征表条目（含 atk/ultMag，仅作回落用）
 * @returns {number} [1e6, 2e6) 内的分数
 */
function 伤害궁분(id, f) {
  const sat = 序先验.饱和(id);                      // ∈[0,1)，单调于 DB 强度分
  if (sat != null) return 1e6 + sat * 9e5;          // 严格 < 2e6（buff궁档），不越档
  const 旧분 = (f.atk * (f.ultMag > 0 ? f.ultMag : 1)) / 1000;   // 回落：旧规则
  return 1e6 + 4.5e5 + 旧분;                         // 档中位 + 旧规则微距（旧分实测 <1e3，不会越档）
}

/* ---------- 评估 ---------- */

// 重放一条排程，返回 dmg13（非法返回 0）。bondList 固定全 5。
function 重放(inst, ids, toks, bonds) {
  bonds = bonds || [5, 5, 5, 5, 5];
  return inst.increment.fastReplay(ids, toks, bonds, -1, null);
}

/* ---------- 1) 贪心基线 ---------- */

// 逐步构造合法排程。优先级：궁就绪(curCd<=0) > 딜러(role0)평 > 有atkMag的평 > 방。
// 每一步在所有"尚未行动"角色里选得分最高的 (i, act) 执行，天然决定回合内顺序。
// stopFlag: 可选，每步前查一次；置真则返回 null 让上层中止（主程序的墙钟/手动停止靠它传导进来）。
function 贪心基线(inst, ids, bonds, stopFlag) {
  bonds = bonds || [5, 5, 5, 5, 5];
  const ok = inst.increment.initBattle(ids, bonds, -1, null);
  if (!ok) return null;
  const toks = [];
  for (let s = 0; s < 65; s++) {
    if (stopFlag && stopFlag()) return null;
    let bestI = -1, bestAct = null, bestScore = -Infinity;
    for (let i = 0; i < 5; i++) {
      const acts = inst.increment.legalActs(i); // 已行动 → []
      if (acts.length === 0) continue;
      const f = 特征.get(ids[i]) || { role: 2, atkMag: 0, ultMag: 0, atk: 0 };
      for (const a of acts) {
        let score;
        if (a === '궁') score = 1e6 + (f.atk * (f.ultMag > 0 ? f.ultMag : 1)) / 1000; // 就绪궁几乎总是最优
        else if (a === '평') score = (f.role === 0 ? 500 : 100) + f.atkMag * f.atk / 1000;
        else score = 1; // 방 兜底
        if (score > bestScore) { bestScore = score; bestI = i; bestAct = a; }
      }
    }
    if (bestI < 0) break;
    if (!inst.increment.step(bestI, bestAct)) break; // 理论上不会发生（legalActs 已过滤）
    toks.push({ idx: bestI, act: bestAct });
  }
  return { toks, dmg: inst.increment.dmgSoFar() };
}

/* ---------- 1a) 先验贪心（用 DB 学到的规则排序，替代短视的原贪心） ---------- */

// 该角色 궁 是否直伤（ultMag 或 atkMag>0）；否则为 buff/辅助型 궁（铺增伤，本步 0 伤）
function 是伤害궁(f) { return (f.ultMag > 0 || f.atkMag > 0); }

/*
 * 先验贪心：把"特征挖掘 v2"从 120 支 DB 最优排程学到的铁律编码进每步打分。
 * 学到的规则（AUC 判别力从高到低）：
 *   1. buff궁(서포터/힐러等 ultMag==0 且 atkMag==0)必须先于伤害궁 —— 回合内顺序铁律(AUC0.842)。
 *      败因实测：贪心先放딜궁再放buff궁 → 딜궁吃不到增伤 buff，单발伤害腰斩(胜나미 t1 릴리엘자 191M→72M)。
 *   2. 딜궁/伤害궁就绪即放(强队 딜궁即放率97-100%, AUC0.806) —— 不无限憋。
 *   3. 딜러/辅助几乎不방(最优 방率2.5%/3.2%, AUC0.215反向) —— 방降到最低优先级(仅탱커略升)。
 *   4. buff궁按CD准时(延迟率0.22 vs 负0.45)。
 * 打分高于原贪心的差异点：原贪心 buff궁(ultMag=0) 与伤害궁 同档 1e6 按 atk 平手 → 常把딜궁排到 buff궁 前；
 *   先验贪心给 buff궁 单独更高档(2e6)，强制回合内 buff궁 先放，딜궁吃到满 buff。
 * 这是束搜索的"评分先验"基础件：beam 用它排序/剪枝，比短视的 dmgSoFar 抗欺骗性强得多。
 */
function 先验贪心(inst, ids, bonds, stopFlag) {
  bonds = bonds || [5, 5, 5, 5, 5];
  if (!inst.increment.initBattle(ids, bonds, -1, null)) return null;
  const toks = [];
  for (let s = 0; s < 65; s++) {
    if (stopFlag && stopFlag()) return null;
    let bestI = -1, bestAct = null, bestScore = -Infinity;
    for (let i = 0; i < 5; i++) {
      const acts = inst.increment.legalActs(i); // 已行动 → []
      if (acts.length === 0) continue;
      const f = 特征.get(ids[i]) || { role: 2, atkMag: 0, ultMag: 0, atk: 0, cd: 1 };
      for (const a of acts) {
        let score;
        if (a === '궁') {
          // buff궁(增伤铺垫) 最高优先，先于一切伤害궁，保证딜궁吃到 buff
          if (!是伤害궁(f)) score = 2e6 + f.atk / 1e6; // tie-break 微扰，稳定
          else score = 伤害궁분(ids[i], f); // 伤害궁就绪即放；同档内按 DB 挖掘的序先验排序（见 伤害궁분）
        } else if (a === '평') {
          score = (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000; // 딜러평优先
        } else { // 방
          score = (f.role === 2 ? 30 : 1); // 탱커略升，дил러/辅助降到垫底(符合学方率)
        }
        if (score > bestScore) { bestScore = score; bestI = i; bestAct = a; }
      }
    }
    if (bestI < 0) break;
    if (!inst.increment.step(bestI, bestAct)) break;
    toks.push({ idx: bestI, act: bestAct });
  }
  return { toks, dmg: inst.increment.dmgSoFar() };
}

/* ---------- 1a2) 先验前瞻贪心（rollout：先验规则补全整场做一步前瞻） ---------- */

/*
 * 为什么需要 lookahead：先验贪心只能表达"静态规则"（buff궁先放、就绪即放），但实测发现
 *   승나미 DB 解的核心机制是"딜궁延迟到 buff 层数叠满的回合齐射"（릴리엘자궁 t2放86M、
 *   t3放103M；얀코궁 t2放174M、t3放395M——晚放一轮伤害翻倍，因为 buff 在叠层）。
 *   这种收益取决于引擎内部状态（层数），静态先验看不见，只有"补全整场评估总伤"能看见。
 *
 * 做法（经典 rollout / 一步前瞻，AlphaGo-lite 式）：每个决策步 s，枚举当前全部合法动作；
 *   对每个候选用"先验规则补全剩余步"跑完整场 → 整场总伤 → 选最大的候选执行。
 *   补全用先验规则（与 先验贪心 同一套打分），保证 rollout 轨迹接近真实好解的后半程。
 *
 * 状态管理：决策链走 inc.step（带快照），候选评估走"step + 原语填充 + undo"——原语填充
 *   不压栈，undo 恰好弹出候选 step 的快照，栈始终平衡；主推进只用 step，不碰 initBattle。
 *
 * 成本：每候选 ≈ (65-s) 次原语 ≈ 1.5-3ms；每步 ≤15 候选 → 全程 ≈ 65×10×2.5ms ≈ 2s/场。
 *
 * @param {object} 设置 {stopFlag, onProgress(n)}
 * @returns {{toks, dmg, ms, 前瞻次数}|null}
 */
function 先验前瞻贪心(inst, ids, bonds, 设置) {
  bonds = bonds || [5, 5, 5, 5, 5];
  设置 = 设置 || {};
  const stopFlag = 设置.stopFlag || (() => false);
  const onProgress = 设置.onProgress || (() => {});
  const t0 = Date.now();
  // 剪枝A：按队构成禁用无防守机制角色的방分支（设置.禁防守剪枝=false 可完全关闭，恢复全방枚举）
  const 禁用防守 = (设置.禁防守剪枝 !== false) ? 防守名单.计算禁用防守(ids) : [false, false, false, false, false];
  const inc = inst.increment;
  if (!inc.initBattle(ids, bonds, -1, null)) return null;
  const comp = inst.internals.comp;

  // 先验规则打分（离线，不碰引擎）：buff궁 > 딜궁 > 딜러평 > 탱방 > 기타평 > 방
  function 先验分(i, act) {
    const f = 特征.get(ids[i]) || { role: 2, atkMag: 0, ultMag: 0, atk: 0 };
    if (act === '궁') return 是伤害궁(f) ? 伤害궁분(ids[i], f) : 2e6 + f.atk / 1e6;
    if (act === '평') return (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
    return f.role === 2 ? 30 : 1; // 방：탱커略升，딜러/辅助垫底
  }
  // 先验规则填充：当前 comp 状态下按打分执行到终/无合法动作，全走原语（无快照）
  function 规则填充(原) {
    for (let guard = 0; guard < 65; guard++) {
      let bI = -1, bA = null, bS = -Infinity;
      for (let i = 0; i < 5; i++) {
        const c = comp[i];
        if (!c || c.isActed) continue;
        // 평/방 恒合法，궁 需 CD 就绪（与 legalActs 同口径）
        const 평분 = 先验分(i, '평'); if (평분 > bS) { bS = 평분; bI = i; bA = '평'; }
        if (!禁用防守[i]) { const 방분 = 先验分(i, '방'); if (방분 > bS) { bS = 방분; bI = i; bA = '방'; } }   // 剪枝A：禁用槽位不选방
        if (c.curCd <= 0) { const 궁分 = 先验分(i, '궁'); if (궁分 > bS) { bS = 궁分; bI = i; bA = '궁'; } }
      }
      if (bI < 0) break;
      const ok = bA === '평' ? 原.do_atk(bI) : (bA === '궁' ? 原.do_ult(bI) : 原.do_def(bI));
      if (!ok) break;
    }
  }

  const toks = [];
  let 前瞻次数 = 0;
  for (let s = 0; s < 65; s++) {
    if (stopFlag()) return null;
    // 枚举当前合法动作（引擎真实状态，快照栈 = s 深度）；剪枝A：禁用槽位的방不入候选
    const 候选 = [];
    for (let i = 0; i < 5; i++) for (const a of inc.legalActs(i)) { if (禁用防守[i] && a === '방') continue; 候选.push({ idx: i, act: a }); }
    if (!候选.length) break;
    let 最优候选 = null, 最优dmg = -1;
    for (const cand of 候选) {
      if (stopFlag()) return null;
      if (!inc.step(cand.idx, cand.act)) continue; // 压1层快照并执行候选
      const 原 = inc.原语();
      规则填充(原); // 原语补全（不压栈）
      const dmg = inc.dmgSoFar();
      inc.undo(); // 栈平衡：只弹出候选 step 那一层
      前瞻次数++; onProgress(1);
      if (dmg > 最优dmg) { 最优dmg = dmg; 最优候选 = cand; }
    }
    if (!最优候选) break;
    if (!inc.step(最优候选.idx, 最优候选.act)) break; // 正式推进决策链
    toks.push(最优候选);
  }
  return { toks, dmg: 重放(inst, ids, toks, bonds), ms: Date.now() - t0, 前瞻次数 };
}

/* ---------- 1b) 修复解码（让全空间可行的关键件） ---------- */

// 该步在引擎当前状态下是否可直接执行（角色未行动；放궁还须 CD 就绪）
function 可执行(c, act) {
  if (!c || c.isActed) return false;
  if (act === '궁') return c.curCd <= 0;
  return act === '평' || act === '방';
}

/*
 * 修复解码：任意 token 数组（哪怕随机乱写）→ 前向执行，遇到该步非法就地替换成合法动作，
 * 返回一条**必然合法**的排程及其伤害。
 *
 * 为什么要有它：直接生成 65-token 序列时，绝大多数是非法的（CD 未满放궁 / 该角色本回合已动），
 *   非法 → fastReplay 返回 0 → 局部搜索的邻域里几乎全是 0，改进信号消失，搜索彻底困死。
 *   修复解码把"稀疏可行域"映射成"全空间可行"，任何起点任何邻居都有真实伤害，梯度不再断裂。
 *   这正是调度文献里标准的**主动调度生成 / 优先规则解码**（Giffler–Thompson 1960 传统）：
 *   不直接搜动作序列，而是搜"优先规则/期望动作"，再由解码器落成可行排程。
 *
 * 性能：不走 saveCur 快照（比 increment.step 快约 5 倍），直接读 internals.comp 判合法性 + 调 原语() 的 do_*。
 * 修复策略（最小惊讶原则，尽量保留原意图）：
 *   - 动作非法但该角色可动：궁 降级为 평（CD 未到，退回普攻）；
 *   - 角色不可动（本回合已行动/越界）：改由任一未行动角色执行，딜러(role0) 优先 평，其余取 평，最后 방 兜底。
 * @returns {{dmg:number, toks:Array, 修复次数:number}|null}  null = 无法完成（如含不可模拟角色）
 */
function 修复解码(inst, ids, toks, bonds) {
  bonds = bonds || [5, 5, 5, 5, 5];
  if (!inst.increment.initBattle(ids, bonds, -1, null)) return null;
  const comp = inst.internals.comp;
  const 原 = inst.increment.原语();
  const out = new Array(65);
  let 修复次数 = 0;
  for (let s = 0; s < 65; s++) {
    const 愿 = toks && toks[s] ? toks[s] : null;
    let idx = 愿 ? 愿.idx : -1, act = 愿 ? 愿.act : null;
    if (!可执行(comp[idx], act)) {
      修复次数++;
      if (idx >= 0 && idx < 5 && !comp[idx].isActed) {
        act = '평'; // 同角色降级
      } else {
        // 角色不可动：挑一个未行动的角色
        let 选中 = -1;
        for (let i = 0; i < 5; i++) {
          if (!comp[i] || comp[i].isActed) continue;
          const f = 特征.get(ids[i]) || { role: 2 };
          if (选中 < 0) 选中 = i;
          else if (f.role === 0) { 选中 = i; break; } // 딜러优先
        }
        if (选中 < 0) return null;
        idx = 选中;
        act = 可执行(comp[idx], '평') ? '평' : (可执行(comp[idx], '방') ? '방' : (可执行(comp[idx], '궁') ? '궁' : null));
        if (act === null) return null;
      }
    }
    let okRun = false;
    if (act === '평') okRun = 原.do_atk(idx);
    else if (act === '궁') okRun = 原.do_ult(idx);
    else okRun = 原.do_def(idx);
    if (!okRun) return null; // 理论不应发生（可执行已判定）
    out[s] = { idx, act };
  }
  return { dmg: inst.increment.dmgSoFar(), toks: out, 修复次数 };
}

/* ---------- 2) 爬山（first-improving + 可选相位邻域与谷底试探） ---------- */

// 邻域：① 单 token 改为另一合法动作；② 相邻两 token（不同 idx）交换顺序；
//   ③ 相位移动（궁@s1 ↔ 同角色后1~2回合非궁@s2 成对交换，仅谷底试探>0 时启用）。
// 默认谷底试探=0：纯 first-improving（旧行为），局部最优即返回，变差移动被彻底放弃。
// 谷底试探=K>0 时（诊断N/O/R/S + 验证P2/T 实证，用户定策 2026-09-23："优先搜变好的，变差的容后再搜而不是彻底放弃"）：
//   (a) 爬坡启用③相位移动上升邻域（队[4] 的目标移动属此类：92.53%→98.60% 无需跨谷）；
//   (b) 到达局部最优后，从两类【语义变差邻域】收集候选（类A 相位移动 ~23条/点 + 类B 涉궁相邻次序交换
//       ~21条/点），近平谷(|Δ|<0.1%)不入池，A/B 交替轮询、类内最不差优先，逐个试探：跨谷下降 → 谷底重爬
//       → 超过全局最优则采纳续搜（"容后再搜"而非彻底放弃）。
//       不用通用单token变差前沿（数百浅谷，−0.5~−7pp 语义深谷按最不差永远排不到 —— 验证P 失败实证）。
//   两类谷的实证（缺口分层：先相位 91→97、再次序 97→100）：
//     类A 相位谷（跨回合，t12궁→평 单步 −7.23pp，谷点 84.25% 重爬 97.29%；诊断R：类内最不差排名1/23）；
//     类B 次序谷（齐射回合内 궁出手次序，5발궁 120 次序景观中 97.29% 为局部最优第4名，
//       最优次序 99.98% 须两步相邻交换、中经 −0.55pp 变差态；验证T：4 个相邻交换邻居全部变差）。
//   谷底重爬带【禁忌】（已试点集合）：队[7] 实证谷底的"交换回出发点"恢复移动按扫描序(p=61)先于
//     通往 99.98% 的目标移动(p=62)，不禁忌则谷底重爬永远原路爬回、试探白费（P4：K=16 采纳恒为1）；
//     试探未采纳则回到全局最优继续下一轮（防漂移到更差盆地耗尽试探预算）。
//   选择策略为何是"A/B交替+类内最不差"：诊断U 池实测两头都不行——纯最不差优先会让浅次序谷(−0.01pp级)
//     抢占预算、把 −7.23pp 相位深谷挤到 #13 之后（K=8 全耗在重爬回原点的浅谷上）；纯类优先（全A后全B）
//     会让 97.29% 点剩余 22 个相位谷耗尽 K、永达不到次序谷层。交替轮询两头兼顾：粗结构第 1 次即试、
//     细结构每隔一个试。
//   实测（验证P2，K=2 已全收敛）：队[7] 91.48%→97.29%、队[4] 92.53%→98.60%、승나미 88.67%→98.16%、
//   후지카 93.65%→100%、신이카 97.01%→99.98%、칼리버 100% 不动（相位上升邻域对已最优队无副作用）。
//   试探预算 K 封顶"跨谷次数"（每次含谷底重爬，实测 ~1.2s/次），与总评估预算共同生效。
// 返回 { toks, dmg, 评估次数, 提升次数, 谷底试探数, 谷底采纳数 }。
// stopFlag(): 每次评估后调用，为真立即中止（让 Ctrl+C/--预算 有细粒度停止）。
// onProgress(n): 每评估 n 次转发给上层（主程序心跳的"已搜索数目"靠它累加）。
function 爬山(inst, ids, startToks, bonds, 预算, stopFlag, onProgress, 谷底试探) {
  bonds = bonds || [5, 5, 5, 5, 5];
  预算 = 预算 || 20000;
  stopFlag = stopFlag || (() => false);
  onProgress = onProgress || (() => {});
  谷底试探 = (谷底试探 == null) ? 0 : 谷底试探;
  const 用相位 = 谷底试探 > 0;   // K=0 → 完全旧 first-improving 行为（零扰动现存达标队）

  // 相位移动候选：궁@s1 ↔ 同角色后 1~2 回合的非궁@s2，成对交换动作（=궁相位后移）。
  //   诊断N/O/R 实证的难例正解移动形态：队[4] 是唯一上升移动、队[7] 是最不差谷(相位邻域排名1/23)；
  //   通用单token变差前沿有数百浅谷、−7pp 语义深谷永远排不到（验证P：队[7] K=8 采纳0）。
  function 相位候选(toks) {
    const 候 = [];
    for (let s1 = 0; s1 < 65; s1++) {
      if (toks[s1].act !== '궁') continue;
      const ii = toks[s1].idx, t1 = (s1 / 5) | 0;
      for (let s2 = s1 + 1; s2 < 65; s2++) {
        if (((s2 / 5) | 0) - t1 > 2) break;         // 只考虑后 2 回合内（相位微调）
        if (toks[s2].idx !== ii || toks[s2].act === '궁') continue;
        const 移 = toks.map(t => ({ idx: t.idx, act: t.act }));
        移[s1].act = toks[s2].act;                  // 原궁位改成 s2 动作（通常평）
        移[s2].act = '궁';                           // 궁后移到 s2
        候.push(移);
      }
    }
    return 候;
  }

  // first-improving 爬坡：邻域 ①单token改动作 ②相邻交换 ③相位移动（启用相位时）；返回新数组不动入参。
  // 禁忌（仅谷底重爬传入）：上升移动若落在 禁忌(toks键集合) 内则跳过——队[7] 实证：谷底(96.75%) 的
  //   "交换回出发点"恢复移动按扫描序(p=61) 先于通往 99.98% 的目标移动(p=62)，不禁忌则谷底重爬
  //   永远原路爬回、试探白费（P4 实测 K=16 采纳恒为 1）。
  function 爬坡(toks, dmg, 禁忌) {
    let cur = toks, curDmg = dmg;
    let 改进 = true;
    while (改进 && 评估 < 预算 && !stopFlag()) {
      改进 = false;
      // ① 单 token 改动作
      for (let p = 0; p < 65 && 评估 < 预算 && !stopFlag(); p++) {
        for (const a of 动作) {
          if (a === cur[p].act) continue;
          if (评估 >= 预算 || stopFlag()) break;
          // 独立新数组，避免引用赋值污染 cur
          const nb = cur.map(t => ({ idx: t.idx, act: t.act }));
          nb[p].act = a;
          评估++; onProgress(1);
          const d = 重放(inst, ids, nb, bonds);
          if (d > curDmg && !(禁忌 && 禁忌.has(toks键(nb)))) { cur = nb; curDmg = d; 提升++; 改进 = true; break; }
        }
        if (改进) break;
      }
      if (改进 || stopFlag() || 评估 >= 预算) continue;
      // ② 相邻交换（仅当 idx 不同才有意义）
      for (let p = 0; p < 64 && 评估 < 预算 && !stopFlag(); p++) {
        if (cur[p].idx === cur[p + 1].idx) continue;
        const nb = cur.map(t => ({ idx: t.idx, act: t.act }));
        const tmp = nb[p]; nb[p] = nb[p + 1]; nb[p + 1] = tmp;
        评估++; onProgress(1);
        const d = 重放(inst, ids, nb, bonds);
        if (d > curDmg && !(禁忌 && 禁忌.has(toks键(nb)))) { cur = nb; curDmg = d; 提升++; 改进 = true; break; }
      }
      if (改进 || stopFlag() || 评估 >= 预算 || !用相位) continue;
      // ③ 相位移动（궁后移成对交换，诊断R：队[4] 的目标移动属此类且为上升移动）
      for (const nb of 相位候选(cur)) {
        if (评估 >= 预算 || stopFlag()) break;
        评估++; onProgress(1);
        const d = 重放(inst, ids, nb, bonds);
        if (d > curDmg && !(禁忌 && 禁忌.has(toks键(nb)))) { cur = nb; curDmg = d; 提升++; 改进 = true; break; }
      }
    }
    return { toks: cur, dmg: curDmg };
  }

  let 评估 = 0, 提升 = 0, 试探数 = 0, 采纳数 = 0;
  let cur = startToks.map(t => ({ idx: t.idx, act: t.act }));
  let curDmg = 重放(inst, ids, cur, bonds);
  评估++; onProgress(1);
  let 全局 = { toks: cur, dmg: curDmg };
  if (谷底试探 <= 0) {
    const r = 爬坡(cur, curDmg);
    return { toks: r.toks, dmg: r.dmg, 评估, 提升, 谷底试探数: 0, 谷底采纳数: 0 };
  }
  const 已试 = new Set([toks键(cur)]);
  while (试探数 < 谷底试探 && 评估 < 预算 && !stopFlag()) {
    const r = 爬坡(cur, curDmg);
    cur = r.toks; curDmg = r.dmg;
    if (curDmg > 全局.dmg) 全局 = { toks: cur, dmg: curDmg };
    if (!已试.has(toks键(cur))) 已试.add(toks键(cur));
    // 收集当前局部最优点的两类变差【语义邻域】（上升移动已被爬坡①②③走光；已试点剔除）：
    //   类A 相位移动（궁跨回合后移，~23条/点）：궁释放时机=伤害主因，修复 91.48%→97.29% 那一层缺口（诊断R：
    //     目标谷类内"最不差"排名 1/23）；
    //   类B 궁次序交换（相邻交换中涉及궁者，~21条/点）：齐射回合内 buff 叠加顺序=次因，修复
    //     97.29%→99.98% 那一层（验证T：5발궁 120 次序景观中最优次序须两步相邻交换、中经 −0.54pp 谷）。
    //   不用通用变差前沿（数百浅谷，−0.5~−7pp 语义谷排不到 —— 验证P 失败实证）。
    // 近平谷阈值：|Δ|<0.1% 的变差候选重爬后大概率回当前局部最优（零信息、纯浪费试探预算）。
    //   诊断U 实证：91.48%/97.29% 点的变差池里各有 4/2 个近平谷全挤在最前 → 不入池。
    //   （跳过不违背"变差容后再搜"：这类谷重爬即回原点，不含任何未探索路径。）
    const A池 = [], B池 = [];
    const 近平线 = curDmg * 0.001;
    for (const nb of 相位候选(cur)) {
      if (评估 >= 预算 || stopFlag()) break;
      if (已试.has(toks键(nb))) continue;
      评估++; onProgress(1);
      const d = 重放(inst, ids, nb, bonds);
      // 三重过滤：① d>0 非法候选不入池（验证W 实证：승나미 98.16% 点的 31 条相位候选里 30 条非法
      //   ——궁后移出 CD 就绪窗口即非法；非法 toks 的谷底重爬 = 从废堆修复，纯浪费试探预算）；
      //   ② 近平谷(|Δ|<0.1%)不入池（重爬即回原点，零信息）；③ 已试点剔除。
      if (d > 0 && d <= curDmg - 近平线) A池.push({ toks: nb, dmg: d });
    }
    for (let p = 0; p < 64 && 评估 < 预算 && !stopFlag(); p++) {
      if (cur[p].idx === cur[p + 1].idx) continue;
      if (cur[p].act !== '궁' && cur[p + 1].act !== '궁') continue;   // 只收涉及궁的次序交换（buff层叠顺序敏感处）
      const nb = cur.map(t => ({ idx: t.idx, act: t.act }));
      const tmp = nb[p]; nb[p] = nb[p + 1]; nb[p + 1] = tmp;
      if (已试.has(toks键(nb))) continue;
      评估++; onProgress(1);
      const d = 重放(inst, ids, nb, bonds);
      if (d > 0 && d <= curDmg - 近平线) B池.push({ toks: nb, dmg: d });
    }
    // 类内最不差优先（确定性：伤害降序，同伤 toks键 tie-break）
    const 排序 = q => q.sort((x, y) => (y.dmg - x.dmg) || (toks键(x.toks) < toks键(y.toks) ? -1 : 1));
    排序(A池); 排序(B池);
    // A/B 轮转（试探序号奇偶交替，A 先行 = 粗结构相位优先；某类池空则跳到另一类）：
    //   诊断U 池实测两头都不行——纯最不差优先会让浅次序谷(−0.01pp级)抢占预算、把 −7.23pp 相位深谷
    //   挤到 #13 之后（K=8 全耗在重爬回原点的浅谷上）；纯类优先（队列恒取 A 头）会让 97.29% 点
    //   剩余 22 个相位谷耗尽 K、永达不到次序谷层。轮转：91.48% 点试探1=A类目标谷→97.29%；
    //   97.29% 点 A/B 交替，类B 目标谷（近平过滤后类内#3）在第 ~6 次试探即命中 → 99.98%。
    const 取B = (试探数 % 2 === 1);
    let 谷 = null;
    if (取B && B池.length) 谷 = B池[0];
    else if (!取B && A池.length) 谷 = A池[0];
    else 谷 = A池.length ? A池[0] : (B池.length ? B池[0] : null);
    if (!谷) break;
    已试.add(toks键(谷.toks));
    试探数++;
    cur = 谷.toks; curDmg = 谷.dmg;
    const r2 = 爬坡(cur, curDmg, 已试);   // 谷底重爬（禁忌=已试点：禁止"交换回出发点"的恢复移动——
    cur = r2.toks; curDmg = r2.dmg;       //   队[7] 97.29% 点实证：谷底(96.75%)的恢复交换 p=61 按扫描序先于
    if (curDmg > 全局.dmg) { 全局 = { toks: cur, dmg: curDmg }; 采纳数++; }   //   目标交换 p=62，不禁忌则原路爬回）
    else { cur = 全局.toks; curDmg = 全局.dmg; }   // 试探未采纳 → 回全局最优继续下轮（防漂移到差盆地耗试探）
    // 无论采纳与否都从当前点收集下一轮变差前沿（变差的容后再搜）
  }
  return { toks: 全局.toks, dmg: 全局.dmg, 评估, 提升, 谷底试探数: 试探数, 谷底采纳数: 采纳数 };
}

/* ---------- 3) 编辑球迭代加深（渐近完备） ---------- */

// 枚举"恰好与 base 偏离 r 处"的所有排程。规范形保证跨层无重复：
//   - 偏离位置取 65 选 r 的升序组合（每个组合唯一枚举一次）；
//   - 每个偏离位置只取"非基线动作"（2 选 1）→ 恰好 r 处真偏离，天然不与更小半径层重叠。
// 候选总数 = C(65,r) × 2^r，每层有限、可判穷尽；r = 0,1,2,… 递增，r→∞ 覆盖全部合法排程空间（渐近完备）。
// 每个候选调 onCandidate(toks, dmg)；计数达预算或 stopFlag() 为真即中止本层。
function 编辑球层(inst, ids, baseToks, bonds, r, onCandidate, 预算, stopFlag) {
  bonds = bonds || [5, 5, 5, 5, 5];
  预算 = (预算 == null) ? Infinity : 预算;
  let 计数 = 0;
  if (r === 0) {
    const d = 重放(inst, ids, baseToks, bonds);
    onCandidate(baseToks, d);
    return 1;
  }
  outer:
  for (const 组合 of 组合升序(65, r)) {
    // 每个偏离位置的 2 个非基线动作
    const 每位选项 = [];
    for (let k = 0; k < 组合.length; k++) 每位选项.push(动作.filter(a => a !== baseToks[组合[k]].act));
    for (const 赋值 of 笛卡尔积(每位选项)) {
      const toks = baseToks.map(t => ({ idx: t.idx, act: t.act }));
      for (let k = 0; k < 组合.length; k++) toks[组合[k]] = { idx: baseToks[组合[k]].idx, act: 赋值[k] };
      const d = 重放(inst, ids, toks, bonds);
      计数++;
      onCandidate(toks, d);
      if (计数 >= 预算 || (stopFlag && stopFlag())) break outer;
    }
  }
  return 计数;
}

// 工具：从 n 个位置升序取 r 个的全部组合（生成器，内存 O(r)）
function* 组合升序(n, r) {
  if (r > n || r <= 0) return;
  const idx = Array.from({ length: r }, (_, i) => i);
  while (true) {
    yield idx.slice();
    let i = r - 1;
    while (i >= 0 && idx[i] === n - r + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
  }
}

// 工具：多集笛卡尔积（迭代实现，返回"数组的数组"）。arrays = 每个位置的候选数组列表
function 笛卡尔积(arrays) {
  let acc = [[]];
  for (let k = 0; k < arrays.length; k++) {
    const next = [];
    for (const pre of acc) for (const v of arrays[k]) { const cp = pre.slice(); cp.push(v); next.push(cp); }
    acc = next;
  }
  return acc;
}

/* ---------- 4) 束搜索（内层 65 步排程树的构造式 beam search，rollout 评估） ---------- */

/*
 * 束搜索（beam search）：固定名单+站位，在 65 步排程树上逐层构造最优指令序。
 *
 * ⚠️ 设计教训（승나미/후지카 等实测，详见 session plan）：
 *   1) 纯 dmgSoFar 评估失败：w=30/100/300 都卡 36-37%，加宽无效——dmgSoFar 短视，在 buff
 *      未叠满的早期把"延迟궁到爆发回合"的正确路径整条剪掉（欺骗性景观）。
 *   2) 纯静态先验规则也只到 42-71%：DB 解的딜궁同步率仅 54%，"齐射"非普遍铁律；buff 层数
 *      与 buff 到期是引擎状态，静态规则读不到。
 *   3) 随机延迟填充（hybrid/mean/max）不可靠：승나미 p×R 网格 10 组，除 p=0.3R=4 抽签 82% 外
 *      全退回即放基线 62%——随机"憋/放"靠运气，不可复现。
 *   ⇒ 采用 **rollout 前瞻评估 + sync 定向填充**（AlphaGo-lite / 受限调度 rollout 标准做法）：
 *     候选前缀评分 = max(即放填充, sync对齐填充) 两路**确定性**估计。
 *
 * sync 定向填充（默认，本函数最优路径）：딜러的 伤害궁 只在"本回合已有 buff궁 出手"时才放，
 *   否则禁딜궁重选（改평 憋住）；buff궁(ultMag==0&&atkMag==0，含딜러role的buff型如메섹돌)永准点放。
 *   这是对 DB 实测结构的直译——승나미 DB 解 딜러궁 齐射(t3/t7/t10/t13)全部紧跟同回合 buff궁，
 *   无 buff 回合(t2/t5/t6)딜러全憋。确定性(无方差、无赢家诅咒)且比随机延迟快 2.2 倍。
 *   8队实测：束+爬山平均 94.0%、最低 85.9%、4/8 队 bit级=DB最优、总 293s（hybrid 为 93.3%/79.7%/639s）。
 *   兜底：딜러궁 最多憋 最大憋=3 个就绪窗口（防无 buff 队永憋），t>=11 无条件放（避免憋到战斗结束浪费）。
 *
 * hybrid/mean/max（随机延迟，保留作对照，设置.评分 切换）：第 1 次即放填充，其余 R-1 次按 延迟p
 *   随机把딜러伤害궁延后。hybrid=max(即放,延迟均值)，mean/max 分别为延迟的均值/最大。均已逊于 sync。
 *
 * 状态管理（性能+正确关键）：
 *   - beam 只存 toks 数组；引擎当前停在 cur（快照栈深度 == cur.length）。
 *   - moveTo(target)：undo 到公共前缀再 step 到 target，摊还每节点 ~2 次快照操作。
 *   - 评估子节点：在父状态下 [step(候选) → 快填(策略) → dmgSoFar → undo]，快填走原语不压栈，
 *     undo 恰弹 step 的 1 层，栈始终平衡。**全程不调 initBattle**（避免清栈破坏 moveTo）。
 *   - 快填按先验优先级：buff궁 > 딜궁 > 딜러평 > 탱방 > 기타평（与 先验贪心/特征挖掘 一致）。
 *
 * 成本：sync 每子节点 = 2×(65-s) 次原语（两路确定性）；w=10 约 25-35s/场。
 *
 * @param {object} 设置 {width=10, 早期宽度=width, 早期层数=0, 评分='sync'(默认)|'hybrid'|'mean'|'max', R=4, 延迟p=0.5, stopFlag, onProgress(n), 时限秒}
 * @returns {{toks, dmg, 扩展数, 深度, ms}|null}  dmg 为 fastReplay 终验值（权威口径）
 */
function 束搜索(inst, ids, bonds, 设置) {
  bonds = bonds || [5, 5, 5, 5, 5];
  设置 = 设置 || {};
  const width = 设置.width || 10;
  // 早宽后窄（变宽 beam）：注入诊断实锤误剪只发生在早期 s≈4-8，故前 早期层数 层用 早期宽度（默认=width），
  //   其余层回到 width。钱花在刀刃上：早期保住真优前缀，后期收窄省算力。
  const 早期宽度 = 设置.早期宽度 || width;
  const 早期层数 = 设置.早期层数 || 0;
  const R = Math.max(1, 设置.R || 4);                     // 每候选 rollout 次数（1=纯即放单策略；sync 评分下无用）
  const 延迟p = 设置.延迟p == null ? 0.5 : 设置.延迟p;      // 随机延迟填充时 딜러伤害궁 降级为평 的概率（sync 下无用）
  const 评分 = 设置.评分 || 'sync';                        // 'sync'=定向对齐填充(默认,确定性最快); hybrid/mean/max=随机延迟对照
  const sync试排 = 设置.sync试排 === true;                 // 回合内딜러궁全排列试排（实测线上负收益，默认关，见规则快填注释）
  // 只读诊断钩子（默认 null 零影响）：影子跟踪一条已知前缀（一般=DB 最优排程），逐层记其填充续航评分
  //   与在全部孩子里的排名，用于剖析“它在哪一层跌出 width 被剪、被剪时评分低估了多少”。不改变搜索行为。
  //   设置.诊断 = { 目标toks, 真值 }（真值=该前缀走完整 DB 后段的 dmg13，用于算低估率）。
  const 诊断 = 设置.诊断 || null;
  const 诊断报告 = 诊断 ? [] : null;
  const stopFlag = 设置.stopFlag || (() => false);
  const onProgress = 设置.onProgress || (() => {});
  const t0 = Date.now();
  const 时限 = 设置.时限秒 ? 设置.时限秒 * 1000 : Infinity;
  const 超时 = () => stopFlag() || (Date.now() - t0) > 时限;

  // 剪枝A：按队构成禁用无防守机制角色的방分支（设置.禁防守剪枝=false 可完全关闭，恢复全방枚举）
  const 禁用防守 = (设置.禁防守剪枝 !== false) ? 防守名单.计算禁用防守(ids) : [false, false, false, false, false];

  const inc = inst.increment;
  if (!inc.initBattle(ids, bonds, -1, null)) return null;
  // ⚠️ initBattle→start() 内部 `comp = []` 重新赋值数组，必须在其后才取 _comp 引用，否则野指针读到旧数组
  const _comp = inst.internals.comp;
  const _原 = inc.原语();

  // 先验优先级：从当前引擎状态选一个合法动作（buff궁 > 딜궁 > 딜러평 > 탱방 > 기타 평 > 기타 방）
  // 禁딜궁=true 时딜러의 伤害궁不参选（延迟填充用：模拟"这回合딜러憋궁改평"，让 buff궁 顶上）
  function 选规则动作(禁딜궁) {
    let bI = -1, bA = null, bS = -Infinity;
    for (let i = 0; i < 5; i++) {
      const c = _comp[i];
      if (!c || c.isActed) continue;
      const f = 特征.get(ids[i]) || { role: 2, atkMag: 0, ultMag: 0, atk: 0 };
      // 평（딜러高），방（仅탱커略升），궁（buff궁最高、딜궁次之，需CD就绪）
      const 평分 = (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
      if (평分 > bS) { bS = 평分; bI = i; bA = '평'; }
      if (!禁用防守[i]) {   // 剪枝A：禁用槽位不选방
        const 방분 = (f.role === 2 ? 30 : 1);
        if (방분 > bS) { bS = 방분; bI = i; bA = '방'; }
      }
      if (c.curCd <= 0) {
        const 伤害궁 = (f.ultMag > 0 || f.atkMag > 0);
        // ⚠️ role 无关（2026-09-22 修复）：禁딜궁 重选必须排除**一切伤害궁**，不限 role===0。
        //   引擎事实：getUltDmg/getAtkDmg 只用 atk/ultMag/li 通道，与 role 完全无关；旧限制导致
        //   탱커/디버퍼的伤害궁在"憋궁重选"里依旧胜出（궁分 1e6+ ≫ 평分 100+ ＞ 방분 30），憋궁形同虚设。
        if (禁딜궁 && 伤害궁) continue;
        // 伤害궁同档内按 DB 挖掘的序先验（首位命中 31%→79.5%）；buff궁仍 2e6 档优先于一切딜궁
        const 궁分 = 伤害궁 ? 伤害궁분(ids[i], f) : 2e6 + f.atk / 1e6;   // ⚠️变量名用中文"分"(U+5206)，与下两行一致，勿写成韩文분(U+BD84)同形字
        if (궁分 > bS) { bS = 궁分; bI = i; bA = '궁'; }
      }
    }
    return bI < 0 ? null : { i: bI, a: bA };
  }
  // 规则快填：从当前引擎状态按先验补全到 65 步（原语执行，不压栈、不碰快照），返回整场 dmgSoFar。
  // 填充模式：
  //   'rand'（默认）：딜러伤害궁以 延迟확률 概率改走"禁딜궁"重选（本回合딜러憋궁改평），随机模拟延迟爆发。
  //     ⚠️ 승나미网格实证：随机延迟靠抽签运气——p=0.3~1.0×R=1/4 除 p=0.3R=4(82%) 外全退回即放基线62%，不可靠。
  //   'sync'（定向）：딜러伤害궁仅在"本回合已有 buff궁 出手"时才放，否则禁딜궁重选（憋改평），
  //     精确复现 DB 的"딜러궁对齐 buff 서포터回合齐射"结构（승나미 t2/t5/t6憋딜러、t3/t7/t10/t13齐射）。
  //     确定性（无随机、无方差），评分稳定可复现。buff궁(ultMag==0&&atkMag==0，含딜러role的buff型如메섹돌)永准点放。
  //     兜底：딜러궁最多憋 最大憋 个就绪窗口（防无buff队永久憋），t>=11 无条件放（避免憋到战斗结束浪费）。
  //     **试排增强**（设置.sync试排=true 启用，**默认关**）：딜러궁互相给队友上 buff，回合内出手顺序按
  //     全排列试放（≤3人≤6序，step/undo 栈平衡）的"整序即时伤害增量"选最优序。=4人退化 greedy 逐个试排。
  //     ⚠️ 实测教训（승나미 w=10 确定性对照）：离线续航 62.8%→77.2%（t7 顺序恰中 DB），但线上束搜索
  //     **81.84%→78.1% 反而变差、耗时 +70%**。根因：①试排以"该回合即时增量"为准则，贪心把궁花在当回合，
  //     破坏 DB 的"딜러궁 CD 对齐 t13 终局三连爆"远程节奏；②评分的**相对排序一致性比绝对精度更重要**——
  //     固定优先级 sync 对所有前缀一致地低估续航（一致偏差），相对排序恰好利于 DB 憋型路径；试排不均匀地
  //     抬高各前缀分数，破坏了原排序。故默认关，仅留作离线分析/未来改进（如试排准则换成"剩余全场续航"）。
  function 规则快填(已走步, 延迟확률, 模式, 前缀toks) {
    // ⚠️ 状态继承修复（2026-09-22，阶段5 评分器）：填充从 已走步 续走，本回合（已走步-1 所在回合）的
    //   前缀可能已打了 buff궁。旧版硬置 本回合buff=false → sync 填充误判"本轮无 buff"而把当回合딜러궁
    //   憋成평，续航暴跌（_诊断评分.js 实锤：승나미 s12 续航 27.73G→23.48G、DB 前缀排名 1→61 被剪，
    //   正是 t3 [位1평,位3궁,位2궁(buff),...] 后填充无视已铺 buff、憋掉后续딜궁）。
    //   修复：扫描前缀在本回合的部分，若已出现 buff궁(非伤害궁)出手则 本回合buff=true；
    //   当前回合 初值对齐 已走步-1 的回合号，避免首轮 t!==当前回合 误触发重置。
    let 当前回合 = 已走步 > 0 ? ((已走步 - 1) / 5) | 0 : -1;
    let 本回合buff = false;
    if (前缀toks && 模式 === 'sync') {
      for (let k = 当前回合 * 5; k < 已走步 && k < 前缀toks.length; k++) {
        const tk = 前缀toks[k];
        if (!tk || tk.act !== '궁') continue;
        const f = 特征.get(ids[tk.idx]);
        if (f && !(f.ultMag > 0 || f.atkMag > 0)) { 本回合buff = true; break; }   // buff궁(非伤害)已出手
      }
    }
    const 憋计数 = {};      // sync 专用：每个딜러궁已连续憋的就绪窗口数
    const 最大憋 = 3;
    let 试排队列 = null, 试排完成 = false;   // sync 试排：本回合딜러궁最优出手序（执行一个 shift 一个）
    // 伤害궁就绪（role 无关，与 憋궁判据/禁딜궁重选 同口径；旧名 딜伤궁就绪 曾限定 role===0）
    const 伤害궁就绪 = i => {
      const f = 特征.get(ids[i]);
      const c = _comp[i];
      return f && (f.ultMag > 0 || f.atkMag > 0) && c && !c.isActed && c.curCd <= 0;
    };
    // 全排列试放：对 list 的每种顺序整体执行（step/undo 平衡），返回"即时伤害增量"最大的序
    const 试排 = list => {
      const base = inc.dmgSoFar();
      let 最优序 = list.slice(), 最优增 = -Infinity;
      const 交换枚举 = a => {                      // ≤3 元素全排列（Heap 算法简化版：递归交换）
        const 结果 = [];
        const rec = (arr, k) => {
          if (k === arr.length) { 结果.push(arr.slice()); return; }
          for (let i = k; i < arr.length; i++) {
            [arr[k], arr[i]] = [arr[i], arr[k]];
            rec(arr, k + 1);
            [arr[k], arr[i]] = [arr[i], arr[k]];
          }
        };
        rec(a.slice(), 0);
        return 结果;
      };
      const 序列表 = list.length <= 3 ? 交换枚举(list) : null;
      if (序列表) {
        for (const 序 of 序列表) {
          let 步 = 0, okAll = true;
          for (const i of 序) {
            if (!伤害궁就绪(i)) { okAll = false; break; }
            if (!inc.step(i, '궁')) { okAll = false; break; }
            步++;
          }
          if (okAll) { const 增 = inc.dmgSoFar() - base; if (增 > 最优增) { 最优增 = 增; 最优序 = 序.slice(); } }
          for (let u = 0; u < 步; u++) inc.undo();
        }
      } else {                                       // =4 就绪딜러：greedy 逐个试排
        最优序 = [];
        const 剩 = list.slice();
        while (剩.length) {
          let bI = -1, b增 = -Infinity;
          for (const i of 剩) {
            if (!伤害궁就绪(i)) continue;
            const before = inc.dmgSoFar();
            if (!inc.step(i, '궁')) continue;
            const 增 = inc.dmgSoFar() - before;
            inc.undo();
            if (增 > b增) { b增 = 增; bI = i; }
          }
          if (bI < 0) { 最优序.push(剩[0]); 剩.shift(); }
          else { 最优序.push(bI); 剩.splice(剩.indexOf(bI), 1); }
        }
      }
      return 最优序;
    };
    for (let k = 已走步; k < 65; k++) {
      const t = (k / 5) | 0;
      if (t !== 当前回合) { 当前回合 = t; 本回合buff = false; 试排队列 = null; 试排完成 = false; }   // 换回合重置
      let sel;
      // 试排在队 → 本回合딜러궁按已测最优序执行（队首就绪才跟随，否则丢弃队列走常规）
      if (试排队列 && 试排队列.length && 伤害궁就绪(试排队列[0])) {
        sel = { i: 试排队列[0], a: '궁' };
      } else {
        if (试排队列 && 试排队列.length) 试排队列 = null;   // 队首失效（CD 变动等）→ 弃队列
        sel = 选规则动作(false);
        if (!sel) break;
        if (sel.a === '궁') {
          const f = 特征.get(ids[sel.i]) || {};
          const 是buff궁 = !(f.ultMag > 0 || f.atkMag > 0);
          if (是buff궁) {
            本回合buff = true;                    // buff 서포터의 궁 出手 → 本回合已铺 buff，딜러궁可跟放
          } else {                                // 伤害궁（⚠️ role 无关，2026-09-22 语义完备性修复）
            // 旧版限定 f.role===0：탱커/디버퍼的伤害궁（全库 41/184，탱18/디20/섶3）不参与憋궁，就绪即放。
            // 引擎事实：getUltDmg/getAtkDmg 只用 atk/ultMag/li 通道，与 role 无关 —— "伤害궁等 buff 才值得放"
            //   本就是 role 无关的物理事实，role 限制是 DB 挖掘样本恰好딜러主力的历史偶然，此处泛化为正确语义。
            // ⚠️ 但这**不是** 88% 缺口（如 10197,10152,10096,10193,10147）的解：实验I 实锤该队 buff궁与伤害궁
            //   同为 cd4 同相位就绪 → 填充里 buff궁(先验2e6)永远先放 → 本回合buff 恒 true → 憋궁判据从不触发
            //   → sync 填充逐位等价于即放填充，本次 role 泛化对其惰性（8 队 benchmark 达成率/扩展数逐位不变，
            //   即放那路 max 保底亦使其零回退）。88% 的真正根因是"伤害궁释放相位错配"：位4=10193(탱,cd4)被队友
            //   10197(每行动降1CD)催成每~3回合就绪，束从 t1 起就绪即放→궁锁死 t1/t4/t7/t10/t13 相位(4次孤立无buff释放)，
            //   DB 推迟首发到 t2→궁落 t2/t5/t9/t13(t5/t9/t13 正是 buff 齐射回合,3次吃满buff)，次数少反高 3.6G。
            //   相位规划超出 reactive 填充能力（需预知 buff 未来就绪回合），属评分器升级的独立课题。
            憋计数[sel.i] = 憋计数[sel.i] || 0;
            let 要憋 = false;
            if (模式 === 'sync') 要憋 = (!本回合buff && t < 11 && 憋计数[sel.i] < 最大憋);
            else if (延迟확률 > 0 && k < 64) 要憋 = (Math.random() < 延迟확률);
            if (要憋) {
              const alt = 选规则动作(true);        // 禁딜궁重选（딜러改평 / buff顶上）
              if (alt) { 憋计数[sel.i]++; sel = alt; }
            } else {
              憋计数[sel.i] = 0;                  // 放出딜러궁，清零憋计数
              // sync 试排（需显式开启）：首个放点触发，测出本回合全部就绪딜러伤害궁的最优出手序
              if (模式 === 'sync' && sync试排 && !试排完成) {
                const 就绪 = []; for (let i = 0; i < 5; i++) if (伤害궁就绪(i)) 就绪.push(i);
                试排队列 = 就绪.length >= 2 ? 试排(就绪) : 就绪.slice();
                试排完成 = true;
                if (试排队列.length) sel = { i: 试排队列[0], a: '궁' };
              }
            }
          }
        }
      }
      const ok = sel.a === '평' ? _原.do_atk(sel.i) : (sel.a === '궁' ? _原.do_ult(sel.i) : _原.do_def(sel.i));
      if (!ok) break;
      if (sel.a === '궁' && 试排队列 && 试排队列.length && 试排队列[0] === sel.i) 试排队列.shift();
    }
    return inc.dmgSoFar();
  }
  // 引擎状态对齐到目标 toks（快照栈路径，LIFO 平衡）
  let cur = [];
  function moveTo(target) {
    let L = 0;
    while (L < cur.length && L < target.length && cur[L].idx === target[L].idx && cur[L].act === target[L].act) L++;
    while (cur.length > L) { inc.undo(); cur.pop(); }
    while (cur.length < target.length) {
      const t = target[cur.length];
      if (!inc.step(t.idx, t.act)) throw new Error('束搜索: 非法步进 ' + t.idx + t.act + ' @深度' + cur.length);
      cur.push(t);
    }
  }

  let beam = [{ toks: [] }];
  let 扩展数 = 0, 深度 = 0, 被打断 = false;
  for (let s = 0; s < 65; s++) {
    const 孩子 = [];
    for (const 节点 of beam) {
      if (超时()) { 被打断 = true; break; }
      moveTo(节点.toks);                        // 引擎停在父前缀（栈深 s）
      const 合法 = [];
      for (let i = 0; i < 5; i++) for (const a of inc.legalActs(i)) { if (禁用防守[i] && a === '방') continue; 合法.push({ idx: i, act: a }); }   // 剪枝A：禁用槽位的방不入分支
      for (const cand of 合法) {
        if (超时()) { 被打断 = true; break; }
        // 候选评分（设置.评分）：
        //   'sync'（定向，推荐）：max(即放填充, sync对齐填充) 两路确定性——无随机、无方差、可复现，
        //     sync 精确表达"딜러궁对齐 buff 回合齐射"，解决随机延迟靠运气的问题（승나미网格实证）。
        //   'hybrid'（默认，随机）：max(即放, 延迟均值)，策略内均值消方差、策略间 max 保双峰。
        //   'mean'/'max'：随机延迟的均值/最大，作对照。
        let 评;
        if (评分 === 'sync') {
          // 前缀toks = 节点前缀(s) + 本候选(1)，长度 s+1 = 填充起点已走步；供 规则快填 继承"本回合已铺 buff"状态
          const 前缀toks = 节点.toks.concat([cand]);
          inc.step(cand.idx, cand.act);
          const d即 = 规则快填(s + 1, 0, 'rand');            // 即放填充（确定性基线）
          inc.undo();
          inc.step(cand.idx, cand.act);
          const d同 = 规则快填(s + 1, 0, 'sync', 前缀toks);   // sync 对齐填充（确定性；继承前缀 buff 状态）
          inc.undo();
          // 设置.纯sync评分（诊断开关，默认 false 保持 max 双路）：强制 评=d同 单路。
          //   用于判别 88% 缺口是"max(即放,同) 里即放主导、掩盖 sync 的正确延迟估值"（去掉 max 即恢复）
          //   还是"sync 填充本身也表达不了伤害궁相位规划"（去掉 max 仍 88%）。见 _实验J。
          评 = 设置.纯sync评分 === true ? d同 : Math.max(d即, d同);   // 两确定性估计取 max（无赢家诅咒，方差为0）
        } else {
          // MC 多策略 rollout：r=0 即放填充（确定性），r>=1 按 延迟p 延迟填充（随机）
          let 即放 = -1; const 延迟组 = [];
          for (let r = 0; r < R; r++) {
            if (!inc.step(cand.idx, cand.act)) break;         // 压 1 层，执行候选动作
            const d = 规则快填(s + 1, r === 0 ? 0 : 延迟p, 'rand');
            if (r === 0) 即放 = d; else 延迟组.push(d);
            inc.undo();                                       // 弹回父前缀（栈平衡）
          }
          评 = 即放;
          if (延迟组.length) {
            const 和 = 延迟组.reduce((a, b) => a + b, 0);
            if (评分 === 'mean') 评 = (即放 + 和) / (1 + 延迟组.length);
            else if (评分 === 'max') 评 = Math.max(即放, ...延迟组);
            else 评 = Math.max(即放, 和 / 延迟组.length);
          }
        }
        孩子.push({ toks: 节点.toks.concat([cand]), dmg: 评 });
        扩展数++; onProgress(1);
      }
    }
    if (被打断 || !孩子.length) break;
    孩子.sort((x, y) => y.dmg - x.dmg);
    const 本层宽 = s < 早期层数 ? 早期宽度 : width;
    if (诊断) {
      // 影子节点定位：在孩子里找与“目标前缀的前 s+1 步”完全匹配的节点（db评分=其填充续航估计，db排名=在1位基）
      const 目标 = 诊断.目标toks, n = s + 1;
      let 排名 = -1, 评分 = null;
      for (let i = 0; i < 孩子.length; i++) {
        const tk = 孩子[i].toks;
        if (tk.length === n && tk.every((c, j) => c.idx === 目标[j].idx && c.act === 目标[j].act)) { 排名 = i + 1; 评分 = 孩子[i].dmg; break; }
      }
      诊断报告.push({
        s, n, 孩子数: 孩子.length, 本层宽,
        db评分: 评分, db排名: 排名,
        存活: 排名 > 0 && 排名 <= 本层宽,   // 排名>本层宽 → 本层被剪；排名=-1 → 父已被剪，本前缀未生成
        top评分: 孩子[0].dmg,
        width线评分: 孩子[Math.min(本层宽, 孩子.length) - 1].dmg,   // 最后一个保留者的评分（剪剪线）
        db真值: 诊断.真值,
      });
    }
    beam = 孩子.slice(0, 本层宽).map(c => ({ toks: c.toks, dmg: c.dmg }));
    深度 = s + 1;
  }
  // 结果：束首 toks（可能 <65 步，若超时）；终验用 fastReplay 权威口径
  let 最优 = beam[0];
  for (const 节点 of beam) if (节点.dmg > (最优.dmg || 0)) 最优 = 节点; // 超时后按已记录的 rollout dmg 选最好
  let toks = 最优.toks;
  if (toks.length < 65) { const r = 修复解码(inst, ids, toks, bonds); toks = r ? r.toks : toks; }
  const 终验 = 重放(inst, ids, toks, bonds);
  return { toks, dmg: 终验, 扩展数, 深度, ms: Date.now() - t0, 诊断报告 };
}

/* ---------- 5) 相位对齐构造（保守兜底：CD 节奏改写队） ---------- */

/*
 * 保守兜底（用户定策 2026-09-23）：简单规则（sync 填充）优化不了的队 —— 队内存在 CD 节奏改写者
 *   （机制特征.需相位规划：注入数>0 或 CD操纵数>0）—— **不再依赖 rollout 估值排序**（那正是把正确路径
 *   剪掉的剪枝），改为"相位对齐起点 + 真值爬山"，并与束搜索结果按真值取优（结构上不可能回退）。
 *
 * 为什么需要（实验 G/K/L 实证，队 10197,10152,10096,10193,10147，DB=29.90G）：
 *   10197（注入4）每行动给队友降 1 CD → 位4=10193（伤害궁，名义 cd4）实际每 ~3 回合就绪；
 *   束/填充从 t1 起"就绪即放" → 궁 锁死 t1/t4/t7/t10/t13（4 次落在无 buff 回合，孤立释放近零伤）；
 *   DB = t2/t5/t9/t13（首发推迟 1 回合，后续全落 buff 齐射回合），次数少反而总伤高 3.6G
 *   （缺口 3.57G 中 t9 单回合占 2.31G）。位5/位1（cd4 未被降 CD）两者完全一致 @t5/t9/t13 —— 只有被催 CD 者走偏。
 *   排除记录：束宽无效（实验E）| 编辑球 r=2/8450 候选无效（实验H）| 去 max() 用纯 sync 反而更低（实验J）
 *     | 改写 toks + 修复解码造变体全部被 CD 演化解回原样（实验K）。⇒ rollout 填充续航的表达力天花板。
 *   实验L（本函数原型）：构造解自身仅 37.75%，但**从它出发真值爬山 → 92.53%**（束+爬仅 88.05%）
 *     —— 构造的价值不在质量，而在给出**相位正确的起点**让爬山跳出 88% basin。승나미（构造+爬 88.67%
 *     < 束+爬 98.16%）由取优保护，不回退。
 *
 * 构造规则（用引擎真实状态 legalActs/curCd 逐步推进，非事后改写 token）：
 *   buff궁（非伤害궁）恒最高优先（2e6 档）→ 先铺 buff；伤害궁仅 1e6 档，
 *   只在"本回合已有 buff궁 出手"时放，否则憋（改 평/buff 顶替），最多憋 最大憋 个就绪窗口，
 *   t>=11 无条件放（避免憋到战斗结束浪费）。与 sync 填充同构，差别是 最大憋 可配。
 *   保守起见不启用剪枝A（방 全可枚举）：宁可多算，不冒剪掉正确路径的风险。
 *
 * @param {object} 设置 {最大憋=99}（实验L 扫描 {3,5,8,99}：3 太紧→相位仍错、爬山停在 85~88% basin；
 *   5/8/99 几乎相同 92.5% ⇒ 不赌单一常数，调用方对少量档位各构造+爬山、按真值取优）
 * @returns {{toks, dmg}|null} dmg 为 fastReplay 真值（权威口径）
 */
function 相位对齐构造(inst, ids, bonds, 设置) {
  bonds = bonds || [5, 5, 5, 5, 5];
  设置 = 设置 || {};
  const 最大憋 = 设置.最大憋 == null ? 99 : 设置.最大憋;
  const stopFlag = 设置.stopFlag || (() => false);
  const inc = inst.increment;
  if (!inc.initBattle(ids, bonds, -1, null)) return null;
  const comp = inst.internals.comp;   // initBattle 后才取引用（数组被重新赋值）
  const 原 = inc.原语();
  const 憋计数 = {};
  const toks = [];
  let 本回合buff = false, 当前回合 = -1;

  // 选动作：buff궁(2e6) > 伤害궁(1e6, 除非被禁) > 딜러평(500) > 탱방(30) > 기타평(100) > 방(1)
  function 选(禁伤궁) {
    let bI = -1, bA = null, bS = -Infinity;
    for (let i = 0; i < 5; i++) {
      const c = comp[i];
      if (!c || c.isActed) continue;
      const f = 特征.get(ids[i]);
      if (!f) continue;
      const 평점 = (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
      if (평점 > bS) { bS = 평점; bI = i; bA = '평'; }
      const 방점 = (f.role === 2 ? 30 : 1);   // 保守：不剪 방
      if (방점 > bS) { bS = 방점; bI = i; bA = '방'; }
      if (c.curCd <= 0) {
        if (是伤害궁(f)) {
          if (禁伤궁) continue;
          const 궁점 = 1e6 + 4.5e5 + (f.atk * (f.ultMag > 0 ? f.ultMag : 1)) / 1000;   // 与 伤害궁분 回落同口径
          if (궁점 > bS) { bS = 궁점; bI = i; bA = '궁'; }
        } else {
          const 궁점 = 2e6 + f.atk / 1e6;   // buff궁 恒先于伤害궁（与 sync 同铁律）
          if (궁점 > bS) { bS = 궁점; bI = i; bA = '궁'; }
        }
      }
    }
    return bI < 0 ? null : { i: bI, a: bA };
  }

  for (let k = 0; k < 65; k++) {
    if (stopFlag()) return null;
    const t = (k / 5) | 0;
    if (t !== 当前回合) { 当前回合 = t; 本回合buff = false; }
    let sel = 选(false);
    if (!sel) break;
    if (sel.a === '궁') {
      if (!是伤害궁(特征.get(ids[sel.i]))) {
        本回合buff = true;                    // buff 서포터 궁 出手 → 本回合已铺 buff
      } else {
        憋计数[sel.i] = 憋计数[sel.i] || 0;
        if (!本回合buff && t < 11 && 憋计数[sel.i] < 最大憋) {
          const alt = 选(true);               // 伤害궁憋住：改평/buff顶替
          if (alt) { 憋计数[sel.i]++; sel = alt; }
        } else {
          憋计数[sel.i] = 0;                  // 放出
        }
      }
    }
    const ok = sel.a === '평' ? 原.do_atk(sel.i) : (sel.a === '궁' ? 原.do_ult(sel.i) : 原.do_def(sel.i));
    if (!ok) break;
    toks.push({ idx: sel.i, act: sel.a });
  }
  if (toks.length < 65) {                     // 兜底：不足 65 步用修复解码补合法（真值仍由重放裁决）
    const 修 = 修复解码(inst, ids, toks, bonds);
    return 修 ? { toks: 修.toks, dmg: 修.dmg } : null;
  }
  return { toks, dmg: 重放(inst, ids, toks, bonds) };
}

/* ---------- 5b) 节拍对齐构造（通用兜底：cd 混杂队的全员齐射相位） ---------- */

/*
 * 为什么需要（2026-09-24，Top200 benchmark 实锤，最差队 64.72% 的根因诊断）：
 *   相位对齐构造 与 sync 填充共享同一结构性盲区——**buff궁 恒准点放**（buff궁走2e6档立即放，憋招逻辑只作用于伤害궁）。cd 混杂队（如 cd=[4,3,4,3,4]）的 DB 最优解要求 **buff궁也憋**：cd=3 者 t4 就绪却憋到 t5，与 cd=4 者在 t5/t9/t13 三人齐射（buff 先、伤害后）吃满叠层。reactive 填充规划不了这种"少放一次换三次齐射"的全局相位 → 填充续航只有真值 62%，且**所有候选前缀评分完全相同**（影子诊断DB/top=100.0%，零区分度）→ DB 前缀在第 1 回合第 3 动就被挤出 width。
 *
 * 泛化普查（12 队：8 支未达标 + 5 支已达标回归，%TEMP%\泛化普查.txt）：
 *   假说「齐射周期 T = 队内可放大招者最大 cd；齐射集 S = {t0, t0+T, …} ∩ [1,13]」对照 DB 真值解的实际大招回合集：**完全命中 3 / 部分命中 9 / 未命中 0**。部分命中的偏差模式一致：DB 常多出 t1（{1,5,9,13} 型）→ t0 必须扫满 1..13 并按 S 去重（t0=1→{1,5,9,13} 构造 97.2% vs t0=5→{5,9,13} 仅 57.6%，固定 t0=T+1 会漏掉一整个相位类）。
 *
 * 端到端实测（13 队，爬山 30000+谷底试探 8，%TEMP%\端到端节拍.txt）：
 *   8 支未达标队 7 支救回：64.72%→**100.34%**、65.99%→98.88%、68.30%→99.76%、71.90%→99.84%、72.37%→94.85%、79.57%→99.49%、91.86%→95.55%；1 支(娜莉队) 相位对齐构造更优由 max 取优保护。
 *   5 支已达标队全部零回退。**平均 85.20%→98.59%（+13.38pp），最低 64.72%→92.91%，回退 0 队。**
 *   **K=3 是必要的**：希耶儿队构造最佳的 t0=5 爬山只到 77.44%，而构造第 3 名 t0=4 爬到 95.55%
 *   → 构造 dmg 排序与爬山终点排序不一致，不能只取 Top1。
 *
 * 定位：**纯静态通用件**，只用 cd / ultMag / atkMag / 已有序先验（Zermelo），无任何角色专项判断，
 *   不新增机制白名单。与 相位对齐构造 并存（两者起点互补，调用方按真值取优）。
 *
 * 结构规则：
 *   T  = 队内「可放大招者」（cd∈[1,12]，能在 13 回合内首发）的最大 cd t0 ∈ 1..13，按齐射集 S={t0,t0+T,…}∩[1,13] 去重
 *   S 内回合：5 人全放大招；出手序 = buff大招在前、伤害大招在后，同型内按 序先验.饱和 降序（分高先手）
 *   非 S 回合：全普攻，按槽位序（普攻序对伤害影响小，实测与"伤害先"几乎同值）
 *   合法性由 fastReplay 裁决（cd 未到就放궁 → 非法 → 0 → 丢弃）
 *
 * @param {object} 设置 {TopK=3}（返回按构造 dmg 降序的前 TopK 个合法候选；构造极廉价——27~39 个变体各一次重放，总 ~0.2s；爬山成本由调用方控制）
 * @returns {{toks, dmg, T, t0, S, 序策}[]} 合法候选（dmg>0）降序；无合法候选返回 []
 */
function 节拍对齐构造(inst, ids, bonds, 设置) {
  bonds = bonds || [5, 5, 5, 5, 5];
  设置 = 设置 || {};
  const TopK = 设置.TopK == null ? 3 : 设置.TopK;

  const 是伤害 = i => { const f = 特征.get(ids[i]); return f && (f.ultMag > 0 || f.atkMag > 0); };
  const buff槽 = [], 伤害槽 = [];
  for (let i = 0; i < 5; i++) (是伤害(i) ? 伤害槽 : buff槽).push(i);

  const cds = ids.map(id => { const f = 特征.get(id); return f ? f.cd : 4; });
  const 可放 = cds.filter(c => c >= 1 && c <= 12);
  if (!可放.length) return [];
  const T = Math.max(...可放);
  if (T < 1) return [];

  // 同型内出手序：序先验饱和分降序（无分数者回落 atk×ultMag 代理，置档底）
  const 序键 = i => {
    const s = 序先验.饱和(ids[i]);
    const f = 特征.get(ids[i]) || {};
    return s != null ? s : (f.atk * (f.ultMag > 0 ? f.ultMag : 0)) / 1e12;
  };
  const 按序降 = 列 => 列.slice().sort((a, b) => 序键(b) - 序键(a));
  const 齐序表 = {
    '序先验': 按序降(buff槽).concat(按序降(伤害槽)),
    '槽位': buff槽.concat(伤害槽),
    '伤害先序先验': 按序降(伤害槽).concat(按序降(buff槽)),
  };

  const 出 = [];
  const 已试集 = new Set();
  for (let t0 = 1; t0 <= 13; t0++) {
    const S = new Set();
    for (let t = t0; t <= 13; t += T) S.add(t);
    const 集键 = [...S].join(',');
    if (已试集.has(集键)) continue;
    已试集.add(集键);
    for (const 序策 of Object.keys(齐序表)) {
      const 齐列 = 齐序表[序策];
      const toks = [];
      for (let t = 1; t <= 13; t++) {
        const 齐 = S.has(t);
        const 列 = 齐 ? 齐列 : [0, 1, 2, 3, 4];
        for (const i of 列) toks.push({ idx: i, act: 齐 ? '궁' : '평' });
      }
      const dmg = 重放(inst, ids, toks, bonds);
      if (dmg > 0) 出.push({ toks, dmg, T, t0, S: [...S], 序策 });
    }
  }
  出.sort((a, b) => b.dmg - a.dmg);
  return 设置.全部 ? 出 : 出.slice(0, TopK);
}

/* ---------- 指令集 编解码（站点 description 格式 ⇄ toks） ---------- */

// 解析用户输入的指令集文本（如 " 1턴 : 2평 > 3평 > 4평 > 1궁 > 5평\n 2턴 : ..."）→ toks
// 经引擎 setCommandCustom 修正（무이카/수나미 的 CD 特例、궁 前置），与线上口径一致。
// 返回 null 表示解析失败（token 不足 65）。
function 解析指令集(inst, ids, description, bonds) {
  bonds = bonds || [5, 5, 5, 5, 5];
  const strs = inst.internals.setCommandCustom(ids, description, bonds);
  if (!strs || strs.length < 65) return null;
  const toks = [];
  for (let i = 0; i < 65; i++) toks.push({ idx: Number(strs[i][0]) - 1, act: strs[i][1] });
  return toks;
}

// toks → 站点 description 格式（每 5 个 token 一行，"N턴 : a > b > c > d > e"），可直接提交/导入模拟器
function 导出指令集(toks) {
  const 行 = [];
  for (let t = 0; t < 13; t++) {
    const 片段 = [];
    for (let k = 0; k < 5; k++) { const tk = toks[t * 5 + k]; 片段.push((tk.idx + 1) + tk.act); }
    行.push((String(t + 1).padStart(2, ' ')) + '턴 : ' + 片段.join(' > '));
  }
  return 行.join('\n');
}

// toks → 紧凑串（用于置换表键/日志）：如 "2평3평4평5평1궁|..."
function toks键(toks) {
  let s = '';
  for (let i = 0; i < 65; i++) { s += 动作.indexOf(toks[i].act) + '' + toks[i].idx; if (i % 5 === 4 && i < 64) s += '|'; }
  return s;
}

module.exports = { 贪心基线, 先验贪心, 先验前瞻贪心, 是伤害궁, 修复解码, 可执行, 爬山, 束搜索, 编辑球层, 相位对齐构造, 节拍对齐构造, 重放, 特征, 动作, 组合升序, 笛卡尔积, 解析指令集, 导出指令集, toks键 };
