'use strict';
/*
 * 多例模拟器引擎（多例模式改造）
 *
 * 背景：原版 calculator.v3.js 是平铺全局脚本，可变全局状态（comp、boss、GLOBAL_TURN、dmg13、
 * 五路伤害计数器、whoActed、isOverflowed、buff_ex、alltimeFunc、savedData、command，以及
 * autocalc 的 GLOBAL_* 四件套）在多次战斗之间共享，导致：
 *   1. buff_ex 会被部分角色（如 10153）在 setDefault 时 push 污染，且 autocalc 的 start() 虽然
 *      每次重置了 buff_ex，但 alltimeFunc 从未清空——前一场战斗注册的常驻回调会泄漏进下一场；
 *   2. 两个战斗无法交错执行：任何一方调用 autoCalc 都会覆盖另一方正在使用的 comp/boss。
 *
 * 方案：闭包工厂。把 header 片段 + deobfuscated.js + autocalc.v3.js 三段源码包进一个工厂函数体，
 * new Function 只编译一次缓存复用；每次 createSimulator(deps) 重新执行一遍工厂体，引擎的每个
 * "全局变量"都成为该实例私有的闭包变量，实例之间物理隔离，可任意交错调用。
 *
 * 工厂只注入只读外部依赖（deps）：
 *   - getCharacter(id)   必需，角色基础数据查询（tenkaassist js/characterJson.js）
 *   - liberationList     必需，解放角色名单数组（同上）
 *   - t(str)             可选，翻译函数（只影响 buff 文本化展示），缺省恒等返回
 *   - lang               可选，语言码（同上），缺省 "ko"
 *   - alert(fn)          可选，引擎内部错误回调，缺省空函数
 *   - updateAll(fn)      可选，UI 刷新钩子（loadBefore 用），缺省空函数
 *
 * 实例 API：
 *   battle(idList, command, bondList, boss_element?, optionList?)
 *       一场完整战斗（先清理 alltimeFunc/savedData/command 残留，再调 autoCalc），返回 dmg13
 *   getState()
 *       战斗结束后的完整内部状态快照（boss/comp 全字段、每个 buff 全属性、五路计数、溢出标志、buff_ex）
 *   internals
 *       底层直通访问：boss/comp/dmg13/GLOBAL_TURN/buff_ex/alltimeFunc 的 getter 与 autoCalc/setCommandCustom/setDefault 原函数
 *
 * 浏览器用法：把本文件的 createSimulator 与三段源码字符串（fetch 或打包内联）传入 opts 即可，
 * 引擎本身无 Node 专属 API；需要真·多线程并行时在 Node 侧用 worker_threads、浏览器侧用 Web Worker，
 * 每个 worker 里各自 createSimulator（同步纯计算，无共享内存需求）。
 */
const fs = require('fs');
const path = require('path');

// 默认源码位置：反混淆产物在本目录；驱动器与命令解析片段取 tenkaassist 仓库原文（保证与线上完全一致）
function 默认源码() {
  return {
    calc: fs.readFileSync(path.join(__dirname, 'deobfuscated.js'), 'utf8'),
    autocalc: fs.readFileSync(path.resolve(__dirname, '..', '..', 'tenkaassist', 'make', 'autocalc.v3.js'), 'utf8'),
    header: fs.readFileSync(path.resolve(__dirname, '..', '..', 'tenkaassist', 'js', 'header.js'), 'utf8'),
  };
}

// 从 header.js 截取纯数据/纯函数片段：cdDifList 常量 + setCommandCustom 函数（不含任何 DOM 依赖）
// 上游 header.js（tenkaassist 09e6dc0 起）把 setCommandCustom 的指令解析重构为尾部独立的 parseCommand
// （纯函数、无 DOM）：片段截断点在 setCommandCustom 后的首个顶层 function 处会把它切掉（parseCommand is
// not defined），故截断点之后若存在 parseCommand 则延伸到它结束，覆盖新旧两代 header.js。
function 提取header片段(headerText) {
  const 起 = headerText.indexOf('const cdDifList');
  if (起 === -1) throw new Error('header.js 中未找到 cdDifList，片段提取失败');
  const scc = headerText.indexOf('function setCommandCustom');
  if (scc === -1) throw new Error('header.js 中未找到 setCommandCustom，片段提取失败');
  let 止 = headerText.indexOf('\nfunction ', scc + 10);
  if (止 === -1) 止 = headerText.length;
  // 截断点恰是 parseCommand 自身时（setCommandCustom 之后首个顶层函数即它），旧逻辑把它切掉；
  // pc >= 止 才意味着 parseCommand 未进片段——此时把它的函数体段落外科拼接到片段尾（不扫入中间
  // 可能存在的其它顶层函数，避免带进 DOM 依赖）。pc < 止 = 已在片段内，无需处理。
  const pc = headerText.indexOf('\nfunction parseCommand', scc + 10);
  if (pc !== -1 && pc >= 止) {
    const pc止 = headerText.indexOf('\nfunction ', pc + 10);
    return headerText.slice(起, 止) + headerText.slice(pc, pc止 === -1 ? headerText.length : pc止);
  }
  return headerText.slice(起, 止);
}

// 工厂体：注入依赖 → header 片段 → 引擎 →（可选）机制表解释器+接线 → 驱动器 → 战斗隔离包装与状态快照
//   mechSrc = 机制表/解释器源.js 全文（纯文本，与引擎同作用域，可直接引用 comp/boss/tbf/nbf/ultLogic/atkLogic 等）。
//   ⚠ 接线历史缺陷（2026-10-08 修复）：引擎适配.createEngine({启用机制表}) 一直把 机制数据 放进 deps、
//     把 解释器源 放进 opts 传下来，但本文件旧版 createSimulator 只读 calcSrc/autocalcSrc/headerFrag，
//     两者**被完全忽略** → 工厂体里根本不存在 __mech_安装（全仓零调用点），"有表走装配、无表回落"
//     从未发生。后果：①启用机制表 与 不启用 是完全相同的代码路径（选项静默无效、与 引擎适配 文档不符）；
//     ②双跑差分.js 的"旧(无机制表) vs 新(机制表)"两侧同源 → 恒 0 不一致 = 假通过，机制表的 bit-exact
//     背书实际上从未被验证过；③解释器里的真 bug（CmpLeader 忽略 cmp，见 解释器源.js）因此长期潜伏。
const MECH_接线片段 = `
;const __mech_原setDefault = setDefault;
if (!deps.机制数据) throw new Error('机制表接线失败：已串接解释器源但 deps.机制数据 缺失（请用 引擎适配.createEngine({启用机制表:{binPath}})）');
const __mech_表 = __mech_安装(deps.机制数据);
setDefault = function (u, lib) {
  const f = __mech_表[u.id];
  return f ? f(u, lib) : __mech_原setDefault(u, lib);   // 有表走数据驱动装配，无表回落原硬编码 case
};
`;
function 工厂体源码(calcSrc, autocalcSrc, headerFrag, mechSrc) {
  return [
    'const getCharacter = deps.getCharacter;',
    'const liberationList = deps.liberationList;',
    'const t = deps.t || function(s){ return s; };',
    'const lang = deps.lang === undefined ? "ko" : deps.lang;',
    'const alert = deps.alert || function(){};',
    'const updateAll = deps.updateAll || function(){};',
    // [perf] R2-D：buff 派生量（getBuffSizeList/getBossBuffSizeList）缓存基础设施。
    //   定义在工厂体头部（任何 calcSrc 变体都可见）：deobfuscated.js 的 mutation 点与缓存读写引用它们；
    //   线上混淆版 calcSrc 无缓存逻辑，这里的定义与驱动器侧 bump 调用对其无副作用。
    //   语义：_buffGen 单调递增，任何 buff 数组/元素变更点 bump；缓存条目 {gen, turn, out} 命中条件
    //   gen 与 GLOBAL_TURN 双匹配——turn 过期判定依赖 GLOBAL_TURN，双键避免漏失效。
    'let _buffGen = 0;',
    'function _bumpBuffGen() { _buffGen++; }',
    'const _bslCache = new WeakMap();',   // champ → {gen, turn, out}
    'const _gbslCache = new WeakMap();',  // boss  → {gen, turn, out}
    // [perf] R3-B：buff_ex 的 Set 镜像（includes O(n) 线性扫 → O(1)）。buff_ex 全部变更 = push（长度+1）
    //   或 start() 里 length=0 重置；长度键捕捉所有内容变更，唯一致盲窗是"重置后无查询又涨回原长度"——
    //   由 battle()/initBattle 入口强制 _buffExSetLen=-1 封死（驱动器侧，两种 calcSrc 都安全）。
    'let _buffExSetLen = -1;',
    'const _buffExSet = new Set();',
    headerFrag,
    ';',
    calcSrc,
    ';',
    // ---- 机制表接线（opts.解释器源 + deps.机制数据 时才串接；缺省为空 → 既有行为逐字节不变）----
    mechSrc || '',
    mechSrc ? MECH_接线片段 : '',
    ';',
    autocalcSrc,
    ';',
    // ---- 战斗隔离包装 ----
    // 注意参数名不能叫 command（会遮蔽引擎的同名全局数组）
    `
function battle(idList, commandText, bondList, bossElement, optionList) {
  // 每场战斗前清理跨战斗残留，使"复用同一实例"与"全新实例"严格等价：
  // 1. alltimeFunc——部分角色 passive 会 push 常驻回调，autocalc 的 start() 不清它，连跑两场必泄漏；
  // 2. savedData/command——UI 回退栈，autoCalc 路径不用但防止跨场累积；
  // 3. boss.element——★原版 autoCalc 的真实缺陷：autoCalc 仅在 boss_element != -1 时才赋值
  //    boss.element，传 -1(不指定属性)时不会重置，导致上一场的 boss 属性残留到下一场、污染
  //    元素克制 getInt() 的结果。这里手动复位为 undefined(等价于 Boss 构造初态)，再由 autoCalc
  //    在确有指定时覆盖。这正是"多例隔离"必须修复原版遗漏的核心点。
  // 4. isOverflowed——溢出标记数组，引擎只置 true 从不复位(与 simulator.v3.js 的 UI 层 fill(false)
  //    一致地在此复位)，避免上一场的溢出标记污染 getState()。
  alltimeFunc.length = 0;
  savedData.length = 0;
  _方法栈.length = 0;      // 与 savedData 同步清零：上一场 step/undo 残留的方法层快照已全部失效
  command.length = 0;
  boss.element = undefined;
  try { isOverflowed.fill(false); } catch (e) {}
  _bumpBuffGen();   // [perf] R2-D：autoCalc→start() 会重置 boss.buff/li 并重建 comp（新对象天然无缓存，
                    //   但 boss 是单例）→ 全量失效防跨场脏命中
  _buffExSetLen = -1;   // [perf] R3-B：同场重灌 buff_ex → Set 镜像强制重建
  return autoCalc(idList, commandText, bondList, bossElement, optionList);
}

function 序列化buff(b) {
  return (b || []).map(function(x) {
    const o = {};
    for (const k of ['div','act','type','size','name','nest','maxNest','turn','ex','on']) if (x[k] !== undefined) o[k] = x[k];
    if (x.who !== undefined) o.who = (x.who && x.who.id !== undefined) ? ('id:' + x.who.id) : String(x.who);
    if (x.from !== undefined) o.from = (x.from && x.from.id !== undefined) ? ('id:' + x.from.id) : String(x.from);
    return JSON.stringify(o);
  }).sort();
}

function getState() {
  return {
    dmg13: dmg13,
    GLOBAL_TURN: GLOBAL_TURN,
    lastDmg: lastDmg, lastAddDmg: lastAddDmg, lastAtvDmg: lastAtvDmg, lastDotDmg: lastDotDmg, lastRefDmg: lastRefDmg,
    isOverflowed: isOverflowed.slice(),
    buff_ex: buff_ex.slice(),
    boss: {
      hp: boss.hp, maxHp: boss.maxHp, def: boss.def,
      li: Array.isArray(boss.li) ? boss.li.slice() : boss.li,
      buff: 序列化buff(boss.buff),
      element: boss.element === undefined ? 'undef' : boss.element
    },
    comp: comp.map(function(c) {
      if (c == null) return null;
      return {
        id: c.id, name: c.name, atk: c.atk, hp: c.hp, curHp: c.curHp, cd: c.cd, curCd: c.curCd,
        atkMag: c.atkMag, ultMag: c.ultMag,
        stopCd: c.stopCd, canCDChange: c.canCDChange, isLeader: c.isLeader, isActed: c.isActed,
        hpAtkDmg: c.hpAtkDmg, hpUltDmg: c.hpUltDmg,
        isHealed: c.isHealed, isHealed2: c.isHealed2, isHealed3: c.isHealed3,
        stack: Array.isArray(c.stack) ? c.stack.slice() : c.stack,
        buff: 序列化buff(c.buff)
      };
    })
  };
}

/* ============================================================================
 * 增量步进 API（供树搜索/DFS 剪枝使用）
 *
 * 设计要点（务必理解后再用）：
 * 1. 伤害语义：引擎里 dmg13 = floor(boss.maxHp - boss.hp) 仅在 nextTurn() 中
 *    "GLOBAL_TURN == 14" 的那一刻被赋值一次；战斗全程的伤害是实时累积在
 *    boss.hp 的扣减上的。因此搜索过程中要读"当前已造成伤害"必须用
 *    dmgSoFar()（= floor(boss.maxHp - boss.hp)），绝不能读 dmg13——后者在
 *    13 回合内一直是旧值，且 loadBefore 回滚后也不会被同步。
 * 2. 快照回滚：saveCur() 把 5 角色全字段 + boss(hp/maxHp/def/buff/li/turn)
 *    压入 savedData 栈；loadBefore() 弹出并经 jsonToCharacter/jsonToBoss
 *    还原，其中 jsonToBoss 会把 GLOBAL_TURN 一并还原。这是一个严格的 LIFO
 *    栈，天然适配 DFS 的"进分支 step、出分支 undo"。已实测回滚多步后
 *    hp/curCd/bossHp/GLOBAL_TURN 完全复原。
 * 3. initBattle 的空命令技巧：start(idList) 会先完整初始化 comp/boss、跑
 *    leader/passive/turnstart，末尾 return auto()。把 GLOBAL_COMMAND_LIST 设成
 *    空数组，auto() 会因 "length < 13*5" 立即 return 0，于是 start 只完成
 *    "初始化"而不会自动消费任何动作——正好把战斗停在第 1 回合的起点，交由
 *    step() 逐动作驱动。
 * ============================================================================ */

// 初始化一场"可步进"的战斗：清理跨场残留 → 复刻 autoCalc 头部全局设置 → 用空命令调 start 只初始化不执行 → 校验 5 角色建好
function initBattle(idList, bondList, bossElement, optionList) {
  if (!idList || idList.length !== 5) return false;
  alltimeFunc.length = 0;
  savedData.length = 0;
  _方法栈.length = 0;                        // 与 savedData 同步清零：旧场的方法层快照全部失效（start() 会重建 comp）
  command.length = 0;
  boss.element = undefined;
  try { isOverflowed.fill(false); } catch (e) {}
  GLOBAL_ACT_NUM = 0;
  GLOBAL_COMMAND_LIST = [];                    // 空命令：start() 末尾的 auto() 因 length<65 立即返回，只完成初始化
  GLOBAL_OPTION_LIST = (optionList == null) ? null : optionList;
  GLOBAL_BOND_LIST = bondList;
  boss.maxHp = 10854389981;
  if (bossElement != null && bossElement !== -1) boss.element = bossElement;
  _bumpBuffGen();                              // [perf] R2-D 硬化：start() 会 boss.buff=[]（未过封装函数的 mutation）
  start(idList);                               //   且跑 leader/passive/turnstart 钩子（可能读派生量）——前后双 bump
  _bumpBuffGen();                              //   封住 boss 单例的跨场脏命中窗口（champ 每场新建天然无旧缓存）
  _buffExSetLen = -1;                          // [perf] R3-B：start() 重置+重灌 buff_ex → Set 镜像强制重建
  if (!comp || comp.length !== 5) return false;
  for (var i = 0; i < 5; i++) if (comp[i] == null) return false;  // N/R 卡等无 hp/atk → setDefault 返回 null
  return true;
}

// 执行一步动作：先 saveCur 压栈再调 do_*；动作非法（角色已行动 / CD 未满却放궁）则立即回滚保持栈平衡并返回 false
function step(idx, act) {
  var c = comp ? comp[idx] : null;
  if (c == null) return false;
  saveCur();
  _压方法层();                               // 与 saveCur 逐条对应：数据快照旁同步存方法层快照（本步之前的状态）
  var ok;
  if (act === '평') ok = do_atk(idx);
  else if (act === '궁') ok = do_ult(idx);
  else if (act === '방') ok = do_def(idx);
  else ok = false;
  if (!ok) { loadBefore(); _弹方法层(); return false; }   // 非法动作：数据与方法层一并撤销，状态不变
  return true;
}

// 回滚一步（弹出最近一次 step 压入的快照）；栈空时 loadBefore 自身安全返回（不弹方法层，保持两栈等长）
function undo() {
  var _前 = savedData.length;
  loadBefore();
  if (savedData.length < _前) _弹方法层();     // 方法层随数据一起回滚：猴子补丁 wrapper / 机制表注入不再单调累积
}

// 返回角色 idx 当前合法动作集合：未行动时 평/방 恒合法，궁 仅当 CD 就绪（curCd<=0）
function legalActs(idx) {
  var c = comp ? comp[idx] : null;
  if (c == null || c.isActed) return [];
  var acts = ['평', '방'];
  if (c.curCd <= 0) acts.push('궁');
  return acts;
}

// 当前实时已造成总伤害 = floor(boss.maxHp - boss.hp)（搜索期唯一正确的伤害读数）
function dmgSoFar() { return Math.floor(boss.maxHp - boss.hp); }
function curTurn() { return GLOBAL_TURN; }
function actNum() { return GLOBAL_ACT_NUM; }
// 是否已走完 13 回合（打完 65 步后 nextTurn 把 GLOBAL_TURN 推进到 14）
function isFinished() { return GLOBAL_TURN >= 14; }

/* 快速整场重放（无快照栈）：爬山/编辑球的海量候选评估用。
   与 battle() 等价但直接收 token 数组，省去 description 字符串往返与 setCommandCustom 重复解析。
   非法 token（do_* 返回 false）立即返回 0（与线上 auto() 语义一致）。
   注意：此路径不调 saveCur/step，执行后 savedData 栈为空，不可 undo；需 undo 用增量步进路径。*/
function fastReplay(idList, toks, bondList, bossElement, optionList) {
  if (!toks || toks.length < 65) return 0;
  if (!initBattle(idList, bondList || [5,5,5,5,5], bossElement === undefined ? -1 : bossElement, optionList == null ? null : optionList)) return 0;
  for (var i = 0; i < 65; i++) {
    var idx = toks[i].idx, act = toks[i].act;
    if (act === '평') { if (!do_atk(idx)) return 0; }
    else if (act === '궁') { if (!do_ult(idx)) return 0; }
    else { if (!do_def(idx)) return 0; }
  }
  return dmgSoFar();
}

// 供排程器直接驱动原语（避免字符串往返）：在 fastReplay 外的特殊场合使用
function 原语() { return { do_atk: do_atk, do_ult: do_ult, do_def: do_def }; }

/* —— 轻量状态快照 / 还原（token 级检查点，供爬山/序重排做前缀复用）——
 * 与引擎自带 saveCur/loadBefore 的三点区别（都是为"当搜索信号、无 fastReplay 终验兜底"而生）：
 *   ① 覆盖面：动态 for..in 扫描每个 comp/boss 的**所有非函数自有字段**，因而自动纳入 stack/turnHeal/
 *      isFirstTurnActed/check/canCDChange/stopCd/isSealed 等 setDefault 运行期挂载的数据字段——
 *      characterToJson 的固定字段集**漏掉这些**（step/undo 路径的既有隐患），故其回滚对含此类角色的队
 *      可能与真值有偏差；另显式带上闭包全局 whoActed/hitAll/last*5路计数/dmg13/GLOBAL_TURN/isOverflowed。
 *   ② 无 JSON 往返：boss.li 是 setBuff() 每次重算的派生量，存 slice 即可，省掉 JSON.parse(JSON.stringify)。
 *   ③ 原地写回**同一** comp[i]/boss 对象（绝不替换引用）：钩子闭包 capture 了原对象，替换会让 passive/
 *      attack/ultimate 指向旧对象。buff 数组 restore 时赋独立副本（snapshot 保持不可变，防引擎 push 污染）。
 * 正确性由 _验证检查点.js 对 fastReplay 做 bit 级差分背书；成本（capture/restore 单次 vs 一步 do_*）由同脚本实测。 */
function _拷buff(src) {
  const a = new Array(src.length);
  for (let i = 0; i < src.length; i++) { const b = src[i]; const o = {}; for (const k in b) o[k] = b[k]; a[i] = o; }
  return a;
}
// 方法层快照（自有函数属性）：部分角色机制在运行期用猴子补丁替换实例方法——10214(万巴) 궁 给
//   딜/탱/디 队友包 attack（原 attack + 后置 deleteBuff）、10184(小兔妈) 给全队包 attack/ultimate 并追加
//   hit()、10190 注入 act_attack。这些 wrapper 是「以方法形式存在的状态」：旧实现 _浅拷字段 直接跳过
//   函数字段（typeof v === 'function' → continue），restore 只回滚数据不回滚方法，于是每评估一次就把
//   궁 重放一次、每次多叠一层 wrapper，上万次评估后单次攻击要穿透上万层调用 → RangeError 爆栈
//   （实测：搜索队伍.js 窗对齐兜底相位 100% 崩溃，含 10214/10184 队伍；纯前进式路径同队同指令正常）。
// 修法：快照时把自有可枚举函数属性收进 __fn（名 → 引用），restore 时按引用复原、并删除快照之后新叠的层。
//   class 原型方法不可枚举，天然不入快照（delete 自有覆盖层后调用自动回落原型原始实现，与"未打补丁"等价）。
//   层数由此有界（= 快照时刻层数），不再随评估次数累积。
// 机制表注入登记表（解释器把 InjectStart 的注入状态数据化后存这里）：{ 方法名: [描述符…] }。
//   必须**深一层**拷贝：直接引用共享会让 restore 形同虚设，且运行期 push 会污染已存快照
//   （表现与 buff 数组同类，故与 buff 并列特判）。描述符本身不可变（模式 + 三个已编译闭包段 +
//   owner/lib），元素可引用共享，只重建外层对象与各数组。
function _拷注入表(src) {
  if (!src) return src;
  const o = {};
  for (const k in src) o[k] = Array.isArray(src[k]) ? src[k].slice() : src[k];
  return o;
}
/* ---------- step/undo 途径的方法层快照（P0 同族缺陷的第二条撤销路径） ----------
 * 上面的 captureState/restoreState 是「增量检查点」路径（爬山用）；而 step/undo 走的是引擎自带的
 * saveCur/loadBefore，两者的缺陷完全同类但当时只修了前者：
 *   · characterToJson 只快照**数据字段**（atk/hp/curHp/cd/curCd/buff/stopCd/canCDChange/isLeader/
 *     isActed/hpAtkDmg/hpUltDmg/isHealed1·2·3/stack），**没有任何方法字段**；
 *   · jsonToCharacter 是取 const u = comp[i] 然后**原地写回同一对象**（不新建）。
 * ⇒ 运行期用猴子补丁叠在实例方法上的 wrapper（以及机制表路径的 __mech_inj 注入登记表）
 *   **永远不随 undo 回滚**，链深 = 已执行的大招次数，无界增长 → 穿透栈上限即 RangeError 爆栈。
 * 实测证据（探针 验叠层E.js / 计wrapper层4E.js，队 [10197,10196,10134,10214,10147]）：
 *   · step궁→undo 循环 3000 次：3000 次大招全在**第1回合**内（undo 回滚了 isActed/curCd）；
 *     万巴(10214) ultbefore 每次궁给 딜/탱/디 队友包一层 attack ⇒ 10197/10214/10147 各 **3000 层**，
 *     而 보조/힐러 的 10196/10134 为 0 层（不在 getRoleIdx 的 딜탱디 里）。
 *   · 真实束搜索（全程只 initBattle 1 次，用 step/undo 走树）实测链深 **8918 层** → 崩；
 *     触发条件只是**探索深度**：w20+180s/300s 必崩、w20+30s 侥幸不崩、w6+20s 不崩但评分已失真。
 *   · 与引擎口径无关：原生路径叠 wrapper、机制表路径叠 __mech_inj（派发壳按其长度折叠出等深链），
 *     所以 A/B 两条路径**都**会崩（实测 w20/180s：崩队1 A=135s 崩 / B=64s 崩）。
 * 修法与 P0 同构（不改上游镜像 deobfuscated.js，只在驱动器层补）：step 的 saveCur 旁同步压一份
 *   「方法层快照」（自有函数属性名→引用 + __mech_inj 深拷），undo 与非法动作回滚的 loadBefore 旁
 *   同步弹出并复原（按引用写回 + 删除快照之后新叠的层；__mech_inj 换新对象引用使派发壳链缓存失效）。
 *   两个栈与 savedData **严格等长**（loadBefore 在栈空时安全返回，故按其长度增量判定是否弹）。
 * 附带收益：旧行为下每次大招都要穿透已累积的全部层，成本随探索次数**平方级**恶化（实测崩队1
 *   226.50us/步）；修后链深有界（≤ 本场已放大招数），step 反而变快。
 * 语义影响：对幂等的后置段（如 deleteBuff 同名 buff、10184 追加 hit〔isHit 守卫〕）数值不变；对
 *   **非幂等**的后置段（如某些角色 wrapper 里的 stack += 2）旧行为会把 stack 重复自增到封顶而算错，
 *   修后才是正确语义 ⇒ 本修复只可能修正数值，不会引入偏差（由双跑差分 + 已知真值回归把关）。
 * ⚠ 本注释不得使用反引号与星号斜杠结尾的写法：它位于引擎拼接**模板字符串**内部，反引号会提前
 *   终止模板（2026-10-09 实踩 SyntaxError），isHealed 这类名字后接斜杠星也会提前结束块注释。
 */
var _方法栈 = [];
function _快照方法层(u) {
  if (!u) return null;
  var o = {}, fn = null;
  for (var k in u) {
    var v = u[k];
    if (typeof v !== 'function') continue;
    // 只收自有函数属性：class 原型方法不可枚举（天然不入 for-in），运行期猴子补丁赋的才是自有属性
    if (Object.prototype.hasOwnProperty.call(u, k)) (fn || (fn = {}))[k] = v;
  }
  if (fn) o.__fn = fn;
  if (Object.prototype.hasOwnProperty.call(u, '__mech_inj') && u.__mech_inj) o.__mech_inj = _拷注入表(u.__mech_inj);
  return (o.__fn || o.__mech_inj) ? o : null;
}
function _压方法层() {
  var s = null;
  if (comp) {
    s = new Array(5);
    for (var i = 0; i < 5; i++) s[i] = comp[i] ? _快照方法层(comp[i]) : null;
  }
  _方法栈.push(s);          // 无条件压占位，保证与 savedData 逐条对应
}
function _弹方法层() {
  if (_方法栈.length === 0) return;
  var s = _方法栈.pop();
  if (!s) return;
  // _写回字段 对 {__fn, __mech_inj} 的行为正是所需：按引用复原函数、删除快照后新叠的层（回落原型）、
  //   并用 __mech_inj 的**新副本**替换（新引用 → 派发壳的链缓存自动失效），不触碰任何数据字段。
  for (var i = 0; i < 5; i++) if (comp && comp[i] && s[i]) _写回字段(comp[i], s[i]);
}
function _浅拷字段(src) {
  const o = {};
  for (const k in src) {
    const v = src[k];
    if (typeof v === 'function') {
      if (Object.prototype.hasOwnProperty.call(src, k)) (o.__fn || (o.__fn = {}))[k] = v;
      continue;
    }
    if (k === 'buff') { o.buff = _拷buff(v || []); continue; }
    if (k === '__mech_inj') { o.__mech_inj = _拷注入表(v); continue; }
    o[k] = Array.isArray(v) ? v.slice() : v;
  }
  return o;
}
function _写回字段(dst, o) {
  for (const k in o) {
    if (k === '__fn') continue;
    if (k === 'buff') { dst.buff = _拷buff(o.buff); continue; }   // 独立副本：引擎后续 push 不污染 snapshot
    if (k === '__mech_inj') { dst.__mech_inj = _拷注入表(o.__mech_inj); continue; }   // 注入层数随数据回滚（新对象引用 → 派发壳链缓存自动失效）
    dst[k] = Array.isArray(o[k]) ? o[k].slice() : o[k];
  }
  const fns = o.__fn || null;
  for (const k in dst) {
    if (typeof dst[k] !== 'function') continue;
    if (!Object.prototype.hasOwnProperty.call(dst, k)) continue;
    if (!fns || !(k in fns)) { delete dst[k]; continue; }   // 快照里没有的包装层 = 快照之后叠上的 → 删（回落原型原方法）
    dst[k] = fns[k];                                        // 复原到快照当时的引用
  }
  if (fns) for (const k in fns) if (!Object.prototype.hasOwnProperty.call(dst, k)) dst[k] = fns[k];
}
function captureState() {
  const cs = new Array(5);
  for (let i = 0; i < 5; i++) cs[i] = _浅拷字段(comp[i]);
  return {
    comp: cs, boss: _浅拷字段(boss), turn: GLOBAL_TURN, whoActed: whoActed, hitAll: hitAll, dmg13: dmg13,
    lastDmg: lastDmg, lastAddDmg: lastAddDmg, lastAtvDmg: lastAtvDmg, lastDotDmg: lastDotDmg, lastRefDmg: lastRefDmg,
    overflow: isOverflowed.slice()
  };
}
function restoreState(s) {
  for (let i = 0; i < 5; i++) _写回字段(comp[i], s.comp[i]);
  _写回字段(boss, s.boss);
  _bumpBuffGen();   // [perf] 快照写回替换 buff 数组 → 派生量缓存全失效
  GLOBAL_TURN = s.turn; whoActed = s.whoActed; hitAll = s.hitAll; dmg13 = s.dmg13;
  lastDmg = s.lastDmg; lastAddDmg = s.lastAddDmg; lastAtvDmg = s.lastAtvDmg; lastDotDmg = s.lastDotDmg; lastRefDmg = s.lastRefDmg;
  for (let i = 0; i < 5; i++) isOverflowed[i] = s.overflow[i];
  savedData.length = 0;   // 清 step/undo 残留栈：restore 后旧快照全部失效，防误 undo 到陈旧状态
  _方法栈.length = 0;      // 与上一行同步：本函数已用 _写回字段 直接复原了 comp 的方法层/注入表（与 _弹方法层 同一套语义），所以残留条目一律作废
}

return {
  battle: battle,
  getState: getState,
  // 增量步进（树搜索用）：initBattle → 反复 (step / undo / legalActs / dmgSoFar) 直到 isFinished
  increment: {
    initBattle: initBattle,
    step: step,
    undo: undo,
    legalActs: legalActs,
    dmgSoFar: dmgSoFar,
    curTurn: curTurn,
    actNum: actNum,
    isFinished: isFinished,
    fastReplay: fastReplay,
    原语: 原语,
    captureState: captureState,
    restoreState: restoreState
  },
  internals: {
    get boss() { return boss; },
    get comp() { return comp; },
    get dmg13() { return dmg13; },
    get GLOBAL_TURN() { return GLOBAL_TURN; },
    get buff_ex() { return buff_ex; },
    get alltimeFunc() { return alltimeFunc; },
    autoCalc: autoCalc,
    start: start,
    setCommandCustom: setCommandCustom,
    setDefault: setDefault,
    getBuffSizeList: getBuffSizeList
  }
};
`,
  ].join('\n');
}

// 编译缓存：同一套源码只 new Function 一次
const 工厂缓存 = new Map();
function 取工厂(calcSrc, autocalcSrc, headerFrag, mechSrc) {
  const 键 = calcSrc.length + '|' + autocalcSrc.length + '|' + headerFrag.length + '|' + (mechSrc ? mechSrc.length : 0);
  let 工厂 = 工厂缓存.get(键);
  if (!工厂) {
    工厂 = new Function('deps', 工厂体源码(calcSrc, autocalcSrc, headerFrag, mechSrc || ''));
    工厂缓存.set(键, 工厂);
  }
  return 工厂;
}

/**
 * 创建一个全新隔离的模拟器实例。
 * @param {object} deps 只读外部依赖 { getCharacter, liberationList, t?, lang?, alert?, updateAll? }
 * @param {object} [opts] 源码覆盖 { calcSrc?, autocalcSrc?, headerFrag? }（浏览器/自定义来源时用）
 * @returns {{ battle: Function, getState: Function, internals: object }} 模拟器实例
 */
function createSimulator(deps, opts) {
  if (!deps || typeof deps.getCharacter !== 'function' || !Array.isArray(deps.liberationList)) {
    throw new Error('deps 必须提供 getCharacter(id) 函数与 liberationList 数组（来自 tenkaassist js/characterJson.js）');
  }
  opts = opts || {};
  let calcSrc = opts.calcSrc, autocalcSrc = opts.autocalcSrc, headerFrag = opts.headerFrag;
  if (!calcSrc || !autocalcSrc || !headerFrag) {
    const 源 = 默认源码();
    calcSrc = calcSrc || 源.calc;
    autocalcSrc = autocalcSrc || 源.autocalc;
    headerFrag = headerFrag || 提取header片段(源.header);
  }
  // 机制表接线（opts.解释器源 由 引擎适配.createEngine 的 启用机制表 选项注入）：
  //   两者必须成对出现，缺一即报错——避免"看起来启用了机制表实际没启用"的静默降级。
  const mechSrc = opts.解释器源 || '';
  if (mechSrc && !deps.机制数据) throw new Error('机制表接线失败：提供了 解释器源 但 deps 缺 机制数据');
  if (!mechSrc && deps.机制数据) throw new Error('机制表接线失败：deps 带 机制数据 但未提供 解释器源（opts.解释器源）');
  return 取工厂(calcSrc, autocalcSrc, headerFrag, mechSrc)(deps);
}

module.exports = { createSimulator, 提取header片段 };
