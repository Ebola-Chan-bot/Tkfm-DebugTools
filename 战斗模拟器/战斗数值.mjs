// 战斗数值.mjs —— 核心数值内核，对应原包 BattleCalculator 的纯公式层。
// 本模块只做数学：输入「增益槽」（由战斗引擎从各角色增益数组聚合而来）与基础数值，输出伤害/治疗/护盾结算量。
// 不含任何角色、技能、关卡特例，也不读写战斗状态；数据与引擎的分离正是原包 BattleCalculator 与 BattleSys 的分界。
//
// 公式来源：从天下布魔 2.3.0 APK（IL2CPP）反汇编的 BattleCalculator.GetDamageValue / GetHealValue / GetShieldValue
// 及各 GetXxxBonusRate 逐条反推，见 战斗引擎提取/全自动测试/battle_asm/。取整时点、钳制上下限均按汇编逐条对齐。

// ── 取整与钳制 ─────────────────────────────────────────────────────────────
// IL2CPP 的 double→int64 是向 −∞ 取整（frintm+fcvtms）；溢出到 +∞ 时 conv 哨兵为 INT64_MIN，随后被钳制吸收。
const 溢出哨兵 = -9223372036854775808n;

function 向下取整(数值) {
    if (!Number.isFinite(数值)) return 溢出哨兵;
    return BigInt(Math.floor(数值));
}

function 钳制整数(值, 下限, 上限) {
    if (值 < BigInt(下限)) return BigInt(下限);
    if (值 > BigInt(上限)) return BigInt(上限);
    return 值;
}

// 各增益率统一的下限钳制：多数 GetXxxBonusRate 末尾 max(·, −1)，保证对应乘区 (1+率) ≥ 0。
function 增益率(值) {
    return Math.max(-1, Number(值) || 0);
}

// ── 增益率取值（对应 BattleCalculator.GetXxxBonusRate）──────────────────────────
// 每个函数只做「取槽值 + 钳制」，槽值由引擎侧聚合提供；这里保持与汇编一致的钳制边界。

export function 造成伤害加成(攻槽) {
    return 增益率(攻槽.造成伤害);
}

export function 受到伤害加成(守槽) {
    return 增益率(守槽.受到伤害);
}

// GetDefendRate：仅当防御键激活时返回配置换算率，否则 0。
export function 防御减伤率(守槽) {
    return 守槽.防御作用中 ? 增益率(守槽.防御减伤率) : 0;
}

// GetDefendBonusRate：clamp 到 [−0.5, +0.25]，且仅在防御键激活时生效。
export function 防御加成(守槽) {
    if (!守槽.防御作用中) return 0;
    return Math.max(-0.5, Math.min(0.25, Number(守槽.防御加成) || 0));
}

// GetBreakRate：破防键激活时的配置率，否则 0。
export function 破防率(守槽) {
    return 守槽.破防作用中 ? 增益率(守槽.破防率) : 0;
}

// GetBreakBonusRate：攻−守破防加成之差，钳制下限 −0.25。
export function 破防加成(攻槽, 守槽) {
    if (!守槽.破防作用中) return 0;
    return Math.max(-0.25, (Number(攻槽.破防加成) || 0) - (Number(守槽.破防加成) || 0));
}

// GetPropertyRate：返回克制率（+0.5 克制 / −0.25 被克 / 0），并把克制类别写入 out（1=无关/同, 2=克制, 0=被克）。
export function 属性克制率(攻槽, 守槽, 收集类别 = null) {
    const 克制 = { 火: '风', 风: '水', 水: '火', 光: '暗', 暗: '光' };
    const 攻 = 攻槽.属性, 守 = 守槽.属性;
    if (!攻 || !守) { if (收集类别) 收集类别.类别 = 1; return 0; }
    if (克制[攻] === 守) { if (收集类别) 收集类别.类别 = 2; return 0.5; }
    if (['火', '水', '风'].includes(攻) && 克制[守] === 攻) { if (收集类别) 收集类别.类别 = 0; return -0.25; }
    if (收集类别) 收集类别.类别 = 1;
    return 0;
}

// GetPropertyBonusRate：攻守双方属性加成之和，钳制下限 −1。
export function 属性加成(攻槽, 守槽) {
    return 增益率((Number(攻槽.属性加成) || 0) + (Number(守槽.属性加成) || 0));
}

// GetPropertyDamageRate：按攻击方属性索引的「属性受击加成」，钳制下限 −1。
export function 属性受击加成(攻槽, 守槽) {
    return 增益率(守槽.属性受击加成?.[攻槽.属性] ?? 0);
}

// GetOtherBonusRate：按效果大类门控的「其他加成」成对槽（攻+守相加），钳制下限 −1。
export function 其他加成(攻槽, 守槽, 类别) {
    return 增益率(守槽.其他加成?.[类别] ?? 0);
}

export function 治疗加成(施槽) {
    return 增益率(施槽.治疗加成);
}

export function 被治疗加成(受槽, 持续型) {
    return 增益率((Number(受槽.被治疗加成) || 0) + (持续型 ? Number(受槽.持续被治疗加成) || 0 : 0));
}

export function 治疗其他加成(施槽, 受槽, 类别) {
    return 增益率(受槽.治疗其他加成?.[类别] ?? 0);
}

export function 护盾加成(施槽) {
    return 增益率(施槽.护盾加成);
}

export function 被护盾加成(受槽) {
    return 增益率(受槽.被护盾加成);
}

export function 护盾其他加成(施槽, 受槽, 类别) {
    return 增益率(受槽.护盾其他加成?.[类别] ?? 0);
}

// ── 值计算（对应 GetDamageValue / GetHealValue / GetShieldValue）────────────────────

// 伤害：真伤与普伤分支。真伤只乘「1−防御减伤率−防御加成」一个乘区；普伤乘 F1..F9 全链后只向下取整一次，再走尾段（伤害变化率+固定增减），最终钳 [0, INT32_MAX]。
export function 计算伤害值(入) {
    const { 基础值, 倍率 = 1, 变化率 = 0, 固定增减 = 0, 攻槽, 守槽, 类别 = 1, 真实 = false, 首领减伤 = 0, 收集类别 = null } = 入;
    const 基础 = Number(基础值) * Number(倍率);

    if (真实) {
        // 真伤 = max(0, ⌊基础 × (1 − 防御减伤率 − 防御加成)⌋)；不封顶 INT32。
        const 防御区 = 1 - 防御减伤率(守槽) - 防御加成(守槽);
        const 值 = 向下取整(基础 * 防御区);
        return Number(值 < 0n ? 0n : 值);
    }

    // F1 = 1 + max(变化率, −1)：变化率是技能效果自带的伤害变化（易伤/减伤），下限 −100%。
    const F1 = 1 + 增益率(变化率);
    // F2 = 1 + 其他加成：按效果大类门控的成对增益槽（职业易伤/来源易伤等），未接入数据时为 0。
    const F2 = 1 + 其他加成(攻槽, 守槽, 类别);
    // F3 = 1 + 属性克制率 × (1 + 属性加成)。
    const F3 = 1 + 属性克制率(攻槽, 守槽, 收集类别) * (1 + 属性加成(攻槽, 守槽));
    // F4 = 1 + 破防率 + 破防加成。
    const F4 = 1 + 破防率(守槽) + 破防加成(攻槽, 守槽);
    // F5 = 1 + 属性受击加成（按攻击方属性索引守方槽）。
    const F5 = 1 + 属性受击加成(攻槽, 守槽);
    // F6 = 1 − 防御减伤率 − 防御加成。
    const F6 = 1 - 防御减伤率(守槽) - 防御加成(守槽);
    // F7 = 1 + 造成伤害加成。
    const F7 = 1 + 造成伤害加成(攻槽);
    // F8 = 1 + 受到伤害加成 − 首领减伤（首领减伤为关卡配置，等价于把减伤并入受到伤害槽）。
    const F8 = 1 + 受到伤害加成(守槽) - (Number(首领减伤) || 0);
    // F9 = 1 + PvP受伤加成（PVE 恒 0）。
    const F9 = 1 + 增益率(守槽?.PvP受伤加成 ?? 0);

    const 乘区 = [F1, F2, F3, F4, F5, F6, F7, F8, F9];
    const 乘积 = 乘区.reduce((积, 项) => 积 * Math.max(0, 项), 1);
    const D = 向下取整(基础 * 乘积);

    // 尾段：result = clamp(fixedAdd + ⌊(1 + 伤害变化率) × D⌋, 0, INT32_MAX)。
    // 伤害变化率规则来自目标的阈值规则表（GetDamageChangeRate），未接入时为 0。
    const 伤害变化率 = 增益率(守槽?.伤害变化率 ?? 0);
    const 尾段 = BigInt(向下取整(Number(1 + 伤害变化率) * Number(D))) + BigInt(Math.trunc(Number(固定增减) || 0));
    return Number(钳制整数(尾段, 0, 2147483647));
}

// 治疗：真疗 = max(0, ⌊值×倍率⌋)；普疗 = max(0, ⌊值×倍率×(1+变化率)×(1+治疗加成)×(1+被治疗加成)×(1+治疗其他)×(1+PvP被治疗)⌋)。
// 无防御区、无尾段，F1 不做 −1 下限钳制。单次向下取整，≥0 不封顶。
export function 计算治疗值(入) {
    const { 基础值, 倍率 = 1, 变化率 = 0, 施槽, 受槽, 类别 = 1, 真实 = false, 持续型 = false, PvP被治疗加成 = 0 } = 入;
    const 基础 = Number(基础值) * Number(倍率);

    if (真实) {
        const 值 = 向下取整(基础);
        return Number(值 < 0n ? 0n : 值);
    }

    const 乘区 = [
        1 + (Number(变化率) || 0),
        1 + 治疗加成(施槽),
        1 + 被治疗加成(受槽, 持续型),
        1 + 治疗其他加成(施槽, 受槽, 类别),
        1 + 增益率(PvP被治疗加成),
    ];
    const 乘积 = 乘区.reduce((积, 项) => 积 * Math.max(0, 项), 1);
    const 值 = 向下取整(基础 * 乘积);
    return Number(值 < 0n ? 0n : 值);
}

// 护盾：⌊值×倍率×(1+变化率)×(1+护盾加成)×(1+被护盾加成)×(1+护盾其他)×(1+PvP被护盾)⌋。
// 单次向下取整，无任何下限/上限钳制——护盾值可为负，与伤害/治疗不同。
export function 计算护盾值(入) {
    const { 基础值, 倍率 = 1, 变化率 = 0, 施槽, 受槽, 类别 = 1, PvP被护盾加成 = 0 } = 入;
    const 基础 = Number(基础值) * Number(倍率);
    const 乘区 = [
        1 + (Number(变化率) || 0),
        1 + 护盾加成(施槽),
        1 + 被护盾加成(受槽),
        1 + 护盾其他加成(施槽, 受槽, 类别),
        1 + 增益率(PvP被护盾加成),
    ];
    const 乘积 = 乘区.reduce((积, 项) => 积 * Math.max(0, 项), 1);
    return Number(向下取整(基础 * 乘积));
}
