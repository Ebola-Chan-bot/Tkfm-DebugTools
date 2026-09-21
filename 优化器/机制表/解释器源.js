/*
 * 机制解释器源码（阶段 1c）——纯文本注入引擎闭包，不自带 module.exports。
 *
 * 注入方式：多例引擎.js 的工厂体把本文件全文串接在 deobfuscated.js（calcSrc）之后、autocalc.v3.js 之前，
 *   因此本文件里的标识符与引擎同作用域：可直接引用 comp/boss/all/always/myCurAtk/tbf/nbf/anbf/atbf/
 *   ptbf/pnbf/buff/setBuffOn/setBuffOnAll/deleteBuff/hpUpAll/cdChange/getRoleIdx/getElementIdx/
 *   getElementCnt/getRoleCnt/getElKind/setMnc/ultLogic/atkLogic/isTurn/buff_ex/GLOBAL_TURN 等引擎顶层符号。
 *   这就是 bit-exact 的根基：**解释器不重新实现任何数值逻辑，只按数据顺序调用引擎原语**（施工计划 3.1）。
 *
 * 入口：__mech_安装(数据) → { [id]: 装配函数(u, lib) }；多例引擎的 wrapper 把 setDefault 重绑为
 *   "有表走装配、无表回落原 setDefault"（分阶段迁移，不破坏线上路径）。
 *
 * 数据来源：bin读取器.js 的输出 { version, records, names }——records 与 flat.json 同构
 *   （op/tgt/tag/kind/cmp 都是字符串枚举名、数值是定点 i32、字符串已换成字典索引）。
 *
 * 执行模型（性能设计，红线见施工计划约束 3）：
 *   - **装配期一次性编译**：把线性指令序列编译成 JS 闭包树（If/For/LibIf/Inject 在编译期嵌套展开），
 *     字典串解引用、定点还原、选择器位集→数组都在编译期完成；
 *   - **运行期纯闭包调用**：钩子被调时只是顺序执行闭包数组，无 switch 分发、无字符串比较；
 *   - 闭包树跨战斗共享（无单位状态）；每场战斗装配只是把钩子引用挂到 unit 上。
 *
 * 关键语义（与源码逐位对齐的要点）：
 *   1. 引擎的 every-case 都定义全部 11 钩子（空的也显式定义）→ 装配时对机制表缺省的钩子安装
 *      默认骨架（ultimate→ultLogic(u)、attack→atkLogic(u)、defense→u.act_defense()、
 *      turnstart/turnover→if(isLeader){}、其余空函数），与源码逐一同形。
 *   2. lib 规范化同 setMnc：undefined/null/<1/>5 → 5（源码 switch 的 default 段与 case5 同内容，
 *      LibIf(5) 段承接）。
 *   3. ExprAtkRef 还原为字符串拼接 myCurAtk+String(id)+String(常数)，与源码 `"a"+u.id+30` 逐字符一致；
 *      getSize() 再解析。常数定点 0 被压平器拒收（源码无 +0 形态，出现即报）。
 *   4. slot0 = u.stack（引擎快照 characterToJson/jsonToCharacter 已含 stack 字段 → 计数器随
 *      saveCur/loadBefore 自动回滚，解释器无需自己做栈）。
 *   5. Snapshot(temp)：值存"本次钩子调用/本次注入调用"的作用域对象 tempVars，调用结束即弃——
 *      源码 `const s = u.stack` 是函数局部量，语义相同。
 *   6. 注入（InjectStart）：leader/passive 钩子**运行时**执行 wrap（与源码注入发生时机一致：
 *      leader 在 start() 时跑）。追加=orig 后跑后置；环绕=快照→前置→orig→后置；替换=不调 orig。
 *      wrapper 每次被调用都新建 tempVars（승나미 每次 궁 都重新快照 getNest）。
 *   7. buff 族的**参数个数必须精确**（引擎 buff() 按 arguments.length==6/8/9/10/11 分支）→
 *      编译期截掉尾部 None 填充、按定长数组 apply。
 */

// ---- 枚举数值（与 schema.fbs / flatten_core.js 同步；reader 输出字符串名，这里主要用字符串比较，数值仅注入模式等少数场合）----
var __MECH_CMP名 = ['Eq', 'Ne', 'Gt', 'Ge', 'Lt', 'Le'];
var __MECH_METHOD = ['ultimate', 'attack', 'defense', 'ultbefore', 'ultafter', 'atkbefore', 'atkafter', 'hit', 'leader', 'passive', 'act_attack', 'act_ultimate'];   // 批次E-5a：act_* 注入（10190）——与 flatten METHOD_ID 严格同序
var __MECH_HOOK = ['ultbefore', 'ultafter', 'ultimate', 'atkbefore', 'atkafter', 'attack', 'leader', 'passive', 'defense', 'turnstart', 'turnover', 'init'];
var __MECH_HOOK_INIT = 11;   // 'init' 伪钩子：case 顶层即时段，装配期执行一次（非 u 上的钩子）
var __MECH_SENTINEL_LO = -2147483648;   // clampSlot 下界不夹哨兵
var __MECH_SENTINEL_HI = 2147483647;    // clampSlot 上界不夹哨兵
var __MECH_SLOT_UNSET = -2147483648;    // slotInit 未声明哨兵
var __MECH_ARMOR_ACT = ['궁', '평', '방'];       // ExprHp armorUp act 枚举（与压平器/源码 armorUp 四分支对齐）
var __MECH_ARMOR_MODE = ['추가', '발동'];          // ExprHp armorUp mode 枚举（实测 44 处仅此两值）

// 通用比较（数值：整数或 /1e4 还原的定点；还原值与源码字面量 bit 相同）
function __mech_cmp(x, code, y) {
  switch (code) {
    case 0: return x === y;
    case 1: return x !== y;
    case 2: return x > y;
    case 3: return x >= y;
    case 4: return x < y;
    case 5: return x <= y;
    default: throw new Error('机制解释器: 未知 cmp ' + code);
  }
}

// ---- 条件编译：Cond → fn(ctx)→bool ----
function __mech_编译条件(cond, names) {
  var kind = cond.kind;
  if (kind === 'None') return function () { return true; };
  var code = __MECH_CMP名.indexOf(cond.cmp);
  if (code < 0) throw new Error('机制解释器: 未知 cmp 名 ' + cond.cmp);
  switch (kind) {
    case 'CmpLeader': {
      var want = cond.a === 1;
      return function (ctx) { return !!ctx.u.isLeader === want; };
    }
    case 'CmpGT': {
      var v = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(GLOBAL_TURN, code, v); };
    }
    case 'CmpGTIn': {
      var mask = cond.a;
      return function (ctx) { return ((mask >> GLOBAL_TURN) & 1) === 1; };
    }
    case 'CmpGTMod': {
      var off = cond.a / 1e4, mod = cond.b / 1e4, rem = cond.nameIdx / 1e4;
      return function (ctx) { return __mech_cmp((GLOBAL_TURN + off) % mod, code, rem); };
    }
    case 'CmpGTModGated': {
      // 带 GT>1 前置守卫（源码 GLOBAL_TURN>1 && (GLOBAL_TURN-1)%3==0）：GT==1 时直接假，不取模
      var goff = cond.a / 1e4, gmod = cond.b / 1e4, grem = cond.nameIdx / 1e4;
      return function (ctx) { return GLOBAL_TURN > 1 && __mech_cmp((GLOBAL_TURN + goff) % gmod, code, grem); };
    }
    case 'CmpSlot': {
      var slot = cond.a, sv = cond.b / 1e4;
      if (slot !== 0) throw new Error('机制解释器: CmpSlot 仅支持 slot0(stack)，出现 ' + slot);
      return function (ctx) { return __mech_cmp(ctx.u.stack, code, sv); };
    }
    case 'CmpNest': {
      var tn = names[cond.nameIdx], nv = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(ctx.u.getNest(tn), code, nv); };
    }
    case 'CmpTemp': {
      var vn = names[cond.nameIdx], tv = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(ctx.tempVars[vn], code, tv); };
    }
    case 'CmpElKind': {
      if (cond.a === -1) {
        var bits = cond.b;
        return function (ctx) { return ((bits >> getElKind()) & 1) === 1; };
      }
      var ev = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(getElKind(), code, ev); };
    }
    case 'CmpRoleCnt': {
      var roles = __mech_mask转数组(cond.a, role), cn = cond.b / 1e4;
      return function (ctx) { return __mech_cmp(getRoleCnt.apply(null, roles), code, cn); };
    }
    case 'CmpElCnt': {
      var els = __mech_mask转数组(cond.a, element), en = cond.b / 1e4;
      return function (ctx) { return __mech_cmp(getElementCnt.apply(null, els), code, en); };
    }
    case 'HasTurnBuffType': {
      var htn = names[cond.nameIdx], hv = cond.a / 1e4;
      return function (ctx) {
        var cnt = 0, bl = ctx.u.buff;
        for (var i = 0; i < bl.length; i++) if (isTurn(bl[i]) && bl[i].type === htn) cnt++;
        return __mech_cmp(cnt, code, hv);
      };
    }
    case 'CmpRoKind': {
      var rk = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(getRoKind(), code, rk); };
    }
    case 'CmpLoopEl': {
      var elv = cond.a;   // element 枚举小整数（非定点）
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        return unit != null && __mech_cmp(unit.element, code, elv);
      };
    }
    case 'CmpLoopRole': {
      // 批次C-2：循环目标职务比较（iStack 顶 .role；10167 leader V.role==0 形态），与 CmpLoopEl 同构
      var rlv = cond.a;
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        return unit != null && __mech_cmp(unit.role, code, rlv);
      };
    }
    case 'CmpLoopId': {
      // 批次C-4：循环目标 id 比较（iStack 顶 .id cmp 角色id定点；10211 leader for(comp){if(V.id==10160)}）
      var lidv = cond.a / 1e4;
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        return unit != null && __mech_cmp(unit.id, code, lidv);
      };
    }
    case 'CmpNeqPrevId': {
      // 批次C-5：两个循环变量（或循环变量 vs self）的 id 比较（10062/10147 嵌套排除 `if($内.id!=$外.id)`）：
      //   a=1 → 栈顶 vs 上一层（iStack[len-2]）；a=0 → 栈顶 vs ctx.u（self）。cmp 常规（源码仅 !=，== 预留）
      var npPrev = cond.a === 1;
      return function (ctx) {
        var top = ctx.iStack[ctx.iStack.length - 1];
        var other = npPrev ? ctx.iStack[ctx.iStack.length - 2] : ctx.u;
        return top != null && other != null && __mech_cmp(top.id, code, other.id);
      };
    }
    case 'CmpSlotIn': {
      // 批次C-7：slot 值∈集合（`U.stack==2||U.stack==3`，10181）；a=slot(0=stack) b=值位集（0..30）
      var siSlot = cond.a, siMask = cond.b;
      if (siSlot !== 0) throw new Error('机制解释器: CmpSlotIn 仅支持 slot0(stack)，出现 ' + siSlot);
      return function (ctx) {
        var v = ctx.u.stack;
        return Number.isInteger(v) && v >= 0 && v <= 30 && ((siMask >> v) & 1) === 1;
      };
    }
    case 'CmpLoopRoleIn': {
      // 批次C-7：循环目标 role∈集合（10159/10182）；a=role位集（0..4）；iStack 顶
      //   批次C-10a 起尊重 cmp（Eq/Ne）：`!getRoleIdx(mask).includes(V)` 等价重写后翻转成 Ne（旧编码恒 Eq，行为不变）
      var rmiMask = cond.a;
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        var 在集 = unit != null && Number.isInteger(unit.role) && unit.role >= 0 && unit.role <= 4 && ((rmiMask >> unit.role) & 1) === 1;
        return code === 0 ? 在集 : code === 1 ? !在集 : __mech_cmp(在集, code, true);
      };
    }
    case 'CmpLoopElIn': {
      // 批次C-10a：循环目标 element∈集合（10137 getElementIdx绑定.includes(V) 等价重写）；a=element位集（0..4）；与 CmpLoopRoleIn 同构（尊重 cmp Eq/Ne）
      var eliMask = cond.a;
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        var 在集 = unit != null && Number.isInteger(unit.element) && unit.element >= 0 && unit.element <= 4 && ((eliMask >> unit.element) & 1) === 1;
        return code === 0 ? 在集 : code === 1 ? !在集 : __mech_cmp(在集, code, true);
      };
    }
    case 'CmpLoopName': {
      // 批次C-10a：循环目标名比较（10088 `if(V.name=="신파랑")`）；iStack顶.name，严格 cmp（引擎 buff/unit name 均字符串）
      var lnStr = names[cond.nameIdx];
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        return unit != null && __mech_cmp(unit.name, code, lnStr);
      };
    }
    case 'CmpLoopIdx': {
      // 批次C-10a：循环下标比较（10022 `for(V of getRoleIdx(…)){if(V!=0)}`）；取 kStack 顶=原始 comp 下标
      //   （iStack 在排除self 时过滤过单位、位置≠下标，故 For 执行期平行维护 kStack）
      var liv = cond.a;
      return function (ctx) {
        if (!ctx.kStack || !ctx.kStack.length) throw new Error('机制解释器: CmpLoopIdx 无循环上下文（kStack 空）');
        return __mech_cmp(ctx.kStack[ctx.kStack.length - 1], code, liv);
      };
    }
    case 'CmpHasUnitId': {
      // 批次C-10a：队伍中存在指定 id（10089 `if(comp.find(x=>x.id==10088))` 内联）；a=角色id定点
      //   find 返回 undefined（非 null）→ 真值判定与 some 等价（无副作用，find 谓词纯 id 比较）
      var huiId = cond.a / 1e4;
      return function (ctx) {
        for (var i = 0; i < comp.length; i++) if (comp[i] != null && comp[i].id === huiId) return true;
        return false;
      };
    }
    case 'CmpUnitField': {
      // 批次C-10b：单位布尔字段真值（10190 isHealed族 / 10134 turnHeal / 10140 check）；nameIdx=字段名字典，!!u[fname]。
      //   引擎不建字段名单——直接下标访问（通用机制）；not 包裹时 code=Ne → 取反
      //   批次E-3b 泛化：cond.b=Target 打包（枚举+tgtN*256）；b=0 或 1→self（向后兼容旧 bin b=0 恒 self）
      var ufName = names[cond.nameIdx];
      var ufTgt = cond.b & 0xFF, ufTgtN = (cond.b >> 8) & 0xFF;
      var ufF;
      if (ufTgt === 0 || ufTgt === 1) ufF = function (ctx) { return ctx.u; };
      else if (ufTgt === 5) ufF = function (ctx) { return ctx.iStack[ctx.iStack.length - 1]; };   // LoopI（10140 注入体 comp[V].isFirstTurnActed）
      else if (ufTgt === 6) ufF = function (ctx) { return ctx.iStack[ctx.iStack.length - 1 - ufTgtN]; };   // LoopUp
      else throw new Error('机制解释器: CmpUnitField 目标枚举 ' + ufTgt + ' 未支持（仅 self/LoopI/LoopUp）');
      return function (ctx) {
        var unit = ufF(ctx);
        if (unit == null) return false;
        var v = !!unit[ufName];
        return code === 0 ? v : code === 1 ? !v : __mech_cmp(v, code, true);
      };
    }
    case 'CmpRandom': {
      // 批次C-10b：Math.random() 比较（10038 `if(Math.random()<0.5)`）；执行期现调 Math.random()。
      //   双跑差分有确定性种子桩（定随机/种子 20260919）：同钩子同执行路径下两引擎抽取同一序列 → bit-exact 公平
      var rndTh = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(Math.random(), code, rndTh); };
    }
    case 'CmpTempFlag': {
      // 批次C-10b：temp 槽布尔真值（`const V=boss.def; ultLogic…; if(V)`；10197/10173）；执行期 !!ctx.tempVars[槽名]
      var tfName = names[cond.nameIdx];
      return function (ctx) {
        var v = !!ctx.tempVars[tfName];
        return code === 0 ? v : code === 1 ? !v : __mech_cmp(v, code, true);
      };
    }
    case 'CmpBossField': {
      // 批次C-10b：boss 字段比较（10150 `boss.element!=undefined && boss.element==4`）；b=1 undefined 存在性 / b=0 常规
      var bfName = names[cond.nameIdx];
      if (cond.b === 1) {
        // undefined 判定直译：Eq → "boss[f] === undefined"真；Ne → "!== undefined"真（10150 用 Ne）；执行期当前值
        return function (ctx) {
          var v = boss[bfName];
          return code === 0 ? (v === undefined) : code === 1 ? (v !== undefined) : __mech_cmp(v === undefined, code, true);
        };
      }
      var bfTh = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(boss[bfName], code, bfTh); };
    }
    case 'CmpNestByType': {
      // 批次C-10b：buffNestByType(self,type) 比较（10124 `if(buffNestByType(u,"<애교 시간>")<2)` / 10140 `>=10 && check`）；
      //   执行期直调引擎纯函数（filter isNest&&type→[0].nest clamp，无副作用——条件重复求值安全）
      var nbtType = names[cond.nameIdx];
      var nbtTh = cond.a / 1e4;
      return function (ctx) { return __mech_cmp(buffNestByType(ctx.u, nbtType), code, nbtTh); };
    }
    case 'CmpBuffSize': {
      // 批次C-10b：getBuffSize(self,div,name) 比较（10153 `!=0` / 10171 `==undefined`）；执行期直调引擎（可返 undefined）
      //   b=INT_MIN 哨兵 → undefined 存在性判定（Eq→"是 undefined"真 / Ne→"不是 undefined"真）；否则 b=阈值定点
      var bsDiv = names[cond.a], bsName = names[cond.nameIdx];
      if (cond.b === -2147483648) {
        return function (ctx) {
          var v = getBuffSize(ctx.u, bsDiv, bsName);
          return code === 0 ? (v === undefined) : code === 1 ? (v !== undefined) : __mech_cmp(v === undefined, code, true);
        };
      }
      var bsTh = cond.b / 1e4;
      return function (ctx) { return __mech_cmp(getBuffSize(ctx.u, bsDiv, bsName), code, bsTh); };
    }
    case 'CmpHpRatio': {
      // 批次C-10b：循环目标 hp 比例（10181 `if(V.curHp/V.hp>0.5)`）：iStack顶.curHp/.hp cmp a/1e4（hp=0→Infinity 与源码除零同语义）
      var hrTh = cond.a / 1e4;
      return function (ctx) {
        var unit = ctx.iStack[ctx.iStack.length - 1];
        if (unit == null) return false;
        return __mech_cmp(unit.curHp / unit.hp, code, hrTh);
      };
    }
    case 'CmpSelfIdx': {
      // 批次C-10b：循环下标 vs self 在 comp 中的下标（10136 `let V=comp.findIndex(x=>x.id==U.id); if(k==V)continue`）；
      //   findIndex ≡ indexOf(ctx.u)（同 id 同单位；引擎 comp 无重复 id），kStack 顶比较
      return function (ctx) {
        if (!ctx.kStack || !ctx.kStack.length) throw new Error('机制解释器: CmpSelfIdx 无循环上下文（kStack 空）');
        return __mech_cmp(ctx.kStack[ctx.kStack.length - 1], code, comp.indexOf(ctx.u));
      };
    }
    case 'CmpFindUnit': {
      // 批次B2：裸真值 if(V)，V=FindUnit 槽绑定变量（comp.find(x=>x.id==N) 结果；可能 null）
      var fs2 = cond.a, fWant = cond.b === 1;
      return function (ctx) { return (ctx.unitVars[fs2] != null) === fWant; };
    }
    case 'CmpFindBuff': {
      // 批次B2：裸真值 if(V)，V=FindBuff 槽（unitVars[槽]={__b:bool}）
      var bf槽 = cond.a;
      return function (ctx) { var v = ctx.unitVars[bf槽]; return !!(v && v.__b); };
    }
    case 'CmpLib': {
      // 批次C-1：星级比较 if(L<op>N)；ctx.lib 装配期已规范化 1..5（与 setMnc/LibIf 同规则），a=小整数非定点
      var libv = cond.a;
      return function (ctx) { return __mech_cmp(ctx.lib, code, libv); };
    }
    default: throw new Error('机制解释器: 未知条件 kind ' + kind);
  }
}

// 位集 mask → 名称数组（bit i = 数组第 i 项；role=[딜,힐,탱,섶,디] element=[화,수,풍,광,암]）
function __mech_mask转数组(mask, 名表) {
  var out = [];
  for (var i = 0; i < 名表.length; i++) if ((mask >> i) & 1) out.push(名表[i]);
  return out;
}

// ExprHp 位域 → fn(ctx)→值（共用解码：参数位 Tag.ExprHp 与批次C-4 op SetHpUltDmg/SetHpAtkDmg 的 ps[0] 复用）
//   低24位=N定点×10⁴；bit24-26=base(1self/5LoopI/7LowestHp/6异源哨兵/4compN)；bit27=armorUp；bit28-29=act；bit30=mode；bit31=field(0hp/1atk族)
//   pad2（_pad2 u16）：bits0-3=fieldExt(2=getCurAtk()方法，10133)；bits4-15=compN(base=4 时，10140 comp[0].hp*100)
function __mech_编译hpExpr(bits, 上下文, pad2) {
  bits = bits >>> 0;   // unsigned（高位 flag 不参与符号）
  pad2 = pad2 | 0;
  var hN = (bits & 0xFFFFFF) / 1e4;
  var hbase = (bits >>> 24) & 7;
  var hArmor = (bits >>> 27) & 1;
  var hact = __MECH_ARMOR_ACT[(bits >>> 28) & 3];
  var hmode = __MECH_ARMOR_MODE[(bits >>> 30) & 1];
  if (hbase !== 1 && hbase !== 5 && hbase !== 7 && hbase !== 6 && hbase !== 4) throw new Error('机制解释器: hpExpr base 仅支持 self(1)/LoopI(5)/LowestHp(7)/$i异源self(6)/compN(4)，出现 ' + hbase + ' @ ' + 上下文);
  // base=6（批次B2 哨兵）：hp 读循环变量而 armorUp 读 self（10034/10035：V.hp*15*armorUp(U,…)）
  var baseF, armorBaseSelf = false;
  if (hbase === 1) baseF = function (ctx) { return ctx.u; };
  else if (hbase === 5) baseF = function (ctx) { return ctx.iStack[ctx.iStack.length - 1]; };
  else if (hbase === 7) baseF = function (ctx) { return __mech_最低hp(); };
  else if (hbase === 4) { var hcN = (pad2 >>> 4) & 0xFFF; baseF = function (ctx) { return comp[hcN]; }; }   // 批次E-2b：comp[N] 固定位
  else { baseF = function (ctx) { return ctx.iStack[ctx.iStack.length - 1]; }; armorBaseSelf = true; }
  var hExt = pad2 & 15;   // 0=字段直读(hp/atk) 2=getCurAtk()方法(10133)
  if (hExt !== 0 && hExt !== 2) throw new Error('机制解释器: hpExpr fieldExt ' + hExt + ' 未知（仅 0/2） @ ' + 上下文);
  var hfield = (bits >>> 31) & 1 ? 'atk' : 'hp';   // bit31=字段（批次B2：atk*N 22处；fieldExt=2 时恒 1）
  return function (ctx) {
    var base = baseF(ctx);
    var v = (hExt === 2 ? base.getCurAtk() : base[hfield]) * hN;   // 批次E-2b：getCurAtk() 方法调用（非 atk 字段！含 buff 乘区，引擎运行时值）
    if (hArmor) v = v * armorUp(armorBaseSelf ? ctx.u : base, hact, hmode);   // armorUp 引擎函数（逻辑写死，约束1）；异源哨兵 base=6 时 armorUp 读 self
    return v;
  };
}

// 全队最低 curHp（批次B；源码 comp.reduce((a,b)=>b.curHp<a.curHp?b:a, comp[0]) 的引擎化：
//   reduce 语义 = 从 comp[0] 起逐个严格 < 则替换，平局取先；含 self，运行期现算）
function __mech_最低hp() {
  var best = comp[0];
  for (var i = 1; i < comp.length; i++) if (comp[i].curHp < best.curHp) best = comp[i];
  return best;
}

// ---- 目标编译：cmd.tgt/tgtN 或 Tag.Target 参数 → fn(ctx)→引擎值 ----
// 注意语义差异：cmd.tgt 的 All 用于 tbf(all,…) 场景 → 引擎常量 all(=0，buff() 自行展开循环)；
//   Tag.Target 参数位的 All 同样给 0；Self 一律 = 机制拥有者 ctx.u；LoopI = 循环栈顶 unit。
function __mech_编译主目标(tgt, tgtN) {
  switch (tgt) {
    case 'Self': return function (ctx) { return ctx.u; };
    case 'All': return function (ctx) { return all; };
    case 'Boss': return function (ctx) { return boss; };
    case 'CompN': return function (ctx) { return comp[tgtN]; };
    case 'LoopI': return function (ctx) { return ctx.iStack[ctx.iStack.length - 1]; };
    case 'LoopUp': return function (ctx) { return ctx.iStack[ctx.iStack.length - 1 - tgtN]; };   // 嵌套 for 向上第 tgtN 层（10081 回归修复）
    case 'LowestHp': return function (ctx) { return __mech_最低hp(); };   // 批次B：reduce 最低 curHp 队友（含 self，严格<平局取先）
    case 'TempUnit': return function (ctx) { return ctx.unitVars[tgtN]; };   // 批次B2：FindUnit 槽（调用点受 CmpFindUnit 守卫，非 null）
    case 'BossHitTarget': return function (ctx) { return bossHitTarget; };   // 批次C-10b：引擎常量对象 {id:0,name:"타깃"}（10196 atbf 目标参）
    default: throw new Error('机制解释器: 未知主目标 ' + tgt);
  }
}

// ---- 参数编译：Param → fn(ctx)→引擎实参 ----
function __mech_编译参数(p, names, 上下文) {
  switch (p.tag) {
    case 'NameIdx': case 'TypeIdx': { var s = names[p.i]; return function () { return s; }; }
    case 'NaNVal': return function () { return NaN; };   // 批次E-5b：执行期恒 NaN（10138 comp[idx]*30 对象乘法忠实复刻）
    case 'Fix': { var v = p.i / 1e4; return function () { return v; }; }
    case 'Always': return function () { return always; };
    case 'Bool': { var b = p.i === 1; return function () { return b; }; }
    case 'Target': {
      var t = p.i & 0xFF, n = (p.i >> 8) & 0xFF;
      switch (t) {
        case 1: return function (ctx) { return ctx.u; };
        case 2: return function () { return all; };
        case 3: return function () { return boss; };
        case 4: return function (ctx) { return comp[n]; };
        case 5: return function (ctx) { return ctx.iStack[ctx.iStack.length - 1]; };
        case 6: return function (ctx) { return ctx.iStack[ctx.iStack.length - 1 - n]; };   // LoopUp 参数位
        case 7: return function (ctx) { return __mech_最低hp(); };   // LowestHp 参数位
        case 8: return function (ctx) { return ctx.unitVars[n]; };   // TempUnit 参数位（批次B2）
        case 9: return function (ctx) { return bossHitTarget; };   // BossHitTarget 参数位（批次C-10b：10196 atbf 目标参）
        default: throw new Error('机制解释器: Target 参数未知枚举 ' + t + ' @ ' + 上下文);
      }
    }
    case 'ExprAtkRef': {
      var bits = p.i;
      var hasSelf = (bits & (1 << 30)) !== 0, hasTrig = (bits & (1 << 29)) !== 0, hasSrc = (bits & (1 << 28)) !== 0;
      var 是Shd = (bits & (1 << 27)) !== 0;   // 前缀 'b'（myCurShd）；getSize 内部按 charAt(0) 分流 getCurAtk/getArmor
      if ((bits >>> 24) & 1) {
        // armorUp 乘子模式（批次B2）：值 = myCurAtk [+ctx.u.id] + armorUp(ctx.u,act,mode)*K → 字符串拼接
        //   bits0-15=K bits25-26=act bit27=mode bit30=hasSelf（压平器约束其余位必 0）
        var aK = bits & 0xFFFF;
        var aAct = __MECH_ARMOR_ACT[(bits >>> 25) & 3];
        var aMode = __MECH_ARMOR_MODE[(bits >>> 27) & 1];
        return function (ctx) {
          var s = myCurAtk;
          if (hasSelf) s += ctx.u.id;
          s += armorUp(ctx.u, aAct, aMode) * aK;   // 同一 armorUp 引擎函数，数值路径与源码 bit 一致
          return s;
        };
      }
      var c = bits & 0xFFFFFF;
      if (c === 0) throw new Error('机制解释器: atkRef 常数为 0（源码无 +0 形态；出现请报压平器）@ ' + 上下文);
      var cv = c / 1e4;
      if (Math.floor(cv) !== cv && String(cv).length > 6) throw new Error('机制解释器: atkRef 常数还原异常 ' + cv + ' @ ' + 上下文);
      var lv = (bits >>> 25) & 3;               // source 循环层级（0=栈顶；嵌套 for）
      var hasFind = (bits >>> 31) & 1;          // 批次B2：+findId（ctx.unitVars[lv].id，10052 myCurAtk+V.id+100）
      return function (ctx) {
        var s = 是Shd ? myCurShd : myCurAtk;
        if (hasSelf) s += ctx.u.id;
        if (hasTrig) s += ctx.u.id;               // 触发者在全部已知形态中 = 机制拥有者
        if (hasSrc) s += ctx.iStack[ctx.iStack.length - 1 - lv].id;
        if (hasFind) s += ctx.unitVars[lv].id;    // find 槽单位 id（槽号复用 bits25-26）
        s += cv;                                   // number → 字符串转换与源码 `+30` 同路径
        return s;
      };
    }
    case 'SlotRef': {
      var slot = p.i & 0xFF;
      if ((p.i >> 8) !== 0) throw new Error('机制解释器: 参数位 SlotRef 不应带 cmp 打包 @ ' + 上下文);
      if (slot !== 0) throw new Error('机制解释器: 参数位仅支持 slot0(stack) @ ' + 上下文);
      return function (ctx) { return ctx.u.stack; };
    }
    case 'ExprSize': {
      // 批次C-3：动态 size 表达式 (base+加)*K；i32=K(bits0-9)|(加+128)(bits10-17)|base(bits18-20)，_pad2=getNest 型/temp 槽名字典idx。
      //   base：0=ctx.u.stack / 1=ctx.u.getNest(names[idx]) / 2=ctx.lib（星级，装配期已规范化 1..5）。
      //   base=3（批次C-8）：min(stack+加, cap) 上界夹形态（10130：stack+1>10?10:stack+1；K 位=cap，_pad2 不用）
      //   base=4（批次E-4）：tempVars[槽名]（10170 tmpfunc `const V=U.stack; setBuffSize(…,V*10)`——值=快照读，忠实同源码只读语义）
      var esI = p.i >>> 0, esK = esI & 0x3FF, es加 = ((esI >>> 10) & 0xFF) - 128, esBase = (esI >>> 18) & 7;
      var esType = (esBase === 1 || esBase === 4) ? names[p._pad2] : null;
      if (esBase === 0) return function (ctx) { return (ctx.u.stack + es加) * esK; };
      if (esBase === 1) return function (ctx) { return (ctx.u.getNest(esType) + es加) * esK; };
      if (esBase === 2) return function (ctx) { return (ctx.lib + es加) * esK; };
      if (esBase === 3) {
        var mcCap = esK;   // K 位复用=cap（min(stack+加, cap)；源码三元 cap 位与乘子位同宽 10bit）
        return function (ctx) { var v = ctx.u.stack + es加; return v > mcCap ? mcCap : v; };
      }
      if (esBase === 4) return function (ctx) { return (ctx.tempVars[esType] + es加) * esK; };
      throw new Error('机制解释器: ExprSize 未知 base ' + esBase + ' @ ' + 上下文);
    }
    case 'ExprHp': return __mech_编译hpExpr(p.i, 上下文, p._pad2);
    case 'CountVal': {
      // 批次C-4：计数函数值位（getRoleCnt/getElementCnt(mask…)）；i=位集 mask，_pad2=0 role/1 element（与条件位 CmpRoleCnt/CmpElCnt 同 mask 约定）
      var cvMask = p.i, cvFn = p._pad2 === 0 ? getRoleCnt : getElementCnt;
      var cv名 = __mech_mask转数组(cvMask, p._pad2 === 0 ? role : element);
      return function () { return cvFn.apply(null, cv名); };
    }
    case 'ExprNestByType': {
      // 批次E-2b：buffNestByType(self,type)*K（10138 K=7.5）；i=K定点，_pad2=type字典idx；引擎纯函数现算
      var nbtK = p.i / 1e4, nbtTp = names[p._pad2];
      return function (ctx) { return buffNestByType(ctx.u, nbtTp) * nbtK; };
    }
    case 'NameCat': {
      // 批次E-2b：名字典串+kStack顶拼接（10165 "<날개형 유도탄>"+V）；bits0-15=idx，bits16-17=模式(0=kStack顶)
      var ncStr = names[p.i & 0xFFFF], ncMode = (p.i >>> 16) & 3;
      if (ncMode !== 0) throw new Error('机制解释器: NameCat 未知模式 ' + ncMode + ' @ ' + 上下文);
      return function (ctx) {
        if (!ctx.kStack || !ctx.kStack.length) throw new Error('机制解释器: NameCat 无循环上下文（kStack 空）');
        return ncStr + ctx.kStack[ctx.kStack.length - 1];   // JS 数字转串与源码 + 拼接同路径
      };
    }
    case 'TempVal': {
      // 批次E-2b：数值 temp 变量纯数值引用（10097 hpUpAll(V)/10139 nbf(…,V,4)）；i=varIdx
      var tvName = names[p.i];
      return function (ctx) { return ctx.tempVars[tvName]; };
    }
    case 'ExprAtkComp': {
      // 批次E-2b：myCurAtk+comp[N].id+常数（10135 全库唯一）；bits24-26=compN，低24位=常数定点
      var acN = (p.i >>> 24) & 7, acCv = (p.i & 0xFFFFFF) / 1e4;
      return function (ctx) {
        var s = myCurAtk;
        s += comp[acN].id;
        s += acCv;   // number→字符串转换与源码 `+10` 同路径
        return s;
      };
    }
    default: throw new Error('机制解释器: 未知参数 tag ' + p.tag + ' @ ' + 上下文);
  }
}

// ps 有效参数个数：从尾部截掉 None（中间 None 报错——引擎按 arguments.length 分支，个数必须精确）
function __mech_有效参数数(ps) {
  var n = 11;
  while (n > 0 && ps[n - 1].tag === 'None') n--;
  for (var i = 0; i < n; i++) if (ps[i].tag === 'None') throw new Error('机制解释器: ps 中间出现 None（参数个数语义不明，拒绝执行）');
  return n;
}

// ---- buff 挂载族：op → 引擎函数与精确参数个数（主目标 1 个 + ps N 个）----
var __MECH_BUFF族 = {
  Tbf: { fn: null, n: 5 }, Nbf: { fn: null, n: 6 }, Anbf: { fn: null, n: 9 },
  Atbf: { fn: null, n: 8 }, Ptbf: { fn: null, n: 8 }, Pnbf: { fn: null, n: 9 }, Buff: { fn: null, n: -1 },
};

function __mech_引擎函数(op) {
  switch (op) {
    case 'Tbf': return tbf; case 'Nbf': return nbf; case 'Anbf': return anbf;
    case 'Atbf': return atbf; case 'Ptbf': return ptbf; case 'Pnbf': return pnbf;
    case 'Buff': return buff;
    default: return null;
  }
}

// ---- 序列编译：线性 cmds[pos..] → 闭包数组；遇终止标记停（不消耗）----
// 流末可结束：仅顶层钩子段允许（最后一个钩子后面没有 HookStart，自然到流末）；
//   嵌套控制流段（If/For/Inject 内部）必须遇终止标记，否则指令流损坏——抛错拒装。
function __mech_编译段(cmds, pos, 终止判定, names, 上下文, 流末可结束) {
  var out = [];
  while (pos.i < cmds.length) {
    var c = cmds[pos.i];
    if (c.op === 'Nop') { pos.i++; continue; }
    if (终止判定 && 终止判定(c)) return out;
    pos.i++;
    __mech_编译一条(c, cmds, pos, names, out, 上下文);
  }
  if (终止判定 && !流末可结束) throw new Error('机制解释器: 指令流在 ' + 上下文 + ' 提前结束（缺终止标记）');
  return out;
}

function __mech_执行段(segs, ctx) {
  // 批次C-2：__cont 信号（Continue op 置位）——逐步检查并中断本段（嵌套段逐层上冒，由最近 For 消费）；
  //   旗标未置时 undefined→分支不进，对无 continue 角色零开销（单次布尔测试）。
  for (var i = 0; i < segs.length; i++) { segs[i](ctx); if (ctx.__cont) return; }
}

// ---- 单条指令编译 ----
function __mech_编译一条(c, cmds, pos, names, out, 上下文) {
  var op = c.op;

  // ① buff 挂载族（定位形/具名形压平后同构：主目标 + ps）
  var 族 = __MECH_BUFF族[op];
  if (族) {
    var efn = __mech_引擎函数(op);
    var tn = 族.n === -1 ? __mech_有效参数数(c.ps) : 族.n - 1;   // Buff 变长：压平器已截 None，取有效数
    if (族.n !== -1 && tn !== 族.n - 1) throw new Error('机制解释器: ' + op + ' 参数数 ' + (tn + 1) + '≠' + 族.n + ' @ ' + 上下文);
    var tgtF = __mech_编译主目标(c.tgt, c.tgtN);
    var pFns = [];
    for (var k = 0; k < tn; k++) pFns.push(__mech_编译参数(c.ps[k], names, 上下文 + '.' + op + '[' + k + ']'));
    var args = new Array(tn + 1);
    out.push(function (ctx) {
      args[0] = tgtF(ctx);
      for (var j = 0; j < tn; j++) args[j + 1] = pFns[j](ctx);
      efn.apply(null, args);
    });
    return;
  }

  switch (op) {
    case 'HpUpAll': {
      var hf = __mech_编译参数(c.ps[0], names, 上下文);
      out.push(function (ctx) { hpUpAll(hf(ctx)); });
      return;
    }
    case 'CdChange': {
      var ct = __mech_编译主目标(c.tgt, c.tgtN);
      var 三元 = c.ps[0].tag === 'TernLeader';
      var cv1, cv2, cvf;
      if (三元) { cv1 = c.ps[1].i / 1e4; cv2 = c.ps[2].i / 1e4; }
      else cvf = __mech_编译参数(c.ps[0], names, 上下文);
      out.push(function (ctx) {
        var t = ct(ctx);
        cdChange(t, 三元 ? (ctx.u.isLeader ? cv1 : cv2) : cvf(ctx));
      });
      return;
    }
    case 'DeleteBuff': {
      var dt = __mech_编译主目标(c.tgt, c.tgtN);
      var ddiv = names[c.ps[0].i], dname = names[c.ps[1].i];
      out.push(function (ctx) { deleteBuff(dt(ctx), ddiv, dname); });
      return;
    }
    case 'SetSlot': case 'AddSlot': case 'ClampSlot': {
      var slot = Math.round(c.ps[0].i / 1e4);
      if (slot !== 0) throw new Error('机制解释器: 槽位指令仅支持 slot0(stack)，出现 ' + slot + ' @ ' + 上下文);
      if (op === 'SetSlot') {
        var s1 = c.ps[1].i / 1e4;
        out.push(function (ctx) { ctx.u.stack = s1; });
      } else if (op === 'AddSlot') {
        var s2 = c.ps[1].i / 1e4;
        out.push(function (ctx) { ctx.u.stack += s2; });
      } else {
        var loRaw = c.ps[1].i, hiRaw = c.ps[2].i;
        var lo = loRaw === __MECH_SENTINEL_LO ? null : loRaw / 1e4;
        var hi = hiRaw === __MECH_SENTINEL_HI ? null : hiRaw / 1e4;
        out.push(function (ctx) {
          var v = ctx.u.stack;
          if (lo !== null && v < lo) v = lo;
          if (hi !== null && v > hi) v = hi;
          ctx.u.stack = v;
        });
      }
      return;
    }
    case 'SetBuffOn': case 'SetBuffOnAll': case 'SetBuffOnExtra': {
      // 批次E-4：SetBuffOnExtra 多一个 act 前缀参数（ps=[act,div,name,on…]；引擎 setBuffOnExtra(u,act,div,name,on)=
      //   find(div==arg2&&name==arg3&&div!="기본"&&act==arg1).on=arg4——直接回调引擎原函数保 bit-exact）
      var bx是Extra = op === 'SetBuffOnExtra';
      var bt = __mech_编译主目标(c.tgt, c.tgtN);
      var bact = bx是Extra ? names[c.ps[0].i] : null;
      var bdiv = names[bx是Extra ? c.ps[1].i : c.ps[0].i], bname = names[bx是Extra ? c.ps[2].i : c.ps[1].i];
      var onP = c.ps[bx是Extra ? 3 : 2];
      var fixIdx = bx是Extra ? 4 : 3;
      var onFn;
      if (onP.tag === 'Bool') { var ob = onP.i === 1; onFn = function () { return ob; }; }
      else if (onP.tag === 'SlotRef') {
        var oslot = onP.i & 0xFF, ocmp = (onP.i >> 8) & 0xFF, ov = c.ps[fixIdx].i / 1e4;
        if (oslot !== 0) throw new Error('机制解释器: setBuffOn 条件仅支持 slot0 @ ' + 上下文);
        onFn = function (ctx) { return __mech_cmp(ctx.u.stack, ocmp, ov); };
      } else if (onP.tag === 'TempRef') {
        var tvn = names[onP.i & 0xFFFF], tcmp = (onP.i >>> 16) & 0xFF, tvv = c.ps[fixIdx].i / 1e4;
        onFn = function (ctx) { return __mech_cmp(ctx.tempVars[tvn], tcmp, tvv); };
      } else throw new Error('机制解释器: setBuffOn.on 未知 tag ' + onP.tag + ' @ ' + 上下文);
      if (bx是Extra) out.push(function (ctx) { setBuffOnExtra(bt(ctx), bact, bdiv, bname, onFn(ctx)); });
      else {
        var efn2 = op === 'SetBuffOn' ? setBuffOn : setBuffOnAll;
        out.push(function (ctx) { efn2(bt(ctx), bdiv, bname, onFn(ctx)); });
      }
      return;
    }
    case 'ActUltLogic': {
      // 批次E-2b：改用 编译参数 统一求值（Fix 常数 或 ExprSize 星级乘子 `L+5`，10160/10173）；旧 bin Fix 解码路径不变
      var umF = __mech_编译参数(c.ps[0], names, 上下文);
      out.push(function (ctx) { ultLogic(ctx.u, umF(ctx)); });
      return;
    }
    case 'ActAtkLogic': { var m2 = c.ps[0].i / 1e4; out.push(function (ctx) { atkLogic(ctx.u, m2); }); return; }

    case 'SetSlotFromNest': {
      // 批次C-7：u.stack = u.getNest(nest型)（全库唯一 10183；注入体 c2.u=ownerU 与源码 `_0x55e037.stack=…` 同主体）
      var sfnN = names[c.ps[0].i];
      out.push(function (ctx) { ctx.u.stack = ctx.u.getNest(sfnN); });
      return;
    }
    case 'AddTemp': {
      // 批次E-2b：数值 temp 累加 tempVars[名]+=增量（10097 `V+=10` / 10160 `V++`）
      var atN = names[c.ps[0].i], atD = c.ps[1].i / 1e4;
      out.push(function (ctx) { ctx.tempVars[atN] += atD; });
      return;
    }
    case 'ClampTemp': {
      // 批次E-2b：数值 temp 上限钳 if(temp>N)temp=N（10139 `if(V>4)V=4`）；严格>同源码
      var ctN2 = names[c.ps[0].i], ctHi = c.ps[1].i / 1e4;
      out.push(function (ctx) { if (ctx.tempVars[ctN2] > ctHi) ctx.tempVars[ctN2] = ctHi; });
      return;
    }
    case 'ClampCurCdToCd': {
      // 批次E-2b：if(u.curCd>u.cd)u.curCd=u.cd（10008 turnstart 全库唯一；直接字段赋值无 canCDChange 门控，源码如此）
      var ccT = __mech_编译主目标(c.tgt, c.tgtN);
      out.push(function (ctx) { var u2 = ccT(ctx); if (u2.curCd > u2.cd) u2.curCd = u2.cd; });
      return;
    }
    case 'BuffSizeAddAll': {
      // 批次E-2b：自身全部同名 buff size 增量（10040 turnstart `for(b of U.buff){if(div&&name)b.size-=12.5}`）：
      //   引擎 filter+forEach 同构（与 setBuffSizeAll 同构仅 =/+= 之别；迭代中不增删条目安全）
      var bsaDiv = names[c.ps[0].i], bsaName = names[c.ps[1].i], bsaD = c.ps[2].i / 1e4;
      out.push(function (ctx) {
        var 列表 = ctx.u.buff.filter(function (b) { return b.div == bsaDiv && b.name == bsaName; });
        列表.forEach(function (b) { b.size += bsaD; });
      });
      return;
    }
    case 'SetUnitField': {
      // 批次E-3b：单位布尔字段赋值（10140 `comp[V].isFirstTurnActed=false/true`；注入体前置置位/后置置位成对出现）；
      //   tgt=主目标编码；ps[0]=字段名字典；ps[1]=Bool；执行 unit[fname]=bool（无引擎副作用，纯状态位读写与 SetFlag 不同）
      var suT = __mech_编译主目标(c.tgt, c.tgtN);
      var suFname = names[c.ps[0].i];
      var suVal = c.ps[1].i === 1;
      out.push(function (ctx) { var u3 = suT(ctx); if (u3 != null) u3[suFname] = suVal; });
      return;
    }
    case 'SpliceFirstBuffOn': {
      // 批次E-5a：自身 buff 循环删除首个点亮项（10190 ultimate `for(i<U.buff.length){if(b[i].name===N&&b[i].div==D&&b[i].on){b.splice(i,1);break}}`）：
      //   引擎写死 findIndex 命中删 1 个（与源码 splice+break 逐位同语义：第一个匹配项删除，后续不扫描）
      var sbDiv = names[c.ps[0].i], sbName = names[c.ps[1].i];
      out.push(function (ctx) {
        var 列 = ctx.u.buff;
        var i2 = 列.findIndex(function (b) { return b.name === sbName && b.div == sbDiv && b.on; });
        if (i2 >= 0) 列.splice(i2, 1);
      });
      return;
    }
    case 'ThrowRef': {
      // 批次E-5c：未声明标识符 ReferenceError 忠实复刻（10089 leader `hpUpAll(c,30)` 的 c 全文件未声明）：
      //   执行期 throw new ReferenceError(name+" is not defined")——V8 消息格式与源码非严格模式读未声明变量逐字一致
      var trName = names[c.ps[0].i];
      out.push(function () { throw new ReferenceError(trName + ' is not defined'); });
      return;
    }
    case 'FindMaxUnit': {
      // 批次E-5b：argmax/argmin 选择器（10111 filter+reduce / 10138 手卷循环归一）：
      //   ps[0]=TempUnit槽 Bool；ps[1]=字段名 NameIdx(hp/atk)；ps[2]=role过滤位集 Fix(0=不过滤)；ps[3]=方向 Bool(0=max/1=min)。
      //   引擎写死归约：过滤后集合 init=first，for(j=1..n-1){if(dir==='max'){c[j].f>c[i].f?i=j}else{c[j].f<c[i].f?i=j}}——
      //   严格比较平局取先（与源码 reduce(b.f>a.f?b:a,V[0]) 逐位等价；10138 best 初值 0/999999999 因 hp>0 恒正等价）。
      var fm槽 = c.ps[0].i, fmField = names[c.ps[1].i], fmMask = c.ps[2].i, fmMin = c.ps[3].i === 1;
      out.push(function (ctx) {
        // role 位集 bit i = role 数值 i（role 名表下标=数值），直接位过滤；fmMask=0=不过滤（全队）
        var pool = fmMask === 0 ? comp.slice() : comp.filter(function (x) { return ((fmMask >> x.role) & 1) === 1; });
        if (pool.length === 0) { ctx.unitVars[fm槽] = null; return; }
        var bestI = 0;
        for (var i = 1; i < pool.length; i++) {
          if (fmMin) { if (pool[i][fmField] < pool[bestI][fmField]) bestI = i; }
          else { if (pool[i][fmField] > pool[bestI][fmField]) bestI = i; }
        }
        ctx.unitVars[fm槽] = pool[bestI];
      });
      return;
    }
    case 'ActDefense': { out.push(function (ctx) { ctx.u.act_defense(); }); return; }
    case 'BossDefOff': { out.push(function (ctx) { boss.def = false; }); return; }
    case 'HpUpMe': {
      var hmT = __mech_编译主目标(c.tgt, c.tgtN), hmV = c.ps[0].i / 1e4;
      out.push(function (ctx) { hpUpMe(hmT(ctx), hmV); });
      return;
    }
    case 'DeleteBuffType': {
      var dbt = __mech_编译主目标(c.tgt, c.tgtN);
      var dbtDiv = names[c.ps[0].i], dbtType = names[c.ps[1].i];
      out.push(function (ctx) { deleteBuffType(dbt(ctx), dbtDiv, dbtType); });
      return;
    }

    case 'KeepOnlyLastBuff': {
      // 批次C-5b：引擎既有 keepOnlyLastBuff(目标,div,name)（从末往前只留最后一个 div+name buff，删其余）；全库唯一 10213
      var klT = __mech_编译主目标(c.tgt, c.tgtN);
      var klDiv = names[c.ps[0].i], klName = names[c.ps[1].i];
      out.push(function (ctx) { keepOnlyLastBuff(klT(ctx), klDiv, klName); });
      return;
    }
    case 'SetBuffSize': case 'SetBuffSizeAll': case 'SetBuffNest': case 'SetBuffSizeUp': {
      var sbT = __mech_编译主目标(c.tgt, c.tgtN);
      var sbDiv = names[c.ps[0].i], sbName = names[c.ps[1].i];
      var sbVF = __mech_编译参数(c.ps[2], names, 上下文);
      // 四者同构（目标,div,name,值），仅引擎函数不同；setBuffSizeUp = find 后 size+=值（批次C-4，10131）
      var sbFn = op === 'SetBuffSize' ? setBuffSize : op === 'SetBuffSizeAll' ? setBuffSizeAll : op === 'SetBuffSizeUp' ? setBuffSizeUp : setBuffNest;
      out.push(function (ctx) { sbFn(sbT(ctx), sbDiv, sbName, sbVF(ctx)); });
      return;
    }

    case 'SetHpUltDmg': case 'SetHpAtkDmg': {
      // 批次C-4：unit.hpUltDmg|hpAtkDmg = <ExprHp 表达式>（10050/10144；引擎定长字段，伤害期 /100 乘区）
      var hdT = __mech_编译主目标(c.tgt, c.tgtN);
      var hdVF = __mech_编译hpExpr(c.ps[0].i, 上下文, c.ps[0]._pad2);
      var hd字段 = op === 'SetHpUltDmg' ? 'hpUltDmg' : 'hpAtkDmg';
      out.push(function (ctx) { hdT(ctx)[hd字段] = hdVF(ctx); });
      return;
    }
    // ActHit 目标化：源码既有 U.hit() 也有 V.hit()/comp[i].hit()（11 处）
    case 'ActHit': {
      var ht = __mech_编译主目标(c.tgt, c.tgtN);
      out.push(function (ctx) { ht(ctx).hit(); });
      return;
    }
    // heal/heal2/heal3：目标.healN()（引擎内部 isHealedN 闸门，语义在类方法里）
    case 'Heal': case 'Heal2': case 'Heal3': {
      var ht2 = __mech_编译主目标(c.tgt, c.tgtN);
      var hfn = op === 'Heal' ? 'heal' : op === 'Heal2' ? 'heal2' : 'heal3';
      out.push(function (ctx) { ht2(ctx)[hfn](); });
      return;
    }
    case 'Bless': {
      var bt2 = __mech_编译主目标(c.tgt, c.tgtN);
      var bstr = names[c.ps[0].i];
      out.push(function (ctx) { bt2(ctx).bless(bstr); });
      return;
    }

    case 'If': {
      var condF = __mech_编译条件(c.cond, names);
      var thenSegs = __mech_编译段(cmds, pos, function (x) { return x.op === 'Else' || x.op === 'ElseIf' || x.op === 'EndIf'; }, names, 上下文 + '.then');
      var elseSegs = null;
      if (pos.i < cmds.length && cmds[pos.i].op === 'Else') {
        pos.i++;
        elseSegs = __mech_编译段(cmds, pos, function (x) { return x.op === 'EndIf'; }, names, 上下文 + '.else');
      } else if (pos.i < cmds.length && cmds[pos.i].op === 'ElseIf') {
        throw new Error('机制解释器: ElseIf 应由压平器展开为嵌套 If，运行侧不支持 @ ' + 上下文);
      }
      if (pos.i >= cmds.length || cmds[pos.i].op !== 'EndIf') throw new Error('机制解释器: If 缺 EndIf @ ' + 上下文);
      pos.i++;   // 消耗 EndIf
      out.push(function (ctx) {
        if (condF(ctx)) __mech_执行段(thenSegs, ctx);
        else if (elseSegs) __mech_执行段(elseSegs, ctx);
      });
      return;
    }

    case 'For': {
      var sel = c.cond;
      var 排除self = sel.b === 1;
      // 批次C-10a：选择器现返回 {u:单位, k:原始comp下标} 对数组（CmpLoopIdx 需要 k；i/kStack 平行栈）。
      //   排除self 过滤发生在配对层——k 保持原始下标（过滤后位置≠下标是 10022 类条件的语义要求）。
      var selF;
      if (sel.kind === 'SelMembers') {
        selF = function (ctx) {
          var out2 = [];
          for (var i = 0; i < comp.length; i++) {
            var u2 = comp[i];
            if (排除self && u2.id === ctx.u.id) continue;
            out2.push({ u: u2, k: i });
          }
          return out2;
        };
      } else if (sel.kind === 'SelRole' || sel.kind === 'SelElement') {
        var 名集 = __mech_mask转数组(sel.a, sel.kind === 'SelRole' ? role : element);
        var idxF = sel.kind === 'SelRole' ? getRoleIdx : getElementIdx;
        selF = function (ctx) {
          var idxs = idxF.apply(null, 名集);
          var out3 = [];
          for (var i = 0; i < idxs.length; i++) {
            var unit = comp[idxs[i]];
            if (排除self && unit.id === ctx.u.id) continue;
            out3.push({ u: unit, k: idxs[i] });
          }
          return out3;
        };
      } else if (sel.kind === 'SelRange') {
        // C式for(V=lo;V<N;V++) 定次下标循环（源码 10006/10125；批次E-1a 加下界：10040 V=1..4 / 10140 V=1..2）：
        //   a=上界（不含），nameIdx=下界（含，旧 bin 恒 0 兼容）；LoopI=comp[k] k∈[lo,N)
        var 上界 = sel.a, 下界R = sel.nameIdx || 0;
        selF = function (ctx) {
          var out4 = [];
          for (var i = 下界R; i < 上界; i++) out4.push({ u: comp[i], k: i });
          return out4;
        };
      } else if (sel.kind === 'SelCountLib') {
        // 批次E-1a：星级上界 `for(V=0;V<L+add;V++)`（10153 L+5）：执行期 n=ctx.lib+a/1e4 次，LoopI=comp[k]（k≥5 undefined 同源码越界）
        var cl偏 = sel.a / 1e4;
        selF = function (ctx) {
          var n = ctx.lib + cl偏;
          var out7 = [];
          for (var i = 0; i < n; i++) out7.push({ u: comp[i], k: i });
          return out7;
        };
      } else if (sel.kind === 'SelList') {
        // for(x of [a,b,…]) 固定下标列表（批次B；源码全库唯一 [1,3]）：a=3bit×5 打包，终止符 7
        var 列表 = [];
        for (var sb = 0; sb < 5; sb++) { var sv = (sel.a >>> (sb * 3)) & 7; if (sv === 7) break; 列表.push(sv); }
        selF = function (ctx) {
          var out5 = [];
          for (var i = 0; i < 列表.length; i++) out5.push({ u: comp[列表[i]], k: 列表[i] });
          return out5;
        };
      } else if (sel.kind === 'SelCountTemp') {
        // 批次C-9：上界=temp 快照变量（10192 `const V=U.stack; for(k<V)` / 10201 `const V=U.getNest(형); for(k<V)`）：
        //   执行期取 ctx.tempVars[nameIdx槽名]（Snapshot 已在同钩子作用域先行赋值）为迭代次数 n；
        //   n 非数/负/0 → 空循环（源码 for 同语义）；LoopI=comp[k]（iStack 顶）
        var ctName = names[sel.nameIdx];
        selF = function (ctx) {
          var n = ctx.tempVars[ctName] | 0;
          var out6 = [];
          for (var i = 0; i < n; i++) out6.push({ u: comp[i], k: i });   // 忠实源码迭代次数；i≥5 时 comp[i]=undefined（源码越界同此）
          return out6;
        };
      } else if (sel.kind === 'SelCountRole' || sel.kind === 'SelCountElement') {
        // 批次C-8：for(k=0;k<V;k++) V=getRoleCnt/ElementCnt(mask)+偏移（10198：getRoleCnt("딜","디","탱")-1）：
        //   执行期现算 count+偏移 次迭代；LoopI=comp[k] k∈[0,n)；n<0 → 空循环（与源码 for 语义一致）
        var cnt名 = __mech_mask转数组(sel.a, sel.kind === 'SelCountRole' ? role : element);
        var cntFn = sel.kind === 'SelCountRole' ? getRoleCnt : getElementCnt;
        var cnt偏 = sel.b / 1e4;
        selF = function (ctx) {
          var n = Math.round(cntFn.apply(null, cnt名) + cnt偏);
          var out6 = [];
          for (var i = 0; i < n; i++) out6.push({ u: comp[i], k: i });   // 忠实源码迭代次数 n；i≥5 时 comp[i]=undefined（源码越界访问 comp[k] 同此）
          return out6;
        };
      } else throw new Error('机制解释器: For 未知选择器 ' + sel.kind + ' @ ' + 上下文);
      var bodySegs = __mech_编译段(cmds, pos, function (x) { return x.op === 'EndFor'; }, names, 上下文 + '.for');
      if (pos.i >= cmds.length) throw new Error('机制解释器: For 缺 EndFor @ ' + 上下文);
      pos.i++;   // 消耗 EndFor
      out.push(function (ctx) {
        var items = selF(ctx);
        if (!ctx.kStack) ctx.kStack = [];   // 懒初始化（注入体等独立 ctx 也安全）
        ctx.iStack.push(null);
        ctx.kStack.push(null);
        for (var i = 0; i < items.length; i++) {
          ctx.iStack[ctx.iStack.length - 1] = items[i].u;
          ctx.kStack[ctx.kStack.length - 1] = items[i].k;
          __mech_执行段(bodySegs, ctx);
          ctx.__cont = false;   // 批次C-2：消费 continue 信号（仅最内层 For 消费；信号已中断到本层）
        }
        ctx.iStack.pop();
        ctx.kStack.pop();
      });
      return;
    }

    case 'LibIf': {
      var want = c.ps[0].i;   // 定点档位号（k×1e4）；执行 ctx.lib 已规范化为 1..5
      var libSegs = __mech_编译段(cmds, pos, function (x) { return x.op === 'EndIf'; }, names, 上下文 + '.lib');
      if (pos.i >= cmds.length) throw new Error('机制解释器: LibIf 缺 EndIf @ ' + 上下文);
      pos.i++;
      out.push(function (ctx) { if (ctx.lib * 1e4 === want) __mech_执行段(libSegs, ctx); });
      return;
    }

    case 'Snapshot': {
      var srcKind = c.ps[0].i;                  // 0=slot 1=getNest
      var varName = names[c.ps[2].i];
      if (srcKind === 0) {
        var snSlot = Math.round(c.ps[1].i / 1e4);
        if (snSlot !== 0) throw new Error('机制解释器: Snapshot 仅支持 slot0(stack) @ ' + 上下文);
        var snTgt0 = c.ps[3] ? c.ps[3].i : 1;
        if (snTgt0 !== 1) throw new Error('机制解释器: slot 快照目标必须是 self @ ' + 上下文);
        out.push(function (ctx) { ctx.tempVars[varName] = ctx.u.stack; });
      } else if (srcKind === 1) {
        var nestType = names[c.ps[1].i];
        var snTgt = c.ps[3].i;                  // 1=self 5=LoopI（注入体内读被注入者）
        out.push(function (ctx) {
          var unit = snTgt === 5 ? ctx.iStack[ctx.iStack.length - 1] : ctx.u;
          ctx.tempVars[varName] = unit.getNest(nestType);
        });
      } else if (srcKind === 2) {
        // 批次C-10b：boss 字段快照（10197 `const V=boss.def; ultLogic(u,5); if(V)`；10173 boss.def 同形）：
        //   ps[1]=字段名字典；执行期读 boss 当前值存 temp（忠实源码时序——快照在 ultLogic 前）
        var bfName2 = names[c.ps[1].i];
        out.push(function (ctx) { ctx.tempVars[varName] = boss[bfName2]; });
      } else if (srcKind === 3) {
        // 批次E-2b：`let V=N` 数值 temp 常数初始化（10097 `let V=0`）；ps[1]=定点
        var snK = c.ps[1].i / 1e4;
        out.push(function (ctx) { ctx.tempVars[varName] = snK; });
      } else if (srcKind === 4) {
        // 批次E-2b：`let V=getElementCnt/getRoleCnt(mask)` 计数快照（10139 `let V=getElementCnt("광","화")`）；
        //   ps[1]=mask（bit16=1 element）；执行期现算存 temp（钩子期初计一次，与源码 let 初始化同时机）
        var snMask = c.ps[1].i & 0xFFFF, sn是El = ((c.ps[1].i >>> 16) & 1) === 1;
        var snFn = sn是El ? getElementCnt : getRoleCnt;
        var sn名 = __mech_mask转数组(snMask, sn是El ? element : role);
        out.push(function (ctx) { ctx.tempVars[varName] = snFn.apply(null, sn名); });
      } else throw new Error('机制解释器: Snapshot 未知源 ' + srcKind + ' @ ' + 上下文);
      return;
    }

    case 'InjectStart': {
      var 方法 = __MECH_METHOD[c.ps[0].i];
      if (!方法) throw new Error('机制解释器: InjectStart 未知方法枚举 ' + c.ps[0].i + ' @ ' + 上下文);
      var 模式 = c.ps[1].i;                     // 0=追加 1=环绕 2=替换
      var injTgtF = __mech_编译主目标(c.tgt, c.tgtN);
      var 是PM = function (x) { return x.op === 'PhaseMark' || x.op === 'InjectEnd'; };
      var 快照段 = __mech_编译段(cmds, pos, 是PM, names, 上下文 + '.inject快照');
      if (pos.i >= cmds.length || cmds[pos.i].op !== 'PhaseMark' || cmds[pos.i].ps[0].i !== 0) throw new Error('机制解释器: inject 缺 PhaseMark(0) @ ' + 上下文);
      pos.i++;
      var 前置段 = __mech_编译段(cmds, pos, 是PM, names, 上下文 + '.inject前置');
      if (pos.i >= cmds.length || cmds[pos.i].op !== 'PhaseMark' || cmds[pos.i].ps[0].i !== 1) throw new Error('机制解释器: inject 缺 PhaseMark(1) @ ' + 上下文);
      pos.i++;
      var 后置段 = __mech_编译段(cmds, pos, 是PM, names, 上下文 + '.inject后置');
      if (pos.i >= cmds.length || cmds[pos.i].op !== 'PhaseMark' || cmds[pos.i].ps[0].i !== 2) throw new Error('机制解释器: inject 缺 PhaseMark(2) @ ' + 上下文);
      pos.i++;
      if (pos.i >= cmds.length || cmds[pos.i].op !== 'InjectEnd') throw new Error('机制解释器: inject 缺 InjectEnd @ ' + 上下文);
      pos.i++;
      out.push(function (ctx) {
        var unit = injTgtF(ctx);
        if (!unit || typeof unit !== 'object') throw new Error('机制解释器: inject 目标解析失败 @ ' + 上下文);
        var orig = unit[方法];
        var ownerU = ctx.u, libV = ctx.lib;
        unit[方法] = function (...args) {
          var c2 = { u: ownerU, lib: libV, iStack: [unit], tempVars: {}, unitVars: {} };   // 注入体无顶层 find 绑定，独立作用域即可
          if (模式 === 1) {          // 环绕：快照→前置→orig→后置
            __mech_执行段(快照段, c2);
            __mech_执行段(前置段, c2);
            orig.apply(this, args);
            __mech_执行段(后置段, c2);
          } else if (模式 === 0) {   // 追加：orig→后置
            orig.apply(this, args);
            __mech_执行段(后置段, c2);
          } else if (模式 === 2) {   // 替换：快照→前置→后置（不调 orig）
            __mech_执行段(快照段, c2);
            __mech_执行段(前置段, c2);
            __mech_执行段(后置段, c2);
          } else throw new Error('机制解释器: 未知注入模式 ' + 模式);
        };
      });
      return;
    }

    case 'FindUnit': {
      // 批次B2：const V = comp.find(x=>x.id==N) → ctx.unitVars[槽]=单位或 null（可能找不到，调用点受 CmpFindUnit 守卫）
      var fu槽 = c.ps[0].i, fuId = c.ps[1].i / 1e4;
      out.push(function (ctx) {
        var got = null;
        for (var i = 0; i < comp.length; i++) if (comp[i].id === fuId) { got = comp[i]; break; }
        ctx.unitVars[fu槽] = got;
      });
      return;
    }

    case 'FindBuff': {
      // 批次B2：ctx.unitVars[槽]={__b:!!tgt.buff.find(∀项 b[field]==字典串)}（10052/10058；矛盾谓词自然恒假）
      var fb槽 = c.ps[0].i, fb项数 = c.ps[1].i;
      var fbF = __mech_编译主目标(c.tgt, c.tgtN);
      var fb条 = [];
      for (var q = 0; q < fb项数; q++) {
        var qv = c.ps[2 + q].i >>> 0;
        fb条.push({ 字段: ['div', 'type', 'name', 'act'][(qv >>> 24) & 0x1F], 串: names[qv & 0xFFFFFF] });
      }
      out.push(function (ctx) {
        var unit = fbF(ctx);
        var got = null;
        if (unit && unit.buff) {
          for (var i = 0; i < unit.buff.length; i++) {
            var b = unit.buff[i], 全中 = true;
            for (var j = 0; j < fb条.length; j++) if (b[fb条[j].字段] !== fb条[j].串) { 全中 = false; break; }
            if (全中) { got = b; break; }
          }
        }
        ctx.unitVars[fb槽] = { __b: got != null };
      });
      return;
    }

    case 'Continue': {
      // 批次C-2：置 continue 信号 → __mech_执行段检测到后中断当前段（嵌套逐层上冒），最近 For 迭代末尾消费清信号
      out.push(function (ctx) { ctx.__cont = true; });
      return;
    }

    case 'ClampCurCd': {
      // 批次C-3：curCd 三元手卷 clamp 直译（`V.curCd = V.curCd<N ? X : V.curCd-M`，无 canCDChange 门控）
      var ccTgtF = (c.tgt === 'None' || c.tgt === 'Self') ? null : __mech_编译主目标(c.tgt, c.tgtN);
      var ccN = c.ps[0].i / 1e4, ccX = c.ps[1].i / 1e4, ccM = c.ps[2].i / 1e4;
      out.push(function (ctx) {
        var unit = ccTgtF ? ccTgtF(ctx) : ctx.u;
        unit.curCd = unit.curCd < ccN ? ccX : unit.curCd - ccM;
      });
      return;
    }

    case 'AddCd': case 'SetCd': case 'AddCurCd': case 'SetCurCd': {
      var cdTgtF = (c.tgt === 'None' || c.tgt === 'Self') ? null : __mech_编译主目标(c.tgt, c.tgtN);
      var cdV = c.ps[0].i / 1e4;
      var 是cur = c.op === 'AddCurCd' || c.op === 'SetCurCd';
      var 是加 = c.op === 'AddCd' || c.op === 'AddCurCd';
      out.push(function (ctx) {
        var unit = cdTgtF ? cdTgtF(ctx) : ctx.u;
        if (是cur) { if (是加) unit.curCd += cdV; else unit.curCd = cdV; }   // curCd 无 clamp（源码直接复合赋值）
        else { if (是加) unit.cd += cdV; else unit.cd = cdV; }
      });
      return;
    }

    case 'SetFlag': {
      // 旗标在装配期按 record.flags 位处理（见 __mech_装配）；执行流里幂等重设已知旗标。
      // 目标化（批次A）：tgt≠None/Self → 执行期对目标单位应用（10149 comp[V].canCDChange=false）
      var fbit = c.ps[0].i;
      if (c.tgt === 'None' || c.tgt === 'Self') {
        out.push(function (ctx) { __mech_应用旗标位(ctx.u, fbit); });
      } else {
        var flagTgtF = __mech_编译主目标(c.tgt, c.tgtN);
        out.push(function (ctx) { __mech_应用旗标位(flagTgtF(ctx), fbit); });
      }
      return;
    }

    default:
      throw new Error('机制解释器: 段内出现不可执行 op "' + op + '"（控制流标记泄漏或解释器未实现）@ ' + 上下文);
  }
}

// ---- 旗标：bit → 单位字段副作用（约束 1 的"唯一实例布尔机制"；逻辑写死在此，数据只声明有无）----
function __mech_应用旗标位(u, bit) {
  switch (bit) {
    case 0: u.getArmor = function () { return 0; }; break;   // ArmorZero（批次C-10b 落地：10133 leader 体内 `U.getArmor=function(){return 0}`，运行期 SetFlag 指令忠实钩子内条件置位）
    case 1: u.turnHeal = true; break;
    case 2: u.isSealed = true; break;
    case 3: throw new Error('机制解释器: 旗标 BossDefOff 未实现');
    case 4: u.canCDChange = false; break;
    case 5: u.stopCd = true; break;
    case 8: u.canCDChange = true; break;   // CanCdOn（批次B2：10058 turnover 双向 else 分支）
    case 9: u.stopCd = false; break;       // StopCdOff（批次B2：10052 turnover 双向 else 分支）
    case 10: u.turnHeal = false; break;    // TurnHealOff（批次C-10b：10134 case顶层 `turnHeal=false` 装配位）
    case 11: u.check = true; break;        // CheckOn（批次C-10b：10140 case顶层 `check=true` 装配位；钩子内读取走 CmpUnitField）
    case 12: u.stack = true; break;        // StackTrue（批次C-10b：10097 stack 布尔旗标，保留 true 型）
    case 13: u.stack = false; break;       // StackFalse（批次C-10b：10097 stack 布尔旗标，保留 false 型）
    case 14: u.check = false; break;       // CheckOff（批次C-10b：10140 turnstart 钩子内运行期置位）
    case 6: case 7: throw new Error('机制解释器: 旗标 HpUltDmg/HpAtkDmg 未实现（需数值参数，进阶段3前设计）');
    default: throw new Error('机制解释器: 未注册旗标位 ' + bit);
  }
}

// ---- 默认钩子骨架（与源码 191 case 的缺省形态逐一同形）----
function __mech_装默认钩子(u) {
  u.ultbefore = function () {};
  u.ultafter = function () {};
  u.atkbefore = function () {};
  u.atkafter = function () {};
  u.leader = function () {};
  u.passive = function () {};
  u.ultimate = function () { ultLogic(u); };
  u.attack = function () { atkLogic(u); };
  u.defense = function () { u.act_defense(); };
  u.turnstart = function () { if (u.isLeader) {} };
  u.turnover = function () { if (u.isLeader) {} };
}

// ---- 安装：records → { id: 装配函数 }（钩子段编译只做一次，跨战斗共享）----
// ⚠ 循环内必须 let/const（var 是函数作用域，闭包会全部捕获最后一条 record——
//   2026-09-19 实踩：10012 装配到了 10188 的数据，ultMag/cd/buff_ex 全串位）
function __mech_安装(数据) {
  if (!数据 || !Array.isArray(数据.records) || !Array.isArray(数据.names)) throw new Error('机制解释器: 数据必须含 records/names');
  const names = 数据.names;
  const 表 = {};
  for (let r = 0; r < 数据.records.length; r++) {
    const rec = 数据.records[r];
    const 预编译 = __mech_预编译record(rec, names);
    表[rec.id] = function (u, lib) { return __mech_装配(预编译, u, lib); };
  }
  return 表;
}

// 预编译：按 HookStart 切段 → 每钩子一个闭包数组；mnc/excl/slot/flags 还原为装配期直用值
function __mech_预编译record(rec, names) {
  var cmds = rec.cmds.slice(0, rec.usedCmds);
  var 段表 = {};   // 钩子名 → 闭包数组
  var pos = { i: 0 };
  var 当前钩子 = null;
  while (pos.i < cmds.length) {
    var c = cmds[pos.i];
    if (c.op === 'HookStart') {
      pos.i++;
      当前钩子 = __MECH_HOOK[c.ps[0].i];
      if (!当前钩子) throw new Error('机制解释器: HookStart 未知钩子枚举 ' + c.ps[0].i + ' (id=' + rec.id + ')');
      if (段表[当前钩子]) throw new Error('机制解释器: 钩子 ' + 当前钩子 + ' 重复出现 (id=' + rec.id + ')');
      // 段 = 到下一个 HookStart 或指令流末尾（最后一个钩子无后继 HookStart，属正常结束）
      段表[当前钩子] = __mech_编译段(cmds, pos, function (x) { return x.op === 'HookStart'; }, names, 'id=' + rec.id + '.' + 当前钩子, true);
    } else {
      throw new Error('机制解释器: HookStart 之前出现指令 op=' + c.op + ' (id=' + rec.id + ')');
    }
  }
  // mnc：批次E-4 起 reader 直出 double 原值（无损存储，含 10173 FP 噪声字面量）——直接转发，无定点还原
  var mnc = rec.mnc.slice();
  var excl = [];
  for (var e = 0; e < rec.exclCount; e++) excl.push(names[rec.exclTypes[e]]);
  var slotInit = rec.slotInit.slice();
  var flags = rec.flags.slice();
  return { id: rec.id, 段表: 段表, mnc: mnc, excl: excl, slotInit: slotInit, flags: flags };
}

// 装配（= 表驱动 setDefault）：每场战斗每角色一次
function __mech_装配(预编译, u, lib) {
  if (lib == null || lib < 1 || lib > 5) lib = 5;    // 与 setMnc 同规则；LibIf 段按此比较
  setMnc(u, 预编译.mnc, lib);
  for (var e = 0; e < 预编译.excl.length; e++) buff_ex.push(预编译.excl[e]);
  for (var s = 0; s < 4; s++) {
    if (预编译.slotInit[s] !== __MECH_SLOT_UNSET) {
      if (s !== 0) throw new Error('机制解释器: 仅实现 slot0(stack) 初值 (id=' + 预编译.id + ')');
      u.stack = 预编译.slotInit[s] / 1e4;
    }
  }
  for (var byteI = 0; byteI < 16; byteI++) {
    var fv = 预编译.flags[byteI];
    for (var bit = 0; bit < 8 && fv; bit++) {
      if (fv & 1) __mech_应用旗标位(u, byteI * 8 + bit);
      fv >>= 1;
    }
  }
  __mech_装默认钩子(u);
  var 段表 = 预编译.段表;
  // unitVars 跨钩子持久（批次B2）：源码 case 顶层 `const V=comp.find(x=>x.id==N)` 在 setDefault 时执行一次，
  //   V 被后续各钩子闭包捕获；对应实现=装配期创建 unitStore，init 段的 FindUnit 写入后各钩子 ctx 共享。
  var unitStore = {};
  for (var h = 0; h < __MECH_HOOK.length - 1; h++) {   // 末位 'init' 不是 u 上的钩子，单独处理
    var 名 = __MECH_HOOK[h];
    var segs = 段表[名];
    if (!segs) continue;
    (function (segs2) {
      u[名] = function () {
        var ctx = { u: u, lib: lib, iStack: [], tempVars: {}, unitVars: unitStore };
        __mech_执行段(segs2, ctx);
      };
    })(segs);
  }
  // init 伪钩子段：case 顶层即时语句（源码在 setDefault 顶层执行：deleteBuff 清静态 buff /
  // 顶层注入 wrap / 旗标 / FindUnit 绑定），装配期执行一次，与源码时机同机（钩子已装好，可安全 wrap）
  var initSegs = 段表['init'];
  if (initSegs && initSegs.length) {
    __mech_执行段(initSegs, { u: u, lib: lib, iStack: [], tempVars: {}, unitVars: unitStore });
  }
  return u;
}
