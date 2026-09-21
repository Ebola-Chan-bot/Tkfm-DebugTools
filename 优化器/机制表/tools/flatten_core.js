'use strict';
/*
 * 压平器 flatten.js —— src/*.json（可读嵌套 DSL）→ flat.json（schema.fbs 同形，喂 flatc --binary）。
 *
 * 职责（确定性、无副作用、同一 src 永远得同一 flat）：
 *   ① 统一字符串字典：扫描所有 buff name/type、魔法串(on/off/제거/발동/추가/always…)、元素名、role名 → names[]，正文只存 u16 索引
 *   ② 钩子线性化：11 主钩子按固定顺序，每个存在的钩子先发 HookStart(hookIdx) 分隔
 *   ③ 控制流线性化：if/elif/else → If…ElseIf…Else…EndIf；for → For…EndFor；perLib → 每档 LibIf(k)…EndIf（null 档跳过）
 *   ④ 条件编码：if 的 cond → Cmd.cond{kind,cmp,nameIdx,a,b}；复合 {all:[]}{not:{}} → 嵌套 If（not 翻转为 cmp/threshold）
 *   ⑤ 数值定点：一切十进制字面量 → round(x×10⁴) 的 i32（Tag.Fix）；小数位 >4 直接抛错（bit-exact 铁律）
 *   ⑥ 单位引用：主目标 → Cmd.tgt/tgtN；参数内单位引用 → Tag.Target，i = enum + compN*256 打包
 *   ⑦ atkRef → Tag.ExprAtkRef 位编码（bit30=self.id bit29=触发者id bit28=循环源id，低16位=常数）
 *   ⑧ temp 快照 → Snapshot；inject → InjectStart…Snapshot…PhaseMark(0/1/2)…InjectEnd
 *
 * 用法：node tools/flatten.js [srcId...]   （无参=压平 src/ 下全部）
 *   输出：build/flat.json、机制表/names.txt（字典，只追加不改序）
 * 依赖：../引擎适配.js（读 characterJson 填 record 基础字段 hp/atk/element/role，纯信息性，解释器不消费）
 */
const fs = require('fs');
const path = require('path');

const D = path.resolve(__dirname, '..');            // .../机制表
const SRC = path.join(D, 'src');
const BUILD = path.join(D, 'build');
fs.mkdirSync(BUILD, { recursive: true });

// ---- schema.fbs 枚举的数值镜像（改 schema 必须同步改这里；两边都是唯一真源的派生）----
const OP = {
  Nop:0, Tbf:1, Nbf:2, Anbf:3, Atbf:4, Ptbf:5, Pnbf:6, Buff:7,
  HpUpAll:10, HpUpMe:11, ArmorUp:12, Heal:13, Heal2:14, Bless:15, CdChange:16,
  DeleteBuff:17, DeleteBuffType:18, KeepOnlyLastBuff:19, SetBuffOn:20, SetBuffOnAll:21,
  SetBuffOnExtra:22, SetBuffSize:23, SetBuffSizeAll:24, SetBuffNest:25, BuffNestByType:26, SetMnc:27, Heal3:28,
  SetSlot:30, AddSlot:31, ClampSlot:32,
  ActUltLogic:40, ActAtkLogic:41, ActDefense:42, ActHit:43,
  HookStart:44, BossDefOff:45, AddCd:46, SetCd:47, AddCurCd:48, SetCurCd:49, SetFlag:50,
  If:60, EndIf:61, For:62, EndFor:63, LibIf:64, ElseIf:65, Else:66,
  InjectStart:70, Snapshot:71, InjectEnd:72, PhaseMark:73, FindUnit:74, FindBuff:75, Continue:76, ClampCurCd:77,
  SetHpUltDmg:78, SetHpAtkDmg:79, SetBuffSizeUp:80, SetSlotFromNest:81, AddTemp:83, ClampTemp:84, ClampCurCdToCd:85, BuffSizeAddAll:86, SetUnitField:87, FindMaxUnit:88, SpliceFirstBuffOn:89, ThrowRef:90,
};
const TAG = { None:0, NameIdx:1, TypeIdx:2, Fix:3, Always:4, Bool:5, Target:6, ExprAtkRef:7, TernLeader:8, SlotRef:9, HookId:10, ModeId:11, PhaseId:12, FlagId:13, ExprHp:14, TempRef:15, ExprSize:16, CountVal:17, ExprNestByType:19, NameCat:20, TempVal:21, ExprAtkComp:22, NaNVal:23 };
const TGT = { None:0, Self:1, All:2, Boss:3, CompN:4, LoopI:5, LoopUp:6, LowestHp:7, TempUnit:8, BossHitTarget:9 };
const CK = { None:0, SelMembers:1, SelRole:2, SelElement:3, CmpLeader:10, CmpGT:11, CmpGTIn:12, CmpGTMod:13, CmpSlot:14, CmpNest:15, CmpTemp:16, CmpElKind:17, CmpRoleCnt:18, CmpElCnt:19, HasTurnBuffType:20, CmpGTModGated:21, CmpRoKind:22, CmpLoopEl:23, SelRange:24, SelList:25, CmpFindUnit:26, CmpFindBuff:27, CmpLib:28, CmpLoopRole:29, CmpLoopId:30, CmpNeqPrevId:31, CmpSlotIn:32, CmpLoopRoleIn:33, SelCountRole:34, SelCountElement:35, SelCountTemp:36, CmpLoopElIn:37, CmpLoopName:38, CmpLoopIdx:39, CmpHasUnitId:40, CmpUnitField:41, CmpRandom:42, CmpTempFlag:43, CmpBossField:44, CmpNestByType:45, CmpBuffSize:46, CmpHpRatio:47, CmpSelfIdx:48, SelCountLib:49 };
const CMP = { Eq:0, Ne:1, Gt:2, Ge:3, Lt:4, Le:5 };

// 引擎侧数组顺序（deobfuscated.js L760/761）：element=[화,수,풍,광,암]  role=[딜,힐,탱,섶,디]
const ELEMENT = ['화', '수', '풍', '광', '암'];
const ROLE = ['딜', '힐', '탱', '섶', '디'];
// 主钩子固定顺序（HookId = 下标）；解释器与此表必须一致；'init'=伪钩子（case 顶层即时段，装配期执行一次）
const HOOK_ORDER = ['ultbefore','ultafter','ultimate','atkbefore','atkafter','attack','leader','passive','defense','turnstart','turnover','init'];
// 注入方法名 → MethodId（解释器据此定位被 wrap 的钩子）
const METHOD_ID = { ultimate:0, attack:1, defense:2, ultbefore:3, ultafter:4, atkbefore:5, atkafter:6, hit:7, leader:8, passive:9, act_attack:10, act_ultimate:11 };   // 批次E-5a：act_* 注入（10190）——与解释器 __MECH_METHOD 严格同序
// 注入模式 → ModeId
const MODE_ID = { '追加':0, '环绕':1, '替换':2 };

const K_CMD = 256;      // schema 定长指令池（2026-09-19 实测校准：10188 需 213 条，192 溢出）；不足填 Nop
const SLOT_NAME = { stack:0 };   // 私有计数器名 → slot 号（决策#2：stack=slot0）

// ---- 定点：十进制字面量 → round(x×10⁴) 的 i32；小数位 >4 抛错 ----
function 定点(x, 上下文) {
  if (typeof x !== 'number' || !isFinite(x)) throw new Error(`定点: 非法数值 ${JSON.stringify(x)} @ ${上下文}`);
  const s = String(x);
  const dot = s.indexOf('.');
  if (dot >= 0 && s.length - dot - 1 > 4) throw new Error(`定点: 小数位>4 拒绝 (${x}) @ ${上下文}`);
  const v = Math.round(x * 1e4);
  if (v < -2147483648 || v > 2147483647) throw new Error(`定点: i32 溢出 (${x}→${v}) @ ${上下文}`);
  return v;
}

// ---- 统一字典：字符串 → 稳定 u16 索引（只追加不改序）----
class 字典 {
  constructor() { this.map = new Map(); this.list = []; }
  add(s) {
    if (typeof s !== 'string') throw new Error(`字典.add 收到非字符串: ${JSON.stringify(s)}`);
    let i = this.map.get(s);
    if (i === undefined) { i = this.list.length; if (i > 65535) throw new Error('字典超过 u16 上限'); this.map.set(s, i); this.list.push(s); }
    return i;
  }
}

// 查表失败即抛错（throw 不能作 ?? 右操作数，全部经此助手）
function must(v, msg) { if (v === undefined || v === null) throw new Error(msg); return v; }

// ---- Param / Cond / Cmd 构造器（严格对齐 schema struct 全字段）----
const None = () => ({ tag: 'None', _pad: 0, _pad2: 0, i: 0 });
function P(tag, i) { return { tag, _pad: 0, _pad2: 0, i: i | 0 }; }
const PADN = n => { const a = []; for (let k = 0; k < n; k++) a.push(None()); return a; };
const C0 = () => ({ kind: 'None', cmp: 'Eq', nameIdx: 0, a: 0, b: 0 });
// op 数字 → 字符串名反查（flatc JSON 接受字符串 enum 名，与 round-trip 已验证格式一致）
const OP_NAME = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));
function mkCmd(op, tgt, ps, cond, tgtN) {
  const full = (ps || []).concat(PADN(11 - (ps || []).length));
  if (full.length !== 11) throw new Error(`Cmd ${op}: ps 超 11 (${full.length})`);
  const opName = typeof op === 'number' ? must(OP_NAME[op], `未知 op ${op}`) : op;
  return { op: opName, tgt: tgt || 'None', tgtN: tgtN | 0, _pad: 0, cond: cond || C0(), ps: full };
}

// ---- 主压平器 ----
class 压平器 {
  constructor(dict, 引擎) { this.dict = dict; this.引擎 = 引擎; this.cmds = []; }
  emit(c) { if (this.cmds.length >= K_CMD) throw new Error(`指令池 ${K_CMD} 溢出（需调大 K）`); this.cmds.push(c); return c; }

  // 编码一个"值"（可能是定点/字典串/单位引用/always/布尔/atkRef/slot引用）为 Param
  encVal(v, 上下文) {
    if (v && typeof v === 'object') {
      if (Array.isArray(v.perLib)) throw new Error(`perLib 未在上层展开 @ ${上下文}`);
      if (v.atkRef) return this.encAtkRef(v.atkRef, 上下文);
      if (v.hpExpr) return this.encHpExpr(v.hpExpr, 上下文);
      // 批次C-3：动态 size 表达式 (base+加)*K → ExprSize 位域（i32=K|加<<10|base<<18；_pad2=getNest 型字典idx）
      if (v.sizeExpr) {
        const se = v.sizeExpr, BASEN = { stack: 0, getNest: 1, 星级: 2, temp: 4 };
        if (BASEN[se.base] === undefined) throw new Error(`ExprSize 未知 base ${se.base} @ ${上下文}`);
        if (!(se.K >= 1 && se.K <= 1023)) throw new Error(`ExprSize K 超位域(1..1023): ${se.K} @ ${上下文}`);
        if (!(se.加 >= -128 && se.加 <= 127)) throw new Error(`ExprSize 加超位域(±127): ${se.加} @ ${上下文}`);
        // base=4(temp)：批次E-4，值=tempVars[槽]（10170 tmpfunc `const V=U.stack; setBuffSize(…,V*10)`）；_pad2=temp 变量名字典idx（base3=minClamp 占 3；星级=2）
        const idx16 = se.base === 'getNest' ? this.dict.add(must(se.型, 'ExprSize getNest 缺型'))
          : se.base === 'temp' ? this.dict.add(must(se.temp, 'ExprSize temp 缺槽名')) : 0;
        const packed = se.K | ((se.加 + 128) << 10) | (BASEN[se.base] << 18);
        return { tag: 'ExprSize', _pad: 0, _pad2: idx16, i: packed };
      }
      // 批次C-8：值位 min-clamp 三元 min(stack+加, cap)→ ExprSize base=3（同位域；K=cap∈1..1023，加±127）
      if (v.sizeMinClamp) {
        const mc = v.sizeMinClamp;
        if (!(mc.cap >= 1 && mc.cap <= 1023)) throw new Error(`sizeMinClamp cap 超位域(1..1023): ${mc.cap} @ ${上下文}`);
        if (!(mc.加 >= -128 && mc.加 <= 127)) throw new Error(`sizeMinClamp 加超位域(±127): ${mc.加} @ ${上下文}`);
        const packed = mc.cap | ((mc.加 + 128) << 10) | (3 << 18);
        return { tag: 'ExprSize', _pad: 0, _pad2: 0, i: packed };
      }
      // 批次C-4：计数函数值位 getRoleCnt/getElementCnt(mask…) → CountVal（i=位集 mask，_pad2=0 role/1 element）
      if (v.countVal) {
        const cv = v.countVal, 是role = cv.fn === 'getRoleCnt';
        let m = 0;
        for (const s of cv.mask) {
          const idx = (是role ? ROLE : ELEMENT).indexOf(s);
          if (idx < 0) throw new Error(`CountVal mask 未知 ${JSON.stringify(s)} @ ${上下文}`);
          m |= 1 << idx;
        }
        return { tag: 'CountVal', _pad: 0, _pad2: 是role ? 0 : 1, i: m };
      }
      // 批次E-2b：ultLogic 星级乘子 {星级:±add} → ExprSize base=星级 K=1（值=ctx.lib+add；解释器 ActUltLogic 改用 编译参数 求值）
      if (typeof v.星级 === 'number') {
        if (!(v.星级 >= -128 && v.星级 <= 127)) throw new Error(`星级乘子偏移 ${v.星级} 超 ExprSize 位域(±127) @ ${上下文}`);
        const packed = 1 | ((v.星级 + 128) << 10) | (2 << 18);
        return { tag: 'ExprSize', _pad: 0, _pad2: 0, i: packed };
      }
      // 批次E-2b：buffNestByType(self,type)*K 值位 → ExprNestByType（i=K定点可小数，_pad2=type字典idx≤65535）
      if (v.nestByTypeVal) {
        const nv = v.nestByTypeVal;
        const typeIdx = this.dict.add(must(nv.type, 'nestByTypeVal 缺 type'));
        if (typeIdx > 65535) throw new Error(`nestByTypeVal typeIdx ${typeIdx} 超 u16 @ ${上下文}`);
        return { tag: 'ExprNestByType', _pad: 0, _pad2: typeIdx, i: 定点(nv.K, 上下文) };
      }
      // 批次E-2b：buff 名拼接 "字串"+V → NameCat（i bits0-15=字典idx，bits16-17=模式 0=kStack顶下标）
      if (v.nameCat) {
        const nc = v.nameCat;
        const nIdx = this.dict.add(must(nc.串, 'nameCat 缺串'));
        if (nIdx > 65535) throw new Error(`nameCat 字典idx ${nIdx} 超 16bit @ ${上下文}`);
        if (nc.模式 !== 'k' && nc.模式 !== undefined) throw new Error(`nameCat 未知模式 ${nc.模式}（仅 k=循环下标拼接） @ ${上下文}`);
        return P('NameCat', nIdx | (0 << 16));
      }
      // 批次E-2b：数值 temp 变量进值位 → TempVal（i=varIdx u16 字典）
      if (typeof v.tempVal === 'string') {
        const tIdx = this.dict.add(v.tempVal);
        if (tIdx > 65535) throw new Error(`tempVal 字典idx ${tIdx} 超 u16 @ ${上下文}`);
        return P('TempVal', tIdx);
      }
      // 批次E-2b：myCurAtk+comp[N].id+常数 → ExprAtkComp（bits24-26=compN，低24位=常数定点；10135 全库唯一）
      if (v.atkComp) {
        const ac = v.atkComp;
        if (!Number.isInteger(ac.compN) || ac.compN < 0 || ac.compN > 4) throw new Error(`atkComp compN ${ac.compN} 越界 @ ${上下文}`);
        const cf = 定点(ac.常数, 上下文);
        if (cf < 0 || cf > 0xFFFFFF) throw new Error(`atkComp 常数定点 ${cf} 超 24 位 @ ${上下文}`);
        return P('ExprAtkComp', (ac.compN << 24) | cf);
      }
      // 批次E-5b：执行期恒 NaN 值位（10138 `comp[idx]*30` 对象乘法=NaN 忠实复刻；i 不用）
      if (v.NaNVal) {
        return P('NaNVal', 0);
      }
      if (typeof v.slot === 'string') return P('SlotRef', must(SLOT_NAME[v.slot], `未知 slot 名 ${v.slot}`));
      if (v.comp !== undefined) return P('Target', TGT.CompN + (v.comp | 0) * 256);
      if (v['$i上'] !== undefined) {
        const lv = v['$i上'] | 0;
        if (lv < 1 || lv > 3) throw new Error(`嵌套循环层级 ${lv} 超限(1..3) @ ${上下文}`);
        return P('Target', TGT.LoopUp + lv * 256);   // 参数位 Target 编码与主目标同位域
      }
      // {find:槽} → TempUnit 参数位（批次B2；atbf 目标参等）
      if (v.find !== undefined) {
        const sl = v.find | 0;
        if (sl < 0 || sl > 7) throw new Error(`find 槽号 ${sl} 超限 @ ${上下文}`);
        return P('Target', TGT.TempUnit + sl * 256);
      }
      throw new Error(`encVal 无法编码对象 ${JSON.stringify(v)} @ ${上下文}`);
    }
    if (typeof v === 'number') return P('Fix', 定点(v, 上下文));
    if (typeof v === 'boolean') return P('Bool', v ? 1 : 0);
    if (v === 'always') return P('Always', 0);
    if (typeof v === 'string') {
      // 目标关键字 vs 字典串
      if (v === 'self') return P('Target', TGT.Self);
      if (v === 'all') return P('Target', TGT.All);
      if (v === 'boss') return P('Target', TGT.Boss);
      if (v === 'bossHitTarget') return P('Target', TGT.BossHitTarget);   // 批次C-10b：引擎常量对象（10196 atbf 目标参）
      if (v === '$i') return P('Target', TGT.LoopI);
      if (v === 'lowestHp') return P('Target', TGT.LowestHp);   // 批次B：reduce 最低 curHp 队友
      return P('NameIdx', this.dict.add(v));   // buff name/type/魔法串统一进字典
    }
    throw new Error(`encVal 未知类型 ${JSON.stringify(v)} @ ${上下文}`);
  }

  // atkRef:["myCurAtk"|"myCurShd","+selfId",N|{armor乘子:{act,mode,K}}] → ExprAtkRef 位编码：bit30=+self.id bit29=+触发者id bit28=+循环源id
  //   bit27=前缀'b'(myCurShd；getSize 按 charAt(0) 分流 getCurAtk/getArmor)，低 24 位=常数定点
  //   （实测最大 578×10⁴=5,780,000 需 23 位，16 位不够；2026-09-19 修正）
  //   ⚠ bit24=1 时进入 armorUp 乘子模式（批次B2；全库 9 处，低 24 位被 K 占用，裸常数/myCurShd/循环源不允许）：
  //     bits0-15=K（armorUp 乘数，正整数）bits25-26=act(궁0/평1/방2) bit27=mode(추가0/발동1) bit30=hasSelf bit28-29必须0
  encAtkRef(arr, 上下文) {
    let bits = 0;
    const armor段 = arr.find(t => t && typeof t === 'object' && t.armor乘子);
    if (armor段) {
      if (armor段 !== arr[arr.length - 1]) throw new Error(`atkRef armor乘子必须在链尾 @ ${上下文}`);
      if (arr[0] !== 'myCurAtk') throw new Error(`atkRef armor乘子模式仅支持 myCurAtk 前缀 @ ${上下文}`);
      const hasSelf = arr.slice(1, -1).every(t => t === '+selfId') && arr.some(t => t === '+selfId');
      if (!arr.slice(1, -1).every(t => t === '+selfId')) throw new Error(`atkRef armor乘子模式仅支持 +selfId @ ${上下文}`);
      const { act, mode, K } = armor段.armor乘子;
      const ACT = { '궁': 0, '평': 1, '방': 2 }, MODE = { '추가': 0, '발동': 1 };
      if (ACT[act] === undefined || MODE[mode] === undefined) throw new Error(`atkRef armor乘子 act/mode 非枚举 @ ${上下文}`);
      if (!Number.isInteger(K) || K < 1 || K > 65535) throw new Error(`atkRef armor乘子 K ${K} 越界 @ ${上下文}`);
      bits = (1 << 24) | (ACT[act] << 25) | (MODE[mode] << 27) | K;
      if (hasSelf) bits |= (1 << 30);
      return P('ExprAtkRef', bits);
    }
    if (arr[0] === 'myCurShd') bits |= (1 << 27);
    else if (arr[0] !== 'myCurAtk') throw new Error(`atkRef 未知前缀 ${JSON.stringify(arr[0])} @ ${上下文}`);
    for (let k = 1; k < arr.length; k++) {
      const t = arr[k];
      if (t === '+selfId') bits |= (1 << 30);
      else if (t === '+触发者Id' || t === '+$触发者Id') bits |= (1 << 29);
      else if (t === '+$iId') bits |= (1 << 28);   // 循环源 id（iStack 栈顶）
      else if (t && typeof t === 'object' && t['+$iId上'] !== undefined) {
        // 嵌套 for：循环源 id 向上第 k 层（bit25-26）
        const lv = t['+$iId上'] | 0;
        if (lv < 1 || lv > 3) throw new Error(`atkRef 循环源层级 ${lv} 超限(1..3) @ ${上下文}`);
        bits |= (1 << 28) | (lv << 25);
      }
      else if (t && typeof t === 'object' && t['+findId'] !== undefined) {
        // 批次B2：find 槽单位 id（bit31=1；槽号复用 bits25-26，与 LoopUp 源互斥；10052 myCurAtk+V.id+100）
        const sl = t['+findId'] | 0;
        if (sl < 0 || sl > 3) throw new Error(`atkRef findId 槽号 ${sl} 超限(0..3，只占 2 位) @ ${上下文}`);
        bits |= (1 << 31) | (sl << 25);
      }
      else if (typeof t === 'number') {
        const fx = 定点(t, 上下文);
        if (fx < 0 || fx > 0xFFFFFF) throw new Error(`atkRef 常数定点 ${fx} 超 24 位 @ ${上下文}`);
        bits |= fx;
      } else throw new Error(`atkRef 未知段 ${JSON.stringify(t)} @ ${上下文}`);
    }
    return P('ExprAtkRef', bits);
  }

  // hpExpr：{base:'self'|'$i'|'lowestHp'|'$i异源self'|'compN',compN?,N,armorUp?:{act,mode},field?:'atk'|'curAtk'} → ExprHp 位域
  //   act∈{궁:0,평:1,방:2} mode∈{추가:0,발동:1}；base=self(1)/LoopI(5)/LowestHp(7)/$i异源self(6)/compN(4哨兵,_pad2.compN)
  //   field 缺省 hp；'atk'=bit31（<base>.atk*N）；'curAtk'=bit31+_pad2.fieldExt=2（U.getCurAtk()*N，基类返0运行时覆盖）
  encHpExpr(o, 上下文) {
    const BASE = { self: 1, '$i': 5, lowestHp: 7, '$i异源self': 6, compN: 4 };
    const ACT = { '궁': 0, '평': 1, '방': 2 };
    const MODE = { '추가': 0, '발동': 1 };
    const b = BASE[o.base];
    if (b === undefined) throw new Error(`hpExpr 未知 base ${JSON.stringify(o.base)} @ ${上下文}（仅 self/$i/lowestHp/$i异源self/compN）`);
    const fxd = 定点(o.N, 上下文);
    if (fxd < 0 || fxd > 0xFFFFFF) throw new Error(`hpExpr N 定点 ${fxd} 超 24 位 @ ${上下文}`);
    let bits = fxd;
    bits |= b << 24;   // base 占 bit24-26（3bit）
    let pad2 = 0;
    if (o.base === 'compN') {
      // 批次E-2b：comp[N] 固定位基座（10140 leader `comp[0].hp*100`）：_pad2 bits4-15=N；compN 基座不支持 armorUp/异源
      if (!Number.isInteger(o.compN) || o.compN < 0 || o.compN > 4) throw new Error(`hpExpr compN ${o.compN} 越界(0..4) @ ${上下文}`);
      if (o.armorUp) throw new Error(`hpExpr compN base 不支持 armorUp @ ${上下文}`);
      pad2 |= (o.compN & 0xFFF) << 4;
    }
    if (o.armorUp) {
      const a = ACT[o.armorUp.act], m = MODE[o.armorUp.mode];
      if (a === undefined) throw new Error(`hpExpr armorUp act ${o.armorUp.act} 非枚举(궁/평/방) @ ${上下文}`);
      if (m === undefined) throw new Error(`hpExpr armorUp mode ${o.armorUp.mode} 非枚举(추가/발동) @ ${上下文}`);
      bits |= 1 << 27;
      bits |= a << 28;
      bits |= m << 30;
    }
    if (o.field === 'atk') bits |= 1 << 31;   // bit31=字段（0=hp / 1=atk，批次B2）；mode 只占 1 位故安全
    else if (o.field === 'curAtk') { bits |= 1 << 31; pad2 |= 2; }   // 批次E-2b：getCurAtk() 方法（10133；fieldExt=2，含 buff 乘区非 atk 字段）
    else if (o.field !== undefined) throw new Error(`hpExpr 未知 field ${o.field} @ ${上下文}`);
    return { tag: 'ExprHp', _pad: 0, _pad2: pad2, i: bits };
  }

  // src 单位引用 → {tgt枚举, tgtN}（命令主目标）
  encTgt(t) {
    if (t === 'self') return { tgt: 'Self', tgtN: 0 };
    if (t === 'all') return { tgt: 'All', tgtN: 0 };
    if (t === 'boss') return { tgt: 'Boss', tgtN: 0 };
    if (t === 'bossHitTarget') return { tgt: 'BossHitTarget', tgtN: 0 };   // 批次C-10b：引擎常量对象（10196）
    if (t === '$i') return { tgt: 'LoopI', tgtN: 0 };
    if (t === 'lowestHp') return { tgt: 'LowestHp', tgtN: 0 };
    // {find:槽号} → TempUnit（批次B2：comp.find 绑定变量作目标；10043 V.cd-=2 / 10052 tbf(V,…)/V.cd+=2）
    if (t && typeof t === 'object' && t.find !== undefined) {
      const sl = t.find | 0;
      if (sl < 0 || sl > 7) throw new Error(`find 槽号 ${sl} 超限(0..7)`);
      return { tgt: 'TempUnit', tgtN: sl };
    }
    if (t && typeof t === 'object' && t.comp !== undefined) return { tgt: 'CompN', tgtN: t.comp | 0 };
    if (t && typeof t === 'object' && t['$i上'] !== undefined) {
      const lv = t['$i上'] | 0;
      if (lv < 1 || lv > 3) throw new Error(`嵌套循环层级 ${lv} 超限(1..3)`);
      return { tgt: 'LoopUp', tgtN: lv };
    }
    throw new Error(`encTgt 未知目标 ${JSON.stringify(t)}`);
  }

  // ── 语句编译：把一条 src 指令对象 emit 成一条或多条 Cmd ──
  // libK：perLib 展开时的档位(1..5)；null=未按档展开（遇 perLib 触发 LibIf 五档复制）
  compile(stmt, libK) {
    const key = Object.keys(stmt).filter(k => k !== '注释')[0];
    switch (key) {
      case 'tbf': return this.cmdbuf('Tbf', stmt, libK, 4);      // 具名形：目标在键值，ps=[type,size,name,turn]
      case 'nbf': case 'anbf': case 'atbf': case 'ptbf': case 'pnbf': case 'buff':
        return this.cmdbuf定位(key, stmt[key], libK, key);        // 定位形：数组原样，首元素=主目标
      case 'hpUpAll': return this.emit(mkCmd(OP.HpUpAll, 'None', [this.encValLib(stmt.hpUpAll, libK, 'hpUpAll')]));
      case 'hpUpMe': return this.cmdHpUpMe(stmt.hpUpMe);
      case 'cdChange': return this.cmdCdChange(stmt, libK);
      case 'addCd': case 'setCd': case 'addCurCd': case 'setCurCd': {
        // {addCd:N|{目标,N}} / {setCd:…} / {addCurCd:…} / {setCurCd:…}：目标缺省 self
        //   addCd/setCd 改 .cd（cdChange 门控外的直接字段改）；addCurCd/setCurCd 改 .curCd（无 clamp）
        const OP名 = { addCd: 'AddCd', setCd: 'SetCd', addCurCd: 'AddCurCd', setCurCd: 'SetCurCd' }[key];
        const v = stmt[key];
        const 目 = v && typeof v === 'object' && !Array.isArray(v) ? (v.目标 ?? 'self') : 'self';
        const n = v && typeof v === 'object' && !Array.isArray(v) ? v.N : v;
        const { tgt, tgtN } = this.encTgt(目);
        return this.emit(mkCmd(OP[OP名], tgt, [P('Fix', 定点(n, key))], null, tgtN));
      }
      case 'findUnit': { const f = stmt.findUnit; return this.emit(mkCmd(OP.FindUnit, 'None', [P('Bool', f.槽), P('Fix', 定点(f.id, 'findUnit'))])); }
      case 'findBuff': {
        // {findBuff:{槽,目标,谓词:[{field,'串'}…]}}：tgt=被查单位；ps[0]=槽 ps[1]=项数 ps[2..]=field<<24|字典idx
        const f = stmt.findBuff;
        const FIELD = { div: 0, type: 1, name: 2, act: 3 };
        if (!f.谓词.length || f.谓词.length > 8) throw new Error(`findBuff 谓词项数 ${f.谓词.length} 超限(1..8)`);
        const ps = [P('Bool', f.槽), P('Fix', f.谓词.length)];
        for (const t of f.谓词) {
          if (FIELD[t.field] === undefined) throw new Error(`findBuff 未知字段 ${t.field}`);
          const idx = this.dict.add(t.串);
          if (idx >= (1 << 24)) throw new Error(`findBuff 字典idx ${idx} 超 24 位`);
          ps.push(P('Fix', (FIELD[t.field] << 24) | idx));
        }
        const { tgt, tgtN } = this.encTgt(f.目标);
        return this.emit(mkCmd(OP.FindBuff, tgt, ps, null, tgtN));
      }
      case 'deleteBuff': return this.cmdDeleteBuff(stmt.deleteBuff);
      case 'deleteBuffType': return this.cmdDeleteBuffType(stmt.deleteBuffType);
      case 'keepOnlyLastBuff': {
        // 批次C-5b：[目标,div,name]（全库唯一 10213），与 deleteBuff 同 ps 布局
        const arr = stmt.keepOnlyLastBuff;
        const { tgt, tgtN } = this.encTgt(arr[0]);
        return this.emit(mkCmd(OP.KeepOnlyLastBuff, tgt, [P('NameIdx', this.dict.add(arr[1])), P('NameIdx', this.dict.add(arr[2]))], null, tgtN));
      }
      case 'bossDefOff': return this.emit(mkCmd(OP.BossDefOff, 'None', []));
      case 'setBuffSize': case 'setBuffSizeAll': case 'setBuffNest': return this.cmdSetBuff值(key, stmt, libK);
      case 'setBuffSizeUp': return this.cmdSetBuffSizeUp(stmt, libK);   // 批次C-4
      case 'setHpDmg': {
        // 批次C-4：{setHpDmg:{字段:'ult'|'atk',目标,expr}} → SetHpUltDmg/SetHpAtkDmg，ps[0]=ExprHp 编码
        const hd = stmt.setHpDmg;
        const { tgt, tgtN } = this.encTgt(hd.目标);
        const op = hd.字段 === 'ult' ? OP.SetHpUltDmg : hd.字段 === 'atk' ? OP.SetHpAtkDmg : null;
        if (!op) throw new Error(`setHpDmg 未知字段 ${hd.字段}`);
        return this.emit(mkCmd(op, tgt, [this.encHpExpr(hd.expr, 'setHpDmg.expr')], null, tgtN));
      }
      case 'setSlot': case 'addSlot': case 'clampSlot': return this.cmdSlot(key, stmt[key]);
      // 批次C-7：U.stack = U.getNest("형")（10183）：ps[0]=nest型字典idx，无目标（恒 owner self）
      case 'setSlotNest': return this.emit(mkCmd(OP.SetSlotFromNest, 'None', [P('TypeIdx', this.dict.add(stmt.setSlotNest))]));
      case 'setBuffOn': case 'setBuffOnAll': case 'setBuffOnExtra': return this.cmdSetBuffOn(key, stmt, libK);
      case 'ultLogic': {
        // 批次E-2b：mult 三态——null→Fix(1) / 数字→Fix / {星级:add}→ExprSize（解释器改用 编译参数 统一求值）
        const mv = stmt.ultLogic;
        const mp = mv == null ? P('Fix', 定点(1, 'ultLogic mult'))
          : (typeof mv === 'object' ? this.encValLib(mv, libK, 'ultLogic mult')
          : P('Fix', 定点(mv, 'ultLogic mult')));
        return this.emit(mkCmd(OP.ActUltLogic, 'None', [mp]));
      }
      case 'atkLogic': return this.emit(mkCmd(OP.ActAtkLogic, 'None', [P('Fix', 定点(stmt.atkLogic == null ? 1 : stmt.atkLogic, 'atkLogic'))]));
      case 'actDefense': return this.emit(mkCmd(OP.ActDefense, 'None', []));   // U.act_defense()（防御以外的钩子里显式调用防御动作的场景）
      case 'continue': return this.emit(mkCmd(OP.Continue, 'None', []));   // 批次C-2：for 体内通用 continue（If 包裹形态；执行段信号中断，最近 For 消费）
      // 批次E-2b：数值 temp 累加 `V+=N`/`V++`（10097 `V+=10` / 10160 `V++`）：ps=[NameIdx, Fix增量]
      case 'addTemp': return this.emit(mkCmd(OP.AddTemp, 'None', [P('NameIdx', this.dict.add(stmt.addTemp[0])), P('Fix', 定点(stmt.addTemp[1], 'addTemp'))]));
      // 批次E-2b：数值 temp 上限钳 `if(V>N)V=N`（10139 `if(V>4)V=4`）：ps=[NameIdx, Fix上限]
      case 'clampTemp': return this.emit(mkCmd(OP.ClampTemp, 'None', [P('NameIdx', this.dict.add(stmt.clampTemp[0])), P('Fix', 定点(stmt.clampTemp[1], 'clampTemp'))]));
      // 批次E-2b：`if(U.curCd>U.cd){U.curCd=U.cd}` 直译（10008 turnstart；tgt=self 源码唯一目标）
      case 'clampCurCdToCd': {
        const { tgt, tgtN } = this.encTgt(stmt.clampCurCdToCd);
        return this.emit(mkCmd(OP.ClampCurCdToCd, tgt, [], null, tgtN));
      }
      // 批次E-3b：单位布尔字段赋值（10140 `comp[V].isFirstTurnActed=false/true`）：ps[0]=字段名字典 ps[1]=Bool
      case 'setUnitField': {
        const sf = stmt.setUnitField;
        const { tgt, tgtN } = this.encTgt(sf.目标);
        return this.emit(mkCmd(OP.SetUnitField, tgt, [P('NameIdx', this.dict.add(sf.field)), P('Bool', sf.value ? 1 : 0)], null, tgtN));
      }
      // 批次E-5a：自身 buff 循环删除首个点亮项（10190 splice+break 直译；引擎写死 findIndex 删 1）
      case 'spliceFirstBuffOn': {
        const sp = stmt.spliceFirstBuffOn;
        return this.emit(mkCmd(OP.SpliceFirstBuffOn, 'Self', [P('NameIdx', this.dict.add(sp.div)), P('NameIdx', this.dict.add(sp.name))]));
      }
      // 批次E-5c：未声明标识符 ReferenceError 忠实复刻（10089 hpUpAll(c,30) 的 c）：ps[0]=标识符字典
      case 'throwRef': {
        return this.emit(mkCmd(OP.ThrowRef, 'None', [P('NameIdx', this.dict.add(stmt.throwRef))]));
      }
      // 批次E-5b：argmax/argmin 选择器（10111 filter+reduce / 10138 手卷循环归一）：
      //   ps=[Bool(TempUnit槽), NameIdx(字段 hp/atk), Fix(role过滤位集,0=不过滤), Bool(方向 0=max/1=min)]
      case 'findMaxUnit': {
        const fm = stmt.findMaxUnit;
        if (!(fm.槽 >= 0 && fm.槽 <= 7)) throw new Error(`findMaxUnit 槽 ${fm.槽} 超界 @ ${libK}`);
        let roleMask = 0;
        // role过滤 = 数字 role 值数组（bit 位=role 值；[]/null=不过滤全队）——与解释器 (mask>>x.role)&1 同约定
        for (const r of (fm.role过滤 || [])) { if (!Number.isInteger(r) || r < 0 || r > 4) throw new Error(`findMaxUnit role ${r} 越界`); roleMask |= (1 << r); }
        return this.emit(mkCmd(OP.FindMaxUnit, 'None', [P('Bool', fm.槽), P('NameIdx', this.dict.add(fm.field)), P('Fix', roleMask), P('Bool', fm.方向 === 'min' ? 1 : 0)]));
      }
      // 批次E-2b：自身全部同名 buff size 增量（10040 turnstart `for(b of U.buff){if(div&&name)b.size-=12.5}`）：
      //   ps=[div字典idx, name字典idx, Fix增量]；tgt 恒 self（源码全库唯一形态）
      case 'buffSizeAddAll': {
        const bs = stmt.buffSizeAddAll;
        return this.emit(mkCmd(OP.BuffSizeAddAll, 'Self', [P('NameIdx', this.dict.add(bs.div)), P('NameIdx', this.dict.add(bs.name)), P('Fix', 定点(bs.加, 'buffSizeAddAll'))]));
      }
      case 'clampCurCd': {
        // 批次C-3：curCd 三元手卷 clamp（`V.curCd = V.curCd<N ? X : V.curCd-M`，源码全库唯一 10025）；直译三参不做等价推理
        const cc = stmt.clampCurCd;
        const { tgt, tgtN } = this.encTgt(cc.目标);
        return this.emit(mkCmd(OP.ClampCurCd, tgt, [P('Fix', 定点(cc.N, 'clampCurCd.N')), P('Fix', 定点(cc.X, 'clampCurCd.X')), P('Fix', 定点(cc.M, 'clampCurCd.M'))], null, tgtN));
      }
      case 'heal': case 'heal2': case 'heal3':
        return this.cmdHeal(key, stmt[key]);
      case 'bless': return this.cmdBless(stmt);
      case 'hit': return this.cmdHit(stmt.hit);
      case 'lib': return this.cmdLib(stmt, libK);
      case 'flag': return this.cmdFlag(stmt);
      case 'temp': return this.cmdTemp(stmt.temp);
      case 'if': return this.cmdIf(stmt, libK);
      case 'for': return this.cmdFor(stmt, libK);
      case 'inject': return this.cmdInject(stmt.inject, libK);
      default: throw new Error(`compile: 未知指令形态 "${key}"（压平器未实现，不得静默跳过）`);
    }
  }

  // 具名形 buff 挂载（tbf）：{tbf:目标,type,size,name,turn}；libK!=null 时 perLib 取档值
  cmdbuf(opName, stmt, libK, expectPs) {
    const ctx = opName;
    const 有perLib = [stmt.type, stmt.size, stmt.name, stmt.turn].some(v => v && typeof v === 'object' && Array.isArray(v.perLib));
    if (有perLib && libK == null) {
      const 跳过 = this.取档跳过([stmt.type, stmt.size, stmt.name, stmt.turn], ctx);
      for (let k = 1; k <= 5; k++) {
        if (跳过[k - 1]) continue;
        this.emit(mkCmd(OP.LibIf, 'None', [P('Fix', 定点(k, 'LibIf'))]));
        this.cmdbuf(opName, stmt, k, expectPs);
        this.emit(mkCmd(OP.EndIf, 'None', []));
      }
      return;
    }
    const ps = [this.encValLib(stmt.type, libK, ctx + '.type', 'TypeIdx'),
                this.encValLib(stmt.size, libK, ctx + '.size'),
                this.encValLib(stmt.name, libK, ctx + '.name'),
                this.encValLib(stmt.turn, libK, ctx + '.turn')];
    if (ps.length !== expectPs) throw new Error(`${ctx}: ps 数 ${ps.length}≠${expectPs}`);
    const { tgt, tgtN } = this.encTgt(stmt.tbf);
    this.emit(mkCmd(OP[opName], tgt, ps, null, tgtN));
  }

  // 定位形 buff 挂载：数组原样；arr[0]=主目标；其余逐个 encVal
  cmdbuf定位(opName, arr, libK, srcKey) {
    if (!Array.isArray(arr)) throw new Error(`${srcKey}: 定位形必须是数组`);
    const 有perLib = arr.some(v => v && typeof v === 'object' && Array.isArray(v.perLib));
    if (有perLib && libK == null) {
      const 跳过 = this.取档跳过(arr, srcKey);
      for (let k = 1; k <= 5; k++) {
        if (跳过[k - 1]) continue;
        this.emit(mkCmd(OP.LibIf, 'None', [P('Fix', 定点(k, 'LibIf'))]));
        this.cmdbuf定位(opName, arr, k, srcKey);
        this.emit(mkCmd(OP.EndIf, 'None', []));
      }
      return;
    }
    const { tgt, tgtN } = this.encTgt(arr[0]);
    const ps = arr.slice(1).map((v, i) => this.encValLib(v, libK, `${srcKey}[${i + 1}]`));
    this.emit(mkCmd(OP[opName[0].toUpperCase() + opName.slice(1)], tgt, ps, null, tgtN));
  }

  // 取档跳过表：扫描参数里所有 perLib（null 模式必须一致）
  取档跳过(vals, 上下文) {
    let 跳过 = null;
    const 扫 = v => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (Array.isArray(v.perLib)) {
          if (v.perLib.length !== 5) throw new Error(`perLib 必须 5 档 @ ${上下文}`);
          const s = v.perLib.map(x => x == null);
          if (跳过 === null) 跳过 = s.slice();
          else for (let k = 0; k < 5; k++) if (s[k] !== 跳过[k]) throw new Error(`同指令 perLib null 模式不一致 @ ${上下文}`);
        } else for (const vv of Object.values(v)) 扫(vv);
      } else if (Array.isArray(v)) for (const vv of v) 扫(vv);
    };
    for (const v of vals) 扫(v);
    return 跳过 || [false, false, false, false, false];
  }

  // encVal 的 perLib 感知版：libK!=null 时 perLib 包装取第 libK 档
  encValLib(v, libK, 上下文, 强制tag) {
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.perLib)) {
      if (libK == null) throw new Error(`perLib 未展开就到了编码层 @ ${上下文}`);
      const vv = v.perLib[libK - 1];
      if (vv == null) throw new Error(`perLib[${libK}] 为 null 但未被跳过 @ ${上下文}`);
      return this.encValTyped(vv, 上下文, 强制tag);
    }
    return this.encValTyped(v, 上下文, 强制tag);
  }

  encValTyped(v, 上下文, 强制tag) {
    const p = this.encVal(v, 上下文);
    if (强制tag && p.tag === 'NameIdx') p.tag = 强制tag;   // type 位语义标记（同字典）
    return p;
  }

  // 条件 → Cmd.cond（返回 {kind,cmp,nameIdx,a,b}）
  encCond(c, 上下文) {
    const o = { kind: 'None', cmp: 'Eq', nameIdx: 0, a: 0, b: 0 };
    const cmpOf = s => must({ '==': 'Eq', '!=': 'Ne', '>': 'Gt', '>=': 'Ge', '<': 'Lt', '<=': 'Le' }[s], `未知比较符 ${s}`);
    switch (c.kind) {
      case '队长': o.kind = 'CmpLeader'; o.cmp = cmpOf(c.cmp); o.a = c.val ? 1 : 0; break;
      case '回合': o.kind = 'CmpGT'; o.cmp = cmpOf(c.cmp); o.a = 定点(c.fix, 上下文); break;
      case '回合集合': o.kind = 'CmpGTIn'; { let m = 0; for (const t of c.in) m |= (1 << t); o.a = m; break; }
      // 回合模：默认带 GT>1 前置守卫（源码 58/59 形态）；源表显式 "守卫":false 才用裸取模
      case '回合模': o.kind = (c.守卫 === false) ? 'CmpGTMod' : 'CmpGTModGated'; o.a = 定点(c.偏移 ?? 0, 上下文); o.b = 定点(c.模, 上下文); o.nameIdx = 定点(c.余, 上下文) & 0xFFFF; break;
      case 'slot比较': o.kind = 'CmpSlot'; o.cmp = cmpOf(c.cmp); o.a = must(SLOT_NAME[c.slot], `未知slot ${c.slot}`); o.b = 定点(c.fix, 上下文); break;
      case 'nest比较': o.kind = 'CmpNest'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.type); o.a = 定点(c.fix, 上下文); break;
      case 'temp': o.kind = 'CmpTemp'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.var); o.a = 定点(c.fix, 上下文); break;
      case '元素种类':
        o.kind = 'CmpElKind';
        // in 集合模式：a=-1 哨兵（非定点，解释器判 a===-1），b=元素种类数集合位；单值模式：a=定点
        if (Array.isArray(c.in)) { let m = 0; for (const e of c.in) m |= (1 << e); o.cmp = 'Eq'; o.a = -1; o.b = m; }
        else { o.cmp = cmpOf(c.cmp); o.a = 定点(c.val, 上下文); }
        break;
      case 'role计数': o.kind = 'CmpRoleCnt'; o.cmp = cmpOf(c.cmp); { let m = 0; for (const r of c.mask) m |= (1 << ROLE.indexOf(r)); o.a = m; } o.b = 定点(c.n ?? c.fix, 上下文); break;
      case '元素计数': o.kind = 'CmpElCnt'; o.cmp = cmpOf(c.cmp); { let m = 0; for (const e of c.mask) m |= (1 << ELEMENT.indexOf(e)); o.a = m; } o.b = 定点(c.n ?? c.fix, 上下文); break;
      case 'find真值': o.kind = 'CmpFindUnit'; o.cmp = 'Eq'; o.a = c.槽 | 0; o.b = 1; break;   // if(V) 裸真值（V=find槽；!V 翻为 not 包裹，b 恒 1=存在）
      case 'buffFind真值': o.kind = 'CmpFindBuff'; o.cmp = 'Eq'; o.a = c.槽 | 0; o.b = 1; break;
      case '有回合buff': o.kind = 'HasTurnBuffType'; o.cmp = 'Ge'; o.nameIdx = this.dict.add(c.type); o.a = 1; break;   // 正向：count>=1
      case '职务种类': o.kind = 'CmpRoKind'; o.cmp = cmpOf(c.cmp); o.a = 定点(c.val, 上下文); break;
      case '循环元素': o.kind = 'CmpLoopEl'; o.cmp = cmpOf(c.cmp); o.a = c.val | 0; break;   // element 枚举小整数（0..4），非定点
      case '星级': o.kind = 'CmpLib'; o.cmp = cmpOf(c.cmp); o.a = c.val | 0; break;   // 批次C-1：星级小整数（1..5），非定点（同 CmpLoopEl）
      case '循环id': o.kind = 'CmpLoopId'; o.cmp = cmpOf(c.cmp); o.a = 定点(c.val, 上下文); break;   // 批次C-4：iStack顶.id cmp 角色id定点（10211 for(comp){if(V.id==10160)）
      case '排除上层栈': o.kind = 'CmpNeqPrevId'; o.cmp = cmpOf(c.cmp); o.a = c.上层 | 0; break;   // 批次C-5：a=1 栈顶vs上一层 / 0 栈顶vs self（10062/10147 嵌套排除）
      case 'slot集合': {   // 批次C-7：U.stack==a||U.stack==b → 位集 in（a=slot号，b=值位集；值域 0..30 抽取器已守卫）
        let m = 0;
        for (const v of c.in) { if (!Number.isInteger(v) || v < 0 || v > 30) throw new Error(`slot集合 值 ${v} 超位集范围(0..30) @ ${上下文}`); m |= 1 << v; }
        o.kind = 'CmpSlotIn'; o.cmp = 'Eq'; o.a = must(SLOT_NAME[c.slot], `未知slot ${c.slot}`); o.b = m; break;
      }
      case '循环role集合': {   // 批次C-7：<循环目标>.role==a||…==b → a=role位集（0..4）
        let m = 0;
        for (const v of c.in) { if (!Number.isInteger(v) || v < 0 || v > 4) throw new Error(`循环role集合 值 ${v} 超枚举范围(0..4) @ ${上下文}`); m |= 1 << v; }
        o.kind = 'CmpLoopRoleIn'; o.cmp = 'Eq'; o.a = m; break;
      }
      case '循环role': o.kind = 'CmpLoopRole'; o.cmp = cmpOf(c.cmp); o.a = c.val | 0; break;   // 批次C-2：role 枚举小整数（0..4），同 CmpLoopEl
      // 批次C-10a：<循环目标>.element 集合（getElementIdx绑定.includes(V) 等价重写）→ a=element位集（0..4；iStack顶.element）
      case '循环元素集合': {
        let m = 0;
        for (const v of c.in) { if (!Number.isInteger(v) || v < 0 || v > 4) throw new Error(`循环元素集合 值 ${v} 超枚举范围(0..4) @ ${上下文}`); m |= 1 << v; }
        o.kind = 'CmpLoopElIn'; o.cmp = 'Eq'; o.a = m; break;
      }
      // 批次C-10a：<循环目标>.name == "S"（10088）→ nameIdx=字典串；cmp 仅 ==/!=
      case '循环名': {
        if (!['==', '!='].includes(c.cmp)) throw new Error(`循环名条件 cmp ${c.cmp} 非 ==/!= @ ${上下文}`);
        o.kind = 'CmpLoopName'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.name); break;
      }
      // 批次C-10a：循环下标比较（kStack 顶 cmp a 小整数；10022 `if(V!=0)`，V=getRoleIdx of 下标变量）
      case '循环下标': o.kind = 'CmpLoopIdx'; o.cmp = cmpOf(c.cmp); o.a = c.val | 0; break;
      // 批次C-10a：队伍中存在指定 id（10089 `if(comp.find(x=>x.id==N))` 内联于条件位）：a=角色id定点，b=1 恒真值
      case '存在id': o.kind = 'CmpHasUnitId'; o.cmp = 'Eq'; o.a = 定点(c.id, 上下文); o.b = 1; break;
      // 批次C-10b：单位布尔字段真值（10190 isHealed族 / 10134 turnHeal / 10140 check）：nameIdx=字段名字典，cmp 恒 Eq（!由 not 翻转）
      //   批次E-3b 泛化：b=目标 Target 打包（枚举+tgtN*256）；缺省 self=1 向后兼容旧 bin（b=0 解释器当 self）
      case '单位字段': {
        if (c.cmp && c.cmp !== '==') throw new Error(`单位字段条件 cmp ${c.cmp} 非 ==（否定走 not 包裹） @ ${上下文}`);
        const 目F = c.目标 == null ? 'self' : c.目标;
        const { tgt: ft, tgtN: ftn } = this.encTgt(目F);
        if (TGT[ft] === undefined) throw new Error(`单位字段 目标 ${目F} 未知 @ ${上下文}`);
        o.kind = 'CmpUnitField'; o.cmp = 'Eq'; o.nameIdx = this.dict.add(c.field); o.a = 1; o.b = TGT[ft] + (ftn << 8); break;
      }
      // 批次C-10b：Math.random() 比较（10038 `<0.5`）：a=阈值定点，执行期现调 Math.random()
      case '随机': o.kind = 'CmpRandom'; o.cmp = cmpOf(c.cmp); o.a = 定点(c.fix, 上下文); break;
      // 批次C-10b：temp 槽布尔真值（`const V=boss.def;…;if(V)`）：nameIdx=temp槽名，执行期 !!ctx.tempVars[槽名]
      case 'temp真值': o.kind = 'CmpTempFlag'; o.cmp = 'Eq'; o.nameIdx = this.dict.add(c.var); o.a = 1; break;
      // 批次C-10b：boss 字段比较（10150 `boss.element!=undefined` / `==4`）：b=1 undefined 存在性 / b=0 常规比较
      case 'boss字段':
        if (c.undefined判定) {
          if (!['==', '!='].includes(c.cmp)) throw new Error(`boss字段 undefined判定 cmp ${c.cmp} 非 ==/!= @ ${上下文}`);
          o.kind = 'CmpBossField'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.field); o.b = 1;
        } else {
          o.kind = 'CmpBossField'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.field); o.b = 0; o.a = 定点(c.val, 上下文);
        }
        break;
      // 批次C-10b：buffNestByType(self,type) 比较（10124/10140）：nameIdx=type字典，a=阈值定点；执行期直调引擎函数
      case 'nestByType': o.kind = 'CmpNestByType'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.type); o.a = 定点(c.fix, 上下文); break;
      // 批次C-10b：getBuffSize(self,div,name) 比较（10153 !=0 / 10171 ==undefined）：nameIdx=name，a=div字典idx，
      //   b=阈值定点 或 INT_MIN 哨兵=undefined存在性判定（Eq→是undefined / Ne→不是undefined）
      case 'buffSize':
        o.kind = 'CmpBuffSize'; o.cmp = cmpOf(c.cmp); o.nameIdx = this.dict.add(c.name);
        { const divI = this.dict.add(c.div); if (divI > 0x7FFFFFFF) throw new Error('buffSize div idx 溢出'); o.a = divI; }
        o.b = c.undefined ? -2147483648 : 定点(c.fix, 上下文); break;
      // 批次C-10b：循环目标 hp 比例（10181 curHp/hp>0.5）：a=阈值定点（iStack顶）
      case 'hp比例': o.kind = 'CmpHpRatio'; o.cmp = cmpOf(c.cmp); o.a = 定点(c.fix, 上下文); break;
      // 批次C-10b：循环下标 vs self 在 comp 下标（10136 findIndex 等价重写）：kStack顶 cmp comp.indexOf(ctx.u)
      case '自下标': o.kind = 'CmpSelfIdx'; o.cmp = cmpOf(c.cmp); break;
      default: throw new Error(`encCond 未知 kind ${c.kind} @ ${上下文}`);
    }
    return o;
  }

  // hpUpMe：[目标,N]
  cmdHpUpMe(v) {
    const { tgt, tgtN } = this.encTgt(v[0]);
    this.emit(mkCmd(OP.HpUpMe, tgt, [P('Fix', 定点(v[1], 'hpUpMe'))], null, tgtN));
  }

  // deleteBuffType：[目标,div,type]
  cmdDeleteBuffType(arr) {
    const { tgt, tgtN } = this.encTgt(arr[0]);
    this.emit(mkCmd(OP.DeleteBuffType, tgt, [P('NameIdx', this.dict.add(arr[1])), P('TypeIdx', this.dict.add(arr[2]))], null, tgtN));
  }

  // 批次C-4：setBuffSizeUp：{目标,div,name,up}（引擎=find(div+name)后 size+=up；与 cmdSetBuff值 同构只换 op 语义）
  cmdSetBuffSizeUp(stmt, libK) {
    const { tgt, tgtN } = this.encTgt(stmt.setBuffSizeUp);
    const ps = [P('NameIdx', this.dict.add(stmt.div)), P('NameIdx', this.dict.add(stmt.name)), this.encValLib(stmt.up, libK, 'setBuffSizeUp.up')];
    this.emit(mkCmd(OP.SetBuffSizeUp, tgt, ps, null, tgtN));
  }

  // setBuffSize/setBuffSizeAll：{目标,div,name,size}；setBuffNest：{目标,div,name,nest}
  cmdSetBuff值(key, stmt, libK) {
    const { tgt, tgtN } = this.encTgt(stmt[key === 'setBuffNest' ? 'setBuffNest' : key]);
    const 值键 = key === 'setBuffNest' ? 'nest' : 'size';
    const ps = [P('NameIdx', this.dict.add(stmt.div)), P('NameIdx', this.dict.add(stmt.name)), this.encValLib(stmt[值键], libK, `${key}.${值键}`)];
    const op = key === 'setBuffSize' ? OP.SetBuffSize : key === 'setBuffSizeAll' ? OP.SetBuffSizeAll : OP.SetBuffNest;
    this.emit(mkCmd(op, tgt, ps, null, tgtN));
  }

  // cdChange：{"cdChange":目标,"值":N|{isLeader:a,else:b}}
  cmdCdChange(stmt, libK) {
    const { tgt, tgtN } = this.encTgt(stmt.cdChange);
    const v = stmt.值;
    let ps;
    // 三元 isLeader?a:b → ps[0]=TernLeader 标记，ps[1]/ps[2]=两分支定点（不打包：负定点拆位会溢出，2026-09-19 修正）
    if (v && typeof v === 'object' && 'isLeader' in v) ps = [P('TernLeader', 1), P('Fix', 定点(v.isLeader, 'cd.isLeader')), P('Fix', 定点(v.else, 'cd.else'))];
    else ps = [this.encValLib(v, libK, 'cdChange.值')];
    this.emit(mkCmd(OP.CdChange, tgt, ps, null, tgtN));
  }

  // deleteBuff：[目标,div,name]
  cmdDeleteBuff(arr) {
    const { tgt, tgtN } = this.encTgt(arr[0]);
    this.emit(mkCmd(OP.DeleteBuff, tgt, [P('NameIdx', this.dict.add(arr[1])), P('NameIdx', this.dict.add(arr[2]))], null, tgtN));
  }

  // setSlot/addSlot/clampSlot：[slot名, 值...]；null=不夹（哨兵 INT_MIN/INT_MAX，值域 [-600,500]×10⁴ 永不碰撞）
  cmdSlot(key, arr) {
    const slot = SLOT_NAME[arr[0]];
    if (slot === undefined) throw new Error(`未知 slot 名 ${arr[0]}`);
    const op = key === 'setSlot' ? OP.SetSlot : key === 'addSlot' ? OP.AddSlot : OP.ClampSlot;
    const ps = [P('Fix', slot)];
    if (key === 'clampSlot') {
      ps.push(arr[1] == null ? P('Fix', -2147483648) : P('Fix', 定点(arr[1], 'clamp.lo')));
      ps.push(arr[2] == null ? P('Fix', 2147483647) : P('Fix', 定点(arr[2], 'clamp.hi')));
    } else {
      ps.push(P('Fix', 定点(arr[1], key)));
    }
    this.emit(mkCmd(op, 'None', ps));
  }

  // setBuffOn/setBuffOnAll：{setBuffOn:目标,div,name,on:true|false|{slot,cmp,fix}}
  // 批次E-4：setBuffOnExtra：{setBuffOnExtra:目标,act,div,name,on}（引擎 find(div==arg2&&name==arg3&&div!="기본"&&act==arg1).on=arg4；
  //   ps 布局多一个 act 前缀：[act,div,name,on…]，解释器按 op 分派偏移；10158 子程序体内全库唯一使用）
  cmdSetBuffOn(key, stmt, libK) {
    const { tgt, tgtN } = this.encTgt(stmt[key]);
    const ps = [];
    if (key === 'setBuffOnExtra') ps.push(P('NameIdx', this.dict.add(stmt.act)));
    ps.push(P('NameIdx', this.dict.add(stmt.div)), P('NameIdx', this.dict.add(stmt.name)));
    const on = stmt.on;
    if (typeof on === 'boolean') ps.push(P('Bool', on ? 1 : 0));
    else if (on && typeof on === 'object' && typeof on.slot === 'string') {
      const slot = SLOT_NAME[on.slot];
      if (slot === undefined) throw new Error(`未知 slot ${on.slot}`);
      const cmpCode = CMP[must({ '==':'Eq', '!=':'Ne', '>':'Gt', '>=':'Ge', '<':'Lt', '<=':'Le' }[on.cmp], `未知比较符 ${on.cmp}`)];
      ps.push(P('SlotRef', slot | (cmpCode << 8)));
      ps.push(P('Fix', 定点(on.fix, 'setBuffOn.on.fix')));
    } else if (on && typeof on === 'object' && typeof on.temp === 'string') {
      // temp 比较形态（源码 setBuffOn(u,…,s>N)，s=先前 Snapshot 快照；10197 系大量使用）
      const cmpCode = CMP[must({ '==':'Eq', '!=':'Ne', '>':'Gt', '>=':'Ge', '<':'Lt', '<=':'Le' }[on.cmp], `未知比较符 ${on.cmp}`)];
      const varIdx = this.dict.add(on.temp);
      if (varIdx > 0xFFFF) throw new Error('TempRef 变量索引超 u16');
      ps.push(P('TempRef', varIdx | (cmpCode << 16)));
      ps.push(P('Fix', 定点(on.fix, 'setBuffOn.on.fix')));
    } else throw new Error(`setBuffOn.on 未知形态 ${JSON.stringify(on)}`);
    this.emit(mkCmd(key === 'setBuffOn' ? OP.SetBuffOn : key === 'setBuffOnAll' ? OP.SetBuffOnAll : OP.SetBuffOnExtra, tgt, ps, null, tgtN));
  }

  // heal/heal2/heal3：目标.healN()（无参；引擎内部 isHealed 闸门）
  cmdHeal(key, 目标) {
    const { tgt, tgtN } = this.encTgt(目标);
    const op = key === 'heal' ? OP.Heal : key === 'heal2' ? OP.Heal2 : OP.Heal3;
    this.emit(mkCmd(op, tgt, [], null, tgtN));
  }

  // bless：目标.bless(type)（type 进字典，但 bless 参数是字符串本体非 buff 名；同字典无语义冲突）
  cmdBless(stmt) {
    const { tgt, tgtN } = this.encTgt(stmt.bless);
    this.emit(mkCmd(OP.Bless, tgt, [P('TypeIdx', this.dict.add(stmt.type))], null, tgtN));
  }

  // hit：目标.hit()（源码 U.hit()/V.hit()，11 处）
  cmdHit(目标) {
    const { tgt, tgtN } = this.encTgt(目标);
    this.emit(mkCmd(OP.ActHit, tgt, [], null, tgtN));
  }

  // lib：独立解放档分支 {lib:N|"default",then:[…]}（抽取器把 switch(L) 转成 lib 块序列；
  //   default ≡ lib5——setMnc/装配都把 >5/<1 规范化为 5，switch default 恰好只接 5）
  cmdLib(stmt, libK) {
    const k = stmt.lib === 'default' ? 5 : stmt.lib;
    if (!Number.isInteger(k) || k < 1 || k > 5) throw new Error(`lib 分支档位非法: ${stmt.lib}`);
    this.emit(mkCmd(OP.LibIf, 'None', [P('Fix', 定点(k, 'lib'))]));
    for (const s of (stmt.then || [])) this.compile(s, libK);
    this.emit(mkCmd(OP.EndIf, 'None', []));
  }

  // flag：具名旗标 → 运行期 SetFlag 指令（钩子体内/指令流中出现时执行到才应用）。
  //   ⚠ **不得提升为 record.flags 装配位**（10079 回归根因）：源码 `U.stopCd=true` 写在
  //   leader 钩子体内 = 只有当队长时才置位；若无条件进装配位，非队长场也会 stopCd=true
  //   → 궁 永不发动，伤害不一致。装配期旗标只来自 src.旗标（case 顶层字段，无条件执行）。
  //   {flag:名, 目标:T} 且 T≠self → 对目标应用（10149 循环内 comp[V].canCDChange=false）。
  cmdFlag(stmt) {
    const name = typeof stmt === 'string' ? stmt : stmt.flag;
    const 目标 = typeof stmt === 'object' && stmt.目标 != null ? stmt.目标 : 'self';
    const bit = FLAG_BITS[name];
    if (bit === undefined) throw new Error(`未注册旗标 ${name}`);
    if (目标 === 'self') {
      this.emit(mkCmd(OP.SetFlag, 'None', [P('FlagId', bit)]));
    } else {
      const { tgt, tgtN } = this.encTgt(目标);
      this.emit(mkCmd(OP.SetFlag, tgt, [P('FlagId', bit)], null, tgtN));
    }
  }

  // temp：[变量名,{slot:"stack"}|{getNest:"type",目标?:src}] → Snapshot；变量名进字典（CmpTemp 用）；
  //   目标缺省 self（10188 钩子顶层读自己 stack）；注入体内读被注入者 nest 时写 "$i"（승나미源码 12915 comp[_i].getNest）
  cmdTemp(arr) {
    const varIdx = this.dict.add(arr[0]);
    const src = arr[1];
    const 目标 = src.目标 == null ? 'self' : src.目标;
    const tgtVal = 目标 === 'self' ? 1 : 目标 === '$i' ? 5 : (() => { throw new Error(`temp 目标 ${目标} 未支持（需 compN 扩展）`); })();
    let ps;
    if (typeof src.slot === 'string') {
      const slot = SLOT_NAME[src.slot];
      if (slot === undefined) throw new Error(`temp 未知 slot ${src.slot}`);
      ps = [P('Fix', 0), P('Fix', slot), P('NameIdx', varIdx), P('Fix', tgtVal)];
    } else if (typeof src.getNest === 'string') {
      ps = [P('Fix', 1), P('NameIdx', this.dict.add(src.getNest)), P('NameIdx', varIdx), P('Fix', tgtVal)];
    } else if (typeof src.bossField === 'string') {
      // 批次C-10b：boss 字段快照（10197/10173 `const V=boss.def; ultLogic(…); if(V)`——快照时机在 ultLogic 前，执行期忠实按指令序）；
      //   ps[1]=字段名字典（def/element），无目标位（boss 是引擎单例）
      ps = [P('Fix', 2), P('NameIdx', this.dict.add(src.bossField)), P('NameIdx', varIdx)];
    } else if (typeof src.常数 !== 'undefined') {
      // 批次E-2b：`let V = N` 数值 temp 初始化（10097 `let V=0` / 10139?）；ps[1]=初始值定点；执行期 tempVars[槽名]=N
      ps = [P('Fix', 3), P('Fix', 定点(src.常数, 'temp.常数初始化')), P('NameIdx', varIdx)];
    } else if (src.countCall) {
      // 批次E-2b：`let V = getRoleCnt/getElementCnt(mask…)` 数值 temp 计数快照（10139 `let V=getElementCnt("광","화")`）：
      //   ps[1]=位集mask ps[2]=变量名 _pad?——role/element 区分放 ps[1] 高位（bit16=1 element）；执行期现算存 temp
      const cc = src.countCall, 是role = cc.fn === 'getRoleCnt';
      let m2 = 0;
      for (const s2 of cc.mask) {
        const idx2 = (是role ? ROLE : ELEMENT).indexOf(s2);
        if (idx2 < 0) throw new Error(`temp countCall mask 未知 ${JSON.stringify(s2)}`);
        m2 |= 1 << idx2;
      }
      if (!是role) m2 |= 1 << 16;   // bit16=element 标志
      ps = [P('Fix', 4), P('Fix', m2), P('NameIdx', varIdx)];
    } else throw new Error(`temp 源未知 ${JSON.stringify(src)}`);
    this.emit(mkCmd(OP.Snapshot, 'None', ps));
  }

  // if/elif/else 链 → 纯嵌套 If/Else 翻译（不用 ElseIf op；复合 all/not 展开为嵌套 guard）。
  //   语义：if C1 A elif C2 B else D  ≡  if C1 {A} else {if C2 {B} else {D}}。
  //   ⚠ elif 链必须**递归展平**（2026-09-19 10207 回归：抽取器对 `if{}else if{}else if{}` 产生嵌套
  //   elif[0].elif 结构，旧代码只读 el.if/el.then → 第三分支被静默丢弃，점등分支缺失伤害不一致）。
  //   复合 C=g0&&g1 展开为 If(g0){If(g1){then}else{续}}else{续}（续=下一段；非空续会被复制两份，正确但增大指令数）。
  cmdIf(stmt, libK) {
    const 段 = [{ cond: stmt.if, body: stmt.then || [] }];
    let elseBody = stmt.else || null;
    const 收elif = el => {
      段.push({ cond: el.if, body: el.then || [] });
      for (const e2 of (el.elif || [])) 收elif(e2);
      if (el.else && el.else.length) {
        if (elseBody) throw new Error('elif 链出现多个 else（形态非法）');
        elseBody = el.else;
      }
    };
    for (const el of (stmt.elif || [])) 收elif(el);
    this.emitIfChain(段, elseBody, libK);
  }

  emitIfChain(段, elseBody, libK) {
    if (段.length === 0) {
      if (elseBody) for (const s of elseBody) this.compile(s, libK);
      return;
    }
    const seg = 段[0];
    const 续 = () => this.emitIfChain(段.slice(1), elseBody, libK);
    const guards = this.condGuards(seg.cond);
    // 爆炸保护：每个 guard 都把"续"复制一份，>2 guard 且带 elif/else 时体积指数膨胀
    //  （当前全库未见此形态；出现则需 schema 侧加复合 cond 位域或 Goto 指令，属 v0.2 扩版，不得静默截断）
    if (guards.length > 2 && (段.length > 1 || elseBody)) throw new Error(`if 复合 guard(${guards.length}) 带续延，压平复制爆炸保护触发（需扩 schema）`);
    // 无续延时 guard 嵌套不膨胀（else 空），3~4 guard 安全放行
    const thenFn = () => { for (const s of seg.body) this.compile(s, libK); };
    this.emitNested(guards, 0, thenFn, 续, libK);
  }

  // 把守卫条件列表 guards[i..] 展开为嵌套 If；任一 guard 为假 → elseFn（复合整体为假）
  emitNested(guards, i, thenFn, elseFn, libK) {
    if (i >= guards.length) { thenFn(); return; }
    this.emit(mkCmd(OP.If, 'None', [], guards[i]));
    this.emitNested(guards, i + 1, thenFn, elseFn, libK);
    this.emit(mkCmd(OP.Else, 'None', []));
    elseFn();
    this.emit(mkCmd(OP.EndIf, 'None', []));
  }

  // 条件 → 简单 cond 数组（AND 语义）；not 就地翻转 cmp；all 递归展平（not 不得包裹 all，否则 De Morgan 无法简单翻转）
  condGuards(c) {
    if (c && typeof c === 'object' && Array.isArray(c.all)) {
      if (c.all.length < 2) throw new Error('all 至少 2 元（否则应直接写内层）');
      const out = [];
      for (const sub of c.all) out.push(...this.condGuards(sub));
      if (out.length > 4) throw new Error(`all 展平后 ${out.length} 个 guard（嵌套复制爆炸；需扩 schema 支持复合 cond）`);
      return out;
    }
    if (c && typeof c === 'object' && c.not) {
      const inner = c.not;
      if (inner && typeof inner === 'object' && Array.isArray(inner.all)) throw new Error('not 不得包裹 all（需 De Morgan 翻转 or，扩 schema 前报告）');
      return [翻转(this.encCond(inner, 'if.not'))];
    }
    return [this.encCond(c, 'if')];
  }

  // for：{for:{kind,"mask","排除self"|"上界"},body} → For(cond=选择器) … EndFor
  //   kind 'range'=C式for(forV=0;V<N;V++) 定次循环：a=上界N，LoopI=comp[k]（批次A；10006/10125 形态）
  cmdFor(stmt, libK) {
    const sel = stmt.for;
    const cond = { kind: 'None', cmp: 'Eq', nameIdx: 0, a: 0, b: sel['排除self'] ? 1 : 0 };
    if (sel.kind === '全队') { cond.kind = 'SelMembers'; }
    else if (sel.kind === 'role') { cond.kind = 'SelRole'; let m = 0; for (const r of sel.mask) { const i = ROLE.indexOf(r); if (i < 0) throw new Error(`未知 role ${r}`); m |= (1 << i); } cond.a = m; }
    else if (sel.kind === 'element') { cond.kind = 'SelElement'; let m = 0; for (const e of sel.mask) { const i = ELEMENT.indexOf(e); if (i < 0) throw new Error(`未知元素 ${e}`); m |= (1 << i); } cond.a = m; }
    else if (sel.kind === 'range') {
      // 批次E-1a：支持起点下界（`for(V=1;V<5)` 10040 / `V=1;V<=2` 10140 已抽取器归一为 <3）：
        //   a=上界（不含），nameIdx=下界（含，默认 0；b 被排除self占用故下界存 nameIdx u16）
      const 下界 = sel.下界 || 0;
      if (!Number.isInteger(下界) || 下界 < 0 || 下界 > 4) throw new Error(`range 下界非法 ${下界}`);
      // 批次E-2c：上界放宽至 30——10165 `for(V=1;V<7)` 越界段 comp[5..6]=undefined，源码 for 体同样 comp[V]=undefined
      //   （引擎指令对 undefined 目标容错与源码逐位同崩/同跳过；忠实迭代次数，不截断）
      if (!Number.isInteger(sel.上界) || sel.上界 < 1 || sel.上界 > 30) throw new Error(`range 上界非法 ${sel.上界}（放宽至 30：越界段 comp[k]=undefined 与源码同语义）`);
      if (下界 >= sel.上界) throw new Error(`range 空区间 [${下界},${sel.上界})（源码空循环应直接不发 For）`);
      if (sel['排除self']) throw new Error('range 选择器不支持排除self（源码无此形态）');
      cond.kind = 'SelRange'; cond.a = sel.上界; cond.nameIdx = 下界;
    }
    else if (sel.kind === 'countLib') {
      // 批次E-1a：星级上界 `for(V=0;V<L+add;V++)`（10153 L+5）：a=偏移定点，执行期 n=ctx.lib+偏移
      if (sel['排除self']) throw new Error('countLib 选择器不支持排除self');
      cond.kind = 'SelCountLib'; cond.a = 定点(sel.偏移 || 0, 'countLib.偏移');
    }
    else if (sel.kind === 'list') {
      // for(x of [a,b,…])：a=打包下标（每槽 3bit×5，终止符 7）——源码全库唯一 [1,3]（10020/10039）
      if (!Array.isArray(sel.下标) || sel.下标.length < 1 || sel.下标.length > 5) throw new Error(`list 下标非法 ${JSON.stringify(sel.下标)}`);
      for (const x of sel.下标) if (!Number.isInteger(x) || x < 0 || x > 4) throw new Error(`list 元素越界 ${x}`);
      if (sel['排除self']) throw new Error('list 选择器不支持排除self（源码无此形态）');
      let packed = 0;
      sel.下标.forEach((x, i) => { packed |= (x & 7) << (i * 3); });
      packed |= 7 << (sel.下标.length * 3);   // 终止符槽=7（合法值域 0..4，7 不可能出现）
      cond.kind = 'SelList'; cond.a = packed;
    }
    else if (sel.kind === 'countRole' || sel.kind === 'countElement') {
      // 批次C-8：for(k=0;k<V;k++)，V=countCall绑定(含偏移)——a=role/element位集，b=偏移(定点)，执行期 count+偏移 次
      if (sel['排除self']) throw new Error('count 选择器不支持排除self（源码无此形态；b 字段被偏移占用）');
      if (sel.mask && sel.mask.some(x => typeof x !== 'string')) throw new Error('count 选择器 mask 非字面串');
      let m = 0;
      for (const s of sel.mask) { const i = (sel.kind === 'countRole' ? ROLE : ELEMENT).indexOf(s); if (i < 0) throw new Error(`count 未知 ${s}`); m |= (1 << i); }
      cond.kind = sel.kind === 'countRole' ? 'SelCountRole' : 'SelCountElement';
      cond.a = m; cond.b = 定点(sel.偏移 || 0, 'countFor.偏移');   // b 整体=偏移定点（计数选择不支持排除self，无 bit0 冲突；负偏移如 -1→-10000）
    }
    else if (sel.kind === 'countTemp') {
      // 批次C-9：上界=temp 快照变量（10192 stack快照 / 10201 getNest快照）：nameIdx=temp槽名字典idx，执行期取 ctx.tempVars[槽名] 次
      if (sel['排除self']) throw new Error('countTemp 选择器不支持排除self（源码无此形态）');
      cond.kind = 'SelCountTemp'; cond.nameIdx = this.dict.add(sel.temp);
    }
    else throw new Error(`for 未知选择器 ${sel.kind}`);
    this.emit(mkCmd(OP.For, 'None', [], cond));
    for (const s of stmt.body) this.compile(s, libK);
    this.emit(mkCmd(OP.EndFor, 'None', []));
  }

  // inject：InjectStart(方法,模式,tgt) → 快照段 → PhaseMark(0) → 前置 → PhaseMark(1) → 后置 → PhaseMark(2) → InjectEnd
  cmdInject(inj, libK) {
    const mid = METHOD_ID[inj.方法];
    if (mid === undefined) throw new Error(`inject 未知方法 ${inj.方法}`);
    const mode = MODE_ID[inj.模式];
    if (mode === undefined) throw new Error(`inject 未知模式 ${inj.模式}`);
    const { tgt, tgtN } = this.encTgt(inj.目标);
    this.emit(mkCmd(OP.InjectStart, tgt, [P('HookId', mid), P('ModeId', mode)], null, tgtN));
    for (const s of (inj.快照 || [])) this.compile(s, libK);
    this.emit(mkCmd(OP.PhaseMark, 'None', [P('PhaseId', 0)]));
    for (const s of (inj.前置 || [])) this.compile(s, libK);
    this.emit(mkCmd(OP.PhaseMark, 'None', [P('PhaseId', 1)]));
    for (const s of (inj.后置 || [])) this.compile(s, libK);
    this.emit(mkCmd(OP.PhaseMark, 'None', [P('PhaseId', 2)]));
    this.emit(mkCmd(OP.InjectEnd, 'None', []));
  }
}

// 具名旗标注册表（bit 分配；新增只追加，不改已分配的 bit —— flags 字节是 ABI）
const FLAG_BITS = { ArmorZero: 0, TurnHeal: 1, IsSealed: 2, BossDefOff: 3, NoCdChange: 4, StopCd: 5, HpUltDmg: 6, HpAtkDmg: 7, CanCdOn: 8, StopCdOff: 9, TurnHealOff: 10, CheckOn: 11, StackTrue: 12, StackFalse: 13, CheckOff: 14 };   // 批次C-10b：+TurnHealOff(10134)/CheckOn·CheckOff(10140)/StackTrue·StackFalse(10097 stack 布尔旗标，保留 true/false 型)

// 条件翻转（not 的落地：cmp 对偶翻转；HasTurnBuffType 的 not 同表适用）
function 翻转(cond) {
  const F = { Eq: 'Ne', Ne: 'Eq', Gt: 'Le', Le: 'Gt', Ge: 'Lt', Lt: 'Ge' };
  return { ...cond, cmp: must(F[cond.cmp], `无法翻转 cmp ${cond.cmp}`) };
}

// ---- 压平单个角色：src 对象 → CharacterRecord（flat JSON 形态）----
function 压平角色(src, dict, 引擎) {
  const 扁 = new 压平器(dict, 引擎);
  扁.flags = new Array(16).fill(0);
  // 装配期旗标：仅来自 src.旗标（case 顶层的 U.isSealed=true 等无条件字段，抽取器已收集）；
  // 钩子体内的 flag 指令是运行期语义（cmdFlag 不再置位）
  for (const 名 of (src.旗标 || [])) {
    const bit = FLAG_BITS[名];
    if (bit === undefined) throw new Error(`${src.id}: 未注册旗标 ${名}`);
    扁.flags[bit >> 3] |= (1 << (bit & 7));
  }
  // 钩子按固定顺序发 HookStart 分隔；缺省钩子不发（解释器知道缺省语义）
  for (let h = 0; h < HOOK_ORDER.length; h++) {
    const 指令列 = src.钩子 && src.钩子[HOOK_ORDER[h]];
    if (!指令列) continue;
    扁.emit(mkCmd(OP.HookStart, 'None', [P('HookId', h)]));
    for (const stmt of 指令列) 扁.compile(stmt, null);
  }
  // 基础字段：从 characterJson 取静态值（解释器只用 mnc/slotInit/exclTypes/flags/cmds；其余供 ML/审计）
  const 静 = 引擎.角色数据().getCharacter(src.id);
  if (!静) throw new Error(`characterJson 无 ${src.id}`);
  const 表 = 引擎.角色表();
  const seq = 表.findIndex(c => c && c.id === src.id) + 1;
  // mnc：机动性必填（setMnc 是伤害关键路径），缺失即拒收；批次E-4：**double 原值存储**（无定点）——
  //   源码 10173 含 FP 噪声字面量 298.20000000000005（噪声在小数第14位，定点×10⁴ 无法无损，
  //   mnc→u.ultMag 伤害路径 + C层状态diff 必须 bit-exact）；double 往返无损覆盖全部 191 角色
  if (!Array.isArray(src.机动性) || src.机动性.length !== 10) throw new Error(`${src.id}: 机动性 必须 10 槽`);
  const mnc = src.机动性.map(x => { if (typeof x !== 'number' || !isFinite(x)) throw new Error(`${src.id}: 机动性非法数值 ${x}`); return x; });
  // slotInit：未声明 slot = INT_MIN 哨兵；声明 stack:0 → slotInit[0]=0（装配时 u.stack=0 立即生效）
  const slotInit = [ -2147483648, -2147483648, -2147483648, -2147483648 ];
  for (const [名, 初] of Object.entries(src.槽位初值 || {})) {
    const s = SLOT_NAME[名];
    if (s === undefined) throw new Error(`${src.id}: 未知槽位名 ${名}`);
    slotInit[s] = 定点(初, `${src.id}.槽位初值.${名}`);
  }
  const excl = src.排除伤害 || [];
  if (excl.length > 4) throw new Error(`${src.id}: 排除伤害 超 4（schema exclTypes[4]，需扩 schema 报告）`);
  const exclTypes = [0, 0, 0, 0];
  excl.forEach((t, i) => { exclTypes[i] = dict.add(t); });
  return {
    id: src.id, rarity: 静.rarity | 0, element: 静.element | 0, role: 静.role | 0,
    cd: 静.cd | 0, hp: 静.hp | 0, atk: 静.atk | 0, atkMag: 静.atkMag | 0, ultMag: 静.ultMag | 0,
    seq: seq < 0 ? 0 : seq,
    usedCmds: 扁.cmds.length, exclCount: excl.length, _pad3: 0,
    exclTypes, mnc, slotInit, flags: 扁.flags,
    cmds: 扁.cmds.concat(Array.from({ length: K_CMD - 扁.cmds.length }, () => mkCmd('Nop', 'None', []))),
  };
}

// ---- 字典持久化：names.txt 只追加不改序 ----
const NAMES_TXT = path.join(D, 'names.txt');
function 读字典() {
  const dict = new 字典();
  if (fs.existsSync(NAMES_TXT)) {
    const 行 = fs.readFileSync(NAMES_TXT, 'utf8').split('\n');
    for (const s of 行) if (s !== '') dict.add(s);
  }
  return dict;
}
function 写字典(dict) {
  fs.writeFileSync(NAMES_TXT, dict.list.join('\n') + (dict.list.length ? '\n' : ''), 'utf8');
}

const SCHEMA_VERSION = 1;   // 与 schema.fbs 语义版本一致；bump 时解释器拒读旧 bin

module.exports = {
  OP, OP_NAME, TAG, TGT, CK, CMP, ELEMENT, ROLE, HOOK_ORDER, METHOD_ID, MODE_ID, FLAG_BITS, K_CMD, SLOT_NAME,
  字典, 定点, must, None, P, PADN, C0, mkCmd, 压平器, 压平角色, 读字典, 写字典, 翻转, D, SRC, BUILD, NAMES_TXT, SCHEMA_VERSION,
};

// ---- 以下为 CLI 入口（require 本文件时不执行，作为脚本运行时才跑）----
if (require.main === module) {
  const 引擎 = require(path.join(D, '..', '引擎适配.js'));
  const args = process.argv.slice(2);
  const 编bin = args.includes('--bin');
  const idFilter = args.filter(a => /^\d+$/.test(a)).map(Number);
  // --srcDir 指定源目录（默认 src；重建验证时用 生成/ 直接压平抽取表）
  const iSrc = args.indexOf('--srcDir');
  const srcDir = iSrc >= 0 ? path.resolve(D, args[iSrc + 1]) : SRC;
  // 载入既有角色（保证字典只追加不改序）；只收数字 id 文件（排除 _残差报告.json 等下划线前缀）
  let files = fs.readdirSync(srcDir).filter(f => /^\d+\.json$/.test(f)).sort().map(f => path.join(srcDir, f));
  if (idFilter.length) files = files.filter(f => idFilter.includes(Number(path.basename(f, '.json'))));
  const dict = 读字典();
  const records = [];
  for (const f of files) {
    const src = JSON.parse(fs.readFileSync(f, 'utf8'));
    const rec = 压平角色(src, dict, 引擎);
    records.push(rec);
    console.log(`${path.basename(f)}: id=${rec.id} usedCmds=${rec.usedCmds}/${K_CMD} excl=${rec.exclCount}`);
  }
  const flat = { version: SCHEMA_VERSION, charCount: records.length, records, names: dict.list };
  const flatPath = path.join(BUILD, 'flat.json');
  fs.writeFileSync(flatPath, JSON.stringify(flat));
  写字典(dict);
  console.log(`\n→ ${flatPath} (${fs.statSync(flatPath).size} 字节)，${records.length} 角色，字典 ${dict.list.length} 项 → names.txt`);
  if (编bin) {
    const { execFileSync } = require('child_process');
    const FLATC = path.join(D, 'tools', 'flatc.exe'), SCHEMA = path.join(D, 'schema.fbs');
    execFileSync(FLATC, ['-o', BUILD, '--binary', '--strict-json', '--no-warnings', SCHEMA, flatPath], { stdio: 'inherit' });
    // flatc 输出名随输入名（flat.json→flat.bin）；重命名为机制表正式产物名（引擎适配默认读 mechanisms.bin）
    const out = path.join(BUILD, 'mechanisms.bin');
    fs.rmSync(out, { force: true });
    fs.renameSync(path.join(BUILD, 'flat.bin'), out);
    console.log(`→ build/mechanisms.bin (${fs.statSync(out).size} 字节)`);
  }
}
