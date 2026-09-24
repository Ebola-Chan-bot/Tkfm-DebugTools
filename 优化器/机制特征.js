'use strict';
/*
 * 机制特征（阶段 5.1）：从机制表 bin（build/mechanisms.bin，191 角色数据化收官态）
 * 提取每角色的高维机制画像，供 难例特征分级 / 束精修闸门 / 条件化填充 使用。
 *
 * ## 为什么需要（施工计划 阶段5 动机）
 * 静态 5 字段特征（role/cd/ultMag/atkMag）把 칼리버(100%) 与 얀코D(71.5%) 判成完全相同的队，
 * 但二者难度差异全部藏在 setDefault 硬编码机制里（叠层门控/函数注入/点灯时序）。机制表数据化后
 * 这些机制第一次变成**可静态扫描的数据**：本模块把 64 种 op 的指令流折叠成 ~60 维特征向量。
 *
 * ## 特征语义（每角色一条记录）
 * 伤害通道（引擎 getUltDmg/getAtkDmg 公式的 li 索引位，23 种 txts 类型）：
 *   궁通道 = [2 받뎀증, 5 궁뎀증, 6 받궁뎀, 9 가뎀증, 10 속뎀증, 11 받속뎀, 13 받직뎀, 14 받캐뎀, 22 방뎀증]
 *   평通道 = [2 받뎀증, 3 일뎀증, 4 받일뎀, 9 가뎀증, 13 받직뎀, 14 받캐뎀]
 *   攻击面板 = [0 공퍼증, 1 공고증]（getCurAtk 乘/加算）
 * 供给向量（按挂载目标分三路累加 size 百分点）：
 *   授队[23] = 挂给 All/LoopI/LoopUp/CompN/LowestHp/Team 目标的 size 和（对队友生效的供给）
 *   授自[23] = 挂给 Self 的 size 和
 *   授Boss[23] = 挂给 Boss 的 size 和（받X 系减益实际挂 boss，如 받뎀증 = boss 受伤增加）
 *   ※ 引擎口径：受击类"받X"buff 挂在 boss 上生效于全队伤害取用（getBuffSizeList 会并入 boss.li）；
 *     授予类（공퍼증/궁뎀증/아머等）挂单位自身。三路分开存，队级合成时按语义取用。
 * 动态值旗标：size 为 atkRef/slotRef/temp 表达式（非 Fix 常数）→ 该供给"随状态成长"，静态值低估。
 * 时序/门控特征（决定"早放궁是否浪费"，即同步难度根因）：
 *   注入数 = InjectStart 条数（函数注入型机制，승나미 三档点灯即此）
 *   门控数 = cond.kind ∈ {CmpSlot,CmpNest,CmpNestByType,CmpTemp,CmpBuffSize} 的指令数
 *            （buff 要"点亮/叠够层"才生效 → 供给是延期的、成长型的）
 *   周期数 = CmpGTModGated/CmpGTMod（回合取模周期 buff：错过窗口要再等 CD）
 *   CD操纵数 = CdChange/AddCd/SetCd/AddCurCd/SetCurCd/ClampCurCd/ClampCurCdToCd（궁 节奏被改写）
 *   点灯开关数 = SetBuffOn/SetBuffOnAll/SetBuffOnExtra/SetBuffSize/SetBuffSizeAll（buff on/size 运行时翻转）
 *   治疗/护盾 = Heal/Heal2/Heal3/HpUpAll/HpUpMe/ArmorUp（궁 无对外伤害价值的证据）
 *   叠层挂载数 = SetBuffNest/BuffNestByType/SetSlotFromNest（nest 成长型 buff）
 * 结构特征：usedCmds、旗标位数（flags 非零 bit 数）、槽位计数器数（slotInit 非 -2^31 槽数）
 *
 * ## 队级合成（同步画像v2）
 * 对一支队伍：
 *   딜궁关键供给 = Σ(授队+授Boss 中 궁通道类型的 size)（=  딜궁能吃到多少增伤）
 *   门控供给占比 = 门控/注入/点灯型角色的 궁通道供给 ÷ 总궁通道供给（高 = 供给"要等才到位"）
 *   → 分级从"静态 buff 窗口密度"升级为"机制推导的供给-时序"判据（칼리버 vs 얀코D 可分的根源）。
 */
const 适配 = require('./引擎适配.js');

// 引擎伤害通道的 txts 类型名（deobfuscated.js L684，与 getBuffSizeList 的 li 索引一一对应）
const TXTS = ['공퍼증', '공고증', '받뎀증', '일뎀증', '받일뎀', '궁뎀증', '받궁뎀', '발뎀증', '받발뎀', '가뎀증',
  '속뎀증', '받속뎀', '발효증', '받직뎀', '받캐뎀', '아머', '가아증', '받아증', '받지뎀', '속상감', '가지증', '방경감', '방뎀증'];
const TXTS索引 = new Map(TXTS.map((t, i) => [t, i]));

// getUltDmg 系数取用的 li 索引（deobfuscated.js getUltDmg/ultAddCoef：1+li[2] / 1+li[5]+li[6]+li[13]+li[14]+li[22] / 1+li[9] / 1+li[10]+li[11]）
const 궁通道 = [2, 5, 6, 9, 10, 11, 13, 14, 22];
// getAtkDmg 系数取用的 li 索引（1+li[2] / 1+li[3]+li[4]+li[13]+li[14]+li[22] / 1+li[9] / 1+li[10]+li[11]）
const 평通道 = [2, 3, 4, 9, 10, 11, 13, 14, 22];
// getCurAtk 攻击面板（atk×(1+li[0])+li[1]）
const 面板通道 = [0, 1];

// buff 挂载 op → 授 Boss 目标语义按 tgt 字段判，不在此表
const 挂载OP = new Set(['Tbf', 'Nbf', 'Anbf', 'Atbf', 'Ptbf', 'Pnbf', 'Buff']);
// 门控条件（buff 生效需要 slot/nest/temp 达成 → 供给延期成长）
const 门控COND = new Set(['CmpSlot', 'CmpNest', 'CmpNestByType', 'CmpTemp', 'CmpBuffSize', 'CmpSlotIn']);
// 周期条件（回合取模 → 错过窗口等下一周期）
const 周期COND = new Set(['CmpGTModGated', 'CmpGTMod']);
// CD 操纵 op
const CD_OP = new Set(['CdChange', 'AddCd', 'SetCd', 'AddCurCd', 'SetCurCd', 'ClampCurCd', 'ClampCurCdToCd']);
// buff 运行时开关 op
const 开关OP = new Set(['SetBuffOn', 'SetBuffOnAll', 'SetBuffOnExtra', 'SetBuffSize', 'SetBuffSizeAll', 'SetBuffSizeUp', 'SpliceFirstBuffOn', 'KeepOnlyLastBuff']);
// 治疗/护盾 op
const 治疗OP = new Set(['Heal', 'Heal2', 'Heal3', 'HpUpAll', 'HpUpMe', 'ArmorUp', 'Bless']);
// 叠层 op
const 叠层OP = new Set(['SetBuffNest', 'BuffNestByType', 'SetSlotFromNest', 'AddSlot', 'SetSlot', 'ClampSlot']);
// 动态 size 的参数标签（非 Fix 常数 = 随状态成长，静态提取给下界）
const 动态TAG = new Set(['ExprAtkRef', 'ExprHp', 'ExprSize', 'ExprNestByType', 'ExprAtkComp', 'SlotRef', 'TempRef', 'TempVal', 'CountVal', 'NaNVal']);

// ---- 指令流展开（lib=5 档）----
/*
 * 压平器线性化规则（flatten_core.js）：钩子按 HOOK_ORDER 发 HookStart(h) 分隔；if/elif/else→If…EndIf；
 * for→For…EndFor；perLib→每档 LibIf(k*10000)…EndIf。静态扫描无法解运行时条件 → If/For 块内指令
 * 保守保留（宁可高估供给面，不低估门控复杂度）；LibIf 块只保留 lib5（Fix=50000），其余档整块跳过。
 * 返回 [{op, tgt, condKind, ps}] 的浅层数组（只留扫描需要的字段，避免 191×256 全量对象常驻）。
 */
function 展开lib5(cmds) {
  const out = [];
  let 跳过嵌套 = -1;   // -1 = 不在跳过块内；>=0 = 块内嵌套计数（0 层时遇 EndIf/EndFor 即出块）
  const 开块 = op => op === 'If' || op === 'For' || op === 'LibIf';
  const 闭块 = op => op === 'EndIf' || op === 'EndFor';
  for (const c of cmds) {
    if (c.op === 'Nop') continue;
    if (跳过嵌套 >= 0) {
      // 非 lib5 的 LibIf 块内：数嵌套，遇配平闭块出块
      if (开块(c.op)) 跳过嵌套++;
      else if (闭块(c.op)) { if (跳过嵌套 === 0) 跳过嵌套 = -1; else 跳过嵌套--; }
      continue;
    }
    if (c.op === 'LibIf') {
      const k = c.ps[0] ? c.ps[0].i : 0;   // 定点 = 档位×10000
      if (k !== 50000) { 跳过嵌套 = 0; continue; }   // 进入 lib1~4 块 → 整块跳过
      // lib5 块：保留块体指令，吃掉 LibIf/EndIf 包装本身（静态扫描不需要档位标记）
      continue;
    }
    out.push(c);
  }
  return out;
}

// ---- 单角色画像 ----
function 角色画像(rec, names) {
  const 展开 = 展开lib5(rec.cmds);
  const 授队 = new Float64Array(23), 授自 = new Float64Array(23), 授Boss = new Float64Array(23);
  let 动态供给数 = 0, 注入数 = 0, 门控数 = 0, 周期数 = 0, CD操纵数 = 0, 开关数 = 0, 治疗数 = 0, 叠层数 = 0;
  let 궁挂载数 = 0, 평挂载数 = 0, 방挂载数 = 0;   // 발동/추가 挂到动作事件的 buff 数（近似：挂载 op 的总面）

  for (const c of 展开) {
    const ck = c.cond ? c.cond.kind : 'None';
    if (门控COND.has(ck)) 门控数++;
    if (周期COND.has(ck)) 周期数++;
    if (CD_OP.has(c.op)) CD操纵数++;
    if (开关OP.has(c.op)) 开关数++;
    if (治疗OP.has(c.op)) 治疗数++;
    if (叠层OP.has(c.op)) 叠层数++;
    if (c.op === 'InjectStart') 注入数++;

    if (!挂载OP.has(c.op)) continue;
    // 类型：第一个 TypeIdx 参数 → names 字典
    let typeIdx = -1, size = 0, 有动态 = false;
    for (const p of c.ps) {
      if (p.tag === 'None') continue;
      if (p.tag === 'TypeIdx' && typeIdx < 0) { const name = names[p.i]; const ti = TXTS索引.get(name); if (ti !== undefined) typeIdx = ti; continue; }
      if (p.tag === 'Fix') { if (size === 0) size = p.i / 1e4; continue; }   // 第一个 Fix 视为 size（tbf/nbf 族 ps[1]），turn/nest 在其后
      if (动态TAG.has(p.tag)) { 有动态 = true; }
    }
    if (typeIdx < 0) { if (有动态) 动态供给数++; continue; }   // 非 txts 伤害类（도트뎀/힐/발동标记等）不计入供给
    if (有动态) 动态供给数++;
    const 负 = size < 0 ? -1 : 1;   // 负 size（debuff 削减）按原值累加
    const 目标三 = c.tgt === 'Boss' ? 授Boss : (c.tgt === 'Self' ? 授自 : 授队);
    目标三[typeIdx] += size;
    // 挂载事件面统计（tgtN/act 位不展开，只按 op 前缀分：atbf/anbf=행동발동 类不细分，全部计入"挂载总数"）
    궁挂载数 += 0; 평挂载数 += 0; 방挂载数 += 0;   // 预留（当前分级不用动作位，保持字段存在）
  }

  let 旗标位 = 0;
  for (let b = 0; b < 16; b++) { let v = rec.flags[b]; while (v) { 旗标位 += v & 1; v >>= 1; } }
  let 槽位数 = 0;
  for (const s of rec.slotInit) if (s !== -2147483648) 槽位数++;

  return {
    id: rec.id, role: rec.role, cd: rec.cd, atk: rec.atk, atkMag: rec.atkMag, ultMag: rec.ultMag,
    授队, 授自, 授Boss,
    供给动数: 动态供给数,
    注入数, 门控数, 周期数, CD操纵数, 开关数, 治疗数, 叠层数,
    旗标位, 槽位数, usedCmds: rec.usedCmds,
    // 派生标量（队级合成直接用）
    궁供给队: 궁通道.reduce((s, i) => s + (授队[i] > 0 ? 授队[i] : 0), 0),
    궁供给Boss:궁通道.reduce((s, i) => s + (授Boss[i] > 0 ? 授Boss[i] : 0), 0),
    궁供给自: 궁通道.reduce((s, i) => s + (授自[i] > 0 ? 授自[i] : 0), 0),
    평供给队: 평通道.reduce((s, i) => s + (授队[i] > 0 ? 授队[i] : 0), 0),
    평供给Boss: 평通道.reduce((s, i) => s + (授Boss[i] > 0 ? 授Boss[i] : 0), 0),
    面板供给队: 面板通道.reduce((s, i) => s + (授队[i] > 0 ? 授队[i] : 0), 0),
    面板供给自: 面板通道.reduce((s, i) => s + (授自[i] > 0 ? 授自[i] : 0), 0),
  };
}

// ---- 缓存与访问 ----
let _画像表 = null;   // Map(id → 画像)
function 全部画像() {
  if (_画像表) return _画像表;
  const { records, names } = 适配.机制数据();
  _画像表 = new Map();
  for (const rec of records) _画像表.set(rec.id, 角色画像(rec, names));
  return _画像表;
}
function 画像(id) { return 全部画像().get(id) || null; }

/*
 * 角色是否"延迟型供给者"：其 궁通道供给显著依赖 门控/注入/叠层/开关（要点亮、要叠层、要等注入时机）。
 * 승나미 10177（注入3档点灯+stack门控）→ true；칼리버系（纯 tbf 挂载、无门控）→ false。
 * 判据（机制推导，非阈值拍脑袋）：궁通道有对外供给(>0) 且 复杂度信号(注入+门控+叠层+开关)≥2。
 *复杂度信号≥2 而非≥1：单发 SetBuffOn 点灯很常见（50 防守名单角色大量有），叠加多信号才是"成长型供给"。
 */
function 是延迟供给者(id) {
  const f = 画像(id);
  if (!f) return false;
  const 对外궁공급 = f.궁供给队 + f.궁供给Boss;
  if (对外궁공급 <= 0) return false;
  return (f.注入数 + f.门控数 + f.叠层数 + f.开关数) >= 2;
}

/*
 * 队级检测：是否需要"伤害궁相位规划"（保守回退的触发闸）。
 *
 * 判据：队内存在 **CD 节奏改写者**（机制表 注入数>0 或 CD操纵数>0）→ 伤害궁的实际就绪周期与名义 cd 不符，
 *   "就绪即放"可能把궁锁死在错误相位。
 *
 * 实证（_诊断I / _实验G / _实验I / _实验J，8 队 benchmark 两支 88% 队 10197,10152,10096,10193,10147 与
 *   10197,10096,10134,10193,10147，机制复杂度 73 = 8 队最高）：
 *   10197（注入4）每行动给队友降 1 CD → 位4=10193（탱커伤害궁，名义 cd4）实际每 ~3 回合就绪 →
 *   即放/sync 填充都从 t1 起开火，궁 锁死 t1/t4/t7/t10/t13 相位（4 次落在无 buff 回合孤立释放，近零伤）；
 *   DB 只把**首发推迟 1 回合**→ t2/t5/t9/t13，其中 t5/t9/t13 正是 buff 齐射回合（3 次吃满 buff），
 *   次数少（4<5）反而总伤高 3.6G（缺口 3.58G 中 t9 单回合占 2.31G）。
 *   rollout 填充是 reactive 的，规划不了"少放一次以对齐三次齐射"；束宽（实验E）、编辑球邻域（实验H，
 *   r=2/8450 候选）、评分 max 聚合（实验J，去 max 用纯 sync 反而更低）全部无效。
 *
 * 为什么判据可以宽松（宁可过度触发）：本检测只用来**开启保守回退**——回退是"延迟档位小家族 × 真值重放"，
 *   成本 ~0.3s/队（远小于束搜索 ~20s），且结果与束搜索结果按**真值**取优，故过度触发零风险、零回退。
 * 全库命中面：有注入 27 角色 + 有 CD操纵 角色 → 多数强队会触发（含승나미 10177），符合保守原则。
 */
function 需相位规划(ids) {
  for (const id of ids) {
    const f = 画像(id);
    if (f && (f.注入数 > 0 || f.CD操纵数 > 0)) return true;
  }
  return false;
}

/*
 * 队级检测：是否需要"窗对齐构造"兜底（排程器.窗对齐构造 的触发闸）。
 *
 * 判据：队内存在 **周期窗供给者**（机制表周期数>0，即 CmpGTMod(Gated) 条件——buff/增伤按 (t+off)%mod=rem
 *   的机制周期窗发放）**且** 存在 **CD 改写者**（注入数>0 或 CD操纵数>0——队友궁的名义 cd 失真，
 *   节拍对齐构造 T=max(名义cd) 必然错位）。二者同场 = DB 最优解大概率是"机制周期窗齐射"结构，
 *   而既有构造器（相位对齐=reactive buff判据 / 节拍对齐=名义cd节拍）双双失准。
 *
 * 实证（2026-09-24 Top200 benchmark + _实验M2窗对齐.js）：
 *   最差队 얀코덱[10197,10060,10177,10193,10208] 终 85.16%——10177(승나미) turnstart (t-1)%3=0 Gated
 *   周期窗（周期数>0），10197(얀코) 注入型每궁降队友3CD + 10060 降1CD（注入数4）；
 *   窗对齐构造 S={1,4,7,10,13}(周期窗{4,7,10,13}+首发) + buff窗憋 → 构造相位与 DB 逐位一致，
 *   爬山 → 100.04%（+14.88pp）。垫底 8 队（85~93%）全部含 10177/10197 组合，全命中本闸门。
 *   对照：칼리버/후지카 等纯节拍队（无周期供给者）不触发，零额外成本。
 *
 * 成本边界：窗对齐全族扫描（~32 S × 2 buff策略 ≈ 64 构造 × 5.5ms ≈ 0.4s）+ TopK 爬山。
 *   闸门双条件（周期 ∧ CD改写）比 需相位规划（Top200 全命中、已失效）精确得多，海量名单场景可承受。
 */
function 需窗规划(ids) {
  let 有周期 = false, 有CD改写 = false;
  for (const id of ids) {
    const f = 画像(id);
    if (!f) continue;
    if (f.周期数 > 0) 有周期 = true;
    if (f.注入数 > 0 || f.CD操纵数 > 0) 有CD改写 = true;
    if (有周期 && 有CD改写) return true;
  }
  return false;
}

module.exports = { TXTS, 궁通道, 평通道, 面板通道, 全部画像, 画像, 是延迟供给者, 需相位规划, 需窗规划, 展开lib5 };
