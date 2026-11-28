import 角色显示 from './角色显示.mjs';
import { 枚举, 枚举名, 易伤键, 来源易伤键, 登记语义名, 语义名, 模型版本, 水光易伤 } from './枚举.mjs';
import { 编译ELv技能, 获取适用ELv技能, 盘点ELv技能 } from './编译技能文本.mjs';
import { 原包机制, 原包角色表, 原包文本, 原包ELV, 原包角色文本, 原包潜力 } from './原包运行时.mjs';
export { 获取适用ELv技能 };

// 玩家技能原包模型：SkillGroup 组ID=角色编号×10+1+解放变体偏移（k=2/3 仅 16 角色有，无变体回退基础组 k=1；实证 2731 组分布 k1:2699/k2:16/k3:16）。槽1-5=必杀羠绊1-5档、槽6=普攻、槽7=队长、槽8-10=被动1-3；防御动作无技能槽（防御姿态为引擎原生机制，防御类触发在被动树内注册）。
// 被动需星=[3,4,5]（被动1/2/3 各自解锁星级）：BattleSys.SetTeamCharData(VA=0x80022af768 起) 与 SetEnemyCharData(+0x12d0) 对槽8-10逐一调需星getter(0x80028eb3a0)取全局3行表字节，nowRare<需星即 b.lo 跳过该被动；表值为NP运行时构造（b0^b1，静态Fields在堆外）无法从快照直读，数值依据=用户明示被动3需5星+敌方4星不启用被动3已实证（关卡数据.mjs 夏日面板）+SSR出生3星被动1生效（面板锚点），被动2=4星为中间档并经伤害锚点复核。
export const 被动需星 = [3, 4, 5];
// 必杀CD文本兜底：Skill_C 记录被"位≤5"消歧过滤的 CD>5 技能不在技能字典（10004/10005/10025 等 CD=6），从语言包文本（SkillStr）解析 CD 充当显示层冷却来源。
const 文本CD = 编号 => { const 说 = 原包文本.get(编号)?.[1] ?? ''; const m = 说.match(/CD\s*[:：]?\s*(\d+)/i) || 说.match(/冷[却卻]\s*[:：]?\s*(\d+)/) || 说.match(/(\d+)\s*回合/); return m ? Number(m[1]) : null; };
function 构建原包模型(单位) {
    const 解放 = Math.min(Math.max(单位.解放 ?? 0, 0), 2);
    const 槽 = 原包机制.技能组[(单位.编号 * 10) + 1 + 解放] ?? 原包机制.技能组[(单位.编号 * 10) + 1];
    if (!槽) return null;
    const 档 = Math.min(Math.max(单位.羁绊 ?? 5, 1), 5);
    const 引 = 编号 => 编号 ? [{ 类型: 枚举.原包技能, 编号 }] : [];
    // 必杀CD=Skill_C 记录+4 字段（原包机制.技能[..].位；双角色五档 diff 实证=冷却回合，"位≤5"过滤实为"CD≤5"）；机制链见 session 记忆 CD 终局条目。
    const 必杀技 = 原包机制.技能[槽[档 - 1]];
    const CD = 文本CD(槽[档 - 1]) ?? 必杀技?.位;
    // 被动星级门：槽7/8/9=被动1/2/3，星级不足需星即不装入初始列（等价原包 SetTeamCharData 的 b.lo 跳过），4星伊布力斯因此不执行被动3(14780)的攻击者监听授予链。
    const 星级 = 单位.星级 ?? 3;
    const 被动 = [槽[7], 槽[8], 槽[9]].flatMap((编号, 序) => 编号 && 星级 >= 被动需星[序] ? 引(编号) : []);
    // 潜力技能接入：PotentialUp PASSIVE 节点 val=1/2 解锁 基础组槽10+val 的潜力技能（兰儿12811攻击+10%与ELv40512叠成实测两层10%），无星级门、点出节点即生效；编号规律188/188 SSR文本全在（见 原包数据.mjs 潜力根注释）。潜力技能编号从基础组k1取，解放变体不影响。
    const 基础槽 = 原包机制.技能组[(单位.编号 * 10) + 1] ?? 槽;
    const 潜力技能 = 获取潜力养成(单位).潜力被动.flatMap(值 => 基础槽[9] && 原包机制.技能[基础槽[9] + 值] ? 引(基础槽[9] + 值) : []);
    return { 初始: 被动, 潜力技能, 队长: 引(槽[6]), 普攻: 引(槽[5]), 必杀: 引(槽[档 - 1]), 防御: [], ...(CD ? { 冷却: CD } : {}) };
}
export const 职业列表 = ['攻击者', '治疗者', '守护者', '辅助者', '妨碍者'];
export const 属性列表 = ['火', '水', '风', '光', '暗'];
export const 调教加成 = [0, 5, 15, 30];
// 普通等级上下限=UI 校验与默认值；每级倍率=成长公式系数，已由 Character_C 面板反推实证（基础×(1+0.2×星3)×1.1^(级-1)=资料站面板，10001/10006/10137 三例逐位一致）。
export const 普通等级最低 = 1;
export const 普通等级最高 = 60;
export const 每级倍率 = 1.1;
export const ELV突破档位 = 原包ELV.突破档位;
export const ELV技能解锁等级 = 原包ELV.技能解锁;

export function 获取潜力养成(单位) {
    const 表 = 原包潜力[获取真实角色(单位.编号)?.潜力类型];
    const 潜力等级 = 单位.潜力等级 ?? 12;
    const 潜力节点 = 单位.潜力节点 ?? Array(6).fill(true);
    if (!表 || !Number.isInteger(潜力等级) || 潜力等级 < 1 || 潜力等级 > 表.length) throw new Error('潜力等级须为 1 至 12');
    if (!Array.isArray(潜力节点) || 潜力节点.length !== 6 || 潜力节点.some(值 => typeof 值 !== 'boolean')) throw new Error('潜力须明确选择当前阶的六个节点');
    // 加成按原包基点（百分比×100 的 u16）整数累加：伊布力斯10151 潜6只点第5节点时 HP 合计 5750 基点=57.5%，旧浮点求和 0.575×100=57.4999… 再 Math.round 得 57%，面板 2051438；游戏实测 2057972 恰为 57.5% 入汇编浮点序的结果。
    const 加成 = { [枚举.潜力生命]: 0, [枚举.潜力攻击]: 0 };
    const 被动 = new Set();
    for (let 阶 = 0; 阶 < 潜力等级; 阶++) for (const [序, 节点] of 表[阶].entries()) {
        if (阶 === 潜力等级 - 1 && !潜力节点[序]) continue;
        if (节点.属性 === 枚举.潜力被动) 被动.add(节点.数值);
        else 加成[节点.属性] += 节点.基点;
    }
    return { 潜力等级, 潜力节点: [...潜力节点], 节点: 表[潜力等级 - 1], 生命加成: 加成[枚举.潜力生命] / 10000, 攻击加成: 加成[枚举.潜力攻击] / 10000, 生命百分比: 加成[枚举.潜力生命] / 100, 攻击百分比: 加成[枚举.潜力攻击] / 100, 潜力被动: [...被动], 可突破: 潜力等级 >= 6 || 潜力等级 === 5 && 潜力节点.every(Boolean) };
}

export function 计算调教面板(单位) {
    const 调教 = 单位.调教 ?? 3;
    const 星级 = 单位.星级 ?? 3;
    const 普通等级 = 单位.普通等级 ?? 普通等级最高;
    const ELV突破等级 = 单位.ELV突破等级 ?? 0;
    if (!Number.isInteger(调教) || 调教 < 0 || 调教 > 3) throw new Error('调教档位须为 0 至 3');
    if (!Number.isInteger(星级) || 星级 < 3 || 星级 > 5) throw new Error('SSR 星级须为 3 至 5');
    if (!Number.isInteger(普通等级) || 普通等级 < 普通等级最低 || 普通等级 > 普通等级最高) throw new Error('普通等级须为 1 至 60 的整数');
    if (!Number.isInteger(ELV突破等级) || !ELV突破档位[ELV突破等级]) throw new Error('ELV突破等级须为 0 至 20 的整数');
    if (ELV突破等级 > 0 && 普通等级 !== 60) throw new Error('ELV突破要求普通等级为60级');
    const 潜力 = 获取潜力养成(单位);
    if (ELV突破等级 > 0 && !潜力.可突破) throw new Error('ELV突破要求潜力5满或6以上');
    const 解放 = 单位.解放 ?? 0;
    const 档案 = 获取真实角色(单位.编号);
    if (!档案 || ![档案.初始生命, 档案.初始攻击].every(值 => Number.isFinite(值) && 值 > 0)) throw new Error('缺少角色真实初始属性');
    if (!Number.isInteger(解放) || 解放 < 0 || 解放 && !档案?.解放阶段.includes(解放)) throw new Error('角色没有该解放阶段');
    const 等级倍率 = 每级倍率 ** (普通等级 - 1);
    const 原 = 原包角色表.get(单位.编号);
    // 面板公式=TPlayerChar.GetHp(2参)@0x80028eae28 包装 bl 共享计算函数@0x80028eaea8（GetAtk 同构）汇编实证：float 前缀四乘槽按 0x80028eb0ac/c0/c8/d0 的 fmul 序=基础×潜力基点因子×解放百分比因子×调教百分比因子×ELV基点因子，其中潜力槽函数@0x80028ebd0c 遍历潜力节点表（stride 0x28、type==2 过滤）累加 u16 基点、系数 0.0001f，解放槽函数@0x80028eb8ac 按 char+0x50 三位标志（char+0x48 上限）查表累加 u8 百分比、系数 0.01f，调教槽@0x80028eb9e4 出 u8 百分比、系数 0.01f，ELV槽@0x80028ebf44(char,ELV等级) 出基点、系数 0.0001f（asm 中 s8=s11、s9=s10 为同两静态结构+0x44/+0x2c 各复制两次，故仅 0.0001f/0.01f 两常数）；fcvt d0,s0 转 double 后 ×Math.Pow(1.1double@0x8000c1f778, 级-1)@0x80043e1df0 再 ×星级因子 (1+0.2double@0x8000c1edd0×星)（ucvtf d3→fmul d3,d3,d5→fadd d1,d3,1.0，星级走 double 尾支不进 float 前缀），frintm/fcvtms 向下取整。旧"星→调→潜→ELV float 前缀+解放 double 尾"模型把星级/解放位置与精度都弄反了：达芙妮10184（4星调2潜9节点TTTFFF、ELV0、解放0、60级）旧模型 2385454.9715→2385454，游戏实测 2385455，新模型 2385455.0796→2385455 命中；八锚（达芙妮2385455/兔姬1651680/巴尔2879294/圣剑2222473/枪匠2870268/伊2057972+464127/毛毛3533589/尤妮思2343896）联立全过，满养成188角色仅天使长10007生命-1、偶像10026攻击-1（均无实测锚）。基点=百分比×100 的整数（潜力 u16 基点直接来自节点表累加，ELV/解放同口径），Math.round 还原浮点传输误差。
    const 面板值 = (基础, 属性, 潜力百分比) => {
        const f01 = 百分比 => Math.fround(Math.fround(Math.fround(0.01) * 百分比) + 1);
        const f0001 = 基点 => Math.fround(Math.fround(Math.fround(0.0001) * 基点) + 1);
        const 潜力基点 = Math.round(潜力百分比 * 100);
        const 解放百分比 = Math.round((档案.解放面板加成[解放] || 0) * 100);
        const ELV基点 = Math.round(ELV突破档位[ELV突破等级][属性] * 100);
        let 积 = Math.fround(Math.fround(基础) * f0001(潜力基点));
        积 = Math.fround(积 * f01(解放百分比));
        积 = Math.fround(积 * f01(调教加成[调教]));
        积 = Math.fround(积 * f0001(ELV基点));
        return Math.max(1, Math.floor(等级倍率 * 积 * (1 + 0.2 * 星级)));
    };
    return { 调教, 星级, 普通等级, ELV突破等级, 潜力等级: 潜力.潜力等级, 潜力节点: 潜力.潜力节点, 生命上限: 面板值(原.基础生命, '生命百分比', 潜力.生命百分比), 攻击: 面板值(原.基础攻击, '攻击百分比', 潜力.攻击百分比) };
}

// hpUpMe 的增益基准就是角色自身进场面板整数（原执行器语义 unit.hp += floor(unit.hp × pct)），不再为参考角色表另走一条基准。参考表路径曾让枪匠在四星调3潜力9节点TTFFTT、ELV20下得到2870266，比面板2870268低2，使最终生命算成4448914，而游戏真值为2870268+floor(2870268×0.55)=4448915。
export function 计算生命增益基准(单位) {
    return 计算调教面板(单位).生命上限;
}

export function 统一面板基准(单位) {
    const { 面板星级, 面板调教, 面板等级, 面板ELV, ...养成 } = 单位;
    return { ...养成, ...计算调教面板(单位) };
}


// 真实角色目录=显示残留（角色显示.mjs：名称/别名/潜力类型/解放/参考配置）+原包组装（Character_C 数值面板/Skill_C 冷却）。初始生命/攻击=基础×(1+0.2×初始星等)；参考面板=初始×1.1^(参考等级-1)（10001/10006/10137 三例反推实证）；稀有度按 Character_C u8@7=3 校验（188 条全对应）。
// 真实角色目录=别名残留（角色显示.mjs，Data-Room 社区昵称/多语言转写，用户许可）+全量原包组装：名称/全名/介绍=CharacterStr_sc（键=编号，全名拆末段）；稀有度/职业/属性/基础面板/潜力类型码=Character_C（55B：u8@7稀有度/@8属性/@9职业/u32@10基础生命/u32@18|22基础攻击/u8@49=potentialID）；冷却=Skill_C 位（CD）文本兜底；潜力类型码1=ATTACK/2=BALANCE/3=DEFENCE（=PotentialUp 组id）；初始星等=3（SSR 出生3星规则，u8@7=3 全对应）；解放阶段/加成=SkillGroup k2/k3 变体存在性（16 角色有解放变体→[1,2,3]/[0,0,0.1,0.1]，其余 []/[0]，对照 188 条实证）；参考等级/星等/面板来源=模拟器参考配置。初始面板=基础×(1+0.2×初始星等)（三例反推实证）；参考面板=fround前缀×1.1^(参考等级-1) 向下取整（与计算调教面板同口径）。
const 潜力类型映 = { 1: 枚举.攻击型, 2: 枚举.均衡型, 3: 枚举.防御型 };
export const 真实角色目录 = 角色显示.filter(显示 => 原包角色表.get(显示.编号)?.稀有度 === 3).map(显示 => {
    const 原 = 原包角色表.get(显示.编号);
    const 本 = 原包角色文本.get(显示.编号) ?? { 全名: 显示.名称, 名称: 显示.名称, 介绍: '' };
    const 初始星等 = 3;
    const 初始倍率 = 1 + 0.2 * 初始星等;
    const 初始生命 = 原.基础生命 * 初始倍率;
    const 初始攻击 = 原.基础攻击 * 初始倍率;
    const 必杀5档 = 原包机制.技能组[原.技能组编号]?.[4];
    const 有解放 = 原包机制.技能组[(显示.编号 * 10) + 2] !== undefined;
    return {
        编号: 显示.编号, 名称: 本.名称, 全名: 本.全名, 介绍: 本.介绍, 别名: 显示.别名,
        稀有度: 'SSR', 职业: 原.职业, 属性: 原.属性,
        初始星等, 潜力类型: 潜力类型映[原.潜力类型码] ?? 枚举.攻击型,
        解放阶段: 有解放 ? [1, 2, 3] : [], 解放面板加成: 有解放 ? [0, 0, 0.1, 0.1] : [0],
        参考等级: 60, 参考星等: 3, 面板来源: '参考角色表',
        初始生命, 初始攻击,
        生命上限: Math.floor(Math.fround(初始生命) * 1.1 ** 59),
        攻击: Math.floor(Math.fround(初始攻击) * 1.1 ** 59),
        冷却: 文本CD(必杀5档) ?? 原包机制.技能[必杀5档]?.位 ?? null,
    };
});
const 编号索引 = new Map(真实角色目录.map(单位 => [单位.编号, 单位]));
const 规范名称 = 输入 => String(输入 ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}]/gu, '');

function 匹配名称(单位) {
    return [...单位.别名, 单位.全名].filter(Boolean).map(规范名称);
}

export function 获取真实角色(编号) {
    return 编号索引.get(编号);
}

export function 获取真实技能(编号, 羁绊 = 5, 指定版本 = null, 解放 = 0) {
    // 显示层技能文本从原包组装（旧文本模型键名兼容：ATTACK/LEADER/PASSIVE_1..3/SKILL_1..5/当前必杀；另挂原包编号键供状态表按来源技能编号反查名称）。潜力技能不在 SkillGroup 槽系，编号=基础组槽10+1/+2（GENERAL_1/2，规律见 原包数据.mjs 潜力根注释）。
    const 槽 = 原包机制.技能组[(编号 * 10) + 1 + Math.min(Math.max(解放 ?? 0, 0), 2)] ?? 原包机制.技能组[(编号 * 10) + 1];
    if (!槽) return null;
    const 项 = id => { const 技 = id ? 原包机制.技能[id] : null; return 技 ? { 名称: 技.名称, 说明: 技.说明 } : null; };
    const 档 = Math.min(Math.max(羁绊 ?? 5, 1), 5);
    const 基础槽 = 原包机制.技能组[(编号 * 10) + 1] ?? 槽;
    const 潜力编号 = 基础槽[9] ? [基础槽[9] + 1, 基础槽[9] + 2] : [];
    const 结果 = {
        ATTACK: 项(槽[5]), LEADER: 项(槽[6]),
        PASSIVE_1: 项(槽[7]), PASSIVE_2: 项(槽[8]), PASSIVE_3: 项(槽[9]),
        SKILL_1: 项(槽[0]), SKILL_2: 项(槽[1]), SKILL_3: 项(槽[2]), SKILL_4: 项(槽[3]), SKILL_5: 项(槽[4]),
        当前必杀: 项(槽[档 - 1]),
        GENERAL_1: 项(潜力编号[0]), GENERAL_2: 项(潜力编号[1]),
    };
    for (const id of [...槽, ...潜力编号]) if (id) 结果[id] = 项(id);
    return 结果;
}

export function 准备角色技能(单位) {
    const 潜力 = 获取潜力养成(单位);
    const 未解锁 = 获取适用ELv技能(单位.编号).filter(项 => (单位.ELv技能 || []).includes(项.编号) && ((单位.普通等级 ?? 普通等级最高) !== 普通等级最高 || (单位.ELV突破等级 ?? 0) < ELV技能解锁等级[项.分类]));
    if (未解锁.length) return { ...单位, 技能已建模: false, 未支持技能: 未解锁.map(项 => `${项.名称}要求ELV${ELV技能解锁等级[项.分类]}`), 覆盖说明: '所选突破技能尚未达到解锁等级，请确认ELV突破等级。' };
    // 技能列一律以原包数据模型为准：SkillGroup 槽位技能经 执行原包技能 通道结算，剥掉单位对象上可能残留的旧事件字段防漏入执行。必杀冷却取 Skill_C 记录+4 字段（CD 同源）。
    const 原包模型 = 构建原包模型(单位);
    if (!原包模型) return { ...单位, 技能已建模: false, 未支持技能: ['原包 SkillGroup 缺少该角色技能组'], 覆盖说明: 'SkillGroup 无对应技能组，无法按原包数据建模。' };
    // ELv技能=Skill_C 二进制记录主证据（编译ELv技能 产 枚举.原包技能 引用，引擎 执行原包技能 结算；旧SkillStr文本编译通道已废——旧实现只校验解锁从不消费效果，花嫁兰儿40507全体造成伤害+5.4%、圣剑40524普攻追击等全部丢失的问题由二进制接入根治）。
    const ELv编译 = 编译ELv技能(单位.编号, 单位.ELv技能 || []);
    if (!ELv编译.完整) return { ...单位, 技能已建模: false, 未支持技能: ELv编译.未支持, 覆盖说明: '所选ELv技能存在无法按原包文本结算的效果，请调整选择。' };
    const 净单位 = { ...单位 };
    for (const 事件 of ['初始', '队长', '队长必杀', '普攻', '必杀', '防御', '行动后', 枚举.回合开始, '解放初始', '部分解放普攻', '解放普攻', '解放必杀', '解放行动后', '解放队长']) delete 净单位[事件];
    return { ...净单位, ...原包模型, ELV效果: ELv编译.效果, 冷却: 原包模型.冷却 || 单位.冷却, 技能已建模: true, 技能来源: '原包数据模型', ELv资料指纹: 获取适用ELv技能(单位.编号).filter(项 => (单位.ELv技能 || []).includes(项.编号)).map(项 => ({ 编号: 项.编号, 指纹: 项.资料指纹 })), 未支持技能: [], 覆盖说明: '技能来自 SkillGroup/Skill_C 原包数据，必杀冷却取 Skill_C 记录+4 字段（CD 同源机制链见构建原包模型注释）；触发、条件与子技能均按原包效果链结算。' };
}

export function 搜索角色(输入) {
    const 文本 = String(输入 ?? '').trim();
    if (!文本) return [];
    if (/^(SR|R|N)[\s-]*\d+$/i.test(文本.normalize('NFKC'))) return [];
    if (/^\d+$/.test(文本)) return 编号索引.has(Number(文本)) ? [编号索引.get(Number(文本))] : [];
    const 词 = 规范名称(文本);
    const 全名 = 真实角色目录.filter(单位 => [单位.全名, ...单位.别名.filter(名 => 名.includes(' '))].map(规范名称).includes(词));
    if (全名.length) return 全名;
    const 精确 = 真实角色目录.filter(单位 => 匹配名称(单位).includes(词));
    const 其他 = 真实角色目录.filter(单位 => !精确.includes(单位) && 匹配名称(单位).some(名称 => 名称.includes(词)));
    return [...精确, ...其他];
}

export function 创建角色(输入) {
    const 文本 = String(输入 ?? '').trim();
    if (!文本 || 文本.length > 100) throw new Error('角色名称或编号须为 1 至 100 个字符');
    const 匹配 = 文本.match(/^(\d+)(?:\s+(.+))?$/);
    const 编号输入 = 匹配 ? Number(匹配[1]) : null;
    if (编号输入 !== null && (!Number.isSafeInteger(编号输入) || 编号输入 < 1)) throw new Error('角色编号须为正整数');
    if (/^[+-]?\d+(?:\.\d+)?$/.test(文本) && !匹配) throw new Error('角色编号须为正整数');
    const 候选 = 编号输入 === null ? 搜索角色(文本) : 获取真实角色(编号输入) ? [获取真实角色(编号输入)] : [];
    if (!候选.length) throw new Error(`当前仅支持 SSR，未匹配到 SSR 角色：${文本}`);
    if (候选.length > 1) throw new Error(`匹配到${候选.length}位角色，请选择完整名称或编号：${候选.slice(0, 4).map(项 => `${项.编号} ${项.全名}`).join('、')}`);
    const 档案 = 候选[0];
    if (匹配?.[2] && !匹配名称(档案).includes(规范名称(匹配[2]))) throw new Error('角色编号与名称不一致，请从真实角色候选中重新选择');
    const 基础 = { ...structuredClone(档案), 名称: 档案.全名, 覆盖说明: '已匹配真实角色和资料，技能按 SkillGroup/Skill_C 原包数据建模。' };
    return 统一面板基准(准备角色技能({ ...structuredClone(基础), 编号: 档案.编号, 全名: 档案.全名, 职业: 档案.职业, 属性: 档案.属性,
        羁绊: 5, 星级: 3, 调教: 3, 普通等级: 普通等级最高, ELV突破等级: 0, 潜力等级: 12, 潜力节点: Array(6).fill(true), 解放: 档案.编号 === 10006 ? Math.max(0, ...档案.解放阶段) : 0, ELv技能: [], 角色输入: `${档案.编号} ${档案.全名}`,
    }));
}

const 编队养成字段 = ['羁绊', '星级', '调教', '普通等级', 'ELV突破等级', '潜力等级', '潜力节点', '解放', 'ELv技能'];

export function 校验文件编队(队伍) {
    if (!Array.isArray(队伍) || 队伍.length < 1 || 队伍.length > 5) throw new Error('编队须有1至5位角色');
    if (队伍.some(单位 => !单位 || typeof 单位 !== 'object' || !Number.isSafeInteger(单位.编号))) throw new Error('编队文件包含无效角色');
    if (new Set(队伍.map(单位 => 单位.编号)).size !== 队伍.length) throw new Error('队伍中不能有重复角色');
    return 队伍.map((单位, 位置) => {
        const 默认 = 创建角色(单位.编号);
        const 养成 = Object.fromEntries(编队养成字段.filter(字段 => Object.hasOwn(单位, 字段)).map(字段 => [字段, structuredClone(单位[字段])]));
        const 角色 = 准备角色技能(统一面板基准({ ...默认, ...养成 }));
        if (!Number.isInteger(角色.羁绊) || 角色.羁绊 < 1 || 角色.羁绊 > 5) throw new Error(`第${位置 + 1}位角色的羁绊须为1至5`);
        if (!角色.技能已建模) throw new Error(`第${位置 + 1}位角色的技能或ELV选择无效，请确认养成设置`);
        return 角色;
    });
}

export function 生成编队文件(队伍) {
    return { 类型: 'TKFM编队', 版本: 1, 队伍: 校验文件编队(队伍).map(单位 => Object.fromEntries(['编号', ...编队养成字段].map(字段 => [字段, structuredClone(单位[字段])]))) };
}

export function 解析编队文件(内容) {
    let 文件;
    try { 文件 = JSON.parse(内容); }
    catch { throw new Error('无法读取此编队文件，请选择导出的编队文件'); }
    if (!文件 || 文件.类型 !== 'TKFM编队' || 文件.版本 !== 1) throw new Error('这不是有效的编队文件，请选择导出的编队文件');
    return 校验文件编队(文件.队伍);
}

export function 提取角色养成(单位) {
    const 角色 = 校验文件编队([单位])[0];
    return Object.fromEntries(['编号', ...编队养成字段].map(字段 => [字段, structuredClone(角色[字段])]));
}


