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
function 提取header片段(headerText) {
  const 起 = headerText.indexOf('const cdDifList');
  if (起 === -1) throw new Error('header.js 中未找到 cdDifList，片段提取失败');
  let 止 = headerText.indexOf('\nfunction ', headerText.indexOf('function setCommandCustom') + 10);
  if (止 === -1) 止 = headerText.length;
  return headerText.slice(起, 止);
}

// 工厂体：注入依赖 → header 片段 → 引擎 → 驱动器 → 战斗隔离包装与状态快照
function 工厂体源码(calcSrc, autocalcSrc, headerFrag) {
  return [
    'const getCharacter = deps.getCharacter;',
    'const liberationList = deps.liberationList;',
    'const t = deps.t || function(s){ return s; };',
    'const lang = deps.lang === undefined ? "ko" : deps.lang;',
    'const alert = deps.alert || function(){};',
    'const updateAll = deps.updateAll || function(){};',
    headerFrag,
    ';',
    calcSrc,
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
  command.length = 0;
  boss.element = undefined;
  try { isOverflowed.fill(false); } catch (e) {}
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
  command.length = 0;
  boss.element = undefined;
  try { isOverflowed.fill(false); } catch (e) {}
  GLOBAL_ACT_NUM = 0;
  GLOBAL_COMMAND_LIST = [];                    // 空命令：start() 末尾的 auto() 因 length<65 立即返回，只完成初始化
  GLOBAL_OPTION_LIST = (optionList == null) ? null : optionList;
  GLOBAL_BOND_LIST = bondList;
  boss.maxHp = 10854389981;
  if (bossElement != null && bossElement !== -1) boss.element = bossElement;
  start(idList);                               // 建 5 角色并跑 leader/passive/turnstart；auto() 不消费命令
  if (!comp || comp.length !== 5) return false;
  for (var i = 0; i < 5; i++) if (comp[i] == null) return false;  // N/R 卡等无 hp/atk → setDefault 返回 null
  return true;
}

// 执行一步动作：先 saveCur 压栈再调 do_*；动作非法（角色已行动 / CD 未满却放궁）则立即回滚保持栈平衡并返回 false
function step(idx, act) {
  var c = comp ? comp[idx] : null;
  if (c == null) return false;
  saveCur();
  var ok;
  if (act === '평') ok = do_atk(idx);
  else if (act === '궁') ok = do_ult(idx);
  else if (act === '방') ok = do_def(idx);
  else ok = false;
  if (!ok) { loadBefore(); return false; }     // 非法动作：撤销刚才的压栈，状态不变
  return true;
}

// 回滚一步（弹出最近一次 step 压入的快照）；栈空时 loadBefore 自身安全返回
function undo() { loadBefore(); }

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
function _浅拷字段(src) {
  const o = {};
  for (const k in src) {
    const v = src[k];
    if (typeof v === 'function') continue;
    if (k === 'buff') { o.buff = _拷buff(v || []); continue; }
    o[k] = Array.isArray(v) ? v.slice() : v;
  }
  return o;
}
function _写回字段(dst, o) {
  for (const k in o) {
    if (k === 'buff') { dst.buff = _拷buff(o.buff); continue; }   // 独立副本：引擎后续 push 不污染 snapshot
    dst[k] = Array.isArray(o[k]) ? o[k].slice() : o[k];
  }
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
  GLOBAL_TURN = s.turn; whoActed = s.whoActed; hitAll = s.hitAll; dmg13 = s.dmg13;
  lastDmg = s.lastDmg; lastAddDmg = s.lastAddDmg; lastAtvDmg = s.lastAtvDmg; lastDotDmg = s.lastDotDmg; lastRefDmg = s.lastRefDmg;
  for (let i = 0; i < 5; i++) isOverflowed[i] = s.overflow[i];
  savedData.length = 0;   // 清 step/undo 残留栈：restore 后旧快照全部失效，防误 undo 到陈旧状态
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
function 取工厂(calcSrc, autocalcSrc, headerFrag) {
  const 键 = calcSrc.length + '|' + autocalcSrc.length + '|' + headerFrag.length;
  let 工厂 = 工厂缓存.get(键);
  if (!工厂) {
    工厂 = new Function('deps', 工厂体源码(calcSrc, autocalcSrc, headerFrag));
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
  return 取工厂(calcSrc, autocalcSrc, headerFrag)(deps);
}

module.exports = { createSimulator, 提取header片段 };
