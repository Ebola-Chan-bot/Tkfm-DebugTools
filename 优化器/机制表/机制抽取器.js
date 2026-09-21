'use strict';
/*
 * 机制抽取器（阶段 2）——deobfuscated.js 的 setDefault AST → src DSL JSON（与手工表同形）。
 *
 * 设计原则：
 *   1. **只翻译已验证的 DSL 形态**（4 份手工表覆盖的 + 本文件规则表列出的）；
 *      任何翻译不了的节点 → 残差记录 {id, 钩子, 行号, 骨架, 原因}，绝不猜测、绝不静默跳过。
 *   2. 正确性不靠"看起来像"：抽取表 → 压平 → bin → 双跑 bit-exact（vs 原 setDefault）背书。
 *   3. 归一化选择：switch(L) 抽取为 lib 块序列（而非手工表的 perLib 压缩形）——两者压平后
 *      都是 LibIf…EndIf 序列，语义等价，双跑可证。
 *
 * 用法：
 *   node 机制抽取器.js --id 10012,10141,10177,10188 --out 生成 [--扫描]
 *     --扫描：全部 191 case 只做"可翻译性扫描"（不写表），输出覆盖率与残差聚类报告
 *     --out 生成：把抽取表写到 生成/<id>.json
 *   node 机制抽取器.js --骨架 <正则> —— 打印命中骨架的源码行（调试辅助）
 */
const acorn = require('acorn');
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '..', '..', '逆向-模拟器', 'deobfuscated.js');
const OUT_DIR = path.join(__dirname, '生成');

const 源码 = fs.readFileSync(SRC, 'utf8');
const 行表 = 源码.split('\n');
const ast = acorn.parse(源码, { ecmaVersion: 2022, locations: true });
const sd = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'setDefault');
const [U名, L名] = sd.params.map(p => p.name);
const sw = sd.body.body.find(n => n.type === 'SwitchStatement');
const 角色cases = new Map();   // id → caseNode
for (const c of sw.cases) {
  if (c.test && c.test.type === 'Literal' && /^10\d{3}$/.test(String(c.test.value))) 角色cases.set(c.test.value, c);
}

// ---- 主钩子名（可抽为 DSL 钩子的 13 个；其余属性=异常钩子/谓词/注入）----
const 主钩子 = new Set(['ultbefore', 'ultafter', 'ultimate', 'atkbefore', 'atkafter', 'attack', 'leader', 'passive', 'defense', 'turnstart', 'turnover']);
// 批次E-4：注入方法集（翻注入 方法集 + act_* 变体 + getArmor）——case顶层 U.<名>=function 登记子程序时必须排除（否则会吃掉 hit 注入/getArmor 旗标识别的原路径）
const 注入方法名 = new Set(['ultimate', 'attack', 'defense', 'ultbefore', 'ultafter', 'atkbefore', 'atkafter', 'hit', 'act_attack', 'act_ultimate', 'act_defense', 'getArmor']);
// 标准骨架（与解释器默认钩子同形 → 抽取时省略，不产字段）
const 默认骨架 = {
  ultbefore: '空', ultafter: '空', atkbefore: '空', atkafter: '空', leader: '空', passive: '空',
  ultimate: 'ultLogic', attack: 'atkLogic', defense: 'act_defense', turnstart: '队长空', turnover: '队长空',
};

// ---- 残差收集器 ----
class 残差集 {
  constructor(id) { this.id = id; this.项 = []; }
  加(节点, 原因, 钩子) {
    const 行 = 节点 && 节点.loc ? 节点.loc.start.line : -1;
    this.项.push({ id: this.id, 钩子: 钩子 || '?', 行, 原因, 源码: 行 > 0 ? 行表[行 - 1].trim().slice(0, 120) : '' });
  }
}

// ---- 环境：变量角色表 ----
// 角色：'loop'（for-of 循环变量，comp[V] 或 V.id 有效）/ {const:值}（内联常数）/
//        'temp'（注入快照 temp 变量名）/ {orig:目标,方法}（注入保存的原函数引用）
function 新环境(父) {
  return { 变量: Object.create(父 ? 父.变量 : null), 残差: 父 ? 父.残差 : null, 钩子: 父 ? 父.钩子 : '?', 循环深度: 父 ? 父.循环深度 : 0, 谓词: 父 ? 父.谓词 : new Map(), 注入目标集: 父 ? 父.注入目标集 : null, 局所函数: 父 ? 父.局所函数 : undefined, 局所失败: 父 ? 父.局所失败 : undefined, 子程序: 父 ? 父.子程序 : undefined, argmax死: 父 ? 父.argmax死 : undefined };
}
function 设变量(env, 名, 角色) { env.变量[名] = 角色; }

// ---- 嵌套循环层级（10081 回归修复）----
// 循环变量角色 = {loop:'unit'|'index', 深度:N}；解释器 iStack 是栈：顶=最内层。
// 引用翻译：k = 当前循环深度 - 变量深度；k=0 → '$i'（栈顶）；k≥1 → {'$i上':k}（向上第 k 层，Target.LoopUp）
function 翻循环引用(角色, env, 上下文) {
  if (!角色 || typeof 角色 !== 'object' || !角色.loop) return null;
  const k = (env.循环深度 || 0) - 角色.深度;
  if (k < 0) { env.残差.加({ loc: null }, '循环引用深度异常(' + 上下文 + ')', env.钩子); return undefined; }
  if (k === 0) return '$i';
  if (k > 3) { env.残差.加({ loc: null }, '嵌套循环层级 ' + k + ' 超 ABI 上限 3(' + 上下文 + ')', env.钩子); return undefined; }
  return { '$i上': k };
}
function 查变量(env, 名) { return env.变量[名]; }

// ---- 语法小工具 ----
// 批次C-10a：role/element 枚举名表（与引擎 L? role/element 数组、flatten_core ROLE/ELEMENT 严格同序）
const 职务名 = ['딜', '힐', '탱', '섶', '디'];
const 元素名 = ['화', '수', '풍', '광', '암'];
// 批次C-10b：单位布尔字段读取白名单（抽取器限定；引擎 CmpUnitField 直接 u[fname] 动态读零专属函数）
const 单位字段表 = ['isHealed', 'isHealed2', 'isHealed3', 'turnHeal', 'check', 'stopCd', 'canCDChange', 'canAct', 'stack', 'isFirstTurnActed'];
const 是标识 = (n, 名) => n && n.type === 'Identifier' && n.name === 名;
const 是U = n => 是标识(n, U名);
const 是L = n => 是标识(n, L名);
// 批次E-5c：引擎顶层全局标识符名集合（保守列举；throwRef 识别用——`hpUpAll(c,30)` 的 c 不在 env 变量也不在此集
//   = 未声明标识符，源码 bug 忠实复刻；此集内的合法全局不误判）
const 引擎全局名 = new Set(['comp', 'boss', 'all', 'always', 'myCurAtk', 'myCurShd', 'Math', 'GLOBAL_TURN', 'U', 'L', 'undefined', 'role', 'element', 'buff_ex', 'bossHitTarget']);
// 数字字面量（含一元负号：AST 里 -4 = Unary('-',Literal(4))，acorn 不折叠）；非数字返 undefined
function 数字(n) {
  if (!n) return undefined;
  if (n.type === 'Literal' && typeof n.value === 'number') return n.value;
  if (n.type === 'UnaryExpression' && n.operator === '-' && n.argument.type === 'Literal' && typeof n.argument.value === 'number') return -n.argument.value;
  if (n.type === 'UnaryExpression' && n.operator === '+' && n.argument.type === 'Literal' && typeof n.argument.value === 'number') return n.argument.value;
  return undefined;
}
function 是成员(n, 对象判定, 属性名) {
  return n && n.type === 'MemberExpression' && !n.computed && 对象判定(n.object) && n.property.name === 属性名;
}
function 是调用(n, 名, 元数) {
  return n && n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 名 && (元数 == null || n.arguments.length === 元数);
}
function 块语句列(n) {
  if (!n) return [];
  if (n.type === 'BlockStatement') return n.body.slice();
  return [n];
}
function 字面(n) { return n && n.type === 'Literal' ? n.value : undefined; }

// =============================================
// 谓词收集：识别 U.<名> = function(){ return <buff过滤>.length > 0 } 形态
//   （10141 的 isSANFix = "有 isTurn 且 type==X 的 buff"；约束1：谓词逻辑写死引擎，数据只给 type）
// =============================================
function 收集谓词(caseNode) {
  const 表 = new Map();
  for (const s of caseNode.consequent) {
    // U.<名> = function(){ const V = U.buff.filter(fn); if(V.length>0) return true; else return false }
    // 简化识别：函数体内出现 U.buff.filter(...) 且箭头参数体包含 isTurn(...) && ....type == "S"
    if (s.type !== 'ExpressionStatement' || s.expression.type !== 'AssignmentExpression') continue;
    const a = s.expression;
    if (a.operator !== '=') continue;
    // U.<任意自方法名> = function（是成员第三参必填，这里不限属性名）
    if (!(a.left.type === 'MemberExpression' && !a.left.computed && 是U(a.left.object) && a.left.property.type === 'Identifier')) continue;
    const 名 = a.left.property.name;
    // ⚠ 2026-09-19 修复危险静默吞并 bug：绝不把主钩子/注入方法当谓词。
    //   10058 的 turnover 体内 .find(v=>v.type==X) 被宽松 找谓词type 误判为谓词 → turnover 整段被
    //   主循环 谓词行.has() continue 掉，既没翻译成钩子也没记残差（canCDChange 每回合重置逻辑丢失 → CD 全乱）。
    //   双保险：①主钩子名一律不当谓词（必走钩子翻译）②找谓词type 严格匹配 buff.filter(isTurn&&type==) 结构。
    if (主钩子.has(名)) continue;
    const fn = a.right;
    if (!fn || (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression')) continue;
    const typeStr = 找谓词type(fn);
    if (typeStr != null) 表.set(名, { type: typeStr, 节点: s });
  }
  return 表;
}
// 严格找谓词 type：只认 `U.buff.filter(<lambda>)` 且 lambda 体是 `isTurn(x) && x.type=="S"`（两序均可）的形态。
// ⚠ 不再全树扫任意 `x.type=="S"`——旧实现会把钩子/注入体内 .find(v=>v.type==X) 之类误判成谓词，
//   导致该定义行被主循环当谓词静默跳过（10058 turnover 吞并事故）。匹配不到就返回 null → 定义行走正常翻译或记残差。
function 找谓词type(fn) {
  let 结果 = null;
  (function walkFilter(n) {
    if (!n || typeof n !== 'object' || 结果 != null) return;
    if (n.type === 'CallExpression' && 是buffFilter(n)) {
      const lam = n.arguments[0];
      if (lam && (lam.type === 'ArrowFunctionExpression' || lam.type === 'FunctionExpression')) {
        const t = 取谓词type(lam);
        if (t != null) { 结果 = t; return; }
      }
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) for (const x of v) walkFilter(x);
      else if (v && typeof v === 'object' && v.type) walkFilter(v);
    }
  })(fn.body);
  return 结果;
}
// 是否 U.buff.filter(fn) 形态（基座严格为 U.buff）
function 是buffFilter(n) {
  const c = n.callee;
  return c.type === 'MemberExpression' && c.property.name === 'filter' &&
    c.object.type === 'MemberExpression' && c.object.property.name === 'buff' && 是U(c.object.object);
}
// lambda 体里 isTurn(x) && x.type=="S"（&& 两序均可，允许嵌在 return / 块内）
function 取谓词type(lam) {
  let 结果 = null;
  (function walk(n) {
    if (!n || typeof n !== 'object' || 结果 != null) return;
    if (n.type === 'LogicalExpression' && n.operator === '&&') {
      const s1 = 拆谓词合取(n);
      if (s1) { 结果 = s1; return; }
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) for (const x of v) walk(x);
      else if (v && typeof v === 'object' && v.type) walk(v);
    }
  })(lam.body);
  return 结果;
}
// 拆 (isTurn(x) && type==S) 合取：返回 type 串或 null
function 拆谓词合取(node) {
  const 项 = [];
  (function 平铺(n) {
    if (n.type === 'LogicalExpression' && n.operator === '&&') { 平铺(n.left); 平铺(n.right); }
    else 项.push(n);
  })(node);
  let isTurn参数 = null, typeStr = null;
  for (const it of 项) {
    if (it.type === 'CallExpression' && 是标识(it.callee, 'isTurn') ) {
      isTurn参数 = it.arguments[0] && it.arguments[0].type === 'Identifier' ? it.arguments[0].name : '?';
    } else if (it.type === 'BinaryExpression' && it.operator === '==' && it.right.type === 'Literal' && typeof it.right.value === 'string' && it.left.type === 'MemberExpression' && it.left.property.name === 'type' && it.left.property.type === 'Identifier') {
      typeStr = it.right.value;
    } else if (it.type === 'BinaryExpression' && it.operator === '==' && it.left.type === 'Literal' && typeof it.left.value === 'string' && it.right.type === 'MemberExpression' && it.right.property.name === 'type') {
      typeStr = it.left.value;
    }
  }
  return (isTurn参数 !== null && typeStr !== null) ? typeStr : null;
}

// =============================================
// 诊断：节点→单行骨架（残差报告用）
// =============================================
function 骨架一行(n) {
  if (!n) return ''; 
  try {
    const s = 源码.slice(n.start, n.end).replace(/\s+/g, ' ');
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  } catch (e) { return '<?>'; }
}

// =============================================
// 表达式翻译 → DSL 值（字符串本体/数字/目标引用/always/atkRef）；失败抛 {__残差}
// =============================================
function 残差抛(节点, 原因, env) {
  env.残差.加(节点, '表达式不可翻译: ' + 原因, env.钩子);
  const e = new Error('__残差'); e.__残差 = true; throw e;
}

// 目标翻译：U→self / all→all / boss→boss / comp[V循环]→$i / comp[N]→{comp:N} / V循环→$i
function 翻目标(n, env) {
  if (是U(n)) return 'self';
  if (是标识(n, 'all')) return 'all';
  if (是标识(n, 'boss')) return 'boss';
  if (是标识(n, 'bossHitTarget')) return 'bossHitTarget';   // 批次C-10b：引擎常量对象（10196）
  if (n.type === 'Identifier') {
    const 角色 = 查变量(env, n.name);
    if (角色 && 角色.lowestHp) return 'lowestHp';   // 批次B：reduce 最低hp绑定变量→目标
    if (角色 && 角色.find !== undefined) return { find: 角色.find };   // 批次B2：find槽单位（TempUnit）
    // 循环变量（单位/下标同值：iStack 存单位对象）→ 层级感知引用 '$i' | {'$i上':k}
    const lr = 翻循环引用(角色, env, '目标');
    if (lr !== null) {
      if (lr === undefined) { const e = new Error('残差'); e.__残差 = true; throw e; }
      return lr;
    }
    // 批次E-4：形参绑定到目标表达式实参（subTgtNode）→ 延迟解析实节点（U/all/boss/comp[N]）
    if (角色 && 角色.subTgtNode) return 翻目标(角色.subTgtNode, env);
    残差抛(n, '未知标识符 ' + n.name, env);
  }
  if (n.type === 'MemberExpression' && !n.computed && 是标识(n.object, 'comp') && n.property.type === 'Literal') {
    return { comp: n.property.value };   // comp[4] 等固定位（10188 大量使用）
  }
  if (n.type === 'MemberExpression' && n.computed && 是标识(n.object, 'comp')) {
    if (n.property.type === 'Literal' && typeof n.property.value === 'number') return { comp: n.property.value };   // comp[4] 固定位（computed 形态）
    const 角色 = 查变量(env, n.property.name);
    // 批次E-5b：comp[W]，W=findMaxUnit 结果槽绑定（10138 `atbf(comp[W],…,comp[W2],…)`）→ TempUnit 槽目标
    if (角色 && 角色.find !== undefined && 角色.findMax) return { find: 角色.find };
    const lr = 翻循环引用(角色, env, 'comp[V]目标');
    if (lr !== null) {
      if (lr === undefined) { const e = new Error('残差'); e.__残差 = true; throw e; }
      return lr;
    }
  }
  残差抛(n, '目标形态 ' + 骨架一行(n), env);
}

// 值翻译（buff 参数等）：字面量/always/myCurAtk引用/布尔
function 翻值(n, env, 上下文) {
  if (n.type === 'Literal') {
    if (typeof n.value === 'string') return n.value;          // 魔法串/名字直接进字典
    if (typeof n.value === 'number') return n.value;          // 数值→压平器定点
    if (typeof n.value === 'boolean') return n.value;         // on/off
    残差抛(n, '字面量类型 ' + typeof n.value, env);
  }
  if (是标识(n, 'always')) return 'always';
  if (是标识(n, 'bossHitTarget')) return 'bossHitTarget';   // 批次C-10b：引擎常量对象 {id:0,name:"타깃"}（10196 atbf 目标参）
  { const 数 = 数字(n); if (数 !== undefined) return 数; }   // 含一元负号（cdChange(u,-4)/tbf(…,-500,…)）
  if (是标识(n, 'all') || 是U(n) || 是标识(n, 'boss')) return 翻目标(n, env);
  if (n.type === 'Identifier') {
    const 角色 = 查变量(env, n.name);
    const lr = 翻循环引用(角色, env, '值');
    if (lr !== null) {
      if (lr === undefined) { const e = new Error('残差'); e.__残差 = true; throw e; }
      return lr;
    }
    if (角色 && 角色.lowestHp) return 'lowestHp';   // 批次B：值位最低hp目标
    if (角色 && 角色.find !== undefined) return { find: 角色.find };   // 批次B2：值位 find槽（atbf 目标参等）
    // 批次C-4：计数绑定变量进值位（10211 leader `const V=getElementCnt("광"); nbf(…,V,5)`）→ CountVal。
    //   钩子执行期内 comp 的 role/element 不变 → 与条件位同款内联还原，bit 一致（执行期现算，非编译期固化）
    if (角色 && 角色.countCall) return { countVal: { fn: 角色.countCall.fn, mask: 角色.countCall.mask } };
    if (角色 && 角色.const !== undefined) return 角色.const;   // 内联常量
    if (角色 && 角色.temp) {
      // 批次E-2b：数值 temp 进值位 → TempVal（10097 hpUpAll(V) / 10139 nbf(…,V,4)）；非数值 temp（快照型）仍残差
      if (角色.tempNum) return { tempVal: 角色.temp };
      env.残差.加(n, 'temp变量进值位(DSL未支持)', env.钩子); 残差抛(n, 'temp值位', env);
    }
    残差抛(n, '未知标识符 ' + n.name, env);
  }
  if (n.type === 'MemberExpression' && !n.computed && 是标识(n.object, 'comp') && n.property.type === 'Literal') return { comp: n.property.value };
  // 批次C-3：U.stack 裸成员进值位（setBuffNest(u,div,name,U.stack)，10095 attack）→ SlotRef（encVal 既有路径：{slot:'stack'}）
  if (是成员(n, 是U, 'stack')) return { slot: 'stack' };
  if (n.type === 'MemberExpression' && n.computed && 是标识(n.object, 'comp')) {
    if (n.property.type === 'Literal' && typeof n.property.value === 'number') return { comp: n.property.value };   // comp[4]（computed 数字下标，10188 大量使用）
    const r = 查变量(env, n.property.name);
    // 批次E-5b：值位 comp[W]（W=findMaxUnit 槽；10138 `atbf(…,comp[W],…)` 目标参）→ TempUnit 槽
    if (r && r.find !== undefined && r.findMax) return { find: r.find };
    const lr = 翻循环引用(r, env, 'comp[V]值');
    if (lr !== null) {
      if (lr === undefined) { const e = new Error('残差'); e.__残差 = true; throw e; }
      return lr;
    }
  }
  // <base>.hp * N [* armorUp(base,act,mode)] 动态尺寸（源码 112 处）
  const hp = 翻hpExpr(n, env);
  if (hp) return { hpExpr: hp };
  // 批次C-3：setBuffSize 动态 size 表达式（源码 11 处）：stack*K / getNest("S")*K / (stack+add)*K / (L+add)*K
  const sz = 翻sizeExpr(n, env);
  if (sz) return { sizeExpr: sz };
  // 批次C-8：值位 min-clamp 三元（10130：stack+1>10?10:stack+1 = min(stack+1,10)）
  const mc = 翻minClampExpr(n, env);
  if (mc) return mc;
  // 批次C-4：计数函数直接调用进值位（10155 nbf turn=getElementCnt("화")）→ {countVal:{fn,mask}}（Tag.CountVal）
  if (n.type === 'CallExpression' && n.callee.type === 'Identifier' &&
      (n.callee.name === 'getRoleCnt' || n.callee.name === 'getElementCnt') &&
      n.arguments.length >= 1 && n.arguments.every(a => typeof 字面(a) === 'string')) {
    return { countVal: { fn: n.callee.name, mask: n.arguments.map(a => 字面(a)) } };
  }
  // 批次E-2b：buffNestByType(U,"T") * K 值位（10138 `buffNestByType(U,"<파티 사회자>")*7.5`；K 可小数→ExprNestByType 定点）
  if (n.type === 'BinaryExpression' && n.operator === '*' && 是调用(n.left, 'buffNestByType', 2) && 是U(n.left.arguments[0]) && typeof 字面(n.left.arguments[1]) === 'string') {
    const K = 数字(n.right);
    if (K !== undefined && K !== 0) return { nestByTypeVal: { type: 字面(n.left.arguments[1]), K } };
  }
  // 批次E-2b：名字典串+循环下标拼接 `"…"+V`（10165 turnstart `"<날개형 유도탄>"+V`，V=栈顶层循环下标）→ NameCat
  if (n.type === 'BinaryExpression' && n.operator === '+' && n.left.type === 'Literal' && typeof n.left.value === 'string' && n.right.type === 'Identifier') {
    const 角V = 查变量(env, n.right.name);
    if (角V && 角V.loop === 'index' && (env.循环深度 || 0) - 角V.深度 === 0) return { nameCat: { 串: n.left.value, 模式: 'k' } };
  }
  // 批次E-2a：裸星级加法值位 L±add（10157 nbf nest / buff turn = _0x78c5e1+5）→ 复用 ExprSize base=星级 K=1（值=ctx.lib+add）。
  //   纯抽取器新增：翻hpExpr/翻sizeExpr 都要求 *，此形态是裸 + 故先前全落残差；解释器 ExprSize base=2 已实现 (lib+加)*K。
  if (n.type === 'BinaryExpression' && (n.operator === '+' || n.operator === '-') && 是L(n.left)) {
    const off = 数字(n.right);
    if (off !== undefined && Number.isInteger(off)) {
      const 加 = n.operator === '-' ? -off : off;
      if (加 >= -128 && 加 <= 127) return { sizeExpr: { base: '星级', 加, K: 1 } };
    }
  }
  // 批次E-2a：*1 恒等剥离（10138 passive getRoleCnt("섶")*1 → CountVal）：任何未被上面识别的 *1 剥掉右乘 1 递归翻左
  if (n.type === 'BinaryExpression' && n.operator === '*' && 数字(n.right) === 1) return 翻值(n.left, env, 上下文);
  // 批次E-5b：对象×数 → NaN 忠实复刻（10138 L8888 `comp[W]*30`，W=手卷 argmax 槽绑定——单位对象×30=NaN，
  //   源码 bug 形态：NaN 进 buff.size → 아머计算 NaN；严格限定基座=comp[findMax槽] 不误吞其它乘法）
  if (n.type === 'BinaryExpression' && n.operator === '*' && 数字(n.right) !== undefined &&
      n.left.type === 'MemberExpression' && n.left.computed && 是标识(n.left.object, 'comp') && n.left.property.type === 'Identifier') {
    const 角M = 查变量(env, n.left.property.name);
    if (角M && 角M.find !== undefined && 角M.findMax) return { NaNVal: true };
  }
  // 批次E-2b：myCurAtk + comp[N].id + 常数（10135 全库唯一 `myCurAtk+comp[2].id+10`）→ ExprAtkComp（独立 Tag；
  //   bit27 与 myCurShd 冲突、bits24-26 与 armor 模式冲突，故不进 atkRef）。comp[N] 是固定数字下标（非循环变量——
  //   循环变量 comp[V].id 已由 翻atkRef 的 +$iId 处理）；遍历 + 链收集 prefix/compN/常数，各恰好一个
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    const 链 = { prefix: 0, compN: -1, 常数: 0, 它: false };
    const 走链 = x => {
      if (x.type === 'BinaryExpression' && x.operator === '+') { 走链(x.left); 走链(x.right); return; }
      if (是标识(x, 'myCurAtk')) { 链.prefix++; return; }
      if (x.type === 'MemberExpression' && !x.computed && x.property.name === 'id' &&
          x.object.type === 'MemberExpression' && x.object.computed && 是标识(x.object.object, 'comp') &&
          x.object.property.type === 'Literal' && typeof x.object.property.value === 'number' && x.object.property.value >= 0 && x.object.property.value <= 4) {
        if (链.compN < 0) { 链.compN = x.object.property.value; return; } 链.它 = true; return;
      }
      const num = 数字(x);
      if (num !== undefined) { 链.常数 += num; return; }
      链.它 = true;
    };
    走链(n);
    if (!链.它 && 链.prefix === 1 && 链.compN >= 0) return { atkComp: { compN: 链.compN, 常数: 链.常数 } };
  }
  // myCurAtk/myCurShd + id + N 拼接链
  const ref = 翻atkRef(n, env);
  if (ref) return { atkRef: ref };
  残差抛(n, 上下文 + ' 值形态 ' + 骨架一行(n), env);
}

// 批次C-3：动态 size 表达式 → {base,加,K,型?}；非此形态返 null（调用方继续 atkRef/残差）。
//   全库四形态（基座限 self=U）：
//   ① U.stack * K（10095/10153 各两处）② U.getNest("형") * K（10095）
//   ③ (U.stack + add) * K（10126 三处）④ (L + add) * K（10153 星级，L=setDefault第2参）
//   base 枚举：0=stack / 1=getNest(型) / 2=星级；加=整数偏移（可 0）；K=正整数乘子。
//   值域约束（ExprSize 位域，见 schema）：K∈1..1023（10bit）、加∈-128..127（8bit 有符号）。
function 翻sizeExpr(n, env) {
  if (n.type !== 'BinaryExpression' || n.operator !== '*') return null;
  const K = 数字(n.right);
  if (K === undefined || !Number.isInteger(K) || K < 1 || K > 1023) return null;
  const 左 = n.left;
  // 基座直接：U.stack / U.getNest("S") / L
  const 基座解析 = x => {
    if (是成员(x, 是U, 'stack')) return { base: 'stack', 加: 0 };
    if (x.type === 'CallExpression' && 是成员(x.callee, 是U, 'getNest') && x.arguments.length === 1 && typeof 字面(x.arguments[0]) === 'string') return { base: 'getNest', 加: 0, 型: 字面(x.arguments[0]) };
    // 批次E-4：基座=temp 快照变量（10170 tmpfunc `const V=U.stack; setBuffSize(U,div,name,V*10)`；V 只读不改→值=tempVars[槽]）→ ExprSize base=temp（_pad2=temp名字典）
    if (x.type === 'Identifier') { const 角T = 查变量(env, x.name); if (角T && 角T.temp && !角T.tempNum) return { base: 'temp', 加: 0, temp: 角T.temp }; }
    return null;
  };
  let b = 基座解析(左);
  if (b) return { base: b.base, 加: b.加, K, ...(b.型 !== undefined ? { 型: b.型 } : {}), ...(b.temp !== undefined ? { temp: b.temp } : {}) };
  // (左 + add) 形态：左∈{U.stack, U.getNest, L}，add=整数字面
  if (左.type === 'BinaryExpression' && 左.operator === '+') {
    const 加 = 数字(左.right);
    if (加 === undefined || !Number.isInteger(加) || 加 < -128 || 加 > 127) return null;
    if (是成员(左.left, 是U, 'stack')) return { base: 'stack', 加, K };
    // (L + add)：星级基座（10153 (_0x78c5e1+5)*30）
    if (是L(左.left)) return { base: '星级', 加, K };
  }
  return null;
}

// 批次C-8：值位 min-clamp 三元式 `X > cap ? cap : X`（X=U.stack+add；10130 全库唯一：
//   setBuffNest(…, stack+1>10?10:stack+1) = min(stack+1,10)）→ {sizeMinClamp:{加,cap}}；非此形态返 null
function 翻minClampExpr(n, env) {
  if (n.type !== 'ConditionalExpression') return null;
  const t = n.test;
  if (!(t.type === 'BinaryExpression' && t.operator === '>' && 数字(t.right) !== undefined)) return null;
  const cap = 数字(t.right);
  if (!Number.isInteger(cap) || cap < 1 || cap > 1023) return null;
  // X 两侧同构：U.stack 或 U.stack+add
  const 拆加 = x => {
    if (是成员(x, 是U, 'stack')) return 0;
    if (x.type === 'BinaryExpression' && x.operator === '+' && 是成员(x.left, 是U, 'stack')) {
      const 加 = 数字(x.right);
      if (加 !== undefined && Number.isInteger(加) && 加 >= -128 && 加 <= 127) return 加;
    }
    return null;
  };
  const 加1 = 拆加(t.left), 加2 = 拆加(n.alternate);
  if (加1 === null || 加2 === null || 加1 !== 加2) return null;
  if (数字(n.consequent) !== cap) return null;   // 真分支必须=cap（min 语义）
  return { sizeMinClamp: { 加: 加1, cap } };
}

// hpExpr：<base>.hp * N [* armorUp(base,"act","mode")] → {base,N,armorUp?}；非此形态返 null（调用方走残差）
//   base 解析：U→'self'；loopUnit 变量/comp[loop|loopIdx]→'$i'；armorUp 第1参必须与 base 同源（源码 112 处全同）
function 翻hpExpr(n, env) {
  if (n.type !== 'BinaryExpression' || n.operator !== '*') return null;
  const ACT = new Set(['궁', '평', '방']), MODE = new Set(['추가', '발동']);
  const 基座解析 = x => {
    if (是U(x)) return 'self';
    if (x.type === 'Identifier') {
      const 角色2 = 查变量(env, x.name);
      if (角色2 && 角色2.lowestHp) return 'lowestHp';   // 批次B：reduce最低hp绑定变量（10062 V.hp*20）
      const lr = 翻循环引用(角色2, env, 'hpExpr'); if (lr === '$i') return '$i'; if (lr !== null && lr !== undefined) return lr;
    }
    if (x.type === 'MemberExpression' && x.computed && 是标识(x.object, 'comp')) {
      // 批次E-2b：comp[N] 固定位（10140 leader `comp[0].hp*100`）→ {compN:N}（ExprHp base=4哨兵+_pad2 compN）
      if (x.property.type === 'Literal' && typeof x.property.value === 'number' && x.property.value >= 0 && x.property.value <= 4) return { compN: x.property.value };
      const lr = 翻循环引用(查变量(env, x.property.name), env, 'hpExpr');
      if (lr === '$i') return '$i';
      if (lr !== null && lr !== undefined) return lr;   // 嵌套层级：ExprHp base 编码仅支持 self/$i → 上层报残差
      return null;
      }
    return null;
  };
  let hpNode = n, armorNode = null;
  // 外层 (hp*N) * armorUp(…)：左结合
  if (是调用(n.right, 'armorUp', 3)) {
    armorNode = n.right;
    hpNode = n.left;
    if (hpNode.type !== 'BinaryExpression' || hpNode.operator !== '*') return null;
  }
  // 批次E-2b：hpNode 左部可以是 <base>.getCurAtk() 方法调用（10133 `U.getCurAtk()*25*armorUp`；基类返0运行时子类覆盖真实攻击含buff乘区，非 .atk 字段）
  let 字段 = null, base节点 = null;
  if (hpNode.left.type === 'CallExpression' && hpNode.left.arguments.length === 0 &&
      hpNode.left.callee.type === 'MemberExpression' && !hpNode.left.callee.computed && hpNode.left.callee.property.name === 'getCurAtk') {
    字段 = 'curAtk'; base节点 = hpNode.left.callee.object;
  } else if (hpNode.left.type === 'MemberExpression' && !hpNode.left.computed && (hpNode.left.property.name === 'hp' || hpNode.left.property.name === 'atk')) {
    字段 = hpNode.left.property.name; base节点 = hpNode.left.object;
  } else return null;
  const N = 数字(hpNode.right);
  if (N === undefined || N <= 0) return null;
  const base = 基座解析(base节点);
  if (!base) return null;
  // compN 固定位 base 不支持 armorUp（encHpExpr 亦拒；源码 10140 无 armorUp）
  if (base && typeof base === 'object' && base.compN !== undefined) {
    if (armorNode || 字段 !== 'hp') return null;
    return { base: 'compN', compN: base.compN, N };
  }
  const out = { base, N };
  if (字段 === 'atk') out.field = 'atk';   // 缺省 hp（向后兼容既有表）
  else if (字段 === 'curAtk') out.field = 'curAtk';   // 批次E-2b：getCurAtk() 方法（fieldExt=2）
  if (armorNode) {
    const aArg = armorNode.arguments;
    const act = 字面(aArg[1]), mode = 字面(aArg[2]);
    if (!ACT.has(act) || !MODE.has(mode)) return null;
    // armorUp 基座：同源常规；异源仅允许 (hp=$i, armor=self) 组合（全库 2 处：10034/10035 ultafter
    //   `V.hp*15*armorUp(U,"궁","추가")`）→ base 编为 8（异源哨兵），其余异源形态走残差
    const aBase = 基座解析(aArg[0]);
    if (aBase !== base) {
      if (!(base === '$i' && aBase === 'self')) return null;
      out.base = '$i异源self';
    }
    out.armorUp = { act, mode };
  }
  return out;
}

// atkRef 链：myCurAtk + <id源…> + <常数>（左结合 BinaryExpression + 链；常数可在任意位置——源码常数在尾）
// 返回 DSL 数组 ["myCurAtk"|"myCurShd", "+selfId"|"+$iId"…|N…]；任何非已知链 → null（调用方走残差）
function 翻atkRef(n, env) {
  if (n.type !== 'BinaryExpression' || n.operator !== '+') return null;
  const 段s = [];
  let ok = true;
  const 展 = x => {
    if (!ok) return;
    if (x.type === 'BinaryExpression' && x.operator === '+') { 展(x.left); 展(x.right); return; }
    if (是标识(x, 'myCurAtk')) { if (段s.length === 0) 段s.push('myCurAtk'); else ok = false; return; }
    if (是标识(x, 'myCurShd')) { if (段s.length === 0) 段s.push('myCurShd'); else ok = false; return; }
    if (是成员(x, 是U, 'id')) { 段s.push('+selfId'); return; }
    // <目标>.id：基座（loopUnit 单位变量 / comp[loop下标] / self）经 翻目标 解析；结果 $i → +$iId
    if (x.type === 'MemberExpression' && !x.computed && x.property.name === 'id') {
      let 目;
      try { 目 = 翻目标(x.object, env); } catch (e) { if (!e.__残差) throw e; }
      if (目 === '$i') { 段s.push('+$iId'); return; }
      if (目 && 目['$i上'] !== undefined) { 段s.push({ '+$iId上': 目['$i上'] }); return; }   // 嵌套循环源 id
      if (目 && 目.find !== undefined) { 段s.push({ '+findId': 目.find }); return; }   // 批次B2：find槽单位 id（10052 myCurAtk+V.id+100）
      if (目 === 'self') { 段s.push('+selfId'); return; }
      ok = false; return;
    }
    // armorUp(base,act,mode) * K 乘子段（批次B2：全库 9 处，均为 base=self/act∈궁평방/mode∈추가발동/K 正整数）
    //   AST 方向 = armorUp(…) 在左、K 在右（源码 `myCurAtk + U.id + armorUp(U,"평","추가") * 50`）
    if (x.type === 'BinaryExpression' && x.operator === '*' && 是调用(x.left, 'armorUp', 3)) {
      const K = 数字(x.right);
      const aArg = x.left.arguments;
      const act = 字面(aArg[1]), mode = 字面(aArg[2]);
      if (K !== undefined && Number.isInteger(K) && K >= 1 && K <= 65535 &&
          ['궁', '평', '방'].includes(act) && ['추가', '발동'].includes(mode) && 是U(aArg[0])) {
        段s.push({ armor乘子: { act, mode, K } }); return;
      }
      ok = false; return;
    }
    const 数 = 数字(x);
    if (数 !== undefined) { 段s.push(数); return; }
    ok = false;
  };
  展(n);
  if (!ok || 段s.length === 0) return null;
  return 段s;
}

// =============================================
// 语句翻译（指令级）→ DSL 指令对象或 null（残差已记录）
// =============================================
function 翻语句(n, env) {
  if (!n) return null;
  // U.<钩子> = function(){…} / U.<属性> = function/值
  if (n.type === 'ExpressionStatement') return 翻表达式语句(n.expression, env);
  if (n.type === 'VariableDeclaration') return 翻变量声明(n, env);
  // 批次C-9：局部函数声明（嵌在 if/for 块内时经递归到达这里；顶层声明由 翻钩子体 循环直接跳过）。
  //   成功→预扫已译存 env.局所函数（声明点无指令，同 hoisting）；失败→记残差返 null（防静默吞——谓词 bug 教训）
  if (n.type === 'FunctionDeclaration') {
    if (env.局所失败 && env.局所失败.has(n)) { env.残差.加(n, '局部函数不可译(或带参): ' + (n.id ? n.id.name : '匿名'), env.钩子); return null; }
    return { __空: true };
  }
  if (n.type === 'IfStatement') {
    // 高频形态（源码66处）：if(U.stack > N){U.stack=N} → clampSlot [null,N]；if(U.stack < N){…=N} → [N,null]
    const clamp = 翻clamp(n);
    if (clamp !== undefined) return clamp;   // null=形态像但翻译失败(已记残差)；undefined=非此形态
    // 批次E-2b：数值 temp 上限钳（10139 if(V>4){V=4}）→ clampTemp（须在下行——V=N 单赋值也要路由）
    const clt = 翻clampTemp(n, env);
    if (clt !== undefined) return clt;
    // 批次E-2b：if(U.curCd>U.cd){U.curCd=U.cd}（10008 turnstart 全库唯一）→ 直译 op（不做等价推理）
    {
      const t8 = n.test;
      if (t8 && t8.type === 'BinaryExpression' && t8.operator === '>' && 是成员(t8.left, 是U, 'curCd') && 是成员(t8.right, 是U, 'cd') && !n.alternate) {
        const 体8 = 块语句列(n.consequent);
        if (体8.length === 1 && 体8[0].type === 'ExpressionStatement') {
          const a8 = 体8[0].expression;
          if (a8 && a8.type === 'AssignmentExpression' && a8.operator === '=' && 是成员(a8.left, 是U, 'curCd') && 是成员(a8.right, 是U, 'cd')) {
            return { clampCurCdToCd: 'self' };
          }
        }
      }
    }
    const 残差标记 = env.残差.项.length;   // 批次C-10b：OR 展开的残差事务（整条件失败后回滚，逐项重试记精确残差）
    let guards = 翻条件(n.test, env);
    if (guards === null && n.test.type === 'LogicalExpression' && n.test.operator === '||') {
      // 批次C-10b：OR/DeMorgan 通用展开（零 schema 改动）：`if(A||B) T else E` ≡ `if(A){T} else if(B){T} else {E}`。
      //   等价性：条件全纯（无副作用）+ 短路语义一致（A 真则 B 不求值——CmpRandom 的 Math.random() 调用次数
      //   两侧也逐位一致，因为两引擎走同一分支路径）。先让 翻条件 整体试（GT/el/slot/role 相等集合已归一 in 位集，
      //   命中则不展开——避免集合形态被拆成 T 复制多份的 cmd 膨胀）；整体失败→回滚残差→逐项拆 OR 重试。
      env.残差.项.length = 残差标记;
      const OR项 = [];
      const 平OR = x => { if (x.type === 'LogicalExpression' && x.operator === '||') { 平OR(x.left); 平OR(x.right); } else OR项.push(x); };
      平OR(n.test);
      if (OR项.length >= 2) {
        const guards列 = [];
        let 全成 = true;
        for (const t of OR项) {
          const g = 翻条件(t, env);
          if (g === null) { 全成 = false; break; }   // 失败项残差已记（比整条件笼统残差更精确），不回滚
          guards列.push(Array.isArray(g) ? g : [g]);
        }
        if (全成) {
          // 构建 elif 链 DSL：then 只翻一次复用（纯指令列对象，flatten 各分支独立编译）；AND 多守卫段内嵌套包裹，
          //   每层 else 都挂"续"（本段之后所有段的 else 体）——外层 guard 假 = 整条件假 = 走续，语义严格等价
          const then1 = 翻语句列(块语句列(n.consequent), env);
          if (!then1) return null;
          let 续 = null;
          if (n.alternate) {
            if (n.alternate.type === 'IfStatement') {
              const elif内 = 翻语句(n.alternate, env);
              if (!elif内) return null;
              续 = [elif内];
            } else {
              const els = 翻语句列(块语句列(n.alternate), env);
              if (!els) return null;
              续 = els.length ? els : null;
            }
          }
          for (let oi = guards列.length - 1; oi >= 0; oi--) {
            const gs = guards列[oi];
            let blk = { if: gs[gs.length - 1], then: then1 };
            if (续) blk.else = 续;
            for (let gi = gs.length - 2; gi >= 0; gi--) {
              blk = { if: gs[gi], then: [blk] };
              if (续) blk.else = 续;
            }
            续 = [blk];
          }
          return 续[0];
        }
      } else {
        // 单项 OR（异常形态）：残差已被回滚，重记整条件残差
        env.残差.加(n.test, 'if条件不可翻译: ' + 骨架一行(n.test), env.钩子);
        return null;
      }
    }
    if (guards === null) { env.残差.加(n.test, 'if条件不可翻译: ' + 骨架一行(n.test), env.钩子); return null; }
    if (!Array.isArray(guards)) guards = [guards];
    const 本段 = (cond) => {
      const then = 翻语句列(块语句列(n.consequent), env);
      if (!then) return null;
      const 块 = { if: cond, then };
      if (n.alternate) {
        if (n.alternate.type === 'IfStatement') {
          const elif内 = 翻语句(n.alternate, env);   // else if → 递归成 if 块，归入 elif 链
          if (!elif内) return null;
          块.elif = [elif内];
        } else {
          const els = 翻语句列(块语句列(n.alternate), env);
          if (!els) return null;
          if (els.length) 块.else = els;
        }
      }
      return 块;
    };
    // && 多守卫：由内而外包嵌套 if（内层带 then/else，语义 = 任一 guard 假走 else 链）
    let 结果 = 本段(guards[guards.length - 1]);
    if (!结果) return null;
    for (let gi = guards.length - 2; gi >= 0; gi--) 结果 = { if: guards[gi], then: [结果] };
    return 结果;
  }
  if (n.type === 'ForOfStatement') return 翻for(n, env);
  if (n.type === 'ForStatement') {
    // 批次E-5b：手卷 argmax/argmin 循环（10138 leader）先于常规 Cfor 识别
    const am = 翻手卷argmax(n, env);
    if (am !== undefined) return am;
    return 翻Cfor(n, env);
  }
  if (n.type === 'SwitchStatement') return 翻switchLib(n, env);
  if (n.type === 'BreakStatement') { env.残差.加(n, 'break(非switch内)', env.钩子); return null; }
  // 批次C-2：通用 continue（源码只出现在 for 体内；排除self形态已先被 归一排除self 提前剔除不会到这里）。
  //   译成 {continue:1} → Explain器 Continue op：置 ctx.__cont 信号，__mech_执行段 逐步检查并中断，最近 For 消费后下一单元。
  if (n.type === 'ContinueStatement') return { continue: 1 };
  if (n.type === 'ReturnStatement') { /* case 尾 return U → 略 */ return null; }
  if (n.type === 'BlockStatement') { const 内 = 翻语句列(n.body, env); return 内 && 内.length === 1 ? 内[0] : (内 ? { 块: 内 } : null); }
  if (n.type === 'EmptyStatement') return null;
  env.残差.加(n, '语句类型 ' + n.type, env.钩子);
  return null;
}

function 翻语句列(列, env) {
  const out = [];
  for (const s of 列) {
    if (s.type === 'ReturnStatement' && 是U(s.argument)) continue;   // case 尾 return U
    const r = 翻语句(s, env);
    if (r === null) {
      if (s.type === 'EmptyStatement') continue;
      if (s.type === 'ReturnStatement' && 是U(s.argument)) continue;
      return null;   // 残差已记
    }
    if (r.__空) continue;   // 故意不产指令的绑定（orig 保存/内联常量）
    if (r.块) out.push(...r.块); else out.push(r);
  }
  return out;
}

// ---- 表达式语句：buff 族调用 / U.方法() / 赋值 / boss.def=false ----
function 翻表达式语句(e, env) {
  // 裸调用：tbf(…) / setBuffOn(…) / cdChange(…) / hpUpAll(…) / ultLogic(…) / atkLogic(…)
  if (e.type === 'CallExpression') return 翻调用语句(e, env);
  // 赋值
  if (e.type === 'AssignmentExpression') return 翻赋值语句(e, env);
  // 自增/自减：U.stack++ / -= N
  if (e.type === 'UpdateExpression') {
    if (是成员(e.argument, 是U, 'stack')) {
      return { addSlot: ['stack', e.operator === '++' ? 1 : -1] };
    }
    // 批次E-2b：数值 temp 自增 `V++`（10160 leader）→ AddTemp ±1
    if (e.argument.type === 'Identifier' && ['++', '--'].includes(e.operator)) {
      const 角U2 = 查变量(env, e.argument.name);
      if (角U2 && 角U2.tempNum) return { addTemp: [角U2.temp, e.operator === '--' ? -1 : 1] };
    }
    env.残差.加(e, 'Update形态 ' + 骨架一行(e), env.钩子);
    return null;
  }
  env.残差.加(e, '表达式语句 ' + e.type, env.钩子);
  return null;
}

// 裸调用语句（buff 族/属性族/骨架动作）
function 翻调用语句(e, env) {
  const callee = e.callee, args = e.arguments;
  // 批次C-9：局部函数调用 V() → 内联块（预扫在 翻钩子体；声明不在本作用域→落回下方引擎函数判定→残差，不静默）
  if (callee.type === 'Identifier' && args.length === 0 && env.局所函数 && env.局所函数.has(callee.name)) {
    return { 块: env.局所函数.get(callee.name) };
  }
  if (callee.type === 'Identifier') {
    const 名 = callee.name;
    const buff族 = { tbf: 5, nbf: 6, atbf: 8, anbf: 9, ptbf: 8, pnbf: 9, buff: -1 };
    if (名 in buff族) {
      const 期 = buff族[名];
      if (期 !== -1 && args.length !== 期) { env.残差.加(e, `${名} 参数数 ${args.length}≠${期}`, env.钩子); return null; }
      if (名 === 'tbf') {
        // 具名形：{tbf:目标,type,size,name,turn}
        try {
          return { tbf: 翻目标(args[0], env), type: 翻值(args[1], env, 'tbf.type'), size: 翻值(args[2], env, 'tbf.size'), name: 翻值(args[3], env, 'tbf.name'), turn: 翻值(args[4], env, 'tbf.turn') };
        } catch (err) { if (err.__残差) return null; throw err; }
      }
      // 定位形：{名: [目标, …]}
      try { const arr = args.map(a => 翻值(a, env, 名 + '[]')); return { [名]: arr }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (名 === 'hpUpAll' && args.length === 1) {
      try { return { hpUpAll: 翻值(args[0], env, 'hpUpAll') }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    // 批次E-5c：`hpUpAll(c, 30)`（10089 leader 全库唯一）——c 全文件未声明（反混淆残留），源码 bug：
    //   非严格模式读未声明变量在实参求值期即抛 ReferenceError（hpUpAll 根本不会被调用）→ {throwRef:'c'}
    //   忠实复刻（决策：数据化目标=bit-exact 复刻源码行为含 bug，不做 hpUpAll(30) 语义猜测）；
    //   严格限定：首参=未绑定且非引擎全局的 Identifier 才识别，其它 2 参形态仍走残差
    if (名 === 'hpUpAll' && args.length === 2 && args[0].type === 'Identifier' &&
        !查变量(env, args[0].name) && !引擎全局名.has(args[0].name)) {
      return { throwRef: args[0].name };
    }
    if (名 === 'cdChange' && args.length === 2) {
      try {
        const 目 = 翻目标(args[0], env);
        let 值;
        if (args[1].type === 'ConditionalExpression') 值 = 翻三元cd(args[1], env);
        else 值 = 翻值(args[1], env, 'cdChange.值');
        return { cdChange: 目, 值 };
      } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (名 === 'setBuffOn' && args.length === 4) {
      try {
        return { setBuffOn: 翻目标(args[0], env), div: 翻值(args[1], env, 'div'), name: 翻值(args[2], env, 'name'), on: 翻开关值(args[3], env) };
      } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (名 === 'setBuffOnAll' && args.length === 4) {
      try {
        return { setBuffOnAll: 翻目标(args[0], env), div: 翻值(args[1], env, 'div'), name: 翻值(args[2], env, 'name'), on: 翻开关值(args[3], env) };
      } catch (err) { if (err.__残差) return null; throw err; }
    }
    // 批次E-4：setBuffOnExtra(u,act,div,name,on)（引擎 find(div==arg2&&name==arg3&&div!="기본"&&act==arg1).on=arg4；10158 子程序体全库唯一）
    if (名 === 'setBuffOnExtra' && args.length === 5) {
      try {
        return { setBuffOnExtra: 翻目标(args[0], env), act: 翻值(args[1], env, 'act'), div: 翻值(args[2], env, 'div'), name: 翻值(args[3], env, 'name'), on: 翻开关值(args[4], env) };
      } catch (err) { if (err.__残差) return null; throw err; }
    }
    if ((名 === 'setBuffSize' || 名 === 'setBuffSizeAll' || 名 === 'setBuffNest') && args.length === 4) {
      try {
        return { [名]: 翻目标(args[0], env), div: 翻值(args[1], env, 'div'), name: 翻值(args[2], env, 'name'), [名 === 'setBuffNest' ? 'nest' : 'size']: 翻值(args[3], env, 名 + '.值') };
      } catch (err) { if (err.__残差) return null; throw err; }
    }
    // 批次C-4：setBuffSizeUp(u,div,name,N)（引擎=find(div+name)后 size+=N，与 setBuffSize 仅 =/+= 之别；10131 全库唯一）
    if (名 === 'setBuffSizeUp' && args.length === 4) {
      try {
        return { setBuffSizeUp: 翻目标(args[0], env), div: 翻值(args[1], env, 'div'), name: 翻值(args[2], env, 'name'), up: 翻值(args[3], env, 'setBuffSizeUp.值') };
      } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (名 === 'deleteBuff' && args.length === 3) {
      try { return { deleteBuff: [翻目标(args[0], env), 翻值(args[1], env, 'div'), 翻值(args[2], env, 'name')] }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    // 批次C-5b：keepOnlyLastBuff(目标,div,name)（只留最后一个同名同 div buff，删其余；全库唯一 10213）——与 deleteBuff 同构
    if (名 === 'keepOnlyLastBuff' && args.length === 3) {
      try { return { keepOnlyLastBuff: [翻目标(args[0], env), 翻值(args[1], env, 'div'), 翻值(args[2], env, 'name')] }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (名 === 'deleteBuffType' && args.length === 3) {
      try { return { deleteBuffType: [翻目标(args[0], env), 翻值(args[1], env, 'div'), 翻值(args[2], env, 'type')] }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (名 === 'ultLogic' && args.length <= 2 && (args.length === 0 || 是U(args[0]))) {
      const m = args.length === 2 ? 字面(args[1]) : 1;
      // 批次E-2b：ultLogic(u, L±add) 星级乘子（10160 `L+5` / 10173 `L+4`）→ {ultLogic:{星级:±add}}；
      //   flatten 编 ExprSize base=星级 K=1（ps[0] tag 判定——解释器 ActUltLogic 改用 编译参数 求值，旧 Fix 常数行为不变）
      if (args.length === 2 && typeof m !== 'number') {
        const a2 = args[1];
        if (a2.type === 'BinaryExpression' && (a2.operator === '+' || a2.operator === '-') && 是L(a2.left)) {
          const off = 数字(a2.right);
          if (off !== undefined && Number.isInteger(off) && off >= -128 && off <= 127) {
            return { ultLogic: { 星级: a2.operator === '-' ? -off : off } };
          }
        }
        env.残差.加(e, 'ultLogic mult 非常数', env.钩子); return null;
      }
      return { ultLogic: args.length === 2 && m === 1 ? null : (args.length === 2 ? m : null) };
    }
    if (名 === 'atkLogic' && args.length <= 2 && (args.length === 0 || 是U(args[0]))) {
      const m = args.length === 2 ? 字面(args[1]) : 1;
      if (args.length === 2 && typeof m !== 'number') { env.残差.加(e, 'atkLogic mult 非常数', env.钩子); return null; }
      return { atkLogic: args.length === 2 && m === 1 ? null : (args.length === 2 ? m : null) };
    }
    if (名 === 'hpUpMe' && args.length === 2) {
      try { return { hpUpMe: [翻目标(args[0], env), 翻值(args[1], env, 'hpUpMe')] }; } catch (err) { if (err.__残差) return null; throw err; }
    }
  }
  // U.方法() —— heal/heal2/heal3/hit/bless/act_defense
  if (callee.type === 'MemberExpression' && !callee.computed) {
    const 方 = callee.property.name;
    const 主 = callee.object;
    // 批次E-4：子程序调用 U.<name>(实参…) → 内联展开（10158 tmpfunc(a[,b]) / 10170·10173 tmpfunc() / 10193 tmpOn·tmpOff()）；
    //   形参绑定实参后重翻体——每次调用点独立展开（同 JS 内联语义）；体不可译→残差精确归属调用点
    if (是U(主) && env.子程序 && env.子程序.has(方)) {
      return 子程序内联(env.子程序.get(方), args, env, e);
    }
    if (是U(主)) {
      if (方 === 'heal' && args.length === 0) return { heal: 'self' };
      if (方 === 'heal2' && args.length === 0) return { heal2: 'self' };
      if (方 === 'heal3' && args.length === 0) return { heal3: 'self' };
      if (方 === 'hit' && args.length === 0) return { hit: 'self' };
      if (方 === 'act_defense' && args.length === 0) return { actDefense: true };
      if (方 === 'bless' && args.length === 1) {
        try { return { bless: 'self', type: 翻值(args[0], env, 'bless.type') }; } catch (err) { if (err.__残差) return null; throw err; }
      }
    }
    // V.heal()（循环变量）/ comp[N].heal()
    if (args.length === 0 && (方 === 'heal' || 方 === 'heal2' || 方 === 'heal3' || 方 === 'hit')) {
      try { return { [方]: 翻目标(主, env) }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    if (方 === 'bless' && args.length === 1) {
      try { return { bless: 翻目标(主, env), type: 翻值(args[0], env, 'bless.type') }; } catch (err) { if (err.__残差) return null; throw err; }
    }
    // orig.apply(this, args) —— 注入体内（环绕/追加模式的原函数调用，由 InjectStart 模式语义承担，不单独出指令）
    if (方 === 'apply' && 主.type === 'Identifier') {
      const 角色 = 查变量(env, 主.name);
      if (角色 && 角色.orig) return { __原调用: true };   // 特殊标记：注入段分隔由它触发（见翻注入）
      env.残差.加(e, '未知.apply调用 ' + 骨架一行(e), env.钩子);
      return null;
    }
    // 批次C-8：orig.call(this) 变体（10174 hit 注入；hit 无参所以源码用 .call(this)）——语义同 orig.apply
    if (方 === 'call' && 主.type === 'Identifier' && args.length === 1 && args[0].type === 'ThisExpression') {
      const 角色 = 查变量(env, 主.name);
      if (角色 && 角色.orig) return { __原调用: true };
      env.残差.加(e, '未知.call调用 ' + 骨架一行(e), env.钩子);
      return null;
    }
    env.残差.加(e, '方法调用 ' + 骨架一行(e), env.钩子);
    return null;
  }
  env.残差.加(e, '调用形态 ' + 骨架一行(e), env.钩子);
  return null;
}

// 批次E-5a：splice 循环识别（10190 ultimate 全库唯一）——
//   `for(let i=0;i<U.buff.length;i++){if(U.buff[i].name===N&&U.buff[i].div==D&&U.buff[i].on){U.buff.splice(i,1);break}}`
//   语义=删首个 (name===N && div==D && on) 的 buff。引擎写死 findIndex 命中删 1 个（bit-exact：同 name/div/on 判定）。
//   返回 undefined=非此形态（继续常规 Cfor）；null=形态起始但残差（已记）；对象=命中。
//   && 链三条件顺序不敏感（扁平 && 后逐条匹配，源码仅此一形态，宽松度够用且不误吞——div/name/on 缺一即 undefined）。
function 翻spliceFirstBuffOn(n, env) {
  if (n.type !== 'ForStatement') return undefined;
  // init: let i = 0
  if (!(n.init && n.init.type === 'VariableDeclaration' && n.init.declarations.length === 1 &&
        n.init.declarations[0].init && 数字(n.init.declarations[0].init) === 0 && n.init.declarations[0].id.type === 'Identifier')) return undefined;
  const iName = n.init.declarations[0].id.name;
  // test: i < U.buff.length
  const t = n.test;
  if (!(t && t.type === 'BinaryExpression' && t.operator === '<' && 是标识(t.left, iName))) return undefined;
  if (!(t.right.type === 'MemberExpression' && !t.right.computed && t.right.property.name === 'length' && 是U成员buff(t.right.object))) return undefined;
  // update: i++
  if (!(n.update && n.update.type === 'UpdateExpression' && n.update.operator === '++' && 是标识(n.update.argument, iName))) return undefined;
  // body: 单 if，无 else
  const body = 块语句列(n.body);
  if (body.length !== 1 || body[0].type !== 'IfStatement' || body[0].alternate) return undefined;
  const ifN = body[0];
  // 条件：扁平 && 收集三项 name===N / div==D / on
  const 项 = [];
  (function 平AND(x) { if (x.type === 'LogicalExpression' && x.operator === '&&') { 平AND(x.left); 平AND(x.right); } else 项.push(x); })(ifN.test);
  let name = null, div = null, 见on = false;
  const buffEl = x => x.type === 'MemberExpression' && x.computed && 是标识(x.property, iName) && 是U成员buff(x.object);
  for (const c of 项) {
    if (c.type === 'BinaryExpression' && ['===', '=='].includes(c.operator) && c.left.type === 'MemberExpression' && !c.left.computed && buffEl(c.left.object)) {
      const f = c.left.property.name, vStr = 字面(c.right);
      if (typeof vStr !== 'string') continue;
      if (f === 'name' && name === null) { name = vStr; continue; }
      if (f === 'div' && div === null) { div = vStr; continue; }
    }
    // U.buff[i].on 裸真值
    if (c.type === 'MemberExpression' && !c.computed && buffEl(c.object) && c.property.name === 'on') { 见on = true; continue; }
  }
  if (name === null || div === null || !见on) return undefined;   // 三条件不齐=非此形态
  // then: splice(i,1) + break（顺序无关）
  const then = 块语句列(ifN.consequent);
  let 见splice = false, 见break = false;
  for (const s of then) {
    if (s.type === 'BreakStatement') { 见break = true; continue; }
    if (s.type === 'ExpressionStatement' && s.expression.type === 'CallExpression' &&
        s.expression.callee.type === 'MemberExpression' && s.expression.callee.property.name === 'splice' &&
        是U成员buff(s.expression.callee.object) && s.expression.arguments.length === 2 &&
        是标识(s.expression.arguments[0], iName) && 数字(s.expression.arguments[1]) === 1) { 见splice = true; continue; }
  }
  if (!见splice || !见break) return undefined;
  return { spliceFirstBuffOn: { div, name } };
}
// U.buff 成员判定（object 是 U，property 是 buff）
function 是U成员buff(x) { return x && x.type === 'MemberExpression' && !x.computed && x.property.name === 'buff' && 是U(x.object); }

// 批次E-5b：手卷 argmax/argmin 骨架判定（纯结构，零 env 副作用——供 钩子体预扫 与 翻手卷argmax 共用）：
//   `for(let k=0;k<5;k++){ if(comp[k].F >< B){ I=k; B=comp[k].F } }`（I/B 任意 Identifier）。
//   返回 {kName,field,B名,I名,方向} 或 undefined（非此形态）。
function 骨架手卷argmax(n) {
  if (!(n.init && n.init.type === 'VariableDeclaration' && n.init.declarations.length === 1 &&
        n.init.declarations[0].id.type === 'Identifier' && 数字(n.init.declarations[0].init) === 0)) return undefined;
  const kName = n.init.declarations[0].id.name;
  const t = n.test;
  if (!(t && t.type === 'BinaryExpression' && t.operator === '<' && 是标识(t.left, kName) && 数字(t.right) === 5)) return undefined;   // 上界字面 5=队面恒长（comp 全长扫描）
  if (!(n.update && n.update.type === 'UpdateExpression' && n.update.operator === '++' && 是标识(n.update.argument, kName))) return undefined;
  const body = 块语句列(n.body);
  if (body.length !== 1 || body[0].type !== 'IfStatement' || body[0].alternate) return undefined;
  const te = body[0].test;
  // test: comp[k].F > B / comp[k].F < B
  if (!(te.type === 'BinaryExpression' && ['>', '<'].includes(te.operator) &&
        te.left.type === 'MemberExpression' && !te.left.computed && ['hp', 'atk'].includes(te.left.property.name) &&
        te.left.object.type === 'MemberExpression' && te.left.object.computed && 是标识(te.left.object.object, 'comp') && 是标识(te.left.object.property, kName) &&
        te.right.type === 'Identifier')) return undefined;
  const F = te.left.property.name, B名 = te.right.name;
  const then = 块语句列(body[0].consequent);
  if (then.length !== 2) return undefined;
  // then 两赋值任意序：I=k / B=comp[k].F
  let I名 = null, 见B赋 = false;
  for (const s of then) {
    if (s.type !== 'ExpressionStatement' || s.expression.type !== 'AssignmentExpression' || s.expression.operator !== '=') return undefined;
    const a = s.expression;
    if (a.left.type === 'Identifier' && 是标识(a.right, kName)) { I名 = a.left.name; continue; }
    if (a.left.type === 'Identifier' && a.left.name === B名 &&
        a.right.type === 'MemberExpression' && !a.right.computed && a.right.property.name === F &&
        a.right.object.type === 'MemberExpression' && a.right.object.computed && 是标识(a.right.object.object, 'comp') && 是标识(a.right.object.property, kName)) { 见B赋 = true; continue; }
    return undefined;
  }
  if (!I名 || !见B赋 || I名 === kName) return undefined;
  return { kName, field: F, B名, I名, 方向: te.operator === '>' ? 'max' : 'min' };
}

// 批次E-5b：手卷 argmax/argmin 循环识别（10138 leader 两段：max hp / min hp）——
//   归一为 FindMaxUnit：引擎 init=pool[0] 严格比较平局取先 ⇔ 源码 best 初值 0(max,因hp>0恒真)/999999999(min) 逐位等价。
//   前置 `let I=0; let B=…` 声明由 钩子体预扫 标记为死变量（B/I 被本模式整体消费，不再作数值 temp 读）。
//   返回 undefined=非此形态（继续常规 Cfor）；null=内部残差；对象=findMaxUnit DSL。
function 翻手卷argmax(n, env) {
  const sk = 骨架手卷argmax(n);
  if (!sk) return undefined;
  // 槽分配（复用 find 槽计数器，每角色独立）
  const 槽 = (env.残差.nextFindSlot = (env.残差.nextFindSlot || 0));
  if (槽 > 7) { env.残差.加(n, 'find 槽超限(>8)', env.钩子); return null; }
  env.残差.nextFindSlot++;
  设变量(env, sk.I名, { find: 槽, findMax: true });
  return { findMaxUnit: { 槽, field: sk.field, role过滤: null, 方向: sk.方向 } };
}

// 三元 cd 值：U.isLeader ? a : b → {isLeader:a, else:b}（负数用 数字()：AST 里 -6 是 Unary('-',Literal)，非字面量）
function 翻三元cd(n, env) {
  if (是成员(n.test, 是U, 'isLeader')) {
    const a = 数字(n.consequent), b = 数字(n.alternate);
    if (a !== undefined && b !== undefined) return { isLeader: a, else: b };
  }
  env.残差.加(n, '三元形态 ' + 骨架一行(n), env.钩子);
  return null;
}

// setBuffOn 第4参：true/false 字面，或 U.stack <op> N 比较式
function 翻开关值(n, env) {
  if (n.type === 'Literal' && typeof n.value === 'boolean') return n.value;
  if (n.type === 'BinaryExpression' && ['==', '!=', '>', '>=', '<', '<='].includes(n.operator) && 是成员(n.left, 是U, 'stack')) {
    const rv = 数字(n.right);
    if (rv !== undefined) return { slot: 'stack', cmp: n.operator, fix: rv };
  }
  if (n.type === 'BinaryExpression' && ['==', '!=', '>', '>=', '<', '<='].includes(n.operator) && n.left.type === 'Identifier') {
    // temp 比较形态（s>=4/s>0）：左是快照 temp 变量（压平 TempRef tag 已支持，批次C 补）
    const 角色 = 查变量(env, n.left.name);
    const rv = 数字(n.right);
    if (角色 && 角色.temp && rv !== undefined) return { temp: 角色.temp, cmp: n.operator, fix: rv };
  }
  残差抛(n, 'on值形态 ' + 骨架一行(n), env);
}

// 批次E-4：子程序内联——case顶层 `U.<name>=function(形参…){体}` 已在 抽取角色 顶层登记到 env.子程序；
//   调用点 `U.<name>(实参…)` 展开：新建环境绑定形参→实参角色后重翻体 → {块:指令列}（翻调用语句/翻钩子体/翻语句列 已消费 块 展开）。
//   形参绑定：实参缺省/falsy 字面(0·undefined·null·false)→{subFalsy}（`b||X` 归一时剥左）；实参 Identifier→复用其角色（loop/temp/find…）；
//   其它目标表达式(U/all/boss/comp[N])→{subTgtNode:实}（翻目标 延迟解析）。子程序体全 U 基座或形参基座，与 JS 内联同语义（同环境链、循环深度继承→iStack 语义一致）。
function 子程序内联(定义, 实参列, env, 节点) {
  const fn = 定义.fn;
  const 形参 = fn.params || [];
  const 环境S = 新环境(env);   // 继承 env：循环深度/父变量链/谓词/子程序（可嵌套子程序调用）
  for (let i = 0; i < 形参.length; i++) {
    const p = 形参[i];
    let 形名 = null;
    if (p.type === 'Identifier') 形名 = p.name;
    else if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') 形名 = p.left.name;   // b=undefined 默认值形参：取左名
    else { env.残差.加(节点, '子程序形参形态 ' + p.type, env.钩子); return null; }
    绑定形参(环境S, 形名, 实参列[i], env);
  }
  const body = fn.body.type === 'BlockStatement' ? fn.body.body : [{ type: 'ReturnStatement', argument: fn.body }];
  const 列 = 翻语句列(body, 环境S);
  if (列 === null) { env.残差.加(节点, '子程序体不可翻译(内联失败) ' + 骨架一行(节点), env.钩子); return null; }
  return { 块: 列 };
}
function 绑定形参(环境S, 形名, 实, env) {
  // 实参缺省 / falsy 字面(0·null·false·undefined) → subFalsy（体 `b||X` 归一时剥左，忠实：假值||右 ≡ 右）
  if (实 === undefined) { 设变量(环境S, 形名, { subFalsy: true }); return; }
  if (实.type === 'Literal' && (实.value === 0 || 实.value === null || 实.value === false || 实.value === undefined)) { 设变量(环境S, 形名, { subFalsy: true }); return; }
  if (实.type === 'Identifier' && 实.name === 'undefined') { 设变量(环境S, 形名, { subFalsy: true }); return; }
  // Identifier 实参 → 复用其角色（loop 单位/下标、temp、find…）——体内 `<形参>` 基座经此角色解析回实参目标
  if (实.type === 'Identifier') { const 角 = 查变量(env, 实.name); if (角) { 设变量(环境S, 形名, 角); return; } }
  // 其它目标表达式(U/all/boss/comp[N]/comp[V]) → 记录实节点，翻目标 遇 subTgtNode 延迟解析
  设变量(环境S, 形名, { subTgtNode: 实 });
}

module.exports = { ast, sd, sw, 角色cases, U名, L名, 主钩子, 默认骨架, 残差集, 新环境, 设变量, 查变量, 收集谓词, 找谓词type, 是标识, 是U, 是L, 是成员, 是调用, 块语句列, 字面, 数字, 行表, 骨架一行, 翻语句, 翻语句列, 翻atkRef, 抽取角色, 是默认骨架, SRC, OUT_DIR };

// =============================================
// 条件翻译 → DSL 条件（或守卫数组）；不可翻译返回 null（残差已记）
// =============================================
function 翻条件(n, env) {
  // GLOBAL_TURN 相关
  if (n.type === 'BinaryExpression') {
    const op = n.operator;
    const 左 = n.left, 右n = n.right;
    const cmp集 = ['==', '!=', '>', '>=', '<', '<='];
    if (是标识(左, 'GLOBAL_TURN') && 右n.type === 'Literal' && typeof 右n.value === 'number' && cmp集.includes(op)) {
      return { kind: '回合', cmp: op, fix: 右n.value };
    }
    // (GLOBAL_TURN ± a) % m == r
    if (op === '==' && 左.type === 'BinaryExpression' && 左.operator === '%') {
      const 内侧 = 左.left;
      if (内侧.type === 'BinaryExpression' && ['+', '-'].includes(内侧.operator) && 是标识(内侧.left, 'GLOBAL_TURN') && 内侧.right.type === 'Literal' && typeof 内侧.right.value === 'number' && 左.right.type === 'Literal' && typeof 左.right.value === 'number' && 右n.type === 'Literal' && typeof 右n.value === 'number') {
        const 偏移 = 内侧.operator === '-' ? -内侧.right.value : 内侧.right.value;
        return { kind: '回合模', 偏移, 模: 左.right.value, 余: 右n.value };
      }
    }
    // U.stack <op> N（含负数比较 stack<0 → clamp 下界形态）
    if (是成员(左, 是U, 'stack') && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: 'slot比较', slot: 'stack', cmp: op, fix: rv };
    }
    // 星级比较：L <op> N（L=setDefault 第2参 _0x78c5e1，值域1..5；10029/10031/10032/10040 的 if(L>=5)/if(L==3)/if(L<5)）。
    //   翻switchLib 只处理 switch(L) 判据，直比形态此前全落残差。ctx.lib 装配期已规范化（与 setMnc/LibIf 同规则）。
    if (是L(左) && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: '星级', cmp: op, val: rv };
    }
    // V(temp) <op> N（s==3/s==7）；V(getElKind绑定) <op> N → 元素种类；V(计数绑定) <op> N → role/元素计数
    if (左.type === 'Identifier' && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) {
        const 角色 = 查变量(env, 左.name);
        if (角色 && 角色.temp) return { kind: 'temp', var: 角色.temp, cmp: op, fix: rv };
        if (角色 && 角色.getElKind) return { kind: '元素种类', cmp: op, val: rv };
        if (角色 && 角色.getRoKind) return { kind: '职务种类', cmp: op, val: rv };   // 批次C-5b：10213 turnstart `const V=getRoKind(); if(V==4)`
        if (角色 && 角色.countCall) return { kind: 角色.countCall.fn === 'getRoleCnt' ? 'role计数' : '元素计数', mask: 角色.countCall.mask, cmp: op, n: rv };
        // 批次C-10a：循环下标变量裸比较 V<op>N（10022 `for(V of getRoleIdx(…)){if(V!=0)}`）→ 循环下标条件（kStack 顶原始下标；仅栈顶层）
        if (角色 && 角色.loop === 'index' && (env.循环深度 || 0) - 角色.深度 === 0 && Number.isInteger(rv)) return { kind: '循环下标', cmp: op, val: rv };
      }
    }
    // 批次C-10b：循环下标 vs selfIdx 绑定变量（10136 `let V=comp.findIndex(x=>x.id==U.id); if(k==V)continue`）→ 自下标条件（两侧可反）
    if (op && cmp集.includes(op) && 左.type === 'Identifier' && 右n.type === 'Identifier') {
      const 角左 = 查变量(env, 左.name), 角右 = 查变量(env, 右n.name);
      const 反 = { '==': '==', '!=': '!=', '>': '<', '>=': '<=', '<': '>', '<=': '>=' };
      if (角左 && 角左.loop === 'index' && (env.循环深度 || 0) - 角左.深度 === 0 && 角右 && 角右.selfIdx) return { kind: '自下标', cmp: op };
      if (角右 && 角右.loop === 'index' && (env.循环深度 || 0) - 角右.深度 === 0 && 角左 && 角左.selfIdx) return { kind: '自下标', cmp: 反[op] };
    }
    // 批次C-10b：boss.<字段> 比较（10150 `boss.element!=undefined && boss.element==4`）：undefined 存在性判定 或 数值比较
    if (左.type === 'MemberExpression' && !左.computed && 左.object.type === 'Identifier' && 左.object.name === 'boss') {
      if (右n.type === 'Identifier' && 右n.name === 'undefined' && ['==', '!='].includes(op)) {
        return { kind: 'boss字段', field: 左.property.name, cmp: op, undefined判定: true };
      }
      const rv = 数字(右n);
      if (rv !== undefined && cmp集.includes(op)) return { kind: 'boss字段', field: 左.property.name, cmp: op, val: rv };
    }
    // 批次C-10b：Math.random() <op> N（10038 `if(Math.random()<0.5)`；双跑差分有确定性种子桩——两引擎同序列抽取 bit 一致）
    if (左.type === 'CallExpression' && 左.callee.type === 'MemberExpression' && !左.callee.computed &&
        是标识(左.callee.object, 'Math') && 左.callee.property.name === 'random' && 左.arguments.length === 0 && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: '随机', cmp: op, fix: rv };
    }
    // 批次C-10b：buffNestByType(U,"T") <op> N（10124 `<2` / 10140 `>=10`）→ 执行期直调引擎纯函数
    if (左.type === 'CallExpression' && 是调用(左, 'buffNestByType', 2) && 是U(左.arguments[0]) && typeof 字面(左.arguments[1]) === 'string' && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: 'nestByType', type: 字面(左.arguments[1]), cmp: op, fix: rv };
    }
    // 批次C-10b：getBuffSize(U,"div","name") <op> N|undefined（10153 `!=0` / 10171 `==undefined`）
    if (左.type === 'CallExpression' && 是调用(左, 'getBuffSize', 3) && 是U(左.arguments[0]) &&
        typeof 字面(左.arguments[1]) === 'string' && typeof 字面(左.arguments[2]) === 'string' && ['==', '!='].includes(op)) {
      if (右n.type === 'Identifier' && 右n.name === 'undefined') return { kind: 'buffSize', div: 字面(左.arguments[1]), name: 字面(左.arguments[2]), cmp: op, undefined: true };
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: 'buffSize', div: 字面(左.arguments[1]), name: 字面(左.arguments[2]), cmp: op, fix: rv };
    }
    // 批次C-10b：<循环单位>.curHp/<同单位>.hp <op> N（10181 `if(V.curHp/V.hp>0.5)`；两侧同基座且为栈顶循环单位）
    if (左.type === 'BinaryExpression' && 左.operator === '/' && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined && 左.left.type === 'MemberExpression' && !左.left.computed && 左.left.property.name === 'curHp' &&
          左.right.type === 'MemberExpression' && !左.right.computed && 左.right.property.name === 'hp' &&
          左.left.object.type === 'Identifier' && 左.right.object.type === 'Identifier' && 左.left.object.name === 左.right.object.name) {
        const 角色 = 查变量(env, 左.left.object.name);
        let 目 = null;
        try { 目 = 翻目标(左.left.object, env); } catch (e) { if (!e.__残差) throw e; }
        if (角色 && 角色.loop === 'unit' && 目 === '$i') return { kind: 'hp比例', cmp: op, fix: rv };
      }
    }
    // U.isLeader == true/false
    if (是成员(左, 是U, 'isLeader') && (右n.type === 'Literal') && typeof 右n.value === 'boolean' && op === '==') {
      return { kind: '队长', cmp: '==', val: 右n.value };
    }
    if ((是成员(左, 是U, 'isLeader')) && 右n.type === 'Literal' && typeof 右n.value === 'boolean' && cmp集.includes(op)) {
      return { kind: '队长', cmp: op === '==' ? '==' : op, val: 右n.value };
    }
    // U.getNest("S") <op> N
    if (左.type === 'CallExpression' && 是成员(左.callee, 是U, 'getNest') && 左.arguments.length === 1 && typeof 字面(左.arguments[0]) === 'string' && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: 'nest比较', type: 字面(左.arguments[0]), cmp: op, fix: rv };
    }
    // U.<谓词>() == true/false → 有回合buff / not
    if (左.type === 'CallExpression' && 左.callee.type === 'MemberExpression' && 是U(左.callee.object) && 左.arguments.length === 0 && 右n.type === 'Literal' && typeof 右n.value === 'boolean' && op === '==') {
      const 谓 = env.谓词.get(左.callee.property.name);
      if (谓) return 右n.value ? { kind: '有回合buff', type: 谓.type } : { not: { kind: '有回合buff', type: 谓.type } };
    }
    // getElKind() <op> N
    if (是调用(左, 'getElKind', 0) && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: '元素种类', cmp: op, val: rv };
    }
    // getRoKind() <op> N（职务种类数；10143）
    if (是调用(左, 'getRoKind', 0) && cmp集.includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) return { kind: '职务种类', cmp: op, val: rv };
    }
    // comp[V].element|role <op> N（V=循环变量；10199 element/10167 role）→ 循环属性条件（解释器取 iStack 顶对应字段）
    if (左.type === 'MemberExpression' && !左.computed && ['element', 'role'].includes(左.property.name) && cmp集.includes(op) && 左.object.type === 'MemberExpression') {
      const rv = 数字(右n);
      let 目 = null;
      try { 目 = 翻目标(左.object, env); } catch (e) { if (!e.__残差) throw e; }
      if (rv !== undefined && 目 === '$i') return { kind: 左.property.name === 'element' ? '循环元素' : '循环role', cmp: op, val: rv };
    }
    // <循环目标>.element|role <op> N（loopUnit 直接基座：V.element==1 / V.role==0；仅栈顶层——CmpLoopEl/CmpLoopRole 取 iStack 顶）
    if (左.type === 'MemberExpression' && !左.computed && ['element', 'role'].includes(左.property.name) && 左.object.type === 'Identifier' && cmp集.includes(op)) {
      const rv = 数字(右n);
      const 角色 = 查变量(env, 左.object.name);
      if (rv !== undefined && 角色 && 角色.loop === 'unit' && (env.循环深度 || 0) - 角色.深度 === 0) return { kind: 左.property.name === 'element' ? '循环元素' : '循环role', cmp: op, val: rv };
    }
    // 批次C-4：<循环目标>.id == N（10211 leader：for(comp){if(V.id==10160){V.cd-=20;…}}；comp[V].id 同形）：
    //   仅支持 ==/!=（源码仅此），a=角色id 定点（5位id×10⁴=1e8 级，i32 内安全）；解释器取 iStack 顶 .id
    // 批次C-5 B形：两侧都是循环变量 id（10213 ultbefore：if($i.id != $self.id){deleteBuff}）→ 排除上层条件（CmpNeqPrevId，
    //   a=1 排除上层栈 / 0 排除self；内层循环变量=栈顶，另一侧=上层或self）；仅栈内变量（翻目标→$i/$i上/self）
    if (左.type === 'MemberExpression' && !左.computed && 左.property.name === 'id' && ['==', '!='].includes(op)) {
      const rv = 数字(右n);
      if (rv !== undefined) {
        let 目 = null;
        try { 目 = 翻目标(左.object, env); } catch (err) { if (!err.__残差) throw err; }
        if (目 === '$i') return { kind: '循环id', cmp: op, val: rv };
      }
      // 两侧都是单位引用（翻目标成功）且 ==/!= → CmpNeqPrevId（op 仅 ==/!=，a=另一侧是上层(1)还是self(0)）
      let 左目 = null, 右目 = null;
      try {
        if (左.type === 'MemberExpression' && !左.computed && 左.property.name === 'id') 左目 = 翻目标(左.object, env);
        if (右n.type === 'MemberExpression' && !右n.computed && 右n.property.name === 'id') 右目 = 翻目标(右n.object, env);
      } catch (err) { if (!err.__残差) throw err; }
      // 规范形：左=栈顶（$i），右=上一层（{$i上:1}）或 self；反向同义
      if (左目 === '$i' && 右目) {
        if (右目 && typeof 右目 === 'object' && 右目['$i上'] === 1) return { kind: '排除上层栈', cmp: op, 上层: 1 };
        if (右目 === 'self') return { kind: '排除上层栈', cmp: op, 上层: 0 };
      }
      if (右目 === '$i' && 左目) {
        if (左目 && typeof 左目 === 'object' && 左目['$i上'] === 1) return { kind: '排除上层栈', cmp: op, 上层: 1 };
        if (左目 === 'self') return { kind: '排除上层栈', cmp: op, 上层: 0 };
      }
    }
    // 批次C-10a：role[comp[V].role] == "딜"（10170）→ 循环role 单值等价重写（role 数组查表 ≡ role 枚举值比较）
    if (左.type === 'MemberExpression' && 左.computed && 是标识(左.object, 'role') && ['==', '!='].includes(op) && typeof 字面(右n) === 'string') {
      const 内 = 左.property;   // comp[V].role
      if (内.type === 'MemberExpression' && !内.computed && 内.property.name === 'role') {
        let 目 = null;
        try { 目 = 翻目标(内.object, env); } catch (e) { if (!e.__残差) throw e; }
        const ri = 职务名.indexOf(字面(右n));
        if (目 === '$i' && ri >= 0) return { kind: '循环role', cmp: op, val: ri };
      }
    }
    // 批次C-10a：<循环单位>.name == "S"（10088 `if(V.name=="신파랑")` V=comp of 循环）→ 循环名条件（仅 ==/!= 栈顶层）
    if (左.type === 'MemberExpression' && !左.computed && 左.property.name === 'name' && 左.object.type === 'Identifier' && ['==', '!='].includes(op) && typeof 字面(右n) === 'string') {
      const 角色V = 查变量(env, 左.object.name);
      if (角色V && 角色V.loop === 'unit' && (env.循环深度 || 0) - 角色V.深度 === 0) return { kind: '循环名', cmp: op, name: 字面(右n) };
    }
    // 批次C-10a：<idxList绑定>.length <op> N（10185 `const A=getElementIdx("광"); if(A.length>=3)`）→ 计数条件等价重写
    //   （getElementIdx(mask).length ≡ getElementCnt(mask)——同一引擎定义的两种问法；getRoleIdx 同理）
    if (左.type === 'MemberExpression' && !左.computed && 左.property.name === 'length' && 左.object.type === 'Identifier' && cmp集.includes(op)) {
      const rv = 数字(右n);
      const 绑 = 查变量(env, 左.object.name);
      if (rv !== undefined && 绑 && 绑.idxList) return { kind: 绑.idxList.fn === 'getRoleIdx' ? 'role计数' : '元素计数', mask: 绑.idxList.mask, cmp: op, n: rv };
    }
    // getRoleCnt("…") <op> N / getElementCnt("…") <op> N
    if (左.type === 'CallExpression' && (左.callee.name === 'getRoleCnt' || 左.callee.name === 'getElementCnt') && cmp集.includes(op)) {
      const rv = 数字(右n);
      const mask = 左.arguments.map(a => 字面(a)).filter(s => typeof s === 'string');
      if (rv !== undefined && mask.length === 左.arguments.length) return { kind: 左.callee.name === 'getRoleCnt' ? 'role计数' : '元素计数', mask, cmp: op, n: rv };
    }
    // 循环变量下标比较：V == U 位置（for 体内 if(V==findIndex结果) continue 形态）→残差
  }
  // GLOBAL_TURN == a || GLOBAL_TURN == b || … → 回合集合
  if (n.type === 'LogicalExpression' && n.operator === '||') {
    const 项 = [];
    let ok = true;
    const 收 = x => {
      if (!ok) return;
      if (x.type === 'LogicalExpression' && x.operator === '||') { 收(x.left); 收(x.right); return; }
      if (x.type === 'BinaryExpression' && x.operator === '==' && 是标识(x.left, 'GLOBAL_TURN') && x.right.type === 'Literal' && typeof x.right.value === 'number') 项.push(x.right.value);
      else if (x.type === 'BinaryExpression' && x.operator === '==' && 是调用(x.left, 'getElKind', 0) && x.right.type === 'Literal' && typeof x.right.value === 'number') 项.push('el:' + x.right.value);
      // V==N（V = 先前 const 绑定的 getElKind()）→ el:N（10177 leader 形态）
      else if (x.type === 'BinaryExpression' && x.operator === '==' && x.left.type === 'Identifier' && 查变量(env, x.left.name) && 查变量(env, x.left.name).getElKind && 数字(x.right) !== undefined) 项.push('el:' + 数字(x.right));
      // 批次C-7：U.stack==N（10181 stack∈{2,3}）→ slot:N
      else if (x.type === 'BinaryExpression' && x.operator === '==' && 是成员(x.left, 是U, 'stack') && 数字(x.right) !== undefined) 项.push('slot:' + 数字(x.right));
      // 批次C-7：<循环目标>.role==N（10159 comp[V].role∈{0,4} / 10182 V.role∈{0,2}）→ role:N（基座必须栈顶循环变量）
      else if (x.type === 'BinaryExpression' && x.operator === '==' && x.left.type === 'MemberExpression' && !x.left.computed && x.left.property.name === 'role' && 数字(x.right) !== undefined) {
        let 目 = null;
        try { 目 = 翻目标(x.left.object, env); } catch (e) { if (!e.__残差) throw e; }
        if (目 === '$i') 项.push('role:' + 数字(x.right)); else ok = false;
      }
      else ok = false;
    };
    收(n);
    if (ok && 项.length) {
      if (项.every(t => typeof t === 'number')) return { kind: '回合集合', in: 项 };
      if (项.every(t => typeof t === 'string' && t.startsWith('el:'))) return { kind: '元素种类', in: 项.map(t => Number(t.slice(3))) };
      // slot 集合：值域守卫 0..30（CmpSlotIn 位集 31bit；负/超限走残差）
      if (项.every(t => typeof t === 'string' && t.startsWith('slot:'))) {
        const vs = 项.map(t => Number(t.slice(5)));
        if (vs.every(v => Number.isInteger(v) && v >= 0 && v <= 30)) return { kind: 'slot集合', slot: 'stack', in: vs };
      }
      // 循环 role 集合：值域 0..4（role 枚举 5 位）
      if (项.every(t => typeof t === 'string' && t.startsWith('role:'))) {
        const vs = 项.map(t => Number(t.slice(5)));
        if (vs.every(v => Number.isInteger(v) && v >= 0 && v <= 4)) return { kind: '循环role集合', in: vs };
      }
    }
  }
  // 裸谓词调用：U.isSANFix()（if 条件位直接出现，无 == true/false）→ {kind:'有回合buff'} / not
  if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && 是U(n.callee.object) && n.arguments.length === 0) {
    const 谓 = env.谓词.get(n.callee.property.name);
    if (谓) return { kind: '有回合buff', type: 谓.type };
  }
  // 批次C-10a：<idx列表>.includes(V) 条件位等价重写（V=栈顶循环下标变量）→ 循环role/元素集合：
  //   getRoleIdx(mask).includes(V) ⟺ comp[V].role∈mask（getRoleIdx 按 role 过滤下标、comp 恒定——钩子期内 bit 一致）。
  //   三形态：①getRoleIdx/getElementIdx(串…).includes(V) 直接调用 ②<idxList绑定变量>.includes(V)（10137 `const A=getElementIdx("풍"); if(!A.includes(V))continue`）
  //   ③!… 由一元 not 分支包裹翻转为 cmp=Ne（解释器集合条件 C-10a 起尊重 cmp）
  if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed &&
      n.callee.property.name === 'includes' && n.arguments.length === 1 && n.arguments[0].type === 'Identifier') {
    const 角色V = 查变量(env, n.arguments[0].name);
    if (角色V && 角色V.loop === 'index' && (env.循环深度 || 0) - 角色V.深度 === 0) {
      let fn = null, mask = null;
      const 基 = n.callee.object;
      if (基.type === 'CallExpression' && 基.callee.type === 'Identifier' && ['getRoleIdx', 'getElementIdx'].includes(基.callee.name) &&
          基.arguments.length >= 1 && 基.arguments.every(a => typeof 字面(a) === 'string')) {
        fn = 基.callee.name; mask = 基.arguments.map(a => 字面(a));
      } else if (基.type === 'Identifier') {
        const 绑 = 查变量(env, 基.name);
        if (绑 && 绑.idxList) { fn = 绑.idxList.fn; mask = 绑.idxList.mask; }
      }
      if (fn && mask && mask.every(m => (fn === 'getRoleIdx' ? 职务名 : 元素名).includes(m))) {
        const 名表 = fn === 'getRoleIdx' ? 职务名 : 元素名;
        return { kind: fn === 'getRoleIdx' ? '循环role集合' : '循环元素集合', in: mask.map(m => 名表.indexOf(m)) };
      }
    }
  }
  // 批次C-10a：条件位内联 comp.find(x=>x.id==N) 真值（10089 passive `if(comp.find(V=>V.id==10088))`）→ 存在id条件。
  //   find 非 null ⟺ comp.some(id==N)（谓词纯 id 比较无副作用；lambda 参数是新作用域名，与外层循环变量无关）
  if (n.type === 'CallExpression' && n.arguments.length === 1 && n.callee.type === 'MemberExpression' &&
      !n.callee.computed && n.callee.property.name === 'find' && 是标识(n.callee.object, 'comp')) {
    const lam2 = n.arguments[0];
    if (lam2 && (lam2.type === 'ArrowFunctionExpression' || lam2.type === 'FunctionExpression') && lam2.params.length === 1 && lam2.params[0].type === 'Identifier') {
      const b2 = lam2.body.type === 'BlockStatement' && lam2.body.body.length === 1 && lam2.body.body[0].type === 'ReturnStatement' ? lam2.body.body[0].argument : lam2.body;
      if (b2 && b2.type === 'BinaryExpression' && b2.operator === '==' &&
          b2.left.type === 'MemberExpression' && 是标识(b2.left.object, lam2.params[0].name) && b2.left.property.name === 'id' &&
          typeof 数字(b2.right) === 'number') {
        return { kind: '存在id', id: 数字(b2.right) };
      }
    }
  }
  // U.isLeader 裸成员（== true 省略形态）在下方兜底
  // 批次E-5b 等价重写（零新机制）：`V.length != 0`（V=comp.filter(role∈mask) 绑定，10111 leader）⟹
  //   filter 非空 ≡ 同谓词计数非零 = getRoleCnt(mask)、直接复用既有 kind 'role计数'（CmpRoleCnt）；
  //   不读槽→FindMaxUnit 命令可安全留在 if 体内（与源码 reduce 在 if 体内同时机）
  if (n.type === 'BinaryExpression' && ['==', '!=', '>', '>=', '<', '<='].includes(n.operator) &&
      n.left.type === 'MemberExpression' && !n.left.computed && n.left.property.name === 'length' && n.left.object.type === 'Identifier') {
    const 角L = 查变量(env, n.left.object.name);
    if (角L && 角L.filterRoles) {
      const rvL = 数字(n.right);
      if (rvL !== undefined) return { kind: 'role计数', mask: 角L.filterRoles.map(i => 职务名[i]), cmp: n.operator, n: rvL };
    }
  }
  if (n.type === 'UnaryExpression' && n.operator === '!') {
    const 内 = 翻条件(n.argument, env);
    if (内 === null) return null;
    if (Array.isArray(内)) { env.残差.加(n, '!() 包裹 && 链（De Morgan 未实现）', env.钩子); return null; }
    return { not: 内 };
  }
  if (n.type === 'LogicalExpression' && n.operator === '&&') {
    const gs = [];
    const 展 = x => {
      if (!gs) return;
      if (x.type === 'LogicalExpression' && x.operator === '&&') { 展(x.left); 展(x.right); return; }
      const g = 翻条件(x, env);
      if (g === null) { gs.ok = false; return; }
      if (Array.isArray(g)) gs.push(...g); else gs.push(g);
    };
    展(n);
    if (gs.ok === false || !gs.length) return null;
    return gs;
  }
  // if(U.isLeader) 无比较 → {kind:队长,val:true}
  if (是成员(n, 是U, 'isLeader')) return { kind: '队长', cmp: '==', val: true };
  // 批次C-10b：U.<布尔字段> 裸真值（10134 `if(U.turnHeal)` / 10140 `&& U.check` / 10190 isHealed 族 OR 项）→ 单位字段条件
  //   批次E-3b 泛化：基座可为任意循环目标 comp[V]（10140 注入体 `!comp[V].isFirstTurnActed`，注入 ctx iStack=[被注入者]，
  //   '$i' 解析与闭包捕获的 comp[V] 同语义）；仅 self/$i/$i上 三形（解释器 CmpUnitField 支持范围）
  if (n.type === 'MemberExpression' && !n.computed && 单位字段表.includes(n.property.name)) {
    let mTgt = null;
    try { mTgt = 翻目标(n.object, env); } catch (e) { if (!e.__残差) throw e; }
    if (mTgt === 'self' || mTgt === '$i' || (mTgt && typeof mTgt === 'object' && mTgt['$i上'] !== undefined)) return { kind: '单位字段', field: n.property.name, 目标: mTgt };
  }
  // 批次C-10b：U.stack 裸真值（10097 `if(U.stack)` 布尔槽）→ 单位字段 truthy（!!u.stack：false/0 同假——
  //   不能用 slot!=0 数值比较：布尔 false!==0 会误判真）
  if (是成员(n, 是U, 'stack')) return { kind: '单位字段', field: 'stack' };
  // 裸真值 if(V)，V=comp.find/buff.find 槽绑定（批次B2；源码 `if(_0x5c25b1){…}`）→ find真值/buffFind真值
  if (n.type === 'Identifier') {
    const 角色3 = 查变量(env, n.name);
    if (角色3 && 角色3.find !== undefined) return { kind: 'find真值', 槽: 角色3.find };
    if (角色3 && 角色3.findBuff !== undefined) return { kind: 'buffFind真值', 槽: 角色3.findBuff };
    // 批次C-10b：temp 变量裸真值（10197/10173 `const V=boss.def; ultLogic…; if(V)`）：执行期 !!tempVars[槽名]
    if (角色3 && 角色3.temp) return { kind: 'temp真值', var: 角色3.temp };
  }
  env.残差.加(n, '条件形态 ' + 骨架一行(n), env.钩子);
  return null;
}

// =============================================
// for-of → {"for":{kind,…},body}
// =============================================
function 翻for(n, env) {
  if (n.left.type !== 'VariableDeclaration' || n.left.declarations.length !== 1) { env.残差.加(n, 'for左侧非常规', env.钩子); return null; }
  const 变名 = n.left.declarations[0].id.name;
  const r = n.right;
  // 批次E-2b：`for (b of U.buff){ if(b.div=="D" && b.name=="N"){ b.size += X } }`（10040 turnstart 全库唯一形态）
  //   → {buffSizeAddAll:{div,name,加}}（引擎 filter+forEach 等价：遍历中不增删条目；循环变量仅用于字段读写）
  if (是成员(r, 是U, 'buff') && !n.body.body.some(s => s.type === 'ContinueStatement' || s.type === 'BreakStatement')) {
    const 体b = n.body.type === 'BlockStatement' ? n.body.body : [n.body];
    if (体b.length === 1 && 体b[0].type === 'IfStatement' && !体b[0].alternate) {
      const t = 体b[0].test;
      const 内 = 体b[0].consequent.type === 'BlockStatement' ? 体b[0].consequent.body : [体b[0].consequent];
      // 合取：b.div=="D" && b.name=="N"（顺序可反）
      const 项 = {};
      const 收 = x => {
        if (x.type === 'LogicalExpression' && x.operator === '&&') { 收(x.left); 收(x.right); return true; }
        if (x.type === 'BinaryExpression' && x.operator === '==' && x.left.type === 'MemberExpression' &&
            是标识(x.left.object, 变名) && ['div', 'name'].includes(x.left.property.name) && typeof 字面(x.right) === 'string') {
          项[x.left.property.name] = 字面(x.right); return true;
        }
        return false;
      };
      if (收(t) && 项.div !== undefined && 项.name !== undefined && 内.length === 1 && 内[0].type === 'ExpressionStatement') {
        const a = 内[0].expression;
        if (a && a.type === 'AssignmentExpression' && (a.operator === '+=' || a.operator === '-=') &&
            a.left.type === 'MemberExpression' && 是标识(a.left.object, 变名) && a.left.property.name === 'size' && 数字(a.right) !== undefined) {
          return { buffSizeAddAll: { div: 项.div, name: 项.name, 加: a.operator === '-=' ? -数字(a.right) : 数字(a.right) } };
        }
      }
    }
  }
  const 环境2 = 新环境(env);
  环境2.循环深度 = (env.循环深度 || 0) + 1;
  let sel = null;
  // for(V of comp) → 全队
  if (是标识(r, 'comp')) {
    sel = { kind: '全队' };
    设变量(环境2, 变名, { loop: 'unit', 深度: 环境2.循环深度 });   // 变量本身=unit（V.heal()/V.id 形态）
  } else if (是调用(r, 'getElementIdx') || 是调用(r, 'getRoleIdx')) {
    const mask = r.arguments.map(a => 字面(a));
    if (mask.some(m => typeof m !== 'string')) { env.残差.加(n, 'for选择器参数非字面串', env.钩子); return null; }
    sel = { kind: 是调用(r, 'getElementIdx') ? 'element' : 'role', mask };
    设变量(环境2, 变名, { loop: 'index', 深度: 环境2.循环深度 });   // 变量=下标（comp[V] 形态）
  } else if (r.type === 'Identifier' && 查变量(env, r.name) && Array.isArray(查变量(env, r.name).列表)) {
    // for(V of 列表绑定变量)：const A=[1,3] → for(x of A)（源码全库唯一形态；x=下标 comp[x]）
    sel = { kind: 'list', 下标: 查变量(env, r.name).列表 };
    设变量(环境2, 变名, { loop: 'index', 深度: 环境2.循环深度 });
  } else if (r.type === 'Identifier' && 查变量(env, r.name) && 查变量(env, r.name).idxList) {
    // for(V of 下标列表绑定)：let A=getElementIdx("광") → for(x of A)（批次B2：10128；还原为 element/role 选择器）
    const il = 查变量(env, r.name).idxList;
    sel = { kind: il.fn === 'getRoleIdx' ? 'role' : 'element', mask: il.mask };
    设变量(环境2, 变名, { loop: 'index', 深度: 环境2.循环深度 });
  } else {
    env.残差.加(n, 'for右侧形态 ' + 骨架一行(r), env.钩子);
    return null;
  }
  // 排除self归一（两变体，解释器 For 选择器 flag bit0 已承接语义，纯抽取器级归一）：
  //   A: `for(…) { if(V.id==U.id) continue; … }` → 剔除首 if + 排除self（源码 38 处）
  //   B: `for(…) { if(V.id != U.id){ …整体body… } }` → body 换为 then 块 + 排除self（源码最大变体，52 条/36 角）
  //   注：`if($内.id!=$外.id){body}` 嵌套排除上层（10062/10147）不归一——留给 翻条件 CmpNeqPrevId 译成 if 守卫（等价且不改 For 选择器）
  const 命中排除 = 归一排除self(sel, n, 环境2);
  let bodyNodes = 块语句列(n.body);
  if (命中排除 === 1) bodyNodes = bodyNodes.slice(1);
  else if (命中排除 === 2) bodyNodes = 块语句列(bodyNodes[0].consequent);
  const body = 翻语句列(bodyNodes, 环境2);
  if (!body) return null;
  if (命中排除) sel['排除self'] = true;
  return { for: sel, body };
}
// C式for：`for(let V=0; V<N; V++){…}` → range 选择器（上界 N，LoopI=comp[k]）。
//   源码仅“V<N 常数上界 + V++”形态（10006 N=5/10125 N=2/10093 N=4）；其余形态（递减/变量上界）走残差。
//   体内 `if(getRoleIdx("탱").includes(V)){…}` 形态：includes 循环下标条件 → 展开为 role 选择器嵌套？
//   不——引擎无“单下标属于集合”条件，但源码语义 = 只对 탱 포지션生效；抽取为 For(role选择器) 不可行（range 与 role 交集）。
//   实测两种体：①includes(V) 门控 hpUpMe（交集语义）②直接指令（10125 前2位=固定 comp[0..1]）。
//   ①用 TgtInRange 无法表达 → 体内 if 翻译成“循环下标属于 role 集合”条件：新增 DSL kind '循环属role'，
//   解释器用 getRoleIdx(...).includes(idx)。但 idx 不在 iStack（只有 unit）→ 用 unit 判：
//   role[?].indexOf(unit.role)>=0 等价（getRoleIdx 本就是按 role 字面量过滤下标）。
//   → 抽取层归一：`if(getRoleIdx(mask).includes(V))` → {kind:'循环role属',mask}；解释器写死“栈顶unit.role ∈ mask位集”。
function 翻Cfor(n, env) {
  // 批次E-5a：splice 循环形态（10190 ultimate `for(i<U.buff.length){if(b[i].name===N&&b[i].div==D&&b[i].on){spill(i,1);break}}`）
  //   → {spliceFirstBuffOn:{div,name}}（引擎写死 findIndex 删首个命中项；全库唯一）
  {
    const sp = 翻spliceFirstBuffOn(n, env);
    if (sp !== undefined) return sp;   // null=形态像但内部残差；对象=命中；undefined=非此形态（继续常规 Cfor）
  }
  // 批次E-1a：起点归一——`for(V=lo;V<hi;V++)` / `for(V=lo;V<=hi2;V++)`（lo=整数≥0；0 与旧行为一致；
  //   `<=` 归一为 `< hi2+1`——10140 `V=1;V<=2` ≡ [1,3)）。队面恒 5 人：hi>5 的越界形态（10153 `V<L+5`，hi=10）
  //   由 comp[k]=undefined 语义承接（解释器忠实迭代 comp[k] 越界=undefined，与源码完全一致）。
  const init数 = n.init && n.init.type === 'VariableDeclaration' && n.init.declarations.length === 1 ? 数字(n.init.declarations[0].init) : undefined;
  if (init数 !== undefined && init数 >= 0 && Number.isInteger(init数) &&
      n.test && n.test.type === 'BinaryExpression' && ['<', '<='].includes(n.test.operator) && n.test.left.type === 'Identifier' &&
      n.update && n.update.type === 'UpdateExpression' && n.update.operator === '++' && 是标识(n.update.argument, n.test.left.name)) {
    const 变名 = n.test.left.name;
    // 上界来源：①字面数 → range（含下界）②countCall 绑定（含偏移）③temp 快照绑定 ④L±add 星级表达式（批次E-1a：10153 `V<L+5`）
    let sel = null;
    let 上界数 = 数字(n.test.right);
    if (n.test.operator === '<=' && 上界数 !== undefined) 上界数 = 上界数 + 1;   // `<=N` 归一 `<N+1`
    if (上界数 !== undefined) {
      sel = { kind: 'range', 上界: 上界数, 下界: init数 };
    } else if (init数 === 0 && n.test.right.type === 'BinaryExpression' && n.test.right.operator === '+' && 是L(n.test.right.left) && 数字(n.test.right.right) !== undefined) {
      //   星级上界 `V < L+add`（add 整数；`<=` 时归一 +1）：执行期 n=ctx.lib+add（只支持起点 0）
      sel = { kind: 'countLib', 偏移: 数字(n.test.right.right) + (n.test.operator === '<=' ? 1 : 0) };
    } else if (init数 === 0 && n.test.right.type === 'BinaryExpression' && n.test.right.operator === '-' && 是L(n.test.right.left) && 数字(n.test.right.right) !== undefined) {
      sel = { kind: 'countLib', 偏移: -数字(n.test.right.right) + (n.test.operator === '<=' ? 1 : 0) };
    } else if (n.test.right.type === 'Identifier') {
      const 计 = 查变量(env, n.test.right.name);
      if (init数 !== 0) { /* 下界+计数上界组合源码未见——落入下方残差 */ }
      else if (计 && 计.countCall) sel = { kind: 计.countCall.fn === 'getRoleCnt' ? 'countRole' : 'countElement', mask: 计.countCall.mask, 偏移: (计.countCall.偏移 || 0) + (n.test.operator === '<=' ? 1 : 0) };
      // 批次C-9：上界=temp 快照变量（10192：`const V=U.stack; for(k<V)` / 10201：`const V=U.getNest("형"); for(k<V)`）：
      //   快照 Snapshot op 在绑定处已生成（同钩子作用域）；选择器执行期取 ctx.tempVars[槽名] 为迭代次数
      else if (计 && 计.temp) sel = { kind: 'countTemp', temp: 计.temp };
    }
    if (!sel) { env.残差.加(n, 'C式for非常规形态 ' + 骨架一行(n).slice(0, 70), env.钩子); return null; }
    const 环境2 = 新环境(env);
    环境2.循环深度 = (env.循环深度 || 0) + 1;
    设变量(环境2, 变名, { loop: 'index', 深度: 环境2.循环深度 });   // 整数下标变量：comp[V] → $i（LoopI=comp[k]，与 for-of 同解释）
    let bodyNodes = 块语句列(n.body);
    // 归一：整体被 `if(getRoleIdx(mask).includes(V)){…}` 包裹 → role 选择器（语义等价：
    //   getRoleIdx 返升序下标，range×includes 交集 = 直接遍历 role 下标；10006 탱hpUpMe 形态）
    if (bodyNodes.length === 1 && bodyNodes[0].type === 'IfStatement' && !bodyNodes[0].alternate) {
      const t = bodyNodes[0].test;
      const m = t && t.type === 'CallExpression' && t.callee.type === 'MemberExpression' && t.callee.property.name === 'includes' && t.arguments.length === 1 && 是标识(t.arguments[0], 变名) && (是调用(t.callee.object, 'getRoleIdx') || 是调用(t.callee.object, 'getElementIdx')) ? t.callee.object : null;
      if (m) {
        const mask = m.arguments.map(a => 字面(a));
        if (mask.every(x => typeof x === 'string')) {
          sel = { kind: 是调用(m, 'getRoleIdx') ? 'role' : 'element', mask };
          bodyNodes = 块语句列(bodyNodes[0].consequent);
        }
      }
    }
    const body = 翻语句列(bodyNodes, 环境2);
    if (!body) return null;
    return { for: sel, body };
  }
  env.残差.加(n, 'C式for非常规形态 ' + 骨架一行(n).slice(0, 70), env.钩子);
  return null;
}

// for 体内排除self归一，返 1=A形命中 / 2=B形命中 / null=不归一（保留原样走残差，不会静默）：
//   A: `if(V.id==U.id){continue}` 在 body 首位（源码 38 处）
//   B: `if(V.id != U.id){…}` 包裹整个 for 体（bodyNode.length===1，源码最大自比较变体）
function 归一排除self(sel, n, env) {
  const bodyNode = n.body.type === 'BlockStatement' ? n.body.body : [n.body];
  if (!bodyNode.length) return null;
  const 首 = bodyNode[0];
  if (首.type !== 'IfStatement') return null;
  if (首.alternate) return null;   // 带 else 的排除形态不归一
  const t = 首.test;
  if (t.type !== 'BinaryExpression') return null;
  // 条件形态：V.id == U.id / V != U / comp[V].id == U.id（顺序可反）
  const 是循环角色 = r => !!(r && typeof r === 'object' && r.loop);
  const 判 = x => {
    if (x.type === 'MemberExpression' && x.property.name === 'id') return 判(x.object);
    if (x.type === 'MemberExpression' && x.computed && 是标识(x.object, 'comp')) return 是循环角色(查变量(env, x.property.name));
    if (x.type === 'Identifier') return 是循环角色(查变量(env, x.name));
    return false;
  };
  // 自身侧：U 或 U.id（源码两侧都带 .id：V.id != U.id）
  const 判自 = x => 是U(x) || (x.type === 'MemberExpression' && !x.computed && x.property.name === 'id' && 是U(x.object));
  const 两侧 = (判(t.left) && 判自(t.right)) || (判(t.right) && 判自(t.left));
  if (!两侧) return null;
  if (t.operator === '==') {
    const 体 = 块语句列(首.consequent);
    if (体.length !== 1 || 体[0].type !== 'ContinueStatement') return null;
    return 1;   // A：调用方 slice(1) 剔除首 if
  }
  if (t.operator === '!=' && bodyNode.length === 1) return 2;   // B：调用方 body=then块
  return null;
}

// 把 body 里已归一的排除self if 剔除（翻完的 DSL 层操作：首块是 if(loop==U) then[] 且原AST已判命中）
function 剔除continue(body, env, n) { return body; }

// =============================================
// switch(L){case N:…break|default:…} → [{lib:N,then:[…]}…]
// =============================================
function 翻switchLib(n, env) {
  if (!是L(n.discriminant)) { env.残差.加(n, 'switch判据非解放等级', env.钩子); return null; }
  const out = [];
  for (const c of n.cases) {
    let k;
    if (c.test === null) k = 'default';
    else if (c.test.type === 'Literal' && typeof c.test.value === 'number') k = c.test.value;
    else { env.残差.加(c.test || n, 'case判据非字面', env.钩子); return null; }
    // case 体（去掉尾 break）
    const 列 = c.consequent.filter(s => s.type !== 'BreakStatement');
    const 环境c = 新环境(env);
    const body = 翻语句列(列, 环境c);
    if (body === null) { if (列.length === 0) continue; return null; }
    if (body.length === 0) continue;    // 空 case（10141 case1: break;）→ 跳过（LibIf 档跳过语义）
    out.push({ lib: k, then: body });
  }
  // 全空 case（10041 ultbefore 的 `switch(L){case1..5: break;}`）→ 空 lib 序列（语义=什么都不做）。
  // 不能返 null（翻译失败语义）——那会让整个钩子体判死走伞形残差"钩子体不可翻译"却查不到根因。
  if (!out.length) return { __lib序列: [] };
  return { __lib序列: out };
}

// =============================================
// 变量声明/赋值 → temp 快照 / 注入原函数保存 / 内联常量
// =============================================
function 翻变量声明(n, env) {
  if (n.declarations.length !== 1) { env.残差.加(n, '多声明', env.钩子); return null; }
  const d = n.declarations[0];
  if (d.id.type !== 'Identifier') { env.残差.加(n, '解构声明', env.钩子); return null; }
  return 翻绑定(d.id.name, d.init, env, n);
}
// 高频形态识别（源码 66 处）：if(U.stack > N){U.stack=N} → {clampSlot:["stack",null,N]}（上界夹）
//   if(U.stack < N){U.stack=N} → {clampSlot:["stack",N,null]}（下界夹）。
//   返回 undefined=非此形态（走常规 If 翻译）；null=像但翻译失败（残差已记）。
function 翻clamp(n) {
  if (n.type !== 'IfStatement' || n.alternate) return undefined;
  const t = n.test;
  if (t.type !== 'BinaryExpression' || !['>', '>=', '<', '<='].includes(t.operator)) return undefined;
  if (!是成员(t.left, 是U, 'stack')) return undefined;
  const N = 数字(t.right);
  if (N === undefined) return undefined;
  const 体 = 块语句列(n.consequent);
  if (体.length !== 1 || 体[0].type !== 'ExpressionStatement') return undefined;
  const a = 体[0].expression;
  if (!a || a.type !== 'AssignmentExpression' || a.operator !== '=' || !是成员(a.left, 是U, 'stack')) return undefined;
  if (数字(a.right) !== N) return undefined;   // 夹的值必须是比较的同一常数
  // > / >= N → 上界夹 hi=N；< / <= N → 下界夹 lo=N（源码严格>配夹N，>=实际同效——引擎 clampSlot 用严格界夹）
  const 上界 = t.operator === '>' || t.operator === '>=';
  return { clampSlot: 上界 ? ['stack', null, N] : ['stack', N, null] };
}

// 批次E-2b：数值 temp 上限钳 if(V>N){V=N}（10139 `let V=getElementCnt(…); if(V>4){V=4}`）→ {clampTemp:[槽,N]}；
//   非此形态返 undefined（走常规 If 翻译）；只支持上界钳（源码唯一下界形态未见）
function 翻clampTemp(n, env) {
  if (n.type !== 'IfStatement' || n.alternate) return undefined;
  const t = n.test;
  if (t.type !== 'BinaryExpression' || !['>', '>='].includes(t.operator) || t.left.type !== 'Identifier') return undefined;
  const 角 = 查变量(env, t.left.name);
  if (!角 || !角.tempNum) return undefined;
  const N = 数字(t.right);
  if (N === undefined) return undefined;
  const 体 = 块语句列(n.consequent);
  if (体.length !== 1 || 体[0].type !== 'ExpressionStatement') return undefined;
  const a = 体[0].expression;
  if (!a || a.type !== 'AssignmentExpression' || a.operator !== '=' || a.left.type !== 'Identifier' || a.left.name !== t.left.name) return undefined;
  if (数字(a.right) !== N) return undefined;
  return { clampTemp: [角.temp, N] };
}

function 翻赋值语句(e, env) {
  if (e.operator !== '=') {
    // U.stack -= N / += N
    if ((e.operator === '-=' || e.operator === '+=') && 是成员(e.left, 是U, 'stack') && 数字(e.right) !== undefined) {
      return { addSlot: ['stack', e.operator === '-=' ? -数字(e.right) : 数字(e.right)] };
    }
    // <目标>.cd -= N / += N（直接改字段，不同于 cdChange 函数门控；源码 19 处，主体是 U.cd）
    // <目标>.curCd -= N / += N（批次B：源码 10 处，U.curCd±=N 直接复合赋值，无 clamp）
    if ((e.operator === '-=' || e.operator === '+=') && e.left.type === 'MemberExpression' && !e.left.computed &&
        (e.left.property.name === 'cd' || e.left.property.name === 'curCd') &&
        !(e.left.object.type === 'Identifier' && e.left.object.name === 'boss')) {
      const rv = 数字(e.right);
      let 目 = null;
      try { 目 = 翻目标(e.left.object, env); } catch (err) { if (!err.__残差) throw err; }
      if (rv !== undefined && 目) {
        const n = e.operator === '-=' ? -rv : rv;
        const 键 = e.left.property.name === 'curCd' ? 'addCurCd' : 'addCd';
        return 目 === 'self' ? { [键]: n } : { [键]: { 目标: 目, N: n } };
      }
    }
    // 批次E-2b：数值 temp 复合赋值 `V += N` / `V -= N`（10097 `V+=10`；V=let 初始化的累加器）→ AddTemp
    if ((e.operator === '+=' || e.operator === '-=') && e.left.type === 'Identifier' && 数字(e.right) !== undefined) {
      const 角V = 查变量(env, e.left.name);
      if (角V && 角V.tempNum) return { addTemp: [角V.temp, e.operator === '-=' ? -数字(e.right) : 数字(e.right)] };
    }
    env.残差.加(e, '复合赋值 ' + 骨架一行(e), env.钩子);
    return null;
  }
  // boss.def = false → 指令形
  if (是标识(e.left.object, 'boss') && e.left.property && e.left.property.name === 'def' && e.right.type === 'Literal' && e.right.value === false) {
    return { bossDefOff: true };
  }
  // <目标>.cd = N / .curCd = N（赋值形；源码 10087 U.cd=3 / 10124 else 分支 cd=3+curCd=3）
  if (e.left.type === 'MemberExpression' && !e.left.computed && (e.left.property.name === 'cd' || e.left.property.name === 'curCd') && !是标识(e.left.object, 'boss')) {
    const rv = 数字(e.right);
    if (rv !== undefined) {
      let 目 = null;
      try { 目 = 翻目标(e.left.object, env); } catch (err) { if (!err.__残差) throw err; }
      if (目) {
        const 键 = e.left.property.name === 'curCd' ? 'setCurCd' : 'setCd';
        return 目 === 'self' ? { [键]: rv } : { [键]: { 目标: 目, N: rv } };
      }
    }
  }
  // U.stack = N → setSlot（批次C-8：含负数 Unary 形态，用 数字()）
  if (是成员(e.left, 是U, 'stack') && 数字(e.right) !== undefined) {
    return { setSlot: ['stack', 数字(e.right)] };
  }
  // 批次C-7：U.stack = U.getNest("형")（10183 注入体后置，全库唯一）→ setSlotNest（新 op，引擎写死 stack=getNest(型)）
  if (是成员(e.left, 是U, 'stack') && e.right.type === 'CallExpression' && 是成员(e.right.callee, 是U, 'getNest') &&
      e.right.arguments.length === 1 && typeof 字面(e.right.arguments[0]) === 'string') {
    return { setSlotNest: 字面(e.right.arguments[0]) };
  }
  // 批次C-4：hpUltDmg/hpAtkDmg 赋值：`V.hpUltDmg = V.hp * N`（10050/10144 ultimate switch 各档；引擎定长字段，伤害期 /100 用）：
  //   值表达式复用 翻hpExpr（base=self，field=hp，无 armorUp）→ {setHpDmg:{field:'ult'|'atk',目标,expr}}
  if (e.left.type === 'MemberExpression' && !e.left.computed && (e.left.property.name === 'hpUltDmg' || e.left.property.name === 'hpAtkDmg')) {
    const 字段 = e.left.property.name === 'hpUltDmg' ? 'ult' : 'atk';
    const expr = 翻hpExpr(e.right, env);
    if (expr) {
      let 目 = null;
      try { 目 = 翻目标(e.left.object, env); } catch (err) { if (!err.__残差) throw err; }
      if (目) return { setHpDmg: { 字段, 目标: 目, expr } };
    }
  }
  // 批次C-3：curCd 三元手卷 clamp：`V.curCd = V.curCd < N ? X : V.curCd - M`（源码全库唯一 10025 passive）。
  //   直译三参数交给解释器执行（不做等价归一推理，bit 一致天然成立），base 两侧必须同一目标且与 left 同目标。
  if (e.left.type === 'MemberExpression' && !e.left.computed && e.left.property.name === 'curCd' &&
      e.right.type === 'ConditionalExpression' && e.right.test.type === 'BinaryExpression' && e.right.test.operator === '<' &&
      是成员(e.right.test.left, 是U, 'curCd') && e.right.alternate.type === 'BinaryExpression' && e.right.alternate.operator === '-' &&
      是成员(e.right.alternate.left, 是U, 'curCd')) {
    const N = 数字(e.right.test.right), X = 数字(e.right.consequent), M = 数字(e.right.alternate.right);
    if (N !== undefined && X !== undefined && M !== undefined) {
      let 目 = null;
      try { 目 = 翻目标(e.left.object, env); } catch (err) { if (!err.__残差) throw err; }
      if (目) return { clampCurCd: { 目标: 目, N, X, M } };
    }
  }
  // U.<钩子|属性> = … / <find槽变量>.<旗标属性> = 字面 / <循环变量>.<方法> = function（批次C-6：10183/10204/10205 for体内注入 V.attack）
  //   （旧 '注入目标' 键从未被任何绑定设置——死条件已清理；循环变量基座=loop:'unit' 角色）
  if (e.left.type === 'MemberExpression' && !e.left.computed && (是U(e.left.object) || (e.left.object.type === 'Identifier' && (() => { const 角色 = 查变量(env, e.left.object.name); return 角色 && (角色.find !== undefined || 角色.loop === 'unit'); })()) || (e.left.object.type === 'MemberExpression'))) {
    return 翻属性赋值(e.left, e.right, env, e);
  }
  // V = <值>（局部重绑 temp）
  if (e.left.type === 'Identifier') return 翻绑定(e.left.name, e.right, env, e);
  env.残差.加(e, '赋值形态 ' + 骨架一行(e), env.钩子);
  return null;
}

// 绑定翻译：temp 快照 / orig 保存 / 内联常量 / findIndex 残差
// 判定 comp.reduce((a,b)=>{if(b.curHp<a.curHp)return b;else return a},comp[0]) 形态（批次B）：
//   回调体是"b.curHp<a.curHp?return b:return a"（if/else 或三元均可），初值 comp[0]——全队最低 curHp，唯一实例→Target.LowestHp
function 是最低hpReduce(n) {
  if (!n || n.type !== 'CallExpression') return false;
  // comp.reduce(fn, comp[0])
  const c = n.callee;
  if (!(c && c.type === 'MemberExpression' && c.property.name === 'reduce' && c.object.type === 'Identifier' && c.object.name === 'comp')) return false;
  if (n.arguments.length !== 2) return false;
  const [lam, init0] = n.arguments;
  if (!(lam.type === 'ArrowFunctionExpression' || lam.type === 'FunctionExpression') || lam.params.length !== 2) return false;
  if (!init0 || init0.type !== 'MemberExpression' || !是标识(init0.object, 'comp') || 数字(init0.property) !== 0) return false;
  // lam.body 形如 {if(b.curHp<a.curHp){return b}else{return a}} 或 (a,b)=>b.curHp<a.curHp?b:a
  const [pa, pb] = lam.params;
  function 比较命中(node) {
    return node.type === 'BinaryExpression' && node.operator === '<' &&
      node.left.type === 'MemberExpression' && 是标识(node.left.object, pb.name) && node.left.property.name === 'curHp' &&
      node.right.type === 'MemberExpression' && 是标识(node.right.object, pa.name) && node.right.property.name === 'curHp';
  }
  function 是返回(node, 名) {
    // if 体可能是 {return b} 或裸 return b——先拆块语句列取唯一语句
    const stmts2 = 块语句列(node);
    return stmts2.length === 1 && stmts2[0].type === 'ReturnStatement' && stmts2[0].argument && 是标识(stmts2[0].argument, 名);
  }
  const body = lam.body;
  if (body.type === 'ConditionalExpression') return 比较命中(body.test) && 是标识(body.consequent, pb.name) && 是标识(body.alternate, pa.name);
  const stmts = 块语句列(body);
  if (stmts.length !== 1 || stmts[0].type !== 'IfStatement') return false;
  const ifst = stmts[0];
  if (!比较命中(ifst.test)) return false;
  if (!是返回(ifst.consequent, pb.name)) return false;
  if (!ifst.alternate) return false;
  if (!是返回(ifst.alternate, pa.name)) return false;
  return true;
}


function 翻绑定(名, init, env, 节点) {
  if (!init) { 设变量(env, 名, { const: undefined }); return { __空: true }; }
  // 批次E-5b：手卷 argmax 死累加器（let I=0 / let B=999999999，被后随 for 模式整体消费）→ 只登记不发射 Snapshot
  //   （999999999×10⁴ 会 i32 定点溢出；且 B/I 不再作数值 temp 读——模式外引用会落 未知标识符残差，失败安全）；
  //   不 设变量：I 由 翻手卷argmax 重绑 find 槽，B 死变量无绑定
  if (节点 && 节点.kind === 'let' && init.type === 'Literal' && typeof init.value === 'number' && env.argmax死 && env.argmax死.has(名)) return { __空: true };
  // 批次E-4：子程序体 `const X = <falsy形参> || <右表达式>`（10158 `_0x41bcc6 || _0x506482.getNest(T)`，b 实参恒 falsy）→
  //   左形参角色 subFalsy 则剥 `b||`，递归翻右（右=`<目标a>.getNest(T)` 走既有 getNest temp 分支，目标=a形参角色→'$i'）
  if (init.type === 'LogicalExpression' && init.operator === '||' && init.left.type === 'Identifier') {
    const 左角F = 查变量(env, init.left.name);
    if (左角F && 左角F.subFalsy) return 翻绑定(名, init.right, env, 节点);
  }
  // 批次E-2b：已登记为数值 temp 的变量重赋值 `V = N`（10139 钳制分支 `V=4`）→ Snapshot 重设（同槽名覆写 tempVars）；
  //   经 翻赋值语句 尾部 `V=<值>` 路由到达（非 let 声明）；非数值右值走内联常量旧路径
  const 已绑 = 查变量(env, 名);
  if (已绑 && 已绑.tempNum && init.type === 'Literal' && typeof init.value === 'number') {
    return { temp: [已绑.temp, { 常数: init.value }] };
  }
  // 批次E-2b：`let V = N` 数值 temp 常数初始化（10097 `let V=0; V+=10; hpUpAll(V)`；const+数字仍走内联常量旧路径）：
  //   tempNum 角色：条件位 V<op>N 复用 temp 分支（CmpTemp）；值位走 TempVal；累加走 AddTemp
  if (节点 && 节点.kind === 'let' && init.type === 'Literal' && typeof init.value === 'number') {
    设变量(env, 名, { temp: 'v_' + 名, tempNum: true });
    return { temp: ['v_' + 名, { 常数: init.value }] };
  }
  // 批次E-2b：`let V = getRoleCnt/getElementCnt(mask…)` 数值 temp 计数快照（10139 `let V=getElementCnt("광","화"); if(V>4)V=4;…; nbf(…,V,4)`）：
  //   快照时机=钩子执行到声明处（与 let 初始化同时机）；const+计数仍走旧 countCall 内联绑定
  if (节点 && 节点.kind === 'let' && init.type === 'CallExpression' && init.callee.type === 'Identifier' &&
      (init.callee.name === 'getRoleCnt' || init.callee.name === 'getElementCnt') &&
      init.arguments.length >= 1 && init.arguments.every(a => typeof 字面(a) === 'string')) {
    设变量(env, 名, { temp: 'v_' + 名, tempNum: true });
    return { temp: ['v_' + 名, { countCall: { fn: init.callee.name, mask: init.arguments.map(a => 字面(a)) } }] };
  }
  // const V = U.getNest("S") → temp（注入快照或钩子顶层）
  if (init.type === 'CallExpression' && 是成员(init.callee, 是U, 'getNest') && init.arguments.length === 1 && typeof 字面(init.arguments[0]) === 'string') {
    设变量(env, 名, { temp: 'v_' + 名 });
    return { temp: ['v_' + 名, { getNest: 字面(init.arguments[0]) }] };
  }
  // const V = <目标>.getNest("S")（注入体/循环目标）
  if (init.type === 'CallExpression' && init.callee.type === 'MemberExpression' && init.callee.property.name === 'getNest' && init.arguments.length === 1 && typeof 字面(init.arguments[0]) === 'string') {
    let 目 = null;
    try { 目 = 翻目标(init.callee.object, env); } catch (e) { if (!e.__残差) throw e; }
    if (目 === '$i') {
      设变量(env, 名, { temp: 'v_' + 名 });
      return { temp: ['v_' + 名, { getNest: 字面(init.arguments[0]), 目标: '$i' }] };
    }
    env.残差.加(init, 'getNest基座形态', env.钩子);
    return null;
  }
  // const V = U.stack → temp slot 快照
  if (是成员(init, 是U, 'stack')) {
    设变量(env, 名, { temp: 'v_' + 名 });
    return { temp: ['v_' + 名, { slot: 'stack' }] };
  }
  // 批次C-10b：const V = boss.def → temp boss字段快照（10197/10173 `const V=boss.def; ultLogic(u,5); if(V)`——
  //   快照时机在指令序中原位忠实执行；字段白名单 def（源码唯一实例；其它 boss 字段见到再扩）
  if (init.type === 'MemberExpression' && !init.computed && 是标识(init.object, 'boss') && init.property.name === 'def') {
    设变量(env, 名, { temp: 'v_' + 名 });
    return { temp: ['v_' + 名, { bossField: 'def' }] };
  }
  // 批次C-10b：let V = comp.findIndex(x=>x.id==U.id) → selfIdx 绑定（10136 passive；不产指令——
  //   执行期 CmpSelfIdx 直接比 comp.indexOf(ctx.u)，与 findIndex 等价：同 id 同单位；未命中时两者都 -1）
  if (init.type === 'CallExpression' && init.arguments.length === 1 &&
      init.callee.type === 'MemberExpression' && !init.callee.computed && init.callee.property.name === 'findIndex' && 是标识(init.callee.object, 'comp')) {
    const lam3 = init.arguments[0];
    if (lam3 && (lam3.type === 'ArrowFunctionExpression' || lam3.type === 'FunctionExpression') && lam3.params.length === 1 && lam3.params[0].type === 'Identifier') {
      const b3 = lam3.body.type === 'BlockStatement' && lam3.body.body.length === 1 && lam3.body.body[0].type === 'ReturnStatement' ? lam3.body.body[0].argument : lam3.body;
      if (b3 && b3.type === 'BinaryExpression' && b3.operator === '==' &&
          b3.left.type === 'MemberExpression' && 是标识(b3.left.object, lam3.params[0].name) && b3.left.property.name === 'id' &&
          (是U(b3.right) || 是成员(b3.right, 是U, 'id'))) {
        设变量(env, 名, { selfIdx: true });
        return { __空: true };
      }
    }
    env.残差.加(init, '绑定初值形态 comp.findIndex 谓词非常规 ' + 骨架一行(init).slice(0, 90), env.钩子);
    return null;
  }
  // const V = <目标>.<方法>（保存原函数引用——注入 wrap 的前奏）
  //   基座可以是 U（自身注入）、comp[V]（loop 下标，10177 leader）、comp[N]（固定位，10188 passive）、V（loopUnit）
  if (init.type === 'MemberExpression' && !init.computed && init.property.type === 'Identifier') {
    const 基目 = 翻目标Safe(init.object, env);
    if (基目 !== '?') {
      设变量(env, 名, { orig: init.property.name, 目标: 基目 });
      return { __空: true };   // orig 保存不产生指令（InjectStart 语义包含）；__空≠翻译失败
    }
  }
  // const V = getElKind() → 运行时绑定变量（条件位比较时翻成 元素种类 条件；10177 leader）
  if (是调用(init, 'getElKind', 0)) { 设变量(env, 名, { getElKind: true }); return { __空: true }; }
  // 批次C-5b：const V = getRoKind() → 绑定变量（条件位 V<op>N 内联还原为职务种类；10213/10201 turnstart）
  if (是调用(init, 'getRoKind', 0)) { 设变量(env, 名, { getRoKind: true }); return { __空: true }; }
  // const V = getRoleCnt(…)/getElementCnt(…) → 计数绑定变量（批次B2：条件位 V>=N 内联还原为 role/元素计数条件；
  //   钩子执行期内 comp 的 role/element 不变 → 内联 bit 一致；值位使用（turn=V）仍走残差）
  if (init.type === 'CallExpression' && init.callee.type === 'Identifier' &&
      (init.callee.name === 'getRoleCnt' || init.callee.name === 'getElementCnt') &&
      init.arguments.length >= 1 && init.arguments.every(a => typeof 字面(a) === 'string')) {
    设变量(env, 名, { countCall: { fn: init.callee.name, mask: init.arguments.map(a => 字面(a)) } });
    return { __空: true };
  }
  // 批次C-8：const V = getRoleCnt(…)-N 计数绑定带偏移（10198 turnstart：`const V=getRoleCnt("딜","디","탱")-1; for(k=0;k<V;k++)`）：
  //   只用于 Cfor 上界（选择器执行期现算），不进条件位（条件位的 V<op>N 带偏移形态源码未见，见到再扩）
  if (init.type === 'BinaryExpression' && init.operator === '-' && init.left.type === 'CallExpression' &&
      init.left.callee.type === 'Identifier' && (init.left.callee.name === 'getRoleCnt' || init.left.callee.name === 'getElementCnt') &&
      init.left.arguments.length >= 1 && init.left.arguments.every(a => typeof 字面(a) === 'string') && 数字(init.right) !== undefined) {
    设变量(env, 名, { countCall: { fn: init.left.callee.name, mask: init.left.arguments.map(a => 字面(a)), 偏移: -数字(init.right) } });
    return { __空: true };
  }
  // let V = getRoleIdx(…)/getElementIdx(…) → 下标列表绑定变量（批次B2：for(x of V) 还原为 role/element 选择器，
  //   10128 leader 形态；getRoleIdx 返回确定下标序，内联一致）
  if (init.type === 'CallExpression' && init.callee.type === 'Identifier' &&
      (init.callee.name === 'getRoleIdx' || init.callee.name === 'getElementIdx') &&
      init.arguments.length >= 1 && init.arguments.every(a => typeof 字面(a) === 'string')) {
    设变量(env, 名, { idxList: { fn: init.callee.name, mask: init.arguments.map(a => 字面(a)) } });
    return { __空: true };
  }
  // const V = comp.reduce((a,b)=>{if(b.curHp<a.curHp)return b;else return a},comp[0]) → 最低hp目标绑定（批次B）
  if (是最低hpReduce(init)) { 设变量(env, 名, { lowestHp: true }); return { __空: true }; }
  // 批次E-5b：`const V = comp.filter(x=>x.role==N)` → filterRoles 绑定（10111 leader；仅作后续 reduce 基座，不产指令）
  if (init.type === 'CallExpression' && init.arguments.length === 1 &&
      init.callee.type === 'MemberExpression' && !init.callee.computed && init.callee.property.name === 'filter' && 是标识(init.callee.object, 'comp')) {
    const lamF = init.arguments[0];
    if (lamF && (lamF.type === 'ArrowFunctionExpression' || lamF.type === 'FunctionExpression') && lamF.params.length === 1 && lamF.params[0].type === 'Identifier') {
      let bF = lamF.body.type === 'BlockStatement' && lamF.body.body.length === 1 && lamF.body.body[0].type === 'ReturnStatement' ? lamF.body.body[0].argument : lamF.body;
      // 支持单项 x.role==N 或 || 多项（集合）
      const role位 = [];
      let 解析成 = true;
      (function 收(x) {
        if (x.type === 'LogicalExpression' && x.operator === '||') { 收(x.left); 收(x.right); return; }
        if (x.type === 'BinaryExpression' && x.operator === '==' && x.left.type === 'MemberExpression' &&
            是标识(x.left.object, lamF.params[0].name) && x.left.property.name === 'role' && 数字(x.right) !== undefined) { role位.push(数字(x.right)); return; }
        解析成 = false;
      })(bF);
      if (解析成 && role位.length >= 1) {
        设变量(env, 名, { filterRoles: role位 });
        return { __空: true };
      }
    }
    env.残差.加(init, '绑定初值形态 comp.filter 谓词非常规 ' + 骨架一行(init).slice(0, 90), env.钩子);
    return null;
  }
  // 批次E-5b：`let W = <基座>.reduce((a,b)=>{if(b.F><op>a.F){return b}else{return a}}, <基座>[0])` → findMaxUnit：
  //   基座 = comp 或 filterRoles 绑定变量（10111 两段）；严格比较+初值首元素=平局取先（与源码 reduce 逐位一致）；
  //   W 绑 find 槽（目标/值位 {find:槽}；空集→null；10111 调用点受 V.length!=0 守卫，comp 直接 reduce 永有命中）。
  //   字段名 F 白名单 hp/atk；方向：`>`=max `<`=min；右体必须 a/b 二选一全返（无副作用）
  if (init.type === 'CallExpression' && init.arguments.length === 2 &&
      init.callee.type === 'MemberExpression' && !init.callee.computed && init.callee.property.name === 'reduce') {
    const 基座n = init.callee.object;
    let role过滤 = null;
    if (是标识(基座n, 'comp')) role过滤 = [];
    else if (基座n.type === 'Identifier') { const 角B = 查变量(env, 基座n.name); if (角B && 角B.filterRoles) role过滤 = 角B.filterRoles; }
    if (role过滤 !== null && init.arguments[1].type === 'MemberExpression' && init.arguments[1].computed &&
        (是标识(init.arguments[1].object, 'comp') || (init.arguments[1].object.type === 'Identifier' && 是标识(基座n, init.arguments[1].object.name))) &&
        数字(init.arguments[1].property) === 0) {
      const lamR = init.arguments[0];
      if (lamR && (lamR.type === 'ArrowFunctionExpression' || lamR.type === 'FunctionExpression') && lamR.params.length === 2 &&
          lamR.params[0].type === 'Identifier' && lamR.params[1].type === 'Identifier') {
        const aN2 = lamR.params[0].name, bN2 = lamR.params[1].name;
        const rb = lamR.body.type === 'BlockStatement' ? lamR.body.body : [{ type: 'ReturnStatement', argument: lamR.body }];
        // 体形态：if(b.F > a.F){return b}else{return a}（单 if 无 else + 尾 return 亦可——源码是完整 if/else）
        let fieldR = null, 方向R = null, 解析R = true;
        if (rb.length === 1 && rb[0].type === 'IfStatement' && rb[0].alternate && rb[0].alternate.type === 'BlockStatement') {
          const tR = rb[0].test;
          if (tR.type === 'BinaryExpression' && ['>', '<'].includes(tR.operator) &&
              tR.left.type === 'MemberExpression' && 是标识(tR.left.object, bN2) && ['hp', 'atk'].includes(tR.left.property.name) &&
              tR.right.type === 'MemberExpression' && 是标识(tR.right.object, aN2) && tR.right.property.name === tR.left.property.name) {
            fieldR = tR.left.property.name; 方向R = tR.operator === '>' ? 'max' : 'min';
            const thenS = 块语句列(rb[0].consequent), elseS = 块语句列(rb[0].alternate);
            const 是返 = (l, x) => l.length === 1 && l[0].type === 'ReturnStatement' && 是标识(l[0].argument, x);
            if (!(是返(thenS, bN2) && 是返(elseS, aN2))) 解析R = false;
          } else 解析R = false;
        } else 解析R = false;
        if (解析R && fieldR) {
          const 槽R = (env.残差.nextFindSlot = (env.残差.nextFindSlot || 0));
          if (槽R > 7) { env.残差.加(init, 'find 槽超限(>8)', env.钩子); return null; }
          env.残差.nextFindSlot++;
          设变量(env, 名, { find: 槽R, findMax: true });
          return { findMaxUnit: { 槽: 槽R, field: fieldR, role过滤, 方向: 方向R } };
        }
      }
    }
    if (role过滤 !== null || (init.callee.object.type === 'Identifier' && 是标识(init.callee.object, 'comp'))) {
      env.残差.加(init, '绑定初值形态 reduce argmax 非标准体 ' + 骨架一行(init).slice(0, 90), env.钩子);
      return null;
    }
  }
  // const V = comp.find(x => x.id == N) → find 槽绑定（批次B2：10034/10035 顶层 + 10043/10052 钩子内）：
  //   产 FindUnit 指令（槽号从残差集对象的全局计数器分配，每角色独立）；引用点：裸 if(V) → find真值条件，
  //   目标位 → {find:槽}（TempUnit），atkRef V.id → {+findId:槽}。可能 null（角色不在队），源码均受 if(V) 守卫
  if (init.type === 'CallExpression' && init.arguments.length === 1 &&
      init.callee.type === 'MemberExpression' && init.callee.property.name === 'find' &&
      init.callee.object.type === 'Identifier' && init.callee.object.name === 'comp') {
    const lam0 = init.arguments[0];
    if (lam0 && (lam0.type === 'ArrowFunctionExpression' || lam0.type === 'FunctionExpression') && lam0.params.length === 1 && lam0.params[0].type === 'Identifier') {
      let b0 = lam0.body.type === 'BlockStatement' && lam0.body.body.length === 1 && lam0.body.body[0].type === 'ReturnStatement' ? lam0.body.body[0].argument : lam0.body;
      if (b0 && b0.type === 'BinaryExpression' && b0.operator === '==' &&
          b0.left.type === 'MemberExpression' && 是标识(b0.left.object, lam0.params[0].name) && b0.left.property.name === 'id' &&
          typeof 数字(b0.right) === 'number') {
        const 槽 = (env.残差.nextFindSlot = (env.残差.nextFindSlot || 0));
        if (槽 > 7) { env.残差.加(init, 'find 槽超限(>8)', env.钩子); return null; }
        env.残差.nextFindSlot++;
        设变量(env, 名, { find: 槽, findId: 数字(b0.right) });
        return { findUnit: { 槽, id: 数字(b0.right) } };
      }
    }
    env.残差.加(init, '绑定初值形态 comp.find 谓词非常规 ' + 骨架一行(init).slice(0, 90), env.钩子);
    return null;
  }
  // const V = <目标>.buff.find(x => x.<field>=="S" && …) → findBuff 槽绑定（批次B2：10052 L3420/10058 L3706）：
  //   谓词=条件项合取（field∈div/type/name/act，字面串值）；逐字面翻译，矛盾谓词（同字段双比较如 10052）解释器自然恒假 bit 一致
  if (init.type === 'CallExpression' && init.arguments.length === 1 &&
      init.callee.type === 'MemberExpression' && init.callee.property.name === 'find' &&
      init.callee.object.type === 'MemberExpression' && !init.callee.object.computed && init.callee.object.property.name === 'buff') {
    const lam1 = init.arguments[0];
    let 目标b = null;
    try { 目标b = 翻目标(init.callee.object.object, env); } catch (e) { if (!e.__残差) throw e; }
    if (目标b == null) { env.残差.加(init, 'findBuff 目标不可译 ' + 骨架一行(init.callee.object.object).slice(0, 60), env.钩子); return null; }
    if (lam1 && (lam1.type === 'ArrowFunctionExpression' || lam1.type === 'FunctionExpression') && lam1.params.length === 1 && lam1.params[0].type === 'Identifier') {
      const 项 = [];
      let ok1 = true;
      const 项字段 = ['div', 'type', 'name', 'act'];
      const 收项 = x => {
        if (!ok1) return;
        if (x.type === 'LogicalExpression' && x.operator === '&&') { 收项(x.left); 收项(x.right); return; }
        // x.<field> == "S"
        let field = null, str = null;
        if (x.type === 'BinaryExpression' && x.operator === '==') {
          if (x.left.type === 'MemberExpression' && 是标识(x.left.object, lam1.params[0].name) && 项字段.includes(x.left.property.name) && typeof 字面(x.right) === 'string') {
            field = x.left.property.name; str = 字面(x.right);
          }
        }
        if (field == null) { ok1 = false; return; }
        项.push({ field, 串: str });
      };
      const body1 = lam1.body.type === 'BlockStatement' && lam1.body.body.length === 1 && lam1.body.body[0].type === 'ReturnStatement' ? lam1.body.body[0].argument : lam1.body;
      if (body1) 收项(body1);
      if (ok1 && 项.length >= 1 && 项.length <= 8) {
        const 槽 = (env.残差.nextFindSlot = (env.残差.nextFindSlot || 0));
        if (槽 > 7) { env.残差.加(init, 'find 槽超限(>8)', env.钩子); return null; }
        env.残差.nextFindSlot++;
        设变量(env, 名, { findBuff: 槽 });
        return { findBuff: { 槽, 目标: 目标b, 谓词: 项 } };
      }
    }
    env.残差.加(init, '绑定初值形态 buff.find 谓词非常规 ' + 骨架一行(init).slice(0, 90), env.钩子);
    return null;
  }
  // const V = [a,b,…]（全数字字面量数组）→ 列表绑定变量（for(x of V) 的下标选择器；源码全库唯一 [1,3]）
  if (init.type === 'ArrayExpression' && init.elements.length >= 1 && init.elements.every(el => typeof 数字(el) === 'number')) {
    设变量(env, 名, { 列表: init.elements.map(el => 数字(el)) });
    return { __空: true };
  }
  // const V = <字面>（内联常量）；含一元负号
  const 字面数 = 数字(init);
  if (init.type === 'Literal' || 字面数 !== undefined) { 设变量(env, 名, { const: init.type === 'Literal' ? init.value : 字面数 }); return { __空: true }; }
  // let V = comp.findIndex(...) → 残差（下标定位形态，DSL 暂无）
  env.残差.加(节点, '绑定初值形态 ' + 骨架一行(init), env.钩子);
  return null;
}
function 翻目标Safe(n, env) { try { return 翻目标(n, env); } catch (e) { return '?'; } }

// =============================================
// 属性赋值：U.<钩子> = fn（主体）/ U.<方法> = fn（注入 or 谓词）/ comp[N].<方法> = fn（注入）
// =============================================
function 翻属性赋值(left, right, env, 语句节点) {
  const 名 = left.property.name;
  const 基 = left.object;
  // U.<主钩子> = function(){…}
  if (是U(基) && 主钩子.has(名) && (right.type === 'FunctionExpression' || right.type === 'ArrowFunctionExpression')) {
    // 钩子主体在装配主流程处理（这里不直接翻译——由 抽取角色 顶层驱动）
    env.残差.加(语句节点, '钩子赋值出现在非顶层?', env.钩子);
    return null;
  }
  // 注入形态：comp[V].<方法> = function(…args){ …orig.apply… } / V目标.<方法> = …
  if (right.type === 'FunctionExpression' || right.type === 'ArrowFunctionExpression') {
    // 批次E-3a：U.getArmor = function(){return 0} → ArmorZero 旗标（10133 leader `if(getRoleCnt("섶")>=2){U.getArmor=…return 0}`）。
    //   基类 getArmor 返回值参与护甲减伤计算，角色专属覆盖=护甲归零；ArmorZero 旗标位（case 0: u.getArmor=()=>0）已在 C-10b 落地，
    //   钩子体内出现 → 运行期 SetFlag 指令（非装配位，忠实"仅执行到才置位"语义，与 cmdFlag 注释一致）。仅 self 基座。
    if (是U(基) && 名 === 'getArmor') {
      const body = right.body.type === 'BlockStatement' ? right.body.body : [{ type: 'ReturnStatement', argument: right.body }];
      if (body.length === 1 && body[0].type === 'ReturnStatement' && 数字(body[0].argument) === 0) return { flag: 'ArmorZero' };
    }
    let 目 = null;
    try { 目 = 翻目标(基, env); } catch (e) { if (!e.__残差) throw e; }
    if (目) {
      const inj = 翻注入(基, 名, right, env, 语句节点);
      if (inj !== null) return inj;
      return null;   // 残差已记
    }
  }
  // <目标>.<标量属性> = 字面（isSealed/stopCd/canCDChange/turnHeal 旗标位；自身=装配期旗标，
  //   其它目标（comp[V] 循环内）=执行期指令化 SetFlag 目标形；10149）
  if ((是U(基) || 基.type === 'MemberExpression' || 基.type === 'Identifier') && right.type === 'Literal') {
    const 旗 = { isSealed: 'IsSealed', stopCd: 'StopCd', turnHeal: 'TurnHeal' };
    let flagName = null;
    if (typeof right.value === 'boolean' && 名 === 'stack') flagName = right.value ? 'StackTrue' : 'StackFalse';   // 批次C-10b：10097 stack 布尔旗标（保留 true/false 型，getState diff 一致；非数值 stack）
    else if (名 in 旗 && right.value === true) flagName = 旗[名];
    else if (名 === 'stopCd' && right.value === false) flagName = 'StopCdOff';   // 批次B2：反向旗标（10052 else 分支）
    else if (名 === 'canCDChange' && right.value === false) flagName = 'NoCdChange';
    else if (名 === 'canCDChange' && right.value === true) flagName = 'CanCdOn';   // 批次B2：反向旗标（10058 else 分支）
    else if (名 === 'turnHeal' && right.value === false) flagName = 'TurnHealOff';   // 批次C-10b：10134 case顶层+turnover 钩子内（运行期 SetFlag 指令，忠实只在执行到时置位）
    else if (名 === 'check' && right.value === true) flagName = 'CheckOn';         // 批次C-10b：10140 case顶层
    else if (名 === 'check' && right.value === false) flagName = 'CheckOff';        // 批次C-10b：10140 turnstart 钩子内
    if (flagName) {
      if (是U(基)) return { flag: flagName };
      let 目 = null;
      try { 目 = 翻目标(基, env); } catch (e) { if (!e.__残差) throw e; }
      if (目) return { flag: flagName, 目标: 目 };
    }
    // 批次E-3b：非旗标布尔字段直接赋值 `<目标>.<field>=true/false`（10140 `comp[V].isFirstTurnActed=false/true`；
    //   纯状态位无引擎副作用→SetUnitField op；字段白名单同读取侧 単位字段表）
    if (typeof right.value === 'boolean' && 单位字段表.includes(名)) {
      let 目F = null;
      try { 目F = 翻目标(基, env); } catch (e) { if (!e.__残差) throw e; }
      if (目F) return { setUnitField: { 目标: 目F, field: 名, value: right.value } };
    }
    env.残差.加(语句节点, `<目标>.${名}=${JSON.stringify(right.value)} 无旗标映射(或需数值参数)`, env.钩子);
    return null;
  }
  env.残差.加(语句节点, '属性赋值形态 ' + 骨架一行(语句节点), env.钩子);
  return null;
}

// 注入翻译：function(...args){ [快照] [前置] orig.apply(this,args) [后置] } → inject DSL
//   前置段 = orig.apply 之前的指令；后置段 = 之后；无 orig.apply → 替换模式
function 翻注入(基, 方法, fn, env, 语句节点) {
  const 方法集 = new Set(['ultimate', 'attack', 'defense', 'ultbefore', 'ultafter', 'atkbefore', 'atkafter', 'hit', 'act_attack', 'act_ultimate']);
  // 批次E-5a：act_attack/act_ultimate 注入（10190 leader 循环内 `V.act_attack=function(...args){orig.apply;后置}`）——
  //   与 standard 钩子注入完全同构（环绕模式），仅方法名不同；METHOD_ID/__MECH_METHOD 同步扩 10/11
  if (!方法集.has(方法)) { env.残差.加(语句节点, '注入方法非标准集: ' + 方法, env.钩子); return null; }
  let 目;
  try { 目 = 翻目标(基, env); } catch (e) { if (e.__残差) { env.残差.加(语句节点, '注入目标不可译: ' + 骨架一行(基), env.钩子); return null; } throw e; }   // 2026-09-20 修：曾静默吞残差（10204 真因被隐藏）
  const 环境N = 新环境(env);
  // 注入体内变量环境：this=被注入者；循环上下文继承
  const body = fn.body.type === 'BlockStatement' ? fn.body.body : [{ type: 'ReturnStatement', argument: fn.body }];
  const 快照 = [], 前置 = [], 后置 = [];
  let 见Orig = false, 模式 = null;
  // 扫描 body：temp 绑定→快照段；见 orig.apply 之前的非 temp 指令→前置段；之后→后置段
  //   段分配 bug 修复：原用单变量 `段=快照` 导致前置点灯指令被塞进快照（环绕模式判不出，
  //   승나미 leader 注入会被误抽为"追加"，追加模式引擎不执行快照/前置 → 功能错）
  for (const s of body) {
    if (s.type === 'ExpressionStatement' && s.expression.type === 'CallExpression' && s.expression.callee.type === 'MemberExpression' &&
        (s.expression.callee.property.name === 'apply' ||
         (s.expression.callee.property.name === 'call' && s.expression.arguments.length === 1 && s.expression.arguments[0].type === 'ThisExpression'))) {
      // orig.apply(this,args) 与 orig.call(this) 变体（批次C-8：10174 hit 无参注入用 .call(this)）——都触发 见Orig 分段
      const oName = s.expression.callee.object.type === 'Identifier' ? s.expression.callee.object.name : null;
      const 角色 = oName ? 查变量(env, oName) : null;
      if (角色 && 角色.orig === 方法) { 见Orig = true; continue; }
    }
    const r = 翻语句(s, 环境N);
    if (r === null && s.type !== 'EmptyStatement') { return null; }   // 残差已记
    if (r === null) continue;
    if (r.__空) continue;
    if (r.__原调用) { continue; }
    // 批次E-4：段内指令可能是 {块:列}（子程序内联/BlockStatement 产物，如 10173 hit wrap 后置 tmpfunc()）——
    //   flatten cmdInject 对段逐条 compile 不识 '块' 键，必须先展平（与 翻语句列/翻钩子体 同款消费规则）
    const 入段 = (段, x) => { if (x.块) 段.push(...x.块); else 段.push(x); };
    if (见Orig) { 入段(后置, r); continue; }
    if (r.temp) { 入段(快照, r); continue; }   // temp 快照（getNest/slot）——每次调用先求值
    入段(前置, r);   // orig 前的非 temp 指令（点灯 setBuffOn(on) 等）
  }
  // 模式判定（引擎语义，见解释器 InjectStart）：
  //   替换(2)=不调 orig；追加(0)=orig→后置；环绕(1)=快照→前置→orig→后置。
  //   追加模式引擎不执行快照/前置，故只要见 orig 且有快照或前置 → 必须环绕。
  if (!见Orig) 模式 = '替换';
  else 模式 = (快照.length || 前置.length) ? '环绕' : '追加';
  const inj = { inject: { 方法, 目标: 目, 模式 } };
  if (快照.length) inj.inject.快照 = 快照;
  if (前置.length) inj.inject.前置 = 前置;
  if (后置.length) inj.inject.后置 = 后置;
  return inj;
}

// =============================================
// 顶层：case → src DSL 角色表
// =============================================
function 抽取角色(id, 选项) {
  const c = 角色cases.get(id);
  if (!c) return null;
  选项 = 选项 || {};
  const 残差 = new 残差集(id);
  const env = 新环境(null);
  env.残差 = 残差;
  env.钩子 = '<case顶层>';
  env.谓词 = 收集谓词(c);
  // 谓词赋值语句消费掉（不产指令）
  const 谓词行 = new Set([...env.谓词.values()].map(v => v.节点));

  const 表 = { id, 机动性: null, 槽位初值: {}, 排除伤害: [], 旗标: [], 钩子: {} };
  const 旗标集 = new Set();
  const init列 = [];   // case 顶层即时语句（deleteBuff/注入 wrap/orig 绑定）→ init 伪钩子（装配期执行一次）

  // 批次E-4 预扫（hoisting 同 C-9 局部函数）：子程序定义常在调用点之后（10158 ultimate L10863 调 tmpfunc、定义在 L10896），
  //   JS 运行期调用发生在装配后所以源码正确，但抽取器顺序编译期必须先把全部定义登记好再翻钩子（否则调用点残差）
  env.子程序 = new Map();
  const 子程序定义行 = new Set();
  for (const s of c.consequent) {
    // case顶层子程序定义 `U.<name> = function(形参…){体}`（name ∉ 主钩子 ∪ 注入方法名 ∪ 谓词）——登记不产指令不残差。
    //   调用点 `U.<name>(实参…)` 处内联重翻：形参绑定实参后体内 `<形参>` 基座经 subTgtNode/subFalsy/角色复用重译回实参。
    //   ⚠不预翻体：形参绑定随调用点不同（10158 两处调用实参各异），预翻无法参数化；调用点展开时体不可译才残差
    if (s.type === 'ExpressionStatement' && s.expression.type === 'AssignmentExpression' && s.expression.operator === '=' &&
        s.expression.left.type === 'MemberExpression' && !s.expression.left.computed && 是U(s.expression.left.object) &&
        s.expression.left.property.type === 'Identifier' && !主钩子.has(s.expression.left.property.name) && !注入方法名.has(s.expression.left.property.name) &&
        (s.expression.right.type === 'FunctionExpression' || s.expression.right.type === 'ArrowFunctionExpression') && !谓词行.has(s)) {
      env.子程序.set(s.expression.left.property.name, { fn: s.expression.right });
      子程序定义行.add(s);
    }
  }

  for (const s of c.consequent) {
    // case 顶层语句
    if (s.type === 'ReturnStatement') continue;
    if (s.type === 'EmptyStatement') continue;
    if (谓词行.has(s)) continue;    // 谓词定义（isSANFix 等）→ 已在条件翻译中消费
    // setMnc(U, […], L) → 机动性
    if (s.type === 'ExpressionStatement' && 是调用(s.expression, 'setMnc', 3) && 是U(s.expression.arguments[0])) {
      const arr = s.expression.arguments[1];
      if (arr.type !== 'ArrayExpression' || arr.elements.length !== 10 || arr.elements.some(e => e.type !== 'Literal')) {
        残差.加(s, 'setMnc 数组异常', '<case顶层>'); continue;
      }
      表.机动性 = arr.elements.map(e => e.value);
      continue;
    }
    // buff_ex.push(S[,S…]) → 排除伤害
    if (s.type === 'ExpressionStatement' && s.expression.type === 'CallExpression' && 是标识(s.expression.callee.object, 'buff_ex') && s.expression.callee.property.name === 'push') {
      const strs = s.expression.arguments.map(a => 字面(a));
      if (strs.every(x => typeof x === 'string')) { 表.排除伤害.push(...strs); continue; }
      残差.加(s, 'buff_ex.push 参数非字面串', '<case顶层>'); continue;
    }
    // U.stack = N（case 顶层初值；批次C-8：负数 -1=Unary不Literal，用 数字() 助手；10186 stack=-1）
    if (s.type === 'ExpressionStatement' && s.expression.type === 'AssignmentExpression' && 是成员(s.expression.left, 是U, 'stack') && 数字(s.expression.right) !== undefined && !('stack' in 表.槽位初值)) {
      表.槽位初值.stack = 数字(s.expression.right); continue;
    }
    // U.<主钩子> = function(){…}
    if (s.type === 'ExpressionStatement' && s.expression.type === 'AssignmentExpression' && s.expression.operator === '=' && s.expression.left.type === 'MemberExpression' && !s.expression.left.computed && 是U(s.expression.left.object) && 主钩子.has(s.expression.left.property.name)) {
      const 钩名 = s.expression.left.property.name;
      const fn = s.expression.right;
      if (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression') { 残差.加(s, '钩子值非函数', 钩名); continue; }
      const 环境H = 新环境(env); 环境H.钩子 = 钩名;
      const body = fn.body.type === 'BlockStatement' ? fn.body.body : [{ type: 'ReturnStatement', argument: fn.body }];
      const 指令列 = 翻钩子体(body, 环境H, 钩名);
      if (指令列 === null) { 残差.加(s, '钩子体不可翻译', 钩名); continue; }
      // 默认骨架识别：与解释器缺省语义同形 → 省略字段
      if (是默认骨架(钩名, 指令列)) continue;
      if (指令列.length || !(钩名 in 默认骨架)) 表.钩子[钩名] = 指令列;
      continue;
    }
    // 批次E-4：子程序定义行（预扫已登记 env.子程序）→ 不产指令跳过；u.<name> 函数字段留存于原 setDefault 回落路径/新路径都不调用（调用已全部内联），不进差分对比
    if (子程序定义行.has(s)) continue;
    // U.<标量> = 字面（自身旗标：isSealed/stopCd/turnHeal/canCDChange）
    if (s.type === 'ExpressionStatement' && s.expression.type === 'AssignmentExpression' && s.expression.operator === '=' && s.expression.left.type === 'MemberExpression' && 是U(s.expression.left.object) && s.expression.right.type === 'Literal') {
      const r = 翻属性赋值(s.expression.left, s.expression.right, env, s);
      if (r && r.flag) { 旗标集.add(r.flag); continue; }
      continue;   // 残差已记
    }
    // —— 其它顶层语句（deleteBuff 清静态 buff / U.hit 注入 wrap / const orig 绑定）→ 尝试翻译入 init 伪钩子 ——
    //   与源码同机：setDefault 顶层执行一次（10209 删 5 个静态 buff；10023 顶层 U.hit 注入）
    const r0 = 翻语句(s, env);
    if (r0 === null) { /* 残差已记 */ continue; }
    if (r0.__空) continue;   // orig 保存/内联常量绑定：只登记 env，不产指令
    if (r0.块) init列.push(...r0.块); else init列.push(r0);
  }
  if (init列.length) 表.钩子.init = init列;
  表.旗标 = [...旗标集];
  if (!表.机动性) 残差.加(c, '无 setMnc', '<case顶层>');
  return { 表, 残差 };
}

// 钩子体翻译：处理 switch(L) 展开为 lib 序列（体级）与常规语句列
function 翻钩子体(列, env, 钩名) {
  // 批次C-9：钩子体内局部无参函数（10154 turnstart：`function V(){tbf×5}` 声明在尾、调用在前——JS hoisting）。
  //   ⚠声明可嵌在 if/for 块深处（10154 在 if 块内），预扫必须递归全树；hoisting 语义=整个钩子作用域可见。
  //   调用点 V() 内联为 {块:列}（翻语句列/翻钩子体已有块展平）。带参/翻译失败→残差（不静默吞）；
  //   函数体只能引用外层变量（U/comp/boss/GLOBAL_TURN），不支持递归/互调。
  env.局所函数 = new Map();
  {
    const 声明ノード = new Map();   // name → body列（后声明覆盖先声明，与 hoisting 最后生效一致——源码无重名）
    const 走査 = 列s => {
      for (const s of 列s) {
        if (s.type === 'FunctionDeclaration') { if (s.id) 声明ノード.set(s.id.name, s); continue; }
        if (s.type === 'BlockStatement') { 走査(s.body); continue; }
        if (s.type === 'IfStatement') { 走査(块语句列(s.consequent)); if (s.alternate) 走査(块语句列(s.alternate)); continue; }
        if (s.type === 'ForOfStatement' || s.type === 'ForStatement' || s.type === 'WhileStatement') { 走査(块语句列(s.body)); continue; }
        if (s.type === 'SwitchStatement' && 是L(s.discriminant)) { for (const sc of s.cases) 走査(sc.consequent); continue; }
      }
    };
    走査(列);
    env.局所失败 = new Set();   // 失败声明节点集（跨递归共享，供 翻语句 记残差；成功的不入）
    for (const [名, fd] of 声明ノード) {
      if (fd.params.length !== 0) { env.局所失败.add(fd); continue; }
      const r = 翻语句列(fd.body.body, env);
      if (r === null) env.局所失败.add(fd); else env.局所函数.set(名, r);
    }
  }
  // 批次E-5b 预扫：手卷 argmax 的死累加器声明（for 模式前的 `let I=0; let B=0/999999999`）——I/B 被 for 模式
  //   整体消费（翻手卷argmax 重绑 I=find 槽），事后无人作数值 temp 读；若不跳过，999999999×10⁴ i32 定点溢出。
  //   标记供 翻绑定 跳过 Snapshot 发射（模式外引用死变量会落 未知标识符残差——失败安全，不静默）
  env.argmax死 = new Set();
  for (const s of 列) {
    if (s.type !== 'ForStatement') continue;
    const ska = 骨架手卷argmax(s);
    if (ska) { env.argmax死.add(ska.I名); env.argmax死.add(ska.B名); }
  }
  const out = [];
  for (const s of 列) {
    if (s.type === 'ReturnStatement' && (是U(s.argument) || !s.argument)) continue;
    // FunctionDeclaration：预扫已处理（成功→env.局所函数，失败→env.局所失败）；顶层声明在此跳过，嵌套内的由 翻语句 记残差
    if (s.type === 'FunctionDeclaration') continue;
    if (s.type === 'SwitchStatement' && 是L(s.discriminant)) {
      // switch(L) 在钩子体级 → 展开为逐档 if(lib) 块（等价 perLib 语义）
      const r = 翻switchLib(s, env);
      if (!r) return null;
      for (const blk of r.__lib序列) out.push({ lib: blk.lib, then: blk.then });
      continue;
    }
    const r = 翻语句(s, env);
    if (r === null) { if (s.type === 'EmptyStatement') continue; return null; }
    if (r.__空) continue;   // 故意不产指令的绑定
    if (r.__lib序列) out.push(...r.__lib序列.map(blk => ({ lib: blk.lib, then: blk.then })));
    else if (r.块) out.push(...r.块);
    else if (r.__原调用) { env.残差.加(s, '裸 orig.apply 在钩子体（非注入内）', 钩名); return null; }
    else out.push(r);
  }
  return out;
}

// 默认骨架判定：指令列与解释器缺省语义同形 → true（抽取表省略该钩子）
function 是默认骨架(钩名, 指令列) {
  const d = 默认骨架[钩名];
  if (!d) return 指令列.length === 0;
  if (指令列.length === 0) return d === '空';   // 空列=空钩子；仅"空"类骨架匹配
  if (d === '空') return false;
  if (d === 'ultLogic' && 指令列.length === 1) return JSON.stringify(指令列[0]) === '{"ultLogic":null}';
  if (d === 'atkLogic' && 指令列.length === 1) return JSON.stringify(指令列[0]) === '{"atkLogic":null}';
  if (d === 'act_defense' && 指令列.length === 1) return JSON.stringify(指令列[0]) === '{"actDefense":true}';
  if (d === '队长空' && 指令列.length === 1) {
    return JSON.stringify(指令列[0]) === JSON.stringify({ if: { kind: '队长', cmp: '==', val: true }, then: [] });
  }
  return false;
}

// =============================================
// CLI
// =============================================
if (require.main === module) {
  const argv = process.argv.slice(2);
  const 取 = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
  const 有旗 = k => argv.includes('--' + k);

  if (有旗('扫描')) {
    // 全量 191 case 可翻译性扫描 + 残差聚类
    let 全绿 = 0, 有残 = 0, 崩溃 = 0;
    const 残差总 = [];
    const 每角色 = {};
    for (const id of [...角色cases.keys()].sort((a, b) => a - b)) {
      let r;
      try { r = 抽取角色(id, {}); }
      catch (e) { 崩溃++; 每角色[id] = -1; 残差总.push({ id, 钩子: '<崩溃>', 行: 0, 原因: '抽取器异常: ' + (e && e.message ? e.message.slice(0, 80) : String(e)), 源码: '' }); continue; }
      if (!r) continue;
      每角色[id] = r.残差.项.length;
      if (r.残差.项.length === 0) 全绿++; else { 有残++; 残差总.push(...r.残差.项); }
    }
    console.log(`===== 扫描结果 =====`);
    console.log(`可全自动转写（0 残差）: ${全绿}/${全绿 + 有残} = ${(100 * 全绿 / (全绿 + 有残)).toFixed(1)}%（目标 ≥85%）`);
    console.log(`残差总条数: ${残差总.length}（含崩溃 ${崩溃} 角色）`);
    // 聚类：先归一变体名（_0xNNNN→V）再归一数字，避免混淆名把同类形态打碎
    const 聚类 = new Map();
    for (const r of 残差总) {
      const 键 = r.原因.replace(/_?0x[0-9a-f]+/g, 'V').replace(/\d+/g, 'N').slice(0, 60);
      if (!聚类.has(键)) 聚类.set(键, { n: 0, 例: r });
      聚类.get(键).n++;
    }
    console.log(`\n===== 残差聚类 Top30（键 | 条数 | 首例 行:源码）=====`);
    [...聚类.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 30).forEach(([k, v]) => {
      console.log(`${String(v.n).padStart(5)}  ${k}`);
      console.log(`        例 [id=${v.例.id} ${v.例.钩子} L${v.例.行}] ${v.例.源码}`);
    });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, '_残差报告.json'), JSON.stringify({ 汇总: { 全绿, 有残, 崩溃, 残差总条数: 残差总.length }, 每角色残差数: 每角色, 残差明细: 残差总 }, null, 1), 'utf8');
    console.log(`\n残差明细 → ${path.join(OUT_DIR, '_残差报告.json')}`);
    return;
  }

  const ids = (取('id') || [...角色cases.keys()].join(',')).split(',').map(Number);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // 输出分流（关键）：只有 **0 残差**的完整表进 生成/ 根（供 flatten --srcDir 生成 → bin → 引擎装配）；
  //   有残差的不完整表（钩子部分被跳过）进 生成/_不完整/，绝不压平——否则引擎装配到半截表得到错误伤害。
  //   引擎侧对无表角色回落原 setDefault（多例引擎 __mech wrapper 的 WeakSet 缺失分支），故残差角色天然正确。
  const 不完整目录 = path.join(OUT_DIR, '_不完整');
  fs.mkdirSync(不完整目录, { recursive: true });
  let 全绿 = 0, 有残 = 0;
  for (const id of ids) {
    const r = 抽取角色(id);
    if (!r) { console.log(`${id}: 无 case`); continue; }
    const 是完整 = r.残差.项.length === 0;
    if (是完整) 全绿++; else 有残++;
    const 出 = path.join(是完整 ? OUT_DIR : 不完整目录, id + '.json');
    fs.writeFileSync(出, JSON.stringify(r.表, null, 1), 'utf8');
    console.log(`${id}: → ${path.basename(出)}${是完整 ? '' : ' [不完整]'}  钩子数=${Object.keys(r.表.钩子).length} 残差=${r.残差.项.length}`);
    for (const x of r.残差.项.slice(0, 8)) console.log(`   [${x.钩子} L${x.行}] ${x.原因} | ${x.源码}`);
    if (r.残差.项.length > 8) console.log(`   …另 ${r.残差.项.length - 8} 条`);
  }
  console.log(`\n===== 完整(0残差) ${全绿} | 不完整 ${有残} =====`);
  console.log(`完整表 → ${OUT_DIR}/（可压平进 bin）；不完整表 → ${不完整目录}/（引擎回落原 setDefault）`);
}
